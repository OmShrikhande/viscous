/**
 * Utility functions for map operations
 */

/**
 * Determines which stops are nearby the current bus location and detects travel direction
 * @param {Object} currentLocation - Current bus location {latitude, longitude}
 * @param {Array} stops - Array of stop objects
 * @param {Number} threshold - Distance threshold in kilometers
 * @param {Object} previousLocation - Previous bus location for direction detection
 * @returns {Object|null} - Object containing nearest stop info and direction, or null
 */
export const determineNearbyStops = (currentLocation, stops, threshold = 1.0, previousLocation = null) => {
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
  
  // If the nearest stop is within threshold, determine direction and return data
  if (nearestStop && nearestDistance <= threshold) {
    const direction = detectTravelDirection(currentLocation, previousLocation, stops, nearestStop);
    console.log('Returning nearest stop serial:', nearestStop.serialNumber, 'Direction:', direction);
    return {
      stopSerial: nearestStop.serialNumber,
      direction: direction,
      stop: nearestStop
    };
  }
  
  // If no stop is within threshold but we have stops, return the first stop's serial number
  // This is just for testing purposes to ensure the component is visible
  if (stops.length > 0) {
    const firstStop = [...stops].sort((a, b) => a.serialNumber - b.serialNumber)[0];
    console.log('No stop within threshold, returning first stop serial:', firstStop.serialNumber);
    return {
      stopSerial: firstStop.serialNumber,
      direction: 'forward',
      stop: firstStop
    };
  }
  
  console.log('No nearby stop found');
  return null;
};

/**
 * Detects the travel direction of the bus based on location history and stop sequence
 * @param {Object} currentLocation - Current bus location
 * @param {Object} previousLocation - Previous bus location
 * @param {Array} stops - Array of all stops
 * @param {Object} nearestStop - Currently nearest stop
 * @returns {String} - 'forward', 'backward', or 'unknown'
 */
export const detectTravelDirection = (currentLocation, previousLocation, stops, nearestStop) => {
  if (!previousLocation || !currentLocation || !nearestStop) {
    return 'unknown';
  }

  // Sort stops by serial number
  const sortedStops = [...stops].sort((a, b) => a.serialNumber - b.serialNumber);
  
  // Find the current stop index
  const currentStopIndex = sortedStops.findIndex(stop => stop.serialNumber === nearestStop.serialNumber);
  
  if (currentStopIndex === -1) {
    return 'unknown';
  }
  
  // Get previous and next stops in the sequence
  const previousStopInSequence = currentStopIndex > 0 ? sortedStops[currentStopIndex - 1] : null;
  const nextStopInSequence = currentStopIndex < sortedStops.length - 1 ? sortedStops[currentStopIndex + 1] : null;
  
  // Calculate distances from previous location to neighboring stops
  let distanceToPreviousStop = Infinity;
  let distanceToNextStop = Infinity;
  
  if (previousStopInSequence) {
    distanceToPreviousStop = calculateDistance(
      previousLocation.latitude,
      previousLocation.longitude,
      previousStopInSequence.latitude,
      previousStopInSequence.longitude
    );
  }
  
  if (nextStopInSequence) {
    distanceToNextStop = calculateDistance(
      previousLocation.latitude,
      previousLocation.longitude,
      nextStopInSequence.latitude,
      nextStopInSequence.longitude
    );
  }
  
  // If the bus was closer to the previous stop in sequence, it's moving forward
  // If the bus was closer to the next stop in sequence, it's moving backward
  if (distanceToPreviousStop < distanceToNextStop) {
    console.log('Direction detected: FORWARD (was closer to previous stop in sequence)');
    return 'forward';
  } else if (distanceToNextStop < distanceToPreviousStop) {
    console.log('Direction detected: BACKWARD (was closer to next stop in sequence)');
    return 'backward';
  }
  
  // Additional check: Use movement vector
  const movementVector = {
    lat: currentLocation.latitude - previousLocation.latitude,
    lng: currentLocation.longitude - previousLocation.longitude
  };
  
  // Calculate vectors to next and previous stops
  if (nextStopInSequence && previousStopInSequence) {
    const vectorToNext = {
      lat: nextStopInSequence.latitude - currentLocation.latitude,
      lng: nextStopInSequence.longitude - currentLocation.longitude
    };
    
    const vectorToPrevious = {
      lat: previousStopInSequence.latitude - currentLocation.latitude,
      lng: previousStopInSequence.longitude - currentLocation.longitude
    };
    
    // Calculate dot products to determine alignment
    const dotNext = movementVector.lat * vectorToNext.lat + movementVector.lng * vectorToNext.lng;
    const dotPrevious = movementVector.lat * vectorToPrevious.lat + movementVector.lng * vectorToPrevious.lng;
    
    if (dotNext > dotPrevious) {
      console.log('Direction detected: FORWARD (movement vector aligned with next stop)');
      return 'forward';
    } else {
      console.log('Direction detected: BACKWARD (movement vector aligned with previous stop)');
      return 'backward';
    }
  }
  
  return 'unknown';
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