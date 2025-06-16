import { Text, StyleSheet, View, Image, TouchableOpacity, Animated } from 'react-native'
import React, { useEffect, useRef } from 'react'
import { useUser } from '@clerk/clerk-expo'
import { Colors } from '../../constants/Colors'
import { Ionicons, MaterialIcons } from '@expo/vector-icons'
import { BlurView } from 'expo-blur'

export default function Header() {
  const { user } = useUser();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-20)).current;

  useEffect(() => {
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
  }, []);

  const currentTime = new Date();
  const hours = currentTime.getHours();
  
  let greeting = "Good Morning";
  if (hours >= 12 && hours < 17) {
    greeting = "Good Afternoon";
  } else if (hours >= 17) {
    greeting = "Good Evening";
  }

  return (
    <View style={styles.headerContainer}>
      <Animated.View 
        style={[
          styles.headerContent,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
        ]}
      >
        {/* User Info Section */}
        <View style={styles.userInfoContainer}>
          <View style={styles.userDetails}>
            <Text style={styles.greeting}>{greeting},</Text>
            <Text style={styles.userName}>{user?.fullName}</Text>
          </View>
          
          <View style={styles.profileImageContainer}>
            <Image 
              source={{ uri: user?.imageUrl }} 
              style={styles.profileImage}
            />
            <View style={styles.onlineIndicator} />
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsContainer}>
          <TouchableOpacity style={styles.actionButton}>
            <View style={styles.actionIconContainer}>
              <Ionicons name="notifications-outline" size={22} color={Colors.PRIMARY} />
            </View>
            <Text style={styles.actionText}>Alerts</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton}>
            <View style={styles.actionIconContainer}>
              <MaterialIcons name="location-on" size={22} color={Colors.PRIMARY} />
            </View>
            <Text style={styles.actionText}>Locations</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton}>
            <View style={styles.actionIconContainer}>
              <Ionicons name="time-outline" size={22} color={Colors.PRIMARY} />
            </View>
            <Text style={styles.actionText}>Schedule</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: Colors.PRIMARY,
    paddingTop: 50,
    paddingBottom: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  headerContent: {
    paddingHorizontal: 20,
  },
  userInfoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  userDetails: {
    flex: 1,
  },
  greeting: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    marginBottom: 4,
  },
  userName: {
    color: Colors.WHITE,
    fontSize: 24,
    fontWeight: 'bold',
  },
  profileImageContainer: {
    position: 'relative',
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: Colors.WHITE,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.SUCCESS,
    borderWidth: 2,
    borderColor: Colors.PRIMARY,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 12,
  },
  actionButton: {
    alignItems: 'center',
    flex: 1,
  },
  actionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  actionText: {
    color: Colors.WHITE,
    fontSize: 12,
    fontWeight: '500',
  },
});