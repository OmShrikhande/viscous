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
const { getDatabase } = require('firebase/database');
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

// ===== ESP8266 SERVER ROUTES =====

// ESP8266 Server endpoint
app.post("/esp8266/upload", async (req, res) => {
  try {
    const data = req.body;
    if (!data || !data.location || !data.distance) {
      return res.status(400).send("Missing required data.");
    }

    const now = new Date();
    const pad = (n) => n.toString().padStart(2, "0");

    // Format: DDMMYY
    const date = `${pad(now.getDate())}${pad(now.getMonth() + 1)}${now.getFullYear().toString().slice(2)}`;
    
    // Format: HHMMSS
    const time = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;

    const docRef = db
      .collection("locationhistory")
      .doc(date)
      .collection("entries")
      .doc(time);

    await docRef.set({
      Latitude: data.location.latitude,
      Longitude: data.location.longitude,
      Distance: data.distance,
      Timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`[ESP8266] Location data saved: (${data.location.latitude}, ${data.location.longitude})`);
    
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
    
    // Close MongoDB connection if it exists
    if (mongoose.connection.readyState) {
      mongoose.connection.close();
    }
    
    console.log('Server shutdown complete.');
    process.exit(0);
  });
});