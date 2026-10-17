# v2.1.3 — 新增库洛米 IP 预设主题

## 改了什么
- **新增库洛米常驻胶囊 `kuromi`（#97）**：`src/custom-presets/kuromi.json`（light，37 色），IP 预置第二来源 20 → **21 套**；编辑器「选基底」与外层自定义区胶囊可用，不进内置 `themeNames`/`countStatic`（内置 38 不动）。随包 bundle 已内联（`package/lib/client.js` 含 kuromi）。
- 随包依赖无变化：`dsh-plugin-update` 0.18.11、`dsh-log` 0.3.4（与 2.1.2 同）。
- 版本 2.1.2 → 2.1.3（patch）

## 验证结果
- `node scripts/check-deps.mjs`（构建前置硬门禁）四列全跟平：dsh-plugin-update 0.18.11 / 0.18.11 / 0.18.11 / 0.18.11；dsh-log 0.3.4 / 0.3.4 / 0.3.4 / 0.3.4。
- `npm run build` 绿（`package/lib/client.js` 1445341 B、`client.js` 动态版 1444760 B、`package/lib/index.js` 23275 B）；`npm test` **265/265 全绿**（0 fail / 0 cancelled / 0 skipped）。
- `npm pack`（在 package/ 内）7 files：README.md、cordis.patch.yml、lib/channel.mjs、lib/client.js、lib/event-list.json、lib/index.js、package.json；包内 version=2.1.3、dependencies 双写（0.3.4 / 0.18.11）、`PALETTE_VERSION = '2.1.3'`。
- 线上：`npm view dsh-opencode-palette version` = **2.1.3**、`dist-tags.latest` = **2.1.3**，`dist.shasum` = `9aa414315e12a971056e44c48abb325ecab10330`（与本地 tgz sha1 逐字符相同；token 通道受理后约 2 分半可见）。

## 哈希
- tgz sha1：9aa414315e12a971056e44c48abb325ecab10330
- tgz sha256：f52983891cac0fb2575a3dd4bdc0059fb61572cf9c9ecbf252592da0babb0e8e
