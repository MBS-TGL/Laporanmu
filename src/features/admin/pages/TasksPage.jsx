import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faPlay, faCircleCheck, faCircleXmark,
    faClockRotateLeft, faTriangleExclamation,
    faBolt, faClock, faBroom, faChartLine,
    faSpinner, faTrashAlt, faHistory, faFilter, faXmark,
    faDownload,
} from '@fortawesome/free-solid-svg-icons'
import DashboardLayout from '@core/layouts/DashboardLayout'
import Breadcrumb from '@shared/components/Breadcrumb'
import { useToast } from '@context/Toast'
import { useAuth } from '@context/Auth'
import { supabase } from '@lib/supabase'
import { logAudit } from '@utils/auditLogger'

// ─── Constants ────────────────────────────────────────────────────────────────

const LOGS_STORAGE_KEY = 'laporanmu_task_logs'
const MAX_STORED_LOGS = 100

const INITIAL_TASKS = [
    {
        id: 'sync_stats',
        name: 'Sinkronisasi Statistik',
        desc: 'Menghitung ulang total poin, rata-rata kelas, dan ranking untuk seluruh siswa.',
        icon: faChartLine, color: 'text-indigo-500', bg: 'bg-indigo-500/10',
        destructive: false,
        status: 'idle', lastRun: null, duration: '—', progress: 0,
    },
    {
        id: 'cleanup_orphans',
        name: 'Pembersihan Data Orphan',
        desc: 'Menghapus poin dan histori kelas yang tidak memiliki entri siswa valid.',
        icon: faBroom, color: 'text-amber-500', bg: 'bg-amber-500/10',
        destructive: true,
        status: 'idle', lastRun: null, duration: '—', progress: 0,
    },
    {
        id: 'rotate_logs',
        name: 'Rotasi Audit Logs',
        desc: 'Mengarsipkan audit logs lama (di atas 45 hari) untuk menjaga performa query.',
        icon: faClockRotateLeft, color: 'text-emerald-500', bg: 'bg-emerald-500/10',
        destructive: true,
        status: 'idle', lastRun: null, duration: '—', progress: 0,
    },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatRelative = (iso) => {
    if (!iso) return '—'
    const diff = Date.now() - new Date(iso).getTime()
    const m = Math.floor(diff / 60000), h = Math.floor(diff / 3600000), d = Math.floor(diff / 86400000)
    if (m < 1) return 'Baru saja'
    if (m < 60) return `${m} menit lalu`
    if (h < 24) return `${h} jam lalu`
    return `${d} hari lalu`
}

const formatAbsolute = (iso) => {
    if (!iso) return '—'
    return new Date(iso).toLocaleString('id-ID', {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    })
}

const loadLogs = () => {
    try { return JSON.parse(localStorage.getItem(LOGS_STORAGE_KEY) || '[]') } catch { return [] }
}

// ─── Real Task Runners ────────────────────────────────────────────────────────

const taskRunners = {
    // Hanya SELECT — aman, tidak destruktif
    sync_stats: async (onProgress, cancelledRef) => {
        onProgress(15)
        const { count: s, error: e1 } = await supabase
            .from('students').select('*', { count: 'exact', head: true }).is('deleted_at', null)
        if (e1) throw new Error(e1.message)
        if (cancelledRef.current) throw new Error('Dibatalkan oleh user')

        onProgress(45)
        const { count: r, error: e2 } = await supabase
            .from('reports').select('*', { count: 'exact', head: true })
        if (e2) throw new Error(e2.message)
        if (cancelledRef.current) throw new Error('Dibatalkan oleh user')

        onProgress(80)
        const { count: c, error: e3 } = await supabase
            .from('classes').select('*', { count: 'exact', head: true })
        if (e3) throw new Error(e3.message)

        onProgress(100)
        return `${s ?? 0} siswa aktif, ${r ?? 0} poin, ${c ?? 0} kelas tersinkronisasi`
    },

    // Hapus orphan dari reports & student_class_history
    // (tabel yang punya FK ke students berdasarkan hasil cek)
    cleanup_orphans: async (onProgress, cancelledRef) => {
        onProgress(10)

        // Ambil ID semua siswa aktif (belum di-soft-delete)
        const { data: students, error: e1 } = await supabase
            .from('students').select('id').is('deleted_at', null)
        if (e1) throw new Error(e1.message)
        if (cancelledRef.current) throw new Error('Dibatalkan oleh user')

        const ids = (students || []).map(s => s.id)
        if (ids.length === 0) {
            onProgress(100)
            return '0 data orphan ditemukan (tidak ada siswa aktif)'
        }

        const idList = `(${ids.join(',')})`

        onProgress(30)
        // Hapus orphan di reports
        const { count: rc, error: e2 } = await supabase
            .from('reports')
            .delete({ count: 'exact' })
            .not('student_id', 'in', idList)
        if (e2) throw new Error(e2.message)
        if (cancelledRef.current) throw new Error('Dibatalkan oleh user')

        onProgress(60)
        // Hapus orphan di student_class_history
        const { count: hc, error: e3 } = await supabase
            .from('student_class_history')
            .delete({ count: 'exact' })
            .not('student_id', 'in', idList)
        if (e3) throw new Error(e3.message)

        onProgress(100)
        const total = (rc ?? 0) + (hc ?? 0)
        return `${total} data orphan dihapus — ${rc ?? 0} poin, ${hc ?? 0} histori kelas`
    },

    // Hapus audit_logs lebih dari 45 hari
    rotate_logs: async (onProgress, cancelledRef) => {
        onProgress(20)
        const cutoff = new Date()
        cutoff.setDate(cutoff.getDate() - 45)
        if (cancelledRef.current) throw new Error('Dibatalkan oleh user')

        onProgress(50)
        const { count, error } = await supabase
            .from('audit_logs')
            .delete({ count: 'exact' })
            .lt('created_at', cutoff.toISOString())
        if (error) throw new Error(error.message)

        onProgress(100)
        return `${count ?? 0} audit log dihapus (lebih dari 45 hari)`
    },
}

// ─── Confirm Modal ────────────────────────────────────────────────────────────

function ConfirmModal({ task, onConfirm, onCancel }) {
    if (!task) return null
    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
            <div className="relative w-full max-w-sm bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[2rem] shadow-2xl p-6 animate-in zoom-in-95 duration-200">
                <div className="flex flex-col items-center text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 text-2xl">
                        <FontAwesomeIcon icon={faTriangleExclamation} />
                    </div>
                    <div>
                        <h3 className="text-base font-black text-[var(--color-text)]">Jalankan "{task.name}"?</h3>
                        <p className="text-[11px] text-[var(--color-text-muted)] mt-2 leading-relaxed">
                            Task ini bersifat <span className="font-black text-amber-500">destruktif</span> — data yang dihapus tidak bisa dikembalikan. Pastikan sudah ada backup sebelum melanjutkan.
                        </p>
                    </div>
                    <div className="flex w-full gap-3 pt-2">
                        <button onClick={onCancel}
                            className="flex-1 h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[10px] font-black uppercase tracking-widest hover:bg-[var(--color-border)] transition-colors">
                            Batal
                        </button>
                        <button onClick={onConfirm}
                            className="flex-1 h-11 rounded-xl bg-amber-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-amber-600 active:scale-95 transition-all flex items-center justify-center gap-2">
                            <FontAwesomeIcon icon={faPlay} className="text-xs" /> Lanjutkan
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TasksPage() {
    const { addToast } = useToast()
    const { profile } = useAuth()
    const [tasks, setTasks] = useState(INITIAL_TASKS)
    const [logs, setLogs] = useState(() => loadLogs())
    const [searchLog, setSearchLog] = useState('')
    const [pendingTask, setPendingTask] = useState(null)
    const cancelledRef = useRef(false)

    const isAnyRunning = useMemo(() => tasks.some(t => t.status === 'running'), [tasks])

    // Persist logs
    useEffect(() => {
        try { localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(logs.slice(0, MAX_STORED_LOGS))) } catch { }
    }, [logs])

    const setTaskState = useCallback((id, patch) =>
        setTasks(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t)), [])

    const executeTask = useCallback(async (id) => {
        const tObj = tasks.find(t => t.id === id)
        if (!tObj || isAnyRunning) return
        cancelledRef.current = false
        setTaskState(id, { status: 'running', progress: 0 })
        const startTime = Date.now()
        try {
            const runner = taskRunners[id]
            if (!runner) throw new Error('Task runner tidak ditemukan')
            const resultMsg = await runner(
                (p) => { if (!cancelledRef.current) setTaskState(id, { progress: p }) },
                cancelledRef
            )
            if (cancelledRef.current) {
                setTaskState(id, { status: 'idle', progress: 0 })
                addToast('Task dihentikan oleh user', 'info')
                return
            }
            const duration = ((Date.now() - startTime) / 1000).toFixed(1) + 's'
            const now = new Date().toISOString()
            setTaskState(id, { status: 'success', progress: 100, lastRun: now, duration })
            setLogs(prev => [{ id: Date.now(), task: id, status: 'success', timestamp: now, msg: resultMsg, duration }, ...prev])
            addToast(`"${tObj.name}" selesai!`, 'success')
            await logAudit({
                action: 'EXECUTE',
                source: 'SYSTEM',
                tableName: 'tasks',
                recordId: id,
                newData: { task: id, status: 'success', msg: resultMsg, duration }
            })
        } catch (err) {
            const now = new Date().toISOString()
            setTaskState(id, { status: 'error', progress: 0, lastRun: now })
            setLogs(prev => [{ id: Date.now(), task: id, status: 'error', timestamp: now, msg: err?.message || 'Error tidak diketahui', duration: '—' }, ...prev])
            if (!cancelledRef.current) addToast(`Task gagal: ${err?.message}`, 'error')
            await logAudit({
                action: 'EXECUTE',
                source: 'SYSTEM',
                tableName: 'tasks',
                recordId: id,
                newData: { task: id, status: 'error', msg: err?.message }
            })
        }
    }, [tasks, isAnyRunning, setTaskState, addToast])

    const handleRunClick = useCallback((task) => {
        if (isAnyRunning || task.status === 'running') return
        task.destructive ? setPendingTask(task) : executeTask(task.id)
    }, [isAnyRunning, executeTask])

    const handleConfirm = useCallback(() => {
        const id = pendingTask?.id
        setPendingTask(null)
        if (id) executeTask(id)
    }, [pendingTask, executeTask])

    const cancelTask = useCallback((id) => {
        cancelledRef.current = true
        setTaskState(id, { status: 'idle', progress: 0 })
    }, [setTaskState])

    const exportLogs = useCallback(() => {
        if (!logs.length) { addToast('Tidak ada log untuk diekspor', 'info'); return }
        const rows = [['Task', 'Status', 'Waktu', 'Durasi', 'Pesan'],
        ...logs.map(l => [
            tasks.find(t => t.id === l.task)?.name || l.task,
            l.status, formatAbsolute(l.timestamp),
            l.duration || '—', l.msg,
        ])]
        const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
        const a = document.createElement('a')
        a.href = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }))
        a.download = `task-logs-${new Date().toISOString().slice(0, 10)}.csv`
        a.click()
        addToast('Log diekspor ke CSV', 'success')
    }, [logs, tasks, addToast])

    const clearLogs = useCallback(() => {
        setLogs([]); localStorage.removeItem(LOGS_STORAGE_KEY); addToast('Log dihapus', 'info')
    }, [addToast])

    const filteredLogs = useMemo(() => logs.filter(l =>
        tasks.find(t => t.id === l.task)?.name.toLowerCase().includes(searchLog.toLowerCase()) ||
        l.msg.toLowerCase().includes(searchLog.toLowerCase())
    ), [logs, tasks, searchLog])

    return (
        <DashboardLayout title="Background Tasks">
            <div className="p-4 md:p-6 space-y-6 min-h-[80vh]">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <Breadcrumb badge="Admin" items={['Background Tasks']} className="mb-1" />
                        <div className="flex items-center gap-2.5 mb-1 flex-wrap">
                            <h1 className="text-2xl font-black font-heading tracking-tight text-[var(--color-text)]">Background Tasks</h1>
                            <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 uppercase tracking-widest">Direct Query</span>
                        </div>
                        <p className="text-[var(--color-text-muted)] text-[11px] font-medium opacity-70">
                            Picu fungsi komputasi berat secara manual tanpa menunggu jadwal cron.
                        </p>
                    </div>
                </div>

                <div className="grid lg:grid-cols-3 gap-6 items-start">
                    {/* Tasks */}
                    <div className="lg:col-span-2 space-y-6 order-last lg:order-first">
                        <section className="space-y-4">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Tersedia untuk Trigger</span>
                                <div className="h-px bg-[var(--color-border)] flex-1" />
                                {isAnyRunning && (
                                    <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 uppercase tracking-widest animate-pulse">
                                        Task sedang berjalan
                                    </span>
                                )}
                            </div>

                            {tasks.map(task => {
                                const isRunning = task.status === 'running'
                                const isDisabled = isAnyRunning && !isRunning
                                return (
                                    <div key={task.id}
                                        className={`relative glass rounded-[2rem] border transition-all duration-300 ${isRunning
                                            ? 'border-[var(--color-primary)] ring-4 ring-[var(--color-primary)]/5 p-6'
                                            : isDisabled
                                                ? 'border-[var(--color-border)] p-5 opacity-50'
                                                : 'border-[var(--color-border)] p-5 hover:border-[var(--color-text-muted)]/30'}`}>

                                        {isRunning && (
                                            <div className="absolute top-0 left-0 right-0 h-1.5 bg-[var(--color-surface-alt)] overflow-hidden rounded-t-[2rem]">
                                                <div className="h-full bg-[var(--color-primary)] transition-all duration-700 ease-out relative"
                                                    style={{ width: `${task.progress}%` }}>
                                                    <div className="absolute top-0 right-0 bottom-0 w-20 bg-gradient-to-r from-transparent to-white/30 animate-pulse" />
                                                </div>
                                            </div>
                                        )}

                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                            <div className="flex items-start sm:items-center gap-4 sm:gap-5">
                                                <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-inner ${task.bg}`}>
                                                    <FontAwesomeIcon icon={task.icon}
                                                        className={`text-xl sm:text-2xl ${task.color} ${isRunning ? 'animate-bounce' : ''}`} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1">
                                                        <h2 className="text-[14px] sm:text-[15px] font-black text-[var(--color-text)] leading-tight">{task.name}</h2>
                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                            {isRunning && (
                                                                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-[9px] font-black uppercase tracking-tighter animate-pulse w-fit">
                                                                    <FontAwesomeIcon icon={faSpinner} className="animate-spin" /> Sedang Diproses
                                                                </span>
                                                            )}
                                                            {task.destructive && !isRunning && (
                                                                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 text-[8px] font-black uppercase tracking-tighter w-fit">
                                                                    <FontAwesomeIcon icon={faTriangleExclamation} className="text-[7px]" /> Destruktif
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <p className="text-[11px] text-[var(--color-text-muted)] font-medium max-w-full sm:max-w-md">{task.desc}</p>
                                                    <div className="flex items-center gap-3 mt-3 flex-wrap">
                                                        <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">
                                                            <FontAwesomeIcon icon={faClockRotateLeft} className="opacity-60" />
                                                            Terakhir:
                                                            <span className="text-[var(--color-text)]" title={formatAbsolute(task.lastRun)}>
                                                                {task.lastRun ? formatRelative(task.lastRun) : 'Belum pernah'}
                                                            </span>
                                                        </div>
                                                        {task.duration !== '—' && (
                                                            <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">
                                                                <FontAwesomeIcon icon={faBolt} className="opacity-60" />
                                                                Durasi: <span className="text-[var(--color-text)]">{task.duration}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                                                {isRunning ? (
                                                    <div className="flex flex-row sm:flex-col items-center gap-2">
                                                        <span className="text-[14px] font-black tabular-nums text-[var(--color-primary)]">{task.progress}%</span>
                                                        <button onClick={() => cancelTask(task.id)}
                                                            className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all active:scale-90 flex items-center justify-center"
                                                            title="Hentikan task">
                                                            <FontAwesomeIcon icon={faXmark} className="text-sm" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button onClick={() => handleRunClick(task)} disabled={isDisabled}
                                                        className="group h-11 px-4 sm:px-6 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] text-[12px] font-black hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] disabled:cursor-not-allowed transition-all flex items-center gap-2 sm:gap-3 shadow-sm hover:shadow-md active:scale-95 disabled:active:scale-100">
                                                        <div className="w-7 h-7 rounded-lg bg-[var(--color-surface-alt)] flex items-center justify-center group-hover:bg-[var(--color-primary)]/10 transition-colors">
                                                            <FontAwesomeIcon icon={faPlay} className="text-[9px] group-hover:scale-125 transition-transform" />
                                                        </div>
                                                        <span className="hidden sm:inline">Run Task</span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </section>

                        {/* Logs */}
                        <section className="glass rounded-[2rem] border border-[var(--color-border)] overflow-hidden">
                            <div className="p-4 sm:p-5 border-b border-[var(--color-border)] bg-[var(--color-surface-alt)]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-xl bg-slate-500/10 text-slate-500 flex items-center justify-center shrink-0">
                                        <FontAwesomeIcon icon={faHistory} />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-sm text-[var(--color-text)]">Audit Log Eksekusi</h3>
                                        <p className="text-[9px] text-[var(--color-text-muted)] opacity-60 font-bold uppercase tracking-widest mt-0.5">{logs.length} entri · persisten</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="relative flex-1 sm:flex-none">
                                        <FontAwesomeIcon icon={faFilter} className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-[var(--color-text-muted)] pointer-events-none" />
                                        <input type="text" placeholder="Cari log..." value={searchLog}
                                            onChange={e => setSearchLog(e.target.value)}
                                            className="h-8 pl-8 pr-3 w-full sm:w-48 text-[11px] font-medium bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl outline-none focus:border-[var(--color-primary)] transition-all" />
                                    </div>
                                    {logs.length > 0 && (
                                        <>
                                            <button onClick={exportLogs} title="Export CSV"
                                                className="h-8 px-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)]/30 transition-colors flex items-center gap-1.5 text-[10px] font-black shrink-0">
                                                <FontAwesomeIcon icon={faDownload} className="text-[9px]" />
                                                <span className="hidden sm:inline">CSV</span>
                                            </button>
                                            <button onClick={clearLogs} title="Hapus semua log"
                                                className="h-8 px-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-rose-500 hover:border-rose-500/30 transition-colors flex items-center gap-1.5 text-[10px] font-black shrink-0">
                                                <FontAwesomeIcon icon={faTrashAlt} className="text-[9px]" />
                                                <span className="hidden sm:inline">Hapus</span>
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                            <div className="divide-y divide-[var(--color-border)] max-h-[400px] overflow-y-auto">
                                {filteredLogs.length === 0 ? (
                                    <div className="p-10 text-center text-[var(--color-text-muted)] text-[11px] font-bold opacity-50">
                                        {logs.length === 0 ? 'Belum ada log eksekusi' : 'Tidak ada log yang sesuai'}
                                    </div>
                                ) : filteredLogs.map(log => {
                                    const taskInfo = tasks.find(t => t.id === log.task)
                                    return (
                                        <div key={log.id} className="p-3 sm:p-4 flex items-start sm:items-center justify-between gap-3 transition-colors hover:bg-[var(--color-surface-alt)]/20">
                                            <div className="flex items-start sm:items-center gap-3 sm:gap-4 min-w-0">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${log.status === 'success' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                                    <FontAwesomeIcon icon={log.status === 'success' ? faCircleCheck : faCircleXmark} className="text-xs" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-[11px] font-black text-[var(--color-text)] truncate">{taskInfo?.name || 'Unknown Task'}</p>
                                                    <p className="text-[10px] text-[var(--color-text-muted)] font-medium mt-0.5 leading-relaxed">{log.msg}</p>
                                                </div>
                                            </div>
                                            <div className="text-right shrink-0 ml-auto">
                                                <p className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest whitespace-nowrap"
                                                    title={formatAbsolute(log.timestamp)}>
                                                    {formatRelative(log.timestamp)}
                                                </p>
                                                <div className="flex items-center gap-1.5 justify-end mt-0.5">
                                                    {log.duration && log.duration !== '—' && (
                                                        <span className="text-[8px] text-[var(--color-text-muted)] opacity-50 font-bold">{log.duration}</span>
                                                    )}
                                                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter ${log.status === 'success' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`}>
                                                        {log.status}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </section>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-4 lg:order-last order-first">
                        <div className="glass rounded-[1.5rem] border border-[var(--color-border)] p-5">
                            <div className="flex items-center gap-3 mb-4">
                                <FontAwesomeIcon icon={faClock} className="text-[var(--color-text-muted)] text-lg" />
                                <h3 className="font-black text-sm text-[var(--color-text)]">Jadwal Otomatis (Cron)</h3>
                            </div>
                            <div className="space-y-4 relative">
                                <div className="absolute left-[5px] top-2 bottom-2 w-px bg-[var(--color-border)]" />
                                {[
                                    { time: '00:00', label: 'Backup Database Harian' },
                                    { time: '02:00', label: 'Sinkronisasi Absensi Mesin' },
                                    { time: 'Setiap jam', label: 'Proses Antrean WhatsApp' },
                                ].map((c, i) => (
                                    <div key={i} className="relative pl-6">
                                        <div className="absolute left-0 top-[3px] w-[11px] h-[11px] rounded-full bg-[var(--color-primary)] border-2 border-[var(--color-surface)]" />
                                        <p className="text-[11px] font-black text-[var(--color-primary)]">{c.time}</p>
                                        <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">{c.label}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Log stats */}
                        <div className="glass rounded-[1.5rem] border border-[var(--color-border)] p-5 space-y-3">
                            <h3 className="font-black text-sm text-[var(--color-text)]">Statistik Log</h3>
                            {[
                                { label: 'Total eksekusi', value: logs.length },
                                { label: 'Berhasil', value: logs.filter(l => l.status === 'success').length, color: 'text-emerald-500' },
                                { label: 'Gagal', value: logs.filter(l => l.status === 'error').length, color: 'text-rose-500' },
                            ].map((s, i) => (
                                <div key={i} className="flex items-center justify-between">
                                    <span className="text-[11px] text-[var(--color-text-muted)] font-medium">{s.label}</span>
                                    <span className={`text-[13px] font-black ${s.color || 'text-[var(--color-text)]'}`}>{s.value}</span>
                                </div>
                            ))}
                        </div>

                        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600/90 text-[11px] leading-relaxed flex gap-3">
                            <FontAwesomeIcon icon={faTriangleExclamation} className="mt-0.5 shrink-0" />
                            <p>Menjalankan fungsi secara manual dapat memberatkan database. Pastikan tidak ada user lain yang sedang melakukan ekspor data masif.</p>
                        </div>
                    </div>
                </div>
            </div>

            <ConfirmModal task={pendingTask} onConfirm={handleConfirm} onCancel={() => setPendingTask(null)} />
        </DashboardLayout>
    )
}