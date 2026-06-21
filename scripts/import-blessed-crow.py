#!/usr/bin/env python3
"""Import Blessed Crow icons and tooltip metadata from OCR'd HEIC screenshots."""

from __future__ import annotations

import importlib.util
import json
import re
import subprocess
import sys
from difflib import get_close_matches
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
WORK = ROOT / '.work'
IMAGES = WORK / 'blessed-crow-images'
OCR_PATH = WORK / 'ocr-blessed-crow.json'
DATA_PATH = ROOT / 'data.json'
OUT = ROOT / 'assets' / 'abilities' / 'blessed-crow'
PNG_CACHE = IMAGES / 'png-cache'
BORDER_TRIM = 0.11
ICON_SIZE = 128

BC_TREES = {'Dominance', 'Ritual', 'Nourishment', 'Class Abilities'}
SCREEN_TYPES = {'Spell', 'Melee', 'Buff', 'Heal', 'Damage', 'Utility', 'Mitigation'}
ABILITIES = {
    'Class Abilities': ['Armor of Faith', 'Rally'],
    'Dominance': [
        'Crushing Might', 'Overwhelm', 'Strike of the Blessed', 'Blessed Warrior',
        'Living Symbol', 'Sacred Pride', 'Scorn the Weak', 'Avatar of Bran',
    ],
    'Ritual': [
        'Summon Cauldron', "Nature's Rebuke", 'Dark Work', 'Blood Offering',
        'Rite of Healing', 'Call Down', 'Rite of Sickness', 'Conduit of Power', 'Rite of Ruin',
    ],
    'Nourishment': [
        'Nurture Life', "Branwen's Tears", 'Cleansing Winds', 'Rise from the Cauldron',
        'Regrowth', 'Dedicated Pursuit', "Bran's Aid", "Bran's Gift",
    ],
}

NOISE = re.compile(
    r'Shift\s*[\+=]|^\+\s*$|ABILITY BOOK|Enter message|^(MAIN|GUILD|COMBAT|POOP|ERIU|Trade|Zone|Child|Cuild|Grild|Gild)$',
    re.I,
)
CHAT_NOISE = re.compile(
    r'(?:Trade|Zone|Guild|Cuild|Grild|Gild|Child|Lone|Matiz|Ramius|Teloin|DeRanged|Kwokwek|Chigurh|Leader)',
    re.I,
)
LEVEL_RE = re.compile(r'^(.+?)\s*\((?:Iv\.|lv\.)\s*[\dO]+\)$', re.I)
CAST_RE = re.compile(r'^(\d+(?:\.\d+)?)s\s+Cast$', re.I)
COOLDOWN_RE = re.compile(r'^(\d+(?:\.\d+)?)[sO]?\s*Cooldown', re.I)
RANGE_RE = re.compile(r'^(\d+(?:\.\d+)?)m\s+Range(?:\s*\([^)]+\))?$', re.I)
COSTS_RE = re.compile(r'^Costs?:\s*(.+)$', re.I)
GRANTS_RE = re.compile(r'^Grants?:\s*(.+)$', re.I)
BASE_RE = re.compile(r'^(\d+)\s+Base\s+(Damage|Healing)$', re.I)
STAT_LINE_RE = re.compile(
    r'^(Instant|\d+(?:\.\d+)?s\s+Cast|\d+(?:\.\d+)?[sO]?\s*Cooldown|\d+(?:\.\d+)?m\s+Range|\d+\s+Base\s+(?:Damage|Healing)|Spell|Melee|Buff|Heal|Damage|Utility|Mitigation|Self|Friend)$',
    re.I,
)
TOOLTIP_MIN_X = 1600


def load_build_database():
    spec = importlib.util.spec_from_file_location('build_database', ROOT / 'scripts' / 'build-database.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def slugify(value: str) -> str:
    return re.sub(r'[^a-z0-9]+', '-', value.lower()).strip('-')


def normalize(text: str) -> str:
    return re.sub(r'\s+', ' ', text.strip())


def fuzzy(name: str, candidates: set[str]) -> str | None:
    if name in candidates:
        return name
    matches = get_close_matches(name, sorted(candidates), n=1, cutoff=0.72)
    return matches[0] if matches else None


def normalize_resource_delta(value: str | None) -> str | None:
    if not value:
        return value
    parts = [p.strip() for p in value.split(',')]
    cleaned = []
    for part in parts:
        part = part.replace('+|', '+1').replace('| Judgment', '1 Judgment').replace('judgment', 'Judgment')
        if part.startswith('+'):
            cleaned.append(part)
        elif part.startswith('-'):
            cleaned.append(part[1:].strip())
        else:
            cleaned.append(part)
    return ', '.join(cleaned)


def all_bc_names(index: dict) -> set[str]:
    names: set[str] = set()
    for tree in index['Blessed Crow'].values():
        names.update(tree.keys())
    return names


def clean_summary(text: str | None, class_names: set[str]) -> str | None:
    if not text:
        return None
    text = NOISE.sub('', text)
    text = re.sub(r'\s+', ' ', text).strip(' ,.')
    if not text or CHAT_NOISE.search(text) or len(text) < 12:
        return None

    for _ in range(4):
        stripped = False
        for name in sorted(class_names, key=len, reverse=True):
            if re.match(rf'^{re.escape(name)}\b', text):
                text = re.sub(rf'^{re.escape(name)}\b\s*', '', text).strip(' ,.')
                stripped = True
                break
        if not stripped:
            break

    for name in sorted(class_names, key=len, reverse=True):
        if re.search(rf'\b{re.escape(name)}\b', text) and not re.match(rf'^{re.escape(name)}\b', text):
            text = re.sub(rf'\b{re.escape(name)}\b', ' ', text)

    text = re.sub(r'\s+', ' ', text).strip(' ,.')
    text = re.sub(r'\b(\d+(?:\.\d+)?)[Uu](s)\b', r'\1\2', text, flags=re.I)
    return text if len(text) >= 12 else None


def summary_quality(text: str | None) -> int:
    if not text:
        return 0
    score = min(len(text), 240)
    if CHAT_NOISE.search(text):
        score -= 200
    if 'Cooldown' in text:
        score += 15
    return score


def is_book_page(lines: list[dict]) -> bool:
    texts = [normalize(line['text']) for line in lines]
    if not any('ABILITY BOOK' in text for text in texts):
        return False
    ability_hits = sum(
        1 for tree, names in ABILITIES.items()
        for name in names
        if name in texts
    )
    return ability_hits >= 4


def is_tooltip_page(entry: dict) -> bool:
    lines = entry.get('lines', [])
    has_level = any(LEVEL_RE.match(normalize(line['text'])) for line in lines)
    has_cast = any(CAST_RE.match(normalize(line['text'])) or normalize(line['text']) == 'Instant' for line in lines)
    return has_level and has_cast


def parse_tooltip(entry: dict, candidates: set[str], class_names: set[str]) -> dict | None:
    height = entry.get('height') or 4032
    lines = entry.get('lines', [])
    min_y = height * 0.12

    level_line = None
    for line in lines:
        if LEVEL_RE.match(normalize(line['text'])):
            level_line = line
            break
    if level_line is None:
        return None

    tree_name = normalize(LEVEL_RE.match(normalize(level_line['text'])).group(1))
    if tree_name not in BC_TREES:
        return None

    level_y = level_line['y']
    tooltip_lines = [
        line for line in lines
        if min_y <= line['y'] < level_y and not NOISE.search(normalize(line['text']))
    ]
    tooltip_lines.sort(key=lambda line: line['y'], reverse=True)

    cast = cooldown = ability_type = range_value = base_value = None
    resource_parts: list[str] = []
    cast_y = None

    for line in tooltip_lines:
        text = normalize(line['text'])
        if text == 'Instant':
            cast = '0.0s'
            cast_y = line['y']
            break
        if match := CAST_RE.match(text):
            cast = f"{match.group(1)}s"
            cast_y = line['y']
            break

    if cast_y is None:
        return None

    between = [line for line in tooltip_lines if cast_y < line['y'] < level_y]
    name_matches: list[tuple[float, str]] = []
    for line in between:
        text = normalize(line['text'])
        if len(text.split()) > 6 or len(text) < 4:
            continue
        matched = fuzzy(text, candidates)
        if matched:
            name_matches.append((line['y'], matched))

    if not name_matches:
        return None

    ability_name = max(name_matches, key=lambda item: item[0])[1]
    name_y = max(y for y, name in name_matches if name == ability_name)

    description_parts: list[str] = []
    for line in between:
        if line['y'] >= name_y or line['x'] < TOOLTIP_MIN_X:
            continue
        text = normalize(line['text'])
        if len(text) < 12 or CHAT_NOISE.search(text):
            continue
        if fuzzy(text, candidates) or LEVEL_RE.match(text) or STAT_LINE_RE.match(text):
            continue
        if text not in description_parts:
            description_parts.append(text)

    for line in tooltip_lines:
        if line['y'] > cast_y:
            continue
        text = normalize(line['text'])
        if match := COOLDOWN_RE.match(text):
            cooldown = f"{match.group(1)}s"
        elif match := RANGE_RE.match(text):
            range_value = text.replace(' Range', '').strip()
            if not range_value.endswith('m') and 'm' in text:
                range_value = re.sub(r'\s*Range\s*', '', text).strip()
        elif text in {'Self', 'Friend'}:
            range_value = text
        elif match := COSTS_RE.match(text):
            resource_parts.append(match.group(1).strip())
        elif match := GRANTS_RE.match(text):
            resource_parts.append(f"+{match.group(1).strip()}")
        elif match := BASE_RE.match(text):
            base_value = f"{match.group(1)} Base {match.group(2)}"
        elif text in SCREEN_TYPES:
            ability_type = text

    summary = clean_summary(' '.join(reversed(description_parts)).strip(), class_names)
    if summary and cooldown and 'Cooldown' not in summary:
        summary = f"{summary} {cooldown} Cooldown.".strip()

    return {
        'tree': tree_name,
        'name': ability_name,
        'type': ability_type,
        'cast_speed': cast,
        'resource_delta': normalize_resource_delta(', '.join(resource_parts) if resource_parts else None),
        'range': range_value,
        'base_value': base_value,
        'summary': summary,
    }


def tooltip_score(tip: dict) -> int:
    score = 0
    for field in ('cast_speed', 'range', 'resource_delta', 'base_value', 'type'):
        if tip.get(field):
            score += 12
    score += summary_quality(tip.get('summary'))
    return score


def apply_tooltip(ability: dict, tip: dict) -> bool:
    changed = False
    for field in ('cast_speed', 'range', 'base_value', 'type'):
        value = tip.get(field)
        if value and ability.get(field) != value:
            ability[field] = value
            changed = True

    resource = tip.get('resource_delta')
    if resource and ability.get('resource_delta') != resource:
        ability['resource_delta'] = resource
        changed = True

    new_summary = tip.get('summary')
    if new_summary and summary_quality(new_summary) > summary_quality(ability.get('summary')) + 5:
        ability['summary'] = new_summary
        changed = True
    return changed


BC_OVERRIDES = {
    ('Class Abilities', 'Rally'): {
        'type': 'Spell',
        'cast_speed': '0.2s',
        'base_value': 'Strong Heal Over Time',
        'resource_delta': '2 Judgment, +500 Faith',
        'range': '90m',
        'summary': 'Grants your party a strong Heal Over Time for 6 seconds. 6.0s Cooldown.',
    },
    ('Class Abilities', 'Armor of Faith'): {
        'type': 'Spell',
        'cast_speed': '0.2s',
        'range': 'Self',
        'summary': 'Increases your Physical Armor by 70% for 8 seconds. 60.0s Cooldown.',
    },
    ('Dominance', 'Overwhelm'): {
        'type': 'Spell',
        'cast_speed': '0.6s',
        'base_value': '4730 Base Damage',
        'resource_delta': '1 Judgment, +250 Faith',
        'range': '6m',
        'summary': 'Deals Shadow damage. The target takes +50% damage from this ability for 6 seconds.',
    },
    ('Dominance', 'Living Symbol'): {
        'type': 'Spell',
        'cast_speed': '0.2s',
        'resource_delta': '2 Judgment, +500 Faith',
        'range': 'Self',
        'summary': 'Creates an aura that grants increased Physical and Magical armor and Panic Resistance to nearby allies. 15.0s Cooldown.',
    },
    ('Dominance', 'Scorn the Weak'): {
        'type': 'Spell',
        'cast_speed': '0.2s',
        'resource_delta': '150 Faith, +1 Judgment',
        'range': '25m',
        'summary': 'Snares the target and reduces damage dealt by 30%. 30.0s Cooldown.',
    },
}


def open_image(path: Path) -> Image.Image:
    if path.suffix.lower() != '.png':
        PNG_CACHE.mkdir(parents=True, exist_ok=True)
        cached = PNG_CACHE / f'{path.stem}.png'
        if not cached.exists():
            subprocess.run(['sips', '-s', 'format', 'png', str(path), '--out', str(cached)],
                           check=True, capture_output=True)
        path = cached
    return Image.open(path).convert('RGBA')


def find_line(entry: dict, text: str) -> dict | None:
    lines = [line for line in entry.get('lines', []) if line.get('text', '').strip()]
    for line in lines:
        if line['text'].strip().lower() == text.lower():
            return line
    candidates = {line['text'].strip(): line for line in lines}
    matches = get_close_matches(text, candidates.keys(), n=1, cutoff=0.72)
    return candidates[matches[0]] if matches else None


def crop_left_of_label(image: Image.Image, label_line: dict, scale: float = 1.0) -> Image.Image:
    label_w = label_line['width']
    label_h = label_line['height']
    label_x = label_line['x']
    label_y = label_line['y']
    side = max(label_h * 1.35, label_w * 1.8) * scale
    left = max(0, label_x - side * 0.95)
    top = max(0, label_y - (side - label_h) / 2)
    right = min(image.width, left + side)
    bottom = min(image.height, label_y + label_h + (side - label_h) / 2)
    return image.crop((int(left), int(top), int(right), int(bottom)))


def crop_above_label(image: Image.Image, label_line: dict, scale: float = 1.0) -> Image.Image:
    label_w = label_line['width']
    label_h = label_line['height']
    label_x = label_line['x']
    label_y = label_line['y']
    center_x = label_x + label_w / 2
    side = max(label_h * 4.5, label_w * 2.2) * scale
    left = max(0, center_x - side / 2)
    top = max(0, label_y - side * 1.05)
    right = min(image.width, left + side)
    bottom = min(image.height, label_y + label_h * 0.1)
    return image.crop((int(left), int(top), int(right), int(bottom)))


def trim_and_save(image: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    width, height = image.size
    inset = int(min(width, height) * BORDER_TRIM)
    trimmed = image.crop((inset, inset, width - inset, height - inset))
    trimmed.resize((ICON_SIZE, ICON_SIZE), Image.Resampling.LANCZOS).save(path, format='PNG', optimize=True)


def ability_path(tree: str, ability: str) -> Path:
    slug = slugify(ability)
    if tree == 'Class Abilities':
        return OUT / 'class-abilities' / f'{slug}.png'
    return OUT / slugify(tree) / f'{slug}.png'


def extract_icons(ocr_entries: list[dict]) -> int:
    extracted = 0

    for entry in ocr_entries:
        if is_book_page(entry.get('lines', [])):
            texts = {normalize(line['text']) for line in entry.get('lines', [])}
            image_path = IMAGES / entry['file']
            if not image_path.exists():
                continue
            image = open_image(image_path)
            scale = 1.15 if entry.get('width', 0) > 3500 else 1.0

            if 'Blessed Crow' in texts and {'Dominance', 'Ritual', 'Nourishment'} <= texts:
                for tree_name in ('Dominance', 'Ritual', 'Nourishment'):
                    line = find_line(entry, tree_name)
                    if line:
                        trim_and_save(crop_above_label(image, line, scale),
                                      OUT / 'trees' / f'{slugify(tree_name)}.png')
                        extracted += 1
                for ability in ABILITIES['Class Abilities']:
                    line = find_line(entry, ability)
                    if line:
                        trim_and_save(crop_left_of_label(image, line, scale),
                                      ability_path('Class Abilities', ability))
                        extracted += 1
                continue

            active_tree = next((tree for tree in BC_TREES - {'Class Abilities'} if tree in texts), None)
            if not active_tree:
                continue
            seen_paths: set[Path] = set()
            for ability in ABILITIES[active_tree]:
                line = find_line(entry, ability)
                if not line:
                    continue
                out = ability_path(active_tree, ability)
                if out in seen_paths:
                    continue
                seen_paths.add(out)
                trim_and_save(crop_left_of_label(image, line, scale), out)
                extracted += 1

    return extracted


def main() -> None:
    if not OCR_PATH.exists():
        raise SystemExit(f'Missing OCR output: {OCR_PATH}')

    apply_metadata = '--metadata' in sys.argv or '--no-metadata' not in sys.argv
    bd = load_build_database()
    data = bd.load_data()
    index = bd.build_name_index(data)
    ocr_entries = json.loads(OCR_PATH.read_text())
    class_names = all_bc_names(index)

    if apply_metadata:
        best: dict[tuple[str, str], dict] = {}
        for entry in ocr_entries:
            if not is_tooltip_page(entry):
                continue
            texts = [normalize(line['text']) for line in entry.get('lines', [])]
            tree_name = next(
                (LEVEL_RE.match(text).group(1).strip() for text in texts if LEVEL_RE.match(text)),
                None,
            )
            if tree_name not in BC_TREES:
                continue
            candidates = set(index['Blessed Crow'].get(tree_name, {}).keys())
            tooltip = parse_tooltip(entry, candidates, class_names)
            if not tooltip:
                continue
            key = (tooltip['tree'], tooltip['name'])
            score = tooltip_score(tooltip)
            prev = best.get(key)
            if not prev or score > prev['_score']:
                tooltip['_score'] = score
                best[key] = tooltip

        applied = 0
        for key, tip in best.items():
            tree_name, ability_name = key
            ability = index['Blessed Crow'][tree_name][ability_name]
            if apply_tooltip(ability, tip):
                applied += 1
                print(f"  updated {tree_name} / {ability_name}")

        for key, override in BC_OVERRIDES.items():
            tree_name, ability_name = key
            ability = index['Blessed Crow'][tree_name][ability_name]
            for field, value in override.items():
                ability[field] = value

        for tree_name, tree in index['Blessed Crow'].items():
            for ability_name, ability in tree.items():
                if ability.get('type') not in SCREEN_TYPES:
                    ability['type'] = 'Spell'
                resource = ability.get('resource_delta')
                if resource:
                    ability['resource_delta'] = normalize_resource_delta(resource)
                cleaned = clean_summary(ability.get('summary'), class_names)
                if cleaned:
                    ability['summary'] = cleaned

        print(f'Parsed {len(best)} Blessed Crow tooltips; applied {applied} field updates')
    else:
        print('Skipping metadata import (pass --metadata to enable).')

    extracted = extract_icons(ocr_entries)
    bd.attach_icons(index)
    DATA_PATH.write_text(json.dumps(bd.serialize_index(index), ensure_ascii=False), encoding='utf-8')
    print(f'Extracted {extracted} Blessed Crow icons')


if __name__ == '__main__':
    main()
