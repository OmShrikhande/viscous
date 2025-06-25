/**
 * reset-all-stops.js
 * 
 * A standalone script to reset all bus stops to "unreached" status.
 * This can be run manually when needed, especially if the automatic midnight reset fails.
 * 
 * Usage: node reset-all-stops.js
 */

// Import Firebase configuration
const { firestoreDb } = require('./config/firebase');
const { collection, doc, getDocs, updateDoc } = require('firebase/firestore');

// Try to import the bus tracking module to clear its cache
let trackBusModule;
try {
  trackBusModule = require('./track-bus');
} catch (error) {
  console.log('Note: Bus tracking module not loaded, cache will not be cleared');
}

console.log('=== BUS STOPS RESET UTILITY ===');
console.log('This script will reset ALL stops to "unreached" status');
console.log('Starting reset process...');

/**
 * Get all stops from Firestore
 */
const getStops = async () => {
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
    
    console.log(`Found ${stops.length} bus stops`);
    return stops;
  } catch (error) {
    console.log('ERROR: Failed to connect to Firestore');
    console.error(error);
    return [];
  }
};

/**
 * Reset all stops to unreached status
 */
const resetAllStops = async () => {
  try {
    // Get all stops
    const stops = await getStops();
    
    if (stops.length === 0) {
      console.log('No stops found to reset');
      return;
    }
    
    console.log(`Resetting ${stops.length} stops...`);
    
    // Track reached stops for reporting
    const reachedStops = stops.filter(stop => stop.reached);
    console.log(`Found ${reachedStops.length} stops currently marked as reached`);
    
    if (reachedStops.length > 0) {
      console.log('Stops currently marked as reached:');
      reachedStops.forEach(stop => {
        console.log(`- ${stop.id}`);
      });
    }
    
    // Reset each stop
    let successCount = 0;
    let errorCount = 0;
    
    for (const stop of stops) {
      try {
        const stopRef = doc(firestoreDb, 'Route2', stop.id);
        await updateDoc(stopRef, {
          reached: false,
          reachedAt: null,
          reachedTime: null,
          reachedDate: null
        });
        
        console.log(`✓ Reset stop: ${stop.id}`);
        successCount++;
      } catch (error) {
        console.error(`✗ Error resetting stop ${stop.id}:`, error);
        errorCount++;
      }
    }
    
    // Final report
    console.log('\n=== RESET COMPLETE ===');
    console.log(`Total stops: ${stops.length}`);
    console.log(`Successfully reset: ${successCount}`);
    console.log(`Failed to reset: ${errorCount}`);
    
    // Clear the reached stops cache in the tracking module if it's loaded
    if (trackBusModule && typeof trackBusModule.clearReachedStopsCache === 'function') {
      trackBusModule.clearReachedStopsCache();
      console.log('Cleared reached stops cache in tracking module');
    } else {
      console.log('Note: Tracking module cache not cleared (module not loaded or function not available)');
      console.log('If the bus tracking system is running, you may need to restart it');
    }
    
    // Record the reset in the system config
    try {
      const resetLogRef = doc(firestoreDb, 'SystemConfig', 'lastManualReset');
      await updateDoc(resetLogRef, {
        timestamp: new Date().toISOString(),
        totalStops: stops.length,
        successCount,
        errorCount,
        resetBy: 'manual-script'
      });
      console.log('Reset log saved to database');
    } catch (error) {
      console.error('Error saving reset log:', error);
    }
    
  } catch (error) {
    console.error('Error during reset process:', error);
  }
};

// Execute the reset
resetAllStops()
  .then(() => {
    console.log('Reset process completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('Fatal error during reset:', error);
    process.exit(1);
  });