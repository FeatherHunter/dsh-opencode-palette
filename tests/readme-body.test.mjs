// readme-body.test.mjs — 钉住中英首页「主体」的定稿（票 #30 → 落地 #31）与 theme-stories 图的定案
//
// 断言对象是读者最终看到的东西：三份文档当纯文本读、两张 SVG 当文本读，
// 只断字符串与数值，不渲染、不联网（同 readme-head-tail 的 file-text 路子）。
//
// 定稿来源：#30 定稿结论（2026-09-17 用户确认）与 #29 视觉定案 A（色带基线）。
// 三份文档：README.md（中文首页）、docs/README.en.md（英文页）、
//          package/README.md（构建产物 = 英文页去掉 showcase 块，永不手改）。

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const ZH = readFileSync(join(ROOT, 'README.md'), 'utf8')
const EN = readFileSync(join(ROOT, 'docs', 'README.en.md'), 'utf8')
const PKG = readFileSync(join(ROOT, 'package', 'README.md'), 'utf8')
const STORIES_ZH = readFileSync(join(ROOT, 'assets', 'theme-stories-zh.svg'), 'utf8')
const STORIES_EN = readFileSync(join(ROOT, 'assets', 'theme-stories-en.svg'), 'utf8')

// ── 1 · 图：画布尺寸与「26 款 / 7 组 / 7 列图例」的结构定案 ──
// 860 是 GitHub 桌面内容宽，1:1 显示不缩字；高度由内容累加得出（组头 30+10 / 行 54 / 表头 112 / 尾 16）
for (const [name, svg] of [['zh', STORIES_ZH], ['en', STORIES_EN]]) {
  test(`theme-stories（${name}）：860×1812 画布，列图例 7 格、组头 7 条、26 款一行一款`, () => {
    const head = svg.match(/<svg[^>]*>/)[0]
    assert.ok(head.includes('width="860"'), '画布宽度应为 860（GitHub 内容宽，1:1）')
    assert.ok(head.includes('height="1812"'), '画布高度应为 1812（内容累加值）')
    assert.equal(count(svg, 'text-anchor="middle"'), 7, '列图例应为 7 个（背景/文字/主色/强调/错误/警告/成功）')
    assert.equal(count(svg, 'font-size="13" fill="#e8e8ee"'), 7, '组头应为 7 条（中性色组不在策展名单内）')
    assert.equal(count(svg, 'height="30" rx="4"'), 182, '色带格 = 26 款 × 7 格')
    assert.equal(count(svg, 'url(#chess)'), 1, '透明底色主题（lucent-orng）的背景格走棋盘格')
  })
}

// ── 2 · 图：策展名单 26 款不缺不重（rose-pine 键错曾静默丢款） ──
const CURATED = ['tokyonight', 'dracula', 'gruvbox', 'matrix', 'rosepine', 'catppuccin', 'catppuccin-frappe',
  'catppuccin-macchiato', 'solarized', 'synthwave84', 'everforest', 'nord', 'kanagawa', 'nightowl', 'palenight',
  'ayu', 'carbonfox', 'cobalt2', 'aura', 'flexoki', 'zenburn', 'mercury', 'osaka-jade', 'vesper', 'lucent-orng', 'orng']

test('theme-stories：26 款策展名单一款不少（键错会静默丢款，这里必须红）', () => {
  for (const [name, svg] of [['zh', STORIES_ZH], ['en', STORIES_EN]]) {
    const missing = CURATED.filter((id) => !new RegExp('>' + id + '<').test(svg))
    assert.deepEqual(missing, [], `${name} 图缺少策展主题：` + missing.join(', '))
  }
})

test('theme-stories：分组计数合计 26，且中文页显示玫瑰松林（键 rosepine 已修正）', () => {
  const zhCounts = [...STORIES_ZH.matchAll(/>(\d+) 款<\/text>/g)].map((m) => Number(m[1]))
  const enCounts = [...STORIES_EN.matchAll(/>(\d+) themes<\/text>/g)].map((m) => Number(m[1]))
  assert.deepEqual(zhCounts, [3, 1, 2, 5, 12, 2, 1], '中文页组内计数与颜色排序')
  assert.deepEqual(enCounts, [3, 1, 2, 5, 12, 2, 1], '英文页组内计数应与中文页一致')
  assert.equal(zhCounts.reduce((a, b) => a + b, 0), 26, '26 款全在')
  assert.ok(STORIES_ZH.includes('玫瑰松林'), '中文名应能查到（THEME_ZH 键已由 rose-pine 改为 rosepine）')
})

test('theme-stories：过期的「34 themes」不再出现，图片自带 38 款口径', () => {
  for (const [name, svg] of [['zh', STORIES_ZH], ['en', STORIES_EN]]) {
    assert.equal(/34 (themes|款)/.test(svg), false, `${name} 图不应再出现过期的 34`)
    assert.ok(svg.includes('38'), `${name} 图的副标题应保留「38 款」来源口径`)
  }
})

// ── 3 · 图与 README 的引用一一对应 ──
test('assets/ 与 README 引用一一对应：没有引用到已删的图，也没有白生成的图', () => {
  const refs = new Set()
  for (const doc of [ZH, EN]) {
    for (const m of doc.matchAll(/(?:src="|!\[[^\]]*\]\()(\.\.\/)?assets\/([^")\s]+)/g)) refs.add(m[2])
  }
  const onDisk = readdirSync(join(ROOT, 'assets')).filter((f) => /\.(svg|png|css)$/.test(f))
  for (const r of refs) assert.ok(onDisk.includes(r), `README 引用了不存在的资产：${r}`)
  const svgs = onDisk.filter((f) => f.endsWith('.svg'))
  const generated = ['theme-stories-en.svg', 'theme-stories-zh.svg']
  assert.deepEqual(svgs.sort(), generated.slice().sort(), 'assets/ 里的 SVG 应只剩重做后的 theme-stories 两张')
  for (const g of generated) assert.ok(refs.has(g), `生成的图没有被 README 引用：${g}`)
})

// ── 4 · 正文结构定稿：#30 的四个小标题与「新旧标题退役」 ──
test('主体小标题与定稿一致：GUIDE 退役，INSTALL 即三步', () => {
  for (const [name, doc] of [['中文页', ZH], ['英文页', EN], ['包内副本', PKG]]) {
    assert.equal(doc.includes('<sub>GUIDE</sub>'), false, `${name} 不应再有 GUIDE 标题（已并入 INSTALL 三步）`)
    assert.equal(doc.includes('一条命令完成安装'), false, `${name} 不应再有旧标签句`)
    for (const marker of ['<sub>INSTALL</sub>', '<sub>THEMES</sub>', '<sub>EXTENSIONS</sub>', '<sub>UPGRADE</sub>']) {
      assert.ok(doc.includes(marker), `${name} 缺主体标记：${marker}`)
    }
  }
  assert.ok(ZH.includes('<sub>INSTALL</sub><br>三步上手'), '中文标题即三步')
  assert.ok(EN.includes('<sub>INSTALL</sub><br>Get started in three steps'), '英文标题即三步')
  for (const [name, doc] of [['中文页', ZH], ['英文页', EN]]) {
    assert.equal(count(doc, '**①'), 1, `${name} 应恰好一句「① 装」`)
    assert.equal(count(doc, '**②'), 1, `${name} 应恰好一句「② 打开面板」`)
    assert.equal(count(doc, '**③'), 1, `${name} 应恰好一句「③ 点一个主题」`)
  }
})

// ── 5 · 口径定稿：38 = 37 上游 + 原生外观由「图」承担；排印只讲一次 ──
// 用户 2026-09-17 复稿：THEMES 首句精简成一句，不再在正文里铺 37/原生 的口径
// （口径改由 theme-stories 图承担，见本文件第 1-3 组的图断言）。
test('口径：THEMES 正文只留一句，不再复述 37 上游 / 原生外观', () => {
  assert.ok(ZH.includes('38 个入口按色系分组，一搜即切。下图每一格都是一种配色。'),
    '中文数据句应为复稿原文')
  assert.ok(EN.includes('38 entries, grouped by color family and one search away. Every cell in the picture below is a palette.'),
    '英文数据句应为复稿原文')
  for (const [name, doc] of [['中文页', ZH], ['英文页', EN]]) {
    assert.equal(doc.includes('（默认）'), false, `${name} 不应再给 system 标「默认」`)
  }
})

test('排印只讲一次：全部落在 EXTENSIONS 段内', () => {
  const ext = (t) => t.indexOf('<sub>EXTENSIONS</sub>')
  for (const [name, doc, word] of [['中文页', ZH, '排印'], ['英文页', EN, 'typography']]) {
    assert.equal(count(doc.slice(0, ext(doc)), word), 0, `${name} 的 EXTENSIONS 之前不应再出现「${word}」`)
    assert.ok(count(doc.slice(ext(doc)), word) >= 1, `${name} 的 EXTENSIONS 内应讲到「${word}」`)
  }
  // 排印三属性（字体 / 字号 11–18 / 作用范围）只在 EXTENSIONS 第一条出现
  for (const [name, doc, needle] of [['中文页', ZH, '字号 11–18'], ['英文页', EN, '11–18 px']]) {
    assert.equal(count(doc, needle), 1, `${name}「${needle}」应只出现一次`)
    assert.ok(doc.slice(ext(doc)).includes(needle), `${name}「${needle}」应落在 EXTENSIONS 段内`)
  }
})

test('EXTENSIONS：首句不复述上游、不出现「照抄 / 我们加的」这类自贬或卖方口吻', () => {
  for (const [name, doc] of [['中文页', ZH], ['英文页', EN]]) {
    assert.equal(doc.includes('照抄'), false, `${name} 不应再出现「照抄」`)
    assert.equal(doc.includes('我们加的'), false, `${name} 不应再出现「我们加的」`)
    assert.equal(doc.includes('What we add'), false, `${name} 不应再出现 "What we add"`)
  }
  assert.ok(ZH.includes('点一下换配色，不用重调字号和字体。'), '中文 EXTENSIONS 首句应为复稿原文')
  assert.ok(EN.includes('One click swaps the palette; your font size and font stay where you put them.'),
    '英文 EXTENSIONS 首句应为复稿原文')
})

// ── 6 · 中英镜像：主体逐块同形，任一侧多一句就红 ──
function bodyShape(t) {
  const start = t.indexOf('<!-- showcase:start -->')
  const end = t.indexOf('<sub>MORE</sub>')
  return t.slice(start, end).split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map((l) => {
    if (/^<h2/.test(l)) return 'H2:' + (l.match(/<sub>([A-Z]+)<\/sub>/) || [, '?'])[1]
    if (/^<!-- showcase:(start|end) -->$/.test(l)) return 'MARK'
    if (/^<div/.test(l) || l === '</div>') return 'DIV'
    if (/^```/.test(l)) return 'FENCE'
    if (/^\[!\[/.test(l)) return 'BADGE'
    if (/^<img/.test(l)) return 'IMG'
    if (/^\*\*👇/.test(l)) return 'CAPTION'
    if (/^!\[/.test(l)) return 'FIG'
    if (/^<details|^<\/details>/.test(l)) return 'DETAILS'
    if (/^<summary/.test(l)) return 'SUMMARY'
    if (/^\*\*[①②③]/.test(l)) return 'STEP'
    if (/^- /.test(l)) return 'BULLET'
    return 'P'
  })
}

test('主体：中英逐块同形（标题 / 图 / 引导句 / 步骤 / bullet / details 一一对应）', () => {
  const zh = bodyShape(ZH)
  const en = bodyShape(EN)
  assert.deepEqual(zh, en, '中英主体结构应逐块同形，一侧多一句就红')
  assert.equal(zh.filter((x) => x === 'H2:SHOWCASE').length, 1, 'SHOWCASE 应恰好一版')
  assert.equal(zh.filter((x) => x === 'IMG').length, 3, 'showcase 应恰好三张真机截图')
  assert.equal(zh.filter((x) => x === 'STEP').length, 3, 'INSTALL 应是清晰三步')
  assert.equal(zh.filter((x) => x === 'BULLET').length, 3, 'EXTENSIONS 三条 bullet')
  assert.equal(count(ZH, '<details>'), 0, 'UPGRADE 不再有 details（日志与 1.4.x 两段已删）')
  assert.equal(count(EN, '<details>'), 0, '英文页同样没有 details')
})

test('EXTENSIONS 与 THEMES：两段都居左（不再包 align="center" 的 div）', () => {
  for (const [name, doc] of [['中文页', ZH], ['英文页', EN]]) {
    const themes = doc.indexOf('<sub>THEMES</sub>')
    const ext = doc.indexOf('<sub>EXTENSIONS</sub>')
    const upgrade = doc.indexOf('<sub>UPGRADE</sub>')
    assert.ok(themes > -1 && ext > themes && upgrade > ext, `${name} 段落顺序应为 THEMES → EXTENSIONS → UPGRADE`)
    const block = doc.slice(themes, upgrade)
    assert.equal(block.includes('<div'), false, `${name} 的 THEMES + EXTENSIONS 不应再包 div（要居左）`)
  }
})

test('showcase：中英用同一组三张图，英文 alt 不再带过期的 34 themes', () => {
  const zhImgs = [...ZH.matchAll(/<img src="(showcase\/[^"]+)"/g)].map((m) => m[1])
  const enImgs = [...EN.matchAll(/<img src="\.\.\/(showcase\/[^"]+)"/g)].map((m) => m[1])
  assert.equal(zhImgs.length, 3, '中文页 showcase 应三张')
  assert.equal(enImgs.length, 3, '英文页 showcase 应三张')
  // 第 1 张主界面与第 3 张浅色概览：中英分别为对应版本的截图
  assert.ok(zhImgs[0].includes('overview-opencode-zh') && enImgs[0].includes('主页面-en'),
    '第 1 张应各是主界面截图')
  assert.ok(zhImgs[2].includes('overview-tokyonight-zh') && enImgs[2].includes('overview-tokyonight-en'),
    '第 3 张中英应同为 tokyonight 浅色概览')
  assert.equal(/34 themes/.test(EN), false, '英文页不应再出现过期的 34 themes')
  assert.equal(/38 款同款|38 themes\)/.test(ZH), false, '中文页不应再有冗余的「38 款同款」')
})

// ── 工具 ──
function count(t, needle) {
  return t.split(needle).length - 1
}
