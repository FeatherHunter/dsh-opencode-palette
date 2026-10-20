#!/usr/bin/env python3
"""扫描一个 DSH web 实例的首屏 DOM / CSSOM，产出「可变外观要素」原始数据。

为什么需要：宿主 CSS Modules 的类名在构建期被哈希（`[hash]_[local]`），很多事实
（实际出现的变量名、data-* 属性、inline style 点、哈希类名）只能从运行时 DOM 拿到。

用法（先起一个带 token 的 web 实例）：
    & "D:\\DeepseekHarness\\resources\\runtime\\cli\\bin\\dsh.cmd" web --port 0 --no-open
    # 输出形如：dsh web: http://127.0.0.1:62794/?token=<launch-token>
    python scripts/research/scan-dsh-web-dom.py "http://127.0.0.1:62794/?token=..." scan.json

依赖：Python 3 + playwright（headless Chromium）。
限制：只覆盖 web 版、当前屏幕；跨域 iframe 内部扫不到；token 每次启动都变。

产出 JSON 顶层字段：
    tagCounts / elementCount
    classes / classCount            哈希类名清单（含出现次数）
    dataAttrs                        data-* 属性清单（含值分布）
    roles / ariaAttrs
    inlineStyle                     带 inline style 的元素及自定义属性名
    sheetCount / ruleCount
    tokenNames                      全部 CSS 变量名：decls（声明数）/ consumers（var() 消费数）
    tokenUsageSample                token -> 消费方选择器样本
    bodyTokenSample                 body / html 上的关键 token 计算值
    bodyAttrs / documentElementAttrs / title / bodyFont / bodyFontSize / colorScheme
"""

import json
import sys

from playwright.sync_api import sync_playwright

JS = r"""
() => {
  const out = {};
  const all = Array.from(document.querySelectorAll('*'));

  // 1. tags
  const tags = {};
  for (const el of all) tags[el.tagName.toLowerCase()] = (tags[el.tagName.toLowerCase()]||0)+1;
  out.tagCounts = tags;
  out.elementCount = all.length;

  // 2. classes: unique class strings
  const classCounts = {};
  for (const el of all) {
    const cls = el.getAttribute('class');
    if (!cls) continue;
    for (const c of cls.split(/\s+/)) if (c) classCounts[c] = (classCounts[c]||0)+1;
  }
  out.classCount = Object.keys(classCounts).length;
  out.classes = Object.entries(classCounts).sort((a,b)=>b[1]-a[1]);

  // 3. data attributes inventory
  const dataAttrs = {};
  for (const el of all) {
    for (const a of el.attributes) {
      if (!a.name.startsWith('data-')) continue;
      const rec = dataAttrs[a.name] || (dataAttrs[a.name] = {count:0, values:{}});
      rec.count++;
      const v = a.value.length > 60 ? a.value.slice(0,60)+'…' : a.value;
      rec.values[v] = (rec.values[v]||0)+1;
    }
  }
  for (const k of Object.keys(dataAttrs)) {
    const vals = Object.entries(dataAttrs[k].values).sort((a,b)=>b[1]-a[1]);
    dataAttrs[k].values = Object.fromEntries(vals.slice(0,8));
    dataAttrs[k].distinctValues = vals.length;
  }
  out.dataAttrs = dataAttrs;

  // 4. roles / aria
  const roles = {}, ariaAttrs = {};
  for (const el of all) {
    const r = el.getAttribute('role');
    if (r) roles[r] = (roles[r]||0)+1;
    for (const a of el.attributes) if (a.name.startsWith('aria-')) ariaAttrs[a.name]=(ariaAttrs[a.name]||0)+1;
  }
  out.roles = roles; out.ariaAttrs = ariaAttrs;

  // 5. inline style elements
  const inline = [];
  for (const el of all) {
    const s = el.getAttribute('style');
    if (!s) continue;
    const props = [];
    for (const part of s.split(';')) {
      const m = part.match(/^\s*(--[a-zA-Z0-9-_]+)\s*:/);
      if (m) props.push(m[1]);
    }
    inline.push({tag: el.tagName.toLowerCase(), props: props.length ? props : ['<non-custom-props>'], style: s.length>200?s.slice(0,200)+'…':s});
  }
  out.inlineStyle = {count: inline.length, items: inline};

  // 6. custom property declarations / usages from all stylesheets
  const tokenNames = {};
  const tokenUsage = {};
  let ruleCount = 0, sheetCount = 0;
  const walk = (rules) => {
    for (const rule of rules) {
      if (rule.cssRules && !rule.selectorText) { ruleCount++; walk(rule.cssRules); continue; }
      if (!rule.style) continue;
      ruleCount++;
      const sel = rule.selectorText || (rule.keyText ? '@'+rule.keyText : '');
      const st = rule.style;
      for (let i=0;i<st.length;i++) {
        const name = st[i];
        if (!name.startsWith('--')) continue;
        tokenNames[name] = tokenNames[name] || {decls:0, consumers:0};
        tokenNames[name].decls++;
      }
      const txt = st.cssText || '';
      const re = /var\(\s*(--[a-zA-Z0-9-_]+)/g;
      let m;
      while ((m = re.exec(txt))) {
        const t = m[1];
        tokenNames[t] = tokenNames[t] || {decls:0, consumers:0};
        tokenNames[t].consumers++;
        (tokenUsage[t] = tokenUsage[t] || []).length < 6 && tokenUsage[t].push(sel.slice(0,160));
      }
    }
  };
  for (const sheet of document.styleSheets) {
    sheetCount++;
    try { walk(sheet.cssRules); } catch(e) { /* cross-origin */ }
  }
  out.sheetCount = sheetCount; out.ruleCount = ruleCount;
  out.tokenNames = tokenNames; out.tokenUsageSample = tokenUsage;

  // 7. body-level resolved token values
  const bodyStyle = getComputedStyle(document.body);
  const rootStyle = getComputedStyle(document.documentElement);
  const interesting = ['--dsw-alias-bg-base','--dsw-alias-label-primary','--dsw-alias-link','--dsw-specific-sidebar-fill','--dsw-alias-brand-primary','--shiki-foreground','--shiki-background','--dsw-static-neutral-00','--dsw-menu-surface-fill','--dsw-focus-ring-color','--dsw-shadow-lv2','--dsw-elevation-panel','--dsw-font-markdown-base','--dsh-composer-height','--dsw-alias-bg-layer-1','--dsw-alias-bg-layer-2','--dsw-alias-border-l1','--dsl-code-block-background','--terminal-cursor'];
  out.bodyTokenSample = Object.fromEntries(interesting.map(n => [n, {body: bodyStyle.getPropertyValue(n).trim(), root: rootStyle.getPropertyValue(n).trim()}]));

  // 8. document level facts
  out.documentElementAttrs = Array.from(document.documentElement.attributes).map(a=>[a.name,a.value]);
  out.bodyAttrs = Array.from(document.body.attributes).map(a=>[a.name,a.value.length>120?a.value.slice(0,120)+'…':a.value]);
  out.title = document.title;
  out.bodyFont = bodyStyle.fontFamily;
  out.bodyFontSize = bodyStyle.fontSize;
  out.colorScheme = bodyStyle.colorScheme;

  return out;
}
"""


def main() -> int:
    if len(sys.argv) != 3:
        print('usage: scan-dsh-web-dom.py <url-with-token> <out.json>', file=sys.stderr)
        return 2
    url, out_path = sys.argv[1], sys.argv[2]
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(viewport={'width': 1440, 'height': 900}, device_scale_factor=1)
        page = ctx.new_page()
        page.goto(url, wait_until='domcontentloaded', timeout=60000)
        page.wait_for_timeout(6000)
        data = page.evaluate(JS)
        with open(out_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=1)
        print('OK', json.dumps({
            'elements': data['elementCount'],
            'classes': data['classCount'],
            'dataAttrs': len(data['dataAttrs']),
            'tokens': len(data['tokenNames']),
            'rules': data['ruleCount'],
            'inline': data['inlineStyle']['count'],
        }, ensure_ascii=False))
        browser.close()
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
