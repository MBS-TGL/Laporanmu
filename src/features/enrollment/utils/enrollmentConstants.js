// ─── PSB / Enrollment Constants ───────────────────────────────────────────────

export const ENROLLMENT_STATUS = {
    MENDAFTAR: 'mendaftar',
    VERIFIKASI: 'verifikasi',
    TES: 'tes',
    DITERIMA: 'diterima',
    DAFTAR_ULANG: 'daftar_ulang',
    DITOLAK: 'ditolak',
}

export const STATUS_CONFIG = {
    mendaftar: {
        label: 'Mendaftar',
        color: 'bg-sky-500/10 text-sky-600 border-sky-500/20',
        dot: 'bg-sky-500',
        icon: 'faClipboardList',
        step: 1,
    },
    verifikasi: {
        label: 'Verifikasi',
        color: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
        dot: 'bg-amber-500',
        icon: 'faFileCircleCheck',
        step: 2,
    },
    tes: {
        label: 'Tes Baca/Hafalan',
        color: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
        dot: 'bg-purple-500',
        icon: 'faBookQuran',
        step: 3,
    },
    diterima: {
        label: 'Lulus Seleksi',
        color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
        dot: 'bg-emerald-500',
        icon: 'faCircleCheck',
        step: 4,
    },
    daftar_ulang: {
        label: 'Daftar Ulang',
        color: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
        dot: 'bg-indigo-500',
        icon: 'faClipboardCheck',
        step: 5,
    },
    ditolak: {
        label: 'Ditolak',
        color: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
        dot: 'bg-rose-500',
        icon: 'faCircleXmark',
        step: -1,
    },
}

export const PIPELINE_STEPS = [
    { key: 'mendaftar', label: 'Mendaftar' },
    { key: 'verifikasi', label: 'Verifikasi' },
    { key: 'tes', label: 'Tes' },
    { key: 'diterima', label: 'Lulus Seleksi' },
    { key: 'daftar_ulang', label: 'Daftar Ulang' },
]

export const PROGRAM_OPTIONS = [
    { id: 'boarding', name: 'Boarding (Pondok)', desc: 'Program kepesantrenan & asrama intensif' },
    { id: 'reguler', name: 'Reguler (Fullday)', desc: 'Program sekolah harian umum & diniyah' },
]

export const QURAN_LEVELS = [
    { id: 'belum', name: 'Belum Bisa', color: 'text-rose-500 bg-rose-500/10' },
    { id: 'iqro', name: "Iqro'", color: 'text-amber-500 bg-amber-500/10' },
    { id: 'lancar', name: 'Lancar', color: 'text-sky-500 bg-sky-500/10' },
    { id: 'tartil', name: 'Tartil', color: 'text-emerald-500 bg-emerald-500/10' },
]

export const TEST_SCORES = [
    { id: 'mumtaz', name: 'Mumtaz (Istimewa)', color: 'text-emerald-600 bg-emerald-500/10' },
    { id: 'jayyid_jiddan', name: 'Jayyid Jiddan (Sangat Baik)', color: 'text-sky-600 bg-sky-500/10' },
    { id: 'jayyid', name: 'Jayyid (Baik)', color: 'text-indigo-600 bg-indigo-500/10' },
    { id: 'maqbul', name: 'Maqbul (Cukup)', color: 'text-amber-600 bg-amber-500/10' },
    { id: 'rasib', name: 'Rasib (Kurang)', color: 'text-rose-600 bg-rose-500/10' },
]

export const REQUIRED_DOCUMENTS = [
    { id: 'kk', name: 'Kartu Keluarga (KK)' },
    { id: 'akte', name: 'Akte Kelahiran' },
    { id: 'ijazah', name: 'Ijazah / SKL / Rapor' },
    { id: 'foto', name: 'Pas Foto 3x4' },
    { id: 'surat_sehat', name: 'Surat Keterangan Sehat' },
]

export const UNIFORM_SIZES = ['S', 'M', 'L', 'XL', 'XXL']

export const SORT_OPTIONS = [
    { value: 'name_asc', label: 'Nama A–Z' },
    { value: 'name_desc', label: 'Nama Z–A' },
    { value: 'date_desc', label: 'Terbaru' },
    { value: 'date_asc', label: 'Terlama' },
]
// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getStatusConfig(status) {
    return STATUS_CONFIG[status] || STATUS_CONFIG.mendaftar
}

export function getTestScoreConfig(score) {
    return TEST_SCORES.find(t => t.id === score) || null
}

export function getQuranLevelConfig(level) {
    return QURAN_LEVELS.find(q => q.id === level) || null
}

export function getProgramLabel(programId) {
    return PROGRAM_OPTIONS.find(p => p.id === programId)?.name || programId || '-'
}

export function formatEnrollmentDate(isoString) {
    if (!isoString) return '-'
    const d = new Date(isoString)
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}
