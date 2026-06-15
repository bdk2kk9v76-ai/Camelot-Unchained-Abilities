let database = [];
let selectedClass = '';
let searchQuery = '';

const elements = {
  classSelect: document.getElementById('class-select'),
  searchInput: document.getElementById('search-input'),
  clearSearch: document.getElementById('clear-search'), // Added explicit hook for clear button
  accordionContainer: document.getElementById('accordion-container')
};

// 1. Fetch and initialize the data
async function init() {
  try {
    const response = await fetch('data.json');
    if (!response.ok) throw new Error('Network response was not ok');
    database = await response.json();
    
    populateClassDropdown();
    setupEventListeners();
  } catch (error) {
    console.error('Failed to load data:', error);
    elements.accordionContainer.innerHTML = `<p class="text-red-500">Error loading database. Check console.</p>`;
  }
}

// 2. Populate the Class Dropdown
function populateClassDropdown() {
  const classes = database.map(item => item.class).sort();
  
  classes.forEach(className => {
    const option = document.createElement('option');
    option.value = className;
    option.textContent = className;
    elements.classSelect.appendChild(option);
  });
}

// 3. Set up listeners for search, dropdown, and the clear button
function setupEventListeners() {
  
  // Class Dropdown Selection State Lifecycle
  elements.classSelect.addEventListener('change', (e) => {
    selectedClass = e.target.value;
    
    if (selectedClass) {
      // Step A: Target element is valid, activate search inputs
      elements.searchInput.disabled = false;
      elements.clearSearch.disabled = false;
      elements.searchInput.placeholder = "Search by name, type, or effect...";
    } else {
      // Step B: Reset to structural root state if choice is blanked out
      searchQuery = '';
      elements.searchInput.value = '';
      elements.searchInput.disabled = true;
      elements.clearSearch.disabled = true;
      elements.clearSearch.classList.add('hidden');
      elements.searchInput.placeholder = "Select a class first...";
    }
    
    renderAbilities();
  });

  // Dynamic Query Input Lifecycle
  elements.searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.toLowerCase().trim();
    
    // Manage visual state of the 'X' button container
    if (searchQuery.length > 0) {
      elements.clearSearch.classList.remove('hidden');
    } else {
      elements.clearSearch.classList.add('hidden');
    }
    
    renderAbilities();
  });

  // Clear Field Action Lifecycle
  elements.clearSearch.addEventListener('click', () => {
    searchQuery = '';
    elements.searchInput.value = '';
    elements.clearSearch.classList.add('hidden');
    elements.searchInput.focus();
    
    renderAbilities();
  });
}

// 4. Render the accordion and ability cards
function renderAbilities() {
  elements.accordionContainer.innerHTML = ''; // Clear container

  if (!selectedClass) {
    elements.accordionContainer.innerHTML = '<p class="text-center text-gray-500 italic mt-8">Please select a class to view abilities.</p>';
    return;
  }

  const classData = database.find(item => item.class === selectedClass);
  if (!classData) return;

  classData.trees.forEach(tree => {
    // Filter abilities based on search query
    const filteredAbilities = Object.entries(tree.abilities).filter(([name, data]) => {
      if (!searchQuery) return true;
      const matchName = name.toLowerCase().includes(searchQuery);
      const matchType = data.type ? data.type.toLowerCase().includes(searchQuery) : false;
      const matchSummary = data.summary ? data.summary.toLowerCase().includes(searchQuery) : false;
      return matchName || matchType || matchSummary;
    });

    // Skip rendering this tree if search filtered out all its abilities
    if (filteredAbilities.length === 0) return;

    // Create Tree Accordion Header
    const treeEl = document.createElement('div');
    treeEl.className = 'border border-gray-700 rounded-lg overflow-hidden bg-gray-900 mb-4';

    const headerEl = document.createElement('button');
    headerEl.className = 'w-full text-left px-4 py-3 bg-gray-800 hover:bg-gray-700 text-white font-bold flex justify-between items-center focus:outline-none';
    headerEl.innerHTML = `
      <span>${tree.name}</span>
      <svg class="w-5 h-5 transition-transform duration-200 transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
    `;

    const contentEl = document.createElement('div');
    contentEl.className = 'p-4 flex flex-col gap-3 hidden'; // Hidden by default

    // Toggle logic for accordion
    headerEl.addEventListener('click', () => {
      contentEl.classList.toggle('hidden');
      headerEl.querySelector('svg').classList.toggle('rotate-180');
    });

    // Force open if user is actively searching
    if (searchQuery) {
      contentEl.classList.remove('hidden');
      headerEl.querySelector('svg').classList.add('rotate-180');
    }

    // Populate Cards
    filteredAbilities.forEach(([name, data]) => {
      const card = document.createElement('div');
      card.className = 'bg-gray-800 border border-gray-700 p-4 rounded text-sm text-gray-300';
      
      const levelBadge = data.level !== null ? `<span class="bg-blue-900 text-blue-100 px-2 py-0.5 rounded text-xs font-bold mr-2">Lvl ${data.level}</span>` : '';
      
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

// Boot up
init();
