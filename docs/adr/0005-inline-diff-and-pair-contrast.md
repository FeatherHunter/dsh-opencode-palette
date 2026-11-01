# 内联 diff 行底与宿主配对对比度：两级可读性兜底

Status: accepted

## Context

2026-10 用户报障（截图）：写入/编辑工具的文件改动展示里，绿色行块内几乎看不到文字。
定位证据来自宿主 `app.asar` 的 CSS（组件 `_17vb8_*`）：

```css
._add_17vb8_48 { color: var(--dsw-alias-state-success-primary); background: var(--dsw-alias-code-diff-added); box-shadow: inset 3px 0 0 var(--dsw-alias-state-success-primary) }
._del_17vb8_38 { color: var(--dsw-alias-state-error-primary);   background: var(--dsw-alias-code-diff-deleted); box-shadow: inset 3px 0 0 var(--dsw-alias-state-error-primary) }
```

两个事实由此确定：

1. `--dsw-alias-code-diff-added/deleted` 是**行底**（宿主默认值本身也只是绿/红 500 级 `a08`/`a12` 水洗），
   配对文字色固定为 `state-success/error-primary`。旧实现按名字把它们直配 `diffAdded/diffRemoved`
   **前景** → 行底成了不透明高饱和色；在 `diffAdded ≈ success` 的主题（Catppuccin 全家）里行底与文字
   同色（frappé 实测 1.00:1），整行看不见。
2. 这类「同一规则里同时设 `background` 与 `color`」的配对在宿主里不止 diff 一处。把 asar 里所有
   `background(-color):var(--dsw-alias-X)` 与 `color:var(--dsw-alias-Y)` 同现的规则体去重后，得到 **57 条**
   配对（按钮反白字、错误药丸、警告标签、错误提示文字、层级卡片…）。其中 4 类在真实主题下低于
   WCAG AA：错误色压在页面底（8 套预置主题两半，最低 3.41）、错误药丸里的 `bg-layer-3`（6 个 IP 预设）、
   警告标签压在 `bg-module-platform`（gruvbox/nord + 22 个 IP 预设）、反白字压在 `brand-primary`
   （最差 3.12）。这些都不是颜色表缺槽，而是「两个 token 撞在一起」，任何单点映射都修不到。

## Decision

分两级兜底，都放在引擎里（宿主 CSS 不可改，插件只能动 token 值）：

**D1 内联 diff 行底改为派生（`map-dsh.ts` 的 `deriveDiffWash`）**

行底要服务一个**固定**的文字色 T（`state-success/error-primary`），同时必须看得出是一条色带：

1. 种子 = 主题自己的 diff 底（`diffAddedBg`/`diffRemovedBg`，进 `buildTokens` 前已过 `ensureDiffContrast`）；
2. T 在种子上 ≥ 4.5 且种子与代码块底可辨 → 直接用（保住主题原本的 diff 色调）；
3. 达标但与代码块底同色 → 退回宿主语义（状态色按浓度水洗在卡片底上，最高 40%）；
4. 仍不成带 → 沿黑/白把种子推离，取第一档「既达标又成带」；
5. 画布贴住黑白、推到极限也成不了带 → 可读优先；6. 种子缺槽/透明（委托画布）→ 交还宿主默认。

阈值：可读 4.5；色带**目标** 1.12、**地板** 1.08（三级选择：先取「偏离最小且 ≥1.12」，再取
「偏离最小且 ≥1.08」，都到不了才用「可达范围内最可辨的那个」）。地板不是绝对承诺——行底最多推到纯黑/
纯白，天花板就是 `contrast(画布, 更远端点)`；画布本身贴住黑白时地板在数学上不可达，测试因此以
`min(地板, 天花板)` 为判据。

**D2 宿主配对表 + 通用修复（`pair-contrast.ts`）**

57 条配对写成数据表（`HOST_TEXT_PAIRS`，可从 asar 复现重扫）。每半外观各跑一遍：
对每条不达标配对，**只动该动的一侧**（文字色 vs 面 → 动文字；面当字压状态色 → 动状态色；
要以全局文字锚当底面被推离、或面 vs 面 → 不动），沿黑/白 1% 一档推离，取「满足该 token 全部约束的
最小一步」。约束物理上不可同时满足时**保持原值**并记入 `infeasible`（把设计色推成中间灰会让每处都变糊）；
页面底缺席或半透明（委托画布）时整段跳过（`judged: false`，判不出真实观感，宁可不改）。

判不了的一律如实报告：坏值（5/7 位 hex、`rgb(10 10 10 / 15%)` 这类空格斜杠语法）与两侧都不可动的
配对进 `skipped`，不猜、不当颜色用（解析只认 `#rgb/#rgba/#rrggbb/#rrggbbaa` 与逗号语法的 `rgb()/rgba()`）。
推离时避开「本次已写出的别的值」，保住层级——正文色与次要色在弱对比主题里不会被推成同一个灰；
但同一源的孪生（`label-primary` 与 `label-primary-dimmed` 都取 `text`）起点相同，允许同值。

**D3 顺序**：`code-diff-*` 必须在 D2 之后派生。D2 可能把 `state-success/error-primary` 推离，
行底要跟着重算才能继续满足「文字 ≥ 4.5 + 色带可见」。因此 `code-diff-*` 从 `DERIVED_TOKENS`
挪到 `buildTokens` 末段（那里拿得到已落地的 token 值，而不是颜色键）。

**D4 已知无解的一对**：`label-primary-inverted on brand-primary`（vercel + 13 个 IP 预设，3.12–3.70）。
同一个反白字既要压浅色填充（`button-contrast-fill`/`label-primary`）又要压中调主色，黑白两端都够不到 4.5；
宿主默认值在同一处也只有 ~3.7。选择保持主题作者的值，不做 max-min 折中。

## Consequences

- 截图那类缺陷在任何主题下都不可能重现：`code-diff-*` 与状态色恒 ≥ 4.5，且与代码块底可辨。
- 4 类配对缺陷全部消灭，兜底从「个别 token 特判」升级为「宿主真实配对的通用规则」；新增缺陷只要
  补一行表。
- 代价：少数主题会被推离 1–5%（例：cobalt2 `state-error-primary` `#FF0088 → #FF61B5`，
  frappé `#E78284 → #EC9A9B`）；已达标主题**逐字节不变**（修复层是恒等变换）。
- 修复语义只覆盖「已知配对」；宿主升级若新增配对，需要按同一口径重扫 asar 补表（表头注释写了方法）。

## Verification

- `tests/engine.test.ts`：内联 diff 行底用例（全部主题 + IP 预设两半：状态色对行底 ≥ 4.5、
  行底与代码块底 ≥ min(1.08, 可达天花板)，主流深色主题 ≥ 1.12；frappé 行底不得等于 `#A6D189`）。
- `tests/pair-contrast.test.ts`：6344 次配对检查（全部预置主题 + 25 个 IP 预设 × 两半）中除登记在册的
  那一条外全部 ≥ 4.5；另钉住「无解保持原值 / 最小步推离 / 幂等 / 判不了就不改 / 修复侧选择 /
  端到端注入（低对比自定义主题的正文色真的被推离）/ 层级不塌 / 坏值进 skipped / 短 hex 可解析」。
- `npm test` 324 项全绿（含新增 11 项）；`npm run verify:artifacts` 通过（`client.js` 含新模块 `pair-contrast`）。
