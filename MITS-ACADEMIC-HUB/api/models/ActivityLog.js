/**
 * ActivityLog Model - MITS Academic Hub
 */
const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: [
      'admin_login',
      'admin_logout',
      'semester_created',
      'semester_updated',
      'semester_deleted',
      'result_fetched',
      'settings_changed',
      'admin_created',
      'admin_deleted',
    ],
    required: true,
  },
  adminId: mongoose.Schema.Types.ObjectId,
  adminEmail: String,
  description: String,
  details: mongoose.Schema.Types.Mixed,
  ipAddress: String,
  userAgent: String,
  status: {
    type: String,
    enum: ['success', 'failure'],
    default: 'success',
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
    expire: 2592000, // 30 days TTL
  },
});

activityLogSchema.index({ adminId: 1, createdAt: -1 });
activityLogSchema.index({ type: 1, createdAt: -1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
