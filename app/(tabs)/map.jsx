import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { onValue, ref } from 'firebase/database';
import { collection, doc, getDocs, onSnapshot } from 'firebase/firestore';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  SafeAreaView,
  StatusBar,
  StyleSheet
} from 'react-native';
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps';
import {
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from 'react-native-reanimated';
import SpeedMonitor from '../../components/tracking/SpeedMonitor';
import { firestoreDb, realtimeDatabase } from './../../configs/FirebaseConfigs';

// Import map components
import BusInfoCard from '../../components/map/BusInfoCard';
import BusMarker from '../../components/map/BusMarker';
import LoadingScreen from '../../components/map/LoadingScreen';
import MapControls from '../../components/map/MapControls';
import { darkMapStyle } from '../../components/map/MapStyles';
import NextStopsCard from '../../components/map/NextStopsCard';
import StopInfoCard from '../../components/map/StopInfoCard';
import StopMarkers from '../../components/map/StopMarkers';
import ZoomControl from '../../components/map/ZoomControl';
import { determineNearbyStops } from '../../components/map/mapUtils';

const MapScreen = () => {
  // State variables
  const [zoom, setZoom] = useState(0.05);
  const [location, setLocation] = useState(null);
  const [speed, setSpeed] = useState(null);
  const [timestamp, setTimestamp] = useState(null);
  const [stops, setStops] = useState([]);
  const [isDark, setIsDark] = useState(false);
  const [currentStopSerial, setCurrentStopSerial] = useState(null);
  const [selectedStop, setSelectedStop] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [userRouteNumber, setUserRouteNumber] = useState('');
  const [showBusInfo, setShowBusInfo] = useState(false);
  
  // Animation values
  const fadeAnim = useSharedValue(0);
  const slideAnim = useSharedValue(30);
  const mapRef = useRef(null);
  const router = useRouter();

  // Animation when component mounts
  useEffect(() => {
    // Use a small delay to avoid conflict with layout animations
    const animationTimeout = setTimeout(() => {
      fadeAnim.value = withTiming(1, { duration: 800 });
      slideAnim.value = withTiming(0, { duration: 600 });
    }, 100);
    
    return () => clearTimeout(animationTimeout);
  }, []);
  
  // Center map on bus location when map is ready and location is available
  useEffect(() => {
    if (mapReady && location && mapRef.current) {
      console.log('Centering map on bus location');
      mapRef.current.animateToRegion({
        ...location,
        latitudeDelta: zoom,
        longitudeDelta: zoom,
      }, 1000);
    }
  }, [mapReady, location, zoom]);

  // Set up real-time location listener
  useEffect(() => {
    console.log('Setting up real-time location listener');
    const locationRef = ref(realtimeDatabase, '/bus/Location/');
    
    const unsub = onValue(locationRef, (snapshot) => {
      const data = snapshot.val();
      if (data?.Latitude && data?.Longitude) {
        try {
          const latitude = parseFloat(data.Latitude);
          const longitude = parseFloat(data.Longitude);
          
          if (isNaN(latitude) || isNaN(longitude)) {
            console.warn('Invalid location data:', data);
            return;
          }
          
          const currentLoc = { latitude, longitude };
          console.log(`Location update: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
          
          setLocation(currentLoc);
          setSpeed(data.Speed);
          setTimestamp(data.Timestamp);
          
          // If we have stops data, determine which stops are nearby
          if (stops.length > 0) {
            const nearbyStopSerial = determineNearbyStops(currentLoc, stops);
            console.log('Nearby stop serial:', nearbyStopSerial);
            if (nearbyStopSerial !== null) {
              console.log('Setting current stop serial to:', nearbyStopSerial);
              setCurrentStopSerial(nearbyStopSerial);
            }
            
            // If map is ready and we have a reference, animate to the current location
            if (mapReady && mapRef.current) {
              mapRef.current.animateToRegion({
                ...currentLoc,
                latitudeDelta: zoom,
                longitudeDelta: zoom,
              }, 1000);
            }
          }
          
          // If we're still loading but have both location and stops data, we can finish loading
          if (isLoading && stops.length > 0) {
            setIsLoading(false);
          }
        } catch (error) {
          console.error('Error processing location data:', error);
        }
      } else {
        console.warn('Incomplete location data received:', data);
      }
    }, (error) => {
      console.error('Error fetching location from Realtime Database:', error);
    });
    
    return () => unsub();
  }, [stops, isLoading, zoom, mapReady]);

  // Load user data from AsyncStorage
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userDataJson = await AsyncStorage.getItem('userData');

        if (!userDataJson) {
          console.warn('⚠️ userData not found in AsyncStorage');
          return;
        }

        const userData = JSON.parse(userDataJson);
        const { email, routeNumber } = userData;
        
        if (!email) {
          console.warn('⚠️ Email not found inside userData');
          return;
        }

        console.log('User email from AsyncStorage:', email);
        
        // Set route number from AsyncStorage if available
        if (routeNumber) {
          console.log('Setting route number from AsyncStorage:', routeNumber);
          setUserRouteNumber(routeNumber.toString());
        }

        const userDocRef = doc(firestoreDb, 'userdata', email);
        console.log('Setting up listener for user data at:', `userdata/${email}`);
        
        const unsub = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setIsDark(data.isDark === true);
            
            // Update route number from Firestore if available
            if (data.routeNumber) {
              const firestoreRouteNumber = data.routeNumber.toString();
              console.log('Firestore route number update:', firestoreRouteNumber);
              
              // Only update if different to avoid unnecessary re-renders
              if (firestoreRouteNumber !== userRouteNumber) {
                console.log('Updating route number from Firestore:', firestoreRouteNumber);
                setUserRouteNumber(firestoreRouteNumber);
              }
            }
          } else {
            console.warn(`User document not found for email: ${email}`);
          }
        }, (error) => {
          console.error('Error fetching user data from Firestore:', error);
        });

        return () => unsub();
      } catch (err) {
        console.error('Failed to fetch user data:', err);
      }
    };

    fetchUserData();
  }, []);

  // Refresh stops data
  const [refreshing, setRefreshing] = useState(false);
  const [locatingBus, setLocatingBus] = useState(false);
  
  const refreshStops = useCallback(async () => {
    if (!userRouteNumber) {
      console.warn('⚠️ No route number available, cannot refresh stops');
      return;
    }
    
    console.log(`Refreshing stops for Route${userRouteNumber}...`);
    setRefreshing(true);
    
    try {
      // Log the collection structure to help diagnose issues
      const routeCollectionName = `Route${userRouteNumber}`;
      const routeRef = collection(firestoreDb, routeCollectionName);
      const snapshot = await getDocs(routeRef);
      
      console.log(`Collection ${routeCollectionName} has ${snapshot.size} documents`);
      
      if (snapshot.empty) {
        console.warn(`Collection ${routeCollectionName} is empty`);
      } else {
        // Log the first document to see its structure
        const firstDoc = snapshot.docs[0];
        console.log(`First document in ${routeCollectionName}:`, {
          id: firstDoc.id,
          data: firstDoc.data()
        });
      }
    } catch (error) {
      console.error('Error inspecting collection:', error);
    } finally {
      // The actual refresh will happen through the onSnapshot listener
      setTimeout(() => setRefreshing(false), 1000); // Visual feedback
    }
  }, [userRouteNumber]);

  // Set up listener for stops data
  useEffect(() => {
    if (!userRouteNumber) {
      console.warn('⚠️ No route number available, cannot fetch stops');
      return;
    }

    setIsLoading(true);
    console.log(`Setting up real-time listener for Route${userRouteNumber}`);
    
    // Use the exact collection name format "Route2" not "Route" + "2"
    const routeCollectionName = `Route${userRouteNumber}`;
    console.log(`Collection name: ${routeCollectionName}`);
    
    const routeRef = collection(firestoreDb, routeCollectionName);
    
    // Use onSnapshot for real-time updates instead of getDocs
    const unsubscribe = onSnapshot(
      routeRef,
      (snapshot) => {
        if (snapshot.empty) {
          console.warn(`No stops found for route ${userRouteNumber} in collection ${routeCollectionName}`);
          setStops([]);
          setIsLoading(false);
          return;
        }

        const parsedStops = [];

        snapshot.forEach((doc) => {
          const data = doc.data();
          console.log(`Processing stop: ${doc.id}`, data);
          
          // Handle different field name formats (lowercase vs uppercase first letter)
          const rawLat = data?.latitude || data?.Latitude;
          const rawLng = data?.longitude || data?.Longitude;
          const rawOrder = data?.order || data?.serialNumber || data?.SerialNumber;

          console.log(`Stop ${doc.id} raw values:`, { rawLat, rawLng, rawOrder });

          const latitude = parseFloat(rawLat);
          const longitude = parseFloat(rawLng);
          const serialNumber = parseInt(rawOrder);

          console.log(`Stop ${doc.id} parsed values:`, { latitude, longitude, serialNumber });

          const isValid = !isNaN(latitude) && !isNaN(longitude) && !isNaN(serialNumber);

          if (isValid) {
            parsedStops.push({
              name: doc.id,
              latitude,
              longitude,
              serialNumber,
              reached: data.reached === true,
              time: data.time || null,
              data: data
            });
            console.log(`Added stop: ${doc.id} with serial ${serialNumber}`);
          } else {
            console.warn(`Invalid stop data for ${doc.id}:`, { latitude, longitude, serialNumber });
          }
        });

        // Sort stops by serial number
        parsedStops.sort((a, b) => a.serialNumber - b.serialNumber);
        console.log(`Loaded ${parsedStops.length} stops for route ${userRouteNumber}`);
        
        setStops(parsedStops);
        setIsLoading(false);
      },
      (error) => {
        console.error(`Error fetching stops for route ${userRouteNumber}:`, error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userRouteNumber]);

  // Handle marker press
  const handleMarkerPress = (stop) => {
    setSelectedStop(stop);
  };

  // Handle map ready event
  const handleMapReady = () => {
    console.log('Map is ready');
    setMapReady(true);
  };

  // Handle zoom change
  const handleZoomChange = (value) => {
    setZoom(value);
    
    // Update map region with new zoom level
    if (location && mapRef.current) {
      mapRef.current.animateToRegion({
        ...location,
        latitudeDelta: value,
        longitudeDelta: value,
      }, 500);
    }
  };

  // Center map on bus location
  const centerMapOnBus = () => {
    if (location && mapRef.current) {
      setLocatingBus(true);
      
      mapRef.current.animateToRegion({
        ...location,
        latitudeDelta: zoom,
        longitudeDelta: zoom,
      }, 1000);
      
      // Reset locating state after animation
      setTimeout(() => setLocatingBus(false), 1000);
    }
  };

  // Toggle bus info panel
  const toggleBusInfo = () => {
    setShowBusInfo(!showBusInfo);
  };

  // Close selected stop info
  const closeSelectedStop = () => {
    setSelectedStop(null);
  };

  // Animation styles
  const busInfoAnimStyle = useAnimatedStyle(() => {
    return {
      opacity: fadeAnim.value,
      transform: [{ translateY: slideAnim.value }],
    };
  });
  
  const zoomControlAnimStyle = useAnimatedStyle(() => {
    return {
      opacity: fadeAnim.value,
      transform: [{ translateY: -slideAnim.value }],
    };
  });
  
  const stopInfoAnimStyle = useAnimatedStyle(() => {
    return {
      opacity: fadeAnim.value,
      transform: [{ translateY: slideAnim.value }],
    };
  });
  
  const nextStopsAnimStyle = useAnimatedStyle(() => {
    return {
      opacity: fadeAnim.value,
      transform: [{ translateX: -slideAnim.value }],
    };
  });

  // If loading, show loading screen
  if (isLoading) {
    return (
      <LoadingScreen 
        isDark={isDark} 
        onRetry={refreshStops} 
        userRouteNumber={userRouteNumber} 
      />
    );
  }

  return (
    <SafeAreaView style={[
      styles.container,
      { backgroundColor: isDark ? '#121212' : '#f9f9f9' }
    ]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent
      />
      
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        customMapStyle={isDark ? darkMapStyle : []}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={false}
        showsScale={true}
        showsTraffic={false}
        showsIndoors={false}
        showsBuildings={false}
        showsIndoorLevelPicker={false}
        showsPointsOfInterest={false}
        toolbarEnabled={false}
        loadingEnabled={true}
        moveOnMarkerPress={false}
        onMapReady={handleMapReady}
        initialRegion={
          location
            ? {
                ...location,
                latitudeDelta: zoom,
                longitudeDelta: zoom,
              }
            : {
                latitude: 21.1458,
                longitude: 79.0882,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
              }
        }
      >
        {/* Bus Marker */}
        <BusMarker 
          location={location}
          speed={speed}
          timestamp={timestamp}
          userRouteNumber={userRouteNumber}
          isDark={isDark}
        />
        
        {/* Stop Markers */}
        <StopMarkers 
          stops={stops} 
          onMarkerPress={handleMarkerPress} 
        />
      </MapView>
      
      {/* Map Controls */}
      <MapControls 
        isDark={isDark}
        onCenterMap={centerMapOnBus}
        onToggleBusInfo={toggleBusInfo}
        showBusInfo={showBusInfo}
        hasLocation={!!location}
      />
      
      {/* Bus Info Card */}
      {showBusInfo && location && (
        <BusInfoCard 
          isDark={isDark}
          speed={speed}
          timestamp={timestamp}
          location={location}
          animStyle={busInfoAnimStyle}
        />
      )}
      
      {/* Zoom Control */}
      <ZoomControl 
        isDark={isDark}
        zoom={zoom}
        onZoomChange={handleZoomChange}
        animStyle={zoomControlAnimStyle}
      />
      
      {/* Selected Stop Info */}
      {selectedStop && (
        <StopInfoCard 
          isDark={isDark}
          selectedStop={selectedStop}
          onClose={closeSelectedStop}
          animStyle={stopInfoAnimStyle}
        />
      )}
      
      {/* Next Stops Card */}
      {console.log('Rendering NextStopsCard?', { 
        hasSelectedStop: !!selectedStop, 
        currentStopSerial, 
        shouldRender: !selectedStop && !!currentStopSerial 
      })}
      {!selectedStop && currentStopSerial && (
        <NextStopsCard 
          isDark={isDark}
          stops={stops}
          currentStopSerial={currentStopSerial}
          animStyle={nextStopsAnimStyle}
        />
      )}
      
      {/* Speed Monitor */}
      <SpeedMonitor speed={speed} isDark={isDark} />
    </SafeAreaView>
  );
};

export default MapScreen;

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: '100%',
    height: '100%',
  },
});