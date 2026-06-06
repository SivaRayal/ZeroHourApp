import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, Text, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';
import { Storage } from './src/store/storage';
import RegisterScreen from './src/screens/RegisterScreen';
import AuthScreen from './src/screens/AuthScreen';
import MainTabs from './src/navigation/MainTabs';
import DisclaimerModal from './src/components/DisclaimerModal';

const LAUNCH_DISCLAIMER_TITLE = 'TRAVEL NOTICE';
const LAUNCH_DISCLAIMER_BODY =
  'This app uses an airport and flight-themed experience to represent your personal goals, focus sessions, fitness activities, and wellness journeys.\n\n' +
  'All flights, departures, destinations, and travel progress displayed are symbolic and do not represent real-world travel information.\n\n' +
  'Fitness and fasting features are provided for tracking and motivational purposes only and are not medical advice.\n\n' +
  'Ready for departure?';

SplashScreen.preventAutoHideAsync();

// Auth flow is handled with simple state — no Stack Navigator needed.
// Stack navigator + gesture-handler v3 causes TypeError on Android Expo Go.
// Tab navigator (MainTabs) is self-contained inside NavigationContainer.

export default function App() {
  const [screen, setScreen] = useState('loading'); // 'loading' | 'register' | 'auth' | 'main'
  // Show the launch disclaimer every time the app starts (after loading resolves)
  const [showLaunchDisclaimer, setShowLaunchDisclaimer] = useState(false);

  useEffect(() => {
    prepare();
  }, []);

  async function prepare() {
    try {
      const user = await Storage.getUser();
      setScreen(user ? 'auth' : 'register');
    } catch {
      setScreen('register');
    } finally {
      await SplashScreen.hideAsync().catch(() => {});
      // Always show the disclaimer on every fresh launch
      setShowLaunchDisclaimer(true);
    }
  }

  // Shared launch disclaimer — rendered on top of whatever screen is active
  const launchDisclaimer = (
    <DisclaimerModal
      visible={showLaunchDisclaimer}
      icon="✈️"
      title={LAUNCH_DISCLAIMER_TITLE}
      body={LAUNCH_DISCLAIMER_BODY}
      confirmLabel="READY FOR DEPARTURE"
      accentColors={['#00FF88', '#00CFFF']}
      onConfirm={() => setShowLaunchDisclaimer(false)}
    />
  );

  if (screen === 'loading') {
    return (
      <>
        <View style={styles.splash}>
          <Text style={styles.splashLogo}>ZEROHOUR</Text>
          <Text style={styles.splashTag}>WHERE DISCIPLINE BEGINS</Text>
        </View>
        {launchDisclaimer}
      </>
    );
  }

  if (screen === 'register') {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <StatusBar style="light" />
        <RegisterScreen onRegistered={() => setScreen('auth')} />
        {launchDisclaimer}
      </GestureHandlerRootView>
    );
  }

  if (screen === 'auth') {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <StatusBar style="light" />
        <AuthScreen onAuthenticated={() => setScreen('main')} />
        {launchDisclaimer}
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />
      <MainTabs onLogout={() => setScreen('auth')} />
      {launchDisclaimer}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: '#05070D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashLogo: {
    color: '#F0F4FF',
    fontSize: 52,
    fontWeight: '900',
    letterSpacing: 14,
  },
  splashTag: {
    color: '#3D4556',
    fontSize: 10,
    letterSpacing: 6,
    marginTop: 10,
  },
});
