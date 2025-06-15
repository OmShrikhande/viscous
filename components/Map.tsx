import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import MapView from 'react-native-maps';

const Map = () => {
  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#2196F3" style="light" />
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: 37.78825,
          longitude: -122.4324,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: Dimensions.get('window').height * 0.5,
    width: '100%',
  },
  map: {
    width: '100%',
    height: '100%',
  },
});

export default Map;
