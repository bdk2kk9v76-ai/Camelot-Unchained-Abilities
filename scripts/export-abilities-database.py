#!/usr/bin/env python3
"""Export a clean JSON database of all classes, trees, and abilities."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / 'data.json'
META_PATH = ROOT / 'class-metadata.json'
OUTPUT_PATH = ROOT / 'abilities-database.json'

METADATA_FIELDS = (
    'slug', 'type', 'cast_speed', 'base_value',
    'resource_delta', 'range', 'summary', 'icon',
)
CORE_TREE = 'Class Abilities'


def load_json(path: Path) -> object:
    return json.loads(path.read_text(encoding='utf-8-sig'))


def export_database() -> dict:
    data = load_json(DATA_PATH)
    meta = load_json(META_PATH)

    export = {
        'faction': data[0]['faction'],
        'classes': [],
    }

    for class_obj in data[0]['classes']:
        class_name = class_obj['class']
        class_meta = meta.get(class_name, {})
        class_entry = {
            'name': class_name,
            'slug': class_obj.get('slug'),
            'description': class_meta.get('desc'),
            'icon': class_meta.get('icon'),
            'hero': class_meta.get('hero'),
            'trees': [],
        }

        ordered_trees = sorted(
            class_obj['trees'],
            key=lambda tree: (0 if tree['name'] == CORE_TREE else 1, tree['name']),
        )

        for tree in ordered_trees:
            tree_entry = {
                'name': tree['name'],
                'slug': tree.get('slug'),
            }
            if tree.get('icon'):
                tree_entry['icon'] = tree['icon']

            abilities = []
            for ability_name, ability in sorted(tree.get('abilities', {}).items()):
                entry = {'name': ability_name}
                for field in METADATA_FIELDS:
                    value = ability.get(field)
                    if value is not None:
                        entry[field] = value
                abilities.append(entry)

            tree_entry['abilities'] = abilities
            class_entry['trees'].append(tree_entry)

        export['classes'].append(class_entry)

    return export


def main() -> None:
    export = export_database()
    OUTPUT_PATH.write_text(
        json.dumps(export, indent=2, ensure_ascii=False) + '\n',
        encoding='utf-8',
    )
    total = sum(len(tree['abilities']) for cls in export['classes'] for tree in cls['trees'])
    print(f'Wrote {OUTPUT_PATH} ({len(export["classes"])} classes, {total} abilities)')


if __name__ == '__main__':
    main()
