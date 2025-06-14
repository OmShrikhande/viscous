import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native'
import React, { useState } from 'react'
import Header from '../../components/home/Header'
import Display from '../../components/home/Display'
import BusStopTimeline from '../../components/home/BusStopTimeline'
// import SpeedMonitor from '../../components/home/SpeedMonitor'

export default function Home() {
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = () => {
    setRefreshing(true);
    // Simulate a network request or data refresh
    setTimeout(() => {
      setRefreshing(false);
    }, 2000);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollViewContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <Header />

        {/* to display the recent location */}
        {/* {<SpeedMonitor />} */}
      </ScrollView>
      <ScrollView>
        <View style={styles.buscontainer}>
          <BusStopTimeline />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  buscontainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    padding: 20,
    marginBottom: 10,
    borderTopWidth: 1,
    borderColor: '#ddd',  // Optional border
  },
  scrollViewContent: {
    paddingBottom: 100,  // Prevent content from overlapping with Maps
  },
  mapsContainer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    height: 500,  // Adjust height as needed
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderColor: '#ddd',  // Optional border
  },
})
