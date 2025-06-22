import { Ionicons, MaterialIcons } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useRouter } from 'expo-router'
import { doc, onSnapshot } from 'firebase/firestore'
import { useEffect, useRef, useState } from 'react'
import { Animated, RefreshControl, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import BusCapacityIndicator from '../../components/home/BusCapacityIndicator'
import BusStopNotifications from '../../components/home/BusStopNotifications'
import BusStopTimeline from '../../components/home/BusStopTimeline'
import Header from '../../components/home/Header'
import TrackingManager from '../../components/tracking/TrackingManager'
import UserDataManager from '../../components/usefulComponent/UserDataManager'
import { firestoreDb } from '../../configs/FirebaseConfigs'
import { Colors } from '../../constants/Colors'
import { initializeNotifications } from '../../utils/notificationHelper'

export default function  Home() {
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('timeline');
  const [isDark, setIsDark] = useState(false);
  const [userEmail, setUserEmail] = useState(null);
  const [userRouteNumber, setUserRouteNumber] = useState('');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const router = useRouter();

  // Load user theme and initialize notifications
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userDataJson = await AsyncStorage.getItem('userData');
        
        if (!userDataJson) {
          console.warn('⚠️ userData not found in AsyncStorage');
          return;
        }
        
        const userData = JSON.parse(userDataJson);
        setUserEmail(userData.email);
        setUserRouteNumber(userData.routeNumber || '');
        
        if (!userData.email) {
          console.warn('⚠️ Email not found inside userData');
          return;
        }
        
        const userDocRef = doc(firestoreDb, 'userdata', userData.email);
        const unsub = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setIsDark(data.isDark === true);
            
            // Update route number if it exists in Firestore
            if (data.routeNumber && data.routeNumber !== userRouteNumber) {
              setUserRouteNumber(data.routeNumber);
              // Also update in AsyncStorage
              AsyncStorage.getItem('userData').then(storedData => {
                if (storedData) {
                  const parsedData = JSON.parse(storedData);
                  AsyncStorage.setItem('userData', JSON.stringify({
                    ...parsedData,
                    routeNumber: data.routeNumber
                  }));
                }
              });
            }
          }
        });
        
        return () => unsub();
      } catch (err) {
        console.error('Failed to fetch user data:', err);
      }
    };
    
    fetchUserData();
    
    // Initialize notifications
    initializeNotifications();
    
    // Register background tasks
    import('../../utils/backgroundTasks').then(module => {
      module.registerBackgroundTasks();
    });
  }, []);

  // Animation when component mounts
  useEffect(() => {
    // Use a small delay to avoid conflict with layout animations
    const animationTimeout = setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        })
      ]).start();
    }, 100);
    
    return () => clearTimeout(animationTimeout);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    // Simulate a network request or data refresh
    setTimeout(() => {
      setRefreshing(false);
    }, 2000);
  };

  const handleMapViewPress = () => {
    router.push('/map');
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'timeline':
        return (
          <Animated.View 
            style={[
              styles.tabContent, 
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
            ]}
          >
            <BusStopNotifications isDark={isDark} />
            <TrackingManager isDark={isDark} />
            <BusStopTimeline isDark={isDark} />
            <BusCapacityIndicator isDark={isDark} routeNumber={userRouteNumber} />
          </Animated.View>
        );
      case 'map':
        return (
          <Animated.View 
            style={[
              styles.tabContent, 
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
            ]}
          >
            <TouchableOpacity 
              style={styles.mapViewButton}
              onPress={handleMapViewPress}
              activeOpacity={0.8}
            >
              <View style={styles.mapIconContainer}>
                <Ionicons name="map" size={40} color={Colors.WHITE} />
              </View>
              <Text style={styles.mapViewButtonText}>Open Full Map View</Text>
              <MaterialIcons name="arrow-forward" size={24} color={isDark ? Colors.WHITE : Colors.PRIMARY} />
            </TouchableOpacity>
            
            <View style={[styles.mapInfoContainer, isDark && styles.mapInfoContainerDark]}>
              <View style={styles.mapInfoItem}>
                <MaterialIcons name="location-on" size={24} color={isDark ? Colors.LIGHT : Colors.SECONDARY} />
                <Text style={[styles.mapInfoText, isDark && styles.textDark]}>
                  View real-time bus location
                </Text>
              </View>
              
              <View style={styles.mapInfoItem}>
                <MaterialIcons name="directions" size={24} color={isDark ? Colors.LIGHT : Colors.SECONDARY} />
                <Text style={[styles.mapInfoText, isDark && styles.textDark]}>
                  Track all bus stops on the map
                </Text>
              </View>
              
              <View style={styles.mapInfoItem}>
                <MaterialIcons name="zoom-in-map" size={24} color={isDark ? Colors.LIGHT : Colors.SECONDARY} />
                <Text style={[styles.mapInfoText, isDark && styles.textDark]}>
                  Zoom and pan for detailed view
                </Text>
              </View>
            </View>
          </Animated.View>
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={[
      styles.container, 
      isDark && styles.containerDark
    ]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={isDark ? Colors.dark.background : Colors.PRIMARY} />
      <UserDataManager />
      
      {/* Header Section */}
      <Header isDark={isDark} />
      
      {/* Main Content */}
      <ScrollView
        contentContainerStyle={styles.scrollViewContent}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={[Colors.PRIMARY, Colors.SECONDARY]} 
            tintColor={isDark ? Colors.WHITE : Colors.PRIMARY}
          />
        }
      >
        {/* Content Card */}
        <Animated.View 
          style={[
            styles.contentCard,
            isDark && styles.contentCardDark,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
          ]}
        >
          <View style={[styles.cardHeader, isDark && styles.cardHeaderDark]}>
            <Text style={[styles.cardTitle, isDark && styles.textDark]}>Bus Tracking</Text>
            <View style={styles.statusIndicator}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Live</Text>
            </View>
          </View>
          
          {/* Tab Navigation */}
          <View style={[styles.tabContainer, isDark && styles.tabContainerDark]}>
            <TouchableOpacity 
              style={[
                styles.tabButton, 
                activeTab === 'timeline' && styles.activeTab,
                activeTab === 'timeline' && isDark && styles.activeTabDark
              ]}
              onPress={() => setActiveTab('timeline')}
            >
              <MaterialIcons 
                name="timeline" 
                size={24} 
                color={
                  activeTab === 'timeline' 
                    ? (isDark ? Colors.LIGHT : Colors.PRIMARY) 
                    : (isDark ? '#6c757d' : Colors.GRAY)
                } 
              />
              <Text style={[
                styles.tabText, 
                isDark && styles.tabTextDark,
                activeTab === 'timeline' && styles.activeTabText,
                activeTab === 'timeline' && isDark && styles.activeTabTextDark
              ]}>
                Timeline
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.tabButton, 
                activeTab === 'map' && styles.activeTab,
                activeTab === 'map' && isDark && styles.activeTabDark
              ]}
              onPress={() => setActiveTab('map')}
            >
              <MaterialIcons 
                name="map" 
                size={24} 
                color={
                  activeTab === 'map' 
                    ? (isDark ? Colors.LIGHT : Colors.PRIMARY) 
                    : (isDark ? '#6c757d' : Colors.GRAY)
                } 
              />
              <Text style={[
                styles.tabText, 
                isDark && styles.tabTextDark,
                activeTab === 'map' && styles.activeTabText,
                activeTab === 'map' && isDark && styles.activeTabTextDark
              ]}>
                Map View
              </Text>
            </TouchableOpacity>
          </View>
          
          {/* Tab Content */}
          {renderTabContent()}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  containerDark: {
    backgroundColor: '#121212',
  },
  scrollViewContent: {
    padding: 16,
    paddingBottom: 100,
  },
  contentCard: {
    backgroundColor: Colors.WHITE,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  contentCardDark: {
    backgroundColor: '#1e1e1e',
    shadowColor: '#000',
    shadowOpacity: 0.3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  cardHeaderDark: {
    borderBottomColor: '#333',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.DARK,
  },
  textDark: {
    color: Colors.WHITE,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(40, 167, 69, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.SUCCESS,
    marginRight: 4,
  },
  statusText: {
    fontSize: 12,
    color: Colors.SUCCESS,
    fontWeight: '600',
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  tabContainerDark: {
    borderBottomColor: '#333',
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.PRIMARY,
  },
  activeTabDark: {
    borderBottomColor: Colors.LIGHT,
  },
  tabText: {
    fontSize: 14,
    color: Colors.GRAY,
  },
  tabTextDark: {
    color: '#6c757d',
  },
  activeTabText: {
    color: Colors.PRIMARY,
    fontWeight: '600',
  },
  activeTabTextDark: {
    color: Colors.LIGHT,
  },
  tabContent: {
    minHeight: 400,
  },
  mapViewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.PRIMARY,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 6,
  },
  mapIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapViewButtonText: {
    flex: 1,
    color: Colors.WHITE,
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 16,
  },
  mapInfoContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    marginTop: 24,
  },
  mapInfoContainerDark: {
    backgroundColor: '#2a2a2a',
  },
  mapInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  mapInfoText: {
    fontSize: 16,
    color: Colors.DARK,
    marginLeft: 12,
  },
})
