import { useUser } from '@clerk/clerk-expo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { onValue, ref } from 'firebase/database';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { firestoreDb, realtimeDatabase } from '../../configs/FirebaseConfigs';
import { sendLocalNotification } from '../../utils/notificationHelper';

const BusStopNotifications = ({ isDark }) => {
  const { user } = useUser();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [userBusStop, setUserBusStop] = useState('');
  const [userRouteNumber, setUserRouteNumber] = useState('');
  const [routeStops, setRouteStops] = useState([]);
  const [busLocation, setBusLocation] = useState(null);
  const [notifiedStops, setNotifiedStops] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  // Load user preferences
  useEffect(() => {
    const loadUserPreferences = async () => {
      try {
        const notificationPref = await AsyncStorage.getItem('busStopNotificationsEnabled');
        if (notificationPref !== null) {
          setNotificationsEnabled(notificationPref === 'true');
        }

        // Load user data to get route number and bus stop
        const userData = await AsyncStorage.getItem('userData');
        if (userData) {
          const parsedData = JSON.parse(userData);
          setUserRouteNumber(parsedData.routeNumber || '');
          setUserBusStop(parsedData.busStop || '');
        }
      } catch (error) {
        console.error('Error loading notification preferences:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUserPreferences();
  }, []);

  // Save notification preferences when changed
  useEffect(() => {
    const saveNotificationPreference = async () => {
      try {
        await AsyncStorage.setItem('busStopNotificationsEnabled', notificationsEnabled.toString());
        console.log('Notification preference saved:', notificationsEnabled);
      } catch (error) {
        console.error('Error saving notification preference:', error);
      }
    };

    if (!isLoading) {
      saveNotificationPreference();
    }
  }, [notificationsEnabled, isLoading]);

  // Load route stops when route number changes
  useEffect(() => {
    const loadRouteStops = async () => {
      if (!userRouteNumber) return;

      try {
        const routeRef = collection(firestoreDb, `Route${userRouteNumber}`);
        const stopsSnapshot = await getDocs(routeRef);
        
        if (stopsSnapshot.empty) {
          console.log(`No stops found for route ${userRouteNumber}`);
          setRouteStops([]);
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
          
          setRouteStops(sortedStops.map(stop => stop.name));
          console.log(`Loaded ${sortedStops.length} stops for route ${userRouteNumber}`);
        }
      } catch (error) {
        console.error('Error loading route stops:', error);
        setRouteStops([]);
      }
    };

    loadRouteStops();
  }, [userRouteNumber]);

  // Listen for bus location updates
  useEffect(() => {
    if (!userRouteNumber || !notificationsEnabled) return;

    console.log(`Setting up bus location listener for route ${userRouteNumber}`);
    const locationRef = ref(realtimeDatabase, 'adddelete/Location');
    
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
  }, [userRouteNumber, notificationsEnabled]);

  // Process bus location to determine which stop it's at or approaching
  const processBusLocation = async (locationData) => {
    if (!userBusStop || !userRouteNumber || routeStops.length === 0) return;

    try {
      // Find the index of user's bus stop in the route
      const userStopIndex = routeStops.findIndex(stop => stop === userBusStop);
      if (userStopIndex === -1) {
        console.log('User bus stop not found in route stops');
        return;
      }

      // For each stop, check if the bus is near it
      for (let i = 0; i < routeStops.length; i++) {
        const stopName = routeStops[i];
        
        // Get stop location from Firestore
        const stopRef = doc(firestoreDb, `Route${userRouteNumber}`, stopName);
        const stopDoc = await getDoc(stopRef);
        
        if (!stopDoc.exists()) continue;
        
        const stopData = stopDoc.data();
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
          console.log(`Bus is at or near stop: ${stopName}`);
          
          // Check if this is 2 stops before user's stop
          if (i === userStopIndex - 2 && !notifiedStops[`before_${stopName}`]) {
            sendBusApproachingNotification(stopName, 2);
            setNotifiedStops(prev => ({ ...prev, [`before_${stopName}`]: true }));
          }
          
          // Check if this is 1 stop before user's stop
          if (i === userStopIndex - 1 && !notifiedStops[`before_${stopName}`]) {
            sendBusApproachingNotification(stopName, 1);
            setNotifiedStops(prev => ({ ...prev, [`before_${stopName}`]: true }));
          }
          
          // Check if this is user's stop
          if (i === userStopIndex && !notifiedStops[stopName]) {
            sendBusArrivedNotification(stopName);
            setNotifiedStops(prev => ({ ...prev, [stopName]: true }));
          }
          
          // Check if this is 1 stop after user's stop
          if (i === userStopIndex + 1 && !notifiedStops[`after_${stopName}`]) {
            sendBusPassedNotification(stopName);
            setNotifiedStops(prev => ({ ...prev, [`after_${stopName}`]: true }));
          }
          
          // Check if this is 2 stops after user's stop
          if (i === userStopIndex + 2 && !notifiedStops[`after_${stopName}`]) {
            sendBusPassedNotification(stopName);
            setNotifiedStops(prev => ({ ...prev, [`after_${stopName}`]: true }));
          }
          
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

  // Send notification when bus is approaching user's stop
  const sendBusApproachingNotification = (currentStop, stopsAway) => {
    if (!notificationsEnabled) return;
    
    const title = `Bus Approaching Soon`;
    const body = `Your bus is ${stopsAway} stop${stopsAway > 1 ? 's' : ''} away at ${currentStop}. Get ready!`;
    
    sendLocalNotification(title, body, {
      data: { 
        screen: 'home',
        type: 'approaching',
        currentStop,
        userStop: userBusStop,
        stopsAway
      }
    });
  };

  // Send notification when bus arrives at user's stop
  const sendBusArrivedNotification = (stopName) => {
    if (!notificationsEnabled) return;
    
    const title = `Bus Arrived at Your Stop`;
    const body = `Your bus has arrived at ${stopName}. Don't miss it!`;
    
    sendLocalNotification(title, body, {
      data: { 
        screen: 'home',
        type: 'arrived',
        stopName
      }
    });
  };

  // Send notification when bus has passed user's stop
  const sendBusPassedNotification = (currentStop) => {
    if (!notificationsEnabled) return;
    
    const title = `Bus Passed Your Stop`;
    const body = `The bus is now at ${currentStop}, which is after your stop.`;
    
    sendLocalNotification(title, body, {
      data: { 
        screen: 'home',
        type: 'passed',
        currentStop
      }
    });
  };

  // Toggle notifications
  const toggleNotifications = () => {
    const newValue = !notificationsEnabled;
    setNotificationsEnabled(newValue);
    
    if (newValue) {
      // Reset notified stops when re-enabling
      setNotifiedStops({});
    }
  };

  // Styles based on theme
  const textColor = isDark ? '#fff' : '#000';
  const containerBgColor = isDark ? '#1E1E1E' : '#f5f5f5';

  return (
    <View style={[styles.container, { backgroundColor: containerBgColor }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: textColor }]}>Bus Stop Notifications</Text>
        <Switch
          value={notificationsEnabled}
          onValueChange={toggleNotifications}
          trackColor={{ false: '#767577', true: '#81b0ff' }}
          thumbColor={notificationsEnabled ? '#1E90FF' : '#f4f3f4'}
        />
      </View>
      
      <Text style={[styles.description, { color: textColor }]}>
        {notificationsEnabled 
          ? 'You will receive notifications when the bus is approaching your stop.'
          : 'Notifications are disabled. Toggle the switch to receive alerts.'}
      </Text>
      
      {userRouteNumber && userBusStop ? (
        <View style={styles.infoContainer}>
          <Text style={[styles.infoText, { color: textColor }]}>
            Route: {userRouteNumber}
          </Text>
          <Text style={[styles.infoText, { color: textColor }]}>
            Your Stop: {userBusStop}
          </Text>
        </View>
      ) : (
        <Text style={[styles.warningText, { color: isDark ? '#ff9800' : '#e65100' }]}>
          Please set your route and bus stop in your profile.
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontFamily: 'flux-bold',
  },
  description: {
    fontSize: 14,
    fontFamily: 'flux',
    marginBottom: 16,
    opacity: 0.8,
  },
  infoContainer: {
    marginTop: 8,
  },
  infoText: {
    fontSize: 14,
    fontFamily: 'flux-medium',
    marginBottom: 4,
  },
  warningText: {
    fontSize: 14,
    fontFamily: 'flux-medium',
    marginTop: 8,
  }
});

export default BusStopNotifications;