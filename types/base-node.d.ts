// types/base-node.d.ts —— base 包 node 入口的类型垫片（只覆盖本仓门禁用到的那一角）。
// 上游 dist/node/index.d.ts 用无扩展名相对导入（./readme-sync、./renderers 等），
// tsc 在 NodeNext 下对 node_modules 里的声明文件报 TS2834；本仓不开 skipLibCheck，
// 又只用到 renderThanksBlock 一个渲染函数，故用 tsconfig paths 把这个 specifier
// 接到本垫片。运行时仍解析真实包（package.json exports "./node"），这里只镜像类型。
//
// 与真实 d.ts 的差异只在收窄：BlockRenderOptions 只列本仓传的 thanks / lang，
// 其余字段用索引签名兜底；ThanksEntry / ThanksAuthor / ThanksData 与上游同构。
export interface ThanksEntry {
  /** Issue / pull / discussion / comment number. */
  n: number;
  /** ISO timestamp of the contribution. */
  at?: string;
  /** For comments: the thread the comment belongs to. */
  thread?: 'issue' | 'pr';
}
export interface ThanksAuthor {
  issues?: ThanksEntry[];
  prs?: ThanksEntry[];
  discussions?: ThanksEntry[];
  comments?: ThanksEntry[];
  /** ISO timestamp of the last activity, used as the ranking tie-breaker. */
  lastActive?: string;
}
/** Data needed to render the thanks table (docs/thanks-data.json + repo). */
export interface ThanksData {
  repo: string;
  authors: Record<string, ThanksAuthor>;
}
/** Shared options for the block renderers (subset used by this repository). */
export interface BlockRenderOptions {
  lang?: 'zh' | 'en';
  thanks?: ThanksData;
  [key: string]: unknown;
}
/** Render the thanks block content (no markers, no heading / prose). */
export declare function renderThanksBlock(options?: BlockRenderOptions): string;
