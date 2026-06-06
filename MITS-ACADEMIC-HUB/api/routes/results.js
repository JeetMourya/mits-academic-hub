/**
 * Results Routes - MITS Academic Hub
 */
const express = require('express');
const Student = require('../models/Student');
const Semester = require('../models/Semester');
const ResultFetcher = require('../utils/ResultFetcher');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const resultFetcher = new ResultFetcher();

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

    // Find semester
    const semester = await Semester.findById(semesterId);
    if (!semester || !semester.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Semester not found or inactive',
      });
    }

    // Fetch results from IUMS
    const fetchResult = await resultFetcher.fetchResults(
      enrollmentNumber,
      semester.resultUrl
    );

    if (!fetchResult.success) {
      return res.status(fetchResult.code === 'NOT_FOUND' ? 404 : 500).json({
        success: false,
        message: fetchResult.error,
        code: fetchResult.code,
      });
    }

    // Update or create student record
    let student = await Student.findOne({ enrollmentNumber });
    
    if (!student) {
      student = new Student({
        enrollmentNumber,
        name: fetchResult.data.studentName,
      });
    }

    // Add/update result
    const existingResult = student.results.find(r => r.semesterNumber === fetchResult.data.semester);
    if (existingResult) {
      existingResult.sgpa = fetchResult.data.sgpa;
      existingResult.subjects = fetchResult.data.subjects;
      existingResult.fetchedAt = new Date();
    } else {
      student.results.push({
        semesterNumber: fetchResult.data.semester,
        sgpa: fetchResult.data.sgpa,
        subjects: fetchResult.data.subjects,
        fetchedAt: new Date(),
      });
    }

    // Update search history
    student.searchHistory.push({
      semesterId: semester._id,
      semesterName: semester.name,
      fetchedAt: new Date(),
    });

    student.lastResultFetch = new Date();
    await student.save();

    // Update semester stats
    semester.resultsFetched += 1;
    await semester.save();

    res.json({
      success: true,
      message: 'Result fetched successfully',
      data: {
        studentName: fetchResult.data.studentName,
        enrollmentNumber: fetchResult.data.enrollmentNumber,
        semester: fetchResult.data.semester,
        sgpa: fetchResult.data.sgpa,
        status: fetchResult.data.status,
        subjects: fetchResult.data.subjects,
        fetchedAt: fetchResult.fetchedAt,
      },
    });
  } catch (error) {
    console.error('Result fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch result',
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
    const semesters = await Semester.find({ isActive: true })
      .select('_id name semesterNumber resultUrl description')
      .sort({ semesterNumber: 1 });

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
