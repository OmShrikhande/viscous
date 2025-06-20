import AsyncStorage from '@react-native-async-storage/async-storage';
import * as BackgroundFetch from 'expo-background-fetch';
import { doc, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { firestoreDb } from '../../configs/FirebaseConfigs';
import { BACKGROUND_SPEED_MONITOR_TASK, registerBackgroundTasks } from '../../utils/backgroundTasks';

/**
 * Toggle component for enabling/disabling speed monitoring notifications
 * @param {Object} props - Component props
 * @param {boolean} props.isDark - Whether dark mode is enabled
 * @param {string} props.userEmail - User's email address
 */
const SpeedMonitoringToggle = ({ isDark, userEmail }) => {
  const [isEnabled, setIsEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // Load user preference from AsyncStorage
  useEffect(() => {
    const loadPreference = async () => {
      try {
        const userDataJson = await AsyncStorage.getItem('userData');
        if (userDataJson) {
          const userData = JSON.parse(userDataJson);
          // If speedMonitoring is explicitly set to false, disable it
          setIsEnabled(userData.speedMonitoring !== false);
        }
      } catch (error) {
        console.error('Error loading speed monitoring preference:', error);
      }
    };

    loadPreference();
  }, []);

  // Toggle speed monitoring
  const toggleSwitch = async () => {
    if (!userEmail) {
      console.warn('Cannot toggle speed monitoring: No user email available');
      return;
    }

    setIsLoading(true);
    const newValue = !isEnabled;
    
    try {
      // Update AsyncStorage
      const userDataJson = await AsyncStorage.getItem('userData');
      let userData = userDataJson ? JSON.parse(userDataJson) : {};
      userData = { ...userData, speedMonitoring: newValue };
      await AsyncStorage.setItem('userData', JSON.stringify(userData));
      
      // Update Firestore
      const userDocRef = doc(firestoreDb, 'userdata', userEmail);
      await updateDoc(userDocRef, { speedMonitoring: newValue });
      
      // Manage background task
      if (newValue) {
        // Enable background task
        console.log('Enabling background speed monitoring task');
        
        // Check if task is already registered
        const tasks = await BackgroundFetch.getRegisteredTasksAsync();
        const isRegistered = tasks.some(task => task.taskName === BACKGROUND_SPEED_MONITOR_TASK);
        
        if (!isRegistered) {
          // Register all background tasks
          await registerBackgroundTasks();
        } else {
          console.log('Background speed monitoring task already registered');
        }
      } else {
        // Disable background task
        console.log('Disabling background speed monitoring task');
        
        try {
          // We don't actually unregister the task, just update the user preference
          // The task will check the preference and exit early if disabled
          console.log('Background task will check user preference and skip processing if disabled');
        } catch (error) {
          console.warn('Error managing background task:', error);
          // Non-critical error, continue
        }
      }
      
      console.log(`Speed monitoring ${newValue ? 'enabled' : 'disabled'}`);
      setIsEnabled(newValue);
    } catch (error) {
      console.error('Error toggling speed monitoring:', error);
      // Revert state if there was an error
      setIsEnabled(isEnabled);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <Text style={[styles.title, isDark && styles.textDark]}>Speed Monitoring</Text>
      
      <View style={styles.row}>
        <Text style={[styles.description, isDark && styles.textDark]}>
          Receive notifications when bus speed exceeds 65 km/h
        </Text>
        
        <Switch
          trackColor={{ false: '#767577', true: '#81b0ff' }}
          thumbColor={isEnabled ? '#0a7ea4' : '#f4f3f4'}
          ios_backgroundColor="#3e3e3e"
          onValueChange={toggleSwitch}
          value={isEnabled}
          disabled={isLoading}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    marginVertical: 8,
    marginHorizontal: 16,
  },
  containerDark: {
    backgroundColor: '#1E1E1E',
  },
  title: {
    fontSize: 18,
    fontFamily: 'flux-bold',
    marginBottom: 8,
  },
  textDark: {
    color: '#fff',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  description: {
    fontSize: 14,
    fontFamily: 'flux',
    flex: 1,
    marginRight: 16,
  },
});

export default SpeedMonitoringToggle;