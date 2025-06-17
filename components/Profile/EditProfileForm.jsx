import { useUser } from '@clerk/clerk-expo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurView } from 'expo-blur';
import { collection, doc, getDocs, serverTimestamp, setDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { firestoreDb as db } from '../../configs/FirebaseConfigs';

const EditProfileForm = ({ visible, onClose, userData, isDark, onUpdate }) => {
  const { user } = useUser();
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [routeNumber, setRouteNumber] = useState('');
  const [busStop, setBusStop] = useState('');
  const [availableStops, setAvailableStops] = useState([]);
  const [isLoadingStops, setIsLoadingStops] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showStopsList, setShowStopsList] = useState(false);

  // Initialize form with user data
  useEffect(() => {
    if (userData) {
      setFullName(userData.name || '');
      setPhoneNumber(userData.phoneNumber || '');
      setRouteNumber(userData.routeNumber || '');
      setBusStop(userData.busStop || '');
    }
  }, [userData]);

  // Fetch bus stops when route number changes
  useEffect(() => {
    const fetchBusStops = async () => {
      if (!routeNumber || routeNumber.trim() === '') return;
      
      setIsLoadingStops(true);
      try {
        const routeRef = collection(db, `Route${routeNumber}`);
        const stopsSnapshot = await getDocs(routeRef);
        
        if (stopsSnapshot.empty) {
          Alert.alert('No stops found', `No bus stops found for route ${routeNumber}`);
          setAvailableStops([]);
        } else {
          const stops = stopsSnapshot.docs.map(doc => doc.id);
          setAvailableStops(stops);
        }
      } catch (error) {
        console.error('Error fetching bus stops:', error);
        Alert.alert('Error', 'Failed to fetch bus stops. Please try again.');
        setAvailableStops([]);
      } finally {
        setIsLoadingStops(false);
      }
    };

    fetchBusStops();
  }, [routeNumber]);

  const handleSubmit = async () => {
    // Validate inputs
    if (!fullName.trim()) {
      Alert.alert('Missing Information', 'Please enter your full name');
      return;
    }
    
    if (!phoneNumber.trim()) {
      Alert.alert('Missing Information', 'Please enter your phone number');
      return;
    }
    
    if (!routeNumber.trim()) {
      Alert.alert('Missing Information', 'Please select a route number');
      return;
    }
    
    if (!busStop.trim()) {
      Alert.alert('Missing Information', 'Please select your bus stop');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const email = user.emailAddresses?.[0]?.emailAddress;
      if (!email) {
        throw new Error('User email not found');
      }
      
      // Save to Firestore
      const userRef = doc(db, 'userdata', email);
      const userData = {
        name: fullName,
        email,
        phoneNumber,
        routeNumber,
        busStop,
        image: user.imageUrl,
        lastUpdated: serverTimestamp(),
      };
      
      await setDoc(userRef, userData, { merge: true });
      
      // Save to AsyncStorage
      const storedData = await AsyncStorage.getItem('userData');
      const parsedData = storedData ? JSON.parse(storedData) : {};
      
      const localUserData = {
        ...parsedData,
        ...userData,
        lastUpdated: new Date().toISOString(),
      };
      
      await AsyncStorage.setItem('userData', JSON.stringify(localUserData));
      console.log('✅ User profile data updated:', localUserData);
      
      // Notify parent component
      if (onUpdate) {
        onUpdate(localUserData);
      }
      
      // Close modal
      onClose();
      
      Alert.alert('Success', 'Your profile has been updated successfully.');
    } catch (error) {
      console.error('❌ Failed to update profile data:', error);
      Alert.alert('Error', 'Failed to update your profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const textColor = isDark ? '#fff' : '#000';
  const placeholderColor = isDark ? '#aaa' : '#888';
  const inputBgColor = isDark ? 'rgba(30, 30, 30, 0.8)' : 'rgba(240, 240, 240, 0.8)';
  const buttonBgColor = isDark ? '#1E90FF' : '#1E90FF';
  const modalBgColor = isDark ? 'rgba(0, 0, 0, 0.9)' : 'rgba(255, 255, 255, 0.9)';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={[styles.modalContainer, { backgroundColor: modalBgColor }]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
        >
          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Animated.View 
              entering={FadeIn.duration(400)}
              style={styles.formContainer}
            >
              <BlurView 
                intensity={30} 
                style={styles.blurContainer} 
                tint={isDark ? 'dark' : 'light'}
              >
                <Animated.Text 
                  entering={FadeInDown.delay(100).springify()}
                  style={[styles.title, { color: textColor }]}
                >
                  Edit Profile
                </Animated.Text>
                
                <Animated.View 
                  entering={FadeInDown.delay(200).springify()}
                  style={styles.inputGroup}
                >
                  <Text style={[styles.label, { color: textColor }]}>Full Name</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: inputBgColor, color: textColor }]}
                    placeholder="Enter your full name"
                    placeholderTextColor={placeholderColor}
                    value={fullName}
                    onChangeText={setFullName}
                  />
                </Animated.View>
                
                <Animated.View 
                  entering={FadeInDown.delay(300).springify()}
                  style={styles.inputGroup}
                >
                  <Text style={[styles.label, { color: textColor }]}>Phone Number</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: inputBgColor, color: textColor }]}
                    placeholder="Enter your phone number"
                    placeholderTextColor={placeholderColor}
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    keyboardType="phone-pad"
                  />
                </Animated.View>
                
                <Animated.View 
                  entering={FadeInDown.delay(400).springify()}
                  style={styles.inputGroup}
                >
                  <Text style={[styles.label, { color: textColor }]}>Route Number (1-37)</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: inputBgColor, color: textColor }]}
                    placeholder="Enter route number (1-37)"
                    placeholderTextColor={placeholderColor}
                    value={routeNumber}
                    onChangeText={(text) => {
                      // Only allow numbers 1-37
                      const numValue = parseInt(text);
                      if (text === '' || (numValue >= 1 && numValue <= 37)) {
                        setRouteNumber(text);
                        setBusStop(''); // Reset bus stop when route changes
                      }
                    }}
                    keyboardType="number-pad"
                  />
                </Animated.View>
                
                <Animated.View 
                  entering={FadeInDown.delay(500).springify()}
                  style={styles.inputGroup}
                >
                  <Text style={[styles.label, { color: textColor }]}>Your Bus Stop</Text>
                  <TouchableOpacity
                    onPress={() => {
                      if (routeNumber && availableStops.length > 0) {
                        setShowStopsList(!showStopsList);
                      } else if (routeNumber) {
                        Alert.alert('Loading', 'Bus stops are being loaded...');
                      } else {
                        Alert.alert('Route Required', 'Please select a route number first');
                      }
                    }}
                  >
                    <View style={[styles.input, { backgroundColor: inputBgColor }]}>
                      <Text style={{ color: busStop ? textColor : placeholderColor }}>
                        {busStop || "Select your bus stop"}
                      </Text>
                    </View>
                  </TouchableOpacity>
                  
                  {isLoadingStops && (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator size="small" color={buttonBgColor} />
                      <Text style={[styles.loadingText, { color: textColor }]}>
                        Loading stops...
                      </Text>
                    </View>
                  )}
                  
                  {showStopsList && availableStops.length > 0 && (
                    <View style={[styles.stopsList, { backgroundColor: inputBgColor }]}>
                      <ScrollView style={{ maxHeight: 150 }} nestedScrollEnabled={true}>
                        {availableStops.map((stop) => (
                          <TouchableOpacity
                            key={stop}
                            style={styles.stopItem}
                            onPress={() => {
                              setBusStop(stop);
                              setShowStopsList(false);
                            }}
                          >
                            <Text style={[styles.stopText, { color: textColor }]}>
                              {stop}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </Animated.View>
                
                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={[styles.button, styles.cancelButton, { borderColor: buttonBgColor }]}
                    onPress={onClose}
                  >
                    <Text style={[styles.buttonText, { color: buttonBgColor }]}>Cancel</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.button, styles.saveButton, { backgroundColor: buttonBgColor }]}
                    onPress={handleSubmit}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={[styles.buttonText, { color: '#fff' }]}>Save</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </BlurView>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
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
  container: {
    width: '90%',
    maxWidth: 400,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 10,
  },
  formContainer: {
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  blurContainer: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontFamily: 'flux-bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputGroup: {
    width: '100%',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontFamily: 'flux-medium',
    marginBottom: 6,
  },
  input: {
    width: '100%',
    height: 50,
    borderRadius: 10,
    paddingHorizontal: 15,
    fontFamily: 'flux',
    fontSize: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 20,
  },
  button: {
    height: 50,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  saveButton: {
    backgroundColor: '#1E90FF',
  },
  buttonText: {
    fontSize: 16,
    fontFamily: 'flux-bold',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    fontFamily: 'flux',
  },
  stopsList: {
    marginTop: 5,
    borderRadius: 10,
    maxHeight: 150,
  },
  stopItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150, 150, 150, 0.2)',
  },
  stopText: {
    fontSize: 16,
    fontFamily: 'flux',
  },
});

export default EditProfileForm;