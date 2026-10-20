# -*- coding: utf-8 -*-
"""build_palette.py — 37 色位推导 + 判尺自检。

判尺（与 docs/theme-audit/criteria.md 同口径）：
  硬性 38 对（4.5:1） + UI 15 对（3:0:1）
  IP 设计规范：角色同值碰撞 / 背景色相孤岛 / 品牌几何 / 语法核心 ΔE76 / 退后梯队

配方自检（本次新增，比「能凑出终值」严格得多）：
  直采 direct —— 终值必须真的是参考图里的某个像素（精确命中数 > 0），
                 且在图上「成片存在」：全图 L1≤6 的邻域人口 ≥ NEAR_MIN；
  阶梯 ladder —— 由基色的色相 + 声明的明度/彩度复算，逐位等于终值；
                 基色本身也必须是参考图里的真实像素；
  混色 mix    —— 两个采样色按声明的固定比例复算，逐位等于终值。

输出 palette.json（结论）+ report.txt（人读）。不写仓库任何文件。
"""
import os, sys, io, json, math, colorsys
sys.stdout.reconfigure(encoding="utf-8", line_buffering=True)

from model import POOL, NEAR, ARR, ADJACENT, rgb_of, hx, lum, contrast, to_lab, de, hue_dist, hsl, HL   # noqa: E402
from sources import TOKENS, IMAGES                                            # noqa: E402

TEXT_T, UI_T = 4.5, 3.0
HOST_CANVAS_DARK = "#000000"
NEAR_MIN = 24          # 直采色的最低邻域人口门槛（≈4×5 的实色块）


def alpha_of(h):
    h = h.lstrip("#")
    return (int(h[6:8], 16) / 255.0) if len(h) == 8 else 1.0


def flatten(h, base):
    """带 alpha 的槽位按 alpha 合成到不透明底色上"""
    r, g, b = rgb_of(h)
    a = alpha_of(h)
    if a >= 1:
        return hx((r, g, b))
    br, bg, bb = rgb_of(base)
    return hx((r * a + br * (1 - a), g * a + bg * (1 - a), b * a + bb * (1 - a)))


def contrast_text(h):
    """与引擎 contrastText 一致：luma>0.6 → #141414，否则 #F4F4F5"""
    r, g, b = rgb_of(h)
    luma = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    return "#141414" if luma > 0.6 else "#F4F4F5"


def to_hsl(h):
    r, g, b = [v / 255 for v in rgb_of(h)]
    mx, mn = max(r, g, b), min(r, g, b)
    l = (mx + mn) / 2
    d = mx - mn
    if d == 0:
        return (0.0, 0.0, l)
    if mx == r:
        hh = ((g - b) / d) % 6
    elif mx == g:
        hh = (b - g) / d + 2
    else:
        hh = (r - g) / d + 4
    hh *= 60
    s = 0 if l in (0, 1) else d / (1 - abs(2 * l - 1))
    return (hh, s, l)


def from_hsl(h, s, l):
    r, g, b = colorsys.hls_to_rgb(h / 360.0, l, s)
    return hx((r * 255, g * 255, b * 255))


def chroma(h):
    r, g, b = rgb_of(h)
    return max(r, g, b) - min(r, g, b)


# ── 邻域人口（与 model.blob 同一套空间哈希口径）──────────────────────
_CELL = 7
_HASH = {}
for _k, _v in POOL.items():
    _r, _g, _b = rgb_of(_k)
    _HASH.setdefault((_r // _CELL, _g // _CELL, _b // _CELL), []).append((_k, _v["pop"]))


def near_pop(k):
    t = rgb_of(k)
    cx, cy, cz = t[0] // _CELL, t[1] // _CELL, t[2] // _CELL
    tot = 0
    for dx in (-1, 0, 1):
        for dy in (-1, 0, 1):
            for dz in (-1, 0, 1):
                for pk, pop in _HASH.get((cx + dx, cy + dy, cz + dz), ()):
                    q = rgb_of(pk)
                    if abs(q[0] - t[0]) + abs(q[1] - t[1]) + abs(q[2] - t[2]) <= 6:
                        tot += pop
    return tot


# ── 配方复算 ──────────────────────────────────────────────────────────
def verify_proof(tok):
    """按 proof 复算配方；返回 (ok, 说明)"""
    p = tok["proof"]
    hexv = tok["hex"]
    if p["type"] == "direct":
        rec = POOL.get(hexv.upper())
        if not rec:
            return False, "终值 %s 不是参考图里的任何像素" % hexv
        exact = rec["pop"]
        if exact <= 0:
            return False, "精确命中 0 px"
        near = near_pop(hexv.upper())
        if near < NEAR_MIN:
            return False, "邻域人口 %d < %d（色块太散，判为噪点）" % (near, NEAR_MIN)
        return True, "精确 %d px / 邻域 %d px" % (exact, near)
    if p["type"] == "rung":
        # 明度阶：这一阶本身必须是参考图里的真实像素，且色相与族锚点一致
        if hexv.upper() not in POOL:
            return False, "阶 %s 不是参考图里的任何像素" % hexv
        base = p["base"].upper()
        if base not in POOL:
            return False, "族锚点 %s 不是参考图里的任何像素" % p["base"]
        h_rung = hsl(hexv.upper())[0]
        h_base = hsl(base)[0]
        if hue_dist(h_rung, h_base) > 9:
            return False, "阶色相 %.1f° 偏离族锚点 %.1f°（>9°，不算同一族）" % (h_rung, h_base)
        near = near_pop(hexv.upper())
        if near < NEAR_MIN:
            return False, "邻域人口 %d < %d（色块太散，判为噪点）" % (near, NEAR_MIN)
        return True, "真实像素（精确 %d px / 邻域 %d px），族锚点 %s %d px" % (
            POOL[hexv.upper()]["pop"], near, p["base"], p.get("basePop", 0))
    if p["type"] == "ladder":
        base = p["base"].upper()
        if base not in POOL:
            return False, "基色 %s 不是参考图里的任何像素" % p["base"]
        got = from_hsl(p["H"], p["S"], p["L"])
        if got != hexv.upper():
            return False, "阶梯复算 %s ≠ 终值 %s" % (got, hexv.upper())
        return True, "基色 %s（%d px）" % (p["base"], p["basePop"])
    if p["type"] == "mix":
        acc = [0.0, 0.0, 0.0]
        wsum = 0.0
        for c, w in p["parts"]:
            s = rgb_of(c)
            for i in range(3):
                acc[i] += s[i] * w
            wsum += w
        if abs(wsum - 1.0) > 0.011:
            return False, "配方权重合计 %.3f ≠ 1" % wsum
        if hx(acc) != hexv.upper():
            return False, "复算 %s ≠ 终值 %s" % (hx(acc), hexv.upper())
        return True, "混色复算一致"
    return False, "未知配方类型 " + str(p.get("type"))


def main():
    tokens = []
    for tok in TOKENS:
        ok, why = verify_proof(tok)
        tokens.append({"token": tok["token"], "hex": tok["hex"], "kind": tok["kind"],
                       "anchor": tok["anchor"], "recipe": tok["recipe"], "intent": tok["intent"],
                       "recipeOk": ok, "recipeNote": why})
    fails = [t for t in tokens if not t["recipeOk"]]

    # 背景明度阶：同族（夜空蓝）的 7 阶必须严格递增，且族锚点一致
    rung_order = ["codeBlockBg", "sidebarBg", "background", "backgroundPanel",
                  "inputBg", "codeHeaderBg", "backgroundElement"]
    rungs = [pal_t for pal_t in tokens if pal_t["token"] in rung_order]
    rungs.sort(key=lambda t: rung_order.index(t["token"]))
    rung_ls = [to_hsl(t["hex"][:7])[2] for t in rungs]
    if any(rung_ls[i] >= rung_ls[i + 1] for i in range(len(rung_ls) - 1)):
        fails.append({"token": "background-ladder", "hex": "", "kind": "阶梯",
                      "anchor": "夜空蓝族明度阶",
                      "recipe": "→".join("%s L%.0f%%" % (t["token"], l)
                                          for t, l in zip(rungs, rung_ls)),
                      "intent": "背景必须是一条严格递增的明度阶",
                      "recipeOk": False, "recipeNote": "明度阶不是严格递增"})
    else:
        for t, l in zip(rungs, rung_ls):
            t["recipeNote"] += "（族内明度阶 L%.0f%%）" % (l * 100)

    pal = {t["token"]: t["hex"] for t in tokens}
    base = flatten(pal["background"], HOST_CANVAS_DARK)
    surfaces = {"background": base}
    for k in ("backgroundPanel", "backgroundElement", "sidebarBg", "bubbleBg", "inputBg"):
        surfaces[k] = flatten(pal[k], base)
    cb = flatten(pal["codeBlockBg"], base)
    surfaces["codeBlockBg"] = cb
    surfaces["codeHeaderBg"] = flatten(pal["codeHeaderBg"], cb)

    SURF = ["background", "backgroundPanel", "backgroundElement", "sidebarBg",
            "bubbleBg", "inputBg", "codeBlockBg", "codeHeaderBg"]
    MUTED = ["background", "backgroundPanel", "backgroundElement"]
    MD = ["background", "backgroundPanel"]
    MD_ROLES = ["markdownHeading", "markdownLink", "markdownStrong", "markdownEmph",
                "markdownBlockQuote", "markdownCode"]
    SYNTAX = ["syntaxComment", "syntaxKeyword", "syntaxFunction", "syntaxType",
              "syntaxNumber", "syntaxString", "syntaxOperator"]
    CORE = ["syntaxKeyword", "syntaxFunction", "syntaxType", "syntaxNumber", "syntaxString"]
    BRAND = ["primary", "secondary", "info", "success", "warning", "error"]

    rows = []

    def check(code, fg, bg, t):
        if not fg or not bg:
            return
        f = flatten(fg, bg)
        r = round(contrast(f, bg), 3)
        rows.append({"code": code, "fg": f, "bg": bg, "ratio": r, "t": t, "ok": r >= t})

    for s in SURF:
        check("text@%s" % s, pal["text"], surfaces[s], TEXT_T)
    for s in MUTED:
        check("textMuted@%s" % s, pal["textMuted"], surfaces[s], TEXT_T)
        dim = pal["textMuted"] + "CC"
        check("labelDimmed@%s" % s, dim, surfaces[s], TEXT_T)
    for r in MD_ROLES:
        for s in MD:
            check("%s@%s" % (r, s), pal[r], surfaces[s], TEXT_T)
    for r in SYNTAX:
        check("%s@codeBlockBg" % r, pal[r], surfaces["codeBlockBg"], TEXT_T)
    check("diffAdded@diffAddedBg", pal["diffAdded"], flatten(pal["diffAddedBg"], base), TEXT_T)
    check("diffRemoved@diffRemovedBg", pal["diffRemoved"], flatten(pal["diffRemovedBg"], base), TEXT_T)
    check("text@diffAddedBg", pal["text"], flatten(pal["diffAddedBg"], base), TEXT_T)
    check("text@diffRemovedBg", pal["text"], flatten(pal["diffRemovedBg"], base), TEXT_T)
    check("contrastText(primary)@primary", contrast_text(pal["primary"]), pal["primary"], TEXT_T)
    for s in MUTED:
        check("borderActive@%s" % s, pal["borderActive"], surfaces[s], UI_T)
    for r in BRAND:
        for s in ("background", "backgroundPanel"):
            check("%s@%s" % (r, s), pal[r], surfaces[s], UI_T)

    hard = [r for r in rows if r["t"] == TEXT_T]
    ui = [r for r in rows if r["t"] == UI_T]
    hardFails = [r for r in hard if not r["ok"]]
    uiFails = [r for r in ui if not r["ok"]]

    DESIGN = ["text", "textMuted", "primary", "secondary", "info", "success", "warning",
              "error", "border", "borderActive", "diffAdded", "diffRemoved",
              "markdownHeading", "markdownLink", "markdownCode", "markdownEmph",
              "markdownStrong", "markdownBlockQuote", "syntaxComment", "syntaxKeyword",
              "syntaxFunction", "syntaxType", "syntaxNumber", "syntaxString", "syntaxOperator"]
    seen = {}
    for r in DESIGN:
        seen.setdefault(pal[r].upper(), []).append(r)
    collisions = [v for v in seen.values() if len(v) > 1]

    base_hue = to_hsl(surfaces["background"])[0]
    islands = []
    for s in SURF:
        if chroma(surfaces[s]) < 8:
            continue
        d = hue_dist(to_hsl(surfaces[s])[0], base_hue)
        if d > 60:
            islands.append("%s(Δ%.1f°)" % (s, d))

    ph = to_hsl(pal["primary"])[0]
    sh = to_hsl(pal["secondary"])[0]
    hd = round(hue_dist(ph, sh), 1)
    brand_cat = ("analogous 近似" if hd <= 45 else "triadic 三角" if 95 <= hd <= 145
                 else "complementary 互补" if hd > 145 else "unclassified")

    core_min = min((de(pal[a], pal[b]), "%s×%s" % (a, b))
                    for i, a in enumerate(CORE) for b in CORE[i + 1:])
    ctr = lambda r: contrast(flatten(pal[r], surfaces["codeBlockBg"]), surfaces["codeBlockBg"])
    com_c, op_c = ctr("syntaxComment"), ctr("syntaxOperator")
    core_c = min(ctr(r) for r in CORE)

    mdseen = {}
    for r in MD_ROLES:
        mdseen.setdefault(pal[r].upper(), []).append(r)
    md_dup = [v for v in mdseen.values() if len(v) > 1]

    # 补充：25 个设计岗位两两 ΔE76（审计脚本不查，但「岗位串戏」是真问题）
    allpairs = []
    for i, a in enumerate(DESIGN):
        for b in DESIGN[i + 1:]:
            allpairs.append((de(pal[a], pal[b]), a, b))
    allpairs.sort()
    worst_pairs = allpairs[:8]

    # 相邻岗位（会同时出现在同一屏的组合）最小 ΔE76
    adj_pairs = sorted((de(pal[a], pal[b]), a, b) for a, b in ADJACENT)
    adj_min = adj_pairs[0]

    design_warnings = (len(collisions) + len(islands) + (1 if brand_cat == "unclassified" else 0)
                       + (0 if core_min[0] >= 10 else 1)
                       + (0 if com_c <= core_c and op_c <= core_c else 1) + len(md_dup))

    out = {
        "id": "transformers", "name": "变形金刚", "appearance": "dark",
        "basePreset": "transformers", "schema": "dsh-opencode-palette.custom-theme.v1",
        "colors": pal,
        "tokens": tokens,
        "images": [{"file": f, "title": t, "desc": d} for f, t, d in IMAGES],
        "audit": {
            "hardTotal": len(hard), "hardFails": len(hardFails),
            "uiTotal": len(ui), "uiFails": len(uiFails),
            "rows": rows,
            "collisions": collisions, "islands": islands,
            "brandHue": hd, "brandCat": brand_cat,
            "coreMinDeltaE": round(core_min[0], 1), "coreMinPair": core_min[1],
            "commentContrast": round(com_c, 2), "operatorContrast": round(op_c, 2),
            "coreMinContrast": round(core_c, 2),
            "markdownDup": md_dup,
            "designWarnings": design_warnings,
            "baseHue": round(base_hue, 1),
            "recipeFails": len(fails),
            "worstPairs": [{"de": round(d, 1), "a": a, "b": b} for d, a, b in worst_pairs],
            "adjacentMin": {"de": round(adj_min[0], 1), "a": adj_min[1], "b": adj_min[2]},
            "adjacentPairs": [{"de": round(d, 1), "a": a, "b": b} for d, a, b in adj_pairs[:8]],
        },
    }
    here = os.path.dirname(os.path.abspath(__file__))
    with open(os.path.join(here, "palette.json"), "w", encoding="utf-8") as fh:
        json.dump(out, fh, ensure_ascii=False, indent=1)

    # ── report.txt ──
    L = []
    L.append("=" * 100)
    L.append("变形金刚 IP 预设 · 37 色位取色报告")
    L.append("=" * 100)
    for t in tokens:
        h, s, l = to_hsl(t["hex"][:7])
        note = "  [配方复算失败: %s]" % t["recipeNote"] if not t["recipeOk"] else ""
        L.append("  %-26s %-9s H%3d S%3d L%3d  <- %s%s" %
                 (t["token"], t["hex"], round(h), round(s * 100), round(l * 100), t["anchor"], note))
        L.append("  %-26s %s   [%s]" % ("", t["recipe"], t["recipeNote"]))
    L.append("")
    L.append("--- 硬性对 %d 条（正文 4.5:1）· 违例 %d ---" % (len(hard), len(hardFails)))
    for r in sorted(hard, key=lambda r: r["ratio"])[:10]:
        L.append("    %-34s %6.2f / %.1f  %s" % (r["code"], r["ratio"], r["t"], "PASS" if r["ok"] else "FAIL"))
    L.append("--- UI 对 %d 条（非文本 3.0:1）· 违例 %d ---" % (len(ui), len(uiFails)))
    for r in sorted(ui, key=lambda r: r["ratio"])[:6]:
        L.append("    %-34s %6.2f / %.1f  %s" % (r["code"], r["ratio"], r["t"], "PASS" if r["ok"] else "FAIL"))
    L.append("")
    L.append("--- 设计规范告警 %d 条 ---" % design_warnings)
    L.append("    角色同值碰撞：%s" % ("无" if not collisions else " | ".join("=".join(c) for c in collisions)))
    L.append("    背景色相孤岛(>60°)：%s  基准色相 %.1f°" % ("无" if not islands else ", ".join(islands), base_hue))
    L.append("    品牌几何：primary %.1f° × secondary %.1f° = %.1f° → %s" % (ph, sh, hd, brand_cat))
    L.append("    语法核心最小 ΔE76 = %.1f (%s)  门槛 10 → %s" %
             (core_min[0], core_min[1], "PASS" if core_min[0] >= 10 else "FAIL"))
    L.append("    退后梯队：comment %.2f / operator %.2f  vs 核心最低 %.2f → %s" %
             (com_c, op_c, core_c, "PASS" if com_c <= core_c and op_c <= core_c else "FAIL"))
    L.append("    markdown 同值：%s" % ("无" if not md_dup else ", ".join(",".join(m) for m in md_dup)))
    L.append("")
    L.append("--- 25 岗位两两 ΔE76 最紧的 8 对（审计脚本不查，但串戏是真问题）---")
    for d, a, b in worst_pairs:
        L.append("    %-20s × %-20s %5.1f" % (a, b, d))
    L.append("")
    L.append("--- 色相家族分布（37 色位）---")
    fam = {}
    for t in tokens:
        h = round(to_hsl(t["hex"][:7])[0] / 10) * 10 % 360
        fam.setdefault(h, []).append(t["token"])
    for h in sorted(fam):
        L.append("    色相 %3d°  %2d 个  %s" % (h, len(fam[h]), " ".join(fam[h])))
    L.append("")
    L.append("written: %s" % os.path.join(here, "palette.json"))
    report = "\n".join(L)
    with open(os.path.join(here, "report.txt"), "w", encoding="utf-8") as fh:
        fh.write(report)
    print(report)
    print("\n配方复算失败 %d 条；硬性违例 %d；UI 违例 %d；设计告警 %d" %
          (len(fails), len(hardFails), len(uiFails), design_warnings))
    return 0 if (not fails and not hardFails and not uiFails and design_warnings == 0) else 1


if __name__ == "__main__":
    sys.exit(main())
