// types/base-client.d.ts —— dsh-featherhunter-plugin-base@0.1.4 客户端入口的类型垫片（tsconfig.json 的 paths 映射）。
// 为什么需要：上游 dist/client/index.d.ts 用无扩展名的相对导入（./types、./styles、./texts、./content），
// 在本仓 NodeNext 解析下报 TS2834；本仓刻意不开 skipLibCheck（types/dsh.d.ts 必须被检查），也不改 node_modules，
// 所以用 paths 把这个 specifier 精准指到本文件，只声明本仓用到的导出（字段语义对照上游 dist/client/types.d.ts）。
// 升级 base 版本时同步本文件：doctor 会校验内联 banner 版本号，但不会提醒类型面漂移。
export interface BaseAuthorPluginsProps {
  className?: string
  title?: string
  lang?: 'zh' | 'en'
  selfId?: string
  showSelf?: boolean
  maxRows?: number
}

/** 图标尺寸：14 紧凑 / 16 页头默认 / 18 宽松 */
export type BaseActionIconSize = 14 | 16 | 18

/** 页头三件套（联系 / Star / Issue）的公共入参；不传 items 时用内置三项 */
export interface BaseActionClusterProps {
  /** 自定义动作列表（本仓用内置默认三项，字段按上游契约保留开放面） */
  items?: unknown[]
  className?: string
  size?: BaseActionIconSize
  gap?: number
  /** quiet（默认，无外框）/ tray（托盘底） */
  variant?: 'quiet' | 'tray'
  maxVisible?: number
  overflowLabel?: string
  ariaLabel?: string
}

export interface BaseUIOptions {
  lang?: 'zh' | 'en' | string
  selfId?: string
  /** 其余字段（fetchImpl / contentLoader / texts / columns / …）本仓未用，按上游契约保留开放面 */
  [key: string]: unknown
}

export interface BaseUI {
  AuthorPlugins: (props: BaseAuthorPluginsProps) => unknown
  /** 页头三件套（联系 / Star / Issue）；base 0.1.4 起是三枚彩色 16px 静默图标（无外框；组件面不变） */
  ActionCluster: (props: BaseActionClusterProps) => unknown
}

export declare function createBaseUI(React: unknown, options?: BaseUIOptions): BaseUI
export declare function ensureBaseStyles(doc: Document): void
