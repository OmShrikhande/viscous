import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { checkFirestoreConnection, getConnectionStatus } from '../utils/firebaseConnectionCheck';

const ConnectionStatus = ({ isDark = false, showDetailedStatus = false }) => {
  const [isConnected, setIsConnected] = useState(true);
  const [isChecking, setIsChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState(null);

  useEffect(() => {
    // Check initial status
    setIsConnected(getConnectionStatus());
    
    // Set up periodic status checks
    const interval = setInterval(() => {
      setIsConnected(getConnectionStatus());
    }, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const handleManualCheck = async () => {
    if (isChecking) return;

    setIsChecking(true);
    try {
      console.log('🔍 Manual connection check initiated...');
      const connectionStatus = await checkFirestoreConnection(true);
      setIsConnected(connectionStatus);
      setLastChecked(new Date());
      
      Alert.alert(
        'Connection Status',
        connectionStatus 
          ? '✅ Firestore connection is working properly!' 
          : '❌ Firestore connection is currently unavailable. Please check your internet connection.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Manual connection check failed:', error);
      setIsConnected(false);
      Alert.alert(
        'Connection Error',
        'Failed to check connection status. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsChecking(false);
    }
  };

  if (!showDetailedStatus && isConnected) {
    return null; // Don't show anything if connected and simple mode
  }

  const containerStyle = [
    styles.container,
    isDark ? styles.darkContainer : styles.lightContainer,
    !isConnected && styles.errorContainer
  ];

  const textStyle = [
    styles.text,
    isDark ? styles.darkText : styles.lightText,
    !isConnected && styles.errorText
  ];

  return (
    <View style={containerStyle}>
      <Text style={textStyle}>
        {isConnected ? '🟢 Connected' : '🔴 Connection Issue'}
      </Text>
      
      {showDetailedStatus && (
        <TouchableOpacity 
          style={styles.checkButton} 
          onPress={handleManualCheck}
          disabled={isChecking}
        >
          <Text style={styles.checkButtonText}>
            {isChecking ? 'Checking...' : 'Test Connection'}
          </Text>
        </TouchableOpacity>
      )}
      
      {showDetailedStatus && lastChecked && (
        <Text style={[styles.lastChecked, textStyle]}>
          Last checked: {lastChecked.toLocaleTimeString()}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 8,
    borderRadius: 8,
    margin: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  lightContainer: {
    backgroundColor: '#f0f0f0',
  },
  darkContainer: {
    backgroundColor: '#333',
  },
  errorContainer: {
    backgroundColor: '#ffe6e6',
  },
  text: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  lightText: {
    color: '#333',
  },
  darkText: {
    color: '#fff',
  },
  errorText: {
    color: '#d32f2f',
  },
  checkButton: {
    backgroundColor: '#1E90FF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: 8,
  },
  checkButtonText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  lastChecked: {
    fontSize: 10,
    opacity: 0.7,
    marginTop: 2,
  },
});

export default ConnectionStatus;