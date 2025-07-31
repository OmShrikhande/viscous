/**
 * EMERGENCY SERVER - IMMEDIATE QUOTA FIX
 * 
 * Deploy this IMMEDIATELY to stop Firestore quota exhaustion.
 * This server implements aggressive rate limiting and optimization.
 * 
 * Usage: npm run start:emergency
 */

const express = require('express');
const cors = require('cors');
const EmergencyOptimizedService = require('./services/emergencyOptimizedService');

const app = express();
const PORT = process.env.PORT || 3002;

// Initialize emergency service
const emergencyService = new EmergencyOptimizedService();

// Middleware
app.use(cors());
app.use(express.json());

// Emergency status endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'EMERGENCY MODE ACTIVE',
    service: 'Emergency Quota Protection Server',
    version: '1.0.0-emergency',
    message: 'Firestore quota protection is active',
    timestamp: new Date().toISOString()
  });
});

// Health check with emergency metrics
app.get('/health', (req, res) => {
  const metrics = emergencyService.getEmergencyMetrics();
  res.json({
    status: 'emergency-mode',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    emergencyMetrics: metrics,
    quotaProtection: metrics.quotaProtectionActive ? 'ACTIVE' : 'MONITORING',
    timestamp: new Date().toISOString()
  });
});

// Bus location (cached)
app.get('/api/bus/location', (req, res) => {
  try {
    const location = emergencyService.busLocation;
    if (!location || !location.latitude || !location.longitude) {
      return res.status(404).json({ 
        message: 'Bus location not available',
        emergencyMode: true,
        timestamp: new Date().toISOString()
      });
    }
    
    res.json({
      latitude: location.latitude,
      longitude: location.longitude,
      emergencyMode: true,
      cached: true,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching bus location:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message,
      emergencyMode: true,
      timestamp: new Date().toISOString()
    });
  }
});

// Stops (from cache only)
app.get('/api/stops', (req, res) => {
  try {
    const stops = Array.from(emergencyService.stops.values())
      .sort((a, b) => a.serialNumber - b.serialNumber);
    
    res.json({
      stops: stops,
      total: stops.length,
      reached: stops.filter(s => s.reached).length,
      emergencyMode: true,
      cached: true,
      cacheAge: Date.now() - emergencyService.lastCacheUpdate,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching stops:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message,
      emergencyMode: true,
      timestamp: new Date().toISOString()
    });
  }
});

// Ordered stops (from cache)
app.get('/api/stops/ordered', (req, res) => {
  try {
    const stops = Array.from(emergencyService.stops.values())
      .sort((a, b) => {
        if (a.reached && !b.reached) return -1;
        if (!a.reached && b.reached) return 1;
        return a.serialNumber - b.serialNumber;
      });
    
    res.json({
      stops: stops,
      reachedCount: stops.filter(s => s.reached).length,
      unreachedCount: stops.filter(s => !s.reached).length,
      emergencyMode: true,
      cached: true,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching ordered stops:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message,
      emergencyMode: true,
      timestamp: new Date().toISOString()
    });
  }
});

// Emergency metrics
app.get('/api/emergency/metrics', (req, res) => {
  try {
    const metrics = emergencyService.getEmergencyMetrics();
    res.json({
      ...metrics,
      serverUptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      emergencyMode: true,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching emergency metrics:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Emergency admin endpoints
app.post('/api/emergency/reset', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || authHeader !== `Bearer ${process.env.ADMIN_TOKEN || 'emergency123'}`) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const success = await emergencyService.emergencyReset();
    
    if (success) {
      res.json({
        message: 'Emergency reset completed',
        emergencyMode: true,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(429).json({
        message: 'Emergency reset failed - Quota exceeded',
        emergencyMode: true,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Error in emergency reset:', error);
    res.status(500).json({ 
      message: 'Emergency reset failed', 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Force cache refresh (if quota allows)
app.post('/api/emergency/refresh-cache', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || authHeader !== `Bearer ${process.env.ADMIN_TOKEN || 'emergency123'}`) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    if (!emergencyService.checkOperationQuota()) {
      return res.status(429).json({
        message: 'Cache refresh denied - Quota protection active',
        emergencyMode: true,
        timestamp: new Date().toISOString()
      });
    }
    
    await emergencyService.loadStopsWithEmergencyCache();
    
    res.json({
      message: 'Emergency cache refreshed',
      stopsCount: emergencyService.stops.size,
      emergencyMode: true,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error refreshing emergency cache:', error);
    res.status(500).json({ 
      message: 'Cache refresh failed', 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Error handling
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    message: 'Internal server error',
    emergencyMode: true,
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    message: 'Endpoint not found',
    path: req.path,
    emergencyMode: true,
    timestamp: new Date().toISOString()
  });
});

// Graceful shutdown
const gracefulShutdown = (signal) => {
  console.log(`\n🚨 Emergency shutdown: ${signal}`);
  
  emergencyService.stop();
  
  server.close(() => {
    console.log('✅ Emergency server closed');
    process.exit(0);
  });
  
  setTimeout(() => {
    console.log('⚠️ Force exit after timeout');
    process.exit(1);
  }, 5000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection:', reason);
  gracefulShutdown('UNHANDLED_REJECTION');
});

// Start emergency server
const server = app.listen(PORT, async () => {
  console.log('🚨 EMERGENCY SERVER STARTING...');
  console.log(`🚀 Emergency Bus Tracking Server on port ${PORT}`);
  console.log(`📊 Emergency metrics: http://localhost:${PORT}/api/emergency/metrics`);
  console.log(`🔧 Health check: http://localhost:${PORT}/health`);
  
  const started = await emergencyService.start();
  if (!started) {
    console.error('❌ Emergency service failed to start');
    process.exit(1);
  }
  
  console.log('✅ EMERGENCY MODE ACTIVE - Quota protection enabled');
  console.log('⚠️ This server implements aggressive rate limiting to prevent quota exhaustion');
});

module.exports = { app, emergencyService };