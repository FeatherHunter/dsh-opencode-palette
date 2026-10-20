# -*- coding: utf-8 -*-
"""红队第三轮：验证修正方案，并判断「primary↔warning 色相」是不是真问题。"""
import os, json, glob, colorsys
from PIL import Image
def rgb_of(h): return tuple(int(h[i:i+2],16) for i in (1,3,5))
def srgb(c):
    c=c/255.0
    return c/12.92 if c<=0.04045 else ((c+0.055)/1.055)**2.4
def lum(h):
    r,g,b=(srgb(v) for v in rgb_of(h)); return .2126*r+.7152*g+.0722*b
def cr(a,b):
    la,lb=lum(a),lum(b); return (max(la,lb)+.05)/(min(la,lb)+.05)
def lab(h):
    r,g,b=[srgb(v) for v in rgb_of(h)]
    X=(.4124*r+.3576*g+.1805*b)/.95047; Y=(.2126*r+.7152*g+.0722*b); Z=(.0193*r+.1192*g+.9505*b)/1.08883
    def g2(t): return t**(1/3) if t>.008856 else 7.787*t+16/116
    fx,fy,fz=g2(X),g2(Y),g2(Z); return (116*fy-16,500*(fx-fy),200*(fy-fz))
def de(a,b):
    la,lb=lab(a),lab(b); return sum((x-y)**2 for x,y in zip(la,lb))**.5
def hue(h):
    r,g,b=[v/255 for v in rgb_of(h)]; return colorsys.rgb_to_hls(r,g,b)[0]*360
def hd(a,b):
    d=abs(hue(a)-hue(b))%360; return min(d,360-d)
MINE=json.load(open(r"D:\Temp\pokemon-theme-final\pokemon.json",encoding="utf-8"))["colors"]

print("="*90); print("N. 修正方案对比：borderActive 换哪个黄？")
for cand in ["#FFCB05","#F1D379","#F7E7B1","#F4D77C","#FDE7B5"]:
    print("   %s  ΔE76(primary)=%6.2f  ΔL*=%+5.1f  on bg/panel/elem = %5.2f / %5.2f / %5.2f"%(
        cand, de(MINE["primary"],cand), 100*(lum(cand)-lum(MINE["primary"])),
        cr(cand,MINE["background"]), cr(cand,MINE["backgroundPanel"]), cr(cand,MINE["backgroundElement"])))
print("   仓库 23 套 IP 的 primary↔borderActive ΔE 分布参考：中位 47.4 / 最低 0.0（hello-kitty）/ doraemon 10.5 / lego 16.0 / marvel 15.3")

print("="*90); print("O. 「primary↔warning 色相太近」在仓库里是常态还是我的特例？")
rows=[]
for f in glob.glob(r"D:\dsh-plugin\dsh-opencode-palette\src\custom-presets\*.json"):
    j=json.load(open(f,encoding="utf-8")); c=j.get("colors",{})
    if "primary" in c and "warning" in c:
        rows.append((j.get("id"), hd(c["primary"],c["warning"]), de(c["primary"],c["warning"])))
for n,h,d in sorted(rows,key=lambda r:r[1])[:8]:
    print("   %-20s primary↔warning 色相差 %6.1f°  ΔE=%6.1f"%(n,h,d))
hs=[r[1] for r in rows]
print("   全库：中位 %.1f° 最低 %.1f° → 我这套 %.1f°"%(sorted(hs)[len(hs)//2],min(hs),hd(MINE["primary"],MINE["warning"])))
print("   → 若我落在中位附近，则这是暗色主题的普遍现象（品牌色与告警色共处一个暖区），不是本设计独有缺陷")

print("="*90); print("P. 冒号里的两处事实性错误，改写后是否成立？")
print("   错误1「错误红是参考图里最亮的正红」")
print("     更亮的红：#FF6B3D L=.3211 n=1 / #FF6437 L=.3065 n=1 / #F86845 L=.3029 n=1 …（均为 JPEG 振铃）")
print("     像素量可用的最亮正红 = #F93D32 L=.2371 n=1984 → 改写为「像素量可用（1984 px）的最亮正红」才成立")
print("   错误2「饱和度预算几乎全给了黄色」")
print("     S≥0.55 的 12 个色位：黄/金 4、红 4、蓝/青 3、橙 1 → 改为「黄与红两族并列，各 4 个」才成立")

print("="*90); print("Q. 我自己定的「可同屏出现的角色 ΔE≥10」自洽性检查")
import itertools
roles=list(MINE.keys())
groups={"chrome":["primary","borderActive","secondary","info","success","warning","error","text","textMuted"],
        "code":["syntaxComment","syntaxKeyword","syntaxFunction","syntaxType","syntaxNumber","syntaxString","syntaxOperator"],
        "md":["markdownHeading","markdownLink","markdownStrong","markdownEmph","markdownBlockQuote","markdownCode"],
        "diff":["diffAdded","diffRemoved"]}
print("   同组内最小 ΔE：")
for g,rs in groups.items():
    pairs=sorted((de(MINE[a],MINE[b]),a,b) for a,b in itertools.combinations(rs,2))
    print("     %-7s %5.1f  (%s ↔ %s)"%(g,pairs[0][0],pairs[0][1],pairs[0][2]))
print("   跨组里真实会同屏出现的关键对：")
for a,b in [("primary","borderActive"),("success","syntaxType"),("success","diffAdded"),
            ("primary","warning"),("primary","error"),("text","markdownStrong"),
            ("markdownHeading","text"),("markdownCode","syntaxString"),("syntaxComment","syntaxOperator")]:
    print("     %-16s ↔ %-16s ΔE=%6.1f  %s"%(a,b,de(MINE[a],MINE[b]),
          "OK" if de(MINE[a],MINE[b])>=10 else "← 低于 10（同屏易混）"))
