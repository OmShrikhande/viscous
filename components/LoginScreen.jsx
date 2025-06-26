import { Colors } from '@/constants/Colors';
import { useWarmUpBrowser } from '@/hooks/useWarmUpBrowser';
import { useAuth, useOAuth, useUser } from '@clerk/clerk-expo';
import { FontAwesome } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  ZoomIn
} from 'react-native-reanimated';
import { firestoreDb as db } from './../configs/FirebaseConfigs';

WebBrowser.maybeCompleteAuthSession();

const { width, height } = Dimensions.get('window');

export default function LoginScreen() {
  useWarmUpBrowser();
  
  // State variables
  const [tapCount, setTapCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  
  // Auth hooks
  const { startOAuthFlow: startGoogleOAuthFlow } = useOAuth({ strategy: 'oauth_google' });
  const { user } = useUser();
  const { isSignedIn } = useAuth();

  // Animation values
  const logoScale = useSharedValue(1);
  const buttonOpacity = useSharedValue(1);
  const pulseAnimation = useSharedValue(1);
  
  // Apple OAuth setup
  let startAppleOAuthFlow;
  try {
    startAppleOAuthFlow = useOAuth({ strategy: 'oauth_apple' }).startOAuthFlow;
  } catch (err) {
    console.error('Apple OAuth strategy is not supported.', err);
  }

  // Initialize user role
  useEffect(() => {
    const initializeRole = async () => {
      const existingRole = await AsyncStorage.getItem('userRole');
      if (!existingRole) {
        await AsyncStorage.setItem('userRole', 'user');
      }
    };
    initializeRole();
  }, []);

  // Store user data effect
  useEffect(() => {
    let interval;

    const tryStoringUserData = async () => {
      if (!isSignedIn || !user) return;

      try {
        const email = user.emailAddresses?.[0]?.emailAddress || 'unknown';
        const name = user.fullName || 'No Name';
        const image = user.imageUrl;
        
        // Ensure role is never undefined by providing a default value
        let role = 'user'; // Default role
        const storedRole = await AsyncStorage.getItem('userRole');
        if (storedRole) {
          role = storedRole;
        }

        const userData = {
          name,
          email,
          image,
          role, // This will now always have a value
          isDark: false,
          createdAt: new Date().toISOString(),
        };

        // Store in Firestore
        await setDoc(doc(db, 'userdata', email), {
          ...userData,
          createdAt: serverTimestamp(),
        });

        // Store in AsyncStorage
        await AsyncStorage.setItem('userData', JSON.stringify(userData));
        console.log('✅ userData saved to AsyncStorage');

        clearInterval(interval); // Stop once stored
      } catch (err) {
        console.error('❌ Failed to save user data:', err);
      }
    };

    // Poll every 500ms until user is available
    if (isSignedIn && !user?.emailAddresses) {
      interval = setInterval(tryStoringUserData, 500);
    } else {
      tryStoringUserData(); // call immediately if possible
    }

    return () => clearInterval(interval);
  }, [isSignedIn, user]);

  // Start pulse animation
  useEffect(() => {
    pulseAnimation.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) })
      ),
      -1, // Infinite repeat
      true // Reverse
    );
  }, []);

  // Debug: Log user data from AsyncStorage
  useEffect(() => {
    AsyncStorage.getItem('userData').then(data => {
      console.log('🌐 LOCAL STORAGE:', data);
    });
  }, []);

  // Animated styles
  const logoAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: logoScale.value },
        { scale: pulseAnimation.value }
      ]
    };
  });

  const buttonAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: buttonOpacity.value,
    };
  });

  // Handle secret admin tap
  const handleSecretTap = async () => {
    // Trigger haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Animate logo on tap
    logoScale.value = withSequence(
      withTiming(0.9, { duration: 100 }),
      withTiming(1, { duration: 100 })
    );
    
    const newCount = tapCount + 1;
    setTapCount(newCount);
    
    if (newCount >= 10) {
      await AsyncStorage.setItem('userRole', 'admin');
      
      // Strong haptic feedback for admin activation
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Celebrate with animation
      logoScale.value = withSequence(
        withTiming(1.2, { duration: 300 }),
        withSpring(1)
      );
      
      Alert.alert('Backdoor Activated', 'You are now an admin!');
      setTapCount(0);
    }
  };

  // Google login handler
  const onPressGoogle = useCallback(async () => {
    try {
      // Button press animation
      buttonOpacity.value = withSequence(
        withTiming(0.7, { duration: 100 }),
        withTiming(1, { duration: 100 })
      );
      
      // Haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      setIsLoading(true);
      
      // Use the original implementation that was working
      const { createdSessionId, setActive } = await startGoogleOAuthFlow({
        redirectUrl: Linking.createURL('/home'),
      });

      if (createdSessionId) {
        await setActive({ session: createdSessionId });
      }
    } catch (err) {
      console.error('Google OAuth error', err);
      Alert.alert('Login Error', 'There was a problem signing in with Google. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [startGoogleOAuthFlow]);

  // Apple login handler
  const onPressApple = useCallback(async () => {
    if (!startAppleOAuthFlow) {
      Alert.alert('Not Available', 'Apple sign-in is not available on this device.');
      return;
    }
    
    try {
      // Button press animation
      buttonOpacity.value = withSequence(
        withTiming(0.7, { duration: 100 }),
        withTiming(1, { duration: 100 })
      );
      
      // Haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      setIsLoading(true);
      
      // Use the original implementation that was working
      const { createdSessionId, setActive } = await startAppleOAuthFlow({
        redirectUrl: Linking.createURL('/home'),
      });
      
      if (createdSessionId) {
        await setActive({ session: createdSessionId });
      }
    } catch (err) {
      console.error('Apple OAuth error', err);
      Alert.alert('Login Error', 'There was a problem signing in with Apple. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [startAppleOAuthFlow]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Background gradient */}
      <LinearGradient
        colors={[Colors.PRIMARY, '#1A237E', '#000']}
        style={styles.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      
      {/* Animated circles in background */}
      <Animated.View 
        entering={FadeIn.delay(200).duration(1000)}
        style={[styles.backgroundCircle, styles.circle1]} 
      />
      <Animated.View 
        entering={FadeIn.delay(400).duration(1000)}
        style={[styles.backgroundCircle, styles.circle2]} 
      />
      
      {/* Content container */}
      <View style={styles.contentContainer}>
        {/* Logo section with animation */}
        <Animated.View 
          entering={ZoomIn.delay(300).duration(800)}
          style={[styles.logoContainer, logoAnimatedStyle]}
        >
          <TouchableOpacity 
            onPress={handleSecretTap}
            activeOpacity={0.9}
          >
            <Image 
              source={require('../assets/images/bustrackerlogo.png')} 
              style={styles.logo}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </Animated.View>
        
        {/* Title and description with animations */}
        <Animated.View 
          entering={FadeInDown.delay(600).duration(800)}
          style={styles.textContainer}
        >
          <BlurView intensity={80} tint="dark" style={styles.blurContainer}>
            <Text style={styles.title}>
              Your Ultimate <Text style={styles.titleHighlight}>S.B. Jain's Bus Tracker</Text> App
            </Text>
            <Text style={styles.description}>
              Track your bus in real-time with precision and convenience
            </Text>
          </BlurView>
        </Animated.View>
        
        {/* Login buttons with animations */}
        <Animated.View 
          entering={FadeInUp.delay(800).duration(800)}
          style={styles.buttonContainer}
        >
          <Animated.View style={buttonAnimatedStyle}>
            <TouchableOpacity 
              style={styles.googleButton}
              onPress={onPressGoogle}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <FontAwesome name="google" size={20} color="#fff" style={styles.buttonIcon} />
                  <Text style={styles.buttonText}>Continue with Google</Text>
                </>
              )}
            </TouchableOpacity>
          </Animated.View>
          
          <Animated.View style={buttonAnimatedStyle}>
            <TouchableOpacity 
              style={styles.appleButton}
              onPress={onPressApple}
              disabled={isLoading || !startAppleOAuthFlow}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <FontAwesome name="apple" size={22} color="#fff" style={styles.buttonIcon} />
                  <Text style={styles.buttonText}>Continue with Apple</Text>
                </>
              )}
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
        
        {/* Footer text */}
        <Animated.Text 
          entering={FadeIn.delay(1200).duration(800)}
          style={styles.footerText}
        >
          Secure login powered by Clerk
        </Animated.Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.PRIMARY,
  },
  backgroundGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  backgroundCircle: {
    position: 'absolute',
    borderRadius: 300,
    opacity: 0.2,
  },
  circle1: {
    width: width * 1.2,
    height: width * 1.2,
    backgroundColor: Colors.LIGHT,
    top: -width * 0.6,
    right: -width * 0.3,
  },
  circle2: {
    width: width * 0.8,
    height: width * 0.8,
    backgroundColor: Colors.SECONDARY,
    bottom: -width * 0.2,
    left: -width * 0.2,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  logo: {
    width: width * 0.5,
    height: width * 0.5,
    borderRadius: width * 0.25,
  },
  textContainer: {
    width: '100%',
    marginBottom: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  blurContainer: {
    padding: 20,
    borderRadius: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontFamily: 'flux-bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 32,
  },
  titleHighlight: {
    color: Colors.BORDER,
  },
  description: {
    fontSize: 16,
    fontFamily: 'flux',
    color: '#e0e0e0',
    textAlign: 'center',
    lineHeight: 22,
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.SECONDARY,
    width: '100%',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  appleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
    width: '100%',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  buttonIcon: {
    marginRight: 12,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'flux-bold',
  },
  footerText: {
    position: 'absolute',
    bottom: 30,
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontFamily: 'flux',
  },
});
