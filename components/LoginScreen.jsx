import { Colors } from '@/constants/Colors';
import { useWarmUpBrowser } from '@/hooks/useWarmUpBrowser';
import { useAuth, useOAuth, useSignIn, useSignUp, useUser } from '@clerk/clerk-expo';
import { FontAwesome, MaterialIcons } from '@expo/vector-icons';
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
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  ZoomIn
} from 'react-native-reanimated';
import { firestoreDb as db } from './../configs/FirebaseConfigs';

WebBrowser.maybeCompleteAuthSession();

const { width } = Dimensions.get('window');

export default function LoginScreen() {
  useWarmUpBrowser();
  
  // State
  const [tapCount, setTapCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState('oauth'); // 'oauth', 'signin', 'signup'
  const [form, setForm] = useState({
    email: '', password: '', confirmPassword: '', firstName: '', lastName: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  
  // Auth hooks
  const { startOAuthFlow: startGoogle } = useOAuth({ strategy: 'oauth_google' });
  const { startOAuthFlow: startApple } = useOAuth({ strategy: 'oauth_apple' });
  const { user } = useUser();
  const { isSignedIn, signOut } = useAuth();
  const { signIn, setActive: setSignInActive } = useSignIn();
  const { signUp, setActive: setSignUpActive } = useSignUp();

  // Animation
  const logoScale = useSharedValue(1);
  const logoStyle = useAnimatedStyle(() => ({ transform: [{ scale: logoScale.value }] }));

  // Initialize user role
  useEffect(() => {
    AsyncStorage.getItem('userRole').then(role => {
      if (!role) AsyncStorage.setItem('userRole', 'user');
    });
  }, []);

  // Store user data
  useEffect(() => {
    if (!isSignedIn || !user) return;
    
    const storeUserData = async () => {
      try {
        const email = user.emailAddresses?.[0]?.emailAddress || 'unknown';
        const name = user.fullName || user.firstName || 'No Name';
        const role = await AsyncStorage.getItem('userRole') || 'user';
        
        const userData = {
          name, email, 
          image: user.imageUrl || null,
          role, isDark: false,
          createdAt: new Date().toISOString(),
          authMethod: user.externalAccounts?.length > 0 ? 'oauth' : 'email',
        };

        await setDoc(doc(db, 'userdata', email), { ...userData, createdAt: serverTimestamp() });
        await AsyncStorage.setItem('userData', JSON.stringify(userData));
        console.log('✅ User data saved');
      } catch (err) {
        console.error('❌ Failed to save user data:', err);
      }
    };
    
    storeUserData();
  }, [isSignedIn, user]);

  // Validation
  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validatePassword = (password) => password.length >= 6;

  // Secret admin backdoor
  const handleSecretTap = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    logoScale.value = withSequence(withTiming(0.9, { duration: 100 }), withTiming(1, { duration: 100 }));
    
    const newCount = tapCount + 1;
    setTapCount(newCount);
    
    if (newCount >= 10) {
      await AsyncStorage.setItem('userRole', 'admin');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      logoScale.value = withSequence(withTiming(1.2, { duration: 300 }), withSpring(1));
      Alert.alert('🎉 Backdoor Activated', 'You are now an admin! 🔓');
      setTapCount(0);
    } else if (newCount === 5) {
      Alert.alert('🤔 Hmm...', 'Keep tapping! 🤫');
    }
  };

  // Email Sign In
  const handleEmailSignIn = async () => {
    setErrors({});
    if (!validateEmail(form.email)) return setErrors({email: 'Invalid email'});
    if (!validatePassword(form.password)) return setErrors({password: 'Password too short'});

    setIsLoading(true);
    try {
      const result = await signIn.create({ identifier: form.email, password: form.password });
      if (result.status === 'complete') {
        await setSignInActive({ session: result.createdSessionId });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err) {
      Alert.alert('Sign In Failed', err.errors?.[0]?.message || 'Please try again');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  };

  // Email Sign Up
  const handleEmailSignUp = async () => {
    setErrors({});
    if (!validateEmail(form.email)) return setErrors({email: 'Invalid email'});
    if (!validatePassword(form.password)) return setErrors({password: 'Password too short'});
    if (form.password !== form.confirmPassword) return setErrors({password: 'Passwords do not match'});
    if (!form.firstName.trim()) return setErrors({firstName: 'First name required'});

    setIsLoading(true);
    try {
      const result = await signUp.create({
        emailAddress: form.email, password: form.password,
        firstName: form.firstName, lastName: form.lastName,
      });
      if (result.status === 'complete') {
        await setSignUpActive({ session: result.createdSessionId });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Alert.alert('Verify Email', 'Check your email to verify your account.');
      }
    } catch (err) {
      Alert.alert('Sign Up Failed', err.errors?.[0]?.message || 'Please try again');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  };

  // OAuth handlers
  const handleOAuth = useCallback(async (provider) => {
    try {
      setIsLoading(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      const oauthFlow = provider === 'google' ? startGoogle : startApple;
      const { createdSessionId, setActive } = await oauthFlow({
        redirectUrl: Linking.createURL('/(tabs)/home'),
        ...(provider === 'google' && { additionalScopes: ['email', 'profile'] })
      });

      if (createdSessionId) {
        await setActive({ session: createdSessionId });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err) {
      console.error(`${provider} OAuth error:`, err);
      if (err.message?.includes('already signed in') && user && isSignedIn) return;
      Alert.alert('Login Error', `Failed to sign in with ${provider}. Please try again.`);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  }, [startGoogle, startApple, user, isSignedIn]);

  // Switch modes
  const switchMode = (newMode) => {
    setMode(newMode);
    setErrors({});
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // Render Email Form
  const renderEmailForm = () => (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.formTitle}>
          {mode === 'signin' ? 'Welcome Back!' : 'Create Account'}
        </Text>
        
        {mode === 'signup' && (
          <View style={styles.nameRow}>
            <View style={[styles.inputWrapper, {flex: 1, marginRight: 8}]}>
              <MaterialIcons name="person" size={20} color={Colors.GRAY} />
              <TextInput
                style={styles.textInput}
                placeholder="First Name"
                placeholderTextColor={Colors.GRAY}
                value={form.firstName}
                onChangeText={(text) => setForm({...form, firstName: text})}
                autoCapitalize="words"
              />
            </View>
            <View style={[styles.inputWrapper, {flex: 1, marginLeft: 8}]}>
              <MaterialIcons name="person-outline" size={20} color={Colors.GRAY} />
              <TextInput
                style={styles.textInput}
                placeholder="Last Name"
                placeholderTextColor={Colors.GRAY}
                value={form.lastName}
                onChangeText={(text) => setForm({...form, lastName: text})}
                autoCapitalize="words"
              />
            </View>
          </View>
        )}

        <View style={styles.inputWrapper}>
          <MaterialIcons name="email" size={20} color={Colors.GRAY} />
          <TextInput
            style={styles.textInput}
            placeholder="Email"
            placeholderTextColor={Colors.GRAY}
            value={form.email}
            onChangeText={(text) => setForm({...form, email: text})}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>
        {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

        <View style={styles.inputWrapper}>
          <MaterialIcons name="lock" size={20} color={Colors.GRAY} />
          <TextInput
            style={styles.textInput}
            placeholder="Password"
            placeholderTextColor={Colors.GRAY}
            value={form.password}
            onChangeText={(text) => setForm({...form, password: text})}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            <MaterialIcons name={showPassword ? 'visibility' : 'visibility-off'} size={20} color={Colors.GRAY} />
          </TouchableOpacity>
        </View>

        {mode === 'signup' && (
          <View style={styles.inputWrapper}>
            <MaterialIcons name="lock-outline" size={20} color={Colors.GRAY} />
            <TextInput
              style={styles.textInput}
              placeholder="Confirm Password"
              placeholderTextColor={Colors.GRAY}
              value={form.confirmPassword}
              onChangeText={(text) => setForm({...form, confirmPassword: text})}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
          </View>
        )}
        {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={mode === 'signin' ? handleEmailSignIn : handleEmailSignUp}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={Colors.WHITE} />
          ) : (
            <Text style={styles.primaryButtonText}>
              {mode === 'signin' ? 'Sign In' : 'Create Account'}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => switchMode(mode === 'signin' ? 'signup' : 'signin')}>
          <Text style={styles.switchText}>
            {mode === 'signin' ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
          </Text>
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR</Text>
          <View style={styles.dividerLine} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <LinearGradient
        colors={[Colors.PRIMARY, '#1A237E', '#000']}
        style={styles.backgroundGradient}
      />
      
      <Animated.View entering={FadeIn.delay(200)} style={styles.circle1} />
      <Animated.View entering={FadeIn.delay(400)} style={styles.circle2} />
      
      <View style={styles.content}>
        <Animated.View entering={ZoomIn.delay(300)} style={[styles.logoContainer, logoStyle]}>
          <TouchableOpacity onPress={handleSecretTap} activeOpacity={0.9}>
            <Image 
              source={require('../assets/images/bustrackerlogo.png')} 
              style={styles.logo}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </Animated.View>
        
        <Animated.View entering={FadeInDown.delay(600)} style={styles.titleContainer}>
          <BlurView intensity={80} tint="dark" style={styles.blurContainer}>
            <Text style={styles.title}>
              Your Ultimate <Text style={styles.titleAccent}>Viscous</Text> App
            </Text>
            <Text style={styles.subtitle}>
              Track your bus in real-time with precision and convenience
            </Text>
          </BlurView>
        </Animated.View>
        
        <Animated.View entering={FadeInUp.delay(800)} style={styles.authContainer}>
          {mode === 'oauth' ? (
            <>
              <TouchableOpacity 
                style={styles.googleButton}
                onPress={() => handleOAuth('google')}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <FontAwesome name="google" size={20} color="#fff" style={styles.buttonIcon} />
                    <Text style={styles.buttonText}>Continue with Google</Text>
                  </>
                )}
              </TouchableOpacity>
              
              {Platform.OS === 'ios' && (
                <TouchableOpacity 
                  style={styles.appleButton}
                  onPress={() => handleOAuth('apple')}
                  disabled={isLoading}
                >
                  <FontAwesome name="apple" size={20} color="#fff" style={styles.buttonIcon} />
                  <Text style={styles.buttonText}>Continue with Apple</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity style={styles.emailButton} onPress={() => switchMode('signin')}>
                <MaterialIcons name="email" size={20} color={Colors.WHITE} style={styles.buttonIcon} />
                <Text style={styles.buttonText}>Sign in with Email</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.emailButton} onPress={() => switchMode('signup')}>
                <MaterialIcons name="person-add" size={20} color={Colors.WHITE} style={styles.buttonIcon} />
                <Text style={styles.buttonText}>Create Account</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              {renderEmailForm()}
              <TouchableOpacity style={styles.googleButton} onPress={() => handleOAuth('google')} disabled={isLoading}>
                <FontAwesome name="google" size={18} color="#fff" style={styles.buttonIcon} />
                <Text style={styles.buttonText}>Google</Text>
              </TouchableOpacity>
              {Platform.OS === 'ios' && (
                <TouchableOpacity style={styles.appleButton} onPress={() => handleOAuth('apple')} disabled={isLoading}>
                  <FontAwesome name="apple" size={18} color="#fff" style={styles.buttonIcon} />
                  <Text style={styles.buttonText}>Apple</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => switchMode('oauth')}>
                <Text style={styles.backText}>← Back to Quick Sign In</Text>
              </TouchableOpacity>
            </>
          )}
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.PRIMARY },
  backgroundGradient: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  circle1: {
    position: 'absolute', width: 300, height: 300, borderRadius: 150,
    backgroundColor: 'rgba(255, 255, 255, 0.1)', top: -150, right: -150
  },
  circle2: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.1)', bottom: -100, left: -100
  },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 20 },
  logoContainer: { alignItems: 'center', marginBottom: 30 },
  logo: { width: 120, height: 120 },
  titleContainer: { marginBottom: 40 },
  blurContainer: { padding: 20, borderRadius: 20, overflow: 'hidden' },
  title: { fontSize: 24, fontWeight: 'bold', color: Colors.WHITE, textAlign: 'center', marginBottom: 10 },
  titleAccent: { color: Colors.BORDER },
  subtitle: { fontSize: 16, color: Colors.WHITE, textAlign: 'center', opacity: 0.9 },
  authContainer: { gap: 15 },
  
  // Email Form
  formTitle: { fontSize: 28, fontWeight: 'bold', color: Colors.WHITE, textAlign: 'center', marginBottom: 20 },
  nameRow: { flexDirection: 'row', marginBottom: 15 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12, paddingVertical: 15, paddingHorizontal: 15, marginBottom: 15,
    borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)', gap: 12
  },
  textInput: { flex: 1, color: Colors.WHITE, fontSize: 16 },
  errorText: { color: '#FF6B6B', fontSize: 14, marginTop: -10, marginBottom: 10, marginLeft: 5 },
  primaryButton: {
    backgroundColor: Colors.SECONDARY, paddingVertical: 15, borderRadius: 12,
    alignItems: 'center', marginBottom: 20
  },
  primaryButtonText: { color: Colors.WHITE, fontSize: 16, fontWeight: '600' },
  switchText: { color: Colors.BORDER, fontSize: 14, textAlign: 'center', marginBottom: 20 },
  divider: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255, 255, 255, 0.3)' },
  dividerText: { color: Colors.WHITE, fontSize: 14, marginHorizontal: 15, opacity: 0.8 },
  
  // Buttons
  googleButton: {
    backgroundColor: '#DB4437', flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 15, borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2, shadowRadius: 4, elevation: 3
  },
  appleButton: {
    backgroundColor: '#000', flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 15, borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2, shadowRadius: 4, elevation: 3
  },
  emailButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)', flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', paddingVertical: 15, borderRadius: 12, borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)'
  },
  buttonIcon: { marginRight: 12 },
  buttonText: { color: Colors.WHITE, fontSize: 16, fontWeight: '600' },
  backText: { color: Colors.BORDER, fontSize: 14, textAlign: 'center', marginTop: 10 }
});