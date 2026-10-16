/**
 * runtime/channel.mjs — 浏览器半与宿主半共用的接线常量（单一真源）
 *
 * 两侧必须逐个对上，写错一个就整条通道静默不通，所以只在这里定义一次：
 *   - 宿主半用 fetch.register 注册精确路由 ROUTE_PATH；
 *   - 浏览器半用 connection.rpc.call(CHANNEL, ENDPOINT, ...) 调它（拼出的路径同为 ROUTE_PATH）。
 *
 * 命名规则（DSH 连接服务）：通道 CHANNEL 必须匹配 /^\/[A-Za-z0-9._~-]+$/（单段，故只能 /api）；
 * 端点 ENDPOINT 必须匹配 /^[A-Za-z0-9_$.-]+$/。真正的电话名在请求体里，不受这条限制。
 */

/** /api 载体上的通道名（与 deck、im-companion 同构：DSH 公开的精确路由载体）。 */
export const CHANNEL = '/api'
/** 本插件的端点名；注册路径 = CHANNEL + '/' + ENDPOINT。 */
export const ENDPOINT = 'opencode-palette'
/** 宿主注册的精确路径，客户端拼出的路径必须与它一致。 */
export const ROUTE_PATH = CHANNEL + '/' + ENDPOINT

/** 插件标识（日志落盘目录、更新环境指纹、事件清单三处共用一个值）。 */
export const PLUGIN_ID = 'dsh-opencode-palette'
/** 电话名前缀：日志电话与更新电话共用，电话名由两侧从包函数派生（产物里不写字面量，见接线门禁）。 */
export const PHONE_PREFIX = 'palette'
/**
 * 自定义主题存储电话（#85）：宿主半与浏览器半共用的电话名表（单一真源）。
 *
 * 注：票面写「在 PHONE_METHODS 中新增」，但本文件此前并无 PHONE_METHODS 表
 * （日志/更新电话名由 dsh-log / dsh-plugin-update 包函数派生，不在此定义）——
 * 自定义主题电话是本插件自己的电话，无上游包可派生，故在此新建该表，
 * 两侧（runtime/host.mjs 注册、面板客户端调用）只从这里读，不写字面量。
 */
export const PHONE_METHODS = {
  customThemesList: 'customThemesList',
  customThemesSave: 'customThemesSave',
  customThemesDelete: 'customThemesDelete',
}
/** 要检查更新的那个包（本插件自己）。 */
export const TARGET_PACKAGE_NAME = 'dsh-opencode-palette'

/** 浏览器半向宿主半回一个失败的调用结果（宿主不可用时用，形状与宿主回包一致）。 */
export const HOST_UNAVAILABLE = 'host-unavailable'
