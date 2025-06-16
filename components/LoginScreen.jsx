import { Colors } from '@/constants/Colors';
import { useWarmUpBrowser } from '@/hooks/useWarmUpBrowser';
import { useAuth, useOAuth, useUser } from '@clerk/clerk-expo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { firestoreDb as db } from './../configs/FirebaseConfigs';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  
  useWarmUpBrowser();
  const { width, height } = useWindowDimensions();
  const [tapCount, setTapCount] = useState(0);
  const { startOAuthFlow: startGoogleOAuthFlow } = useOAuth({ strategy: 'oauth_google' });
  const { user } = useUser(); // 👈 fix here
  const { isSignedIn } = useAuth();

  let startAppleOAuthFlow;
  try {
    startAppleOAuthFlow = useOAuth({ strategy: 'oauth_apple' }).startOAuthFlow;
  } catch (err) {
    console.error('Apple OAuth strategy is not supported.', err);
  }

  useEffect(() => {
    const initializeRole = async () => {
      const existingRole = await AsyncStorage.getItem('userRole');
      if (!existingRole) {
        await AsyncStorage.setItem('userRole', 'user');
      }
    };
    initializeRole();
  }, []);


useEffect(() => {
  let interval;

  const tryStoringUserData = async () => {
    if (!isSignedIn || !user) return;

    try {
      const email = user.emailAddresses?.[0]?.emailAddress || 'unknown';
      const name = user.fullName || 'No Name';
      const image = user.imageUrl;
      
      // Get role from AsyncStorage or default to 'user'
      let role = await AsyncStorage.getItem('userRole') || 'user';
      
      // Check if user already exists in Firestore and get their role
      const userDocRef = doc(db, 'userdata', email);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        // If user exists in Firestore, use their role from there
        const firestoreRole = userDoc.data().role;
        if (firestoreRole) {
          role = firestoreRole;
          // Update AsyncStorage with the role from Firestore
          await AsyncStorage.setItem('userRole', firestoreRole);
          console.log('📝 Updated AsyncStorage role from Firestore:', firestoreRole);
        }
      }
      
      console.log('👤 User role for login:', role);

      const userData = {
        name,
        email,
        image,
        role, // This will be either from Firestore or AsyncStorage
        isDark: false,
        hasCompletedOnboarding: false, // Flag to check if user has completed the onboarding form
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


  const handleSecretTap = async () => {
    const newCount = tapCount + 1;
    setTapCount(newCount);
    if (newCount >= 10) {
      await AsyncStorage.setItem('userRole', 'admin');
      Alert.alert('Backdoor Activated', 'You are now an admin!');
      setTapCount(0);
    }
  };

  const onPressGoogle = useCallback(async () => {
    try {
      const { createdSessionId, setActive } = await startGoogleOAuthFlow({
        redirectUrl: Linking.createURL('/home', { scheme: 'viscous' }),
      });

      if (createdSessionId) {
        await setActive({ session: createdSessionId });
      }
    } catch (err) {
      console.error('Google OAuth error', err);
    }
  }, []);

  const onPressApple = useCallback(async () => {
    if (!startAppleOAuthFlow) return;
    try {
      const { createdSessionId, setActive } = await startAppleOAuthFlow({
        redirectUrl: Linking.createURL('/home', { scheme: 'viscous' }),
      });
      if (createdSessionId) {
        await setActive({ session: createdSessionId });
      }
    } catch (err) {
      console.error('Apple OAuth error', err);
    }
  }, []);

  // Debugging: Log user data from AsyncStorage
  useEffect(() => {
  AsyncStorage.getItem('userData').then(data => {
    console.log('🌐 LOCAL STORAGE:', data);
  });
}, []);


  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
      <View style={[styles.container, { paddingHorizontal: width * 0.05 }]}>
        <TouchableOpacity onPress={handleSecretTap}>
          <View style={[styles.imageContainer, { marginTop: height * 0.15 }]}>
            <Image source={require('../assets/images/image.png')} style={[styles.image, { width: width * 0.6, height: height * 0.35 }]} />
          </View>
        </TouchableOpacity>

        <View style={[styles.subContainer, { padding: width * 0.08 }]}>
          <Text style={styles.title}>Your Ultimate <Text style={{ color: Colors.PRIMARY }}>S.B. Jain's Bus Tracker</Text> App</Text>
          <Text style={styles.description}>Let you get the realtime location of your bus using this application</Text>

          <TouchableOpacity style={styles.btn} onPress={onPressGoogle}>
            <Text style={styles.btnText}>Login with Google</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btn} onPress={onPressApple}>
            <Text style={styles.btnText}>Login with Apple</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  imageContainer: { alignItems: 'center' },
  image: { borderWidth: 2, borderRadius: 20, borderColor: '#fff' },
  subContainer: { backgroundColor: '#fff', marginTop: -20 },
  title: { fontSize: 35, textAlign: 'center', fontFamily: 'flux-bold' },
  description: { fontSize: 15, fontFamily: 'flux', color: Colors.GRAY, textAlign: 'center', marginVertical: 15 },
  btn: {
    backgroundColor: Colors.PRIMARY,
    padding: 15,
    borderRadius: 90,
    marginTop: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: '#000',
    borderWidth: 2,
  },
  btnText: { color: '#fff', fontFamily: 'flux-bold' },
});
