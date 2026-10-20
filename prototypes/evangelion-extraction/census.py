# -*- coding: utf-8 -*-
"""色相普查：读 extracted.json，把三张参考图的像素按色相扇区分桶，
报告每个色族的面积占比 + 代表色 + 色族内 Top 色。

目的：确认素材里到底有哪些色系、各占多少面积，
好让「哪个色族拥有哪个语义角色（error / success / warning / primary…）」有据可依。

所有数字都来自 extract.py 写出的 extracted.json（像素级精确），
不重新读原图，所以普查结果可与 extract.py 的输出逐位对上。

用法：python census.py
"""
import json
import os
import unicodedata

HERE = os.path.dirname(os.path.abspath(__file__))
SRC_JSON = os.path.join(HERE, "extracted.json")

# 预览页文案里引用的数值（口径 B 实测值）：改了文案记得同步这里。
CLAIM = {"red": 14.1, "green": 2.5}


def hr(ch="=", n=78):
    return ch * n


def dw(s):
    """显示宽度：东亚宽字符（中文/全角）算 2 列。"""
    return sum(2 if unicodedata.east_asian_width(c) in "WF" else 1 for c in s)


def pad(s, w, right=False):
    """按显示宽度补空格，让含中文的表格能对齐。"""
    sp = w - dw(s)
    if sp <= 0:
        return s
    return " " * sp + s if right else s + " " * sp


def short_cn(cn):
    """表头用的短名：去掉括号里的补充说明。"""
    return cn.split("（")[0]


def load():
    if not os.path.exists(SRC_JSON):
        print("找不到 %s —— 先跑 extract.py。" % SRC_JSON)
        raise SystemExit(1)
    with open(SRC_JSON, encoding="utf-8") as f:
        return json.load(f)


def design_share(node, variant, meta, key):
    """按口径换算设计色族（红 / 绿 / 蓝紫 / 琥珀 / 中性）的像素数。"""
    mapping = meta["designFamilyMap"][variant][key]
    if not mapping:
        return None
    return sum(node["families"][variant][m]["px"] for m in mapping)


def print_definitions(meta):
    print(hr())
    print("=== 口径定义 ===")
    print("  判定顺序：① 无彩（通道极差 ≤ 阈值）→ 中性；② 绿感优先 → 绿；③ HSL 色相带")
    print("  无彩判据：通道极差 = max(r,g,b) - min(r,g,b)（8bit 尺度）。")
    print("            不用相对饱和度：近白/近黑像素的相对饱和度会失真")
    print("            （例：#FCFEFB 的 HSL 饱和度算出来是 60%，其实只是近白）。")
    print("  %s" % meta["greenRule"])
    print("  色相带（HSL 度）：")
    for b in meta["hueBands"]:
        print("      %s %6.0f - %-6.0f  %s" % (pad(b["cn"], 12), b["from"], b["to"], b["family"]))
    print("  无彩阈值（通道极差）：" + " / ".join(
        "%s=%d" % (v, meta["chromaNeutral"][v]) for v in sorted(meta["chromaNeutral"])))
    print("  变体：")
    for v in sorted(meta["variants"]):
        star = "★主口径" if v == meta["primaryVariant"] else "      "
        print("      %s %s  %s" % (v, star, meta["variants"][v]["name"]))
        print("            %s" % meta["variants"][v]["rule"])
    print("  设计色族的合并口径：")
    for d in meta["designFamilies"]:
        print("      %s = %s" % (pad(d["cn"], 20), " + ".join(d["members"])))
    print("      口径 D 是三族制，暖色不分家 → 琥珀族无对应（记 —）")
    print()


def print_design_table(data, meta):
    variant = meta["primaryVariant"]
    keys = [(d["key"], short_cn(d["cn"])) for d in meta["designFamilies"]]
    print(hr())
    print("=== 逐图色族占比（口径 %s = %s）===" % (variant, meta["variants"][variant]["name"]))
    head = pad("图", 10) + pad("像素", 11, True)
    for _k, cn in keys:
        head += pad(cn, 11, True)
    print(head)
    print("-" * dw(head))
    rows = [(im.get("file", "TOTAL"), im["px"], im) for im in data["images"]]
    rows.append(("TOTAL", data["aggregate"]["px"], data["aggregate"]))
    for fname, px, node in rows:
        line = pad(fname, 10) + pad("%d" % px, 11, True)
        for k, _cn in keys:
            n = design_share(node, variant, meta, k)
            line += pad("-" if n is None else "%.2f%%" % (n * 100.0 / px), 11, True)
        print(line)
    print()


def print_family_detail(data, meta):
    variant = meta["primaryVariant"]
    print(hr())
    print("=== 逐色族细账（口径 %s，占全图面积）===" % variant)
    for im in data["images"] + [data["aggregate"]]:
        name = im.get("file", "TOTAL")
        px = im["px"]
        print("  %s  %d px" % (name, px))
        for fam in meta["familyOrder"]:
            f = im["families"][variant][fam]
            tops = im["familyColors"][fam][:3]
            tops_s = "  ".join("%s %.2f%%" % (c["hex"], c["area"]) for c in tops)
            print("    %s %8d px %6.2f%%   Top: %s" % (
                pad(meta["familyCn"][fam], 9), f["px"], f["area"], tops_s))
    print()


def print_sensitivity(data, meta):
    keys = [(d["key"], short_cn(d["cn"])) for d in meta["designFamilies"]]
    agg = data["aggregate"]
    px = agg["px"]
    print(hr())
    print("=== 口径敏感性（合计，全图面积）===")
    head = pad("口径", 40)
    for _k, cn in keys:
        head += pad(cn, 11, True)
    print(head)
    print("-" * dw(head))
    for v in sorted(meta["variants"]):
        line = pad("%s %s" % (v, meta["variants"][v]["name"]), 40)
        for k, _cn in keys:
            n = design_share(agg, v, meta, k)
            line += pad("-" if n is None else "%.2f%%" % (n * 100.0 / px), 11, True)
        print(line)
    print()


def print_claim_check(data, meta):
    variant = meta["primaryVariant"]
    agg = data["aggregate"]
    px = agg["px"]
    print(hr())
    print("=== 设计稿引用值核对（口径 %s，合计 / 全图面积）===" % variant)
    names = {"red": "红族", "green": "绿族"}
    for key, claim in CLAIM.items():
        n = design_share(agg, variant, meta, key)
        measured = n * 100.0 / px
        d = measured - claim
        print("  %s 实测 %6.2f%%   预览页写 %5.2f%%   差 %+5.2f 个百分点  %s" % (
            pad(names[key], 8), measured, claim, d, "（相符）" if abs(d) < 0.5 else "（需改文案）"))
    print()


def print_top_colors(data, meta):
    print(hr())
    print("=== 三张合计 · 主色 Top 10（k-means 簇，占全图面积）===")
    for c in data["aggregate"]["overall"]["colors"][:10]:
        print("  %s  px=%-8d area=%5.2f%%  H%6.1f  S%5.1f  L%5.1f  lum=%.3f" % (
            c["hex"], c["px"], c["area"], c["hue"], c["sat"], c["light"], c["lum"]))
    print("  -- 出现次数最多的精确颜色（5bit 桶均值）")
    for c in data["aggregate"].get("topBuckets", []):
        print("  %s  px=%-8d area=%5.2f%%  H%6.1f  lum=%.3f" % (
            c["hex"], c["px"], c["area"], c["hue"], c["lum"]))
    print()


def print_groups(data, meta):
    print(hr())
    print("=== 分组聚类（高饱和 / 亮部 / 暗部）===")
    for im in data["images"] + [data["aggregate"]]:
        name = im.get("file", "TOTAL")
        print("  %s" % name)
        for grp, tag in (("saturated", "高饱和"), ("bright", "亮部"), ("dark", "暗部")):
            g = im[grp]
            if not g["px"]:
                print("    -- %s（无）" % tag)
                continue
            tops = "  ".join("%s %.2f%%" % (c["hex"], c["area"]) for c in g["colors"][:5])
            print("    -- %s（%d px，占全图 %.2f%%）%s" % (
                tag, g["px"], g["px"] * 100.0 / im["px"], tops))
    print()


def main():
    data = load()
    meta = data["meta"]
    print(hr())
    print("EVA（新世纪福音战士）IP 主题 · 色相普查")
    print("源图：%s" % meta["sourceDir"])
    print("数据：extracted.json（%d 张图 / %d px）" % (len(data["images"]), data["aggregate"]["px"]))
    print(hr())
    print_definitions(meta)
    print_design_table(data, meta)
    print_family_detail(data, meta)
    print_sensitivity(data, meta)
    print_claim_check(data, meta)
    print_top_colors(data, meta)
    print_groups(data, meta)


main()
