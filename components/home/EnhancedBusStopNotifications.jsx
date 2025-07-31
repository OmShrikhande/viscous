/**
 * Enhanced Bus Stop Notifications with Bidirectional Support
 * 
 * Features:
 * - Direction-independent notifications
 * - Real-time Firestore listeners
 * - Optimized notification delivery
 * - Smart duplicate prevention
 * - Enhanced error handling
 */

import { useUser } from '@clerk/clerk-expo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { useEffect, useState, useCallback, useRef } from 'react';
import { Alert, AppState } from 'react-native';
import { firestoreDb } from '../../configs/FirebaseConfigs';
import { sendLocalNotification } from '../../utils/notificationHelper';

const EnhancedBusStopNotifications = () => {
  const { user } = useUser();
  const [userBusStop, setUserBusStop] = useState('');
  const [userRouteNumber, setUserRouteNumber] = useState('');
  const [notificationHistory, setNotificationHistory] = useState(new Map());
  const [isListenerActive, setIsListenerActive] = useState(false);
  const [appState, setAppState] = useState(AppState.currentState);
  
  // Refs for cleanup
  const stopsListenerRef = useRef(null);
  const notificationTimeoutRef = useRef(null);
  
  // Configuration
  const NOTIFICATION_COOLDOWN = 30000; // 30 seconds between same-stop notifications
  const MAX_NOTIFICATIONS_PER_HOUR = 10;
  
  /**
   * Load user preferences
   */
  const loadUserPreferences = useCallback(async () => {
    try {
      const [busStop, routeNumber] = await Promise.all([
        AsyncStorage.getItem('userBusStop'),
        AsyncStorage.getItem('userRouteNumber')
      ]);
      
      if (busStop) {
        setUserBusStop(busStop);
        console.log('👤 User bus stop loaded:', busStop);
      }
      
      if (routeNumber) {
        setUserRouteNumber(routeNumber);
        console.log('🚌 User route number loaded:', routeNumber);
      }
      
      return { busStop, routeNumber };
    } catch (error) {
      console.error('❌ Error loading user preferences:', error);
      return { busStop: null, routeNumber: null };
    }
  }, []);
  
  /**
   * Load notification history from storage
   */
  const loadNotificationHistory = useCallback(async () => {
    try {
      const historyJson = await AsyncStorage.getItem('enhancedNotificationHistory');
      if (historyJson) {
        const historyArray = JSON.parse(historyJson);
        const historyMap = new Map(historyArray);
        
        // Clean old entries (older than 1 hour)
        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        for (const [key, timestamp] of historyMap) {
          if (timestamp < oneHourAgo) {
            historyMap.delete(key);
          }
        }
        
        setNotificationHistory(historyMap);
        console.log(`📱 Loaded ${historyMap.size} recent notifications from history`);
      }
    } catch (error) {
      console.error('❌ Error loading notification history:', error);
    }
  }, []);
  
  /**
   * Save notification history to storage
   */
  const saveNotificationHistory = useCallback(async (history) => {
    try {
      const historyArray = Array.from(history.entries());
      await AsyncStorage.setItem('enhancedNotificationHistory', JSON.stringify(historyArray));
    } catch (error) {
      console.error('❌ Error saving notification history:', error);
    }
  }, []);
  
  /**
   * Check if notification should be sent
   */
  const shouldSendNotification = useCallback((stopId, notificationType) => {
    const now = Date.now();
    const notificationKey = `${stopId}-${notificationType}`;
    
    // Check cooldown period
    const lastNotification = notificationHistory.get(notificationKey);
    if (lastNotification && (now - lastNotification) < NOTIFICATION_COOLDOWN) {
      console.log(`⏳ Notification cooldown active for ${notificationKey}`);
      return false;
    }
    
    // Check hourly limit
    const oneHourAgo = now - (60 * 60 * 1000);
    const recentNotifications = Array.from(notificationHistory.values())
      .filter(timestamp => timestamp > oneHourAgo);
    
    if (recentNotifications.length >= MAX_NOTIFICATIONS_PER_HOUR) {
      console.log('⚠️ Hourly notification limit reached');
      return false;
    }
    
    return true;
  }, [notificationHistory]);
  
  /**
   * Send enhanced notification
   */
  const sendEnhancedNotification = useCallback(async (title, body, stopId, notificationType) => {
    try {
      if (!shouldSendNotification(stopId, notificationType)) {
        return false;
      }
      
      console.log(`🔔 Sending enhanced notification: ${notificationType} for ${stopId}`);
      
      // Check notification permissions
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        console.warn('⚠️ Notification permissions not granted');
        // Show alert as fallback
        Alert.alert(title, body);
        return false;
      }
      
      // Send notification with enhanced options
      const notificationId = await sendLocalNotification(title, body, {
        data: {
          stopId,
          notificationType,
          timestamp: new Date().toISOString(),
          userBusStop,
          screen: 'home'
        },
        trigger: { seconds: 1 },
        priority: 'high',
        badge: 1,
        ongoing: notificationType === 'arrived',
        categoryIdentifier: 'bus-stop-updates'
      });
      
      if (notificationId) {
        // Update notification history
        const now = Date.now();
        const notificationKey = `${stopId}-${notificationType}`;
        const updatedHistory = new Map(notificationHistory);
        updatedHistory.set(notificationKey, now);
        
        setNotificationHistory(updatedHistory);
        await saveNotificationHistory(updatedHistory);
        
        console.log(`✅ Enhanced notification sent: ${notificationId}`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ Error sending enhanced notification:', error);
      
      // Fallback to alert for critical notifications
      if (notificationType === 'arrived' || notificationType === 'approaching') {
        Alert.alert(title, body);
      }
      
      return false;
    }
  }, [shouldSendNotification, userBusStop, notificationHistory, saveNotificationHistory]);
  
  /**
   * Process stop reached event
   */
  const processStopReached = useCallback(async (stopData) => {
    const { id: stopId, reached, reachedTime, lastReachedTimestamp } = stopData;
    
    // Only process newly reached stops
    if (!reached || !lastReachedTimestamp) {
      return;
    }
    
    console.log(`🎯 Processing reached stop: ${stopId}`);
    
    // Check if this is the user's stop
    const isUserStop = stopId === userBusStop;
    
    // Determine notification type and content
    let title, body, notificationType;
    
    if (isUserStop) {
      title = '🚌 Bus Arrived!';
      body = `The bus has reached your stop: ${stopId}`;
      notificationType = 'arrived';
    } else {
      title = '📍 Stop Reached';
      body = `Bus reached: ${stopId} at ${reachedTime}`;
      notificationType = 'stop_reached';
    }
    
    // Send notification
    await sendEnhancedNotification(title, body, stopId, notificationType);
    
    // If it's user's stop, also send a follow-up reminder
    if (isUserStop) {
      setTimeout(async () => {
        await sendEnhancedNotification(
          '⏰ Bus Waiting',
          'Your bus is at your stop. Please board now!',
          stopId,
          'boarding_reminder'
        );
      }, 10000); // 10 seconds delay
    }
  }, [userBusStop, sendEnhancedNotification]);
  
  /**
   * Start real-time stops listener
   */
  const startStopsListener = useCallback(async () => {
    if (isListenerActive || !userRouteNumber) {
      return;
    }
    
    try {
      console.log('🔄 Starting enhanced stops listener...');
      
      // Create query for Route2 collection
      const route2Ref = collection(firestoreDb, 'Route2');
      const q = query(route2Ref);
      
      // Set up real-time listener
      const unsubscribe = onSnapshot(q,
        (snapshot) => {
          console.log('📍 Enhanced stops update received');
          
          snapshot.docChanges().forEach((change) => {
            if (change.type === 'modified') {
              const stopData = {
                id: change.doc.id,
                ...change.doc.data()
              };
              
              // Process if stop was newly reached
              if (stopData.reached && stopData.lastReachedTimestamp) {
                processStopReached(stopData);
              }
            }
          });
        },
        (error) => {
          console.error('❌ Error in enhanced stops listener:', error);
          setIsListenerActive(false);
          
          // Retry after delay
          setTimeout(() => {
            if (appState === 'active') {
              startStopsListener();
            }
          }, 5000);
        }
      );
      
      stopsListenerRef.current = unsubscribe;
      setIsListenerActive(true);
      console.log('✅ Enhanced stops listener started');
      
    } catch (error) {
      console.error('❌ Error starting enhanced stops listener:', error);
      setIsListenerActive(false);
    }
  }, [isListenerActive, userRouteNumber, processStopReached, appState]);
  
  /**
   * Stop stops listener
   */
  const stopStopsListener = useCallback(() => {
    if (stopsListenerRef.current) {
      console.log('🛑 Stopping enhanced stops listener');
      stopsListenerRef.current();
      stopsListenerRef.current = null;
      setIsListenerActive(false);
    }
  }, []);
  
  /**
   * Handle app state changes
   */
  const handleAppStateChange = useCallback((nextAppState) => {
    console.log(`📱 App state changed: ${appState} → ${nextAppState}`);
    setAppState(nextAppState);
    
    if (nextAppState === 'active' && !isListenerActive) {
      // App became active, restart listener if needed
      setTimeout(startStopsListener, 1000);
    } else if (nextAppState === 'background' || nextAppState === 'inactive') {
      // App went to background, keep listener active for notifications
      console.log('📱 App backgrounded, keeping listener active for notifications');
    }
  }, [appState, isListenerActive, startStopsListener]);
  
  /**
   * Initialize component
   */
  useEffect(() => {
    const initialize = async () => {
      console.log('🚀 Initializing Enhanced Bus Stop Notifications...');
      
      // Load user preferences and notification history
      await Promise.all([
        loadUserPreferences(),
        loadNotificationHistory()
      ]);
      
      // Start listener after a short delay
      setTimeout(startStopsListener, 2000);
    };
    
    initialize();
    
    // Set up app state listener
    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);
    
    // Cleanup on unmount
    return () => {
      console.log('🧹 Cleaning up Enhanced Bus Stop Notifications');
      stopStopsListener();
      appStateSubscription?.remove();
      
      if (notificationTimeoutRef.current) {
        clearTimeout(notificationTimeoutRef.current);
      }
    };
  }, []);
  
  /**
   * Restart listener when user preferences change
   */
  useEffect(() => {
    if (userBusStop && userRouteNumber && !isListenerActive) {
      console.log('👤 User preferences updated, restarting listener');
      setTimeout(startStopsListener, 1000);
    }
  }, [userBusStop, userRouteNumber, isListenerActive, startStopsListener]);
  
  // This component doesn't render anything visible
  return null;
};

export default EnhancedBusStopNotifications;