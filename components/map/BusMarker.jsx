import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Marker, Callout } from 'react-native-maps';
import { FontAwesome5 } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';

/**
 * Bus marker component with callout information
 */
const BusMarker = ({ location, speed, timestamp, userRouteNumber, isDark }) => {
  if (!location) return null;
  
  return (
    <Marker coordinate={location}>
      <View style={styles.busMarkerContainer}>
        <FontAwesome5 
          name="bus" 
          size={20} 
          color={isDark ? Colors.LIGHT : Colors.PRIMARY} 
        />
      </View>
      <Callout>
        <View style={styles.calloutContainer}>
          <Text style={styles.calloutTitle}>Current Bus Location</Text>
          <Text style={styles.calloutDetail}>
            Speed: {speed ? `${speed} km/h` : 'N/A'}
          </Text>
          <Text style={styles.calloutDetail}>
            Updated: {timestamp ? new Date(timestamp).toLocaleTimeString() : 'N/A'}
          </Text>
          <Text style={styles.calloutDetail}>
            Route: {userRouteNumber || 'Not set'}
          </Text>
        </View>
      </Callout>
    </Marker>
  );
};

const styles = StyleSheet.create({
  busMarkerContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 8,
    borderWidth: 2,
    borderColor: Colors.PRIMARY,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 5,
  },
  calloutContainer: {
    width: 180,
    padding: 10,
  },
  calloutTitle: {
    fontFamily: 'flux-bold',
    fontSize: 14,
    marginBottom: 5,
  },
  calloutDetail: {
    fontFamily: 'flux',
    fontSize: 12,
    marginBottom: 3,
  },
});

export default BusMarker;