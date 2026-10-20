import json, colorsys
H=json.load(open(r'D:\Temp\pokemon-theme\histogram.json',encoding='utf-8'))
G=[(e['hex'].upper(),e['n']) for e in H['grand']]
def rgb(h):
    h=h.lstrip('#'); return tuple(int(h[i:i+2],16) for i in (0,2,4))
def lin(v):
    s=v/255.0; return s/12.92 if s<=0.04045 else ((s+0.055)/1.055)**2.4
def lum(c):
    r,g,b=(lin(x) for x in c); return 0.2126*r+0.7152*g+0.0722*b
def cr(a,b):
    la,lb=lum(rgb(a)),lum(rgb(b)); hi,lo=max(la,lb),min(la,lb); return (hi+0.05)/(lo+0.05)
def hsv(c):
    r,g,b=[x/255 for x in c]; return colorsys.rgb_to_hsv(r,g,b)
def fam(h):
    c=rgb(h); s=hsv(c)[1]
    if s<0.10: return 'neutral'
    hh=hsv(c)[0]*360
    if 25<=hh<=75: return 'gold'
    if 190<=hh<=250: return 'blue'
    if 100<=hh<=175: return 'green'
    if 10<=hh<25: return 'orange/red'
    return 'other'
rows=[]
for h,n in G:
    c=rgb(h)
    if fam(h)!='gold': continue
    L=lum(c)
    if 0.04<=L<=0.42: rows.append((L,h,n))
rows.sort(key=lambda t:-t[2])
print("=== gold family, L in [0.04,0.42], n desc ===")
for L,h,n in rows[:45]:
    c=rgb(h); hh,s,v=hsv(c)
    print(f"  {h} n={n:6d} L={L:.4f} H={hh*360:6.1f} S={s:.2f} vsPaper={cr(h,'#FDFBF6'):5.2f} vsWhite={cr(h,'#FFFFFF'):5.2f}")
print()
print("=== gold family, LIGHT band L in [0.55,0.99], n desc (cream/paper supply) ===")
rows2=[]
for h,n in G:
    c=rgb(h)
    if fam(h)!='gold': continue
    L=lum(c)
    if 0.55<=L<=0.995: rows2.append((L,h,n))
rows2.sort(key=lambda t:-t[2])
for L,h,n in rows2[:35]:
    c=rgb(h); hh,s,v=hsv(c)
    print(f"  {h} n={n:6d} L={L:.4f} H={hh*360:6.1f} S={s:.2f} vsInk={cr(h,'#1C1C22'):5.2f}")
