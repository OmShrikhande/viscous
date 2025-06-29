/**
 * Firebase configuration for the Tracking Server
 * This file initializes Firebase using environment variables
 */

// Import Firebase modules
const { initializeApp } = require('firebase/app');
const { getFirestore } = require('firebase/firestore');
const { getDatabase } = require('firebase/database');

// Firebase configuration from environment variables with fallbacks
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "AIzaSyAc_3UzizC6Y-hzI_5fDYmXiTSTwR69oac",
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || "bus-tracker-4e0fc.firebaseapp.com",
  databaseURL: process.env.FIREBASE_DATABASE_URL || "https://bus-tracker-4e0fc-default-rtdb.firebaseio.com",
  projectId: process.env.FIREBASE_PROJECT_ID || "bus-tracker-4e0fc",
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "bus-tracker-4e0fc.appspot.com",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "899399291440",
  appId: process.env.FIREBASE_APP_ID || "1:899399291440:web:1c4535401988d905e293f5",
  measurementId: process.env.FIREBASE_MEASUREMENT_ID || "G-JFC5HHBVGC"
};

// Initialize Firebase
let firebaseApp;
let firestoreDb;
let realtimeDatabase;

try {
  console.log('Initializing Firebase for Tracking Server...');
  firebaseApp = initializeApp(firebaseConfig);
  firestoreDb = getFirestore(firebaseApp);
  realtimeDatabase = getDatabase(firebaseApp);
  console.log('Firebase initialized successfully for Tracking Server');
} catch (error) {
  console.error('Error initializing Firebase:', error);
  // Provide empty objects to prevent crashes
  firestoreDb = {};
  realtimeDatabase = {};
}

module.exports = {
  firebaseApp,
  firestoreDb,
  realtimeDatabase
};