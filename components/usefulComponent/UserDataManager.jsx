import { useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setDoc, doc, serverTimestamp, getDoc } from 'firebase/firestore';
import { useUser, useAuth } from '@clerk/clerk-expo';
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
        const role = await AsyncStorage.getItem('userRole') || 'user';

        // 👉 Check if user doc already exists
        const userRef = doc(db, 'userdata', email);
        const docSnap = await getDoc(userRef);

        if (!docSnap.exists()) {
          const userData = {
            name,
            email,
            image,
            role,
            isDark: false, // Default only at first time
            createdAt: serverTimestamp(),
          };

          // Save to Firestore
          await setDoc(userRef, userData);

          // Save locally
          await AsyncStorage.setItem('userData', JSON.stringify({
            ...userData,
            createdAt: new Date().toISOString(), // Optional local time
          }));

          console.log('✅ User data created and saved to AsyncStorage');
        } else {
          console.log('ℹ️ User data already exists — skipping overwrite');
        }

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
