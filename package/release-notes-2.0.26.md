# v2.0.26 — 更新系统跟到 0.10.0（#72）+ 日志 0.2.2

## 改了什么
- dsh-plugin-update ^0.8.0→^0.10.0（超范围，#72 单票最小跟随）：单入口挂载不变；换肤补 newText（有新版红，0.7.1）与 newOkText（done 行新版绿，0.9.0），与 badText/okText 同色；待重启去 primary 与文案收敛跟包走
- dsh-log 0.2.1→0.2.2（门禁硬要求才顺带：resident info 事件开关关闭时仍常驻，host 侧 API 不变）
- 版本 2.0.25→2.0.26（patch）

## 验证结果
- node scripts/check-deps.mjs 双绿（两包本地/已装/产物/最新一致）
- npm test 178/178 全绿
- npm view dsh-opencode-palette version = 2.0.26，线上 dist.shasum = 本地 tgz sha1

## 哈希
- tgz sha1：2b4c3bd295d74864e7c22c56d7ddae8975876d73
