/**
 * MITS Academic Hub — Main Application
 */
(function () {
  'use strict';

  const LINKS_STORAGE_KEY = 'mits_links_override';
  const ENROLLMENT_PATTERN = /^[A-Za-z0-9]{8,14}$/;

  let semesters = [];
  let lastGeneratedUrl = '';

  /* ── Data Loading ── */

  async function loadSemesters() {
    try {
      const override = localStorage.getItem(LINKS_STORAGE_KEY);
      if (override) {
        const data = JSON.parse(override);
        if (data.semesters?.length) {
          semesters = data.semesters.filter((s) => s.active !== false);
          return semesters;
        }
      }
    } catch {
      /* fall through to fetch */
    }

    try {
      const res = await fetch('data/links.json');
      if (!res.ok) throw new Error('Failed to load semester links');
      const data = await res.json();
      semesters = (data.semesters || []).filter((s) => s.active !== false);
      return semesters;
    } catch (err) {
      showToast('Could not load semester links. Check your connection.', 'error');
      throw err;
    }
  }

  function populateSemesterSelect() {
    const select = document.getElementById('semester-select');
    if (!select) return;

    select.innerHTML = '<option value="">Select semester</option>';
    semesters
      .sort((a, b) => a.id - b.id)
      .forEach((sem) => {
        const opt = document.createElement('option');
        opt.value = sem.id;
        opt.textContent = sem.label || sem.name;
        select.appendChild(opt);
      });
  }

  /* ── Validation ── */

  function validateEnrollment(value) {
    const trimmed = String(value).trim();
    if (!trimmed) return { valid: false, message: 'Enrollment number is required' };
    if (!ENROLLMENT_PATTERN.test(trimmed)) {
      return { valid: false, message: 'Enter a valid enrollment number (8–14 alphanumeric characters)' };
    }
    return { valid: true, value: trimmed };
  }

  function validateSemester(semesterId) {
    if (!semesterId) return { valid: false, message: 'Please select a semester' };
    const sem = semesters.find((s) => s.id === parseInt(semesterId, 10));
    if (!sem) return { valid: false, message: 'Selected semester is not available' };
    return { valid: true, semester: sem };
  }

  function buildUrl(semester, enrollment) {
    return semester.urlTemplate.replace(/\{ENROLLMENT\}/g, encodeURIComponent(enrollment));
  }

  /* ── UI Helpers ── */

  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', 'alert');
    toast.innerHTML = `
      <span class="toast-icon">${type === 'error' ? '✕' : type === 'success' ? '✓' : 'ℹ'}</span>
      <span class="toast-message">${message}</span>`;

    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('visible'));

    setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  function setLoading(isLoading) {
    const btn = document.getElementById('submit-btn');
    const overlay = document.getElementById('loading-overlay');
    if (btn) {
      btn.disabled = isLoading;
      btn.classList.toggle('loading', isLoading);
      const label = btn.querySelector('.btn-label');
      if (label) label.textContent = isLoading ? 'Opening result…' : 'View Result';
    }
    if (overlay) overlay.hidden = !isLoading;
  }

  function showFieldError(fieldId, errorId, message) {
    const field = document.getElementById(fieldId);
    const error = document.getElementById(errorId);
    if (field) field.classList.add('input-error');
    if (error) {
      error.textContent = message;
      error.hidden = false;
    }
  }

  function clearErrors() {
    document.querySelectorAll('.input-error').forEach((el) => el.classList.remove('input-error'));
    document.querySelectorAll('.field-error').forEach((el) => {
      el.hidden = true;
      el.textContent = '';
    });
  }

  function updateResultActions(url) {
    lastGeneratedUrl = url;
    const actions = document.getElementById('result-actions');
    const linkPreview = document.getElementById('link-preview');
    if (actions) actions.hidden = !url;
    if (linkPreview) {
      linkPreview.textContent = url;
      linkPreview.href = url;
    }
  }

  /* ── Actions ── */

  async function handleSubmit(e) {
    e.preventDefault();
    clearErrors();

    const enrollmentInput = document.getElementById('enrollment-input');
    const semesterSelect = document.getElementById('semester-select');
    const captchaInput = document.getElementById('captcha-input');

    const enrollmentCheck = validateEnrollment(enrollmentInput?.value);
    if (!enrollmentCheck.valid) {
      showFieldError('enrollment-input', 'enrollment-error', enrollmentCheck.message);
      return;
    }

    const semesterCheck = validateSemester(semesterSelect?.value);
    if (!semesterCheck.valid) {
      showFieldError('semester-select', 'semester-error', semesterCheck.message);
      return;
    }

    if (!window.MITSCaptcha?.verify(captchaInput?.value)) {
      showFieldError('captcha-input', 'captcha-error', 'Captcha verification failed. Try again.');
      window.MITSCaptcha?.refresh();
      return;
    }

    const url = buildUrl(semesterCheck.semester, enrollmentCheck.value);
    setLoading(true);

    await new Promise((r) => setTimeout(r, 600));

    window.MITSHistory?.add({
      enrollment: enrollmentCheck.value,
      semesterId: semesterCheck.semester.id,
      semesterName: semesterCheck.semester.name,
      url,
    });

    window.MITSHistory?.render('history-list', handleHistorySelect);
    updateResultActions(url);

    window.open(url, '_blank', 'noopener,noreferrer');
    showToast('Result page opened in a new tab', 'success');
    window.MITSCaptcha?.refresh();
    setLoading(false);
  }

  function handleHistorySelect({ enrollment, semesterId }) {
    const enrollmentInput = document.getElementById('enrollment-input');
    const semesterSelect = document.getElementById('semester-select');
    if (enrollmentInput) enrollmentInput.value = enrollment;
    if (semesterSelect) semesterSelect.value = semesterId;
    document.getElementById('lookup-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    showToast('Search restored from history', 'info');
  }

  async function copyLink() {
    if (!lastGeneratedUrl) {
      showToast('Generate a result link first', 'error');
      return;
    }
    try {
      await navigator.clipboard.writeText(lastGeneratedUrl);
      showToast('Link copied to clipboard', 'success');
    } catch {
      showToast('Could not copy link', 'error');
    }
  }

  async function shareLink() {
    if (!lastGeneratedUrl) {
      showToast('Generate a result link first', 'error');
      return;
    }
    const enrollment = document.getElementById('enrollment-input')?.value || '';
    const shareData = {
      title: 'MITS Result Link',
      text: `View MITS result for enrollment ${enrollment}`,
      url: lastGeneratedUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        showToast('Shared successfully', 'success');
      } catch (err) {
        if (err.name !== 'AbortError') copyLink();
      }
    } else {
      copyLink();
    }
  }

  function downloadShortcut() {
    if (!lastGeneratedUrl) {
      showToast('Generate a result link first', 'error');
      return;
    }
    const enrollment = document.getElementById('enrollment-input')?.value || 'result';
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="refresh" content="0;url=${lastGeneratedUrl}">
<title>MITS Result — ${enrollment}</title>
</head>
<body>
<p>Redirecting to <a href="${lastGeneratedUrl}">MITS Result</a>…</p>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mits-result-${enrollment}.html`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Shortcut downloaded', 'success');
  }

  function clearHistory() {
    window.MITSHistory?.clear();
    window.MITSHistory?.render('history-list', handleHistorySelect);
    showToast('History cleared', 'info');
  }

  /* ── Navigation ── */

  function initNav() {
    const nav = document.getElementById('navbar');
    const toggle = document.getElementById('nav-toggle');
    const links = document.getElementById('nav-links');

    window.addEventListener('scroll', () => {
      nav?.classList.toggle('scrolled', window.scrollY > 20);
    });

    toggle?.addEventListener('click', () => {
      const expanded = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!expanded));
      links?.classList.toggle('open', !expanded);
    });

    document.querySelectorAll('.nav-link').forEach((link) => {
      link.addEventListener('click', () => {
        toggle?.setAttribute('aria-expanded', 'false');
        links?.classList.remove('open');
      });
    });

    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link[data-section]');

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            navLinks.forEach((link) => {
              link.classList.toggle('active', link.dataset.section === entry.target.id);
            });
          }
        });
      },
      { rootMargin: '-40% 0px -50% 0px' }
    );

    sections.forEach((s) => observer.observe(s));
  }

  function initAnimations() {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );

    document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
  }

  /* ── Init ── */

  async function init() {
    window.MITSTheme?.init();
    initNav();
    initAnimations();

    try {
      await loadSemesters();
      populateSemesterSelect();
    } catch {
      populateSemesterSelect();
    }

    window.MITSCaptcha?.init('captcha-canvas');
    window.MITSSGPA?.init('sgpa-tool');
    window.MITSCGPA?.init();
    window.MITSHistory?.render('history-list', handleHistorySelect);

    document.getElementById('lookup-form')?.addEventListener('submit', handleSubmit);
    document.getElementById('copy-link-btn')?.addEventListener('click', copyLink);
    document.getElementById('share-link-btn')?.addEventListener('click', shareLink);
    document.getElementById('download-shortcut-btn')?.addEventListener('click', downloadShortcut);
    document.getElementById('clear-history-btn')?.addEventListener('click', clearHistory);

    document.getElementById('enrollment-input')?.addEventListener('input', (e) => {
      e.target.value = e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
