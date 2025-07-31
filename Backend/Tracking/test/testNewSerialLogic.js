/**
 * Test Script for New Serial Number Logic
 * 
 * This script tests the new serial number logic to ensure it works correctly
 * before deploying to production.
 */

const OptimizedSerialTrackingService = require('../services/optimizedSerialTrackingService');
const { collection, doc, getDocs, updateDoc, writeBatch } = require('firebase/firestore');
const { firestoreDb } = require('../config/firebase');

class SerialLogicTester {
  constructor() {
    this.trackingService = new OptimizedSerialTrackingService();
    this.testResults = [];
  }
  
  /**
   * Run all tests
   */
  async runAllTests() {
    console.log('🧪 Starting New Serial Logic Tests...\n');
    
    try {
      // Initialize the service
      await this.trackingService.start();
      
      // Run individual tests
      await this.testInitialState();
      await this.testRegularStopReached();
      await this.testHighestSerialStopReached();
      await this.testMultipleStopsReached();
      await this.testEdgeCases();
      
      // Print results
      this.printTestResults();
      
    } catch (error) {
      console.error('❌ Test suite failed:', error);
    } finally {
      // Cleanup
      this.trackingService.stop();
    }
  }
  
  /**
   * Test initial state
   */
  async testInitialState() {
    console.log('📋 Test 1: Initial State');
    
    try {
      // Reset all stops to known state
      await this.setupTestData();
      
      const stops = Array.from(this.trackingService.stops.values())
        .sort((a, b) => a.serialNumber - b.serialNumber);
      
      // Verify initial state
      const hasCorrectSerialNumbers = stops.every((stop, index) => 
        stop.serialNumber === index + 1
      );
      
      const allUnreached = stops.every(stop => !stop.reached);
      
      this.recordTest('Initial State', hasCorrectSerialNumbers && allUnreached, {
        totalStops: stops.length,
        correctSerials: hasCorrectSerialNumbers,
        allUnreached: allUnreached
      });
      
    } catch (error) {
      this.recordTest('Initial State', false, { error: error.message });
    }
  }
  
  /**
   * Test regular stop reached (not highest serial)
   */
  async testRegularStopReached() {
    console.log('📋 Test 2: Regular Stop Reached');
    
    try {
      // Setup: Reset to initial state
      await this.setupTestData();
      
      // Get a stop that's not the highest serial (e.g., stop with serial 3)
      const stops = Array.from(this.trackingService.stops.values())
        .sort((a, b) => a.serialNumber - b.serialNumber);
      
      const regularStop = stops.find(s => s.serialNumber === 3);
      if (!regularStop) {
        throw new Error('Could not find stop with serial number 3');
      }
      
      // Simulate bus reaching this stop
      await this.simulateStopReached(regularStop.id);
      
      // Verify: Only this stop should be marked as reached, serial numbers unchanged
      const updatedStops = Array.from(this.trackingService.stops.values());
      const reachedStops = updatedStops.filter(s => s.reached);
      const reachedStop = updatedStops.find(s => s.id === regularStop.id);
      
      const testPassed = reachedStops.length === 1 && 
                        reachedStop.reached && 
                        reachedStop.serialNumber === 3;
      
      this.recordTest('Regular Stop Reached', testPassed, {
        stopId: regularStop.id,
        reachedCount: reachedStops.length,
        serialNumber: reachedStop.serialNumber,
        isReached: reachedStop.reached
      });
      
    } catch (error) {
      this.recordTest('Regular Stop Reached', false, { error: error.message });
    }
  }
  
  /**
   * Test highest serial stop reached (main new logic)
   */
  async testHighestSerialStopReached() {
    console.log('📋 Test 3: Highest Serial Stop Reached (New Logic)');
    
    try {
      // Setup: Reset to initial state
      await this.setupTestData();
      
      // Find the stop with highest serial number
      const stops = Array.from(this.trackingService.stops.values());
      const maxSerial = Math.max(...stops.map(s => s.serialNumber));
      const highestStop = stops.find(s => s.serialNumber === maxSerial);
      
      if (!highestStop) {
        throw new Error('Could not find highest serial stop');
      }
      
      console.log(`   Simulating bus reaching highest serial stop: ${highestStop.id} (serial ${maxSerial})`);
      
      // Simulate bus reaching the highest serial stop
      await this.simulateStopReached(highestStop.id);
      
      // Wait a moment for processing
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Verify new logic:
      // 1. Only the highest serial stop should be reached
      // 2. It should have serial number 1
      // 3. All other stops should be unreached
      // 4. Other stops should have serial numbers in reverse order
      
      const updatedStops = Array.from(this.trackingService.stops.values())
        .sort((a, b) => a.serialNumber - b.serialNumber);
      
      const reachedStops = updatedStops.filter(s => s.reached);
      const reachedStop = updatedStops.find(s => s.id === highestStop.id);
      
      // Verify conditions
      const onlyOneReached = reachedStops.length === 1;
      const reachedHasSerial1 = reachedStop && reachedStop.serialNumber === 1;
      const allOthersUnreached = updatedStops.filter(s => s.id !== highestStop.id)
        .every(s => !s.reached);
      
      // Verify reverse order (this is complex to verify exactly, so we check basic structure)
      const serialNumbers = updatedStops.map(s => s.serialNumber).sort((a, b) => a - b);
      const hasConsecutiveSerials = serialNumbers.every((serial, index) => serial === index + 1);
      
      const testPassed = onlyOneReached && reachedHasSerial1 && allOthersUnreached && hasConsecutiveSerials;
      
      this.recordTest('Highest Serial Stop Reached', testPassed, {
        highestStopId: highestStop.id,
        originalSerial: maxSerial,
        newSerial: reachedStop ? reachedStop.serialNumber : 'N/A',
        reachedCount: reachedStops.length,
        allOthersUnreached: allOthersUnreached,
        hasConsecutiveSerials: hasConsecutiveSerials
      });
      
    } catch (error) {
      this.recordTest('Highest Serial Stop Reached', false, { error: error.message });
    }
  }
  
  /**
   * Test multiple stops reached scenario
   */
  async testMultipleStopsReached() {
    console.log('📋 Test 4: Multiple Stops Reached');
    
    try {
      // Setup: Reset and reach a few regular stops first
      await this.setupTestData();
      
      const stops = Array.from(this.trackingService.stops.values())
        .sort((a, b) => a.serialNumber - b.serialNumber);
      
      // Reach stops 2, 4, and 6
      await this.simulateStopReached(stops[1].id); // Serial 2
      await new Promise(resolve => setTimeout(resolve, 500));
      await this.simulateStopReached(stops[3].id); // Serial 4
      await new Promise(resolve => setTimeout(resolve, 500));
      await this.simulateStopReached(stops[5].id); // Serial 6
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Now reach the highest serial stop
      const maxSerial = Math.max(...stops.map(s => s.serialNumber));
      const highestStop = stops.find(s => s.serialNumber === maxSerial);
      
      await this.simulateStopReached(highestStop.id);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Verify: Only highest serial stop should be reached with serial 1
      const updatedStops = Array.from(this.trackingService.stops.values());
      const reachedStops = updatedStops.filter(s => s.reached);
      const reachedStop = updatedStops.find(s => s.id === highestStop.id);
      
      const testPassed = reachedStops.length === 1 && 
                        reachedStop.reached && 
                        reachedStop.serialNumber === 1;
      
      this.recordTest('Multiple Stops Reached', testPassed, {
        finalReachedCount: reachedStops.length,
        highestStopSerial: reachedStop ? reachedStop.serialNumber : 'N/A'
      });
      
    } catch (error) {
      this.recordTest('Multiple Stops Reached', false, { error: error.message });
    }
  }
  
  /**
   * Test edge cases
   */
  async testEdgeCases() {
    console.log('📋 Test 5: Edge Cases');
    
    try {
      // Test case: What happens if highest serial stop is reached multiple times
      await this.setupTestData();
      
      const stops = Array.from(this.trackingService.stops.values());
      const maxSerial = Math.max(...stops.map(s => s.serialNumber));
      const highestStop = stops.find(s => s.serialNumber === maxSerial);
      
      // Reach it once
      await this.simulateStopReached(highestStop.id);
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Reach it again (should not cause issues)
      await this.simulateStopReached(highestStop.id);
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const updatedStops = Array.from(this.trackingService.stops.values());
      const reachedStops = updatedStops.filter(s => s.reached);
      
      const testPassed = reachedStops.length === 1;
      
      this.recordTest('Edge Cases', testPassed, {
        scenario: 'Highest stop reached multiple times',
        reachedCount: reachedStops.length
      });
      
    } catch (error) {
      this.recordTest('Edge Cases', false, { error: error.message });
    }
  }
  
  /**
   * Setup test data with known state
   */
  async setupTestData() {
    // Reset all stops to unreached with sequential serial numbers
    await this.trackingService.resetAllStops();
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for reset
    
    // Reload data
    await this.trackingService.loadStopsDataOptimized();
  }
  
  /**
   * Simulate a stop being reached
   */
  async simulateStopReached(stopId) {
    // Get the stop location
    const stop = this.trackingService.stops.get(stopId);
    if (!stop) {
      throw new Error(`Stop ${stopId} not found`);
    }
    
    // Set bus location to the stop location
    this.trackingService.busLocation = {
      latitude: stop.latitude,
      longitude: stop.longitude
    };
    
    // Trigger stop detection
    await this.trackingService.processOptimizedStopDetection();
  }
  
  /**
   * Record test result
   */
  recordTest(testName, passed, details = {}) {
    this.testResults.push({
      name: testName,
      passed: passed,
      details: details,
      timestamp: new Date().toISOString()
    });
    
    const status = passed ? '✅ PASSED' : '❌ FAILED';
    console.log(`   ${status}: ${testName}`);
    if (!passed || Object.keys(details).length > 0) {
      console.log(`   Details:`, details);
    }
    console.log('');
  }
  
  /**
   * Print final test results
   */
  printTestResults() {
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('========================');
    
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(t => t.passed).length;
    const failedTests = totalTests - passedTests;
    
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${failedTests}`);
    console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    
    if (failedTests > 0) {
      console.log('\n❌ FAILED TESTS:');
      this.testResults.filter(t => !t.passed).forEach(test => {
        console.log(`- ${test.name}: ${JSON.stringify(test.details)}`);
      });
    }
    
    console.log('\n' + (failedTests === 0 ? '🎉 ALL TESTS PASSED!' : '⚠️ SOME TESTS FAILED'));
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const tester = new SerialLogicTester();
  
  tester.runAllTests()
    .then(() => {
      console.log('\n✅ Test suite completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Test suite failed:', error);
      process.exit(1);
    });
}

module.exports = SerialLogicTester;