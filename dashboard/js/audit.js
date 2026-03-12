// Audit tab — fetches verification report from API and renders it

let lastAuditReport = null;

async function renderAuditView() {
  const container = document.getElementById('view-audit');

  // Show loading state on first load
  if (!lastAuditReport) {
    container.innerHTML = '<div class="audit-container"><p class="text-muted">Scanning...</p></div>';
  }

  try {
    lastAuditReport = await api.verifyMovements();
    renderAuditReport(container, lastAuditReport);
  } catch (err) {
    container.innerHTML = `<div class="audit-container"><p class="text-muted">Failed to load: ${err.message}</p></div>`;
  }
}

function renderAuditReport(container, report) {
  const warningCount = report.warnings.length;
  const statusClass = warningCount === 0 ? 'audit-status-pass' : 'audit-status-warn';
  const statusText = warningCount === 0
    ? 'All checks passed'
    : `${warningCount} warning${warningCount !== 1 ? 's' : ''} found`;

  // Group warnings by check type
  const grouped = {};
  report.warnings.forEach((w) => {
    if (!grouped[w.check]) grouped[w.check] = [];
    grouped[w.check].push(w);
  });

  let warningsHtml = '';
  if (warningCount > 0) {
    warningsHtml = Object.entries(grouped).map(([check, items]) => {
      const rows = items.map((w) => `
        <div class="audit-warning-row">
          <span class="audit-movement-id">${w.id}</span>
          <span>${w.message}</span>
        </div>
      `).join('');

      return `
        <div class="audit-group">
          <h4>${formatCheckName(check)} <span class="audit-group-count">${items.length}</span></h4>
          ${rows}
        </div>
      `;
    }).join('');
  }

  container.innerHTML = `
    <div class="audit-container">
      <div class="audit-header">
        <div>
          <h2>Data Audit</h2>
          <p class="text-muted">${report.total_movements} movements scanned</p>
        </div>
        <button class="btn btn-secondary" onclick="renderAuditView()">Rescan</button>
      </div>
      <div class="audit-summary">
        <div class="audit-stat">
          <span class="audit-stat-value">${report.checks_passed}</span>
          <span class="audit-stat-label">Checks passed</span>
        </div>
        <div class="audit-stat ${statusClass}">
          <span class="audit-stat-value">${warningCount}</span>
          <span class="audit-stat-label">${statusText}</span>
        </div>
      </div>
      ${warningsHtml}
    </div>
  `;
}

function formatCheckName(check) {
  return check.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}
