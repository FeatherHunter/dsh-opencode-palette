# -*- coding: utf-8 -*-
"""从三张新世纪福音战士参考图里抽取真实颜色（k-means + 区域统计），供配色设计使用。
只报告图里真实存在的像素颜色，不做任何想象。

产出 extracted.json（本脚本唯一写盘物）：
  · 逐图 / 合计的 k-means 主色簇：hex + 像素数 + 占比 + HSL 色相 + WCAG 相对亮度
  · 高饱和 / 亮部 / 暗部三组独立聚类（与星球大战管线同一口径）
  · 逐色族的像素占比（四套口径 A/B/C/D）与色族内 Top 色

实现口径（只依赖 Pillow + 标准库）：
  · 像素先量化到 5bit/通道（32768 桶）做直方图，桶内保留精确的通道和，
    所以「像素数 / 占比」是精确值，只有「代表色」是簇心（与星球大战同义）。
  · k-means 用 k-means++ 初始化 + 固定种子（SEED=7），迭代顺序与浮点运算
    完全确定 → 连跑两次字节一致。
"""
import json
import os
import random

from PIL import Image

SRC = r"C:\Users\辰辰洋洋\Pictures\新世纪福音战士"
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = HERE

IMG = {
    "1.jpg": "漫画封面（明日香红色插入栓 / 红色二号机 / 金色标题 / 钢蓝冰面）",
    "2.jpg": "机体特写（紫色初号机装甲 / 青绿肩部 / 橙色点缀 / 藏蓝暗部）",
    "3.jpg": "剧场版海报（紫色初号机 + 蓝天白云 + 白蓝红粉插入栓）",
}

# ───────────────────────── k-means 参数（固定 → 结果可复现）─────────────────────────
K_OVERALL = 10          # 整体主色簇数
K_SAT = 8               # 高饱和组簇数
K_BRIGHT = 6            # 亮部簇数
K_DARK = 6              # 暗部簇数
KMAX = 40               # 最大迭代轮数
TOL = 0.6               # 质心位移收敛阈值（RGB 单位）
SEED = 7                # 随机种子（k-means++ 初始化）
POINTS_CAP = 3000       # 参与迭代的桶数上限（按像素数取前 N），其余桶收尾时归到最近簇
HSV_SAT_THR = 0.55      # 高饱和组阈值：HSV 饱和度 (max-min)/max ≥ 0.55
SAT_SPREAD_MIN = 40     # 高饱和组另需通道极差 ≥ 40（滤掉近黑像素的伪高饱和）
BRIGHT_PCT = 97         # 亮部：亮度分位 ≥ 97%
DARK_PCT = 12           # 暗部：亮度分位 ≤ 12%
LUMA_R, LUMA_G, LUMA_B = 0.2126, 0.7152, 0.0722   # 亮度分位用的加权系数

# ───────────────────────── 色族口径 ─────────────────────────
# 判定顺序：① 无彩（通道极差 ≤ 阈值）→ 中性；② 绿感优先 → 绿；
#           ③ 其余按 HSL 色相带归族。
# 无彩阈值用「通道极差」(max-min，8bit 尺度) 而不是 HSL/HSV 饱和度：
# 近白与近黑像素的相对饱和度会失真（例：#FCFEFB 的 HSL 饱和度算出来是 60%），
# 通道极差才是稳的「颜色强度」量。
CHROMA_NEUTRAL = {"A": 15, "B": 25, "C": 40, "D": 15}   # 通道极差 ≤ 该值 → 中性
PRIMARY = "B"                                         # 报告主口径

# HSL 色相带（单位：度）。红色跨 0°，拆成两段；其余首尾相接。
# 分带按 build_palette.py 的 45 个采样锚点反推：每个锚点都落在它该落的族里
# （#E23423 5.4° / #A02639 350.7° → 红；#FCAA00 40.5° / #906244 23.7° → 琥珀；
#   #A4CA3C 76.0° / #709E35 93.7° → 绿；#463C99 246.5° / #BA99F5 261.5° → 紫；
#   #7FA8E4 215.0° / #044196 214.9° → 蓝；#CE95AB 336.8° → 品红）。
HUE_BANDS = (
    ("red", "红", 345.0, 360.0),
    ("red", "红", 0.0, 20.0),
    ("amber", "琥珀/橙", 20.0, 45.0),
    ("yellow", "黄/黄绿", 45.0, 75.0),
    ("green", "绿", 75.0, 165.0),
    ("cyan", "青", 165.0, 195.0),
    ("blue", "蓝", 195.0, 245.0),
    ("violet", "紫", 245.0, 300.0),
    ("magenta", "品红/粉", 300.0, 345.0),
)
FAM_ORDER = ("red", "amber", "yellow", "green", "cyan", "blue", "violet", "magenta", "neutral")
FAM_CN = {"red": "红", "amber": "琥珀/橙", "yellow": "黄/黄绿", "green": "绿", "cyan": "青",
          "blue": "蓝", "violet": "紫", "magenta": "品红/粉", "neutral": "中性"}
FAM_IDX = {k: i for i, k in enumerate(FAM_ORDER)}
NF = len(FAM_ORDER)
NEUTRAL_IDX = FAM_IDX["neutral"]

# 绿感优先规则：暗绿（如 #2B4429 森林绿）彩度低时 HSL 色相会漂到红，
# 所以先用「通道优势」把这类像素拉回绿族。
GREEN_RULE = "绿感优先：g 为最大通道且 g ≥ 1.10·r 且 g ≥ 1.05·b"

VARIANTS = {
    "A": {"name": "宽口径·色相带（无彩阈值 极差≤15）",
          "rule": GREEN_RULE + "；通道极差 ≤ 15 记中性；其余按 HSL 色相带"},
    "B": {"name": "中口径·色相带（无彩阈值 极差≤25）",
          "rule": GREEN_RULE + "；通道极差 ≤ 25 记中性；其余按 HSL 色相带"},
    "C": {"name": "严口径·色相带（无彩阈值 极差≤40）",
          "rule": GREEN_RULE + "；通道极差 ≤ 40 记中性；其余按 HSL 色相带"},
    "D": {"name": "对照口径·通道优势（三族）",
          "rule": "通道极差 ≤ 15 记中性；否则按 RGB 最大通道：r→红 / g→绿 / b→蓝（不分橙黄紫）"},
}

# 设计稿依赖的合并色族（口径 A/B/C 一致；口径 D 不分暖色，暖色并入红族）
DESIGN_FAMILIES = (
    ("red", "红族", ("red",)),
    ("green", "绿族", ("green",)),
    ("blueviolet", "蓝/紫族", ("blue", "violet")),
    ("amber", "琥珀族（琥珀+黄）", ("amber", "yellow")),
    ("neutral", "中性族", ("neutral",)),
)
DESIGN_MAP = {
    "A": {"red": ("red",), "green": ("green",), "blueviolet": ("blue", "violet"),
          "amber": ("amber", "yellow"), "neutral": ("neutral",)},
    "B": {"red": ("red",), "green": ("green",), "blueviolet": ("blue", "violet"),
          "amber": ("amber", "yellow"), "neutral": ("neutral",)},
    "C": {"red": ("red",), "green": ("green",), "blueviolet": ("blue", "violet"),
          "amber": ("amber", "yellow"), "neutral": ("neutral",)},
    # 口径 D 是三族制，暖色不分家 → 琥珀族无对应，留空表示「不适用」
    "D": {"red": ("red",), "green": ("green",), "blueviolet": ("blue",),
          "amber": (), "neutral": ("neutral",)},
}


# ───────────────────────── 颜色数学 ─────────────────────────
def hexof(rgb):
    return "#%02X%02X%02X" % (int(round(rgb[0])), int(round(rgb[1])), int(round(rgb[2])))


def hsl_of(rgb):
    """返回 (h 度, s 0..1, l 0..1)。s 用 HSL 口径，仅作簇的描述量（逐像素判定不用它）。"""
    mx, mn = max(rgb[0], rgb[1], rgb[2]), min(rgb[0], rgb[1], rgb[2])
    d = mx - mn
    if d == 0:
        return 0.0, 0.0, (mx + mn) / 510.0
    l = (mx + mn) / 510.0
    # 1-|2l-1| = (255-|mx+mn-255|)/255，故 s = d / (255-|mx+mn-255|)
    denom = 255 - abs(255 - (mx + mn))
    s = 0.0 if denom == 0 else d / denom
    if mx == rgb[0]:
        hh = ((rgb[1] - rgb[2]) / d) % 6
    elif mx == rgb[1]:
        hh = (rgb[2] - rgb[0]) / d + 2
    else:
        hh = (rgb[0] - rgb[1]) / d + 4
    return hh * 60.0, s, l


def rel_lum(rgb):
    """WCAG 相对亮度（与 build_palette.py 的 lum 同口径）。"""
    v = []
    for c in rgb[:3]:
        c = c / 255.0
        v.append(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4)
    return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]


def band_of(hue):
    """HSL 色相 → 色族键。"""
    for key, _cn, lo, hi in HUE_BANDS:
        if lo <= hue < hi:
            return key
    return "neutral"


# ───────────────────────── 加权 k-means ─────────────────────────
def _dist2(p, c):
    dx, dy, dz = p[0] - c[0], p[1] - c[1], p[2] - c[2]
    return dx * dx + dy * dy + dz * dz


def _assign(points, centers):
    labels = []
    for p in points:
        best, bd = 0, None
        for i, c in enumerate(centers):
            d = _dist2(p, c)
            if bd is None or d < bd:
                bd, best = d, i
        labels.append(best)
    return labels


def kmeans(points, k, iters=KMAX, seed=SEED, tol=TOL):
    """加权 k-means（k-means++ 初始化，固定种子）。
    points: [(x, y, z, w)]，w 是该点的像素权重。返回 (质心列表, 标签列表)。"""
    n = len(points)
    if n == 0:
        return [], []
    if n <= k:
        return [p[:3] for p in points], list(range(n))
    rng = random.Random(seed)

    # k-means++ 初始化：首个质心按权重随机，后续按「权重 × 距离平方」抽样
    centers = [points[rng.randrange(n)][:3]]
    d2 = [p[3] * _dist2(p, centers[0]) for p in points]
    for _ in range(1, k):
        total = sum(d2)
        if total <= 0:
            pick = points[rng.randrange(n)]
        else:
            target = rng.random() * total
            acc = 0.0
            pick = points[-1]
            for p, d in zip(points, d2):
                acc += d
                if acc >= target:
                    pick = p
                    break
        centers.append(pick[:3])
        d2 = [min(d, p[3] * _dist2(p, pick)) for p, d in zip(points, d2)]

    labels = [0] * n
    for _ in range(iters):
        labels = _assign(points, centers)
        new_centers = []
        for i in range(k):
            sx = sy = sz = sw = 0.0
            for p, l in zip(points, labels):
                if l == i:
                    sx += p[0] * p[3]
                    sy += p[1] * p[3]
                    sz += p[2] * p[3]
                    sw += p[3]
            new_centers.append((sx / sw, sy / sw, sz / sw) if sw > 0 else centers[i])
        delta = 0.0
        for a, b in zip(new_centers, centers):
            for x, y in zip(a, b):
                d = abs(x - y)
                if d > delta:
                    delta = d
        centers = new_centers
        if delta < tol:
            break
    return centers, labels


def finalize(points, centers):
    """把全部桶（含未参与迭代的低频桶）归到最近簇，按像素权重汇总簇心。"""
    sums = [[0.0, 0.0, 0.0, 0.0] for _ in centers]
    for p in points:
        best, bd = 0, None
        for i, c in enumerate(centers):
            d = _dist2(p, c)
            if bd is None or d < bd:
                bd, best = d, i
        s = sums[best]
        s[0] += p[0] * p[3]
        s[1] += p[1] * p[3]
        s[2] += p[2] * p[3]
        s[3] += p[3]
    out = []
    for s in sums:
        if s[3] <= 0:
            continue
        out.append((s[0] / s[3], s[1] / s[3], s[2] / s[3], s[3]))
    out.sort(key=lambda t: -t[3])
    return out


def cluster_points(hist):
    """把直方图变成 (桶均值, 权重) 列表；像素少的桶不参与迭代（收尾时再归簇）。"""
    pts = []
    for cell in hist.values():
        cnt, sr, sg, sb = cell[0], cell[1], cell[2], cell[3]
        pts.append((sr / cnt, sg / cnt, sb / cnt, float(cnt)))
    pts.sort(key=lambda t: (-t[3], t[0], t[1], t[2]))
    return pts


def run_clusters(hist, k):
    """完整跑一次聚类：迭代用前 POINTS_CAP 个桶，收尾时用全部桶汇总。
    返回 [(r, g, b, px), ...]，按像素数降序。"""
    pts = cluster_points(hist)
    if not pts:
        return []
    core = pts[:POINTS_CAP] if len(pts) > POINTS_CAP else pts
    centers, _ = kmeans(core, k)
    if not centers:
        return []
    return finalize(pts, centers)


# ───────────────────────── 扫描 ─────────────────────────
def scan(path):
    """第一遍扫描：整体直方图 + 色族计数 + 高饱和直方图 + 亮度直方图。"""
    im = Image.open(path).convert("RGB")
    W, H = im.size
    buf = im.tobytes()
    R, G, B = buf[0::3], buf[1::3], buf[2::3]
    n = len(R)

    thr = CHROMA_NEUTRAL
    t_a, t_b, t_c = thr["A"], thr["B"], thr["C"]
    hist = {}            # 桶 → [像素数, Σr, Σg, Σb, 各色族像素数, 各色族 Σr/Σg/Σb]
    sat_hist = {}        # 桶 → [像素数, Σr, Σg, Σb]
    fam_tot = {v: [0] * NF for v in ("A", "B", "C", "D")}
    luma_hist = [0] * 256

    for r, g, b in zip(R, G, B):
        key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3)
        cell = hist.get(key)
        if cell is None:
            cell = hist[key] = [0, 0, 0, 0, [0] * NF, [0] * NF, [0] * NF, [0] * NF]
        cell[0] += 1
        cell[1] += r
        cell[2] += g
        cell[3] += b

        mx = r if r > g else g
        if b > mx:
            mx = b
        mn = r if r < g else g
        if b < mn:
            mn = b
        spread = mx - mn

        # 判定顺序：① 无彩（通道极差 ≤ 阈值）→ 中性；② 绿感优先 → 绿；③ 色相带
        if spread > t_a:
            if mx == r:
                hh = ((g - b) / spread) % 6
            elif mx == g:
                hh = (b - r) / spread + 2
            else:
                hh = (r - g) / spread + 4
            hue = hh * 60.0
            band = FAM_IDX[band_of(hue)]
            # 绿感优先：暗绿（#2B4429 之类）色相会漂到红，用通道优势拉回绿族
            fa = FAM_IDX["green"] if ((mx == g) and g >= 1.10 * r and g >= 1.05 * b) else band
            fb = NEUTRAL_IDX if spread <= t_b else fa
            fc = NEUTRAL_IDX if spread <= t_c else fa
        else:
            fa = fb = fc = NEUTRAL_IDX
        # 口径 D：通道优势三族
        if spread <= t_a:
            fd = NEUTRAL_IDX
        elif mx == r:
            fd = FAM_IDX["red"]
        elif mx == g:
            fd = FAM_IDX["green"]
        else:
            fd = FAM_IDX["blue"]
        fam_tot["A"][fa] += 1
        fam_tot["B"][fb] += 1
        fam_tot["C"][fc] += 1
        fam_tot["D"][fd] += 1

        cell[4][fb] += 1
        cell[5][fb] += r
        cell[6][fb] += g
        cell[7][fb] += b

        # 高饱和组（HSV 饱和度阈值，与星球大战管线同口径；另需极差下限滤掉近黑伪高饱和）
        if mx > 0 and spread >= SAT_SPREAD_MIN and spread / mx >= HSV_SAT_THR:
            sc = sat_hist.get(key)
            if sc is None:
                sc = sat_hist[key] = [0, 0, 0, 0]
            sc[0] += 1
            sc[1] += r
            sc[2] += g
            sc[3] += b

        luma = LUMA_R * r + LUMA_G * g + LUMA_B * b
        li = int(luma)
        if li > 255:
            li = 255
        luma_hist[li] += 1

    return {"size": [W, H], "px": n, "hist": hist, "sat_hist": sat_hist,
            "fam_tot": fam_tot, "luma_hist": luma_hist}


def percentile_from_hist(luma_hist, pct):
    """按亮度直方图求分位阈值（精确，不受采样影响）。"""
    total = sum(luma_hist)
    if total == 0:
        return 0.0
    target = total * pct / 100.0
    acc = 0
    for i, c in enumerate(luma_hist):
        acc += c
        if acc >= target:
            return float(i)
    return 255.0


def scan_tone(path, thr_bright, thr_dark):
    """第二遍扫描：按亮度阈值收亮部 / 暗部两张直方图。"""
    im = Image.open(path).convert("RGB")
    buf = im.tobytes()
    R, G, B = buf[0::3], buf[1::3], buf[2::3]
    bright, dark = {}, {}
    for r, g, b in zip(R, G, B):
        luma = LUMA_R * r + LUMA_G * g + LUMA_B * b
        key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3)
        if luma >= thr_bright:
            c = bright.get(key)
            if c is None:
                c = bright[key] = [0, 0, 0, 0]
            c[0] += 1
            c[1] += r
            c[2] += g
            c[3] += b
        elif luma <= thr_dark:
            c = dark.get(key)
            if c is None:
                c = dark[key] = [0, 0, 0, 0]
            c[0] += 1
            c[1] += r
            c[2] += g
            c[3] += b
    return bright, dark


# ───────────────────────── 输出整形 ─────────────────────────
def color_records(clusters, area_px):
    """簇 → 颜色记录：hex / rgb / 像素数 / 组内占比 / 面积占比 / HSL / 相对亮度。"""
    group_px = sum(c[3] for c in clusters) or 1
    recs = []
    for (r, g, b, px) in clusters:
        h, s, l = hsl_of((r, g, b))
        recs.append({
            "hex": hexof((r, g, b)),
            "rgb": [int(round(r)), int(round(g)), int(round(b))],
            "px": int(px),
            "share": round(px * 100.0 / group_px, 2),
            "area": round(px * 100.0 / area_px, 2),
            "hue": round(h, 1),
            "sat": round(s * 100, 1),
            "light": round(l * 100, 1),
            "lum": round(rel_lum((r, g, b)), 4),
        })
    return recs


def group_payload(clusters, area_px):
    return {"px": int(sum(c[3] for c in clusters)), "colors": color_records(clusters, area_px)}


def family_payload(fam_tot, area_px):
    """色族 → 像素数 + 面积占比（四套口径）。"""
    out = {}
    for v, counts in fam_tot.items():
        out[v] = {}
        for i, key in enumerate(FAM_ORDER):
            out[v][key] = {"px": int(counts[i]), "area": round(counts[i] * 100.0 / area_px, 2)}
    return out


def family_colors(hist, area_px):
    """色族内的 Top 色（口径 B 的色族归属；颜色为该族像素的精确均值）。"""
    per = {k: [] for k in FAM_ORDER}
    for cell in hist.values():
        for i, fam in enumerate(FAM_ORDER):
            fc = cell[4][i]
            if fc <= 0:
                continue
            per[fam].append((fc, cell[5][i] / fc, cell[6][i] / fc, cell[7][i] / fc))
    out = {}
    for fam, items in per.items():
        items.sort(key=lambda t: (-t[0], t[1], t[2], t[3]))
        total = sum(t[0] for t in items) or 1
        recs = []
        for (fc, r, g, b) in items[:5]:
            h, s, l = hsl_of((r, g, b))
            recs.append({
                "hex": hexof((r, g, b)),
                "rgb": [int(round(r)), int(round(g)), int(round(b))],
                "px": int(fc),
                "share": round(fc * 100.0 / total, 2),
                "area": round(fc * 100.0 / area_px, 2),
                "hue": round(h, 1),
                "sat": round(s * 100, 1),
                "light": round(l * 100, 1),
                "lum": round(rel_lum((r, g, b)), 4),
            })
        out[fam] = recs
    return out


def merge_hist(dst, src):
    """合并两张同桶空间直方图（含色族子计数）。"""
    for key, cell in src.items():
        d = dst.get(key)
        if d is None:
            dst[key] = [cell[0], cell[1], cell[2], cell[3],
                        list(cell[4]), list(cell[5]), list(cell[6]), list(cell[7])]
        else:
            d[0] += cell[0]
            d[1] += cell[1]
            d[2] += cell[2]
            d[3] += cell[3]
            for i in range(NF):
                d[4][i] += cell[4][i]
                d[5][i] += cell[5][i]
                d[6][i] += cell[6][i]
                d[7][i] += cell[7][i]
    return dst


def merge_simple(dst, src):
    """合并只带像素数与通道和的直方图（高饱和 / 亮部 / 暗部）。"""
    for key, cell in src.items():
        d = dst.get(key)
        if d is None:
            dst[key] = list(cell)
        else:
            d[0] += cell[0]
            d[1] += cell[1]
            d[2] += cell[2]
            d[3] += cell[3]
    return dst


def merge_fam_tot(dst, src):
    for v in dst:
        for i in range(NF):
            dst[v][i] += src[v][i]
    return dst


def top_buckets(hist, area_px, n):
    """出现次数最多的若干精确颜色（5bit 桶均值 + 精确像素数）。"""
    items = []
    for cell in hist.values():
        cnt, sr, sg, sb = cell[0], cell[1], cell[2], cell[3]
        items.append((cnt, sr / cnt, sg / cnt, sb / cnt))
    items.sort(key=lambda t: (-t[0], t[1], t[2], t[3]))
    out = []
    for (cnt, r, g, b) in items[:n]:
        h, s, l = hsl_of((r, g, b))
        out.append({
            "hex": hexof((r, g, b)),
            "rgb": [int(round(r)), int(round(g)), int(round(b))],
            "px": int(cnt),
            "area": round(cnt * 100.0 / area_px, 2),
            "hue": round(h, 1),
            "lum": round(rel_lum((r, g, b)), 4),
        })
    return out


# ───────────────────────── 主流程 ─────────────────────────
def analyze(path):
    s = scan(path)
    area_px = s["px"]
    thr_bright = percentile_from_hist(s["luma_hist"], BRIGHT_PCT)
    thr_dark = percentile_from_hist(s["luma_hist"], DARK_PCT)
    bright_hist, dark_hist = scan_tone(path, thr_bright, thr_dark)

    out = {
        "size": s["size"],
        "px": area_px,
        "overall": group_payload(run_clusters(s["hist"], K_OVERALL), area_px),
        "saturated": group_payload(run_clusters(s["sat_hist"], K_SAT), area_px),
        "bright": group_payload(run_clusters(bright_hist, K_BRIGHT), area_px),
        "dark": group_payload(run_clusters(dark_hist, K_DARK), area_px),
        "families": family_payload(s["fam_tot"], area_px),
        "familyColors": family_colors(s["hist"], area_px),
        "tone": {"lumaBrightThr": thr_bright, "lumaDarkThr": thr_dark},
    }
    raw = {"hist": s["hist"], "sat_hist": s["sat_hist"], "bright_hist": bright_hist,
           "dark_hist": dark_hist, "fam_tot": s["fam_tot"]}
    return out, raw


def main():
    images = []
    agg_hist = {}
    agg_sat = {}
    agg_bright = {}
    agg_dark = {}
    agg_fam = {v: [0] * NF for v in ("A", "B", "C", "D")}
    agg_px = 0

    for fn, title in IMG.items():
        path = os.path.join(SRC, fn)
        d, raw = analyze(path)
        d["file"] = fn
        d["title"] = title
        images.append(d)
        merge_hist(agg_hist, raw["hist"])
        merge_simple(agg_sat, raw["sat_hist"])
        merge_simple(agg_bright, raw["bright_hist"])
        merge_simple(agg_dark, raw["dark_hist"])
        merge_fam_tot(agg_fam, raw["fam_tot"])
        agg_px += d["px"]

    aggregate = {
        "px": agg_px,
        "images": len(images),
        "overall": group_payload(run_clusters(agg_hist, K_OVERALL), agg_px),
        "saturated": group_payload(run_clusters(agg_sat, K_SAT), agg_px),
        "bright": group_payload(run_clusters(agg_bright, K_BRIGHT), agg_px),
        "dark": group_payload(run_clusters(agg_dark, K_DARK), agg_px),
        "families": family_payload(agg_fam, agg_px),
        "familyColors": family_colors(agg_hist, agg_px),
        "topBuckets": top_buckets(agg_hist, agg_px, 10),
    }

    payload = {
        "meta": {
            "id": "evangelion",
            "name": "新世纪福音战士",
            "sourceDir": SRC,
            "images": list(IMG.keys()),
            "quantBits": 5,
            "seed": SEED,
            "kmeans": {"overall": K_OVERALL, "saturated": K_SAT, "bright": K_BRIGHT, "dark": K_DARK,
                       "maxIter": KMAX, "tol": TOL, "pointsCap": POINTS_CAP},
            "thresholds": {"hsvSat": HSV_SAT_THR, "satSpreadMin": SAT_SPREAD_MIN,
                           "brightPct": BRIGHT_PCT, "darkPct": DARK_PCT,
                           "lumaWeights": [LUMA_R, LUMA_G, LUMA_B]},
            "primaryVariant": PRIMARY,
            "chromaNeutral": CHROMA_NEUTRAL,
            "variants": VARIANTS,
            "greenRule": GREEN_RULE,
            "hueBands": [{"family": k, "cn": cn, "from": lo, "to": hi} for (k, cn, lo, hi) in HUE_BANDS],
            "familyOrder": list(FAM_ORDER),
            "familyCn": FAM_CN,
            "designFamilies": [{"key": k, "cn": cn, "members": list(m)} for (k, cn, m) in DESIGN_FAMILIES],
            "designFamilyMap": {v: {k: list(m) for k, m in mp.items()} for v, mp in DESIGN_MAP.items()},
        },
        "images": images,
        "aggregate": aggregate,
    }

    with open(os.path.join(OUT, "extracted.json"), "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=1)

    for d in images:
        print("=" * 78)
        print("%s  %s  %sx%s  %d px" % (d["file"], d["title"], d["size"][0], d["size"][1], d["px"]))
        for grp, tag in (("overall", "整体主色"), ("saturated", "高饱和"),
                         ("bright", "亮部"), ("dark", "暗部")):
            print("  -- %s（%d px）" % (tag, d[grp]["px"]))
            for c in d[grp]["colors"]:
                print("     %s  px=%-7d area=%5.2f%%  H%6.1f S%5.1f L%5.1f lum=%.3f" % (
                    c["hex"], c["px"], c["area"], c["hue"], c["sat"], c["light"], c["lum"]))
        print("  -- 色族占比（口径 %s）" % PRIMARY)
        for k, cn, members in DESIGN_FAMILIES:
            px = sum(d["families"][PRIMARY][x]["px"] for x in members)
            area = sum(d["families"][PRIMARY][x]["area"] for x in members)
            print("     %-16s %8d px  %5.2f%%" % (cn, px, area))

    print("=" * 78)
    print("合计 %d px" % aggregate["px"])
    for c in aggregate["overall"]["colors"][:10]:
        print("  %s  px=%-8d area=%5.2f%%  H%6.1f  lum=%.3f" % (
            c["hex"], c["px"], c["area"], c["hue"], c["lum"]))
    print("\nwritten:", os.path.join(OUT, "extracted.json"))


main()
