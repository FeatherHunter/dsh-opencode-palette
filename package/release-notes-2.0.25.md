# v2.0.25 — 纯橙边框统一（#70）

## 改了什么
- 纯橙主题卡片边框三边橙一边灰混杂：DERIVED inverted/inverted2 改取 border/borderActive（与 l1/l2 对齐）；hr 规则改取 border；orng.json markdownHorizontalRule 明暗均改为 #EC5B2B
- 回归：engine 新增「issue 70: 边框统一」用例

## 验证结果
- npm run build 全绿（v2.0.25 产物，依赖全部最新）
- npm test 178/178 全绿
- npm view dsh-opencode-palette version = 2.0.25，线上 dist.shasum = 本地 tgz sha1

## 哈希
- tgz sha1：9d75fdf1c8c1be9b9ecfdb5081e64440c6b76375
