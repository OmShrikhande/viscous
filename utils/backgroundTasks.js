import AsyncStorage from '@react-native-async-storage/async-storage';
import * as BackgroundFetch from 'expo-background-fetch';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { get, onValue, ref } from 'firebase/database';
import { Platform } from 'react-native';
import { realtimeDatabase } from '../configs/FirebaseConfigs';

// Define task names
export const BACKGROUND_NOTIFICATION_TASK = 'BACKGROUND_NOTIFICATION_TASK';
export const BACKGROUND_BUS_LOCATION_TASK = 'BACKGROUND_BUS_LOCATION_TASK';
export const BACKGROUND_ADMIN_ALERTS_TASK = 'BACKGROUND_ADMIN_ALERTS_TASK';
export const BACKGROUND_SPEED_MONITOR_TASK = 'BACKGROUND_SPEED_MONITOR_TASK';

// Register background notification handler
TaskManager.defineTask(BACKGROUND_NOTIFICATION_TASK, ({ data, error }) => {
  if (error) {
    console.error('Background notification task error:', error);
    return;
  }
  
  if (data) {
    // Process the notification data
    console.log('Received background notification:', data);
    
    // You can perform additional actions here based on the notification data
    // For example, update local storage, trigger other background tasks, etc.
  }
});

// Register background bus location tracking task
TaskManager.defineTask(BACKGROUND_BUS_LOCATION_TASK, async () => {
  try {
    // Check if notifications are enabled
    const notificationsEnabled = await AsyncStorage.getItem('busStopNotificationsEnabled');
    if (notificationsEnabled !== 'true') {
      console.log('Bus location tracking skipped - notifications disabled');
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }
    
    // Get user data
    const userData = await AsyncStorage.getItem('userData');
    if (!userData) {
      console.log('Bus location tracking skipped - no user data');
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }
    
    const { routeNumber, busStop } = JSON.parse(userData);
    if (!routeNumber || !busStop) {
      console.log('Bus location tracking skipped - no route or bus stop set');
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }
    
    // Get current bus location
    const locationRef = ref(realtimeDatabase, 'Location');
    
    return new Promise((resolve) => {
      // Use get() instead of onValue to prevent memory leaks
      const unsubscribe = onValue(
        locationRef, 
        (snapshot) => {
          // Immediately unsubscribe after getting the value
          unsubscribe();
          
          const locationData = snapshot.val();
          if (locationData) {
            console.log('Background task: Got bus location update');
            
            // Process bus location (simplified version)
            // In a real implementation, you would check if the bus is near the user's stop
            // and send a notification if needed
            
            // For now, we'll just log the data
            console.log('Bus location:', locationData);
            
            resolve(BackgroundFetch.BackgroundFetchResult.NewData);
          } else {
            resolve(BackgroundFetch.BackgroundFetchResult.NoData);
          }
        },
        (error) => {
          console.error('Error getting bus location in background:', error);
          resolve(BackgroundFetch.BackgroundFetchResult.Failed);
        },
        { onlyOnce: true } // Important: only get the value once in the background task
      );
      
      // Set a timeout to ensure we don't leak memory if Firebase never responds
      setTimeout(() => {
        unsubscribe();
        resolve(BackgroundFetch.BackgroundFetchResult.Failed);
      }, 10000); // 10 second timeout
    });
  } catch (error) {
    console.error('Background bus location task error:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// Register background speed monitoring task
TaskManager.defineTask(BACKGROUND_SPEED_MONITOR_TASK, async () => {
  try {
    console.log('🔄 Background speed monitoring task running');
    
    // Check if speed monitoring is enabled
    const userDataJson = await AsyncStorage.getItem('userData');
    if (userDataJson) {
      const userData = JSON.parse(userDataJson);
      if (userData.speedMonitoring === false) {
        console.log('Speed monitoring is disabled in user preferences');
        return BackgroundFetch.BackgroundFetchResult.NoData;
      }
    }
    
    // Get the current speed directly from the database
    const speedRef = ref(realtimeDatabase, '/bus/Location/Speed');
    const snapshot = await get(speedRef);
    const speed = snapshot.val();
    
    console.log(`Current speed from background task: ${speed}`);
    
    // Check if speed exceeds threshold
    const SPEED_THRESHOLD = 65;
    if (speed && parseFloat(speed) > SPEED_THRESHOLD) {
      // Get the last notification time to avoid spamming
      const lastNotificationTimeStr = await AsyncStorage.getItem('lastSpeedNotificationTime');
      const lastNotificationTime = lastNotificationTimeStr ? parseInt(lastNotificationTimeStr) : 0;
      const now = Date.now();
      
      // Only send notification if it's been at least 1 minute since the last one
      if (now - lastNotificationTime > 60000) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Bus Speed Alert',
            body: `The bus is traveling at ${parseFloat(speed).toFixed(1)} km/h, which exceeds the safe limit of ${SPEED_THRESHOLD} km/h.`,
            data: { screen: 'map', speedAlert: true },
            // Android specific properties
            ...(Platform.OS === 'android' && { 
              channelId: 'bus-tracker',
              priority: 'max',
              vibrationPattern: [0, 250, 250, 250],
              color: '#FF0000',
            }),
          },
          trigger: null, // Send immediately
        });
        
        // Update the last notification time
        await AsyncStorage.setItem('lastSpeedNotificationTime', now.toString());
        console.log('✅ Speed alert notification sent from background task');
        
        return BackgroundFetch.BackgroundFetchResult.NewData;
      }
    }
    
    return BackgroundFetch.BackgroundFetchResult.NoData;
  } catch (error) {
    console.error('Error in background speed monitoring task:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// Register background admin alerts task
TaskManager.defineTask(BACKGROUND_ADMIN_ALERTS_TASK, async () => {
  try {
    // Check if the user has enabled alerts
    const alertsEnabled = await AsyncStorage.getItem('adminAlertsEnabled');
    if (alertsEnabled !== 'true') {
      console.log('Admin alerts tracking skipped - alerts disabled');
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }
    
    // Get admin alerts from Firebase
    const alertsRef = ref(realtimeDatabase, 'adminAlerts');
    
    return new Promise((resolve) => {
      const unsubscribe = onValue(
        alertsRef, 
        async (snapshot) => {
          // Immediately unsubscribe after getting the value
          unsubscribe();
          
          const alertsData = snapshot.val();
          if (alertsData) {
            console.log('Background task: Got admin alerts update');
            
            // Get the last processed alert timestamp
            const lastAlertTimestamp = await AsyncStorage.getItem('lastAlertTimestamp') || '0';
            
            // Process new alerts
            let hasNewAlerts = false;
            
            for (const alertId in alertsData) {
              const alert = alertsData[alertId];
              
              // Check if this is a new alert
              if (alert.timestamp > parseInt(lastAlertTimestamp)) {
                hasNewAlerts = true;
                
                // Send a notification for the new alert
                await Notifications.scheduleNotificationAsync({
                  content: {
                    title: alert.title || 'New Alert',
                    body: alert.message || 'You have a new alert from the bus service.',
                    data: { alertId, type: 'adminAlert', ...alert },
                  },
                  trigger: null, // Send immediately
                });
                
                // Update the last processed timestamp if this alert is newer
                if (alert.timestamp > parseInt(lastAlertTimestamp)) {
                  await AsyncStorage.setItem('lastAlertTimestamp', alert.timestamp.toString());
                }
              }
            }
            
            resolve(hasNewAlerts 
              ? BackgroundFetch.BackgroundFetchResult.NewData 
              : BackgroundFetch.BackgroundFetchResult.NoData
            );
          } else {
            resolve(BackgroundFetch.BackgroundFetchResult.NoData);
          }
        },
        (error) => {
          console.error('Error getting admin alerts in background:', error);
          resolve(BackgroundFetch.BackgroundFetchResult.Failed);
        },
        { onlyOnce: true } // Important: only get the value once in the background task
      );
      
      // Set a timeout to ensure we don't leak memory if Firebase never responds
      setTimeout(() => {
        unsubscribe();
        resolve(BackgroundFetch.BackgroundFetchResult.Failed);
      }, 10000); // 10 second timeout
    });
  } catch (error) {
    console.error('Background admin alerts task error:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// Register background tasks
export const registerBackgroundTasks = async () => {
  try {
    console.log('Attempting to register background tasks...');
    
    // Check if we're on a physical device
    // Background tasks have limitations in simulators/emulators
    if (Platform.OS === 'web') {
      console.log('Background tasks not supported on web');
      return false;
    }
    
    // First, check if tasks are already defined
    const isTaskDefined = (taskName) => {
      try {
        return TaskManager.isTaskDefined(taskName);
      } catch (err) {
        console.log(`Error checking if task ${taskName} is defined:`, err);
        return false;
      }
    };
    
    // Define tasks if not already defined
    if (!isTaskDefined(BACKGROUND_BUS_LOCATION_TASK)) {
      console.log(`Defining task: ${BACKGROUND_BUS_LOCATION_TASK}`);
      TaskManager.defineTask(BACKGROUND_BUS_LOCATION_TASK, async () => {
        try {
          // Check if notifications are enabled
          const notificationsEnabled = await AsyncStorage.getItem('busStopNotificationsEnabled');
          if (notificationsEnabled !== 'true') {
            console.log('Bus location tracking skipped - notifications disabled');
            return BackgroundFetch.BackgroundFetchResult.NoData;
          }
          
          // Get user data
          const userData = await AsyncStorage.getItem('userData');
          if (!userData) {
            console.log('Bus location tracking skipped - no user data');
            return BackgroundFetch.BackgroundFetchResult.NoData;
          }
          
          const { routeNumber, busStop } = JSON.parse(userData);
          if (!routeNumber || !busStop) {
            console.log('Bus location tracking skipped - no route or bus stop set');
            return BackgroundFetch.BackgroundFetchResult.NoData;
          }
          
          // Get current bus location
          const locationRef = ref(realtimeDatabase, 'Location');
          
          try {
            // Use get() instead of onValue to avoid memory leaks
            const snapshot = await get(locationRef);
            const locationData = snapshot.val();
            
            if (locationData) {
              console.log('Background task: Got bus location update');
              console.log('Bus location:', locationData);
              return BackgroundFetch.BackgroundFetchResult.NewData;
            } else {
              return BackgroundFetch.BackgroundFetchResult.NoData;
            }
          } catch (error) {
            console.error('Error getting bus location in background:', error);
            return BackgroundFetch.BackgroundFetchResult.Failed;
          }
        } catch (error) {
          console.error('Background bus location task error:', error);
          return BackgroundFetch.BackgroundFetchResult.Failed;
        }
      });
    }
    
    if (!isTaskDefined(BACKGROUND_ADMIN_ALERTS_TASK)) {
      console.log(`Defining task: ${BACKGROUND_ADMIN_ALERTS_TASK}`);
      TaskManager.defineTask(BACKGROUND_ADMIN_ALERTS_TASK, async () => {
        try {
          // Check if the user has enabled alerts
          const alertsEnabled = await AsyncStorage.getItem('adminAlertsEnabled');
          if (alertsEnabled !== 'true') {
            console.log('Admin alerts tracking skipped - alerts disabled');
            return BackgroundFetch.BackgroundFetchResult.NoData;
          }
          
          // Get admin alerts from Firebase
          const alertsRef = ref(realtimeDatabase, 'adminAlerts');
          
          try {
            // Use get() instead of onValue to avoid memory leaks
            const snapshot = await get(alertsRef);
            const alertsData = snapshot.val();
            
            if (alertsData) {
              console.log('Background task: Got admin alerts update');
              
              // Get the last processed alert timestamp
              const lastAlertTimestamp = await AsyncStorage.getItem('lastAlertTimestamp') || '0';
              
              // Process new alerts
              let hasNewAlerts = false;
              
              for (const alertId in alertsData) {
                const alert = alertsData[alertId];
                
                // Check if this is a new alert
                if (alert.timestamp > parseInt(lastAlertTimestamp)) {
                  hasNewAlerts = true;
                  
                  // Send a notification for the new alert
                  await Notifications.scheduleNotificationAsync({
                    content: {
                      title: alert.title || 'New Alert',
                      body: alert.message || 'You have a new alert from the bus service.',
                      data: { alertId, type: 'adminAlert', ...alert },
                    },
                    trigger: null, // Send immediately
                  });
                  
                  // Update the last processed timestamp if this alert is newer
                  if (alert.timestamp > parseInt(lastAlertTimestamp)) {
                    await AsyncStorage.setItem('lastAlertTimestamp', alert.timestamp.toString());
                  }
                }
              }
              
              return hasNewAlerts 
                ? BackgroundFetch.BackgroundFetchResult.NewData 
                : BackgroundFetch.BackgroundFetchResult.NoData;
            } else {
              return BackgroundFetch.BackgroundFetchResult.NoData;
            }
          } catch (error) {
            console.error('Error getting admin alerts in background:', error);
            return BackgroundFetch.BackgroundFetchResult.Failed;
          }
        } catch (error) {
          console.error('Background admin alerts task error:', error);
          return BackgroundFetch.BackgroundFetchResult.Failed;
        }
      });
    }
    
    // Now register the tasks with BackgroundFetch
    console.log('Registering background fetch for bus location updates...');
    await BackgroundFetch.registerTaskAsync(BACKGROUND_BUS_LOCATION_TASK, {
      minimumInterval: 15 * 60, // 15 minutes
      stopOnTerminate: false,
      startOnBoot: true,
    });
    
    console.log('Registering background fetch for admin alerts...');
    await BackgroundFetch.registerTaskAsync(BACKGROUND_ADMIN_ALERTS_TASK, {
      minimumInterval: 15 * 60, // 15 minutes
      stopOnTerminate: false,
      startOnBoot: true,
    });
    
    console.log('Registering background fetch for speed monitoring...');
    await BackgroundFetch.registerTaskAsync(BACKGROUND_SPEED_MONITOR_TASK, {
      minimumInterval: 30, // 30 seconds for speed monitoring (more frequent)
      stopOnTerminate: false,
      startOnBoot: true,
    });
    
    console.log('Background tasks registered successfully');
    return true;
  } catch (error) {
    console.error('Error registering background tasks:', error);
    return false;
  }
};

// Check status of background tasks
export const checkBackgroundTaskStatus = async () => {
  try {
    const busLocationStatus = await BackgroundFetch.getStatusAsync(BACKGROUND_BUS_LOCATION_TASK)
      .catch(() => BackgroundFetch.BackgroundFetchStatus.Denied);
      
    const adminAlertsStatus = await BackgroundFetch.getStatusAsync(BACKGROUND_ADMIN_ALERTS_TASK)
      .catch(() => BackgroundFetch.BackgroundFetchStatus.Denied);
    
    return {
      busLocationStatus: getStatusString(busLocationStatus),
      adminAlertsStatus: getStatusString(adminAlertsStatus),
    };
  } catch (error) {
    console.error('Error checking background task status:', error);
    return {
      busLocationStatus: 'Error',
      adminAlertsStatus: 'Error',
    };
  }
};

// Helper to convert status code to string
const getStatusString = (status) => {
  switch (status) {
    case BackgroundFetch.BackgroundFetchStatus.Available:
      return 'Available';
    case BackgroundFetch.BackgroundFetchStatus.Denied:
      return 'Denied';
    case BackgroundFetch.BackgroundFetchStatus.Restricted:
      return 'Restricted';
    default:
      return 'Unknown';
  }
};

// Unregister background tasks
export const unregisterBackgroundTasks = async () => {
  try {
    console.log('Unregistering background tasks...');
    
    // Check if tasks are registered before attempting to unregister
    const isTaskRegistered = async (taskName) => {
      try {
        const status = await BackgroundFetch.getStatusAsync(taskName);
        return status !== BackgroundFetch.BackgroundFetchStatus.Denied;
      } catch (err) {
        console.log(`Task ${taskName} not registered or error:`, err);
        return false;
      }
    };
    
    // Unregister bus location task if registered
    if (await isTaskRegistered(BACKGROUND_BUS_LOCATION_TASK)) {
      console.log(`Unregistering task: ${BACKGROUND_BUS_LOCATION_TASK}`);
      await BackgroundFetch.unregisterTaskAsync(BACKGROUND_BUS_LOCATION_TASK);
    }
    
    // Unregister admin alerts task if registered
    if (await isTaskRegistered(BACKGROUND_ADMIN_ALERTS_TASK)) {
      console.log(`Unregistering task: ${BACKGROUND_ADMIN_ALERTS_TASK}`);
      await BackgroundFetch.unregisterTaskAsync(BACKGROUND_ADMIN_ALERTS_TASK);
    }
    
    console.log('Background tasks unregistered successfully');
    return true;
  } catch (error) {
    console.error('Error unregistering background tasks:', error);
    return false;
  }
};