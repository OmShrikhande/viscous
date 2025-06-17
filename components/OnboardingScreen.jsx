import { useUser } from '@clerk/clerk-expo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View, useColorScheme } from 'react-native';
import { firestoreDb as db } from '../configs/FirebaseConfigs';
import UserOnboardingForm from './usefulComponent/UserOnboardingForm';

const OnboardingScreen = ({ children }) => {
  const { user } = useUser();
  const [isLoading, setIsLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        // Get user email from Clerk
        const email = user.emailAddresses?.[0]?.emailAddress;
        if (!email) {
          console.log('No email found for user');
          setIsLoading(false);
          return;
        }

        // Check if user data exists in AsyncStorage first (faster)
        const storedData = await AsyncStorage.getItem('userData');
        if (storedData) {
          const userData = JSON.parse(storedData);
          // Check if the required fields are present
          if (
            userData.name &&
            userData.phoneNumber &&
            userData.routeNumber &&
            userData.busStop
          ) {
            console.log('User data found in AsyncStorage, skipping onboarding');
            setNeedsOnboarding(false);
            setIsLoading(false);
            return;
          }
        }

        // If not in AsyncStorage or missing fields, check Firestore
        const userRef = doc(db, 'userdata', email);
        const docSnap = await getDoc(userRef);

        if (
          docSnap.exists() &&
          docSnap.data().name &&
          docSnap.data().phoneNumber &&
          docSnap.data().routeNumber &&
          docSnap.data().busStop
        ) {
          console.log('User data found in Firestore, skipping onboarding');
          setNeedsOnboarding(false);
        } else {
          console.log('User data not found or incomplete, showing onboarding');
          setNeedsOnboarding(true);
        }
      } catch (error) {
        console.error('Error checking onboarding status:', error);
        // If there's an error, show the onboarding form to be safe
        setNeedsOnboarding(true);
      } finally {
        setIsLoading(false);
      }
    };

    checkOnboardingStatus();
  }, [user]);

  const handleOnboardingComplete = () => {
    setNeedsOnboarding(false);
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: isDark ? '#121212' : '#f9f9f9' }]}>
        <ActivityIndicator size="large" color={isDark ? '#fff' : '#000'} />
      </View>
    );
  }

  if (needsOnboarding) {
    return <UserOnboardingForm onComplete={handleOnboardingComplete} isDark={isDark} />;
  }

  return children;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default OnboardingScreen;