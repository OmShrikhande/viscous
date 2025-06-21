import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Dimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Animated from 'react-native-reanimated';
import { Colors } from '../../constants/Colors';

/**
 * Card displaying information about a selected bus stop
 */
const StopInfoCard = ({ 
  isDark, 
  selectedStop, 
  onClose, 
  animStyle 
}) => {
  if (!selectedStop) return null;
  
  return (
    <Animated.View 
      style={[
        styles.stopInfoCard,
        { backgroundColor: isDark ? 'rgba(30, 30, 30, 0.9)' : 'rgba(255, 255, 255, 0.9)' },
        animStyle
      ]}
    >
      <View style={styles.stopInfoHeader}>
        <View style={styles.headerLeft}>
          <MaterialIcons 
            name="location-on" 
            size={20} 
            color={isDark ? Colors.LIGHT : Colors.PRIMARY} 
          />
          <Text style={[
            styles.stopInfoTitle,
            { color: isDark ? '#fff' : '#000' }
          ]}>
            {selectedStop.name}
          </Text>
        </View>
        
        <TouchableOpacity onPress={onClose}>
          <MaterialIcons 
            name="close" 
            size={20} 
            color={isDark ? '#aaa' : '#666'} 
          />
        </TouchableOpacity>
      </View>
      
      <View style={styles.stopInfoContent}>
        <View style={styles.infoRow}>
          <Text style={[
            styles.infoLabel,
            { color: isDark ? '#aaa' : '#666' }
          ]}>
            Serial Number:
          </Text>
          <Text style={[
            styles.infoValue,
            { color: isDark ? '#fff' : '#000' }
          ]}>
            {selectedStop.serialNumber}
          </Text>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={[
            styles.infoLabel,
            { color: isDark ? '#aaa' : '#666' }
          ]}>
            Status:
          </Text>
          <Text style={[
            styles.infoValue,
            { 
              color: selectedStop.reached ? '#4CAF50' : '#F44336',
              fontFamily: 'flux-bold'
            }
          ]}>
            {selectedStop.reached ? 'Reached' : 'Not Reached'}
          </Text>
        </View>
        
        {selectedStop.time && (
          <View style={styles.infoRow}>
            <Text style={[
              styles.infoLabel,
              { color: isDark ? '#aaa' : '#666' }
            ]}>
              Time:
            </Text>
            <Text style={[
              styles.infoValue,
              { color: isDark ? '#fff' : '#000' }
            ]}>
              {selectedStop.time}
            </Text>
          </View>
        )}
        
        <View style={styles.infoRow}>
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
            {selectedStop.latitude.toFixed(6)}, {selectedStop.longitude.toFixed(6)}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  stopInfoCard: {
    position: 'absolute',
    top: 100,
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
  stopInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stopInfoTitle: {
    fontSize: 16,
    fontFamily: 'flux-bold',
    marginLeft: 8,
  },
  stopInfoContent: {
    marginTop: 4,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    fontFamily: 'flux-medium',
  },
  infoValue: {
    fontSize: 14,
    fontFamily: 'flux',
  },
});

export default StopInfoCard;