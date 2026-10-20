# -*- coding: utf-8 -*-
"""② 字面像素台账：每个色位在五张图里定位「完全同值」的像素，裁切并断言
框内命中。只读参考图。→ anchors.json"""
import base64, io, json, os, sys
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cp_core import IMAGES, FILES, PKG, PROV, C, ORDER

# 调色板以 design.py 的产物为准（它做过语料约束搜索）；没有则退回 cp_core 的静态表
_pj = os.path.join(PKG, "palette.json")
if os.path.exists(_pj):
    _d = json.load(open(_pj, encoding="utf-8"))
    C = _d["colors"]
    PROV = {k: (v["rule"], v["anchors"], v["note"]) for k, v in _d["provenance"].items()}

TOL = 6
CROP = 44
_cache = {}
def load(fn):
    if fn not in _cache:
        im = Image.open(os.path.join(IMAGES, fn)).convert("RGB")
        _cache[fn] = (im, np.asarray(im).astype(np.int16))
    return _cache[fn]
def rgb_of(h):
    h = h.lstrip("#")
    return np.array([int(h[i:i+2], 16) for i in (0, 2, 4)], dtype=np.int16)

def pick_literal(hexv):
    """先找完全同值（Δ=0）的像素；找不到才退到 Δ≤6 并打标。"""
    t = rgb_of(hexv)
    for tol, tag in ((0, "exact"), (TOL, "near")):
        best = None
        for fn in FILES:
            im, a = load(fn)
            d = np.abs(a - t).sum(axis=2)
            ys, xs = np.where(d <= tol)
            if len(xs) == 0: continue
            n_exact = int(len(xs))
            for k in range(min(len(xs), 6000)):
                x, y = int(xs[k]), int(ys[k])
                x0, y0 = max(0, x - 3), max(0, y - 3)
                blk = a[y0:y0+7, x0:x0+7].reshape(-1, 3)
                score = int((np.abs(blk - t).sum(axis=1) <= tol).sum())
                cand = (score, n_exact, fn, x, y)
                if best is None or cand[:2] > best[:2]: best = cand
        if best is not None:
            _, n, fn, x, y = best
            return (fn, x, y, n, tag)
    return None

def crop_b64(fn, cx, cy, size=CROP):
    im, _ = load(fn); w, h = im.size
    x0 = max(0, min(w - size, cx - size // 2)); y0 = max(0, min(h - size, cy - size // 2))
    c = im.crop((x0, y0, x0 + size, y0 + size)).resize((52, 52), Image.LANCZOS)
    buf = io.BytesIO(); c.save(buf, "PNG")
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode(), (x0, y0, size)

def verify(fn, box, hexv):
    im, a = load(fn); x0, y0, s = box
    blk = a[y0:y0+s, x0:x0+s].reshape(-1, 3)
    d = np.abs(blk - rgb_of(hexv)).sum(axis=1)
    return int((d == 0).sum()), int((d <= TOL).sum())

rows, fails = [], []
for slot in ORDER:
    rule, anchors, note = PROV[slot]
    srcs = []
    for a in anchors:
        p = pick_literal(a)
        if p is None:
            fails.append((slot, a, "NO-LITERAL-PIXEL")); continue
        fn, x, y, n, tag = p
        b64, box = crop_b64(fn, x, y)
        ex_in, nr_in = verify(fn, box, a)
        if nr_in == 0: fails.append((slot, a, fn + " 裁切框内没有该色"))
        if tag == "exact" and ex_in == 0: fails.append((slot, a, fn + " 裁切框内没有完全同值像素"))
        srcs.append({"anchor": a, "file": fn, "x": x, "y": y, "corpus": n,
                     "tag": tag, "exact_in": ex_in, "near_in": nr_in, "b64": b64})
    rows.append({"slot": slot, "hex": C[slot], "cn": PROV[slot][0], "rule": rule,
                 "note": note, "srcs": srcs})
    print("%-26s %s %-4s %s" % (slot, C[slot], rule,
          "  ".join("%s@%s exact%d" % (s["anchor"], s["file"], s["exact_in"]) for s in srcs)))
json.dump(rows, open(os.path.join(PKG, "anchors.json"), "w", encoding="utf-8"), ensure_ascii=False)
ok = sum(1 for r in rows for s in r["srcs"] if s["exact_in"] > 0)
tot = sum(len(r["srcs"]) for r in rows)
print("\n→ anchors.json　框内含完全同值像素：%d/%d　校验失败：%d" % (ok, tot, len(fails)))
for f in fails: print("   !!", f)
sys.exit(1 if fails else 0)
