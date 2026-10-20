"""palette/ 跨模块一致性检查（门禁原型）。

校验：
  1. 能力 id 的每一段来自 vocabulary.yaml
  2. value 类型来自 values.yaml
  3. anchor / token / 写原语 / dom op 引用存在
  4. 控件模板能展开，统计生成能力数

用法：python scripts/research/palette-check.py
退出码：0 无错误；1 有错误。
"""
import glob
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
        else:
            errors.append(f'{cid}: 未知 kind {kind}')

    # 模板展开
    templates = palette['control_templates']
    controls = anchors['controls']
    generated = 0
    for ctl, meta in controls.items():
        t = meta.get('template')
        if t in templates:
            generated += len(templates[t]['properties'])
        else:
            warnings.append(f'control {ctl}: template {t} 未定义')

    missing_tokens = sorted(token_refs - token_names)
    counts = idx['counts']
    if counts['capabilities_authored'] != len(caps):
        warnings.append(f'_index counts.capabilities_authored={counts["capabilities_authored"]} 实际 {len(caps)}')
    if counts['capabilities_generated'] != generated:
        warnings.append(f'_index counts.capabilities_generated={counts["capabilities_generated"]} 实际 {generated}')
    if counts['controls'] != len(controls):
        warnings.append(f'_index counts.controls={counts["controls"]} 实际 {len(controls)}')
    if counts['regions'] != len(regions):
        warnings.append(f'_index counts.regions={counts["regions"]} 实际 {len(regions)}')
    if counts['roles'] != len(roles):
        warnings.append(f'_index counts.roles={counts["roles"]} 实际 {len(roles)}')

    print(f'能力（手写）      = {len(caps)}')
    print(f'能力（模板展开）  = {generated}')
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
