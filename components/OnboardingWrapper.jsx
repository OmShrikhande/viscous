import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc } from 'firebase/firestore';
import { default as React, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { firestoreDb } from '../configs/FirebaseConfigs';
import { Colors } from '../constants/Colors';
import FirstTimeLoginForm from './FirstTimeLoginForm';

export default function OnboardingWrapper({ children }) {
  const [loading, setLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [userEmail, setUserEmail] = useState(null);

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      // Get user data from AsyncStorage
      const userDataJson = await AsyncStorage.getItem('userData');
      if (!userDataJson) {
        setLoading(false);
        return; // No user data, let the app handle login flow
      }

      const userData = JSON.parse(userDataJson);
      setUserEmail(userData.email);

      // Check if user has completed onboarding in AsyncStorage
      if (userData.hasCompletedOnboarding) {
        setNeedsOnboarding(false);
        setLoading(false);
        return;
      }

      // Double-check with Firestore
      const userDocRef = doc(firestoreDb, 'userdata', userData.email);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const firestoreData = userDoc.data();
        
        // If Firestore says onboarding is complete, update AsyncStorage
        if (firestoreData.hasCompletedOnboarding) {
          const updatedUserData = {
            ...userData,
            hasCompletedOnboarding: true,
            routeNumber: firestoreData.routeNumber,
            stopName: firestoreData.stopName,
            fullName: firestoreData.fullName,
            phoneNumber: firestoreData.phoneNumber
          };
          
          await AsyncStorage.setItem('userData', JSON.stringify(updatedUserData));
          setNeedsOnboarding(false);
        } else {
          // User needs to complete onboarding
          setNeedsOnboarding(true);
        }
      } else {
        // No Firestore document, user needs onboarding
        setNeedsOnboarding(true);
      }
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      // On error, assume no onboarding needed to prevent blocking the app
      setNeedsOnboarding(false);
    } finally {
      setLoading(false);
    }
  };

  const handleOnboardingComplete = () => {
    setNeedsOnboarding(false);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.PRIMARY} />
      </View>
    );
  }

  if (needsOnboarding && userEmail) {
    return <FirstTimeLoginForm userEmail={userEmail} onComplete={handleOnboardingComplete} />;
  }

  return children;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});