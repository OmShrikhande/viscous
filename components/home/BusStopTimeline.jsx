import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { onValue, ref } from 'firebase/database';
import { collection, getDocs } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { firestoreDb, realtimeDatabase } from '../../configs/FirebaseConfigs';

const BusStopTimeline = ({ isDark }) => {
  const [userRouteNumber, setUserRouteNumber] = useState('');
  const [userBusStop, setUserBusStop] = useState('');
  const [routeStops, setRouteStops] = useState([]);
  const [busLocation, setBusLocation] = useState(null);
  const [currentStopIndex, setCurrentStopIndex] = useState(-1);
  const [reachedStops, setReachedStops] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load user data
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const userData = await AsyncStorage.getItem('userData');
        if (userData) {
          const parsedData = JSON.parse(userData);
          setUserRouteNumber(parsedData.routeNumber || '');
          setUserBusStop(parsedData.busStop || '');
        }
      } catch (error) {
        console.error('Error loading user data:', error);
        setError('Failed to load user data');
      } finally {
        setIsLoading(false);
      }
    };

    loadUserData();
  }, []);

  // Load route stops when route number changes
  useEffect(() => {
    const loadRouteStops = async () => {
      if (!userRouteNumber) return;

      try {
        setIsLoading(true);
        const routeRef = collection(firestoreDb, `Route${userRouteNumber}`);
        const stopsSnapshot = await getDocs(routeRef);
        
        if (stopsSnapshot.empty) {
          console.log(`No stops found for route ${userRouteNumber}`);
          setRouteStops([]);
          setError(`No stops found for route ${userRouteNumber}`);
        } else {
          // Get all stop names and sort them in order (assuming they have an order field)
          const stops = stopsSnapshot.docs.map(doc => ({
            name: doc.id,
            data: doc.data()
          }));
          
          // Sort stops by order if available, otherwise just use the array as is
          const sortedStops = stops.sort((a, b) => {
            if (a.data.order !== undefined && b.data.order !== undefined) {
              return a.data.order - b.data.order;
            }
            return 0;
          });
          
          setRouteStops(sortedStops);
          setError(null);
          console.log(`Loaded ${sortedStops.length} stops for route ${userRouteNumber}`);
        }
      } catch (error) {
        console.error('Error loading route stops:', error);
        setRouteStops([]);
        setError('Failed to load route stops');
      } finally {
        setIsLoading(false);
      }
    };

    if (userRouteNumber) {
      loadRouteStops();
    }
  }, [userRouteNumber]);

  // Listen for bus location updates
  useEffect(() => {
    if (!userRouteNumber || routeStops.length === 0) return;

    console.log(`Setting up bus location listener for route ${userRouteNumber}`);
    const locationRef = ref(realtimeDatabase, 'adddelete/Location');
    
    // Create a reference to the latest routeStops to avoid closure issues
    let currentRouteStops = routeStops;
    
    const unsubscribe = onValue(locationRef, (snapshot) => {
      const locationData = snapshot.val();
      if (locationData) {
        // Use functional updates to avoid stale state references
        setBusLocation({
          latitude: locationData.Latitude,
          longitude: locationData.Longitude,
          timestamp: locationData.Timestamp,
          speed: locationData.Speed
        });
        
        // Process bus location to determine which stop it's at or approaching
        processBusLocation(locationData);
      }
    }, (error) => {
      console.error('Error in bus location listener:', error);
      setError('Failed to get bus location updates');
    });

    // Cleanup function
    return () => {
      console.log('Cleaning up bus location listener');
      unsubscribe();
    };
  }, [userRouteNumber, routeStops]);

  // Process bus location to determine which stop it's at or approaching
  const processBusLocation = async (locationData) => {
    if (routeStops.length === 0) return;

    try {
      // For each stop, check if the bus is near it
      for (let i = 0; i < routeStops.length; i++) {
        const stop = routeStops[i];
        const stopData = stop.data;
        
        if (!stopData.latitude || !stopData.longitude) continue;
        
        // Calculate distance between bus and stop
        const distance = calculateDistance(
          locationData.Latitude, 
          locationData.Longitude,
          stopData.latitude,
          stopData.longitude
        );
        
        // If bus is close to a stop (within 100 meters)
        if (distance < 0.1) { // 0.1 km = 100 meters
          console.log(`Bus is at or near stop: ${stop.name}`);
          setCurrentStopIndex(i);
          
          // Mark this stop and all previous stops as reached
          const newReachedStops = { ...reachedStops };
          for (let j = 0; j <= i; j++) {
            newReachedStops[routeStops[j].name] = {
              reached: true,
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
          }
          setReachedStops(newReachedStops);
          
          break; // Exit the loop once we've found the current stop
        }
      }
    } catch (error) {
      console.error('Error processing bus location:', error);
    }
  };

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

  // Styles based on theme
  const textColor = isDark ? '#fff' : '#000';
  const containerBgColor = isDark ? '#1E1E1E' : '#f5f5f5';
  const timelineColor = isDark ? '#444' : '#ddd';
  const accentColor = '#1E90FF';

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: containerBgColor }]}>
        <ActivityIndicator size="large" color={accentColor} />
        <Text style={[styles.loadingText, { color: textColor }]}>
          Loading bus stops...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: containerBgColor }]}>
        <Ionicons name="alert-circle-outline" size={40} color={isDark ? '#ff9800' : '#e65100'} />
        <Text style={[styles.errorText, { color: textColor }]}>
          {error}
        </Text>
        {!userRouteNumber && (
          <Text style={[styles.helpText, { color: textColor }]}>
            Please set your route number in your profile.
          </Text>
        )}
      </View>
    );
  }

  if (routeStops.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: containerBgColor }]}>
        <Ionicons name="bus-outline" size={40} color={accentColor} />
        <Text style={[styles.emptyText, { color: textColor }]}>
          No bus stops found for route {userRouteNumber}.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={[styles.scrollContainer, { backgroundColor: containerBgColor }]}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <Animated.Text 
        entering={FadeInDown.delay(200).springify()}
        style={[styles.title, { color: textColor }]}
      >
        Route {userRouteNumber} Timeline
      </Animated.Text>
      
      <View style={styles.timelineContainer}>
        {routeStops.map((stop, index) => {
          const isCurrentStop = index === currentStopIndex;
          const isReached = reachedStops[stop.name]?.reached;
          const isUserStop = stop.name === userBusStop;
          
          return (
            <Animated.View 
              key={stop.name}
              entering={FadeInDown.delay(200 + index * 50).springify()}
              style={styles.stopContainer}
            >
              {/* Timeline line */}
              {index < routeStops.length - 1 && (
                <View 
                  style={[
                    styles.timelineLine, 
                    { 
                      backgroundColor: isReached ? accentColor : timelineColor,
                      height: index === routeStops.length - 2 ? 30 : 60 
                    }
                  ]} 
                />
              )}
              
              {/* Stop indicator */}
              <View 
                style={[
                  styles.stopIndicator,
                  isCurrentStop && styles.currentStopIndicator,
                  isReached && styles.reachedStopIndicator,
                  isUserStop && styles.userStopIndicator,
                  { borderColor: isReached ? accentColor : timelineColor }
                ]}
              >
                {isCurrentStop && (
                  <View style={styles.currentStopInner} />
                )}
                {isUserStop && (
                  <Ionicons name="person" size={12} color="#fff" />
                )}
              </View>
              
              {/* Stop details */}
              <View style={styles.stopDetails}>
                <Text 
                  style={[
                    styles.stopName, 
                    { color: textColor },
                    isUserStop && styles.userStopText,
                    isCurrentStop && styles.currentStopText
                  ]}
                >
                  {stop.name}
                  {isUserStop && ' (Your Stop)'}
                </Text>
                
                {reachedStops[stop.name]?.reached && (
                  <Text style={[styles.reachedTime, { color: isDark ? '#aaa' : '#666' }]}>
                    Reached at {reachedStops[stop.name].time}
                  </Text>
                )}
                
                {isCurrentStop && (
                  <View style={styles.currentStopBadge}>
                    <Text style={styles.currentStopBadgeText}>
                      Bus is here
                    </Text>
                  </View>
                )}
              </View>
            </Animated.View>
          );
        })}
      </View>
      
      {busLocation && (
        <View style={[styles.busInfoContainer, { backgroundColor: isDark ? '#2a2a2a' : '#e6e6e6' }]}>
          <Text style={[styles.busInfoTitle, { color: textColor }]}>
            Live Bus Info
          </Text>
          <Text style={[styles.busInfoText, { color: textColor }]}>
            Speed: {busLocation.speed} km/h
          </Text>
          <Text style={[styles.busInfoText, { color: textColor }]}>
            Last Updated: {new Date(busLocation.timestamp).toLocaleTimeString()}
          </Text>
        </View>
      )}
    </ScrollView>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    borderRadius: 12,
  },
  scrollContainer: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 30,
  },
  title: {
    fontSize: 20,
    fontFamily: 'flux-bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  timelineContainer: {
    paddingLeft: 20,
  },
  stopContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    position: 'relative',
  },
  timelineLine: {
    width: 3,
    height: 60,
    position: 'absolute',
    left: 10,
    top: 20,
    zIndex: 1,
  },
  stopIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'transparent',
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    zIndex: 2,
  },
  reachedStopIndicator: {
    backgroundColor: '#1E90FF',
    borderColor: '#1E90FF',
  },
  currentStopIndicator: {
    backgroundColor: '#1E90FF',
    borderColor: '#1E90FF',
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  currentStopInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#fff',
  },
  userStopIndicator: {
    backgroundColor: '#ff6b6b',
    borderColor: '#ff6b6b',
  },
  stopDetails: {
    flex: 1,
    paddingVertical: 10,
    marginBottom: 10,
  },
  stopName: {
    fontSize: 16,
    fontFamily: 'flux-medium',
    marginBottom: 4,
  },
  userStopText: {
    fontFamily: 'flux-bold',
    color: '#ff6b6b',
  },
  currentStopText: {
    fontFamily: 'flux-bold',
    color: '#1E90FF',
  },
  reachedTime: {
    fontSize: 12,
    fontFamily: 'flux',
  },
  currentStopBadge: {
    backgroundColor: '#1E90FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  currentStopBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'flux-bold',
  },
  busInfoContainer: {
    marginTop: 20,
    padding: 15,
    borderRadius: 12,
    width: '100%',
  },
  busInfoTitle: {
    fontSize: 16,
    fontFamily: 'flux-bold',
    marginBottom: 8,
  },
  busInfoText: {
    fontSize: 14,
    fontFamily: 'flux',
    marginBottom: 4,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    fontFamily: 'flux-medium',
  },
  errorText: {
    marginTop: 10,
    fontSize: 16,
    fontFamily: 'flux-medium',
    textAlign: 'center',
  },
  helpText: {
    marginTop: 8,
    fontSize: 14,
    fontFamily: 'flux',
    textAlign: 'center',
    opacity: 0.8,
  },
  emptyText: {
    marginTop: 10,
    fontSize: 16,
    fontFamily: 'flux-medium',
    textAlign: 'center',
  },
});

export default BusStopTimeline;
