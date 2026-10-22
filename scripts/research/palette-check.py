"""palette/ 跨模块一致性检查（门禁原型 v1.3）。

校验：
  1. 9 个 YAML 全部解析；目录里没有未注册的 YAML
  2. 手写能力 id 的每一段来自 vocabulary.yaml（region / role / property / recipe）
  3. value 类型来自 values.yaml；anchor 引用存在；写原语 / dom op / token 名存在
  4. rule 写的 decl 键在白名单内；@ 规则用 allowed_at_descriptors
  5. 控件模板能展开：id = <region>.<controlName>.<property>，各段合法、展开 id 全局唯一
  6. 展开 id 与手写 id 重名时手写优先（去重计数）
  7. anchors.yaml 的 coverage 计数与清单一致
  8. _index.yaml 的 counts 与重算一致（含 regions_gap；不符 = error）

用法：python scripts/research/palette-check.py
退出码：0 无错误；1 有错误。
"""
import glob
import os
import sys

import yaml

ROOT = os.path.join(os.path.dirname(__file__), '..', '..', 'palette')

FILES = [
    '_index.yaml',
    'palette.yaml',
    'vocabulary.yaml',
    'values.yaml',
    'primitives.yaml',
    'assets.yaml',
    'probes.yaml',
    'tokens.yaml',
    'anchors.yaml',
]


def load(name):
    with open(os.path.join(ROOT, name), encoding='utf-8') as f:
        return yaml.safe_load(f)


def main():
    loaded = {}
    for name in FILES:
        loaded[name] = load(name)
    on_disk = sorted(os.path.basename(p) for p in glob.glob(os.path.join(ROOT, '*.yaml')))

    idx = loaded['_index.yaml']
    voc = loaded['vocabulary.yaml']
    vals = loaded['values.yaml']
    prims = loaded['primitives.yaml']
    assets = loaded['assets.yaml']
    probes = loaded['probes.yaml']
    tokens = loaded['tokens.yaml']
    anchors = loaded['anchors.yaml']
    palette = loaded['palette.yaml']

    regions = {r['id'] for r in voc['regions']}
    roles = {r['id'] for r in voc['roles']}
    props = {p['id'] for p in voc['properties']}
    recipes = {r['id'] for r in voc['recipes']}
    value_types = set(vals['value_types'])
    anchor_ids = set(anchors['anchors'])
    controls = anchors['controls']
    anchor_coverage = anchors.get('coverage', {})
    templates = palette['control_templates']
    write_kinds = prims['write_kinds']
    dom_ops = set(write_kinds['dom']['dom_ops'])
    rule_policies = write_kinds['rule']['policies']
    allowed_props = set(rule_policies['allowed_css_properties'])
    allowed_at = {k: set(v) for k, v in rule_policies['allowed_at_descriptors'].items()}
    token_names = {t['name'] for t in tokens['tokens']}

    errors, warnings = [], []
    token_refs = set()

    def check_write(cid, w):
        wid = w.get('id', '?')
        use = w.get('use')
        if use not in write_kinds:
            errors.append(f'{cid}/{wid}: use {use} 未登记')
            return
        if use == 'dom':
            if w.get('anchor') not in anchor_ids:
                errors.append(f'{cid}/{wid}: anchor {w.get("anchor")} 不存在')
            if w.get('op') not in dom_ops:
                errors.append(f'{cid}/{wid}: dom op {w.get("op")} 未登记')
        elif use == 'rule':
            has_anchor, has_at = 'anchor' in w, 'at' in w
            if has_anchor == has_at:
                errors.append(f'{cid}/{wid}: rule 写的 anchor 与 at 必须且只能给一个')
            if has_anchor and w.get('anchor') not in anchor_ids:
                errors.append(f'{cid}/{wid}: anchor {w.get("anchor")} 不存在')
            if has_at:
                at = w.get('at')
                if at not in allowed_at:
                    errors.append(f'{cid}/{wid}: at {at} 未在 allowed_at_descriptors 登记')
                    allowed = set()
                else:
                    allowed = allowed_at[at]
            else:
                allowed = allowed_props
            for key in (w.get('decl') or {}):
                if '*' not in allowed and key not in allowed:
                    errors.append(f'{cid}/{wid}: decl 键 {key} 不在白名单')
        elif use == 'token':
            token_refs.add(w.get('name'))

    caps = palette['capabilities']
    for cid, c in caps.items():
        parts = cid.split('.')
        kind = c.get('kind')
        if kind == 'property':
            if len(parts) != 3:
                errors.append(f'{cid}: kind=property 应为三段')
            else:
                region, role, prop = parts
                if region not in regions:
                    errors.append(f'{cid}: region {region} 不在词表')
                if role not in roles:
                    errors.append(f'{cid}: role {role} 不在词表')
                if prop not in props:
                    errors.append(f'{cid}: property {prop} 不在词表')
            if c.get('value') not in value_types:
                errors.append(f'{cid}: value {c.get("value")} 不在 values.yaml')
            for eff in c.get('realization', []):
                for w in eff.get('writes', []):
                    check_write(cid, w)
        elif kind == 'recipe':
            if len(parts) not in (2, 3):
                errors.append(f'{cid}: kind=recipe 应为两段或三段')
            if parts[0] not in regions:
                errors.append(f'{cid}: region {parts[0]} 不在词表')
            if len(parts) == 2:
                if parts[1] not in recipes:
                    errors.append(f'{cid}: recipe {parts[1]} 不在词表')
            elif len(parts) == 3:
                if parts[1] not in roles:
                    errors.append(f'{cid}: role {parts[1]} 不在词表')
                if parts[2] not in recipes:
                    errors.append(f'{cid}: recipe {parts[2]} 不在词表')
            for aname, aspect in (c.get('aspects') or {}).items():
                for eff in aspect.get('effects', []):
                    for w in eff.get('writes', []):
                        check_write(f'{cid}.{aname}', w)
        else:
            errors.append(f'{cid}: 未知 kind {kind}')

    # —— 控件模板展开 ——
    generated_raw = 0
    expanded_ids = []
    for ctl, meta in controls.items():
        ctl_parts = ctl.split('.')
        if len(ctl_parts) != 2:
            errors.append(f'control {ctl}: 键必须是 <region>.<controlName> 两段')
            continue
        ctl_region, ctl_name = ctl_parts
        if ctl_region not in regions:
            errors.append(f'control {ctl}: region {ctl_region} 不在词表')
        if meta.get('region') != ctl_region:
            errors.append(f'control {ctl}: 键前缀与 region 字段不一致')
        if meta.get('role') not in roles:
            errors.append(f'control {ctl}: role {meta.get("role")} 不在词表')
        t = meta.get('template')
        if t not in templates:
            errors.append(f'control {ctl}: template {t} 未定义')
            continue
        for prop in templates[t]['properties']:
            if prop not in props:
                errors.append(f'control {ctl}: 模板属性 {prop} 不在属性词表')
                continue
            expanded_ids.append(f'{ctl_region}.{ctl_name}.{prop}')
            generated_raw += 1

    for tname, tmeta in templates.items():
        if 'applies_to' in tmeta:
            errors.append(f'control_templates.{tname}: applies_to 已废弃（v1.3 起模板不再声明适用角色）')

    dup_expanded = sorted({i for i in expanded_ids if expanded_ids.count(i) > 1})
    for i in dup_expanded:
        errors.append(f'展开 id {i} 在多控件间重名（展开 id 必须全局唯一）')

    deduped = len(set(expanded_ids) - set(caps))
    merged = set(caps) | set(expanded_ids)
    covered = {i.split('.')[0] for i in merged}
    gap = sorted(regions - covered)

    # —— token 存在性 ——
    missing_tokens = sorted(token_refs - token_names)
    for name in missing_tokens:
        errors.append(f'token 引用 {name} 不在 tokens.yaml（当前 14 条样本；新引用需先登记事实）')

    # —— anchors.yaml 置信度计数 ——
    from collections import Counter
    anchor_conf = Counter(v.get('confidence') for v in anchors['anchors'].values())
    control_conf = Counter(v.get('confidence') for v in controls.values())
    expected_cov = {
        'anchors': len(anchor_ids),
        'documented': anchor_conf.get('documented', 0),
        'inferred': anchor_conf.get('inferred', 0),
        'fragile': anchor_conf.get('fragile', 0),
        'controls_total': len(controls),
        'controls_documented': control_conf.get('documented', 0),
        'controls_inferred': control_conf.get('inferred', 0),
        'template_expandable': len(controls),
    }
    for key, actual in expected_cov.items():
        if anchor_coverage.get(key) != actual:
            errors.append(f'anchors.coverage.{key}={anchor_coverage.get(key)} 实际 {actual}')

    # —— assets / probes 基本形状 ——
    if 'policy' not in assets:
        errors.append('assets.yaml 缺 policy 段')
    if 'kinds' not in assets:
        errors.append('assets.yaml 缺 kinds 段')
    if 'primitives' not in probes:
        errors.append('probes.yaml 缺 primitives 段（探测原语）')
    if 'profiles' not in probes:
        errors.append('probes.yaml 缺 profiles 段')

    # —— 目录里是否有未注册的 YAML ——
    for name in on_disk:
        if name not in FILES:
            errors.append(f'palette/{name} 未在 palette-check.py 的 FILES 注册')

    # —— 计数与 _index 比对 ——
    counts = idx.get('counts', {})
    checks = [
        ('capabilities_authored', len(caps)),
        ('capabilities_generated', generated_raw),
        ('capabilities_unique', len(merged)),
        ('regions_covered', len(covered)),
    ]
    for key, actual in checks:
        if key not in counts:
            errors.append(f'_index counts 缺 {key}（实际 {actual}）')
        elif counts[key] != actual:
            errors.append(f'_index counts.{key}={counts[key]} 实际 {actual}')
    for key, actual in [('controls', len(controls)), ('regions', len(regions)), ('roles', len(roles))]:
        if counts.get(key) != actual:
            errors.append(f'_index counts.{key}={counts.get(key)} 实际 {actual}')
    if counts.get('regions_gap') != gap:
        errors.append(f'_index counts.regions_gap={counts.get("regions_gap")} 实际 {gap}')

    # —— _index 模块注册完整性 ——
    modules = idx.get('modules', {})
    for mname, meta in modules.items():
        if meta.get('file') not in FILES:
            errors.append(f'_index modules.{mname}: 文件 {meta.get("file")} 不在 9 个 YAML 内')

    print(f'YAML 解析         = {len(loaded)}/{len(FILES)}（目录内 {len(on_disk)} 个）')
    print(f'能力（手写）      = {len(caps)}')
    print(f'能力（模板展开）  = {generated_raw}（去重后新增 {deduped}）')
    print(f'能力（合并唯一）  = {len(merged)}')
    print(f'区域覆盖          = {len(covered)}/{len(regions)}（缺口 {", ".join(gap) or "无"}）')
    print(f'控件 / 锚点       = {len(controls)} / {len(anchor_ids)}')
    print(f'能力引用的 token  = {len(token_refs)}（样本表覆盖 {len(token_refs) - len(missing_tokens)}）')
    print(f'错误              = {len(errors)}')
    for e in errors:
        print('  ERR ', e)
    print(f'警告              = {len(warnings)}')
    for w in warnings:
        print('  WARN', w)

    return 1 if errors else 0


if __name__ == '__main__':
    sys.exit(main())
