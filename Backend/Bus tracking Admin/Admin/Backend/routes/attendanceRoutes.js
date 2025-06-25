const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// Get all attendance records with pagination
router.get('/attendance', protect, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    const { userId, startDate, endDate, status } = req.query;
    
    // Build filter object
    const filter = {};
    if (userId) filter.userId = userId;
    if (status) filter.status = status;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = startDate;
      if (endDate) filter.date.$lte = endDate;
    }

    const attendance = await Attendance.find(filter)
      .populate('userId', 'name email department')
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Attendance.countDocuments(filter);

    res.json({
      success: true,
      data: attendance,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch attendance records'
    });
  }
});

// Get attendance summary for dashboard
router.get('/attendance/summary', protect, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Today's attendance
    const todayAttendance = await Attendance.countDocuments({
      date: { $gte: today, $lt: tomorrow }
    });

    // Present today
    const presentToday = await Attendance.countDocuments({
      date: { $gte: today, $lt: tomorrow },
      status: 'present'
    });

    // Late today
    const lateToday = await Attendance.countDocuments({
      date: { $gte: today, $lt: tomorrow },
      status: 'late'
    });

    // This month's stats
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthlyStats = await Attendance.aggregate([
      {
        $match: {
          date: { $gte: startOfMonth }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Average working hours this month
    const avgHours = await Attendance.aggregate([
      {
        $match: {
          date: { $gte: startOfMonth },
          totalHours: { $gt: 0 }
        }
      },
      {
        $group: {
          _id: null,
          avgHours: { $avg: '$totalHours' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        todayAttendance,
        presentToday,
        lateToday,
        monthlyStats,
        averageHours: avgHours[0]?.avgHours || 0
      }
    });
  } catch (error) {
    console.error('Error fetching attendance summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch attendance summary'
    });
  }
});

// Get user attendance history
router.get('/attendance/user/:userId', protect, async (req, res) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate } = req.query;
    
    const filter = { userId };
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = startDate;
      if (endDate) filter.date.$lte = endDate;
    }

    const attendance = await Attendance.find(filter)
      .populate('userId', 'name email department')
      .sort({ date: -1 });

    const stats = await Attendance.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalHours: { $sum: '$totalHours' }
        }
      }
    ]);

    res.json({
      success: true,
      data: attendance,
      stats
    });
  } catch (error) {
    console.error('Error fetching user attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user attendance'
    });
  }
});

// Create attendance record
router.post('/attendance', protect, async (req, res) => {
  try {
    const attendance = new Attendance(req.body);
    await attendance.save();
    
    const populatedAttendance = await Attendance.findById(attendance._id)
      .populate('userId', 'name email department');

    res.status(201).json({
      success: true,
      data: populatedAttendance
    });
  } catch (error) {
    console.error('Error creating attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create attendance record'
    });
  }
});

// Update attendance record
router.put('/attendance/:id', protect, async (req, res) => {
  try {
    const attendance = await Attendance.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('userId', 'name email department');

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found'
      });
    }

    res.json({
      success: true,
      data: attendance
    });
  } catch (error) {
    console.error('Error updating attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update attendance record'
    });
  }
});

module.exports = router;