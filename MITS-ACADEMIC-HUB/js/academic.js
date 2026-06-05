/**
 * MITS Academic Hub — Official MITS-DU Academic Rules
 * Shared grade points and calculation formulas (browser + Node).
 */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.MITSAcademic = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  /** MITS-DU official grade points */
  const GRADE_POINTS = {
    AAA: 10,
    AA: 9,
    A: 8,
    'B+': 7,
    B: 6,
    C: 5,
    D: 4,
    FL: 0,
    IL: 0,
    WL: 0,
  };

  const PASSING_GRADE = 'D';
  const MIN_PASSING_POINTS = GRADE_POINTS[PASSING_GRADE];

  /** Legacy aliases mapped to official grades */
  const GRADE_ALIASES = {
    O: 'AAA',
    'A+': 'AA',
    P: 'D',
    F: 'FL',
    FAIL: 'FL',
    ABS: 'IL',
    AB: 'IL',
  };

  const GRADE_OPTIONS = [
    { value: 'AAA', label: 'AAA (10)' },
    { value: 'AA', label: 'AA (9)' },
    { value: 'A', label: 'A (8)' },
    { value: 'B+', label: 'B+ (7)' },
    { value: 'B', label: 'B (6)' },
    { value: 'C', label: 'C (5)' },
    { value: 'D', label: 'D (4) — Min Pass' },
    { value: 'FL', label: 'FL (0)' },
    { value: 'IL', label: 'IL (0)' },
    { value: 'WL', label: 'WL (0)' },
  ];

  function normalizeGrade(value) {
    const raw = String(value).trim().toUpperCase();
    if (!raw) return '';
    return GRADE_ALIASES[raw] || raw;
  }

  function parseGrade(value) {
    const normalized = normalizeGrade(value);
    if (normalized in GRADE_POINTS) return GRADE_POINTS[normalized];
    const num = parseFloat(normalized);
    if (!Number.isNaN(num) && num >= 0 && num <= 10) return num;
    return null;
  }

  function isPassingGrade(value) {
    const normalized = normalizeGrade(value);
    if (!normalized) return null;
    if (normalized in GRADE_POINTS) {
      return GRADE_POINTS[normalized] >= MIN_PASSING_POINTS;
    }
    const points = parseGrade(value);
    if (points === null) return null;
    return points >= MIN_PASSING_POINTS;
  }

  /**
   * SGPA = Σ(Credit × Grade Point) / Σ(Credits)
   */
  function calculateSGPA(subjects) {
    if (!subjects?.length) {
      return { sgpa: 0, totalCredits: 0, valid: false, subjectCount: 0 };
    }

    let totalPoints = 0;
    let totalCredits = 0;
    let subjectCount = 0;

    for (const sub of subjects) {
      const credits = parseFloat(sub.credits);
      const grade = parseGrade(sub.grade);
      if (Number.isNaN(credits) || credits <= 0 || grade === null) continue;
      totalPoints += credits * grade;
      totalCredits += credits;
      subjectCount += 1;
    }

    if (totalCredits === 0) {
      return { sgpa: 0, totalCredits: 0, valid: false, subjectCount: 0 };
    }

    return {
      sgpa: roundTo(totalPoints / totalCredits, 2),
      totalCredits,
      valid: true,
      subjectCount,
    };
  }

  /**
   * CGPA = Σ(SGPA × Semester Credits) / Σ(Semester Credits)
   * Weighted by semester credits — not a simple average.
   */
  function calculateCGPA(semesters) {
    if (!semesters?.length) {
      return { cgpa: 0, totalCredits: 0, valid: false, semesterCount: 0 };
    }

    let totalPoints = 0;
    let totalCredits = 0;
    let semesterCount = 0;

    for (const sem of semesters) {
      const sgpa = parseFloat(sem.sgpa);
      const credits = parseFloat(sem.credits);
      if (Number.isNaN(sgpa) || Number.isNaN(credits) || credits <= 0) continue;
      totalPoints += sgpa * credits;
      totalCredits += credits;
      semesterCount += 1;
    }

    if (totalCredits === 0) {
      return { cgpa: 0, totalCredits: 0, valid: false, semesterCount: 0 };
    }

    return {
      cgpa: roundTo(totalPoints / totalCredits, 2),
      totalCredits,
      valid: true,
      semesterCount,
    };
  }

  /**
   * MITS-DU official: Percentage = CGPA × 10
   */
  function cgpaToPercentage(cgpa) {
    const val = parseFloat(cgpa);
    if (Number.isNaN(val) || val < 0) return null;
    return roundTo(val * 10, 1);
  }

  function sgpaToPercentage(sgpa, formula) {
    const val = parseFloat(sgpa);
    if (Number.isNaN(val)) return null;

    switch (formula) {
      case 'cbse':
        return roundTo(val * 9.5, 1);
      case 'mits':
      case 'linear':
      default:
        return cgpaToPercentage(val);
    }
  }

  /**
   * Required SGPA for remaining credits to reach target CGPA.
   * requiredSGPA = (targetCGPA × totalCredits − currentCGPA × completedCredits) / remainingCredits
   */
  function predictCGPA(currentCGPA, currentCredits, targetCGPA, remainingCredits) {
    const cg = parseFloat(currentCGPA);
    const cc = parseFloat(currentCredits);
    const tg = parseFloat(targetCGPA);
    const rc = parseFloat(remainingCredits);

    if ([cg, cc, tg, rc].some((v) => Number.isNaN(v)) || cc < 0 || rc <= 0) {
      return { requiredSGPA: null, valid: false, achievable: false };
    }

    const requiredPoints = tg * (cc + rc) - cg * cc;
    const requiredSGPA = requiredPoints / rc;

    return {
      requiredSGPA: roundTo(requiredSGPA, 2),
      achievable: requiredSGPA <= 10 && requiredSGPA >= 0,
      valid: true,
    };
  }

  function roundTo(value, decimals) {
    const factor = 10 ** decimals;
    return Math.round(value * factor) / factor;
  }

  return {
    GRADE_POINTS,
    GRADE_OPTIONS,
    PASSING_GRADE,
    MIN_PASSING_POINTS,
    normalizeGrade,
    parseGrade,
    isPassingGrade,
    calculateSGPA,
    calculateCGPA,
    cgpaToPercentage,
    sgpaToPercentage,
    predictCGPA,
    roundTo,
  };
});
