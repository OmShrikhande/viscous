const { realtimeDatabase, firestoreDb } = require('../config/firebase');
const { ref, get } = require('firebase/database');
const { collection, getDocs } = require('firebase/firestore');

/**
 * Simple test for Firebase connectivity
 */
async function testFirebaseConnectivity() {
  console.log('=== FIREBASE CONNECTION TEST ===');
  
  let success = true;
  
  try {
    // Test Realtime Database
    console.log('\nTesting Realtime Database...');
    
    // Get Latitude directly
    const latRef = ref(realtimeDatabase, 'bus/Location/Latitude');
    const latSnapshot = await get(latRef);
    
    // Get Longitude directly
    const longRef = ref(realtimeDatabase, 'bus/Location/Longitude');
    const longSnapshot = await get(longRef);
    
    if (latSnapshot.exists() && longSnapshot.exists()) {
      const latitude = latSnapshot.val();
      const longitude = longSnapshot.val();
      console.log('REALTIME DATA: Bus location is (' + latitude + ', ' + longitude + ')');
    } else {
      console.log('ERROR: Could not get bus location from Realtime Database');
      success = false;
    }
  } catch (error) {
    console.log('ERROR: Failed to connect to Firebase Realtime Database');
    success = false;
  }
  
  try {
    // Test Firestore
    console.log('\nTesting Firestore...');
    const route2CollectionRef = collection(firestoreDb, 'Route2');
    const querySnapshot = await getDocs(route2CollectionRef);
    
    if (!querySnapshot.empty) {
      console.log(`FIRESTORE DATA: Found ${querySnapshot.size} bus stops`);
    } else {
      console.log('ERROR: No stops found in Firestore');
      success = false;
    }
  } catch (error) {
    console.log('ERROR: Failed to connect to Firestore');
    success = false;
  }
  
  return success;
}

// Run the test if this script is executed directly
if (require.main === module) {
  testFirebaseConnectivity()
    .then(success => {
      console.log('\n=== TEST RESULT ===');
      if (success) {
        console.log('Firebase connection successful!');
      } else {
        console.log('Firebase connection failed!');
      }
    })
    .catch(error => {
      console.error('Test failed with error:', error.message);
    });
}

module.exports = { testFirebaseConnectivity };