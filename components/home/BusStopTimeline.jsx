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
  TouchableOpacity,
  View
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { firestoreDb, realtimeDatabase } from '../../configs/FirebaseConfigs';
import { checkFirestoreConnection, handleFirestoreError } from '../../utils/firebaseConnectionCheck';
import { debugRealtimeStructure, debugRouteData } from '../../utils/firebaseDebugger';
import { registerListener } from '../../utils/firebaseListenerManager';

const BusStopTimeline = ({ isDark, refreshing }) => {
  const [userRouteNumber, setUserRouteNumber] = useState('');
  const [userBusStop, setUserBusStop] = useState('');
  const [routeStops, setRouteStops] = useState([]);
  const [busLocation, setBusLocation] = useState(null);
  const [currentStopIndex, setCurrentStopIndex] = useState(-1);
  const [reachedStops, setReachedStops] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stopListeners, setStopListeners] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState(true);
  const [manualRefreshing, setManualRefreshing] = useState(false);

  // Extract route loading logic into a reusable function
  const loadRouteStopsData = async (routeNumber) => {
    try {
      setIsLoading(true);
      
      // Run debug checks for this route
      console.log(`🔍 BusStopTimeline - Loading route ${routeNumber} data...`);
      await debugRouteData(routeNumber);
      
      // Check connection first
      const isConnected = await checkFirestoreConnection();
      setConnectionStatus(isConnected);
      
      if (!isConnected) {
        setError('Firebase connection issue. Please check your internet connection and try again.');
        setIsLoading(false);
        return;
      }
      
      const routeRef = collection(firestoreDb, `Route${routeNumber}`);
      const stopsSnapshot = await getDocs(routeRef);
      
      if (stopsSnapshot.empty) {
        console.log(`No stops found for route ${routeNumber}`);
        setRouteStops([]);
        setError(`No stops found for route ${routeNumber}`);
      } else {
        // Get all stop names and sort them in order
        const stops = stopsSnapshot.docs.map(doc => ({
          name: doc.id,
          data: doc.data()
        }));
        
        // Sort stops by serialNumber if available, then by order as fallback
        const sortedStops = stops.sort((a, b) => {
          // First try to sort by serialNumber (match backend structure)
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
        const routeRef = collection(firestoreDb, `Route${routeNumber}`);
        console.log(`BusStopTimeline - Setting up Firestore listener for collection: Route${routeNumber}`);
        const routeListener = onSnapshot(routeRef, (snapshot) => {
          try {
            console.log(`BusStopTimeline - Received snapshot for Route${routeNumber} with ${snapshot.docs.length} documents`);
            
            // Process all changes in a batch for better performance
            const updatedStops = {};
            let highestReachedIndex = -1;
            
            // Log all stops with reached status for debugging
            const reachedStopsDebug = [];
            
            snapshot.docs.forEach(doc => {
              try {
                const stopData = doc.data();
                const stopName = doc.id;
                
                // Log each stop's reached status for debugging
                console.log(`BusStopTimeline - Stop ${stopName} data:`, JSON.stringify({
                  reached: stopData.reached,
                  reachedTime: stopData.reachedTime,
                  serialNumber: stopData.serialNumber || stopData.order || 0,
                  allFields: Object.keys(stopData)
                }));
                
                // Check for reached status in multiple ways to be more flexible
                const isReached = 
                  stopData.reached === true || 
                  stopData.reached === 'true' || 
                  stopData.reached === 1 ||
                  stopData.reached === '1' ||
                  stopData.isReached === true ||
                  stopData.isReached === 'true';
                
                if (isReached) {
                  reachedStopsDebug.push(stopName);
                  console.log(`Stop ${stopName} is marked as reached!`);
                }
                
                // Always process the stop, even if reached is undefined
                updatedStops[stopName] = {
                  reached: isReached,
                  time: stopData.reachedTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                };
                
                // If this stop is reached, track its index
                if (isReached) {
                  const stopIndex = sortedStops.findIndex(s => s.name === stopName);
                  console.log(`Found reached stop ${stopName} at index ${stopIndex}`);
                  if (stopIndex > highestReachedIndex) {
                    highestReachedIndex = stopIndex;
                    console.log(`New highest reached index: ${highestReachedIndex}`);
                  }
                }
              } catch (docError) {
                console.error(`Error processing stop document:`, docError);
              }
            });
            
            // Log reached stops for debugging
            if (reachedStopsDebug.length > 0) {
              console.log(`Reached stops in this snapshot: ${reachedStopsDebug.join(', ')}`);
            } else {
              console.log('No reached stops found in this snapshot');
            }
            
            // Update all reached stops at once for better performance
            if (Object.keys(updatedStops).length > 0) {
              console.log(`Updating ${Object.keys(updatedStops).length} stops from Firestore`);
              
              // Log which stops are marked as reached
              const reachedStopNames = Object.keys(updatedStops)
                .filter(name => updatedStops[name].reached)
                .join(', ');
                
              console.log(`Stops marked as reached: ${reachedStopNames || 'None'}`);
              
              setReachedStops(updatedStops);
              
              // Update current stop index if needed
              if (highestReachedIndex > currentStopIndex) {
                console.log(`Updating current stop index to ${highestReachedIndex}`);
                setCurrentStopIndex(highestReachedIndex);
              } else {
                console.log(`Current stop index remains at ${currentStopIndex}, highest reached is ${highestReachedIndex}`);
              }
            }
          } catch (snapshotError) {
            console.error(`Error processing snapshot for route ${routeNumber}:`, snapshotError);
          }
        }, async error => {
          console.error(`Error listening to route ${routeNumber}:`, error);
          // Try to provide more details about the error
          console.error(`Error details: ${error.code} - ${error.message}`);
          
          // Check if it's a connection error
          const isConnectionError = await handleFirestoreError(error);
          if (isConnectionError) {
            setConnectionStatus(false);
            setError('Firebase connection issue. Please check your internet connection.');
          }
        });
        
        // Register with our listener manager - use background type for better reliability
        const unregisterRouteListener = registerListener(
          `timeline-route-${routeNumber}`,
          routeListener,
          'background' // Use background type to ensure it keeps working even when not directly visible
        );
        
        listeners.push(unregisterRouteListener);
        
        setStopListeners(listeners);
        setError(null);
        console.log(`Loaded ${sortedStops.length} stops for route ${routeNumber} and set up listeners`);
      }
    } catch (error) {
      console.error('Error loading route stops:', error);
      setRouteStops([]);
      setError('Failed to load route stops');
    } finally {
      setIsLoading(false);
    }
  };

  // Manual refresh function
  const handleManualRefresh = async () => {
    setManualRefreshing(true);
    try {
      console.log('🔄 Manual refresh triggered for BusStopTimeline');
      
      // Clear current data
      setRouteStops([]);
      setReachedStops({});
      setCurrentStopIndex(-1);
      setBusLocation(null);
      setError(null);
      
      // Clean up existing listeners
      stopListeners.forEach(unsubscribe => unsubscribe());
      setStopListeners([]);
      
      // Reload user data and route stops
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const parsedData = JSON.parse(userData);
        const routeNumber = parsedData.routeNumber || '';
        
        if (routeNumber) {
          // Force reload route data
          await loadRouteStopsData(routeNumber);
        }
      }
    } catch (error) {
      console.error('Error during manual refresh:', error);
      setError('Failed to refresh data');
    } finally {
      setManualRefreshing(false);
    }
  };

  // Handle refresh from parent component
  useEffect(() => {
    if (refreshing && !manualRefreshing) {
      console.log('🔄 Parent refresh detected for BusStopTimeline');
      handleManualRefresh();
    }
  }, [refreshing]);

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

  // Check connection status periodically
  useEffect(() => {
    const checkConnection = async () => {
      const isConnected = await checkFirestoreConnection();
      setConnectionStatus(isConnected);
    };
    
    // Check immediately
    checkConnection();
    
    // Then check every 30 seconds
    const intervalId = setInterval(checkConnection, 30000);
    
    return () => clearInterval(intervalId);
  }, []);

  // Load route stops when route number changes and set up listeners for reached status
  useEffect(() => {
    if (userRouteNumber) {
      loadRouteStopsData(userRouteNumber);
    }
    
    // Clean up listeners when component unmounts or route changes
    return () => {
      stopListeners.forEach(unsubscribe => unsubscribe());
    };
  }, [userRouteNumber]);


  // Listen for bus location updates (only for display purposes)
  useEffect(() => {
    if (!userRouteNumber || routeStops.length === 0) return;

    console.log(`Setting up bus location listener for route ${userRouteNumber}`);
    
    // Debug the realtime database structure
    debugRealtimeStructure().catch(error => {
      console.error('Debug realtime structure failed:', error);
    });
    
    const locationRef = ref(realtimeDatabase, 'bus/Location');
    
    const locationListener = onValue(locationRef, (snapshot) => {
      const locationData = snapshot.val();
      console.log('BusStopTimeline - Raw location data:', locationData);
      if (locationData && locationData.Latitude && locationData.Longitude) {
        // Update bus location state
        setBusLocation({
          latitude: locationData.Latitude,
          longitude: locationData.Longitude,
          timestamp: locationData.Timestamp,
          speed: locationData.Speed
        });
        
        // Log the location update
        console.log(`Bus location update: Lat ${locationData.Latitude.toFixed(6)}, Lng ${locationData.Longitude.toFixed(6)}, Time: ${locationData.Timestamp}`);
      } else {
        console.warn('BusStopTimeline - Incomplete location data received:', locationData);
      }
    }, (error) => {
      console.error('Error in bus location listener:', error);
      console.error('Database path attempted:', 'bus/Location');
      setError('Failed to get bus location updates');
    });
    
    // Register with our listener manager
    const unregisterLocationListener = registerListener(
      `timeline-location-${userRouteNumber}`,
      locationListener,
      'foreground' // Only needed when timeline is visible
    );

    // Cleanup function
    return () => {
      console.log('Cleaning up bus location listener');
      unregisterLocationListener();
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
        {!connectionStatus && (
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={async () => {
              setIsLoading(true);
              setError(null);
              const isConnected = await checkFirestoreConnection();
              setConnectionStatus(isConnected);
              if (isConnected) {
                // Force re-render to reload data
                setUserRouteNumber(prev => prev);
              } else {
                setError('Still having connection issues. Please check your internet connection.');
              }
              setIsLoading(false);
            }}
          >
            <Text style={styles.retryButtonText}>Retry Connection</Text>
          </TouchableOpacity>
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
        {/* Header with title and refresh button */}
        <Animated.View 
          entering={FadeInDown.delay(200).springify()}
          style={styles.headerContainer}
        >
          <Text style={[styles.title, { color: textColor }]}>
            Route {userRouteNumber} Timeline
          </Text>
          <TouchableOpacity 
            style={[
              styles.refreshButton, 
              { 
                backgroundColor: isDark ? '#2a2a2a' : '#f0f0f0',
                opacity: (manualRefreshing || refreshing) ? 0.6 : 1
              }
            ]}
            onPress={handleManualRefresh}
            disabled={manualRefreshing || refreshing}
          >
            <Ionicons 
              name="refresh" 
              size={20} 
              color={accentColor} 
              style={{
                transform: [{ rotate: (manualRefreshing || refreshing) ? '360deg' : '0deg' }]
              }}
            />
            <Text style={[styles.refreshButtonText, { color: accentColor }]}>
              {(manualRefreshing || refreshing) ? 'Refreshing...' : 'Refresh'}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      
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
  retryButton: {
    marginTop: 20,
    backgroundColor: '#1E90FF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontFamily: 'flux-medium',
    fontSize: 16,
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
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 5,
  },
  title: {
    fontSize: 20,
    fontFamily: 'flux-bold',
    flex: 1,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1E90FF',
    marginLeft: 10,
  },
  refreshButtonText: {
    fontSize: 12,
    fontFamily: 'flux-medium',
    marginLeft: 4,
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
