/**
 * Enhanced Bus Stop Timeline with Dynamic Reordering
 * 
 * Features:
 * - Real-time updates using Firestore onSnapshot
 * - Dynamic reordering based on most recently reached stops
 * - Direction-independent tracking
 * - Optimized performance with intelligent caching
 * - Smooth animations for reordering
 */

import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  RefreshControl
} from 'react-native';
import Animated, { 
  FadeInDown, 
  FadeOutUp, 
  Layout,
  SlideInRight,
  SlideOutLeft,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming
} from 'react-native-reanimated';
import { firestoreDb } from '../../configs/FirebaseConfigs';

const { width } = Dimensions.get('window');

const EnhancedBusStopTimeline = ({ isDark, refreshing: externalRefreshing }) => {
  // State management
  const [userRouteNumber, setUserRouteNumber] = useState('');
  const [userBusStop, setUserBusStop] = useState('');
  const [stops, setStops] = useState([]);
  const [orderedStops, setOrderedStops] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState(null);
  const [reorderCount, setReorderCount] = useState(0);
  
  // Real-time listener state
  const [stopsListener, setStopsListener] = useState(null);
  
  // Animation values
  const fadeAnim = useSharedValue(1);
  const scaleAnim = useSharedValue(1);
  
  /**
   * Load user preferences from AsyncStorage
   */
  const loadUserPreferences = useCallback(async () => {
    try {
      const [routeNumber, busStop] = await Promise.all([
        AsyncStorage.getItem('userRouteNumber'),
        AsyncStorage.getItem('userBusStop')
      ]);
      
      if (routeNumber) setUserRouteNumber(routeNumber);
      if (busStop) setUserBusStop(busStop);
      
      console.log('📱 User preferences loaded:', { routeNumber, busStop });
    } catch (error) {
      console.error('❌ Error loading user preferences:', error);
    }
  }, []);
  
  /**
   * Process and order stops based on reach status and timestamps
   */
  const processStopsOrdering = useCallback((stopsData) => {
    console.log('🔄 Processing stops ordering...');
    
    // Separate reached and unreached stops
    const reachedStops = stopsData.filter(stop => stop.reached);
    const unreachedStops = stopsData.filter(stop => !stop.reached);
    
    // Sort reached stops by most recent first (using lastReachedTimestamp or reachedAt)
    reachedStops.sort((a, b) => {
      const aTime = a.lastReachedTimestamp || (a.reachedAt?.toMillis ? a.reachedAt.toMillis() : 0);
      const bTime = b.lastReachedTimestamp || (b.reachedAt?.toMillis ? b.reachedAt.toMillis() : 0);
      return bTime - aTime; // Most recent first
    });
    
    // Sort unreached stops by serial number or alphabetically
    unreachedStops.sort((a, b) => {
      const aSerial = a.serialNumber || 999;
      const bSerial = b.serialNumber || 999;
      if (aSerial !== bSerial) return aSerial - bSerial;
      return a.id.localeCompare(b.id);
    });
    
    // Assign display serial numbers
    const orderedList = [];
    
    // Add reached stops with serial numbers 1, 2, 3...
    reachedStops.forEach((stop, index) => {
      orderedList.push({
        ...stop,
        displaySerialNumber: index + 1,
        isRecentlyReached: true
      });
    });
    
    // Add unreached stops with continuing serial numbers
    unreachedStops.forEach((stop, index) => {
      orderedList.push({
        ...stop,
        displaySerialNumber: reachedStops.length + index + 1,
        isRecentlyReached: false
      });
    });
    
    console.log(`✅ Stops ordered: ${reachedStops.length} reached, ${unreachedStops.length} unreached`);
    return orderedList;
  }, []);
  
  /**
   * Start real-time Firestore listener
   */
  const startStopsListener = useCallback(() => {
    console.log('🔄 Starting real-time stops listener...');
    
    try {
      // Create query for Route2 collection
      const route2Ref = collection(firestoreDb, 'Route2');
      const q = query(route2Ref, orderBy('serialNumber', 'asc'));
      
      // Set up real-time listener
      const unsubscribe = onSnapshot(q, 
        (snapshot) => {
          console.log('📍 Real-time stops update received');
          
          const stopsData = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            if (data.Latitude && data.Longitude) {
              stopsData.push({
                id: doc.id,
                latitude: data.Latitude,
                longitude: data.Longitude,
                reached: data.reached || false,
                reachedAt: data.reachedAt || null,
                reachedTime: data.reachedTime || null,
                reachedDate: data.reachedDate || null,
                serialNumber: data.serialNumber || 0,
                lastReachedTimestamp: data.lastReachedTimestamp || null,
                lastReorderTime: data.lastReorderTime || null
              });
            }
          });
          
          // Process and order stops
          const ordered = processStopsOrdering(stopsData);
          
          // Check if order has changed
          const hasOrderChanged = JSON.stringify(ordered.map(s => s.id)) !== 
                                 JSON.stringify(orderedStops.map(s => s.id));
          
          if (hasOrderChanged) {
            console.log('🔄 Stop order changed, updating UI...');
            setReorderCount(prev => prev + 1);
            
            // Animate the change
            scaleAnim.value = withSpring(0.95, {}, () => {
              scaleAnim.value = withSpring(1);
            });
          }
          
          setStops(stopsData);
          setOrderedStops(ordered);
          setLastUpdateTime(new Date().toISOString());
          setIsLoading(false);
          setError(null);
        },
        (error) => {
          console.error('❌ Error in stops listener:', error);
          setError('Real-time updates failed. Please refresh.');
          setIsLoading(false);
        }
      );
      
      setStopsListener(() => unsubscribe);
      console.log('✅ Real-time stops listener started');
      
    } catch (error) {
      console.error('❌ Error starting stops listener:', error);
      setError('Failed to start real-time updates');
      setIsLoading(false);
    }
  }, [processStopsOrdering, orderedStops, scaleAnim]);
  
  /**
   * Handle manual refresh
   */
  const handleRefresh = useCallback(async () => {
    console.log('🔄 Manual refresh triggered');
    setRefreshing(true);
    
    try {
      // Restart the listener to get fresh data
      if (stopsListener) {
        stopsListener();
      }
      
      // Small delay for better UX
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      startStopsListener();
      
    } catch (error) {
      console.error('❌ Error during refresh:', error);
      setError('Refresh failed. Please try again.');
    } finally {
      setRefreshing(false);
    }
  }, [stopsListener, startStopsListener]);
  
  /**
   * Initialize component
   */
  useEffect(() => {
    const initialize = async () => {
      console.log('🚀 Initializing Enhanced Bus Stop Timeline...');
      
      await loadUserPreferences();
      startStopsListener();
    };
    
    initialize();
    
    // Cleanup on unmount
    return () => {
      if (stopsListener) {
        console.log('🧹 Cleaning up stops listener');
        stopsListener();
      }
    };
  }, [loadUserPreferences, startStopsListener]);
  
  /**
   * Handle external refresh prop
   */
  useEffect(() => {
    if (externalRefreshing) {
      handleRefresh();
    }
  }, [externalRefreshing, handleRefresh]);
  
  /**
   * Animated styles
   */
  const animatedContainerStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scaleAnim.value }],
      opacity: fadeAnim.value
    };
  });
  
  /**
   * Memoized stop item component
   */
  const StopItem = useMemo(() => {
    return ({ stop, index }) => {
      const isUserStop = stop.id === userBusStop;
      const isReached = stop.reached;
      const isRecentlyReached = stop.isRecentlyReached;
      
      return (
        <Animated.View
          key={`${stop.id}-${stop.displaySerialNumber}`}
          entering={SlideInRight.delay(index * 100)}
          exiting={SlideOutLeft}
          layout={Layout.springify()}
          style={[
            styles.stopItem,
            isDark ? styles.stopItemDark : styles.stopItemLight,
            isUserStop && styles.userStopItem,
            isReached && styles.reachedStopItem,
            isRecentlyReached && styles.recentlyReachedStopItem
          ]}
        >
          <View style={styles.stopHeader}>
            <View style={styles.serialNumberContainer}>
              <Text style={[
                styles.serialNumber,
                isDark ? styles.textDark : styles.textLight,
                isRecentlyReached && styles.recentSerialNumber
              ]}>
                {stop.displaySerialNumber}
              </Text>
            </View>
            
            <View style={styles.stopInfo}>
              <Text style={[
                styles.stopName,
                isDark ? styles.textDark : styles.textLight,
                isUserStop && styles.userStopName
              ]}>
                {stop.id}
              </Text>
              
              {isReached && (
                <Text style={[
                  styles.reachedTime,
                  isDark ? styles.reachedTimeDark : styles.reachedTimeLight
                ]}>
                  Reached at {stop.reachedTime}
                </Text>
              )}
            </View>
            
            <View style={styles.statusContainer}>
              {isReached ? (
                <Ionicons 
                  name="checkmark-circle" 
                  size={24} 
                  color={isRecentlyReached ? "#4CAF50" : "#81C784"} 
                />
              ) : (
                <Ionicons 
                  name="radio-button-off" 
                  size={24} 
                  color={isDark ? "#666" : "#999"} 
                />
              )}
              
              {isUserStop && (
                <Ionicons 
                  name="person" 
                  size={20} 
                  color="#2196F3" 
                  style={styles.userIcon}
                />
              )}
            </View>
          </View>
          
          {isRecentlyReached && (
            <View style={styles.recentBadge}>
              <Text style={styles.recentBadgeText}>Recently Reached</Text>
            </View>
          )}
        </Animated.View>
      );
    };
  }, [userBusStop, isDark]);
  
  /**
   * Render loading state
   */
  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={[styles.loadingText, isDark ? styles.textDark : styles.textLight]}>
          Loading stops...
        </Text>
      </View>
    );
  }
  
  /**
   * Render error state
   */
  if (error) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Ionicons name="alert-circle" size={48} color="#F44336" />
        <Text style={[styles.errorText, isDark ? styles.textDark : styles.textLight]}>
          {error}
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  /**
   * Main render
   */
  return (
    <Animated.View style={[styles.container, animatedContainerStyle]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, isDark ? styles.textDark : styles.textLight]}>
          Bus Stops Timeline
        </Text>
        <View style={styles.headerInfo}>
          <Text style={[styles.subtitle, isDark ? styles.textDark : styles.textLight]}>
            {orderedStops.filter(s => s.reached).length} of {orderedStops.length} reached
          </Text>
          {lastUpdateTime && (
            <Text style={[styles.lastUpdate, isDark ? styles.textDark : styles.textLight]}>
              Updated: {new Date(lastUpdateTime).toLocaleTimeString()}
            </Text>
          )}
        </View>
      </View>
      
      {/* Reorder indicator */}
      {reorderCount > 0 && (
        <Animated.View 
          entering={FadeInDown}
          exiting={FadeOutUp}
          style={styles.reorderIndicator}
        >
          <Ionicons name="swap-vertical" size={16} color="#4CAF50" />
          <Text style={styles.reorderText}>
            Stops reordered {reorderCount} time{reorderCount !== 1 ? 's' : ''}
          </Text>
        </Animated.View>
      )}
      
      {/* Stops list */}
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#2196F3']}
            tintColor="#2196F3"
          />
        }
      >
        {orderedStops.map((stop, index) => (
          <StopItem key={`${stop.id}-${stop.displaySerialNumber}`} stop={stop} index={index} />
        ))}
        
        {orderedStops.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="location-outline" size={48} color="#999" />
            <Text style={[styles.emptyText, isDark ? styles.textDark : styles.textLight]}>
              No stops found
            </Text>
          </View>
        )}
      </ScrollView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  headerInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
  },
  lastUpdate: {
    fontSize: 12,
    opacity: 0.5,
  },
  reorderIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 12,
    alignSelf: 'center',
  },
  reorderText: {
    marginLeft: 6,
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  stopItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  stopItemLight: {
    backgroundColor: '#fff',
  },
  stopItemDark: {
    backgroundColor: '#2C2C2C',
  },
  userStopItem: {
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  reachedStopItem: {
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  recentlyReachedStopItem: {
    backgroundColor: '#F3E5F5',
    borderLeftColor: '#9C27B0',
  },
  stopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  serialNumberContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  serialNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  recentSerialNumber: {
    color: '#9C27B0',
  },
  stopInfo: {
    flex: 1,
  },
  stopName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  userStopName: {
    color: '#2196F3',
  },
  reachedTime: {
    fontSize: 14,
    opacity: 0.7,
  },
  reachedTimeLight: {
    color: '#4CAF50',
  },
  reachedTimeDark: {
    color: '#81C784',
  },
  statusContainer: {
    alignItems: 'center',
  },
  userIcon: {
    marginTop: 4,
  },
  recentBadge: {
    backgroundColor: '#9C27B0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  recentBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    opacity: 0.7,
  },
  textLight: {
    color: '#000',
  },
  textDark: {
    color: '#fff',
  },
});

export default EnhancedBusStopTimeline;