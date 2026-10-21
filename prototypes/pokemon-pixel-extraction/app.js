const C = @@C@@;
const SRC = @@SRC@@;
const AUD = @@AUD@@;
const IMGS = @@IMGS@@;

const PICK = {
 0: ["background","backgroundElement","codeBlockBg","text","textMuted","borderActive","border",
     "diffRemovedBg","diffRemovedLineNumberBg","syntaxComment","syntaxKeyword","syntaxString","syntaxOperator"],
 1: ["secondary","markdownLink","markdownEmph"],
 2: ["primary"],
 3: ["sidebarBg","backgroundPanel","bubbleBg","codeHeaderBg","info","success","warning","error",
     "diffAdded","diffAddedBg","diffAddedLineNumberBg","diffRemoved","markdownHeading","markdownCode",
     "markdownStrong","markdownBlockQuote","syntaxFunction","syntaxType","syntaxNumber"]
};
const ROLE = {
 0:"主结构图。它给出整套主题的三层纸——立绘舞台的纯黑、图注条的黑场、卡片的外框——加上发丝分隔线、图注的正文与次级灰，以及两处暖色：皮卡丘脸颊的珊瑚（关键字 / 强调）和嘴里的那点粉（字符串）。",
 1:"唯一的冷色来源。它的电属性天蓝分成三级：最亮的一层当链接，最暗的影子当次级色，中间那层留给强调。它在满屏的黄旁边承担补色对位的任务——所以必须待在次级位，不能上品牌位。",
 2:"主角。整幅画面 68% 是同一个黄，这个黄就是品牌色 primary。它同时说明了一件事：这套主题的饱和度预算给得最狠的是黄与红两族（各 4 个颜色），蓝色是唯一的冷色家族（3 个）。",
 3:"语义图。海报里每只宝可梦自带一种状态色：杰尼龟的甲是 info，妙蛙种子的叶绿是 success，小火龙的橙是 warning，妙蛙种子的身红是 error，伊布的奶油肚皮是标题色，壳下的深青是 diff 新增底。"
};
// 取色点（来自构建期像素扫描：每个色值在原图上的实心位置）
const XY = @@XY@@;

function lum(h){h=h.replace('#','');const v=[0,2,4].map(i=>parseInt(h.slice(i,i+2),16)/255)
  .map(c=>c<=.04045?c/12.92:Math.pow((c+.055)/1.055,2.4));return .2126*v[0]+.7152*v[1]+.0722*v[2]}

/* ---------- anchors ---------- */
const ANCHORS = [["primary","黄场"],["borderActive","编号牌黄"],["secondary","天蓝的影子"],
                 ["success","妙蛙种子叶绿"],["error","身红"],["background","档案黑"]];
document.getElementById('anchors').innerHTML = ANCHORS.map(([k,l]) =>
  '<span class="anchor"><i style="background:'+C[k]+'"></i>'+l+' <b>'+C[k]+'</b></span>').join('');

/* ---------- token grid ---------- */
const grid = document.getElementById('grid');
for (const [k,v] of Object.entries(C)) {
  const L = lum(v);
  const fg = L>.42 ? '#0C0C10' : '#EEEEF4';
  const d = document.createElement('div'); d.className='sw';
  d.innerHTML = '<div class="top" style="background:'+v+';color:'+fg+'"><span class="hex">'+v+'</span></div>'+
                '<div class="lbl"><b>'+k+'</b></div><div class="src">'+(SRC[k]||'')+'</div>';
  grid.appendChild(d);
}

/* ---------- provenance ---------- */
const prov = document.getElementById('prov');
IMGS.forEach((im,i) => {
  const keys = PICK[i] || [];
  let dots = '', list = '';
  for (const k of keys) {
    const p = XY[k]; if(!p) continue;
    dots += '<span class="dot" style="left:'+(100*p.x/im.w).toFixed(3)+'%;top:'+(100*p.y/im.h).toFixed(3)+
            '%;background:'+C[k]+'" title="'+k+' '+C[k]+' @('+p.x+','+p.y+')"></span>';
    list += '<div><i style="background:'+C[k]+'"></i><b>'+C[k]+'</b><span>'+(SRC[k]||'')+'</span></div>';
  }
  const card = document.createElement('div'); card.className='pcard';
  card.innerHTML = '<div class="ph">'+im.name+'<span class="pbadge">贡献 '+keys.length+' 颜色</span></div>'+
    '<div class="pm">'+im.w+' × '+im.h+' 像素</div>'+
    '<div class="pimg" style="aspect-ratio:'+im.w+'/'+im.h+'">'+
    '<img src="data:image/'+im.mime+';base64,'+im.b64+'" alt="'+im.name+'">'+dots+'</div>'+
    '<div class="plist">'+list+'</div><div class="prole">'+ROLE[i]+'</div>';
  prov.appendChild(card);
});

/* 审计表与预设载荷已由构建器静态注入到 HTML —— 不用跑 JS 也能读到每一个数字。 */
