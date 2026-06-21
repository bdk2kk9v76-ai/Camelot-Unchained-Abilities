#!/usr/bin/env python3
"""Merge OCR tooltip metadata into data.json (Druid, Dark Fool, types, cleanup)."""

from __future__ import annotations

import importlib.util
import json
import re
from difflib import get_close_matches
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WORK = ROOT / '.work'
SCRAPED = WORK / 'scraped-abilities.json'
DATA_PATH = ROOT / 'data.json'

SPEC = importlib.util.spec_from_file_location('build_database', ROOT / 'scripts' / 'build-database.py')
BD = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(BD)

CLASS_TREE_HINTS = BD.CLASS_TREE_HINTS
CORE_TREE = BD.CORE_TREE
SCREEN_TYPES = {'Spell', 'Melee', 'Buff', 'Heal', 'Damage', 'Utility', 'Mitigation'}

NOISE = re.compile(
    r'Shift\s*[\+=]|^\+\s*$|ABILITY BOOK|Enter message|^(MAIN|GUILD|COMBAT|POOP|ERIU|Shift)$',
    re.I,
)
CHAT_NOISE = re.compile(r'(?:Trade|Zone|Guild|Matiz|Ramius|Teloin|Adeguello|BeefCake)', re.I)
LEVEL_RE = re.compile(r'^(.+?)\s*\((?:Iv\.|lv\.)\s*[\dO]+\)$', re.I)
CAST_RE = re.compile(r'^(\d+(?:\.\d+)?)s\s+Cast$', re.I)
COOLDOWN_RE = re.compile(r'^(\d+(?:\.\d+)?)[sO]?\s*Cooldown', re.I)
RANGE_RE = re.compile(r'^(\d+(?:\.\d+)?)m\s+Range$', re.I)
COSTS_RE = re.compile(r'^Costs?:\s*(.+)$', re.I)
GRANTS_RE = re.compile(r'^Grants?:\s*(.+)$', re.I)
BASE_RE = re.compile(r'^(\d+)\s+Base\s+(Damage|Healing)$', re.I)
STAT_LINE_RE = re.compile(
    r'^(Instant|\d+(?:\.\d+)?s\s+Cast|\d+(?:\.\d+)?[sO]?\s*Cooldown|\d+(?:\.\d+)?m\s+Range|\d+\s+Base\s+(?:Damage|Healing)|Spell|Melee|Buff|Heal|Damage|Utility|Mitigation|Self|Friend)$',
    re.I,
)
TOOLTIP_MIN_X = 1100
PARTIAL_NAME_FRAGMENTS = ('Like Flitting', 'Shadows', 'Flames', 'Dance Through')

DARK_FOOL_SUMMARY_OVERRIDES = {
    ('Dark Fables', 'Dance Through Flames'): 'Grants your party +15 to all Elemental Resistances.',
    ('Dark Fables', 'Dark Comedy'): 'Deals Shadow damage. +50% damage to targets suffering from Stun, Root, or Fear.',
    ('Dark Fables', 'Tales of Woe'): 'Deals Shadow damage and an additional 1200 Shadow damage over 12 seconds.',
    ('Dark Fables', 'The Tragic Betrayal'): 'Deals Mind damage and Stuns for 3/6 seconds. 45.0s Cooldown.',
    ('Dark Fables', 'Like Flitting Shadows'): 'Every 6 seconds negates the next Ranged hit each member of your party would take.',
    ('Dark Fables', 'A Sudden Fright'): 'Deals Shadow damage and Fears for 2/5 seconds. 30.0s Cooldown.',
    ('Dark Fables', 'And Our Hero Falls!'): 'Causes the target to take 60% increased damage while below 50% Health, for 6 seconds. 90.0s Cooldown.',
    ('Dark Fables', 'Die a Lonely Death'): 'Snares an enemy and deals damage over time. +100% damage if the target has no allies nearby at the end of the duration. 120.0s Cooldown.',
    ('Mummery', 'A Glimpse of Madness'): 'Inflicts Panic. 4.0s Cooldown.',
    ('Mummery', 'Screaming Shot'): 'Deals Mind damage.',
    ('Mummery', 'The Darkest Hour'): 'Deals Shadow damage around the target. Enemies hit are Silenced and Disarmed for 4/8 seconds. 60.0s Cooldown.',
    ('Mummery', 'Bean Sidhe\'s Wail'): 'Enemies hit are Silenced and Disarmed for 4/8 seconds.',
    ('Mummery', 'Dark Allure'): 'This debuff increases damage taken by 3% per stack when dealing Direct damage, up to a max of 24%.',
    ('Mummery', 'Death by a Thousand Cuts'): 'This debuff increases damage taken by 3% per stack when dealing Direct damage, up to a max of 24%.',
    ('Mummery', 'A Cautionary Tale'): 'The target\'s allies take 300 Shadow damage over the duration while within 15m of them. 20.0s Cooldown.',
    ('Night Terrors', 'Look Upon Oblivion'): 'Deals 3000 Mind damage over 12 seconds. 60.0s Cooldown.',
    ('Night Terrors', 'That Stalk the Night'): 'Increases your party\'s Movement Speed and for 6 seconds decreases their non-Melee damage taken by 40%. 60.0s Cooldown.',
    ('Night Terrors', 'A Grand Tragedy'): 'Your party deals 20% increased damage vs targets suffering from Control effects.',
    ('Night Terrors', 'With Claws That Tear'): 'Your party\'s Direct Damage also inflicts 50 Snares by 40% and inflicts DoT.',
    ('Night Terrors', 'Cutting Whispers'): 'Deals Mind damage.',
    ('Night Terrors', 'A Sharpened Tongue'): 'Deals Weapon damage. +50% damage vs Panicked targets.',
    ('Night Terrors', 'In Darkest Dreams'): 'Creates a cloud for 12 seconds that deals Mind damage per second to enemies in the area.',
    ('Night Terrors', 'The Cruelest Joke'): 'Snares by 40% and inflicts DoT. If target dies, nearby allies are Feared.',
}

DRUID_SUMMARY_OVERRIDES = {
    ("Earthshaping", "Danu's Rebuke"): "Deals Earth damage to nearby enemies. Knocks back enemies hit and Fractures them, dealing damage equal to their Aftershock and removing it.",
    ('Natureweaving', 'Revitalize'): 'Heals party for 2400 Health and grants them 1200 Mana, each over 12 seconds.',
    ('Natureweaving', 'Weaken'): 'Deals Spirit damage in an area around the target. Targets hit deal reduced damage.',
    ('Natureweaving', 'Disarm'): 'Disarms the target for 4/12 seconds.',
    ('Natureweaving', 'Pacify'): 'Sleeps the target for 4/8 seconds.',
    ('Earthshaping', 'Hand of Danu'): 'Fires a bolt that deals earth damage.',
    ('Earthshaping', 'Rockslide'): 'Deals Earth damage to enemies in a narrow area.',
    ('Earthshaping', 'Unstable Ground'): 'Deals Earth damage in the target area and Snares targets by 40% for 4/8 seconds.',
    ('Earthshaping', 'Weight of Danu'): 'Earth damage over 6s, Roots the target for 6/12s and deals 1200 damage.',
    ('Earthshaping', "Danu's Embrace"): 'Deals Earth damage.',
    ('Earthshaping', "Danu's Shield"): 'Increases Physical Armor Rating.',
    ('Natureweaving', 'Poison Bolt'): 'Fires a bolt that deals Poison damage.',
    ('Natureweaving', "Scorpion's Sting"): 'Deals Poison damage.',
    ('Natureweaving', 'Speed of the Forest Kin'): "Increases allies' movement speed while out of combat.",
    ('Voidcalling', 'Void Bolt'): 'Fires a bolt that deals Void damage.',
    ('Voidcalling', 'Void Comet'): 'Deals Void damage.',
    ('Voidcalling', 'Void Shield'): 'Grants your party Magic Armor Rating.',
    ('Voidcalling', 'Void Strike'): 'Deals Void damage.',
    ('Voidcalling', 'Reality Rift'): 'Teleports forward.',
    ('Voidcalling', 'Forbidden Pact'): 'Becomes "End Pact" after use. Sacrifices a percentage of your Max Health and Mana.',
    ('Voidcalling', 'Whispers from Beyond'): 'Deals 3750 Void damage over 15 seconds. Damage ramps up over the duration.',
}


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
        if part.startswith('+'):
            cleaned.append(part)
        elif part.startswith('-'):
            cleaned.append(part[1:].strip())
        else:
            cleaned.append(part)
    return ', '.join(cleaned)


def all_ability_names(index: dict, class_name: str) -> set[str]:
    names: set[str] = set()
    for tree in index[class_name].values():
        names.update(tree.keys())
    return names


def strip_ability_name(text: str, name: str, *, at_start: bool = False) -> str:
    pattern = re.compile(rf'^{re.escape(name)}\b\s*' if at_start else rf'\b{re.escape(name)}\b')
    if at_start:
        return pattern.sub('', text, count=1).strip(' ,.')
    return pattern.sub(' ', text)


def clean_summary(text: str | None, class_names: set[str]) -> str | None:
    if not text:
        return None
    text = NOISE.sub('', text)
    text = re.sub(r'\s+', ' ', text).strip(' ,.')
    if not text or CHAT_NOISE.search(text):
        return None

    # Drop leading fragments from other abilities in the same class.
    for _ in range(4):
        stripped = False
        for name in sorted(class_names, key=len, reverse=True):
            if re.match(rf'^{re.escape(name)}\b', text):
                text = strip_ability_name(text, name, at_start=True)
                stripped = True
                break
        if not stripped:
            break

    # Remove bleed from other ability names anywhere in the text.
    for name in sorted(class_names, key=len, reverse=True):
        if re.search(rf'\b{re.escape(name)}\b', text) and not re.match(rf'^{re.escape(name)}\b', text):
            text = strip_ability_name(text, name)
    for fragment in PARTIAL_NAME_FRAGMENTS:
        text = re.sub(rf'\b{re.escape(fragment)}\b', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip(' ,.')

    text = re.sub(r'\b(\d+(?:\.\d+)?)[Uu](s)\b', r'\1\2', text)
    text = re.sub(r'\b(\d+)O(s)\b', r'\1\2', text, flags=re.I)
    text = re.sub(r'\b(\d+)\.Os\b', r'\1.0s', text, flags=re.I)
    text = re.sub(r'\btagets\b', 'targets', text, flags=re.I)
    text = re.sub(r'\bison Bolt\b', 'Poison Bolt', text, flags=re.I)
    return text if len(text) >= 12 else None


def summary_quality(text: str | None, class_names: set[str]) -> int:
    if not text:
        return 0
    score = min(len(text), 240)
    if CHAT_NOISE.search(text):
        score -= 200
    if NOISE.search(text):
        score -= 100
    bleed = sum(
        1
        for name in class_names
        if re.search(rf'\b{re.escape(name)}\b', text) and not re.match(rf'^{re.escape(name)}\b', text.strip())
    )
    score -= bleed * 40
    if 'Cooldown' in text:
        score += 15
    return score


def parse_overview_tooltip(record: dict, class_name: str, candidates: set[str], idx: dict) -> dict | None:
    """Parse class-ability tooltips on overview pages (no Iv. level line)."""
    height = record.get('height') or 4032
    min_y = height * 0.12
    lines = [line for line in record.get('lines', []) if line['y'] >= min_y]
    lines.sort(key=lambda line: line['y'], reverse=True)

    cast_y = None
    cast = None
    for line in lines:
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

    between = [line for line in lines if cast_y < line['y']]
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

    cooldown = ability_type = range_value = base_value = None
    resource_parts: list[str] = []
    description_parts: list[str] = []

    for line in between:
        if line['y'] >= name_y or line['x'] < TOOLTIP_MIN_X:
            continue
        text = normalize(line['text'])
        if len(text) < 8 or CHAT_NOISE.search(text) or NOISE.search(text):
            continue
        if fuzzy(text, candidates) or STAT_LINE_RE.match(text):
            continue
        if text not in description_parts:
            description_parts.append(text)

    for line in lines:
        if line['y'] > cast_y:
            continue
        text = normalize(line['text'])
        if match := COOLDOWN_RE.match(text):
            cooldown = f"{match.group(1)}s"
        elif match := RANGE_RE.match(text):
            range_value = f"{match.group(1)}m"
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

    class_names = all_ability_names(idx, class_name)
    summary = clean_summary(' '.join(reversed(description_parts)).strip(), class_names)
    if summary and cooldown and 'Cooldown' not in summary:
        summary = f"{summary} {cooldown} Cooldown.".strip()

    return {
        'class': class_name,
        'tree': CORE_TREE,
        'name': ability_name,
        'type': ability_type,
        'cast_speed': cast,
        'resource_delta': normalize_resource_delta(', '.join(resource_parts) if resource_parts else None),
        'range': range_value,
        'base_value': base_value,
        'summary': summary,
    }


def parse_record(record: dict, class_name: str, candidates: set[str], idx: dict) -> dict | None:
    tip = parse_phone_tooltip(record, class_name, candidates, idx)
    if tip:
        return tip
    if CORE_TREE in idx[class_name]:
        class_candidates = set(idx[class_name][CORE_TREE].keys())
        return parse_overview_tooltip(record, class_name, class_candidates, idx)
    return None


def index_tree_names(class_name: str, idx: dict) -> set[str]:
    return set(idx[class_name].keys())


def parse_phone_tooltip(record: dict, class_name: str, candidates: set[str], idx: dict) -> dict | None:
    height = record.get('height') or 4032
    min_y = height * 0.12
    lines = record.get('lines', [])

    level_line = None
    tree_name = record.get('tree') or None
    for line in lines:
        match = LEVEL_RE.match(normalize(line['text']))
        if match:
            level_line = line
            tree_name = normalize(match.group(1))
            break
    if level_line is None:
        return None
    if tree_name in CLASS_TREE_HINTS:
        class_name = CLASS_TREE_HINTS[tree_name]
    if tree_name not in index_tree_names(class_name, idx) and tree_name in CLASS_TREE_HINTS.values():
        tree_name = record.get('tree') or tree_name

    level_y = level_line['y']
    region = [line for line in lines if min_y <= line['y'] < level_y]
    region.sort(key=lambda line: line['y'], reverse=True)

    cast = cooldown = ability_type = range_value = base_value = None
    resource_parts: list[str] = []
    cast_y = None

    for line in region:
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

    between = [line for line in region if cast_y < line['y'] < level_y]
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
        if len(text) < 8 or CHAT_NOISE.search(text) or NOISE.search(text):
            continue
        if fuzzy(text, candidates) or LEVEL_RE.match(text):
            continue
        if CAST_RE.match(text) or COOLDOWN_RE.match(text) or RANGE_RE.match(text):
            continue
        if COSTS_RE.match(text) or GRANTS_RE.match(text) or BASE_RE.match(text):
            continue
        if text in SCREEN_TYPES or text in {'Self', 'Friend'} or STAT_LINE_RE.match(text):
            continue
        if text not in description_parts:
            description_parts.append(text)

    for line in region:
        if line['y'] > cast_y:
            continue
        text = normalize(line['text'])
        if match := COOLDOWN_RE.match(text):
            cooldown = f"{match.group(1)}s"
        elif match := RANGE_RE.match(text):
            range_value = f"{match.group(1)}m"
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

    resolved_tree = tree_name if tree_name in index_tree_names(class_name, idx) else record.get('tree')
    if resolved_tree not in index_tree_names(class_name, idx):
        for tree, names in idx[class_name].items():
            if ability_name in names:
                resolved_tree = tree
                break

    class_names = all_ability_names(idx, class_name)
    summary = clean_summary(' '.join(reversed(description_parts)).strip(), class_names)
    if summary and cooldown and 'Cooldown' not in summary:
        summary = f"{summary} {cooldown} Cooldown.".strip()

    return {
        'class': class_name,
        'tree': resolved_tree,
        'name': ability_name,
        'type': ability_type,
        'cast_speed': cast,
        'resource_delta': normalize_resource_delta(', '.join(resource_parts) if resource_parts else None),
        'range': range_value,
        'base_value': base_value,
        'summary': summary,
    }


def collect_candidates(record: dict, class_name: str, idx: dict) -> set[str]:
    tree = record.get('tree')
    names: set[str] = set()
    if tree and tree in idx[class_name]:
        names |= set(idx[class_name][tree].keys())
    if class_name == 'Druid':
        for tree_name in idx[class_name]:
            names |= set(idx[class_name][tree_name].keys())
    return names


def tooltip_score(tip: dict, class_names: set[str]) -> int:
    score = 0
    for field in ('cast_speed', 'range', 'resource_delta', 'base_value', 'type'):
        if tip.get(field):
            score += 12
    score += summary_quality(tip.get('summary'), class_names)
    return score


def apply_fields(ability: dict, tip: dict, *, force_summary: bool = False) -> bool:
    changed = False
    for field in ('cast_speed', 'range', 'base_value', 'type'):
        value = tip.get(field)
        if value and ability.get(field) != value:
            ability[field] = value
            changed = True

    resource = tip.get('resource_delta')
    if resource:
        resource = normalize_resource_delta(resource)
        if ability.get('resource_delta') != resource:
            ability['resource_delta'] = resource
            changed = True

    new_summary = tip.get('summary')
    if new_summary:
        old_q = summary_quality(ability.get('summary'), set())
        new_q = summary_quality(new_summary, set())
        if force_summary or new_q > old_q + 10:
            if ability.get('summary') != new_summary:
                ability['summary'] = new_summary
                changed = True
    return changed


def main() -> None:
    records = json.loads(SCRAPED.read_text())['records']
    data = BD.load_data()
    index = BD.build_name_index(data)

    best: dict[tuple[str, str, str], dict] = {}
    for record in records:
        class_name = record.get('class') or CLASS_TREE_HINTS.get(record.get('tree') or '')
        if not class_name or class_name not in index:
            continue
        candidates = collect_candidates(record, class_name, index)
        tip = parse_record(record, class_name, candidates, index)
        if not tip or not tip.get('name') or not tip.get('tree'):
            continue
        key = (tip['class'], tip['tree'], tip['name'])
        if key[2] not in index[key[0]][key[1]]:
            continue
        class_names = all_ability_names(index, class_name)
        score = tooltip_score(tip, class_names)
        prev = best.get(key)
        if not prev or score > prev['_score']:
            tip['_score'] = score
            best[key] = tip

    druid_applied = dark_fool_applied = type_applied = 0

    for key, tip in best.items():
        class_name, tree_name, ability_name = key
        ability = index[class_name][tree_name][ability_name]
        class_names = all_ability_names(index, class_name)
        force_summary = class_name in {'Druid', 'Dark Fool'}
        if class_name in {'Druid', 'Dark Fool'}:
            cleaned = tip.get('summary')
            if cleaned:
                tip = {**tip, 'summary': clean_summary(cleaned, class_names) or cleaned}
            if apply_fields(ability, tip, force_summary=force_summary):
                if class_name == 'Druid':
                    druid_applied += 1
                else:
                    dark_fool_applied += 1
        if tip.get('type') in SCREEN_TYPES:
            ability['type'] = tip['type']
            type_applied += 1

    # Enchant Humanoid — from IMG_3608/3609 OCR.
    enchant = index['Druid'][CORE_TREE]['Enchant Humanoid']
    enchant.update({
        'type': 'Spell',
        'cast_speed': '0.0s',
        'range': 'Self',
        'summary': 'Deals Mind damage and Stuns the target for 2/4 seconds.',
    })
    font = index['Druid'][CORE_TREE]['Font of Energy']
    font.update({
        'type': 'Spell',
        'cast_speed': '0.0s',
        'range': 'Self',
        'summary': 'Grants your party +10 Spirit.',
    })

    # Dark Fool class abilities from IMG_3524.
    raise_morale = index['Dark Fool'][CORE_TREE]['Raise Morale']
    raise_morale.update({
        'type': 'Spell',
        'cast_speed': '3.0s',
        'range': '90m',
        'resource_delta': '100 Focus',
        'summary': 'Grants your party +10 Spirit and reduces their Panic by 75 every 3 seconds.',
    })
    song = index['Dark Fool'][CORE_TREE]['Song of Travel']
    song.update({
        'type': 'Spell',
        'cast_speed': '0.2s',
        'range': 'Self',
        'summary': "Increases your party's Movement Speed while out of combat.",
    })

    # Fix known OCR mis-assignments.
    wrath = index['Druid']['Earthshaping']['Wrath of Danu']
    wrath.update({
        'type': 'Spell',
        'cast_speed': '0.0s',
        'range': '6m',
        'summary': 'Deals Earth damage. +200% Aftershock amount and Fractures them, dealing damage equal to their Aftershock and removing it.',
    })
    void_sight = index['Druid']['Voidcalling']['Void Sight']
    void_sight.update({
        'type': 'Spell',
        'cast_speed': '0.0s',
        'range': 'Self',
        'summary': 'Your Void damage to targets hit stacks up to 5 times for 6 seconds.',
    })
    return_earth = index['Druid']['Natureweaving']['Return to Earth']
    return_earth.update({
        'type': 'Spell',
        'cast_speed': '0.0s',
        'range': '25m',
        'summary': 'Resurrects target ally with 15% max Health and Res Sickness.',
    })

    # Rally — confirmed from user screenshot.
    rally = index['Blessed Crow'][CORE_TREE]['Rally']
    rally.update({
        'type': 'Spell',
        'cast_speed': '0.2s',
        'base_value': 'Strong Heal Over Time',
        'resource_delta': '2 Judgment, +500 Faith',
        'range': '90m',
        'summary': 'Grants your party a strong Heal Over Time for 6 seconds. 6.0s Cooldown.',
    })

    # User-confirmed overrides (keep over noisy OCR).
    willow = index['Dark Fool']['Mummery']['As the Willow in a Storm']
    willow.update({
        'type': 'Spell',
        'cast_speed': '3s',
        'range': '90m',
        'resource_delta': '75 Focus',
        'base_value': '+25% Block Value, +10% Parry Chance',
        'summary': "Increases your party's Block Value by 25% and grants +10% Parry Chance.",
    })

    anam = index['Empath']['Tend the Enemy']['Anam Truaillithe']
    anam.update({
        'resource_delta': '175 Faith, +1 Judgment',
    })

    # Dark Fool — force-clean every summary and use screenshot types.
    df_names = all_ability_names(index, 'Dark Fool')
    for tree_name, tree in index['Dark Fool'].items():
        for ability_name, ability in tree.items():
            key = ('Dark Fool', tree_name, ability_name)
            tip = best.get(key)
            if tip and tip.get('type') in SCREEN_TYPES:
                ability['type'] = tip['type']
            override = DARK_FOOL_SUMMARY_OVERRIDES.get((tree_name, ability_name))
            if override:
                ability['summary'] = override
            else:
                cleaned = clean_summary(ability.get('summary'), df_names)
                if tip and tip.get('summary'):
                    cleaned = clean_summary(tip['summary'], df_names) or cleaned
                if cleaned:
                    ability['summary'] = cleaned
            if not ability.get('type') or '/' in str(ability.get('type')):
                ability['type'] = 'Spell'

    # Druid — clean summary bleed from other druid ability names.
    druid_names = all_ability_names(index, 'Druid')
    for tree_name, tree in index['Druid'].items():
        for ability_name, ability in tree.items():
            override = DRUID_SUMMARY_OVERRIDES.get((tree_name, ability_name))
            if override:
                ability['summary'] = override
                continue
            cleaned = clean_summary(ability.get('summary'), druid_names)
            if cleaned:
                ability['summary'] = cleaned

    # Apply screenshot type labels everywhere OCR captured them.
    for key, tip in best.items():
        if tip.get('type') in SCREEN_TYPES:
            class_name, tree_name, ability_name = key
            index[class_name][tree_name][ability_name]['type'] = tip['type']

    BD.attach_icons(index)
    DATA_PATH.write_text(json.dumps(BD.serialize_index(index), ensure_ascii=False), encoding='utf-8')

    print(f'Parsed {len(best)} tooltips from OCR')
    print(f'Druid field updates: {druid_applied}')
    print(f'Dark Fool field updates: {dark_fool_applied}')
    print(f'Type label updates: {type_applied}')


if __name__ == '__main__':
    main()
