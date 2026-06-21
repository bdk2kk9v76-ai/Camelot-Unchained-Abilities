#!/usr/bin/env python3
"""Import Blessed Crow metadata and icons from OCR'd HEIC screenshots."""

from __future__ import annotations

import importlib.util
import json
import re
import subprocess
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
    r'Shift\s*\+|^\+\s*$|ABILITY BOOK|Enter message|^(MAIN|GUILD|COMBAT|POOP|ERIU|Trade|Zone|Child|Cuild|Grild|Gild)$',
    re.I,
)
CHAT_NOISE = re.compile(r'(?:Trade|Zone|Guild|Cuild|Grild|Gild|Child|Lone|Matiz|Ramius|Teloin|DeRanged)', re.I)
LEVEL_RE = re.compile(r'^(.+?)\s*\((?:Iv\.|lv\.)\s*\d+\)$', re.I)
CAST_RE = re.compile(r'^(\d+(?:\.\d+)?)s\s+Cast$', re.I)
COOLDOWN_RE = re.compile(r'^(\d+(?:\.\d+)?)s\s+Cooldown$', re.I)
RANGE_RE = re.compile(r'^(\d+(?:\.\d+)?)m\s+Range$', re.I)
COSTS_RE = re.compile(r'^Costs?:\s*(.+)$', re.I)
GRANTS_RE = re.compile(r'^Grants?:\s*(.+)$', re.I)


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
    has_cast = any(CAST_RE.match(normalize(line['text'])) for line in lines)
    has_cost = any(
        COSTS_RE.match(normalize(line['text'])) or GRANTS_RE.match(normalize(line['text']))
        for line in lines
    )
    has_cd = any(COOLDOWN_RE.match(normalize(line['text'])) for line in lines)
    return has_level and has_cast and (has_cost or has_cd)


def clean_summary(text: str) -> str | None:
    if not text or len(text) < 20 or CHAT_NOISE.search(text):
        return None
    return text.strip()


def parse_tooltip(entry: dict, candidates: set[str]) -> dict | None:
    height = entry.get('height') or 4032
    lines = entry.get('lines', [])
    min_y = height * 0.28

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
        if not text or re.fullmatch(r'\d+', text):
            continue
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
        if len(text.split()) > 6:
            continue
        matched = fuzzy(text, candidates)
        if matched:
            name_matches.append((line['y'], matched))

    if not name_matches:
        return None

    ability_name = min(name_matches, key=lambda item: item[0])[1]
    name_y = min(y for y, name in name_matches if name == ability_name)

    description_parts: list[str] = []
    for line in between:
        if line['y'] >= name_y:
            continue
        text = normalize(line['text'])
        if len(text) < 12 or CHAT_NOISE.search(text):
            continue
        if fuzzy(text, candidates):
            continue
        if LEVEL_RE.match(text) or CAST_RE.match(text) or COOLDOWN_RE.match(text):
            continue
        if RANGE_RE.match(text) or COSTS_RE.match(text) or GRANTS_RE.match(text):
            continue
        if text in {'Spell', 'Melee', 'Buff', 'Heal', 'Damage', 'Utility', 'Mitigation'}:
            ability_type = text
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
            range_value = f"{match.group(1)}m"
        elif match := COSTS_RE.match(text):
            resource_parts.append(match.group(1).strip())
        elif match := GRANTS_RE.match(text):
            resource_parts.append(f"+{match.group(1).strip().replace('|', '1')}")
        elif re.search(r'(Damage|Healing)$', text, re.I) and re.match(r'^\d', text):
            base_value = text
        elif text in {'Spell', 'Melee', 'Buff', 'Heal', 'Damage', 'Utility', 'Mitigation'}:
            ability_type = text

    summary = clean_summary(' '.join(reversed(description_parts)).strip())
    if summary and cooldown and 'Cooldown' not in summary:
        summary = f"{summary} {cooldown} Cooldown.".strip()

    return {
        'tree': tree_name,
        'name': ability_name,
        'type': ability_type,
        'cast_speed': cast,
        'resource_delta': ', '.join(resource_parts) if resource_parts else None,
        'range': range_value,
        'base_value': base_value,
        'summary': summary,
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
    ocr_by_file = {entry['file']: entry for entry in ocr_entries}

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


def apply_tooltip(index: dict, tooltip: dict) -> bool:
    tree_name = tooltip['tree']
    ability_name = tooltip['name']
    ability = index['Blessed Crow'][tree_name].get(ability_name)
    if not ability:
        return False

    changed = False
    for field in ('type', 'cast_speed', 'resource_delta', 'range', 'base_value', 'summary'):
        value = tooltip.get(field)
        if not value:
            continue
        if field == 'summary' and not clean_summary(value):
            continue
        if field == 'resource_delta' and value:
            value = value.replace('+|', '+1').replace('| Judgment', '1 Judgment')
        if ability.get(field) != value:
            ability[field] = value
            changed = True
    return changed


def fix_willow(index: dict) -> None:
    ability = index['Dark Fool']['Mummery'].get('As the Willow in a Storm')
    if not ability:
        return
    ability['cast_speed'] = '3s'
    ability['range'] = '90m'
    if not ability.get('summary') or 'Dark Allure' in ability['summary']:
        ability['summary'] = (
            "Increases your party's Block Value by 25% and grants +10% Parry Chance."
        )


def main() -> None:
    import sys

    if not OCR_PATH.exists():
        raise SystemExit(f'Missing OCR output: {OCR_PATH}')

    apply_metadata = '--metadata' in sys.argv
    bd = load_build_database()
    data = bd.load_data()
    index = bd.build_name_index(data)
    ocr_entries = json.loads(OCR_PATH.read_text())

    if apply_metadata:
        applied = 0
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
            tooltip = parse_tooltip(entry, candidates)
            if not tooltip:
                continue
            key = (tooltip['tree'], tooltip['name'])
            prev = best.get(key)
            score = len(tooltip.get('summary') or '')
            if not prev or score > len(prev.get('summary') or ''):
                best[key] = tooltip

        for tooltip in best.values():
            if apply_tooltip(index, tooltip):
                applied += 1
                print(f"  updated {tooltip['tree']} / {tooltip['name']}")
        print(f'Applied {applied} Blessed Crow tooltip updates')
    else:
        print('Skipping metadata import (pass --metadata to enable).')

    fix_willow(index)
    bd.attach_icons(index)
    DATA_PATH.write_text(json.dumps(bd.serialize_index(index), ensure_ascii=False), encoding='utf-8')

    extracted = extract_icons(ocr_entries)
    bd.attach_icons(index)
    DATA_PATH.write_text(json.dumps(bd.serialize_index(index), ensure_ascii=False), encoding='utf-8')
    print(f'Extracted {extracted} Blessed Crow icons')


if __name__ == '__main__':
    main()
