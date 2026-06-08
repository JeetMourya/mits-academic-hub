/**
 * Results Routes - MITS Academic Hub
 */
const express = require('express');
const path = require('path');
const fs = require('fs');
const Student = require('../models/Student');
const Semester = require('../models/Semester');
const ResultFetcher = require('../utils/ResultFetcher');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const resultFetcher = new ResultFetcher();

// Load semester config from links.json as fallback
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

// Find semester config - first check DB, then fallback to links.json
async function findSemesterConfig(semesterId) {
  const semNum = parseInt(semesterId, 10);

  // Try MongoDB first
  try {
    const dbSemester = await Semester.findOne({ semesterNumber: semNum, isActive: true });
    if (dbSemester) {
      return {
        source: 'database',
        id: dbSemester._id,
        name: dbSemester.name,
        semesterNumber: dbSemester.semesterNumber,
        resultUrl: dbSemester.resultUrl,
        urlTemplate: dbSemester.urlTemplate || dbSemester.resultUrl,
        dbRecord: dbSemester,
      };
    }
  } catch {
    // MongoDB might not be connected, continue to fallback
  }

  // Fallback to links.json
  const linksData = loadLinksJson();
  const jsonSemester = linksData.semesters.find(
    (s) => s.id === semNum && s.active !== false
  );

  if (jsonSemester) {
    return {
      source: 'json',
      id: jsonSemester.id,
      name: jsonSemester.name || `Semester ${semNum}`,
      semesterNumber: semNum,
      resultUrl: jsonSemester.urlTemplate || '',
      urlTemplate: jsonSemester.urlTemplate || '',
      dbRecord: null,
    };
  }

  return null;
}

// ============================================================================
// GET RESULTS - PUBLIC ENDPOINT (for students)
// ============================================================================

router.post('/fetch', async (req, res) => {
  try {
    const { enrollmentNumber, semesterId } = req.body;

    // Validation
    if (!enrollmentNumber || !semesterId) {
      return res.status(400).json({
        success: false,
        message: 'Enrollment number and semester ID are required',
      });
    }

    // Clean enrollment number: convert to uppercase, trim, and normalize B.Tech '0' -> 'O' typos
    let cleanedEnrollment = enrollmentNumber.toUpperCase().trim();
    if (/^BT[A-Z]{2}\d{2}[0O]\d{4}$/.test(cleanedEnrollment)) {
      if (cleanedEnrollment.charAt(6) === '0') {
        cleanedEnrollment = cleanedEnrollment.substring(0, 6) + 'O' + cleanedEnrollment.substring(7);
      }
    }

   // Generate URL dynamically from enrollment number

function getSession(semester, batchYear) {
  const year = 2000 + batchYear;

  if (semester % 2 === 1) {
    return `11${year + Math.floor((semester - 1) / 2)}`;
  }

  return `04${year + (semester / 2)}`;
}

const batchYear = parseInt(
  cleanedEnrollment.substring(4, 6),
  10
);

const session = getSession(
  parseInt(semesterId, 10),
  batchYear
);

const fullUrl =
  `https://iums.mitsgwalior.in/ViewSC.aspx?` +
  `U2bJdzw70jtQ3d=${encodeURIComponent(cleanedEnrollment)}` +
  `&U3bJdzw70jtQ4d=${semesterId}` +
  `&U4bJdzw70jtQ5d=${session}`;

const semesterConfig = {
  semesterNumber: parseInt(semesterId, 10),
  name: `Semester ${semesterId}`,
  id: semesterId,
  dbRecord: null
};

console.log('Generated URL:', fullUrl);
    // Fetch results from IUMS
    let fetchResult;
    try {
      fetchResult = await resultFetcher.fetchFromUrl(fullUrl);
    } catch (fetchError) {
      console.error('IUMS fetch failed:', fetchError.message);
      return res.status(502).json({
        success: false,
        message: 'The MITS IUMS server is temporarily unreachable or taking too long to respond. Please try again in a moment.',
      });
    }

    if (!fetchResult.success) {
      return res.status(404).json({
        success: false,
        message: fetchResult.error || 'No result found for this enrollment number in the selected semester.',
      });
    }

    // Try to save to DB (non-blocking, don't fail if DB is down)
    try {
      let student = await Student.findOne({ enrollmentNumber: cleanedEnrollment });

      if (!student) {
        student = new Student({
          enrollmentNumber: cleanedEnrollment,
          name: fetchResult.data.studentName,
        });
      }

      // Add/update result
      const existingResult = student.results.find(
        (r) => r.semesterNumber === semesterConfig.semesterNumber
      );
      if (existingResult) {
        existingResult.sgpa = fetchResult.data.sgpa;
        existingResult.subjects = fetchResult.data.subjects;
        existingResult.fetchedAt = new Date();
      } else {
        student.results.push({
          semesterNumber: semesterConfig.semesterNumber,
          sgpa: fetchResult.data.sgpa,
          subjects: fetchResult.data.subjects,
          fetchedAt: new Date(),
        });
      }

      student.searchHistory.push({
        semesterId: semesterConfig.id,
        semesterName: semesterConfig.name,
        fetchedAt: new Date(),
      });

      student.lastResultFetch = new Date();
      await student.save();

      // Update semester stats if from DB
      if (semesterConfig.dbRecord) {
        semesterConfig.dbRecord.resultsFetched += 1;
        await semesterConfig.dbRecord.save();
      }
    } catch (dbErr) {
      console.warn('DB save skipped:', dbErr.message);
    }

    res.json({
      success: true,
      message: 'Result fetched successfully',
      data: {
        studentName: fetchResult.data.studentName,
        enrollmentNumber: fetchResult.data.enrollmentNumber || cleanedEnrollment,
        semester: semesterConfig.semesterNumber,
        sgpa: fetchResult.data.sgpa,
        status: fetchResult.data.status,
        subjects: fetchResult.data.subjects,
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
// GET STUDENT RESULT HISTORY - ADMIN ENDPOINT
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
// GET SEMESTERS
// ============================================================================

router.get('/semesters', async (req, res) => {
  try {
    // Try DB first
    let semesters = [];
    try {
      semesters = await Semester.find({ isActive: true })
        .select('_id name semesterNumber resultUrl description')
        .sort({ semesterNumber: 1 });
    } catch {
      // DB might not be connected
    }

    // Fallback to links.json if no DB semesters
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
