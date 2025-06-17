// This script simulates bus capacity data for testing
// Run it with: node scripts/simulateBusCapacity.js

const { initializeApp } = require('firebase/app');
const { getDatabase, ref, set } = require('firebase/database');
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
const database = getDatabase(app);

// Function to generate random bus capacity data
const generateBusCapacityData = (routeNumber) => {
  const totalCapacity = 40; // Total seats on the bus
  const currentPassengers = Math.floor(Math.random() * (totalCapacity + 1)); // Random number of passengers
  
  // Generate seat map
  const seatMap = [];
  const occupiedSeats = new Set();
  
  // Randomly select occupied seats
  while (occupiedSeats.size < currentPassengers && occupiedSeats.size < totalCapacity) {
    const seatNumber = Math.floor(Math.random() * totalCapacity) + 1;
    occupiedSeats.add(seatNumber);
  }
  
  // Create seat map array
  for (let i = 1; i <= totalCapacity; i++) {
    seatMap.push({
      seatNumber: i,
      isOccupied: occupiedSeats.has(i)
    });
  }
  
  return {
    totalCapacity,
    currentPassengers,
    lastUpdated: Date.now(),
    seatMap
  };
};

// Function to update bus capacity data in Firebase
const updateBusCapacityData = async (routeNumber) => {
  try {
    const capacityData = generateBusCapacityData(routeNumber);
    const capacityRef = ref(database, `busCapacity/route${routeNumber}`);
    
    await set(capacityRef, capacityData);
    console.log(`Updated capacity data for route ${routeNumber}:`, capacityData);
  } catch (error) {
    console.error(`Error updating capacity data for route ${routeNumber}:`, error);
  }
};

// Update capacity data for multiple routes
const updateAllRoutes = async () => {
  const routes = [1, 2, 3]; // Add your route numbers here
  
  for (const route of routes) {
    await updateBusCapacityData(route);
  }
};

// Run once immediately
updateAllRoutes();

// Then update every 30 seconds
setInterval(updateAllRoutes, 30000);

console.log('Bus capacity simulation started. Press Ctrl+C to stop.');