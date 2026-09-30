import markdown, pathlib, html, datetime
root = pathlib.Path(r"D:\dsh-plugin\dsh-opencode-palette")
src = root / "docs/research/dsh-text-fontsize-inventory.md"
dst = root / "docs/research/dsh-text-fontsize-inventory.html"
text = src.read_text(encoding="utf-8")
body = markdown.markdown(text, extensions=["tables","toc","fenced_code","sane_lists","md_in_html","attr_list"], output_format="html5")
now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
page = """<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>DSH 文字/字号项穷举清单 — 深度报告</title>
<style>
:root{color-scheme:light dark;--bg:#fff;--fg:#1a1a1a;--muted:#666;--line:#e5e5e5;--card:#f7f7f8;--accent:#0b5fff;--code:#f2f2f3}
@media(prefers-color-scheme:dark){:root{--bg:#151517;--fg:#e8e8ea;--muted:#a7a7ad;--line:#2c2c2e;--card:#1e1e20;--accent:#7aaaff;--code:#232326}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.75 -apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif}
.wrap{max-width:1080px;margin:0 auto;padding:28px 22px 80px}
.hero{border:1px solid var(--line);background:var(--card);border-radius:14px;padding:22px 22px 16px;margin-bottom:22px}
.hero h1{margin:0 0 8px;font-size:24px;line-height:1.4}
.meta{color:var(--muted);font-size:13px;display:flex;gap:14px;flex-wrap:wrap}
.badges{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0 4px}
.badge{border:1px solid var(--line);border-radius:999px;padding:3px 12px;font-size:13px;background:var(--bg)}
.badge b{font-size:14px}
.toc{border:1px solid var(--line);border-radius:12px;padding:14px 18px;margin:18px 0;background:var(--bg)}
.toc h2{font-size:15px;margin:0 0 8px}
.toc ul{margin:6px 0;padding-left:20px}
article h1{font-size:22px;border-bottom:2px solid var(--line);padding-bottom:8px;margin-top:34px}
article h2{font-size:19px;margin-top:30px;border-bottom:1px solid var(--line);padding-bottom:6px}
article h3{font-size:16px;margin-top:24px}
article table{width:100%;border-collapse:collapse;margin:14px 0;font-size:13.5px;line-height:1.6;display:block;overflow-x:auto}
article thead th{position:sticky;top:0;background:var(--card);white-space:nowrap}
article th,article td{border:1px solid var(--line);padding:8px 10px;vertical-align:top;text-align:left}
article tbody tr:nth-child(odd){background:rgba(127,127,127,.06)}
article code{font-family:"SF Mono","JetBrains Mono","Fira Code",Consolas,Menlo,monospace;font-size:.86em;background:var(--code);padding:1px 6px;border-radius:6px;word-break:break-all}
article pre{background:#0f0f11;color:#e8e8ea;border-radius:12px;padding:14px 16px;overflow:auto;font-size:12.5px;line-height:1.65}
article pre code{background:transparent;color:inherit;padding:0}
article blockquote{border-left:4px solid var(--accent);margin:14px 0;padding:8px 14px;background:var(--card);border-radius:0 10px 10px 0;color:inherit}
.top{position:fixed;right:18px;bottom:18px;border:1px solid var(--line);background:var(--card);color:var(--fg);border-radius:999px;padding:8px 14px;font-size:13px;text-decoration:none}
.foot{color:var(--muted);font-size:12.5px;border-top:1px solid var(--line);margin-top:30px;padding-top:12px}
a{color:var(--accent)}
@media print{.top{display:none}.wrap{max-width:none}}
</style>
</head>
<body>
<div class="wrap">
<div class="hero">
<h1>DSH 文字/字号项穷举清单 — 深度报告</h1>
<div class="meta"><span>生成时间：__NOW__</span><span>底稿：docs/research/dsh-text-fontsize-inventory.md</span><span>一手来源：DSH 安装包源码 + README + CSS/JS</span></div>
<div class="badges"><span class="badge">官方可改 <b>14</b> 项</span><span class="badge">官方不可改 <b>12</b> 项</span><span class="badge">插件通道 <b>9</b> 项</span><span class="badge">合计 <b>35</b> 行</span></div>
</div>
<article>
__BODY__
</article>
<div class="foot">底稿 Markdown 与本 HTML 同目录保存；打印/另存 PDF可直接用浏览器打印。本报告每条结论均回溯到 D:\\DSH NEXT\\resources\\app 内一手文件，缺失项已如实标注。</div>
</div>
<a class="top" href="#">回到顶部</a>
</body>
</html>"""
page = page.replace("__NOW__", now).replace("__BODY__", body)
dst.write_text(page, encoding="utf-8")
print(f"wrote {dst} bytes={dst.stat().st_size}")
