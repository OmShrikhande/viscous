import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, Alert, Platform } from "react-native";
import { ref, onValue } from "firebase/database";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore"; // Import Firestore methods
import { realtimeDatabase, firestoreDb } from "../../configs/FirebaseConfigs";
import { Colors } from "../../constants/Colors";
import { MaterialIcons } from "@expo/vector-icons";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import * as Linking from "expo-linking";

// Configure notification behavior when received
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,  // Ensures sound plays
    shouldSetBadge: true,
  }),
});

// ✅ Request Notification Permissions
const requestPermissions = async () => {
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

  // Get and log the push token
  const { data: pushToken } = await Notifications.getExpoPushTokenAsync();
  console.log("Expo Push Token:", pushToken);

  return true;
};

// ✅ Send Notification
const sendNotification = async (title, body) => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: "default", // Ensure sound plays
    },
    trigger: null, // Send immediately
  });
};

const VerticalStopsComponent = () => {
  const [stops, setStops] = useState([]);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const setupNotifications = async () => {
      const hasPermission = await requestPermissions();
      if (hasPermission) {
        sendNotification("Test Notification", "This is a test notification.");
      }
    };

    setupNotifications();
  }, []);

  // ✅ Normalize GPS data keys
  const normalizeKeys = (data) => {
    if (!data) return null;
    return {
      latitude: parseFloat(data.Latitude || data.latitude),
      longitude: parseFloat(data.Longitude || data.longitude),
    };
  };

  // ✅ Check if the bus is within range
  const isInRange = (rtLocation, fsLocation, range = 0.001) => {
    if (!rtLocation || !fsLocation) return false;
    const latDiff = Math.abs(rtLocation.latitude - fsLocation.latitude);
    const lngDiff = Math.abs(rtLocation.longitude - fsLocation.longitude);
    return latDiff <= range && lngDiff <= range;
  };

  // ✅ Fetch bus stops from Firestore
  const fetchFirestoreLocations = async () => {
    try {
      const locationsCollection = collection(firestoreDb, "Locations");
      const querySnapshot = await getDocs(locationsCollection);

      const fetchedStops = querySnapshot.docs.map((doc) => ({
        ...normalizeKeys(doc.data()),
        documentName: doc.id,
        serialNumber: doc.data().serialNumber,
        reached: false,
        lastNotified: null,
        reachedTime: null,
      }));

      // Sort stops based on serialNumber
      const sortedStops = fetchedStops.sort((a, b) => {
        const srA = parseInt(a.serialNumber, 10) || Infinity;
        const srB = parseInt(b.serialNumber, 10) || Infinity;
        return srA - srB;
      });

      setStops(sortedStops);
      setLoading(false);
    } catch (error) {
      console.error("❌ Error fetching Firestore data:", error);
    }
  };

  useEffect(() => {
    fetchFirestoreLocations();

    const databaseReference = ref(realtimeDatabase, "bus/Location");

    const unsubscribe = onValue(databaseReference, (snapshot) => {
      if (snapshot.exists()) {
        const location = normalizeKeys(snapshot.val());
        setCurrentLocation(location);

        const now = Date.now();

        setStops((prevStops) =>
          prevStops.map((stop) => {
            const reached = isInRange(location, stop);
            const shouldNotify =
              reached &&
              (!stop.lastNotified || now - stop.lastNotified >= 10 * 60 * 1000);

            if (shouldNotify) {
              const currentTime = new Date();
              const formattedTime = currentTime.toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              });

              // Update the time field in Firestore
              const stopDocRef = doc(firestoreDb, "Locations", stop.documentName);
              updateDoc(stopDocRef, { time: formattedTime }).catch((error) =>
                console.error("❌ Error updating Firestore:", error)
              );

              Alert.alert("✅ The bus has reached:", `${stop.documentName} at ${formattedTime}`);
              sendNotification("Bus Arrival", `The bus has reached ${stop.documentName} at ${formattedTime}`);

              return {
                ...stop,
                reached: true,
                lastNotified: now,
                reachedTime: formattedTime,
              };
            }

            return {
              ...stop,
              reached,
              reachedTime: reached ? stop.reachedTime : null,
            };
          })
        );
      }
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading stops...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.timeline}>
        {stops.map((stop, index) => {
          // Determine the stop's text color
          let textStyle = styles.textNotReached;
          if (stop.reached) {
            textStyle = styles.textReached; // Green for reached stop
          } else if (index > 0 && stops[index - 1].reached) {
            textStyle = styles.textNext; // Yellow for the next stop
          } else if (index < stops.findIndex((s) => s.reached)) {
            textStyle = styles.textPrevious; // Grey for previous stops
          }

          return (
            <View key={stop.documentName} style={styles.stopContainer}>
              {/* Odd stops on the left */}
              {index % 2 === 0 && (
                <View style={styles.stopDetailsLeft}>
                  <Text style={[styles.stopText, textStyle]} numberOfLines={2} ellipsizeMode="tail">
                    {stop.documentName}
                    {stop.reached ? `\n(reached at ${stop.reachedTime})` : "\n(not reached)"}
                  </Text>
                </View>
              )}

              {/* Central line with dot */}
              <View style={styles.centralLine}>
                <View style={styles.verticalLine} />
                <View style={styles.dot} />
                {stop.reached && (
                  <Text style={styles.timeText}>{stop.reachedTime}</Text>
                )}
              </View>

              {/* Even stops on the right */}
              {index % 2 !== 0 && (
                <View style={styles.stopDetailsRight}>
                  <Text style={[styles.stopText, textStyle]} numberOfLines={2} ellipsizeMode="tail">
                    {stop.documentName}
                    {stop.reached ? `\n(reached at ${stop.reachedTime})` : "\n(not reached)"}
                  </Text>
                </View>
              )}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 20,
    backgroundColor: Colors.WHITE,
  },
  timeline: {
    flexDirection: "column",
    alignItems: "center",
    position: "relative",
  },
  stopContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
    width: "100%",
  },
  stopDetailsLeft: {
    flex: 1,
    alignItems: "flex-end",
    paddingRight: 10,
  },
  stopDetailsRight: {
    flex: 1,
    alignItems: "flex-start",
    paddingLeft: 10,
  },
  centralLine: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  verticalLine: {
    position: "absolute",
    width: 2,
    height: "100%",
    backgroundColor: Colors.GREY, // Line color
    zIndex: -1,
  },
  dot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginBottom: 5,
    zIndex: 1,
  },
  dotReached: {
    backgroundColor: Colors.SUCCESS, // Green for reached stop
  },
  dotNotReached: {
    backgroundColor: Colors.GREY, // Default grey for not reached stops
  },
  dotNext: {
    backgroundColor: Colors.WARNING, // Yellow for the next stop
  },
  dotPrevious: {
    backgroundColor: Colors.LIGHT_GREY, // Grey for stops behind the reached stop
  },
  timeText: {
    fontSize: 12,
    color: Colors.DARK,
    marginTop: 5,
  },
  stopText: {
    fontSize: 16,
    color: Colors.DARK,
    textAlign: "center",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 18,
    color: Colors.GREY,
  },
  textReached: {
    color: Colors.SUCCESS, // Green for reached stop
  },
  textNotReached: {
    color: Colors.DARK, // Default color for not reached stops
  },
  textNext: {
    color: Colors.WARNING, // Yellow for the next stop
  },
  textPrevious: {
    color: Colors.LIGHT_GREY, // Grey for stops behind the reached stop
  },
});

export default VerticalStopsComponent;
