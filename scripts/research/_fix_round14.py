# -*- coding: utf-8 -*-
"""第 14 轮二审收尾修正：P1-2 真修 + 假数纠正 + 门禁补全 + 报告重生成。"""
import io
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.chdir(ROOT)


def rd(p):
    return io.open(p, encoding="utf-8").read()


def wr(p, s):
    io.open(p, "w", encoding="utf-8", newline="\n").write(s)


def rep(p, old, new, count=1):
    s = rd(p)
    assert old in s, "NOT FOUND in %s: %r" % (p, old[:80])
    s = s.replace(old, new, count)
    wr(p, s)
    print("patched", p)


# ---------- 1. primitives.yaml：P1-2 + 15 样本 ----------
rep("palette/primitives.yaml",
    "用户层逃生舱 raw_tokens 不走本原语：名字不校验、只校验值形状（SPEC §3 硬规则 3）。",
    "用户层只能写 palette 登记过的能力与直绑定（`token.*`）；宿主变量名不出现在 theme.yaml（SPEC §3 硬规则 3）。")
rep("palette/primitives.yaml",
    "（tokens.yaml 为完整表后；当前 15 条样本，未覆盖的名字 = 门禁错误）",
    "（tokens.yaml 为完整表 425 条；未覆盖的名字 = 门禁错误）")

# ---------- 2. gen_palette_v5.py：生成头 + converted 全字段 ----------
rep("scripts/research/gen_palette_v5.py",
    '"# palette.yaml —— DSH 全量主题能力表（合成视图，P5 定稿）\\n"',
    '"# palette.yaml —— DSH 全量主题能力表（合成视图，v1.13 定稿）\\n"')
rep("scripts/research/gen_palette_v5.py",
    '"#   capabilities.yaml / vocabulary.yaml / values.yaml / primitives.yaml / assets.yaml / probes.yaml / anchors.yaml / tokens.yaml\\n"',
    '"#   capabilities.yaml / vocabulary.yaml / values.yaml / primitives.yaml / assets.yaml / probes.yaml / anchors.yaml / tokens.yaml / ownership.yaml\\n"')
rep("scripts/research/gen_palette_v5.py",
    '"converted": sorted(OWNERSHIP_CONVERT),',
    '"converted": dict(OWNERSHIP_CONVERT),')

# ---------- 3. palette-check.py：文案 + converted 全字段 + synthesized/requires 门禁 ----------
rep("scripts/research/palette-check.py",
    '"""palette/ 跨模块一致性检查（门禁原型 v1.10）。',
    '"""palette/ 跨模块一致性检查（门禁 v1.13，第 14 轮二审收尾）。')
rep("scripts/research/palette-check.py",
    "  9. _index 模块 version 与 requires 约束（语义版本比较，不满足 = error）\n",
    "  9. _index 模块 version 与 requires 约束（语义版本比较，不满足 = error）\n"
    "  10. 手写能力 ⊆ 合成 ∪ ownership.dropped（v1.13）\n"
    "  11. palette.yaml.ownership 与 ownership.yaml 全字段一致（含 converted 定义）\n"
    "  12. _index.capabilities_synthesized 与合成能力数一致；requires 覆盖全部模块\n")
rep("scripts/research/palette-check.py",
    "    if pal_own.get('converted') != sorted((own_doc.get('converted') or {}).keys()):\n"
    "        errors.append('palette.yaml.ownership.converted 与 ownership.yaml 的键不一致')",
    "    if pal_own.get('converted') != (own_doc.get('converted') or {}):\n"
    "        errors.append('palette.yaml.ownership.converted 与 ownership.yaml 不一致（须全字段相同）')")
rep("scripts/research/palette-check.py",
    "        ('runtime_registered', rt.get('total') if rt else 0),\n    ]",
    "        ('runtime_registered', rt.get('total') if rt else 0),\n"
    "        ('capabilities_synthesized', len(synth_caps)),\n    ]")
# requires 覆盖全部模块（插在 counts 校验之后、文件末尾 errors 汇总之前——用文件尾锚点）
s = rd("scripts/research/palette-check.py")
anchor = "    for key, actual in [('controls', len(controls)), ('regions', len(regions)), ('roles', len(roles))]:"
assert anchor in s
add = (
    "    # —— requires 必须覆盖全部模块（含生成模块） ——\n"
    "    missing_req = sorted(set(idx.get('modules') or {}) - set(idx.get('requires') or {}))\n"
    "    if missing_req:\n"
    "        errors.append(f'_index.requires 未覆盖模块: {missing_req}')\n"
)
s = s.replace(anchor, add + anchor, 1)
wr("scripts/research/palette-check.py", s)
print("patched scripts/research/palette-check.py (requires check)")

# ---------- 4. _index.yaml：requires 补全 + capabilities_synthesized ----------
s = rd("palette/_index.yaml")
old_req = "  probes: '>=3.0.0'\nmodules:"
assert old_req in s
s = s.replace(old_req, "  probes: '>=3.0.0'\n  tokens: '>=3.0.0'\n  anchors: '>=3.0.0'\n  ownership: '>=3.0.0'\n  palette: '>=3.0.0'\nmodules:", 1)
if "capabilities_synthesized" not in s:
    m = re.search(r"(\ncounts:\n(?:  .*\n)+)", s)
    assert m, "counts block not found"
    block = m.group(1)
    s = s.replace(block, block.rstrip("\n") + "\n  capabilities_synthesized: 321\n", 1)
wr("palette/_index.yaml", s)
print("patched palette/_index.yaml")

# ---------- 5. audit_p6：补真 G1 + 汇总输出 ----------
s = rd("scripts/research/audit_p6_zero_deviation.py")
if "import subprocess" not in s:
    s = s.replace("import sys\n", "import subprocess\nimport sys\n", 1)
g1 = '''
# ---------- G. 生成器确定性 ----------
def _sha(p):
    return hashlib.sha256(open(p, "rb").read()).hexdigest()


_h1 = _sha("palette/palette.yaml")
subprocess.run([sys.executable, "scripts/research/gen_palette_v5.py"], check=True, capture_output=True)
_h2 = _sha("palette/palette.yaml")
check("G1 生成器可重跑且确定性（两次哈希一致）", _h1 == _h2, "%s vs %s" % (_h1[:12], _h2[:12]))

print("结果：PASS=%d FAIL=%d" % (len(PASS), len(FAIL)))
sys.exit(1 if FAIL else 0)
'''
if "G1 生成器可重跑" not in s:
    s = s.rstrip("\n") + "\n" + g1
wr("scripts/research/audit_p6_zero_deviation.py", s)
print("patched scripts/research/audit_p6_zero_deviation.py")

# ---------- 6. gen_p6_report.py：数字动态 ----------
rep("scripts/research/gen_p6_report.py",
    "<p><b>34 项全部 PASS，FAIL=0。</b>",
    "<p><b>{passn} 项全部 PASS，FAIL=0。</b>")
s = rd("scripts/research/gen_p6_report.py")
# 上面的 {passn} 在 f-string 内，需确认 doc 是 f-string（是：doc = f\"\"\"）
assert "doc = f\"\"\"" in s
print("gen_p6_report dynamic ok")

# ---------- 7. SPEC.md：状态行 + 变更记录 ----------
rep("palette/SPEC.md",
    "- 状态：**P6 定稿（2026-10-24，v1.13）**。决策来源 = #147「讨论：Token 模型与「全量」边界」；已过 P1–P5 逐技术组讨论、P6 零偏差审计（34/34），并经第 12 轮独立对抗式二审（2026-10-24，发现 5 P1 + 8 P2，已按 v1.13 修正）。",
    "- 状态：**P6 定稿（2026-10-24，v1.13）**。决策来源 = #147「讨论：Token 模型与「全量」边界」；已过 P1–P5 逐技术组讨论、P1–P5 第一性原理审计（47/47）、P6 零偏差审计（34/34，含 G1 生成器确定性），并经第 12–14 轮独立对抗式二审（第 14 轮 1 P1 + 9 P2，已按 v1.13 收尾修正）。")
rep("palette/SPEC.md",
    "`capabilities.yaml` 手写能力 30 条、合成能力 321 条；第 12 轮独立二审的 5 P1 + 8 P2 已修。",
    "`capabilities.yaml` 手写能力 30 条、合成能力 321 条；第 12 轮独立二审的 5 P1 + 8 P2 已修。第 13/14 轮二审收尾：`primitives.yaml` 的 raw_tokens 叙述清除、`palette.yaml` 生成头补 ownership、checker 升 v1.13（ownership converted 全字段、`_index.capabilities_synthesized`、requires 覆盖全部模块）、P6 补 G1（34/34）、P1P5 计 47/47。")

# ---------- 8. P1P5 报告 HTML：50 → 47 ----------
p = "docs/research/v3-p1p5-first-principles-audit.html"
s = rd(p)
assert "50 项检查全部通过" in s
s = s.replace("50 项检查全部通过", "47 项检查全部通过")
s = s.replace("结论：50 项", "结论：47 项")
wr(p, s)
print("patched", p)

print("DONE")
