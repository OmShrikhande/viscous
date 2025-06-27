import React, { useEffect } from 'react';

// This component no longer displays bus stops on the map as per the new requirements
const BusStops = ({ map, busStops, busStopsLayerRef }) => {
  useEffect(() => {
    if (map && busStopsLayerRef.current) {
      // Clear any existing bus stop markers from the map
      busStopsLayerRef.current.clearLayers();
      
      // We're not adding bus stops to the map anymore
      // They will be displayed in a table instead
    }
  }, [map, busStops, busStopsLayerRef]);

  return null; // This is a functional component that doesn't render anything
};

export default BusStops;