/**
 * Utility function to send push notifications using Expo Push Notification service
 * This file works with both development builds and production APK versions
 * 
 * IMPORTANT: For Android APK builds (Android 8.0+), notifications MUST specify a channelId
 * that matches a notification channel created in your app. The channel 'bus-tracker' is
 * created in notificationHelper.js and used here for all notifications.
 */

/**
 * Send a push notification to a specific device
 * @param {string} expoPushToken - The Expo Push Token of the recipient device
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {Object} data - Additional data to send with the notification
 * @returns {Promise<Object>} - Response from the Expo Push API
 */
export async function sendPushNotification(expoPushToken, title, body, data = {}) {
  // Your Expo Push Notification App Token
  const EXPO_PUSH_TOKEN = 'lU7qY5eiukC5zL4KDW2kTQ';
  
  // Validate the push token format
  if (!expoPushToken || !expoPushToken.includes('ExponentPushToken')) {
    console.warn('Invalid Expo Push Token format:', expoPushToken);
    // Continue anyway for testing purposes
  }
  
  const message = {
    to: expoPushToken,
    sound: 'default',
    title: title,
    body: body,
    data: data,
    priority: 'high',
    // These settings help ensure delivery in APK builds
    channelId: 'bus-tracker', // Must match the channel ID in your app
    badge: 1,
  };

  try {
    console.log('Sending push notification to:', expoPushToken);
    
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${EXPO_PUSH_TOKEN}`,
      },
      body: JSON.stringify(message),
    });

    const responseData = await response.json();
    console.log('Push notification sent:', responseData);
    return responseData;
  } catch (error) {
    console.error('Error sending push notification:', error);
    throw error;
  }
}

/**
 * Send push notifications to multiple devices
 * @param {Array<string>} expoPushTokens - Array of Expo Push Tokens
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {Object} data - Additional data to send with the notification
 * @returns {Promise<Object>} - Response from the Expo Push API
 */
export async function sendPushNotificationsToMultipleDevices(expoPushTokens, title, body, data = {}) {
  // Your Expo Push Notification App Token
  const EXPO_PUSH_TOKEN = 'lU7qY5eiukC5zL4KDW2kTQ';
  
  // Filter out any invalid tokens
  const validTokens = expoPushTokens.filter(token => token && typeof token === 'string');
  
  if (validTokens.length === 0) {
    console.warn('No valid push tokens provided');
    return { data: [] };
  }
  
  console.log(`Sending push notifications to ${validTokens.length} devices`);
  
  const messages = validTokens.map(token => ({
    to: token,
    sound: 'default',
    title: title,
    body: body,
    data: data,
    priority: 'high',
    // These settings help ensure delivery in APK builds
    channelId: 'bus-tracker', // Must match the channel ID in your app
    badge: 1,
  }));

  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${EXPO_PUSH_TOKEN}`,
      },
      body: JSON.stringify(messages),
    });

    const responseData = await response.json();
    console.log('Push notifications sent:', responseData);
    return responseData;
  } catch (error) {
    console.error('Error sending push notifications:', error);
    throw error;
  }
}

// Example usage in both development and APK builds:
/*
import { getExpoPushToken } from './utils/notificationHelper';
import { sendPushNotification, sendPushNotificationsToMultipleDevices } from './utils/sendPushNotification';

// 1. When a user registers, get and store their token
const registerUser = async (userId) => {
  const pushToken = await getExpoPushToken();
  // Store this token in your database associated with the user
  await saveUserTokenToDatabase(userId, pushToken);
  return pushToken;
};

// 2. Send a notification to a single user
const notifyUser = async (userId) => {
  // Get the user's token from your database
  const userToken = await getUserTokenFromDatabase(userId);
  
  await sendPushNotification(
    userToken,
    'Bus Arriving Soon',
    'Your bus will arrive at the stop in 5 minutes',
    { 
      screen: 'BusDetails', 
      busId: '123',
      timestamp: new Date().toISOString()
    }
  );
};

// 3. Send notifications to multiple users (e.g., all users waiting at a specific stop)
const notifyUsersAtStop = async (stopId) => {
  // Get tokens for all users waiting at this stop
  const userTokens = await getUserTokensAtStop(stopId);
  
  await sendPushNotificationsToMultipleDevices(
    userTokens,
    'Bus Update',
    'Bus #42 will arrive at your stop in 3 minutes',
    {
      screen: 'StopDetails',
      stopId: stopId,
      timestamp: new Date().toISOString()
    }
  );
};
*/