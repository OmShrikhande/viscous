import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurView } from 'expo-blur';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming
} from 'react-native-reanimated';
import { firestoreDb } from '../../configs/FirebaseConfigs';
import { Colors } from '../../constants/Colors';

import MenuList from '../../components/Profile/MenuList';
import ThemeToggleSwitch from '../../components/usefulComponent/ThemeToggleSwitch';


export default function Profile() {
  const [userEmail, setUserEmail] = useState(null);
  const [userName, setUserName] = useState('');
  const [userImage, setUserImage] = useState('');
  const [isDark, setIsDark] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState('user');
  const [routeNumber, setRouteNumber] = useState('');
  const [stopName, setStopName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  
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
          setIsDark(parsed.isDark);
          
          // Set route and stop info if available
          if (parsed.routeNumber) setRouteNumber(parsed.routeNumber);
          if (parsed.stopName) setStopName(parsed.stopName);
          if (parsed.phoneNumber) setPhoneNumber(parsed.phoneNumber);
          
          // Fetch user data from Firestore
          if (parsed.email) {
            const userDocRef = doc(firestoreDb, "userdata", parsed.email);
            const userDoc = await getDoc(userDocRef);
            
            if (userDoc.exists()) {
              const userData = userDoc.data();
              setUserRole(userData.role || 'user');
              console.log('👤 User Role from Firestore:', userData.role || 'user');
              
              // Update route and stop info from Firestore if available
              if (userData.routeNumber) setRouteNumber(userData.routeNumber);
              if (userData.stopName) setStopName(userData.stopName);
              if (userData.phoneNumber) setPhoneNumber(userData.phoneNumber);
            } else {
              console.log('⚠️ User document does not exist in Firestore');
              setUserRole('user');
            }
          }
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
  
  // Function to toggle user role between 'user' and 'admin'
  const toggleUserRole = async () => {
    if (!userEmail) {
      Alert.alert('Error', 'User email not found');
      return;
    }
    
    try {
      // Toggle the role
      const newRole = userRole === 'admin' ? 'user' : 'admin';
      
      // Update in Firestore
      const userDocRef = doc(firestoreDb, "userdata", userEmail);
      await updateDoc(userDocRef, { role: newRole });
      
      // Update local state
      setUserRole(newRole);
      
      // Update in AsyncStorage
      const storedData = await AsyncStorage.getItem('userData');
      if (storedData) {
        const parsed = JSON.parse(storedData);
        parsed.role = newRole;
        await AsyncStorage.setItem('userData', JSON.stringify(parsed));
      }
      
      Alert.alert('Success', `Role changed to ${newRole}`);
    } catch (error) {
      console.error('❌ Failed to update user role:', error);
      Alert.alert('Error', 'Failed to update role. Please try again.');
    }
  };
  
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
      
      {/* Route and Stop Information */}
      <Animated.View
        entering={FadeInDown.delay(700).springify()}
        style={styles.infoContainer}
      >
        {routeNumber && stopName ? (
          <>
            <Text style={styles.infoTitle}>Your Bus Information</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Route Number:</Text>
              <Text style={styles.infoValue}>Route {routeNumber}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Your Stop:</Text>
              <Text style={styles.infoValue}>{stopName}</Text>
            </View>
            {phoneNumber && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Phone:</Text>
                <Text style={styles.infoValue}>{phoneNumber}</Text>
              </View>
            )}
          </>
        ) : (
          <Text style={styles.noInfoText}>No bus route information available</Text>
        )}
      </Animated.View>
      
      {/* Role Toggle Button */}
      <Animated.View
        entering={FadeInDown.delay(800).springify()}
        style={{ marginTop: 20, marginBottom: 10 }}
      >
        <TouchableOpacity
          style={[
            styles.roleButton,
            { backgroundColor: userRole === 'admin' ? '#4CAF50' : '#2196F3' }
          ]}
          onPress={toggleUserRole}
        >
          <Text style={styles.roleButtonText}>
            Current Role: {userRole} (Tap to Toggle)
          </Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Menu List */}
      <Animated.View 
        style={styles.menuContainer}
        entering={FadeInDown.delay(800).springify()}
      >
        <MenuList isDark={isDark} />
      </Animated.View>

      {/* Footer */}
      <Animated.Text 
        style={[styles.footer, { color: isDark ? '#aaa' : '#888' }]}
        entering={FadeInDown.delay(1000).springify()}
      >
        Made with ❤️ by Om Shrikhande
      </Animated.Text>
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
  blurContainer: {
    padding: 30,
    borderRadius: 20,
    alignItems: 'center',
    width: width * 0.8,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    fontFamily: 'flux-medium',
    textAlign: 'center',
  },
  notFoundText: {
    fontSize: 18,
    fontFamily: 'flux-medium',
    marginBottom: 20,
    textAlign: 'center',
  },
  light: {
    backgroundColor: '#f9f9f9',
  },
  dark: {
    backgroundColor: '#121212',
  },
  roleButton: {
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  roleButtonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'flux-medium',
    textAlign: 'center',
  },
  infoContainer: {
    backgroundColor: '#f5f5f5',
    borderRadius: 15,
    padding: 15,
    marginHorizontal: 20,
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  infoTitle: {
    fontSize: 18,
    fontFamily: 'flux-bold',
    color: Colors.PRIMARY,
    marginBottom: 10,
    textAlign: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  infoLabel: {
    fontSize: 16,
    fontFamily: 'flux-medium',
    color: '#555',
  },
  infoValue: {
    fontSize: 16,
    fontFamily: 'flux',
    color: '#333',
  },
  noInfoText: {
    fontSize: 16,
    fontFamily: 'flux',
    color: '#999',
    textAlign: 'center',
    padding: 10,
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
