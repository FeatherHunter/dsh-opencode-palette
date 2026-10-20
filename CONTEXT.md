# CONTEXT.md — 领域通用语言

> 本仓的领域文档约定见 [docs/agents/domain.md](docs/agents/domain.md)。术语在讨论中**真正定下时**才加进来；还没定的一律标「讨论中」，不写进规格。

## 主题与 token

| 术语 | 含义 | 状态 |
|---|---|---|
| **opencode token** | 本插件最初基于 opencode 主题设计的那 37 个参数（`src/engine/map-dsh.ts:242` 的 `COLOR_SLOTS`，如 `background` / `textMuted` / `syntaxKeyword`）。旧称「色位 / 色槽」，**2026-10-20 起废弃**：文档、代码注释、讨论一律用本词。 | ✅ 已定（票 [#147](https://github.com/FeatherHunter/dsh-opencode-palette/issues/147)） |
| **主题 token** | 宿主 DSH 画界面用的 CSS 变量名（`--dsw-*` / `--shiki-*` / `--dsh-*`）。一个 opencode token 平均落到约 2.8 个主题 token 名。 | ✅ 已定 |
| **注入（inject）** | 本插件把 token 值送进页面的动作。两条通道：① 宿主 API `theme.overrideTokens('opencode-palette', tokens)`（`runtime/client.ts:736`）；② 自建 `<style>` 节点里的 `body{--x:…}` 规则（`runtime/client.ts:739-741`）。**不用「写」形容这个动作**。 | 🔁 讨论中（票 #147） |
| **覆盖（override）** | 同名 token 上本插件的值优先于宿主样式表的值。这是「注入」的**结果**，不是动作名。 | 🔁 讨论中（票 #147） |
| **活名 / 死名** | 活名 = 宿主有消费方在读；死名 = 宿主声明了但全仓没有 `var()` 消费方（颜色轴实测活 184 / 死 38）。 | ✅ 已定（[`host-token-probe-136.md`](docs/research/host-token-probe-136.md)） |

## 相关研究

- 颜色轴逐名清单与「本仓今天注入了哪些名字」的对照：[`color-axis-token-inventory.md`](docs/research/color-axis-token-inventory.md)
- token 状态机（`live / declared-invalid / missing / dead / pinned / gated`）：[`host-token-probe-136.md`](docs/research/host-token-probe-136.md)
