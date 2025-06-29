import { Colors } from '@/constants/Colors';
import { useAuth } from '@clerk/clerk-expo';
import { Redirect, useNavigation } from "expo-router";
import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

export default function Index() {
  const [isLoading, setIsLoading] = useState(true);
  const navigation = useNavigation();
  const { isSignedIn, isLoaded } = useAuth();

  useEffect(() => {
    // Hide the header when this screen is active
    navigation.setOptions({
      headerShown: false,
    });

    // Wait for auth to load, then show splash for a short time
    const timer = setTimeout(() => {
      if (isLoaded) { // Only finish loading when auth state is known
        setIsLoading(false);
      }
    }, 1500); // Reduced to 1.5 seconds

    // Clean up the timer
    return () => clearTimeout(timer);
  }, [navigation, isLoaded]);

  // Show splash screen while loading or auth is not ready
  if (isLoading || !isLoaded) {
    return (
      <View style={styles.container}>
        <Image
          source={require('../assets/images/bustrackerlogo.png')}
          style={styles.logo}
        />
        <Text style={styles.appName}>{Colors.Appname}</Text>
      </View>
    );
  }

  // Always redirect to tabs route - _layout.jsx will handle showing LoginScreen or Home based on auth
  return <Redirect href="/(tabs)/home" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 150,
    height: 150,
    marginBottom: 20,
    borderRadius:20,
  },
  appName: {
    fontSize: 40, // Larger font size for the app name
    fontFamily:'flux-bold',
    color: Colors.SECONDARY, // White color for the app name
    letterSpacing: 2, // More spaced letters for a cool effect
    textTransform: 'uppercase', // Uppercase text
  },
});
