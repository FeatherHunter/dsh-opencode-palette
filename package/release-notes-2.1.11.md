# v2.1.11 — 页头三入口换成彩色「快捷操作」簇（base 0.1.5）

## 改了什么
- **页头三入口换代**：原来那组自绘的单色 Star/Issue 图标与旧胶囊，换成 base 0.1.5 的「快捷操作」簇——三枚 28×28 独立按钮、间距 4、外面没有容器边框（静默簇，容器只表达归组、不把按钮切段）。三枚图标都是新画的彩色 SVG：联系我们=蓝紫渐变对话气泡、Star=金色渐变星标、提交 Issue=珊瑚粉反馈气泡；悬浮时各自有柔光与轻动效（气泡轻浮 / 星芒闪 / 反馈气泡轻晃），尊重 `prefers-reduced-motion`。键盘聚焦有 2px 蓝环，禁用态去饱和，悬浮文案走 base 的共用 HoverTip（160ms 延迟、同屏一枚、支持 aria-describedby）。
- **底部联系整行删除**：面板底部的 ContactRow（「联系 / Star / Issue」整行入口）移除，只保留页头图标入口；作者插件卡仍在底部。
- **联系弹窗二维码居中修复**：二维码图片此前在卡片里向右溢出 12px（`width:100%` + `padding` 在 content-box 下撑破），现在 `box-sizing:border-box` + `max-width:100%`，三张卡二维码左右留白对称。
- **二维码有效期最后一天文案**：不再出现「该二维码 0 天内（…）有效」，最后一天改为「该二维码今天（M 月 D 日前）有效」。
- **作者插件卡可读全文**：底部「作者的其他插件」每行描述被省略号截断，现在悬浮（或键盘聚焦）整行会用同一个 HoverTip 显示完整介绍。
- **内联 base 客户端**：`package/lib/client.js` 内联的 base 客户端 banner 升到 `v0.1.5`；`package/package.json` 版本随根 `package.json`（2.1.10 → 2.1.11，patch）。
- **随包依赖维持钉版**：`dsh-plugin-update 0.18.38` / `dsh-log 0.3.4` 本次不动（上游现有 0.18.39 / 0.4.1，内联闭包需按新模块清单适配，另立发版处理）。发布工作流里 `check-deps` 以只读读数模式运行并保留输出。

## 验证结果
- `npm run build` exit 0（typecheck → 字体内联 → tsc emit → 零依赖内联 `build-client.ts`），产物内联 base banner = `v0.1.5`。
- `npm test` 全绿（Node 24 本地实跑，见本次发布工作流日志）。
- `npm run verify:artifacts` 八项全过（字体一致 / 两次构建逐字节一致 / 八件齐全非空 / 八件不含 CR / `package/lib` 恰 4 文件 / 八件未被 git 跟踪 / `font-face.ts` 仍被跟踪 / `.gitattributes` 钉 `eol=lf`）。
- `npm pack`（在 `package/` 内）7 files；包内 version = 2.1.11。
- GitHub Actions 发布后回填：npm 可见版本 / dist.shasum / 附件 hash。

## 哈希
（发布后回填）
