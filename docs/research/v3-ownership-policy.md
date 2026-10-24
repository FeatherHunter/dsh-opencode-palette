# token 归属策略（方案 A：一个 token 只有一个 owner）

日期：2026-10-24　决策来源：#147 维护者裁定（A 方案）＋ V3 核心理念：「一个小功能，哪个途径的技术可以精细实现就用哪个来实现」
状态：已落到 `palette/`（生成器 `scripts/research/gen_palette_v5.py` 内的 `OWNERSHIP_*` 常量），由 `palette-check.py` 与 `audit_p1p5.py` 双重门禁。

## 1. 规则

1. 每个宿主 token 只有一个 owner 能力，owner = 语义最贴切、覆盖面最大的那条（优先级：手写 > P4 > master > P2）。
2. 其他能力**不能**再写这个 token。要「只改某一区域」时，用更精细的技术路径（规则层 / DOM 层），而不是去拧共享 token。
3. 宿主没给独立通道（或暂时没有稳定锚点）的效果，不设旋钮；把它移出菜单并登记研究结论与后续票号。

## 2. 三类处置

### 2.1 合并（10 条重复语义行 → owner，记 `merged_from`）

| 被合并能力 | 归入 owner | 原因 |
|---|---|---|
| `global.text.primary` | `global.text.foreground` | 同一 token 的重复语义行（master 生成） |
| `specific.sidebar.fill` | `sidebar.panel.background` | 同上（specific 表） |
| `content.markdown.code-block.background` | `code.block.background` | 同上（master） |
| `content.code.block.background` | `code.block.background` | 同上（P2） |
| `content.code.block.banner.background` | `content.markdown.code-block.banner` | 同上（P2） |
| `typography.family.default` | `global.text.font_family` | 同上（P4） |
| `global.link.text` | `global.link.foreground` | 同上（P1 语义） |
| `content.code.block.content.font` | `typography.markdown-code-block.composite` | 同上（P2） |
| `content.terminal.font` | `typography.markdown-code-block-small.composite` | 同上（P2） |
| `content.code.block.banner.font` | `code.block.font_family` | 同上（P2） |

### 2.2 改走规则层（区域旋钮保留，不再写共享 token）

| 能力 | 原共享 token | 新实现 | 锚点 |
|---|---|---|---|
| `composer.input.foreground` | `--dsw-alias-label-primary` | `color: $value` | `composer.input` |
| `markdown.link.foreground` | `--dsw-alias-link` | `color: $value` | `markdown.link`（新增） |
| `markdown.paragraph.font_size` | `--dsw-font-markdown-base-font-size` | `font-size: $value` | `markdown.paragraph` |
| `markdown.paragraph.line_height` | `--dsw-font-markdown-base-line-height` | `line-height: $value` | `markdown.paragraph` |
| `code.block.radius` | `--dsw-radius-lg` | `border-radius: $value` | `code.block` |
| `tool.search.radius` | `--dsw-radius-lg` | `border-radius: $value` | `tool.search`（新增） |
| `terminal.block.radius` | `--dsw-radius-lg` | `border-radius: $value` | `terminal.root` |
| `tool.web.radius` | `--dsw-radius-lg` | `border-radius: $value` | `tool.web`（新增） |
| `sidebar.item.background` | `--dsw-alias-bg-layer-2` | `background-color: $value` | `sidebar.item` |

### 2.3 移出菜单（宿主未给独立通道）

| 能力 | 原因 | 后续 |
|---|---|---|
| `window.titleBar.background` | 标题栏底色 = 宿主读侧栏色（`preload-windows.ts:21-23` → `setTitleBarOverlay`），没有独立标题栏 token | 独立配色路线 = 让侧栏色非纯色使探针取不到合法颜色 → overlay 透明 → 顶部自绘图层。实验归 **#154** |
| `sidebar.guide.entry.radius` | 侧栏引导项没有专用锚点/通道（源码无 `data-guide` 一类稳定属性），无法做到只改引导项圆角 | 研究结论留档；若宿主后续给锚点再恢复 |

## 3. 新增的宿主事实

- 锚点：`markdown.link`（`[data-markdown-variant] a`，inferred）、`tool.search`（`[data-search]`，documented）、`tool.web`（`[data-web]`，documented）。
- 角色词表：新增 `search`（搜索卡片）、`web`（网页卡片），roles 27 → 29。
- 计数变化：能力菜单 333 → **319**；合并唯一 394 → **379**；锚点 23 → **26**（documented 17 / inferred 8 / fragile 1）；`_index.counts.roles` 27 → 29。

## 4. 门禁

```powershell
python scripts/research/gen_palette_v5.py    # 重新合成 palette.yaml
python scripts/research/palette-check.py     # 0 错 0 警
python scripts/research/audit_p1p5.py        # FAIL=0（含 K1 每个 token 只有一个 owner）
```

K1 规则由 `audit_p1p5.py` 强制执行；新增能力若再次出现「一个 token 多写者」，K1 直接 FAIL。
