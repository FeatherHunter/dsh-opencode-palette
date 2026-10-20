const fs=require('fs');
const b=JSON.parse(fs.readFileSync('D:/Temp/pokemon-theme/adv3/audit-out/baseline.json','utf8'));
const kk=b.themes.find(t=>t.id==='kuromi');
const e=kk.evaluations[0];
console.log(JSON.stringify(e.pairs[0]));
console.log('--- all codes for kuromi ---');
for(const r of e.pairs) console.log(' ', r.code||r.pair||JSON.stringify(r).slice(0,60), r.ratio, r.verdict, r.fg, r.bg);
