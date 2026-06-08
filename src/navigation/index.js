import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import RegisterScreen from '../screens/RegisterScreen';
import AuthScreen from '../screens/AuthScreen';
import DashboardScreen from '../screens/DashboardScreen';
import TrackScreen from '../screens/TrackScreen';
import PlanScreen from '../screens/PlanScreen';
import ActScreen from '../screens/ActScreen';
import ProfileScreen from '../screens/ProfileScreen';
import { COLORS } from '../theme';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function TabIcon({ label, icon, focused }) {
  return (
    <View style={[styles.tabIcon, focused && styles.tabIconActive]}>
      <Text style={{ fontSize: 18 }}>{icon}</Text>
      <Text style={[styles.tabLabel, { color: focused ? COLORS.neonGreen : COLORS.tabInactive }]}>
        {label}
      </Text>
    </View>
  );
}

function MainApp() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon label="GATE" icon="🏠" focused={focused} /> }}
      />
      <Tab.Screen
        name="Track"
        component={TrackScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon label="TRACK" icon="🧬" focused={focused} /> }}
      />
      <Tab.Screen
        name="Plan"
        component={PlanScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon label="PLAN" icon="🧠" focused={focused} /> }}
      />
      <Tab.Screen
        name="Act"
        component={ActScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon label="ACT" icon="✨" focused={focused} /> }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon label="PASS" icon="🪪" focused={focused} /> }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator({ initialRoute = 'Register' }) {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={initialRoute}
        screenOptions={{ headerShown: false, animation: 'fade' }}
      >
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="Auth" component={AuthScreen} />
        <Stack.Screen name="MainApp" component={MainApp} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: COLORS.tabBg,
    borderTopWidth: 1,
    borderTopColor: '#1A2035',
    height: 72,
    paddingBottom: 8,
    paddingTop: 4,
  },
  tabIcon: { alignItems: 'center', paddingVertical: 4 },
  tabIconActive: {},
  tabLabel: { fontSize: 8, letterSpacing: 2, fontWeight: '700', marginTop: 2 },
});
