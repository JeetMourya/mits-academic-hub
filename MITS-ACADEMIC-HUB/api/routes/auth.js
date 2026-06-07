/**
 * Auth Routes - MITS Academic Hub
 */
const express = require('express');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const ActivityLog = require('../models/ActivityLog');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const generateTokens = (admin) => {
  const accessToken = jwt.sign(
    {
      id: admin._id,
      email: admin.email,
      role: admin.role,
      permissions: admin.permissions,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );

  const refreshToken = jwt.sign(
    { id: admin._id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRE || '30d' }
  );

  return { accessToken, refreshToken };
};

const logActivity = async (type, adminId, email, details = {}, status = 'success', req) => {
  try {
    await ActivityLog.create({
      type,
      adminId,
      adminEmail: email,
      details,
      status,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
  } catch (err) {
    console.error('Failed to log activity:', err);
  }
};

// ============================================================================
// LOGIN
// ============================================================================

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    // Find admin
    const admin = await Admin.findOne({ email }).select('+password');

    // Check if account is locked BEFORE password comparison
    if (admin && admin.isLocked()) {
      await logActivity(
        'admin_login',
        admin._id,
        email,
        { reason: 'Account locked' },
        'failure',
        req
      );
      return res.status(403).json({
        success: false,
        message: 'Account is temporarily locked. Try again later.',
      });
    }

    if (!admin || !(await admin.comparePassword(password))) {
      await logActivity(
        'admin_login',
        null,
        email,
        { reason: 'Invalid credentials' },
        'failure',
        req
      );

      // Increment failed attempts
      if (admin) await admin.incLoginAttempts();

      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Reset login attempts on successful login
    if (admin.loginAttempts > 0) {
      await admin.resetLoginAttempts();
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(admin);

    // Update last login
    admin.lastLogin = new Date();
    await admin.save();

    // Log successful login
    await logActivity('admin_login', admin._id, admin.email, {}, 'success', req);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        admin: {
          id: admin._id,
          name: admin.name,
          email: admin.email,
          role: admin.role,
          permissions: admin.permissions,
        },
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
    });
  }
});

// ============================================================================
// REFRESH TOKEN
// ============================================================================

router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required',
      });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const admin = await Admin.findById(decoded.id);

    if (!admin || !admin.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token',
      });
    }

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(admin);

    res.json({
      success: true,
      data: {
        accessToken,
        refreshToken: newRefreshToken,
      },
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid refresh token',
    });
  }
});

// ============================================================================
// LOGOUT
// ============================================================================

router.post('/logout', authenticate, async (req, res) => {
  try {
    await logActivity('admin_logout', req.admin.id, req.admin.email, {}, 'success', req);

    res.json({
      success: true,
      message: 'Logout successful',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Logout failed',
    });
  }
});

// ============================================================================
// VERIFY TOKEN
// ============================================================================

router.get('/verify', authenticate, async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin.id).select('-password');

    res.json({
      success: true,
      data: {
        admin: {
          id: admin._id,
          name: admin.name,
          email: admin.email,
          role: admin.role,
          permissions: admin.permissions,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Verification failed',
    });
  }
});

module.exports = router;
