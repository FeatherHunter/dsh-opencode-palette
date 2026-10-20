const fs=require('fs');
const p='D:/Temp/pokemon-theme/adv3/palette.light.json';
const j=JSON.parse(fs.readFileSync(p,'utf8'));
Object.assign(j.colors,{diffAddedBg:'#F2FAF7',diffAddedLineNumberBg:'#E9F6F1',diffRemovedBg:'#F4E8E8',diffRemovedLineNumberBg:'#EBD5D6',markdownCode:'#31447B'});
fs.writeFileSync(p, JSON.stringify(j,null,2));
console.log('patched to formula-exact mixes');
