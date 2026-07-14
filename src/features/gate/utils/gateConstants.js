import { GraduationCap, Briefcase, Users } from 'lucide-react'

import idGate from '@/locales/id/gate.json'
import enGate from '@/locales/en/gate.json'
import arGate from '@/locales/ar/gate.json'

export const PAGE_T = {
  id: idGate,
  en: enGate,
  ar: arGate
}

export const presetTranslations = {
  id: {},
  en: {
    'Makan siang': 'Lunch break',
    'Urusan bank': 'Bank business',
    'Ke apotek': 'To pharmacy',
    'Belanja': 'Shopping',
    'Keperluan keluarga': 'Family matters',
    'Urusan pribadi': 'Personal business',
    'Ke dokter': 'See doctor',
    'Pengambilan barang': 'Item collection',
    'Dinas luar': 'Out on duty',
    'Rapat eksternal': 'External meeting',
    'Ke keperluan kantor': 'Office needs',
    'Keperluan kantor': 'Office needs',
    'Belanja kebutuhan': 'Supply shopping',
    'Sakit / Rawat Inap': 'Sick / Hospitalized',
    'Pulang kampung': 'Going home',
    'Tugas pondok': 'School duty',
    'Membeli keperluan': 'Buying supplies',
    'Lain-lain': 'Others',
    'Silaturahmi': 'Social visit',
    'Menjemput santri': 'Pick up student',
    'Wali murid': 'Guardian visit',
    'Urusan administrasi': 'Admin business',
    'Kunjungan keluarga': 'Family visit',
    'Antar barang / kiriman': 'Package delivery',
    'Rapat / pertemuan': 'Meeting',
    'Urusan lainnya': 'Other business',
    // Additional common inputs
    'Jemput anak': 'Pick up child',
    'Menjemput anak': 'Pick up child',
    'Urusan keluarga': 'Family matters',
    'Sakit': 'Sick',
    'Izin sakit': 'Sick leave',
    'Beli makanan': 'Buy food',
    'Membeli makanan': 'Buy food',
    'Makan': 'Eating out',
    'Keluar makan': 'Eating out',
    'Klinik': 'To clinic',
    'Ke klinik': 'To clinic',
    'Rumah sakit': 'To hospital',
    'Ke rumah sakit': 'To hospital',
    'Urusan pondok': 'School duty',
    'Beli perlengkapan': 'Buy supplies',
    'Kondangan': 'Attend wedding',
    'Acara keluarga': 'Family event',
    'Pulang': 'Going home'
  },
  ar: {
    'Makan siang': 'استراحة الغداء',
    'Urusan bank': 'أعمال مصرفية',
    'Ke apotek': 'إلى الصيدلية',
    'Belanja': 'التسوق',
    'Keperluan keluarga': 'شؤون عائلية',
    'Urusan pribadi': 'أعمال شخصية',
    'Ke dokter': 'زيارة الطبيب',
    'Pengambilan barang': 'استلام بضائع',
    'Dinas luar': 'مهمة خارجية',
    'Rapat eksternal': 'اجتماع خارجي',
    'Ke keperluan kantor': 'احتياجات المكتب',
    'Keperluan kantor': 'احتياجات المكتب',
    'Belanja kebutuhan': 'تسوق الاحتياجات',
    'Sakit / Rawat Inap': 'مريض / بالمستشفى',
    'Pulang kampung': 'الذهاب للمنزل',
    'Tugas pondok': 'مهمة السكن',
    'Membeli keperluan': 'شراء المستلزمات',
    'Lain-lain': 'أخرى',
    'Silaturahmi': 'زيارة ودية',
    'Menjemput santri': 'اصطحاب طالب',
    'Wali murid': 'زيارة ولي الأمر',
    'Urusan administrasi': 'شؤون إدارية',
    'Kunjungan keluarga': 'زيارة عائلية',
    'Antar barang / kiriman': 'توصيل طرد',
    'Rapat / pertemuan': 'اجتماع',
    'Urusan lainnya': 'شؤون أخرى',
    // Additional common inputs
    'Jemput anak': 'اصطحاب طفل',
    'Menjemput anak': 'اصطحاب طفل',
    'Urusan keluarga': 'شؤون عائلية',
    'Sakit': 'مريض',
    'Izin sakit': 'إجازة مرضية',
    'Beli makanan': 'شراء الطعام',
    'Membeli makanan': 'شراء الطعام',
    'Makan': 'تناول الطعام',
    'Keluar makan': 'تناول الطعام',
    'Klinik': 'إلى العيادة',
    'Ke klinik': 'إلى العيادة',
    'Rumah sakit': 'إلى المستشفى',
    'Ke rumah sakit': 'إلى المستشفى',
    'Urusan pondok': 'مهمة السكن',
    'Beli perlengkapan': 'شراء المستلزمات',
    'Kondangan': 'حضور حفل زفاف',
    'Acara keluarga': 'مناسبة عائلية',
    'Pulang': 'الذهاب للمنزل'
  }
}

export function translatePurpose(purpose, lang) {
  if (!purpose) return ''
  if (lang === 'id' || !lang) return purpose

  const dict = presetTranslations[lang]
  if (dict) {
    // Exact lookup
    if (dict[purpose]) return dict[purpose]

    // Case-insensitive & trimmed lookup
    const cleanPurpose = purpose.toLowerCase().trim()
    for (const [key, val] of Object.entries(dict)) {
      if (key.toLowerCase().trim() === cleanPurpose) {
        return val
      }
    }
  }
  return purpose
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const MONTHS_ID = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

export const VISITOR_TYPES_BASE = [
  { key: 'guru', labelKey: 'guruLabel', icon: GraduationCap, color: 'text-indigo-500', bg: 'bg-indigo-500/10', border: 'border-indigo-500/30' },
  { key: 'karyawan', labelKey: 'karyawanLabel', icon: Briefcase, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/30' },
  { key: 'santri', labelKey: 'santriLabel', icon: GraduationCap, color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
  { key: 'tamu', labelKey: 'visitorTamuLabel', icon: Users, color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
]

export function getVisitorTypes(lang = 'id') {
  const tp = (key) => PAGE_T[lang]?.[key] || PAGE_T["id"]?.[key] || key
  return VISITOR_TYPES_BASE.map(t => ({
    ...t,
    label: tp(t.labelKey)
  }))
}

export function getMeta(key, lang = 'id') {
  const list = getVisitorTypes(lang)
  const meta = list.find(t => t.key === key)
  return meta || { label: key, color: 'text-gray-500', bg: 'bg-gray-500/10', border: 'border-gray-500/30' }
}
export const PRESETS_GURU = ['Makan siang', 'Urusan bank', 'Ke apotek', 'Belanja', 'Keperluan keluarga', 'Urusan pribadi', 'Ke dokter', 'Pengambilan barang']
export const PRESETS_KARYAWAN = ['Dinas luar', 'Urusan bank', 'Rapat eksternal', 'Ke apotek', 'Keperluan kantor', 'Keperluan keluarga', 'Belanja kebutuhan', 'Ke dokter']
export const PRESETS_SANTRI = ['Sakit / Rawat Inap', 'Pulang kampung', 'Tugas pondok', 'Urusan keluarga', 'Membeli keperluan', 'Lain-lain']
export const PRESETS_TAMU = ['Silaturahmi', 'Menjemput santri', 'Wali murid', 'Urusan administrasi', 'Kunjungan keluarga', 'Antar barang / kiriman', 'Rapat / pertemuan', 'Urusan lainnya']
