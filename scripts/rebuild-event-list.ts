// rebuild-event-list.ts — runtime/event-list.json 的重建器（dsh-log 0.3.x 口径）
//
// 为什么需要它：0.3.0 起清单不再自报 counts（自算为准），且更新包 0.16.0 起随包发
// event-list.update.json（29 事件，update.* 的权威源）。本仓清单 = 上游 29 全收
// + 本仓独有 5 事件（上游没有、repo 自身发射）；另有 3 个两边同名的共享事件
// （host.call、host.call.fail、update.install.exec，取哪边都一样，以上游为准）。
// 上游再发新版（新事件/删事件/改字段）时重跑本脚本 + 按输出核对测试里的 emitted 子集。
//
// 用法：node scripts/rebuild-event-list.ts   （写 runtime/event-list.json，stdout 报清点与冲突）
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const PLUGIN_ID = 'dsh-opencode-palette'
// 本仓独有、且上游 0.18 清单里没有的事件：原样保留（repo 自身发射，删了读侧不可查）。
const OWN_ONLY_EVENTS = ['log.switch.set', 'log.forward.summary', 'log.switch.watchdog', 'log.export.fail', 'host.channel.fail']
// 两边同名、以上游定义为准的共享事件：取哪边都一样，以上游为准；字段分叉时大声报并按上游改写
// （0.18.33 口径：上游给 host.call.fail 加了稳定码字段 'error'——是上游的加法，本仓发射的字段
//   是它的子集，按上游放宽不会把本仓自己的字段变成未知字段）。
const SHARED_EVENTS = ['host.call', 'host.call.fail', 'update.install.exec']
// 真删的死条目：旧文件里有、上游没有、两边 dist 都无发射点（#75 实物结论）。
// update.install.fail 已移出：上游 0.18.x 又把它加回清单，且真的发射
// （上游 dist/core/service.js 发射点）——「上游没有」的前提已不成立，按上游全收。
const REMOVED_EVENTS = ['update.check.ok', 'update.install.start', 'update.install.ok']
// 被替换的旧条目：旧文件里有、上游也有同名但字段不同（旧定义已死，以上游为准）。
// 若上游将来删掉它，这里会大声报（而不是静默消失），到时再定口径。
const SUPERSEDED_EVENTS = ['update.check.start', 'update.check.fail']

interface EventEntry {
  level: unknown
  kind: string
  fields: unknown
}

interface EventListDoc {
  version: number
  pluginId: string
  events: Record<string, EventEntry>
}

// 上游清单条目多带 guard 等说明字段；本仓只取 {level,kind,fields} 口径。
interface UpstreamEventEntry extends EventEntry {
  [key: string]: unknown
}

interface UpstreamEventListDoc {
  events: Record<string, UpstreamEventEntry>
}

const upstream = JSON.parse(readFileSync(join(ROOT, 'node_modules', 'dsh-plugin-update', 'event-list.update.json'), 'utf8')) as UpstreamEventListDoc
const current = JSON.parse(readFileSync(join(ROOT, 'runtime', 'event-list.json'), 'utf8')) as EventListDoc

// 上游条目只取 {level,kind,fields}（与本仓文件口径一致；上游自带的 guard 说明不进清单）。
const events: Record<string, EventEntry> = {}
for (const [name, entry] of Object.entries(upstream.events)) {
  events[name] = { level: entry.level, kind: entry.kind, fields: entry.fields }
}
// 本仓独有条目：必须都在旧文件里（少了说明口径漂了，大声报）；上游若有同名（不该有），报冲突。
for (const name of OWN_ONLY_EVENTS) {
  if (!current.events[name]) throw new Error('[events] 本仓独有事件在旧清单里缺失，口径已漂：' + name)
  if (upstream.events[name]) throw new Error('[events] 上游新增同名事件，先定口径再重建：' + name)
  events[name] = current.events[name]
}
// 共享条目：以上游定义为准（上游改字段即大声报，并按上游改写——口径已定为「以上游为准」）。
const divergedShared: string[] = []
for (const name of SHARED_EVENTS) {
  if (!current.events[name]) throw new Error('[events] 共享事件在旧清单里缺失，口径已漂：' + name)
  if (!upstream.events[name]) throw new Error('[events] 上游删掉共享事件，先定口径再重建：' + name)
  const a = JSON.stringify(current.events[name])
  const b = JSON.stringify({ level: upstream.events[name].level, kind: upstream.events[name].kind, fields: upstream.events[name].fields })
  if (a !== b) divergedShared.push(name)
}
// 真删条目：上游必须没有（上游加回来即先定口径）；旧文件里有是历史残留、没有是已迁过，两态都接受。
for (const name of REMOVED_EVENTS) {
  if (upstream.events[name]) throw new Error('[events] 上游加回已删事件，先定口径再重建：' + name)
}
// 被替换条目：上游必须有（上游删掉即先定口径）；旧定义与上游不同是待替换、相同是已迁过，两态都接受。
const supersededNow: string[] = []
for (const name of SUPERSEDED_EVENTS) {
  if (!upstream.events[name]) throw new Error('[events] 上游删掉被替换事件，先定口径再重建：' + name)
  if (!current.events[name]) continue
  const a = JSON.stringify(current.events[name])
  const b = JSON.stringify({ level: upstream.events[name].level, kind: upstream.events[name].kind, fields: upstream.events[name].fields })
  if (a !== b) supersededNow.push(name)
}
// 旧文件里既非独有、亦非已删/被替换/共享、且上游也没有的残留：不许悄悄带过去。
for (const name of Object.keys(current.events)) {
  if (!OWN_ONLY_EVENTS.includes(name) && !SHARED_EVENTS.includes(name) && !REMOVED_EVENTS.includes(name) && !SUPERSEDED_EVENTS.includes(name) && !upstream.events[name]) {
    throw new Error('[events] 旧清单里有未知条目，先定口径再重建：' + name)
  }
}

const out: EventListDoc = { version: 1, pluginId: PLUGIN_ID, events: events }
writeFileSync(join(ROOT, 'runtime', 'event-list.json'), JSON.stringify(out, null, 2) + '\n')

const counts: Record<string, number> = { resident: 0, ondemand: 0, selfmon: 0 }
for (const entry of Object.values(events)) { counts[entry.kind] = (counts[entry.kind] || 0) + 1 }
console.log('[events] 写 runtime/event-list.json：' + Object.keys(events).length + ' 事件 ' + JSON.stringify(counts))
const dropped = REMOVED_EVENTS.filter((name) => current.events[name])
if (dropped.length > 0) console.log('[events] 本次丢掉旧残留 ' + dropped.length + '：' + dropped.join(', '))
console.log('[events] 真删 ' + REMOVED_EVENTS.length + '：' + REMOVED_EVENTS.join(', '))
console.log(supersededNow.length === 0
  ? '[events] 上游替换 ' + SUPERSEDED_EVENTS.length + '（已是上游定义，无需替换）：' + SUPERSEDED_EVENTS.join(', ')
  : '[events] 上游替换 ' + supersededNow.length + '：' + supersededNow.join(', '))
console.log('[events] 保留独有 ' + OWN_ONLY_EVENTS.length + '：' + OWN_ONLY_EVENTS.join(', '))
console.log('[events] 共享 ' + SHARED_EVENTS.length + '：' + SHARED_EVENTS.join(', '))
if (divergedShared.length > 0) console.log('[events] 共享字段分叉 ' + divergedShared.length + '（按上游为准已改写）：' + divergedShared.join(', '))
