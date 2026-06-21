#!/usr/bin/env python3
"""Cross-check data.json ability metadata against OCR scraped from screenshots."""

from __future__ import annotations

import json
import re
from difflib import SequenceMatcher
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WORK = ROOT / '.work'
DATA_PATH = ROOT / 'data.json'
SCRAPED = WORK / 'scraped-abilities.json'
REPORT_JSON = WORK / 'audit-report.json'
REPORT_MD = WORK / 'audit-report.md'

CLASS_TREE_HINTS = {
    'Voidcalling': 'Druid', 'Earthshaping': 'Druid', 'Natureweaving': 'Druid',
    'Dominance': 'Blessed Crow', 'Ritual': 'Blessed Crow', 'Nourishment': 'Blessed Crow',
    'Night Terrors': 'Dark Fool', 'Dark Fables': 'Dark Fool', 'Mummery': 'Dark Fool',
    'Tend the Enemy': 'Empath', 'Tend the Spirit': 'Empath', 'Tend the Body': 'Empath',
    'Prowess': 'Fianna', 'Resilience': 'Fianna', 'Form of Danu': 'Fianna',
    'Predation': 'Forest Stalker', 'Thorn and Fang': 'Forest Stalker', 'Stone Rain': 'Forest Stalker',
    'Corrupted Blade': 'Red Cap', "Danu's Vengeance": 'Red Cap', 'Forest Walking': 'Red Cap',
}

FIELDS = ('type', 'cast_speed', 'base_value', 'resource_delta', 'range', 'summary')


def load_json(path: Path) -> object:
    return json.loads(path.read_text(encoding='utf-8-sig'))


def normalize_space(value: str | None) -> str | None:
    if value is None:
        return None
    text = re.sub(r'\s+', ' ', str(value).strip())
    return text or None


def normalize_cast(value: str | None) -> str | None:
    value = normalize_space(value)
    if not value:
        return None
    match = re.search(r'(\d+(?:\.\d+)?)\s*s', value, re.I)
    return f"{float(match.group(1)):.1f}s" if match else value


def normalize_range(value: str | None) -> str | None:
    value = normalize_space(value)
    if not value:
        return None
    match = re.match(r'^(\d+(?:\.\d+)?)\s*m\b', value, re.I)
    if match:
        return f"{match.group(1)}m"
    return value


def normalize_resource(value: str | None) -> str | None:
    value = normalize_space(value)
    if not value or value.lower() == 'none':
        return None
    return value


def normalize_summary(value: str | None) -> str | None:
    value = normalize_space(value)
    if not value:
        return None
    value = re.sub(r'(\d+(?:\.\d+)?s)\s+Cooldown\.?\s*', '', value, flags=re.I)
    value = re.sub(r'\([^)]*\)\s*$', '', value).strip()
    value = re.sub(r'Shift\s*\+\s*\d+.*$', '', value, flags=re.I).strip()
    return value or None


def summary_similarity(left: str | None, right: str | None) -> float:
    left = normalize_summary(left) or ''
    right = normalize_summary(right) or ''
    if not left and not right:
        return 1.0
    if not left or not right:
        return 0.0
    return SequenceMatcher(None, left.lower(), right.lower()).ratio()


def tooltip_quality(tooltip: dict, source_file: str) -> int:
    score = 0
    for field in FIELDS:
        if tooltip.get(field):
            score += 2 if field == 'summary' else 1
    if 'Shift' not in (tooltip.get('summary') or ''):
        score += 1
    if source_file.lower().endswith(('.png', '.jpg', '.jpeg')):
        score += 1
    return score


def resolve_class(record: dict, tooltip: dict) -> str | None:
    if record.get('class'):
        return record['class']
    tree = tooltip.get('tree')
    return CLASS_TREE_HINTS.get(tree or '')


def build_ocr_index(records: list[dict]) -> dict[tuple[str, str, str], dict]:
    index: dict[tuple[str, str, str], dict] = {}
    for record in records:
        tooltip = record.get('tooltip')
        if not tooltip:
            continue
        class_name = resolve_class(record, tooltip)
        tree_name = tooltip.get('tree')
        ability_name = tooltip.get('name')
        if not all([class_name, tree_name, ability_name]):
            continue
        key = (class_name, tree_name, ability_name)
        payload = {
            **tooltip,
            'source_file': record.get('file'),
        }
        existing = index.get(key)
        if not existing or tooltip_quality(payload, record.get('file', '')) > tooltip_quality(existing, existing.get('source_file', '')):
            index[key] = payload
    return index


def compare_field(field: str, json_value, ocr_value) -> tuple[bool, str | None, str | None]:
    if field == 'cast_speed':
        left, right = normalize_cast(json_value), normalize_cast(ocr_value)
    elif field == 'range':
        left, right = normalize_range(json_value), normalize_range(ocr_value)
    elif field == 'resource_delta':
        left, right = normalize_resource(json_value), normalize_resource(ocr_value)
    elif field == 'summary':
        ratio = summary_similarity(json_value, ocr_value)
        if ratio >= 0.62:
            return True, json_value, ocr_value
        return False, json_value, ocr_value
    else:
        left, right = normalize_space(json_value), normalize_space(ocr_value)

    if left == right:
        return True, json_value, ocr_value
    if left is None and right is None:
        return True, json_value, ocr_value
    return False, json_value, ocr_value


def audit_ability(class_name: str, tree_name: str, ability_name: str, ability: dict, ocr_index: dict) -> dict:
    icon_path = ability.get('icon')
    icon_exists = bool(icon_path and (ROOT / icon_path.removeprefix('./')).exists())
    key = (class_name, tree_name, ability_name)
    ocr = ocr_index.get(key)

    if not ocr:
        return {
            'class': class_name,
            'tree': tree_name,
            'ability': ability_name,
            'status': 'no_ocr_source',
            'icon': icon_path,
            'icon_exists': icon_exists,
        }

    mismatches = []
    matches = []
    for field in FIELDS:
        ok, json_value, ocr_value = compare_field(field, ability.get(field), ocr.get(field))
        if ok:
            matches.append(field)
        else:
            mismatches.append({
                'field': field,
                'json': json_value,
                'ocr': ocr_value,
            })

    status = 'ok' if not mismatches else 'mismatch'
    return {
        'class': class_name,
        'tree': tree_name,
        'ability': ability_name,
        'status': status,
        'source_file': ocr.get('source_file'),
        'icon': icon_path,
        'icon_exists': icon_exists,
        'matches': matches,
        'mismatches': mismatches,
    }


def render_markdown(summary: dict, by_class: dict, issues: list[dict]) -> str:
    lines = [
        '# Ability Audit Report',
        '',
        'Cross-check of `data.json` against OCR tooltips scraped from screenshots.',
        '',
        '## Summary',
        '',
        f"- Abilities in database: **{summary['total']}**",
        f"- Compared to OCR tooltip: **{summary['compared']}**",
        f"- OK: **{summary['ok']}**",
        f"- Field mismatches: **{summary['mismatch']}**",
        f"- No OCR screenshot source: **{summary['no_ocr_source']}**",
        f"- Missing icon file: **{summary['missing_icon']}**",
        '',
        '## By Class',
        '',
        '| Class | Total | OK | Mismatch | No OCR | Missing Icon |',
        '|-------|------:|---:|---------:|-------:|-------------:|',
    ]

    for class_name, stats in sorted(by_class.items()):
        lines.append(
            f"| {class_name} | {stats['total']} | {stats['ok']} | {stats['mismatch']} | "
            f"{stats['no_ocr_source']} | {stats['missing_icon']} |"
        )

    mismatch_rows = [row for row in issues if row['status'] == 'mismatch']
    if mismatch_rows:
        lines.extend(['', '## Field Mismatches', ''])
        for row in mismatch_rows:
            lines.append(f"### {row['class']} → {row['tree']} → {row['ability']}")
            lines.append(f"- Source: `{row.get('source_file', 'unknown')}`")
            for item in row['mismatches']:
                lines.append(f"- **{item['field']}**")
                lines.append(f"  - JSON: {item['json']!r}")
                lines.append(f"  - OCR: {item['ocr']!r}")
            lines.append('')

    no_source = [row for row in issues if row['status'] == 'no_ocr_source']
    if no_source:
        lines.extend(['', '## No OCR Tooltip Source', ''])
        current_class = None
        for row in no_source:
            if row['class'] != current_class:
                current_class = row['class']
                lines.append(f"### {current_class}")
            icon_note = 'icon ok' if row['icon_exists'] else 'missing icon'
            lines.append(f"- {row['tree']} / {row['ability']} ({icon_note})")

    return '\n'.join(lines) + '\n'


def main() -> None:
    if not SCRAPED.exists():
        raise SystemExit(f'Missing scraped OCR data: {SCRAPED}. Run parse-ocr-abilities.py first.')

    data = load_json(DATA_PATH)
    scraped = load_json(SCRAPED)
    ocr_index = build_ocr_index(scraped.get('records', []))

    issues: list[dict] = []
    by_class: dict[str, dict[str, int]] = {}

    for faction in data:
        for class_obj in faction.get('classes', []):
            class_name = class_obj['class']
            by_class[class_name] = {
                'total': 0, 'ok': 0, 'mismatch': 0, 'no_ocr_source': 0, 'missing_icon': 0,
            }
            for tree in class_obj.get('trees', []):
                for ability_name, ability in tree.get('abilities', {}).items():
                    result = audit_ability(class_name, tree['name'], ability_name, ability, ocr_index)
                    issues.append(result)
                    stats = by_class[class_name]
                    stats['total'] += 1
                    stats[result['status']] += 1
                    if not result.get('icon_exists'):
                        stats['missing_icon'] += 1

    summary = {
        'total': len(issues),
        'compared': sum(1 for row in issues if row['status'] != 'no_ocr_source'),
        'ok': sum(1 for row in issues if row['status'] == 'ok'),
        'mismatch': sum(1 for row in issues if row['status'] == 'mismatch'),
        'no_ocr_source': sum(1 for row in issues if row['status'] == 'no_ocr_source'),
        'missing_icon': sum(1 for row in issues if not row.get('icon_exists')),
    }

    report = {'summary': summary, 'by_class': by_class, 'issues': issues}
    WORK.mkdir(parents=True, exist_ok=True)
    REPORT_JSON.write_text(json.dumps(report, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    REPORT_MD.write_text(render_markdown(summary, by_class, issues), encoding='utf-8')

    print(json.dumps(summary, indent=2))
    print(f'Report: {REPORT_MD}')


if __name__ == '__main__':
    main()
