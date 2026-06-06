/**
 * Student Model - MITS Academic Hub
 */
const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  enrollmentNumber: {
    type: String,
    required: [true, 'Enrollment number is required'],
    unique: true,
    trim: true,
    uppercase: true,
  },
  name: {
    type: String,
    trim: true,
  },
  email: {
    type: String,
    lowercase: true,
  },
  phone: String,
  department: String,
  semester: Number,
  results: [{
    semesterNumber: Number,
    sgpa: Number,
    subjects: [{
      code: String,
      name: String,
      grade: String,
      credits: Number,
      gpa: Number,
    }],
    fetchedAt: Date,
  }],
  searchHistory: [{
    semesterId: mongoose.Schema.Types.ObjectId,
    semesterName: String,
    fetchedAt: {
      type: Date,
      default: Date.now,
    },
  }],
  lastResultFetch: Date,
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for common queries
studentSchema.index({ enrollmentNumber: 1 });
studentSchema.index({ email: 1 });
studentSchema.index({ 'searchHistory.fetchedAt': -1 });

module.exports = mongoose.model('Student', studentSchema);
