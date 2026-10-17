// types/dsh-usage.fixture.ts —— 仅供 `npm run typecheck` 的编译期夹具：
// 把 types/dsh.d.ts 的声明面全部用一遍，证明「签名可用、方向对得上」。
// 不参与运行时，不会被 bundler/测试引用；放在 types/ 是为了让它成为 typecheck 的一部分。
// 维护约定：dsh.d.ts 增删成员时同步改这里（红/绿 即自检）。

// 1) ctx 的字面量重载：5 个服务键 + 兜底 unknown
const ctx = {} as DshContext
const theme: DshThemeService | undefined = ctx.get('theme')
const slots: DshSlotsService | undefined = ctx.get('slots')
const locale: DshLocaleService | null | undefined = ctx.get('locale')
const timer: DshTimerService | undefined = ctx.get('timer')
const connection: DshConnectionService | null | undefined = ctx.get('connection')
const fallback: unknown = ctx.get('not-a-service')
const globalLocale: DshLocaleService | null | undefined = ctx.locale
const effectMarker: unknown = ctx.effect(() => () => {}, 'fixture')

// 2) theme 服务：快照只读字段 + 覆盖 token 的撤销器
const snapshot: DshThemeSnapshot | undefined = theme?.getTheme()
const preference: string | undefined = snapshot?.active?.preference
const scheme: 'light' | 'dark' | undefined = snapshot?.active?.colorScheme
const revision: number | undefined = snapshot?.revision
theme?.setTheme('tokyonight')
// token 覆盖是「token 名 → 明暗两半」：delegated 画布下可以只给一半
const undo: (() => void) | undefined = theme?.overrideTokens('opencode-palette', { '--bg': { dark: '#000' } })
undo?.()

// 3) slots：inject 工厂（返回清理器 / 清理器可迭代）+ register 选项对象
slots?.inject('panel', () => () => {})
slots?.inject('panel-iter', () => [() => {}, () => {}])
slots?.register({ name: 'settings.plugins.tab', id: 'palette', order: 10, label: () => 'Palette' }, {})
slots?.register({ name: 'tool.view.cordis', label: 'Palette', inject: (...args: unknown[]) => args.length }, {})

// 4) locale：快照 + 注册字典 + 订阅
const activeLocale: string | undefined = locale?.getLocale().active
const unsubscribeLocale: (() => void) | undefined = locale?.register('palette', { en: { title: 'Palette' } })
const unsubscribeSignal: (() => void) | undefined = locale?.subscribe(() => {})

// 5) timer：清理器由服务返回
const clearTimer: (() => void) | undefined = timer?.setTimeout(() => {}, 16)

// 6) connection：fetch 路由注册 + rpc 调用结果
const route: DshFetchRoute = {
  path: '/dsh-opencode-palette/state',
  methods: ['POST'],
  requestBody: 'buffered',
  fetch: async (request) => new Response(await request.text()),
}
const unregisterRoute: (() => void) | undefined = connection?.fetch.register(route)
const rpcResult: Promise<DshRpcResult> | undefined = connection?.rpc.call('channel', 'endpoint', { method: 'GET' }, undefined)

// 7) 动态版自由变量 host（无官方 d.ts，靠 runner README 固定名约约定）
const bridge: DshHostBridge | undefined = host
const hostCall: Promise<unknown> | undefined = bridge?.call('theme', { id: 'tokyonight' })

// 8) 本仓自定义全局（client.mjs:873-874 写入、:1962 删除）
__opencodePalette = { version: 1 }
const paletteGlobal: Record<string, unknown> | undefined = __opencodePalette

// 9) 负向断言：get('theme') 返回的是约束过的服务类型，不是 any
// @ts-expect-error DshThemeService 上不存在这个方法
theme?.noSuchMethod()

// 占位引用，避免未使用变量在开启 noUnusedLocals 时误报（本文件是夹具，全部成员都要被“用到”）
void [fallback, globalLocale, effectMarker, preference, scheme, revision, activeLocale, unsubscribeLocale, unsubscribeSignal, clearTimer, unregisterRoute, rpcResult, hostCall, paletteGlobal]
