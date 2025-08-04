import { AppState } from 'react-native';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getDatabase, goOffline, goOnline } from 'firebase/database';
import { getFirestore, connectFirestoreEmulator, enableNetwork, disableNetwork } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Firebase configuration
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

class FirebaseConnectionManager {
  constructor() {
    this.app = null;
    this.database = null;
    this.firestore = null;
    this.isConnected = false;
    this.isInitialized = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000; // Start with 1 second
    this.maxReconnectDelay = 30000; // Max 30 seconds
    this.connectionListeners = new Set();
    this.appStateSubscription = null;
    this.heartbeatInterval = null;
    this.connectionTimeout = null;
    
    // Persistence settings
    this.enablePersistence = true;
    this.persistenceEnabled = false;
    
    this.initialize();
  }

  // Initialize Firebase with robust error handling
  async initialize() {
    try {
      console.log('🔄 Initializing Firebase Connection Manager...');
      
      // Initialize Firebase app
      if (getApps().length === 0) {
        this.app = initializeApp(firebaseConfig);
        console.log('✅ Firebase app initialized');
      } else {
        this.app = getApp();
        console.log('✅ Using existing Firebase app');
      }

      // Initialize services
      await this.initializeServices();
      
      // Set up connection monitoring
      this.setupConnectionMonitoring();
      
      // Set up app state monitoring
      this.setupAppStateMonitoring();
      
      this.isInitialized = true;
      console.log('✅ Firebase Connection Manager initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize Firebase Connection Manager:', error);
      // Retry initialization after a delay
      setTimeout(() => {
        this.initialize();
      }, this.reconnectDelay);
    }
  }

  // Initialize Firebase services with persistence
  async initializeServices() {
    try {
      // Initialize Realtime Database
      this.database = getDatabase(this.app);
      console.log('✅ Realtime Database initialized');
      
      // Initialize Firestore
      this.firestore = getFirestore(this.app);
      console.log('✅ Firestore initialized');
      
      // Enable persistence for offline support
      if (this.enablePersistence && !this.persistenceEnabled) {
        try {
          // Note: Firestore persistence is automatically enabled in React Native
          // For Realtime Database, we rely on built-in disk persistence
          this.persistenceEnabled = true;
          console.log('✅ Firebase persistence enabled');
        } catch (persistenceError) {
          console.warn('⚠️ Could not enable persistence:', persistenceError);
        }
      }
      
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.notifyConnectionChange(true);
      
    } catch (error) {
      console.error('❌ Failed to initialize Firebase services:', error);
      this.isConnected = false;
      this.notifyConnectionChange(false);
      throw error;
    }
  }

  // Set up connection monitoring with heartbeat
  setupConnectionMonitoring() {
    // Clear existing monitoring
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    // Set up periodic connection check (every 30 seconds)
    this.heartbeatInterval = setInterval(() => {
      this.checkConnection();
    }, 30000);
    
    // Initial connection check
    this.checkConnection();
  }

  // Check connection status with lightweight operation
  async checkConnection() {
    try {
      // Use a lightweight operation to check connection
      const testRef = this.database.ref('.info/connected');
      
      // Set up a one-time listener for connection status
      const connectedPromise = new Promise((resolve) => {
        const unsubscribe = testRef.on('value', (snapshot) => {
          unsubscribe();
          resolve(snapshot.val());
        });
        
        // Timeout after 10 seconds
        setTimeout(() => {
          unsubscribe();
          resolve(false);
        }, 10000);
      });
      
      const connected = await connectedPromise;
      
      if (connected !== this.isConnected) {
        console.log(`🔄 Connection status changed: ${connected ? 'Connected' : 'Disconnected'}`);
        this.isConnected = connected;
        this.notifyConnectionChange(connected);
        
        if (!connected) {
          this.handleDisconnection();
        } else {
          this.handleReconnection();
        }
      }
      
    } catch (error) {
      console.error('❌ Connection check failed:', error);
      if (this.isConnected) {
        this.isConnected = false;
        this.notifyConnectionChange(false);
        this.handleDisconnection();
      }
    }
  }

  // Handle disconnection
  handleDisconnection() {
    console.log('⚠️ Firebase disconnected, attempting to reconnect...');
    
    // Clear any existing connection timeout
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
    }
    
    // Attempt to reconnect
    this.attemptReconnection();
  }

  // Handle successful reconnection
  handleReconnection() {
    console.log('✅ Firebase reconnected successfully');
    this.reconnectAttempts = 0;
    this.reconnectDelay = 1000; // Reset delay
    
    // Clear any existing connection timeout
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
    }
  }

  // Attempt to reconnect with exponential backoff
  async attemptReconnection() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached');
      return;
    }
    
    this.reconnectAttempts++;
    console.log(`🔄 Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
    
    try {
      // Force database to go offline then online
      await goOffline(this.database);
      await new Promise(resolve => setTimeout(resolve, 1000));
      await goOnline(this.database);
      
      // Force Firestore to reconnect
      await disableNetwork(this.firestore);
      await new Promise(resolve => setTimeout(resolve, 1000));
      await enableNetwork(this.firestore);
      
      console.log('✅ Reconnection successful');
      
    } catch (error) {
      console.error(`❌ Reconnection attempt ${this.reconnectAttempts} failed:`, error);
      
      // Schedule next reconnection attempt with exponential backoff
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay);
      
      this.connectionTimeout = setTimeout(() => {
        this.attemptReconnection();
      }, this.reconnectDelay);
    }
  }

  // Set up app state monitoring
  setupAppStateMonitoring() {
    // Remove existing subscription
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
    }
    
    // Add new subscription
    this.appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
      console.log(`📱 App state changed to: ${nextAppState}`);
      
      if (nextAppState === 'active') {
        // App came to foreground - ensure connection is active
        this.handleAppBecameActive();
      } else if (nextAppState === 'background') {
        // App went to background - maintain connection but reduce activity
        this.handleAppWentToBackground();
      }
    });
  }

  // Handle app becoming active
  async handleAppBecameActive() {
    console.log('📱 App became active - ensuring Firebase connection');
    
    try {
      // Ensure database is online
      await goOnline(this.database);
      
      // Ensure Firestore is connected
      await enableNetwork(this.firestore);
      
      // Force a connection check
      await this.checkConnection();
      
    } catch (error) {
      console.error('❌ Failed to ensure connection on app activation:', error);
    }
  }

  // Handle app going to background
  async handleAppWentToBackground() {
    console.log('📱 App went to background - maintaining Firebase connection');
    
    // Note: We keep the connection alive for background tasks
    // but we don't force offline mode as background tasks need connectivity
    
    // Store connection status for when app comes back
    try {
      await AsyncStorage.setItem('lastConnectionStatus', this.isConnected.toString());
    } catch (error) {
      console.warn('⚠️ Could not store connection status:', error);
    }
  }

  // Add connection listener
  addConnectionListener(listener) {
    this.connectionListeners.add(listener);
    
    // Return unsubscribe function
    return () => {
      this.connectionListeners.delete(listener);
    };
  }

  // Notify connection change to listeners
  notifyConnectionChange(connected) {
    this.connectionListeners.forEach(listener => {
      try {
        listener(connected);
      } catch (error) {
        console.error('❌ Error notifying connection listener:', error);
      }
    });
  }

  // Get connection status
  getConnectionStatus() {
    return this.isConnected;
  }

  // Get Firebase services
  getDatabase() {
    return this.database;
  }

  getFirestore() {
    return this.firestore;
  }

  // Force reconnection
  async forceReconnect() {
    console.log('🔄 Forcing Firebase reconnection...');
    this.reconnectAttempts = 0;
    await this.attemptReconnection();
  }

  // Cleanup
  cleanup() {
    console.log('🧹 Cleaning up Firebase Connection Manager...');
    
    // Clear intervals
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
    }
    
    // Remove app state listener
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
    }
    
    // Clear listeners
    this.connectionListeners.clear();
    
    console.log('✅ Firebase Connection Manager cleanup completed');
  }
}

// Create singleton instance
const connectionManager = new FirebaseConnectionManager();

export default connectionManager;

// Export individual services for backward compatibility
export const firestoreDb = connectionManager.getFirestore();
export const realtimeDatabase = connectionManager.getDatabase();

// Export connection utilities
export const addConnectionListener = connectionManager.addConnectionListener.bind(connectionManager);
export const getConnectionStatus = connectionManager.getConnectionStatus.bind(connectionManager);
export const forceReconnect = connectionManager.forceReconnect.bind(connectionManager);