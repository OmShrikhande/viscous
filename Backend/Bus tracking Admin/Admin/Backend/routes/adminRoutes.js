const express = require('express');
const router = express.Router();
const { 
  loginAdmin, 
  registerAdmin, 
  sendOTP, 
  resetPassword,
  getAdminProfile,
  updateAdminProfile,
  updateAdminPassword,
  recordLogout
} = require('../controllers/adminController');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

router.post('/request-otp', sendOTP);
router.post('/reset-password', resetPassword);

router.post('/login', loginAdmin);
router.post('/register', registerAdmin);

// Profile management routes
router.get('/profile', protect, getAdminProfile);
router.put('/profile', protect, updateAdminProfile);
router.put('/profile/password', protect, updateAdminPassword);
router.post('/logout', protect, recordLogout);

// Admin resets a user's password
router.post ('/users/:id/reset-password', protect, async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ success: false, message: 'Password required' });

    const hashed = await bcrypt.hash(password, 10);
    await User.findByIdAndUpdate(req.params.id, { password: hashed });

    res.json({ success: true, message: 'Password reset successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
