import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Linking from "expo-linking";
import * as Notifications from "expo-notifications";
import { Alert, Platform } from "react-native";

// Configure notification behavior when received
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    priority: Notifications.AndroidImportance.MAX, // Maximum priority to wake screen
  }),
});

// Define the background notification task name
const BACKGROUND_NOTIFICATION_TASK = 'BACKGROUND_NOTIFICATION_TASK';

// Define the background task handler with maximum priority
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    priority: Notifications.AndroidImportance.MAX, // Maximum priority to wake screen
  }),
});

// Set up a task to handle notifications when app is completely closed
try {
  if (Platform.OS === 'android') {
    // Register for background tasks if available in this Expo version
    if (Notifications.registerTaskAsync) {
      Notifications.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK, {
        data: { source: 'notification' },
        taskName: BACKGROUND_NOTIFICATION_TASK,
        options: {
          delay: 0,
        },
      }).catch(error => {
        console.log('Background task registration error (expected in some Expo versions):', error);
      });
    }
  }
} catch (error) {
  console.log('Background notification setup error (expected in some environments):', error);
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

  // Check existing permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // Request permissions if not already granted
  if (existingStatus !== "granted") {
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
    } catch (error) {
      console.warn("Error requesting notification permissions:", error);
      // Fall back to basic permission request
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
  }

  // If permissions still not granted, prompt user to enable in settings
  if (finalStatus !== "granted") {
    Alert.alert(
      "Notification Permission",
      "Enable notifications in settings to receive bus arrival alerts even when the app is not in use.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Open Settings", onPress: () => Linking.openSettings() },
      ]
    );
    return false;
  }

  console.log("✅ Full notification permissions granted for background and lock screen.");
  return true;
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
    // Create a notification channel for Android with max importance to wake screen
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('bus-tracker', {
        name: 'Bus Tracker Notifications',
        description: 'Notifications for bus arrivals and updates',
        importance: Notifications.AndroidImportance.MAX, // Maximum importance to wake screen
        vibrationPattern: [0, 250, 250, 250, 250, 250],
        lightColor: '#FF231F7C',
        sound: true,
        enableLights: true,
        enableVibrate: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC, // Show on lock screen
        showBadge: true,
      });
    }

    // Prepare notification content with properties for background/lock screen visibility
    const notificationContent = {
      title,
      body,
      data: options.data || {},
      priority: 'high', // High priority for better visibility
      
      // Android specific properties
      ...(Platform.OS === 'android' && { 
        channelId: 'bus-tracker',
        color: '#0a7ea4',
        vibrationPattern: [0, 250, 250, 250],
        autoDismiss: true, // Allow notification to be dismissed
        sticky: false, // Don't make it sticky
        ongoing: false, // Not an ongoing notification
        importance: Notifications.AndroidImportance.HIGH, // High importance to wake screen
      }),
      
      // iOS specific properties
      ...(Platform.OS === 'ios' && {
        sound: 'default',
        badge: options.badge !== undefined ? options.badge : 1,
        interruptionLevel: Notifications.IOSAuthorizationStatus.CRITICAL, // Highest priority for iOS
      }),
    };

    // Use a trigger even for immediate notifications to ensure they appear in the system tray
    const trigger = options.trigger || { seconds: 1 };

    // Schedule the notification
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: notificationContent,
      trigger: trigger,
    });
    
    console.log(`Notification scheduled: ${notificationId}`);
    return notificationId;
  } catch (error) {
    console.warn("Error sending notification:", error);
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
        importance: Notifications.AndroidImportance.MAX, // Maximum importance to wake screen
        vibrationPattern: [0, 250, 250, 250, 250, 250],
        lightColor: '#0a7ea4',
        sound: true,
        enableLights: true,
        enableVibrate: true,
        showBadge: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC, // Show full notification on lock screen
      });
    }
    
    // Request permissions with all options enabled
    const hasPermission = await requestNotificationPermissions();
    
    // Configure notification handler for all states (foreground, background, locked, killed)
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        priority: Notifications.AndroidImportance.MAX, // Maximum priority to wake screen
      }),
    });
    
    // For Android, ensure we can receive notifications when app is killed
    if (Platform.OS === 'android') {
      try {
        // This helps with some Android devices to keep notifications working when app is killed
        if (Notifications.setNotificationCategoryAsync) {
          await Notifications.setNotificationCategoryAsync('bus-arrival', [
            {
              identifier: 'view',
              buttonTitle: 'View',
              options: {
                opensAppToForeground: true,
              },
            },
          ]);
        }
      } catch (error) {
        console.log('Error setting up notification category:', error);
      }
    }
    
    // Try to get push token if we have permission
    if (hasPermission) {
      await getExpoPushToken();
    }
    
    // Send test notification if requested
    if (hasPermission && sendTestNotification) {
      await sendLocalNotification(
        "Bus Tracker Active", 
        "You'll receive updates when the bus reaches stops.",
        {
          data: { screen: 'home' },
          // Use a trigger to ensure it appears in system tray
          trigger: { seconds: 1 },
        }
      );
    }
    
    console.log("✅ Notifications initialized successfully with background support");
    return hasPermission;
  } catch (error) {
    console.error("Error initializing notifications:", error);
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
 * @param {Array} subscriptions Array of subscription objects to remove
 */
export const removeAllNotificationListeners = (subscriptions = []) => {
  // Remove each subscription individually
  subscriptions.forEach(subscription => {
    if (subscription && typeof subscription.remove === 'function') {
      subscription.remove();
    }
  });
};