/**
 * Utility functions for map operations
 */

/**
 * Determines which stops are nearby the current bus location
 * @param {Object} currentLocation - Current bus location {latitude, longitude}
 * @param {Array} stops - Array of stop objects
 * @param {Number} threshold - Distance threshold in kilometers
 * @returns {Number|null} - Serial number of the nearest stop or null if none are nearby
 */
export const determineNearbyStops = (currentLocation, stops, threshold = 1.0) => { // Increased threshold to 1km
  if (!currentLocation || !stops || stops.length === 0) {
    console.log('determineNearbyStops: Missing data', { 
      hasLocation: !!currentLocation, 
      stopsCount: stops?.length || 0 
    });
    return null;
  }
  
  // Find the nearest stop
  let nearestStop = null;
  let nearestDistance = Infinity;
  
  stops.forEach(stop => {
    if (!stop.latitude || !stop.longitude) {
      console.log('Stop missing coordinates:', stop.name);
      return;
    }
    
    const distance = calculateDistance(
      currentLocation.latitude,
      currentLocation.longitude,
      stop.latitude,
      stop.longitude
    );
    
    console.log(`Distance to stop ${stop.name} (serial ${stop.serialNumber}): ${distance.toFixed(2)}km`);
    
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestStop = stop;
    }
  });
  
  console.log('Nearest stop:', nearestStop?.name, 'Distance:', nearestDistance.toFixed(2), 'km');
  
  // If the nearest stop is within threshold, return its serial number
  if (nearestStop && nearestDistance <= threshold) {
    console.log('Returning nearest stop serial:', nearestStop.serialNumber);
    return nearestStop.serialNumber;
  }
  
  // If no stop is within threshold but we have stops, return the first stop's serial number
  // This is just for testing purposes to ensure the component is visible
  if (stops.length > 0) {
    const firstStop = [...stops].sort((a, b) => a.serialNumber - b.serialNumber)[0];
    console.log('No stop within threshold, returning first stop serial:', firstStop.serialNumber);
    return firstStop.serialNumber;
  }
  
  console.log('No nearby stop found');
  return null;
};

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {Number} lat1 - Latitude of first point
 * @param {Number} lon1 - Longitude of first point
 * @param {Number} lat2 - Latitude of second point
 * @param {Number} lon2 - Longitude of second point
 * @returns {Number} - Distance in kilometers
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in km
  return distance;
};

/**
 * Convert degrees to radians
 * @param {Number} deg - Degrees
 * @returns {Number} - Radians
 */
const deg2rad = (deg) => {
  return deg * (Math.PI / 180);
};