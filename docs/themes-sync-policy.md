# 预置主题同步策略（本地定制 + 只报告校验）

> 决策记录：[#119](https://github.com/FeatherHunter/dsh-opencode-palette/issues/119)（父地图 #115）。
> 一句话：**主题 JSON 是直接维护的本地定制**，`npm run sync` 只报告漂移、绝不回滚；覆盖必须显式，上游升级靠人工合并。

## 背景

早期 `scripts/sync-themes.ts` 的 verify 模式在校验通过后会把本地与上游的差异**写回**（先验后写，本意是"恢复缺失/损坏文件"），
但预置主题已按 37 槽判尺直接整改（见 `DESIGN.md`；审计脚本与报告见 #116），本地文件与 opencode 上游**故意不同**。
于是每次 `npm run sync` 都会静默回滚手工调色 —— 这是 #119 要修的问题。

现在的策略：

1. **主题 JSON 为唯一事实源**：整改/调色直接改 `src/themes/*.json`，不建 sidecar 覆盖文件。
2. **verify 只读**：默认 `npm run sync` 检测并报告漂移，**不写任何主题 JSON、不碰 MANIFEST**。
3. **声明式定制**：有意保留的本地差异记录在 `src/themes/MANIFEST.json` 的 `localCuration.themes` 中（见下），未来 verify 视为预期。
4. **覆盖必须显式**：只有 `--write` / `--update-baseline` 会覆盖本地文件，且都会警告并清除 `localCuration` 声明。
5. **上游升级 = 人工合并**：改 `OPCODE_SHA` 后显式重建基线，再把本地定制逐项合并回去并重新登记；同步器不负责保留定制。

## 命令

| 命令 | 作用 | 写盘 |
| --- | --- | --- |
| `npm run sync` | verify（默认）：下载上游 → 对照检入基线校验 → 检测本地漂移并报告 | **不写任何文件**（只读；需要网络） |
| `npm run sync -- --verbose` | 同上，且对已声明的本地定制也逐项打印「上游 vs 本地」值 | 不写 |
| `npm run sync -- --accept-local` | 人工 `git diff` 复核后，把"本地与上游不同"的主题登记进 `MANIFEST.localCuration`（不联网） | 只写 MANIFEST |
| `npm run sync -- --write` | 显式覆盖：校验通过后用上游内容恢复本地主题文件，并清除 `localCuration` 声明 | 写主题 JSON + MANIFEST |
| `npm run sync:update` | 显式升级：改 `OPCODE_SHA` 后覆盖全部主题并重建指纹基线（须随代码 review） | 写主题 JSON + MANIFEST + NOTICES 首行 |

### 退出码（verify）

- `0`：无漂移；或全部漂移都已在 `MANIFEST.localCuration` 中声明为本地定制（预期内）。
- `1`：存在**未声明**的漂移、本地文件缺失、本地 JSON 损坏，或基线过期（先走升级流程）。
- `2`：CLI 参数错误（未知参数 / 模式互斥）。

## MANIFEST.localCuration

`src/themes/MANIFEST.json` 新增一段声明（33 套 TUI 主题预先全部登记 —— 它们都会在整改中被本地修改）：

```jsonc
{
  "source": "anomalyco/opencode",
  "rev": "0dd6950d1b06958fbcdcadf0ad56258257ab7fdb",
  "localCuration": {
    "policy": "preserve-local",
    "note": "为什么这些主题与上游不同（指向 DESIGN.md / docs/themes-sync-policy.md）",
    "themes": {
      "aura": true,
      "nord": true
      // ... 33 套 TUI 主题
    }
  },
  "themes": { /* 上游指纹基线（sha256），只由 --update-baseline 重建 */ },
  "adapted20": { /* 4 套 desktop-2.0 派生主题指纹，不在 sync 校验范围 */ }
}
```

- 写法兼容 `"aura": true` 与 `"aura": { "localCurated": true, "note": "..." }`。
- `themes` 指纹表**不因本地定制而改变**：它记录的仍是"检入时上游长什么样"，用来验证上游内容没被篡改、以及判断本地是否漂移。
- `--accept-local` 会把有漂移的主题置 `true`、把已与上游一致的主题的旧声明删掉；主题 JSON 不动。

## 工作流

### A. 有意修改主题后（日常）

1. 改 `src/themes/<name>.json`（以及对应测试/文档）。
2. `git diff` 复核改动；`npm test` 全绿。
3. `npm run sync -- --accept-local` → 把这些主题登记进 `localCuration`（若已登记则无变化）。
4. 提交时一起带上 `MANIFEST.json` 的声明变更。

### B. 意外漂移 / verify 报错（退出码 1）

1. 看报告：`[sync] 本地漂移（未声明）: <name>` + 差异键（`theme.text`、`defs.darkBg` 等）。
2. 先 `git diff src/themes/<name>.json` 判断是否自己/他人的有意改动：
   - 有意 → 走工作流 A（`--accept-local`）。
   - 无意（误改/损坏）→ `npm run sync -- --write` 显式恢复上游内容。
3. 文件缺失同理：verify 只报告，`--write` 才恢复。

### C. 升级上游 opencode pin（人工合并）

1. 改 `scripts/sync-themes.ts` 的 `OPCODE_SHA`（+ `OPCODE_TAG_ANNOTATION` 注释）。
2. 跑 `npm run sync` → 应报"基线过期"（这是预期，说明需要显式升级）。
3. 人工 review 上游 diff（确认合法、非投毒）后跑 `npm run sync:update`：覆盖全部主题 + 重建指纹基线 + 清空 `localCuration`。
4. **把本地定制合并回新上游内容**（备份/git diff 逐项对照），再 `npm run sync -- --accept-local` 重新登记。
5. `npm test` 全绿 + `git diff` review 基线变更后提交。

> 同步器**不会**自动保留本地定制：升级是"以上游为新底，再人工叠加定制"的过程。

## 边界与不变式

- **verify 需要网络**（要下载上游 33 个 JSON 做对照）；离线时无法校验，会报下载失败。它仍然不写本地主题。
- **desktop-2.0 的 4 套派生主题**（`amoled` / `oc-2` / `onedarkpro` / `shadesofpurple`）由 `scripts/convert-desktop-themes.ts` 从 `src/themes/desktop-2.0/*.json` 生成，不在 `sync-themes.ts` 的 33 个 TUI 主题范围内；它们的状态记录在 `MANIFEST.adapted20`。
- **NOTICES**：`--update-baseline` 只替换 `src/themes/THIRD_PARTY_NOTICES.md` 首行的来源 pin，手工维护的归属说明原样保留。
- **构建产物**：同步脚本只读写 `src/themes/`，不产生 `dist/` / `client.js`；构建产物本来就不入库（ADR 0004）。
- **tamper 校验不变**：上游内容与检入基线不一致（且 SHA 未升级）时按"疑似篡改"拒绝写入；`--update-baseline` 同样先做结构校验，坏内容进不了基线。
