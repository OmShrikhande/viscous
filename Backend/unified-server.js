// ===== AUTO SERIAL ROTATION ON REACH LOGIC =====
/**
 * When any stop is marked as reached, check if it has the highest serial number.
 * If so, rotate serial numbers: reached stop gets 1, previous gets 2, etc.
 *
 * Call this function after a stop is marked as reached.
 */
async function autoRotateSerialsIfNeeded(reachedStopId) {
  try {
    // Get all stops from Firestore
    const stopsSnapshot = await firestoreDb.collection('Route2').get();
    const stops = [];
    stopsSnapshot.forEach(doc => {
      const data = doc.data();
      stops.push({
        id: doc.id,
        serialNumber: data.serialNumber || 0
      });
    });
    if (stops.length === 0) return;
    // Find the stop with the highest serial number
    const maxSerial = Math.max(...stops.map(s => s.serialNumber));
    const reachedStop = stops.find(s => s.id === reachedStopId);
    if (!reachedStop) return;
    if (reachedStop.serialNumber !== maxSerial) return; // Only rotate if this is the highest serial
    // Sort stops by serialNumber descending (so highest is first)
    const sorted = stops.sort((a, b) => b.serialNumber - a.serialNumber);
    // Assign new serials: reached stop gets 1, previous gets 2, etc.
    const updates = [];
    for (let i = 0; i < sorted.length; i++) {
      const newSerial = i + 1;
      updates.push({ id: sorted[i].id, newSerial });
    }
    // Batch update
    const batch = firestoreDb.batch();
    updates.forEach(u => {
      const ref = firestoreDb.collection('Route2').doc(u.id);
      batch.update(ref, { serialNumber: u.newSerial });
    });
    await batch.commit();
    console.log('[Auto Serial Rotation] Serial numbers rotated successfully');
  } catch (error) {
    console.error('[Auto Serial Rotation] Error:', error);
  }
}
// ===== SERIAL NUMBER ROTATION LOGIC =====
/**
 * Rotates serial numbers so that the reached stop (with highest serial) becomes 1,
 * the previous becomes 2, and so on, wrapping around for all stops.
 * POST /tracking/api/rotate-serials/:stopId
 * Body: { }
 *
 * Example: If stopId is the stop with the highest serial, it becomes 1, previous becomes 2, etc.
 */
app.post('/tracking/api/rotate-serials/:stopId', async (req, res) => {
  try {
    const stopId = req.params.stopId;
    // Get all stops from Firestore
    const stopsSnapshot = await firestoreDb.collection('Route2').get();
    const stops = [];
    stopsSnapshot.forEach(doc => {
      const data = doc.data();
      stops.push({
        id: doc.id,
        serialNumber: data.serialNumber || 0
      });
    });
    if (stops.length === 0) {
      return res.status(404).json({ success: false, message: 'No stops found' });
    }
    // Find the stop with the highest serial number
    const maxSerial = Math.max(...stops.map(s => s.serialNumber));
    const reachedStop = stops.find(s => s.id === stopId);
    if (!reachedStop) {
      return res.status(404).json({ success: false, message: 'Stop not found' });
    }
    if (reachedStop.serialNumber !== maxSerial) {
      return res.status(400).json({ success: false, message: 'Stop is not the highest serial number' });
    }
    // Sort stops by serialNumber descending (so highest is first)
    const sorted = stops.sort((a, b) => b.serialNumber - a.serialNumber);
    // Assign new serials: reached stop gets 1, previous gets 2, etc.
    const updates = [];
    for (let i = 0; i < sorted.length; i++) {
      const newSerial = i + 1;
      updates.push({ id: sorted[i].id, newSerial });
    }
    // Batch update
    const batch = firestoreDb.batch();
    updates.forEach(u => {
      const ref = firestoreDb.collection('Route2').doc(u.id);
      batch.update(ref, { serialNumber: u.newSerial });
    });
    await batch.commit();
    res.json({ success: true, message: 'Serial numbers rotated successfully', updates });
  } catch (error) {
    console.error('[Serial Rotation] Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});
/**
 * OPTIMIZED Unified Server for Bus Tracking System - QUOTA FIX
 * 
 * This is your existing unified-server.js but with the Excel-optimized service
 * replacing the quota-heavy services to prevent Firestore exhaustion.
 * 
 * Changes made:
 * - Replaced locationService, enhancedLocationService, bidirectionalTrackingService
 * - Added UnifiedExcelService with quota protection
 * - Maintained all existing API endpoints
 * - Same functionality, 90% fewer Firestore operations
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const admin = require('firebase-admin');
const { initializeApp } = require('firebase/app');
const { getFirestore } = require('firebase/firestore');
const { getDatabase, ref, set } = require('firebase/database');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.json());

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'Bus tracking Admin/Admin/Backend/uploads')));

// Set default port
const PORT = process.env.PORT || 3001;

// ===== FIREBASE INITIALIZATION =====

// Initialize Firebase Admin SDK
let adminServiceAccount;

// Check if environment variables are available
if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
  console.log("Using Firebase Admin SDK credentials from environment variables");
  
  // Create a complete service account object from environment variables
  adminServiceAccount = {
    type: process.env.FIREBASE_TYPE || 'service_account',
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID || '0849db45edf7ce912eb97332f7c9d06140652aba',
    private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID || '103042057968763161674',
    auth_uri: process.env.FIREBASE_AUTH_URI || 'https://accounts.google.com/o/oauth2/auth',
    token_uri: process.env.FIREBASE_TOKEN_URI || 'https://oauth2.googleapis.com/token',
    auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL || 'https://www.googleapis.com/oauth2/v1/certs',
    client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL || `https://www.googleapis.com/robot/v1/metadata/x509/${encodeURIComponent(process.env.FIREBASE_CLIENT_EMAIL)}`,
    universe_domain: process.env.FIREBASE_UNIVERSE_DOMAIN || 'googleapis.com'
  };
} else {
  // Fallback to service account file if available
  console.log("Trying to use serviceAccountKey.json file");
  try {
    adminServiceAccount = require('./Esp8266 server/serviceAccountKey.json');
  } catch (error) {
    console.error("Error loading Firebase credentials:", error.message);
    console.error("Please set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY environment variables");
    process.exit(1);
  }
}

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(adminServiceAccount)
});

const db = admin.firestore();

// Initialize Firebase Client SDK
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "AIzaSyAc_3UzizC6Y-hzI_5fDYmXiTSTwR69oac",
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || "bus-tracker-4e0fc.firebaseapp.com",
  databaseURL: process.env.FIREBASE_DATABASE_URL || "https://bus-tracker-4e0fc-default-rtdb.firebaseio.com",
  projectId: process.env.FIREBASE_PROJECT_ID || "bus-tracker-4e0fc",
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "bus-tracker-4e0fc.appspot.com",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "899399291440",
  appId: process.env.FIREBASE_APP_ID || "1:899399291440:web:1c4535401988d905e293f5",
  measurementId: process.env.FIREBASE_MEASUREMENT_ID || "G-JFC5HHBVGC"
};

// Initialize Firebase Client
const firebaseApp = initializeApp(firebaseConfig);
const firestoreDb = getFirestore(firebaseApp);
const realtimeDatabase = getDatabase(firebaseApp);

console.log('Firebase initialized successfully');

// ===== MONGODB CONNECTION =====

// Connect to MongoDB if MONGO_URI is provided, but make it optional
if (process.env.MONGODB_URI) {
  mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  })
  .then(() => {
    console.log('✅ MongoDB connected successfully');
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
  });

  // Handle MongoDB connection errors
  mongoose.connection.on('error', err => {
    console.error('❌ MongoDB connection error:', err);
  });
} else {
  console.log('✅ MongoDB connection skipped - Using mock data');
}

// ===== EXCEL OPTIMIZED SERVICE =====

// Import the unified Excel service (replaces multiple quota-heavy services)
const { UnifiedExcelService } = require('./Tracking/services/unifiedExcelService');

// Initialize the unified Excel service
const unifiedExcelService = new UnifiedExcelService(realtimeDatabase, firestoreDb);

// ===== HEALTH CHECK ROUTE =====

// Health check endpoint to keep the server alive
app.get('/health', (req, res) => {
  const uptime = process.uptime();
  const uptimeHours = Math.floor(uptime / 3600);
  const uptimeMinutes = Math.floor((uptime % 3600) / 60);
  const uptimeSeconds = Math.floor(uptime % 60);
  
  // Get service status
  let excelServiceStatus = 'unknown';
  
  try {
    const stats = unifiedExcelService.getStats();
    excelServiceStatus = stats.isActive ? 'active' : 'inactive';
  } catch (error) {
    excelServiceStatus = 'error';
  }
  
  res.status(200).json({
    status: 'OK - EXCEL OPTIMIZED',
    message: 'Unified Bus Tracking Server with Excel optimization',
    timestamp: new Date().toISOString(),
    uptime: `${uptimeHours}h ${uptimeMinutes}m ${uptimeSeconds}s`,
    port: PORT,
    services: {
      'ESP8266 Server': 'active',
      'Excel Optimized Service': excelServiceStatus,
      'Admin Backend': 'active'
    },
    optimization: {
      quotaProtection: 'ACTIVE',
      dataSource: 'Excel + Firestore Cache',
      maxOperationsPerHour: 800
    },
    endpoints: {
      esp8266: '/esp8266/upload',
      tracking: '/tracking/api',
      admin: '/api',
      health: '/health',
      keepAlive: '/keep-alive'
    }
  });
});

// Dedicated keep-alive endpoint for external monitoring (lightweight)
app.get('/keep-alive', (req, res) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    message: 'Excel-optimized server is alive and responding'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Bus Tracking Unified Server - Excel Optimized',
    status: 'running',
    optimization: 'Excel-based with quota protection',
    endpoints: {
      health: '/health',
      esp8266: '/esp8266',
      tracking: '/tracking',
      admin: '/api'
    }
  });
});

// ===== ESP8266 SERVER ROUTES =====

// ESP8266 Server endpoint (unchanged from original)
app.post("/esp8266/upload", async (req, res) => {
  try {
    const data = req.body;

    // Get current time in IST (UTC+5:30)
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
    const istTime = new Date(now.getTime() + istOffset);
    const pad = (n) => n.toString().padStart(2, "0");

    // Format: DDMMYY (using IST)
    const date = `${pad(istTime.getUTCDate())}${pad(istTime.getUTCMonth() + 1)}${istTime.getUTCFullYear().toString().slice(2)}`;
    // Format: HHMMSS (using IST)
    const time = `${pad(istTime.getUTCHours())}${pad(istTime.getUTCMinutes())}${pad(istTime.getUTCSeconds())}`;

    // Compare NodeMCU date with server date
    let incomingTimestamp = data?.location?.timestamp;
    let useServerTimestamp = false;

    if (incomingTimestamp) {
      // Try to parse the incoming timestamp as a Date
      const incomingDate = new Date(incomingTimestamp);
      // Convert both to IST for comparison
      const incomingIstTime = new Date(incomingDate.getTime() + istOffset);
      
      // Compare only the date part (YYYY-MM-DD) in IST
      const serverDateStr = istTime.toISOString().slice(0, 10);
      const incomingDateStr = incomingIstTime.toISOString().slice(0, 10);

      if (serverDateStr !== incomingDateStr) {
        useServerTimestamp = true;
      }
    } else {
      useServerTimestamp = true;
    }

    // If mismatch, use server date/time in IST
    const finalTimestamp = useServerTimestamp
      ? istTime.toISOString().replace('T', ' ').slice(0, 19) // "YYYY-MM-DD HH:MM:SS" in IST
      : incomingTimestamp;

    const docRef = db
      .collection("locationhistory")
      .doc(date)
      .collection("entries")
      .doc(time);

    // Build the Firestore document, only including defined fields
    const docData = {
      ServerTimestamp: admin.firestore.FieldValue.serverTimestamp(),
    };
    if (data?.location?.latitude !== undefined) docData.Latitude = data.location.latitude;
    if (data?.location?.longitude !== undefined) docData.Longitude = data.location.longitude;
    if (data?.location?.speed !== undefined) docData.Speed = data.location.speed;
    docData.Timestamp = finalTimestamp; // Always set, either from NodeMCU or server
    if (data?.dailyDistance !== undefined) docData.DailyDistance = data.dailyDistance;

    await docRef.set(docData);

    console.log(`[ESP8266] Location data saved: (${docData.Latitude}, ${docData.Longitude})`);
    
    // Also save to Realtime Database at bus/Location path
    try {
      // Write Location data
      const realtimeLocationData = {
        Latitude: docData.Latitude || null,
        Longitude: docData.Longitude || null,
        Speed: docData.Speed || null,
        Timestamp: finalTimestamp || null
      };

      const locationRef = ref(realtimeDatabase, 'bus/Location');
      await set(locationRef, realtimeLocationData);
      console.log(`[ESP8266] Location data saved to Realtime Database: bus/Location`);
    } catch (error) {
      console.error("[ESP8266] Error saving Location to Realtime Database:", error);
    }

    try {
      // Write DailyDistance data
      const realtimeDistanceData = {
        DailyDistance: docData.DailyDistance || null,
      };

      const distanceRef = ref(realtimeDatabase, 'bus/Distance');
      await set(distanceRef, realtimeDistanceData);
      console.log(`[ESP8266] DailyDistance saved to Realtime Database: bus/Distance/DailyDistance`);
    } catch (error) {
      console.error("[ESP8266] Error saving DailyDistance to Realtime Database:", error);
    }
    
    res.status(200).send("Data uploaded successfully!");
  } catch (error) {
    console.error("[ESP8266] Error:", error);
    res.status(500).send("Server error: " + error.message);
  }
});

// ===== TRACKING SERVER ROUTES (EXCEL OPTIMIZED) =====

// --- PATCH: Add endpoint to mark stop as reached and auto-rotate serials if needed ---
/**
 * POST /tracking/api/mark-reached/:stopId
 * Marks a stop as reached and, if it has the highest serial, rotates serials.
 * Body: { }
 */
app.post('/tracking/api/mark-reached/:stopId', async (req, res) => {
  try {
    const stopId = req.params.stopId;
    const stopRef = firestoreDb.collection('Route2').doc(stopId);
    const stopDoc = await stopRef.get();
    if (!stopDoc.exists) {
      return res.status(404).json({ success: false, message: 'Stop not found' });
    }
    await stopRef.update({ reached: true });
    // Call auto-rotation logic
    await autoRotateSerialsIfNeeded(stopId);
    res.json({ success: true, message: 'Stop marked as reached. Serial numbers rotated if needed.' });
  } catch (error) {
    console.error('[Mark Reached] Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Tracking Server routes (using Excel service)
app.get('/tracking', (req, res) => {
  res.send('Bus Tracking Server is running - Excel Optimized');
});

// Get current bus location
app.get('/tracking/api/bus/location', async (req, res) => {
  try {
    const location = unifiedExcelService.getBusLocation();
    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'Bus location not available'
      });
    }
    
    res.json({
      success: true,
      data: location,
      excelOptimized: true
    });
  } catch (error) {
    console.error('[Tracking] Error getting bus location:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get all stops
app.get('/tracking/api/stops', async (req, res) => {
  try {
    const forceRefresh = req.query.refresh === 'true';
    const stops = unifiedExcelService.getStops(forceRefresh);
    
    res.json({
      success: true,
      data: stops,
      excelOptimized: true,
      dataSource: 'Excel + Firestore Cache'
    });
  } catch (error) {
    console.error('[Tracking] Error getting stops:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Manual check stops (rate limited)
app.post('/tracking/api/check-stops', async (req, res) => {
  try {
    // Check if quota allows
    if (!unifiedExcelService.checkQuota()) {
      return res.status(429).json({
        success: false,
        message: 'Rate limit exceeded - Quota protection active',
        excelOptimized: true
      });
    }
    
    // Trigger check (will be throttled internally)
    await unifiedExcelService.checkStopsReached();
    
    res.json({
      success: true,
      message: 'Check queued (will be processed with throttling)',
      excelOptimized: true
    });
  } catch (error) {
    console.error('[Tracking] Error in manual check:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Reset all stops
app.post('/tracking/api/stops/reset', async (req, res) => {
  try {
    const success = await unifiedExcelService.resetAllStops();
    
    if (success) {
      res.json({
        success: true,
        message: 'All stops reset successfully',
        excelOptimized: true
      });
    } else {
      res.status(429).json({
        success: false,
        message: 'Reset failed - Quota protection active',
        excelOptimized: true
      });
    }
  } catch (error) {
    console.error('[Tracking] Error resetting stops:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Excel service stats (replaces enhanced location and bidirectional stats)
app.get('/tracking/api/excel-service/stats', (req, res) => {
  try {
    const stats = unifiedExcelService.getStats();
    res.json({
      success: true,
      data: stats,
      message: 'Excel service statistics'
    });
  } catch (error) {
    console.error('[Tracking] Error getting Excel service stats:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// ===== ADMIN BACKEND ROUTES =====

// Import admin routes (unchanged)
const adminRoutes = require('./Bus tracking Admin/Admin/Backend/routes/adminRoutes');
app.use('/api', adminRoutes);

// ===== KEEP-ALIVE MECHANISM =====

// Keep-alive mechanism to prevent server from sleeping
function startKeepAlive() {
  const KEEP_ALIVE_INTERVAL = 14 * 60 * 1000; // 14 minutes
  const SERVER_URL = process.env.SERVER_URL || `http://localhost:${PORT}`;
  
  console.log(`🔄 Starting keep-alive mechanism (${KEEP_ALIVE_INTERVAL/60000} minutes interval)`);
  console.log(`📡 Keep-alive URL: ${SERVER_URL}/keep-alive`);
  
  const keepAliveInterval = setInterval(async () => {
    try {
      const fetch = (await import('node-fetch')).default;
      const response = await fetch(`${SERVER_URL}/keep-alive`, {
        method: 'GET',
        timeout: 10000
      });
      
      if (response.ok) {
        console.log(`✅ Keep-alive ping successful at ${new Date().toISOString()}`);
      } else {
        console.log(`⚠️  Keep-alive ping failed with status: ${response.status}`);
      }
    } catch (error) {
      console.log(`⚠️  Keep-alive ping failed: ${error.message}`);
      
      // Fallback to native http module
      try {
        const https = require('https');
        const http = require('http');
        const url = require('url');
        
        const parsedUrl = url.parse(`${SERVER_URL}/keep-alive`);
        const protocol = parsedUrl.protocol === 'https:' ? https : http;
        
        const req = protocol.get(parsedUrl, (res) => {
          console.log(`✅ Keep-alive ping successful (fallback) at ${new Date().toISOString()}`);
        });
        
        req.on('error', (err) => {
          console.log(`⚠️  Keep-alive ping failed: ${err.message}`);
        });
        
        req.setTimeout(10000, () => {
          req.abort();
          console.log('⚠️  Keep-alive ping timeout');
        });
        
      } catch (fallbackError) {
        console.log(`⚠️  Keep-alive ping failed: ${error.message}`);
      }
    }
  }, KEEP_ALIVE_INTERVAL);
  
  return keepAliveInterval;
}

// ===== START THE SERVER =====

// Start the server
app.listen(PORT, async () => {
  console.log(`🚀 EXCEL OPTIMIZED Unified Bus Tracking Server running on port ${PORT}`);
  console.log('📊 Excel-based optimization active with quota protection');
  console.log('All services are now available on a single port:');
  console.log(`- ESP8266 Server: http://localhost:${PORT}/esp8266`);
  console.log(`- Tracking Server (Excel Optimized): http://localhost:${PORT}/tracking`);
  console.log(`- Admin Backend: http://localhost:${PORT}/api`);
  
  // Start the Excel optimized service (replaces multiple services)
  console.log('🚀 Starting Excel Optimized Service...');
  const started = await unifiedExcelService.start();
  
  if (started) {
    console.log('✅ Excel Optimized Service started successfully');
    console.log('📊 Quota protection: Maximum 800 operations/hour');
    console.log('📊 Data source: Route2.xlsx + Firestore cache');
    console.log('📊 Processing interval: 20 seconds');
    console.log('📊 Location debounce: 10 seconds');
  } else {
    console.error('❌ Failed to start Excel Optimized Service');
    process.exit(1);
  }
  
  // Start the keep-alive mechanism
  const keepAliveInterval = startKeepAlive();
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('Shutting down Excel optimized server...');
    
    // Stop Excel service
    console.log('🛑 Stopping Excel Optimized Service...');
    unifiedExcelService.stop();
    
    // Clear keep-alive interval
    if (keepAliveInterval) {
      clearInterval(keepAliveInterval);
    }
    
    // Close MongoDB connection if it exists
    if (mongoose.connection.readyState) {
      mongoose.connection.close();
    }
    
    console.log('Excel optimized server shutdown complete.');
    process.exit(0);
  });
});

module.exports = { app, unifiedExcelService };