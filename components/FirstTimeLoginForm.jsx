import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import { useRouter } from 'expo-router';
import { collection, doc, getDoc, getDocs, updateDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { firestoreDb } from '../configs/FirebaseConfigs';
import { Colors } from '../constants/Colors';

export default function FirstTimeLoginForm({ userEmail, onComplete }) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [routeNumber, setRouteNumber] = useState('1');
  const [stopName, setStopName] = useState('');
  const [availableStops, setAvailableStops] = useState([]);
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const router = useRouter();

  // Fetch available stops based on selected route
  useEffect(() => {
    const fetchStops = async () => {
      setLoading(true);
      try {
        // Get stops for the selected route
        const stopsCollection = collection(firestoreDb, `Route${routeNumber}`);
        const stopsSnapshot = await getDocs(stopsCollection);
        console.log("🚀 ~ file: FirstTimeLoginForm.jsx:39 ~ fetchStops ~ stopsSnapshot:", stopsSnapshot )
        
        const stops = [];
        stopsSnapshot.forEach(doc => {
          stops.push(doc.id); // Document ID is the stop name
        });
        
        setAvailableStops(stops.sort());
        if (stops.length > 0) {
          setStopName(stops[0]);
        } else {
          setStopName('');
        }
      } catch (error) {
        console.error('Error fetching stops:', error);
        Alert.alert('Error', 'Failed to load stops. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchStops();
  }, [routeNumber]);

  // Generate route numbers 1-30
  const routeNumbers = Array.from({ length: 30 }, (_, i) => (i + 1).toString());

  const handleSubmit = async () => {
    if (!fullName.trim()) {
      Alert.alert('Error', 'Please enter your full name');
      return;
    }

    if (!phoneNumber.trim() || phoneNumber.length < 10) {
      Alert.alert('Error', 'Please enter a valid phone number');
      return;
    }

    if (!stopName) {
      Alert.alert('Error', 'Please select your stop');
      return;
    }

    setSubmitting(true);
    try {
      // Update user data in Firestore
      const userDocRef = doc(firestoreDb, 'userdata', userEmail);
      
      // First get existing user data
      const userDoc = await getDoc(userDocRef);
      if (!userDoc.exists()) {
        throw new Error('User document not found');
      }
      
      const userData = userDoc.data();
      
      // Update with new fields
      await updateDoc(userDocRef, {
        routeNumber,
        stopName,
        fullName,
        phoneNumber,
        hasCompletedOnboarding: true
      });
      
      // Update AsyncStorage
      const updatedUserData = {
        ...userData,
        routeNumber,
        stopName,
        fullName,
        phoneNumber,
        hasCompletedOnboarding: true
      };
      
      await AsyncStorage.setItem('userData', JSON.stringify(updatedUserData));
      
      console.log('✅ User onboarding data saved successfully');
      
      // Call the onComplete callback or navigate
      if (onComplete) {
        onComplete();
      } else {
        router.replace('/home');
      }
    } catch (error) {
      console.error('Error saving user data:', error);
      Alert.alert('Error', 'Failed to save your information. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Welcome! Let's Set Up Your Profile</Text>
        <Text style={styles.subtitle}>Please provide some information to get started</Text>
        
        <View style={styles.formContainer}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            value={fullName}
            onChangeText={setFullName}
            placeholder="Enter your full name"
            placeholderTextColor="#999"
          />
          
          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            style={styles.input}
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            placeholder="Enter your phone number"
            placeholderTextColor="#999"
            keyboardType="phone-pad"
            maxLength={10}
          />
          
          <Text style={styles.label}>Select Your Route Number</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={routeNumber}
              onValueChange={(itemValue) => setRouteNumber(itemValue)}
              style={styles.picker}
            >
              {routeNumbers.map((num) => (
                <Picker.Item key={num} label={`Route ${num}`} value={num} />
              ))}
            </Picker>
          </View>
          
          <Text style={styles.label}>Select Your Stop</Text>
          {loading ? (
            <ActivityIndicator size="small" color={Colors.PRIMARY} />
          ) : availableStops.length > 0 ? (
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={stopName}
                onValueChange={(itemValue) => setStopName(itemValue)}
                style={styles.picker}
              >
                {availableStops.map((stop) => (
                  <Picker.Item key={stop} label={stop} value={stop} />
                ))}
              </Picker>
            </View>
          ) : (
            <Text style={styles.noStopsText}>No stops available for this route</Text>
          )}
          
          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.disabledButton]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Save & Continue</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontFamily: 'flux-bold',
    color: Colors.PRIMARY,
    textAlign: 'center',
    marginTop: 40,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'flux',
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  formContainer: {
    backgroundColor: '#f9f9f9',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  label: {
    fontSize: 16,
    fontFamily: 'flux-bold',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
    fontFamily: 'flux',
  },
  pickerContainer: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 20,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  submitButton: {
    backgroundColor: Colors.PRIMARY,
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 2,
    borderColor: '#000',
  },
  disabledButton: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'flux-bold',
  },
  noStopsText: {
    color: '#999',
    fontFamily: 'flux',
    textAlign: 'center',
    marginBottom: 20,
  },
});