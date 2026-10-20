# -*- coding: utf-8 -*-
"""红队审查：对已交付的宝可梦主题做对抗式核算。"""
import os, json, colorsys
from collections import Counter
from PIL import Image

SRC = r"C:\Users\辰辰洋洋\Pictures\宝可梦"
FILES = ["01-pikachu-official-pokedex-art.png", "2.jpg", "3.jpg", "4.jpg"]
C = {
 "background":"#0C0C10","backgroundPanel":"#191917","backgroundElement":"#1C1C22",
 "sidebarBg":"#121212","bubbleBg":"#191917","inputBg":"#1C1C22",
 "codeBlockBg":"#000000","codeHeaderBg":"#191917",
 "text":"#EEEEF4","textMuted":"#A0A2AC",
 "primary":"#FEC901","secondary":"#4B76E7","info":"#289BCA","success":"#7AA85D",
 "warning":"#FB8603","error":"#F93D32","border":"#40404A","borderActive":"#FFCB05",
 "diffAdded":"#7FC9AE","diffAddedBg":"#0A2828","diffAddedLineNumberBg":"#2E514D",
 "diffRemoved":"#EE4027","diffRemovedBg":"#010000","diffRemovedLineNumberBg":"#141000",
 "markdownHeading":"#FDE7B5","markdownLink":"#799DFE","markdownCode":"#FAB685",
 "markdownEmph":"#FE4B23","markdownStrong":"#FFFFFF","markdownBlockQuote":"#A49E9E",
 "syntaxComment":"#7A7A7F","syntaxKeyword":"#E68269","syntaxFunction":"#95C7F8",
 "syntaxType":"#6E9BBC","syntaxNumber":"#E29C2A","syntaxString":"#C790A3","syntaxOperator":"#AA9059",
}
def rgb_of(h): return tuple(int(h[i:i+2],16) for i in (1,3,5))
def srgb(c):
    c=c/255.0
    return c/12.92 if c<=0.04045 else ((c+0.055)/1.055)**2.4
def lum(h):
    r,g,b=(srgb(v) for v in rgb_of(h)); return .2126*r+.7152*g+.0722*b
def cr(a,b):
    la,lb=lum(a),lum(b); return (max(la,lb)+.05)/(min(la,lb)+.05)
def sat(h):
    r,g,b=rgb_of(h); mx,mn=max(r,g,b),min(r,g,b); return (mx-mn)/mx if mx else 0
def hue(h):
    r,g,b=[v/255 for v in rgb_of(h)]
    return colorsys.rgb_to_hls(r,g,b)[0]*360
def hd(a,b):
    d=abs(hue(a)-hue(b))%360; return min(d,360-d)
def lab(h):
    r,g,b=[srgb(v) for v in rgb_of(h)]
    X=(.4124*r+.3576*g+.1805*b)/.95047; Y=(.2126*r+.7152*g+.0722*b); Z=(.0193*r+.1192*g+.9505*b)/1.08883
    def g2(t): return t**(1/3) if t>.008856 else 7.787*t+16/116
    fx,fy,fz=g2(X),g2(Y),g2(Z); return (116*fy-16,500*(fx-fy),200*(fy-fz))
def de(a,b):
    la,lb=lab(a),lab(b); return sum((x-y)**2 for x,y in zip(la,lb))**.5

print("="*88); print("A. 「同族、两级、各司其职」——primary 与 borderActive 到底差多少？")
print("   primary     %s  L=%.4f H=%.1f S=%.2f"%(C["primary"],lum(C["primary"]),hue(C["primary"]),sat(C["primary"])))
print("   borderActive %s  L=%.4f H=%.1f S=%.2f"%(C["borderActive"],lum(C["borderActive"]),hue(C["borderActive"]),sat(C["borderActive"])))
print("   ΔE76 = %.2f   ΔL* = %.1f   Δ色相 = %.1f°"%(de(C["primary"],C["borderActive"]),
      100*(lum(C["primary"])-lum(C["borderActive"])), hd(C["primary"],C["borderActive"])))

print("="*88); print("B. 语法核心里最接近的一对到底是谁？")
CORE=["syntaxKeyword","syntaxFunction","syntaxType","syntaxNumber","syntaxString"]
ps=[(CORE[i],CORE[j],de(C[CORE[i]],C[CORE[j]])) for i in range(5) for j in range(i+1,5)]
for a,b,d in sorted(ps,key=lambda p:p[2])[:4]:
    print("   %-15s %-15s ΔE=%5.1f  色相 %5.1f° / %5.1f°"%(a,b,d,hue(C[a]),hue(C[b])))

print("="*88); print("C. 品牌色 vs 语义色的色相距离（注意力色必须彼此可辨）")
for k in ["warning","error","info","success","secondary"]:
    print("   primary ↔ %-10s 色相差 %6.1f°   ΔE76=%5.1f"%(k, hd(C["primary"],C[k]), de(C["primary"],C[k])))

print("="*88); print("D. 「饱和度预算几乎全给了黄色」——真的吗？")
fam=Counter()
for k,v in C.items():
    h=hue(v); s=sat(v); L=lum(v)
    if s<0.55: continue
    if 35<=h<=70: fam["黄/金 (H35-70)"]+=1
    elif 15<=h<35: fam["橙 (H15-35)"]+=1
    elif h>=345 or h<15: fam["红 (H345-15)"]+=1
    elif 80<=h<170: fam["绿 (H80-170)"]+=1
    elif 170<=h<230: fam["蓝/青 (H170-230)"]+=1
    else: fam["其他"]+=1
for k,v in fam.most_common(): print("   %-16s %d 个 (S≥0.55)"%(k,v))
print("   合计高饱和色位:", sum(fam.values()), "/ 37")

print("="*88); print("E. 参考图里最亮的正红——我写进稿子的那个说法对吗？")
best=[]
for f in FILES:
    im=Image.open(os.path.join(SRC,f)).convert("RGB")
    cnt=Counter(im.getdata())
    for c,n in cnt.items():
        h=hue("#%02X%02X%02X"%c); s=sat("#%02X%02X%02X"%c); L=lum("#%02X%02X%02X"%c)
        if (h<15 or h>=345) and s>=0.70 and L>=0.20:
            best.append((L,n,"#%02X%02X%02X"%c,s,h))
best.sort(reverse=True)
for L,n,hx,s,h in best[:6]:
    print("   %s  L=%.4f S=%.2f H=%5.1f  n=%d  (我用的 error %s L=%.4f)"%(hx,L,s,h,n,C["error"],lum(C["error"])))
print("   → 稿子里写的「最亮的正红」:", "成立" if not any(b[0]>lum(C['error']) for b in best) else "不成立")

print("="*88); print("F. 气泡与页面底的层级差（ΔL 比）")
print("   bubbleBg %s L=%.4f  vs background %s L=%.4f  → 比值 %.2fx"%(C["bubbleBg"],lum(C["bubbleBg"]),C["background"],lum(C["background"]),(lum(C["bubbleBg"])+.05)/(lum(C["background"])+.05)))
print("   参考：GitHub 深色气泡 #30363d L=%.4f vs #0d1117 L=%.4f → %.2fx"%(lum("#30363d"),lum("#0d1117"),(lum("#30363d")+.05)/(lum("#0d1117")+.05)))
print("   → 气泡底与页面底对比（作为面片互辨）= %.2f:1"%(cr(C["bubbleBg"],C["background"])))

print("="*88); print("G. 正文对比度是否过高（halation / 眼疲劳）")
print("   我的 text %s on %s = %.2f:1"%(C["text"],C["background"],cr(C["text"],C["background"])))
for name,t,b in [("GitHub dark","#d0d7de","#0d1117"),("One Dark","#abb2bf","#282c34"),
                  ("Solarized dark","#93a1a1","#002b36"),("我这套","#EEEEF4","#0C0C10")]:
    print("   %-16s %s on %s = %.2f:1"%(name,t,b,cr(t,b)))

print("="*88); print("H. 若要把「两级黄」做成真的，参考图里有没有更亮的黄可用？")
for cand in ["#F7DE87","#F1D379","#FDD923","#FDE386","#FEE490","#FCE386","#FAE721"]:
    p=os.path.join(SRC,"01-pikachu-official-pokedex-art.png")
    im=Image.open(p).convert("RGB")
    n=sum(1 for px in im.getdata() if px==rgb_of(cand))
    print("   %s L=%.4f onBlack=%5.2f  在图1精确像素数=%d"%(cand,lum(cand),cr(cand,"#000000"),n))

print("="*88); print("I. 真实客户端里 primary 会被刷成哪几种（引擎实际用法）")
def withalpha(fg,bg,a):
    f,b=rgb_of(fg),rgb_of(bg)
    return "#%02X%02X%02X"%tuple(int(f[i]*a+b[i]*(1-a)) for i in range(3))
print("   纯填充 button-primary-fill        %s"%C["primary"])
print("   品牌文字 brand-text               %s"%C["primary"])
print("   hover-accent (primary@20%%) 覆于底 %s"%withalpha(C["primary"],C["background"],0.2))
print("   侧栏选中 accent (primary@35%%) 覆于侧栏 %s"%withalpha(C["primary"],C["sidebarBg"],0.35))
print("   → primary 在真实客户端至少承担 5 种职责：填充/品牌文字/20%% 悬停/35%% 侧栏强调/business 状态")

print("="*88); print("J. 仓库 21 套 IP 预置里，primary==borderActive 是多少套？")
import glob
n_eq=n=0
for f in glob.glob(r"D:\dsh-plugin\dsh-opencode-palette\src\custom-presets\*.json"):
    try: j=json.load(open(f,encoding="utf-8"))
    except Exception: continue
    col=j.get("colors",{})
    if "primary" in col:
        n+=1
        if col.get("primary","").lower()==col.get("borderActive","").lower(): n_eq+=1
print("   有 primary 的 IP 套数: %d，其中 primary==borderActive: %d"%(n,n_eq))
