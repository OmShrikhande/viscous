/**
 * Optimized Serial Tracking Service
 * 
 * New Logic Implementation:
 * - When bus reaches the stop with highest serial number, all stops are marked as "unreached"
 * - That stop gets serial number 1
 * - Remaining stops get serial numbers in reverse descending order
 * 
 * Optimizations for Production:
 * - Batch Firestore operations to minimize write costs
 * - Intelligent caching to reduce read operations
 * - Efficient memory management
 * - Minimal processing overhead
 */

const { ref, get, onValue } = require('firebase/database');
const { collection, doc, getDoc, getDocs, updateDoc, onSnapshot, Timestamp, writeBatch } = require('firebase/firestore');
const { realtimeDatabase, firestoreDb } = require('../config/firebase');
const { calculateDistance } = require('../utils/geoUtils');

class OptimizedSerialTrackingService {
  constructor() {
    // Configuration
    this.STOP_RADIUS = 50; // meters
    this.BATCH_SIZE = 500; // Firestore batch limit
    
    // State management - optimized for memory efficiency
    this.stops = new Map(); // stopId -> stop data
    this.busLocation = null;
    this.isProcessing = false; // Prevent concurrent processing
    
    // Cache management
    this.lastCacheUpdate = 0;
    this.CACHE_TTL = 30000; // 30 seconds cache TTL
    
    // Listeners
    this.busLocationListener = null;
    this.stopsListener = null;
    this.trackingInterval = null;
    
    // Performance metrics
    this.metrics = {
      totalProcessingTime: 0,
      batchOperations: 0,
      cacheHits: 0,
      cacheMisses: 0
    };
    
    console.log('🚀 Optimized Serial Tracking Service initialized');
  }
  
  /**
   * Start the optimized tracking service
   */
  async start() {
    try {
      console.log('🔄 Starting Optimized Serial Tracking Service...');
      
      // Load initial stops data with caching
      await this.loadStopsDataOptimized();
      
      // Start real-time listeners
      this.startBusLocationListener();
      this.startStopsListener();
      
      // Start optimized tracking interval
      this.startOptimizedTrackingInterval();
      
      console.log('✅ Optimized Serial Tracking Service started successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to start Optimized Serial Tracking Service:', error);
      return false;
    }
  }
  
  /**
   * Stop the service and cleanup
   */
  stop() {
    console.log('🛑 Stopping Optimized Serial Tracking Service...');
    
    // Clear listeners
    if (this.busLocationListener) {
      this.busLocationListener();
      this.busLocationListener = null;
    }
    
    if (this.stopsListener) {
      this.stopsListener();
      this.stopsListener = null;
    }
    
    // Clear interval
    if (this.trackingInterval) {
      clearInterval(this.trackingInterval);
      this.trackingInterval = null;
    }
    
    // Log performance metrics
    console.log('📊 Performance Metrics:', this.metrics);
    console.log('✅ Optimized Serial Tracking Service stopped');
  }
  
  /**
   * Load stops data with intelligent caching
   */
  async loadStopsDataOptimized() {
    const startTime = Date.now();
    
    try {
      console.log('📍 Loading stops data with optimization...');
      
      // Check cache validity
      if (this.stops.size > 0 && (Date.now() - this.lastCacheUpdate) < this.CACHE_TTL) {
        this.metrics.cacheHits++;
        console.log('✅ Using cached stops data');
        return;
      }
      
      this.metrics.cacheMisses++;
      
      const route2Ref = collection(firestoreDb, 'Route2');
      const querySnapshot = await getDocs(route2Ref);
      
      this.stops.clear();
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.Latitude && data.Longitude) {
          const stopData = {
            id: doc.id,
            latitude: data.Latitude,
            longitude: data.Longitude,
            reached: data.reached || false,
            serialNumber: data.serialNumber || 0,
            reachedAt: data.reachedAt || null,
            reachedTime: data.reachedTime || null
          };
          
          this.stops.set(doc.id, stopData);
        }
      });
      
      this.lastCacheUpdate = Date.now();
      
      const loadTime = Date.now() - startTime;
      this.metrics.totalProcessingTime += loadTime;
      
      console.log(`✅ Loaded ${this.stops.size} stops in ${loadTime}ms`);
    } catch (error) {
      console.error('❌ Error loading stops data:', error);
      throw error;
    }
  }
  
  /**
   * Start optimized bus location listener
   */
  startBusLocationListener() {
    console.log('🔄 Starting optimized bus location listener...');
    
    const latRef = ref(realtimeDatabase, 'bus/Location/Latitude');
    const longRef = ref(realtimeDatabase, 'bus/Location/Longitude');
    
    // Optimized listener with debouncing
    let locationUpdateTimeout = null;
    
    const updateLocation = (locationUpdate) => {
      // Debounce location updates to prevent excessive processing
      if (locationUpdateTimeout) {
        clearTimeout(locationUpdateTimeout);
      }
      
      locationUpdateTimeout = setTimeout(() => {
        this.updateBusLocationOptimized(locationUpdate);
      }, 1000); // 1 second debounce
    };
    
    // Listen to latitude changes
    const latListener = onValue(latRef, (snapshot) => {
      if (snapshot.exists()) {
        updateLocation({ latitude: snapshot.val() });
      }
    });
    
    // Listen to longitude changes
    const longListener = onValue(longRef, (snapshot) => {
      if (snapshot.exists()) {
        updateLocation({ longitude: snapshot.val() });
      }
    });
    
    // Store cleanup function
    this.busLocationListener = () => {
      if (locationUpdateTimeout) {
        clearTimeout(locationUpdateTimeout);
      }
      latListener();
      longListener();
    };
    
    console.log('✅ Optimized bus location listener started');
  }
  
  /**
   * Start optimized stops listener
   */
  startStopsListener() {
    console.log('🔄 Starting optimized stops listener...');
    
    const route2Ref = collection(firestoreDb, 'Route2');
    
    this.stopsListener = onSnapshot(route2Ref, (snapshot) => {
      // Only process changes if we're not already processing
      if (this.isProcessing) {
        return;
      }
      
      let hasRelevantChanges = false;
      
      snapshot.docChanges().forEach((change) => {
        const stopData = change.doc.data();
        const stopId = change.doc.id;
        
        if (change.type === 'modified' && stopData.Latitude && stopData.Longitude) {
          // Update local cache
          const updatedStop = {
            id: stopId,
            latitude: stopData.Latitude,
            longitude: stopData.Longitude,
            reached: stopData.reached || false,
            serialNumber: stopData.serialNumber || 0,
            reachedAt: stopData.reachedAt || null,
            reachedTime: stopData.reachedTime || null
          };
          
          this.stops.set(stopId, updatedStop);
          hasRelevantChanges = true;
        }
      });
      
      if (hasRelevantChanges) {
        console.log('📍 Stops data updated from Firestore');
        this.lastCacheUpdate = Date.now();
      }
    }, (error) => {
      console.error('❌ Error in optimized stops listener:', error);
    });
    
    console.log('✅ Optimized stops listener started');
  }
  
  /**
   * Update bus location with optimization
   */
  updateBusLocationOptimized(locationUpdate) {
    // Merge with existing location data
    if (!this.busLocation) {
      this.busLocation = {};
    }
    
    Object.assign(this.busLocation, locationUpdate);
    
    // Only log when we have complete coordinates
    if (this.busLocation.latitude && this.busLocation.longitude) {
      console.log(`🚌 Bus location: (${this.busLocation.latitude}, ${this.busLocation.longitude})`);
    }
  }
  
  /**
   * Start optimized tracking interval
   */
  startOptimizedTrackingInterval() {
    console.log('🔄 Starting optimized tracking interval...');
    
    this.trackingInterval = setInterval(() => {
      this.processOptimizedStopDetection();
    }, 5000); // Check every 5 seconds
    
    console.log('✅ Optimized tracking interval started');
  }
  
  /**
   * Process optimized stop detection with new serial logic
   */
  async processOptimizedStopDetection() {
    // Prevent concurrent processing
    if (this.isProcessing || !this.busLocation || this.stops.size === 0) {
      return;
    }
    
    this.isProcessing = true;
    const startTime = Date.now();
    
    try {
      // Find stops within radius
      const nearbyStops = this.findNearbyStops();
      
      if (nearbyStops.length === 0) {
        return;
      }
      
      // Process each nearby stop
      for (const nearbyStop of nearbyStops) {
        if (!nearbyStop.reached) {
          console.log(`🎯 Bus reached stop: ${nearbyStop.id} (${nearbyStop.distance.toFixed(2)}m away)`);
          
          // Check if this is the stop with highest serial number
          const isHighestSerialStop = await this.isHighestSerialNumberStop(nearbyStop.id);
          
          if (isHighestSerialStop) {
            console.log(`🔄 Reached highest serial stop: ${nearbyStop.id} - Implementing new logic`);
            await this.implementNewSerialLogic(nearbyStop.id);
          } else {
            // Regular stop reached - just mark as reached
            await this.markStopAsReachedOptimized(nearbyStop.id);
          }
        }
      }
      
    } catch (error) {
      console.error('❌ Error in optimized stop detection:', error);
    } finally {
      this.isProcessing = false;
      
      const processingTime = Date.now() - startTime;
      this.metrics.totalProcessingTime += processingTime;
    }
  }
  
  /**
   * Find nearby stops efficiently
   */
  findNearbyStops() {
    const nearbyStops = [];
    
    for (const [stopId, stop] of this.stops) {
      const distance = calculateDistance(this.busLocation, {
        latitude: stop.latitude,
        longitude: stop.longitude
      });
      
      if (distance <= this.STOP_RADIUS) {
        nearbyStops.push({
          id: stopId,
          distance: distance,
          ...stop
        });
      }
    }
    
    return nearbyStops;
  }
  
  /**
   * Check if the given stop has the highest serial number among all stops
   */
  async isHighestSerialNumberStop(stopId) {
    try {
      let maxSerialNumber = 0;
      let maxSerialStopId = null;
      
      // Find the stop with highest serial number
      for (const [id, stop] of this.stops) {
        if (stop.serialNumber > maxSerialNumber) {
          maxSerialNumber = stop.serialNumber;
          maxSerialStopId = id;
        }
      }
      
      return stopId === maxSerialStopId;
    } catch (error) {
      console.error('❌ Error checking highest serial stop:', error);
      return false;
    }
  }
  
  /**
   * Implement new serial logic when highest serial stop is reached
   */
  async implementNewSerialLogic(reachedStopId) {
    try {
      console.log('🔄 Implementing new serial logic...');
      
      // Get all stops as array and sort by current serial number (descending)
      const allStops = Array.from(this.stops.values())
        .sort((a, b) => b.serialNumber - a.serialNumber);
      
      // Create batch operations for efficiency
      const batch = writeBatch(firestoreDb);
      const now = new Date();
      const timestamp = Timestamp.now();
      const formattedTime = now.toLocaleTimeString();
      
      // Step 1: Mark the reached stop with serial number 1 and as reached
      const reachedStopRef = doc(firestoreDb, 'Route2', reachedStopId);
      batch.update(reachedStopRef, {
        reached: true,
        serialNumber: 1,
        reachedAt: timestamp,
        reachedTime: formattedTime,
        reachedDate: now.toLocaleDateString(),
        lastReachedTimestamp: now.getTime(),
        lastReorderTime: now.toISOString()
      });
      
      // Step 2: Mark all other stops as unreached and assign serial numbers in reverse order
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
            lastReachedTimestamp: null,
            lastReorderTime: now.toISOString()
          });
        }
      }
      
      // Execute batch operation
      await batch.commit();
      this.metrics.batchOperations++;
      
      // Update local cache
      for (const stop of allStops) {
        const localStop = this.stops.get(stop.id);
        if (localStop) {
          if (stop.id === reachedStopId) {
            localStop.reached = true;
            localStop.serialNumber = 1;
            localStop.reachedAt = timestamp;
            localStop.reachedTime = formattedTime;
          } else {
            localStop.reached = false;
            localStop.serialNumber = allStops.findIndex(s => s.id === stop.id) + 2;
            localStop.reachedAt = null;
            localStop.reachedTime = null;
          }
          this.stops.set(stop.id, localStop);
        }
      }
      
      this.lastCacheUpdate = Date.now();
      
      console.log(`✅ New serial logic implemented successfully for stop ${reachedStopId}`);
      console.log(`📊 Updated ${allStops.length} stops in single batch operation`);
      
    } catch (error) {
      console.error('❌ Error implementing new serial logic:', error);
      throw error;
    }
  }
  
  /**
   * Mark a regular stop as reached (optimized)
   */
  async markStopAsReachedOptimized(stopId) {
    try {
      const now = new Date();
      const timestamp = Timestamp.now();
      const formattedTime = now.toLocaleTimeString();
      
      // Update Firestore
      const stopRef = doc(firestoreDb, 'Route2', stopId);
      await updateDoc(stopRef, {
        reached: true,
        reachedAt: timestamp,
        reachedTime: formattedTime,
        reachedDate: now.toLocaleDateString(),
        lastReachedTimestamp: now.getTime()
      });
      
      // Update local cache
      const stop = this.stops.get(stopId);
      if (stop) {
        stop.reached = true;
        stop.reachedAt = timestamp;
        stop.reachedTime = formattedTime;
        this.stops.set(stopId, stop);
      }
      
      console.log(`✅ Stop ${stopId} marked as reached at ${formattedTime}`);
      
    } catch (error) {
      console.error(`❌ Error marking stop ${stopId} as reached:`, error);
      throw error;
    }
  }
  
  /**
   * Get performance metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      cacheSize: this.stops.size,
      averageProcessingTime: this.metrics.batchOperations > 0 
        ? this.metrics.totalProcessingTime / this.metrics.batchOperations 
        : 0
    };
  }
  
  /**
   * Reset all stops (for testing/admin purposes)
   */
  async resetAllStops() {
    try {
      console.log('🔄 Resetting all stops...');
      
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
          lastReachedTimestamp: null,
          lastReorderTime: new Date().toISOString()
        });
      }
      
      await batch.commit();
      this.metrics.batchOperations++;
      
      // Update local cache
      counter = 1;
      for (const [stopId, stop] of this.stops) {
        stop.reached = false;
        stop.serialNumber = counter++;
        stop.reachedAt = null;
        stop.reachedTime = null;
        this.stops.set(stopId, stop);
      }
      
      this.lastCacheUpdate = Date.now();
      
      console.log('✅ All stops reset successfully');
      
    } catch (error) {
      console.error('❌ Error resetting stops:', error);
      throw error;
    }
  }
}

module.exports = OptimizedSerialTrackingService;