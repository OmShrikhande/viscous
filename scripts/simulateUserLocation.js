// This script simulates user location data for testing
// Run it with: node scripts/simulateUserLocation.js

const { initializeApp } = require('firebase/app');
const { getFirestore, doc, updateDoc, getDoc } = require('firebase/firestore');
const { getDatabase, ref, get } = require('firebase/database');
require('dotenv').config();

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID,
  databaseURL: process.env.FIREBASE_DATABASE_URL
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);
const database = getDatabase(app);

// Email of the user to simulate
const userEmail = process.argv[2];

if (!userEmail) {
  console.error('Please provide a user email as an argument');
  console.log('Usage: node scripts/simulateUserLocation.js user@example.com');
  process.exit(1);
}

// Function to calculate a random position near a given location
const getRandomNearbyLocation = (baseLat, baseLng, maxDistanceMeters = 1000) => {
  // Convert max distance from meters to degrees (approximate)
  const maxLat = maxDistanceMeters / 111000; // 1 degree latitude is approximately 111km
  const maxLng = maxDistanceMeters / (111000 * Math.cos(baseLat * (Math.PI / 180))); // Adjust for longitude
  
  // Generate random offsets
  const latOffset = (Math.random() * 2 - 1) * maxLat;
  const lngOffset = (Math.random() * 2 - 1) * maxLng;
  
  return {
    latitude: baseLat + latOffset,
    longitude: baseLng + lngOffset
  };
};

// Function to calculate distance between two coordinates in meters
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
};

// Function to simulate user approaching the bus
const simulateApproachingBus = async () => {
  try {
    // Get bus location from Realtime Database
    const busLocationRef = ref(database, 'bus/Location');
    const busLocationSnapshot = await get(busLocationRef);
    const busLocationData = busLocationSnapshot.val();
    
    if (!busLocationData || !busLocationData.Latitude || !busLocationData.Longitude) {
      console.error('No valid bus location data found');
      return;
    }
    
    const busLocation = {
      latitude: parseFloat(busLocationData.Latitude),
      longitude: parseFloat(busLocationData.Longitude)
    };
    
    // Get user document
    const userDocRef = doc(firestore, 'userdata', userEmail);
    const userDocSnapshot = await getDoc(userDocRef);
    
    if (!userDocSnapshot.exists()) {
      console.error('User document not found in Firestore');
      return;
    }
    
    const userData = userDocSnapshot.data();
    const currentlyOnboard = userData.onboarding === true;
    
    // Determine if we should simulate approaching or leaving
    let targetDistance;
    let action;
    
    if (currentlyOnboard) {
      // If already onboard, simulate leaving (moving away)
      targetDistance = Math.random() * 100 + 20; // 20-120 meters away
      action = 'leaving';
    } else {
      // If not onboard, simulate approaching
      targetDistance = Math.random() * 8; // 0-8 meters away (within proximity threshold)
      action = 'approaching';
    }
    
    // Generate a location at approximately the target distance
    let attempts = 0;
    let userLocation;
    let actualDistance;
    
    do {
      // Start with a random location within 1km
      userLocation = getRandomNearbyLocation(busLocation.latitude, busLocation.longitude, 1000);
      
      // Calculate actual distance
      actualDistance = calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        busLocation.latitude,
        busLocation.longitude
      );
      
      // Adjust the location to get closer to target distance
      const ratio = targetDistance / actualDistance;
      const adjustedLat = busLocation.latitude + (userLocation.latitude - busLocation.latitude) * ratio;
      const adjustedLng = busLocation.longitude + (userLocation.longitude - busLocation.longitude) * ratio;
      
      userLocation = {
        latitude: adjustedLat,
        longitude: adjustedLng
      };
      
      // Recalculate distance with adjusted location
      actualDistance = calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        busLocation.latitude,
        busLocation.longitude
      );
      
      attempts++;
    } while (Math.abs(actualDistance - targetDistance) > 5 && attempts < 10);
    
    // Update user location in Firestore
    await updateDoc(userDocRef, {
      lastLocation: userLocation,
      lastLocationTimestamp: new Date().toISOString()
    });
    
    console.log(`Simulated user ${action} bus:`);
    console.log(`- Bus location: ${busLocation.latitude}, ${busLocation.longitude}`);
    console.log(`- User location: ${userLocation.latitude}, ${userLocation.longitude}`);
    console.log(`- Distance: ${actualDistance.toFixed(2)} meters`);
    console.log(`- Target distance: ${targetDistance.toFixed(2)} meters`);
    console.log(`- Current onboarding status: ${currentlyOnboard ? 'ON BUS' : 'NOT ON BUS'}`);
    
    return { userLocation, busLocation, distance: actualDistance };
  } catch (error) {
    console.error('Error simulating user location:', error);
  }
};

// Run simulation once
simulateApproachingBus().then(() => {
  console.log('Simulation complete');
  
  // Continue simulating every 10 seconds
  setInterval(simulateApproachingBus, 10000);
});

console.log(`Starting user location simulation for ${userEmail}. Press Ctrl+C to stop.`);