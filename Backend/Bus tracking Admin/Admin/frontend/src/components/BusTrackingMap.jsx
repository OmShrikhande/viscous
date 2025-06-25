import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { FaBus } from 'react-icons/fa';
import axios from 'axios';
import 'leaflet-polylinedecorator';
import './BusTrackingMap.css';

// OpenRouteService API key
const ORS_API_KEY = "5b3ce3597851110001cf624849f7d76714eb412994780d06dcd7c932";

// Fix for Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Function to create a very clear directional bus icon
const createDirectionalBusIcon = (heading = 0) => {
  return L.divIcon({
    html: `<div class="bus-icon" style="transform: rotate(${heading}deg)">
            <div class="bus-direction-arrow">
              <div class="arrow-head"></div>
              <div class="arrow-body"></div>
            </div>
          </div>`,
    className: 'directional-bus-icon',
    iconSize: [40, 40],
    iconAnchor: [20, 20]
  });
};

// Default bus icon for backward compatibility
const busIcon = createDirectionalBusIcon(0);

// Create bus stop icon function (unchanged)
const createBusStopIcon = (reached) => {
  return L.divIcon({
    html: `<div class="bus-stop-icon ${reached ? 'reached' : ''}">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2c-4.42 0-8 .5-8 4v10c0 .88.39 1.67 1 2.22V20c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h8v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4z"/>
            </svg>
          </div>`,
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });
};

// Function to fetch route between coordinates using OpenRouteService
const fetchRoute = async (coordinates) => {
  try {
    console.log(`Fetching route with ${coordinates.length} points`);

    // Validate coordinates
    for (const coord of coordinates) {
      if (isNaN(coord[0]) || isNaN(coord[1])) {
        console.error('Invalid coordinates for route:', coord);
        return null;
      }
    }

    // Convert to [lng, lat] for OpenRouteService
    const orsCoordinates = coordinates.map(coord => [coord[1], coord[0]]);

    console.log('OpenRouteService coordinates:', orsCoordinates);

    // Handle multiple waypoints (chunk if necessary due to API limits)
    let combinedGeoJSON = { type: 'FeatureCollection', features: [] };
    const chunkSize = 10; // OpenRouteService free tier limit
    if (orsCoordinates.length > chunkSize) {
      console.log('Processing coordinates in chunks due to API limits');
      for (let i = 0; i < orsCoordinates.length - 1; i += chunkSize - 1) {
        const chunkEnd = Math.min(i + chunkSize, orsCoordinates.length);
        const chunk = orsCoordinates.slice(i, chunkEnd);

        if (chunk.length < 2) continue;

        const response = await fetch('https://api.openrouteservice.org/v2/directions/driving-car/geojson', {
          method: 'POST',
          headers: {
            'Authorization': ORS_API_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ coordinates: chunk })
        });

        if (!response.ok) {
          throw new Error(`OpenRouteService API error for chunk ${i}-${chunkEnd-1}: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        if (data && data.features) {
          combinedGeoJSON.features = combinedGeoJSON.features.concat(data.features);
        }

        // Delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } else {
      const response = await fetch('https://api.openrouteservice.org/v2/directions/driving-car/geojson', {
        method: 'POST',
        headers: {
          'Authorization': ORS_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ coordinates: orsCoordinates })
      });

      if (!response.ok) {
        throw new Error(`OpenRouteService API error: ${response.status} ${response.statusText}`);
      }

      combinedGeoJSON = await response.json();
    }

    if (combinedGeoJSON.features.length === 0) {
      console.error('No valid route data returned from OpenRouteService');
      return null;
    }

    console.log('Route fetched successfully:', combinedGeoJSON);
    return combinedGeoJSON;
  } catch (error) {
    console.error('Error fetching route:', error.message);
    return null;
  }
};

const BusTrackingMap = ({ currentLocation, locationHistory, isLive }) => {
  const mapRef = useRef(null);
  const leafletMapRef = useRef(null);
  const markersLayerRef = useRef(null);
  const routeLayerRef = useRef(null);
  const busMarkerRef = useRef(null);
  const busStopsLayerRef = useRef(null);
  const busRouteLayerRef = useRef(null);
  const [busStops, setBusStops] = useState([]);
  const [errorMessage, setErrorMessage] = useState(null); // New state for error messages

    // Fetch bus stops (unchanged)
    const fetchBusStops = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await axios.get('http://localhost:5000/api/bus-stops', {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (response.data.success && response.data.stops) {
          console.log(`Fetched ${response.data.stops.length} bus stops`);
          setBusStops(response.data.stops);
        }
      } catch (error) {
        console.error('Error fetching bus stops:', error);
        setErrorMessage('Failed to fetch bus stops');
      }
    };

    // Initialize map (unchanged)
    useEffect(() => {
      if (!leafletMapRef.current) {
        leafletMapRef.current = L.map(mapRef.current).setView([28.6139, 77.2090], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(leafletMapRef.current);
        markersLayerRef.current = L.layerGroup().addTo(leafletMapRef.current);
        routeLayerRef.current = L.layerGroup().addTo(leafletMapRef.current);
        busStopsLayerRef.current = L.layerGroup().addTo(leafletMapRef.current);
        busRouteLayerRef.current = L.layerGroup().addTo(leafletMapRef.current);
        fetchBusStops();
      }

      return () => {
        if (leafletMapRef.current) {
          leafletMapRef.current.remove();
          leafletMapRef.current = null;
        }
      };
    }, []);

    // We're not connecting bus stops with routes anymore
    // Instead, we'll focus on displaying the actual bus path from location history

    // Display bus stops (unchanged)
    useEffect(() => {
      if (leafletMapRef.current && busStopsLayerRef.current && busStops.length > 0) {
        busStopsLayerRef.current.clearLayers();
        busStops.forEach(stop => {
          const lat = Number(stop.latitude);
          const lng = Number(stop.longitude);
          if (!isNaN(lat) && !isNaN(lng)) {
            L.marker([lat, lng], { icon: createBusStopIcon(stop.reached) })
              .addTo(busStopsLayerRef.current)
              .bindPopup(`
                <div class="bus-stop-popup">
                  <div class="bus-stop-name">${stop.name}</div>
                  <div class="bus-stop-status">
                    Status: ${stop.reached ? 'Reached' : 'Not Reached'}
                  </div>
                  ${stop.reachedTime ? `<div class="bus-stop-time">Reached at: ${stop.reachedTime}</div>` : ''}
                </div>
              `);
            L.marker([lat, lng], {
              icon: L.divIcon({
                html: `<div class="stop-label">${stop.name}</div>`,
                className: 'stop-label-container',
                iconSize: [80, 20],
                iconAnchor: [40, -5]
              })
            }).addTo(busStopsLayerRef.current);
          }
        });

      }
    }, [busStops]);

    // Calculate heading based on previous and current location
    const calculateHeading = (prevLat, prevLng, currLat, currLng) => {
      // Convert to radians
      const lat1 = prevLat * Math.PI / 180;
      const lat2 = currLat * Math.PI / 180;
      const lng1 = prevLng * Math.PI / 180;
      const lng2 = currLng * Math.PI / 180;
      
      // Calculate heading
      const y = Math.sin(lng2 - lng1) * Math.cos(lat2);
      const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(lng2 - lng1);
      const heading = Math.atan2(y, x) * 180 / Math.PI;
      
      // Convert to 0-360 degrees
      return (heading + 360) % 360;
    };

    // Update map with current location and calculate heading
    useEffect(() => {
      if (leafletMapRef.current && currentLocation) {
        const { latitude, longitude } = currentLocation;
        const lat = Number(latitude);
        const lng = Number(longitude);
        
        // Calculate heading if we have location history
        let heading = 0;
        if (locationHistory && locationHistory.length > 1) {
          // Get the previous location
          const prevLocation = locationHistory[locationHistory.length - 2];
          const prevLat = Number(prevLocation.latitude);
          const prevLng = Number(prevLocation.longitude);
          
          // Calculate heading
          heading = calculateHeading(prevLat, prevLng, lat, lng);
        }
        
        // Create directional bus icon with calculated heading
        const directionIcon = createDirectionalBusIcon(heading);
        
        if (busMarkerRef.current) {
          busMarkerRef.current.remove();
        }
        
        busMarkerRef.current = L.marker([lat, lng], { icon: directionIcon })
          .addTo(leafletMapRef.current)
          .bindPopup(`
            <div class="bus-popup">
              <div class="bus-popup-title">Current Location</div>
              <div class="bus-popup-info">
                <div>Speed: ${currentLocation.speed || 0} km/h</div>
                <div>Heading: ${Math.round(heading)}°</div>
                <div>Time: ${new Date(currentLocation.timestamp).toLocaleTimeString()}</div>
              </div>
            </div>
          `);
        
        leafletMapRef.current.setView([lat, lng], 15);
      }
    }, [currentLocation, locationHistory]);

    // Update map with location history using only OpenRouteService
    useEffect(() => {
      if (leafletMapRef.current && locationHistory && locationHistory.length > 0) {
        markersLayerRef.current.clearLayers();
        routeLayerRef.current.clearLayers();

        const routePoints = locationHistory.map(loc => {
          const lat = Number(loc.latitude);
          const lng = Number(loc.longitude);
          if (isNaN(lat) || isNaN(lng)) {
            console.error('Invalid coordinates:', loc);
            return [0, 0];
          }
          return [lat, lng];
        });

        const startPoint = routePoints[0];
        const endPoint = routePoints[routePoints.length - 1];
        const startTime = new Date(locationHistory[0].timestamp).toLocaleTimeString();
        const endTime = new Date(locationHistory[locationHistory.length - 1].timestamp).toLocaleTimeString();

        L.marker(startPoint, {
          icon: L.divIcon({
            html: `<div class="start-marker">Start (${startTime})</div>`,
            className: 'start-marker-container',
            iconSize: [100, 30],
            iconAnchor: [50, 15]
          })
        }).addTo(markersLayerRef.current);

        L.marker(endPoint, {
          icon: L.divIcon({
            html: `<div class="end-marker">End (${endTime})</div>`,
            className: 'end-marker-container',
            iconSize: [100, 30],
            iconAnchor: [50, 15]
          })
        }).addTo(markersLayerRef.current);

        locationHistory.forEach((loc, index) => {
          if (index !== 0 && index !== locationHistory.length - 1) {
            const time = new Date(loc.timestamp).toLocaleTimeString();
            L.circleMarker([Number(loc.latitude), Number(loc.longitude)], {
              radius: 6,
              color: '#3b82f6',
              fillColor: '#1e40af',
              fillOpacity: 1,
              weight: 2
            })
              .addTo(markersLayerRef.current)
              .bindPopup(`
                <div class="waypoint-popup">
                  <div class="waypoint-time">${time}</div>
                  <div class="waypoint-speed">Speed: ${loc.speed || 0} km/h</div>
                  <div class="waypoint-coords">
                    Lat: ${Number(loc.latitude).toFixed(5)}, Lng: ${Number(loc.longitude).toFixed(5)}
                  </div>
                </div>
              `);
            L.marker([Number(loc.latitude), Number(loc.longitude)], {
              icon: L.divIcon({
                html: `<div class="time-label">${time.split(':')[0]}:${time.split(':')[1]}</div>`,
                className: 'time-label-container',
                iconSize: [50, 20],
                iconAnchor: [25, 10]
              })
            }).addTo(markersLayerRef.current);
          }
        });

        // Draw route using OpenRouteService
        const drawRouteWithOpenRouteService = async () => {
          if (routePoints.length < 2) {
            setErrorMessage('Not enough points to draw a route');
            return;
          }

          const routeData = await fetchRoute(routePoints);
          if (routeData && routeData.features && routeData.features.length > 0) {
            // Create a styled route with flow animation
            const route = L.geoJSON(routeData, {
              style: {
                color: '#3b82f6',
                weight: 5,
                opacity: 0.8,
                lineJoin: 'round',
                lineCap: 'round',
                className: 'flow-line' // Apply flow animation
              }
            }).addTo(routeLayerRef.current);

            // Add direction arrows with improved styling
            if (L.polylineDecorator) {
              try {
                const routeLayers = route.getLayers();
                for (const routeLayer of routeLayers) {
                  // Add more frequent, smaller arrows for better flow visualization
                  L.polylineDecorator(routeLayer, {
                    patterns: [
                      {
                        offset: '5%',
                        repeat: '8%',  // More frequent arrows
                        symbol: L.Symbol.arrowHead({
                          pixelSize: 12,  // Smaller arrows
                          polygon: true,  // Filled arrows
                          pathOptions: {
                            stroke: true,
                            fill: true,
                            fillColor: '#3b82f6',
                            fillOpacity: 0.8,
                            color: '#2563eb',
                            weight: 2
                          }
                        })
                      }
                    ]
                  }).addTo(routeLayerRef.current);
                }
                
                // Add a few larger arrows for emphasis at key points
                L.polylineDecorator(routeLayers[0], {
                  patterns: [
                    {
                      offset: '25%',
                      repeat: '50%',  // Only a few larger arrows
                      symbol: L.Symbol.arrowHead({
                        pixelSize: 18,  // Larger arrows
                        polygon: true,
                        pathOptions: {
                          stroke: true,
                          fill: true,
                          fillColor: '#ef4444',
                          fillOpacity: 0.9,
                          color: '#dc2626',
                          weight: 2
                        }
                      })
                    }
                  ]
                }).addTo(routeLayerRef.current);
              } catch (decoratorError) {
                console.error('Error adding polyline decorator:', decoratorError);
              }
            }

            leafletMapRef.current.fitBounds(route.getBounds(), {
              padding: [70, 70]
            });
          } else {
            setErrorMessage('Failed to fetch location history route from OpenRouteService');
          }
        };

        drawRouteWithOpenRouteService();
      }
    }, [locationHistory]);

    return (
      <div className="relative h-full w-full">
        <div ref={mapRef} className="h-full w-full z-10"></div>

        {/* Error message overlay */}
        {errorMessage && (
          <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/30 backdrop-blur-sm">
            <div className="bg-white p-4 rounded-lg shadow-lg text-center">
              <h3 className="text-lg font-semibold text-red-600">Route Error</h3>
              <p className="text-gray-700 mt-2">{errorMessage}</p>
              <button
                className="mt-2 bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded"
                onClick={() => setErrorMessage(null)}
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* No data message overlays */}
        {(!currentLocation && isLive) && (
          <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/30 backdrop-blur-sm">
            <div className="bg-white p-4 rounded-lg shadow-lg text-center">
              <h3 className="text-lg font-semibold text-red-600">No Location Data Available</h3>
              <p className="text-gray-700 mt-2">There is no current location data for this bus.</p>
            </div>
          </div>
        )}
        {(!locationHistory || locationHistory.length === 0) && !isLive && (
          <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/30 backdrop-blur-sm">
            <div className="bg-white p-4 rounded-lg shadow-lg text-center">
              <h3 className="text-lg font-semibold text-red-600">No History Data Available</h3>
              <p className="text-gray-700 mt-2">There is no location history data for this date.</p>
            </div>
          </div>
        )}

        {/* Map controls */}
        <div className="absolute top-4 right-4 z-30 flex flex-col space-y-2">
          {isLive && currentLocation && (
            <button
              className="bg-blue-500/70 hover:bg-blue-600/70 text-white px-3 py-2 rounded-lg backdrop-blur-sm"
              onClick={() => {
                if (currentLocation && leafletMapRef.current) {
                  leafletMapRef.current.setView([Number(currentLocation.latitude), Number(currentLocation.longitude)], 15);
                }
              }}
            >
              Focus Bus
            </button>
          )}
          <button
            className="bg-gray-700/70 hover:bg-gray-800/70 text-white px-3 py-2 rounded-lg backdrop-blur-sm"
            onClick={() => {
              if (leafletMapRef.current) {
                leafletMapRef.current.setZoom(leafletMapRef.current.getZoom() + 1);
              }
            }}
          >
            Zoom In
          </button>
          <button
            className="bg-gray-700/70 hover:bg-gray-800/70 text-white px-3 py-2 rounded-lg backdrop-blur-sm"
            onClick={() => {
              if (leafletMapRef.current) {
                leafletMapRef.current.setZoom(leafletMapRef.current.getZoom() - 1);
              }
            }}
          >
            Zoom Out
          </button>
        </div>
      </div>
    );
};

export default BusTrackingMap;