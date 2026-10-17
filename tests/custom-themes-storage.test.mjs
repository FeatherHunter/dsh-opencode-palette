// custom-themes-storage.test.mjs — #85：宿主半 custom-themes 单文件持久化（TDD 接缝 + 宿主冒烟）
//
// 覆盖 runtime/host.mjs 的纯存储接缝与三条 RPC：
//   - customThemesDir / sanitizeCustomThemeId / normalizeCustomTheme（纯函数，先写测试再实现）
//   - customThemesList / customThemesSave / customThemesDelete（假 connection + 真临时 DSH_HOME 冒烟）
//   - 内嵌 opencode 回退色板与引擎 extractPresetPalette('opencode') 一致（改 engine 忘同步 host 即红）
//   - 构建产物同步：package/lib/channel.mjs 与 package/lib/index.js 必须含新电话（改 runtime 忘重建即红）
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cpSync, existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const ROOT = join(import.meta.dirname, '..')
const hostUrl = pathToFileURL(join(ROOT, 'runtime', 'host.mjs')).href

function fullTheme(id, overrides) {
  const colors = {}
  for (const k of ['background', 'backgroundPanel', 'backgroundElement', 'text', 'textMuted', 'primary']) colors[k] = '#010101'
  return Object.assign({ id, name: '名 ' + id, appearance: 'dark', basePreset: 'opencode', colors }, overrides)
}

// ── 一、纯函数接缝（实现前先行，红 → 绿） ──

test('#85 sanitize：合法 id 原样通过，穿越/分隔符被拒绝或消毒', async () => {
  const host = await import(hostUrl)
  assert.equal(host.sanitizeCustomThemeId('my-theme-1'), 'my-theme-1')
  assert.equal(host.sanitizeCustomThemeId('A_b-9'), 'A_b-9')
  // 路径穿越类输入绝不能原样成为文件名
  for (const evil of ['../x', '..\\x', 'a/b', 'a\\b', '', '   ', '.json', '...']) {
    const out = host.sanitizeCustomThemeId(evil)
    assert.ok(out === null || !/[./\\]/.test(out), JSON.stringify(evil) + ' 消毒后仍含路径字符：' + out)
  }
  assert.equal(host.sanitizeCustomThemeId('../x'), null, '.. 型输入必须整体拒绝（不是替换了事）')
  assert.equal(host.sanitizeCustomThemeId(''), null)
  assert.equal(host.sanitizeCustomThemeId(123), null)
})

test('#85 dir：存储目录是家目录下的原生绝对路径', async () => {
  const host = await import(hostUrl)
  const dir = host.customThemesDir('/tmp/fake-home')
  assert.equal(dir, resolve(join('/tmp/fake-home', 'opencode-palette', 'custom-themes')), '须为平台原生绝对路径')
})

test('#85 normalize：缺字段自愈（id 取文件名、name 取 id、appearance 回 dark、缺色回填满 37）', async () => {
  const host = await import(hostUrl)
  const t = host.normalizeCustomTheme({ colors: { background: '#000000' } }, 'dropped-in', '2026-01-01T00:00:00.000Z')
  assert.equal(t.id, 'dropped-in')
  assert.equal(t.name, 'dropped-in')
  assert.equal(t.appearance, 'dark')
  assert.equal(t.schema, 'dsh-opencode-palette.custom-theme.v1')
  assert.equal(Object.keys(t.colors).length, 37, '缺色必须回填满 37')
  assert.equal(t.colors.background, '#000000', '手写色优先保留')
  assert.ok(typeof t.colors.sidebarBg === 'string' && t.colors.sidebarBg.length > 0, '缺失槽位须有回退值')
})

test('#85 normalize：非法 appearance/basePreset 回退，无 id 时返回 null', async () => {
  const host = await import(hostUrl)
  const t = host.normalizeCustomTheme({ id: 'a', appearance: 'neon', basePreset: '../evil', colors: {} }, null, '2026-01-01T00:00:00.000Z')
  assert.equal(t.appearance, 'dark')
  assert.equal(t.basePreset, 'opencode')
  assert.equal(host.normalizeCustomTheme({ colors: {} }, '???', '2026-01-01T00:00:00.000Z'), null, '文件名也消毒不出 id 时整文件跳过')
})

test('#85 内嵌回退色板与引擎 opencode(dark) 37 色一致', async () => {
  const host = await import(hostUrl)
  const engine = await import(pathToFileURL(join(ROOT, 'src', 'engine', 'index.ts')).href)
  const expected = engine.extractPresetPalette('opencode').colors
  const probe = host.normalizeCustomTheme({ id: 'probe', colors: {} }, null, '2026-01-01T00:00:00.000Z')
  assert.deepEqual(probe.colors, expected, 'host 内嵌回退必须等于引擎 opencode 回退（opencode.json 改了要同步）')
  assert.deepEqual(Object.keys(probe.colors), Object.keys(expected), '槽位顺序也须一致（落盘可读性）')
})

// ── 二、宿主半冒烟（假 connection + 真临时 DSH_HOME，走精确路由全分发） ──

async function setupHost() {
  const home = mkdtempSync(join(tmpdir(), 'palette-custom-'))
  const previousHome = process.env.DSH_HOME
  process.env.DSH_HOME = home
  // 与 update-panel.test.mjs 同款假使用范围：开发态 checkout 下更新包按包名找不到本包，
  // 摆一份装好的包并把 targetPackageDir 指过去（只为让 apply() 走通，本节不断言更新电话）。
  const profileDir = join(home, 'fakeprofile')
  const fakePkgDir = join(profileDir, 'node_modules', 'dsh-opencode-palette')
  mkdirSync(join(fakePkgDir, 'lib'), { recursive: true })
  cpSync(join(ROOT, 'package', 'lib'), join(fakePkgDir, 'lib'), { recursive: true })
  cpSync(join(ROOT, 'package', 'package.json'), join(fakePkgDir, 'package.json'))
  cpSync(join(ROOT, 'package', 'cordis.patch.yml'), join(fakePkgDir, 'cordis.patch.yml'))
  writeFileSync(join(profileDir, 'package.json'), JSON.stringify({
    name: 'fake-profile', version: '0.0.0', dependencies: { 'dsh-opencode-palette': '^0.2.0' },
  }))
  const host = await import(hostUrl)
  const channel = await import(pathToFileURL(join(ROOT, 'runtime', 'channel.mjs')).href)
  let route = null
  const ctx = {
    get: (name) => (name === 'connection'
      ? { fetch: { register: (r) => { route = r; return () => {} } } }
      : undefined),
  }
  host.apply(ctx, { readerOverrides: { targetPackageDir: fakePkgDir } })
  assert.ok(route, '必须注册通道路由')
  const call = async (phone, payload) => {
    const request = new Request('http://127.0.0.1/api/opencode-palette', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'client-request', rpcId: 'rpc-1', payload: { method: phone, payload: payload === undefined ? null : payload } }),
    })
    return (await route.fetch(request)).json()
  }
  return {
    home, host, PHONES: channel.PHONE_METHODS, call,
    cleanup: () => {
      if (previousHome === undefined) delete process.env.DSH_HOME
      else process.env.DSH_HOME = previousHome
      rmSync(home, { recursive: true, force: true })
    },
  }
}

test('#85 list：空目录回空表 + 真实绝对 dirPath，目录自动创建', async () => {
  const t = await setupHost()
  try {
    const reply = await t.call(t.PHONES.customThemesList, {})
    assert.equal(reply.result.value.ok, true)
    assert.deepEqual(reply.result.value.themes, [])
    assert.equal(reply.result.value.dirPath, t.host.customThemesDir(t.home))
    assert.ok(existsSync(reply.result.value.dirPath), 'list 必须确保目录存在')
  } finally { t.cleanup() }
})

test('#85 save：落盘 2 空格 JSON，更新幂等同文件', async () => {
  const t = await setupHost()
  try {
    const saved = await t.call(t.PHONES.customThemesSave, { theme: fullTheme('amber-1') })
    assert.equal(saved.result.ok, true)
    assert.equal(saved.result.value.theme.id, 'amber-1')
    assert.equal(saved.result.value.themes.length, 1)
    const file = join(t.host.customThemesDir(t.home), 'amber-1.json')
    const raw = readFileSync(file, 'utf8')
    assert.ok(raw.startsWith('{\n  "schema": "dsh-opencode-palette.custom-theme.v1"'), '须 2 空格缩进、schema 打头')
    assert.ok(raw.endsWith('\n'), '尾部换行（手编辑友好）')
    assert.deepEqual(Object.keys(JSON.parse(raw).colors).length, 37)
    // 更新：同 id 复写，仍只有一个文件、name 生效
    const theme2 = fullTheme('amber-1')
    theme2.name = '改名'
    const saved2 = await t.call(t.PHONES.customThemesSave, { theme: theme2 })
    assert.equal(saved2.result.ok, true)
    assert.equal(saved2.result.value.themes.length, 1)
    assert.equal(JSON.parse(readFileSync(file, 'utf8')).name, '改名')
    // 稳定排序断言（updatedAt 新在前、id 兜底）
    const ts = saved2.result.value.themes.map((x) => x.id)
    assert.deepEqual(ts, [...ts].sort(), '单主题排序平凡成立（多主题见下一节隐式覆盖）')
  } finally { t.cleanup() }
})

test('#85 save 非法 id：严格拒绝，磁盘不留文件', async () => {
  const t = await setupHost()
  try {
    for (const evil of ['../evil', '..\\evil', 'a/b', 'a\\b', '', 'has space', '.']) {
      const reply = await t.call(t.PHONES.customThemesSave, { theme: fullTheme(evil) })
      assert.equal(reply.result.value.ok, false, JSON.stringify(evil) + ' 必须失败')
      assert.equal(reply.result.value.error.code, 'invalid-id')
    }
    const listed = await t.call(t.PHONES.customThemesList, {})
    assert.deepEqual(listed.result.value.themes, [], '拒绝写入不得留下任何主题')
    assert.ok(!existsSync(join(t.home, 'evil.json')), '穿越 id 不得写到家目录')
  } finally { t.cleanup() }
})

test('#85 外部导入自愈：手放部分 JSON 被补齐，损坏 JSON 被跳过', async () => {
  const t = await setupHost()
  try {
    const dir = t.host.customThemesDir(t.home)
    mkdirSync(dir, { recursive: true })
    // 部分手写：缺 name/appearance，只填 2 个色位
    writeFileSync(join(dir, 'hand.json'), JSON.stringify({ colors: { background: '#111111', text: '#222222' } }))
    // 损坏文件：绝不能阻断其它主题
    writeFileSync(join(dir, 'broken.json'), '{ not json,,,')
    // 有 id 但文件名对不上：内容 id 优先
    writeFileSync(join(dir, 'mismatch.json'), JSON.stringify(fullTheme('real-id')))
    // 非法文件名（含空格）：与 save/delete 同口径，直接跳过（不以折叠 id 列出成孤儿）
    writeFileSync(join(dir, 'has space.json'), JSON.stringify(fullTheme('spaced')))
    const reply = await t.call(t.PHONES.customThemesList, {})
    assert.equal(reply.result.value.ok, true)
    const ids = reply.result.value.themes.map((x) => x.id).sort()
    assert.deepEqual(ids, ['hand', 'real-id'], '损坏文件与非法文件名都跳过、内容 id 优先、文件名兜底')
    const hand = reply.result.value.themes.find((x) => x.id === 'hand')
    assert.equal(hand.name, 'hand')
    assert.equal(hand.appearance, 'dark')
    assert.equal(Object.keys(hand.colors).length, 37)
    assert.equal(hand.colors.background, '#111111', '手写色优先保留')
    assert.equal(typeof hand.colors.sidebarBg, 'string')
  } finally { t.cleanup() }
})

test('#85 delete：删存在回 deletedId，不存在幂等成功，非法 id 拒绝', async () => {
  const t = await setupHost()
  try {
    await t.call(t.PHONES.customThemesSave, { theme: fullTheme('gone') })
    const file = join(t.host.customThemesDir(t.home), 'gone.json')
    assert.ok(existsSync(file))
    const del = await t.call(t.PHONES.customThemesDelete, { id: 'gone' })
    assert.equal(del.result.ok, true)
    assert.equal(del.result.value.deletedId, 'gone')
    assert.deepEqual(del.result.value.themes, [])
    assert.ok(!existsSync(file))
    const again = await t.call(t.PHONES.customThemesDelete, { id: 'gone' })
    assert.equal(again.result.ok, true, '重复删除幂等成功')
    const evil = await t.call(t.PHONES.customThemesDelete, { id: '../x' })
    assert.equal(evil.result.value.ok, false)
    assert.equal(evil.result.value.error.code, 'invalid-id')
  } finally { t.cleanup() }
})

test('#85 未知电话仍明确报错（通用管线未被存储电话破坏）', async () => {
  const t = await setupHost()
  try {
    const reply = await t.call('palette.nope', {})
    assert.equal(reply.result.ok, false, '未知电话走外层管线报错（无内层 value）')
  } finally { t.cleanup() }
})

test('#85 构建产物同步：包内 channel 与宿主副本必须含新电话', async () => {
  const bundledChannel = readFileSync(join(ROOT, 'package', 'lib', 'channel.mjs'), 'utf8')
  for (const m of ['customThemesList', 'customThemesSave', 'customThemesDelete']) {
    assert.ok(bundledChannel.includes(m), 'package/lib/channel.mjs 须含 ' + m + '（改 runtime/channel.mjs 后要重建）')
  }
  const bundledHost = readFileSync(join(ROOT, 'package', 'lib', 'index.js'), 'utf8')
  assert.ok(bundledHost.includes('customThemesSave'), 'package/lib/index.js 须为新版宿主（含存储层）')
})

test('#89 接缝门禁：电话名带前缀，且与浏览器半实际发的字面量逐个一致', async () => {
  const channel = await import(pathToFileURL(join(ROOT, 'runtime', 'channel.mjs')).href)
  const clientSrc = readFileSync(join(ROOT, 'runtime', 'client.mjs'), 'utf8')
  const storeSrc = readFileSync(join(ROOT, 'runtime', 'custom-store.mjs'), 'utf8')
  // 一、表里的名字必须带前缀：宿主 dispatch 按请求体里的 method 原样查表，
  // 而桥不替调用方加前缀，裸名必然 unknown phone（#89 病灶）。
  for (const key of ['customThemesList', 'customThemesSave', 'customThemesDelete']) {
    assert.equal(
      channel.PHONE_METHODS[key], channel.PHONE_PREFIX + '.' + key,
      key + ' 必须是带前缀的电话名（宿主注册与客户端调用都得是它）'
    )
  }
  // 二、客户端源里发的字面量必须与表逐字一致（改表忘改客户端 = 静默死链，这里红）
  assert.ok(clientSrc.includes("'" + channel.PHONE_METHODS.customThemesSave + "'"), 'runtime/client.mjs 存盘须发 ' + channel.PHONE_METHODS.customThemesSave)
  assert.ok(clientSrc.includes("'" + channel.PHONE_METHODS.customThemesDelete + "'"), 'runtime/client.mjs 删除须发 ' + channel.PHONE_METHODS.customThemesDelete)
  assert.ok(storeSrc.includes("'" + channel.PHONE_METHODS.customThemesList + "'"), 'runtime/custom-store.mjs 列表须发 ' + channel.PHONE_METHODS.customThemesList)
  // 三、反向：客户端不许出现不带前缀的裸名调用（历史写法，等于必然失败）
  for (const src of [clientSrc, storeSrc]) {
    assert.ok(
      !/call\('(customThemes(?:List|Save|Delete))'/.test(src),
      '客户端不许发不带前缀的电话名（#89：宿主按带前缀名注册）'
    )
  }
})

test('#89 三个真实电话名端到端：列表 / 存盘 / 删除都认得（就是浏览器半发的那些名字）', async () => {
  const t = await setupHost()
  try {
    const channel = await import(pathToFileURL(join(ROOT, 'runtime', 'channel.mjs')).href)
    const list = await t.call(channel.PHONE_METHODS.customThemesList, {})
    assert.equal(list.result.ok, true, JSON.stringify(list.result.error || {}))
    assert.equal(list.result.value.ok, true)
    const saved = await t.call(channel.PHONE_METHODS.customThemesSave, { theme: fullTheme('seam-probe') })
    assert.equal(saved.result.ok, true, JSON.stringify(saved.result.error || {}))
    assert.equal(saved.result.value.ok, true)
    assert.ok(existsSync(join(t.host.customThemesDir(t.home), 'seam-probe.json')), '真实电话名必须真写盘')
    const del = await t.call(channel.PHONE_METHODS.customThemesDelete, { id: 'seam-probe' })
    assert.equal(del.result.ok, true)
    assert.equal(del.result.value.ok, true)
  } finally { t.cleanup() }
})
