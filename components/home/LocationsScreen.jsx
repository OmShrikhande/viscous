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
import { collection, getDocs } from 'firebase/firestore';
import { firestoreDb } from '../../configs/FirebaseConfigs';
import { Colors } from '../../constants/Colors';
import Animated, { 
  FadeIn, 
  FadeInDown
} from 'react-native-reanimated';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LocationsScreen = ({ visible, onClose, isDark }) => {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userRouteNumber, setUserRouteNumber] = useState('');

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
        
        setUserRouteNumber(routeNumber);
        fetchLocations();
      } else {
        fetchLocations();
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      fetchLocations();
    }
  };

  const fetchLocations = async () => {
    setLoading(true);
    try {
      const locationsCollection = collection(firestoreDb, 'locations');
      const locationsSnapshot = await getDocs(locationsCollection);
      
      const locationsList = locationsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Sort locations by name
      locationsList.sort((a, b) => a.name.localeCompare(b.name));
      
      setLocations(locationsList);
    } catch (error) {
      console.error('Error fetching locations:', error);
      setLocations([]);
    } finally {
      setLoading(false);
    }
  };

  const isOnUserRoute = (location) => {
    return location.routeNumbers && 
           location.routeNumbers.includes(userRouteNumber) && 
           userRouteNumber !== '';
  };

  const renderLocationItem = ({ item, index }) => (
    <Animated.View
      entering={FadeInDown.delay(index * 100).springify()}
      style={styles.animatedContainer}
    >
      <View
        style={[
          styles.locationCard,
          isDark ? styles.locationCardDark : styles.locationCardLight,
          isOnUserRoute(item) && (isDark ? styles.userRouteLocationDark : styles.userRouteLocationLight)
        ]}
      >
        <View style={styles.locationIconContainer}>
          <MaterialIcons 
            name="location-on" 
            size={24} 
            color={isOnUserRoute(item) 
              ? Colors.PRIMARY 
              : isDark ? Colors.LIGHT : Colors.PRIMARY} 
          />
        </View>
        
        <View style={styles.locationDetails}>
          <Text style={[
            styles.locationName,
            isDark ? styles.textDark : styles.textLight,
          ]}>
            {item.name}
            {isOnUserRoute(item) && (
              <Text style={styles.onRouteLabel}> (On Your Route)</Text>
            )}
          </Text>
          
          {item.address && (
            <Text style={[
              styles.locationAddress,
              isDark ? styles.textDarkSecondary : styles.textLightSecondary
            ]}>
              {item.address}
            </Text>
          )}
          
          {item.routeNumbers && item.routeNumbers.length > 0 && (
            <View style={styles.routesContainer}>
              <Text style={[
                styles.routesLabel,
                isDark ? styles.textDarkSecondary : styles.textLightSecondary
              ]}>
                Routes:
              </Text>
              <View style={styles.routeNumbersContainer}>
                {item.routeNumbers.map((route, idx) => (
                  <View 
                    key={`route-${idx}`}
                    style={[
                      styles.routeNumberBadge,
                      route === userRouteNumber ? styles.userRouteBadge : null,
                      isDark ? styles.routeNumberBadgeDark : styles.routeNumberBadgeLight
                    ]}
                  >
                    <Text style={[
                      styles.routeNumberText,
                      route === userRouteNumber ? styles.userRouteText : null,
                      isDark ? styles.textDark : styles.textLight
                    ]}>
                      {route}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}
          
          {item.description && (
            <Text style={[
              styles.locationDescription,
              isDark ? styles.textDarkSecondary : styles.textLightSecondary
            ]}>
              {item.description}
            </Text>
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
              Bus Stop Locations
            </Text>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={isDark ? Colors.LIGHT : Colors.PRIMARY} />
              <Text style={[
                styles.loadingText,
                isDark ? styles.textDark : styles.textLight
              ]}>
                Loading locations...
              </Text>
            </View>
          ) : locations.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons 
                name="location-off" 
                size={60} 
                color={isDark ? '#555' : '#ccc'} 
              />
              <Text style={[
                styles.emptyText,
                isDark ? styles.textDark : styles.textLight
              ]}>
                No locations available
              </Text>
            </View>
          ) : (
            <FlatList
              data={locations}
              renderItem={renderLocationItem}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.listContainer}
              showsVerticalScrollIndicator={false}
            />
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
  listContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 40,
  },
  animatedContainer: {
    marginBottom: 15,
  },
  locationCard: {
    flexDirection: 'row',
    padding: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  locationCardLight: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  locationCardDark: {
    backgroundColor: 'rgba(40, 40, 40, 0.9)',
  },
  userRouteLocationLight: {
    backgroundColor: 'rgba(230, 240, 255, 0.9)',
    borderLeftWidth: 4,
    borderLeftColor: Colors.PRIMARY,
  },
  userRouteLocationDark: {
    backgroundColor: 'rgba(30, 50, 80, 0.9)',
    borderLeftWidth: 4,
    borderLeftColor: Colors.LIGHT,
  },
  locationIconContainer: {
    marginRight: 15,
    paddingTop: 2,
  },
  locationDetails: {
    flex: 1,
  },
  locationName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  onRouteLabel: {
    fontSize: 12,
    fontStyle: 'italic',
    color: Colors.PRIMARY,
  },
  locationAddress: {
    fontSize: 14,
    marginBottom: 8,
  },
  routesContainer: {
    marginTop: 5,
    marginBottom: 8,
  },
  routesLabel: {
    fontSize: 14,
    marginBottom: 5,
  },
  routeNumbersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  routeNumberBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 5,
  },
  routeNumberBadgeLight: {
    backgroundColor: '#f0f0f0',
  },
  routeNumberBadgeDark: {
    backgroundColor: '#333',
  },
  userRouteBadge: {
    backgroundColor: Colors.PRIMARY,
  },
  routeNumberText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  userRouteText: {
    color: Colors.WHITE,
  },
  locationDescription: {
    fontSize: 14,
    marginTop: 5,
    lineHeight: 20,
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
  },
});

export default LocationsScreen;