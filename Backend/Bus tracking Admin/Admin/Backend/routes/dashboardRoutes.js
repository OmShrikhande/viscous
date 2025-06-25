const express = require('express');
const User = require('../models/User');
const Admin = require('../models/Admin');
const Attendance = require('../models/Attendance');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Dashboard Statistics
router.get('/stats', protect, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ is_active: true });
    const inactiveUsers = await User.countDocuments({ is_active: false });
    const totalAdmins = await Admin.countDocuments();

    // Recent users (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentUsers = await User.countDocuments({
      createdAt: { $gte: sevenDaysAgo }
    });

    // Department wise count
    const departmentStats = await User.aggregate([
      {
        $group: {
          _id: '$department',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    res.json({
      success: true,
      data: {
        totalUsers,
        activeUsers,
        inactiveUsers,
        totalAdmins,
        recentUsers,
        departmentStats
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard statistics',
      error: error.message
    });
  }
});

// Today's Attendance Details
router.get('/today-attendance', protect, async (req, res) => {
  try {
    // Get today's date in IST (YYYY-MM-DD)
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istNow = new Date(now.getTime() + istOffset);
    const istYear = istNow.getUTCFullYear();
    const istMonth = (istNow.getUTCMonth() + 1).toString().padStart(2, '0');
    const istDay = istNow.getUTCDate().toString().padStart(2, '0');
    const istDateString = `${istYear}-${istMonth}-${istDay}`;

    console.log('Fetching today\'s attendance for date:', istDateString);

    // Get all attendance records for today with user details
    const attendanceRecords = await Attendance.find({
      date: istDateString
    })
      .populate('userId', 'name email department')
      .sort({ 'checkIn.time': -1 });

    console.log('Found attendance records:', attendanceRecords.length);

    // Get department-wise attendance
    const departmentAttendance = await Attendance.aggregate([
      {
        $match: {
          date: istDateString
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $group: {
          _id: '$user.department',
          total: { $sum: 1 },
          present: {
            $sum: {
              $cond: [{ $eq: ['$status', 'present'] }, 1, 0]
            }
          },
          late: {
            $sum: {
              $cond: [{ $eq: ['$status', 'late'] }, 1, 0]
            }
          },
          absent: {
            $sum: {
              $cond: [{ $eq: ['$status', 'absent'] }, 1, 0]
            }
          },
          halfDay: {
            $sum: {
              $cond: [{ $eq: ['$status', 'half-day'] }, 1, 0]
            }
          }
        }
      },
      { $sort: { total: -1 } }
    ]);

    // Calculate average check-in time
    const checkInTimes = attendanceRecords
      .filter(record => record.checkIn && record.checkIn.time)
      .map(record => record.checkIn.time.getHours() * 60 + record.checkIn.time.getMinutes());

    const averageCheckInTime = checkInTimes.length > 0
      ? checkInTimes.reduce((sum, time) => sum + time, 0) / checkInTimes.length
      : 0;

    const avgHours = Math.floor(averageCheckInTime / 60);
    const avgMinutes = Math.round(averageCheckInTime % 60);
    const formattedAvgTime = `${avgHours.toString().padStart(2, '0')}:${avgMinutes.toString().padStart(2, '0')}`;

    res.json({
      success: true,
      data: {
        records: attendanceRecords,
        departmentStats: departmentAttendance,
        summary: {
          total: attendanceRecords.length,
          present: attendanceRecords.filter(r => r.status === 'present').length,
          late: attendanceRecords.filter(r => r.status === 'late').length,
          absent: attendanceRecords.filter(r => r.status === 'absent').length,
          halfDay: attendanceRecords.filter(r => r.status === 'half-day').length,
          averageCheckInTime: formattedAvgTime
        }
      }
    });
  } catch (error) {
    console.error('Error fetching today\'s attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch today\'s attendance data',
      error: error.message
    });
  }
});

// Get attendance records by date range and/or user
router.get('/attendance', protect, async (req, res) => {
  try {
    const { startDate, endDate, userId } = req.query;
    const filter = {};

    if (startDate && endDate) {
      // Ensure date format matches your MongoDB data
      filter.date = { $gte: startDate, $lte: endDate };
    }
    if (userId) {
      filter.userId = userId;
    }

    console.log('Attendance filter:', filter);

    const records = await Attendance.find(filter)
      .populate('userId', 'name department')
      .sort({ date: -1, loginTime: -1 });

    res.json({ success: true, data: records });
  } catch (error) {
    console.error('Error fetching attendance records:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch attendance records',
      error: error.message
    });
  }
});

module.exports = router;
