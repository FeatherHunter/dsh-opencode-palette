# v2.0.9

## 改了什么

- 更新通道换 `dsh-plugin-update@0.2.0` 真依赖：删 `runtime/vendor` 与 `package/lib/vendor`，
  宿主侧 `import { createHostUpdate } from 'dsh-plugin-update'`，产物 `dependencies` 声明 `^0.2.0`
  （用户装本插件时自动拿到最新的 0.2.x）。
- 构建前硬门禁 `node scripts/check-deps.mjs`（本地声明 / 已安装 / 产物声明 / 上游 latest 四列，
  范围内落后也拦、离线放行）；`npm run deps:sync` 一键跟上。
- 冒烟测试搭假使用范围；文档与 ADR 更新（0001 标 superseded，新增 0002）。

## 验证结果

- `npm run build` ✅，`npm test` 144/144 ✅
- 对账 ✅：线上 `version = 2.0.9`，线上 `dist.shasum` 等于本地 tgz 的 sha1。

## 哈希

- shasum: `3e4a90cfd3ed4ccd014b195bf16bdc5bfa93e128`
- 附件：`dsh-opencode-palette-2.0.9.tgz`（428,213 B）
