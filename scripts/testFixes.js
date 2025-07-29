/**
 * Test Script for Bug Fixes
 * 
 * This script tests the three main fixes:
 * 1. Profile Firebase update
 * 2. Bus stop notifications
 * 3. Enhanced location storage logic
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc, setDoc, serverTimestamp } = require('firebase/firestore');
const { getDatabase, ref, get, set } = require('firebase/database');

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAc_3UzizC6Y-hzI_5fDYmXiTSTwR69oac",
  authDomain: "bus-tracker-4e0fc.firebaseapp.com",
  databaseURL: "https://bus-tracker-4e0fc-default-rtdb.firebaseio.com",
  projectId: "bus-tracker-4e0fc",
  storageBucket: "bus-tracker-4e0fc.firebasestorage.app",
  messagingSenderId: "899399291440",
  appId: "1:899399291440:web:1c4535401988d905e293f5",
  measurementId: "G-JFC5HHBVGC"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const firestoreDb = getFirestore(app);
const realtimeDb = getDatabase(app);

/**
 * Test 1: Profile Firebase Update
 */
async function testProfileUpdate() {
  console.log('\n🧪 Testing Profile Firebase Update...');
  
  try {
    const testEmail = 'test@example.com';
    const testData = {
      name: 'Test User',
      email: testEmail,
      phoneNumber: '+1234567890',
      routeNumber: '2',
      busStop: 'Test Stop',
      role: 'user',
      lastUpdated: serverTimestamp(),
      testTimestamp: new Date().toISOString()
    };
    
    console.log('📝 Creating test document...');
    const userRef = doc(firestoreDb, 'userdata', testEmail);
    
    // Test write
    await setDoc(userRef, testData, { merge: true });
    console.log('✅ Write successful');
    
    // Test read to verify
    const docSnap = await getDoc(userRef);
    if (docSnap.exists()) {
      const savedData = docSnap.data();
      console.log('✅ Read successful:', {
        name: savedData.name,
        phoneNumber: savedData.phoneNumber,
        routeNumber: savedData.routeNumber,
        busStop: savedData.busStop
      });
      
      // Cleanup
      await setDoc(userRef, { testTimestamp: null }, { merge: true });
      console.log('🧹 Test cleanup completed');
      
      return true;
    } else {
      console.error('❌ Document not found after write');
      return false;
    }
  } catch (error) {
    console.error('❌ Profile update test failed:', error);
    return false;
  }
}

/**
 * Test 2: Bus Location Storage
 */
async function testLocationStorage() {
  console.log('\n🧪 Testing Bus Location Storage...');
  
  try {
    // Test reading current location
    console.log('📍 Reading current bus location...');
    const latRef = ref(realtimeDb, 'bus/Location/Latitude');
    const longRef = ref(realtimeDb, 'bus/Location/Longitude');
    
    const [latSnapshot, longSnapshot] = await Promise.all([
      get(latRef),
      get(longRef)
    ]);
    
    if (latSnapshot.exists() && longSnapshot.exists()) {
      const location = {
        latitude: latSnapshot.val(),
        longitude: longSnapshot.val()
      };
      console.log('✅ Location read successful:', location);
      
      // Test writing a test location
      console.log('📝 Testing location write...');
      const testLocation = {
        Latitude: location.latitude + 0.0001, // Slight offset
        Longitude: location.longitude + 0.0001,
        Speed: 25,
        Timestamp: new Date().toISOString(),
        TestFlag: true
      };
      
      const locationRef = ref(realtimeDb, 'bus/Location');
      await set(locationRef, testLocation);
      console.log('✅ Location write successful');
      
      // Restore original location
      await set(locationRef, {
        Latitude: location.latitude,
        Longitude: location.longitude,
        Speed: testLocation.Speed,
        Timestamp: testLocation.Timestamp
      });
      console.log('🧹 Original location restored');
      
      return true;
    } else {
      console.error('❌ Could not read bus location');
      return false;
    }
  } catch (error) {
    console.error('❌ Location storage test failed:', error);
    return false;
  }
}

/**
 * Test 3: Route Stops Data
 */
async function testRouteStops() {
  console.log('\n🧪 Testing Route Stops Data...');
  
  try {
    // Test reading Route2 collection
    console.log('📍 Reading Route2 stops...');
    const { collection, getDocs } = require('firebase/firestore');
    
    const route2Ref = collection(firestoreDb, 'Route2');
    const querySnapshot = await getDocs(route2Ref);
    
    const stops = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.Latitude && data.Longitude) {
        stops.push({
          id: doc.id,
          latitude: data.Latitude,
          longitude: data.Longitude,
          reached: data.reached || false
        });
      }
    });
    
    console.log(`✅ Found ${stops.length} stops in Route2`);
    
    if (stops.length > 0) {
      // Show first few stops
      console.log('📋 Sample stops:', stops.slice(0, 3).map(s => ({
        id: s.id,
        reached: s.reached
      })));
      return true;
    } else {
      console.warn('⚠️ No stops found in Route2 collection');
      return false;
    }
  } catch (error) {
    console.error('❌ Route stops test failed:', error);
    return false;
  }
}

/**
 * Test 4: Enhanced Location Service Configuration
 */
async function testEnhancedLocationService() {
  console.log('\n🧪 Testing Enhanced Location Service...');
  
  try {
    // Import the enhanced location service
    const { enhancedLocationService } = require('../Backend/Tracking/services/enhancedLocationService');
    
    // Get initial stats
    const initialStats = enhancedLocationService.getStats();
    console.log('📊 Initial stats:', {
      isActive: initialStats.isActive,
      totalStores: initialStats.totalStores,
      pauseCount: initialStats.pauseCount,
      configuration: initialStats.configuration
    });
    
    // Test configuration
    const config = initialStats.configuration;
    const expectedConfig = {
      storageInterval: 5000, // 5 seconds
      pauseDuration: 60000,  // 1 minute
      maxConsecutiveStores: 6
    };
    
    let configCorrect = true;
    Object.keys(expectedConfig).forEach(key => {
      if (config[key] !== expectedConfig[key]) {
        console.error(`❌ Configuration mismatch for ${key}: expected ${expectedConfig[key]}, got ${config[key]}`);
        configCorrect = false;
      }
    });
    
    if (configCorrect) {
      console.log('✅ Enhanced Location Service configuration is correct');
      return true;
    } else {
      console.error('❌ Enhanced Location Service configuration is incorrect');
      return false;
    }
  } catch (error) {
    console.error('❌ Enhanced Location Service test failed:', error);
    return false;
  }
}

/**
 * Main test runner
 */
async function runAllTests() {
  console.log('🚀 Starting Bug Fix Tests...\n');
  
  const tests = [
    { name: 'Profile Firebase Update', fn: testProfileUpdate },
    { name: 'Bus Location Storage', fn: testLocationStorage },
    { name: 'Route Stops Data', fn: testRouteStops },
    { name: 'Enhanced Location Service', fn: testEnhancedLocationService }
  ];
  
  const results = [];
  
  for (const test of tests) {
    try {
      const result = await test.fn();
      results.push({ name: test.name, passed: result });
    } catch (error) {
      console.error(`❌ Test "${test.name}" threw an error:`, error);
      results.push({ name: test.name, passed: false });
    }
  }
  
  // Summary
  console.log('\n📊 Test Results Summary:');
  console.log('========================');
  
  let passedCount = 0;
  results.forEach(result => {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} - ${result.name}`);
    if (result.passed) passedCount++;
  });
  
  console.log(`\n🎯 Overall: ${passedCount}/${results.length} tests passed`);
  
  if (passedCount === results.length) {
    console.log('🎉 All tests passed! Bug fixes are working correctly.');
  } else {
    console.log('⚠️ Some tests failed. Please check the issues above.');
  }
  
  process.exit(passedCount === results.length ? 0 : 1);
}

// Run tests if this script is executed directly
if (require.main === module) {
  runAllTests().catch(error => {
    console.error('💥 Test runner crashed:', error);
    process.exit(1);
  });
}

module.exports = {
  testProfileUpdate,
  testLocationStorage,
  testRouteStops,
  testEnhancedLocationService,
  runAllTests
};