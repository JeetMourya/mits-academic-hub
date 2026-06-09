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
const {
  getBatchFromEnrollment,
  getAllSemesters,
  buildIumsUrl,
  getAvailableSemesters,
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

// Subjects that are typically non-credit at MITS (case-insensitive check)
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
router.post('/fetch', async (req, res) => {
  try {
    const { enrollmentNumber, semesterNumber } = req.body;

    if (!enrollmentNumber || !semesterNumber) {
      return res.status(400).json({
        success: false,
        message: 'Enrollment number and semester number are required',
      });
    }

    // Clean enrollment number
    let cleanedEnrollment = enrollmentNumber.toUpperCase().trim();
    // Auto-normalize: BTIT format with '0' at index 6 → 'O'
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

    const fullUrl = buildIumsUrl(cleanedEnrollment, semNum);
    console.log(`[RESULT-FETCH] Batch=${batchYear} Sem=${semNum} URL=${fullUrl}`);

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
    }));

    // Save to DB (non-blocking)
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

      const existingResult = student.results.find(
        (r) => r.semesterNumber === semNum
      );

      if (existingResult) {
        existingResult.sgpa = fetchResult.data.sgpa;
        existingResult.subjects = subjectsWithGrading;
        existingResult.fetchedAt = new Date();
      } else {
        student.results.push({
          semesterNumber: semNum,
          sgpa: fetchResult.data.sgpa,
          subjects: subjectsWithGrading,
          fetchedAt: new Date(),
        });
      }

      student.searchHistory.push({
        semesterId: String(semNum),
        semesterName: `Semester ${semNum}`,
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
