# -*- coding: utf-8 -*-
"""生成 palette/tokens.yaml（宿主 token 事实表，全量 425）与逐条清单 HTML。

排序原则（维护者要求 2026-10-24）：
- 相关属性放在一起：先按大族（alias / specific / shiki / static / … / typography / dsh），
  再按次一级分组（alias 子组、static 色系），再到最内部状态；
- 同一分组内：live 在前（按宿主消费次数降序），gated 次之，dead 最后（按名字）；
- 每个条目显式带 status（+ modifiers）标签。

数据源：D:\\Temp\\dsh-src（默认 rc.2 @687f282；用 DSH_SRC 覆盖）。
输出：
- palette/tokens.yaml
- docs/research/v3-color-tokens-222-catalog.html（颜色轴 222 条，含状态标签与分组）
- docs/research/v3-host-tokens-425-catalog.html（全量 425 条）
"""
import json
import os
import re
from collections import Counter, OrderedDict, defaultdict

SRC = os.environ.get("DSH_SRC", r"D:\Temp\dsh-src")
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
STYLES = os.path.join(SRC, "packages", "client", "ui-theme", "src", "styles")
OUT_YAML = os.path.join(ROOT, "palette", "tokens.yaml")
OUT_COLOR_HTML = os.path.join(ROOT, "docs", "research", "v3-color-tokens-222-catalog.html")
OUT_ALL_HTML = os.path.join(ROOT, "docs", "research", "v3-host-tokens-425-catalog.html")

DECL_RE = re.compile(r"(--[a-z0-9][a-z0-9-]*)\s*:\s*([^;]+);", re.S)
VAR_RE = re.compile(r"var\(\s*(--[a-z0-9][a-z0-9-]+)")
GETPROP_RE = re.compile(r"getPropertyValue\(\s*['\"](--[a-z0-9][a-z0-9-]+)['\"]")
SETPROP_RE = re.compile(r"setProperty\(\s*['\"](--[a-z0-9][a-z0-9-]+)['\"]")

COLOR_FAMILIES = {"alias", "specific", "static", "shiki", "focus", "menu_color",
                  "shadow", "elevation", "gradient", "linear"}
# 颜色轴子组顺序（人类语义顺序）
ALIAS_SUBORDER = ["bg", "label", "state", "button", "border", "interactive", "brand",
                  "markdown", "code", "file", "menu", "scrollbar", "onboarding",
                  "settings", "tooltip", "toast", "turn", "link", "switch"]
STATIC_FAM_ORDER = ["blue", "deepseek", "green", "amber", "neutral", "neutral-bluish", "red"]
FAMILY_ORDER = ["alias", "specific", "shiki", "static", "focus", "menu_color", "menu",
                "shadow", "elevation", "gradient", "linear",
                "typography", "radius", "corner", "mask", "dsh"]
STATUS_RANK = {"live": 0, "gated": 1, "dead": 2}

DEAD = set("""
--dsw-alias-bg-multi-select --dsw-alias-border-inverted2 --dsw-alias-brand-primary-invert
--dsw-alias-brand-text --dsw-alias-button-ghost-active-hover --dsw-alias-button-primary-dimmed
--dsw-alias-button-tool-bar-fill-invisible --dsw-alias-interactive-bg-hover-accent
--dsw-alias-markdown-code-segment-selected --dsw-alias-markdown-code-segment-unselected
--dsw-alias-markdown-placeholder --dsw-alias-bg-mask-2 --dsw-alias-bg-mask-3
--dsw-alias-bg-mask-photo --dsw-specific-bubble-highlight --dsw-specific-login-input
--dsw-specific-tip --dsw-linear-gradient-think --dsw-linear-think-select
--dsw-shadow-lv1 --dsw-shadow-lv1-blur
--dsw-static-blue-100 --dsw-static-blue-50 --dsw-static-blue-50p --dsw-static-blue-75
--dsw-static-blue-800 --dsw-static-deepseek-300 --dsw-static-deepseek-600
--dsw-static-deepseek-700-delete --dsw-static-deepseek-900 --dsw-static-neutral-150
--dsw-static-neutral-250 --dsw-static-neutral-500 --dsw-static-neutral-900
--dsw-static-red-100 --dsw-static-red-50 --dsw-static-red-500 --dsw-static-red-900
""".split())
GATED = {"--dsw-elevation-panel", "--dsw-elevation-prominent", "--dsw-elevation-soft",
         "--dsw-elevation-stroke", "--dsw-elevation-stroke-color"}
# 运行时消费（CSS var() 扫描看不见）
RUNTIME = {f"--shiki-token-{x}" for x in
           ["comment", "constant", "function", "keyword", "link", "parameter",
            "punctuation", "string", "string-expression"]}

GROUP_ZH = OrderedDict([
    ("bg", "背景与填充"), ("file", "文件"), ("label", "文字"), ("state", "状态"),
    ("button", "按钮"), ("border", "边框"), ("interactive", "交互"), ("brand", "品牌"),
    ("onboarding", "引导页"), ("scrollbar", "滚动条"), ("tooltip", "提示"), ("menu", "菜单"),
    ("settings", "设置"), ("toast", "轻提示"), ("code", "代码"), ("turn", "对话轮次"),
    ("link", "链接"), ("switch", "开关"), ("markdown", "Markdown"),
])
SUFFIX_ZH = {
    "base": "基础", "layer-1": "第 1 层", "layer-2": "第 2 层", "layer-3": "第 3 层",
    "layer-4": "第 4 层", "mask": "蒙层", "mask-1": "蒙层 1", "mask-2": "蒙层 2",
    "mask-3": "蒙层 3", "mask-photo": "照片蒙层", "mask-drop": "拖放蒙层",
    "multi-select": "多选", "document-preview": "文档预览", "document-selection": "文档选区",
    "fill": "填充", "fill-l1": "填充 1 级", "fill-l2": "填充 2 级", "fill-tertiary": "三级填充",
    "fill-tsp-secondary": "半透明次级填充", "primary": "主", "secondary": "次", "tertiary": "三级",
    "quaternary": "四级", "disabled": "禁用", "error": "错误", "success": "成功", "warning": "警告",
    "business": "业务", "invert": "反色", "inverted2": "反色 2", "brand": "品牌", "text": "文字",
    "active": "激活", "hover": "悬停", "hovered": "悬停", "selected": "选中", "focus": "聚焦",
    "ghost": "幽灵", "dimmed": "弱化", "invisible": "隐形", "divider": "分隔线",
    "separator": "分隔线", "wash": "淡彩", "pressed": "按下", "nav": "导航", "item": "条目",
    "nav-item": "导航条目", "group": "分组", "header": "头部", "group-header-fill": "分组头填充",
    "code": "代码", "block": "块", "code-block": "代码块", "markdown": "Markdown",
    "segment": "代码段", "placeholder": "占位", "think": "思考", "select": "选择",
    "scrollbar": "滚动条", "thumb": "滑块", "track": "轨道", "turn": "轮次", "trigger": "触发器",
    "accent": "强调", "card": "卡片", "checkbox": "勾选框", "stroke": "描边", "border": "边框",
    "tooltip": "提示", "toast": "轻提示", "menu": "菜单", "settings": "设置", "switch": "开关",
    "onboarding": "引导页", "link": "链接", "bubble": "气泡", "input": "输入",
    "bubble-highlight": "气泡高亮", "login-input": "登录输入", "selector": "选择器",
    "sidebar-fill": "侧栏填充", "sidebar-nav-item-active": "侧栏导航激活",
    "sidebar-nav-item-active-accent": "侧栏导航激活强调", "sidebar-nav-item-hover": "侧栏导航悬停",
    "tip": "提示", "surface": "表面", "material": "材质", "shadow": "阴影", "elevation": "高度",
    "brand-primary-new-colorprimary-new-color": "品牌主色（宿主畸形名）",
}
STATIC_FAM_ZH = OrderedDict([("amber", "琥珀"), ("blue", "蓝"), ("deepseek", "DeepSeek"),
                             ("green", "绿"), ("neutral-bluish", "中性偏蓝"),
                             ("neutral", "中性"), ("red", "红")])
SHIKI_ZH = {"--shiki-background": "代码高亮背景", "--shiki-foreground": "代码高亮前景",
            "--shiki-token-comment": "注释", "--shiki-token-constant": "常量",
            "--shiki-token-function": "函数", "--shiki-token-keyword": "关键字",
            "--shiki-token-link": "链接", "--shiki-token-parameter": "参数",
            "--shiki-token-punctuation": "标点", "--shiki-token-string": "字符串",
            "--shiki-token-string-expression": "字符串插值"}
DSH_ZH = {
    "--dsh-code-font-delta": "代码字号增量", "--dsh-content-font-delta": "正文字号增量",
    "--dsh-content-font-delta-secondary": "次级正文字号增量",
    "--dsh-content-font-size-secondary": "次级正文字号",
    "--dsh-font-family-code-default": "代码字族默认值",
    "--dsh-font-family-text-default": "正文字族默认值",
    "--dsh-scrollbar-thumb": "滚动条滑块", "--dsh-scrollbar-thumb-border": "滚动条滑块描边",
    "--dsh-scrollbar-thumb-hover": "滚动条滑块悬停", "--dsh-scrollbar-track-margin": "滚动条轨道留白",
    "--dsh-scrollbar-width": "滚动条宽度",
}


def rel(path):
    return os.path.relpath(path, SRC).replace("\\", "/")


def short(path):
    return rel(path).replace("\\", "/")


def is_theme_token(name):
    return name.startswith(("--dsw-", "--shiki-", "--dsh-"))


def collect_declarations():
    decls = defaultdict(list)
    for fn in sorted(os.listdir(STYLES)):
        if not fn.endswith(".css"):
            continue
        path = os.path.join(STYLES, fn)
        with open(path, encoding="utf-8") as f:
            text = f.read()
        for m in DECL_RE.finditer(text):
            name = m.group(1)
            if not is_theme_token(name):
                continue
            lineno = text.count("\n", 0, m.start()) + 1
            value = " ".join(m.group(2).split())
            decls[name].append((f"packages/client/ui-theme/src/styles/{fn}", lineno, value))
    return decls


def collect_consumers():
    counts, byfile = defaultdict(int), defaultdict(lambda: defaultdict(int))
    roots = [os.path.join(SRC, "packages", "client"), os.path.join(SRC, "apps", "web"),
             os.path.join(SRC, "apps", "desktop")]
    for root in roots:
        if not os.path.isdir(root):
            continue
        for dirpath, dirnames, filenames in os.walk(root):
            dirnames[:] = [d for d in dirnames if d not in
                           ("node_modules", "dist", ".git", "tests", "__tests__", "test")]
            for fn in filenames:
                if not fn.endswith((".css", ".tsx", ".ts", ".jsx")):
                    continue
                if ".test." in fn or ".spec." in fn or ".e2e." in fn or fn.endswith(".d.ts") or fn.startswith("__"):
                    continue
                path = os.path.join(dirpath, fn)
                try:
                    with open(path, encoding="utf-8", errors="ignore") as f:
                        text = f.read()
                except OSError:
                    continue
                found = VAR_RE.findall(text) + GETPROP_RE.findall(text) + SETPROP_RE.findall(text)
                sf = short(path)
                for name in set(found):
                    if is_theme_token(name):
                        c = found.count(name)
                        counts[name] += c
                        byfile[name][sf] += c
    return counts, byfile


def repo_refs():
    """本仓 src/runtime 是否引用某 token（in_repo）。"""
    refs = defaultdict(int)
    for root in ("src", "runtime"):
        base = os.path.join(ROOT, root)
        if not os.path.isdir(base):
            continue
        for dirpath, _, filenames in os.walk(base):
            for fn in filenames:
                if not fn.endswith((".ts", ".tsx", ".json", ".css")):
                    continue
                try:
                    text = open(os.path.join(dirpath, fn), encoding="utf-8", errors="ignore").read()
                except OSError:
                    continue
                for name in set(re.findall(r"(--(?:dsw|shiki|dsh)-[a-z0-9-]+)", text)):
                    refs[name] += 1
    return refs


def family_of(name):
    if name.startswith("--shiki-"):
        return "shiki", ""
    if name.startswith("--dsh-"):
        return "dsh", ""
    if name.startswith("--dsw-static-"):
        body = name[len("--dsw-static-"):]
        for fam in ("neutral-bluish", "deepseek", "neutral", "amber", "blue", "green", "red"):
            if body.startswith(fam + "-"):
                return "static", fam
        return "static", "other"
    if name.startswith("--dsw-specific-"):
        return "specific", ""
    if name.startswith("--dsw-font-"):
        return "typography", ""
    if name.startswith("--dsw-shadow-"):
        return "shadow", ""
    if name.startswith("--dsw-elevation-"):
        return "elevation", ""
    if name.startswith("--dsw-gradient-"):
        return "gradient", ""
    if name.startswith("--dsw-linear-"):
        return "linear", ""
    if name == "--dsw-focus-ring-color":
        return "focus", ""
    if name == "--dsw-menu-surface-fill":
        return "menu_color", ""
    if name.startswith("--dsw-menu-"):
        return "menu", ""
    if name.startswith("--dsw-radius-"):
        return "radius", ""
    if name == "--dsw-corner-shape":
        return "corner", ""
    if name.startswith("--dsw-mask-"):
        return "mask", ""
    if name.startswith("--dsw-alias-"):
        return "alias", name[len("--dsw-alias-"):].split("-")[0]
    return "other", ""


def ns_of(name):
    if name.startswith("--dsw-"):
        return "dsw"
    if name.startswith("--shiki-"):
        return "shiki"
    if name.startswith("--dsh-"):
        return "dsh"
    return "unknown"


def zh_of(name, family, sub):
    if name in SHIKI_ZH:
        return SHIKI_ZH[name]
    if name in DSH_ZH:
        return DSH_ZH[name]
    if family == "static":
        body = name[len("--dsw-static-"):]
        return "调色板原子：" + body.replace("-", " ")
    if family == "specific":
        return "区域特化：" + SUFFIX_ZH.get(name[len("--dsw-specific-"):], name[len("--dsw-specific-"):])
    if family == "shadow":
        return "阴影：" + name[len("--dsw-shadow-"):]
    if family == "elevation":
        return "材质阴影：" + name[len("--dsw-elevation-"):]
    if family == "gradient":
        return "渐变：" + name[len("--dsw-gradient-"):].replace("-stops", " 色标")
    if family == "linear":
        return "线性渐变：" + name[len("--dsw-linear-"):]
    if family == "focus":
        return "焦点环颜色"
    if family == "menu_color":
        return "菜单表面填充（材质层）"
    if family == "menu":
        return "菜单：" + name[len("--dsw-menu-"):]
    if family == "radius":
        return "圆角档位：" + name[len("--dsw-radius-"):]
    if family == "corner":
        return "角形状"
    if family == "mask":
        return "蒙层：" + name[len("--dsw-mask-"):]
    if family == "typography":
        body = name[len("--dsw-font-"):]
        if body == "family":
            return "全局字族"
        if body == "family-brand":
            return "品牌字族"
        for sfx, tag in (("-font-family", "字族（长手）"), ("-font-size", "字号（长手）"),
                         ("-font-style", "字体样式（长手）"), ("-font-weight", "字重（长手）"),
                         ("-line-height", "行高（长手）")):
            if body.endswith(sfx):
                return f"排印：{body[:-len(sfx)]} {tag}"
        return "排印复合：" + body.replace("-", " ")
    if family == "alias":
        body = name[len("--dsw-alias-"):]
        parts = body.split("-")
        gzh = GROUP_ZH.get(parts[0], parts[0])
        rest = "-".join(parts[1:])
        zh = SUFFIX_ZH.get(rest)
        if zh is None:
            pieces = [SUFFIX_ZH.get(p) for p in parts[1:] if SUFFIX_ZH.get(p)]
            zh = " ".join(pieces) if pieces else rest
        return f"{gzh}：{zh}"
    return name


def _load_doc_value_types():
    """P1/P4 逐条表里的 value_type 比按族猜更准；有则优先用。"""
    m = {}
    for rel in ("color-ability-map.json", "noncolor-surface-map.json"):
        p = os.path.join(ROOT, "docs", "research", rel)
        if not os.path.exists(p):
            continue
        try:
            data = json.load(open(p, encoding="utf-8"))
        except (OSError, ValueError):
            continue
        rows = data.get("rows") if isinstance(data, dict) else data
        for r in rows or []:
            n = r.get("token") or r.get("name")
            vt = r.get("value_type")
            if n and vt and n not in m:
                m[n] = vt
    return m


DOC_VALUE_TYPES = _load_doc_value_types()


def value_type(name, family):
    if name in DOC_VALUE_TYPES:
        return DOC_VALUE_TYPES[name]
    if family in ("shadow", "elevation"):
        return "shadow"
    if family in ("gradient", "linear"):
        return "gradient"
    if family == "typography":
        return "font"
    if family in ("radius", "corner", "mask", "dsh") or name in ("--dsw-scrollbar-width",):
        return "number/长度"
    return "color"


def out_value_type(name, family):
    if name in DOC_VALUE_TYPES:
        return DOC_VALUE_TYPES[name]
    if family in ("shadow", "elevation"):
        return "shadow（多段阴影）"
    if family in ("gradient", "linear"):
        return "渐变（颜色停滞）"
    if family == "typography":
        return "font / length"
    if family in ("radius", "corner", "mask"):
        return "length / number"
    if family == "dsh":
        return "length / number"
    return "color（背景类可接受 paint）"


def main():
    decls = collect_declarations()
    counts, files = collect_consumers()
    in_repo = repo_refs()

    entries = []
    for name in sorted(decls):
        family, sub = family_of(name)
        d0 = decls[name][0]
        c = counts.get(name, 0)
        js = in_repo.get(name, 0)
        runtime = name in RUNTIME
        if name in DEAD or (c == 0 and not runtime and js == 0):
            status, mods = "dead", []
        elif name in GATED:
            status, mods = "live", ["gated"]
        else:
            status, mods = "live", []
        entries.append({
            "name": name, "namespace": ns_of(name), "family": family, "subgroup": sub,
            "status": status, "modifiers": mods,
            "zh": zh_of(name, family, sub), "value_type": value_type(name, family),
            "declared": [f"{f}:{l}" for f, l, _ in decls[name]],
            "declared_value": d0[2][:160],
            "consumers": c,
            "consumed_by": [
                {"path": p, "count": n}
                for p, n in sorted(files.get(name, {}).items(), key=lambda kv: (-kv[1], kv[0]))
            ],
            "in_repo": js > 0, "runtime": runtime,
        })

    def key(e):
        fam = FAMILY_ORDER.index(e["family"]) if e["family"] in FAMILY_ORDER else 99
        if e["family"] == "alias":
            s = ALIAS_SUBORDER.index(e["subgroup"]) if e["subgroup"] in ALIAS_SUBORDER else 99
        elif e["family"] == "static":
            s = STATIC_FAM_ORDER.index(e["subgroup"]) if e["subgroup"] in STATIC_FAM_ORDER else 99
        else:
            s = 0
        rank = STATUS_RANK["gated" if "gated" in e["modifiers"] else e["status"]]
        return (fam, s, rank, -e["consumers"], e["name"])

    entries.sort(key=key)

    color = [e for e in entries if e["family"] in COLOR_FAMILIES]
    stats = Counter(e["status"] for e in entries)
    color_stats = Counter(e["status"] for e in color)
    color_gated = sum(1 for e in color if "gated" in e["modifiers"])

    # ---------- YAML ----------
    def yq(s):
        return "'" + str(s).replace("'", "''") + "'"

    lines = []
    lines.append("# =============================================================================")
    lines.append("# palette/tokens.yaml —— 宿主 token 事实表（全量）")
    lines.append("# role: 宿主事实（token 全集 / 活死状态 / 声明位置 / 消费方 / 本仓是否已注入）")
    lines.append("# generated: full（扫描器生成；请勿手改，宿主升级后重跑）")
    lines.append("# command: python scripts/research/gen_token_registry.py")
    lines.append("# validate: python scripts/research/palette-check.py")
    lines.append("#")
    lines.append("# 排序原则（维护者 2026-10-24 要求）：")
    lines.append("#   1) 相关属性放在一起：先按大族（alias / specific / shiki / static / … / typography / dsh），")
    lines.append("#      再按次一级分组（alias 子组、static 色系），最后到状态；")
    lines.append("#   2) 同一分组内：live 在前（按宿主消费次数降序）→ gated → dead（按名字）；")
    lines.append("#   3) 每条显式带 status（+ modifiers）标签。")
    lines.append("#")
    lines.append("# 数据源：%s（dsh 0.2.1-rc.3 @ 1f81c04；rc.3 主题面与 rc.2 逐字节相同，见 docs/research/host-rc3-delta-and-v3-impact.md）" % SRC.replace("\\", "/"))
    lines.append("# declared 路径 = 仓库根相对路径（packages/…，可带 :行号）；host.source 下可校验存在。")
    lines.append("# 计数：见下方 namespaces / color_axis 段（由脚本重算写入，勿手改）。")
    lines.append("# =============================================================================")
    lines.append("api: 1")
    lines.append("")
    lines.append("host:")
    lines.append("  version: 0.2.1-rc.3")
    lines.append("  commit: 1f81c047fc48fa190a683e469daa699857e9afe8")
    lines.append("  theme_surface_note: 'rc.3 与 rc.2 的 ui-theme styles SHA256 全同、0 增删声明 → token 表不变'")
    lines.append("  source: %s" % yq(SRC))
    lines.append("  path_base: '仓库根相对路径（packages/… 或 apps/…，可带 :行号）'")
    lines.append("  scan_script: scripts/research/gen_token_registry.py")
    lines.append("")
    lines.append("namespaces:")
    ns = Counter(e["namespace"] for e in entries)
    for k in ("dsw", "shiki", "dsh"):
        lines.append("  %s: %d" % (k, ns.get(k, 0)))
    lines.append("  total: %d" % len(entries))
    lines.append("")
    lines.append("color_axis:")
    lines.append("  total: %d" % len(color))
    lines.append("  live: %d" % color_stats["live"])
    lines.append("  dead: %d" % color_stats["dead"])
    lines.append("  # 说明：live 含其中带 gated 修饰的 %d 条（修饰不另计一栏，避免重复计数）" % color_gated)
    brk = Counter(e["family"] for e in color)
    lines.append("  breakdown:")
    for k in ("alias", "specific", "shiki", "static", "focus", "menu_color", "shadow",
              "elevation", "gradient", "linear"):
        lines.append("    %s: %d" % (k, brk.get(k, 0)))
    lines.append("")
    lines.append("status_model:")
    lines.append("  primary_status:")
    lines.append("    live:      有消费方，写它生效")
    lines.append("    dead:      宿主声明了但没有任何 var()/JS 消费方")
    lines.append("    missing:   宿主从未声明这个名字（用户可能拼错或宿主升级改名）")
    lines.append("  modifiers:")
    lines.append("    pinned:            宿主用字面量 / !important / inline 钉住（仍允许设置，只提示）")
    lines.append("    gated:             宿主在元素级重声明同名变量（elevation 族），body 级写入被子元素覆盖")
    lines.append("    declared_invalid:  宿主声明了但消费链无效（靠 fallback / JS 注入才有值）")
    lines.append("")
    lines.append("tokens:")
    last_fam = last_sub = None
    for e in entries:
        fam_label = e["family"] + (("/" + e["subgroup"]) if e["subgroup"] else "")
        if (e["family"], e["subgroup"]) != (last_fam, last_sub):
            lines.append("")
            lines.append("  # ======== %s ========" % fam_label)
            last_fam, last_sub = e["family"], e["subgroup"]
        status_label = e["status"] + ((" " + ",".join(e["modifiers"])) if e["modifiers"] else "")
        if e["status"] == "dead" and e["consumers"] == 0:
            rank_label = "dead"
        elif "gated" in e["modifiers"]:
            rank_label = "live+gated"
        else:
            rank_label = "live"
        lines.append("  - name: %s" % e["name"])
        lines.append("    namespace: %s" % e["namespace"])
        lines.append("    family: %s" % e["family"])
        if e["subgroup"]:
            lines.append("    subgroup: %s" % e["subgroup"])
        lines.append("    status: %s" % e["status"])
        if e["modifiers"]:
            lines.append("    modifiers: [%s]" % ", ".join(e["modifiers"]))
        lines.append("    rank: %s" % rank_label)
        lines.append("    zh: %s" % yq(e["zh"]))
        lines.append("    value_type: %s" % yq(out_value_type(e["name"], e["family"])))
        lines.append("    declared:")
        for d in e["declared"]:
            lines.append("      - %s" % d)
        lines.append("    declared_value: %s" % yq(e["declared_value"]))
        lines.append("    consumers: %d" % e["consumers"])
        if e["consumed_by"]:
            lines.append("    consumed_by:   # 全部消费位置（按次数降序）")
            for item in e["consumed_by"]:
                lines.append("      - { path: %s, count: %d }" % (yq(item["path"]), item["count"]))
        else:
            lines.append("    consumed_by: []")
        lines.append("    in_repo: %s" % ("true" if e["in_repo"] else "false"))
        if e["runtime"]:
            lines.append("    note: 由 shiki 运行时读取 CSS 变量消费；CSS var() 扫描看不见 → 探测盲区，不是 gated")
        elif "gated" in e["modifiers"]:
            lines.append("    note: 宿主在元素级重声明同名变量（gradient-shadow-text.css:31-40 一类），body 级写入被子元素覆盖")
        elif e["status"] == "dead":
            lines.append("    note: 宿主声明但无任何消费方（死名）")
        lines.append("")
    with open(OUT_YAML, "w", encoding="utf-8") as f:
        f.write("\n".join(lines).rstrip() + "\n")

    # ---------- HTML ----------
    def esc(s):
        return str(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

    CSS = """
:root{--bg:#0f1115;--panel:#161a20;--panel2:#1c2128;--line:#2a313a;--fg:#e6e9ef;--fg2:#a9b2bf;--fg3:#7d8794;--accent:#7aa2ff;--good:#5bd08a;--warn:#f0b24a;--bad:#f2708a;--chip:#222a34}
@media (prefers-color-scheme:light){:root{--bg:#f6f7f9;--panel:#fff;--panel2:#f0f2f5;--line:#dde1e6;--fg:#14181d;--fg2:#4a5360;--fg3:#77808c;--chip:#eceff3}}
*{box-sizing:border-box} body{margin:0;background:var(--bg);color:var(--fg);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;line-height:1.6;font-size:14px}
.wrap{max-width:1280px;margin:0 auto;padding:28px 18px 90px} h1{font-size:22px;margin:0 0 4px}
h2{font-size:17px;margin:32px 0 8px;padding-bottom:6px;border-bottom:1px solid var(--line)}
h3{font-size:14px;margin:18px 0 6px;color:var(--fg2)} h3 .cnt{color:var(--fg3);font-weight:400;font-size:12.5px}
.sub{color:var(--fg2);font-size:13px;margin-bottom:16px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px}
.card{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:12px 14px}
.k{color:var(--fg3);font-size:12px} .v{font-size:22px;font-weight:650}
table{width:100%;border-collapse:collapse;margin:8px 0 4px;font-size:12.5px}
th,td{text-align:left;padding:6px 8px;border-bottom:1px solid var(--line);vertical-align:top}
th{color:var(--fg2);font-weight:600;font-size:12px;background:var(--panel2);position:sticky;top:0}
tr:hover td{background:var(--panel2)}
code{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px;background:var(--chip);padding:1px 4px;border-radius:4px}
.badge{display:inline-block;font-size:11px;padding:1px 7px;border-radius:999px;white-space:nowrap}
.b-live{background:rgba(91,208,138,.15);color:var(--good)} .b-gated{background:rgba(240,178,74,.15);color:var(--warn)}
.b-dead{background:rgba(242,112,138,.15);color:var(--bad)}
.muted{color:var(--fg2)} .note{border-left:3px solid var(--warn);background:rgba(240,178,74,.07);padding:10px 14px;border-radius:0 8px 8px 0;margin:12px 0}
.foot{margin-top:36px;color:var(--fg3);font-size:12px;border-top:1px solid var(--line);padding-top:12px}
"""

    def table_for(items):
        rows = []
        for i, e in enumerate(items, 1):
            mods = (" + " + ",".join(e["modifiers"])) if e["modifiers"] else ""
            cls = "b-gated" if "gated" in e["modifiers"] else ("b-live" if e["status"] == "live" else "b-dead")
            label = e["status"] + mods
            if e["runtime"]:
                cons = "运行时消费（shiki）"
            elif e["consumers"]:
                cons = f"{e['consumers']} 处"
            elif e["in_repo"]:
                cons = "本仓引用"
            else:
                cons = "0"
            ex = "<br>".join(
                esc(it["path"].split("packages/client/")[-1]) + (" ×%d" % it["count"] if it["count"] > 1 else "")
                for it in e["consumed_by"][:3]
            ) or "<span class='muted'>—</span>"
            value = esc(e["declared_value"])
            if len(e["declared_value"]) > 90:
                value = value[:90] + "…"
            rows.append(f"""<tr><td>{i}</td><td><code>{esc(e['name'])}</code></td><td>{esc(e['zh'])}</td>
<td><span class="badge {cls}">{esc(label)}</span></td><td>{cons}</td><td class="muted">{esc(e['declared'][0])}<br>{value}</td><td class="muted" style="font-size:11.5px">{ex}</td></tr>""")
        return ("<table><thead><tr><th>#</th><th>token</th><th>是什么</th><th>状态</th><th>宿主消费</th>"
                "<th>声明位置 / 声明值</th><th>消费方示例</th></tr></thead><tbody>" + "".join(rows) + "</tbody></table>")

    def section(title, items, with_status_split=True):
        if not items:
            return ""
        out = [f"<h2>{esc(title)}（{len(items)} 条）</h2>"]
        if with_status_split:
            live = [e for e in items if e["status"] == "live" and "gated" not in e["modifiers"]]
            gated = [e for e in items if "gated" in e["modifiers"]]
            dead = [e for e in items if e["status"] == "dead"]
            if live:
                out.append(f"<h3>live · 按宿主消费次数降序<span class='cnt'>（{len(live)} 条）</span></h3>")
                out.append(table_for(live))
            if gated:
                out.append(f"<h3>live + gated · 需规则层<span class='cnt'>（{len(gated)} 条）</span></h3>")
                out.append(table_for(gated))
            if dead:
                out.append(f"<h3>dead · 无消费方<span class='cnt'>（{len(dead)} 条）</span></h3>")
                out.append(table_for(dead))
        else:
            out.append(table_for(items))
        return "".join(out)

    def build_html(title, subtitle, items, families):
        parts = [f"<h1>{esc(title)}</h1><div class='sub'>{subtitle}</div>"]
        c_live = sum(1 for e in items if e["status"] == "live" and "gated" not in e["modifiers"])
        c_gated = sum(1 for e in items if "gated" in e["modifiers"])
        c_dead = sum(1 for e in items if e["status"] == "dead")
        parts.append(f"""<div class="grid">
<div class="card"><div class="k">token</div><div class="v">{len(items)}</div></div>
<div class="card"><div class="k">live</div><div class="v" style="color:var(--good)">{c_live}</div></div>
<div class="card"><div class="k">live + gated</div><div class="v" style="color:var(--warn)">{c_gated}</div></div>
<div class="card"><div class="k">dead</div><div class="v" style="color:var(--bad)">{c_dead}</div></div>
</div>""")
        parts.append("""<div class="note"><b>排序原则</b>：同族相邻 → 同子组相邻 → 状态分组（live 按宿主消费次数降序、gated 次之、dead 最后）。
每个 token 显式带 status / modifiers 标签。与 <code>palette/tokens.yaml</code> 完全同序。</div>""")
        for fam in families:
            fitems = [e for e in items if e["family"] == fam]
            if not fitems:
                continue
            if fam == "alias":
                for sg in ALIAS_SUBORDER:
                    sitems = [e for e in fitems if e["subgroup"] == sg]
                    if sitems:
                        parts.append(section("alias · " + GROUP_ZH.get(sg, sg), sitems))
            elif fam == "static":
                for sg in STATIC_FAM_ORDER:
                    sitems = [e for e in fitems if e["subgroup"] == sg]
                    if sitems:
                        parts.append(section("static · " + STATIC_FAM_ZH.get(sg, sg), sitems))
            else:
                zh = {"specific": "specific · 区域特化", "shiki": "shiki · 代码高亮",
                      "focus": "focus · 焦点环", "menu_color": "menu · 菜单材质（颜色）",
                      "menu": "menu · 菜单其它", "shadow": "shadow · 阴影",
                      "elevation": "elevation · 材质阴影", "gradient": "gradient · 渐变",
                      "linear": "linear · 线性渐变", "typography": "typography · 排印",
                      "radius": "radius · 圆角", "corner": "corner · 角形状",
                      "mask": "mask · 蒙层", "dsh": "dsh · 运行期字族/字号/滚动条"}.get(fam, fam)
                parts.append(section(zh, fitems))
        parts.append("<div class='foot'>生成脚本：<code>scripts/research/gen_token_registry.py</code> · 数据源：宿主源码 @687f282（0.2.1-rc.2）· 与 <code>palette/tokens.yaml</code> 同序 · 会话 #147</div>")
        return ("<!DOCTYPE html><html lang='zh-CN'><head><meta charset='utf-8'>"
                "<meta name='viewport' content='width=device-width, initial-scale=1'>"
                f"<title>{esc(title)}</title><style>{CSS}</style></head><body><div class='wrap'>"
                + "".join(parts) + "</div></body></html>")

    color_families = [f for f in FAMILY_ORDER if f in COLOR_FAMILIES]
    with open(OUT_COLOR_HTML, "w", encoding="utf-8") as f:
        f.write(build_html("颜色轴 222 个 token 逐条清单",
                           "排序：同族 → 同子组 → live（消费次数降序）→ gated → dead；状态标签逐条标注",
                           color, color_families))
    with open(OUT_ALL_HTML, "w", encoding="utf-8") as f:
        f.write(build_html("宿主 token 425 全量逐条清单",
                           "全量 425 = --dsw 403 + --shiki 11 + --dsh 11；含排印 182、圆角 6、形状 1、蒙层 1、菜单 2",
                           entries, FAMILY_ORDER))

    print(json.dumps({
        "total": len(entries), "namespaces": dict(ns),
        "live": stats["live"], "dead": stats["dead"],
        "color_total": len(color),
        "color_live": color_stats["live"], "color_dead": color_stats["dead"],
        "color_gated": color_gated,
        "yaml": OUT_YAML, "color_html": OUT_COLOR_HTML, "all_html": OUT_ALL_HTML,
    }, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
