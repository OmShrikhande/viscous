import React, { useEffect, useState } from "react";
import { View, Text, Alert } from "react-native";
import * as Notifications from "expo-notifications";
import { realtimeDatabase } from "../../configs/FirebaseConfigs"; // Import your Firebase config
import { ref, onValue } from "firebase/database";

// Set up notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const SpeedMonitor = () => {
  const [speed, setSpeed] = useState(0);

  useEffect(() => {
    // Request permissions for notifications
    const getPermission = async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Enable notifications in settings.");
      }
    };
    getPermission();

    // Reference to speed in Firebase Realtime Database
    const speedRef = ref(realtimeDatabase, "bus/Location/Speed");

    // Listen for speed changes
    const unsubscribe = onValue(speedRef, (snapshot) => {
      if (snapshot.exists()) {
        const newSpeed = snapshot.val();
        setSpeed(newSpeed);

        if (newSpeed > 60) {
          sendPushNotification(newSpeed);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Function to send push notification
  const sendPushNotification = async (currentSpeed) => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Speed Alert 🚨",
        body: `Bus is over-speeding! Current speed: ${currentSpeed} km/h`,
        sound: true,
      },
      trigger: null, // Send immediately
    });
  };

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text style={{ fontSize: 18 }}>
        Current Speed: {speed} km/h
      </Text>
      {speed > 60 && <Text style={{ color: "red", fontSize: 20 }}>⚠ Overspeeding!</Text>}
    </View>
  );
};

export default SpeedMonitor;
