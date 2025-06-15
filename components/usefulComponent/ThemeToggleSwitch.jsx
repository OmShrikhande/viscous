import React, { useState } from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';
import { doc, updateDoc } from 'firebase/firestore';
import { firestoreDb as db } from './../../configs/FirebaseConfigs'; // adjust path

const ThemeToggleSwitch = ({ currentValue }) => {
  const [isUpdating, setIsUpdating] = useState(false);

  const handleToggle = async () => {
    setIsUpdating(true);
    try {
      const docRef = doc(db, 'apklink', 'theme');
      await updateDoc(docRef, { isdark: !currentValue });
    } catch (error) {
      console.error('Error updating theme:', error);
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
