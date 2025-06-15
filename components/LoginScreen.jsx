// Updated LoginScreen.js
import React from 'react';
import { View, Text, Image, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Colors } from '@/constants/Colors';
import * as WebBrowser from 'expo-web-browser';
import { useOAuth } from '@clerk/clerk-expo';
import * as Linking from 'expo-linking';
import { useWarmUpBrowser } from '@/hooks/useWarmUpBrowser';
import { useWindowDimensions } from 'react-native';

WebBrowser.maybeCompleteAuthSession()

export default function LoginScreen() {
  
  useWarmUpBrowser();
  const { startOAuthFlow: startGoogleOAuthFlow } = useOAuth({ strategy: 'oauth_google' });

  let startAppleOAuthFlow;
  try {
    startAppleOAuthFlow = useOAuth({ strategy: 'oauth_apple' }).startOAuthFlow;
  } catch (err) {
    console.error('Apple OAuth strategy is not supported. Please check your Clerk configuration.', err);
  }

  const { width, height } = useWindowDimensions();

  const onPressGoogle = React.useCallback(async () => {
    try {
      const { createdSessionId, signIn, signUp, setActive } = await startGoogleOAuthFlow({
        redirectUrl: Linking.createURL('/dashboard', { scheme: 'myapp' }),
      });

      if (createdSessionId) {
        setActive({ session: createdSessionId });
      } else {
        // Use signIn or signUp for next steps such as MFA
      }
    } catch (err) {
      console.error('Google OAuth error', err);
    }
  }, []);

  const onPressApple = React.useCallback(async () => {
    if (!startAppleOAuthFlow) {
      console.error('Apple OAuth is not configured properly.');
      return;
    }

    try {
      const { createdSessionId, signIn, signUp, setActive } = await startAppleOAuthFlow({
        redirectUrl: Linking.createURL('/dashboard', { scheme: 'myapp' }),
      });

      if (createdSessionId) {
        setActive({ session: createdSessionId });
      } else {
        // Use signIn or signUp for next steps such as MFA
      }
    } catch (err) {
      console.error('Apple OAuth error', err);
    }
  }, []);

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
      <View style={[styles.container, { paddingHorizontal: width * 0.05 }]}>
        <View style={[styles.imageContainer, { marginTop: height * 0.15 }]}>
          <Image
            source={require('../assets/images/image.png')}
            style={[styles.image, { width: width * 0.6, height: height * 0.35 }]}
          />
        </View>

        <View style={[styles.subContainer, { padding: width * 0.08 }]}>
          <Text style={styles.title}>
            Your Ultimate <Text style={{ color: Colors.PRIMARY }}>S.B. Jain's Bus Tracker</Text> App
          </Text>

          <Text style={styles.description}>
            Let you get the realtime location of your bus using this application
          </Text>

          <TouchableOpacity style={styles.btn} onPress={onPressGoogle}>
            <Text style={styles.btnText}>Login with Google</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btn} onPress={onPressApple}>
            <Text style={styles.btnText}>Login with Apple</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

// External stylesheet
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  imageContainer: {
    alignItems: 'center',
  },
  image: {
    borderWidth: 2,
    borderRadius: 20,
    borderColor: '#fff',
  },
  subContainer: {
    backgroundColor: '#fff',
    marginTop: -20,
  },
  title: {
    fontSize: 35,
    textAlign: 'center',
    fontFamily: 'flux-bold',
  },
  description: {
    fontSize: 15,
    fontFamily: 'flux',
    color: Colors.GRAY,
    textAlign: 'center',
    marginVertical: 15,
  },
  btn: {
    backgroundColor: Colors.PRIMARY,
    padding: 15,
    borderRadius: 90,
    marginTop: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.27,
    shadowRadius: 4.65,
    borderColor: '#000',
    borderWidth: 2,
  },
  btnText: {
    color: '#fff',
    fontFamily: 'flux-bold',
  },
});
