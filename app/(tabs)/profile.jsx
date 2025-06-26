
import { useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurView } from 'expo-blur';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming
} from 'react-native-reanimated';

import BusNotificationsToggle from '../../components/Profile/BusNotificationsToggle';
import EditProfileForm from '../../components/Profile/EditProfileForm';
import MenuList from '../../components/Profile/MenuList';
import SpeedMonitoringToggle from '../../components/Profile/SpeedMonitoringToggle';
import TestNotifications from '../../components/usefulComponent/TestNotifications';
import ThemeToggleSwitch from '../../components/usefulComponent/ThemeToggleSwitch';

export default function Profile() {
  const { user, isLoaded: isUserLoaded } = useUser();
  const [userEmail, setUserEmail] = useState(null);
  const [userName, setUserName] = useState('');
  const [userImage, setUserImage] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [routeNumber, setRouteNumber] = useState('');
  const [busStop, setBusStop] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isDark, setIsDark] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showEditProfile, setShowEditProfile] = useState(false);
  
  // Animation values
  const avatarScale = useSharedValue(0.8);
  const cardOpacity = useSharedValue(0);
  const profileInfoY = useSharedValue(20);
  
  // Load user data from AsyncStorage
  const loadUserData = useCallback(async () => {
    try {
      // Check if Clerk user is loaded
      if (!isUserLoaded) {
        console.log('Waiting for Clerk user to load...');
        return; // Wait for user to load
      }
      
      // Get email from Clerk if available
      const clerkEmail = user?.emailAddresses?.[0]?.emailAddress;
      console.log('🔍 Clerk user email:', clerkEmail);
      
      // Load data from AsyncStorage
      const storedData = await AsyncStorage.getItem('userData');
      console.log('🔍 Loading user data from AsyncStorage');
      
      if (storedData) {
        const parsed = JSON.parse(storedData);
        
        // Use Clerk email if available, otherwise use stored email
        setUserEmail(clerkEmail || parsed.email);
        
        // Use Clerk name if available, otherwise use stored name
        const clerkName = user?.fullName || user?.firstName;
        setUserName(clerkName || parsed.name || 'No Name');
        
        // Use Clerk image if available, otherwise use stored image
        setUserImage(user?.imageUrl || parsed.image || null);
        
        // Set other user data
        setPhoneNumber(parsed.phoneNumber || '');
        setRouteNumber(parsed.routeNumber || '');
        setBusStop(parsed.busStop || '');
        setLastUpdated(parsed.lastUpdated ? new Date(parsed.lastUpdated) : null);
        setIsDark(parsed.isDark);
        
        console.log('✅ User data loaded successfully');
      } else if (clerkEmail) {
        // If no stored data but Clerk user is available, set basic data from Clerk
        setUserEmail(clerkEmail);
        setUserName(user?.fullName || user?.firstName || 'No Name');
        setUserImage(user?.imageUrl || null);
        console.log('✅ Basic user data set from Clerk');
      }
    } catch (err) {
      console.error('❌ Failed to load user data:', err);
      Alert.alert('Error', 'Failed to load your profile data. Please try again.');
    }
    
    setIsLoading(false);
  }, [user, isUserLoaded]);

  useEffect(() => {
    if (isUserLoaded) {
      loadUserData();
    }
  }, [loadUserData, isUserLoaded]);
  
  // Separate useEffect for animations to avoid dependency warnings
  useEffect(() => {
    if (!isLoading) {
      // Start animations after data is loaded
      avatarScale.value = withSpring(1, { damping: 12, stiffness: 100 });
      cardOpacity.value = withTiming(1, { duration: 800 });
      profileInfoY.value = withTiming(0, { duration: 600 });
    }
    
    // Cleanup function to reset animation values when component unmounts
    return () => {
      // Reset animation values to prevent errors during unmount
      avatarScale.value = 1;
      cardOpacity.value = 0;
      profileInfoY.value = 0;
    };
  }, [isLoading, avatarScale, cardOpacity, profileInfoY]);
  
  // Animated styles with safety checks
  const avatarAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: avatarScale.value ?? 1 }],
    };
  });
  
  const cardAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: cardOpacity.value ?? 0,
    };
  });
  
  const profileInfoAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: profileInfoY.value ?? 0 }],
      opacity: cardOpacity.value ?? 0,
    };
  });

  const handleProfileUpdate = (updatedData) => {
    console.log('Profile update received:', updatedData);
    
    // Update state with new data
    setUserName(updatedData.name || '');
    setPhoneNumber(updatedData.phoneNumber || '');
    setRouteNumber(updatedData.routeNumber || '');
    setBusStop(updatedData.busStop || '');
    setLastUpdated(updatedData.lastUpdated ? new Date(updatedData.lastUpdated) : null);
    
    // Show success message
    Alert.alert(
      'Profile Updated',
      `Your profile has been updated successfully. Your bus stop is now set to ${updatedData.busStop}.`,
      [{ text: 'OK' }]
    );
  };

  const themeStyles = isDark ? styles.dark : styles.light;
  const textColor = { color: isDark ? '#fff' : '#000' };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.safeArea, themeStyles]}>
        <Animated.View 
          style={styles.centeredContainer}
          entering={FadeIn.duration(800)}
        >
          <BlurView intensity={50} style={styles.blurContainer} tint={isDark ? 'dark' : 'light'}>
            <ActivityIndicator size="large" color={isDark ? '#fff' : '#000'} />
            <Animated.Text 
              style={[textColor, styles.loadingText]}
              entering={FadeIn.duration(500).delay(300)}
            >
              Loading your profile...
            </Animated.Text>
          </BlurView>
        </Animated.View>
      </SafeAreaView>
    );
  }

  if (!userEmail) {
    return (
      <SafeAreaView style={[styles.safeArea, themeStyles]}>
        <Animated.View 
          style={styles.centeredContainer}
          entering={FadeIn.duration(800)}
        >
          <Animated.Text 
            style={[textColor, styles.notFoundText]}
            entering={FadeIn.duration(500).delay(200)}
          >
            ⚠️ User not found. Please login again.
          </Animated.Text>
          <Animated.View 
            style={styles.menuContainer}
            entering={FadeIn.duration(500).delay(400)}
          >
            <MenuList isDark={isDark} />
          </Animated.View>
        </Animated.View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, themeStyles]}>
      <Animated.FlatList
        data={[1]} // Using a single item to render the content
        keyExtractor={() => "profile-content"}
        renderItem={() => (
          <View style={styles.contentContainer}>
            {/* Profile Card */}
            <Animated.View 
              style={[styles.profileCard, cardAnimatedStyle]}
              entering={FadeIn.duration(500).delay(200)}
            >
              <BlurView 
                intensity={30} 
                style={styles.profileCardBlur} 
                tint={isDark ? 'dark' : 'light'}
              >
                <Animated.Image
                  source={
                    userImage
                      ? { uri: userImage }
                      : require('./../../assets/images/react-logo.png') // placeholder
                  }
                  style={[styles.avatar, avatarAnimatedStyle]}
                />
                <Animated.View style={profileInfoAnimatedStyle}>
                  <Text style={[styles.name, textColor]}>{userName}</Text>
                  <Text style={[styles.email, textColor]}>{userEmail}</Text>
                  
                  <View style={styles.infoGrid}>
                    {phoneNumber && (
                      <View style={styles.infoCard}>
                        <Ionicons name="call-outline" size={18} color={isDark ? '#1E90FF' : '#1E90FF'} />
                        <Text style={[styles.infoLabel, textColor]}>Phone</Text>
                        <Text style={[styles.infoValue, textColor]}>{phoneNumber}</Text>
                      </View>
                    )}
                    
                    {routeNumber && (
                      <View style={styles.infoCard}>
                        <Ionicons name="bus-outline" size={18} color={isDark ? '#1E90FF' : '#1E90FF'} />
                        <Text style={[styles.infoLabel, textColor]}>Route</Text>
                        <Text style={[styles.infoValue, textColor]}>{routeNumber}</Text>
                      </View>
                    )}
                    
                    {busStop && (
                      <View style={styles.infoCard}>
                        <Ionicons name="location-outline" size={18} color={isDark ? '#1E90FF' : '#1E90FF'} />
                        <Text style={[styles.infoLabel, textColor]}>Bus Stop</Text>
                        <Text style={[styles.infoValue, textColor]}>{busStop}</Text>
                      </View>
                    )}
                  </View>
                  
                  {lastUpdated && (
                    <Text style={[styles.lastUpdated, { color: isDark ? '#aaa' : '#888' }]}>
                      Last updated: {lastUpdated.toLocaleDateString()}
                    </Text>
                  )}
                  
                  <TouchableOpacity
                    style={[styles.editButton, { backgroundColor: isDark ? '#1E90FF' : '#1E90FF' }]}
                    onPress={() => setShowEditProfile(true)}
                  >
                    <Ionicons name="create-outline" size={16} color="#fff" style={styles.buttonIcon} />
                    <Text style={styles.editButtonText}>Edit Profile</Text>
                  </TouchableOpacity>
                </Animated.View>
              </BlurView>
            </Animated.View>

            {/* Divider */}
            <Animated.View 
              style={[styles.divider, { backgroundColor: isDark ? '#444' : '#ccc' }]}
              entering={FadeIn.duration(500).delay(400)}
            />

            {/* Settings Section */}
            <Animated.View 
              style={styles.sectionContainer}
              entering={FadeIn.duration(500).delay(500)}
            >
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleContainer}>
                  <Ionicons name="settings-outline" size={22} color={isDark ? '#1E90FF' : '#1E90FF'} />
                  <Text style={[styles.sectionTitle, textColor]}>Settings</Text>
                </View>
              </View>

              <View style={styles.settingsCardContainer}>
                {/* Theme Toggle */}
                <Animated.View
                  entering={FadeIn.duration(500).delay(600)}
                  style={styles.settingItem}
                >
                  <ThemeToggleSwitch
                    currentValue={isDark}
                    userEmail={userEmail}
                    onToggle={(newVal) => setIsDark(newVal)}
                  />
                </Animated.View>
                
                {/* Bus Notifications Toggle */}
                <Animated.View
                  entering={FadeIn.duration(500).delay(700)}
                  style={styles.settingItem}
                >
                  <BusNotificationsToggle
                    isDark={isDark}
                    userEmail={userEmail}
                  />
                </Animated.View>

                {/* Speed Monitoring Toggle */}
                <Animated.View
                  entering={FadeIn.duration(500).delay(750)}
                  style={styles.settingItem}
                >
                  <SpeedMonitoringToggle
                    isDark={isDark}
                    userEmail={userEmail}
                  />
                </Animated.View>
              </View>
            </Animated.View>

            {/* Menu Section */}
            <Animated.View 
              style={styles.sectionContainer}
              entering={FadeIn.duration(500).delay(800)}
            >
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleContainer}>
                  <Ionicons name="menu-outline" size={22} color={isDark ? '#1E90FF' : '#1E90FF'} />
                  <Text style={[styles.sectionTitle, textColor]}>Quick Actions</Text>
                </View>
              </View>
              
              <Animated.View style={styles.menuContainer}>
                <MenuList isDark={isDark} />
              </Animated.View>
            </Animated.View>

            {/* Developer Tools Section */}
            <Animated.View 
              style={styles.sectionContainer}
              entering={FadeIn.duration(500).delay(900)}
            >
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleContainer}>
                  <Ionicons name="code-outline" size={22} color={isDark ? '#1E90FF' : '#1E90FF'} />
                  <Text style={[styles.sectionTitle, textColor]}>Developer Tools</Text>
                </View>
              </View>
              
              <Animated.View style={styles.testNotificationsContainer}>
                <TestNotifications isDark={isDark} />
              </Animated.View>
            </Animated.View>

            {/* Footer */}
            <Animated.View 
              style={styles.footerContainer}
              entering={FadeIn.duration(500).delay(1000)}
            >
              <Text style={[styles.footer, { color: isDark ? '#aaa' : '#888' }]}>
                Made with ❤️ by Om Shrikhande
              </Text>
              <Text style={[styles.version, { color: isDark ? '#777' : '#999' }]}>
                Version 1.0.0
              </Text>
            </Animated.View>
          </View>
        )}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.flatListContent}
        initialNumToRender={1}
        maxToRenderPerBatch={1}
        windowSize={3}
        removeClippedSubviews={false}
      />
      
      {/* Edit Profile Modal */}
      <EditProfileForm
        visible={showEditProfile}
        onClose={() => setShowEditProfile(false)}
        userData={{
          name: userName,
          phoneNumber,
          routeNumber,
          busStop,
          email: userEmail,
          image: userImage,
          isDark
        }}
        isDark={isDark}
        onUpdate={handleProfileUpdate}
      />
    </SafeAreaView>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  flatListContent: {
    flexGrow: 1,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  light: {
    backgroundColor: '#f9f9f9',
  },
  dark: {
    backgroundColor: '#121212',
  },
  profileCard: {
    alignItems: 'center',
    marginBottom: 25,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    width: '100%',
  },
  profileCardBlur: {
    width: '100%',
    padding: 25,
    alignItems: 'center',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 15,
    borderWidth: 3,
    borderColor: '#1E90FF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  name: {
    fontSize: 24,
    fontFamily: 'flux-bold',
    marginTop: 4,
    textAlign: 'center',
  },
  email: {
    fontSize: 16,
    fontFamily: 'flux-medium',
    opacity: 0.8,
    textAlign: 'center',
    marginTop: 5,
    marginBottom: 15,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 5,
    width: '100%',
  },
  infoCard: {
    backgroundColor: 'rgba(30, 144, 255, 0.1)',
    borderRadius: 12,
    padding: 10,
    margin: 5,
    alignItems: 'center',
    minWidth: width * 0.25,
    maxWidth: width * 0.28,
  },
  infoLabel: {
    fontSize: 12,
    fontFamily: 'flux-bold',
    marginTop: 5,
  },
  infoValue: {
    fontSize: 14,
    fontFamily: 'flux-medium',
    textAlign: 'center',
    marginTop: 2,
  },
  lastUpdated: {
    fontSize: 12,
    fontFamily: 'flux',
    marginTop: 15,
    textAlign: 'center',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginTop: 15,
  },
  buttonIcon: {
    marginRight: 5,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'flux-bold',
  },
  divider: {
    height: 2,
    marginVertical: 20,
    width: '100%',
    borderRadius: 1,
  },
  sectionContainer: {
    marginBottom: 25,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
    paddingHorizontal: 5,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'flux-bold',
    marginLeft: 8,
  },
  settingsCardContainer: {
    backgroundColor: 'transparent',
    borderRadius: 16,
    overflow: 'hidden',
  },
  settingItem: {
    marginBottom: 8,
  },
  menuContainer: {
    marginTop: 5,
  },
  testNotificationsContainer: {
    marginTop: 5,
  },
  footerContainer: {
    marginTop: 30,
    alignItems: 'center',
  },
  footer: {
    textAlign: 'center',
    fontFamily: 'flux-medium',
    fontSize: 16,
  },
  version: {
    marginTop: 5,
    fontFamily: 'flux',
    fontSize: 12,
  },
  blurContainer: {
    padding: 30,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    width: width * 0.8,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    fontFamily: 'flux-medium',
  },
  notFoundText: {
    fontSize: 18,
    fontFamily: 'flux-medium',
    marginBottom: 30,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});
