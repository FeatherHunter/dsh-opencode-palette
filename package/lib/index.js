/**
 * runtime/host.ts — dsh-opencode-palette 宿主半（构建产物为 package/lib/index.js）
 *
 * 三件事：
 *   1. 日志落盘：dsh-log 的宿主引擎，落 <DSH_HOME>/logs/dsh-opencode-palette/YYYY-MM-DD.log；
 *   2. 更新电话：dsh-plugin-update 的 createHostUpdate（有几个注册几个：查状态 / 查新版 / 装更新 / 更新日志）；
 *   3. 面板通道：自注册精确 HTTP 路由 /api/opencode-palette，把电话分发给浏览器半。
 *
 * 通道为什么不用 harness.handle / host.call：那套是 cordis_define 动态包专属的沙箱方言，
 * 已安装插件的宿主半拿不到 harness、浏览器半拿不到 host（证据见地图 #14 的 #16 票结论）。
 * 走 DSH 公开的 /api 载体：宿主 connection.fetch.register 注册精确路由，客户端
 * connection.rpc.call('/api', 'opencode-palette', { method, payload })——与 deck、im-companion 同构。
 *
 * 更新包以**普通依赖形态**接入（`import { createHostUpdate } from 'dsh-plugin-update'`，见 package.json
 * 的 `dependencies`）。0.1.x 曾被迫把它的 dist vendor 进本包：那时它用 containingPackage(import.meta.url, …)
 * 从【自己的文件位置】往上找目标包，以依赖形态安装时永远找不到本包 → unknown-profile，且
 * sameLoadedPackage 恒假 → installation-changed → 一键升级永远不可用。
 * 0.2.0 起改为**按包名解析**（清单直解 → 入口反查 → node_modules 步行 → 自锚定兜底），依赖形态直接可用，
 * 于是 vendor 全部删除。历史决策与推翻过程见 docs/adr/0001-vendor-dsh-plugin-update.md。
 */
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, readdir, readFile, rename, stat, unlink, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHostLog, registerHostLogPhones } from 'dsh-log/host';
import { createHostUpdate } from 'dsh-plugin-update';
import { PLUGIN_ID, PHONE_PREFIX, PHONE_METHODS, ROUTE_PATH, TARGET_PACKAGE_NAME } from "./channel.js";
export const name = PLUGIN_ID;
// 通道要 connection；subprocess / desktopProfiles / desktopPnpm 由更新包自己按需取（它内部注入），
// 不写进顶层 inject：普通 DSH 没有 desktop* 服务，写进顶层会让插件在普通宿主里装配失败。
export const inject = ['connection'];
// 落点：<DSH_HOME>/logs/dsh-opencode-palette/YYYY-MM-DD.log，开关 <DSH_HOME>/logs/log-switch-dsh-opencode-palette.json
// （与同机 dsh-prompt 的既成落点同构；DSH 不提供 cache 目录 API，缓存根只有 <DSH_HOME>）
const LOG_DIR_NAME = PLUGIN_ID;
const SWITCH_FILE_NAME = 'log-switch-' + PLUGIN_ID + '.json';
const RPC_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
const ENDPOINT_PATTERN = /^[A-Za-z0-9_$.-]+$/;
/** catch 变量的消息提取（运行时只读 errno 的 message；EAGAIN 等无 message 时退回 String(e)）。 */
const errMessage = (e) => String((e && e.message) || e);
/**
 * 装配时先把日志目录建好、把开关文件用缺省值物化（2026-09-19 修，真机噪声两则）。
 *
 * 现象：两天日志里除 `log.persist.fail / readBack / read-fail` 之外什么都没有 —— 等于日志系统
 * 没真正跑起来，还会带偏排障。
 *
 * 根因（本地插桩实测，非推断）：
 *   1. `dsh-log` 的 `persistSwitch()` 只调 `writeText`，**不会建父目录**；而写日志那条路
 *      （`writeBatch`）自己会先 `mkdir`。所以"没写过日志之前" `<DSH_HOME>/logs` 并不存在。
 *   2. `loadSwitch()` 把「开关文件不存在」和「读坏了」归成同一条错误路径：`readText` 在目录
 *      不存在时抛 ENOENT → 落 catch → 记一条 `readBack / read-fail` warn。
 *   3. 于是**每次启动读开关都记一条误报**，且首次 `setSwitch()` 也会失败 —— 更糟的是
 *      `persistSwitch()` 把异常吞掉（调用方拿到"成功"，磁盘上什么都没有）。
 *
 * 修法：装配时 `mkdir` 日志目录（recursive），再让 store 用**自己的 API**把缺省开关写下去。
 * 不自己拼路径写 JSON：开关文件的落点与形状归 store 管，自己写会变成第二份真源。
 */
async function prepareLogHome(store, cacheDir) {
    if (!cacheDir)
        return;
    await mkdir(join(cacheDir), { recursive: true });
    const file = join(cacheDir, store.config.switchFileName);
    if (existsSync(file))
        return;
    const defaults = store.getSwitchState();
    // 0.3.0 起开关形状只有 { enabled }：setSwitch 单参，sampleRate 死参数已删（多传会被忽略，别传）
    await store.setSwitch(defaults.enabled);
}
const PACKAGE_DIR = dirname(dirname(fileURLToPath(import.meta.url)));
/** 本进程正在跑的版本：启动那一刻读自己的 package.json（= 加载进内存的那份代码的版本）。
 *  不能用「每次调用现读磁盘」的写法：装完新版后磁盘版本会变，进程里跑的却还是旧的，
 *  现读会让 pending-restart 永远判不出来（更新包据此决定是否提示「待重启」）。 */
export const runningVersion = readRunningVersion();
function readRunningVersion() {
    try {
        const manifest = JSON.parse(readFileSync(join(PACKAGE_DIR, 'package.json'), 'utf8'));
        return typeof manifest.version === 'string' ? manifest.version : '0.0.0';
    }
    catch {
        return '0.0.0';
    }
}
/** 事件清单：随包落 lib/event-list.json（构建从 runtime/event-list.json 复制）。读不到就用 null（日志照记，只是没有白名单元数据）。 */
export function readEventList() {
    try {
        return JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'event-list.json'), 'utf8'));
    }
    catch {
        return null;
    }
}
/** DSH 家目录：$DSH_HOME（去空白后非空）否则 ~/.dsh，与 @deepseek-ai/dsh-home-paths 同一规则
 *  （更新包的 defaultHomeDir 也是同一条；tests/update-integration.test.ts 里有两边一致的断言）。 */
export function dshHomeDir(env, osHome) {
    const raw = env && typeof env.DSH_HOME === 'string' && env.DSH_HOME.trim() ? env.DSH_HOME : join(osHome, '.dsh');
    return raw === '~' ? osHome : raw.replace(/^~[\\/]/, osHome + '/');
}
/** 自定义主题落盘 schema（磁盘文件顶层 `schema` 字段值）。 */
export const CUSTOM_THEME_SCHEMA = 'dsh-opencode-palette.custom-theme.v1';
/** 缺色回退：opencode dark 37 色（键顺序即规范槽位顺序，落盘可读性依赖它）。
 *  有意单一源：缺色永远用它补，不随主题的 basePreset/appearance 切换——宿主包内无引擎、
 *  其它预置色板不可达；basePreset 名字照常保留（供面板重编时溯源），仅回退源固定。 */
const OPENCODE_FALLBACK_COLORS = {
    background: '#0A0A0A',
    backgroundPanel: '#141414',
    backgroundElement: '#1E1E1E',
    text: '#EEEEEE',
    textMuted: '#808080',
    primary: '#FAB283',
    secondary: '#5C9CF5',
    info: '#56B6C2',
    success: '#7FD88F',
    warning: '#F5A742',
    error: '#E06C75',
    border: '#484848',
    borderActive: '#606060',
    diffAdded: '#4FD6BE',
    diffRemoved: '#C53B53',
    diffAddedBg: '#20303B',
    diffRemovedBg: '#37222C',
    diffAddedLineNumberBg: '#1B2B34',
    diffRemovedLineNumberBg: '#2D1F26',
    markdownHeading: '#9D7CD8',
    markdownLink: '#FAB283',
    markdownCode: '#7FD88F',
    markdownEmph: '#E5C07B',
    markdownStrong: '#F5A742',
    markdownBlockQuote: '#E5C07B',
    syntaxComment: '#808080',
    syntaxKeyword: '#9D7CD8',
    syntaxFunction: '#FAB283',
    syntaxType: '#E5C07B',
    syntaxNumber: '#F5A742',
    syntaxString: '#7FD88F',
    syntaxOperator: '#56B6C2',
    sidebarBg: '#0A0A0A',
    bubbleBg: '#141414',
    inputBg: '#141414',
    codeBlockBg: '#141414',
    codeHeaderBg: '#1E1E1E',
};
/** 规范 37 槽位（= 回退表键序）。 */
const CUSTOM_COLOR_SLOTS = Object.keys(OPENCODE_FALLBACK_COLORS);
/** 文件名/id 严格形：save 与 delete 只接受全匹配（点都不允许，`..` 天然不可达）。 */
const CUSTOM_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const CUSTOM_APPEARANCES = ['dark', 'light', 'system'];
const CUSTOM_NAME_MAX = 120;
/** 存储目录：<homeDir>/opencode-palette/custom-themes（resolve 转平台原生绝对路径）。 */
export function customThemesDir(homeDir) {
    return resolve(join(homeDir, 'opencode-palette', 'custom-themes'));
}
/**
 * id 消毒（读路径文件名兜底用）：含 `/` `\` 直接拒绝（null）；其余非法字符折成 `-`。
 * save/delete 不走这里——它们要求调用方 id 全匹配 CUSTOM_ID_PATTERN，否则整单拒绝。
 */
export function sanitizeCustomThemeId(raw) {
    if (typeof raw !== 'string')
        return null;
    let s = raw.trim();
    if (!s)
        return null;
    if (/[/\\]/.test(s))
        return null;
    s = s.replace(/\.json$/i, '');
    if (s === '..' || s === '.')
        return null;
    s = s.replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 64);
    if (!s || !CUSTOM_ID_PATTERN.test(s))
        return null;
    return s;
}
/**
 * 主题归一化（读/写共用）：缺 id 用 fallbackId 兜底（再消毒不出即 null → 整文件跳过），
 * 缺 name 用 id 兜底，非法 appearance 回 'dark'，非法 basePreset 回 'opencode'，
 * colors 逐槽位取非空字符串、缺失用 opencode 回退补满 37，多余键丢弃。
 */
export function normalizeCustomTheme(data, fallbackId, fallbackUpdatedAt) {
    // 类型：上面已验过是「非 null、非数组对象」，读字段前先按可读面收窄（字段仍是 unknown，逐个校验）。
    const src = data !== null && typeof data === 'object' && !Array.isArray(data) ? data : {};
    const rawId = typeof src.id === 'string' && CUSTOM_ID_PATTERN.test(src.id) ? src.id : null;
    const id = rawId || sanitizeCustomThemeId(fallbackId);
    if (!id)
        return null;
    const rawName = typeof src.name === 'string' ? src.name.trim() : '';
    const colors = {};
    const srcColors = src.colors !== null && typeof src.colors === 'object' && !Array.isArray(src.colors) ? src.colors : {};
    for (const slot of CUSTOM_COLOR_SLOTS) {
        const v = srcColors[slot];
        colors[slot] = typeof v === 'string' && v.trim() ? v.trim() : OPENCODE_FALLBACK_COLORS[slot];
    }
    return {
        schema: CUSTOM_THEME_SCHEMA,
        id: id,
        name: rawName ? rawName.slice(0, CUSTOM_NAME_MAX) : id,
        // 类型：非字符串在 indexOf 里恒为 -1（与回落 'dark' 等价），断言只为让 unknown 过 string 参数。
        appearance: CUSTOM_APPEARANCES.indexOf(src.appearance) >= 0 ? src.appearance : 'dark',
        basePreset: typeof src.basePreset === 'string' && CUSTOM_ID_PATTERN.test(src.basePreset) ? src.basePreset : 'opencode',
        updatedAt: typeof src.updatedAt === 'string' && src.updatedAt ? src.updatedAt : (fallbackUpdatedAt || new Date().toISOString()),
        colors: colors,
    };
}
/** 目录确保存在（list/save/delete 每次都先调：运行中目录被删也能自愈）。 */
async function ensureCustomThemesDir(homeDir) {
    const dir = customThemesDir(homeDir);
    await mkdir(dir, { recursive: true });
    return dir;
}
/** 扫描目录：单文件坏了只跳过该文件（catch 内静默，绝不阻断其余主题、不记新事件）。 */
async function readCustomThemes(homeDir) {
    const dirPath = await ensureCustomThemesDir(homeDir);
    let files = [];
    try {
        files = (await readdir(dirPath)).filter((n) => n.endsWith('.json')).sort();
    }
    catch (e) {
        return { dirPath: dirPath, themes: [] };
    }
    const themes = [];
    const seen = new Set();
    for (const file of files) {
        // 文件名与 save/delete 同一严格口径：非法文件名（含空格等）直接跳过——
        // 否则它会以折叠 id 列出、却永远无法被 save/delete 按名寻址（delete 会假成功而文件仍在 = 孤儿）。
        if (!CUSTOM_ID_PATTERN.test(file.slice(0, -'.json'.length)))
            continue;
        const full = join(dirPath, file);
        let text = null;
        try {
            text = await readFile(full, 'utf8');
        }
        catch (e) {
            continue;
        }
        let data = null;
        try {
            data = JSON.parse(text);
        }
        catch (e) {
            continue;
        }
        let mtime = null;
        try {
            mtime = (await stat(full)).mtime.toISOString();
        }
        catch (e) { /* 用 new 日期兜底 */ }
        const theme = normalizeCustomTheme(data, file.replace(/\.json$/, ''), mtime || new Date().toISOString());
        if (!theme || seen.has(theme.id))
            continue;
        seen.add(theme.id);
        themes.push(theme);
    }
    // 稳定排序：updatedAt 新在前，相同再按 id 排（与平台 locale 无关，处处同序）。
    themes.sort(function (a, b) {
        if (a.updatedAt !== b.updatedAt)
            return a.updatedAt < b.updatedAt ? 1 : -1;
        return a.id < b.id ? -1 : (a.id > b.id ? 1 : 0);
    });
    return { dirPath: dirPath, themes: themes };
}
/** 原子写：tmp 落盘 + rename（半成品只可能是 .tmp- 前缀，扫描器只认 .json）。 */
async function saveCustomTheme(homeDir, theme) {
    if (theme === null || typeof theme !== 'object' || Array.isArray(theme)) {
        return { ok: false, error: { code: 'invalid-argument', message: 'theme must be an object' } };
    }
    // 类型：上面已验过是非数组对象，读字段前按可读面收窄（id 仍逐个校验）。
    const src = theme;
    if (typeof src.id !== 'string' || !CUSTOM_ID_PATTERN.test(src.id)) {
        return { ok: false, error: { code: 'invalid-id', message: 'invalid theme id: ' + String(src.id).slice(0, 80) } };
    }
    const dirPath = await ensureCustomThemesDir(homeDir);
    // 类型：id 已按 CUSTOM_ID_PATTERN 全匹配验过，normalizeCustomTheme 只在 id 非法时回 null，这里不可能为 null。
    const normalized = normalizeCustomTheme(src, null, new Date().toISOString());
    normalized.updatedAt = new Date().toISOString();
    const target = join(dirPath, normalized.id + '.json');
    const tmp = join(dirPath, normalized.id + '.tmp-' + process.pid + '-' + Date.now());
    try {
        await writeFile(tmp, JSON.stringify(normalized, null, 2) + '\n', 'utf8');
        await rename(tmp, target);
    }
    catch (e) {
        try {
            await unlink(tmp);
        }
        catch (ignored) { /* 半成品尽力清 */ }
        throw e;
    }
    const listed = await readCustomThemes(homeDir);
    return { ok: true, dirPath: listed.dirPath, theme: normalized, themes: listed.themes };
}
/** 删除：不存在幂等成功；非法 id 直接拒绝（不碰磁盘）。 */
async function deleteCustomTheme(homeDir, id) {
    if (typeof id !== 'string' || !CUSTOM_ID_PATTERN.test(id)) {
        return { ok: false, error: { code: 'invalid-id', message: 'invalid theme id: ' + String(id).slice(0, 80) } };
    }
    const dirPath = await ensureCustomThemesDir(homeDir);
    try {
        await unlink(join(dirPath, id + '.json'));
    }
    catch (e) {
        // 类型：catch 变量是 unknown；运行时只读 errno 的 code 判 ENOENT（判定逻辑不变）。
        if (!e || e.code !== 'ENOENT')
            throw e;
    }
    const listed = await readCustomThemes(homeDir);
    return { ok: true, dirPath: listed.dirPath, deletedId: id, themes: listed.themes };
}
/** 给日志包的文件服务（INTEGRATION.md 步骤 2 的形状表）：六个方法全走 node:fs/promises。
 *  为什么不直接传 ctx.get('fs')：DSH 的 fs 服务没有 mkdir / unlink，且部署的是沙箱实现
 *  （workspace-write 只允许写 workspace 内），写用户家目录会被 FS_SANDBOX_DENIED 拒掉。 */
export function createLogFileService(readTextImpl, writeTextImpl, mkdirImpl, unlinkImpl, listDirImpl) {
    return {
        // 类型：dsh-log 把 resolve 声明成 Promise<unknown>，实现是同步 String()（其引擎 `await fs.resolve(...)`，
        // 0.3.4 实测同步返回可用）；改成 Promise 会变导出函数的运行时形状，故只在类型层放宽。
        resolve: (function (pathStr) { return String(pathStr); }),
        readText: function (target) { return readTextImpl(String(target), 'utf8'); },
        writeText: function (target, text) { return writeTextImpl(String(target), String(text), 'utf8'); },
        mkdir: function (dir) { return mkdirImpl(String(dir), { recursive: true }); },
        unlink: function (target) { return unlinkImpl(String(target)); },
        listDir: function (dirTarget) { return listDirImpl(String(dirTarget)); },
    };
}
/** 宿主半装配入口：建日志库 → 建更新电话 → 合成电话表 → 注册通道。
 *
 * 第二个参数只给测试用：`{ readerOverrides }` 会与默认的 `{ runningVersion }` 合并后
 * 交给更新包。生产环境永远不传（更新包按包名自动解析目标包与使用范围）；
 * 只有自动解析对不上时（开发态 checkout、hoisted、多副本）才显式给
 * `targetPackageDir`——更新包 README §6.13 的逃生口，冒烟测试用它搭假使用范围。
 * 绝不传 `environmentKind` / `profileDir` / `profileName`：那两处会挡住自动探测，
 * 传了升级就要改代码（更新包 README「升级本包」一节）。 */
export function apply(ctx, opts) {
    const extraOverrides = (opts && opts.readerOverrides && typeof opts.readerOverrides === 'object')
        ? opts.readerOverrides
        : {};
    const homeDir = dshHomeDir(process.env, homedir());
    const eventList = readEventList();
    const hostLog = createHostLog({
        fs: createLogFileService(readFile, writeFile, mkdir, unlink, readdir),
        timer: ctx.get('timer'),
        getCacheDir: function () { return join(homeDir, 'logs'); },
        // 类型：fs 运行时给 null（= 没有平台文件服务，dsh-log 引擎按 falsy 逐方法跳过），声明不接受 null，故构造处断言。
        getPlatform: function () { return { os: process.platform, path: { join: join }, fs: null }; },
        DEFAULT_CWD: process.cwd(),
    }, 
    // 类型：读不到事件清单时传 null（dsh-log 解析后的 ResolvedHostLogConfig.eventList 本就含 null），
    // 输入声明只写了可选、未含 null，故只在类型层收窄。
    { pluginId: PLUGIN_ID, prefix: PHONE_PREFIX, logDirName: LOG_DIR_NAME, switchFileName: SWITCH_FILE_NAME, eventList: eventList });
    const registry = new Map();
    // 类型：dsh-log 的 PhoneRegistry 用属性式函数类型（strictFunctionTypes 下按逆变检查），Map 的 set 是
    // 方法式（双变），参数面无法直接对齐；运行时 Map 的 has/set 完全满足该端口，故只在这一处断言。
    registerHostLogPhones(registry, hostLog);
    const logCacheDir = join(homeDir, 'logs');
    // 写开关前确保目录存在：dsh-log 的 persistSwitch 不建目录且吞错，
    // 运行时目录被删后写会静默丢（内存 true、磁盘无），重启即回关（issue 42 次要链路）。
    const logSetPhone = hostLog.phoneNames.logSetSwitch;
    const rawLogSet = registry.get(logSetPhone);
    if (typeof rawLogSet === 'function') {
        registry.set(logSetPhone, async function (args) {
            try {
                await mkdir(logCacheDir, { recursive: true });
            }
            catch (e) { /* store 自己会记 fail */ }
            return rawLogSet(args);
        });
    }
    // 日志目录 + 开关文件在装配时就备好：不做的话，首次运行读开关会记一条 readBack 误报，
    // 且首次 setSwitch 会因父目录不存在而静默失败（详见 prepareLogHome 注释）
    const logHomeReady = prepareLogHome(hostLog.store, logCacheDir);
    if (logHomeReady && typeof logHomeReady.catch === 'function') {
        logHomeReady.catch(function () { });
    }
    const update = createHostUpdate({ ctx: ctx, logCtx: { fire: function (level, event, fields) { return hostLog.store.log(level, event, fields); } }, readerOverrides: Object.assign({ runningVersion: runningVersion }, extraOverrides) }, { pluginId: PLUGIN_ID, prefix: PHONE_PREFIX, targetPackageName: TARGET_PACKAGE_NAME });
    for (const phoneName of Object.keys(update.handlers))
        registry.set(phoneName, update.handlers[phoneName]);
    // 自定义主题存储（#85）：三个电话直接进通用分发管线（dispatch 统一包 { ok, value }、
    // 处理器抛异常记既有 host.channel.fail），不新增任何日志事件（event-list 31 项锁死）。
    // 处理器自带 { ok } 内层状态：校验失败回 { ok: false, error: { code: 'invalid-*' } }，
    // 磁盘异常才抛给 dispatch（变外层 { ok: false, error: { code: 'internal' } }）。
    registry.set(PHONE_METHODS.customThemesList, async function () {
        const listed = await readCustomThemes(homeDir);
        return { ok: true, dirPath: listed.dirPath, themes: listed.themes };
    });
    registry.set(PHONE_METHODS.customThemesSave, async function (args) {
        const theme = args !== null && typeof args === 'object' ? args.theme : undefined;
        return saveCustomTheme(homeDir, theme);
    });
    registry.set(PHONE_METHODS.customThemesDelete, async function (args) {
        const id = args !== null && typeof args === 'object' ? args.id : undefined;
        return deleteCustomTheme(homeDir, id);
    });
    // 更新电话直注册，不包探针/重试（最小集成）：有几个注册几个（0.5.x 起含 updateChangelog），
    // 失败证据由包内 diag 承载；电话名从 update.phoneNames 读，不自己拼字符串。
    const fail = function (stage, reason) {
        try {
            hostLog.store.log('error', 'host.channel.fail', { stage: stage, path: ROUTE_PATH, reason: String(reason).slice(0, 120) });
        }
        catch (e) { /* 忽略 */ }
    };
    const dispatch = async function (phoneName, args) {
        const handler = registry.get(phoneName);
        if (typeof handler !== 'function') {
            // 未知电话：#89 起记一条既有 host.channel.fail（stage 'dispatch-unknown'，不新增事件）。
            // 两侧电话名对不上时曾经是「界面报保存失败、日志全绿」的静默死链，查无可查。
            fail('dispatch-unknown', 'unknown phone: ' + phoneName);
            return { ok: false, error: { code: 'internal', message: 'unknown phone: ' + phoneName, details: {} } };
        }
        try {
            return { ok: true, value: await handler(args === null || args === undefined ? {} : args) };
        }
        catch (e) {
            // 类型：catch 变量是 unknown；运行时只读 errno 的 message（判定逻辑不变）。
            fail('dispatch', errMessage(e));
            return { ok: false, error: { code: 'internal', message: errMessage(e), details: {} } };
        }
    };
    const routeFetch = async function (request) {
        if (!request || request.method !== 'POST')
            return new Response('method not allowed', { status: 405 });
        let body = null;
        try {
            body = (await request.json());
        }
        catch (e) {
            return new Response('body is not JSON', { status: 400 });
        }
        // 类型：body 已在这一句的 && 右侧窄化为非空；后两次读取在外层条件里窄不回来，故用 !（擦除后运行时不变）。
        const rpcId = typeof (body && body.rpcId) === 'string' && RPC_ID_PATTERN.test(body.rpcId) ? body.rpcId : 'invalid-request';
        const reply = function (result) { return Response.json({ type: 'server-response', rpcId: rpcId, result: result }); };
        const reject = function (why) { return reply({ ok: false, error: { code: 'gateway/bad-request', message: why, details: {} } }); };
        if (!body || body.type !== 'client-request')
            return reject('invalid client-request message');
        const call = body.payload;
        if (call === null || typeof call !== 'object')
            return reject('missing call payload');
        const phoneName = call.method;
        if (typeof phoneName !== 'string' || !ENDPOINT_PATTERN.test(phoneName))
            return reject('invalid phone name');
        const pathname = String((request.url && request.url.split('?')[0]) || '');
        if (!pathname.endsWith(ROUTE_PATH))
            return reject('request path is not on route ' + ROUTE_PATH);
        return reply(await dispatch(phoneName, call.payload));
    };
    try {
        const connection = ctx.get('connection');
        const fetchRegistry = connection === undefined || connection === null ? undefined : connection.fetch;
        if (fetchRegistry === undefined || typeof fetchRegistry.register !== 'function') {
            fail('register', 'connection.fetch.register-missing');
            return;
        }
        fetchRegistry.register({ path: ROUTE_PATH, methods: ['POST'], requestBody: 'buffered', fetch: routeFetch });
    }
    catch (e) {
        // 类型：catch 变量是 unknown；运行时只读 errno 的 message（判定逻辑不变）。
        const message = errMessage(e);
        // 重复注册（live patch reload / 回滚重放）算让位：那个实例继续服务即可，不当故障。
        if (message.indexOf('already registered') >= 0 || message.indexOf('duplicate') >= 0)
            return;
        fail('register', message);
    }
}
