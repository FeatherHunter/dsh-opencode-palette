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

## 面板 53 键（`runtime/client.mjs`，`{zh,en}` 结构、键名与语言跟随不变）

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

## 主题 38＋分组 9（`src/engine/zh-names.mjs` 单一来源，矩阵/故事卡同源）

13 保留英文：opencode / One Dark / Monokai / Cursor / GitHub / Vercel＋Solarized / Gruvbox / Ayu / Flexoki（废生造：日光浴/复古凹槽/鮎/纸墨）＋AMOLED / OC 2 / One Dark Pro（缩写·派生）；透光橙/纯橙对仗保留为范式；`system`＝跟随系统。

- 2026-10-06 #67 落码：本表 **en 列即代码 `THEME_EN`**（与 `THEME_ZH` 同键集，`listThemes`／两表 38/38/38 三表对账 pin）；中英界面各取一表、实时切换，**两表都缺键才退回内部 id（slug 兜底）**；故事卡英文图与面板搜索索引（id／中文名／英文官方名三源）同源，词表两列由 `tests/engine.test.mjs` 逐行对账。
- 2026-10-06 #66 落码：上表四名废生造（日光浴／复古凹槽／鮎／纸墨）**只进搜索索引、不进正名**——老用户按旧名仍搜得到，芯片标签恒为上表的保留英文正名；别名表 `THEME_ZH_LEGACY` 接在 `themeSearchText()` 上，中英界面同一索引（`tests/engine.test.mjs` 断「双向可达＋不进显示名」，产物侧断别名随包发出）。

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

分组名体例（2026-10-06 [#68](https://github.com/FeatherHunter/dsh-opencode-palette/issues/68) 并排实测后冻结）：整组名 = 两端温度锚（暖橙／冷蓝）＋中段邻接复合（黄绿／青绿／青蓝／蓝紫）——青字头覆盖 `[90,200)`（青绿／青蓝 共享字头、尾字分色向），`[200,230)` 用冷字头（冷蓝）区分纯蓝段；英文按英语习惯（Teal／Violet 为单词色名），不与中文同构。色相阈值 160／200／230 与两侧实测余量见 `src/engine/grouping.mjs` 的冻结注释。

## 双 README 8 节（`README.md`／`docs/README.en.md`，`prototypes/readme-mirror-61.html` v2）

| 节 | 结论 | 落码动作 |
|---|---|---|
| 头尾胶囊行 | pass | 有条件 PASS：数量·顺序·链接对称（门禁已钉）；但“期待你参与/PRs welcome”不对等（泛邀请 vs 特指PR），T6 二选一：zh 收窄或 en 放宽。 |
| 卖点＋求星 | pass | 信息对等即过：粗体一句＋斜体一句＋求星一句的顺序差不算账（#58 Q5）。 |
| SHOWCASE 选图 | fail | 重出图结论：对称三张——①主界面 opencode ②设置面板 ③同一第三主题（建议 GitHub Light 中英同主题），EN 图重截英文面板，文件名对称。会红测试：tests/readme-body.test.mjs showcase 节（断言 zhImgs[2]/enImgs[2] 现文件名＋图片存在性测试），T6 同步改。 |
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
- 色系边界（#68）：阈值 ±1° 探针、边界两侧最近主题归属、≥2° 余量跳闸线、三组色相连续、青／冷字头体例、明暗不改成员——六条 pin 在 `tests/group-boundary.test.mjs`（越界或改名即红）。
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
