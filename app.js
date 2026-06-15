let database = [];
let selectedClass = '';
let searchQuery = '';

const elements = {
  classSelect: document.getElementById('class-select'),
  searchInput: document.getElementById('search-input'),
  clearSearch: document.getElementById('clear-search'),
  accordionContainer: document.getElementById('accordion-container')
};

// 1. Fetch JSON file payload using a relative path safe for GitHub Pages repositories
async function init() {
  try {
    const response = await fetch('./data.json');
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
        <p class="text-xs text-red-500">Ensure data.json is lowercase and uploaded to the root of your GitHub repository.</p>
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

    // Component wrapper generation - FIXED: Stripped structural borders here
    const treeEl = document.createElement('div');
    treeEl.className = 'border border-gray-700 rounded-lg overflow-hidden bg-gray-900 mb-4';

    const headerEl = document.createElement('button');
    headerEl.className = 'w-full text-left px-4 py-3 bg-gray-800 hover:bg-gray-700 text-white font-bold flex justify-between items-center focus:outline-none';
    headerEl.innerHTML = `
      <span>${tree.name}</span>
      <svg class="w-5 h-5 transition-transform duration-200 transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
      </svg>
    `;

    const contentEl = document.createElement('div');
    contentEl.className = 'p-4 flex flex-col gap-3 hidden'; // Closed by default

    // Toggle interaction listener
    headerEl.addEventListener('click', () => {
      contentEl.classList.toggle('hidden');
      headerEl.querySelector('svg').classList.toggle('rotate-180');
    });

    // Force disclosure expand panels automatically if a query filter exists
    if (searchQuery) {
      contentEl.classList.remove('hidden');
      headerEl.querySelector('svg').classList.add('rotate-180');
    }

    // Secondary card generator matching explicit property models - FIXED: Restored original card classes
    filteredAbilities.forEach(([name, data]) => {
      const card = document.createElement('div');
      card.className = 'bg-gray-800 border border-gray-700 p-4 rounded text-sm text-gray-300';
      
      // Clean up string conversions so raw null strings never inject to DOM
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
    elements.accordionContainer.innerHTML = '<p class="text-gray-500 italic">No abilities match your search.</p>';
  }
}

// Initialization execute loop call
init();
