import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import Animated, { FadeIn } from 'react-native-reanimated';
import {
  initializeNotifications,
  requestNotificationPermissions,
  sendLocalNotification
} from '../../utils/notificationHelper';
import EmulatorNotificationTest from './EmulatorNotificationTest';
import * as Device from 'expo-device';

export default function TestNotifications({ isDark }) {
  const [permissionStatus, setPermissionStatus] = useState('unknown');
  const [notificationSent, setNotificationSent] = useState(false);

  useEffect(() => {
    // Check notification permissions on mount
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    try {
      const hasPermission = await requestNotificationPermissions();
      setPermissionStatus(hasPermission ? 'granted' : 'denied');
    } catch (error) {
      console.error('Error checking permissions:', error);
      setPermissionStatus('error');
    }
  };

  const handleInitialize = async () => {
    try {
      const result = await initializeNotifications(false);
      setPermissionStatus(result ? 'granted' : 'denied');
      alert(`Notifications ${result ? 'initialized' : 'failed to initialize'}`);
    } catch (error) {
      console.error('Error initializing:', error);
      alert('Error initializing notifications');
    }
  };

  const handleSendNotification = async () => {
    try {
      const notificationId = await sendLocalNotification(
        'Test Notification',
        'This is a test notification from the app',
        {
          data: { screen: 'home' },
          trigger: { seconds: 2 },
          ios: {
            shouldShowBanner: true,
            shouldShowList: true
          }
        }
      );
      
      if (notificationId) {
        setNotificationSent(true);
        alert(`Notification sent with ID: ${notificationId}`);
      } else {
        alert('Failed to send notification');
      }
    } catch (error) {
      console.error('Error sending notification:', error);
      alert('Error sending notification');
    }
  };

  // Styles based on theme
  const textColor = isDark ? '#fff' : '#000';
  const descriptionColor = isDark ? '#aaa' : '#666';
  const buttonBgColor = isDark ? '#2a2a2a' : '#f0f0f0';
  const buttonActiveBgColor = '#1E90FF';

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
            name="notifications-circle-outline" 
            size={24} 
            color={permissionStatus === 'granted' ? '#1E90FF' : descriptionColor} 
          />
          <Text style={[styles.title, { color: textColor }]}>
            Notification Test
          </Text>
        </View>
        
        <View style={[styles.statusContainer, { backgroundColor: isDark ? '#2a2a2a' : '#f9f9f9' }]}>
          <Text style={[styles.label, { color: textColor }]}>Permission Status:</Text>
          <Text style={[
            styles.status,
            permissionStatus === 'granted' && styles.granted,
            permissionStatus === 'denied' && styles.denied,
            permissionStatus === 'error' && styles.error
          ]}>
            {permissionStatus}
          </Text>
        </View>

        <View style={styles.buttonGrid}>
          <TouchableOpacity 
            style={[styles.button, { backgroundColor: buttonBgColor }]}
            onPress={checkPermissions}
          >
            <Ionicons name="shield-checkmark-outline" size={20} color={isDark ? '#1E90FF' : '#1E90FF'} />
            <Text style={[styles.buttonText, { color: textColor }]}>Check Permissions</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.button, { backgroundColor: buttonBgColor }]}
            onPress={handleInitialize}
          >
            <Ionicons name="refresh-outline" size={20} color={isDark ? '#1E90FF' : '#1E90FF'} />
            <Text style={[styles.buttonText, { color: textColor }]}>Initialize</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[
              styles.button, 
              { backgroundColor: permissionStatus === 'granted' ? buttonActiveBgColor : buttonBgColor }
            ]}
            onPress={handleSendNotification}
            disabled={permissionStatus !== 'granted'}
          >
            <Ionicons 
              name="paper-plane-outline" 
              size={20} 
              color={permissionStatus === 'granted' ? '#fff' : descriptionColor} 
            />
            <Text style={[
              styles.buttonText, 
              { color: permissionStatus === 'granted' ? '#fff' : descriptionColor }
            ]}>
              Send Test
            </Text>
          </TouchableOpacity>
        </View>

        {notificationSent && (
          <Text style={[styles.sentText, { color: descriptionColor }]}>
            Notification sent! If you don't see it, check your device settings.
          </Text>
        )}
        
        {/* Special emulator test component */}
        {!Device.isDevice && (
          <EmulatorNotificationTest isDark={isDark} />
        )}
      </BlurView>
    </Animated.View>
  );
}

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
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontFamily: 'flux-bold',
    marginLeft: 10,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 10,
  },
  label: {
    fontSize: 14,
    fontFamily: 'flux',
  },
  status: {
    fontSize: 14,
    fontFamily: 'flux-bold',
  },
  granted: {
    color: '#4CAF50',
  },
  denied: {
    color: '#F44336',
  },
  error: {
    color: '#FF9800',
  },
  buttonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
    width: '31%',
  },
  buttonText: {
    fontSize: 12,
    fontFamily: 'flux-bold',
    marginLeft: 5,
  },
  sentText: {
    marginTop: 5,
    textAlign: 'center',
    fontStyle: 'italic',
    fontFamily: 'flux',
    fontSize: 12,
  },
});