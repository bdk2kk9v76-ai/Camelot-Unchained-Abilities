let database = [];
let selectedClass = '';
let searchQuery = '';

const elements = {
  homeLogo: document.getElementById('home-logo'),
  classSelect: document.getElementById('class-select'),
  activeClassHero: document.getElementById('active-class-hero'),
  searchBarContainer: document.getElementById('search-bar-container'),
  searchInput: document.getElementById('search-input'),
  clearSearch: document.getElementById('clear-search'),
  exportAiBtn: document.getElementById('export-ai-btn'),
  accordionContainer: document.getElementById('accordion-container')
};

const DEFAULT_CLASS_METADATA = {
  desc: 'A steadfast champion of the realm whose specialized ability trees define their role on the battlefield.',
  img: './assets/class-placeholder.jpg',
  icon: './assets/class-placeholder.jpg',
  hero_position: 'object-top',
  active_hero_position: 'object-top',
  theme_color: '#8c734b'
};

const CLASS_METADATA = {
  'Fianna': {
    desc: 'Fianna are focused on single target damage, with higher health regeneration than their faction counterparts. They also punish enemies who attack them, dealing retaliatory damage.',
    img: './assets/fianna-hero.png',
    icon: './assets/fianna-icon.png',
    hero_position: 'object-[50%_25%]',
    active_hero_position: 'object-[50%_18%]',
    theme_color: '#e08524'
  },
  'Red Cap': {
    desc: 'Red Caps utilize strong poisons that apply Damage over Time to make enemies vulnerable. They move unpredictably with short cooldown speed boosts and shifts between the Veil.',
    img: './assets/red-cap-hero.png',
    icon: './assets/red-cap-icon.png',
    hero_position: 'object-[50%_18%]',
    active_hero_position: 'object-[50%_15%]',
    theme_color: '#d42626'
  },
  'Forest Stalker': {
    desc: 'Forest Stalker\'s Earth attacks allow for synergy with Earth Arcanists, delivering finishing attacks from range. They have Stealth abilities that prevent enemies from seeing them.',
    img: './assets/forest-stalker-hero.png',
    icon: './assets/forest-stalker-icon.png',
    hero_position: 'object-[50%_35%]',
    active_hero_position: 'object-[50%_27%]',
    theme_color: '#2a8dd4'
  },
  'Druid': {
    desc: 'Druids are capable of dealing extreme damage by spending large amounts of Mana at once. Poison damage and Void spells can cut down enemies, and they can resurrect fallen allies.',
    img: './assets/druid-hero.png',
    icon: './assets/druid-icon.png',
    hero_position: 'object-[50%_25%]',
    active_hero_position: 'object-[50%_22%]',
    theme_color: '#3e9c4b'
  },
  'Empath': {
    desc: 'Empaths can Link themself with an ally and enemy, empowering their abilities. Their DOT effects and ability to spend Health on powerful spells make them masters of engagements.',
    img: './assets/empath-hero.png',
    icon: './assets/empath-icon.png',
    hero_position: 'object-[50%_25%]',
    active_hero_position: 'object-[50%_20%]',
    theme_color: '#9b4df0'
  },
  'Dark Fool': {
    desc: 'Dark Fools leverage the most Panic, utilizing powerful Control effects that are more effective against weakened or Panicked opponents to deal additional Mind damage.',
    img: './assets/dark-fool-hero.png',
    icon: './assets/dark-fool-icon.png',
    hero_position: 'object-[50%_28%]',
    active_hero_position: 'object-[50%_20%]',
    theme_color: '#d0db42'
  },
  'Blessed Crow': {
    desc: 'Blessed Crows utilize magic Cauldrons to create areas of powerful buffs and healing that also damage their enemies. Fighting them on their own terms is usually a losing prospect.',
    img: './assets/blessed-crow-hero.png',
    icon: './assets/blessed-crow-icon.png',
    hero_position: 'object-[50%_30%]',
    active_hero_position: 'object-[50%_25%]',
    theme_color: '#38c7b4'
  }
};

function getClassMetadata(className) {
  return CLASS_METADATA[className] || DEFAULT_CLASS_METADATA;
}

function getClassThemeColor(meta) {
  return meta.theme_color || DEFAULT_CLASS_METADATA.theme_color;
}

function getClassThemeTint(meta) {
  return `${getClassThemeColor(meta)}1a`;
}

function getClassThemeStyles(meta) {
  const themeColor = getClassThemeColor(meta);
  return {
    themeColor,
    themeTint: getClassThemeTint(meta)
  };
}

function classThemeInlineStyle(themeColor, themeTint) {
  return `border-color: ${themeColor}; background-color: ${themeTint}; background-image: none;`;
}

function getHeroPositionClass(meta) {
  return meta.hero_position || DEFAULT_CLASS_METADATA.hero_position;
}

function getActiveHeroPositionClass(meta) {
  return meta.active_hero_position || meta.hero_position || DEFAULT_CLASS_METADATA.active_hero_position;
}

const DEFAULT_TREE_PALETTE = {
  accent: '#cba86a',
  accentMuted: '#8c734b',
  headerFrom: '#453828',
  headerTo: '#2d261e',
  activeFrom: '#4a151f',
  activeTo: '#2a0b12',
  contentBg: '#1a1a1f',
  cardHeaderFrom: '#4a151f',
  borderFrom: '#cba86a',
  borderMid: '#8c734b',
  borderTo: '#4a3c26',
  iconFrom: '#3a2b1f',
  iconTo: '#1a140f'
};

const FACTION_PALETTES = {
  'Tuatha Dé Danann': {
    accent: '#6aab7a',
    accentMuted: '#4a7356',
    headerFrom: '#284532',
    headerTo: '#1a2d22',
    activeFrom: '#154a2a',
    activeTo: '#0b2a16',
    contentBg: '#141a16',
    cardHeaderFrom: '#154a2a',
    borderFrom: '#6aab7a',
    borderMid: '#4a7356',
    borderTo: '#264a32',
    iconFrom: '#1f3a28',
    iconTo: '#0f1a14'
  }
};

const CLASS_PALETTES = {
  'Blessed Crow': {
    accent: '#c46a6a',
    accentMuted: '#8c4b4b',
    headerFrom: '#452828',
    headerTo: '#2d1e1e',
    activeFrom: '#4a1515',
    activeTo: '#2a0b0b',
    contentBg: '#1a1416',
    cardHeaderFrom: '#4a1515',
    borderFrom: '#c46a6a',
    borderMid: '#8c4b4b',
    borderTo: '#4a2626',
    iconFrom: '#3a1f1f',
    iconTo: '#1a0f0f'
  },
  'Dark Fool': {
    accent: '#a86aab',
    accentMuted: '#73567a',
    headerFrom: '#3d2845',
    headerTo: '#261a2d',
    activeFrom: '#3a154a',
    activeTo: '#220b2a',
    contentBg: '#18141a',
    cardHeaderFrom: '#3a154a',
    borderFrom: '#a86aab',
    borderMid: '#73567a',
    borderTo: '#3d2f4a',
    iconFrom: '#2a1f3a',
    iconTo: '#140f1a'
  },
  'Empath': {
    accent: '#6aabc4',
    accentMuted: '#4b738c',
    headerFrom: '#284045',
    headerTo: '#1a282d',
    activeFrom: '#154a4a',
    activeTo: '#0b2a2a',
    contentBg: '#141a1a',
    cardHeaderFrom: '#154a4a',
    borderFrom: '#6aabc4',
    borderMid: '#4b738c',
    borderTo: '#264a4a',
    iconFrom: '#1f323a',
    iconTo: '#0f1a1a'
  },
  'Fianna': {
    accent: '#cba86a',
    accentMuted: '#8c734b',
    headerFrom: '#453828',
    headerTo: '#2d261e',
    activeFrom: '#4a151f',
    activeTo: '#2a0b12',
    contentBg: '#1a1a1f',
    cardHeaderFrom: '#4a151f',
    borderFrom: '#cba86a',
    borderMid: '#8c734b',
    borderTo: '#4a3c26',
    iconFrom: '#3a2b1f',
    iconTo: '#1a140f'
  },
  'Forest Stalker': {
    accent: '#6a9a5a',
    accentMuted: '#4a7040',
    headerFrom: '#324528',
    headerTo: '#222d1a',
    activeFrom: '#254a15',
    activeTo: '#142a0b',
    contentBg: '#161a14',
    cardHeaderFrom: '#254a15',
    borderFrom: '#6a9a5a',
    borderMid: '#4a7040',
    borderTo: '#304a26',
    iconFrom: '#25351f',
    iconTo: '#121a0f'
  }
};

function getFactionPalette(factionName) {
  return FACTION_PALETTES[factionName] || DEFAULT_TREE_PALETTE;
}

function getClassPalette(className) {
  return CLASS_PALETTES[className] || DEFAULT_TREE_PALETTE;
}

const CLASS_ABILITY_TREE = 'Class Abilities';

const TREE_PALETTES = {
  'Dominance': {
    accent: '#b05858',
    accentMuted: '#7a4040',
    headerFrom: '#3a2020',
    headerTo: '#251616',
    activeFrom: '#3a1212',
    activeTo: '#1f0808',
    contentBg: '#181214',
    cardHeaderFrom: '#3a1212',
    borderFrom: '#b05858',
    borderMid: '#7a4040',
    borderTo: '#422828',
    iconFrom: '#321818',
    iconTo: '#180c0c'
  },
  'Ritual': {
    accent: '#8b7ab8',
    accentMuted: '#5e5280',
    headerFrom: '#2e2640',
    headerTo: '#1c1830',
    activeFrom: '#2a1845',
    activeTo: '#160c28',
    contentBg: '#141218',
    cardHeaderFrom: '#2a1845',
    borderFrom: '#8b7ab8',
    borderMid: '#5e5280',
    borderTo: '#383050',
    iconFrom: '#221c32',
    iconTo: '#100e18'
  },
  'Nourishment': {
    accent: '#6b9478',
    accentMuted: '#496552',
    headerFrom: '#243830',
    headerTo: '#182820',
    activeFrom: '#1a4530',
    activeTo: '#0c2818',
    contentBg: '#121816',
    cardHeaderFrom: '#1a4530',
    borderFrom: '#6b9478',
    borderMid: '#496552',
    borderTo: '#2e4838',
    iconFrom: '#1a2e22',
    iconTo: '#0c1610'
  },
  'Night Terrors': {
    accent: '#6878a8',
    accentMuted: '#485878',
    headerFrom: '#242838',
    headerTo: '#181c28',
    activeFrom: '#182040',
    activeTo: '#0c1028',
    contentBg: '#121418',
    cardHeaderFrom: '#182040',
    borderFrom: '#6878a8',
    borderMid: '#485878',
    borderTo: '#303848',
    iconFrom: '#1a2030',
    iconTo: '#0c1018'
  },
  'Dark Fables': {
    accent: '#9a6a98',
    accentMuted: '#684868',
    headerFrom: '#382838',
    headerTo: '#241824',
    activeFrom: '#401840',
    activeTo: '#240c24',
    contentBg: '#161418',
    cardHeaderFrom: '#401840',
    borderFrom: '#9a6a98',
    borderMid: '#684868',
    borderTo: '#403040',
    iconFrom: '#281828',
    iconTo: '#140c14'
  },
  'Mummery': {
    accent: '#a88458',
    accentMuted: '#705838',
    headerFrom: '#3a3020',
    headerTo: '#282018',
    activeFrom: '#452814',
    activeTo: '#281808',
    contentBg: '#181614',
    cardHeaderFrom: '#452814',
    borderFrom: '#a88458',
    borderMid: '#705838',
    borderTo: '#484028',
    iconFrom: '#2a2218',
    iconTo: '#141008'
  },
  'Tend the Enemy': {
    accent: '#a85868',
    accentMuted: '#703c48',
    headerFrom: '#3a2028',
    headerTo: '#281820',
    activeFrom: '#451020',
    activeTo: '#280810',
    contentBg: '#181416',
    cardHeaderFrom: '#451020',
    borderFrom: '#a85868',
    borderMid: '#703c48',
    borderTo: '#482830',
    iconFrom: '#2a1820',
    iconTo: '#140c10'
  },
  'Tend the Spirit': {
    accent: '#5898a8',
    accentMuted: '#386878',
    headerFrom: '#203038',
    headerTo: '#182028',
    activeFrom: '#104048',
    activeTo: '#082828',
    contentBg: '#121818',
    cardHeaderFrom: '#104048',
    borderFrom: '#5898a8',
    borderMid: '#386878',
    borderTo: '#284848',
    iconFrom: '#182830',
    iconTo: '#0c1418'
  },
  'Tend the Body': {
    accent: '#989058',
    accentMuted: '#686040',
    headerFrom: '#383020',
    headerTo: '#282018',
    activeFrom: '#403810',
    activeTo: '#282008',
    contentBg: '#181614',
    cardHeaderFrom: '#403810',
    borderFrom: '#989058',
    borderMid: '#686040',
    borderTo: '#484030',
    iconFrom: '#2a2818',
    iconTo: '#141008'
  },
  'Prowess': {
    accent: '#788898',
    accentMuted: '#505868',
    headerFrom: '#282830',
    headerTo: '#1c1c24',
    activeFrom: '#203040',
    activeTo: '#101820',
    contentBg: '#141618',
    cardHeaderFrom: '#203040',
    borderFrom: '#788898',
    borderMid: '#505868',
    borderTo: '#383840',
    iconFrom: '#1c2028',
    iconTo: '#0e1014'
  },
  'Resilience': {
    accent: '#508090',
    accentMuted: '#385860',
    headerFrom: '#243038',
    headerTo: '#182028',
    activeFrom: '#143040',
    activeTo: '#0a1820',
    contentBg: '#121618',
    cardHeaderFrom: '#143040',
    borderFrom: '#508090',
    borderMid: '#385860',
    borderTo: '#284038',
    iconFrom: '#182428',
    iconTo: '#0c1214'
  },
  'Form of Danu': {
    accent: '#588868',
    accentMuted: '#385848',
    headerFrom: '#243028',
    headerTo: '#182018',
    activeFrom: '#184830',
    activeTo: '#0c2818',
    contentBg: '#121614',
    cardHeaderFrom: '#184830',
    borderFrom: '#588868',
    borderMid: '#385848',
    borderTo: '#304038',
    iconFrom: '#182820',
    iconTo: '#0c140c'
  },
  'Predation': {
    accent: '#a89050',
    accentMuted: '#706038',
    headerFrom: '#383020',
    headerTo: '#282018',
    activeFrom: '#483010',
    activeTo: '#281808',
    contentBg: '#181614',
    cardHeaderFrom: '#483010',
    borderFrom: '#a89050',
    borderMid: '#706038',
    borderTo: '#484028',
    iconFrom: '#2a2418',
    iconTo: '#141008'
  },
  'Thorn and Fang': {
    accent: '#709050',
    accentMuted: '#486038',
    headerFrom: '#283020',
    headerTo: '#1c2018',
    activeFrom: '#204010',
    activeTo: '#102808',
    contentBg: '#141612',
    cardHeaderFrom: '#204010',
    borderFrom: '#709050',
    borderMid: '#486038',
    borderTo: '#384028',
    iconFrom: '#202818',
    iconTo: '#101408'
  },
  'Stone Rain': {
    accent: '#788090',
    accentMuted: '#505860',
    headerFrom: '#2c3038',
    headerTo: '#1e2228',
    activeFrom: '#283040',
    activeTo: '#181820',
    contentBg: '#141618',
    cardHeaderFrom: '#283040',
    borderFrom: '#788090',
    borderMid: '#505860',
    borderTo: '#383c42',
    iconFrom: '#222830',
    iconTo: '#101214'
  }
};

const DEFAULT_SPECIALIZED_TREE_PALETTE = {
  accent: '#807878',
  accentMuted: '#585050',
  headerFrom: '#302c2c',
  headerTo: '#201c1c',
  activeFrom: '#302020',
  activeTo: '#1a1010',
  contentBg: '#161414',
  cardHeaderFrom: '#302020',
  borderFrom: '#807878',
  borderMid: '#585050',
  borderTo: '#403838',
  iconFrom: '#282020',
  iconTo: '#141010'
};

function getTreePalette(treeName) {
  return TREE_PALETTES[treeName] || DEFAULT_SPECIALIZED_TREE_PALETTE;
}

function getAccordionPalette(treeName, className) {
  if (treeName === CLASS_ABILITY_TREE) {
    return getClassPalette(className);
  }
  return getTreePalette(treeName);
}

function setContextualToolbarVisible(visible) {
  elements.searchBarContainer.classList.toggle('hidden', !visible);
}

function renderActiveClassHero(className) {
  const meta = getClassMetadata(className);

  elements.activeClassHero.innerHTML = UI.activeClassHeroBanner(className, meta);
  elements.activeClassHero.classList.remove('hidden');

  const closeBtn = document.getElementById('close-class-hero');
  if (closeBtn) {
    closeBtn.addEventListener('click', resetClassSelection);
  }
}

function hideActiveClassHero() {
  elements.activeClassHero.innerHTML = '';
  elements.activeClassHero.removeAttribute('style');
  elements.activeClassHero.classList.add('hidden');
}

function selectClass(className) {
  if (selectedClass !== className) {
    searchQuery = '';
    elements.searchInput.value = '';
    elements.clearSearch.classList.add('hidden');
  }

  selectedClass = className;
  elements.classSelect.value = className;
  elements.searchInput.disabled = false;
  elements.clearSearch.disabled = false;
  elements.searchInput.placeholder = 'Search class abilities and metadata...';
  setContextualToolbarVisible(true);
  renderAbilities();
}

function resetClassSelection() {
  selectedClass = '';
  searchQuery = '';
  elements.classSelect.value = '';
  elements.searchInput.value = '';
  elements.searchInput.disabled = true;
  elements.clearSearch.disabled = true;
  elements.clearSearch.classList.add('hidden');
  elements.searchInput.placeholder = 'Search class abilities and metadata...';
  setContextualToolbarVisible(false);
  hideActiveClassHero();
  renderAbilities();
}

function paletteStyleVars(palette) {
  return [
    `--tree-accent:${palette.accent}`,
    `--tree-accent-muted:${palette.accentMuted}`,
    `--tree-header-from:${palette.headerFrom}`,
    `--tree-header-to:${palette.headerTo}`,
    `--tree-active-from:${palette.activeFrom}`,
    `--tree-active-to:${palette.activeTo}`,
    `--tree-content-bg:${palette.contentBg}`,
    `--tree-card-header-from:${palette.cardHeaderFrom}`,
    `--tree-border-from:${palette.borderFrom}`,
    `--tree-border-mid:${palette.borderMid}`,
    `--tree-border-to:${palette.borderTo}`,
    `--tree-icon-from:${palette.iconFrom}`,
    `--tree-icon-to:${palette.iconTo}`
  ].join(';');
}

function getClassAbilityPalette(themeColor) {
  return {
    accent: themeColor,
    accentMuted: themeColor,
    headerFrom: `${themeColor}26`,
    headerTo: '#121214',
    activeFrom: `${themeColor}40`,
    activeTo: '#0e0e10',
    contentBg: '#121214',
    cardHeaderFrom: `${themeColor}33`,
    borderFrom: themeColor,
    borderMid: themeColor,
    borderTo: '#2a2a2a',
    iconFrom: '#121214',
    iconTo: '#0e0e10'
  };
}

const ABILITY_ICON_SVGS = {
  damage: `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M14.5 3.5l6 6-9 9H8v-3.5L14.5 3.5z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M3 21l4-4"/></svg>`,
  heal: `<svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`,
  buff: `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M12 3v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6l2.1 2.1M5.6 18.4l2.1-2.1m8.6-8.6l2.1-2.1"/><circle cx="12" cy="12" r="2.5" stroke-width="1.75"/></svg>`,
  mitigation: `<svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l8 4v6c0 5.25-3.4 9.74-8 11-4.6-1.26-8-5.75-8-11V6l8-4zm0 3.2L6 8.5V10c0 4.02 2.55 7.58 6 8.88 3.45-1.3 6-4.86 6-8.88V8.5l-6-3.3z"/></svg>`,
  cc: `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M8.5 10.5a2.5 2.5 0 115 0v1.5h1.5a2.5 2.5 0 110 5H13.5v1.5a2.5 2.5 0 11-5 0V17H7a2.5 2.5 0 110-5h1.5v-1.5z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M10 20c1.2-1.5 2-3.2 2.2-5M14 20c-1.2-1.5-2-3.2-2.2-5"/></svg>`,
  spell: `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="2.5" stroke-width="1.75"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/></svg>`,
  fallback: `<svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l2.4 7.4H22l-6 4.6 2.3 7-6.3-4.6L5.7 21l2.3-7-6-4.6h7.6L12 2z"/></svg>`
};

const TYPE_ICON_RULES = [
  { keywords: ['heal', 'healing'], icon: 'heal' },
  { keywords: ['cc', 'snare', 'root'], icon: 'cc' },
  { keywords: ['mitigation', 'armor'], icon: 'mitigation' },
  { keywords: ['buff', 'utility'], icon: 'buff' },
  { keywords: ['damage'], icon: 'damage' },
  { keywords: ['spell'], icon: 'spell' }
];

function getAbilityIcon(type, generativeIcon) {
  if (generativeIcon) return generativeIcon;

  const normalized = (type || '').toLowerCase();

  for (const rule of TYPE_ICON_RULES) {
    if (rule.keywords.some(keyword => normalized.includes(keyword))) {
      return ABILITY_ICON_SVGS[rule.icon];
    }
  }

  return ABILITY_ICON_SVGS.fallback;
}

const UI = {
  icons: {
    chevron: (expanded) => `<svg class="w-6 h-6 transform transition-transform duration-300 chevron${expanded ? ' rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M19 9l-7 7-7-7" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path></svg>`
  },

  emptyState(message) {
    return `<p class="text-center text-[#8c734b] italic mt-8 font-cinzel tracking-wide">${message}</p>`;
  },

  activeClassHeroBanner(className, meta) {
    const themeColor = getClassThemeColor(meta);
    const heroPosition = getActiveHeroPositionClass(meta);

    return `
      <div class="relative w-full h-64 rounded-lg overflow-hidden border shadow-lg" style="border-color: ${themeColor};">
        <img src="${meta.img}" alt="${className} banner" class="absolute inset-0 w-full h-full object-cover ${heroPosition}" onerror="this.style.display='none'"/>
        <div class="absolute inset-0 bg-gradient-to-r from-gray-950 via-gray-950/90 to-transparent pointer-events-none"></div>
        <button type="button" id="close-class-hero" aria-label="Close class view" class="absolute top-4 right-4 z-20 p-2 text-[#a0a0a5] hover:text-[#cba86a] transition-colors focus:outline-none focus:ring-1 focus:ring-[#cba86a] rounded-sm bg-gray-950/40 hover:bg-gray-950/60 backdrop-blur-sm border border-[#8c734b]/30 hover:border-[#cba86a]/60">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
        <div class="relative h-full flex flex-col justify-end p-8 w-3/4 md:w-2/3">
          <h2 class="font-cinzel text-2xl sm:text-3xl font-bold mb-2" style="color: ${themeColor};">${className}</h2>
          <p class="text-sm text-[#d0d0d5] leading-relaxed">${meta.desc}</p>
        </div>
      </div>`;
  },

  classSelectionGrid(factions) {
    return factions.map((factionData, index) => {
      const factionPalette = getFactionPalette(factionData.faction);
      const classNodes = [...(factionData.classes || [])].sort((a, b) => a.class.localeCompare(b.class));

      const classCards = classNodes.map(classObj => {
        const meta = getClassMetadata(classObj.class);
        const { themeColor, themeTint } = getClassThemeStyles(meta);
        const heroPosition = getHeroPositionClass(meta);

        return `
        <button type="button" class="class-card overflow-hidden flex flex-col w-full text-left rounded-lg transition-all duration-200 ease-in-out focus:outline-none" style="${classThemeInlineStyle(themeColor, themeTint)} --tree-accent: ${themeColor}; --tree-accent-muted: ${themeColor};" data-class-name="${classObj.class}">
          <div class="relative overflow-hidden rounded-t-lg">
            <img src="${meta.img}" class="w-full h-64 object-cover ${heroPosition}" alt="${classObj.class} banner" onerror="this.style.display='none'">
            <div class="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-[#121214] to-transparent pointer-events-none"></div>
          </div>
          <div class="flex flex-row items-center gap-4 p-4">
            <div class="ability-icon w-16 h-16 rounded-full flex items-center justify-center shrink-0 overflow-hidden p-1" style="border-color: ${themeColor}; background-color: ${themeColor}1A; background-image: none;">
              <img src="${meta.icon}" class="w-full h-full object-contain" alt="${classObj.class} icon" onerror="this.style.display='none'">
            </div>
            <span class="font-cinzel text-2xl font-bold tracking-wide" style="color: ${themeColor};">${classObj.class}</span>
          </div>
          <div class="px-4 pb-4">
            <p class="text-sm text-[#a0a0a5] leading-relaxed">${meta.desc}</p>
          </div>
        </button>`;
      }).join('');

      return `
        <section class="faction-group mb-8 last:mb-0" style="${paletteStyleVars(factionPalette)}">
          <h2 class="faction-title text-2xl font-cinzel font-bold tracking-wider pb-3 mb-4${index === 0 ? ' mt-6' : ''}">${factionData.faction}</h2>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            ${classCards}
          </div>
        </section>`;
    }).join('');
  },

  errorState() {
    return `
      <div class="text-center p-6 border border-[#7b1f32] rounded-sm max-w-md mx-auto mt-8 bg-[#2a0b12]">
        <p class="text-[#cba86a] font-cinzel font-semibold mb-1">Database Error Encountered</p>
        <p class="text-xs text-[#a0a0a5]">Ensure data.json matches the nested structure and is uploaded correctly.</p>
      </div>`;
  },

  formatMetadataValue(value, fallback) {
    if (value === null || value === undefined || value === '') {
      return fallback;
    }
    return value;
  },

  metadataCell(label, value, fallback = 'N/A') {
    const displayValue = this.formatMetadataValue(value, fallback);

    return `
      <div class="flex flex-col mb-2">
        <span class="text-[10px] uppercase tracking-widest text-[#8c734b]/70 font-semibold mb-[2px]">${label}</span>
        <span class="text-sm text-[#e0e0e0] leading-tight">${displayValue}</span>
      </div>`;
  },

  abilityCard({ name, summary, castSpeed, resourceDelta, range, baseValue, type, generativeIcon }) {
    const metadataBlock = `
      <div class="flex flex-col gap-1 mt-4">
        <div class="flex flex-col gap-2 border-b border-white/5 pb-2 mb-2">
          ${this.metadataCell('Cost', resourceDelta, 'None')}
          ${this.metadataCell('Value', baseValue, 'N/A')}
        </div>
        <div class="flex flex-wrap gap-x-6 gap-y-2">
          ${this.metadataCell('Cast', castSpeed, 'N/A')}
          ${this.metadataCell('Range', range, 'N/A')}
        </div>
      </div>`;

    return `
      <article class="ability-card p-0 m-1 relative overflow-hidden">
        <header class="card-header-bg flex items-center p-3">
          <div class="ability-icon hidden w-12 h-12 rounded-full flex items-center justify-center shrink-0 mr-4">
            ${getAbilityIcon(type, generativeIcon)}
          </div>
          <h3 class="text-xl text-[#e0e0e0] font-cinzel font-bold">${name}</h3>
        </header>
        <div class="p-4 text-sm text-[#cccccc] leading-relaxed">
          <div class="mt-1 mb-3">
            <span class="inline-block px-2 py-[2px] rounded text-[10px] uppercase tracking-wider font-bold bg-[#8c734b]/20 text-[#cba86a] border border-[#8c734b]/40">${type || 'Ability'}</span>
          </div>
          <p class="mb-3">${summary}</p>
          <hr class="border-t border-white/10 my-3">
          ${metadataBlock}
        </div>
      </article>`;
  },

  accordionItem({ treeName, cardsHtml, expanded, useClassTheme, palette, themeColor }) {
    const stickyClasses = 'sticky top-[var(--top-bar-height)] z-10';
    const interactiveClasses = 'transition-all duration-200 ease-in-out focus:outline-none';
    const btnClasses = expanded
      ? `accordion-btn active ${stickyClasses} ${interactiveClasses} w-full flex justify-between items-center px-4 py-3 rounded-t-sm`
      : `accordion-btn ${stickyClasses} ${interactiveClasses} w-full flex justify-between items-center px-4 py-3 rounded-sm`;
    const contentStyle = expanded ? 'max-height: 1000px;' : 'max-height: 0;';
    const itemPalette = useClassTheme ? getClassAbilityPalette(themeColor) : palette;

    return `
      <div class="accordion-item" style="${paletteStyleVars(itemPalette)}">
        <button type="button" aria-expanded="${expanded}" class="${btnClasses}">
          <span class="text-xl tree-title font-cinzel font-bold tracking-wider text-shadow">${treeName}</span>
          ${this.icons.chevron(expanded)}
        </button>
        <div class="accordion-content border-x border-b px-3 ${expanded ? 'py-4' : 'py-0'} grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4 rounded-b-sm" style="${contentStyle}">
          ${cardsHtml}
        </div>
      </div>`;
  }
};

function findClassData(className) {
  for (const factionNode of database) {
    const found = (factionNode.classes || []).find(c => c.class === className);
    if (found) return found;
  }
  return null;
}

function formatExportValue(value, fallback = 'N/A') {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }
  return value;
}

function extractCooldownFromSummary(summary) {
  if (!summary) return 'N/A';

  const match = summary.match(/(\d+\.?\d*s)\s*Cooldown/i);
  return match ? match[1] : 'N/A';
}

function formatAbilityForExport(name, data) {
  return [
    `Name: ${name}`,
    `Type: ${formatExportValue(data.type)}`,
    `Cost: ${formatExportValue(data.resource_delta, 'None')}`,
    `Cast Speed: ${formatExportValue(data.cast_speed)}`,
    `Cooldown: ${extractCooldownFromSummary(data.summary)}`,
    `Summary: ${formatExportValue(data.summary, 'No description provided.')}`
  ].join('\n');
}

function compileClassAbilitiesForExport(classData) {
  const sections = [];

  (classData.trees || []).forEach(tree => {
    const abilities = Object.entries(tree.abilities || {}).map(([name, data]) =>
      formatAbilityForExport(name, data)
    );

    if (abilities.length > 0) {
      sections.push(`## ${tree.name}\n\n${abilities.join('\n\n')}`);
    }
  });

  return sections.join('\n\n');
}

async function copyTextToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch (error) {
      // Fall through to legacy copy for mobile and permission-denied cases.
    }
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.left = '-999999px';
  textarea.style.top = '-999999px';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  try {
    const copied = document.execCommand('copy');
    if (!copied) {
      throw new Error('document.execCommand("copy") returned false');
    }
  } finally {
    document.body.removeChild(textarea);
  }
}

function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'fixed bottom-6 right-1/2 translate-x-1/2 sm:translate-x-0 sm:right-6 bg-[#1e1e24] text-[#cba86a] border border-[#8c734b] px-4 py-2 rounded shadow-xl z-[100] opacity-0 transition-opacity duration-300 pointer-events-none font-cinzel tracking-wide';
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.replace('opacity-0', 'opacity-100');
  }, 10);

  setTimeout(() => {
    toast.classList.replace('opacity-100', 'opacity-0');
  }, 2500);

  setTimeout(() => {
    toast.remove();
  }, 2800);
}

const EXPORT_AI_COPIED_ICON = '<svg class="w-4 h-4 export-ai-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>';

function buildClassExportPrompt(className, classData) {
  const abilityData = compileClassAbilitiesForExport(classData);

  return `Act as an expert MMORPG theorycrafter. I am playing the ${className} class. Below is my complete list of abilities and their resource costs, cast times, and effects. 
Analyze these abilities and provide:
1. A logical rotation or priority list for maximizing effectiveness.
2. How to manage the specific resource generation/spending loop for this class.
3. Synergies between abilities (e.g., applying a specific debuff before a high-damage execute).
Do NOT invent game mechanics, global cooldowns, or math formulas. Base your logic strictly on the text provided.
[INSERT ABILITY DATA HERE]`.replace('[INSERT ABILITY DATA HERE]', abilityData);
}

function abilityMatchesSearch(name, data, query) {
  if (!query) return true;

  const matchName = name.toLowerCase().includes(query);
  const matchType = data.type ? data.type.toLowerCase().includes(query) : false;
  const matchSummary = data.summary ? data.summary.toLowerCase().includes(query) : false;

  return matchName || matchType || matchSummary;
}

function mapAbilityToCardView(name, data) {
  return {
    name,
    summary: data.summary || 'No description provided.',
    castSpeed: data.cast_speed || null,
    resourceDelta: data.resource_delta || null,
    range: data.range || null,
    baseValue: data.base_value || null,
    type: data.type || null,
    generativeIcon: data.generative_icon || null
  };
}

function setupClassCardListeners(container) {
  container.querySelectorAll('[data-class-name]').forEach(card => {
    card.addEventListener('click', () => {
      selectClass(card.dataset.className);
    });
  });
}

const ACCORDION_HEIGHT_BUFFER = 24;
let accordionResizeObservers = [];

function disconnectAccordionObservers() {
  accordionResizeObservers.forEach(observer => observer.disconnect());
  accordionResizeObservers = [];
}

function setExpandedAccordionHeight(content) {
  content.style.paddingTop = '1rem';
  content.style.paddingBottom = '1rem';
  content.style.maxHeight = (content.scrollHeight + ACCORDION_HEIGHT_BUFFER) + 'px';
}

function attachAccordionResizeObserver(btn, content) {
  const observer = new ResizeObserver(() => {
    if (btn.classList.contains('active')) {
      content.style.maxHeight = (content.scrollHeight + ACCORDION_HEIGHT_BUFFER) + 'px';
    }
  });

  observer.observe(content);
  accordionResizeObservers.push(observer);
}

function initializeExpandedAccordions(container) {
  const expandActive = () => {
    container.querySelectorAll('.accordion-btn.active').forEach(btn => {
      setExpandedAccordionHeight(btn.nextElementSibling);
    });
  };

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(expandActive);
  } else {
    setTimeout(expandActive, 150);
  }
}

function setupAccordionListeners(container) {
  disconnectAccordionObservers();

  container.querySelectorAll('.accordion-btn').forEach(btn => {
    const content = btn.nextElementSibling;
    attachAccordionResizeObserver(btn, content);

    btn.addEventListener('click', function () {
      this.classList.toggle('active');

      const chevron = this.querySelector('.chevron');
      if (this.classList.contains('active')) {
        chevron.classList.add('rotate-180');
        this.setAttribute('aria-expanded', 'true');
      } else {
        chevron.classList.remove('rotate-180');
        this.setAttribute('aria-expanded', 'false');
      }

      if (content.style.maxHeight && content.style.maxHeight !== '0px') {
        content.style.maxHeight = '0px';
        content.style.paddingTop = '0px';
        content.style.paddingBottom = '0px';
      } else {
        setExpandedAccordionHeight(content);
      }
    });
  });
}

async function init() {
  try {
    const response = await fetch('./data.json?v=' + new Date().getTime());
    if (!response.ok) throw new Error('Failed to retrieve file data payload.');
    database = await response.json();

    if (elements.searchInput) elements.searchInput.disabled = true;
    if (elements.clearSearch) elements.clearSearch.disabled = true;

    setupTopBarHeightSync();
    populateClassDropdown();
    setupEventListeners();
    renderAbilities();
  } catch (error) {
    console.error('Database Initialization Fault:', error);
    elements.accordionContainer.innerHTML = UI.errorState();
  }
}

function syncTopBarHeight() {
  const topBar = document.querySelector('.top-bar');
  if (!topBar) return;
  document.documentElement.style.setProperty('--top-bar-height', `${topBar.offsetHeight}px`);
}

function setupTopBarHeightSync() {
  syncTopBarHeight();
  window.addEventListener('resize', syncTopBarHeight);

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(syncTopBarHeight);
  }
}

function populateClassDropdown() {
  elements.classSelect.innerHTML = '<option value="">Classes</option>';

  database.sort((a, b) => a.faction.localeCompare(b.faction)).forEach(factionData => {
    const optGroup = document.createElement('optgroup');
    optGroup.label = factionData.faction;

    const classNodes = factionData.classes || [];
    classNodes.sort((a, b) => a.class.localeCompare(b.class));

    classNodes.forEach(classObj => {
      const option = document.createElement('option');
      option.value = classObj.class;
      option.textContent = classObj.class;
      optGroup.appendChild(option);
    });

    elements.classSelect.appendChild(optGroup);
  });
}

function setupEventListeners() {
  elements.homeLogo.addEventListener('click', resetClassSelection);

  elements.classSelect.addEventListener('change', (e) => {
    if (e.target.value) {
      selectClass(e.target.value);
    } else {
      resetClassSelection();
    }
  });

  elements.searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.toLowerCase().trim();

    if (searchQuery.length > 0) {
      elements.clearSearch.classList.remove('hidden');
    } else {
      elements.clearSearch.classList.add('hidden');
    }

    renderAbilities();
  });

  elements.clearSearch.addEventListener('click', () => {
    searchQuery = '';
    elements.searchInput.value = '';
    elements.clearSearch.classList.add('hidden');
    elements.searchInput.focus();

    renderAbilities();
  });

  if (elements.exportAiBtn) {
    elements.exportAiBtn.addEventListener('click', async () => {
      if (!selectedClass) return;

      const btn = elements.exportAiBtn;
      const originalHtml = btn.innerHTML;

      const classData = findClassData(selectedClass);
      if (!classData || !classData.trees) return;

      const compiledText = buildClassExportPrompt(selectedClass, classData);

      try {
        await copyTextToClipboard(compiledText);
        btn.innerHTML = `${EXPORT_AI_COPIED_ICON}<span class="export-ai-label">Copied!</span>`;
        showToast('Class data copied to clipboard!');
        setTimeout(() => {
          btn.innerHTML = originalHtml;
        }, 2000);
      } catch (error) {
        console.error('Clipboard copy failed:', error);
      }
    });
  }
}

function clearContainerPalette() {
  elements.accordionContainer.removeAttribute('style');
}

function renderAbilities() {
  disconnectAccordionObservers();
  elements.accordionContainer.innerHTML = '';

  if (!selectedClass) {
    clearContainerPalette();
    hideActiveClassHero();
    const factions = [...database].sort((a, b) => a.faction.localeCompare(b.faction));
    elements.accordionContainer.innerHTML = UI.classSelectionGrid(factions);
    setupClassCardListeners(elements.accordionContainer);
    return;
  }

  clearContainerPalette();
  renderActiveClassHero(selectedClass);

  const classData = findClassData(selectedClass);
  if (!classData || !classData.trees) return;

  const classMeta = getClassMetadata(selectedClass);
  const { themeColor } = getClassThemeStyles(classMeta);
  const accordionHtml = [];
  let visibleTreeCount = 0;

  classData.trees.forEach((tree, treeIndex) => {
    const filteredAbilities = Object.entries(tree.abilities || {}).filter(([name, data]) =>
      abilityMatchesSearch(name, data, searchQuery)
    );

    if (filteredAbilities.length === 0) return;

    visibleTreeCount += 1;
    const useClassTheme = tree.name === CLASS_ABILITY_TREE;
    const expanded = Boolean(searchQuery) || (!useClassTheme && treeIndex === 0);
    const palette = getAccordionPalette(tree.name, selectedClass);

    const cardsHtml = filteredAbilities
      .map(([name, data]) => UI.abilityCard(mapAbilityToCardView(name, data)))
      .join('');

    accordionHtml.push(UI.accordionItem({
      treeName: tree.name,
      cardsHtml,
      expanded,
      useClassTheme,
      palette,
      themeColor
    }));
  });

  if (visibleTreeCount === 0) {
    elements.accordionContainer.innerHTML = UI.emptyState('No abilities match your search.');
    return;
  }

  elements.accordionContainer.innerHTML = accordionHtml.join('');
  setupAccordionListeners(elements.accordionContainer);
  initializeExpandedAccordions(elements.accordionContainer);
  syncTopBarHeight();
}

init();
