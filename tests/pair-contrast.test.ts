// pair-contrast.test.ts — 宿主「文字色压背景色」配对的对比度兜底（src/engine/pair-contrast.ts）
// 背景：插件只注入颜色 token，宿主 CSS 里有大量「同一规则同时设 background 与 color」的配对
// （主色按钮反白字、错误药丸、警告标签、错误提示文字…）。任何一对离得太近就是一处看不见的字，
// 2026-10 的 inline diff 截图事故是这类缺陷的最坏形态。本用例守住两层：
//   1) 真实渲染出来的每套主题（含 IP 预设）两半，全部配对都 >= 4.5 —— 物理冲突的那一条除外（单独登记）；
//   2) 修复函数本身的语义：只动该动的一侧、推离最小、不可行就不动、幂等、判不了就不改。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { themeNames, renderTheme, listIpPresets, renderCustomTheme } from '../src/engine/index.ts'
import { contrastRatio } from '../src/engine/resolve.ts'
import {
  HOST_TEXT_PAIRS, PAIR_CONTRAST_MIN, repairPairContrast, pairContrastRatio, preferredRepairSide, type TokenValues,
} from '../src/engine/pair-contrast.ts'

type HalfTokens = Record<string, { light?: string; dark?: string } | undefined>

const TYPO = { mode: 'mono', size: 13, fontKey: 'JetBrains Mono' }
const HALVES = ['light', 'dark'] as const

// 唯一一条「物理上无解」的配对：同一个反白字 label-primary-inverted 既要压住浅色填充
// （button-contrast-fill / label-primary），又要压住中调主色（brand-primary）——黑白两端都够不到 4.5。
// 宿主自己的默认值在同一处也只有 3.7 左右；我们的策略是保持主题作者的选择，不推成中间灰。
const INFEASIBLE_PAIR = '--dsw-alias-label-primary-inverted on --dsw-alias-brand-primary'

function halfValues(tokens: HalfTokens, half: 'light' | 'dark'): TokenValues {
  const values: TokenValues = {}
  for (const name of Object.keys(tokens)) values[name] = tokens[name] ? tokens[name]![half] : undefined
  return values
}

interface Row { label: string; ip: boolean; tokens: HalfTokens }

function allRows(): Row[] {
  const rows: Row[] = []
  for (const name of themeNames()) {
    if (name === 'system') continue
    rows.push({ label: name, ip: false, tokens: renderTheme(name, TYPO).tokens as HalfTokens })
  }
  for (const seed of listIpPresets()) {
    rows.push({
      label: 'ip:' + seed.name,
      ip: true,
      tokens: renderCustomTheme({ id: seed.name, appearance: seed.appearance, colors: seed.colors }, {}).tokens as HalfTokens,
    })
  }
  return rows
}

test('全部主题 + IP 预设：宿主每条「文字×背景」配对都 >= 4.5（唯一物理冲突的一条除外）', () => {
  const rows = allRows()
  assert.ok(rows.length >= 50, '应覆盖全部预置主题与 IP 预设')
  const belowThreshold: string[] = []
  const infeasibleRows: string[] = []
  let checked = 0
  for (const row of rows) {
    for (const half of HALVES) {
      const values = halfValues(row.tokens, half)
      // 页面底不可用（委托画布/半透明底）：判不了观感，整段跳过（与实现同一口径）
      if (pairContrastRatio(values, { fg: '--dsw-alias-bg-base', bg: '--dsw-alias-bg-base' }) === null) continue
      for (const pair of HOST_TEXT_PAIRS) {
        const ratio = pairContrastRatio(values, pair)
        if (ratio === null) continue
        checked++
        if (ratio >= PAIR_CONTRAST_MIN) continue
        const key = pair.fg + ' on ' + pair.bg
        if (key === INFEASIBLE_PAIR) {
          infeasibleRows.push(row.label + '/' + half + '@' + ratio.toFixed(2))
          continue
        }
        belowThreshold.push(row.label + '/' + half + ' ' + key + ' = ' + ratio.toFixed(2))
      }
    }
  }
  assert.ok(checked >= 5000, '检查量应覆盖全表（实际 ' + checked + '）')
  assert.deepEqual(belowThreshold, [], '除登记在册的物理冲突外，不得有任何配对低于 4.5')
  // 物理冲突只允许出现在中调主色的主题上（vercel 的主色 #006AE7 与一批 IP 预设）；
  // 且必须仍在可辨范围（>= 3），并保证普通深度主题一个都不许有 —— 数量比名单更能钉住回归。
  assert.ok(infeasibleRows.length <= 20, '物理冲突只应集中在少数中调主色主题，实际 ' + infeasibleRows.length + ' 行')
  for (const row of infeasibleRows) {
    const ratio = Number(row.split('@')[1])
    assert.ok(ratio >= 3, row + ' 连 3:1 都不到（反白字彻底看不清）')
    assert.ok(row.startsWith('ip:') || row.startsWith('vercel/'), row + ' 只允许出现在中调主色的主题上')
  }
})

test('物理冲突判定：反白字同时压浅填充与中调主色时保持原值，不推成中间灰', () => {
  const values: TokenValues = {
    '--dsw-alias-bg-base': '#0A0A0A',
    '--dsw-alias-label-primary': '#EDEDED',
    '--dsw-alias-label-primary-inverted': '#141414',
    '--dsw-alias-button-contrast-fill': '#EDEDED',
    '--dsw-alias-brand-primary': '#006AE7',
  }
  const result = repairPairContrast(values)
  assert.equal(values['--dsw-alias-label-primary-inverted'], '#141414', '无解时保持主题作者的选择')
  assert.deepEqual(result.changed, [], '无解时一个 token 都不该被改写')
  assert.ok(result.infeasible.includes('--dsw-alias-label-primary-inverted'), '应如实报告该 token 无解')
  assert.ok(result.unresolved.includes(INFEASIBLE_PAIR), '未达标配对应出现在 unresolved 里')
})

test('最小步推离：错误色压在深底上不够时，只把错误色推到刚过 4.5，且不动背景', () => {
  const values: TokenValues = {
    '--dsw-alias-bg-base': '#0E0E0E',
    '--dsw-alias-state-error-primary': '#8B2B2B',
    '--dsw-alias-interactive-bg-hover-danger': 'rgba(139,43,43,0.15)',
  }
  const bgBefore = values['--dsw-alias-bg-base']
  const overlayBefore = values['--dsw-alias-interactive-bg-hover-danger']
  const result = repairPairContrast(values)
  assert.deepEqual(result.changed, ['--dsw-alias-state-error-primary'], '只应移动文字侧')
  assert.equal(values['--dsw-alias-bg-base'], bgBefore, '页面底不该被改')
  assert.equal(values['--dsw-alias-interactive-bg-hover-danger'], overlayBefore, '半透明浮层底不该被压成实色')
  const ratio = pairContrastRatio(values, { fg: '--dsw-alias-state-error-primary', bg: '--dsw-alias-bg-base' })
  assert.ok(ratio !== null && ratio >= PAIR_CONTRAST_MIN, '修完应 >= 4.5，实际 ' + ratio)
  // 最小偏离：1% 一档推到刚过线，落地值必须紧贴阈值（再退一档就不过），且方向是同色相提亮
  const overlay = pairContrastRatio(values, { fg: '--dsw-alias-state-error-primary', bg: '--dsw-alias-interactive-bg-hover-danger' })
  assert.ok(overlay !== null && overlay >= PAIR_CONTRAST_MIN, '压半透明浮层底也应达标，实际 ' + overlay)
  assert.ok(overlay < 4.75, '应停在刚过线的一档（实际 ' + overlay.toFixed(2) + '），推过头就不是「最小偏离」了')
  const hex = (v: string): number[] => [1, 3, 5].map((i) => parseInt(v.slice(i, i + 2), 16))
  const before = hex('#8B2B2B')
  const after = hex(values['--dsw-alias-state-error-primary']!)
  for (let i = 0; i < 3; i++) assert.ok(after[i] >= before[i], '推离方向应是同色相提亮（通道 ' + i + '）')
})

test('幂等：已经在阈值上的表再跑一次不会被改动', () => {
  const values = halfValues(renderTheme('catppuccin-frappe', TYPO).tokens as HalfTokens, 'dark')
  const again = repairPairContrast({ ...values })
  assert.deepEqual(again.changed, [], '复跑不应再有改动')
  assert.deepEqual(again.infeasible, [], 'frappé 不应有无解 token')
})

test('判不了就不改：页面底缺席或半透明（委托画布）时整段跳过', () => {
  const noPage: TokenValues = {
    '--dsw-alias-label-primary': '#1A1A1A',
    '--dsw-alias-bg-layer-1': '#1C1C1C',
  }
  const r1 = repairPairContrast({ ...noPage })
  assert.equal(r1.judged, false, '没有页面底时应如实报告「未判定」')
  assert.deepEqual(r1.changed, [], '没有页面底时不该动任何颜色')
  assert.equal(noPage['--dsw-alias-label-primary'], '#1A1A1A')

  const translucent: TokenValues = {
    '--dsw-alias-bg-base': 'rgba(0,0,0,0.4)',
    '--dsw-alias-label-primary': '#1A1A1A',
    '--dsw-alias-bg-layer-1': '#1C1C1C',
  }
  const r2 = repairPairContrast({ ...translucent })
  assert.equal(r2.judged, false, '半透明页面底同样判不了')
  assert.deepEqual(r2.changed, [], '半透明页面底同样判不了，交还宿主')
})

test('端到端：修复真的进入渲染结果（低对比自定义主题的正文色被推离）', () => {
  // 这层兜底最容易被「接线掉了但测试仍绿」骗过去，所以从一个真实入口渲染一遍：
  // 正文 #5A5A5A 压在 #000000 上只有 2.9 左右，宿主里所有「正文压底色」的规则都会糊。
  const tokens = renderCustomTheme({ id: 'low-contrast', appearance: 'dark', colors: { text: '#5A5A5A', background: '#000000' } }, TYPO).tokens as HalfTokens
  const label = tokens['--dsw-alias-label-primary']
  const page = tokens['--dsw-alias-bg-base']
  assert.ok(label && page, '渲染结果应含 label-primary 与 bg-base')
  for (const half of HALVES) {
    const fg = label![half]
    const bg = page![half]
    assert.ok(fg && bg, half + ' 半边应各有值')
    assert.notEqual(fg!.toUpperCase(), '#5A5A5A', half + ' 半：buildTokens 必须真的调用 repairPairContrast（原值不该原样落地）')
    const ratio = contrastRatio(fg!, bg!)
    assert.ok(ratio >= PAIR_CONTRAST_MIN, half + ' 半正文色修复后应 >= 4.5，实际 ' + ratio.toFixed(2))
  }
})

test('层级不塌：两个不同源的文字色被推离后不得变成同一个值', () => {
  const values: TokenValues = {
    '--dsw-alias-bg-base': '#000000',
    '--dsw-alias-label-primary': '#5A5A5A',
    '--dsw-alias-label-secondary': '#4A4A4A',
    '--dsw-alias-bg-layer-1': '#0A0A0A',
  }
  const result = repairPairContrast(values)
  assert.ok(result.changed.length >= 2, '两者都应被推离，实际 ' + result.changed.join(','))
  assert.notEqual(values['--dsw-alias-label-primary'], values['--dsw-alias-label-secondary'], '正文色与次要色塌成同一个灰 = 层级丢失')
  for (const name of ['--dsw-alias-label-primary', '--dsw-alias-label-secondary']) {
    const ratio = pairContrastRatio(values, { fg: name, bg: '--dsw-alias-bg-base' })
    assert.ok(ratio !== null && ratio >= PAIR_CONTRAST_MIN, name + ' 仍须 >= 4.5，实际 ' + ratio)
  }
})

test('坏值如实报告：5/7 位 hex 与空格斜杠语法进 skipped，不被当成颜色乱修', () => {
  const values: TokenValues = {
    '--dsw-alias-bg-base': '#000000',
    '--dsw-alias-label-primary': '#12345',
    '--dsw-alias-bg-layer-1': '#0A0A0A',
    '--dsw-alias-bg-layer-3': 'rgb(10 10 10 / 15%)',
  }
  const result = repairPairContrast(values)
  assert.equal(result.judged, true, '页面底可读时仍应做出判定')
  assert.deepEqual(result.changed, [], '解析不了的值不该被当颜色推离')
  assert.equal(values['--dsw-alias-label-primary'], '#12345', '坏值应保持原样')
  assert.ok(result.skipped.includes('--dsw-alias-label-primary on --dsw-alias-bg-layer-1'), '5 位 hex 应进 skipped')
  assert.ok(result.skipped.includes('--dsw-alias-label-primary on --dsw-alias-bg-layer-3'), '空格斜杠语法应进 skipped')
})

test('短 hex 当颜色用：#fff 按 6 位展开后参与判定', () => {
  const values: TokenValues = {
    '--dsw-alias-bg-base': '#fff',
    '--dsw-alias-label-primary': '#EEEEEE',
    '--dsw-alias-bg-layer-1': '#FFF',
  }
  const result = repairPairContrast(values)
  assert.equal(result.judged, true)
  assert.deepEqual(result.skipped.filter((id) => id.startsWith('--dsw-alias-label-primary on --dsw-alias-bg-layer-1')), [], '3 位 hex 应能解析')
  assert.ok(result.changed.includes('--dsw-alias-label-primary'), '白底白字必须被推离，实际 ' + result.changed.join(','))
  assert.ok(pairContrastRatio(values, { fg: '--dsw-alias-label-primary', bg: '--dsw-alias-bg-layer-1' })! >= PAIR_CONTRAST_MIN)
})

test('修复侧选择：文字色 vs 面 → 动文字；面当字压文字色 → 动那个状态色；面 vs 面 → 不动', () => {
  assert.equal(preferredRepairSide('--dsw-alias-label-primary', '--dsw-alias-bg-layer-1'), 'fg')
  assert.equal(preferredRepairSide('--dsw-alias-bg-layer-3', '--dsw-alias-state-error-primary'), 'bg')
  assert.equal(preferredRepairSide('--dsw-alias-bg-layer-3', '--dsw-alias-label-primary'), null)
})

test('宿主配对表本身：条目唯一、两侧不相等、每个 token 至少出现在一条配对里', () => {
  const seen = new Set<string>()
  for (const pair of HOST_TEXT_PAIRS) {
    const key = pair.fg + ' on ' + pair.bg
    assert.ok(!seen.has(key), '重复条目: ' + key)
    seen.add(key)
    assert.notEqual(pair.fg, pair.bg, '同一 token 自己压自己没意义: ' + key)
    assert.ok(pair.fg.startsWith('--dsw-alias-') && pair.bg.startsWith('--dsw-alias-'), '条目必须用 DSH 别名: ' + key)
  }
  assert.ok(HOST_TEXT_PAIRS.length >= 50, '配对表应覆盖宿主真实配对（当前 ' + HOST_TEXT_PAIRS.length + ' 条）')
  // 截图事故那两对必须在表里：它们是 inline diff 行底与状态色的配对，顺序改了要能立刻红
  for (const key of ['--dsw-alias-state-success-primary on --dsw-alias-code-diff-added', '--dsw-alias-state-error-primary on --dsw-alias-code-diff-deleted']) {
    assert.ok(seen.has(key), '缺少 inline diff 配对: ' + key)
  }
})

