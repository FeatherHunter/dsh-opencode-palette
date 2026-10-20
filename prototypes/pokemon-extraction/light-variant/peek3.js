const fs=require('fs');
const b=JSON.parse(fs.readFileSync('D:/Temp/pokemon-theme/adv3/audit-out/baseline.json','utf8'));
const kk=b.themes.find(t=>t.id==='kuromi');
const ev=kk.evaluations;
console.log('evaluations type', Array.isArray(ev)?'array':'obj', Array.isArray(ev)?ev.length:Object.keys(ev));
const rows=Array.isArray(ev)?ev:Object.values(ev).flat();
for(const r of rows){ if(/labelDimmed|textMuted/.test(r.code||'')) console.log(' ',r.code, r.fg, r.bg, r.ratio, r.verdict); }
