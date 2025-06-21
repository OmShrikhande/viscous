import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';

/**
 * Loading screen component displayed while map data is being fetched
 */
const LoadingScreen = ({ isDark, onRetry, userRouteNumber }) => {
  return (
    <View style={[
      styles.loadingContainer,
      { backgroundColor: isDark ? '#121212' : '#f9f9f9' }
    ]}>
      <ActivityIndicator size="large" color={isDark ? Colors.LIGHT : Colors.PRIMARY} />
      
      <Text style={[
        styles.loadingText,
        { color: isDark ? '#fff' : '#000' }
      ]}>
        Loading Map Data...
      </Text>
      
      <Text style={[
        styles.loadingSubText,
        { color: isDark ? '#aaa' : '#666' }
      ]}>
        {userRouteNumber 
          ? `Fetching stops for Route ${userRouteNumber}` 
          : 'No route selected. Please update your profile with a route number.'}
      </Text>
      
      <TouchableOpacity
        style={[
          styles.retryButton,
          { backgroundColor: isDark ? Colors.PRIMARY : Colors.SECONDARY }
        ]}
        onPress={onRetry}
      >
        <MaterialIcons name="refresh" size={16} color="#fff" style={{ marginRight: 5 }} />
        <Text style={{ color: '#fff', fontFamily: 'flux-medium' }}>Retry</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    marginBottom: 8,
    fontFamily: 'flux-bold',
  },
  loadingSubText: {
    fontSize: 14,
    textAlign: 'center',
    maxWidth: '80%',
    marginBottom: 20,
    fontFamily: 'flux',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 8,
    width: 120,
  },
});

export default LoadingScreen;