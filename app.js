let database = [];
let selectedClass = '';
let searchQuery = '';

const elements = {
  classSelect: document.getElementById('class-select'),
  searchInput: document.getElementById('search-input'),
  clearSearch: document.getElementById('clear-search'),
  accordionContainer: document.getElementById('accordion-container')
};

// 1. Fetch JSON file payload and establish interface boundaries
async function init() {
  try {
    const response = await fetch('data.json');
    if (!response.ok) throw new Error('Failed to retrieve file array data payload.');
    database = await response.json();
    
    // Explicit safety layer forcing attributes down if DOM elements load ahead of completion
    if (elements.searchInput) elements.searchInput.disabled = true;
    if (elements.clearSearch) elements.clearSearch.disabled = true;
    
    populateClassDropdown();
    setupEventListeners();
  } catch (error) {
    console.error('Database Initialization Fault:', error);
    elements.accordionContainer.innerHTML = `
      <div class="text-center p-6 bg-red-950/30 border border-red-900 rounded-lg max-w-md mx-auto mt-8">
        <p class="text-red-400 font-semibold mb-1">Database Error Encountered</p>
        <p class="text-xs text-red-500">Ensure the site is running via a local web server (e.g., Live Server or python http.server).</p>
      </div>`;
  }
}

// 2. Map structural Class titles out to select choice elements
function populateClassDropdown() {
  const classes = database.map(item => item.class).sort();
  
  classes.forEach(className => {
    const option = document.createElement('option');
    option.value = className;
    option.textContent = className;
    elements.classSelect.appendChild(option);
  });
}

// 3. Central Event Dispatcher configuration
function setupEventListeners() {
  
  // Choice Lifecycle monitoring
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

  // User input scanning routine
  elements.searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.toLowerCase().trim();
    
    if (searchQuery.length > 0) {
      elements.clearSearch.classList.remove('hidden');
    } else {
      elements.clearSearch.classList.add('hidden');
    }
    
    renderAbilities();
  });

  // Action Reset management onClick
  elements.clearSearch.addEventListener('click', () => {
    searchQuery = '';
    elements.searchInput.value = '';
    elements.clearSearch.classList.add('hidden');
    elements.searchInput.focus();
    
    renderAbilities();
  });
}

// 4. Data Extraction Template engine loop
function renderAbilities() {
  elements.accordionContainer.innerHTML = ''; 

  if (!selectedClass) {
    elements.accordionContainer.innerHTML = '<p class="text-center text-gray-500 italic mt-8">Please select a class to view abilities.</p>';
    return;
  }

  const classData = database.find(item => item.class === selectedClass);
  if (!classData) return;

  classData.trees.forEach(tree => {
    // Process Object.entries list to strip name strings away from values smoothly
    const filteredAbilities = Object.entries(tree.abilities).filter(([name, data]) => {
      if (!searchQuery) return true;
      
      const matchName = name.toLowerCase().includes(searchQuery);
      const matchType = data.type ? data.type.toLowerCase().includes(searchQuery) : false;
      const matchSummary = data.summary ? data.summary.toLowerCase().includes(searchQuery) : false;
      
      return matchName || matchType || matchSummary;
    });

    if (filteredAbilities.length === 0) return;

    // Component wrapper generation
    const treeEl = document.createElement('div');
    treeEl.className = 'border border-gray-800 rounded-xl overflow-hidden bg-gray-900 mb-4 shadow-md transition-all duration-200';

    const headerEl = document.createElement('button');
    headerEl.className = 'w-full text-left px-5 py-3.5 bg-gray-900 hover:bg-gray-800/60 text-white font-bold flex justify-between items-center focus:outline-none transition-colors border-b border-gray-800';
    headerEl.innerHTML = `
      <span class="tracking-wide text-sm font-semibold uppercase text-gray-300">${tree.name}</span>
      <svg class="w-4 h-4 text-gray-400 transition-transform duration-200 transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"></path>
      </svg>
    `;

    const contentEl = document.createElement('div');
    contentEl.className = 'p-4 flex flex-col gap-4 hidden bg-gray-950/40';

    // Toggle interaction listener
    headerEl.addEventListener('click', () => {
      contentEl.classList.toggle('hidden');
      headerEl.querySelector('svg').classList.toggle('rotate-180');
    });

    // Auto expansion condition if search context matches records inside
    if (searchQuery) {
      contentEl.classList.remove('hidden');
      headerEl.querySelector('svg').classList.add('rotate-180');
    }

    // Secondary card generator matching explicit property models
    filteredAbilities.forEach(([name, data]) => {
      const card = document.createElement('div');
      card.className = 'bg-gray-900 border border-gray-800 p-4 rounded-lg shadow-sm flex flex-col gap-2 transition-all hover:border-gray-700';
      
      // Clean up string conversions so raw null strings never inject to DOM
      const levelBadge = (data.level !== null && data.level !== undefined) 
        ? `<span class="bg-blue-950 border border-blue-800 text-blue-400 px-2 py-0.5 rounded text-xs font-bold mr-2">Lvl ${data.level}</span>` 
        : '';
      
      card.innerHTML = `
        <div class="flex justify-between items-start gap-4">
          <h3 class="text-base font-bold text-white flex items-center">${levelBadge}${name}</h3>
          <span class="bg-gray-800 border border-gray-700 text-gray-300 px-2 py-0.5 rounded text-xs whitespace-nowrap font-medium">${data.type || 'Ability'}</span>
        </div>
        <p class="text-sm text-gray-400 leading-relaxed bg-gray-950/30 p-2.5 rounded border border-gray-850 italic">${data.summary || 'No description provided.'}</p>
        <div class="grid grid-cols-2 gap-x-4 gap-y-2 text-xs pt-1 border-t border-gray-850 text-gray-400">
          <div class="flex justify-between py-0.5 border-b border-gray-850/40"><strong class="text-gray-500 font-medium">Cast:</strong> <span>${data.cast_speed || 'N/A'}</span></div>
          <div class="flex justify-between py-0.5 border-b border-gray-850/40"><strong class="text-gray-500 font-medium">Range:</strong> <span>${data.range || 'N/A'}</span></div>
          <div class="flex justify-between py-0.5"><strong class="text-gray-500 font-medium">Base Value:</strong> <span class="text-red-400 font-medium truncate max-w-[120px] text-right">${data.base_value || 'N/A'}</span></div>
          <div class="flex justify-between py-0.5"><strong class="text-gray-500 font-medium">Resource:</strong> <span class="text-green-400 font-medium text-right">${data.resource_delta || 'None'}</span></div>
        </div>
      `;
      contentEl.appendChild(card);
    });

    treeEl.appendChild(headerEl);
    treeEl.appendChild(contentEl);
    elements.accordionContainer.appendChild(treeEl);
  });

  if (elements.accordionContainer.innerHTML === '') {
    elements.accordionContainer.innerHTML = '<p class="text-center text-gray-500 italic mt-8">No abilities match your search query.</p>';
  }
}

// Initialization execute loop call
init();
