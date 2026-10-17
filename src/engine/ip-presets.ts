// ip-presets.ts — IP 预置主题第二来源：src/custom-presets/ 21 套（含库洛米）。
// 双来源口径：内置 38（registry，不动）+ IP 21（编辑器「选基底」+ 外层自定义区胶囊，不进 themeNames/countStatic）。
// 构建器把 JSON 内联进 bundle（build-client.ts CUSTOM_PRESETS_DIR），本文件只做字段收敛：
// 每套对外 { name: id, title, appearance, colors }（presetToSeed 取 name/appearance/colors 同形；
// name 用 ascii id，保证与内置名不撞、存盘 basePreset 合法；title 是中文展示名，外层胶囊按语言选用）。
import cyberpunk_2077 from '../custom-presets/cyberpunk-2077.json' with { type: 'json' }
import dc_comics from '../custom-presets/dc-comics.json' with { type: 'json' }
import disney from '../custom-presets/disney.json' with { type: 'json' }
import doraemon from '../custom-presets/doraemon.json' with { type: 'json' }
import dragon_ball from '../custom-presets/dragon-ball.json' with { type: 'json' }
import evangelion from '../custom-presets/evangelion.json' with { type: 'json' }
import genshin from '../custom-presets/genshin.json' with { type: 'json' }
import harry_potter from '../custom-presets/harry-potter.json' with { type: 'json' }
import hello_kitty from '../custom-presets/hello-kitty.json' with { type: 'json' }
import kuromi from '../custom-presets/kuromi.json' with { type: 'json' }
import lego from '../custom-presets/lego.json' with { type: 'json' }
import mario from '../custom-presets/mario.json' with { type: 'json' }
import marvel from '../custom-presets/marvel.json' with { type: 'json' }
import naruto from '../custom-presets/naruto.json' with { type: 'json' }
import one_piece from '../custom-presets/one-piece.json' with { type: 'json' }
import pokemon from '../custom-presets/pokemon.json' with { type: 'json' }
import sailor_moon from '../custom-presets/sailor-moon.json' with { type: 'json' }
import star_wars from '../custom-presets/star-wars.json' with { type: 'json' }
import transformers from '../custom-presets/transformers.json' with { type: 'json' }
import ultraman from '../custom-presets/ultraman.json' with { type: 'json' }
import zelda from '../custom-presets/zelda.json' with { type: 'json' }

// 21 套 JSON 同形：name 是中文展示名、appearance 为 dark/light、colors 为 37 色 hex 表
interface IpPresetRaw {
  name: string
  appearance: string
  colors: Record<string, string>
}

const IP_PRESETS_RAW: Record<string, IpPresetRaw> = {
  'cyberpunk-2077': cyberpunk_2077, 'dc-comics': dc_comics, 'disney': disney,
  'doraemon': doraemon, 'dragon-ball': dragon_ball, 'evangelion': evangelion, 'genshin': genshin,
  'harry-potter': harry_potter, 'hello-kitty': hello_kitty, 'kuromi': kuromi, 'lego': lego,
  'mario': mario, 'marvel': marvel, 'naruto': naruto, 'one-piece': one_piece,
  'pokemon': pokemon, 'sailor-moon': sailor_moon, 'star-wars': star_wars,
  'transformers': transformers, 'ultraman': ultraman, 'zelda': zelda,
}

// 对外种子：name 用 ascii id（查找键），中文展示名收进 title
interface IpPresetSeed {
  name: string
  title: string
  appearance: string
  colors: Record<string, string>
}

// 字母序（插入序即字母序；测试用独立 EXPECTED_IDS 反向钉死本表，改一处红一处）。
export const IP_PRESET_IDS: string[] = Object.keys(IP_PRESETS_RAW)

function pickPreset(id: string): IpPresetSeed | null {
  const raw = IP_PRESETS_RAW[id]
  if (!raw) return null
  // 注意字段翻转：JSON 的 name 是中文展示名，对外 name 是 ascii id（查找键），中文名收进 title。
  const title = typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim() : id
  return { name: id, title: title, appearance: raw.appearance, colors: raw.colors }
}

export function listIpPresets(): IpPresetSeed[] {
  return IP_PRESET_IDS.map(pickPreset).filter((p): p is IpPresetSeed => p !== null)
}

export function getIpPreset(id: string): IpPresetSeed | null {
  return pickPreset(id)
}

export function countIpPresets(): number {
  return IP_PRESET_IDS.length
}
