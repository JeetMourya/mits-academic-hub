/**
 * MITS Academic Hub — CGPA Calculator, Percentage & Progress Card
 */
(function () {
  'use strict';

  const academic = window.MITSAcademic;

  function initCGPA() {
    const rowsContainer = document.getElementById('cgpa-rows');
    const addBtn = document.getElementById('cgpa-add-row');
    const resultEl = document.getElementById('cgpa-result');

    if (!rowsContainer || !academic) return;

    let rowCount = 0;

    function renderRow(index) {
      return `
        <div class="calc-row calc-row-compact" data-index="${index}">
          <span class="calc-label">Sem ${index + 1}</span>
          <input type="number" class="input calc-sgpa" placeholder="SGPA" min="0" max="10" step="0.01" aria-label="Semester SGPA">
          <input type="number" class="input calc-sem-credits" placeholder="Credits" min="1" max="30" step="1" aria-label="Semester credits">
          <button type="button" class="btn-icon calc-remove" aria-label="Remove semester" ${index === 0 ? 'hidden' : ''}>×</button>
        </div>`;
    }

    function getSemesters() {
      return Array.from(rowsContainer.querySelectorAll('.calc-row')).map((row) => ({
        sgpa: row.querySelector('.calc-sgpa')?.value || '',
        credits: row.querySelector('.calc-sem-credits')?.value || '',
      }));
    }

    function updateResult() {
      const result = academic.calculateCGPA(getSemesters());
      if (!resultEl) return;
      if (!result.valid) {
        resultEl.innerHTML = '<span class="result-placeholder">Enter semester data</span>';
        return;
      }
      const pct = academic.cgpaToPercentage(result.cgpa);
      resultEl.innerHTML = `
        <div class="result-value">${result.cgpa.toFixed(2)}</div>
        <div class="result-meta">${result.totalCredits} credits · ${result.semesterCount} semester${result.semesterCount === 1 ? '' : 's'} · ${pct}%</div>`;
    }

    function addRow() {
      rowsContainer.insertAdjacentHTML('beforeend', renderRow(rowCount));
      rowCount += 1;
    }

    rowsContainer.addEventListener('input', updateResult);
    rowsContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('.calc-remove');
      if (!btn || btn.hidden) return;
      btn.closest('.calc-row')?.remove();
      updateResult();
    });

    for (let i = 0; i < 3; i++) addRow();
    addBtn?.addEventListener('click', addRow);
  }

  function initPercentage() {
    const sgpaInput = document.getElementById('pct-sgpa');
    const formulaSelect = document.getElementById('pct-formula');
    const resultEl = document.getElementById('pct-result');

    function update() {
      if (!resultEl || !academic) return;
      const pct = academic.sgpaToPercentage(sgpaInput?.value, formulaSelect?.value || 'mits');
      if (pct === null) {
        resultEl.innerHTML = '<span class="result-placeholder">Enter SGPA/CGPA</span>';
        return;
      }
      resultEl.innerHTML = `
        <div class="result-value">${pct.toFixed(1)}%</div>
        <div class="result-meta">Using ${formulaSelect?.selectedOptions[0]?.textContent || 'MITS official formula'}</div>`;
    }

    sgpaInput?.addEventListener('input', update);
    formulaSelect?.addEventListener('change', update);
  }

  function initPredictor() {
    const currentCGPA = document.getElementById('pred-current-cgpa');
    const currentCredits = document.getElementById('pred-current-credits');
    const targetCGPA = document.getElementById('pred-target-cgpa');
    const remainingCredits = document.getElementById('pred-remaining-credits');
    const resultEl = document.getElementById('pred-result');
    const btn = document.getElementById('pred-calculate');

    function update() {
      const result = academic.predictCGPA(
        currentCGPA?.value,
        currentCredits?.value,
        targetCGPA?.value,
        remainingCredits?.value
      );
      if (!resultEl) return;
      if (!result.valid) {
        resultEl.innerHTML = '<span class="result-placeholder">Fill all fields</span>';
        return;
      }
      const cls = result.achievable ? 'result-success' : 'result-warning';
      resultEl.innerHTML = `
        <div class="result-value ${cls}">${result.requiredSGPA.toFixed(2)}</div>
        <div class="result-meta">${result.achievable ? 'Required SGPA per remaining semester' : 'Target may not be achievable (SGPA > 10)'}</div>`;
    }

    btn?.addEventListener('click', update);
    [currentCGPA, currentCredits, targetCGPA, remainingCredits].forEach((el) => {
      el?.addEventListener('input', update);
    });
  }

  function initProgressCard() {
    const nameInput = document.getElementById('progress-name');
    const branchInput = document.getElementById('progress-branch');
    const enrollmentInput = document.getElementById('progress-enrollment');
    const cgpaInput = document.getElementById('progress-cgpa');
    const cardEl = document.getElementById('progress-card-preview');
    const downloadBtn = document.getElementById('progress-download');

    function escapeHtml(str) {
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    }

    function renderCard() {
      if (!cardEl) return;
      const name = nameInput?.value || 'Student Name';
      const branch = branchInput?.value || 'Branch';
      const enrollment = enrollmentInput?.value || 'Enrollment No.';
      const cgpa = cgpaInput?.value || '—';
      const pct = cgpa !== '—' && academic ? academic.cgpaToPercentage(cgpa) : null;

      cardEl.innerHTML = `
        <div class="progress-card-inner">
          <div class="progress-card-header">
            <div class="progress-card-logo">MITS</div>
            <div class="progress-card-title">Academic Progress Card</div>
          </div>
          <div class="progress-card-body">
            <div class="progress-card-field"><span>Name</span><strong>${escapeHtml(name)}</strong></div>
            <div class="progress-card-field"><span>Branch</span><strong>${escapeHtml(branch)}</strong></div>
            <div class="progress-card-field"><span>Enrollment</span><strong>${escapeHtml(enrollment)}</strong></div>
            <div class="progress-card-cgpa">
              <span>Current CGPA</span>
              <strong>${escapeHtml(String(cgpa))}</strong>
            </div>
            ${pct !== null ? `<div class="progress-card-field"><span>Percentage</span><strong>${pct}%</strong></div>` : ''}
          </div>
          <div class="progress-card-footer">MITS Academic Hub · ${new Date().getFullYear()}</div>
        </div>`;
    }

    [nameInput, branchInput, enrollmentInput, cgpaInput].forEach((el) => {
      el?.addEventListener('input', renderCard);
    });

    downloadBtn?.addEventListener('click', () => {
      renderCard();
      const content = cardEl?.innerText || '';
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mits-progress-${enrollmentInput?.value || 'card'}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    });

    renderCard();
  }

  function initToolTabs() {
    const tabs = document.querySelectorAll('[data-tool-tab]');
    const panels = document.querySelectorAll('[data-tool-panel]');

    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const target = tab.dataset.toolTab;
        tabs.forEach((t) => {
          t.classList.toggle('active', t === tab);
          t.setAttribute('aria-selected', String(t === tab));
        });
        panels.forEach((p) => p.classList.toggle('active', p.dataset.toolPanel === target));
      });
    });
  }

  function init() {
    initToolTabs();
    initCGPA();
    initPercentage();
    initPredictor();
    initProgressCard();
  }

  window.MITSCGPA = {
    init,
    calculateCGPA: academic?.calculateCGPA,
    sgpaToPercentage: academic?.sgpaToPercentage,
    cgpaToPercentage: academic?.cgpaToPercentage,
    predictCGPA: academic?.predictCGPA,
  };
})();
