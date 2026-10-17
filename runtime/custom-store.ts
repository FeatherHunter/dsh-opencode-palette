// custom-store.ts — 自定义主题本地缓存与宿主对账（#86）
// 零导入，打包前后同一语义。localStorage 只做离线/测试兜底，真值恒在宿主。

// 命名空间键（与 STORAGE_KEY 同前缀，避免与宿主其他数据碰撞；
// 票面「缓存一份 customThemes」指缓存内容，键名按仓内习惯加前缀）。
export const CUSTOM_CACHE_KEY = 'dsh.opencode-palette.customThemes'

// localStorage 的最小面：只用到读写两法；测试可传同形假件，无存储时传 null。
interface CustomStorage {
  getItem?(key: string): string | null
  setItem?(key: string, value: string): unknown
}

// 缓存里主题的最小公共形状：只约束 name/id，其余字段原样透传（零导入，不引用引擎/宿主类型）。
interface CachedTheme {
  readonly id?: unknown
  readonly name?: unknown
}

// 本地缓存形状（themes 与宿主列表同构，内容不做校验，坏数据在读取侧兜底）。
interface CustomCache {
  themes: CachedTheme[]
  dirPath: string
}

// 对账结果：source 标明真值来自宿主 RPC 还是本地缓存兜底。
interface ReconcileResult {
  themes: CachedTheme[]
  dirPath: string
  source: 'cache' | 'rpc'
}

// 宿主桥（client.ts 的 hostBridge）：只要求 call。
interface HostBridge {
  call(phone: string, args: Record<string, unknown>): Promise<CustomThemesListReply | null | undefined>
}

// palette.customThemesList 回包的最小可读面（字段逐个窄化，坏回包静默回缓存）。
interface CustomThemesListReply {
  ok?: unknown
  themes?: unknown
  dirPath?: unknown
}

export function emptyCustomCache(): CustomCache {
  return { themes: [], dirPath: '' }
}

// 读缓存：坏数据/无存储一律回空（绝不抛，SSR 安全）
export function loadCustomCache(storage: CustomStorage | null | undefined): CustomCache {
  try {
    if (!storage || typeof storage.getItem !== 'function') return emptyCustomCache()
    const raw = storage.getItem(CUSTOM_CACHE_KEY)
    if (!raw) return emptyCustomCache()
    const data: Partial<CustomCache> = JSON.parse(raw)
    if (!data || !Array.isArray(data.themes)) return emptyCustomCache()
    return {
      themes: data.themes,
      dirPath: typeof data.dirPath === 'string' ? data.dirPath : '',
    }
  } catch (e) { return emptyCustomCache() }
}

// 写缓存：成功 true，失败 false（绝不抛）
export function saveCustomCache(storage: CustomStorage | null | undefined, data: CustomCache | null | undefined): boolean {
  try {
    if (!storage || typeof storage.setItem !== 'function') return false
    const themes = data && Array.isArray(data.themes) ? data.themes : []
    const dirPath = data && typeof data.dirPath === 'string' ? data.dirPath : ''
    storage.setItem(CUSTOM_CACHE_KEY, JSON.stringify({ themes: themes, dirPath: dirPath }))
    return true
  } catch (e) { return false }
}

// 对账：RPC 成功用宿主值并写缓存；抛错/无桥/坏回包静默回缓存。
// bridge = { call(phone, args) }（client.ts 的 hostBridge），绝不抛。
export function reconcileCustomThemes(bridge: HostBridge | null | undefined, storage: CustomStorage | null | undefined): Promise<ReconcileResult> {
  const fallback = function (): ReconcileResult {
    const cached = loadCustomCache(storage)
    return { themes: cached.themes, dirPath: cached.dirPath, source: 'cache' }
  }
  try {
    if (!bridge || typeof bridge.call !== 'function') return Promise.resolve(fallback())
    return Promise.resolve().then(function () {
      return bridge.call('palette.customThemesList', {})
    }).then(function (res): ReconcileResult {
      if (res && res.ok === true && Array.isArray(res.themes)) {
        const data = {
          themes: res.themes,
          dirPath: typeof res.dirPath === 'string' ? res.dirPath : '',
        }
        saveCustomCache(storage, data)
        return { themes: data.themes, dirPath: data.dirPath, source: 'rpc' }
      }
      return fallback()
    }).catch(function () { return fallback() })
  } catch (e) { return Promise.resolve(fallback()) }
}
