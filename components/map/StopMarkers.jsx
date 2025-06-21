import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Marker, Callout } from 'react-native-maps';
import { getMarkerColor } from './MapStyles';

/**
 * Component to render all bus stop markers
 */
const StopMarkers = ({ stops, onMarkerPress }) => {
  // Filter out stops with invalid coordinates
  const validStops = stops.filter(stop => 
    !isNaN(stop.latitude) && 
    !isNaN(stop.longitude) && 
    stop.latitude !== undefined && 
    stop.longitude !== undefined
  );
  
  return (
    <>
      {validStops.map((stop, idx) => (
        <Marker
          key={`stop-${stop.name}-${idx}`}
          coordinate={{ latitude: stop.latitude, longitude: stop.longitude }}
          pinColor={getMarkerColor(stop)}
          title={stop.name}
          onPress={() => onMarkerPress(stop)}
        >
          <Callout>
            <View style={styles.calloutContainer}>
              <Text style={styles.calloutTitle}>{stop.name}</Text>
              <Text style={styles.calloutDetail}>
                Serial: {stop.serialNumber}
              </Text>
              <Text style={styles.calloutDetail}>
                Status: {stop.reached ? 'Reached' : 'Not Reached'}
              </Text>
              {stop.time && (
                <Text style={styles.calloutDetail}>
                  Time: {stop.time}
                </Text>
              )}
            </View>
          </Callout>
        </Marker>
      ))}
    </>
  );
};

const styles = StyleSheet.create({
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

export default StopMarkers;