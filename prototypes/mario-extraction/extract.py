# -*- coding: utf-8 -*-
"""马里奥主题 · 逐像素取色（证据层）。

读三张参考图，产出 extracted.json（每图主色 + 色相族普查 + 定点裁切实测）。
palette.json 是结论层（本目录 palette.py 的产物），本脚本只负责「证明那些像素真的在图里」。

源图（本机，不入库）：
  C:\\Users\\辰辰洋洋\\Pictures\\超级马里奥\\1.png  NES 标题画面
  C:\\Users\\辰辰洋洋\\Pictures\\超级马里奥\\2.jpg  3D 手办
  C:\\Users\\辰辰洋洋\\Pictures\\超级马里奥\\3.jpg  经典卡通
"""
import colorsys
import io
import json
import os
from collections import Counter

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = r"C:\Users\辰辰洋洋\Pictures\超级马里奥"
FILES = ["1.png", "2.jpg", "3.jpg"]


def hx(rgb):
    return "#%02X%02X%02X" % tuple(int(round(float(c))) for c in rgb[:3])


def load(f):
    return np.asarray(Image.open(os.path.join(SRC, f)).convert("RGB"), dtype=np.int16)


def dominant(f, n=16):
    im = Image.open(os.path.join(SRC, f)).convert("RGB")
    small = im.resize((180, 180), Image.LANCZOS)
    q = small.quantize(colors=n, method=Image.Quantize.MEDIANCUT)
    pal = q.getpalette()
    idx = np.asarray(q, dtype=np.int16).ravel()
    counts = Counter(idx.tolist())
    total = int(idx.size)
    out = []
    for i, c in counts.most_common():
        rgb = tuple(pal[i * 3: i * 3 + 3])
        out.append({"hex": hx(rgb), "rgb": list(rgb), "pct": round(100.0 * c / total, 2)})
    return out, list(im.size)


def family(r, g, b):
    mx, mn = max(r, g, b), min(r, g, b)
    if mx - mn < 22:
        return "white" if mx > 225 else ("black" if mx < 55 else "gray")
    h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
    hd = h * 360
    if hd < 18 or hd >= 345:
        return "red"
    if hd < 45:
        return "orange"
    if hd < 70:
        return "gold"
    if hd < 160:
        return "green"
    if hd < 200:
        return "cyan"
    if hd < 255:
        return "blue"
    if hd < 290:
        return "purple"
    return "pink"


def census(f, topn=6):
    a = load(f).reshape(-1, 3)
    cnt = Counter(map(tuple, a.tolist()))
    buckets = {}
    for (r, g, b), n in cnt.items():
        buckets.setdefault(family(r, g, b), []).append((n, (r, g, b)))
    out = {}
    for k, v in buckets.items():
        v.sort(reverse=True)
        out[k] = [{"hex": hx(c), "rgb": list(c), "n": n} for n, c in v[:topn]]
    return out


def regions(f, spec):
    a = load(f)
    res = {}
    for name, (l, t, r, b) in spec.items():
        crop = a[t:b, l:r].reshape(-1, 3)
        if crop.size == 0:
            continue
        cnt = Counter(map(tuple, crop.tolist()))
        res[name] = {
            "avg": hx(crop.mean(axis=0)),
            "top": [{"hex": hx(c), "n": n, "pct": round(100.0 * n / len(crop), 1)}
                    for c, n in cnt.most_common(5)],
        }
    return res


# 定点裁切坐标（按图逐像素核对过，注释里写清取的是什么）
CROPS = {
    "1.png": {
        "天空背景": (0, 0, 24, 18),
        "标题横幅": (44, 24, 214, 112),
        "标题字面": (52, 28, 200, 106),
        "小马里奥精灵": (68, 124, 90, 146),
        "版权条": (96, 112, 156, 126),
        "HUD 白字": (28, 4, 92, 16),
        "山丘与地面": (0, 160, 256, 224),
        "砖块面": (0, 200, 256, 214),
        "砖块暗面": (0, 214, 256, 224),
        "山丘绿面": (18, 166, 46, 180),
        "灌木绿": (188, 180, 224, 194),
    },
    "2.jpg": {
        "帽红受光": (120, 12, 190, 40),
        "帽红暗面": (205, 58, 248, 88),
        "上衣红": (255, 205, 300, 245),
        "背带蓝受光": (150, 285, 225, 325),
        "背带蓝暗部": (275, 385, 320, 420),
        "金纽扣": (188, 250, 214, 274),
        "鞋棕": (90, 480, 158, 518),
        "鞋棕亮面": (350, 470, 398, 502),
        "肤色": (152, 120, 186, 152),
        "手套白": (28, 200, 78, 248),
        "胡子墨": (172, 176, 214, 194),
        "帽徽白": (96, 26, 128, 58),
    },
    "3.jpg": {
        "帽红受光": (140, 12, 186, 34),
        "帽红暗面": (118, 28, 148, 52),
        "上衣红": (96, 154, 140, 172),
        "背带蓝": (126, 162, 166, 188),
        "手套白": (42, 166, 78, 198),
        "鞋棕": (116, 226, 144, 248),
        "肤色": (162, 62, 194, 84),
        "勾线黑": (96, 100, 106, 112),
        "金纽扣": (130, 148, 144, 162),
    },
}


def main():
    if not os.path.isdir(SRC):
        raise SystemExit("源图目录不在本机：%s（换图必须先放到这里）" % SRC)
    out = {"source": SRC, "files": {}}
    for f in FILES:
        d, size = dominant(f)
        out["files"][f] = {
            "size": size,
            "dominant": d,
            "census": census(f),
            "regions": regions(f, CROPS[f]),
        }
    path = os.path.join(HERE, "extracted.json")
    with io.open(path, "w", encoding="utf-8", newline="\n") as fp:
        fp.write(json.dumps(out, ensure_ascii=False, indent=1))
    print("wrote", path)
    for f in FILES:
        top = out["files"][f]["dominant"][:3]
        print("  %-6s %s" % (f, "  ".join("%s %.1f%%" % (c["hex"], c["pct"]) for c in top)))


if __name__ == "__main__":
    main()
