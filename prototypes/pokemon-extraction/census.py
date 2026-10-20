# -*- coding: utf-8 -*-
"""Build tonal ladders per hue family from EXACT pixel colors, with WCAG luminance."""
import os, json, collections, colorsys
from PIL import Image

SRC = r"C:\Users\辰辰洋洋\Pictures\宝可梦"
OUT = os.path.dirname(os.path.abspath(__file__))


def hx(c):
    return "#%02X%02X%02X" % tuple(c)


def srgb_lin(v):
    v = v / 255.0
    return v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4


def lum(c):
    r, g, b = (srgb_lin(x) for x in c)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast(a, b):
    la, lb = lum(a), lum(b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)


def hue_sat(rgb):
    r, g, b = [v / 255 for v in rgb]
    h, s, v = colorsys.rgb_to_hsv(r, g, b)
    return h * 360, s, v


FAMILIES = {
    "ink / neutral":   (None, None),
    "gold / yellow":   (25, 75),
    "cream / paper":   (25, 75),
}


def classify(rgb):
    h, s, v = hue_sat(rgb)
    r, g, b = rgb
    if s < 0.10:
        return "ink/neutral"
    if 25 <= h <= 75:
        return "gold"
    if 190 <= h <= 250:
        return "blue"
    if 100 <= h <= 175:
        return "green"
    if 10 <= h < 25:
        return "orange/red"
    return "other"


def main():
    grand = collections.Counter()
    for f in sorted(os.listdir(SRC)):
        if not f.lower().endswith((".jpg", ".jpeg", ".png")):
            continue
        im = Image.open(os.path.join(SRC, f)).convert("RGB")
        grand.update(im.getdata())

    buckets = collections.defaultdict(list)
    for c, n in grand.items():
        if n < 12:
            continue
        buckets[classify(c)].append((c, n))

    report = {}
    for fam, items in buckets.items():
        items.sort(key=lambda t: lum(t[0]))
        report[fam] = [{"hex": hx(c), "n": n, "L": round(lum(c), 5),
                        "h": round(hue_sat(c)[0]), "s": round(hue_sat(c)[1], 3)}
                       for c, n in items]
        print(f"\n===== {fam}  ({len(items)} colors, n>=12) =====")
        for c, n in items:
            h, s, v = hue_sat(c)
            print(f'  {hx(c)}  n={n:6d}  L={lum(c):.4f}  H={h:6.1f}  S={s:.2f}  V={v:.2f}')

    with open(os.path.join(OUT, "ladders.json"), "w", encoding="utf-8") as fh:
        json.dump(report, fh, ensure_ascii=False, indent=1)

    # quick contrast of a few anchors
    print("\n===== contrast probes =====")
    pairs = [("#FFFFFF", "#1C1C22"), ("#FFFFFF", "#40404A"), ("#FFFFFF", "#727272"),
             ("#FFFFFF", "#A49E9E"), ("#FFFFFF", "#A0A2AC"), ("#FFFFFF", "#FFCB05"),
             ("#FFFFFF", "#1C1C22"), ("#F8F8F8", "#1C1C22"), ("#F2F2F2", "#1C1C22"),
             ("#1C1C22", "#FFCB05"), ("#1C1C22", "#FEC901"), ("#1C1C22", "#FAE721"),
             ("#1C1C22", "#FEDE00"), ("#0C0C10", "#FFCB05"), ("#0C0C10", "#FDE7B5"),
             ("#FFFFFF", "#145E9D"), ("#FFFFFF", "#4B76E7"), ("#FFFFFF", "#4F7F43"),
             ("#FFFFFF", "#8F161D"), ("#FFFFFF", "#E29C2A"), ("#FFFFFF", "#EE4027")]
    for a, b in pairs:
        ca = tuple(int(a[i:i + 2], 16) for i in (1, 3, 5))
        cb = tuple(int(b[i:i + 2], 16) for i in (1, 3, 5))
        print(f'  {a} / {b} = {contrast(ca, cb):.2f} : 1')


if __name__ == "__main__":
    main()
