/**
 * Excel Stop Service
 * 
 * This service reads stop data from an Excel file and compares it with the fetched bus location.
 * When conditions are met, it updates the Firestore database.
 */

const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const { calculateDistance } = require('../utils/geoUtils');
const { collection, doc, getDoc, updateDoc, Timestamp, setDoc } = require('firebase/firestore');
const { firestoreDb } = require('../config/firebase');
const { executeWithRetry, handleFirestoreError } = require('../utils/connectionCheck');

// Path to the Excel file (relative to project root)
const EXCEL_FILE_PATH = path.join(__dirname, '../../Route2.xlsx');

// Radius in meters to consider a stop as reached
const STOP_RADIUS = process.env.STOP_RADIUS || 50;

// Store the loaded stops data
let stopsData = null;

/**
 * Load stops data from the Excel file
 * @returns {Promise<Array>} Array of stops with their data
 */
const loadStopsFromExcel = async () => {
  try {
    // If data is already loaded, return it (to avoid unnecessary file reads)
    if (stopsData) {
      console.log(`Using cached Excel data (${stopsData.length} stops)`);
      return stopsData;
    }

    console.log('Loading stops data from Excel file...');
    
    // Check if the Excel file exists
    if (!fs.existsSync(EXCEL_FILE_PATH)) {
      console.error(`Excel file not found at ${EXCEL_FILE_PATH}`);
      return null;
    }

    // Read the Excel file
    const workbook = XLSX.readFile(EXCEL_FILE_PATH);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert the worksheet to JSON
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    // Log the data structure for debugging
    console.log(`Loaded ${data.length} stops from Excel file`);
    if (data.length > 0) {
      console.log(`First stop: "${data[0].stopname}" at coordinates (${data[0].Latitude}, ${data[0].Longitude})`);
    }
    
    // Store the data for future use
    stopsData = data;
    
    // Create a log file with the loaded data
    const logFilePath = path.join(__dirname, '../logs/stops_data.txt');
    const logDir = path.dirname(logFilePath);
    
    // Create the logs directory if it doesn't exist
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    // Write the data to the log file
    fs.writeFileSync(
      logFilePath, 
      JSON.stringify(data, null, 2),
      'utf8'
    );
    
    console.log(`Stops data written to ${logFilePath}`);
    
    return data;
  } catch (error) {
    console.error('Error loading stops from Excel:', error);
    return null;
  }
};

/**
 * Compare the bus location with the stops data from the Excel file
 * @param {Object} busLocation - The current bus location {latitude, longitude}
 * @returns {Promise<Array>} Array of stops that are within the radius
 */
const compareWithExcelStops = async (busLocation) => {
  try {
    // If stops data is not loaded yet, load it
    if (!stopsData) {
      console.log('Excel stops data not loaded, loading now...');
      await loadStopsFromExcel();
      if (!stopsData) {
        console.error('Failed to load stops data from Excel');
        return [];
      }
    }
    
    // Log that we're checking Excel stops (but not accessing Firestore yet)
    console.log(`Comparing bus location with ${stopsData.length} Excel stops...`);
    
    // Array to store stops that are within the radius
    const nearbyStops = [];
    
    // Compare the bus location with each stop
    for (const stop of stopsData) {
      // Skip if the stop doesn't have latitude and longitude
      if (!stop.Latitude || !stop.Longitude) {
        continue; // Skip silently to reduce log noise
      }
      
      // Calculate the distance between the bus and the stop
      const distance = calculateDistance(
        busLocation,
        { latitude: stop.Latitude, longitude: stop.Longitude }
      );
      
      // Check if the bus is within the radius of the stop
      if (distance <= STOP_RADIUS) {
        const stopName = stop.stopname || `Stop ${stop.serialNumber}`;
        console.log(`BUS REACHED EXCEL STOP: "${stopName}" (distance: ${distance}m)`);
        nearbyStops.push({
          ...stop,
          distance
        });
      }
    }
    
    // Only log if we found nearby stops
    if (nearbyStops.length > 0) {
      console.log(`Found ${nearbyStops.length} Excel stops within ${STOP_RADIUS}m radius`);
    }
    
    return nearbyStops;
  } catch (error) {
    console.error('Error comparing with Excel stops:', error);
    return [];
  }
};

/**
 * Update the Firestore database with the reached stop
 * @param {Object} stop - The stop that was reached
 * @returns {Promise<boolean>} True if the update was successful, false otherwise
 */
const updateFirestoreWithExcelStop = async (stop) => {
  try {
    // Use stopname as ID if available, otherwise use serialNumber
    const stopId = stop.stopname || `Stop${stop.serialNumber}`;
    
    // Log that we're checking this stop in Firestore (only accessing when needed)
    console.log(`EXCEL MATCH: Checking Firestore for stop "${stopId}" (distance: ${stop.distance}m)`);
    
    // Reference the specific document in Route2 collection
    const stopRef = doc(firestoreDb, 'Route2', stopId);
    
    // Check if the document exists with retry logic
    const stopDoc = await executeWithRetry(async () => {
      return await getDoc(stopRef);
    });
    
    // If the stop exists and is already marked as reached, skip it
    if (stopDoc.exists() && stopDoc.data().reached === true) {
      console.log(`Stop "${stopId}" is already marked as reached in Firestore, skipping update`);
      return false;
    }
    
    // Get current timestamp
    const reachedTimestamp = Timestamp.now();
    
    // Format the time as a readable string (HH:MM:SS)
    const date = new Date(reachedTimestamp.toMillis());
    const formattedTime = date.toLocaleTimeString();
    
    if (!stopDoc.exists()) {
      console.log(`Stop "${stopId}" does not exist in Firestore, creating it...`);
      
      // Create the document if it doesn't exist with retry logic
      await executeWithRetry(async () => {
        return await setDoc(stopRef, {
          Latitude: stop.Latitude,
          Longitude: stop.Longitude,
          Name: stop.stopname || `Stop ${stop.serialNumber}`,
          reached: true,
          reachedAt: reachedTimestamp,
          reachedTime: formattedTime,
          reachedDate: date.toLocaleDateString(),
          serialNumber: stop.serialNumber,
          time: stop.time
        });
      });
      
      console.log(`Created and marked stop "${stopId}" as reached at ${formattedTime}`);
    } else {
      // Update the existing document with retry logic
      await executeWithRetry(async () => {
        return await updateDoc(stopRef, {
          reached: true,
          reachedAt: reachedTimestamp,
          reachedTime: formattedTime,
          reachedDate: date.toLocaleDateString()
        });
      });
      
      console.log(`Stop "${stopId}" marked as reached at ${formattedTime}`);
    }
    
    // Log the update to a file
    const logFilePath = path.join(__dirname, '../logs/stop_updates.txt');
    const logDir = path.dirname(logFilePath);
    
    // Create the logs directory if it doesn't exist
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    // Append the update to the log file
    fs.appendFileSync(
      logFilePath,
      `${new Date().toISOString()} - Stop "${stopId}" (${stop.stopname || 'unnamed'}) marked as reached (distance: ${stop.distance}m)\n`,
      'utf8'
    );
    
    return true;
  } catch (error) {
    const stopId = stop.stopname || `Stop${stop.serialNumber}`;
    console.error(`Error updating Firestore for stop "${stopId}":`, error);
    
    // Handle the error and determine if it's a connection issue
    await handleFirestoreError(error);
    
    return false;
  }
};

/**
 * Process the bus location and update Firestore if any stops are reached
 * @param {Object} busLocation - The current bus location {latitude, longitude}
 * @returns {Promise<Array>} Array of stops that were updated
 */
const processExcelStops = async (busLocation) => {
  try {
    // Compare the bus location with the stops data (this doesn't access Firestore)
    const nearbyStops = await compareWithExcelStops(busLocation);
    
    // If no stops are nearby, return an empty array without accessing Firestore
    if (nearbyStops.length === 0) {
      return [];
    }
    
    console.log(`Processing ${nearbyStops.length} nearby Excel stops...`);
    
    // Array to store stops that were updated
    const updatedStops = [];
    
    // Update Firestore only for nearby stops (accessing Firestore only when needed)
    for (const stop of nearbyStops) {
      const updated = await updateFirestoreWithExcelStop(stop);
      if (updated) {
        updatedStops.push(stop);
      }
    }
    
    // Log the results
    if (updatedStops.length > 0) {
      console.log(`Successfully updated ${updatedStops.length} stops in Firestore`);
    } else if (nearbyStops.length > 0) {
      console.log(`No stops needed to be updated in Firestore (they may already be marked as reached)`);
    }
    
    return updatedStops;
  } catch (error) {
    console.error('Error processing Excel stops:', error);
    return [];
  }
};

/**
 * Force reload of the Excel data (useful when the Excel file has been updated)
 * @returns {Promise<Array>} Array of stops with their data
 */
const reloadExcelData = async () => {
  console.log('Forcing reload of Excel stops data...');
  
  // Clear the cached data
  stopsData = null;
  
  // Load the data again
  return await loadStopsFromExcel();
};

module.exports = {
  loadStopsFromExcel,
  compareWithExcelStops,
  updateFirestoreWithExcelStop,
  processExcelStops,
  reloadExcelData
};