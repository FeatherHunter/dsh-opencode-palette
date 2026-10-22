# 颜色/外观分区表：14 区域 × 37 legacy 映射 × 184 活名归属（设计期初判）

- 状态：设计稿（2026-10-22，#147 二审修正项 P0-4 / P1-7 的产物）
- 口径：本表把三个**不同单位**的集合放在一起看，但**不做加法**——37 个 opencode token 是 L1 控件、37 个是「组内条目」不是主题数、425 是宿主事实层 token 名、184 是颜色轴活名、14 是 L2 语义区域。加总没有意义（二审已指出 37+8+12+12+60=129≠184 是单位混用）。
- 逐名真值表（425 / 222 / 184 / 38）见 `color-axis-token-inventory.md`；逐名归属由扫描器生成，本表是设计期人工初判，置信度标在每节。

## 1. 37 个 opencode token（L1）→ 7 个 legacy 组

来源：`src/engine/map-dsh.ts:242` `COLOR_SLOTS`（37 个，逐名清单以源码为准）。

| legacy 组 | 条目数 | 语义 | 主要落点区域（14 区域） |
|---|---|---|---|
| `bg` | 8 | 背景（全局/侧栏/气泡/输入框/代码块/代码头等） | global、sidebar、conversation、composer、code |
| `text` | 2 | 主文字 / markdown 文字 | global、markdown |
| `brand` | 6 | 品牌色（primary/secondary/info/success/warning/error） | global、window（partial） |
| `border` | 2 | 边框 / 分隔线 | global |
| `diff` | 6 | diff 增删/行背景 | markdown、code |
| `md` | 6 | markdown 链接/标题/引用等 | markdown |
| `syn` | 7 | 语法高亮（对应 shiki token） | code、markdown |

legacy 能力 id 规则（写进 SPEC §1）：`legacy.<组>.<名字>`，如 `legacy.bg.background`、`legacy.syn.keyword`。用户不写这个前缀；v1 JSON 自动归一化。

## 2. 14 区域 × 能力数（合并视图，2026-10-22 实测）

手写来自 `palette/palette.yaml`（28 条）；展开来自 `control_templates × anchors.controls`（65 条，展开 id = `<region>.<controlName>.<property>`）；其中 4 条展开与手写重名，手写优先 → 合并视图 **89 条唯一 id**（不是 93）。

| 区域 | 手写 | 展开 | 唯一合计 | 备注 |
|---|---|---|---|---|
| global | 6 | 9 | 15 | tooltip/文本 + dialog 表面 |
| window | 1 | 0 | 1 | 窗口外壳（标题栏 token 走 A 通道） |
| sidebar | 2 | 4 | 5 | item 模板展开；1 条与手写重名 |
| conversation | 1 | 14 | 15 | 2 个 button 控件 |
| composer | 3 | 14 | 17 | 发送/附件按钮 |
| detail | 0 | 0 | 0 | **缺口**（详情页宿主 token 少） |
| settings | 0 | 11 | 11 | tab + switch |
| menu | 3 | 4 | 6 | 菜单面/菜单项；1 条与手写重名 |
| code | 3 | 4 | 6 | 代码块表面；1 条与手写重名 |
| markdown | 5 | 5 | 9 | 段落/标题/链接/行距；1 条与手写重名 |
| tool | 2 | 0 | 2 | 工具卡片 |
| terminal | 1 | 0 | 1 | 终端 |
| deliverable | 1 | 0 | 1 | 产物区 |
| plugin | 0 | 0 | 0 | **缺口**（插件市场页） |
| **合计** | **28** | **65** | **89** | 12/14 区域有覆盖 |

4 条重名（手写优先）：`menu.item.background`、`sidebar.item.background`、`code.block.background`、`markdown.link.foreground`。
展开命名规则见 `palette/vocabulary.yaml` grammar 与 `palette/SPEC.md` §3 硬规则 1；`palette-check.py` 强制展开 id 唯一且每段在词表。

缺口登记：`detail`、`plugin` 两区列 `coverage-gaps`；实现期门禁目标 14/14（SPEC §8.8）。

## 3. 184 个颜色轴活名 → 功能桶 → 区域初判

桶计数来自 `color-axis-token-inventory.md`（颜色轴 222 名 = 184 活 + 38 死）。桶→区域是初判，逐名归属待扫描器。

| 功能桶 | 颜色轴活名数 | 归属区域（初判） | 置信度 |
|---|---|---|---|
| 原子色阶（static） | 60 | 不进 L2；L3 `raw_tokens` 直达（Q3-A 的「原子折叠入口」） | 高 |
| 背景填充（bg alias） | 22 | global、sidebar、conversation、composer、menu | 高 |
| 品牌色 | 18 | global、window | 中 |
| 特定页面（settings/plugin 等） | 12 | settings、plugin、deliverable | 低（部分为 detail 缺口） |
| 状态控件（hover/active/selected） | 11 | 全区域按状态后缀展开 | 高 |
| 材质/阴影/焦点（shadow/elevation/focus/menu） | 12 | global、window | 中 |
| 代码高亮（shiki） | 11 | code、markdown | 高 |
| 区域特化（specific） | 8 | sidebar、composer、conversation、code | 高 |
| diff | 8 | markdown、code | 高 |
| 边框/分隔线 | 7 | global | 高 |
| markdown 专属 | 5 | markdown | 高 |
| 文字 | 4 | global、markdown | 高 |
| 其它（gradient/onboarding 等） | 6 | window、global | 中 |
| **合计** | **184** | — | — |

说明：60 个原子不分配区域（它们是调色板原料，不是区域外观）；L2 底部提供折叠入口，L3 逐名可写。Q3-A 的承诺在此落地；若用户裁定改为 B/C，本表相应调整。

## 4. 缺口与后续

1. 逐名归属表：由 `palette:scan-tokens` 扫描器把 184 活名逐名映射到区域/角色/属性，本表只保证「桶级加总 = 184」。
2. `detail`、`plugin`：需要补能力条目（先补 token 事实，再补 anchors），否则 14/14 门禁不通过。
3. 7 组 legacy 的 UI 分组定义（编辑器里怎么显示这 7 组）尚未写进 `vocabulary.yaml` 的 catalog；L1 视图仍需分组表（实现期）。
4. 375 个「活名但本仓未写」中，93 个属颜色轴之外（排印/尺寸），不在本表范围；排印轴归 #148。
