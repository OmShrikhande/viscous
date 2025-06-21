import React from 'react';
import { StyleSheet, Text, View, Dimensions } from 'react-native';
import Slider from '@react-native-community/slider';
import { MaterialIcons } from '@expo/vector-icons';
import Animated from 'react-native-reanimated';
import { Colors } from '../../constants/Colors';

/**
 * Zoom control slider component
 */
const ZoomControl = ({ 
  isDark, 
  zoom, 
  onZoomChange, 
  animStyle 
}) => {
  return (
    <Animated.View 
      style={[
        styles.zoomCard,
        { backgroundColor: isDark ? 'rgba(30, 30, 30, 0.9)' : 'rgba(255, 255, 255, 0.9)' },
        animStyle
      ]}
    >
      <View style={styles.zoomHeader}>
        <MaterialIcons 
          name="zoom-in" 
          size={20} 
          color={isDark ? Colors.LIGHT : Colors.PRIMARY} 
        />
        <Text style={[
          styles.zoomTitle,
          { color: isDark ? '#fff' : '#000' }
        ]}>
          Zoom Level
        </Text>
      </View>
      
      <View style={styles.sliderContainer}>
        <MaterialIcons 
          name="zoom-out" 
          size={18} 
          color={isDark ? '#aaa' : '#666'} 
        />
        <Slider
          style={styles.slider}
          minimumValue={0.005}
          maximumValue={0.1}
          value={zoom}
          onValueChange={onZoomChange}
          minimumTrackTintColor={isDark ? Colors.LIGHT : Colors.PRIMARY}
          maximumTrackTintColor={isDark ? '#555' : '#ccc'}
          thumbTintColor={isDark ? Colors.LIGHT : Colors.PRIMARY}
        />
        <MaterialIcons 
          name="zoom-in" 
          size={18} 
          color={isDark ? '#aaa' : '#666'} 
        />
      </View>
    </Animated.View>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  zoomCard: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 10,
  },
  zoomHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  zoomTitle: {
    fontSize: 14,
    fontFamily: 'flux-bold',
    marginLeft: 8,
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  slider: {
    flex: 1,
    height: 40,
    marginHorizontal: 8,
  },
});

export default ZoomControl;