import React, { useEffect, useState } from 'react';
import { Tabs } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Ionicons from '@expo/vector-icons/Ionicons';
import Entypo from '@expo/vector-icons/Entypo';
import AsyncStorage from '@react-native-async-storage/async-storage'; // if using storage
import { Colors } from '../../constants/Colors';

export default function TabLayout() {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Fetch role info (use your actual logic here)
    const checkAdmin = async () => {
      const role = await AsyncStorage.getItem('userRole'); // or fetch from context/backend
      setIsAdmin(role === 'admin');
    };

    checkAdmin();
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.PRIMARY,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color }) => (
            <FontAwesome name="home" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          tabBarLabel: 'Map',
          tabBarIcon: ({ color }) => (
            <FontAwesome name="search" size={24} color={color} />
          ),
        }}
      />
      {isAdmin && (
        <Tabs.Screen
          name="stats"
          options={{
            tabBarLabel: 'Stats',
            tabBarIcon: ({ color }) => (
              <Entypo name="bar-graph" size={24} color={color} />
            ),
          }}
        />
      )}
      <Tabs.Screen
        name="profile"
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color }) => (
            <Ionicons name="people-circle" size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
