/**
 * MITS Academic Hub — Search History
 * Persists recent enrollment lookups in localStorage.
 */
(function () {
  'use strict';

  const STORAGE_KEY = 'mits_search_history';
  const MAX_ITEMS = 12;

  function read() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function write(items) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_ITEMS)));
    } catch {
      /* storage full or unavailable */
    }
  }

  /** Legacy entries have no examType: they were Regular searches. */
  function typeOf(item) {
    return item && item.examType === 'Ex' ? 'Ex' : 'Regular';
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, (c) => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
  }

  function sameEntry(item, enrollment, semesterId, examType) {
    return item.enrollment === enrollment &&
      String(item.semesterId) === String(semesterId) &&
      typeOf(item) === (examType === 'Ex' ? 'Ex' : 'Regular');
  }

  function add(entry) {
    const { enrollment, semesterId, semesterName, url, timestamp } = entry;
    const examType = entry.examType === 'Ex' ? 'Ex' : 'Regular';
    if (!enrollment || !semesterId) return;

    const items = read().filter((item) => !sameEntry(item, enrollment, semesterId, examType));

    items.unshift({
      enrollment,
      semesterId,
      examType,
      semesterName: semesterName || `Semester ${semesterId}`,
      url: url || '',
      timestamp: timestamp || Date.now(),
    });

    write(items);
    return items;
  }

  function remove(enrollment, semesterId, examType) {
    const items = read().filter((item) => !sameEntry(item, enrollment, semesterId, examType));
    write(items);
    return items;
  }

  function clear() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    return [];
  }

  function formatDate(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  function render(containerId, onSelect) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const items = read();

    if (items.length === 0) {
      container.innerHTML = `
        <div class="history-empty">
          <span class="history-empty-icon" aria-hidden="true">&#128269;</span>
          <p>No recent searches yet</p>
          <span class="history-empty-hint">Your lookup history will appear here</span>
        </div>`;
      return;
    }

    container.innerHTML = items
      .map(
        (item) => `
        <article class="history-item" data-enrollment="${escapeHtml(item.enrollment)}" data-semester="${escapeHtml(item.semesterId)}" data-exam-type="${typeOf(item)}">
          <div class="history-item-main">
            <span class="history-enrollment">${escapeHtml(item.enrollment)}</span>
            <span class="history-semester">${escapeHtml(item.semesterName)} &middot; ${typeOf(item) === 'Ex' ? 'Ex / Backlog' : 'Regular'}</span>
          </div>
          <div class="history-item-meta">
            <time datetime="${new Date(item.timestamp).toISOString()}">${formatDate(item.timestamp)}</time>
            <div class="history-actions">
              <button type="button" class="btn-icon history-reuse" title="Reuse" aria-label="Reuse search">&#8617;</button>
              <button type="button" class="btn-icon history-open" title="Open result" aria-label="Open result">&#8599;</button>
              <button type="button" class="btn-icon history-remove" title="Remove" aria-label="Remove from history">&times;</button>
            </div>
          </div>
        </article>`
      )
      .join('');

    container.querySelectorAll('.history-item').forEach((el) => {
      const enrollment = el.dataset.enrollment;
      const semesterId = el.dataset.semester;
      const examType = el.dataset.examType === 'Ex' ? 'Ex' : 'Regular';
      const item = items.find((i) => sameEntry(i, enrollment, semesterId, examType));

      el.querySelector('.history-reuse')?.addEventListener('click', (e) => {
        e.stopPropagation();
        if (onSelect) onSelect({ enrollment, semesterId, examType });
      });

      el.querySelector('.history-open')?.addEventListener('click', (e) => {
        e.stopPropagation();
        if (item?.url) window.open(item.url, '_blank', 'noopener,noreferrer');
      });

      el.querySelector('.history-remove')?.addEventListener('click', (e) => {
        e.stopPropagation();
        remove(enrollment, semesterId, examType);
        render(containerId, onSelect);
      });

      el.addEventListener('click', () => {
        if (onSelect) onSelect({ enrollment, semesterId, examType });
      });
    });
  }

  window.MITSHistory = { read, add, remove, clear, render, formatDate };
})();
