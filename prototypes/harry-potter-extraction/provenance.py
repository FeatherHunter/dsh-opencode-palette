# -*- coding: utf-8 -*-
"""Build the provenance table: for every palette anchor, locate the densest cluster of
matching pixels in the reference image, cut that region out, and base64 it as a PNG.
The result is what the preview.html embeds, so every swatch can show its own source crop.
"""
import base64
import io
import json
import os

import numpy as np
from PIL import Image

SRC = r"C:\Users\辰辰洋洋\Pictures\哈利波特"
OUT = os.path.dirname(os.path.abspath(__file__))

PAL = json.load(open(os.path.join(OUT, "palette.json"), encoding="utf-8"))["colors"]

# anchor id -> (file, hex, human label, story, hand-picked rect x0,y0,x1,y1)
ANCHORS = [
    ("night",    "4.jpg",        "#0B223B", "海报夜空", "4.jpg 顶部的深蓝夜空——整块「场」的基准色", (0.60, 0.005, 0.98, 0.050)),
    ("ice",      "images.jpg",   "#3DD3FF", "冰窟冷光", "images.jpg 冰窟里那束最亮的青蓝", (0.44, 0.03, 0.66, 0.20)),
    ("gold",     "3.jpg",        "#E0BE5C", "袍边鎏金", "3.jpg 格兰芬多袍子上的金边", (0.125, 0.285, 0.152, 0.345)),
    ("tieGold",  "3.jpg",        "#CAA654", "领带金条", "3.jpg 格兰芬多领带的金条纹（品牌主色）", (0.175, 0.155, 0.235, 0.330)),
    ("scarlet",  "4.jpg",        "#C56F72", "特快车身", "4.jpg 霍格沃茨特快被灯照亮的车身红", (0.79, 0.775, 0.95, 0.865)),
    ("white",    "3.jpg",        "#FCFEFD", "白背景",  "3.jpg 商品图的白底——冷白月色", (0.62, 0.03, 0.95, 0.14)),
    ("moon",     "4.jpg",        "#EEEEEC", "银色 LOGO", "4.jpg 左上角「Harry Potter」银色 LOGO 的银白", (0.015, 0.012, 0.30, 0.085)),
    ("amber",    "2.jpg",        "#D4A681", "火光暖调", "2.jpg 壁炉火光打在皮肤上的暖橙", (0.40, 0.45, 0.60, 0.55)),
    ("copper",   "2.jpg",        "#BB8964", "木墙铜镜", "2.jpg 背景木墙与铜镜的暖铜色", (0.80, 0.03, 0.99, 0.22)),
    ("mint",     "4.jpg",        "#91BEAE", "月色青", "4.jpg 邓布利多银须与月光的青白", (0.03, 0.46, 0.19, 0.60)),
    ("mauve",    "images.jpg",   "#AC93AA", "暮色丁香", "images.jpg 人像阴影里的一层暮紫", (0.10, 0.58, 0.26, 0.76)),
    ("teal",     "images.jpg",   "#3C8AA9", "冰面青",   "images.jpg 冰面偏青的层次", (0.24, 0.58, 0.40, 0.76)),
    ("sky",      "4.jpg",        "#2E9FD0", "蓝雾天光", "4.jpg 片名后方那堵雾蓝的天光", (0.02, 0.60, 0.24, 0.72)),
    ("ink",      "3.jpg",        "#191919", "长袍墨",   "3.jpg 霍格沃茨长袍的黑", (0.06, 0.70, 0.20, 0.92)),
    ("deepblue", "4.jpg",        "#01030A", "夜最深处", "4.jpg 夜空最暗的那一角", (0.12, 0.74, 0.28, 0.90)),
    ("paper",    "2.jpg",        "#FBECCA", "白衬衫",   "2.jpg 哈利校服白衬衫的暖白", (0.28, 0.72, 0.68, 0.80)),
    ("skin",     "2.jpg",        "#C08A68", "面部肤色", "2.jpg 哈利的面部", (0.40, 0.45, 0.60, 0.55)),
    ("night2",   "images.jpg",   "#032B3D", "冰窟深蓝", "images.jpg 冰窟最深处的蓝", (0.02, 0.02, 0.18, 0.20)),
    ("tieHi",    "3.jpg",        "#FCDB8C", "领带金高光", "3.jpg 领带金条被光打亮的那一档", (0.175, 0.155, 0.235, 0.330)),
    ("titleGold","4.jpg",        "#FFDAB5", "片名鎏金", "4.jpg 电影片名「哈利·波特」的鎏金", (0.30, 0.550, 0.56, 0.620)),
    ("mistBlue", "4.jpg",        "#8BDBFE", "蓝雾天光", "4.jpg 片名后方那堵雾蓝的天光（高光档）", (0.02, 0.60, 0.24, 0.72)),
    ("whitePeak","3.jpg",        "#FEFEFE", "白底峰值", "3.jpg 商品白底的纯白峰值", (0.62, 0.03, 0.95, 0.14)),
]


def rgb_of(h):
    h = h.lstrip("#")
    return np.array([int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)], dtype=np.int16)


def find_cluster(im, hexv, tol=26):
    """Find the densest region of pixels near hexv; return (cx, cy) normalised."""
    a = np.asarray(im.convert("RGB"), dtype=np.int16)
    h, w, _ = a.shape
    d = np.sqrt(((a - rgb_of(hexv)) ** 2).sum(axis=2))
    m = d <= tol
    if not m.any():
        return None
    # 32x32 occupancy grid, pick the densest cell, then its centroid
    grid = np.zeros((8, 8))
    ys, xs = np.nonzero(m)
    gy = (ys * 8 / h).astype(int).clip(0, 7)
    gx = (xs * 8 / w).astype(int).clip(0, 7)
    for y, x in zip(gy, gx):
        grid[y, x] += 1
    cy0, cx0 = np.unravel_index(np.argmax(grid), grid.shape)
    sel = (gy == cy0) & (gx == cx0)
    cy = float(ys[sel].mean()) / h
    cx = float(xs[sel].mean()) / w
    return cx, cy, int(m.sum())


def crop_b64(im, cx, cy, size=0.16, px=72):
    w, h = im.size
    half = size / 2
    x0, x1 = max(0, int((cx - half) * w)), min(w, int((cx + half) * w))
    y0, y1 = max(0, int((cy - half) * h)), min(h, int((cy + half) * h))
    c = im.crop((x0, y0, x1, y1)).resize((px, px), Image.LANCZOS)
    buf = io.BytesIO()
    c.save(buf, format="PNG", optimize=True)
    return (
        "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode("ascii")
    ), [round(x0 / w, 3), round(y0 / h, 3), round(x1 / w, 3), round(y1 / h, 3)]


res = []
for aid, fname, hexv, name, story, rect in ANCHORS:
    im = Image.open(os.path.join(SRC, fname)).convert("RGB")
    w, h = im.size
    x0, y0 = int(rect[0] * w), int(rect[1] * h)
    x1, y1 = int(rect[2] * w), int(rect[3] * h)
    c = im.crop((x0, y0, x1, y1)).resize((72, 72), Image.LANCZOS)
    buf = io.BytesIO()
    c.save(buf, format="PNG", optimize=True)
    b64 = "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode("ascii")
    a = np.asarray(im, dtype=np.int16)
    d = np.sqrt(((a.astype(float) - rgb_of(hexv).astype(float)) ** 2).sum(axis=2))
    res.append({
        "id": aid, "file": fname, "hex": hexv.upper(), "name": name, "story": story,
        "rect": [round(rect[0], 3), round(rect[1], 3), round(rect[2], 3), round(rect[3], 3)],
        "px": [x0, y0, x1, y1], "exact": int((d <= 6).sum()), "near": int((d <= 18).sum()),
        "crop": b64,
    })
    print("%-10s %-12s %-8s exact=%-6d near=%-6d  %s" % (aid, fname, hexv, res[-1]["exact"], res[-1]["near"], name))

# whole-image thumbnails for the gallery
gallery = []
for fname in ["images.jpg", "4.jpg", "2.jpg", "3.jpg"]:
    im = Image.open(os.path.join(SRC, fname)).convert("RGB")
    w, h = im.size
    tw = 420
    t = im.resize((tw, int(h * tw / w)), Image.LANCZOS)
    buf = io.BytesIO()
    t.save(buf, format="JPEG", quality=82, optimize=True)
    gallery.append({
        "file": fname,
        "size": [w, h],
        "data": "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode("ascii"),
    })

with open(os.path.join(OUT, "provenance.json"), "w", encoding="utf-8") as fp:
    json.dump({"anchors": res, "gallery": gallery}, fp, ensure_ascii=False)

# 直采核验：所有标为「直采」的主题色位，必须在参考图里真的存在
DIRECT = [
    ("background",        "4.jpg",      "#0B223B"),
    ("primary",           "3.jpg",      "#CAA654"),
    ("secondary",         "4.jpg",      "#C56F72"),
    ("info",              "images.jpg", "#3DD3FF"),
    ("success",           "4.jpg",      "#91BEAE"),
    ("warning",           "2.jpg",      "#D4A681"),
    ("borderActive",      "3.jpg",      "#FCDB8C"),
    ("markdownHeading",   "4.jpg",      "#FFDAB5"),
    ("markdownLink",      "4.jpg",      "#8BDBFE"),
    ("markdownCode",      "3.jpg",      "#E0BE5C"),
    ("markdownStrong",    "3.jpg",      "#FEFEFE"),
    ("syntaxKeyword",     "images.jpg", "#AC93AA"),
    ("syntaxFunction",    "4.jpg",      "#2E9FD0"),
    ("syntaxNumber",      "2.jpg",      "#BB8964"),
    ("text",              "4.jpg",      "#EEEEEC"),
]
print("\n—— 直采核验（主题色位 → 参考图里是否真的存在该色）——")
allok = True
for token, fname, hexv in DIRECT:
    im = Image.open(os.path.join(SRC, fname)).convert("RGB")
    a = np.asarray(im, dtype=np.float32)
    d = np.sqrt(((a - rgb_of(hexv).astype(np.float32)) ** 2).sum(axis=2))
    exact = int((d <= 8).sum())
    near = int((d <= 20).sum())
    ok = exact > 0
    allok = allok and ok
    print("  %-16s %-8s %-12s 精确 %-6d 近邻 %-6d %s" % (token, hexv, fname, exact, near, "OK" if ok else "!! 未找到"))
print("直采核验：", "全部通过" if allok else "存在未找到项")

