import { useState, useEffect, useCallback, useMemo, memo, useRef } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faLayerGroup, faCompass, faUserShield, faGear,
    faToggleOn, faTriangleExclamation, faSpinner,
    faRotateRight, faBolt, faFileLines, faSave,
    faRotateLeft, faUpload, faSchool, faUser,
    faPalette, faEye, faCheck,
    faChevronRight, faSearch, faXmark, faSkull,
    faTrash, faCircleExclamation, faCode, faSync, faUsers,
    faHistory, faCheckCircle, faCircleInfo, faChartPie
} from '@fortawesome/free-solid-svg-icons'
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons'
import DashboardLayout from '@core/layouts/DashboardLayout'
import Breadcrumb from '@shared/components/Breadcrumb'
import Pagination from '@shared/components/Pagination'
import { useToast } from '@context/Toast'
import { supabase } from '@lib/supabase'
import { logAudit } from '@utils/auditLogger'
import { useSchoolSettings, DEFAULT_SETTINGS } from '@context/SchoolSettings'
import { useAuth } from '@context/Auth'
import { fmtRelative } from '@utils/formatters'
import mbsLogo from '@assets/images/logos/logo-mbs.png'

// ─── Tabs ─────────────────────────────────────────────────────────────────────
const TABS = [
    { id: 'flags', label: 'Feature Flags', icon: faToggleOn },
    { id: 'raport', label: 'Raport', icon: faFileLines },
    { id: 'signatures', label: 'Tanda Tangan', icon: faUpload },
    { id: 'activity', label: 'Aktivitas', icon: faHistory },
    { id: 'danger', label: 'Bahaya', icon: faSkull },
]

// ─── Category config ──────────────────────────────────────────────────────────
const CATEGORIES = [
    {
        id: 'module', label: 'Modul Utama',
        desc: 'Aktifkan atau nonaktifkan fitur utama aplikasi',
        icon: faLayerGroup,
        color: 'text-indigo-500', bg: 'bg-indigo-500/10',
        border: 'border-indigo-500/25',
        gradient: 'from-indigo-500/8 to-transparent',
        barColor: 'bg-indigo-500', toggleActive: 'bg-emerald-500',
    },
    {
        id: 'students', label: 'Data Siswa',
        desc: 'Kontrol fitur manajemen, import, dan export siswa',
        icon: faUsers,
        color: 'text-sky-500', bg: 'bg-sky-500/10',
        border: 'border-sky-500/25',
        gradient: 'from-sky-500/8 to-transparent',
        barColor: 'bg-sky-500', toggleActive: 'bg-emerald-500',
    },
    {
        id: 'nav', label: 'Navigasi',
        desc: 'Kontrol item yang tampil di menu navigasi',
        icon: faCompass,
        color: 'text-emerald-500', bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/25',
        gradient: 'from-emerald-500/8 to-transparent',
        barColor: 'bg-emerald-500', toggleActive: 'bg-emerald-500',
    },
    {
        id: 'access', label: 'Hak Akses',
        desc: 'Izin per-role untuk mengakses fitur tertentu',
        icon: faUserShield,
        color: 'text-orange-500', bg: 'bg-orange-500/10',
        border: 'border-orange-500/25',
        gradient: 'from-orange-500/8 to-transparent',
        barColor: 'bg-orange-500', toggleActive: 'bg-emerald-500',
    },
    {
        id: 'system', label: 'Sistem',
        desc: 'Pengaturan sistem & mode khusus developer',
        icon: faGear,
        color: 'text-rose-500', bg: 'bg-rose-500/10',
        border: 'border-rose-500/25',
        gradient: 'from-rose-500/8 to-transparent',
        barColor: 'bg-rose-500', toggleActive: 'bg-emerald-500',
    },
]

// --- New Enterprise Feature: Flag Definitions (Self-Healing System) ---
const KNOWN_FLAGS = [
    // Module (Modul Utama)
    { key: 'module.raport', label: 'Raport Bulanan', category: 'module', description: 'Nilai & rekap perilaku per bulan', sort_order: 1 },
    { key: 'module.pelanggaran', label: 'Modul Pelanggaran', category: 'module', description: 'Aktifkan pencatatan poin negatif/pelanggaran', sort_order: 2 },
    { key: 'module.prestasi', label: 'Modul Prestasi', category: 'module', description: 'Aktifkan pencatatan poin positif/prestasi', sort_order: 3 },
    { key: 'module.gate', label: 'Portal Keluar Masuk', category: 'module', description: 'Fitur izin keluar guru & kunjungan tamu', sort_order: 4 },
    { key: 'module.absensi', label: 'Absensi Bulanan', category: 'module', description: 'Rekap kehadiran harian per bulan', sort_order: 5 },
    { key: 'module.poin', label: 'Poin Siswa', category: 'module', description: 'Sistem pelanggaran & prestasi', sort_order: 6 },
    { key: 'module.students', label: 'Data Siswa', category: 'module', description: 'Modul kelola data santri aktif', sort_order: 7 },
    { key: 'module.teachers', label: 'Data Guru', category: 'module', description: 'Modul kelola data guru & musyrif', sort_order: 8 },
    { key: 'module.classes', label: 'Data Kelas', category: 'module', description: 'Modul kelola kelas & kamar', sort_order: 9 },
    { key: 'module.violation_types', label: 'Jenis Pelanggaran', category: 'module', description: 'Modul kategori & bobot pelanggaran', sort_order: 10 },
    { key: 'module.academic_years', label: 'Tahun Pelajaran', category: 'module', description: 'Modul periode tahun ajaran aktif', sort_order: 11 },

    // Students
    { key: 'students.add', label: 'Tambah Siswa Baru', category: 'students', description: 'Aktifkan tombol tambah data siswa di halaman directory', sort_order: 1 },
    { key: 'students.edit', label: 'Edit Data Siswa', category: 'students', description: 'Izinkan admin mengubah informasi profil siswa', sort_order: 2 },
    { key: 'students.delete', label: 'Hapus Data Siswa', category: 'students', description: 'Izinkan penghapusan permanen data siswa dari sistem', sort_order: 3 },
    { key: 'students.import_csv', label: 'Import CSV/Excel', category: 'students', description: 'Izinkan admin mengunggah data siswa via file', sort_order: 4 },
    { key: 'students.import_gsheets', label: 'Import Google Sheets', category: 'students', description: 'Sinkronisasi otomatis dengan Google Sheets publik', sort_order: 5 },
    { key: 'students.export', label: 'Export Data', category: 'students', description: 'Izinkan pengunduhan seluruh database siswa', sort_order: 6 },
    { key: 'students.bulk_photo', label: 'Update Foto Masal', category: 'students', description: 'Fitur unggah foto siswa secara kolektif via NISN', sort_order: 7 },
    { key: 'students.archive', label: 'Arsip & Restore', category: 'students', description: 'Akses ke tempat sampah dan pemulihan data siswa', sort_order: 8 },
    { key: 'students.reset_points', label: 'Reset Poin Masal', category: 'students', description: 'Fitur pembersihan poin untuk kenaikan semester', sort_order: 9 },
    { key: 'students.promote', label: 'Naik Kelas Masal', category: 'students', description: 'Fitur promosi kelas untuk banyak siswa sekaligus', sort_order: 10 },
    { key: 'students.bulk_tag', label: 'Labeling Masal', category: 'students', description: 'Tambah/hapus label untuk banyak siswa sekaligus', sort_order: 11 },
    { key: 'students.stats', label: 'Dashboard Statistik', category: 'students', description: 'Tampilkan carousel statistik ringkasan di bagian atas', sort_order: 12 },
    { key: 'students.print_card', label: 'Cetak Kartu Siswa', category: 'students', description: 'Fitur pembuatan ID Card / Kartu Pelajar otomatis', sort_order: 13 },
    { key: 'students.privacy_mode', label: 'Mode Privasi (Masking)', category: 'students', description: 'Sensor NISN dan nomor HP pada tabel untuk keamanan', sort_order: 14 },
    { key: 'students.filters_advanced', label: 'Filter Lanjutan', category: 'students', description: 'Panel filter detail (Gender, Status, Poin, dll)', sort_order: 15 },
    { key: 'students.bulk_room', label: 'Pindah Kamar Masal', category: 'students', description: 'Fitur pengaturan kamar untuk banyak siswa sekaligus', sort_order: 16 },
    { key: 'students.bulk_point', label: 'Poin Masal', category: 'students', description: 'Fitur pemberian poin untuk banyak siswa sekaligus', sort_order: 17 },

    // Nav
    { key: 'nav.dashboard', label: 'Menu Dashboard', category: 'nav', description: 'Tampilkan ringkasan statistik di sidebar', sort_order: 1 },
    { key: 'nav.students', label: 'Menu Data Siswa', category: 'nav', description: 'Tampilkan akses ke manajemen santri', sort_order: 2 },
    { key: 'nav.poin', label: 'Menu Kedisiplinan & Poin', category: 'nav', description: 'Tampilkan menu pencatatan pelanggaran & prestasi santri', sort_order: 3 },
    { key: 'nav.dorms', label: 'Menu Manajemen Asrama', category: 'nav', description: 'Tampilkan menu plotting kamar & audit kebersihan', sort_order: 4 },
    { key: 'nav.health', label: 'Menu Klinik & Kesehatan', category: 'nav', description: 'Tampilkan menu rekam medis & stok obat', sort_order: 5 },
    { key: 'nav.counseling', label: 'Menu Konseling & BK', category: 'nav', description: 'Tampilkan menu Bimbingan Konseling (BK) santri', sort_order: 6 },
    { key: 'nav.tahfidz', label: 'Menu Tahfidz Al-Qur\'an', category: 'nav', description: 'Tampilkan jurnal setoran hafalan santri', sort_order: 7 },
    { key: 'nav.extracurricular', label: 'Menu Ekstrakurikuler', category: 'nav', description: 'Tampilkan manajemen klub & ekskul', sort_order: 8 },
    { key: 'nav.saving', label: 'Menu Tabungan Santri', category: 'nav', description: 'Tampilkan sistem deposit uang saku santri', sort_order: 9 },
    { key: 'nav.academic_years', label: 'Menu Tahun Akademik', category: 'nav', description: 'Tampilkan manajemen semester & kalender', sort_order: 10 },

    // System
    { key: 'system.maintenance', label: 'Maintenance Mode', category: 'system', description: 'Kunci aplikasi untuk semua user kecuali developer', sort_order: 1 },
    { key: 'system.debug_mode', label: 'Developer Debug', category: 'system', description: 'Tampilkan informasi teknis di beberapa halaman', sort_order: 2 },
]

// ─── Raport sections ──────────────────────────────────────────────────────────
const RAPORT_SECTIONS = [
    {
        id: 'identitas',
        label: 'Identitas Sekolah',
        desc: 'Nama, alamat, dan logo yang tampil di header raport',
        icon: faSchool,
        color: 'text-indigo-500', bg: 'bg-indigo-500/10',
        gradient: 'from-indigo-500/8 to-transparent',
    },
    {
        id: 'kepala',
        label: 'Kepala Sekolah / Direktur',
        desc: 'Nama dan jabatan yang tercetak di footer raport',
        icon: faUser,
        color: 'text-emerald-500', bg: 'bg-emerald-500/10',
        gradient: 'from-emerald-500/8 to-transparent',
    },
    {
        id: 'warna',
        label: 'Warna & Tampilan',
        desc: 'Palet warna header raport dan footer WhatsApp',
        icon: faPalette,
        color: 'text-purple-500', bg: 'bg-purple-500/10',
        gradient: 'from-purple-500/8 to-transparent',
    },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────
function FL({ children }) {
    return (
        <label className="block text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-1.5 ml-0.5">
            {children}
        </label>
    )
}

/**
 * Highlighting Helper: Mewarnai teks yang cocok dengan kata kunci pencarian
 */
const Highlight = ({ text, query }) => {
    if (!query || !text) return <>{text}</>
    const parts = text.split(new RegExp(`(${query})`, 'gi'))
    return (
        <>
            {parts.map((part, i) =>
                part.toLowerCase() === query.toLowerCase() ? (
                    <mark key={i} className="bg-amber-400/30 text-amber-600 dark:text-amber-400 rounded-sm px-0.5 no-underline">
                        {part}
                    </mark>
                ) : (
                    <span key={i}>{part}</span>
                )
            )}
        </>
    )
}

function SectionHeader({ section }) {
    return (
        <div className={`flex items-center gap-3 px-5 py-4 border-b border-[var(--color-border)] bg-gradient-to-r ${section.gradient}`}>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${section.bg}`}>
                <FontAwesomeIcon icon={section.icon} className={`text-sm ${section.color}`} />
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-black text-[13px] text-[var(--color-text)] leading-tight">{section.label}</p>
                <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">{section.desc}</p>
            </div>
        </div>
    )
}

function ColorInput({ label, value, onChange }) {
    return (
        <div>
            <FL>{label}</FL>
            <div className="flex items-center gap-2.5">
                <div
                    className="relative w-11 h-11 rounded-xl overflow-hidden border-2 border-[var(--color-border)] shrink-0 cursor-pointer shadow-sm hover:scale-105 transition-transform"
                    style={{ background: value }}
                >
                    <input
                        type="color" value={value}
                        onChange={e => onChange(e.target.value)}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                </div>
                <input
                    type="text" value={value}
                    onChange={e => onChange(e.target.value)}
                    maxLength={7} placeholder="#000000"
                    className="input-field font-mono font-bold text-sm h-11 flex-1 uppercase"
                />
            </div>
        </div>
    )
}

function RaportPreview({ form }) {
    const c1 = form.report_color_primary || '#1a5c35'
    const c2 = form.report_color_secondary || '#c8a400'
    return (
        <div className="rounded-xl overflow-hidden bg-white text-black shadow-md border border-gray-200">
            <div className="flex items-center gap-3 p-3">
                <img
                    src={form.logo_url || mbsLogo}
                    alt="logo"
                    className="w-10 h-10 object-contain rounded shrink-0"
                    onError={e => {
                        if (form.logo_url) e.target.src = mbsLogo;
                        else e.target.style.display = 'none';
                    }}
                />
                <div className="flex-1 text-center leading-tight min-w-0">
                    {form.school_subtitle_ar && <div className="text-[7px] text-gray-400 truncate" dir="rtl">{form.school_subtitle_ar}</div>}
                    <div className="text-[11px] font-black truncate" style={{ color: c1 }} dir="rtl">{form.school_name_ar || '—'}</div>
                    <div className="text-[9px] font-bold text-gray-600 truncate">{form.school_name_id || '—'}</div>
                    <div className="text-[8px] text-gray-400 truncate">{form.school_address || '—'}</div>
                </div>
            </div>
            <div style={{ height: 3, background: `linear-gradient(90deg,${c1},${c2},${c1})` }} />
            <div style={{ borderBottom: `2px double ${c1}`, marginTop: 2 }} />
            <div className="flex justify-between px-3 py-2 text-[8px] text-gray-400">
                <span>Musyrif / Wali Kamar</span>
                <span>{form.headmaster_name_id || '—'}</span>
                <span>Wali Santri</span>
            </div>
        </div>
    )
}

// ─── Toggle ───────────────────────────────────────────────────────────────────
function Toggle({ checked, onChange, disabled = false, activeColor = 'bg-emerald-500' }) {
    return (
        <button
            onClick={() => !disabled && onChange(!checked)}
            type="button"
            disabled={disabled}
            role="switch"
            aria-checked={checked}
            className={`
                group relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-lg p-[4px]
                transition-all duration-300 ease-in-out focus:outline-none
                ${disabled ? 'opacity-30 cursor-not-allowed' : 'hover:scale-[1.05] active:scale-95'}
                ${checked ? activeColor : 'bg-slate-200 dark:bg-slate-700'}
                ${checked ? 'shadow-[0_0_15px_-3px_rgba(16,185,129,0.4)]' : 'shadow-inner'}
                border border-black/5
            `}
        >
            <span className="sr-only">Toggle state</span>
            <span
                className={`
                    pointer-events-none flex h-4 w-4 transform items-center justify-center rounded-[4px] bg-white shadow-md ring-0 
                    transition-all duration-400 ease-[cubic-bezier(0.23,1,0.32,1)]
                    ${checked ? 'translate-x-[20px]' : 'translate-x-0'}
                `}
            >
                {/* Micro-detail inside the square dot */}
                <div className={`
                    w-0.5 h-2 rounded-full transition-all duration-300
                    ${checked ? 'bg-emerald-600 opacity-30' : 'bg-slate-300'}
                `} />
            </span>
        </button>
    )
}

// ─── FlagRow ──────────────────────────────────────────────────────────────────
/**
 * Dioptimasi dengan React.memo untuk mencegah re-render masal saat mengetik di pencarian
 */
const FlagRow = memo(({ flag, cat, onToggle, isSaving, query }) => {
    return (
        <div className={[
            'flex items-center gap-4 px-4 py-3.5 rounded-xl border transition-all duration-200 group h-full',
            flag.enabled
                ? 'border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm'
                : 'border-[var(--color-border)]/40 bg-[var(--color-surface-alt)]/30 grayscale-[0.5] opacity-80',
        ].join(' ')}>
            {/* Accent dot */}
            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 transition-all duration-300 ${flag.enabled ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-300'}`} />

            {/* Label + desc */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[13px] font-bold leading-tight transition-colors ${flag.enabled ? 'text-[var(--color-text)]' : 'text-[var(--color-text-muted)]'}`}>
                        <Highlight text={flag.label} query={query} />
                    </span>
                    {!flag.enabled && (
                        <span className="text-[9px] font-black tracking-widest uppercase px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-[var(--color-text-muted)]">off</span>
                    )}
                </div>
                {flag.description && (
                    <p 
                        className="text-[11px] text-[var(--color-text-muted)] mt-0.5 leading-snug opacity-70 group-hover:opacity-100 transition-opacity line-clamp-1"
                        title={flag.description}
                    >
                        <Highlight text={flag.description} query={query} />
                    </p>
                )}
            </div>

            {/* Toggle area */}
            <div className="flex items-center gap-2 flex-shrink-0">
                {isSaving && <FontAwesomeIcon icon={faSpinner} className="animate-spin text-[10px] text-[var(--color-text-muted)]" />}
                <Toggle
                    checked={flag.enabled}
                    onChange={() => onToggle(flag)}
                    disabled={isSaving}
                    activeColor={cat.toggleActive}
                />
            </div>
        </div>
    )
})

FlagRow.displayName = 'FlagRow'

// ─── CategoryNavCard ──────────────────────────────────────────────────────────
function CategoryNavCard({ cat, flags, isActive, onClick }) {
    const items = flags.filter(f => f.category === cat.id)
    const activeCount = items.filter(f => f.enabled).length
    const totalCount = items.length
    const progress = totalCount > 0 ? (activeCount / totalCount) * 100 : 0

    return (
        <button
            onClick={onClick} type="button"
            className={`
                group relative w-full text-left p-3 rounded-2xl border transition-all duration-300
                ${isActive
                    ? `bg-white dark:bg-slate-800 border-[var(--color-border)] shadow-xl shadow-slate-200/50 dark:shadow-none translate-x-1`
                    : 'bg-transparent border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/40 hover:translate-x-1'
                }
            `}
        >
            <div className="flex items-center gap-3">
                <div className={`
                    w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300
                    ${isActive ? `${cat.bg} scale-110 shadow-lg` : 'bg-slate-100 dark:bg-slate-800'}
                `}>
                    <FontAwesomeIcon icon={cat.icon} className={`text-sm ${isActive ? cat.color : 'text-slate-400'}`} />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                        <p className={`text-[13px] font-black truncate ${isActive ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`}>
                            {cat.label}
                        </p>
                        <span className={`text-[9px] font-black tabular-nums ${isActive ? cat.color : 'text-slate-400'}`}>
                            {activeCount}/{totalCount}
                        </span>
                    </div>
                    {/* Progress micro-bar */}
                    <div className="mt-2 h-1 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                            className={`h-full transition-all duration-500 ${cat.barColor}`}
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
                {isActive && (
                    <div className={`w-1.5 h-6 rounded-full absolute -left-0.5 ${cat.barColor} animate-in fade-in slide-in-from-left-1`} />
                )}
            </div>
        </button>
    )
}

function GlobalStatusCard({ total, enabled }) {
    const progress = total > 0 ? (enabled / total) * 100 : 0
    return (
        <div className="glass rounded-2xl border border-[var(--color-border)] p-4 relative overflow-hidden group transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/5">
            <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">System Health</p>
                        <div className="flex items-baseline gap-1.5">
                            <p className="text-[22px] font-black text-slate-800 dark:text-white leading-none">
                                {Math.round(progress)}%
                            </p>
                            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-tighter">Optimized</span>
                        </div>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                        <FontAwesomeIcon icon={faCheck} className="text-emerald-500 text-sm" />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="p-2.5 rounded-xl bg-emerald-500/[0.03] border border-emerald-500/10 text-center">
                        <p className="text-[8px] font-black text-emerald-600/70 uppercase tracking-widest mb-1">Active</p>
                        <p className="text-base font-black text-emerald-600">{enabled}</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-center">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Idle</p>
                        <p className="text-base font-black text-slate-500">{total - enabled}</p>
                    </div>
                </div>

                <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-slate-400 px-0.5">
                        <span>Efficiency</span>
                        <span>{enabled}/{total}</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-[1.5px]">
                        <div
                            className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.4)] transition-all duration-1000"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function ActivityFeed({ refreshKey, flags }) {
    const [logs, setLogs] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [totalLogs, setTotalLogs] = useState(0)
    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(10)
    const [activeView, setActiveView] = useState('detail') // 'detail' or 'summary'

    const fetchLogs = useCallback(async () => {
        setLoading(true)
        let countQuery = supabase.from('audit_logs').select('*', { count: 'exact', head: true }).eq('table_name', 'feature_flags')
        const { count } = await countQuery
        setTotalLogs(count || 0)

        const from = (page - 1) * pageSize
        const to = from + pageSize - 1
        const { data, error } = await supabase
            .from('audit_logs')
            .select('*')
            .eq('table_name', 'feature_flags')
            .order('created_at', { ascending: false })
            .range(from, to)

        if (!error) setLogs(data || [])
        setLoading(false)
    }, [page, pageSize])

    useEffect(() => { fetchLogs() }, [fetchLogs, refreshKey])

    const filteredLogs = useMemo(() => {
        if (!searchTerm.trim()) return logs
        const q = searchTerm.toLowerCase()
        return logs.filter(log =>
            log.new_data?.label?.toLowerCase().includes(q) ||
            log.new_data?.key?.toLowerCase().includes(q)
        )
    }, [logs, searchTerm])

    // Calculate simple stats for Ringkasan
    const stats = useMemo(() => {
        const counts = {}
        logs.forEach(l => {
            const label = l.new_data?.label || l.new_data?.key
            counts[label] = (counts[label] || 0) + 1
        })
        return Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
    }, [logs])

    return (
        <div className="space-y-3">
            <div className="glass rounded-2xl border border-[var(--color-border)] overflow-hidden shadow-sm">
                {/* Unified Toolbar */}
                <div className="p-2 border-b border-[var(--color-border)] bg-slate-50/30 dark:bg-slate-800/20 flex flex-col sm:flex-row items-center gap-2">
                    <div className="flex items-center gap-1 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-1 shadow-sm">
                        <button
                            onClick={() => setActiveView('detail')}
                            className={`h-7 px-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeView === 'detail' ? 'bg-[var(--color-primary)] text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            Detail Log
                        </button>
                        <button
                            onClick={() => setActiveView('summary')}
                            className={`h-7 px-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeView === 'summary' ? 'bg-[var(--color-primary)] text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            Ringkasan
                        </button>
                    </div>

                    <div className="relative flex-1 w-full sm:w-auto">
                        <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400" />
                        <input
                            type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                            placeholder="Cari aktivitas atau fitur..."
                            className="w-full h-9 pl-9 pr-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[11px] font-medium focus:outline-none focus:border-[var(--color-primary)] transition-all shadow-sm"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-[10px] font-black text-slate-500 uppercase tracking-widest border border-[var(--color-border)]">
                            {totalLogs} entri
                        </div>
                        <button
                            onClick={fetchLogs}
                            className="w-9 h-9 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-slate-400 hover:text-[var(--color-primary)] transition-all flex items-center justify-center shadow-sm"
                        >
                            <FontAwesomeIcon icon={faRotateRight} className={loading ? 'fa-spin' : ''} />
                        </button>
                    </div>
                </div>

                {activeView === 'detail' ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[700px]">
                            <thead>
                                <tr className="border-b border-[var(--color-border)] bg-slate-50/30 dark:bg-slate-800/40">
                                    <th className="pl-5 pr-3 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400 w-10">#</th>
                                    <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400 w-14 text-center">Status</th>
                                    <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400">Fitur</th>
                                    <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400">Perubahan</th>
                                    <th className="pr-5 pl-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400 text-right">Waktu</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--color-border)]/50">
                                {loading && logs.length === 0 ? (
                                    [...Array(5)].map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td colSpan={5} className="px-5 py-4"><div className="h-2 bg-slate-100 dark:bg-slate-800 rounded w-full" /></td>
                                        </tr>
                                    ))
                                ) : filteredLogs.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-5 py-12 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest opacity-50">Tidak ada data</td>
                                    </tr>
                                ) : (
                                    filteredLogs.map((log, idx) => (
                                        <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                                            <td className="pl-5 pr-3 py-3 text-[10px] font-bold text-slate-400">
                                                {(page - 1) * pageSize + idx + 1}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <div className={`w-6 h-6 mx-auto rounded-lg flex items-center justify-center ${log.new_data?.enabled ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-500/10 text-slate-500'}`}>
                                                    <FontAwesomeIcon icon={log.new_data?.enabled ? faCheck : faXmark} className="text-[10px]" />
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <p className="text-[11px] font-bold text-slate-700 dark:text-slate-200 group-hover:text-[var(--color-primary)] transition-colors">
                                                    {log.new_data?.label || log.new_data?.key}
                                                </p>
                                                <p className="text-[8px] text-slate-400 font-mono opacity-60">
                                                    {log.new_data?.key}
                                                </p>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`text-[8px] font-black px-2 py-0.5 rounded-lg border ${log.new_data?.enabled ? 'bg-emerald-500/5 text-emerald-600 border-emerald-500/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'}`}>
                                                    {log.new_data?.enabled ? 'ENABLED' : 'DISABLED'}
                                                </span>
                                            </td>
                                            <td className="pr-5 pl-4 py-3 text-right">
                                                <p className="text-[10px] font-bold text-slate-500 tabular-nums">
                                                    {fmtRelative(log.created_at)}
                                                </p>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    /* High-Density Summary Dashboard (Full Width) */
                    <div className="p-6 bg-slate-50/30 dark:bg-slate-900/10 min-h-[500px]">
                        <div className="space-y-6">
                            
                            {/* Top Stats Row - 4 Columns */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="glass p-4 rounded-2xl border border-[var(--color-border)] shadow-sm flex items-center gap-4">
                                    <div className="w-11 h-11 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center text-lg shrink-0">
                                        <FontAwesomeIcon icon={faSync} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Total Aktivitas</p>
                                        <p className="text-xl font-black text-slate-700 dark:text-slate-100">{totalLogs}</p>
                                    </div>
                                </div>

                                <div className="glass p-4 rounded-2xl border border-[var(--color-border)] shadow-sm flex items-center gap-4">
                                    <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center text-lg shrink-0">
                                        <FontAwesomeIcon icon={faBolt} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Fitur Teraktif</p>
                                        <p className="text-[12px] font-black text-slate-700 dark:text-slate-100 truncate">
                                            {stats[0]?.[0] || 'N/A'}
                                        </p>
                                    </div>
                                </div>

                                <div className="glass p-4 rounded-2xl border border-[var(--color-border)] shadow-sm flex items-center gap-4">
                                    <div className="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center text-lg shrink-0">
                                        <FontAwesomeIcon icon={faHistory} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Update Terakhir</p>
                                        <p className="text-[12px] font-black text-slate-700 dark:text-slate-100 truncate">
                                            {logs[0] ? fmtRelative(logs[0].created_at) : '-'}
                                        </p>
                                    </div>
                                </div>

                                <div className="glass p-4 rounded-2xl border border-[var(--color-border)] shadow-sm flex items-center gap-4">
                                    <div className="w-11 h-11 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center text-lg shrink-0">
                                        <FontAwesomeIcon icon={faCheckCircle} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Status Sync</p>
                                        <p className="text-[12px] font-black text-emerald-500">Connected</p>
                                    </div>
                                </div>
                            </div>

                            {/* Middle Row - Split View */}
                            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                                
                                {/* Left: Progress Bars for Top Features */}
                                <div className="xl:col-span-2 glass rounded-2xl border border-[var(--color-border)] overflow-hidden flex flex-col">
                                    <div className="px-5 py-4 border-b border-[var(--color-border)] bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-between">
                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Top 5 Intensitas Perubahan</h4>
                                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Berdasarkan Log</span>
                                    </div>
                                    <div className="p-6 space-y-6 flex-1">
                                        {stats.map(([label, count], idx) => {
                                            const max = stats.length > 0 ? (stats[0][1] || 1) : 1
                                            const percent = (count / max) * 100
                                            return (
                                                <div key={label} className="space-y-2.5">
                                                    <div className="flex justify-between items-center text-[11px] font-black">
                                                        <span className="text-slate-700 dark:text-slate-200 uppercase tracking-tight">{label}</span>
                                                        <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 border border-[var(--color-border)]">{count} perubahan</span>
                                                    </div>
                                                    <div className="h-3 w-full bg-slate-100/50 dark:bg-slate-800/50 rounded-full overflow-hidden p-0.5 border border-[var(--color-border)]">
                                                        <div 
                                                            className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 transition-all duration-1000 shadow-[0_0_10px_rgba(99,102,241,0.2)]"
                                                            style={{ width: `${percent}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            )
                                        })}
                                        {stats.length === 0 && (
                                            <div className="h-full flex flex-col items-center justify-center opacity-30 py-12">
                                                <FontAwesomeIcon icon={faChartPie} className="text-4xl mb-3" />
                                                <p className="text-[10px] font-black uppercase tracking-widest">Belum ada data tersedia</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                {/* Right: Distribution & Health */}
                                <div className="space-y-6">
                                    <div className="glass rounded-2xl border border-[var(--color-border)] p-5 flex flex-col items-center text-center relative overflow-hidden h-full">
                                        <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500/5 rounded-full blur-3xl -mr-20 -mt-20" />
                                        
                                        <div className="w-16 h-16 rounded-2xl bg-white dark:bg-slate-800 shadow-lg border border-[var(--color-border)] flex items-center justify-center mb-5 relative z-10">
                                            <FontAwesomeIcon icon={faChartPie} className="text-2xl text-indigo-500" />
                                        </div>
                                        <h4 className="text-xs font-black text-slate-700 dark:text-slate-200 relative z-10 uppercase tracking-widest">Analitik Sistem</h4>
                                        <p className="text-[11px] text-slate-400 mt-3 leading-relaxed relative z-10 px-4">
                                            Modul internal saat ini berjalan dengan optimal. Semua perubahan flag dicatat secara real-time ke audit log.
                                        </p>
                                        
                                        <div className="mt-6 w-full space-y-3 relative z-10 px-2">
                                            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-100/50 dark:bg-slate-800/50 border border-[var(--color-border)]">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                                    <span className="text-[10px] font-black text-slate-500 uppercase">Database</span>
                                                </div>
                                                <span className="text-[10px] font-black text-emerald-500 uppercase">Stable</span>
                                            </div>
                                            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-100/50 dark:bg-slate-800/50 border border-[var(--color-border)]">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full bg-indigo-500" />
                                                    <span className="text-[10px] font-black text-slate-500 uppercase">Sync Engine</span>
                                                </div>
                                                <span className="text-[10px] font-black text-indigo-500 uppercase">Active</span>
                                            </div>
                                        </div>

                                        <button 
                                            onClick={() => setActiveView('detail')}
                                            className="mt-6 w-full py-3 rounded-xl bg-slate-800 text-white text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 transition-all shadow-md relative z-10"
                                        >
                                            Kembali ke Detail Log
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Bottom Row - Recent Activity Timeline (Fills horizontal space) */}
                            <div className="glass rounded-2xl border border-[var(--color-border)] overflow-hidden">
                                <div className="px-5 py-3 border-b border-[var(--color-border)] bg-slate-50/50 dark:bg-slate-800/50 flex items-center gap-2">
                                    <FontAwesomeIcon icon={faHistory} className="text-[10px] text-slate-400" />
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Timeline Aktivitas Terakhir</h4>
                                </div>
                                <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {logs.slice(0, 3).map((log, i) => (
                                        <div key={log.id} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 border border-[var(--color-border)] relative overflow-hidden group">
                                            <div className={`absolute left-0 top-0 bottom-0 w-1 ${log.new_data?.enabled ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                                            <div className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-xs ${log.new_data?.enabled ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                                                <FontAwesomeIcon icon={log.new_data?.enabled ? faCheck : faXmark} />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[11px] font-black text-slate-700 dark:text-slate-200 truncate group-hover:text-indigo-500 transition-colors">
                                                    {log.new_data?.label || log.new_data?.key}
                                                </p>
                                                <p className="text-[9px] text-slate-400 font-bold mt-0.5">
                                                    {fmtRelative(log.created_at)}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                    {logs.length === 0 && (
                                        <div className="col-span-3 py-4 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest opacity-40">
                                            Tidak ada riwayat aktivitas terbaru
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeView === 'detail' && (
                    <div className="bg-slate-50/50 dark:bg-slate-800/30 p-2 border-t border-[var(--color-border)]">
                        <Pagination
                            totalRows={totalLogs}
                            page={page}
                            pageSize={pageSize}
                            setPage={setPage}
                            setPageSize={setPageSize}
                            label="Log"
                        />
                    </div>
                )}
            </div>
        </div>
    )
}

export default function AdminSettingsPage() {
    const { addToast } = useToast()
    const { settings, loading: settingsLoading, saveSettings } = useSchoolSettings()
    const { profile, isDemoMode } = useAuth()
    const hasDbCredentials = !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)

    const [activeTab, setActiveTab] = useState('flags')

    // --- Signatures management states ---
    const [signaturesList, setSignaturesList] = useState([])
    const [teachersList, setTeachersList] = useState([])
    const [loadingSignatures, setLoadingSignatures] = useState(false)
    const [newSigRole, setNewSigRole] = useState('wali_kelas')
    const [newSigTeacherId, setNewSigTeacherId] = useState('')
    const [newSigFile, setNewSigFile] = useState(null)
    const [uploadingSig, setUploadingSig] = useState(false)
    const sigFileInputRef = useRef(null)

    const fetchSignaturesAndTeachers = async () => {
        setLoadingSignatures(true)
        try {
            // Fetch active teachers
            const { data: teachersData, error: teachersErr } = await supabase
                .from('teachers')
                .select('id, name')
                .order('name')
            if (teachersErr) throw teachersErr
            setTeachersList(teachersData || [])

            // Fetch signatures list
            const { data: sigsData, error: sigsErr } = await supabase
                .from('signatures')
                .select('id, role, signature_url, person_id, is_active, teachers:person_id(name)')
                .order('created_at', { ascending: false })
            if (sigsErr) throw sigsErr
            setSignaturesList(sigsData || [])
        } catch (err) {
            console.error(err)
            addToast('Gagal memuat data tanda tangan: ' + (err.message || err), 'error')
        } finally {
            setLoadingSignatures(false)
        }
    }

    useEffect(() => {
        if (activeTab === 'signatures') {
            fetchSignaturesAndTeachers()
        }
    }, [activeTab])

    const handleDeleteSignature = async (sig) => {
        if (!confirm(`Hapus tanda tangan digital untuk ${sig.teachers?.name || 'guru ini'}?`)) return
        try {
            // Delete DB row
            const { error: dbErr } = await supabase
                .from('signatures')
                .delete()
                .eq('id', sig.id)
            if (dbErr) throw dbErr

            // Also try to delete file from storage if it is in our bucket
            if (sig.signature_url) {
                const urlParts = sig.signature_url.split('/signatures/')
                if (urlParts.length > 1) {
                    const filePath = urlParts[1]
                    await supabase.storage.from('signatures').remove([filePath])
                }
            }

            addToast('Tanda tangan berhasil dihapus', 'success')
            fetchSignaturesAndTeachers()
        } catch (err) {
            console.error(err)
            addToast('Gagal menghapus: ' + (err.message || err), 'error')
        }
    }

    const handleUploadSignature = async (e) => {
        e.preventDefault()
        if (!newSigTeacherId) {
            addToast('Silakan pilih guru terlebih dahulu', 'warning')
            return
        }
        if (!newSigFile) {
            addToast('Silakan pilih file gambar tanda tangan', 'warning')
            return
        }
        setUploadingSig(true)
        try {
            // Generate unique filename
            const ext = newSigFile.name.split('.').pop()
            const fileName = `${newSigRole}_${newSigTeacherId}_${Date.now()}.${ext}`

            // 1. Upload to storage
            const { error: uploadErr } = await supabase.storage
                .from('signatures')
                .upload(fileName, newSigFile, { upsert: true })
            if (uploadErr) throw uploadErr

            // Get public URL
            const { data: urlData } = supabase.storage
                .from('signatures')
                .getPublicUrl(fileName)
            const publicUrl = urlData.publicUrl

            // 2. Set all other signatures for this person/role as inactive if exists
            await supabase
                .from('signatures')
                .update({ is_active: false })
                .eq('person_id', newSigTeacherId)
                .eq('is_active', true)

            // 3. Insert new row
            const { error: insertErr } = await supabase
                .from('signatures')
                .insert({
                    role: newSigRole,
                    person_id: newSigTeacherId,
                    signature_url: publicUrl,
                    is_active: true
                })
            if (insertErr) throw insertErr

            addToast('Tanda tangan digital berhasil ditambahkan', 'success')
            
            // Reset form
            setNewSigTeacherId('')
            setNewSigFile(null)
            if (sigFileInputRef.current) sigFileInputRef.current.value = ''
            
            // Refresh list
            fetchSignaturesAndTeachers()
        } catch (err) {
            console.error(err)
            addToast('Gagal mengunggah tanda tangan: ' + (err.message || err), 'error')
        } finally {
            setUploadingSig(false)
        }
    }

    const [activeCategory, setActiveCategory] = useState('module')
    const [flags, setFlags] = useState([])
    const [loading, setLoading] = useState(true)
    const [savingKey, setSavingKey] = useState(null)
    const [refreshing, setRefreshing] = useState(false)
    const [syncingFlags, setSyncingFlags] = useState(false)
    const [activityKey, setActivityKey] = useState(0) // Untuk refresh activity feed

    const [form, setForm] = useState({ ...DEFAULT_SETTINGS })
    const [dirty, setDirty] = useState(false)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (!settingsLoading) { setForm({ ...DEFAULT_SETTINGS, ...settings }); setDirty(false) }
    }, [settingsLoading, settings])

    const set = (k, v) => { setForm(p => ({ ...p, [k]: v })); setDirty(true) }
    const handleReset = () => { setForm({ ...DEFAULT_SETTINGS, ...settings }); setDirty(false) }
    const handleSaveRaport = async () => {
        if (saving) return
        setSaving(true)
        const err = await saveSettings(form)
        setSaving(false)
        if (err) addToast('Gagal: ' + err.message, 'error')
        else {
            addToast('Konfigurasi raport disimpan', 'success'); setDirty(false)
            await logAudit({ action: 'UPDATE', source: 'SYSTEM', tableName: 'school_settings', newData: { settings_saved: true, keys: Object.keys(form) } })
        }
    }

    const fetchFlags = useCallback(async (quiet = false) => {
        if (!quiet) setLoading(true); else setRefreshing(true)
        const { data, error } = await supabase
            .from('feature_flags').select('*').order('category').order('sort_order')
        if (error) addToast('Gagal memuat flags: ' + error.message, 'error')
        else setFlags(data || [])
        setLoading(false); setRefreshing(false)
    }, [addToast])

    useEffect(() => { fetchFlags() }, [fetchFlags])

    // --- Enterprise Self-Healing Logic ---
    const handleSyncFlags = async () => {
        if (syncingFlags) return
        setSyncingFlags(true)
        try {
            const existingKeys = new Set(flags.map(f => f.key))
            const missingFlags = KNOWN_FLAGS.filter(f => !existingKeys.has(f.key))

            if (missingFlags.length === 0) {
                addToast('Semua flag sudah terdaftar', 'success')
                return
            }

            // Insert missing flags
            const { error } = await supabase
                .from('feature_flags')
                .insert(missingFlags.map(f => ({ ...f, enabled: true })))

            if (error) throw error

            addToast(`${missingFlags.length} flag baru berhasil disinkronisasi`, 'success')
            fetchFlags(true)
        } catch (err) {
            addToast('Gagal sinkronisasi: ' + err.message, 'error')
        } finally {
            setSyncingFlags(false)
        }
    }

    const handleToggle = async (flag) => {
        const newVal = !flag.enabled
        setFlags(prev => prev.map(f => f.key === flag.key ? { ...f, enabled: newVal } : f))
        setSavingKey(flag.key)
        const { error } = await supabase.from('feature_flags').update({ enabled: newVal }).eq('id', flag.id)
        setSavingKey(null)
        if (error) {
            setFlags(prev => prev.map(f => f.key === flag.key ? { ...f, enabled: !newVal } : f))
            addToast('Gagal: ' + error.message, 'error')
        } else {
            await logAudit({ action: 'UPDATE', source: 'SYSTEM', tableName: 'feature_flags', newData: { key: flag.key, label: flag.label, enabled: newVal } })
            if (flag.key === 'system.maintenance') {
                addToast(newVal ? 'Maintenance mode AKTIF' : 'Maintenance mode dinonaktifkan', newVal ? 'warning' : 'success')
            }
            setActivityKey(p => p + 1)
        }
    }

    const maintenanceOn = flags.find(f => f.key === 'system.maintenance')?.enabled
    const activeCat = CATEGORIES.find(c => c.id === activeCategory)
    const searchInputRef = useRef(null)

    // --- Global Shortcut: Ctrl + K for Search ---
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault()
                searchInputRef.current?.focus()
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [])

    // ── Search flags
    const [flagSearch, setFlagSearch] = useState('')
    const activeFlagRows = useMemo(() => {
        let rows = flags.filter(f => f.category === activeCategory).sort((a, b) => a.sort_order - b.sort_order)
        if (flagSearch.trim()) {
            const q = flagSearch.toLowerCase()
            rows = rows.filter(f => f.label?.toLowerCase().includes(q) || f.description?.toLowerCase().includes(q) || f.key?.toLowerCase().includes(q))
        }
        return rows
    }, [flags, activeCategory, flagSearch])

    const totalEnabled = flags.filter(f => f.enabled).length
    const totalFlags = flags.length

    return (
        <DashboardLayout title="Developer Settings">
            <div className="p-4 md:p-6 space-y-5 max-w-[1800px] mx-auto">

                {/* ── Header ──────────────────────────────────────────── */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
                    <div>
                        <Breadcrumb badge="Admin" items={['Internal Flags']} className="mb-1" />
                        <div className="flex items-center gap-2.5 mb-1">
                            <h1 className="text-2xl font-black font-heading tracking-tight text-[var(--color-text)]">
                                Developer Settings
                            </h1>
                            {maintenanceOn && (
                                <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-rose-500/15 text-rose-500 border border-rose-500/30 animate-pulse">
                                    <FontAwesomeIcon icon={faTriangleExclamation} className="text-[9px]" /> Maintenance
                                </span>
                            )}
                            <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 uppercase tracking-widest">
                                Admin Only
                            </span>
                        </div>
                        <p className="text-[var(--color-text-muted)] text-[11px] font-medium opacity-70">
                            Feature flags & konfigurasi sistem. Perubahan langsung berlaku real-time.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleSyncFlags}
                            disabled={syncingFlags}
                            className="h-9 px-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-all flex items-center gap-2"
                            title="Sinkronisasi flag yang ada di kode ke database"
                        >
                            {syncingFlags ? <FontAwesomeIcon icon={faSpinner} className="fa-spin" /> : <FontAwesomeIcon icon={faSync} />}
                            <span className="hidden sm:inline">Sync Flags</span>
                        </button>
                        <button
                            onClick={() => fetchFlags(true)} disabled={refreshing} type="button"
                            className="flex-shrink-0 w-9 h-9 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition flex items-center justify-center"
                        >
                            <FontAwesomeIcon icon={faRotateRight} className={`text-sm ${refreshing ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>

                {/* ── Tab bar ─────────────────────────────────────────── */}
                <div className="mb-6">
                    <div className="inline-grid grid-cols-5 sm:flex w-full sm:w-fit bg-[var(--color-surface-alt)]/50 backdrop-blur-sm rounded-2xl border border-[var(--color-border)] p-1.5 gap-1 shadow-sm">
                        {TABS.map(t => (
                            <button
                                key={t.id} onClick={() => setActiveTab(t.id)} type="button"
                                className={`relative h-10 px-1 sm:px-5 rounded-xl text-[10px] sm:text-[13px] font-bold flex items-center justify-center gap-2 transition-all duration-200
                                    ${activeTab === t.id
                                        ? `bg-[var(--color-surface)] shadow-sm 
                                           ${t.id === 'danger' ? 'text-rose-500' : 'text-[var(--color-primary)]'}`
                                        : `text-[var(--color-text-muted)] hover:text-[var(--color-text)]
                                           ${t.id === 'danger' ? 'hover:text-rose-500 hover:bg-rose-500/5' : 'hover:bg-[var(--color-surface)]/40'}`
                                    }`}
                            >
                                <FontAwesomeIcon icon={t.icon} className="text-[11px] sm:text-[12px] opacity-80" />
                                <span className="truncate">
                                    {t.id === 'flags' ? (
                                        <>
                                            <span className="hidden sm:inline">Feature Flags</span>
                                            <span className="sm:hidden">Flags</span>
                                        </>
                                    ) : t.label}
                                </span>
                                {t.id === 'raport' && dirty && (
                                    <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 rounded-full bg-amber-400 border border-[var(--color-surface)]" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ══════════════════════════════════════════════════════
                    TAB: FEATURE FLAGS
                ══════════════════════════════════════════════════════ */}
                {activeTab === 'flags' && (
                    <>
                        {/* Maintenance banner */}
                        {maintenanceOn && (
                            <div className="flex items-center gap-3 p-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 mb-6">
                                <div className="w-9 h-9 rounded-xl bg-rose-500/20 flex items-center justify-center flex-shrink-0">
                                    <FontAwesomeIcon icon={faTriangleExclamation} className="text-rose-500" />
                                </div>
                                <div>
                                    <p className="font-black text-sm text-rose-500">Maintenance Mode Aktif</p>
                                    <p className="text-[11px] text-rose-400/80 mt-0.5">
                                        Seluruh user (kecuali developer) tidak dapat mengakses aplikasi.
                                    </p>
                                </div>
                            </div>
                        )}

                        {loading ? (
                            /* ── Skeleton ── */
                            <div className="grid lg:grid-cols-[220px_1fr] gap-5">
                                <div className="space-y-2.5">
                                    {[...Array(5)].map((_, i) => (
                                        <div key={i} className="h-[62px] rounded-2xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] animate-pulse" />
                                    ))}
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 auto-rows-min">
                                    {[...Array(6)].map((_, i) => (
                                        <div key={i} className="h-[72px] rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] animate-pulse" />
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="grid lg:grid-cols-[220px_1fr] gap-5 items-start">

                                {/* ── Left sidebar ── */}
                                <div className="space-y-4">
                                    <GlobalStatusCard total={totalFlags} enabled={totalEnabled} />

                                    <div className="space-y-1">
                                        <p className="px-3 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Categories</p>
                                        {CATEGORIES.map(cat => (
                                            <CategoryNavCard
                                                key={cat.id}
                                                cat={cat}
                                                flags={flags}
                                                isActive={activeCategory === cat.id}
                                                onClick={() => {
                                                    setActiveCategory(cat.id)
                                                    setFlagSearch('')
                                                }}
                                            />
                                        ))}
                                    </div>

                                    <div className="flex items-start gap-2 px-1 pt-2">
                                        <FontAwesomeIcon icon={faBolt} className="text-[9px] text-amber-400 flex-shrink-0 mt-0.5" />
                                        <p className="text-[10px] text-[var(--color-text-muted)] leading-snug">
                                            Perubahan tersimpan real-time ke Supabase.
                                        </p>
                                    </div>
                                </div>

                                {/* ── Right panel ── */}
                                <div className="space-y-3 min-w-0">
                                    <div className="glass rounded-2xl border border-[var(--color-border)] overflow-hidden">
                                        {/* Panel header */}
                                        {activeCat && (
                                            <div className={`flex items-center gap-3 px-5 py-4 border-b border-[var(--color-border)] bg-gradient-to-r ${activeCat.gradient}`}>
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${activeCat.bg}`}>
                                                    <FontAwesomeIcon icon={activeCat.icon} className={`${activeCat.color}`} />
                                                </div>
                                                <div className="flex-1">
                                                    <h2 className="text-[14px] font-black text-[var(--color-text)] leading-none">{activeCat.label}</h2>
                                                    <p className="text-[11px] text-[var(--color-text-muted)] mt-1.5 opacity-80">{activeCat.desc}</p>
                                                </div>
                                                <div className="text-right">
                                                    <div className="px-2.5 py-1 rounded-full bg-white/40 dark:bg-black/20 border border-white/20 text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">
                                                        {activeFlagRows.filter(f => f.enabled).length}/{activeFlagRows.length} aktif
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        <div className="p-3 space-y-3">
                                            {/* Search inside flags */}
                                            <div className="relative mb-5">
                                                <FontAwesomeIcon icon={faSearch} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[11px] text-[var(--color-text-muted)] pointer-events-none opacity-60" />
                                                <input
                                                    ref={searchInputRef}
                                                    type="text" value={flagSearch} onChange={e => setFlagSearch(e.target.value)}
                                                    placeholder={
                                                        activeCategory === 'module' ? 'Cari modul atau fitur utama...' :
                                                        activeCategory === 'students' ? 'Cari pengaturan data siswa...' :
                                                        activeCategory === 'nav' ? 'Cari menu navigasi...' :
                                                        activeCategory === 'access' ? 'Cari perizinan role...' :
                                                        'Cari konfigurasi sistem...'
                                                    }
                                                    className="w-full h-10 pl-10 pr-10 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/50 text-[12px] font-medium focus:outline-none focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/5 transition-all"
                                                />
                                                {!flagSearch && (
                                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded border border-[var(--color-border)] bg-[var(--color-surface)] text-[9px] font-black text-[var(--color-text-muted)] opacity-40 pointer-events-none uppercase tracking-tighter hidden sm:block">
                                                        Ctrl + K
                                                    </div>
                                                )}
                                                {flagSearch && (
                                                    <button onClick={() => setFlagSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-lg hover:bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-rose-500 transition-all">
                                                        <FontAwesomeIcon icon={faXmark} className="text-[10px]" />
                                                    </button>
                                                )}
                                            </div>

                                            {/* Responsive Grid List */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 items-stretch content-start auto-rows-min">
                                                {/* Demo Mode Toggle Card */}
                                                {activeCategory === 'system' && !flagSearch.trim() && (
                                                    <div className={[
                                                        'flex items-center gap-4 px-4 py-3.5 rounded-xl border transition-all duration-200 group h-full',
                                                        isDemoMode
                                                            ? 'border-amber-500/30 bg-amber-500/[0.02] shadow-sm'
                                                            : 'border-[var(--color-border)]/40 bg-[var(--color-surface-alt)]/30 grayscale-[0.5] opacity-80',
                                                    ].join(' ')}>
                                                        {/* Accent dot */}
                                                        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 transition-all duration-300 ${isDemoMode ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'bg-slate-300'}`} />

                                                        {/* Label + desc */}
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className={`text-[13px] font-bold leading-tight transition-colors ${isDemoMode ? 'text-[var(--color-text)] font-black' : 'text-[var(--color-text-muted)]'}`}>
                                                                    Demo Mode
                                                                </span>
                                                                {isDemoMode ? (
                                                                    <span className="text-[9px] font-black tracking-widest uppercase px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 border border-amber-500/20">demo</span>
                                                                ) : (
                                                                    <span className="text-[9px] font-black tracking-widest uppercase px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-[var(--color-text-muted)]">db real</span>
                                                                )}
                                                            </div>
                                                            <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5 leading-snug opacity-70 group-hover:opacity-100 transition-opacity line-clamp-1">
                                                                {!hasDbCredentials ? 'Dipaksa aktif karena kredensial Supabase kosong' : 'Gunakan mock database lokal untuk simulasi/testing'}
                                                            </p>
                                                        </div>

                                                        {/* Toggle area */}
                                                        <div className="flex items-center gap-2 flex-shrink-0">
                                                            <Toggle
                                                                checked={isDemoMode}
                                                                disabled={!hasDbCredentials}
                                                                onChange={(newVal) => {
                                                                    if (newVal) {
                                                                        localStorage.setItem('laporanmu_force_demo', 'true')
                                                                    } else {
                                                                        localStorage.removeItem('laporanmu_force_demo')
                                                                    }
                                                                    addToast(newVal ? 'Beralih ke Demo Mode...' : 'Beralih ke Database Real...', 'info')
                                                                    setTimeout(() => window.location.reload(), 800)
                                                                }}
                                                                activeColor="bg-amber-500"
                                                            />
                                                        </div>
                                                    </div>
                                                )}

                                                {activeFlagRows.length === 0 ? (
                                                    (activeCategory === 'system' && !flagSearch.trim()) ? null : (
                                                        <div className="col-span-full py-12 flex flex-col items-center justify-center opacity-30 gap-3 bg-[var(--color-surface-alt)]/30 rounded-3xl border border-dashed border-[var(--color-border)]">
                                                            <div className="w-16 h-16 rounded-2xl bg-[var(--color-surface-alt)] flex items-center justify-center mb-1">
                                                                <FontAwesomeIcon icon={faToggleOn} className="text-xl text-[var(--color-text-muted)] opacity-20" />
                                                            </div>
                                                            <div className="text-center">
                                                                <p className="text-[13px] font-black text-[var(--color-text)]">
                                                                    {flagSearch ? 'Tidak ada flag yang cocok' : 'Belum ada flag di kategori ini'}
                                                                </p>
                                                                <p className="text-[11px] text-[var(--color-text-muted)] mt-1 max-w-[240px] mx-auto leading-relaxed">
                                                                    {flagSearch ? 'Coba ubah kata kunci pencarian Anda.' : 'Klik tombol di bawah untuk mendaftarkan fitur standar ke kategori ini.'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    )
                                                ) : (
                                                    activeFlagRows.map(flag => (
                                                        <FlagRow
                                                            key={flag.key}
                                                            flag={flag}
                                                            cat={activeCat}
                                                            onToggle={handleToggle}
                                                            isSaving={savingKey === flag.key}
                                                            query={flagSearch}
                                                        />
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}

                    {activeTab === 'activity' && (
                        <ActivityFeed refreshKey={activityKey} flags={flags} />
                    )}

                {/* ══════════════════════════════════════════════════════
                    TAB: SIGNATURES (TANDA TANGAN)
                ══════════════════════════════════════════════════════ */}
                {activeTab === 'signatures' && (
                    <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6 items-start animate-in fade-in duration-200">
                        {/* Left: Add/Upload Signature Form */}
                        <div className="glass rounded-2xl border border-[var(--color-border)] overflow-hidden shadow-sm">
                            <div className="px-5 py-4 border-b border-[var(--color-border)] bg-gradient-to-r from-indigo-500/8 to-transparent flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 shrink-0">
                                    <FontAwesomeIcon icon={faUpload} />
                                </div>
                                <div>
                                    <p className="font-black text-[13px] text-[var(--color-text)] leading-tight">Unggah Tanda Tangan</p>
                                    <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">Tambah TTD digital guru & pengasuh</p>
                                </div>
                            </div>
                            
                            <form onSubmit={handleUploadSignature} className="p-5 space-y-4">
                                <div>
                                    <FL>Pilih Guru / Staff</FL>
                                    <select
                                        value={newSigTeacherId}
                                        onChange={e => setNewSigTeacherId(e.target.value)}
                                        className="input-field text-sm h-11 w-full"
                                        required
                                    >
                                        <option value="">-- Pilih Guru --</option>
                                        {teachersList.map(t => (
                                            <option key={t.id} value={t.id}>{t.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <FL>Peran TTD</FL>
                                    <select
                                        value={newSigRole}
                                        onChange={e => setNewSigRole(e.target.value)}
                                        className="input-field text-sm h-11 w-full"
                                        required
                                    >
                                        <option value="wali_kelas">Wali Kelas / Musyrif</option>
                                        <option value="pengasuh">Pengasuh / Direktur</option>
                                    </select>
                                </div>

                                <div>
                                    <FL>File Gambar TTD (PNG Transparan)</FL>
                                    <input
                                        ref={sigFileInputRef}
                                        type="file"
                                        accept="image/png,image/jpeg,image/webp"
                                        onChange={e => setNewSigFile(e.target.files[0])}
                                        className="input-field text-xs py-2 w-full h-auto cursor-pointer"
                                        required
                                    />
                                    <p className="text-[10px] text-[var(--color-text-muted)] mt-1.5 leading-snug">
                                        Disarankan menggunakan file **PNG transparan** agar hasil cetak rapi.
                                    </p>
                                </div>

                                <button
                                    type="submit"
                                    disabled={uploadingSig || loadingSignatures}
                                    className="w-full h-11 rounded-xl bg-[var(--color-primary)] hover:opacity-90 text-white text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-[var(--color-primary)]/15 disabled:opacity-60 transition-all"
                                >
                                    {uploadingSig ? (
                                        <>
                                            <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                                            <span>Mengunggah...</span>
                                        </>
                                    ) : (
                                        <>
                                            <FontAwesomeIcon icon={faUpload} />
                                            <span>Simpan Tanda Tangan</span>
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>

                        {/* Right: Active Signatures Grid */}
                        <div className="space-y-4 min-w-0">
                            <div className="glass rounded-2xl border border-[var(--color-border)] overflow-hidden shadow-sm">
                                <div className="px-5 py-4 border-b border-[var(--color-border)] bg-slate-50/30 dark:bg-slate-800/20 flex items-center justify-between">
                                    <div>
                                        <p className="font-black text-[13px] text-[var(--color-text)]">Daftar Tanda Tangan Digital</p>
                                        <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">Tanda tangan yang aktif digunakan di sistem raport</p>
                                    </div>
                                    <div className="px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[9px] font-black uppercase tracking-widest text-indigo-600">
                                        {signaturesList.length} Total
                                    </div>
                                </div>

                                {loadingSignatures && signaturesList.length === 0 ? (
                                    <div className="p-12 text-center">
                                        <FontAwesomeIcon icon={faSpinner} className="animate-spin text-2xl text-[var(--color-text-muted)]" />
                                        <p className="text-[11px] text-[var(--color-text-muted)] mt-2 font-bold uppercase tracking-widest">Memuat data...</p>
                                    </div>
                                ) : signaturesList.length === 0 ? (
                                    <div className="p-12 flex flex-col items-center justify-center text-center opacity-40">
                                        <div className="w-16 h-16 rounded-2xl bg-[var(--color-surface-alt)] flex items-center justify-center mb-3">
                                            <FontAwesomeIcon icon={faUpload} className="text-xl text-[var(--color-text-muted)]" />
                                        </div>
                                        <p className="text-[13px] font-black text-[var(--color-text)]">Belum ada tanda tangan digital</p>
                                        <p className="text-[11px] text-[var(--color-text-muted)] mt-1 max-w-[280px]">
                                            Silakan unggah tanda tangan digital guru/pengasuh melalui panel di sebelah kiri.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="p-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                        {signaturesList.map(sig => (
                                            <div key={sig.id} className="group relative rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-3 overflow-hidden">
                                                {/* Header card info */}
                                                <div>
                                                    <div className="flex items-center justify-between gap-2 mb-1">
                                                        <span className={`text-[9px] font-black tracking-widest uppercase px-2 py-0.5 rounded-full ${
                                                            sig.role === 'pengasuh' 
                                                                ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' 
                                                                : 'bg-indigo-500/10 text-indigo-600 border border-indigo-500/20'
                                                        }`}>
                                                            {sig.role === 'pengasuh' ? 'Pengasuh' : 'Wali Kelas'}
                                                        </span>
                                                        <span className="text-[8px] font-black text-[var(--color-text-muted)] tracking-wider">
                                                            {sig.is_active ? '● Aktif' : 'Non-aktif'}
                                                        </span>
                                                    </div>
                                                    <h4 className="text-[13px] font-black text-[var(--color-text)] truncate" title={sig.teachers?.name}>
                                                        {sig.teachers?.name || '—'}
                                                    </h4>
                                                </div>

                                                {/* Image preview area with checkerboard background */}
                                                <div 
                                                    className="w-full h-24 rounded-lg border border-[var(--color-border)]/60 bg-[var(--color-surface-alt)] flex items-center justify-center p-3 relative overflow-hidden"
                                                    style={{
                                                        backgroundImage: 'radial-gradient(rgba(0,0,0,0.05) 20%, transparent 20%), radial-gradient(rgba(0,0,0,0.05) 20%, transparent 20%)',
                                                        backgroundSize: '8px 8px',
                                                        backgroundPosition: '0 0, 4px 4px'
                                                    }}
                                                >
                                                    <img
                                                        src={sig.signature_url}
                                                        alt={`TTD ${sig.teachers?.name}`}
                                                        className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform"
                                                        crossOrigin="anonymous"
                                                    />
                                                </div>

                                                {/* Footer actions */}
                                                <div className="flex justify-between items-center pt-2 border-t border-[var(--color-border)]/50">
                                                    <span className="text-[8px] text-[var(--color-text-muted)] truncate max-w-[150px] font-mono opacity-60">
                                                        {sig.signature_url.split('/').pop()}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteSignature(sig)}
                                                        className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center"
                                                        title="Hapus Tanda Tangan"
                                                    >
                                                        <FontAwesomeIcon icon={faTrash} className="text-xs" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* ══════════════════════════════════════════════════════
                    TAB: RAPORT
                ══════════════════════════════════════════════════════ */}
                {activeTab === 'raport' && (
                    <div className="space-y-5">

                        {/* ── Section: Identitas Sekolah ── */}
                        <div className="glass rounded-2xl border border-[var(--color-border)] overflow-hidden">
                            <SectionHeader section={RAPORT_SECTIONS[0]} />
                            <div className="p-5 grid sm:grid-cols-2 gap-4">
                                <div className="sm:col-span-2">
                                    <FL>Nama Sekolah (Latin)</FL>
                                    <input
                                        type="text" value={form.school_name_id}
                                        onChange={e => set('school_name_id', e.target.value)}
                                        className="input-field font-bold text-sm h-11"
                                        placeholder="Muhammadiyah Boarding School"
                                    />
                                </div>
                                <div className="sm:col-span-2">
                                    <FL>Nama Sekolah (Arab)</FL>
                                    <input
                                        type="text" value={form.school_name_ar}
                                        onChange={e => set('school_name_ar', e.target.value)}
                                        dir="rtl" className="input-field font-bold text-sm h-11 text-right"
                                        placeholder="معهد ..."
                                    />
                                </div>
                                <div className="sm:col-span-2">
                                    <FL>Sub-judul Arab (opsional)</FL>
                                    <input
                                        type="text" value={form.school_subtitle_ar}
                                        onChange={e => set('school_subtitle_ar', e.target.value)}
                                        dir="rtl" className="input-field text-sm h-11 text-right"
                                        placeholder="المجلس التعليمي ..."
                                    />
                                </div>
                                <div className="sm:col-span-2">
                                    <FL>Alamat</FL>
                                    <input
                                        type="text" value={form.school_address}
                                        onChange={e => set('school_address', e.target.value)}
                                        className="input-field text-sm h-11"
                                    />
                                </div>
                                <div className="sm:col-span-2">
                                    <FL>URL / Path Logo</FL>
                                    <div className="flex items-center gap-3">
                                        <div className="w-11 h-11 rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface-alt)] flex items-center justify-center overflow-hidden flex-shrink-0">
                                            {form.logo_url
                                                ? <img src={form.logo_url} alt="logo" className="w-9 h-9 object-contain" onError={e => e.target.style.display = 'none'} />
                                                : <FontAwesomeIcon icon={faUpload} className="text-[var(--color-text-muted)] text-xs" />
                                            }
                                        </div>
                                        <input
                                            type="text" value={form.logo_url}
                                            onChange={e => set('logo_url', e.target.value)}
                                            className="input-field text-sm h-11 flex-1"
                                            placeholder="https://example.com/logo.png"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ── Section: Kepala Sekolah ── */}
                        <div className="glass rounded-2xl border border-[var(--color-border)] overflow-hidden">
                            <SectionHeader section={RAPORT_SECTIONS[1]} />
                            <div className="p-5 grid sm:grid-cols-2 gap-4">
                                <div>
                                    <FL>Jabatan (Indonesia)</FL>
                                    <input
                                        type="text" value={form.headmaster_title_id}
                                        onChange={e => set('headmaster_title_id', e.target.value)}
                                        className="input-field text-sm h-11"
                                    />
                                </div>
                                <div>
                                    <FL>Nama (Indonesia)</FL>
                                    <input
                                        type="text" value={form.headmaster_name_id}
                                        onChange={e => set('headmaster_name_id', e.target.value)}
                                        className="input-field font-bold text-sm h-11"
                                    />
                                </div>
                                <div>
                                    <FL>Jabatan (Arab)</FL>
                                    <input
                                        type="text" value={form.headmaster_title_ar}
                                        onChange={e => set('headmaster_title_ar', e.target.value)}
                                        dir="rtl" className="input-field text-sm h-11 text-right"
                                    />
                                </div>
                                <div>
                                    <FL>Nama (Arab)</FL>
                                    <input
                                        type="text" value={form.headmaster_name_ar}
                                        onChange={e => set('headmaster_name_ar', e.target.value)}
                                        dir="rtl" className="input-field font-bold text-sm h-11 text-right"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* ── Section: Warna & Tampilan ── */}
                        <div className="glass rounded-2xl border border-[var(--color-border)] overflow-hidden">
                            <SectionHeader section={RAPORT_SECTIONS[2]} />
                            <div className="p-5 space-y-5">
                                <div className="grid sm:grid-cols-2 gap-4">
                                    <ColorInput
                                        label="Warna Primer"
                                        value={form.report_color_primary}
                                        onChange={v => set('report_color_primary', v)}
                                    />
                                    <ColorInput
                                        label="Warna Sekunder"
                                        value={form.report_color_secondary}
                                        onChange={v => set('report_color_secondary', v)}
                                    />
                                </div>

                                {/* Preview */}
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <FontAwesomeIcon icon={faEye} className="text-[10px] text-[var(--color-text-muted)]" />
                                        <span className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest">
                                            Preview Header Raport
                                        </span>
                                    </div>
                                    <RaportPreview form={form} />
                                </div>

                                {/* WhatsApp footer */}
                                <div className="pt-4 border-t border-[var(--color-border)]">
                                    <div className="flex items-center gap-2 mb-3">
                                        <FontAwesomeIcon icon={faWhatsapp} className="text-[10px] text-emerald-500" />
                                        <span className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest">
                                            Footer WhatsApp
                                        </span>
                                    </div>
                                    <input
                                        type="text" value={form.wa_footer}
                                        onChange={e => set('wa_footer', e.target.value)}
                                        className="input-field text-sm h-11"
                                        placeholder="Nama Sekolah · Sistem Laporanmu"
                                    />
                                    <p className="text-[10px] text-[var(--color-text-muted)] mt-2 ml-0.5">
                                        Tampil sebagai: <em className="text-[var(--color-text)]">_{form.wa_footer || '...'}_</em>
                                    </p>
                                </div>
                            </div>
                        </div>

                    </div>
                )}

                {/* ══════════════════════════════════════════════════════
                    TAB: BAHAYA (DANGER ZONE)
                ══════════════════════════════════════════════════════ */}
                {activeTab === 'danger' && (
                    <div className="space-y-4">

                        {/* Warning banner */}
                        <div className="flex items-start gap-3 p-4 rounded-2xl border border-red-500/30 bg-red-500/8">
                            <div className="w-9 h-9 rounded-xl bg-red-500/20 flex items-center justify-center flex-shrink-0">
                                <FontAwesomeIcon icon={faTriangleExclamation} className="text-red-500" />
                            </div>
                            <div>
                                <p className="font-black text-sm text-red-600">Zona Berbahaya</p>
                                <p className="text-[11px] text-red-500/80 mt-0.5">
                                    Tindakan di halaman ini bersifat permanen dan tidak dapat dibatalkan. Lanjutkan dengan hati-hati.
                                </p>
                            </div>
                        </div>

                        {/* Maintenance Mode */}
                        <div className="glass rounded-2xl border border-[var(--color-border)] overflow-hidden">
                            <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--color-border)] bg-gradient-to-r from-rose-500/8 to-transparent">
                                <div className="w-9 h-9 rounded-xl bg-rose-500/10 flex items-center justify-center shrink-0">
                                    <FontAwesomeIcon icon={faGear} className="text-rose-500 text-sm" />
                                </div>
                                <div className="flex-1">
                                    <p className="font-black text-[13px] text-[var(--color-text)]">Maintenance Mode</p>
                                    <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">Nonaktifkan akses semua user kecuali developer</p>
                                </div>
                                {(() => {
                                    const mFlag = flags.find(f => f.key === 'system.maintenance')
                                    if (!mFlag) return <span className="text-[10px] text-[var(--color-text-muted)]">Flag tidak ditemukan</span>
                                    return (
                                        <div className="flex items-center gap-3 shrink-0">
                                            {mFlag.enabled && (
                                                <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-500 border border-rose-500/30 animate-pulse uppercase tracking-widest">
                                                    AKTIF
                                                </span>
                                            )}
                                            <button
                                                onClick={() => handleToggle(mFlag)}
                                                disabled={savingKey === mFlag.key}
                                                className={`h-9 px-4 rounded-xl text-[11px] font-black flex items-center gap-2 transition-all ${mFlag.enabled
                                                    ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 hover:bg-emerald-500 hover:text-white'
                                                    : 'bg-rose-500/10 text-rose-600 border border-rose-500/30 hover:bg-rose-500 hover:text-white'}`}>
                                                {savingKey === mFlag.key
                                                    ? <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                                                    : null}
                                                {mFlag.enabled ? 'Matikan Maintenance' : 'Aktifkan Maintenance'}
                                            </button>
                                        </div>
                                    )
                                })()}
                            </div>
                            <div className="px-5 py-4">
                                <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed">
                                    Saat maintenance mode aktif, seluruh user yang login akan mendapat halaman maintenance. Hanya akun dengan role <code className="bg-[var(--color-surface-alt)] px-1 rounded text-[10px]">developer</code> yang tetap bisa mengakses sistem.
                                </p>
                            </div>
                        </div>

                        {/* System Info */}
                        <div className="glass rounded-2xl border border-[var(--color-border)] overflow-hidden">
                            <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--color-border)] bg-gradient-to-r from-slate-500/8 to-transparent">
                                <div className="w-9 h-9 rounded-xl bg-slate-500/10 flex items-center justify-center shrink-0">
                                    <FontAwesomeIcon icon={faCode} className="text-slate-500 text-sm" />
                                </div>
                                <div>
                                    <p className="font-black text-[13px] text-[var(--color-text)]">Info Sistem</p>
                                    <p className="text-[11px] text-[var(--color-text-muted)]">Status dan informasi konfigurasi</p>
                                </div>
                            </div>
                            <div className="p-5 grid sm:grid-cols-2 gap-3">
                                {[
                                    { label: 'Total Feature Flags', val: `${totalFlags} flag (${totalEnabled} aktif)` },
                                    { label: 'Supabase URL', val: import.meta.env.VITE_SUPABASE_URL?.replace('https://', '').slice(0, 24) + '...' || '—' },
                                    { label: 'Environment', val: import.meta.env.MODE || 'production' },
                                    { label: 'App Version', val: import.meta.env.VITE_APP_VERSION || '1.0.0' },
                                ].map((item, i) => (
                                    <div key={i} className="p-3 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)]">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1">{item.label}</p>
                                        <p className="text-[11px] font-bold text-[var(--color-text)] font-mono">{item.val}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Reset Settings */}
                        <div className="glass rounded-2xl border border-red-500/20 overflow-hidden">
                            <div className="flex items-center gap-3 px-5 py-4 border-b border-red-500/20 bg-gradient-to-r from-red-500/8 to-transparent">
                                <div className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
                                    <FontAwesomeIcon icon={faTrash} className="text-red-500 text-sm" />
                                </div>
                                <div className="flex-1">
                                    <p className="font-black text-[13px] text-red-600">Reset Konfigurasi Raport</p>
                                    <p className="text-[11px] text-red-500/70 mt-0.5">Kembalikan semua konfigurasi raport ke nilai default</p>
                                </div>
                            </div>
                            <div className="px-5 py-4 flex items-center justify-between gap-4">
                                <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed">
                                    Ini akan menghapus nama sekolah, logo, warna, dan semua konfigurasi raport. Tidak mempengaruhi data siswa atau laporan.
                                </p>
                                <button
                                    onClick={() => {
                                        if (confirm('Reset semua konfigurasi raport ke default? Tindakan ini tidak bisa dibatalkan.')) {
                                            handleReset()
                                            addToast('Konfigurasi direset ke default', 'success')
                                        }
                                    }}
                                    className="shrink-0 h-9 px-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-600 text-[11px] font-black hover:bg-red-500 hover:text-white transition-all flex items-center gap-2">
                                    <FontAwesomeIcon icon={faTrash} className="text-[10px]" />
                                    Reset
                                </button>
                            </div>
                        </div>

                    </div>
                )}

                <div className="h-24" />
            </div>

            {/* ── Floating save bar (Raport tab only) ── */}
            <div className={`fixed bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 px-4 w-full sm:w-auto
                ${dirty && activeTab === 'raport'
                    ? 'opacity-100 translate-y-0 pointer-events-auto'
                    : 'opacity-0 translate-y-4 pointer-events-none'
                }`}
            >
                <div className="flex items-center gap-2 sm:gap-3 px-4 py-2.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur-xl shadow-2xl">
                    <FontAwesomeIcon icon={faTriangleExclamation} className="text-amber-400 shrink-0" />
                    <span className="text-[11px] text-[var(--color-text-muted)] font-medium flex-1 sm:flex-none">
                        <span className="hidden sm:inline">Ada perubahan belum disimpan</span>
                        <span className="sm:hidden">Belum disimpan</span>
                    </span>
                    <button
                        onClick={handleReset}
                        className="h-8 px-3 rounded-xl border border-[var(--color-border)] text-[var(--color-text-muted)] text-[10px] font-black hover:text-[var(--color-text)] transition-all flex items-center gap-1.5 shrink-0"
                    >
                        <FontAwesomeIcon icon={faRotateLeft} className="text-[9px]" />
                        <span className="hidden sm:inline">Reset</span>
                    </button>
                    <button
                        onClick={handleSaveRaport} disabled={saving}
                        className="h-8 px-4 rounded-xl bg-[var(--color-primary)] hover:opacity-90 text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-[var(--color-primary)]/20 disabled:opacity-60 shrink-0"
                    >
                        {saving
                            ? <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                            : <FontAwesomeIcon icon={faSave} />
                        }
                        Simpan
                    </button>
                </div>
            </div>

        </DashboardLayout>
    )
}