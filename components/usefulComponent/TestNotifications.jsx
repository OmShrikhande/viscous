import { useEffect, useState } from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';
import {
  initializeNotifications,
  requestNotificationPermissions,
  sendLocalNotification
} from '../../utils/notificationHelper';

export default function TestNotifications() {
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
    <View style={styles.container}>
      <Text style={styles.title}>Notification Test</Text>
      
      <View style={styles.statusContainer}>
        <Text style={styles.label}>Permission Status:</Text>
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
        />
      </View>

      <View style={styles.buttonContainer}>
        <Button 
          title="Initialize Notifications" 
          onPress={handleInitialize} 
        />
      </View>

      <View style={styles.buttonContainer}>
        <Button 
          title="Send Test Notification" 
          onPress={handleSendNotification}
          disabled={permissionStatus !== 'granted'} 
        />
      </View>

      {notificationSent && (
        <Text style={styles.sentText}>
          Notification sent! If you don't see a system notification, check your device settings.
        </Text>
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
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
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
  label: {
    fontSize: 16,
  },
  status: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  granted: {
    color: 'green',
  },
  denied: {
    color: 'red',
  },
  error: {
    color: 'orange',
  },
  buttonContainer: {
    marginBottom: 15,
  },
  sentText: {
    marginTop: 10,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});