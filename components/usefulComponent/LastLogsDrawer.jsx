import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { ref, onValue } from 'firebase/database';
import { realtimeDatabase } from './../../configs/FirebaseConfigs';

const LastLogsDrawer = ({ isDark, currentStop }) => {
  const [logs, setLogs] = useState([]);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const entriesRef = ref(realtimeDatabase, 'Route1/1462025/entries');
    const unsub = onValue(entriesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const parsed = Object.values(data)
          .map(entry => ({
            time: entry.time,
            speed: entry.speed,
            lat: entry.latitude,
            lng: entry.longitude,
            driver: entry.driverName,
            status: entry.status,
          }))
          .sort((a, b) => b.time - a.time)
          .slice(0, 5);
        setLogs(parsed);
      }
    });
    return () => unsub();
  }, []);

  return (
    <View style={styles.drawerContainer}>
      <TouchableOpacity onPress={() => setExpanded(!expanded)}>
        <Text style={[styles.toggleText, { color: isDark ? '#4da6ff' : '#007bff' }]}>
          {expanded ? 'Hide Last 5 Logs ⬆️' : 'Show Last 5 Logs ⬇️'}
        </Text>
      </TouchableOpacity>

      {expanded && (
        <ScrollView style={styles.logContainer}>
          {logs.map((log, index) => (
            <View key={index} style={[styles.logItem, { backgroundColor: isDark ? '#111' : '#f9f9f9' }]}>
              <Text style={{ color: isDark ? '#fff' : '#000' }}>🕒 {new Date(log.time).toLocaleTimeString()}</Text>
              <Text style={{ color: isDark ? '#fff' : '#000' }}>📍 {log.lat}, {log.lng}</Text>
              <Text style={{ color: isDark ? '#fff' : '#000' }}>🚀 {log.speed} km/h</Text>
              <Text style={{ color: isDark ? '#fff' : '#000' }}>👨‍✈️ {log.driver || 'N/A'}</Text>
              <Text style={{ color: isDark ? '#fff' : '#000' }}>📶 {log.status}</Text>
              {currentStop && log.lat === currentStop.latitude && log.lng === currentStop.longitude && (
                <Text style={{ color: 'limegreen', fontWeight: 'bold' }}>⭐ At Current Stop</Text>
              )}
              <View style={styles.separator} />
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
};

export default LastLogsDrawer;

const styles = StyleSheet.create({
  drawerContainer: {
    marginTop: 15,
    marginHorizontal: 20,
    borderTopWidth: 1,
    borderColor: '#ccc',
    paddingTop: 10,
  },
  toggleText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  logContainer: {
    maxHeight: 200,
    marginTop: 10,
  },
  logItem: {
    marginBottom: 10,
    padding: 10,
    borderRadius: 8,
  },
  separator: {
    borderBottomWidth: 1,
    borderColor: '#ddd',
    marginTop: 5,
  },
});
