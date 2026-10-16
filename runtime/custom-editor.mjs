// custom-editor.mjs — 37 色自定义主题编辑弹窗（#86）
// 交互与文案口径对齐 prototypes/custom-editor-83.prototype.html（唯一真相源）。
// React 组件（无 DOM 裸奔）：渲染期零 document/window 访问，副作用全进 effects/handlers。
import { normalizeHexInput, hexToHsv, hsvToHex, distinctThemeColors, effectiveSlotColor, editorMiniLight } from './custom-color.mjs'

// 双向定位的额外高亮映射（原型 EXTRA_HL 口径）
const EXTRA_HL = {
  border: ['mdHr'],
  borderActive: ['inputBox'],
  textMuted: ['miniSub'],
  sidebarBg: ['sideBar'],
  bubbleBg: ['bubble'],
  inputBg: ['inputBox'],
  background: ['dlgRight'],
  backgroundPanel: ['quote'],
}

// props: {
//   h: { createElement, useState, useEffect, useMemo, useRef }, tr, trf,
//   groups: [{ id, keys }], groupMeta: { id: { zh, en } },
//   slotMeta: { key: { zh, en, useZh, useEn, allow } },
//   editor: { mode: 'new'|'edit', seed: { id, name, appearance, colors, basePreset } },
//   customs: [{ id, name, appearance, colors, basePreset }],
//   presets: [{ name, appearance, colors }],
//   presetGroups: [{ title, names: [presetName] }],
//   isActive: bool,
//   onSave(payload): Promise, onDelete(id): Promise, onClose()
// }
export function CustomEditor(props) {
  const h = props.h
  const e = h.createElement
  const tr = props.tr
  const trf = props.trf
  const lang = props.lang === 'en' ? 'en' : 'zh'
  //  verdict 长句按语言连接：中文无缝拼接，英文词间补空格（I18N 串本身不带首尾空格，词表可逐行对账）。
  function segJoin(parts) {
    if (lang !== 'en') return parts
    const out = []
    for (let i = 0; i < parts.length; i++) {
      if (i > 0) out.push(' ')
      out.push(parts[i])
    }
    return out
  }
  const seed = (props.editor && props.editor.seed) || {}
  const mode = (props.editor && props.editor.mode) === 'edit' ? 'edit' : 'new'

  const [name, setName] = h.useState(typeof seed.name === 'string' ? seed.name : '')
  const [appearance, setAppearance] = h.useState(
    seed.appearance === 'light' || seed.appearance === 'system' ? seed.appearance : 'dark'
  )
  const [colors, setColors] = h.useState(Object.assign({}, seed.colors || {}))
  const [basePreset, setBasePreset] = h.useState(typeof seed.basePreset === 'string' ? seed.basePreset : 'opencode')
  const [origId] = h.useState(typeof seed.id === 'string' ? seed.id : null)
  const [targetSel, setTargetSel] = h.useState(typeof seed.id === 'string' ? seed.id : null)
  const [showPresets, setShowPresets] = h.useState(false)
  const [presetQuery, setPresetQuery] = h.useState('')
  const [pop, setPop] = h.useState(null) // { key, hex, transparent, orig: { hex, transparent } }
  const [popPos, setPopPos] = h.useState(null)
  const [hl, setHl] = h.useState(null)
  const [hlRects, setHlRects] = h.useState([])
  const [delConfirm, setDelConfirm] = h.useState(false)
  const [sysDark, setSysDark] = h.useState(function () {
    try {
      const w = typeof window !== 'undefined' ? window : null
      const mm = w && typeof w.matchMedia === 'function'
        ? w.matchMedia('(prefers-color-scheme: dark)')
        : null
      return mm ? !!mm.matches : true
    } catch (err) { return true }
  })
  const dlgRef = h.useRef(null)
  const miniRef = h.useRef(null)
  const rowRefs = h.useRef({})
  const svDrag = h.useRef(null)

  // 跟随系统：监听 OS 明暗翻转重绘预览（原型 matchMedia 口径）
  h.useEffect(function () {
    try {
      const w = typeof window !== 'undefined' ? window : null
      if (!w || typeof w.matchMedia !== 'function') return undefined
      const mq = w.matchMedia('(prefers-color-scheme: dark)')
      const fn = function (ev) { setSysDark(!!(ev && ev.matches)) }
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', fn)
      else if (typeof mq.addListener === 'function') mq.addListener(fn)
      return function () {
        if (typeof mq.removeEventListener === 'function') mq.removeEventListener('change', fn)
        else if (typeof mq.removeListener === 'function') mq.removeListener(fn)
      }
    } catch (err) { return undefined }
  }, [])

  // 点弹窗外关闭 Popover（原型 document mousedown 口径）
  h.useEffect(function () {
    if (!pop) return undefined
    const onDown = function (ev) {
      try {
        const root = dlgRef.current
        if (root && root.contains && !root.contains(ev.target)) closePop(true)
      } catch (err) { /* 忽略 */ }
    }
    try {
      const d = typeof document !== 'undefined' ? document : null
      if (!d || typeof d.addEventListener !== 'function') return undefined
      d.addEventListener('mousedown', onDown)
      return function () { d.removeEventListener('mousedown', onDown) }
    } catch (err) { return undefined }
  }, [pop ? pop.key : null])

  // Popover 打开后按行定位（原型 placePop 口径，量行不量框）
  h.useEffect(function () {
    if (!pop) { setPopPos(null); return }
    try {
      const row = rowRefs.current[pop.key]
      const dlg = dlgRef.current
      if (!row || !dlg || typeof row.getBoundingClientRect !== 'function') return
      const r = row.getBoundingClientRect()
      const d = dlg.getBoundingClientRect()
      setPopPos({ left: Math.max(8, r.left - d.left + r.width - 320), top: r.top - d.top + r.height + 6 })
    } catch (err) { /* 定位失败则用默认位 */ }
  }, [pop ? pop.key : null])

  // 高亮描边：量画布节点相对容器坐标（原型 paintHl 口径）
  h.useEffect(function () {
    if (!hl) { setHlRects([]); return }
    try {
      const root = miniRef.current
      if (!root || typeof root.querySelectorAll !== 'function') return
      const base = typeof root.getBoundingClientRect === 'function' ? root.getBoundingClientRect() : null
      if (!base) return
      const keys = [hl].concat(EXTRA_HL[hl] || [])
      const rects = []
      for (const k of keys) {
        const nodes = root.querySelectorAll('[data-slot="' + k + '"]')
        for (let i = 0; i < nodes.length; i++) {
          const r = nodes[i].getBoundingClientRect()
          rects.push({ left: r.left - base.left, top: r.top - base.top, width: r.width, height: r.height, key: k })
        }
      }
      setHlRects(rects)
    } catch (err) { /* 忽略 */ }
  }, [hl, colors, appearance, sysDark])

  // 预览底盘跟编辑器外观走（原型 effAppearance/renderMini 口径），不是只跟 OS。
  const miniLight = editorMiniLight(appearance, sysDark)
  const eff = function (key) { return effectiveSlotColor(key, colors, miniLight) }
  const edgeHl = hl === 'border' || hl === 'borderActive'

  function setColor(key, hex, transparent) {
    setColors(function (prev) {
      const next = Object.assign({}, prev)
      if (transparent) {
        // 仅 8 背景槽可设透明（其余回 FB，保持预览与宿主归一化一致）
        const allow = props.slotMeta && props.slotMeta[key] && props.slotMeta[key].allow
        next[key] = allow ? 'transparent' : effectiveSlotColor(key, prev, false)
      } else {
        next[key] = hex
      }
      return next
    })
  }

  function openPop(key) {
    const raw = colors[key]
    const norm = normalizeHexInput(raw)
    setPop({
      key: key,
      hex: norm || effectiveSlotColor(key, colors, false),
      transparent: raw === 'transparent',
      orig: { hex: norm || effectiveSlotColor(key, colors, false), transparent: raw === 'transparent' },
    })
    setHl(key)
  }

  function closePop(revert) {
    if (revert && pop) {
      const o = pop.orig
      setColor(pop.key, o.hex, o.transparent)
    }
    setPop(null)
  }

  function clickSlot(key) {
    // 右点击 → 左定位 + 自动弹板（data-slot 即色位 key）
    if (props.slotMeta && props.slotMeta[key]) {
      try {
        const row = rowRefs.current[key]
        if (row && typeof row.scrollIntoView === 'function') row.scrollIntoView({ block: 'nearest' })
      } catch (err) { /* 忽略 */ }
      openPop(key)
    }
  }

  function loadPreset(p) {
    setColors(Object.assign({}, p.colors))
    setAppearance(p.appearance)
    setBasePreset(p.name)
    setShowPresets(false)
    setPresetQuery('')
  }

  function switchTarget(id) {
    const found = (props.customs || []).filter(function (t) { return t.id === id })[0]
    if (!found) return
    setTargetSel(id)
    setName(found.name)
    setAppearance(found.appearance)
    setColors(Object.assign({}, found.colors))
    setBasePreset(found.basePreset || 'opencode')
    setDelConfirm(false)
  }

  const canSave = name.trim().length > 0

  function handleSave() {
    if (!canSave) return
    props.onSave({
      id: mode === 'edit' ? (targetSel || origId) : null,
      name: name.trim(),
      appearance: appearance,
      colors: colors,
      basePreset: basePreset,
    })
  }

  // ── 左列：标题 + 基底 + 外观 + 37 色位行 ──
  const leftRows = []
  for (const g of props.groups || []) {
    const gm = (props.groupMeta && props.groupMeta[g.id]) || { zh: g.id, en: g.id }
    leftRows.push(e('div', {
      key: 'g-' + g.id,
      style: { fontSize: '12px', fontWeight: 700, color: '#EDEDF2', margin: '12px 0 2px' },
    }, lang === 'en' ? gm.en + ' · ' + g.keys.length : gm.zh + ' · ' + g.keys.length + ' 色'))
    for (const key of g.keys) {
      const meta = (props.slotMeta && props.slotMeta[key]) || { zh: key, en: key, useZh: '', useEn: '', allow: false }
      const raw = colors[key]
      const isTrans = raw === 'transparent'
      const shown = isTrans ? eff(key) : (normalizeHexInput(raw) || eff(key))
      const label = lang === 'en' ? meta.en : meta.zh
      const use = lang === 'en' ? meta.useEn : meta.useZh
      const swStyle = isTrans
        ? { background: 'linear-gradient(45deg,#3A3A42 25%,#55555E 25%,#55555E 50%,#3A3A42 50%,#3A3A42 75%,#55555E 75%)', backgroundSize: '8px 8px' }
        : { background: shown }
      leftRows.push(e('div', {
        key: 'row-' + key,
        ref: function (el) { rowRefs.current[key] = el },
        onMouseEnter: function () { setHl(key) },
        style: {
          display: 'flex', alignItems: 'center', gap: '8px', padding: '3px 6px', borderRadius: '6px',
          background: hl === key ? 'rgba(250,178,131,0.12)' : 'transparent',
          outline: hl === key ? '1px solid #FAB283' : '1px solid transparent',
        },
      },
        e('button', {
          'data-slot-row': key,
          title: tr('edPickTitle'),
          onClick: function () { openPop(key) },
          style: Object.assign({
            width: '22px', height: '22px', borderRadius: '6px', cursor: 'pointer', flexShrink: 0,
            border: '1px solid #55555E',
          }, swStyle),
        }),
        e('span', { style: { fontSize: '12px', color: '#EDEDF2', whiteSpace: 'nowrap' } }, label),
        meta.allow ? e('span', {
          style: { fontSize: '10px', color: '#FAB283', border: '1px solid #FAB283', borderRadius: '4px', padding: '0 4px', whiteSpace: 'nowrap' },
        }, tr('edTransparentFlag')) : null,
        e('span', { style: { fontSize: '11px', color: '#8B8B95', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, use),
        e('span', { style: { fontSize: '11px', color: isTrans ? '#FAB283' : '#C9C9D2', fontFamily: 'monospace', whiteSpace: 'nowrap' } },
          isTrans ? 'transparent→' + shown : shown)
      ))
    }
  }

  // ── 调色板 Popover ──
  function renderPop() {
    if (!pop) return null
    const meta = (props.slotMeta && props.slotMeta[pop.key]) || { zh: pop.key, en: pop.key, allow: false }
    const hsv = hexToHsv(pop.hex)
    const freq = distinctThemeColors(colors).slice(0, 12)
    const onSv = function (ev) {
      try {
        const box = ev.currentTarget
        const r = box.getBoundingClientRect()
        const x = Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width))
        const y = Math.min(1, Math.max(0, (ev.clientY - r.top) / r.height))
        const hex = hsvToHex({ h: hsv.h, s: x * 100, v: (1 - y) * 100 })
        setPop(Object.assign({}, pop, { hex: hex, transparent: false }))
        setColor(pop.key, hex, false)
      } catch (err) { /* 忽略 */ }
    }
    const startSv = function (ev) {
      svDrag.current = true
      onSv(ev)
      const move = function (me) { if (svDrag.current) onSv(me) }
      const up = function () {
        svDrag.current = false
        try {
          const d = typeof document !== 'undefined' ? document : null
          if (d) {
            d.removeEventListener('mousemove', move)
            d.removeEventListener('mouseup', up)
          }
        } catch (err) { /* 忽略 */ }
      }
      try {
        const d = typeof document !== 'undefined' ? document : null
        if (d) {
          d.addEventListener('mousemove', move)
          d.addEventListener('mouseup', up)
        }
      } catch (err) { /* 忽略 */ }
    }
    const hueCss = 'linear-gradient(90deg,#F00,#FF0,#0F0,#0FF,#00F,#F0F,#F00)'
    const svCss = 'linear-gradient(180deg,rgba(255,255,255,1) 0%,hsla(' + Math.round(hsv.h) + ',100%,50%,0) 0%),'
      + 'linear-gradient(0deg,#000 0%,hsla(' + Math.round(hsv.h) + ',100%,50%,0) 100%),'
      + 'hsl(' + Math.round(hsv.h) + ',100%,50%)'
    return e('div', {
      key: 'pop',
      style: Object.assign({
        position: 'absolute', zIndex: 30, width: '300px', background: '#1E1E24',
        border: '1px solid #55555E', borderRadius: '10px', padding: '10px',
        boxShadow: '0 8px 28px rgba(0,0,0,0.5)',
      }, popPos || { left: 40, top: 120 }),
    },
      e('div', { style: { fontSize: '12px', fontWeight: 700, color: '#EDEDF2', marginBottom: '8px' } },
        lang === 'en' ? meta.en : meta.zh),
      e('div', {
        onMouseDown: startSv,
        style: {
          height: '120px', borderRadius: '8px', cursor: 'crosshair', position: 'relative',
          background: svCss, border: '1px solid #55555E',
        },
      },
        e('div', {
          style: {
            position: 'absolute', width: '12px', height: '12px', borderRadius: '50%',
            border: '2px solid #fff', boxShadow: '0 0 0 1px #000',
            left: 'calc(' + hsv.s.toFixed(1) + '% - 6px)', top: 'calc(' + (100 - hsv.v).toFixed(1) + '% - 6px)',
            background: pop.hex,
          },
        })
      ),
      e('input', {
        type: 'range', min: 0, max: 359, step: 1, value: Math.round(hsv.h),
        'aria-label': 'Hue',
        onChange: function (ev) {
          const hex = hsvToHex({ h: Number(ev.target.value), s: hsv.s, v: hsv.v })
          setPop(Object.assign({}, pop, { hex: hex, transparent: false }))
          setColor(pop.key, hex, false)
        },
        style: { width: '100%', margin: '8px 0 2px', background: hueCss, borderRadius: '4px', height: '10px', appearance: 'none' },
      }),
      freq.length ? e('div', { style: { margin: '6px 0 2px' } },
        e('div', { style: { fontSize: '11px', color: '#8B8B95', marginBottom: '4px' } }, tr('edFreq')),
        e('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '4px' } }, freq.map(function (c) {
          return e('button', {
            key: 'fq-' + c, title: c,
            onClick: function () {
              setPop(Object.assign({}, pop, { hex: c, transparent: false }))
              setColor(pop.key, c, false)
            },
            style: { width: '20px', height: '20px', borderRadius: '5px', background: c, border: c === pop.hex ? '2px solid #FAB283' : '1px solid #55555E', cursor: 'pointer' },
          })
        }))) : null,
      e('div', { style: { display: 'flex', gap: '6px', marginTop: '8px' } },
        e('input', {
          value: pop.hex, spellCheck: false,
          onChange: function (ev) {
            const v = ev.target.value
            setPop(Object.assign({}, pop, { hex: v }))
            const norm = normalizeHexInput(v)
            if (norm) {
              setPop(Object.assign({}, pop, { hex: norm }))
              setColor(pop.key, norm, false)
            }
          },
          style: { flex: 1, minWidth: 0, background: '#141419', color: '#EDEDF2', border: '1px solid #55555E', borderRadius: '6px', padding: '4px 8px', fontSize: '12px', fontFamily: 'monospace' },
        }),
        meta.allow ? e('label', {
          style: { display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#EDEDF2', cursor: 'pointer', whiteSpace: 'nowrap' },
        },
          e('input', {
            type: 'checkbox', checked: pop.transparent,
            onChange: function (ev) {
              const on = !!ev.target.checked
              setPop(Object.assign({}, pop, { transparent: on }))
              setColor(pop.key, pop.hex, on)
            },
          }),
          tr('edTransparent')) : null
      ),
      e('div', { style: { display: 'flex', justifyContent: 'flex-end', gap: '6px', marginTop: '8px' } },
        e('button', {
          onClick: function () {
            const norm = normalizeHexInput(pop.hex)
            setColor(pop.key, norm || pop.hex, pop.transparent && !norm ? false : pop.transparent)
            setPop(null)
          },
          style: { background: '#FAB283', color: '#141419', border: 'none', borderRadius: '6px', padding: '4px 12px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' },
        }, tr('edOk')),
        e('button', {
          onClick: function () { closePop(true) },
          style: { background: 'transparent', color: '#C9C9D2', border: '1px solid #55555E', borderRadius: '6px', padding: '4px 12px', fontSize: '12px', cursor: 'pointer' },
        }, tr('edClosePop'))
      )
    )
  }

  // ── 预置主题 Popover ──
  function renderPresetPop() {
    if (!showPresets) return null
    const q = presetQuery.trim().toLowerCase()
    const match = function (n) {
      return !q || n.toLowerCase().indexOf(q) >= 0
    }
    return e('div', {
      key: 'presetpop',
      style: {
        position: 'absolute', zIndex: 30, top: '86px', left: '16px', width: '300px', maxHeight: '320px',
        overflow: 'auto', background: '#1E1E24', border: '1px solid #55555E', borderRadius: '10px',
        padding: '10px', boxShadow: '0 8px 28px rgba(0,0,0,0.5)',
      },
    },
      e('input', {
        value: presetQuery, placeholder: tr('edPresetSearch'),
        onChange: function (ev) { setPresetQuery(ev.target.value) },
        style: { width: '100%', boxSizing: 'border-box', background: '#141419', color: '#EDEDF2', border: '1px solid #55555E', borderRadius: '6px', padding: '5px 8px', fontSize: '12px', marginBottom: '8px' },
      }),
      (props.presetGroups || []).map(function (g) {
        const names = (g.names || []).filter(match)
        if (!names.length) return null
        return e('div', { key: 'pg-' + g.title },
          e('div', { style: { fontSize: '11px', color: '#8B8B95', margin: '6px 0 4px' } }, g.title),
          e('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '4px' } }, names.map(function (n) {
            const p = (props.presets || []).filter(function (x) { return x.name === n })[0]
            const dot = p && p.colors ? p.colors.primary : '#888'
            return e('button', {
              key: 'pp-' + n, title: n,
              onClick: function () { if (p) loadPreset(p) },
              style: {
                display: 'flex', alignItems: 'center', gap: '5px', background: '#26262E', color: '#EDEDF2',
                border: '1px solid #3A3A42', borderRadius: '20px', padding: '3px 9px 3px 6px',
                fontSize: '12px', cursor: 'pointer',
              },
            },
              e('span', { style: { width: '10px', height: '10px', borderRadius: '50%', background: dot } }),
              n)
          })))
      })
    )
  }

  // ── 右侧：顶部胶囊预览 + 微缩 DSH 仿真画布 ──
  function renderMini() {
    const node = function (slot, style, children, extra) {
      return e('div', Object.assign({
        'data-slot': slot,
        onClick: function (ev) { try { ev.stopPropagation() } catch (err) { /* 忽略 */ } clickSlot(slot) },
        style: Object.assign({ cursor: 'pointer' }, style),
      }, extra || {}), children)
    }
    const codeLines = [
      { n: '1', parts: [{ t: '// comment ', s: 'syntaxComment' }, { t: 'const ', s: 'syntaxKeyword' }, { t: 'run', s: 'syntaxFunction' }, { t: ' = ', s: 'syntaxOperator' }, { t: 'Theme', s: 'syntaxType' }, { t: ' 37', s: 'syntaxNumber' }] },
      { n: '2', parts: [{ t: '"ok"', s: 'syntaxString' }, { t: 'return ', s: 'syntaxKeyword' }, { t: '"done"', s: 'syntaxString' }, { t: ';', s: 'syntaxOperator' }] },
    ]
    return e('div', {
      ref: miniRef,
      style: {
        position: 'relative', borderRadius: '10px', overflow: 'hidden',
        border: '1px solid ' + eff('border'), background: eff('background'),
        display: 'flex', minHeight: '380px', textAlign: 'left',
      },
    },
      // 侧边栏
      node('sidebarBg', { width: '86px', flexShrink: 0, background: eff('sidebarBg'), borderRight: '1px solid ' + eff('border'), padding: '8px 6px', display: 'flex', flexDirection: 'column', gap: '5px' }, [
        node('text', { fontSize: '10px', fontWeight: 700, color: eff('text') }, tr('miniSession')),
        node('textMuted', { fontSize: '9px', color: eff('textMuted') }, tr('miniCurrent'), { key: 'miniSub', 'data-slot': 'textMuted' }),
        node('primary', { fontSize: '9px', color: eff('primary'), background: 'transparent', border: 'none', padding: 0 }, tr('miniDraft')),
        node('secondary', { fontSize: '9px', color: eff('secondary') }, tr('miniReview')),
      ]),
      // 主列
      e('div', { style: { flex: 1, padding: '8px', display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 } },
        node('bubbleBg', {
          alignSelf: 'flex-end', maxWidth: '90%', background: eff('bubbleBg'),
          border: '1px solid ' + eff('border'), borderRadius: '8px', padding: '5px 8px',
          fontSize: '10px', color: eff('text'),
        }, tr('miniBubble')),
        node('markdownHeading', { fontSize: '11px', fontWeight: 700, color: eff('markdownHeading') }, tr('miniVerdict')),
        e('div', { style: { fontSize: '10px', color: eff('text'), lineHeight: 1.6 } },
          ...segJoin([
            tr('miniPass1'),
            node('markdownStrong', { fontWeight: 700, color: eff('markdownStrong'), display: 'inline' }, tr('miniPassStrong')),
            tr('miniPass2'),
            tr('miniGap'),
            tr('miniPass3'),
            node('markdownLink', { color: eff('markdownLink'), textDecoration: 'underline', display: 'inline' }, tr('miniSpec')),
            tr('miniPass4'),
            node('markdownCode', {
              color: eff('markdownCode'), background: 'rgba(127,127,127,0.18)',
              borderRadius: '3px', padding: '0 3px', display: 'inline', fontFamily: 'monospace',
            }, 'v2'),
            tr('miniNote'),
          ]),
          e('div', null,
            node('markdownEmph', { fontStyle: 'italic', color: eff('markdownEmph'), display: 'inline' }, tr('miniEmph')))
        ),
        node('markdownBlockQuote', {
          borderLeft: '3px solid ' + eff('markdownBlockQuote'), color: eff('markdownBlockQuote'),
          fontSize: '10px', padding: '2px 0 2px 8px',
        }, tr('miniQuote'), { key: 'quote', 'data-slot': 'markdownBlockQuote' }),
        node('border', { borderTop: '1px solid ' + eff('border'), height: 0 }, null, { key: 'mdHr', 'data-slot': 'border' }),
        // 代码块
        node('codeBlockBg', { background: eff('codeBlockBg'), border: '1px solid ' + eff('border'), borderRadius: '8px', overflow: 'hidden' },
          e('div', null,
            node('codeHeaderBg', {
              display: 'flex', justifyContent: 'space-between', background: eff('codeHeaderBg'),
              padding: '3px 8px', fontSize: '9px', color: eff('textMuted'),
            }, [e('span', { key: 'f' }, tr('miniFile')), e('span', { key: 'l' }, 'js')]),
            codeLines.map(function (ln) {
              return e('div', { key: 'cl-' + ln.n, style: { display: 'flex', fontSize: '10px', fontFamily: 'monospace', padding: '1px 8px' } },
                e('span', { style: { width: '14px', color: eff('textMuted'), flexShrink: 0 } }, ln.n),
                e('span', null, ln.parts.map(function (p, i) {
                  return node(p.s, { color: eff(p.s), display: 'inline' }, p.t, { key: 'tk-' + ln.n + '-' + i, 'data-slot': p.s })
                })))
            })
          )
        ),
        // Diff 块
        e('div', { style: { border: '1px solid ' + eff('border'), borderRadius: '8px', overflow: 'hidden', fontSize: '10px', fontFamily: 'monospace' } },
          node('diffAddedBg', { display: 'flex', background: eff('diffAddedBg') }, [
            node('diffAddedLineNumberBg', { width: '18px', background: eff('diffAddedLineNumberBg'), color: eff('textMuted'), textAlign: 'center', flexShrink: 0 }, '+1', { key: 'aln' }),
            node('diffAdded', { color: eff('diffAdded'), padding: '1px 6px' }, '+ background: #FFFFFF'),
          ]),
          node('diffRemovedBg', { display: 'flex', background: eff('diffRemovedBg') }, [
            node('diffRemovedLineNumberBg', { width: '18px', background: eff('diffRemovedLineNumberBg'), color: eff('textMuted'), textAlign: 'center', flexShrink: 0 }, '-1', { key: 'rln' }),
            node('diffRemoved', { color: eff('diffRemoved'), padding: '1px 6px' }, '- background: #101014'),
          ])
        ),
        // 按钮徽章行
        e('div', { style: { display: 'flex', gap: '5px', flexWrap: 'wrap', alignItems: 'center' } },
          node('primary', {
            background: eff('primary'), color: '#141419', borderRadius: '6px', padding: '3px 10px',
            fontSize: '10px', fontWeight: 700,
          }, tr('miniBtnPrimary')),
          node('secondary', {
            background: 'transparent', color: eff('secondary'), border: '1px solid ' + eff('secondary'),
            borderRadius: '6px', padding: '2px 10px', fontSize: '10px',
          }, tr('miniBtnSecondary')),
          node('info', { color: eff('info'), fontSize: '10px', textDecoration: 'underline' }, tr('miniBtnInfo')),
          node('success', {
            color: eff('success'), border: '1px solid ' + eff('success'), borderRadius: '10px',
            fontSize: '9px', padding: '1px 8px',
          }, tr('miniBadgeOk')),
          node('warning', { color: eff('warning'), fontSize: '9px' }, tr('miniWarn')),
          node('error', { color: eff('error'), fontSize: '9px' }, tr('miniErr'))
        ),
        // 输入框
        node('inputBg', {
          display: 'flex', alignItems: 'center', gap: '6px', background: eff('inputBg'),
          border: '1px solid ' + eff('borderActive'), borderRadius: '8px', padding: '5px 8px',
          fontSize: '10px', color: eff('textMuted'),
        }, [e('span', { key: 'ph' }, tr('miniInputPh')), node('text', { color: eff('text') }, tr('miniInputHint'))], { key: 'inputBox', 'data-slot': 'inputBg' })
      ),
      // 高亮描边 + 角标（原型 paintHl 口径）
      hlRects.map(function (r, i) {
        const isEdge = r.key === hl && edgeHl
        return e('div', {
          key: 'hl-' + i,
          style: {
            position: 'absolute', left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px',
            borderRadius: '6px', pointerEvents: 'none',
            border: isEdge ? '2px solid #FAB283' : '2px solid rgba(250,178,131,0.9)',
            boxShadow: isEdge ? 'none' : 'inset 0 0 0 1px rgba(250,178,131,0.5)',
            animation: 'dsh-pal-breathe 1.2s ease-in-out infinite',
          },
        })
      }),
      hl ? e('div', {
        key: 'hlbadge',
        style: {
          position: 'absolute', left: '8px', bottom: '8px', background: '#FAB283', color: '#141419',
          fontSize: '10px', fontWeight: 700, borderRadius: '4px', padding: '1px 6px', pointerEvents: 'none',
        },
      }, ((props.slotMeta && props.slotMeta[hl] && (lang === 'en' ? props.slotMeta[hl].en : props.slotMeta[hl].zh)) || hl)) : null
    )
  }

  const capName = name.trim() || tr('edUnnamed')
  const shownName = mode === 'edit' && targetSel
    ? (((props.customs || []).filter(function (t) { return t.id === targetSel })[0] || {}).name || capName)
    : capName

  return e('div', {
    style: {
      position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
    },
    onClick: function () { props.onClose() },
  },
    e('div', {
      ref: dlgRef,
      onClick: function (ev) { try { ev.stopPropagation() } catch (err) { /* 忽略 */ } },
      style: {
        width: 'max-content', maxWidth: '96vw', maxHeight: '92vh', overflow: 'auto',
        background: '#141419', border: '1px solid #3A3A42', borderRadius: '14px',
        padding: '14px 16px', position: 'relative', color: '#EDEDF2',
      },
    },
      // 标题行（单行保字）
      e('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' } },
        e('span', {
          style: { fontSize: '11px', fontWeight: 700, background: '#FAB283', color: '#141419', borderRadius: '4px', padding: '1px 7px' },
        }, mode === 'edit' ? tr('edModeEdit') : tr('edModeNew')),
        mode === 'edit' ? e('span', {
          title: tr('edTagTitle'),
          style: {
            fontSize: '11px', color: '#C9C9D2', overflow: 'hidden', textOverflow: 'ellipsis',
            maxWidth: '220px', border: '1px solid #3A3A42', borderRadius: '4px', padding: '1px 7px',
          },
        }, trf('edEditing', { name: shownName })) : null,
        e('span', { style: { flex: 1 } }),
        e('button', {
          title: tr('edCloseTitle'), onClick: function () { props.onClose() },
          style: { background: 'transparent', color: '#8B8B95', border: 'none', fontSize: '15px', cursor: 'pointer', padding: '0 4px' },
        }, '✕')
      ),
      // 名字 + 目标 + 胶囊预览
      e('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px', flexWrap: 'wrap' } },
        mode === 'edit' ? e('select', {
          value: targetSel || '',
          title: tr('edTargetTitle'),
          onChange: function (ev) { switchTarget(ev.target.value) },
          style: { background: '#1E1E24', color: '#EDEDF2', border: '1px solid #55555E', borderRadius: '6px', padding: '4px 6px', fontSize: '12px', maxWidth: '150px' },
        }, (props.customs || []).map(function (t) {
          return e('option', { key: 'tg-' + t.id, value: t.id }, t.name)
        })) : null,
        e('input', {
          value: name, placeholder: tr('edNamePh'),
          title: name.trim() ? '' : tr('edNameEmpty'),
          onChange: function (ev) { setName(ev.target.value) },
          style: {
            background: '#1E1E24', color: '#EDEDF2', border: '1px solid #55555E', borderRadius: '6px',
            padding: '5px 9px', fontSize: '12px', width: '170px',
          },
        }),
        !name.trim() ? e('span', { style: { fontSize: '11px', color: '#FAB283' } }, tr('edNoName')) : null,
        e('span', { style: { flex: 1 } }),
        e('span', {
          title: tr('edCapTitle'),
          style: {
            display: 'inline-flex', alignItems: 'center', gap: '6px', borderRadius: '20px',
            padding: '4px 12px 4px 8px', fontSize: '12px',
            background: appearance === 'light' && colors.background === 'transparent' ? '#FFFFFF' : (normalizeHexInput(colors.background) || '#FFFFFF'),
            color: normalizeHexInput(colors.text) || '#000',
            border: '2px solid ' + (normalizeHexInput(colors.primary) || '#FAB283'),
          },
        },
          e('span', { style: { width: '9px', height: '9px', borderRadius: '50%', background: normalizeHexInput(colors.primary) || '#FAB283' } }),
          capName,
          e('span', null, '✓'))
      ),
      // 基底 + 外观
      e('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px', flexWrap: 'wrap' } },
        e('button', {
          title: tr('edPresetTitle'),
          onClick: function () { setShowPresets(!showPresets) },
          style: {
            background: '#26262E', color: '#EDEDF2', border: '1px solid #3A3A42', borderRadius: '6px',
            padding: '4px 10px', fontSize: '12px', cursor: 'pointer',
          },
        }, tr('edPreset') + ' · ' + (basePreset || tr('edNoBase'))),
        e('span', { style: { fontSize: '12px', color: '#8B8B95' } }, tr('edAppearance')),
        ['dark', 'light', 'system'].map(function (a) {
          const on = appearance === a
          const label = a === 'dark' ? tr('edDark') : (a === 'light' ? tr('edLight') : tr('edSystem'))
          const tip = a === 'dark' ? tr('edDarkTitle') : (a === 'light' ? tr('edLightTitle') : tr('edSystemTitle'))
          return e('button', {
            key: 'ap-' + a, title: tip,
            onClick: function () { setAppearance(a) },
            style: {
              background: on ? '#FAB283' : 'transparent', color: on ? '#141419' : '#C9C9D2',
              border: '1px solid ' + (on ? '#FAB283' : '#55555E'), borderRadius: '6px',
              padding: '4px 10px', fontSize: '12px', fontWeight: on ? 700 : 400, cursor: 'pointer',
            },
          }, label)
        })
      ),
      renderPresetPop(),
      // 主体：左列 + 右画布
      e('div', { style: { display: 'flex', gap: '14px', marginTop: '10px', alignItems: 'flex-start' } },
        e('div', { style: { width: '330px', flexShrink: 0 } }, leftRows),
        e('div', {
          style: {
            flex: 1, minWidth: '420px', background: miniLight ? '#F4F4F5' : '#1E1E24',
            borderRadius: '10px', padding: '10px',
          },
        },
          miniLight ? e('div', { style: { fontSize: '11px', color: '#55555E', marginBottom: '6px' } }, tr('edLightNote')) : null,
          renderMini(),
          // 原型画布底部署名条：底色跟 backgroundElement、字色跟 text，可点定位（prototype.html:844）
          node('backgroundElement', {
            fontSize: '11px', background: eff('backgroundElement'), color: eff('text'),
            borderRadius: '4px', padding: '2px 6px', marginTop: '6px', display: 'inline-block',
          }, tr('miniTip')))
      ),
      renderPop(),
      // 底部：删除 + 取消/保存
      e('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px' } },
        mode === 'edit' ? (delConfirm
          ? e('span', { style: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#EDEDF2' } },
            trf('edDelConfirm', { name: shownName }),
            e('small', { style: { color: '#8B8B95', fontSize: '11px' } }, tr('edDelNote')),
            e('button', {
              onClick: function () { props.onDelete(targetSel || origId) },
              style: { background: '#E5484D', color: '#fff', border: 'none', borderRadius: '6px', padding: '4px 12px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' },
            }, tr('edDelYes')),
            e('button', {
              onClick: function () { setDelConfirm(false) },
              style: { background: 'transparent', color: '#C9C9D2', border: '1px solid #55555E', borderRadius: '6px', padding: '4px 12px', fontSize: '12px', cursor: 'pointer' },
            }, tr('edDelNo')))
          : e('button', {
            onClick: function () { setDelConfirm(true) },
            style: { background: 'transparent', color: '#E5484D', border: '1px solid #E5484D', borderRadius: '6px', padding: '4px 12px', fontSize: '12px', cursor: 'pointer' },
          }, tr('edDelete'))) : null,
        e('span', { style: { flex: 1 } }),
        e('button', {
          title: tr('edCancelTitle'), onClick: function () { props.onClose() },
          style: { background: 'transparent', color: '#C9C9D2', border: '1px solid #55555E', borderRadius: '6px', padding: '5px 14px', fontSize: '12px', cursor: 'pointer' },
        }, tr('edCancel')),
        e('button', {
          title: canSave ? tr('edSaveTitle') : tr('edSaveNeedName'),
          onClick: handleSave, disabled: !canSave,
          style: {
            background: canSave ? '#FAB283' : '#3A3A42', color: canSave ? '#141419' : '#8B8B95',
            border: 'none', borderRadius: '6px', padding: '5px 16px', fontSize: '12px', fontWeight: 700,
            cursor: canSave ? 'pointer' : 'not-allowed',
          },
        }, tr('edSave'))
      )
    )
  )
}
