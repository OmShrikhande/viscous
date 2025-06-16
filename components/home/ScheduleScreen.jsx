import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Modal, 
  ActivityIndicator
} from 'react-native';
import { BlurView } from 'expo-blur';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { firestoreDb } from '../../configs/FirebaseConfigs';
import { Colors } from '../../constants/Colors';
import Animated, { 
  FadeIn, 
  FadeInDown
} from 'react-native-reanimated';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ScheduleScreen = ({ visible, onClose, isDark }) => {
  const [scheduleData, setScheduleData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userRouteNumber, setUserRouteNumber] = useState('');
  const [userStopName, setUserStopName] = useState('');

  useEffect(() => {
    if (visible) {
      loadUserData();
    }
  }, [visible]);

  const loadUserData = async () => {
    try {
      const storedData = await AsyncStorage.getItem('userData');
      if (storedData) {
        const parsed = JSON.parse(storedData);
        const routeNumber = parsed.routeNumber || '';
        const stopName = parsed.stopName || '';
        
        setUserRouteNumber(routeNumber);
        setUserStopName(stopName);
        
        if (routeNumber) {
          fetchScheduleData(routeNumber);
        } else {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      setLoading(false);
    }
  };

  const fetchScheduleData = async (routeNumber) => {
    setLoading(true);
    try {
      // Query the route collection for this specific route number
      const routeQuery = query(
        collection(firestoreDb, 'routes'), 
        where('routeNumber', '==', routeNumber)
      );
      
      const routeSnapshot = await getDocs(routeQuery);
      
      if (!routeSnapshot.empty) {
        // Get the first document that matches the route number
        const routeDoc = routeSnapshot.docs[0];
        const routeData = routeDoc.data();
        
        // Check if stops array exists
        if (routeData.stops && Array.isArray(routeData.stops)) {
          // Sort stops by their order if available
          const sortedStops = [...routeData.stops].sort((a, b) => 
            (a.order || 0) - (b.order || 0)
          );
          
          setScheduleData(sortedStops);
        } else {
          setScheduleData([]);
        }
      } else {
        setScheduleData([]);
      }
    } catch (error) {
      console.error('Error fetching schedule data:', error);
      setScheduleData([]);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timeString) => {
    if (!timeString) return 'N/A';
    
    // If timeString is already in a readable format, return it
    if (typeof timeString === 'string' && timeString.includes(':')) {
      return timeString;
    }
    
    // If it's a timestamp object from Firestore
    if (timeString.seconds) {
      const date = new Date(timeString.seconds * 1000);
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    }
    
    return 'N/A';
  };

  const isUserStop = (stopName) => {
    return stopName === userStopName;
  };

  const renderStopItem = ({ item, index }) => (
    <Animated.View
      entering={FadeInDown.delay(index * 100).springify()}
      style={styles.animatedContainer}
    >
      <View
        style={[
          styles.stopCard,
          isDark ? styles.stopCardDark : styles.stopCardLight,
          isUserStop(item.name) && (isDark ? styles.userStopDark : styles.userStopLight)
        ]}
      >
        <View style={styles.stopIconContainer}>
          <View style={[
            styles.stopIcon,
            isDark ? styles.stopIconDark : styles.stopIconLight,
            isUserStop(item.name) && styles.userStopIcon
          ]}>
            <Text style={[
              styles.stopNumber,
              isDark ? styles.textDark : styles.textLight,
              isUserStop(item.name) && styles.userStopText
            ]}>
              {index + 1}
            </Text>
          </View>
          {index < scheduleData.length - 1 && (
            <View style={[
              styles.stopConnector,
              isDark ? styles.connectorDark : styles.connectorLight
            ]} />
          )}
        </View>
        
        <View style={styles.stopDetails}>
          <Text style={[
            styles.stopName,
            isDark ? styles.textDark : styles.textLight,
            isUserStop(item.name) && styles.userStopText
          ]}>
            {item.name}
            {isUserStop(item.name) && (
              <Text style={styles.yourStopLabel}> (Your Stop)</Text>
            )}
          </Text>
          
          <View style={styles.timeContainer}>
            <Ionicons 
              name="time-outline" 
              size={16} 
              color={isUserStop(item.name) 
                ? Colors.PRIMARY 
                : isDark ? '#aaa' : '#555'} 
              style={styles.timeIcon}
            />
            <Text style={[
              styles.arrivalTime,
              isDark ? styles.textDarkSecondary : styles.textLightSecondary,
              isUserStop(item.name) && styles.userStopTimeText
            ]}>
              {formatTime(item.arrivalTime)}
            </Text>
          </View>
          
          {item.landmark && (
            <View style={styles.landmarkContainer}>
              <MaterialIcons 
                name="location-on" 
                size={16} 
                color={isDark ? '#aaa' : '#555'} 
                style={styles.landmarkIcon}
              />
              <Text style={[
                styles.landmark,
                isDark ? styles.textDarkSecondary : styles.textLightSecondary
              ]}>
                {item.landmark}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Animated.View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={[
        styles.modalContainer,
        isDark ? styles.modalContainerDark : styles.modalContainerLight
      ]}>
        <BlurView 
          intensity={isDark ? 40 : 60} 
          tint={isDark ? 'dark' : 'light'}
          style={styles.blurContainer}
        >
          <View style={styles.headerContainer}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons 
                name="arrow-back" 
                size={24} 
                color={isDark ? Colors.WHITE : Colors.PRIMARY} 
              />
            </TouchableOpacity>
            <Text style={[
              styles.headerTitle,
              isDark ? styles.textDark : styles.textLight
            ]}>
              Bus Schedule
            </Text>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={isDark ? Colors.LIGHT : Colors.PRIMARY} />
              <Text style={[
                styles.loadingText,
                isDark ? styles.textDark : styles.textLight
              ]}>
                Loading schedule...
              </Text>
            </View>
          ) : !userRouteNumber ? (
            <View style={styles.emptyContainer}>
              <Ionicons 
                name="bus-outline" 
                size={60} 
                color={isDark ? '#555' : '#ccc'} 
              />
              <Text style={[
                styles.emptyText,
                isDark ? styles.textDark : styles.textLight
              ]}>
                No route information available.
                Please update your profile with your route details.
              </Text>
            </View>
          ) : scheduleData.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons 
                name="time-outline" 
                size={60} 
                color={isDark ? '#555' : '#ccc'} 
              />
              <Text style={[
                styles.emptyText,
                isDark ? styles.textDark : styles.textLight
              ]}>
                No schedule found for Route {userRouteNumber}
              </Text>
            </View>
          ) : (
            <View style={styles.scheduleContainer}>
              <View style={styles.routeInfoContainer}>
                <Text style={[
                  styles.routeNumber,
                  isDark ? styles.textDark : styles.textLight
                ]}>
                  Route {userRouteNumber}
                </Text>
                <Text style={[
                  styles.routeDescription,
                  isDark ? styles.textDarkSecondary : styles.textLightSecondary
                ]}>
                  {scheduleData.length} stops • {scheduleData[0]?.name} to {scheduleData[scheduleData.length - 1]?.name}
                </Text>
              </View>
              
              <FlatList
                data={scheduleData}
                renderItem={renderStopItem}
                keyExtractor={(item, index) => `stop-${index}`}
                contentContainerStyle={styles.listContainer}
                showsVerticalScrollIndicator={false}
              />
            </View>
          )}
        </BlurView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainerLight: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  modalContainerDark: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  blurContainer: {
    flex: 1,
    width: '100%',
    paddingTop: 50,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150, 150, 150, 0.2)',
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 15,
  },
  scheduleContainer: {
    flex: 1,
  },
  routeInfoContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150, 150, 150, 0.2)',
  },
  routeNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  routeDescription: {
    fontSize: 14,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 40,
  },
  animatedContainer: {
    marginBottom: 5,
  },
  stopCard: {
    flexDirection: 'row',
    padding: 10,
    borderRadius: 12,
    marginVertical: 5,
  },
  stopCardLight: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
  },
  stopCardDark: {
    backgroundColor: 'rgba(40, 40, 40, 0.7)',
  },
  userStopLight: {
    backgroundColor: 'rgba(230, 240, 255, 0.9)',
    borderWidth: 1,
    borderColor: Colors.PRIMARY,
  },
  userStopDark: {
    backgroundColor: 'rgba(30, 50, 80, 0.9)',
    borderWidth: 1,
    borderColor: Colors.LIGHT,
  },
  stopIconContainer: {
    alignItems: 'center',
    marginRight: 15,
  },
  stopIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
  },
  stopIconLight: {
    backgroundColor: '#e0e0e0',
  },
  stopIconDark: {
    backgroundColor: '#444',
  },
  userStopIcon: {
    backgroundColor: Colors.PRIMARY,
  },
  stopNumber: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  userStopText: {
    color: Colors.WHITE,
  },
  stopConnector: {
    width: 2,
    height: 30,
  },
  connectorLight: {
    backgroundColor: '#ccc',
  },
  connectorDark: {
    backgroundColor: '#555',
  },
  stopDetails: {
    flex: 1,
  },
  stopName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  yourStopLabel: {
    fontSize: 12,
    fontStyle: 'italic',
    color: Colors.PRIMARY,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  timeIcon: {
    marginRight: 5,
  },
  arrivalTime: {
    fontSize: 14,
  },
  userStopTimeText: {
    color: Colors.PRIMARY,
    fontWeight: 'bold',
  },
  landmarkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  landmarkIcon: {
    marginRight: 5,
  },
  landmark: {
    fontSize: 13,
  },
  textLight: {
    color: Colors.BLACK,
  },
  textDark: {
    color: Colors.WHITE,
  },
  textLightSecondary: {
    color: '#555',
  },
  textDarkSecondary: {
    color: '#aaa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    marginTop: 20,
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
});

export default ScheduleScreen;