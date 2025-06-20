import { FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Slider from '@react-native-community/slider';
import { useRouter } from 'expo-router';
import { onValue, ref } from 'firebase/database';
import { collection, doc, getDocs, onSnapshot } from 'firebase/firestore';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import MapView, { Callout, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { Colors } from '../../constants/Colors';
import { firestoreDb, realtimeDatabase } from './../../configs/FirebaseConfigs';
import SpeedMonitor from '../../components/tracking/SpeedMonitor';

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
  const [userRouteNumber, setUserRouteNumber] = useState('');
  const [showBusInfo, setShowBusInfo] = useState(false);
  
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
  }, [mapReady, location]);

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
            determineNearbyStops(currentLoc);
            
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

  // Add a refresh function that can be called manually
  const [refreshing, setRefreshing] = useState(false);
  const [locatingBus, setLocatingBus] = useState(false);
  
  const refreshStops = async () => {
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
  };

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
            console.warn('Skipping invalid stop:', {
              name: doc.id,
              latitude,
              longitude,
              serialNumber,
              rawLat,
              rawLng,
              rawOrder,
              allData: JSON.stringify(data)
            });
          }
        });

        // Sort stops by order/serialNumber
        parsedStops.sort((a, b) => a.serialNumber - b.serialNumber);
        setStops(parsedStops);
        console.log(`Loaded ${parsedStops.length} stops for route ${userRouteNumber} from ${routeCollectionName}`);
        setIsLoading(false);
      },
      (error) => {
        console.error('Error fetching stops from Firestore:', error);
        setIsLoading(false);
      }
    );

    // Clean up the listener when the component unmounts or route changes
    return () => unsubscribe();
  }, [userRouteNumber]);

  // Calculate distance between two coordinates in kilometers (using Haversine formula)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    const distance = R * c; // Distance in km
    return distance;
  };

  const deg2rad = (deg) => {
    return deg * (Math.PI/180);
  };

  const determineNearbyStops = (currentLoc) => {
    if (!stops.length) {
      console.log('No stops available to determine nearby stops');
      return;
    }

    console.log(`Determining nearby stops from ${stops.length} total stops`);

    try {
      // Find the closest stop using Haversine formula
      const closest = stops.reduce((prev, curr) => {
        const prevDist = calculateDistance(
          prev.latitude, 
          prev.longitude, 
          currentLoc.latitude, 
          currentLoc.longitude
        );
        
        const currDist = calculateDistance(
          curr.latitude, 
          curr.longitude, 
          currentLoc.latitude, 
          currentLoc.longitude
        );
        
        return currDist < prevDist ? curr : prev;
      });

      console.log(`Closest stop: ${closest.name} (${closest.serialNumber})`);

      // Mark stops as reached if they're close enough (within 100 meters)
      const updatedStops = stops.map(stop => {
        const distance = calculateDistance(
          stop.latitude,
          stop.longitude,
          currentLoc.latitude,
          currentLoc.longitude
        );
        
        // If bus is close to a stop (within 100 meters) or if the stop is before the current one
        if (distance < 0.1 || (stop.serialNumber !== undefined && closest.serialNumber !== undefined && stop.serialNumber <= closest.serialNumber)) {
          return {
            ...stop,
            reached: true,
            time: stop.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };
        }
        return stop;
      });
      
      // Update stops with reached information
      if (JSON.stringify(updatedStops) !== JSON.stringify(stops)) {
        console.log('Updating stops with reached information');
        setStops(updatedStops);
      }

      // Get nearby stops for the drawer
      if (closest.serialNumber !== undefined) {
        const index = stops.findIndex(s => s.serialNumber === closest.serialNumber);
        if (index !== -1) {
          const start = Math.max(0, index - 2);
          const end = Math.min(stops.length, index + 3);
          setLogStops(stops.slice(start, end));
          setCurrentStopSerial(closest.serialNumber);
          console.log(`Set nearby stops: ${stops.slice(start, end).map(s => s.name).join(', ')}`);
        } else {
          console.warn(`Could not find closest stop with serialNumber ${closest.serialNumber} in stops array`);
          setLogStops(stops.slice(0, 5)); // Show first 5 stops as fallback
        }
      } else {
        console.warn('Closest stop does not have a serialNumber');
        setLogStops(stops.slice(0, 5)); // Show first 5 stops as fallback
      }
    } catch (error) {
      console.error('Error in determineNearbyStops:', error);
      // Fallback to showing first 5 stops
      setLogStops(stops.slice(0, Math.min(5, stops.length)));
    }
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
    if (stop.serialNumber !== undefined && currentStopSerial !== null && stop.serialNumber === currentStopSerial) {
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
        
        {/* Header */}
        <View style={styles.header}>
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
        </View>
        
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={isDark ? Colors.LIGHT : Colors.PRIMARY} />
          <Text style={[styles.loadingText, { color: isDark ? '#fff' : '#000' }]}>
            Loading map data{userRouteNumber ? ` for Route${userRouteNumber}` : ''}...
          </Text>
          {!userRouteNumber ? (
            <Text style={[styles.loadingSubText, { color: isDark ? '#aaa' : '#666' }]}>
              No route number set. Please set your route in profile.
            </Text>
          ) : (
            <Text style={[styles.loadingSubText, { color: isDark ? '#aaa' : '#666' }]}>
              Connecting to Firestore collection: Route{userRouteNumber}
            </Text>
          )}
          
          <TouchableOpacity 
            style={[
              styles.retryButton,
              { backgroundColor: isDark ? 'rgba(79, 195, 247, 0.2)' : 'rgba(33, 150, 243, 0.1)' }
            ]}
            onPress={refreshStops}
          >
            <MaterialIcons name="refresh" size={16} color={isDark ? Colors.LIGHT : Colors.PRIMARY} />
            <Text style={{ color: isDark ? Colors.LIGHT : Colors.PRIMARY, marginLeft: 8 }}>
              Retry
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Default to a central location if no bus location is available yet
  const region = location ? {
    latitude: location.latitude,
    longitude: location.longitude,
    latitudeDelta: zoom,
    longitudeDelta: zoom,
  } : {
    latitude: 0,
    longitude: 0,
    latitudeDelta: zoom,
    longitudeDelta: zoom,
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#121212' : '#fff' }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      
      {/* Speed Monitor - invisible component that monitors speed and sends notifications */}
      <SpeedMonitor speed={speed} threshold={65} />
      
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
          <TouchableOpacity 
            style={[
              styles.refreshButton,
              { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)' }
            ]} 
            onPress={refreshStops}
            disabled={refreshing}
          >
            <MaterialIcons 
              name="refresh" 
              size={20} 
              color={isDark ? Colors.LIGHT : Colors.PRIMARY}
              style={refreshing ? { transform: [{ rotate: '45deg' }] } : {}}
            />
          </TouchableOpacity>
          
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
          showsUserLocation={false} // Don't show user location, only bus location
          showsMyLocationButton={false} // We'll add our custom button
          showsCompass={true}
          showsScale={true}
          onMapReady={() => setMapReady(true)}
        >
          {/* Custom location button */}
          <View style={styles.myLocationButtonContainer}>
            {/* Tooltip */}
            <View style={[
              styles.locationTooltip,
              { backgroundColor: isDark ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.6)' }
            ]}>
              <Text style={styles.tooltipText}>Show Bus</Text>
            </View>
            
            {/* Button */}
            <TouchableOpacity 
              style={[
                styles.myLocationButton,
                { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'white' }
              ]}
              onPress={() => {
                if (location && mapRef.current) {
                  setLocatingBus(true);
                  
                  // Animate to bus location
                  mapRef.current.animateToRegion({
                    ...location,
                    latitudeDelta: zoom,
                    longitudeDelta: zoom,
                  }, 1000);
                  
                  // Show visual feedback for 1 second
                  setTimeout(() => {
                    setLocatingBus(false);
                  }, 1000);
                }
              }}
            >
              {locatingBus ? (
                <ActivityIndicator 
                  size="small" 
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
          {/* Bus Marker - only show if we have location data */}
          {location && (
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
          )}

          {/* Stop Markers */}
          {stops.filter(stop => 
            !isNaN(stop.latitude) && 
            !isNaN(stop.longitude) && 
            stop.latitude !== undefined && 
            stop.longitude !== undefined
          ).map((stop, idx) => (
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
                <Text style={styles.stopMarkerText}>{stop.serialNumber || '?'}</Text>
              </View>
              <Callout>
                <View style={styles.calloutContainer}>
                  <Text style={styles.calloutTitle}>{stop.name}</Text>
                  {stop.serialNumber !== undefined && (
                    <Text style={styles.calloutDetail}>Stop #{stop.serialNumber}</Text>
                  )}
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
            <TouchableOpacity
              onPress={() => setShowBusInfo(!showBusInfo)}
              style={[
                styles.infoButton,
                showBusInfo && { backgroundColor: isDark ? 'rgba(79, 195, 247, 0.3)' : 'rgba(33, 150, 243, 0.1)' }
              ]}
            >
              <MaterialIcons 
                name={showBusInfo ? "info" : "info-outline"}
                size={20} 
                color={isDark ? Colors.LIGHT : Colors.PRIMARY} 
              />
            </TouchableOpacity>
          </View>
          
          {showBusInfo && (
            <View style={[
              styles.busInfoTooltip,
              isDark ? { backgroundColor: '#2a2a2a' } : { backgroundColor: '#f5f5f5' }
            ]}>
              <View style={styles.busInfoRow}>
                <MaterialIcons name="route" size={16} color={isDark ? Colors.LIGHT : Colors.PRIMARY} />
                <Text style={[styles.busInfoText, { color: isDark ? '#fff' : '#000' }]}>
                  <Text style={{ fontWeight: 'bold' }}>Route Number:</Text> {userRouteNumber || 'Not set'}
                </Text>
              </View>
              
              <View style={styles.busInfoRow}>
                <MaterialIcons name="folder" size={16} color={isDark ? Colors.LIGHT : Colors.PRIMARY} />
                <Text style={[styles.busInfoText, { color: isDark ? '#fff' : '#000' }]}>
                  <Text style={{ fontWeight: 'bold' }}>Collection:</Text> Route{userRouteNumber}
                </Text>
              </View>
              
              <View style={styles.busInfoRow}>
                <MaterialIcons name="location-on" size={16} color={isDark ? Colors.LIGHT : Colors.PRIMARY} />
                <Text style={[styles.busInfoText, { color: isDark ? '#fff' : '#000' }]}>
                  <Text style={{ fontWeight: 'bold' }}>Total Stops:</Text> {stops.length}
                </Text>
              </View>
              
              <View style={styles.busInfoRow}>
                <MaterialIcons name="check-circle" size={16} color={isDark ? Colors.LIGHT : Colors.PRIMARY} />
                <Text style={[styles.busInfoText, { color: isDark ? '#fff' : '#000' }]}>
                  <Text style={{ fontWeight: 'bold' }}>Completed:</Text> {stops.filter(s => s.reached).length} of {stops.length} stops
                </Text>
              </View>
              
              <View style={styles.busInfoRow}>
                <MaterialIcons name="update" size={16} color={isDark ? Colors.LIGHT : Colors.PRIMARY} />
                <Text style={[styles.busInfoText, { color: isDark ? '#fff' : '#000' }]}>
                  <Text style={{ fontWeight: 'bold' }}>Last Update:</Text> {timestamp ? new Date(timestamp).toLocaleTimeString() : 'N/A'}
                </Text>
              </View>
              
              <View style={styles.busInfoRow}>
                <MaterialIcons name="speed" size={16} color={isDark ? Colors.LIGHT : Colors.PRIMARY} />
                <Text style={[styles.busInfoText, { color: isDark ? '#fff' : '#000' }]}>
                  <Text style={{ fontWeight: 'bold' }}>Current Speed:</Text> {speed ? `${speed} km/h` : 'N/A'}
                </Text>
              </View>
              
              <TouchableOpacity 
                style={[
                  styles.refreshStopsButton,
                  { backgroundColor: isDark ? 'rgba(79, 195, 247, 0.2)' : 'rgba(33, 150, 243, 0.1)' }
                ]}
                onPress={refreshStops}
                disabled={refreshing}
              >
                <MaterialIcons name="refresh" size={16} color={isDark ? Colors.LIGHT : Colors.PRIMARY} />
                <Text style={{ color: isDark ? Colors.LIGHT : Colors.PRIMARY, marginLeft: 8 }}>
                  Refresh Stops
                </Text>
              </TouchableOpacity>
            </View>
          )}
          
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
              minimumValue={0.001}
              maximumValue={0.5}
              value={zoom}
              step={0.001}
              onValueChange={(value) => {
                setZoom(value);
                
                // Update map region with new zoom level if we have location and map is ready
                if (location && mapRef.current && mapReady) {
                  mapRef.current.animateToRegion({
                    ...location,
                    latitudeDelta: value,
                    longitudeDelta: value,
                  }, 300);
                }
              }}
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
                    stop.serialNumber !== undefined && currentStopSerial !== null && 
                      stop.serialNumber === currentStopSerial && styles.currentStopItem,
                    stop.serialNumber !== undefined && currentStopSerial !== null && 
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
                      {stop.serialNumber !== undefined ? `Stop #${stop.serialNumber}` : 'No order'} 
                      {stop.reached ? ' • Reached' : ' • Pending'}
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
    marginBottom: 8,
  },
  loadingSubText: {
    fontSize: 14,
    textAlign: 'center',
    maxWidth: '80%',
    marginBottom: 20,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 8,
    width: 120,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    width: 100,
  },
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
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
  myLocationButtonContainer: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    alignItems: 'center',
  },
  locationTooltip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  tooltipText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  myLocationButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
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
  infoButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  busInfoTooltip: {
    margin: 16,
    marginTop: 0,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  busInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  busInfoText: {
    marginLeft: 8,
    fontSize: 14,
  },
  refreshStopsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
  },
});
