import React from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import DashboardScreen from "../screens/DashboardScreen";
import BodyScreen from "../screens/BodyScreen";
import MindScreen from "../screens/MindScreen";
import SoulScreen from "../screens/SoulScreen";
import ProfileScreen from "../screens/ProfileScreen";
import { COLORS } from "../theme";

const Tab = createBottomTabNavigator();

function TabIcon({ label, icon, focused }) {
  return (
    <View style={styles.tabIcon}>
      <Text style={[styles.tabEmoji, focused && styles.tabEmojiActive]}>
        {icon}
      </Text>
      <Text
        style={[
          styles.tabLabel,
          { color: focused ? COLORS.neonGreen : COLORS.tabInactive },
        ]}
      >
        {label}
      </Text>
      {focused && <View style={styles.activeDot} />}
    </View>
  );
}

function TabsNavigator({ onLogout }) {
  const insets = useSafeAreaInsets();
  // bottomPad: respect the device's navigation bar (gesture strip or button row).
  // Add a minimum of 8 px on top of whatever the OS reports so there's always
  // comfortable breathing room even on devices with no nav bar.
  const bottomPad = Math.max(insets.bottom, 8);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: [
          styles.tabBar,
          { paddingBottom: bottomPad, height: 62 + bottomPad },
        ],
        tabBarShowLabel: false,
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon label="HOME" icon="🏠" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Body"
        component={BodyScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon label="BODY" icon="🧬" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Mind"
        component={MindScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon label="MIND" icon="☮️" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Soul"
        component={SoulScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon label="SOUL" icon="⏳" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        listeners={{ tabPress: () => {} }}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon label="PROFILE" icon="🪪" focused={focused} />
          ),
        }}
      >
        {() => <ProfileScreen onLogout={onLogout} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

export default function MainTabs({ onLogout }) {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <TabsNavigator onLogout={onLogout} />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: COLORS.tabBg,
    borderTopWidth: 1,
    borderTopColor: "#1A2035",
    paddingTop: 6,
    elevation: 20, // Android shadow above content
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  tabIcon: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 2,
    minWidth: 56,
  },
  tabEmoji: {
    fontSize: 22,
    opacity: 0.55,
  },
  tabEmojiActive: {
    opacity: 1,
    fontSize: 24,
  },
  tabLabel: {
    fontSize: 9,
    letterSpacing: 2,
    fontWeight: "700",
    marginTop: 3,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.neonGreen,
    marginTop: 3,
  },
});
