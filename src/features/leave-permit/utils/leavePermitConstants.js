import { FileText, LogOut, LogIn, AlertCircle, XCircle, Clock, CheckCircle, Send } from 'lucide-react'

export const STATUS_MAP = {
  issued: { label: 'Diterbitkan', labelEn: 'Issued', color: 'bg-blue-100 text-blue-700 border-blue-200', dotColor: 'bg-blue-500', icon: FileText },
  departed: { label: 'Berangkat', labelEn: 'Departed', color: 'bg-amber-100 text-amber-700 border-amber-200', dotColor: 'bg-amber-500', icon: LogOut },
  returned: { label: 'Kembali', labelEn: 'Returned', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', dotColor: 'bg-emerald-500', icon: LogIn },
  overdue: { label: 'Terlambat', labelEn: 'Overdue', color: 'bg-red-100 text-red-700 border-red-200', dotColor: 'bg-red-500', icon: AlertCircle },
  cancelled: { label: 'Dibatalkan', labelEn: 'Cancelled', color: 'bg-gray-100 text-gray-500 border-gray-200', dotColor: 'bg-gray-400', icon: XCircle },
}

export const PURPOSE_PRESETS = [
  'Pulang ke rumah',
  'Belanja kebutuhan',
  'Kontrol kesehatan',
  'Keperluan keluarga',
  'Mengurus administrasi',
  'Lainnya',
]

export const MONTHS_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

export const DAYS_ID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', "Jum'at", 'Sabtu']

export function fmtDateIndo(dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  const day = DAYS_ID[d.getDay()]
  const date = d.getDate()
  const month = MONTHS_ID[d.getMonth()]
  const year = d.getFullYear()
  return `${day}, ${date} ${month} ${year}`
}

export function fmtDateTimeShort(dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  const day = d.getDate()
  const month = MONTHS_ID[d.getMonth()]
  const year = d.getFullYear()
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${day} ${month} ${year}, ${hours}.${minutes}`
}

export function fmtDateShort(dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  const day = d.getDate()
  const month = MONTHS_ID[d.getMonth()]
  const year = d.getFullYear()
  return `${day} ${month} ${year}`
}

export function fmtTime(dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

export function isOverdue(permit) {
  return permit.status === 'departed' && new Date(permit.return_deadline) < new Date()
}

export const PAGE_T = {
  id: {
    title: 'Izin Keluar Pondok',
    subtitle: 'Surat izin keluar pondok untuk santri',
    formTitle: 'Terbitkan Izin Baru',
    formStudent: 'Cari Santri',
    formStudentPlaceholder: 'Ketik nama santri...',
    formPhone: 'No. Telepon',
    formDestination: 'Tujuan',
    formDestinationPlaceholder: 'Contoh: Rumah Orang Tua',
    formPurpose: 'Keperluan',
    formPurposePlaceholder: 'Pilih atau ketik keperluan...',
    formLeaveDate: 'Tanggal Keluar',
    formReturnDeadline: 'Batas Waktu Kembali',
    formSignatureMethod: 'Metode Tanda Tangan',
    formSignatureManual: 'Manual (Tanda Tangan di Kertas)',
    formSignatureDigital: 'Digital (Tanda Tangan Elektronik)',
    formSubmit: 'Terbitkan Surat Izin',
    formCancel: 'Batal',
    listTab: 'Daftar Izin',
    dashboardTab: 'Dashboard',
    filterAll: 'Semua',
    filterIssued: 'Diterbitkan',
    filterDeparted: 'Berangkat',
    filterReturned: 'Kembali',
    filterOverdue: 'Terlambat',
    filterCancelled: 'Dibatalkan',
    noData: 'Belum ada data izin keluar',
    printBtn: 'Cetak Surat',
    cancelBtn: 'Batalkan',
    deleteBtn: 'Hapus',
    reconcileTitle: 'Rekoncile Gerbang',
    reconcileLookup: 'Cari Izin Aktif',
    reconcileDepart: 'Konfirmasi Keberangkatan',
    reconcileReturn: 'Konfirmasi Kembali',
    statIssued: 'Diterbitkan Hari Ini',
    statActive: 'Sedang Keluar',
    statOverdue: 'Terlambat',
    statReturned: 'Kembali Hari Ini',
  },
  en: {
    title: 'Leave Permit',
    subtitle: 'Boarding school exit permit for students',
    formTitle: 'Issue New Permit',
    formStudent: 'Search Student',
    formStudentPlaceholder: 'Type student name...',
    formPhone: 'Phone Number',
    formDestination: 'Destination',
    formDestinationPlaceholder: 'e.g. Parents\' Home',
    formPurpose: 'Purpose',
    formPurposePlaceholder: 'Select or type purpose...',
    formLeaveDate: 'Leave Date',
    formReturnDeadline: 'Return Deadline',
    formSignatureMethod: 'Signature Method',
    formSignatureManual: 'Manual (Paper Signature)',
    formSignatureDigital: 'Digital (Electronic Signature)',
    formSubmit: 'Issue Permit',
    formCancel: 'Cancel',
    listTab: 'Permit List',
    dashboardTab: 'Dashboard',
    filterAll: 'All',
    filterIssued: 'Issued',
    filterDeparted: 'Departed',
    filterReturned: 'Returned',
    filterOverdue: 'Overdue',
    filterCancelled: 'Cancelled',
    noData: 'No leave permits yet',
    printBtn: 'Print Permit',
    cancelBtn: 'Cancel',
    deleteBtn: 'Delete',
    reconcileTitle: 'Gate Reconciliation',
    reconcileLookup: 'Search Active Permits',
    reconcileDepart: 'Confirm Departure',
    reconcileReturn: 'Confirm Return',
    statIssued: 'Issued Today',
    statActive: 'Currently Out',
    statOverdue: 'Overdue',
    statReturned: 'Returned Today',
  },
}
