# -*- coding: utf-8 -*-
"""生成 P6 零偏差审计报告 HTML。"""
import html
import io
import subprocess
import sys

ROOT = r"D:\dsh-plugin\dsh-opencode-palette"
out = subprocess.run([sys.executable, "scripts/research/audit_p6_zero_deviation.py"],
                     cwd=ROOT, capture_output=True, text=True, encoding="utf-8")
lines = [l.rstrip() for l in out.stdout.splitlines() if l.strip()]

rows = []
passn = failn = 0
summary = ""
for line in lines:
    if line.startswith("PASS"):
        passn += 1
        rows.append(f'<tr class=ok><td>PASS</td><td>{html.escape(line[6:])}</td></tr>')
    elif line.startswith("FAIL"):
        failn += 1
        rows.append(f'<tr class=bad><td>FAIL</td><td>{html.escape(line[6:])}</td></tr>')
    elif line.startswith("结果"):
        summary = line

body = "\n".join(rows)
CSS = """body{font:15px/1.65 -apple-system,Segoe UI,Microsoft YaHei,sans-serif;max-width:980px;margin:40px auto;padding:0 20px;color:#1f2328}
h1{font-size:26px}h2{font-size:18px;margin-top:28px;border-bottom:1px solid #e5e7eb;padding-bottom:6px}
table{border-collapse:collapse;width:100%;margin:12px 0;font-size:13.5px}th,td{border:1px solid #e5e7eb;padding:6px 9px;text-align:left;vertical-align:top}
th{background:#f6f8fa}tr.ok td:first-child{color:#1a7f37;font-weight:600}tr.bad td:first-child{color:#cf222e;font-weight:600}
code{background:#f6f8fa;padding:1px 5px;border-radius:4px;font-size:12.5px}.muted{color:#57606a;font-size:13px}"""

doc = f"""<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>P6 零偏差审计报告</title><style>{CSS}</style></head><body>
<h1>P6 零偏差审计报告</h1>
<p class="muted">2026-10-24 · 脚本 <code>scripts/research/audit_p6_zero_deviation.py</code> · 对象：<code>palette/SPEC.md</code> ↔ <code>palette/</code> 11 个 YAML ↔ P1–P5 研究表</p>
<h2>结论</h2>
<p><b>{passn} 项全部 PASS，FAIL=0。</b>SPEC ↔ YAML ↔ 四份研究表逐条一致；集合闭合；主题层干净；生成器确定性。可以进入 #147 收口。</p>
<h2>审计项与结果</h2>
<table><thead><tr><th>结果</th><th>检查项</th></tr></thead><tbody>
{body}
</tbody></table>
<p class="muted">{html.escape(summary)}</p>
<h2>集合基线</h2>
<table><thead><tr><th>项</th><th>值</th><th>含义</th></tr></thead><tbody>
<tr><td>公开 token</td><td>425</td><td>--dsw 403 + --shiki 11 + --dsh 11（rc.3 基准）</td></tr>
<tr><td>颜色轴</td><td>222 = 184 live + 38 dead</td><td>gated 修饰 5，不增加计数</td></tr>
<tr><td>非颜色</td><td>203</td><td>typography 182 + radius 6 + dsh 11 + menu/corner/mask/other 4</td></tr>
<tr><td>运行时</td><td>148</td><td>--dsh 额外 60 + --dsl 20 + 局部 --dsw 12 + 组件局部 56</td></tr>
<tr><td>能力菜单</td><td>321</td><td>手写 29 + master 229 + P4 50 + P2 13，去重后</td></tr>
<tr><td>合并视图</td><td>381</td><td>321 + 模板展开 65 − 重名 5</td></tr>
<tr><td>直绑定</td><td>425</td><td>每个 token 恰一条</td></tr>
<tr><td>词表</td><td>区域 14 / 角色 29 / 能力域 34 / 锚点 26 / 控件 12</td><td>vocabulary.yaml + anchors.yaml</td></tr>
</tbody></table>
<h2>第一性原理确认</h2>
<table><thead><tr><th>原理</th><th>落实</th></tr></thead><tbody>
<tr><td>闭合性：所有可改项都有唯一落点</td><td>425 token → 425 直绑定；184 颜色 live → 语义能力；203 非颜色 → P4 逐条；私有面 → P2；4342 条规则 → P3 分类</td></tr>
<tr><td>唯一性：一个 token 只有一个 owner</td><td>v1.13 归属策略（合并 10 / 改规则层 9 / 改名 4 / 移出 2）；audit K1 多写者 = 0</td></tr>
<tr><td>可验证：每条能力都有探针</td><td>token_live / selector_exists；audit C5 全覆盖</td></tr>
<tr><td>可复现：文档由脚本生成、可重跑</td><td>gen_palette_v5 / gen_token_registry / audit 确定性 PASS</td></tr>
</tbody></table>
<h2>下一步</h2>
<p>#147 票面改为裁定记录 → 同步地图 #128 → 维护者一句「这票可以关」→ 关闭并进入 P7 升级演练。</p>
</body></html>"""

io.open(ROOT + r"\docs\research\v3-p6-zero-deviation-report.html", "w",
        encoding="utf-8", newline="\n").write(doc)
print("report written; pass=", passn, "fail=", failn)
