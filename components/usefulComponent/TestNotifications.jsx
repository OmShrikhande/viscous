import { useEffect, useState } from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';
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

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <Text style={[styles.title, isDark && styles.textDark]}>Notification Test</Text>
      
      <View style={[styles.statusContainer, isDark && styles.statusContainerDark]}>
        <Text style={[styles.label, isDark && styles.textDark]}>Permission Status:</Text>
        <Text style={[
          styles.status,
          permissionStatus === 'granted' && styles.granted,
          permissionStatus === 'denied' && styles.denied,
          permissionStatus === 'error' && styles.error
        ]}>
          {permissionStatus}
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        <Button 
          title="Check Permissions" 
          onPress={checkPermissions} 
          color={isDark ? '#1E90FF' : undefined}
        />
      </View>

      <View style={styles.buttonContainer}>
        <Button 
          title="Initialize Notifications" 
          onPress={handleInitialize} 
          color={isDark ? '#1E90FF' : undefined}
        />
      </View>

      <View style={styles.buttonContainer}>
        <Button 
          title="Send Test Notification" 
          onPress={handleSendNotification}
          disabled={permissionStatus !== 'granted'} 
          color={isDark ? '#1E90FF' : undefined}
        />
      </View>

      {notificationSent && (
        <Text style={[styles.sentText, isDark && styles.textDark]}>
          Notification sent! If you don't see a system notification, check your device settings.
        </Text>
      )}
      
      {/* Special emulator test component */}
      {!Device.isDevice && (
        <EmulatorNotificationTest isDark={isDark} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    margin: 10,
  },
  containerDark: {
    backgroundColor: '#1E1E1E',
  },
  title: {
    fontSize: 18,
    fontFamily: 'flux-bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  textDark: {
    color: '#fff',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 5,
  },
  statusContainerDark: {
    backgroundColor: '#2a2a2a',
  },
  label: {
    fontSize: 16,
    fontFamily: 'flux',
  },
  status: {
    fontSize: 16,
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
  buttonContainer: {
    marginBottom: 15,
  },
  sentText: {
    marginTop: 10,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
    fontFamily: 'flux',
  },
});