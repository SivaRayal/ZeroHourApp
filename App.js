import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, Text, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';
import { Storage } from './src/store/storage';
import RegisterScreen from './src/screens/RegisterScreen';
import AuthScreen from './src/screens/AuthScreen';
import MainTabs from './src/navigation/MainTabs';

SplashScreen.preventAutoHideAsync();

// Auth flow is handled with simple state — no Stack Navigator needed.
// Stack navigator + gesture-handler v3 causes TypeError on Android Expo Go.
// Tab navigator (MainTabs) is self-contained inside NavigationContainer.

export default function App() {
  const [screen, setScreen] = useState('loading'); // 'loading' | 'register' | 'auth' | 'main'

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
    }
  }

  if (screen === 'loading') {
    return (
      <View style={styles.splash}>
        <Text style={styles.splashLogo}>ZEROHOUR</Text>
        <Text style={styles.splashTag}>WHERE DISCIPLINE BEGINS</Text>
      </View>
    );
  }

  if (screen === 'register') {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <StatusBar style="light" />
        <RegisterScreen onRegistered={() => setScreen('auth')} />
      </GestureHandlerRootView>
    );
  }

  if (screen === 'auth') {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <StatusBar style="light" />
        <AuthScreen onAuthenticated={() => setScreen('main')} />
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />
      <MainTabs onLogout={() => setScreen('auth')} />
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
