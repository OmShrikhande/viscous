import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';

/**
 * Map control buttons for centering and toggling bus info
 */
const MapControls = ({ 
  isDark, 
  onCenterMap, 
  onToggleBusInfo, 
  showBusInfo, 
  hasLocation 
}) => {
  return (
    <View style={styles.controlsContainer}>
      <TouchableOpacity
        style={[
          styles.controlButton,
          { backgroundColor: isDark ? 'rgba(40, 40, 40, 0.8)' : 'rgba(255, 255, 255, 0.8)' }
        ]}
        onPress={onToggleBusInfo}
      >
        {showBusInfo ? (
          <MaterialIcons 
            name="info-outline" 
            size={24} 
            color={isDark ? Colors.LIGHT : Colors.PRIMARY} 
          />
        ) : (
          <MaterialIcons 
            name="info" 
            size={24} 
            color={isDark ? Colors.LIGHT : Colors.PRIMARY} 
          />
        )}
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[
          styles.controlButton,
          { backgroundColor: isDark ? 'rgba(40, 40, 40, 0.8)' : 'rgba(255, 255, 255, 0.8)' }
        ]}
        onPress={onCenterMap}
        disabled={!hasLocation}
      >
        {hasLocation ? (
          <MaterialIcons 
            name="gps-fixed" 
            size={24} 
            color={isDark ? Colors.LIGHT : Colors.PRIMARY} 
          />
        ) : (
          <MaterialIcons 
            name="my-location" 
            size={24} 
            color={isDark ? Colors.LIGHT : Colors.PRIMARY} 
          />
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  controlsContainer: {
    position: 'absolute',
    right: 16,
    top: 100,
    zIndex: 5,
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
});

export default MapControls;