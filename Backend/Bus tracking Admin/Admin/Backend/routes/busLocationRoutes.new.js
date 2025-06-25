const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { 
  initializeFirebaseClient,
  firebaseConfig
} = require('../firebase-service-account');

// Initialize Firebase client
let firebaseClient = null;
let firebaseInitialized = false;

try {
  // Initialize Firebase client
  firebaseClient = initializeFirebaseClient();
  
  // Set flag to indicate successful initialization
  firebaseInitialized = true;
  console.log('Firebase initialized successfully');
} catch (error) {
  console.error('Error initializing Firebase:', error);
  console.error('Firebase connection failed. Location data will not be available.');
  firebaseInitialized = false;
}

// Helper function to get data from Firebase
async function getFirebaseData(routeId, date) {
  try {
    // Check if Firebase is initialized
    if (!firebaseInitialized || !firebaseClient || !firebaseClient.firestore) {
      console.log('Firebase not initialized, returning null');
      return null;
    }
    
    console.log(`Attempting to fetch data for routeId: ${routeId}, date: ${date}`);
    
    // Format date as DDMYYYY (e.g., "1462025") - without leading zero in month
    const dateObj = new Date(date);
    const day = dateObj.getDate();
    const month = (dateObj.getMonth() + 1); // No padding with zero
    const year = dateObj.getFullYear();
    const formattedDate = `${day}${month}${year}`;
    
    console.log(`Formatted date: ${formattedDate}`);
    
    // Import Firebase functions
    const { getFirestore, collection, getDocs, doc, getDoc } = require('firebase/firestore');
    const { getDatabase, ref, get } = require('firebase/database');
    
    // Get Firestore instance
    const firestore = firebaseClient.firestore;
    
    // Get Realtime Database instance
    const database = firebaseClient.database;
    
    // Try to get data from Firestore
    try {
      console.log(`Trying to get data from Firestore for route ${routeId} on date ${formattedDate}`);
      
      // Check if the document exists
      const dateDocRef = doc(firestore, routeId, formattedDate);
      const dateDocSnapshot = await getDoc(dateDocRef);
      
      if (dateDocSnapshot.exists()) {
        console.log(`Document ${formattedDate} exists in collection ${routeId}`);
        
        // Get entries subcollection
        const entriesCollectionRef = collection(firestore, routeId, formattedDate, 'entries');
        const entriesSnapshot = await getDocs(entriesCollectionRef);
        
        if (!entriesSnapshot.empty) {
          console.log(`Found ${entriesSnapshot.size} entries in Firestore`);
          
          // Convert the entries to an array
          const entries = [];
          entriesSnapshot.forEach(document => {
            entries.push({
              id: document.id,
              ...document.data()
            });
          });
          
          // Sort the entries by timestamp (newest first)
          entries.sort((a, b) => {
            return b.timestamp - a.timestamp;
          });
          
          console.log(`Returning ${entries.length} entries from Firestore`);
          return {
            id: formattedDate,
            entries
          };
        }
      }
      
      console.log('No data found in Firestore, trying Realtime Database');
    } catch (firestoreError) {
      console.error('Error getting data from Firestore:', firestoreError);
    }
    
    // Try to get data from Realtime Database
    try {
      console.log(`Trying to get data from Realtime Database for route ${routeId} on date ${formattedDate}`);
      
      const dbRef = ref(database, `${routeId}/${formattedDate}/entries`);
      const snapshot = await get(dbRef);
      
      if (snapshot.exists()) {
        console.log('Found data in Realtime Database');
        const data = snapshot.val();
        
        // Convert object to array
        const entries = [];
        if (data && typeof data === 'object') {
          Object.keys(data).forEach(key => {
            entries.push({
              id: key,
              ...data[key]
            });
          });
        }
        
        // Sort the entries by timestamp (newest first)
        entries.sort((a, b) => {
          return b.timestamp - a.timestamp;
        });
        
        console.log(`Returning ${entries.length} entries from Realtime Database`);
        return {
          id: formattedDate,
          entries
        };
      }
      
      console.log('No data found in Realtime Database');
    } catch (rtdbError) {
      console.error('Error getting data from Realtime Database:', rtdbError);
    }
    
    console.log(`No data found for route ${routeId} on date ${formattedDate}`);
    return null;
  } catch (error) {
    console.error('Error in getFirebaseData:', error);
    return null;
  }
}

// Get all bus locations
router.get('/bus-locations', async (req, res) => {
  try {
    console.log('Fetching all bus locations...');
    
    // Get the current date
    const today = new Date();
    const formattedToday = today.toISOString().split('T')[0];
    
    // Get the route ID from the query parameters or use the default
    const routeId = req.query.routeId || 'Route1';
    
    console.log(`Fetching bus locations for route ${routeId} on ${formattedToday}`);
    
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
    }
    
    // If no bus locations were found, return an empty array
    if (busLocations.length === 0) {
      console.log('No bus locations found in Firebase');
      
      return res.json({
        success: true,
        locations: [],
        count: 0,
        message: 'No bus location data available from Firebase'
      });
    }
    
    res.json({
      success: true,
      locations: busLocations,
      count: busLocations.length,
      source: 'firebase'
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
router.get('/bus-location-history', async (req, res) => {
  try {
    console.log('Fetching bus location history...');
    
    // Get the date from the query parameters or use the current date
    const date = req.query.date ? new Date(req.query.date) : new Date();
    const formattedDate = date.toISOString().split('T')[0];
    
    // Get the route ID from the query parameters or use the default
    const routeId = req.query.routeId || 'Route1';
    
    console.log(`Fetching bus location history for route ${routeId} on ${formattedDate}`);
    
    // Get the data from Firebase
    const firebaseData = await getFirebaseData(routeId, formattedDate);
    
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
      
      return res.json({
        success: true,
        locations: locations,
        count: locations.length,
        source: 'firebase'
      });
    }
    
    // If no data was found, return an error
    console.log('No location history data available from Firebase');
    return res.status(404).json({
      success: false,
      message: 'No location history data available from Firebase. Firebase connection may not be properly configured.'
    });
  } catch (error) {
    console.error('Error fetching bus location history:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while fetching bus location history',
      error: error.message
    });
  }
});

module.exports = router;