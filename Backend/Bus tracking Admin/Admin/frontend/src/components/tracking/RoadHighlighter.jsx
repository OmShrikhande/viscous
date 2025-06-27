import React, { useEffect, useState } from 'react';
import { useMap, Polyline } from 'react-leaflet';
import axios from 'axios';

// RoadHighlighter component that directly fetches and displays road routes
const RoadHighlighter = ({ coordinates, apiKey }) => {
  const map = useMap();
  const [routeData, setRouteData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRoute = async () => {
      if (!coordinates || coordinates.length < 2) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Format coordinates for ORS API - convert from [lat, lon] to [lon, lat]
        const orsCoordinates = coordinates.map(coord => [coord[1], coord[0]]);
        
        console.log('Fetching route with coordinates:', orsCoordinates);

        // Make direct API request to OpenRouteService
        const response = await axios.post(
          'https://api.openrouteservice.org/v2/directions/driving-car/geojson',
          { coordinates: orsCoordinates },
          {
            headers: {
              'Authorization': apiKey,
              'Content-Type': 'application/json'
            }
          }
        );

        // Process the response
        if (response.data && response.data.features && response.data.features.length > 0) {
          const route = response.data.features[0];
          const geometry = route.geometry.coordinates;
          
          // Convert back from [lon, lat] to [lat, lon] for Leaflet
          const routeLatLngs = geometry.map(coord => [coord[1], coord[0]]);
          
          console.log(`Successfully got route with ${routeLatLngs.length} points`);
          setRouteData(routeLatLngs);
        } else {
          throw new Error('Invalid response from ORS API');
        }
      } catch (err) {
        console.error('Error fetching route:', err);
        setError(err.message || 'Failed to fetch route');
        
        // Fallback to direct line
        setRouteData(coordinates);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRoute();
  }, [coordinates, apiKey, map]);

  // Render the route as a Polyline
  if (routeData.length > 0) {
    return (
      <Polyline 
        positions={routeData}
        color="#4F46E5"
        weight={5}
        opacity={0.8}
        smoothFactor={1}
      />
    );
  }

  return null;
};

export default RoadHighlighter;

