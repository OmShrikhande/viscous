/**
 * Excel-Based Server - IMMEDIATE QUOTA FIX
 * 
 * This server uses your Excel file as the primary data source and implements
 * aggressive optimizations to prevent Firestore quota exhaustion.
 * 
 * Key Features:
 * - Reads from Excel file (no repeated Firestore reads)
 * - Batch operations only
 * - New serial number logic
 * - Maximum quota protection
 * 
 * Usage: npm run start:excel
 */

const express = require('express');
const cors = require('cors');
const ExcelOptimizedService = require('./services/excelOptimizedService');

const app = express();
const PORT = process.env.PORT || 3002;

// Initialize Excel service
const excelService = new ExcelOptimizedService();

// Middleware
app.use(cors());
app.use(express.json());

// Status endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'EXCEL OPTIMIZED MODE',
    service: 'Excel-Based Bus Tracking Server',
    version: '1.0.0-excel',
    message: 'Using Excel file as primary data source with quota protection',
    timestamp: new Date().toISOString()
  });
});

// Health check
app.get('/health', (req, res) => {
  const metrics = excelService.getMetrics();
  res.json({
    status: 'excel-optimized',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    excelMetrics: metrics,
    quotaProtection: metrics.quotaProtectionActive ? 'ACTIVE' : 'MONITORING',
    timestamp: new Date().toISOString()
  });
});

// Bus location
app.get('/api/bus/location', (req, res) => {
  try {
    const location = excelService.busLocation;
    if (!location || !location.latitude || !location.longitude) {
      return res.status(404).json({ 
        message: 'Bus location not available',
        excelMode: true,
        timestamp: new Date().toISOString()
      });
    }
    
    res.json({
      latitude: location.latitude,
      longitude: location.longitude,
      excelMode: true,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching bus location:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message,
      excelMode: true,
      timestamp: new Date().toISOString()
    });
  }
});

// Get all stops (from Excel data)
app.get('/api/stops', (req, res) => {
  try {
    const stops = excelService.getStops();
    
    res.json({
      stops: stops,
      total: stops.length,
      reached: stops.filter(s => s.reached).length,
      excelMode: true,
      dataSource: 'Excel file',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching stops:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message,
      excelMode: true,
      timestamp: new Date().toISOString()
    });
  }
});

// Get ordered stops
app.get('/api/stops/ordered', (req, res) => {
  try {
    const stops = excelService.getOrderedStops();
    
    res.json({
      stops: stops,
      reachedCount: stops.filter(s => s.reached).length,
      unreachedCount: stops.filter(s => !s.reached).length,
      excelMode: true,
      dataSource: 'Excel file',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching ordered stops:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message,
      excelMode: true,
      timestamp: new Date().toISOString()
    });
  }
});

// Manual check stops (rate limited)
app.post('/api/check-stops', async (req, res) => {
  try {
    // Check if quota allows
    if (!excelService.checkQuota()) {
      return res.status(429).json({
        message: 'Rate limit exceeded - Quota protection active',
        excelMode: true,
        timestamp: new Date().toISOString()
      });
    }
    
    // Trigger manual processing (will be throttled internally)
    setTimeout(() => {
      excelService.processStopDetection();
    }, 1000);
    
    res.json({
      message: 'Check queued (will be processed with throttling)',
      excelMode: true,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in manual check:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message,
      excelMode: true,
      timestamp: new Date().toISOString()
    });
  }
});

// Excel metrics
app.get('/api/excel/metrics', (req, res) => {
  try {
    const metrics = excelService.getMetrics();
    res.json({
      ...metrics,
      serverUptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      excelMode: true,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching Excel metrics:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Admin endpoints
app.post('/api/excel/reset', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || authHeader !== `Bearer ${process.env.ADMIN_TOKEN || 'excel123'}`) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const success = await excelService.resetAllStops();
    
    if (success) {
      res.json({
        message: 'All stops reset successfully',
        excelMode: true,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(429).json({
        message: 'Reset failed - Quota exceeded',
        excelMode: true,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Error in reset:', error);
    res.status(500).json({ 
      message: 'Reset failed', 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Reload Excel data
app.post('/api/excel/reload', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || authHeader !== `Bearer ${process.env.ADMIN_TOKEN || 'excel123'}`) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    await excelService.reloadExcelData();
    
    res.json({
      message: 'Excel data reloaded successfully',
      stopsCount: excelService.excelStops.size,
      excelMode: true,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error reloading Excel data:', error);
    res.status(500).json({ 
      message: 'Reload failed', 
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
    excelMode: true,
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    message: 'Endpoint not found',
    path: req.path,
    excelMode: true,
    timestamp: new Date().toISOString()
  });
});

// Graceful shutdown
const gracefulShutdown = (signal) => {
  console.log(`\n📊 Excel server shutdown: ${signal}`);
  
  excelService.stop();
  
  server.close(() => {
    console.log('✅ Excel server closed');
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

// Start server
const server = app.listen(PORT, async () => {
  console.log('📊 EXCEL OPTIMIZED SERVER STARTING...');
  console.log(`🚀 Excel-Based Bus Tracking Server on port ${PORT}`);
  console.log(`📊 Excel metrics: http://localhost:${PORT}/api/excel/metrics`);
  console.log(`🔧 Health check: http://localhost:${PORT}/health`);
  
  const started = await excelService.start();
  if (!started) {
    console.error('❌ Excel service failed to start');
    process.exit(1);
  }
  
  console.log('✅ EXCEL MODE ACTIVE - Using Excel file as primary data source');
  console.log('📊 Quota protection enabled with maximum 500 operations/hour');
  console.log('⚠️ This server implements your new serial number logic with aggressive rate limiting');
});

module.exports = { app, excelService };