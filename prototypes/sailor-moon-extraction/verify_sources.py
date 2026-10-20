# -*- coding: utf-8 -*-
"""把台账里用到的 18 个直采源的「取色框 + 周边上下文」拼成一张核对图，人眼确认出处无误。"""
import os, sys, tempfile
from PIL import Image, ImageDraw
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_palette as bp

SRC = bp.SRC
OUT = os.path.join(tempfile.gettempdir(), "sailor-moon-sources.png")

def context(fname, box, pad=28):
    im = Image.open(f"{SRC}\\{fname}").convert("RGB")
    x0, y0, x1, y1 = box
    x0 = max(0, x0 - pad); y0 = max(0, y0 - pad)
    x1 = min(im.width, x1 + pad); y1 = min(im.height, y1 + pad)
    c = im.crop((x0, y0, x1, y1))
    scale = min(200 / c.width, 130 / c.height, 4)
    if scale < 1: c = c.resize((int(c.width*scale), int(c.height*scale)), Image.LANCZOS)
    return c

tiles = []
for k, s in bp.S.items():
    ctx = context(s["file"], tuple(s["box"]))
    d = ImageDraw.Draw(ctx)
    bx = s["box"]
    d.rectangle([bx[0], bx[1], bx[2], bx[3]], outline=(255, 0, 255), width=2)
    tiles.append((k, s, ctx))

cols = 6
cw, ch = 210, 172
rows = (len(tiles) + cols - 1) // cols
sheet = Image.new("RGB", (cols * cw, rows * ch), (255, 255, 255))
d = ImageDraw.Draw(sheet)
for i, (k, s, ctx) in enumerate(tiles):
    x = (i % cols) * cw + 5
    y = (i // cols) * ch + 26
    sheet.paste(ctx, (x, y))
    d.rectangle([x, y, x + 20, y + 20], fill=s["hex"])
    d.text((x + 24, y + 6), f"{k} {s['hex']}", fill=(0, 0, 0))
    d.text((x, y - 14), f"{s['file']} {s['label']}", fill=(60, 60, 60))
sheet.save(OUT)
print("written:", OUT, sheet.size)
