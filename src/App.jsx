import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet, useNavigate } from 'react-router-dom'
import {
  AuthProvider, useAuth,
  ToastProvider,
  ThemeProvider, useTheme,
  LanguageProvider,
  FeatureFlagsProvider, useFeatureFlags
} from '@context'
import DashboardLayout from '@core/layouts/DashboardLayout'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faLock, faSpinner, faTools, faTriangleExclamation, faDoorOpen, faChevronLeft, faCircleQuestion } from '@fortawesome/free-solid-svg-icons'
import { GlobalErrorBoundary } from '@shared/components'
import { Component } from 'react'

// ─── Lazy Loading Guard ───────────────────────────────────────────────────────
/**
 * Helper to handle "Failed to fetch dynamically imported module".
 * Happens during development (Vite HMR) or when a new version is deployed.
 */
function lazyRetry(componentImport) {
  return lazy(async () => {
    try {
      return await componentImport()
    } catch (error) {
      if (error.message?.includes('Failed to fetch') || error.message?.includes('dynamically imported module')) {
        console.warn('[LazyRetry] Chunk load failed. Reloading window...')
        window.location.reload()
        return { default: () => null }
      }
      throw error
    }
  })
}

// ─── Lazy-loaded Pages ────────────────────────────────────────────────────────
// Public
const LandingPage = lazyRetry(() => import('@features/public/pages/LandingPage.jsx'))
const LoginPage = lazyRetry(() => import('@features/auth/pages/LoginPage.jsx'))
const ParentCheckPage = lazyRetry(() => import('@features/auth/pages/ParentCheckPage.jsx'))
const InformationPage = lazyRetry(() => import('@features/public/pages/InformationPage.jsx'))
const PublicVerifyPage = lazyRetry(() => import('@features/public/pages/PublicVerifyPage.jsx'))

// Core
const DashboardPage = lazyRetry(() => import('@features/dashboard/pages/DashboardPage.jsx'))
const TaskCenterPage = lazyRetry(() => import('@features/dashboard/pages/TaskCenterPage.jsx'))
const RaportPage = lazyRetry(() => import('@features/raport/pages/RaportPage.jsx'))
const BehaviorPage = lazyRetry(() => import('@features/behavior/pages/BehaviorPage.jsx'))
const DormsPage = lazyRetry(() => import('@features/dorms/pages/DormsPage.jsx'))
const HealthPage = lazyRetry(() => import('@features/health/pages/HealthPage.jsx'))
const CounselingPage = lazyRetry(() => import('@features/counseling/pages/CounselingPage.jsx'))
const AttendancePage = lazyRetry(() => import('@features/attendance/pages/AttendancePage.jsx'))
const GatePage = lazyRetry(() => import('@features/gate/pages/GatePage.jsx'))
const GateKioskPage = lazyRetry(() => import('@features/gate/pages/GateKioskPage.jsx'))
const SettingsPage = lazyRetry(() => import('@features/settings/pages/SettingsPage.jsx'))

// Admin-only
const UserPage = lazyRetry(() => import('@features/admin/pages/UserPage.jsx'))
const LogsPage = lazyRetry(() => import('@features/admin/pages/LogsPage.jsx'))
const AdminSettingsPage = lazyRetry(() => import('@features/admin/pages/SettingsPage.jsx'))
const DatabasePage = lazyRetry(() => import('@features/admin/pages/DatabasePage.jsx'))
const StoragePage = lazyRetry(() => import('@features/admin/pages/StoragePage.jsx'))
const TasksPage = lazyRetry(() => import('@features/admin/pages/TasksPage.jsx'))
const PlaygroundPage = lazyRetry(() => import('@features/admin/pages/PlaygroundPage.jsx'))
const NewsListPage = lazyRetry(() => import('@features/news/pages/NewsListPage.jsx'))
const NewsEditorPage = lazyRetry(() => import('@features/news/pages/NewsEditorPage.jsx'))
const AiInsightsPage = lazyRetry(() => import('@features/admin/pages/ai/AiInsightsPage.jsx'))
const AdminDashboardPage = lazyRetry(() => import('@features/admin/pages/AdminDashboardPage.jsx'))

// Master Data
const StudentsPage = lazyRetry(() => import('@features/students/pages/StudentsPage.jsx'))
const TeachersPage = lazyRetry(() => import('@features/teachers/pages/TeachersPage.jsx'))
const ClassesPage = lazyRetry(() => import('@features/classes/pages/ClassesPage.jsx'))
const AcademicYearsPage = lazyRetry(() => import('@features/academic-years/pages/AcademicYearsPage.jsx'))
const EnrollmentPage = lazyRetry(() => import('@features/enrollment/pages/EnrollmentPage.jsx'))
const PublicEnrollmentPage = lazyRetry(() => import('@features/public/pages/PublicEnrollmentPage.jsx'))
const PublicStatusCheckPage = lazyRetry(() => import('@features/public/pages/PublicStatusCheckPage.jsx'))

// ─── Role Hierarchy ───────────────────────────────────────────────────────────
// developer > admin > guru = satpam > viewer
const DEV_ONLY = ['developer']
const DEV_ADMIN = ['developer', 'admin']
const DEV_ADMIN_TEACHER = ['developer', 'admin', 'guru']
const DEV_ADMIN_GATE = ['developer', 'admin', 'satpam']
const ALL_STAFF = ['developer', 'admin', 'guru', 'satpam']

const ROUTE_ALIASES = [
  // English ↔ Indonesian aliases
  { from: '/absence', to: '/attendance' },
  { from: '/attendance', to: '/attendance' },
  { from: '/portal', to: '/boarding/gate' },
  { from: '/gate', to: '/boarding/gate' },
  { from: '/report', to: '/raport' },
  { from: '/reports', to: '/raports' },
  { from: '/points', to: '/boarding/behavior' },
  { from: '/behavior', to: '/boarding/behavior' },

  // Master data aliases
  { from: '/master/student', to: '/master/students' },
  { from: '/master/teacher', to: '/master/teachers' },
  { from: '/master/class', to: '/master/classes' },

  // Admin data aliases
  { from: '/admin/log', to: '/admin/logs' },
  { from: '/admin/user', to: '/admin/users' },
  { from: '/admin/setting', to: '/admin/settings' },
  { from: '/admin/db', to: '/admin/database' },
  { from: '/admin/task', to: '/admin/tasks' },
  { from: '/playground', to: '/admin/playground' },
  { from: '/master/psb', to: '/master/enrollment' },
  { from: '/verify/raport', to: '/verify' },
]

// ─── Loading Spinner ──────────────────────────────────────────────────────────
function PageSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-surface)]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-[3px] border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
        <p className="text-[var(--color-text-muted)] text-sm font-medium">Memuat halaman...</p>
      </div>
    </div>
  )
}

// ─── Auth Guards ──────────────────────────────────────────────────────────────

/** Blocks unauthenticated users. */
function ProtectedRoute() {
  const { user, loading } = useAuth()

  if (loading) return <PageSpinner />
  if (!user) return <Navigate to="/login" replace />

  return <Outlet />
}

/** Blocks authenticated users from visiting public pages (e.g. /login). */
function PublicRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) return <PageSpinner />
  if (user) return <Navigate to="/dashboard" replace />

  return children
}

/**
 * Role-based guard — wraps a single page element.
 * Redirects to /dashboard if the user's role is not in `allowedRoles`.
 *
 * Usage:
 *   <Route path="/user" element={<RoleRoute roles={ADMIN_ROLES}><UserPage /></RoleRoute>} />
 */
function RoleRoute({ children, roles = [] }) {
  const { profile } = useAuth()

  if (!roles.length) return children

  const role = profile?.role?.toLowerCase()
  if (!role || !roles.includes(role)) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}

/**
 * Feature flag guard — wraps a single page element.
 * Jika flag off: tampilkan "Akses Ditolak" di dalam DashboardLayout (tidak redirect).
 * Jika flag sedang load: tampilkan spinner.
 *
 * Usage:
 *   <Route path="/attendance" element={<FlagRoute flag="module.absensi"><AttendancePage /></FlagRoute>} />
 */
function FlagRoute({ children, flag, label }) {
  const { flags, loading } = useFeatureFlags()
  const navigate = useNavigate()

  if (loading) return (
    <DashboardLayout>
      <div className="flex items-center justify-center min-h-[60vh]">
        <FontAwesomeIcon icon={faSpinner} className="animate-spin text-2xl text-[var(--color-primary)]" />
      </div>
    </DashboardLayout>
  )

  if (flags[flag] === false) return (
    <DashboardLayout>
      <div className="flex flex-col items-center justify-center min-h-[70vh] p-6 relative overflow-hidden">
        {/* Decorative Background Elements */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-[var(--color-primary)]/5 rounded-full blur-[80px] pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center max-w-sm w-full">
          {/* Animated Icon Container */}
          <div className="relative mb-8">
            <div className="absolute inset-0 bg-amber-500/20 rounded-3xl blur-xl animate-pulse" />
            <div className="relative w-20 h-20 rounded-[2.5rem] bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-2xl shadow-orange-500/20">
              <FontAwesomeIcon icon={faLock} className="text-3xl text-white drop-shadow-md" />
            </div>
          </div>

          {/* Text Content */}
          <div className="text-center space-y-3 mb-10">
            <h2 className="text-2xl font-black text-[var(--color-text)] tracking-tight">
              Modul Tidak Aktif
            </h2>
            <p className="text-[13px] text-[var(--color-text-muted)] leading-relaxed px-4 opacity-80">
              Fitur <span className="font-bold text-[var(--color-text)] px-1.5 py-0.5 rounded-lg bg-[var(--color-surface-alt)] border border-[var(--color-border)]">{label || flag}</span> saat ini sedang dinonaktifkan oleh administrator sistem.
            </p>
          </div>

          {/* Action Button */}
          <button
            onClick={() => navigate(-1)}
            className="group relative h-12 px-8 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-black/10 flex items-center gap-3"
          >
            <span className="opacity-70 group-hover:opacity-100 transition-opacity">←</span>
            Kembali Sekarang
          </button>
        </div>
      </div>
    </DashboardLayout>
  )

  return children
}

/**
 * Combined Role + Flag guard.
 * Cek role dulu, lalu cek feature flag.
 */
function RoleFlagRoute({ children, roles = [], flag, label }) {
  const { profile } = useAuth()
  const { flags, loading } = useFeatureFlags()
  const navigate = useNavigate()

  const role = profile?.role?.toLowerCase()
  const hasRole = !roles.length || (role && roles.includes(role))

  if (loading) return (
    <DashboardLayout>
      <div className="flex items-center justify-center min-h-[60vh]">
        <FontAwesomeIcon icon={faSpinner} className="animate-spin text-2xl text-[var(--color-primary)]" />
      </div>
    </DashboardLayout>
  )

  // Role tidak sesuai
  if (!hasRole) return (
    <DashboardLayout>
      <div className="flex flex-col items-center justify-center min-h-[70vh] p-6 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-rose-500/5 rounded-full blur-[80px] pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center max-w-sm w-full">
          <div className="relative mb-8">
            <div className="absolute inset-0 bg-rose-500/20 rounded-3xl blur-xl" />
            <div className="relative w-20 h-20 rounded-[2.5rem] bg-gradient-to-br from-rose-400 to-rose-600 flex items-center justify-center shadow-2xl shadow-rose-500/20">
              <FontAwesomeIcon icon={faLock} className="text-3xl text-white drop-shadow-md" />
            </div>
          </div>

          <div className="text-center space-y-3 mb-10">
            <h2 className="text-2xl font-black text-[var(--color-text)] tracking-tight">
              Akses Ditolak
            </h2>
            <p className="text-[13px] text-[var(--color-text-muted)] leading-relaxed px-4 opacity-80">
              Maaf, halaman ini tidak dapat diakses oleh role <span className="font-bold text-rose-500 px-1.5 py-0.5 rounded-lg bg-rose-500/5 border border-rose-500/10 uppercase tracking-tighter text-[10px]">{(role?.charAt(0).toUpperCase() + role?.slice(1)) || 'Pengguna'}</span>.
            </p>
          </div>

          <button
            onClick={() => navigate(-1)}
            className="group h-12 px-8 rounded-2xl bg-rose-500 text-white text-xs font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-rose-500/20 flex items-center gap-3"
          >
            <span>←</span>
            Kembali
          </button>
        </div>
      </div>
    </DashboardLayout>
  )

  // Flag off
  if (flag && flags[flag] === false) return (
    <DashboardLayout>
      <div className="flex flex-col items-center justify-center min-h-[70vh] p-6 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-amber-500/5 rounded-full blur-[80px] pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center max-w-sm w-full">
          <div className="relative mb-8">
            <div className="absolute inset-0 bg-amber-500/20 rounded-3xl blur-xl animate-pulse" />
            <div className="relative w-20 h-20 rounded-[2.5rem] bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-2xl shadow-orange-500/20">
              <FontAwesomeIcon icon={faLock} className="text-3xl text-white drop-shadow-md" />
            </div>
          </div>

          <div className="text-center space-y-3 mb-10">
            <h2 className="text-2xl font-black text-[var(--color-text)] tracking-tight">
              Modul Tidak Aktif
            </h2>
            <p className="text-[13px] text-[var(--color-text-muted)] leading-relaxed px-4 opacity-80">
              Fitur <span className="font-bold text-[var(--color-text)] px-1.5 py-0.5 rounded-lg bg-[var(--color-surface-alt)] border border-[var(--color-border)]">{label || flag}</span> saat ini sedang dinonaktifkan oleh administrator sistem.
            </p>
          </div>

          <button
            onClick={() => navigate(-1)}
            className="group h-12 px-8 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-black/10 flex items-center gap-3"
          >
            <span>←</span>
            Kembali Sekarang
          </button>
        </div>
      </div>
    </DashboardLayout>
  )

  return children
}
// ─── Maintenance Page ─────────────────────────────────────────────────────────
function MaintenancePage() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--color-app-bg)] px-4 relative overflow-hidden">
      {/* Ambient glows */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-24 -right-24 w-[520px] h-[520px] bg-amber-500/5 rounded-full blur-[120px]" />
        <div className="absolute -bottom-24 -left-24 w-[520px] h-[520px] bg-orange-500/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 text-center max-w-md w-full">
        {/* Icon */}
        <div className="flex items-center justify-center mb-6">
          <div className="w-24 h-24 rounded-3xl bg-amber-500/10 border-2 border-amber-500/20 flex items-center justify-center shadow-xl shadow-amber-500/10">
            <FontAwesomeIcon icon={faTools} className="text-4xl text-amber-500" />
          </div>
        </div>

        {/* Text */}
        <h1 className="text-3xl font-black font-heading tracking-tight text-[var(--color-text)] mb-3">
          Sedang Maintenance
        </h1>
        <p className="text-[var(--color-text-muted)] text-sm leading-relaxed mb-2">
          Sistem sedang dalam pemeliharaan oleh administrator.
        </p>
        <p className="text-[var(--color-text-muted)] text-sm leading-relaxed mb-8">
          Silakan kembali beberapa saat lagi.
        </p>

        {/* Info card */}
        <div className="glass rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 mb-8 text-left">
          <div className="flex items-start gap-3">
            <FontAwesomeIcon icon={faTriangleExclamation} className="text-amber-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-[12px] font-black text-amber-700 mb-1">Informasi</p>
              <p className="text-[11px] text-amber-600/80 leading-relaxed">
                Seluruh data kamu aman. Maintenance ini bersifat sementara dan tidak menghapus data apapun.
              </p>
            </div>
          </div>
        </div>

        {/* Login as different account or logout */}
        <div className="flex flex-col items-center gap-2">
          <p className="text-[11px] text-[var(--color-text-muted)]">
            Login sebagai: <span className="font-black text-[var(--color-text)]">{profile?.name}</span>
            <span className="ml-1.5 px-1.5 py-0.5 rounded-md bg-[var(--color-surface-alt)] text-[10px] font-black uppercase border border-[var(--color-border)]">{profile?.role}</span>
          </p>
          <button
            onClick={async () => { await signOut(); navigate('/login') }}
            className="h-9 px-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[11px] font-black text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-all"
          >
            Ganti Akun
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Maintenance guard — wrap di dalam ProtectedRoute.
 * Kalau system.maintenance = true dan user bukan developer → tampilkan MaintenancePage.
 * Developer tetap bisa akses semua halaman normal.
 */
function MaintenanceGuard({ children }) {
  const { profile } = useAuth()
  const { flags, loading } = useFeatureFlags()

  // Tunggu flags load dulu
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-surface)]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-[3px] border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
        <p className="text-[var(--color-text-muted)] text-sm font-medium">Memuat...</p>
      </div>
    </div>
  )

  // Developer selalu bypass maintenance
  const isDeveloper = profile?.role?.toLowerCase() === 'developer'
  if (!isDeveloper && flags['system.maintenance'] === true) {
    return <MaintenancePage />
  }

  return children
}

function NotFoundPage() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-surface)] px-4">
      <div className="text-center max-w-sm">
        <div className="text-[80px] font-black font-heading leading-none gradient-text mb-2 select-none">
          404
        </div>
        <h2 className="text-xl font-black text-[var(--color-text)] mb-2">
          Halaman Tidak Ditemukan
        </h2>
        <p className="text-sm text-[var(--color-text-muted)] mb-8 leading-relaxed">
          URL yang kamu akses tidak tersedia atau sudah dipindahkan.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="h-10 px-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-sm font-black text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-all">
            ← Kembali
          </button>
          <a href="/dashboard" className="btn btn-primary h-10 px-5 text-sm">
            Ke Dashboard
          </a>
        </div>
      </div>
    </div>
  )
}

// ─── Routes ───────────────────────────────────────────────────────────────────
function AppRoutes() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <Routes>

        {/* ── Public ── */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/psb" element={<PublicEnrollmentPage />} />
        <Route path="/psb/status" element={<PublicStatusCheckPage />} />
        <Route path="/check" element={<ParentCheckPage />} />
        <Route path="/login" element={
          <PublicRoute><LoginPage /></PublicRoute>
        } />
        <Route path="/informasi" element={<InformationPage />} />
        <Route path="/verify" element={<PublicVerifyPage />} />

        {/* ── Protected ── */}
        <Route element={<ProtectedRoute />}>
          <Route element={<MaintenanceGuard><Outlet /></MaintenanceGuard>}>

            {/* Core — module flag guarded */}
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/task-center" element={<TaskCenterPage />} />
            <Route path="/raport" element={<FlagRoute flag="module.raport" label="Raport Pondok"><RaportPage /></FlagRoute>} />
            <Route path="/academic/raport" element={<FlagRoute flag="module.raport" label="Rapor & Penilaian"><RaportPage /></FlagRoute>} />
            <Route path="/boarding/behavior" element={<FlagRoute flag="module.poin" label="Kedisiplinan & Poin"><BehaviorPage /></FlagRoute>} />
            <Route path="/attendance" element={<FlagRoute flag="module.absensi" label="Absensi Bulanan"><AttendancePage /></FlagRoute>} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/boarding/dorms" element={
              <RoleFlagRoute roles={DEV_ADMIN_TEACHER} flag="nav.dorms" label="Manajemen Asrama">
                <DormsPage />
              </RoleFlagRoute>
            } />
            <Route path="/boarding/health" element={
              <RoleFlagRoute roles={DEV_ADMIN_TEACHER} flag="nav.health" label="Klinik & Kesehatan">
                <HealthPage />
              </RoleFlagRoute>
            } />
            <Route path="/boarding/counseling" element={
              <RoleFlagRoute roles={DEV_ADMIN_TEACHER} flag="nav.counseling" label="Bimbingan Konseling">
                <CounselingPage />
              </RoleFlagRoute>
            } />

            {/* Role + flag guarded */}
            <Route path="/boarding/gate" element={
              <RoleFlagRoute roles={DEV_ADMIN_GATE} flag="module.gate" label="Portal Keluar Masuk">
                <GatePage />
              </RoleFlagRoute>
            } />
            <Route path="/boarding/gate/kiosk" element={
              <RoleFlagRoute roles={DEV_ADMIN_GATE} flag="module.gate" label="Portal Keluar Masuk">
                <GateKioskPage />
              </RoleFlagRoute>
            } />
            <Route path="/admin/logs" element={
              <RoleFlagRoute roles={DEV_ADMIN}>
                <LogsPage />
              </RoleFlagRoute>
            } />
            <Route path="/admin/users" element={
              <RoleFlagRoute roles={DEV_ADMIN}>
                <UserPage />
              </RoleFlagRoute>
            } />
            <Route path="/admin/settings" element={
              <RoleFlagRoute roles={DEV_ADMIN}>
                <AdminSettingsPage />
              </RoleFlagRoute>
            } />
            <Route path="/admin/database" element={
              <RoleFlagRoute roles={DEV_ADMIN}>
                <DatabasePage />
              </RoleFlagRoute>
            } />
            <Route path="/admin/storage" element={
              <RoleFlagRoute roles={DEV_ADMIN}>
                <StoragePage />
              </RoleFlagRoute>
            } />
            <Route path="/admin/tasks" element={
              <RoleFlagRoute roles={DEV_ADMIN}>
                <TasksPage />
              </RoleFlagRoute>
            } />
            <Route path="/admin/playground" element={
              <RoleFlagRoute roles={DEV_ADMIN}>
                <PlaygroundPage />
              </RoleFlagRoute>
            } />

            {/* Master Data */}
            <Route path="/admin/news" element={
              <RoleFlagRoute roles={DEV_ADMIN}>
                <NewsListPage />
              </RoleFlagRoute>
            } />
            <Route path="/admin/news/create" element={
              <RoleFlagRoute roles={DEV_ADMIN}>
                <NewsEditorPage />
              </RoleFlagRoute>
            } />
            <Route path="/admin/news/edit/:id" element={
              <RoleFlagRoute roles={DEV_ADMIN}>
                <NewsEditorPage />
              </RoleFlagRoute>
            } />
            <Route path="/admin/ai-insights" element={
              <RoleFlagRoute roles={DEV_ADMIN}>
                <AiInsightsPage />
              </RoleFlagRoute>
            } />
            <Route path="/admin" element={
              <RoleFlagRoute roles={DEV_ADMIN}>
                <AdminDashboardPage />
              </RoleFlagRoute>
            } />

            <Route path="/master/students" element={
              <RoleFlagRoute roles={DEV_ADMIN_TEACHER} flag="module.students" label="Data Siswa">
                <StudentsPage />
              </RoleFlagRoute>
            } />
            <Route path="/master/teachers" element={
              <RoleFlagRoute roles={DEV_ADMIN_TEACHER} flag="module.teachers" label="Data Guru">
                <TeachersPage />
              </RoleFlagRoute>
            } />
            <Route path="/master/classes" element={
              <RoleFlagRoute roles={DEV_ADMIN_TEACHER} flag="module.classes" label="Data Kelas">
                <ClassesPage />
              </RoleFlagRoute>
            } />
            <Route path="/master/academic-years" element={
              <RoleFlagRoute roles={DEV_ADMIN_TEACHER} flag="module.academic_years" label="Tahun Pelajaran">
                <AcademicYearsPage />
              </RoleFlagRoute>
            } />
            <Route path="/master/enrollment" element={
              <RoleFlagRoute roles={DEV_ADMIN_TEACHER} flag="module.enrollment" label="PSB / Enrollment">
                <EnrollmentPage />
              </RoleFlagRoute>
            } />

            {/* Route Aliases */}
            {ROUTE_ALIASES.map(({ from, to }) => (
              <Route key={from} path={from} element={<Navigate to={to} replace />} />
            ))}
          </Route>
        </Route>

        {/* ── 404 ── */}
        <Route path="*" element={<NotFoundPage />} />

      </Routes>
    </Suspense>
  )
}

// ─── App Root ─────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <GlobalErrorBoundary>
      <BrowserRouter>
        <LanguageProvider>
          <ThemeProvider>
            <ToastProvider>
              <AuthProvider>
                <FeatureFlagsProvider>
                  <AppRoutes />
                </FeatureFlagsProvider>
              </AuthProvider>
            </ToastProvider>
          </ThemeProvider>
        </LanguageProvider>
      </BrowserRouter>
    </GlobalErrorBoundary>
  )
}