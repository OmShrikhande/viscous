/**
 * Optimized Excel-Based Tracking Service
 * 
 * Features:
 * - Reads stops from Excel file (no Firestore reads)
 * - Only writes to Firestore when stop is reached
 * - Monitors location from Realtime Database only
 * - 50m radius detection
 * - Minimal Firestore operations
 */

const { ref, onValue } = require('firebase/database');
const { doc, updateDoc, Timestamp } = require('firebase/firestore');
const { realtimeDatabase, firestoreDb } = require('../config/firebase');
const { calculateDistance } = require('../utils/geoUtils');
const { getBusStopsFromExcel } = require('../../Bus tracking Admin/Admin/Backend/utils/excelReader');

class OptimizedExcelTrackingService {
  constructor() {
    // Configuration
    this.STOP_RADIUS = 50; // meters
    this.PROCESS_THROTTLE = 3000; // Process every 3 seconds minimum
    
    // State management
    this.stops = new Map(); // stopId -> stop data from Excel
    this.reachedStops = new Set(); // Track which stops have been reached (to avoid duplicate writes)
    this.busLocation = null;
    
    // Listeners and intervals
    this.busLocationListener = null;
    this.trackingInterval = null;
    
    // Performance optimization
    this.lastProcessTime = 0;
    this.isProcessing = false;
    
    // Statistics
    this.stats = {
      totalStopsReached: 0,
      firestoreWrites: 0,
      processingCount: 0,
      lastProcessTime: null,
      isActive: false
    };
    
    console.log('🚀 Optimized Excel Tracking Service initialized');
  }
  
  /**
   * Start the tracking service
   */
  async start() {
    try {
      console.log('🔄 Starting Optimized Excel Tracking Service...');
      
      // Load stops from Excel file
      await this.loadStopsFromExcel();
      
      // Start location monitoring
      this.startBusLocationListener();
      
      // Start processing interval
      this.startTrackingInterval();
      
      this.stats.isActive = true;
      console.log('✅ Optimized Excel Tracking Service started successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to start Optimized Excel Tracking Service:', error);
      return false;
    }
  }
  
  /**
   * Stop the service and cleanup
   */
  stop() {
    console.log('🛑 Stopping Optimized Excel Tracking Service...');
    
    // Clear location listener
    if (this.busLocationListener) {
      this.busLocationListener();
      this.busLocationListener = null;
    }
    
    // Clear interval
    if (this.trackingInterval) {
      clearInterval(this.trackingInterval);
      this.trackingInterval = null;
    }
    
    this.stats.isActive = false;
    console.log('✅ Optimized Excel Tracking Service stopped');
  }
  
  /**
   * Load stops data from Excel file (NO Firestore reads)
   */
  async loadStopsFromExcel() {
    try {
      console.log('📍 Loading stops from Excel file...');
      
      // Get stops from Excel file
      const excelStops = getBusStopsFromExcel();
      
      this.stops.clear();
      this.reachedStops.clear();
      
      // Process Excel data
      excelStops.forEach((stop, index) => {
        if (stop.latitude && stop.longitude) {
          const stopData = {
            id: stop.id || `stop-${index + 1}`,
            name: stop.name || `Stop ${index + 1}`,
            latitude: parseFloat(stop.latitude),
            longitude: parseFloat(stop.longitude),
            sequence: stop.sequence || index + 1,
            reached: false // Always start as unreached
          };
          
          this.stops.set(stopData.id, stopData);
        }
      });
      
      console.log(`✅ Loaded ${this.stops.size} stops from Excel file`);
    } catch (error) {
      console.error('❌ Error loading stops from Excel:', error);
      throw error;
    }
  }
  
  /**
   * Start bus location listener (Realtime Database only)
   */
  startBusLocationListener() {
    console.log('🔄 Starting bus location listener...');
    
    const locationRef = ref(realtimeDatabase, 'bus/Location');
    
    this.busLocationListener = onValue(locationRef, (snapshot) => {
      if (snapshot.exists()) {
        const locationData = snapshot.val();
        
        if (locationData.Latitude && locationData.Longitude) {
          this.busLocation = {
            latitude: parseFloat(locationData.Latitude),
            longitude: parseFloat(locationData.Longitude),
            timestamp: locationData.Timestamp || new Date().toISOString()
          };
          
          // Trigger processing (with throttling)
          this.scheduleProcessing();
        }
      }
    });
    
    console.log('✅ Bus location listener started');
  }
  
  /**
   * Start tracking interval for periodic processing
   */
  startTrackingInterval() {
    this.trackingInterval = setInterval(() => {
      if (this.busLocation && !this.isProcessing) {
        this.processLocationUpdate();
      }
    }, this.PROCESS_THROTTLE);
    
    console.log(`✅ Tracking interval started (${this.PROCESS_THROTTLE}ms)`);
  }
  
  /**
   * Schedule processing with throttling
   */
  scheduleProcessing() {
    const now = Date.now();
    if (now - this.lastProcessTime >= this.PROCESS_THROTTLE && !this.isProcessing) {
      this.processLocationUpdate();
    }
  }
  
  /**
   * Process location update and check for nearby stops
   */
  async processLocationUpdate() {
    if (this.isProcessing || !this.busLocation) {
      return;
    }
    
    this.isProcessing = true;
    this.lastProcessTime = Date.now();
    this.stats.processingCount++;
    this.stats.lastProcessTime = new Date().toISOString();
    
    try {
      // Find nearby stops within radius
      const nearbyStops = this.findNearbyStops();
      
      if (nearbyStops.length > 0) {
        console.log(`🎯 Found ${nearbyStops.length} nearby stops`);
        
        // Process each nearby stop
        for (const nearbyStop of nearbyStops) {
          // Only write to Firestore if stop hasn't been reached yet
          if (!this.reachedStops.has(nearbyStop.id)) {
            console.log(`🚌 Bus reached: ${nearbyStop.name} (${nearbyStop.distance.toFixed(2)}m)`);
            await this.markStopAsReached(nearbyStop);
          }
        }
      }
      
    } catch (error) {
      console.error('❌ Error processing location update:', error);
    } finally {
      this.isProcessing = false;
    }
  }
  
  /**
   * Find stops within the specified radius
   */
  findNearbyStops() {
    if (!this.busLocation) {
      return [];
    }
    
    const nearbyStops = [];
    
    for (const [stopId, stop] of this.stops) {
      const distance = calculateDistance(
        this.busLocation,
        { latitude: stop.latitude, longitude: stop.longitude }
      );
      
      // Check if within radius and not already reached
      if (distance <= this.STOP_RADIUS && !this.reachedStops.has(stopId)) {
        nearbyStops.push({
          ...stop,
          distance
        });
      }
    }
    
    // Sort by distance (closest first)
    return nearbyStops.sort((a, b) => a.distance - b.distance);
  }
  
  /**
   * Mark stop as reached (ONLY Firestore write operation)
   */
  async markStopAsReached(stop) {
    try {
      const now = new Date();
      const timestamp = Timestamp.now();
      const formattedTime = now.toLocaleTimeString();
      const formattedDate = now.toLocaleDateString();
      
      // Write to Firestore
      const stopRef = doc(firestoreDb, 'Route2', stop.id);
      await updateDoc(stopRef, {
        reached: true,
        reachedAt: timestamp,
        reachedTime: formattedTime,
        reachedDate: formattedDate,
        lastReachedTimestamp: now.getTime(),
        distance: Math.round(stop.distance * 100) / 100 // Round to 2 decimal places
      });
      
      // Update local state
      this.reachedStops.add(stop.id);
      
      // Update statistics
      this.stats.totalStopsReached++;
      this.stats.firestoreWrites++;
      
      console.log(`✅ Stop marked as reached: ${stop.name} (${stop.distance.toFixed(2)}m) - Firestore write #${this.stats.firestoreWrites}`);
      
    } catch (error) {
      console.error(`❌ Error marking stop as reached: ${stop.name}`, error);
    }
  }
  
  /**
   * Reset all stops (for manual reset or daily reset)
   */
  async resetAllStops() {
    try {
      console.log('🔄 Resetting all stops...');
      
      // Clear local state
      this.reachedStops.clear();
      
      // Note: We don't need to update Firestore here unless specifically requested
      // The Excel file remains the source of truth for stop locations
      
      console.log('✅ All stops reset successfully (local state cleared)');
      
    } catch (error) {
      console.error('❌ Error resetting stops:', error);
    }
  }
  
  /**
   * Get current statistics
   */
  getStats() {
    return {
      ...this.stats,
      totalStops: this.stops.size,
      reachedStops: this.reachedStops.size,
      unreachedStops: this.stops.size - this.reachedStops.size,
      currentLocation: this.busLocation
    };
  }
  
  /**
   * Get all stops (from Excel, not Firestore)
   */
  getStops() {
    const stopsArray = Array.from(this.stops.values());
    
    // Add reached status from local state
    return stopsArray.map(stop => ({
      ...stop,
      reached: this.reachedStops.has(stop.id)
    }));
  }
  
  /**
   * Get ordered stops by sequence
   */
  getOrderedStops() {
    const stopsArray = this.getStops();
    return stopsArray.sort((a, b) => a.sequence - b.sequence);
  }
}

// Create and export singleton instance
const optimizedExcelTrackingService = new OptimizedExcelTrackingService();

module.exports = {
  optimizedExcelTrackingService
};