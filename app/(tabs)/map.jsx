// MapScreen.js
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Image,
  ScrollView,
  TouchableOpacity
} from 'react-native';
import MapView, { Marker, AnimatedRegion } from 'react-native-maps';
import Slider from '@react-native-community/slider';
import { ref, onValue } from 'firebase/database';
import { collection, getDocs } from 'firebase/firestore';
import { firestoreDb, realtimeDatabase } from './../../configs/FirebaseConfigs';
import LastLogsDrawer from './../../components/usefulComponent/LastLogsDrawer';

const MapScreen = () => {
  const [zoom, setZoom] = useState(0.05);
  const [location, setLocation] = useState(null);
  const [speed, setSpeed] = useState(null);
  const [timestamp, setTimestamp] = useState(null);
  const [stops, setStops] = useState([]);
  const [isDark, setIsDark] = useState(false);
  const [logStops, setLogStops] = useState([]);
  const [currentStopSerial, setCurrentStopSerial] = useState(null);

  useEffect(() => {
    const locationRef = ref(realtimeDatabase, '/bus/Location/');
    const unsub = onValue(locationRef, (snapshot) => {
      const data = snapshot.val();
      if (data?.Latitude && data?.Longitude) {
        const currentLoc = {
          latitude: parseFloat(data.Latitude),
          longitude: parseFloat(data.Longitude),
        };
        setLocation(currentLoc);
        setSpeed(data.Speed);
        setTimestamp(data.Timestamp);
        determineNearbyStops(currentLoc);
      }
    });
    return () => unsub();
  }, [stops]);

  useEffect(() => {
    const themeRef = ref(realtimeDatabase, '/apklink/theme/isdark');
    const unsub = onValue(themeRef, (snapshot) => {
      const value = snapshot.val();
      setIsDark(value === true);
    });
    return () => unsub();
  }, []);

useEffect(() => {
  const fetchStops = async () => {
    try {
      const locationsCollection = collection(firestoreDb, 'Locations');
      const snapshot = await getDocs(locationsCollection);

      const parsedStops = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        const rawLat = data?.Latitude;
        const rawLng = data?.Longitude;
        const rawSerial = data?.serialNumber;

        const latitude = parseFloat(rawLat);
        const longitude = parseFloat(rawLng);
        const serialNumber = parseInt(rawSerial);

        const isValid = !isNaN(latitude) && !isNaN(longitude) && !isNaN(serialNumber);

        if (isValid) {
          parsedStops.push({
            name: doc.id,
            latitude,
            longitude,
            serialNumber,
            reached: data.reached === true,
          });
        } else {
          console.warn('Skipping invalid stop:', {
            name: doc.id,
            latitude,
            longitude,
            serialNumber,
            rawLat,
            rawLng,
            rawSerial,
          });
        }
      });

      parsedStops.sort((a, b) => a.serialNumber - b.serialNumber);
      setStops(parsedStops);
    } catch (error) {
      console.error('Error fetching stops from Firestore:', error);
    }
  };

  fetchStops();
}, []);


  const determineNearbyStops = (currentLoc) => {
    if (!stops.length) return;

    const closest = stops.reduce((prev, curr) => {
      const dist = (lat1, lon1, lat2, lon2) => {
        return Math.sqrt(Math.pow(lat1 - lat2, 2) + Math.pow(lon1 - lon2, 2));
      };
      const prevDist = dist(prev.latitude, prev.longitude, currentLoc.latitude, currentLoc.longitude);
      const currDist = dist(curr.latitude, curr.longitude, currentLoc.latitude, currentLoc.longitude);
      return currDist < prevDist ? curr : prev;
    });

    const index = stops.findIndex(s => s.serialNumber === closest.serialNumber);
    const start = Math.max(0, index - 2);
    const end = Math.min(stops.length, index + 3);
    setLogStops(stops.slice(start, end));
    setCurrentStopSerial(closest.serialNumber);
  };

  if (!location) {
    return (
      <View style={[styles.container, { backgroundColor: isDark ? '#000' : '#fff' }]}> 
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const region = {
    latitude: location.latitude,
    longitude: location.longitude,
    latitudeDelta: zoom,
    longitudeDelta: zoom,
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#000' : '#fff' }]}>
      <View style={styles.topBar} />

      <MapView
        style={styles.map}
        region={region}
        provider="google"
      >
        <Marker coordinate={location}>
          <Image
            source={require('./../../assets/images/images.jpeg')}
            style={{ width: 40, height: 40 }}
            resizeMode="contain"
          />
        </Marker>

        {stops.map((stop, idx) => (
          <Marker
            key={idx}
            coordinate={{ latitude: stop.latitude, longitude: stop.longitude }}
            pinColor={
              stop.serialNumber === currentStopSerial ? 'blue' : stop.reached ? 'green' : 'red'
            }
            title={stop.name}
          />
        ))}
      </MapView>

      <View style={styles.infoContainer}>
        <Text style={[styles.infoText, { color: isDark ? '#fff' : '#000' }]}>Speed: {speed ? `${speed} km/h` : 'Loading...'}</Text>
        <Text style={[styles.infoText, { color: isDark ? '#fff' : '#000' }]}>Time: {timestamp ? new Date(timestamp).toLocaleString() : 'Loading...'}</Text>
      </View>

      <View style={styles.sliderContainer}>
        <Text style={[styles.sliderLabel, { color: isDark ? '#fff' : '#000' }]}>Zoom Level: {zoom.toFixed(3)}</Text>
        <Slider
          minimumValue={0.005}
          maximumValue={0.2}
          value={zoom}
          step={0.005}
          onValueChange={setZoom}
          minimumTrackTintColor="#1E90FF"
          maximumTrackTintColor="#d3d3d3"
        />
      </View>

      <View style={{ marginHorizontal: 20, marginTop: 10 }}>
        <Text style={{ color: isDark ? '#fff' : '#000', fontSize: 16, fontWeight: 'bold', marginBottom: 5 }}>Nearby Stops:</Text>
        {logStops.map((stop, index) => (
          <Text key={index} style={{ color: isDark ? '#fff' : '#000', marginBottom: 3 }}>
            🛑 {stop.name} (SR No: {stop.serialNumber})
          </Text>
        ))}
      </View>

      <LastLogsDrawer isDark={isDark} stops={logStops} />
    </View>
  );
};

export default MapScreen;

const { height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 30,
  },
  topBar: {
    height: 4,
    width: '100%',
    backgroundColor: 'lightblue',
    marginBottom: 10,
  },
  map: {
    height: height / 2,
    width: '100%',
  },
  sliderContainer: {
    marginTop: 10,
    paddingHorizontal: 20,
  },
  sliderLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 10,
  },
  infoContainer: {
    marginTop: 15,
    paddingHorizontal: 20,
  },
  infoText: {
    fontSize: 16,
    marginBottom: 4,
  },
});
