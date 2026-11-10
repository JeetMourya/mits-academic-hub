/**
 * Results Routes - MITS Academic Hub
 * Dynamic batch-aware semester generation for all future batches.
 */
const express = require('express');
const path = require('path');
const fs = require('fs');
const Student = require('../models/Student');
const Semester = require('../models/Semester');
const ResultFetcher = require('../utils/ResultFetcher');
const rateLimit = require('express-rate-limit');
const academic = require('../../js/academic.js');
const {
  getBatchFromEnrollment,
  getAllSemesters,
  buildIumsUrl,
  getAvailableSemesters,
  resolveExamSession,
} = require('../utils/batchHelper');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const resultFetcher = new ResultFetcher();

/**
 * MITS Official Grading Scale (as per actual IUMS):
 *   AAA  → 10
 *   AA   → 9
 *   A    → 8
 *   B+   → 7
 *   B    → 6
 *   C    → 5
 *   D    → 4
 *   F    → 0 (Fail)
 *   Non-credit subjects (like NSS/NCC/etc.) → "N/A" (no grade point)
 */
// Single source of truth: js/academic.js (FL / IL / WL = 0 included).
const GRADE_POINT_MAP = Object.freeze({
  ...academic.GRADE_POINTS,
  F: 0,
  FAIL: 0,
  ABSENT: 0,
  ABS: 0,
  AB: 0,
});

// Subjects that are typically non-credit at MITS (case-insensitive check)
const NON_CREDIT_KEYWORDS = [
  'NSS', 'NCC', 'YOGA', 'SPORTS', 'HOLISTIC',
  'NON-CREDIT', 'AUDIT', 'HSS',
];

function getGradePoint(grade) {
  const g = academic.normalizeGrade(grade == null ? '' : grade);
  if (!g) return undefined;
  return GRADE_POINT_MAP[g];
}

function isNonCreditSubject(subjectName, subjectCode) {
  const combined = `${subjectName || ''} ${subjectCode || ''}`.toUpperCase();
  return NON_CREDIT_KEYWORDS.some((kw) => combined.includes(kw));
}

function gradePointDisplay(grade, subjectName, subjectCode) {
  // Non-credit subjects have no grade point
  if (isNonCreditSubject(subjectName, subjectCode)) {
    return 'N/A';
  }
  const gp = getGradePoint(grade);
  if (gp === undefined) {
    // Unknown grade — could be non-standard. Return 'N/A' to be safe.
    return 'N/A';
  }
  return gp.toString();
}

/**
 * Load links.json as fallback (legacy, eventually deprecated).
 */
function loadLinksJson() {
  try {
    const filePath = path.join(__dirname, '..', '..', 'data', 'links.json');
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.warn('Could not load links.json:', err.message);
    return { semesters: [] };
  }
}

// ============================================================================
// GET /semesters/dynamic — Generate semesters from enrollment (NEW)
// ============================================================================
router.get('/semesters/dynamic', (req, res) => {
  try {
    const { enrollment } = req.query;

    if (!enrollment) {
      return res.status(400).json({
        success: false,
        message: 'Enrollment number is required as query parameter',
      });
    }

    const cleaned = String(enrollment).toUpperCase().trim();
    let batchYear;
    try {
      batchYear = getBatchFromEnrollment(cleaned);
    } catch {
      return res.status(400).json({
        success: false,
        message: 'Invalid enrollment format. Cannot detect batch year.',
      });
    }

    const allSemesters = getAllSemesters(cleaned);
    const availableSemesters = getAvailableSemesters(cleaned);

    res.json({
      success: true,
      data: {
        batchYear,
        enrollment: cleaned,
        allSemesters,
        availableSemesters,
      },
    });
  } catch (error) {
    console.error('Dynamic semester error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate semesters',
    });
  }
});

// ============================================================================
// POST /fetch — Fetch results from IUMS
// ============================================================================
const fetchLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.FETCH_RATE_LIMIT_MAX, 10) || 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many result requests. Please wait a few minutes and try again.' },
});

router.post('/fetch', fetchLimiter, async (req, res) => {
  try {
    const { enrollmentNumber, semesterNumber } = req.body || {};
    const examType = String((req.body && req.body.examType) || 'Regular').trim();

    if (!enrollmentNumber || !semesterNumber) {
      return res.status(400).json({
        success: false,
        message: 'Enrollment number and semester number are required',
      });
    }

    // Clean enrollment number
    let cleanedEnrollment = String(enrollmentNumber).toUpperCase().trim();
    // Auto-normalize: BTIT format with '0' at index 6 -> 'O'
    if (/^BT[A-Z]{2}\d{2}[0O]\d{4}$/.test(cleanedEnrollment)) {
      if (cleanedEnrollment.charAt(6) === '0') {
        cleanedEnrollment = cleanedEnrollment.substring(0, 6) + 'O' + cleanedEnrollment.substring(7);
      }
    }

    const semNum = parseInt(semesterNumber, 10);
    if (isNaN(semNum) || semNum < 1 || semNum > 8) {
      return res.status(400).json({
        success: false,
        message: 'Semester number must be between 1 and 8',
      });
    }

    let batchYear;
    try {
      batchYear = getBatchFromEnrollment(cleanedEnrollment);
    } catch {
      return res.status(400).json({
        success: false,
        message: 'Could not detect batch year from enrollment. Expected format: BTIT<YY>O...',
      });
    }

    if (!['Regular', 'Ex'].includes(examType)) {
      return res.status(400).json({
        success: false,
        message: 'Exam type must be Regular or Ex',
      });
    }

    // Session code comes ONLY from trusted server-side rules.
    const resolved = resolveExamSession(batchYear, semNum, examType);
    if (!resolved.ok) {
      return res.status(400).json({ success: false, message: resolved.message });
    }
    const sessionCode = resolved.sessionCode;

    // A browser-supplied session code is never used; reject mismatches loudly.
    const clientSession = req.body.sessionCode ? String(req.body.sessionCode).trim() : '';
    if (clientSession && clientSession !== sessionCode) {
      return res.status(400).json({
        success: false,
        message: 'Custom session codes are not accepted. The server selects the verified session.',
      });
    }

    const urlObject = new URL(buildIumsUrl(cleanedEnrollment, semNum));
    urlObject.searchParams.set('U4bJdzw70jtQ5d', sessionCode);
    const fullUrl = urlObject.toString();

    console.log(
      `[RESULT-FETCH] Batch=${batchYear} Sem=${semNum} Type=${examType} Session=${sessionCode}`
    );

// Fetch from IUMS
    let fetchResult;
    try {
      fetchResult = await resultFetcher.fetchFromUrl(fullUrl);
    } catch (fetchError) {
      console.error('IUMS fetch failed:', fetchError.message);
      return res.status(502).json({
        success: false,
        message: 'The MITS IUMS server is temporarily unreachable. Please try again.',
      });
    }

    if (!fetchResult.success) {
      return res.status(404).json({
        success: false,
        message: fetchResult.error || 'No result found.',
      });
    }

    // Grade points with proper mapping
    const subjectsWithGrading = (fetchResult.data.subjects || []).map((sub) => ({
      code: sub.code || '',
      name: sub.name || '',
      grade: sub.grade || '',
      gradePoint: gradePointDisplay(sub.grade, sub.name, sub.code),
      isNonCredit: isNonCreditSubject(sub.name, sub.code),
      passed: academic.isPassingGrade(sub.grade),
    }));

    // Save to DB (non-blocking)
    let savedAttempt = 1;
    try {
      let student = await Student.findOne({ enrollmentNumber: cleanedEnrollment });

      if (!student) {
        student = new Student({
          enrollmentNumber: cleanedEnrollment,
          name: fetchResult.data.studentName,
        });
      } else if (fetchResult.data.studentName) {
        student.name = fetchResult.data.studentName;
      }

      const existingResult = student.results.find((r) => {
        const savedType = r.examType || 'Regular';
        const savedSession = r.sessionCode || '';
        return (
          r.semesterNumber === semNum &&
          savedType === examType &&
          (savedSession === sessionCode ||
            (examType === 'Regular' && !savedSession))
        );
      });

      if (existingResult) {
        existingResult.sgpa = fetchResult.data.sgpa;
        existingResult.subjects = subjectsWithGrading;
        existingResult.examType = examType;
        existingResult.sessionCode = sessionCode;
        existingResult.resultStatus = fetchResult.data.status || '';
        existingResult.directUrl = fullUrl;
        existingResult.fetchedAt = new Date();
        savedAttempt = Number(existingResult.attemptNumber || 1);
      } else {
        const previousAttempts = student.results
          .filter((r) => r.semesterNumber === semNum)
          .map((r) => Number(r.attemptNumber || 1));

        savedAttempt = previousAttempts.length
          ? Math.max(...previousAttempts) + 1
          : 1;
        student.results.push({
          semesterNumber: semNum,
          examType,
          attemptNumber: savedAttempt,
          sessionCode,
          resultStatus: fetchResult.data.status || '',
          directUrl: fullUrl,
          sgpa: fetchResult.data.sgpa,
          subjects: subjectsWithGrading,
          fetchedAt: new Date(),
        });
      }

student.searchHistory.push({
        semesterId: String(semNum),
        semesterName: `Semester ${semNum} (${examType})`,
        fetchedAt: new Date(),
      });

      student.lastResultFetch = new Date();
      await student.save();
    } catch (dbErr) {
      console.warn('DB save skipped:', dbErr.message);
    }

    res.json({
      success: true,
      message: 'Result fetched successfully',
      data: {
        studentName: fetchResult.data.studentName,
        enrollmentNumber: fetchResult.data.enrollmentNumber || cleanedEnrollment,
        batchYear,
        semester: semNum,
        examType,
        attemptNumber: savedAttempt,
        sessionCode,
        sgpa: fetchResult.data.sgpa,
        status: fetchResult.data.status,
        subjects: subjectsWithGrading,
        directUrl: fullUrl,
        fetchedAt: new Date(),
      },
    });
  } catch (error) {
    console.error('Result fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch result. Please try again.',
    });
  }
});

// ============================================================================
// GET /student/:enrollmentNumber — Admin: Student result history
// ============================================================================
router.get('/student/:enrollmentNumber', authenticate, async (req, res) => {
  try {
    const student = await Student.findOne({
      enrollmentNumber: req.params.enrollmentNumber.toUpperCase(),
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    res.json({
      success: true,
      data: {
        enrollmentNumber: student.enrollmentNumber,
        name: student.name,
        results: student.results,
        searchHistory: student.searchHistory,
        lastResultFetch: student.lastResultFetch,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch student results',
    });
  }
});

// ============================================================================
// GET /semesters — List active semesters (legacy, kept for admin panel)
// ============================================================================
router.get('/semesters', async (req, res) => {
  try {
    let semesters = [];
    try {
      semesters = await Semester.find({ isActive: true })
        .select('_id name semesterNumber resultUrl description')
        .sort({ semesterNumber: 1 });
    } catch {
      // DB might not be connected
    }

    if (!semesters || semesters.length === 0) {
      const linksData = loadLinksJson();
      semesters = linksData.semesters
        .filter((s) => s.active !== false)
        .map((s) => ({
          _id: s.id,
          name: s.name,
          semesterNumber: s.id,
          resultUrl: s.urlTemplate,
          description: s.session || '',
        }));
    }

    res.json({
      success: true,
      data: semesters,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch semesters',
    });
  }
});

module.exports = router;
module.exports.GRADE_POINT_MAP = GRADE_POINT_MAP;
module.exports.getGradePoint = getGradePoint;
module.exports.isNonCreditSubject = isNonCreditSubject;
module.exports.gradePointDisplay = gradePointDisplay;
