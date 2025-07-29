import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { debugFirebaseConnection, debugRealtimeStructure, debugRouteData } from '../../utils/firebaseDebugger';

const FirebaseDebugCard = ({ isDark, userRouteNumber }) => {
  const [debugOutput, setDebugOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);

  const runAllDebugChecks = async () => {
    setIsRunning(true);
    setDebugOutput('Running debug checks...\n');
    
    // Capture console.log output
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;
    
    let output = '';
    
    console.log = (...args) => {
      output += args.join(' ') + '\n';
      originalLog(...args);
    };
    
    console.error = (...args) => {
      output += 'ERROR: ' + args.join(' ') + '\n';
      originalError(...args);
    };
    
    console.warn = (...args) => {
      output += 'WARN: ' + args.join(' ') + '\n';
      originalWarn(...args);
    };
    
    try {
      await debugFirebaseConnection();
      await debugRealtimeStructure();
      
      if (userRouteNumber) {
        await debugRouteData(userRouteNumber);
      }
      
      setDebugOutput(output);
    } catch (error) {
      setDebugOutput(output + '\nUnexpected error: ' + error.message);
    } finally {
      // Restore original console methods
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
      setIsRunning(false);
    }
  };

  const textColor = isDark ? '#fff' : '#000';
  const cardBg = isDark ? '#333' : '#fff';
  const buttonBg = isDark ? '#555' : '#007AFF';

  return (
    <View style={[styles.container, { backgroundColor: cardBg }]}>
      <Text style={[styles.title, { color: textColor }]}>Firebase Debug</Text>
      
      <TouchableOpacity
        style={[styles.button, { backgroundColor: buttonBg }]}
        onPress={runAllDebugChecks}
        disabled={isRunning}
      >
        <Text style={styles.buttonText}>
          {isRunning ? 'Running...' : 'Run Debug Checks'}
        </Text>
      </TouchableOpacity>
      
      {debugOutput ? (
        <ScrollView style={styles.outputContainer}>
          <Text style={[styles.output, { color: textColor }]}>
            {debugOutput}
          </Text>
        </ScrollView>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: 16,
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  button: {
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  outputContainer: {
    maxHeight: 300,
    backgroundColor: '#f5f5f5',
    padding: 8,
    borderRadius: 4,
  },
  output: {
    fontSize: 12,
    fontFamily: 'monospace',
  },
});

export default FirebaseDebugCard;