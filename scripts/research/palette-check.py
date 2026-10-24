"""palette/ 跨模块一致性检查（门禁原型 v1.10）。

校验：
  1. 9 个 YAML 全部解析；目录里没有未注册的 YAML
  2. 手写能力 id 的每一段来自 vocabulary.yaml（region / role / property / recipe）
  3. value 类型来自 values.yaml；anchor 引用存在；写原语 / dom op / token 名存在
  4. rule 写的 decl 键在白名单内；@ 规则用 allowed_at_descriptors
  5. 控件模板能展开：id = <region>.<controlName>.<property>，各段合法、展开 id 全局唯一
  6. 展开 id 与手写 id 重名时手写优先（去重计数）
  7. anchors.yaml 的 coverage 计数与清单一致
  7b. tokens.yaml 状态模型：主状态恰为 live/dead/missing，修饰恰为 pinned/gated/declared_invalid，样本状态值合法；primitives.token 的 allow_* 取值与之一致
  7c. tokens.yaml 表条目：名字语法与 namespace 前缀合法；能力写死名或非 live 名时强制 allow_primary_status / allow_modifiers（守卫例外见 7f/7g）
  7d. tokens.yaml 表条目重名拒绝；declared 路径必须为仓库根相对（host.source 可访问时校验存在）
  7e. allow_* 必带 allow_reason；live 名不得给 allow_primary_status
  7f. 被 `when: { probe: token_live }` 守卫的 token 写属条件写：不强制 allow_*（守卫即活死探测）；无守卫写非 live 名必须 allow_*
  7g. realization.when 守卫：probe 必须登记、args 键必须是该原语参数；token_live 显式 args.name 必须与写入 token 名一致，省略则逐写绑定（契约源 = primitives.yaml §1b）
  8. _index.yaml 的 counts 与重算一致（含 regions_gap；不符 = error）
  9. _index 模块 version 与 requires 约束（语义版本比较，不满足 = error）

用法：python scripts/research/palette-check.py
退出码：0 无错误；1 有错误。
"""
import glob
import os
import re
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
    cap_domains = {d['id'] for d in (voc.get('capability_domains') or [])}
    cap_pattern = re.compile((voc.get('grammar') or {}).get('capability_id_pattern') or r'^[a-z][a-z0-9-]*(\.[a-z0-9-]+){1,5}$')


    def _check_capability_id(cid):
        if not cap_pattern.match(cid):
            errors.append(f'{cid}: capability_id 不符合文法（2~6 段小写 kebab）')
        elif cid.split('.')[0] not in cap_domains:
            errors.append(f'{cid}: capability domain {cid.split(".")[0]} 未登记（见 vocabulary.capability_domains）')
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
    token_status = {t['name']: t for t in tokens.get('tokens', [])}
    token_names = set(token_status)
    namespace_keys = {k for k in (tokens.get('namespaces') or {}) if k != 'total'}
    status_model = tokens.get('status_model', {})
    primary_values = set((status_model.get('primary_status') or {}).keys())
    modifier_values = set((status_model.get('modifiers') or {}).keys())
    probe_defs = probes.get('primitives') or {}
    realization_schema = prims.get('realization') or {}

    errors, warnings = [], []
    token_refs = set()

    # token 表条目重名（后写覆盖前写会绕过状态强制，必须拒绝）
    _seen = {}
    for _t in tokens.get('tokens', []):
        _nm = _t.get('name')
        _seen[_nm] = _seen.get(_nm, 0) + 1
    for _nm, _cnt in _seen.items():
        if _cnt > 1:
            errors.append(f'tokens.{_nm}: 条目重名 {_cnt} 次（token 表必须全局唯一）')

    def check_when(cid, eff):
        """校验 realization.when 守卫：probe 必须登记、args 键必须在该原语声明的 args 内。"""
        when = eff.get('when')
        if when is None:
            return None
        if not isinstance(when, dict) or not when:
            errors.append(f'{cid}: realization.when 必须是非空映射')
            return None
        probe = when.get('probe')
        if probe not in probe_defs:
            errors.append(f'{cid}: when.probe {probe} 未在 probes.yaml 登记')
            return None
        allowed = set(probe_defs[probe].get('args') or [])
        for k in when:
            if k in ('probe', 'args'):
                continue
            errors.append(f'{cid}: when 出现未知键 {k}（只允许 probe 与 args）')
        gargs = when.get('args') or {}
        if not isinstance(gargs, dict):
            errors.append(f'{cid}: when.args 必须是映射')
        else:
            for ak in gargs:
                if ak not in allowed:
                    errors.append(f'{cid}: when.args.{ak} 不是探测原语 {probe} 的参数（允许 {sorted(allowed)}）')
        return probe

    def check_write(cid, w, eff=None, probe=None):
        wid = w.get('id', '?')
        use = w.get('use')
        # 条件写：realization 级 token_live 探测守卫（守卫即活死探测，token 名当前不是 live 属预期）
        guarded = probe == 'token_live'
        if guarded and w.get('when'):
            errors.append(f'{cid}/{wid}: 守卫只能写在 realization 级 when，不能写在 write 上')
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
            tname = w.get('name')
            token_refs.add(tname)
            meta = token_status.get(tname)
            if guarded:
                _wargs = ((eff or {}).get('when') or {}).get('args') or {}
                _gname = _wargs.get('name')
                if _gname is not None and _gname != tname:
                    errors.append(f'{cid}/{wid}: token_live 守卫 args.name={_gname} 与写入 token {tname} 不一致')
            has_allow_primary = 'allow_primary_status' in w
            has_allow_mods = 'allow_modifiers' in w
            if (has_allow_primary or has_allow_mods) and not w.get('allow_reason'):
                errors.append(f'{cid}/{wid}: 给了 allow_primary_status/allow_modifiers 就必须给 allow_reason')
            if meta is not None and meta.get('status') == 'live' and has_allow_primary:
                errors.append(f'{cid}/{wid}: 写 live 名 {tname} 不应给 allow_primary_status（放宽主状态只用于非 live 名）')
            if meta is not None and meta.get('status') != 'live' and not guarded:
                if not has_allow_primary:
                    errors.append(f'{cid}/{wid}: 写 {tname}（主状态 {meta.get("status")}）必须显式给 allow_primary_status，或把该 realization 标 when: {{ probe: token_live }}')
                elif w.get('allow_primary_status') != meta.get('status'):
                    errors.append(f'{cid}/{wid}: allow_primary_status={w.get("allow_primary_status")} 与 tokens.yaml 主状态 {meta.get("status")} 不一致')
            if has_allow_mods:
                allowed_mods = set(meta.get('modifiers') or []) if meta is not None else set()
                for m in (w.get('allow_modifiers') or []):
                    if m not in modifier_values:
                        errors.append(f'{cid}/{wid}: allow_modifiers 含未登记修饰 {m}')
                    elif meta is not None and m not in allowed_mods:
                        errors.append(f'{cid}/{wid}: allow_modifiers 含 {m}，但 tokens.yaml 该名没有此修饰')

    caps = palette['capabilities']
    for cid, c in caps.items():
        parts = cid.split('.')
        _check_capability_id(cid)
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
                probe = check_when(cid, eff)
                for w in eff.get('writes', []):
                    check_write(cid, w, eff, probe)
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
                    probe = check_when(f'{cid}.{aname}', eff)
                    for w in eff.get('writes', []):
                        check_write(f'{cid}.{aname}', w, eff, probe)
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
            _eid = f'{ctl_region}.{ctl_name}.{prop}'
            _check_capability_id(_eid)
            expanded_ids.append(_eid)
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
        errors.append(f'token 引用 {name} 不在 tokens.yaml（当前 15 条样本；新引用需先登记事实）')

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
        'template_expandable_controls': len(controls),
    }
    for key, actual in expected_cov.items():
        if anchor_coverage.get(key) != actual:
            errors.append(f'anchors.coverage.{key}={anchor_coverage.get(key)} 实际 {actual}')

    # —— tokens.yaml 状态模型 schema（主状态 + 修饰标签） ——
    if primary_values != {'live', 'dead', 'missing'}:
        errors.append(f'tokens.status_model.primary_status 必须恰为 live/dead/missing，实际 {sorted(primary_values)}')
    if modifier_values != {'pinned', 'gated', 'declared_invalid'}:
        errors.append(f'tokens.status_model.modifiers 必须恰为 pinned/gated/declared_invalid，实际 {sorted(modifier_values)}')
    t_primary, t_mod = Counter(), Counter()
    for t in tokens.get('tokens', []):
        tname = t.get('name', '?')
        st = t.get('status')
        if st not in primary_values:
            errors.append(f'tokens.{tname}: status={st} 不是主状态（{sorted(primary_values)}）')
        else:
            t_primary[st] += 1
        mods = t.get('modifiers', []) or []
        if not isinstance(mods, list):
            errors.append(f'tokens.{tname}: modifiers 必须是列表')
            mods = []
        for m in mods:
            if m not in modifier_values:
                errors.append(f'tokens.{tname}: modifier={m} 未在 status_model.modifiers 登记')
            else:
                t_mod[m] += 1

    # —— tokens.yaml 表条目语法与 namespace 前缀 ——
    TOKEN_RE = re.compile(r'^--[a-z0-9][a-z0-9-]*$')
    for t in tokens.get('tokens', []):
        tname = t.get('name', '')
        if not isinstance(tname, str) or not TOKEN_RE.match(tname):
            errors.append(f'tokens.{tname!r}: 条目名语法非法（应为 --[a-z0-9][a-z0-9-]*）')
            continue
        if t.get('namespace') not in namespace_keys:
            errors.append(f'tokens.{tname}: namespace={t.get("namespace")} 未在 tokens.namespaces 登记')
        elif not tname.startswith('--' + t['namespace'] + '-'):
            errors.append(f'tokens.{tname}: 名字前缀与 namespace={t.get("namespace")} 不一致')
        for req in ('family', 'status'):
            if req not in t:
                errors.append(f'tokens.{tname}: 缺字段 {req}')
        declared = t.get('declared')
        if not isinstance(declared, list) or not declared:
            errors.append(f'tokens.{tname}: declared 必须是非空列表')
            declared = []
        host_src = (tokens.get('host') or {}).get('source')
        for d in declared:
            if not isinstance(d, str) or not re.match(r'^(packages|apps)/[^:]*(:\d+(-\d+)?)?$', d):
                errors.append(f'tokens.{tname}: declared {d!r} 必须为仓库根相对路径（packages/… 或 apps/…，可带 :行号）')
                continue
            if host_src and os.path.isdir(host_src):
                rel = re.sub(r':\d+(-\d+)?$', '', d)
                if not os.path.exists(os.path.join(host_src, rel.replace('/', os.sep))):
                    errors.append(f'tokens.{tname}: declared 路径不存在于 host.source：{d}')

    token_fields = write_kinds['token']['fields']
    if 'allow_status' in token_fields:
        errors.append('primitives.token.fields 不应再有 allow_status（已拆为 allow_primary_status / allow_modifiers）')
    if set(token_fields.get('allow_primary_status', {}).get('values', [])) != primary_values:
        errors.append('primitives.token.fields.allow_primary_status 取值必须与 status_model.primary_status 一致')
    if set(token_fields.get('allow_modifiers', {}).get('values', [])) != modifier_values:
        errors.append('primitives.token.fields.allow_modifiers 取值必须与 status_model.modifiers 一致')

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

    # —— _index 模块 version 与 requires 约束 ——
    semver = re.compile(r'^\d+\.\d+\.\d+$')
    palette_version = idx.get('palette_version')
    if not isinstance(palette_version, str) or not semver.match(palette_version):
        errors.append(f'_index.palette_version 必须是 x.y.z：{palette_version!r}')
    for mname, meta in modules.items():
        if 'version' not in meta:
            errors.append(f'_index modules.{mname} 缺 version')
    requires = idx.get('requires', {})
    if not isinstance(requires, dict):
        errors.append('_index.requires 必须是映射（模块名 → 最低版本）')
        requires = {}
    for rname, rspec in requires.items():
        if rname not in modules:
            errors.append(f'_index.requires.{rname}: 未注册的同名模块')
            continue
        ver = modules[rname].get('version')
        if not isinstance(ver, str) or not semver.match(ver):
            errors.append(f'_index modules.{rname}.version 必须是 x.y.z（被 requires 约束）：{ver!r}')
            continue
        m = re.match(r'^(>=|<=|==|>|<)?\s*(\d+)\.(\d+)\.(\d+)$', str(rspec).strip())
        if not m:
            errors.append(f'_index.requires.{rname} 约束格式非法：{rspec!r}')
            continue
        op = m.group(1) or '=='
        want = tuple(int(m.group(i)) for i in (2, 3, 4))
        cur = tuple(int(x) for x in ver.split('.'))
        okq = {'>=': cur >= want, '<=': cur <= want, '>': cur > want,
               '<': cur < want, '==': cur == want}[op]
        if not okq:
            errors.append(f'_index.requires.{rname}={rspec!r} 未满足（modules.{rname}.version={ver}）')

    print(f'YAML 解析         = {len(loaded)}/{len(FILES)}（目录内 {len(on_disk)} 个）')
    print(f'能力（手写）      = {len(caps)}')
    print(f'能力（模板展开）  = {generated_raw}（去重后新增 {deduped}）')
    print(f'能力（合并唯一）  = {len(merged)}')
    print(f'区域覆盖          = {len(covered)}/{len(regions)}（缺口 {", ".join(gap) or "无"}）')
    print(f'控件 / 锚点       = {len(controls)} / {len(anchor_ids)}')
    print(f'能力引用的 token  = {len(token_refs)}（样本表覆盖 {len(token_refs) - len(missing_tokens)}）')
    print(f'状态样本          = {len(tokens.get("tokens", []))} 条（主状态 {dict(t_primary)}；修饰 {dict(t_mod) or "无"}）')
    print(f'错误              = {len(errors)}')
    for e in errors:
        print('  ERR ', e)
    print(f'警告              = {len(warnings)}')
    for w in warnings:
        print('  WARN', w)

    return 1 if errors else 0


if __name__ == '__main__':
    sys.exit(main())
