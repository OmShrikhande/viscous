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

// Import Excel Service
const excelService = require('./services/excelService');

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
  
  res.status(200).json({
    status: 'OK',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    uptime: `${uptimeHours}h ${uptimeMinutes}m ${uptimeSeconds}s`,
    port: PORT,
    services: ['ESP8266', 'Tracking', 'Admin Backend']
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
      admin: '/api',
      excel: '/api/excel'
    },
    features: [
      'ESP8266 GPS Data Collection',
      'Real-time Bus Tracking',
      'Admin Dashboard',
      'Excel Report Generation',
      'Daily Distance Logging',
      'Stop Arrival Tracking'
    ]
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
    if (data?.distance !== undefined) docData.Distance = data.distance;
    // if (data?.totalDistance !== undefined) docData.TotalDistance = data.totalDistance;
    if (data?.dailyDistance !== undefined) docData.DailyDistance = data.dailyDistance;

    await docRef.set(docData);

    console.log(`[ESP8266] Location data saved: (${docData.Latitude}, ${docData.Longitude})`);
    
    // Also save to Realtime Database at bus/Location path
    const realtimeData = {
      Latitude: docData.Latitude || null,
      Longitude: docData.Longitude || null,
      Speed: docData.Speed || null,
      Timestamp: finalTimestamp|| null,
      Distance: docData.Distance || null,
      // TotalDistance: docData.TotalDistance || null,
      DailyDistance: docData.DailyDistance || null,
    };

    try {
      // Write to Realtime Database
      const realtimeRef = ref(realtimeDatabase, 'bus/Location');
      await set(realtimeRef, realtimeData);
      console.log(`[ESP8266] Location data saved to Realtime Database: bus/Location`);
    } catch (realtimeError) {
      console.error("[ESP8266] Error saving to Realtime Database:", realtimeError);
      // Continue execution - don't fail the entire request if Realtime DB fails
    }

    // Log daily distance and location data to Excel
    try {
      if (data?.dailyDistance !== undefined || data?.location) {
        await excelService.logDailyDistance({
          routeNumber: data.routeNumber || 'Route-1',
          dailyDistance: data.dailyDistance,
          totalDistance: data.totalDistance,
          latitude: data.location?.latitude,
          longitude: data.location?.longitude,
          speed: data.location?.speed,
          status: 'Active',
          remarks: `GPS data received from NodeMCU`
        });
      }
    } catch (excelError) {
      console.error("[ESP8266] Error logging to Excel:", excelError);
      // Continue execution - don't fail the entire request if Excel logging fails
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

// Get all stops
app.get('/tracking/api/stops', async (req, res) => {
  try {
    const forceRefresh = req.query.refresh === 'true';
    const stops = await getStops(forceRefresh);
    
    res.json({
      success: true,
      data: stops
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
    await resetStopsReached();
    
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

// ===== EXCEL REPORTING ROUTES =====

// Get daily summary from Excel
app.get('/api/excel/daily-summary/:date?', async (req, res) => {
  try {
    const date = req.params.date; // Optional date parameter
    const summary = await excelService.getDailySummary(date);
    
    if (!summary) {
      return res.status(404).json({
        success: false,
        message: 'No data found for the specified date'
      });
    }
    
    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('[Excel] Error getting daily summary:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get stop arrivals from Excel
app.get('/api/excel/stop-arrivals/:date?', async (req, res) => {
  try {
    const date = req.params.date; // Optional date parameter
    const arrivals = await excelService.getStopArrivals(date);
    
    res.json({
      success: true,
      data: arrivals
    });
  } catch (error) {
    console.error('[Excel] Error getting stop arrivals:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Generate monthly report
app.post('/api/excel/monthly-report', async (req, res) => {
  try {
    const { year, month } = req.body;
    
    if (!year || !month) {
      return res.status(400).json({
        success: false,
        message: 'Year and month are required'
      });
    }
    
    const reportFile = await excelService.generateMonthlyReport(parseInt(year), parseInt(month));
    
    if (!reportFile) {
      return res.status(404).json({
        success: false,
        message: 'No data available for the specified month'
      });
    }
    
    res.json({
      success: true,
      message: 'Monthly report generated successfully',
      filePath: reportFile
    });
  } catch (error) {
    console.error('[Excel] Error generating monthly report:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Download Excel files
app.get('/api/excel/download/:type', (req, res) => {
  try {
    const { type } = req.params;
    const filePaths = excelService.getExcelFilePaths();
    
    let filePath;
    let fileName;
    
    switch (type) {
      case 'daily':
        filePath = filePaths.dailyReport;
        fileName = 'daily-bus-tracking.xlsx';
        break;
      case 'stops':
        filePath = filePaths.stopReport;
        fileName = 'stop-arrival-log.xlsx';
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid file type. Use "daily" or "stops"'
        });
    }
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }
    
    // Send file for download
    res.download(filePath, fileName, (err) => {
      if (err) {
        console.error('Error downloading file:', err);
        res.status(500).json({
          success: false,
          message: 'Error downloading file'
        });
      }
    });
  } catch (error) {
    console.error('[Excel] Error downloading file:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get Excel file information
app.get('/api/excel/info', (req, res) => {
  try {
    const filePaths = excelService.getExcelFilePaths();
    
    const info = {
      dailyReport: {
        path: filePaths.dailyReport,
        exists: fs.existsSync(filePaths.dailyReport),
        size: fs.existsSync(filePaths.dailyReport) ? fs.statSync(filePaths.dailyReport).size : 0
      },
      stopReport: {
        path: filePaths.stopReport,
        exists: fs.existsSync(filePaths.stopReport),
        size: fs.existsSync(filePaths.stopReport) ? fs.statSync(filePaths.stopReport).size : 0
      },
      reportsDirectory: filePaths.reportsDirectory
    };
    
    res.json({
      success: true,
      data: info
    });
  } catch (error) {
    console.error('[Excel] Error getting file info:', error);
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
  const KEEP_ALIVE_INTERVAL = 14 * 60 * 1000; // 14 minutes in milliseconds
  const SERVER_URL = process.env.RENDER_EXTERNAL_URL || process.env.API_BASE_URL;
  
  if (!SERVER_URL) {
    console.log('⚠️  No RENDER_EXTERNAL_URL or API_BASE_URL found - Self-ping disabled');
    return;
  }
  
  console.log(`🔄 Keep-alive mechanism started - will ping every 14 minutes`);
  console.log(`🎯 Target URL: ${SERVER_URL}/health`);
  
  const keepAliveInterval = setInterval(async () => {
    try {
      // Use dynamic import for node-fetch if available, otherwise use a simple HTTP request
      const fetch = (await import('node-fetch')).default;
      
      const response = await fetch(`${SERVER_URL}/health`, {
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
        
        const parsedUrl = url.parse(`${SERVER_URL}/health`);
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
    
    // Close MongoDB connection if it exists
    if (mongoose.connection.readyState) {
      mongoose.connection.close();
    }
    
    console.log('Server shutdown complete.');
    process.exit(0);
  });
});