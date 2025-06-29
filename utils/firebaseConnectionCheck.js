import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, getDocs, limit, query } from 'firebase/firestore';
import { firestoreDb } from '../configs/FirebaseConfigs';

// Keep track of connection status
let isConnected = true;
let lastCheckTime = 0;
const CHECK_INTERVAL = 30000; // 30 seconds (more frequent checks)
const CONNECTION_TIMEOUT = 8000; // 8 seconds timeout (reduced from 10)
const MAX_RETRIES = 3; // Maximum number of retries for connection checks
let consecutiveFailures = 0;

/**
 * Check if Firestore is connected and accessible with retry logic
 * @param {boolean} forceCheck - Force a check even if within the interval
 * @returns {Promise<boolean>} True if connected, false otherwise
 */
export const checkFirestoreConnection = async (forceCheck = false) => {
  const now = Date.now();
  
  // Don't check too frequently unless forced
  if (!forceCheck && now - lastCheckTime < CHECK_INTERVAL) {
    return isConnected;
  }
  
  lastCheckTime = now;
  
  // Try multiple times before giving up
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`🔍 Checking Firestore connection (attempt ${attempt}/${MAX_RETRIES})...`);
      
      // Create a timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Firestore connection check timed out')), CONNECTION_TIMEOUT);
      });
      
      // Try to fetch a small amount of data from any collection with timeout
      const fetchPromise = async () => {
        const userDataRef = collection(firestoreDb, 'userdata');
        const q = query(userDataRef, limit(1));
        return await getDocs(q);
      };
      
      // Race the fetch against the timeout
      await Promise.race([fetchPromise(), timeoutPromise]);
      
      // If we get here, the connection is working
      console.log('✅ Firestore connection check successful');
      isConnected = true;
      consecutiveFailures = 0;
      
      // Store connection status
      try {
        await AsyncStorage.setItem('firestoreConnected', 'true');
      } catch (storageError) {
        console.warn('Could not store connection status:', storageError);
      }
      
      return true;
      
    } catch (error) {
      console.warn(`⚠️ Firestore connection check failed (attempt ${attempt}/${MAX_RETRIES}):`, error.message);
      
      // If this is not the last attempt, wait before retrying
      if (attempt < MAX_RETRIES) {
        const delay = Math.min(1000 * attempt, 3000); // Progressive delay, max 3 seconds
        console.log(`⏳ Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // All attempts failed
      console.error('❌ All Firestore connection attempts failed:', error.message);
      isConnected = false;
      consecutiveFailures++;
      
      // Store connection status
      try {
        await AsyncStorage.setItem('firestoreConnected', 'false');
      } catch (storageError) {
        console.warn('Could not store connection status:', storageError);
      }
      
      // Check if we need to reinitialize Firebase
      if (error.code === 'app/no-app' || error.message?.includes('app/no-app')) {
        console.log('🔄 Firebase app not initialized, attempting to reinitialize');
        // We'll rely on the auto-retry in FirebaseConfigs.js
      }
      
      // If we've had many consecutive failures, increase check interval
      if (consecutiveFailures >= 5) {
        console.log('🔄 Multiple consecutive failures, reducing check frequency');
        lastCheckTime = now + (CHECK_INTERVAL * 2); // Skip next check
      }
      
      return false;
    }
  }
  
  return false;
};

/**
 * Get the current connection status without performing a check
 * @returns {boolean} Current connection status
 */
export const getConnectionStatus = () => {
  return isConnected;
};

/**
 * Wrapper function to execute Firestore operations with connection retry
 * @param {Function} operation - The Firestore operation to execute
 * @param {number} maxRetries - Maximum number of retries (default: 2)
 * @returns {Promise} The result of the operation or throws after retries
 */
export const executeWithRetry = async (operation, maxRetries = 2) => {
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      return await operation();
    } catch (error) {
      const isConnectionIssue = await handleFirestoreError(error);
      
      if (isConnectionIssue && attempt <= maxRetries) {
        console.log(`🔄 Retrying Firestore operation (attempt ${attempt}/${maxRetries + 1}) due to connection issue...`);
        
        // Wait before retrying
        const delay = Math.min(1000 * attempt, 3000);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Force a connection check before retrying
        await checkFirestoreConnection(true);
        continue;
      }
      
      // If it's not a connection issue or we've exhausted retries, throw the error
      throw error;
    }
  }
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
 * Initialize connection monitoring with improved error handling
 */
export const initConnectionMonitoring = () => {
  let intervalId;
  
  try {
    console.log('🔄 Initializing Firestore connection monitoring...');
    
    // Check connection at intervals
    intervalId = setInterval(async () => {
      try {
        await checkFirestoreConnection();
      } catch (error) {
        console.warn('⚠️ Error during periodic connection check:', error.message);
        // Don't throw - just log and continue
      }
    }, CHECK_INTERVAL);
    
    // Initial check - don't wait for it to complete
    checkFirestoreConnection()
      .then(() => {
        console.log('✅ Initial Firestore connection check completed');
      })
      .catch(error => {
        console.warn('⚠️ Initial connection check failed:', error.message);
        // Don't throw - app should continue working
      });
    
    console.log('✅ Firestore connection monitoring initialized');
    
  } catch (error) {
    console.error('❌ Failed to initialize connection monitoring:', error);
  }
  
  // Return cleanup function
  return () => {
    try {
      if (intervalId) {
        clearInterval(intervalId);
        console.log('✅ Connection monitoring cleanup completed');
      }
    } catch (cleanupError) {
      console.warn('⚠️ Error during connection monitoring cleanup:', cleanupError);
    }
  };
};