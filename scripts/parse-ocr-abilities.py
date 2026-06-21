#!/usr/bin/env python3
"""Build structured ability database from Vision OCR output."""

from __future__ import annotations

import json
import re
from collections import defaultdict
from difflib import get_close_matches
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WORK = ROOT / '.work'
DATA_PATH = ROOT / 'data.json'
OCR_PATHS = [WORK / 'ocr-abilities.json', WORK / 'ocr-images.json']
OUTPUT = WORK / 'scraped-abilities.json'

CLASS_NAMES = [
    'Blessed Crow', 'Dark Fool', 'Druid', 'Empath', 'Fianna',
    'Forest Stalker', 'Red Cap'
]
CORE_TREE = 'Class Abilities'

CLASS_TREE_HINTS = {
    'Voidcalling': 'Druid',
    'Earthshaping': 'Druid',
    'Natureweaving': 'Druid',
    'Font of Energy': 'Druid',
    'Enchant Humanoid': 'Druid',
    'Dominance': 'Blessed Crow',
    'Ritual': 'Blessed Crow',
    'Nourishment': 'Blessed Crow',
    'Night Terrors': 'Dark Fool',
    'Dark Fables': 'Dark Fool',
    'Mummery': 'Dark Fool',
    'Tend the Enemy': 'Empath',
    'Tend the Spirit': 'Empath',
    'Tend the Body': 'Empath',
    'Prowess': 'Fianna',
    'Resilience': 'Fianna',
    'Form of Danu': 'Fianna',
    'Predation': 'Forest Stalker',
    'Thorn and Fang': 'Forest Stalker',
    'Stone Rain': 'Forest Stalker',
    'Corrupted Blade': 'Red Cap',
    "Danu's Vengeance": 'Red Cap',
    'Forest Walking': 'Red Cap',
}

CAST_RE = re.compile(r'^(\d+(?:\.\d+)?)s\s+Cast$', re.I)
COOLDOWN_RE = re.compile(r'^(\d+(?:\.\d+)?)s\s+Cooldown$', re.I)
LEVEL_RE = re.compile(r'^(.+?)\s*\((?:l?|I?)v\.?\s*([0-9O])\)$', re.I)
RANGE_RE = re.compile(r'^(\d+(?:\.\d+)?)m\s+Range$', re.I)
COSTS_RE = re.compile(r'^Costs?:\s*(.+)$', re.I)
GRANTS_RE = re.compile(r'^Grants?:\s*(.+)$', re.I)
BOOK_RE = re.compile(r'ABILITY\s*BOOK|ABILILI\s*BUUK|ABILI.*BOOK', re.I)


def slugify(value: str) -> str:
    return re.sub(r'[^a-z0-9]+', '-', value.lower()).strip('-')


def normalize(text: str) -> str:
    return re.sub(r'\s+', ' ', text.strip())


def load_seed_names() -> dict[str, set[str]]:
    data = json.loads(DATA_PATH.read_text())
    seed: dict[str, set[str]] = defaultdict(set)
    for faction in data:
        for class_obj in faction.get('classes', []):
            class_name = class_obj['class']
            for tree in class_obj.get('trees', []):
                for ability_name in tree.get('abilities', {}):
                    seed[class_name].add(ability_name)
    return seed


def fuzzy_name(name: str, candidates: set[str]) -> str:
    if not name:
        return name
    if name in candidates:
        return name
    match = get_close_matches(name, sorted(candidates), n=1, cutoff=0.72)
    return match[0] if match else name


def sorted_lines(entry: dict) -> list[dict]:
    return sorted(entry.get('lines', []), key=lambda line: (-line['y'], line['x']))


def has_book_header(lines: list[dict]) -> bool:
    return any(BOOK_RE.search(line['text']) for line in lines)


def detect_tree_name(lines: list[dict]) -> str | None:
    for index, line in enumerate(lines):
        if not BOOK_RE.search(line['text']):
            continue
        for candidate in lines[index + 1:index + 8]:
            text = normalize(candidate['text'])
            if re.fullmatch(r'\d+', text):
                continue
            if text in CLASS_NAMES:
                return CORE_TREE
            if len(text) >= 4 and text[0].isupper():
                return text
    for line in lines:
        text = normalize(line['text'])
        if text in CLASS_TREE_HINTS or text in {
            'Corrupted Blade', "Danu's Vengeance", 'Forest Walking', 'Enter Veil', 'Poison Weapons'
        }:
            return text
    return None


def detect_class_name(lines: list[dict], tree_name: str | None) -> str | None:
    joined = ' '.join(normalize(line['text']) for line in lines)
    for class_name in CLASS_NAMES:
        if class_name in joined:
            return class_name
    if tree_name and tree_name in CLASS_TREE_HINTS:
        return CLASS_TREE_HINTS[tree_name]
    if tree_name in CLASS_NAMES:
        return tree_name
    return None


def parse_tooltip(lines: list[dict], known_names: set[str]) -> dict | None:
    ordered = sorted(lines, key=lambda line: line['y'], reverse=True)
    tooltip_index = None
    for index, line in enumerate(ordered):
        if LEVEL_RE.match(normalize(line['text'])):
            tooltip_index = index
            break
    if tooltip_index is None:
        return None

    cast = cooldown = ability_type = range_value = None
    resource_parts = []
    base_value = None
    description_parts = []
    level_match = LEVEL_RE.match(normalize(ordered[tooltip_index]['text']))
    tree_name = normalize(level_match.group(1)) if level_match else None
    ability_name = None

    for line in ordered[tooltip_index + 1:]:
        text = normalize(line['text'])
        if not text or text == '+':
            continue
        if CAST_RE.match(text):
            cast = f"{CAST_RE.match(text).group(1)}s"
            continue
        if COOLDOWN_RE.match(text):
            cooldown = f"{COOLDOWN_RE.match(text).group(1)}s"
            continue
        if match := RANGE_RE.match(text):
            range_value = f"{match.group(1)}m"
            continue
        if match := COSTS_RE.match(text):
            resource_parts.append(f"-{match.group(1).strip()}")
            continue
        if match := GRANTS_RE.match(text):
            resource_parts.append(f"+{match.group(1).strip()}")
            continue
        if re.search(r'(Damage|Healing)$', text, re.I) and re.match(r'^\d', text):
            base_value = text
            continue
        if text in {'Spell', 'Melee', 'Buff', 'Heal', 'Damage', 'Utility', 'Mitigation', 'Instant'}:
            ability_type = 'Spell' if text == 'Instant' else text
            continue
        if not ability_name and len(text.split()) <= 6 and text[0].isupper():
            ability_name = fuzzy_name(text, known_names)
            continue
        if ability_name and len(text) > 8:
            description_parts.append(text)

    if not ability_name:
        return None

    summary_parts = list(reversed(description_parts))
    if cooldown and not any('Cooldown' in part for part in summary_parts):
        summary_parts.append(f"{cooldown} Cooldown.")

    resource_delta = ', '.join(resource_parts) if resource_parts else None
    if resource_delta:
        resource_delta = resource_delta.replace('Judgment', 'Judgment').replace('Faith', 'Faith')

    return {
        'name': ability_name,
        'tree': tree_name,
        'type': ability_type,
        'cast_speed': cast,
        'resource_delta': resource_delta or None,
        'range': range_value,
        'base_value': base_value,
        'summary': ' '.join(summary_parts).strip() or None,
    }


def parse_book_abilities(lines: list[dict], tree_name: str | None, known_names: set[str]) -> list[str]:
    names = []
    for line in lines:
        text = normalize(line['text'])
        if not text or text in {'+', 'ABILITY BOOK'} or BOOK_RE.search(text):
            continue
        if text in CLASS_NAMES or text == tree_name:
            continue
        if re.fullmatch(r'\d+', text) or re.fullmatch(r'\d+\s*/\s*\d+', text):
            continue
        if LEVEL_RE.match(text) or CAST_RE.match(text) or COOLDOWN_RE.match(text):
            continue
        if COSTS_RE.match(text) or GRANTS_RE.match(text) or RANGE_RE.match(text):
            continue
        if re.search(r'(Damage|Healing|Cooldown|Cast|Range|Costs|Grants)', text, re.I):
            continue
        if len(text.split()) <= 5 and text[0].isupper() and len(text) >= 4:
            names.append(fuzzy_name(text, known_names))

    deduped = []
    seen = set()
    for name in names:
        if name not in seen:
            seen.add(name)
            deduped.append(name)
    return deduped


def infer_core_abilities(lines: list[dict], class_name: str | None, known_names: set[str]) -> list[str]:
    if class_name != 'Red Cap':
        return []
    names = []
    for line in lines:
        text = normalize(line['text'])
        if text in {'Enter Veil', 'Poison Weapons'}:
            names.append(text)
    return [fuzzy_name(name, known_names) for name in names]


def parse_entry(entry: dict, seed_names: dict[str, set[str]]) -> dict:
    lines = sorted_lines(entry)
    tree_name = detect_tree_name(lines)
    class_name = detect_class_name(lines, tree_name)
    known_names = set()
    if class_name:
        known_names |= seed_names.get(class_name, set())
    known_names |= {name for names in seed_names.values() for name in names}

    tooltip = parse_tooltip(lines, known_names)
    if tree_name == 'Red Cap' and infer_core_abilities(lines, class_name, known_names):
        tree_name = CORE_TREE
        class_name = 'Red Cap'

    ability_names = parse_book_abilities(lines, tree_name, known_names)
    ability_names.extend(infer_core_abilities(lines, class_name, known_names))

    if tree_name in CLASS_NAMES:
        tree_name = CORE_TREE

    return {
        'file': entry['file'],
        'width': entry.get('width'),
        'height': entry.get('height'),
        'class': class_name,
        'tree': tree_name,
        'ability_names': ability_names,
        'tooltip': tooltip,
        'lines': lines,
    }


def merge_database(records: list[dict]) -> dict:
    merged: dict[str, dict[str, dict[str, dict]]] = defaultdict(lambda: defaultdict(lambda: {'abilities': {}}))

    for record in records:
        class_name = record.get('class')
        tree_name = record.get('tree')
        if not class_name or not tree_name:
            continue

        tree = merged[class_name][tree_name]
        for ability_name in record.get('ability_names', []):
            if ability_name and ability_name != tree_name:
                tree['abilities'].setdefault(ability_name, {})

        tooltip = record.get('tooltip') or {}
        tooltip_name = tooltip.get('name')
        if tooltip_name:
            ability = tree['abilities'].setdefault(tooltip_name, {})
            for field in ('type', 'cast_speed', 'resource_delta', 'range', 'base_value', 'summary'):
                value = tooltip.get(field)
                if value:
                    ability[field] = value

    return {
        class_name: {
            tree_name: tree_data['abilities']
            for tree_name, tree_data in trees.items()
        }
        for class_name, trees in merged.items()
    }


def main() -> None:
    seed_names = load_seed_names()
    records = []
    for ocr_path in OCR_PATHS:
        if not ocr_path.exists():
            continue
        for entry in json.loads(ocr_path.read_text()):
            records.append(parse_entry(entry, seed_names))

    merged = merge_database(records)
    OUTPUT.write_text(json.dumps({'records': records, 'merged': merged}, indent=2))

    print(f'Parsed {len(records)} OCR files')
    for class_name in sorted(merged):
        tree_summary = ', '.join(
            f"{tree} ({len(abilities)})" for tree, abilities in sorted(merged[class_name].items())
        )
        print(f'  {class_name}: {tree_summary}')


if __name__ == '__main__':
    main()
