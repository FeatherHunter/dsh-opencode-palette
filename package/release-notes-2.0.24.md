# v2.0.24 — 锚定浮层 + 更新系统 0.8.0

## 改了什么
- 字体悬浮列表锚定浮层：fixed 定位逃出宿主 overflow 裁剪，超面板右沿可见；新增 src/engine/float-geometry.mjs 纯函数（右缘 shift、上翻、极小视口钳制，锚点出视野返回 null）；滚动/缩放重定位，菜单内滚动除外
- 更新系统 0.7.1 → 0.8.0（范围 ^0.8.0）：入口 API 纯加法，无新版按钮本身即版本（默认），单按钮形态不变
- 回归：float-geometry 6 单测 + 面板锚定断言

## 验证结果
- npm run build 全绿（v2.0.24 产物，依赖全部最新）
- npm test 177/177 全绿
- npm view dsh-opencode-palette version = 2.0.24，线上 dist.shasum = 本地 tgz sha1

## 哈希
- tgz sha1：3e4e158b55eb160a20a2ee70f6140626c3b8a863
