/**
 * MITS Academic Hub — Admin Panel
 * CRUD for semester links with localStorage persistence and JSON export.
 */
(function () {
  'use strict';

  const STORAGE_KEY = 'mits_links_override';
  const DATA_PATH = '../data/links.json';

  let linkData = { semesters: [], metadata: {} };
  let defaultData = null;

  /* ── Toast ── */
  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', 'alert');
    toast.innerHTML = `<span class="toast-icon">${type === 'error' ? '✕' : type === 'success' ? '✓' : 'ℹ'}</span><span>${message}</span>`;
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('visible'));
    setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  /* ── Data ── */
  async function loadDefaultData() {
    const res = await fetch(DATA_PATH);
    if (!res.ok) throw new Error('Failed to load links.json');
    defaultData = await res.json();
    return defaultData;
  }

  function loadFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function saveToStorage() {
    linkData.metadata.lastUpdated = new Date().toISOString().split('T')[0];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(linkData));
  }

  async function initData() {
    await loadDefaultData();
    const stored = loadFromStorage();
    linkData = stored || JSON.parse(JSON.stringify(defaultData));
    renderTable();
    updateStats();
  }

  /* ── Render ── */
  function renderTable() {
    const tbody = document.getElementById('semesters-table-body');
    if (!tbody) return;

    const semesters = [...linkData.semesters].sort((a, b) => a.id - b.id);

    if (semesters.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:32px;color:var(--text-muted);">No semesters configured. Add one to get started.</td></tr>`;
      return;
    }

    tbody.innerHTML = semesters
      .map((sem, index) => {
        const realIndex = linkData.semesters.findIndex((s) => s.id === sem.id);
        return `
        <tr data-index="${realIndex}">
          <td><strong>${sem.id}</strong></td>
          <td>${escapeHtml(sem.name)}</td>
          <td>${escapeHtml(sem.session || '—')}</td>
          <td class="url-cell" title="${escapeHtml(sem.urlTemplate)}">${escapeHtml(sem.urlTemplate)}</td>
          <td>
            <span class="status-toggle ${sem.active !== false ? 'active' : 'inactive'}">
              ${sem.active !== false ? 'Active' : 'Inactive'}
            </span>
          </td>
          <td>
            <div class="admin-actions">
              <button type="button" class="btn-icon edit-btn" data-index="${realIndex}" title="Edit" aria-label="Edit">✎</button>
              <button type="button" class="btn-icon delete-btn" data-index="${realIndex}" title="Delete" aria-label="Delete">🗑</button>
            </div>
          </td>
        </tr>`;
      })
      .join('');

    tbody.querySelectorAll('.edit-btn').forEach((btn) => {
      btn.addEventListener('click', () => openModal(parseInt(btn.dataset.index, 10)));
    });

    tbody.querySelectorAll('.delete-btn').forEach((btn) => {
      btn.addEventListener('click', () => deleteSemester(parseInt(btn.dataset.index, 10)));
    });
  }

  function updateStats() {
    const total = linkData.semesters.length;
    const active = linkData.semesters.filter((s) => s.active !== false).length;
    const totalEl = document.getElementById('stat-total');
    const activeEl = document.getElementById('stat-active');
    if (totalEl) totalEl.textContent = total;
    if (activeEl) activeEl.textContent = active;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }

  /* ── Modal ── */
  function openModal(index = -1) {
    const modal = document.getElementById('edit-modal');
    const title = document.getElementById('modal-title');
    const editIndex = document.getElementById('edit-index');

    editIndex.value = index;

    if (index >= 0) {
      const sem = linkData.semesters[index];
      title.textContent = 'Edit Semester';
      document.getElementById('sem-id').value = sem.id;
      document.getElementById('sem-name').value = sem.name;
      document.getElementById('sem-label').value = sem.label || '';
      document.getElementById('sem-session').value = sem.session || '';
      document.getElementById('sem-url').value = sem.urlTemplate;
      document.getElementById('sem-active').checked = sem.active !== false;
    } else {
      title.textContent = 'Add Semester';
      document.getElementById('semester-form').reset();
      document.getElementById('sem-active').checked = true;
      const nextId = linkData.semesters.length
        ? Math.max(...linkData.semesters.map((s) => s.id)) + 1
        : 1;
      document.getElementById('sem-id').value = nextId;
    }

    modal.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    const modal = document.getElementById('edit-modal');
    modal.hidden = true;
    document.body.style.overflow = '';
  }

  /* ── CRUD ── */
  function validateSemesterForm(data) {
    if (!data.id || data.id < 1) return 'Semester ID must be a positive number';
    if (!data.name.trim()) return 'Name is required';
    if (!data.urlTemplate.includes('{ENROLLMENT}')) {
      return 'URL template must contain {ENROLLMENT} placeholder';
    }
    if (!data.urlTemplate.startsWith('http')) return 'URL must start with http/https';
    return null;
  }

  function saveSemester(e) {
    e.preventDefault();

    const index = parseInt(document.getElementById('edit-index').value, 10);
    const sem = {
      id: parseInt(document.getElementById('sem-id').value, 10),
      name: document.getElementById('sem-name').value.trim(),
      label: document.getElementById('sem-label').value.trim() || document.getElementById('sem-name').value.trim(),
      session: document.getElementById('sem-session').value.trim(),
      urlTemplate: document.getElementById('sem-url').value.trim(),
      active: document.getElementById('sem-active').checked,
    };

    const error = validateSemesterForm(sem);
    if (error) {
      showToast(error, 'error');
      return;
    }

    const duplicate = linkData.semesters.findIndex(
      (s, i) => s.id === sem.id && i !== index
    );
    if (duplicate >= 0) {
      showToast('A semester with this ID already exists', 'error');
      return;
    }

    if (index >= 0) {
      linkData.semesters[index] = sem;
      showToast('Semester updated', 'success');
    } else {
      linkData.semesters.push(sem);
      showToast('Semester added', 'success');
    }

    saveToStorage();
    renderTable();
    updateStats();
    closeModal();
  }

  function deleteSemester(index) {
    const sem = linkData.semesters[index];
    if (!sem) return;

    const confirmed = confirm(`Delete "${sem.name}" (ID: ${sem.id})? This cannot be undone.`);
    if (!confirmed) return;

    linkData.semesters.splice(index, 1);
    saveToStorage();
    renderTable();
    updateStats();
    showToast('Semester deleted', 'info');
  }

  function exportJson() {
    const exportData = {
      semesters: linkData.semesters,
      metadata: {
        ...linkData.metadata,
        institution: 'MITS Gwalior',
        lastUpdated: new Date().toISOString().split('T')[0],
        version: linkData.metadata?.version || '1.0.0',
      },
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'links.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast('links.json downloaded — replace data/links.json before deploying', 'success');
  }

  function resetToDefault() {
    if (!defaultData) return;
    const confirmed = confirm('Reset all changes to the default links.json? Local overrides will be removed.');
    if (!confirmed) return;

    localStorage.removeItem(STORAGE_KEY);
    linkData = JSON.parse(JSON.stringify(defaultData));
    renderTable();
    updateStats();
    showToast('Reset to default configuration', 'info');
  }

  /* ── Init ── */
  function init() {
    window.MITSTheme?.init();

    initData().catch(() => {
      showToast('Failed to load semester data', 'error');
    });

    document.getElementById('add-semester-btn')?.addEventListener('click', () => openModal(-1));
    document.getElementById('semester-form')?.addEventListener('submit', saveSemester);
    document.getElementById('modal-close')?.addEventListener('click', closeModal);
    document.getElementById('modal-cancel')?.addEventListener('click', closeModal);
    document.getElementById('edit-modal')?.addEventListener('click', (e) => {
      if (e.target.id === 'edit-modal') closeModal();
    });

    document.getElementById('save-local-btn')?.addEventListener('click', () => {
      saveToStorage();
      showToast('Saved to local storage — visible on main site immediately', 'success');
    });

    document.getElementById('export-json-btn')?.addEventListener('click', exportJson);
    document.getElementById('reset-default-btn')?.addEventListener('click', resetToDefault);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModal();
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
