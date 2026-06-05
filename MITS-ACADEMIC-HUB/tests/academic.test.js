/**
 * MITS Academic Hub — Academic Formula Validation Tests
 * Run: npm test
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const academic = require('../js/academic.js');

describe('MITS-DU Grade Points', () => {
  it('maps official grades to correct points', () => {
    assert.equal(academic.parseGrade('AAA'), 10);
    assert.equal(academic.parseGrade('AA'), 9);
    assert.equal(academic.parseGrade('A'), 8);
    assert.equal(academic.parseGrade('B+'), 7);
    assert.equal(academic.parseGrade('B'), 6);
    assert.equal(academic.parseGrade('C'), 5);
    assert.equal(academic.parseGrade('D'), 4);
    assert.equal(academic.parseGrade('FL'), 0);
    assert.equal(academic.parseGrade('IL'), 0);
    assert.equal(academic.parseGrade('WL'), 0);
  });

  it('treats D as minimum passing grade', () => {
    assert.equal(academic.isPassingGrade('D'), true);
    assert.equal(academic.isPassingGrade('FL'), false);
    assert.equal(academic.isPassingGrade('C'), true);
  });
});

describe('SGPA Calculator', () => {
  it('calculates SGPA using Σ(Credit × Grade Point) / Σ(Credits)', () => {
    const result = academic.calculateSGPA([
      { credits: 4, grade: 'AA' },
      { credits: 3, grade: 'A' },
    ]);
    assert.equal(result.valid, true);
    assert.equal(result.totalCredits, 7);
    assert.equal(result.sgpa, 8.57);
  });

  it('returns invalid when no valid subjects', () => {
    const result = academic.calculateSGPA([]);
    assert.equal(result.valid, false);
  });

  it('skips rows with missing credits or grades', () => {
    const result = academic.calculateSGPA([
      { credits: 4, grade: 'AA' },
      { credits: '', grade: 'A' },
      { credits: 3, grade: '' },
    ]);
    assert.equal(result.valid, true);
    assert.equal(result.sgpa, 9);
    assert.equal(result.totalCredits, 4);
  });
});

describe('CGPA Calculator', () => {
  it('calculates weighted CGPA — not simple average', () => {
    const result = academic.calculateCGPA([
      { sgpa: 8, credits: 20 },
      { sgpa: 7, credits: 22 },
    ]);
    const simpleAvg = (8 + 7) / 2;
    const weighted = (8 * 20 + 7 * 22) / (20 + 22);

    assert.equal(result.valid, true);
    assert.equal(result.cgpa, academic.roundTo(weighted, 2));
    assert.notEqual(result.cgpa, academic.roundTo(simpleAvg, 2));
  });

  it('matches official example weighting pattern', () => {
    const result = academic.calculateCGPA([
      { sgpa: 9, credits: 4 },
      { sgpa: 8, credits: 3 },
    ]);
    assert.equal(result.cgpa, 8.57);
    assert.equal(result.totalCredits, 7);
  });
});

describe('Percentage Calculator', () => {
  it('uses MITS official formula: Percentage = CGPA × 10', () => {
    assert.equal(academic.cgpaToPercentage(7.45), 74.5);
    assert.equal(academic.cgpaToPercentage(8.5), 85);
  });

  it('defaults sgpaToPercentage to CGPA × 10', () => {
    assert.equal(academic.sgpaToPercentage(7.45, 'mits'), 74.5);
    assert.equal(academic.sgpaToPercentage(7.45, 'linear'), 74.5);
  });
});

describe('CGPA Predictor', () => {
  it('computes required SGPA for remaining credits', () => {
    const result = academic.predictCGPA(7.5, 60, 8.0, 40);
    assert.equal(result.valid, true);
    assert.equal(result.achievable, true);
    assert.equal(result.requiredSGPA, 8.75);
  });

  it('flags unachievable targets above 10 SGPA', () => {
    const result = academic.predictCGPA(6, 20, 9.5, 10);
    assert.equal(result.valid, true);
    assert.equal(result.achievable, false);
    assert.ok(result.requiredSGPA > 10);
  });
});
