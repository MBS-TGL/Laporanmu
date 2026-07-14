import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ClipboardList, ArrowRight, AlertTriangle, CheckCircle2, Circle } from 'lucide-react'
import { supabase } from '@lib/supabase'

export function TaskCenterWidget() {
  const [dbCounts, setDbCounts] = useState({ pendingGate: 0, todayReports: 0 })
  const [completedTasks, setCompletedTasks] = useState({})

  // Load completed tasks status from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('laporanmu_completed_tasks')
      if (saved) setCompletedTasks(JSON.parse(saved))
    } catch (e) {
      console.error(e)
    }

    // Fetch live DB values for dynamic updates
    const fetchCounts = async () => {
      try {
        const { count: gateCount } = await supabase
          .from('gate_logs')
          .select('id', { count: 'exact', head: true })
          .is('check_out', null)

        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const { count: reportCount } = await supabase
          .from('reports')
          .select('id', { count: 'exact', head: true })
          .gte('reported_at', today.toISOString())

        setDbCounts({
          pendingGate: gateCount || 0,
          todayReports: reportCount || 0
        })
      } catch (err) {
        console.warn('Gagal memuat statistik database untuk widget:', err)
      }
    }

    fetchCounts()
  }, [])

  // Tasks overview configuration
  const tasks = useMemo(() => [
    {
      id: 'waka_gate_approve',
      title: 'Persetujuan Izin Keluar-Masuk',
      count: dbCounts.pendingGate,
      urgent: dbCounts.pendingGate > 3,
      role: 'Waka'
    },
    {
      id: 'guru_attendance_fill',
      title: 'Input Presensi Harian Kelas',
      count: 1,
      urgent: true,
      role: 'Guru'
    },
    {
      id: 'waka_poin_review',
      title: 'Review Pelanggaran Poin Berat',
      count: dbCounts.todayReports,
      urgent: false,
      role: 'Waka'
    },
    {
      id: 'musyrif_presence_subuh',
      title: 'Presensi Ibadah Santri',
      count: 1,
      urgent: true,
      role: 'Musyrif'
    }
  ], [dbCounts])

  const pendingTasks = useMemo(() => {
    return tasks.filter(t => !completedTasks[t.id])
  }, [tasks, completedTasks])

  const completedCount = useMemo(() => {
    return tasks.filter(t => completedTasks[t.id]).length
  }, [tasks, completedTasks])

  const progressPercentage = Math.round((completedCount / tasks.length) * 100)

  return (
    <div className="glass rounded-[1.5rem] p-5 bg-gradient-to-br from-[var(--color-surface)] to-[var(--color-surface-alt)] relative overflow-hidden group hover:shadow-2xl hover:shadow-[var(--color-primary)]/10 transition-all duration-500 flex flex-col justify-between min-h-[300px]">
      <div className="absolute -right-4 -top-4 w-24 h-24 bg-[var(--color-primary)]/5 rounded-full blur-2xl group-hover:bg-[var(--color-primary)]/10 transition-colors" />

      {/* Header */}
      <div className="relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <ClipboardList className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[13px] font-black text-[var(--color-text)]">Pusat Tugas</p>
              <p className="text-[10px] text-[var(--color-text-muted)] opacity-70 mt-0.5">Checklist aktivitas hari ini</p>
            </div>
          </div>
          <span className="text-[10px] font-black bg-[var(--color-primary)]/10 text-[var(--color-primary)] px-2 py-0.5 rounded-full">
            {completedCount}/{tasks.length} Selesai
          </span>
        </div>

        {/* Progress Bar */}
        <div className="mt-4 space-y-1">
          <div className="flex justify-between items-center text-[10px] font-extrabold text-[var(--color-text-muted)]">
            <span>Progress Kerja</span>
            <span className="text-[var(--color-primary)]">{progressPercentage}%</span>
          </div>
          <div className="h-1.5 w-full bg-[var(--color-border)]/40 rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--color-primary)] rounded-full transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {/* Tasks List */}
        <div className="mt-4 space-y-2.5">
          {pendingTasks.slice(0, 3).map(task => (
            <div key={task.id} className="flex items-center justify-between text-[11px] font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors py-0.5">
              <div className="flex items-center gap-2 min-w-0">
                <Circle className="w-3.5 h-3.5 text-[var(--color-text-muted)]/50 shrink-0" />
                <span className="truncate">{task.title}</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {task.urgent && (
                  <span className="text-[8px] font-black uppercase text-amber-500 flex items-center gap-0.5">
                    <AlertTriangle className="w-2.5 h-2.5" />
                    Penting
                  </span>
                )}
                <span className="text-[8px] font-black bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text-muted)] px-1.5 py-0.2 rounded-md">
                  {task.role}
                </span>
              </div>
            </div>
          ))}

          {pendingTasks.length === 0 && (
            <div className="py-4 text-center text-[11px] font-bold text-emerald-500 flex flex-col items-center gap-1">
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
              Semua tugas hari ini selesai!
            </div>
          )}
        </div>
      </div>

      {/* Action Button */}
      <div className="relative z-10 pt-4 border-t border-[var(--color-border)]/60 mt-4">
        <Link
          to="/task-center"
          className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-[var(--color-primary)] hover:translate-x-0.5 transition-transform"
        >
          <span>Kelola Semua Tugas ({pendingTasks.length} pending)</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  )
}
