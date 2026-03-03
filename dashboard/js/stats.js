// Stats dashboard — all computed client-side from movements array

let statsCharts = [];

function destroyStatsCharts() {
  statsCharts.forEach((c) => c.destroy());
  statsCharts = [];
}

function renderStatsView() {
  destroyStatsCharts();

  const container = document.getElementById('view-stats');
  container.innerHTML = `
    <div class="stats-grid">
      <div class="stats-card">
        <h3>Difficulty vs Energy Cost</h3>
        <canvas id="chart-scatter"></canvas>
      </div>
      <div class="stats-card">
        <h3>Coverage Gaps</h3>
        <div id="coverage-gaps"></div>
      </div>
    </div>
  `;

  renderScatterChart();
  renderCoverageGaps();
}

function renderScatterChart() {
  const datasets = {};
  movements.forEach((m) => {
    if (!datasets[m.category]) {
      const c = getCategoryColor(m.category);
      datasets[m.category] = {
        label: m.category,
        data: [],
        backgroundColor: c.border,
        pointRadius: 6,
        pointHoverRadius: 9,
      };
    }
    datasets[m.category].data.push({
      x: m.difficulty,
      y: m.energy_cost,
      name: m.name,
    });
  });

  const chart = new Chart(document.getElementById('chart-scatter'), {
    type: 'scatter',
    data: { datasets: Object.values(datasets) },
    options: {
      responsive: true,
      scales: {
        x: {
          title: { display: true, text: 'Difficulty', color: '#a0a0a0' },
          min: 0, max: 1,
          ticks: { color: '#a0a0a0' },
          grid: { color: '#2a2a4a' },
        },
        y: {
          title: { display: true, text: 'Energy Cost', color: '#a0a0a0' },
          min: 0, max: 1,
          ticks: { color: '#a0a0a0' },
          grid: { color: '#2a2a4a' },
        },
      },
      plugins: {
        legend: { position: 'bottom', labels: { color: '#eaeaea' } },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.raw.name} (${ctx.raw.x.toFixed(2)}, ${ctx.raw.y.toFixed(2)})`,
          },
        },
      },
    },
  });
  statsCharts.push(chart);
}

function renderCoverageGaps() {
  const container = document.getElementById('coverage-gaps');
  let html = '';

  // Movement patterns with few movements
  const patternCounts = {};
  movements.forEach((m) => {
    (m.movement_patterns || []).forEach((p) => {
      patternCounts[p] = (patternCounts[p] || 0) + 1;
    });
  });
  const lowPatterns = Object.entries(patternCounts)
    .filter(([, c]) => c <= 2)
    .map(([p, c]) => `<span class="gap-tag">${p} (${c})</span>`)
    .join('');

  // Muscle groups with low coverage
  const muscleCounts = {};
  movements.forEach((m) => {
    (m.muscle_groups || []).forEach((g) => {
      muscleCounts[g] = (muscleCounts[g] || 0) + 1;
    });
  });
  const lowMuscles = Object.entries(muscleCounts)
    .filter(([, c]) => c <= 2)
    .map(([g, c]) => `<span class="gap-tag">${g} (${c})</span>`)
    .join('');

  // Missing descriptions
  const noDesc = movements
    .filter((m) => !m.description || m.description.trim() === '')
    .map((m) => `<span class="gap-tag gap-warn">${m.name}</span>`)
    .join('');

  // Orphan movements (no relationships)
  const orphans = movements
    .filter((m) =>
      (!m.variations || m.variations.length === 0) &&
      (!m.progressions || m.progressions.length === 0) &&
      (!m.regressions || m.regressions.length === 0)
    )
    .map((m) => `<span class="gap-tag gap-warn">${m.name}</span>`)
    .join('');

  html += `<div class="gap-section">
    <h4>Movement Patterns with Few Movements</h4>
    <div class="gap-tags">${lowPatterns || '<span class="text-muted">None</span>'}</div>
  </div>`;

  html += `<div class="gap-section">
    <h4>Muscle Groups with Low Coverage</h4>
    <div class="gap-tags">${lowMuscles || '<span class="text-muted">None</span>'}</div>
  </div>`;

  html += `<div class="gap-section">
    <h4>Missing Descriptions</h4>
    <div class="gap-tags">${noDesc || '<span class="text-muted">None</span>'}</div>
  </div>`;

  html += `<div class="gap-section">
    <h4>Orphan Movements (No Relationships)</h4>
    <div class="gap-tags">${orphans || '<span class="text-muted">None</span>'}</div>
  </div>`;

  container.innerHTML = html;
}
