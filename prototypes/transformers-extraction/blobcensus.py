# -*- coding: utf-8 -*-
"""blobcensus.py — 对每个岗位，列出「在原图上是一块看得见的实色」的候选色。

第一性原理的关键一步：直采不能只满足「hex 恰好等于某个像素」——
JPEG 噪点会制造出一大批一次性像素。真正的判据是
「该颜色在原图上是一块连续可辨的色斑」（49×49 窗口内 L1≤6 的像素数）。
"""
import os, sys, io
from model import ROLES, window_candidates, best_blob, de, TARGET, TOL_ROLE, TOL

for role in ROLES:
    name = role[0]
    cands = window_candidates(role)
    scored = []
    for k in cands:
        b, f = best_blob(k)
        scored.append((b, k, f))
    scored.sort(key=lambda x: -x[0])
    print("%-20s 窗口候选 %4d  →  色斑前 8: %s" % (
        name, len(cands),
        "  ".join("%s(%d,%s)" % (k, b, f) for b, k, f in scored[:8])))
    sys.stdout.flush()
