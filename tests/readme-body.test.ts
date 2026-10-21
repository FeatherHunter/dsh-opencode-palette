// readme-body.test.ts — 钉住中英首页「主体」的定稿（票 #30 → 落地 #31）与 theme-stories 图的定案
//
// 断言对象是读者最终看到的东西：三份文档当纯文本读、两张 SVG 当文本读，
// 只断字符串与数值，不渲染、不联网（同 readme-head-tail 的 file-text 路子）。
//
// 定稿来源：#30 定稿结论（2026-09-17 用户确认）与 #29 视觉定案 A（色带基线）。
// 三份文档：README.md（中文首页）、docs/README.en.md（英文页）、
//          package/README.md（构建产物 = 英文页去掉 showcase 块，永不手改）。

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { inflateSync } from 'node:zlib'

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
    const head = /<svg[^>]*>/.exec(svg)
    assert.ok(head, 'theme-stories 应含根 <svg> 标签')
    assert.ok(head[0].includes('width="860"'), '画布宽度应为 860（GitHub 内容宽，1:1）')
    assert.ok(head[0].includes('height="1812"'), '画布高度应为 1812（内容累加值）')
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
  const refs = new Set<string>()
  for (const doc of [ZH, EN]) {
    for (const m of doc.matchAll(/(?:src="|!\[[^\]]*\]\()(\.\.\/)?assets\/([^")\s]+)/g)) refs.add(m[2])
  }
  const onDisk = readdirSync(join(ROOT, 'assets')).filter((f) => /\.(svg|png|css)$/.test(f))
  for (const r of refs) assert.ok(onDisk.includes(r), `README 引用了不存在的资产：${r}`)
  const svgs = onDisk.filter((f) => f.endsWith('.svg'))
  const generated = ['theme-stories-en.svg', 'theme-stories-zh.svg']
  assert.deepEqual(svgs.sort(), generated.slice().sort(), 'assets/ 里的 SVG 应只剩重做后的 theme-stories 两张')
  for (const g of generated) assert.ok(existsSync(join(ROOT, 'assets', g)), `生成的图不在磁盘上：${g}`)
  // 2026-10-21：用户判定「主题专区」没必要 → THEMES 段连那张色带 SVG 一起退役，图只留在 assets/ 当素材库。
  // 所以这两张 SVG 不再要求被 README 引到（它们仍由 scripts/generate-assets.ts 生成、另有内容门禁钉着）；
  // PNG 那一半不变：张张都要被引到，白生成的 PNG 一律要红。
  // 2026-10-21：assets/ 里的每一张 PNG 都必须被 README 引到（新增十张真机截图全部进了 showcase 网格）。
  // 以前只断言了 SVG 那一半，多出来的 PNG 会静静躺在仓库里没人看见 —— 这里补齐另一半。
  const pngs = onDisk.filter((f) => f.endsWith('.png')).sort()
  const unused = pngs.filter((p) => !refs.has(p))
  assert.deepEqual(unused, [], 'assets/ 里的 PNG 没有被任何 README 引用（白生成的图）：')
})

// ── 4 · 正文结构定稿：#30 的四个小标题与「新旧标题退役」 ──
test('主体小标题与定稿一致：GUIDE 退役，INSTALL 即三步', () => {
  for (const [name, doc] of [['中文页', ZH], ['英文页', EN], ['包内副本', PKG]]) {
    assert.equal(doc.includes('<sub>GUIDE</sub>'), false, `${name} 不应再有 GUIDE 标题（已并入 INSTALL 三步）`)
    assert.equal(doc.includes('一条命令完成安装'), false, `${name} 不应再有旧标签句`)
    for (const marker of ['<sub>INSTALL</sub>', '<sub>EXTENSIONS</sub>', '<sub>UPGRADE</sub>']) {
      assert.ok(doc.includes(marker), `${name} 缺主体标记：${marker}`)
    }
    // 2026-10-21：THEMES 段退役（连主题专区那张色带 SVG 一起），「38 = 37 上游 + 跟随系统」的口径
    // 改由 SHOWCASE 段首句承担。退役即钉死：谁把主题专区加回来，这条要红。
    assert.equal(doc.includes('<sub>THEMES</sub>'), false, `${name} 不应再有 THEMES 标题（主题专区已退役）`)
  }
  assert.ok(ZH.includes('<sub>INSTALL</sub><br>三步上手'), '中文标题即三步')
  assert.ok(EN.includes('<sub>INSTALL</sub><br>Get started in three steps'), '英文标题即三步')
  for (const [name, doc] of [['中文页', ZH], ['英文页', EN]]) {
    assert.equal(count(doc, '**①'), 1, `${name} 应恰好一句「① 装」`)
    assert.equal(count(doc, '**②'), 1, `${name} 应恰好一句「② 打开面板」`)
    assert.equal(count(doc, '**③'), 1, `${name} 应恰好一句「③ 点一个主题」`)
  }
})

// ── 4b · 所有图片引用都必须在磁盘上真实存在（门禁盲区补丁）──
// 复现过的真实事故：7729916 把中文页第 3 张图改引到 showcase/overview-tokyonight-zh.png，
// 而那个文件从未存在过 → GitHub 上直接裂图。原来的门禁只校验 assets/ 的引用，
// showcase/ 从来没被校验，所以这条坏引用一路放行。这里改成「按文档逐条解析并 stat」。
test('图片引用存在性：三份文档里的每个 <img src> / ![..]() 都必须落地到真实文件', () => {
  const DOCS = [['README.md', ZH], ['docs/README.en.md', EN], ['package/README.md', PKG]]
  const refs: { docPath: string; raw: string; dir: string }[] = []
  for (const [docPath, text] of DOCS) {
    const dir = dirname(join(ROOT, docPath))
    for (const m of text.matchAll(/<img\s+src="([^"]+)"/g)) refs.push({ docPath, raw: m[1], dir })
    for (const m of text.matchAll(/!\[[^\]]*\]\(([^)\s]+)\)/g)) refs.push({ docPath, raw: m[1], dir })
  }
  assert.ok(refs.length >= 6, `应解析出至少 6 条图片引用，实为 ${refs.length}（正则失效会静默放过坏引用）`)
  const missing: string[] = []
  for (const { docPath, raw, dir } of refs) {
    if (/^https?:\/\//.test(raw)) continue
    const abs = resolve(dir, raw)
    if (!existsSync(abs)) missing.push(`${docPath} → ${raw}`)
  }
  assert.deepEqual(missing, [], '以下图片引用指向不存在的文件（GitHub 上会裂图）：\n' + missing.join('\n'))
})

// ── 5 · 口径定稿：SHOWCASE 段首不再铺「38 = 37 上游 + 跟随系统」──
// 用户 2026-09-17 复稿：THEMES 首句精简成一句，不再在正文里铺 37/原生 的口径
// （口径原由 theme-stories 图承担，见本文件第 1-3 组的图断言）。
// 2026-10-19 全篇文案重写（用户逐段确认）：首句与 EXTENSIONS 三条的措辞随之改写，
// 断言跟着新定稿走 —— 门禁盯的是「定稿那句不许被顺手改掉」，不是某几个旧字面量。
// 2026-10-21 主题专区退役：THEMES 段与色带图一起删掉，那句口径并进 SHOWCASE 段首。
// 2026-10-21 用户判定该句为废话 → 整句删除；「38 款」的口径改由头部卖点句与徽章承担。
// 门禁改成「不许回潮」：旧句回来看得见，38 的口径也没丢。
test('口径：SHOWCASE 段首不再铺「38 = 37 上游 + 跟随系统」那句（已删，不许回潮）', () => {
  assert.equal(ZH.includes('38 个入口按色系排好，搜名字就能切'), false, '中文那句已删')
  assert.equal(ZH.includes('剩下那一款叫「跟随系统」'), false, '中文那句已删')
  assert.equal(EN.includes('38 entries lined up by color family'), false, '英文那句已删')
  assert.equal(EN.includes('the last one is called “System”'), false, '英文那句已删')
  // 「38 款」的口径仍在头部卖点和徽章里（别把整体删没）
  assert.ok(ZH.includes('**38 款配色，一键给 DSH 换装。**'), '中文卖点句仍在')
  assert.ok(EN.includes('**38 themes for DSH, one click.**'), '英文卖点句仍在')
  for (const [name, doc] of [['中文页', ZH], ['英文页', EN]]) {
    assert.equal(doc.includes('（默认）'), false, `${name} 不应再给 system 标「默认」`)
  }
})

test('字体话题只讲一次：全部落在 EXTENSIONS 段内', () => {
  const ext = (t: string): number => t.indexOf('<sub>EXTENSIONS</sub>')
  // 英文页正文里是 "monospace"（含 "monospaced"），所以这里统一小写后比，避免被大小写绊倒
  for (const [name, doc, word] of [['中文页', ZH, '等宽'], ['英文页', EN, 'monospace']]) {
    const lower = (t: string): string => t.toLowerCase()
    assert.equal(count(lower(doc.slice(0, ext(doc))), word), 0, `${name} 的 EXTENSIONS 之前不应再出现「${word}」`)
    assert.ok(count(lower(doc.slice(ext(doc))), word) >= 1, `${name} 的 EXTENSIONS 内应讲到「${word}」`)
  }
  // 排印三属性（字体 / 字号 11–24 / 作用范围）只在 EXTENSIONS 段内讲一次（2026-10-21 起落在第三条）
  for (const [name, doc, needle] of [['中文页', ZH, '字号 11–24'], ['英文页', EN, '11–24 px']]) {
    assert.equal(count(doc, needle), 1, `${name}「${needle}」应只出现一次`)
    assert.ok(doc.slice(ext(doc)).includes(needle), `${name}「${needle}」应落在 EXTENSIONS 段内`)
  }
})

test('EXTENSIONS：不自贬也不摆卖方口吻，且是「IP 胶囊」+「专属胶囊」+「字体字号」三条', () => {
  const extBlock = (t: string): string => t.slice(t.indexOf('<sub>EXTENSIONS</sub>'), t.indexOf('<sub>UPGRADE</sub>'))
  for (const [name, doc] of [['中文页', ZH], ['英文页', EN]]) {
    assert.equal(doc.includes('照抄'), false, `${name} 不应再出现「照抄」`)
    assert.equal(doc.includes('我们加的'), false, `${name} 不应再出现「我们加的」`)
    assert.equal(doc.includes('What we add'), false, `${name} 不应再出现 "What we add"`)
    // 2026-09-18 用户删掉了「点一下换配色…」那句与「随时反悔」那条。
    // 注意：只在 EXTENSIONS 段内断言 —— SHOWCASE 里讲上游「原生外观」那一处是合法提及，
    // 全页禁止会误伤（第一版就误判过一次）。
    const block = extBlock(doc)
    assert.equal(block.includes('点一下换配色'), false, `${name} 不应再有「点一下换配色…」这句`)
    assert.equal(block.includes('One click swaps the palette'), false, `${name} 不应再有该句英文`)
    assert.equal(block.includes('随时反悔'), false, `${name}「随时反悔」应已删除`)
    assert.equal(/native look/i.test(block), false, `${name} 的 EXTENSIONS 不应再有 "native look" 那条`)
  }
  assert.ok(ZH.includes('<sub>EXTENSIONS</sub><br>OpenCode 主题之外提供的功能'), '中文小标题应为复稿原文（品牌已按上游 OpenCode 转正）')
  assert.ok(EN.includes('<sub>EXTENSIONS</sub><br>What the OpenCode themes come with'), '英文小标题应为复稿原文（品牌已按上游 OpenCode 转正）')
  // 2026-10-21 用户重写三条：原「字体单独调 / 面板跟得上 DSH 的语言 / 自己配色」判为废话，
  // 改成核心支持三件事：预置 IP 主题胶囊、打造专属主题胶囊、字体与字号自选。
  // 同日排版定稿（B 方案）：EXTENSIONS 段改成**纯 markdown 表格三行卡片**（标题 | 说明），
  // 不再是三段粗体引导句 —— 门禁跟着改成钉表格骨架 + 卡片标题，旧句式不许回潮。
  // 再定：图标列（| 💊 |）太丑，用户判删 —— 表格改成两列，💊 留在标题行内。
  const CARDS = [
    ['**IP 主题胶囊 💊**', '**IP theme capsules 💊**', 'IP 胶囊预置'],
    ['**打造专属胶囊 💊**', '**Build your own capsule 💊**', '专属胶囊'],
    ['**字体与字号**', '**Fonts and size**', '字体与字号'],
  ] as const
  for (const [zh, en, label] of CARDS) {
    assert.equal(count(extBlock(ZH), zh), 1, `中文应有「${label}」一张卡片标题`)
    assert.equal(count(extBlock(EN), en), 1, `英文应有「${label}」一张卡片标题`)
  }
  // 表格骨架：EXTENSIONS 段恰好一张 markdown 表（表头 + 分隔行 + 三行卡片），
  // 每张卡片两格：标题（粗体）| 说明 —— 图标列已删。
  for (const [name, doc] of [['中文页', ZH], ['英文页', EN]] as const) {
    const rows = extBlock(doc).split(/\r?\n/).map((l) => l.trim()).filter((l) => l.startsWith('|'))
    assert.equal(rows.length, 5, `${name} 的 EXTENSIONS 应是「表头 + 分隔行 + 三行卡片」共 5 行表格`)
    assert.ok(/^\|[\s|:-]+\|$/.test(rows[1]), `${name} 表格第二行应是分隔行`)
    for (const row of rows.slice(2)) {
      const cells = row.split('|').map((c) => c.trim()).filter((c) => c !== '')
      assert.equal(cells.length, 2, `${name} 卡片行应两格（标题 | 说明）：${row}`)
      assert.ok(/^\*\*[^*]+\*\*$/.test(cells[0]), `${name} 卡片首格应是粗体标题：${row}`)
    }
    // 图标列不许回潮（2026-10-21 用户判「太丑」，整列删掉）
    assert.equal(/^\|\s*\p{Extended_Pictographic}\s*\|/mu.test(extBlock(doc)), false, `${name} 不应再有图标列`)
  }
  // 旧三条不许回潮（连同 2026-10-21 那版粗体引导句）
  for (const gone of ['**字体单独调。**', '**面板跟得上 DSH 的语言。**', '**自己配色。**', '**IP 主题胶囊 💊 预置 25 套。**', '**打造自己的专属主题胶囊 💊。**', '**字体与字号自己挑。**']) {
    assert.equal(ZH.includes(gone), false, `中文不应再有「${gone}」`)
  }
  for (const gone of ['**Fonts on their own.**', '**A panel that speaks your DSH.**', '**Your own palette.**', '**25 IP theme capsules 💊 preinstalled.**', '**Build your own capsule 💊.**', '**Fonts and size, your call.**']) {
    assert.equal(EN.includes(gone), false, `英文不应再有「${gone}」`)
  }
  // v2.1.7 事实：37 色位编辑器 + 微缩预览双向定位 + 25 IP 预置基底（含库洛米、原神 / 马里奥 / 火影忍者 / 新世纪福音战士的明暗双册）+ 单文件落盘路径
  assert.ok(extBlock(ZH).includes('37 个色位'), '中文该条应讲到 37 个色位')
  assert.ok(extBlock(EN).includes('37 slots'), '英文该条应讲到 37 个色位')
  for (const [name, block] of [['中文页', extBlock(ZH)], ['英文页', extBlock(EN)]]) {
    assert.ok(block.includes('25'), `${name} 该条应讲到 25 个 IP 预置基底`)
    assert.ok(block.includes('<DSH_HOME>/opencode-palette/custom-themes/'), `${name} 该条应写明自定义主题落盘根路径`)
  }
})

// ── 5b · UPGRADE：面板里的「检查更新」入口（2026-10-21 用户把长段判为废话）──
// 定稿只剩一行指路：「设置 → 插件 → OpenCode调色板」 → **检查更新**。
test('UPGRADE：面板内升级入口只剩一行指路，长段不许回潮', () => {
  assert.ok(ZH.includes('「设置 → 插件 → OpenCode调色板」 → **检查更新**'), '中文应为定稿原文')
  assert.ok(EN.includes('Settings → Plugins → OpenCode Palette → **Check for updates**'), '英文应为定稿原文')
  for (const [name, doc] of [['中文页', ZH], ['英文页', EN]]) {
    assert.equal(doc.includes('不想敲命令'), false, `${name} 不应再有「不想敲命令」那句`)
    assert.equal(doc.includes("Don't want to type commands"), false, `${name} 不应再有该句英文`)
  }
})

// ── 5c · UPGRADE：两个 profile + 活的版本号（2026-10-21 用户定）──
// 用户要求这段「实时放最新的版本号」，并同时给 desktop 与 web 两个 profile。
// 「实时」靠派生而不是靠人记得改：README 里的版本号必须等于 package.json 的版本，
// 发布改号时由 scripts/sync-readme-version.ts 刷新（npm run readme:version）。
// 这里离线可查（不联网），版本号一过期就红。
test('UPGRADE：命令同时给 web 与 desktop 两个 profile，版本号是活的（= package.json 版本）', () => {
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')) as { version: string }
  const v = pkg.version.replace(/\./g, '\\.')
  const upgradeBlock = (t: string): string => t.slice(t.indexOf('<sub>UPGRADE</sub>'), t.indexOf('<sub>MORE</sub>'))
  for (const [name, doc] of [['中文页', ZH], ['英文页', EN]] as const) {
    const block = upgradeBlock(doc)
    assert.ok(block.includes('--profile web'), `${name} 应给 web profile 的命令`)
    assert.ok(block.includes('--profile desktop'), `${name} 应给 desktop profile 的命令`)
    assert.equal(block.includes('<版本>'), false, `${name} 不应留「<版本>」占位符`)
    assert.equal(block.includes('<version>'), false, `${name} 不应留「<version>」占位符`)
    assert.ok(block.includes(`dsh-opencode-palette@${pkg.version}`), `${name} 应写明当前版本 ${pkg.version}`)
    assert.ok(new RegExp(`(当前|currently)\\s*${v}`).test(block), `${name} 的注释里应写明当前版本 ${pkg.version}`)
  }
})

// ── 6 · 中英镜像：主体逐块同形，任一侧多一句就红 ──
function bodyShape(t: string): string[] {
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
  assert.equal(zh.filter((x) => x === 'IMG').length, 0, 'showcase 截图必须走 markdown 语法：市场详情页的渲染器把原始 HTML 整段丢弃，<img> 在那边一张都不显示')
  assert.equal(zh.filter((x) => x === 'FIG').length, 0, '正文不再有独立成行的图片：2026-10-21 起 showcase 截图走两栏 markdown 表格（图片行以 `|` 开头），THEMES 的色带图随主题专区一起退役')
  assert.equal(zh.filter((x) => x === 'STEP').length, 3, 'INSTALL 应是清晰三步')
  assert.equal(zh.filter((x) => x === 'BULLET').length, 0, 'EXTENSIONS 与 UPGRADE 都已不用 bullet（2026-09-18 起主体内应无 `- ` 列表项）')
  assert.equal(count(ZH, '<details>'), 0, 'UPGRADE 不再有 details（日志与 1.4.x 两段已删）')
  assert.equal(count(EN, '<details>'), 0, '英文页同样没有 details')
})

test('EXTENSIONS 段居左（不再包 align="center" 的 div），且排在 INSTALL 之后', () => {
  for (const [name, doc] of [['中文页', ZH], ['英文页', EN]]) {
    const install = doc.indexOf('<sub>INSTALL</sub>')
    const ext = doc.indexOf('<sub>EXTENSIONS</sub>')
    const upgrade = doc.indexOf('<sub>UPGRADE</sub>')
    assert.ok(install > -1 && ext > install && upgrade > ext, `${name} 段落顺序应为 INSTALL → EXTENSIONS → UPGRADE`)
    const block = doc.slice(ext, upgrade)
    assert.equal(block.includes('<div'), false, `${name} 的 EXTENSIONS 不应再包 div（要居左）`)
  }
})

// ── 6a · showcase 段首标语（2026-10-21 用户定稿）──
// 用户给的定稿块：原句 → 一条分隔线 --- → 标语「本插件为您有更好的DSH体验而生💗」。
// 同日用户又判原句（「一天十来个小时盯屏幕…会好受些。」）为废话 → 整句删除，不许回潮。
// 门禁盯三样：分隔线在（独立成行）、标语在且落在分隔线之后、旧原句不回潮。
test('showcase 段首：分隔线 + 「本插件为您有更好的DSH体验而生💗」标语（旧原句已删，不许回潮）', () => {
  assert.equal(ZH.includes('一天十来个小时盯屏幕，眼睛发涩是常事。换一套温和点的配色，会好受些。'), false, '中文旧原句应已删除')
  assert.equal(EN.includes('Ten-plus hours of screen time a day, eyes going blurry is normal. A gentler palette feels better.'), false, '英文旧原句应已删除')
  assert.ok(ZH.includes('本插件为您有更好的DSH体验而生💗'), '中文标语应在')
  assert.ok(EN.includes('This plugin exists to make your DSH experience better 💗'), '英文标语应在')
  for (const [name, doc] of [['中文页', ZH], ['英文页', EN]] as const) {
    const show = doc.slice(doc.indexOf('<!-- showcase:start -->'), doc.indexOf('<!-- showcase:end -->'))
    const sep = show.search(/^---$/m)
    assert.ok(sep > -1, `${name} 的 showcase 段应有独立成行的分隔线 ---`)
    assert.ok(show.indexOf('💗') > sep, `${name} 的标语应落在分隔线之后`)
  }
})

// ── 6b · showcase 网格（2026-10-21 定稿）：两栏平分，一行两张 ──
// 布局定案的来由：GitHub 经典做法是 HTML <table>+width="50%"，但市场详情页的渲染器
// 整段丢弃原始 HTML（那边一张图都不显示）。纯 markdown 的两栏表格两边都活着，
// 且实测两边都是精确 50/50（GitHub 430/860，市场 496/992），图各自缩进自己那一半。
interface GridCell { label: string; image: string; file: string }

function showcaseGrid(docPath: string, doc: string): GridCell[][] {
  const block = doc.slice(doc.indexOf('<!-- showcase:start -->'), doc.indexOf('<!-- showcase:end -->'))
  const dir = dirname(join(ROOT, docPath))
  const tables: GridCell[][] = []
  let header: string[] | null = null
  for (const raw of block.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line.startsWith('|')) { header = null; continue }
    const cells = line.replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim())
    if (cells.every((c) => /^:?-{2,}:?$/.test(c))) continue // 分隔行
    const imgs = cells.map((c) => {
      const m = /!\[[^\]]*\]\(([^)\s]+)\)/.exec(c)
      return m ? m[1] : null
    })
    if (imgs.every((i) => i === null)) { header = cells; continue } // 表头（标签行）
    tables.push(cells.map((label, i) => {
      const image = imgs[i] as string
      return { label: header ? (header[i] ?? '') : '', image, file: resolve(dir, image) }
    }))
  }
  return tables
}

const ZH_GRID_EXPECTED = [
  'assets/opencode.png', 'assets/设置页面.png', 'assets/自定义编辑器.png', 'assets/原神.png', 'assets/库洛米.png',
  'assets/哆啦A梦.png', 'assets/哈利波特.png', 'assets/赛博朋克2077.png', 'assets/德古拉.png', 'assets/龙珠.png',
]
const EN_GRID_EXPECTED = [
  '../showcase/opencode调色板opencode风格主页面-en.png', '../showcase/settings-opencode-en.png',
  '../assets/自定义编辑器.png', '../assets/原神.png', '../assets/库洛米.png', '../assets/哆啦A梦.png',
  '../assets/哈利波特.png', '../assets/赛博朋克2077.png', '../assets/德古拉.png', '../assets/龙珠.png',
]

test('showcase 网格：中英各五张表、一行两张，图片全部落到真实文件', () => {
  for (const [docPath, doc, expected] of [
    ['README.md', ZH, ZH_GRID_EXPECTED],
    ['docs/README.en.md', EN, EN_GRID_EXPECTED],
  ] as const) {
    const tables = showcaseGrid(docPath, doc)
    assert.equal(tables.length, 5, `${docPath} 的 showcase 应恰好五张两栏表`)
    const imgs = tables.flat()
    assert.equal(imgs.length, 10, `${docPath} 的 showcase 应恰好十张图`)
    for (const row of tables) {
      assert.equal(row.length, 2, `${docPath} 每行应恰好两张图（左右平分）`)
      for (const cell of row) {
        assert.ok(cell.image, `${docPath} 网格里有一格没有图片`)
        assert.ok(existsSync(cell.file), `${docPath} 网格里的图不存在：${cell.image}`)
        assert.ok(cell.label.trim(), `${docPath} 网格里有一格没有标签（表头必须给每列起名）`)
      }
    }
    assert.deepEqual(imgs.map((c) => c.image), expected, `${docPath} 网格的图片清单与定稿不一致`)
  }
})

// 浅色 / 深色标注必须与图的实测亮度相符 —— 这条门禁替掉了旧版「showcase 段不许出现浅色」的
// 一刀切禁令（那时三张图实测全是深色，一刀切成立）。现在图里有真有浅色，禁令就变成了说谎；
// 所以改成真解码 PNG 量一遍平均亮度：标浅色的必须真的亮，标深色的必须真的暗。
// 判尺：亮度 0–255（Rec.709 加权），实测浅色四张 220.8 / 225.2 / 230.4 / 234.5，
// 深色三张 19.6 / 25.2 / 33.6 / 46.7，中间空档很大，阈值取 120 两边都不挨边。
const LUMA_THRESHOLD = 120
const lumaCache = new Map<string, number>()

function meanLuma(file: string): number {
  const cached = lumaCache.get(file)
  if (cached !== undefined) return cached
  const value = pngMeanLuma(file)
  lumaCache.set(file, value)
  return value
}

test('showcase：浅色 / 深色标注与图的实测亮度相符（真解码 PNG 量，不靠人眼）', () => {
  const zh = showcaseGrid('README.md', ZH).flat()
  const en = showcaseGrid('docs/README.en.md', EN).flat()
  let labeled = 0
  for (const [side, cells] of [['中文页', zh], ['英文页', en]] as const) {
    for (const cell of cells) {
      const light = /浅色|\(light\)|\blight\b/i.test(cell.label)
      const dark = /深色|\(dark\)|\bdark\b/i.test(cell.label)
      if (!light && !dark) continue
      assert.ok(!(light && dark), `${side} 同一格里既说浅色又说深色：${cell.label}`)
      labeled++
      const luma = meanLuma(cell.file)
      if (light) assert.ok(luma > LUMA_THRESHOLD, `${side} 标了浅色但图实测偏暗（luma=${luma.toFixed(1)}）：${cell.image}`)
      else assert.ok(luma < LUMA_THRESHOLD, `${side} 标了深色但图实测偏亮（luma=${luma.toFixed(1)}）：${cell.image}`)
    }
  }
  assert.equal(labeled, 14, '七款主题（IP 胶囊六款 + 经典主题德古拉）× 中英两页 = 十四条明暗标注')
  // IP 主题胶囊六款每款都要标明明暗，否则读者分不出哪张是浅色底
  for (const [side, cells] of [['中文页', zh], ['英文页', en]] as const) {
    const ip = cells.filter((c) => /IP (主题胶囊|theme capsule)/.test(c.label))
    assert.equal(ip.length, 6, `${side} 应恰好六款 IP 主题胶囊各占一格`)
    for (const cell of ip) {
      assert.ok(/浅色|深色|\(light\)|\(dark\)/i.test(cell.label), `${side} 的 IP 主题胶囊没标明明暗：${cell.label}`)
    }
  }
  // 2026-10-21：德古拉是内置的经典主题（src/themes/dracula.json），不是 IP 预置 ——
  // 之前那一格标成「IP 预置：德古拉」是错的，这里钉住「经典主题 / classic theme」。
  for (const [side, cells] of [['中文页', zh], ['英文页', en]] as const) {
    const dracula = cells.filter((c) => /德古拉/.test(c.label))
    assert.equal(dracula.length, 1, `${side} 应恰好一格是德古拉`)
    assert.ok(/经典主题|classic theme/i.test(dracula[0].label), `${side} 德古拉那格应标成经典主题，不是 IP 胶囊：${dracula[0].label}`)
    assert.equal(/IP (主题胶囊|theme capsule)/.test(dracula[0].label), false, `${side} 德古拉不应再被标成 IP 主题胶囊`)
  }
})

test('showcase 段不再有过期口径（34 themes / full light coverage / 浅色主题同样完整覆盖）', () => {
  const zhShow = ZH.slice(ZH.indexOf('<!-- showcase:start -->'), ZH.indexOf('<!-- showcase:end -->'))
  const enShow = EN.slice(EN.indexOf('<!-- showcase:start -->'), EN.indexOf('<!-- showcase:end -->'))
  assert.equal(/34 themes/.test(EN), false, '英文页不应再出现过期的 34 themes')
  assert.equal(/38 款同款|38 themes\)/.test(ZH), false, '中文页不应再有冗余的「38 款同款」')
  assert.equal(zhShow.includes('浅色主题同样完整覆盖'), false, '中文页不应再自称浅色主题完整覆盖')
  assert.equal(enShow.includes('full light coverage'), false, '英文页不应再自称 full light coverage')
  // 2026-10-21：新图里有真的浅色截图，所以「浅色」这个说法本身不再是禁令 ——
  // 它的真假由上面那条实测亮度门禁逐格判。
  assert.equal(/浅色/.test(zhShow) && !/IP 主题胶囊/.test(zhShow), false, '中文页的浅色说法只应出现在 IP 主题胶囊的明暗标注上')
})

// ── 工具 ──
function count(t: string, needle: string): number {
  return t.split(needle).length - 1
}

/**
 * 极简 PNG 解码 + 平均亮度：只为量一件事 —— 这张图到底亮还是暗。
 *
 * 只支持 8bit RGBA、非隔行：assets/ 里十张新截图实测全是这个形态
 * （depth=8 / ctype=6 / interlace=0），别的形态直接报错，不猜。
 * 解完全图后按网格抽样，算 Rec.709 加权亮度（0–255）。
 */
function pngMeanLuma(file: string): number {
  const buf = readFileSync(file)
  assert.equal(buf.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', `不是 PNG：${file}`)
  let off = 8
  let width = 0
  let height = 0
  let bitDepth = 0
  let colorType = 0
  let interlace = 0
  const idat: Buffer[] = []
  while (off + 8 <= buf.length) {
    const len = buf.readUInt32BE(off)
    const type = buf.toString('ascii', off + 4, off + 8)
    const data = buf.subarray(off + 8, off + 8 + len)
    if (type === 'IHDR') {
      width = data.readUInt32BE(0)
      height = data.readUInt32BE(4)
      bitDepth = data[8]
      colorType = data[9]
      interlace = data[12]
    } else if (type === 'IDAT') idat.push(data)
    else if (type === 'IEND') break
    off += 12 + len
  }
  assert.equal(bitDepth, 8, `只支持 8bit 位深：${file}`)
  assert.equal(colorType, 6, `只支持 RGBA（ctype=6）：${file}`)
  assert.equal(interlace, 0, `不支持隔行 PNG：${file}`)
  const raw = inflateSync(Buffer.concat(idat))
  const bpp = 4
  const stride = width * bpp
  const out = Buffer.alloc(height * stride)
  let pos = 0
  for (let y = 0; y < height; y++) {
    const filter = raw[pos++]
    const line = raw.subarray(pos, pos + stride)
    pos += stride
    const cur = out.subarray(y * stride, (y + 1) * stride)
    const prev = y > 0 ? out.subarray((y - 1) * stride, y * stride) : null
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? cur[x - bpp] : 0
      const b = prev ? prev[x] : 0
      const c = prev && x >= bpp ? prev[x - bpp] : 0
      let v = line[x]
      if (filter === 1) v += a
      else if (filter === 2) v += b
      else if (filter === 3) v += (a + b) >> 1
      else if (filter === 4) {
        const p = a + b - c
        const pa = Math.abs(p - a)
        const pb = Math.abs(p - b)
        const pc = Math.abs(p - c)
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c
      } else if (filter !== 0) {
        throw new Error(`未知的 PNG filter：${filter}`)
      }
      cur[x] = v & 255
    }
  }
  const stepX = Math.max(1, Math.floor(width / 200))
  const stepY = Math.max(1, Math.floor(height / 120))
  let sum = 0
  let n = 0
  for (let y = 0; y < height; y += stepY) {
    for (let x = 0; x < width; x += stepX) {
      const i = y * stride + x * bpp
      sum += 0.2126 * out[i] + 0.7152 * out[i + 1] + 0.0722 * out[i + 2]
      n++
    }
  }
  return sum / n
}
