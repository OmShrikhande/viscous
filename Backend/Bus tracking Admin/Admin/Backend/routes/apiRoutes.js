const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.js');
const User = require('../models/User.js');

// Route to get all users - matches the frontend endpoint: /api/admin/users
router.get('/admin/users', protect, async (req, res) => {
  try {
    const users = await User.find()
      .select('name email mobile department is_active')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      users
    });
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching users'
    });
  }
});

// Route to update a user - matches the frontend endpoint: /api/admin/users/:id
router.put('/admin/users/:id', protect, async (req, res) => {
  try {
    const userId = req.params.id;
    const updateData = req.body;
    
    // Remove sensitive fields if they exist
    delete updateData._id;
    
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.json({
      success: true,
      user: updatedUser
    });
  } catch (err) {
    console.error('Error updating user:', err);
    res.status(500).json({
      success: false,
      message: 'Server error while updating user'
    });
  }
});

// Route to delete a user - matches the frontend endpoint: /api/admin/users/:id
router.delete('/admin/users/:id', protect, async (req, res) => {
  try {
    const userId = req.params.id;
    const deletedUser = await User.findByIdAndDelete(userId);
    
    if (!deletedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting user'
    });
  }
});

module.exports = router;