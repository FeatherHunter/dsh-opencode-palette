# -*- coding: utf-8 -*-
"""Full exact-pixel color histogram across the four reference images.

Only colors that literally occur as pixels can be used in the palette,
so this is the authoritative supply list.
"""
import os, json, collections
from PIL import Image

SRC = r"C:\Users\辰辰洋洋\Pictures\宝可梦"
OUT = os.path.dirname(os.path.abspath(__file__))


def hx(c):
    return "#%02X%02X%02X" % tuple(c)


def main():
    grand = collections.Counter()
    per_file = {}
    for f in sorted(os.listdir(SRC)):
        if not f.lower().endswith((".jpg", ".jpeg", ".png")):
            continue
        im = Image.open(os.path.join(SRC, f)).convert("RGB")
        cnt = collections.Counter(im.getdata())
        per_file[f] = cnt
        grand.update(cnt)

    out = {
        "per_file": {f: [{"hex": hx(c), "n": n} for c, n in cnt.most_common(400)]
                     for f, cnt in per_file.items()},
        "grand": [{"hex": hx(c), "n": n} for c, n in grand.most_common(900)],
    }
    with open(os.path.join(OUT, "histogram.json"), "w", encoding="utf-8") as fh:
        json.dump(out, fh, ensure_ascii=False)

    print("### distinct colors:", len(grand), " total px:", sum(grand.values()))
    print("### colors with >= 300 px:", sum(1 for c, n in grand.items() if n >= 300))
    print()
    print("== top 160 across all images ==")
    for c, n in grand.most_common(160):
        where = [f[:2] for f, cnt in per_file.items() if c in cnt]
        print(f'  {hx(c)}  {n:7d}  {"/".join(where)}')

    print()
    print("== per-file top 30 ==")
    for f, cnt in per_file.items():
        print(f'-- {f}')
        for c, n in cnt.most_common(30):
            print(f'   {hx(c)} {n:7d}')


if __name__ == "__main__":
    main()
