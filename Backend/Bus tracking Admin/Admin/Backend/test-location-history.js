/**
 * Test script to retrieve location history
 * Run with: node test-location-history.js
 */

const fetch = require('node-fetch');

// Using the public test route

// Function to get today's date in YYYY-MM-DD format
const getTodayDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Function to retrieve location history
const getLocationHistory = async (date) => {
  try {
    const API_URL = `http://localhost:5000/api/location/test-history/${date}`;
    
    console.log(`Fetching location history from: ${API_URL}`);
    
    const response = await fetch(API_URL, {
      method: 'GET'
    });
    
    const data = await response.json();
    
    if (data.success && data.data && data.data.entries) {
      console.log(`Found ${data.data.entries.length} location entries`);
      
      // Display the first 3 entries in a table format
      console.table(
        data.data.entries.slice(0, 3).map(entry => ({
          id: entry.id,
          time: new Date(entry.timestamp).toLocaleTimeString(),
          latitude: entry.latitude,
          longitude: entry.longitude,
          speed: Math.round(entry.speed) + ' km/h',
          status: entry.status || 'unknown'
        }))
      );
    } else {
      console.log('No location data found');
    }
    
    return data;
  } catch (error) {
    console.error('Error retrieving location history:', error);
    return { success: false, error: error.message };
  }
};

// Main function
const main = async () => {
  // Get today's date
  const today = getTodayDate();
  
  console.log(`📅 Date: ${today}`);
  console.log('🔍 Checking locationhistory collection...');
  
  // Get location history from locationhistory collection only
  await getLocationHistory(today);
};

// Run the main function
main()
  .then(() => console.log('Test completed'))
  .catch(error => console.error('Test failed:', error));