import { useUser } from '@clerk/clerk-expo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurView } from 'expo-blur';
import { collection, doc, getDoc, getDocs, serverTimestamp, setDoc } from 'firebase/firestore';
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
    // Create a cache key for this route
    const cacheKey = `busStops_route_${routeNumber}`;
    
    const fetchBusStops = async () => {
      if (!routeNumber || routeNumber.trim() === '') return;
      
      setIsLoadingStops(true);
      console.log(`Fetching bus stops for route ${routeNumber}...`);
      
      try {
        // First check if we have cached data
        const cachedStops = await AsyncStorage.getItem(cacheKey);
        
        if (cachedStops) {
          console.log(`Using cached bus stops for route ${routeNumber}`);
          setAvailableStops(JSON.parse(cachedStops));
          setIsLoadingStops(false);
          return;
        }
        
        // If no cache, fetch from Firestore
        console.log(`Fetching bus stops for route ${routeNumber} from Firestore`);
        const routeCollectionName = `Route${routeNumber}`;
        console.log(`Looking for collection: ${routeCollectionName}`);
        
        const routeRef = collection(db, routeCollectionName);
        const stopsSnapshot = await getDocs(routeRef);
        
        console.log(`Found ${stopsSnapshot.size} stops for route ${routeNumber}`);
        
        if (stopsSnapshot.empty) {
          console.warn(`No stops found for route ${routeNumber}`);
          Alert.alert('No stops found', `No bus stops found for route ${routeNumber}`);
          setAvailableStops([]);
        } else {
          const stops = stopsSnapshot.docs.map(doc => doc.id);
          console.log('Available stops:', stops);
          
          // Cache the results
          await AsyncStorage.setItem(cacheKey, JSON.stringify(stops));
          
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

  // Function to clear bus stops cache for a specific route
  const clearBusStopsCache = async (routeNum) => {
    try {
      const cacheKey = `busStops_route_${routeNum}`;
      await AsyncStorage.removeItem(cacheKey);
      console.log(`Cleared bus stops cache for route ${routeNum}`);
    } catch (error) {
      console.error('Error clearing bus stops cache:', error);
    }
  };

  const handleSubmit = async () => {
    console.log('Submitting profile update...');
    
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
    console.log('Starting profile update with data:', {
      name: fullName,
      phoneNumber,
      routeNumber,
      busStop
    });
    
    try {
      // Get user email from Clerk
      const email = user?.emailAddresses?.[0]?.emailAddress;
      console.log('User email from Clerk:', email);
      
      if (!email) {
        console.error('User email not found in Clerk user object');
        throw new Error('User email not found');
      }
      
      // Get the user role from AsyncStorage or default to 'user'
      let role = 'user'; // Default role
      const storedRole = await AsyncStorage.getItem('userRole');
      if (storedRole) {
        role = storedRole;
      }
      
      // Validate user data
      if (!user?.id) {
        throw new Error('User ID is not available');
      }
      
      if (!email) {
        throw new Error('User email is not available');
      }
      
      console.log('Creating Firestore reference for user:', email);
      
      // Get existing data to preserve role if it exists
      const userRef = doc(firestoreDb, 'userdata', email);
      
      // Try to get existing document with retry mechanism
      let docSnap = null;
      let getDocRetries = 0;
      const maxGetDocRetries = 3;
      
      while (!docSnap && getDocRetries < maxGetDocRetries) {
        try {
          docSnap = await getDoc(userRef);
          break;
        } catch (getDocError) {
          getDocRetries++;
          console.warn(`⚠️ Failed to get existing document (attempt ${getDocRetries}/${maxGetDocRetries}):`, getDocError);
          
          if (getDocRetries < maxGetDocRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000 * getDocRetries));
          }
        }
      }
      
      // Preserve existing role if available
      if (docSnap?.exists() && docSnap.data().role) {
        role = docSnap.data().role;
        console.log('✅ Preserved existing role:', role);
      } else {
        console.log('ℹ️ No existing role found, using default:', role);
      }
      
      // Prepare user data
      const userData = {
        name: fullName,
        email,
        phoneNumber,
        routeNumber,
        busStop,
        image: user.imageUrl,
        role, // Ensure role is always included
        lastUpdated: serverTimestamp(),
      };
      
      console.log('📝 Preparing to save to Firestore:', {
        collection: 'userdata',
        document: email,
        data: {
          name: userData.name,
          email: userData.email,
          phoneNumber: userData.phoneNumber,
          routeNumber: userData.routeNumber,
          busStop: userData.busStop,
          role: userData.role
        }
      });
      
      // Save to Firestore with retry mechanism
      let retryCount = 0;
      const maxRetries = 3;
      let updateSuccessful = false;
      
      while (retryCount < maxRetries && !updateSuccessful) {
        try {
          console.log(`🔄 Attempting Firestore update (attempt ${retryCount + 1}/${maxRetries})...`);
          
          await setDoc(userRef, userData, { merge: true });
          
          console.log('✅ Firestore update successful');
          updateSuccessful = true;
          
        } catch (firestoreError) {
          retryCount++;
          console.error(`❌ Firestore update attempt ${retryCount} failed:`, {
            error: firestoreError.message,
            code: firestoreError.code,
            stack: firestoreError.stack
          });
          
          if (retryCount >= maxRetries) {
            throw new Error(`Failed to update Firestore after ${maxRetries} attempts: ${firestoreError.message}`);
          }
          
          // Wait before retrying (exponential backoff)
          const waitTime = 1000 * Math.pow(2, retryCount - 1); // 1s, 2s, 4s
          console.log(`⏳ Waiting ${waitTime}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
      
      // Verify the update was successful
      try {
        const verifyDoc = await getDoc(userRef);
        if (verifyDoc.exists()) {
          const savedData = verifyDoc.data();
          console.log('✅ Firestore update verified:', {
            name: savedData.name,
            phoneNumber: savedData.phoneNumber,
            routeNumber: savedData.routeNumber,
            busStop: savedData.busStop
          });
        } else {
          console.warn('⚠️ Document verification failed - document does not exist');
        }
      } catch (verifyError) {
        console.warn('⚠️ Could not verify Firestore update:', verifyError);
      }
      
      // Save to AsyncStorage
      const storedData = await AsyncStorage.getItem('userData');
      const parsedData = storedData ? JSON.parse(storedData) : {};
      
      const localUserData = {
        ...parsedData,
        ...userData,
        lastUpdated: new Date().toISOString(),
      };
      
      await AsyncStorage.setItem('userData', JSON.stringify(localUserData));
      console.log('✅ AsyncStorage update successful');
      
      // Notify parent component
      if (onUpdate) {
        console.log('Notifying parent component with updated data');
        onUpdate(localUserData);
      }
      
      // Close modal
      console.log('Closing modal');
      onClose();
      
      Alert.alert('Success', 'Your profile has been updated successfully.');
    } catch (error) {
      console.error('❌ Failed to update profile data:', error);
      
      // More detailed error message
      let errorMessage = 'Failed to update your profile. Please try again.';
      
      if (error.code === 'permission-denied') {
        errorMessage = 'You do not have permission to update this profile.';
      } else if (error.message.includes('network')) {
        errorMessage = 'Network error. Please check your internet connection and try again.';
      }
      
      Alert.alert('Error', errorMessage);
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
                  <View style={styles.labelRow}>
                    <Text style={[styles.label, { color: textColor }]}>Your Bus Stop</Text>
                    {routeNumber && (
                      <TouchableOpacity 
                        onPress={async () => {
                          // Clear cache and refetch
                          await clearBusStopsCache(routeNumber);
                          
                          // Reset state
                          setBusStop('');
                          setAvailableStops([]);
                          
                          // Trigger refetch by changing and restoring route number
                          const currentRoute = routeNumber;
                          setRouteNumber('');
                          setTimeout(() => setRouteNumber(currentRoute), 100);
                          
                          Alert.alert('Refreshing', 'Bus stops list is being refreshed...');
                        }}
                        style={styles.refreshButton}
                      >
                        <Text style={styles.refreshButtonText}>Refresh</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      if (routeNumber) {
                        if (isLoadingStops) {
                          Alert.alert('Loading', 'Bus stops are being loaded...');
                        } else if (availableStops.length > 0) {
                          setShowStopsList(!showStopsList);
                          console.log('Toggling stops list:', !showStopsList);
                        } else {
                          console.log('No stops available for route', routeNumber);
                          Alert.alert('No Stops Available', `No bus stops found for route ${routeNumber}. Please try another route.`);
                        }
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
                        Loading stops for Route {routeNumber}...
                      </Text>
                    </View>
                  )}
                  
                  {showStopsList && availableStops.length > 0 && (
                    <View style={[styles.stopsList, { backgroundColor: inputBgColor }]}>
                      <Text style={[styles.stopsListHeader, { color: textColor }]}>
                        Select a bus stop ({availableStops.length} available)
                      </Text>
                      <ScrollView style={{ maxHeight: 150 }} nestedScrollEnabled={true}>
                        {availableStops.map((stop) => (
                          <TouchableOpacity
                            key={stop}
                            style={[
                              styles.stopItem,
                              busStop === stop && { backgroundColor: isDark ? 'rgba(30, 144, 255, 0.2)' : 'rgba(30, 144, 255, 0.1)' }
                            ]}
                            onPress={() => {
                              console.log('Selected bus stop:', stop);
                              setBusStop(stop);
                              setShowStopsList(false);
                            }}
                          >
                            <Text style={[
                              styles.stopText, 
                              { color: textColor },
                              busStop === stop && { fontFamily: 'flux-bold', color: isDark ? '#1E90FF' : '#1E90FF' }
                            ]}>
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
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontSize: 14,
    fontFamily: 'flux-medium',
  },
  refreshButton: {
    backgroundColor: 'rgba(30, 144, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  refreshButtonText: {
    color: '#1E90FF',
    fontSize: 12,
    fontFamily: 'flux-medium',
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
  stopsListHeader: {
    fontSize: 14,
    fontFamily: 'flux-medium',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150, 150, 150, 0.2)',
    textAlign: 'center',
  },
});

export default EditProfileForm;