const fs=require('fs');
const b=JSON.parse(fs.readFileSync('D:/Temp/pokemon-theme/adv3/audit-out/baseline.json','utf8'));
for(const id of ['kuromi','pokemon']){
  const kk=b.themes.find(t=>t.id===id);
  if(!kk){console.log(id,'not found');continue;}
  const e=kk.evaluations[0];
  console.log('=== '+id+'  appearance='+kk.appearance+'  canvas='+e.canvas+' surfaces='+JSON.stringify(e.surfaces));
  for(const r of e.pairs){ if(/labelDimmed|textMuted|^text@/.test(r.code||'')) console.log('  ',r.code, r.fg, r.bg, r.ratio, r.verdict); }
}
