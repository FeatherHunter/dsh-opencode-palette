# -*- coding: utf-8 -*-
"""extract.py — 从 6 张 Hello Kitty 参考图做**逐像素精确**取色，产出色库 corpus.json。

规则：只记录图片里真实存在的精确 RGB 值（不量化、不插值），并记录每个值
出现在哪些图、占多少像素、占多大比例。任何后续色位都只能从这个色库里挑，
或者按公开公式把其中两枚像素混合。

源图不入库（需本机存在）：C:\\Users\\辰辰洋洋\\Pictures\\HelloKitty\\
"""
import json
import os
import colorsys
from collections import Counter
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = r"C:\Users\辰辰洋洋\Pictures\HelloKitty"
FILES = [
    "01-hello-kitty-classic-red-bow-art.png",   # 图1 经典海报（白猫/粉墙/红蝴蝶结/奶黄小熊）
    "2.png",                                      # 图2 1974 官方形（红苹果+绿叶/蓝背带裤/奶瓶）
    "3.jpg",                                      # 图3 背带裤造型（深蓝背带裤/黄色围兜/红蝴蝶结）
    "4.jpg",                                      # 图4 绒布玩偶（影棚粉墙/红背带裤/深玫红蝴蝶结）
    "5.jpg",                                      # 图5 手绘线稿（粉蝴蝶结/粉裙/奶油色小熊）
    "6.jpg",                                      # 图6 彩纸碎片（天空青/星星蓝/柠檬黄/粉心）
]
OUT = os.path.join(HERE, "corpus.json")


def hx(r, g, b):
    return "#%02X%02X%02X" % (r, g, b)


def main():
    total_px = 0
    global_counts = Counter()
    per_file = {}
    file_px = {}
    for fn in FILES:
        path = os.path.join(SRC, fn)
        if not os.path.exists(path):
            raise SystemExit("缺少源图：" + path)
        im = Image.open(path).convert("RGB")
        w, h = im.size
        counts = Counter(im.getdata())
        per_file[fn] = counts
        file_px[fn] = w * h
        total_px += w * h
        for rgb, n in counts.items():
            global_counts[rgb] += n

    print("=" * 76)
    print("参考图清单")
    for fn in FILES:
        print("  %-42s %dx%s  %d px  唯一色 %d"
              % (fn, file_px[fn] // 1000, file_px[fn] % 1000, file_px[fn], len(per_file[fn])))
    print("  总像素 %d  全局唯一色 %d" % (total_px, len(global_counts)))

    print("=" * 76)
    print("全局 TOP 24 精确色（按像素占比）")
    for (r, g, b), n in global_counts.most_common(24):
        h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
        where = [fn.split(".")[0] for fn in FILES if (r, g, b) in per_file[fn]]
        print("  %-9s %8d px %6.2f%%  H%3.0f S%3.0f L%3.0f  %s"
              % (hx(r, g, b), n, 100 * n / total_px, h * 360, s * 100, l * 100, ",".join(where)))

    lib = {
        "source": SRC,
        "files": [{"name": fn, "px": file_px[fn], "unique": len(per_file[fn])} for fn in FILES],
        "total_px": total_px,
        "colors": [
            {
                "hex": hx(r, g, b),
                "pixels": n,
                "share": round(100 * n / total_px, 4),
                "h": round(colorsys.rgb_to_hls(r / 255, g / 255, b / 255)[0] * 360, 1),
                "s": round(colorsys.rgb_to_hls(r / 255, g / 255, b / 255)[2] * 100, 1),
                "l": round(colorsys.rgb_to_hls(r / 255, g / 255, b / 255)[1] * 100, 1),
                "files": [fn for fn in FILES if (r, g, b) in per_file[fn]],
            }
            for (r, g, b), n in global_counts.most_common()
        ],
    }
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(lib, f, ensure_ascii=False, indent=1)
    print("=" * 76)
    print("写出 corpus.json：%d 个精确色" % len(lib["colors"]))


if __name__ == "__main__":
    main()
