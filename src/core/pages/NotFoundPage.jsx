import { useNavigate } from 'react-router-dom'
import { useAuth } from '@context'
import DashboardLayout from '@core/layouts/DashboardLayout'

// ─── 404 Content ──────────────────────────────────────────────────────────────
function NotFoundContent() {
  const navigate = useNavigate()
  return (
    <div className="text-center max-w-sm">
      <div className="text-[80px] font-bold font-heading leading-none gradient-text mb-2 select-none">
        404
      </div>
      <h2 className="text-xl font-bold text-[var(--color-text)] mb-2">
        Halaman Tidak Ditemukan
      </h2>
      <p className="text-sm text-[var(--color-text-muted)] mb-8 leading-relaxed">
        URL yang kamu akses tidak tersedia atau sudah dipindahkan.
      </p>
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="h-10 px-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-sm font-bold text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-all">
          ← Kembali
        </button>
        <a href="/dashboard" className="btn btn-primary h-10 px-5 text-sm">
          Ke Dashboard
        </a>
      </div>
    </div>
  )
}

/**
 * 404 catch-all — auth-aware.
 * Sudah login → tampil di dalam DashboardLayout (sidebar & topbar tetap ada).
 * Belum login → tampilan standalone fullscreen.
 */
export default function NotFoundPage() {
  const { user, loading } = useAuth()

  // Tunggu auth resolve dulu agar tidak flash tampilan yang salah
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-surface)]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-[3px] border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
        <p className="text-[var(--color-text-muted)] text-sm font-medium">Memuat halaman...</p>
      </div>
    </div>
  )

  // Sudah login — tampil dalam layout aplikasi (mengikuti pola screen FlagRoute)
  if (user) return (
    <DashboardLayout>
      <div className="flex flex-col items-center justify-center min-h-[70vh] p-6">
        <NotFoundContent />
      </div>
    </DashboardLayout>
  )

  // Belum login — standalone fullscreen
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-surface)] px-4">
      <NotFoundContent />
    </div>
  )
}
