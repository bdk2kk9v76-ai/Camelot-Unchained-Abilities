#!/usr/bin/env python3
"""Merge OCR tooltip metadata into data.json without adding OCR noise."""

from __future__ import annotations

import json
import re
from collections import defaultdict
from difflib import get_close_matches
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WORK = ROOT / '.work'
SCRAPED = WORK / 'scraped-abilities.json'
DATA_PATH = ROOT / 'data.json'

CLASS_TREE_HINTS = {
    'Voidcalling': 'Druid', 'Earthshaping': 'Druid', 'Natureweaving': 'Druid',
    'Dominance': 'Blessed Crow', 'Ritual': 'Blessed Crow', 'Nourishment': 'Blessed Crow',
    'Night Terrors': 'Dark Fool', 'Dark Fables': 'Dark Fool', 'Mummery': 'Dark Fool',
    'Tend the Enemy': 'Empath', 'Tend the Spirit': 'Empath', 'Tend the Body': 'Empath',
    'Prowess': 'Fianna', 'Resilience': 'Fianna', 'Form of Danu': 'Fianna',
    'Predation': 'Forest Stalker', 'Thorn and Fang': 'Forest Stalker', 'Stone Rain': 'Forest Stalker',
    'Corrupted Blade': 'Red Cap', "Danu's Vengeance": 'Red Cap', 'Forest Walking': 'Red Cap',
}

CORE_TREE = 'Class Abilities'
NOISE = re.compile(
    r'Shift\s*\+|^\+\s*$|ABILITY BOOK|ABILILI BUOK|^(MAIN|GUILD|COMBAT|POOP|ERIU)$|Enter message',
    re.I,
)

DRUID_ABILITIES = {
    CORE_TREE: ['Font of Energy', 'Enchant Humanoid'],
    'Voidcalling': [
        'Void Bolt', 'Void Strike', 'Void Shield', 'Forbidden Pact',
        'Void Comet', 'Void Sight', 'Whispers from Beyond', 'Reality Rift',
    ],
    'Earthshaping': [
        "Hand of Danu", "Danu's Embrace", "Danu's Rebuke", "Danu's Shield",
        'Rockslide', 'Wrath of Danu', 'Weight of Danu', 'Unstable Ground',
    ],
    'Natureweaving': [
        'Weaken', "Scorpion's Sting", 'Poison Bolt', 'Disarm',
        'Revitalize', 'Pacify', 'Return to Earth', 'Speed of the Forest Kin',
    ],
}


def slugify(value: str) -> str:
    return re.sub(r'[^a-z0-9]+', '-', value.lower()).strip('-')


def normalize(text: str) -> str:
    return re.sub(r'\s+', ' ', text.strip())


def load_data() -> list:
    return json.loads(DATA_PATH.read_text())


def build_name_index(data: list) -> dict[str, dict[str, dict[str, dict]]]:
    index: dict[str, dict[str, dict[str, dict]]] = defaultdict(lambda: defaultdict(dict))
    for faction in data:
        for class_obj in faction.get('classes', []):
            class_name = class_obj['class']
            for tree in class_obj.get('trees', []):
                for ability_name, ability in tree.get('abilities', {}).items():
                    index[class_name][tree['name']][ability_name] = dict(ability)
    return index


def tree_ability_names(index: dict, class_name: str, tree_name: str) -> set[str]:
    return set(index.get(class_name, {}).get(tree_name, {}).keys())


def fuzzy(name: str, candidates: set[str]) -> str | None:
    if name in candidates:
        return name
    matches = get_close_matches(name, sorted(candidates), n=1, cutoff=0.78)
    return matches[0] if matches else None


def parse_tooltip(record: dict, class_name: str | None, tree_name: str | None, candidates: set[str]) -> dict | None:
    lines = sorted(record.get('lines', []), key=lambda line: line['y'], reverse=True)
    level_index = None
    for index, line in enumerate(lines):
        if re.search(r'\((?:l?|I?)v\.?\s*[0-9O]\)', line['text'], re.I):
            level_index = index
            break
    if level_index is None:
        return None

    level_line = normalize(lines[level_index]['text'])
    level_match = re.match(r'^(.+?)\s*\((?:l?|I?)v\.?\s*[0-9O]\)$', level_line, re.I)
    parsed_tree = normalize(level_match.group(1)) if level_match else tree_name
    tree_name = parsed_tree or tree_name
    class_name = class_name or CLASS_TREE_HINTS.get(tree_name or '')

    cast = cooldown = ability_type = range_value = base_value = None
    resource_parts: list[str] = []
    description_parts: list[str] = []
    ability_name = None

    for line in lines[level_index + 1:]:
        text = normalize(line['text'])
        if not text or NOISE.search(text) or line['y'] < 1300:
            continue
        if re.fullmatch(r'\d+', text):
            continue
        if match := re.match(r'^(\d+(?:\.\d+)?)s\s+Cast$', text, re.I):
            cast = f"{match.group(1)}s"
            continue
        if match := re.match(r'^(\d+(?:\.\d+)?)s\s+Cooldown$', text, re.I):
            cooldown = f"{match.group(1)}s"
            continue
        if match := re.match(r'^(\d+(?:\.\d+)?)m\s+Range$', text, re.I):
            range_value = f"{match.group(1)}m"
            continue
        if match := re.match(r'^Costs?:\s*(.+)$', text, re.I):
            resource_parts.append(match.group(1).strip())
            continue
        if match := re.match(r'^Grants?:\s*(.+)$', text, re.I):
            resource_parts.append(f"+{match.group(1).strip()}")
            continue
        if re.search(r'(Damage|Healing)$', text, re.I) and re.match(r'^\d', text):
            base_value = text
            continue
        if text in {'Spell', 'Melee', 'Buff', 'Heal', 'Damage', 'Utility', 'Mitigation'}:
            ability_type = text
            continue
        if text == 'Instant':
            ability_type = 'Spell'
            cast = '0.0s'
            continue
        if not ability_name and len(text.split()) <= 6 and text[0].isupper():
            matched = fuzzy(text, candidates)
            if matched:
                ability_name = matched
                continue
        if ability_name and len(text) > 10 and 'Base ' not in text:
            if text not in description_parts:
                description_parts.append(text)

    if not ability_name:
        return None

    summary = ' '.join(reversed(description_parts)).strip()
    if cooldown and 'Cooldown' not in summary:
        summary = f"{summary} {cooldown} Cooldown.".strip()

    return {
        'class': class_name,
        'tree': tree_name,
        'name': ability_name,
        'type': ability_type,
        'cast_speed': cast,
        'resource_delta': ', '.join(resource_parts) if resource_parts else None,
        'range': range_value,
        'base_value': base_value,
        'summary': summary or None,
    }


def seed_druid(index: dict) -> None:
    index.setdefault('Druid', {})
    for tree_name, ability_names in DRUID_ABILITIES.items():
        index['Druid'].setdefault(tree_name, {})
        for ability_name in ability_names:
            index['Druid'][tree_name].setdefault(ability_name, {'resource_delta': 'None'})


def apply_tooltip(index: dict, tooltip: dict) -> bool:
    class_name = tooltip.get('class')
    tree_name = tooltip.get('tree')
    ability_name = tooltip.get('name')
    if not all([class_name, tree_name, ability_name]):
        return False
    if ability_name not in index.get(class_name, {}).get(tree_name, {}):
        return False

    ability = index[class_name][tree_name][ability_name]
    for field in ('type', 'cast_speed', 'resource_delta', 'range', 'base_value', 'summary'):
        value = tooltip.get(field)
        if value:
            ability[field] = value
    if not ability.get('resource_delta'):
        ability['resource_delta'] = 'None'
    return True


def attach_icons(index: dict) -> None:
    icons_root = ROOT / 'assets' / 'abilities'
    for class_name, trees in index.items():
        class_slug = slugify(class_name)
        for tree_name, abilities in trees.items():
            tree_slug = slugify(tree_name)
            tree_icon = icons_root / class_slug / 'trees' / f'{tree_slug}.png'
            for ability_name, ability in abilities.items():
                ability_slug = slugify(ability_name)
                if tree_name == CORE_TREE:
                    icon_path = icons_root / class_slug / 'class-abilities' / f'{ability_slug}.png'
                else:
                    icon_path = icons_root / class_slug / tree_slug / f'{ability_slug}.png'
                if icon_path.exists():
                    ability['icon'] = './' + icon_path.relative_to(ROOT).as_posix()


def serialize_index(index: dict) -> list:
    classes = []
    for class_name in sorted(index.keys()):
        trees = []
        ordered = [CORE_TREE] + sorted(name for name in index[class_name] if name != CORE_TREE)
        for tree_name in ordered:
            abilities = index[class_name].get(tree_name, {})
            if not abilities:
                continue
            tree_payload = {
                'name': tree_name,
                'slug': slugify(tree_name),
                'abilities': {
                    name: {'slug': slugify(name), **payload}
                    for name, payload in sorted(abilities.items())
                },
            }
            tree_icon = ROOT / 'assets' / 'abilities' / slugify(class_name) / 'trees' / f'{slugify(tree_name)}.png'
            if tree_icon.exists():
                tree_payload['icon'] = f'./{tree_icon.relative_to(ROOT).as_posix()}'
            trees.append(tree_payload)
        classes.append({'class': class_name, 'slug': slugify(class_name), 'trees': trees})
    return [{'faction': 'Tuatha Dé Danann', 'classes': classes}]


def main() -> None:
    index = build_name_index(load_data())
    seed_druid(index)
    records = json.loads(SCRAPED.read_text())['records']

    applied = 0
    for record in records:
        class_name = record.get('class') or CLASS_TREE_HINTS.get(record.get('tree') or '')
        tree_name = record.get('tree')
        if not class_name or not tree_name:
            continue
        candidates = tree_ability_names(index, class_name, tree_name)
        if not candidates:
            continue
        tooltip = parse_tooltip(record, class_name, tree_name, candidates)
        if tooltip and apply_tooltip(index, tooltip):
            applied += 1

    attach_icons(index)
    output = serialize_index(index)
    DATA_PATH.write_text(json.dumps(output))
    print(f'Applied {applied} tooltip updates')
    for class_obj in output[0]['classes']:
        print(f"  {class_obj['class']}: " + ', '.join(
            f"{tree['name']} ({len(tree['abilities'])})" for tree in class_obj['trees']
        ))


if __name__ == '__main__':
    main()
