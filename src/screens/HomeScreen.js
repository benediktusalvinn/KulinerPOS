import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { getErrorMessage, ADMIN_KEY } from '../services/api';
import { COLORS, SHADOW } from '../theme';
import { formatRupiah, todayLocalDate } from '../utils/format';

export default function HomeScreen({ navigation, onLogout }) {
  const [adminName, setAdminName] = useState('Kasir');
  const [summary, setSummary] = useState({ revenue: 0, orders: 0, items: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const firstLoad = useRef(true);

  const loadAdmin = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(ADMIN_KEY);
      if (raw) {
        const admin = JSON.parse(raw);
        if (admin?.name) setAdminName(admin.name);
      }
    } catch (_) {
      /* abaikan */
    }
  }, []);

  const loadSummary = useCallback(async () => {
    setError('');
    try {
      const today = todayLocalDate();
      // Omzet hari ini dihitung server (from=to=hari ini), sudah termasuk PPN
      // dan mengecualikan pesanan berstatus "Batal".
      const res = await api.get('/reports/sales', {
        params: { from: today, to: today },
      });
      const s = res.data?.summary || {};
      setSummary({
        revenue: s.revenue || 0,
        orders: s.orders || 0,
        items: s.items || 0,
      });
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        await loadAdmin();
        await loadSummary();
        if (active && firstLoad.current) {
          setLoading(false);
          firstLoad.current = false;
        }
      })();
      return () => {
        active = false;
      };
    }, [loadAdmin, loadSummary])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadSummary();
    setRefreshing(false);
  }, [loadSummary]);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 11) return 'Selamat pagi';
    if (h < 15) return 'Selamat siang';
    if (h < 19) return 'Selamat sore';
    return 'Selamat malam';
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Header greeting */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>{greeting()},</Text>
            <Text style={styles.name}>{adminName} 👋</Text>
          </View>
          <TouchableOpacity style={styles.logoutBtn} onPress={onLogout} hitSlop={8}>
            <Ionicons name="log-out-outline" size={22} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Kartu Omzet (Indigo) */}
        <View style={styles.omzetCard}>
          <View style={styles.omzetTop}>
            <Text style={styles.omzetLabel}>Total Omzet Hari Ini</Text>
            <Ionicons name="trending-up" size={20} color="rgba(255,255,255,0.9)" />
          </View>
          {loading ? (
            <ActivityIndicator
              color="#FFFFFF"
              style={{ marginVertical: 12, alignSelf: 'flex-start' }}
            />
          ) : (
            <Text style={styles.omzetValue}>{formatRupiah(summary.revenue)}</Text>
          )}
          <View style={styles.omzetFooter}>
            <View style={styles.omzetStat}>
              <Text style={styles.omzetStatNum}>{loading ? '—' : summary.orders}</Text>
              <Text style={styles.omzetStatLabel}>Transaksi</Text>
            </View>
            <View style={styles.omzetDivider} />
            <View style={styles.omzetStat}>
              <Text style={styles.omzetStatNum}>{loading ? '—' : summary.items}</Text>
              <Text style={styles.omzetStatLabel}>Item Terjual</Text>
            </View>
          </View>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="cloud-offline-outline" size={16} color={COLORS.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Shortcut */}
        <Text style={styles.sectionTitle}>Akses Cepat</Text>
        <View style={styles.shortcutRow}>
          <TouchableOpacity
            style={styles.shortcut}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('Kasir')}
          >
            <View style={[styles.shortcutIcon, { backgroundColor: COLORS.primarySoft }]}>
              <Ionicons name="cart" size={24} color={COLORS.primary} />
            </View>
            <Text style={styles.shortcutText}>Mulai Transaksi</Text>
            <Text style={styles.shortcutSub}>Buka kasir & pilih produk</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.shortcut}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('Riwayat')}
          >
            <View style={[styles.shortcutIcon, { backgroundColor: COLORS.accentSoft }]}>
              <Ionicons name="receipt" size={24} color={COLORS.accentDark} />
            </View>
            <Text style={styles.shortcutText}>Riwayat Hari Ini</Text>
            <Text style={styles.shortcutSub}>Lihat transaksi sukses</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={20} color={COLORS.primary} />
          <Text style={styles.infoText}>
            Tarik layar ke bawah untuk menyegarkan omzet. Nilai dihitung dari
            seluruh transaksi hari ini (di luar yang dibatalkan).
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  container: { padding: 20, paddingBottom: 32 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 22,
  },
  greeting: { fontSize: 15, color: COLORS.textSecondary },
  name: { fontSize: 24, fontWeight: '800', color: COLORS.textPrimary, marginTop: 2 },
  logoutBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW,
  },
  omzetCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 22,
    padding: 22,
    ...SHADOW,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.3,
  },
  omzetTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  omzetLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: '500' },
  omzetValue: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '800',
    marginTop: 10,
    letterSpacing: 0.3,
  },
  omzetFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.18)',
  },
  omzetStat: { flex: 1, alignItems: 'center' },
  omzetStatNum: { color: '#FFFFFF', fontSize: 20, fontWeight: '700' },
  omzetStatLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2 },
  omzetDivider: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.18)' },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
    gap: 8,
  },
  errorText: { flex: 1, color: COLORS.danger, fontSize: 13 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 26,
    marginBottom: 14,
  },
  shortcutRow: { flexDirection: 'row', gap: 14 },
  shortcut: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 16,
    ...SHADOW,
  },
  shortcutIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  shortcutText: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  shortcutSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 3 },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: COLORS.primarySoft,
    borderRadius: 16,
    padding: 16,
    marginTop: 22,
  },
  infoText: { flex: 1, fontSize: 13, color: '#4338CA', lineHeight: 19 },
});
