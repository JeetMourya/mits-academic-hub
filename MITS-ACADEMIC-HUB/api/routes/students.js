/**
 * Students Routes - MITS Academic Hub
 */
const express = require('express');
const Student = require('../models/Student');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Get all students
router.get('/', authenticate, authorize('manage_users'), async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const skip = parseInt(req.query.skip) || 0;
    const search = req.query.search || '';

    const query = search
      ? {
          $or: [
            { enrollmentNumber: new RegExp(search, 'i') },
            { name: new RegExp(search, 'i') },
            { email: new RegExp(search, 'i') },
          ],
        }
      : {};

    const students = await Student.find(query)
      .select('-results')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);

    const total = await Student.countDocuments(query);

    res.json({
      success: true,
      data: {
        students,
        pagination: { total, limit, skip },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch students',
    });
  }
});

// Get student by enrollment number
router.get('/:enrollmentNumber', authenticate, async (req, res) => {
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
      data: student,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch student',
    });
  }
});

// Delete student
router.delete('/:id', authenticate, authorize('manage_users'), async (req, res) => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    res.json({
      success: true,
      message: 'Student deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete student',
    });
  }
});

module.exports = router;
