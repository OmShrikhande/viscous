import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';

// Constants
const LISTENER_MANAGER_TASK = 'firebase-listener-manager-task';
const ACTIVE_HOURS_START = 6; // 6 AM
const ACTIVE_HOURS_END = 22; // 10 PM

// Store for all active listeners
const activeListeners = {
  foreground: new Map(), // Listeners that should only run in foreground
  background: new Map(), // Listeners that can run in background
  critical: new Map(),   // Listeners that must always run (use sparingly)
};

// Track app state
let currentAppState = AppState.currentState;
let isWithinActiveHours = true;

// Check if current time is within active hours
const checkActiveHours = () => {
  const now = new Date();
  const hour = now.getHours();
  return hour >= ACTIVE_HOURS_START && hour < ACTIVE_HOURS_END;
};

// Update active hours status
const updateActiveHoursStatus = () => {
  const wasActive = isWithinActiveHours;
  isWithinActiveHours = checkActiveHours();
  
  // If transitioning from active to inactive, pause appropriate listeners
  if (wasActive && !isWithinActiveHours) {
    console.log('Entering inactive hours, pausing non-critical listeners');
    pauseNonCriticalListeners();
  }
  
  // If transitioning from inactive to active, resume appropriate listeners
  if (!wasActive && isWithinActiveHours) {
    console.log('Entering active hours, resuming listeners');
    resumeListeners();
  }
  
  return isWithinActiveHours;
};

// Register a Firebase listener
export const registerListener = (id, unsubscribeFunction, type = 'foreground') => {
  if (!['foreground', 'background', 'critical'].includes(type)) {
    console.warn(`Invalid listener type: ${type}. Using 'foreground' instead.`);
    type = 'foreground';
  }
  
  // Store the unsubscribe function
  activeListeners[type].set(id, unsubscribeFunction);
  console.log(`Registered ${type} listener: ${id}`);
  
  // If outside active hours and not critical, immediately unsubscribe
  if (!isWithinActiveHours && type !== 'critical') {
    unsubscribeFunction();
    console.log(`Immediately paused ${type} listener: ${id} (outside active hours)`);
  }
  
  // If in background and foreground-only, immediately unsubscribe
  if (currentAppState !== 'active' && type === 'foreground') {
    unsubscribeFunction();
    console.log(`Immediately paused foreground listener: ${id} (app in background)`);
  }
  
  // Return a function to unregister this listener
  return () => unregisterListener(id, type);
};

// Unregister a Firebase listener
export const unregisterListener = (id, type = 'foreground') => {
  if (!activeListeners[type].has(id)) {
    console.warn(`Listener ${id} of type ${type} not found`);
    return false;
  }
  
  // Get the unsubscribe function
  const unsubscribe = activeListeners[type].get(id);
  
  // Call the unsubscribe function
  if (typeof unsubscribe === 'function') {
    unsubscribe();
  }
  
  // Remove from active listeners
  activeListeners[type].delete(id);
  console.log(`Unregistered ${type} listener: ${id}`);
  
  return true;
};

// Pause all non-critical listeners
export const pauseNonCriticalListeners = () => {
  // Pause foreground listeners
  activeListeners.foreground.forEach((unsubscribe, id) => {
    if (typeof unsubscribe === 'function') {
      unsubscribe();
      console.log(`Paused foreground listener: ${id}`);
    }
  });
  
  // Pause background listeners
  activeListeners.background.forEach((unsubscribe, id) => {
    if (typeof unsubscribe === 'function') {
      unsubscribe();
      console.log(`Paused background listener: ${id}`);
    }
  });
  
  // Save state to AsyncStorage
  AsyncStorage.setItem('listenersPaused', 'true');
};

// Resume all listeners based on current state
export const resumeListeners = async () => {
  // Only resume if we're in active hours
  if (!isWithinActiveHours) {
    console.log('Not resuming listeners - outside active hours');
    return;
  }
  
  // We'll need to re-register listeners, which requires component re-renders
  // Just mark as resumed so components can re-register on next render
  await AsyncStorage.setItem('listenersPaused', 'false');
  console.log('Marked listeners for resumption');
};

// Handle app state changes
const handleAppStateChange = (nextAppState) => {
  if (currentAppState === 'active' && nextAppState.match(/inactive|background/)) {
    // App is going to background
    console.log('App going to background, pausing foreground listeners');
    
    // Pause foreground listeners
    activeListeners.foreground.forEach((unsubscribe, id) => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
        console.log(`Paused foreground listener: ${id}`);
      }
    });
  }
  
  if (currentAppState.match(/inactive|background/) && nextAppState === 'active') {
    // App is coming to foreground
    console.log('App coming to foreground');
    
    // Update active hours status
    updateActiveHoursStatus();
    
    // Components will re-register their listeners on render
  }
  
  currentAppState = nextAppState;
};

// Background task to check time and manage listeners
TaskManager.defineTask(LISTENER_MANAGER_TASK, async () => {
  try {
    // Check if we should be active based on time
    const shouldBeActive = updateActiveHoursStatus();
    console.log(`Background check: should listeners be active? ${shouldBeActive}`);
    
    // Store the status for when the app resumes
    await AsyncStorage.setItem('listenersPaused', shouldBeActive ? 'false' : 'true');
    
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error('Error in listener manager background task:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// Initialize the listener manager
export const initListenerManager = async () => {
  // Set initial active hours status
  isWithinActiveHours = checkActiveHours();
  console.log(`Initializing listener manager. Active hours: ${isWithinActiveHours}`);
  
  // Register app state change listener
  AppState.addEventListener('change', handleAppStateChange);
  
  // Register background task
  try {
    await BackgroundFetch.registerTaskAsync(LISTENER_MANAGER_TASK, {
      minimumInterval: 15 * 60, // 15 minutes
      stopOnTerminate: false,
      startOnBoot: true,
    });
    console.log('Registered background task for listener management');
  } catch (error) {
    console.error('Failed to register background task:', error);
  }
  
  // Return cleanup function
  return () => {
    // Unsubscribe all listeners
    Object.keys(activeListeners).forEach(type => {
      activeListeners[type].forEach((unsubscribe, id) => {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
          console.log(`Unsubscribed ${type} listener: ${id}`);
        }
      });
      activeListeners[type].clear();
    });
    
    // Remove app state listener
    AppState.removeEventListener('change', handleAppStateChange);
    
    // Unregister background task
    BackgroundFetch.unregisterTaskAsync(LISTENER_MANAGER_TASK)
      .catch(error => console.error('Failed to unregister background task:', error));
  };
};

// Hook to check if listeners should be active
export const useListenerStatus = () => {
  return { 
    isWithinActiveHours,
    currentAppState
  };
};