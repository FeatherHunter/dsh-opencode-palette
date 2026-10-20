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
    la,lb=lum(a),lum(b); hi,lo=max(la,lb),min(la,lb); return (hi+0.05)/(lo+0.05)
def hsv(c):
    r,g,b=[x/255 for x in c]; return colorsys.rgb_to_hsv(r,g,b)
print('=== purple / plum / magenta pixels (H 250..345, n>=8) ===')
rows=[]
for h,n in G:
    c=rgb(h); Hh,S,V=hsv(c); Hd=Hh*360
    if 250<=Hd<=345 and S>=0.15 and n>=8:
        rows.append((n,h,Hd,S,lum(c)))
rows.sort(reverse=True)
for n,h,Hd,S,L in rows[:22]:
    print(f'  {h} n={n:6d} H={Hd:6.1f} S={S:.2f} L={L:.4f} vsPaper={cr(rgb(h),rgb("#FFFAF0")):5.2f}')
