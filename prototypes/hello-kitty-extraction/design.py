# -*- coding: utf-8 -*-
"""design.py — Hello Kitty 主题 37 色位的推导 + 自检，产出 palette.json（结论）。

铁律（对应 docs/theme-audit/criteria.md 与判尺口径）：
  A. 每个色值要么是参考图里真实存在的**精确像素**（可在 corpus.json 检索到），
     要么是**两枚精确像素按公开公式混合**的派生值（公式随值公开）。
  B. 硬性 4.5:1 / UI 3:1 对 0 违例。
  C. IP 设计规范 0 条未记档告警（primary = borderActive 是仓库 v3 已记档的并岗）。
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import audit_sim as A  # noqa: E402

CORPUS = json.load(open(os.path.join(HERE, "corpus.json"), encoding="utf-8"))
EXACT = {c["hex"] for c in CORPUS["colors"]}
OUT = os.path.join(HERE, "palette.json")


def blend(fg, bg, a):
    """blend(fg,bg,a) = fg 以不透明度 a 覆盖在 bg 上（sRGB 直接空间，确定性）。"""
    fh, bh = fg.lstrip("#"), bg.lstrip("#")
    return "#%02X%02X%02X" % tuple(
        max(0, min(255, round(int(fh[i:i + 2], 16) * a + int(bh[i:i + 2], 16) * (1 - a))))
        for i in (0, 2, 4))


# ── 精确像素锚点（全部在 corpus.json 里可检索到）──
PX = {
    "paper":   "#FFFFFF",  # Kitty 的白脸（全局 29.68%）
    "veil":    "#FBE6EF",  # 淡粉纱（图1/图6）
    "orchid":  "#F4B4D0",  # 浅粉（图1）
    "rose":    "#EEA9BC",  # 玫瑰粉墙（图4/5/6，2.25%）
    "hero":    "#EE86A7",  # 主视觉粉（图1/图4，5.45%）
    "ink":     "#231815",  # 暖墨勾线（图2）
    "slate":   "#40404A",  # 灰墨（图1/2/6）
    "gray":    "#565656",  # 中灰（图2/3/5）
    "ltgray":  "#737378",  # 浅冷灰（图1/2）
    "black":   "#000000",  # 纯黑描边（图2/3/4）
    "crimson": "#C8152D",  # 蝴蝶结最深处（图1）
    "rasp":    "#B00C3F",  # 深覆盆红（图4）
    "deeprose": "#D12E63",  # 深玫红（图4）
    "navy":    "#0E52A5",  # 背带裤深蓝（图3）
    "midblue": "#4F86C5",  # 背带裤中蓝（图2）
    "leaf":    "#14AE67",  # 苹果叶绿（图2，全库唯一绿）
    "nose":    "#FFCB05",  # 鼻子黄（图1/2）
    "bear":    "#BD8B55",  # 小熊棕（图1）
    "sky":     "#9AD8E3",  # 天空青（图6）
}

# ── 派生色：两枚精确像素的确定性混合，公式公开 ──
D = {
    "pinkLift":  (blend(PX["hero"], PX["paper"], 0.32), "blend(#EE86A7 主视觉粉 32%, #FFFFFF 纸白)"),
    "pinkDeep":  (blend(PX["hero"], PX["veil"], 0.25), "blend(#EE86A7 主视觉粉 25%, #FBE6EF 淡粉纱)"),
    "leafDeep":  (blend(PX["ink"], PX["leaf"], 0.45), "blend(#231815 暖墨 45%, #14AE67 苹果叶绿)"),
    "leafMid":   (blend(PX["leaf"], PX["ink"], 0.62), "blend(#14AE67 苹果叶绿 62%, #231815 暖墨)"),
    "leafDark":  (blend(PX["leaf"], PX["ink"], 0.30), "blend(#14AE67 苹果叶绿 30%, #231815 暖墨)"),
    "noseDeep":  (blend(PX["ink"], PX["nose"], 0.50), "blend(#231815 暖墨 50%, #FFCB05 鼻子黄)"),
    "bearDeep":  (blend(PX["ink"], PX["bear"], 0.40), "blend(#231815 暖墨 40%, #BD8B55 小熊棕)"),
    "bearDark":  (blend(PX["ink"], PX["bear"], 0.50), "blend(#231815 暖墨 50%, #BD8B55 小熊棕)"),
    "bearTan":   (blend(PX["ink"], PX["bear"], 0.25), "blend(#231815 暖墨 25%, #BD8B55 小熊棕)"),
    "skyDeep":   (blend(PX["ink"], PX["sky"], 0.55), "blend(#231815 暖墨 55%, #9AD8E3 天空青)"),
    "inkDeep":   (blend(PX["ink"], PX["crimson"], 0.25), "blend(#231815 暖墨 25%, #C8152D 蝴蝶结红)"),
    "roseDeep":  (blend(PX["ink"], PX["deeprose"], 0.30), "blend(#231815 暖墨 30%, #D12E63 深玫红)"),
    "cobalt":    (blend(PX["navy"], PX["paper"], 0.90), "blend(#0E52A5 背带裤蓝 90%, #FFFFFF 纸白)"),
    "slateblue": (blend(PX["midblue"], PX["ink"], 0.75), "blend(#4F86C5 背带裤中蓝 75%, #231815 暖墨)"),
    "navyDeep":  (blend(PX["navy"], PX["ink"], 0.70), "blend(#0E52A5 背带裤蓝 70%, #231815 暖墨)"),
    "mint":      (blend(PX["leaf"], PX["paper"], 0.14), "blend(#14AE67 苹果叶绿 14%, #FFFFFF 纸白)"),
    "mintGut":   (blend(PX["leaf"], PX["paper"], 0.22), "blend(#14AE67 苹果叶绿 22%, #FFFFFF 纸白)"),
}

V = {
    # 背景与表面 8
    "background":         PX["paper"],
    "backgroundPanel":    PX["veil"],
    "backgroundElement":  D["pinkLift"][0],
    "sidebarBg":          PX["rose"],
    "bubbleBg":           PX["hero"],
    "inputBg":            PX["veil"],
    "codeBlockBg":        PX["paper"],
    "codeHeaderBg":       PX["orchid"],
    # 文字 2
    "text":               PX["ink"],
    "textMuted":          PX["slate"],
    # 品牌与状态 6
    "primary":            PX["crimson"],
    "secondary":          PX["navy"],
    "info":               PX["midblue"],
    "success":            D["leafDeep"][0],
    "warning":            D["noseDeep"][0],
    "error":              PX["rasp"],
    # 边框 2
    "border":             PX["orchid"],
    "borderActive":       PX["crimson"],
    # 改动对比 6
    "diffAdded":          D["leafDark"][0],
    "diffRemoved":        D["inkDeep"][0],
    "diffAddedBg":        D["mint"][0],
    "diffRemovedBg":      D["pinkDeep"][0],
    "diffAddedLineNumberBg":   D["mintGut"][0],
    "diffRemovedLineNumberBg": PX["orchid"],
    # Markdown 6
    "markdownHeading":    D["roseDeep"][0],
    "markdownLink":       D["cobalt"][0],
    "markdownCode":       D["bearDeep"][0],
    "markdownEmph":       D["skyDeep"][0],
    "markdownStrong":     PX["black"],
    "markdownBlockQuote": PX["gray"],
    # 语法 7
    "syntaxComment":      PX["ltgray"],
    "syntaxKeyword":      PX["deeprose"],
    "syntaxFunction":     D["slateblue"][0],
    "syntaxType":         D["navyDeep"][0],
    "syntaxNumber":       D["bearDark"][0],
    "syntaxString":       D["leafMid"][0],
    "syntaxOperator":     D["bearTan"][0],
}

SLOTS = [
    "background", "backgroundPanel", "backgroundElement", "sidebarBg", "bubbleBg", "inputBg",
    "codeBlockBg", "codeHeaderBg", "text", "textMuted", "primary", "secondary", "info",
    "success", "warning", "error", "border", "borderActive", "diffAdded", "diffRemoved",
    "diffAddedBg", "diffRemovedBg", "diffAddedLineNumberBg", "diffRemovedLineNumberBg",
    "markdownHeading", "markdownLink", "markdownCode", "markdownEmph", "markdownStrong",
    "markdownBlockQuote", "syntaxComment", "syntaxKeyword", "syntaxFunction", "syntaxType",
    "syntaxNumber", "syntaxString", "syntaxOperator",
]

NOTE = {
    "background": "画布 = Kitty 的白脸，全库占比 29.68% 的「纸」",
    "backgroundPanel": "淡粉纱：芯片 / 代码头 / 提示条 / 占位符",
    "backgroundElement": "浮层粉（派生）：选择器 / 提示 / 引用块 / 浮起面",
    "sidebarBg": "侧栏 = 海报粉墙（图4/5/6 玫瑰粉）",
    "bubbleBg": "用户气泡 = 全库占比最大的主视觉粉「唯一主角」",
    "inputBg": "输入框 = 淡粉纱，浮在白画布上更脆",
    "codeBlockBg": "代码块 = 纸白：shiki 前景=文字色，必须浅",
    "codeHeaderBg": "代码头 = 浅粉带",
    "text": "正文 = 暖墨勾线（图2 描边），非冷黑",
    "textMuted": "次级文字 = 灰墨（图1 字幕条）",
    "primary": "主色 = 蝴蝶结深红，全场唯一「心跳」",
    "secondary": "次级 = 背带裤深蓝（与主色成三角关系）",
    "info": "信息 = 背带裤中蓝",
    "success": "成功 = 苹果叶绿压深（原图 2.92:1 不足字对比）",
    "warning": "警告 = 鼻子黄压深（原图 1.51:1 不可用）",
    "error": "错误 = 深覆盆红（图4）",
    "border": "细线 = 浅粉 1.71:1，安静不抢戏",
    "borderActive": "焦点环 = 品牌红（仓库 v3 已记档的并岗）",
    "diffAdded": "新增 = 叶绿 30% 压深",
    "diffRemoved": "删除 = 蝴蝶结红压深",
    "diffAddedBg": "新增底 = 叶绿 14% 淡色",
    "diffRemovedBg": "删除底 = 主视觉粉 25% 淡色",
    "diffAddedLineNumberBg": "新增行号槽 = 叶绿 22% 淡色",
    "diffRemovedLineNumberBg": "删除行号槽 = 浅粉",
    "markdownHeading": "标题 = 深玫红压深",
    "markdownLink": "链接 = 背带裤蓝提亮 10%",
    "markdownCode": "行内代码 = 小熊棕压深",
    "markdownEmph": "斜体 = 天空青压深",
    "markdownStrong": "加粗 = 纯黑（图2/3/4 描边）",
    "markdownBlockQuote": "引用 = 中灰",
    "syntaxComment": "注释 = 浅冷灰（对比度最低，退后）",
    "syntaxKeyword": "关键字 = 深玫红",
    "syntaxFunction": "函数 = 背带裤中蓝压深",
    "syntaxType": "类型 = 背带裤深蓝压深",
    "syntaxNumber": "数字 = 小熊棕 50% 压深",
    "syntaxString": "字符串 = 苹果叶绿 62%",
    "syntaxOperator": "操作符 = 小熊棕 25% 压深",
}


def parse_formula(f):
    m = re.match(r"blend\(#([0-9A-F]{6}).*?([\d.]+)%.*?#([0-9A-F]{6})", f)
    if not m:
        raise ValueError("公式不可解析：" + f)
    return "#" + m.group(1), "#" + m.group(3), float(m.group(2)) / 100.0


def main():
    assert set(V.keys()) == set(SLOTS), set(V) ^ set(SLOTS)
    assert len(V) == 37

    prov = {}
    fails = []
    derived_values = {val: (name, f) for name, (val, f) in D.items()}
    for k, v in V.items():
        if v in derived_values:
            # 派生优先：即使该派生值恰好也出现在某张图里，它仍是按公式生成的
            name, formula = derived_values[v]
            prov[k] = {"value": v, "kind": "derived", "formula": formula, "note": NOTE[k]}
            fg, bg, a = parse_formula(formula)
            if blend(fg, bg, a) != v:
                fails.append("%s 派生复算不一致" % k)
            if fg not in EXACT or bg not in EXACT:
                fails.append("%s 的派生输入不是精确像素" % k)
        elif v in EXACT:
            anchor = [n for n, h in PX.items() if h == v][0]
            prov[k] = {"value": v, "kind": "exact", "anchor": anchor, "note": NOTE[k]}
        else:
            fails.append("%s 既非精确像素也无派生公式" % k)

    hard, ui, warn, pal, surf = A.evaluate(V)
    repaired = {k: (V.get(k), v) for k, v in pal.items() if V.get(k) != v}

    print("=" * 84)
    print("溯源：%d 精确像素槽 + %d 派生槽；去重后独立色值 %d 个"
          % (sum(1 for p in prov.values() if p["kind"] == "exact"),
             sum(1 for p in prov.values() if p["kind"] == "derived"), len(set(V.values()))))
    print("判尺：硬性 4.5:1 违例 %d · UI 3:1 违例 %d · 设计告警 %d"
          % (len(hard), len(ui), len(warn)))
    for c, r, b in hard:
        print("  [硬性] %-34s %.2f" % (c, r))
    for c, r, b in ui:
        print("  [UI]   %-34s %.2f" % (c, r))
    for code, kind, roles, detail in warn:
        print("  [%s] %s %s %s" % (code, kind, " = ".join(roles), detail))
    if repaired:
        print("  ⚠ 引擎 diff 修复会改动：", repaired)
    if fails:
        print("失败：", fails)
        raise SystemExit(1)

    out = {
        "source": CORPUS["source"],
        "references": [f["name"] for f in CORPUS["files"]],
        "total_px": CORPUS["total_px"],
        "colors": V,
        "provenance": prov,
        "anchors": PX,
        "derived": {k: {"value": v, "formula": f} for k, (v, f) in D.items()},
        "criteria": {"hard_violations": len(hard), "ui_violations": len(ui),
                     "design_warnings": [w[0] for w in warn]},
    }
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    print("写出 palette.json")


if __name__ == "__main__":
    main()
