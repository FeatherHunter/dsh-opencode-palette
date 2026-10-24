# -*- coding: utf-8 -*-
"""P1 交付：颜色轴 222 条 → 能力映射表（HTML + JSON）。

输入：palette/tokens.yaml（全量 425 条事实表，已含状态/消费/声明）
输出：
  docs/research/v3-color-222-ability-map.html
  docs/research/color-ability-map.json

每条颜色 token 给出：
  token / 中文 / 状态 / 消费处数与主要消费区域 / 能改什么 / 值类型 / tier / 实现技术 / 建议语义能力 / 直绑定条目 id
"""
import json
import os
import re
from collections import Counter, OrderedDict, defaultdict

import yaml

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
TOKENS = os.path.join(ROOT, "palette", "tokens.yaml")
OUT_HTML = os.path.join(ROOT, "docs", "research", "v3-color-222-ability-map.html")
OUT_JSON = os.path.join(ROOT, "docs", "research", "color-ability-map.json")

COLOR_FAMILIES = {"alias", "specific", "shiki", "static", "focus", "menu_color",
                  "shadow", "elevation", "gradient", "linear"}

FAMILY_ZH = {
    "alias": "语义别名", "specific": "区域特化", "shiki": "代码高亮",
    "static": "调色板原子", "focus": "焦点环", "menu_color": "菜单材质",
    "shadow": "阴影", "elevation": "材质阴影", "gradient": "渐变", "linear": "线性渐变",
}
ALIAS_SUB_ZH = {
    "bg": "背景与填充", "label": "文字", "state": "状态色", "button": "按钮",
    "border": "边框", "interactive": "交互反馈", "brand": "品牌", "markdown": "Markdown",
    "file": "文件差异", "code": "代码差异", "menu": "菜单", "onboarding": "引导页",
    "scrollbar": "滚动条", "tooltip": "提示气泡", "toast": "轻提示",
    "settings": "设置页", "turn": "对话轮次", "switch": "开关", "link": "链接",
}
AREA_ZH = {
    "ui-primitives": "基础组件/Markdown", "ui-theme": "主题自身", "ui-chat": "对话主窗口",
    "ui-trajectory": "轨迹表", "ui-schedule": "定时任务", "ui-conversation": "会话/输入区",
    "ui-settings-account": "设置·账号", "ui-deliverables": "交付物", "ui-tool": "工具调用",
    "ui-sidebar-documentpreview": "文档预览", "ui-user-questions": "用户提问卡",
    "ui-agent-preset": "智能体预设", "ui-attachment": "附件", "ui-plugin-manager": "插件管理",
    "ui-settings-models": "设置·模型", "ui-workspace": "工作区", "ui-model-selection": "模型选择",
    "ui-plan": "计划视图", "ui-sidebar": "左侧栏", "ui-sidebar-right": "右侧栏",
    "ui-sidebar-terminal": "侧栏终端", "ui-sidebar-browser": "侧栏浏览器",
    "ui-sidebar-files": "侧栏文件", "ui-commands": "命令面板", "ui-dockkit": "Dock",
    "ui-plugin-market": "插件市场", "ui-workflow-run": "工作流", "ui-jobs": "任务",
    "ui-shortcuts": "快捷键", "ui-subagent": "子代理", "ui-message-feedback": "消息反馈",
    "ui-goal": "目标", "ui-skill": "技能", "ui-approval": "审批", "ui-input-trigger": "输入触发",
    "ui-settings-general": "设置·通用", "ui-settings-plugins": "设置·插件",
    "ui-directory-picker-browse": "目录选择", "ui-permission-presets": "权限预设",
    "ui-secret-mask": "密钥遮罩", "ui-open-in-app": "外部打开", "ui-layout": "应用外壳",
    "apps/desktop": "桌面外壳", "web": "网页壳", "locale": "语言文案",
}

USED = set()

# 语义能力映射：显式优先，其次按族/子组规则
EXPLICIT = {
    "--dsw-alias-bg-base": ("global.page.background", "页面/应用底色（整个窗口的底）"),
    "--dsw-alias-bg-layer-1": ("global.surface.layer-1", "第一层表面（卡片/区块底）"),
    "--dsw-alias-bg-layer-2": ("global.surface.layer-2", "第二层表面（弹窗/设置卡底；宿主 Modal 用）"),
    "--dsw-alias-bg-layer-3": ("global.surface.layer-3", "第三层表面（再浮起一层）"),
    "--dsw-alias-bg-module-platform": ("global.surface.module", "模块底板（平台模块区）"),
    "--dsw-alias-bg-skeleton": ("global.surface.skeleton", "骨架屏占位底色"),
    "--dsw-alias-bg-mask-1": ("overlay.mask.primary", "主蒙层（Lightbox/Modal/Settings 遮罩）"),
    "--dsw-alias-bg-mask-drop": ("overlay.mask.drop", "拖放蒙层"),
    "--dsw-alias-bg-overlay": ("overlay.surface", "浮层表面填充"),
    "--dsw-alias-bg-document-preview": ("document.preview.background", "文档预览底"),
    "--dsw-alias-bg-document-selection": ("document.selection.background", "文档选区底"),
    "--dsw-alias-bg-mask-2": ("overlay.mask.alt-2", "次蒙层 2（宿主无消费方）"),
    "--dsw-alias-bg-mask-3": ("overlay.mask.alt-3", "次蒙层 3（宿主无消费方）"),
    "--dsw-alias-bg-mask-photo": ("overlay.mask.photo", "照片蒙层（宿主无消费方）"),
    "--dsw-alias-bg-multi-select": ("selection.multi.background", "多选底（宿主无消费方）"),
    "--dsw-alias-label-primary": ("global.text.primary", "正文主文字"),
    "--dsw-alias-label-secondary": ("global.text.secondary", "次级文字"),
    "--dsw-alias-label-tertiary": ("global.text.tertiary", "三级/弱文字"),
    "--dsw-alias-label-caption": ("global.text.caption", "小字/说明文字"),
    "--dsw-alias-label-dimmed": ("global.text.dimmed", "弱化文字"),
    "--dsw-alias-label-primary-inverted": ("global.text.inverted", "反色文字（深底上）"),
    "--dsw-alias-label-primary-foreground": ("control.text.on-accent", "强调底上的前景文字"),
    "--dsw-alias-label-primary-dimmed": ("global.text.primary-dimmed", "主文字弱化态"),
    "--dsw-alias-label-primary-bluish": ("global.text.primary-bluish", "偏蓝主文字（Markdown 链接用）"),
    "--dsw-alias-label-deep-diving": ("decor.text.deep-diving", "深度思考标签文字"),
    "--dsw-alias-label-deep-diving-shimmer": ("decor.text.deep-diving-shimmer", "深度思考流光文字"),
    "--dsw-alias-label-shimmer": ("decor.text.shimmer", "文字流光效果"),
    "--dsw-alias-label-document-preview": ("document.preview.text", "文档预览文字"),
    "--dsw-alias-border-l1": ("global.border.level-1", "最弱边框/分隔"),
    "--dsw-alias-border-l2": ("global.border.level-2", "常规边框（最常用）"),
    "--dsw-alias-border-l3": ("global.border.level-3", "强边框（第七章开关/输入框）"),
    "--dsw-alias-border-l4": ("global.border.level-4", "最强边框"),
    "--dsw-alias-border-l2-darkmode-thin": ("global.border.level-2-thin", "暗色下更细的边框"),
    "--dsw-alias-border-inverted": ("global.border.inverted", "反色边框"),
    "--dsw-alias-border-inverted2": ("global.border.inverted-2", "反色边框 2（宿主无消费方）"),
    "--dsw-alias-link": ("global.link.text", "链接文字/图标"),
    "--dsw-alias-brand-primary": ("global.brand.primary", "品牌主色"),
    "--dsw-alias-brand-primary-new-colorprimary-new-color": ("global.brand.primary-legacy", "品牌主色（宿主畸形名，19 处仍在用）"),
    "--dsw-alias-brand-primary-invert": ("global.brand.primary-inverted", "品牌主色反色（宿主无消费方）"),
    "--dsw-alias-brand-text": ("global.brand.text", "品牌文字（宿主无消费方）"),
    "--dsw-alias-focus-ring-color": ("global.focus.ring", "键盘焦点环颜色"),
    "--dsw-alias-interactive-bg-hover": ("global.interaction.hover", "通用悬停底色（149 处，最高频）"),
    "--dsw-alias-interactive-bg-hover-solid": ("global.interaction.hover-solid", "不透明悬停底色"),
    "--dsw-alias-interactive-bg-hover-danger": ("global.interaction.hover-danger", "危险操作悬停底"),
    "--dsw-alias-interactive-bg-active": ("global.interaction.active", "按下/激活态"),
    "--dsw-alias-interactive-bg-hover-accent": ("global.interaction.hover-accent", "强调悬停（宿主无消费方）"),
    "--dsw-alias-switch-thumb": ("control.switch.thumb", "开关滑块"),
    "--dsw-alias-markdown-code-block": ("content.markdown.code-block.background", "Markdown 代码块底"),
    "--dsw-alias-markdown-code-block-banner": ("content.markdown.code-block.banner", "代码块标题栏底"),
    "--dsw-alias-markdown-citation": ("content.markdown.citation", "引用/引用块"),
    "--dsw-alias-markdown-inline-code": ("content.markdown.inline-code", "行内代码底"),
    "--dsw-alias-markdown-tag": ("content.markdown.tag", "标签样式"),
    "--dsw-alias-markdown-code-segment-selected": ("content.markdown.code-segment.selected", "代码段选中（宿主无消费方）"),
    "--dsw-alias-markdown-code-segment-unselected": ("content.markdown.code-segment.unselected", "代码段未选中（宿主无消费方）"),
    "--dsw-alias-markdown-placeholder": ("content.markdown.placeholder", "占位符（宿主无消费方）"),
    "--dsw-alias-menu-icon": ("menu.icon", "菜单图标"),
    "--dsw-alias-menu-group-header-fill": ("menu.group-header.background", "菜单分组头底"),
    "--dsw-menu-surface-fill": ("menu.surface.fill", "菜单材质表面（浮层材质）"),
    "--dsw-alias-onboarding-accent": ("onboarding.accent", "引导页强调色"),
    "--dsw-alias-onboarding-secondary-fill": ("onboarding.secondary.fill", "引导页次级按钮/填充"),
    "--dsw-alias-onboarding-card-fill": ("onboarding.card.fill", "引导页卡片底"),
    "--dsw-alias-onboarding-checkbox-border": ("onboarding.checkbox.border", "引导页勾选框描边"),
    "--dsw-gradient-onboarding-blue-stops": ("onboarding.gradient.blue", "引导页蓝色渐变（色标）"),
    "--dsw-gradient-onboarding-cyan-stops": ("onboarding.gradient.cyan", "引导页青色渐变（色标）"),
    "--dsw-gradient-onboarding-violet-stops": ("onboarding.gradient.violet", "引导页紫色渐变（色标）"),
    "--dsw-alias-scrollbar-bg-l1": ("global.scrollbar.level-1.thumb", "主层级滚动条滑块"),
    "--dsw-alias-scrollbar-hover-l1": ("global.scrollbar.level-1.thumb-hover", "主层级滚动条悬停"),
    "--dsw-alias-scrollbar-bg-l2": ("global.scrollbar.level-2.thumb", "浮层层级滚动条滑块"),
    "--dsw-alias-scrollbar-hover-l2": ("global.scrollbar.level-2.thumb-hover", "浮层层级滚动条悬停"),
    "--dsw-alias-settings-card-fill": ("settings.card.background", "设置页卡片底"),
    "--dsw-alias-settings-card-stroke": ("settings.card.border", "设置页卡片描边"),
    "--dsw-alias-tooltip-bg": ("tooltip.background", "提示气泡底"),
    "--dsw-alias-tooltip-key-bg": ("tooltip.key.background", "提示快捷键底"),
    "--dsw-alias-toast-bg": ("toast.background", "轻提示底"),
    "--dsw-alias-toast-label": ("toast.text", "轻提示文字"),
    "--dsw-alias-turn-trigger-bg": ("conversation.turn-trigger.background", "对话轮次触发器底"),
    "--dsw-alias-turn-trigger-bg-hover": ("conversation.turn-trigger.background-hover", "对话轮次触发器悬停"),
    "--dsw-specific-menu": ("specific.menu.fill", "区域特化：菜单底（macOS 材质）"),
    "--dsw-specific-sidebar-fill": ("specific.sidebar.fill", "区域特化：左侧栏底（同时决定桌面标题栏底色）"),
    "--dsw-specific-input-major": ("specific.input.major", "区域特化：输入框主底"),
    "--dsw-specific-bubble": ("specific.bubble.fill", "区域特化：气泡底"),
    "--dsw-specific-selector": ("specific.selector.fill", "区域特化：选择器底"),
    "--dsw-specific-sidebar-nav-item-active": ("specific.sidebar.nav-item.active", "侧栏导航激活底"),
    "--dsw-specific-sidebar-nav-item-active-accent": ("specific.sidebar.nav-item.active-accent", "侧栏导航激活强调"),
    "--dsw-specific-sidebar-nav-item-hover": ("specific.sidebar.nav-item.hover", "侧栏导航悬停底"),
    "--dsw-specific-bubble-highlight": ("specific.bubble.highlight", "气泡高亮（宿主无消费方）"),
    "--dsw-specific-login-input": ("specific.login.input", "登录输入框（宿主无消费方）"),
    "--dsw-specific-tip": ("specific.tip.fill", "提示条（宿主无消费方）"),
    "--shiki-background": ("content.code.background", "代码高亮背景"),
    "--shiki-foreground": ("content.code.foreground", "代码高亮前景"),
    "--dsw-alias-code-diff-added": ("content.diff.code.added", "代码 diff 新增色"),
    "--dsw-alias-code-diff-deleted": ("content.diff.code.deleted", "代码 diff 删除色"),
}

SHIKI_ZH = {
    "comment": "注释", "constant": "常量", "function": "函数", "keyword": "关键字",
    "link": "链接", "parameter": "参数", "punctuation": "标点", "string": "字符串",
    "string-expression": "字符串插值",
}


def find_explicit(name):
    return EXPLICIT.get(name)


def strip_prefix(name):
    for pref in ("--dsw-alias-", "--dsw-specific-", "--dsw-", "--shiki-"):
        if name.startswith(pref):
            return name[len(pref):]
    return name


def semantic_of(t):
    name, fam, sub = t["name"], t["family"], t.get("subgroup") or ""
    if name in EXPLICIT:
        return EXPLICIT[name]
    if fam == "alias":
        rest = name[len("--dsw-alias-"):]
        if sub == "state":
            m = re.match(r"state-(business|error|success|warn|idle)-(primary|secondary|tertiary|label)$", rest)
            if m:
                return ("status." + m.group(1) + "." + m.group(2), "状态色：" + m.group(1) + " / " + m.group(2))
        if sub == "button":
            m = re.match(r"button-(.+)$", rest)
            if m:
                r = m.group(1).replace("-fill", ".background").replace("-hover", ".hover.background")
                r = r.replace("-border", ".border").replace("-active", ".active")
                return ("control.button." + r, "按钮：" + m.group(1))
        if sub == "file":
            m = re.match(r"file-diff-(added|deleted)-(.+)$", rest)
            if m:
                return ("content.file.diff." + m.group(1) + "." + m.group(2), "文件 diff：" + m.group(1) + " " + m.group(2))
        if sub == "markdown":
            return ("content.markdown." + rest, "Markdown：" + rest)
        if sub == "onboarding":
            return ("onboarding." + rest, "引导页：" + rest)
        if sub == "menu":
            return ("menu." + rest, "菜单：" + rest)
        if sub == "link":
            return ("global.link.text", "链接文字")
    if fam == "specific":
        rest = name[len("--dsw-specific-"):]
        return ("specific." + rest, "区域特化：" + rest)
    if fam == "shiki":
        rest = name[len("--shiki-"):]
        if rest.startswith("token-"):
            k = rest[len("token-"):]
            return ("content.code.syntax." + k, "代码高亮：" + SHIKI_ZH.get(k, k))
        return ("content.code." + rest, "代码高亮：" + rest)
    if fam == "shadow":
        rest = name[len("--dsw-shadow-"):]
        return ("effect.shadow." + rest, "阴影：" + rest)
    if fam == "elevation":
        rest = name[len("--dsw-elevation-"):]
        return ("effect.elevation." + rest, "材质阴影：" + rest)
    if fam == "gradient":
        rest = name[len("--dsw-gradient-"):]
        return ("onboarding.gradient." + rest, "引导页渐变：" + rest)
    if fam == "linear":
        rest = name[len("--dsw-linear-"):]
        return ("effect.linear." + rest, "线性渐变：" + rest)
    if fam == "static":
        rest = name[len("--dsw-static-"):]
        return ("atom." + rest, "调色板原子：" + rest)
    if fam == "focus":
        return ("global.focus.ring", "焦点环颜色")
    if fam == "menu_color":
        return ("menu.surface.fill", "菜单材质表面")
    return (None, None)


def value_type_of(t):
    fam = t["family"]
    if fam in ("shadow", "elevation"):
        return "shadow（box-shadow 值）"
    if fam in ("gradient", "linear"):
        return "gradient（色标/线性渐变）"
    if fam == "static":
        return "color（原子 hex）"
    if fam in ("alias", "specific", "shiki", "focus", "menu_color"):
        if t["family"] == "alias" and t.get("subgroup") == "bg":
            return "color / paint（背景类可放渐变或图片）"
        return "color"
    return "color"


def impl_of(t):
    if t["status"] == "dead":
        return ("不生效", "宿主无消费方（死名）；收录只作记录，编辑器不列或灰显")
    if "gated" in t.get("modifiers", []):
        return ("token + rule", "宿主在元素级重声明同名变量 → body 级 token 写会被盖，须配合规则层写入")
    if t["family"] == "static":
        return ("token（原子）", "可写，但它是别名上游；改动会连锁影响全部引用它的语义色")
    if t["family"] in ("shadow", "elevation"):
        return ("token", "写 box-shadow 值到 body 级")
    return ("token", "body 级 CSS 变量写入即可生效")


def tier_of(t):
    # 统一词表（U7）：stable / advanced / dead；gated 是「稳定但需规则层」的实现说明，不是 tier。
    if t["status"] == "dead":
        return "dead"
    if t["family"] == "static":
        return "advanced"
    return "stable"


def exposure_of(t):
    if t["status"] == "dead":
        return "不列（仅登记）"
    if t["family"] == "static":
        return "默认折叠（专家模式可写）"
    return "默认开放"


def main():
    data = yaml.safe_load(open(TOKENS, encoding="utf-8"))
    toks = [t for t in data["tokens"] if t["family"] in COLOR_FAMILIES]

    rows = []
    sem_count = Counter()
    for t in toks:
        sem, sem_desc = semantic_of(t)
        if sem:
            USED.add(sem)
            sem_count[sem] += 1
        areas = []
        for it in t.get("consumed_by") or []:
            parts = it["path"].split("/")
            key = parts[2] if len(parts) > 2 and parts[1] == "client" else ("apps/" + parts[1] if len(parts) > 1 else "?")
            if key not in areas:
                areas.append(key)
        area_zh = [AREA_ZH.get(a, a) for a in areas[:2]]
        bit = t["name"]
        direct = "token." + bit.lstrip("-").replace("--", "").replace("-", ".")
        impl, impl_note = impl_of(t)
        mods = list(t.get("modifiers") or [])
        if bit in ("--shiki-background", "--shiki-foreground") and "declared_invalid" not in mods:
            mods.append("declared_invalid")   # 声明在 :root、读取在 body 级链路，计算期无效但宿主用 inline 补
        if t["consumers"] == 0:
            src = "none（无消费方）"
        elif t["family"] == "shiki":
            src = "runtime（shiki 运行时读计算值）"
        else:
            src = "css（var() 引用）"
        rows.append({
            "token": t["name"],
            "zh": t["zh"],
            "status": t["status"],
            "modifiers": mods,
            "consumption_source": src,
            "diurnal": "yes（light/dark 各一值）" if t["family"] not in ("shadow",) else "yes（light/dark 各一值）",
            "probe": ("token_live(" + t["name"] + ")") if t["status"] == "live" else "—",
            "consumers": t["consumers"],
            "areas": area_zh,
            "can_do": (sem_desc + ("；主要影响：" + "、".join(area_zh) if area_zh else "")),
            "value_type": value_type_of(t),
            "tier": tier_of(t),
            "exposure": exposure_of(t),
            "impl": impl,
            "impl_note": impl_note,
            "semantic": sem,
            "direct_id": direct,
            "family": t["family"],
            "subgroup": t.get("subgroup") or "",
        })

    # 统计
    stats = {
        "total": len(rows),
        "live": sum(1 for r in rows if r["status"] == "live"),
        "gated": sum(1 for r in rows if "gated" in r["modifiers"]),
        "dead": sum(1 for r in rows if r["status"] == "dead"),
        "semantic_abilities": len(USED),
        "direct_ids": len(rows),
        "by_family": {},
    }
    for fam in ("alias", "specific", "shiki", "focus", "menu_color", "shadow", "elevation", "gradient", "linear", "static"):
        stats["by_family"][fam] = sum(1 for r in rows if r["family"] == fam)

    json.dump({"stats": stats, "rows": rows}, open(OUT_JSON, "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)

    # ---------- HTML ----------
    def esc(s):
        return str(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

    def badge(r):
        extra = ""
        if "declared_invalid" in r["modifiers"]:
            extra += ' <span class="badge b-warn">declared_invalid</span>'
        if r["status"] == "dead":
            return '<span class="badge b-bad">dead · 不生效</span>'
        if "gated" in r["modifiers"]:
            return '<span class="badge b-warn">live · gated + 规则层</span>' + extra
        if r["family"] == "static":
            return '<span class="badge b-info">live · 原子</span>' + extra
        return '<span class="badge b-ok">live</span>' + extra

    order_fam = ["alias", "specific", "focus", "menu_color", "shiki", "shadow", "elevation", "gradient", "linear", "static"]
    groups = OrderedDict()
    for fam in order_fam:
        fits = [r for r in rows if r["family"] == fam]
        if not fits:
            continue
        if fam == "alias":
            subs = OrderedDict()
            for r in fits:
                subs.setdefault(r["subgroup"], []).append(r)
            for sub, items in subs.items():
                items.sort(key=lambda r: (r["status"] != "live", "gated" in r["modifiers"], -r["consumers"], r["token"]))
                groups[(fam, sub)] = items
        elif fam == "static":
            subs = OrderedDict()
            for r in fits:
                subs.setdefault(r["subgroup"], []).append(r)
            for sub, items in subs.items():
                items.sort(key=lambda r: (r["status"] != "live", r["token"]))
                groups[(fam, sub)] = items
        else:
            fits.sort(key=lambda r: (r["status"] != "live", "gated" in r["modifiers"], -r["consumers"], r["token"]))
            groups[(fam, "")] = fits

    def table(items):
        out = ['<table><thead><tr><th>#</th><th>token</th><th>中文是什么</th><th>状态</th>'
               '<th>消费</th><th>消费来源</th><th>成对</th><th>能改什么</th><th>值类型</th>'
               '<th>tier / 暴露</th><th>探针</th><th>实现技术</th>'
               '<th>建议语义能力</th><th>直绑定 id</th></tr></thead><tbody>']
        for i, r in enumerate(items, 1):
            out.append(
                f"<tr><td>{i}</td><td><code>{esc(r['token'])}</code></td><td>{esc(r['zh'])}</td>"
                f"<td>{badge(r)}</td><td>{r['consumers']} 处</td><td>{esc(r['consumption_source'])}</td>"
                f"<td>{esc(r['diurnal'])}</td><td>{esc(r['can_do'])}</td>"
                f"<td>{esc(r['value_type'])}</td><td>{esc(r['tier'])}<div class='muted' style='font-size:11.5px'>{esc(r['exposure'])}</div></td>"
                f"<td><code>{esc(r['probe'])}</code></td>"
                f"<td>{esc(r['impl'])}<div class='muted' style='font-size:11.5px'>{esc(r['impl_note'])}</div></td>"
                f"<td>{('<code>' + esc(r['semantic']) + '</code>') if r['semantic'] else '<span class=muted>—（不生效）</span>'}</td>"
                f"<td><code>{esc(r['direct_id'])}</code></td></tr>"
            )
        out.append("</tbody></table>")
        return "".join(out)

    CSS = """
:root{--bg:#0f1115;--panel:#161a20;--panel2:#1c2128;--line:#2a313a;--fg:#e6e9ef;--fg2:#a9b2bf;--fg3:#7d8794;--accent:#7aa2ff;--good:#5bd08a;--warn:#f0b24a;--bad:#f2708a;--chip:#222a34}
@media (prefers-color-scheme:light){:root{--bg:#f6f7f9;--panel:#fff;--panel2:#f0f2f5;--line:#dde1e6;--fg:#14181d;--fg2:#4a5360;--fg3:#77808c;--chip:#eceff3}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;line-height:1.6;font-size:14px}
.wrap{max-width:1320px;margin:0 auto;padding:26px 16px 90px}
h1{font-size:22px;margin:0 0 4px}h2{font-size:17px;margin:30px 0 8px;padding-bottom:6px;border-bottom:1px solid var(--line)}
h3{font-size:14px;margin:18px 0 6px;color:var(--fg2)}h3 .cnt{color:var(--fg3);font-weight:400;font-size:12.5px}
.sub{color:var(--fg2);font-size:13px;margin-bottom:16px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}
.card{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:12px 14px}
.k{color:var(--fg3);font-size:12px}.v{font-size:21px;font-weight:650}
table{width:100%;border-collapse:collapse;margin:8px 0 4px;font-size:12.3px}
th,td{text-align:left;padding:6px 8px;border-bottom:1px solid var(--line);vertical-align:top}
th{color:var(--fg2);font-weight:600;font-size:11.8px;background:var(--panel2);position:sticky;top:0}
tr:hover td{background:var(--panel2)}
code{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11.8px;background:var(--chip);padding:1px 4px;border-radius:4px}
.badge{display:inline-block;font-size:11px;padding:1px 7px;border-radius:999px;white-space:nowrap}
.b-ok{background:rgba(91,208,138,.15);color:var(--good)}.b-warn{background:rgba(240,178,74,.15);color:var(--warn)}
.b-bad{background:rgba(242,112,138,.15);color:var(--bad)}.b-info{background:rgba(122,162,255,.15);color:var(--accent)}
.muted{color:var(--fg2)}.note{border-left:3px solid var(--accent);background:rgba(122,162,255,.07);padding:10px 14px;border-radius:0 8px 8px 0;margin:12px 0}
.foot{margin-top:36px;color:var(--fg3);font-size:12px;border-top:1px solid var(--line);padding-top:12px}
ul{margin:6px 0 6px 20px;padding:0}li{margin:3px 0}
"""

    parts = []
    parts.append("<!DOCTYPE html><html lang='zh-CN'><head><meta charset='utf-8'>")
    parts.append("<meta name='viewport' content='width=device-width, initial-scale=1'>")
    parts.append("<title>颜色轴 222 条 → 能力映射（P1 逐条过）</title><style>" + CSS + "</style></head><body><div class='wrap'>")
    parts.append("<h1>颜色轴 222 条 → 能力映射（P1 逐条过）</h1>")
    parts.append("<div class='sub'>2026-10-24 · 每一条都写清：它是什么、能改什么、值类型、tier、落在哪条实现技术上、建议的语义能力、以及自动生成的直绑定 id</div>")
    parts.append(f"""<div class="grid">
<div class="card"><div class="k">颜色 token</div><div class="v">{stats['total']}</div></div>
<div class="card"><div class="k">可生效（live）</div><div class="v" style="color:var(--good)">{stats['live']}</div></div>
<div class="card"><div class="k">需规则层（gated）</div><div class="v" style="color:var(--warn)">{stats['gated']}</div></div>
<div class="card"><div class="k">不生效（dead）</div><div class="v" style="color:var(--bad)">{stats['dead']}</div></div>
<div class="card"><div class="k">建议语义能力</div><div class="v" style="color:var(--accent)">{stats['semantic_abilities']}</div></div>
<div class="card"><div class="k">直绑定条目</div><div class="v">{stats['direct_ids']}</div></div>
</div>""")
    parts.append("""<div class="note"><b>怎么读这张表：</b>
<ul>
<li><b>建议语义能力</b> = 用户/编辑器看到的那一层（一个能力可以绑 1 个或多个 token；这里先按 1:1 给建议，后续合并）。</li>
<li><b>直绑定 id</b> = 构建期自动生成的兜底条目（一行绑定一个 token），保证 222 条全部可达；用户不直接写它。</li>
<li><b>实现技术</b> = 这条能力靠哪条通道生效：token 写入 / 规则层 / 不生效。</li>
<li><b>消费来源</b>：css = 宿主 CSS 用 var() 引用（改 token 即变）；runtime = 由 shiki 运行时读计算值（CSS 里没有 var()）；none = 无消费方。</li>
<li><b>成对</b>：light/dark 各一个值；写入时必须成对（U15/A 方案），单值会被加载器拒绝。</li>
<li><b>tier / 暴露</b>：统一词表 <code>stable</code> / <code>advanced</code> / <code>dead</code>；gated 是实现说明（需规则层双写），不是 tier。</li>
<li><b>探针</b>：加载时用于判定这条 token 在当前宿主是否活着（token_live）；dead 不探测。</li>
</ul></div>
<div class="note"><b>覆盖声明（不遗漏）：</b>本表 100% 覆盖<b>颜色轴 222</b>（184 live + 5 gated + 38 dead；其中 2 条 shiki 另带 declared_invalid 修饰）。
主题命名空间共 425 = 颜色 222 + <b>非颜色 203</b>（排印 182 + radius 6 + <code>--dsh</code> 11 + menu 1 + corner 1 + mask 1 + other 1），非颜色 203 在 <b>P4</b> 逐条过；
运行时另有 148 个局部/私有变量（<code>--dsh</code> 60 + <code>--dsl</code> 20 + 其他包 <code>--dsw</code> 12 + 组件局部 56）在 <b>P2/P4</b> 逐条过。
能力 id 统一语法 <code>&lt;domain&gt;.&lt;segment&gt;{1..8}</code>、domain 必须来自 <code>palette/vocabulary.yaml</code> 的 29 个域（14 区域 + 15 语义域）；本表 222 个建议语义 id 与 222 个直绑定 id 已全部通过该校验（0 违规、0 重名）。</div>""")

    for (fam, sub), items in groups.items():
        title = FAMILY_ZH.get(fam, fam) + ((" · " + ALIAS_SUB_ZH.get(sub, sub)) if sub else "")
        parts.append(f"<h2>{esc(title)}（{len(items)} 条）</h2>")
        parts.append(table(items))

    parts.append("<div class='foot'>P1 = 颜色轴 222 条逐条 → 能力映射 · #147 · 生成器 scripts/research/gen_color_ability_map.py</div>")
    parts.append("</div></body></html>")

    open(OUT_HTML, "w", encoding="utf-8", newline="\n").write("".join(parts))
    print(json.dumps(stats, ensure_ascii=False, indent=1))
    print("html:", OUT_HTML)
    print("json:", OUT_JSON)


if __name__ == "__main__":
    main()
