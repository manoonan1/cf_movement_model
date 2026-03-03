// Editor logic, CRUD handlers, update handlers

function renderEditor() {
  const main = document.getElementById('main-content');
  const movement = movements.find((m) => m.id === selectedMovementId);

  if (!movement) {
    main.innerHTML = `
      <div class="empty-state">
        <h3>No movement selected</h3>
        <p>Select a movement from the list or add a new one</p>
      </div>
    `;
    return;
  }

  const props = schema.properties;
  let html = `
    <div class="editor-header">
      <h2>${movement.name || 'New Movement'}</h2>
      <button class="btn btn-danger" onclick="deleteMovement('${movement.id}')">Delete</button>
    </div>
    <div class="form-grid">
  `;

  // Core fields
  html += renderTextField('id', props.id, movement.id);
  html += renderTextField('name', props.name, movement.name);
  html += renderTextArea('description', props.description, movement.description || '');
  html += renderSelect('category', props.category, movement.category);

  // Movement patterns (checkbox group)
  html += renderCheckboxGroup(
    'movement_patterns',
    props.movement_patterns,
    movement.movement_patterns || []
  );

  // Equipment (tag input)
  html += renderTagInput('equipment', props.equipment, movement.equipment || []);

  // Muscle groups
  html += renderCheckboxGroup(
    'muscle_groups',
    props.muscle_groups,
    movement.muscle_groups || []
  );

  // Movement family
  html += renderCheckboxGroup(
    'movement_family',
    props.movement_family,
    movement.movement_family || []
  );

  // Numeric values
  html += renderRange('difficulty', props.difficulty, movement.difficulty);

  // Energy type (radio)
  html += renderRadio('energy_type', props.energy_type, movement.energy_type);
  html += renderRange('energy_cost', props.energy_cost, movement.energy_cost);

  // Relationships section
  html += `<div class="section-divider"><h3>Relationships</h3></div>`;
  html += renderRelationshipSelect(
    'variations',
    props.variations,
    movement.variations || []
  );
  html += renderRelationshipSelect(
    'progressions',
    props.progressions,
    movement.progressions || []
  );
  html += renderRelationshipSelect(
    'regressions',
    props.regressions,
    movement.regressions || []
  );

  html += '</div>';
  main.innerHTML = html;
}

// Auto-save helper: PUTs the current movement to the API
async function saveCurrentMovement() {
  const movement = movements.find((m) => m.id === selectedMovementId);
  if (!movement) return;

  try {
    await api.updateMovement(movement.id, movement);
  } catch (err) {
    showToast('Failed to save: ' + err.message, true);
  }
}

// Update handlers
function updateField(name, value) {
  const movement = movements.find((m) => m.id === selectedMovementId);
  if (!movement) return;

  // Handle ID change specially — not supported via PUT (ID is PK)
  if (name === 'id') {
    showToast('ID cannot be changed after creation', true);
    renderEditor();
    return;
  }

  movement[name] = value;
  renderMovementList();
  if (name === 'name') renderEditor();
  saveCurrentMovement();
}

function updateRange(name, value) {
  const numValue = parseFloat(value);
  const movement = movements.find((m) => m.id === selectedMovementId);
  if (!movement) return;

  movement[name] = numValue;
  document.getElementById(`${name}-value`).textContent = numValue.toFixed(2);
  saveCurrentMovement();
}

function toggleArrayItem(name, value) {
  const movement = movements.find((m) => m.id === selectedMovementId);
  if (!movement) return;

  if (!movement[name]) movement[name] = [];

  const idx = movement[name].indexOf(value);
  if (idx === -1) {
    movement[name].push(value);
  } else {
    movement[name].splice(idx, 1);
  }

  renderEditor();
  saveCurrentMovement();
}

function removeArrayItem(name, value) {
  const movement = movements.find((m) => m.id === selectedMovementId);
  if (!movement || !movement[name]) return;

  const idx = movement[name].indexOf(value);
  if (idx !== -1) {
    movement[name].splice(idx, 1);
  }

  renderEditor();
  saveCurrentMovement();
}

function handleTagInput(event, name) {
  if (event.key !== 'Enter') return;
  event.preventDefault();

  const value = event.target.value.trim();
  if (!value) return;

  const movement = movements.find((m) => m.id === selectedMovementId);
  if (!movement) return;

  if (!movement[name]) movement[name] = [];
  if (!movement[name].includes(value)) {
    movement[name].push(value);
  }

  event.target.value = '';
  renderEditor();
  saveCurrentMovement();
}

function addRelationship(name, value) {
  if (!value) return;

  const movement = movements.find((m) => m.id === selectedMovementId);
  if (!movement) return;

  if (!movement[name]) movement[name] = [];
  if (!movement[name].includes(value)) {
    movement[name].push(value);
  }

  renderEditor();
  saveCurrentMovement();
}

// CRUD operations
async function addNewMovement() {
  const newId = 'new-movement-' + Date.now();
  const newMovement = {
    id: newId,
    name: 'New Movement',
    description: '',
    category: 'Gymnastics',
    movement_patterns: ['Push'],
    equipment: [],
    muscle_groups: [],
    movement_family: [],
    difficulty: 0.5,
    energy_type: 'Fixed',
    energy_cost: 0.5,
    variations: [],
    progressions: [],
    regressions: [],
  };

  try {
    const created = await api.createMovement(newMovement);
    movements.push(created);
    selectMovement(created.id);
    showToast('Movement created');
  } catch (err) {
    showToast('Failed to create: ' + err.message, true);
  }
}

async function deleteMovement(id) {
  if (!confirm('Are you sure you want to delete this movement?')) return;

  try {
    await api.deleteMovement(id);

    const idx = movements.findIndex((m) => m.id === id);
    if (idx !== -1) movements.splice(idx, 1);

    selectedMovementId = null;
    renderMovementList();
    renderEditor();
    showToast('Movement deleted');
  } catch (err) {
    showToast('Failed to delete: ' + err.message, true);
  }
}
