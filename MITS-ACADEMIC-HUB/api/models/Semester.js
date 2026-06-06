/**
 * Semester Model - MITS Academic Hub
 */
const mongoose = require('mongoose');

const semesterSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Semester name is required'],
    trim: true,
  },
  semesterNumber: {
    type: Number,
    required: [true, 'Semester number is required'],
  },
  resultUrl: {
    type: String,
    required: [true, 'Result URL is required'],
  },
  urlTemplate: {
    type: String,
    default: '{ENROLLMENT}',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  startDate: Date,
  endDate: Date,
  description: String,
  tags: [String],
  resultsFetched: {
    type: Number,
    default: 0,
  },
  createdBy: mongoose.Schema.Types.ObjectId,
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

semesterSchema.index({ semesterNumber: 1 });
semesterSchema.index({ isActive: 1 });
semesterSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Semester', semesterSchema);
