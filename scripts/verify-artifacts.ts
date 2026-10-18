// verify-artifacts.ts — 构建产物门禁（可重复性 / 产物集合 / 生成源同步）
//
// 为什么需要它：派生物（根 client.js 与 package/ 下七件）自 ADR 0004 起不入库，git 不再替我们看住
// 三件本来靠「入库 + git diff」看住的事，这个脚本一次全查：
//   ① 生成源同步：src/engine/font-face.ts 由 src/fonts/*.woff2 现生成，重新生成**前后**都不得与
//      入库版本不同（它是「生成源」，被 tests/engine.test.ts 直接 import、被 typecheck 覆盖，仍入库）。
//      比较用的是「工作区内容 vs HEAD blob」且两侧行尾统一为 LF：`git status --porcelain` 会因
//      stat cache 未刷新给出 phantom ` M` —— 干净 CRLF 新克隆上 blob 完全相同也报改动（实测复现 3/3），
//      而先跑 `npm run fonts` 再比会把「手改生成文件」静默刷掉，所以前后各比一次。
//   ② 构建可重复：连跑两次 `npm run build:artifacts`，八件产物逐字节一致 —— 换机器、换 Node 版本、
//      重跑都不该变，发布出来的 tgz 才能被任何人在任何时间复现；
//   ③ 产物集合精确：必需产物存在且非空；package/lib 里不许有陈旧的额外文件（`files` 白名单是
//      `lib` + `cordis.patch.yml`，多一个文件就会跟着发出去，而 git 已经看不见它们了）。
// 另加两条回归保险：这八件派生物不得再被 git 跟踪（谁 `git add -f` 回来，这里就红）；
// `.gitattributes` 必须钉住 eol=lf —— 产物改成现产后，CRLF 工作区会让构建字节随机器而变。
//
// 用法：
//   npm run verify:artifacts     # 干净 exit 0；任何一条不满足 exit 1（发布流程用）
// 注意：会写盘（重建产物、重生成 font-face.ts），只在干净工作区里跑；git 不可用时跳过索引检查。
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))

// scripts/build-client.ts 末尾的全部写盘目标：入库时代这八件都是跟踪文件，现在由 .gitignore 挡住。
const ARTIFACTS = [
  'client.js',
  'package/lib/client.js',
  'package/lib/index.js',
  'package/lib/channel.js',
  'package/lib/event-list.json',
  'package/package.json',
  'package/README.md',
  'package/cordis.patch.yml',
] as const

// package/lib 的精确内容：陈旧文件（如已删除的 channel.mjs、旧 vendor/）会随 `files: ["lib", ...]` 进包。
const PKG_LIB_EXPECTED = ['channel.js', 'client.js', 'event-list.json', 'index.js'] as const

// 生成源：入库，但必须与「现生成」逐字节一致。
const GENERATED_SOURCE = 'src/engine/font-face.ts'

const failures: string[] = []

function ok(msg: string): void {
  console.log('  ✓ ' + msg)
}

function fail(msg: string): void {
  failures.push(msg)
  console.error('  ✗ ' + msg)
}

// 只用固定的脚本名（'fonts' / 'build:artifacts'），所以整条命令交给 shell 解析是安全的；
// 传 args 数组给 shell 会触发 Node 24 的 DEP0190 警告，这里避开。
function npmRun(script: string): void {
  const r = spawnSync(`npm run ${script}`, { cwd: ROOT, stdio: 'inherit', shell: true })
  if (r.status !== 0) {
    console.error(`[verify-artifacts] 失败: npm run ${script} 未成功，无法继续校验`)
    process.exit(1)
  }
}

function sha256(rel: string): string | null {
  try {
    return createHash('sha256').update(readFileSync(join(ROOT, rel))).digest('hex')
  } catch {
    return null
  }
}

function sizeOf(rel: string): number | null {
  try {
    return statSync(join(ROOT, rel)).size
  } catch {
    return null
  }
}

/** git 可用时返回索引中被跟踪的这些路径（不可用返回 null，调用方跳过检查）。 */
function gitTrackedAmong(paths: readonly string[]): string[] | null {
  const probe = spawnSync('git', ['rev-parse', '--is-inside-work-tree'], { cwd: ROOT, encoding: 'utf8' })
  if (probe.status !== 0) return null
  const r = spawnSync('git', ['ls-files', '--', ...paths], { cwd: ROOT, encoding: 'utf8' })
  if (r.status !== 0) return null
  return r.stdout.split('\n').map((s) => s.trim()).filter((s) => s.length > 0)
}

/** 工作区文本（行尾统一成 LF）：新克隆的 CRLF 工作区不该让门禁假红。 */
function workingText(rel: string): string | null {
  try {
    return readFileSync(join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')
  } catch {
    return null
  }
}

/** HEAD 里的入库版本（行尾统一成 LF）；git 不可用或该路径未入库返回 null。 */
function committedText(rel: string): string | null {
  const r = spawnSync('git', ['show', `HEAD:${rel}`], { cwd: ROOT, encoding: 'utf8' })
  if (r.status !== 0 || typeof r.stdout !== 'string') return null
  return r.stdout.replace(/\r\n/g, '\n')
}

/** 八件产物的 sha256 快照（缺失记 'MISSING'，便于两次构建对比时把缺失也算成不一致）。 */
function snapshot(): Map<string, string> {
  const m = new Map<string, string>()
  for (const rel of ARTIFACTS) m.set(rel, sha256(rel) ?? 'MISSING')
  return m
}

console.log('[verify-artifacts] 1/4 生成源同步：' + GENERATED_SOURCE)
{
  // 先比一次（比的是「手改/漂移」，不是「重新生成的结果」）：跑 fonts 之前就不同 → 有人改了生成文件。
  const head = committedText(GENERATED_SOURCE)
  const before = workingText(GENERATED_SOURCE)
  if (head === null || before === null) {
    console.log('  · 读不到工作区或 HEAD 版本，跳过生成源检查')
  } else if (before !== head) {
    fail(`${GENERATED_SOURCE} 与入库版本不一致（行尾归一化后仍不同）—— 生成文件不要手改；跑 npm run fonts 并提交结果`)
  }
}
npmRun('fonts')
{
  // 再比一次：inputs（src/fonts/*.woff2）漂移时，现生成结果会与入库版本不同。
  const head = committedText(GENERATED_SOURCE)
  const after = workingText(GENERATED_SOURCE)
  if (head === null || after === null) {
    console.log('  · 读不到工作区或 HEAD 版本，跳过生成源检查')
  } else if (after !== head) {
    fail(`${GENERATED_SOURCE} 重新生成后与入库版本不一致 —— 跑 npm run fonts 并把结果提交`)
  } else {
    ok(`${GENERATED_SOURCE} 与 src/fonts/*.woff2 现生成结果一致（行尾归一化后比较）`)
  }
}

console.log('[verify-artifacts] 2/4 构建可重复：连跑两次 npm run build:artifacts')
const first: Map<string, string> = new Map<string, string>()
const second: Map<string, string> = new Map<string, string>()
npmRun('build:artifacts')
for (const [rel, hash] of snapshot()) first.set(rel, hash)
npmRun('build:artifacts')
for (const [rel, hash] of snapshot()) second.set(rel, hash)
{
  let stable = 0
  for (const rel of ARTIFACTS) {
    const a = first.get(rel) ?? 'MISSING'
    const b = second.get(rel) ?? 'MISSING'
    if (a === b) stable += 1
    else fail(`${rel} 两次构建不一致（${a.slice(0, 12)}… → ${b.slice(0, 12)}…）：构建不确定，发布产物无法复现`)
  }
  if (stable === ARTIFACTS.length) ok(`八件产物两次构建逐字节一致（sha256 相同）`)
}

console.log('[verify-artifacts] 3/4 产物存在且非空')
{
  let present = 0
  for (const rel of ARTIFACTS) {
    const size = sizeOf(rel)
    if (size === null) fail(`产物缺失：${rel}（构建器应生成它）`)
    else if (size === 0) fail(`产物为空：${rel}`)
    else present += 1
  }
  if (present === ARTIFACTS.length) ok(`八件产物齐全且非空（client.js ${sizeOf('client.js')} B）`)
}

console.log('[verify-artifacts] 4/4 产物集合精确：package/lib')
{
  let entries: string[] = []
  try {
    entries = readdirSync(join(ROOT, 'package', 'lib')).sort()
  } catch {
    fail('package/lib 目录不存在（构建器应创建它）')
  }
  const expected: string[] = [...PKG_LIB_EXPECTED].sort()
  const extra = entries.filter((e) => !expected.includes(e))
  const missing = expected.filter((e) => !entries.includes(e))
  if (extra.length > 0) fail(`package/lib 里有多余文件：${extra.join(', ')}（会随 files 白名单进包，删掉或让构建器清理）`)
  if (missing.length > 0) fail(`package/lib 缺少文件：${missing.join(', ')}`)
  if (extra.length === 0 && missing.length === 0) ok(`package/lib 恰好 ${expected.length} 个文件，无陈旧残留`)
}

console.log('[verify-artifacts] 附加：派生物不得再被 git 跟踪（ADR 0004 回归保险）')
{
  const tracked = gitTrackedAmong(ARTIFACTS)
  const source = gitTrackedAmong([GENERATED_SOURCE])
  if (tracked === null || source === null) {
    console.log('  · git 不可用，跳过索引检查')
  } else {
    if (tracked.length > 0) fail(`这些派生物又进了 git 索引：${tracked.join(', ')}（git rm --cached 移出；产物由构建现产，见 ADR 0004）`)
    else ok(`八件派生物均未被跟踪（${ARTIFACTS.length} 件）`)
    if (source.length === 0) fail(`${GENERATED_SOURCE} 是生成源，必须入库（tests/engine.test.ts 直接 import）`)
    else ok(`${GENERATED_SOURCE} 仍被跟踪`)
  }
}

console.log('[verify-artifacts] 附加：.gitattributes 钉住 eol=lf（构建字节与机器无关）')
{
  const r = spawnSync('git', ['check-attr', 'eol', '--', GENERATED_SOURCE], { cwd: ROOT, encoding: 'utf8' })
  if (r.status !== 0) {
    console.log('  · git 不可用，跳过 eol 属性检查')
  } else if (!r.stdout.includes('eol: lf')) {
    fail(
      '.gitattributes 没把 eol 钉成 lf：CRLF 工作区会构建出多出等量字节的产物' +
        '（实测 client.js +7921 B），npm pack 的 tgz 哈希随机器而变',
    )
  } else {
    ok('.gitattributes 钉住 eol=lf（工作区 LF，构建字节与机器无关）')
  }
}

if (failures.length > 0) {
  console.error(`\n[verify-artifacts] ${failures.length} 项不通过`)
  process.exit(1)
}
console.log('\n[verify-artifacts] 全部通过')
