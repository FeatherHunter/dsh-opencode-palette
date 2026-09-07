opencode 主题资产源自 opencode (MIT) 仓库 packages/tui/src/theme/assets/，tag v1.18.12。
各主题原创归属：
  - aura: Aura Theme (VSCode)
  - ayu: ayu-theme (dempfi)
  - carbonfox: nightfox 系列 (edeneast)
  - catppuccin / catppuccin-frappe / catppuccin-macchiato: Catppuccin 社区 (MIT)
  - cobalt2: Wes Bos Cobalt2
  - cursor: Cursor IDE
  - dracula: Dracula (MIT)
  - everforest: sainnhe/everforest (MIT)
  - flexoki: Steph Ango / kepano (MIT)
  - github: GitHub 官方配色
  - gruvbox: morhetz/gruvbox (MIT)
  - kanagawa: rebelot/kanagawa.nvim (MIT)
  - lucent-orng / orng / mercury / osaka-jade / vesper / matrix / synthwave84 / tokyonight / one-dark / palenight / material / monokai / nightowl / nord / rosepine / solarized / vercel / zenburn: 社区/编辑器主题，随 opencode MIT 分发

随包字体（src/fonts/，fontsource 5.3.0，latin 400/500/700 子集，base64 内联进注入 CSS）：
  - JetBrains Mono（JetBrains，OFL-1.1）
  - Fira Code（tonsky / Nikita Prokopov，OFL-1.1）
  - Cascadia Code（Microsoft，OFL-1.1）
  - Inter（Rasmus Andersson，OFL-1.1；界面风正文栈顶）
  - IBM Plex Mono（IBM，OFL-1.1；opencode 2.0 桌面端等宽栈成员）

opencode 2.0 新增主题（2.0 分支 packages/ui/src/theme/themes/，desktop-theme.json schema，
经 scripts/convert-desktop-themes.mjs 转为本包 TUI 形，派生规则见脚本头注释）：
  - amoled / oc-2 / onedarkpro / shadesofpurple：随 opencode MIT 分发
未随包：SF Mono（Apple 私有许可，仅本地检测）、Consolas（Microsoft 私有，仅本地检测）。
下拉中「随包」恒可用，「本机未装」为回退提示（仍可选中，回退栈不断字）。