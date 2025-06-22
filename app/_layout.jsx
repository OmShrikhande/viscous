import { ClerkProvider, SignedIn, SignedOut } from "@clerk/clerk-expo";
import { useFonts } from "expo-font";
import { Stack, useRouter } from "expo-router";
import LoginScreen from "../components/LoginScreen.jsx";
import OnboardingScreen from "../components/OnboardingScreen.jsx";
// import { tokenCache } from '@/cache'
import * as SecureStore from 'expo-secure-store';
import { useEffect, useRef } from "react";
import {
  addNotificationReceivedListener,
  addNotificationResponseListener,
  initializeNotifications,
  removeAllNotificationListeners
} from "../utils/notificationHelper.js";

const tokenCache = {
  async getToken(key) {
    try {
      const item = await SecureStore.getItemAsync(key)
      return item
    } catch (error) {
      return null
    }
  },
  async saveToken(key, value) {
    try {
      return SecureStore.setItemAsync(key, value)
    } catch (err) {
      return
    }
  },
}

export default function RootLayout() {
  const router = useRouter();
  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    // Initialize notifications system with a test notification
    const setupNotifications = async () => {
      try {
        console.log('Setting up notifications in _layout.jsx...');
        await initializeNotifications(true); // Send a test notification
        console.log('✅ Notifications initialized successfully');
      } catch (error) {
        console.error('Error initializing notifications:', error);
      }
    };
    
    setupNotifications();
    
    // Set up notification listeners when app is in foreground
    notificationListener.current = addNotificationReceivedListener(notification => {
      console.log('Notification received in foreground:', notification);
      
      // Show an alert for the notification as a backup
      const title = notification.request.content.title;
      const body = notification.request.content.body;
      
      // Use setTimeout to avoid alert showing immediately on startup
      setTimeout(() => {
        if (title && body) {
          console.log('Showing alert for notification:', title, body);
          alert(`${title}\n${body}`);
        }
      }, 1000);
    });

    // Handle notification when user taps on it
    responseListener.current = addNotificationResponseListener(response => {
      console.log('Notification response received:', response);
      
      // Get notification data
      const data = response.notification.request.content.data;
      
      // Navigate based on notification data
      if (data && data.screen) {
        if (data.screen === 'map') {
          router.push('/map');
        } else if (data.screen === 'home') {
          router.push('/home');
        }
      }
    });

    // Clean up listeners on unmount
    return () => {
      // Use the updated helper function to remove specific listeners
      const listenersToRemove = [
        notificationListener.current,
        responseListener.current
      ].filter(Boolean); // Filter out any undefined listeners
      
      removeAllNotificationListeners(listenersToRemove);
    };
  }, []);

  useFonts({
    'flux':require('../assets/fonts/AfacadFlux-Regular.ttf'),
    'flux-bold':require('../assets/fonts/AfacadFlux-Bold.ttf'),
    'flux-light':require('../assets/fonts/AfacadFlux-Light.ttf'),
    'flux-medium':require('../assets/fonts/AfacadFlux-Medium.ttf'),
    'flux-thin':require('../assets/fonts/AfacadFlux-Thin.ttf'),
  })
  return (
    <ClerkProvider publishableKey={process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY} tokenCache={tokenCache}>
   
 
      <SignedIn>
        <OnboardingScreen>
          <Stack>      
            <Stack.Screen name="(tabs)" options={{ headerShown:false }} />
          </Stack>
        </OnboardingScreen>
      </SignedIn>
      
      <SignedOut>
          <LoginScreen/>
      </SignedOut>


    </ClerkProvider>
  );
}
