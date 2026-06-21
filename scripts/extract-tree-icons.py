#!/usr/bin/env python3
"""Extract clean (inactive) ability tree icons from class overview screenshots."""

from __future__ import annotations

import json
import re
from difflib import get_close_matches
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
WORK = ROOT / '.work'
IMAGES_DIR = WORK / 'cu-abilities' / 'Ability Images'
DATA_PATH = ROOT / 'data.json'
OUT_DIR = ROOT / 'assets' / 'abilities'
BORDER_TRIM = 0.11
ICON_SIZE = 128
CORE_TREE = 'Class Abilities'

CLASS_ICONS = {
    'Blessed Crow': './assets/blessed-crow-icon.png',
    'Dark Fool': './assets/dark-fool-icon.png',
    'Druid': './assets/druid-icon.png',
    'Empath': './assets/empath-icon.png',
    'Fianna': './assets/fianna-icon.png',
    'Forest Stalker': './assets/forest-stalker-icon.png',
    'Red Cap': './assets/red-cap-icon.png',
}

TREE_OVERVIEW_SHOTS = {
    'cachedImage.PNG': ('Forest Stalker', ['Thorn and Fang', 'Stone Rain', 'Predation']),
    'cachedImage 8.PNG': ('Empath', ['Tend the Enemy', 'Tend the Body', 'Tend the Spirit']),
    'IMG_3596.JPG': ('Druid', ['Voidcalling', 'Earthshaping', 'Natureweaving']),
    'IMG_3604.JPG': ('Fianna', ['Resilience', 'Form of Danu', 'Prowess']),
    'IMG_3600.JPG': ('Dark Fool', ['Night Terrors', 'Dark Fables', 'Mummery']),
    'Screenshot_2026-06-17_224226.PNG': ('Red Cap', ['Corrupted Blade', "Danu's Vengeance", 'Forest Walking']),
}


def slugify(value: str) -> str:
    return re.sub(r'[^a-z0-9]+', '-', value.lower()).strip('-')


def load_ocr() -> dict[str, dict]:
    merged = {}
    for name in ('ocr-images.json', 'ocr-abilities.json'):
        path = WORK / name
        if path.exists():
            for entry in json.loads(path.read_text()):
                merged[entry['file']] = entry
    return merged


def find_line(entry: dict, text: str) -> dict | None:
    target = text.lower()
    lines = [line for line in entry.get('lines', []) if line.get('text', '').strip()]
    for line in lines:
        if line['text'].strip().lower() == target:
            return line
    candidates = {line['text'].strip(): line for line in lines}
    matches = get_close_matches(text, candidates.keys(), n=1, cutoff=0.82)
    return candidates[matches[0]] if matches else None


def trim_border(image: Image.Image) -> Image.Image:
    width, height = image.size
    inset_x = int(width * BORDER_TRIM)
    inset_y = int(height * BORDER_TRIM)
    return image.crop((inset_x, inset_y, width - inset_x, height - inset_y))


def save_icon(image: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    trimmed = trim_border(image)
    trimmed.resize((ICON_SIZE, ICON_SIZE), Image.Resampling.LANCZOS).save(path, format='PNG', optimize=True)


def crop_above_label(image: Image.Image, label_line: dict, scale: float = 1.0) -> Image.Image:
    label_w = label_line['width']
    label_h = label_line['height']
    label_x = label_line['x']
    label_y = label_line['y']
    center_x = label_x + label_w / 2
    side = max(label_h * 5.0, label_w * 2.0) * scale
    left = max(0, center_x - side / 2)
    top = max(0, label_y - side * 1.05)
    right = min(image.width, left + side)
    bottom = min(image.height, label_y + label_h * 0.15)
    return image.crop((int(left), int(top), int(right), int(bottom)))


def extract_overview_trees(image_path: Path, entry: dict, class_name: str, tree_names: list[str]) -> int:
    image = Image.open(image_path).convert('RGBA')
    scale = 1.35 if image_path.suffix.lower() in {'.jpg', '.jpeg'} else 1.0
    count = 0
    for tree_name in tree_names:
        line = find_line(entry, tree_name)
        if not line:
            print(f'  missing label: {class_name} / {tree_name} in {image_path.name}')
            continue
        out = OUT_DIR / slugify(class_name) / 'trees' / f'{slugify(tree_name)}.png'
        save_icon(crop_above_label(image, line, scale=scale), out)
        count += 1
    return count


def sync_tree_icons_to_data() -> None:
    data = json.loads(DATA_PATH.read_text(encoding='utf-8-sig'))
    updated = 0
    for faction in data:
        for class_obj in faction.get('classes', []):
            class_name = class_obj['class']
            for tree in class_obj.get('trees', []):
                tree_name = tree['name']
                if tree_name == CORE_TREE:
                    icon = CLASS_ICONS.get(class_name)
                    if icon and tree.get('icon') != icon:
                        tree['icon'] = icon
                        updated += 1
                    continue
                tree_icon = OUT_DIR / slugify(class_name) / 'trees' / f'{slugify(tree_name)}.png'
                if tree_icon.exists():
                    rel = f'./{tree_icon.relative_to(ROOT).as_posix()}'
                    if tree.get('icon') != rel:
                        tree['icon'] = rel
                        updated += 1
    DATA_PATH.write_text(json.dumps(data, ensure_ascii=False), encoding='utf-8')
    print(f'Updated {updated} tree icon paths in data.json')


def main() -> None:
    ocr = load_ocr()
    total = 0
    for filename, (class_name, tree_names) in TREE_OVERVIEW_SHOTS.items():
        image_path = IMAGES_DIR / filename
        entry = ocr.get(filename)
        if not image_path.exists() or not entry:
            print(f'Skipping {filename}')
            continue
        count = extract_overview_trees(image_path, entry, class_name, tree_names)
        print(f'{filename}: extracted {count} tree icons for {class_name}')
        total += count
    sync_tree_icons_to_data()
    print(f'Done. Extracted {total} tree icons.')


if __name__ == '__main__':
    main()
