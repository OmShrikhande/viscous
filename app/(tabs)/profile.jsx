import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurView } from 'expo-blur';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
    FadeIn,
    FadeInDown,
    FadeInUp,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming
} from 'react-native-reanimated';

import EditProfileForm from '../../components/Profile/EditProfileForm';
import MenuList from '../../components/Profile/MenuList';
import BusNotificationsToggle from '../../components/Profile/BusNotificationsToggle';
import SpeedMonitoringToggle from '../../components/Profile/SpeedMonitoringToggle';
import TestNotifications from '../../components/usefulComponent/TestNotifications';
import ThemeToggleSwitch from '../../components/usefulComponent/ThemeToggleSwitch';


export default function Profile() {
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
  
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const storedData = await AsyncStorage.getItem('userData');
        console.log('🔍 Loading user data from AsyncStorage:', storedData);
        if (storedData) {
          const parsed = JSON.parse(storedData);
          setUserEmail(parsed.email);
          console.log('📧 User Email:', parsed.email);
          setUserName(parsed.name || 'No Name');
          setUserImage(parsed.image || null);
          setPhoneNumber(parsed.phoneNumber || '');
          setRouteNumber(parsed.routeNumber || '');
          setBusStop(parsed.busStop || '');
          setLastUpdated(parsed.lastUpdated ? new Date(parsed.lastUpdated) : null);
          setIsDark(parsed.isDark);
        }
      } catch (err) {
        console.error('❌ Failed to load user data:', err);
      }
      setIsLoading(false);
    };

    loadUserData();
  }, []);
  
  // Separate useEffect for animations to avoid dependency warnings
  useEffect(() => {
    if (!isLoading) {
      // Start animations after data is loaded
      avatarScale.value = withSpring(1, { damping: 12, stiffness: 100 });
      cardOpacity.value = withTiming(1, { duration: 800 });
      profileInfoY.value = withTiming(0, { duration: 600 });
    }
  }, [isLoading]);
  
  // Animated styles
  const avatarAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: avatarScale.value }],
    };
  });
  
  const cardAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: cardOpacity.value,
    };
  });
  
  const profileInfoAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: profileInfoY.value }],
      opacity: cardOpacity.value,
    };
  });

  const handleProfileUpdate = (updatedData) => {
    setUserName(updatedData.name || '');
    setPhoneNumber(updatedData.phoneNumber || '');
    setRouteNumber(updatedData.routeNumber || '');
    setBusStop(updatedData.busStop || '');
    setLastUpdated(updatedData.lastUpdated ? new Date(updatedData.lastUpdated) : null);
  };

  const themeStyles = isDark ? styles.dark : styles.light;
  const textColor = { color: isDark ? '#fff' : '#000' };

  if (isLoading) {
    return (
      <Animated.View 
        style={[styles.centeredContainer, themeStyles]}
        entering={FadeIn.duration(800)}
      >
        <BlurView intensity={50} style={styles.blurContainer} tint={isDark ? 'dark' : 'light'}>
          <ActivityIndicator size="large" color={isDark ? '#fff' : '#000'} />
          <Animated.Text 
            style={[textColor, styles.loadingText]}
            entering={FadeInDown.delay(300).springify()}
          >
            Loading your profile...
          </Animated.Text>
        </BlurView>
      </Animated.View>
    );
  }

  if (!userEmail) {
    return (
      <Animated.View 
        style={[styles.centeredContainer, themeStyles]}
        entering={FadeIn.duration(800)}
      >
        <Animated.Text 
          style={[textColor, styles.notFoundText]}
          entering={FadeInDown.delay(200).springify()}
        >
          ⚠️ User not found. Please login again.
        </Animated.Text>
        <Animated.View 
          style={styles.menuContainer}
          entering={FadeInUp.delay(400).springify()}
        >
          <MenuList isDark={isDark} />
        </Animated.View>
      </Animated.View>
    );
  }

  return (
    <Animated.ScrollView 
      style={[styles.container, themeStyles]} 
      contentContainerStyle={{ paddingBottom: 40 }}
      entering={FadeIn.duration(800)}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View 
        style={[styles.profileCard, cardAnimatedStyle]}
        entering={FadeInDown.delay(200).springify()}
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
            
            {phoneNumber && (
              <View style={styles.infoContainer}>
                <Text style={[styles.infoLabel, textColor]}>Phone:</Text>
                <Text style={[styles.infoValue, textColor]}>{phoneNumber}</Text>
              </View>
            )}
            
            {routeNumber && (
              <View style={styles.infoContainer}>
                <Text style={[styles.infoLabel, textColor]}>Route Number:</Text>
                <Text style={[styles.infoValue, textColor]}>{routeNumber}</Text>
              </View>
            )}
            
            {busStop && (
              <View style={styles.infoContainer}>
                <Text style={[styles.infoLabel, textColor]}>Bus Stop:</Text>
                <Text style={[styles.infoValue, textColor]}>{busStop}</Text>
              </View>
            )}
            
            {lastUpdated && (
              <Text style={[styles.lastUpdated, { color: isDark ? '#aaa' : '#888' }]}>
                Last updated: {lastUpdated.toLocaleDateString()}
              </Text>
            )}
            
            <TouchableOpacity
              style={[styles.editButton, { backgroundColor: isDark ? '#1E90FF' : '#1E90FF' }]}
              onPress={() => setShowEditProfile(true)}
            >
              <Text style={styles.editButtonText}>Edit Profile</Text>
            </TouchableOpacity>
          </Animated.View>
        </BlurView>
      </Animated.View>

      {/* Divider */}
      <Animated.View 
        style={[styles.divider, { backgroundColor: isDark ? '#444' : '#ccc' }]}
        entering={FadeInDown.delay(400).springify()}
      />

      {/* Theme Toggle */}
      <Animated.View
        entering={FadeInDown.delay(600).springify()}
      >
        <ThemeToggleSwitch
          currentValue={isDark}
          userEmail={userEmail}
          onToggle={(newVal) => setIsDark(newVal)}
        />
      </Animated.View>
      
      {/* Bus Notifications Toggle */}
      <Animated.View
        entering={FadeInDown.delay(700).springify()}
      >
        <BusNotificationsToggle
          isDark={isDark}
          userEmail={userEmail}
        />
      </Animated.View>

      {/* Speed Monitoring Toggle */}
      <Animated.View
        entering={FadeInDown.delay(750).springify()}
      >
        <SpeedMonitoringToggle
          isDark={isDark}
          userEmail={userEmail}
        />
      </Animated.View>

      {/* Menu List */}
      <Animated.View 
        style={styles.menuContainer}
        entering={FadeInDown.delay(800).springify()}
      >
        <MenuList isDark={isDark} />
      </Animated.View>

      {/* Test Notifications Component */}
      <Animated.View
        style={styles.testNotificationsContainer}
        entering={FadeInDown.delay(900).springify()}
      >
        <TestNotifications isDark={isDark} />
      </Animated.View>

      {/* Footer */}
      <Animated.Text 
        style={[styles.footer, { color: isDark ? '#aaa' : '#888' }]}
        entering={FadeInDown.delay(1000).springify()}
      >
        Made with ❤️ by Om Shrikhande
      </Animated.Text>
      
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
    </Animated.ScrollView>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 30,
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
    marginBottom: 10,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
    width: '100%',
    justifyContent: 'center',
  },
  infoLabel: {
    fontSize: 14,
    fontFamily: 'flux-bold',
    marginRight: 5,
  },
  infoValue: {
    fontSize: 14,
    fontFamily: 'flux-medium',
  },
  lastUpdated: {
    fontSize: 12,
    fontFamily: 'flux',
    marginTop: 10,
    textAlign: 'center',
  },
  editButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginTop: 15,
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
  menuContainer: {
    marginTop: 10,
  },
  testNotificationsContainer: {
    marginTop: 20,
  },
  footer: {
    marginTop: 40,
    textAlign: 'center',
    fontFamily: 'flux-medium',
    fontSize: 16,
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
  },
});
