const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();
const cors = require('cors');
const adminRoutes = require('./routes/adminRoutes.js');
const userRoutes = require('./routes/userRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes.js');
const attendanceRoutes = require('./routes/attendanceRoutes.js');
const busLocationRoutes = require('./routes/busLocationRoutes.js');
const locationRoutes = require('./routes/location.js');

// Initialize Firebase client (not Admin SDK)
const { initializeFirebase } = require('./firebase-client');

// Import models to ensure they're registered
require('./models/location');
require('./models/Attendance');

// Set default API base URL if not provided in .env
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost';

const app = express();

app.use(cors());
app.use(express.json());

// Serve static files from uploads directory
app.use('/uploads', express.static('uploads'));

// Config endpoint to expose API base URL
app.get('/api/config', (req, res) => {
  res.json({
    apiBaseUrl: API_BASE_URL,
    port: process.env.PORT || 5000
  });
});

// Admin routes
app.use('/api/admin', adminRoutes);
app.use('/api/admin', userRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api', attendanceRoutes);
app.use('/api', busLocationRoutes);
app.use('/api/location', locationRoutes);

// Connect to MongoDB if MONGO_URI is provided, but make it optional
if (process.env.MONGO_URI) {
  mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
    socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
  });

  // Handle MongoDB connection errors
  mongoose.connection.on('error', err => {
    console.error('❌ MongoDB connection error:', err);
  });

  mongoose.connection.on('disconnected', () => {
    console.log('❌ MongoDB disconnected');
  });

 
} else {
  console.log('✅ MongoDB connection skipped - Using mock data');
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => console.log(`Admin Backend Server running on port ${PORT}`));