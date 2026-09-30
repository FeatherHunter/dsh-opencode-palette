# DSH 文字/字号项穷举清单（官方允许修改的每一项回溯到一手来源）

- 版本日期：2026-09-29（Asia/Shanghai）
- DSH 安装根：`D:\DSH NEXT\resources\app`（`package.json: name=dsh-desktop-next, version=2.0.15-next, main=lib/main.js`）
- 本仓：`D:\dsh-plugin\dsh-opencode-palette`（`package.json: name=dsh-opencode-palette, version=2.0.5`）
- 方法：只认一手来源（`README.zh.md` / `lib/*.js` / `lib/*.cjs` / `package.json` / `cordis.patch.yml` 原文）。下文每个结论都标注“文件 + 关键字符串”，不给编造的行号，不引用二手博客。
- 缺失声明：`docs/web-styling.zh.md` 在安装包里不存在（已验证 `D:\DSH NEXT\resources\app\docs\web-styling.zh.md` 与 `node_modules/@deepseek-ai/dsh-client-ui-theme/docs/web-styling.zh.md` 均不存在）。`dsh-client-ui-theme/README.zh.md` 中多处引用 `../../../docs/web-styling.zh.md#...` 与 `../../../.agents/notes/...`，在发布包内无法落点，本文件对相关引用如实标注“源包引用但产物缺失”。

## 目录

- [0. 结论总表](#0-结论总表)
- [A. 官方设置项 ui-theme.fontSize](#a-官方设置项-ui-themefontsize)
- [B. 受 --dsh-content-font-size 直接驱动的每一项](#b-受---dsh-content-font-size-直接驱动的每一项)
- [C. 明确不受官方字号影响的每一类](#c-明确不受官方字号影响的每一类)
- [D. 本仓 opencode-palette 插件第二通道](#d-本仓-opencode-palette-插件第二通道)
- [E. 全局手段的边界](#e-全局手段的边界)
- [附录：grep 统计方法与复现命令](#附录grep-统计方法与复现命令)

## 0. 结论总表

每一行格式：一项文字 | 官方可改否 | 调哪里 | 范围 | 来源。

| # | 一项文字 | 官方可改否 | 调哪里 | 范围 | 来源 |
|---|---|---|---|---|---|
| B1 | Markdown 正文 base（`--dsw-font-markdown-base*`） | 可改 | 设置→通用→字号步进器 `ui-theme.fontSize` → `--dsh-content-font-size` → `--dsh-content-font-delta` | 12~17px，步长1，默认14 | `dsh-client-ui-theme/lib/index.js: FONT_SIZE_MIN/FONT_SIZE_MAX/DEFAULT_FONT_SIZE`；`lib/client.js: --dsw-font-markdown-base:var(--dsh-content-font-size,14px)...` |
| B2 | Markdown 加粗 base-strong | 可改 | 同上 | 同上（字号=设置值，weight 600） | `lib/client.js: --dsw-font-markdown-base-strong:600 var(--dsh-content-font-size,14px)...` |
| B3 | Markdown 斜体 base-italic / strong-italic | 可改 | 同上 | 同上（style italic，字号=设置值） | `lib/client.js: --dsw-font-markdown-base-italic:italic var(--dsh-content-font-size,14px)...`、`--dsw-font-markdown-base-strong-italic:italic 600 var(--dsh-content-font-size,14px)...` |
| B4 | Markdown H1 | 可改 | 同上 | 默认 `21px+delta` / 行高 `30px+delta`（12→19px，17→24px） | `lib/client.js: --dsw-font-markdown-h1:700 calc(21px + var(--dsh-content-font-delta))...` |
| B5 | Markdown H2 | 可改 | 同上 | 默认 `19px+delta` / `28px+delta` | `lib/client.js: --dsw-font-markdown-h2:700 calc(19px + var(--dsh-content-font-delta))...` |
| B6 | Markdown H3 | 可改 | 同上 | 默认 `18px+delta` / `26px+delta` | `lib/client.js: --dsw-font-markdown-h3:700 calc(18px + var(--dsh-content-font-delta))...` |
| B7 | Markdown H4 | 可改 | 同上 | 字号直接=设置值，行高 `24px+delta` | `lib/client.js: --dsw-font-markdown-h4:600 var(--dsh-content-font-size,14px) / calc(24px + var(--dsh-content-font-delta))...` |
| B8 | Markdown 表格 table | 可改（低一档） | 同上经 `--dsh-content-font-size-secondary` | 默认13px；`<=14时设置值-1`，`>14时设置值-2` | `lib/client.js: --dsw-font-markdown-table:var(--dsh-content-font-size-secondary,13px)/calc(22px + var(--dsh-content-font-delta-secondary,0px))...` |
| B9 | Markdown 表头 table-head | 可改（低一档） | 同上 | 同 B8（weight 500） | `lib/client.js: --dsw-font-markdown-table-head:500 var(--dsh-content-font-size-secondary,13px)...` |
| B10 | Secondary 低一档正文（compactionTitle/retryRow/source/summary/hint/flowItem/timeStart 等） | 可改（低一档） | 同上 | 默认13px，同 B8 公式 | `dsh-client-ui-chat/lib/client.js: .VnbZpq_compactionTitle{font-size:var(--dsh-content-font-size-secondary,13px)` 等 18 处；`dsh-client-ui-conversation/lib/client.js: .JdJrwG_trigger{...font-size:var(--dsh-content-font-size-secondary,13px)`；`dsh-client-ui-tool/lib/client.js: .WXmFEW_summary{...font-size:var(--dsh-content-font-size-secondary,13px)` 等 |
| B11 | 用户气泡正文（`VnbZpq_bubble`） | 可改（全档） | 同上 | 字号=设置值，行高 `22px+delta` | `dsh-client-ui-chat/lib/client.js: .VnbZpq_bubble{...font-size:var(--dsh-content-font-size,14px);line-height:calc(22px + var(--dsh-content-font-delta,0px))` |
| B12 | Composer 卡片/草稿（`Q7WfXG_card`） | 可改（全档） | 同上 | 字号=设置值，行高 `24px+delta` | `dsh-client-ui-conversation/lib/client.js: Q7WfXG_card{...font-size:var(--dsh-content-font-size,14px);line-height:calc(24px + var(--dsh-content-font-delta,0px))` |
| B13 | 流内行标题/摘要/表格低一档再 -1（`RPey8G_trigger`、`K-8v-a_root`、`jo426G_timeEnd`） | 可改（低两档） | 同上 | `calc(var(--dsh-content-font-size-secondary,13px) - 1px)`，默认12px | `dsh-client-ui-chat/lib/client.js: .RPey8G_trigger{...font-size:calc(var(--dsh-content-font-size-secondary,13px) - 1px)`；`.K-8v-a_root{...font-size:calc(var(--dsh-content-font-size-secondary,13px) - 1px)`；`.jo426G_timeEnd{font-size:calc(var(--dsh-content-font-size-secondary,13px) - 1px)` |
| B14 | 文件差异统计低一档再 -2（`WXmFEW_diffStat`） | 可改（低三档） | 同上 | `calc(var(--dsh-content-font-size-secondary,13px) - 2px)`，默认11px，`var(--ds-font-family-code)` | `dsh-client-ui-tool/lib/client.js: .WXmFEW_diffStat{font-family:var(--ds-font-family-code);font-size:calc(var(--dsh-content-font-size-secondary,13px) - 2px)` |
| C1 | 工作区/侧栏/文件列表/会话行（`ozLDBG_*`、`SJMXQW_*`） | 不可改 | 无官方字号入口；硬编码 | 10/12/13/14px 固定 | `dsh-client-ui-workspace/lib/client.js: .ozLDBG_title{...font-size:14px`、`.ozLDBG_searchResultSnippet{...font-size:12px`、`.ozLDBG_time{...font-size:10px`、`.SJMXQW_searchInput{...font-size:13px`、`.SJMXQW_sessionOverflowButton{...font-size:12px` 等（该文件 `font-size:12px×10、14px×5、13px×5、10px×1`） |
| C2 | 会话行 hover 浮层标题/时间/路径/状态 | 不可改 | 硬编码 | 14/12px 固定 | `dsh-client-ui-workspace/lib/client.js: .ozLDBG_hoverTitle{...font-size:14px`、`.ozLDBG_hoverPath{...font-size:12px`、`.ozLDBG_hoverTime{...font-size:12px`、`.ozLDBG_hoverStatus{...font-size:12px` |
| C3 | 设置面板自身（通用外壳+外观/字号行文案） | 不可改 | 硬编码（字号行只改会话，不改自己） | 标题14px、描述12px、值/单位14px | `dsh-client-ui-theme/lib/client.js: .RpkBcW_title{...font-size:14px`、`.RpkBcW_desc{...font-size:12px`、`.RpkBcW_value{...font-size:14px`、`.RpkBcW_unit{...font-size:14px`、`.OlZvdG_title{...font-size:14px`；`dsh-client-ui-settings-general/lib/client.js: .MI-_Aa_trigger{...font-size:14px`、`.MI-_Aa_navTitle{...font-size:16px`、`.MI-_Aa_navCell{...font-size:14px` |
| C4 | Toast / Tooltip 文字 | 不可改 | 只有颜色 token，无字号变量 | — | `dsh-client-ui-theme/lib/client.js: --dsw-alias-toast-bg/--dsw-alias-toast-label/--dsw-alias-tooltip-bg/--dsw-alias-tooltip-key-bg`（README 亦称“系统提示使用 --dsw-alias-toast-bg 和 --dsw-alias-toast-label…Tooltip 键帽使用 --dsw-alias-tooltip-key-bg”）；该包内无 `toast{font-size:var(--dsh-content...}` 命中 |
| C5 | 菜单图标 | 不可改（仅颜色可主题化） | 图标尺寸 prop，非字号 | `size: 14` 固定；颜色 `--dsw-alias-menu-icon` | `dsh-client-ui-settings-general/lib/client.js: IconCloseOutlineRegular, { size: 14 }`、`IconDownloadOutlineRegular, { size: 14 }`（另有 `size: 14` 字面）；`dsh-client-ui-theme/README.zh.md: 菜单图标使用 --dsw-alias-menu-icon` |
| C6 | Scrollbar 滚动条 | 不可改 | 几何变量，与字号无关 | `--dsh-scrollbar-width:5px`，thumb/border/track-margin | `dsh-client-ui-theme/lib/client.js: --dsh-scrollbar-width:5px`；README：`scrollbar.css 在 body 上把 --dsh-scrollbar-thumb 与 --dsh-scrollbar-thumb-hover 绑定到 l1…WebKit 系浏览器默认使用 5px 的 --dsh-scrollbar-width` |
| C7 | 小号文本 small 全系 | 不可改（固定） | 硬编码 | 固定 `12px/20px` | `dsh-client-ui-theme/lib/client.js: --dsw-font-markdown-small:12px/20px...`、`--dsw-font-markdown-small-font-size:12px`（+strong/italic 变体同为12px） |
| C8 | 代码 code / code-block / code-block-small | 不可改（固定） | 硬编码 | code `12px/19px`、code-block `11px/19px`、code-block-small `11px/16px`，`var(--ds-font-family-code)` | `dsh-client-ui-theme/lib/client.js: --dsw-font-markdown-code:12px/19px...`、`--dsw-font-markdown-code-block:11px/19px...`、`--dsw-font-markdown-code-block-small:11px/16px...` |
| C9 | 静态阶梯（xl-24/l-20/m-18/base-16/s-14/xs-13/xxs-12） | 不可改 | 硬编码 | 24/20/16/14/13/12px 固定 | `dsh-client-ui-theme/lib/client.js: --dsw-font-xl-24:600 24px/32px...`、`--dsw-font-l-20:500 20px/28px...`、`--dsw-font-s-14:14px/22px...`、`--dsw-font-xs-13:13px/20px...`、`--dsw-font-xxs-12:12px/18px...` 等 |
| C10 | 品牌字（Montserrat）/普通界面字体栈 | 不可改（字号项不含字体选择） | 字体文件+栈，与字号旋钮无关 | — | `dsh-client-ui-theme/lib/client.js (base.css): --dsw-font-family:-apple-system, BlinkMacSystemFont, "Segoe UI"...`、`--dsw-font-family-brand:"Montserrat"...`、`--ds-font-family-code:"SF Mono", "JetBrains Mono"...`；`lib/styles/brand-font.css + montserrat-*.woff2`；README：`普通界面保留系统字体栈` / `普通界面仍使用系统字体栈` |
| C11 | shiki 语法色 | 不可改 | 仅颜色 | — | `dsh-client-ui-theme/README.zh.md: shiki.css 负责语法颜色` |
| C12 | Elevation/阴影/菜单毛玻璃 | 不可改 | 非文字 | — | `lib/client.js (gradient-shadow-text.css): --dsw-shadow-lv1/--dsw-elevation-panel/--dsw-menu-backdrop-filter:blur(40px) saturate(150%)` |
| P1 | 插件通道：正文字体栈 `--dsw-font-family` | 插件可改（官方通道之外） | 插件面板→字体字号→正文样式/字号/代码字体 | `mode=mono` 时=代码栈，`mode=tui` 时=`SANS_STACK` | `src/engine/generate.mjs: buildTypographyCss: '--dsw-font-family:' + bodyFont`；`bodyFont = mode === 'mono' ? codeFont : SANS_STACK` |
| P2 | 插件通道：代码字体栈 `--ds-font-family-code` | 插件可改 | 同上（`fontKey` 预设或本机族名） | 预设 `FONTS` 或 `quoteFontFamily(fontKey)+FONTS['JetBrains Mono']` | `src/engine/generate.mjs: codeFontStack(fontKey)`、`'--ds-font-family-code:' + codeFont`；`src/engine/map-dsh.mjs: FONTS`；`src/engine/font-names.mjs: quoteFontFamily` |
| P3 | 插件通道：代码块 `--dsw-font-markdown-code-block` | 插件可改 | 同上（`size`） | `(size-2)px/(size+6)px`，size 默认13→11px/19px | `src/engine/generate.mjs: '--dsw-font-markdown-code-block:' + (size - 2) + 'px/' + (size + 6) + 'px...'` |
| P4 | 插件通道：正文 `--dsw-font-markdown-base`（+font-size/line-height） | 插件可改 | 同上 | `size px / (size+9)px` | `src/engine/generate.mjs: '--dsw-font-markdown-base:' + size + 'px/' + lh + 'px...'`、`lh = size + 9` |
| P5 | 插件通道：H1 | 插件可改（固定覆盖） | 同上（不跟 size） | 固定 `700 16px/24px` | `src/engine/generate.mjs: '--dsw-font-markdown-h1:700 16px/24px...'` |
| P6 | 插件通道：H2 | 插件可改（固定覆盖） | 同上 | 固定 `700 15px/22px` | `src/engine/generate.mjs: '--dsw-font-markdown-h2:700 15px/22px...'` |
| P7 | 插件通道：H3 | 插件可改（固定覆盖） | 同上 | 固定 `600 14px/21px` | `src/engine/generate.mjs: '--dsw-font-markdown-h3:600 14px/21px...'` |
| P8 | 插件通道：小号 `--dsw-font-markdown-small`（+font-size/line-height） | 插件可改 | 同上 | `(size-1)px/(size+7)px`（small+8） | `src/engine/generate.mjs: small = size - 1`、`'--dsw-font-markdown-small:' + small + 'px/' + (small + 8) + 'px...'` |
| P9 | 插件通道：`body{font-size}` | 插件可改 | 同上 | `size px`（默认13px） | `src/engine/generate.mjs: 'body{font-size:' + size + 'px;}'` |

计数：官方可改 **14 项**（B1~B14）/ 官方不可改 **12 项**（C1~C12）/ 插件通道 **9 项**（P1~P9）。合计 35 行。

---

## A. 官方设置项 ui-theme.fontSize

### A1. 字段名、命名空间、类型/步长/上下限/默认值

一手来源：

- `node_modules/@deepseek-ai/dsh-client-ui-theme/lib/index.js`（host 入口，schema 即真相）：
  - 关键片段：
    - `const THEME_SETTINGS_NAMESPACE = "ui-theme"`
    - `const FONT_SIZE_FIELD = "fontSize"`
    - `const FONT_SIZE_MIN = 12`
    - `const FONT_SIZE_MAX = 17`
    - `const DEFAULT_FONT_SIZE = 14`
    - `z.object({ [THEME_PREFERENCE_FIELD]: z.union([...THEME_PREFERENCES]).default(DEFAULT_PREFERENCE), [FONT_SIZE_FIELD]: z.number().step(1).min(12).max(17).default(14) })`
    - `const Config = z.object({ preference: ...volatile(), fontSize: z.number().step(1).min(12).max(17).default(14).volatile() })`
- `node_modules/@deepseek-ai/dsh-client-ui-theme/lib/client.js`（浏览器入口，同 schema 复述）：
  - 关键片段：`[FONT_SIZE_FIELD]: Schema.number().step(1).min(12).max(17).default(14)`
  - 初始 store：`createFontSizeRowStore(): init: () => ({ fontSize: 14, revision: -1 })`
  - 步进器守卫：`disabled: fontSize >= 17`（加）、`disabled: fontSize <= 12`（减）、`setFontSize(fontSize + 1)` / `setFontSize(fontSize - 1)`
- `node_modules/@deepseek-ai/dsh-client-ui-theme/README.zh.md`：
  - 关键片段：`把会话正文字号设为 12 至 17 px`
  - 关键片段：`步进器接受 12 至 17 px 的整数，默认值为 14 px`
  - 关键片段：`它以相同增量调整会话标题与基础文本，包括用户气泡与 composer 草稿；流内行的标题、摘要与表格跟随比正文低一档的字号，小号文本和代码保持固定字号`

结论：命名空间 `ui-theme`，字段 `fontSize`（同包另有 `preference: light|dark|system`，默认 `system`），类型整数 number，步长 1，最小 12，最大 17，默认 14。`preference` 与 `fontSize` 是该包拥有的仅有的两个持久偏好。

### A2. 持久化路径（Host settings API / $DSH_HOME / cordis.patch.yml / localStorage 差异）

一手来源：

- `dsh-client-ui-theme/README.zh.md`：
  - `回环客户端把两个值存入 ui-theme 设置命名空间，本地提供方默认将其持久化到 $DSH_HOME/cordis.patch.yml`
  - `每次通过的变更都经 Host settings API 写入。连续快速变更按操作顺序携带命名空间 revision 串行写入，最新写入被拒时重新加载持久值`
  - `非 loopback 页面把两个选择都保留在进程内`
  - `在 loopback 浏览器上，服务先以 schema 默认值立即提供自身，随后加载 ui-theme 命名空间，并把每次通过的主题或字号变更经 Host settings API 写入。收到推送的设置变更时或重连后都会重新拉取该命名空间。非 loopback 页面不会创建该 Host-backed scope`
- `dsh-client-ui-theme/lib/client.js`：
  - `createFontSizeRowStore / createAppearanceRowStore` 的 `sync: (d, fontSize, revision) => { if (revision <= d.revision) return; ... }` 即“携带命名空间 revision 串行写入”客户端侧。
- 路径差异需如实记录的不一致：
  - README 写的是 `$DSH_HOME/cordis.patch.yml`。
  - 但 `D:\DSH NEXT\resources\app\lib\main.js` 实际读取的是 `join(this.home, "profiles", profile, "cordis.patch.yml")`（`resolve(profile, fallback)` 中 `readPrivateFile(join(this.home, "profiles", profile, "cordis.patch.yml"))`），恢复入口另有 `join(home, "settings.yaml")` 与 `join(directory, "cordis.patch.yml")`（`open-settings-document / open-profile-patch`）。即 Desktop 实际按 profile 落盘，README 的 `$DSH_HOME/cordis.patch.yml` 是“本地提供方默认”简化说法，取证时以代码为准。
  - `D:\DSH NEXT\resources\app\cordis.patch.yml` 与 `host.cordis.patch.yml` 本体与字号无关（前者仅 `ui-sidebar-browser / desktop-next-capabilities / computer-use`，后者仅 `webserver host/port`），故字号持久化不在安装根这两个文件，而在用户数据目录的 profile patch。
- 本仓插件对比（非官方）：
  - `runtime/client.mjs: const STORAGE_KEY = 'dsh.opencode-palette.v2'`、`const LEGACY_STORAGE_KEY = 'dsh.opencode-tui-theme.v2'`、`loadState()/saveState()` 读写 `localStorage`。这是纯浏览器 `localStorage` 通道，与官方 Host settings 通道互不相通。

结论：loopback 回环浏览器 → Host settings API → 本地文件（README 称 `$DSH_HOME/cordis.patch.yml`，代码实为 `$DSH_HOME/profiles/<profile>/cordis.patch.yml` + `settings.yaml`）；非 loopback（远程浏览器）→ 仅进程内，不创建 Host-backed scope，不跨重启。插件第二通道另走 `localStorage`，见 D 节。

### A3. 设置面板位置（通用分区外观行 + 字号步进器）

一手来源：

- `dsh-client-ui-theme/README.zh.md`：`用户从设置（「通用」分区）的两行中切换配色方案与正文字号`；`插件在「通用」分区注册外观偏好方块与字号步进器`
- `dsh-client-ui-theme/lib/client.js`：
  - `Appearance preference row registered into the General section item slot`
  - `Font-size preference row registered into the General section item slot: title + body-text-only description + stepper pill (centered value; hover reveals the up/down arrow column anchored to the pill's right edge) + a px unit label after the pill`
  - 样式：`.RpkBcW_stepper{...min-width:72px;height:36px...}`、`.RpkBcW_value{...font-size:14px...}`、`.RpkBcW_unit{...font-size:14px...}`（面板自身的字号是硬编码，见 C3）
- `dsh-client-ui-settings-general/README.zh.md`：
  - `「通用」分区承载内置的代码工作工具行与当前版本行，以及功能包注册进 settings.general.item 的行。每个注册方拥有自己的行文案与行为。例如「外观」行位于 ui-theme`
  - `用户通过侧边栏底部的 Settings 控件进入外壳`

结论：入口为侧边栏底部 Settings → 通用分区 → 外观行（light/dark/system 三方块）+ 字号行（title + description + stepper pill + px 单位）。拥有方是 `dsh-client-ui-theme`，外壳是 `dsh-client-ui-settings-general`。

### A4. bootThemeBodyScript 首帧行为

一手来源：`dsh-client-ui-theme/lib/index.js` 全文（`boot-theme.js` 段）：

- `function bootThemeBodyScript(preference, fontSize)` 返回：
  - `document.documentElement.dataset.dsThemeSource = preference`
  - `document.body.toggleAttribute('data-ds-dark-theme', dark)`（其中 `system` 经 `matchMedia('(prefers-color-scheme: dark)')` 解析）
  - `document.body.style.setProperty('--dsh-content-font-size', `${fontSize}px`)`
- `function bootThemeInjections(preference = DEFAULT_PREFERENCE, fontSize = 14)` 返回 `[{kind:"style", text: bootThemeStyle(preference)}, {kind:"script", placement:"body", text: bootThemeBodyScript(...)}]`
- `apply(ctx, config)` 中 `ctx.on("webserver/index-inject", (table) => { table.push(...bootThemeInjections(config.preference.get(), config.fontSize.get())) }, { prepend: true })`
- README 对应句：`当主机组合包含 HTTP 服务器时，宿主侧会把已注册的 ui-theme 设置或 schema 默认值嵌入每份 index 响应。head CSS 会在任何脚本运行前选择文档画布的配色方案…随后，body 脚本会在加载页面和应用脚本之前设置 body[data-ds-dark-theme] 与 --dsh-content-font-size，因此首帧绘制就采用所选调色板与字号`

结论：首帧=宿主在每次 index 响应注入 head style（画布底色，防闪白）+ body script（调色板选择器 + `--dsh-content-font-size: <N>px` 内联写在 `document.body.style`）。客户端 presenter 之后接管，但首帧已正确。

---

## B. 受 --dsh-content-font-size 直接驱动的每一项

总公式（`dsh-client-ui-theme/lib/client.js` 内 `gradient-shadow-text.css` 编译后全文，变量名保留原文）：

- `body{--dsh-content-font-delta:calc(var(--dsh-content-font-size,14px) - 14px);`
- `--dsh-content-font-size-secondary:min(calc(var(--dsh-content-font-size,14px) - 1px), max(13px, calc(var(--dsh-content-font-size,14px) - 2px)));`
- `--dsh-content-font-delta-secondary:calc(var(--dsh-content-font-size-secondary) - 13px);`

语义：`delta = 设置值 - 14`；`secondary = min(设置值-1, max(13, 设置值-2))`，即设置 `<=14` 时 `设置值-1`，`>14` 时 `设置值-2`；默认 14→13px。README 原话：`它同时派生低一档变量 --dsh-content-font-size-secondary（设置 ≤14 时为设置值 −1，>14 时为设置值 −2；默认设置下为 13 px）及配套的 --dsh-content-font-delta-secondary`。

### B1~B3. base / base-strong / base-italic

- 来源：`dsh-client-ui-theme/lib/client.js`：
  - `--dsw-font-markdown-base:var(--dsh-content-font-size,14px) / calc(24px + var(--dsh-content-font-delta)) var(--dsw-font-family)`
  - `--dsw-font-markdown-base-font-size:var(--dsh-content-font-size,14px)`、`--dsw-font-markdown-base-line-height:calc(24px + var(--dsh-content-font-delta))`
  - `--dsw-font-markdown-base-strong:600 var(--dsh-content-font-size,14px) / calc(24px + var(--dsh-content-font-delta)) ...`
  - `--dsw-font-markdown-base-italic:italic var(--dsh-content-font-size,14px) / calc(24px + var(--dsh-content-font-delta)) ...`
  - `--dsw-font-markdown-base-strong-italic:italic 600 var(--dsh-content-font-size,14px) / calc(24px + var(--dsh-content-font-delta)) ...`
- 效果：12→12px/22px 行高，14→14px/24px，17→17px/27px。

### B4~B7. h1~h4

- 来源同上：
  - `--dsw-font-markdown-h1:700 calc(21px + var(--dsh-content-font-delta)) / calc(30px + var(--dsh-content-font-delta)) ...`（12→19px，17→24px）
  - `--dsw-font-markdown-h2:700 calc(19px + var(--dsh-content-font-delta)) / calc(28px + var(--dsh-content-font-delta)) ...`
  - `--dsw-font-markdown-h3:700 calc(18px + var(--dsh-content-font-delta)) / calc(26px + var(--dsh-content-font-delta)) ...`
  - `--dsw-font-markdown-h4:600 var(--dsh-content-font-size,14px) / calc(24px + var(--dsh-content-font-delta)) ...`（h4 字号直接等于设置值）
- README 佐证：`并以该增量移动 Markdown 标题与基础文本阶梯`

### B8~B9. table / table-head

- 来源同上：
  - `--dsw-font-markdown-table:var(--dsh-content-font-size-secondary,13px)/calc(22px + var(--dsh-content-font-delta-secondary,0px)) var(--dsw-font-family)`
  - `--dsw-font-markdown-table-head:500 var(--dsh-content-font-size-secondary,13px)/calc(22px + var(--dsh-content-font-delta-secondary,0px)) ...`
- 效果：走低一档，默认 13px/22px。

### B10. secondary 低一档正文群

直接消费 `--dsh-content-font-size-secondary` 的会话/工具/侧栏类（穷举代表，非全量粘贴；全量见附录复现命令）：

- `dsh-client-ui-chat/lib/client.js`：
  - `.VnbZpq_compactionTitle{font-size:var(--dsh-content-font-size-secondary,13px);line-height:calc(24px + var(--dsh-content-font-delta,0px))`
  - `.VnbZpq_retryRow{...font-size:var(--dsh-content-font-size-secondary,13px);line-height:calc(20px + var(--dsh-content-font-delta-secondary,0px))}`
  - `.VnbZpq_retryDetails{...font-size:var(--dsh-content-font-size-secondary,13px);line-height:calc(18px + var(--dsh-content-font-delta-secondary,0px))}`
  - `._7xilXq_source{...font-size:var(--dsh-content-font-size-secondary,13px)`、`._48RFeq_summary{...font-size:var(--dsh-content-font-size-secondary,13px);line-height:calc(20px + var(--dsh-content-font-delta-secondary,0px))`
  - `.V0s2hW_hint{...font-size:var(--dsh-content-font-size-secondary,13px);line-height:calc(18px + var(--dsh-content-font-delta-secondary,0px))}`
  - `.jo426G_timeStart{font-size:var(--dsh-content-font-size-secondary,13px);line-height:calc(24px + var(--dsh-content-font-delta,0px))`
- `dsh-client-ui-conversation/lib/client.js`：
  - `.JdJrwG_trigger{...font-size:var(--dsh-content-font-size-secondary,13px);...line-height:calc(20px + var(--dsh-content-font-delta-secondary,0px))}`
- `dsh-client-ui-tool/lib/client.js`：
  - `.WXmFEW_summary{...font-size:var(--dsh-content-font-size-secondary,13px);line-height:calc(24px + var(--dsh-content-font-delta,0px))}`
  - `.MISisG_title{font-size:var(--dsh-content-font-size-secondary,13px);line-height:calc(24px + var(--dsh-content-font-delta,0px))}`
- `dsh-client-ui-sidebar-files / sidebar-right / workflow-run / trajectory / skill / goal / layout / sidebar-documentpreview` 亦各有 1~7 处 `dsh-content-font-size-secondary` 引用（见附录包级计数）。

### B11. 用户气泡

- `dsh-client-ui-chat/lib/client.js`：
  - `.VnbZpq_bubble{...font-size:var(--dsh-content-font-size,14px);line-height:calc(22px + var(--dsh-content-font-delta,0px));...padding:10px 16px}`
- README 佐证：`用户气泡与 composer 草稿直接读取正文字号变量对`

### B12. composer 草稿/卡片

- `dsh-client-ui-conversation/lib/client.js`：
  - `Q7WfXG_card{...font-size:var(--dsh-content-font-size,14px);line-height:calc(24px + var(--dsh-content-font-delta,0px));...}`
- README 佐证同 B11。另 `IS3SeW_root{font-size:var(--dsh-content-font-size,14px);line-height:calc(24px + var(--dsh-content-font-delta,0px))}`（会话正文根）、`FPhpOa_title{...font-size:var(--dsh-content-font-size,14px)`（流内标题行，全档）亦直接读正文字号。

### B13~B14. 流内低一档再 -1 / -2

- `dsh-client-ui-chat/lib/client.js`：
  - `.RPey8G_trigger{...font-size:calc(var(--dsh-content-font-size-secondary,13px) - 1px);...line-height:calc(24px + var(--dsh-content-font-delta,0px))}`（默认 12px）
  - `.K-8v-a_root{...font-size:calc(var(--dsh-content-font-size-secondary,13px) - 1px);line-height:calc(20px + var(--dsh-content-font-delta-secondary,0px))}`
  - `.jo426G_timeEnd{font-size:calc(var(--dsh-content-font-size-secondary,13px) - 1px)`（结束时间比开始时间小 1px）
- `dsh-client-ui-tool/lib/client.js`：
  - `.WXmFEW_diffStat{font-family:var(--ds-font-family-code);font-size:calc(var(--dsh-content-font-size-secondary,13px) - 2px);...}`（默认 11px）
- README 对这类阶梯的定性：`流内行的标题及摘要读取低一档变量对`；`供表格变体与比正文低一档的流内行使用`。

### gradient-shadow-text.css 的 delta 公式全文（去转义后）

> `body{--dsh-content-font-delta:calc(var(--dsh-content-font-size,14px) - 14px);--dsh-content-font-size-secondary:min(calc(var(--dsh-content-font-size,14px) - 1px), max(13px, calc(var(--dsh-content-font-size,14px) - 2px)));--dsh-content-font-delta-secondary:calc(var(--dsh-content-font-size-secondary) - 13px);...}`（后接 h1~code-block-small 定义，见 B1~B9 quote）

---

## C. 明确不受官方字号影响的每一类

原则：凡 `font-size:<N>px` 硬编码、或只消费颜色/elevation/scrollbar token 而无 `dsh-content-font-*` 引用的类，均不受 `ui-theme.fontSize` 影响。以下每类均给硬编码 px 证据。

### C1. 工作区/侧栏/文件列表/会话行

- `dsh-client-ui-workspace/lib/client.js`（该文件 `font-size` 21 处，分布 `12px×10、14px×5、13px×5、10px×1`）：
  - `.ozLDBG_searchResultTitle{...font-size:14px` / `.ozLDBG_searchResultSnippet{...font-size:12px` / `.ozLDBG_title{...font-size:14px` / `.ozLDBG_renameInput{...font-size:14px` / `.ozLDBG_meta{...font-size:12px`
  - `.SJMXQW_searchInput{...font-size:13px` / `.SJMXQW_searchStatus{...font-size:12px` / `.SJMXQW_sessionOverflowButton{...font-size:12px` / `.SJMXQW_empty{...font-size:13px` / `.SJMXQW_emptyState{...font-size:13px` / `.SJMXQW_renameInput{...font-size:14px` / `.SJMXQW_renameError{...font-size:12px`
  - 该包内 `dsh-content-font-size-secondary/delta` 零命中（已验证），故与官方字号完全无关。

### C2. 会话行 hover 浮层

- 同文件：
  - `.ozLDBG_time{...font-size:10px`（会话行时间，唯一 10px）
  - `.ozLDBG_hoverTitle{...font-size:14px` / `.ozLDBG_hoverPath{...font-size:12px` / `.ozLDBG_hoverTime{...font-size:12px` / `.ozLDBG_hoverStatus{...font-size:12px`

### C3. 设置面板自身

- `dsh-client-ui-theme/lib/client.js`：
  - `.RpkBcW_title{...font-size:14px` / `.RpkBcW_desc{...font-size:12px` / `.RpkBcW_value{...font-size:14px` / `.RpkBcW_unit{...font-size:14px` / `.OlZvdG_title{...font-size:14px` / `.OlZvdG_themeCube{...font-size:14px`
- `dsh-client-ui-settings-general/lib/client.js`：
  - `.MI-_Aa_trigger{...font-size:14px` / `.MI-_Aa_navTitle{...font-size:16px` / `.MI-_Aa_navCell{...font-size:14px` / `.CFhF9W_title{font-size:14px}` / `.CFhF9W_description{...font-size:12px}` / `.hMlBZa_row{...font-size:14px}`
- 结论：字号步进器调的是会话，面板自己的 14/12/16px 不动。

### C4. toast / tooltip

- `dsh-client-ui-theme/lib/client.js` 内仅颜色 token：
  - `--dsw-alias-toast-bg`、`--dsw-alias-toast-label`、`--dsw-alias-tooltip-bg`、`--dsw-alias-tooltip-key-bg`
- `README.zh.md`：`系统提示使用 --dsw-alias-toast-bg 和 --dsw-alias-toast-label…Tooltip 键帽使用 --dsw-alias-tooltip-key-bg，由各主题的 tooltip 背景派生稍浅的填充`
- 反证：该包 `toast/tooltip` 附近无 `font-size:var(--dsh-content...` 引用；`tooltip 6 处、toast 4 处`命中均为颜色/结构，非字号。

### C5. 菜单图标 14px

- `dsh-client-ui-settings-general/lib/client.js`：`IconCloseOutlineRegular, { size: 14 }`、`IconDownloadOutlineRegular, { size: 14 }`
- `dsh-client-ui-theme/README.zh.md`：`菜单图标使用 --dsw-alias-menu-icon：浅色模式为 neutral-bluish 800，深色模式为 label-primary-dimmed`（只定义颜色，不定义尺寸）

### C6. scrollbar

- `dsh-client-ui-theme/lib/client.js (scrollbar.css)`：`--dsh-scrollbar-width:5px`、`--dsh-scrollbar-thumb`、`--dsh-scrollbar-thumb-hover`、`--dsh-scrollbar-thumb-border`、`--dsh-scrollbar-track-margin`
- README：`scrollbar.css 在 body 上把 --dsh-scrollbar-thumb 与 --dsh-scrollbar-thumb-hover 绑定到 l1 基础表面 token…WebKit 系浏览器默认使用 5px 的 --dsh-scrollbar-width`
- 另 `dsh-client-ui-conversation/README` 提及 `为 composer 席位消费 --dsh-scrollbar-width`（消费宽度，不消费字号）。

### C7~C8. small / code 固定字号（官方明确“保持固定”字样）

- README 原话：`紧凑的小号文本与代码变体保持固定字号`
- `lib/client.js`：
  - `--dsw-font-markdown-small:12px/20px ...`、`--dsw-font-markdown-small-font-size:12px`（strong/italic 变体同 12px）
  - `--dsw-font-markdown-code:12px/19px var(--ds-font-family-code)`、`--dsw-font-markdown-code-block:11px/19px ...`、`--dsw-font-markdown-code-block-small:11px/16px ...`

### C9. 静态阶梯（与设置无关的固定尺度）

- `lib/client.js`：
  - `--dsw-font-xl-24:600 24px/32px...`、`--dsw-font-l-20:500 20px/28px...`、`--dsw-font-m-18:500 16px/28px...`、`--dsw-font-base-16:16px/24px...`、`--dsw-font-s-14:14px/22px...`、`--dsw-font-xs-13:13px/20px...`、`--dsw-font-xxs-12:12px/18px...` 及其 strong 变体。全部无 `var(--dsh-content...)`。

### C10~C12. 品牌字/Shiki/阴影

- 品牌字：`base.css: --dsw-font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", ...`；`--dsw-font-family-brand:"Montserrat", var(--dsw-font-family)`；`--ds-font-family-code:"SF Mono", "JetBrains Mono", ...`；`lib/styles/brand-font.css + montserrat-light/regular/medium.woff2`；README：`普通界面保留系统字体栈`、`Desktop 将同一份样式表、字体和许可证打包，用于欢迎页品牌文字的离线显示；普通界面保留系统字体栈`。
- Shiki：README：`shiki.css 负责语法颜色`；`design-platform.css 还负责代码差异底色的别名及其静态透明度色阶`（颜色，非字号）。
- 阴影/描边/毛玻璃：`--dsw-shadow-lv1/lv2/lv3`、`--dsw-elevation-stroke/panel/prominent/soft`、`--dsw-menu-backdrop-filter:blur(40px) saturate(150%)`。

---

## D. 本仓 opencode-palette 插件第二通道

### D1. state 与 DEFAULT_STATE

- `runtime/client.mjs`：
  - `const STORAGE_KEY = 'dsh.opencode-palette.v2'`
  - `const LEGACY_STORAGE_KEY = 'dsh.opencode-tui-theme.v2'`（旧键命中即迁移到新键）
  - `const DEFAULT_STATE = { enabled: true, theme: 'opencode', mode: 'mono', size: 13, fontKey: 'JetBrains Mono' }`
  - `loadState()`：新键优先，旧键迁移，`{ ...DEFAULT_STATE, ...s }`；`saveState(state)` 写 `localStorage`
- 注意默认 13 与官方默认 14 不同：插件默认还原上游 11px/19px 代码块观感（见 D2 注释）。

### D2. buildTypographyCss 覆盖的 9 个变量

- `src/engine/generate.mjs: export function buildTypographyCss(typography)`：
  - `const size = (typography && typography.size) || 13`
  - `const mode = (typography && typography.mode) || 'mono'`
  - `const fontKey = (typography && typography.fontKey) || 'JetBrains Mono'`
  - `const codeFont = codeFontStack(fontKey)`；`const bodyFont = mode === 'mono' ? codeFont : SANS_STACK`
  - `const lh = size + 9`；`const small = size - 1`
  - 输出（`FONT_FACE_CSS +`）：
    1. `--dsw-font-family:` + bodyFont
    2. `--ds-font-family-code:` + codeFont
    3. `--dsw-font-markdown-code-block:` + `(size-2)px/(size+6)px`（注释：`F4 新卡片字号（DSH 0.1.7 CodeCard .card/.body 只读此变量；size=13 默认恰好还原上游 11px/19px，跟随 11–18 档）`）
    4. `--dsw-font-markdown-base:` + `size px / lh px`（+ `--dsw-font-markdown-base-font-size` / `-line-height`）
    5. `--dsw-font-markdown-h1:700 16px/24px`（+font-size/line-height；固定，不跟 size）
    6. `--dsw-font-markdown-h2:700 15px/22px`（固定）
    7. `--dsw-font-markdown-h3:600 14px/21px`（固定）
    8. `--dsw-font-markdown-small:` + `small px / (small+8)px`（+font-size/line-height）
    9. `body{font-size:` + `size px;}`
- 注入双层（`runtime/client.mjs: createClient(slotTarget) -> apply(ctx)`）：
  - `const theme = ctx.get('theme')`（依赖 `dsh-client-ui-theme` 的 `theme` 服务）
  - `render = renderTheme(safeThemeName(state.theme), { mode: state.mode, size: state.size, fontKey: state.fontKey })`
  - `tokenDispose = theme.overrideTokens('opencode-palette', render.tokens)`（token 层，`{light,dark}` 同值）
  - `<style data-plugin="dsh-opencode-palette">` + `styleTag.textContent = render.css`（style 层，幂等先清后注入；`clearStyle()` 反注册）
- 档位：`runtime/client.mjs` 面板 `[11, 12, 13, 14, 15, 16, 17, 18].map(...)`（8 档，默认 13），比官方 12~17 多出 11 与 18 两档。

### D3. mode mono / tui 差异

- 面板文案（`runtime/client.mjs: I18N`）：
  - `mono: { zh: '全部文字', en: 'All text' }`、`sans: { zh: '仅代码', en: 'Code only' }`、`typography/bodyStyle/fontSize/codeFont`
  - 分段器：`seg(st.mode, [{ value: 'mono', label: tr('mono') }, { value: 'tui', label: tr('sans') }], ...)`。即 UI 第二项 value 为 `'tui'`，label 复用 `sans（仅代码）`。
- 引擎语义（`src/engine/generate.mjs`）：
  - `bodyFont = mode === 'mono' ? codeFont : SANS_STACK`。故 `'tui'` 走 else 分支 = `SANS_STACK`（`src/engine/map-dsh.mjs: SANS_STACK = "'Inter',-apple-system,'BlinkMacSystemFont','Segoe UI','PingFang SC',...`）。
  - 效果：`mono`=正文与代码同用代码栈（全部文字等宽）；`tui`（面板称“仅代码”）=正文回 SANS，仅代码保留 `fontKey` 栈。命名上 `tui` 是历史值，功能等价于 `sans`，取证以代码为准。
- 字体：`codeFontStack(fontKey)` 查 `FONTS` 预设（JetBrains Mono / Cascadia Code / Fira Code / IBM Plex Mono / Maple Mono NF CN / SF Mono 等），任意本机族名经 `quoteFontFamily` 安全包裹后置于默认栈最前；非法名（含 `{};<` 等）落默认栈，绝不拼原始输入进 CSS。

### D4. system 主题只出排印不碰颜色

- `src/engine/index.mjs: renderTheme`：`if (isSystem(name)) { return generateTheme(null, typography || {}, SYSTEM_THEME) }`
- `src/engine/generate.mjs: generateTheme`：`const css = [buildTypographyCss(typography)]; let tokens = {}; if (colors) { tokens = buildTokens(colors); css.push(buildColorCss(colors, tokens)) }`。`colors=null` 时只返回排印 CSS，`tokens={}`。
- 文件头不变式：`// 不变式：输出完全由输入决定（确定性）；system 主题（colors=null）只输出排印，不碰颜色`；`// 总入口：themeName='system' → colors=null`。

---

## E. 全局手段的边界

### E1. 浏览器 zoom（Ctrl +/-/0/wheel）

- 一手来源缺口：安装包 `lib/` 内未提供 zoom 快捷键持久化实现。已查：
  - `lib/main.js`：`zoomFactor` 零命中，`zoom` 仅 4 处且唯一功能性命中是 `const zoom = window.webContents.getZoomFactor()` 用于右键菜单 `Menu.buildFromTemplate(items).popup({ window, x: Math.round(x * zoom), y: Math.round(y * zoom) })`（坐标换算，非字号功能）。
  - `lib/webserver.js`：`zoom` 零命中。
  - `lib/preload-app.cjs` / `lib/preload-shell.cjs`：`zoom` 零命中（preload-app 唯一 `font-size` 1 处与 zoom 无关）。
  - `lib/keybindings.js`：仅快捷键持久化到 `userData/keybindings.json`，无 zoom。
- 结论：Chromium/Electron 原生 `Ctrl +/-/0` 与 `Ctrl+wheel` 缩放仍可用（渲染器级整页缩放，能动“任何文字”包括硬编码 px），但**未在上述一手来源中找到持久化/配置项**，如实记为“未提供”。跨重启是否保留取决于 Chromium 会话行为，不在官方字号承诺内。

### E2. OS 缩放

- 未在安装包上述来源中找到 DSH 自有的 OS 缩放接管；OS 级 DPI/显示缩放作用于整个窗口（含全部硬编码 px），与 DSH 字号旋钮正交。如需作为全局手段使用，以操作系统设置为准，DSH 侧无对应字段。

### E3. CSS zoom 属性为何是唯一能动“任何文字”的

- 实测产物全为 px 体系：全包 `lib/client.js` 69 个包合计约 `5003 个 px、646 处 font-size`（复现命令见附录）；`rem` 命中约 610 处经抽查均为 `remove/removeEventListener/removed` 等英文子串误命中，无 `font-size:<N>rem` 排印用法。上一轮“599px/0rem/56font-size”应为单产物（`dsh-web-frontend/dist/assets/index-*`）口径；本轮在安装包内未找到名为 `dsh-web-frontend` 的独立包/ `dist/assets/index-*`（`node_modules/*dsh-web-frontend*` 无命中，Web 文档由 `lib/web-document.js: serveWebDocument` 从打包 Web 根 serve，`dsh-app://app`），故以全包复测口径为准并保留口径差异说明。
- 在此 px 体系下：`html{font-size}` 只影响 `rem`，对 `px` 文本无效，故调根字号动不了 DSH 文字；而 CSS `zoom` 属性（非标准但 Chromium 支持）按比例缩放布局与 px 文本，是纯 CSS 层唯一能动全部硬编码 px 文字的手段。本仓插件未使用 `zoom`（使用变量覆盖+`body{font-size}`），故插件也动不了 C 类硬编码。
- Electron `zoomFactor` 若由宿主提供本可持久化整页缩放，但如 E1 所示**未提供**，故“全局手段”均在官方承诺之外。

---

## 附录：grep 统计方法与复现命令

以下命令均在 Windows `pwsh` 执行，路径含空格需引号。统计口径为“产物 `lib/client.js` 原文”，避免读源码 `src/` 与产物混淆。

```powershell
# 1) 主题包文件清单
Get-ChildItem 'D:\DSH NEXT\resources\app\node_modules\@deepseek-ai\dsh-client-ui-theme' -Recurse -File |
  Select-Object FullName,Length

# 2) 全包字体变量消费（哪个包读了官方字号）
python -c "
import re,os
root=r'D:\DSH NEXT\resources\app\node_modules\@deepseek-ai'
for d in sorted(os.listdir(root)):
  fp=os.path.join(root,d,'lib','client.js')
  if os.path.exists(fp):
    data=open(fp,encoding='utf-8',errors='ignore').read()
    if 'dsh-content-font-size' in data or 'dsw-font-markdown' in data:
      from collections import Counter
      print(d, dict(Counter(re.findall(r'dsh-content-font-size[a-z\-]*|dsw-font-markdown-[a-z\-]+',data))))
"

# 3) gradient-shadow 公式原文（去转义查看）
python -c "data=open(r'D:\DSH NEXT\resources\app\node_modules\@deepseek-ai\dsh-client-ui-theme\lib\client.js',encoding='utf-8',errors='ignore').read(); idx=data.find('gradient-shadow'); print(repr(data[idx:idx+6000][:6000]))"

# 4) 气泡/草稿/低一档证据
python -c "
import re
for fp,name in [(r'D:\DSH NEXT\resources\app\node_modules\@deepseek-ai\dsh-client-ui-chat\lib\client.js','chat'),(r'D:\DSH NEXT\resources\app\node_modules\@deepseek-ai\dsh-client-ui-conversation\lib\client.js','conv'),(r'D:\DSH NEXT\resources\app\node_modules\@deepseek-ai\dsh-client-ui-tool\lib\client.js','tool')]:
  data=open(fp,encoding='utf-8',errors='ignore').read()
  print('=====',name,'=====')
  [print(m.group(0).replace(chr(10),' ')[:560]+chr(10)+'---') for m in re.finditer(r'.{0,280}dsh-content-font-size.{0,280}',data)]
"

# 5) workspace 硬编码分布
python -c "
import re
data=open(r'D:\DSH NEXT\resources\app\node_modules\@deepseek-ai\dsh-client-ui-workspace\lib\client.js',encoding='utf-8',errors='ignore').read()
from collections import Counter
print(Counter(re.findall(r'font-size:(\d+)px',data)))
print('px',len(re.findall(r'\d+px',data)),'font-size',len(re.findall(r'font-size',data,re.I)))
"

# 6) 全产物 px/rem/font-size 总量（注意 rem 需人工排除 remove* 误命中）
python -c "
import re,os
root=r'D:\DSH NEXT\resources\app\node_modules\@deepseek-ai'
px=rem=fs=0
for d in sorted(os.listdir(root)):
  fp=os.path.join(root,d,'lib','client.js')
  if os.path.exists(fp):
    data=open(fp,encoding='utf-8',errors='ignore').read()
    px+=len(re.findall(r'\d+px',data)); rem+=len(re.findall(r'[0-9.]+rem',data)); fs+=len(re.findall(r'font-size',data,re.I))
print('px',px,'rem(含误命中)',rem,'font-size',fs)
"

# 7) Electron zoom 持久化核查
python -c "
import re
for fp in [r'D:\DSH NEXT\resources\app\lib\main.js', r'D:\DSH NEXT\resources\app\lib\webserver.js']:
  data=open(fp,encoding='utf-8',errors='ignore').read()
  print(fp, 'zoomFactor',len(re.findall(r'zoomFactor',data)), 'zoom',len(re.findall(r'zoom',data,re.I)))
"
python -c "
import re
for fp in [r'D:\DSH NEXT\resources\app\lib\preload-app.cjs', r'D:\DSH NEXT\resources\app\lib\preload-shell.cjs', r'D:\DSH NEXT\resources\app\lib\web-document.js']:
  data=open(fp,encoding='utf-8',errors='ignore').read()
  print(fp, 'zoom',len(re.findall(r'zoom',data,re.I)))
"

# 8) 缺失文件验证
Test-Path 'D:\DSH NEXT\resources\app\docs\web-styling.zh.md'
Test-Path 'D:\DSH NEXT\resources\app\node_modules\@deepseek-ai\dsh-client-ui-theme\docs\web-styling.zh.md'
Get-ChildItem 'D:\DSH NEXT\resources\app\node_modules\*dsh-web-frontend*' -Recurse -ErrorAction SilentlyContinue

# 9) 本仓插件第二通道
Select-String -Path 'D:\dsh-plugin\dsh-opencode-palette\src\engine\generate.mjs' -Pattern 'buildTypographyCss|dsw-font|body\{font-size|size - 2|size \+ 9|small \+ 8'
Select-String -Path 'D:\dsh-plugin\dsh-opencode-palette\runtime\client.mjs' -Pattern 'DEFAULT_STATE|STORAGE_KEY|overrideTokens|styleTag|seg\(st.mode|\[11, 12, 13'
```

复测要点：

- `rem` 必须人工复核：本轮 610 处 `rem` 全为 `removeEventListener/remove/removed/previewColors` 等子串，无排印 `font-size:..rem`，故“0 个 rem（排印意义）”与上一轮一致，数字差异是匹配口径差异。
- `workspace` 的 `10/12/13/14px` 分布以 `Counter(re.findall(r'font-size:(\d+)px',data))` 为准：`{'12':10,'14':5,'13':5,'10':1}`。
- `dsh-web-frontend/dist/assets/index-*` 在本安装根无独立落点，Web 由 `lib/web-document.js` + `dsh-app://app` 提供；上一轮该口径数字保留但需注明包位置差异。
