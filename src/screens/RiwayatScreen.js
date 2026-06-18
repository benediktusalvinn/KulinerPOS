import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import api, { getErrorMessage } from '../services/api';
import { COLORS, SHADOW } from '../theme';
import { formatRupiah, formatTime, isToday } from '../utils/format';

// Hitung total kuantitas item dalam satu order.
function totalQty(order) {
  if (!Array.isArray(order.items)) return 0;
  return order.items.reduce((sum, it) => sum + (it.qty || 0), 0);
}

function OrderCard({ order }) {
  const paid = order.paymentStatus === 'Lunas';
  const qris = order.payMethod === 'QRIS';
  return (
    <View style={styles.card}>
      <View style={styles.cardLeft}>
        <View style={styles.queueBadge}>
          <Text style={styles.queueText}>{order.queue || '—'}</Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.cardTopRow}>
          <Text style={styles.customer} numberOfLines={1}>
            {order.customer || 'Tamu'}
          </Text>
          <Text style={styles.total}>{formatRupiah(order.total)}</Text>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="cube-outline" size={13} color={COLORS.textSecondary} />
            <Text style={styles.metaText}>{totalQty(order)} item</Text>
          </View>
          <View style={styles.metaDot} />
          <View style={styles.metaItem}>
            <Ionicons
              name={qris ? 'qr-code-outline' : 'cash-outline'}
              size={13}
              color={COLORS.textSecondary}
            />
            <Text style={styles.metaText}>{order.payMethod || 'Tunai'}</Text>
          </View>
          <View style={styles.metaDot} />
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={13} color={COLORS.textSecondary} />
            <Text style={styles.metaText}>{formatTime(order.timestamp)}</Text>
          </View>
        </View>

        <View
          style={[
            styles.statusChip,
            { backgroundColor: paid ? '#ECFDF5' : COLORS.accentSoft },
          ]}
        >
          <View
            style={[
              styles.statusDot,
              { backgroundColor: paid ? COLORS.success : COLORS.accentDark },
            ]}
          />
          <Text
            style={[
              styles.statusText,
              { color: paid ? '#047857' : COLORS.accentDark },
            ]}
          >
            {order.paymentStatus || 'Belum Bayar'}
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function RiwayatScreen() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const firstLoad = useRef(true);

  const loadOrders = useCallback(async () => {
    setError('');
    try {
      // Backend tidak punya filter tanggal pada GET /orders, jadi ambil halaman
      // terbaru lalu saring "hari ini" di sisi klien (data sudah terurut DESC).
      const res = await api.get('/orders', { params: { page: 1, limit: 50 } });
      const all = res.data?.data || [];
      const today = all.filter((o) => isToday(o.timestamp));
      setOrders(today);
    } catch (err) {
      setError(getErrorMessage(err));
      setOrders([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        await loadOrders();
        if (active && firstLoad.current) {
          setLoading(false);
          firstLoad.current = false;
        }
      })();
      return () => {
        active = false;
      };
    }, [loadOrders])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadOrders();
    setRefreshing(false);
  }, [loadOrders]);

  const recordedTotal = orders.reduce((sum, o) => sum + (o.total || 0), 0);

  const ListHeader = (
    <View style={styles.summaryCard}>
      <View style={styles.summaryIcon}>
        <Ionicons name="receipt" size={22} color={COLORS.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.summaryLabel}>Total Pendapatan Tercatat</Text>
        <Text style={styles.summaryValue}>{formatRupiah(recordedTotal)}</Text>
      </View>
      <View style={styles.summaryCountBox}>
        <Text style={styles.summaryCountNum}>{orders.length}</Text>
        <Text style={styles.summaryCountLabel}>transaksi</Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.center} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.centerText}>Memuat riwayat…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      <View style={styles.titleBar}>
        <Text style={styles.title}>Riwayat Hari Ini</Text>
        <Text style={styles.subtitle}>Transaksi yang berhasil tercatat</Text>
      </View>

      <FlatList
        data={orders}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <OrderCard order={item} />}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
        ListEmptyComponent={
          error ? (
            <View style={styles.emptyWrap}>
              <Ionicons name="cloud-offline-outline" size={40} color={COLORS.danger} />
              <Text style={styles.emptyTitle}>Gagal memuat data</Text>
              <Text style={styles.emptySub}>{error}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={onRefresh}>
                <Ionicons name="refresh" size={16} color="#FFFFFF" />
                <Text style={styles.retryText}>Coba Lagi</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.emptyWrap}>
              <Ionicons name="document-text-outline" size={40} color={COLORS.textSecondary} />
              <Text style={styles.emptyTitle}>Belum ada transaksi</Text>
              <Text style={styles.emptySub}>
                Transaksi yang kamu proses hari ini akan muncul di sini.
              </Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  center: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerText: { marginTop: 12, color: COLORS.textSecondary, fontSize: 14 },
  titleBar: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.textPrimary },
  subtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  listContent: { padding: 20, paddingTop: 14, paddingBottom: 32, flexGrow: 1 },

  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 18,
    marginBottom: 18,
    gap: 14,
    ...SHADOW,
  },
  summaryIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryLabel: { fontSize: 13, color: COLORS.textSecondary },
  summaryValue: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  summaryCountBox: {
    alignItems: 'center',
    paddingLeft: 14,
    borderLeftWidth: 1,
    borderLeftColor: COLORS.border,
  },
  summaryCountNum: { fontSize: 20, fontWeight: '800', color: COLORS.primary },
  summaryCountLabel: { fontSize: 11, color: COLORS.textSecondary },

  card: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    ...SHADOW,
  },
  cardLeft: { marginRight: 14 },
  queueBadge: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  queueText: { fontSize: 14, fontWeight: '800', color: COLORS.primary },
  cardBody: { flex: 1 },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  customer: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginRight: 8,
  },
  total: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { fontSize: 12, color: COLORS.textSecondary },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    marginHorizontal: 8,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 10,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '700' },

  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 14,
  },
  emptySub: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 19,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 18,
  },
  retryText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
});
