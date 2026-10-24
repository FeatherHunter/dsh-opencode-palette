# -*- coding: utf-8 -*-
"""#148 P8 开工：更新矩阵 + 发第 2 轮讨论评论。"""
import io
import json
import subprocess

ROOT = r"D:\dsh-plugin\dsh-opencode-palette"
GH = r"D:\\0Tools\\GitHubCLI\\gh.exe"
import os

os.chdir(ROOT)


def run(args, check=True):
    p = subprocess.run(args, capture_output=True, text=True, encoding="utf-8")
    if check and p.returncode != 0:
        raise SystemExit(f"FAIL {args[:3]}: {p.stderr[:400]}")
    return p


# 1) 拉 body
out = run([GH, "issue", "view", "148", "--json", "body"])
body = json.loads(out.stdout)["body"]

rowe2_old = "| 第 2 条 | 全量是支持颜色、字体、字号、行间距 | 待决 |"
row2_new = (
    "| 第 2 条 | 全量是支持颜色、字体、字号、行间距 | 🔁 改造后落地 | "
    "颜色轴归 #147（已关闭）；排印三轴在本票裁：字体模型见第 5 条（依 #147 U10）、"
    "字号模型 ❓Q2 待裁、行高模型 ❓Q3 待裁 |"
)
row5_old_start = "| 第 5 条 |"
row6_old_start = "| 第 6 条 |"

lines = body.splitlines()
new_lines = []
for ln in lines:
    if ln.startswith(rowe2_old):
        new_lines.append(row2_new)
    elif ln.startswith(row5_old_start):
        new_lines.append(
            "| 第 5 条 | 文字相关的支持任何可拆分下来的 代码块、正文 等 不同内容的 双语乃至三语多语的 字体、字号 | "
            "🔁 改造后落地 | 依据 #147 U10：字体按**字符脚本**用 `@font-face` + `unicode-range` 混排；"
            "字号/字重不按脚本逐字，只按**内容角色**（差异已记录，见第 2 轮评论）。"
            "剩余待裁：本机字体回退链与 CJK 是否随包（❓Q4） |"
        )
    elif ln.startswith(row6_old_start):
        new_lines.append(
            "| 第 6 条 | 支持设置行间距 | 待决 | 宿主无独立行高轴，行高全是 `calc(基准 + delta)` 跟着字号算（排印文档 §0③/§5）。"
            "下一个能回答的具体问题 = ❓Q3「行高做到哪一层」 |"
        )
    else:
        new_lines.append(ln)

body = "\n".join(new_lines)

progress_anchor = (
    "- 2026-10-20 18:20 第 1 轮评论已发（[#issuecomment-6288727521]"
)
add = (
    "- 2026-10-25 P8 开工（第 2 轮）：已读本票 + #147 裁定记录（U1–U22）+ 排印研究文档 + "
    "当前 palette 排印能力（7 条：font_family×2 / line_height×3 / font_size×2）。"
    "Q1 依 #147 U10 收口（字体按脚本、字号按内容角色）；矩阵第 5 条改 🔁、第 2 条改 🔁、第 6 条待决；"
    "本轮提问 ❓Q2 字号模型（见第 2 轮评论）。\n"
)
body = body.replace(progress_anchor, add + progress_anchor, 1)

io.open(r"D:\Temp\i148_body_p8.md", "w", encoding="utf-8", newline="\n").write(body)
print("body written:", len(body))

# 2) 评论正文
comment = """**P8 开工（wayfinder / grilling · 第 2 轮）**

**已读范围（本会话实际查阅）**
- 本票全文（闭票契约、矩阵、第 1 轮评论、分工声明）、地图 #128、上下文票 #127
- **#147 裁定记录**（已关闭）：U1–U22，重点是 U10 多语言、U7 三级 tier、U12/U13 主题包与纯 YAML、U15 五键
- `docs/research/dsh-source-typography-surface.md` §0–§9（3 字号入口与范围、唯一字号轴、行高非独立轴、4 套字体栈、零 CJK、零 `unicode-range`、终端字号只走 JS、`overrideTokens` 不限颜色）
- 当前 `palette/` 排印能力清点：**7 条** = `global.text.font_family` / `code.block.font_family`（typeface，advanced）+ `code.block.line_height` / `markdown.paragraph.line_height` / `markdown.heading.line_height`（line_height）+ `markdown.paragraph.font_size` / `markdown.heading.font_size`（length）

**复述完成标准**：只裁第 2/5/6 条的排印部分（颜色轴归已关闭的 #147）；产出排印模型（角色表 / 单位与安全范围 / 注入方式 / 风险清单）并写进 `palette/values.yaml`、`palette/palette.yaml`、`palette/SPEC.md`；每条决定带验收判据；矩阵无「待决」；≥3 条增量设计逐条裁定；关票前独立二审 + 你明确说「这票可以关」。

---

### 决定记录 #1：多语语义 = 字体按字符脚本，字号/字重按内容角色

- **原句**：第 5 条「文字相关的支持任何可拆分下来的 代码块、正文 等 不同内容的 双语乃至三语多语的 字体、字号」
- **你要的效果**：同一套界面里，拉丁文字与中文（以及第三脚本）自动各用各的字体；字号差异按内容类型（正文/标题/代码/表格…）而不是按字。
- **相关事实**：宿主不打包任何 CJK 字体（全仓 `@font-face` 只有 Montserrat），中文靠系统族名；`unicode-range` 全仓零使用；locale 只有 `zh`/`en`，`:lang()` 只用在少量界面元素；正文没有逐段语言标记；按脚本分字号只能靠 `@font-face + size-adjust`，属实验项。
- **选项与代价**：#147 已裁 U10——字体按语言用 `@font-face` + `unicode-range`；字号/颜色/字重**只按界面语言或内容角色**，不按单字（CSS 属性作用于元素，不作用于字形）。代价：三类语言以上需列本机/系统字体回退链；CJK 随包体积大，需单独裁定（❓Q4）。
- **用户裁定**：沿用 #147 U10 原话（用户 m02863/m04010 已确认「全量收录、做不到才放弃」）；本票不重开。若你想改这条口径，请在这条评论下纠正。
- **验收判据**：`theme.yaml` 能给「字体」写脚本族（如 `latin` / `han` / `jpan`），加载后同一段落里中英用不同字体；给字号只按内容角色生效，不存在「按字改字号」的能力条目。

---

### ❓Q2：字号模型做多细？

- **锚定原句**：第 2 条「字号」+ 第 5 条「不同内容的 字号」
- **事实底座**：官方只有 3 个字号入口（正文 10–22 默认 14 / 代码 10–16 默认 11 / 终端 10–20 默认 13），字号是唯一轴；14 个 Markdown 角色全部由 `calc(基准 + delta)` 派生（表格是次级档、行内码固定 0.875em 且与代码字号无关）；另有 13 个固定界面档（24/20/16/14/13/12/11px）不吃字号轴。
- **候选**
  - **A（推荐）三主档 + 角色档位**：L2 露出三个主字号（正文/代码/终端，带安全范围）+ 常用角色档（标题/表格/小字/行内码），角色值是「相对主档的档位」而不是任意 px；L3 高级模式可逐角色写 px。
  - **B 每角色独立 px**：14+ 个角色全部直接给 px（最大自由度）。
  - **C 只给三主档**：最简，但第 5 条的「不同内容的字号」落不了地。
- **代价**：A = 要定义 6–8 个档位与安全范围，且 30 个复合 token 是 `calc(size+δ)`，注入通道要先定（写 `--dsh-content-font-size` 会与宿主设置打架）；B = 槽位多、易自相矛盾（标题<正文等），需要额外校验规则；C = 违背第 5 条。
- **推荐**：A。理由：符合宿主现有的「轴 + 派生阶梯」结构，既让用户改得动、又不必逐个角色维护 14 套 px；高级用户仍可在 L3 逐角色写。
- **请裁定**：A / B / C，或说出你想要的字号粒度。

（行高模型 ❓Q3、字体来源与授权 ❓Q4 依次在后续轮次提出，等 Q2 裁定后继续。）
"""
io.open(r"D:\Temp\i148_q2.md", "w", encoding="utf-8", newline="\n").write(comment)
print("comment chars:", len(comment))

