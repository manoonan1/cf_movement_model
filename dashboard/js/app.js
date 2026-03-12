// State
let schema = null;
let movements = [];
let selectedMovementId = null;
let currentView = 'editor';

// Category color map
const CATEGORY_COLORS = {
  Gymnastics: { bg: '#8b5cf620', border: '#8b5cf6', text: '#8b5cf6' },
  Weightlifting: { bg: '#f59e0b20', border: '#f59e0b', text: '#f59e0b' },
  Monostructural: { bg: '#06b6d420', border: '#06b6d4', text: '#06b6d4' },
};

function getCategoryColor(category) {
  return CATEGORY_COLORS[category] || { bg: 'var(--bg-primary)', border: 'var(--border)', text: 'var(--text-secondary)' };
}

// View switching
function switchView(view) {
  currentView = view;
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.dataset.view === view));
  document.querySelectorAll('.view').forEach((v) => (v.style.display = 'none'));
  document.getElementById('view-' + view).style.display = '';

  if (view === 'stats') renderStatsView();
  if (view === 'audit') renderAuditView();
}

// API client
const api = {
  async getMovements(params = {}) {
    const query = new URLSearchParams(params).toString();
    const url = '/api/movements' + (query ? '?' + query : '');
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch movements');
    return res.json();
  },

  async getMovement(id) {
    const res = await fetch(`/api/movements/${encodeURIComponent(id)}`);
    if (!res.ok) throw new Error('Failed to fetch movement');
    return res.json();
  },

  async createMovement(data) {
    const res = await fetch('/api/movements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to create movement');
    }
    return res.json();
  },

  async updateMovement(id, data) {
    const res = await fetch(`/api/movements/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update movement');
    return res.json();
  },

  async deleteMovement(id) {
    const res = await fetch(`/api/movements/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete movement');
  },

  async getSchema() {
    const res = await fetch('/api/schema');
    if (!res.ok) throw new Error('Failed to fetch schema');
    return res.json();
  },

  async bulkImport(movementsList) {
    const res = await fetch('/api/movements/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ movements: movementsList }),
    });
    if (!res.ok) throw new Error('Failed to bulk import');
    return res.json();
  },

  async verifyMovements() {
    const res = await fetch('/api/movements/verify');
    if (!res.ok) throw new Error('Failed to verify movements');
    return res.json();
  },
};

// Render movement list in sidebar (with search filter)
function renderMovementList() {
  const list = document.getElementById('movement-list');
  const searchInput = document.getElementById('search-input');
  const searchText = searchInput ? searchInput.value.toLowerCase() : '';

  const filtered = movements.filter((m) => {
    if (!searchText) return true;
    return (
      m.name.toLowerCase().includes(searchText) ||
      m.category.toLowerCase().includes(searchText)
    );
  });

  list.innerHTML = filtered
    .map((m) => {
      const colors = getCategoryColor(m.category);
      return `
    <div class="movement-item ${m.id === selectedMovementId ? 'active' : ''}"
         style="${m.id !== selectedMovementId ? `border-left: 3px solid ${colors.border}` : ''}"
         onclick="selectMovement('${m.id}')">
      <span>${m.name}</span>
      <span class="category-badge" style="background:${colors.bg};color:${colors.text};border:1px solid ${colors.border}">${m.category}</span>
    </div>
  `;
    })
    .join('');
}

// Select a movement to edit
function selectMovement(id) {
  selectedMovementId = id;
  renderMovementList();
  renderEditor();
}

// Toast utility
function showToast(message, isError = false) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = 'toast show' + (isError ? ' error' : '');
  setTimeout(() => (toast.className = 'toast'), 3000);
}

// Refresh movements from API
async function refreshMovements() {
  try {
    movements = await api.getMovements();
    renderMovementList();
    if (selectedMovementId) {
      renderEditor();
    }
    showToast('Movements refreshed');
  } catch (err) {
    showToast('Failed to refresh: ' + err.message, true);
  }
}

// Initialize app
async function init() {
  try {
    schema = await api.getSchema();
    movements = await api.getMovements();
    renderMovementList();
  } catch (err) {
    showToast('Failed to load data: ' + err.message, true);
  }
}

// Format label utility
function formatLabel(name) {
  return name.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

// Start
init();
