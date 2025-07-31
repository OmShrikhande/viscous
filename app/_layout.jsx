import { ClerkProvider, SignedIn, SignedOut } from "@clerk/clerk-expo";
import { useFonts } from "expo-font";
import { Stack, useRouter } from "expo-router";
import LoginScreen from "../components/LoginScreen.jsx";
import OnboardingScreen from "../components/OnboardingScreen.jsx";
// import { tokenCache } from '@/cache'
import * as SecureStore from 'expo-secure-store';
import registerNNPushToken from 'native-notify';
import { useEffect, useRef } from "react";
import { registerBusNotificationTask } from "../utils/backgroundNotificationTask.js";
import { initConnectionMonitoring } from "../utils/firebaseConnectionCheck.js";
import { initListenerManager } from "../utils/firebaseListenerManager.js";
import {
  addNotificationReceivedListener,
  addNotificationResponseListener,
  initializeNotifications,
  removeAllNotificationListeners,
  sendLocalNotification
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
  // Register with Native Notify for push notifications
  registerNNPushToken(30976, 'lU7qY5eiukC5zL4KDW2kTQ');
  
  const router = useRouter();
  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    // Initialize notifications system with a test notification - with improved error handling
    const setupNotifications = async () => {
      try {
        console.log('Setting up notifications in _layout.jsx...');
        
        // First initialize without test notification - with retry mechanism
        let notificationsInitialized = false;
        let retryCount = 0;
        const maxRetries = 3;
        
        while (!notificationsInitialized && retryCount < maxRetries) {
          try {
            console.log(`🔄 Attempting to initialize notifications (attempt ${retryCount + 1}/${maxRetries})...`);
            notificationsInitialized = await initializeNotifications(false);
            
            if (notificationsInitialized) {
              console.log('✅ Notifications initialized successfully');
              break;
            }
          } catch (err) {
            console.error(`❌ Notification initialization attempt ${retryCount + 1} failed:`, err);
          }
          
          retryCount++;
          if (retryCount < maxRetries) {
            console.log(`⏳ Waiting 2 seconds before retry...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
        
        if (!notificationsInitialized) {
          console.log('⚠️ Notifications initialization failed after all retries, continuing without notifications');
          return;
        }
        
        // Register background notification task
        console.log('Setting up background notification task...');
        const taskRegistered = await registerBusNotificationTask()
          .catch(err => {
            console.error('Error registering background task:', err);
            return false;
          });
        
        if (!taskRegistered) {
          console.log('Background task registration failed, skipping test notification');
          return;
        }
        
        // Send a test notification separately with a slight delay - only if previous steps succeeded
        setTimeout(async () => {
          try {
            console.log('Sending test notification...');
            await sendLocalNotification(
              "Bus Tracker Active", 
              "You'll receive updates when the bus reaches stops.",
              {
                data: { screen: 'home' },
                // Use null trigger for immediate delivery
                trigger: null,
              }
            );
            console.log('Test notification sent successfully');
          } catch (notifError) {
            console.error('Error sending test notification:', notifError);
            // Don't throw - just log the error
          }
        }, 2000); // Wait 2 seconds before sending test notification
        
        console.log('✅ Notifications and background tasks initialized successfully');
      } catch (error) {
        console.error('Error in notification setup process:', error);
        // Continue app initialization even if notifications fail
      }
    };
    
    // Initialize Firebase listener manager with improved error handling
    const setupListenerManager = async () => {
      try {
        console.log('Initializing Firebase listener manager...');
        
        // Initialize listener manager
        const listenerManagerCleanup = await initListenerManager()
          .catch(err => {
            console.error('Error initializing listener manager:', err);
            return null;
          });
            
        if (listenerManagerCleanup) {
          console.log('✅ Firebase listener manager initialized successfully');
          
          // Initialize connection monitoring - in try/catch to prevent crashes
          try {
            console.log('🔄 Initializing Firebase connection monitoring...');
            const monitoringCleanup = initConnectionMonitoring();
            console.log('✅ Firebase connection monitoring initialized');
            
            // Return combined cleanup function
            return () => {
              try {
                if (typeof listenerManagerCleanup === 'function') {
                  listenerManagerCleanup();
                }
                if (typeof monitoringCleanup === 'function') {
                  monitoringCleanup();
                }
              } catch (cleanupError) {
                console.warn('⚠️ Error during cleanup:', cleanupError);
              }
            };
            
          } catch (monitoringError) {
            console.warn('⚠️ Connection monitoring initialization failed (non-critical):', monitoringError);
            // Return just the listener manager cleanup
            return listenerManagerCleanup;
          }
        }
        
        return null;
      } catch (error) {
        console.error('Error in Firebase setup process:', error);
        return null;
      }
    };
    
    // Set up both systems - wrap in try/catch to prevent app crash
    let listenerManagerCleanupPromise;
    try {
      setupNotifications().catch(err => console.error('Notification setup failed:', err));
      listenerManagerCleanupPromise = setupListenerManager().catch(err => console.error('Listener manager setup failed:', err));
    } catch (setupError) {
      console.error('Critical error during app initialization:', setupError);
      // Continue anyway to prevent app crash
    }
    
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
          router.push('/(tabs)/map');
        } else if (data.screen === 'home') {
          router.push('/(tabs)/home');
        }
      }
    });

    // Clean up listeners on unmount - with improved error handling
    return () => {
      try {
        // Use the updated helper function to remove specific listeners
        const listenersToRemove = [
          notificationListener.current,
          responseListener.current
        ].filter(Boolean); // Filter out any undefined listeners
        
        // Wrap in try/catch to prevent cleanup errors from crashing the app
        try {
          removeAllNotificationListeners(listenersToRemove);
          console.log('Notification listeners removed successfully');
        } catch (listenerError) {
          console.error('Error removing notification listeners:', listenerError);
        }
        
        // Clean up Firebase listener manager - with error handling
        if (listenerManagerCleanupPromise) {
          listenerManagerCleanupPromise
            .then(cleanup => {
              if (typeof cleanup === 'function') {
                try {
                  console.log('Cleaning up Firebase listener manager...');
                  cleanup();
                  console.log('Firebase listener manager cleaned up successfully');
                } catch (cleanupError) {
                  console.error('Error during Firebase listener cleanup:', cleanupError);
                }
              }
            })
            .catch(err => console.error('Error resolving cleanup promise:', err));
        }
      } catch (error) {
        console.error('Critical error during cleanup:', error);
        // Nothing more we can do here
      }
    };
  }, []);

  useFonts({
    'flux':require('../assets/fonts/AfacadFlux-Regular.ttf'),
    'flux-bold':require('../assets/fonts/AfacadFlux-Bold.ttf'),
    'flux-light':require('../assets/fonts/AfacadFlux-Light.ttf'),
    'flux-medium':require('../assets/fonts/AfacadFlux-Medium.ttf'),
    'flux-thin':require('../assets/fonts/AfacadFlux-Thin.ttf'),
  })
  // Add error boundary for the entire app
  const clerkPublishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;
  
  // Validate Clerk key exists
  if (!clerkPublishableKey) {
    console.error('EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY is not set!');
    // Return a fallback UI
    return (
      <Stack>
        <Stack.Screen 
          name="error" 
          options={{ 
            headerShown: false,
            title: 'Configuration Error'
          }} 
        />
      </Stack>
    );
  }

  try {
    return (
      <ClerkProvider 
        publishableKey={clerkPublishableKey} 
        tokenCache={tokenCache}
      >
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
  } catch (error) {
    console.error('Critical error rendering app:', error);
    // Return a fallback UI that won't crash
    return (
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown:false }} />
      </Stack>
    );
  }
}
