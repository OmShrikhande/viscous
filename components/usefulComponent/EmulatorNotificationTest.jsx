import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getExpoPushToken, sendLocalNotification } from '../../utils/notificationHelper';
import { sendPushNotification } from '../../utils/sendPushNotification';

const NotificationTester = ({ isDark }) => {
  const [isSending, setIsSending] = useState(false);
  const isEmulator = !Device.isDevice;
  const isDevBuild = Constants.appOwnership === 'expo' || __DEV__;

  const sendTestNotification = async () => {
    setIsSending(true);
    try {
      // Send a test notification
      const deviceTypeText = isEmulator ? "emulator" : "device";
      const buildTypeText = isDevBuild ? "development build" : "production APK";
      
      const notificationId = await sendLocalNotification(
        "Test Notification", 
        `This is a test notification sent from a ${deviceTypeText} in ${buildTypeText}.`,
        {
          data: { 
            screen: 'home', 
            test: true,
            deviceType: deviceTypeText,
            buildType: buildTypeText
          },
          trigger: { seconds: 2 },
        }
      );
      
      console.log("Test notification sent with ID:", notificationId);
      
      if (notificationId) {
        Alert.alert(
          "Notification Sent",
          `A test notification has been scheduled to appear in 2 seconds. Check your notification tray.`,
          [{ text: "OK" }]
        );
      } else {
        Alert.alert(
          "Notification Failed",
          "Failed to send the test notification. Check console for details.",
          [{ text: "OK" }]
        );
      }
    } catch (error) {
      console.error("Error sending test notification:", error);
      Alert.alert(
        "Error",
        "An error occurred while sending the test notification: " + error.message,
        [{ text: "OK" }]
      );
    } finally {
      setIsSending(false);
    }
  };

  const sendBusApproachingNotification = async () => {
    setIsSending(true);
    try {
      // Send a bus approaching notification
      const deviceTypeText = isEmulator ? "emulator" : "device";
      const buildTypeText = isDevBuild ? "development build" : "production APK";
      
      const notificationId = await sendLocalNotification(
        "Bus Approaching Soon", 
        `Your bus is 2 stops away at Test Stop. Get ready! (${deviceTypeText})`,
        {
          data: { 
            screen: 'home',
            type: 'approaching',
            currentStop: 'Test Stop',
            userStop: 'Your Stop',
            stopsAway: 2,
            deviceType: deviceTypeText,
            buildType: buildTypeText
          },
          trigger: { seconds: 2 },
        }
      );
      
      console.log("Bus approaching notification sent with ID:", notificationId);
      
      if (notificationId) {
        Alert.alert(
          "Notification Sent",
          `A bus approaching notification has been scheduled to appear in 2 seconds on your ${deviceTypeText}.`,
          [{ text: "OK" }]
        );
      } else {
        Alert.alert(
          "Notification Failed",
          "Failed to send the notification. Check console for details.",
          [{ text: "OK" }]
        );
      }
    } catch (error) {
      console.error("Error sending bus notification:", error);
      Alert.alert(
        "Error",
        "An error occurred while sending the notification: " + error.message,
        [{ text: "OK" }]
      );
    } finally {
      setIsSending(false);
    }
  };

  const sendBusArrivedNotification = async () => {
    setIsSending(true);
    try {
      // Send a bus arrived notification
      const deviceTypeText = isEmulator ? "emulator" : "device";
      const buildTypeText = isDevBuild ? "development build" : "production APK";
      
      const notificationId = await sendLocalNotification(
        "Bus Arrived at Your Stop", 
        `Your bus has arrived at Your Stop. Don't miss it! (${deviceTypeText})`,
        {
          data: { 
            screen: 'home',
            type: 'arrived',
            stopName: 'Your Stop',
            deviceType: deviceTypeText,
            buildType: buildTypeText
          },
          trigger: { seconds: 2 },
        }
      );
      
      console.log("Bus arrived notification sent with ID:", notificationId);
      
      if (notificationId) {
        Alert.alert(
          "Notification Sent",
          `A bus arrived notification has been scheduled to appear in 2 seconds on your ${deviceTypeText}.`,
          [{ text: "OK" }]
        );
      } else {
        Alert.alert(
          "Notification Failed",
          "Failed to send the notification. Check console for details.",
          [{ text: "OK" }]
        );
      }
    } catch (error) {
      console.error("Error sending bus notification:", error);
      Alert.alert(
        "Error",
        "An error occurred while sending the notification: " + error.message,
        [{ text: "OK" }]
      );
    } finally {
      setIsSending(false);
    }
  };
  
  // Test Native Notify push notifications
  const sendNativeNotifyPushNotification = async () => {
    setIsSending(true);
    try {
      // Get the device's push token
      const pushToken = await getExpoPushToken();
      
      if (!pushToken) {
        Alert.alert(
          "Error",
          "Could not get push token. Make sure you're using a development build or APK.",
          [{ text: "OK" }]
        );
        setIsSending(false);
        return;
      }
      
      console.log("Using push token:", pushToken);
      
      // Device and build info
      const deviceTypeText = isEmulator ? "emulator" : "device";
      const buildTypeText = isDevBuild ? "development build" : "production APK";
      
      // Send a push notification using Native Notify
      const response = await sendPushNotification(
        pushToken,
        "Native Notify Test", 
        `This is a push notification sent via Native Notify on ${deviceTypeText} in ${buildTypeText}.`,
        {
          screen: 'home',
          test: true,
          deviceType: deviceTypeText,
          buildType: buildTypeText,
          timestamp: new Date().toISOString()
        }
      );
      
      console.log("Push notification response:", response);
      
      Alert.alert(
        "Push Notification Sent",
        `A push notification has been sent to your device (${deviceTypeText}). You should receive it shortly.`,
        [{ text: "OK" }]
      );
    } catch (error) {
      console.error("Error sending push notification:", error);
      Alert.alert(
        "Error",
        "An error occurred while sending the push notification: " + error.message,
        [{ text: "OK" }]
      );
    } finally {
      setIsSending(false);
    }
  };

  // Styles based on theme
  const textColor = isDark ? '#fff' : '#000';
  const containerBgColor = isDark ? 'rgba(30, 30, 30, 0.7)' : 'rgba(240, 240, 240, 0.7)';
  const buttonBgColor = isDark ? '#1E90FF' : '#1E90FF';

  // Show a different message based on device type
  const deviceType = isEmulator ? 'Emulator' : 'Real Device';
  const buildType = isDevBuild ? 'Development Build' : 'Production APK';
  
  return (
    <View style={styles.container}>
      <BlurView intensity={30} style={[styles.blurContainer, { backgroundColor: containerBgColor }]} tint={isDark ? 'dark' : 'light'}>
        <View style={styles.header}>
          <Ionicons name={isEmulator ? "bug-outline" : "phone-portrait-outline"} size={24} color={isDark ? '#fff' : '#000'} />
          <Text style={[styles.title, { color: textColor }]}>Notification Test ({deviceType})</Text>
        </View>
        
        <Text style={[styles.description, { color: textColor }]}>
          Testing notifications on {deviceType} in {buildType} mode.
        </Text>
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: buttonBgColor }]}
            onPress={sendTestNotification}
            disabled={isSending}
          >
            <Text style={styles.buttonText}>Test Basic Notification</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, { backgroundColor: buttonBgColor }]}
            onPress={sendBusApproachingNotification}
            disabled={isSending}
          >
            <Text style={styles.buttonText}>Test Bus Approaching</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, { backgroundColor: buttonBgColor }]}
            onPress={sendBusArrivedNotification}
            disabled={isSending}
          >
            <Text style={styles.buttonText}>Test Bus Arrived</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, { backgroundColor: '#FF6347' }]}
            onPress={sendNativeNotifyPushNotification}
            disabled={isSending}
          >
            <Text style={styles.buttonText}>Test Native Notify Push</Text>
          </TouchableOpacity>
        </View>
      </BlurView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
    borderRadius: 16,
    overflow: 'hidden',
  },
  blurContainer: {
    padding: 16,
    borderRadius: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontFamily: 'flux-bold',
    marginLeft: 8,
  },
  description: {
    fontSize: 14,
    fontFamily: 'flux',
    marginBottom: 16,
    opacity: 0.8,
  },
  buttonContainer: {
    gap: 10,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'flux-bold',
  },
});

export default NotificationTester;