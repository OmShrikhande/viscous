import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { format } from 'date-fns';
import { toast } from 'react-toastify';
import BusTrackingMap from '../components/BusTrackingMap';
import FuturisticBackground from '../components/backgrounds/FuturisticBackground';
import GlassCard from '../components/ui/GlassCard';
import { FaBus, FaCalendarAlt, FaHistory, FaMapMarkedAlt, FaSync } from 'react-icons/fa';

const BusTracking = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationHistory, setLocationHistory] = useState([]);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [showMap, setShowMap] = useState(true); // Always show the map
  const [userId, setUserId] = useState('bus-1'); // Default bus ID

  // Check authentication and fetch initial data
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/');
    } else {
      // Fetch data on component mount
      fetchCurrentLocation();
      fetchLocationHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  // Fetch current location
  const fetchCurrentLocation = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      console.log(`Fetching current location for bus ${userId}`);
      
      const response = await axios.get(`http://localhost:5000/api/bus-location/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        console.log('Current location data source:', response.data.source);
        console.log('Raw current location data:', response.data.location);
        
        // Ensure coordinates are numbers and valid
        const location = response.data.location;
        if (location) {
          const lat = parseFloat(location.latitude);
          const lng = parseFloat(location.longitude);
          
          // Check if coordinates are valid
          if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
            const processedLocation = {
              ...location,
              latitude: lat,
              longitude: lng,
              speed: parseFloat(location.speed || 0)
            };
            
            console.log('Processed current location:', processedLocation);
            setCurrentLocation(processedLocation);
            
            // If data is from Firebase, show a success message
            if (response.data.source === 'firebase') {
              setError(null);
              toast.success('Successfully fetched real-time data from Firebase!');
            }
          } else {
            console.warn('Invalid coordinates in current location:', location);
            setCurrentLocation(null);
            toast.info('Current location has invalid coordinates', {
              position: "top-right",
              autoClose: 3000
            });
          }
        } else {
          console.log('No current location data available');
          setCurrentLocation(null);
          toast.info('No current location data available', {
            position: "top-right",
            autoClose: 3000
          });
        }
      } else {
        console.error('API returned success: false');
        toast.error('Failed to fetch current location', {
          position: "top-right",
          autoClose: 3000
        });
        setCurrentLocation(null);
      }
    } catch (err) {
      console.error('Error fetching current location:', err);
      setError(err.response?.data?.message || 'Error fetching current location');
      
      // No fallback data, just set to null
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
      const token = localStorage.getItem('token');
      console.log(`Fetching location history for bus ${userId} on date ${selectedDate}`);
      
      const response = await axios.get(`http://localhost:5000/api/bus-location/${userId}/history?date=${selectedDate}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        console.log('Location history data source:', response.data.source);
        console.log('Raw location data:', response.data.locations);
        
        // Filter out any entries with invalid coordinates
        const validLocations = response.data.locations.filter(loc => {
          const lat = parseFloat(loc.latitude);
          const lng = parseFloat(loc.longitude);
          const isValid = !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
          if (!isValid) {
            console.warn('Filtering out invalid location:', loc);
          }
          return isValid;
        });
        
        console.log(`Filtered to ${validLocations.length} valid locations`);
        
        // Convert coordinates to numbers and sort locations by timestamp
        const processedLocations = validLocations.map(loc => ({
          ...loc,
          latitude: parseFloat(loc.latitude),
          longitude: parseFloat(loc.longitude),
          speed: parseFloat(loc.speed || 0)
        }));
        
        const sortedLocations = processedLocations.sort((a, b) => 
          new Date(a.timestamp) - new Date(b.timestamp)
        );
        
        if (sortedLocations.length === 0) {
          toast.info(`No valid location data found for ${selectedDate}`, {
            position: "top-right",
            autoClose: 3000
          });
          setLocationHistory([]);
        } else {
          console.log(`Processed ${sortedLocations.length} location points`);
          
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
                userId: userId
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
                userId: userId
              };
              
              // Add the offset point
              enhancedLocations.push(offsetPoint);
            }
          }
          
          console.log('Final location history:', enhancedLocations);
          setLocationHistory(enhancedLocations);
          
          // If data is from Firebase, show a success message
          if (response.data.source === 'firebase') {
            toast.success(`Successfully fetched ${enhancedLocations.length} location points from Firebase!`);
          }
        }
      } else {
        console.error('API returned success: false');
        setError('Failed to fetch location history');
        setLocationHistory([]);
      }
    } catch (err) {
      console.error('Error fetching location history:', err);
      setError(err.response?.data?.message || 'Error fetching location history');
      
      // No fallback data, just set to empty array
      setLocationHistory([]);
      
      // Log more details about the error
      if (err.response) {
        console.error('Error response data:', err.response.data);
        console.error('Error response status:', err.response.status);
      } else if (err.request) {
        console.error('No response received:', err.request);
      } else {
        console.error('Error message:', err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle view location button click - just fetch the data
  const handleViewMap = () => {
    // Always fetch from API (which will now try Firebase first)
    fetchCurrentLocation();
    fetchLocationHistory();
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-blue-200 mb-2 flex items-center">
                  <FaBus className="mr-2" /> Bus ID
                </label>
                <input
                  type="text"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  className="w-full px-3 py-2 bg-white/10 border border-white/30 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 text-white placeholder-blue-200/70"
                  placeholder="Enter bus ID"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-blue-200 mb-2 flex items-center">
                  <FaCalendarAlt className="mr-2" /> Date
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={handleDateChange}
                  className="w-full px-3 py-2 bg-white/10 border border-white/30 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 text-white"
                />
              </div>
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
                  <FaSync className="mr-2" /> Update Location Data
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