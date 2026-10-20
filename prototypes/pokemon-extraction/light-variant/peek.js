const fs=require('fs');
const b=JSON.parse(fs.readFileSync('D:/Temp/pokemon-theme/adv3/audit-out/baseline.json','utf8'));
const keys=Object.keys(b);
console.log('top keys:', keys.join(', '));
const themes=b.themes||b;
const k=themes.kuromi||themes['kuromi'];
if(!k){ console.log('no kuromi; sample:', Object.keys(themes).slice(0,8)); process.exit(0);}
const rows=k.pairs||k.results||[];
for(const r of rows){ if(/labelDimmed|textMuted|^text@background/.test(r.code)) console.log(r.code, r.fg, r.bg, r.ratio, r.verdict); }
