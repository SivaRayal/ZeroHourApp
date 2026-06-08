import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import DashboardScreen from "../screens/DashboardScreen";
import TrackScreen from "../screens/TrackScreen";
import PlanScreen from "../screens/PlanScreen";
import ActScreen from "../screens/ActScreen";
import ProfileScreen from "../screens/ProfileScreen";
import { COLORS } from "../theme";

const Tab = createBottomTabNavigator();

// Tab icon sizes
const ICON_SIZE = 22;
const ICON_SIZE_FOCUS = 24;

function TabIcon({ label, iconName, focused }) {
  return (
    <View style={styles.tabIcon}>
      <Ionicons
        name={focused ? iconName : `${iconName}-outline`}
        size={focused ? ICON_SIZE_FOCUS : ICON_SIZE}
        color={focused ? COLORS.neonGreen : COLORS.tabInactive}
      />
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
            <TabIcon label="HOME" iconName="home" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Plan"
        component={PlanScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon label="PLAN" iconName="list" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Act"
        component={ActScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon label="ACT" iconName="timer" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Track"
        component={TrackScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon label="TRACK" iconName="pulse" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        listeners={{ tabPress: () => {} }}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon label="PROFILE" iconName="person" focused={focused} />
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
    elevation: 20,
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
