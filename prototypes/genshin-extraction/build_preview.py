# -*- coding: utf-8 -*-
"""把 tokens.json + assets.json 注入模板，产出单文件 preview.html。"""
import json, os

OUT = os.path.dirname(os.path.abspath(__file__))

tok = json.load(open(os.path.join(OUT, "preview-data.json"), encoding="utf-8"))
ast = json.load(open(os.path.join(OUT, "assets.json"), encoding="utf-8"))

DATA = {
    "light": tok["light"],
    "dark": tok["dark"],
    "recipes": {m: {k: ([v] if isinstance(v, str) else v) for k, v in tok["recipes"][m].items()} for m in ("light", "dark")},
    "auditLight": tok["auditLight"],
    "auditDark": tok["auditDark"],
    "anchors": ast["anchors"],
    "thumbs": ast["thumbs"],
}
blob = json.dumps(DATA, ensure_ascii=False, separators=(",", ":"))

# CSS 变量直接从审计过的色位生成，杜绝手抄漂移
VARMAP = [
    ("background", "bg"), ("backgroundPanel", "panel"), ("backgroundElement", "elem"),
    ("sidebarBg", "sidebar"), ("bubbleBg", "bubble"), ("inputBg", "input"),
    ("codeBlockBg", "code"), ("codeHeaderBg", "codehead"),
    ("text", "text"), ("textMuted", "muted"),
    ("primary", "primary"), ("secondary", "secondary"), ("info", "info"),
    ("success", "success"), ("warning", "warning"), ("error", "error"),
    ("border", "border"), ("borderActive", "active"),
    ("diffAdded", "dadd"), ("diffRemoved", "drem"),
    ("diffAddedBg", "daddbg"), ("diffRemovedBg", "drembg"),
    ("diffAddedLineNumberBg", "daddln"), ("diffRemovedLineNumberBg", "dremln"),
    ("markdownHeading", "h"), ("markdownLink", "link"), ("markdownCode", "mcode"),
    ("markdownEmph", "em"), ("markdownStrong", "strong"), ("markdownBlockQuote", "quote"),
    ("syntaxComment", "scom"), ("syntaxKeyword", "skw"), ("syntaxFunction", "sfn"),
    ("syntaxType", "styp"), ("syntaxNumber", "snum"), ("syntaxString", "sstr"),
    ("syntaxOperator", "sop"),
]

def vars_for(mode):
    t = tok[mode]
    out = []
    for i in range(0, len(VARMAP), 4):
        chunk = VARMAP[i:i + 4]
        out.append("  " + " ".join("--%s:%s;" % (v, t[k]) for k, v in chunk))
    return "\n".join(out)

tpl = open(os.path.join(OUT, "preview.template.html"), encoding="utf-8").read()
assert "/*__DATA__*/" in tpl
html = tpl.replace("/*__DATA__*/", blob)
html = html.replace("/*__VARS_LIGHT__*/", vars_for("light"))
html = html.replace("/*__VARS_DARK__*/", vars_for("dark"))

dest = os.path.join(OUT, "preview.html")
open(dest, "w", encoding="utf-8", newline="\n").write(html)
print("preview.html written:", dest)
import shutil
shutil.copyfile(dest, os.path.join(OUT, "..", "genshin-theme-preview.html"))
print("synced -> prototypes/genshin-theme-preview.html")
print("size: %.1f KB" % (os.path.getsize(dest) / 1024))
print("tokens:", len(tok["light"]), "light /", len(tok["dark"]), "dark")
print("anchors:", len(ast["anchors"]), " thumbs:", len(ast["thumbs"]))
