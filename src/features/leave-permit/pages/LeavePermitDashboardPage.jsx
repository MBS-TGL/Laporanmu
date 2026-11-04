import { useState, useEffect } from 'react'
import {
  AlertCircle, FileText, LogOut, LogIn,
  RefreshCw
} from 'lucide-react'
import DashboardLayout from '@core/layouts/DashboardLayout'
import { Breadcrumb, PageHeader, StatCard, EmptyState, Button, Skeleton } from '@shared/components'
import useLeavePermitCore from '../hooks/useLeavePermitCore'
import LeavePermitStatusBadge from '../components/LeavePermitStatusBadge'
import { fmtDateTimeShort, isOverdue } from '../utils/leavePermitConstants'

export default function LeavePermitDashboardPage() {
  const { permits, loading, stats, fetchPermits, fetchStats } = useLeavePermitCore()
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    fetchPermits({ status: filter !== 'all' ? filter : undefined })
    fetchStats()
  }, [filter])

  const activePermits = permits.filter(p => ['issued', 'departed'].includes(p.status))
  const overduePermits = permits.filter(p => p.status === 'departed' && new Date(p.return_deadline) < new Date())

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <Breadcrumb items={['Beranda', 'Kesantrian', 'Dashboard Izin']} />

        <PageHeader
          title="Dashboard Izin Keluar Pondok"
          subtitle="Pemantauan status izin santri"
          actions={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => { fetchPermits(); fetchStats() }}
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </Button>
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
        <div className="flex gap-1 bg-surface-alt rounded-xl p-1 w-fit">
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
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filter === f.key
                  ? 'bg-surface text-text shadow-sm'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Overdue alerts */}
        {overduePermits.length > 0 && (
          <div className="p-3 rounded-xl bg-danger/5 border border-danger/20">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-danger" />
              <h3 className="text-xs font-bold text-danger">
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
                  <div key={permit.id} className="flex items-center gap-2 text-xs">
                    <span className="font-bold text-danger">{student.name}</span>
                    <span className="text-danger">-</span>
                    <span className="text-danger">
                      Terlambat {hours > 0 ? `${hours}j ${minutes}m` : `${minutes}m`}
                    </span>
                    <span className="text-danger/40">|</span>
                    <span className="text-danger/80">{permit.destination}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Active departures list */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
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
                  className={`p-3 rounded-xl border transition-colors ${
                    overdue
                      ? 'border-danger/30 bg-danger/5'
                      : 'border-border bg-surface'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-surface-alt flex items-center justify-center shrink-0 overflow-hidden">
                      {student.photo_url
                        ? <img src={student.photo_url} alt="" className="w-full h-full object-cover" />
                        : <span className="text-sm font-bold text-primary">{student.name?.charAt(0)}</span>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-bold text-text truncate">{student.name}</span>
                        <LeavePermitStatusBadge status={permit.status} size="xs" />
                      </div>
                      <p className="text-xs text-text-muted mb-1">
                        {student.classes?.name || '-'} &middot; {student.dorms?.ar || student.dorms?.building || '-'}
                      </p>
                      <div className="space-y-0.5 text-xs text-text-muted">
                        <p>Tujuan: <strong>{permit.destination}</strong></p>
                        <p>Keperluan: <strong>{permit.purpose}</strong></p>
                        <p className={overdue ? 'text-danger font-bold' : ''}>
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
