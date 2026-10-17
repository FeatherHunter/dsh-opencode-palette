// types/dsh.d.ts —— DSH 插件受用面（最小环境声明，全局脚本：不得出现顶层 import/export）
// 依据：@deepseek-ai/*@0.2.1-rc.2 发布包的 lib/types/**/*.d.ts 与 cordis@4.0.5，
//       加本仓 runtime/client.mjs、runtime/host.mjs 的实际调用形状（见 docs/research/ts-migration-typing-surface-105.md §6）。
// 升级 DSH 时按该文档 §7.2 的 10 步核对清单逐服务 diff；本文件没有 CI 对照官方 d.ts，签名会随宿主升级悄悄过期。
//
// 故意偏离官方签名的两处（升级复核时重点看）：
//   1. DshTokenModes 的 light/dark 放宽为可选 —— src/engine/generate.ts 的 delegated 画布分支 在 delegated 画布下只写一半。
//   2. DshLocaleService.register 的 namespace 放宽为 string —— 官方是 LocaleNamespaceMap 泛型键。
// 与 #105 §6.2 草案的偏离（宿主半迁移时按实际调用补齐；落地后以本文件为准）：
//   3. DshTimerService 增加 timeout —— §6.2 草案 / §6.3 表只记了 setTimeout，但 cordis-plugin-timer@1.1.7
//      的 TimerService mixin 同时提供 timeout 与 setTimeout（setTimeout 是 timeout 的废弃别名），
//      且 dsh-log 的 LogTimer 取的就是 timeout（runtime/host.ts 把它交给 dsh-log 落日志），故按运行时形状补齐。
// 说明：docs/research/ts-migration-typing-surface-105.md §6.2 是设计草案，落地后以本文件为准。
// 动态版自由变量 host 无官方 d.ts（runner README 约定固定名）；若 runner 改成 invoke 语义需同步本文件。

/** cordis Context 中本插件实际使用的面；五个服务键用字面量重载，拼错会被编译器拒绝（刻意不留 string 兜底） */
interface DshContext {
  get(name: 'theme'): DshThemeService | undefined
  get(name: 'slots'): DshSlotsService | undefined
  get(name: 'locale'): DshLocaleService | null | undefined
  get(name: 'timer'): DshTimerService | undefined
  get(name: 'connection'): DshConnectionService | null | undefined
  /** cordis fiber.effect：执行体立即运行，返回值是清理器 */
  effect(execute: () => () => void, label?: string): unknown
  /** 动态版没有 ctx 时，某些路径只读 ctx.locale */
  readonly locale?: DshLocaleService | null
}

interface DshThemeService {
  getTheme(): DshThemeSnapshot
  setTheme(id: string): void
  /** 返回撤销覆盖的函数；官方 0.2.1 签名：overrideTokens(source, tokens): () => void */
  overrideTokens(source: string, tokens: Record<string, DshTokenModes>): () => void
}

interface DshThemeSnapshot {
  readonly preference?: string
  readonly active?: {
    readonly preference?: string
    readonly colorScheme?: 'light' | 'dark'
  }
  readonly revision?: number
}

/**
 * 官方 ThemeTokenModes 两半必填；本仓 delegated 画布会只给一半
 * （src/engine/generate.ts 的 delegated 画布分支），故这里放宽为可选——这是有意的分歧点。
 */
interface DshTokenModes {
  readonly light?: string
  readonly dark?: string
}

interface DshSlotsService {
  inject(key: string, factory: () => (() => void) | Iterable<() => void>): () => void
  register(options: DshSlotRegistration, component: unknown): () => void
}

interface DshSlotRegistration {
  name: string
  id?: string
  order?: number
  label?: string | (() => string)
  inject?: (...args: unknown[]) => unknown
}

interface DshLocaleService {
  getLocale(): { readonly active: string }
  register(namespace: string, dicts: Record<string, Record<string, string>>): () => void
  subscribe(listener: () => void): () => void
}

interface DshTimerService {
  setTimeout(handler: () => void, delay: number): () => void
  /** cordis-plugin-timer 的 TimerService.timeout：回调式调度，返回值是清理器（dsh-log 的 LogTimer 即此形状） */
  timeout(handler: () => void, delay: number): () => void
}

interface DshConnectionService {
  readonly fetch: { register(route: DshFetchRoute): () => void }
  readonly rpc: {
    call(
      channel: string,
      endpoint: string,
      payload: unknown,
      signal?: AbortSignal,
    ): Promise<DshRpcResult>
  }
}

interface DshFetchRoute {
  path: string
  methods: readonly ('GET' | 'HEAD' | 'POST')[]
  requestBody: 'buffered' | 'streaming'
  fetch(request: Request): Promise<Response>
}

type DshRpcResult =
  | { readonly ok: true; readonly value: unknown }
  | { readonly ok: false; readonly error: { readonly code: string; readonly message: string } }

/** 动态版（cordis_define）runner 注入的自由变量 host；无官方 .d.ts */
interface DshHostBridge {
  call(phone: string, args: unknown): Promise<unknown>
}

declare var host: DshHostBridge | undefined

/** 本仓自定义全局（runtime/client.mjs:873-874 写入、:1962 删除） */
declare var __opencodePalette: Record<string, unknown> | undefined
