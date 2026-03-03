// Pure rendering functions — no state mutation

function renderTextField(name, prop, value) {
  return `
    <div class="form-group">
      <label>${formatLabel(name)}</label>
      <input type="text"
             value="${value || ''}"
             placeholder="${prop.description || ''}"
             onchange="updateField('${name}', this.value)">
    </div>
  `;
}

function renderTextArea(name, prop, value) {
  return `
    <div class="form-group full-width">
      <label>${formatLabel(name)}</label>
      <textarea placeholder="${prop.description || ''}"
                onchange="updateField('${name}', this.value)">${value || ''}</textarea>
    </div>
  `;
}

function renderSelect(name, prop, value) {
  const options = prop.enum
    .map(
      (opt) =>
        `<option value="${opt}" ${opt === value ? 'selected' : ''}>${opt}</option>`
    )
    .join('');

  return `
    <div class="form-group">
      <label>${formatLabel(name)}</label>
      <select onchange="updateField('${name}', this.value)">
        ${options}
      </select>
    </div>
  `;
}

function renderCheckboxGroup(name, prop, values) {
  const options = prop.items.enum;
  const checkboxes = options
    .map(
      (opt) => `
    <label class="checkbox-item ${values.includes(opt) ? 'checked' : ''}">
      <input type="checkbox"
             ${values.includes(opt) ? 'checked' : ''}
             onchange="toggleArrayItem('${name}', '${opt}')">
      ${opt}
    </label>
  `
    )
    .join('');

  return `
    <div class="form-group full-width">
      <label>${formatLabel(name)}</label>
      <div class="checkbox-group">${checkboxes}</div>
    </div>
  `;
}

function renderRadio(name, prop, value) {
  const options = prop.enum
    .map(
      (opt) => `
    <label class="radio-item ${opt === value ? 'selected' : ''}">
      <input type="radio"
             name="${name}"
             ${opt === value ? 'checked' : ''}
             onchange="updateField('${name}', '${opt}')">
      ${opt}
    </label>
  `
    )
    .join('');

  return `
    <div class="form-group">
      <label>${formatLabel(name)}</label>
      <div class="radio-group">${options}</div>
    </div>
  `;
}

function renderRange(name, prop, value) {
  const displayValue = (value || 0).toFixed(2);
  return `
    <div class="form-group">
      <label>${formatLabel(name)}</label>
      <div class="range-container">
        <input type="range"
               min="${prop.minimum}"
               max="${prop.maximum}"
               step="0.01"
               value="${value || 0}"
               oninput="updateRange('${name}', this.value)">
        <span class="range-value" id="${name}-value">${displayValue}</span>
      </div>
    </div>
  `;
}

function renderTagInput(name, prop, values) {
  const tags = values
    .map(
      (v) => `
    <span class="tag">
      ${v}
      <span class="tag-remove" onclick="removeArrayItem('${name}', '${v}')">&times;</span>
    </span>
  `
    )
    .join('');

  return `
    <div class="form-group full-width">
      <label>${formatLabel(name)}</label>
      <div class="tag-input-container" onclick="this.querySelector('input').focus()">
        ${tags}
        <input type="text"
               class="tag-input"
               placeholder="Type and press Enter..."
               onkeydown="handleTagInput(event, '${name}')">
      </div>
    </div>
  `;
}

function renderRelationshipSelect(name, prop, values) {
  const otherMovements = movements.filter((m) => m.id !== selectedMovementId);

  const tags = values
    .map((v) => {
      const movement = movements.find((m) => m.id === v);
      const displayName = movement ? movement.name : v;
      return `
      <span class="relationship-tag">
        ${displayName}
        <span class="tag-remove" onclick="removeArrayItem('${name}', '${v}')">&times;</span>
      </span>
    `;
    })
    .join('');

  const availableOptions = otherMovements
    .filter((m) => !values.includes(m.id))
    .map((m) => `<option value="${m.id}">${m.name}</option>`)
    .join('');

  return `
    <div class="form-group full-width">
      <label>${formatLabel(name)}</label>
      <div class="relationship-select">
        ${tags}
      </div>
      <select onchange="addRelationship('${name}', this.value); this.value='';" style="margin-top: 8px;">
        <option value="">Add ${formatLabel(name).toLowerCase()}...</option>
        ${availableOptions}
      </select>
    </div>
  `;
}
