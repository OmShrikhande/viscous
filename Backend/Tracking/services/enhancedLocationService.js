/**
 * Enhanced Location Service with Smart Storage Logic
 * 
 * Features:
 * - Stores location every 5 seconds
 * - After 6 consecutive stores, pauses for 1 minute
 * - Prevents excessive database writes while maintaining accuracy
 * - Includes fallback mechanisms and error handling
 */

const { ref, set, get } = require('firebase/database');
const { collection, doc, setDoc, serverTimestamp } = require('firebase/firestore');
const { realtimeDatabase, firestoreDb } = require('../config/firebase');

class EnhancedLocationService {
  constructor() {
    // Storage control variables
    this.consecutiveStores = 0;
    this.maxConsecutiveStores = 6;
    this.pauseDuration = 60000; // 1 minute in milliseconds
    this.storageInterval = 5000; // 5 seconds in milliseconds
    this.isPaused = false;
    this.pauseStartTime = null;
    
    // Location tracking
    this.lastStoredLocation = null;
    this.currentLocation = null;
    
    // Intervals
    this.storageIntervalId = null;
    this.pauseCheckIntervalId = null;
    
    // Statistics
    this.stats = {
      totalStores: 0,
      pauseCount: 0,
      lastStoreTime: null,
      lastPauseTime: null
    };
    
    console.log('🚀 Enhanced Location Service initialized');
    console.log(`📊 Configuration: Store every ${this.storageInterval/1000}s, pause for ${this.pauseDuration/1000}s after ${this.maxConsecutiveStores} consecutive stores`);
  }
  
  /**
   * Start the enhanced location storage service
   */
  start() {
    console.log('🔄 Starting Enhanced Location Storage Service...');
    
    // Start the main storage interval
    this.storageIntervalId = setInterval(() => {
      this.processLocationStorage();
    }, this.storageInterval);
    
    // Start pause check interval (check every second)
    this.pauseCheckIntervalId = setInterval(() => {
      this.checkPauseStatus();
    }, 1000);
    
    console.log('✅ Enhanced Location Storage Service started');
  }
  
  /**
   * Stop the service
   */
  stop() {
    console.log('🛑 Stopping Enhanced Location Storage Service...');
    
    if (this.storageIntervalId) {
      clearInterval(this.storageIntervalId);
      this.storageIntervalId = null;
    }
    
    if (this.pauseCheckIntervalId) {
      clearInterval(this.pauseCheckIntervalId);
      this.pauseCheckIntervalId = null;
    }
    
    console.log('✅ Enhanced Location Storage Service stopped');
  }
  
  /**
   * Get current bus location from Realtime Database
   */
  async getBusLocation() {
    try {
      const latRef = ref(realtimeDatabase, 'bus/Location/Latitude');
      const longRef = ref(realtimeDatabase, 'bus/Location/Longitude');
      
      const [latSnapshot, longSnapshot] = await Promise.all([
        get(latRef),
        get(longRef)
      ]);
      
      if (latSnapshot.exists() && longSnapshot.exists()) {
        return {
          latitude: latSnapshot.val(),
          longitude: longSnapshot.val(),
          timestamp: new Date().toISOString()
        };
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error getting bus location:', error);
      return null;
    }
  }
  
  /**
   * Check if location has changed significantly
   */
  hasLocationChanged(newLocation, oldLocation, threshold = 0.0001) {
    if (!oldLocation) return true;
    
    const latDiff = Math.abs(newLocation.latitude - oldLocation.latitude);
    const longDiff = Math.abs(newLocation.longitude - oldLocation.longitude);
    
    return latDiff > threshold || longDiff > threshold;
  }
  
  /**
   * Store location to Firestore with enhanced metadata
   */
  async storeLocationToFirestore(location) {
    try {
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0].replace(/-/g, ''); // YYYYMMDD
      const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, ''); // HHMMSS
      
      const docRef = doc(firestoreDb, 'locationhistory', dateStr, 'entries', timeStr);
      
      const locationData = {
        Latitude: location.latitude,
        Longitude: location.longitude,
        Timestamp: location.timestamp,
        ServerTimestamp: serverTimestamp(),
        StorageType: 'enhanced', // Mark as enhanced storage
        ConsecutiveStore: this.consecutiveStores,
        TotalStores: this.stats.totalStores,
        PauseCount: this.stats.pauseCount
      };
      
      await setDoc(docRef, locationData);
      
      // Update statistics
      this.stats.totalStores++;
      this.stats.lastStoreTime = now.toISOString();
      
      console.log(`📍 Location stored to Firestore: (${location.latitude}, ${location.longitude}) - Store #${this.consecutiveStores + 1}`);
      
      return true;
    } catch (error) {
      console.error('❌ Error storing location to Firestore:', error);
      return false;
    }
  }
  
  /**
   * Main location processing logic
   */
  async processLocationStorage() {
    try {
      // Skip if currently paused
      if (this.isPaused) {
        console.log(`⏸️ Storage paused (${Math.ceil((this.pauseDuration - (Date.now() - this.pauseStartTime)) / 1000)}s remaining)`);
        return;
      }
      
      // Get current location
      const currentLocation = await this.getBusLocation();
      if (!currentLocation) {
        console.log('⚠️ No location data available, skipping storage');
        return;
      }
      
      // Check if location has changed significantly
      if (!this.hasLocationChanged(currentLocation, this.lastStoredLocation)) {
        console.log('📍 Location unchanged, skipping storage');
        return;
      }
      
      // Store the location
      const stored = await this.storeLocationToFirestore(currentLocation);
      
      if (stored) {
        this.consecutiveStores++;
        this.lastStoredLocation = currentLocation;
        
        // Check if we need to pause
        if (this.consecutiveStores >= this.maxConsecutiveStores) {
          this.startPause();
        }
      }
      
    } catch (error) {
      console.error('❌ Error in location processing:', error);
    }
  }
  
  /**
   * Start the pause period
   */
  startPause() {
    console.log(`⏸️ Starting pause after ${this.consecutiveStores} consecutive stores`);
    
    this.isPaused = true;
    this.pauseStartTime = Date.now();
    this.consecutiveStores = 0; // Reset counter
    this.stats.pauseCount++;
    this.stats.lastPauseTime = new Date().toISOString();
    
    console.log(`⏸️ Paused for ${this.pauseDuration/1000} seconds (Pause #${this.stats.pauseCount})`);
  }
  
  /**
   * Check if pause period is over
   */
  checkPauseStatus() {
    if (!this.isPaused) return;
    
    const pauseElapsed = Date.now() - this.pauseStartTime;
    
    if (pauseElapsed >= this.pauseDuration) {
      console.log('▶️ Pause period ended, resuming location storage');
      this.isPaused = false;
      this.pauseStartTime = null;
    }
  }
  
  /**
   * Get service statistics
   */
  getStats() {
    return {
      ...this.stats,
      isActive: !!this.storageIntervalId,
      isPaused: this.isPaused,
      consecutiveStores: this.consecutiveStores,
      pauseTimeRemaining: this.isPaused ? 
        Math.max(0, this.pauseDuration - (Date.now() - this.pauseStartTime)) : 0,
      configuration: {
        storageInterval: this.storageInterval,
        pauseDuration: this.pauseDuration,
        maxConsecutiveStores: this.maxConsecutiveStores
      }
    };
  }
  
  /**
   * Reset statistics and state
   */
  reset() {
    console.log('🔄 Resetting Enhanced Location Service state');
    
    this.consecutiveStores = 0;
    this.isPaused = false;
    this.pauseStartTime = null;
    this.lastStoredLocation = null;
    
    this.stats = {
      totalStores: 0,
      pauseCount: 0,
      lastStoreTime: null,
      lastPauseTime: null
    };
    
    console.log('✅ Enhanced Location Service state reset');
  }
  
  /**
   * Force store location (bypasses pause)
   */
  async forceStore() {
    console.log('🔧 Force storing location...');
    
    const currentLocation = await this.getBusLocation();
    if (!currentLocation) {
      console.log('⚠️ No location data available for force store');
      return false;
    }
    
    const stored = await this.storeLocationToFirestore(currentLocation);
    
    if (stored) {
      this.lastStoredLocation = currentLocation;
      console.log('✅ Location force stored successfully');
    }
    
    return stored;
  }
}

// Create singleton instance
const enhancedLocationService = new EnhancedLocationService();

module.exports = {
  enhancedLocationService,
  EnhancedLocationService
};