import { ClerkProvider, SignedIn, SignedOut } from "@clerk/clerk-expo";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import LoginScreen from "../components/LoginScreen.jsx";
// import { tokenCache } from '@/cache'
import * as SecureStore from 'expo-secure-store';

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
