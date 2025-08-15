/**
 * Unified Excel Service - IMMEDIATE QUOTA FIX
 * 
 * This service replaces the quota-heavy services in your unified server:
 * - locationService (multiple Firestore reads/writes)
 * - enhancedLocationService (frequent operations)
 * - bidirectionalTrackingService (duplicate operations)
 * 
 * Key Features:
 * - Uses Route2.xlsx as primary data source
 * - Single service instead of 3 competing services
 * - Batch operations only
 * - New serial number logic
 * - Maximum quota protection
 * - Compatible with existing API endpoints
 */

const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const { ref, onValue } = require('firebase/database');
const { collection, doc, writeBatch, Timestamp, getDocs } = require('firebase/firestore');
const { calculateDistance } = require('../utils/geoUtils');

class UnifiedExcelService {
  constructor(realtimeDatabase, firestoreDb) {
    // Firebase instances
    this.realtimeDatabase = realtimeDatabase;
    this.firestoreDb = firestoreDb;
    
    // Configuration
    this.STOP_RADIUS = 50;
    this.MIN_PROCESSING_INTERVAL = 15000; // 15 seconds minimum
    this.MAX_OPERATIONS_PER_HOUR = 800; // Conservative limit
    this.EXCEL_FILE_PATH = path.join(__dirname, '../../Route2.xlsx');
    
    // State
    this.excelStops = new Map(); // stopId -> stop data from Excel
    this.firestoreStops = new Map(); // Cache of Firestore data
    this.busLocation = null;
    this.lastProcessTime = 0;
    this.isProcessing = false;
    this.isActive = false;
    
    // Quota protection
    this.operationCount = 0;
    this.operationResetTime = Date.now();
    
    // Listeners
    this.busLocationListener = null;
    this.trackingInterval = null;
    this.cacheRefreshInterval = null;
    
    // Cache management
    this.lastCacheUpdate = 0;
    this.CACHE_TTL = 300000; // 5 minutes
    
    console.log('📊 Unified Excel Service - Replacing multiple quota-heavy services');
  }
  
  /**
   * Start the unified service
   */
  async start() {
    try {
      console.log('🚀 Starting Unified Excel Service...');
      
      // Load Excel data (one-time read)
      await this.loadExcelData();
      
      // Initial Firestore cache load (one-time)
      await this.loadFirestoreCache();
      
      // Start location monitoring
      this.startLocationMonitoring();
      
      // Start processing interval
      this.startProcessingInterval();
      
      // Start cache refresh interval
      this.startCacheRefreshInterval();
      
      this.isActive = true;
      console.log('✅ Unified Excel Service started - Quota protection active');
      return true;
    } catch (error) {
      console.error('❌ Failed to start Unified Excel Service:', error);
      return false;
    }
  }
  
  /**
   * Stop the service
   */
  stop() {
    console.log('🛑 Stopping Unified Excel Service...');
    
    if (this.busLocationListener) {
      this.busLocationListener();
      this.busLocationListener = null;
    }
    
    if (this.trackingInterval) {
      clearInterval(this.trackingInterval);
      this.trackingInterval = null;
    }
    
    if (this.cacheRefreshInterval) {
      clearInterval(this.cacheRefreshInterval);
      this.cacheRefreshInterval = null;
    }
    
    this.isActive = false;
    console.log('✅ Unified Excel Service stopped');
  }
  
  /**
   * Load stops data from Excel file (one-time operation)
   */
  async loadExcelData() {
    try {
      console.log('📊 Loading stops from Excel file...');
      
      if (!fs.existsSync(this.EXCEL_FILE_PATH)) {
        throw new Error(`Excel file not found: ${this.EXCEL_FILE_PATH}`);
      }
      
      // Read Excel file
      const workbook = XLSX.readFile(this.EXCEL_FILE_PATH);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);
      
      // Process and store data
      this.excelStops.clear();
      
      for (const row of data) {
        if (row.Latitude && row.Longitude) {
          const stopId = row.stopname || `Stop${row.serialNumber}`;
          this.excelStops.set(stopId, {
            id: stopId,
            stopname: row.stopname,
            serialNumber: row.serialNumber || 0,
            time: row.time,
            latitude: row.Latitude,
            longitude: row.Longitude,
            reached: row.reached || false
          });
        }
      }
      
      console.log(`✅ Loaded ${this.excelStops.size} stops from Excel file`);
      
    } catch (error) {
      console.error('❌ Error loading Excel data:', error);
      throw error;
    }
  }
  
  /**
   * Load Firestore cache (one-time operation at startup)
   */
  async loadFirestoreCache() {
    if (!this.checkQuota()) {
      console.log('⚠️ Skipping Firestore cache load - Quota protection');
      return;
    }
    
    try {
      console.log('🔄 Loading Firestore cache...');
      
      const route2Ref = collection(this.firestoreDb, 'Route2');
      const querySnapshot = await getDocs(route2Ref);
      this.incrementOperationCount();
      
      this.firestoreStops.clear();
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        this.firestoreStops.set(doc.id, {
          id: doc.id,
          ...data
        });
      });
      
      this.lastCacheUpdate = Date.now();
      console.log(`✅ Loaded ${this.firestoreStops.size} stops from Firestore cache`);
      
    } catch (error) {
      console.error('❌ Error loading Firestore cache:', error);
    }
  }
  
  /**
   * Start location monitoring with aggressive debouncing
   */
  startLocationMonitoring() {
    console.log('🔄 Starting location monitoring...');
    
    const latRef = ref(this.realtimeDatabase, 'bus/Location/Latitude');
    const longRef = ref(this.realtimeDatabase, 'bus/Location/Longitude');
    
    // Very aggressive debouncing - 10 seconds
    let locationUpdateTimeout = null;
    
    const updateLocation = (locationUpdate) => {
      if (locationUpdateTimeout) {
        clearTimeout(locationUpdateTimeout);
      }
      
      locationUpdateTimeout = setTimeout(() => {
        this.updateBusLocation(locationUpdate);
      }, 10000); // 10 second debounce
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
    
    console.log('✅ Location monitoring started with 10s debounce');
  }
  
  /**
   * Update bus location
   */
  updateBusLocation(locationUpdate) {
    if (!this.busLocation) {
      this.busLocation = {};
    }
    
    Object.assign(this.busLocation, locationUpdate);
    
    // Log partial updates for debugging
    if (locationUpdate.latitude !== undefined) {
      console.log(`📍 Bus latitude updated: ${locationUpdate.latitude}`);
    }
    if (locationUpdate.longitude !== undefined) {
      console.log(`📍 Bus longitude updated: ${locationUpdate.longitude}`);
    }
    
    // Only log complete location when both coordinates are valid
    if (this.busLocation.latitude != null && 
        this.busLocation.longitude != null &&
        !isNaN(parseFloat(this.busLocation.latitude)) &&
        !isNaN(parseFloat(this.busLocation.longitude))) {
      console.log(`🚌 Bus location complete: (${this.busLocation.latitude}, ${this.busLocation.longitude})`);
    } else {
      console.log(`⚠️ Bus location incomplete: lat=${this.busLocation.latitude}, lng=${this.busLocation.longitude}`);
    }
  }
  
  /**
   * Start processing interval with maximum throttling
   */
  startProcessingInterval() {
    console.log('🔄 Starting processing interval...');
    
    // Very conservative - 20 seconds
    this.trackingInterval = setInterval(() => {
      this.processStopDetection();
    }, 20000);
    
    console.log('✅ Processing interval started (20s)');
  }
  
  /**
   * Start cache refresh interval
   */
  startCacheRefreshInterval() {
    // Refresh cache every 10 minutes if quota allows
    this.cacheRefreshInterval = setInterval(() => {
      const now = Date.now();
      if (now - this.lastCacheUpdate > this.CACHE_TTL && this.checkQuota()) {
        this.loadFirestoreCache();
      }
    }, 600000); // 10 minutes
  }
  
  /**
   * Process stop detection with new serial logic
   */
  async processStopDetection() {
    const now = Date.now();
    
    // Aggressive throttling
    if (this.isProcessing || 
        (now - this.lastProcessTime) < this.MIN_PROCESSING_INTERVAL ||
        !this.checkQuota()) {
      return;
    }
    
    this.isProcessing = true;
    this.lastProcessTime = now;
    
    try {
      if (!this.busLocation || this.excelStops.size === 0) {
        return;
      }
      
      // Additional validation for bus location completeness
      if (this.busLocation.latitude == null || 
          this.busLocation.longitude == null ||
          isNaN(parseFloat(this.busLocation.latitude)) ||
          isNaN(parseFloat(this.busLocation.longitude))) {
        console.log('⚠️ Bus location incomplete - waiting for complete coordinates');
        return;
      }
      
      // Find nearby stops (using Excel data only)
      const nearbyStops = this.findNearbyStops();
      
      if (nearbyStops.length === 0) {
        return;
      }
      
      // Process each nearby stop
      for (const nearbyStop of nearbyStops) {
        // Check if already reached (using cache)
        const cachedStop = this.firestoreStops.get(nearbyStop.id);
        if (cachedStop && cachedStop.reached) {
          continue; // Skip already reached stops
        }
        
        console.log(`🎯 Bus reached: ${nearbyStop.stopname} (${nearbyStop.distance.toFixed(2)}m)`);
        
        // Check if this is the highest serial number stop
        const isHighestSerial = this.isHighestSerialStop(nearbyStop.id);
        
        if (isHighestSerial) {
          console.log(`🔄 Highest serial stop reached: ${nearbyStop.stopname} - Implementing new logic`);
          await this.implementNewSerialLogic(nearbyStop.id);
        } else {
          console.log(`📍 Regular stop reached: ${nearbyStop.stopname}`);
          await this.markStopAsReached(nearbyStop.id);
        }
      }
      
    } catch (error) {
      console.error('❌ Error in stop detection:', error);
    } finally {
      this.isProcessing = false;
    }
  }
  
  /**
   * Find nearby stops using Excel data
   */
  findNearbyStops() {
    const nearbyStops = [];
    
    // Validate bus location has both coordinates
    if (!this.busLocation || 
        this.busLocation.latitude == null || 
        this.busLocation.longitude == null ||
        isNaN(parseFloat(this.busLocation.latitude)) ||
        isNaN(parseFloat(this.busLocation.longitude))) {
      console.log('⚠️ Bus location incomplete - skipping distance calculations');
      return nearbyStops;
    }
    
    for (const [stopId, stop] of this.excelStops) {
      // Validate stop coordinates
      if (stop.latitude == null || stop.longitude == null ||
          isNaN(parseFloat(stop.latitude)) || isNaN(parseFloat(stop.longitude))) {
        console.log(`⚠️ Stop ${stopId} has invalid coordinates - skipping`);
        continue;
      }
      
      const distance = calculateDistance(this.busLocation, {
        latitude: stop.latitude,
        longitude: stop.longitude
      });
      
      if (distance <= this.STOP_RADIUS) {
        nearbyStops.push({
          ...stop,
          distance: distance
        });
      }
    }
    
    return nearbyStops;
  }
  
  /**
   * Check if stop has highest serial number (using Excel data)
   */
  isHighestSerialStop(stopId) {
    let maxSerial = 0;
    let maxStopId = null;
    
    for (const [id, stop] of this.excelStops) {
      if (stop.serialNumber > maxSerial) {
        maxSerial = stop.serialNumber;
        maxStopId = id;
      }
    }
    
    return stopId === maxStopId;
  }
  
  /**
   * Implement new serial logic (BATCH OPERATION ONLY)
   */
  async implementNewSerialLogic(reachedStopId) {
    if (!this.checkQuota()) {
      console.log('⚠️ Quota exceeded - Skipping new logic implementation');
      return;
    }
    
    try {
      console.log('🔄 Implementing new serial logic with batch operation...');
      
      // Get all stops sorted by current serial number (descending)
      const allStops = Array.from(this.excelStops.values())
        .sort((a, b) => b.serialNumber - a.serialNumber);
      
      // Create SINGLE batch operation
      const batch = writeBatch(this.firestoreDb);
      const now = new Date();
      const timestamp = Timestamp.now();
      const formattedTime = now.toLocaleTimeString();
      
      // Update reached stop (serial number 1)
      const reachedStopRef = doc(this.firestoreDb, 'Route2', reachedStopId);
      batch.update(reachedStopRef, {
        reached: true,
        serialNumber: 1,
        reachedAt: timestamp,
        reachedTime: formattedTime,
        reachedDate: now.toLocaleDateString(),
        lastReachedTimestamp: now.getTime(),
        lastReorderTime: now.toISOString()
      });
      
      // Update all other stops (reverse order, unreached)
      let serialCounter = 2;
      for (const stop of allStops) {
        if (stop.id !== reachedStopId) {
          const stopRef = doc(this.firestoreDb, 'Route2', stop.id);
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
      
      // Execute SINGLE batch operation
      await batch.commit();
      this.incrementOperationCount();
      
      // Update local caches
      serialCounter = 1;
      for (const stop of allStops) {
        // Update Excel cache
        const excelStop = this.excelStops.get(stop.id);
        if (excelStop) {
          if (stop.id === reachedStopId) {
            excelStop.reached = true;
            excelStop.serialNumber = 1;
          } else {
            excelStop.reached = false;
            excelStop.serialNumber = serialCounter + 1;
          }
          this.excelStops.set(stop.id, excelStop);
        }
        
        // Update Firestore cache
        const firestoreStop = this.firestoreStops.get(stop.id);
        if (firestoreStop) {
          if (stop.id === reachedStopId) {
            firestoreStop.reached = true;
            firestoreStop.serialNumber = 1;
          } else {
            firestoreStop.reached = false;
            firestoreStop.serialNumber = serialCounter + 1;
          }
          this.firestoreStops.set(stop.id, firestoreStop);
        }
        
        if (stop.id !== reachedStopId) {
          serialCounter++;
        }
      }
      
      console.log(`✅ New serial logic completed - ${allStops.length} stops updated in single batch`);
      
    } catch (error) {
      console.error('❌ New serial logic failed:', error);
    }
  }
  
  /**
   * Mark single stop as reached (SINGLE OPERATION)
   */
  async markStopAsReached(stopId) {
    if (!this.checkQuota()) {
      console.log('⚠️ Quota exceeded - Skipping stop update');
      return;
    }
    
    try {
      const now = new Date();
      const timestamp = Timestamp.now();
      const formattedTime = now.toLocaleTimeString();
      
      // Single batch operation (even for one update)
      const batch = writeBatch(this.firestoreDb);
      const stopRef = doc(this.firestoreDb, 'Route2', stopId);
      
      batch.update(stopRef, {
        reached: true,
        reachedAt: timestamp,
        reachedTime: formattedTime,
        reachedDate: now.toLocaleDateString(),
        lastReachedTimestamp: now.getTime()
      });
      
      await batch.commit();
      this.incrementOperationCount();
      
      // Update local caches
      const excelStop = this.excelStops.get(stopId);
      if (excelStop) {
        excelStop.reached = true;
        this.excelStops.set(stopId, excelStop);
      }
      
      const firestoreStop = this.firestoreStops.get(stopId);
      if (firestoreStop) {
        firestoreStop.reached = true;
        this.firestoreStops.set(stopId, firestoreStop);
      }
      
      console.log(`✅ Stop ${stopId} marked as reached`);
      
    } catch (error) {
      console.error(`❌ Failed to mark stop ${stopId}:`, error);
    }
  }
  
  /**
   * Check quota to prevent exhaustion
   */
  checkQuota() {
    const now = Date.now();
    
    // Reset counter every hour
    if (now - this.operationResetTime > 3600000) {
      this.operationCount = 0;
      this.operationResetTime = now;
    }
    
    if (this.operationCount >= this.MAX_OPERATIONS_PER_HOUR) {
      console.log('⚠️ QUOTA PROTECTION: Maximum operations reached');
      return false;
    }
    
    return true;
  }
  
  /**
   * Increment operation counter
   */
  incrementOperationCount() {
    this.operationCount++;
    console.log(`📊 Operations this hour: ${this.operationCount}/${this.MAX_OPERATIONS_PER_HOUR}`);
  }
  
  /**
   * Get bus location (compatible with existing API)
   */
  getBusLocation() {
    return this.busLocation;
  }
  
  /**
   * Get stops (compatible with existing API)
   */
  getStops(forceRefresh = false) {
    // Use cached Firestore data if available and fresh
    const now = Date.now();
    const cacheAge = now - this.lastCacheUpdate;
    
    if (!forceRefresh && this.firestoreStops.size > 0 && cacheAge < this.CACHE_TTL) {
      return Array.from(this.firestoreStops.values())
        .sort((a, b) => a.serialNumber - b.serialNumber);
    }
    
    // Fallback to Excel data
    return Array.from(this.excelStops.values())
      .sort((a, b) => a.serialNumber - b.serialNumber);
  }
  
  /**
   * Reset all stops (admin function)
   */
  async resetAllStops() {
    if (!this.checkQuota()) {
      console.log('⚠️ Cannot reset - Quota exceeded');
      return false;
    }
    
    try {
      const batch = writeBatch(this.firestoreDb);
      let counter = 1;
      
      for (const [stopId] of this.excelStops) {
        const stopRef = doc(this.firestoreDb, 'Route2', stopId);
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
      
      // Update local caches
      counter = 1;
      for (const [stopId, stop] of this.excelStops) {
        stop.reached = false;
        stop.serialNumber = counter++;
        this.excelStops.set(stopId, stop);
      }
      
      for (const [stopId, stop] of this.firestoreStops) {
        stop.reached = false;
        stop.serialNumber = this.excelStops.get(stopId)?.serialNumber || counter++;
        this.firestoreStops.set(stopId, stop);
      }
      
      console.log('✅ All stops reset');
      return true;
      
    } catch (error) {
      console.error('❌ Reset failed:', error);
      return false;
    }
  }
  
  /**
   * Get service statistics (compatible with existing services)
   */
  getStats() {
    return {
      isActive: this.isActive,
      excelStopsLoaded: this.excelStops.size,
      firestoreStopsCached: this.firestoreStops.size,
      operationsThisHour: this.operationCount,
      maxOperationsPerHour: this.MAX_OPERATIONS_PER_HOUR,
      quotaProtectionActive: this.operationCount >= this.MAX_OPERATIONS_PER_HOUR * 0.8,
      lastProcessTime: new Date(this.lastProcessTime).toISOString(),
      lastCacheUpdate: new Date(this.lastCacheUpdate).toISOString(),
      cacheAge: Date.now() - this.lastCacheUpdate,
      processingInterval: '20 seconds',
      locationDebounce: '10 seconds',
      busLocation: this.busLocation
    };
  }
  
  /**
   * Manual check stops (rate limited)
   */
  async checkStopsReached() {
    // Trigger processing with internal throttling
    setTimeout(() => {
      this.processStopDetection();
    }, 1000);
  }
}

module.exports = { UnifiedExcelService };