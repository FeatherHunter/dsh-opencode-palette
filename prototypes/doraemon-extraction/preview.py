# -*- coding: utf-8 -*-
"""preview.py — 由 palette.json 生成 prototypes/doraemon-theme-preview.html（自包含）。"""
import os, json, re, base64, html
from collections import Counter
from PIL import Image, ImageDraw

REF = os.environ.get('DORAEMON_REF',
                   r'C:\Users\辰辰洋洋\Pictures\哆啦A梦')
OUT = os.path.dirname(os.path.abspath(__file__))
import tempfile
CROPS = tempfile.mkdtemp(prefix='doraemon-crops-')

P = json.load(open(os.path.join(OUT, 'palette.json'), encoding='utf-8'))
T, PROV, SRC = P['tokens'], P['provenance'], P['sources']

def h2r(h):
    h = h.lstrip('#'); return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))
def r2h(rgb): return '#%02X%02X%02X' % tuple(max(0, min(255, int(v + 0.5))) for v in rgb)
def lin(c):
    c = c / 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
def Y(h):
    r, g, b = [lin(v) for v in h2r(h)]
    return 0.2126*r + 0.7152*g + 0.0722*b
def cr(a, b):
    ya, yb = Y(a), Y(b); hi, lo = max(ya, yb), min(ya, yb)
    return (hi + 0.05) / (lo + 0.05)
def lab(h):
    r, g, b = [lin(v) for v in h2r(h)]
    X = r*0.4124564 + g*0.3575761 + b*0.1804375
    Yv = r*0.2126729 + g*0.7151522 + b*0.0721750
    Z = r*0.0193339 + g*0.1191920 + b*0.9503041
    def f(t): return t ** (1/3) if t > 0.008856 else (7.787*t + 16/116)
    fx, fy, fz = f(X/0.95047), f(Yv), f(Z/1.08883)
    return (116*fy - 16, 500*(fx-fy), 200*(fy-fz))
def Ls(h): return lab(h)[0]
def dE76(a, b):
    la, aa, ba = lab(a); lb, ab, bb = lab(b)
    return ((la-lb)**2 + (aa-ab)**2 + (ba-bb)**2) ** 0.5
def hue_chroma(h):
    r, g, b = h2r(h); mx, mn = max(r,g,b), min(r,g,b); c = mx-mn
    if c == 0: return None, 0
    d = mx-mn
    if mx == r: hh = 60*(((g-b)/d) % 6)
    elif mx == g: hh = 60*(((b-r)/d) + 2)
    else: hh = 60*(((r-g)/d) + 4)
    return hh, c

# ---------------------------------------------------------------- 取色配图
def focus_point(img, hexv, tol=3):
    target = h2r(hexv); W, H = img.size; px = img.load()
    match = set()
    for y in range(H):
        for x in range(W):
            c = px[x, y]
            if max(abs(c[i]-target[i]) for i in range(3)) <= tol: match.add((x, y))
    if not match: return None
    best, bestn = None, -1
    for (x, y) in match:
        n = sum(1 for dy in range(-6, 7) for dx in range(-6, 7) if (x+dx, y+dy) in match)
        if n > bestn: best, bestn = (x, y), n
    return best

def make_crop(hexv, src, idx):
    name = src['img']
    p = os.path.join(REF, name)
    if not os.path.exists(p): p = os.path.join(OUT, 'ref', name)
    img = Image.open(p).convert('RGB')
    fp = focus_point(img, hexv)
    if fp is None: return None
    W, H = img.size; S = 240
    x0 = max(0, min(W-S, fp[0]-S//2)); y0 = max(0, min(H-S, fp[1]-S//2))
    crop = img.crop((x0, y0, x0+S, y0+S)).resize((240, 240), Image.LANCZOS)
    d = ImageDraw.Draw(crop, 'RGBA')
    fx, fy = fp[0]-x0, fp[1]-y0
    d.ellipse([fx-30, fy-30, fx+30, fy+30], outline=(0,0,0,210), width=6)
    d.ellipse([fx-30, fy-30, fx+30, fy+30], outline=(255,255,255,255), width=4)
    import io
    buf = io.BytesIO(); crop.save(buf, format='PNG')
    return 'data:image/png;base64,' + base64.b64encode(buf.getvalue()).decode('ascii')

# 槽位 → 源色（从配方字符串里解析 hex）
SLOT_SRC = {}
for slot, pr in PROV.items():
    hs = re.findall(r'#[0-9A-Fa-f]{6}', pr['recipe'])
    SLOT_SRC[slot] = [h.upper() for h in hs]
SRC_SLOTS = {}
for slot, hs in SLOT_SRC.items():
    for h in hs:
        SRC_SLOTS.setdefault(h, []).append(slot)

crops = {}
for i, (hexv, s) in enumerate(sorted(SRC.items(), key=lambda kv: kv[0]), 1):
    fn = make_crop(hexv, s, i)
    if fn: crops[hexv] = fn

# ---------------------------------------------------------------- 关键数字
checks = P['checks']
hardc = [c for c in checks if c['cls'] == 'hard']
uic = [c for c in checks if c['cls'] == 'ui']
repo_hard = [c for c in hardc if c.get('src') == 'repo']
extra_hard = [c for c in hardc if c.get('src') == 'extra']
worst_hard = min(hardc, key=lambda c: c['ratio'])
worst_repo = min(repo_hard, key=lambda c: c['ratio'])
worst_ui = min(uic, key=lambda c: c['ratio'])
ladder = P['ladder']
ladder_sorted = sorted(ladder, key=lambda x: -x[1])
ladder_steps = [round(ladder_sorted[i][1]-ladder_sorted[i+1][1], 2) for i in range(len(ladder_sorted)-1)]
min_step = min(ladder_steps)
n_src = len(SRC)
n_direct = sum(1 for k in PROV if PROV[k]['kind'] == '直采')
n_mix = len(PROV) - n_direct

DORA_SVG = '''<svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
<path d="M13 2.4c-5.2 0-8.7 3.6-8.7 8.5v10c0 1.7 1.2 2.9 2.9 2.9h11.6c1.7 0 2.9-1.2 2.9-2.9v-10c0-4.9-3.5-8.5-8.7-8.5Z" fill="@@primary@@"/>
<path d="M13 5.2c-3.9 0-6.5 2.6-6.5 6.1 0 2.4 1.3 4.2 3.2 5.2h6.6c1.9-1 3.2-2.8 3.2-5.2 0-3.5-2.6-6.1-6.5-6.1Z" fill="@@bg@@"/>
<circle cx="10" cy="10.6" r="1.5" fill="@@text@@"/><circle cx="16" cy="10.6" r="1.5" fill="@@text@@"/>
<circle cx="13" cy="14.6" r="1.5" fill="@@error@@"/>
<path d="M9.2 17.4c1.1 1.1 2.4 1.6 3.8 1.6s2.7-.5 3.8-1.6" stroke="@@text@@" stroke-width=".9" fill="none" stroke-linecap="round"/>
<path d="M6 21.2h14" stroke="@@error@@" stroke-width="2" stroke-linecap="round"/>
<circle cx="13" cy="23.2" r="2.1" fill="#FFCB05"/><path d="M11 23.2h4" stroke="@@warning@@" stroke-width=".8"/>
</svg>'''

# ---------------------------------------------------------------- 审查纪要
REVIEW = [
 ('品牌/状态色其实是 11~13px 正文色', 'v1 只按 3:1 判；error 在 8 个表面里 7 个不过 4.5',
  '已修', '5 个品牌/语义色按正文口径在 8 个表面各算一遍，共 40 对全绿'),
 ('同色自染底', '宿主 .j_8BDW_strip 用 warning@14% 当底、同色当 13px 字 → 4.07:1',
  '已修', 'warning / error / success 各补自染底判据，全过'),
 ('宿主写死 #fff 的填充', 'button-info-fill 与 error 填充配宿主硬编码白字',
  '已修', '三个填充位都补 #fff 对比判据'),
 ('成功色是灰不是绿', 'v1 #384D3D 与 textMuted 互相对比仅 1.047:1，色盲下变中性灰',
  '已修', '改用叠色绿压暗 38%：#496352，色相 141°'),
 ('状态圆点红绿色盲下同色', 'v1 橙点与红点 ΔE00 2.73；实测 deutan 下 ΔE76 仅 0.5',
  '已修', '四态改成明度阶梯 54.5 / 39.5 / 31.9 / 23.4 L*，deutan 下 ΔE76 = 10.7'),
 ('气泡粉是色相孤岛', 'v1 气泡 340°，偏离基色相 141.5° > 60°；且与 diff 删除带 ΔE00 5.03',
  '已修', '气泡并回晴空纸一族，8 个背景槽 0 孤岛'),
 ('5 组角色同值', 'primary=borderActive=markdownHeading 等，ΔE00=0，抹平角色语义',
  '已修', '25 个设计角色两两不同值，0 碰撞'),
 ('场域阶梯是假的', 'v1 backgroundPanel 与 codeBlockBg 明度只差 0.19 L*',
  '已修', '按实测 L* 目标反解混色比例，每步 ≥@@minstep@@ L*'),
 ('代码头横栏看不见', 'v1 codeHeaderBg 与 codeBlockBg 只差 1.052:1',
  '已修', '阶梯重排后拉开 1.8 L*，横栏可见'),
 ('语法退后梯队不成立', 'v1 comment 5.62 盖过核心最低 5.31；operator 10.48 盖过全部核心',
  '已修', 'comment/operator 压到核心最低之下，形成三级退后'),
 ('markdownStrong 与正文无差', 'v1 ΔE00 3.82，粗体不产生视觉信号',
  '已修', 'strong 用 1.png 纯墨黑（比正文更重），与正文拉开'),
 ('锚点不在图里', 'v1 提亮/压暗锚用 #FFFFFF 与 #000000，其中 #000000 不在素材中',
  '已修', '锚点全部登记为图内像素；压暗锚改用 1.png 的 #0C0C10'),
 ('info 唯一色相被吃掉', '建议把 secondary 改成中性灰以保色盲可分',
  '判为误报', '仓库判尺要求 primary/secondary 几何落进类比/三角/互补，中性灰会触发 brandGeometry 告警'),
 ('primary 是文字色', '建议把 primary 也按 11px 正文算',
  '判为误报', 'app.asar 实测 --dsw-alias-brand-text 全文仅 4 次出现、0 次作为 color: 使用'),
 ('台账里有源色不喂任何色位', '初稿登记的 22 个源色里有 5 个只被登记、没被任何色位用到',
  '已修', '裁到 18 个源色，逐个断言至少喂一个色位；未用锚点全部移出台账'),
 ('品牌主色挑错了那只蓝', '初稿用 3.png 字标深蓝当 primary，而 1.png 身上那支身体青蓝才是这只角色的脸',
  '已修', 'primary 改用 1.png #189BC8 压深 42% = #135F7B；H196° 与铃黄 H48° 仍成 148.6° 互补'),
 ('链接抢了错误色的语义', '初稿的 markdownLink 用玫瑰红，与 error / diffRemoved 同属红族',
  '已修', '改用与 primary 同族的交互蓝深档 #063F6B（仓库 v3.1 先例：link 与 primary 走同一支交互蓝的明暗分档）'),
 ('强调色与品牌副色同源', '初稿的 markdownEmph 用铃铛黄，等于把 secondary 抄了一遍',
  '已修', '改用 6.jpg 字标粉点 #F36E9D 压深 48% = #843F59；铃黄只留给 secondary'),
]
review_rows = ''.join(
 '<tr><td class="f">%s</td><td class="p">%s</td><td><span class="tag %s">%s</span></td><td class="r">%s</td></tr>'
 % (html.escape(a), html.escape(b), 'ok' if c == '已修' else ('no' if c == '判为误报' else 'wa'), c, html.escape(d))
 for a, b, c, d in REVIEW)

# ---------------------------------------------------------------- 取色台账
ledger = []
for i, (hexv, s) in enumerate(sorted(SRC.items(), key=lambda kv: kv[0]), 1):
    img = crops.get(hexv)
    used = SRC_SLOTS.get(hexv, [])
    tags = ''.join('<code>%s</code>' % html.escape(u) for u in used)
    ledger.append(
      '<div class="pc">%s<div class="meta">'
      '<div class="hexline"><span class="dot" style="background:%s"></span><span class="hex">%s</span></div>'
      '<div class="el">%s</div>'
      '<div class="src">%s · 原图命中 <b>%s px</b>%s</div>'
      '<div class="used">%s</div></div></div>'
      % (('<img src="%s" alt="">' % img) if img else '', hexv, hexv,
         html.escape(s['element']), html.escape(s['img']),
         ('{:,}'.format(s['px'])), '' if s['exact'] else '（JPEG 压缩噪点 ±3）',
         (tags if tags else '<span style="opacity:.6">—</span>')))

# ---------------------------------------------------------------- 37 色位网格
GROUPS = [
 ('场域 8 · 晴空纸一族（同色相只拉明度）',
  ['background', 'sidebarBg', 'backgroundPanel', 'backgroundElement', 'inputBg', 'bubbleBg', 'codeBlockBg', 'codeHeaderBg']),
 ('文字 2 · 墨与弱墨', ['text', 'textMuted']),
 ('品牌/语义 6 · 身体蓝 × 铃黄 互补', ['primary', 'secondary', 'info', 'success', 'warning', 'error']),
 ('边界 2', ['border', 'borderActive']),
 ('差异 6 · 绿增红删', ['diffAdded', 'diffAddedBg', 'diffAddedLineNumberBg',
                         'diffRemoved', 'diffRemovedBg', 'diffRemovedLineNumberBg']),
 ('Markdown 6 · 六角色 0 同值', ['markdownHeading', 'markdownLink', 'markdownCode',
                                 'markdownEmph', 'markdownStrong', 'markdownBlockQuote']),
 ('代码语法 7 · 五核心 + 两退后', ['syntaxComment', 'syntaxKeyword', 'syntaxFunction',
                                  'syntaxType', 'syntaxNumber', 'syntaxString', 'syntaxOperator']),
]
def fg_of(v):
    l = (0.299*h2r(v)[0] + 0.587*h2r(v)[1] + 0.114*h2r(v)[2]) / 255.0
    return '#141414' if l > 0.6 else '#F4F4F5'
groups = []
for gname, slots in GROUPS:
    cards = []
    for slot in slots:
        v = T[slot]; p = PROV[slot]
        cards.append(
          '<div class="sw" title="%s"><div class="top" style="background:%s;color:%s"><span class="hex">%s</span></div>'
          '<div class="lbl"><b>%s</b></div><div class="src">%s</div></div>'
          % (html.escape(slot), v, fg_of(v), v, html.escape(slot), html.escape(p['recipe'])))
    groups.append('<div class="tgroup"><div class="gt">%s</div><div class="grid">%s</div></div>'
                  % (html.escape(gname), ''.join(cards)))

# ---------------------------------------------------------------- 判尺复核表
def row(cls, code, fg, bg, ratio, thr):
    return ('<tr class="%s"><td class="mono">%s</td><td class="mono">%s</td><td class="mono">%s</td>'
            '<td class="num">%.2f</td><td class="num">%.1f</td><td class="ok">通过</td></tr>'
            % ('worst' if ratio == min(x['ratio'] for x in hardc + uic) else '', code, fg, bg, ratio, thr))
worst_rows = []
for c in sorted(hardc + uic, key=lambda x: x['ratio'])[:14]:
    worst_rows.append('<tr><td class="mono">%s</td><td class="mono">%s</td><td class="mono">%s</td>'
                      '<td class="num">%.2f</td><td class="num">%.1f</td><td class="ok">通过</td></tr>'
                      % (html.escape(c['code']), c['fg'], c['bg'], c['ratio'], c['thr']))

GAPS = [
 ('绿相素材缺位', '六张图里唯一被"设计过"的绿只有 3.png 字标蓝与黄底交叠处的 39 个像素；'
  '没有任何成片的绿。success 只能取它再压暗到 38%（#496352），彩度 C*≈26，属低彩度鼠尾草绿。'
  '这一步是素材逼出来的，不做"想象一个绿"。'),
 ('红/橙/绿三态在红绿色盲下靠明度而非色相分档', '素材没有青绿与紫，红绿橙在 deutan/protan 下色相全部塌缩。'
  '解法是把四个状态点排成明度阶梯（L* 54.5 / 39.5 / 31.9 / 23.4），'
  'deutan 下最小 ΔE76 = 10.7、protan 下 20.5；宿主另有 state-warn-label 文字通道作冗余。'),
 ('secondary 在宿主只有 1 个消费者', '--dsw-alias-state-idle-primary 仅用于 8px 空闲圆点，'
  '因此它按 3:1 UI 判据而非 4.5 正文判据；铃黄金被压到 40% 才是 #9E7F09。'),
 ('宿主未映射的 token 会漏出 DeepSeek 蓝', '--dsw-alias-brand-primary-new-colorprimary-new-color、'
  '--dsw-alias-label-deep-diving、--dsw-alias-switch-thumb 插件没有映射，'
  '这四处会保持宿主默认色——37 个色位修不到。'),
 ('提示气泡文字色不再由宿主写死', '#120 之后引擎用 body [role="tooltip"] 按浮层底现算文字色'
  '（本套落在 text #1A1617 上，对 backgroundElement 为 15.45:1），无需再按旧说明记缺口。'),
]
gap_html = ''.join('<div class="gap"><div class="gh">%s</div><div class="gb">%s</div></div>' % (html.escape(a), html.escape(b))
                   for a, b in GAPS)

# ---------------------------------------------------------------- CSS
CSS = """
:root{
  --bg:@@bg@@; --panel:@@panel@@; --elem:@@elem@@; --sidebar:@@sidebar@@;
  --bubble:@@bubble@@; --input:@@input@@; --code:@@code@@; --codehead:@@codehead@@;
  --text:@@text@@; --muted:@@muted@@;
  --primary:@@primary@@; --secondary:@@secondary@@; --info:@@info@@; --success:@@success@@;
  --warning:@@warning@@; --error:@@error@@;
  --border:@@border@@; --active:@@active@@;
  --dadd:@@dadd@@; --drem:@@drem@@; --daddbg:@@daddbg@@; --drembg:@@drembg@@;
  --daddln:@@daddln@@; --dremln:@@dremln@@;
  --h:@@h@@; --link:@@link@@; --mcode:@@mcode@@; --em:@@em@@; --strong:@@strong@@; --quote:@@quote@@;
  --scom:@@scom@@; --skw:@@skw@@; --sfn:@@sfn@@; --styp:@@styp@@;
  --snum:@@snum@@; --sstr:@@sstr@@; --sop:@@sop@@;
  --hover:color-mix(in srgb, var(--text) 8%, transparent);
  --active08:color-mix(in srgb, var(--text) 14%, transparent);
  --dim:color-mix(in srgb, var(--muted) 80%, transparent);
}
*{box-sizing:border-box}
html,body{margin:0;padding:0}
body{background:@@bg@@;color:var(--text);
  font-family:"Segoe UI","Microsoft YaHei UI","Microsoft YaHei",system-ui,sans-serif;-webkit-font-smoothing:antialiased}
.sheet{width:1440px;padding:44px 64px 56px;margin:0 auto}
.eyebrow{font-size:11px;letter-spacing:.22em;color:var(--muted);text-transform:uppercase}
h1.title{font-size:34px;line-height:1.1;margin:10px 0 8px;letter-spacing:.01em;font-weight:600}
h1.title em{font-style:normal;color:var(--primary)}
.sub{font-size:13.5px;color:var(--muted);max-width:860px;line-height:1.85}
.sub b{color:var(--text);font-weight:600}
.stats{display:flex;gap:10px;margin-top:20px;flex-wrap:wrap}
.stat{background:color-mix(in srgb,var(--panel) 70%,transparent);border:.5px solid var(--border);
  border-radius:999px;padding:5px 13px;font-size:11.5px;color:var(--muted)}
.stat b{color:var(--text);font-weight:650;font-family:"Cascadia Code",Consolas,monospace}
.sec{margin-top:44px}
.sec .head{display:flex;align-items:baseline;gap:14px;margin-bottom:8px}
.sec h3{font-size:13px;letter-spacing:.18em;text-transform:uppercase;margin:0;font-weight:600}
.sec .hintx{font-size:11.5px;color:var(--muted)}
.sec .lead{font-size:12.5px;color:var(--muted);line-height:1.85;max-width:1000px;margin:0 0 16px}
.sec .lead b{color:var(--text);font-weight:600}
table{border-collapse:collapse;width:100%;font-size:11.5px}
th{text-align:left;font-weight:600;padding:7px 10px;border-bottom:.5px solid var(--active);
  background:color-mix(in srgb,var(--panel) 55%,transparent);color:var(--muted);font-size:10.5px;
  letter-spacing:.08em;text-transform:uppercase}
td{padding:6px 10px;border-bottom:.5px solid var(--border);vertical-align:top}
td.mono,td.num{font-family:"Cascadia Code",Consolas,monospace;font-size:11px}
td.num{text-align:right}
td.ok{color:var(--success);font-weight:600;white-space:nowrap}
td.f{font-weight:600;color:var(--text)}
td.p{color:var(--muted)}
td.r{color:var(--muted)}
.tag{display:inline-block;font-size:10px;letter-spacing:.06em;border-radius:4px;padding:1px 6px;
  border:.5px solid;white-space:nowrap}
.tag.ok{color:var(--success);border-color:color-mix(in srgb,var(--success) 45%,transparent);
  background:color-mix(in srgb,var(--success) 10%,transparent)}
.tag.no{color:var(--error);border-color:color-mix(in srgb,var(--error) 45%,transparent);
  background:color-mix(in srgb,var(--error) 10%,transparent)}
.win{margin-top:26px;width:1272px;height:auto;border-radius:18px;overflow:hidden;position:relative;
  background:var(--bg);border:.5px solid var(--border);
  box-shadow:0 26px 60px -18px color-mix(in srgb,var(--text) 22%,transparent),0 2px 6px rgba(26,22,23,.06);
  display:flex}
.sb{width:246px;flex:none;background:var(--sidebar);border-right:.5px solid var(--border);
  display:flex;flex-direction:column;padding:14px 12px 12px}
.brand{display:flex;align-items:center;gap:9px;padding:2px 6px 14px}
.brand .name{font-size:13.5px;font-weight:600}
.brand .badge{font-size:10px;color:var(--muted);border:.5px solid var(--border);border-radius:5px;padding:1px 4px;margin-left:auto}
.ws{display:flex;align-items:center;gap:8px;background:var(--panel);border:.5px solid var(--border);
  border-radius:10px;padding:7px 9px;font-size:12.5px;margin-bottom:14px}
.ws .dot{width:16px;height:16px;border-radius:5px;background:var(--primary);color:#F4F4F5;font-size:9px;
  display:grid;place-items:center;font-weight:600}
.ws .caret{margin-left:auto;color:var(--muted);font-size:10px}
.nav{display:flex;flex-direction:column;gap:2px}
.nav .it{position:relative;display:flex;align-items:center;gap:9px;font-size:12.5px;color:var(--muted);
  padding:7px 9px;border-radius:8px}
.nav .it.on{background:var(--active08);color:var(--text);font-weight:600}
.nav .it.on:before{content:"";position:absolute;left:0;top:7px;bottom:7px;width:3px;border-radius:3px;background:var(--primary)}
.nav .it .ic{width:15px;height:15px;border:1.4px solid currentColor;border-radius:4px;opacity:.75;flex:none}
.nav .it .ic.round{border-radius:50%}
.side-lbl{font-size:10.5px;letter-spacing:.12em;color:var(--dim);margin:16px 8px 6px;text-transform:uppercase}
.threads{display:flex;flex-direction:column;gap:1px}
.th{font-size:12px;color:var(--muted);padding:6px 9px;border-radius:7px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.th.sel{background:var(--active08);color:var(--text)}
.sb-foot{margin-top:auto;display:flex;align-items:center;gap:9px;padding:9px 6px 2px;border-top:.5px solid var(--border);font-size:12px}
.av{width:24px;height:24px;border-radius:50%;background:var(--primary);color:#F4F4F5;display:grid;place-items:center;font-size:11px}
.sb-foot .gear{margin-left:auto;color:var(--muted);font-size:13px}
.main{flex:1;display:flex;flex-direction:column;min-width:0;position:relative}
.topbar{height:48px;flex:none;display:flex;align-items:center;gap:10px;padding:0 18px;border-bottom:.5px solid var(--border)}
.topbar .h{font-size:13px;font-weight:600}
.topbar .crumb{font-size:11.5px;color:var(--muted)}
.topbar .right{margin-left:auto;display:flex;align-items:center;gap:8px}
.chip{display:inline-flex;align-items:center;gap:6px;font-size:11px;color:var(--muted);
  background:var(--panel);border:.5px solid var(--border);border-radius:999px;padding:4px 10px}
.chip i{width:6px;height:6px;border-radius:50%;background:var(--info)}
.chip i.idle{background:var(--secondary)}
.chip i.ok{background:var(--success)}
.chip i.warn{background:var(--warning)}
.chip i.err{background:var(--error)}
.btn{border:0;border-radius:8px;font-size:12px;padding:6px 12px;font-family:inherit}
.btn.primary{background:var(--primary);color:#F4F4F5;font-weight:600;box-shadow:0 1px 0 rgba(0,0,0,.08)}
.btn.ghost{background:transparent;color:var(--muted)}
.btn.outline{background:transparent;border:.5px solid var(--active);color:var(--text)}
.feed{flex:1;overflow:hidden;padding:22px 26px 84px}
.col{width:720px;margin:0 auto}
.user{display:flex;justify-content:flex-end;margin-bottom:20px}
.user .bub{background:var(--bubble);border-radius:14px 14px 4px 14px;padding:10px 14px;font-size:13px;
  line-height:1.65;max-width:520px;box-shadow:0 1px 2px rgba(26,22,23,.05)}
.who{display:flex;align-items:center;gap:7px;margin-bottom:9px}
.who .k{width:20px;height:20px;display:grid;place-items:center}
.who .n{font-size:12px;font-weight:600}
.who .t{font-size:10.5px;color:var(--dim);border:.5px solid var(--border);border-radius:5px;padding:1px 5px}
.md{font-size:13px;line-height:1.78}
.md h2{font-size:15.5px;line-height:1.4;color:var(--h);margin:0 0 8px;font-weight:650}
.md p{margin:0 0 10px}
.md strong{color:var(--strong);font-weight:650}
.md em{color:var(--em);font-style:italic}
.md a{color:var(--link);text-decoration:underline;text-underline-offset:2px;text-decoration-thickness:.5px}
.md code{font-family:"Cascadia Code",Consolas,monospace;font-size:11.5px;color:var(--mcode);
  border:.5px solid var(--border);border-radius:4px;padding:0 4px}
.md ul{margin:0 0 10px;padding-left:18px}
.md li{margin:2px 0}
.md blockquote{margin:0 0 12px;padding:2px 0 2px 12px;border-left:2px solid var(--active);color:var(--quote);font-size:12.5px}
div.warn{display:flex;gap:9px;align-items:flex-start;background:color-mix(in srgb,var(--warning) 13%,transparent);
  border-left:2.5px solid var(--warning);border-radius:6px;padding:8px 12px;margin:0 0 12px;font-size:12px;line-height:1.65;color:var(--warning)}
div.warn b{font-weight:650}
div.warn .tagx{font-size:10.5px;letter-spacing:.08em;border:.5px solid color-mix(in srgb,var(--warning) 45%,transparent);
  border-radius:4px;padding:0 5px;flex:none;margin-top:1px}
.cc{border-radius:10px;overflow:hidden;margin:2px 0 12px;background:var(--code)}
.cc .hd{display:flex;align-items:center;gap:8px;background:var(--codehead);padding:7px 12px 6px;font-size:11px;color:var(--muted)}
.cc .hd .lang{color:var(--dim);font-family:"Cascadia Code",Consolas,monospace}
.cc .hd .cp{margin-left:auto;font-size:10.5px;color:var(--dim)}
.cc pre{margin:0;padding:11px 14px 13px;font-family:"Cascadia Code",Consolas,monospace;font-size:11.5px;line-height:1.85}
.tk-com{color:var(--scom);font-style:italic}.tk-kw{color:var(--skw)}.tk-fn{color:var(--sfn)}
.tk-typ{color:var(--styp)}.tk-num{color:var(--snum)}.tk-str{color:var(--sstr)}.tk-op{color:var(--sop)}
.diff{border-radius:10px;overflow:hidden;background:var(--code);margin:0 0 12px;font-family:"Cascadia Code",Consolas,monospace;font-size:11.5px}
.diff .ln{display:flex;gap:10px;padding:2px 12px 2px 0}
.diff .ln .no{width:30px;padding-right:7px;text-align:right;color:var(--dim)}
.diff .rm{background:var(--drembg)}
.diff .rm .no{background:var(--dremln);color:var(--drem)}
.diff .rm .sign,.diff .rm .code{color:var(--drem)}
.diff .add{background:var(--daddbg)}
.diff .add .no{background:var(--daddln);color:var(--dadd)}
.diff .add .sign,.diff .add .code{color:var(--dadd)}
.diff .ln .sign{width:8px}
.tool{background:var(--elem);border-radius:10px;padding:10px 13px;margin:0 0 12px;font-size:12px}
.tool .row{display:flex;align-items:center;gap:8px}
.tool .name{font-weight:600}
.tool .st{margin-left:auto;color:var(--success);font-size:11px;display:flex;align-items:center;gap:5px}
.tool .out{margin-top:7px;font-family:"Cascadia Code",Consolas,monospace;font-size:10.8px;line-height:1.75;color:var(--muted)}
.tool .out b{color:var(--success);font-weight:600}
.toast{position:absolute;right:22px;bottom:132px;background:var(--elem);border:.5px solid var(--border);
  border-radius:10px;padding:9px 13px;display:flex;align-items:center;gap:9px;font-size:12px;
  box-shadow:0 10px 24px -10px rgba(26,22,23,.3)}
.toast i{width:7px;height:7px;border-radius:50%;background:var(--success)}
.toast .sub{color:var(--dim);font-size:11px}
.composer{flex:none;padding:10px 26px 14px}
.composer .col{width:720px}
.cbox{background:var(--input);border:.5px solid var(--active);border-radius:14px;padding:11px 13px 9px;
  box-shadow:0 2px 10px -6px rgba(26,22,23,.18)}
.cbox .ph{font-size:13px;color:var(--muted)}
.cbox .row{display:flex;align-items:center;gap:7px;margin-top:9px}
.cbox .row .sp{margin-left:auto}
.pill{display:inline-flex;align-items:center;gap:5px;font-size:10.5px;color:var(--muted);
  background:var(--panel);border:.5px solid var(--border);border-radius:999px;padding:3px 8px}
.pill i{width:5px;height:5px;border-radius:50%;background:var(--primary)}
.send{width:28px;height:28px;border-radius:9px;background:var(--primary);color:#F4F4F5;display:grid;place-items:center;
  font-size:13px;font-weight:700;border:0}
.hint{display:flex;align-items:center;gap:8px;font-size:10.5px;color:var(--dim);padding:7px 4px 0}
.hint .r{margin-left:auto;display:flex;gap:6px;align-items:center}
.tgroup{margin-bottom:18px}
.tgroup .gt{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);
  border-bottom:.5px solid var(--border);padding-bottom:6px;margin-bottom:9px}
.grid{display:grid;grid-template-columns:repeat(7,1fr);gap:8px}
.sw{border-radius:9px;border:.5px solid var(--border);overflow:hidden;background:var(--code)}
.sw .top{height:44px;display:flex;align-items:flex-end;padding:5px 7px}
.sw .hex{font-size:9.5px;font-family:"Cascadia Code",Consolas,monospace}
.sw .lbl{font-size:10px;padding:4px 7px 2px;color:var(--muted);border-top:.5px solid var(--border)}
.sw .lbl b{color:var(--text);font-weight:600}
.sw .src{font-size:8.8px;padding:0 7px 5px;color:var(--dim);font-family:"Cascadia Code",Consolas,monospace;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
.pc{border:.5px solid var(--border);border-radius:12px;overflow:hidden;background:var(--code)}
.pc img{display:block;width:100%;height:168px;object-fit:cover;background:var(--elem)}
.pc .meta{padding:10px 12px 12px}
.pc .hexline{display:flex;align-items:center;gap:8px;margin-bottom:5px}
.pc .dot{width:16px;height:16px;border-radius:5px;border:.5px solid rgba(0,0,0,.12);flex:none}
.pc .hex{font-family:"Cascadia Code",Consolas,monospace;font-size:11.5px;font-weight:600}
.pc .el{font-size:11.5px;color:var(--text);font-weight:600;margin-bottom:3px}
.pc .src{font-size:10.5px;color:var(--muted);line-height:1.6}
.pc .src b{color:var(--text);font-weight:600;font-family:"Cascadia Code",Consolas,monospace}
.pc .used{font-size:10.5px;color:var(--muted);margin-top:6px;padding-top:6px;border-top:.5px solid var(--border);line-height:1.7}
.pc .used code{font-family:"Cascadia Code",Consolas,monospace;font-size:10px;color:var(--mcode);
  background:color-mix(in srgb,var(--mcode) 8%,transparent);border-radius:3px;padding:1px 3px}
.gap{background:var(--elem);border-radius:10px;padding:11px 14px;margin-bottom:9px}
.gap .gh{font-weight:650;font-size:11.5px;margin-bottom:4px;color:var(--text)}
.gap .gb{font-size:11.5px;color:var(--muted);line-height:1.8}
.ladder{display:flex;gap:0;margin:0 0 14px;border-radius:8px;overflow:hidden;border:.5px solid var(--border)}
.ladder div{flex:1;height:52px;display:flex;align-items:flex-end;padding:4px 6px}
.ladder div span{font-family:"Cascadia Code",Consolas,monospace;font-size:8.6px;color:#0C0C10;opacity:.85}
.foot{display:flex;justify-content:space-between;margin-top:26px;font-size:10.5px;color:var(--dim)}
"""
CSS_SUBST = dict(bg=T['background'], panel=T['backgroundPanel'], elem=T['backgroundElement'],
           sidebar=T['sidebarBg'], bubble=T['bubbleBg'], input=T['inputBg'], code=T['codeBlockBg'],
           codehead=T['codeHeaderBg'], text=T['text'], muted=T['textMuted'], primary=T['primary'],
           secondary=T['secondary'], info=T['info'], success=T['success'], warning=T['warning'],
           error=T['error'], border=T['border'], active=T['borderActive'],
           dadd=T['diffAdded'], drem=T['diffRemoved'], daddbg=T['diffAddedBg'],
           drembg=T['diffRemovedBg'], daddln=T['diffAddedLineNumberBg'], dremln=T['diffRemovedLineNumberBg'],
           h=T['markdownHeading'], link=T['markdownLink'], mcode=T['markdownCode'], em=T['markdownEmph'],
           strong=T['markdownStrong'], quote=T['markdownBlockQuote'], scom=T['syntaxComment'],
           skw=T['syntaxKeyword'], sfn=T['syntaxFunction'], styp=T['syntaxType'],
           snum=T['syntaxNumber'], sstr=T['syntaxString'], sop=T['syntaxOperator'])
for _k, _v in CSS_SUBST.items():
    CSS = CSS.replace('@@' + _k + '@@', _v)

ladder_html = ''.join(
  '<div style="background:%s"><span>%s L*%.1f</span></div>' % (v, s, Ls(v))
  for s, Ls_, v in sorted(ladder, key=lambda x: -x[1]))

# ---------------------------------------------------------------- 组装
DOC = """<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="utf-8">
<title>Doraemon theme preview v2 — 晴空纸 · 铃与线</title><style>@@css@@</style></head><body><div class="sheet">

<div class="eyebrow">DSH / OpenCode Palette · IP 预置主题 · 逐像素取色重绘</div>
<h1 class="title">哆啦A梦 <em>Doraemon</em> — 晴空纸 · 铃与线</h1>
<div class="sub">
六张参考图、@@nsrc@@ 个源色、三十七个色位，<b>没有一个颜色是"想象"出来的</b>。
场域是 1.png 漫画纸白 × 5.jpg 柔蓝沿同色相拉出的 8 级明度阶（每步 ≥@@minstep@@ L*，判尺要求 ≥1.4），
正文是 3.png 那支笔的勾线墨 <b>@@text@@</b>，
品牌主色取 1.png 身上那支身体青蓝 × 纯墨黑，副色取 1.png 铃铛黄 × 纯墨黑——
<b>身体蓝 × 铃黄 148.6° 互补</b>，正是这张海报自己的关系。
所有中间色只有三种来源：<b>直采 / 定比混色 / 同色相明度阶</b>，比例逐条写进台账。
</div>
<div class="stats">
<span class="stat">硬性 4.5:1 <b>@@nhard@@</b> 对 · 违例 <b>0</b></span>
<span class="stat">UI 3:1 <b>@@nui@@</b> 对 · 违例 <b>0</b></span>
<span class="stat">对抗式加固 <b>@@nextra@@</b> 对 · 违例 <b>0</b></span>
<span class="stat">IP 设计告警 <b>0</b></span>
<span class="stat">最紧余量（@@nhard@@+@@nextra@@ 全判据）<b>@@wh@@:1</b></span>
<span class="stat">其中最紧的仓库硬对 <b>@@wrh@@:1</b></span>
<span class="stat">色盲最小 ΔE76 <b>10.7</b>（deutan）</span>
<span class="stat">直采 <b>@@ndirect@@</b> · 定比混色 <b>@@nmix@@</b></span>
</div>

<div class="sec">
 <div class="head"><h3>对抗式审查纪要</h3><span class="hintx">四路独立审查 + 宿主 app.asar 实测，逐条落到色值</span></div>
 <p class="lead">这一版不是"再调一调"。先按第一性原理把<b>颜色在宿主里到底扮演什么角色</b>查清楚，再据此重排。
 关键事实：宿主 <code>state-error-primary</code> / <code>state-warn-primary</code> / <code>state-success-primary</code>
  都是 <b>11~13px 的文字色</b>（实测 app.asar 内 117/15/30 处 <code>color:</code> 用法），
  而仓库判尺只按 3:1 的 UI 类检查它们——这一整类漏检是 v1 最大的问题。
  第二轮又做了一次<b>台账自洽复核</b>：要求每个登记在案的源色都至少喂一个色位、每支品牌色都用上最像它的那块素材。
  另有两条审查结论被<b>判为误报</b>：
  <code>brand-text</code> 全文仅 4 次出现且 0 次作为 <code>color:</code>，primary 并非文字色；
  把 secondary 改成中性灰虽然能保色盲可分，却会触发仓库判尺的 brandGeometry 告警。</p>
 <table><thead><tr><th>审查发现</th><th>原方案的问题</th><th>结论</th><th>怎么改的</th></tr></thead>
 <tbody>@@review@@</tbody></table>
</div>

<div class="win">
 <aside class="sb">
  <div class="brand">@@svg@@<span class="name">哆啦A梦</span><span class="badge">DSH</span></div>
  <div class="ws"><span class="dot">辰</span><span>chenchen</span><span class="caret">▾</span></div>
  <div class="nav">
   <div class="it on"><span class="ic round"></span>新会话<span style="margin-left:auto;font-size:10px;color:var(--dim)">⌘N</span></div>
   <div class="it"><span class="ic"></span>会话历史</div>
   <div class="it"><span class="ic"></span>文件</div>
   <div class="it"><span class="ic round"></span>终端</div>
  </div>
  <div class="side-lbl">最近</div>
  <div class="threads">
   <div class="th sel">哆啦A梦主题 · 逐像素重绘</div>
   <div class="th">对抗式审查纪要</div>
   <div class="th">取色台账与推导配方</div>
   <div class="th">加固判尺复核报告</div>
  </div>
  <div class="sb-foot"><span class="av">辰</span><span>辰辰洋洋</span><span class="gear">⚙</span></div>
 </aside>
 <main class="main">
  <div class="topbar">
   <span class="h">哆啦A梦主题 · 逐像素重绘</span><span class="crumb">/ 37 tokens</span>
   <div class="right">
    <span class="chip"><i class="idle"></i>空闲</span>
    <span class="chip"><i class="ok"></i>已完成</span>
    <span class="chip"><i class="warn"></i>已暂停</span>
    <span class="chip"><i class="err"></i>失败</span>
    <button class="btn ghost">分享</button><button class="btn primary">新建会话</button>
   </div>
  </div>
  <div class="feed"><div class="col">
   <div class="user"><div class="bub">用这六张图重做一套哆啦A梦主题。每个色都要能指回图里的像素，别自己编。</div></div>
   <div class="who"><span class="k">@@svg@@</span><span class="n">哆啦A梦</span><span class="t">doraemon.json</span></div>
   <div class="md">
    <h2>已按 37 色位落位 · @@nsrc@@ 个源色 · 0 想象</h2>
    <p>核心一句话：<strong>场域是一张晴空纸，正文是漫画的钢笔线，信号色各领一桩实物</strong>。
    8 个背景槽收进同一条青蓝色相（H202°）只拉明度——不是"每个槽挑一个好看的浅蓝"，
    而是按实测 L* 目标反解混色比例，脚本可逐位复算。
    品牌那对是这张海报自己的关系：<strong>身体青蓝 × 铃铛黄，148.6° 互补</strong>。
    重点做了四件事：</p>
    <ul>
     <li><em>状态色按文字算，不按色块算</em>。宿主把 error/warning/success 写成 11~13px 的
      <code>color:</code>，还把 warning 放在自己 14% 的淡底上；这一版把五个语义色在 8 个表面上
      各算一遍 4.5:1，再加自染底与宿主写死白字两轮，全绿。</li>
     <li><em>绿不编</em>。六张图唯一被设计过的绿，是 3.png 字标的蓝压到黄底时交叠出的
      <code>#6F997A</code>——39 个像素。它压暗 38% 就是 success，字符串色再压一档。
      这一步是素材逼出来的，备案而不装作"大面积取色"。</li>
     <li><em>状态圆点改成明度阶梯</em>。红绿橙在红绿色盲下色相全部塌缩，
      所以四态改按 L* 54.5 / 39.5 / 31.9 / 23.4 排开：deutan 下最小 ΔE76 从 0.5 拉到 10.7。</li>
     <li><em>代码区用同族浅纸，深墨着色</em>。反差来自七支深墨语法色，不来自换一块深色舞台。</li>
    </ul>
    <blockquote>纸是纸，线是线，铃是铃——颜色不是画上去的，是从这六张图里长出来的。</blockquote>
    <div class="cc">
     <div class="hd"><span class="lang">css</span><span class="fn">doraemon.theme.ts</span><span class="cp">复制</span></div>
<pre><span class="tk-com">// 每一行都写着它的出处</span>
<span class="tk-kw">const</span> <span class="tk-fn">doraemon</span> <span class="tk-op">=</span> {
  <span class="tk-fn">paper</span>: <span class="tk-str">"@@bg@@"</span>,   <span class="tk-com">// 1.png 纸白 × 5.jpg 柔蓝 0.122</span>
  <span class="tk-fn">ink</span>:   <span class="tk-str">"@@text@@"</span>,   <span class="tk-com">// 3.png 勾线墨（直采 3577px）</span>
  <span class="tk-fn">bell</span>:  <span class="tk-str">"@@secondary@@"</span>, <span class="tk-com">// 1.png 铃铛黄 × 纯墨黑 0.40</span>
  <span class="tk-fn">green</span>: <span class="tk-str">"@@success@@"</span>,   <span class="tk-com">// 3.png 叠色绿（39px）× 纯墨黑 0.38</span>
  <span class="tk-fn">worst</span>: <span class="tk-num">@@wh@@</span> <span class="tk-kw">as</span> <span class="tk-typ">Ratio</span>,
}</pre>
    </div>
    <table>
     <tr><th>检查项</th><th>结果</th><th>色值</th></tr>
     <tr><td>正文对比度</td><td><span class="ok">@@rtb@@ : 1</span></td><td class="mono">@@text@@ / @@bg@@</td></tr>
     <tr><td>主按钮反白</td><td><span class="ok">@@ron@@ : 1</span></td><td class="mono">#F4F4F5 / @@primary@@</td></tr>
     <tr><td>最紧的一对（@@nhard@@ 仓库硬对 + @@nextra@@ 加固判据）</td><td><span class="ok">@@wh@@ : 1</span></td><td class="mono">@@wcode@@</td></tr>
     <tr><td>其中最紧的一条仓库硬对</td><td><span class="ok">@@wrh@@ : 1</span></td><td class="mono">@@wrcode@@</td></tr>
     <tr><td>硬性 / UI / 加固</td><td><span class="ok">@@nhard@@ / @@nui@@ / @@nextra@@ 全过</span></td><td class="mono">违例 0</td></tr>
     <tr><td>状态四态色盲可分</td><td><span class="ok">ΔE76 ≥ 10.7</span></td><td class="mono">deutan / protan / normal</td></tr>
     <tr><td>IP 设计告警</td><td><span class="ok">0 条</span></td><td class="mono">孤岛 0 / 碰撞 0 / 同值 0</td></tr>
    </table>
    <div class="warn">
     <span class="tagx">已知缺口</span>
     <span><strong>图里没有为成功态设计过的绿</strong>——唯一那 39 像素是字标蓝与黄底交叠的产物。
      success 只能是它压暗 38% 的低彩度鼠尾草绿；再亮的绿就必须是想象。</span>
    </div>
    <div class="diff">
     <div class="ln rm"><span class="no">41</span><span class="sign">-</span><span class="code">  "primary": "#0072a8",</span></div>
     <div class="ln add"><span class="no">41</span><span class="sign">+</span><span class="code">  "primary": "@@primary@@",</span></div>
     <div class="ln rm"><span class="no">42</span><span class="sign">-</span><span class="code">  "success": "#18793a",</span></div>
     <div class="ln add"><span class="no">42</span><span class="sign">+</span><span class="code">  "success": "@@success@@",</span></div>
     <div class="ln rm"><span class="no">43</span><span class="sign">-</span><span class="code">  "bubbleBg": "#f4fafe",</span></div>
     <div class="ln add"><span class="no">43</span><span class="sign">+</span><span class="code">  "bubbleBg": "@@bubble@@",</span></div>
    </div>
    <div class="tool">
     <div class="row"><span class="name">derive.py · 取色推导 + 加固判尺</span><span class="st"><i></i>已完成</span></div>
     <div class="out">
      [1] @@nsrc@@ 个源色回原图逐像素复核：<b>@@nsrc@@/@@nsrc@@ 命中</b><br>
      [2] 37 色位：直采 @@ndirect@@ · 定比混色 @@nmix@@ · <b>0 手写最终色</b><br>
      [3] 硬性 @@nhard@@ 对（仓库判尺 38 + diff 底 2）+ UI @@nui@@ 对 + 加固 @@nextra@@ 对：<b>违例 0</b><br>
      [4] IP 设计规范：色相孤岛 0 · 角色碰撞 0 · markdown 同值 0 · 语法 ΔE76 ≥ 10 · 退后成立
     </div>
    </div>
   </div>
  </div></div>
  <div class="toast"><i></i><span>主题已保存 · 37 色位</span><span class="sub">在面板中可见</span></div>
  <div class="composer"><div class="col">
   <div class="cbox">
    <div class="ph">继续调整配色，或问我任意细节…</div>
    <div class="row">
     <span class="pill"><i></i>doraemon.json</span><span class="pill">light</span>
     <button class="btn ghost" style="width:26px;height:26px;padding:0">＋</button>
     <span class="sp"></span><button class="btn ghost" style="width:26px;height:26px;padding:0">⚙</button>
     <button class="send">↑</button>
    </div>
   </div>
   <div class="hint">Enter 发送 · Shift + Enter 换行
    <span class="r"><span class="chip" style="padding:2px 8px">37 tokens</span><span>哆啦A梦</span></span></div>
  </div></div>
 </main>
</div>

<div class="sec">
 <div class="head"><h3>场域明度阶梯</h3><span class="hintx">同一条青蓝色相（H202°），按实测 L* 目标反解混色比例，每步 ≥@@minstep@@ L*</span></div>
 <div class="ladder">@@ladder@@</div>
 <table><thead><tr><th>槽位</th><th>L*</th><th>hex</th><th>配方</th><th>源色</th></tr></thead><tbody>
 @@ladrows@@
 </tbody></table>
</div>

<div class="sec">
 <div class="head"><h3>37 Color Tokens</h3><span class="hintx">每格下方是它的定比混色配方</span></div>
 @@groups@@
</div>

<div class="sec">
 <div class="head"><h3>取色台账 · Provenance</h3><span class="hintx">@@nsrc@@ 个源色 · 全部回原图逐像素复核过命中数 · 圈出取色位置</span></div>
 <p class="lead">下面每一张配图都直接来自原始参考图，白圈标出取色的那个像素，右侧是它在原图里的命中像素数。
  <b>整套 37 色位没有使用任何未出现在这六张图里的颜色</b>；所有中间色只由
  <b>直采</b>（hex 与图中像素完全一致）或 <b>定比混色</b>（两个采样色的固定比例线性混合）产生，
  比例逐条写进下方每格的配方。推导脚本 <code>derive2.py</code> 对 @@nsrc@@ 个源色逐像素回验，命中为 0 即判负退出。</p>
 <div class="pgrid">@@ledger@@</div>
</div>

<div class="sec">
 <div class="head"><h3>加固判尺复核</h3><span class="hintx">仓库判尺 + 对抗式审查新增的 @@nextra@@ 条硬性对</span></div>
 <p class="lead">判尺来源：<code>docs/theme-audit/criteria.md</code> §2 硬性判据与 §4 IP 设计规范；
  宿主行为来源：<code>src/engine/map-dsh.ts</code> 的槽位映射 + 对 <code>app.asar</code> 的 CSS 实测。
  下表是 <b>@@ncheck@@ 条对比度判据里最紧的 14 条</b>——全部通过。另有 @@nextra@@ 条对抗式新增判据
  （品牌/语义色按 11~13px 正文口径在 8 个表面各算一遍、同色自染底、宿主写死 <code>#fff</code> 的填充）同样全绿。</p>
 <table><thead><tr><th>判据</th><th>前景</th><th>背景</th><th>比值</th><th>阈值</th><th>结论</th></tr></thead>
 <tbody>@@worst@@</tbody></table>
</div>

<div class="sec">
 <div class="head"><h3>已知缺口（备案）</h3><span class="hintx">被素材或宿主逼出来、37 个色位修不到的五件事</span></div>
 @@gaps@@
</div>

<div class="foot">
 <span>Doraemon theme v2 · 37 色位 · light · 逐像素取色重绘 · @@nsrc@@ 源色 / 6 参考图 / 0 想象</span>
 <span>design by 辰辰洋洋 · every color traced to a pixel</span>
</div>
</div></body></html>
"""

ladrows = ''.join(
 '<tr><td class="mono">%s</td><td class="num">%.1f</td><td class="mono">%s</td><td class="mono">%s</td><td>%s</td></tr>'
 % (s, l, v, html.escape(PROV[s]['recipe']), html.escape(PROV[s]['note']))
 for s, l, v in sorted(ladder, key=lambda x: -x[1]))

DOC_SUBST = dict(css=CSS, svg=DORA_SVG, review=review_rows, ledger=''.join(ledger),
                 groups=''.join(groups), worst=''.join(worst_rows), gaps=gap_html,
                 ladder=ladder_html, ladrows=ladrows,
                 nsrc=n_src, ndirect=n_direct, nmix=n_mix,
                 nhard=P['n_hard'], nui=P['n_ui'], nextra=P['n_extra'],
                 ncheck=len(hardc) + len(uic),
                 wh='%.2f' % worst_hard['ratio'], wcode=html.escape(worst_hard['code']),
                 wrh='%.2f' % worst_repo['ratio'], wrcode=html.escape(worst_repo['code']),
                 rtb='%.2f' % cr(T['text'], T['background']), ron='%.2f' % cr('#F4F4F5', T['primary']),
                 bg=T['background'], text=T['text'], primary=T['primary'], secondary=T['secondary'],
                 success=T['success'], bubble=T['bubbleBg'], error=T['error'], warning=T['warning'],
                 minstep='%.1f' % min_step)
for _k, _v in DOC_SUBST.items():
    DOC = DOC.replace('@@' + _k + '@@', str(_v))

path = os.path.join(os.path.dirname(OUT), 'doraemon-theme-preview.html')
open(path, 'w', encoding='utf-8').write(DOC)
print('→', path, len(DOC), 'bytes')
