const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { 
  initializeFirebase,
  getFirebaseData,
  getBusStops
} = require('../firebase-client');

// Initialize Firebase
const firebase = initializeFirebase();
console.log('Firebase initialization status:', firebase.initialized ? 'Success' : 'Failed');

// Get all bus locations
router.get('/bus-location/:userId', async (req, res) => {
  const userId = req.params.userId || 'bus-1';
  try {
    console.log('Fetching all bus locations...');
    
    const today = new Date();

// Function to pad single digits with a leading zero
const pad = (n) => n.toString().padStart(2, '0');

const day = pad(today.getDate());            // e.g., "05" instead of "5"
const month = pad(today.getMonth() + 1);     // e.g., "06" instead of "6"
const year = today.getFullYear().toString().slice(2); // e.g., "25" from "2025"

const formattedToday = `${day}${month}${year}`; // e.g., "230625"

    // Always use locationhistory collection
    const routeId = 'locationhistory';
    
    console.log(`Fetching bus locations from locationhistory collection for date ${formattedToday}`);
    
    // Get the data from Firebase
    const firebaseData = await getFirebaseData(routeId, formattedToday);
    
    // Array to store bus locations
    const busLocations = [];
    
    // If Firebase data is available, use it
    if (firebaseData && firebaseData.entries && firebaseData.entries.length > 0) {
      console.log(`Found ${firebaseData.entries.length} entries in Firebase`);
      
      // Get the most recent entry
      const latestEntry = firebaseData.entries[0];
      
      busLocations.push({
        id: latestEntry.id,
        routeId: routeId,
        latitude: latestEntry.latitude,
        longitude: latestEntry.longitude,
        timestamp: new Date(latestEntry.timestamp),
        userId: latestEntry.userId || 'bus-1',
        speed: latestEntry.speed || 0
      });
      
      console.log('Using real data from Firebase');
    } else {
      console.log('No data found in Firebase');
    }
    
    // If no bus locations were found, return mock data for development
    
    
    // Return the most recent location or null if none found
    const location = busLocations.length > 0 ? busLocations[0] : null;
    
    res.json({
      success: true,
      location: location,
      source: location ? 'firebase' : 'none'
    });
  } catch (error) {
    console.error('Error fetching all bus locations:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while fetching bus locations',
      error: error.message
    });
  }
});

// Get bus location history
router.get('/bus-location/:userId/history', async (req, res) => {
  const userId = req.params.userId || 'bus-1';
  try {
    console.log('Fetching bus location history...');
    
    // Get the date from the query parameters or use the current date
    const dateParam = req.query.date || new Date().toISOString().split('T')[0];
    console.log(`Received date parameter: ${dateParam}`);
    
    // Always use locationhistory collection
    const routeId = 'locationhistory';
    
    console.log(`Fetching bus location history from locationhistory collection for date ${dateParam}`);
    
    // Get the data from Firebase - pass the raw date parameter
    const firebaseData = await getFirebaseData(routeId, dateParam);
    
    // If Firebase data is available, use it
    if (firebaseData && firebaseData.entries && firebaseData.entries.length > 0) {
      console.log(`Found ${firebaseData.entries.length} entries in Firebase`);
      
      // Map the entries to the expected format
      const locations = firebaseData.entries.map(entry => ({
        id: entry.id,
        routeId: routeId,
        latitude: entry.latitude,
        longitude: entry.longitude,
        timestamp: new Date(entry.timestamp),
        userId: entry.userId || 'bus-1',
        speed: entry.speed || 0
      }));
      console.log('firebaseData:', locations.length, 'locations');
      return res.json({
        success: true,
        locations: locations,
        count: locations.length,
        source: 'firebase'
      });
    }
  } catch (error) {
    console.error('Error fetching bus location history:', error);
    
    // Return an error response
    return res.status(500).json({
      success: false,
      error: error.message || 'An error occurred while fetching bus location history',
      locations: [],
      count: 0
    });
  }
  
  // If we reach here, no data was found and no error occurred
  console.log('No location history found, returning empty array');
  return res.json({
    success: true,
    locations: [],
    count: 0,
    source: 'none'
  });
});

// Get bus stops from Route2 collection
router.get('/bus-stops', async (req, res) => {
  try {
    console.log('Fetching bus stops from Route2 collection...');
    
    // Get the bus stops from Firebase
    const stops = await getBusStops();
    
    if (stops && stops.length > 0) {
      console.log(`Found ${stops.length} bus stops in Route2 collection`);
      
      return res.json({
        success: true,
        stops: stops,
        count: stops.length
      });
    }
    
    // If no stops were found, return empty array with success status
    console.log('No bus stops found in Route2 collection, returning empty array');
    return res.json({
      success: true,
      stops: [],
      count: 0
    });
    
  } catch (error) {
    console.error('Error fetching bus stops:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while fetching bus stops',
      error: error.message
    });
  }
});

module.exports = router;