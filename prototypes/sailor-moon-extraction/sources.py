# -*- coding: utf-8 -*-
"""美少女战士 · 取色源表 v2
strategy:
  mode      —— 区域内出现次数最多的精确像素（直采凭证：hits）
  saturated —— 区域内彩度最高的 8% 像素的众数（用于细条纹/渐变区）
  darkest   —— 区域内最暗 5% 像素的众数
"""
import os, json
from PIL import Image
import numpy as np

SRC = r"C:\Users\辰辰洋洋\Pictures\美少女战士"
OUT = r"D:\Temp\sailormoon-theme\sources.json"

def lin(c):
    c = np.asarray(c, dtype=np.float64) / 255.0
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)

def oklch(rgb):
    r, g, b = lin(rgb)
    l = 0.4122214708*r + 0.5363325363*g + 0.0514459929*b
    m = 0.2119034982*r + 0.6806995451*g + 0.1073969566*b
    s = 0.0883024619*r + 0.2817188376*g + 0.6299787005*b
    l_, m_, s_ = np.cbrt(l), np.cbrt(m), np.cbrt(s)
    L = 0.2104542553*l_ + 0.7936177850*m_ - 0.0040720468*s_
    A = 1.9779984951*l_ - 2.4285922050*m_ + 0.4505937099*s_
    B = 0.0259040371*l_ + 0.7827717662*m_ - 0.8086757660*s_
    C = float((A*A + B*B) ** 0.5)
    h = float(np.degrees(np.arctan2(B, A)) % 360.0)
    return [round(float(L), 4), round(C, 4), round(h, 1)]

# id, file, label, box, strategy, note
REGIONS = [
  ("star-blue",       "3.jpg",           "夜空星蓝",     (0, 0, 80, 40),          "mode",      "3.jpg 整幅唯一的纯蓝夜空"),
  ("night-ink",       "3.jpg",           "夜空暗部",     (0, 0, 452, 46),         "darkest",   "夜空最暗 5% 的众数，主题的墨"),
  ("ruby-gem",        "3.jpg",           "红宝石胸饰",   (104, 108, 126, 132),    "mode",      "月亮胸针上的红宝石"),
  ("hair-gold",       "3.jpg",           "金色长发",     (78, 150, 116, 210),     "mode",      "金发高光面"),
  ("hair-gold-deep",  "2.jpg",           "暖金长发",     (472, 14, 588, 106),     "mode",      "右侧画面 Sailor Moon 的金发"),
  ("gold-brooch",     "3.jpg",           "金色心形胸饰", (180, 440, 250, 492),    "saturated", "胸口金色心形徽章"),
  ("gold-crescent",   "3.jpg",           "翅膀黄月牙",   (386, 330, 444, 390),    "saturated", "翅膀上的黄月牙"),
  ("navy-collar",     "3.jpg",           "海军蓝领巾",   (95, 350, 128, 388),     "darkest",   "水手领的深蓝"),
  ("collar-blue",     "2.jpg",           "领巾浅蓝",     (118, 198, 212, 236),    "mode",      "左侧画面领巾"),
  ("sky-blue",        "2.jpg",           "白昼天空蓝",   (378, 0, 518, 80),       "mode",      "右侧画面蓝天"),
  ("nebula-blue",     "2.jpg",           "星云蓝",       (0, 0, 100, 130),        "mode",      "左侧画面星云"),
  ("nebula-teal",     "2.jpg",           "星云深青",     (0, 300, 110, 412),      "darkest",   "左侧画面下方星云暗部"),
  ("pale-green",      "2.jpg",           "浅绿双马尾",   (0, 28, 118, 96),        "mode",      "Super Sailor Moon 的浅绿发"),
  ("bow-maroon",      "2.jpg",           "暗红蝴蝶结",   (152, 252, 196, 286),    "mode",      "左侧画面深红大蝴蝶结"),
  ("pink-glove",      "3.jpg",           "粉色手套",     (40, 438, 88, 470),      "saturated", "手臂粉色手套的褶"),
  ("pink-puff",       "3.jpg",           "浅粉肩袖",     (6, 366, 52, 424),       "saturated", "肩上浅粉泡泡袖"),
  ("pink-wing",       "3.jpg",           "翅膀粉饰",     (352, 336, 400, 392),    "mode",      "翅膀上的粉色装饰"),
  ("pink-skirt",      "2.jpg",           "粉色短裙",     (614, 304, 728, 402),    "mode",      "右侧画面粉裙"),
  ("pink-bg",         "2.jpg",           "粉色背景",     (378, 378, 442, 412),    "mode",      "右侧画面粉底"),
  ("white-wing",      "3.jpg",           "白色羽翼",     (334, 500, 436, 598),    "mode",      "白羽"),
  ("white-bodice",    "3.jpg",           "白色水手服",   (124, 534, 270, 626),    "mode",      "白上衣"),
  ("white-uniform",   "2.jpg",           "制服冷白",     (120, 330, 200, 400),    "mode",      "左侧画面白制服"),
  ("ice-blue-eye",    "3.jpg",           "冰蓝瞳",       (145, 288, 188, 322),    "saturated", "蓝色眼睛"),
  ("red-sun",         "images (1).jpg", "红日",         (4, 4, 58, 54),          "mode",      "海报左上角的红色日轮"),
  ("red-bow-poster",  "images (1).jpg", "海报红蝴蝶结", (48, 58, 84, 96),        "saturated", "海报上的胸结"),
  ("red-title",       "images (1).jpg", "红色标题字",   (6, 300, 118, 348),      "saturated", "海报底部红色日文标题"),
  ("mint-hair",       "images (1).jpg", "薄荷色头发",   (150, 52, 250, 112),     "mode",      "海报右侧薄荷发色人物"),
  ("teal-ribbon",     "images (1).jpg", "青绿色飘带",   (118, 244, 162, 306),    "mode",      "黑猫身后的青绿飘带"),
  ("navy-skirt",      "images (1).jpg", "藏青短裙",     (46, 116, 110, 164),     "saturated", "海报上的深蓝裙"),
  ("city-grey",       "images (1).jpg", "城市灰蓝",     (0, 150, 30, 250),       "mode",      "海报左侧楼群"),
  ("cream-bg",        "images (1).jpg", "米色天空",     (210, 60, 268, 140),     "saturated", "海报右上米色天空"),
  ("skin",            "2.jpg",           "肤色",         (384, 190, 442, 242),    "mode",      "右画面手臂肤色"),
]

def pick(arr, strategy):
    flat = arr.reshape(-1, 3)
    if strategy == "mode":
        sel = flat
    elif strategy == "darkest":
        lum = flat.astype(np.float64) @ np.array([0.2126, 0.7152, 0.0722])
        sel = flat[lum <= np.percentile(lum, 5)]
    else:  # saturated
        f = flat.astype(np.float64)
        chroma = f.max(axis=1) - f.min(axis=1)
        sel = flat[chroma >= np.percentile(chroma, 92)]
    colors, counts = np.unique(sel, axis=0, return_counts=True)
    i = int(np.argmax(counts))
    return tuple(int(v) for v in colors[i]), int(counts[i]), len(sel), len(flat)

def main():
    out = {"images": {}, "sources": []}
    for f in ("2.jpg", "3.jpg", "images (1).jpg"):
        im = Image.open(os.path.join(SRC, f)).convert("RGB")
        out["images"][f] = {"size": list(im.size)}
    for sid, f, label, box, strat, note in REGIONS:
        im = Image.open(os.path.join(SRC, f)).convert("RGB")
        arr = np.asarray(im.crop(box))
        rgb, cnt, nsel, ntot = pick(arr, strat)
        hexv = "#%02X%02X%02X" % rgb
        out["sources"].append({
            "id": sid, "file": f, "label": label, "note": note,
            "box": list(box), "strategy": strat,
            "hex": hexv, "rgb": list(rgb), "hits": cnt,
            "pctOfRegion": round(100.0 * cnt / ntot, 2),
            "oklch": oklch(rgb),
        })
        s = out["sources"][-1]
        print(f"{sid:<15} {f:<15} {strat:<10} {hexv}  hits={cnt:<6} {100.0*cnt/ntot:5.2f}%  oklch={s['oklch']}")
    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump(out, fh, ensure_ascii=False, indent=1)
    print("written:", OUT)

if __name__ == "__main__":
    main()
