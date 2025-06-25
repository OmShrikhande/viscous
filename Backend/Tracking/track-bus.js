/**
 * Bus Tracking System - All-in-One File
 * 
 * This file handles:
 * 1. Connecting to Firebase Realtime Database and Firestore
 * 2. Getting real-time bus location from Realtime Database
 * 3. Comparing with stop locations from Firestore
 * 4. Updating stop status to 'reached: true' when bus is within 50m
 * 5. Running in a loop every second
 */

// Import Firebase configuration
const { realtimeDatabase, firestoreDb } = require('./config/firebase');

// Import Firebase modules
const { ref, get } = require('firebase/database');
const { collection, getDocs, doc, updateDoc, Timestamp } = require('firebase/firestore');

// Import utility functions
const { calculateDistance } = require('./utils/geoUtils');

// Radius in meters to consider a stop as reached
const STOP_RADIUS = 50;

// Check interval in milliseconds
const CHECK_INTERVAL = 1000; // 1 second

// Store reached stops to avoid duplicate messages and prevent revisiting until reset
const reachedStops = new Set();

// Track if we've already printed the connection message
let connectionMessagePrinted = false;

/**
 * Get current bus location from Realtime Database
 */
async function getBusLocation() {
  try {
    // Get Latitude directly
    const latRef = ref(realtimeDatabase, 'bus/Location/Latitude');
    const latSnapshot = await get(latRef);
    
    // Get Longitude directly
    const longRef = ref(realtimeDatabase, 'bus/Location/Longitude');
    const longSnapshot = await get(longRef);
    
    if (latSnapshot.exists() && longSnapshot.exists()) {
      const latitude = latSnapshot.val();
      const longitude = longSnapshot.val();
      
      if (!connectionMessagePrinted) {
        console.log('Firebase Realtime Database connected successfully');
        connectionMessagePrinted = true;
      }
      
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
}

/**
 * Get all stops from Firestore
 */
async function getStops() {
  try {
    // Reference the Route2 collection
    const route2CollectionRef = collection(firestoreDb, 'Route2');
    
    // Get all documents in the Route2 collection
    const querySnapshot = await getDocs(route2CollectionRef);
    
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
    
    return stops;
  } catch (error) {
    console.log('ERROR: Failed to connect to Firestore');
    return [];
  }
}

/**
 * Mark a stop as reached in Firestore
 */
async function markStopAsReached(stopId) {
  try {
    // Reference the specific document in Route2 collection
    const stopRef = doc(firestoreDb, 'Route2', stopId);
    
    // Get current timestamp
    const reachedTimestamp = Timestamp.now();
    
    // Format the time as a readable string (HH:MM:SS)
    const date = new Date(reachedTimestamp.toMillis());
    const formattedTime = date.toLocaleTimeString();
    
    // Update the document with reached status and timestamps
    await updateDoc(stopRef, {
      reached: true,
      reachedAt: reachedTimestamp,
      reachedTime: formattedTime,
      reachedDate: date.toLocaleDateString()
    });
    
    // Add to our set of reached stops
    reachedStops.add(stopId);
    
    console.log(`STOP REACHED: "${stopId}" at ${formattedTime}`);
  } catch (error) {
    console.log(`ERROR: Failed to mark stop "${stopId}" as reached`);
  }
}

/**
 * Check if bus has reached any stops and update their status
 */
async function checkStopsReached() {
  try {
    // Get current bus location from Realtime Database
    const busLocation = await getBusLocation();
    if (!busLocation) {
      return;
    }
    
    // Print the current bus location
    console.log(`BUS LOCATION: (${busLocation.latitude}, ${busLocation.longitude})`);
    
    // Get all stops from Firestore
    const stops = await getStops();
    if (!stops || stops.length === 0) {
      return;
    }
    
    let anyStopReached = false;
    
    // Check each stop
    for (const stop of stops) {
      // Skip stops that are already marked as reached
      if (stop.reached) {
        // If the stop is marked as reached in Firestore, add it to our local cache
        // This ensures we don't process it again until it's reset
        if (!reachedStops.has(stop.id)) {
          reachedStops.add(stop.id);
          console.log(`Stop "${stop.id}" is already marked as reached in Firestore, adding to local cache`);
        }
        continue;
      }
      
      // If the stop was previously reached but now shows as unreached in Firestore,
      // remove it from our local cache so it can be processed again
      if (!stop.reached && reachedStops.has(stop.id)) {
        reachedStops.delete(stop.id);
        console.log(`Stop "${stop.id}" has been reset to unreached, removing from local cache`);
      }
      
      // Skip stops that are in our local reached cache
      if (reachedStops.has(stop.id)) {
        continue;
      }
      
      // Normalize stop location data
      const stopLocation = {
        latitude: stop.Latitude,
        longitude: stop.Longitude
      };
      
      // Calculate distance between bus and stop
      const distance = calculateDistance(busLocation, stopLocation);
      
      // Only print distances for nearby stops (within 500m)
      if (distance <= 500) {
        console.log(`Distance to stop "${stop.id}": ${distance.toFixed(2)} meters`);
      }
      
      // Check if bus is within radius of stop
      if (distance <= STOP_RADIUS) {
        console.log(`Bus is within ${STOP_RADIUS}m of stop "${stop.id}" (${distance.toFixed(2)}m)`);
        await markStopAsReached(stop.id);
        anyStopReached = true;
      }
    }
    
    // If no stops were reached in this check, print a message
    if (!anyStopReached && stops.some(stop => !stop.reached && !reachedStops.has(stop.id))) {
      console.log('No stops reached yet');
    }
  } catch (error) {
    console.log('ERROR: Failed to check stops');
    console.log(error);
  }
}

/**
 * Clear the reached stops cache
 * This can be called when stops are reset
 */
function clearReachedStopsCache() {
  const count = reachedStops.size;
  reachedStops.clear();
  console.log(`Cleared ${count} stops from the reached stops cache`);
}

/**
 * Start the bus tracking system
 */
function startBusTracking() {
  console.log('=== BUS TRACKING SYSTEM STARTED ===');
  console.log(`Checking every ${CHECK_INTERVAL/1000} second`);
  
  // Run the check in a loop
  setInterval(checkStopsReached, CHECK_INTERVAL);
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('Shutting down bus tracking system...');
    process.exit(0);
  });
}

// If this module is being required by another module, export the clearReachedStopsCache function
if (module.parent) {
  module.exports = { clearReachedStopsCache };
} else {
  // Start the bus tracking system when this script is run directly
  startBusTracking();
}