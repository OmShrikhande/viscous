import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { ref, onValue } from "firebase/database";
import { collection, getDocs, doc, updateDoc, Timestamp } from "firebase/firestore";
import { realtimeDatabase, firestoreDb } from "../../configs/FirebaseConfigs";
import { Colors } from "../../constants/Colors";

const LocationChecker = () => {
  const [currentLocation, setCurrentLocation] = useState(null);
  const [statusMessage, setStatusMessage] = useState("Fetching location data...");
  const [firestoreLocations, setFirestoreLocations] = useState([]);

  // Function to normalize Firebase data keys
  const normalizeKeys = (data) => {
    if (!data) return null;
    return {
      latitude: parseFloat(data.Latitude || data.latitude),
      longitude: parseFloat(data.Longitude || data.longitude),
      timestamp: data.Timestamp || data.timestamp, // Preserve timestamp
    };
  };

  // Convert degrees to radians
  const toRadians = (degrees) => (degrees * Math.PI) / 180;

  // Haversine formula to calculate distance between two lat/lng points
  const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Radius of Earth in meters
    const φ1 = toRadians(lat1);
    const φ2 = toRadians(lat2);
    const Δφ = toRadians(lat2 - lat1);
    const Δλ = toRadians(lon2 - lon1);

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  };

  // Check if two locations are within 60 meters
  const isInRange = (rtLocation, fsLocation) => {
    if (!rtLocation || !fsLocation) return false;
    return getDistance(rtLocation.latitude, rtLocation.longitude, fsLocation.latitude, fsLocation.longitude) <= 60;
  };

  // Convert Firestore timestamp to 12-hour format
  const convertTo12HourFormat = (timestamp) => {
    if (!timestamp) return "Unknown time";

    let date;
    if (timestamp instanceof Timestamp) {
      date = timestamp.toDate();
    } else {
      date = new Date(timestamp);
    }

    if (isNaN(date.getTime())) return "Invalid time"; // Handle errors

    let hours = date.getHours();
    let minutes = date.getMinutes();
    const period = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;

    return `${hours}:${minutes.toString().padStart(2, "0")} ${period}`;
  };

  // Fetch locations from Firestore
  const fetchFirestoreLocations = async () => {
    try {
      const locationsCollection = collection(firestoreDb, "Locations");
      const querySnapshot = await getDocs(locationsCollection);

      const locations = querySnapshot.docs.map((doc) => ({
        ...normalizeKeys(doc.data()),
        documentName: doc.id,
        reached: doc.data().reached,
      }));

      setFirestoreLocations(locations);
    } catch (error) {
      console.error("Error fetching Firestore data:", error);
    }
  };

  // Update Firestore reached status
  const updateFirestoreStatus = async (locationName) => {
    try {
      const locationRef = doc(firestoreDb, "Locations", locationName);
      await updateDoc(locationRef, { reached: true }); // Only mark as reached
    } catch (error) {
      console.error("Error updating Firestore status:", error);
    }
  };

  // Fetch Firestore locations once when the component mounts
  useEffect(() => {
    fetchFirestoreLocations();
  }, []);

  // Listen to Realtime Database and compare with Firestore data
  useEffect(() => {
    if (firestoreLocations.length === 0) return; // Ensure Firestore data is available

    const databaseReference = ref(realtimeDatabase, "bus/Location");

    const unsubscribe = onValue(databaseReference, (snapshot) => {
      if (snapshot.exists()) {
        const locationData = normalizeKeys(snapshot.val());
        setCurrentLocation(locationData);

        let matchedLocation = null;
        let matchedTimestamp = null;
        let mostRecentLocation = null;
        let mostRecentTimestamp = null;

        firestoreLocations.forEach((fsLocation) => {
          if (isInRange(locationData, fsLocation) && !fsLocation.reached) {
            matchedLocation = fsLocation.documentName;
            matchedTimestamp = fsLocation.timestamp;
          }

          if (!mostRecentTimestamp || new Date(fsLocation.timestamp) > new Date(mostRecentTimestamp)) {
            mostRecentLocation = fsLocation.documentName;
            mostRecentTimestamp = fsLocation.timestamp;
          }
        });

        if (matchedLocation) {
          updateFirestoreStatus(matchedLocation).then(() => {
            const formattedTime = convertTo12HourFormat(matchedTimestamp);
            setStatusMessage(`✅ The bus has reached: ${matchedLocation} at ${formattedTime}`);
          });
        } else {
          const formattedTime = convertTo12HourFormat(mostRecentTimestamp);
          setStatusMessage(`📍 Last recorded location: ${mostRecentLocation} at ${formattedTime}`);
        }
      } else {
        setStatusMessage("⚠️ Realtime location data is not available.");
      }
    });

    return () => unsubscribe();
  }, [firestoreLocations]);

  return (
    <View style={styles.container}>
      <Text style={styles.text}>{statusMessage}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 100,
    padding: 20,
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "black",
    backgroundColor: Colors.WHITE,
    margin: 20,
  },
  text: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.BORDER,
    textAlign: "center",
  },
});

export default LocationChecker;
