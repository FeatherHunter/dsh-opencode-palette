// readme-head-tail.test.mjs — 钉住中英首页的「头部与尾部」定稿（票 #34）
//
// 断言对象是读者最终看到的文档文本：三份文档当纯文本读，只断字符串与链接目标，
// 不联网取 shields 图、不解析 markdown 结构（同 panel-render 的 file-text 路子）。
//
// 定稿来源：#28 定稿结论（2026-09-17 用户确认）。
// 三份文档：README.md（中文首页）、docs/README.en.md（英文页）、
//          package/README.md（构建产物 = 英文页去掉 showcase 块，永不手改）。

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const ZH = readFileSync(join(ROOT, 'README.md'), 'utf8')
const EN = readFileSync(join(ROOT, 'docs', 'README.en.md'), 'utf8')
const PKG = readFileSync(join(ROOT, 'package', 'README.md'), 'utf8')

// 构建脚本里的同一段变换（scripts/build-client.mjs）：英文页去掉 showcase 块
const SHOWCASE_RE = /<!-- showcase:start -->[\s\S]*?<!-- showcase:end -->\r?\n?/

// 头部 = 文件开头到 showcase 标记之前；胶囊行只应出现在这一段里
const headOf = (t) => t.split('<!-- showcase:start -->')[0]
const count = (t, needle) => t.split(needle).length - 1

// ── 五枚胶囊：标签 + 链接目标（#28 定稿；排布与动态/写死选型归 #29）──
const CAPSULES = {
  zh: [
    ['版本', 'https://www.npmjs.com/package/dsh-opencode-palette',
      'https://img.shields.io/npm/v/dsh-opencode-palette?label=%E7%89%88%E6%9C%AC'],
    ['下载量', 'https://www.npmjs.com/package/dsh-opencode-palette',
      'https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fapi.npmjs.org%2Fdownloads%2Fpoint%2Flast-month%2Fdsh-opencode-palette&query=%24.downloads&label=%E4%B8%8B%E8%BD%BD%E9%87%8F&suffix=%2F%E6%9C%88&color=brightgreen'],
    ['最近更新', 'https://github.com/FeatherHunter/dsh-opencode-palette/commits/main',
      'https://img.shields.io/github/last-commit/FeatherHunter/dsh-opencode-palette?label=%E6%9C%80%E8%BF%91%E6%9B%B4%E6%96%B0&color=FE7D37'],
    ['主题包', 'https://github.com/anomalyco/opencode',
      'https://img.shields.io/badge/%E4%B8%BB%E9%A2%98%E5%8C%85-opencode%C2%B738-9D7CD8'],
    ['期待你参与', 'https://github.com/FeatherHunter/dsh-opencode-palette/issues',
      'https://img.shields.io/badge/%E6%9C%9F%E5%BE%85%E4%BD%A0%E5%8F%82%E4%B8%8E-brightgreen.svg'],
  ],
  en: [
    ['npm', 'https://www.npmjs.com/package/dsh-opencode-palette',
      'https://img.shields.io/npm/v/dsh-opencode-palette?label=npm'],
    ['downloads', 'https://www.npmjs.com/package/dsh-opencode-palette',
      'https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fapi.npmjs.org%2Fdownloads%2Fpoint%2Flast-month%2Fdsh-opencode-palette&query=%24.downloads&label=downloads&suffix=%2Fmo&color=brightgreen'],
    ['last-commit', 'https://github.com/FeatherHunter/dsh-opencode-palette/commits/main',
      'https://img.shields.io/github/last-commit/FeatherHunter/dsh-opencode-palette?label=last-commit&color=FE7D37'],
    ['themes', 'https://github.com/anomalyco/opencode',
      'https://img.shields.io/badge/themes-opencode%C2%B738-9D7CD8'],
    ['PRs welcome', 'https://github.com/FeatherHunter/dsh-opencode-palette/issues',
      'https://img.shields.io/badge/PRs%20welcome-brightgreen.svg'],
  ],
}

// 已删、且不许回来：tests（过程指标＋会过期）/ 提交数 / 许可证 / 未来展望
const REMOVED_CAPSULES = [
  'img.shields.io/badge/tests-38%2F38',
  'img.shields.io/badge/license-MIT',
  'github/commit-activity',
  'ROADMAP',
]

const CONTRIBUTORS = ['the-beating-light-of-the-nail', 'xiSage', 'Number444', 'anupamme']

// ── 1 · 五枚胶囊在场，且顺序与链接目标与定稿一致 ──
for (const [lang, table] of Object.entries(CAPSULES)) {
  const doc = lang === 'zh' ? ZH : EN
  test(`胶囊行（${lang}）：五枚按定稿顺序在场，标签与链接目标逐枚对得上`, () => {
    const head = headOf(doc)
    assert.ok(head.length > 0, '头部块应存在（showcase 标记之前）')
    assert.equal(count(head, 'img.shields.io'), 5, '头部应恰好 5 枚胶囊')
    for (const [label, target, img] of table) {
      assert.ok(head.includes(`[![${label}](`), `应有胶囊：${label}`)
      assert.ok(head.includes(img), `「${label}」的图声明应为定稿那一条`)
      assert.ok(head.includes(`](${target})`), `「${label}」应链到 ${target}`)
    }
    // 链接目标按定稿顺序出现，防止两页顺序漂移
    const order = table.map(([, target]) => head.indexOf(`](${target})`))
    assert.deepEqual(order, [...order].sort((a, b) => a - b), '胶囊链接目标应按定稿顺序排列')
  })
}

// ── 2 · 已删的四枚不许回来（两页 + 包内副本） ──
for (const [name, doc] of [['中文页', ZH], ['英文页', EN], ['包内副本', PKG]]) {
  test(`已删胶囊（${name}）：tests / 许可证 / 提交数 / 未来展望都不在场`, () => {
    for (const gone of REMOVED_CAPSULES) {
      assert.equal(doc.includes(gone), false, `${name} 不应再出现：${gone}`)
    }
    assert.equal(/tests-\d+%2F\d+|tests-\d+\/\d+/.test(doc), false, `${name} 不应再有 tests 计数胶囊`)
  })
}

// ── 3 · 英文页删掉多余的第二句卖点；中文页与英文页严格镜像 ──
test('顶部区：英文页删掉第二句卖点，且中英卖点都保留 38 款', () => {
  assert.equal(EN.includes('Easier on the eyes, nicer to code in.'), false, '英文页应删掉第二句卖点')
  assert.equal(PKG.includes('Easier on the eyes, nicer to code in.'), false, '包内副本同样不该有')
  assert.ok(ZH.includes('为长时间编程而生 —— 38 款护眼配色一键换上，眼睛舒服，码字开心。'), '中文卖点应保留且含 38')
  assert.ok(EN.includes('Built for long coding sessions — 38 eye-friendly themes, one click.'), '英文卖点应保留且含 38')
})

test('顶部区：标题、导航、求星句两页都在（求星句沿用 deck 同款）', () => {
  for (const doc of [ZH, EN]) {
    assert.ok(doc.includes('🎨 dsh-opencode-palette'), '标题在场')
    assert.ok(doc.includes('<sub>'), '副标题标记在场')
  }
  assert.ok(ZH.includes('**🌐 [中文](README.md) · [English](docs/README.en.md)**'), '中文页导航在场')
  assert.ok(EN.includes('**🌐 [中文](../README.md) · [English](README.en.md)**'), '英文页导航在场')
  assert.ok(ZH.includes('你的 ⭐ 是我夜空中最亮的星。'), '中文求星句在场')
  assert.ok(EN.includes('Your ⭐ is the brightest star in my night sky.'), '英文求星句在场')
})

// ── 4 · MORE：新增 im-companion 且排在最后；旧两条不动 ──
test('MORE：im-companion 以定稿句排在第三条（旧两条不动）', () => {
  assert.ok(ZH.includes('**[dsh-im-companion](https://github.com/FeatherHunter/dsh-im-companion)** —— 增强dsh-im插件和DSH工作区的能力，给你更优质的用户体验。'),
    '中文 im-companion 一行应为定稿原文')
  assert.ok(EN.includes('**[dsh-im-companion](https://github.com/FeatherHunter/dsh-im-companion)** — Supercharge the dsh-im plugin and DSH workspaces for a better experience.'),
    '英文 im-companion 一行应为定稿原文')
  for (const doc of [ZH, EN, PKG]) {
    const more = doc.indexOf('<sub>MORE</sub>')
    const thanks = doc.indexOf('<sub>THANKS</sub>')
    assert.ok(more > -1 && thanks > more, 'MORE 应在 THANKS 之前')
    const im = doc.indexOf('dsh-im-companion')
    assert.ok(im > more && im < thanks, 'im-companion 应落在 MORE 段内、THANKS 之前')
    assert.ok(doc.indexOf('[dsh-prompt]') < im, '旧两条排在 im 之前')
    assert.ok(doc.indexOf('[dsh-mattpocock-skills-deck]') < im, '旧两条排在 im 之前')
  }
})

// ── 5 · THANKS：四位贡献者（三位 issue + 一位 PR）逐条带 🌹 ──
// 用户 2026-09-17 复稿：「提交一个 Issue，就记一个 🌹」；顺带把唯一的外部 PR 作者记进来，
// 旧口径「0 个 PR / PR 虚位以待」作废，邀请句整句删除。
test('THANKS：四位贡献者按时间序点名，且每人一句 🌹', () => {
  for (const [name, doc] of [['中文页', ZH], ['英文页', EN], ['包内副本', PKG]]) {
    const thanks = doc.indexOf('<sub>THANKS</sub>')
    assert.ok(thanks > -1, `${name} 应有 THANKS 段`)
    // 左对齐长列表：段内用 align="left"，不是居中
    assert.ok(doc.slice(thanks).includes('<div align="left">'), `${name} 的 THANKS 应左对齐`)
    for (const handle of CONTRIBUTORS) {
      assert.ok(doc.slice(thanks).includes(`[@${handle}](https://github.com/${handle})`),
        `${name} 应点名 @${handle}`)
    }
    // 时间序：三条 issue #3 → #11 → #12，PR #32 收尾
    const seq = ['#3 ', '#11 ', '#12 ', '#32 '].map((n) => doc.slice(thanks).indexOf(` ${n}`))
    assert.deepEqual(seq, [...seq].sort((a, b) => a - b), `${name} 应保持 #3 → #11 → #12 → #32 时间序`)
    // 段内每条贡献都带 🌹
    assert.equal(count(doc.slice(thanks), '🌹'), CONTRIBUTORS.length + 1, `${name} 的 THANKS 应每条一句 🌹（含首句）`)
    // 旧口径不许回来：PR 邀请句已整句删除
    assert.equal(doc.includes('PR 虚位以待'), false, `${name} 不应再有「PR 虚位以待」`)
    assert.equal(doc.includes('PRs wanted'), false, `${name} 不应再有 "PRs wanted"`)
  }
  assert.ok(ZH.slice(ZH.indexOf('<sub>THANKS</sub>')).includes('提交一个 Issue，就记一个 🌹 —— 下面这些需求都已经做出来了。'),
    '中文首句应为复稿原文')
  assert.ok(EN.slice(EN.indexOf('<sub>THANKS</sub>')).includes('Every issue gets a 🌹 — everything asked for below is already shipped.'),
    '英文首句应为复稿原文')
})

// ── 6 · CONNECT：issue 入口 + 飞书码 + 备注词（沿用，不新增渠道） ──
test('CONNECT：issue 入口与飞书码沿用，备注词不变', () => {
  assert.ok(ZH.includes('[提交 Issue](https://github.com/FeatherHunter/dsh-opencode-palette/issues)'), '中文 issue 入口在场')
  assert.ok(EN.includes('[open an issue](https://github.com/FeatherHunter/dsh-opencode-palette/issues)'), '英文 issue 入口在场')
  assert.ok(ZH.includes('src="assets/feishu-qr.png"'), '中文页飞书码路径在场')
  assert.ok(EN.includes('src="../assets/feishu-qr.png"'), '英文页飞书码路径在场')
  for (const doc of [ZH, EN, PKG]) {
    assert.ok(doc.includes('`dsh-opencode-palette`'), '备注词 dsh-opencode-palette 在场')
    assert.ok(doc.includes('width="260"'), '飞书码宽度沿用 260')
  }
})

// ── 7 · 包内副本 = 英文页去掉 showcase 块（构建产物，永不手改） ──
test('包内副本：逐字节等于英文页去掉 showcase 块', () => {
  assert.equal(PKG, EN.replace(SHOWCASE_RE, ''), 'package/README.md 应由构建从英文页再生，不得手改')
  assert.equal(PKG.includes('<!-- showcase:start -->'), false, '包内副本不带 showcase 块')
  assert.equal(PKG.includes('showcase/'), false, '包内副本不引用 showcase 截图')
})

// ── 8 · 本轮不动主体：面板词条与主体段落原样 ──
test('面板词条与主体段落未被本轮改动（只动头尾）', () => {
  // 主体小标题仍在（改名/合并是 #30→#31 的事）
  for (const marker of ['<sub>INSTALL</sub>', '<sub>THEMES</sub>', '<sub>EXTENSIONS</sub>', '<sub>UPGRADE</sub>', '<sub>CONNECT</sub>']) {
    assert.ok(ZH.includes(marker), `中文页主体标记应在场：${marker}`)
    assert.ok(EN.includes(marker), `英文页主体标记应在场：${marker}`)
  }
})

// ── 9 · 两页头部逐行同形：镜像的机器可验证形式 ──
// 中文页与英文页的头部应逐行同形（标题 / 导航 / 卖点 / 镜像卖点 / 求星 / 五枚胶囊），
// 任一侧多写或少写一句都会在这里红 —— 这正是英文页必须删掉第二句卖点的原因。
test('顶部区：中英两页头部逐行同形，任一侧多写一句就红', () => {
  const shape = (t) => t.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map((l) => {
    if (/^<h1/.test(l)) return 'H1'
    if (l.includes('🌐')) return 'NAV'
    if (/^\*\*.+\*\*$/.test(l)) return 'BOLD'
    if (/^\*.+\*$/.test(l)) return 'ITALIC'
    if (l.includes('⭐')) return 'STAR'
    if (/^\[!\[/.test(l)) return 'BADGE'
    if (l === '</div>') return '/DIV'
    if (l.startsWith('<div')) return 'DIV'
    return 'OTHER:' + l.slice(0, 30)
  })
  const zh = shape(headOf(ZH))
  const en = shape(headOf(EN))
  assert.deepEqual(zh, en, '两页头部应逐行同形')
  assert.equal(zh.filter((x) => x === 'BADGE').length, 5, '镜像的胶囊数应为 5')
  assert.equal(zh.filter((x) => x === 'BOLD').length, 1, '每页只有一句卖点')
  assert.equal(zh.filter((x) => x === 'ITALIC').length, 1, '另一语言的卖点各一句，不许多')
})
