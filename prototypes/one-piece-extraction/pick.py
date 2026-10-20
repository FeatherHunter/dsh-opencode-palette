# -*- coding: utf-8 -*-
"""pick.py — 按「区域 + 色相约束 + 饱和度极值」在参考图里确定性捞出物件色。

比手点坐标稳：每个物件给一个矩形区域和一个色相窗口，
在窗口内按饱和度/明度极值取中位色，得到的是该物件的真实像素色。
"""
import json, os, colorsys
import numpy as np
from PIL import Image

SRC = r"C:\Users\辰辰洋洋\Pictures\海贼王"
OUT = r"D:\dsh-plugin\dsh-opencode-palette\prototypes\one-piece-extraction"

# key, file, rect(x0,y0,x1,y1), hue范围(0-360), 取法, 名称
TARGETS = [
    # images.jpg 路飞
    ("sky_deep",   "images.jpg", (470, 0, 597, 90),  (195, 225), "sat_top",  "晴空浓蓝"),
    ("sky_mid",    "images.jpg", (400, 90, 597, 220), (195, 225), "sat_top",  "晴空中蓝"),
    ("sky_soft",   "images.jpg", (0, 0, 200, 120),    (195, 225), "sat_top",  "晴空薄蓝"),
    ("sky_pale",   "images.jpg", (0, 120, 130, 240),  (190, 220), "low_sat",  "云边淡蓝"),
    ("cloud",      "images.jpg", (0, 250, 120, 335),  (0, 360),   "light",   "积云白"),
    ("cloud2",     "images.jpg", (500, 200, 597, 300),(0, 360),   "light",   "积云白(右)"),
    ("hat_lit",    "images.jpg", (215, 0, 430, 110),  (25, 50),   "sat_top",  "草帽受光"),
    ("hat_shade",  "images.jpg", (215, 0, 430, 110),  (25, 50),   "dark",    "草帽阴影"),
    ("hat_brown",  "images.jpg", (215, 0, 430, 110),  (20, 45),   "median",  "草帽棕"),
    ("skin",       "images.jpg", (60, 100, 220, 240), (15, 40),   "median",  "手臂肤色"),
    ("vest_red",   "images.jpg", (230, 195, 400, 335),(340, 20),  "sat_top",  "路飞背心红"),
    ("hair",       "images.jpg", (215, 55, 420, 150), (0, 360),   "dark",    "黑发"),
    ("teeth",      "images.jpg", (270, 150, 340, 190),(0, 360),   "light",   "牙齿白"),

    # 2.jpg 标志
    ("sea_deep",   "2.jpg", (0, 300, 200, 414),      (205, 225), "dark",    "深海海底"),
    ("sea_mid",    "2.jpg", (0, 250, 250, 414),      (205, 225), "median",  "海蓝浪面"),
    ("logo_blue_d","2.jpg", (230, 140, 620, 250),    (205, 225), "dark",    "标志字深蓝"),
    ("logo_blue",  "2.jpg", (230, 140, 620, 250),    (200, 220), "median",  "标志字蓝"),
    ("logo_cyan",  "2.jpg", (430, 140, 620, 250),    (185, 205), "sat_top",  "标志字青"),
    ("lagoon",     "2.jpg", (250, 60, 560, 135),    (185, 200), "sat_top",  "潟湖青"),
    ("sky_mint",   "2.jpg", (540, 0, 738, 120),      (80, 160),  "light",   "天际奶绿"),
    ("sky_green",  "2.jpg", (500, 60, 700, 160),     (80, 160),  "median",  "天际浅绿"),
    ("red_figure", "2.jpg", (405, 125, 470, 250),    (340, 20),  "sat_top",  "标志红人"),
    ("hat_gold",   "2.jpg", (100, 120, 250, 200),    (40, 62),   "sat_top",  "标志草帽金"),
    ("rope",       "2.jpg", (230, 252, 640, 300),    (20, 50),   "dark",    "麻绳棕"),
    ("skull",      "2.jpg", (95, 165, 215, 245),     (0, 360),   "light",   "骷髅白"),
    ("anchor",     "2.jpg", (615, 200, 700, 270),    (15, 45),   "median",  "船锚棕"),

    # 3.jpg 草帽团
    ("p_sky",      "3.jpg", (0, 0, 60, 60),          (195, 220), "median",  "海报天蓝"),
    ("p_sand",     "3.jpg", (0, 340, 280, 420),      (40, 70),   "median",  "沙滩米"),
    ("p_vest",     "3.jpg", (120, 90, 170, 145),     (340, 20),  "sat_top",  "海报背心红"),
    ("p_balloon",  "3.jpg", (100, 40, 150, 90),      (340, 20),  "sat_top",  "BIG 红气球"),
    ("p_green",    "3.jpg", (15, 170, 75, 340),      (90, 170),  "median",  "索隆绿"),
    ("p_orange",   "3.jpg", (225, 130, 270, 200),    (15, 45),   "sat_top",  "娜美橙"),
    ("p_blond",    "3.jpg", (150, 105, 205, 145),    (35, 60),   "sat_top",  "山治金"),
    ("p_pink",     "3.jpg", (175, 300, 230, 365),    (330, 20),  "sat_top",  "乔巴粉"),
    ("p_navy",     "3.jpg", (85, 160, 135, 210),     (200, 230), "dark",    "乌索普藏青"),
    ("p_shorts",   "3.jpg", (125, 140, 170, 180),    (200, 230), "median",  "路飞短裤蓝"),
    ("p_white",    "3.jpg", (200, 90, 280, 130),     (0, 360),   "light",   "海报云白"),
]


def hexs(rgb):
    return "#%02X%02X%02X" % tuple(int(round(v)) for v in rgb)


out = {}
for key, f, (x0, y0, x1, y1), hr, mode, name in TARGETS:
    arr = np.asarray(Image.open(os.path.join(SRC, f)).convert("RGB")).astype(float)
    sub = arr[y0:y1, x0:x1].reshape(-1, 3)
    hsv = np.array([colorsys.rgb_to_hsv(*(v / 255.0)) for v in sub])
    hue = hsv[:, 0] * 360
    sat = hsv[:, 1]
    val = hsv[:, 2]
    if hr[0] <= hr[1]:
        m = (hue >= hr[0]) & (hue <= hr[1])
    else:  # 跨 0
        m = (hue >= hr[0]) | (hue <= hr[1])
    cand = sub[m]
    if len(cand) < 20:
        cand, m = sub, np.ones(len(sub), bool)
    cv = val[m]
    cs = sat[m]
    if mode == "sat_top":
        sel = cand[cs >= np.quantile(cs, 0.88)]
    elif mode == "dark":
        sel = cand[cv <= np.quantile(cv, 0.12)]
    elif mode == "light":
        sel = cand[cv >= np.quantile(cv, 0.90)]
    elif mode == "low_sat":
        sel = cand[cs <= np.quantile(cs, 0.25)]
    else:
        sel = cand
    med = np.median(sel, axis=0)
    out[key] = {"file": f, "rect": [x0, y0, x1, y1], "hue": list(hr), "mode": mode,
                "name": name, "hex": hexs(med), "rgb": [int(round(v)) for v in med],
                "n_px": int(len(cand)), "n_sel": int(len(sel))}
    print(f"{key:13s} {f:11s} {str(hr):12s} {mode:8s} {hexs(med)}  px={len(cand):6d} sel={len(sel):6d}  {name}")

with open(os.path.join(OUT, "anchors.json"), "w", encoding="utf-8") as fh:
    json.dump(out, fh, ensure_ascii=False, indent=2)
print("\nwrote", os.path.join(OUT, "anchors.json"))
