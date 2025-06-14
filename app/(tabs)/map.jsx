import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Alert,
} from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import { firestoreDb, realtimeDatabase } from "../../configs/FirebaseConfigs";
import { doc, getDocs, collection } from "firebase/firestore";
import { ref, onValue, set } from "firebase/database";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function Explore() {
  const [busLocation, setBusLocation] = useState({
    latitude: 21.1496,
    longitude: 79.0807,
  });
  const [busDirection, setBusDirection] = useState(0);
  const [prevBusDirection, setPrevBusDirection] = useState(0);
  const [busStops, setBusStops] = useState([]);
  const [speed, setSpeed] = useState("--");
  const [dailyDistance, setDailyDistance] = useState("--");
  const [totalDistance, setTotalDistance] = useState("--");
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const mapRef = useRef(null);

  useEffect(() => {
    fetchBusStops();
    trackLiveLocation();
    loadStoredCoordinates();
  }, []);

  const fetchBusStops = async () => {
    try {
      const querySnapshot = await getDocs(collection(firestoreDb, "Locations"));
      const stops = [];
      querySnapshot.forEach((doc) => {
        const { Latitude, Longitude } = doc.data();
        if (Latitude && Longitude) {
          stops.push({
            latitude: parseFloat(Latitude),
            longitude: parseFloat(Longitude),
            name: doc.id,
          });
        }
      });
      setBusStops(stops);
    } catch (error) {
      console.error("Error fetching bus stops:", error);
    }
  };

  const calculateSmoothRotation = (prevDirection, newDirection) => {
    const diff = newDirection - prevDirection;
    if (Math.abs(diff) > 180) {
      if (diff > 0) {
        return prevDirection + (diff - 360) * 0.1;
      } else {
        return prevDirection + (diff + 360) * 0.1;
      }
    }
    return prevDirection + diff * 0.1;
  };

  const trackLiveLocation = () => {
    const busRef = ref(realtimeDatabase, "bus");
    onValue(busRef, (snapshot) => {
      const data = snapshot.val();
      if (data?.Location) {
        const { Latitude, Longitude, Speed } = data.Location;
        const newLocation = { latitude: Latitude, longitude: Longitude };

        setBusDirection((prevDirection) => {
          const dx = Longitude - busLocation.longitude;
          const dy = Latitude - busLocation.latitude;
          const newDirection = (Math.atan2(dy, dx) * 180) / Math.PI;
          const smoothDirection = calculateSmoothRotation(prevDirection, newDirection);
          setPrevBusDirection(prevDirection);
          return smoothDirection;
        });

        setBusLocation(newLocation);
        setSpeed(Speed ? Speed.toFixed(2) : "--");
        setDailyDistance(data.Distance?.DailyDistance?.toFixed(2) || "--");
        setTotalDistance(data.Distance?.TotalDistance?.toFixed(2) || "--");
        snapToRoads(newLocation);
      }
    });
  };

  const loadStoredCoordinates = async () => {
    try {
      const storedCoordinates = await AsyncStorage.getItem("routeCoordinates");
      if (storedCoordinates) {
        setRouteCoordinates(JSON.parse(storedCoordinates));
        console.log("Loaded stored coordinates:", JSON.parse(storedCoordinates));
      }
    } catch (error) {
      console.error("Error loading stored coordinates:", error);
    }
  };

  const saveCoordinates = async (coordinates) => {
    try {
      await AsyncStorage.setItem("routeCoordinates", JSON.stringify(coordinates));
      console.log("Saved coordinates:", coordinates);
    } catch (error) {
      console.error("Error saving coordinates:", error);
    }
  };

  const resetRouteIfNearTarget = (location) => {
    if (isNearTarget(location)) {
      console.log("Resetting route as the location is near the target.");
      setRouteCoordinates([]);
      saveCoordinates([]);
    }
  };

  const highlightRouteFromStoredCoordinates = () => {
    if (routeCoordinates.length < 2) {
      console.log("Not enough coordinates to highlight a route.");
      return;
    }
  };

  const snapToRoads = async (location) => {
    try {
      const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
      const response = await fetch(
        `https://roads.googleapis.com/v1/snapToRoads?path=${location.latitude},${location.longitude}&interpolate=true&key=${apiKey}`
      );
      if (!response.ok) {
        throw new Error(`Roads API error: ${response.statusText}`);
      }
      const data = await response.json();
      if (data.snappedPoints && data.snappedPoints.length > 0) {
        const snappedLocation = {
          latitude: data.snappedPoints[0].location.latitude,
          longitude: data.snappedPoints[0].location.longitude,
        };
        resetRouteIfNearTarget(snappedLocation);
        setRouteCoordinates((prev) => {
          const updatedCoordinates = [...prev, snappedLocation];
          saveCoordinates(updatedCoordinates);
          return updatedCoordinates;
        });
        highlightRouteFromStoredCoordinates();
      } else {
        console.log("No snapped points returned from Roads API.");
      }
    } catch (error) {
      console.error("Error calling Roads API:", error);
    }
  };

  const isNearTarget = (location) => {
    const target = { latitude: 21.1500, longitude: 79.0800 };
    const distance = Math.sqrt(
      Math.pow(location.latitude - target.latitude, 2) +
      Math.pow(location.longitude - target.longitude, 2)
    );
    return distance < 0.001;
  };

  const resetTotalDistance = () => {
    const distanceRef = ref(realtimeDatabase, "bus/Distance/TotalDistance");
    set(distanceRef, 0)
      .then(() => {
        Alert.alert("Success", "Total distance reset successfully.");
        setTotalDistance("0.00");
      })
      .catch((error) => {
        console.error("Error resetting total distance:", error);
      });
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: busLocation.latitude,
          longitude: busLocation.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
      >
        <Marker
          coordinate={busLocation}
          title="Bus Location"
          rotation={busDirection}
          anchor={{ x: 0.5, y: 0.5 }}
          flat={true}
        >
          <Ionicons name="arrow-forward-circle" size={30} color="blue" />
        </Marker>
        {busStops.map((stop, index) => (
          <Marker
            key={index}
            coordinate={{ latitude: stop.latitude, longitude: stop.longitude }}
            title={stop.name}
          />
        ))}
        <Polyline coordinates={routeCoordinates} strokeColor="blue" strokeWidth={4} />
      </MapView>
      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>Speed: {speed} km/h</Text>
        <Text style={styles.infoText}>Daily Distance: {dailyDistance} km</Text>
        <Text style={styles.infoText}>Total Distance: {totalDistance} km</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() =>
            mapRef.current.animateToRegion({
              ...busLocation,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            })
          }
        >
          <Text style={styles.buttonText}>Focus on Bus</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.resetButton]}
          onPress={resetTotalDistance}
        >
          <Text style={styles.buttonText}>Reset Total Distance</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: {
    width: Dimensions.get("window").width,
    height: Dimensions.get("window").height,
  },
  infoContainer: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    borderRadius: 10,
    padding: 15,
  },
  infoText: {
    color: "white",
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 10,
  },
  button: {
    backgroundColor: "blue",
    padding: 10,
    borderRadius: 5,
    alignItems: "center",
    marginBottom: 10,
  },
  resetButton: { backgroundColor: "red" },
  buttonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "bold",
  },
});
