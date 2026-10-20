import json, re, io, sys
out = open(r'D:\Temp\pokemon-theme\adv3\steps_out.txt','w',encoding='utf-8')
import runpy
sys.argv=['steps.py']
buf = io.StringIO()
old = sys.stdout
sys.stdout = buf
try:
    runpy.run_path(r'D:\Temp\pokemon-theme\adv3\steps.py', run_name='__main__')
finally:
    sys.stdout = old
s = buf.getvalue()
# keep only the gold / orange-red / green sections
for fam in ['gold','orange/red','green']:
    m = re.search(r'########## family: '+re.escape(fam)+r'.*?(?=\n########## |\Z)', s, re.S)
    if m: out.write(m.group(0)+'\n')
out.close()
print(open(r'D:\Temp\pokemon-theme\adv3\steps_out.txt',encoding='utf-8').read())
