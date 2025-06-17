import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { onValue, ref } from 'firebase/database';
import { realtimeDatabase } from '../../configs/FirebaseConfigs';

const BusCapacityIndicator = ({ isDark, routeNumber }) => {
  const [capacity, setCapacity] = useState({
    current: 0,
    total: 40, // Default total capacity
    percentage: 0,
    lastUpdated: null
  });
  const [seatAvailability, setSeatAvailability] = useState([]);
  const [loading, setLoading] = useState(true);
  const progressAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    if (!routeNumber) return;
    
    // Reference to bus capacity data in Firebase
    const capacityRef = ref(realtimeDatabase, `busCapacity/route${routeNumber}`);
    
    const unsubscribe = onValue(capacityRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // Calculate percentage
        const percentage = Math.min(100, Math.round((data.currentPassengers / data.totalCapacity) * 100));
        
        // Update capacity state
        setCapacity({
          current: data.currentPassengers || 0,
          total: data.totalCapacity || 40,
          percentage: percentage,
          lastUpdated: data.lastUpdated ? new Date(data.lastUpdated) : new Date()
        });
        
        // Update seat availability if available
        if (data.seatMap) {
          setSeatAvailability(data.seatMap);
        }
        
        // Animate progress bar
        Animated.timing(progressAnim, {
          toValue: percentage / 100,
          duration: 1000,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false
        }).start();
      }
      
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, [routeNumber]);

  // Get color based on capacity percentage
  const getCapacityColor = () => {
    if (capacity.percentage < 50) return '#4CAF50'; // Green
    if (capacity.percentage < 80) return '#FF9800'; // Orange
    return '#F44336'; // Red
  };
  
  // Get text description based on capacity
  const getCapacityDescription = () => {
    if (capacity.percentage < 30) return 'Many seats available';
    if (capacity.percentage < 50) return 'Several seats available';
    if (capacity.percentage < 80) return 'Limited seats available';
    if (capacity.percentage < 95) return 'Standing room only';
    return 'Bus is full';
  };
  
  // Format last updated time
  const formatLastUpdated = () => {
    if (!capacity.lastUpdated) return '';
    
    const now = new Date();
    const diffMs = now - capacity.lastUpdated;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins === 1) return '1 minute ago';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    
    const hours = Math.floor(diffMins / 60);
    if (hours === 1) return '1 hour ago';
    return `${hours} hours ago`;
  };
  
  // Styles based on theme
  const textColor = isDark ? '#fff' : '#000';
  const secondaryTextColor = isDark ? '#aaa' : '#666';
  const backgroundColor = isDark ? '#1E1E1E' : '#f5f5f5';
  const cardBackgroundColor = isDark ? '#2a2a2a' : '#fff';
  
  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor }]}>
        <Text style={[styles.loadingText, { color: textColor }]}>
          Loading bus capacity...
        </Text>
      </View>
    );
  }
  
  if (!routeNumber) {
    return (
      <View style={[styles.container, { backgroundColor }]}>
        <Text style={[styles.errorText, { color: textColor }]}>
          Please select a route to view capacity
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <View style={[styles.card, { backgroundColor: cardBackgroundColor }]}>
        <View style={styles.headerRow}>
          <View style={styles.titleContainer}>
            <Ionicons name="people" size={20} color={getCapacityColor()} />
            <Text style={[styles.title, { color: textColor }]}>
              Bus Capacity
            </Text>
          </View>
          <Text style={[styles.updateTime, { color: secondaryTextColor }]}>
            Updated: {formatLastUpdated()}
          </Text>
        </View>
        
        {/* Capacity Bar */}
        <View style={styles.capacityBarContainer}>
          <Animated.View 
            style={[
              styles.capacityBar,
              { 
                width: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%']
                }),
                backgroundColor: getCapacityColor()
              }
            ]} 
          />
        </View>
        
        <View style={styles.capacityInfoRow}>
          <Text style={[styles.capacityPercentage, { color: getCapacityColor() }]}>
            {capacity.percentage}%
          </Text>
          <Text style={[styles.capacityDescription, { color: textColor }]}>
            {getCapacityDescription()}
          </Text>
          <Text style={[styles.capacityCount, { color: secondaryTextColor }]}>
            {capacity.current}/{capacity.total} passengers
          </Text>
        </View>
        
        {/* Seat Availability Visualization */}
        {seatAvailability.length > 0 && (
          <View style={styles.seatMapContainer}>
            <Text style={[styles.seatMapTitle, { color: textColor }]}>
              Seat Availability
            </Text>
            <View style={styles.seatMap}>
              {seatAvailability.map((seat, index) => (
                <View 
                  key={index}
                  style={[
                    styles.seat,
                    { backgroundColor: seat.isOccupied ? '#F44336' : '#4CAF50' }
                  ]}
                >
                  <Text style={styles.seatText}>{seat.seatNumber}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
    marginVertical: 8,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontFamily: 'flux-bold',
    marginLeft: 8,
  },
  updateTime: {
    fontSize: 12,
    fontFamily: 'flux',
  },
  capacityBarContainer: {
    height: 12,
    backgroundColor: '#e0e0e0',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 8,
  },
  capacityBar: {
    height: '100%',
  },
  capacityInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  capacityPercentage: {
    fontSize: 20,
    fontFamily: 'flux-bold',
  },
  capacityDescription: {
    fontSize: 14,
    fontFamily: 'flux-medium',
  },
  capacityCount: {
    fontSize: 12,
    fontFamily: 'flux',
  },
  seatMapContainer: {
    marginTop: 8,
  },
  seatMapTitle: {
    fontSize: 16,
    fontFamily: 'flux-bold',
    marginBottom: 8,
  },
  seatMap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  seat: {
    width: 30,
    height: 30,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  seatText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'flux-bold',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'flux',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    fontFamily: 'flux',
    textAlign: 'center',
  },
});

export default BusCapacityIndicator;