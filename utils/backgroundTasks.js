import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import { onValue, ref } from 'firebase/database';
import { realtimeDatabase } from '../configs/FirebaseConfigs';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Define task names
export const BACKGROUND_NOTIFICATION_TASK = 'BACKGROUND_NOTIFICATION_TASK';
export const BACKGROUND_BUS_LOCATION_TASK = 'BACKGROUND_BUS_LOCATION_TASK';
export const BACKGROUND_ADMIN_ALERTS_TASK = 'BACKGROUND_ADMIN_ALERTS_TASK';

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
    const locationRef = ref(realtimeDatabase, 'adddelete/Location');
    
    return new Promise((resolve) => {
      onValue(
        locationRef, 
        (snapshot) => {
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
    });
  } catch (error) {
    console.error('Background bus location task error:', error);
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
      onValue(
        alertsRef, 
        async (snapshot) => {
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
    });
  } catch (error) {
    console.error('Background admin alerts task error:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// Register background tasks
export const registerBackgroundTasks = async () => {
  try {
    // Register background fetch for bus location updates
    await BackgroundFetch.registerTaskAsync(BACKGROUND_BUS_LOCATION_TASK, {
      minimumInterval: 15 * 60, // 15 minutes
      stopOnTerminate: false,
      startOnBoot: true,
    });
    
    // Register background fetch for admin alerts
    await BackgroundFetch.registerTaskAsync(BACKGROUND_ADMIN_ALERTS_TASK, {
      minimumInterval: 15 * 60, // 15 minutes
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
    await BackgroundFetch.unregisterTaskAsync(BACKGROUND_BUS_LOCATION_TASK);
    await BackgroundFetch.unregisterTaskAsync(BACKGROUND_ADMIN_ALERTS_TASK);
    console.log('Background tasks unregistered');
    return true;
  } catch (error) {
    console.error('Error unregistering background tasks:', error);
    return false;
  }
};