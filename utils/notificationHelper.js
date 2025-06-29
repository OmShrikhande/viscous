import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Linking from "expo-linking";
import * as Notifications from "expo-notifications";
import { Alert, Platform } from "react-native";

// Configure notification behavior when received
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,  // Instead of shouldShowAlert
    shouldShowList: true,     // For notification center
  }),
});

// Define the background notification task name
const BACKGROUND_NOTIFICATION_TASK = 'BACKGROUND_NOTIFICATION_TASK';

// Register the task for background notifications
if (Platform.OS === 'android') {
  // Make sure the task is defined only once
  try {
    Notifications.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK);
  } catch (error) {
    console.log('Task might already be registered:', error);
  }
}

/**
 * Request notification permissions with full background and lock screen support
 * @returns {Promise<boolean>} Whether permissions were granted
 */
export const requestNotificationPermissions = async () => {
  if (!Device.isDevice) {
    console.warn("Must use a real device for notifications!");
    return false;
  }

  console.log("🔐 Requesting notification permissions...");

  try {
    // Check existing permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    console.log("📱 Current notification permission status:", existingStatus);
    
    let finalStatus = existingStatus;

    // Request permissions if not already granted
    if (existingStatus !== "granted") {
      console.log("🔄 Requesting full notification permissions...");
      
      try {
        // Request with all options for maximum compatibility
        const { status } = await Notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
            allowAnnouncements: true,
            allowCriticalAlerts: true, // For high-priority notifications that can break through Do Not Disturb
            provideAppNotificationSettings: true,
            allowProvisional: true, // For quiet notifications on iOS
          },
          android: {
            // Android permissions are handled through the notification channel
          }
        });
        finalStatus = status;
        console.log("📱 Permission request result:", status);
      } catch (error) {
        console.warn("⚠️ Error with advanced permission request:", error);
        
        // Fall back to basic permission request
        console.log("🔄 Falling back to basic permission request...");
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
        console.log("📱 Basic permission request result:", status);
      }
    }

    // If permissions still not granted, prompt user to enable in settings
    if (finalStatus !== "granted") {
      console.log("⚠️ Permissions not granted, prompting user to open settings");
      
      Alert.alert(
        "Enable Notifications",
        "System notifications are required to receive bus arrival alerts when the app is in the background or your device is locked. Please enable them in settings.",
        [
          { text: "Not Now", style: "cancel" },
          { 
            text: "Open Settings", 
            onPress: () => {
              console.log("🔄 Opening device settings...");
              Linking.openSettings();
            },
            style: "default"
          },
        ],
        { cancelable: false }
      );
      return false;
    }

    // On Android, we need to create the notification channel
    if (Platform.OS === 'android') {
      console.log("🔄 Setting up Android notification channel...");
      
      await Notifications.setNotificationChannelAsync('bus-tracker', {
        name: 'Bus Tracker Notifications',
        description: 'Notifications for bus arrivals and important updates',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
        sound: 'default',
        enableLights: true,
        enableVibrate: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        showBadge: true,
        bypassDnd: true,
      });
      
      // Verify channel was created
      const channel = await Notifications.getNotificationChannelAsync('bus-tracker');
      console.log("📢 Android notification channel created:", channel?.name);
    }

    console.log("✅ Full notification permissions granted for background and lock screen");
    return true;
  } catch (error) {
    console.error("❌ Unexpected error requesting permissions:", error);
    return false;
  }
};

/**
 * Get Expo push token with error handling
 * @returns {Promise<string|null>} Push token or null if error
 */
export const getExpoPushToken = async () => {
  try {
    // Check if we're in a development build
    const isDevBuild = Constants.appOwnership === 'expo' ? false : true;
    
    if (!isDevBuild && Platform.OS === 'android') {
      console.warn("Push notifications require a development build on Android");
      return null;
    }
    
    // Get the project ID from app config
    const projectId = Constants.expoConfig?.extra?.eas?.projectId || 
                     Constants.manifest2?.extra?.eas?.projectId ||
                     Constants.expoConfig?.extra?.projectId;
                     
    if (!projectId) {
      console.warn("Project ID is required for push notifications");
      console.warn("Add it to your app.json/app.config.js in the extra.eas.projectId field");
      return null;
    }
    
    // Get the push token
    const { data: pushToken } = await Notifications.getExpoPushTokenAsync({
      projectId: projectId,
    });
    
    console.log("Expo Push Token:", pushToken);
    return pushToken;
  } catch (error) {
    console.warn("Error getting push token:", error);
    console.warn("This is expected in Expo Go. Use a development build for push notifications.");
    return null;
  }
};

/**
 * Send a local notification that works in foreground, background, and when device is locked
 * @param {string} title Notification title
 * @param {string} body Notification body
 * @param {Object} [options] Additional notification options
 * @returns {Promise<string|null>} Notification ID or null if error
 */
export const sendLocalNotification = async (title, body, options = {}) => {
  try {
    console.log("🔔 Sending notification:", title, body);
    
    // Create a notification channel for Android with high importance
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('bus-tracker', {
        name: 'Bus Tracker Notifications',
        description: 'Notifications for bus arrivals and updates',
        importance: Notifications.AndroidImportance.MAX, // Maximum importance for lock screen visibility
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
        sound: 'default',
        enableLights: true,
        enableVibrate: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC, // Show on lock screen
        showBadge: true,
        bypassDnd: true, // Bypass Do Not Disturb mode
      });
    }

    // Prepare notification content with properties for background/lock screen visibility
    const notificationContent = {
      title,
      body,
      data: options.data || {},
      
      // Android specific properties
      ...(Platform.OS === 'android' && { 
        channelId: 'bus-tracker',
        color: '#0a7ea4',
        vibrationPattern: [0, 250, 250, 250],
        autoDismiss: false, // Don't auto dismiss the notification
        sticky: false, // Make it sticky until user interacts
        ongoing: options.ongoing || false, // Set to true for persistent notifications
        priority: 'max', // Maximum priority
        icon: 'ic_notification',
        showWhen: true,
      }),
      
      // iOS specific properties
      ...(Platform.OS === 'ios' && {
        sound: true,
        badge: options.badge !== undefined ? options.badge : 1,
        interruptionLevel: 'critical', // Highest priority for iOS
        categoryIdentifier: 'bus-updates',
      }),
    };

    // For immediate notifications, use a very short delay to ensure they appear in the system tray
    const trigger = options.trigger || { seconds: 1 };

    // Schedule the notification
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: notificationContent,
      trigger: trigger,
    });
    
    console.log(`✅ Notification scheduled with ID: ${notificationId}`);
    
    // For debugging - get all scheduled notifications
    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
    console.log(`📋 Total scheduled notifications: ${scheduledNotifications.length}`);
    
    return notificationId;
  } catch (error) {
    console.error("❌ Error sending notification:", error);
    console.error(error.stack);
    return null;
  }
};

/**
 * Initialize notifications for the app with background and lock screen support
 * @param {boolean} sendTestNotification Whether to send a test notification
 * @returns {Promise<boolean>} Whether initialization was successful
 */
export const initializeNotifications = async (sendTestNotification = false) => {
  try {
    console.log("🔄 Initializing notifications system...");
    
    // Set up notification categories/actions for iOS
    if (Platform.OS === 'ios') {
      await Notifications.setNotificationCategoryAsync('bus-updates', [
        {
          identifier: 'view',
          buttonTitle: 'View Details',
          options: {
            opensAppToForeground: true,
          },
        },
      ]);
    }
    
    // Create default notification channel for Android with maximum importance
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('bus-tracker', {
        name: 'Bus Tracker Notifications',
        description: 'Notifications for bus location and stop updates',
        importance: Notifications.AndroidImportance.MAX, // Maximum importance
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#0a7ea4',
        sound: 'default',
        enableLights: true,
        enableVibrate: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC, // Show full notification on lock screen
        showBadge: true,
        bypassDnd: true, // Bypass Do Not Disturb mode
      });
      
      // Log the created channel to verify
      const channel = await Notifications.getNotificationChannelAsync('bus-tracker');
      console.log("📢 Notification channel created:", channel);
    }
    
    // Request permissions with all options enabled
    const hasPermission = await requestNotificationPermissions();
    console.log("🔐 Notification permissions granted:", hasPermission);
    
    // Configure notification handler for all states (foreground, background, locked)
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,  // Instead of shouldShowAlert
        shouldShowList: true,     // For notification center
      }),
    });
    
    // Try to get push token if we have permission
    if (hasPermission) {
      const token = await getExpoPushToken();
      console.log("🔑 Push token obtained:", token);
    }
    
    // Send test notification if requested
    if (hasPermission && sendTestNotification) {
      console.log("🧪 Sending test notification...");
      const notificationId = await sendLocalNotification(
        "Bus Tracker Active", 
        "You'll receive updates when the bus reaches stops.",
        {
          data: { screen: 'home' },
          // Use a trigger to ensure it appears in system tray
          trigger: { seconds: 2 },
        }
      );
      console.log("✅ Test notification sent with ID:", notificationId);
    }
    
    console.log("✅ Notifications initialized successfully with background support");
    return hasPermission;
  } catch (error) {
    console.error("❌ Error initializing notifications:", error);
    console.error(error.stack);
    return false;
  }
};

/**
 * Add a notification response listener
 * @param {Function} handler Function to handle notification response
 * @returns {Function} Function to remove the listener
 */
export const addNotificationResponseListener = (handler) => {
  return Notifications.addNotificationResponseReceivedListener(handler);
};

/**
 * Add a notification received listener for when app is in foreground
 * @param {Function} handler Function to handle received notification
 * @returns {Function} Function to remove the listener
 */
export const addNotificationReceivedListener = (handler) => {
  return Notifications.addNotificationReceivedListener(handler);
};

/**
 * Remove all notification listeners
 * @param {Array} listeners Array of listener references to remove
 */
export const removeAllNotificationListeners = (listeners = []) => {
  // Check if listeners array is provided and remove each one
  if (Array.isArray(listeners) && listeners.length > 0) {
    listeners.forEach(listener => {
      if (listener && typeof listener.remove === 'function') {
        listener.remove();
      }
    });
    console.log('Notification listeners removed successfully');
  } else {
    console.log('No notification listeners to remove');
  }
};