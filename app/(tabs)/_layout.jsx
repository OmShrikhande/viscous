import { View, Text } from 'react-native'
import React from 'react'
import {Tabs } from 'expo-router'
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors } from './../../constants/Colors'
import Entypo from '@expo/vector-icons/Entypo';


export default function TabLayout() {
    return (
      <Tabs 
      screenOptions={{
        headerShown:false,
        tabBarActiveTintColor:Colors.PRIMARY
      }}
      
      >
      
      
        <Tabs.Screen name='home'
        options={{
          tabBarLabel:'Home',
          tabBarIcon:({color})=><FontAwesome name="home" size={24} color={color} />
        }}
        />

        <Tabs.Screen name='map'
        options={{
          tabBarLabel:'Map',
          tabBarIcon:({color})=><FontAwesome name="search" size={24} color={color} />
        }}
        />
  
<Tabs.Screen name='stats'
        options={{
          tabBarLabel:'stats',
          tabBarIcon:({color})=><Entypo name="bar-graph" size={24} color={color}  />
        }}
        />
  
        <Tabs.Screen name='profile'
        options={{
          tabBarLabel:'Profile',
          tabBarIcon:({color})=><Ionicons name="people-circle" size={24} color={color} />
        }}
        />
      </Tabs> 
    )
  }