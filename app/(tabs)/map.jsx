import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Image,
  ScrollView,
  TouchableOpacity,
  Animated,
  StatusBar,
  SafeAreaView
} from 'react-native';
import MapView, { Marker, Callout, PROVIDER_GOOGLE } from 'react-native-maps';
import Slider from '@react-native-community/slider';
import { ref, onValue } from 'firebase/database';
import { collection, getDocs, doc, onSnapshot } from 'firebase/firestore';
import { firestoreDb, realtimeDatabase } from './../../configs/FirebaseConfigs';
import LastLogsDrawer from './../../components/usefulComponent/LastLogsDrawer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../../constants/Colors';
import { MaterialIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

// Custom map styles for dark mode
const darkMapStyle = [
  {
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#242f3e"
      }
    ]
  },
  {
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#746855"
      }
    ]
  },
  {
    "elementType": "labels.text.stroke",
    "stylers": [
      {
        "color": "#242f3e"
      }
    ]
  },
  {
    "featureType": "administrative.locality",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#d59563"
      }
    ]
  },
  {
    "featureType": "poi",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#d59563"
      }
    ]
  },
  {
    "featureType": "poi.park",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#263c3f"
      }
    ]
  },
  {
    "featureType": "poi.park",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#6b9a76"
      }
    ]
  },
  {
    "featureType": "road",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#38414e"
      }
    ]
  },
  {
    "featureType": "road",
    "elementType": "geometry.stroke",
    "stylers": [
      {
        "color": "#212a37"
      }
    ]
  },
  {
    "featureType": "road",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#9ca5b3"
      }
    ]
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#746855"
      }
    ]
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry.stroke",
    "stylers": [
      {
        "color": "#1f2835"
      }
    ]
  },
  {
    "featureType": "road.highway",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#f3d19c"
      }
    ]
  },
  {
    "featureType": "transit",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#2f3948"
      }
    ]
  },
  {
    "featureType": "transit.station",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#d59563"
      }
    ]
  },
  {
    "featureType": "water",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#17263c"
      }
    ]
  },
  {
    "featureType": "water",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#515c6d"
      }
    ]
  },
  {
    "featureType": "water",
    "elementType": "labels.text.stroke",
    "stylers": [
      {
        "color": "#17263c"
      }
    ]
  }
];

const MapScreen = () => {
  const [zoom, setZoom] = useState(0.05);
  const [location, setLocation] = useState(null);
  const [speed, setSpeed] = useState(null);
  const [timestamp, setTimestamp] = useState(null);
  const [stops, setStops] = useState([]);
  const [isDark, setIsDark] = useState(false);
  const [logStops, setLogStops] = useState([]);
  const [currentStopSerial, setCurrentStopSerial] = useState(null);
  const [selectedStop, setSelectedStop] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const mapRef = useRef(null);
  const router = useRouter();

  // Animation when component mounts
  useEffect(() => {
    // Use a small delay to avoid conflict with layout animations
    const animationTimeout = setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        })
      ]).start();
    }, 100);
    
    return () => clearTimeout(animationTimeout);
  }, []);

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
        setIsLoading(false);
      }
    });
    return () => unsub();
  }, [stops]);

  useEffect(() => {
    const fetchUserTheme = async () => {
      try {
        const userDataJson = await AsyncStorage.getItem('userData');

        if (!userDataJson) {
          console.warn('⚠️ userData not found in AsyncStorage');
          return;
        }

        const { email } = JSON.parse(userDataJson);
        if (!email) {
          console.warn('⚠️ Email not found inside userData');
          return;
        }

        const userDocRef = doc(firestoreDb, 'userdata', email);
        const unsub = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setIsDark(data.isDark === true);
          }
        });

        return () => unsub();
      } catch (err) {
        console.error('Failed to fetch theme:', err);
      }
    };

    fetchUserTheme();
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
              time: data.time || null,
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

  const handleMarkerPress = (stop) => {
    setSelectedStop(stop);
    
    // Animate to the selected stop
    if (mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: stop.latitude,
        longitude: stop.longitude,
        latitudeDelta: zoom,
        longitudeDelta: zoom,
      }, 500);
    }
  };

  const handleBackPress = () => {
    router.back();
  };

  const getMarkerColor = (stop) => {
    if (stop.serialNumber === currentStopSerial) {
      return isDark ? '#4fc3f7' : 'blue';
    } else if (stop.reached) {
      return isDark ? '#4caf50' : 'green';
    } else {
      return isDark ? '#f44336' : 'red';
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#121212' : '#fff' }]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={isDark ? Colors.LIGHT : Colors.PRIMARY} />
          <Text style={[styles.loadingText, { color: isDark ? '#fff' : '#000' }]}>
            Loading map data...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const region = {
    latitude: location.latitude,
    longitude: location.longitude,
    latitudeDelta: zoom,
    longitudeDelta: zoom,
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#121212' : '#fff' }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      
      {/* Header */}
      <Animated.View 
        style={[
          styles.header,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
        ]}
      >
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={handleBackPress}
        >
          <MaterialIcons 
            name="arrow-back" 
            size={24} 
            color={isDark ? Colors.WHITE : Colors.PRIMARY} 
          />
        </TouchableOpacity>
        
        <Text style={[styles.headerTitle, { color: isDark ? '#fff' : Colors.DARK }]}>
          Live Bus Tracking
        </Text>
        
        <View style={styles.headerRight}>
          <View style={[
            styles.liveIndicator,
            { backgroundColor: isDark ? 'rgba(76, 175, 80, 0.2)' : 'rgba(76, 175, 80, 0.1)' }
          ]}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        </View>
      </Animated.View>

      {/* Map */}
      <Animated.View 
        style={[
          styles.mapContainer,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
        ]}
      >
        <MapView
          ref={mapRef}
          style={styles.map}
          region={region}
          provider={PROVIDER_GOOGLE}
          customMapStyle={isDark ? darkMapStyle : []}
          showsUserLocation={true}
          showsMyLocationButton={true}
          showsCompass={true}
          showsScale={true}
          onMapReady={() => setMapReady(true)}
        >
          {/* Bus Marker */}
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
              </View>
            </Callout>
          </Marker>

          {/* Stop Markers */}
          {stops.map((stop, idx) => (
            <Marker
              key={idx}
              coordinate={{ latitude: stop.latitude, longitude: stop.longitude }}
              pinColor={getMarkerColor(stop)}
              title={stop.name}
              onPress={() => handleMarkerPress(stop)}
            >
              <View style={[
                styles.stopMarker,
                { backgroundColor: getMarkerColor(stop) }
              ]}>
                <Text style={styles.stopMarkerText}>{stop.serialNumber}</Text>
              </View>
              <Callout>
                <View style={styles.calloutContainer}>
                  <Text style={styles.calloutTitle}>{stop.name}</Text>
                  <Text style={styles.calloutDetail}>Stop #{stop.serialNumber}</Text>
                  {stop.reached && stop.time && (
                    <Text style={styles.calloutDetail}>
                      Reached at: {stop.time}
                    </Text>
                  )}
                  <Text style={[
                    styles.calloutStatus,
                    { color: stop.reached ? Colors.SUCCESS : Colors.GREY }
                  ]}>
                    {stop.reached ? '✓ Reached' : '○ Pending'}
                  </Text>
                </View>
              </Callout>
            </Marker>
          ))}
        </MapView>
      </Animated.View>

      {/* Info Cards */}
      <ScrollView 
        style={styles.infoScrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Bus Info Card */}
        <Animated.View 
          style={[
            styles.infoCard,
            isDark && styles.infoCardDark,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
          ]}
        >
          <View style={styles.infoCardHeader}>
            <View style={styles.infoCardHeaderLeft}>
              <FontAwesome5 
                name="bus" 
                size={18} 
                color={isDark ? Colors.LIGHT : Colors.PRIMARY} 
              />
              <Text style={[
                styles.infoCardTitle,
                { color: isDark ? '#fff' : Colors.DARK }
              ]}>
                Bus Information
              </Text>
            </View>
            <MaterialIcons 
              name="info-outline" 
              size={20} 
              color={isDark ? '#aaa' : '#666'} 
            />
          </View>
          
          <View style={styles.infoCardContent}>
            <View style={styles.infoItem}>
              <MaterialIcons 
                name="speed" 
                size={20} 
                color={isDark ? Colors.LIGHT : Colors.PRIMARY} 
              />
              <Text style={[
                styles.infoLabel,
                { color: isDark ? '#aaa' : '#666' }
              ]}>
                Speed:
              </Text>
              <Text style={[
                styles.infoValue,
                { color: isDark ? '#fff' : '#000' }
              ]}>
                {speed ? `${speed} km/h` : 'Loading...'}
              </Text>
            </View>
            
            <View style={styles.infoItem}>
              <MaterialIcons 
                name="access-time" 
                size={20} 
                color={isDark ? Colors.LIGHT : Colors.PRIMARY} 
              />
              <Text style={[
                styles.infoLabel,
                { color: isDark ? '#aaa' : '#666' }
              ]}>
                Last Update:
              </Text>
              <Text style={[
                styles.infoValue,
                { color: isDark ? '#fff' : '#000' }
              ]}>
                {timestamp ? new Date(timestamp).toLocaleTimeString() : 'Loading...'}
              </Text>
            </View>
            
            <View style={styles.infoItem}>
              <MaterialIcons 
                name="location-on" 
                size={20} 
                color={isDark ? Colors.LIGHT : Colors.PRIMARY} 
              />
              <Text style={[
                styles.infoLabel,
                { color: isDark ? '#aaa' : '#666' }
              ]}>
                Coordinates:
              </Text>
              <Text style={[
                styles.infoValue,
                { color: isDark ? '#fff' : '#000' }
              ]}>
                {location ? `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}` : 'Loading...'}
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Zoom Control Card */}
        <Animated.View 
          style={[
            styles.infoCard,
            isDark && styles.infoCardDark,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
          ]}
        >
          <View style={styles.infoCardHeader}>
            <View style={styles.infoCardHeaderLeft}>
              <MaterialIcons 
                name="zoom-in" 
                size={18} 
                color={isDark ? Colors.LIGHT : Colors.PRIMARY} 
              />
              <Text style={[
                styles.infoCardTitle,
                { color: isDark ? '#fff' : Colors.DARK }
              ]}>
                Map Controls
              </Text>
            </View>
          </View>
          
          <View style={styles.sliderContainer}>
            <View style={styles.sliderLabels}>
              <Text style={[
                styles.sliderLabelText,
                { color: isDark ? '#aaa' : '#666' }
              ]}>
                Zoom Out
              </Text>
              <Text style={[
                styles.sliderValue,
                { color: isDark ? '#fff' : '#000' }
              ]}>
                {zoom.toFixed(3)}
              </Text>
              <Text style={[
                styles.sliderLabelText,
                { color: isDark ? '#aaa' : '#666' }
              ]}>
                Zoom In
              </Text>
            </View>
            <Slider
              minimumValue={0.005}
              maximumValue={0.2}
              value={zoom}
              step={0.005}
              onValueChange={setZoom}
              minimumTrackTintColor={isDark ? Colors.LIGHT : Colors.PRIMARY}
              maximumTrackTintColor={isDark ? '#444' : '#d3d3d3'}
              thumbTintColor={isDark ? Colors.LIGHT : Colors.PRIMARY}
              style={styles.slider}
            />
          </View>
        </Animated.View>

        {/* Nearby Stops Card */}
        <Animated.View 
          style={[
            styles.infoCard,
            isDark && styles.infoCardDark,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
          ]}
        >
          <View style={styles.infoCardHeader}>
            <View style={styles.infoCardHeaderLeft}>
              <MaterialIcons 
                name="location-city" 
                size={18} 
                color={isDark ? Colors.LIGHT : Colors.PRIMARY} 
              />
              <Text style={[
                styles.infoCardTitle,
                { color: isDark ? '#fff' : Colors.DARK }
              ]}>
                Nearby Stops
              </Text>
            </View>
          </View>
          
          <View style={styles.nearbyStopsContainer}>
            {logStops.length > 0 ? (
              logStops.map((stop, index) => (
                <TouchableOpacity 
                  key={index} 
                  style={[
                    styles.nearbyStopItem,
                    isDark && styles.nearbyStopItemDark,
                    stop.serialNumber === currentStopSerial && styles.currentStopItem,
                    stop.serialNumber === currentStopSerial && isDark && styles.currentStopItemDark
                  ]}
                  onPress={() => handleMarkerPress(stop)}
                >
                  <View style={[
                    styles.stopIndicator,
                    { backgroundColor: getMarkerColor(stop) }
                  ]} />
                  <View style={styles.stopInfo}>
                    <Text style={[
                      styles.stopName,
                      { color: isDark ? '#fff' : Colors.DARK }
                    ]}>
                      {stop.name}
                    </Text>
                    <Text style={[
                      styles.stopDetail,
                      { color: isDark ? '#aaa' : '#666' }
                    ]}>
                      Stop #{stop.serialNumber} {stop.reached ? '• Reached' : '• Pending'}
                    </Text>
                  </View>
                  <MaterialIcons 
                    name="chevron-right" 
                    size={20} 
                    color={isDark ? '#aaa' : '#666'} 
                  />
                </TouchableOpacity>
              ))
            ) : (
              <Text style={[
                styles.noStopsText,
                { color: isDark ? '#aaa' : '#666' }
              ]}>
                No nearby stops found
              </Text>
            )}
          </View>
        </Animated.View>
        
        {/* Spacer for bottom padding */}
        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

export default MapScreen;

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerRight: {
    width: 40,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.SUCCESS,
    marginRight: 4,
  },
  liveText: {
    fontSize: 10,
    color: Colors.SUCCESS,
    fontWeight: '600',
  },
  mapContainer: {
    height: height * 0.4,
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  busMarkerContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 8,
    borderWidth: 2,
    borderColor: Colors.PRIMARY,
  },
  stopMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  stopMarkerText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  calloutContainer: {
    width: 150,
    padding: 8,
  },
  calloutTitle: {
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 4,
  },
  calloutDetail: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  calloutStatus: {
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 4,
  },
  infoScrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  infoCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  infoCardDark: {
    backgroundColor: '#1e1e1e',
    shadowOpacity: 0.3,
  },
  infoCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoCardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  infoCardContent: {
    padding: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    marginLeft: 8,
    width: 100,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  sliderContainer: {
    padding: 16,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sliderLabelText: {
    fontSize: 12,
  },
  sliderValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  nearbyStopsContainer: {
    padding: 8,
  },
  nearbyStopItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#f8f9fa',
  },
  nearbyStopItemDark: {
    backgroundColor: '#2a2a2a',
  },
  currentStopItem: {
    backgroundColor: 'rgba(10, 126, 164, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(10, 126, 164, 0.3)',
  },
  currentStopItemDark: {
    backgroundColor: 'rgba(10, 126, 164, 0.2)',
    borderColor: 'rgba(10, 126, 164, 0.4)',
  },
  stopIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  stopInfo: {
    flex: 1,
  },
  stopName: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  stopDetail: {
    fontSize: 12,
  },
  noStopsText: {
    textAlign: 'center',
    padding: 16,
    fontSize: 14,
  },
});
