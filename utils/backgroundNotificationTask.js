import AsyncStorage from '@react-native-async-storage/async-storage';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { collection, getDocs } from 'firebase/firestore';
import { firestoreDb } from '../configs/FirebaseConfigs';
import { sendLocalNotification } from './notificationHelper';

// Define the task name
const BUS_NOTIFICATION_TASK = 'BUS_NOTIFICATION_BACKGROUND_TASK';

// Define the task handler
TaskManager.defineTask(BUS_NOTIFICATION_TASK, async () => {
  try {
    console.log('Running background notification task');
    
    // Load user data
    const userData = await AsyncStorage.getItem('userData');
    if (!userData) {
      console.log('No user data found, skipping background notification task');
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }
    
    const { routeNumber, busStop } = JSON.parse(userData);
    if (!routeNumber || !busStop) {
      console.log('Missing route number or bus stop, skipping background notification task');
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }
    
    // Load notified stops
    const notifiedStopsJson = await AsyncStorage.getItem('notifiedBusStops');
    const notifiedStops = notifiedStopsJson ? JSON.parse(notifiedStopsJson) : {};
    
    // Fetch route stops from Firestore with retry logic
    let snapshot;
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        console.log(`Fetching route stops for Route${routeNumber} (attempt ${retryCount + 1})`);
        const routeRef = collection(firestoreDb, `Route${routeNumber}`);
        snapshot = await getDocs(routeRef);
        
        console.log(`Successfully fetched ${snapshot.docs.length} stops for Route${routeNumber}`);
        break; // Success, exit the retry loop
      } catch (fetchError) {
        retryCount++;
        console.error(`Error fetching route stops (attempt ${retryCount}):`, fetchError);
        
        if (retryCount >= maxRetries) {
          console.error('Max retries reached, giving up');
          return BackgroundFetch.BackgroundFetchResult.Failed;
        }
        
        // Wait before retrying (exponential backoff)
        const delayMs = 1000 * Math.pow(2, retryCount);
        console.log(`Retrying in ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
    
    if (!snapshot || snapshot.empty) {
      console.log(`No stops found for route ${routeNumber}`);
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }
    
    // Process stops
    const stops = snapshot.docs.map(doc => ({
      name: doc.id,
      data: doc.data(),
      serialNumber: doc.data().serialNumber || doc.data().order || 0
    }));
    
    // Sort stops by serialNumber
    const sortedStops = stops.sort((a, b) => a.serialNumber - b.serialNumber);
    
    // Find user's stop
    const userStop = sortedStops.find(stop => stop.name === busStop);
    if (!userStop) {
      console.log(`User stop ${busStop} not found in route stops`);
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }
    
    // Process reached stops
    const reachedStops = {};
    const reachedStopsDebug = [];
    
    stops.forEach(stop => {
      // Log each stop's reached status for debugging
      console.log(`Background task - Stop ${stop.name} reached status:`, 
        typeof stop.data.reached === 'boolean' ? stop.data.reached : 'not a boolean');
      
      // Make sure we're checking for exactly boolean true
      if (stop.data.reached === true) {
        reachedStopsDebug.push(stop.name);
        reachedStops[stop.name] = {
          serialNumber: stop.serialNumber,
          reachedTime: stop.data.reachedTime || new Date().toISOString()
        };
      }
    });
    
    // Log reached stops for debugging
    if (reachedStopsDebug.length > 0) {
      console.log(`Background task - Reached stops: ${reachedStopsDebug.join(', ')}`);
    } else {
      console.log('Background task - No reached stops found');
    }
    
    if (Object.keys(reachedStops).length === 0) {
      console.log('No reached stops found');
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }
    
    // Find the highest reached stop
    let highestReachedSerialNumber = -1;
    let highestReachedStopName = '';
    
    Object.entries(reachedStops).forEach(([stopName, data]) => {
      if (data.serialNumber > highestReachedSerialNumber) {
        highestReachedSerialNumber = data.serialNumber;
        highestReachedStopName = stopName;
      }
    });
    
    if (highestReachedSerialNumber === -1) {
      console.log('No highest reached stop found');
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }
    
    // Calculate the difference between user stop and current reached stop
    const stopDifference = userStop.serialNumber - highestReachedSerialNumber;
    
    // Determine notification type
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
      notificationBody = `Your bus has arrived at ${busStop}. Don't miss it!`;
    } else if (stopDifference === -1) {
      notificationType = 'passed_1';
      notificationTitle = 'Bus Passed Your Stop';
      notificationBody = `The bus has passed your stop and is now at ${highestReachedStopName}.`;
    } else if (stopDifference === -2) {
      notificationType = 'passed_2';
      notificationTitle = 'Bus Passed Your Stop';
      notificationBody = `The bus is now 2 stops past your stop at ${highestReachedStopName}.`;
    }
    
    // Send notification if needed
    if (notificationType && !notifiedStops[notificationType]) {
      console.log(`Sending background notification: ${notificationType}`);
      
      // Send notification
      const notificationId = await sendLocalNotification(
        notificationTitle,
        notificationBody,
        {
          data: {
            screen: 'home',
            type: notificationType,
            timestamp: new Date().toISOString()
          },
          trigger: null, // Use null for immediate delivery
          priority: 'high',
          ongoing: notificationType === 'arrived',
          badge: 1
        }
      );
      
      // Update notified stops
      notifiedStops[notificationType] = true;
      await AsyncStorage.setItem('notifiedBusStops', JSON.stringify(notifiedStops));
      
      console.log(`Background notification sent with ID: ${notificationId}`);
      return BackgroundFetch.BackgroundFetchResult.NewData;
    }
    
    console.log('No new notifications to send');
    return BackgroundFetch.BackgroundFetchResult.NoData;
  } catch (error) {
    console.error('Error in background notification task:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// Register the background task with improved error handling
export const registerBusNotificationTask = async () => {
  try {
    // Check if task is already registered to avoid duplicate registration errors
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BUS_NOTIFICATION_TASK)
      .catch(err => {
        console.log('Error checking task registration:', err);
        return false;
      });
    
    if (isRegistered) {
      console.log('Background notification task already registered');
      return true;
    }
    
    // Register the task with safer options
    await BackgroundFetch.registerTaskAsync(BUS_NOTIFICATION_TASK, {
      minimumInterval: 5 * 60, // 5 minutes
      stopOnTerminate: false,  // This might cause issues on some devices
      startOnBoot: true,       // This might cause issues on some devices
    });
    
    console.log('Registered background notification task successfully');
    return true;
  } catch (error) {
    console.error('Failed to register background notification task:', error);
    
    // Try with more conservative options if the first attempt fails
    try {
      console.log('Trying with conservative background task options...');
      await BackgroundFetch.registerTaskAsync(BUS_NOTIFICATION_TASK, {
        minimumInterval: 15 * 60, // 15 minutes (more battery friendly)
        stopOnTerminate: true,    // Less likely to cause issues
        startOnBoot: false,       // Less likely to cause issues
      });
      console.log('Registered background task with conservative options');
      return true;
    } catch (fallbackError) {
      console.error('Failed to register even with conservative options:', fallbackError);
      return false;
    }
  }
};

// Unregister the background task
export const unregisterBusNotificationTask = async () => {
  try {
    await BackgroundFetch.unregisterTaskAsync(BUS_NOTIFICATION_TASK);
    console.log('Unregistered background notification task');
    return true;
  } catch (error) {
    console.error('Failed to unregister background notification task:', error);
    return false;
  }
};

// Check if the task is registered
export const isTaskRegistered = async () => {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BUS_NOTIFICATION_TASK);
    console.log(`Bus notification task registered: ${isRegistered}`);
    return isRegistered;
  } catch (error) {
    console.error('Error checking if task is registered:', error);
    return false;
  }
};