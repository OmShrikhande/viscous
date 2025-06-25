/**
 * Location tracking routes
 */
const express = require('express');
const router = express.Router();
const { saveLocationData, getFirebaseData } = require('../firebase-client');
const { protect } = require('../middleware/auth');

/**
 * @route POST /api/location/update
 * @desc Update bus location
 * @access Private (requires authentication)
 */
router.post('/update', protect, async (req, res) => {
  try {
    const { userId, latitude, longitude, speed, status } = req.body;
    
    // Validate required fields
    if (!userId || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: userId, latitude, longitude' 
      });
    }
    
    // Save location data to Firebase
    const result = await saveLocationData(
      userId, 
      parseFloat(latitude), 
      parseFloat(longitude), 
      speed ? parseFloat(speed) : 0,
      status || 'running'
    );
    
    if (result.success) {
      return res.json({ 
        success: true, 
        message: 'Location updated successfully',
        path: result.path,
        data: result.data
      });
    } else {
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to update location',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error updating location:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: error.message
    });
  }
});

/**
 * @route GET /api/location/history/:date
 * @desc Get location history for a specific date from locationhistory collection
 * @access Private (requires authentication)
 */
router.get('/history/:date', protect, async (req, res) => {
  try {
    const { date } = req.params;
    
    // Validate date format (should be YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid date format. Use YYYY-MM-DD' 
      });
    }
    
    // Get location history from Firebase locationhistory collection
    const data = await getFirebaseData(null, date);
    
    if (data) {
      return res.json({ 
        success: true, 
        data
      });
    } else {
      return res.json({ 
        success: false, 
        message: 'No location data found for the specified date'
      });
    }
  } catch (error) {
    console.error('Error getting location history:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: error.message
    });
  }
});

/**
 * @route POST /api/location/test-update
 * @desc Test route to update bus location (no authentication required)
 * @access Public
 */
router.post('/test-update', async (req, res) => {
  try {
    const { userId, latitude, longitude, speed, status } = req.body;
    
    // Validate required fields
    if (!userId || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: userId, latitude, longitude' 
      });
    }
    
    // Save location data to Firebase
    const result = await saveLocationData(
      userId, 
      parseFloat(latitude), 
      parseFloat(longitude), 
      speed ? parseFloat(speed) : 0,
      status || 'running'
    );
    
    if (result.success) {
      return res.json({ 
        success: true, 
        message: 'Location updated successfully',
        path: result.path,
        data: result.data
      });
    } else {
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to update location',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error updating location:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: error.message
    });
  }
});

/**
 * @route GET /api/location/test-history/:date
 * @desc Test route to get location history from locationhistory collection (no authentication required)
 * @access Public
 */
router.get('/test-history/:date', async (req, res) => {
  try {
    const { date } = req.params;
    
    // Validate date format (should be YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid date format. Use YYYY-MM-DD' 
      });
    }
    
    // Get location history from Firebase locationhistory collection
    const data = await getFirebaseData(null, date);
    
    if (data) {
      return res.json({ 
        success: true, 
        data
      });
    } else {
      return res.json({ 
        success: false, 
        message: 'No location data found for the specified date'
      });
    }
  } catch (error) {
    console.error('Error getting location history:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: error.message
    });
  }
});

module.exports = router;