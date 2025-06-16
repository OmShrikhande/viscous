import React, { useState, useEffect, useRef } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Alert, 
  Platform, 
  TouchableOpacity, 
  Animated,
  ActivityIndicator
} from "react-native";
import { ref, onValue } from "firebase/database";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { realtimeDatabase, firestoreDb } from "../../configs/FirebaseConfigs";
import { Colors } from "../../constants/Colors";
import { MaterialIcons, Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { 
  initializeNotifications, 
  sendLocalNotification 
} from "../../utils/notificationHelper";

const VerticalStopsComponent = () => {
  const [stops, setStops] = useState([]);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedStop, setExpandedStop] = useState(null);
  
  // Animation references
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    // Start fade-in animation when component mounts
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      })
    ]).start();

    // Initialize notifications using our helper
    initializeNotifications(__DEV__);
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
        animValue: new Animated.Value(0), // Animation value for each stop
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

              // Animate the newly reached stop
              Animated.sequence([
                Animated.timing(stop.animValue, {
                  toValue: 1,
                  duration: 300,
                  useNativeDriver: true,
                }),
                Animated.timing(stop.animValue, {
                  toValue: 0.5,
                  duration: 200,
                  useNativeDriver: true,
                }),
                Animated.timing(stop.animValue, {
                  toValue: 1,
                  duration: 200,
                  useNativeDriver: true,
                }),
              ]).start();

              Alert.alert("✅ The bus has reached:", `${stop.documentName} at ${formattedTime}`);
              sendLocalNotification("Bus Arrival", `The bus has reached ${stop.documentName} at ${formattedTime}`);

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

  const toggleExpandStop = (stopName) => {
    setExpandedStop(expandedStop === stopName ? null : stopName);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.PRIMARY} />
        <Text style={styles.loadingText}>Loading bus stops...</Text>
      </View>
    );
  }

  // Find the next stop (first unreached stop after the last reached one)
  const lastReachedIndex = [...stops].reverse().findIndex(stop => stop.reached);
  const nextStopIndex = lastReachedIndex !== -1 
    ? stops.length - 1 - lastReachedIndex 
    : 0;

  return (
    <Animated.View 
      style={[
        styles.mainContainer,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
      ]}
    >
      {/* Timeline Summary */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryItem}>
          <View style={[styles.summaryIcon, { backgroundColor: 'rgba(40, 167, 69, 0.1)' }]}>
            <MaterialIcons name="check-circle" size={20} color={Colors.SUCCESS} />
          </View>
          <View>
            <Text style={styles.summaryLabel}>Completed</Text>
            <Text style={styles.summaryValue}>
              {stops.filter(stop => stop.reached).length} stops
            </Text>
          </View>
        </View>
        
        <View style={styles.summaryItem}>
          <View style={[styles.summaryIcon, { backgroundColor: 'rgba(255, 193, 7, 0.1)' }]}>
            <MaterialIcons name="directions-bus" size={20} color={Colors.WARNING} />
          </View>
          <View>
            <Text style={styles.summaryLabel}>Next Stop</Text>
            <Text style={styles.summaryValue} numberOfLines={1}>
              {nextStopIndex < stops.length ? stops[nextStopIndex].documentName : 'N/A'}
            </Text>
          </View>
        </View>
        
        <View style={styles.summaryItem}>
          <View style={[styles.summaryIcon, { backgroundColor: 'rgba(108, 117, 125, 0.1)' }]}>
            <MaterialIcons name="schedule" size={20} color={Colors.GREY} />
          </View>
          <View>
            <Text style={styles.summaryLabel}>Remaining</Text>
            <Text style={styles.summaryValue}>
              {stops.filter(stop => !stop.reached).length} stops
            </Text>
          </View>
        </View>
      </View>

      {/* Timeline */}
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.timeline}>
          {stops.map((stop, index) => {
            // Determine the stop's status
            let dotStyle, textStyle, iconName;
            
            if (stop.reached) {
              dotStyle = styles.dotReached;
              textStyle = styles.textReached;
              iconName = "check-circle";
            } else if (index > 0 && stops[index - 1].reached) {
              dotStyle = styles.dotNext;
              textStyle = styles.textNext;
              iconName = "directions-bus";
            } else {
              dotStyle = styles.dotNotReached;
              textStyle = styles.textNotReached;
              iconName = "radio-button-unchecked";
            }

            // Animation for the dot
            const dotScale = stop.animValue ? stop.animValue.interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: [1, 1.3, 1],
            }) : 1;

            const isExpanded = expandedStop === stop.documentName;

            return (
              <Animated.View 
                key={stop.documentName} 
                style={[
                  styles.stopContainer,
                  { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
                ]}
              >
                {/* Odd stops on the left */}
                {index % 2 === 0 && (
                  <TouchableOpacity 
                    style={[styles.stopDetailsLeft, isExpanded && styles.expandedStop]}
                    onPress={() => toggleExpandStop(stop.documentName)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.stopCard}>
                      <Text style={[styles.stopName, textStyle]} numberOfLines={isExpanded ? 10 : 1}>
                        {stop.documentName}
                      </Text>
                      {stop.reached && (
                        <View style={styles.reachedInfo}>
                          <MaterialIcons name="access-time" size={14} color={Colors.SUCCESS} />
                          <Text style={styles.reachedTimeText}>{stop.reachedTime}</Text>
                        </View>
                      )}
                      {!stop.reached && (
                        <Text style={styles.pendingText}>
                          {index > 0 && stops[index - 1].reached ? "Next stop" : "Pending"}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                )}

                {/* Central line with dot */}
                <View style={styles.centralLine}>
                  <View style={[
                    styles.verticalLine,
                    index === 0 && styles.firstVerticalLine,
                    index === stops.length - 1 && styles.lastVerticalLine
                  ]} />
                  
                  <Animated.View 
                    style={[
                      styles.dot, 
                      dotStyle,
                      { transform: [{ scale: dotScale }] }
                    ]}
                  >
                    <MaterialIcons name={iconName} size={16} color="#fff" />
                  </Animated.View>
                  
                  {stop.reached && (
                    <View style={styles.timeIndicator}>
                      <Text style={styles.timeText}>{stop.reachedTime}</Text>
                    </View>
                  )}
                </View>

                {/* Even stops on the right */}
                {index % 2 !== 0 && (
                  <TouchableOpacity 
                    style={[styles.stopDetailsRight, isExpanded && styles.expandedStop]}
                    onPress={() => toggleExpandStop(stop.documentName)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.stopCard}>
                      <Text style={[styles.stopName, textStyle]} numberOfLines={isExpanded ? 10 : 1}>
                        {stop.documentName}
                      </Text>
                      {stop.reached && (
                        <View style={styles.reachedInfo}>
                          <MaterialIcons name="access-time" size={14} color={Colors.SUCCESS} />
                          <Text style={styles.reachedTimeText}>{stop.reachedTime}</Text>
                        </View>
                      )}
                      {!stop.reached && (
                        <Text style={styles.pendingText}>
                          {index > 0 && stops[index - 1].reached ? "Next stop" : "Pending"}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                )}
              </Animated.View>
            );
          })}
        </View>
      </ScrollView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
  },
  container: {
    paddingVertical: 10,
    backgroundColor: Colors.WHITE,
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Colors.WHITE,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  summaryLabel: {
    fontSize: 12,
    color: Colors.GREY,
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.DARK,
    maxWidth: 90,
  },
  timeline: {
    flexDirection: "column",
    alignItems: "center",
    position: "relative",
  },
  stopContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 12,
    width: "100%",
  },
  stopDetailsLeft: {
    flex: 1,
    alignItems: "flex-end",
    paddingRight: 12,
  },
  stopDetailsRight: {
    flex: 1,
    alignItems: "flex-start",
    paddingLeft: 12,
  },
  expandedStop: {
    // Styles for expanded stop
  },
  stopCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 12,
    maxWidth: '95%',
    minWidth: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  stopName: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  reachedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reachedTimeText: {
    fontSize: 12,
    color: Colors.SUCCESS,
    marginLeft: 4,
    fontWeight: '500',
  },
  pendingText: {
    fontSize: 12,
    color: Colors.GREY,
    fontStyle: 'italic',
  },
  centralLine: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    width: 40,
  },
  verticalLine: {
    position: "absolute",
    width: 2,
    height: "200%",
    backgroundColor: Colors.LIGHT_GREY,
    zIndex: -1,
  },
  firstVerticalLine: {
    top: '50%',
    height: '100%',
  },
  lastVerticalLine: {
    bottom: '50%',
    height: '100%',
  },
  dot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 8,
    zIndex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  dotReached: {
    backgroundColor: Colors.SUCCESS,
  },
  dotNotReached: {
    backgroundColor: Colors.GREY,
  },
  dotNext: {
    backgroundColor: Colors.WARNING,
  },
  timeIndicator: {
    backgroundColor: 'rgba(40, 167, 69, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 4,
  },
  timeText: {
    fontSize: 10,
    color: Colors.SUCCESS,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.GREY,
    marginTop: 12,
  },
  textReached: {
    color: Colors.SUCCESS,
  },
  textNotReached: {
    color: Colors.DARK,
  },
  textNext: {
    color: Colors.WARNING,
  },
  textPrevious: {
    color: Colors.LIGHT_GREY,
  },
});

export default VerticalStopsComponent;
