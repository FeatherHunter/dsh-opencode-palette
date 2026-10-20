// build-client.ts — 零依赖 mini-bundler：npm 包客户端入口内联 + src/engine/runtime（tsc 转译产物）→ 浏览器 bundle 与宿主半
// 产出:
//   package/lib/client.js             包版（window.__ModuleLoader__.load CJS bundle）
//   client.js                         动态版（cordis_define code.client 函数体）
//   package/lib/index.js              宿主半（runtime/host.ts 的 tsc 转译输出）
//   package/lib/event-list.json       事件清单（runtime/event-list.json 副本）
//   package/lib/channel.js            两侧共用常量（runtime/channel.ts 的 tsc 转译输出）
//   package/package.json              产物包声明（版本取自根 package.json）
//   package/README.md                 用户文档副本
//
// 输入形态（P2 决策 D1「C-lite」；P3 把 runtime 也并入）：
//   engine / runtime —— 源码是 `.ts`，本脚本消费的是 `tsc -p tsconfig.build.json` 的转译产物
//            `dist/src/engine/*.js` 与 `dist/runtime/*.js`（类型已被 tsc 剥掉，相对导入已被
//            `rewriteRelativeImportExtensions` 改写成 `.js`）；bundler 自身仍保持零依赖、逐行文本转换。
//
// 依赖形态（2026-09-30 起）：
//   dsh-plugin-update —— **运行时依赖**，随包发出、用户装包时从 npm 取（精确钉版 `0.18.37`）。
//     0.1.x 曾把它的 dist 复制进本包（vendor）来绕开自锚定缺陷；0.2.0 起改为按包名解析，不再需要。
//     只有它的**入口件闭包**仍在构建期被内联进浏览器 bundle —— 浏览器里没有 node_modules。
//     0.18.33 起上游把 src/ 拆成 core|panel|host|shared（公开面零变，运行时行为同 0.18.32），
//     dist 里的扁平路径（dist/config.js、dist/service.js、dist/panel.js …）大多搬进子目录；
//     闭包随之重推为 36 件（entry → panel/entry → panel → {shared|core|panel|log} 实现件），见下面 INLINE_PACKAGES。
//     0.18.34～0.18.37 目录布局未变，只新增 dist/shared/version.js（0.18.36 #241 占位运行版归一），闭包 36 → 37 件。
//   dsh-log —— 同为运行时依赖；客户端入口同样构建期内联。
//
// 引擎源码约束（DESIGN.md §7）：单行 import、无 default export、无 re-export、无动态导入；
// npm 包走各自的转换器（polyglot 形态：多行 import / export 列表带 as 别名）。
// 逐行源码解析在 scripts/lib/source-parser.ts（有单测；兼容现行手写风格与 tsc 默认 emit 的分号/双引号/.js）。
import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseLine } from './lib/source-parser.ts'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const DIST_ENGINE_DIR = join(ROOT, 'dist', 'src', 'engine')
const DIST_RUNTIME_DIR = join(ROOT, 'dist', 'runtime')
const THEMES_DIR = join(ROOT, 'src', 'themes')
const CUSTOM_PRESETS_DIR = join(ROOT, 'src', 'custom-presets')
const RUNTIME_DIR = join(ROOT, 'runtime')
const PKG_DIR = join(ROOT, 'package')

/** 构建期内联的 npm 包模块声明：包内文件路径 + 包内相对说明符 → 本 bundle 模块键。 */
interface InlineModuleSpec {
  key: string
  file: string
  deps: Record<string, string>
}

/** 构建期内联的 npm 包入口（浏览器没有 node_modules，客户端入口只能打进产物）。 */
interface InlinePackage {
  spec: string
  pkg: string
  key: string
  modules: InlineModuleSpec[]
}

/** 按模块键找到的内联规格。 */
interface InlineModuleRef {
  pkg: string
  spec: InlineModuleSpec
}

/** npm 包 dist 的 import/export 名字对：本地名 → 导出名（`a as b` 两侧同形）。 */
interface VendorNamePair {
  local: string
  exported: string
}

// 运行时模块（runtime/*.ts 的转译产物：面板主体 client 与两侧共用常量 channel；自研更新状态机已删）
const RUNTIME_MODULE_FILES: Record<string, string> = { client: 'client.js', channel: 'channel.js', 'custom-color': 'custom-color.js', 'custom-store': 'custom-store.js', 'custom-editor': 'custom-editor.js', 'ui-fx': 'ui-fx.js' }

// 构建期**内联**进浏览器 bundle 的 npm 包客户端入口（浏览器没有 node_modules，只能打进产物）。
// 注意这与「宿主半的依赖」是两回事：宿主半那侧是真依赖，运行时从 node_modules 解析。
// deps 是该包内部相对说明符 → 本 bundle 模块键的映射
const INLINE_PACKAGES: InlinePackage[] = [
  {
    spec: 'dsh-log/client',
    pkg: 'dsh-log',
    key: 'log-client',
    // 0.3.4 起树状 22 模块：client → config 转出树 + client/* + core/*。deps 键必须用包内 import 原字面量
    //（`'../core/ids.js'` 与 `'./core/ids.js'` 是两个键，不能归一，transformer 按原串查表）。
    modules: [
      { key: 'log-core-level', file: 'dist/core/level.js', deps: {} },
      { key: 'log-core-ids', file: 'dist/core/ids.js', deps: {} },
      { key: 'log-core-resident', file: 'dist/core/resident.js', deps: {} },
      { key: 'log-core-file-name', file: 'dist/core/file-name.js', deps: {} },
      { key: 'log-core-row', file: 'dist/core/row.js', deps: {} },
      { key: 'log-core-admission', file: 'dist/core/admission.js', deps: { './level.js': 'log-core-level' } },
      { key: 'log-core-trace', file: 'dist/core/trace.js', deps: { './ids.js': 'log-core-ids' } },
      { key: 'log-config-constants', file: 'dist/config/constants.js', deps: { '../core/level.js': 'log-core-level' } },
      { key: 'log-config-validate', file: 'dist/config/validate.js', deps: {} },
      { key: 'log-config-event-list', file: 'dist/config/event-list.js', deps: { './constants.js': 'log-config-constants', './validate.js': 'log-config-validate' } },
      { key: 'log-config-phones', file: 'dist/config/phones.js', deps: { './constants.js': 'log-config-constants', './validate.js': 'log-config-validate' } },
      { key: 'log-config-log-names', file: 'dist/config/log-names.js', deps: { './validate.js': 'log-config-validate' } },
      { key: 'log-config-resolve', file: 'dist/config/resolve.js', deps: { './constants.js': 'log-config-constants', './event-list.js': 'log-config-event-list', './validate.js': 'log-config-validate' } },
      // config.js 通篇 `export … from` 转出（无自有导出）：transformer 按转出行逐行累加进本模块导出。
      { key: 'log-config', file: 'dist/config.js', deps: { './core/file-name.js': 'log-core-file-name', './core/row.js': 'log-core-row', './config/constants.js': 'log-config-constants', './config/validate.js': 'log-config-validate', './config/resolve.js': 'log-config-resolve', './config/phones.js': 'log-config-phones', './config/log-names.js': 'log-config-log-names', './config/event-list.js': 'log-config-event-list' } },
      { key: 'log-client-switch-cache', file: 'dist/client/switch-cache.js', deps: {} },
      { key: 'log-client-transport', file: 'dist/client/transport.js', deps: { '../config.js': 'log-config' } },
      { key: 'log-client-trace', file: 'dist/client/trace.js', deps: { '../core/ids.js': 'log-core-ids', '../core/level.js': 'log-core-level' } },
      { key: 'log-client-switch-ops', file: 'dist/client/switch-ops.js', deps: { '../core/ids.js': 'log-core-ids' } },
      { key: 'log-client-forward', file: 'dist/client/forward.js', deps: { '../core/ids.js': 'log-core-ids' } },
      { key: 'log-client-send', file: 'dist/client/send.js', deps: { '../config.js': 'log-config', '../core/admission.js': 'log-core-admission', './transport.js': 'log-client-transport' } },
      { key: 'log-client-write', file: 'dist/client/write.js', deps: { '../config.js': 'log-config', '../core/admission.js': 'log-core-admission', '../core/level.js': 'log-core-level', '../core/row.js': 'log-core-row', '../core/trace.js': 'log-core-trace' } },
      { key: 'log-client', file: 'dist/client.js', deps: { './config.js': 'log-config', './core/ids.js': 'log-core-ids', './core/resident.js': 'log-core-resident', './client/switch-cache.js': 'log-client-switch-cache', './client/trace.js': 'log-client-trace', './client/transport.js': 'log-client-transport', './client/switch-ops.js': 'log-client-switch-ops', './client/forward.js': 'log-client-forward', './client/send.js': 'log-client-send', './client/write.js': 'log-client-write' } },
    ],
  },
  // 更新系统只内联入口件闭包：浏览器 bundle 只要 mountUpdateEntry 这一条调用点。
  // deps 必须与包 dist 的实际 import 逐字对应，上游再加文件时构建按“引用未声明即抛”报错，按报错补声明即可。
  // 0.18.33 起上游把 src/ 拆成 core|panel|host|shared（公开面零变，运行时行为同 0.18.32），
  // dist 里的扁平路径（dist/config.js、dist/service.js、dist/panel.js、dist/changelog.js …）大多搬进子目录：
  //   dist/config.js           → dist/shared/config.js        （电话名派生与面板轮询常量）
  //   dist/codes.js            → dist/shared/codes.js         （稳定码单源）
  //   dist/redaction.js        → dist/shared/redaction.js     （脱敏，→ hash）
  //   dist/lang.js             → dist/shared/lang.js          （语言信号）
  //   dist/commands.js         → dist/shared/commands.js      （手工命令抑制谓词，零 Node 依赖的叶子件）
  //   dist/log-events.js       → dist/shared/log-events.js    （日志事件名单源）
  //   dist/last-resort.js      → dist/shared/last-resort.js   （失败后的救援四态，→ codes）
  //   dist/manual-absent.js    → dist/shared/manual-absent.js （手工命令空态分因，→ i18n/text + commands + lang）
  //   dist/panel-copy.js       → dist/shared/copy.js          （面板文案集合，→ i18n/text + codes + cause + lang + redaction）
  //   dist/hash.js             → dist/shared/hash.js          （多模块共用）
  //   dist/version-judgment.js → dist/core/judgment.js        （版本/通道判定）
  //   dist/check-conclusion.js → dist/core/conclusion.js      （更新结论判定）
  //   dist/install-fail.js     → dist/core/failure.js         （→ codes + hash）
  //   dist/registry-fetch.js   → dist/core/fetch.js           （→ conclusion + judgment）
  //   dist/service.js          → dist/core/service.js         （→ judgment + conclusion + failure + codes + hash + fetch）
  //   dist/install-cause.js    → dist/core/cause.js           （安装失败翻译官，零 I/O 纯模块）
  //   dist/queue.js            → dist/core/queue/model.js     （队列模型）
  //   dist/changelog.js        → dist/core/changelog/parse.js + dist/core/changelog/render-model.js（前者 → service + lang）
  //   dist/bilingual.js        → dist/core/i18n/text.js + dist/core/i18n/dictionary.js + dist/core/i18n/styles.js（text → lang + dictionary）
  //   dist/log/client-queue.js → dist/log/client-queue.js     （路径不变）
  //   dist/log/panel-client.js → dist/log/panel-client.js     （路径不变，→ client-queue + hash）
  //   dist/panel.js            → dist/panel.js（现在只是再导出壳）→ dist/panel/{theme,skip-store,view-model,render,archive-theme,failure-latch,mount,client}.js
  //   dist/entry.js            → dist/entry.js（壳）→ dist/panel/entry.js
  // 0.18.34～0.18.37 目录布局未变，只新增 dist/shared/version.js（0.18.36 #241 占位运行版 0.0.0 归一，service → version），
  // 闭包 36 → 37 件，全部零 Node 依赖（无 node: 内建、无 require、无动态 import；只用到 globalThis.TextEncoder/AbortSignal/document），
  // 浏览器可跑；host 侧那棵树（dist/host/**、dist/core/{disk,executor,gate,reader,store-base,install-button}/**、dist/panel/batch/**）
  // 不在闭包内 —— 那是宿主半的真依赖（runtime/host.ts import 'dsh-plugin-update'，运行时从 node_modules 解析）。
  {
    spec: 'dsh-plugin-update/entry',
    pkg: 'dsh-plugin-update',
    key: 'upd-entry',
    modules: [
      { key: 'upd-shared-config', file: 'dist/shared/config.js', deps: {} },
      { key: 'upd-shared-codes', file: 'dist/shared/codes.js', deps: {} },
      { key: 'upd-shared-lang', file: 'dist/shared/lang.js', deps: {} },
      { key: 'upd-core-i18n-dictionary', file: 'dist/core/i18n/dictionary.js', deps: {} },
      { key: 'upd-core-i18n-text', file: 'dist/core/i18n/text.js', deps: { '../../shared/lang.js': 'upd-shared-lang', './dictionary.js': 'upd-core-i18n-dictionary' } },
      { key: 'upd-core-cause', file: 'dist/core/cause.js', deps: {} },
      { key: 'upd-shared-redaction', file: 'dist/shared/redaction.js', deps: {} },
      { key: 'upd-shared-copy', file: 'dist/shared/copy.js', deps: { '../core/cause.js': 'upd-core-cause', '../core/i18n/text.js': 'upd-core-i18n-text', './codes.js': 'upd-shared-codes', './lang.js': 'upd-shared-lang', './redaction.js': 'upd-shared-redaction' } },
      { key: 'upd-panel-theme', file: 'dist/panel/theme.js', deps: {} },
      { key: 'upd-core-judgment', file: 'dist/core/judgment.js', deps: {} },
      { key: 'upd-core-conclusion', file: 'dist/core/conclusion.js', deps: {} },
      { key: 'upd-shared-hash', file: 'dist/shared/hash.js', deps: {} },
      // 0.18.36 #241：占位运行版 0.0.0 归一为「未知」的共享叶子件（service 用它去掉恢复死锁）。
      { key: 'upd-shared-version', file: 'dist/shared/version.js', deps: {} },
      { key: 'upd-core-failure', file: 'dist/core/failure.js', deps: { '../shared/codes.js': 'upd-shared-codes', '../shared/hash.js': 'upd-shared-hash' } },
      { key: 'upd-core-fetch', file: 'dist/core/fetch.js', deps: { './conclusion.js': 'upd-core-conclusion', './judgment.js': 'upd-core-judgment' } },
      { key: 'upd-core-service', file: 'dist/core/service.js', deps: { './conclusion.js': 'upd-core-conclusion', './failure.js': 'upd-core-failure', './fetch.js': 'upd-core-fetch', './judgment.js': 'upd-core-judgment', '../shared/codes.js': 'upd-shared-codes', '../shared/hash.js': 'upd-shared-hash', '../shared/version.js': 'upd-shared-version' } },
      { key: 'upd-panel-skip-store', file: 'dist/panel/skip-store.js', deps: { '../core/service.js': 'upd-core-service' } },
      { key: 'upd-panel-view-model', file: 'dist/panel/view-model.js', deps: { '../core/cause.js': 'upd-core-cause', '../core/i18n/text.js': 'upd-core-i18n-text', '../core/service.js': 'upd-core-service', '../shared/copy.js': 'upd-shared-copy', '../shared/codes.js': 'upd-shared-codes', '../shared/lang.js': 'upd-shared-lang' } },
      { key: 'upd-core-changelog-parse', file: 'dist/core/changelog/parse.js', deps: { '../service.js': 'upd-core-service', '../../shared/lang.js': 'upd-shared-lang' } },
      { key: 'upd-core-changelog-render-model', file: 'dist/core/changelog/render-model.js', deps: { '../i18n/text.js': 'upd-core-i18n-text', '../../shared/lang.js': 'upd-shared-lang', './parse.js': 'upd-core-changelog-parse' } },
      { key: 'upd-shared-last-resort', file: 'dist/shared/last-resort.js', deps: { './codes.js': 'upd-shared-codes' } },
      { key: 'upd-shared-log-events', file: 'dist/shared/log-events.js', deps: {} },
      { key: 'upd-shared-commands', file: 'dist/shared/commands.js', deps: {} },
      { key: 'upd-shared-manual-absent', file: 'dist/shared/manual-absent.js', deps: { '../core/i18n/text.js': 'upd-core-i18n-text', './commands.js': 'upd-shared-commands', './lang.js': 'upd-shared-lang' } },
      { key: 'upd-panel-archive-theme', file: 'dist/panel/archive-theme.js', deps: {} },
      { key: 'upd-panel-failure-latch', file: 'dist/panel/failure-latch.js', deps: { '../shared/lang.js': 'upd-shared-lang' } },
      { key: 'upd-panel-render', file: 'dist/panel/render.js', deps: { '../core/cause.js': 'upd-core-cause', '../core/changelog/parse.js': 'upd-core-changelog-parse', '../core/changelog/render-model.js': 'upd-core-changelog-render-model', '../core/i18n/text.js': 'upd-core-i18n-text', '../shared/copy.js': 'upd-shared-copy', '../shared/lang.js': 'upd-shared-lang', '../shared/last-resort.js': 'upd-shared-last-resort', '../shared/log-events.js': 'upd-shared-log-events', '../shared/manual-absent.js': 'upd-shared-manual-absent', './archive-theme.js': 'upd-panel-archive-theme', './failure-latch.js': 'upd-panel-failure-latch', './theme.js': 'upd-panel-theme', './view-model.js': 'upd-panel-view-model' } },
      { key: 'upd-log-client-queue', file: 'dist/log/client-queue.js', deps: {} },
      { key: 'upd-log-panel-client', file: 'dist/log/panel-client.js', deps: { './client-queue.js': 'upd-log-client-queue', '../shared/hash.js': 'upd-shared-hash' } },
      { key: 'upd-panel-mount', file: 'dist/panel/mount.js', deps: { '../core/cause.js': 'upd-core-cause', '../core/changelog/parse.js': 'upd-core-changelog-parse', '../core/i18n/text.js': 'upd-core-i18n-text', '../core/service.js': 'upd-core-service', '../log/panel-client.js': 'upd-log-panel-client', '../shared/copy.js': 'upd-shared-copy', '../shared/config.js': 'upd-shared-config', '../shared/hash.js': 'upd-shared-hash', '../shared/lang.js': 'upd-shared-lang', './failure-latch.js': 'upd-panel-failure-latch', './render.js': 'upd-panel-render', './skip-store.js': 'upd-panel-skip-store', './theme.js': 'upd-panel-theme', './view-model.js': 'upd-panel-view-model' } },
      { key: 'upd-core-queue-model', file: 'dist/core/queue/model.js', deps: {} },
      { key: 'upd-core-batch-model', file: 'dist/core/batch/model.js', deps: {} },
      { key: 'upd-panel-client', file: 'dist/panel/client.js', deps: { '../core/batch/model.js': 'upd-core-batch-model', '../core/changelog/parse.js': 'upd-core-changelog-parse', '../core/changelog/render-model.js': 'upd-core-changelog-render-model', '../core/queue/model.js': 'upd-core-queue-model', '../shared/commands.js': 'upd-shared-commands', '../shared/config.js': 'upd-shared-config' } },
      { key: 'upd-panel', file: 'dist/panel.js', deps: { './core/changelog/parse.js': 'upd-core-changelog-parse', './core/changelog/render-model.js': 'upd-core-changelog-render-model', './core/queue/model.js': 'upd-core-queue-model', './panel/archive-theme.js': 'upd-panel-archive-theme', './panel/client.js': 'upd-panel-client', './panel/failure-latch.js': 'upd-panel-failure-latch', './panel/mount.js': 'upd-panel-mount', './panel/render.js': 'upd-panel-render', './panel/skip-store.js': 'upd-panel-skip-store', './panel/theme.js': 'upd-panel-theme', './panel/view-model.js': 'upd-panel-view-model', './shared/codes.js': 'upd-shared-codes', './shared/copy.js': 'upd-shared-copy' } },
      { key: 'upd-core-i18n-styles', file: 'dist/core/i18n/styles.js', deps: {} },
      { key: 'upd-panel-entry', file: 'dist/panel/entry.js', deps: { '../core/i18n/styles.js': 'upd-core-i18n-styles', '../core/i18n/text.js': 'upd-core-i18n-text', '../panel.js': 'upd-panel', '../shared/config.js': 'upd-shared-config', '../shared/lang.js': 'upd-shared-lang' } },
      { key: 'upd-entry', file: 'dist/entry.js', deps: { './panel/entry.js': 'upd-panel-entry' } },
    ],
  },
]

/** 按模块键找内联规格（键 → { pkg, 模块声明 }）。 */
function inlineModuleFor(key: string): InlineModuleRef | null {
  for (const vendor of INLINE_PACKAGES) {
    for (const spec of vendor.modules) {
      if (spec.key === key) return { pkg: vendor.pkg, spec: spec }
    }
  }
  return null
}

// 模块执行顺序 = 依赖顺序（模块顶层不得调用其他模块导出，见 DESIGN.md）
const MODULE_ORDER: string[] = [
  'upd-shared-config', 'upd-shared-codes', 'upd-shared-lang', 'upd-core-i18n-dictionary', 'upd-core-i18n-text',
  'upd-core-cause', 'upd-shared-redaction', 'upd-shared-copy', 'upd-panel-theme', 'upd-core-judgment',
  'upd-core-conclusion', 'upd-shared-hash', 'upd-shared-version', 'upd-core-failure', 'upd-core-fetch', 'upd-core-service',
  'upd-panel-skip-store', 'upd-panel-view-model', 'upd-core-changelog-parse', 'upd-core-changelog-render-model',
  'upd-shared-last-resort', 'upd-shared-log-events', 'upd-shared-commands', 'upd-shared-manual-absent',
  'upd-panel-archive-theme', 'upd-panel-failure-latch', 'upd-panel-render', 'upd-log-client-queue',
  'upd-log-panel-client', 'upd-panel-mount', 'upd-core-queue-model', 'upd-core-batch-model', 'upd-panel-client',
  'upd-panel', 'upd-core-i18n-styles', 'upd-panel-entry', 'upd-entry',
  'log-core-level', 'log-core-ids', 'log-core-resident', 'log-core-file-name', 'log-core-row',
  'log-core-admission', 'log-core-trace', 'log-config-constants', 'log-config-validate',
  'log-config-event-list', 'log-config-phones', 'log-config-log-names', 'log-config-resolve', 'log-config',
  'log-client-switch-cache', 'log-client-transport', 'log-client-trace', 'log-client-switch-ops',
  'log-client-forward', 'log-client-send', 'log-client-write', 'log-client',
  'resolve', 'map-dsh', 'font-face', 'font-avail', 'font-names', 'local-fonts', 'generate', 'zh-names', 'registry', 'ip-presets', 'grouping', 'index', 'update-tokens', 'float-geometry',
  'channel', 'custom-color', 'custom-store', 'ui-fx', 'custom-editor', 'client',
]

// 引擎/运行时源码的 import/export 解析：见 scripts/lib/source-parser.ts（本文件只消费 parseLine）。
// npm 包 dist 的 ESM 形态：多行 import/export 列表，且带 as 别名
const PKG_ESM_IMPORT_RE = /^[ \t]*import\s*\{([\s\S]*?)\}\s*from\s*["']([^"']+)["'];?/gm
const PKG_ESM_EXPORT_RE = /^[ \t]*export\s*\{([\s\S]*?)\};?/gm
// 转出形态：`export { A, B as C } from './x.js'`（dsh-log 0.3.x config.js 通篇此形态）——必须先于 PKG_ESM_EXPORT_RE 处理
const PKG_ESM_EXPORT_FROM_RE = /^[ \t]*export\s*\{([\s\S]*?)\}\s*from\s*["']([^"']+)["'];?/gm

/** JSON.stringify 的窄化封装：入参都可序列化，结果一定不是 undefined（用于生成双引号字面量/数组）。 */
const q = (s: unknown): string => JSON.stringify(s) as string

/** 解析 vendor 的名字表（支持 `a as b`）。统一成 { local, exported }：
 *  import 侧 `源名 as 绑定名`、export 侧 `本地名 as 导出名` 的写法同形。 */
function vendorNamePairs(body: string): VendorNamePair[] {
  return body
    .split(',')
    .map((part) => part.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .map((part) => {
      const hit = part.match(/^([A-Za-z0-9_$]+) as ([A-Za-z0-9_$]+)$/)
      return hit ? { local: hit[1], exported: hit[2] } : { local: part, exported: part }
    })
}

/** npm 包 vendor 模块 → 本 bundle 的 __mods 形态。 */
function transformPackageModule(text: string, spec: InlineModuleSpec): string {
  let out = text
  // 本模块已绑定的顶层名（import 解构而来）：转出行若重复解构同名会 SyntaxError，只补新增的。
  const bound = new Set<string>()
  out = out.replace(PKG_ESM_IMPORT_RE, function (all: string, names: string, from: string) {
    const depKey = spec.deps[from]
    if (!depKey) throw new Error('[build] vendor 模块引用了未声明的依赖：' + spec.file + ' -> ' + from)
    // 解构：源名作键、绑定名作值（`{ a: b }`）
    const pairs = vendorNamePairs(names)
    const binding = pairs.map((p) => (p.local === p.exported ? p.local : p.local + ': ' + p.exported)).join(', ')
    for (const p of pairs) bound.add(p.exported)
    return 'const { ' + binding + ' } = __mods[' + q(depKey) + '];'
  })
  // `export { A, B as C } from 'spec'` 转出（dsh-log 0.3.x 的 config.js 通篇此形态）：
  // 从依赖模块解构，累加进本模块导出（不用覆盖写，同一文件可有多行转出再加自有导出）。
  out = out.replace(PKG_ESM_EXPORT_FROM_RE, function (all: string, names: string, from: string) {
    const depKey = spec.deps[from]
    if (!depKey) throw new Error('[build] vendor 模块引用了未声明的依赖：' + spec.file + ' -> ' + from)
    const pairs = vendorNamePairs(names)
    const fresh = pairs.filter((p) => !bound.has(p.exported))
    for (const p of fresh) bound.add(p.exported)
    const binding = fresh.map((p) => (p.local === p.exported ? p.local : p.local + ': ' + p.exported)).join(', ')
    const exposed = pairs.map((p) => p.exported).join(', ')
    const decl = fresh.length > 0 ? 'const { ' + binding + ' } = __mods[' + q(depKey) + '];\n' : ''
    return decl + '__mods[' + q(spec.key) + '] = Object.assign(__mods[' + q(spec.key) + '] || {}, { ' + exposed + ' });'
  })
  // 行内导出（dsh-log 0.3.x 树状模块的主形态）：去 `export ` 前缀，名字记下来，末尾统一累加进本模块导出。
  const inlineExported: string[] = []
  out = out.replace(/^export\s+(?:async\s+)?(?:function|const|class|let|var)\s+([A-Za-z0-9_$]+)/gm, function (all: string, name: string) {
    inlineExported.push(name)
    return all.replace(/^export\s+/, '')
  })
  out = out.replace(PKG_ESM_EXPORT_RE, function (all: string, names: string) {
    // 对象字面量：导出名作键、本地名作值（`{ 导出名: 本地名 }`）
    const binding = vendorNamePairs(names).map((p) => (p.local === p.exported ? p.local : p.exported + ': ' + p.local)).join(', ')
    return '__mods[' + q(spec.key) + '] = { ' + binding + ' };'
  })
  if (inlineExported.length > 0) {
    out += '\n__mods[' + q(spec.key) + '] = Object.assign(__mods[' + q(spec.key) + '] || {}, { ' + inlineExported.join(', ') + ' });'
  }
  // 兜底：还有以 export 开头的行说明来了新形态（export default / export * 等），大声报错而不是静默丢符号。
  if (/^[ \t]*export[\s{]/m.test(out)) throw new Error('[build] vendor 模块有未处理的 export 形态：' + spec.file)
  return '(function () {\n' + out + '\n})();'
}

/** 定位已安装的 npm 包目录。故意不走 require.resolve：dsh-log 的 exports 没有 "." 入口、
 *  dsh-plugin-update 没暴露 "./dist/*"，走 exports 解析到不了要的 dist 文件；构建期只要目录。 */
function installedPackageDir(name: string): string {
  const dir = join(ROOT, 'node_modules', name)
  const manifestPath = join(dir, 'package.json')
  if (!existsSync(manifestPath)) throw new Error('[build] 未安装依赖：' + name + '（先在仓库根 npm install）')
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as { name?: string }
  if (manifest.name !== name) throw new Error('[build] node_modules 下的包名对不上：' + dir)
  return dir
}

async function bundleModules(): Promise<string> {
  const parts: string[] = []
  for (const key of MODULE_ORDER) {
    parts.push(await loadModule(key))
  }
  return parts.join('\n')
}

/** 读源码并统一换行：仓库 .gitattributes 是 `* text=auto`，Windows 上的新克隆检出为 CRLF，
 *  而下面的单行正则按 LF 写死（`$` 匹配不到行尾的 \r）。统一在读取处归一，产物与平台无关。 */
async function readSource(file: string): Promise<string> {
  return (await readFile(file, 'utf8')).replace(/\r\n/g, '\n')
}

async function loadModule(key: string): Promise<string> {
  const inline = inlineModuleFor(key)
  if (inline) {
    const text = await readSource(join(installedPackageDir(inline.pkg), inline.spec.file))
    return transformPackageModule(text, inline.spec)
  }
  const runtimeFile = RUNTIME_MODULE_FILES[key]
  // engine / runtime 都读 tsc 转译产物：dist/src/engine/*.js 与 dist/runtime/*.js
  const file = runtimeFile ? join(DIST_RUNTIME_DIR, runtimeFile) : join(DIST_ENGINE_DIR, key + '.js')
  const text = await readSource(file)
  const lines = text.split('\n')
  const body: string[] = []
  const exported: string[] = []
  for (const line of lines) {
    const parsed = parseLine(line)
    if (parsed === null) {
      body.push(line)
      continue
    }
    if (parsed.type === 'json-import') {
      // JSON 数据内联（主题数据进 bundle，不落额外文件）：
      // 先 src/themes（TUI vendored），再 src/custom-presets（IP 预置第二来源）。
      const base = parsed.specifier.split('/').pop() as string
      let jsonText: string
      try {
        jsonText = await readFile(join(THEMES_DIR, base), 'utf8')
      } catch (e) {
        // 只有「文件不存在」才落到第二来源；权限等其他错误直接抛（否则报错指向错的目录）。
        const code = (e as NodeJS.ErrnoException).code
        if (code !== 'ENOENT') throw e
        jsonText = await readFile(join(CUSTOM_PRESETS_DIR, base), 'utf8')
      }
      body.push('const ' + parsed.localName + ' = ' + jsonText.trim())
      continue
    }
    if (parsed.type === 'js-import') {
      body.push('const { ' + parsed.names.replace(/\s+/g, ' ') + ' } = __mods[' + q(parsed.specifier.split('/').pop() as string) + ']')
      continue
    }
    if (parsed.type === 'pkg-import') {
      const inline = INLINE_PACKAGES.filter((v) => v.spec === parsed.specifier)[0]
      if (!inline) throw new Error('[build] 未登记的包引用：' + parsed.specifier + '（模块 ' + key + '）')
      body.push('const { ' + parsed.names.replace(/\s+/g, ' ') + ' } = __mods[' + q(inline.key) + ']')
      continue
    }
    if (parsed.type === 'export') {
      exported.push(parsed.name)
      body.push(parsed.strippedLine)
      continue
    }
    if (parsed.type === 're-export') {
      // export { a, b } 重导出：名称并入本模块导出，行本身不输出
      for (const nm of parsed.names) exported.push(nm)
      continue
    }
    // type-import：纯类型语句没有运行时语义，进 bundle 会语法错误，直接丢弃。
    // （tsc 默认 emit 会删掉类型导入，这里兜住 verbatimModuleSyntax 等保留 import type 的配置。）
  }
  if (exported.length > 0) {
    body.push('__mods[' + q(key) + '] = { ' + exported.join(', ') + ' }')
  }
  return '(function () {\n' + body.join('\n') + '\n})();'
}

async function packageVersion(): Promise<string> {
  const pkg = JSON.parse(await readFile(join(ROOT, 'package.json'), 'utf8')) as { version: string }
  return pkg.version
}

async function main(): Promise<void> {
  const version = await packageVersion()
  if (!existsSync(join(DIST_ENGINE_DIR, 'index.js')) || !existsSync(join(DIST_RUNTIME_DIR, 'client.js'))) {
    throw new Error('[build] dist 未生成：先跑 `npx tsc -p tsconfig.build.json`（npm run build 已包含这一步）')
  }
  // 面板版本号：源码占位统一替换为当前版本（包版/动态版一致）
  const modules = (await bundleModules()).split('__PALETTE_VERSION__').join(version)
  const ID = 'dsh-opencode-palette'
  const qClient = q('client')
  const qSettings = q('settings.plugins.tab')
  const qTool = q('tool.view.cordis')
  // inject 增 connection：宿主半的电话要从浏览器半经 connection.rpc 调过去
  const clientInject = ['theme', 'slots', 'locale', 'connection']

  // ── 1) 包版 bundle ──
  const pkgBundle = [
    '/**',
    ' * dsh-opencode-palette v' + version + ' — 浏览器半（构建产物，勿手改）',
    ' * 数据驱动管线：opencode v1.18.12 官方主题 JSON → 颜色解析 → DSH 适配注入',
    ' * 面板「检查更新」：dsh-plugin-update 客户端入口经构建期内联（宿主半走真依赖）',
    ' * 源：src/engine/*.ts + runtime/*.ts（均为 tsc 转译产物）+ npm 包 dsh-log / dsh-plugin-update 的客户端入口',
    ' */',
    'window.__ModuleLoader__.load({',
    '  id: ' + q(ID) + ',',
    '  factory: function (require) {',
    '    var module = { exports: {} }',
    '    var exports = module.exports',
    '    Object.defineProperty(exports, Symbol.toStringTag, { value: ' + q('Module') + ' })',
    // ASI 陷阱修复（2026-08-15）：var __mods = {} 必须带分号，
    // 否则下一行模块 IIFE "(function () {" 会被解析成对 {} 的函数调用 →
    // TypeError: {} is not a function（dsh-opencode-palette v1.2.0 加载失败的根因）
    '    var __mods = {};',
    modules,
    '    exports.inject = ' + q(clientInject),
    '    exports.apply = __mods[' + qClient + '].createClient(' + qSettings + ')',
    '    return module.exports',
    '  },',
    '})',
  ].join('\n') + '\n'

  // ── 2) 动态版（cordis_define code.client 函数体）──
  const dynBundle = [
    '// dsh-opencode-palette v' + version + ' — 动态版（构建产物，勿手改）',
    '// 用法：cordis_define(code.client = 本文件内容) → cordis_run',
    // ASI 陷阱修复（2026-08-15）：var __mods = {} 必须带分号（同包版）
    'var __mods = {};',
    modules,
    'return { apply: __mods[' + qClient + '].createClient(' + qTool + ') }',
  ].join('\n') + '\n'

  // ── 3) 宿主半（runtime/host.ts 的 tsc 转译输出；版本已在源码里读自己的 package.json，无需注入）──
  // 换行同样归一：产物字节与平台无关
  const host = (await readFile(join(DIST_RUNTIME_DIR, 'host.js'), 'utf8')).replace(/\r\n/g, '\n')

  // ── 4) 产物包元数据 ──
  const pkgJson = {
    name: ID,
    version: version,
    description: '让 DeepSeek Harness 穿上 38 款经典皮肤——东京的霓虹夜色、德古拉的暗红月光、复古工坊的暖黄灯火、黑客帝国的数字雨、玫瑰松林间的风……一键换肤，即点即换，重启不丢。38 legendary skins for DeepSeek Harness — tokyonight\'s neon dusk, dracula\'s crimson moon, gruvbox\'s retro glow, the matrix\'s digital rain, rose-pine\'s rosewood calm… one click, instant, persisted.',
    type: 'module',
    main: 'lib/index.js',
    exports: {
      '.': './lib/index.js',
      './client': './lib/client.js',
      './cordis.patch.yml': './cordis.patch.yml',
      './package.json': './package.json',
    },
    files: ['lib', 'cordis.patch.yml'],
    keywords: ['dsh', 'deepseek-harness', 'plugin', 'theme', 'opencode', 'tui', 'dark', 'multi-theme'],
    // 站端 npm 自动关联要求：repository 指回 GitHub 仓库（缺了市场就认不出这是 npm 包）
    repository: { type: 'git', url: 'git+https://github.com/FeatherHunter/dsh-opencode-palette.git' },
    homepage: 'https://github.com/FeatherHunter/dsh-opencode-palette',
    bugs: { url: 'https://github.com/FeatherHunter/dsh-opencode-palette/issues' },
    // 宿主半运行时依赖：日志（dsh-log）与更新系统（dsh-plugin-update），用户装本插件时由 npm 按声明取。
    // 两处都用精确钉版（0.3.4 / 0.18.37）：上游再发新版必须我们改声明重发（check-deps 负责提醒）。
    // 0.6.0 breaking：--dsh-upd-* 更名为 --dsh-update-*，d5-paper 主题删除；0.7.0 新增 themeTokens（弹窗换肤一等口径）。
    // 只有浏览器 bundle 的客户端入口是构建期从 node_modules 内联的（浏览器没有 node_modules）——
    // 新鲜度由构建前的 `node scripts/check-deps.ts` 硬门禁保证（本机落后就拦，离线则放行）。
    dependencies: { 'dsh-log': '0.3.4', 'dsh-plugin-update': '0.18.37' },
    // 宿主要求：市场的兼容徽章读 manifest 的 engines.dsh（缺了就显示「未声明宿主要求」）。
    // 下界 = DSH 0.2.0-rc.1（0.2 线现行版）；npm 不解析 engines.dsh，所以没有 peerDependencies 那类 ERESOLVE 风险；
    // 市场侧用 includePrerelease 判定，故 0.2.x 的预发布版（含 0.2.0-rc.1）都在范围内。
    // node >=22.18.0：本包 .ts 脚本与测试由 Node 原生类型剥离直接运行（#106 §5.3）；
    // 同时满足更新包 0.7.x 的 engines 要求（它按包名解析目标包，用到较新的 node:module 行为）
    engines: { node: '>=22.18.0', dsh: '>=0.2.0-rc.1' },
    dsh: {
      bundle: { patch: './cordis.patch.yml' },
      client: {
        platform: 'web',
        immediately: true,
        inject: ['@deepseek-ai/dsh-client-ui-theme'],
      },
    },
    license: 'MIT',
  }

  // ── 写产物（先清理旧残留）──
  await rm(join(PKG_DIR, 'node_modules'), { recursive: true, force: true })
  await rm(join(PKG_DIR, 'package-lock.json'), { force: true })
  await mkdir(join(PKG_DIR, 'lib'), { recursive: true })
  // 文本源 → 载荷：读入后统一成 LF 再写（同 README 处注释），否则载荷随检出 EOL 变
  await writeFile(
    join(PKG_DIR, 'cordis.patch.yml'),
    (await readFile(join(ROOT, 'cordis.patch.yml'), 'utf8')).replace(/\r\n/g, '\n'),
  )
  await writeFile(join(PKG_DIR, 'lib', 'client.js'), pkgBundle)
  await writeFile(join(PKG_DIR, 'lib', 'index.js'), host)
  await writeFile(
    join(PKG_DIR, 'lib', 'event-list.json'),
    (await readFile(join(RUNTIME_DIR, 'event-list.json'), 'utf8')).replace(/\r\n/g, '\n'),
  )
  // 宿主半与浏览器半共用的接线常量：宿主半按相对路径 import 它，随包一起发（转译输出，扩展名 .js）
  await copyFile(join(DIST_RUNTIME_DIR, 'channel.js'), join(PKG_DIR, 'lib', 'channel.js'))
  // channel 自 P3 起为 tsc 转译输出的 .js（源 runtime/channel.ts）；清理历史工作树里的旧扩展名，
  // 避免已废弃的 lib/channel.mjs 被 files 白名单一起 pack 出去。
  await rm(join(PKG_DIR, 'lib', 'channel.mjs'), { force: true })
  await writeFile(join(PKG_DIR, 'package.json'), JSON.stringify(pkgJson, null, 2) + '\n')
  // npm 包 README 用英文版（GitHub 首页 README.md 为中文版）；showcase 真实截图块不进包
  //（npm 保持 SVG 轻量，且 showcase 不在 package.json files 白名单，带图会渲染破裂）
  const readmeFull = await readFile(join(ROOT, 'docs', 'README.en.md'), 'utf8').catch(() => '(README 缺失)')
  // 行尾归一：载荷必须与「检出的 EOL」解耦 —— .gitattributes 的 eol=lf 只管新克隆，本机工作区仍可能
  // 是历史 CRLF 检出；不归一的话同一 commit 在不同机器上 pack 出的 tgz 字节不同
  //（实测 README.md 5315 B/CRLF vs 5207 B/LF，tgz 615846 vs 615833）。
  const readme = readmeFull
    .replace(/<!-- showcase:start -->[\s\S]*?<!-- showcase:end -->\r?\n?/, '')
    .replace(/\r\n/g, '\n')
  await writeFile(join(PKG_DIR, 'README.md'), readme)
  await writeFile(join(ROOT, 'client.js'), dynBundle)

  console.log('[build] 完成 v' + version + ':')
  console.log('  package/lib/client.js ' + Buffer.byteLength(pkgBundle) + ' B')
  console.log('  client.js (动态版)     ' + Buffer.byteLength(dynBundle) + ' B')
  console.log('  package/lib/index.js   ' + Buffer.byteLength(host) + ' B')
}

main().catch(function (e: unknown) { console.error(e); process.exit(1) })
