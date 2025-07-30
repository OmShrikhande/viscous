/**
 * EMERGENCY OPTIMIZED SERVICE
 * 
 * This is an immediate fix to prevent Firestore quota exhaustion.
 * Deploy this ASAP to stop the quota issues.
 * 
 * Key optimizations:
 * - Aggressive rate limiting
 * - Batch operations only
 * - Extended caching
 * - Minimal database operations
 */

const { ref, get, onValue } = require('firebase/database');
const { collection, doc, getDocs, updateDoc, writeBatch, Timestamp } = require('firebase/firestore');
const { realtimeDatabase, firestoreDb } = require('../config/firebase');
const { calculateDistance } = require('../utils/geoUtils');

class EmergencyOptimizedService {
  constructor() {
    // AGGRESSIVE rate limiting to prevent quota exhaustion
    this.STOP_RADIUS = 50;
    this.MIN_PROCESSING_INTERVAL = 10000; // 10 seconds minimum between processing
    this.CACHE_TTL = 300000; // 5 minutes cache (very long to reduce reads)
    this.MAX_BATCH_SIZE = 500;
    
    // State
    this.stops = new Map();
    this.busLocation = null;
    this.lastProcessTime = 0;
    this.lastCacheUpdate = 0;
    this.isProcessing = false;
    
    // Listeners
    this.busLocationListener = null;
    this.trackingInterval = null;
    
    // Emergency counters
    this.operationCount = 0;
    this.maxOperationsPerHour = 1000; // Hard limit
    this.operationResetTime = Date.now();
    
    console.log('🚨 EMERGENCY OPTIMIZED SERVICE - Quota Protection Active');
  }
  
  /**
   * Start with emergency optimizations
   */
  async start() {
    try {
      console.log('🚨 Starting Emergency Optimized Service...');
      
      // Load initial data (once only)
      await this.loadStopsWithEmergencyCache();
      
      // Start VERY conservative listeners
      this.startEmergencyBusLocationListener();
      this.startEmergencyTrackingInterval();
      
      console.log('✅ Emergency service started - Quota protection active');
      return true;
    } catch (error) {
      console.error('❌ Emergency service failed to start:', error);
      return false;
    }
  }
  
  /**
   * Stop service
   */
  stop() {
    console.log('🛑 Stopping Emergency Optimized Service...');
    
    if (this.busLocationListener) {
      this.busLocationListener();
      this.busLocationListener = null;
    }
    
    if (this.trackingInterval) {
      clearInterval(this.trackingInterval);
      this.trackingInterval = null;
    }
    
    console.log('✅ Emergency service stopped');
  }
  
  /**
   * Load stops with emergency caching (minimal Firestore access)
   */
  async loadStopsWithEmergencyCache() {
    try {
      // Check if we have valid cache
      if (this.stops.size > 0 && (Date.now() - this.lastCacheUpdate) < this.CACHE_TTL) {
        console.log('✅ Using emergency cache - No Firestore access');
        return;
      }
      
      // Only access Firestore if absolutely necessary
      if (!this.checkOperationQuota()) {
        console.log('⚠️ Operation quota exceeded - Using stale cache');
        return;
      }
      
      console.log('📍 Emergency cache refresh - Accessing Firestore');
      
      const route2Ref = collection(firestoreDb, 'Route2');
      const querySnapshot = await getDocs(route2Ref);
      this.incrementOperationCount();
      
      this.stops.clear();
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.Latitude && data.Longitude) {
          this.stops.set(doc.id, {
            id: doc.id,
            latitude: data.Latitude,
            longitude: data.Longitude,
            reached: data.reached || false,
            serialNumber: data.serialNumber || 0
          });
        }
      });
      
      this.lastCacheUpdate = Date.now();
      console.log(`✅ Emergency cache updated - ${this.stops.size} stops loaded`);
      
    } catch (error) {
      console.error('❌ Emergency cache update failed:', error);
      // Continue with stale cache if available
    }
  }
  
  /**
   * Emergency bus location listener with aggressive debouncing
   */
  startEmergencyBusLocationListener() {
    console.log('🔄 Starting emergency bus location listener...');
    
    const latRef = ref(realtimeDatabase, 'bus/Location/Latitude');
    const longRef = ref(realtimeDatabase, 'bus/Location/Longitude');
    
    // VERY aggressive debouncing - 5 seconds minimum
    let locationUpdateTimeout = null;
    
    const updateLocation = (locationUpdate) => {
      if (locationUpdateTimeout) {
        clearTimeout(locationUpdateTimeout);
      }
      
      locationUpdateTimeout = setTimeout(() => {
        this.updateBusLocationEmergency(locationUpdate);
      }, 5000); // 5 second debounce
    };
    
    const latListener = onValue(latRef, (snapshot) => {
      if (snapshot.exists()) {
        updateLocation({ latitude: snapshot.val() });
      }
    });
    
    const longListener = onValue(longRef, (snapshot) => {
      if (snapshot.exists()) {
        updateLocation({ longitude: snapshot.val() });
      }
    });
    
    this.busLocationListener = () => {
      if (locationUpdateTimeout) {
        clearTimeout(locationUpdateTimeout);
      }
      latListener();
      longListener();
    };
    
    console.log('✅ Emergency bus location listener started');
  }
  
  /**
   * Update bus location with emergency throttling
   */
  updateBusLocationEmergency(locationUpdate) {
    if (!this.busLocation) {
      this.busLocation = {};
    }
    
    Object.assign(this.busLocation, locationUpdate);
    
    // Only log complete coordinates and throttle logging
    if (this.busLocation.latitude && this.busLocation.longitude) {
      console.log(`🚌 Bus: (${this.busLocation.latitude}, ${this.busLocation.longitude})`);
    }
  }
  
  /**
   * Emergency tracking interval with maximum throttling
   */
  startEmergencyTrackingInterval() {
    console.log('🔄 Starting emergency tracking interval...');
    
    // VERY conservative interval - 15 seconds
    this.trackingInterval = setInterval(() => {
      this.processEmergencyStopDetection();
    }, 15000);
    
    console.log('✅ Emergency tracking interval started (15s)');
  }
  
  /**
   * Emergency stop detection with maximum optimization
   */
  async processEmergencyStopDetection() {
    const now = Date.now();
    
    // AGGRESSIVE throttling
    if (this.isProcessing || 
        (now - this.lastProcessTime) < this.MIN_PROCESSING_INTERVAL ||
        !this.checkOperationQuota()) {
      return;
    }
    
    this.isProcessing = true;
    this.lastProcessTime = now;
    
    try {
      if (!this.busLocation || this.stops.size === 0) {
        return;
      }
      
      // Find nearby stops (in memory only)
      const nearbyStops = [];
      for (const [stopId, stop] of this.stops) {
        const distance = calculateDistance(this.busLocation, {
          latitude: stop.latitude,
          longitude: stop.longitude
        });
        
        if (distance <= this.STOP_RADIUS && !stop.reached) {
          nearbyStops.push({ id: stopId, distance, ...stop });
        }
      }
      
      if (nearbyStops.length === 0) {
        return;
      }
      
      // Process with new logic but ONLY if we have quota
      for (const nearbyStop of nearbyStops) {
        console.log(`🎯 Bus reached: ${nearbyStop.id} (${nearbyStop.distance.toFixed(2)}m)`);
        
        // Check if this is highest serial stop
        const isHighestSerial = await this.isHighestSerialStopEmergency(nearbyStop.id);
        
        if (isHighestSerial) {
          console.log(`🔄 Highest serial stop reached: ${nearbyStop.id}`);
          await this.implementNewLogicEmergency(nearbyStop.id);
        } else {
          await this.markStopReachedEmergency(nearbyStop.id);
        }
      }
      
    } catch (error) {
      console.error('❌ Emergency processing error:', error);
    } finally {
      this.isProcessing = false;
    }
  }
  
  /**
   * Check if stop has highest serial number (in memory only)
   */
  async isHighestSerialStopEmergency(stopId) {
    let maxSerial = 0;
    let maxStopId = null;
    
    for (const [id, stop] of this.stops) {
      if (stop.serialNumber > maxSerial) {
        maxSerial = stop.serialNumber;
        maxStopId = id;
      }
    }
    
    return stopId === maxStopId;
  }
  
  /**
   * Implement new logic with EMERGENCY batch optimization
   */
  async implementNewLogicEmergency(reachedStopId) {
    if (!this.checkOperationQuota()) {
      console.log('⚠️ Quota exceeded - Skipping new logic implementation');
      return;
    }
    
    try {
      console.log('🔄 Implementing new logic with emergency optimization...');
      
      const allStops = Array.from(this.stops.values())
        .sort((a, b) => b.serialNumber - a.serialNumber);
      
      // SINGLE batch operation to minimize writes
      const batch = writeBatch(firestoreDb);
      const now = new Date();
      const timestamp = Timestamp.now();
      const formattedTime = now.toLocaleTimeString();
      
      // Update reached stop
      const reachedStopRef = doc(firestoreDb, 'Route2', reachedStopId);
      batch.update(reachedStopRef, {
        reached: true,
        serialNumber: 1,
        reachedAt: timestamp,
        reachedTime: formattedTime,
        reachedDate: now.toLocaleDateString(),
        lastReachedTimestamp: now.getTime()
      });
      
      // Update all other stops
      let serialCounter = 2;
      for (const stop of allStops) {
        if (stop.id !== reachedStopId) {
          const stopRef = doc(firestoreDb, 'Route2', stop.id);
          batch.update(stopRef, {
            reached: false,
            serialNumber: serialCounter++,
            reachedAt: null,
            reachedTime: null,
            reachedDate: null,
            lastReachedTimestamp: null
          });
        }
      }
      
      // Execute SINGLE batch
      await batch.commit();
      this.incrementOperationCount();
      
      // Update local cache
      for (const stop of allStops) {
        const localStop = this.stops.get(stop.id);
        if (localStop) {
          if (stop.id === reachedStopId) {
            localStop.reached = true;
            localStop.serialNumber = 1;
          } else {
            localStop.reached = false;
            localStop.serialNumber = allStops.findIndex(s => s.id === stop.id) + 2;
          }
          this.stops.set(stop.id, localStop);
        }
      }
      
      console.log(`✅ Emergency new logic completed - ${allStops.length} stops updated`);
      
    } catch (error) {
      console.error('❌ Emergency new logic failed:', error);
    }
  }
  
  /**
   * Mark single stop as reached with emergency optimization
   */
  async markStopReachedEmergency(stopId) {
    if (!this.checkOperationQuota()) {
      console.log('⚠️ Quota exceeded - Skipping stop update');
      return;
    }
    
    try {
      const now = new Date();
      const timestamp = Timestamp.now();
      const formattedTime = now.toLocaleTimeString();
      
      const stopRef = doc(firestoreDb, 'Route2', stopId);
      await updateDoc(stopRef, {
        reached: true,
        reachedAt: timestamp,
        reachedTime: formattedTime,
        reachedDate: now.toLocaleDateString(),
        lastReachedTimestamp: now.getTime()
      });
      
      this.incrementOperationCount();
      
      // Update local cache
      const stop = this.stops.get(stopId);
      if (stop) {
        stop.reached = true;
        this.stops.set(stopId, stop);
      }
      
      console.log(`✅ Stop ${stopId} marked as reached`);
      
    } catch (error) {
      console.error(`❌ Failed to mark stop ${stopId}:`, error);
    }
  }
  
  /**
   * Check operation quota to prevent exhaustion
   */
  checkOperationQuota() {
    const now = Date.now();
    
    // Reset counter every hour
    if (now - this.operationResetTime > 3600000) {
      this.operationCount = 0;
      this.operationResetTime = now;
    }
    
    if (this.operationCount >= this.maxOperationsPerHour) {
      console.log('⚠️ QUOTA PROTECTION: Maximum operations reached for this hour');
      return false;
    }
    
    return true;
  }
  
  /**
   * Increment operation counter
   */
  incrementOperationCount() {
    this.operationCount++;
    console.log(`📊 Operations this hour: ${this.operationCount}/${this.maxOperationsPerHour}`);
  }
  
  /**
   * Get emergency metrics
   */
  getEmergencyMetrics() {
    return {
      cacheSize: this.stops.size,
      operationsThisHour: this.operationCount,
      maxOperationsPerHour: this.maxOperationsPerHour,
      lastCacheUpdate: new Date(this.lastCacheUpdate).toISOString(),
      cacheAge: Date.now() - this.lastCacheUpdate,
      quotaProtectionActive: this.operationCount >= this.maxOperationsPerHour * 0.8
    };
  }
  
  /**
   * Emergency reset (admin only)
   */
  async emergencyReset() {
    if (!this.checkOperationQuota()) {
      console.log('⚠️ Cannot reset - Quota exceeded');
      return false;
    }
    
    try {
      const batch = writeBatch(firestoreDb);
      let counter = 1;
      
      for (const [stopId] of this.stops) {
        const stopRef = doc(firestoreDb, 'Route2', stopId);
        batch.update(stopRef, {
          reached: false,
          serialNumber: counter++,
          reachedAt: null,
          reachedTime: null,
          reachedDate: null,
          lastReachedTimestamp: null
        });
      }
      
      await batch.commit();
      this.incrementOperationCount();
      
      // Update cache
      counter = 1;
      for (const [stopId, stop] of this.stops) {
        stop.reached = false;
        stop.serialNumber = counter++;
        this.stops.set(stopId, stop);
      }
      
      console.log('✅ Emergency reset completed');
      return true;
      
    } catch (error) {
      console.error('❌ Emergency reset failed:', error);
      return false;
    }
  }
}

module.exports = EmergencyOptimizedService;