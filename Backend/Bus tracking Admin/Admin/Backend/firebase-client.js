/**
 * Firebase client SDK initialization
 * This file only uses the client SDK to avoid Admin SDK credential issues
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, getDoc, query, where, orderBy, limit, setDoc, addDoc } = require('firebase/firestore');
const { getDatabase, ref, get, child, set } = require('firebase/database');

// Helper function to pad numbers with leading zeros
const pad = (n) => n.toString().padStart(2, "0");

// Helper function to check entries subcollection
const checkEntriesSubcollection = async (firestore, collectionName, docId) => {
  try {
    const entriesRef = collection(firestore, collectionName, docId, 'entries');
    const entriesSnapshot = await getDocs(entriesRef);
    
    if (!entriesSnapshot.empty) {
      return {
        found: true,
        count: entriesSnapshot.size,
        entries: entriesSnapshot.docs.map(doc => ({
          id: doc.id,
          data: doc.data()
        }))
      };
    } else {
      return { found: false };
    }
  } catch (entriesError) {
    return { found: false, error: entriesError.message };
  }
};

// Firebase configuration from environment variables with fallbacks
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "AIzaSyAc_3UzizC6Y-hzI_5fDYmXiTSTwR69oac",
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || "bus-tracker-4e0fc.firebaseapp.com",
  databaseURL: process.env.FIREBASE_DATABASE_URL || "https://bus-tracker-4e0fc-default-rtdb.firebaseio.com",
  projectId: process.env.FIREBASE_PROJECT_ID || "bus-tracker-4e0fc",
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "bus-tracker-4e0fc.firebasestorage.app",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "899399291440",
  appId: process.env.FIREBASE_APP_ID || "1:899399291440:web:1c4535401988d905e293f5",
  measurementId: process.env.FIREBASE_MEASUREMENT_ID || "G-JFC5HHBVGC"
};

// Initialize Firebase
let firebaseApp = null;
let firestoreDb = null;
let realtimeDb = null;

/**
 * Initialize Firebase client
 * @returns {Object} Firebase client instances
 */
const initializeFirebase = () => {
  try {
    // Check if already initialized
    if (firebaseApp) {
      console.log('Firebase already initialized, reusing existing instance');
      return { 
        app: firebaseApp, 
        firestore: firestoreDb, 
        database: realtimeDb,
        initialized: true
      };
    }
    
    console.log('Initializing Firebase with config:', JSON.stringify(firebaseConfig));
    
    // Initialize Firebase app
    firebaseApp = initializeApp(firebaseConfig);
    
    // Initialize Firestore
    firestoreDb = getFirestore(firebaseApp);
    console.log('Firestore initialized');
    
    // Initialize Realtime Database
    realtimeDb = getDatabase(firebaseApp);
    console.log('Realtime Database initialized with URL:', firebaseConfig.databaseURL);
    
    console.log('Firebase initialized successfully');
    
    return { 
      app: firebaseApp, 
      firestore: firestoreDb, 
      database: realtimeDb,
      initialized: true
    };
  } catch (error) {
    console.error('Error initializing Firebase:', error);
    console.error('Error details:', error.stack);
    
    // Return a dummy object that won't throw errors
    return {
      app: null,
      firestore: null,
      database: null,
      initialized: false,
      error: error.message
    };
  }
};

/**
 * Process entries from a document
 * @param {Object} firestore - Firestore instance
 * @param {string} docId - Document ID
 * @param {Object} entriesSnapshot - Snapshot of entries subcollection
 * @returns {Promise<Object>} Processed entries
 */
const processEntriesFromDocument = async (firestore, docId, entriesSnapshot) => {
  // Convert the entries to an array
  const entries = [];
  
  // Process each time document in the entries subcollection
  for (const timeDoc of entriesSnapshot.docs) {
    const timeId = timeDoc.id; // This is the time in HHMMSS format
    const locationData = timeDoc.data();
    
    console.log(`Processing entry: ${timeId}`);
    console.log(`Entry data: ${JSON.stringify(locationData)}`);
    
    // Handle different field name formats (uppercase/lowercase)
    // Check for all possible field names based on the sample data
    const lat = locationData.latitude || locationData.Latitude || 0;
    const lng = locationData.longitude || locationData.Longitude || 0;
    const spd = locationData.speed || locationData.Speed || 0;
    const uid = locationData.userId || locationData.UserId || 'bus-1';
    const status = locationData.status || locationData.Status || 'unknown';
    
    // Handle Firebase timestamp object if present
    let timestamp = new Date().getTime(); // Default to current time
    
    // Check for all possible timestamp field names
    if (locationData.time && locationData.time.seconds) {
      timestamp = locationData.time.seconds * 1000;
      if (locationData.time.nanoseconds) {
        timestamp += Math.floor(locationData.time.nanoseconds / 1000000);
      }
    } else if (locationData.timestamp) {
      timestamp = locationData.timestamp;
    } else if (locationData.Timestamp) {
      timestamp = locationData.Timestamp;
    } else if (locationData.Timest) {
      timestamp = locationData.Timest;
    }
    
    entries.push({
      id: timeId,
      timestamp: timestamp,
      latitude: lat,
      longitude: lng,
      speed: spd,
      userId: uid,
      status: status
    });
  }
  
  // Sort the entries by timestamp (newest first)
  entries.sort((a, b) => {
    return b.timestamp - a.timestamp;
  });
  
  console.log(`Processed ${entries.length} location entries`);
  
  return {
    id: docId,
    entries,
    source: 'locationhistory'
  };
};

/**
 * Get data from Firebase Firestore locationhistory collection
 * @param {string} date - The date in ISO format
 * @returns {Promise<Object>} The data from Firebase
 */
const getFirebaseData = async (_, date) => {
  try {
    // Initialize Firebase if not already initialized
    const { firestore, initialized } = initializeFirebase();
    
    if (!initialized) {
      console.error('Firebase not initialized');
      return null;
    }
    
    // Format the date to match the Firestore document ID format (DDMMYY)
    let formattedDate;
    if (date) {
      // If date is in ISO format (YYYY-MM-DD), convert it
      if (date.includes('-')) {
        const d = new Date(date);
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yy = String(d.getFullYear()).slice(-2);
        formattedDate = `${dd}${mm}${yy}`;
      } else {
        // If date is already in the right format, use it directly
        formattedDate = date;
      }
    } else {
      // If no date provided, use current date
      const now = new Date();
      const dd = String(now.getDate()).padStart(2, '0');
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const yy = String(now.getFullYear()).slice(-2);
      formattedDate = `${dd}${mm}${yy}`;
    }
    
    console.log(`Using formatted date: ${formattedDate}`);
    
    // Get entries from the specified date
    const entriesPath = `locationhistory/${formattedDate}/entries`;
    console.log(`Fetching entries from path: ${entriesPath}`);
    
    const entriesRef = collection(firestore, entriesPath);
    const entriesSnapshot = await getDocs(entriesRef);
    
    if (entriesSnapshot.empty) {
      console.log(`No entries found at path: ${entriesPath}`);
      return null;
    }
    
    console.log(`Found ${entriesSnapshot.size} entries at path: ${entriesPath}`);
    
    // Process entries from this document
    return await processEntriesFromDocument(firestore, formattedDate, entriesSnapshot);
    
  } catch (error) {
    console.error('Error in getFirebaseData:', error);
    return null;
  }
};

/**
 * Get real-time bus location, speed, and distance data from Firebase Realtime Database
 * @param {string} busId - The bus ID (ignored for now, using fixed 'bus' node)
 * @returns {Promise<Object>} The real-time data from Firebase
 */
const getRealTimeBusData = async (busId = 'bus') => {
  try {
    // Initialize Firebase if not already initialized
    const { database, initialized } = initializeFirebase();
    
    if (!initialized) {
      console.error('Firebase not initialized');
      return null;
    }
    
    console.log(`Fetching real-time data from 'bus' node in Firebase`);
    
    // Reference to the bus data in the Realtime Database - using fixed 'bus' node
    // as per the data structure provided
    const busRef = ref(database, 'bus');
    console.log('Created reference to bus node:', busRef);
    
    // Try to list all nodes at the root level to see what's available
    try {
      const rootRef = ref(database, '/');
      const rootSnapshot = await get(rootRef);
      
      if (rootSnapshot.exists()) {
        console.log('Available nodes in Firebase Realtime Database:');
        const rootData = rootSnapshot.val();
        console.log(JSON.stringify(rootData, null, 2));
      } else {
        console.log('No data found in Firebase Realtime Database root');
      }
    } catch (rootError) {
      console.error('Error listing root nodes:', rootError);
    }
    
    // Get the data
    console.log('Attempting to get data from bus node...');
    const snapshot = await get(busRef);
    
    if (!snapshot.exists()) {
      console.log(`No real-time data found in 'bus' node`);
      return null;
    }
    
    // Get the data
    const busData = snapshot.val();
    console.log('Real-time bus data:', JSON.stringify(busData, null, 2));
    
    // Extract location, speed, and distance data
    const location = busData.Location || {};
    const distance = busData.Distance || {};
    
    console.log('Location data:', JSON.stringify(location, null, 2));
    console.log('Distance data:', JSON.stringify(distance, null, 2));
    
    // Format the data
    const formattedData = {
      location: {
        latitude: parseFloat(location.Latitude || 0),
        longitude: parseFloat(location.Longitude || 0),
        speed: parseFloat(location.Speed || 0),
        timestamp: location.Timestamp || new Date().toISOString()
      },
      distance: {
        daily: parseFloat(distance.DailyDistance || 0),
        total: parseFloat(distance.TotalDistance || 0)
      }
    };
    
    console.log('Formatted real-time data:', formattedData);
    return formattedData;
    
  } catch (error) {
    console.error('Error in getRealTimeBusData:', error);
    console.error('Error stack:', error.stack);
    return null;
  }
};

/**
 * Create or update location data in the locationhistory collection
 * @param {string} userId - The user/bus ID
 * @param {number} latitude - The latitude coordinate
 * @param {number} longitude - The longitude coordinate
 * @param {number} speed - The speed in km/h
 * @param {string} status - The status of the bus (running, stopped, idle, etc.)
 * @returns {Promise<Object>} Result of the operation
 */
const saveLocationData = async (userId, latitude, longitude, speed, status = 'running') => {
  try {
    // Initialize Firebase if not already initialized
    const { firestore, initialized } = initializeFirebase();
    
    if (!initialized) {
      return { success: false, error: 'Firebase not initialized' };
    }
    
    // Get current date and time
    const now = new Date();
    const day = now.getDate();
    const month = now.getMonth() + 1; // Month is 0-indexed
    const year = now.getFullYear();
    
    // Format date as DDMMYY (e.g., "230625") to match existing document in Firestore
    const formattedDate = `${day}${month}${year.toString().slice(2)}`;
    
    // Format time as HHMMSS (e.g., "102630")
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    const formattedTime = `${hours}${minutes}${seconds}`;
    
    // Create location data object
    const locationData = {
      userId,
      // Use both uppercase and lowercase versions for compatibility
      latitude,
      Latitude: latitude,
      longitude,
      Longitude: longitude,
      speed,
      status,
      // Add timestamp in both formats
      timestamp: now.getTime(),
      time: {
        seconds: Math.floor(now.getTime() / 1000),
        nanoseconds: (now.getTime() % 1000) * 1000000
      }
    };
    
    // Reference to the date document
    const dateDocRef = doc(firestore, 'locationhistory', formattedDate);
    
    // Create or update the date document (empty document is fine)
    await setDoc(dateDocRef, { created: now.getTime() }, { merge: true });
    
    // Reference to the time document in the entries subcollection
    const timeDocRef = doc(firestore, 'locationhistory', formattedDate, 'entries', formattedTime);
    
    // Create or update the time document with location data
    await setDoc(timeDocRef, locationData);
    
    return { 
      success: true, 
      path: `locationhistory/${formattedDate}/entries/${formattedTime}`,
      data: locationData
    };
  } catch (error) {
    console.error('Error saving location data:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get bus stops from the Route2 collection in Firestore
 * @returns {Promise<Array>} Array of bus stops
 */
const getBusStops = async () => {
  try {
    // Initialize Firebase if not already initialized
    const { firestore, initialized } = initializeFirebase();
    
    if (!initialized) {
      console.error('Firebase not initialized');
      return [];
    }
    
    // Get all documents from the Route2 collection
    const stopsCollectionRef = collection(firestore, 'Route2');
    const stopsSnapshot = await getDocs(stopsCollectionRef);
    
    if (stopsSnapshot.empty) {
      console.log('No bus stops found in Route2 collection');
      return [];
    }
    
    // Process the stops
    const stops = [];
    stopsSnapshot.forEach(doc => {
      const stopData = doc.data();
      stops.push({
        id: doc.id,
        name: doc.id, // Using the document ID as the name
        latitude: stopData.Latitude,
        longitude: stopData.Longitude,
        reached: stopData.reached || false,
        reachedTime: stopData.reachedTime || null,
        reachedDate: stopData.reachedDate || null
      });
    });
    
    console.log(`Found ${stops.length} bus stops in Route2 collection`);
    return stops;
  } catch (error) {
    console.error('Error fetching bus stops:', error);
    return [];
  }
};

module.exports = {
  initializeFirebase,
  getFirebaseData,
  saveLocationData,
  getBusStops,
  getRealTimeBusData,
  firebaseConfig,
  // Export Firebase client SDK functions for direct use
  firestoreFunctions: {
    collection,
    getDocs,
    doc,
    getDoc,
    query,
    where,
    orderBy,
    limit,
    setDoc,
    addDoc
  },
  databaseFunctions: {
    ref,
    get,
    child,
    set
  }
};