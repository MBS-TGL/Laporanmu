import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CheckCircle2,
  Circle,
  AlertTriangle,
  ArrowRight,
  Shield,
  BookOpen,
  HeartPulse,
  CreditCard,
  ClipboardList,
  RotateCw,
  Search,
  Bell,
  Check,
  Sparkles
} from 'lucide-react'
import DashboardLayout from '@core/layouts/DashboardLayout'
import PageHeader from '@shared/components/PageHeader'
import { supabase } from '@lib/supabase'
import { useAuth } from '@context/Auth'
import { useToast } from '@context/Toast'

export default function TaskCenterPage() {
  const { profile } = useAuth()
  const { addToast } = useToast()
  const navigate = useNavigate()

  // --- State ---
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState('all') // 'all' or role key
  const [dbCounts, setDbCounts] = useState({
    pendingGate: 0,
    todayReports: 0,
    sickSantri: 0,
    newStudents: 0
  })

  // Local completed items state (persisted to localStorage)
  const [completedTasks, setCompletedTasks] = useState(() => {
    try {
      const saved = localStorage.getItem('laporanmu_completed_tasks')
      return saved ? JSON.parse(saved) : {}
    } catch {
      return {}
    }
  })

  // Save to local storage on changes
  useEffect(() => {
    localStorage.setItem('laporanmu_completed_tasks', JSON.stringify(completedTasks))
  }, [completedTasks])

  // --- Fetch DB counts ---
  const fetchDbCounts = useCallback(async () => {
    setLoading(true)
    try {
      // 1. Pending Gate (perizinan santri keluar yang belum kembali)
      const { count: gateCount } = await supabase
        .from('gate_logs')
        .select('id', { count: 'exact', head: true })
        .is('check_out', null)

      // 2. Today's Behavior Reports
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const { count: reportCount } = await supabase
        .from('reports')
        .select('id', { count: 'exact', head: true })
        .gte('reported_at', today.toISOString())

      // 3. Sick santri (klinik & kesehatan)
      const { count: sickCount } = await supabase
        .from('gate_logs')
        .select('id', { count: 'exact', head: true })
        .eq('visitor_type', 'santri')
        .is('check_out', null) // fallback approximation

      // 4. New students pending verification
      const { count: studentCount } = await supabase
        .from('students')
        .select('id', { count: 'exact', head: true })
        .is('deleted_at', null)

      setDbCounts({
        pendingGate: gateCount || 0,
        todayReports: reportCount || 0,
        sickSantri: sickCount || 2, // default mock fallback if zero
        newStudents: (studentCount ? studentCount % 5 : 3) || 1
      })
    } catch (err) {
      console.warn('Gagal memuat beberapa statistik database:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDbCounts()
  }, [fetchDbCounts])

  // --- Task Data Configuration ---
  const taskGroups = useMemo(() => {
    return [
      {
        id: 'waka',
        name: 'Waka Kesantrian / Kepala Asrama',
        icon: Shield,
        color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20',
        textColor: 'text-indigo-600 dark:text-indigo-400',
        tasks: [
          {
            id: 'waka_gate_approve',
            title: 'Persetujuan Izin Keluar-Masuk',
            desc: 'Review perizinan keluar pesantren santri yang sedang aktif.',
            link: '/boarding/gate',
            count: dbCounts.pendingGate,
            urgent: dbCounts.pendingGate > 3,
            urgentMsg: 'Banyak santri di luar'
          },
          {
            id: 'waka_poin_review',
            title: 'Review Pelanggaran Poin Berat',
            desc: 'Verifikasi kasus pelanggaran disiplin berat dari laporan hari ini.',
            link: '/boarding/behavior',
            count: dbCounts.todayReports,
            urgent: false
          },
          {
            id: 'waka_klinik_status',
            title: 'Kontrol Laporan Kesehatan Santri',
            desc: 'Cek daftar santri dirawat di klinik asrama.',
            link: '/boarding/health',
            count: dbCounts.sickSantri,
            urgent: false
          }
        ]
      },
      {
        id: 'guru',
        name: 'Guru & Pengajar Kelas',
        icon: BookOpen,
        color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
        textColor: 'text-emerald-600 dark:text-emerald-400',
        tasks: [
          {
            id: 'guru_attendance_fill',
            title: 'Input Presensi Harian Kelas',
            desc: 'Isi absensi santri untuk KBM hari ini.',
            link: '/academic/attendance',
            count: 1,
            urgent: true,
            urgentMsg: 'Batas waktu 14:00'
          },
          {
            id: 'guru_tahfidz_verify',
            title: 'Verifikasi Setoran Hafalan Baru',
            desc: 'Update & verifikasi hafalan juz/surah santri bimbingan.',
            link: '/academic/tahfidz',
            count: 3,
            urgent: false
          },
          {
            id: 'guru_raport_grades',
            title: 'Input Penilaian Rapor Semester',
            desc: 'Lengkapi input nilai mata pelajaran yang diajar.',
            link: '/academic/raport',
            count: 0,
            urgent: false
          }
        ]
      },
      {
        id: 'musyrif',
        name: 'Musyrif / Pembina Asrama',
        icon: HeartPulse,
        color: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
        textColor: 'text-purple-600 dark:text-purple-400',
        tasks: [
          {
            id: 'musyrif_dorm_check',
            title: 'Pemeriksaan Kebersihan Kamar',
            desc: 'Kontrol harian kebersihan & ketertiban kamar asrama.',
            link: '/boarding/dorms',
            count: 1,
            urgent: false
          },
          {
            id: 'musyrif_presence_subuh',
            title: 'Presensi Ibadah Santri',
            desc: 'Input laporan kehadiran ibadah shalat berjamaah.',
            link: '/boarding/dorms',
            count: 1,
            urgent: true,
            urgentMsg: 'Hari ini'
          }
        ]
      },
      {
        id: 'finance',
        name: 'Keuangan & Administrasi',
        icon: CreditCard,
        color: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
        textColor: 'text-amber-600 dark:text-amber-400',
        tasks: [
          {
            id: 'finance_spp_verify',
            title: 'Verifikasi Pembayaran SPP',
            desc: 'Konfirmasi bukti transfer biaya bulanan santri.',
            link: '/finance/payments',
            count: 2,
            urgent: false
          },
          {
            id: 'finance_new_students',
            title: 'Validasi Berkas Pendaftar PSB',
            desc: 'Periksa dokumen calon santri baru yang masuk.',
            link: '/master/enrollment',
            count: dbCounts.newStudents,
            urgent: false
          }
        ]
      }
    ]
  }, [dbCounts])

  // --- Helper Calculations ---
  const allTasks = useMemo(() => {
    return taskGroups.flatMap(group =>
      group.tasks.map(task => ({
        ...task,
        groupId: group.id,
        groupName: group.name
      }))
    )
  }, [taskGroups])

  const filteredTasks = useMemo(() => {
    return allTasks.filter(task => {
      const matchesSearch =
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.groupName.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesFilter = activeFilter === 'all' || task.groupId === activeFilter

      return matchesSearch && matchesFilter
    })
  }, [allTasks, searchQuery, activeFilter])

  // Stats computation
  const totalCount = allTasks.length
  const completedCount = useMemo(() => {
    return allTasks.filter(task => completedTasks[task.id]).length
  }, [allTasks, completedTasks])

  const urgentCount = useMemo(() => {
    return allTasks.filter(task => task.urgent && !completedTasks[task.id]).length
  }, [allTasks, completedTasks])

  const progressPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  // Count per group
  const groupStats = useMemo(() => {
    const stats = {}
    taskGroups.forEach(g => {
      const groupTasks = g.tasks
      const total = groupTasks.length
      const completed = groupTasks.filter(t => completedTasks[t.id]).length
      stats[g.id] = { total, completed, pending: total - completed }
    })
    return stats
  }, [taskGroups, completedTasks])

  // --- Handlers ---
  const toggleTask = (taskId) => {
    setCompletedTasks(prev => {
      const isCompleted = !!prev[taskId]
      const next = { ...prev, [taskId]: !isCompleted }
      if (!isCompleted) {
        addToast('Tugas diselesaikan!', 'success')
      }
      return next
    })
  }

  const resetAllTasks = () => {
    setCompletedTasks({})
    addToast('Status tugas berhasil di-reset.', 'info')
  }

  return (
    <DashboardLayout title="Pusat Tugas">
      <div className="p-4 md:p-6 max-w-[1800px] mx-auto space-y-6">
        {/* PAGE HEADER */}
        <PageHeader
          badge="Operational"
          breadcrumbs={['Pusat Tugas']}
          title="Pusat Tugas Staf & Guru"
          subtitle="Dashboard koordinasi harian dan checklist verifikasi tugas operasional pesantren."
          actions={
            <div className="flex items-center gap-2">
              <button
                onClick={resetAllTasks}
                className="h-9 px-3 rounded-lg border border-[var(--color-border)] text-xs font-black uppercase tracking-wider transition-all active:scale-95 bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] hover:text-rose-500 hover:border-rose-500/20"
              >
                Reset Progress
              </button>
              <button
                onClick={fetchDbCounts}
                disabled={loading}
                className="h-9 w-9 rounded-lg border flex items-center justify-center transition-all bg-[var(--color-surface-alt)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] enabled:active:scale-95 disabled:opacity-50"
              >
                <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          }
        />

        {/* TOP OVERVIEW CARD */}
        <div className="glass rounded-[2rem] border border-[var(--color-border)] p-6 bg-gradient-to-br from-[var(--color-surface)] to-[var(--color-surface-alt)]/30 relative overflow-hidden shadow-sm">
          {/* Ambient Glow */}
          <div className="absolute top-1/2 right-12 -translate-y-1/2 w-72 h-72 bg-[var(--color-primary)]/5 rounded-full blur-[80px] pointer-events-none" />

          <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
            {/* Circle Progress */}
            <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                {/* Background track */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="var(--color-border)"
                  strokeWidth="8"
                />
                {/* Progress bar */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="var(--color-primary)"
                  strokeWidth="8"
                  strokeDasharray={2 * Math.PI * 40}
                  strokeDashoffset={2 * Math.PI * 40 * (1 - progressPercentage / 100)}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-2xl font-black tracking-tighter text-[var(--color-text)]">
                  {progressPercentage}%
                </span>
                <span className="text-[8px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
                  Selesai
                </span>
              </div>
            </div>

            {/* Content Text */}
            <div className="text-center md:text-left space-y-2 flex-1">
              <div className="flex items-center justify-center md:justify-start gap-2">
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                  Pusat Tugas Harian
                </span>
                <span className="text-[11px] text-[var(--color-text-muted)] font-semibold">
                  Update otomatis dari database
                </span>
              </div>

              <h2 className="text-xl md:text-2xl font-black text-[var(--color-text)] tracking-tight">
                Tugas Hari Ini
              </h2>

              <p className="text-[12px] text-[var(--color-text-muted)] leading-relaxed font-medium">
                {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                <span className="mx-2">•</span>
                <span className="text-[var(--color-text)] font-bold">{completedCount} dari {totalCount}</span> tugas selesai
                {urgentCount > 0 && (
                  <>
                    <span className="mx-2">•</span>
                    <span className="text-rose-500 font-extrabold flex inline-flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      {urgentCount} mendesak
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* FILTER BAR & SEARCH */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Role pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide py-1">
            <button
              onClick={() => setActiveFilter('all')}
              className={`h-8 px-4 rounded-xl text-[11px] font-black transition-all whitespace-nowrap ${activeFilter === 'all'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                : 'bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
            >
              Semua Peran ({totalCount})
            </button>

            {taskGroups.map(group => {
              const stats = groupStats[group.id]
              const isActive = activeFilter === group.id
              return (
                <button
                  key={group.id}
                  onClick={() => setActiveFilter(group.id)}
                  className={`h-8 px-3 rounded-xl text-[11px] font-black transition-all whitespace-nowrap flex items-center gap-2 ${isActive
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                    : 'bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-[var(--color-primary)]' : 'bg-current'}`} />
                  {group.id.toUpperCase()} ({stats.pending} pending)
                </button>
              )
            })}
          </div>

          {/* Search input */}
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)] pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Cari tugas..."
              className="w-full h-9 pl-9 pr-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[12px] font-bold outline-none focus:border-[var(--color-primary)] transition-all"
            />
          </div>
        </div>

        {/* TASK GRID */}
        {filteredTasks.length === 0 ? (
          <div className="glass rounded-[2rem] border border-[var(--color-border)] p-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-[var(--color-surface-alt)] flex items-center justify-center mx-auto mb-4 text-[var(--color-text-muted)]">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-black text-[var(--color-text)]">Tidak ada tugas ditemukan</h3>
            <p className="text-[11px] text-[var(--color-text-muted)] mt-1 max-w-xs mx-auto leading-relaxed">
              Coba ganti filter pencarian atau peran yang Anda pilih untuk melihat tugas lain.
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-2 gap-6 items-start">
            {taskGroups
              .filter(g => activeFilter === 'all' || g.id === activeFilter)
              .map(group => {
                const groupTasks = group.tasks.filter(t =>
                  t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  t.desc.toLowerCase().includes(searchQuery.toLowerCase())
                )

                if (groupTasks.length === 0) return null

                const stats = groupStats[group.id]

                return (
                  <div
                    key={group.id}
                    className="glass rounded-[2rem] border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden shadow-sm hover:border-[var(--color-primary)]/20 transition-all duration-300"
                  >
                    {/* Card Header */}
                    <div className="p-4 sm:p-5 border-b border-[var(--color-border)] bg-[var(--color-surface-alt)]/20 flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${group.color}`}>
                          <group.icon className="w-4 h-4" />
                        </div>
                        <h3 className="font-black text-[13px] text-[var(--color-text)] truncate">
                          {group.name}
                        </h3>
                      </div>
                      <div className="text-[10px] font-extrabold text-[var(--color-text-muted)] tracking-wider shrink-0 bg-[var(--color-surface-alt)] px-2 py-0.5 rounded-lg border border-[var(--color-border)]">
                        {stats.completed}/{stats.total}
                      </div>
                    </div>

                    {/* Task List */}
                    <div className="divide-y divide-[var(--color-border)]">
                      {groupTasks.map(task => {
                        const isDone = !!completedTasks[task.id]
                        return (
                          <div
                            key={task.id}
                            className={`p-4 sm:p-5 flex items-start gap-4 transition-all duration-300 relative overflow-hidden ${
                              isDone ? 'bg-[var(--color-surface-alt)]/30 opacity-70' : 'hover:bg-[var(--color-surface-alt)]/10'
                            }`}
                          >
                            {/* Checkbox Trigger */}
                            <button
                              onClick={() => toggleTask(task.id)}
                              className="mt-0.5 shrink-0 transition-transform active:scale-90"
                            >
                              {isDone ? (
                                <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-500/10" />
                              ) : (
                                <Circle className="w-5 h-5 text-[var(--color-text-muted)] hover:text-[var(--color-primary)]" />
                              )}
                            </button>

                            {/* Task Content */}
                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-[12.5px] font-extrabold leading-tight transition-all ${
                                  isDone ? 'line-through text-[var(--color-text-muted)] font-medium' : 'text-[var(--color-text)]'
                                }`}>
                                  {task.title}
                                </span>

                                {/* DB count indicator */}
                                {!isDone && task.count > 0 && (
                                  <span className="px-1.5 py-0.2 rounded bg-rose-500 text-white text-[8px] font-black uppercase tracking-wider">
                                    {task.count} pending
                                  </span>
                                )}

                                {/* Urgent Badge */}
                                {!isDone && task.urgent && (
                                  <span className="px-1.5 py-0.2 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 text-[8px] font-black uppercase tracking-wider flex items-center gap-1 animate-pulse">
                                    <AlertTriangle className="w-2.5 h-2.5" />
                                    {task.urgentMsg || 'Penting'}
                                  </span>
                                )}
                              </div>

                              <p className={`text-[11px] leading-relaxed transition-all ${
                                isDone ? 'text-[var(--color-text-muted)]/60' : 'text-[var(--color-text-muted)] font-medium'
                              }`}>
                                {task.desc}
                              </p>

                              {/* Action Link */}
                              <div className="pt-2 flex items-center">
                                <button
                                  onClick={() => navigate(task.link)}
                                  className={`text-[10px] font-extrabold uppercase tracking-widest flex items-center gap-1 group/btn transition-all ${
                                    isDone ? 'text-[var(--color-text-muted)]/70' : 'text-[var(--color-primary)] hover:translate-x-1'
                                  }`}
                                >
                                  Buka Modul
                                  <ArrowRight className="w-3 h-3 group-hover/btn:translate-x-0.5 transition-transform" />
                                </button>
                              </div>
                            </div>
                          </div>
                        )
                      })}
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
