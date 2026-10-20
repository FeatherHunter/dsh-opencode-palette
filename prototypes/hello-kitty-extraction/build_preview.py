# -*- coding: utf-8 -*-
"""build_preview.py — 由 palette.json（结论）生成 ../hello-kitty-theme-preview.html。

预览页自包含：6 张参考图以 base64 内联（与仓库其它 *-theme-preview.html 一致），
单文件可直接双击打开，不依赖任何外部路径。
"""
import base64
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
PROTO = os.path.dirname(HERE)
SRC = r"C:\Users\辰辰洋洋\Pictures\HelloKitty"
REF = {
    "ref1-poster.png": "01-hello-kitty-classic-red-bow-art.png",
    "ref2-1974.png": "2.png",
    "ref3-overalls.png": "3.jpg",
    "ref4-plush.png": "4.jpg",
    "ref5-lineart.png": "5.jpg",
    "ref6-confetti.png": "6.jpg",
}
MIME = {"png": "image/png", "jpg": "image/jpeg"}

D = json.load(open(os.path.join(HERE, "palette.json"), encoding="utf-8"))
C = D["colors"]
PROV = D["provenance"]

FILE_LABEL = {
    "01-hello-kitty-classic-red-bow-art.png": "图1 海报",
    "2.png": "图2 1974", "3.jpg": "图3 背带裤", "4.jpg": "图4 绒布", "5.jpg": "图5 线稿",
    "6.jpg": "图6 纸屑",
}
PIX_FILES = {
    "#FFFFFF": ["图1 海报", "图2 1974", "图3 背带裤", "图4 绒布", "图5 线稿", "图6 纸屑"],
    "#FBE6EF": ["图1 海报", "图6 纸屑"],
    "#F4B4D0": ["图1 海报"],
    "#EEA9BC": ["图4 绒布", "图5 线稿", "图6 纸屑"],
    "#EE86A7": ["图1 海报", "图4 绒布"],
    "#231815": ["图2 1974"],
    "#40404A": ["图1 海报", "图2 1974", "图6 纸屑"],
    "#565656": ["图2 1974", "图3 背带裤", "图5 线稿"],
    "#737378": ["图1 海报", "图2 1974"],
    "#C8152D": ["图1 海报"],
    "#B00C3F": ["图4 绒布"],
    "#D12E63": ["图4 绒布"],
    "#0E52A5": ["图3 背带裤"],
    "#4F86C5": ["图2 1974"],
    "#14AE67": ["图2 1974"],
    "#FFCB05": ["图1 海报", "图2 1974"],
    "#BD8B55": ["图1 海报"],
    "#9AD8E3": ["图6 纸屑"],
    "#000000": ["图2 1974", "图3 背带裤", "图4 绒布"],
}
GROUPS = [
    ("背景与表面", ["background", "backgroundPanel", "backgroundElement", "sidebarBg",
                    "bubbleBg", "inputBg", "codeBlockBg", "codeHeaderBg"]),
    ("文字", ["text", "textMuted"]),
    ("品牌与状态", ["primary", "secondary", "info", "success", "warning", "error"]),
    ("边框", ["border", "borderActive"]),
    ("改动对比", ["diffAdded", "diffRemoved", "diffAddedBg", "diffRemovedBg",
                  "diffAddedLineNumberBg", "diffRemovedLineNumberBg"]),
    ("Markdown", ["markdownHeading", "markdownLink", "markdownCode", "markdownEmph",
                  "markdownStrong", "markdownBlockQuote"]),
    ("语法高亮", ["syntaxComment", "syntaxKeyword", "syntaxFunction", "syntaxType",
                   "syntaxNumber", "syntaxString", "syntaxOperator"]),
]


def srgb_lin(v):
    v /= 255.0
    return v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4


def lum(hx):
    h = hx.lstrip("#")
    r, g, b = (int(h[i:i + 2], 16) for i in (0, 2, 4))
    return 0.2126 * srgb_lin(r) + 0.7152 * srgb_lin(g) + 0.0722 * srgb_lin(b)


def contrast(a, b):
    la, lb = lum(a), lum(b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)


def fg_on(v):
    return "#231815" if lum(v) > 0.30 else "#FFFFFF"


def esc(s):
    return (s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
             .replace('"', "&quot;"))


def src_badge(key):
    p = PROV[key]
    if p["kind"] == "derived":
        return '<span class="src der">派生</span>'
    return '<span class="src">%s</span>' % esc(" · ".join(PIX_FILES.get(p["value"], [])[:3]))


def build():
    grid_html = []
    for gname, keys in GROUPS:
        grid_html.append('<div class="ghead"><h4>%s</h4><span class="ghint">%d 个色位</span></div>'
                         % (gname, len(keys)))
        sw = []
        for k in keys:
            v = C[k]
            sw.append(
                '<div class="sw" data-hex="%s" data-key="%s" title="%s">'
                '<div class="top" style="background:%s;color:%s"><span class="hex">%s</span></div>'
                '<div class="lbl"><b>%s</b></div><div class="srcline">%s</div></div>'
                % (v, k, esc(PROV[k]["note"]), v, fg_on(v), v, k, src_badge(k)))
        grid_html.append('<div class="grid g%d">%s</div>' % (len(keys), "".join(sw)))

    ledger_rows = []
    for gname, keys in GROUPS:
        for k in keys:
            p = PROV[k]
            src = ('<span class="mono der">%s</span>' % esc(p["formula"])) if p["kind"] == "derived" \
                else ('<span class="mono">%s</span>' % esc("、".join(PIX_FILES.get(p["value"], ["—"]))))
            ledger_rows.append(
                '<tr><td class="mono">%s</td><td class="mono"><b>%s</b></td><td>%s</td>'
                '<td class="note">%s</td></tr>' % (k, p["value"], src, esc(p["note"])))

    AUDIT = [
        ("text", "background", 4.5, "正文 / 纸白"),
        ("text", "sidebarBg", 4.5, "正文 / 侧栏粉墙"),
        ("textMuted", "background", 4.5, "次级文字 / 纸白"),
        ("textMuted", "backgroundElement", 4.5, "次级文字 / 浮层粉"),
        ("textMuted", "background", 4.5, "80% 淡化的次级文字 / 纸白"),
        ("textMuted", "backgroundPanel", 4.5, "80% 淡化的次级文字 / 淡粉纱"),
        ("textMuted", "backgroundElement", 4.5, "80% 淡化的次级文字 / 浮层粉"),
        ("primary", "background", 4.5, "主色 / 纸白"),
        ("secondary", "background", 4.5, "次级 / 纸白"),
        ("info", "background", 3.0, "信息 / 纸白"),
        ("success", "background", 4.5, "成功 / 纸白"),
        ("warning", "background", 4.5, "警告 / 纸白"),
        ("error", "background", 4.5, "错误 / 纸白"),
        ("borderActive", "background", 3.0, "焦点环 / 纸白"),
        ("borderActive", "backgroundElement", 3.0, "焦点环 / 浮层粉"),
        ("border", "background", 1.3, "发丝细线 / 纸白（装饰性）"),
        ("markdownHeading", "background", 4.5, "标题 / 纸白"),
        ("markdownLink", "background", 4.5, "链接 / 纸白"),
        ("markdownLink", "backgroundPanel", 4.5, "链接 / 淡粉纱"),
        ("markdownCode", "background", 4.5, "行内代码 / 纸白"),
        ("markdownEmph", "background", 4.5, "斜体 / 纸白"),
        ("markdownStrong", "background", 4.5, "加粗 / 纸白"),
        ("markdownBlockQuote", "background", 4.5, "引用 / 纸白"),
        ("syntaxComment", "codeBlockBg", 4.5, "注释 / 代码块"),
        ("syntaxKeyword", "codeBlockBg", 4.5, "关键字 / 代码块"),
        ("syntaxFunction", "codeBlockBg", 4.5, "函数 / 代码块"),
        ("syntaxType", "codeBlockBg", 4.5, "类型 / 代码块"),
        ("syntaxNumber", "codeBlockBg", 4.5, "数字 / 代码块"),
        ("syntaxString", "codeBlockBg", 4.5, "字符串 / 代码块"),
        ("syntaxOperator", "codeBlockBg", 4.5, "操作符 / 代码块"),
        ("diffAdded", "diffAddedBg", 4.5, "新增文字 / 新增底"),
        ("diffRemoved", "diffRemovedBg", 4.5, "删除文字 / 删除底"),
        ("text", "diffAddedBg", 4.5, "正文 / 新增底"),
        ("text", "diffRemovedBg", 4.5, "正文 / 删除底"),
        ("text", "bubbleBg", 4.5, "气泡文字 / 气泡底"),
    ]
    audit_rows = []
    for k, surf, need, label in AUDIT:
        audit_rows.append(
            '<tr><td class="note">%s</td><td class="mono">%s</td><td class="mono">%s</td>'
            '<td class="mono">%.2f : 1</td><td class="mono">%.1f : 1</td>'
            '<td id="lv-%s-%s" class="mono">—</td></tr>'
            % (label, C[k], C[surf], contrast(C[k], C[surf]), need, k, surf))

    ANCHOR_LIST = [("#FFFFFF", "纸白"), ("#EE86A7", "主视觉粉"), ("#EEA9BC", "玫瑰粉墙"),
                   ("#C8152D", "蝴蝶结红"), ("#0E52A5", "背带裤蓝"), ("#14AE67", "苹果叶绿"),
                   ("#FFCB05", "鼻子黄"), ("#BD8B55", "小熊棕")]
    anchor_html = "".join(
        '<span class="anchor"><i style="background:%s"></i>%s <code>%s</code></span>' % (h, n, h)
        for h, n in ANCHOR_LIST)

    def kitty_svg(size=34, cls=""):
        return (
            '<svg class="%s" width="%d" height="%d" viewBox="0 0 40 33" aria-hidden="true">'
            '<g fill="#FFFFFF" stroke="#231815" stroke-width="1.7" stroke-linejoin="round">'
            '<path d="M8.2 12.6 4.2 4.2l8.4 3.6Z"/>'
            '<path d="M31.8 12.6 35.8 4.2l-8.4 3.6Z"/>'
            '<path d="M20 4.6c8.8 0 15 5.4 15 12.1S28.8 28.8 20 28.8 5 23.4 5 16.7 11.2 4.6 20 4.6Z"/>'
            '</g>'
            '<ellipse cx="14.6" cy="17.6" rx="1.85" ry="2.45" fill="#231815"/>'
            '<ellipse cx="25.4" cy="17.6" rx="1.85" ry="2.45" fill="#231815"/>'
            '<ellipse cx="20" cy="20.6" rx="2.1" ry="1.5" fill="#FFCB05"/>'
            '<g stroke="#231815" stroke-width="1.25" stroke-linecap="round">'
            '<path d="M5 14.6 1.2 13M4.7 18.2H0.6M5 21.8 1.2 23.4"/>'
            '<path d="M35 14.6 38.8 13M35.3 18.2h4.1M35 21.8l3.8 1.6"/>'
            '</g>'
            '<g fill="#C8152D">'
            '<ellipse cx="30.4" cy="8.2" rx="4.3" ry="3.3" transform="rotate(-20 30.4 8.2)"/>'
            '<ellipse cx="37.8" cy="9" rx="4.3" ry="3.3" transform="rotate(16 37.8 9)"/>'
            '<circle cx="34.3" cy="8.7" r="2.15"/></g>'
            '<ellipse cx="29.7" cy="6.9" rx="2.0" ry="1.4" transform="rotate(-22 29.7 6.9)" '
            'fill="#E9464D" opacity=".5"/></svg>' % (cls, size, size))

    tpl = open(os.path.join(HERE, "template.html"), encoding="utf-8").read()
    out = (tpl
           .replace("@@CSSVARS@@", "\n".join("    --%s:%s;" % (k, v) for k, v in C.items()))
           .replace("@@ANCHORS@@", anchor_html)
           .replace("@@GRID@@", "\n".join(grid_html))
           .replace("@@LEDGER@@", "\n".join(ledger_rows))
           .replace("@@AUDIT@@", "\n".join(audit_rows))
           .replace("@@KITTY@@", kitty_svg(34))
           .replace("@@KITTY_SM@@", kitty_svg(20))
           .replace("@@JSONMAP@@", json.dumps(C, ensure_ascii=False)))
    # 参考图 base64 内联（自包含）
    for local, orig in REF.items():
        ext = orig.rsplit(".", 1)[1].lower()
        with open(os.path.join(SRC, orig), "rb") as fp:
            b64 = base64.b64encode(fp.read()).decode("ascii")
        out = out.replace('src="ref/%s"' % local, 'src="data:%s;base64,%s"' % (MIME[ext], b64))
    assert 'src="ref/' not in out, "仍有未内联的参考图引用"
    dest = os.path.join(PROTO, "hello-kitty-theme-preview.html")
    with open(dest, "w", encoding="utf-8", newline="\n") as fp:
        fp.write(out)
    print("wrote", dest, os.path.getsize(dest), "bytes（自包含，参考图已 base64 内联）")


if __name__ == "__main__":
    build()
