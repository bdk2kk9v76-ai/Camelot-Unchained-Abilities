#!/usr/bin/env python3
"""Filter audit mismatches to a short list likely indicating JSON errors."""

from __future__ import annotations

import json
import re
from difflib import SequenceMatcher
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WORK = ROOT / '.work'
AUDIT = WORK / 'audit-report.json'
OUT_JSON = WORK / 'likely-wrong-in-json.json'
OUT_MD = WORK / 'likely-wrong-in-json.md'

NOISE = re.compile(
    r'Shift\s*\+|ABILITY\s*BOOK|ABILILI|Enter message|^\+\s*$',
    re.I,
)


def is_noisy(value) -> bool:
    if value is None:
        return False
    text = str(value)
    if NOISE.search(text):
        return True
    if text.count('!') > 2:
        return True
    return False


def parse_seconds(value) -> float | None:
    if not value:
        return None
    match = re.search(r'(\d+(?:\.\d+)?)\s*s', str(value), re.I)
    return float(match.group(1)) if match else None


def parse_meters(value) -> float | None:
    if not value:
        return None
    match = re.match(r'^(\d+(?:\.\d+)?)\s*m\b', str(value), re.I)
    return float(match.group(1)) if match else None


def has_minus(value) -> bool:
    return bool(re.search(r'-\s*\d', str(value or '')))


def has_plus(value) -> bool:
    return bool(re.search(r'\+\s*\d', str(value or '')))


def looks_unsigned_cost(value) -> bool:
    text = str(value or '')
    if not text or text.lower() == 'none':
        return False
    if has_minus(text) or has_plus(text):
        return False
    return bool(re.search(r'\d+\s*(Focus|Courage|Faith|Determination|Mana|Judgment)', text, re.I))


def summary_ratio(left, right) -> float:
    if not left or not right:
        return 0.0
    return SequenceMatcher(None, str(left).lower(), str(right).lower()).ratio()


def classify(field: str, json_value, ocr_value, ability_name: str) -> tuple[str, str, str] | None:
    """Return (kind, confidence, reason) or None to skip."""

    if ocr_value is None:
        return None

    if is_noisy(ocr_value):
        return None

    if field == 'cast_speed':
        js, os = parse_seconds(json_value), parse_seconds(ocr_value)
        if js is not None and os is not None and abs(js - os) >= 0.15:
            return 'cast_speed', 'high', f'OCR shows {ocr_value}, JSON has {json_value}'

    if field == 'range':
        jr, or_ = str(json_value or '').lower(), str(ocr_value or '').lower()
        jm, om = parse_meters(json_value), parse_meters(ocr_value)
        if jm is not None and om is not None and abs(jm - om) >= 1:
            return 'range', 'high', f'OCR shows {ocr_value}, JSON has {json_value}'
        if ('self' in jr) != ('self' in or_) and jr != or_:
            return 'range', 'medium', f'OCR shows {ocr_value}, JSON has {json_value}'

    if field == 'resource_delta':
        if is_noisy(json_value):
            return None
        jtext, otext = str(json_value or ''), str(ocr_value or '')
        if looks_unsigned_cost(json_value) and has_minus(ocr_value):
            return 'resource_delta', 'high', f'JSON missing cost minus sign; OCR shows {ocr_value!r}'
        if has_minus(json_value) != has_minus(ocr_value) or has_plus(json_value) != has_plus(ocr_value):
            if has_minus(ocr_value) or has_plus(ocr_value):
                return 'resource_delta', 'high', f'Sign mismatch: JSON {json_value!r} vs OCR {ocr_value!r}'
        if jtext and otext and otext not in jtext and jtext not in otext:
            if has_plus(ocr_value) and not has_plus(json_value):
                return 'resource_delta', 'medium', f'JSON may be missing grant: OCR {ocr_value!r}'

    if field == 'base_value':
        if json_value and not ocr_value:
            return None  # OCR often misses base_value
        if json_value and ocr_value:
            ratio = summary_ratio(json_value, ocr_value)
            if ratio < 0.45:
                return 'base_value', 'medium', f'Values diverge: JSON {json_value!r} vs OCR {ocr_value!r}'

    if field == 'type' and json_value and ocr_value:
        j, o = str(json_value).lower(), str(ocr_value).lower()
        if o not in j and j not in o and o in {'spell', 'melee', 'buff', 'damage', 'heal'}:
            return 'type', 'medium', f'OCR {ocr_value} vs JSON {json_value}'

    if field == 'summary' and json_value and ocr_value:
        if is_noisy(json_value) or is_noisy(ocr_value):
            return None
        ratio = summary_ratio(json_value, ocr_value)
        # OCR matched wrong ability on screen
        if ability_name.lower() not in str(ocr_value).lower():
            return None
        if ratio < 0.55:
            return 'summary', 'medium', 'Description diverges from tooltip OCR (same ability name)'

    return None


def render_markdown(items: list[dict], unverified: list[dict]) -> str:
    lines = [
        '# Likely Wrong in JSON',
        '',
        'Filtered from OCR screenshot audit. Excludes obvious OCR noise (hotbar bleed, Shift+N, etc.).',
        '**High** = numeric/sign conflict worth fixing. **Medium** = probable gap, verify in-game.',
        '',
        f'**{len([i for i in items if i["confidence"] == "high"])} high**, '
        f'**{len([i for i in items if i["confidence"] == "medium"])} medium** confidence issues.',
        '',
    ]

    for confidence in ('high', 'medium'):
        group = [i for i in items if i['confidence'] == confidence]
        if not group:
            continue
        lines.append(f'## {confidence.title()} confidence')
        lines.append('')
        for item in group:
            lines.append(f"### {item['class']} → {item['tree']} → {item['ability']}")
            lines.append(f"- **Field:** `{item['field']}` ({item['kind']})")
            lines.append(f"- **Reason:** {item['reason']}")
            lines.append(f"- **JSON:** `{item['json']}`")
            lines.append(f"- **OCR:** `{item['ocr']}`")
            lines.append(f"- **Source:** `{item['source']}`")
            lines.append('')

    if unverified:
        lines.extend(['## Unverified (no tooltip screenshot)', ''])
        lines.append('These abilities have icons but no HEIC tooltip OCR in the zip — JSON not cross-checked.')
        lines.append('')
        by_class: dict[str, list[str]] = {}
        for row in unverified:
            by_class.setdefault(row['class'], []).append(f"{row['tree']} / {row['ability']}")
        for class_name in sorted(by_class):
            lines.append(f'### {class_name} ({len(by_class[class_name])})')
            for entry in by_class[class_name]:
                lines.append(f'- {entry}')
            lines.append('')

    return '\n'.join(lines) + '\n'


def main() -> None:
    if not AUDIT.exists():
        raise SystemExit(f'Missing {AUDIT}. Run scripts/audit-abilities.py first.')

    audit = json.loads(AUDIT.read_text(encoding='utf-8'))
    items: list[dict] = []
    unverified: list[dict] = []

    for row in audit['issues']:
        if row['status'] == 'no_ocr_source':
            unverified.append(row)
            continue
        if row['status'] != 'mismatch':
            continue
        for mismatch in row.get('mismatches', []):
            result = classify(
                mismatch['field'],
                mismatch['json'],
                mismatch['ocr'],
                row['ability'],
            )
            if not result:
                continue
            kind, confidence, reason = result
            if confidence == 'low':
                continue
            items.append({
                'class': row['class'],
                'tree': row['tree'],
                'ability': row['ability'],
                'field': mismatch['field'],
                'kind': kind,
                'confidence': confidence,
                'reason': reason,
                'json': mismatch['json'],
                'ocr': mismatch['ocr'],
                'source': row.get('source_file'),
            })

    items.sort(key=lambda x: (x['confidence'] != 'high', x['class'], x['tree'], x['ability'], x['field']))

    payload = {
        'summary': {
            'high': sum(1 for i in items if i['confidence'] == 'high'),
            'medium': sum(1 for i in items if i['confidence'] == 'medium'),
            'unverified_count': len(unverified),
        },
        'issues': items,
        'unverified': unverified,
    }

    WORK.mkdir(parents=True, exist_ok=True)
    OUT_JSON.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    OUT_MD.write_text(render_markdown(items, unverified), encoding='utf-8')

    print(json.dumps(payload['summary'], indent=2))
    print(f'Wrote {OUT_MD}')


if __name__ == '__main__':
    main()
