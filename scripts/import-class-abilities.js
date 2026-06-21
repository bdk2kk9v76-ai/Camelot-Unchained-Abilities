#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '..', 'data.json');
const TREE_NAME_MAP = { Core: 'Class Abilities' };

function mapCategory(category, ability) {
  if (category && category.trim()) {
    return category.replace(/\s*\|\s*/g, ' / ').trim();
  }
  if (ability.baseHealing) return 'Heal';
  if (ability.baseDamage || ability.damageType) return 'Damage';
  return 'Ability';
}

function formatCastSpeed(castTime) {
  if (castTime === null || castTime === undefined || castTime === '') return null;
  const n = Number(castTime);
  return Number.isInteger(n) ? `${n}.0s` : `${n}s`;
}

function formatResourceDelta(cost) {
  if (!cost || !cost.amount) return 'None';
  return `${cost.amount} ${cost.resource}`;
}

function formatRange(ability) {
  if (ability.range) return `${ability.range}m`;
  if (ability.target) return ability.target;
  return null;
}

function isBuffish(category) {
  const c = (category || '').toLowerCase();
  return c.includes('buff') && !c.includes('damage');
}

function formatBaseValue(ability) {
  if (ability.baseHealing) return `${ability.baseHealing} Base Healing`;
  if (ability.baseDamage && !isBuffish(ability.category)) {
    const type = ability.damageType || 'Base';
    return `${ability.baseDamage} ${type} Damage`;
  }
  return null;
}

function buildSummary(ability) {
  const parts = [];
  const desc = ability.description || ability.modifiers || '';
  if (desc) parts.push(desc);
  if (ability.modifiers && ability.description && !ability.description.includes(ability.modifiers)) {
    parts.push(ability.modifiers);
  }
  if (ability.conditions) parts.push(`(${ability.conditions})`);
  if (ability.cooldown) parts.push(`${Number(ability.cooldown)}.0s Cooldown.`);
  return parts.join(' ').trim() || 'No description provided.';
}

function convertAbility(ability) {
  const entry = {
    type: mapCategory(ability.category, ability),
    cast_speed: formatCastSpeed(ability.castTime),
    base_value: formatBaseValue(ability),
    resource_delta: formatResourceDelta(ability.cost),
    range: formatRange(ability),
    summary: buildSummary(ability)
  };

  Object.keys(entry).forEach(key => {
    if (entry[key] === null || entry[key] === undefined) delete entry[key];
  });
  if (!entry.resource_delta) entry.resource_delta = 'None';

  return entry;
}

function convertClassSource(source) {
  const className = source.class;
  if (!className) {
    throw new Error('Source JSON must include a "class" field.');
  }

  const trees = Object.entries(source.trees || {}).map(([treeName, abilities]) => ({
    name: TREE_NAME_MAP[treeName] || treeName,
    abilities: Object.fromEntries((abilities || []).map(ability => [ability.name, convertAbility(ability)]))
  }));

  return { class: className, trees };
}

function upsertClass(data, classEntry) {
  const faction = data.find(entry => entry.faction === 'Tuatha Dé Danann');
  if (!faction) {
    throw new Error('Tuatha Dé Danann faction not found in data.json.');
  }

  const existingIndex = faction.classes.findIndex(entry => entry.class === classEntry.class);
  if (existingIndex >= 0) {
    faction.classes[existingIndex] = classEntry;
  } else {
    faction.classes.push(classEntry);
    faction.classes.sort((a, b) => a.class.localeCompare(b.class));
  }
}

function printUsage() {
  console.log(`Usage: node scripts/import-class-abilities.js <source.json> [class-name]

Examples:
  node scripts/import-class-abilities.js ~/Downloads/druid-abilities.json
  node scripts/import-class-abilities.js ~/Downloads/abilities.json "Druid"`);
}

function main() {
  const sourcePath = process.argv[2];
  const classNameOverride = process.argv[3];

  if (!sourcePath) {
    printUsage();
    process.exit(1);
  }

  const resolvedSourcePath = path.resolve(sourcePath);
  const source = JSON.parse(fs.readFileSync(resolvedSourcePath, 'utf8'));
  if (classNameOverride) {
    source.class = classNameOverride;
  }

  const classEntry = convertClassSource(source);
  const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));

  upsertClass(data, classEntry);
  fs.writeFileSync(DATA_PATH, JSON.stringify(data));

  const treeSummary = classEntry.trees
    .map(tree => `${tree.name} (${Object.keys(tree.abilities).length})`)
    .join(', ');
  const totalAbilities = classEntry.trees.reduce(
    (count, tree) => count + Object.keys(tree.abilities).length,
    0
  );

  console.log(`Imported ${classEntry.class}: ${treeSummary}`);
  console.log(`Total abilities: ${totalAbilities}`);
  console.log('\nNext step: add tree palettes for new specialization trees in app.js CLASS_TREE_PALETTES.');
}

main();
