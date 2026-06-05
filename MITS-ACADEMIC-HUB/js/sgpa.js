/**
 * MITS Academic Hub — SGPA Calculator
 */
(function () {
  'use strict';

  const GRADE_POINTS = {
    O: 10, 'A+': 9, A: 8, 'B+': 7, B: 6, C: 5, P: 4, F: 0,
  };

  function parseGrade(value) {
    const normalized = String(value).trim().toUpperCase();
    if (normalized in GRADE_POINTS) return GRADE_POINTS[normalized];
    const num = parseFloat(normalized);
    if (!isNaN(num) && num >= 0 && num <= 10) return num;
    return null;
  }

  function calculate(subjects) {
    if (!subjects.length) return { sgpa: 0, totalCredits: 0, valid: false };

    let totalPoints = 0;
    let totalCredits = 0;

    for (const sub of subjects) {
      const credits = parseFloat(sub.credits);
      const grade = parseGrade(sub.grade);
      if (isNaN(credits) || credits <= 0 || grade === null) continue;
      totalPoints += credits * grade;
      totalCredits += credits;
    }

    if (totalCredits === 0) return { sgpa: 0, totalCredits: 0, valid: false };

    return {
      sgpa: Math.round((totalPoints / totalCredits) * 100) / 100,
      totalCredits,
      valid: true,
    };
  }

  function renderRow(index) {
    return `
      <div class="calc-row" data-index="${index}">
        <input type="text" class="input calc-subject" placeholder="Subject ${index + 1}" aria-label="Subject name">
        <input type="number" class="input calc-credits" placeholder="Cr" min="1" max="10" step="1" aria-label="Credits">
        <select class="input calc-grade" aria-label="Grade">
          <option value="">Grade</option>
          <option value="O">O (10)</option>
          <option value="A+">A+ (9)</option>
          <option value="A">A (8)</option>
          <option value="B+">B+ (7)</option>
          <option value="B">B (6)</option>
          <option value="C">C (5)</option>
          <option value="P">P (4)</option>
          <option value="F">F (0)</option>
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
    const container = document.getElementById(containerId);
    const rowsContainer = document.getElementById('sgpa-rows');
    const resultEl = document.getElementById('sgpa-result');
    const addBtn = document.getElementById('sgpa-add-row');
    const calcBtn = document.getElementById('sgpa-calculate');

    if (!rowsContainer) return;

    let rowCount = 0;

    function addRow() {
      rowsContainer.insertAdjacentHTML('beforeend', renderRow(rowCount));
      rowCount++;
      bindRemoveButtons();
    }

    function bindRemoveButtons() {
      rowsContainer.querySelectorAll('.calc-remove').forEach((btn) => {
        btn.onclick = () => {
          btn.closest('.calc-row')?.remove();
          updateResult();
        };
      });
      rowsContainer.querySelectorAll('input, select').forEach((el) => {
        el.addEventListener('input', updateResult);
        el.addEventListener('change', updateResult);
      });
    }

    function updateResult() {
      const result = calculate(getSubjects(rowsContainer));
      if (!resultEl) return;
      if (!result.valid) {
        resultEl.innerHTML = '<span class="result-placeholder">Enter subjects to calculate SGPA</span>';
        return;
      }
      resultEl.innerHTML = `
        <div class="result-value">${result.sgpa.toFixed(2)}</div>
        <div class="result-meta">${result.totalCredits} total credits</div>`;
    }

    for (let i = 0; i < 5; i++) addRow();

    addBtn?.addEventListener('click', addRow);
    calcBtn?.addEventListener('click', updateResult);
  }

  window.MITSSGPA = { init, calculate, GRADE_POINTS };
})();
