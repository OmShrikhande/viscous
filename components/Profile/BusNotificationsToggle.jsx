import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import Animated, { FadeIn } from 'react-native-reanimated';

const BusNotificationsToggle = ({ isDark, userEmail }) => {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  // Load notification preference
  useEffect(() => {
    const loadNotificationPreference = async () => {
      try {
        const pref = await AsyncStorage.getItem('busStopNotificationsEnabled');
        if (pref !== null) {
          setNotificationsEnabled(pref === 'true');
        }
      } catch (error) {
        console.error('Error loading notification preference:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadNotificationPreference();
  }, []);

  // Save notification preference when changed
  const toggleNotifications = async (value) => {
    setNotificationsEnabled(value);
    try {
      await AsyncStorage.setItem('busStopNotificationsEnabled', value.toString());
      console.log('Notification preference saved:', value);
    } catch (error) {
      console.error('Error saving notification preference:', error);
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
            name="notifications" 
            size={24} 
            color={notificationsEnabled ? '#1E90FF' : descriptionColor} 
          />
          <Text style={[styles.title, { color: textColor }]}>
            Bus Stop Notifications
          </Text>
          <Switch
            value={notificationsEnabled}
            onValueChange={toggleNotifications}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={notificationsEnabled ? '#1E90FF' : '#f4f3f4'}
            disabled={isLoading}
          />
        </View>
        
        <Text style={[styles.description, { color: descriptionColor }]}>
          {notificationsEnabled 
            ? 'You will receive notifications when the bus is approaching your stop.'
            : 'Notifications are disabled. Toggle the switch to receive alerts.'}
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

export default BusNotificationsToggle;