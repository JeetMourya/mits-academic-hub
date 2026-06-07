/**
 * Admin Routes - MITS Academic Hub
 */
const express = require('express');
const Admin = require('../models/Admin');
const Semester = require('../models/Semester');
const ActivityLog = require('../models/ActivityLog');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// ============================================================================
// PROTECTED ROUTES - Require Authentication
// ============================================================================

// Get admin profile
router.get('/profile', authenticate, async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin.id).select('-password');

    res.json({
      success: true,
      data: admin,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile',
    });
  }
});

// Update admin profile
router.put('/profile', authenticate, async (req, res) => {
  try {
    const { name, phone } = req.body;
    const admin = await Admin.findByIdAndUpdate(
      req.admin.id,
      { name, phone, updatedAt: new Date() },
      { new: true }
    );

    res.json({
      success: true,
      message: 'Profile updated',
      data: admin,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
    });
  }
});

// ============================================================================
// SEMESTER MANAGEMENT
// ============================================================================

// Get all semesters
router.get('/semesters', authenticate, authorize('manage_semesters'), async (req, res) => {
  try {
    const semesters = await Semester.find()
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

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

// Create semester
router.post('/semesters', authenticate, authorize('manage_semesters'), async (req, res) => {
  try {
    const { name, semesterNumber, resultUrl, description, startDate, endDate } = req.body;

    // Validation
    if (!name || !semesterNumber || !resultUrl) {
      return res.status(400).json({
        success: false,
        message: 'Name, semester number, and result URL are required',
      });
    }

    // Check duplicate
    const existing = await Semester.findOne({ semesterNumber });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Semester with this number already exists',
      });
    }

    const semester = await Semester.create({
      name,
      semesterNumber,
      resultUrl,
      urlTemplate: resultUrl,
      description,
      startDate,
      endDate,
      createdBy: req.admin.id,
    });

    // Log activity
    await ActivityLog.create({
      type: 'semester_created',
      adminId: req.admin.id,
      adminEmail: req.admin.email,
      details: { semesterId: semester._id, name },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.status(201).json({
      success: true,
      message: 'Semester created successfully',
      data: semester,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create semester',
    });
  }
});

// Update semester
router.put('/semesters/:id', authenticate, authorize('manage_semesters'), async (req, res) => {
  try {
    const { name, resultUrl, description, isActive, startDate, endDate } = req.body;

    const semester = await Semester.findByIdAndUpdate(
      req.params.id,
      { name, resultUrl, urlTemplate: resultUrl, description, isActive, startDate, endDate, updatedAt: new Date() },
      { new: true }
    );

    if (!semester) {
      return res.status(404).json({
        success: false,
        message: 'Semester not found',
      });
    }

    // Log activity
    await ActivityLog.create({
      type: 'semester_updated',
      adminId: req.admin.id,
      adminEmail: req.admin.email,
      details: { semesterId: semester._id, name },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({
      success: true,
      message: 'Semester updated successfully',
      data: semester,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update semester',
    });
  }
});

// Delete semester
router.delete('/semesters/:id', authenticate, authorize('manage_semesters'), async (req, res) => {
  try {
    const semester = await Semester.findByIdAndDelete(req.params.id);

    if (!semester) {
      return res.status(404).json({
        success: false,
        message: 'Semester not found',
      });
    }

    // Log activity
    await ActivityLog.create({
      type: 'semester_deleted',
      adminId: req.admin.id,
      adminEmail: req.admin.email,
      details: { semesterId: semester._id, name: semester.name },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({
      success: true,
      message: 'Semester deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete semester',
    });
  }
});

// ============================================================================
// ACTIVITY LOGS
// ============================================================================

router.get('/activity-logs', authenticate, authorize('view_analytics'), async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const skip = parseInt(req.query.skip) || 0;

    const logs = await ActivityLog.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);

    const total = await ActivityLog.countDocuments();

    res.json({
      success: true,
      data: {
        logs,
        pagination: { total, limit, skip },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch activity logs',
    });
  }
});

module.exports = router;
