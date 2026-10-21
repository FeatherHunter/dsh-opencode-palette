// sync-readme-version.ts — 把两页 README 里的「当前版本号」刷成 package.json 的版本
//
// 为什么需要它：UPGRADE 段要给用户看真实的最新版本号，不能留 <版本> 这种占位符；
// 但版本号会随发布变 —— 手改一次就容易漏下一次，README 里的版本号悄悄过期。
// 这里把版本号当成「从 package.json 派生出来的文本」：改完版本号跑一次本脚本，两页同时刷新。
//
// 定位规则（只认这两种写法，不靠猜；所以文案里别再手抄第三种版本号写法）：
//   ① `dsh-opencode-palette@<semver>` —— 钉版本的命令行
//   ② `当前 <semver>` / `currently <semver>` —— 注释里的「当前版本」
//
// 用法：
//   npm run readme:version          # 写盘（幂等：已是目标版本就什么都不做）
//   npm run readme:version:check    # 只查不写；版本号过期时 exit 1（发布前用）
//
// 写盘只替换版本号那一段文本，其余字节原样保留 —— 行尾（CRLF/LF）不被改写。
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const DOCS = ['README.md', join('docs', 'README.en.md')] as const
const SEMVER = String.raw`\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?`

/** 把一份文档里的版本号写法全部换成目标版本 */
function rewrite(text: string, version: string): string {
  return text
    .replace(new RegExp(`(dsh-opencode-palette@)(?:${SEMVER})`, 'g'), (_m, prefix: string) => `${prefix}${version}`)
    .replace(new RegExp(`(当前|currently) (?:${SEMVER})`, 'g'), (_m, prefix: string) => `${prefix} ${version}`)
}

function main(): void {
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')) as { version: string }
  const version = pkg.version
  const check = process.argv.includes('--check')
  let stale = 0
  console.log(`[readme:version] 目标版本 ${version}`)
  for (const rel of DOCS) {
    const path = join(ROOT, rel)
    const text = readFileSync(path, 'utf8')
    const next = rewrite(text, version)
    if (next === text) {
      console.log(`  ✓ ${rel}：版本号已是 ${version}`)
      continue
    }
    stale++
    if (check) {
      console.error(`  ✗ ${rel}：版本号过期 —— 跑 npm run readme:version 刷成 ${version}`)
    } else {
      writeFileSync(path, next, 'utf8')
      console.log(`  ✓ ${rel}：版本号刷成 ${version}`)
    }
  }
  if (check && stale > 0) {
    console.error('[readme:version] 有文档的版本号过期了')
    process.exit(1)
  }
}

main()
