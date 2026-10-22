"""palette/ 跨模块一致性检查（门禁原型 v1.2）。

校验：
  1. 手写能力 id 的每一段来自 vocabulary.yaml（region / role / property）
  2. value 类型来自 values.yaml；anchor / token / 写原语 / dom op 引用存在
  3. 控件模板能展开：id = <region>.<controlName>.<property>，各段合法、展开 id 全局唯一
  4. 展开 id 与手写 id 重名时手写优先（去重计数）
  5. _index.yaml 的 counts 与重算一致（含唯一能力数 / 区域覆盖数）

用法：python scripts/research/palette-check.py
退出码：0 无错误；1 有错误。
"""
import os
import sys

import yaml

ROOT = os.path.join(os.path.dirname(__file__), '..', '..', 'palette')


def load(name):
    with open(os.path.join(ROOT, name), encoding='utf-8') as f:
        return yaml.safe_load(f)


def main():
    idx = load('_index.yaml')
    voc = load('vocabulary.yaml')
    vals = load('values.yaml')
    prims = load('primitives.yaml')
    anchors = load('anchors.yaml')
    tokens = load('tokens.yaml')
    palette = load('palette.yaml')

    regions = {r['id'] for r in voc['regions']}
    roles = {r['id'] for r in voc['roles']}
    props = {p['id'] for p in voc['properties']}
    value_types = set(vals['value_types'])
    anchor_ids = set(anchors['anchors'])
    write_kinds = set(prims['write_kinds'])
    dom_ops = set(prims['write_kinds']['dom']['dom_ops'])
    token_names = {t['name'] for t in tokens['tokens']}
    controls = anchors['controls']
    templates = palette['control_templates']

    caps = palette['capabilities']
    errors, warnings = [], []
    token_refs = set()

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
            value = c.get('value')
            if value not in value_types:
                errors.append(f'{cid}: value {value} 不在 values.yaml')
            for eff in c.get('realization', []):
                for w in eff.get('writes', []):
                    use = w.get('use')
                    if use not in write_kinds:
                        errors.append(f'{cid}/{w.get("id")}: use {use} 未登记')
                    if use == 'dom' and w.get('anchor') not in anchor_ids:
                        errors.append(f'{cid}/{w.get("id")}: anchor {w.get("anchor")} 不存在')
                    if use == 'rule' and 'at' not in w and w.get('anchor') not in anchor_ids:
                        errors.append(f'{cid}/{w.get("id")}: anchor {w.get("anchor")} 不存在')
                    if use == 'dom' and w.get('op') not in dom_ops:
                        errors.append(f'{cid}/{w.get("id")}: dom op {w.get("op")} 未登记')
                    if use == 'token':
                        token_refs.add(w['name'])
        elif kind == 'recipe':
            if len(parts) not in (2, 3):
                errors.append(f'{cid}: kind=recipe 应为两段或三段')
            if parts[0] not in regions:
                errors.append(f'{cid}: region {parts[0]} 不在词表')
            if len(parts) == 3 and parts[1] not in roles:
                errors.append(f'{cid}: role {parts[1]} 不在词表')
        else:
            errors.append(f'{cid}: 未知 kind {kind}')

    # —— 控件模板展开 ——
    generated_raw = 0
    expanded_ids = []          # 全部展开 id（含重名）
    expanded_meta = []         # (id, control)
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
        t = meta.get('template')
        if t not in templates:
            errors.append(f'control {ctl}: template {t} 未定义')
            continue
        for prop in templates[t]['properties']:
            if prop not in props:
                errors.append(f'control {ctl}: 模板属性 {prop} 不在属性词表')
                continue
            eid = f'{ctl_region}.{ctl_name}.{prop}'
            expanded_ids.append(eid)
            expanded_meta.append((eid, ctl))
            generated_raw += 1

    dup_expanded = sorted({i for i in expanded_ids if expanded_ids.count(i) > 1})
    for i in dup_expanded:
        errors.append(f'展开 id {i} 在多控件间重名（展开 id 必须全局唯一）')

    expanded_only = [i for i in expanded_ids if i not in caps]
    deduped = len(set(expanded_ids) - set(caps))
    merged = set(caps) | set(expanded_ids)
    covered = {i.split('.')[0] for i in merged}
    gap = sorted(regions - covered)

    # —— 计数与 _index 比对 ——
    missing_tokens = sorted(token_refs - token_names)
    counts = idx.get('counts', {})
    checks = [
        ('capabilities_authored', len(caps)),
        ('capabilities_generated', generated_raw),
        ('capabilities_unique', len(merged)),
        ('regions_covered', len(covered)),
    ]
    for key, actual in checks:
        if key not in counts:
            warnings.append(f'_index counts 缺 {key}（实际 {actual}）')
        elif counts[key] != actual:
            errors.append(f'_index counts.{key}={counts[key]} 实际 {actual}')
    if counts.get('controls') != len(controls):
        errors.append(f'_index counts.controls={counts.get("controls")} 实际 {len(controls)}')
    if counts.get('regions') != len(regions):
        errors.append(f'_index counts.regions={counts.get("regions")} 实际 {len(regions)}')
    if counts.get('roles') != len(roles):
        errors.append(f'_index counts.roles={counts.get("roles")} 实际 {len(roles)}')
    if counts.get('regions_gap') != gap:
        warnings.append(f'_index counts.regions_gap={counts.get("regions_gap")} 实际 {gap}')

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
    if missing_tokens:
        print(f'未在样例 tokens.yaml 中的 token（完整表由扫描器生成）：{len(missing_tokens)}')
        print('  ' + ', '.join(missing_tokens[:16]))

    return 1 if errors else 0


if __name__ == '__main__':
    sys.exit(main())
