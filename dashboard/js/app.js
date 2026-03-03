// State
let schema = null;
let movements = [];
let selectedMovementId = null;

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
};

// Render movement list in sidebar
function renderMovementList() {
  const list = document.getElementById('movement-list');
  list.innerHTML = movements
    .map(
      (m) => `
    <div class="movement-item ${m.id === selectedMovementId ? 'active' : ''}"
         onclick="selectMovement('${m.id}')">
      <span>${m.name}</span>
      <span class="category-badge">${m.category}</span>
    </div>
  `
    )
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
