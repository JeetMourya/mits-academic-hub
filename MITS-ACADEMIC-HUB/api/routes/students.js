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

    // Escape special regex characters to prevent ReDoS attacks
    const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const query = search
      ? {
          $or: [
            { enrollmentNumber: new RegExp(escapedSearch, 'i') },
            { name: new RegExp(escapedSearch, 'i') },
            { email: new RegExp(escapedSearch, 'i') },
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

// Update student profile details
router.put('/:id', authenticate, authorize('manage_users'), async (req, res) => {
  try {
    const { name, email, phone, department, semester } = req.body;
    const student = await Student.findById(req.params.id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    if (name !== undefined) student.name = name;
    if (email !== undefined) student.email = email;
    if (phone !== undefined) student.phone = phone;
    if (department !== undefined) student.department = department;
    if (semester !== undefined) student.semester = semester;
    student.updatedAt = Date.now();

    await student.save();

    res.json({
      success: true,
      message: 'Student profile updated successfully',
      data: student,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update student profile',
    });
  }
});

module.exports = router;
