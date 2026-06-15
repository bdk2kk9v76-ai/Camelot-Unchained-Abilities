let database = [];
let selectedClass = '';
let searchQuery = '';

const elements = {
  classSelect: document.getElementById('class-select'),
  searchInput: document.getElementById('search-input'),
  clearSearch: document.getElementById('clear-search'),
  accordionContainer: document.getElementById('accordion-container')
};

// 1. Fetch JSON file using explicit relative notation safe for GitHub Pages
async function init() {
  try {
    const response = await fetch('./data.json');
    if (!response.ok) throw new Error('Failed to retrieve file data payload.');
    database = await response.json();
    
    if (elements.searchInput) elements.searchInput.disabled = true;
    if (elements.clearSearch) elements.clearSearch.disabled = true;
    
    populateClassDropdown();
    setupEventListeners();
  } catch (error) {
    console.error('Database Initialization Fault:', error);
    elements.accordionContainer.innerHTML = `
      <div class="text-center p-6 bg-red-950/30 border border-red-900 rounded-lg max-w-md mx-auto mt-8">
        <p class="text-red-400 font-semibold mb-1">Database Error Encountered</p>
        <p class="text-xs text-red-500">Ensure data.json matches the new nested structure and is uploaded correctly.</p>
      </div>`;
  }
}

// 2. Map Parent Factions out to Dropdown Optgroups with child Class options
function populateClassDropdown() {
  elements.classSelect.innerHTML = '<option value="">Choose a Class...</option>';

  // Sort Factions Alphabetically
  database.sort((a, b) => a.faction.localeCompare(b.faction)).forEach(factionData => {
    const optGroup = document.createElement('optgroup');
    optGroup.label = factionData.faction;

    // Isolate and sort child classes under the faction parent node
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

// 3. Setup central lifecycle event listeners
function setupEventListeners() {
  
  elements.classSelect.addEventListener('change', (e) => {
    selectedClass = e.target.value;
    
    if (selectedClass) {
      elements.searchInput.disabled = false;
      elements.clearSearch.disabled = false;
      elements.searchInput.placeholder = "Search by name, type, or effect...";
    } else {
      searchQuery = '';
      elements.searchInput.value = '';
      elements.searchInput.disabled = true;
      elements.clearSearch.disabled = true;
      elements.clearSearch.classList.add('hidden');
      elements.searchInput.placeholder = "Select a class first...";
    }
    
    renderAbilities();
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
}

// 4. Layered Extraction Render (Faction > Class > Tree > Ability > Metadata)
// Maintains flat design without the visual border wrapper styling on ability elements
function renderAbilities() {
  elements.accordionContainer.innerHTML = ''; 

  if (!selectedClass) {
    elements.accordionContainer.innerHTML = '<p class="text-center text-gray-500 italic mt-8">Please select a class to view abilities.</p>';
    return;
  }

  // Scan parent factions down to isolate target class node
  let classData = null;
  for (const factionNode of database) {
    const found = factionNode.classes.find(c => c.class === selectedClass);
    if (found) {
      classData = found;
      break;
    }
  }
  
  if (!classData || !classData.trees) return;

  classData.trees.forEach(tree => {
    const filteredAbilities = Object.entries(tree.abilities || {}).filter(([name, data]) => {
      if (!searchQuery) return true;
      
      const matchName = name.toLowerCase().includes(searchQuery);
      const matchType = data.type ? data.type.toLowerCase().includes(searchQuery) : false;
      const matchSummary = data.summary ? data.summary.toLowerCase().includes(searchQuery) : false;
      
      return matchName || matchType || matchSummary;
    });

    if (filteredAbilities.length === 0) return;

    // Outer Accordion element
    const treeEl = document.createElement('div');
    treeEl.className = 'border border-gray-700 rounded-lg overflow-hidden bg-gray-900 mb-4';

    const headerEl = document.createElement('button');
    headerEl.className = 'w-full text-left px-4 py-3 bg-gray-800 hover:bg-gray-700 text-white font-bold flex justify-between items-center focus:outline-none';
    headerEl.innerHTML = `
      <span>${tree.name}</span>
      <svg class="w-5 h-5 transition-transform duration-200 transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
    `;

    const contentEl = document.createElement('div');
    contentEl.className = 'p-4 flex flex-col gap-3 hidden';

    headerEl.addEventListener('click', () => {
      contentEl.classList.toggle('hidden');
      headerEl.querySelector('svg').classList.toggle('rotate-180');
    });

    if (searchQuery) {
      contentEl.classList.remove('hidden');
      headerEl.querySelector('svg').classList.add('rotate-180');
    }

    // Granular capability cards matching flat border aesthetic
    filteredAbilities.forEach(([name, data]) => {
      const card = document.createElement('div');
      card.className = 'bg-gray-800 border border-gray-700 p-4 rounded text-sm text-gray-300';
      
      const levelBadge = (data.level !== null && data.level !== undefined) 
        ? `<span class="bg-blue-900 text-blue-100 px-2 py-0.5 rounded text-xs font-bold mr-2">Lvl ${data.level}</span>` 
        : '';
      
      card.innerHTML = `
        <div class="flex justify-between items-start mb-2">
          <h3 class="text-lg font-bold text-white">${levelBadge}${name}</h3>
          <span class="bg-gray-700 text-gray-200 px-2 py-1 rounded text-xs">${data.type || 'Ability'}</span>
        </div>
        <p class="mb-3 text-gray-400 italic">${data.summary || 'No description provided.'}</p>
        <div class="grid grid-cols-2 gap-2 text-xs">
          <div><strong class="text-gray-500">Cast:</strong> ${data.cast_speed || 'N/A'}</div>
          <div><strong class="text-gray-500">Range:</strong> ${data.range || 'N/A'}</div>
          <div><strong class="text-gray-500">Base Value:</strong> <span class="text-red-400">${data.base_value || 'N/A'}</span></div>
          <div><strong class="text-gray-500">Resource:</strong> <span class="text-green-400">${data.resource_delta || 'N/A'}</span></div>
        </div>
      `;
      contentEl.appendChild(card);
    });

    treeEl.appendChild(headerEl);
    treeEl.appendChild(contentEl);
    elements.accordionContainer.appendChild(treeEl);
  });

  if (elements.accordionContainer.innerHTML === '') {
    elements.accordionContainer.innerHTML = '<p class="text-center text-gray-500 italic mt-8">No abilities match your search.</p>';
  }
}

init();
