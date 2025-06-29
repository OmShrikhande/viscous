import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurView } from 'expo-blur';
import * as TaskManager from 'expo-task-manager';
import { doc, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
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
        const tasks = await TaskManager.getRegisteredTasksAsync();
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

  // Styles based on theme
  const textColor = isDark ? '#fff' : '#000';
  const descriptionColor = isDark ? '#aaa' : '#666';

  return (
    <Animated.View 
      entering={FadeIn.duration(400)}
      style={styles.container}
    >
      <BlurView 
        intensity={30} 
        style={styles.blurContainer} 
        tint={isDark ? 'dark' : 'light'}
      >
        <View style={styles.header}>
          <Ionicons 
            name="speedometer-outline" 
            size={24} 
            color={isEnabled ? '#1E90FF' : descriptionColor} 
          />
          <Text style={[styles.title, { color: textColor }]}>
            Speed Monitoring
          </Text>
          <Switch
            value={isEnabled}
            onValueChange={toggleSwitch}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={isEnabled ? '#1E90FF' : '#f4f3f4'}
            disabled={isLoading}
          />
        </View>
        
        <Text style={[styles.description, { color: descriptionColor }]}>
          {isEnabled 
            ? 'You will receive notifications when bus speed exceeds 65 km/h.'
            : 'Speed monitoring is disabled. Toggle the switch to receive alerts.'}
        </Text>
      </BlurView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  blurContainer: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontFamily: 'flux-bold',
    flex: 1,
    marginLeft: 10,
  },
  description: {
    fontSize: 14,
    fontFamily: 'flux',
    marginLeft: 34,
    opacity: 0.8,
  },
});

export default SpeedMonitoringToggle;