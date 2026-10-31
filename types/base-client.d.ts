// types/base-client.d.ts —— dsh-featherhunter-plugin-base@0.1.1 客户端入口的类型垫片（tsconfig.json 的 paths 映射）。
// 为什么需要：上游 dist/client/index.d.ts 用无扩展名的相对导入（./types、./styles、./texts、./content），
// 在本仓 NodeNext 解析下报 TS2834；本仓刻意不开 skipLibCheck（types/dsh.d.ts 必须被检查），也不改 node_modules，
// 所以用 paths 把这个 specifier 精准指到本文件，只声明本仓用到的导出（字段语义对照上游 dist/client/types.d.ts）。
// 升级 base 版本时同步本文件：doctor 会校验内联 banner 版本号，但不会提醒类型面漂移。
export interface BaseContactRowProps {
  className?: string
  label?: string
  hint?: string
}

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

/** 三个图标动作（联系 / Star / Issue）的公共入参 */
export interface BaseActionButtonsProps {
  className?: string
  size?: BaseActionIconSize
  repoUrl?: string
  issuesUrl?: string
}

/** 页头窄胶囊：三个图标动作包成一枚 group（紧凑头行用） */
export type BaseActionGroupProps = BaseActionButtonsProps

export interface BaseUIOptions {
  lang?: 'zh' | 'en' | string
  selfId?: string
  /** 其余字段（fetchImpl / contentLoader / texts / columns / …）本仓未用，按上游契约保留开放面 */
  [key: string]: unknown
}

export interface BaseUI {
  ContactRow: (props: BaseContactRowProps) => unknown
  AuthorPlugins: (props: BaseAuthorPluginsProps) => unknown
  /** 页头三件套（联系 / Star / Issue），窄胶囊形态 */
  ActionGroup: (props: BaseActionGroupProps) => unknown
}

export declare function createBaseUI(React: unknown, options?: BaseUIOptions): BaseUI
export declare function ensureBaseStyles(doc: Document): void
export declare const BASE_CSS: string
export declare const BASE_STYLE_ID: string
