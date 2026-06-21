#!/usr/bin/env python3
"""Extract ability/tree thumbnails for known abilities only."""

from __future__ import annotations

import json
import re
import subprocess
import tempfile
from difflib import get_close_matches
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
WORK = ROOT / '.work'
IMAGES_DIR = WORK / 'cu-abilities' / 'Ability Images'
ABILITIES_DIR = WORK / 'cu-abilities' / 'Abilities'
SCRAPED = WORK / 'scraped-abilities.json'
DATA_PATH = ROOT / 'data.json'
OUT_DIR = ROOT / 'assets' / 'abilities'
BORDER_TRIM = 0.11
ICON_SIZE = 128
CORE_TREE = 'Class Abilities'

CLEAN_TREE_SHOTS = {
    'Screenshot_2026-06-17_224638.PNG': ('Red Cap', 'Corrupted Blade'),
    'Screenshot_2026-06-17_225657.PNG': ('Red Cap', "Danu's Vengeance"),
    'Screenshot_2026-06-17_232603.PNG': ('Red Cap', 'Forest Walking'),
}


def slugify(value: str) -> str:
    return re.sub(r'[^a-z0-9]+', '-', value.lower()).strip('-')


def load_catalog() -> dict[str, dict[str, set[str]]]:
    data = json.loads(DATA_PATH.read_text())
    catalog: dict[str, dict[str, set[str]]] = {}
    for faction in data:
        for class_obj in faction.get('classes', []):
            catalog[class_obj['class']] = {}
            for tree in class_obj.get('trees', []):
                catalog[class_obj['class']][tree['name']] = set(tree.get('abilities', {}).keys())
    return catalog


def build_ability_lookup(catalog: dict[str, dict[str, set[str]]]) -> dict[str, tuple[str, str, str]]:
    lookup: dict[str, tuple[str, str, str]] = {}
    for class_name, trees in catalog.items():
        for tree_name, abilities in trees.items():
            for ability_name in abilities:
                lookup[ability_name.lower()] = (class_name, tree_name, ability_name)
    return lookup


def load_ocr() -> dict[str, dict]:
    merged = {}
    for name in ('ocr-images.json', 'ocr-abilities.json'):
        path = WORK / name
        if path.exists():
            for entry in json.loads(path.read_text()):
                merged[entry['file']] = entry
    return merged


def open_image(path: Path) -> Image.Image:
    try:
        return Image.open(path).convert('RGBA')
    except Exception:
        with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as tmp:
            tmp_path = Path(tmp.name)
        subprocess.run(['sips', '-s', 'format', 'png', str(path), '--out', str(tmp_path)],
                       check=True, capture_output=True)
        image = Image.open(tmp_path).convert('RGBA')
        tmp_path.unlink(missing_ok=True)
        return image


def trim_border(image: Image.Image) -> Image.Image:
    width, height = image.size
    inset_x = int(width * BORDER_TRIM)
    inset_y = int(height * BORDER_TRIM)
    return image.crop((inset_x, inset_y, width - inset_x, height - inset_y))


def save_icon(image: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    trimmed = trim_border(image)
    trimmed.resize((ICON_SIZE, ICON_SIZE), Image.Resampling.LANCZOS).save(path, format='PNG', optimize=True)


def ability_output_path(class_name: str, tree_name: str, ability_name: str) -> Path:
    class_slug = slugify(class_name)
    ability_slug = slugify(ability_name)
    if tree_name == CORE_TREE:
        return OUT_DIR / class_slug / 'class-abilities' / f'{ability_slug}.png'
    return OUT_DIR / class_slug / slugify(tree_name) / f'{ability_slug}.png'


def find_line(entry: dict, text: str) -> dict | None:
    target = text.lower()
    lines = [line for line in entry.get('lines', []) if line.get('text', '').strip()]
    for line in lines:
        if line['text'].strip().lower() == target:
            return line
    candidates = {line['text'].strip(): line for line in lines}
    matches = get_close_matches(text, candidates.keys(), n=1, cutoff=0.82)
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
    bottom = min(image.height, top + side)
    return image.crop((int(left), int(top), int(right), int(bottom)))


def extract_tree_page(image_path: Path, entry: dict, class_name: str, tree_name: str,
                      allowed: set[str], scale: float = 1.0) -> int:
    image = open_image(image_path)
    count = 0
    for ability_name in allowed:
        line = find_line(entry, ability_name)
        if not line:
            continue
        out = ability_output_path(class_name, tree_name, ability_name)
        save_icon(crop_left_of_label(image, line, scale=scale), out)
        count += 1
    return count


def extract_red_cap_overview(image_path: Path, entry: dict, catalog: dict) -> int:
    image = open_image(image_path)
    count = 0
    for tree_name in ('Corrupted Blade', "Danu's Vengeance", 'Forest Walking'):
        line = find_line(entry, tree_name)
        if line:
            save_icon(crop_left_of_label(image, line, scale=1.8),
                      OUT_DIR / 'red-cap' / 'trees' / f'{slugify(tree_name)}.png')
            count += 1
    for ability_name in catalog['Red Cap'][CORE_TREE]:
        line = find_line(entry, ability_name)
        if line:
            save_icon(crop_left_of_label(image, line, scale=1.8),
                      ability_output_path('Red Cap', CORE_TREE, ability_name))
            count += 1
    return count


def extract_labeled_abilities(image_path: Path, entry: dict, lookup: dict[str, tuple[str, str, str]],
                              scale: float = 1.0) -> int:
    image = open_image(image_path)
    count = 0
    seen: set[Path] = set()
    for _, (class_name, tree_name, ability_name) in lookup.items():
        line = find_line(entry, ability_name)
        if not line:
            continue
        out = ability_output_path(class_name, tree_name, ability_name)
        if out in seen:
            continue
        seen.add(out)
        save_icon(crop_left_of_label(image, line, scale=scale), out)
        count += 1
    return count


def extract_tooltip_icons(scraped: dict, lookup: dict[str, tuple[str, str, str]],
                          skip_paths: set[Path] | None = None) -> int:
    skip_paths = skip_paths or set()
    count = 0
    for record in scraped.get('records', []):
        tooltip = record.get('tooltip') or {}
        ability_name = tooltip.get('name')
        if not ability_name:
            continue
        mapping = lookup.get(ability_name.lower())
        if not mapping:
            continue
        class_name, tree_name, canonical_name = mapping
        out = ability_output_path(class_name, tree_name, canonical_name)
        if out in skip_paths or out.exists():
            continue
        image_path = ABILITIES_DIR / record['file']
        if not image_path.exists():
            image_path = IMAGES_DIR / record['file']
        if not image_path.exists():
            continue
        line = find_line(record, ability_name) or find_line(record, canonical_name)
        if not line:
            continue
        save_icon(crop_left_of_label(open_image(image_path), line, scale=1.25), out)
        skip_paths.add(out)
        count += 1
    return count


def main() -> None:
    if OUT_DIR.exists():
        for path in OUT_DIR.rglob('*.png'):
            path.unlink()

    catalog = load_catalog()
    lookup = build_ability_lookup(catalog)
    ocr = load_ocr()
    scraped = json.loads(SCRAPED.read_text()) if SCRAPED.exists() else {'records': []}
    total = 0
    extracted: set[Path] = set()

    overview = IMAGES_DIR / 'Screenshot_2026-06-17_224226.PNG'
    if overview.exists() and overview.name in ocr:
        total += extract_red_cap_overview(overview, ocr[overview.name], catalog)

    for filename, (class_name, tree_name) in CLEAN_TREE_SHOTS.items():
        image_path = IMAGES_DIR / filename
        entry = ocr.get(filename)
        if image_path.exists() and entry:
            allowed = catalog[class_name][tree_name]
            total += extract_tree_page(image_path, entry, class_name, tree_name, allowed)

    for directory in (IMAGES_DIR,):
        for image_path in sorted(directory.iterdir()):
            if image_path.suffix.lower() not in {'.png', '.jpg', '.jpeg'}:
                continue
            if image_path.name.startswith('Screenshot_2026-06-17_224'):
                continue
            entry = ocr.get(image_path.name)
            if not entry:
                continue
            scale = 1.8 if image_path.suffix.lower() in {'.jpg', '.jpeg'} else 1.0
            total += extract_labeled_abilities(image_path, entry, lookup, scale=scale)

    total += extract_tooltip_icons(scraped, lookup, extracted)

    print(f'Extracted {total} icons into {OUT_DIR}')


if __name__ == '__main__':
    main()
