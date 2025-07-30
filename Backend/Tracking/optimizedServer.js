/**
 * Optimized Bus Tracking Server
 * 
 * This server implements the new serial number logic:
 * - When bus reaches highest serial number stop, all stops become "unreached"
 * - That stop gets serial number 1
 * - Other stops get serial numbers in reverse descending order
 * 
 * Optimized for production deployment on Render
 */

const express = require('express');
const cors = require('cors');
const OptimizedSerialTrackingService = require('./services/optimizedSerialTrackingService');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3002;

// Initialize the optimized tracking service
const trackingService = new OptimizedSerialTrackingService();

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'running',
    service: 'Optimized Bus Tracking Server',
    version: '2.0.0',
    timestamp: new Date().toISOString()
  });
});

// Health check for monitoring services
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    metrics: trackingService.getMetrics()
  });
});

// Get current bus location
app.get('/api/bus/location', async (req, res) => {
  try {
    const location = trackingService.busLocation;
    if (!location || !location.latitude || !location.longitude) {
      return res.status(404).json({ 
        message: 'Bus location not available',
        timestamp: new Date().toISOString()
      });
    }
    
    res.json({
      latitude: location.latitude,
      longitude: location.longitude,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching bus location:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get all stops with current status
app.get('/api/stops', async (req, res) => {
  try {
    // Force refresh if requested
    if (req.query.refresh === 'true') {
      await trackingService.loadStopsDataOptimized();
    }
    
    // Convert Map to Array and sort by serial number
    const stops = Array.from(trackingService.stops.values())
      .sort((a, b) => a.serialNumber - b.serialNumber);
    
    res.json({
      stops: stops,
      total: stops.length,
      reached: stops.filter(s => s.reached).length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching stops:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get stops ordered by serial number (for UI)
app.get('/api/stops/ordered', async (req, res) => {
  try {
    const stops = Array.from(trackingService.stops.values())
      .sort((a, b) => {
        // Reached stops first, then by serial number
        if (a.reached && !b.reached) return -1;
        if (!a.reached && b.reached) return 1;
        return a.serialNumber - b.serialNumber;
      });
    
    res.json({
      stops: stops,
      reachedCount: stops.filter(s => s.reached).length,
      unreachedCount: stops.filter(s => !s.reached).length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching ordered stops:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get performance metrics
app.get('/api/metrics', (req, res) => {
  try {
    const metrics = trackingService.getMetrics();
    res.json({
      ...metrics,
      serverUptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Reset all stops (admin endpoint)
app.post('/api/admin/reset-stops', async (req, res) => {
  try {
    // Add basic authentication check if needed
    const authHeader = req.headers.authorization;
    if (!authHeader || authHeader !== `Bearer ${process.env.ADMIN_TOKEN || 'admin123'}`) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    await trackingService.resetAllStops();
    
    res.json({
      message: 'All stops reset successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error resetting stops:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Force cache refresh (admin endpoint)
app.post('/api/admin/refresh-cache', async (req, res) => {
  try {
    // Add basic authentication check if needed
    const authHeader = req.headers.authorization;
    if (!authHeader || authHeader !== `Bearer ${process.env.ADMIN_TOKEN || 'admin123'}`) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    await trackingService.loadStopsDataOptimized();
    
    res.json({
      message: 'Cache refreshed successfully',
      stopsCount: trackingService.stops.size,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error refreshing cache:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    message: 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    message: 'Endpoint not found',
    path: req.path,
    timestamp: new Date().toISOString()
  });
});

// Graceful shutdown handling
const gracefulShutdown = (signal) => {
  console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
  
  // Stop the tracking service
  trackingService.stop();
  
  // Close the server
  server.close(() => {
    console.log('✅ Server closed successfully');
    process.exit(0);
  });
  
  // Force exit after 10 seconds
  setTimeout(() => {
    console.log('⚠️ Forcing exit after timeout');
    process.exit(1);
  }, 10000);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('UNHANDLED_REJECTION');
});

// Start the server
const server = app.listen(PORT, async () => {
  console.log(`🚀 Optimized Bus Tracking Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🗺️ Stops API: http://localhost:${PORT}/api/stops`);
  
  // Start the tracking service
  const started = await trackingService.start();
  if (!started) {
    console.error('❌ Failed to start tracking service');
    process.exit(1);
  }
  
  console.log('✅ All services started successfully');
});

module.exports = { app, trackingService };