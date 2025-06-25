import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';

// Fix leaflet's default icon path
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Custom bus icon
const busIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/3448/3448339.png',
  iconSize: [38, 38],
  iconAnchor: [19, 38],
  popupAnchor: [0, -38],
});

// Helper component to focus map on marker
const FocusButton = ({ lat, lng }) => {
  const map = useMap();
  const handleFocus = () => {
    map.setView([lat, lng], 15, { animate: true });
  };
  
  return (
    <button
      type="button"
      onClick={handleFocus}
      className="absolute top-4 right-4 z-[1000] bg-gradient-to-r from-indigo-500 to-pink-500 hover:from-indigo-600 hover:to-pink-600 text-white font-semibold py-1.5 px-4 rounded-lg shadow-lg transition-all duration-300 text-sm"
      style={{ pointerEvents: 'auto' }}
    >
      Focus Bus
    </button>
  );
};

// Helper component to fit map to route bounds
const FitBoundsToRoute = ({ positions }) => {
  const map = useMap();
  
  useEffect(() => {
    if (positions && positions.length > 0) {
      const bounds = L.latLngBounds(positions);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [map, positions]);
  
  return null;
};

const BusTrackingMap = ({ userId, routeName }) => {
  const [busLocation, setBusLocation] = useState(null);
  const [routePositions, setRoutePositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isLiveTracking, setIsLiveTracking] = useState(true);
  
  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown time';
    const options = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };
  
  // Calculate distance between two points in kilometers
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    const distance = R * c; // Distance in km
    return distance;
  };
  
  // Calculate total route distance
  const calculateRouteDistance = (positions) => {
    if (!positions || positions.length < 2) return 0;
    
    let totalDistance = 0;
    for (let i = 0; i < positions.length - 1; i++) {
      const [lat1, lon1] = positions[i];
      const [lat2, lon2] = positions[i + 1];
      totalDistance += calculateDistance(lat1, lon1, lat2, lon2);
    }
    
    return totalDistance.toFixed(2);
  };

  // Filter locations by date
  const filterLocationsByDate = (date) => {
    setSelectedDate(date);
    setIsLiveTracking(false);
    fetchLocationHistory(date);
  };

  // Fetch location history for a specific date
  const fetchLocationHistory = async (date) => {
    setLoading(true);
    try {
      const selectedDateObj = new Date(date);
      selectedDateObj.setHours(0, 0, 0, 0); // Start of day
      
      const nextDay = new Date(selectedDateObj);
      nextDay.setDate(nextDay.getDate() + 1); // End of day (start of next day)
      
      // Create a query against the location collection
      const locationsRef = collection(db, 'locations');
      const q = query(
        locationsRef,
        where('userId', '==', userId),
        where('timestamp', '>=', selectedDateObj),
        where('timestamp', '<', nextDay),
        orderBy('timestamp', 'asc')
      );
      
      // Execute the query
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const locations = [];
        querySnapshot.forEach((doc) => {
          locations.push({
            id: doc.id,
            ...doc.data()
          });
        });
        
        if (locations.length > 0) {
          // Set the most recent location
          const mostRecentLocation = locations[locations.length - 1];
          setBusLocation({
            latitude: mostRecentLocation.latitude,
            longitude: mostRecentLocation.longitude,
            timestamp: mostRecentLocation.timestamp.toDate()
          });
          
          // Extract coordinates for the route
          const coordinates = locations.map(loc => [
            parseFloat(loc.latitude),
            parseFloat(loc.longitude)
          ]).filter(coord => !isNaN(coord[0]) && !isNaN(coord[1]));
          
          setRoutePositions(coordinates);
        } else {
          setBusLocation(null);
          setRoutePositions([]);
        }
        
        setLoading(false);
      });
      
      return unsubscribe;
    } catch (error) {
      console.error('Error fetching location history:', error);
      setError('Failed to load location history');
      setLoading(false);
    }
  };

  // Start live tracking
  const startLiveTracking = () => {
    setIsLiveTracking(true);
    setupLiveTracking();
  };

  // Setup live tracking from Firebase
  const setupLiveTracking = () => {
    setLoading(true);
    try {
      // Create a query against the location collection for the most recent locations
      const locationsRef = collection(db, 'locations');
      const q = query(
        locationsRef,
        where('userId', '==', userId),
        orderBy('timestamp', 'desc'),
        // Limit to the last 100 locations to avoid performance issues
        // This can be adjusted based on your needs
      );
      
      // Execute the query and listen for real-time updates
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const locations = [];
        querySnapshot.forEach((doc) => {
          locations.push({
            id: doc.id,
            ...doc.data()
          });
        });
        
        // Sort locations by timestamp (oldest first)
        locations.sort((a, b) => a.timestamp.toDate() - b.timestamp.toDate());
        
        if (locations.length > 0) {
          // Set the most recent location
          const mostRecentLocation = locations[locations.length - 1];
          setBusLocation({
            latitude: mostRecentLocation.latitude,
            longitude: mostRecentLocation.longitude,
            timestamp: mostRecentLocation.timestamp.toDate()
          });
          
          // Extract coordinates for the route
          const coordinates = locations.map(loc => [
            parseFloat(loc.latitude),
            parseFloat(loc.longitude)
          ]).filter(coord => !isNaN(coord[0]) && !isNaN(coord[1]));
          
          setRoutePositions(coordinates);
        } else {
          setBusLocation(null);
          setRoutePositions([]);
        }
        
        setLoading(false);
      });
      
      return unsubscribe;
    } catch (error) {
      console.error('Error setting up live tracking:', error);
      setError('Failed to start live tracking');
      setLoading(false);
    }
  };

  // Initialize tracking on component mount
  useEffect(() => {
    let unsubscribe;
    
    if (isLiveTracking) {
      unsubscribe = setupLiveTracking();
    } else {
      unsubscribe = fetchLocationHistory(selectedDate);
    }
    
    // Cleanup function
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [userId, isLiveTracking]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full w-full text-indigo-400 animate-pulse">
        Loading map...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full w-full text-red-500">
        {error}
      </div>
    );
  }

  if (!busLocation && routePositions.length === 0) {
    return (
      <div className="flex items-center justify-center h-full w-full text-gray-500 dark:text-gray-400">
        No location data available for this date
      </div>
    );
  }

  // Center on the most recent location or the first route position
  const centerPosition = busLocation 
    ? [busLocation.latitude, busLocation.longitude] 
    : routePositions.length > 0 
      ? routePositions[routePositions.length - 1] 
      : [0, 0];

  return (
    <div className="w-full flex flex-col space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
        <div className="flex items-center space-x-4">
          <button
            onClick={startLiveTracking}
            className={`px-4 py-2 rounded-lg transition-all duration-300 ${
              isLiveTracking 
                ? 'bg-green-500/80 text-white' 
                : 'bg-white/30 hover:bg-green-500/50 text-white'
            }`}
          >
            Live Tracking
          </button>
          
          <div className="flex items-center space-x-2">
            <span className="text-white">History:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => filterLocationsByDate(e.target.value)}
              className="bg-white/30 border border-white/40 rounded-lg px-3 py-2 text-white"
              max={new Date().toISOString().split('T')[0]}
            />
          </div>
        </div>
        
        <div className="text-white">
          <span className="font-semibold">Route:</span> {routeName || 'Unknown'}
          {routePositions.length > 1 && (
            <span className="ml-4">
              <span className="font-semibold">Distance:</span> {calculateRouteDistance(routePositions)} km
            </span>
          )}
        </div>
      </div>
      
      {/* Map */}
      <div className="rounded-2xl overflow-hidden border-2 border-indigo-200 dark:border-indigo-700 shadow-lg w-full h-[500px] relative">
        <MapContainer
          center={centerPosition}
          zoom={13}
          className="w-full h-full bg-white dark:bg-gray-900"
          style={{ height: '100%', width: '100%', position: 'relative' }}
        >
          <TileLayer
            attribution='© OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {/* Current bus location marker */}
          {busLocation && (
            <Marker position={[busLocation.latitude, busLocation.longitude]} icon={busIcon}>
              <Popup>
                <div className="text-center">
                  <div className="font-semibold">Current Bus Location</div>
                  <div className="text-xs text-gray-600 mt-1">
                    {formatDate(busLocation.timestamp)}
                  </div>
                  <div className="text-xs mt-1">
                    {Number(busLocation.latitude).toFixed(6)}, {Number(busLocation.longitude).toFixed(6)}
                  </div>
                </div>
              </Popup>
            </Marker>
          )}
          
          {/* Route polyline */}
          {routePositions.length > 1 && (
            <>
              {/* Main route track */}
              <Polyline 
                positions={routePositions}
                pathOptions={{ 
                  color: '#6366F1', // Indigo color
                  weight: 5,
                  opacity: 0.7,
                  lineCap: 'round',
                  lineJoin: 'round'
                }}
              />
              
              {/* Route highlight effect */}
              <Polyline 
                positions={routePositions}
                pathOptions={{ 
                  color: '#C4B5FD', // Light indigo
                  weight: 2,
                  opacity: 0.9,
                  lineCap: 'round',
                  lineJoin: 'round',
                  dashArray: '10, 10',
                  dashOffset: '0'
                }}
              />
              
              {/* Direction arrow effect */}
              <Polyline 
                positions={routePositions}
                pathOptions={{ 
                  color: '#4F46E5', // Darker indigo
                  weight: 3,
                  opacity: 0.8,
                  lineCap: 'round',
                  lineJoin: 'round',
                  dashArray: '0, 15, 10, 15',
                  dashOffset: '0'
                }}
              />
              
              {/* Add markers for key points in the route */}
              <Marker 
                position={routePositions[0]}
                opacity={0.9}
              >
                <Popup>
                  <div className="text-center">
                    <div className="font-semibold">Starting Point</div>
                    <div className="text-xs mt-1">
                      {Number(routePositions[0][0]).toFixed(6)}, {Number(routePositions[0][1]).toFixed(6)}
                    </div>
                  </div>
                </Popup>
              </Marker>
              
              {/* Fit map to route bounds */}
              <FitBoundsToRoute positions={routePositions} />
            </>
          )}
          
          {/* Focus button */}
          {busLocation && (
            <FocusButton lat={busLocation.latitude} lng={busLocation.longitude} />
          )}
        </MapContainer>
      </div>
      
      {/* Status indicator */}
      <div className="flex items-center justify-between p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 text-white">
        <div>
          <span className="font-semibold">Status:</span> {
            isLiveTracking 
              ? <span className="text-green-400">Live Tracking Active</span> 
              : <span className="text-blue-400">Showing History for {new Date(selectedDate).toLocaleDateString()}</span>
          }
        </div>
        
        {busLocation && (
          <div>
            <span className="font-semibold">Last Updated:</span> {formatDate(busLocation.timestamp)}
          </div>
        )}
      </div>
    </div>
  );
};

export default BusTrackingMap;