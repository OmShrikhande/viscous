// Import Firebase modules directly
const { ref, onValue, get, child } = require('firebase/database');
const { collection, doc, getDoc, getDocs, updateDoc, Timestamp, setDoc } = require('firebase/firestore');

const { realtimeDatabase, firestoreDb } = require('./../config/firebase');
const { isWithinRadius, calculateDistance } = require('../utils/geoUtils');
const excelStopService = require('./excelStopService');
const { executeWithRetry, handleFirestoreError } = require('../utils/connectionCheck');

// Radius in meters to consider a stop as reached
const STOP_RADIUS = 50;

// Special stop ID for the JIS stop
const COLLEGE_STOP_ID = "JIS";

// Cache for stops data to avoid frequent Firestore access
let stopsCache = null;
let lastStopsFetch = null;
let previousBusLocation = null;
let currentTravelDirection = 'forward'; // 'forward', 'backward', or 'unknown'

// Function to clear the stops cache
const clearStopsCache = () => {
  console.log('Clearing stops cache');
  stopsCache = null;
  lastStopsFetch = null;
};

/**
 * Get current bus location from Realtime Database
 * @returns {Promise<Object>} Bus location {latitude, longitude}
 */
const getBusLocation = async () => {
  try {
    // Get Latitude directly from the path
    const latRef = ref(realtimeDatabase, 'bus/Location/Latitude');
    const latSnapshot = await get(latRef);
    
    // Get Longitude directly from the path
    const longRef = ref(realtimeDatabase, 'bus/Location/Longitude');
    const longSnapshot = await get(longRef);
    
    if (latSnapshot.exists() && longSnapshot.exists()) {
      const latitude = latSnapshot.val();
      const longitude = longSnapshot.val();
      
      console.log('REALTIME DATA: Bus location is (' + latitude + ', ' + longitude + ')');
      
      return {
        latitude: latitude,
        longitude: longitude
      };
    } else {
      console.log('ERROR: Could not get bus location from Realtime Database');
      return null;
    }
  } catch (error) {
    console.log('ERROR: Failed to connect to Firebase Realtime Database');
    return null;
  }
};

/**
 * Get all stops from Firestore by reading all documents in Route2 collection
 * This function is used for initial loading and forced refreshes only
 * During normal operation, the system uses the cached data
 * @param {boolean} forceRefresh - Force a refresh of the cache
 * @returns {Promise<Array>} Array of stops with their data
 */
const getStops = async (forceRefresh = false) => {
  try {
    // Check if we have cached data and we're not forcing a refresh
    if (stopsCache && !forceRefresh) {
      return stopsCache;
    }
    
    // Log that we're accessing Firestore
    console.log('Accessing Firestore to fetch stops data...');
    
    // Reference the Route2 collection
    const route2CollectionRef = collection(firestoreDb, 'Route2');
    
    // Get all documents in the Route2 collection with retry logic
    const querySnapshot = await executeWithRetry(async () => {
      return await getDocs(route2CollectionRef);
    });
    
    // Initialize stops array
    const stops = [];
    
    // Iterate through each document
    querySnapshot.forEach((docSnapshot) => {
      const data = docSnapshot.data();
      
      // Check if the document has Latitude and Longitude fields
      if (data.Latitude && data.Longitude) {
        stops.push({
          id: docSnapshot.id, // Use document ID as stop ID
          Latitude: data.Latitude,
          Longitude: data.Longitude,
          reached: data.reached || false
        });
      }
    });
    
    // Update the cache
    stopsCache = stops;
    lastStopsFetch = Date.now();
    
    console.log(`FIRESTORE DATA: Fetched ${stops.length} bus stops`);
    return stops;
  } catch (error) {
    console.error('ERROR: Failed to fetch stops from Firestore:', error);
    
    // Handle the error and determine if it's a connection issue
    await handleFirestoreError(error);
    
    return stopsCache || []; // Return cache on error if available
  }
};

/**
 * Reset all stops except the College stop
 * @returns {Promise<void>}
 */
const resetAllStopsExceptCollege = async () => {
  try {
    // Get all stops (force refresh to ensure we have the latest data)
    const stops = await getStops(true);
    
    // Reset all stops except College
    for (const stop of stops) {
      // Skip the College stop
      if (stop.id === COLLEGE_STOP_ID) {
        console.log(`Skipping reset for College stop`);
        continue;
      }
      
      const stopRef = doc(firestoreDb, 'Route2', stop.id);
      await updateDoc(stopRef, {
        reached: false,
        reachedAt: null,
        reachedTime: null,
        reachedDate: null
      });
      
      // Update the cache
      if (stopsCache) {
        const stopIndex = stopsCache.findIndex(s => s.id === stop.id);
        if (stopIndex !== -1) {
          stopsCache[stopIndex].reached = false;
        }
      }
    }
    
    console.log(`Reset reached status for all stops except College`);
  } catch (error) {
    console.error('Error resetting stops reached status:', error);
    throw error;
  }
};

/**
 * Update stop status to reached
 * @param {string} stopId - ID of the stop (document ID in Route2 collection)
 * @returns {Promise<void>}
 */
const markStopAsReached = async (stopId) => {
  try {
    // Reference the specific document in Route2 collection
    const stopRef = doc(firestoreDb, 'Route2', stopId);

    // Get current timestamp
    const reachedTimestamp = Timestamp.now();

    // Format the time as a readable string (HH:MM:SS)
    const date = new Date(reachedTimestamp.toMillis());
    const formattedTime = date.toLocaleTimeString();

    // Fetch the stop document to get serialNumber
    const stopDoc = await getDoc(stopRef);
    let serialNo = null;
    if (stopDoc.exists() && stopDoc.data().serialNumber !== undefined) {
      serialNo = stopDoc.data().serialNumber;
    }

    // Update the document with reached status and timestamps
    await updateDoc(stopRef, {
      reached: true,
      reachedAt: reachedTimestamp,
      reachedTime: formattedTime,
      reachedDate: date.toLocaleDateString()
    });
//prints serial number along with making the stop reached
    // Update the cache if it exists
    if (stopsCache) {
      const stopIndex = stopsCache.findIndex(stop => stop.id === stopId);
      if (stopIndex !== -1) {
        stopsCache[stopIndex].reached = true;
        // Print serial number from cache if available
        if (stopsCache[stopIndex].serialNumber !== undefined) {
          console.log(`Stop ${stopId} (Serial No: ${stopsCache[stopIndex].serialNumber}) marked as reached at ${formattedTime} noname`);
          if (stopsCache[stopIndex].serialNumber === 17) {
            // Sort stops by serialNumber ascending
            const sortedStops = [...stopsCache].sort((a, b) => (a.serialNumber ?? 0) - (b.serialNumber ?? 0));
            // Print all stops with their serial numbers in order
            console.log("All stops sorted by serialNumber:", JSON.stringify(sortedStops, null, 2));
          }
        } else if (serialNo !== null) {
          console.log(`Stop ${stopId} (Serial No: ${serialNo}) marked as reached at ${formattedTime} nonam`);
          if (serialNo === 17) {
            // Sort stops by serialNumber ascending
            const sortedStops = [...stopsCache].sort((a, b) => (a.serialNumber ?? 0) - (b.serialNumber ?? 0));
            // Print all stops with their serial numbers in order
            console.log("All stops sorted by serialNumber:", JSON.stringify(sortedStops, null, 2));
          }
        } else {
          console.log(`Stop ${stopId} marked as reached at ${formattedTime} nona`);
        }
      } else {
        if (serialNo !== null) {
          console.log(`Stop ${stopId} (Serial No: ${serialNo}) marked as reached at ${formattedTime} non`);
          if (serialNo === 17) {
            // Sort stops by serialNumber ascending
            const sortedStops = [...stopsCache].sort((a, b) => (a.serialNumber ?? 0) - (b.serialNumber ?? 0));
            // Print all stops with their serial numbers in order
            console.log("All stops sorted by serialNumber:", JSON.stringify(sortedStops, null, 2));
          }
        } else {
          console.log(`Stop ${stopId} marked as reached at ${formattedTime} no`);
        }
      }
    } else {
      if (serialNo !== null) {
        console.log(`Stop ${stopId} (Serial No: ${serialNo}) marked as reached at ${formattedTime} n`);
        if (serialNo === 17) {
          // Sort stops by serialNumber ascending
          const sortedStops = [...stopsCache].sort((a, b) => (a.serialNumber ?? 0) - (b.serialNumber ?? 0));
          // Print all stops with their serial numbers in order
          console.log("All stops sorted by serialNumber:", JSON.stringify(sortedStops, null, 2));
        }
      } else {
        console.log(`Stop ${stopId} marked as reached at ${formattedTime} `);
      }
    }
  } catch (error) {
    console.error(`Error marking stop ${stopId} as reached:`, error);
    throw error;
  }
};

/**
 * Detect travel direction based on bus location history
 * @param {Object} currentLocation - Current bus location
 * @param {Object} previousLocation - Previous bus location
 * @param {Array} stops - Array of stops
 * @returns {String} - 'forward', 'backward', or 'unknown'
 */
const detectTravelDirection = (currentLocation, previousLocation, stops) => {
  if (!currentLocation || !previousLocation || !stops || stops.length === 0) {
    return 'unknown';
  }

  // Find the JIS stop (College stop)
  const jisStop = stops.find(stop => stop.id === COLLEGE_STOP_ID);
  if (!jisStop) {
    return 'unknown';
  }

  const jisLocation = {
    latitude: jisStop.Latitude,
    longitude: jisStop.Longitude
  };

  // Calculate distances to JIS from current and previous locations
  const currentDistanceToJIS = calculateDistance(currentLocation, jisLocation);
  const previousDistanceToJIS = calculateDistance(previousLocation, jisLocation);

  // If we're moving away from JIS, we're going backward
  // If we're moving toward JIS, we're going forward
  if (currentDistanceToJIS > previousDistanceToJIS) {
    console.log('Direction: BACKWARD (moving away from JIS)');
    return 'backward';
  } else if (currentDistanceToJIS < previousDistanceToJIS) {
    console.log('Direction: FORWARD (moving toward JIS)');
    return 'forward';
  }

  // If distances are similar, maintain current direction
  return currentTravelDirection;
};

/**
 * Check if bus has reached any stops and update their status
 * This function only accesses Firestore when a stop is actually matched
 */
const checkStopsReached = async () => {
  try {
    // Get current bus location
    const busLocation = await getBusLocation();
    if (!busLocation) {
      console.log('Cannot check stops: No bus location available');
      return;
    }

    // Detect travel direction if we have previous location
    if (previousBusLocation) {
      currentTravelDirection = detectTravelDirection(busLocation, previousBusLocation, stopsCache);
    }

    // Store current location as previous for next iteration
    previousBusLocation = { ...busLocation };
    
    // Load stops data from memory (this doesn't access Firestore)
    // If we don't have stops data in memory yet, load it once
    if (!stopsCache) {
      console.log('Initial stops data load (one-time operation)...');
      await getStops();
      if (!stopsCache) {
        console.log('Cannot check stops: Failed to load stops data');
        return;
      }
    }
    
    // Use the cached stops data (no Firestore access)
    const stops = stopsCache;
    
    // First, check if the bus is at the JIS stop
    let isAtJISStop = false;
    let jisStopReached = false;
    
    // Find the JIS stop
    const jisStop = stops.find(stop => stop.id === COLLEGE_STOP_ID);
    
    if (jisStop) {
      // Check if JIS stop is already marked as reached
      jisStopReached = jisStop.reached;
      
      // Normalize JIS stop location data
      const jisLocation = {
        latitude: jisStop.Latitude,
        longitude: jisStop.Longitude
      };
      
      // Calculate distance to JIS stop
      const distanceToJIS = calculateDistance(busLocation, jisLocation);
      
      // Check if bus is within radius of JIS stop
      if (distanceToJIS <= STOP_RADIUS) {
        isAtJISStop = true;
        console.log(`BUS IS AT JIS STOP: (distance: ${distanceToJIS}m), Direction: ${currentTravelDirection}`);
        
        // If JIS is not already marked as reached, mark it
        // This will access Firestore, but only because we need to update it
        if (!jisStopReached) {
          console.log(`Marking JIS stop as reached`);
          await markStopAsReached(COLLEGE_STOP_ID);
        }
        
        // Only reset other stops if we're traveling forward (toward JIS)
        // If we're traveling backward (away from JIS), don't reset other stops
        // This prevents the issue where the bus gets stuck at JIS when returning
        if (currentTravelDirection === 'forward') {
          console.log('Bus at JIS location - Resetting all other stops (forward travel)...');
          await resetAllStopsExceptCollege();
        } else {
          console.log('Bus at JIS location - NOT resetting other stops (backward travel)');
        }
      }
    }
    
    // If we're not at JIS stop, proceed with normal stop checking
    if (!isAtJISStop) {
      // Check each stop
      for (const stop of stops) {
        // Skip stops that are already marked as reached
        if (stop.reached) {
          continue; // Skip silently to reduce log noise
        }
        
        // Normalize stop location data
        const stopLocation = {
          latitude: stop.Latitude,
          longitude: stop.Longitude
        };
        
        // Calculate distance
        const distance = calculateDistance(busLocation, stopLocation);
        
        // Check if bus is within radius of stop
        if (distance <= STOP_RADIUS) {
          console.log(`BUS REACHED STOP: "${stop.id}" (distance: ${distance}m)`);
          // This will access Firestore, but only because we need to update it
          await markStopAsReached(stop.id);
        }
      }
      
      // Also check Excel stops (this only accesses Firestore if a stop is within range)
      try {
        // This will only access Firestore if the bus is near a stop from the Excel file
        await excelStopService.processExcelStops(busLocation);
      } catch (excelError) {
        console.error('Error processing Excel stops:', excelError);
      }
    }
  } catch (error) {
    console.log('ERROR: Failed to check stops');
    console.error(error);
  }
};

/**
 * Start monitoring bus location and checking stops
 * @param {number} interval - Check interval in milliseconds
 * @returns {Object} Object containing intervals that should be cleared on shutdown
 */
const startLocationMonitoring = (interval = 5000) => {
  console.log('=== BUS TRACKING SYSTEM STARTED ===');
  console.log(`Checking every ${interval/1000} seconds`);
  
  // Load the last reset date from persistent storage
  // This will be handled by the checkMidnightReset function
  console.log('Loading last reset date from persistent storage...');
  
  // Load stops data from Firestore (one-time operation at startup)
  console.log('Loading initial stops data from Firestore (one-time operation)...');
  getStops()
    .then(stops => {
      console.log(`Successfully loaded ${stops.length} stops from Firestore`);
      
      // Load Excel stops data
      console.log('Loading stops data from Excel file...');
      return excelStopService.loadStopsFromExcel();
    })
    .then(data => {
      if (data) {
        console.log(`Successfully loaded ${data.length} stops from Excel file`);
      } else {
        console.warn('Failed to load stops from Excel file');
      }
      
      // Initial check for stops (now that data is loaded)
      checkStopsReached();
    })
    .catch(error => {
      console.error('Error during startup data loading:', error);
      
      // Still try to check stops even if there was an error
      checkStopsReached();
    });
  
  // Set up interval for periodic checks
  const monitoringInterval = setInterval(checkStopsReached, interval);
  
  // Also listen for real-time updates
  const busLocationRef = ref(realtimeDatabase, 'bus/Location');
  onValue(busLocationRef, (snapshot) => {
    console.log('REALTIME UPDATE: New bus location received');
    checkStopsReached();
  });
  
  // Set up a minute-by-minute check for midnight reset
  // This will check every minute if it's midnight (00:00-00:05) and reset all stops if it is
  const midnightCheckInterval = setInterval(() => {
    checkMidnightReset();
  }, 60000); // Check every minute
  
  console.log('Midnight reset check scheduled - will reset all stops at 12:00 AM');
  
  // Run an immediate midnight check in case the server was started after midnight
  // but before the day's reset has occurred
  checkMidnightReset();
  
  // Also perform an immediate check of all stops to ensure they're in the correct state
  console.log('Performing immediate check of all stops status...');
  setTimeout(() => {
    // Check if any stops need to be reset right now
    const now = new Date();
    const currentDate = now.toDateString();
    
    // If we don't have a last reset date yet or it's not today, check all stops
    if (!lastResetDate || lastResetDate !== currentDate) {
      console.log('Checking if stops need immediate reset on startup...');
      checkMidnightReset();
    }
  }, 5000); // Wait 5 seconds to allow the system to initialize
  
  // Return both intervals so they can be cleared on shutdown
  return {
    monitoringInterval,
    midnightCheckInterval
  };
};

/**
 * Reset the reached status of all stops or a specific stop
 * Enhanced with better error handling and verification
 * @param {string} [stopId] - Optional ID of a specific stop to reset
 * @returns {Promise<void>}
 */
const resetStopsReached = async (stopId = null) => {
  try {
    if (stopId) {
      // Reset a specific stop
      console.log(`Attempting to reset specific stop: ${stopId}`);
      
      // First check if the stop exists
      const stopRef = doc(firestoreDb, 'Route2', stopId);
      const stopDoc = await getDoc(stopRef);
      
      if (!stopDoc.exists()) {
        console.error(`Stop ${stopId} does not exist in database`);
        return;
      }
      
      // Get current status for logging
      const currentStatus = stopDoc.data().reached;
      console.log(`Stop ${stopId} current status: reached=${currentStatus}`);
      
      // Reset the stop
      await updateDoc(stopRef, {
        reached: false,
        reachedAt: null,
        reachedTime: null,
        reachedDate: null
      });
      
      // Update the cache if it exists
      if (stopsCache) {
        const stopIndex = stopsCache.findIndex(stop => stop.id === stopId);
        if (stopIndex !== -1) {
          stopsCache[stopIndex].reached = false;
          console.log(`Updated stops cache for stop ${stopId}`);
        }
      }
      
      // Verify the update
      const verifyDoc = await getDoc(stopRef);
      console.log(`Reset status for stop ${stopId}: reached=${verifyDoc.data().reached}`);
      
    } else {
      // Reset all stops
      console.log('PERFORMING COMPLETE RESET OF ALL STOPS');
      // Force refresh to ensure we have the latest data
      const stops = await getStops(true);
      
      if (!stops || stops.length === 0) {
        console.error('No stops found in database to reset');
        return;
      }
      
      // Log all stops that will be reset
      console.log(`Resetting all ${stops.length} stops, including JIS/College stop`);
      
      // Count how many stops were actually reached
      const reachedStops = stops.filter(stop => stop.reached).length;
      console.log(`Found ${reachedStops} stops currently marked as reached`);
      
      // Track success and failures
      let successCount = 0;
      let failureCount = 0;
      
      // Process each stop
      for (const stop of stops) {
        try {
          const stopRef = doc(firestoreDb, 'Route2', stop.id);
          
          // Log each stop being reset
          console.log(`Resetting stop: ${stop.id} (currently reached: ${stop.reached})`);
          
          // Reset the stop
          await updateDoc(stopRef, {
            reached: false,
            reachedAt: null,
            reachedTime: null,
            reachedDate: null
          });
          
          // Update the cache
          if (stopsCache) {
            const stopIndex = stopsCache.findIndex(s => s.id === stop.id);
            if (stopIndex !== -1) {
              stopsCache[stopIndex].reached = false;
            }
          }
          
          // Verify the update if it was previously reached
          if (stop.reached) {
            const verifyDoc = await getDoc(stopRef);
            if (verifyDoc.data().reached === false) {
              console.log(`✓ Verified stop ${stop.id} is now unreached`);
              successCount++;
            } else {
              console.error(`✗ Failed to reset stop ${stop.id}`);
              failureCount++;
            }
          } else {
            // Already unreached, count as success
            successCount++;
          }
        } catch (stopError) {
          console.error(`Error resetting stop ${stop.id}:`, stopError);
          failureCount++;
        }
      }
      
      // Final status report
      console.log(`===== RESET COMPLETE =====`);
      console.log(`Total stops: ${stops.length}`);
      console.log(`Successfully reset: ${successCount}`);
      console.log(`Failed to reset: ${failureCount}`);
      
      if (failureCount > 0) {
        console.error(`WARNING: ${failureCount} stops failed to reset properly`);
      } else {
        console.log(`SUCCESS: All stops reset successfully`);
      }
      
      // Update a system status document to record this reset
      try {
        const { doc, setDoc } = require('firebase/firestore');
        const resetLogRef = doc(firestoreDb, 'SystemConfig', 'lastReset');
        
        await setDoc(resetLogRef, {
          timestamp: new Date().toISOString(),
          totalStops: stops.length,
          successCount,
          failureCount,
          resetBy: 'system'
        }, { merge: true });
        
        console.log('Reset log saved to database');
      } catch (logError) {
        console.error('Error saving reset log:', logError);
      }
    }
  } catch (error) {
    console.error('Error resetting stops reached status:', error);
    throw error;
  }
};

/**
 * Check if it's midnight (00:00) and reset all stops if it is
 * Enhanced to be extremely reliable with multiple checks and persistent storage
 */
let lastResetDate = null;

// Function to save the last reset date to a file for persistence across server restarts
const saveLastResetDate = (date) => {
  try {
    // Update the in-memory variable
    lastResetDate = date;
    
    // Store in Firebase for persistence
    const { doc, setDoc } = require('firebase/firestore');
    const systemConfigRef = doc(firestoreDb, 'SystemConfig', 'resetTracking');
    
    setDoc(systemConfigRef, {
      lastResetDate: date,
      lastResetTimestamp: new Date().toISOString()
    }, { merge: true })
      .then(() => console.log('Last reset date saved to Firestore:', date))
      .catch(err => console.error('Error saving last reset date to Firestore:', err));
  } catch (error) {
    console.error('Error saving last reset date:', error);
  }
};

// Function to load the last reset date from Firestore
const loadLastResetDate = async () => {
  try {
    const { doc, getDoc } = require('firebase/firestore');
    const systemConfigRef = doc(firestoreDb, 'SystemConfig', 'resetTracking');
    const docSnap = await getDoc(systemConfigRef);
    
    if (docSnap.exists() && docSnap.data().lastResetDate) {
      lastResetDate = docSnap.data().lastResetDate;
      console.log('Loaded last reset date from Firestore:', lastResetDate);
    } else {
      console.log('No saved reset date found in Firestore, using current date');
      lastResetDate = new Date().toDateString();
      saveLastResetDate(lastResetDate);
    }
  } catch (error) {
    console.error('Error loading last reset date:', error);
    // Default to today to prevent immediate reset
    lastResetDate = new Date().toDateString();
  }
};

// Enhanced midnight reset check with multiple safeguards
const checkMidnightReset = () => {
  const now = new Date();
  const currentDate = now.toDateString();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  
  // Load the last reset date if it's not set yet
  if (lastResetDate === null) {
    console.log('Last reset date not initialized, loading from storage...');
    loadLastResetDate()
      .then(() => {
        // After loading, immediately check if we need to reset
        performResetCheck(now, currentDate, hours, minutes);
      })
      .catch(err => {
        console.error('Error in initial reset date loading:', err);
        // Default to today to prevent immediate reset
        lastResetDate = currentDate;
      });
    return;
  }
  
  // Perform the actual reset check
  performResetCheck(now, currentDate, hours, minutes);
};

// Separate function to perform the reset check logic
const performResetCheck = (now, currentDate, hours, minutes) => {
  console.log(`Checking reset: Current date=${currentDate}, Last reset=${lastResetDate}, Time=${hours}:${minutes}`);
  
  // CASE 1: If we haven't reset today and it's between 00:00 and 00:05 (to ensure we don't miss it)
  if (lastResetDate !== currentDate && hours === 0 && minutes >= 0 && minutes <= 5) {
    console.log('MIDNIGHT DETECTED: Resetting all stops for new day');
    
    // Update the last reset date before performing the reset
    saveLastResetDate(currentDate);
    
    // Reset ALL stops including JIS/College
    resetStopsReached()
      .then(() => console.log('All stops reset for new day at', now.toLocaleTimeString()))
      .catch(err => console.error('Error resetting stops at midnight:', err));
    
    return;
  }
  
  // CASE 2: Also reset if it's a new day and we haven't reset yet (server might have been down at midnight)
  if (lastResetDate !== currentDate && hours >= 1) {
    console.log('NEW DAY DETECTED: Performing missed midnight reset');
    
    // Update the last reset date
    saveLastResetDate(currentDate);
    
    // Reset ALL stops
    resetStopsReached()
      .then(() => console.log('All stops reset for new day at', now.toLocaleTimeString()))
      .catch(err => console.error('Error resetting stops for new day:', err));
    
    return;
  }
  
  // CASE 3: If the last reset date is in the future (clock was adjusted), reset it to today
  try {
    const lastResetObj = new Date(lastResetDate);
    const nowObj = new Date(currentDate);
    
    if (lastResetObj > nowObj) {
      console.log('CLOCK ADJUSTMENT DETECTED: Last reset date is in the future, resetting to today');
      saveLastResetDate(currentDate);
    }
  } catch (error) {
    console.error('Error comparing dates:', error);
  }
};

module.exports = {
  getBusLocation,
  getStops,
  checkStopsReached,
  startLocationMonitoring,
  resetStopsReached,
  resetAllStopsExceptCollege,
  checkMidnightReset,
  clearStopsCache,
  // Export the lastResetDate variable for status checking
  get lastResetDate() { return lastResetDate; }
};