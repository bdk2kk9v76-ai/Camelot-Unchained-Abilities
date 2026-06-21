#!/usr/bin/env python3
"""Extract Blessed Crow ability and tree icons from provided screenshots."""

from __future__ import annotations

import json
import re
from difflib import get_close_matches
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
WORK = ROOT / '.work'
IMAGES = WORK / 'blessed-crow-images'
OCR_PATH = WORK / 'ocr-blessed-crow-upscaled.json'
OUT = ROOT / 'assets' / 'abilities' / 'blessed-crow'
BORDER_TRIM = 0.11
ICON_SIZE = 128
OCR_SCALE = 0.5  # OCR ran on 2x upscaled images

TREE_PAGES = {
    'dominance.png': 'Dominance',
    'ritual.png': 'Ritual',
    'nourishment.png': 'Nourishment',
}

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

TREE_ICONS = ['Ritual', 'Dominance', 'Nourishment']


def slugify(value: str) -> str:
    return re.sub(r'[^a-z0-9]+', '-', value.lower()).strip('-')


def vision_to_pil(line: dict, image_height: int) -> tuple[float, float, float, float]:
    x = line['x'] * OCR_SCALE
    width = line['width'] * OCR_SCALE
    height = line['height'] * OCR_SCALE
    y_top = image_height - (line['y'] * OCR_SCALE) - height
    return x, y_top, width, height


def trim_and_save(image: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    width, height = image.size
    inset = int(min(width, height) * BORDER_TRIM)
    trimmed = image.crop((inset, inset, width - inset, height - inset))
    trimmed.resize((ICON_SIZE, ICON_SIZE), Image.Resampling.LANCZOS).save(path, format='PNG', optimize=True)


def crop_left_of_label(image: Image.Image, line: dict) -> Image.Image:
    x, y_top, width, height = vision_to_pil(line, image.height)
    side = max(height * 1.35, width * 1.8)
    left = max(0, x - side * 0.95)
    top = max(0, y_top - (side - height) / 2)
    return image.crop((int(left), int(top), int(left + side), int(top + side)))


def crop_above_label(image: Image.Image, line: dict) -> Image.Image:
    x, y_top, width, height = vision_to_pil(line, image.height)
    side = max(72, width * 2.8)
    left = max(0, x + width / 2 - side / 2)
    top = max(0, y_top - side * 1.05)
    return image.crop((int(left), int(top), int(left + side), int(top + side)))


def find_line(entry: dict, text: str) -> dict | None:
    lines = [line for line in entry.get('lines', []) if line.get('text', '').strip()]
    for line in lines:
        if line['text'].strip().lower() == text.lower():
            return line
    candidates = {line['text'].strip(): line for line in lines}
    matches = get_close_matches(text, candidates.keys(), n=1, cutoff=0.65)
    return candidates[matches[0]] if matches else None


def ability_path(tree: str, ability: str) -> Path:
    slug = slugify(ability)
    if tree == 'Class Abilities':
        return OUT / 'class-abilities' / f'{slug}.png'
    return OUT / slugify(tree) / f'{slug}.png'


def main() -> None:
    ocr = {entry['file']: entry for entry in json.loads(OCR_PATH.read_text())}
    extracted = 0

    overview = IMAGES / 'blessed-crow-overview.png'
    overview_entry = ocr.get('blessed-crow-overview.png')
    if overview.exists() and overview_entry:
        image = Image.open(overview).convert('RGBA')
        for tree_name in TREE_ICONS:
            line = find_line(overview_entry, tree_name)
            if line:
                trim_and_save(crop_above_label(image, line), OUT / 'trees' / f'{slugify(tree_name)}.png')
                extracted += 1
        for ability in ABILITIES['Class Abilities']:
            line = find_line(overview_entry, ability)
            if line:
                trim_and_save(crop_left_of_label(image, line), ability_path('Class Abilities', ability))
                extracted += 1

    for filename, tree_name in TREE_PAGES.items():
        image_path = IMAGES / filename
        entry = ocr.get(filename)
        if not image_path.exists() or not entry:
            continue
        image = Image.open(image_path).convert('RGBA')
        for ability in ABILITIES[tree_name]:
            line = find_line(entry, ability)
            if not line:
                print(f'Missing label: {ability} in {filename}')
                continue
            trim_and_save(crop_left_of_label(image, line), ability_path(tree_name, ability))
            extracted += 1

    print(f'Extracted {extracted} Blessed Crow icons into {OUT}')


if __name__ == '__main__':
    main()
