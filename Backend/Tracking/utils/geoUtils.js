const geolib = require('geolib');

/**
 * Calculate distance between two geographic coordinates
 * @param {Object} point1 - First coordinate {latitude, longitude}
 * @param {Object} point2 - Second coordinate {latitude, longitude}
 * @returns {number} Distance in meters
 */
const calculateDistance = (point1, point2) => {
  // Validate input coordinates
  if (!point1 || !point2) {
    throw new Error('Both points must be provided');
  }
  
  // Convert and validate point1 coordinates
  const lat1 = parseFloat(point1.latitude);
  const lng1 = parseFloat(point1.longitude);
  
  if (isNaN(lat1) || isNaN(lng1)) {
    throw new Error(`Invalid point1 coordinates: lat=${point1.latitude}, lng=${point1.longitude}`);
  }
  
  // Convert and validate point2 coordinates
  const lat2 = parseFloat(point2.latitude);
  const lng2 = parseFloat(point2.longitude);
  
  if (isNaN(lat2) || isNaN(lng2)) {
    throw new Error(`Invalid point2 coordinates: lat=${point2.latitude}, lng=${point2.longitude}`);
  }
  
  return geolib.getDistance(
    { latitude: lat1, longitude: lng1 },
    { latitude: lat2, longitude: lng2 }
  );
};

/**
 * Check if a point is within a specified radius of another point
 * @param {Object} point - The point to check {latitude, longitude}
 * @param {Object} center - The center point {latitude, longitude}
 * @param {number} radius - Radius in meters
 * @returns {boolean} True if point is within radius
 */
const isWithinRadius = (point, center, radius) => {
  const distance = calculateDistance(point, center);
  return distance <= radius;
};

module.exports = {
  calculateDistance,
  isWithinRadius
};