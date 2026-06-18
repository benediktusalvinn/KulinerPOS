// Format angka ke rupiah: 25000 -> "Rp 25.000"
export function formatRupiah(value) {
  const n = Number(value) || 0;
  return 'Rp ' + n.toLocaleString('id-ID');
}

/**
 * Mengubah timestamp backend ("YYYY-MM-DD HH:MM:SS", UTC tanpa zona) menjadi
 * objek Date yang benar. Kita tambahkan 'Z' agar diperlakukan sebagai UTC,
 * lalu JavaScript mengonversinya ke waktu lokal perangkat.
 */
function toLocalDate(timestamp) {
  if (!timestamp) return null;
  const raw = String(timestamp).trim();
  const iso = raw.includes('T') ? raw : raw.replace(' ', 'T');
  const hasZone = /[zZ]|[+-]\d{2}:?\d{2}$/.test(iso);
  const d = new Date(hasZone ? iso : iso + 'Z');
  return isNaN(d.getTime()) ? null : d;
}

// Apakah timestamp termasuk "hari ini" menurut waktu lokal perangkat?
export function isToday(timestamp) {
  const d = toLocalDate(timestamp);
  if (!d) return false;
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

// Jam:menit lokal dari timestamp backend, mis. "14:05".
export function formatTime(timestamp) {
  const d = toLocalDate(timestamp);
  if (!d) return '';
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

// Tanggal lokal hari ini "YYYY-MM-DD" untuk query report (param from/to).
export function todayLocalDate() {
  const d = new Date();
  const pad = (x) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
