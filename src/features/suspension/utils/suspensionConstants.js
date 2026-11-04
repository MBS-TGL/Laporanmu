// Konstanta modul Skorsing & Pembinaan di Rumah.
// Satu-satunya sumber definisi blok waktu, status, dan helper tanggal/WhatsApp.

export const LOG_BLOCKS = [
  { key: 'dinihari', label: 'Dini Hari & Subuh', time: '03.00–06.30' },
  { key: 'pagi', label: 'Pagi & Siang', time: '06.30–14.45' },
  { key: 'sore', label: 'Sore & Maghrib', time: '14.45–19.00' },
  { key: 'malam', label: 'Malam', time: '19.00–03.00' },
]

export const SUSPENSION_STATUSES = [
  { value: 'aktif', label: 'Aktif' },
  { value: 'selesai', label: 'Selesai' },
  { value: 'dibatalkan', label: 'Dibatalkan' },
]

export const TASK_STATUSES = [
  { value: 'belum', label: 'Belum dikerjakan' },
  { value: 'dikerjakan', label: 'Dikerjakan' },
  { value: 'dinilai', label: 'Dinilai' },
]

export const FOLLOWUP_METHODS = [
  { value: 'call', label: 'Telepon' },
  { value: 'wa', label: 'WhatsApp' },
  { value: 'visit', label: 'Kunjungan' },
]

export const JENJANG_OPTIONS = [
  { value: 'SMP', label: 'SMP' },
  { value: 'SMA', label: 'SMA' },
]

export const MAX_PHOTOS_PER_SUBMIT = 6
export const MAX_PHOTO_BYTES = 2 * 1024 * 1024
export const MAX_TOTAL_BYTES = 10 * 1024 * 1024

// ─── Tanggal ────────────────────────────────────────────────

// 'YYYY-MM-DD' -> Date lokal tengah hari (aman dari geser zona waktu)
export function parseLocalDate(dateStr) {
  if (!dateStr) return null
  const [y, m, d] = String(dateStr).split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d, 12, 0, 0)
}

export function toISODate(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function formatTanggalPanjang(dateStr) {
  const d = parseLocalDate(dateStr)
  if (!d) return '-'
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }).format(d)
}

export function formatTanggalPendek(dateStr) {
  const d = parseLocalDate(dateStr)
  if (!d) return '-'
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
  }).format(d)
}

// Daftar tanggal 'YYYY-MM-DD' dari start sampai end (inklusif). Kosong bila invalid.
export function eachDay(startStr, endStr) {
  const start = parseLocalDate(startStr)
  const end = parseLocalDate(endStr)
  if (!start || !end || end < start) return []
  const out = []
  const cur = new Date(start)
  while (cur <= end) {
    out.push(toISODate(cur))
    cur.setDate(cur.getDate() + 1)
    if (out.length > 62) break // pengaman: skorsing maksimal ~2 bulan
  }
  return out
}

export function dayOfWeek(dateStr) {
  return parseLocalDate(dateStr)?.getDay() ?? -1 // 0=Ahad .. 6=Sabtu
}

export function isWeekend(dateStr) {
  const dow = dayOfWeek(dateStr)
  return dow === 0 || dow === 6
}

export function isSeninKamis(dateStr) {
  const dow = dayOfWeek(dateStr)
  return dow === 1 || dow === 4
}

// Otomatis dari grade kelas; halaman form boleh override manual.
export function jenjangOfGrade(grade) {
  if (/smp/i.test(grade || '')) return 'SMP'
  if (/(^|\D)(7|8|9)(\D|$)|VII|VIII|IX/i.test(grade || '')) return 'SMP'
  return 'SMA'
}

// ─── WhatsApp ───────────────────────────────────────────────

// Normalisasi nomor HP Indonesia ke format 62...
export function normalizePhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '').replace(/^0/, '62')
  return digits.startsWith('62') ? digits : digits ? `62${digits}` : ''
}

export function buildWaMessage({ waliName, studentName, start, end, link, expiresAt, school }) {
  return (
    `Halo Bapak/Ibu ${waliName || 'Wali Murid'}.\n\n` +
    `Ananda ${studentName} sedang menjalani pembinaan di rumah ` +
    `(${formatTanggalPendek(start)}–${formatTanggalPendek(end)}).\n\n` +
    `Mohon pantau dan isi log aktivitas harian ananda melalui tautan berikut:\n${link}\n\n` +
    `Tautan berlaku sampai ${formatTanggalPendek(expiresAt)}.\n\n` +
    `Terima kasih.\n— ${school || 'Kesiswaan'}`
  )
}

export function buildWaLink(phone, message) {
  return `https://wa.me/${normalizePhone(phone)}?text=${encodeURIComponent(message)}`
}

// ─── Draft offline wali (localStorage) ──────────────────────

export function draftKey(token, dateStr) {
  return `skorsing:draft:${String(token || '').slice(0, 8)}:${dateStr}`
}

export function readDraft(token, dateStr) {
  try {
    const raw = localStorage.getItem(draftKey(token, dateStr))
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function writeDraft(token, dateStr, draft) {
  try {
    localStorage.setItem(draftKey(token, dateStr), JSON.stringify(draft))
  } catch {
    // storage penuh / mode privat: abaikan, state in-memory tetap jalan
  }
}

export function clearDraft(token, dateStr) {
  try {
    localStorage.removeItem(draftKey(token, dateStr))
  } catch {
    // abaikan
  }
}
