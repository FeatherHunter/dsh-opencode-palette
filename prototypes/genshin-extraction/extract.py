# -*- coding: utf-8 -*-
"""为每个真源锚点生成图片实证裁切（base64 内联到 preview.html）。"""
import os, json, base64, io
from PIL import Image
import numpy as np

SRC = os.environ.get("GENSHIN_SRC", r"C:\Users\辰辰洋洋\Pictures\原神")
OUT = os.path.dirname(os.path.abspath(__file__))

ANCHORS = [
 ("sand",      "1.jpg", "#D5BF9D", "官方主视觉·暖砂底",   16.6),
 ("sandLite",  "1.jpg", "#E6D0AD", "官方主视觉·浅砂",       2.9),
 ("paper",     "1.jpg", "#F3E3C6", "官方主视觉·米金纸",     3.0),
 ("gold",      "1.jpg", "#DAB078", "官方主视觉·烫金",       2.4),
 ("warmBrown", "1.jpg", "#8D7661", "官方主视觉·暖褐",       2.2),
 ("umber",     "1.jpg", "#6C5045", "官方主视觉·赭褐",       2.7),
 ("ink",       "1.jpg", "#432E27", "官方主视觉·深褐墨",     2.4),
 ("sky1",      "1.jpg", "#A0B9CA", "官方主视觉·天青",       2.5),
 ("indigo",    "2.jpg", "#312D53", "派蒙·靛蓝",             3.8),
 ("plum",      "2.jpg", "#2E1E29", "派蒙·墨紫",             2.1),
 ("starBlue",  "2.jpg", "#7B85BE", "派蒙·星蓝",             1.1),
 ("taupe",     "2.jpg", "#876D67", "派蒙·灰褐",             2.5),
 ("cream2",    "2.jpg", "#F5E4CE", "派蒙·奶金",             4.9),
 ("scarlet",   "3.jpg", "#B83E25", "可莉·亮红",             2.5),
 ("scarletD",  "3.jpg", "#972B17", "可莉·猩红",             4.8),
 ("blush",     "3.jpg", "#F4DACB", "可莉·奶油粉",           9.6),
 ("rose",      "3.jpg", "#E6C3B2", "可莉·柔粉",             6.4),
 ("cocoa",     "3.jpg", "#471F13", "可莉·深褐",             5.2),
 ("orange",    "3.jpg", "#E49C75", "可莉·橘调",             2.6),
 ("teal",      "4.jpg", "#528374", "温迪·青绿",             3.1),
 ("tealDark",  "4.jpg", "#3E4541", "温迪·暗青灰",           7.3),
 ("skyPale",   "4.jpg", "#CCEDEB", "温迪·天青",            34.8),
 ("inkCool",   "4.jpg", "#2D2C28", "温迪·墨黑",             9.9),
 ("stone",     "4.jpg", "#A89C82", "温迪·岩灰",             7.9),
 ("cream",     "4.jpg", "#E6DCC2", "温迪·奶白",            13.3),
 ("olive",     "4.jpg", "#66644D", "温迪·橄榄",             4.2),
 ("sky2",      "5.jpg", "#B0CCDF", "旅行者·天青披风",       8.2),
 ("mistBlue",  "5.jpg", "#8DAEC4", "旅行者·雾蓝",           4.1),
 ("deepIndigo","5.jpg", "#2A3C6C", "旅行者·深靛",           0.9),
 ("gold2",     "5.jpg", "#C9A77B", "旅行者·金",             4.0),
 ("warmWhite", "5.jpg", "#EEDCBE", "旅行者·暖白",           3.8),
 ("char",      "5.jpg", "#382726", "旅行者·焦褐",           3.6),
 ("chestnut",  "5.jpg", "#513A36", "旅行者·栗褐",           2.9),
 ("ochre",     "5.jpg", "#74564B", "旅行者·赭褐",           2.1),
 ("white",     "5.jpg", "#F6F5F4", "旅行者·白纸场",        60.6),
]

def h2r(h):
    h = h.lstrip('#'); return np.array([int(h[0:2],16), int(h[2:4],16), int(h[4:6],16)])

def densest(mask, w, h):
    H, W = mask.shape
    ii = np.zeros((H+1, W+1), dtype=np.int32)
    ii[1:,1:] = np.cumsum(np.cumsum(mask.astype(np.int32), axis=0), axis=1)
    ys = np.arange(0, max(1, H-h+1)); xs = np.arange(0, max(1, W-w+1))
    sub = (ii[np.ix_(ys+1, xs+1)] - ii[np.ix_(ys, xs+1)]
           - ii[np.ix_(ys+1, xs)] + ii[np.ix_(ys, xs)])
    iy, ix = np.unravel_index(int(sub.argmax()), sub.shape)
    return int(ys[iy]), int(xs[ix])

def b64(img, fmt="WEBP", q=72):
    b = io.BytesIO()
    img.save(b, format=fmt, quality=q)
    return "data:image/%s;base64,%s" % ("webp" if fmt=="WEBP" else fmt.lower(),
                                        base64.b64encode(b.getvalue()).decode())

def main():
    cache, out = {}, []
    for key, fn, hexv, label, cov in ANCHORS:
        if fn not in cache:
            cache[fn] = Image.open(os.path.join(SRC, fn)).convert("RGB")
        im = cache[fn]
        W, H = im.size
        arr = np.asarray(im).astype(np.int32)
        t = h2r(hexv)
        d = np.sqrt(((arr - t) ** 2).sum(axis=2))
        mask = d < 30
        if mask.sum() < 20:
            mask = d < 50
        win = max(15, (int(min(W, H) * 0.11) | 1))
        y, x = densest(mask, win, win)
        x0, x1 = max(0, x - win // 2), min(W, x + win // 2 + 1)
        y0, y1 = max(0, y - win // 2), min(H, y + win // 2 + 1)
        crop = im.crop((x0, y0, x1, y1)).resize((120, 120), Image.LANCZOS)
        # 实测色：裁切内与目标最接近的像素均值
        sub = arr[y0:y1, x0:x1].reshape(-1, 3)
        dm = np.sqrt(((sub - t) ** 2).sum(axis=1)) < 30
        measured = "#%02X%02X%02X" % tuple(int(v) for v in sub[dm].mean(axis=0)) if dm.sum() >= 4 else hexv
        out.append({"key": key, "file": fn, "hex": hexv, "measured": measured,
                    "label": label, "coverage": cov,
                    "box": [int(x0), int(y0), int(x1), int(y1)],
                    "center": [int(x + win // 2), int(y + win // 2)],
                    "crop": b64(crop)})
        print("%-12s %-6s %-8s measured=%s  box=%s" % (key, fn, hexv, measured, [x0, y0, x1, y1]))

    # 5 张整图缩略
    thumbs = []
    for fn in ["1.jpg", "2.jpg", "3.jpg", "4.jpg", "5.jpg"]:
        im = Image.open(os.path.join(SRC, fn)).convert("RGB")
        im.thumbnail((190, 190), Image.LANCZOS)
        thumbs.append({"file": fn, "img": b64(im.convert("RGB"), "WEBP", 76)})
        print("thumb", fn, im.size)

    with open(os.path.join(OUT, "assets.json"), "w", encoding="utf-8") as fp:
        json.dump({"anchors": out, "thumbs": thumbs}, fp, ensure_ascii=False)
    print("\nassets.json written")

if __name__ == "__main__":
    main()
