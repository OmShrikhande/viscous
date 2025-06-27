import React, { useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import 'leaflet-polylinedecorator';
import '../BusTrackingMap.css';

// Import components
import MapContainer from './MapContainer';
import BusMarker from './BusMarker';
import RouteDisplay from './RouteDisplay';
import MapControls from './MapControls';
import NotificationPanel from './NotificationPanel';
import BusStopsTable from './BusStopsTable';

const BusTrackingMap = ({ currentLocation, locationHistory, isLive }) => {
  // Refs
  const mapRef = useRef(null);
  const busMarkerRef = useRef(null);
  
  // State
  const [map, setMap] = useState(null);
  const [markersLayer, setMarkersLayer] = useState(null);
  const [routeLayer, setRouteLayer] = useState(null);
  const [busStopsLayer, setBusStopsLayer] = useState(null);
  const [busRouteLayer, setBusRouteLayer] = useState(null);
  const [busStops, setBusStops] = useState([]);
  const [errorMessage, setErrorMessage] = useState(null);

  return (
    <div className="flex flex-col md:flex-row h-full w-full">
      {/* Map and table container */}
      <div className="relative h-full md:w-2/3">
        {/* Map container */}
        <div ref={mapRef} className="h-full w-full z-10"></div>
        
        {/* Initialize map */}
        <MapContainer 
          mapRef={mapRef}
          setMap={setMap}
          setMarkersLayer={setMarkersLayer}
          setRouteLayer={setRouteLayer}
          setBusStopsLayer={setBusStopsLayer}
          setBusRouteLayer={setBusRouteLayer}
          setBusStops={setBusStops}
          setErrorMessage={setErrorMessage}
        />
        
        {/* Only render components when map is initialized */}
        {map && (
          <>
            {/* Bus marker */}
            <BusMarker 
              map={map}
              currentLocation={currentLocation}
              locationHistory={locationHistory}
              busMarkerRef={busMarkerRef}
            />
            
            {/* Route display */}
            <RouteDisplay 
              map={map}
              locationHistory={locationHistory}
              markersLayerRef={{ current: markersLayer }}
              routeLayerRef={{ current: routeLayer }}
              setErrorMessage={setErrorMessage}
            />
            
            {/* Map controls */}
            <MapControls 
              map={map}
              currentLocation={currentLocation}
              isLive={isLive}
            />
            
            {/* Notifications */}
            <NotificationPanel 
              errorMessage={errorMessage}
              setErrorMessage={setErrorMessage}
              currentLocation={currentLocation}
              locationHistory={locationHistory}
              isLive={isLive}
            />
          </>
        )}
      </div>
      
      {/* Bus stops table - displayed on the side */}
      <div className="h-full md:w-1/3 overflow-auto p-4 bg-gray-50">
        <BusStopsTable busStops={busStops} />
      </div>
    </div>
  );
};

export default BusTrackingMap;