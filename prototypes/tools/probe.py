import json, glob, os, math
def lin(c):
    c=c/255.0
    return c/12.92 if c<=0.04045 else ((c+0.055)/1.055)**2.4
def Y(h):
    r,g,b=[int(h[i:i+2],16) for i in (1,3,5)]
    return 0.2126*lin(r)+0.7152*lin(g)+0.0722*lin(b)
def L(h):
    y=Y(h); return 116*(y**(1/3))-16 if y>0.008856 else 903.3*y
def ct(h):
    r,g,b=[int(h[i:i+2],16) for i in (1,3,5)]
    return "#141414" if (0.299*r+0.587*g+0.114*b)/255>0.6 else "#F4F4F5"
def cr(a,b):
    la,lb=Y(a),Y(b)
    if la<lb: la,lb=lb,la
    return (la+0.05)/(lb+0.05)
SLOTS=["codeBlockBg","background","sidebarBg","inputBg","bubbleBg","backgroundPanel","codeHeaderBg","backgroundElement"]
files = sorted(glob.glob("src/themes/*.json")) + sorted(glob.glob("src/custom-presets/*.json"))
rows=[]
for f in files:
    try: t=json.load(open(f,encoding="utf-8"))
    except Exception: continue
    c=t.get("colors") or t
    if not isinstance(c,dict) or "background" not in c: continue
    try:
        Ls={s:L(c[s]) for s in SLOTS if s in c}
    except Exception: continue
    if len(Ls)<8: continue
    p=c.get("primary"); 
    rows.append((os.path.basename(f), Ls, L(p) if p else 0, cr(ct(p),p) if p else 0, cr(p,c["background"]), cr(p,c["backgroundPanel"])))
print("%-34s %-38s %6s %6s %5s %5s" % ("theme","L*: code/bg/side/in/bub/panel/hdr/elem","primL","p@txt","p@bg","p@pan"))
for n,Ls,pl,pt,pb,pp in sorted(rows, key=lambda r: r[1]["background"])[:34]:
    print("%-34s %-38s %6.1f %6.2f %5.2f %5.2f" % (n,
      "%.1f/%.1f/%.1f/%.1f/%.1f/%.1f/%.1f/%.1f"%(Ls["codeBlockBg"],Ls["background"],Ls["sidebarBg"],Ls["inputBg"],Ls["bubbleBg"],Ls["backgroundPanel"],Ls["codeHeaderBg"],Ls["backgroundElement"]),
      pl,pt,pb,pp))
