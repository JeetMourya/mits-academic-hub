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
    // 1. Try fetching from MongoDB API first
    try {
      const res = await fetch('/api/results/semesters');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data?.length) {
          semesters = json.data.map(s => ({
            id: s.semesterNumber || s.id,
            name: s.name,
            label: s.name + (s.description ? ` · ${s.description}` : ''),
            urlTemplate: s.resultUrl || s.urlTemplate,
            active: true
          }));
          return semesters;
        }
      }
    } catch (dbErr) {
      console.warn('Could not fetch semesters from DB api, falling back to local storage/json:', dbErr.message);
    }

    // 2. Fallback to localStorage override
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

    // 3. Fallback to static links.json
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
    let trimmed = String(value).trim().toUpperCase();
    if (!trimmed) return { valid: false, message: 'Enrollment number is required' };
    
    // Auto-normalize: If B.Tech enrollment format has '0' at index 6, correct to 'O'
    if (/^BT[A-Z]{2}\d{2}[0O]\d{4}$/.test(trimmed)) {
      if (trimmed.charAt(6) === '0') {
        trimmed = trimmed.substring(0, 6) + 'O' + trimmed.substring(7);
        showToast('Auto-corrected "0" to "O" for B.Tech enrollment', 'info');
      }
    }

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

  function getGradePoint(grade) {
    const g = String(grade).trim().toUpperCase();
    const mapping = {
      'A+': '10.0',
      'A': '9.0',
      'B+': '8.0',
      'B': '7.0',
      'C+': '6.0',
      'C': '5.0',
      'D': '4.0',
      'F': '0.0',
      'FAIL': '0.0',
      'ABSENT': '0.0',
      'ABS': '0.0'
    };
    return mapping[g] || '0.0';
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

    window.MITSHistory?.add({
      enrollment: enrollmentCheck.value,
      semesterId: semesterCheck.semester.id,
      semesterName: semesterCheck.semester.name,
      url,
    });

    window.MITSHistory?.render('history-list', handleHistorySelect);

    try {
      const response = await fetch('/api/results/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enrollmentNumber: enrollmentCheck.value,
          semesterId: semesterCheck.semester.id,
        }),
      });

      const result = await response.json();
      const resultBox = document.getElementById('result-display');
      const errorBox = document.getElementById('result-error');
      const errorMessageEl = document.getElementById('result-error-message');

      if (!result.success) {
        if (resultBox) resultBox.hidden = true;
        if (errorBox) {
          errorBox.hidden = false;
          if (errorMessageEl) errorMessageEl.textContent = result.message || 'Could not fetch your result. Please try again.';
          errorBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        showToast(result.message || 'Failed to fetch result', 'error');
        setLoading(false);
        window.MITSCaptcha?.refresh();
        return;
      }

      const data = result.data;

      // Check if we have actual scraped data (student name or subjects)
      const hasScrapedData = data.studentName || (data.subjects && data.subjects.length > 0);

      if (hasScrapedData && resultBox) {
        if (errorBox) errorBox.hidden = true;
        resultBox.hidden = false;
        resultBox.scrollIntoView({ behavior: 'smooth', block: 'center' });

        const nameEl = document.getElementById('student-name');
        const enrollEl = document.getElementById('student-enrollment');
        const semEl = document.getElementById('student-semester');
        const sgpaEl = document.getElementById('student-sgpa');
        const statusBadge = document.getElementById('student-status-badge');

        if (nameEl) nameEl.textContent = data.studentName || 'N/A';
        if (enrollEl) enrollEl.textContent = data.enrollmentNumber || enrollmentCheck.value;
        if (semEl) semEl.textContent = `Semester ${data.semester} (${semesterCheck.semester.name || ''})`;
        if (sgpaEl) sgpaEl.textContent = data.sgpa != null ? Number(data.sgpa).toFixed(2) : 'N/A';
        
        if (statusBadge) {
          const statusText = String(data.status || 'PASS').toUpperCase();
          statusBadge.textContent = statusText;
          if (statusText === 'PASS') {
            statusBadge.style.background = 'var(--success-soft)';
            statusBadge.style.color = 'var(--success)';
          } else {
            statusBadge.style.background = 'var(--error-soft)';
            statusBadge.style.color = 'var(--error)';
          }
        }

        const tbody = document.getElementById('subjects-body');
        if (tbody) {
          tbody.innerHTML = '';
          (data.subjects || []).forEach((subject) => {
            const gp = getGradePoint(subject.grade);
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid var(--border)';
            tr.innerHTML = `
              <td style="padding: 1rem; color: var(--text-primary); font-weight: 500;">${subject.code || ''}</td>
              <td style="padding: 1rem; color: var(--text-secondary);">${subject.name || ''}</td>
              <td style="padding: 1rem; text-align: center;">
                <span class="grade-badge" style="display: inline-block; padding: 0.2rem 0.6rem; border-radius: var(--radius-sm); font-weight: 600; font-size: 0.85rem; background: ${subject.grade === 'F' || subject.grade === 'FAIL' ? 'var(--error-soft)' : 'var(--accent-soft)'}; color: ${subject.grade === 'F' || subject.grade === 'FAIL' ? 'var(--error)' : 'var(--accent)'};">${subject.grade || ''}</span>
              </td>
              <td style="padding: 1rem; text-align: center; color: var(--text-primary); font-weight: 600;">${gp}</td>
            `;
            tbody.appendChild(tr);
          });
        }

        showToast('Result loaded successfully!', 'success');
      } else {
        if (resultBox) resultBox.hidden = true;
        if (errorBox) {
          errorBox.hidden = false;
          if (errorMessageEl) errorMessageEl.textContent = 'No result data returned. Please verify your details.';
          errorBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        showToast('No result data found', 'error');
      }
    } catch (err) {
      console.error('Fetch error:', err);
      const resultBox = document.getElementById('result-display');
      const errorBox = document.getElementById('result-error');
      const errorMessageEl = document.getElementById('result-error-message');
      
      if (resultBox) resultBox.hidden = true;
      if (errorBox) {
        errorBox.hidden = false;
        if (errorMessageEl) errorMessageEl.textContent = 'A network or server error occurred. Please try again.';
        errorBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      showToast('Connection error', 'error');
    }

    setLoading(false);
    window.MITSCaptcha?.refresh();
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

  async function refreshSemesters() {
    try {
      await loadSemesters();
      populateSemesterSelect();
    } catch {
      populateSemesterSelect();
    }
  }

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

    window.MITSAdmin?.init();
    window.MITSAdminAuth?.updateAdminVisibility();

    window.MITSCaptcha?.init('captcha-canvas');
    window.MITSSGPA?.init('sgpa-tool');
    window.MITSCGPA?.init();
    window.MITSHistory?.render('history-list', handleHistorySelect);

    document.getElementById('lookup-form')?.addEventListener('submit', handleSubmit);
    document.getElementById('clear-history-btn')?.addEventListener('click', clearHistory);
    
    document.getElementById('print-transcript-btn')?.addEventListener('click', () => {
      window.print();
    });

    document.getElementById('result-back-btn')?.addEventListener('click', () => {
      const resultBox = document.getElementById('result-display');
      if (resultBox) resultBox.hidden = true;
      const lookupForm = document.getElementById('lookup-form');
      if (lookupForm) lookupForm.reset();
      window.MITSCaptcha?.refresh();
      document.getElementById('lookup')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    document.getElementById('enrollment-input')?.addEventListener('input', (e) => {
      e.target.value = e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    });
  }

  window.MITSApp = { refreshSemesters, showToast };

  document.addEventListener('DOMContentLoaded', init);
})();
