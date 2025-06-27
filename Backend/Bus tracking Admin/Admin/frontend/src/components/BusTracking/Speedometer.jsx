import React, { useEffect, useState, useRef } from 'react';
import './Speedometer.css';

const Speedometer = ({ speed = 0, dailyDistance = 0, totalDistance = 0, timestamp = null, loading = false, maxSpeed = 120 }) => {
  const [needleRotation, setNeedleRotation] = useState(0);
  const [needleClass, setNeedleClass] = useState('');
  const needleRef = useRef(null);
  
  // Calculate the needle rotation based on the speed
  useEffect(() => {
    // Calculate the rotation angle (135 degrees to -135 degrees, where 0 is at the bottom)
    // -135 degrees is the minimum (0 km/h)
    // 135 degrees is the maximum (maxSpeed km/h)
    const minAngle = -135;
    const maxAngle = 135;
    const angleRange = maxAngle - minAngle;
    
    // Calculate the percentage of the current speed relative to the max speed
    const speedPercentage = Math.min(speed / maxSpeed, 1);
    
    // Calculate the rotation angle
    const rotation = minAngle + (angleRange * speedPercentage);
    
    // Add a bounce effect when the speed changes
    setNeedleClass('bounce');
    setTimeout(() => setNeedleClass(''), 500);
    
    // Set the rotation
    setNeedleRotation(rotation);
  }, [speed, maxSpeed]);
  
  // Format the distances with appropriate units
  const formatDistance = (distance) => {
    if (distance < 1) {
      // Convert to meters if less than 1 km
      return `${(distance * 1000).toFixed(0)} m`;
    } else if (distance < 10) {
      // Show 2 decimal places for distances less than 10 km
      return `${distance.toFixed(2)} km`;
    } else if (distance < 100) {
      // Show 1 decimal place for distances less than 100 km
      return `${distance.toFixed(1)} km`;
    } else {
      // Show no decimal places for distances 100 km or more
      return `${Math.round(distance)} km`;
    }
  };
  
  // Format the timestamp
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'No data';
    
    try {
      const date = new Date(timestamp);
      return date.toLocaleString();
    } catch (error) {
      console.error('Error formatting timestamp:', error);
      return 'Invalid timestamp';
    }
  };
  
  // Generate tick marks for the speedometer
  const renderTicks = () => {
    const ticks = [];
    const numTicks = 24; // Total number of ticks
    const majorTickInterval = 4; // Every 4th tick is a major tick
    
    for (let i = 0; i <= numTicks; i++) {
      const angle = -135 + (i * (270 / numTicks));
      const isMajor = i % majorTickInterval === 0;
      const tickSpeed = (i / numTicks) * maxSpeed;
      
      // Add the tick mark
      ticks.push(
        <div
          key={`tick-${i}`}
          className={`speedometer-tick ${isMajor ? 'major' : ''}`}
          style={{ transform: `rotate(${angle}deg)` }}
        />
      );
      
      // Add labels for major ticks
      if (isMajor) {
        ticks.push(
          <div
            key={`label-${i}`}
            className="speedometer-tick-label"
            style={{ transform: `rotate(${angle}deg) translate(0, -30px) rotate(${-angle}deg)` }}
          >
            {Math.round(tickSpeed)}
          </div>
        );
      }
    }
    
    return ticks;
  };
  
  return (
    <div className="speedometer-container">
      <div className="speedometer">
        {/* Gradient arc background */}
        <div className="speedometer-arc"></div>
        
        {/* Tick marks */}
        <div className="speedometer-ticks">
          {renderTicks()}
        </div>
        
        {/* Needle */}
        <div
          ref={needleRef}
          className={`speedometer-needle ${needleClass}`}
          style={{ transform: `rotate(${needleRotation}deg)` }}
        ></div>
        
        {/* Inner circle with speed value */}
        <div className={`speedometer-inner ${speed > 0 ? 'pulse' : ''}`}>
          <div className="speedometer-value">{Math.round(speed)}</div>
          <div className="speedometer-unit">km/h</div>
          <div className="speedometer-label">Current Speed</div>
        </div>
        
        {/* Loading overlay */}
        {loading && (
          <div className="speedometer-loading">
            <div className="speedometer-loading-spinner"></div>
          </div>
        )}
      </div>
      
      {/* Distance statistics */}
      <div className="distance-stats">
        <div className="distance-stat">
          <div className="distance-value">{formatDistance(dailyDistance)}</div>
          <div className="distance-label">Today</div>
        </div>
        <div className="distance-stat">
          <div className="distance-value">{formatDistance(totalDistance)}</div>
          <div className="distance-label">Total</div>
        </div>
      </div>
      
      {/* Timestamp */}
      <div className="timestamp">
        Last updated: {formatTimestamp(timestamp)}
      </div>
    </div>
  );
};

export default Speedometer;