import React, { useState } from 'react';
import { View } from 'react-native';
import UserLocationTracker from './UserLocationTracker';
import ProximityStatus from './ProximityStatus';
import LocationPermissionManager from './LocationPermissionManager';

const TrackingManager = ({ isDark }) => {
  const [hasPermission, setHasPermission] = useState(false);
  
  const handlePermissionGranted = () => {
    setHasPermission(true);
  };
  
  return (
    <View>
      <LocationPermissionManager 
        isDark={isDark} 
        onPermissionGranted={handlePermissionGranted} 
      />
      
      <ProximityStatus isDark={isDark} />
      
      {hasPermission && (
        <UserLocationTracker>
          {/* This component doesn't render anything visible */}
        </UserLocationTracker>
      )}
    </View>
  );
};

export default TrackingManager;