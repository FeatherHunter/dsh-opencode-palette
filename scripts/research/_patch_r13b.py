# -*- coding: utf-8 -*-
import io

REPO = r"D:\dsh-plugin\dsh-opencode-palette"

p = REPO + r"\scripts\research\gen_palette_v5.py"
s = io.open(p, encoding="utf-8").read()
if "src_counts = {}" not in s:
    anchor = "# ---------- 直绑定：425 全量 ----------"
    add = '''# 来源计数（用于 crosswalk 报告，不手写数字）
src_counts = {}
for _c in caps.values():
    _s = _c.get("source", "unknown")
    src_counts[_s] = src_counts.get(_s, 0) + 1

'''
    s = s.replace(anchor, add + anchor, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)

p = REPO + r"\scripts\research\palette-check.py"
s = io.open(p, encoding="utf-8").read()
s = s.replace(
    """    mod_own = {k: v for k, v in own_doc.items() if k in ('merged', 'renamed', 'converted', 'dropped')}
    if pal_own != mod_own:
        errors.append('palette.yaml.ownership 与 ownership.yaml 不一致（合成视图必须零偏差）')""",
    """    mod_own = {k: v for k, v in own_doc.items() if k in ('merged', 'renamed', 'dropped')}
    for k, v in mod_own.items():
        if pal_own.get(k) != v:
            errors.append(f'palette.yaml.ownership.{k} 与 ownership.yaml 不一致（合成视图必须零偏差）')
    if pal_own.get('converted') != sorted((own_doc.get('converted') or {}).keys()):
        errors.append('palette.yaml.ownership.converted 与 ownership.yaml 的键不一致')""")
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("patched")
