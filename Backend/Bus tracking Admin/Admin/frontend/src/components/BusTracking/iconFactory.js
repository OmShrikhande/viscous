import L from 'leaflet';

// Function to create a very clear directional bus icon
export const createDirectionalBusIcon = (heading = 0) => {
  return L.divIcon({
    html: `<div class="bus-icon" style="transform: rotate(${heading}deg)">
            <div class="bus-direction-arrow">
              <div class="arrow-head"></div>
              <div class="arrow-body"></div>
            </div>
          </div>`,
    className: 'directional-bus-icon',
    iconSize: [40, 40],
    iconAnchor: [20, 20]
  });
};

// Default bus icon for backward compatibility
export const busIcon = createDirectionalBusIcon(0);

// Create bus stop icon function
export const createBusStopIcon = (reached) => {
  return L.divIcon({
    html: `<div class="bus-stop-icon ${reached ? 'reached' : ''}">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2c-4.42 0-8 .5-8 4v10c0 .88.39 1.67 1 2.22V20c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h8v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4z"/>
            </svg>
          </div>`,
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });
};

// Create start marker icon
export const createStartMarkerIcon = (startTime) => {
  return L.divIcon({
    html: `<div class="start-marker">Start (${startTime})</div>`,
    className: 'start-marker-container',
    iconSize: [100, 30],
    iconAnchor: [50, 15]
  });
};

// Create end marker icon
export const createEndMarkerIcon = (endTime) => {
  return L.divIcon({
    html: `<div class="end-marker">End (${endTime})</div>`,
    className: 'end-marker-container',
    iconSize: [100, 30],
    iconAnchor: [50, 15]
  });
};

// Create time label icon
export const createTimeLabelIcon = (time) => {
  return L.divIcon({
    html: `<div class="time-label">${time.split(':')[0]}:${time.split(':')[1]}</div>`,
    className: 'time-label-container',
    iconSize: [50, 20],
    iconAnchor: [25, 10]
  });
};

// Create stop label icon
export const createStopLabelIcon = (name) => {
  return L.divIcon({
    html: `<div class="stop-label">${name}</div>`,
    className: 'stop-label-container',
    iconSize: [80, 20],
    iconAnchor: [40, -5]
  });
};