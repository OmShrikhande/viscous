/**
 * Bidirectional Bus Tracking Service
 * 
 * Features:
 * - Direction-independent stop detection
 * - Real-time stop ordering based on most recently reached
 * - Optimized Firebase operations with intelligent caching
 * - Dynamic UI updates without polling
 */

const { ref, get, onValue } = require('firebase/database');
const { collection, doc, getDoc, getDocs, updateDoc, onSnapshot, Timestamp, setDoc } = require('firebase/firestore');
const { realtimeDatabase, firestoreDb } = require('../config/firebase');
const { calculateDistance } = require('../utils/geoUtils');

class BidirectionalTrackingService {
  constructor() {
    // Configuration
    this.STOP_RADIUS = 50; // meters
    this.DIRECTION_THRESHOLD = 100; // meters to determine direction change
    
    // State management
    this.stops = new Map(); // stopId -> stop data
    this.reachedStops = new Map(); // stopId -> reach data with timestamp
    this.busLocation = null;
    this.previousBusLocation = null;
    this.travelDirection = 'unknown'; // 'forward', 'backward', 'unknown'
    
    // Listeners and intervals
    this.busLocationListener = null;
    this.stopsListener = null;
    this.trackingInterval = null;
    
    // Performance optimization
    this.lastProcessTime = 0;
    this.processThrottle = 2000; // Process every 2 seconds minimum
    
    // Statistics
    this.stats = {
      totalStopsReached: 0,
      directionChanges: 0,
      lastDirectionChange: null,
      processingCount: 0,
      lastProcessTime: null
    };
    
    console.log('🚀 Bidirectional Tracking Service initialized');
  }
  
  /**
   * Start the bidirectional tracking service
   */
  async start() {
    try {
      console.log('🔄 Starting Bidirectional Tracking Service...');
      
      // Load initial stops data
      await this.loadStopsData();
      
      // Start real-time listeners
      this.startBusLocationListener();
      this.startStopsListener();
      
      // Start processing interval
      this.startTrackingInterval();
      
      console.log('✅ Bidirectional Tracking Service started successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to start Bidirectional Tracking Service:', error);
      return false;
    }
  }
  
  /**
   * Stop the service and cleanup
   */
  stop() {
    console.log('🛑 Stopping Bidirectional Tracking Service...');
    
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
    
    console.log('✅ Bidirectional Tracking Service stopped');
  }
  
  /**
   * Load stops data from Firestore
   */
  async loadStopsData() {
    try {
      console.log('📍 Loading stops data...');
      
      const route2Ref = collection(firestoreDb, 'Route2');
      const querySnapshot = await getDocs(route2Ref);
      
      this.stops.clear();
      this.reachedStops.clear();
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.Latitude && data.Longitude) {
          const stopData = {
            id: doc.id,
            latitude: data.Latitude,
            longitude: data.Longitude,
            reached: data.reached || false,
            reachedAt: data.reachedAt || null,
            reachedTime: data.reachedTime || null,
            serialNumber: data.serialNumber || 0
          };
          
          this.stops.set(doc.id, stopData);
          
          // If stop is reached, add to reached stops
          if (stopData.reached && stopData.reachedAt) {
            this.reachedStops.set(doc.id, {
              timestamp: stopData.reachedAt.toMillis ? stopData.reachedAt.toMillis() : Date.now(),
              time: stopData.reachedTime,
              serialNumber: stopData.serialNumber
            });
          }
        }
      });
      
      console.log(`✅ Loaded ${this.stops.size} stops, ${this.reachedStops.size} reached`);
    } catch (error) {
      console.error('❌ Error loading stops data:', error);
      throw error;
    }
  }
  
  /**
   * Start real-time bus location listener
   */
  startBusLocationListener() {
    console.log('🔄 Starting bus location listener...');
    
    const latRef = ref(realtimeDatabase, 'bus/Location/Latitude');
    const longRef = ref(realtimeDatabase, 'bus/Location/Longitude');
    
    // Listen to latitude changes
    const latListener = onValue(latRef, (snapshot) => {
      if (snapshot.exists()) {
        const latitude = snapshot.val();
        this.updateBusLocation({ latitude });
      }
    });
    
    // Listen to longitude changes
    const longListener = onValue(longRef, (snapshot) => {
      if (snapshot.exists()) {
        const longitude = snapshot.val();
        this.updateBusLocation({ longitude });
      }
    });
    
    // Store cleanup function
    this.busLocationListener = () => {
      latListener();
      longListener();
    };
    
    console.log('✅ Bus location listener started');
  }
  
  /**
   * Start real-time stops listener
   */
  startStopsListener() {
    console.log('🔄 Starting stops listener...');
    
    const route2Ref = collection(firestoreDb, 'Route2');
    
    this.stopsListener = onSnapshot(route2Ref, (snapshot) => {
      console.log('📍 Stops data updated from Firestore');
      
      snapshot.docChanges().forEach((change) => {
        const stopData = change.doc.data();
        const stopId = change.doc.id;
        
        if (change.type === 'modified' && stopData.Latitude && stopData.Longitude) {
          // Update local stops data
          const updatedStop = {
            id: stopId,
            latitude: stopData.Latitude,
            longitude: stopData.Longitude,
            reached: stopData.reached || false,
            reachedAt: stopData.reachedAt || null,
            reachedTime: stopData.reachedTime || null,
            serialNumber: stopData.serialNumber || 0
          };
          
          this.stops.set(stopId, updatedStop);
          
          // Update reached stops if necessary
          if (updatedStop.reached && updatedStop.reachedAt) {
            if (!this.reachedStops.has(stopId)) {
              console.log(`🎯 New stop reached detected: ${stopId}`);
              this.reachedStops.set(stopId, {
                timestamp: updatedStop.reachedAt.toMillis ? updatedStop.reachedAt.toMillis() : Date.now(),
                time: updatedStop.reachedTime,
                serialNumber: updatedStop.serialNumber
              });
              
              // Trigger reordering
              this.reorderStopsBasedOnRecentReach();
            }
          } else if (!updatedStop.reached && this.reachedStops.has(stopId)) {
            // Stop was reset
            console.log(`🔄 Stop reset detected: ${stopId}`);
            this.reachedStops.delete(stopId);
            this.reorderStopsBasedOnRecentReach();
          }
        }
      });
    }, (error) => {
      console.error('❌ Error in stops listener:', error);
    });
    
    console.log('✅ Stops listener started');
  }
  
  /**
   * Update bus location and detect direction
   */
  updateBusLocation(locationUpdate) {
    // Merge with existing location data
    if (!this.busLocation) {
      this.busLocation = {};
    }
    
    Object.assign(this.busLocation, locationUpdate);
    
    // Only process if we have both latitude and longitude
    if (this.busLocation.latitude && this.busLocation.longitude) {
      // Detect direction change
      if (this.previousBusLocation) {
        this.detectTravelDirection();
      }
      
      // Store previous location
      this.previousBusLocation = { ...this.busLocation };
      
      console.log(`🚌 Bus location updated: (${this.busLocation.latitude}, ${this.busLocation.longitude}) - Direction: ${this.travelDirection}`);
    }
  }
  
  /**
   * Detect travel direction based on movement pattern
   */
  detectTravelDirection() {
    if (!this.busLocation || !this.previousBusLocation || this.stops.size === 0) {
      return;
    }
    
    // Find the two closest stops to current and previous locations
    const currentClosest = this.findClosestStops(this.busLocation, 2);
    const previousClosest = this.findClosestStops(this.previousBusLocation, 2);
    
    if (currentClosest.length < 2 || previousClosest.length < 2) {
      return;
    }
    
    // Analyze movement pattern
    const currentPrimary = currentClosest[0];
    const previousPrimary = previousClosest[0];
    
    // If we're moving between different primary stops
    if (currentPrimary.id !== previousPrimary.id) {
      // Get stop serial numbers or create them based on distance from a reference point
      const currentSerial = this.getStopSerialNumber(currentPrimary.id);
      const previousSerial = this.getStopSerialNumber(previousPrimary.id);
      
      const newDirection = currentSerial > previousSerial ? 'forward' : 'backward';
      
      if (this.travelDirection !== newDirection) {
        console.log(`🔄 Direction change detected: ${this.travelDirection} → ${newDirection}`);
        this.travelDirection = newDirection;
        this.stats.directionChanges++;
        this.stats.lastDirectionChange = new Date().toISOString();
      }
    }
  }
  
  /**
   * Find closest stops to a location
   */
  findClosestStops(location, count = 5) {
    const distances = [];
    
    for (const [stopId, stop] of this.stops) {
      const distance = calculateDistance(location, {
        latitude: stop.latitude,
        longitude: stop.longitude
      });
      
      distances.push({
        id: stopId,
        distance: distance,
        ...stop
      });
    }
    
    return distances.sort((a, b) => a.distance - b.distance).slice(0, count);
  }
  
  /**
   * Get or create serial number for a stop
   */
  getStopSerialNumber(stopId) {
    const stop = this.stops.get(stopId);
    if (stop && stop.serialNumber) {
      return stop.serialNumber;
    }
    
    // Create serial number based on alphabetical order as fallback
    const sortedStops = Array.from(this.stops.keys()).sort();
    return sortedStops.indexOf(stopId) + 1;
  }
  
  /**
   * Start tracking interval for stop detection
   */
  startTrackingInterval() {
    console.log('🔄 Starting tracking interval...');
    
    this.trackingInterval = setInterval(() => {
      this.processStopDetection();
    }, 3000); // Check every 3 seconds
    
    console.log('✅ Tracking interval started');
  }
  
  /**
   * Process stop detection (direction-independent)
   */
  async processStopDetection() {
    const now = Date.now();
    
    // Throttle processing
    if (now - this.lastProcessTime < this.processThrottle) {
      return;
    }
    
    this.lastProcessTime = now;
    this.stats.processingCount++;
    this.stats.lastProcessTime = new Date().toISOString();
    
    if (!this.busLocation || this.stops.size === 0) {
      return;
    }
    
    try {
      // Find all stops within radius (direction-independent)
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
      
      // Process each nearby stop
      for (const nearbyStop of nearbyStops) {
        if (!nearbyStop.reached) {
          console.log(`🎯 Bus reached stop: ${nearbyStop.id} (${nearbyStop.distance.toFixed(2)}m away)`);
          await this.markStopAsReached(nearbyStop.id);
        }
      }
      
      if (nearbyStops.length === 0) {
        // Find closest stop for logging
        const closest = this.findClosestStops(this.busLocation, 1)[0];
        if (closest) {
          console.log(`🚌 Closest stop: ${closest.id} (${closest.distance.toFixed(2)}m away)`);
        }
      }
      
    } catch (error) {
      console.error('❌ Error in stop detection:', error);
    }
  }
  
  /**
   * Mark a stop as reached and trigger reordering
   */
  async markStopAsReached(stopId) {
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
        lastReachedTimestamp: now.getTime() // For sorting
      });
      
      // Update local state
      const stop = this.stops.get(stopId);
      if (stop) {
        stop.reached = true;
        stop.reachedAt = timestamp;
        stop.reachedTime = formattedTime;
        this.stops.set(stopId, stop);
      }
      
      // Add to reached stops
      this.reachedStops.set(stopId, {
        timestamp: now.getTime(),
        time: formattedTime,
        serialNumber: this.getStopSerialNumber(stopId)
      });
      
      // Update statistics
      this.stats.totalStopsReached++;
      
      console.log(`✅ Stop ${stopId} marked as reached at ${formattedTime}`);
      
      // Trigger reordering
      await this.reorderStopsBasedOnRecentReach();
      
    } catch (error) {
      console.error(`❌ Error marking stop ${stopId} as reached:`, error);
      throw error;
    }
  }
  
  /**
   * Reorder stops based on most recently reached
   */
  async reorderStopsBasedOnRecentReach() {
    try {
      console.log('🔄 Reordering stops based on recent reach...');
      
      // Get all reached stops sorted by timestamp (most recent first)
      const reachedStopsArray = Array.from(this.reachedStops.entries())
        .sort((a, b) => b[1].timestamp - a[1].timestamp);
      
      // Update serial numbers
      const updates = [];
      
      // Assign serial numbers to reached stops (most recent = 1)
      reachedStopsArray.forEach(([stopId, reachData], index) => {
        const newSerialNumber = index + 1;
        updates.push({
          stopId,
          serialNumber: newSerialNumber,
          isReached: true
        });
      });
      
      // Assign serial numbers to unreached stops
      let unreachedSerial = reachedStopsArray.length + 1;
      for (const [stopId, stop] of this.stops) {
        if (!stop.reached) {
          updates.push({
            stopId,
            serialNumber: unreachedSerial++,
            isReached: false
          });
        }
      }
      
      // Batch update Firestore
      const batch = [];
      for (const update of updates) {
        const stopRef = doc(firestoreDb, 'Route2', update.stopId);
        batch.push(
          updateDoc(stopRef, {
            serialNumber: update.serialNumber,
            lastReorderTime: new Date().toISOString()
          })
        );
      }
      
      // Execute batch updates
      await Promise.all(batch);
      
      console.log(`✅ Reordered ${updates.length} stops - ${reachedStopsArray.length} reached, ${updates.length - reachedStopsArray.length} unreached`);
      
    } catch (error) {
      console.error('❌ Error reordering stops:', error);
    }
  }
  
  /**
   * Reset all stops
   */
  async resetAllStops() {
    try {
      console.log('🔄 Resetting all stops...');
      
      const batch = [];
      for (const [stopId] of this.stops) {
        const stopRef = doc(firestoreDb, 'Route2', stopId);
        batch.push(
          updateDoc(stopRef, {
            reached: false,
            reachedAt: null,
            reachedTime: null,
            reachedDate: null,
            lastReachedTimestamp: null,
            serialNumber: this.getStopSerialNumber(stopId), // Reset to original order
            lastReorderTime: new Date().toISOString()
          })
        );
      }
      
      await Promise.all(batch);
      
      // Clear local state
      this.reachedStops.clear();
      for (const [stopId, stop] of this.stops) {
        stop.reached = false;
        stop.reachedAt = null;
        stop.reachedTime = null;
        this.stops.set(stopId, stop);
      }
      
      console.log('✅ All stops reset successfully');
      
    } catch (error) {
      console.error('❌ Error resetting stops:', error);
      throw error;
    }
  }
  
  /**
   * Get service statistics
   */
  getStats() {
    return {
      ...this.stats,
      stopsCount: this.stops.size,
      reachedStopsCount: this.reachedStops.size,
      currentDirection: this.travelDirection,
      busLocation: this.busLocation,
      isActive: !!this.trackingInterval,
      reachedStops: Array.from(this.reachedStops.entries()).map(([id, data]) => ({
        id,
        ...data
      }))
    };
  }
  
  /**
   * Get ordered stops list (for UI)
   */
  getOrderedStops() {
    const stopsArray = Array.from(this.stops.values());
    
    // Sort by serial number (most recent reached stops first)
    return stopsArray.sort((a, b) => {
      // Reached stops come first, sorted by serial number
      if (a.reached && !b.reached) return -1;
      if (!a.reached && b.reached) return 1;
      
      // Both reached or both unreached - sort by serial number
      return (a.serialNumber || 999) - (b.serialNumber || 999);
    });
  }
}

// Create singleton instance
const bidirectionalTrackingService = new BidirectionalTrackingService();

module.exports = {
  bidirectionalTrackingService,
  BidirectionalTrackingService
};