// readme-head-tail.test.ts — 钉住中英首页的「头部与尾部」定稿（票 #34）
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

// 构建脚本里的同一段变换（scripts/build-client.ts）：英文页去掉 showcase 块
const SHOWCASE_RE = /<!-- showcase:start -->[\s\S]*?<!-- showcase:end -->\r?\n?/

// 载荷一律 LF（scripts/build-client.ts 写包内副本前把行尾归一）。比内容时两边都归一：
// 否则「本机遗留的 CRLF 检出」会被当成期望值 —— 那是检出差，不是内容差（.gitattributes eol=lf）。
const norm = (t: string): string => t.replace(/\r\n/g, '\n')

// 头部 = 文件开头到 showcase 标记之前；胶囊行只应出现在这一段里
const headOf = (t: string): string => t.split('<!-- showcase:start -->')[0]
const count = (t: string, needle: string): number => t.split(needle).length - 1

// ── 五枚胶囊：标签 + 链接目标（#28 定稿；排布与动态/写死选型归 #29）──
const CAPSULES = {
  zh: [
    ['版本', 'https://www.npmjs.com/package/dsh-opencode-palette',
      'https://img.shields.io/npm/v/dsh-opencode-palette?label=%E7%89%88%E6%9C%AC'],
    ['下载量', 'https://www.npmjs.com/package/dsh-opencode-palette',
      'https://img.shields.io/npm/dt/dsh-opencode-palette?label=%E4%B8%8B%E8%BD%BD%E9%87%8F&color=red'],
    ['最近更新', 'https://github.com/FeatherHunter/dsh-opencode-palette/commits/main',
      'https://img.shields.io/github/last-commit/FeatherHunter/dsh-opencode-palette?label=%E6%9C%80%E8%BF%91%E6%9B%B4%E6%96%B0&color=FE7D37'],
    ['主题包', 'https://github.com/anomalyco/opencode',
      'https://img.shields.io/badge/%E4%B8%BB%E9%A2%98%E5%8C%85-OpenCode%C2%B738-9D7CD8'],
    ['欢迎提 Issue', 'https://github.com/FeatherHunter/dsh-opencode-palette/issues',
      'https://img.shields.io/badge/%E6%AC%A2%E8%BF%8E%E6%8F%90%20Issue-brightgreen.svg'],
  ],
  en: [
    ['npm', 'https://www.npmjs.com/package/dsh-opencode-palette',
      'https://img.shields.io/npm/v/dsh-opencode-palette?label=npm'],
    ['downloads', 'https://www.npmjs.com/package/dsh-opencode-palette',
      'https://img.shields.io/npm/dt/dsh-opencode-palette?label=downloads&color=red'],
    ['last-commit', 'https://github.com/FeatherHunter/dsh-opencode-palette/commits/main',
      'https://img.shields.io/github/last-commit/FeatherHunter/dsh-opencode-palette?label=last-commit&color=FE7D37'],
    ['themes', 'https://github.com/anomalyco/opencode',
      'https://img.shields.io/badge/themes-OpenCode%C2%B738-9D7CD8'],
    ['Issues welcome', 'https://github.com/FeatherHunter/dsh-opencode-palette/issues',
      'https://img.shields.io/badge/Issues%20welcome-brightgreen.svg'],
  ],
}

// 已删、且不许回来：tests（过程指标＋会过期）/ 提交数 / 许可证 / 未来展望
const REMOVED_CAPSULES = [
  'img.shields.io/badge/tests-38%2F38',
  'img.shields.io/badge/license-MIT',
  'github/commit-activity',
  'ROADMAP',
]

const CONTRIBUTORS = ['oopsdoes', 'insp63', 'gitwch1', 'anci3ntr0ck', 'SRKBob', 'anupamme', 'Number444', 'xiSage', 'the-beating-light-of-the-nail']

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
// 2026-10-19 文案重写：两页卖点各改成一句「短句」，另一语言那句作镜像斜体，
// 头部逐行同形那条门禁（见第 9 组）继续盯着「每页一句卖点、另一语言一句」。
test('顶部区：英文页删掉第二句卖点，且中英卖点都保留 38 款', () => {
  assert.equal(EN.includes('Easier on the eyes, nicer to code in.'), false, '英文页应删掉第二句卖点')
  assert.equal(PKG.includes('Easier on the eyes, nicer to code in.'), false, '包内副本同样不该有')
  assert.ok(ZH.includes('**38 款配色，一键给 DSH 换装。**'), '中文卖点应为定稿原文且含 38')
  assert.ok(EN.includes('**38 themes for DSH, one click.**'), '英文卖点应为定稿原文且含 38')
  // 镜像句：中文页的斜体是英文卖点，英文页的斜体是中文卖点
  assert.ok(ZH.includes('*38 themes for DSH, one click.*'), '中文页应镜像英文卖点一句')
  assert.ok(EN.includes('*38 款配色，一键给 DSH 换装。*'), '英文页应镜像中文卖点一句')
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

// ── 4 · MORE：四条兄弟插件各一句定稿，ilife 排在最后，四行居左 ──
// 2026-10-19 用户逐条改写 MORE 三行（mattpocock/skills 的 star 数按 GitHub API 实测写「近 30 万」，
// 不写死会过期的数字；dsh-prompt 改成「天天要敲的那几句存成模板」的真实用法），此处跟着定稿走。
// 2026-10-21 用户再次精简三条：dsh-prompt 讲「反复重复的模板化提示词 → 存成自定义模板 → 选中直接注入」，
// deck 去掉技能清单只留「预置好，装好即用」，im-companion 收成一句概念说明。
// 2026-10-21 晚用户点名 MORE 写四条：新增 ilife（爱生活：居家生活套件），并把整段从居中改居左 ——
// 长句居中读起来是散开的。base 包迁移（票 10）后整段由 MORE 块渲染，ilife 句首带「⚠️建设中⚠️」。
test('MORE：四条兄弟插件各为定稿句，ilife 排在第四条，四行居左', () => {
  assert.ok(ZH.includes('**[dsh-prompt](https://github.com/FeatherHunter/dsh-prompt)** —— 经常反复重复的模板化提示词，存成自定义模板，选中后直接注入，不再需要耗费精力。'),
    '中文 dsh-prompt 一行应为定稿原文')
  assert.ok(EN.includes('**[dsh-prompt](https://github.com/FeatherHunter/dsh-prompt)** — The boilerplate prompts you keep retyping, saved as custom templates and injected on selection — no more wasted effort.'),
    '英文 dsh-prompt 一行应为定稿原文')
  assert.ok(ZH.includes('**[dsh-mattpocock-skills-deck](https://github.com/FeatherHunter/dsh-mattpocock-skills-deck)** —— 近 30 万 star 的 mattpocock/skills 整套预置好（27 个技能），装好即用。'),
    '中文 deck 一行应为定稿原文')
  assert.ok(EN.includes('**[dsh-mattpocock-skills-deck](https://github.com/FeatherHunter/dsh-mattpocock-skills-deck)** — The whole mattpocock/skills set (nearly 300k stars) preinstalled — 27 skills, ready as soon as it is installed.'),
    '英文 deck 一行应为定稿原文')
  assert.ok(ZH.includes('**[dsh-im-companion](https://github.com/FeatherHunter/dsh-im-companion)** —— 给 dsh-im 加了「助理」和「家」的概念。'),
    '中文 im-companion 一行应为定稿原文')
  assert.ok(EN.includes('**[dsh-im-companion](https://github.com/FeatherHunter/dsh-im-companion)** — Adds the ideas of an “assistant” and a “home” to dsh-im.'),
    '英文 im-companion 一行应为定稿原文')
  assert.ok(ZH.includes('**[ilife](https://github.com/FeatherHunter/ilife)** —— ⚠️建设中⚠️爱生活：居家生活套件，记账、运动、饮食、体重、食谱、物品管理、作息规划、备忘录等。'),
    '中文 ilife 一行应为 base 包 MORE 块定稿原文')
  assert.ok(EN.includes('**[ilife](https://github.com/FeatherHunter/ilife)** — ⚠️Work in progress⚠️ iLife, the home-life suite: bookkeeping, exercise, diet, weight, recipes, item management, schedule planning, memos and more.'),
    '英文 ilife 一行应为 base 包 MORE 块定稿原文')
  // 旧长句不许回潮（三条都被用户判为啰嗦）
  for (const [name, doc] of [['中文页', ZH], ['英文页', EN]]) {
    assert.equal(doc.includes('天天要敲的那几句'), false, `${name} 不应再有「天天要敲的那几句」`)
    assert.equal(doc.includes('The few prompts you type every day'), false, `${name} 不应再有该句英文`)
    assert.equal(doc.includes('工程工作流'), false, `${name} 不应再有「工程工作流」`)
    assert.equal(doc.includes('code review'), false, `${name} 不应再有 "code review"`)
    assert.equal(doc.includes('左栏一眼看清'), false, `${name} 不应再有「左栏一眼看清」`)
    assert.equal(doc.includes('the left rail shows it at a glance'), false, `${name} 不应再有该句英文`)
  }
  for (const doc of [ZH, EN, PKG]) {
    const more = doc.indexOf('<sub>MORE</sub>')
    const thanks = doc.indexOf('<sub>THANKS</sub>')
    assert.ok(more > -1 && thanks > more, 'MORE 应在 THANKS 之前')
    const block = doc.slice(more, thanks)
    // 用户定稿四条，一条不多一条不少
    assert.equal(block.split('**[').length - 1, 4, 'MORE 应恰好四条兄弟插件')
    // 四行居左：整段包 align="left" 的 div，不许再回居中
    // （只查 div：切片尾巴带上 THANKS 标题那半行 h2 自己的 align="center"，不算数）
    assert.ok(block.includes('<div align="left">'), 'MORE 段应左对齐')
    assert.equal(block.includes('<div align="center">'), false, 'MORE 段不应再包居中 div')
    // 顺序 = base 包 MORE 块的统一顺序：deck → dsh-prompt → im-companion → ilife
    // （迁移时按 base 清单重排；旧手写块的 dsh-prompt 第一顺序随之退役）
    const order = ['[dsh-mattpocock-skills-deck]', '[dsh-prompt]', '[dsh-im-companion]', '[ilife]']
    const pos = order.map((n) => block.indexOf(n))
    for (const n of order) assert.ok(block.includes(n), `MORE 段内应有 ${n}`)
    assert.deepEqual(pos, [...pos].sort((a, b) => a - b), `MORE 四条应按定稿顺序排列：${order.join(' → ')}`)
  }
})

// ── 5 · THANKS：九人十花机器表（2026-10-22 致谢自动化移植，源仓方案） ──
// 旧手工段（八人九花逐人描述句）退役，旧文案留 git 历史：中英两页改为同构三列表格，
// 数据源是 docs/thanks-data.json：scripts/update-thanks.ts 只写 JSON，三处表格由
// base 包 readme:sync 同源渲染（中文 README 用中文表，英文页与包内副本用英文表）。
// 首跑 bootstrap（154 议题/PR＋122 讨论）纠偏已由维护者确认：新增 @insp63（#124，排第二）、
// @anupamme 的 #32 确认为 PR（链接走 /pull/32）、#73 为 anci3ntr0ck 开的＋gitwch1 留言参与。
// 行序 = 总数多在前、同数按最后活跃倒排（oopsdoes 两花置顶）。
// 精确一致（花串＝渲染结果、三处逐字节对等）由 tests/verify-thanks-table.ts 钉死，
// 这里只钉头尾可见形态（标记、引言、行序、花总数、旧口径不回潮）。
test('THANKS：九人十花同构表（oopsdoes 两花置顶，insp63 第二）', () => {
  for (const [name, doc] of [['中文页', ZH], ['英文页', EN], ['包内副本', PKG]]) {
    const thanks = doc.indexOf('<sub>THANKS</sub>')
    assert.ok(thanks > -1, `${name} 应有 THANKS 段`)
    // 左对齐长列表：段内用 align="left"，不是居中
    assert.ok(doc.slice(thanks).includes('<div align="left">'), `${name} 的 THANKS 应左对齐`)
    for (const handle of CONTRIBUTORS) {
      assert.ok(doc.slice(thanks).includes(`[@${handle}](https://github.com/${handle})`),
        `${name} 应点名 @${handle}`)
    }
    // 行序：oopsdoes 置顶，其余按最后活跃降序
    // （insp63 → gitwch1 → anci3ntr0ck → SRKBob → anupamme → Number444 → xiSage → the-beating-light-of-the-nail）
    const top = doc.slice(thanks)
    const order = CONTRIBUTORS.map((h) => top.indexOf(`[@${h}]`))
    assert.deepEqual(order, [...order].sort((a, b) => a - b),
      `${name} 应按花数排行、同花数按最后活跃降序：${CONTRIBUTORS.join(' → ')}`)
    for (const h of CONTRIBUTORS) assert.ok(top.indexOf(`[@${h}]`) > -1, `${name} 应点名 @${h}`)
    // @oopsdoes 行应同时含 #46 与 #55，且 #46 在 #55 之前
    assert.ok(top.includes('#46') && top.includes('#55'), `${name} 的 @oopsdoes 行应同时含 #46 与 #55`)
    assert.ok(top.indexOf('#46') < top.indexOf('#55'), `${name} 的 #46 应在 #55 之前`)
    // 新人 #124 排在 #73 之前；其余旧单号保持 #43 → #32 → #12 → #11 → #3 时间降序
    assert.ok(top.includes('[#124]'), `${name} 应有新人 insp63 的 #124`)
    assert.ok(top.includes('[#73]'), `${name} 应有 #73 的两条贡献`)
    assert.ok(top.indexOf('[#124]') < top.indexOf('[#73]'), `${name} 的 #124 应排在 #73 之前`)
    for (const n of ['[#43]', '[#32]', '[#12]', '[#11]', '[#3]']) assert.ok(top.includes(n), `${name} 应有 ${n}`)
    const seq = ['[#43]', '[#32]', '[#12]', '[#11]', '[#3]'].map((n) => top.indexOf(n))
    assert.deepEqual(seq, [...seq].sort((a, b) => a - b), `${name} 其余应保持 #43 → #32 → #12 → #11 → #3 时间降序`)
    assert.ok(Math.max(...seq) > top.indexOf('#55'), `${name} 其余条目应排在 @oopsdoes 之后`)
    // #32 是外部 PR：链接走 /pull/32，不再是旧表含糊的裸号
    assert.ok(top.includes('[#32](https://github.com/FeatherHunter/dsh-opencode-palette/pull/32)'),
      `${name} 的 #32 应链到 pull/32`)
    // 一单一花：#3、#11、#12、#32、#43、#46、#55、#73×2、#124 共 10 朵 🌹
    assert.equal(count(top, '🌹'), 10, `${name} 的 THANKS 应共 10 朵（oopsdoes 两朵，其余一人一朵）`)
    // 旧口径不许回来：PR 邀请句、旧首句
    assert.equal(doc.includes('PR 虚位以待'), false, `${name} 不应再有「PR 虚位以待」`)
    assert.equal(doc.includes('PRs wanted'), false, `${name} 不应再有 "PRs wanted"`)
    assert.equal(doc.includes('提交一个 Issue，就记一个 🌹'), false, `${name} 不应再有中文旧首句`)
    assert.equal(doc.includes('Every issue gets a 🌹'), false, `${name} 不应再有英文旧首句`)
    // 旧逐人描述句不许回来（表格只留链接，描述留 git 历史）
    for (const gone of ['提议不透明主题', '复现不出', 'proposed light-mode', 'found no repro']) {
      assert.equal(top.includes(gone), false, `${name} 不应再有旧描述句「${gone}」`)
    }
  }
  // 表头与标记：中文页用中文表头＋ZH 标记，英文页与包内副本用英文表头＋EN 标记
  assert.ok(ZH.includes('<!-- THANKS-TABLE-ZH-START -->') && ZH.includes('<!-- THANKS-TABLE-ZH-END -->'), '中文页应有中文表标记')
  assert.equal(count(ZH, '<!-- THANKS-TABLE-ZH-START -->'), 1, '中文表标记应只出现一次')
  assert.ok(ZH.includes('| 贡献者 | 致敬 | 贡献 |'), '中文页表头应为中文三列')
  for (const [name, doc] of [['英文页', EN], ['包内副本', PKG]]) {
    assert.ok(doc.includes('<!-- THANKS-TABLE-EN-START -->') && doc.includes('<!-- THANKS-TABLE-EN-END -->'), `${name} 应有英文表标记`)
    assert.equal(count(doc, '<!-- THANKS-TABLE-EN-START -->'), 1, `${name} 英文表标记应只出现一次`)
    assert.ok(doc.includes('| Contributor | Tribute | Contributions |'), `${name} 表头应为英文三列`)
  }
  // 引言结语：致谢区有头有尾，机器只换标记之间的表
  assert.ok(ZH.includes('感谢每一位提交 Issue、PR 与参与讨论的朋友'), '中文页应有致谢引言')
  assert.ok(ZH.includes('也感谢在评论区与讨论区留下想法的每一位朋友'), '中文页应有致谢结语')
  for (const [name, doc] of [['英文页', EN], ['包内副本', PKG]]) {
    assert.ok(doc.includes('Thanks to everyone who opened an issue, sent a PR'), `${name} 应有致谢引言`)
    assert.ok(doc.includes('And thanks to everyone who left thoughts in comments and discussions'), `${name} 应有致谢结语`)
  }
})

// ── 6 · CONNECT：欢迎语 + 社群整卡（base 包 CDN 图，不再引用仓内二维码 PNG） ──
// 2026-10-21 用户改写这句：「遇到问题或者有改进想法，直接 提 Issue 就行；也想找人聊聊…」
// → 「👏欢迎提交PR、ISSUE。星星之火可以燎原🔥。有任何建议、意见、想法、吐槽、idea都可以进群交流。」
// base 包迁移（票 10）：CONNECT 块正文与三张整卡 URL 都由 base 包渲染，仓库不再放 contact-*.png；
// 整卡宽度与群名 alt 沿用旧口径，PR/ISSUE 变成纯文本（不再各挂一个链接）。
test('CONNECT：欢迎语与交流群整卡由 base 包渲染，宽度与群名不变', () => {
  // 新文案在场（base 包 CONTACT_TEXT 的定稿句；PR/ISSUE 是正文文字，不再是链接）
  assert.ok(ZH.includes('👏欢迎提交PR、ISSUE。星星之火可以燎原🔥有任何建议、意见、想法、吐槽、idea都可以进群交流。'),
    '中文页应写 base 包 CONNECT 定稿欢迎语')
  assert.ok(EN.includes('👏Welcome PRs and issues. A single spark can start a prairie fire 🔥. Any suggestion, opinion, idea or rant — come join the group and talk.'),
    '英文页应写 base 包 CONNECT 定稿欢迎语')
  // 只查 CONNECT 托管块内：页头还挂着「欢迎提 Issue」徽章（那是另一处合规链接，不在本块）
  const zhContact = ZH.slice(ZH.indexOf('<!-- CONTACT-START -->'), ZH.indexOf('<!-- CONTACT-END -->'))
  const enContact = EN.slice(EN.indexOf('<!-- CONTACT-START -->'), EN.indexOf('<!-- CONTACT-END -->'))
  for (const [name, block] of [['中文页', zhContact], ['英文页', enContact]]) {
    assert.equal(block.includes('](https://github.com/FeatherHunter/dsh-opencode-palette/pulls)'), false, `${name} CONNECT 块的 PR 已是纯文本，不应再挂链接`)
    assert.equal(block.includes('](https://github.com/FeatherHunter/dsh-opencode-palette/issues)'), false, `${name} CONNECT 块的 ISSUE 已是纯文本，不应再挂链接`)
    assert.ok(block.length > 0, '应能切出 CONNECT 托管块')
  }
  // 旧句不许回潮
  for (const gone of ['遇到问题或者有改进想法', '[提 Issue](', '也想找人聊聊']) {
    assert.equal(ZH.includes(gone), false, `中文页不应再有「${gone}」`)
  }
  for (const gone of ['Found a bug or have an idea', '[open an issue](', "you'd rather talk it over"]) {
    assert.equal(EN.includes(gone), false, `英文页不应再有「${gone}」`)
  }
  // 三张整卡走 base 包 CDN（精确版本 + 限时卡日期缓存戳），仓内不再有 contact-*.png
  const CDN = 'https://cdn.jsdelivr.net/npm/dsh-featherhunter-plugin-base@0.1.1/data/img/'
  const CARDS = ['card-feishu.png', 'card-qq.png', 'card-wechat-2026-10-31.png?v=20261031']
  for (const [name, doc] of [['中文页', ZH], ['英文页', EN], ['包内副本', PKG]]) {
    for (const card of CARDS) assert.ok(doc.includes(CDN + card), `${name} 应有 base 包整卡：${card}`)
    assert.equal(doc.split(`${CDN}card-`).length - 1, 3, `${name} 应恰好三张 base 包整卡`)
    assert.ok(doc.includes('width="260"'), `${name} 整卡宽度沿用 260`)
    assert.equal(doc.includes('contact-feishu-permanent.png') || doc.includes('contact-qq-permanent.png') || doc.includes('contact-wechat-weekly.png'), false,
      `${name} 不应再引用仓内 contact-*.png`)
    // 群名在 alt 文本里：中文页用中文群名，英文页与包内副本用英文群名
  }
  assert.ok(ZH.includes('DSH 插件交流群'), '中文页应写明社群名称')
  for (const [name, doc] of [['英文页', EN], ['包内副本', PKG]]) {
    assert.ok(doc.includes('DSH plugin community group'), `${name} 应写明社群名称`)
  }
  assert.equal(ZH.includes('备注 `dsh-opencode-palette`'), false, '中文页不应再有「备注词」旧说法')
  assert.equal(EN.includes('mention `dsh-opencode-palette`'), false, '英文页不应再有 mention 旧说法')
  assert.equal(PKG.includes('mention `dsh-opencode-palette`'), false, '包内副本由英文页再生，不应带旧说法')
})

// ── 7 · 包内副本 = 英文页去掉 showcase 块（构建产物，永不手改） ──
test('包内副本：等于英文页去掉 showcase 块（行尾归一化后比较），且一律 LF', () => {
  assert.equal(norm(PKG), norm(EN.replace(SHOWCASE_RE, '')), 'package/README.md 应由构建从英文页再生，不得手改')
  assert.equal(/\r/.test(PKG), false, '包内副本一律 LF 行尾（载荷不随检出的 EOL 变）')
  assert.equal(PKG.includes('<!-- showcase:start -->'), false, '包内副本不带 showcase 块')
  assert.equal(PKG.includes('showcase/'), false, '包内副本不引用 showcase 截图')
})

// ── 8 · 主体段落清单：面板词条与主体段落原样 ──
test('面板词条与主体段落未被本轮改动（只动头尾）', () => {
  // 主体小标题仍在（改名/合并是 #30→#31 的事）
  // 2026-10-21：THEMES（主题专区）随那张色带 SVG 一起退役，用户判定没必要 ——
  // 这里跟着退役并钉死，别让人把它悄悄加回来。
  for (const marker of ['<sub>INSTALL</sub>', '<sub>EXTENSIONS</sub>', '<sub>UPGRADE</sub>', '<sub>CONNECT</sub>']) {
    assert.ok(ZH.includes(marker), `中文页主体标记应在场：${marker}`)
    assert.ok(EN.includes(marker), `英文页主体标记应在场：${marker}`)
  }
  for (const [name, doc] of [['中文页', ZH], ['英文页', EN]]) {
    assert.equal(doc.includes('<sub>THEMES</sub>'), false, `${name} 不应再有 THEMES 标题（主题专区已退役）`)
  }
})

// ── 9 · 两页头部逐行同形：镜像的机器可验证形式 ──
// 中文页与英文页的头部应逐行同形（标题 / 导航 / 卖点 / 镜像卖点 / 求星 / 五枚胶囊），
// 任一侧多写或少写一句都会在这里红 —— 这正是英文页必须删掉第二句卖点的原因。
test('顶部区：中英两页头部逐行同形，任一侧多写一句就红', () => {
  const shape = (t: string): string[] => t.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map((l) => {
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
