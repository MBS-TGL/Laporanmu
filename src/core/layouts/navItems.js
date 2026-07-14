/**
 * ─── Shared Navigation Items ──────────────────────────────────────────────────
 * Single source of truth for all navigation data.
 * Used by: Sidebar, SlimTopBar (search), BottomNav/MasterSheet (mobile).
 */
import {
    Home,
    Compass,
    Flag,
    Bed,
    HeartPulse,
    BookOpenCheck,
    QrCode,
    CalendarDays,
    FileSpreadsheet,
    Award,
    CreditCard,
    PiggyBank,
    Clipboard,
    Users,
    GraduationCap,
    School,
    BookOpen,
    Sliders,
    CalendarRange,
    UserPlus,
    LayoutDashboard,
    Newspaper,
    Bot,
    History,
    UserCog,
    Database,
    FolderOpen,
    Server,
    Settings,
    Palette,
    AlertCircle,
    AlertTriangle,
    Info,
    CheckCircle,
    HeartHandshake,
    Library,
    Boxes,
    ClipboardList,
} from "lucide-react"

// ─── Dashboard & Pusat Tugas (standalone) ────────────────────────────────────
export const DASHBOARD_ITEM = {
    to: "/dashboard", label: "Dashboard", icon: Home,
    desc: "Ringkasan utama dan statistik sistem",
    color: "bg-indigo-500/10 text-indigo-600",
}

export const TASK_CENTER_ITEM = {
    to: "/task-center", label: "Pusat Tugas", icon: ClipboardList,
    desc: "Daftar tugas harian dan persetujuan staf",
    color: "bg-amber-500/10 text-amber-600",
}

// ─── Kesantrian & Kedisiplinan (Daily Boarding Ops - High Priority) ─────────────
export const BOARDING_ITEMS = [
    { to: "/boarding/gate", label: "Portal Perizinan", icon: Compass, desc: "Manajemen Izin santri keluar & kembali ke pesantren", color: "bg-red-500/10 text-red-500" },
    { to: "/boarding/behavior", label: "Kedisiplinan & Poin", icon: Flag, desc: "Pencatatan pelanggaran, prestasi, dan akumulasi poin santri", color: "bg-orange-500/10 text-orange-500" },
    { to: "/boarding/dorms", label: "Manajemen Asrama", icon: Bed, desc: "Plotting kamar santri, kontrol kebersihan, & tugas Musyrif", color: "bg-indigo-500/10 text-indigo-600" },
    { to: "/boarding/health", label: "Klinik & Kesehatan", icon: HeartPulse, desc: "Pos Kesehatan Pesantren (Poskestren) & rekam medis santri", color: "bg-emerald-500/10 text-emerald-600" },
    { to: "/boarding/counseling", label: "Konseling & BK", icon: HeartHandshake, desc: "Sesi konseling santri, bimbingan psikologis & pembinaan mental", color: "bg-purple-500/10 text-purple-600" },
    { to: "/raport", label: "Raport Pondok", icon: FileSpreadsheet, desc: "Kelola dan cetak raport bulanan & pondok per kelas", color: "bg-blue-500/10 text-blue-600" },
]

// ─── Akademik & Keagamaan ─────────────────────────────────────────────────────
export const ACADEMIC_ITEMS = [
    { to: "/academic/tahfidz", label: "Tahfidz Al-Qur'an", icon: BookOpenCheck, desc: "Jurnal setoran hafalan Al-Qur'an, tilawah & murajaah", color: "bg-emerald-500/10 text-emerald-600" },
    { to: "/academic/attendance", label: "Presensi Santri", icon: QrCode, desc: "Absensi KBM harian via scan QR kartu santri", color: "bg-indigo-500/10 text-indigo-600" },
    { to: "/academic/schedule", label: "Jadwal Pembelajaran", icon: CalendarDays, desc: "Atur plotting jadwal KBM dan penugasan guru pengajar", color: "bg-purple-500/10 text-purple-600" },
    { to: "/academic/raport", label: "Rapor & Penilaian", icon: FileSpreadsheet, desc: "Penginputan nilai UTS/UAS dan cetak raport Kurikulum", color: "bg-indigo-500/10 text-indigo-600" },
    { to: "/academic/extracurricular", label: "Ekstrakurikuler", icon: Award, desc: "Manajemen klub, minat bakat, pramuka, silat & panahan", color: "bg-amber-500/10 text-amber-600" },
    { to: "/academic/library", label: "Perpustakaan & Kitab", icon: Library, desc: "Peminjaman buku pelajaran kurikulum & kitab-kitab kuning", color: "bg-teal-500/10 text-teal-600" },
]

// ─── Keuangan & SPP ───────────────────────────────────────────────────────────
export const FINANCE_ITEMS = [
    { to: "/finance/invoices", label: "Tagihan & SPP", icon: CreditCard, desc: "Kelola invoice SPP bulanan, uang makan, & iuran pembangunan", color: "bg-amber-500/10 text-amber-600" },
    { to: "/finance/saving", label: "Tabungan Santri", icon: PiggyBank, desc: "Sistem deposit uang saku santri untuk pencegahan kehilangan", color: "bg-indigo-500/10 text-indigo-600" },
    { to: "/finance/payments", label: "Riwayat Pembayaran", icon: Clipboard, desc: "Rekapitulasi transaksi lunas, tunggakan, & kwitansi wali santri", color: "bg-emerald-500/10 text-emerald-600" },
]

// ─── Master Data ──────────────────────────────────────────────────────────────
export const MASTER_ITEMS = [
    { to: "/master/students", label: "Data Siswa", icon: Users, desc: "Pusat database seluruh santri aktif dalam sistem", color: "bg-indigo-500/10 text-indigo-600" },
    { to: "/master/teachers", label: "Data Guru", icon: GraduationCap, desc: "Data akun pengajar, musyrif, dan staf sekolah", color: "bg-indigo-500/10 text-indigo-600" },
    { to: "/master/classes", label: "Data Kelas", icon: School, desc: "Pengaturan struktur kelas dan pembagian asrama", color: "bg-indigo-500/10 text-indigo-600" },
    { to: "/master/subjects", label: "Mata Pelajaran", icon: BookOpen, desc: "Daftar kurikulum mata pelajaran sekolah", color: "bg-indigo-500/10 text-indigo-600" },
    { to: "/master/academic-years", label: "Tahun Akademik", icon: CalendarRange, desc: "Manajemen semester dan periode kalender akademik", color: "bg-indigo-500/10 text-indigo-600" },
    { to: "/master/enrollment", label: "Pendaftaran Baru (PPDB)", icon: UserPlus, desc: "Manajemen pendaftaran dan penerimaan siswa baru", color: "bg-emerald-500/10 text-emerald-600" },
    { to: "/master/inventory", label: "Inventaris & Aset", icon: Boxes, desc: "Pencatatan sarana prasarana sekolah, inventaris asrama & kelas", color: "bg-blue-500/10 text-blue-600" },
]

// ─── Admin Panel ──────────────────────────────────────────────────────────────
export const ADMIN_ITEMS = [
    { to: "/admin", label: "Admin Dashboard", icon: LayoutDashboard, desc: "Pusat monitoring teknis & integrasi sistem", color: "bg-indigo-600/10 text-indigo-600" },
    { to: "/admin/news", label: "Manajemen Informasi", icon: Newspaper, desc: "Update Informasi & info terbaru ke landing page", color: "bg-emerald-500/10 text-emerald-600" },
    { to: "/admin/ai-insights", label: "AI Insights Center", icon: Bot, desc: "Audit perckapan AI dan analisis performa mesin", color: "bg-indigo-500/10 text-indigo-600" },
    { to: "/admin/logs", label: "Audit Logs", icon: History, desc: "Log historis aktivitas user dan perubahan data", color: "bg-purple-500/10 text-purple-600" },
    { to: "/admin/users", label: "Manajemen Pengguna", icon: UserCog, desc: "Pengaturan hak akses, role, dan kredensial user", color: "bg-rose-500/10 text-rose-600" },
    { to: "/admin/database", label: "Kesehatan Database", icon: Database, desc: "Pemantauan status database & kesehatan tabel", color: "bg-cyan-500/10 text-cyan-600" },
    { to: "/admin/storage", label: "Manajemen Penyimpanan", icon: FolderOpen, desc: "Manajemen media, foto siswa, dan berkas sistem", color: "bg-amber-500/10 text-amber-600" },
    { to: "/admin/tasks", label: "Tugas Latar Belakang", icon: Server, desc: "Status sinkronisasi background & automasi sistem", color: "bg-indigo-500/10 text-indigo-600" },
    { to: "/admin/settings", label: "Pengaturan", icon: Settings, desc: "Panel pusat pengaturan parameter aplikasi utama", color: "bg-slate-500/10 text-slate-600" },
    { to: "/admin/playground", label: "UI Playground", icon: Palette, desc: "Panduan visual komponen dan dokumentasi desain", color: "bg-pink-500/10 text-pink-600" },
]

// ─── Notification type styles ─────────────────────────────────────────────────
export const TYPE_STYLE = {
    error: { bg: 'bg-red-500/10', border: 'border-red-500/20', dot: 'bg-red-500', text: 'text-red-500', icon: AlertCircle },
    warning: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', dot: 'bg-amber-500', text: 'text-amber-500', icon: AlertTriangle },
    info: { bg: 'bg-blue-500/10', border: 'border-blue-500/20', dot: 'bg-blue-500', text: 'text-blue-500', icon: Info },
    success: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', dot: 'bg-emerald-500', text: 'text-emerald-500', icon: CheckCircle },
}

// ─── Section titles ───────────────────────────────────────────────────────────
export const SECTION_TITLES = {
    boarding: "Kesantrian",
    academic: "Akademik",
    finance: "Keuangan",
    master: "Master Data",
    admin: "Admin",
}

// ─── Navigation groups (structured for Sidebar) ──────────────────────────────
export const NAV_GROUPS = [
    {
        key: 'boarding',
        label: SECTION_TITLES.boarding,
        icon: Compass,
        items: BOARDING_ITEMS,
    },
    {
        key: 'academic',
        label: SECTION_TITLES.academic,
        icon: CalendarDays,
        items: ACADEMIC_ITEMS,
        hideForRoles: ['satpam'],
    },
    {
        key: 'finance',
        label: SECTION_TITLES.finance,
        icon: CreditCard,
        items: FINANCE_ITEMS,
        hideForRoles: ['satpam'],
    },
    {
        key: 'master',
        label: SECTION_TITLES.master,
        icon: Users,
        items: MASTER_ITEMS,
        hideForRoles: ['satpam'],
    },
    {
        key: 'admin',
        label: SECTION_TITLES.admin,
        icon: UserCog,
        items: ADMIN_ITEMS,
        requireRoles: ['developer', 'admin'],
    },
]

// ─── Feature flag filter map ──────────────────────────────────────────────────
// Maps route path → feature flag key
export const ROUTE_FLAG_MAP = {
    '/boarding/gate': 'nav.gate',
    '/boarding/behavior': 'nav.poin',
    '/boarding/dorms': 'nav.dorms',
    '/boarding/health': 'nav.health',
    '/boarding/counseling': 'nav.counseling',
    '/raport': 'module.raport',
    '/academic/tahfidz': 'nav.tahfidz',
    '/academic/extracurricular': 'nav.extracurricular',
    '/finance/saving': 'nav.saving',
    '/master/students': 'nav.students',
    '/master/teachers': 'nav.teachers',
    '/master/classes': 'nav.classes',
    '/master/academic-years': 'nav.academic_years',
}

/**
 * Filter nav items based on feature flags and role.
 * @param {Array} items - Array of nav items
 * @param {Object} flags - Feature flags map
 * @param {string} role - User role (lowercase)
 * @returns {Array} Filtered items
 */
export function filterNavItems(items, flags = {}, role = '') {
    return items.filter(item => {
        // Check feature flag
        const flagKey = ROUTE_FLAG_MAP[item.to]
        if (flagKey && flags[flagKey] === false) return false

        // Satpam can only see gate in boarding/kesantrian items
        if (role === 'satpam') {
            if (item.to === '/boarding/gate') return true
            // Hide non-gate items in Kesantrian
            if (['/boarding/behavior', '/boarding/dorms', '/boarding/health', '/boarding/counseling', '/raport'].includes(item.to)) return false
        }

        return true
    })
}
