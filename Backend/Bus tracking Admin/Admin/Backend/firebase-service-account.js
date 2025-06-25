/**
 * This file provides a helper function to initialize Firebase Admin SDK
 * using the credentials from the .env file
 */

// Import Firebase client SDK instead of admin SDK
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, getDoc, query, where, orderBy, limit } = require('firebase/firestore');
const { getDatabase, ref, get } = require('firebase/database');

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "AIzaSyAc_3UzizC6Y-hzI_5fDYmXiTSTwR69oac",
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || "bus-tracker-4e0fc.firebaseapp.com",
  databaseURL: process.env.FIREBASE_DATABASE_URL || "https://bus-tracker-4e0fc-default-rtdb.firebaseio.com",
  projectId: process.env.FIREBASE_PROJECT_ID || "bus-tracker-4e0fc",
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "bus-tracker-4e0fc.firebasestorage.app",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "899399291440",
  appId: process.env.FIREBASE_APP_ID || "1:899399291440:web:1c4535401988d905e293f5",
  measurementId: process.env.FIREBASE_MEASUREMENT_ID || "G-JFC5HHBVGC"
};

// Initialize Firebase client SDK
let firebaseApp = null;
let firestoreDb = null;
let realtimeDb = null;

// Initialize Firebase client
const initializeFirebaseClient = () => {
  try {
    // Check if already initialized
    if (firebaseApp) {
      console.log('Firebase already initialized');
      return { app: firebaseApp, firestore: firestoreDb, database: realtimeDb };
    }
    
    // Initialize Firebase app
    console.log('Initializing Firebase with config:', JSON.stringify(firebaseConfig, null, 2));
    firebaseApp = initializeApp(firebaseConfig);
    
    // Initialize Firestore
    firestoreDb = getFirestore(firebaseApp);
    
    // Initialize Realtime Database
    realtimeDb = getDatabase(firebaseApp);
    
    console.log('Firebase initialized successfully');
    
    return { 
      app: firebaseApp, 
      firestore: firestoreDb, 
      database: realtimeDb 
    };
  } catch (error) {
    console.error('Error initializing Firebase:', error);
    
    // Return a dummy object that won't throw errors
    return {
      app: null,
      firestore: null,
      database: null
    };
  }
};

// Create a wrapper that mimics the admin SDK interface
const createFirebaseWrapper = () => {
  // Initialize Firebase client
  const { firestore, database } = initializeFirebaseClient();
  
  return {
    // Mimic the admin.firestore() method
    firestore: () => ({
      collection: (collectionPath) => ({
        doc: (docPath) => ({
          collection: (subCollectionPath) => ({
            get: async () => {
              try {
                console.log(`Getting subcollection: ${collectionPath}/${docPath}/${subCollectionPath}`);
                const subCollRef = collection(firestore, collectionPath, docPath, subCollectionPath);
                const snapshot = await getDocs(subCollRef);
                
                // Convert to format similar to admin SDK
                const docs = [];
                snapshot.forEach(doc => {
                  docs.push({
                    id: doc.id,
                    data: () => doc.data()
                  });
                });
                
                return {
                  empty: docs.length === 0,
                  size: docs.length,
                  docs: docs
                };
              } catch (error) {
                console.error(`Error getting subcollection ${subCollectionPath}:`, error);
                return { empty: true, size: 0, docs: [] };
              }
            }
          }),
          get: async () => {
            try {
              console.log(`Getting document: ${collectionPath}/${docPath}`);
              const docRef = doc(firestore, collectionPath, docPath);
              const snapshot = await getDoc(docRef);
              
              return {
                exists: snapshot.exists(),
                id: snapshot.id,
                data: () => snapshot.data()
              };
            } catch (error) {
              console.error(`Error getting document ${docPath}:`, error);
              return { exists: false, data: () => null };
            }
          }
        }),
        get: async () => {
          try {
            console.log(`Getting collection: ${collectionPath}`);
            const collRef = collection(firestore, collectionPath);
            const snapshot = await getDocs(collRef);
            
            // Convert to format similar to admin SDK
            const docs = [];
            snapshot.forEach(doc => {
              docs.push({
                id: doc.id,
                data: () => doc.data()
              });
            });
            
            return {
              empty: docs.length === 0,
              size: docs.length,
              docs: docs,
              forEach: (callback) => docs.forEach(callback)
            };
          } catch (error) {
            console.error(`Error getting collection ${collectionPath}:`, error);
            return { empty: true, size: 0, docs: [], forEach: () => {} };
          }
        }
      }),
      listCollections: async () => {
        console.log('Listing collections is not supported in Firebase client SDK');
        return [];
      }
    }),
    // Add database reference for realtime database
    database: () => database
  };
};

// Function to initialize Firebase (replaces initializeFirebaseAdmin)
const initializeFirebaseAdmin = () => {
  return createFirebaseWrapper();
};

// Initialize Firebase client SDK


module.exports = {
  initializeFirebaseAdmin,
  initializeFirebaseClient,
  firebaseConfig,
  // Export Firebase client SDK functions for direct use
  firestoreFunctions: {
    collection,
    getDocs,
    doc,
    getDoc,
    query,
    where,
    orderBy,
    limit
  },
  databaseFunctions: {
    ref,
    get
  }
};