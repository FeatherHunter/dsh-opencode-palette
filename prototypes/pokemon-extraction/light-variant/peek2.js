const fs=require('fs');
const b=JSON.parse(fs.readFileSync('D:/Temp/pokemon-theme/adv3/audit-out/baseline.json','utf8'));
const arr=b.themes;
console.log('themes n=',arr.length);
const k=arr.find(t=>t.id==='kuromi'||t.name==='kuromi'||JSON.stringify(t).includes('kuromi'));
console.log('keys of a theme:', Object.keys(arr[0]).join(','));
const kk=arr.find(t=>t.id==='kuromi')||arr.find(t=>(t.theme||'').includes('kuromi'));
console.log('found kuromi?', !!kk, kk&&kk.id);
const rows=(kk&&(kk.pairs||kk.results||kk.rows))||[];
console.log('rows n=',rows.length);
for(const r of rows){ if(/labelDimmed|textMuted/.test(r.code)) console.log(' ',r.code, r.fg, r.bg, r.ratio, r.verdict); }
