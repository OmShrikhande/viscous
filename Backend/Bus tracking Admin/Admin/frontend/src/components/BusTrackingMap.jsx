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

    // Validate coordinates and filter out invalid ones
    const validCoordinates = coordinates.filter(coord => {
      if (isNaN(coord[0]) || isNaN(coord[1]) || coord[0] === 0 || coord[1] === 0) {
        console.warn('Filtering out invalid coordinate:', coord);
        return false;
      }
      return true;
    });

    if (validCoordinates.length < 2) {
      console.error('Not enough valid coordinates for route calculation');
      return null;
    }

    // Convert to [lng, lat] for OpenRouteService
    const orsCoordinates = validCoordinates.map(coord => [coord[1], coord[0]]);

    console.log('OpenRouteService coordinates:', orsCoordinates);

    // If we have too many points, simplify by taking fewer points
    // This helps with API limits and makes the route more reliable
    let simplifiedCoordinates = orsCoordinates;
    const maxPoints = 10; // OpenRouteService free tier limit
    
    if (orsCoordinates.length > maxPoints) {
      console.log(`Simplifying route from ${orsCoordinates.length} to ${maxPoints} points`);
      
      // Always include first and last point
      const first = orsCoordinates[0];
      const last = orsCoordinates[orsCoordinates.length - 1];
      
      // Select evenly distributed points between first and last
      simplifiedCoordinates = [first];
      
      const step = Math.floor(orsCoordinates.length / (maxPoints - 2));
      for (let i = step; i < orsCoordinates.length - step; i += step) {
        simplifiedCoordinates.push(orsCoordinates[i]);
        if (simplifiedCoordinates.length >= maxPoints - 1) break;
      }
      
      simplifiedCoordinates.push(last);
      console.log(`Simplified to ${simplifiedCoordinates.length} points`);
    }

    // Make the API request with simplified coordinates
    console.log('Making OpenRouteService API request...');
    const response = await fetch('https://api.openrouteservice.org/v2/directions/driving-car/geojson', {
      method: 'POST',
      headers: {
        'Authorization': ORS_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        coordinates: simplifiedCoordinates,
        // Use minimal parameters to avoid errors
        preference: "fastest"
      })
    });

    // Handle API response
    if (!response.ok) {
      try {
        // Try to parse the error as JSON first
        const errorData = await response.json();
        console.error(`OpenRouteService API error (${response.status}):`, errorData);
        
        // Extract the specific error message if available
        let errorMessage = `OpenRouteService API error: ${response.status}`;
        if (errorData && errorData.error && errorData.error.message) {
          errorMessage += ` - ${errorData.error.message}`;
        }
        
        throw new Error(errorMessage);
      } catch (jsonError) {
        // If it's not JSON, get the raw text
        const errorText = await response.text();
        console.error(`OpenRouteService API error (${response.status}):`, errorText);
        throw new Error(`OpenRouteService API error: ${response.status} ${response.statusText}`);
      }
    }

    const routeData = await response.json();
    
    if (!routeData || !routeData.features || routeData.features.length === 0) {
      console.error('No valid route data returned from OpenRouteService');
      return null;
    }

    console.log('Route fetched successfully');
    return routeData;
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

    // Update map with location history - with fallback to direct line if OpenRouteService fails
    useEffect(() => {
      if (leafletMapRef.current && locationHistory && locationHistory.length > 0) {
        markersLayerRef.current.clearLayers();
        routeLayerRef.current.clearLayers();

        // Log the location history for debugging
        console.log('Location history data:', locationHistory);

        // Filter out any invalid coordinates
        const validLocationHistory = locationHistory.filter(loc => {
          const lat = Number(loc.latitude);
          const lng = Number(loc.longitude);
          return !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
        });

        if (validLocationHistory.length === 0) {
          console.error('No valid coordinates in location history');
          setErrorMessage('No valid coordinates found in location history');
          return;
        }

        console.log(`Found ${validLocationHistory.length} valid location points`);

        const routePoints = validLocationHistory.map(loc => {
          const lat = Number(loc.latitude);
          const lng = Number(loc.longitude);
          return [lat, lng];
        });

        const startPoint = routePoints[0];
        const endPoint = routePoints[routePoints.length - 1];
        const startTime = new Date(validLocationHistory[0].timestamp).toLocaleTimeString();
        const endTime = new Date(validLocationHistory[validLocationHistory.length - 1].timestamp).toLocaleTimeString();

        // Add start marker
        L.marker(startPoint, {
          icon: L.divIcon({
            html: `<div class="start-marker">Start (${startTime})</div>`,
            className: 'start-marker-container',
            iconSize: [100, 30],
            iconAnchor: [50, 15]
          })
        }).addTo(markersLayerRef.current);

        // Add end marker
        L.marker(endPoint, {
          icon: L.divIcon({
            html: `<div class="end-marker">End (${endTime})</div>`,
            className: 'end-marker-container',
            iconSize: [100, 30],
            iconAnchor: [50, 15]
          })
        }).addTo(markersLayerRef.current);

        // Add waypoint markers for all intermediate points
        validLocationHistory.forEach((loc, index) => {
          if (index !== 0 && index !== validLocationHistory.length - 1) {
            const time = new Date(loc.timestamp).toLocaleTimeString();
            const lat = Number(loc.latitude);
            const lng = Number(loc.longitude);
            
            // Add circle marker for each waypoint
            L.circleMarker([lat, lng], {
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
                    Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)}
                  </div>
                </div>
              `);
            
            // Add time label for each waypoint
            L.marker([lat, lng], {
              icon: L.divIcon({
                html: `<div class="time-label">${time.split(':')[0]}:${time.split(':')[1]}</div>`,
                className: 'time-label-container',
                iconSize: [50, 20],
                iconAnchor: [25, 10]
              })
            }).addTo(markersLayerRef.current);
          }
        });

        // First, draw a simple polyline as a fallback
        const drawDirectLine = () => {
          console.log('Drawing direct polyline with points:', routePoints);
          
          try {
            // Create a polyline with the route points
            const polyline = L.polyline(routePoints, {
              color: '#3b82f6',
              weight: 4,
              opacity: 0.7,
              lineJoin: 'round',
              lineCap: 'round',
              dashArray: '10, 10',
              className: 'flow-line'
            }).addTo(routeLayerRef.current);
            
            // Fit the map to the polyline bounds
            try {
              leafletMapRef.current.fitBounds(polyline.getBounds(), {
                padding: [70, 70]
              });
            } catch (boundsError) {
              console.error('Error fitting bounds:', boundsError);
              // Fallback to center on the first point
              if (routePoints.length > 0) {
                leafletMapRef.current.setView(routePoints[0], 13);
              }
            }
            
            // Add direction arrows
            if (L.polylineDecorator) {
              try {
                L.polylineDecorator(polyline, {
                  patterns: [
                    {
                      offset: '5%',
                      repeat: '10%',
                      symbol: L.Symbol.arrowHead({
                        pixelSize: 12,
                        polygon: true,
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
              } catch (decoratorError) {
                console.error('Error adding polyline decorator:', decoratorError);
              }
            }
            
            return polyline;
          } catch (polylineError) {
            console.error('Error creating direct polyline:', polylineError);
            
            // If polyline creation fails, try to at least show the points
            try {
              // Center the map on the first point
              if (routePoints.length > 0) {
                leafletMapRef.current.setView(routePoints[0], 13);
              }
              
              // Create a dummy layer that we can reference but won't cause errors
              return L.layerGroup().addTo(routeLayerRef.current);
            } catch (fallbackError) {
              console.error('Even fallback failed:', fallbackError);
              return L.layerGroup(); // Return empty layer group as last resort
            }
          }
        };

        // Draw the direct line first as a fallback
        const directLine = drawDirectLine();

        // Then try to get a better route from OpenRouteService
        const drawRouteWithOpenRouteService = async () => {
          // Only attempt to use OpenRouteService if we have enough points and not too many
          if (routePoints.length < 2) {
            console.log('Not enough points to draw a route with OpenRouteService');
            return;
          }
          
          // Skip OpenRouteService if we have too many points (more than 50)
          // This is to avoid excessive API calls and potential errors
          if (routePoints.length > 50) {
            console.log('Too many points for OpenRouteService, using direct line instead');
            setErrorMessage('Using simplified route due to large number of points');
            return;
          }

          try {
            console.log('Attempting to fetch route from OpenRouteService...');
            const routeData = await fetchRoute(routePoints);
            
            if (routeData && routeData.features && routeData.features.length > 0) {
              console.log('Successfully fetched route from OpenRouteService');
              
              try {
                // Remove the direct line if we got a proper route
                routeLayerRef.current.removeLayer(directLine);
                
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
                    if (routeLayers && routeLayers.length > 0) {
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
                    }
                  } catch (decoratorError) {
                    console.error('Error adding polyline decorator:', decoratorError);
                  }
                }
  
                leafletMapRef.current.fitBounds(route.getBounds(), {
                  padding: [70, 70]
                });
              } catch (renderError) {
                console.error('Error rendering OpenRouteService route:', renderError);
                console.log('Falling back to direct line due to render error');
              }
            } else {
              console.log('Failed to fetch route from OpenRouteService, using direct line instead');
              setErrorMessage('Using direct route - OpenRouteService returned no data');
            }
          } catch (error) {
            console.error('Error in OpenRouteService route fetching:', error);
            console.log('Using direct line as fallback');
            setErrorMessage(`Using direct route - ${error.message}`);
          }
        };

        // Try to get a better route, but we already have a fallback in place
        // Wrap in a try-catch to ensure the map always shows something
        try {
          drawRouteWithOpenRouteService();
        } catch (error) {
          console.error('Unhandled error in route drawing:', error);
        }
      }
    }, [locationHistory]);

    return (
      <div className="relative h-full w-full">
        <div ref={mapRef} className="h-full w-full z-10"></div>

        {/* Non-blocking error message */}
        {errorMessage && (
          <div className="absolute top-4 left-4 z-30">
            <div className="bg-white/90 p-3 rounded-lg shadow-lg text-center max-w-xs border-l-4 border-orange-500 animate-fadeIn">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-semibold text-orange-600">Route Notice</h3>
                <button
                  className="text-gray-500 hover:text-gray-700"
                  onClick={() => setErrorMessage(null)}
                >
                  <span className="text-xs">✕</span>
                </button>
              </div>
              <p className="text-xs text-gray-700 mt-1">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Non-blocking notification for no data */}
        {(!currentLocation && isLive) && (
          <div className="absolute top-4 left-4 z-30">
            <div className="bg-white/90 p-3 rounded-lg shadow-lg text-center max-w-xs border-l-4 border-red-500">
              <h3 className="text-sm font-semibold text-red-600">No Current Location</h3>
              <p className="text-xs text-gray-700">No real-time data available for this bus.</p>
            </div>
          </div>
        )}
        {(!locationHistory || locationHistory.length === 0) && !isLive && (
          <div className="absolute top-4 left-4 z-30">
            <div className="bg-white/90 p-3 rounded-lg shadow-lg text-center max-w-xs border-l-4 border-red-500">
              <h3 className="text-sm font-semibold text-red-600">No History Data</h3>
              <p className="text-xs text-gray-700">No location history for this date.</p>
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