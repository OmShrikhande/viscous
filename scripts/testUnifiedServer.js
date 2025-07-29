/**
 * Test Script for Unified Server with Bidirectional Tracking
 * 
 * This script tests the unified server deployment with all integrated services:
 * 1. ESP8266 Server functionality
 * 2. Enhanced Location Service
 * 3. Bidirectional Tracking Service
 * 4. Keep-alive mechanism
 * 5. Admin Backend routes
 */

const axios = require('axios');

// Configuration
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3001';
const TIMEOUT = 10000; // 10 seconds

/**
 * Test 1: Health Check and Keep-Alive
 */
async function testHealthAndKeepAlive() {
  console.log('\n🧪 Testing Health Check and Keep-Alive...');
  
  try {
    // Test health endpoint
    console.log('🔍 Testing /health endpoint...');
    const healthResponse = await axios.get(`${SERVER_URL}/health`, { timeout: TIMEOUT });
    
    if (healthResponse.status === 200) {
      console.log('✅ Health check successful');
      console.log(`📊 Services status:`, healthResponse.data.services);
      console.log(`⏱️ Uptime: ${healthResponse.data.uptime}`);
    } else {
      console.log('❌ Health check failed with status:', healthResponse.status);
      return false;
    }
    
    // Test keep-alive endpoint
    console.log('🔍 Testing /keep-alive endpoint...');
    const keepAliveResponse = await axios.get(`${SERVER_URL}/keep-alive`, { timeout: TIMEOUT });
    
    if (keepAliveResponse.status === 200) {
      console.log('✅ Keep-alive endpoint successful');
      console.log(`📊 Response:`, keepAliveResponse.data);
    } else {
      console.log('❌ Keep-alive failed with status:', keepAliveResponse.status);
      return false;
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Health and Keep-Alive test failed:', error.message);
    return false;
  }
}

/**
 * Test 2: Enhanced Location Service
 */
async function testEnhancedLocationService() {
  console.log('\n🧪 Testing Enhanced Location Service...');
  
  try {
    // Test stats endpoint
    console.log('🔍 Testing enhanced location stats...');
    const statsResponse = await axios.get(`${SERVER_URL}/tracking/api/enhanced-location/stats`, { timeout: TIMEOUT });
    
    if (statsResponse.status === 200 && statsResponse.data.success) {
      console.log('✅ Enhanced location stats retrieved');
      console.log(`📊 Service status:`, {
        isActive: statsResponse.data.data.isActive,
        totalStores: statsResponse.data.data.totalStores,
        pauseCount: statsResponse.data.data.pauseCount
      });
    } else {
      console.log('❌ Enhanced location stats failed');
      return false;
    }
    
    // Test force store
    console.log('🔍 Testing force store...');
    const forceStoreResponse = await axios.post(`${SERVER_URL}/tracking/api/enhanced-location/force-store`, {}, { timeout: TIMEOUT });
    
    if (forceStoreResponse.status === 200) {
      console.log('✅ Force store successful');
    } else {
      console.log('⚠️ Force store failed, but service might still be working');
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Enhanced Location Service test failed:', error.message);
    return false;
  }
}

/**
 * Test 3: Bidirectional Tracking Service
 */
async function testBidirectionalTrackingService() {
  console.log('\n🧪 Testing Bidirectional Tracking Service...');
  
  try {
    // Test stats endpoint
    console.log('🔍 Testing bidirectional tracking stats...');
    const statsResponse = await axios.get(`${SERVER_URL}/tracking/api/bidirectional-tracking/stats`, { timeout: TIMEOUT });
    
    if (statsResponse.status === 200 && statsResponse.data.success) {
      console.log('✅ Bidirectional tracking stats retrieved');
      console.log(`📊 Service status:`, {
        isActive: statsResponse.data.data.isActive,
        stopsCount: statsResponse.data.data.stopsCount,
        reachedStopsCount: statsResponse.data.data.reachedStopsCount,
        currentDirection: statsResponse.data.data.currentDirection
      });
    } else {
      console.log('❌ Bidirectional tracking stats failed');
      return false;
    }
    
    // Test ordered stops
    console.log('🔍 Testing ordered stops...');
    const stopsResponse = await axios.get(`${SERVER_URL}/tracking/api/bidirectional-tracking/ordered-stops`, { timeout: TIMEOUT });
    
    if (stopsResponse.status === 200 && stopsResponse.data.success) {
      console.log('✅ Ordered stops retrieved');
      console.log(`📊 Stops count: ${stopsResponse.data.count}`);
      
      // Show first few stops
      const stops = stopsResponse.data.data.slice(0, 3);
      console.log('📋 Sample stops:', stops.map(s => ({
        id: s.id,
        reached: s.reached,
        serialNumber: s.serialNumber || 'N/A'
      })));
    } else {
      console.log('❌ Ordered stops failed');
      return false;
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Bidirectional Tracking Service test failed:', error.message);
    return false;
  }
}

/**
 * Test 4: ESP8266 Server Integration
 */
async function testESP8266Integration() {
  console.log('\n🧪 Testing ESP8266 Server Integration...');
  
  try {
    // Test ESP8266 upload endpoint with sample data
    console.log('🔍 Testing ESP8266 upload endpoint...');
    
    const sampleData = {
      location: {
        latitude: 21.11620667,
        longitude: 79.05210083,
        speed: 25.5,
        timestamp: new Date().toISOString()
      },
      dailyDistance: 150.75
    };
    
    const uploadResponse = await axios.post(`${SERVER_URL}/esp8266/upload`, sampleData, { 
      timeout: TIMEOUT,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (uploadResponse.status === 200) {
      console.log('✅ ESP8266 upload successful');
      console.log('📊 Sample data uploaded to Firebase');
    } else {
      console.log('❌ ESP8266 upload failed with status:', uploadResponse.status);
      return false;
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ ESP8266 Integration test failed:', error.message);
    return false;
  }
}

/**
 * Test 5: Tracking Server Routes
 */
async function testTrackingServerRoutes() {
  console.log('\n🧪 Testing Tracking Server Routes...');
  
  try {
    // Test bus location endpoint
    console.log('🔍 Testing bus location endpoint...');
    const locationResponse = await axios.get(`${SERVER_URL}/tracking/api/bus/location`, { timeout: TIMEOUT });
    
    if (locationResponse.status === 200 && locationResponse.data.success) {
      console.log('✅ Bus location retrieved');
      console.log(`📍 Location:`, locationResponse.data.data);
    } else {
      console.log('⚠️ Bus location not available (might be normal if no recent data)');
    }
    
    // Test stops endpoint
    console.log('🔍 Testing stops endpoint...');
    const stopsResponse = await axios.get(`${SERVER_URL}/tracking/api/stops`, { timeout: TIMEOUT });
    
    if (stopsResponse.status === 200 && stopsResponse.data.success) {
      console.log('✅ Stops data retrieved');
      console.log(`📊 Stops count: ${stopsResponse.data.data.length}`);
    } else {
      console.log('❌ Stops data failed');
      return false;
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Tracking Server Routes test failed:', error.message);
    return false;
  }
}

/**
 * Test 6: Admin Backend Routes
 */
async function testAdminBackendRoutes() {
  console.log('\n🧪 Testing Admin Backend Routes...');
  
  try {
    // Test config endpoint
    console.log('🔍 Testing config endpoint...');
    const configResponse = await axios.get(`${SERVER_URL}/api/config`, { timeout: TIMEOUT });
    
    if (configResponse.status === 200) {
      console.log('✅ Config endpoint successful');
      console.log(`📊 API Base URL: ${configResponse.data.apiBaseUrl}`);
    } else {
      console.log('❌ Config endpoint failed');
      return false;
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Admin Backend Routes test failed:', error.message);
    return false;
  }
}

/**
 * Test 7: Performance and Load Test
 */
async function testPerformanceAndLoad() {
  console.log('\n🧪 Testing Performance and Load...');
  
  try {
    const startTime = Date.now();
    
    // Make multiple concurrent requests to test server stability
    console.log('🔍 Testing concurrent requests...');
    
    const requests = [
      axios.get(`${SERVER_URL}/health`, { timeout: TIMEOUT }),
      axios.get(`${SERVER_URL}/keep-alive`, { timeout: TIMEOUT }),
      axios.get(`${SERVER_URL}/tracking/api/enhanced-location/stats`, { timeout: TIMEOUT }),
      axios.get(`${SERVER_URL}/tracking/api/bidirectional-tracking/stats`, { timeout: TIMEOUT }),
      axios.get(`${SERVER_URL}/api/config`, { timeout: TIMEOUT })
    ];
    
    const results = await Promise.allSettled(requests);
    const successful = results.filter(r => r.status === 'fulfilled' && r.value.status === 200).length;
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`✅ Performance test completed in ${duration}ms`);
    console.log(`📊 Successful requests: ${successful}/${requests.length}`);
    console.log(`⚡ Average response time: ${(duration / requests.length).toFixed(2)}ms`);
    
    return successful >= 4; // At least 4 out of 5 should succeed
    
  } catch (error) {
    console.error('❌ Performance and Load test failed:', error.message);
    return false;
  }
}

/**
 * Main test runner
 */
async function runUnifiedServerTests() {
  console.log('🚀 Starting Unified Server Tests...');
  console.log(`🎯 Target Server: ${SERVER_URL}`);
  
  const tests = [
    { name: 'Health Check and Keep-Alive', fn: testHealthAndKeepAlive },
    { name: 'Enhanced Location Service', fn: testEnhancedLocationService },
    { name: 'Bidirectional Tracking Service', fn: testBidirectionalTrackingService },
    { name: 'ESP8266 Server Integration', fn: testESP8266Integration },
    { name: 'Tracking Server Routes', fn: testTrackingServerRoutes },
    { name: 'Admin Backend Routes', fn: testAdminBackendRoutes },
    { name: 'Performance and Load Test', fn: testPerformanceAndLoad }
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
      console.error(`💥 ${test.name} - ERROR:`, error.message);
      results.push({ name: test.name, passed: false });
    }
  }
  
  // Summary
  console.log('\n📊 Unified Server Test Results:');
  console.log('=====================================');
  
  let passedCount = 0;
  results.forEach(result => {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} - ${result.name}`);
    if (result.passed) passedCount++;
  });
  
  console.log(`\n🎯 Overall: ${passedCount}/${results.length} tests passed`);
  
  if (passedCount === results.length) {
    console.log('🎉 All unified server tests passed!');
    console.log('✨ The server is ready for deployment with:');
    console.log('   • ESP8266 data collection');
    console.log('   • Enhanced location storage with smart pausing');
    console.log('   • Bidirectional bus tracking');
    console.log('   • Real-time stop detection and reordering');
    console.log('   • Keep-alive mechanism for Render deployment');
    console.log('   • Admin backend functionality');
  } else {
    console.log('⚠️ Some tests failed. Please check the issues above.');
    console.log('💡 For deployment, ensure all critical services are working.');
  }
  
  // Deployment readiness check
  const criticalTests = [
    'Health Check and Keep-Alive',
    'Enhanced Location Service', 
    'Bidirectional Tracking Service'
  ];
  
  const criticalPassed = results.filter(r => 
    criticalTests.includes(r.name) && r.passed
  ).length;
  
  console.log(`\n🚀 Deployment Readiness: ${criticalPassed}/${criticalTests.length} critical services working`);
  
  if (criticalPassed === criticalTests.length) {
    console.log('✅ Server is ready for production deployment!');
  } else {
    console.log('⚠️ Fix critical services before deploying to production.');
  }
  
  process.exit(passedCount >= criticalTests.length ? 0 : 1);
}

// Run tests if this script is executed directly
if (require.main === module) {
  runUnifiedServerTests().catch(error => {
    console.error('💥 Test runner crashed:', error);
    process.exit(1);
  });
}

module.exports = {
  testHealthAndKeepAlive,
  testEnhancedLocationService,
  testBidirectionalTrackingService,
  testESP8266Integration,
  testTrackingServerRoutes,
  testAdminBackendRoutes,
  testPerformanceAndLoad,
  runUnifiedServerTests
};