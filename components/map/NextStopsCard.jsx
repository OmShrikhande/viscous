import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming
} from 'react-native-reanimated';
import { Colors } from '../../constants/Colors';

/**
 * Card displaying the current and next bus stops
 */
const NextStopsCard = ({ 
  isDark, 
  stops, 
  currentStopSerial, 
  animStyle 
}) => {
  // Animation for pulsing effect
  const pulseAnim = useSharedValue(1);
  
  useEffect(() => {
    pulseAnim.value = withRepeat(
      withTiming(1.3, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
      -1, // Infinite repetitions
      true // Reverse
    );
  }, []);
  
  const pulseStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: pulseAnim.value }],
      opacity: withTiming(pulseAnim.value > 1.15 ? 0.6 : 1, { duration: 300 }),
    };
  });
  
  // If no stops or current stop serial, don't render
  if (!stops || stops.length === 0 || !currentStopSerial) {
    console.log('NextStopsCard not rendering: missing data', { 
      hasStops: !!stops && stops.length > 0, 
      currentStopSerial 
    });
    return null;
  }
  
  console.log('NextStopsCard rendering with currentStopSerial:', currentStopSerial);

  // Find the current stop and next stop
  const sortedStops = [...stops].sort((a, b) => a.serialNumber - b.serialNumber);
  console.log('Sorted stops:', sortedStops.map(s => ({ name: s.name, serial: s.serialNumber })));
  
  const currentStopIndex = sortedStops.findIndex(stop => stop.serialNumber === currentStopSerial);
  console.log('Current stop index:', currentStopIndex, 'for serial:', currentStopSerial);
  
  // If current stop not found, show a fallback message
  if (currentStopIndex === -1) {
    return (
      <Animated.View 
        style={[
          styles.container,
          { backgroundColor: isDark ? 'rgba(30, 30, 30, 0.9)' : 'rgba(255, 255, 255, 0.9)' },
          animStyle
        ]}
      >
        <View style={styles.header}>
          <Ionicons 
            name="navigate" 
            size={20} 
            color={isDark ? Colors.LIGHT : Colors.PRIMARY} 
          />
          <Text style={[styles.headerText, { color: isDark ? '#fff' : '#000' }]}>
            Bus Stops
          </Text>
        </View>
        <Text style={[styles.fallbackText, { color: isDark ? '#aaa' : '#666' }]}>
          Locating nearest stop...
        </Text>
      </Animated.View>
    );
  }

  // Get current stop and next stop (if available)
  const currentStop = sortedStops[currentStopIndex];
  const nextStop = currentStopIndex < sortedStops.length - 1 ? sortedStops[currentStopIndex + 1] : null;
  
  // Get previous stop (if available)
  const prevStop = currentStopIndex > 0 ? sortedStops[currentStopIndex - 1] : null;

  // Theme colors
  const cardBgColor = isDark ? 'rgba(30, 30, 30, 0.9)' : 'rgba(255, 255, 255, 0.9)';
  const textColor = isDark ? '#fff' : '#000';
  const secondaryTextColor = isDark ? '#aaa' : '#666';
  const dividerColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';

  return (
    <Animated.View 
      style={[
        styles.container,
        { backgroundColor: cardBgColor },
        animStyle
      ]}
    >
      <View style={styles.header}>
        <Ionicons 
          name="navigate" 
          size={20} 
          color={isDark ? Colors.LIGHT : Colors.PRIMARY} 
        />
        <Text style={[styles.headerText, { color: textColor }]}>
          Bus Stops
        </Text>
      </View>

      <View style={styles.stopsContainer}>
        {/* Previous Stop */}
        {prevStop && (
          <View style={styles.stopRow}>
            <View style={[styles.stopIndicator, styles.passedStopIndicator]}>
              <Ionicons name="checkmark" size={12} color="#fff" />
            </View>
            <View style={styles.stopInfo}>
              <Text style={[styles.stopName, { color: secondaryTextColor }]}>
                {prevStop.name}
              </Text>
              <Text style={[styles.stopStatus, { color: secondaryTextColor }]}>
                Passed
              </Text>
            </View>
          </View>
        )}

        {/* Divider */}
        {prevStop && <View style={[styles.divider, { backgroundColor: dividerColor }]} />}

        {/* Current Stop */}
        <View style={styles.stopRow}>
          <View style={[styles.stopIndicator, styles.currentStopIndicator]}>
            <Animated.View style={[styles.pulsingDot, pulseStyle]} />
          </View>
          <View style={styles.stopInfo}>
            <Text style={[styles.stopName, styles.currentStopName, { color: textColor }]}>
              {currentStop.name}
            </Text>
            <View style={styles.currentStopBadge}>
              <Text style={styles.currentStopBadgeText}>Current</Text>
            </View>
          </View>
        </View>

        {/* Divider */}
        {nextStop && <View style={[styles.divider, { backgroundColor: dividerColor }]} />}

        {/* Next Stop */}
        {nextStop && (
          <View style={styles.stopRow}>
            <View style={[styles.stopIndicator, styles.nextStopIndicator]} />
            <View style={styles.stopInfo}>
              <Text style={[styles.stopName, { color: textColor }]}>
                {nextStop.name}
              </Text>
              <Text style={[styles.stopStatus, styles.nextStopStatus, { color: secondaryTextColor }]}>
                Next stop
              </Text>
            </View>
          </View>
        )}
      </View>
    </Animated.View>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 100,
    right: 16,
    width: width * 0.5,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 8,
    zIndex: 999, // Ensure it's above other elements
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerText: {
    fontSize: 16,
    fontFamily: 'flux-bold',
    marginLeft: 8,
  },
  stopsContainer: {
    marginTop: 4,
  },
  stopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  stopIndicator: {
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  passedStopIndicator: {
    backgroundColor: '#4CAF50', // Green
  },
  currentStopIndicator: {
    backgroundColor: '#1E90FF', // Blue
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  nextStopIndicator: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#FF9800', // Orange
  },
  pulsingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#fff',
  },
  stopInfo: {
    flex: 1,
  },
  stopName: {
    fontSize: 14,
    fontFamily: 'flux-medium',
    marginBottom: 2,
  },
  currentStopName: {
    fontFamily: 'flux-bold',
  },
  stopStatus: {
    fontSize: 12,
    fontFamily: 'flux',
  },
  nextStopStatus: {
    color: '#FF9800', // Orange
  },
  currentStopBadge: {
    backgroundColor: '#1E90FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  currentStopBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontFamily: 'flux-bold',
  },
  divider: {
    height: 1,
    marginVertical: 4,
    marginLeft: 30,
  },
  fallbackText: {
    fontSize: 14,
    fontFamily: 'flux',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 10,
  },
});

export default NextStopsCard;