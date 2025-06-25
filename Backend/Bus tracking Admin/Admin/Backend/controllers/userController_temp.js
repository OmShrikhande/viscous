const mongoose = require('mongoose');
const User = require('../models/User');
const Location = require('../models/location');
const VisitLocation = require('../models/visitLocation');
// const VisitLocation = require('../models/visitLocation');
const bcrypt = require('bcrypt');

// Create a new user
exports.createUser = async (req, res) => {
  try {
    const { 
      name, 
      email, 
      mobile, 
      address, 
      joiningDate, 
      is_active, 
      department, 
      adhar, 
      pan, 
      password,
      location
    } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      name,
      email,
      mobile,
      address,
      joiningDate,
      is_active,
      department,
      adhar,
      pan,
      password: hashedPassword,
      location
    });

    await newUser.save();
    res.status(201).json({ 
      success: true, 
      message: 'User created successfully', 
      user: newUser 
    });
  } catch (err) {
    console.error('Error creating user:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create user', 
      error: err.message 
    });
  }
};

// Get all users
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find();
    res.status(200).json({ 
      success: true, 
      count: users.length, 
      users 
    });
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch users', 
      error: err.message 
    });
  }
};

// Get a single user
exports.getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    res.status(200).json({ 
      success: true, 
      user 
    });
  } catch (err) {
    console.error('Error fetching user:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch user', 
      error: err.message 
    });
  }
};

// Get user location
exports.getUserLocation = async (req, res) => {
  try {
    // Validate userId format
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid user ID' 
      });
    }

    console.log('Fetching location for user ID:', req.params.id);
    
    // First get the most recent location for the current position
    const mostRecentLocation = await Location.findOne({ userId: req.params.id })
      .sort({ timestamp: -1 }); // Get the most recent location
    
    // Then get all locations for this user (for the route)
    const allLocations = await Location.find({ userId: req.params.id })
      .sort({ timestamp: 1 }); // Get all locations sorted by timestamp (oldest first)
    
    console.log(`Found ${allLocations.length} locations for user ${req.params.id}`);
    
    if (!mostRecentLocation) {
      console.log('No location found for user');
      return res.status(404).json({ 
        success: false, 
        message: 'No location data found for user' 
      });
    }
    
    // Format the most recent location
    const currentLocation = {
      latitude: mostRecentLocation.location ? mostRecentLocation.location.latitude : mostRecentLocation.latitude,
      longitude: mostRecentLocation.location ? mostRecentLocation.location.longitude : mostRecentLocation.longitude,
      timestamp: mostRecentLocation.timestamp,
    };
    
    // Format all locations for the route
    const routeLocations = allLocations.map(loc => ({
      latitude: loc.location ? loc.location.latitude : loc.latitude,
      longitude: loc.location ? loc.location.longitude : loc.longitude,
      timestamp: loc.timestamp,
    }));
    
    const responseData = { 
      success: true, 
      location: currentLocation,
      allLocations: routeLocations,
      locationsCount: allLocations.length
    };
    
    console.log(`Sending location data to frontend: Current location and ${routeLocations.length} route points`);
    res.status(200).json(responseData);
  } catch (err) {
    console.error('Error fetching user location:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch user location', 
      error: err.message 
    });
  }
};
// Update a user
exports.updateUser = async (req, res) => {
  try {
    const { 
      name, 
      email, 
      mobile, 
      address, 
      joiningDate, 
      is_active, 
      department, 
      adhar, 
      pan,
      password
    } = req.body;

    req.body.updated_at = Date.now();
    
    if (password) {
      req.body.password = await bcrypt.hash(password, 10);
    }

    const user = await User.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    res.status(200).json({ 
      success: true, 
      message: 'User updated successfully', 
      user 
    });
  } catch (err) {
    console.error('Error updating user:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update user', 
      error: err.message 
    });
  }
};

// Delete a user
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    res.status(200).json({ 
      success: true, 
      message: 'User deleted successfully' 
    });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete user', 
      error: err.message 
    });
  }
};

// Add user location (for tracking user's current location) (for tracking user's current location)
exports.addUserLocation = async (req, res) => {
  try {
    // Validate userId format
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid user ID' 
      });
    }

    // Check if user exists
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    const { latitude, longitude } = req.body;
    
    // Validate location data
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude must be numbers'
      });
    }

    // Create new location entry
    const newLocation = new Location({
      userId: req.params.id,
      location: {
        latitude,
        longitude
      },
      distance: 5 // Default distance value
    });

    await newLocation.save();

    res.status(201).json({
      success: true,
      message: 'Location added successfully',
      location: {
        latitude: newLocation.location.latitude,
        longitude: newLocation.location.longitude,
        timestamp: newLocation.timestamp
      }
    });
  } catch (err) {
    console.error('Error adding user location:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to add user location', 
      error: err.message 
    });
  }
};

// Get locations for user to visit
exports.getUserVisitLocations = async (req, res) => {
  try {
    // Validate userId format
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid user ID' 
      });
    }

    console.log('Fetching visit locations for user ID:', req.params.id);
    const visitLocations = await VisitLocation.find({ userId: req.params.id })
      .sort({ createdAt: -1 }); // Get the most recent locations first
    
    console.log('Visit locations found in database:', visitLocations.length);
    
    if (!visitLocations || visitLocations.length === 0) {
      console.log('No visit locations found for user');
      return res.status(200).json({ 
        success: true, 
        message: 'No visit locations found for user',
        locations: []
      });
    }
    
    const responseData = { 
      success: true, 
      locations: visitLocations.map(loc => ({
        id: loc._id,
        latitude: loc.location.latitude,
        longitude: loc.location.longitude,
        address: loc.address,
        visitStatus: loc.visitStatus,
        createdAt: loc.createdAt,
        updatedAt: loc.updatedAt
      }))
    };
    
    console.log('Sending visit locations response:', responseData);
    res.status(200).json(responseData);
  } catch (err) {
    console.error('Error fetching user visit locations:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch user visit locations', 
      error: err.message 
    });
  }
};

// Add location for user to visit (assigned by admin)
exports.addUserVisitLocation = async (req, res) => {
  try {
    // Validate userId format
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid user ID' 
      });
    }

    // Check if user exists
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    const { latitude, longitude, address, sendNotification = true } = req.body;
    
    // Validate location data
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude must be numbers'
      });
    }

    if (!address || typeof address !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Address is required and must be a string'
      });
    }

    // Create new visit location entry
    const newVisitLocation = new VisitLocation({
      userId: req.params.id,
      location: {
        latitude,
        longitude
      },
      address,
      visitStatus: 'pending',
      notificationSent: sendNotification,
      notificationTime: sendNotification ? new Date() : null
    });

    await newVisitLocation.save();

    // Here you would implement the notification logic
    // This could be through a notification service, email, SMS, etc.
    if (sendNotification) {
      console.log(`Notification sent to user ${user.name} (${user.email}) about new location to visit: ${address}`);
      // In a real implementation, you would call a notification service here
    }

    res.status(201).json({
      success: true,
      message: 'Visit location added successfully' + (sendNotification ? ' and notification sent to user' : ''),
      location: {
        latitude: newVisitLocation.location.latitude,
        longitude: newVisitLocation.location.longitude,
        address: newVisitLocation.address,
        timestamp: newVisitLocation.createdAt
      }
    });
  } catch (err) {
    console.error('Error adding visit location:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to add visit location', 
      error: err.message 
    });
  }
};
