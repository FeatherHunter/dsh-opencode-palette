import json, collections
def load(p):
    d=json.load(open(p,encoding="utf-8"))
    c=collections.OrderedDict(sorted(d["colors"].items()))
    return d,c
for mode,ident,title,ts in [("light","naruto","火影忍者 · 漫画纸","2026-10-20T11:20:00+08:00"),
                            ("dark","naruto-night","火影忍者 · 夜之暗","2026-10-20T11:20:00+08:00")]:
    d,c=load(rf"D:\Temp\naruto-theme\v5_{mode}.json")
    obj=collections.OrderedDict()
    obj["appearance"]=mode; obj["basePreset"]=ident; obj["colors"]=c
    obj["id"]=ident; obj["name"]=title
    obj["schema"]="dsh-opencode-palette.custom-theme.v1"; obj["updatedAt"]=ts
    p=rf"D:\dsh-plugin\dsh-opencode-palette\src\custom-presets\{ident}.json"
    open(p,"w",encoding="utf-8",newline="\n").write(json.dumps(obj,ensure_ascii=False,separators=(",",":")))
    print("wrote",p,len(json.dumps(obj,ensure_ascii=False,separators=(",",":"))))
