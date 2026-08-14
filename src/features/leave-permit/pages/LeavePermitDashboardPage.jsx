import { useState, useEffect } from 'react'
import {
  AlertCircle, FileText, LogOut, LogIn,
  Loader2, RefreshCw
} from 'lucide-react'
import DashboardLayout from '@core/layouts/DashboardLayout'
import { Breadcrumb, PageHeader, StatCard, EmptyState } from '@shared/components'
import useLeavePermitCore from '../hooks/useLeavePermitCore'
import LeavePermitStatusBadge from '../components/LeavePermitStatusBadge'
import { fmtDateTimeShort, fmtDateIndo, isOverdue } from '../utils/leavePermitConstants'

export default function LeavePermitDashboardPage() {
  const { permits, loading, stats, fetchPermits, fetchStats } = useLeavePermitCore()
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    fetchPermits({ status: filter !== 'all' ? filter : undefined })
    fetchStats()
  }, [filter])

  const activePermits = permits.filter(p => ['issued', 'departed'].includes(p.status))
  const overduePermits = permits.filter(p => p.status === 'departed' && new Date(p.return_deadline) < new Date())
  const todayPermits = permits.filter(p => {
    const today = new Date().toISOString().slice(0, 10)
    return p.leave_date === today
  })

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <Breadcrumb items={['Beranda', 'Kesantrian', 'Dashboard Izin']} />

        <PageHeader
          title="Dashboard Izin Keluar Pondok"
          subtitle="Pemantauan status izin santri"
          actions={
            <button
              onClick={() => { fetchPermits(); fetchStats() }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[var(--color-border)] text-[11px] font-bold text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
          }
        />

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            icon={FileText}
            label="Diterbitkan Hari Ini"
            value={stats.issuedToday}
            color="primary"
          />
          <StatCard
            icon={LogOut}
            label="Sedang Keluar"
            value={stats.active}
            color="amber"
          />
          <StatCard
            icon={AlertCircle}
            label="Terlambat Kembali"
            value={stats.overdue}
            color="rose"
          />
          <StatCard
            icon={LogIn}
            label="Kembali Hari Ini"
            value={stats.returnedToday}
            color="emerald"
          />
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 bg-[var(--color-surface-alt)] rounded-xl p-1 w-fit">
          {[
            { key: 'all', label: 'Semua' },
            { key: 'departed', label: 'Sedang Keluar' },
            { key: 'overdue', label: 'Terlambat' },
            { key: 'issued', label: 'Diterbitkan' },
            { key: 'returned', label: 'Kembali' },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                filter === f.key
                  ? 'bg-[var(--color-surface)] text-[var(--color-text)] shadow-sm'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Overdue alerts */}
        {overduePermits.length > 0 && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <h3 className="text-[11px] font-bold text-red-700">
                Santri Terlambat Kembali ({overduePermits.length})
              </h3>
            </div>
            <div className="space-y-1.5">
              {overduePermits.map((permit) => {
                const student = permit.student || {}
                const diff = new Date() - new Date(permit.return_deadline)
                const hours = Math.floor(diff / 3600000)
                const minutes = Math.floor((diff % 3600000) / 60000)
                return (
                  <div key={permit.id} className="flex items-center gap-2 text-[11px]">
                    <span className="font-bold text-red-800">{student.name}</span>
                    <span className="text-red-600">-</span>
                    <span className="text-red-600">
                      Terlambat {hours > 0 ? `${hours}j ${minutes}m` : `${minutes}m`}
                    </span>
                    <span className="text-red-400">|</span>
                    <span className="text-red-500">{permit.destination}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Active departures list */}
        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-[var(--color-primary)] mb-2" />
            <p className="text-sm text-[var(--color-text-muted)]">Memuat data...</p>
          </div>
        ) : activePermits.length === 0 ? (
          <EmptyState
            variant="dashed"
            color="slate"
            icon={LogOut}
            title="Tidak ada santri yang sedang keluar"
            description="Semua santri sudah kembali ke pondok"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {activePermits.map((permit) => {
              const student = permit.student || {}
              const overdue = isOverdue(permit)
              return (
                <div
                  key={permit.id}
                  className={`p-3 rounded-xl border transition-all ${
                    overdue
                      ? 'border-red-300 bg-red-50/50'
                      : 'border-[var(--color-border)] bg-[var(--color-surface)]'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-[var(--color-surface-alt)] flex items-center justify-center shrink-0 overflow-hidden">
                      {student.photo_url
                        ? <img src={student.photo_url} alt="" className="w-full h-full object-cover" />
                        : <span className="text-sm font-bold text-[var(--color-primary)]">{student.name?.charAt(0)}</span>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[11px] font-bold text-[var(--color-text)] truncate">{student.name}</span>
                        <LeavePermitStatusBadge status={permit.status} size="xs" />
                      </div>
                      <p className="text-[9px] text-[var(--color-text-muted)] mb-1">
                        {student.classes?.name || '-'} &middot; {student.dorms?.ar || student.dorms?.building || '-'}
                      </p>
                      <div className="space-y-0.5 text-[9px] text-[var(--color-text-muted)]">
                        <p>Tujuan: <strong>{permit.destination}</strong></p>
                        <p>Keperluan: <strong>{permit.purpose}</strong></p>
                        <p className={overdue ? 'text-red-600 font-bold' : ''}>
                          Batas: {fmtDateTimeShort(permit.return_deadline)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
