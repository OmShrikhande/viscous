import { collection, getDocs, limit, query } from 'firebase/firestore';
import { firestoreDb } from '../configs/FirebaseConfigs';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Keep track of connection status
let isConnected = true;
let lastCheckTime = 0;
const CHECK_INTERVAL = 60000; // 1 minute

/**
 * Check if Firestore is connected and accessible
 * @returns {Promise<boolean>} True if connected, false otherwise
 */
export const checkFirestoreConnection = async () => {
  const now = Date.now();
  
  // Don't check too frequently
  if (now - lastCheckTime < CHECK_INTERVAL) {
    return isConnected;
  }
  
  lastCheckTime = now;
  
  try {
    console.log('Checking Firestore connection...');
    
    // Try to fetch a small amount of data from any collection
    const userDataRef = collection(firestoreDb, 'userdata');
    const q = query(userDataRef, limit(1));
    const snapshot = await getDocs(q);
    
    // If we get here, the connection is working
    console.log('Firestore connection check successful');
    isConnected = true;
    
    // Store connection status
    await AsyncStorage.setItem('firestoreConnected', 'true');
    
    return true;
  } catch (error) {
    console.error('Firestore connection check failed:', error);
    isConnected = false;
    
    // Store connection status
    await AsyncStorage.setItem('firestoreConnected', 'false');
    
    return false;
  }
};

/**
 * Get the current connection status without performing a check
 * @returns {boolean} Current connection status
 */
export const getConnectionStatus = () => {
  return isConnected;
};

/**
 * Handle a Firestore error and determine if it's a connection issue
 * @param {Error} error The error to handle
 * @returns {boolean} True if it's a connection issue, false otherwise
 */
export const handleFirestoreError = async (error) => {
  console.error('Firestore error:', error);
  
  // Check if it's a connection error
  const isConnectionError = 
    error.code === 'unavailable' || 
    error.code === 'resource-exhausted' ||
    error.message?.includes('network') ||
    error.message?.includes('connection') ||
    error.message?.includes('transport');
  
  if (isConnectionError) {
    console.log('Detected Firestore connection issue');
    isConnected = false;
    await AsyncStorage.setItem('firestoreConnected', 'false');
  }
  
  return isConnectionError;
};

/**
 * Initialize connection monitoring
 */
export const initConnectionMonitoring = () => {
  // Check connection every minute
  setInterval(async () => {
    await checkFirestoreConnection();
  }, CHECK_INTERVAL);
  
  // Initial check
  checkFirestoreConnection();
};