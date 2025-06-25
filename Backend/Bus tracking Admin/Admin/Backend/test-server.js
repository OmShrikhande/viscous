/**
 * Test script to check if the server is running correctly
 * Run with: node test-server.js
 */

const fetch = require('node-fetch');

// Configuration
const API_URL = 'http://localhost:5000/api/config';

// Function to check if the server is running
const checkServer = async () => {
  try {
    console.log(`Checking if server is running at: ${API_URL}`);
    
    const response = await fetch(API_URL);
    const data = await response.json();
    
    console.log('Server is running!');
    console.log('Response:', data);
    
    return true;
  } catch (error) {
    console.error('Error connecting to server:', error.message);
    console.log('Make sure the server is running with: node server.js');
    return false;
  }
};

// Main function
const main = async () => {
  const serverRunning = await checkServer();
  
  if (serverRunning) {
    console.log('\nServer is ready for testing!');
    console.log('You can now run:');
    console.log('1. node test-location-update.js - to simulate sending location data');
    console.log('2. node test-location-history.js - to retrieve location history');
  } else {
    console.log('\nServer is not running or not accessible.');
    console.log('Please start the server with: node server.js');
  }
};

// Run the main function
main()
  .then(() => console.log('Test completed'))
  .catch(error => console.error('Test failed:', error));