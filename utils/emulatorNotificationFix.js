import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Alert } from 'react-native';

// Configure notification handler directly
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Check if running in emulator
export const isEmulator = !Device.isDevice;

// Request notification permissions
export const requestPermissions = async () => {
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    console.log('Notification permission status:', status);
    return status === 'granted';
  } catch (error) {
    console.error('Error requesting notification permissions:', error);
    return false;
  }
};

// Send a notification that works in emulator
export const sendEmulatorNotification = async (title, body, data = {}) => {
  try {
    // Request permissions if needed
    await requestPermissions();
    
    // Schedule notification
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
      },
      trigger: null, // Send immediately
    });
    
    console.log('Notification scheduled with ID:', notificationId);
    
    // Also show an alert as a backup for emulators
    if (isEmulator) {
      setTimeout(() => {
        Alert.alert(title, body);
      }, 500);
    }
    
    return notificationId;
  } catch (error) {
    console.error('Error sending notification:', error);
    
    // Fallback to alert
    Alert.alert(title, body);
    
    return null;
  }
};

// Initialize notifications for emulator
export const initializeEmulatorNotifications = async () => {
  try {
    // Request permissions
    const hasPermission = await requestPermissions();
    
    if (hasPermission) {
      console.log('Notification permissions granted');
      
      // Send a test notification
      await sendEmulatorNotification(
        'Notifications Enabled',
        'You will receive bus stop alerts',
        { test: true }
      );
      
      return true;
    } else {
      console.log('Notification permissions denied');
      return false;
    }
  } catch (error) {
    console.error('Error initializing notifications:', error);
    return false;
  }
};