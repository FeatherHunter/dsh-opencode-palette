# 双语术语表（版本化单源）

> 地位：判据快照以讨论票正文为首（[#58 定五维 rubric 与术语表](https://github.com/FeatherHunter/dsh-opencode-palette/issues/58)结论节、[#64 执行规格](https://github.com/FeatherHunter/dsh-opencode-palette/issues/64)正文）；本文件是版本化单源，T3–T5 只执行不发明。`CONTEXT.md`（待 `/domain-modeling` 懒创建）只放核心概念＋一行指针，不复制本表。

## 冲突优先级与设门

- 分 artifact 设门：面板键走五维全过；主题名只走准确＋一致；README 散文只走准确＋一致＋语气。主题名无可操作维度。
- 优先级：准确 > 一致 > 可操作 > 长度 > 语气；准确与长度冲突时中英一起重写到装得下，不单语截断。
- 回译分级：A 类（hint/失败态/更新说明/README 断言句）强制双盲回译；B 类（单字按钮/标签）只做术语命中＋占位符检查。`systemDefault` 类漂移属 A 类。
- 长度只定方法：先量真实容器与溢出行为再冻预算；判据为不溢出/不截断/不顶布局/占位符完好。占位符不调序（`trf` 全量替换，与语序无关），英文重写绕开，不改插值逻辑。窄屏只做真实最小宽度冒烟。
- 疑难名阶梯：上游官方 > 社区共识 > 保留英文不生造。
- 词源考据（2026-10-06，四名全过，支撑保留英文）：Solarized＝Ethan Schoonover 原创十六色（摄影 solarization 与日光浴无关，“日光浴”系望文生义，废）；Gruvbox＝morhetz（Pavel Pertsev）“Retro groove for Vim”（groove 指律动/槽纹，“复古凹槽”系音义混译，废）；Ayu＝dempfi 原创亮色主题（单字“鮎”系生造，废）；Flexoki＝Steph Ango “inky scheme for prose and code”（“纸墨”系无共识意译，废）。双搜缺工具（搜索 API 无 key）未做——裁决：保留英文是默认安全态，维持无需转正举证；双搜＋视觉并排转为未来中文提议的 intake 门槛（有提议再测），不 blocking 关票。
- 语气分体裁：面板＝中性工具体（禁最高级/空话/无结果动词）；README＝实证劝服体（好处断言须有事实锚）。对等指信息对等（动作/对象/结果/条件），不强制句式/句数。
- 品牌（2026-10-06 已按上游转正）：中文 `OpenCode调色板`、英文 `OpenCode Palette`；依据 opencode.ai `<title>OpenCode | …`＋description `OpenCode - …` 共 17 处 `OpenCode`、0 处裸 `opencode`（域名/URL 小写为技术规范，非品牌证据）。`OpenCode` 孤例即正体，无需改小写。

## 面板 53 键（`runtime/client.ts`，`{zh,en}` 结构、键名与语言跟随不变）

冻结 42 / 待确认 2（已认可的 defer，占位非终稿）/ 转交 #60 9。上游外迁约 33 条（更新链路＋blocked 9）归上游包内，按地图 out-of-scope 本次不碰。

| key | 定稿 zh | 定稿 en | 状态 |
|---|---|---|---|
| `panelName` | OpenCode调色板 | OpenCode Palette | 冻结（品牌已转正） |
| `subtitle` | 38 款 OpenCode 官方配色主题，点击即切换 | 38 official OpenCode themes — click to switch | 冻结（品牌已转正；面板侧为 trf `{n}` 模板） |
| `enabled` | 已启用 | Enabled | 冻结 |
| `disabled` | 已停用 | Disabled | 冻结 |
| `disableTitle` | 点击停用主题 | Click to disable the theme | 冻结 |
| `enableTitle` | 点击启用主题 | Click to enable the theme | 冻结 |
| `starTitle` | 你的 ⭐是我夜空中最亮的星 🌹 | Star this project on GitHub | 冻结（2026-10-06 漏网补齐：头行 star 图标 `title` 此前硬编码中文未进词典） |
| `issueTitle` | 任何功能需求、故障、建议、意见都可以提ISSUE | Report bugs or request features in Issues | 冻结（同上：issue 图标 `title`） |
| `typography` | 字体字号 | Typography | 冻结 |
| `bodyStyle` | 正文样式 | Body style | 冻结 |
| `mono` | 全部文字 | All text | 冻结 |
| `sans` | 仅代码 | Code only | 冻结 |
| `fontSize` | 字号 | Font size | 冻结 |
| `codeFont` | 代码字体 | Code font | 冻结 |
| `fontNotInstalled` | 本机未装 | Not installed on this machine | 冻结 |
| `fontLocal` | 本地 | Local | 冻结 |
| `fontMono` | 等宽 | Mono | 冻结 |
| `fontPresets` | 常用预设 | Common presets | 冻结 |
| `fontLocals` | 本机字体 | Installed on this machine | 冻结 |
| `fontSearch` | 搜索本机字体… | Search installed fonts… | 冻结 |
| `fontNoMatch` | 没有匹配的字体 | No matching fonts | 冻结 |
| `fontCounting` | 正在读取本机字体… | Reading installed fonts… | 冻结 |
| `fontLoadedCount` | 已读取本机 {n} 款字体 | {n} fonts found on this machine | 冻结 |
| `fontScanFail` | 未能读取本机字体清单，先列出常用预设 | Could not read the font list — showing the common presets | 冻结 |
| `fontScanDenied` | 本机字体访问被拒绝，浏览器地址栏授权后再试；先列出常用预设 | Font access was denied — allow it in the browser address bar, then retry; showing the common presets | 冻结 |
| `fontScanUnsupported` | 当前环境不支持读取本机字体清单，先列出常用预设 | This environment cannot list installed fonts — showing the common presets | 冻结 |
| `fontScanEmpty` | 本机字体清单为空，先列出常用预设 | The font list came back empty — showing the common presets | 冻结 |
| `fontRetry` | 重试 | Retry | 冻结 |
| `themeSection` | 主题 | Themes | 冻结 |
| `themeCount` | 38 款 · 按色系分组 | 38 themes · by color family | 冻结 |
| `search` | 搜索主题… | Search themes… | 冻结 |
| `noMatch` | 未找到匹配的主题 | No matching themes | 冻结 |
| `systemDefault` | system（跟随系统） | system (follow system) | 冻结 |
| `translucentNote` | 透光主题：背景沿用你的 DSH 外观 | Translucent theme: background follows your DSH appearance | 待确认（defer） |
| `group.warm` | —（见主题表分组 9） | —（见主题表分组 9） | 转交#60 |
| `group.yellow-green` | —（见主题表分组 9） | —（见主题表分组 9） | 转交#60 |
| `group.teal` | —（见主题表分组 9） | —（见主题表分组 9） | 转交#60 |
| `group.cyan-blue` | —（见主题表分组 9） | —（见主题表分组 9） | 转交#60 |
| `group.cool-blue` | —（见主题表分组 9） | —（见主题表分组 9） | 转交#60 |
| `group.violet` | —（见主题表分组 9） | —（见主题表分组 9） | 转交#60 |
| `group.neutral` | —（见主题表分组 9） | —（见主题表分组 9） | 转交#60 |
| `group.transparent` | —（见主题表分组 9） | —（见主题表分组 9） | 转交#60 |
| `group.special` | —（见主题表分组 9） | —（见主题表分组 9） | 转交#60 |
| `authorPlugins` | 作者其他插件 | More from the author | 冻结 |
| `authorPluginOpen` | 在新窗口打开 | Open in new window | 冻结 |
| `authorPlugin.skillsDeck` | 装好即自带 25 个工程/效率技能，右侧面板直接调用 | 25 engineering skills built in — call them from the side panel | 冻结 |
| `authorPlugin.prompt` | 保存常用 prompt 预设，一键注入开发任务 | Save your prompt presets, inject them into a dev task with one click | 冻结 |
| `authorPlugin.imCompanion` | （待事实锚）dsh-im 的增强插件，＋具体能力一句话 | (pending fact anchor) Supercharges dsh-im — + one factual capability | 待确认（defer） |
| `logSwitch` | 日志 | Log | 冻结 |
| `logOn` | 开 | On | 冻结 |
| `logOff` | 关 | Off | 冻结 |
| `logSwitchHint` | 打开后把关键节点写入 <DSH_HOME>/logs/dsh-opencode-palette/；warn/error 恒记，不受此开关控制 | Write key nodes to <DSH_HOME>/logs/dsh-opencode-palette/ (for troubleshooting; warn/error lines are always kept) | 冻结 |
| `logSwitchFail` | 日志开关没能写入宿主，请重开面板再试 | The host did not accept the log switch — reopen the panel and retry | 冻结 |

待确认 2 的 defer 含义：`translucentNote` 待 #60 用字统一（透光/透明二选一）；`authorPlugin.imCompanion` 待 `dsh-im-companion` 能力清单事实锚，不编造。

- 2026-10-06 漏网补齐：`starTitle`／`issueTitle` 进词典走 `tr()`；入口 label 语言切换时重注册（宿主只在注册时读 label）；引流外链 `title` 冒号跟随语言（zh 全角 `：`／en 半角 `:`）。

## 自定义主题编辑器 176 键（`runtime/client.ts`，#86 新增 / #95 取色器续增，与代码 I18N 逐行对账）

中文逐字对齐 `prototypes/custom-editor-83.prototype.html`（70 处重写文案照搬，为 #86 首版口径；#92 定稿行以本表与 `src/engine/map-dsh.ts` 实测映射为准）；英文信息对等（动作/对象/结果/条件齐全，不强制同句式）。占位符不调序（`trf` 全量替换）：`{n}`／`{name}`。I18N 串不带首尾空格（mini 长句由 `segJoin` 按语言补连接空格：中文无缝，英文词间空格）。

2026-10-17 #92 命名审查：7 组名、37 个色位名与 37 条作用说明按 DSH token 语义定稿（映射与实测证据见 #92）；下表变更行状态列标「#86 新增，#92 定稿」，其余行维持 #86 原文；code-review 后修订的作用说明同样标 #92 定稿，最终口径以本表为准。

2026-10-17 #95 取色器重构：新增 15 条取色器文案（色相/饱和度/明度/亮度/完成/吸管/对比度/非法 hex/透明度忽略/复制/aria 模板/键盘提示/色彩模型），状态列标「#95 新增」；调色板内不再使用 `edOk`/`edClosePop`（两键当前无消费方；词表按 #86 键集只增不删行，故留存）。

| key | 定稿 zh | 定稿 en | 状态 |
|---|---|---|---|
| `customTitle` | 自定义主题 {n} | Custom themes {n} | #86 新增 |
| `customCopyPath` | 复制配置路径 | Copy config path | #86 新增 |
| `customCopied` | 已复制 | Copied | #86 新增 |
| `customCopyFail` | 复制失败，请手动复制 | Copy failed — please copy it manually | #86 新增 |
| `customOther` | 其他 | Other | #86 新增 |
| `customIpPresets` | IP 预置 | IP presets | IP 预置来源新增 |
| `customChipTitle` | 点击直接换上，不打开编辑 | Click to apply, without opening the editor | #86 新增 |
| `customAdd` | 新增 | New | #86 新增 |
| `customAddTitle` | 新建一个主题 | Create a new theme | #86 新增 |
| `customEdit` | 编辑 | Edit | #86 新增 |
| `customEditTitle` | 修改、删除已有主题 | Edit or delete a saved theme | #86 新增 |
| `customEditEmpty` | 暂无自定义主题，先新增。 | No custom themes yet — create one first. | #86 新增 |
| `customSaveOk` | 已保存 {name} | Saved {name} | #86 新增 |
| `customSaveFail` | 保存失败，再试一次 | Save failed — try again | #86 新增 |
| `customDeleteOk` | 已删除 {name} | Deleted {name} | #86 新增 |
| `customNameRequired` | 主题名称不能为空（保存已拦截）。 | Theme name cannot be empty (save blocked). | #86 新增 |
| `edModeNew` | 新建 | New | #86 新增 |
| `edModeEdit` | 编辑 | Edit | #86 新增 |
| `edEditing` | 正在编辑 · {name} | Editing · {name} | #86 新增 |
| `edTagTitle` | 当前正在编辑这个主题（存盘值） | The theme being edited (saved values) | #86 新增 |
| `edCloseTitle` | 关闭 | Close | #86 新增 |
| `edTargetTitle` | 换一个已存的主题继续改（会先载入它存盘的颜色） | Switch to another saved theme (loads its saved colors) | #86 新增 |
| `edNamePh` | 给主题起个名字 | Name your theme | #86 新增 |
| `edNoName` | 还没起名 | Unnamed yet | #86 新增 |
| `edNameEmpty` | 先起个名字 | Name it first | #86 新增 |
| `edCapTitle` | 以后在列表里的样子 | How it will look in the list | #86 新增 |
| `edUnnamed` | （未命名） | (Unnamed) | #86 新增 |
| `edPreset` | 选基底 | Pick a base | #86 新增 |
| `edPresetTitle` | 选个底子开始调：载入后 37 色与外观一次填好 | Start from a preset: loads all 37 colors and the appearance at once | #86 新增 |
| `edNoBase` | 未选 | None | #86 新增 |
| `edPresetSearch` | 搜索预置主题 | Search presets | #86 新增 |
| `edAppearance` | 外观 | Appearance | #86 新增 |
| `edDark` | 深色 | Dark | #86 新增 |
| `edDarkTitle` | 深色：换上这个主题后一直是深色 | Dark: always dark once applied | #86 新增 |
| `edLight` | 浅色 | Light | #86 新增 |
| `edLightTitle` | 浅色：换上这个主题后一直是浅色 | Light: always light once applied | #86 新增 |
| `edSystem` | 跟随系统 | System | #86 新增 |
| `edSystemTitle` | 跟随系统：深浅跟系统走 | Follow the system appearance | #86 新增 |
| `edTransparentFlag` | 可设透明 | Can be transparent | #86 新增 |
| `edPickTitle` | 换个颜色 | Pick a color | #86 新增 |
| `edFreq` | 本主题用过的颜色 | Colors used in this theme | #86 新增 |
| `edTransparent` | 透明 | Transparent | #86 新增 |
| `edOk` | 确定 | OK | #86 新增 |
| `edClosePop` | 关闭 | Close | #86 新增 |
| `edHue` | 色相 | Hue | #95 新增 |
| `edSat` | 饱和度 | Saturation | #95 新增 |
| `edVal` | 明度 | Brightness | #95 新增 |
| `edLightness` | 亮度 | Lightness | #95 新增 |
| `edDone` | 完成 | Done | #95 新增 |
| `edEyedropper` | 吸管取色 | Pick from screen | #95 新增 |
| `edEyedropperOff` | 当前环境不支持吸管，可用下方主题色 | Eyedropper unavailable; use theme colors below | #95 新增 |
| `edContrast` | 对比度 | Contrast | #95 新增 |
| `edContrastLow` | 对比不足 | Low contrast | #95 新增 |
| `edInvalidHex` | 请输入 #RGB 或 #RRGGBB | Enter #RGB or #RRGGBB | #95 新增 |
| `edAlphaDropped` | 已忽略透明度 | Alpha ignored | #95 新增 |
| `edCopy` | 复制色值 | Copy value | #95 新增 |
| `edHueAria` | 色相 {v} 度 | Hue {v} degrees | #95 新增 |
| `edSvHint` | 方向键微调，Shift 加速 | Arrow keys to adjust, Shift for larger steps | #95 新增 |
| `edColorModel` | 色彩模型（点击切换） | Color model (click to switch) | #95 新增 |
| `edDelete` | 删除 | Delete | #86 新增 |
| `edDelConfirm` | 删除「{name}」？ | Delete "{name}"? | #86 新增 |
| `edDelNote` | 自定义主题删除后不可恢复。 | Deleted custom themes cannot be recovered. | #86 新增 |
| `edDelYes` | 确认删除 | Delete | #86 新增 |
| `edDelNo` | 取消 | Cancel | #86 新增 |
| `edCancel` | 取消 | Cancel | #86 新增 |
| `edCancelTitle` | 不保存，直接关闭 | Close without saving | #86 新增 |
| `edSave` | 保存主题 | Save theme | #86 新增 |
| `edSaveTitle` | 保存后出现在自定义主题里 | Saves into your custom themes | #86 新增 |
| `edSaveNeedName` | 先起个名字 | Name it first | #86 新增 |
| `cgroup.bg` | 背景与表面 | Surfaces | #86 新增，#92 定稿 |
| `cgroup.text` | 文字 | Text | #86 新增 |
| `cgroup.brand` | 品牌与状态 | Brand & status | #86 新增 |
| `cgroup.border` | 边框 | Border | #86 新增 |
| `cgroup.diff` | 改动对比 | Diff | #86 新增 |
| `cgroup.md` | Markdown | Markdown | #86 新增 |
| `cgroup.syn` | 代码高亮 | Syntax | #86 新增 |
| `cslot.background` | 背景 | Background | #86 新增 |
| `cslot.backgroundPanel` | 浮起面 | Raised surface | #86 新增，#92 定稿 |
| `cslot.backgroundElement` | 浮层 | Overlays | #86 新增，#92 定稿 |
| `cslot.sidebarBg` | 侧边栏 | Sidebar | #86 新增 |
| `cslot.bubbleBg` | 气泡 | Bubble | #86 新增 |
| `cslot.inputBg` | 输入框 | Input | #86 新增 |
| `cslot.codeBlockBg` | 代码块 | Code block | #86 新增 |
| `cslot.codeHeaderBg` | 代码块顶栏 | Code header | #86 新增 |
| `cslot.text` | 主要文字 | Primary text | #86 新增，#92 定稿 |
| `cslot.textMuted` | 次要文字 | Secondary text | #86 新增，#92 定稿 |
| `cslot.primary` | 品牌主色 | Brand primary | #86 新增，#92 定稿 |
| `cslot.secondary` | 空闲 | Idle | #86 新增，#92 定稿 |
| `cslot.info` | 信息 | Info | #86 新增 |
| `cslot.success` | 成功 | Success | #86 新增 |
| `cslot.warning` | 警告 | Warning | #86 新增 |
| `cslot.error` | 错误 | Error | #86 新增 |
| `cslot.border` | 边框 | Border | #86 新增 |
| `cslot.borderActive` | 强边框 | Strong border | #86 新增，#92 定稿 |
| `cslot.diffAdded` | 新增文字 | Added text | #86 新增，#92 定稿 |
| `cslot.diffRemoved` | 删除文字 | Removed text | #86 新增，#92 定稿 |
| `cslot.diffAddedBg` | 新增行底 | Added line bg | #86 新增，#92 定稿 |
| `cslot.diffRemovedBg` | 删除行底 | Removed line bg | #86 新增，#92 定稿 |
| `cslot.diffAddedLineNumberBg` | 新增行号底 | Added gutter | #86 新增，#92 定稿 |
| `cslot.diffRemovedLineNumberBg` | 删除行号底 | Removed gutter | #86 新增，#92 定稿 |
| `cslot.markdownHeading` | 标题 | Heading | #86 新增 |
| `cslot.markdownLink` | 链接 | Link | #86 新增 |
| `cslot.markdownCode` | 行内代码 | Inline code | #86 新增 |
| `cslot.markdownEmph` | 斜体文字 | Italic text | #86 新增，#92 定稿 |
| `cslot.markdownStrong` | 粗体文字 | Bold text | #86 新增，#92 定稿 |
| `cslot.markdownBlockQuote` | 引用 | Blockquote | #86 新增 |
| `cslot.syntaxComment` | 注释 | Comment | #86 新增 |
| `cslot.syntaxKeyword` | 关键字 | Keyword | #86 新增 |
| `cslot.syntaxFunction` | 函数 | Function | #86 新增 |
| `cslot.syntaxType` | 参数 | Parameter | #86 新增，#92 定稿 |
| `cslot.syntaxNumber` | 数字 | Number | #86 新增 |
| `cslot.syntaxString` | 字符串 | String | #86 新增 |
| `cslot.syntaxOperator` | 运算符 | Operator | #86 新增 |
| `cslotUse.background` | 窗口与各层底色 | Window and layered surfaces | #86 新增，#92 定稿 |
| `cslotUse.backgroundPanel` | 标签、多选与浮起按钮底 | Tags, multi-select and raised buttons | #86 新增，#92 定稿 |
| `cslotUse.backgroundElement` | 选择器、选中卡片、Toast、提示与引用块竖线 | Selectors, active cards, toasts, tips and quote bars | #86 新增，#92 定稿 |
| `cslotUse.sidebarBg` | 侧边栏与标题行底 | Sidebar and title row | #86 新增，#92 定稿 |
| `cslotUse.bubbleBg` | 用户消息气泡底 | User message bubble | #86 新增，#92 定稿 |
| `cslotUse.inputBg` | 消息输入框与登录框底 | Message input and login box | #86 新增，#92 定稿 |
| `cslotUse.codeBlockBg` | 代码块底 | Code block | #86 新增，#92 定稿 |
| `cslotUse.codeHeaderBg` | 代码块顶栏底 | Code header | #86 新增，#92 定稿 |
| `cslotUse.text` | 主要文字、按钮字与代码默认色 | Primary text, button labels and code foreground | #86 新增，#92 定稿 |
| `cslotUse.textMuted` | 次要文字、说明与菜单图标 | Captions, hints and menu icons | #86 新增，#92 定稿 |
| `cslotUse.primary` | 主按钮、品牌强调与选中态 | Primary buttons, accents and selection | #86 新增，#92 定稿 |
| `cslotUse.secondary` | 空闲状态圆点 | Idle status dot | #86 新增，#92 定稿 |
| `cslotUse.info` | 徽章字、选中图标与强调按钮 | Badge text, selected icons and accent buttons | #86 新增，#92 定稿 |
| `cslotUse.success` | 成功状态与通过标识 | Success states and pass marks | #86 新增，#92 定稿 |
| `cslotUse.warning` | 警告状态与提示条 | Warning states and banners | #86 新增，#92 定稿 |
| `cslotUse.error` | 错误状态与危险操作 | Errors and destructive actions | #86 新增，#92 定稿 |
| `cslotUse.border` | 分割线、hr 与弱边框 | Dividers, hr and subtle borders | #86 新增，#92 定稿 |
| `cslotUse.borderActive` | 强边框、聚焦与滚动条悬停 | Strong borders, focus and scrollbar hover | #86 新增，#92 定稿 |
| `cslotUse.diffAdded` | ＋行文字与文件标记 | Added code text and file markers | #86 新增，#92 定稿 |
| `cslotUse.diffRemoved` | －行文字与文件标记 | Removed code text and file markers | #86 新增，#92 定稿 |
| `cslotUse.diffAddedBg` | ＋行整行底 | Added line background | #86 新增，#92 定稿 |
| `cslotUse.diffRemovedBg` | －行整行底 | Removed line background | #86 新增，#92 定稿 |
| `cslotUse.diffAddedLineNumberBg` | ＋行行号栏底 | Added line-number gutter | #86 新增，#92 定稿 |
| `cslotUse.diffRemovedLineNumberBg` | －行行号栏底 | Removed line-number gutter | #86 新增，#92 定稿 |
| `cslotUse.markdownHeading` | Markdown 标题 | Markdown headings | #86 新增 |
| `cslotUse.markdownLink` | 链接、锚点与代码链接 | Links, anchors and code links | #86 新增，#92 定稿 |
| `cslotUse.markdownCode` | 行内代码文字（无底色） | Inline code text (no fill) | #86 新增，#92 定稿 |
| `cslotUse.markdownEmph` | 强调（斜体）文字 | Emphasized (italic) text | #86 新增，#92 定稿 |
| `cslotUse.markdownStrong` | 加粗（重要）文字 | Bold (important) text | #86 新增，#92 定稿 |
| `cslotUse.markdownBlockQuote` | 引用块文字 | Quote text | #86 新增，#92 定稿 |
| `cslotUse.syntaxComment` | 注释与文档注释 | Comments and doc comments | #86 新增，#92 定稿 |
| `cslotUse.syntaxKeyword` | 关键字与控制流 | Keywords and control flow | #86 新增 |
| `cslotUse.syntaxFunction` | 函数名、类型名与属性名 | Function, type and attribute names | #86 新增，#92 定稿 |
| `cslotUse.syntaxType` | 参数名（类型名随函数色） | Parameter names (type names use function color) | #86 新增，#92 定稿 |
| `cslotUse.syntaxNumber` | 数字、常量与布尔 | Numbers, constants and booleans | #86 新增，#92 定稿 |
| `cslotUse.syntaxString` | 字符串与模板串 | Strings and template expressions | #86 新增，#92 定稿 |
| `cslotUse.syntaxOperator` | 运算符与标点 | Operators and punctuation | #86 新增 |
| `miniSession` | 会话 | Session | #86 新增 |
| `miniCurrent` | ministros · 当前 | ministros · current | #86 新增 |
| `miniDraft` | aurora 草稿 | aurora draft | #86 新增 |
| `miniReview` | gruvbox 回顾 | gruvbox review | #86 新增 |
| `miniBubble` | 这套配色看起来很舒服，再帮我看看深色下对比度够不够。 | This palette looks comfy — check the dark-mode contrast too. | #86 新增 |
| `miniVerdict` | 走查结论 | Review verdict | #86 新增 |
| `miniPass1` | 整体通过， | Overall pass, | #86 新增 |
| `miniPassStrong` | 对比度 | contrast | #86 新增 |
| `miniPass2` | 与 | and | #86 新增 |
| `miniGap` | 间距 | spacing | #86 新增 |
| `miniPass3` | 达标，详见 | pass — see | #86 新增 |
| `miniSpec` | 设计规范 | the spec | #86 新增 |
| `miniPass4` | ，其余看 | , the rest in | #86 新增 |
| `miniNote` | 备注。 | Notes. | #86 新增 |
| `miniEmph` | 这段是斜体，用来试强调色。 | Italic sample for the emphasis color. | #86 新增 |
| `miniQuote` | 好的主题是看不见的，只觉得舒服。 | A good theme is invisible — it just feels right. | #86 新增 |
| `miniFile` | example.mjs | example.mjs | #86 新增 |
| `miniBtnPrimary` | 主按钮 | Primary | #86 新增 |
| `miniBtnSecondary` | 次按钮 | Secondary | #86 新增 |
| `miniBtnInfo` | 查看详情 | Details | #86 新增 |
| `miniBadgeOk` | 已启用 | Enabled | #86 新增 |
| `miniWarn` | 有 3 个槽对比度偏低，先看一眼预览 | 3 slots are low-contrast — check the preview | #86 新增 |
| `miniErr` | 保存失败，再试一次 | Save failed — try again | #86 新增 |
| `miniInputPh` | 输入 | Type | #86 新增 |
| `miniInputHint` | 消息… | a message… | #86 新增 |
| `miniCaption` | 输入框外框跟主题走 | The input frame follows the theme | #86 新增 |
| `miniTip` | 已同步到预览 | Synced to preview | #86 新增 |

## 主题 38＋分组 9（`src/engine/zh-names.ts` 单一来源，矩阵/故事卡同源）

13 保留英文：opencode / One Dark / Monokai / Cursor / GitHub / Vercel＋Solarized / Gruvbox / Ayu / Flexoki（废生造：日光浴/复古凹槽/鮎/纸墨）＋AMOLED / OC 2 / One Dark Pro（缩写·派生）；透光橙/纯橙对仗保留为范式；`system`＝跟随系统。

- 2026-10-06 #67 落码：本表 **en 列即代码 `THEME_EN`**（与 `THEME_ZH` 同键集，`listThemes`／两表 38/38/38 三表对账 pin）；中英界面各取一表、实时切换，**两表都缺键才退回内部 id（slug 兜底）**；故事卡英文图与面板搜索索引（id／中文名／英文官方名三源）同源，词表两列由 `tests/engine.test.ts` 逐行对账。
- 2026-10-06 #66 落码：上表四名废生造（日光浴／复古凹槽／鮎／纸墨）**只进搜索索引、不进正名**——老用户按旧名仍搜得到，芯片标签恒为上表的保留英文正名；别名表 `THEME_ZH_LEGACY` 接在 `themeSearchText()` 上，中英界面同一索引（`tests/engine.test.ts` 断「双向可达＋不进显示名」，产物侧断别名随包发出）。

| key | kind | en | 中文终稿 |
|---|---|---|---|
| `opencode` | theme | opencode | opencode |
| `tokyonight` | theme | Tokyo Night | 东京之夜 |
| `dracula` | theme | Dracula | 德古拉 |
| `gruvbox` | theme | Gruvbox | Gruvbox |
| `matrix` | theme | Matrix | 黑客帝国 |
| `rosepine` | theme | Rosé Pine | 玫瑰松林 |
| `catppuccin` | theme | Catppuccin | 卡布奇诺 |
| `catppuccin-frappe` | theme | Catppuccin Frappe | 卡布奇诺·冰沙 |
| `catppuccin-macchiato` | theme | Catppuccin Macchiato | 卡布奇诺·玛奇朵 |
| `solarized` | theme | Solarized | Solarized |
| `synthwave84` | theme | SynthWave '84 | 合成波 84 |
| `everforest` | theme | Everforest | 常青森林 |
| `nord` | theme | Nord | 北极 |
| `kanagawa` | theme | Kanagawa | 神奈川 |
| `nightowl` | theme | Night Owl | 夜猫子 |
| `one-dark` | theme | One Dark | One Dark |
| `monokai` | theme | Monokai | Monokai |
| `palenight` | theme | Palenight | 苍白之夜 |
| `material` | theme | Material | 材料设计 |
| `ayu` | theme | Ayu | Ayu |
| `carbonfox` | theme | CarbonFox | 碳狐 |
| `cobalt2` | theme | Cobalt2 | 钴蓝 |
| `cursor` | theme | Cursor | Cursor |
| `aura` | theme | Aura | 光环 |
| `flexoki` | theme | Flexoki | Flexoki |
| `github` | theme | GitHub | GitHub |
| `zenburn` | theme | Zenburn | 禅燃 |
| `mercury` | theme | Mercury | 水星 |
| `osaka-jade` | theme | Osaka Jade | 大阪翡翠 |
| `vesper` | theme | Vesper | 黄昏星 |
| `vercel` | theme | Vercel | Vercel |
| `lucent-orng` | theme | Lucent Orange | 透光橙 |
| `orng` | theme | Orange | 纯橙 |
| `amoled` | theme | AMOLED | AMOLED |
| `oc-2` | theme | OC 2 | OC 2 |
| `onedarkpro` | theme | One Dark Pro | One Dark Pro |
| `shadesofpurple` | theme | Shades of Purple | 紫影 |
| `system` | theme | System | 跟随系统 |
| `warm` | group | Warm | 暖橙 |
| `yellow-green` | group | Yellow-green | 黄绿 |
| `teal` | group | Teal | 青绿 |
| `cyan-blue` | group | Cyan-blue | 青蓝 |
| `cool-blue` | group | Cool blue | 冷蓝 |
| `violet` | group | Violet | 蓝紫 |
| `neutral` | group | Neutral | 中性 |
| `transparent` | group | Transparent | 透明 |
| `special` | group | Special | 特殊 |

分组名体例（2026-10-06 [#68](https://github.com/FeatherHunter/dsh-opencode-palette/issues/68) 并排实测后冻结）：整组名 = 两端温度锚（暖橙／冷蓝）＋中段邻接复合（黄绿／青绿／青蓝／蓝紫）——青字头覆盖 `[90,200)`（青绿／青蓝 共享字头、尾字分色向），`[200,230)` 用冷字头（冷蓝）区分纯蓝段；英文按英语习惯（Teal／Violet 为单词色名），不与中文同构。色相阈值 160／200／230 与两侧实测余量见 `src/engine/grouping.ts` 的冻结注释。

## 双 README 8 节（`README.md`／`docs/README.en.md`，`prototypes/readme-mirror-61.html` v2）

| 节 | 结论 | 落码动作 |
|---|---|---|
| 头尾胶囊行 | pass | 有条件 PASS：数量·顺序·链接对称（门禁已钉）；但“期待你参与/PRs welcome”不对等（泛邀请 vs 特指PR），T6 二选一：zh 收窄或 en 放宽。 |
| 卖点＋求星 | pass | 信息对等即过：粗体一句＋斜体一句＋求星一句的顺序差不算账（#58 Q5）。 |
| SHOWCASE 选图 | fail | 重出图结论：对称三张——①主界面 opencode ②设置面板 ③同一第三主题（建议 GitHub Light 中英同主题），EN 图重截英文面板，文件名对称。会红测试：tests/readme-body.test.ts showcase 节（断言 zhImgs[2]/enImgs[2] 现文件名＋图片存在性测试），T6 同步改。 |
| SHOWCASE alt＋品牌 | fail | 统一 zh=OpenCode调色板 / en=OpenCode Palette（2026-10-06 已按上游转正）；孤例即正体。caption 已去“浅色”claim，保持。 |
| INSTALL 三步 | fail | 3行4处之其二段：EN L60（×2）＋L84 改英文面板名 Settings → Plugins → OpenCode Palette（已按转正品牌落码）；中文名只出现在中文页。 |
| THEMES＋EXTENSIONS | fail | 3行4处之其一段：EN L74 改为 (Chinese / English)；其余数据句＋两条目结构对称，算过。口径：3行4处=EN L60×2＋L74＋L84，按段合并3段。 |
| UPGRADE | pass | 按钮名各自语言、动作/对象/结果/条件一一对应即过，不强制同句式。 |
| MORE＋尾部 | pass | 结构已对称；附带抛光：中文“增强dsh-im”补空格→“增强 dsh-im”，不算镜像失败。 |

其中 SHOWCASE 选图（对称三张重出图）与徽章不对等（`欢迎提 Issue`／`Issues welcome`，2026-10-06 已双向收敛到 Issues 口径，链 `/issues` 不动）见各票；`alt` 统一 `OpenCode调色板`／`OpenCode Palette`（2026-10-06 已按上游转正并落码）；EN L60×2＋L84 改英文面板名、L74 改 `Chinese / English` 已落码。

## 禁用词与重写方向

- 禁最高级/空话/无结果动词（面板）；`不再繁琐` 类空话删除，保留动作＋结果（如 prompt 改“保存常用 prompt 预设，一键注入开发任务”）。
- 口语防撞车：`没读到` 口语化且与 `fontScanFail` 撞车，改“为空”版区分。
- 技术术语保留英文：`失败级别` 改 `warn/error`；`local/mono` 统一句首大写 `Local/Mono`；缺对象补对象（`disableTitle/enableTitle` 补 `the theme`）、缺量词补量词（`themeCount` 补 `themes`）。
- 生造专名保留英文不生造：日光浴→Solarized、复古凹槽→Gruvbox、鮎→Ayu、纸墨→Flexoki；品牌保留见主题表。
- 孤例拼写：`OpenCode` 改小写 `opencode`（README alt 已改，待上游拼写核对后全仓转正）。

## 测试门（断言清单，机检形态随落码落地）

- 面板词典：术语命中率 100%、禁用零出现、占位符完好（`{n}` 全量替换）、信息对等抽查；locale 切换后中英各一遍。
- 主题名表：专名保留、共识沿用、无生造；`listThemes() == THEME_ZH 键数 == THEME_EN 键数 == 38`、`GROUP_ORDER 9/9` 对齐；面板计数经 `trf({n})` 取 `themeNames().length`（`n≥2` 恒复数，注释注明）。#67 追加：英文名非空不重名、只有 opencode 与 id 同形；词表 en／中文终稿两列与代码两表逐行对账；搜索索引三源；中英**实渲染** 38 款无一退回内部 id。
- 双 README：无残留中文面板名（EN 只留故意的中文镜像句与图片文件名）、断言有锚、选图对称、计数一致、五枚徽章对等（`欢迎提 Issue`／`Issues welcome`）。
- 长度：真实容器不溢出、最小宽度冒烟、大字号不截断；`trf` 不调序。
- 色系边界（#68）：阈值 ±1° 探针、边界两侧最近主题归属、≥2° 余量跳闸线、三组色相连续、青／冷字头体例、明暗不改成员——六条 pin 在 `tests/group-boundary.test.ts`（越界或改名即红）。
- 先例：状态机＋接线一致＋宿主冒烟的门禁写法；真实渲染抓错的面板渲染回归写法；纯文本断字符串与数值的 README 体写法。

## 待人定（本表不代选）

- [x] 单源文件路径：本文件（`docs/i18n-glossary.md`）即答案，2026-10-06 用户认可后建立。
- [x] 上游品牌拼写核对后冻结（2026-10-06 转正为 `OpenCode`／`OpenCode Palette`，全仓已落码，含徽章 `OpenCode·38`）。
- [ ] 疑难名单三项实测（词源考据＋中英双搜＋视觉并排）后由主题定稿转正；R2 搜索别名（[#66](https://github.com/FeatherHunter/dsh-opencode-palette/issues/66) 2026-10-06 已落码：四名只进索引、不进正名）／R5 THEME_EN（[#67](https://github.com/FeatherHunter/dsh-opencode-palette/issues/67) 2026-10-06 已落码）／R6 青绿·青蓝·冷蓝并排（[#68](https://github.com/FeatherHunter/dsh-opencode-palette/issues/68) 2026-10-06 已冻结：阈值 160／200／230 与青／冷字头体例原样冻结，注释＋六条 pin 落码）。
- [ ] SHOWCASE 对称三张重出图＋同步改 `readme-body` 会红断言（见 #62 下一步）。

## 来源

- T1 基线：面板 84 键＋主题 38＋分组 9＋双 README 各 126 行，8 条红旗（[#57](https://github.com/FeatherHunter/dsh-opencode-palette/issues/57)）。
- T2 结论：[#58](https://github.com/FeatherHunter/dsh-opencode-palette/issues/58) Q1–Q6 优化版（用户 2026-10-06 认可）及 [#64](https://github.com/FeatherHunter/dsh-opencode-palette/issues/64) AFK 可执行固化。
- T3–T5 原型：`prototypes/i18n-59-prototype.html`（51 键）、`prototypes/zh-names-prototype.html`（47 条）、`prototypes/readme-mirror-61.html`（8 节 v2）。本文件由三原型数据直出，杜绝转抄。
