/**
 * MITS Academic Hub — SGPA Calculator
 */
(function () {
  'use strict';

  const academic = window.MITSAcademic;

  function renderGradeOptions() {
    return academic.GRADE_OPTIONS.map(
      (g) => `<option value="${g.value}">${g.label}</option>`
    ).join('');
  }

  function renderRow(index) {
    return `
      <div class="calc-row" data-index="${index}">
        <input type="text" class="input calc-subject" placeholder="Subject ${index + 1}" aria-label="Subject name">
        <input type="number" class="input calc-credits" placeholder="Cr" min="1" max="10" step="1" aria-label="Credits">
        <select class="input calc-grade" aria-label="Grade">
          <option value="">Grade</option>
          ${renderGradeOptions()}
        </select>
        <button type="button" class="btn-icon calc-remove" aria-label="Remove subject" ${index === 0 ? 'hidden' : ''}>×</button>
      </div>`;
  }

  function getSubjects(container) {
    return Array.from(container.querySelectorAll('.calc-row')).map((row) => ({
      name: row.querySelector('.calc-subject')?.value || '',
      credits: row.querySelector('.calc-credits')?.value || '',
      grade: row.querySelector('.calc-grade')?.value || '',
    }));
  }

  function init(containerId) {
    const rowsContainer = document.getElementById('sgpa-rows');
    const resultEl = document.getElementById('sgpa-result');
    const addBtn = document.getElementById('sgpa-add-row');
    const calcBtn = document.getElementById('sgpa-calculate');

    if (!rowsContainer || !academic) return;

    let rowCount = 0;

    function updateResult() {
      const result = academic.calculateSGPA(getSubjects(rowsContainer));
      if (!resultEl) return;
      if (!result.valid) {
        resultEl.innerHTML = '<span class="result-placeholder">Enter subjects to calculate SGPA</span>';
        return;
      }
      resultEl.innerHTML = `
        <div class="result-value">${result.sgpa.toFixed(2)}</div>
        <div class="result-meta">${result.totalCredits} total credits · ${result.subjectCount} subject${result.subjectCount === 1 ? '' : 's'}</div>`;
    }

    function addRow() {
      rowsContainer.insertAdjacentHTML('beforeend', renderRow(rowCount));
      rowCount += 1;
    }

    rowsContainer.addEventListener('input', updateResult);
    rowsContainer.addEventListener('change', updateResult);
    rowsContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('.calc-remove');
      if (!btn || btn.hidden) return;
      btn.closest('.calc-row')?.remove();
      updateResult();
    });

    for (let i = 0; i < 5; i++) addRow();

    addBtn?.addEventListener('click', addRow);
    calcBtn?.addEventListener('click', updateResult);
  }

  window.MITSSGPA = {
    init,
    calculate: academic?.calculateSGPA,
    GRADE_POINTS: academic?.GRADE_POINTS,
  };
})();
