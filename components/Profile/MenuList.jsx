import { useAuth } from '@clerk/clerk-expo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
  Dimensions,
  Image,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View
} from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
  ZoomIn
} from 'react-native-reanimated';
import { firestoreDb } from '../../configs/FirebaseConfigs';

export default function MenuList({ isDark }) {
  const { signOut } = useAuth();
  const router = useRouter();
  const scheme = useColorScheme();
  const systemIsDark = scheme === 'dark';
  
  // Use provided isDark prop or fall back to system theme
  const currentTheme = isDark !== undefined ? isDark : systemIsDark;

  const [apkLink, setApkLink] = useState('');
  
  // Animation values for each menu item
  const itemScales = useSharedValue([1, 1]);
  const itemRotations = useSharedValue([0, 0]);

  useEffect(() => {
    const fetchApkLink = async () => {
      try {
        const docRef = doc(firestoreDb, 'apklink', 'myapplink');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setApkLink(docSnap.data()['tracker app']);
        } else {
          console.error('No such document!');
        }
      } catch (error) {
        console.error('Error fetching APK link:', error);
      }
    };
    fetchApkLink();
    
    // Cleanup function to reset animation values when component unmounts
    return () => {
      // Reset animation values to prevent errors during unmount
      itemScales.value = [1, 1];
      itemRotations.value = [0, 0];
    };
  }, []);

  const menulist = [
    {
      id: 1,
      name: 'Share App',
      icon: require('../../assets/images/share.png'),
      path: 'share',
      description: 'Share this app with friends',
    },
    {
      id: 2,
      name: 'Logout',
      icon: require('../../assets/images/Logout.png'),
      path: 'logout',
      description: 'Sign out from your account',
    },
  ];
  
  const animateItem = (index) => {
    try {
      // Safely create new arrays with proper checks
      if (!itemScales.value || !Array.isArray(itemScales.value)) {
        itemScales.value = [1, 1];
      }
      
      if (!itemRotations.value || !Array.isArray(itemRotations.value)) {
        itemRotations.value = [0, 0];
      }
      
      // Create a new array to avoid mutating the shared value directly
      const newScales = [...itemScales.value];
      newScales[index] = withSequence(
        withTiming(0.95, { duration: 100 }),
        withTiming(1.05, { duration: 100 }),
        withTiming(1, { duration: 100 })
      );
      itemScales.value = newScales;
      
      // Animate rotation
      const newRotations = [...itemRotations.value];
      newRotations[index] = withSequence(
        withTiming(-5, { duration: 100 }),
        withTiming(5, { duration: 100 }),
        withTiming(0, { duration: 100 })
      );
      itemRotations.value = newRotations;
      
      // Trigger haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      console.error('Animation error:', error);
      // Reset to safe values if there's an error
      itemScales.value = [1, 1];
      itemRotations.value = [0, 0];
    }
  };

  const onMenuClick = (item, index) => {
    // Trigger animation
    animateItem(index);
    
    // Handle menu actions with a slight delay for animation
    setTimeout(async () => {
      if (item.path === 'logout') {
        try {
          // Reset animation values to prevent errors during unmount
          itemScales.value = [1, 1];
          itemRotations.value = [0, 0];
          
          // Clear storage and sign out
          await AsyncStorage.clear(); // Clear all stored data
          await signOut();
        } catch (error) {
          console.error('Error during logout:', error);
        }
        return;
      }
      if (item.path === 'share') {
        Share.share({
          message: `The Viscous Bus Tracker App is a smart solution developed by Om Shrikhande 🎓, a 3rd-year CSE student, and Kuldeep Tiwari 🛠️, the IoT developer, to streamline institute transportation. With 🚌 Real-Time Bus Tracking, 📅 ETA updates, and 🗺️ Interactive Maps, the app ensures students and staff can track buses easily and plan commutes effectively. Its 🤝 User-Friendly Interface offers a seamless experience, making it a valuable tool for the Viscous community. 🚀 Download the app here: ${apkLink || 'Link not available'}. If you are interested in Development contact us on LinkedIn.`,
        });
        return;
      }

      router.push(item.path);
    }, 300);
  };

  // Create animated styles for each menu item at the component level with improved safety checks
  const animatedStyle0 = useAnimatedStyle(() => {
    // Safely access array values with null coalescing
    const scale = (itemScales.value && itemScales.value[0] !== undefined) ? itemScales.value[0] : 1;
    const rotation = (itemRotations.value && itemRotations.value[0] !== undefined) ? itemRotations.value[0] : 0;
    
    return {
      transform: [
        { scale },
        { rotate: `${rotation}deg` }
      ],
    };
  });
  
  const animatedStyle1 = useAnimatedStyle(() => {
    // Safely access array values with null coalescing
    const scale = (itemScales.value && itemScales.value[1] !== undefined) ? itemScales.value[1] : 1;
    const rotation = (itemRotations.value && itemRotations.value[1] !== undefined) ? itemRotations.value[1] : 0;
    
    return {
      transform: [
        { scale },
        { rotate: `${rotation}deg` }
      ],
    };
  });

  // Function to get the appropriate style based on index
  const getStyleForIndex = (index) => {
    return index === 0 ? animatedStyle0 : animatedStyle1;
  };

  return (
    <Animated.View 
      style={styles.container}
      entering={FadeInDown.duration(800).springify()}
    >
      <View style={styles.menuGrid}>
        {menulist.map((item, index) => (
          <Animated.View
            key={item.id.toString()}
            entering={ZoomIn.delay(index * 200).springify()}
            style={getStyleForIndex(index)}
          >
            <TouchableOpacity
              onPress={() => onMenuClick(item, index)}
              activeOpacity={0.7}
              style={styles.touchableContainer}
            >
              <BlurView
                intensity={15}
                tint={currentTheme ? 'dark' : 'light'}
                style={[
                  styles.card,
                  {
                    backgroundColor: currentTheme ? 'rgba(30, 144, 255, 0.1)' : 'rgba(255, 255, 255, 0.8)',
                  },
                ]}
              >
                <View style={styles.cardContent}>
                  <View style={[
                    styles.iconContainer, 
                    { backgroundColor: currentTheme ? 'rgba(30, 144, 255, 0.2)' : 'rgba(30, 144, 255, 0.1)' }
                  ]}>
                    <Image source={item.icon} style={styles.icon} />
                  </View>
                  <View style={styles.textContainer}>
                    <Text style={[styles.name, { color: currentTheme ? '#07004D' : '#A41623' }]}>
                      {item.name}
                    </Text>
                    <Text style={[styles.description, { color: currentTheme ? '#aaa' : '#666' }]}>
                      {item.description}
                    </Text>
                  </View>
                </View>
              </BlurView>
            </TouchableOpacity>
          </Animated.View>
        ))}
      </View>
    </Animated.View>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    marginTop: 10,
    paddingBottom: 10,
  },
  menuGrid: {
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'stretch',
  },
  touchableContainer: {
    marginVertical: 6,
  },
  card: {
    padding: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  icon: {
    width: 28,
    height: 28,
    resizeMode: 'contain',
  },
  textContainer: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontFamily: 'flux-bold',
    marginBottom: 4,
  },
  description: {
    fontSize: 12,
    fontFamily: 'flux-medium',
    opacity: 0.8,
  },
});
