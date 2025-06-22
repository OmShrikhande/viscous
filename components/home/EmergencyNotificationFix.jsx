import { useUser } from '@clerk/clerk-expo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { collection, onSnapshot } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Alert, Button, StyleSheet, Text, View } from 'react-native';
import { firestoreDb } from '../../configs/FirebaseConfigs';
import { initializeEmulatorNotifications, sendEmulatorNotification } from '../../utils/emulatorNotificationFix';

// Configure notification handler directly in this component as a backup
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export default function EmergencyNotificationFix() {
  const { user } = useUser();
  const [userBusStop, setUserBusStop] = useState('');
  const [userRouteNumber, setUserRouteNumber] = useState('');
  const [routeStops, setRouteStops] = useState([]);
  const [reachedStops, setReachedStops] = useState({});
  const [lastNotification, setLastNotification] = useState(null);

  // Initialize notifications
  useEffect(() => {
    const initNotifications = async () => {
      try {
        await initializeEmulatorNotifications();
      } catch (error) {
        console.error('Error initializing notifications:', error);
      }
    };
    
    initNotifications();
  }, []);

  // Load user data
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const userData = await AsyncStorage.getItem('userData');
        if (userData) {
          const parsedData = JSON.parse(userData);
          setUserRouteNumber(parsedData.routeNumber || '');
          setUserBusStop(parsedData.busStop || '');
          console.log('EMERGENCY FIX: Loaded user data', {
            routeNumber: parsedData.routeNumber,
            busStop: parsedData.busStop
          });
          
          // Send a notification with the loaded data
          sendEmulatorNotification(
            'Bus Stop Monitoring Active',
            `Monitoring route ${parsedData.routeNumber} for stop ${parsedData.busStop}`,
            { type: 'startup' }
          );
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    };

    loadUserData();
  }, []);

  // Load route stops
  useEffect(() => {
    if (!userRouteNumber) return;

    console.log(`EMERGENCY FIX: Setting up listener for Route${userRouteNumber}`);
    
    const routeRef = collection(firestoreDb, `Route${userRouteNumber}`);
    const unsubscribe = onSnapshot(routeRef, (snapshot) => {
      // Get all stops and their data
      const stops = snapshot.docs.map(doc => ({
        name: doc.id,
        data: doc.data(),
        serialNumber: doc.data().serialNumber || doc.data().order || 0
      }));
      
      // Sort stops by serialNumber/order
      const sortedStops = stops.sort((a, b) => a.serialNumber - b.serialNumber);
      
      console.log('EMERGENCY FIX: Sorted stops by serialNumber:', 
        sortedStops.map(s => `${s.name} (${s.serialNumber})`).join(', '));
      
      setRouteStops(sortedStops);
      
      // Find user's stop serialNumber
      const userStop = sortedStops.find(stop => stop.name === userBusStop);
      if (userStop) {
        console.log(`EMERGENCY FIX: Found user stop ${userBusStop} with serialNumber ${userStop.serialNumber}`);
      } else {
        console.log(`EMERGENCY FIX: User stop ${userBusStop} not found in route stops`);
      }
      
      // Process reached stops
      const updatedReachedStops = {};
      stops.forEach(stop => {
        if (stop.data.reached === true) {
          updatedReachedStops[stop.name] = {
            serialNumber: stop.serialNumber,
            reachedTime: stop.data.reachedTime || new Date().toISOString()
          };
        }
      });
      
      setReachedStops(updatedReachedStops);
      
      // Check if we need to send notifications
      if (userStop) {
        processReachedStopsBySerialNumber(updatedReachedStops, userStop.serialNumber);
      }
    });
    
    return () => unsubscribe();
  }, [userRouteNumber, userBusStop]);

  // Process reached stops by serialNumber and send notifications
  const processReachedStopsBySerialNumber = (reachedStops, userStopSerialNumber) => {
    if (!userStopSerialNumber || Object.keys(reachedStops).length === 0) return;
    
    console.log(`EMERGENCY FIX: Processing reached stops for user stop with serialNumber ${userStopSerialNumber}`);
    console.log(`EMERGENCY FIX: Reached stops:`, reachedStops);
    
    // Find the stop with the highest serialNumber that has been reached
    let highestReachedSerialNumber = -1;
    let highestReachedStopName = '';
    
    Object.entries(reachedStops).forEach(([stopName, data]) => {
      if (data.serialNumber > highestReachedSerialNumber) {
        highestReachedSerialNumber = data.serialNumber;
        highestReachedStopName = stopName;
      }
    });
    
    if (highestReachedSerialNumber === -1) return;
    
    console.log(`EMERGENCY FIX: User stop serialNumber: ${userStopSerialNumber}, Highest reached: ${highestReachedSerialNumber} (${highestReachedStopName})`);
    
    // Calculate the difference between user stop and current reached stop
    const stopDifference = userStopSerialNumber - highestReachedSerialNumber;
    
    // Determine notification type based on serialNumber difference
    let notificationType = null;
    let notificationTitle = '';
    let notificationBody = '';
    
    if (stopDifference === 2) {
      notificationType = '2_stops_away';
      notificationTitle = 'Bus Approaching Soon';
      notificationBody = `Your bus is 2 stops away at ${highestReachedStopName}. Get ready!`;
    } else if (stopDifference === 1) {
      notificationType = '1_stop_away';
      notificationTitle = 'Bus Approaching Soon';
      notificationBody = `Your bus is 1 stop away at ${highestReachedStopName}. Get ready!`;
    } else if (stopDifference === 0) {
      notificationType = 'arrived';
      notificationTitle = 'Bus Arrived at Your Stop';
      notificationBody = `Your bus has arrived at ${highestReachedStopName}. Don't miss it!`;
    } else if (stopDifference === -1) {
      notificationType = 'passed_1';
      notificationTitle = 'Bus Passed Your Stop';
      notificationBody = `The bus has passed your stop and is now at ${highestReachedStopName}.`;
    } else if (stopDifference === -2) {
      notificationType = 'passed_2';
      notificationTitle = 'Bus Passed Your Stop';
      notificationBody = `The bus is now 2 stops past your stop at ${highestReachedStopName}.`;
    }
    
    // Send notification if needed and if it's different from the last one
    if (notificationType && lastNotification !== notificationType) {
      console.log(`EMERGENCY FIX: Sending notification: ${notificationType}`);
      
      // Show an alert (works in emulator)
      Alert.alert(notificationTitle, notificationBody);
      
      // Also try to send a notification
      sendNotification(notificationTitle, notificationBody);
      
      // Update last notification
      setLastNotification(notificationType);
    }
  };

  // Send notification
  const sendNotification = async (title, body) => {
    try {
      // Use our emulator-friendly notification function
      await sendEmulatorNotification(title, body, {
        screen: 'home',
        timestamp: new Date().toISOString()
      });
      console.log('EMERGENCY FIX: Notification sent');
      return true;
    } catch (error) {
      console.error('EMERGENCY FIX: Error sending notification:', error);
      
      // Fallback to direct alert
      Alert.alert(title, body);
      return false;
    }
  };

  // Send test notification
  const sendTestNotification = async () => {
    try {
      // Find user's stop serialNumber
      const userStopInfo = routeStops.find(stop => stop.name === userBusStop);
      
      if (!userStopInfo) {
        Alert.alert(
          'Stop Not Found', 
          'Your bus stop could not be found in the route. Please make sure you have selected a valid stop.'
        );
        return;
      }
      
      const userSerialNumber = userStopInfo.serialNumber;
      
      // Send initial test notification
      await sendEmulatorNotification(
        'Test Notification', 
        `Testing notifications for stop: ${userBusStop} (Serial: ${userSerialNumber})`,
        { type: 'test', timestamp: new Date().toISOString() }
      );
      
      // Show alert with serialNumber info
      Alert.alert(
        'Testing Notifications', 
        `Your stop: ${userBusStop} (Serial: ${userSerialNumber})\n\nYou will now receive test notifications for different bus positions.`
      );
      
      // Find stops with different serialNumbers relative to user's stop
      const twoStopsBefore = routeStops.find(stop => stop.serialNumber === userSerialNumber - 2);
      const oneStopBefore = routeStops.find(stop => stop.serialNumber === userSerialNumber - 1);
      const atUserStop = userStopInfo;
      const oneStopAfter = routeStops.find(stop => stop.serialNumber === userSerialNumber + 1);
      const twoStopsAfter = routeStops.find(stop => stop.serialNumber === userSerialNumber + 2);
      
      // Force a notification for each notification type to test all scenarios
      if (twoStopsBefore) {
        setTimeout(() => {
          sendNotification(
            'Bus Approaching Soon',
            `Your bus is 2 stops away at ${twoStopsBefore.name} (Serial: ${twoStopsBefore.serialNumber}). Get ready!`
          );
        }, 1000);
      }
      
      if (oneStopBefore) {
        setTimeout(() => {
          sendNotification(
            'Bus Approaching Soon',
            `Your bus is 1 stop away at ${oneStopBefore.name} (Serial: ${oneStopBefore.serialNumber}). Get ready!`
          );
        }, 3000);
      }
      
      setTimeout(() => {
        sendNotification(
          'Bus Arrived at Your Stop',
          `Your bus has arrived at ${atUserStop.name} (Serial: ${atUserStop.serialNumber}). Don't miss it!`
        );
      }, 5000);
      
      if (oneStopAfter) {
        setTimeout(() => {
          sendNotification(
            'Bus Passed Your Stop',
            `The bus has passed your stop and is now at ${oneStopAfter.name} (Serial: ${oneStopAfter.serialNumber}).`
          );
        }, 7000);
      }
      
      if (twoStopsAfter) {
        setTimeout(() => {
          sendNotification(
            'Bus Passed Your Stop',
            `The bus is now 2 stops past your stop at ${twoStopsAfter.name} (Serial: ${twoStopsAfter.serialNumber}).`
          );
        }, 9000);
      }
      
    } catch (error) {
      console.error('EMERGENCY FIX: Error sending test notification:', error);
      Alert.alert('Error', 'Failed to send test notification: ' + error.message);
    }
  };

  // Find user's stop serialNumber
  const userStopInfo = routeStops.find(stop => stop.name === userBusStop);
  const userStopSerialNumber = userStopInfo ? userStopInfo.serialNumber : 'Unknown';
  
  // Get the highest reached serialNumber
  let highestReachedSerialNumber = -1;
  let highestReachedStopName = '';
  
  Object.entries(reachedStops).forEach(([stopName, data]) => {
    if (data.serialNumber > highestReachedSerialNumber) {
      highestReachedSerialNumber = data.serialNumber;
      highestReachedStopName = stopName;
    }
  });
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Emergency Notification Fix</Text>
      
      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>Route: {userRouteNumber || 'None'}</Text>
        <Text style={styles.infoText}>Your Stop: {userBusStop || 'None'} (Serial: {userStopSerialNumber})</Text>
        <Text style={styles.infoText}>
          Current Bus Position: {highestReachedStopName || 'Unknown'} 
          {highestReachedSerialNumber >= 0 ? ` (Serial: ${highestReachedSerialNumber})` : ''}
        </Text>
        <Text style={styles.infoText}>
          Reached Stops: {Object.keys(reachedStops).length > 0 ? 
            Object.entries(reachedStops).map(([name, data]) => 
              `${name} (${data.serialNumber})`
            ).join(', ') : 'None'}
        </Text>
        <Text style={styles.infoText}>
          Last Notification: {lastNotification || 'None'}
        </Text>
      </View>
      
      <Button 
        title="Send Test Notification" 
        onPress={sendTestNotification} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    marginVertical: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  infoContainer: {
    marginVertical: 12,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  infoText: {
    fontSize: 14,
    marginBottom: 4,
  },
});