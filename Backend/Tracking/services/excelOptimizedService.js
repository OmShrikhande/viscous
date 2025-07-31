/**
 * Excel-Based Optimized Service with New Serial Logic
 * 
 * This service uses your Excel file as the primary data source and implements
 * aggressive optimizations to prevent Firestore quota exhaustion.
 * 
 * Key Features:
 * - Reads from Excel file (no repeated Firestore reads)
 * - Batch operations only
 * - Aggressive rate limiting
 * - New serial number logic
 * - Quota protection
 */

const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const { ref, onValue } = require('firebase/database');
const { collection, doc, writeBatch, Timestamp } = require('firebase/firestore');
const { realtimeDatabase, firestoreDb } = require('../config/firebase');
const { calculateDistance } = require('../utils/geoUtils');

class ExcelOptimizedService {
  constructor() {
    // Configuration
    this.STOP_RADIUS = 50;
    this.MIN_PROCESSING_INTERVAL = 15000; // 15 seconds minimum
    this.MAX_OPERATIONS_PER_HOUR = 500; // Very conservative limit
    this.EXCEL_FILE_PATH = path.join(__dirname, '../../Route2.xlsx');
    
    // State
    this.excelStops = new Map(); // stopId -> stop data from Excel
    this.busLocation = null;
    this.lastProcessTime = 0;
    this.isProcessing = false;
    
    // Quota protection
    this.operationCount = 0;
    this.operationResetTime = Date.now();
    
    // Listeners
    this.busLocationListener = null;
    this.trackingInterval = null;
    
    console.log('📊 Excel Optimized Service - Using Excel file as primary data source');
  }
  
  /**
   * Start the service
   */
  async start() {
    try {
      console.log('🚀 Starting Excel Optimized Service...');
      
      // Load Excel data (one-time read)
      await this.loadExcelData();
      
      // Start location monitoring
      this.startLocationMonitoring();
      
      // Start processing interval
      this.startProcessingInterval();
      
      console.log('✅ Excel Optimized Service started');
      return true;
    } catch (error) {
      console.error('❌ Failed to start Excel Optimized Service:', error);
      return false;
    }
  }
  
  /**
   * Stop the service
   */
  stop() {
    console.log('🛑 Stopping Excel Optimized Service...');
    
    if (this.busLocationListener) {
      this.busLocationListener();
      this.busLocationListener = null;
    }
    
    if (this.trackingInterval) {
      clearInterval(this.trackingInterval);
      this.trackingInterval = null;
    }
    
    console.log('✅ Excel Optimized Service stopped');
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
      
      // Log first few stops for verification
      const firstStops = Array.from(this.excelStops.values()).slice(0, 3);
      firstStops.forEach(stop => {
        console.log(`   - ${stop.stopname} (Serial: ${stop.serialNumber}) at (${stop.latitude}, ${stop.longitude})`);
      });
      
    } catch (error) {
      console.error('❌ Error loading Excel data:', error);
      throw error;
    }
  }
  
  /**
   * Start location monitoring with aggressive debouncing
   */
  startLocationMonitoring() {
    console.log('🔄 Starting location monitoring...');
    
    const latRef = ref(realtimeDatabase, 'bus/Location/Latitude');
    const longRef = ref(realtimeDatabase, 'bus/Location/Longitude');
    
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
    
    if (this.busLocation.latitude && this.busLocation.longitude) {
      console.log(`🚌 Bus location updated: (${this.busLocation.latitude}, ${this.busLocation.longitude})`);
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
      
      // Find nearby stops (using Excel data only)
      const nearbyStops = this.findNearbyStops();
      
      if (nearbyStops.length === 0) {
        return;
      }
      
      // Process each nearby stop
      for (const nearbyStop of nearbyStops) {
        if (!nearbyStop.reached) {
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
    
    for (const [stopId, stop] of this.excelStops) {
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
      const batch = writeBatch(firestoreDb);
      const now = new Date();
      const timestamp = Timestamp.now();
      const formattedTime = now.toLocaleTimeString();
      
      // Update reached stop (serial number 1)
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
      
      // Update all other stops (reverse order, unreached)
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
      
      // Execute SINGLE batch operation
      await batch.commit();
      this.incrementOperationCount();
      
      // Update local Excel data cache
      for (const stop of allStops) {
        const localStop = this.excelStops.get(stop.id);
        if (localStop) {
          if (stop.id === reachedStopId) {
            localStop.reached = true;
            localStop.serialNumber = 1;
          } else {
            localStop.reached = false;
            localStop.serialNumber = allStops.findIndex(s => s.id === stop.id) + 2;
          }
          this.excelStops.set(stop.id, localStop);
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
      const batch = writeBatch(firestoreDb);
      const stopRef = doc(firestoreDb, 'Route2', stopId);
      
      batch.update(stopRef, {
        reached: true,
        reachedAt: timestamp,
        reachedTime: formattedTime,
        reachedDate: now.toLocaleDateString(),
        lastReachedTimestamp: now.getTime()
      });
      
      await batch.commit();
      this.incrementOperationCount();
      
      // Update local cache
      const stop = this.excelStops.get(stopId);
      if (stop) {
        stop.reached = true;
        this.excelStops.set(stopId, stop);
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
   * Get current stops data (from Excel cache)
   */
  getStops() {
    return Array.from(this.excelStops.values())
      .sort((a, b) => a.serialNumber - b.serialNumber);
  }
  
  /**
   * Get ordered stops (reached first, then by serial)
   */
  getOrderedStops() {
    return Array.from(this.excelStops.values())
      .sort((a, b) => {
        if (a.reached && !b.reached) return -1;
        if (!a.reached && b.reached) return 1;
        return a.serialNumber - b.serialNumber;
      });
  }
  
  /**
   * Get metrics
   */
  getMetrics() {
    return {
      excelStopsLoaded: this.excelStops.size,
      operationsThisHour: this.operationCount,
      maxOperationsPerHour: this.MAX_OPERATIONS_PER_HOUR,
      quotaProtectionActive: this.operationCount >= this.MAX_OPERATIONS_PER_HOUR * 0.8,
      lastProcessTime: new Date(this.lastProcessTime).toISOString(),
      processingInterval: '20 seconds',
      locationDebounce: '10 seconds'
    };
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
      const batch = writeBatch(firestoreDb);
      let counter = 1;
      
      for (const [stopId] of this.excelStops) {
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
      
      // Update local cache
      counter = 1;
      for (const [stopId, stop] of this.excelStops) {
        stop.reached = false;
        stop.serialNumber = counter++;
        this.excelStops.set(stopId, stop);
      }
      
      console.log('✅ All stops reset');
      return true;
      
    } catch (error) {
      console.error('❌ Reset failed:', error);
      return false;
    }
  }
  
  /**
   * Reload Excel data (if file was updated)
   */
  async reloadExcelData() {
    console.log('🔄 Reloading Excel data...');
    await this.loadExcelData();
    console.log('✅ Excel data reloaded');
  }
}

module.exports = ExcelOptimizedService;