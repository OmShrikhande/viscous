/**
 * Test script to simulate sending location data
 * Run with: node test-location-update.js
 */

const fetch = require('node-fetch');

// Configuration
const API_URL = 'http://localhost:5000/api/location/test-update'; // Using the public test route

// Function to generate random coordinates near a base location
const generateRandomLocation = (baseLat, baseLng, radiusKm) => {
  // Earth's radius in kilometers
  const earthRadius = 6371;
  
  // Convert radius from kilometers to radians
  const radiusInRadians = radiusKm / earthRadius;
  
  // Convert latitude and longitude to radians
  const baseLatRad = baseLat * Math.PI / 180;
  const baseLngRad = baseLng * Math.PI / 180;
  
  // Generate a random angle and distance
  const randomAngle = Math.random() * 2 * Math.PI;
  const randomDistance = Math.random() * radiusInRadians;
  
  // Calculate new position
  const newLatRad = Math.asin(
    Math.sin(baseLatRad) * Math.cos(randomDistance) +
    Math.cos(baseLatRad) * Math.sin(randomDistance) * Math.cos(randomAngle)
  );
  
  const newLngRad = baseLngRad + Math.atan2(
    Math.sin(randomAngle) * Math.sin(randomDistance) * Math.cos(baseLatRad),
    Math.cos(randomDistance) - Math.sin(baseLatRad) * Math.sin(newLatRad)
  );
  
  // Convert back to degrees
  const newLat = newLatRad * 180 / Math.PI;
  const newLng = newLngRad * 180 / Math.PI;
  
  return { latitude: newLat, longitude: newLng };
};

// Function to send location update
const sendLocationUpdate = async (userId, latitude, longitude, speed, status) => {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId,
        latitude,
        longitude,
        speed,
        status
      })
    });
    
    const data = await response.json();
    if (data.success) {
      console.log('✅ Location update successful');
      console.log(`📂 Data saved to path: ${data.path}`);
      console.log(`📊 Data: ${JSON.stringify(data.data, null, 2)}`);
    } else {
      console.log('❌ Location update failed:', data.message);
    }
    return data;
  } catch (error) {
    console.error('Error sending location update:', error);
    return { success: false, error: error.message };
  }
};

// Main function to simulate bus movement
const simulateBusMovement = async () => {
  // Base location (New Delhi, India)
  const baseLat = 28.6139;
  const baseLng = 77.2090;
  
  // Bus ID
  const busId = 'bus-1';
  
  console.log(`🚌 Simulating movement for bus ${busId}`);
  
  // Generate random location within 5km of base location
  const { latitude, longitude } = generateRandomLocation(baseLat, baseLng, 5);
  
  // Generate random speed between 0 and 60 km/h
  const speed = Math.random() * 60;
  
  // Generate random status
  const statuses = ['running', 'stopped', 'idle'];
  const status = statuses[Math.floor(Math.random() * statuses.length)];
  
  console.log(`📍 Location: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
  console.log(`🚀 Speed: ${speed.toFixed(2)} km/h`);
  console.log(`🚦 Status: ${status}`);
  
  // Send location update
  await sendLocationUpdate(busId, latitude, longitude, speed, status);
};

// Run the simulation
simulateBusMovement()
  .then(() => console.log('Simulation completed'))
  .catch(error => console.error('Simulation failed:', error));