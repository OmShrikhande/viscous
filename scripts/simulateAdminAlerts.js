// This script simulates admin alerts for testing
// Run it with: node scripts/simulateAdminAlerts.js

const { initializeApp } = require('firebase/app');
const { getDatabase, ref, push, set } = require('firebase/database');
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

// Sample alert messages
const alertMessages = [
  {
    title: "Route Delay",
    message: "Route 1 is experiencing delays due to traffic congestion. Expect 10-15 minute delays.",
    type: "delay"
  },
  {
    title: "Service Change",
    message: "Route 2 will be using an alternate route today due to road construction on Main Street.",
    type: "change"
  },
  {
    title: "Weather Advisory",
    message: "Heavy rain expected this afternoon. Please allow extra time for your journey.",
    type: "weather"
  },
  {
    title: "Bus Full",
    message: "The next bus on Route 3 is currently at full capacity. Consider waiting for the following bus.",
    type: "capacity"
  },
  {
    title: "Service Cancellation",
    message: "The 5:30 PM service on Route 1 has been cancelled today. We apologize for the inconvenience.",
    type: "cancellation"
  }
];

// Function to create a random alert
const createRandomAlert = () => {
  const randomIndex = Math.floor(Math.random() * alertMessages.length);
  const alert = alertMessages[randomIndex];
  
  return {
    ...alert,
    timestamp: Date.now(),
    read: false
  };
};

// Function to add an alert to Firebase
const addAlert = async () => {
  try {
    const alertsRef = ref(database, 'adminAlerts');
    const newAlertRef = push(alertsRef);
    const alertData = createRandomAlert();
    
    await set(newAlertRef, alertData);
    console.log('Added new alert:', alertData);
  } catch (error) {
    console.error('Error adding alert:', error);
  }
};

// Add an alert immediately
addAlert();

// Then add a new alert every 2 minutes
setInterval(addAlert, 2 * 60 * 1000);

console.log('Admin alerts simulation started. Press Ctrl+C to stop.');