import { collection, getDocs } from 'firebase/firestore';
import { ref, get } from 'firebase/database';
import { firestoreDb, realtimeDatabase } from '../configs/FirebaseConfigs';

/**
 * Debug Firebase connections and data structure
 */
export const debugFirebaseConnection = async () => {
  console.log('🔍 Starting Firebase Debug Check...');
  
  // Test Firestore connection
  try {
    console.log('📊 Testing Firestore connection...');
    const testRef = collection(firestoreDb, 'test');
    await getDocs(testRef);
    console.log('✅ Firestore connection successful');
  } catch (error) {
    console.error('❌ Firestore connection failed:', error);
  }
  
  // Test Realtime Database connection
  try {
    console.log('🔥 Testing Realtime Database connection...');
    const testRef = ref(realtimeDatabase, 'bus');
    const snapshot = await get(testRef);
    console.log('✅ Realtime Database connection successful');
    console.log('📍 Current bus data:', snapshot.val());
  } catch (error) {
    console.error('❌ Realtime Database connection failed:', error);
  }
};

/**
 * Debug route data structure
 */
export const debugRouteData = async (routeNumber) => {
  console.log(`🔍 Debugging Route${routeNumber} data...`);
  
  try {
    const routeRef = collection(firestoreDb, `Route${routeNumber}`);
    const snapshot = await getDocs(routeRef);
    
    console.log(`📊 Route${routeNumber} has ${snapshot.size} documents`);
    
    if (snapshot.empty) {
      console.warn(`⚠️ Route${routeNumber} collection is empty`);
      return;
    }
    
    // Log first few documents structure
    snapshot.docs.slice(0, 3).forEach((doc, index) => {
      console.log(`📄 Document ${index + 1} (${doc.id}):`, doc.data());
    });
    
    // Check for common field names
    const firstDoc = snapshot.docs[0];
    const data = firstDoc.data();
    const fields = Object.keys(data);
    
    console.log(`🔑 Available fields in ${firstDoc.id}:`, fields);
    
    // Check for location fields
    const locationFields = fields.filter(field => 
      field.toLowerCase().includes('lat') || 
      field.toLowerCase().includes('lng') || 
      field.toLowerCase().includes('long')
    );
    
    console.log(`📍 Location fields found:`, locationFields);
    
    // Check for serial/order fields
    const orderFields = fields.filter(field =>
      field.toLowerCase().includes('serial') ||
      field.toLowerCase().includes('order')
    );
    
    console.log(`🔢 Order fields found:`, orderFields);
    
    // Check for reached fields
    const reachedFields = fields.filter(field =>
      field.toLowerCase().includes('reach')
    );
    
    console.log(`✅ Reached fields found:`, reachedFields);
    
  } catch (error) {
    console.error(`❌ Error debugging Route${routeNumber}:`, error);
  }
};

/**
 * Debug realtime database structure
 */
export const debugRealtimeStructure = async () => {
  console.log('🔍 Debugging Realtime Database structure...');
  
  try {
    // Check root structure
    const rootRef = ref(realtimeDatabase, '/');
    const rootSnapshot = await get(rootRef);
    const rootData = rootSnapshot.val();
    
    console.log('📊 Root structure:', Object.keys(rootData || {}));
    
    // Check bus data specifically
    if (rootData?.bus) {
      console.log('🚌 Bus data structure:', Object.keys(rootData.bus));
      
      if (rootData.bus.Location) {
        console.log('📍 Location data:', rootData.bus.Location);
      }
      
      if (rootData.bus.RouteNumber) {
        console.log('🛣️ Route Number:', rootData.bus.RouteNumber);
      }
    } else {
      console.warn('⚠️ No bus data found in root');
    }
    
  } catch (error) {
    console.error('❌ Error debugging Realtime Database:', error);
  }
};