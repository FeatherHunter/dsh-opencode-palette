// Star History 数据刷新：把本仓每颗星的「点亮时间」拉下来 → docs/star-history.json → docs/star-history.svg
//
// 用法：
//   node scripts/update-star-history.ts            # 自己调 gh api 拉（需要 gh 已登录）
//   node scripts/update-star-history.ts stars.txt  # 读本地文件（每行一个 ISO 时间戳；CI 用这个）
//
// 为什么脚本自己拉、而不是把 gh 命令散在各处：本地与 CI 走同一套代码，星标数据只有一个来源。
// 拉不到数据时不动现有产物（0 颗星是合法状态，不是错误）。
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { aggregateByDay, buildSvg, withZeroStart, type StarDay } from './star-history.ts'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const REPO = 'FeatherHunter/dsh-opencode-palette'
const JSON_OUT = join(ROOT, 'docs', 'star-history.json')
const SVG_OUT = join(ROOT, 'docs', 'star-history.svg')

function fetchStars(): string[] {
  // Accept 头不能省：默认只返回 stargazer 的用户对象，没有点亮时间
  const out = execFileSync(
    'gh',
    [
      'api',
      '-H',
      'Accept: application/vnd.github.star+json',
      `repos/${REPO}/stargazers?per_page=100`,
      '--paginate',
      '--jq',
      '.[].starred_at',
    ],
    { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
  )
  return out.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
}

const input = process.argv[2]
const list = input
  ? readFileSync(input, 'utf8').split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  : fetchStars()

const data = withZeroStart(aggregateByDay(list))
if (data.length === 0) {
  console.log('No stars fetched — 现有产物保持不动')
  process.exit(0)
}

// 总量只能涨不能跌：GitHub 的 stargazers 列表偶尔会少给几条（分页截断、缓存），
// 跌了就说明这次拉到的是残缺数据 —— 直接红并拒绝写盘，别让图上的曲线凭空掉头。
if (existsSync(JSON_OUT)) {
  const prev = JSON.parse(readFileSync(JSON_OUT, 'utf8')) as StarDay[]
  const prevTotal = Array.isArray(prev) && prev.length > 0 ? prev[prev.length - 1].total : 0
  const nextTotal = data[data.length - 1].total
  if (nextTotal < prevTotal) {
    throw new Error(
      `星标总量从 ${prevTotal} 跌到 ${nextTotal}：这次拉到的是残缺数据（GitHub 分页/缓存问题），拒绝写盘`,
    )
  }
}

// 载荷一律 LF（.gitattributes 也钉了 eol=lf，但写盘这一步自己归一，别指望检出设置）
writeFileSync(JSON_OUT, JSON.stringify(data, null, 2) + '\n')
writeFileSync(SVG_OUT, buildSvg(data))
const last = data[data.length - 1]
console.log(`Wrote docs/star-history.json + docs/star-history.svg (${data.length} days, ${last.total} stars, last ${last.date})`)
