import React, { useEffect } from 'react';
import L from 'leaflet';
import { fetchRoute } from './mapService';
import { createStartMarkerIcon, createEndMarkerIcon, createTimeLabelIcon } from './iconFactory';

const RouteDisplay = ({ 
  map, 
  locationHistory, 
  markersLayerRef, 
  routeLayerRef, 
  setErrorMessage 
}) => {
  useEffect(() => {
    if (map && locationHistory && locationHistory.length > 0) {
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
        icon: createStartMarkerIcon(startTime)
      }).addTo(markersLayerRef.current);

      // Add end marker
      L.marker(endPoint, {
        icon: createEndMarkerIcon(endTime)
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
            icon: createTimeLabelIcon(time)
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
            map.fitBounds(polyline.getBounds(), {
              padding: [70, 70]
            });
          } catch (boundsError) {
            console.error('Error fitting bounds:', boundsError);
            // Fallback to center on the first point
            if (routePoints.length > 0) {
              map.setView(routePoints[0], 13);
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
              map.setView(routePoints[0], 13);
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

              map.fitBounds(route.getBounds(), {
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
  }, [map, locationHistory, markersLayerRef, routeLayerRef, setErrorMessage]);

  return null; // This is a functional component that doesn't render anything
};

export default RouteDisplay;