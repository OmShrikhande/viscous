// Firebase configuration with robust connection management

<<<<<<< HEAD
import connectionManager, { firestoreDb, realtimeDatabase } from '../utils/firebaseConnectionManager';
=======
import { getApp, getApps, initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getFirestore } from "firebase/firestore";

// Safe configuration
const firebaseConfig = {
  apiKey: "AIzaSyAc_3UzizC6Y-hzI_5fDYmXiTSTwR69oac",
  authDomain: "bus-tracker-4e0fc.firebaseapp.com",
  databaseURL: "https://bus-tracker-4e0fc-default-rtdb.firebaseio.com",
  projectId: "bus-tracker-4e0fc",
  storageBucket: "bus-tracker-4e0fc.firebasestorage.app",
  messagingSenderId: "899399291440",
  appId: "1:899399291440:web:1c4535401988d905e293f5",
  measurementId: "G-JFC5HHBVGC",
  database: "bus-tracker-4e0fc-default-rtdb"
};

// Singleton pattern - only initialize Firebase once
let firebaseApp;
let firestoreDb;
let realtimeDatabase;

try {
  // Check if Firebase app is already initialized
  if (getApps().length === 0) {
    console.log("Initializing Firebase app for the first time");
    firebaseApp = initializeApp(firebaseConfig);
  } else {
    console.log("Firebase app already initialized, reusing existing app");
    firebaseApp = getApp();
  }
  
  // Initialize services with retry mechanism
  const initializeServices = async (retryCount = 0, maxRetries = 3) => {
    try {
      firestoreDb = getFirestore(firebaseApp);
      realtimeDatabase = getDatabase(firebaseApp);
      console.log("Firebase services initialized successfully");
      console.log("Firestore DB:", !!firestoreDb);
      console.log("Realtime Database:", !!realtimeDatabase);
      return true;
    } catch (error) {
      console.error(`Error initializing Firebase services (attempt ${retryCount + 1}/${maxRetries}):`, error);
      
      if (retryCount < maxRetries) {
        console.log(`Retrying in ${(retryCount + 1) * 1000}ms...`);
        await new Promise(resolve => setTimeout(resolve, (retryCount + 1) * 1000));
        return initializeServices(retryCount + 1, maxRetries);
      }
      
      return false;
    }
  };
  
  // Initialize services immediately but don't wait for the result
  initializeServices();
  
  // Create initial fallback objects to prevent crashes during initialization
  if (!firestoreDb) {
    console.warn("Creating temporary Firestore fallback");
    firestoreDb = {
      collection: () => ({ get: async () => ({ docs: [] }) }),
      doc: () => ({ get: async () => ({ exists: false, data: () => ({}) }) })
    };
  }
  
  if (!realtimeDatabase) {
    console.warn("Creating temporary Realtime Database fallback");
    realtimeDatabase = {
      ref: () => ({ on: () => {}, off: () => {}, once: async () => ({ val: () => ({}) }) })
    };
  }
} catch (error) {
  console.error("Critical error initializing Firebase:", error);
  
  // Create fallback objects to prevent app crashes
  if (!firestoreDb) {
    console.warn("Creating fallback Firestore object");
    firestoreDb = {
      collection: () => ({ get: async () => ({ docs: [] }) }),
      doc: () => ({ get: async () => ({ exists: false, data: () => ({}) }) })
    };
  }
  
  if (!realtimeDatabase) {
    console.warn("Creating fallback Realtime Database object");
    realtimeDatabase = {
      ref: () => ({ on: () => {}, off: () => {}, once: async () => ({ val: () => ({}) }) })
    };
  }
}
>>>>>>> e0fd2b23a14b733eb50e5885557d6ec4ed459c2e

// Re-export the services from the connection manager
export { firestoreDb, realtimeDatabase };

// Export connection utilities
    export { addConnectionListener, forceReconnect, getConnectionStatus } from '../utils/firebaseConnectionManager';

// Export the connection manager for advanced usage
export default connectionManager;

vi