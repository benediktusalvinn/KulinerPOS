import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import KasirScreen from '../screens/KasirScreen';
import RiwayatScreen from '../screens/RiwayatScreen';
import { COLORS } from '../theme';

const Tab = createBottomTabNavigator();

const TAB_ICONS = {
  Home: 'home',
  Kasir: 'cart',
  Riwayat: 'receipt',
};

function MainTabs({ onLogout }) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopColor: COLORS.border,
          height: 62,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        tabBarIcon: ({ color, size }) => (
          <Ionicons name={TAB_ICONS[route.name] || 'ellipse'} size={size} color={color} />
        ),
      })}
    >
      <Tab.Screen name="Home" options={{ title: 'Dashboard' }}>
        {(props) => <HomeScreen {...props} onLogout={onLogout} />}
      </Tab.Screen>
      <Tab.Screen name="Kasir" component={KasirScreen} />
      <Tab.Screen name="Riwayat" component={RiwayatScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator({ token, onLogin, onLogout }) {
  return (
    <NavigationContainer>
      {token ? (
        <MainTabs onLogout={onLogout} />
      ) : (
        <LoginScreen onLogin={onLogin} />
      )}
    </NavigationContainer>
  );
}
