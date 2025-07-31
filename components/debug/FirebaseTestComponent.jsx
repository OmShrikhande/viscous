import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { onValue, ref, get } from 'firebase/database';
import { collection, getDocs, onSnapshot } from 'firebase/firestore';
import { firestoreDb, realtimeDatabase } from '../../configs/FirebaseConfigs';

const FirebaseTestComponent = ({ routeNumber = '2' }) => {
  const [realtimeData, setRealtimeData] = useState(null);
  const [firestoreData, setFirestoreData] = useState(null);
  const [logs, setLogs] = useState([]);
  const [isListening, setIsListening] = useState(false);

  const addLog = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev.slice(-20), `[${timestamp}] ${message}`]);
    console.log(message);
  };

  // Test Realtime Database
  const testRealtimeDatabase = async () => {
    try {
      addLog('🔥 Testing Realtime Database...');
      
      // Test direct path access
      const busRef = ref(realtimeDatabase, 'bus');
      const snapshot = await get(busRef);
      
      if (snapshot.exists()) {
        const data = snapshot.val();
        addLog('✅ Bus data found in Realtime Database');
        addLog(`📍 Location: ${data.Location?.Latitude}, ${data.Location?.Longitude}`);
        addLog(`🚌 Route: ${data.RouteNumber}`);
        addLog(`⏱️ Timestamp: ${data.Timestamp}`);
        setRealtimeData(data);
      } else {
        addLog('❌ No bus data found in Realtime Database');
      }
    } catch (error) {
      addLog(`❌ Realtime Database Error: ${error.message}`);
    }
  };

  // Test Firestore
  const testFirestore = async () => {
    try {
      addLog('📊 Testing Firestore...');
      
      const routeRef = collection(firestoreDb, `Route${routeNumber}`);
      const snapshot = await getDocs(routeRef);
      
      if (snapshot.empty) {
        addLog(`❌ No documents found in Route${routeNumber}`);
      } else {
        addLog(`✅ Found ${snapshot.size} documents in Route${routeNumber}`);
        
        const stops = [];
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          stops.push({
            id: doc.id,
            latitude: data.Latitude,
            longitude: data.Longitude,
            serialNumber: data.serialNumber,
            reached: data.reached
          });
        });
        
        setFirestoreData(stops);
        addLog(`📍 First stop: ${stops[0]?.id} (${stops[0]?.latitude}, ${stops[0]?.longitude})`);
      }
    } catch (error) {
      addLog(`❌ Firestore Error: ${error.message}`);
    }
  };

  // Start real-time listeners
  const startListeners = () => {
    if (isListening) return;
    
    setIsListening(true);
    addLog('🎧 Starting real-time listeners...');
    
    // Realtime Database listener
    const locationRef = ref(realtimeDatabase, 'bus/Location');
    const locationListener = onValue(locationRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        addLog(`📍 Location update: ${data.Latitude?.toFixed(6)}, ${data.Longitude?.toFixed(6)}`);
        setRealtimeData(prev => ({ ...prev, Location: data }));
      }
    }, (error) => {
      addLog(`❌ Realtime listener error: ${error.message}`);
    });
    
    // Firestore listener
    const routeRef = collection(firestoreDb, `Route${routeNumber}`);
    const firestoreListener = onSnapshot(routeRef, (snapshot) => {
      const reachedStops = [];
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.reached) {
          reachedStops.push(doc.id);
        }
      });
      
      if (reachedStops.length > 0) {
        addLog(`✅ Reached stops: ${reachedStops.join(', ')}`);
      }
    }, (error) => {
      addLog(`❌ Firestore listener error: ${error.message}`);
    });
    
    // Store cleanup functions
    window.firestoreCleanup = firestoreListener;
    window.realtimeCleanup = locationListener;
  };

  const stopListeners = () => {
    setIsListening(false);
    addLog('🔇 Stopping listeners...');
    
    if (window.firestoreCleanup) {
      window.firestoreCleanup();
    }
    if (window.realtimeCleanup) {
      window.realtimeCleanup();
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  useEffect(() => {
    return () => {
      stopListeners();
    };
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Firebase Connection Test</Text>
      
      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.button} onPress={testRealtimeDatabase}>
          <Text style={styles.buttonText}>Test Realtime DB</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.button} onPress={testFirestore}>
          <Text style={styles.buttonText}>Test Firestore</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.buttonRow}>
        <TouchableOpacity 
          style={[styles.button, { backgroundColor: isListening ? '#ff6b6b' : '#4ecdc4' }]} 
          onPress={isListening ? stopListeners : startListeners}
        >
          <Text style={styles.buttonText}>
            {isListening ? 'Stop Listeners' : 'Start Listeners'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.button} onPress={clearLogs}>
          <Text style={styles.buttonText}>Clear Logs</Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.logContainer}>
        {logs.map((log, index) => (
          <Text key={index} style={styles.logText}>{log}</Text>
        ))}
      </ScrollView>
      
      {realtimeData && (
        <View style={styles.dataContainer}>
          <Text style={styles.dataTitle}>Realtime Data:</Text>
          <Text style={styles.dataText}>
            Location: {realtimeData.Location?.Latitude?.toFixed(6)}, {realtimeData.Location?.Longitude?.toFixed(6)}
          </Text>
          <Text style={styles.dataText}>Route: {realtimeData.RouteNumber}</Text>
        </View>
      )}
      
      {firestoreData && (
        <View style={styles.dataContainer}>
          <Text style={styles.dataTitle}>Firestore Data:</Text>
          <Text style={styles.dataText}>{firestoreData.length} stops loaded</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 8,
  },
  button: {
    flex: 1,
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  logContainer: {
    flex: 1,
    backgroundColor: '#000',
    padding: 8,
    borderRadius: 8,
    marginBottom: 16,
  },
  logText: {
    color: '#00ff00',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  dataContainer: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  dataTitle: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  dataText: {
    fontSize: 12,
    color: '#666',
  },
});

export default FirebaseTestComponent;