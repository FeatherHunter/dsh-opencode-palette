// custom-store.mjs — 自定义主题本地缓存与宿主对账（#86）
// 零导入，打包前后同一语义。localStorage 只做离线/测试兜底，真值恒在宿主。

// 命名空间键（与 STORAGE_KEY 同前缀，避免与宿主其他数据碰撞；
// 票面「缓存一份 customThemes」指缓存内容，键名按仓内习惯加前缀）。
export const CUSTOM_CACHE_KEY = 'dsh.opencode-palette.customThemes'

export function emptyCustomCache() {
  return { themes: [], dirPath: '' }
}

// 读缓存：坏数据/无存储一律回空（绝不抛，SSR 安全）
export function loadCustomCache(storage) {
  try {
    if (!storage || typeof storage.getItem !== 'function') return emptyCustomCache()
    const raw = storage.getItem(CUSTOM_CACHE_KEY)
    if (!raw) return emptyCustomCache()
    const data = JSON.parse(raw)
    if (!data || !Array.isArray(data.themes)) return emptyCustomCache()
    return {
      themes: data.themes,
      dirPath: typeof data.dirPath === 'string' ? data.dirPath : '',
    }
  } catch (e) { return emptyCustomCache() }
}

// 写缓存：成功 true，失败 false（绝不抛）
export function saveCustomCache(storage, data) {
  try {
    if (!storage || typeof storage.setItem !== 'function') return false
    const themes = data && Array.isArray(data.themes) ? data.themes : []
    const dirPath = data && typeof data.dirPath === 'string' ? data.dirPath : ''
    storage.setItem(CUSTOM_CACHE_KEY, JSON.stringify({ themes: themes, dirPath: dirPath }))
    return true
  } catch (e) { return false }
}

// 对账：RPC 成功用宿主值并写缓存；抛错/无桥/坏回包静默回缓存。
// bridge = { call(phone, args) }（client.mjs 的 hostBridge），绝不抛。
export function reconcileCustomThemes(bridge, storage) {
  const fallback = function () {
    const cached = loadCustomCache(storage)
    return { themes: cached.themes, dirPath: cached.dirPath, source: 'cache' }
  }
  try {
    if (!bridge || typeof bridge.call !== 'function') return Promise.resolve(fallback())
    return Promise.resolve().then(function () {
      return bridge.call('palette.customThemesList', {})
    }).then(function (res) {
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
