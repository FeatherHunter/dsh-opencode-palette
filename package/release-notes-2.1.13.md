# v2.1.13 — 随 base 0.1.8 同步联系块与版本口径

## 改了什么

- **内嵌 `dsh-featherhunter-plugin-base` 0.1.7 → 0.1.8**：同步上游补丁版（README 联系块标题居中、渠道徽标相关布局细节），`lib/client.js` 按新基础包重建。
- **README / CI**：两页 README 的安装与升级示例、联系块由 `readme:sync` / `readme:version` 重新生成，统一到 2.1.13。
- 无主题引擎与渲染逻辑变更。

## 验证

- `npm run build`、`npm test`、`npm run verify:artifacts`、`npm run readme:check`、`npm run readme:version:check` 全绿。
- npm 包与 GitHub Release 产物见本页。
