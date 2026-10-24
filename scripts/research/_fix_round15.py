# -*- coding: utf-8 -*-
"""第 15 轮建议项（非阻塞）清理：3 处文案。"""
import io
import os

os.chdir(r"D:\dsh-plugin\dsh-opencode-palette")


def rd(p):
    return io.open(p, encoding="utf-8").read()


def wr(p, s):
    io.open(p, "w", encoding="utf-8", newline="\n").write(s)


def rep(p, old, new):
    s = rd(p)
    assert old in s, "NOT FOUND %s: %r" % (p, old[:70])
    wr(p, s.replace(old, new, 1))
    print("patched", p)


# 1) checker 输出文案
rep("scripts/research/palette-check.py",
    "（样本表覆盖 {len(token_refs) - len(missing_tokens)}）",
    "（全量表覆盖 {len(token_refs) - len(missing_tokens)}）")
rep("scripts/research/palette-check.py", "print(f'状态样本          =", "print(f'状态表            =")

# 2) 生成器 docstring
rep("scripts/research/gen_palette_v5.py",
    '"""P5 定稿：把全部底层模块合成为',
    '"""v1.13 定稿：把全部底层模块合成为')
rep("scripts/research/gen_palette_v5.py",
    "  palette/vocabulary.yaml / values.yaml / primitives.yaml / assets.yaml / probes.yaml / anchors.yaml / tokens.yaml",
    "  palette/vocabulary.yaml / values.yaml / primitives.yaml / assets.yaml / probes.yaml / anchors.yaml / tokens.yaml / ownership.yaml")

# 3) SPEC v1.12 changelog 措辞
rep("palette/SPEC.md", "去除 v1 JSON 兼容、`raw_tokens`、legacy 映射层；",
    "格式层去除 v1 JSON 兼容、`raw_tokens`、legacy 映射层（叙述层清除见 v1.13）；")
print("DONE")
