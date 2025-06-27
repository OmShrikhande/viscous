/**
 * Firebase configuration for the Tracking Server
 * This file initializes Firebase using environment variables
 */

// Import Firebase modules
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getDatabase, ref, onValue, off } from 'firebase/database';

// Firebase configuration from environment variables with fallbacks
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyAc_3UzizC6Y-hzI_5fDYmXiTSTwR69oac",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "bus-tracker-4e0fc.firebaseapp.com",
  databaseURL: process.env.REACT_APP_FIREBASE_DATABASE_URL || "https://bus-tracker-4e0fc-default-rtdb.firebaseio.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "bus-tracker-4e0fc",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "bus-tracker-4e0fc.appspot.com",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "899399291440",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:899399291440:web:1c4535401988d905e293f5",
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID || "G-JFC5HHBVGC"
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

// Export Firebase instances and functions
// Export realtimeDatabase as db for backward compatibility
const db = realtimeDatabase;

export {
  firebaseApp,
  firestoreDb,
  realtimeDatabase,
  db,  // Add db as an alias for realtimeDatabase
  ref,
  onValue,
  off
};