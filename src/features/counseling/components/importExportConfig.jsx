import { AlertTriangle, Calendar, CircleQuestionMark, Clock, FileText, Hash, IdCard, School, Stethoscope, Tags, User, Wrench } from 'lucide-react'

/**
 * Konfigurasi modal Export untuk fitur Counseling (Bimbingan & Konseling).
 * Hanya sisi export rekap — cetak surat resmi per-record tetap custom di page.
 */

export const COLUMN_DEFS = [
    { key: 'id', label: 'ID', icon: Hash },
    { key: 'tanggal', label: 'Tanggal', icon: Calendar },
    { key: 'jam', label: 'Jam', icon: Clock },
    { key: 'nama', label: 'Nama Santri', icon: User },
    { key: 'kelas', label: 'Kelas', icon: School },
    { key: 'konselor', label: 'Konselor', icon: IdCard },
    { key: 'kategori', label: 'Kategori', icon: Tags },
    { key: 'masalah', label: 'Masalah', icon: Stethoscope },
    { key: 'diagnosis', label: 'Diagnosis BK', icon: FileText },
    { key: 'tindakan', label: 'Rencana Tindakan', icon: Wrench },
    { key: 'urgensi', label: 'Urgensi', icon: AlertTriangle },
    { key: 'status', label: 'Status', icon: CircleQuestionMark },
]

export const EXPORT_CONFIG = {
    title: 'Export Rekap Konseling',
    description: 'Unduh rekap bimbingan & konseling ke format CSV, Excel, atau PDF.',
    entityNoun: 'catatan',
    columnDefs: COLUMN_DEFS,
    presets: [
        { id: 'all', label: 'Data Lengkap', cols: COLUMN_DEFS.map(c => c.key) },
        { id: 'followup', label: 'Tindak Lanjut', cols: ['tanggal', 'nama', 'kelas', 'masalah', 'tindakan', 'urgensi', 'status'] },
        { id: 'minimal', label: 'Dasar', cols: ['tanggal', 'nama', 'kategori', 'urgensi', 'status'] },
    ],
    defaultFileName: 'rekap_bimbingan_konseling',
    resetCols: ['tanggal', 'nama'],
}

export const COLUMN_LABELS = Object.fromEntries(COLUMN_DEFS.map(c => [c.key, c.label]))

// Pemetaan key → nilai baris
export const EXPORT_FNS = {
    id: l => l.id || '',
    tanggal: l => l.date || '',
    jam: l => l.time || '',
    nama: l => l.student_name || '',
    kelas: l => l.class_name || '',
    konselor: l => l.counselor_name || '',
    kategori: l => l.category || '',
    masalah: l => l.complaint || '',
    diagnosis: l => l.diagnosis || '',
    tindakan: l => l.action_plan || '',
    urgensi: l => l.urgency || '',
    status: l => l.status || '',
}
