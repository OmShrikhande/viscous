import { Ionicons } from '@expo/vector-icons';
import { onValue, ref } from 'firebase/database';
import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { realtimeDatabase } from '../../configs/FirebaseConfigs';

const BusCapacityIndicator = ({ isDark, routeNumber, refreshing }) => {
  const [capacity, setCapacity] = useState({
    current: 0,
    total: 40, // Default total capacity
    percentage: 0,
    lastUpdated: null
  });
  const [seatAvailability, setSeatAvailability] = useState([]);
  const [loading, setLoading] = useState(true);
  const [manualRefreshing, setManualRefreshing] = useState(false);
  const progressAnim = useState(new Animated.Value(0))[0];

  // Manual refresh function
  const handleManualRefresh = async () => {
    setManualRefreshing(true);
    try {
      console.log('🔄 Manual refresh triggered for BusCapacityIndicator');
      
      // Reset states
      setCapacity({
        current: 0,
        total: 40,
        percentage: 0,
        lastUpdated: null
      });
      setSeatAvailability([]);
      setLoading(true);
      
      // Animate progress bar back to 0
      Animated.timing(progressAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false
      }).start();
      
      // Small delay to show loading state
      setTimeout(() => {
        setManualRefreshing(false);
      }, 1500);
      
    } catch (error) {
      console.error('Error during manual refresh:', error);
      setManualRefreshing(false);
    }
  };

  // Handle refresh from parent component
  useEffect(() => {
    if (refreshing && !manualRefreshing) {
      console.log('🔄 Parent refresh detected for BusCapacityIndicator');
      handleManualRefresh();
    }
  }, [refreshing]);

  useEffect(() => {
    if (!routeNumber) return;
    
    // Reference to bus capacity data in Firebase
    const capacityRef = ref(realtimeDatabase, `Route${routeNumber}/demo/capacity`);
    
    // Also get the total capacity reference
    const totalCapacityRef = ref(realtimeDatabase, `busCapacity/route${routeNumber}`);
    
    // Set loading state
    setLoading(true);
    
    // First get the total capacity data
    onValue(totalCapacityRef, (totalCapSnapshot) => {
      const totalCapData = totalCapSnapshot.val();
      const totalCapacity = totalCapData?.totalCapacity || 40;
      const seatMap = totalCapData?.seatMap || [];
      
      // Now listen for current capacity changes
      const unsubscribe = onValue(capacityRef, (snapshot) => {
        const currentPassengers = snapshot.val() || 0;
        
        // Calculate percentage
        const percentage = Math.min(100, Math.round((currentPassengers / totalCapacity) * 100));
        
        // Update capacity state
        setCapacity({
          current: currentPassengers,
          total: totalCapacity,
          percentage: percentage,
          lastUpdated: new Date()
        });
        
        // Update seat availability if available
        if (seatMap.length > 0) {
          // Create a new seat map with the first N seats occupied based on currentPassengers
          const updatedSeatMap = seatMap.map((seat, index) => ({
            ...seat,
            isOccupied: index < currentPassengers
          }));
          setSeatAvailability(updatedSeatMap);
        } else {
          // Generate a default seat map if none exists
          const defaultSeatMap = Array.from({ length: totalCapacity }, (_, i) => ({
            seatNumber: i + 1,
            isOccupied: i < currentPassengers
          }));
          setSeatAvailability(defaultSeatMap);
        }
        
        // Animate progress bar - use a local reference to avoid memory leaks
        const animation = Animated.timing(progressAnim, {
          toValue: percentage / 100,
          duration: 1000,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false
        });
        
        animation.start();
        setLoading(false);
      }, (error) => {
        console.error('Error in bus capacity listener:', error);
        setLoading(false);
      });
      
      // Return the unsubscribe function
      return () => {
        console.log('Cleaning up bus capacity listener');
        unsubscribe();
      };
    }, (error) => {
      console.error('Error in total capacity listener:', error);
      setLoading(false);
    });
    
    // Cleanup function will be handled by the inner onValue listener
    return () => {
      console.log('Cleaning up capacity listeners');
      // The inner onValue listener will handle its own cleanup
    };
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
          <View style={styles.headerRight}>
            <Text style={[styles.updateTime, { color: secondaryTextColor }]}>
              Updated: {formatLastUpdated()}
            </Text>
            <TouchableOpacity 
              style={[
                styles.refreshButton, 
                { 
                  backgroundColor: isDark ? '#333' : '#e0e0e0',
                  opacity: (manualRefreshing || refreshing) ? 0.6 : 1
                }
              ]}
              onPress={handleManualRefresh}
              disabled={manualRefreshing || refreshing}
            >
              <Ionicons 
                name="refresh" 
                size={16} 
                color={getCapacityColor()} 
                style={{
                  transform: [{ rotate: (manualRefreshing || refreshing) ? '360deg' : '0deg' }]
                }}
              />
            </TouchableOpacity>
          </View>
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  updateTime: {
    fontSize: 12,
    fontFamily: 'flux',
  },
  refreshButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
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