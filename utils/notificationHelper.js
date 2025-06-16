import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import * as Linking from "expo-linking";
import { Platform, Alert } from "react-native";

// Configure notification behavior when received
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Request notification permissions and handle potential errors
 * @returns {Promise<boolean>} Whether permissions were granted
 */
export const requestNotificationPermissions = async () => {
  if (!Device.isDevice) {
    console.warn("Must use a real device for notifications!");
    return false;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    Alert.alert(
      "Notification Permission",
      "Enable notifications in settings to receive bus arrival alerts.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Open Settings", onPress: () => Linking.openSettings() },
      ]
    );
    return false;
  }

  console.log("✅ Notification permissions granted.");
  return true;
};

/**
 * Get Expo push token with error handling
 * @returns {Promise<string|null>} Push token or null if error
 */
export const getExpoPushToken = async () => {
  try {
    // For SDK 53+, we need to use a development build for remote notifications
    // This will still allow local notifications in Expo Go
    const { data: pushToken } = await Notifications.getExpoPushTokenAsync({
      projectId: Platform.OS === 'ios' ? undefined : "your-expo-project-id", // Replace with your Expo project ID
    });
    console.log("Expo Push Token:", pushToken);
    return pushToken;
  } catch (error) {
    console.warn("Error getting push token:", error);
    // This is expected in Expo Go with SDK 53+
    return null;
  }
};

/**
 * Send a local notification
 * @param {string} title Notification title
 * @param {string} body Notification body
 * @returns {Promise<string|null>} Notification ID or null if error
 */
export const sendLocalNotification = async (title, body) => {
  try {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: "default",
      },
      trigger: null, // Send immediately
    });
    return notificationId;
  } catch (error) {
    console.warn("Error sending notification:", error);
    return null;
  }
};

/**
 * Initialize notifications for the app
 * @param {boolean} sendTestNotification Whether to send a test notification
 * @returns {Promise<boolean>} Whether initialization was successful
 */
export const initializeNotifications = async (sendTestNotification = false) => {
  const hasPermission = await requestNotificationPermissions();
  
  if (hasPermission && sendTestNotification) {
    await sendLocalNotification(
      "Bus Tracker Active", 
      "You'll receive updates when the bus reaches stops."
    );
  }
  
  return hasPermission;
};

/**
 * Add a notification listener
 * @param {Function} handler Function to handle notification response
 * @returns {Function} Function to remove the listener
 */
export const addNotificationResponseListener = (handler) => {
  return Notifications.addNotificationResponseReceivedListener(handler);
};