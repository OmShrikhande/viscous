import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { fetchBusStops } from './mapService';

// Fix for Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const MapContainer = ({ 
  mapRef, 
  setMap, 
  setMarkersLayer, 
  setRouteLayer, 
  setBusStopsLayer, 
  setBusRouteLayer,
  setBusStops,
  setErrorMessage
}) => {
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!initializedRef.current && mapRef.current) {
      // Initialize map
      const map = L.map(mapRef.current).setView([28.6139, 77.2090], 13);
      
      // Add tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(map);
      
      // Create layer groups
      const markersLayer = L.layerGroup().addTo(map);
      const routeLayer = L.layerGroup().addTo(map);
      const busRouteLayer = L.layerGroup().addTo(map);
      
      // Set state with created objects
      setMap(map);
      setMarkersLayer(markersLayer);
      setRouteLayer(routeLayer);
      setBusRouteLayer(busRouteLayer);
      
      // Fetch bus stops
      fetchBusStops(setErrorMessage, setBusStops);
      
      // Mark as initialized
      initializedRef.current = true;
      
      // Cleanup on unmount
      return () => {
        map.remove();
        initializedRef.current = false;
      };
    }
  }, [
    mapRef, 
    setMap, 
    setMarkersLayer, 
    setRouteLayer, 
    setBusStopsLayer, 
    setBusRouteLayer,
    setBusStops,
    setErrorMessage
  ]);

  return null; // This component doesn't render anything
};

export default MapContainer;