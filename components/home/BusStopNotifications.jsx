import { useUser } from '@clerk/clerk-expo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import { collection, onSnapshot } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { firestoreDb } from '../../configs/FirebaseConfigs';
import { sendLocalNotification } from '../../utils/notificationHelper';
import { registerListener, useListenerStatus } from '../../utils/firebaseListenerManager';
import { registerBusNotificationTask, isTaskRegistered } from '../../utils/backgroundNotificationTask';

export default function BusStopNotifications({ isDark }) {
  const { user } = useUser();
  const [userBusStop, setUserBusStop] = useState('');
  const [userRouteNumber, setUserRouteNumber] = useState('');
  const [routeStops, setRouteStops] = useState([]);
  const [reachedStops, setReachedStops] = useState({});
  const [notifiedStops, setNotifiedStops] = useState({});
  const [isEmulator] = useState(!Device.isDevice);

  // Load user data and notification state
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load user data
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
        
        // Load previously notified stops
        const storedNotifiedStops = await AsyncStorage.getItem('notifiedBusStops');
        if (storedNotifiedStops) {
          try {
            const parsedStops = JSON.parse(storedNotifiedStops);
            setNotifiedStops(parsedStops);
            console.log('Loaded previously notified stops:', Object.keys(parsedStops));
          } catch (parseError) {
            console.error('Error parsing notified stops:', parseError);
            // Reset if corrupted
            await AsyncStorage.removeItem('notifiedBusStops');
          }
        }
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };

    loadData();
    
    // Reset notified stops at midnight
    const resetNotifiedStopsAtMidnight = () => {
      const now = new Date();
      const isNearMidnight = now.getHours() === 0 && now.getMinutes() < 5;
      
      if (isNearMidnight) {
        console.log('Resetting notified stops at midnight');
        setNotifiedStops({});
        AsyncStorage.removeItem('notifiedBusStops');
      }
    };
    
    // Check every 5 minutes
    const intervalId = setInterval(resetNotifiedStopsAtMidnight, 5 * 60 * 1000);
    
    return () => clearInterval(intervalId);
  }, []);
  
  // Register background notification task
  useEffect(() => {
    const setupBackgroundTask = async () => {
      try {
        // Check if task is already registered
        const taskRegistered = await isTaskRegistered();
        
        if (!taskRegistered) {
          console.log('Registering background notification task');
          await registerBusNotificationTask();
        } else {
          console.log('Background notification task already registered');
        }
      } catch (error) {
        console.error('Error setting up background notification task:', error);
      }
    };
    
    setupBackgroundTask();
  }, []);

  // Set up Firestore listener for route stops
  useEffect(() => {
    if (!userRouteNumber || !userBusStop) {
      return;
    }

    console.log(`Setting up listener for Route${userRouteNumber}`);
    
    const routeRef = collection(firestoreDb, `Route${userRouteNumber}`);
    const routeListener = onSnapshot(routeRef, (snapshot) => {
      try {
        console.log(`Received notification snapshot for Route${userRouteNumber} with ${snapshot.docs.length} documents`);
        
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
        const reachedStopsDebug = [];
        
        stops.forEach(stop => {
          // Log each stop's reached status for debugging
          console.log(`Notification check - Stop ${stop.name} reached status:`, stop.data.reached);
          
          if (stop.data.reached === true) {
            reachedStopsDebug.push(stop.name);
            updatedReachedStops[stop.name] = {
              serialNumber: stop.serialNumber,
              reachedTime: stop.data.reachedTime || new Date().toISOString()
            };
          }
        });
        
        // Log reached stops for debugging
        if (reachedStopsDebug.length > 0) {
          console.log(`Reached stops for notifications: ${reachedStopsDebug.join(', ')}`);
        } else {
          console.log('No reached stops found for notifications');
        }
        
        setReachedStops(updatedReachedStops);
        
        // Check if we need to send notifications
        if (userStop) {
          // Use async/await with error handling
          (async () => {
            try {
              await processReachedStopsBySerialNumber(updatedReachedStops, userStop.serialNumber, userStop.name);
            } catch (error) {
              console.error('Error processing notifications:', error);
            }
          })();
        }
      } catch (error) {
        console.error('Error processing notification snapshot:', error);
      }
    }, error => {
      console.error(`Error in notification listener for route ${userRouteNumber}:`, error);
      // Try to provide more details about the error
      console.error(`Error details: ${error.code} - ${error.message}`);
      
      // Attempt to recover by retrying after a delay
      setTimeout(() => {
        console.log('Attempting to recover notification listener...');
        // The component will re-render and set up a new listener
        setUserRouteNumber(prev => prev);
      }, 10000); // Wait 10 seconds before retrying
    });
    
    // Register with our listener manager - this is a critical listener as it's needed for notifications
    // Critical listeners will run even during inactive hours (11 PM - 6 AM)
    const unregisterRouteListener = registerListener(
      `notifications-route-${userRouteNumber}`,
      routeListener,
      'critical' // This must always run for notifications, even during inactive hours
    );
    
    return () => unregisterRouteListener();
  }, [userRouteNumber, userBusStop]);

  // Process reached stops by serialNumber and send notifications
  const processReachedStopsBySerialNumber = async (reachedStops, userStopSerialNumber, userStopName) => {
    if (!userStopSerialNumber || Object.keys(reachedStops).length === 0) return;
    
    console.log(`Processing reached stops for user stop with serialNumber ${userStopSerialNumber}`);
    
    try {
      // Find the stop with the highest serialNumber that has been reached
      let highestReachedSerialNumber = -1;
      let highestReachedStopName = '';
      let highestReachedTime = '';
      
      Object.entries(reachedStops).forEach(([stopName, data]) => {
        if (data.serialNumber > highestReachedSerialNumber) {
          highestReachedSerialNumber = data.serialNumber;
          highestReachedStopName = stopName;
          highestReachedTime = data.reachedTime;
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
      
      // Check if we should send a notification
      if (notificationType) {
        // Try to load previously notified stops from AsyncStorage for persistence
        try {
          const storedNotifiedStops = await AsyncStorage.getItem('notifiedBusStops');
          if (storedNotifiedStops) {
            const parsedStops = JSON.parse(storedNotifiedStops);
            // Merge with current state
            Object.keys(parsedStops).forEach(key => {
              if (!notifiedStops[key]) {
                setNotifiedStops(prev => ({ ...prev, [key]: parsedStops[key] }));
              }
            });
          }
        } catch (error) {
          console.error('Error loading notified stops from AsyncStorage:', error);
        }
        
        // Send notification if it's different from the last one
        if (!notifiedStops[notificationType]) {
          console.log(`Sending notification: ${notificationType}`);
          
          // Send notification
          await sendBusNotification(notificationTitle, notificationBody, notificationType);
          
          // Update notified stops in state
          const updatedNotifiedStops = { ...notifiedStops, [notificationType]: true };
          setNotifiedStops(updatedNotifiedStops);
          
          // Also store in AsyncStorage for persistence across app restarts
          try {
            await AsyncStorage.setItem('notifiedBusStops', JSON.stringify(updatedNotifiedStops));
          } catch (error) {
            console.error('Error saving notified stops to AsyncStorage:', error);
          }
          
          console.log(`Notification sent and recorded: ${notificationType}`);
        } else {
          console.log(`Skipping notification: ${notificationType} (already sent)`);
        }
      }
    } catch (error) {
      console.error('Error processing reached stops for notifications:', error);
    }
  };

  // Send bus notification
  const sendBusNotification = async (title, body, type) => {
    try {
      // Send notification with high priority settings for background delivery
      const notificationId = await sendLocalNotification(
        title, 
        body,
        {
          data: { 
            screen: 'home',
            type: type,
            timestamp: new Date().toISOString() // Add timestamp for uniqueness
          },
          // Use a small delay to ensure notification is processed properly
          trigger: { seconds: 1 },
          // Set priority options for better background delivery
          priority: 'high',
          ongoing: type === 'arrived', // Make "arrived" notifications persistent
          badge: 1
        }
      );
      
      console.log(`Bus notification sent with ID: ${notificationId} (Type: ${type})`);
      
      // Store notification in AsyncStorage for persistence
      try {
        const existingNotifs = await AsyncStorage.getItem('sentBusNotifications');
        const notifs = existingNotifs ? JSON.parse(existingNotifs) : [];
        notifs.push({
          id: notificationId,
          type,
          title,
          body,
          timestamp: new Date().toISOString()
        });
        // Keep only the last 10 notifications
        if (notifs.length > 10) notifs.shift();
        await AsyncStorage.setItem('sentBusNotifications', JSON.stringify(notifs));
      } catch (storageError) {
        console.error('Error storing notification in AsyncStorage:', storageError);
      }
      
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