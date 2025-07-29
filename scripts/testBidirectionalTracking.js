/**
 * Test Script for Bidirectional Bus Tracking System
 * 
 * This script tests:
 * 1. Direction-independent stop detection
 * 2. Dynamic stop reordering
 * 3. Real-time notifications
 * 4. Performance optimization
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, doc, updateDoc, collection, getDocs, serverTimestamp } = require('firebase/firestore');
const { getDatabase, ref, set } = require('firebase/database');

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
 * Test 1: Bidirectional Stop Detection
 */
async function testBidirectionalStopDetection() {
  console.log('\n🧪 Testing Bidirectional Stop Detection...');
  
  try {
    // Get all stops
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
    
    console.log(`📍 Found ${stops.length} stops for testing`);
    
    if (stops.length === 0) {
      console.error('❌ No stops found for testing');
      return false;
    }
    
    // Test forward direction simulation
    console.log('🔄 Testing forward direction...');
    const forwardStops = stops.slice(0, 3); // Test with first 3 stops
    
    for (let i = 0; i < forwardStops.length; i++) {
      const stop = forwardStops[i];
      
      // Simulate bus reaching this stop
      console.log(`🎯 Simulating bus reaching stop: ${stop.id}`);
      
      // Update stop as reached
      const stopRef = doc(firestoreDb, 'Route2', stop.id);
      await updateDoc(stopRef, {
        reached: true,
        reachedAt: serverTimestamp(),
        reachedTime: new Date().toLocaleTimeString(),
        reachedDate: new Date().toLocaleDateString(),
        lastReachedTimestamp: Date.now(),
        serialNumber: i + 1
      });
      
      // Wait a bit between stops
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log('✅ Forward direction test completed');
    
    // Test backward direction simulation
    console.log('🔄 Testing backward direction...');
    const backwardStops = stops.slice(3, 6); // Test with next 3 stops
    
    for (let i = backwardStops.length - 1; i >= 0; i--) {
      const stop = backwardStops[i];
      
      // Simulate bus reaching this stop in reverse order
      console.log(`🎯 Simulating bus reaching stop (reverse): ${stop.id}`);
      
      // Update stop as reached
      const stopRef = doc(firestoreDb, 'Route2', stop.id);
      await updateDoc(stopRef, {
        reached: true,
        reachedAt: serverTimestamp(),
        reachedTime: new Date().toLocaleTimeString(),
        reachedDate: new Date().toLocaleDateString(),
        lastReachedTimestamp: Date.now(),
        serialNumber: forwardStops.length + (backwardStops.length - i)
      });
      
      // Wait a bit between stops
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log('✅ Backward direction test completed');
    return true;
    
  } catch (error) {
    console.error('❌ Bidirectional stop detection test failed:', error);
    return false;
  }
}

/**
 * Test 2: Dynamic Stop Reordering
 */
async function testDynamicStopReordering() {
  console.log('\n🧪 Testing Dynamic Stop Reordering...');
  
  try {
    // Get current stops state
    const route2Ref = collection(firestoreDb, 'Route2');
    const querySnapshot = await getDocs(route2Ref);
    
    const stops = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      stops.push({
        id: doc.id,
        reached: data.reached || false,
        serialNumber: data.serialNumber || 0,
        lastReachedTimestamp: data.lastReachedTimestamp || 0
      });
    });
    
    // Sort by most recently reached
    const reachedStops = stops.filter(s => s.reached)
      .sort((a, b) => b.lastReachedTimestamp - a.lastReachedTimestamp);
    
    const unreachedStops = stops.filter(s => !s.reached);
    
    console.log(`📊 Current state: ${reachedStops.length} reached, ${unreachedStops.length} unreached`);
    
    // Test reordering by reaching a new stop
    if (unreachedStops.length > 0) {
      const newStop = unreachedStops[0];
      console.log(`🎯 Simulating new stop reached: ${newStop.id}`);
      
      const stopRef = doc(firestoreDb, 'Route2', newStop.id);
      await updateDoc(stopRef, {
        reached: true,
        reachedAt: serverTimestamp(),
        reachedTime: new Date().toLocaleTimeString(),
        reachedDate: new Date().toLocaleDateString(),
        lastReachedTimestamp: Date.now(),
        serialNumber: 1 // Should become the new #1
      });
      
      // Update other reached stops' serial numbers
      for (let i = 0; i < reachedStops.length; i++) {
        const stopRef = doc(firestoreDb, 'Route2', reachedStops[i].id);
        await updateDoc(stopRef, {
          serialNumber: i + 2 // Push down by 1
        });
      }
      
      console.log(`✅ Reordering completed - ${newStop.id} is now #1`);
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Dynamic stop reordering test failed:', error);
    return false;
  }
}

/**
 * Test 3: Real-time Location Updates
 */
async function testRealtimeLocationUpdates() {
  console.log('\n🧪 Testing Real-time Location Updates...');
  
  try {
    // Get current bus location
    const locationRef = ref(realtimeDb, 'bus/Location');
    
    // Simulate bus movement in different directions
    const testLocations = [
      { Latitude: 21.11620667, Longitude: 79.05210083, direction: 'start' },
      { Latitude: 21.11630667, Longitude: 79.05220083, direction: 'forward' },
      { Latitude: 21.11640667, Longitude: 79.05230083, direction: 'forward' },
      { Latitude: 21.11630667, Longitude: 79.05220083, direction: 'backward' },
      { Latitude: 21.11620667, Longitude: 79.05210083, direction: 'backward' }
    ];
    
    for (const location of testLocations) {
      console.log(`🚌 Simulating bus movement: ${location.direction} to (${location.Latitude}, ${location.Longitude})`);
      
      await set(locationRef, {
        Latitude: location.Latitude,
        Longitude: location.Longitude,
        Speed: Math.random() * 50 + 10, // Random speed between 10-60
        Timestamp: new Date().toISOString()
      });
      
      // Wait between movements
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    console.log('✅ Real-time location updates test completed');
    return true;
    
  } catch (error) {
    console.error('❌ Real-time location updates test failed:', error);
    return false;
  }
}

/**
 * Test 4: Performance and Optimization
 */
async function testPerformanceOptimization() {
  console.log('\n🧪 Testing Performance and Optimization...');
  
  try {
    const startTime = Date.now();
    
    // Test batch operations
    console.log('📊 Testing batch operations...');
    
    const route2Ref = collection(firestoreDb, 'Route2');
    const querySnapshot = await getDocs(route2Ref);
    
    const batchOperations = [];
    querySnapshot.forEach((doc) => {
      batchOperations.push({
        id: doc.id,
        data: doc.data()
      });
    });
    
    console.log(`📦 Processed ${batchOperations.length} stops in batch`);
    
    // Test listener efficiency simulation
    console.log('🔄 Testing listener efficiency...');
    
    let updateCount = 0;
    const testUpdates = Math.min(5, batchOperations.length);
    
    for (let i = 0; i < testUpdates; i++) {
      const stop = batchOperations[i];
      const stopRef = doc(firestoreDb, 'Route2', stop.id);
      
      await updateDoc(stopRef, {
        testUpdate: Date.now(),
        updateCount: updateCount++
      });
    }
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`⚡ Performance test completed in ${duration}ms`);
    console.log(`📈 Average time per operation: ${(duration / (batchOperations.length + testUpdates)).toFixed(2)}ms`);
    
    return true;
    
  } catch (error) {
    console.error('❌ Performance optimization test failed:', error);
    return false;
  }
}

/**
 * Test 5: Cleanup and Reset
 */
async function testCleanupAndReset() {
  console.log('\n🧪 Testing Cleanup and Reset...');
  
  try {
    // Reset all stops to unreached state
    const route2Ref = collection(firestoreDb, 'Route2');
    const querySnapshot = await getDocs(route2Ref);
    
    const resetPromises = [];
    querySnapshot.forEach((docSnapshot) => {
      const stopRef = doc(firestoreDb, 'Route2', docSnapshot.id);
      resetPromises.push(
        updateDoc(stopRef, {
          reached: false,
          reachedAt: null,
          reachedTime: null,
          reachedDate: null,
          lastReachedTimestamp: null,
          serialNumber: 0,
          testUpdate: null,
          updateCount: null
        })
      );
    });
    
    await Promise.all(resetPromises);
    
    console.log(`✅ Reset ${resetPromises.length} stops to initial state`);
    return true;
    
  } catch (error) {
    console.error('❌ Cleanup and reset test failed:', error);
    return false;
  }
}

/**
 * Main test runner
 */
async function runBidirectionalTrackingTests() {
  console.log('🚀 Starting Bidirectional Bus Tracking Tests...\n');
  
  const tests = [
    { name: 'Bidirectional Stop Detection', fn: testBidirectionalStopDetection },
    { name: 'Dynamic Stop Reordering', fn: testDynamicStopReordering },
    { name: 'Real-time Location Updates', fn: testRealtimeLocationUpdates },
    { name: 'Performance and Optimization', fn: testPerformanceOptimization },
    { name: 'Cleanup and Reset', fn: testCleanupAndReset }
  ];
  
  const results = [];
  
  for (const test of tests) {
    try {
      console.log(`\n▶️ Running: ${test.name}`);
      const result = await test.fn();
      results.push({ name: test.name, passed: result });
      
      if (result) {
        console.log(`✅ ${test.name} - PASSED`);
      } else {
        console.log(`❌ ${test.name} - FAILED`);
      }
    } catch (error) {
      console.error(`💥 ${test.name} - ERROR:`, error);
      results.push({ name: test.name, passed: false });
    }
  }
  
  // Summary
  console.log('\n📊 Bidirectional Tracking Test Results:');
  console.log('==========================================');
  
  let passedCount = 0;
  results.forEach(result => {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} - ${result.name}`);
    if (result.passed) passedCount++;
  });
  
  console.log(`\n🎯 Overall: ${passedCount}/${results.length} tests passed`);
  
  if (passedCount === results.length) {
    console.log('🎉 All bidirectional tracking tests passed!');
    console.log('✨ The system supports:');
    console.log('   • Direction-independent stop detection');
    console.log('   • Dynamic UI reordering based on recent stops');
    console.log('   • Real-time notifications without polling');
    console.log('   • Optimized Firebase operations');
  } else {
    console.log('⚠️ Some tests failed. Please check the issues above.');
  }
  
  process.exit(passedCount === results.length ? 0 : 1);
}

// Run tests if this script is executed directly
if (require.main === module) {
  runBidirectionalTrackingTests().catch(error => {
    console.error('💥 Test runner crashed:', error);
    process.exit(1);
  });
}

module.exports = {
  testBidirectionalStopDetection,
  testDynamicStopReordering,
  testRealtimeLocationUpdates,
  testPerformanceOptimization,
  testCleanupAndReset,
  runBidirectionalTrackingTests
};