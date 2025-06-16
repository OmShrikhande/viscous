import { View, Text, ScrollView, StyleSheet, RefreshControl, Animated, StatusBar, SafeAreaView, TouchableOpacity } from 'react-native'
import React, { useState, useRef, useEffect } from 'react'
import Header from '../../components/home/Header'
import Display from '../../components/home/Display'
import BusStopTimeline from '../../components/home/BusStopTimeline'
// import SpeedMonitor from '../../components/home/SpeedMonitor'
import UserDataManager from '../../components/usefulComponent/UserDataManager'
import { Colors } from '../../constants/Colors'
import { MaterialIcons, Ionicons } from '@expo/vector-icons'
import { BlurView } from 'expo-blur'

export default function Home() {
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('timeline');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  // Animation when component mounts
  useEffect(() => {
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
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    // Simulate a network request or data refresh
    setTimeout(() => {
      setRefreshing(false);
    }, 2000);
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
            <BusStopTimeline />
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
            <View style={styles.comingSoonContainer}>
              <Ionicons name="map" size={60} color={Colors.PRIMARY} />
              <Text style={styles.comingSoonText}>Map View Coming Soon</Text>
            </View>
          </Animated.View>
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.PRIMARY} />
      <UserDataManager />
      
      {/* Header Section */}
      <Header />
      
      {/* Main Content */}
      <ScrollView
        contentContainerStyle={styles.scrollViewContent}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={[Colors.PRIMARY, Colors.SECONDARY]} 
            tintColor={Colors.PRIMARY}
          />
        }
      >
        {/* Content Card */}
        <Animated.View 
          style={[
            styles.contentCard,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
          ]}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Bus Tracking</Text>
            <View style={styles.statusIndicator}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Live</Text>
            </View>
          </View>
          
          {/* Tab Navigation */}
          <View style={styles.tabContainer}>
            <TouchableOpacity 
              style={[styles.tabButton, activeTab === 'timeline' && styles.activeTab]}
              onPress={() => setActiveTab('timeline')}
            >
              <MaterialIcons 
                name="timeline" 
                size={24} 
                color={activeTab === 'timeline' ? Colors.PRIMARY : Colors.GRAY} 
              />
              <Text style={[
                styles.tabText, 
                activeTab === 'timeline' && styles.activeTabText
              ]}>
                Timeline
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.tabButton, activeTab === 'map' && styles.activeTab]}
              onPress={() => setActiveTab('map')}
            >
              <MaterialIcons 
                name="map" 
                size={24} 
                color={activeTab === 'map' ? Colors.PRIMARY : Colors.GRAY} 
              />
              <Text style={[
                styles.tabText, 
                activeTab === 'map' && styles.activeTabText
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.DARK,
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
  tabText: {
    fontSize: 14,
    color: Colors.GRAY,
  },
  activeTabText: {
    color: Colors.PRIMARY,
    fontWeight: '600',
  },
  tabContent: {
    minHeight: 400,
  },
  comingSoonContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  comingSoonText: {
    marginTop: 16,
    fontSize: 18,
    color: Colors.DARK,
    textAlign: 'center',
  },
})
