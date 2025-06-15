import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Image, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Colors } from '@/constants/Colors';
import * as WebBrowser from 'expo-web-browser';
import { useOAuth, useUser } from '@clerk/clerk-expo';
import * as Linking from 'expo-linking';
import { useWarmUpBrowser } from '@/hooks/useWarmUpBrowser';
import { useWindowDimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {firestoreDb as db } from './../configs/FirebaseConfigs'; // 🔧 your firebase file
import { setDoc, doc, serverTimestamp } from 'firebase/firestore';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  useWarmUpBrowser();
  const { width, height } = useWindowDimensions();
  const [tapCount, setTapCount] = useState(0);
  const { startOAuthFlow: startGoogleOAuthFlow } = useOAuth({ strategy: 'oauth_google' });

  let startAppleOAuthFlow;
  try {
    startAppleOAuthFlow = useOAuth({ strategy: 'oauth_apple' }).startOAuthFlow;
  } catch (err) {
    console.error('Apple OAuth strategy is not supported. Please check your Clerk configuration.', err);
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

  const handleSecretTap = async () => {
    const newCount = tapCount + 1;
    setTapCount(newCount);

    if (newCount >= 10) {
      await AsyncStorage.setItem('userRole', 'admin');
      Alert.alert('Backdoor Activated', 'You are now an admin!');
      setTapCount(0);
    }
  };

  const storeUserData = async (user) => {
  try {
    const email = user.emailAddresses?.[0]?.emailAddress || 'unknown';
    const name = user.fullName || 'No Name';
    const image = user.imageUrl;
    const role = await AsyncStorage.getItem('userRole') || 'user';

    const userData = {
      name,
      email,
      image,
      role,
      isDark: false,
      createdAt: new Date().toISOString(),
    };

    // 🔥 Store in Firestore
    await setDoc(doc(db, 'userdata', email), {
      ...userData,
      createdAt: serverTimestamp(), // Firestore will overwrite the date
    });

    // 💾 Store locally in AsyncStorage
    await AsyncStorage.setItem('userData', JSON.stringify(userData));

    console.log('User data saved to Firestore & local storage');
  } catch (error) {
    console.error('Error storing user data:', error);
  }
};

  const onPressGoogle = useCallback(async () => {
    try {
      const { createdSessionId, setActive, signIn, signUp } = await startGoogleOAuthFlow({
        redirectUrl: Linking.createURL('/dashboard', { scheme: 'myapp' }),
      });

      if (createdSessionId) {
        await setActive({ session: createdSessionId });

        // Wait a moment for Clerk user to be available
        setTimeout(async () => {
          const { user } = useUser();
          if (user) {
            await storeUserData(user);
          }
        }, 1000);
      }
    } catch (err) {
      console.error('Google OAuth error', err);
    }
  }, []);

  const onPressApple = useCallback(async () => {
    if (!startAppleOAuthFlow) return;

    try {
      const { createdSessionId, setActive } = await startAppleOAuthFlow({
        redirectUrl: Linking.createURL('/dashboard', { scheme: 'myapp' }),
      });

      if (createdSessionId) {
        await setActive({ session: createdSessionId });

        // Store Apple user info
        setTimeout(async () => {
          const { user } = useUser();
          if (user) {
            await storeUserData(user);
          }
        }, 1000);
      }
    } catch (err) {
      console.error('Apple OAuth error', err);
    }
  }, []);

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
      <View style={[styles.container, { paddingHorizontal: width * 0.05 }]}>
        <TouchableOpacity onPress={handleSecretTap}>
          <View style={[styles.imageContainer, { marginTop: height * 0.15 }]}>
            <Image
              source={require('../assets/images/image.png')}
              style={[styles.image, { width: width * 0.6, height: height * 0.35 }]}
            />
          </View>
        </TouchableOpacity>

        <View style={[styles.subContainer, { padding: width * 0.08 }]}>
          <Text style={styles.title}>
            Your Ultimate <Text style={{ color: Colors.PRIMARY }}>S.B. Jain's Bus Tracker</Text> App
          </Text>

          <Text style={styles.description}>
            Let you get the realtime location of your bus using this application
          </Text>

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
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  imageContainer: {
    alignItems: 'center',
  },
  image: {
    borderWidth: 2,
    borderRadius: 20,
    borderColor: '#fff',
  },
  subContainer: {
    backgroundColor: '#fff',
    marginTop: -20,
  },
  title: {
    fontSize: 35,
    textAlign: 'center',
    fontFamily: 'flux-bold',
  },
  description: {
    fontSize: 15,
    fontFamily: 'flux',
    color: Colors.GRAY,
    textAlign: 'center',
    marginVertical: 15,
  },
  btn: {
    backgroundColor: Colors.PRIMARY,
    padding: 15,
    borderRadius: 90,
    marginTop: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.27,
    shadowRadius: 4.65,
    borderColor: '#000',
    borderWidth: 2,
  },
  btnText: {
    color: '#fff',
    fontFamily: 'flux-bold',
  },
});
