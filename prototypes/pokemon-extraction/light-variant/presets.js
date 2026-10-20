const fs=require('fs');
const dir='D:/dsh-plugin/dsh-opencode-palette/src/custom-presets/';
for(const f of ['mario.json','disney.json','zelda.json','one-piece.json','sailor-moon.json','lego.json','genshin.json','doraemon.json']){
  const j=JSON.parse(fs.readFileSync(dir+f,'utf8'));
  const c=j.colors;
  console.log(f.padEnd(18), 'bg',c.background, '| primary',c.primary,'| secondary',c.secondary,'| info',c.info,'| success',c.success,'| warning',c.warning,'| error',c.error,'| borderActive',c.borderActive,'| mdHeading',c.markdownHeading,'| mdLink',c.markdownLink,'| mdCode',c.markdownCode,'| mdEmph',c.markdownEmph,'| mdQuote',c.markdownBlockQuote,'| mdStrong',c.markdownStrong);
}
