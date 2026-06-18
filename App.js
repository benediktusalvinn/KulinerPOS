import React, { useState, useEffect, useCallback } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CartProvider } from './src/context/CartContext';
import AppNavigator from './src/navigation/AppNavigator';
import { TOKEN_KEY, ADMIN_KEY } from './src/services/api';
import { COLORS } from './src/theme';

export default function App() {
  const [token, setToken] = useState(null);
  const [booting, setBooting] = useState(true);

  // Saat app dibuka, cek apakah token sudah tersimpan (sesi sebelumnya).
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(TOKEN_KEY);
        if (saved) setToken(saved);
      } catch (_) {
        /* abaikan — anggap belum login */
      } finally {
        setBooting(false);
      }
    })();
  }, []);

  const handleLogin = useCallback((newToken) => {
    setToken(newToken);
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await AsyncStorage.multiRemove([TOKEN_KEY, ADMIN_KEY]);
    } catch (_) {
      /* abaikan */
    }
    setToken(null);
  }, []);

  if (booting) {
    return (
      <View style={styles.splash}>
        <StatusBar style="dark" />
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <CartProvider>
        <AppNavigator
          token={token}
          onLogin={handleLogin}
          onLogout={handleLogout}
        />
      </CartProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
