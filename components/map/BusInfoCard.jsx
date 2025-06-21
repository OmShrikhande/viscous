import React from 'react';
import { StyleSheet, Text, View, Dimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Animated from 'react-native-reanimated';
import { Colors } from '../../constants/Colors';

/**
 * Card displaying current bus information
 */
const BusInfoCard = ({ 
  isDark, 
  speed, 
  timestamp, 
  location, 
  animStyle 
}) => {
  return (
    <Animated.View 
      style={[
        styles.busInfoCard,
        { backgroundColor: isDark ? 'rgba(30, 30, 30, 0.9)' : 'rgba(255, 255, 255, 0.9)' },
        animStyle
      ]}
    >
      <View style={styles.busInfoHeader}>
        <MaterialIcons 
          name="directions-bus" 
          size={20} 
          color={isDark ? Colors.LIGHT : Colors.PRIMARY} 
        />
        <Text style={[
          styles.busInfoTitle,
          { color: isDark ? '#fff' : '#000' }
        ]}>
          Bus Information
        </Text>
      </View>
      
      <View style={styles.busInfoContent}>
        <View style={styles.infoItem}>
          <MaterialIcons 
            name="speed" 
            size={20} 
            color={isDark ? Colors.LIGHT : Colors.PRIMARY} 
          />
          <Text style={[
            styles.infoLabel,
            { color: isDark ? '#aaa' : '#666' }
          ]}>
            Speed:
          </Text>
          <Text style={[
            styles.infoValue,
            { color: isDark ? '#fff' : '#000' }
          ]}>
            {speed ? `${speed} km/h` : 'Loading...'}
          </Text>
        </View>
        
        <View style={styles.infoItem}>
          <MaterialIcons 
            name="access-time" 
            size={20} 
            color={isDark ? Colors.LIGHT : Colors.PRIMARY} 
          />
          <Text style={[
            styles.infoLabel,
            { color: isDark ? '#aaa' : '#666' }
          ]}>
            Last Update:
          </Text>
          <Text style={[
            styles.infoValue,
            { color: isDark ? '#fff' : '#000' }
          ]}>
            {timestamp ? new Date(timestamp).toLocaleTimeString() : 'Loading...'}
          </Text>
        </View>
        
        <View style={styles.infoItem}>
          <MaterialIcons 
            name="location-on" 
            size={20} 
            color={isDark ? Colors.LIGHT : Colors.PRIMARY} 
          />
          <Text style={[
            styles.infoLabel,
            { color: isDark ? '#aaa' : '#666' }
          ]}>
            Coordinates:
          </Text>
          <Text style={[
            styles.infoValue,
            { color: isDark ? '#fff' : '#000' }
          ]}>
            {location ? `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}` : 'Loading...'}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  busInfoCard: {
    position: 'absolute',
    bottom: 100,
    left: 16,
    right: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 10,
  },
  busInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  busInfoTitle: {
    fontSize: 16,
    fontFamily: 'flux-bold',
    marginLeft: 8,
  },
  busInfoContent: {
    marginTop: 4,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  infoLabel: {
    fontSize: 14,
    fontFamily: 'flux-medium',
    marginLeft: 8,
    marginRight: 4,
  },
  infoValue: {
    fontSize: 14,
    fontFamily: 'flux',
  },
});

export default BusInfoCard;