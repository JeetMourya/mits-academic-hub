/**
 * Semesters Routes - MITS Academic Hub
 */
const express = require('express');
const Semester = require('../models/Semester');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Get active semesters (public)
router.get('/active', async (req, res) => {
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

// Get semester by ID
router.get('/:id', async (req, res) => {
  try {
    const semester = await Semester.findById(req.params.id);

    if (!semester || !semester.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Semester not found',
      });
    }

    res.json({
      success: true,
      data: semester,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch semester',
    });
  }
});

module.exports = router;
