import React from 'react';

const MapControls = ({ map, currentLocation, isLive }) => {
  const handleZoomIn = () => {
    if (map) {
      map.setZoom(map.getZoom() + 1);
    }
  };

  const handleZoomOut = () => {
    if (map) {
      map.setZoom(map.getZoom() - 1);
    }
  };

  const handleFocusBus = () => {
    if (currentLocation && map) {
      map.setView(
        [Number(currentLocation.latitude), Number(currentLocation.longitude)], 
        15
      );
    }
  };

  return (
    <div className="absolute top-4 right-4 z-30 flex flex-col space-y-2">
      {isLive && currentLocation && (
        <button
          className="bg-blue-500/70 hover:bg-blue-600/70 text-white px-3 py-2 rounded-lg backdrop-blur-sm"
          onClick={handleFocusBus}
        >
          Focus Bus
        </button>
      )}
      <button
        className="bg-gray-700/70 hover:bg-gray-800/70 text-white px-3 py-2 rounded-lg backdrop-blur-sm"
        onClick={handleZoomIn}
      >
        Zoom In
      </button>
      <button
        className="bg-gray-700/70 hover:bg-gray-800/70 text-white px-3 py-2 rounded-lg backdrop-blur-sm"
        onClick={handleZoomOut}
      >
        Zoom Out
      </button>
    </div>
  );
};

export default MapControls;