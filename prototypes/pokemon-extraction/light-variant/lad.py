import json
d=json.load(open(r'D:\Temp\pokemon-theme\ladders.json',encoding='utf-8'))
print(type(d), list(d.keys())[:12] if isinstance(d,dict) else len(d))
if isinstance(d,dict):
    for k in list(d.keys())[:3]:
        v=d[k]
        print('---',k,type(v))
        if isinstance(v,dict):
            for kk in list(v.keys())[:8]:
                vv=v[kk]
                print('   ',kk,type(vv), (str(vv)[:180]))
        elif isinstance(v,list):
            print('   len',len(v), str(v[:3])[:400])
