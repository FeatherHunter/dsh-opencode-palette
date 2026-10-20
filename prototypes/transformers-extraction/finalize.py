# -*- coding: utf-8 -*-
"""finalize.py — 从 _stage1.json 出发，生成 sources.py（配方单一事实源）。

做三件事：
  1. 给每个设计岗位补齐「直采」证据：精确像素命中数、邻域人口（ΔRGB 之和 ≤ 6）、
     最具代表性的取色现场坐标（取邻域人口最大的那个像素，等于色块的中心）。
  2. 给 8 个背景槽补齐「明度阶」证据：每一阶都必须是参考图里的真实像素，
     且色相与族锚点一致（bubbleBg 是唯一的异族，自成一族）。
  3. 把 4 个 diff 背景槽写成 house 口径的「混色」——6 位不透明 hex
     （src/engine/map-dsh.ts 对这 4 个槽是 allowTransparent: false）。

产物：sources.py
"""
import os, sys, io, json
from collections import defaultdict
import numpy as np
from PIL import Image

sys.stdout.reconfigure(encoding="utf-8", line_buffering=True)
from model import (SRC_DIR, IMAGES, LADDER, SKY_BASE, POOL, NEAR, ARR, ROLES,  # noqa: E402
                   CH, HL, rgb_of, hx, hsl, de)

HERE = os.path.dirname(os.path.abspath(__file__))


def from_hsl(h, s, l):
    import colorsys
    r, g, b = colorsys.hls_to_rgb(h / 360.0, l, s)
    return hx((r * 255, g * 255, b * 255))


def signature_site(k, fname):
    """在该图里找这个颜色邻域人口最大的像素——那是色块的中心，不是噪点。"""
    W, H, a = ARR[fname]
    t = np.array(rgb_of(k), dtype=np.int16)
    mask = (np.abs(a.astype(np.int16) - t).sum(axis=1) <= 6).reshape(H, W)
    ys, xs = np.nonzero(mask)
    if len(ys) == 0:
        return None
    ii = np.zeros((H + 1, W + 1), dtype=np.int32)
    ii[1:, 1:] = mask.cumsum(0).cumsum(1)
    R = 24
    y0 = np.clip(ys - R, 0, H); y1 = np.clip(ys + R + 1, 0, H)
    x0 = np.clip(xs - R, 0, W); x1 = np.clip(xs + R + 1, 0, W)
    s = ii[y1, x1] - ii[y0, x1] - ii[y1, x0] + ii[y0, x0]
    i = int(np.argmax(s))
    x, y = int(xs[i]), int(ys[i])
    bx = max(0, min(W - 120, x - 60)); by = max(0, min(H - 120, y - 60))
    return {"file": fname, "x": x, "y": y, "box": [bx, by, bx + 120, by + 120],
            "localPop": int(s[i])}


stage = json.load(open(os.path.join(HERE, "_stage1.json"), encoding="utf-8"))
C = stage["colors"]

# ── 背景槽：明度阶证据 ───────────────────────────────────────────────
SKY_H = hsl(SKY_BASE)[0]
bg_tokens = []
for name, hexv, note in LADDER:
    h, s, l = hsl(hexv)
    fam = "夜空蓝" if abs(h - SKY_H) <= 12 else "星云紫"
    bg_tokens.append({
        "token": name, "hex": hexv, "kind": "阶梯",
        "anchor": "5.jpg 夜空%s" % ("" if fam == "夜空蓝" else " 星云洋红"),
        "recipe": "%s族明度阶：%s 是原图里的真实像素（邻域人口 %d px，精确 %d px），H%.0f°，L%.0f%%" % (
            fam, hexv, NEAR.get(hexv.upper(), 0), POOL.get(hexv.upper(), {}).get("pop", 0), h, l * 100),
        "proof": {"type": "rung", "base": SKY_BASE if fam == "夜空蓝" else hexv,
                  "baseFiles": POOL.get((SKY_BASE if fam == "夜空蓝" else hexv).upper(), {}).get("files", {}),
                  "basePop": POOL.get((SKY_BASE if fam == "夜空蓝" else hexv).upper(), {}).get("pop", 0),
                  "hue": round(h, 2), "L": round(l, 4), "S": round(s, 4),
                  "files": POOL.get(hexv.upper(), {}).get("files", {}),
                  "exact": POOL.get(hexv.upper(), {}).get("pop", 0),
                  "near": NEAR.get(hexv.upper(), 0)},
        "intent": note,
    })

# ── 设计岗位：直采证据 ──────────────────────────────────────────────
ORDER = [r[0] for r in ROLES]
ANCHOR = {
    "primary": "擎天柱胸甲红", "secondary": "能量晶体蓝",
    "info": "塞伯坦全息青", "success": "山林苔色",
    "warning": "车漆阴影琥珀", "error": "肩炮熔炉橙",
    "borderActive": "大黄蜂车漆黄", "border": "雾都钢蓝",
    "diffAdded": "战场草坡", "diffRemoved": "战损锈铜",
    "markdownHeading": "海报日轮", "markdownLink": "电光蓝",
    "markdownCode": "霸天虎紫", "markdownEmph": "火焰霞光",
    "markdownStrong": "影棚装甲白", "markdownBlockQuote": "雾都尘霾",
    "syntaxComment": "战场烟灰", "syntaxKeyword": "胸窗辉光红",
    "syntaxFunction": "车漆深金", "syntaxType": "Arcee 玫瑰粉",
    "syntaxNumber": "引擎盖暖砂", "syntaxString": "钢灰蓝",
    "syntaxOperator": "远景雾蓝", "text": "装甲钢白反光",
    "textMuted": "装甲蓝灰",
}
INTENT = {
    "primary": "汽车人徽章红：品牌心跳，主按钮 / 激活态 / 品牌字",
    "secondary": "能量电蓝：晶体蓝里点亮的那一档，走次级交互与信息",
    "info": "塞伯坦全息青：能量晶体的冷光，信息 / 提示",
    "success": "山林苔色：素材里没有鲜绿，完成态只能是 3.jpg 那片苔",
    "warning": "炮口琥珀：车漆的暗部，压暗一档不与焦点环撞衫",
    "error": "熔炉橙红：过热告急，与徽章红分家",
    "borderActive": "焦点环＝大黄蜂的车漆黄：全界面最醒目的一个点",
    "border": "钢板接缝：分割线是金属缝，不是描边",
    "diffAdded": "新增＝战场上重新长出的草坡",
    "diffRemoved": "删除＝被击穿的旧装甲铜：不冒充报错红",
    "markdownHeading": "标题＝海报上那轮太阳：主题的签名色",
    "markdownLink": "链接＝能量电弧",
    "markdownCode": "行内码＝霸天虎紫：全片唯一的紫",
    "markdownEmph": "强调＝肩炮喷出的火",
    "markdownStrong": "粗体＝装甲上最亮的那块高光",
    "markdownBlockQuote": "引用＝雾都飘着的尘，退到文末",
    "syntaxComment": "注释＝战场烟灰（退后）",
    "syntaxKeyword": "关键字＝擎天柱胸窗的辉光红",
    "syntaxFunction": "函数＝大黄蜂的车漆深金",
    "syntaxType": "类型＝Arcee 的玫瑰粉",
    "syntaxNumber": "数字＝引擎盖的暖砂橙",
    "syntaxString": "字符串＝没上漆的钢灰蓝",
    "syntaxOperator": "运算符＝远景雾蓝（退后）",
    "text": "钢白正文：被夜光照过的装甲反光",
    "textMuted": "次级文字：钢灰蓝，退到正文之后但不消失",
}

role_tokens = []
missing = []
for name in ORDER:
    k = C[name]
    files = POOL.get(k.upper(), {}).get("files", {})
    if not files:
        missing.append((name, k))
        continue
    main_file = max(files, key=lambda f: files[f])
    site = signature_site(k, main_file)
    if site:
        anchor_txt = "%s｜%s (%d,%d) 邻域 %d px" % (
            ANCHOR[name], main_file, site["x"], site["y"], site["localPop"])
    else:
        anchor_txt = "%s｜%s" % (ANCHOR[name], main_file)
    role_tokens.append({
        "token": name, "hex": k, "kind": "直采",
        "anchor": anchor_txt,
        "recipe": "像素原样取用：%s 原图中精确命中 %d px，邻域（ΔRGB≤6）人口 %d px" % (
            main_file, files[main_file], NEAR.get(k.upper(), 0)),
        "proof": {"type": "direct", "files": files, "main": main_file,
                  "exact": files[main_file], "near": NEAR.get(k.upper(), 0), "site": site},
        "intent": INTENT[name],
    })
    print("  %-20s %s  精确 %6d px（%s）  邻域人口 %7d px" %
          (name, k, files[main_file], main_file, NEAR.get(k.upper(), 0)))
if missing:
    print("\n!! 不是参考图真实像素的岗位：", missing)
    sys.exit(2)

# ── 4 个 diff 背景槽：混色（6 位不透明）───────────────────────────────
BASE = C["background"]
MIX = [("diffAddedBg", C["diffAdded"], 0.12, "diffAdded"),
       ("diffRemovedBg", C["diffRemoved"], 0.12, "diffRemoved"),
       ("diffAddedLineNumberBg", C["diffAdded"], 0.20, "diffAdded"),
       ("diffRemovedLineNumberBg", C["diffRemoved"], 0.22, "diffRemoved")]
DIFF_INTENT = {
    "diffAddedBg": "新增行底：草色薄雾",
    "diffRemovedBg": "删除行底：铜锈薄雾",
    "diffAddedLineNumberBg": "新增行号底：草色加重",
    "diffRemovedLineNumberBg": "删除行号底：铜锈加重",
}
mix_tokens = []
for name, src, alpha, srcrole in MIX:
    s, b = rgb_of(src), rgb_of(BASE)
    comp = hx(tuple(s[i] * alpha + b[i] * (1 - alpha) for i in range(3)))
    mix_tokens.append({
        "token": name, "hex": comp, "kind": "混色",
        "anchor": "%s（%s）按固定比例压到 background 上" % (src, ANCHOR[srcrole]),
        "recipe": "%s × %d%% + %s × %d%%" % (src, round(alpha * 100), BASE, round((1 - alpha) * 100)),
        "proof": {"type": "mix", "parts": [[src, alpha], [BASE, round(1 - alpha, 2)]]},
        "intent": DIFF_INTENT[name],
    })

tokens = bg_tokens + role_tokens + mix_tokens

# ── 取色现场 ─────────────────────────────────────────────────────────
SIG_ROLES = ["primary", "borderActive", "markdownHeading", "markdownLink", "info",
             "success", "warning", "error", "text", "textMuted", "diffAdded",
             "diffRemoved", "markdownEmph", "markdownCode", "syntaxKeyword",
             "syntaxFunction", "syntaxType", "syntaxNumber", "syntaxString", "border"]
sig_by_token = {t["token"]: t for t in role_tokens}
signatures = []
for name in SIG_ROLES:
    t = sig_by_token.get(name)
    if not t or not t["proof"].get("site"):
        continue
    s = t["proof"]["site"]
    signatures.append({"token": name, "hex": t["hex"], "file": s["file"], "box": s["box"],
                       "x": s["x"], "y": s["y"], "label": ANCHOR[name],
                       "exact": t["proof"]["exact"], "near": t["proof"]["near"]})

# ── 写 sources.py ────────────────────────────────────────────────────
L = []
L.append("# -*- coding: utf-8 -*-")
L.append('"""sources.py — 变形金刚主题的「取色配方表」（单一事实源，本文件由 finalize.py 生成）。')
L.append("")
L.append("37 个色位，每个都带一份机器可复算的配方证明（proof）：")
L.append("  · 直采 direct  —— hex 与某张参考图的某个像素完全一致，且邻域人口（ΔRGB 之和 ≤ 6）成规模，")
L.append("                    也就是说：这个颜色在原图上是一块看得见的实色，不是噪点里碰巧撞上的孤像素")
L.append("  · 阶梯 rung    —— 同一色相族内的明度阶；每一阶本身也是参考图里的真实像素")
L.append("  · 混色 mix     —— 两个采样色按固定比例相乘，逐位复算必须等于终值")
L.append("build_palette.py 会逐条复算配方并与终值比对，不一致直接判负。")
L.append('"""')
L.append("")
L.append("SRC_DIR = r\"%s\"" % SRC_DIR)
L.append("")
L.append("IMAGES = [")
for f, t, d in IMAGES:
    L.append("    (%r, %r, %r)," % (f, t, d))
L.append("]")
L.append("")
L.append("TOKENS = [")
for t in tokens:
    L.append("    {")
    for k in ("token", "hex", "kind", "anchor", "recipe", "intent"):
        L.append("        %r: %r," % (k, t[k]))
    L.append("        %r: %r," % ("proof", t["proof"]))
    L.append("    },")
L.append("]")
L.append("")
L.append("# 「取色现场」：每个都在原图上裁一块实拍，用来证明这个色是从哪来的")
L.append("SIGNATURES = [")
for s in signatures:
    L.append("    %r," % (s,))
L.append("]")

src_path = os.path.join(HERE, "sources.py")
with open(src_path, "w", encoding="utf-8", newline="\n") as fh:
    fh.write("\n".join(L) + "\n")
print("\n写入 sources.py（%d 个色位，%d 个取色现场）" % (len(tokens), len(signatures)))

# gen.py 从 extracted.json 读取色现场，这里同步刷新它
ext_path = os.path.join(HERE, "extracted.json")
if os.path.exists(ext_path):
    ext = json.load(open(ext_path, encoding="utf-8"))
    ext["signatures"] = signatures
    json.dump(ext, open(ext_path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("同步 extracted.json 的取色现场")
