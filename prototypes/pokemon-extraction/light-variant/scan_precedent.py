import json, glob, os, math
def lin(c):
    s=c/255
    return s/12.92 if s<=0.03928 else ((s+0.055)/1.055)**2.4
def L(h):
    h=h.lstrip('#')
    if len(h)==3: h=''.join(x*2 for x in h)
    r,g,b=int(h[0:2],16),int(h[2:4],16),int(h[4:6],16)
    return 0.2126*lin(r)+0.7152*lin(g)+0.0722*lin(b)
def cr(a,b):
    la,lb=L(a),L(b)
    hi,lo=max(la,lb),min(la,lb)
    return (hi+0.05)/(lo+0.05)
def luma(h):
    h=h.lstrip('#')
    r,g,b=int(h[0:2],16),int(h[2:4],16),int(h[4:6],16)
    return (0.299*r+0.587*g+0.114*b)/255
rows=[]
for f in glob.glob(r'D:\dsh-plugin\dsh-opencode-palette\src\custom-presets\*.json')+glob.glob(r'D:\dsh-plugin\dsh-opencode-palette\src\themes\*.json'):
    j=json.load(open(f,encoding='utf-8'))
    cols=j.get('colors') or j.get('theme') or {}
    if not isinstance(cols,dict): continue
    p=cols.get('primary'); bg=cols.get('background')
    if not isinstance(p,str) or not isinstance(bg,str): continue
    app=j.get('appearance','?')
    rows.append((os.path.basename(f)[:-5],app,p,bg,round(cr(p,bg),2),round(luma(p),3)))
# only concrete hex
rows=[r for r in rows if r[2].startswith('#') and r[3].startswith('#')]
light=[r for r in rows if r[1]=='light']
light.sort(key=lambda r:-r[4])
print("=== ALL themes with appearance=light, sorted by primary@background ratio (top 20) ===")
for r in light[:20]: print(f"{r[0]:<24} primary={r[2]:<9} bg={r[3]:<9} ratio={r[4]:<6} luma={r[5]}")
print()
print("=== highest-luma primary on a light-ground theme (i.e. bright primary precedent) ===")
light.sort(key=lambda r:-r[5])
for r in light[:10]: print(f"{r[0]:<24} primary={r[2]:<9} bg={r[3]:<9} ratio={r[4]:<6} luma={r[5]}")
print()
print("=== #FFCB05 vs every light preset's own background ===")
for r in light:
    print(f"  {r[0]:<24} #FFCB05 @ {r[3]:<9} = {round(cr('#FFCB05',r[3]),2)}")
