import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
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
  RefreshCw,
  RotateCcw,
  Search,
  Bell,
  X,
  Sparkles,
  ListChecks,
  Keyboard,
  Clock,
  Check
} from 'lucide-react'
import DashboardLayout from '@core/layouts/DashboardLayout'
import PageHeader from '@shared/components/PageHeader'
import { EmptyState } from '@shared/components'
import { supabase } from '@lib/supabase'
import { useAuth } from '@context/Auth'
import { useToast } from '@context/Toast'
import { logAudit } from '@utils/auditLogger'
import LiveClock from '@features/gate/ui/LiveClock'

// ─── Helpers ────────────────────────────────────────────────────────────────

const pad = (n) => String(n).padStart(2, '0')
const dateKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const fmtClock = (d) => `${pad(d.getHours())}.${pad(d.getMinutes())}`
const minutesOfDay = (d) => d.getHours() * 60 + d.getMinutes()
const parseHM = (s) => {
  const [h, m] = s.split(':').map(Number)
  return h * 60 + m
}
const fmtMinutes = (mnt) => {
  const h = Math.floor(mnt / 60)
  const m = mnt % 60
  return h > 0 ? `${h}j ${m}m` : `${m}m`
}

const OVERTIME_MS = 2 * 60 * 60 * 1000 // sama dengan batas "lama keluar" di Gate Monitor
const AUTO_REFRESH_MS = 60 * 1000
const CLOCK_TICK_MS = 30 * 1000
const REFRESH_COOLDOWN_MS = 3000

// Peran profil → grup tugas (dipakai untuk filter awal). Peran lain: tampil semua.
const ROLE_TO_GROUP = {
  guru: 'guru',
  musyrif: 'musyrif',
  pembina: 'musyrif',
  keuangan: 'finance',
  bendahara: 'finance',
  finance: 'finance',
  waka: 'waka',
  kepala_asrama: 'waka'
}

// ─── Konfigurasi tugas ──────────────────────────────────────────────────────
// live: 'gate' | 'reports' → angka diambil langsung dari database.
// deadline: 'HH:MM' → status dihitung real-time terhadap jam sekarang.
// mustToday: tugas wajib harian tanpa jam batas.
// Tugas tanpa live hanya checklist manual (tidak menampilkan angka palsu).

const TASK_GROUPS = [
  {
    id: 'waka',
    short: 'Waka',
    name: 'Waka Kesantrian / Kepala Asrama',
    icon: Shield,
    color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20',
    dot: 'bg-indigo-500',
    bar: 'bg-indigo-500',
    tasks: [
      {
        id: 'waka_gate_approve',
        title: 'Persetujuan Izin Keluar-Masuk',
        desc: 'Review perizinan keluar pesantren santri yang sedang aktif.',
        link: '/boarding/gate',
        live: 'gate'
      },
      {
        id: 'waka_poin_review',
        title: 'Tinjau Laporan Pelanggaran Hari Ini',
        desc: 'Verifikasi kasus pelanggaran disiplin dari laporan yang masuk hari ini.',
        link: '/boarding/behavior',
        live: 'reports'
      },
      {
        id: 'waka_klinik_status',
        title: 'Kontrol Laporan Kesehatan Santri',
        desc: 'Cek daftar santri dirawat di klinik asrama.',
        link: '/boarding/health'
      }
    ]
  },
  {
    id: 'guru',
    short: 'Guru',
    name: 'Guru & Pengajar Kelas',
    icon: BookOpen,
    color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
    dot: 'bg-emerald-500',
    bar: 'bg-emerald-500',
    tasks: [
      {
        id: 'guru_attendance_fill',
        title: 'Input Presensi Harian Kelas',
        desc: 'Isi absensi santri untuk KBM hari ini.',
        link: '/academic/attendance',
        deadline: '14:00'
      },
      {
        id: 'guru_tahfidz_verify',
        title: 'Verifikasi Setoran Hafalan Baru',
        desc: 'Update & verifikasi hafalan juz/surah santri bimbingan.',
        link: '/academic/tahfidz'
      },
      {
        id: 'guru_raport_grades',
        title: 'Input Penilaian Rapor Semester',
        desc: 'Lengkapi input nilai mata pelajaran yang diajar.',
        link: '/academic/raport'
      }
    ]
  },
  {
    id: 'musyrif',
    short: 'Musyrif',
    name: 'Musyrif / Pembina Asrama',
    icon: HeartPulse,
    color: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
    dot: 'bg-purple-500',
    bar: 'bg-purple-500',
    tasks: [
      {
        id: 'musyrif_dorm_check',
        title: 'Pemeriksaan Kebersihan Kamar',
        desc: 'Kontrol harian kebersihan & ketertiban kamar asrama.',
        link: '/boarding/dorms'
      },
      {
        id: 'musyrif_presence_subuh',
        title: 'Presensi Ibadah Santri',
        desc: 'Input laporan kehadiran ibadah shalat berjamaah.',
        link: '/boarding/dorms',
        mustToday: true
      }
    ]
  },
  {
    id: 'finance',
    short: 'Keuangan',
    name: 'Keuangan & Administrasi',
    icon: CreditCard,
    color: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
    dot: 'bg-amber-500',
    bar: 'bg-amber-500',
    tasks: [
      {
        id: 'finance_spp_verify',
        title: 'Verifikasi Pembayaran SPP',
        desc: 'Konfirmasi bukti transfer biaya bulanan santri.',
        link: '/finance/payments'
      },
      {
        id: 'finance_new_students',
        title: 'Validasi Berkas Pendaftar PSB',
        desc: 'Periksa dokumen calon santri baru yang masuk.',
        link: '/master/enrollment'
      }
    ]
  }
]

// ─── UI tokens & potongan kecil (selaras GatePage) ──────────────────────────

const UI = {
  card: 'bg-surface border border-border rounded-2xl',
  cardTitle: 'text-sm font-semibold text-[var(--color-text)] leading-tight',
  hint: 'text-xs text-[var(--color-text-muted)]'
}

const CHIP_COLORS = {
  indigo: 'text-indigo-600 bg-indigo-500/10',
  rose: 'text-rose-600 bg-rose-500/10',
  emerald: 'text-emerald-600 bg-emerald-500/10',
  amber: 'text-amber-600 bg-amber-500/10'
}

const FLAG_TONES = {
  rose: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
  amber: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  slate: 'bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] border-[var(--color-border)]'
}

function StatChip({ icon: Icon, label, value, color }) {
  return (
    <div className="flex items-center gap-2 h-9 pl-1.5 pr-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shrink-0">
      <span className={`w-6 h-6 rounded-md flex items-center justify-center ${CHIP_COLORS[color]}`}>
        <Icon className="w-3.5 h-3.5" />
      </span>
      <span className="text-sm font-semibold tabular-nums text-[var(--color-text)]">{value}</span>
      <span className={`${UI.hint} whitespace-nowrap`}>{label}</span>
    </div>
  )
}

function Kbd({ children }) {
  return (
    <kbd className="px-1.5 py-0.5 rounded border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[10px] font-semibold text-[var(--color-text-muted)]">
      {children}
    </kbd>
  )
}

function TaskRow({ task, isDone, doneAt, loadingLive, onToggle, onOpen }) {
  const hasLive = !!task.live

  return (
    <div
      className={`px-4 py-2.5 flex items-start gap-3 transition-colors ${isDone ? 'bg-[var(--color-surface-alt)]/30' : 'hover:bg-[var(--color-surface-alt)]/20'
        }`}
    >
      <button
        type="button"
        onClick={() => onToggle(task)}
        aria-pressed={isDone}
        aria-label={isDone ? `Batalkan selesai: ${task.title}` : `Tandai selesai: ${task.title}`}
        className="mt-0.5 shrink-0 transition-transform active:scale-90"
      >
        {isDone ? (
          <CheckCircle2 className="w-[18px] h-[18px] text-emerald-500 fill-emerald-500/10" />
        ) : (
          <Circle className="w-[18px] h-[18px] text-[var(--color-text-muted)] hover:text-[var(--color-primary)]" />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className={`text-sm font-semibold leading-tight ${isDone ? 'line-through text-[var(--color-text-muted)] font-medium' : 'text-[var(--color-text)]'
              }`}
          >
            {task.title}
          </span>

          {hasLive && !isDone && loadingLive && (
            <span className="h-4 w-12 rounded bg-[var(--color-surface-alt)] animate-pulse" />
          )}
          {hasLive && !isDone && !loadingLive && task.count > 0 && (
            <span
              title="Data langsung dari database"
              className="px-1.5 py-px rounded bg-rose-500 text-white text-[11px] font-semibold tabular-nums flex items-center gap-1"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              {task.liveLabel}
            </span>
          )}
          {hasLive && !isDone && !loadingLive && task.count === 0 && (
            <span
              title="Data langsung dari database"
              className="px-1.5 py-px rounded bg-emerald-500/10 text-emerald-600 text-[11px] font-semibold flex items-center gap-1"
            >
              <Check className="w-3 h-3" />
              Bersih
            </span>
          )}

          {!isDone && task.flag && (
            <span
              className={`px-1.5 py-px rounded border text-[11px] font-semibold flex items-center gap-1 ${FLAG_TONES[task.flag.tone]}`}
            >
              {task.flag.tone === 'slate' ? (
                <Clock className="w-3 h-3" />
              ) : (
                <AlertTriangle className="w-3 h-3" />
              )}
              {task.flag.text}
            </span>
          )}

          {isDone && doneAt && (
            <span className={`${UI.hint} flex items-center gap-1`}>
              <Check className="w-3 h-3 text-emerald-500" />
              {fmtClock(new Date(doneAt))}
            </span>
          )}
        </div>

        <p
          title={task.desc}
          className={`${UI.hint} mt-0.5 truncate ${isDone ? 'opacity-60' : ''}`}
        >
          {task.desc}
        </p>
      </div>

      <button
        type="button"
        onClick={() => onOpen(task)}
        title="Buka modul"
        className={`self-center shrink-0 h-7 px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${isDone
            ? 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]'
            : 'text-[var(--color-primary)] bg-[var(--color-primary)]/10 hover:bg-[var(--color-primary)]/20'
          }`}
      >
        Buka
        <ArrowRight className="w-3 h-3" />
      </button>
    </div>
  )
}

// ─── Halaman ────────────────────────────────────────────────────────────────

export default function TasksPage() {
  const { profile } = useAuth()
  const { addToast } = useToast()
  const navigate = useNavigate()

  const searchRef = useRef(null)

  // --- Waktu (tick tiap 30 detik agar batas waktu & rollover hari akurat) ---
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), CLOCK_TICK_MS)
    return () => clearInterval(t)
  }, [])
  const todayKey = dateKey(now)

  // --- UI state ---
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState('all') // 'all' | id grup
  const [statusFilter, setStatusFilter] = useState('all') // 'all' | 'pending' | 'done'
  const [confirmReset, setConfirmReset] = useState(false)
  const [dismissedSig, setDismissedSig] = useState('')

  // --- Data live ---
  const [live, setLive] = useState({ gateOut: null, gateOver: 0, reportsToday: null })
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [cooldown, setCooldown] = useState(false)
  const [lastRefresh, setLastRefresh] = useState(null)
  const [loadError, setLoadError] = useState(false)

  // --- Checklist selesai: per user & per hari (otomatis kosong saat hari berganti) ---
  const storageKey = `laporanmu_tasks_${profile?.id || 'anon'}`
  const [doneState, setDoneState] = useState({ key: null, date: '', done: {} })

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      const parsed = raw ? JSON.parse(raw) : null
      if (parsed && parsed.date && parsed.done) {
        setDoneState({ key: storageKey, date: parsed.date, done: parsed.done })
      } else {
        setDoneState({ key: storageKey, date: dateKey(new Date()), done: {} })
      }
    } catch {
      setDoneState({ key: storageKey, date: dateKey(new Date()), done: {} })
    }
  }, [storageKey])

  useEffect(() => {
    if (doneState.key !== storageKey) return
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({ date: doneState.date, done: doneState.done })
      )
    } catch {
      /* penyimpanan penuh / diblokir: abaikan */
    }
  }, [doneState, storageKey])

  const done = doneState.date === todayKey ? doneState.done : {}

  // --- Fetch data live ---
  const fetchLive = useCallback(async ({ manual = false } = {}) => {
    setIsRefreshing(true)
    try {
      const startToday = new Date()
      startToday.setHours(0, 0, 0, 0)

      const [gateRes, reportRes] = await Promise.all([
        supabase
          .from('gate_logs')
          .select('id, check_in, estimated_return')
          .is('check_out', null)
          .neq('visitor_type', 'tamu')
          .limit(500),
        supabase
          .from('reports')
          .select('id', { count: 'exact', head: true })
          .gte('reported_at', startToday.toISOString())
      ])

      const nowMs = Date.now()
      const rows = gateRes.data || []
      const over = rows.filter(
        (r) =>
          nowMs - new Date(r.check_in).getTime() > OVERTIME_MS ||
          (r.estimated_return && new Date(r.estimated_return).getTime() < nowMs)
      ).length

      setLive((prev) => ({
        gateOut: gateRes.error ? prev.gateOut : rows.length,
        gateOver: gateRes.error ? prev.gateOver : over,
        reportsToday: reportRes.error ? prev.reportsToday : reportRes.count || 0
      }))

      const failed = !!(gateRes.error || reportRes.error)
      setLoadError(failed)
      if (!failed) setLastRefresh(new Date())
      if (failed && manual) addToast('Sebagian data gagal dimuat. Coba lagi sebentar.', 'error')
    } catch (err) {
      console.warn('Gagal memuat data Pusat Tugas:', err)
      setLoadError(true)
      if (manual) addToast('Gagal memuat data. Periksa koneksi Anda.', 'error')
    } finally {
      setIsRefreshing(false)
      setLoading(false)
    }
  }, [addToast])

  useEffect(() => {
    fetchLive()
  }, [fetchLive])

  // Auto-refresh tiap 1 menit (berhenti saat tab disembunyikan)
  useEffect(() => {
    const t = setInterval(() => {
      if (!document.hidden) fetchLive()
    }, AUTO_REFRESH_MS)
    return () => clearInterval(t)
  }, [fetchLive])

  useEffect(() => {
    if (!cooldown) return
    const t = setTimeout(() => setCooldown(false), REFRESH_COOLDOWN_MS)
    return () => clearTimeout(t)
  }, [cooldown])

  const handleRefresh = useCallback(() => {
    if (isRefreshing || cooldown) return
    setCooldown(true)
    fetchLive({ manual: true })
  }, [isRefreshing, cooldown, fetchLive])

  // Filter awal mengikuti peran pengguna (sekali saja)
  const didInitFilter = useRef(false)
  useEffect(() => {
    if (didInitFilter.current || !profile?.role) return
    didInitFilter.current = true
    const mapped = ROLE_TO_GROUP[String(profile.role).toLowerCase()]
    if (mapped) setActiveFilter(mapped)
  }, [profile?.role])

  // Reset 2 langkah: klik pertama meminta konfirmasi
  useEffect(() => {
    if (!confirmReset) return
    const t = setTimeout(() => setConfirmReset(false), 4000)
    return () => clearTimeout(t)
  }, [confirmReset])

  // --- Tugas + status turunan (real-time terhadap jam & data live) ---
  const groups = useMemo(() => {
    const nowMin = minutesOfDay(now)
    const nowMs = now.getTime()

    const enrich = (task) => {
      let count = null
      let liveLabel = ''
      let flag = null

      if (task.live === 'gate') {
        count = live.gateOut
        liveLabel = `${count} di luar`
        if (live.gateOver > 0) flag = { tone: 'rose', text: `${live.gateOver} lewat batas` }
      }
      if (task.live === 'reports') {
        count = live.reportsToday
        liveLabel = `${count} laporan`
      }
      if (task.deadline) {
        const left = parseHM(task.deadline) - nowMin
        if (left < 0) flag = { tone: 'rose', text: `Lewat batas ${task.deadline}` }
        else if (left <= 60) flag = { tone: 'amber', text: `Sisa ${fmtMinutes(left)}` }
        else flag = { tone: 'slate', text: `Batas ${task.deadline}` }
      }
      if (task.mustToday && !flag) flag = { tone: 'amber', text: 'Wajib hari ini' }

      return {
        ...task,
        count,
        liveLabel,
        flag,
        urgent: !!flag && flag.tone !== 'slate',
        _nowMs: nowMs
      }
    }

    return TASK_GROUPS.map((g) => ({ ...g, tasks: g.tasks.map(enrich) }))
  }, [now, live])

  const allTasks = useMemo(
    () => groups.flatMap((g) => g.tasks.map((t) => ({ ...t, groupId: g.id, groupName: g.name, groupShort: g.short }))),
    [groups]
  )

  const totalCount = allTasks.length
  const completedCount = allTasks.filter((t) => done[t.id]).length
  const remainingCount = totalCount - completedCount
  const urgentTasks = useMemo(
    () => allTasks.filter((t) => t.urgent && !done[t.id]),
    [allTasks, done]
  )
  const urgentCount = urgentTasks.length
  const progressPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  const groupStats = useMemo(() => {
    const stats = {}
    groups.forEach((g) => {
      const total = g.tasks.length
      const completed = g.tasks.filter((t) => done[t.id]).length
      stats[g.id] = {
        total,
        completed,
        pending: total - completed,
        pct: total > 0 ? Math.round((completed / total) * 100) : 0
      }
    })
    return stats
  }, [groups, done])

  // --- Filter + urutan (mendesak → belum → selesai) ---
  const visibleGroups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    const rank = (t) => (done[t.id] ? 2 : t.urgent ? 0 : 1)

    return groups
      .filter((g) => activeFilter === 'all' || g.id === activeFilter)
      .map((g) => {
        const visibleTasks = g.tasks
          .filter((t) => {
            const isDone = !!done[t.id]
            if (statusFilter === 'pending' && isDone) return false
            if (statusFilter === 'done' && !isDone) return false
            if (!q) return true
            return (
              t.title.toLowerCase().includes(q) ||
              t.desc.toLowerCase().includes(q) ||
              g.name.toLowerCase().includes(q)
            )
          })
          .sort((a, b) => rank(a) - rank(b))
        return { ...g, visibleTasks }
      })
      .filter((g) => g.visibleTasks.length > 0)
  }, [groups, activeFilter, statusFilter, searchQuery, done])

  const hasActiveFilter = activeFilter !== 'all' || statusFilter !== 'all' || searchQuery.trim() !== ''

  // --- Handlers ---
  const auditTask = useCallback((payload) => {
    try {
      Promise.resolve(
        logAudit({
          action: 'UPDATE',
          source: 'OPERATIONAL',
          tableName: 'task_center',
          newData: payload
        })
      ).catch(() => { })
    } catch {
      /* audit tidak boleh mengganggu alur utama */
    }
  }, [])

  const toggleTask = useCallback(
    (task) => {
      const wasDone = !!done[task.id]
      setDoneState((prev) => {
        const base = prev.date === todayKey ? prev.done : {}
        const next = { ...base }
        if (wasDone) delete next[task.id]
        else next[task.id] = new Date().toISOString()
        return { key: storageKey, date: todayKey, done: next }
      })
      if (!wasDone) addToast(`Selesai: ${task.title}`, 'success')
      auditTask({ task_id: task.id, done: !wasDone })
    },
    [done, todayKey, storageKey, addToast, auditTask]
  )

  const completeGroup = useCallback(
    (group) => {
      const pendingIds = group.tasks.filter((t) => !done[t.id]).map((t) => t.id)
      if (pendingIds.length === 0) return
      const stamp = new Date().toISOString()
      setDoneState((prev) => {
        const base = prev.date === todayKey ? prev.done : {}
        const next = { ...base }
        pendingIds.forEach((id) => {
          next[id] = stamp
        })
        return { key: storageKey, date: todayKey, done: next }
      })
      addToast(`${pendingIds.length} tugas ${group.short} ditandai selesai.`, 'success')
      auditTask({ group_id: group.id, done_all: pendingIds })
    },
    [done, todayKey, storageKey, addToast, auditTask]
  )

  const handleReset = () => {
    if (!confirmReset) {
      setConfirmReset(true)
      return
    }
    setDoneState({ key: storageKey, date: todayKey, done: {} })
    setConfirmReset(false)
    addToast('Progres tugas hari ini di-reset.', 'info')
    auditTask({ reset: true })
  }

  const openModule = useCallback((task) => navigate(task.link), [navigate])

  const clearFilters = () => {
    setActiveFilter('all')
    setStatusFilter('all')
    setSearchQuery('')
  }

  // --- Pintasan keyboard: / cari · R refresh · 0 semua peran · 1-4 peran ---
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const tag = document.activeElement?.tagName
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) {
        if (e.key === 'Escape') document.activeElement.blur()
        return
      }
      const key = e.key.toLowerCase()
      if (key === '/') {
        e.preventDefault()
        searchRef.current?.focus()
      } else if (key === 'r') {
        e.preventDefault()
        handleRefresh()
      } else if (key === '0') {
        setActiveFilter('all')
      } else if (/^[1-9]$/.test(key)) {
        const g = TASK_GROUPS[Number(key) - 1]
        if (g) setActiveFilter(g.id)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleRefresh])

  // --- Banner mendesak (muncul lagi jika ada tugas mendesak baru) ---
  const urgentSig = urgentTasks.map((t) => t.id).sort().join('|')
  const showBanner = urgentCount > 0 && dismissedSig !== urgentSig

  const STATUS_TABS = [
    { key: 'all', label: 'Semua', n: totalCount },
    { key: 'pending', label: 'Belum', n: remainingCount },
    { key: 'done', label: 'Selesai', n: completedCount }
  ]

  return (
    <DashboardLayout title="Pusat Tugas">
      <div>
        {/* PAGE HEADER */}
        <PageHeader
          badge="Operational"
          breadcrumbs={['Pusat Tugas']}
          title="Pusat Tugas Staf & Guru"
          subtitle="Dashboard koordinasi harian dan checklist verifikasi tugas operasional pesantren."
          actions={
            <div className="flex items-center gap-3">
              <LiveClock />
              <div className="flex items-center gap-2">
                <button
                  onClick={handleReset}
                  disabled={completedCount === 0}
                  title="Reset progres tugas hari ini"
                  className={`h-9 px-3 rounded-lg border text-xs font-semibold uppercase tracking-wider transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 ${confirmReset
                      ? 'bg-rose-500 border-rose-500 text-white'
                      : 'bg-[var(--color-surface-alt)] border-[var(--color-border)] text-[var(--color-text-muted)] enabled:hover:text-rose-500 enabled:hover:border-rose-500/30'
                    }`}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{confirmReset ? 'Yakin? Klik lagi' : 'Reset'}</span>
                </button>
                <button
                  onClick={handleRefresh}
                  disabled={isRefreshing || cooldown}
                  title="Muat ulang data (R)"
                  className="h-9 w-9 rounded-lg border flex items-center justify-center transition-all bg-[var(--color-surface-alt)] border-[var(--color-border)] text-[var(--color-text-muted)] enabled:hover:text-[var(--color-text)] enabled:hover:bg-[var(--color-border)] enabled:active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>
          }
        />

        {/* RINGKASAN: ring + info + statistik dalam satu kartu */}
        <div className={`${UI.card} px-4 py-3 mb-3 flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-5`}>
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="relative w-14 h-14 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke="var(--color-border)" strokeWidth="10" />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke={progressPercentage === 100 ? '#10b981' : 'var(--color-primary)'}
                  strokeWidth="10"
                  strokeDasharray={2 * Math.PI * 42}
                  strokeDashoffset={2 * Math.PI * 42 * (1 - progressPercentage / 100)}
                  strokeLinecap="round"
                  className="transition-all duration-500"
                />
              </svg>
              <span className="absolute text-sm font-bold tracking-tight text-[var(--color-text)] tabular-nums">
                {progressPercentage}%
              </span>
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-[var(--color-text)] tracking-tight leading-tight">
                Tugas Hari Ini
                {progressPercentage === 100 && (
                  <span className="ms-2 inline-flex items-center gap-1 text-xs text-emerald-600 font-semibold align-middle">
                    <Sparkles className="w-3.5 h-3.5" />
                    Semua beres
                  </span>
                )}
              </h2>
              <p className={`${UI.hint} mt-0.5 flex items-center gap-x-2 flex-wrap`}>
                <span>
                  {now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}
                </span>
                <span className="flex items-center gap-1.5">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${loadError ? 'bg-rose-500' : isRefreshing ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'
                      }`}
                  />
                  {loadError
                    ? 'Sebagian data gagal dimuat'
                    : lastRefresh
                      ? `Diperbarui ${fmtClock(lastRefresh)}`
                      : 'Memuat data…'}
                </span>
              </p>
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto scrollbar-hide lg:ms-auto">
            <StatChip icon={ListChecks} label="Total" value={totalCount} color="indigo" />
            <StatChip icon={CheckCircle2} label="Selesai" value={completedCount} color="emerald" />
            <StatChip icon={AlertTriangle} label="Mendesak" value={urgentCount} color="rose" />
            <StatChip icon={Clock} label="Tersisa" value={remainingCount} color="amber" />
          </div>
        </div>

        {/* FILTER BAR: status + peran + cari dalam satu baris */}
        <div className="flex flex-col xl:flex-row xl:items-center gap-2.5 p-1.5 mb-3 rounded-2xl bg-[var(--color-surface-alt)]/60 border border-[var(--color-border)]">
          {/* Status */}
          <div className="flex gap-1 p-1 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] w-full xl:w-fit shrink-0">
            {STATUS_TABS.map((tab) => {
              const on = statusFilter === tab.key
              return (
                <button
                  key={tab.key}
                  onClick={() => setStatusFilter(tab.key)}
                  className={`flex-1 xl:flex-none h-8 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all whitespace-nowrap ${on
                      ? 'bg-[var(--color-primary)] text-white shadow-sm'
                      : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                    }`}
                >
                  {tab.label}
                  <span
                    className={`px-1.5 rounded-full tabular-nums ${on ? 'bg-white/20 text-white' : 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                      }`}
                  >
                    {tab.n}
                  </span>
                </button>
              )
            })}
          </div>

          <div className="hidden xl:block w-px h-6 bg-[var(--color-border)] shrink-0" />

          {/* Peran */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide xl:flex-1 min-w-0">
            <button
              onClick={() => setActiveFilter('all')}
              title="Tekan 0"
              className={`h-8 px-3 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${activeFilter === 'all'
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                  : 'bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                }`}
            >
              Semua Peran
            </button>
            {groups.map((g, i) => {
              const s = groupStats[g.id]
              const on = activeFilter === g.id
              return (
                <button
                  key={g.id}
                  onClick={() => setActiveFilter(g.id)}
                  title={`Tekan ${i + 1}`}
                  className={`h-8 px-2.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${on
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                      : 'bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                    }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${g.dot}`} />
                  {g.short}
                  <span
                    className={`px-1.5 rounded-full tabular-nums ${s.pending > 0
                        ? on
                          ? 'bg-white/20 dark:bg-slate-900/10'
                          : 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                        : 'opacity-50'
                      }`}
                  >
                    {s.pending}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Cari */}
          <div className="relative w-full xl:w-60 shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)] pointer-events-none" />
            <input
              ref={searchRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari tugas…  ( / )"
              className="w-full h-9 pl-9 pr-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm outline-none focus:border-[var(--color-primary)] transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded-md flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                aria-label="Hapus pencarian"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* DAFTAR TUGAS */}
        {visibleGroups.length === 0 ? (
          <EmptyState
            variant="plain"
            color="slate"
            icon={Sparkles}
            title={hasActiveFilter ? 'Tidak ada tugas ditemukan' : 'Belum ada tugas'}
            description={
              hasActiveFilter
                ? 'Tidak ada tugas yang cocok dengan filter atau pencarian Anda.'
                : 'Belum ada tugas yang terdaftar untuk hari ini.'
            }
            action={
              hasActiveFilter && (
                <button
                  onClick={clearFilters}
                  className="h-8 px-4 rounded-xl border border-[var(--color-border)] text-xs font-bold text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-all"
                >
                  Reset Filter
                </button>
              )
            }
          />
        ) : (
          <div className="grid md:grid-cols-2 gap-3 items-start animate-in fade-in duration-200">
            {visibleGroups.map((group) => {
              const s = groupStats[group.id]
              const Icon = group.icon
              return (
                <div key={group.id} className={`${UI.card} overflow-hidden`}>
                  <div className="relative px-4 py-2.5 border-b border-[var(--color-border)] bg-[var(--color-surface-alt)]/30">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 ${group.color}`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <h3 className={`${UI.cardTitle} truncate`}>{group.name}</h3>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {s.pending > 0 && (
                          <button
                            onClick={() => completeGroup(group)}
                            title="Tandai semua tugas peran ini selesai"
                            className="h-6 px-2 rounded-md text-xs font-semibold text-[var(--color-text-muted)] hover:text-emerald-600 hover:bg-emerald-500/10 transition-all active:scale-95"
                          >
                            Selesaikan semua
                          </button>
                        )}
                        <span className="px-1.5 py-0.5 rounded-md text-xs font-semibold tabular-nums bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text-muted)]">
                          {s.completed}/{s.total}
                        </span>
                      </div>
                    </div>
                    <div
                      className={`absolute bottom-0 left-0 h-0.5 transition-all duration-500 ${group.bar}`}
                      style={{ width: `${s.pct}%` }}
                    />
                  </div>

                  <div className="divide-y divide-[var(--color-border)]">
                    {group.visibleTasks.map((task) => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        isDone={!!done[task.id]}
                        doneAt={done[task.id]}
                        loadingLive={loading}
                        onToggle={toggleTask}
                        onOpen={openModule}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* PETUNJUK PINTASAN */}
        <div className="mt-4 pt-2.5 border-t border-[var(--color-border)]/40 hidden md:flex items-center gap-2 flex-wrap">
          <Keyboard className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
          <span className={`${UI.hint} font-semibold uppercase tracking-wide`}>Pintasan</span>
          <span className={UI.hint}>
            <Kbd>/</Kbd> cari
          </span>
          <span className={UI.hint}>
            <Kbd>R</Kbd> muat ulang
          </span>
          <span className={UI.hint}>
            <Kbd>0</Kbd> semua peran
          </span>
          <span className={UI.hint}>
            <Kbd>1</Kbd>–<Kbd>{TASK_GROUPS.length}</Kbd> pilih peran
          </span>
        </div>
      </div>

      {/* Banner tugas mendesak */}
      {showBanner && (
        <div className="fixed bottom-24 sm:bottom-6 right-4 sm:right-6 z-[100] w-auto max-w-[calc(100vw-2rem)] sm:w-80 bg-red-600/95 rounded-2xl shadow-xl p-4 border border-red-400/20 animate-in slide-in-from-right-8 duration-500">
          <div className="flex items-center gap-2 mb-3">
            <Bell className="text-white animate-bounce w-4 h-4" />
            <p className="text-xs font-bold text-white">Tugas Mendesak</p>
            <span className="ms-auto text-xs font-bold bg-white/20 text-white px-2 py-0.5 rounded-full tabular-nums">
              {urgentCount}
            </span>
            <button
              onClick={() => setDismissedSig(urgentSig)}
              className="w-6 h-6 flex items-center justify-center rounded-lg bg-white/20 hover:bg-white/30 text-white transition-all shrink-0"
              title="Tutup notifikasi"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-2">
            {urgentTasks.slice(0, 4).map((t) => (
              <button
                key={t.id}
                onClick={() => navigate(t.link)}
                className="w-full flex items-center justify-between gap-2 bg-white/15 hover:bg-white/25 rounded-xl px-3 py-2 transition-colors text-left"
              >
                <p className="text-xs font-bold text-white truncate">{t.title}</p>
                <span className="text-xs font-bold text-white/80 shrink-0">{t.flag?.text}</span>
              </button>
            ))}
            {urgentCount > 4 && (
              <p className="text-xs text-white/70 font-semibold text-center">+{urgentCount - 4} lainnya</p>
            )}
          </div>
          <p className="text-xs text-white/60 font-bold text-center mt-3">Klik × untuk sembunyikan sementara</p>
        </div>
      )}
    </DashboardLayout>
  )
}