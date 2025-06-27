import React, { useEffect } from 'react';
import L from 'leaflet';
import { createDirectionalBusIcon } from './iconFactory';
import { calculateHeading } from './geoUtils';

const BusMarker = ({ map, currentLocation, locationHistory, busMarkerRef }) => {
  useEffect(() => {
    if (map && currentLocation) {
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
        .addTo(map)
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
      
      map.setView([lat, lng], 15);
    }
  }, [map, currentLocation, locationHistory, busMarkerRef]);

  return null; // This is a functional component that doesn't render anything
};

export default BusMarker;