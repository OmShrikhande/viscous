
import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, ZoomControl, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { realtimeDatabase as database, ref, onValue, off } from '../../config/firebase';
import { format } from 'date-fns';

// Fix for default marker icons in Leaflet with React
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

L.Marker.prototype.options.icon = DefaultIcon;

// Custom bus icon
const busIcon = L.icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/3448/3448339.png', // Bus icon URL
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16],
});

// Component to auto-focus map on bus location
const FocusOnBus = ({ position }) => {
  const map = useMap();
  
  useEffect(() => {
    if (position && position.lat && position.lng) {
      map.flyTo(position, 15);
    }
  }, [map, position]);
  
  return null;
};

// Component to handle map reference and zoom control
const MapController = ({ mapRef, zoomLevel }) => {
  const map = useMap();
  
  useEffect(() => {
    if (map) {
      mapRef.current = map;
    }
  }, [map, mapRef]);
  
  useEffect(() => {
    if (map && mapRef.current) {
      map.setZoom(zoomLevel);
    }
  }, [map, zoomLevel, mapRef]);
  
  return null;
};

const RealTimeTracking = () => {
  const [busData, setBusData] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const [focusOnBus, setFocusOnBus] = useState(false);
  const [lastPosition, setLastPosition] = useState({ lat: 21.1458, lng: 79.0882 }); // Default to Nagpur, India
  const [lastUpdateTime, setLastUpdateTime] = useState(null);
  const [heading, setHeading] = useState(0); // Direction the bus is traveling
  const [routeNumber, setRouteNumber] = useState('N/A');
  const [totalDistance, setTotalDistance] = useState(0);
  const [remainingDistance, setRemainingDistance] = useState(0);
  const previousPosition = useRef(null);
  const busRef = useRef(null);

  // Function to calculate heading between two points
  const calculateHeading = (prevPos, currentPos) => {
    if (!prevPos || !currentPos) return 0;
    
    const dLon = (currentPos.lng - prevPos.lng) * (Math.PI / 180);
    const y = Math.sin(dLon) * Math.cos(currentPos.lat * (Math.PI / 180));
    const x = Math.cos(prevPos.lat * (Math.PI / 180)) * Math.sin(currentPos.lat * (Math.PI / 180)) -
              Math.sin(prevPos.lat * (Math.PI / 180)) * Math.cos(currentPos.lat * (Math.PI / 180)) * Math.cos(dLon);
    const brng = Math.atan2(y, x) * (180 / Math.PI);
    
    return (brng + 360) % 360;
  };

  // Start or stop tracking
  const toggleTracking = () => {
    setIsTracking(prev => !prev);
  };

  // Toggle focus on bus
  const toggleFocus = () => {
    setFocusOnBus(prev => !prev);
  };

  // Effect for real-time tracking
  useEffect(() => {
    let busLocationRef = null;
    
    if (isTracking) {
      busLocationRef = ref(database, 'bus');
      
      onValue(busLocationRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          // Extract location data
          if (data.Location) {
            const lat = parseFloat(data.Location.Latitude);
            const lng = parseFloat(data.Location.Longitude);
            const speed = data.Location.Speed || 0;
            const timestamp = data.Location.Timestamp;
            
            // Extract route information
            const route = data.Location.Route|| 'N/A';
            setRouteNumber(route);
            
            // Extract distance information
            const total = data.Distance.TotalDistance || 0;
            const remaining = data.Distance.DailyDistance || 0;
            setTotalDistance(total);
            setRemainingDistance(remaining);
            
            // Only update if position has changed
            if (previousPosition.current && 
                (previousPosition.current.lat !== lat || previousPosition.current.lng !== lng)) {
              
              // Calculate heading
              const newHeading = calculateHeading(previousPosition.current, { lat, lng });
              setHeading(newHeading);
              
              // Update position
              setLastPosition({ lat, lng });
              setLastUpdateTime(timestamp);
              previousPosition.current = { lat, lng };
              
              // Update bus data
              setBusData({
                id: route || 'BUS001',
                lat,
                lng,
                speed: `${speed} km/h`,
                lastUpdate: timestamp,
                heading: newHeading,
                totalDistance: total,
                remainingDistance: remaining
              });
            } else if (!previousPosition.current) {
              // First position update
              setLastPosition({ lat, lng });
              setLastUpdateTime(timestamp);
              previousPosition.current = { lat, lng };
              
              // Update bus data
              setBusData({
                id: route || 'BUS001',
                lat,
                lng,
                speed: `${speed} km/h`,
                lastUpdate: timestamp,
                heading: 0,
                totalDistance: total,
                remainingDistance: remaining
              });
            }
          }
        }
      });
    }
    
    return () => {
      if (busLocationRef) {
        off(busLocationRef);
      }
    };
  }, [isTracking]);

  // Format the timestamp for display
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    
    try {
      // Parse the timestamp (assuming format "YYYY-MM-DD HH:MM:SS")
      const date = new Date(timestamp.replace(' ', 'T'));
      return format(date, 'MMM dd, yyyy HH:mm:ss');
    } catch (error) {
      console.error('Error formatting timestamp:', error);
      return timestamp; // Return original if parsing fails
    }
  };

  // Calculate time since last update
  const getTimeSinceLastUpdate = () => {
    if (!lastUpdateTime) return 'N/A';
    
    try {
      const lastUpdate = new Date(lastUpdateTime.replace(' ', 'T'));
      const now = new Date();
      const diffMs = now - lastUpdate;
      
      // Convert to minutes
      const diffMins = Math.floor(diffMs / 60000);
      
      if (diffMins < 1) {
        return 'Just now';
      } else if (diffMins === 1) {
        return '1 minute ago';
      } else if (diffMins < 60) {
        return `${diffMins} minutes ago`;
      } else {
        const hours = Math.floor(diffMins / 60);
        return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
      }
    } catch (error) {
      console.error('Error calculating time since last update:', error);
      return 'Unknown';
    }
  };
  
  // Get cardinal direction from heading
  const getDirectionFromHeading = (heading) => {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(heading / 45) % 8;
    return directions[index];
  };
  
  // Parse speed value from string (e.g., "45 km/h" -> 45)
  const parseSpeed = (speedString) => {
    if (!speedString) return 0;
    const match = speedString.match(/(\d+)/);
    return match ? parseInt(match[1]) : 0;
  };

  // Create a rotated bus icon based on heading
  const getRotatedBusIcon = () => {
    return L.divIcon({
      html: `<div style="transform: rotate(${heading}deg);">
              <img src="https://cdn-icons-png.flaticon.com/512/3448/3448339.png" 
                   style="width: 32px; height: 32px;" />
            </div>`,
      className: '',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -16],
    });
  };
  
  // State for zoom slider
  const [zoomLevel, setZoomLevel] = useState(13);
  const mapRef = useRef(null);
  
  // Handle zoom slider change
  const handleZoomChange = (e) => {
    const newZoom = parseInt(e.target.value);
    setZoomLevel(newZoom);
    if (mapRef.current) {
      mapRef.current.setZoom(newZoom);
    }
  };

  return (
    <div className="space-y-6">
      {/* Leaflet Map */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 shadow-lg overflow-hidden h-[350px] relative">
        <MapContainer 
          center={lastPosition} 
          zoom={zoomLevel} 
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
          ref={mapRef}
          className="z-0"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {lastPosition && (
            <Marker 
              position={lastPosition} 
              icon={getRotatedBusIcon()}
              ref={busRef}
            >
              <Popup>
                <div className="text-center">
                  <h3 className="font-bold">Bus Location</h3>
                  <p>Lat: {lastPosition.lat.toFixed(6)}</p>
                  <p>Lng: {lastPosition.lng.toFixed(6)}</p>
                  {busData && (
                    <>
                      <p>Speed: {busData.speed}</p>
                      <p>Last Update: {formatTimestamp(busData.lastUpdate)}</p>
                    </>
                  )}
                </div>
              </Popup>
            </Marker>
          )}
          
          {focusOnBus && <FocusOnBus position={lastPosition} />}
          
          {/* Map controller for handling map reference and zoom */}
          <MapController mapRef={mapRef} zoomLevel={zoomLevel} />
        </MapContainer>
      </div>
      
      {/* Map control buttons below the map */}
      <div className="bg-gray-900 backdrop-blur-sm rounded-lg p-3 border-2 border-gray-600 shadow-xl mt-4">
        <h3 className="text-center text-white text-sm font-semibold mb-2">Map Controls</h3>
        <div className="flex flex-wrap justify-center gap-3">
          <button 
            className={`p-2 ${isTracking ? 'bg-red-600' : 'bg-green-600'} rounded-lg hover:opacity-90 transition-colors text-white text-sm flex items-center`}
            onClick={toggleTracking}
            title={isTracking ? "Stop live tracking" : "Start live tracking"}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
              {isTracking ? (
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
              ) : (
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
              )}
            </svg>
            {isTracking ? 'Stop Tracking' : 'Start Tracking'}
          </button>
          
          <button 
            className={`p-2 ${focusOnBus ? 'bg-indigo-600' : 'bg-gray-700'} rounded-lg hover:opacity-90 transition-colors text-white text-sm flex items-center`}
            onClick={toggleFocus}
            title="Focus map on bus location"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path d="M5 8a1 1 0 011-1h1V6a1 1 0 012 0v1h1a1 1 0 110 2H9v1a1 1 0 11-2 0V9H6a1 1 0 01-1-1z" />
              <path fillRule="evenodd" d="M2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8zm6-4a4 4 0 100 8 4 4 0 000-8z" clipRule="evenodd" />
            </svg>
            Focus Bus
          </button>
          
          <button 
            className="p-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors text-white text-sm flex items-center"
            onClick={() => {
              if (busRef.current) {
                busRef.current.openPopup();
              }
            }}
            title="Show bus information"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            Bus Info
          </button>
          
          <div className="flex items-center space-x-1 bg-gray-700 rounded-lg px-2">
            <button 
              className="p-1 hover:bg-gray-600 rounded transition-colors text-white"
              onClick={() => {
                const newZoom = Math.max(3, zoomLevel - 1);
                setZoomLevel(newZoom);
                if (mapRef.current) {
                  mapRef.current.setZoom(newZoom);
                }
              }}
              title="Zoom out"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
            </button>
            
            <div className="flex flex-col items-center">
              <input 
                type="range" 
                min="3" 
                max="18" 
                value={zoomLevel} 
                onChange={handleZoomChange}
                className="w-20 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                title={`Zoom level: ${zoomLevel}`}
              />
              <span className="text-xs text-gray-300 mt-1">Zoom: {zoomLevel}</span>
            </div>
            
            <button 
              className="p-1 hover:bg-gray-600 rounded transition-colors text-white"
              onClick={() => {
                const newZoom = Math.min(18, zoomLevel + 1);
                setZoomLevel(newZoom);
                if (mapRef.current) {
                  mapRef.current.setZoom(newZoom);
                }
              }}
              title="Zoom in"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
          </div>
        </div>

      {/* Bus info panel with speedometer and distance info */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 shadow-lg p-4">
        <h2 className="text-xl font-bold mb-4">Bus Status</h2>
        <div className="grid grid-cols-1 gap-4">
          <div className="bg-gray-700/50 backdrop-blur-sm rounded-lg p-4 border border-gray-600 hover:border-indigo-500 transition-colors">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-bold text-lg">Route {routeNumber}</h3>
                <p className="text-gray-300">Bus Tracking</p>
              </div>
              <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                isTracking ? 'bg-green-500/20 text-green-400 border border-green-500/50' : 'bg-gray-500/20 text-gray-400 border border-gray-500/50'
              }`}>
                {isTracking ? 'LIVE' : 'OFFLINE'}
              </div>
            </div>
            
            {/* 4 rows of data in a compact format */}
            <div className="grid grid-cols-2 gap-3">
              {/* Row 1: Speedometer and Current Speed */}
              <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700 flex items-center">
                <div className="w-12 h-12 relative mr-2">
                  <svg viewBox="0 0 100 100" className="w-full h-full">
                    <circle cx="50" cy="50" r="45" fill="none" stroke="#374151" strokeWidth="10" />
                    <circle 
                      cx="50" 
                      cy="50" 
                      r="45" 
                      fill="none" 
                      stroke="#4F46E5" 
                      strokeWidth="10"
                      strokeDasharray="282.7"
                      strokeDashoffset={282.7 - (282.7 * (busData ? parseSpeed(busData.speed) : 0) / 100)}
                      transform="rotate(-90 50 50)"
                    />
                    <text x="50" y="55" textAnchor="middle" fontSize="18" fill="white" fontWeight="bold">
                      {busData ? parseSpeed(busData.speed) : 0}
                    </text>
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Current Speed</p>
                  <p className="font-mono text-sm font-bold">
                    {busData ? busData.speed : '0 km/h'}
                  </p>
                </div>
              </div>
              
              {/* Row 2: Location */}
              <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
                <p className="text-xs text-gray-400">Current Location</p>
                <p className="font-mono text-sm">
                  {lastPosition ? `${lastPosition.lat.toFixed(5)}, ${lastPosition.lng.toFixed(5)}` : 'N/A'}
                </p>
              </div>
              
              {/* Row 3: Distance Information */}
              <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
                <p className="text-xs text-gray-400">Distance</p>
                <div className="flex justify-between">
                  <div>
                    <p className="text-xs">Total:</p>
                    <p className="font-mono text-sm">{totalDistance} km</p>
                  </div>
                  <div>
                    <p className="text-xs">Todays distance:</p>
                    <p className="font-mono text-sm">{remainingDistance} km</p>
                  </div>
                </div>
              </div>
              
              {/* Row 4: Last Update and Heading */}
              <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
                <div className="flex justify-between">
                  <div>
                    <p className="text-xs text-gray-400">Last Update</p>
                    <p className="font-mono text-xs">
                      {getTimeSinceLastUpdate()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Heading</p>
                    <p className="font-mono text-xs">
                      {heading.toFixed(0)}° {getDirectionFromHeading(heading)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button 
                className={`py-2 ${isTracking ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'} rounded-lg transition-colors text-sm font-medium`}
                onClick={toggleTracking}
              >
                {isTracking ? 'Stop Tracking' : 'Start Tracking'}
              </button>
              <button 
                className="py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors text-sm font-medium"
                onClick={toggleFocus}
              >
                Focus on Map
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RealTimeTracking;