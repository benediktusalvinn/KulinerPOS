import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Pressable,
  Alert,
  StatusBar,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import api, { getErrorMessage, SERVER_ORIGIN } from '../services/api';
import { useCart } from '../context/CartContext';
import { COLORS, SHADOW } from '../theme';
import { formatRupiah } from '../utils/format';

/* ---------- Kartu produk (grid) ---------- */
function ProductCard({ product, inCartQty, onAdd }) {
  const soldOut = product.stock <= 0;
  const maxed = inCartQty >= product.stock;
  const disabled = soldOut || maxed;
  return (
    <View style={styles.card}>
      <View style={styles.thumb}>
        {product.imageUrl ? (
          <Image
            source={{ uri: SERVER_ORIGIN + product.imageUrl }}
            style={styles.thumbImg}
            resizeMode="cover"
          />
        ) : (
          <Text style={styles.thumbEmoji}>{product.emoji || '🍽️'}</Text>
        )}
        {soldOut && (
          <View style={styles.soldOutBadge}>
            <Text style={styles.soldOutText}>Habis</Text>
          </View>
        )}
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardCat}>{product.category}</Text>
        <Text style={styles.cardName} numberOfLines={2}>
          {product.name}
        </Text>
        <View style={styles.cardFooter}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardPrice}>{formatRupiah(product.price)}</Text>
            <Text style={styles.cardStock}>Stok: {product.stock}</Text>
          </View>
          <TouchableOpacity
            style={[styles.addBtn, disabled && styles.addBtnDisabled]}
            onPress={() => onAdd(product)}
            disabled={disabled}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

/* ---------- Layar Kasir ---------- */
export default function KasirScreen() {
  const {
    items,
    addItem,
    increment,
    decrement,
    removeItem,
    totalItems,
    subtotal,
    checkout,
  } = useCart();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [cartVisible, setCartVisible] = useState(false);
  const [payMethod, setPayMethod] = useState('Tunai');
  const [processing, setProcessing] = useState(false);
  const firstLoad = useRef(true);

  const loadProducts = useCallback(async () => {
    setError('');
    try {
      const res = await api.get('/products');
      setProducts(res.data?.data || []);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        await loadProducts();
        if (active && firstLoad.current) {
          setLoading(false);
          firstLoad.current = false;
        }
      })();
      return () => {
        active = false;
      };
    }, [loadProducts])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadProducts();
    setRefreshing(false);
  }, [loadProducts]);

  const qtyOf = (id) => items.find((it) => it.id === id)?.qty || 0;

  const handleProcess = async () => {
    setProcessing(true);
    try {
      const order = await checkout({ payMethod });
      setCartVisible(false);
      setPayMethod('Tunai');
      await loadProducts(); // segarkan stok setelah transaksi
      Alert.alert(
        'Transaksi Berhasil 🎉',
        `No. Antrian: ${order.queue}\nTotal Dibayar: ${formatRupiah(order.total)}\nMetode: ${payMethod}`,
        [{ text: 'Selesai' }]
      );
    } catch (err) {
      // Backend memvalidasi stok secara transaksional -> pesan akurat tampil di sini.
      Alert.alert('Gagal Memproses', getErrorMessage(err, 'Transaksi gagal diproses.'));
    } finally {
      setProcessing(false);
    }
  };

  /* ----- Tampilan loading awal ----- */
  if (loading) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.centerText}>Memuat produk…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      <View style={styles.header}>
        <Text style={styles.title}>Kasir</Text>
        <Text style={styles.subtitle}>Pilih produk untuk ditambahkan ke keranjang</Text>
      </View>

      <FlatList
        data={products}
        keyExtractor={(item) => String(item.id)}
        numColumns={2}
        columnWrapperStyle={{ gap: 12 }}
        contentContainerStyle={
          products.length === 0
            ? styles.emptyContainer
            : { padding: 16, paddingBottom: 96 }
        }
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
        renderItem={({ item }) => (
          <ProductCard product={item} inCartQty={qtyOf(item.id)} onAdd={addItem} />
        )}
        ListEmptyComponent={
          error ? (
            <View style={styles.center}>
              <Ionicons name="cloud-offline-outline" size={48} color={COLORS.danger} />
              <Text style={styles.emptyText}>{error}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={loadProducts}>
                <Text style={styles.retryText}>Coba Lagi</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.center}>
              <Ionicons name="fast-food-outline" size={48} color={COLORS.textSecondary} />
              <Text style={styles.emptyText}>Belum ada produk tersedia</Text>
            </View>
          )
        }
      />

      {/* FAB Keranjang dengan badge jumlah item */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setCartVisible(true)}
        activeOpacity={0.85}
      >
        <Ionicons name="cart" size={26} color="#FFFFFF" />
        {totalItems > 0 && (
          <View style={styles.fabBadge}>
            <Text style={styles.fabBadgeText}>{totalItems}</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Bottom Sheet Keranjang (Modal bawaan RN) */}
      <Modal
        visible={cartVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCartVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setCartVisible(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Keranjang ({totalItems})</Text>
              <TouchableOpacity onPress={() => setCartVisible(false)} hitSlop={8}>
                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            {items.length === 0 ? (
              <View style={styles.emptyCart}>
                <Ionicons name="cart-outline" size={48} color={COLORS.textSecondary} />
                <Text style={styles.emptyCartText}>Keranjang masih kosong</Text>
              </View>
            ) : (
              <>
                <ScrollView style={{ maxHeight: 270 }} showsVerticalScrollIndicator={false}>
                  {items.map((it) => (
                    <View key={it.id} style={styles.cartRow}>
                      <View style={styles.cartThumb}>
                        {it.imageUrl ? (
                          <Image
                            source={{ uri: SERVER_ORIGIN + it.imageUrl }}
                            style={styles.cartThumbImg}
                          />
                        ) : (
                          <Text style={{ fontSize: 22 }}>{it.emoji || '🍽️'}</Text>
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.cartName} numberOfLines={1}>
                          {it.name}
                        </Text>
                        <Text style={styles.cartPrice}>
                          {formatRupiah(it.price * it.qty)}
                        </Text>
                      </View>
                      <View style={styles.qtyControl}>
                        <TouchableOpacity
                          style={styles.qtyBtn}
                          onPress={() => decrement(it.id)}
                        >
                          <Ionicons name="remove" size={16} color={COLORS.primary} />
                        </TouchableOpacity>
                        <Text style={styles.qtyText}>{it.qty}</Text>
                        <TouchableOpacity
                          style={[styles.qtyBtn, it.qty >= it.stock && { opacity: 0.4 }]}
                          onPress={() => increment(it.id)}
                          disabled={it.qty >= it.stock}
                        >
                          <Ionicons name="add" size={16} color={COLORS.primary} />
                        </TouchableOpacity>
                      </View>
                      <TouchableOpacity
                        style={styles.removeBtn}
                        onPress={() => removeItem(it.id)}
                        hitSlop={8}
                      >
                        <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>

                {/* Metode pembayaran */}
                <Text style={styles.payLabel}>Metode Pembayaran</Text>
                <View style={styles.payRow}>
                  {['Tunai', 'QRIS'].map((m) => {
                    const active = payMethod === m;
                    return (
                      <TouchableOpacity
                        key={m}
                        style={[styles.payOption, active && styles.payOptionActive]}
                        onPress={() => setPayMethod(m)}
                        activeOpacity={0.85}
                      >
                        <Ionicons
                          name={m === 'Tunai' ? 'cash-outline' : 'qr-code-outline'}
                          size={18}
                          color={active ? COLORS.primary : COLORS.textSecondary}
                        />
                        <Text style={[styles.payText, active && { color: COLORS.primary }]}>
                          {m === 'Tunai' ? 'Cash / Tunai' : 'QRIS'}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Subtotal + proses */}
                <View style={styles.totalRow}>
                  <View>
                    <Text style={styles.totalLabel}>Subtotal</Text>
                    <Text style={styles.totalNote}>PPN ditambahkan saat diproses</Text>
                  </View>
                  <Text style={styles.totalValue}>{formatRupiah(subtotal)}</Text>
                </View>

                <TouchableOpacity
                  style={[styles.processBtn, processing && { opacity: 0.7 }]}
                  onPress={handleProcess}
                  disabled={processing}
                  activeOpacity={0.85}
                >
                  {processing ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                      <Text style={styles.processText}>Proses Transaksi</Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 6 },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.textPrimary },
  subtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  centerText: { marginTop: 12, color: COLORS.textSecondary },
  emptyContainer: { flexGrow: 1, justifyContent: 'center' },
  emptyText: {
    marginTop: 12,
    fontSize: 15,
    color: COLORS.textPrimary,
    fontWeight: '600',
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 16,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 12,
  },
  retryText: { color: '#FFFFFF', fontWeight: '700' },

  /* Kartu produk */
  card: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    marginBottom: 12,
    overflow: 'hidden',
    ...SHADOW,
  },
  thumb: {
    height: 96,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbImg: { width: '100%', height: '100%' },
  thumbEmoji: { fontSize: 42 },
  soldOutBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: COLORS.danger,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  soldOutText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  cardBody: { padding: 12 },
  cardCat: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  cardName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 4,
    minHeight: 38,
  },
  cardFooter: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 8 },
  cardPrice: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary },
  cardStock: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW,
    shadowColor: COLORS.accent,
    shadowOpacity: 0.35,
  },
  addBtnDisabled: { backgroundColor: '#CBD5E1', shadowOpacity: 0 },

  /* FAB */
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.4,
    elevation: 6,
  },
  fabBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: COLORS.background,
  },
  fabBadgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },

  /* Modal / bottom sheet */
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: COLORS.overlay },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 28,
  },
  sheetHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginBottom: 14,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },

  emptyCart: { alignItems: 'center', paddingVertical: 40 },
  emptyCartText: { marginTop: 10, color: COLORS.textSecondary, fontSize: 14 },

  cartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 10,
  },
  cartThumb: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  cartThumbImg: { width: '100%', height: '100%' },
  cartName: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  cartPrice: { fontSize: 13, color: COLORS.primary, fontWeight: '700', marginTop: 2 },
  qtyControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 10,
    paddingHorizontal: 4,
  },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: {
    minWidth: 22,
    textAlign: 'center',
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  removeBtn: { paddingLeft: 4 },

  payLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 18,
    marginBottom: 10,
  },
  payRow: { flexDirection: 'row', gap: 12 },
  payOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  payOptionActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primarySoft },
  payText: { fontSize: 14, fontWeight: '700', color: COLORS.textSecondary },

  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
  },
  totalLabel: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '500' },
  totalNote: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  totalValue: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary },
  processBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.accent,
    height: 54,
    borderRadius: 14,
    marginTop: 16,
    ...SHADOW,
    shadowColor: COLORS.accent,
    shadowOpacity: 0.35,
  },
  processText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
});
