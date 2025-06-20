import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef, useState } from 'react';
import { initializeNotifications, requestNotificationPermissions } from '../../utils/notificationHelper';
import { isSpeedMonitoringEnabled, monitorSpeed } from '../../utils/speedMonitor';
import { registerBackgroundTasks, BACKGROUND_SPEED_MONITOR_TASK } from '../../utils/backgroundTasks';
import * as BackgroundFetch from 'expo-background-fetch';
import { onValue, ref } from 'firebase/database';
import { realtimeDatabase } from '../../configs/FirebaseConfigs';

/**
 * Invisible component that monitors bus speed and sends notifications when speed exceeds threshold
 * @param {Object} props - Component props
 * @param {number} props.speed - Current speed of the bus
 * @param {number} props.threshold - Speed threshold to trigger notification (default: 65)
 */
const SpeedMonitor = ({ speed, threshold = 65 }) => {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [speedMonitoringEnabled, setSpeedMonitoringEnabled] = useState(true);
  const [backgroundTaskRegistered, setBackgroundTaskRegistered] = useState(false);
  const lastNotificationTime = useRef(0);
  const MIN_NOTIFICATION_INTERVAL = 60000; // 1 minute in milliseconds
  const speedListener = useRef(null);

  // Initialize notifications and check permissions
  useEffect(() => {
    const setupNotifications = async () => {
      try {
        // Request notification permissions
        const hasPermission = await requestNotificationPermissions();
        
        if (hasPermission) {
          // Initialize notifications system
          await initializeNotifications(false);
          setNotificationsEnabled(true);
          console.log('✅ Notifications initialized for speed monitoring');
          
          // Register background tasks for speed monitoring
          try {
            await registerBackgroundTasks();
            
            // Check if the speed monitoring task is registered
            const tasks = await BackgroundFetch.getRegisteredTasksAsync();
            const isRegistered = tasks.some(task => task.taskName === BACKGROUND_SPEED_MONITOR_TASK);
            
            if (isRegistered) {
              console.log('✅ Background speed monitoring task is registered');
              setBackgroundTaskRegistered(true);
            } else {
              console.warn('⚠️ Background speed monitoring task is not registered');
              
              // Try to register it specifically
              await BackgroundFetch.registerTaskAsync(BACKGROUND_SPEED_MONITOR_TASK, {
                minimumInterval: 30, // 30 seconds
                stopOnTerminate: false,
                startOnBoot: true,
              });
              
              console.log('✅ Background speed monitoring task registered manually');
              setBackgroundTaskRegistered(true);
            }
          } catch (error) {
            console.error('Error registering background tasks:', error);
          }
        } else {
          console.warn('⚠️ Notification permissions not granted for speed monitoring');
          setNotificationsEnabled(false);
        }
      } catch (error) {
        console.error('Error setting up notifications for speed monitoring:', error);
        setNotificationsEnabled(false);
      }
    };

    setupNotifications();
    
    // Cleanup function
    return () => {
      if (speedListener.current) {
        speedListener.current();
        speedListener.current = null;
      }
    };
  }, []);

  // Check user preferences for speed monitoring
  useEffect(() => {
    const checkUserPreferences = async () => {
      try {
        const userDataJson = await AsyncStorage.getItem('userData');
        if (userDataJson) {
          const userData = JSON.parse(userDataJson);
          const isEnabled = isSpeedMonitoringEnabled(userData);
          setSpeedMonitoringEnabled(isEnabled);
          console.log(`Speed monitoring ${isEnabled ? 'enabled' : 'disabled'} based on user preferences`);
        }
      } catch (error) {
        console.error('Error checking user preferences for speed monitoring:', error);
      }
    };

    checkUserPreferences();
  }, []);
  
  // Set up direct listener to real-time database for speed monitoring
  useEffect(() => {
    if (!notificationsEnabled || !speedMonitoringEnabled) {
      console.log('Skipping direct speed listener setup - notifications or speed monitoring disabled');
      return;
    }
    
    console.log('Setting up direct listener to real-time database for speed monitoring');
    
    // Reference to the speed in the real-time database
    const speedRef = ref(realtimeDatabase, '/bus/Location/Speed');
    
    // Set up the listener
    speedListener.current = onValue(speedRef, async (snapshot) => {
      const currentSpeed = snapshot.val();
      console.log(`Direct speed update from database: ${currentSpeed}`);
      
      if (currentSpeed !== null && currentSpeed !== undefined) {
        // Check if we should throttle notifications
        const now = Date.now();
        if (now - lastNotificationTime.current < MIN_NOTIFICATION_INTERVAL) {
          console.log('Skipping speed notification due to throttling');
          return;
        }
        
        // Check if speed exceeds threshold
        const speedValue = parseFloat(currentSpeed);
        if (!isNaN(speedValue) && speedValue > threshold) {
          console.log(`⚠️ High speed detected directly from database: ${speedValue}`);
          
          // Send notification
          const notificationSent = await monitorSpeed(speedValue, threshold, notificationsEnabled);
          
          // Update last notification time if notification was sent
          if (notificationSent) {
            lastNotificationTime.current = now;
            await AsyncStorage.setItem('lastSpeedNotificationTime', now.toString());
          }
        }
      }
    }, (error) => {
      console.error('Error in direct speed listener:', error);
    });
    
    // Cleanup function
    return () => {
      if (speedListener.current) {
        speedListener.current();
        speedListener.current = null;
        console.log('Direct speed listener removed');
      }
    };
  }, [notificationsEnabled, speedMonitoringEnabled, threshold]);

  // Monitor speed and send notifications when threshold is exceeded
  useEffect(() => {
    const checkSpeed = async () => {
      // Skip if notifications or speed monitoring are disabled
      if (!notificationsEnabled || !speedMonitoringEnabled) {
        return;
      }

      // Skip if speed is not available
      if (speed === null || speed === undefined) {
        return;
      }

      // Check if we should throttle notifications (not send too frequently)
      const now = Date.now();
      if (now - lastNotificationTime.current < MIN_NOTIFICATION_INTERVAL) {
        console.log('Skipping speed notification due to throttling');
        return;
      }

      // Monitor speed and send notification if needed
      const notificationSent = await monitorSpeed(speed, threshold, notificationsEnabled);
      
      // Update last notification time if notification was sent
      if (notificationSent) {
        lastNotificationTime.current = now;
      }
    };

    checkSpeed();
  }, [speed, threshold, notificationsEnabled, speedMonitoringEnabled]);

  // This component doesn't render anything visible
  return null;
};

export default SpeedMonitor;