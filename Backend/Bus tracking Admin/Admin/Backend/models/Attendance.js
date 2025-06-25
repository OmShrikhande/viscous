const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  loginTime: {
    type: Date,
    required: true
  },
  logoutTime: {
    type: Date,
    default: null
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    },
    address: {
      type: String,
      default: ''
    }
  },
  date: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['present', 'absent', 'late', 'half-day'],
    default: 'present'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for faster lookups
AttendanceSchema.index({ userId: 1, date: 1 });
AttendanceSchema.index({ date: 1 });

// Update timestamp before save
AttendanceSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

// Specify the collection name as 'attendancev'
module.exports = mongoose.model('Attendance', AttendanceSchema, 'attendance');
