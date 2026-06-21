#!/usr/bin/env python3
"""Compare scraped OCR data against data.json and write a summary report."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WORK = ROOT / '.work'
DATA_PATH = ROOT / 'data.json'
SCRAPED = WORK / 'scraped-abilities.json'
REPORT = WORK / 'comparison-report.json'


def load_index() -> dict[str, dict[str, dict[str, dict]]]:
    data = json.loads(DATA_PATH.read_text())
    index: dict[str, dict[str, dict[str, dict]]] = {}
    for faction in data:
        for class_obj in faction.get('classes', []):
            index[class_obj['class']] = {}
            for tree in class_obj.get('trees', []):
                index[class_obj['class']][tree['name']] = tree.get('abilities', {})
    return index


CLASS_TREE_HINTS = {
    'Voidcalling': 'Druid', 'Earthshaping': 'Druid', 'Natureweaving': 'Druid',
    'Dominance': 'Blessed Crow', 'Ritual': 'Blessed Crow', 'Nourishment': 'Blessed Crow',
    'Night Terrors': 'Dark Fool', 'Dark Fables': 'Dark Fool', 'Mummery': 'Dark Fool',
    'Tend the Enemy': 'Empath', 'Tend the Spirit': 'Empath', 'Tend the Body': 'Empath',
    'Prowess': 'Fianna', 'Resilience': 'Fianna', 'Form of Danu': 'Fianna',
    'Predation': 'Forest Stalker', 'Thorn and Fang': 'Forest Stalker', 'Stone Rain': 'Forest Stalker',
    'Corrupted Blade': 'Red Cap', "Danu's Vengeance": 'Red Cap', 'Forest Walking': 'Red Cap',
}


def main() -> None:
    index = load_index()
    scraped = json.loads(SCRAPED.read_text()) if SCRAPED.exists() else {'records': [], 'merged': {}}
    tooltips = [r['tooltip'] for r in scraped.get('records', []) if r.get('tooltip')]

    matched = updated_fields = missing_from_zip = []
    report = {
        'summary': {},
        'classes': {},
        'missing_from_zip': [],
        'tooltip_only_in_zip': [],
        'metadata_updates_applied': 0,
    }

    seen_zip = set()
    for tip in tooltips:
        cls = tip.get('class') or CLASS_TREE_HINTS.get(tip.get('tree') or '')
        tree = tip.get('tree')
        name = tip.get('name')
        if not all([cls, tree, name]):
            continue
        seen_zip.add((cls, tree, name))
        ability = index.get(cls, {}).get(tree, {}).get(name)
        if ability:
            matched.append((cls, tree, name))
        else:
            report['tooltip_only_in_zip'].append({'class': cls, 'tree': tree, 'name': name})

    for cls, trees in index.items():
        class_report = {'trees': {}, 'total': 0, 'with_icon': 0, 'with_scraped_tooltip': 0}
        for tree, abilities in trees.items():
            tree_report = {'abilities': len(abilities), 'icons': 0, 'scraped': 0, 'missing_in_zip': []}
            for name, ability in abilities.items():
                class_report['total'] += 1
                if ability.get('icon'):
                    class_report['with_icon'] += 1
                    tree_report['icons'] += 1
                if (cls, tree, name) in seen_zip:
                    class_report['with_scraped_tooltip'] += 1
                    tree_report['scraped'] += 1
                else:
                    tree_report['missing_in_zip'].append(name)
                    report['missing_from_zip'].append({'class': cls, 'tree': tree, 'name': name})
            class_report['trees'][tree] = tree_report
        report['classes'][cls] = class_report

    report['summary'] = {
        'abilities_in_json': sum(c['total'] for c in report['classes'].values()),
        'abilities_with_icons': sum(c['with_icon'] for c in report['classes'].values()),
        'abilities_with_scraped_tooltips': sum(c['with_scraped_tooltip'] for c in report['classes'].values()),
        'tooltip_records_in_zip': len(tooltips),
        'abilities_missing_from_zip': len(report['missing_from_zip']),
    }

    REPORT.write_text(json.dumps(report, indent=2))
    print(json.dumps(report['summary'], indent=2))
    print(f'Report written to {REPORT}')


if __name__ == '__main__':
    main()
