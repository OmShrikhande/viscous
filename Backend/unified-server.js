  /**
 * Unified Server for Bus Tracking System
 * 
 * This file combines all three servers into a single Express application:
 * 1. ESP8266 Server - Receives data from NodeMCU and sends to Firebase
 * 2. Tracking Server - Monitors bus location and updates stop status
 * 3. Admin Backend - Provides admin functionality and frontend
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

// ===== HEALTH CHECK ROUTE =====

// Health check endpoint to keep the server alive
app.get('/health', (req, res) => {
  const uptime = process.uptime();
  const uptimeHours = Math.floor(uptime / 3600);
  const uptimeMinutes = Math.floor((uptime % 3600) / 60);
  const uptimeSeconds = Math.floor(uptime % 60);
  
  // Get service statuses
  let enhancedLocationStatus = 'unknown';
  let optimizedTrackingStatus = 'unknown';
  
  try {
    const enhancedStats = enhancedLocationService.getStats();
    enhancedLocationStatus = enhancedStats.isActive ? 'active' : 'inactive';
  } catch (error) {
    enhancedLocationStatus = 'error';
  }
  
  try {
    const optimizedStats = optimizedExcelTrackingService.getStats();
    optimizedTrackingStatus = optimizedStats.isActive ? 'active' : 'inactive';
  } catch (error) {
    optimizedTrackingStatus = 'error';
  }
  
  res.status(200).json({
    status: 'OK',
    message: 'Unified Bus Tracking Server is running',
    timestamp: new Date().toISOString(),
    uptime: `${uptimeHours}h ${uptimeMinutes}m ${uptimeSeconds}s`,
    port: PORT,
    services: {
      'ESP8266 Server': 'active',
      'Tracking Server': 'active', 
      'Admin Backend': 'active',
      'Enhanced Location Service': enhancedLocationStatus,
      'Optimized Excel Tracking Service': optimizedTrackingStatus
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
    message: 'Server is alive and responding'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Bus Tracking Unified Server',
    status: 'running',
    endpoints: {
      health: '/health',
      esp8266: '/esp8266',
      tracking: '/tracking',
      admin: '/api'
    }
  });
});

// ===== ESP8266 SERVER ROUTES =====

// ESP8266 Server endpoint
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
    // ===== REPLACE YOUR EXISTING REALTIME DATABASE LOGIC WITH THIS =====

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


// ===== TRACKING SERVER ROUTES =====

// Import tracking server services
const { 
  startLocationMonitoring, 
  getBusLocation, 
  getStops, 
  checkStopsReached,
  resetAllStopsExceptCollege,
  resetStopsReached,
  checkMidnightReset
} = require('./Tracking/services/locationService');

// Import enhanced location service
const { enhancedLocationService } = require('./Tracking/services/enhancedLocationService');

// Import optimized Excel tracking service (replaces bidirectional service)
const { optimizedExcelTrackingService } = require('./Tracking/services/optimizedExcelTrackingService');

// Tracking Server routes
app.get('/tracking', (req, res) => {
  res.send('Bus Tracking Server is running');
});

// Get current bus location
app.get('/tracking/api/bus/location', async (req, res) => {
  try {
    const location = await getBusLocation();
    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'Bus location not available'
      });
    }
    
    res.json({
      success: true,
      data: location
    });
  } catch (error) {
    console.error('[Tracking] Error getting bus location:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get all stops (from Excel)
app.get('/tracking/api/stops', async (req, res) => {
  try {
    const stops = optimizedExcelTrackingService.getStops();
    
    res.json({
      success: true,
      data: stops,
      message: 'Stops retrieved from Excel file'
    });
  } catch (error) {
    console.error('[Tracking] Error getting stops:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Reset all stops
app.post('/tracking/api/stops/reset', async (req, res) => {
  try {
    await optimizedExcelTrackingService.resetAllStops();
    
    res.json({
      success: true,
      message: 'All stops reset successfully'
    });
  } catch (error) {
    console.error('[Tracking] Error resetting stops:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Reset a specific stop
app.post('/tracking/api/stops/:id/reset', async (req, res) => {
  try {
    const stopId = req.params.id;
    await resetStopsReached(stopId);
    
    res.json({
      success: true,
      message: `Stop ${stopId} reset successfully`
    });
  } catch (error) {
    console.error('[Tracking] Error resetting stop:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Enhanced Location Service Routes
app.get('/tracking/api/enhanced-location/stats', (req, res) => {
  try {
    const stats = enhancedLocationService.getStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('[Tracking] Error getting enhanced location stats:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

app.post('/tracking/api/enhanced-location/start', (req, res) => {
  try {
    enhancedLocationService.start();
    res.json({
      success: true,
      message: 'Enhanced location service started successfully'
    });
  } catch (error) {
    console.error('[Tracking] Error starting enhanced location service:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

app.post('/tracking/api/enhanced-location/stop', (req, res) => {
  try {
    enhancedLocationService.stop();
    res.json({
      success: true,
      message: 'Enhanced location service stopped successfully'
    });
  } catch (error) {
    console.error('[Tracking] Error stopping enhanced location service:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Optimized Excel Tracking Service Routes
app.get('/tracking/api/optimized-tracking/stats', (req, res) => {
  try {
    const stats = optimizedExcelTrackingService.getStats();
    res.json({
      success: true,
      message: 'Optimized Excel tracking service statistics',
      data: stats
    });
  } catch (error) {
    console.error('[Tracking] Error getting optimized tracking stats:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

app.post('/tracking/api/optimized-tracking/start', async (req, res) => {
  try {
    const result = await optimizedExcelTrackingService.start();
    res.json({
      success: result,
      message: result ? 'Optimized Excel tracking service started successfully' : 'Failed to start service'
    });
  } catch (error) {
    console.error('[Tracking] Error starting optimized tracking service:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

app.post('/tracking/api/optimized-tracking/stop', (req, res) => {
  try {
    optimizedExcelTrackingService.stop();
    res.json({
      success: true,
      message: 'Optimized Excel tracking service stopped successfully'
    });
  } catch (error) {
    console.error('[Tracking] Error stopping optimized tracking service:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

app.post('/tracking/api/optimized-tracking/reset-stops', async (req, res) => {
  try {
    await optimizedExcelTrackingService.resetAllStops();
    res.json({
      success: true,
      message: 'All stops reset successfully'
    });
  } catch (error) {
    console.error('[Tracking] Error resetting stops:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

app.get('/tracking/api/optimized-tracking/ordered-stops', (req, res) => {
  try {
    const orderedStops = optimizedExcelTrackingService.getOrderedStops();
    res.json({
      success: true,
      message: 'Ordered stops retrieved successfully',
      data: orderedStops,
      count: orderedStops.length
    });
  } catch (error) {
    console.error('[Tracking] Error getting ordered stops:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// ===== ADMIN BACKEND ROUTES =====

// Import Admin Backend routes
const adminRoutes = require('./Bus tracking Admin/Admin/Backend/routes/adminRoutes.js');
const userRoutes = require('./Bus tracking Admin/Admin/Backend/routes/userRoutes');
const dashboardRoutes = require('./Bus tracking Admin/Admin/Backend/routes/dashboardRoutes.js');
const attendanceRoutes = require('./Bus tracking Admin/Admin/Backend/routes/attendanceRoutes.js');
const busLocationRoutes = require('./Bus tracking Admin/Admin/Backend/routes/busLocationRoutes.js');
const locationRoutes = require('./Bus tracking Admin/Admin/Backend/routes/location.js');

// Config endpoint to expose API base URL
app.get('/api/config', (req, res) => {
  // Use a single API base URL that includes the port
  const apiBaseUrl = process.env.API_BASE_URL || `http://localhost:${PORT}`;
  res.json({
    apiBaseUrl: apiBaseUrl
  });
});

// Admin routes
app.use('/api/admin', adminRoutes);
app.use('/api/admin', userRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api', attendanceRoutes);
app.use('/api', busLocationRoutes);
app.use('/api/location', locationRoutes);

// ===== KEEP-ALIVE MECHANISM =====

// Self-ping function to keep the server alive on Render
function startKeepAlive() {
  const KEEP_ALIVE_INTERVAL = 13 * 60 * 1000; // 13 minutes in milliseconds
  const SERVER_URL = process.env.RENDER_EXTERNAL_URL || process.env.API_BASE_URL;
  
  if (!SERVER_URL) {
    console.log('⚠️  No RENDER_EXTERNAL_URL or API_BASE_URL found - Self-ping disabled');
    return;
  }
  
  console.log(`🔄 Keep-alive mechanism started - will ping every 13 minutes`);
  console.log(`🎯 Target URL: ${SERVER_URL}/keep-alive`);
  
  const keepAliveInterval = setInterval(async () => {
    try {
      // Use dynamic import for node-fetch if available, otherwise use a simple HTTP request
      const fetch = (await import('node-fetch')).default;
      
      const response = await fetch(`${SERVER_URL}/keep-alive`, {
        method: 'GET',
        timeout: 10000 // 10 second timeout
      });
      
      if (response.ok) {
        console.log(`✅ Keep-alive ping successful at ${new Date().toISOString()}`);
      } else {
        console.log(`⚠️  Keep-alive ping returned status: ${response.status}`);
      }
    } catch (error) {
      // Fallback to native http module if fetch fails
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
app.listen(PORT, () => {
  console.log(`🚀 Unified Bus Tracking Server running on port ${PORT}`);
  console.log('All services are now available on a single port:');
  console.log(`- ESP8266 Server: http://localhost:${PORT}/esp8266`);
  console.log(`- Tracking Server: http://localhost:${PORT}/tracking`);
  console.log(`- Admin Backend: http://localhost:${PORT}/api`);
  
  // Start the bus location monitoring service
  console.log('Starting bus location monitoring service...');
  const intervals = startLocationMonitoring();
  
  // Start enhanced location service
  console.log('🚀 Starting Enhanced Location Service...');
  enhancedLocationService.start();
  
  // Start optimized Excel tracking service
  console.log('🚀 Starting Optimized Excel Tracking Service...');
  optimizedExcelTrackingService.start().then(started => {
    if (started) {
      console.log('✅ Optimized Excel Tracking Service started successfully');
    } else {
      console.error('❌ Failed to start Optimized Excel Tracking Service');
    }
  }).catch(error => {
    console.error('❌ Error starting Optimized Excel Tracking Service:', error);
  });
  
  // Start the keep-alive mechanism
  const keepAliveInterval = startKeepAlive();
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('Shutting down server...');
    
    // Clear intervals
    if (intervals && intervals.monitoringInterval) {
      clearInterval(intervals.monitoringInterval);
    }
    if (intervals && intervals.midnightCheckInterval) {
      clearInterval(intervals.midnightCheckInterval);
    }
    if (keepAliveInterval) {
      clearInterval(keepAliveInterval);
    }
    
    // Stop enhanced services
    console.log('🛑 Stopping Enhanced Location Service...');
    enhancedLocationService.stop();
    
    console.log('🛑 Stopping Optimized Excel Tracking Service...');
    optimizedExcelTrackingService.stop();
    
    // Close MongoDB connection if it exists
    if (mongoose.connection.readyState) {
      mongoose.connection.close();
    }
    
    console.log('Server shutdown complete.');
    process.exit(0);
  });
});