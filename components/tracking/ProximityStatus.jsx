import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { doc, onSnapshot } from 'firebase/firestore';
import { onValue, ref } from 'firebase/database';
import { firestoreDb, realtimeDatabase } from '../../configs/FirebaseConfigs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurView } from 'expo-blur';

const ProximityStatus = ({ isDark }) => {
  const [isOnboard, setIsOnboard] = useState(false);
  const [userEmail, setUserEmail] = useState(null);
  const [routeNumber, setRouteNumber] = useState(null);
  const [distance, setDistance] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Animation values
  const fadeAnim = useState(new Animated.Value(0))[0];
  const scaleAnim = useState(new Animated.Value(0.9))[0];
  
  // Load user data
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const userDataJson = await AsyncStorage.getItem('userData');
        
        if (!userDataJson) {
          console.log('No user data found in AsyncStorage');
          setLoading(false);
          return;
        }
        
        const userData = JSON.parse(userDataJson);
        setUserEmail(userData.email);
        setRouteNumber(userData.routeNumber);
      } catch (error) {
        console.error('Error loading user data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadUserData();
  }, []);
  
  // Listen for onboarding status changes
  useEffect(() => {
    if (!userEmail) return;
    
    const userDocRef = doc(firestoreDb, 'userdata', userEmail);
    const unsubscribe = onSnapshot(userDocRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const data = docSnapshot.data();
        const newOnboardStatus = data.onboarding === true;
        
        // If status changed, animate
        if (newOnboardStatus !== isOnboard) {
          // Reset animations
          fadeAnim.setValue(0);
          scaleAnim.setValue(0.9);
          
          // Start animations
          Animated.parallel([
            Animated.timing(fadeAnim, {
              toValue: 1,
              duration: 500,
              useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
              toValue: 1,
              duration: 500,
              easing: Easing.out(Easing.back(1.5)),
              useNativeDriver: true,
            }),
          ]).start();
        }
        
        setIsOnboard(newOnboardStatus);
      }
    });
    
    return () => unsubscribe();
  }, [userEmail]);
  
  // Calculate distance between user and bus
  useEffect(() => {
    if (!userEmail || !routeNumber) return;
    
    // Get user location from Firestore
    const userDocRef = doc(firestoreDb, 'userdata', userEmail);
    const userLocationListener = onSnapshot(userDocRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const userData = docSnapshot.data();
        const userLocation = userData.lastLocation;
        
        if (!userLocation) return;
        
        // Get bus location from Realtime Database
        const busLocationRef = ref(realtimeDatabase, 'bus/Location');
        const busLocationListener = onValue(busLocationRef, (snapshot) => {
          const busData = snapshot.val();
          
          if (busData && busData.Latitude && busData.Longitude) {
            const busLocation = {
              latitude: parseFloat(busData.Latitude),
              longitude: parseFloat(busData.Longitude),
            };
            
            // Calculate distance
            const dist = calculateDistance(
              userLocation.latitude,
              userLocation.longitude,
              busLocation.latitude,
              busLocation.longitude
            );
            
            setDistance(dist);
          }
        });
        
        return () => busLocationListener();
      }
    });
    
    return () => userLocationListener();
  }, [userEmail, routeNumber]);
  
  // Haversine formula to calculate distance between two coordinates in meters
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  };
  
  // Format distance for display
  const formatDistance = (meters) => {
    if (meters === null) return 'Unknown';
    if (meters < 1000) return `${Math.round(meters)} m`;
    return `${(meters / 1000).toFixed(1)} km`;
  };
  
  // Styles based on theme
  const textColor = isDark ? '#fff' : '#000';
  const secondaryTextColor = isDark ? '#aaa' : '#666';
  const backgroundColor = isDark ? 'rgba(30, 30, 30, 0.7)' : 'rgba(255, 255, 255, 0.7)';
  const cardBackgroundColor = isDark ? '#2a2a2a' : '#fff';
  
  if (loading) {
    return null;
  }
  
  if (!userEmail) {
    return null;
  }
  
  return (
    <View style={styles.container}>
      <BlurView intensity={30} style={[styles.blurContainer, { backgroundColor }]} tint={isDark ? 'dark' : 'light'}>
        <Animated.View 
          style={[
            styles.statusContainer,
            { 
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
              backgroundColor: isOnboard ? 
                (isDark ? 'rgba(76, 175, 80, 0.2)' : 'rgba(76, 175, 80, 0.1)') : 
                (isDark ? 'rgba(244, 67, 54, 0.2)' : 'rgba(244, 67, 54, 0.1)')
            }
          ]}
        >
          <View style={styles.iconContainer}>
            <Ionicons 
              name={isOnboard ? "bus" : "bus-outline"} 
              size={24} 
              color={isOnboard ? '#4CAF50' : '#F44336'} 
            />
          </View>
          
          <View style={styles.textContainer}>
            <Text style={[styles.statusText, { color: textColor }]}>
              {isOnboard ? 'Currently on Bus' : 'Not on Bus'}
            </Text>
            
            {distance !== null && (
              <Text style={[styles.distanceText, { color: secondaryTextColor }]}>
                Distance to bus: {formatDistance(distance)}
              </Text>
            )}
          </View>
        </Animated.View>
      </BlurView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  blurContainer: {
    padding: 12,
    borderRadius: 12,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
  },
  iconContainer: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  statusText: {
    fontSize: 16,
    fontFamily: 'flux-bold',
    marginBottom: 4,
  },
  distanceText: {
    fontSize: 14,
    fontFamily: 'flux',
  },
});

export default ProximityStatus;