import React, {
  createContext,
  useContext,
  useState,
  useMemo,
  useCallback,
} from 'react';
import api from '../services/api';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  // Setiap item: { id, name, price, emoji, imageUrl, stock, qty }
  const [items, setItems] = useState([]);

  // Tambah produk ke keranjang (tidak melebihi stok tersedia).
  const addItem = useCallback((product) => {
    setItems((prev) => {
      const existing = prev.find((it) => it.id === product.id);
      if (existing) {
        if (existing.qty >= product.stock) return prev; // sudah maksimal stok
        return prev.map((it) =>
          it.id === product.id ? { ...it, qty: it.qty + 1 } : it
        );
      }
      return [
        ...prev,
        {
          id: product.id,
          name: product.name,
          price: product.price,
          emoji: product.emoji,
          imageUrl: product.imageUrl,
          stock: product.stock,
          qty: 1,
        },
      ];
    });
  }, []);

  const increment = useCallback((id) => {
    setItems((prev) =>
      prev.map((it) =>
        it.id === id && it.qty < it.stock ? { ...it, qty: it.qty + 1 } : it
      )
    );
  }, []);

  const decrement = useCallback((id) => {
    setItems((prev) =>
      prev
        .map((it) => (it.id === id ? { ...it, qty: it.qty - 1 } : it))
        .filter((it) => it.qty > 0)
    );
  }, []);

  const removeItem = useCallback((id) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const totalItems = useMemo(
    () => items.reduce((sum, it) => sum + it.qty, 0),
    [items]
  );

  // Subtotal (BELUM termasuk PPN — PPN dihitung & ditambahkan oleh backend).
  const subtotal = useMemo(
    () => items.reduce((sum, it) => sum + it.price * it.qty, 0),
    [items]
  );

  /**
   * Kirim pesanan ke backend.
   * payMethod: 'Tunai' | 'QRIS' (sesuai nilai yang dipakai backend).
   * Mengembalikan objek order ter-hidrasi: { id, queue, total, ... }.
   */
  const checkout = useCallback(
    async ({ payMethod = 'Tunai' } = {}) => {
      if (items.length === 0) throw new Error('Keranjang masih kosong');
      const payload = {
        items: items.map((it) => ({ id: it.id, qty: it.qty })),
        orderType: 'Dine-in',
        payMethod,
        // Transaksi di konter = pembayaran diterima langsung -> tandai Lunas.
        paymentStatus: 'Lunas',
        notes: 'Transaksi via KulinerPOS (mobile)',
      };
      const res = await api.post('/orders', payload);
      clearCart();
      return res.data;
    },
    [items, clearCart]
  );

  const value = {
    items,
    addItem,
    increment,
    decrement,
    removeItem,
    clearCart,
    checkout,
    totalItems,
    subtotal,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart harus dipakai di dalam <CartProvider>');
  return ctx;
}
