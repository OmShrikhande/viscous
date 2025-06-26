import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { format } from 'date-fns';
import { toast } from 'react-toastify';
import BusTrackingMap from '../components/BusTrackingMap';
import FuturisticBackground from '../components/backgrounds/FuturisticBackground';
import GlassCard from '../components/ui/GlassCard';
import { FaBus, FaCalendarAlt, FaHistory, FaMapMarkedAlt, FaSync } from 'react-icons/fa';
import { realtimeDb } from '../config/firebase';
import { ref, onValue, off, get } from 'firebase/database';

const BusTracking = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationHistory, setLocationHistory] = useState([]);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [showMap, setShowMap] = useState(true); // Always show the map
  // Fixed bus ID - no need for user to change it
  const busId = 'bus-1'; // Hardcoded bus ID
  
  // Refs for Firebase listeners and data caching
  const locationListenerRef = useRef(null);
  const lastLocationRef = useRef(null);
  const lastUpdateTimeRef = useRef(0);
  const noChangeCountRef = useRef(0);
  const inactivityTimerRef = useRef(null);
  
  // Check authentication and setup Firebase listeners
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/');
    } else {
      // Setup Firebase listener for current location
      setupLocationListener(busId);
      // Fetch historical data
      fetchLocationHistory();
    }
    
    // Cleanup function to remove listeners when component unmounts
    return () => {
      cleanupLocationListener();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  // Setup Firebase real-time listener for current location
  const setupLocationListener = (busId) => {
    if (!busId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      console.log(`Setting up real-time listener for bus ${busId}`);
      
      // Reference to the current location in Firebase
      // Use the direct path to the bus location
      const locationRef = ref(realtimeDb, `buses/${busId}/currentLocation`);
      
      // Remove any existing listener
      if (locationListenerRef.current) {
        off(locationListenerRef.current);
      }
      
      // Set up the new listener
      locationListenerRef.current = locationRef;
      
      // Listen for changes - always update immediately on first data
      onValue(locationRef, (snapshot) => {
        const locationData = snapshot.val();
        console.log('Firebase real-time update received:', locationData);
        
        if (locationData) {
          // Always update on first data reception
          const isFirstUpdate = !lastLocationRef.current;
          
          // Process the location data
          processLocationData(locationData, isFirstUpdate);
          setLoading(false);
        } else {
          console.log('No location data available in Firebase');
          setCurrentLocation(null);
          setLoading(false);
          
          // Fallback to REST API if no data in Firebase
          fallbackToRestApi(busId);
        }
      }, (error) => {
        console.error('Firebase listener error:', error);
        setError('Error connecting to real-time database: ' + error.message);
        setLoading(false);
        
        // Fallback to REST API if Firebase listener fails
        fallbackToRestApi(busId);
      });
      
    } catch (err) {
      console.error('Error setting up Firebase listener:', err);
      setError('Error setting up real-time tracking: ' + err.message);
      setLoading(false);
      
      // Fallback to REST API
      fallbackToRestApi(busId);
    }
  };
  
  // Clean up Firebase listener
  const cleanupLocationListener = () => {
    if (locationListenerRef.current) {
      console.log('Removing Firebase listener');
      off(locationListenerRef.current);
      locationListenerRef.current = null;
    }
    
    // Clear any inactivity timer
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
  };
  
  // Process location data with optimization logic
  const processLocationData = (locationData, isFirstUpdate = false) => {
    if (!locationData) {
      console.log('No location data available');
      setCurrentLocation(null);
      return;
    }
    
    // Ensure coordinates are numbers and valid
    const lat = parseFloat(locationData.latitude);
    const lng = parseFloat(locationData.longitude);
    
    // Check if coordinates are valid
    if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) {
      console.warn('Invalid coordinates in location data:', locationData);
      setCurrentLocation(null);
      return;
    }
    
    const processedLocation = {
      ...locationData,
      latitude: lat,
      longitude: lng,
      speed: parseFloat(locationData.speed || 0),
      timestamp: locationData.timestamp || new Date().toISOString()
    };
    
    // Check if the location has actually changed
    const hasChanged = hasLocationChanged(processedLocation, lastLocationRef.current);
    
    // Get current time
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdateTimeRef.current;
    
    // Update UI if:
    // 1. It's the first update after component mount
    // 2. Location has changed, or
    // 3. It's been more than 30 seconds since the last update
    if (isFirstUpdate || hasChanged || timeSinceLastUpdate > 30000) {
      console.log('Updating location display:', processedLocation);
      setCurrentLocation(processedLocation);
      lastLocationRef.current = processedLocation;
      lastUpdateTimeRef.current = now;
      noChangeCountRef.current = 0;
      
      // If location has changed, show a success message (but not too frequently)
      if ((hasChanged || isFirstUpdate) && timeSinceLastUpdate > 5000) {
        setError(null);
        toast.success('Real-time location updated from Firebase!', {
          position: "top-right",
          autoClose: 2000
        });
      }
    } else {
      // Location hasn't changed
      noChangeCountRef.current++;
      console.log(`Location unchanged (${noChangeCountRef.current} consecutive times)`);
      
      // If location hasn't changed for a while, reduce update frequency
      if (noChangeCountRef.current >= 10) {
        // After 10 consecutive unchanged updates, pause the listener for 10 minutes
        if (!inactivityTimerRef.current) {
          console.log('Location unchanged for extended period, pausing real-time updates for 10 minutes');
          toast.info('Bus appears stationary. Reducing update frequency to save resources.', {
            position: "top-right",
            autoClose: 5000
          });
          
          // Temporarily remove the listener
          if (locationListenerRef.current) {
            off(locationListenerRef.current);
          }
          
          // Set a timer to restore the listener after 10 minutes
          inactivityTimerRef.current = setTimeout(() => {
            console.log('Resuming real-time updates after inactivity period');
            setupLocationListener(busId);
            inactivityTimerRef.current = null;
            noChangeCountRef.current = 0;
          }, 10 * 60 * 1000); // 10 minutes
        }
      }
    }
  };
  
  // Check if location has meaningfully changed
  const hasLocationChanged = (newLocation, oldLocation) => {
    if (!oldLocation) return true;
    
    // Calculate distance between points (simple approximation)
    const latDiff = Math.abs(newLocation.latitude - oldLocation.latitude);
    const lngDiff = Math.abs(newLocation.longitude - oldLocation.longitude);
    
    // Consider it changed if coordinates differ by more than a small threshold
    // This helps filter out minor GPS fluctuations
    const coordinatesChanged = latDiff > 0.0001 || lngDiff > 0.0001;
    
    // Also check if speed has changed significantly
    const speedChanged = Math.abs(newLocation.speed - oldLocation.speed) > 3; // 3 km/h threshold
    
    return coordinatesChanged || speedChanged;
  };
  
  // Fallback to REST API if Firebase fails
  const fallbackToRestApi = async (busId) => {
    console.log('Falling back to REST API for location data');
    
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await axios.get(`http://localhost:5000/api/bus-location/${busId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success && response.data.location) {
        console.log('REST API fallback successful:', response.data.location);
        // Always update on fallback (treat as first update)
        processLocationData(response.data.location, true);
      } else {
        console.error('REST API returned no data');
        setCurrentLocation(null);
      }
    } catch (err) {
      console.error('Error in REST API fallback:', err);
      setError('Could not retrieve location data: ' + err.message);
      setCurrentLocation(null);
    } finally {
      setLoading(false);
    }
  };

  // Fetch location history for a specific date
  const fetchLocationHistory = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log(`Fetching location history for bus ${busId} on date ${selectedDate}`);
      
      // Try to fetch directly from Firebase first
      const historyFromFirebase = await fetchHistoryFromFirebase(busId, selectedDate);
      
      if (historyFromFirebase && historyFromFirebase.length > 0) {
        // Process and use the Firebase data
        processHistoryData(historyFromFirebase, 'firebase');
      } else {
        // Fall back to REST API if Firebase doesn't have the data
        await fetchHistoryFromApi();
      }
    } catch (err) {
      console.error('Error fetching location history:', err);
      setError('Error fetching location history: ' + err.message);
      setLocationHistory([]);
      
      // Try the API as a fallback
      try {
        await fetchHistoryFromApi();
      } catch (apiErr) {
        console.error('API fallback also failed:', apiErr);
      }
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch history directly from Firebase
  const fetchHistoryFromFirebase = async (busId, date) => {
    try {
      // Reference to the history data in Firebase
      // Assuming a structure like: buses/{busId}/history/{date}
      const historyRef = ref(realtimeDb, `buses/${busId}/history/${date.replace(/-/g, '')}`);
      
      // Get the data once (not a real-time listener for historical data)
      const snapshot = await get(historyRef);
      
      if (snapshot.exists()) {
        console.log('History data found in Firebase');
        
        // Convert the Firebase object to an array
        const historyData = snapshot.val();
        const historyArray = [];
        
        // If it's an object with timestamp keys
        if (typeof historyData === 'object' && !Array.isArray(historyData)) {
          Object.keys(historyData).forEach(key => {
            historyArray.push({
              ...historyData[key],
              timestamp: historyData[key].timestamp || key // Use the key as timestamp if not provided
            });
          });
        } else if (Array.isArray(historyData)) {
          // If it's already an array
          return historyData;
        }
        
        return historyArray;
      } else {
        console.log('No history data found in Firebase for this date');
        return null;
      }
    } catch (err) {
      console.error('Error fetching history from Firebase:', err);
      return null;
    }
  };
  
  // Fetch history from REST API
  const fetchHistoryFromApi = async () => {
    try {
      const token = localStorage.getItem('token');
      
      const response = await axios.get(`http://localhost:5000/api/bus-location/${busId}/history?date=${selectedDate}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        console.log('Location history data source:', response.data.source);
        console.log('Raw location data from API:', response.data.locations);
        
        // Process the API response data
        processHistoryData(response.data.locations, response.data.source);
      } else {
        console.error('API returned success: false');
        setError('Failed to fetch location history');
        setLocationHistory([]);
      }
    } catch (err) {
      console.error('Error fetching history from API:', err);
      throw err; // Re-throw to be handled by the caller
    }
  };
  
  // Process history data from any source
  const processHistoryData = (locationsData, source) => {
    if (!locationsData || locationsData.length === 0) {
      toast.info(`No location data found for ${selectedDate}`, {
        position: "top-right",
        autoClose: 3000
      });
      setLocationHistory([]);
      return;
    }
    
    // Filter out any entries with invalid coordinates
    const validLocations = locationsData.filter(loc => {
      const lat = parseFloat(loc.latitude);
      const lng = parseFloat(loc.longitude);
      const isValid = !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
      if (!isValid) {
        console.warn('Filtering out invalid location:', loc);
      }
      return isValid;
    });
    
    console.log(`Filtered to ${validLocations.length} valid locations`);
    
    if (validLocations.length === 0) {
      toast.info(`No valid location data found for ${selectedDate}`, {
        position: "top-right",
        autoClose: 3000
      });
      setLocationHistory([]);
      return;
    }
    
    // Convert coordinates to numbers and sort locations by timestamp
    const processedLocations = validLocations.map(loc => ({
      ...loc,
      latitude: parseFloat(loc.latitude),
      longitude: parseFloat(loc.longitude),
      speed: parseFloat(loc.speed || 0),
      timestamp: loc.timestamp || new Date().toISOString()
    }));
    
    const sortedLocations = processedLocations.sort((a, b) => 
      new Date(a.timestamp) - new Date(b.timestamp)
    );
    
    // Ensure we have at least 3 points for a proper path
    let enhancedLocations = [...sortedLocations];
    
    if (sortedLocations.length < 3 && sortedLocations.length > 0) {
      console.log('Adding intermediate points for better visualization');
      
      // Create intermediate points if we have at least 2 points
      if (sortedLocations.length === 2) {
        const start = sortedLocations[0];
        const end = sortedLocations[1];
        
        // Create a middle point
        const middlePoint = {
          id: 'middle',
          latitude: (start.latitude + end.latitude) / 2,
          longitude: (start.longitude + end.longitude) / 2,
          timestamp: new Date((new Date(start.timestamp).getTime() + new Date(end.timestamp).getTime()) / 2).toISOString(),
          speed: (start.speed + end.speed) / 2,
          userId: busId
        };
        
        // Insert the middle point
        enhancedLocations.splice(1, 0, middlePoint);
      } 
      // If we only have one point, duplicate it with slight offset
      else if (sortedLocations.length === 1) {
        const point = sortedLocations[0];
        
        // Create a second point with slight offset
        const offsetPoint = {
          id: 'offset',
          latitude: point.latitude + 0.0001, // Small offset
          longitude: point.longitude + 0.0001,
          timestamp: new Date(new Date(point.timestamp).getTime() + 60000).toISOString(), // 1 minute later
          speed: point.speed,
          userId: busId
        };
        
        // Add the offset point
        enhancedLocations.push(offsetPoint);
      }
    }
    
    console.log('Final location history:', enhancedLocations);
    setLocationHistory(enhancedLocations);
    
    // Show a success message based on the data source
    if (source === 'firebase') {
      toast.success(`Successfully fetched ${enhancedLocations.length} location points from Firebase!`);
    } else {
      toast.info(`Loaded ${enhancedLocations.length} location points from the server`);
    }
  };

  // Handle refresh button click
  const handleViewMap = () => {
    // For current location, reset the listener
    cleanupLocationListener();
    setupLocationListener(busId);
    
    // For history, fetch the data for the selected date
    fetchLocationHistory();
    
    toast.info('Refreshing location data...', {
      position: "top-right",
      autoClose: 2000
    });
  };

  // Handle date change and automatically fetch new data
  const handleDateChange = (e) => {
    setSelectedDate(e.target.value);
    // Fetch new data for the selected date
    setTimeout(() => {
      fetchLocationHistory();
    }, 100); // Small delay to ensure state is updated
  };

  // Handle back to dashboard
  const handleBackToDashboard = () => {
    // Clean up listeners before navigating away
    cleanupLocationListener();
    navigate('/dashboard');
  };

  return (
    <FuturisticBackground variant="analytics">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-800 to-purple-800 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <FaBus className="text-3xl text-white" />
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-200 to-purple-200">
              Bus Tracking System
            </h1>
          </div>
          <button 
            onClick={handleBackToDashboard}
            className="px-4 py-2 bg-white/10 backdrop-blur-sm text-white rounded-md hover:bg-white/20 transition-colors border border-white/30 shadow-lg"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <GlassCard className="overflow-hidden rounded-xl">
          <div className="p-6 border-b border-white/20">
            <div className="flex items-center space-x-3">
              <FaMapMarkedAlt className="text-2xl text-blue-400" />
              <div>
                <h2 className="text-xl font-semibold text-white">Bus Location Tracker</h2>
                <p className="mt-1 text-sm text-blue-200">View real-time bus location and historical routes</p>
              </div>
            </div>
          </div>
          
          <div className="p-6">
            <div className="mb-6">
              <label className="block text-sm font-medium text-blue-200 mb-2 flex items-center">
                <FaCalendarAlt className="mr-2" /> Select Date for History
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={handleDateChange}
                className="w-full px-3 py-2 bg-white/10 border border-white/30 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 text-white"
              />
            </div>
            
            <button 
              onClick={handleViewMap}
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium py-3 px-4 rounded-md transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-lg flex items-center justify-center"
            >
              {loading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Loading...
                </span>
              ) : (
                <span className="flex items-center">
                  <FaSync className="mr-2" /> Refresh Real-time Location
                </span>
              )}
            </button>
            
            {error && (
              <div className="mt-4 p-4 bg-red-500/20 border border-red-400/40 text-red-200 rounded-md">
                {error}
              </div>
            )}
          </div>
          
          {showMap && (
            <div className="p-6 border-t border-white/20">
              <div className="mb-4 flex justify-between items-center">
                <h3 className="text-lg font-medium text-white flex items-center">
                  <FaMapMarkedAlt className="mr-2 text-blue-400" /> Bus Location Map
                </h3>
                <span className="text-sm text-blue-200 bg-blue-500/20 px-3 py-1 rounded-full">
                  {selectedDate}
                </span>
              </div>
              
              <div className="h-[500px] rounded-lg overflow-hidden border border-white/30 shadow-inner mb-6">
                <BusTrackingMap
                  currentLocation={currentLocation}
                  locationHistory={locationHistory}
                  isLive={true}
                />
              </div>
              
              <div className="mt-6">
                <h4 className="text-md font-medium text-white mb-3 flex items-center">
                  <FaHistory className="mr-2 text-blue-400" /> Location History:
                </h4>
                {locationHistory.length > 0 ? (
                  <div className="max-h-[300px] overflow-y-auto border border-white/20 rounded-md bg-black/20 backdrop-blur-sm">
                    <table className="min-w-full divide-y divide-white/10">
                      <thead className="bg-white/5">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-blue-200 uppercase tracking-wider">Time</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-blue-200 uppercase tracking-wider">Coordinates</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-blue-200 uppercase tracking-wider">Speed</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/10">
                        {locationHistory.map((location, index) => (
                          <tr key={index} className={index % 2 === 0 ? 'bg-white/5' : 'bg-white/10'}>
                            <td className="px-6 py-3 whitespace-nowrap text-sm text-white">
                              {new Date(location.timestamp).toLocaleTimeString()}
                            </td>
                            <td className="px-6 py-3 whitespace-nowrap text-sm text-blue-200">
                              {typeof location.latitude === 'number' 
                                ? location.latitude.toFixed(5) 
                                : parseFloat(location.latitude).toFixed(5)}, 
                              {typeof location.longitude === 'number' 
                                ? location.longitude.toFixed(5) 
                                : parseFloat(location.longitude).toFixed(5)}
                            </td>
                            <td className="px-6 py-3 whitespace-nowrap text-sm text-blue-200">
                              <span className="bg-blue-500/20 px-2 py-1 rounded-full">
                                {location.speed} km/h
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-blue-200 bg-blue-500/10 p-4 rounded-md border border-blue-400/20 text-center">
                    No location history available for this date.
                  </div>
                )}
              </div>
            </div>
          )}
        </GlassCard>
      </div>
    </FuturisticBackground>
  );
};

export default BusTracking;