import { useAuth } from '@clerk/clerk-expo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme
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
import { Colors } from '../../constants/Colors';

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
  };

  const onMenuClick = (item, index) => {
    // Trigger animation
    animateItem(index);
    
    // Handle menu actions with a slight delay for animation
    setTimeout(async () => {
      if (item.path === 'logout') {
        try {
          await AsyncStorage.clear(); // Clear all stored data
          await signOut();
        } catch (error) {
          console.error('Error during logout:', error);
        }
        return;
      }
      if (item.path === 'share') {
        Share.share({
          message: `The S.B. Jain Bus Tracker App is a smart solution developed by Om Shrikhande 🎓, a 3rd-year CSE student, and Kuldeep Tiwari 🛠️, the IoT developer, to streamline institute transportation. With 🚌 Real-Time Bus Tracking, 📅 ETA updates, and 🗺️ Interactive Maps, the app ensures students and staff can track buses easily and plan commutes effectively. Its 🤝 User-Friendly Interface offers a seamless experience, making it a valuable tool for the S.B. Jain community. 🚀 Download the app here: ${apkLink || 'Link not available'}. If you are interested in Development contact us on LinkedIn.`,
        });
        return;
      }

      router.push(item.path);
    }, 300);
  };

  // Create animated styles for each menu item at the component level
  const animatedStyle0 = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: itemScales.value[0] || 1 },
        { rotate: `${itemRotations.value[0] || 0}deg` }
      ],
    };
  });
  
  const animatedStyle1 = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: itemScales.value[1] || 1 },
        { rotate: `${itemRotations.value[1] || 0}deg` }
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
      <FlatList
        data={menulist}
        numColumns={2}
        keyExtractor={(item) => item.id.toString()}
        columnWrapperStyle={{ justifyContent: 'space-between' }}
        renderItem={({ item, index }) => {
          return (
            <Animated.View
              entering={ZoomIn.delay(index * 200).springify()}
              style={getStyleForIndex(index)}
            >
              <TouchableOpacity
                onPress={() => onMenuClick(item, index)}
                activeOpacity={0.8}
              >
                <BlurView
                  intensity={20}
                  tint={currentTheme ? 'dark' : 'light'}
                  style={[
                    styles.card,
                    {
                      borderColor: currentTheme ? Colors.PRIMARY : Colors.SECONDARY,
                    },
                  ]}
                >
                  <Image source={item.icon} style={styles.icon} />
                  <Text style={[styles.name, { color: currentTheme ? Colors.PRIMARY : Colors.SECONDARY }]}>
                    {item.name}
                  </Text>
                  <Text style={[styles.description, { color: currentTheme ? '#aaa' : '#666' }]}>
                    {item.description}
                  </Text>
                </BlurView>
              </TouchableOpacity>
            </Animated.View>
          );
        }}
      />

      <Animated.Text 
        style={[styles.footerText, { color: currentTheme ? Colors.PRIMARY : Colors.SECONDARY }]}
        entering={FadeInDown.delay(600).springify()}
      >
        Made with ❤️ by Om Shrikhande
      </Animated.Text>
    </Animated.View>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
    paddingBottom: 30,
  },
  card: {
    flex: 1,
    margin: 10,
    padding: 20,
    borderRadius: 20,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    height: 160,
    width: width * 0.42,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  icon: {
    width: 60,
    height: 60,
    marginBottom: 15,
    resizeMode: 'contain',
  },
  name: {
    fontSize: 18,
    fontFamily: 'flux-bold',
    textAlign: 'center',
    marginBottom: 5,
  },
  description: {
    fontSize: 12,
    fontFamily: 'flux-medium',
    textAlign: 'center',
    opacity: 0.8,
  },
  footerText: {
    fontSize: 16,
    fontFamily: 'flux-bold',
    textAlign: 'center',
    marginTop: 40,
  },
});
