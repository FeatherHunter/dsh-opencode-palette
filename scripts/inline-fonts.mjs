// inline-fonts.mjs — 字体内联：将 src/fonts/*.woff2 转为 src/engine/font-face.mjs
// 原理（第一性原理）：浏览器按 font-family 栈逐个解析，缺字静默回退；
// @font-face + data URI 让首选字体在任何机器上都可解析，无需本机安装、无需网络。
// 确定性：输入是已落盘的 woff2 二进制（版本见 MANIFEST），输出纯字符串模块；
// 无网络依赖，可重复运行（npm run build 会先跑本脚本，保证产物与二进制一致）。
import { readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))

// 随包清单：仅 OFL 许可、可再分发的 4 款（3 等宽 + Inter 界面正文）；SF Mono（Apple 私有）/ Consolas（Microsoft 私有）
// 不可随包，面板侧做本地检测 + 灰显（见 runtime/client.mjs）。
// unicode-range 取 fontsource latin 子集标准范围，与文件覆盖一致。
const LATIN_RANGE = 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD'
const MANIFEST = [
  { family: 'JetBrains Mono', id: 'jetbrains-mono', weights: [400, 500, 700], version: '5.3.0', license: 'OFL-1.1' },
  { family: 'Fira Code', id: 'fira-code', weights: [400, 500, 700], version: '5.3.0', license: 'OFL-1.1' },
  { family: 'Cascadia Code', id: 'cascadia-code', weights: [400, 500, 700], version: '5.3.0', license: 'OFL-1.1' },
  { family: 'Inter', id: 'inter', weights: [400, 500, 700], version: '5.3.0', license: 'OFL-1.1' },
  { family: 'IBM Plex Mono', id: 'ibm-plex-mono', weights: [400, 500, 700], version: '5.3.0', license: 'OFL-1.1' },
]

const q = (s) => JSON.stringify(s)

async function main() {
  const faces = []
  let total = 0
  for (const f of MANIFEST) {
    for (const w of f.weights) {
      const file = f.id + '-latin-' + w + '-normal.woff2'
      const bin = await readFile(join(ROOT, 'src', 'fonts', file))
      total += bin.length
      faces.push('@font-face{font-family:' + q(f.family) + ';font-style:normal;font-display:swap;font-weight:' + w + ';src:url(data:font/woff2;base64,' + bin.toString('base64') + ') format(' + q('woff2') + ');unicode-range:' + LATIN_RANGE + '}')
    }
  }
  const out = [
    '// font-face.mjs — 生成文件，勿手改（`node scripts/inline-fonts.mjs` 重新生成）',
    '// 内容：4 款 OFL 字体 × 400/500/700 latin 子集的 @font-face（data URI 内联）。',
    '// 来源：fontsource ' + MANIFEST.map((f) => f.id + '@' + f.version).join('、') + '，OFL-1.1（见 src/themes/THIRD_PARTY_NOTICES.md）。',
    '// SF Mono / Consolas 因私有许可未收录，面板侧本地检测。',
    'export const BUNDLED_FONTS = ' + JSON.stringify(MANIFEST.map((f) => f.family)) + '',
    'export const FONT_FACE_CSS = ' + q(faces.join('')) + '',
    '',
  ].join('\n')
  await writeFile(join(ROOT, 'src', 'engine', 'font-face.mjs'), out)
  console.log('[inline-fonts] ' + faces.length + ' faces, woff2 ' + total + 'B -> font-face.mjs ' + out.length + 'B')
}

await main()
