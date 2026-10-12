"""Declarative batch ingest: no user code; publish is owned by the Host."""
import json
import os
from datetime import datetime, timezone
import pandas as pd
from .mapping import Mapper, suggest, _norm
from .schema import ENTITIES, SYNONYMS
from .sources import open_tables, sample_rows
from . import gtfs, jsonio, versions


def _mapping(t, kind, override, crs):
    sample = next(t.loader(nrows=20))
    suggestions = {e: suggest(e, t.columns, sample_rows(sample, 20)) for e in ENTITIES}
    candidates = []
    for e, spec in ENTITIES.items():
        fields = suggestions[e]
        if all(f in fields for f, (_, required) in spec['fields'].items() if required):
            candidates.append((len(fields), e))
    best = max((n for n, _ in candidates), default=0)
    choices = [e for n, e in candidates if n == best]
    entity = override.get('entity') or (choices[0] if len(choices) == 1 else None)
    issues = []
    if entity not in ENTITIES:
        return None, [{'reason': '数据类型不唯一或缺少必要字段', 'candidates': choices, 'columns': t.columns}]
    mapping = {'entity': entity, 'table': t.name, 'fields': override.get('fields', suggestions[entity]),
               'defaults': override.get('defaults', {}), 'crs': override.get('crs') or crs or t.crs_hint}
    # Only explicit metadata/column CRS hints count, unlike the manual wizard default.
    if not mapping['crs']:
        joined = ' '.join(t.columns).upper()
        mapping['crs'] = next((v for v in ['WGS84', 'GCJ02', 'BD09'] if v in joined), None)
    coords = any(f in mapping['fields'] for f in ['lon', 'lat', 'geometry', 'o_lon', 'd_lon'])
    if coords and not mapping['crs']:
        issues.append({'reason': '请明确坐标系：WGS84 / GCJ02 / BD09 / EPSG'})
    mapping['crs'] = mapping['crs'] or 'WGS84'  # No coordinate columns: irrelevant.
    if entity in ['routes', 'route_stops', 'trips', 'ridership'] and 'direction' not in mapping['fields'] and 'direction' not in mapping['defaults']:
        issues.append({'reason': '缺少方向含义；请指定方向列或明确固定方向值'})
    if not override.get('fields'):
        for field in mapping['fields']:
            names = {_norm(v) for v in SYNONYMS.get(field, []) + [field]}
            matches = [c for c in t.columns if _norm(c) in names]
            if len(matches) > 1:
                issues.append({'reason': f'{field} 对应多个源列', 'columns': matches})
    return mapping, issues


def _merge(frames, entity):
    data = pd.concat(frames, ignore_index=True).fillna('').astype(str)
    data = data.drop_duplicates()
    key = ENTITIES[entity]['key']
    if key and data.duplicated(key).any():
        raise ValueError(f'{entity} 主键内容冲突，请指定保留来源或修改输入')
    # Overlap of keyless tables cannot be resolved by dropping a few identical rows.
    if not key and len(frames) > 1:
        seen = set()
        for frame in frames:
            rows = set(frame.fillna('').astype(str).itertuples(index=False, name=None))
            if seen & rows:
                raise ValueError(f'{entity} 无主键表存在重叠，请明确保留来源')
            seen.update(rows)
    return data


def prepare(req):
    inputs, frames, issues, reports = [], {}, [], []
    overrides = req.get('overrides', {})
    for path in req['paths']:
        try:
            kind, tables = open_tables({'type': 'file', 'path': path})
        except Exception as error:
            issues.append({'path': path, 'reason': str(error)})
            continue
        if kind == 'gtfs':
            from .sources import gtfs_dir
            inputs.append({'source': {'type': 'file', 'path': path}, 'mapping': {'entity': 'gtfs', 'crs': 'WGS84'}})
            try:
                for e, df in gtfs.convert(gtfs_dir(path)).items():
                    frames.setdefault(e, []).append(df)
                    reports.append({'entity': e, 'crs': 'WGS84', 'rowsIn': len(df), 'rowsOut': len(df), 'dropped': {}, 'duplicates': 0})
            except Exception as error:
                issues.append({'path': path, 'reason': str(error)})
            continue
        if len(tables) > 50:
            issues.append({'path': path, 'reason': '文件超过 50 个工作表，请指定较小文件范围'})
            continue
        for t in tables:
            key = path + '::' + t.name
            override = overrides.get(key, {})
            if override.get('skip'):
                inputs.append({'source': {'type': 'file', 'path': path}, 'table': t.name, 'skipped': True})
                continue
            mapping, questions = _mapping(t, kind, override, req.get('crs'))
            inputs.append({'source': {'type': 'file', 'path': path}, 'mapping': mapping, 'table': t.name,
                           'columns': t.columns, 'rows': t.rows})
            for q in questions:
                issues.append({'path': path, 'table': t.name, **q})
            if mapping is None or questions:
                continue
            try:
                # Disable Mapper's implicit primary-key de-duplication: compare full records instead.
                mapper = Mapper(mapping)
                parts = []
                for chunk in t.loader():
                    mapper.seen = set()
                    original_key = mapper.spec['key']
                    mapper.spec = {**mapper.spec, 'key': None}
                    parts.append(mapper.apply(chunk))
                    mapper.spec = {**mapper.spec, 'key': original_key}
                report = mapper.report()
                reports.append(report)
                if report['dropped']:
                    raise ValueError('存在不可解析或缺失必填值：' + str(report['dropped']))
                if not report['rowsOut']:
                    raise ValueError('数据表为空，不能自动替换现有数据')
                frames.setdefault(mapping['entity'], []).append(pd.concat(parts, ignore_index=True))
            except Exception as error:
                issues.append({'path': path, 'table': t.name, 'reason': str(error)})
    merged = {}
    for e, parts in frames.items():
        try:
            merged[e] = _merge(parts, e)
        except ValueError as error:
            issues.append({'entity': e, 'reason': str(error)})
    # A route-stop table fills gaps; directly supplied routes/stops remain authoritative.
    if 'route_stops' in merged:
        for e, df in versions._derive_from_route_stops(merged['route_stops']).items():
            merged[e] = versions._union(merged[e], df.fillna('').astype(str), ENTITIES[e]['key']) if e in merged else df
    if req.get('baseDir'):
        manifest = versions._read_manifest(req['baseDir'])
        combined = {e: versions._csv(req['baseDir'], e) for e in manifest['entities']}
        for e, df in merged.items():
            try:
                combined[e] = _merge([combined[e], df], e) if req.get('mode') == 'append' and e in combined else df
            except ValueError as error:
                issues.append({'entity': e, 'reason': str(error)})
    else:
        combined = merged
    checks = [('route_stops', 'stop_id', 'stops', 'stop_id'), ('route_stops', 'route_id', 'routes', 'route_id'),
              ('trips', 'route_id', 'routes', 'route_id'), ('ridership', 'route_id', 'routes', 'route_id'),
              ('ridership', 'stop_id', 'stops', 'stop_id'), ('od', 'origin_stop_id', 'stops', 'stop_id'),
              ('od', 'dest_stop_id', 'stops', 'stop_id'), ('vehicles', 'depot_id', 'depots', 'depot_id'),
              ('network_edges', 'from_node_id', 'network_nodes', 'node_id'), ('network_edges', 'to_node_id', 'network_nodes', 'node_id')]
    for entity, column, target, key in checks:
        if entity in combined and target in combined:
            unknown = set(combined[entity][column].fillna('').astype(str)) - set(combined[target][key].fillna('').astype(str)) - {''}
            if unknown:
                issues.append({'entity': entity, 'reason': f'{column} 有 {len(unknown)} 个引用不在 {target}'})
    value = {'inputs': inputs, 'issues': issues, 'reports': reports,
             'entities': {e: {'rows': len(df), 'columns': list(df.columns)} for e, df in merged.items()},
             'ready': bool(merged) and not issues}
    return value, merged


def inspect_batch(req):
    return prepare(req)[0]


def build(req, progress):
    progress(0.02, '检查整批输入与映射')
    value, merged = prepare(req)
    if not value['ready']:
        raise ValueError('整批导入尚未解决歧义：' + json.dumps(value['issues'], ensure_ascii=False))
    staging, base = req['stagingDir'], req.get('baseDir')
    os.makedirs(staging)
    manifest = versions._read_manifest(base)
    for i, (e, df) in enumerate(merged.items()):
        progress(0.1 + 0.65 * i / max(len(merged), 1), '导入 ' + e)
        if req.get('mode') == 'append' and e in manifest['entities']:
            df = _merge([versions._csv(base, e), df], e)
        df.to_csv(os.path.join(staging, e + '.csv'), index=False)
    for e in manifest['entities']:
        if e not in merged:
            versions._link(os.path.join(base, e + '.csv'), os.path.join(staging, e + '.csv'))
    progress(0.85, '检查整批关联')
    warnings = versions._references(staging)
    # Unlike manual imports, auto-publishing must not silently accept broken references.
    broken = [w for w in warnings if '不在' in w]
    if broken:
        raise ValueError('整批关联校验失败：' + '；'.join(broken))
    entities = {}
    for e in ENTITIES:
        path = os.path.join(staging, e + '.csv')
        if os.path.exists(path):
            df = versions._csv(staging, e)
            entities[e] = {'rows': len(df), 'columns': list(df.columns)}
            if e == 'routes':
                entities[e]['uniqueCount'] = df['route_id'].nunique()
    m = versions.map_data(staging)
    sources = manifest.get('sources', []) + [versions._source_record(i['source'], i['mapping'], i.get('table', 'gtfs')) for i in value['inputs'] if not i.get('skipped')]
    provenance_entities = {e: manifest.get('provenance', {}).get('entities', {}).get(e, '既有导入') for e in entities}
    for e in merged:
        provenance_entities[e] = '用户导入'
    provenance = {'origin': 'user-import', 'batch': True, 'entities': provenance_entities,
                  'synthetic': any('模拟' in str(v) or '合成' in str(v) for v in provenance_entities.values())}
    result = {'schema': 1, 'createdAt': datetime.now(timezone.utc).isoformat(), 'crs': 'WGS84',
              'entities': entities, 'sources': sources, 'bbox': m['bbox'],
              'report': {'imports': value['reports'], 'warnings': warnings},
              'provenance': provenance}
    with open(os.path.join(staging, 'map.json'), 'w', encoding='utf-8') as f:
        jsonio.dump(m, f, ensure_ascii=False, separators=(',', ':'))
    with open(os.path.join(staging, 'manifest.json'), 'w', encoding='utf-8') as f:
        jsonio.dump(result, f, ensure_ascii=False, indent=1)
    progress(1, '整批数据已校验')
    return {'entities': entities, 'bbox': m['bbox'], 'report': result['report'], 'missing': versions.missing(entities)}
