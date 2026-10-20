const fs=require('fs');
const p='D:/Temp/pokemon-theme/adv3/palette.light.json';
const j=JSON.parse(fs.readFileSync(p,'utf8'));
j.colors.syntaxString='#506942';
j.colors.syntaxNumber='#975611';
j.colors.markdownCode='#2E4277';
fs.writeFileSync(p, JSON.stringify(j,null,2));
console.log('patched');
