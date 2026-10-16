// ip-presets.mjs — IP 预置主题第二来源：src/custom-presets/ 20 套（v3 终审版）。
// 双来源口径：内置 38（registry，不动）+ IP 20（只进自定义编辑器「选基底」，不进 themeNames/countStatic）。
// 构建器把 JSON 内联进 bundle（build-client.mjs CUSTOM_PRESETS_DIR），本文件只做字段收敛：
// 每套对外仅 { name: id, appearance, colors }（presetToSeed 同形；name 用 ascii id，保证与内置名不撞、存盘 basePreset 合法）。
import cyberpunk_2077 from '../custom-presets/cyberpunk-2077.json' with { type: 'json' }
import dc_comics from '../custom-presets/dc-comics.json' with { type: 'json' }
import disney from '../custom-presets/disney.json' with { type: 'json' }
import doraemon from '../custom-presets/doraemon.json' with { type: 'json' }
import dragon_ball from '../custom-presets/dragon-ball.json' with { type: 'json' }
import evangelion from '../custom-presets/evangelion.json' with { type: 'json' }
import genshin from '../custom-presets/genshin.json' with { type: 'json' }
import harry_potter from '../custom-presets/harry-potter.json' with { type: 'json' }
import hello_kitty from '../custom-presets/hello-kitty.json' with { type: 'json' }
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

const IP_PRESETS_RAW = {
  'cyberpunk-2077': cyberpunk_2077, 'dc-comics': dc_comics, 'disney': disney,
  'doraemon': doraemon, 'dragon-ball': dragon_ball, 'evangelion': evangelion, 'genshin': genshin,
  'harry-potter': harry_potter, 'hello-kitty': hello_kitty, 'lego': lego,
  'mario': mario, 'marvel': marvel, 'naruto': naruto, 'one-piece': one_piece,
  'pokemon': pokemon, 'sailor-moon': sailor_moon, 'star-wars': star_wars,
  'transformers': transformers, 'ultraman': ultraman, 'zelda': zelda,
}

// 字母序（插入序即字母序；测试用独立 EXPECTED_IDS 反向钉死本表，改一处红一处）。
export const IP_PRESET_IDS = Object.keys(IP_PRESETS_RAW)

function pickPreset(id) {
  const raw = IP_PRESETS_RAW[id]
  if (!raw) return null
  return { name: id, appearance: raw.appearance, colors: raw.colors }
}

export function listIpPresets() {
  return IP_PRESET_IDS.map(pickPreset).filter(Boolean)
}

export function getIpPreset(id) {
  return pickPreset(id)
}

export function countIpPresets() {
  return IP_PRESET_IDS.length
}
