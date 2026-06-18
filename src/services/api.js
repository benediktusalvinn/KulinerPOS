import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * ============================================================
 *  GANTI NILAI DI BAWAH INI
 * ============================================================
 * Arahkan BASE_URL ke backend kasir milikmu.
 *
 * PENTING:
 *  - Di HP fisik (Expo Go): JANGAN pakai "localhost". Gunakan IP LAN
 *    laptop yang menjalankan backend. Cek dengan `ipconfig` (Windows)
 *    atau `ifconfig`/`ip a` (Mac/Linux). Contoh: 192.168.1.10
 *  - Port DEFAULT backend = 4000 (lihat PORT pada .env backend).
 *    Bukan 5000 — sesuaikan dengan port yang benar-benar kamu pakai.
 *  - Path API selalu diawali "/api".
 *  - Laptop & HP harus berada di jaringan Wi-Fi yang sama.
 *
 * Contoh benar: http://192.168.1.10:4000/api
 */
export const BASE_URL = 'http://192.168.1.115:4000/api';

// Origin tanpa "/api" — dipakai untuk memuat gambar produk (path /uploads/...).
export const SERVER_ORIGIN = BASE_URL.replace(/\/api\/?$/, '');

// Kunci penyimpanan AsyncStorage.
export const TOKEN_KEY = '@kulinerpos/token';
export const ADMIN_KEY = '@kulinerpos/admin';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Lampirkan Bearer token (jika ada) ke setiap request secara otomatis.
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/**
 * Ambil pesan error yang ramah pengguna.
 * Backend mengembalikan error dengan bentuk: { error: { message } }.
 */
export function getErrorMessage(error, fallback = 'Terjadi kesalahan. Silakan coba lagi.') {
  if (error?.response?.data?.error?.message) return error.response.data.error.message;
  if (error?.message === 'Network Error') {
    return 'Tidak dapat terhubung ke server. Periksa BASE_URL & koneksi Wi-Fi.';
  }
  if (error?.code === 'ECONNABORTED') return 'Koneksi timeout. Pastikan server aktif.';
  return fallback;
}

export default api;
