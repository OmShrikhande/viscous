/**
 * This script tests the Firebase connection to ensure credentials are working correctly.
 */

require('dotenv').config();
const { initializeFirebaseAdmin, admin } = require('../firebase-service-account');

// Initialize Firebase Admin
const firebaseAdmin = initializeFirebaseAdmin();
const db = firebaseAdmin.firestore();

async function testFirebaseConnection() {
  try {
    console.log('Testing Firebase connection...');
    
    // Try to write a test document
    const testRef = db.collection('test').doc('connection-test');
    await testRef.set({
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      message: 'Connection test successful'
    });
    
    console.log('Successfully wrote to Firestore!');
    
    // Try to read the document back
    const doc = await testRef.get();
    if (doc.exists) {
      console.log('Successfully read from Firestore!');
      console.log('Document data:', doc.data());
    } else {
      console.log('No such document!');
    }
    
    // Delete the test document
    await testRef.delete();
    console.log('Successfully deleted test document!');
    
    console.log('Firebase connection test completed successfully!');
  } catch (error) {
    console.error('Error testing Firebase connection:', error);
  } finally {
    process.exit(0);
  }
}

// Run the test
testFirebaseConnection();