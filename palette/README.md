# palette/ —— DSH 主题能力集（V3 设计稿）

本目录是「我们能配什么、怎么配」的唯一真源。用户的 `theme.yaml` 只能写这里登记过的能力。

## 为什么这样拆：六条第一性原理

1. **单一事实源**：同一个事实只在一个文件出现一次。宿主 token 名只在 `tokens.yaml`，选择器只在 `anchors.yaml`，能力只在 `capabilities.yaml`（`palette.yaml` 是它们的合成视图，不产生新事实）。
2. **按技术域拆分**：一种落地手段一个文件。加新手段 = 加文件/加原语，不改能力菜单结构。
3. **按变化频率分层**：宿主每次升级都变的（token、锚点）标记为生成物；一年改几次的（词表、值类型）手写；每周增长的（能力）单独一个文件。
4. **契约先行**：能力 id 的每一段都必须来自词表，写原语的字段与参数都有清单，值必须按类型解析后再序列化。
5. **生成与手写分离**：扫描生成的文件头一律写 `generated: true`，禁止手改，改了就报错。
6. **开闭扩展**：新技术（新写原语、新值类型、新资源类型）只追加定义，不修改既有能力条目的形状。

## 文件职责

| 文件 | 内容 | 手写? |
|---|---|---|
| `_index.yaml` | 注册表：模块清单、版本、生成命令、计数 | 手写 |
| `capabilities.yaml` | **手写能力源**：30 条手写能力 + 控件模板 + `api`/`palette_version`；改能力改这里 | 手写 |
| `ownership.yaml` | 能力归属策略：merged / renamed / converted / dropped | 手写 |
| `palette.yaml` | **合成视图**：由全部底层模块合成——词表/值类型/原语/资源/探测/锚点 + 能力菜单 `capabilities`（合成条数以 `_index.yaml` 为准）+ `direct_bindings`（425 条）+ runtime 摘要；由 `gen_palette_v5.py` 生成，**不要手改** | **生成** |
| `vocabulary.yaml` | 词表：区域/角色/属性/recipe/状态/语言/能力域（34）/目录 | 手写 |
| `values.yaml` | 值类型（23 种）、书写系统 Unicode 范围、主题变量语法 | 手写 |
| `primitives.yaml` | 写原语：token / rule / dom / host_api 的字段与策略 | 手写 |
| `assets.yaml` | 资源类型与安全策略：图/动态图/视频/字体/图标 | 手写 |
| `probes.yaml` | 探测原语与探测环境 | 手写 |
| `tokens.yaml` | 宿主 token 全集（425 条：颜色 222 + 非颜色 203）、状态、声明位置、全部消费位置、`runtime` 段 148 条登记 | **生成** |
| `anchors.yaml` | DOM 锚点候选 + 控件清单 | **部分生成** |
| `SPEC.md` | 格式规范入口：palette.yaml + theme.yaml + assets 三样东西、加载管线、验收判据（给人/新 AI 读，不参与机器校验） | 手写 |

> 给新会话的读法：先读 `SPEC.md`（要做什么）→ 再读 `_index.yaml`（有哪些模块/计数）→ 再读 `palette.yaml`（合成后的能力全集；**不要手改**；加能力改 `capabilities.yaml`）。

## 三层用法

- **用户**：只写主题包里的 `theme.yaml + assets/`，值里只用能力 id（如 `sidebar.panel.background`），永远看不到宿主 token 名。
- **编辑器**：由 `palette.yaml` + `values.yaml` 派生 schema 与分组（词表提供标签）。
- **AI**：读 `_index.yaml` 知道结构 → 读 `coverage-gaps.md` 知道缺什么 → 按能力 id 生成/修改用户的 `theme.yaml`。

## 构建期要产出的东西（尚未实现）

- `palette.yaml`：合并视图，给人和 AI 通读（由 `scripts/research/gen_palette_v5.py` 生成，不手改）
- `schema/palette-v3.schema.json`：编辑器与 AI 的校验 schema
- `docs/palette/capability-matrix.md`：区域 × 角色 × 属性 的能力矩阵
- `docs/palette/coverage-gaps.md`：宿主有、能力集没有的缺口 = 扩建待办

## 扩建流程（未来写进 `docs/palette/EXTENDING.md`）

1. 跑扫描：`npm run palette:scan-tokens`、`npm run palette:scan-anchors`
2. 看 `coverage-gaps.md`：新增 token / 锚点 / 控件
3. 有缺口 → 先补 `anchors.yaml`（人工确认置信度）或 `tokens.yaml`（自动）
4. 新能力 → `capabilities.yaml` 加条目（只引用已有词表/值类型/原语），跑 `python scripts/research/gen_palette_v5.py` 重新合成 `palette.yaml`
5. 需要新类型/新原语 → 改 `values.yaml` / `primitives.yaml`，不改 palette 条目形状
6. 跑门禁：`python scripts/research/palette-check.py`（跨模块引用、计数、生成物一致性、版本对账）
7. 预览截图对比；升 `palette_version`（新增 +0.1.0，破坏性 +1.0.0）

## 版本策略

- `api`：能力集对 `theme.yaml` 的 schema 版本（不兼容才 +1）
- `palette_version`：能力集自身版本（新增能力 +0.1.0）
- 模块 `version`：各技术域独立演进，`_index.yaml` 的 `requires` 保证不兼容时门禁报错
- `tokens.yaml` / `anchors.yaml` 的版本 = 宿主版本 + commit，随宿主升级整体替换
