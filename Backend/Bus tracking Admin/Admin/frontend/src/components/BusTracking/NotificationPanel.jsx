import React from 'react';

const NotificationPanel = ({ 
  errorMessage, 
  setErrorMessage, 
  currentLocation, 
  locationHistory, 
  isLive 
}) => {
  return (
    <>
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
    </>
  );
};

export default NotificationPanel;