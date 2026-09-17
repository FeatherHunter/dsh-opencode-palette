// scripts/generate-assets.mjs — 生成开源展示资产（真实主题色 SVG，中英双语）
// 产出 assets/: theme-stories-{zh,en}.svg —— 「色带基线」版（票 #29 定案 A，票 #31 落地）：
//   画布 860 × 1812（860 = GitHub 桌面内容宽，1:1 显示不缩字）；一行一款：
//   中文名（该主题 primary 色）＋ 主题 id（mono）＋ 一句由来（最多 2 行，栏宽 320）；
//   右侧 7 格色带（每格 64 × 30、间距 6、圆角 4），顺序固定
//   背景 / 文字 / 主色 / 强调 / 错误 / 警告 / 成功；色带正上方一列 7 个列名。
//   26 款策展名单（非全 38），按色系分组、组序与面板一致（GROUP_ORDER 去掉 neutral）。
import { writeFile, mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { themeNames, previewColors } from '../src/engine/index.mjs'
import { GROUP_ORDER, groupOf } from '../src/engine/grouping.mjs'
import { THEME_ZH } from '../src/engine/zh-names.mjs'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const OUT_DIR = join(ROOT, 'assets')
const names = themeNames()
const data = {}
for (const n of names) data[n] = previewColors(n)

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const hex = (v) => v || 'transparent'
const CHESS = '<pattern id="chess" width="10" height="10" patternUnits="userSpaceOnUse"><rect width="10" height="10" fill="#161616"/><rect width="5" height="5" fill="#232323"/><rect x="5" y="5" width="5" height="5" fill="#232323"/></pattern>'
const SANS = '-apple-system,Segoe UI,Microsoft YaHei,PingFang SC,sans-serif'
const MONO = 'ui-monospace,SFMono-Regular,Menlo,Consolas,monospace'

// ── 主题中文名与由来（双语）──
// THEME_ZH 已下沉至 src/engine/zh-names.mjs（单一来源，面板与生成器共用）
const THEME_STORY_ZH = {
  opencode: "官方默认主题：深黑底 + 橙 / 蓝 / 紫",
  tokyonight: "东京夜景的深蓝与霓虹紫",
  dracula: "吸血鬼风格的暗紫，经典中的经典",
  gruvbox: "致敬 80 年代 CRT 与合成器的复古暖色",
  matrix: "数字雨的荧光绿，一键进入 Matrix",
  rosepine: "玫瑰粉与松林绿的低饱和温柔",
  catppuccin: "拿铁般的柔和（Mocha 摩卡 / Frappé 冰沙 / Macchiato 玛奇朵）",
  "catppuccin-frappe": "卡布奇诺家族更轻盈的灰调",
  "catppuccin-macchiato": "卡布奇诺家族更浓郁的层次",
  solarized: "按太阳光谱精确设计的护眼配色",
  synthwave84: "80 年代合成波的霓虹粉青",
  everforest: "森林绿的护眼配色",
  nord: "北欧极地的冷静蓝灰",
  kanagawa: "取自浮世绘《神奈川冲浪里》",
  nightowl: "深夜编程的蓝紫",
  "one-dark": "Atom 编辑器的经典深色",
  monokai: "Sublime Text 的经典黄粉",
  palenight: "Material 的深紫蓝变体",
  material: "Google Material 的蓝灰",
  ayu: "日语「香鱼」的温暖橙黄",
  carbonfox: "IBM Carbon 设计语言",
  cobalt2: "化学元素钴的蓝（Wes Bos 出品）",
  cursor: "Cursor 编辑器官方配色",
  aura: "紫色霓虹光环",
  flexoki: "暖纸上的墨色（kepano 出品）",
  github: "GitHub 官方配色",
  zenburn: "Vim 经典低对比",
  mercury: "薰衣草紫（opencode 定制）",
  "osaka-jade": "和风玉石绿（opencode 定制）",
  vesper: "暖橙香槟（opencode 定制）",
  vercel: "Vercel 品牌蓝",
  "lucent-orng": "透明底色 + 活力橙",
  orng: "热烈直白的橙",
  system: "一键回到 DSH 原生外观",
}
const THEME_STORY_EN = {
  opencode: "The official default theme — deep black with orange / blue / violet",
  tokyonight: "The deep blues and neon violets of Tokyo at night",
  dracula: "The classic vampire-purple, a community icon",
  gruvbox: "Retro warm tones honoring 80s CRTs and synths",
  matrix: "The glowing green of digital rain",
  rosepine: "Low-saturation rose and pine, soft and calm",
  catppuccin: "Latte-soft pastels (Mocha / Frappé / Macchiato)",
  "catppuccin-frappe": "The lighter, cooler sibling of Catppuccin",
  "catppuccin-macchiato": "The deeper, richer sibling of Catppuccin",
  solarized: "Sun-spectrum colors designed precisely around CIELAB",
  synthwave84: "80s synthwave neon pink and cyan",
  everforest: "Forest-green tones, easy on the eyes",
  nord: "The cool blue-grays of the Nordic arctic",
  kanagawa: "Named after the ukiyo-e print 「The Great Wave off Kanagawa」",
  nightowl: "Late-night coding blues and violets",
  "one-dark": "The classic dark theme from Atom editor",
  monokai: "The classic yellow-and-pink from Sublime Text",
  palenight: "Material’s deep purple-blue variant",
  material: "The blue-grays of Google Material Design",
  ayu: "Japanese for “sweetfish” — warm orange",
  carbonfox: "From the Nightfox family, built on IBM Carbon",
  cobalt2: "The blue of the element cobalt (by Wes Bos)",
  cursor: "The official palette of the Cursor editor",
  aura: "Purple neon aura",
  flexoki: "Ink on warm paper (by kepano)",
  github: "GitHub’s official palette",
  zenburn: "The classic low-contrast Vim theme",
  mercury: "Lavender violet (opencode original)",
  "osaka-jade": "Jade green, Japanese-style (opencode original)",
  vesper: "Warm champagne orange (opencode original)",
  vercel: "Vercel’s brand blue",
  "lucent-orng": "Vivid orange on a transparent base",
  orng: "Straightforward, vivid orange",
  system: "One click back to DSH’s native look",
}

// ── 策展名单（26 款）与分组口径 ──
// 只留「名字有来历」的主题；分组走引擎的 groupOf（与面板同源），
// 组序用 GROUP_ORDER 去掉 neutral（策展名单里没有中性色主题）。
const STORY_PICKS = ['tokyonight','dracula','gruvbox','matrix','rosepine','catppuccin','catppuccin-frappe','catppuccin-macchiato','solarized','synthwave84','everforest','nord','kanagawa','nightowl','palenight','ayu','carbonfox','cobalt2','aura','flexoki','zenburn','mercury','osaka-jade','vesper','lucent-orng','orng']
const GROUP_NAMES = {
  warm: ['暖橙', 'Warm'], 'yellow-green': ['黄绿', 'Yellow-green'], teal: ['青绿', 'Teal'],
  'cyan-blue': ['青蓝', 'Cyan-blue'], 'cool-blue': ['冷蓝', 'Cool-blue'], violet: ['蓝紫', 'Violet'],
  transparent: ['透明', 'Transparent'],
}
const GROUP_KEYS = GROUP_ORDER.filter((g) => g !== 'neutral' && g !== 'special')
// 组头色点的代表色（与 src/engine/grouping.mjs 的 GROUP_COLORS 同值；此处只用于画图）
const GROUP_COLORS_FALLBACK = {
  warm: '#FAB283', 'yellow-green': '#A7C080', teal: '#2DD5B7',
  'cyan-blue': '#88C0D0', 'cool-blue': '#82AAFF', violet: '#C4A7E7', transparent: '#8B8B95',
}
const SLOTS = {
  zh: ['背景', '文字', '主色', '强调', '错误', '警告', '成功'],
  en: ['background', 'text', 'primary', 'accent', 'error', 'warning', 'success'],
}
const BAND_KEYS = ['background', 'text', 'primary', 'accent', 'error', 'warning', 'success']

/** 文本宽度估算（CJK 全角 = 1em；ASCII 平均 0.56em；空格 0.3em）——由来行折行用。 */
function measure(s, size) {
  let w = 0
  for (const ch of String(s)) {
    const c = ch.codePointAt(0)
    if ((c >= 0x2e80 && c <= 0x9fff) || (c >= 0xff00 && c <= 0xffef) || c === 0x3000) w += size
    else if (ch === ' ') w += size * 0.3
    else w += size * 0.56
  }
  return Math.ceil(w)
}

/** 贪心折行到最多 maxLines 行（每行不超过 maxW px）；放不下就截尾加省略号。
 *  避头标点（」』）等收尾符号不另起一行——跟在上行尾（汉字排版基本规则，避免孤立收尾符）。 */
function wrap(s, size, maxW, maxLines) {
  const words = String(s).split(/(\s+)/).filter((w) => w !== '')
  const lines = []
  let cur = ''
  const cjk = (w) => /[\u2e80-\u9fff\uff00-\uffef\u3000]/.test(w)
  const push = (piece) => {
    if (measure(cur + piece, size) <= maxW) { cur += piece; return }
    if (cur !== '') { lines.push(cur); cur = '' }
    if (measure(piece, size) <= maxW) { cur = piece; return }
    // 单个词就超宽（中文常见）：按字切
    let buf = ''
    for (const ch of piece) {
      if (measure(buf + ch, size) > maxW) { lines.push(buf); buf = '' }
      buf += ch
    }
    cur = buf
  }
  for (const word of words) {
    if (!cjk(word) && word.trim() !== '' && cur.trim() !== '' && measure(cur + word, size) > maxW) {
      lines.push(cur.replace(/\s+$/, ''))
      cur = word
      continue
    }
    push(word)
  }
  if (cur !== '') lines.push(cur)
  // 收尾符号不另起一行：把它并回上一行（宽度已超一点点，视觉上比孤立标点好）
  for (let i = lines.length - 1; i > 0; i--) {
    if (/^[」』）】、，。！？；：…]+/.test(lines[i])) {
      const m = lines[i].match(/^[」』）】、，。！？；：…]+/)
      lines[i - 1] += lines[i].slice(0, m[0].length)
      lines[i] = lines[i].slice(m[0].length)
      if (lines[i] === '') lines.splice(i, 1)
    }
  }
  if (lines.length <= maxLines) return lines
  const kept = lines.slice(0, maxLines)
  let last = kept[maxLines - 1].replace(/\s+$/, '')
  while (last.length > 0 && measure(last + '…', size) > maxW) last = last.slice(0, -1)
  kept[maxLines - 1] = last.replace(/[\s，、·,]$/, '') + '…'
  return kept
}

// ── 色带基线（theme-stories-{zh,en}.svg）──
// 画布与全部几何值来自 #29 定案 A（原型 prototypes/visual-refresh-prototype.html 的 figA），
// 高度 1812 由内容累加得出（组头 30+10 / 行 54 / 表头 112 / 尾部 16）。
function themeStoriesDoc(lang) {
  const W = 860, PAD = 20, TXTW = 320, BX = PAD + TXTW + 16
  const CELL = 64, CG = 6, CH = 30, ROW = 54, GH = 30, GG = 10, Y0 = 112
  const slots = SLOTS[lang]
  const story = lang === 'zh' ? THEME_STORY_ZH : THEME_STORY_EN
  const groups = GROUP_KEYS
    .map((g) => ({ key: g, ids: STORY_PICKS.filter((n) => data[n] && groupOf(n, data[n]) === g) }))
    .filter((g) => g.ids.length > 0)
  const out = []
  const text = (x, y, s, size, color, extra) =>
    '<text x="' + x + '" y="' + y + '" font-family="' + SANS + '" font-size="' + size + '" fill="' + color + '"' + (extra || '') + '>' + esc(s) + '</text>'
  const monoText = (x, y, s, size, color) =>
    '<text x="' + x + '" y="' + y + '" font-family="' + MONO + '" font-size="' + size + '" fill="' + color + '">' + esc(s) + '</text>'
  const box = (x, y, w, h, fill, rx) => '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + rx + '" fill="' + fill + '"/>'

  out.push(text(PAD, 30, lang === 'zh' ? '每个主题，逐一拆解' : 'Every theme, decomposed', 22, '#f0f0f0', ' font-weight="800"'))
  out.push(text(PAD, 60, lang === 'zh'
    ? '背景 · 文字 · 主色 · 强调 · 错误 · 警告 · 成功 —— 定义每个主题气质的 7 种颜色'
    : 'bg · text · primary · accent · error · warning · success — the 7 colors that define each theme', 12.5, '#8b8b95'))
  // 列图例：压在各列正上方的名字（原图缺的这块）
  slots.forEach((s, j) => {
    const cx = BX + j * (CELL + CG) + CELL / 2
    out.push(box(BX + j * (CELL + CG), 74, CELL, 14, '#232326', 3))
    out.push(text(cx, 90, s, 10.5, '#8b8b95', ' text-anchor="middle"'))
  })
  let y = Y0
  for (const g of groups) {
    const gn = GROUP_NAMES[g.key][lang === 'zh' ? 0 : 1]
    out.push('<circle cx="' + (PAD + 4) + '" cy="' + (y + 13) + '" r="4" fill="' + GROUP_COLORS_FALLBACK[g.key] + '"/>')
    out.push(text(PAD + 16, y + 13, gn, 13, '#e8e8ee', ' font-weight="700"'))
    out.push(text(PAD + 16 + measure(gn, 13) + 10, y + 13, g.ids.length + (lang === 'zh' ? ' 款' : ' themes'), 10.5, '#6f6f78'))
    out.push(box(PAD, y + GH - 2, W - PAD * 2, 1, '#232326', 0))
    y += GH + GG
    for (const id of g.ids) {
      const c = data[id]
      const label = (lang === 'zh' && THEME_ZH[id]) || id
      out.push(text(PAD, y + 17, label, 16, hex(c.primary), ' font-weight="700"'))
      out.push(monoText(PAD + measure(label, 16) + 10, y + 16, id, 11, '#8b8b95'))
      wrap(story[id] || '', 12.5, TXTW, 2).forEach((line, i) => {
        out.push(text(PAD, y + 35 + i * 15, line, 12.5, '#a1a1aa'))
      })
      BAND_KEYS.forEach((k, j) => {
        const v = c[k]
        const x = BX + j * (CELL + CG)
        out.push(v
          ? box(x, y + 12, CELL, CH, v, 4)
          : '<rect x="' + x + '" y="' + (y + 12) + '" width="' + CELL + '" height="' + CH + '" rx="4" fill="url(#chess)"/>')
      })
      y += ROW
    }
  }
  const H = y + 16
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '">',
    '<defs>' + CHESS + '</defs>',
    box(0, 0, W, H, '#0d0d0d', 0),
    out.join('\n'),
    '</svg>',
  ].join('\n')
}

await mkdir(OUT_DIR, { recursive: true })
const files = {
  'theme-stories-en.svg': themeStoriesDoc('en'),
  'theme-stories-zh.svg': themeStoriesDoc('zh'),
}
for (const [name, content] of Object.entries(files)) {
  await writeFile(join(OUT_DIR, name), content)
  console.log('[assets] ' + name + ' ' + content.length + ' B')
}
