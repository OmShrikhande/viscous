import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { onValue, ref } from 'firebase/database';
import { collection, getDocs, onSnapshot } from 'firebase/firestore';
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
  const [stopListeners, setStopListeners] = useState([]);

  // Load user data
  useEffect(() => {
    const loadUserData = async () => {
      try {
        // Load user data
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

  // Load route stops when route number changes and set up listeners for reached status
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
          // Get all stop names and sort them in order
          const stops = stopsSnapshot.docs.map(doc => ({
            name: doc.id,
            data: doc.data()
          }));
          
          // Sort stops by serialNumber if available, then by order as fallback
          const sortedStops = stops.sort((a, b) => {
            // First try to sort by serialNumber
            if (a.data.serialNumber !== undefined && b.data.serialNumber !== undefined) {
              return a.data.serialNumber - b.data.serialNumber;
            }
            // Fall back to order if serialNumber is not available
            else if (a.data.order !== undefined && b.data.order !== undefined) {
              return a.data.order - b.data.order;
            }
            return 0;
          });
          
          setRouteStops(sortedStops);
          
          // Set up listeners for each stop's reached status
          const listeners = [];
          
          // Clean up any existing listeners
          stopListeners.forEach(unsubscribe => unsubscribe());
          
          // Create a single listener for the entire route collection
          const routeRef = collection(firestoreDb, `Route${userRouteNumber}`);
          const unsubscribe = onSnapshot(routeRef, (snapshot) => {
            // Process all changes in a batch for better performance
            const updatedStops = {};
            let highestReachedIndex = -1;
            
            snapshot.docs.forEach(doc => {
              const stopData = doc.data();
              const stopName = doc.id;
              
              if (stopData.reached !== undefined) {
                updatedStops[stopName] = {
                  reached: stopData.reached,
                  time: stopData.reachedTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                };
                
                // If this stop is reached, track its index
                if (stopData.reached) {
                  const stopIndex = sortedStops.findIndex(s => s.name === stopName);
                  if (stopIndex > highestReachedIndex) {
                    highestReachedIndex = stopIndex;
                  }
                }
              }
            });
            
            // Update all reached stops at once for better performance
            if (Object.keys(updatedStops).length > 0) {
              console.log(`Updating ${Object.keys(updatedStops).length} stops from Firestore`);
              setReachedStops(updatedStops);
              
              // Update current stop index if needed
              if (highestReachedIndex > currentStopIndex) {
                console.log(`Updating current stop index to ${highestReachedIndex}`);
                setCurrentStopIndex(highestReachedIndex);
              }
            }
          }, error => {
            console.error(`Error listening to route ${userRouteNumber}:`, error);
          });
          
          listeners.push(unsubscribe);
          
          setStopListeners(listeners);
          setError(null);
          console.log(`Loaded ${sortedStops.length} stops for route ${userRouteNumber} and set up listeners`);
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
    
    // Clean up listeners when component unmounts or route changes
    return () => {
      stopListeners.forEach(unsubscribe => unsubscribe());
    };
  }, [userRouteNumber]);

  // Add a useEffect to log when reachedStops changes
  useEffect(() => {
    if (Object.keys(reachedStops).length > 0) {
      console.log('Reached stops updated:', Object.keys(reachedStops)
        .filter(name => reachedStops[name].reached)
        .map(name => name)
        .join(', '));
    }
  }, [reachedStops]);

  // Listen for bus location updates (only for display purposes)
  useEffect(() => {
    if (!userRouteNumber || routeStops.length === 0) return;

    console.log(`Setting up bus location listener for route ${userRouteNumber}`);
    const locationRef = ref(realtimeDatabase, 'adddelete/Location');
    
    const unsubscribe = onValue(locationRef, (snapshot) => {
      const locationData = snapshot.val();
      if (locationData) {
        // Update bus location state
        setBusLocation({
          latitude: locationData.Latitude,
          longitude: locationData.Longitude,
          timestamp: locationData.Timestamp,
          speed: locationData.Speed
        });
        
        // Log the location update
        console.log(`Bus location update: Lat ${locationData.Latitude.toFixed(6)}, Lng ${locationData.Longitude.toFixed(6)}, Time: ${new Date(locationData.Timestamp).toLocaleTimeString()}`);
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

  // Memoize the timeline content to prevent unnecessary re-renders
  const renderTimeline = () => {
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
        {/* Center timeline line */}
        <View style={[styles.centerLine, { backgroundColor: isDark ? '#444' : '#ddd' }]} />
        
        {routeStops.map((stop, index) => {
          const isCurrentStop = index === currentStopIndex;
          const isReached = reachedStops[stop.name]?.reached;
          const isUserStop = stop.name === userBusStop;
          const isEven = index % 2 === 0;
          const isNext = index === currentStopIndex + 1;
          const isLast = index === routeStops.length - 1;
          
          // Determine stop status color based on the new requirements
          let stopColor = '#888888'; // Default gray for unreached
          if (isReached) stopColor = '#4CAF50'; // Green for reached
          else if (isNext) stopColor = '#FFC107'; // Yellow for next stop after reached
          
          return (
            <View key={stop.name} style={styles.stopRow}>
              {/* Left side content */}
              <View style={[styles.leftSide, !isEven && styles.activeSide]}>
                {!isEven && (
                  <View style={[
                    styles.stopCard, 
                    { backgroundColor: isDark ? '#2a2a2a' : '#fff' },
                    isCurrentStop && styles.currentStopCard,
                    isUserStop && styles.userStopCard,
                    isNext && styles.nextStopCard,
                  ]}>
                    <Text 
                      style={[
                        styles.stopName, 
                        { color: textColor },
                        isUserStop && styles.userStopText,
                        isCurrentStop && styles.currentStopText
                      ]}
                      numberOfLines={1}
                    >
                      {stop.name}
                      {isUserStop && " (Your Stop)"}
                    </Text>
                    
                    {reachedStops[stop.name]?.reached && (
                      <Text style={[styles.timeText, { color: isDark ? '#aaa' : '#666' }]}>
                        Reached at {reachedStops[stop.name].time}
                      </Text>
                    )}
                    
                    {isCurrentStop && (
                      <View style={styles.statusBadge}>
                        <Text style={styles.statusText}>Bus is here</Text>
                      </View>
                    )}
                    
                    {isNext && (
                      <View style={[styles.statusBadge, styles.nextBadge]}>
                        <Text style={styles.statusText}>Next stop</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
              
              {/* Center indicator */}
              <View style={styles.centerIndicator}>
                <View 
                  style={[
                    styles.circle,
                    { borderColor: stopColor },
                    isReached && { backgroundColor: stopColor },
                    isCurrentStop && styles.currentCircle,
                    isUserStop && styles.userCircle
                  ]}
                >
                  {isCurrentStop && <View style={styles.innerDot} />}
                  {isUserStop && !isCurrentStop && <Ionicons name="person" size={12} color={isReached ? "#fff" : "#ff6b6b"} />}
                  {isReached && !isCurrentStop && !isUserStop && <Ionicons name="checkmark" size={12} color="#fff" />}
                </View>
                
                {!isLast && (
                  <View 
                    style={[
                      styles.connector, 
                      { backgroundColor: isReached ? '#4CAF50' : (isNext ? '#FFC107' : '#888888') }
                    ]} 
                  />
                )}
              </View>
              
              {/* Right side content */}
              <View style={[styles.rightSide, isEven && styles.activeSide]}>
                {isEven && (
                  <View style={[
                    styles.stopCard, 
                    { backgroundColor: isDark ? '#2a2a2a' : '#fff' },
                    isCurrentStop && styles.currentStopCard,
                    isUserStop && styles.userStopCard,
                    isNext && styles.nextStopCard,
                  ]}>
                    <Text 
                      style={[
                        styles.stopName, 
                        { color: textColor },
                        isUserStop && styles.userStopText,
                        isCurrentStop && styles.currentStopText
                      ]}
                      numberOfLines={1}
                    >
                      {stop.name}
                      {isUserStop && " (Your Stop)"}
                    </Text>
                    
                    {reachedStops[stop.name]?.reached && (
                      <Text style={[styles.timeText, { color: isDark ? '#aaa' : '#666' }]}>
                        Reached at {reachedStops[stop.name].time}
                      </Text>
                    )}
                    
                    {isCurrentStop && (
                      <View style={styles.statusBadge}>
                        <Text style={styles.statusText}>Bus is here</Text>
                      </View>
                    )}
                    
                    {isNext && (
                      <View style={[styles.statusBadge, styles.nextBadge]}>
                        <Text style={styles.statusText}>Next stop</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            </View>
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
  
  // Return the memoized timeline
  return renderTimeline();
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
  userStopText: {
    fontWeight: 'bold',
    fontSize: 16,
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
    position: 'relative',
    paddingVertical: 20,
    paddingHorizontal: 10,
  },
  // Center vertical timeline line
  centerLine: {
    position: 'absolute',
    width: 0,
    top: 0,
    bottom: 0,
    left: '50%',
    marginLeft: -1.5,
    zIndex: -1,
  },
  // Row for each stop
  stopRow: {
    flexDirection: 'row',
    minHeight: 80,
    position: 'relative',
    marginBottom: 15,
  },
  // Left side of timeline
  leftSide: {
    flex: 1,
    paddingRight: 15,
    alignItems: 'flex-end',
  },
  // Right side of timeline
  rightSide: {
    flex: 1,
    paddingLeft: 15,
    alignItems: 'flex-start',
  },
  // Active side (the side that has content)
  activeSide: {
    opacity: 1,
  },
  // Center indicator container
  centerIndicator: {
    width: 30,
    alignItems: 'center',
    zIndex: 2,
  },
  // Circle for stop indicator
  circle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 3,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Current stop indicator
  currentCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 4,
    borderColor: '#1E90FF',
    backgroundColor: '#1E90FF',
  },
  // User's stop indicator
  userCircle: {
    borderColor: '#ff6b6b',
    backgroundColor: '#ff6b6b',
  },
  // Inner dot for current stop
  innerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  // Connector line between stops
  connector: {
    width: 3,
    height: 60,
    marginTop: 5,
  },
  // Card for stop details
  stopCard: {
    padding: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
    width: '90%',
    maxWidth: 200,
  },
  // Current stop card
  currentStopCard: {
    borderLeftWidth: 3,
    borderLeftColor: '#1E90FF',
  },
  // User stop card
  userStopCard: {
    borderLeftWidth: 3,
    borderLeftColor: '#333333',
    borderWidth: 2,
    borderColor: '#333333',
  },
  // Next stop card
  nextStopCard: {
    borderLeftWidth: 3,
    borderLeftColor: '#FF9800',
  },
  // Stop name text
  stopName: {
    fontSize: 15,
    fontFamily: 'flux-bold',
    marginBottom: 6,
  },
  // User stop text
  userStopText: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  // Current stop text
  currentStopText: {
    color: '#1E90FF',
  },
  // Time text for reached stops
  timeText: {
    fontSize: 12,
    fontFamily: 'flux',
    marginBottom: 6,
  },
  // Status badge
  statusBadge: {
    backgroundColor: '#1E90FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  // Next stop badge
  nextBadge: {
    backgroundColor: '#FFC107', // Yellow for next stop
  },
  // Status text inside badge
  statusText: {
    color: '#fff',
    fontSize: 11,
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
