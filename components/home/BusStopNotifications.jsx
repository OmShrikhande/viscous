import { useUser } from '@clerk/clerk-expo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import { collection, onSnapshot } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { firestoreDb } from '../../configs/FirebaseConfigs';
import { sendLocalNotification } from '../../utils/notificationHelper';

export default function BusStopNotifications({ isDark }) {
  const { user } = useUser();
  const [userBusStop, setUserBusStop] = useState('');
  const [userRouteNumber, setUserRouteNumber] = useState('');
  const [routeStops, setRouteStops] = useState([]);
  const [reachedStops, setReachedStops] = useState({});
  const [notifiedStops, setNotifiedStops] = useState({});
  const [isEmulator] = useState(!Device.isDevice);

  // Load user data
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const userData = await AsyncStorage.getItem('userData');
        if (userData) {
          const parsedData = JSON.parse(userData);
          setUserRouteNumber(parsedData.routeNumber || '');
          setUserBusStop(parsedData.busStop || '');
          console.log('Loaded user data', {
            routeNumber: parsedData.routeNumber,
            busStop: parsedData.busStop
          });
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    };

    loadUserData();
  }, []);

  // Set up Firestore listener for route stops
  useEffect(() => {
    if (!userRouteNumber || !userBusStop) {
      return;
    }

    console.log(`Setting up listener for Route${userRouteNumber}`);
    
    const routeRef = collection(firestoreDb, `Route${userRouteNumber}`);
    const unsubscribe = onSnapshot(routeRef, (snapshot) => {
      // Get all stops and their data
      const stops = snapshot.docs.map(doc => ({
        name: doc.id,
        data: doc.data(),
        serialNumber: doc.data().serialNumber || doc.data().order || 0
      }));
      
      // Sort stops by serialNumber/order
      const sortedStops = stops.sort((a, b) => a.serialNumber - b.serialNumber);
      
      console.log('Sorted stops by serialNumber:', 
        sortedStops.map(s => `${s.name} (${s.serialNumber})`).join(', '));
      
      setRouteStops(sortedStops);
      
      // Find user's stop serialNumber
      const userStop = sortedStops.find(stop => stop.name === userBusStop);
      if (userStop) {
        console.log(`Found user stop ${userBusStop} with serialNumber ${userStop.serialNumber}`);
      } else {
        console.log(`User stop ${userBusStop} not found in route stops`);
        return;
      }
      
      // Process reached stops
      const updatedReachedStops = {};
      stops.forEach(stop => {
        if (stop.data.reached === true) {
          updatedReachedStops[stop.name] = {
            serialNumber: stop.serialNumber,
            reachedTime: stop.data.reachedTime || new Date().toISOString()
          };
        }
      });
      
      setReachedStops(updatedReachedStops);
      
      // Check if we need to send notifications
      if (userStop) {
        processReachedStopsBySerialNumber(updatedReachedStops, userStop.serialNumber, userStop.name);
      }
    });
    
    return () => unsubscribe();
  }, [userRouteNumber, userBusStop]);

  // Process reached stops by serialNumber and send notifications
  const processReachedStopsBySerialNumber = (reachedStops, userStopSerialNumber, userStopName) => {
    if (!userStopSerialNumber || Object.keys(reachedStops).length === 0) return;
    
    console.log(`Processing reached stops for user stop with serialNumber ${userStopSerialNumber}`);
    
    // Find the stop with the highest serialNumber that has been reached
    let highestReachedSerialNumber = -1;
    let highestReachedStopName = '';
    
    Object.entries(reachedStops).forEach(([stopName, data]) => {
      if (data.serialNumber > highestReachedSerialNumber) {
        highestReachedSerialNumber = data.serialNumber;
        highestReachedStopName = stopName;
      }
    });
    
    if (highestReachedSerialNumber === -1) return;
    
    console.log(`User stop serialNumber: ${userStopSerialNumber}, Highest reached: ${highestReachedSerialNumber} (${highestReachedStopName})`);
    
    // Calculate the difference between user stop and current reached stop
    const stopDifference = userStopSerialNumber - highestReachedSerialNumber;
    
    // Determine notification type based on serialNumber difference
    let notificationType = null;
    let notificationTitle = '';
    let notificationBody = '';
    
    if (stopDifference === 2) {
      notificationType = '2_stops_away';
      notificationTitle = 'Bus Approaching Soon';
      notificationBody = `Your bus is 2 stops away at ${highestReachedStopName}. Get ready!`;
    } else if (stopDifference === 1) {
      notificationType = '1_stop_away';
      notificationTitle = 'Bus Approaching Soon';
      notificationBody = `Your bus is 1 stop away at ${highestReachedStopName}. Get ready!`;
    } else if (stopDifference === 0) {
      notificationType = 'arrived';
      notificationTitle = 'Bus Arrived at Your Stop';
      notificationBody = `Your bus has arrived at ${userStopName}. Don't miss it!`;
    } else if (stopDifference === -1) {
      notificationType = 'passed_1';
      notificationTitle = 'Bus Passed Your Stop';
      notificationBody = `The bus has passed your stop and is now at ${highestReachedStopName}.`;
    } else if (stopDifference === -2) {
      notificationType = 'passed_2';
      notificationTitle = 'Bus Passed Your Stop';
      notificationBody = `The bus is now 2 stops past your stop at ${highestReachedStopName}.`;
    }
    
    // Send notification if needed and if it's different from the last one
    if (notificationType && !notifiedStops[notificationType]) {
      console.log(`Sending notification: ${notificationType}`);
      
      // Send notification
      sendBusNotification(notificationTitle, notificationBody, notificationType);
      
      // Update notified stops
      setNotifiedStops(prev => ({ ...prev, [notificationType]: true }));
    }
  };

  // Send bus notification
  const sendBusNotification = async (title, body, type) => {
    try {
      // Send notification
      const notificationId = await sendLocalNotification(
        title, 
        body,
        {
          data: { 
            screen: 'home',
            type: type
          },
          trigger: null, // Send immediately
        }
      );
      
      console.log(`Notification sent with ID: ${notificationId}`);
      
      // Also show an alert in emulator
      if (isEmulator) {
        Alert.alert(title, body);
      }
      
      return true;
    } catch (error) {
      console.error('Error sending notification:', error);
      
      // Fallback to alert
      Alert.alert(title, body);
      
      return false;
    }
  };

  // No visible UI for this component - it works in the background
  return null;
}