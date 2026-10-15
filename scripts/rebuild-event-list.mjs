// rebuild-event-list.mjs — runtime/event-list.json 的重建器（dsh-log 0.3.x 口径）
//
// 为什么需要它：0.3.0 起清单不再自报 counts（自算为准），且更新包 0.16.0 起随包发
// event-list.update.json（26 事件，update.* 的权威源）。本仓清单 = 上游 26 全收
// + 本仓独有 5 事件（上游没有、repo 自身发射）；另有 3 个两边同名且字段一致的共享事件
// （host.call、host.call.fail、update.install.exec，取哪边都一样，以上游为准）。
// 上游再发新版（新事件/删事件/改字段）时重跑本脚本 + 按输出核对测试里的 emitted 子集。
//
// 用法：node scripts/rebuild-event-list.mjs   （写 runtime/event-list.json，stdout 报清点与冲突）
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const PLUGIN_ID = 'dsh-opencode-palette'
// 本仓独有、且上游 0.18 清单里没有的事件：原样保留（repo 自身发射，删了读侧不可查）。
const OWN_ONLY_EVENTS = ['log.switch.set', 'log.forward.summary', 'log.switch.watchdog', 'log.export.fail', 'host.channel.fail']
// 两边同名、字段逐字一致的共享事件：以上游定义为准（一致才过，不一致大声报）。
const SHARED_EVENTS = ['host.call', 'host.call.fail', 'update.install.exec']
// 真删的死条目：旧文件里有、上游没有、两边 dist 都无发射点（#75 实物结论）。
const REMOVED_EVENTS = ['update.check.ok', 'update.install.start', 'update.install.ok', 'update.install.fail']
// 被替换的旧条目：旧文件里有、上游也有同名但字段不同（旧定义已死，以上游为准）。
// 若上游将来删掉它，这里会大声报（而不是静默消失），到时再定口径。
const SUPERSEDED_EVENTS = ['update.check.start', 'update.check.fail']

const upstream = JSON.parse(readFileSync(join(ROOT, 'node_modules', 'dsh-plugin-update', 'event-list.update.json'), 'utf8'))
const current = JSON.parse(readFileSync(join(ROOT, 'runtime', 'event-list.json'), 'utf8'))

// 上游条目只取 {level,kind,fields}（与本仓文件口径一致；上游自带的 guard 说明不进清单）。
const events = {}
for (const [name, entry] of Object.entries(upstream.events)) {
  events[name] = { level: entry.level, kind: entry.kind, fields: entry.fields }
}
// 本仓独有条目：必须都在旧文件里（少了说明口径漂了，大声报）；上游若有同名（不该有），报冲突。
for (const name of OWN_ONLY_EVENTS) {
  if (!current.events[name]) throw new Error('[events] 本仓独有事件在旧清单里缺失，口径已漂：' + name)
  if (upstream.events[name]) throw new Error('[events] 上游新增同名事件，先定口径再重建：' + name)
  events[name] = current.events[name]
}
// 共享条目：两边必须逐字一致（上游改字段即大声报，不静默跟）。
for (const name of SHARED_EVENTS) {
  if (!current.events[name]) throw new Error('[events] 共享事件在旧清单里缺失，口径已漂：' + name)
  if (!upstream.events[name]) throw new Error('[events] 上游删掉共享事件，先定口径再重建：' + name)
  const a = JSON.stringify(current.events[name])
  const b = JSON.stringify({ level: upstream.events[name].level, kind: upstream.events[name].kind, fields: upstream.events[name].fields })
  if (a !== b) throw new Error('[events] 共享事件字段已分叉，先定口径再重建：' + name)
}
// 真删条目：上游必须没有（上游加回来即先定口径）；旧文件里有是历史残留、没有是已迁过，两态都接受。
for (const name of REMOVED_EVENTS) {
  if (upstream.events[name]) throw new Error('[events] 上游加回已删事件，先定口径再重建：' + name)
}
// 被替换条目：上游必须有（上游删掉即先定口径）；旧定义与上游不同是待替换、相同是已迁过，两态都接受。
const supersededNow = []
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

const out = { version: 1, pluginId: PLUGIN_ID, events: events }
writeFileSync(join(ROOT, 'runtime', 'event-list.json'), JSON.stringify(out, null, 2) + '\n')

const counts = { resident: 0, ondemand: 0, selfmon: 0 }
for (const entry of Object.values(events)) { counts[entry.kind] = (counts[entry.kind] || 0) + 1 }
console.log('[events] 写 runtime/event-list.json：' + Object.keys(events).length + ' 事件 ' + JSON.stringify(counts))
const dropped = REMOVED_EVENTS.filter((name) => current.events[name])
if (dropped.length > 0) console.log('[events] 本次丢掉旧残留 ' + dropped.length + '：' + dropped.join(', '))
console.log('[events] 真删 ' + REMOVED_EVENTS.length + '：' + REMOVED_EVENTS.join(', '))
console.log(supersededNow.length === 0
  ? '[events] 上游替换 ' + SUPERSEDED_EVENTS.length + '（已是上游定义，无需替换）：' + SUPERSEDED_EVENTS.join(', ')
  : '[events] 上游替换 ' + supersededNow.length + '：' + supersededNow.join(', '))
console.log('[events] 保留独有 ' + OWN_ONLY_EVENTS.length + '：' + OWN_ONLY_EVENTS.join(', '))
console.log('[events] 共享一致 ' + SHARED_EVENTS.length + '：' + SHARED_EVENTS.join(', '))
