import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Platform } from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

const LocationPermissionManager = ({ isDark, onPermissionGranted }) => {
  const [permissionStatus, setPermissionStatus] = useState('unknown');
  const [isChecking, setIsChecking] = useState(true);
  
  useEffect(() => {
    checkLocationPermission();
  }, []);
  
  const checkLocationPermission = async () => {
    try {
      setIsChecking(true);
      
      const { status: foregroundStatus } = await Location.getForegroundPermissionsAsync();
      const { status: backgroundStatus } = await Location.getBackgroundPermissionsAsync();
      
      if (foregroundStatus === 'granted' && backgroundStatus === 'granted') {
        setPermissionStatus('granted');
        if (onPermissionGranted) onPermissionGranted();
      } else if (foregroundStatus === 'granted') {
        setPermissionStatus('foreground-only');
      } else {
        setPermissionStatus('denied');
      }
    } catch (error) {
      console.error('Error checking location permission:', error);
      setPermissionStatus('error');
    } finally {
      setIsChecking(false);
    }
  };
  
  const requestLocationPermission = async () => {
    try {
      setIsChecking(true);
      
      // Request foreground permission first
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      
      if (foregroundStatus !== 'granted') {
        setPermissionStatus('denied');
        setIsChecking(false);
        return;
      }
      
      // Then request background permission
      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
      
      if (backgroundStatus === 'granted') {
        setPermissionStatus('granted');
        if (onPermissionGranted) onPermissionGranted();
      } else {
        setPermissionStatus('foreground-only');
      }
    } catch (error) {
      console.error('Error requesting location permission:', error);
      setPermissionStatus('error');
    } finally {
      setIsChecking(false);
    }
  };
  
  const openSettings = () => {
    Linking.openSettings();
  };
  
  // Styles based on theme
  const textColor = isDark ? '#fff' : '#000';
  const secondaryTextColor = isDark ? '#aaa' : '#666';
  const backgroundColor = isDark ? 'rgba(30, 30, 30, 0.7)' : 'rgba(255, 255, 255, 0.7)';
  const buttonColor = isDark ? '#1E90FF' : '#2196F3';
  
  if (isChecking) {
    return null;
  }
  
  if (permissionStatus === 'granted') {
    return null;
  }
  
  return (
    <View style={styles.container}>
      <BlurView intensity={30} style={[styles.blurContainer, { backgroundColor }]} tint={isDark ? 'dark' : 'light'}>
        <View style={styles.iconContainer}>
          <Ionicons 
            name="location" 
            size={32} 
            color={permissionStatus === 'denied' ? '#F44336' : '#FF9800'} 
          />
        </View>
        
        <Text style={[styles.title, { color: textColor }]}>
          {permissionStatus === 'denied' 
            ? 'Location Permission Required' 
            : 'Background Location Needed'}
        </Text>
        
        <Text style={[styles.description, { color: secondaryTextColor }]}>
          {permissionStatus === 'denied' 
            ? 'This app needs location permission to detect when you board or leave the bus.' 
            : 'Background location permission is needed to track bus proximity even when the app is closed.'}
        </Text>
        
        <TouchableOpacity 
          style={[styles.button, { backgroundColor: buttonColor }]}
          onPress={permissionStatus === 'denied' ? requestLocationPermission : openSettings}
        >
          <Text style={styles.buttonText}>
            {permissionStatus === 'denied' ? 'Grant Permission' : 'Open Settings'}
          </Text>
        </TouchableOpacity>
      </BlurView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  blurContainer: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontFamily: 'flux-bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    fontFamily: 'flux',
    textAlign: 'center',
    marginBottom: 16,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'flux-bold',
  },
});

export default LocationPermissionManager;