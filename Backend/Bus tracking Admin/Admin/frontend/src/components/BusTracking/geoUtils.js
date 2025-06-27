// Calculate heading based on previous and current location
export const calculateHeading = (prevLat, prevLng, currLat, currLng) => {
  // Convert to radians
  const lat1 = prevLat * Math.PI / 180;
  const lat2 = currLat * Math.PI / 180;
  const lng1 = prevLng * Math.PI / 180;
  const lng2 = currLng * Math.PI / 180;
  
  // Calculate heading
  const y = Math.sin(lng2 - lng1) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(lng2 - lng1);
  const heading = Math.atan2(y, x) * 180 / Math.PI;
  
  // Convert to 0-360 degrees
  return (heading + 360) % 360;
};

// Filter valid coordinates
export const filterValidCoordinates = (coordinates) => {
  return coordinates.filter(coord => {
    if (isNaN(coord[0]) || isNaN(coord[1]) || coord[0] === 0 || coord[1] === 0) {
      console.warn('Filtering out invalid coordinate:', coord);
      return false;
    }
    return true;
  });
};

// Convert to OpenRouteService format [lng, lat]
export const convertToOrsFormat = (coordinates) => {
  return coordinates.map(coord => [coord[1], coord[0]]);
};

// Simplify route points to stay within API limits
export const simplifyRoutePoints = (coordinates, maxPoints = 10) => {
  if (coordinates.length <= maxPoints) {
    return coordinates;
  }
  
  console.log(`Simplifying route from ${coordinates.length} to ${maxPoints} points`);
  
  // Always include first and last point
  const first = coordinates[0];
  const last = coordinates[coordinates.length - 1];
  
  // Select evenly distributed points between first and last
  const simplifiedCoordinates = [first];
  
  const step = Math.floor(coordinates.length / (maxPoints - 2));
  for (let i = step; i < coordinates.length - step; i += step) {
    simplifiedCoordinates.push(coordinates[i]);
    if (simplifiedCoordinates.length >= maxPoints - 1) break;
  }
  
  simplifiedCoordinates.push(last);
  console.log(`Simplified to ${simplifiedCoordinates.length} points`);
  
  return simplifiedCoordinates;
};