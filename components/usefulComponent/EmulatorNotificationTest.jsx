import { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as Device from 'expo-device';
import { sendLocalNotification } from '../../utils/notificationHelper';

const EmulatorNotificationTest = ({ isDark }) => {
  const [isSending, setIsSending] = useState(false);
  const isEmulator = !Device.isDevice;

  const sendTestNotification = async () => {
    setIsSending(true);
    try {
      // Send a test notification
      const notificationId = await sendLocalNotification(
        "Test Notification", 
        "This is a test notification sent from the emulator.",
        {
          data: { screen: 'home', test: true },
          trigger: { seconds: 2 },
        }
      );
      
      console.log("Test notification sent with ID:", notificationId);
      
      if (notificationId) {
        Alert.alert(
          "Notification Sent",
          "A test notification has been scheduled to appear in 2 seconds. Check your notification tray.",
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
      const notificationId = await sendLocalNotification(
        "Bus Approaching Soon", 
        "Your bus is 2 stops away at Test Stop. Get ready!",
        {
          data: { 
            screen: 'home',
            type: 'approaching',
            currentStop: 'Test Stop',
            userStop: 'Your Stop',
            stopsAway: 2
          },
          trigger: { seconds: 2 },
        }
      );
      
      console.log("Bus approaching notification sent with ID:", notificationId);
      
      if (notificationId) {
        Alert.alert(
          "Notification Sent",
          "A bus approaching notification has been scheduled to appear in 2 seconds.",
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
      const notificationId = await sendLocalNotification(
        "Bus Arrived at Your Stop", 
        "Your bus has arrived at Your Stop. Don't miss it!",
        {
          data: { 
            screen: 'home',
            type: 'arrived',
            stopName: 'Your Stop'
          },
          trigger: { seconds: 2 },
        }
      );
      
      console.log("Bus arrived notification sent with ID:", notificationId);
      
      if (notificationId) {
        Alert.alert(
          "Notification Sent",
          "A bus arrived notification has been scheduled to appear in 2 seconds.",
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

  // Styles based on theme
  const textColor = isDark ? '#fff' : '#000';
  const containerBgColor = isDark ? 'rgba(30, 30, 30, 0.7)' : 'rgba(240, 240, 240, 0.7)';
  const buttonBgColor = isDark ? '#1E90FF' : '#1E90FF';

  if (!isEmulator) {
    return null; // Only show this component on emulators
  }

  return (
    <View style={styles.container}>
      <BlurView intensity={30} style={[styles.blurContainer, { backgroundColor: containerBgColor }]} tint={isDark ? 'dark' : 'light'}>
        <View style={styles.header}>
          <Ionicons name="bug-outline" size={24} color={isDark ? '#fff' : '#000'} />
          <Text style={[styles.title, { color: textColor }]}>Emulator Notification Test</Text>
        </View>
        
        <Text style={[styles.description, { color: textColor }]}>
          This panel is only visible on emulators to help test notifications.
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

export default EmulatorNotificationTest;