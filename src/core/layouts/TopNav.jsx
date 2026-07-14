import { useEffect, useRef, useState, useCallback } from "react"
import { NavLink, useNavigate } from "react-router-dom"
import { createPortal } from "react-dom"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import {
    faBell, faChevronDown, faMoon, faSun, faGear, faRightFromBracket,
    faLayerGroup, faXmark, faArrowRight, faRotateRight, faCircleExclamation,
    faTriangleExclamation, faCircleInfo, faCircleCheck,
    faClipboardList, faCalendarWeek, faShieldHalved,
    faUsers, faChalkboardTeacher, faSchool, faExclamationTriangle, faCalendarAlt,
    faPersonWalkingArrowRight, faUserGear, faClockRotateLeft, faScrewdriverWrench,
    faDatabase, faBoxArchive, faServer, faPalette, faNewspaper, faRobot, faCube,
    faBook, faUserPlus, faCalendarDays, faQrcode, faFileInvoice, faMoneyBillWave, faWallet
} from "@fortawesome/free-solid-svg-icons"
import { useTheme, useAuth, useFeatureFlags, useLanguage } from "@context"
import { useNotifications, translateNotification } from "@hooks/useNotifications"

// ─── Avatar component — handles image error state properly ────────────────────
// Gradient hanya muncul saat tidak ada foto. Kalau foto gagal load,
// otomatis fallback ke inisial tanpa gradient bocor.
function Avatar({ url, name, size = "w-10 h-10", textSize = "text-base", rounded = "rounded-2xl" }) {
    const [imgError, setImgError] = useState(false)
    const letter = name?.charAt(0)?.toUpperCase() || 'U'
    const showImg = url && !imgError

    return (
        <div className={`${size} ${rounded} overflow-hidden shrink-0 flex items-center justify-center font-black text-white
            ${showImg ? 'bg-[var(--color-surface-alt)]' : 'bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)]'}`}>
            {showImg
                ? <img src={url} alt={name} className="w-full h-full object-cover" onError={() => setImgError(true)} />
                : <span className={textSize}>{letter}</span>
            }
        </div>
    )
}

// ─── Portal container helper ──────────────────────────────────────────────────
// Singleton di module-level — dibuat SEKALI saat module di-load, tidak pernah
// dihapus. Mencegah removeChild crash di React 18 Strict Mode / concurrent render.
const _portalContainers = {}
function getPortalContainer(id) {
    if (!_portalContainers[id]) {
        let el = document.getElementById(id)
        if (!el) {
            el = document.createElement('div')
            el.id = id
            document.body.appendChild(el)
        }
        _portalContainers[id] = el
    }
    return _portalContainers[id]
}

const MASTER_ITEMS = [
    { to: "/master/students", label: "Data Siswa", icon: faUsers, desc: "Pusat database seluruh santri aktif dalam sistem" },
    { to: "/master/teachers", label: "Data Guru", icon: faChalkboardTeacher, desc: "Data akun pengajar, musyrif, dan staf sekolah" },
    { to: "/master/classes", label: "Data Kelas", icon: faSchool, desc: "Pengaturan struktur kelas dan pembagian asrama" },
    { to: "/master/subjects", label: "Mata Pelajaran", icon: faBook, desc: "Daftar kurikulum mata pelajaran sekolah" },
    { to: "/master/academic-years", label: "Tahun Pelajaran", icon: faCalendarAlt, desc: "Manajemen semester dan periode kalender akademik" },
    { to: "/master/enrollment", label: "PSB / Enrollment", icon: faUserPlus, desc: "Manajemen pendaftaran dan penerimaan siswa baru", color: "bg-emerald-500/10 text-emerald-600" },
]

const ACADEMIC_ITEMS = [
    { to: "/academic/attendance", label: "Presensi Siswa", icon: faQrcode, desc: "Absensi real-time via scan QR kartu siswa", color: "bg-indigo-500/10 text-indigo-600" },
    { to: "/academic/schedule", label: "Jadwal Pelajaran", icon: faCalendarDays, desc: "Atur plotting jadwal KBM dan guru pengajar", color: "bg-purple-500/10 text-purple-600" },
    { to: "/academic/raport", label: "E-Rapor & Nilai", icon: faFileInvoice, desc: "Input nilai harian, ujian, dan cetak raport", color: "bg-emerald-500/10 text-emerald-600" },
]

const FINANCE_ITEMS = [
    { to: "/finance/invoices", label: "Tagihan SPP", icon: faMoneyBillWave, desc: "Kelola tagihan bulanan dan iuran sekolah", color: "bg-amber-500/10 text-amber-600" },
    { to: "/finance/payments", label: "Riwayat Bayar", icon: faWallet, desc: "Rekapitulasi pembayaran dan tunggakan wali", color: "bg-emerald-500/10 text-emerald-600" },
]

const REPORTS_ITEMS = [
    { to: "/boarding/gate", label: "Portal Keluar Masuk", icon: faPersonWalkingArrowRight, desc: "Manajemen Izin Keluar Masuk Santri", color: "bg-red-500/10 text-red-500" },
    { to: "/raport", label: "Raport Pondok", icon: faClipboardList, desc: "Rekapitulasi Raport Bulanan & Pondok Santri", color: "bg-indigo-500/10 text-indigo-600" },
    { to: "/attendance", label: "Absensi Bulanan", icon: faCalendarWeek, desc: "Rekapitulasi Absensi Santri", color: "bg-emerald-500/10 text-emerald-600" },
    { to: "/boarding/behavior", label: "Kedisiplinan & Poin", icon: faShieldHalved, desc: "Rekapitulasi Pelanggaran & Prestasi Santri", color: "bg-orange-500/10 text-orange-500" },
]

// Admin-only items — hanya tampil untuk developer & admin
const ADMIN_ITEMS = [
    { to: "/admin", label: "Admin Dashboard Center", icon: faCube, desc: "Pusat monitoring teknis & integrasi sistem", color: "bg-indigo-600/10 text-indigo-600" },
    { to: "/admin/news", label: "Manajemen Informasi", icon: faNewspaper, desc: "Update Informasi & info terbaru ke landing page", color: "bg-emerald-500/10 text-emerald-600" },
    { to: "/admin/ai-insights", label: "AI Insights Center", icon: faRobot, desc: "Audit perckapan AI dan analisis performa mesin", color: "bg-indigo-500/10 text-indigo-600" },
    { to: "/admin/logs", label: "Audit Logs", icon: faClockRotateLeft, desc: "Log historis aktivitas user dan perubahan data", color: "bg-purple-500/10 text-purple-600" },
    { to: "/admin/users", label: "User Management", icon: faUserGear, desc: "Pengaturan hak akses, role, dan kredensial user", color: "bg-rose-500/10 text-rose-600" },
    { to: "/admin/database", label: "Database Health", icon: faDatabase, desc: "Pemantauan status database & kesehatan tabel", color: "bg-cyan-500/10 text-cyan-600" },
    { to: "/admin/storage", label: "Storage Manager", icon: faBoxArchive, desc: "Manajemen media, foto siswa, dan berkas sistem", color: "bg-amber-500/10 text-amber-600" },
    { to: "/admin/tasks", label: "Background Tasks", icon: faServer, desc: "Status sinkronisasi background & automasi sistem", color: "bg-indigo-500/10 text-indigo-600" },
    { to: "/admin/settings", label: "Pengaturan", icon: faScrewdriverWrench, desc: "Panel pusat pengaturan parameter aplikasi utama", color: "bg-slate-500/10 text-slate-600" },
    { to: "/admin/playground", label: "UI Playground", icon: faPalette, desc: "Panduan visual komponen dan dokumentasi desain", color: "bg-pink-500/10 text-pink-600" },
]

// ── Warna & icon per type notifikasi
const TYPE_STYLE = {
    error: { bg: 'bg-red-500/10', border: 'border-red-500/20', dot: 'bg-red-500', text: 'text-red-500', icon: faCircleExclamation },
    warning: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', dot: 'bg-amber-500', text: 'text-amber-500', icon: faTriangleExclamation },
    info: { bg: 'bg-blue-500/10', border: 'border-blue-500/20', dot: 'bg-blue-500', text: 'text-blue-500', icon: faCircleInfo },
    success: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', dot: 'bg-emerald-500', text: 'text-emerald-500', icon: faCircleCheck },
}

// Badge merah di atas icon bell
function NotifBadge({ count }) {
    if (!count) return null
    return (
        <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-0.5 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center leading-none pointer-events-none">
            {count > 9 ? '9+' : count}
        </span>
    )
}

// Satu baris notifikasi di panel
function NotifItem({ notif, onDismiss, onNavigate }) {
    const { t } = useLanguage()
    const s = TYPE_STYLE[notif.type] || TYPE_STYLE.info
    return (
        <div className={`group relative rounded-xl border p-3 transition-all ${s.bg} ${s.border}`}>
            <div className="flex items-start gap-2.5">
                <div className={`mt-0.5 text-sm shrink-0 ${s.text}`}>
                    <FontAwesomeIcon icon={s.icon} />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-black text-[var(--color-text)] leading-tight">{notif.title}</p>
                    <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5 leading-snug">{notif.body}</p>
                    {notif.action && (
                        <button
                            onClick={() => onNavigate(notif.action.route)}
                            aria-label={notif.action.label}
                            className={`mt-1.5 text-[9px] font-black uppercase tracking-widest flex items-center gap-1 ${s.text} hover:opacity-70 transition-opacity`}
                        >
                            {notif.action.label} <FontAwesomeIcon icon={faArrowRight} className="text-[7px]" />
                        </button>
                    )}
                </div>
                <button
                    onClick={() => onDismiss(notif.id)}
                    className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded-md hover:bg-[var(--color-surface)] text-[var(--color-text-muted)] text-[9px]"
                    title={t('notif.close')}
                    aria-label={t('notif.close')}
                >
                    <FontAwesomeIcon icon={faXmark} />
                </button>
            </div>
        </div>
    )
}

// Panel dropdown notifikasi
// KEY FIX: menerima isOpen prop — portal selalu di-render, content dikondisikan di dalam.
// Pola ini mencegah removeChild crash saat concurrent unmount.
function NotifPanel({ isOpen, notifications, loading, refreshing, onDismiss, onRefresh, onNavigate, isMobile, anchorRef, panelRef }) {
    const { t } = useLanguage()
    const errCount = notifications.filter(n => n.type === 'error').length
    const warnCount = notifications.filter(n => n.type === 'warning').length
    const container = getPortalContainer('portal-notif')

    // Hitung posisi SAAT render (sync) — tidak ada useEffect, tidak ada glitch
    let style = {}
    if (!isMobile && anchorRef?.current) {
        const rect = anchorRef.current.getBoundingClientRect()
        style = {
            position: 'fixed',
            top: rect.bottom + 12,
            right: window.innerWidth - rect.right - 8, // Offset 8px to the right for better balance
            width: 340,
        }
    }

    const inner = (
        <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[0_20px_50px_rgba(0,0,0,0.1)] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
                <div>
                    <p className="text-[12px] font-black text-[var(--color-text)]">{t('notif.header')}</p>
                    {!loading && notifications.length > 0 && (
                        <p className="text-[9px] text-[var(--color-text-muted)] mt-0.5">
                            {errCount > 0 && <span className="text-red-500 font-bold">{errCount} {t('notif.need_action')} · </span>}
                            {warnCount > 0 && <span className="text-amber-500 font-bold">{warnCount} {t('notif.warning')} · </span>}
                            {notifications.length} {t('notif.total')}
                        </p>
                    )}
                </div>
                <button
                    onClick={onRefresh}
                    title={t('notif.refresh')}
                    aria-label={t('notif.refresh')}
                    className={`p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] transition text-xs ${refreshing ? 'animate-spin pointer-events-none' : ''}`}
                >
                    <FontAwesomeIcon icon={faRotateRight} />
                </button>
            </div>

            {/* Body */}
            <div className="max-h-[60vh] overflow-y-auto p-3 space-y-2">
                {loading ? (
                    <div className="py-8 flex flex-col items-center gap-2 text-[var(--color-text-muted)]">
                        <FontAwesomeIcon icon={faRotateRight} className="animate-spin text-lg" />
                        <p className="text-[10px]">{t('notif.loading')}</p>
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="py-8 flex flex-col items-center gap-2 text-[var(--color-text-muted)]">
                        <span className="text-2xl">🎉</span>
                        <p className="text-[11px] font-bold">{t('notif.empty_title')}</p>
                        <p className="text-[9px] text-center">{t('notif.empty_desc')}</p>
                    </div>
                ) : (
                    notifications.map(n => (
                        <NotifItem
                            key={n.id}
                            notif={n}
                            onDismiss={onDismiss}
                            onNavigate={onNavigate}
                        />
                    ))
                )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && !loading && (
                <div className="px-4 py-2.5 border-t border-[var(--color-border)] flex justify-end">
                    <button
                        onClick={() => notifications.forEach(n => onDismiss(n.id))}
                        className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition"
                    >
                        {t('notif.close_all')}
                    </button>
                </div>
            )}
        </div>
    )

    // Mobile: full-width di bawah header
    if (isMobile) {
        return createPortal(
            !isOpen ? null : (
                <div ref={panelRef} className="fixed inset-x-0 top-[72px] z-[9999] px-3">
                    {inner}
                </div>
            ),
            container
        )
    }

    // Desktop
    return createPortal(
        !isOpen ? null : (
            <div ref={panelRef} style={{ ...style, zIndex: 9999 }}>{inner}</div>
        ),
        container
    )
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function TopNav({ title, subtitle }) {
    const { isDark, toggleTheme } = useTheme()
    const { profile, signOut } = useAuth()
    const { flags } = useFeatureFlags()
    const navigate = useNavigate()
    const { notifications, loading, refreshing, dismiss, refresh } = useNotifications()
    const { t } = useLanguage()

    // ── Filter nav items by feature flags
    // nav.X flags control visibility; default true if flag not yet loaded
    const visibleReportsItems = REPORTS_ITEMS.filter(it => {
        if (it.to === '/boarding/gate') return flags['nav.gate'] !== false
        if (it.to === '/raport') return flags['nav.raport'] !== false
        if (it.to === '/attendance') return flags['nav.absensi'] !== false
        if (it.to === '/boarding/behavior') return flags['nav.poin'] !== false
        return true
    })
    // Satpam: only show gate
    const role = profile?.role?.toLowerCase()
    const isSatpam = role === 'satpam'
    const filteredReportsItems = isSatpam
        ? visibleReportsItems.filter(it => it.to === '/boarding/gate')
        : visibleReportsItems

    // Filter master items by nav flags
    const filteredMasterItems = MASTER_ITEMS.filter(it => {
        if (it.to === '/master/students') return flags['nav.students'] !== false
        if (it.to === '/master/teachers') return flags['nav.teachers'] !== false
        if (it.to === '/master/classes') return flags['nav.classes'] !== false
        if (it.to === '/master/academic-years') return flags['nav.academic_years'] !== false
        return true
    })

    const [masterOpen, setMasterOpen] = useState(false)
    const [academicOpen, setAcademicOpen] = useState(false)
    const [financeOpen, setFinanceOpen] = useState(false)
    const [reportsOpen, setReportsOpen] = useState(false)
    const [adminOpen, setAdminOpen] = useState(false)
    const [profileOpen, setProfileOpen] = useState(false)
    const [notifOpen, setNotifOpen] = useState(false)

    const masterRef = useRef(null)
    const academicRef = useRef(null)
    const financeRef = useRef(null)
    const reportsRef = useRef(null)
    const adminRef = useRef(null)
    const mobileProfileRef = useRef(null)
    const desktopProfileRef = useRef(null)
    const notifBtnRef = useRef(null)
    const notifPanelRef = useRef(null)

    // Jumlah notif yang butuh perhatian (error + warning)
    const urgentCount = notifications.filter(n => n.type === 'error' || n.type === 'warning').length
    const totalCount = notifications.length

    // Close on outside click
    useEffect(() => {
        const onClick = (e) => {
            if (masterRef.current && !masterRef.current.contains(e.target)) setMasterOpen(false)
            if (academicRef.current && !academicRef.current.contains(e.target)) setAcademicOpen(false)
            if (financeRef.current && !financeRef.current.contains(e.target)) setFinanceOpen(false)
            if (reportsRef.current && !reportsRef.current.contains(e.target)) setReportsOpen(false)
            if (adminRef.current && !adminRef.current.contains(e.target)) setAdminOpen(false)

            const isOutsideMobile = mobileProfileRef.current && !mobileProfileRef.current.contains(e.target)
            const isOutsideDesktop = desktopProfileRef.current && !desktopProfileRef.current.contains(e.target)
            if (isOutsideMobile && isOutsideDesktop) setProfileOpen(false)

            const isOutsideNotifBtn = notifBtnRef.current && !notifBtnRef.current.contains(e.target)
            const isOutsideNotifPanel = notifPanelRef.current && !notifPanelRef.current.contains(e.target)
            if (isOutsideNotifBtn && isOutsideNotifPanel) setNotifOpen(false)
        }
        window.addEventListener("mousedown", onClick)
        return () => window.removeEventListener("mousedown", onClick)
    }, [])

    const handleNotifNavigate = useCallback((route) => {
        setNotifOpen(false)
        navigate(route)
    }, [navigate])

    const tabClass = ({ isActive }) =>
        `px-3 py-2 rounded-xl text-sm font-bold transition
     ${isActive ? "bg-[var(--color-surface)] shadow-sm text-[var(--color-text)]" : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-white/50 dark:hover:bg-white/5"}`

    const avatarLetter = profile?.name?.charAt(0) || "U"

    const today = new Date().toLocaleDateString("id-ID", {
        weekday: "long", year: "numeric", month: "long", day: "numeric",
    })

    // Deteksi mobile (< 1024px = lg breakpoint Tailwind)
    const [isMobileScreen, setIsMobileScreen] = useState(
        typeof window !== 'undefined' ? window.innerWidth < 1024 : false
    )
    useEffect(() => {
        const handler = () => setIsMobileScreen(window.innerWidth < 1024)
        window.addEventListener('resize', handler)
        return () => window.removeEventListener('resize', handler)
    }, [])

    // Bell button — hanya tombol, panel dirender sekali di luar
    const BellButton = () => {
        const { t } = useLanguage()
        return (
            <div className="relative" ref={notifBtnRef}>
                <button
                    onClick={() => setNotifOpen(v => !v)}
                    className={`relative p-2.5 rounded-xl transition
                        ${notifOpen
                            ? 'bg-[var(--color-surface-alt)] text-[var(--color-primary)]'
                            : 'hover:bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] hover:text-[var(--color-primary)]'}
                        ${urgentCount > 0 ? 'animate-[bellShake_2s_ease-in-out_infinite]' : ''}`}
                    aria-label={t('notif.header')}
                    title={t('notif.header')}
                    type="button"
                >
                    <FontAwesomeIcon icon={faBell} />
                    <NotifBadge count={urgentCount || (totalCount > 0 ? totalCount : 0)} />
                </button>
            </div>
        )
    }

    // ── Hide on Scroll Logic ──
    const [isVisible, setIsVisible] = useState(true)

    useEffect(() => {
        let lastY = window.scrollY
        const handleScroll = () => {
            const currentY = window.scrollY

            // Tampilkan jika:
            // 1. Scroll ke atas
            // 2. Masih di paling atas (< 50px)
            if (currentY < lastY || currentY < 50) {
                setIsVisible(true)
            } else if (currentY > lastY && currentY > 100) {
                // Sembunyikan jika scroll ke bawah > 100px
                setIsVisible(false)
            }

            lastY = currentY
        }

        window.addEventListener("scroll", handleScroll, { passive: true })
        return () => window.removeEventListener("scroll", handleScroll)
    }, [])

    return (
        <>
            {/* Animasi bell shake untuk notif urgent */}
            <style>{`
                @keyframes bellShake {
                    0%, 85%, 100% { transform: rotate(0deg); }
                    88% { transform: rotate(-12deg); }
                    92% { transform: rotate(12deg); }
                    96% { transform: rotate(-8deg); }
                    98% { transform: rotate(8deg); }
                }
            `}</style>

            <header
                className={`sticky top-0 z-40 transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1)
                ${!isVisible ? 'lg:translate-y-0 -translate-y-full opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'}`}
            >
                <div className="mx-auto max-w-[1800px] px-3 sm:px-4 lg:px-6 pt-3">

                    {/* ===================== */}
                    {/* MOBILE */}
                    {/* ===================== */}
                    <div className="lg:hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/70 backdrop-blur-md shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
                        <div className="flex items-start justify-between px-4 py-3">
                            {/* Left */}
                            <div className="min-w-0">
                                <div className="text-base font-extrabold text-[var(--color-text)] truncate">
                                    {title || "Dashboard"}
                                </div>
                                <div className="text-[10px] font-bold tracking-widest uppercase text-[var(--color-text-muted)]">
                                    {subtitle || today}
                                </div>
                            </div>

                            {/* Right: Bell + Profile */}
                            <div className="flex items-center gap-1.5">
                                <BellButton />

                                <button
                                    onClick={toggleTheme}
                                    aria-label={isDark ? "Aktifkan Mode Terang" : "Aktifkan Mode Gelap"}
                                    className="p-2.5 rounded-xl hover:bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition"
                                    type="button"
                                >
                                    <FontAwesomeIcon icon={isDark ? faSun : faMoon} />
                                </button>

                                <div className="relative flex-shrink-0" ref={mobileProfileRef}>
                                    <button
                                        onClick={() => setProfileOpen(v => !v)}
                                        aria-label="Buka Menu Profil"
                                        className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-2xl hover:bg-[var(--color-surface-alt)] transition border border-transparent hover:border-[var(--color-border)]"
                                        type="button"
                                    >
                                        <Avatar url={profile?.avatar_url} name={profile?.name} />
                                        <FontAwesomeIcon
                                            icon={faChevronDown}
                                            className={`text-xs text-[var(--color-text-muted)] transition-transform ${profileOpen ? "rotate-180" : ""}`}
                                        />
                                    </button>

                                    {profileOpen && (
                                        <div className="absolute right-0 mt-2 w-52 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl overflow-hidden">
                                            <button
                                                onClick={() => { setProfileOpen(false); navigate("/settings") }}
                                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--color-surface-alt)] transition font-bold text-sm text-[var(--color-text)]"
                                                type="button"
                                            >
                                                <FontAwesomeIcon icon={faGear} /> Settings
                                            </button>
                                            <button
                                                onClick={async () => { setProfileOpen(false); await signOut(); navigate("/login") }}
                                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--color-surface-alt)] transition font-bold text-sm text-red-600"
                                                type="button"
                                            >
                                                <FontAwesomeIcon icon={faRightFromBracket} /> Logout
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ===================== */}
                    {/* DESKTOP */}
                    {/* ===================== */}
                    <div className="hidden lg:block rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/85 backdrop-blur-xl shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
                        <div className="flex items-center justify-between px-4 py-3">

                            {/* Left: Logo */}
                            <div className="flex items-center gap-2">
                                <div
                                    className="w-9 h-9 rounded-2xl bg-indigo-600 text-white font-black flex items-center justify-center shrink-0"
                                    aria-label="Laporanmu Logo"
                                    role="img"
                                >
                                    <span aria-hidden="true">L</span>
                                </div>

                                <div>
                                    <p className="text-sm font-extrabold text-[var(--color-text)] leading-tight">{title || "Dashboard"}</p>
                                    <p className="text-[9px] font-bold tracking-widest uppercase text-[var(--color-text-muted)]">{subtitle || today}</p>
                                </div>
                            </div>
                            <div className="flex justify-center">
                                <nav className="flex items-center gap-1.5 bg-[var(--color-surface-alt)]/60 rounded-2xl p-1.5">
                                    <NavLink to="/dashboard" className={tabClass}>Dashboard</NavLink>
                                    <div className="relative" ref={academicRef}>
                                        <button onClick={() => setAcademicOpen(v => !v)} className={`px-3 py-2 rounded-xl text-sm font-bold transition flex items-center gap-2 ${academicOpen ? "bg-[var(--color-surface)] shadow-sm text-[var(--color-text)]" : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-white/50 dark:hover:bg-white/5"}`} type="button">
                                            <FontAwesomeIcon icon={faCalendarAlt} className="opacity-70" /> Akademik <FontAwesomeIcon icon={faChevronDown} className={`text-[10px] transition-transform ${academicOpen ? "rotate-180" : ""}`} />
                                        </button>
                                        {academicOpen && (
                                            <div className="absolute left-0 mt-2 w-64 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
                                                <div className="px-3 py-2 text-[10px] font-black tracking-widest text-[var(--color-text-muted)] uppercase border-b border-[var(--color-border)]">Mesin Akademik</div>
                                                <div className="p-2">
                                                    {ACADEMIC_ITEMS.map(it => (
                                                        <button key={it.to} onClick={() => { setAcademicOpen(false); navigate(it.to) }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--color-surface-alt)] transition group" type="button">
                                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${it.color}`}><FontAwesomeIcon icon={it.icon} className="text-xs" /></div>
                                                            <div className="text-left"><p className="text-[11px] font-black text-[var(--color-text)] leading-tight">{it.label}</p><p className="text-[9px] text-[var(--color-text-muted)] font-medium leading-tight mt-0.5">{it.desc}</p></div>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="relative" ref={financeRef}>
                                        <button onClick={() => setFinanceOpen(v => !v)} className={`px-3 py-2 rounded-xl text-sm font-bold transition flex items-center gap-2 ${financeOpen ? "bg-[var(--color-surface)] shadow-sm text-[var(--color-text)]" : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-white/50 dark:hover:bg-white/5"}`} type="button">
                                            <FontAwesomeIcon icon={faMoneyBillWave} className="opacity-70" /> Keuangan <FontAwesomeIcon icon={faChevronDown} className={`text-[10px] transition-transform ${financeOpen ? "rotate-180" : ""}`} />
                                        </button>
                                        {financeOpen && (
                                            <div className="absolute left-0 mt-2 w-64 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
                                                <div className="px-3 py-2 text-[10px] font-black tracking-widest text-[var(--color-text-muted)] uppercase border-b border-[var(--color-border)]">Manajemen Keuangan</div>
                                                <div className="p-2">
                                                    {FINANCE_ITEMS.map(it => (
                                                        <button key={it.to} onClick={() => { setFinanceOpen(false); navigate(it.to) }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--color-surface-alt)] transition group" type="button">
                                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${it.color}`}><FontAwesomeIcon icon={it.icon} className="text-xs" /></div>
                                                            <div className="text-left"><p className="text-[11px] font-black text-[var(--color-text)] leading-tight">{it.label}</p><p className="text-[9px] text-[var(--color-text-muted)] font-medium leading-tight mt-0.5">{it.desc}</p></div>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="relative" ref={reportsRef}>
                                        <button onClick={() => setReportsOpen(v => !v)} className={`px-3 py-2 rounded-xl text-sm font-bold transition flex items-center gap-2 ${reportsOpen ? "bg-[var(--color-surface)] shadow-sm text-[var(--color-text)]" : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-white/50 dark:hover:bg-white/5"}`} type="button">
                                            <FontAwesomeIcon icon={faClipboardList} className="opacity-70" /> Laporan <FontAwesomeIcon icon={faChevronDown} className={`text-[10px] transition-transform ${reportsOpen ? "rotate-180" : ""}`} />
                                        </button>
                                        {reportsOpen && (
                                            <div className="absolute left-0 mt-2 w-64 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
                                                <div className="px-3 py-2 text-[10px] font-black tracking-widest text-[var(--color-text-muted)] uppercase border-b border-[var(--color-border)]">Rekapitulasi</div>
                                                <div className="p-2">
                                                    {REPORTS_ITEMS.map(it => (
                                                        <button key={it.to} onClick={() => { setReportsOpen(false); navigate(it.to) }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--color-surface-alt)] transition group" type="button">
                                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${it.color}`}><FontAwesomeIcon icon={it.icon} className="text-xs" /></div>
                                                            <div className="text-left"><p className="text-[11px] font-black text-[var(--color-text)] leading-tight">{it.label}</p><p className="text-[9px] text-[var(--color-text-muted)] font-medium leading-tight mt-0.5">{it.desc}</p></div>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="relative" ref={masterRef}>
                                        <button onClick={() => setMasterOpen(v => !v)} className={`px-3 py-2 rounded-xl text-sm font-bold transition flex items-center gap-2 ${masterOpen ? "bg-[var(--color-surface)] shadow-sm text-[var(--color-text)]" : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-white/50 dark:hover:bg-white/5"}`} type="button">
                                            <FontAwesomeIcon icon={faLayerGroup} className="opacity-70" /> Master <FontAwesomeIcon icon={faChevronDown} className={`text-[10px] transition-transform ${masterOpen ? "rotate-180" : ""}`} />
                                        </button>
                                        {masterOpen && (
                                            <div className="absolute left-0 mt-2 w-64 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
                                                <div className="px-3 py-2 text-[10px] font-black tracking-widest text-[var(--color-text-muted)] uppercase border-b border-[var(--color-border)]">Pusat Data Master</div>
                                                <div className="p-2">
                                                    {MASTER_ITEMS.map(it => (
                                                        <button key={it.to} onClick={() => { setMasterOpen(false); navigate(it.to) }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--color-surface-alt)] transition group" type="button">
                                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-indigo-500/10 text-indigo-600`}><FontAwesomeIcon icon={it.icon} className="text-xs" /></div>
                                                            <div className="text-left"><p className="text-[11px] font-black text-[var(--color-text)] leading-tight">{it.label}</p><p className="text-[9px] text-[var(--color-text-muted)] font-medium leading-tight mt-0.5">{it.desc}</p></div>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Admin Dropdown — developer & admin only */}
                                    {['developer', 'admin'].includes(profile?.role?.toLowerCase()) && (
                                        <div className="relative" ref={adminRef}>
                                            <button
                                                onClick={() => setAdminOpen(v => !v)}
                                                aria-label="Menu Admin"
                                                className={`px-3 py-2 rounded-xl text-sm font-bold transition flex items-center gap-2
                                                    ${adminOpen
                                                        ? "bg-[var(--color-surface)] shadow-sm text-[var(--color-text)]"
                                                        : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-white/50 dark:hover:bg-white/5"}`}
                                                type="button"
                                            >
                                                <FontAwesomeIcon icon={faUserGear} />
                                                Admin
                                                <FontAwesomeIcon icon={faChevronDown} className={`text-xs transition-transform ${adminOpen ? "rotate-180" : ""}`} />
                                            </button>

                                            {adminOpen && (
                                                <div className="absolute right-0 lg:left-auto lg:right-0 mt-2 w-[calc(100vw-2rem)] sm:w-[480px] rounded-[2rem] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 origin-top-right z-50">
                                                    <div className="px-5 py-3.5 text-[10px] font-black tracking-[0.2em] text-[var(--color-text-muted)] uppercase border-b border-[var(--color-border)]/50 bg-[var(--color-surface-alt)]/30">
                                                        Infrastructure & Control
                                                    </div>
                                                    <div className="p-3 grid grid-cols-2 gap-1.5">
                                                        {ADMIN_ITEMS.map((it, idx) => (
                                                            <button
                                                                key={it.to}
                                                                onClick={() => { setAdminOpen(false); navigate(it.to) }}
                                                                className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-[var(--color-surface-alt)] transition-all group border border-transparent hover:border-[var(--color-border)] ${idx === 0 ? 'col-span-2 bg-indigo-500/5 !border-indigo-500/20' : ''}`}
                                                                type="button"
                                                            >
                                                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shrink-0 ${it.color} shadow-sm`}>
                                                                    <FontAwesomeIcon icon={it.icon} className="text-sm" />
                                                                </div>
                                                                <div className="text-left min-w-0">
                                                                    <p className={`text-[11px] font-black text-[var(--color-text)] leading-tight truncate ${idx === 0 ? 'text-indigo-600' : ''}`}>{it.label}</p>
                                                                    <p className="text-[9px] text-[var(--color-text-muted)] font-bold leading-tight mt-0.5 opacity-60 line-clamp-1">{it.desc}</p>
                                                                </div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                    <div className="px-5 py-3 bg-[var(--color-surface-alt)]/50 flex justify-between items-center border-t border-[var(--color-border)]/50">
                                                        <span className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">LaporanMu Engine</span>
                                                        <div className="flex gap-1">
                                                            <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                                                            <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">All Systems Operational</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Divider */}
                                    <div className="w-px h-5 bg-[var(--color-border)] mx-1 opacity-50" />

                                    <div className="flex items-center">
                                        <BellButton />
                                        <button
                                            onClick={toggleTheme}
                                            aria-label={isDark ? "Aktifkan Mode Terang" : "Aktifkan Mode Gelap"}
                                            className="p-2.5 rounded-xl hover:bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition"
                                            type="button"
                                        >
                                            <FontAwesomeIcon icon={isDark ? faSun : faMoon} />
                                        </button>
                                    </div>
                                </nav>
                            </div>

                            {/* Right: Profile */}
                            <div className="flex items-center justify-end">
                                {/* Profile dropdown */}
                                <div className="relative" ref={desktopProfileRef}>
                                    <button
                                        onClick={() => setProfileOpen(v => !v)}
                                        aria-label="Menu Profil"
                                        className="flex items-center gap-3 pl-2 pr-3 py-1.5 rounded-2xl hover:bg-[var(--color-surface-alt)] transition border border-transparent hover:border-[var(--color-border)]"
                                        type="button"
                                    >
                                        <Avatar url={profile?.avatar_url} name={profile?.name} />
                                        <div className="hidden sm:flex flex-col items-start leading-tight">
                                            <span className="text-sm font-extrabold text-[var(--color-text)]">{profile?.name || "User"}</span>
                                            <span className="text-[10px] font-bold tracking-widest uppercase text-[var(--color-text-muted)]">{profile?.role || "Staff"}</span>
                                        </div>
                                        <FontAwesomeIcon
                                            icon={faChevronDown}
                                            className={`text-xs text-[var(--color-text-muted)] transition-transform ${profileOpen ? "rotate-180" : ""}`}
                                        />
                                    </button>

                                    {profileOpen && (
                                        <div className="absolute right-0 mt-2 w-52 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl overflow-hidden">
                                            <button
                                                onClick={() => { setProfileOpen(false); navigate("/settings") }}
                                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--color-surface-alt)] transition font-bold text-sm text-[var(--color-text)]"
                                                type="button"
                                            >
                                                <FontAwesomeIcon icon={faGear} /> Settings
                                            </button>
                                            <button
                                                onClick={async () => { setProfileOpen(false); await signOut(); navigate("/login") }}
                                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--color-surface-alt)] transition font-bold text-sm text-red-600"
                                                type="button"
                                            >
                                                <FontAwesomeIcon icon={faRightFromBracket} /> Logout
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </header>
            {/* KEY FIX: Selalu render NotifPanel, jangan conditional mount.
                Portal unmount = crash. Pass isOpen sebagai prop, biarkan
                NotifPanel yang putuskan render null di dalam portal. */}
            <NotifPanel
                isOpen={notifOpen}
                notifications={notifications.map(n => translateNotification(n, t))}
                loading={loading}
                refreshing={refreshing}
                onDismiss={dismiss}
                onRefresh={refresh}
                onNavigate={handleNotifNavigate}
                isMobile={isMobileScreen}
                anchorRef={notifBtnRef}
                panelRef={notifPanelRef}
            />
        </>
    )
}