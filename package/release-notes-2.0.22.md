# v2.0.22 — 字体下拉 92 项不再被压扁聚集

## 改了什么
- 修复 #69：字体下拉滚动容器内子项默认 flex-shrink 把 97 行压进 280px；fontItem 与 secHeader 根 div 各加 flex:none（runtime/client.mjs 2 行）
- 回归：tests/panel-render.test.mjs 加 2 条 flex:none 断言
- 随包依赖：dsh-plugin-update 0.7.0 → 0.7.1（范围内跟上）

## 验证结果
- npm run build 全绿（v2.0.22 产物）
- npm test 171/171 全绿
- npm view dsh-opencode-palette version = 2.0.22，线上 dist.shasum = 本地 tgz sha1

## 哈希
- tgz sha1：1742987cdf51f214984dc4c5ac8e3acc24fc1a54
