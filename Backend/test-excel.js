/**
 * Test script for Excel Service
 * Run this to test Excel logging functionality
 */

const excelService = require('./services/excelService');

async function testExcelService() {
  console.log('🧪 Testing Excel Service...\n');
  
  try {
    // Test 1: Log daily distance data
    console.log('📊 Test 1: Logging daily distance data...');
    await excelService.logDailyDistance({
      routeNumber: 'Route-1',
      dailyDistance: 45.67,
      totalDistance: 1250.89,
      latitude: 22.5726,
      longitude: 88.3639,
      speed: 35.5,
      status: 'Active',
      remarks: 'Test data entry'
    });
    
    // Test 2: Log stop arrival
    console.log('🚏 Test 2: Logging stop arrival...');
    await excelService.logStopArrival({
      stopId: 'STOP001',
      stopName: 'JIS College Main Gate',
      routeNumber: 'Route-1',
      arrivalTime: '14:30:15',
      latitude: 22.5726,
      longitude: 88.3639,
      distanceFromStop: 12.5,
      status: 'Reached',
      remarks: 'Bus arrived on time'
    });
    
    // Test 3: Get daily summary
    console.log('📋 Test 3: Getting daily summary...');
    const summary = await excelService.getDailySummary();
    console.log('Daily Summary:', summary);
    
    // Test 4: Get stop arrivals
    console.log('🚌 Test 4: Getting stop arrivals...');
    const arrivals = await excelService.getStopArrivals();
    console.log('Stop Arrivals:', arrivals);
    
    // Test 5: Get file paths
    console.log('📁 Test 5: Getting file paths...');
    const paths = excelService.getExcelFilePaths();
    console.log('File Paths:', paths);
    
    console.log('\n✅ All tests completed successfully!');
    console.log('📁 Check the excel-reports directory for generated files');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testExcelService();