/**
 * Script to update bus location near a stop to test stop detection
 */
const { realtimeDatabase, firestoreDb } = require('./config/firebase');
const { ref, set } = require('firebase/database');
const { collection, getDocs } = require('firebase/firestore');

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
 * Update the bus location in Firebase Realtime Database
 * @param {number} latitude - Latitude coordinate
 * @param {number} longitude - Longitude coordinate
 */
const updateBusLocation = async (latitude, longitude) => {
  try {
    // Update Latitude
    const latRef = ref(realtimeDatabase, 'bus/Location/Latitude');
    await set(latRef, latitude);
    
    // Update Longitude
    const longRef = ref(realtimeDatabase, 'bus/Location/Longitude');
    await set(longRef, longitude);
    
    // Update Timestamp
    const timestampRef = ref(realtimeDatabase, 'bus/Location/Timestamp');
    const now = new Date();
    await set(timestampRef, now.toISOString());
    
    console.log(`Bus location updated to: (${latitude}, ${longitude})`);
  } catch (error) {
    console.error('Error updating bus location:', error.message);
  }
};

/**
 * Update bus location to be near a stop
 */
async function updateBusNearStop() {
  // Get all stops
  const stops = await getStops();
  
  if (!stops || stops.length === 0) {
    console.log('No stops found');
    return;
  }
  
  // Find a stop that hasn't been reached yet
  const unreachedStops = stops.filter(stop => !stop.reached);
  
  if (unreachedStops.length === 0) {
    console.log('All stops have been reached already');
    return;
  }
  
  // Choose the first unreached stop
  const targetStop = unreachedStops[0];
  
  console.log(`Targeting stop: ${targetStop.id}`);
  console.log(`Stop location: (${targetStop.Latitude}, ${targetStop.Longitude})`);
  
  // Set bus location EXACTLY at the stop to ensure it's detected
  const busLatitude = targetStop.Latitude;
  const busLongitude = targetStop.Longitude;
  
  // Update bus location
  await updateBusLocation(busLatitude, busLongitude);
  
  console.log('Bus location updated to be near the stop');
  console.log('Now run track-bus.js to see if the stop is detected as reached');
}

// Run the update if this script is executed directly
if (require.main === module) {
  updateBusNearStop()
    .then(() => {
      console.log('Update completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('Update failed:', error);
      process.exit(1);
    });
}