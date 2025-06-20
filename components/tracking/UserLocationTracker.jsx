import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, AppState } from 'react-native';
import * as Location from 'expo-location';
import { onValue, ref, set, get } from 'firebase/database';
import { doc, updateDoc, getDoc, increment,onSnapshot } from 'firebase/firestore';
import { realtimeDatabase, firestoreDb } from '../../configs/FirebaseConfigs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';

// Define the background task name
const LOCATION_TRACKING_TASK = 'location-tracking-task';

// Define the distance threshold in meters
const PROXIMITY_THRESHOLD = 10;

// Register the background task
TaskManager.defineTask(LOCATION_TRACKING_TASK, async ({ data, error }) => {
  if (error) {
    console.error('Background location task error:', error);
    return;
  }
  
  if (!data) {
    console.log('No data received in background location task');
    return;
  }
  
  try {
    const { locations } = data;
    const userLocation = locations[0];
    
    // Get user data from AsyncStorage
    const userDataJson = await AsyncStorage.getItem('userData');
    if (!userDataJson) {
      console.log('No user data found in AsyncStorage');
      return;
    }
    
    const userData = JSON.parse(userDataJson);
    const { email, routeNumber } = userData;
    
    if (!email || !routeNumber) {
      console.log('Missing email or route number in user data');
      return;
    }
    
    // Get bus location from Firebase
    const busLocationRef = ref(realtimeDatabase, `bus/Location`);
    const busLocationSnapshot = await get(busLocationRef);
    const busLocationData = busLocationSnapshot.val();
    
    if (!busLocationData || !busLocationData.Latitude || !busLocationData.Longitude) {
      console.log('No valid bus location data found');
      return;
    }
    
    const busLocation = {
      latitude: parseFloat(busLocationData.Latitude),
      longitude: parseFloat(busLocationData.Longitude)
    };
    
    // Calculate distance between user and bus
    const distance = calculateDistance(
      userLocation.coords.latitude,
      userLocation.coords.longitude,
      busLocation.latitude,
      busLocation.longitude
    );
    
    // Get current onboarding status
    const userDocRef = doc(firestoreDb, 'userdata', email);
    const userDocSnapshot = await getDoc(userDocRef);
    
    if (!userDocSnapshot.exists()) {
      console.log('User document not found in Firestore');
      return;
    }
    
    const userDocData = userDocSnapshot.data();
    const currentlyOnboard = userDocData.onboarding === true;
    
    // Check if user is near the bus
    if (distance <= PROXIMITY_THRESHOLD) {
      // User is near the bus
      if (!currentlyOnboard) {
        // User just boarded the bus
        await updateDoc(userDocRef, {
          onboarding: true,
          lastBoardingTime: new Date().toISOString()
        });
        
        // Increment the passenger count
        const routeCapacityRef = ref(realtimeDatabase, `Route${routeNumber}/demo/capacity`);
        const routeCapacitySnapshot = await get(routeCapacityRef);
        const currentCapacity = routeCapacitySnapshot.val() || 0;
        
        await set(routeCapacityRef, currentCapacity + 1);
        console.log('User boarded the bus, capacity increased to', currentCapacity + 1);
      }
    } else {
      // User is not near the bus
      if (currentlyOnboard) {
        // Check if enough time has passed since boarding (to avoid false exits)
        const lastBoardingTime = new Date(userDocData.lastBoardingTime || 0);
        const currentTime = new Date();
        const timeDifference = currentTime - lastBoardingTime;
        
        // Only consider it a departure if at least 1 minute has passed since boarding
        if (timeDifference > 60000) {
          // User just left the bus
          await updateDoc(userDocRef, {
            onboarding: false,
            lastDepartureTime: new Date().toISOString()
          });
          
          // Decrement the passenger count
          const routeCapacityRef = ref(realtimeDatabase, `Route${routeNumber}/demo/capacity`);
          const routeCapacitySnapshot = await get(routeCapacityRef);
          const currentCapacity = routeCapacitySnapshot.val() || 0;
          
          // Ensure we don't go below zero
          if (currentCapacity > 0) {
            await set(routeCapacityRef, currentCapacity - 1);
            console.log('User left the bus, capacity decreased to', currentCapacity - 1);
          }
        }
      }
    }
    
    // Return success
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error('Error in background location task:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// Haversine formula to calculate distance between two coordinates in meters
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
};

const UserLocationTracker = ({ children }) => {
  const [hasPermission, setHasPermission] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [busLocation, setBusLocation] = useState(null);
  const [distance, setDistance] = useState(null);
  const [isOnboard, setIsOnboard] = useState(false);
  const [userEmail, setUserEmail] = useState(null);
  const [routeNumber, setRouteNumber] = useState(null);
  
  const appState = useRef(AppState.currentState);
  const locationSubscription = useRef(null);
  
  // Request location permissions
  useEffect(() => {
    const requestPermissions = async () => {
      try {
        const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
        
        if (foregroundStatus !== 'granted') {
          console.log('Foreground location permission denied');
          return;
        }
        
        const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
        
        if (backgroundStatus !== 'granted') {
          console.log('Background location permission denied');
          // We can still use foreground tracking
          setHasPermission(true);
          return;
        }
        
        setHasPermission(true);
      } catch (error) {
        console.error('Error requesting location permissions:', error);
      }
    };
    
    requestPermissions();
  }, []);
  
  // Load user data
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const userDataJson = await AsyncStorage.getItem('userData');
        
        if (!userDataJson) {
          console.log('No user data found in AsyncStorage');
          return;
        }
        
        const userData = JSON.parse(userDataJson);
        setUserEmail(userData.email);
        setRouteNumber(userData.routeNumber);
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    };
    
    loadUserData();
  }, []);
  
  // Start location tracking
  useEffect(() => {
    if (!hasPermission || !userEmail || !routeNumber) return;
    
    const startLocationTracking = async () => {
      try {
        // Register the background task
        await Location.startLocationUpdatesAsync(LOCATION_TRACKING_TASK, {
          accuracy: Location.Accuracy.High,
          distanceInterval: 5, // Update every 5 meters
          timeInterval: 10000, // Update every 10 seconds
          foregroundService: {
            notificationTitle: "Bus Tracker",
            notificationBody: "Tracking your location to detect bus proximity",
          },
        });
        
        // Start foreground tracking
        locationSubscription.current = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            distanceInterval: 5,
            timeInterval: 5000,
          },
          (location) => {
            setUserLocation(location.coords);
            checkProximity(location.coords);
          }
        );
        
        setIsTracking(true);
        console.log('Location tracking started');
      } catch (error) {
        console.error('Error starting location tracking:', error);
      }
    };
    
    // Listen for bus location updates
    const busLocationRef = ref(realtimeDatabase, 'bus/Location');
    const busLocationListener = onValue(busLocationRef, (snapshot) => {
      const data = snapshot.val();
      
      if (data && data.Latitude && data.Longitude) {
        const location = {
          latitude: parseFloat(data.Latitude),
          longitude: parseFloat(data.Longitude),
        };
        
        setBusLocation(location);
        
        // If we have user location, check proximity
        if (userLocation) {
          const dist = calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            location.latitude,
            location.longitude
          );
          
          setDistance(dist);
        }
      }
    });
    
    // Listen for onboarding status changes
    const userDocRef = doc(firestoreDb, 'userdata', userEmail);
    const userDocListener = onSnapshot(userDocRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const data = docSnapshot.data();
        setIsOnboard(data.onboarding === true);
      }
    });
    
    // Start tracking
    startLocationTracking();
    
    // Handle app state changes
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.current === 'active' && nextAppState.match(/inactive|background/)) {
        // App is going to background
        console.log('App going to background, location tracking continues');
      }
      
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // App is coming to foreground
        console.log('App coming to foreground, refreshing location tracking');
        
        // Restart foreground tracking
        if (locationSubscription.current) {
          locationSubscription.current.remove();
        }
        
        Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            distanceInterval: 5,
            timeInterval: 5000,
          },
          (location) => {
            setUserLocation(location.coords);
            checkProximity(location.coords);
          }
        ).then(subscription => {
          locationSubscription.current = subscription;
        });
      }
      
      appState.current = nextAppState;
    });
    
    // Cleanup
    return () => {
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }
      
      Location.hasStartedLocationUpdatesAsync(LOCATION_TRACKING_TASK).then(hasStarted => {
        if (hasStarted) {
          Location.stopLocationUpdatesAsync(LOCATION_TRACKING_TASK);
        }
      });
      
      busLocationListener();
      userDocListener();
      subscription.remove();
      
      setIsTracking(false);
      console.log('Location tracking stopped');
    };
  }, [hasPermission, userEmail, routeNumber]);
  
  // Check proximity and update onboarding status
  const checkProximity = async (userCoords) => {
    if (!busLocation || !userEmail || !routeNumber) return;
    
    const dist = calculateDistance(
      userCoords.latitude,
      userCoords.longitude,
      busLocation.latitude,
      busLocation.longitude
    );
    
    setDistance(dist);
    
    // Get current onboarding status
    const userDocRef = doc(firestoreDb, 'userdata', userEmail);
    const userDocSnapshot = await getDoc(userDocRef);
    
    if (!userDocSnapshot.exists()) {
      console.log('User document not found in Firestore');
      return;
    }
    
    const userDocData = userDocSnapshot.data();
    const currentlyOnboard = userDocData.onboarding === true;
    
    // Check if user is near the bus
    if (dist <= PROXIMITY_THRESHOLD) {
      // User is near the bus
      if (!currentlyOnboard) {
        // User just boarded the bus
        await updateDoc(userDocRef, {
          onboarding: true,
          lastBoardingTime: new Date().toISOString()
        });
        
        // Increment the passenger count
        const routeCapacityRef = ref(realtimeDatabase, `Route${routeNumber}/demo/capacity`);
        const routeCapacitySnapshot = await get(routeCapacityRef);
        const currentCapacity = routeCapacitySnapshot.val() || 0;
        
        await set(routeCapacityRef, currentCapacity + 1);
        console.log('User boarded the bus, capacity increased to', currentCapacity + 1);
      }
    } else {
      // User is not near the bus
      if (currentlyOnboard) {
        // Check if enough time has passed since boarding (to avoid false exits)
        const lastBoardingTime = new Date(userDocData.lastBoardingTime || 0);
        const currentTime = new Date();
        const timeDifference = currentTime - lastBoardingTime;
        
        // Only consider it a departure if at least 1 minute has passed since boarding
        if (timeDifference > 60000) {
          // User just left the bus
          await updateDoc(userDocRef, {
            onboarding: false,
            lastDepartureTime: new Date().toISOString()
          });
          
          // Decrement the passenger count
          const routeCapacityRef = ref(realtimeDatabase, `Route${routeNumber}/demo/capacity`);
          const routeCapacitySnapshot = await get(routeCapacityRef);
          const currentCapacity = routeCapacitySnapshot.val() || 0;
          
          // Ensure we don't go below zero
          if (currentCapacity > 0) {
            await set(routeCapacityRef, currentCapacity - 1);
            console.log('User left the bus, capacity decreased to', currentCapacity - 1);
          }
        }
      }
    }
  };
  
  // Render children without any UI of its own
  return children;
};

export default UserLocationTracker;