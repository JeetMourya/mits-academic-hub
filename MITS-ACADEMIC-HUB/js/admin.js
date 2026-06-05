/**
 * MITS Academic Hub — Unified Admin Module
 * Semester management integrated into the main dashboard.
 */
(function () {
  'use strict';

  const STORAGE_KEY = 'mits_links_override';
  const DATA_PATH = 'data/links.json';

  let linkData = { semesters: [], metadata: {} };
  let defaultData = null;
  let stopInactivityWatch = null;
  let panelInitialized = false;
  let uiInitialized = false;

  function showToast(message, type = 'info') {
    if (window.MITSApp?.showToast) {
      window.MITSApp.showToast(message, type);
      return;
    }
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

  function openLoginModal() {
    const modal = document.getElementById('admin-login-modal');
    if (!modal) return;
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    document.getElementById('admin-username')?.focus();

    const lockout = window.MITSAdminAuth?.isLockedOut();
    const submitBtn = document.getElementById('login-submit-btn');
    const errorEl = document.getElementById('login-error');
    if (lockout?.locked && errorEl) {
      errorEl.textContent = `Too many failed attempts. Try again in ${window.MITSAdminAuth.formatLockoutTime(lockout.remainingMs)}.`;
      errorEl.hidden = false;
      submitBtn?.setAttribute('disabled', 'true');
    } else {
      submitBtn?.removeAttribute('disabled');
    }
  }

  function closeLoginModal() {
    const modal = document.getElementById('admin-login-modal');
    if (!modal) return;
    modal.hidden = true;
    document.body.style.overflow = '';
    document.getElementById('login-error')?.setAttribute('hidden', '');
  }

  function closeProfileMenu() {
    const menu = document.getElementById('admin-profile-menu');
    const toggle = document.getElementById('admin-profile-toggle');
    if (menu) menu.hidden = true;
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
  }

  function onAdminSessionActive() {
    window.MITSAdminAuth?.updateAdminVisibility();
    if (!panelInitialized) {
      initAdminPanel();
      panelInitialized = true;
    } else {
      initData().catch(() => showToast('Failed to refresh semester data', 'error'));
    }
    stopInactivityWatch?.();
    stopInactivityWatch = window.MITSAdminAuth?.initInactivityWatch(handleSessionExpired);
  }

  function onAdminSessionEnded() {
    stopInactivityWatch?.();
    stopInactivityWatch = null;
    closeProfileMenu();
    closeLoginModal();
    document.getElementById('edit-modal').hidden = true;
    document.body.style.overflow = '';
    window.MITSAdminAuth?.updateAdminVisibility();
  }

  function handleSessionExpired() {
    showToast('Session expired due to inactivity. Please sign in again.', 'error');
    onAdminSessionEnded();
  }

  function handleLoginSubmit(e) {
    e.preventDefault();
    const username = document.getElementById('admin-username')?.value;
    const password = document.getElementById('admin-password')?.value;
    const errorEl = document.getElementById('login-error');
    const btn = document.getElementById('login-submit-btn');

    if (errorEl) {
      errorEl.hidden = true;
      errorEl.textContent = '';
    }

    btn?.classList.add('loading');
    if (btn) btn.disabled = true;

    const result = window.MITSAdminAuth.login(username, password);

    setTimeout(() => {
      btn?.classList.remove('loading');
      if (btn) btn.disabled = false;

      if (!result.success) {
        if (errorEl) {
          errorEl.textContent = result.message;
          errorEl.hidden = false;
        }
        return;
      }

      document.getElementById('admin-login-form')?.reset();
      closeLoginModal();
      onAdminSessionActive();
      showToast('Welcome back — admin controls unlocked', 'success');
      document.getElementById('admin')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 300);
  }

  function handleLogout() {
    window.MITSAdminAuth?.logout();
    onAdminSessionEnded();
    showToast('Logged out successfully', 'info');
  }

  function guardAction(fn) {
    return (...args) => {
      if (!window.MITSAdminAuth?.requireAuth(openLoginModal)) return;
      window.MITSAdminAuth.touchSession();
      return fn(...args);
    };
  }

  function notifySemesterChange() {
    window.MITSApp?.refreshSemesters?.();
  }

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
    linkData.metadata = linkData.metadata || {};
    linkData.metadata.lastUpdated = new Date().toISOString().split('T')[0];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(linkData));
    notifySemesterChange();
  }

  async function initData() {
    if (!defaultData) await loadDefaultData();
    const stored = loadFromStorage();
    linkData = stored || JSON.parse(JSON.stringify(defaultData));
    renderTable();
    updateStats();
  }

  function renderTable() {
    const tbody = document.getElementById('semesters-table-body');
    if (!tbody) return;

    const semesters = [...linkData.semesters].sort((a, b) => a.id - b.id);

    if (semesters.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:32px;color:var(--text-muted);">No semesters configured. Add one to get started.</td></tr>`;
      return;
    }

    tbody.innerHTML = semesters
      .map((sem) => {
        const realIndex = linkData.semesters.findIndex((s) => s.id === sem.id);
        const isActive = sem.active !== false;
        return `
        <tr data-index="${realIndex}">
          <td><strong>${sem.id}</strong></td>
          <td>${escapeHtml(sem.name)}</td>
          <td>${escapeHtml(sem.session || '—')}</td>
          <td class="url-cell" title="${escapeHtml(sem.urlTemplate)}">${escapeHtml(sem.urlTemplate)}</td>
          <td>
            <span class="status-toggle ${isActive ? 'active' : 'inactive'}">
              ${isActive ? 'Active' : 'Inactive'}
            </span>
          </td>
          <td>
            <div class="admin-actions">
              <button type="button" class="btn-icon toggle-btn" data-index="${realIndex}" title="${isActive ? 'Disable' : 'Enable'}" aria-label="${isActive ? 'Disable semester' : 'Enable semester'}">${isActive ? '⏸' : '▶'}</button>
              <button type="button" class="btn-icon edit-btn" data-index="${realIndex}" title="Edit" aria-label="Edit">✎</button>
              <button type="button" class="btn-icon delete-btn" data-index="${realIndex}" title="Delete" aria-label="Delete">🗑</button>
            </div>
          </td>
        </tr>`;
      })
      .join('');

    tbody.querySelectorAll('.toggle-btn').forEach((btn) => {
      btn.addEventListener('click', guardAction(() => toggleSemester(parseInt(btn.dataset.index, 10))));
    });
    tbody.querySelectorAll('.edit-btn').forEach((btn) => {
      btn.addEventListener('click', guardAction(() => openEditModal(parseInt(btn.dataset.index, 10))));
    });
    tbody.querySelectorAll('.delete-btn').forEach((btn) => {
      btn.addEventListener('click', guardAction(() => deleteSemester(parseInt(btn.dataset.index, 10))));
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

  function openEditModal(index = -1) {
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

  function closeEditModal() {
    document.getElementById('edit-modal').hidden = true;
    if (document.getElementById('admin-login-modal')?.hidden !== false) {
      document.body.style.overflow = '';
    }
  }

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

    const duplicate = linkData.semesters.findIndex((s, i) => s.id === sem.id && i !== index);
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
    closeEditModal();
  }

  function toggleSemester(index) {
    const sem = linkData.semesters[index];
    if (!sem) return;

    sem.active = sem.active === false;
    saveToStorage();
    renderTable();
    updateStats();
    showToast(`Semester ${sem.active !== false ? 'enabled' : 'disabled'}`, 'success');
  }

  function deleteSemester(index) {
    const sem = linkData.semesters[index];
    if (!sem) return;

    if (!confirm(`Delete "${sem.name}" (ID: ${sem.id})? This cannot be undone.`)) return;

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
        version: linkData.metadata?.version || '1.1.0',
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
    if (!confirm('Reset all changes to the default links.json? Local overrides will be removed.')) return;

    localStorage.removeItem(STORAGE_KEY);
    linkData = JSON.parse(JSON.stringify(defaultData));
    renderTable();
    updateStats();
    notifySemesterChange();
    showToast('Reset to default configuration', 'info');
  }

  function initAdminPanel() {
    initData().catch(() => showToast('Failed to load semester data', 'error'));

    document.getElementById('add-semester-btn')?.addEventListener('click', guardAction(() => openEditModal(-1)));
    document.getElementById('semester-form')?.addEventListener('submit', guardAction(saveSemester));
    document.getElementById('modal-close')?.addEventListener('click', closeEditModal);
    document.getElementById('modal-cancel')?.addEventListener('click', closeEditModal);
    document.getElementById('edit-modal')?.addEventListener('click', (e) => {
      if (e.target.id === 'edit-modal') closeEditModal();
    });

    document.getElementById('save-local-btn')?.addEventListener('click', guardAction(() => {
      saveToStorage();
      showToast('Saved to local storage — visible to students immediately', 'success');
    }));

    document.getElementById('export-json-btn')?.addEventListener('click', guardAction(exportJson));
    document.getElementById('reset-default-btn')?.addEventListener('click', guardAction(resetToDefault));
  }

  function initProfileDropdown() {
    const toggle = document.getElementById('admin-profile-toggle');
    const menu = document.getElementById('admin-profile-menu');

    toggle?.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!open));
      if (menu) menu.hidden = open;
    });

    document.addEventListener('click', () => closeProfileMenu());

    menu?.querySelectorAll('.admin-profile-item').forEach((item) => {
      item.addEventListener('click', () => closeProfileMenu());
    });
  }

  function init() {
    if (uiInitialized) return;
    uiInitialized = true;

    document.getElementById('admin-login-btn')?.addEventListener('click', () => {
      openLoginModal();
      document.getElementById('nav-toggle')?.setAttribute('aria-expanded', 'false');
      document.getElementById('nav-links')?.classList.remove('open');
    });
    document.getElementById('admin-login-form')?.addEventListener('submit', handleLoginSubmit);
    document.getElementById('admin-login-close')?.addEventListener('click', closeLoginModal);
    document.getElementById('admin-login-modal')?.addEventListener('click', (e) => {
      if (e.target.id === 'admin-login-modal') closeLoginModal();
    });
    document.getElementById('admin-logout-btn')?.addEventListener('click', handleLogout);

    initProfileDropdown();

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeEditModal();
        closeLoginModal();
        closeProfileMenu();
      }
    });

    if (window.MITSAdminAuth?.isAuthenticated()) {
      onAdminSessionActive();
    } else {
      window.MITSAdminAuth?.updateAdminVisibility();
      if (window.location.hash === '#admin') {
        openLoginModal();
      }
    }
  }

  window.MITSAdmin = { init, openLoginModal };
})();
