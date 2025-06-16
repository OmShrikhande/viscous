import { useAuth, useUser } from '@clerk/clerk-expo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { useEffect } from 'react';
import { firestoreDb as db } from '../../configs/FirebaseConfigs';

export default function UserDataManager() {
  const { user } = useUser();
  const { isSignedIn } = useAuth();

  useEffect(() => {
    let interval;

    const tryStoringUserData = async () => {
      if (!isSignedIn || !user) return;

      try {
        const email = user.emailAddresses?.[0]?.emailAddress || 'unknown';
        const name = user.fullName || 'No Name';
        const image = user.imageUrl;
        const userRef = doc(db, 'userdata', email);
        const docSnap = await getDoc(userRef);
        const defaultRole = await AsyncStorage.getItem('userRole') || 'user';

        const userData = {
          name,
          email,
          image,
          role: docSnap.exists() ? docSnap.data().role : defaultRole,
          isDark: false,
          lastUpdated: serverTimestamp(),
        };

        if (!docSnap.exists()) {
          userData.createdAt = serverTimestamp();
        } else {
          // Keep existing data, just update necessary fields
          const existingData = docSnap.data();
          userData.isDark = existingData.isDark;
          userData.createdAt = existingData.createdAt;
        }

        // Save to Firestore
        await setDoc(userRef, userData, { merge: true });

        // Save to AsyncStorage
        const localUserData = {
          ...userData,
          lastUpdated: new Date().toISOString(),
          createdAt: userData.createdAt ? new Date().toISOString() : new Date().toISOString(),
        };
        
        await AsyncStorage.setItem('userData', JSON.stringify(localUserData));
        console.log('✅ User data saved to AsyncStorage:', localUserData);

        clearInterval(interval);
      } catch (err) {
        console.error('❌ Failed to save user data:', err);
      }
    };

    if (isSignedIn && !user?.emailAddresses) {
      interval = setInterval(tryStoringUserData, 500);
    } else {
      tryStoringUserData();
    }

    return () => clearInterval(interval);
  }, [isSignedIn, user]);

  return null;
}
