# -*- coding: utf-8 -*-
"""solve.py — 变形金刚 37 色位的最终推导（第一性原理版）。

分工：
  · 8 个背景槽 = 5.jpg 夜空的真实像素明度阶（每一阶都可在原图上指认）
  · 25 个设计岗位 = 五张图里真实存在、且「在图上成片存在」的像素
  · 4 个 diff 背景槽 = 两个采样色按固定比例相乘（house 合法类别「混色」）

硬约束（全部编进求解器，不是事后检查）：
  H1 25 岗位两两 ΔE76 ≥ 8（退后梯队那一簇除外），相邻语义对 ≥ 14
  H2 正文类对比度 ≥ 4.5:1、品牌/焦点 ≥ 3:1、语法色对代码底 ≥ 4.5
  H3 每个直采色必须是五图里的真实像素，且邻域人口（ΔRGB 之和 ≤ 6）≥ 24
     （即：在原图上是一块看得见的实色，而不是 JPEG 噪点里碰巧撞上的孤像素）
  H4 同一暖色家族内的岗位色相至少错开 8°，避免「一片橙」
  H5 正文亮度必须高于次级文字（层级不能反）
  H6 注释与运算符必须是 7 个语法色里对比度最低的两个（退后梯队）
"""
import os, sys, io, json, math, random
sys.stdout.reconfigure(encoding="utf-8", line_buffering=True)

from model import (ROLES, QUIET, ADJACENT, TARGET, TOL, TOL_ROLE, POP_MIN, LADDER, SKY_BASE,
                   bg, SURF, POOL, NEAR, ALL, CH, HL, CL, rgb_of, hx, lum, contrast, de,
                   hsl, from_hsl, hue_dist, window_candidates, feasible, alpha_over)  # noqa: E402

random.seed(20261020)
HERE = os.path.dirname(os.path.abspath(__file__))
POP_TARGET = int(os.environ.get("POP_TARGET", "90"))

NAMES = [r[0] for r in ROLES]
PAIRS = [(a, b) for i, a in enumerate(NAMES) for b in NAMES[i + 1:]]
CORE = ["syntaxKeyword", "syntaxFunction", "syntaxType", "syntaxNumber", "syntaxString"]
QUIETROLES = ["syntaxComment", "syntaxOperator"]

POOLS = {}
print("\n候选池（窗口 + 靶心 + 对比度 + 人口 ≥ %d）：" % POP_MIN)
for role in ROLES:
    c = window_candidates(role)
    POOLS[role[0]] = c
    best = max((NEAR[k] for k in c), default=0)
    print("  %-20s 候选 %5d   最高人口 %6d   %s" % (role[0], len(c), best, role[8]))
sys.stdout.flush()

ADJ_MIN = 14.0
ALL_MIN = 8.0


def ctr(role, k):
    """语法色在代码底上的对比度"""
    return contrast(k, bg["codeBlockBg"])


def score(state):
    adj = [de(state[a], state[b]) for a, b in ADJACENT]
    allp = []
    for a, b in PAIRS:
        if a in QUIET and b in QUIET:
            continue
        allp.append(de(state[a], state[b]))
    # 暖色家族内部色相必须错开，避免「一片橙」
    hue_pen = 0.0
    warm = [n for n in NAMES if 0 <= CH[state[n]][0] <= 60 or CH[state[n]][0] >= 340]
    for i, a in enumerate(warm):
        for b in warm[i + 1:]:
            hd = hue_dist(CH[state[a]][0], CH[state[b]][0])
            if hd < 8:
                hue_pen += (8 - hd) * 0.5
    drift = sum(de(state[n], TARGET[n]) for n in TARGET) / len(TARGET)
    # 品牌几何：primary 与 secondary 的色相距离必须落在「近似≤45 / 三角95-145 / 互补>145」
    bd = hue_dist(CH[state["primary"]][0], CH[state["secondary"]][0])
    if 45.0 < bd < 95.0:
        hue_pen += (95.0 - bd) * 2.0
    if CL[state["text"]] <= CL[state["textMuted"]]:
        adj.append(-99.0)
    pops = [NEAR[state[n]] for n in state]
    pop_min = math.log1p(min(pops)) / math.log1p(4000.0)
    pop_avg = sum(math.log1p(p) for p in pops) / (len(pops) * math.log1p(4000.0))
    # 人口欠账：每个岗位离「一块看得见的实色」还差多少像素（线性惩罚）
    pop_debt = sum(max(0.0, POP_TARGET - p) for p in pops)
    # 退后梯队：注释与运算符必须比语法核心最低对比度更暗（仓库判尺硬要求）
    core_c = min(ctr(r, state[r]) for r in CORE)
    retreat = 0.0
    for r in QUIETROLES:
        retreat += max(0.0, ctr(r, state[r]) - core_c) * 4.0
        retreat += max(0.0, 6.0 - de(state["syntaxComment"], state["syntaxOperator"])) * 1.5
    # 全局最小 ΔE 不得低于门槛（硬惩罚）
    viol = max(0.0, ALL_MIN - min(allp)) * 100.0
    # 相邻语义对不许「刚好压线」：低于 14 的每一对都要补回来
    soft = sum(max(0.0, 14.0 - d) * 0.8 + max(0.0, 10.0 - d) * 1.2 for d in adj)
    return (min(adj), sum(adj) / len(adj), min(allp), drift, pop_min, pop_avg,
            hue_pen, retreat, viol, pop_debt, soft)


def value(s, avg, ap, drift, pmin, pavg, hp, rt, viol, debt, soft):
    return (s + 0.04 * avg + 0.40 * ap - 0.35 * drift + 0.60 * pmin + 0.25 * pavg
            - 0.20 * hp - 3.00 * rt - viol - 0.007 * debt - soft)


def solve():
    best = None
    for restart in range(10):
        cur = {}
        for n in NAMES:
            cands = POOLS[n]
            if not cands:
                continue
            cur[n] = random.choice(cands)
        for n in NAMES:
            if n not in cur:
                print("!! 岗位 %s 没有候选，无法求解" % n)
                return None, None
        st = score(cur)
        s, avg, ap, drift, pmin, pavg, hp, rt, viol, debt, soft = st
        T = 6.0
        for it in range(35000):
            n = random.choice(NAMES)
            cands = POOLS[n]
            if len(cands) < 2:
                continue
            old = cur[n]
            new = random.choice(cands)
            if new == old:
                continue
            cur[n] = new
            st2 = score(cur)
            val = value(*st2)
            val0 = value(*st)
            if val >= val0 or random.random() < math.exp((val - val0) / max(T, 0.05)):
                st = st2
            else:
                cur[n] = old
            T = max(0.05, T * 0.99985)
        s, avg, ap, drift, pmin, pavg, hp, rt, viol, debt, soft = st
        cand = (s, ap, avg, -drift, pmin, pavg, -hp, -rt, -viol, -debt, -soft)
        if best is None or cand > best[0]:
            best = (cand, dict(cur))
            print("  restart %d → 相邻 ΔE %.1f / 全局 ΔE %.1f（均值 %.1f，漂移 %.1f，人口最弱 %.2f/均 %.2f，欠账 %.0f px，软罚 %.1f，暖相罚 %.1f，退后罚 %.1f）" %
                  (restart, s, ap, avg, drift, pmin, pavg, debt, soft, hp, rt))
            sys.stdout.flush()
    return best


print("\n退火求解中…")
(cand, state) = solve()
if state is None:
    sys.exit(2)
best_s, best_ap, best_avg, negd, best_pmin, best_pavg, neghp, negrt, negv, negdebt, negsoft = cand
print("\n=== 结果：相邻最小 ΔE76 = %.1f，全局最小 ΔE76 = %.1f（漂移 %.1f，退后罚 %.1f，人口欠账 %.0f px，软罚 %.1f）===" %
      (best_s, best_ap, -negd, -negrt, -negdebt, -negsoft))

pal = dict(bg)
for role in ROLES:
    pal[role[0]] = state[role[0]]

# ── 4 个 diff 背景槽：混色（house 合法类别）──────────────────────────
BASE = bg["background"]
for name, src, alpha in [("diffAddedBg", pal["diffAdded"], 0.12),
                          ("diffRemovedBg", pal["diffRemoved"], 0.12),
                          ("diffAddedLineNumberBg", pal["diffAdded"], 0.20),
                          ("diffRemovedLineNumberBg", pal["diffRemoved"], 0.22)]:
    s = rgb_of(src)
    b = rgb_of(BASE)
    comp = tuple(s[i] * alpha + b[i] * (1 - alpha) for i in range(3))
    pal[name] = hx(comp)

json.dump({"colors": pal}, open(os.path.join(HERE, "_stage1.json"), "w", encoding="utf-8"),
          ensure_ascii=False, indent=1)
print("\n写入 _stage1.json")
for k, v in pal.items():
    n = NEAR.get(v.upper(), 0)
    print("   %-26s %-8s  人口 %6d" % (k, v, n))
