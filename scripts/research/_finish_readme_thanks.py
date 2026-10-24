# -*- coding: utf-8 -*-
"""收尾 README/致谢任务：QQ 群图转 PNG、未引用截图归档、测试断言对齐新 CONNECT。"""
import io
import os
import shutil

from PIL import Image

ROOT = r"D:\dsh-plugin\dsh-opencode-palette"
os.chdir(ROOT)

# 1) jpg -> png
jpg = os.path.join(ROOT, "assets", "contact-qq-permanent.jpg")
png = os.path.join(ROOT, "assets", "contact-qq-permanent.png")
Image.open(jpg).convert("RGB").save(png, "PNG", optimize=True)
print("converted", os.path.getsize(png))
os.remove(jpg)

# 2) README 引用替换
for p in ("README.md", "docs/README.en.md"):
    s = io.open(p, encoding="utf-8").read()
    assert "contact-qq-permanent.jpg" in s, p
    s = s.replace("contact-qq-permanent.jpg", "contact-qq-permanent.png")
    io.open(p, "w", encoding="utf-8", newline="\n").write(s)
    print("patched", p)

# 3) 未引用截图归档（不删除）
drafts = os.path.join(ROOT, "docs", "research", "assets-drafts")
os.makedirs(drafts, exist_ok=True)
for name in ("中文-目前支持主题-IP预置.png", "中文-目前支持主题-opencode.png"):
    src = os.path.join(ROOT, "assets", name)
    if os.path.exists(src):
        shutil.move(src, os.path.join(drafts, name))
        print("moved", name)

# 4) 测试断言对齐新 CONNECT（三张群码）
p = "tests/readme-head-tail.test.ts"
s = io.open(p, encoding="utf-8").read()
old = """  assert.ok(ZH.includes('src="assets/feishu-qr.png"'), '中文页二维码路径在场（文件名沿用，内容已换成群码）')
  assert.ok(EN.includes('src="../assets/feishu-qr.png"'), '英文页二维码路径在场')"""
new = """  for (const qr of ['contact-feishu-permanent.png', 'contact-qq-permanent.png', 'contact-wechat-weekly.png']) {
    assert.ok(ZH.includes(`src="assets/${qr}"`), `中文页群码路径在场：${qr}`)
    assert.ok(EN.includes(`src="../assets/${qr}"`), `英文页群码路径在场：${qr}`)
  }"""
assert old in s, "QR assertions not found"
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("patched", p)
print("DONE")
