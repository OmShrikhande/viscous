import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurView } from 'expo-blur';
import { doc, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Alert, Dimensions, StyleSheet, Switch, View } from 'react-native';
import Animated, {
    Easing,
    interpolateColor,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming
} from 'react-native-reanimated';
import { firestoreDb as db } from './../../configs/FirebaseConfigs';

const ThemeToggleSwitch = ({ currentValue, userEmail, onToggle }) => {
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Animation values
  const themeProgress = useSharedValue(currentValue ? 1 : 0);
  const scaleValue = useSharedValue(1);
  const rotateValue = useSharedValue(0);
  
  useEffect(() => {
    // Update animation value when theme changes
    themeProgress.value = withTiming(currentValue ? 1 : 0, { 
      duration: 600,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1)
    });
  }, [currentValue]);

  const handleToggle = async () => {
    setIsUpdating(true);
    const newValue = !currentValue;
    
    // Immediately notify parent to update UI before animations and network operations
    if (onToggle) {
      onToggle(newValue);
    }
    
    // Animate the switch press
    scaleValue.value = withSpring(0.9, { damping: 10 }, () => {
      scaleValue.value = withSpring(1);
    });
    
    // Rotate animation
    rotateValue.value = withTiming(rotateValue.value + 180, { 
      duration: 600,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1)
    });

    try {
      // Update AsyncStorage first for immediate local persistence
      console.log('🎨 ThemeToggle: Updating AsyncStorage with isDark:', newValue);
      const storedData = await AsyncStorage.getItem('userData');
      if (storedData) {
        const parsed = JSON.parse(storedData);
        parsed.isDark = newValue;
        await AsyncStorage.setItem('userData', JSON.stringify(parsed));
        console.log('🎨 ThemeToggle: AsyncStorage updated successfully');
      } else {
        console.warn('🎨 ThemeToggle: No userData found in AsyncStorage');
      }

      // Then update Firestore (can happen in background)
      console.log('🎨 ThemeToggle: Updating Firestore with isDark:', newValue, 'for user:', userEmail);
      const docRef = doc(db, 'userdata', userEmail);
      await updateDoc(docRef, { isDark: newValue });
      console.log('🎨 ThemeToggle: Firestore updated successfully');

      // Show success message
      Alert.alert('Theme Updated', `Switched to ${newValue ? 'Dark' : 'Light'} Mode`);
    } catch (error) {
      console.error('Error updating theme:', error);
      Alert.alert('Error', 'Failed to update theme');
      
      // Revert the theme if there was an error
      if (onToggle) {
        onToggle(currentValue);
      }
    }

    setIsUpdating(false);
  };
  
  // Animated styles
  const containerAnimatedStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      themeProgress.value,
      [0, 1],
      ['rgba(240, 240, 240, 0.7)', 'rgba(30, 30, 30, 0.7)']
    );
    
    return {
      backgroundColor,
      transform: [
        { scale: scaleValue.value },
      ],
    };
  });
  
  const iconAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { rotate: `${rotateValue.value}deg` }
      ],
    };
  });
  
  const textAnimatedStyle = useAnimatedStyle(() => {
    const color = interpolateColor(
      themeProgress.value,
      [0, 1],
      ['#000', '#fff']
    );
    
    return {
      color,
    };
  });

  return (
    <Animated.View style={[styles.container, containerAnimatedStyle]}>
      <BlurView intensity={20} style={styles.blurContainer} tint={currentValue ? 'dark' : 'light'}>
        <View style={styles.header}>
          <Animated.View style={[styles.iconContainer, iconAnimatedStyle]}>
            <Animated.Text style={styles.iconText}>
              {currentValue ? '🌙' : '☀️'}
            </Animated.Text>
          </Animated.View>
          
          <Animated.Text style={[styles.label, textAnimatedStyle]}>
            {currentValue ? 'Dark Mode' : 'Light Mode'}
          </Animated.Text>
          
          <Switch
            value={currentValue}
            onValueChange={handleToggle}
            thumbColor={currentValue ? '#1E90FF' : '#d3d3d3'}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            disabled={isUpdating}
          />
        </View>
        
        <Animated.Text style={[styles.description, textAnimatedStyle]}>
          {currentValue 
            ? 'Easier on the eyes in low light' 
            : 'Bright and clear for daytime use'}
        </Animated.Text>
      </BlurView>
    </Animated.View>
  );
};

export default ThemeToggleSwitch;

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
    borderRadius: 16,
    overflow: 'hidden',
    width: '100%',
    alignSelf: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  blurContainer: {
    width: '100%',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  iconContainer: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 18,
  },
  label: {
    fontSize: 16,
    fontFamily: 'flux-bold',
    flex: 1,
    marginLeft: 10,
  },
  description: {
    fontSize: 14,
    fontFamily: 'flux',
    marginLeft: 38,
    opacity: 0.8,
  },
});
