// zh-names.mjs — 主题名表（单一来源：中文名 THEME_ZH ＋ 英文官方名 THEME_EN）
// 供运行时面板（中/英界面各取一表）与 assets 生成器（矩阵/故事卡）共用。
// 口径（#60 冻结、#67 落码）：官方名（上游拼写）优先，两表都缺键才退回内部 id（slug 兜底）。
// 无中文译名者保留原名（13）：opencode / One Dark / Monokai / Cursor / GitHub / Vercel＋Solarized / Gruvbox / Ayu / Flexoki（废生造）＋AMOLED / OC 2 / One Dark Pro（缩写·派生）。

export const THEME_ZH = {
  opencode: "opencode", tokyonight: "东京之夜", dracula: "德古拉", gruvbox: "Gruvbox",
  matrix: "黑客帝国", rosepine: "玫瑰松林", catppuccin: "卡布奇诺", "catppuccin-frappe": "卡布奇诺·冰沙",
  "catppuccin-macchiato": "卡布奇诺·玛奇朵", solarized: "Solarized", synthwave84: "合成波 84",
  everforest: "常青森林", nord: "北极", kanagawa: "神奈川", nightowl: "夜猫子",
  "one-dark": "One Dark", monokai: "Monokai", palenight: "苍白之夜", material: "材料设计",
  ayu: "Ayu", carbonfox: "碳狐", cobalt2: "钴蓝", cursor: "Cursor", aura: "光环",
  flexoki: "Flexoki", github: "GitHub", zenburn: "禅燃", mercury: "水星",
  "osaka-jade": "大阪翡翠", vesper: "黄昏星", vercel: "Vercel", "lucent-orng": "透光橙",
  orng: "纯橙", amoled: "AMOLED", "oc-2": "OC 2", onedarkpro: "One Dark Pro",
  shadesofpurple: "紫影", system: "跟随系统",
}

// 英文官方名：与 THEME_ZH 同键集、对仗；上游拼写优先（空格分词/撇号/大小写按官方形态），
// 键集与 THEME_ZH、listThemes() 由 tests/engine.test.mjs 的单源对账 pin 住。
export const THEME_EN = {
  opencode: "opencode", tokyonight: "Tokyo Night", dracula: "Dracula", gruvbox: "Gruvbox",
  matrix: "Matrix", rosepine: "Rosé Pine", catppuccin: "Catppuccin", "catppuccin-frappe": "Catppuccin Frappe",
  "catppuccin-macchiato": "Catppuccin Macchiato", solarized: "Solarized", synthwave84: "SynthWave '84",
  everforest: "Everforest", nord: "Nord", kanagawa: "Kanagawa", nightowl: "Night Owl",
  "one-dark": "One Dark", monokai: "Monokai", palenight: "Palenight", material: "Material",
  ayu: "Ayu", carbonfox: "CarbonFox", cobalt2: "Cobalt2", cursor: "Cursor", aura: "Aura",
  flexoki: "Flexoki", github: "GitHub", zenburn: "Zenburn", mercury: "Mercury",
  "osaka-jade": "Osaka Jade", vesper: "Vesper", vercel: "Vercel", "lucent-orng": "Lucent Orange",
  orng: "Orange", amoled: "AMOLED", "oc-2": "OC 2", onedarkpro: "One Dark Pro",
  shadesofpurple: "Shades of Purple", system: "System",
}

// 搜索索引文本：内部 id ＋ 中文名 ＋ 英文官方名（面板搜索命中任一即算）。
// 单列一处，中英界面共用；#66 的旧中文名别名索引也接这里。
export function themeSearchText(name) {
  return name + ' ' + (THEME_ZH[name] || '') + ' ' + (THEME_EN[name] || '')
}
