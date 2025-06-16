import { useUser } from '@clerk/clerk-expo'
import { Ionicons, MaterialIcons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useEffect, useRef, useState } from 'react'
import { Animated, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Colors } from '../../constants/Colors'
import AlertsScreen from './AlertsScreen'
import LocationsScreen from './LocationsScreen'
import ScheduleScreen from './ScheduleScreen'

export default function Header({ isDark = false }) {
  const { user } = useUser();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-20)).current;
  
  // Modal visibility states
  const [alertsVisible, setAlertsVisible] = useState(false);
  const [locationsVisible, setLocationsVisible] = useState(false);
  const [scheduleVisible, setScheduleVisible] = useState(false);

  useEffect(() => {
    // Use a small delay to avoid conflict with layout animations
    const animationTimeout = setTimeout(() => {
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
    }, 100);
    
    return () => clearTimeout(animationTimeout);
  }, []);

  const currentTime = new Date();
  const hours = currentTime.getHours();
  
  let greeting = "Good Morning";
  if (hours >= 12 && hours < 17) {
    greeting = "Good Afternoon";
  } else if (hours >= 17) {
    greeting = "Good Evening";
  }

  // Define gradient colors based on theme
  const gradientColors = isDark 
    ? ['#1a1a2e', '#16213e', '#0f3460'] 
    : [Colors.PRIMARY, '#0a5a8f', '#064273'];

  return (
    <>
      <LinearGradient 
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerContainer}
      >
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
          <View style={[
            styles.quickActionsContainer,
            isDark && styles.quickActionsContainerDark
          ]}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => setAlertsVisible(true)}
              activeOpacity={0.7}
            >
              <View style={[
                styles.actionIconContainer,
                isDark && styles.actionIconContainerDark
              ]}>
                <Ionicons 
                  name="notifications-outline" 
                  size={22} 
                  color={isDark ? Colors.LIGHT : Colors.PRIMARY} 
                />
              </View>
              <Text style={styles.actionText}>Alerts</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => setLocationsVisible(true)}
              activeOpacity={0.7}
            >
              <View style={[
                styles.actionIconContainer,
                isDark && styles.actionIconContainerDark
              ]}>
                <MaterialIcons 
                  name="location-on" 
                  size={22} 
                  color={isDark ? Colors.LIGHT : Colors.PRIMARY} 
                />
              </View>
              <Text style={styles.actionText}>Locations</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => setScheduleVisible(true)}
              activeOpacity={0.7}
            >
              <View style={[
                styles.actionIconContainer,
                isDark && styles.actionIconContainerDark
              ]}>
                <Ionicons 
                  name="time-outline" 
                  size={22} 
                  color={isDark ? Colors.LIGHT : Colors.PRIMARY} 
                />
              </View>
              <Text style={styles.actionText}>Schedule</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </LinearGradient>

      {/* Modals for each action */}
      <AlertsScreen 
        visible={alertsVisible} 
        onClose={() => setAlertsVisible(false)} 
        isDark={isDark} 
      />
      
      <LocationsScreen 
        visible={locationsVisible} 
        onClose={() => setLocationsVisible(false)} 
        isDark={isDark} 
      />
      
      <ScheduleScreen 
        visible={scheduleVisible} 
        onClose={() => setScheduleVisible(false)} 
        isDark={isDark} 
      />
    </>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
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
  quickActionsContainerDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
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
  actionIconContainerDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  actionText: {
    color: Colors.WHITE,
    fontSize: 12,
    fontWeight: '500',
  },
});