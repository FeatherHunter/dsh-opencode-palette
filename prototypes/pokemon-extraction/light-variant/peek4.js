const fs=require('fs');
const b=JSON.parse(fs.readFileSync('D:/Temp/pokemon-theme/adv3/audit-out/baseline.json','utf8'));
const kk=b.themes.find(t=>t.id==='kuromi');
const e=kk.evaluations[0];
console.log('eval0 keys:', Object.keys(e).join(','));
const rows=e.pairs||e.results||e.rows||[];
console.log('rows n=',rows.length);
for(const r of rows){ if(/labelDimmed|textMuted|^text@/.test(r.code||'')) console.log(' ',r.code, r.fg, r.bg, r.ratio, r.verdict); }
