const geolib = require('geolib');

/**
 * Calculate distance between two geographic coordinates
 * @param {Object} point1 - First coordinate {latitude, longitude}
 * @param {Object} point2 - Second coordinate {latitude, longitude}
 * @returns {number} Distance in meters
 */
const calculateDistance = (point1, point2) => {
  return geolib.getDistance(
    { latitude: point1.latitude, longitude: point1.longitude },
    { latitude: point2.latitude, longitude: point2.longitude }
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