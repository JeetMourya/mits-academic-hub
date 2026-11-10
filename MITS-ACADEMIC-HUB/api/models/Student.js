/**
 * Student Model - MITS Academic Hub
 * Supports separate Regular and Ex/Backlog attempts.
 */
const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema({
  code: String,
  name: String,
  grade: String,
  credits: Number,
  gpa: Number,
  gradePoint: mongoose.Schema.Types.Mixed,
  isNonCredit: Boolean,
  passed: Boolean,
}, { _id: false });

const resultSchema = new mongoose.Schema({
  semesterNumber: {
    type: Number,
    required: true,
    min: 1,
    max: 8,
  },
  examType: {
    type: String,
    enum: ['Regular', 'Ex'],
    default: 'Regular',
  },
  attemptNumber: {
    type: Number,
    default: 1,
    min: 1,
  },
  sessionCode: {
    type: String,
    default: '',
  },
  resultStatus: {
    type: String,
    default: '',
  },
  directUrl: {
    type: String,
    default: '',
  },
  sgpa: Number,
  subjects: [subjectSchema],
  fetchedAt: {
    type: Date,
    default: Date.now,
  },
});

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
  results: [resultSchema],
  searchHistory: [{
    semesterId: String,
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

studentSchema.index({ enrollmentNumber: 1 });
studentSchema.index({ email: 1 });
studentSchema.index({ 'searchHistory.fetchedAt': -1 });
studentSchema.index({
  enrollmentNumber: 1,
  'results.semesterNumber': 1,
  'results.examType': 1,
});

module.exports = mongoose.model('Student', studentSchema);
