/**
 * MITS Academic Hub — Main Application v2.0
 * Dynamic batch-aware: detects batch from enrollment, generates correct sessions.
 * Professional college portal UX redesign.
 */
(function () {
  'use strict';

  const ENROLLMENT_PATTERN = /^[A-Za-z0-9]{8,14}$/;

  let currentBatchYear = null;
  let currentSemesters = [];
  let lastGeneratedUrl = '';

  /**
   * MITS IUMS Official Grading Scale:
   *   AAA → 10, AA → 9, A → 8, B+ → 7, B → 6, C → 5, D → 4
   *   F / FAIL / ABSENT → 0
   *   Non-credit subjects → "N/A"
   */
  const GRADE_POINT_MAP = {
    'AAA': 10,
    'AA': 9,
    'A': 8,
    'B+': 7,
    'B': 6,
    'C': 5,
    'D': 4,
    'F': 0,
    'FAIL': 0,
    'ABSENT': 0,
    'ABS': 0,
  };

  const NON_CREDIT_KEYWORDS = [
    'NSS', 'NCC', 'YOGA', 'SPORTS', 'HOLISTIC',
    'NON-CREDIT', 'AUDIT', 'HSS',
  ];

  function getGradePoint(grade) {
    const g = String(grade).trim().toUpperCase();
    return GRADE_POINT_MAP[g];
  }

  function isNonCreditSubject(subjectName, subjectCode) {
    const combined = `${subjectName || ''} ${subjectCode || ''}`.toUpperCase();
    return NON_CREDIT_KEYWORDS.some((kw) => combined.includes(kw));
  }

  function gradePointDisplay(grade, subjectName, subjectCode) {
    if (isNonCreditSubject(subjectName, subjectCode)) return 'N/A';
    const gp = getGradePoint(grade);
    return gp !== undefined ? gp.toString() : 'N/A';
  }

  /* ── Data Loading: Dynamic Semester Generation ── */

  async function loadSemestersForEnrollment(enrollment) {
    try {
      const cleaned = String(enrollment).toUpperCase().trim();
      const res = await fetch(`/api/results/semesters/dynamic?enrollment=${encodeURIComponent(cleaned)}`);

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          currentBatchYear = json.data.batchYear;
          // Use all 8 semesters, mark which ones are likely available
          currentSemesters = json.data.allSemesters.map((sem) => ({
            id: sem.semester,
            name: sem.displayName,
            label: sem.shortLabel,
            sessionCode: sem.sessionCode,
            available: json.data.availableSemesters.some((a) => a.semester === sem.semester),
          }));
          return currentSemesters;
        }
      }
    } catch (err) {
      console.warn('Dynamic semesters API failed, falling back to client-side generation:', err.message);
    }

    // Fallback: client-side generation
    try {
      const batchMatch = String(enrollment).toUpperCase().match(/^BTIT(\d{2})O/);
      if (batchMatch) {
        currentBatchYear = 2000 + parseInt(batchMatch[1], 10);
        currentSemesters = [];
        for (let s = 1; s <= 8; s++) {
          const offset = Math.floor((s - 1) / 2);
          let year = currentBatchYear + offset;
          if (s % 2 === 0) year = currentBatchYear + s / 2;
          const month = s % 2 === 1 ? 'Nov' : 'Apr';
          currentSemesters.push({
            id: s,
            name: `Semester ${s} (${month} ${year})`,
            label: `Sem ${s} · ${month} ${year}`,
            sessionCode: `${month === 'Apr' ? '04' : '11'}${year}`,
            available: true,
          });
        }
        return currentSemesters;
      }
    } catch {
      // Fall through to legacy fallback
    }

    // Legacy fallback: fetch static semester list
    return loadLegacySemesters();
  }

  async function loadLegacySemesters() {
    try {
      const res = await fetch('/api/results/semesters');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data?.length) {
          currentSemesters = json.data.map((s) => ({
            id: s.semesterNumber || s.id,
            name: s.name,
            label: s.name + (s.description ? ` · ${s.description}` : ''),
            available: true,
          }));
          return currentSemesters;
        }
      }
    } catch {
      // DB not connected — try links.json
    }
    try {
      const res = await fetch('data/links.json');
      if (res.ok) {
        const data = await res.json();
        currentSemesters = (data.semesters || [])
          .filter((s) => s.active !== false)
          .map((s) => ({ id: s.id, name: s.name, label: s.label || s.name, available: true }));
        return currentSemesters;
      }
    } catch {
      showToast('Could not load semester data.', 'error');
    }
    return [];
  }

  function populateSemesterSelect(enrollmentValue) {
    const select = document.getElementById('semester-select');
    if (!select) return;

    // Show loading state
    select.innerHTML = '<option value="">Loading semesters…</option>';
    select.disabled = true;

    loadSemestersForEnrollment(enrollmentValue).then((semesters) => {
      select.innerHTML = '<option value="">Select semester</option>';
      semesters
        .sort((a, b) => a.id - b.id)
        .forEach((sem) => {
          const opt = document.createElement('option');
          opt.value = sem.id;
          opt.textContent = sem.label || sem.name;
          select.appendChild(opt);
        });
      select.disabled = false;

      // Show batch info badge if detected
      const batchInfo = document.getElementById('batch-info');
      if (batchInfo && currentBatchYear) {
        batchInfo.textContent = `Batch ${currentBatchYear}`;
        batchInfo.hidden = false;
      }
    }).catch(() => {
      select.innerHTML = '<option value="">Error loading semesters</option>';
      select.disabled = false;
    });
  }

  /* ── Validation ── */

  function validateEnrollment(value) {
    let trimmed = String(value).trim().toUpperCase();
    if (!trimmed) return { valid: false, message: 'Enrollment number is required' };

    // Auto-normalize: BTIT format with '0' at index 6 → 'O'
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
    const semNum = parseInt(semesterId, 10);
    if (isNaN(semNum) || semNum < 1 || semNum > 8) {
      return { valid: false, message: 'Invalid semester' };
    }
    return { valid: true, semesterNumber: semNum };
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
      if (label) label.textContent = isLoading ? 'Fetching result…' : 'View Result';
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

  /* ── Grade Badge Styling ── */

  function gradeBadgeStyle(grade) {
    const g = String(grade || '').trim().toUpperCase();
    if (g === 'F' || g === 'FAIL' || g === 'ABSENT' || g === 'ABS') {
      return { bg: 'var(--error-soft)', color: 'var(--error)' };
    }
    if (g === 'AAA' || g === 'AA') {
      return { bg: 'var(--success-soft)', color: 'var(--success)' };
    }
    return { bg: 'var(--accent-soft)', color: 'var(--accent)' };
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

    setLoading(true);

    // Build URL and add to history
    const enrolledValue = enrollmentCheck.value;
    lastGeneratedUrl = `https://iums.mitsgwalior.in/ViewSC.aspx?U2bJdzw70jtQ3d=${encodeURIComponent(enrolledValue)}&U3bJdzw70jtQ4d=${semesterCheck.semesterNumber}`;

    window.MITSHistory?.add({
      enrollment: enrolledValue,
      semesterId: String(semesterCheck.semesterNumber),
      semesterName: `Semester ${semesterCheck.semesterNumber}`,
      url: lastGeneratedUrl,
    });
    window.MITSHistory?.render('history-list', handleHistorySelect);

    try {
      const response = await fetch('/api/results/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enrollmentNumber: enrolledValue,
          semesterNumber: semesterCheck.semesterNumber,
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
      const hasData = data.studentName || (data.subjects && data.subjects.length > 0);

      if (hasData && resultBox) {
        if (errorBox) errorBox.hidden = true;
        resultBox.hidden = false;
        resultBox.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Populate student info
        const nameEl = document.getElementById('student-name');
        const enrollEl = document.getElementById('student-enrollment');
        const semEl = document.getElementById('student-semester');
        const sgpaEl = document.getElementById('student-sgpa');
        const statusBadge = document.getElementById('student-status-badge');
        const batchEl = document.getElementById('student-batch');

        if (nameEl) nameEl.textContent = data.studentName || 'N/A';
        if (enrollEl) enrollEl.textContent = data.enrollmentNumber || enrolledValue;
        if (batchEl && data.batchYear) batchEl.textContent = `Batch ${data.batchYear}`;
        if (semEl) semEl.textContent = `Semester ${data.semester}`;
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

        // Render subjects table with corrected grades
        const tbody = document.getElementById('subjects-body');
        if (tbody) {
          tbody.innerHTML = '';
          const subjects = data.subjects || [];

          if (subjects.length === 0) {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td colspan="4" style="padding: 2rem; text-align: center; color: var(--text-muted); font-style: italic;">No subjects found for this semester.</td>`;
            tbody.appendChild(tr);
          } else {
            subjects.forEach((subject) => {
              // Recompute grade point with correct mapping
              const gp = subject.gradePoint || gradePointDisplay(subject.grade, subject.name, subject.code);
              const isNonCredit = subject.isNonCredit || isNonCreditSubject(subject.name, subject.code);
              const badgeStyle = gradeBadgeStyle(subject.grade);
              const gradeVal = String(subject.grade || '').trim().toUpperCase();

              const tr = document.createElement('tr');
              tr.style.borderBottom = '1px solid var(--border)';
              tr.style.transition = 'background 0.15s ease';
              tr.onmouseenter = () => { tr.style.background = 'rgba(99, 102, 241, 0.04)'; };
              tr.onmouseleave = () => { tr.style.background = ''; };

              tr.innerHTML = `
                <td style="padding: 0.9rem 1rem; color: var(--text-primary); font-weight: 500; font-variant-numeric: tabular-nums;">
                  ${subject.code || '—'}
                </td>
                <td style="padding: 0.9rem 1rem; color: var(--text-secondary);">
                  ${subject.name || '—'}
                  ${isNonCredit ? '<span style="font-size: 0.7rem; text-transform: uppercase; color: var(--text-muted); background: var(--bg-subtle); padding: 1px 6px; border-radius: var(--radius-xs); margin-left: 8px; font-weight: 600;">NC</span>' : ''}
                </td>
                <td style="padding: 0.9rem 1rem; text-align: center;">
                  ${gradeVal ? `<span style="display: inline-block; padding: 0.25rem 0.65rem; border-radius: var(--radius-full); font-weight: 700; font-size: 0.8rem; background: ${badgeStyle.bg}; color: ${badgeStyle.color}; min-width: 38px;">${gradeVal}</span>` : '<span style="color: var(--text-muted);">—</span>'}
                </td>
                <td style="padding: 0.9rem 1rem; text-align: center; font-weight: 700; font-variant-numeric: tabular-nums;">
                  ${isNonCredit ? '<span style="color: var(--text-muted); font-weight: 500; font-style: italic;">N/A</span>' : `<span style="color: ${gp === '0' ? 'var(--error)' : 'var(--text-primary)'};">${gp}</span>`}
                </td>
              `;
              tbody.appendChild(tr);
            });
          }
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
    if (enrollmentInput) {
      enrollmentInput.value = enrollment;
      // Trigger dynamic semester load
      populateSemesterSelect(enrollment);
    }
    if (semesterSelect && semesterId) {
      // Wait briefly for semesters to load, then select
      setTimeout(() => { semesterSelect.value = semesterId; }, 500);
    }
    document.getElementById('lookup-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    showToast('Search restored from history', 'info');
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

    // Default semester load (generic, will be overridden on enrollment input)
    try {
      const res = await fetch('/api/results/semesters');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data?.length) {
          currentSemesters = json.data.map((s) => ({
            id: s.semesterNumber || s.id,
            name: s.name,
            label: s.name + (s.description ? ` · ${s.description}` : ''),
            available: true,
          }));
          populateStaticSelect();
        }
      }
    } catch {
      populateStaticSelect();
    }

    function populateStaticSelect() {
      const select = document.getElementById('semester-select');
      if (!select) return;
      select.innerHTML = '<option value="">Enter enrollment first →</option>';
      if (currentSemesters.length > 0) {
        select.innerHTML = '<option value="">Select semester</option>';
        currentSemesters
          .sort((a, b) => a.id - b.id)
          .forEach((sem) => {
            const opt = document.createElement('option');
            opt.value = sem.id;
            opt.textContent = sem.label || sem.name;
            select.appendChild(opt);
          });
      }
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
      const errorBox = document.getElementById('result-error');
      if (errorBox) errorBox.hidden = true;
      const lookupForm = document.getElementById('lookup-form');
      if (lookupForm) lookupForm.reset();
      window.MITSCaptcha?.refresh();
      document.getElementById('lookup')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    // Enrollment input: dynamically load semesters on blur or after typing
    const enrollmentInput = document.getElementById('enrollment-input');
    if (enrollmentInput) {
      enrollmentInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
      });

      // On blur: if enrollment looks valid, load dynamic semesters
      enrollmentInput.addEventListener('blur', () => {
        const val = enrollmentInput.value.trim().toUpperCase();
        if (val.length >= 8) {
          populateSemesterSelect(val);
        }
      });

      // On paste: trigger dynamic load
      enrollmentInput.addEventListener('paste', () => {
        setTimeout(() => {
          const val = enrollmentInput.value.trim().toUpperCase();
          if (val.length >= 8) {
            populateSemesterSelect(val);
          }
        }, 100);
      });
    }

    // Semester select: show loading hint
    const semesterSelect = document.getElementById('semester-select');
    if (semesterSelect) {
      semesterSelect.addEventListener('focus', () => {
        const enrollmentVal = enrollmentInput?.value?.trim().toUpperCase() || '';
        if (enrollmentVal.length >= 8 && semesterSelect.options.length <= 1) {
          populateSemesterSelect(enrollmentVal);
        }
      });
    }
  }

  window.MITSApp = { showToast, populateSemesterSelect, getGradePoint, gradePointDisplay, isNonCreditSubject };

  document.addEventListener('DOMContentLoaded', init);
})();
