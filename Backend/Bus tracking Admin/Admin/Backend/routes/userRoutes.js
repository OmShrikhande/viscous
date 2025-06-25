const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { 
  createUser, 
  getAllUsers, 
  getUser, 
  getUserLocation,
  addUserLocation,
  updateUser, 
  deleteUser 
} = require('../controllers/userController');
const { protect } = require('../middleware/auth');

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/visit-images/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'image-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Protected user routes
router.post('/users', protect, createUser);
router.get('/users', protect, getAllUsers);
router.get('/users/:id', protect, getUser);
router.get('/users/:id/locations', protect, getUserLocation);
router.post('/users/:id/locations', protect, addUserLocation);
// Visit location routes removed as requested

// Add a new endpoint to get all users with their today's locations
router.get('/users-with-locations', protect, async (req, res) => {
  try {
    const User = require('../models/users');
    const Location = require('../models/location');
    
    // Get all users
    const users = await User.find({});
    
    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    // For each user, get their locations for today
    const usersWithLocations = await Promise.all(users.map(async (user) => {
      const locations = await Location.find({
        userId: user._id,
        timestamp: { $gte: today, $lt: tomorrow }
      }).sort({ timestamp: 1 });
      
      return {
        userId: user._id,
        name: user.name,
        email: user.email,
        locationsCount: locations.length,
        locations: locations.map(loc => ({
          latitude: loc.location.latitude,
          longitude: loc.location.longitude,
          timestamp: loc.timestamp
        }))
      };
    }));
    
    // Log the results
    console.log('=== TODAY\'S LOCATIONS FOR ALL USERS ===');
    usersWithLocations.forEach(user => {
      console.log(`User: ${user.name} (${user.email}), ID: ${user.userId}`);
      console.log(`  Total locations today: ${user.locationsCount}`);
      
      if (user.locationsCount > 0) {
        user.locations.forEach((loc, index) => {
          console.log(`  ${index + 1}. Lat: ${loc.latitude}, Lng: ${loc.longitude}, Time: ${new Date(loc.timestamp).toLocaleTimeString()}`);
        });
      } else {
        console.log('  No locations recorded today');
      }
      console.log('-----------------------------------');
    });
    
    res.status(200).json({ 
      success: true, 
      usersCount: users.length,
      usersWithLocations 
    });
  } catch (err) {
    console.error('Error fetching users with locations:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch users with locations', error: err.message });
  }
});

// Test endpoint to get all locations for a user (for debugging)
router.get('/users/:id/all-locations', protect, async (req, res) => {
  try {
    const Location = require('../models/location');
    const mongoose = require('mongoose');
    
    // Validate userId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      console.error(`Invalid user ID format: ${req.params.id}`);
      return res.status(400).json({ success: false, message: 'Invalid user ID format' });
    }
    
    // Changed sort order to ascending (oldest first) to match frontend expectations
    const locations = await Location.find({ userId: req.params.id }).sort({ timestamp: 1 });
    
    console.log(`Found ${locations.length} locations for user ${req.params.id}`);
    
    // Log today's locations specifically
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    const todaysLocations = locations.filter(loc => {
      const locDate = new Date(loc.timestamp);
      return locDate >= today && locDate < tomorrow;
    });
    
    console.log(`Today's locations for user ${req.params.id}: ${todaysLocations.length}`);
    if (todaysLocations.length > 0) {
      console.log('Today\'s location details:');
      todaysLocations.forEach((loc, index) => {
        console.log(`  ${index + 1}. Lat: ${loc.location.latitude}, Lng: ${loc.location.longitude}, Time: ${loc.timestamp}`);
      });
    }
    
    // Log all locations with timestamps
    console.log(`All locations for user ${req.params.id}:`);
    locations.forEach((loc, index) => {
      if (index < 20) { // Limit to first 20 to avoid console spam
        console.log(`  ${index + 1}. Lat: ${loc.location.latitude}, Lng: ${loc.location.longitude}, Time: ${loc.timestamp}`);
      } else if (index === 20) {
        console.log('  ... (more locations)');
      }
    });
    
    res.status(200).json({ success: true, locations });
  } catch (err) {
    console.error('Error fetching all locations:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch locations', error: err.message });
  }
});
router.put('/users/:id', protect, updateUser);
router.delete('/users/:id', protect, deleteUser);

router.get('/users-with-locations', protect, async (req, res) => {
  try {
    const User = require('../models/users');
    const Location = require('../models/location');
    
    // Get all users
    const users = await User.find({});
    
    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
  } catch (err) {
    console.error('failed to fetch the data :', err);
    }
  }); 
     

module.exports = router;