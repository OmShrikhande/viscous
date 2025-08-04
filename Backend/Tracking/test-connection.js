/**
 * Simple Firebase connection test
 * Run this before starting the main server to ensure Firebase is accessible
 */

const { checkFirestoreConnection } = require('./utils/connectionCheck');
const { getBusLocation } = require('./services/locationService');

async function testConnections() {
  console.log('🔍 Testing Firebase connections...\n');
  
  // Test Firestore connection
  console.log('1. Testing Firestore connection...');
  try {
    const firestoreConnected = await checkFirestoreConnection(true);
    if (firestoreConnected) {
      console.log('✅ Firestore connection successful\n');
    } else {
      console.log('❌ Firestore connection failed\n');
    }
  } catch (error) {
    console.error('❌ Firestore connection error:', error.message);
  }
  
  // Test Realtime Database connection
  console.log('2. Testing Realtime Database connection...');
  try {
    const busLocation = await getBusLocation();
    if (busLocation) {
      console.log('✅ Realtime Database connection successful');
      console.log(`   Bus location: (${busLocation.latitude}, ${busLocation.longitude})\n`);
    } else {
      console.log('❌ Could not fetch bus location from Realtime Database\n');
    }
  } catch (error) {
    console.error('❌ Realtime Database connection error:', error.message);
  }
  
  // Test Excel file access
  console.log('3. Testing Excel file access...');
  try {
    const excelStopService = require('./services/excelStopService');
    const stopsData = await excelStopService.loadStopsFromExcel();
    if (stopsData && stopsData.length > 0) {
      console.log(`✅ Excel file loaded successfully (${stopsData.length} stops)\n`);
    } else {
      console.log('❌ Could not load stops from Excel file\n');
    }
  } catch (error) {
    console.error('❌ Excel file access error:', error.message);
  }
  
  console.log('🏁 Connection tests completed');
}

// Run the tests
testConnections().catch(console.error);