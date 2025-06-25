/**
 * This script simulates bus location data for testing purposes.
 * It generates random routes and stores them in Firebase Firestore.
 */

require('dotenv').config();
const { initializeFirebaseAdmin, admin } = require('../firebase-service-account');

// Initialize Firebase Admin
initializeFirebaseAdmin();

const db = admin.firestore();

// Sample user IDs (replace with actual user IDs from your database)
const userIds = [
  '60d0fe4f5311236168a109ca', // Replace with actual user IDs
  '60d0fe4f5311236168a109cb',
  '60d0fe4f5311236168a109cc'
];

// Sample route starting points (latitude, longitude)
const routeStartPoints = [
  { lat: 28.6139, lng: 77.2090 }, // Delhi
  { lat: 19.0760, lng: 72.8777 }, // Mumbai
  { lat: 12.9716, lng: 77.5946 }  // Bangalore
];

// Generate a random point near a given location
function generateRandomPoint(center, radiusKm) {
  // Earth's radius in kilometers
  const earthRadius = 6371;
  
  // Convert radius from kilometers to radians
  const radiusInRadians = radiusKm / earthRadius;
  
  // Convert latitude and longitude to radians
  const centerLatRad = center.lat * Math.PI / 180;
  const centerLngRad = center.lng * Math.PI / 180;
  
  // Generate a random distance and bearing
  const randomDistance = Math.random() * radiusInRadians;
  const randomBearing = Math.random() * 2 * Math.PI;
  
  // Calculate new latitude
  const newLatRad = Math.asin(
    Math.sin(centerLatRad) * Math.cos(randomDistance) +
    Math.cos(centerLatRad) * Math.sin(randomDistance) * Math.cos(randomBearing)
  );
  
  // Calculate new longitude
  const newLngRad = centerLngRad + Math.atan2(
    Math.sin(randomBearing) * Math.sin(randomDistance) * Math.cos(centerLatRad),
    Math.cos(randomDistance) - Math.sin(centerLatRad) * Math.sin(newLatRad)
  );
  
  // Convert back to degrees
  const newLat = newLatRad * 180 / Math.PI;
  const newLng = newLngRad * 180 / Math.PI;
  
  return { lat: newLat, lng: newLng };
}

// Generate a route with multiple points
function generateRoute(startPoint, numPoints, radiusKm) {
  const route = [];
  let currentPoint = startPoint;
  
  for (let i = 0; i < numPoints; i++) {
    // Add some randomness to the radius for each point
    const pointRadius = (Math.random() * 0.5 + 0.5) * radiusKm / numPoints;
    
    // Generate a new point that's somewhat in the direction of the previous movement
    currentPoint = generateRandomPoint(currentPoint, pointRadius);
    route.push(currentPoint);
  }
  
  return route;
}

// Generate timestamps for a route
function generateTimestamps(numPoints, startDate = new Date()) {
  const timestamps = [];
  let currentTime = new Date(startDate);
  
  for (let i = 0; i < numPoints; i++) {
    // Add 2-5 minutes between points
    const minutesToAdd = Math.floor(Math.random() * 3) + 2;
    currentTime = new Date(currentTime.getTime() + minutesToAdd * 60000);
    timestamps.push(currentTime);
  }
  
  return timestamps;
}

// Generate and store bus location data for a user
async function generateAndStoreBusData(userId, startPoint, daysBack = 7) {
  console.log(`Generating data for user ${userId}...`);
  
  // Generate data for each day
  for (let day = 0; day < daysBack; day++) {
    // Calculate the date
    const date = new Date();
    date.setDate(date.getDate() - day);
    date.setHours(8, 0, 0, 0); // Start at 8:00 AM
    
    // Generate morning route (8:00 AM - 12:00 PM)
    const morningRoutePoints = 20;
    const morningRoute = generateRoute(startPoint, morningRoutePoints, 10);
    const morningTimestamps = generateTimestamps(morningRoutePoints, date);
    
    // Generate afternoon route (1:00 PM - 5:00 PM)
    const afternoonStart = new Date(date);
    afternoonStart.setHours(13, 0, 0, 0); // 1:00 PM
    const afternoonRoutePoints = 20;
    const afternoonRoute = generateRoute(morningRoute[morningRoutePoints - 1], afternoonRoutePoints, 10);
    const afternoonTimestamps = generateTimestamps(afternoonRoutePoints, afternoonStart);
    
    // Combine routes
    const combinedRoute = [...morningRoute, ...afternoonRoute];
    const combinedTimestamps = [...morningTimestamps, ...afternoonTimestamps];
    
    // Store each point in Firestore
    const batch = db.batch();
    
    for (let i = 0; i < combinedRoute.length; i++) {
      const point = combinedRoute[i];
      const timestamp = combinedTimestamps[i];
      
      const docRef = db.collection('locations').doc();
      batch.set(docRef, {
        userId: userId,
        latitude: point.lat,
        longitude: point.lng,
        timestamp: admin.firestore.Timestamp.fromDate(timestamp),
        speed: Math.floor(Math.random() * 60) + 20, // Random speed between 20-80 km/h
        heading: Math.floor(Math.random() * 360), // Random heading (0-359 degrees)
        accuracy: Math.floor(Math.random() * 10) + 5 // Random accuracy between 5-15 meters
      });
    }
    
    await batch.commit();
    console.log(`Added ${combinedRoute.length} points for user ${userId} on ${date.toDateString()}`);
  }
}

// Main function to generate data for all users
async function generateAllData() {
  try {
    for (let i = 0; i < userIds.length; i++) {
      await generateAndStoreBusData(userIds[i], routeStartPoints[i]);
    }
    console.log('All data generated successfully!');
  } catch (error) {
    console.error('Error generating data:', error);
  } finally {
    process.exit(0);
  }
}

// Run the script
generateAllData();