# 马里奥主题重绘 · 交接单

> 2026-10-20 · 会话即将永久关闭，此文是这条线留在仓库里的最后一份可执行记录。

## 交付物

| 类型 | 路径 | 说明 |
| --- | --- | --- |
| 新增 | `src/custom-presets/mario-night.json` | 深色 · 1-2 夜行（37 色位，appearance=dark，id/appearance/name 自立） |
| 重绘 | `src/custom-presets/mario.json` | 浅色 · 1-1 白昼（37 色位，appearance=light）——原通用蓝版整版换成逐像素取色版 |
| 新增 | `prototypes/mario-extraction/` | 取色与复核管线（见该目录 README） |
| 新增 | `prototypes/mario-theme-preview.html` | 自包含预览页（内联三张参考图 + 逐色溯源 + 审计器实算对比度） |
| 改 | `src/engine/ip-presets.ts` | 注册 `mario-night`（IP 22 → 23） |
| 改 | `tests/ip-presets.test.ts` | EXPECTED_IDS 加 `mario-night`；计数 23、深 14 / 浅 9 |
| 改 | `tests/readme-body.test.ts` | README 的 IP 预置数量断言 21 → 23 |
| 改 | `README.md` / `docs/README.en.md` | 「21 个 IP 预置」→「23 个 IP 预置」 |
| 改 | `DESIGN.md` / `tsconfig.build.json` / `runtime/client.ts` | 数量口径 21 → 23 |
| 改 | `docs/theme-audit/criteria.md` | 判尺范围 58 套 → 60 套、59 套配色 → 61 套配色 |
| 改 | `docs/ip-presets-notes.md` | 「超级马里奥」条目整段重写为明暗双册 |
| 改 | `docs/ip-presets-v3-notes.md` | 新增「v3.6 超级马里奥逐像素取色重绘（明暗两套）」 |
| 改 | `docs/theme-audit/baseline.json` / `baseline.md` | `npm run audit:themes` 重生成（确定性产物，含马里奥两套逐对实测） |

## 验收状态（最后一次跑：2026-10-20 11:0x）

```
node scripts/audit-themes.ts --check   → 退出码 0
  mario       硬性 0 · UI 0 · 待处理设计告警 0
  mario-night 硬性 0 · UI 0 · 待处理设计告警 0
npm test                               → 283 过 / 0 红
```

最紧的三处（都贴门槛，改色必须重跑审计）：
浅色 `syntaxComment@codeBlockBg` 4.509:1 · 浅色 `borderActive@background` 3.937:1 · 深色 `primary@backgroundPanel` 3.178:1。

## 留给下一棒的一件事（不是这条线的）

当前审计输出里有 **6 条待处理设计告警 + 1 条 UI 违例，全部集中在 `ultraman`**：
`diffAdded = syntaxString`、`secondary = syntaxFunction`、`textMuted = syntaxOperator`、`error = diffRemoved` 四处并岗，
外加 `syntaxComment` / `syntaxOperator` 未退后、`primary@backgroundPanel` 3:1 未达。
来源是**并行改动**：`src/custom-presets/ultraman.json` 被改写的同时，`docs/theme-audit/exceptions.json` 里
原有的 39 行记档被删掉了，于是旧记档不再覆盖新的碰撞。这条线没动 ultraman，也没动 exceptions.json。

处理方向二选一：①把 ultraman 的四个并岗拆开（补成不同明度的台阶）；②在 `exceptions.json` 里按
`docs/ip-presets-v3-notes.md` 的口径补记档并写明理由。判尺明文写着「新设计不得为了过审随手加例外」，
所以优先选 ①。

## 提交注意（工作区里还有并行的其它主题改动）

本次**没有执行任何 git add / commit**：索引里已有一组并行改动（迪士尼那批，`git diff --cached` 可见），
本线只把改动留在工作区，避免占用别人的暂存意图。

要单独提交本线，建议（会连带把并行的 ultraman/genshin/marvel 等改动一起带上——因为
`src/engine/ip-presets.ts`、`tests/ip-presets.test.ts`、`docs/ip-presets-notes.md`、
`docs/ip-presets-v3-notes.md` 这四个文件本线与并行改动是同一份，无法按文件拆开）：

```powershell
git add -A
git commit -m "feat(themes): 超级马里奥整版重绘为逐像素取色（明暗两套，1-1 白昼 / 1-2 夜行）"
```

若只想先保住本线新增的文件（可独立成提交，不会破坏任何门禁）：

```powershell
git add src/custom-presets/mario-night.json prototypes/mario-extraction prototypes/mario-theme-preview.html
git commit -m "feat(themes): 超级马里奥逐像素取色管线与深色预置"
```

## 一句话设计备忘

**用亮度分层，而不是用描边分割**——天蓝当「场」，奶油砖当「纸」，马里奥红是唯一的「心跳」。
明暗两套的 8 个背景槽全部由 1.png 的天空像素 `#5A96FF` 推出（浅色混白 84%~97%，深色压黑 84%~96%），
27 个源像素逐个标注出处与图中占比，每个色位都能回原图复核。
