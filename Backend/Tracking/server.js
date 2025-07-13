const express = require('express');
const cors = require('cors');
const { 
  startLocationMonitoring, 
  getBusLocation, 
  getStops, 
  checkStopsReached,
  resetAllStopsExceptCollege,
  resetStopsReached,
  checkMidnightReset
} = require('./services/locationService');
const { initConnectionMonitoring } = require('./utils/connectionCheck');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.send('Bus Tracking Server is running');
});

// Get current bus location
app.get('/api/bus/location', async (req, res) => {
  try {
    const location = await getBusLocation();
    if (!location) {
      return res.status(404).json({ message: 'Bus location not found' });
    }
    res.json(location);
  } catch (error) {
    console.error('Error fetching bus location:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all stops
app.get('/api/stops', async (req, res) => {
  try {
    // Check if we should force a refresh from Firestore
    const forceRefresh = req.query.refresh === 'true';
    
    // Get stops (from cache unless forced refresh)
    const stops = await getStops(forceRefresh);
    
    res.json({
      message: forceRefresh ? 'Fetched fresh data from Firestore' : 'Using cached stops data',
      count: stops.length,
      stops: stops
    });
  } catch (error) {
    console.error('Error fetching stops:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get Excel stops data
app.get('/api/excel-stops', async (req, res) => {
  try {
    const excelStopService = require('./services/excelStopService');
    
    // Check if we should force a reload
    const forceReload = req.query.reload === 'true';
    
    // Get the stops data
    const stopsData = forceReload 
      ? await excelStopService.reloadExcelData()
      : await excelStopService.loadStopsFromExcel();
    
    res.json({
      message: `${forceReload ? 'Reloaded' : 'Loaded'} ${stopsData ? stopsData.length : 0} stops from Excel file`,
      stops: stopsData
    });
  } catch (error) {
    console.error('Error fetching Excel stops:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Manually process Excel stops
app.post('/api/process-excel-stops', async (req, res) => {
  try {
    const excelStopService = require('./services/excelStopService');
    const busLocation = await getBusLocation();
    
    if (!busLocation) {
      return res.status(404).json({ message: 'Bus location not found' });
    }
    
    const updatedStops = await excelStopService.processExcelStops(busLocation);
    res.json({ 
      message: `Processed ${updatedStops.length} stops from Excel data`,
      updatedStops 
    });
  } catch (error) {
    console.error('Error processing Excel stops:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Manually trigger a check for stops reached
app.post('/api/check-stops', async (req, res) => {
  try {
    await checkStopsReached();
    res.json({ message: 'Check completed successfully' });
  } catch (error) {
    console.error('Error checking stops:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Manually reset all stops except College
app.post('/api/reset-stops-except-college', async (req, res) => {
  try {
    await resetAllStopsExceptCollege();
    res.json({ message: 'All stops except College have been reset' });
  } catch (error) {
    console.error('Error resetting stops:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Manually reset ALL stops including College
app.post('/api/reset-all-stops', async (req, res) => {
  try {
    await resetStopsReached();
    res.json({ message: 'All stops including College have been reset' });
  } catch (error) {
    console.error('Error resetting all stops:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Force a midnight reset check (useful for testing)
app.post('/api/force-midnight-check', (req, res) => {
  try {
    checkMidnightReset();
    res.json({ message: 'Midnight check triggered manually' });
  } catch (error) {
    console.error('Error triggering midnight check:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get the status of the midnight reset system
app.get('/api/midnight-reset-status', (req, res) => {
  try {
    // Get the current time
    const now = new Date();
    
    // Get the last reset date from the locationService
    const lastReset = require('./services/locationService').lastResetDate;
    
    res.json({
      currentTime: now.toLocaleString(),
      lastResetDate: lastReset,
      timeSinceLastReset: lastReset ? `${Math.round((now - new Date(lastReset))/3600000)} hours` : 'Never',
      nextResetAt: '00:00:00 (midnight)',
      systemStatus: 'operational'
    });
  } catch (error) {
    console.error('Error getting midnight reset status:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get a summary of all stops and their reached status
app.get('/api/stops/status', async (req, res) => {
  try {
    // Check if we should force a refresh
    const forceRefresh = req.query.refresh === 'true';
    
    // Get all stops
    const stops = await getStops(forceRefresh);
    
    // Count reached and unreached stops
    const reachedStops = stops.filter(stop => stop.reached);
    const unreachedStops = stops.filter(stop => !stop.reached);
    
    // Check if JIS/College stop is reached
    const jisStop = stops.find(stop => stop.id === "JIS");
    const jisStatus = jisStop ? (jisStop.reached ? 'reached' : 'unreached') : 'not found';
    
    // Format the response
    res.json({
      summary: {
        totalStops: stops.length,
        reachedCount: reachedStops.length,
        unreachedCount: unreachedStops.length,
        collegeStopStatus: jisStatus,
        dataSource: forceRefresh ? 'freshly loaded from Firestore' : 'from cache'
      },
      reachedStops: reachedStops.map(stop => ({
        id: stop.id,
        reachedAt: stop.reachedTime || 'unknown'
      })),
      unreachedStops: unreachedStops.map(stop => stop.id),
      currentTime: new Date().toLocaleString(),
      lastResetDate: require('./services/locationService').lastResetDate
    });
  } catch (error) {
    console.error('Error getting stops status:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Clear the stops cache
app.post('/api/clear-cache', (req, res) => {
  try {
    const { clearStopsCache } = require('./services/locationService');
    clearStopsCache();
    res.json({ message: 'Stops cache cleared successfully' });
  } catch (error) {
    console.error('Error clearing cache:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Check if dependencies are installed
try {
  require('firebase/app');
  require('firebase/database');
  require('firebase/firestore');
  require('geolib');
} catch (error) {
  console.error('Error loading dependencies:', error.message);
  console.log('Please run "node install-deps.js" to install required dependencies');
  console.log('Then try starting the server again with "node server.js"');
  process.exit(1);
}

// Function to check if we need to reset stops on server start
const checkInitialReset = async () => {
  try {
    console.log('Checking if stops need to be reset on server start...');
    
    // Get the last reset date
    const lastReset = require('./services/locationService').lastResetDate;
    const today = new Date().toDateString();
    
    // If we don't have a last reset date or it's not today, reset all stops
    if (!lastReset || lastReset !== today) {
      console.log('INITIAL CHECK: No reset has occurred today, resetting all stops...');
      await resetStopsReached();
      console.log('Initial reset completed successfully');
    } else {
      console.log('INITIAL CHECK: Stops have already been reset today, no action needed');
    }
  } catch (error) {
    console.error('Error during initial reset check:', error);
  }
};

// Start the server
const server = app.listen(PORT, () => {
  console.log(`Tracking Server running on port ${PORT}`);
  
  try {
    // Initialize Firestore connection monitoring
    const connectionCleanup = initConnectionMonitoring();
    
    // Start location monitoring (check every 5 seconds)
    const intervals = startLocationMonitoring(5000);
    
    // Perform an initial reset check after a short delay to allow systems to initialize
    setTimeout(checkInitialReset, 10000);
    
    // Handle graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM received, shutting down gracefully');
      
      // Clear all intervals
      clearInterval(intervals.monitoringInterval);
      clearInterval(intervals.midnightCheckInterval);
      
      // Cleanup connection monitoring
      if (connectionCleanup) {
        connectionCleanup();
      }
      
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    });
    
    // Also handle SIGINT (Ctrl+C)
    process.on('SIGINT', () => {
      console.log('SIGINT received, shutting down gracefully');
      
      // Clear all intervals
      clearInterval(intervals.monitoringInterval);
      clearInterval(intervals.midnightCheckInterval);
      
      // Cleanup connection monitoring
      if (connectionCleanup) {
        connectionCleanup();
      }
      
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    });
  } catch (error) {
    console.error('Error starting location monitoring:', error.message);
    console.log('Server is running but location monitoring failed to start');
  }
});

// For testing and development
module.exports = app;