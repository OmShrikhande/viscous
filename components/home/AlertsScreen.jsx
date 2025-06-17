import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Modal, 
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { BlurView } from 'expo-blur';
import { collection, getDocs } from 'firebase/firestore';
import { onValue, ref } from 'firebase/database';
import { firestoreDb, realtimeDatabase } from '../../configs/FirebaseConfigs';
import { Colors } from '../../constants/Colors';
import Animated, { 
  FadeIn, 
  FadeInDown, 
  SlideInRight,
  SlideOutRight
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

const AlertsScreen = ({ visible, onClose, isDark }) => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  useEffect(() => {
    if (visible) {
      fetchAlerts();
    }
  }, [visible]);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      // Get alerts from Firestore
      const alertsCollection = collection(firestoreDb, 'alerts');
      const alertSnapshot = await getDocs(alertsCollection);
      
      const firestoreAlerts = alertSnapshot.docs.map(doc => ({
        id: doc.id,
        source: 'firestore',
        ...doc.data(),
        time: doc.data().time ? new Date(doc.data().time.seconds * 1000) : new Date()
      }));
      
      // Get admin alerts from Realtime Database
      const adminAlertsRef = ref(realtimeDatabase, 'adminAlerts');
      
      // Create a promise to handle the onValue callback
      const realtimeAlerts = await new Promise((resolve) => {
        onValue(adminAlertsRef, (snapshot) => {
          const data = snapshot.val();
          if (!data) {
            resolve([]);
            return;
          }
          
          // Convert object to array
          const alertsArray = Object.keys(data).map(key => ({
            id: key,
            source: 'realtime',
            ...data[key],
            time: data[key].timestamp ? new Date(data[key].timestamp) : new Date()
          }));
          
          resolve(alertsArray);
        }, {
          onlyOnce: true
        });
      });
      
      // Combine alerts from both sources
      const combinedAlerts = [...firestoreAlerts, ...realtimeAlerts];
      
      // Sort alerts by time (newest first)
      combinedAlerts.sort((a, b) => b.time - a.time);
      
      setAlerts(combinedAlerts);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAlertPress = (alert) => {
    setSelectedAlert(alert);
    setDetailModalVisible(true);
  };

  const formatTime = (date) => {
    if (!date) return 'Unknown time';
    
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 60) {
      return diffMins <= 1 ? 'Just now' : `${diffMins} minutes ago`;
    } else if (diffHours < 24) {
      return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
    } else {
      return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
    }
  };

  const formatDateTime = (date) => {
    if (!date) return 'Unknown date';
    
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const renderAlertItem = ({ item, index }) => (
    <Animated.View
      entering={FadeInDown.delay(index * 100).springify()}
      style={styles.animatedContainer}
    >
      <TouchableOpacity
        style={[
          styles.alertCard,
          isDark ? styles.alertCardDark : styles.alertCardLight
        ]}
        onPress={() => handleAlertPress(item)}
      >
        <View style={styles.alertHeader}>
          <View style={styles.alertTitleContainer}>
            <Ionicons 
              name={item.source === 'realtime' ? "megaphone" : "notifications"} 
              size={20} 
              color={item.source === 'realtime' ? (isDark ? '#ff9800' : '#e65100') : (isDark ? Colors.LIGHT : Colors.PRIMARY)} 
              style={styles.alertIcon}
            />
            <Text style={[
              styles.alertTitle,
              isDark ? styles.textDark : styles.textLight
            ]}>
              {item.title || 'Alert'}
            </Text>
          </View>
          <Text style={[
            styles.alertTime,
            isDark ? styles.textDarkSecondary : styles.textLightSecondary
          ]}>
            {formatTime(item.time)}
          </Text>
        </View>
        
        <Text 
          style={[
            styles.alertPreview,
            isDark ? styles.textDarkSecondary : styles.textLightSecondary
          ]}
          numberOfLines={2}
        >
          {item.message || 'No details available'}
        </Text>
      </TouchableOpacity>
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
              Alerts & Notifications
            </Text>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={isDark ? Colors.LIGHT : Colors.PRIMARY} />
              <Text style={[
                styles.loadingText,
                isDark ? styles.textDark : styles.textLight
              ]}>
                Loading alerts...
              </Text>
            </View>
          ) : alerts.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons 
                name="notifications-off-outline" 
                size={60} 
                color={isDark ? '#555' : '#ccc'} 
              />
              <Text style={[
                styles.emptyText,
                isDark ? styles.textDark : styles.textLight
              ]}>
                No alerts available
              </Text>
            </View>
          ) : (
            <FlatList
              data={alerts}
              renderItem={renderAlertItem}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.listContainer}
              showsVerticalScrollIndicator={false}
            />
          )}
        </BlurView>
      </View>

      {/* Alert Detail Modal */}
      <Modal
        visible={detailModalVisible}
        transparent={true}
        animationType="none"
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View style={[
          styles.detailModalContainer,
          isDark ? styles.modalContainerDark : styles.modalContainerLight
        ]}>
          <BlurView 
            intensity={isDark ? 40 : 60} 
            tint={isDark ? 'dark' : 'light'}
            style={styles.detailBlurContainer}
          >
            <Animated.View 
              entering={SlideInRight.springify()}
              exiting={SlideOutRight.springify()}
              style={styles.detailContent}
            >
              <View style={styles.detailHeader}>
                <TouchableOpacity 
                  onPress={() => setDetailModalVisible(false)}
                  style={styles.detailCloseButton}
                >
                  <Ionicons 
                    name="close" 
                    size={24} 
                    color={isDark ? Colors.WHITE : Colors.PRIMARY} 
                  />
                </TouchableOpacity>
                <Text style={[
                  styles.detailTitle,
                  isDark ? styles.textDark : styles.textLight
                ]}>
                  {selectedAlert?.title || 'Alert Details'}
                </Text>
              </View>

              <ScrollView style={styles.detailScrollView}>
                {selectedAlert?.time && (
                  <View style={styles.detailTimeContainer}>
                    <Ionicons 
                      name="time-outline" 
                      size={18} 
                      color={isDark ? Colors.LIGHT : Colors.PRIMARY} 
                    />
                    <Text style={[
                      styles.detailTimeText,
                      isDark ? styles.textDarkSecondary : styles.textLightSecondary
                    ]}>
                      {formatDateTime(selectedAlert.time)}
                    </Text>
                  </View>
                )}

                <Text style={[
                  styles.detailMessage,
                  isDark ? styles.textDark : styles.textLight
                ]}>
                  {selectedAlert?.message || 'No details available for this alert.'}
                </Text>

                {selectedAlert?.additionalInfo && (
                  <View style={styles.additionalInfoContainer}>
                    <Text style={[
                      styles.additionalInfoTitle,
                      isDark ? styles.textDark : styles.textLight
                    ]}>
                      Additional Information:
                    </Text>
                    <Text style={[
                      styles.additionalInfoText,
                      isDark ? styles.textDarkSecondary : styles.textLightSecondary
                    ]}>
                      {selectedAlert.additionalInfo}
                    </Text>
                  </View>
                )}
              </ScrollView>
            </Animated.View>
          </BlurView>
        </View>
      </Modal>
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
  alertCard: {
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  alertCardLight: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  alertCardDark: {
    backgroundColor: 'rgba(40, 40, 40, 0.9)',
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  alertTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  alertIcon: {
    marginRight: 8,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  alertTime: {
    fontSize: 12,
  },
  alertPreview: {
    fontSize: 14,
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
  
  // Detail Modal Styles
  detailModalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailBlurContainer: {
    flex: 1,
    width: '100%',
  },
  detailContent: {
    flex: 1,
    paddingTop: 50,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150, 150, 150, 0.2)',
  },
  detailCloseButton: {
    padding: 8,
  },
  detailTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 15,
    flex: 1,
  },
  detailScrollView: {
    flex: 1,
    padding: 20,
  },
  detailTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150, 150, 150, 0.2)',
  },
  detailTimeText: {
    fontSize: 14,
    marginLeft: 8,
  },
  detailMessage: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 20,
  },
  additionalInfoContainer: {
    marginTop: 10,
    padding: 15,
    borderRadius: 10,
    backgroundColor: 'rgba(150, 150, 150, 0.1)',
  },
  additionalInfoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  additionalInfoText: {
    fontSize: 14,
    lineHeight: 22,
  },
});

export default AlertsScreen;