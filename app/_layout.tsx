import { ClerkProvider, SignedIn, SignedOut } from "@clerk/clerk-expo";
import { useFonts } from "expo-font";
import { Stack, useRouter } from "expo-router";
import LoginScreen from "../components/LoginScreen.jsx";
// import { tokenCache } from '@/cache'
import * as Notifications from "expo-notifications";
import * as SecureStore from 'expo-secure-store';
import { useEffect, useRef } from "react";
import { addNotificationResponseListener } from "../utils/notificationHelper";

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
    // Set up notification listeners when app is in foreground
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received in foreground:', notification);
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
      Notifications.removeNotificationSubscription(notificationListener.current);
      Notifications.removeNotificationSubscription(responseListener.current);
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
      <Stack>      
            <Stack.Screen name="(tabs)" options={{ headerShown:false }} />
      </Stack>
          
      </SignedIn>
      
      <SignedOut>
          <LoginScreen/>
      </SignedOut>


    </ClerkProvider>
  );
}
