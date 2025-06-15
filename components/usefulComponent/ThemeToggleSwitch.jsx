import React, { useState } from 'react';
import { View, Text, Switch, StyleSheet, Alert } from 'react-native';
import { doc, updateDoc } from 'firebase/firestore';
import { firestoreDb as db } from './../../configs/FirebaseConfigs';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ThemeToggleSwitch = ({ currentValue, userEmail }) => {
  const [isUpdating, setIsUpdating] = useState(false);

  const handleToggle = async () => {
    setIsUpdating(true);
    const newValue = !currentValue;

    try {
      // 🔥 Update Firestore
      const docRef = doc(db, 'userdata', userEmail);
      await updateDoc(docRef, { isDark: newValue });

      // 💾 Update AsyncStorage
      const storedData = await AsyncStorage.getItem('userData');
      if (storedData) {
        const parsed = JSON.parse(storedData);
        parsed.isDark = newValue;
        await AsyncStorage.setItem('userData', JSON.stringify(parsed));
      }

      Alert.alert('Theme Updated', `Switched to ${newValue ? 'Dark' : 'Light'} Mode`);
    } catch (error) {
      console.error('Error updating theme:', error);
      Alert.alert('Error', 'Failed to update theme');
    }

    setIsUpdating(false);
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: currentValue ? '#fff' : '#000' }]}>
        {currentValue ? 'Dark Mode' : 'Light Mode'}
      </Text>
      <Switch
        value={currentValue}
        onValueChange={handleToggle}
        thumbColor={currentValue ? '#1E90FF' : '#d3d3d3'}
        trackColor={{ false: '#767577', true: '#81b0ff' }}
        disabled={isUpdating}
      />
    </View>
  );
};

export default ThemeToggleSwitch;

const styles = StyleSheet.create({
  container: {
    marginTop: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
  },
});
