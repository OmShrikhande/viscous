import { sendLocalNotification } from './notificationHelper';

/**
 * Monitors bus speed and sends notifications when speed exceeds threshold
 * @param {number} currentSpeed - Current speed of the bus
 * @param {number} threshold - Speed threshold to trigger notification (default: 65)
 * @param {boolean} notificationsEnabled - Whether notifications are enabled
 * @returns {boolean} - Whether notification was sent
 */
export const monitorSpeed = async (currentSpeed, threshold = 65, notificationsEnabled = true) => {
  // Skip if speed is not available or notifications are disabled
  if (currentSpeed === null || currentSpeed === undefined || !notificationsEnabled) {
    return false;
  }

  // Parse speed to ensure it's a number
  const speed = parseFloat(currentSpeed);
  
  // Skip if speed is NaN
  if (isNaN(speed)) {
    console.warn('Invalid speed value:', currentSpeed);
    return false;
  }

  // Check if speed exceeds threshold
  if (speed > threshold) {
    console.warn(`⚠️ High speed detected: ${speed} (threshold: ${threshold})`);
    
    try {
      // Send notification
      const notificationId = await sendLocalNotification(
        'Bus Speed Alert',
        `The bus is traveling at ${speed.toFixed(1)} km/h, which exceeds the safe limit of ${threshold} km/h.`,
        {
          data: { screen: 'map', speedAlert: true },
          // Use a trigger to ensure it appears in system tray
          trigger: { seconds: 1 },
        }
      );
      
      console.log(`✅ Speed alert notification sent with ID: ${notificationId}`);
      return true;
    } catch (error) {
      console.error('Error sending speed alert notification:', error);
      return false;
    }
  }
  
  return false;
};

/**
 * Checks if speed monitoring is enabled in user preferences
 * @param {Object} userData - User data from AsyncStorage or Firestore
 * @returns {boolean} - Whether speed monitoring is enabled
 */
export const isSpeedMonitoringEnabled = (userData) => {
  // Default to true if userData is not available or doesn't have the setting
  if (!userData) return true;
  
  // Check if speedMonitoring is explicitly set to false
  return userData.speedMonitoring !== false;
};