# README 基础使用演示（折叠 + 视频）primary-source 研究

> 任务：为 dsh-opencode-palette README『基础使用演示（折叠 + 视频）』需求做一次 primary-source 研究。
> 本文件是研究报告，只给结论与证据；**不要据此直接改 README**（改 README 另起任务）。
> 研究日期：2026-10-23。本地文件行号以当日 main 为准（两页均为 147 行）。

## 0. 结论（TL;DR，先看这节）

1. **折叠用单个 details 区块，不用多 details 平铺，也不用嵌套。** 一个演示章节只包一个 details（内可放多个视频），summary 写一行纯文本；默认折叠（不加 open），保持 README 首屏仍是静态 SHOWCASE。（依据见 1 节）
2. **视频嵌入主方案用 video 标签（src 指向 user-attachments），同一区块内再附一行裸链接做兜底；不用 a 标签包封面图方案。** 裸链接在 GitHub 自动渲染播放器且降级最稳；video 标签可控宽度并声明 controls；封面图方案多一次制图维护且与正片易脱节。（依据见 2 节）
3. **落点：SHOWCASE 结束标记之后、INSTALL 章节之前，新起一个 DEMO 二级章节；绝不碰 CONNECT。** 即中文页 README.md L52（showcase:end 注释）之后、L54（INSTALL h2）之前插入；英文页 docs/README.en.md 同样位置（同样 L52 之后、L54 之前）。CONNECT（两页均为 L133-147，内有飞书群二维码 + star-history 曲线 + ?v= 缓存戳）是全仓统一的页尾联系规范，原样保留。（依据见 3 节）
4. **SHOWCASE 与演示视频的分工：SHOWCASE 静态图负责一眼全览（现有 10 张主题截图不动），DEMO 视频只负责动态操作（换肤一键点击、37 色调色联动、字体字号切换），建议不超过 3 个短视频。**（依据见 3 节）
5. **中英文各写一份，两页 README 的演示章节互为翻译、复用同一串 user-attachments URL。** summary 与说明文字各自语言；视频 URL 不翻译。版本号门禁与 star-history 缓存戳不受影响。（依据见 4 节）
6. **视频资产不转存进仓库 assets/，直接引用上传后得到的 user-attachments URL。** mp4 进 git 会膨胀仓库体积，且本仓奉行构建产物不入库（见 ADR 0004）；user-attachments 由 GitHub 托管，与源码解耦。（依据见 2.5 小节与 2.1 小节）
7. **已知最大风险是市场详情页 / npm 包页渲染器丢弃原始 HTML（视频与折叠在那里不可见），对策是同一区块内保留裸链接 + 一句话文字说明。**（依据见 5 节 R1）

---

## 1. 折叠语法（details/summary 官方渲染行为）

权威来源：GitHub 官方文档页及其 Markdown API（同一正文，API 版去 JS 壳、取证用它）：

- 文档页：https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/organizing-information-with-collapsed-sections
- 正文 API（本节引文以此为准）：https://docs.github.com/api/article/body?pathname=/en/get-started/writing-on-github/working-with-advanced-formatting/organizing-information-with-collapsed-sections

### 1.1 基本写法（官方示例原文结构）

官方给出的标准写法（照录结构，代码块内容略）：

    <details>
    <summary>Tips for collapsed sections</summary>
    ### You can add a header
    You can add text within a collapsed section.
    You can add an image or a code block, too.
    （此处为 ruby 代码块示例）
    </details>

要点（均为官方原文，可回溯上列两个 URL）：

- **默认折叠**：官方原文 Any Markdown within the details block will be collapsed until the reader clicks to expand the details. —— 不加任何属性即折叠，读者点三角展开。
- **默认展开是 opt-in**：官方原文 Optionally, to make the section display as open by default, add the open attribute to the details tag（即写成 details open）。—— 本仓推荐**不加 open**（演示是次要内容，不与 SHOWCASE 抢首屏）。
- **块内可放任意 Markdown**：官方示例在块内放了 h3 标题、正文、图片、代码块四种元素 —— 所以折叠块内放视频 + 文字说明 + 链接在官方支持语义内（视频见 2 节白名单证据）。
- **summary 是标签行**：官方原文 Within the details block, use the summary tag to let readers know what is inside. The label appears to the right of the triangle. —— summary 官方定位就是一行 label。

### 1.2 summary 文案限制（半官方 + 实践共识，已分级标注）

- **官方示例的 summary 是单行纯文本**（Tips for collapsed sections，无标题、无链接、无格式）。官方没有明文写 summary 内禁止块级元素，但全站文档所有示例均为单行纯文本 —— 这是最安全的写法。
- **实践共识（非官方明文，置信度中）：summary 内放 # 标题、多行、块级 HTML 在部分渲染器（移动端、邮件通知、第三方 Markdown 预览）下会错乱。** 本仓建议 summary 只写一行纯文本，中英文各自翻译，例如：
- 中文：summary 行写：▶ 展开看 30 秒基础使用演示（含换肤 / 调色 / 字体）
- 英文：summary 行写：30-second basic usage demo (switch theme / tune colors / fonts)
- 注意：emoji / ▶ 这类行内字符是安全的（行内），禁的是标题、列表、表格、图片这类块级内容。

### 1.3 嵌套（官方未记载，本仓不用）

- 官方文档**全文未提及嵌套 details**（以 1 节顶部 API 全文为证，可全文检索 nest 无结果）。
- 实践中 GitHub 网页端可渲染嵌套折叠，但属于未文档化行为，移动端与第三方渲染器表现不一。
- **本仓结论：只用单层 details，多个演示视频纵向排列在同一个块内，不做一视频一 details 平铺，更不嵌套。** 理由：单层在所有已知渲染器（网页 / App / 邮件降级为展开文本）下行为一致；多 details 平铺会让 README 碎成一串三角，伤害可扫读性。

### 1.4 中英文是否各写一份

- 是。details/summary 是与语言无关的标签语法，但 summary 文案与块内说明文字是自然语言，必须各自翻译。
- 本仓两页 README 是**各自全文**（不是共用片段）：README.md L5 与 docs/README.en.md L5 互链（中文/English 跳转），结构逐段对照（行数同为 147 行，章节顺序一致）。因此演示章节也在两页各写一份，见 4 节。

---

## 2. 视频嵌入（user-attachments 三种写法的取舍）

### 2.1 先说 GitHub 的潜规则：video 标签只认自家 CDN（primary-source 级证据链）

- **Bobo Chen《把 30 秒产品介绍塞进 GitHub README 的最后一哩》（2026-05-17）**：https://bobochen.dev/blog/github-readme-video-embed-last-mile/ —— 作者实测记录：帮开源工具 TypeLate 做了 30 秒产品介绍影片，想内嵌到 GitHub README，却踩了三个雷；核心发现为 README 的 video 标签只认他们自家 CDN，其他任何 URL 都不会 inline 播放。其实测过程：先试相对路径 docs/promo.mp4（播放器渲染出来但点 play 无反应），再试 raw.githubusercontent.com 绝对路径（同样无反应），curl -sI -L 验证后确认 raw 链接不被播放器接受。
- 推论：**不要把 mp4 commit 进仓库用相对路径或 raw 直链引用做 video src** —— 渲染出空播放器是最坏的结果（用户以为视频坏了）。这也是本报告 0 节结论 6（不转存 assets/）的直接依据。
- 上传得到 user-attachments URL 的标准动作（社区通用做法）：找任意一个 issue（可新建空白 issue）在评论区粘贴/拖入 mp4，发表后复制生成的 https://github.com/user-attachments/assets/ 加 uuid 链接；之后该 issue 可关闭但**建议保留**（见 5 节 R6）。

### 2.2 三种写法对照表

| 写法 | 示例形状 | 优点 | 缺点 | 本仓定位 |
|---|---|---|---|---|
| A. 裸链接（独立成行） | user-attachments URL 独占一行 | 零标签、最稳定；GitHub 自动渲染为内联播放器；任何降级场景（邮件、代理、第三方渲染）都退化为可点击链接 | 不可控宽度；不能声明 controls/autoplay | **必备兜底**，每个视频附一行 |
| B. video 标签 | video src=user-attachments controls width=100% | 可控宽度、可声明 controls；与 A 同源所以同样能播 | 被 HTML 白名单限制（仅 user-attachments 源可播，见 2.1）；市场/npm 渲染器会整体剥离（见 5 节 R1） | **主展示**写法 |
| C. a 标签包封面图 | 封面 img 链接到 video-url | 封面可定制、可跳转站外（YouTube/B站） | 多一张封面图的制作与同步维护；封面与正片内容易脱节；站内 user-attachments 视频不需要外跳；调研中未见主流大仓用此法做站内演示主入口 | **不用** |

### 2.3 真实开源 README 例证（3 个主证 + 1 个附加，均可在其 raw 页面验证）

1. **WiLoR-mini —— 单 video 行内播放（最小写法）**
- 渲染页：https://github.com/warmshao/WiLoR-mini
- raw：https://raw.githubusercontent.com/warmshao/WiLoR-mini/main/README.md（Demo 节）
- 写法照录：video src=https://github.com/user-attachments/assets/ca7329fe-0b66-4eb6-87a5-4cb5cbe9ec43 controls=controls width=300 height=500，内附您的浏览器不支持播放该视频 fallback 文案。
- 证明点：user-attachments 源 + controls 在 README 内联可播；竖屏视频用固定宽高。

2. **pollen-robotics/microduck —— 表格内多 video 并排（块级容器内可播）**
- 渲染页：https://github.com/pollen-robotics/microduck
- raw：https://raw.githubusercontent.com/pollen-robotics/microduck/main/README.md（It does things 节）
- 写法照录其一（共 4 个）：video src=https://github.com/user-attachments/assets/356a6011-8e0d-4b28-bda9-da78646583a3 controls width=100%，四个视频放在 2x2 table 单元格内，每格配一句说明（It walks / It rolls / It picks things up / It gets back up）。
- 证明点：video 可活在 table 单元格这类块级 HTML 容器里（类比：details 块内同样可播，见 2.4）；多视频并排 + 一句话配文是成熟的信息架构，可直接借鉴（本仓建议纵向而非表格，见 3 节）。

3. **danielmiessler/LifeOS —— 裸 user-attachments 链接自动成播放器（写法 A 的存在证明）**
- raw：https://raw.githubusercontent.com/danielmiessler/LifeOS/refs/heads/main/README.md（顶部 hero 区）
- 写法照录：https://github.com/user-attachments/assets/329897f5-828b-4c23-b607-1cf9c71cb4ec 独立成行，无任何标签，GitHub 将其渲染为内联视频播放器。
- 证明点：写法 A 无需任何 HTML 即可内联播放，是零维护成本的兜底。

4. **（附加例证）aigc-apps/EasyAnimate —— 表格内 video autoplay loop**
- raw：https://raw.githubusercontent.com/aigc-apps/EasyAnimate/6d15f2799f2d7de8a9e963b043e7d09ec2dcb905/README.md
- 写法照录：video src=https://github.com/user-attachments/assets/bb393b7c-ba33-494c-ab06-b314adea9fc1 width=100% controls autoplay loop（多格表格）。
- 证明点：同方案 B；但其 autoplay loop 本仓**不建议学**（见 5 节 R2）。

### 2.4 折叠块内可播吗

- **可以。** 证据链：官方文档明确 Any Markdown within the details block will be collapsed（见 1.1），块内是正常渲染管线，只是初始不可见；microduck/EasyAnimate 证明 video 可活在 table 单元格这类块级容器里，details 块内同理；video 是否播放只取决于 src 是否为 user-attachments CDN（2.1），与是否包在 details 内无关。
- 注意事项：折叠状态下视频不预加载（省流量，符合本仓演示是次要内容的定位）；**不要在折叠块内用 autoplay** —— 用户展开前就后台播开了，体验差且费流量（EasyAnimate 的 autoplay 是在非折叠表格里，本仓场景不同）。

### 2.5 移动端 / 代理 / 第三方渲染

- **GitHub Mobile App（iOS/Android）**：user-attachments 视频走系统播放器，可播；details 可点开。裸链接在 App 内同样可点播。—— 无额外动作，A+B 组合已覆盖。
- **企业代理 / 弱网**：user-attachments 域名若被代理拦截，video 标签显示为空白播放器，此时**裸链接兜底**让用户至少能复制链接到外部打开。这就是同一区块内 A+B 并存的理由，不是二选一。
- **npm 包页 / 市场详情页**：这是最大降级点 —— 本仓已知市场详情页渲染器整段丢弃原始 HTML（star-history 方案交接记录：picture/img 在那边都不显示）。details/video 同属原始 HTML，在市场页会被剥离；裸链接是纯文本 URL，不受影响，仍可点击。对策见 5 节 R1。

---

## 3. 落点建议（基于两页 README 现结构的插入位置）

### 3.1 现结构速览（行号实测，两页同为 147 行）

| 章节 | 中文页 README.md | 英文页 docs/README.en.md | 备注 |
|---|---|---|---|
| 标题 + 徽章 | L1-19 | L1-19 | 不动 |
| SHOWCASE（含 showcase start/end 标记） | L21-52 | L21-52 | 10 张静态主题截图；标记疑似被脚本/流程依赖，块内不动 |
| INSTALL | L54-70 | L54-70 | 命令块，不动 |
| EXTENSIONS | L72-78 | L72-78 | 功能表，不动 |
| UPGRADE（含版本号 2.1.10 共 3 处） | L80-91 | L80-91 | 版本号由 npm run readme:version 派生（scripts/sync-readme-version.ts），门禁 tests/readme-body.test.ts 钉住；演示章节不碰此段即无影响 |
| MORE（作者其他作品） | L93-107 | L93-107 | 不动 |
| THANKS（含 THANKS-TABLE-ZH/EN-START/END 表格标记） | L109-131（标记 L115-127） | L109-131（标记 L115-127） | 表格疑似脚本生成，块内不动 |
| CONNECT（反馈与联系：PR/ISSUE 链接 + 群二维码 + star-history 曲线） | L133-147（二维码 L139，曲线 L145 带 ?v= 戳） | L133-147（二维码 L139，曲线 L145 带 ?v= 戳） | 全仓统一的页尾联系规范，不动、不在其后追加 |

### 3.2 推荐插入点：SHOWCASE 之后、INSTALL 之前（两页同位）

- 中文页：在 L52（showcase:end 注释）与 L54（INSTALL h2）之间插入新章节。
- 英文页：同样在 L52 与 L54 之间插入。
- 新章节骨架（与现有章节同构：居中 h2 + sub 英文小字 + 中文/英文大字）：居中 h2，sub 写 DEMO，大字写基础使用演示；其下放一个 details，summary 写一行纯文本演示标签；块内放视频与说明。
- 英文页把大字换成 Basic usage demo，summary 换英文；以上为草稿示例，本次不写入 README。

### 3.3 为什么是这个位置（四条理由）

1. **叙事顺序最顺**：静态全览（SHOWCASE）→ 动态操作（DEMO）→ 动手安装（INSTALL）。用户先被好看吸引，再看怎么动，再执行命令，符合漏斗。
2. **对现有统一块零扰动**：SHOWCASE 的 start/end 标记、THANKS 表格标记、CONNECT 的二维码/star 曲线/?v= 戳（门禁 tests/star-history.test.ts 钉住两页 README 都在 CONNECT 之后引用图且带 ?v= 戳）全部原样保留；插入点上下都是空白行分隔的章节边界，无合并冲突面。
3. **为什么不放 CONNECT 之后**：CONNECT 是反馈与联系的页尾收束块（PR/ISSUE 入口 + 交流群二维码 + star 曲线），全仓统一规范；视频放在联系方式之后违反页尾收尾心智，且紧邻 star-history 图的 ?v= 戳行，误编辑易触发 star-history 门禁。
4. **为什么不在 SHOWCASE 块内**：SHOWCASE 块被 showcase start/end 注释标记包裹（疑似有外部流程消费该区间），且块内是纯图片表格心智；演示视频自成 DEMO 章节，标题可被锚点引用，也方便以后在 MORE/Issue 里引用。

### 3.4 SHOWCASE 静态图与演示视频的分工

| | SHOWCASE（现有，不动） | DEMO（新增） |
|---|---|---|
| 职责 | 一眼全览：38 款配色 x 10 张代表截图 | 动态操作：换肤一键点击、37 色调色联动、字体字号切换 |
| 形态 | 静态图片表格（首屏可见） | 折叠内不超过 3 个短视频（默认隐藏，不抢首屏） |
| 更新成本 | 加新主题才加图 | 操作变了才重录；视频 URL 换一行即可 |
| 降级 | 所有渲染器可见 | 市场页降级为裸链接（见 5 节 R1） |

---

## 4. 中英文同步

- **两页各写一份**：中文页（README.md）写中文 summary + 中文说明，英文页（docs/README.en.md）写英文 summary + 英文说明；视频 user-attachments URL 两处复用同一串（URL 与语言无关）。
- **行号对照**：插入点均为各自文件的 L52 之后、L54 之前（两页结构逐行对照，见 3.1 表格）。
- **不受影响的既有机制**：版本号同步（npm run readme:version / tests/readme-body.test.ts）只作用于 UPGRADE 段的版本号字样，演示章节无版本号，不会误触；star-history ?v= 戳只存在于 CONNECT 段 L145，演示章节不碰该行；THANKS 表格标记（L115-127）与 SHOWCASE 标记（L21/52）原样保留。
- **翻译一致性要求**：summary 文案、视频配文（一句话 per 视频，如 microduck 的 It walks. 风格）、兜底链接上方的提示句，三处中英文语义对齐；视频本身可只录一版（操作无语言）或中英各一版（若有旁白/字幕则需两版，决策留给录制任务）。

---

## 5. 风险清单

- **R1（高）：npm 包页 / 市场详情页剥离原始 HTML，视频与折叠不可见。** 依据：本仓 star-history 交接约束——市场详情页渲染器整段丢弃原始 HTML（picture/img 在那边都不显示）。对策：演示区块内每个视频保留一行裸 user-attachments 链接 + 一句话文字说明（纯 Markdown，不依赖 HTML）；首屏 SHOWCASE 静态图不受影响（仍是 README 主入口的视觉担当）。
- **R2（中）：折叠块内 autoplay 扰民。** 对策：只用 controls，不用 autoplay（EasyAnimate 的 autoplay 在非折叠表格场景，本仓不学）。
- **R3（中）：嵌套/多 details 碎片化。** 对策：单层单个 details（1.3）；summary 纯文本单行（1.2）。
- **R4（低）：summary 内放标题/链接/图片导致部分渲染器错乱。** 对策见 1.2；可在演示任务里加一条人工检查：summary 行只允许纯文本。
- **R5（低）：视频过大（时长/体积）拖慢页面。** 建议值（实践经验，非官方上限）：单视频不超过 30 秒、不超过 10MB、720p；超了就拆成换肤篇/调色篇多个短视频。user-attachments 本身无公开的 README 引用体积上限文档，此条标注为经验建议。
- **R6（低）：user-attachments 资产随源 issue 删除而失效。** 社区经验：附件挂靠上传所在的 issue/PR，删除源 issue 可能导致附件不可访问（置信度中，非官方文档）。对策：用一个专门的 README 素材空 issue 上传全部演示视频，正文注明勿删，不复用业务讨论 issue。
- **R7（低）：第三方 Markdown 预览（VS Code、邮件、RSS）对 details/video 支持不一。** 对策：以 GitHub 网页渲染为准验收；裸链接保底在所有场景可点。

---

## 附：来源一览（回溯用）

- 官方文档页：https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/organizing-information-with-collapsed-sections
- 官方正文 API：https://docs.github.com/api/article/body?pathname=/en/get-started/writing-on-github/working-with-advanced-formatting/organizing-information-with-collapsed-sections
- Bobo Chen 视频嵌入实测：https://bobochen.dev/blog/github-readme-video-embed-last-mile/
- WiLoR-mini README（video 例 1）：https://github.com/warmshao/WiLoR-mini
- WiLoR-mini raw：https://raw.githubusercontent.com/warmshao/WiLoR-mini/main/README.md
- microduck README（video 例 2，表格多视频）：https://github.com/pollen-robotics/microduck
- microduck raw：https://raw.githubusercontent.com/pollen-robotics/microduck/main/README.md
- LifeOS README（裸链接例）：https://github.com/danielmiessler/LifeOS
- LifeOS raw：https://raw.githubusercontent.com/danielmiessler/LifeOS/refs/heads/main/README.md
- EasyAnimate README（附加例，autoplay 写法）：https://github.com/aigc-apps/EasyAnimate
- 本地结构：README.md L21-52（SHOWCASE）、L54-70（INSTALL）、L80-91（UPGRADE）、L109-131（THANKS）、L133-147（CONNECT）；docs/README.en.md 行号一一对应（两页均为 147 行）。
