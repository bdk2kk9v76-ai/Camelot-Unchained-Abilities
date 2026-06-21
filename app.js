let database = [];
let classGuides = {};
let selectedClass = '';
let selectedClassView = 'abilities';
let searchQuery = '';
let activeFilter = '';

const elements = {
  homeLogo: document.getElementById('home-logo'),
  classNavRow: document.getElementById('class-nav-row'),
  activeClassHero: document.getElementById('active-class-hero'),
  classViewTabs: document.getElementById('class-view-tabs'),
  searchBarContainer: document.getElementById('search-bar-container'),
  searchInput: document.getElementById('search-input'),
  clearSearch: document.getElementById('clear-search'),
  exportAiBtn: document.getElementById('export-ai-btn'),
  filterContainer: document.getElementById('filter-container'),
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
  },
  'Red Cap': {
    accent: '#d42626',
    accentMuted: '#9a1a1a',
    headerFrom: '#452020',
    headerTo: '#2d1616',
    activeFrom: '#4a1212',
    activeTo: '#2a0808',
    contentBg: '#1a1414',
    cardHeaderFrom: '#4a1212',
    borderFrom: '#d42626',
    borderMid: '#9a1a1a',
    borderTo: '#4a2626',
    iconFrom: '#3a1818',
    iconTo: '#1a0c0c'
  },
  'Druid': {
    accent: '#3e9c4b',
    accentMuted: '#2a7040',
    headerFrom: '#284528',
    headerTo: '#1a2d1e',
    activeFrom: '#154a20',
    activeTo: '#0b2a10',
    contentBg: '#141a14',
    cardHeaderFrom: '#154a20',
    borderFrom: '#3e9c4b',
    borderMid: '#2a7040',
    borderTo: '#264a32',
    iconFrom: '#1f3a28',
    iconTo: '#0f1a14'
  }
};

function getFactionPalette(factionName) {
  return FACTION_PALETTES[factionName] || DEFAULT_TREE_PALETTE;
}

function getClassPalette(className) {
  return CLASS_PALETTES[className] || DEFAULT_TREE_PALETTE;
}

const CLASS_ABILITY_TREE = 'Class Abilities';

const CLASS_TREE_PALETTES = {
  'Blessed Crow': {
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
    }
  },
  'Dark Fool': {
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
    }
  },
  'Empath': {
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
    }
  },
  'Fianna': {
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
    }
  },
  'Forest Stalker': {
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
  },
  'Red Cap': {
    'Corrupted Blade': {
      accent: '#9858a8',
      accentMuted: '#684070',
      headerFrom: '#382840',
      headerTo: '#241830',
      activeFrom: '#401848',
      activeTo: '#240c28',
      contentBg: '#181418',
      cardHeaderFrom: '#401848',
      borderFrom: '#9858a8',
      borderMid: '#684070',
      borderTo: '#483048',
      iconFrom: '#281828',
      iconTo: '#140c14'
    },
    "Danu's Vengeance": {
      accent: '#c86848',
      accentMuted: '#884830',
      headerFrom: '#3a2018',
      headerTo: '#281410',
      activeFrom: '#4a2010',
      activeTo: '#2a1008',
      contentBg: '#1a1412',
      cardHeaderFrom: '#4a2010',
      borderFrom: '#c86848',
      borderMid: '#884830',
      borderTo: '#4a3020',
      iconFrom: '#321810',
      iconTo: '#1a0c08'
    },
    'Forest Walking': {
      accent: '#587878',
      accentMuted: '#385050',
      headerFrom: '#243030',
      headerTo: '#182020',
      activeFrom: '#183838',
      activeTo: '#0c2020',
      contentBg: '#121818',
      cardHeaderFrom: '#183838',
      borderFrom: '#587878',
      borderMid: '#385050',
      borderTo: '#304040',
      iconFrom: '#182828',
      iconTo: '#0c1414'
    }
  },
  'Druid': {
    'Voidcalling': {
      accent: '#7a58c8',
      accentMuted: '#503880',
      headerFrom: '#2a2040',
      headerTo: '#1a1430',
      activeFrom: '#301848',
      activeTo: '#180c28',
      contentBg: '#141218',
      cardHeaderFrom: '#301848',
      borderFrom: '#7a58c8',
      borderMid: '#503880',
      borderTo: '#382850',
      iconFrom: '#221830',
      iconTo: '#100c18'
    },
    'Earthshaping': {
      accent: '#a87848',
      accentMuted: '#705030',
      headerFrom: '#3a2818',
      headerTo: '#281810',
      activeFrom: '#4a3010',
      activeTo: '#2a1808',
      contentBg: '#1a1410',
      cardHeaderFrom: '#4a3010',
      borderFrom: '#a87848',
      borderMid: '#705030',
      borderTo: '#4a3820',
      iconFrom: '#322018',
      iconTo: '#1a1008'
    },
    'Natureweaving': {
      accent: '#58a868',
      accentMuted: '#387048',
      headerFrom: '#243828',
      headerTo: '#182820',
      activeFrom: '#1a4530',
      activeTo: '#0c2818',
      contentBg: '#121816',
      cardHeaderFrom: '#1a4530',
      borderFrom: '#58a868',
      borderMid: '#387048',
      borderTo: '#284830',
      iconFrom: '#1a3020',
      iconTo: '#0c1810'
    }
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

function getClassTreePalette(className, treeName) {
  return CLASS_TREE_PALETTES[className]?.[treeName] || DEFAULT_SPECIALIZED_TREE_PALETTE;
}

function getAccordionPalette(treeName, className) {
  if (treeName === CLASS_ABILITY_TREE) {
    return getClassPalette(className);
  }
  return getClassTreePalette(className, treeName);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const CLASS_VIEW_TABS = [
  { id: 'abilities', label: 'Abilities' },
  { id: 'guide', label: 'Guide' }
];

const ROLE_SECTION_LABELS = {
  healer: 'If Healer',
  damage: 'If Damage',
  tank: 'If Tank',
  caster: 'If Caster'
};

const ROLE_FIELD_LABELS = {
  healer: [
    ['primaryJob', 'Primary job'],
    ['positioning', 'Positioning'],
    ['triagePriority', 'Triage priority'],
    ['cleanseResponsibility', 'Cleanse responsibility'],
    ['battleRes', 'Battle-res'],
    ['doNot', 'What you do NOT do']
  ],
  damage: [
    ['primaryJob', 'Primary job'],
    ['positioning', 'Positioning'],
    ['focusFire', 'Focus fire'],
    ['peelResponsibility', 'Peel responsibility'],
    ['doNot', 'What you do NOT do']
  ],
  tank: [
    ['primaryJob', 'Primary job'],
    ['positioning', 'Positioning'],
    ['peelToolkit', 'Peel toolkit'],
    ['threatDenial', 'Threat denial'],
    ['doNot', 'What you do NOT do']
  ],
  caster: [
    ['primaryJob', 'Primary job'],
    ['positioning', 'Positioning'],
    ['castManagement', 'Cast management'],
    ['controlApplication', 'Control application'],
    ['doNot', 'What you do NOT do']
  ]
};

function classToSlug(className) {
  return className.toLowerCase().replace(/\s+/g, '-');
}

function findClassNameBySlug(slug) {
  if (!slug) return null;

  const normalized = slug.toLowerCase();
  for (const factionNode of database) {
    for (const classObj of factionNode.classes || []) {
      if (classToSlug(classObj.class) === normalized) {
        return classObj.class;
      }
    }
  }

  return null;
}

function getClassSlugFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get('class');
  if (fromQuery) return fromQuery;

  const hash = window.location.hash.replace(/^#\/?/, '');
  return hash || null;
}

function getClassViewFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('view') === 'guide' ? 'guide' : 'abilities';
}

function syncClassUrl(className) {
  const url = new URL(window.location.href);

  if (className) {
    url.searchParams.set('class', classToSlug(className));
    if (selectedClassView === 'guide') {
      url.searchParams.set('view', 'guide');
    } else {
      url.searchParams.delete('view');
    }
  } else {
    url.searchParams.delete('class');
    url.searchParams.delete('view');
  }

  url.hash = '';
  history.replaceState({ className: className || null, view: selectedClassView }, '', url);
}

function resolveClassFromUrl() {
  return findClassNameBySlug(getClassSlugFromUrl());
}

function setContextualToolbarVisible(visible) {
  const showToolbar = visible && selectedClassView === 'abilities';
  elements.searchBarContainer.classList.toggle('hidden', !showToolbar);
}

function renderClassViewTabs(className) {
  const tabsEl = elements.classViewTabs;
  if (!tabsEl) return;

  if (!className) {
    tabsEl.classList.add('hidden');
    tabsEl.innerHTML = '';
    return;
  }

  const { themeColor } = getClassThemeStyles(getClassMetadata(className));
  tabsEl.classList.remove('hidden');
  tabsEl.style.setProperty('--tab-accent', themeColor);
  tabsEl.innerHTML = `
    <nav class="flex gap-2" aria-label="Class sections">
      ${CLASS_VIEW_TABS.map(tab => `
        <button
          type="button"
          data-class-view="${tab.id}"
          class="class-view-tab px-5 py-2 rounded font-cinzel text-sm font-bold tracking-wider uppercase${selectedClassView === tab.id ? ' active' : ''}"
          aria-current="${selectedClassView === tab.id ? 'page' : 'false'}"
        >${tab.label}</button>
      `).join('')}
    </nav>`;
}

function selectClassView(view, { updateUrl = true } = {}) {
  if (!selectedClass) return;

  selectedClassView = view === 'guide' ? 'guide' : 'abilities';
  renderClassViewTabs(selectedClass);
  setContextualToolbarVisible(Boolean(selectedClass));
  if (updateUrl) syncClassUrl(selectedClass);
  renderClassView();
}

function getOrderedTreeNames(classData) {
  const trees = classData?.trees || [];
  const specTrees = trees
    .map(tree => tree.name)
    .filter(name => name !== CLASS_ABILITY_TREE)
    .sort((a, b) => a.localeCompare(b));

  return [...specTrees, CLASS_ABILITY_TREE];
}

function getClassFaction(className) {
  for (const factionNode of database) {
    if ((factionNode.classes || []).some(classObj => classObj.class === className)) {
      return factionNode.faction;
    }
  }
  return 'Tuatha Dé Danann';
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

function navClassCard(className, meta, isActive) {
  const themeColor = getClassThemeColor(meta);
  const themeTint = getClassThemeTint(meta);

  if (isActive) {
    return `
      <button type="button" data-class="${className}" class="class-nav-btn flex items-center gap-2 px-4 py-2 rounded transition-all duration-300 shrink-0 focus:outline-none text-white" style="border: 1px solid ${themeColor}; background-color: ${themeTint}; box-shadow: 0 0 12px ${themeColor}40;">
        <img src="${meta.icon || ''}" alt="" class="w-6 h-6 rounded object-cover shrink-0 border" style="border-color: ${themeColor};" onerror="this.style.display='none'"/>
        <span class="font-cinzel text-sm whitespace-nowrap tracking-wider font-bold" style="color: ${themeColor}; text-shadow: 0 0 8px ${themeColor}80;">${className}</span>
      </button>`;
  } else {
    return `
      <button type="button" data-class="${className}" class="class-nav-btn group flex items-center gap-2 px-4 py-2 rounded border border-[#8c734b]/30 bg-[#1e1e24]/80 text-[#a0a0a5] transition-all duration-300 shrink-0 focus:outline-none hover:text-white hover:border-[var(--hover-theme)] hover:bg-[var(--hover-tint)] hover:shadow-[0_0_12px_var(--hover-shadow)]" style="--hover-theme: ${themeColor}; --hover-tint: ${themeTint}; --hover-shadow: ${themeColor}40;">
        <img src="${meta.icon || ''}" alt="" class="w-6 h-6 rounded object-cover shrink-0 border border-white/10 transition-colors duration-300 group-hover:border-[var(--hover-theme)]" onerror="this.style.display='none'"/>
        <span class="font-cinzel text-sm whitespace-nowrap tracking-wider font-bold transition-colors duration-300 group-hover:text-[var(--hover-theme)]">${className}</span>
      </button>`;
  }
}

function renderClassNavRow(activeClassName) {
  const row = elements.classNavRow;
  if (!row) return;

  if (!activeClassName) {
    row.classList.add('hidden');
    row.innerHTML = '';
    return;
  }

  row.classList.remove('hidden');

  const cards = [];
  [...database].sort((a, b) => a.faction.localeCompare(b.faction)).forEach(factionData => {
    const classNodes = [...(factionData.classes || [])].sort((a, b) => a.class.localeCompare(b.class));
    classNodes.forEach(classObj => {
      const meta = getClassMetadata(classObj.class);
      cards.push(navClassCard(classObj.class, meta, classObj.class === activeClassName));
    });
  });

  row.innerHTML = cards.join('');
}

function selectClass(className, { updateUrl = true } = {}) {
  if (selectedClass !== className) {
    searchQuery = '';
    elements.searchInput.value = '';
    elements.clearSearch.classList.add('hidden');
  }

  selectedClass = className;
  activeFilter = '';
  renderClassNavRow(className);
  renderClassViewTabs(className);
  elements.searchInput.disabled = false;
  elements.clearSearch.disabled = false;
  elements.searchInput.placeholder = 'Search class abilities and metadata...';
  setContextualToolbarVisible(true);
  if (updateUrl) syncClassUrl(className);
  renderClassView();
}

function resetClassSelection({ updateUrl = true } = {}) {
  selectedClass = '';
  selectedClassView = 'abilities';
  searchQuery = '';
  activeFilter = '';
  renderClassNavRow('');
  renderClassViewTabs('');
  elements.searchInput.value = '';
  elements.searchInput.disabled = true;
  elements.clearSearch.disabled = true;
  elements.clearSearch.classList.add('hidden');
  elements.searchInput.placeholder = 'Search class abilities and metadata...';
  setContextualToolbarVisible(false);
  hideActiveClassHero();
  if (updateUrl) syncClassUrl('');
  renderClassView();
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

function getAbilityIcon(type, generativeIcon, iconPath) {
  if (iconPath) {
    return `<img src="${iconPath}" alt="" class="w-full h-full object-contain" loading="lazy" onerror="this.style.display='none'">`;
  }
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
        <a href="?class=${classToSlug(classObj.class)}" class="class-card no-underline overflow-hidden flex flex-col w-full text-left rounded-lg transition-all duration-200 ease-in-out focus:outline-none" style="${classThemeInlineStyle(themeColor, themeTint)} --tree-accent: ${themeColor}; --tree-accent-muted: ${themeColor};" data-class-name="${classObj.class}">
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
        </a>`;
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

  metadataCell(label, displayValue, fallback = 'N/A') {
    const value = this.formatMetadataValue(displayValue, fallback);

    return `
      <div class="flex flex-col mb-2">
        <span class="text-[10px] uppercase tracking-widest text-[#8c734b]/70 font-semibold mb-[2px]">${label}</span>
        <span class="text-sm text-[#e0e0e0] leading-tight">${value}</span>
      </div>`;
  },

  abilityCard({ name, summary, castSpeed, resourceDelta, range, baseValue, type, generativeIcon, icon, cooldown, parsedTypes, tags }) {
    const metadataBlock = `
      <div class="mt-auto flex flex-col">
        <hr class="border-t border-white/10 my-3">
        <div class="flex flex-col gap-1">
          <div class="flex flex-col gap-2 border-b border-white/5 pb-2 mb-2">
            ${this.metadataCell('Cost', resourceDelta, 'None')}
            ${this.metadataCell('Value', baseValue, 'N/A')}
          </div>
          <div class="flex flex-wrap gap-x-6 gap-y-2 border-b border-white/5 pb-2 mb-2">
            ${this.metadataCell('Cast', castSpeed, 'N/A')}
            ${this.metadataCell('Cooldown', cooldown, 'None')}
          </div>
          <div class="flex flex-col">
            ${this.metadataCell('Range', range, 'N/A')}
          </div>
        </div>
      </div>`;

    return `
      <article class="ability-card p-0 m-1 relative overflow-hidden flex flex-col h-full">
        <header class="card-header-bg flex items-center p-3">
          <div class="ability-icon w-12 h-12 rounded-full flex items-center justify-center shrink-0 mr-4 overflow-hidden p-1">
            ${getAbilityIcon(type, generativeIcon, icon)}
          </div>
          <h3 class="text-xl text-[#e0e0e0] font-cinzel font-bold">${name}</h3>
        </header>
        <div class="p-4 text-sm text-[#cccccc] leading-relaxed flex flex-col flex-1">
          <div class="flex flex-wrap gap-2 mt-1 mb-3">
            ${parsedTypes.map(t => `
              <span class="inline-block px-2 py-[2px] rounded text-[10px] uppercase tracking-wider font-bold bg-[#8c734b]/20 text-[#cba86a] border border-[#8c734b]/40">${t}</span>
            `).join('')}
            ${(tags || []).map(tag => `
              <span class="inline-block px-2 py-[2px] rounded text-[10px] uppercase tracking-wider font-bold bg-[#cba86a]/10 text-[#cba86a] border border-[#cba86a]/30">${tag}</span>
            `).join('')}
          </div>
          <p class="mb-3">${summary}</p>
          ${metadataBlock}
        </div>
      </article>`;
  },

  accordionItem({ treeName, treeIcon, cardsHtml, expanded, useClassTheme, palette, themeColor }) {
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
          <span class="flex items-center gap-3">
            ${treeIcon ? `<img src="${treeIcon}" alt="" class="w-8 h-8 rounded object-contain shrink-0" loading="lazy" onerror="this.style.display='none'">` : ''}
            <span class="text-xl tree-title font-cinzel font-bold tracking-wider text-shadow">${treeName}</span>
          </span>
          ${this.icons.chevron(expanded)}
        </button>
        <div class="accordion-content border-x border-b px-3 ${expanded ? 'py-4' : 'py-0'} grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4 rounded-b-sm" style="${contentStyle}">
          ${cardsHtml}
        </div>
      </div>`;
  },

  guideSection(title, introHtml, bodyHtml) {
    return `
      <section class="guide-section mb-8">
        <h3 class="guide-section-title font-cinzel text-xl font-bold tracking-wider pb-2 mb-4">${escapeHtml(title)}</h3>
        ${introHtml ? `<div class="guide-callout text-sm italic leading-relaxed px-4 py-3 mb-4 rounded-r">${introHtml}</div>` : ''}
        ${bodyHtml}
      </section>`;
  },

  guidePrincipleList(principles) {
    const items = (principles || []).map(item => `
      <li class="mb-3 leading-relaxed">
        <span class="guide-lead font-semibold">${escapeHtml(item.lead)}</span>
        ${item.body ? ` ${escapeHtml(item.body)}` : ''}
      </li>`).join('');

    return `<ul class="list-disc pl-5 space-y-1 text-[#cccccc]">${items}</ul>`;
  },

  guideAbilityList(items) {
    const rows = (items || []).map(item => `
      <li class="mb-2 leading-relaxed">
        <span class="guide-lead font-semibold">${escapeHtml(item.ability)}</span>
        ${item.detail ? ` — ${escapeHtml(item.detail)}` : ''}
      </li>`).join('');

    return `<ul class="list-disc pl-5 space-y-1 text-[#cccccc]">${rows}</ul>`;
  },

  guideRoleSection(roleType, role) {
    const fields = ROLE_FIELD_LABELS[roleType] || [];
    const items = fields.map(([key, label]) => {
      const value = role?.[key];
      if (!value) return '';
      return `<li class="mb-2 leading-relaxed"><span class="guide-lead font-semibold">${escapeHtml(label)}:</span> ${escapeHtml(value)}</li>`;
    }).join('');

    return this.guideSection(
      'Role in the Group',
      `Fill in the <strong>${escapeHtml(ROLE_SECTION_LABELS[roleType] || roleType)}</strong> block. This section defines what your teammates are counting on you to do — and what they are NOT.`,
      `<ul class="list-disc pl-5 space-y-1 text-[#cccccc]">${items}</ul>`
    );
  },

  guideQuickReference(quickRef) {
    const rows = [
      ['Pre-engage', quickRef.preEngage],
      ['Open', quickRef.open],
      ['Core loop', quickRef.coreLoop],
      ['Burst', quickRef.burst],
      ['Execute', quickRef.execute],
      ['Panic', quickRef.panic],
      ['Break soft CC', quickRef.breakSoftCc],
      ['Break hard CC', quickRef.breakHardCc],
      ['Peel', quickRef.peel]
    ];

    const list = rows.map(([label, value]) => `
      <li class="leading-relaxed">
        <span class="guide-lead font-semibold">${escapeHtml(label)}:</span> ${escapeHtml(value)}
      </li>`).join('');

    return this.guideSection(
      'Quick Reference',
      'The whole guide compressed to a glanceable cheat-sheet. No prose — just the sequences.',
      `<div class="guide-quick-ref rounded-lg p-4"><ul class="space-y-2 text-sm text-[#d0d0d5]">${list}</ul></div>`
    );
  },

  guidePage({ className, faction, trees, guide, themeColor }) {
    const treeLine = trees.join(' · ');
    const metaBlock = `
      <div class="guide-callout text-sm leading-relaxed px-4 py-4 mb-8 rounded-r space-y-2">
        <p><span class="guide-lead font-semibold">Faction:</span> ${escapeHtml(faction)}</p>
        <p><span class="guide-lead font-semibold">Trees:</span> ${escapeHtml(treeLine)}</p>
        <p><span class="guide-lead font-semibold">Resource:</span> ${escapeHtml(guide.resource)}</p>
        <p><span class="guide-lead font-semibold">Group Role:</span> ${escapeHtml(guide.groupRole)}</p>
        <p><span class="guide-lead font-semibold">One-line identity:</span> ${escapeHtml(guide.identity)}</p>
      </div>`;

    const resourceSection = this.guideSection(
      'Resource System',
      'Explain this class\'s resource(s) and the loop that drives everything.',
      `
        <p class="mb-4 leading-relaxed"><span class="guide-lead font-semibold">${escapeHtml(guide.resource)}:</span> ${escapeHtml(guide.resourceSystem.summary)}</p>
        <p class="guide-lead font-semibold mb-2">Generators / Builders</p>
        ${this.guideAbilityList(guide.resourceSystem.generators)}
        <p class="guide-lead font-semibold mt-4 mb-2">Spenders / Payoffs</p>
        ${this.guideAbilityList(guide.resourceSystem.spenders)}
        <p class="mt-4 leading-relaxed"><span class="guide-lead font-semibold">The loop:</span> ${escapeHtml(guide.resourceSystem.loop)}</p>
      `
    );

    const preEngageSection = this.guideSection(
      'Pre-Engage',
      'What to set up BEFORE contact. Defensive staging, buffs, auras, stealth positioning, cooldowns with a pre-window.',
      `
        ${this.guideAbilityList(guide.preEngage.items)}
        ${guide.preEngage.conditional ? `<p class="mt-4 leading-relaxed"><span class="guide-lead font-semibold">Conditional staging:</span> ${escapeHtml(guide.preEngage.conditional)}</p>` : ''}
        ${guide.preEngage.approachNotes ? `<p class="mt-4 leading-relaxed italic text-[#a0a0a5]">${escapeHtml(guide.preEngage.approachNotes)}</p>` : ''}
      `
    );

    const engageModes = (guide.engage.modes || []).map(mode => `
      <div class="mb-4">
        <p class="guide-lead font-semibold mb-2">${escapeHtml(mode.name)}</p>
        <ol class="list-decimal pl-5 space-y-1 text-[#cccccc]">
          ${(mode.steps || []).map((step, index) => `
            <li class="leading-relaxed">
              <span class="guide-lead font-semibold">${escapeHtml(step.ability)}</span>
              ${step.detail ? ` — ${escapeHtml(step.detail)}` : ''}
            </li>`).join('')}
        </ol>
      </div>`).join('');

    const engageSection = this.guideSection(
      'Engage / Opener',
      'The first 2–3 seconds. What you open with and the goal of the opening sequence.',
      `
        ${engageModes}
        <p class="mt-2 leading-relaxed"><span class="guide-lead font-semibold">Opener goal:</span> ${escapeHtml(guide.engage.goal)}</p>
      `
    );

    const rotationSection = this.guideSection(
      'Core Rotation',
      'The sustained loop once the fight is underway and the target is healthy (above ~50%).',
      `
        <p class="guide-lead font-semibold mb-2">Maintain</p>
        <ul class="list-disc pl-5 mb-4 text-[#cccccc]">${(guide.coreRotation.maintain || []).map(item => `<li class="mb-1">${escapeHtml(item)}</li>`).join('')}</ul>
        <p class="guide-lead font-semibold mb-2">Loop</p>
        <ul class="list-disc pl-5 mb-4 text-[#cccccc]">${(guide.coreRotation.loop || []).map(item => `<li class="mb-1">${escapeHtml(item)}</li>`).join('')}</ul>
        <p class="leading-relaxed"><span class="guide-lead font-semibold">Burst window / combo (~${escapeHtml(guide.coreRotation.burstWindow.cooldown)}):</span> ${escapeHtml(guide.coreRotation.burstWindow.combo)}</p>
      `
    );

    const executeSection = this.guideSection(
      'Burst / Execute Phase',
      'What changes when the target is low (below ~50%) or when your burst window is up.',
      `<ol class="list-decimal pl-5 space-y-2 text-[#cccccc]">
        ${(guide.burstExecute.steps || []).map(step => `
          <li class="leading-relaxed">
            <span class="guide-lead font-semibold">${escapeHtml(step.lead)}</span>
            ${step.body ? ` — ${escapeHtml(step.body)}` : ''}
          </li>`).join('')}
      </ol>`
    );

    const defensiveSection = this.guideSection(
      'Defensive Layer / Survival',
      'What to do when you\'re taking damage or dropping low.',
      `
        <p class="guide-lead font-semibold mb-2">Immediate response (fire together)</p>
        <ol class="list-decimal pl-5 mb-4 text-[#cccccc]">
          ${(guide.defensiveLayer.immediate || []).map((item, index) => `
            <li class="mb-1 leading-relaxed">
              <span class="guide-lead font-semibold">${escapeHtml(item.ability)}</span>
              ${item.detail ? ` — ${escapeHtml(item.detail)}` : ''}
            </li>`).join('')}
        </ol>
        <p class="guide-lead font-semibold mb-2">Reinforce / mitigate</p>
        <ul class="list-disc pl-5 mb-4 text-[#cccccc]">${(guide.defensiveLayer.reinforce || []).map(item => `<li class="mb-1">${escapeHtml(item)}</li>`).join('')}</ul>
        <p class="mb-4 leading-relaxed"><span class="guide-lead font-semibold">If still losing the exchange:</span> ${escapeHtml(guide.defensiveLayer.fallback)}</p>
        <p class="leading-relaxed"><span class="guide-lead font-semibold">The rule:</span> ${escapeHtml(guide.defensiveLayer.rule)}</p>
      `
    );

    const breakCcSection = this.guideSection(
      'Break CC',
      'How to respond when controlled. Map each break tool to the CC type it answers.',
      `
        <p class="guide-lead font-semibold mb-2">You are rooted/snared (soft CC)</p>
        ${this.guideAbilityList(guide.breakCc.softCc)}
        <p class="guide-lead font-semibold mt-4 mb-2">You are stunned/knocked (hard CC)</p>
        ${this.guideAbilityList(guide.breakCc.hardCc)}
        <p class="mt-4 leading-relaxed"><span class="guide-lead font-semibold">Priority rule:</span> ${escapeHtml(guide.breakCc.priorityRule)}</p>
        <p class="mt-2 leading-relaxed"><span class="guide-lead font-semibold">After breaking:</span> ${escapeHtml(guide.breakCc.afterBreaking)}</p>
      `
    );

    const peelSection = this.guideSection(
      'Peel / Protecting the Backline',
      'How this class defends its own support when a threat slips through.',
      `
        ${this.guideAbilityList(guide.peel.tools)}
        <p class="mt-4 leading-relaxed"><span class="guide-lead font-semibold">Peel priority:</span> ${escapeHtml(guide.peel.priority)}</p>
      `
    );

    const targetSection = this.guideSection(
      'Target Priority / Matchups',
      'Who this class should focus, who to avoid, and how to adjust against specific enemy roles.',
      `<p class="italic text-[#a0a0a5] leading-relaxed">${escapeHtml(guide.targetPriority)}</p>`
    );

    const mechanicsSection = (guide.classMechanics || []).length
      ? this.guideSection(
        'Class-Specific Mechanics',
        'Catch-all for anything unique that doesn\'t fit the standard sections.',
        `<ul class="list-disc pl-5 space-y-2 text-[#cccccc]">
          ${guide.classMechanics.map(item => `
            <li class="leading-relaxed">
              <span class="guide-lead font-semibold">${escapeHtml(item.name)}</span>
              ${item.detail ? ` — ${escapeHtml(item.detail)}` : ''}
            </li>`).join('')}
        </ul>`
      )
      : '';

    return `
      <article class="guide-panel rounded-lg p-6 md:p-8" style="--guide-accent: ${themeColor};">
        <header class="mb-6 pb-4 border-b border-[#8c734b]/30">
          <h2 class="font-cinzel text-2xl md:text-3xl font-bold tracking-wide mb-1" style="color: ${themeColor};">${escapeHtml(className)} — PvP Guide</h2>
        </header>
        ${metaBlock}
        ${this.guideSection(
          'Core Principles',
          'The rules that define how this class is played. If you remember nothing else, remember these.',
          this.guidePrincipleList(guide.corePrinciples)
        )}
        ${this.guideRoleSection(guide.roleType, guide.role)}
        ${resourceSection}
        ${preEngageSection}
        ${engageSection}
        ${rotationSection}
        ${executeSection}
        ${defensiveSection}
        ${breakCcSection}
        ${peelSection}
        ${targetSection}
        ${mechanicsSection}
        ${this.guideQuickReference(guide.quickReference)}
      </article>`;
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
  const matchesText = !query
    || name.toLowerCase().includes(query)
    || (data.type && data.type.toLowerCase().includes(query))
    || (data.summary && data.summary.toLowerCase().includes(query));

  if (!matchesText) return false;
  if (!activeFilter) return true;

  const parsedTypes = parseAbilityTypes(data);
  const tags = parseAbilityTagsFromSummary(data.summary);
  return [...parsedTypes, ...tags].includes(activeFilter);
}

function parseAbilityTagsFromSummary(summary) {
  let cleanSummary = summary || '';

  const cooldownMatch = cleanSummary.match(/(\d+(?:\.\d+)?s)\s+Cooldown\.?\s*/i);
  if (cooldownMatch) {
    cleanSummary = cleanSummary.replace(/(\d+(?:\.\d+)?s)\s+Cooldown\.?\s*/i, '').trim();
  }

  const tagMatch = cleanSummary.match(/\(([^)]+)\)\s*$/);
  if (!tagMatch) return [];

  return tagMatch[1].split(',').map(tag => tag.trim()).filter(Boolean);
}

function parseAbilityTypes(data) {
  return data.type
    ? data.type.replace(/[()]/g, '/').split('/').map(typePart => typePart.trim()).filter(Boolean)
    : ['Ability'];
}

function getAvailableFilters(classData) {
  const filters = new Set();

  (classData.trees || []).forEach(tree => {
    Object.values(tree.abilities || {}).forEach(ability => {
      parseAbilityTypes(ability).forEach(type => filters.add(type));
      parseAbilityTagsFromSummary(ability.summary).forEach(tag => filters.add(tag));
    });
  });

  return [...filters].sort((a, b) => a.localeCompare(b));
}

function renderFilters(classData) {
  const container = elements.filterContainer;
  if (!container) return;

  const filters = classData ? getAvailableFilters(classData) : [];

  if (!classData || filters.length === 0) {
    container.classList.add('hidden');
    container.innerHTML = '';
    return;
  }

  container.classList.remove('hidden');
  container.innerHTML = filters.map(filter => {
    const isActive = filter === activeFilter;
    const stateClasses = isActive
      ? 'bg-[#cba86a] text-[#121214] border-[#cba86a] shadow-[0_0_8px_rgba(203,168,106,0.4)]'
      : 'bg-[#1e1e24] text-[#a0a0a5] border-[#8c734b]/40 hover:border-[#cba86a]/60 hover:text-[#cba86a]';

    return `<button type="button" data-filter="${filter}" class="filter-btn px-3 py-1 rounded text-[10px] uppercase tracking-wider font-bold transition-all duration-200 cursor-pointer border focus:outline-none ${stateClasses}">${filter}</button>`;
  }).join('');
}

function mapAbilityToCardView(name, data) {
  let cleanSummary = data.summary || 'No description provided.';
  let cooldown = null;

  const cooldownMatch = cleanSummary.match(/(\d+(?:\.\d+)?s)\s+Cooldown\.?\s*/i);
  if (cooldownMatch) {
    cooldown = cooldownMatch[1];
    cleanSummary = cleanSummary.replace(/(\d+(?:\.\d+)?s)\s+Cooldown\.?\s*/i, '').trim();
  }

  const tags = parseAbilityTagsFromSummary(cleanSummary);
  if (tags.length > 0) {
    cleanSummary = cleanSummary.replace(/\(([^)]+)\)\s*$/, '').trim();
  }

  const parsedTypes = parseAbilityTypes(data);

  return {
    name,
    summary: cleanSummary,
    castSpeed: data.cast_speed || null,
    resourceDelta: data.resource_delta || null,
    range: data.range || null,
    baseValue: data.base_value || null,
    type: data.type || null,
    generativeIcon: data.generative_icon || null,
    icon: data.icon || null,
    cooldown,
    tags,
    parsedTypes
  };
}

function setupClassCardListeners(container) {
  container.querySelectorAll('[data-class-name]').forEach(card => {
    card.addEventListener('click', (e) => {
      e.preventDefault();
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
    const cacheBust = new Date().getTime();
    const [dataResponse, guidesResponse] = await Promise.all([
      fetch('./data.json?v=' + cacheBust),
      fetch('./class-guides.json?v=' + cacheBust)
    ]);

    if (!dataResponse.ok) throw new Error('Failed to retrieve file data payload.');
    database = await dataResponse.json();
    classGuides = guidesResponse.ok ? await guidesResponse.json() : {};

    if (elements.searchInput) elements.searchInput.disabled = true;
    if (elements.clearSearch) elements.clearSearch.disabled = true;

    setupTopBarHeightSync();
    setupEventListeners();

    selectedClassView = getClassViewFromUrl();
    const urlClass = resolveClassFromUrl();
    if (urlClass) {
      selectClass(urlClass, { updateUrl: false });
    } else {
      renderClassView();
    }
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

function setupEventListeners() {
  elements.homeLogo.addEventListener('click', resetClassSelection);

  window.addEventListener('popstate', () => {
    selectedClassView = getClassViewFromUrl();
    const urlClass = resolveClassFromUrl();
    if (urlClass) {
      selectClass(urlClass, { updateUrl: false });
      return;
    }

    resetClassSelection({ updateUrl: false });
  });

  if (elements.classViewTabs) {
    elements.classViewTabs.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-class-view]');
      if (!btn) return;
      selectClassView(btn.dataset.classView);
    });
  }

  elements.classNavRow.addEventListener('click', (e) => {
    const btn = e.target.closest('.class-nav-btn');
    if (!btn) return;

    const className = btn.dataset.class;
    if (!className) return;

    selectClass(className);

    const activeBtn = elements.classNavRow.querySelector(`[data-class="${CSS.escape(className)}"]`);
    if (activeBtn) {
      activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
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

  elements.filterContainer.addEventListener('click', (e) => {
    const btn = e.target.closest('.filter-btn');
    if (!btn) return;

    const filter = btn.dataset.filter;
    if (!filter) return;

    activeFilter = filter === activeFilter ? '' : filter;
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

function renderClassView() {
  if (!selectedClass) {
    renderClassHome();
    return;
  }

  if (selectedClassView === 'guide') {
    renderGuideView();
    return;
  }

  renderAbilitiesView();
}

function renderClassHome() {
  disconnectAccordionObservers();
  elements.accordionContainer.innerHTML = '';
  clearContainerPalette();
  hideActiveClassHero();
  renderClassViewTabs('');
  renderFilters(null);
  const factions = [...database].sort((a, b) => a.faction.localeCompare(b.faction));
  elements.accordionContainer.innerHTML = UI.classSelectionGrid(factions);
  setupClassCardListeners(elements.accordionContainer);
}

function renderGuideView() {
  disconnectAccordionObservers();
  clearContainerPalette();
  renderActiveClassHero(selectedClass);

  const classData = findClassData(selectedClass);
  const guide = classGuides[selectedClass];
  if (!classData || !guide) {
    elements.accordionContainer.innerHTML = UI.emptyState('Guide not available for this class yet.');
    return;
  }

  const classMeta = getClassMetadata(selectedClass);
  const { themeColor } = getClassThemeStyles(classMeta);

  elements.accordionContainer.innerHTML = UI.guidePage({
    className: selectedClass,
    faction: getClassFaction(selectedClass),
    trees: getOrderedTreeNames(classData),
    guide,
    themeColor
  });
  syncTopBarHeight();
}

function renderAbilitiesView() {
  disconnectAccordionObservers();
  elements.accordionContainer.innerHTML = '';
  clearContainerPalette();
  renderActiveClassHero(selectedClass);

  const classData = findClassData(selectedClass);
  if (!classData || !classData.trees) return;

  renderFilters(classData);

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
    const expanded = Boolean(searchQuery) || Boolean(activeFilter) || (!useClassTheme && treeIndex === 0);
    const palette = getAccordionPalette(tree.name, selectedClass);

    const cardsHtml = filteredAbilities
      .map(([name, data]) => UI.abilityCard(mapAbilityToCardView(name, data)))
      .join('');

    accordionHtml.push(UI.accordionItem({
      treeName: tree.name,
      treeIcon: tree.icon || null,
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

function renderAbilities() {
  renderClassView();
}

init();
