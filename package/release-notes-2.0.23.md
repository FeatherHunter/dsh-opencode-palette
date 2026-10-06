# v2.0.23 — 字体悬浮列表随内容变宽、只纵滑

## 改了什么
- 字体悬浮菜单宽度随内容撑开：width max-content，下限 max(240px, 100%)，上限 calc(100vw - 48px)；保持 zIndex 1000，可盖过设置面板右沿
- 纵滑容器加 overflowX hidden：只许上下滑动，不许左右滑动；超长字体名仍单行省略（title 悬停看全文）
- 回归：panel-render 加随内容变宽 + 禁横滑断言

## 验证结果
- npm run build 全绿（v2.0.23 产物）
- npm test 171/171 全绿
- npm view dsh-opencode-palette version = 2.0.23，线上 dist.shasum = 本地 tgz sha1

## 哈希
- tgz sha1：d2d5679e914591fe93a1b0664307b5c2441f90b6
