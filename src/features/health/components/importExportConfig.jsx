import { Calendar, CircleQuestionMark, Clock, FileText, Hash, Pill, School, Stethoscope, Tags, User } from 'lucide-react'

/**
 * Konfigurasi modal Export untuk fitur Health (jurnal Poskestren/UKS).
 * Hanya sisi export — jurnal tidak punya import massal. Print jurnal tetap
 * memakai builder HTML khusus di HealthPage (menu "Cetak Jurnal Medis").
 */

export const COLUMN_DEFS = [
    { key: 'tanggal', label: 'Tanggal', icon: Calendar },
    { key: 'waktu', label: 'Waktu', icon: Clock },
    { key: 'nama', label: 'Nama Santri', icon: User },
    { key: 'kelas', label: 'Kelas', icon: School },
    { key: 'keluhan', label: 'Keluhan', icon: Stethoscope },
    { key: 'diagnosis', label: 'Diagnosis', icon: FileText },
    { key: 'tindakan', label: 'Tindakan', icon: Tags },
    { key: 'obat', label: 'Obat', icon: Pill },
    { key: 'jumlah', label: 'Jumlah Obat', icon: Hash },
    { key: 'status', label: 'Status', icon: CircleQuestionMark },
]

export const EXPORT_CONFIG = {
    title: 'Export Data Rekam Medis',
    description: 'Unduh jurnal kesehatan santri (Poskestren) ke format CSV, Excel, atau PDF.',
    entityNoun: 'jurnal',
    columnDefs: COLUMN_DEFS,
    presets: [
        { id: 'all', label: 'Data Lengkap', cols: COLUMN_DEFS.map(c => c.key) },
        { id: 'medicine', label: 'Rekap Obat', cols: ['tanggal', 'nama', 'kelas', 'obat', 'jumlah'] },
        { id: 'minimal', label: 'Dasar', cols: ['tanggal', 'nama', 'keluhan', 'status'] },
    ],
    defaultFileName: 'rekam_medis_uks',
    resetCols: ['tanggal', 'nama'],
}

// Pemetaan key → label kolom (urutan file mengikuti pilihan user)
export const COLUMN_LABELS = Object.fromEntries(COLUMN_DEFS.map(c => [c.key, c.label]))

// Pemetaan key → nilai baris (dipakai handler export di HealthPage)
export const EXPORT_FNS = {
    tanggal: l => l.date || '',
    waktu: l => l.time || '',
    nama: l => l.student_name || '',
    kelas: l => l.class_name || '',
    keluhan: l => l.complaint || '',
    diagnosis: l => l.diagnosis || '',
    tindakan: l => l.treatment || '',
    obat: l => l.medicine_name || '',
    jumlah: l => l.medicine_qty ?? '',
    status: l => l.status === 'UKS' ? 'Istirahat di UKS' : l.status === 'Asrama' ? 'Istirahat di Asrama' : 'Kembali ke Kelas',
}
