import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { supabase } from '@lib/supabase'
import DashboardLayout from '@core/layouts/DashboardLayout'
import Breadcrumb from '@shared/components/Breadcrumb'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faShieldHalved, faRotateRight, faFilter, faSearch,
    faXmark, faChevronLeft, faChevronRight, faCircleInfo, faKey,
    faUsers, faBolt, faDatabase, faFileExport, faEraser, faSpinner,
    faAngleDown, faHistory, faTrashRestore, faGlobe, faMicrochip,
    faLink, faCircle, faDesktop, faInfoCircle, faChartLine,
    faPlus, faPen, faTrash, faSync, faTools, faClock,
    faUserShield, faCheckCircle, faExclamationTriangle,
    faStopwatch, faFingerprint
} from '@fortawesome/free-solid-svg-icons'
import { useToast } from '@context/Toast'
import { useAuth } from '@context/Auth'
import { logAudit } from '@utils/auditLogger'
import {
    ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip as ChartTooltip,
    CartesianGrid
} from 'recharts'
import Papa from 'papaparse'

import { fmtDate, fmtTime, fmtDateTime, fmtRelative } from '@utils/formatters'
import { ActionBadge, JsonVisualizer, DiffViewer, DeleteTombstone, InsertViewer, AuditTimeline } from '@shared/components'

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1: CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const ALLOWED_ROLES = ['admin', 'developer']

const SOURCE_META = {
    SYSTEM: { label: 'Security', color: 'text-rose-600', bg: 'bg-rose-500/10', border: 'border-rose-500/20', icon: faKey },
    MASTER: { label: 'Master Data', color: 'text-blue-600', bg: 'bg-blue-500/10', border: 'border-blue-500/20', icon: faUsers },
    OPERATIONAL: { label: 'Operational', color: 'text-amber-600', bg: 'bg-amber-500/10', border: 'border-amber-500/20', icon: faBolt },
}

const ACTION_STYLES = {
    INSERT: { label: 'Tambah', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
    UPDATE: { label: 'Ubah', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
    DELETE: { label: 'Hapus', color: 'bg-rose-500/10 text-rose-600 border-rose-500/20' },
}

const SEVERITY_STYLES = {
    LOW: { label: 'Low', color: 'bg-slate-500/10 text-slate-500 border-slate-500/20', icon: faCircleInfo },
    MEDIUM: { label: 'Medium', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20', icon: faExclamationTriangle },
    HIGH: { label: 'High', color: 'bg-orange-500/10 text-orange-500 border-orange-500/20', icon: faExclamationTriangle },
    CRITICAL: { label: 'Critical', color: 'bg-rose-500/10 text-rose-500 border-rose-500/20', icon: faShieldHalved },
}

const TABLE_LABELS = {
    profiles: 'Akun & Profil',
    students: 'Data Siswa',
    teachers: 'Data Guru',
    classes: 'Data Kelas',
    gate_logs: 'Log Gerbang',
    reports: 'Poin Pelanggaran',
    student_monthly_reports: 'Raport Santri',
    point_rules: 'Konfigurasi Poin',
    user_preferences: 'Pengaturan User',
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2 & 3: Migrated to @shared/components (shared/components/AuditTimeline.jsx)
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 4: SUB-KOMPONEN INTERNAL — ActivityTrends & LogRow
// ─────────────────────────────────────────────────────────────────────────────

/** Grafik area tren aktivitas 24 jam terakhir */
const ActivityTrends = ({ data, loading }) => {
    const hourlyData = useMemo(() => {
        if (!data.length) return []
        const now = new Date()
        const categories = {}

        for (let i = 23; i >= 0; i--) {
            const d = new Date(now.getTime() - i * 3_600_000)
            const hour = d.getHours()
            categories[hour] = { hour: `${hour}:00`, total: 0, security: 0, master: 0 }
        }

        data.forEach(log => {
            const hour = new Date(log.created_at).getHours()
            if (categories[hour]) {
                categories[hour].total++
                if (log.source === 'SYSTEM') categories[hour].security++
                if (['students', 'teachers', 'classes'].includes(log.table_name)) categories[hour].master++
            }
        })

        return Object.values(categories)
    }, [data])

    if (loading) return <div className="h-40 w-full animate-pulse bg-[var(--color-surface-alt)] rounded-2xl" />

    return (
        <div className="h-40 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={hourlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                        <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" opacity={0.2} />
                    <XAxis
                        dataKey="hour"
                        axisLine={false} tickLine={false}
                        tick={{ fontSize: 9, fontWeight: 900, opacity: 0.5 }}
                        interval="preserveStartEnd"
                    />
                    <YAxis
                        axisLine={false} tickLine={false}
                        tick={{ fontSize: 9, fontWeight: 900, opacity: 0.5 }}
                    />
                    <ChartTooltip
                        contentStyle={{
                            backgroundColor: 'var(--color-surface)',
                            borderRadius: '12px',
                            border: '1px solid var(--color-border)',
                            boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                            fontSize: '10px',
                            fontWeight: 900,
                        }}
                    />
                    <Area
                        type="monotone"
                        dataKey="total"
                        stroke="var(--color-primary)"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorTotal)"
                        activeDot={{ r: 4, strokeWidth: 0 }}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    )
}

/** Satu baris entry audit log — expandable dengan DiffViewer */
const LogRow = ({ entry, isExpanded, onToggle, onRestore }) => {
    const meta = SOURCE_META[entry.source] || SOURCE_META.SYSTEM
    const action = ACTION_STYLES[entry.action] || { label: entry.action, color: 'bg-gray-100 text-gray-600' }

    // Nama aktor: prioritaskan actor_name dari DB (jika kolom sudah ada), lalu fallback JOIN result
    const displayName = entry.actor_name || 'System'
    const displayRole = entry.actor_role || null
    const initial = displayName?.[0]?.toUpperCase() || '?'

    return (
        <div className={`transition-all ${isExpanded ? 'bg-[var(--color-surface-alt)]/50' : 'hover:bg-[var(--color-surface-alt)]/30'}`}>
            <div
                className="flex flex-col md:flex-row md:items-center gap-3 px-5 py-4 cursor-pointer border-b border-[var(--color-border)]"
                onClick={onToggle}
            >
                {/* Waktu */}
                <div className="w-40 shrink-0">
                    <p className="text-[11px] font-black text-[var(--color-text)] tabular-nums">
                        {fmtRelative(entry.created_at)}
                    </p>
                    <p className="text-[9px] text-[var(--color-text-muted)] mt-0.5 tabular-nums">
                        {fmtDate(entry.created_at)} • {fmtTime(entry.created_at)}
                    </p>
                </div>

                {/* Deskripsi event */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <ActionBadge action={entry.action} />
                        <p className="text-[12px] font-bold text-[var(--color-text)] truncate">
                            {TABLE_LABELS[entry.table_name] || entry.table_name}
                        </p>
                    </div>
                    <p className="text-[10px] text-[var(--color-text-muted)] truncate opacity-70">
                        Record ID: <span className="font-mono text-[9px]">{entry.record_id || 'N/A'}</span>
                        {entry.severity && entry.severity !== 'LOW' && (() => {
                            const sev = SEVERITY_STYLES[entry.severity] || SEVERITY_STYLES.LOW
                            return (
                                <span className={`ml-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-widest border ${sev.color}`}>
                                    <FontAwesomeIcon icon={sev.icon} className="text-[6px]" />
                                    {sev.label}
                                </span>
                            )
                        })()}
                    </p>
                </div>

                {/* Aktor — tampilkan nama lengkap, bukan user ID */}
                <div className="w-36 hidden lg:block">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[var(--color-primary)]/20 to-[var(--color-primary)]/5 border border-[var(--color-primary)]/20 flex items-center justify-center shrink-0">
                            <span className="text-[10px] font-black text-[var(--color-primary)]">{initial}</span>
                        </div>
                        <div className="min-w-0">
                            <p className="text-[11px] font-bold text-[var(--color-text)] truncate leading-tight">
                                {displayName}
                            </p>
                            {displayRole ? (
                                <p className="text-[8px] font-black text-[var(--color-text-muted)] uppercase tracking-widest opacity-60">
                                    {displayRole}
                                </p>
                            ) : (
                                <p className="text-[8px] font-mono text-[var(--color-text-muted)] opacity-40 truncate">
                                    {entry.user_id ? entry.user_id.slice(0, 12) + '...' : 'SYSTEM'}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Badge kategori */}
                <div className="hidden md:flex flex-row items-center gap-2 w-28 justify-end">
                    <span className={`text-[8px] font-black px-2 py-0.5 rounded-full border uppercase tracking-widest ${meta.bg} ${meta.border} ${meta.color}`}>
                        {meta.label}
                    </span>
                    <FontAwesomeIcon
                        icon={isExpanded ? faXmark : faAngleDown}
                        className="text-[10px] text-[var(--color-text-muted)] opacity-30"
                    />
                </div>
            </div>

            {/* Expansion — Forensic Context + Panel tergantung tipe aksi */}
            {isExpanded && (
                <div className="px-5 py-4 bg-[var(--color-surface)] border-b border-[var(--color-border)] space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                        {/* Kiri: metadata forensik + raw JSON */}
                        <div className="space-y-4">
                            <div className="p-3 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] space-y-2">
                                <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] flex items-center gap-2">
                                    <FontAwesomeIcon icon={faCircleInfo} /> Forensic Context
                                </p>
                                <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-3 border-t border-[var(--color-border)] mt-1">
                                    {/* User Agent */}
                                    <div className="flex items-center gap-2 group cursor-help" title={entry.user_agent}>
                                        <div className="w-7 h-7 rounded-lg bg-[var(--color-surface-alt)] flex items-center justify-center text-[var(--color-text-muted)] group-hover:bg-[var(--color-primary)]/10 group-hover:text-[var(--color-primary)] transition-colors">
                                            <FontAwesomeIcon icon={faDesktop} className="text-[10px]" />
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60">User Agent</span>
                                            <span className="text-[10px] font-bold text-[var(--color-text)] truncate max-w-[200px] block lg:max-w-[400px]">
                                                {entry.user_agent || 'Unknown'}
                                            </span>
                                        </div>
                                    </div>
                                    {/* Remote IP */}
                                    <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-lg bg-[var(--color-surface-alt)] flex items-center justify-center text-[var(--color-text-muted)]">
                                            <FontAwesomeIcon icon={faGlobe} className="text-[10px]" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60">Remote IP</span>
                                            <span className="text-[10px] font-mono font-bold text-[var(--color-text)]">
                                                {entry.ip_address || '0.0.0.0'}
                                            </span>
                                        </div>
                                    </div>
                                    {/* URL */}
                                    <div className="flex items-center gap-2 group min-w-0 flex-1">
                                        <div className="w-7 h-7 rounded-lg bg-[var(--color-surface-alt)] flex items-center justify-center text-[var(--color-text-muted)]">
                                            <FontAwesomeIcon icon={faLink} className="text-[10px]" />
                                        </div>
                                        <div className="flex flex-col min-w-0 flex-1">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60">Interaction URL</span>
                                            <span className="text-[10px] font-bold text-[var(--color-text)] break-all leading-tight">
                                                {entry.url || 'Internal Action'}
                                            </span>
                                        </div>
                                    </div>
                                    {/* Actor snapshot */}
                                    {entry.actor_role && (
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-lg bg-[var(--color-surface-alt)] flex items-center justify-center text-[var(--color-text-muted)]">
                                                <FontAwesomeIcon icon={faUserShield} className="text-[10px]" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60">Role</span>
                                                <span className="text-[10px] font-bold text-[var(--color-text)] capitalize">
                                                    {entry.actor_role}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                    {/* Severity */}
                                    {entry.severity && (() => {
                                        const sev = SEVERITY_STYLES[entry.severity] || SEVERITY_STYLES.LOW
                                        return (
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-lg bg-[var(--color-surface-alt)] flex items-center justify-center text-[var(--color-text-muted)]">
                                                    <FontAwesomeIcon icon={faExclamationTriangle} className="text-[10px]" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60">Severity</span>
                                                    <span className={`text-[10px] font-black uppercase ${sev.color.split(' ')[1]}`}>
                                                        {sev.label}
                                                    </span>
                                                </div>
                                            </div>
                                        )
                                    })()}
                                    {/* Session ID */}
                                    {entry.session_id && (
                                        <div className="flex items-center gap-2 group cursor-help" title={entry.session_id}>
                                            <div className="w-7 h-7 rounded-lg bg-[var(--color-surface-alt)] flex items-center justify-center text-[var(--color-text-muted)] group-hover:bg-[var(--color-primary)]/10 group-hover:text-[var(--color-primary)] transition-colors">
                                                <FontAwesomeIcon icon={faFingerprint} className="text-[10px]" />
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60">Session</span>
                                                <span className="text-[10px] font-mono font-bold text-[var(--color-text)] truncate max-w-[150px] block">
                                                    {entry.session_id.slice(0, 16)}...
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                    {/* Duration */}
                                    {entry.duration_ms != null && (
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-lg bg-[var(--color-surface-alt)] flex items-center justify-center text-[var(--color-text-muted)]">
                                                <FontAwesomeIcon icon={faStopwatch} className="text-[10px]" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60">Durasi</span>
                                                <span className={`text-[10px] font-mono font-bold ${entry.duration_ms > 2000 ? 'text-rose-500' : entry.duration_ms > 500 ? 'text-amber-500' : 'text-emerald-500'}`}>
                                                    {entry.duration_ms}ms
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Raw JSON — hanya untuk DELETE (data lama), hidden untuk INSERT/UPDATE */}
                            {entry.action === 'DELETE' && (
                                <div className="space-y-2">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Raw JSON (Data Lama)</p>
                                    <pre className="p-3 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[10px] font-mono overflow-auto max-h-40">
                                        {JSON.stringify(entry.old_data || {}, null, 2)}
                                    </pre>
                                </div>
                            )}

                            {entry.action === 'UPDATE' && (
                                <div className="space-y-2">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Data Lama (Raw)</p>
                                    <pre className="p-3 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[10px] font-mono overflow-auto max-h-40">
                                        {JSON.stringify(entry.old_data || {}, null, 2)}
                                    </pre>
                                </div>
                            )}
                        </div>

                        {/* Kanan: panel tergantung tipe aksi */}
                        <div className="space-y-2">
                            {entry.action === 'UPDATE' && (
                                <>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-indigo-500">Perubahan Data</p>
                                    <div className="p-4 rounded-xl bg-[var(--color-surface-alt)]/50 border border-[var(--color-border)]">
                                        <DiffViewer
                                            oldData={entry.old_data}
                                            newData={entry.new_data}
                                            changedFields={entry.changed_fields}
                                        />
                                    </div>
                                </>
                            )}

                            {entry.action === 'DELETE' && (
                                <>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-rose-500">Record yang Dihapus</p>
                                    <div className="p-4 rounded-xl bg-[var(--color-surface-alt)]/50 border border-rose-500/10">
                                        <DeleteTombstone data={entry.old_data} />
                                    </div>
                                </>
                            )}

                            {entry.action === 'INSERT' && (
                                <>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-emerald-500">Data Record Baru</p>
                                    <div className="p-4 rounded-xl bg-[var(--color-surface-alt)]/50 border border-emerald-500/10">
                                        <InsertViewer data={entry.new_data} />
                                    </div>
                                </>
                            )}

                            {/* Aksi lain (LOGIN, RESTORE, EXECUTE, dll) */}
                            {!['UPDATE', 'DELETE', 'INSERT'].includes(entry.action) && (
                                <>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Metadata</p>
                                    <div className="p-4 rounded-xl bg-[var(--color-surface-alt)]/50 border border-[var(--color-border)]">
                                        <DiffViewer oldData={entry.old_data} newData={entry.new_data} />
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {entry.action === 'DELETE' && onRestore && (
                        <div className="pt-2 border-t border-[var(--color-border)] flex justify-end">
                            <button
                                onClick={() => onRestore(entry)}
                                className="h-8 px-4 rounded-xl bg-amber-500 text-white text-[10px] font-black hover:bg-amber-600 transition-all shadow-lg shadow-amber-500/20 flex items-center gap-2"
                            >
                                <FontAwesomeIcon icon={faTrashRestore} /> Pulihkan Record ini
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 5: LOGS PAGE — Halaman utama audit (default export)
// ─────────────────────────────────────────────────────────────────────────────

export default function LogsPage() {
    const { profile } = useAuth()
    const { addToast } = useToast()
    const isAllowed = ALLOWED_ROLES.includes(profile?.role)

    // Read initial query params (deep-link support)
    const initialParams = useMemo(() => {
        try { return new URLSearchParams(window.location.search) } catch { return new URLSearchParams() }
    }, [])
    const initialTable = initialParams.get('table') || ''
    const initialRecordId = initialParams.get('recordId') || ''
    const initialAction = initialParams.get('action') || ''
    const initialSource = initialParams.get('source') || ''
    const initialSeverity = initialParams.get('severity') || ''

    // Data state
    const [logs, setLogs] = useState([])
    const [loading, setLoading] = useState(true)
    const [total, setTotal] = useState(0)

    // UI state
    const [page, setPage] = useState(1)
    const [pageSize] = useState(20)
    const [search, setSearch] = useState(() => initialRecordId)
    const [debouncedSearch, setDebouncedSearch] = useState('')
    const [expandedId, setExpandedId] = useState(null)
    const [showFilters, setShowFilters] = useState(() => !!(initialTable || initialAction || initialSource || initialSeverity))

    // Realtime state — newLogsCount dipakai kalau user lagi di page > 1
    const [newLogsCount, setNewLogsCount] = useState(0)
    const channelRef = useRef(null)
    const pageRef = useRef(page)
    const filtersActiveRef = useRef(false)

    // Sync pageRef setiap kali page berubah
    useEffect(() => { pageRef.current = page }, [page])

    // Filter state
    const [filterSource, setFilterSource] = useState(() => initialSource)
    const [filterAction, setFilterAction] = useState(() => initialAction)
    const [filterTable, setFilterTable] = useState(() => initialTable)
    const [filterSeverity, setFilterSeverity] = useState(() => initialSeverity)
    const [filterRange, setFilterRange] = useState({ from: '', to: '' })
    const [sortDir, setSortDir] = useState('desc')

    // Track apakah ada filter aktif (realtime skip prepend kalau filter aktif — data mungkin tidak match)
    useEffect(() => {
        filtersActiveRef.current = !!(filterSource || filterAction || filterTable || filterSeverity || filterRange.from || filterRange.to || debouncedSearch)
    }, [filterSource, filterAction, filterTable, filterSeverity, filterRange, debouncedSearch])

    // Modal state
    const [restoreEntry, setRestoreEntry] = useState(null)
    const [restoring, setRestoring] = useState(false)
    const [isExporting, setIsExporting] = useState(false)
    const [isCleanupOpen, setIsCleanupOpen] = useState(false)
    const [cleanupDays, setCleanupDays] = useState(90)
    const [clearing, setClearing] = useState(false)

    // Reset newLogsCount saat filter/search berubah (fetch ulang akan mengambil data fresh)
    useEffect(() => {
        setNewLogsCount(0)
    }, [filterSource, filterAction, filterTable, filterRange, debouncedSearch, page])

    // Debounce search
    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(search), 500)
        return () => clearTimeout(t)
    }, [search])

    const fetchLogs = useCallback(async (quiet = false) => {
        if (!isAllowed) return
        if (!quiet) setLoading(true)
        try {
            let q = supabase.from('audit_logs').select('*', { count: 'exact' })

            if (filterSource) q = q.eq('source', filterSource)
            if (filterAction) q = q.eq('action', filterAction)
            if (filterTable) q = q.eq('table_name', filterTable)
            if (filterSeverity) q = q.eq('severity', filterSeverity)
            if (filterRange.from) q = q.gte('created_at', filterRange.from)
            if (filterRange.to) q = q.lte('created_at', filterRange.to + 'T23:59:59')
            if (debouncedSearch) {
                const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
                const isUuid = uuidRegex.test(debouncedSearch.trim())
                
                if (isUuid) {
                    // Jika UUID, gunakan .eq untuk record_id agar tidak crash PostgreSQL (uuid vs ilike)
                    q = q.or(`record_id.eq.${debouncedSearch.trim()},table_name.ilike.%${debouncedSearch}%,action.ilike.%${debouncedSearch}%,actor_name.ilike.%${debouncedSearch}%`)
                } else {
                    // Jika bukan UUID, jangan cari di record_id pakai ilike (pasti error)
                    q = q.or(`table_name.ilike.%${debouncedSearch}%,action.ilike.%${debouncedSearch}%,actor_name.ilike.%${debouncedSearch}%`)
                }
            }

            q = q.order('created_at', { ascending: sortDir === 'asc' })
            q = q.range((page - 1) * pageSize, page * pageSize - 1)

            const { data, error, count } = await q
            if (error) throw error

            // Resolve nama aktor dari profiles
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
            const uids = [...new Set((data || []).map(r => r.user_id).filter(id => id && uuidRegex.test(id)))]
            let profileMap = {}
            if (uids.length) {
                const { data: pData } = await supabase.from('profiles').select('id,name,role').in('id', uids)
                if (pData) pData.forEach(p => { profileMap[p.id] = p })
            }

            setLogs((data || []).map(r => {
                const p = profileMap[r.user_id]
                // Prioritas: (1) actor_name kolom DB (snapshot saat insert), (2) JOIN ke profiles, (3) fallback
                const resolvedName = r.actor_name || p?.name || (r.user_id ? null : 'System')
                const resolvedRole = r.actor_role || p?.role || (r.user_id ? 'unknown' : 'auto')
                return {
                    ...r,
                    actor_name: resolvedName || (r.user_id ? p?.name || 'Pengguna Tidak Dikenal' : 'System'),
                    actor_role: resolvedRole,
                }
            }))
            setTotal(count || 0)
        } catch (e) {
            addToast('Gagal memuat log audit: ' + e.message, 'error')
        } finally {
            if (!quiet) setLoading(false)
        }
    }, [isAllowed, page, pageSize, debouncedSearch, filterSource, filterAction, filterTable, filterSeverity, filterRange, sortDir, addToast])

    useEffect(() => { fetchLogs() }, [fetchLogs])

    // ── Helper: resolve actor name dari 1 user_id ──────────────────────────────
    const resolveActor = useCallback(async (row) => {
        // Kalau actor_name sudah ada di kolom DB (schema baru), langsung pakai
        if (row.actor_name) return row

        if (!row.user_id) return { ...row, actor_name: 'System', actor_role: 'auto' }

        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        if (!uuidRegex.test(row.user_id)) return { ...row, actor_name: 'System', actor_role: 'auto' }

        const { data } = await supabase
            .from('profiles')
            .select('name,role')
            .eq('id', row.user_id)
            .single()

        return {
            ...row,
            actor_name: data?.name || 'Pengguna Tidak Dikenal',
            actor_role: data?.role || 'unknown',
        }
    }, [])

    // ── Always-on realtime subscription ───────────────────────────────────────
    // Channel dibuat SEKALI via useRef, tidak di-recreate saat state berubah
    useEffect(() => {
        if (!isAllowed || isDemoMode) return

        // Cleanup function for Supabase Realtime
        const cleanup = async (ch) => {
            if (!ch) return
            try {
                await ch.unsubscribe()
                await supabase.removeChannel(ch)
            } catch (e) {
                console.warn('[Realtime Cleanup]', e.message)
            }
        }

        // Create new channel
        const channel = supabase
            .channel('audit_logs_broadcast')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'audit_logs' },
                async (payload) => {
                    const newRow = payload.new
                    if (!newRow?.id) return
                    const resolved = await resolveActor(newRow)

                    if (filtersActiveRef.current || pageRef.current > 1) {
                        setNewLogsCount(c => c + 1)
                        setTotal(t => t + 1)
                        return
                    }

                    setLogs(prev => {
                        if (prev.some(l => l.id === resolved.id)) return prev
                        return [resolved, ...prev].slice(0, 20)
                    })
                    setTotal(t => t + 1)
                }
            )

        channel.subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                channelRef.current = channel
            } else if (status === 'CHANNEL_ERROR' || status === 'CLOSED') {
                console.error('[Realtime Status]', status)
            }
        })

        return () => {
            if (channelRef.current) {
                cleanup(channelRef.current)
                channelRef.current = null
            }
        }
    }, [isAllowed, resolveActor, addToast])

    const handleRestore = async () => {
        if (!restoreEntry) return
        setRestoring(true)
        try {
            const { error } = await supabase.from(restoreEntry.table_name).insert(restoreEntry.old_data)
            if (error) throw error
            addToast('Data dipulihkan', 'success')
            fetchLogs()
        } catch (e) {
            addToast('Gagal memulihkan: ' + e.message, 'error')
        } finally {
            setRestoring(false)
            setRestoreEntry(null)
        }
    }

    const handleExport = async (format = 'csv') => {
        setIsExporting(true)
        try {
            const { data, error } = await supabase
                .from('audit_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(1000)
            if (error) throw error

            const exportData = data.map(r => ({
                Waktu: fmtDateTime(r.created_at),
                Aksi: r.action,
                Tabel: r.table_name,
                Record_ID: r.record_id,
                Actor_ID: r.user_id,
                Actor_Name: r.actor_name || '',
                Actor_Role: r.actor_role || '',
                Source: r.source,
                Severity: r.severity || 'LOW',
                IP: r.ip_address,
                URL: r.url,
                Session_ID: r.session_id || '',
                Duration_MS: r.duration_ms ?? '',
                Changed_Fields: Array.isArray(r.changed_fields) ? r.changed_fields.join(', ') : '',
            }))

            if (format === 'csv') {
                const csv = Papa.unparse(exportData)
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
                const url = URL.createObjectURL(blob)
                const link = document.createElement('a')
                link.href = url
                link.setAttribute('download', `audit_logs_${new Date().toISOString().slice(0, 10)}.csv`)
                link.click()
            } else {
                const XLSX = await import('xlsx')
                const ws = XLSX.utils.json_to_sheet(exportData)
                const wb = XLSX.utils.book_new()
                XLSX.utils.book_append_sheet(wb, ws, 'Audit Logs')
                XLSX.writeFile(wb, `audit_logs_${new Date().toISOString().slice(0, 10)}.xlsx`)
            }
            addToast('Log audit berhasil diekspor', 'success')
        } catch (e) {
            addToast('Gagal ekspor: ' + e.message, 'error')
        } finally {
            setIsExporting(false)
        }
    }

    const handleCleanup = async () => {
        if (!confirm(`Hapus permanen log yang lebih lama dari ${cleanupDays} hari? Tindakan ini tidak bisa dibatalkan.`)) return
        setClearing(true)
        try {
            const cutoff = new Date()
            cutoff.setDate(cutoff.getDate() - cleanupDays)
            const { error, count } = await supabase
                .from('audit_logs')
                .delete()
                .lt('created_at', cutoff.toISOString())
            if (error) throw error
            addToast(`Pembersihan berhasil`, 'success')
            await logAudit({
                action: 'DELETE',
                source: 'SYSTEM',
                tableName: 'audit_logs',
                newData: { cleanup: true, days: cleanupDays, count: count || 0 },
            })
            setIsCleanupOpen(false)
            fetchLogs()
        } catch (e) {
            addToast('Gagal pembersihan: ' + e.message, 'error')
        } finally {
            setClearing(false)
        }
    }

    if (!isAllowed) return (
        <DashboardLayout title="Akses Dibatasi">
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <FontAwesomeIcon icon={faShieldHalved} className="text-4xl text-rose-500 opacity-20" />
                <p className="text-sm font-bold text-[var(--color-text-muted)]">Hanya untuk Admin/Developer.</p>
            </div>
        </DashboardLayout>
    )

    return (
        <DashboardLayout title="Audit Logs">
            <div className="p-4 md:p-6 space-y-4 max-w-[1800px] mx-auto">

                {/* Header */}
                <div className="flex flex-col gap-1">
                    <Breadcrumb badge="Admin" items={['Audit Center']} className="mb-0" />
                    <h1 className="text-2xl font-black font-heading text-[var(--color-text)]">Pusat Audit Sistem</h1>
                    <p className="text-[11px] font-medium text-[var(--color-text-muted)] opacity-60">
                        Jejak digital lengkap aktivitas sistem dan akses data.
                    </p>
                </div>

                {/* Trends & Stats */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="lg:col-span-2 glass rounded-2xl p-5 border border-[var(--color-border)] relative overflow-hidden">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] flex items-center gap-2">
                                    <FontAwesomeIcon icon={faChartLine} className="text-[var(--color-primary)]" /> Tren Aktivitas 24 Jam
                                </p>
                                <p className="text-[9px] text-[var(--color-text-muted)] opacity-60 mt-0.5">
                                    Frekuensi perubahan data per jam.
                                </p>
                            </div>
                            {/* Always-on live indicator */}
                            <div className="flex items-center gap-2 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">Live</span>
                            </div>
                        </div>
                        <ActivityTrends data={logs} loading={loading} />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        {[
                            { label: 'Total Audit', value: total, icon: faHistory, color: 'text-[var(--color-primary)]', bg: 'bg-[var(--color-primary)]/10', sub: '24 Jam Terakhir' },
                            { label: 'Security', value: logs.filter(l => l.source === 'SYSTEM').length, icon: faShieldHalved, color: 'text-rose-500', bg: 'bg-rose-500/10', sub: 'Akses & Auth' },
                            { label: 'Master Data', value: logs.filter(l => ['students', 'teachers', 'classes'].includes(l.table_name)).length, icon: faUsers, color: 'text-emerald-500', bg: 'bg-emerald-500/10', sub: 'Siswa, Guru, Kelas' },
                            { label: 'Operational', value: logs.filter(l => l.source === 'OPERATIONAL').length, icon: faBolt, color: 'text-amber-500', bg: 'bg-amber-500/10', sub: 'Tugas & Sistem' },
                        ].map((s, i) => (
                            <div key={i} className="p-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
                                <div className={`absolute top-0 right-0 w-24 h-24 ${s.bg} rounded-bl-full opacity-30 -mr-8 -mt-8 transition-transform group-hover:scale-110`} />
                                <div className="flex items-center gap-4 relative">
                                    <div className={`w-12 h-12 ${s.bg} ${s.color} rounded-xl flex items-center justify-center text-lg`}>
                                        <FontAwesomeIcon icon={s.icon} />
                                    </div>
                                    <div>
                                        <div className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-0.5">{s.label}</div>
                                        <div className="text-2xl font-black">{loading ? '...' : s.value}</div>
                                        {s.sub && <div className="text-[8px] font-medium text-[var(--color-text-muted)] mt-1">{s.sub}</div>}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Toolbar */}
                <div className="glass rounded-2xl border border-[var(--color-border)] overflow-hidden">
                    <div className="flex flex-wrap items-center gap-2 p-3">
                        <div className="flex-1 min-w-[200px] relative">
                            <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] text-sm" />
                            <input
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Cari tabel, aksi, atau ID..."
                                className="w-full h-10 pl-10 pr-4 rounded-xl border border-[var(--color-border)] bg-transparent text-xs font-bold outline-none focus:border-[var(--color-primary)] transition-all"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => fetchLogs()}
                                className="h-10 px-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] hover:bg-[var(--color-surface)] text-[11px] font-black flex items-center gap-2 transition-all"
                            >
                                <FontAwesomeIcon icon={faRotateRight} className={loading ? 'animate-spin' : ''} />
                                <span className="hidden sm:inline">Refresh</span>
                            </button>
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className={`h-10 px-4 rounded-xl border font-black text-[11px] flex items-center gap-2 transition-all ${showFilters ? 'bg-[var(--color-primary)] text-white border-transparent' : 'border-[var(--color-border)] bg-[var(--color-surface-alt)]'}`}
                            >
                                <FontAwesomeIcon icon={faFilter} /> Filter
                            </button>
                            <div className="h-8 w-px bg-[var(--color-border)] mx-1" />
                            <div className="flex items-center gap-1.5">
                                <button
                                    onClick={() => handleExport('csv')}
                                    disabled={isExporting}
                                    className="h-10 w-10 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] hover:text-emerald-500 transition-all flex items-center justify-center"
                                    title="Export CSV"
                                >
                                    <FontAwesomeIcon icon={faFileExport} />
                                </button>
                                <button
                                    onClick={() => setIsCleanupOpen(true)}
                                    className="h-10 w-10 rounded-xl border border-rose-500/20 bg-rose-500/5 text-rose-500 hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center"
                                    title="Cleanup Logs"
                                >
                                    <FontAwesomeIcon icon={faEraser} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Filter panel */}
                    {showFilters && (
                        <div className="px-3 pb-3 border-t border-[var(--color-border)] pt-4 flex flex-wrap gap-4 items-end animate-in fade-in duration-200">
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black uppercase text-[var(--color-text-muted)] px-1">Kategori</label>
                                <div className="flex gap-1 bg-[var(--color-surface-alt)] p-1 rounded-xl border border-[var(--color-border)]">
                                    {[
                                        { v: '', l: 'Semua' },
                                        { v: 'SYSTEM', l: 'Security' },
                                        { v: 'MASTER', l: 'Master' },
                                        { v: 'OPERATIONAL', l: 'Ops' },
                                    ].map(opt => (
                                        <button
                                            key={opt.v}
                                            onClick={() => setFilterSource(opt.v)}
                                            className={`h-7 px-3 rounded-lg text-[10px] font-black transition-all ${filterSource === opt.v ? 'bg-indigo-500 text-white shadow-sm' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-border)]'}`}
                                        >
                                            {opt.l}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {/* Filter Aksi */}
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black uppercase text-[var(--color-text-muted)] px-1">Aksi</label>
                                <div className="flex gap-1 bg-[var(--color-surface-alt)] p-1 rounded-xl border border-[var(--color-border)]">
                                    {[
                                        { v: '', l: 'Semua' },
                                        { v: 'INSERT', l: 'Tambah' },
                                        { v: 'UPDATE', l: 'Ubah' },
                                        { v: 'DELETE', l: 'Hapus' },
                                    ].map(opt => (
                                        <button
                                            key={opt.v}
                                            onClick={() => setFilterAction(opt.v)}
                                            className={`h-7 px-3 rounded-lg text-[10px] font-black transition-all ${filterAction === opt.v ? 'bg-indigo-500 text-white shadow-sm' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-border)]'}`}
                                        >
                                            {opt.l}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {/* Filter Severity */}
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black uppercase text-[var(--color-text-muted)] px-1">Severity</label>
                                <div className="flex gap-1 bg-[var(--color-surface-alt)] p-1 rounded-xl border border-[var(--color-border)]">
                                    {[
                                        { v: '', l: 'Semua' },
                                        { v: 'LOW', l: 'Low' },
                                        { v: 'MEDIUM', l: 'Med' },
                                        { v: 'HIGH', l: 'High' },
                                        { v: 'CRITICAL', l: 'Crit' },
                                    ].map(opt => (
                                        <button
                                            key={opt.v}
                                            onClick={() => setFilterSeverity(opt.v)}
                                            className={`h-7 px-3 rounded-lg text-[10px] font-black transition-all ${filterSeverity === opt.v ? 'bg-indigo-500 text-white shadow-sm' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-border)]'}`}
                                        >
                                            {opt.l}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-1.5 flex-1 min-w-[150px]">
                                <label className="text-[9px] font-black uppercase text-[var(--color-text-muted)] px-1">Pilih Tabel</label>
                                <select
                                    value={filterTable}
                                    onChange={e => setFilterTable(e.target.value)}
                                    className="w-full h-9 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[10px] font-black px-3 outline-none focus:border-[var(--color-primary)]"
                                >
                                    <option value="">Semua Perubahan</option>
                                    {Object.entries(TABLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1.5 shrink-0">
                                <label className="text-[9px] font-black uppercase text-[var(--color-text-muted)] px-1">Rentang Tanggal</label>
                                <div className="flex items-center gap-2">
                                    <input type="date" value={filterRange.from} onChange={e => setFilterRange({ ...filterRange, from: e.target.value })} className="h-9 px-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[10px] font-bold" />
                                    <span className="text-[10px] font-bold opacity-30">—</span>
                                    <input type="date" value={filterRange.to} onChange={e => setFilterRange({ ...filterRange, to: e.target.value })} className="h-9 px-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[10px] font-bold" />
                                </div>
                            </div>
                            <button
                                onClick={() => { setFilterSource(''); setFilterTable(''); setFilterRange({ from: '', to: '' }); setFilterAction(''); setFilterSeverity('') }}
                                className="h-9 px-4 rounded-xl border border-rose-500/20 text-rose-500 text-[10px] font-black flex items-center gap-2 hover:bg-rose-500/5 transition-all"
                            >
                                <FontAwesomeIcon icon={faXmark} /> Reset
                            </button>
                        </div>
                    )}
                </div>

                {/* Banner: log baru masuk (page > 1 atau ada filter aktif) */}
                {newLogsCount > 0 && (
                    <button
                        onClick={() => {
                            setPage(1)
                            setNewLogsCount(0)
                            fetchLogs()
                        }}
                        className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-2xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 hover:bg-[var(--color-primary)]/15 transition-all group animate-in slide-in-from-top-2 duration-300"
                    >
                        <div className="w-2 h-2 rounded-full bg-[var(--color-primary)] animate-ping" />
                        <span className="text-[11px] font-black text-[var(--color-primary)]">
                            {newLogsCount} log baru masuk
                        </span>
                        <h4 className="text-[11px] font-black text-[var(--color-text)] leading-tight uppercase tracking-tight group-hover:text-[var(--color-primary)] transition-colors">
                            — klik untuk lihat
                        </h4>
                    </button>
                )}

                {/* Tabel log */}
                <div className="glass rounded-2xl border border-[var(--color-border)] overflow-hidden">
                    <div className="hidden md:grid grid-cols-[160px_1fr_128px_96px] gap-3 px-5 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface-alt)]/50">
                        {['Waktu', 'Aksi & Subjek', 'Actor', 'Kategori'].map((h, i) => (
                            <div key={i} className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">{h}</div>
                        ))}
                    </div>

                    <div className="divide-y divide-[var(--color-border)]">
                        {loading ? (
                            Array.from({ length: 10 }).map((_, i) => (
                                <div key={i} className="px-5 py-4 animate-pulse flex items-center gap-4">
                                    <div className="w-32 h-3 bg-[var(--color-border)] rounded" />
                                    <div className="flex-1 h-3 bg-[var(--color-border)] rounded opacity-50" />
                                    <div className="w-24 h-5 bg-[var(--color-border)] rounded-full" />
                                </div>
                            ))
                        ) : logs.length === 0 ? (
                            <div className="py-20 flex flex-col items-center justify-center gap-4 text-center">
                                <div className="w-16 h-16 rounded-3xl bg-[var(--color-surface-alt)] flex items-center justify-center">
                                    <FontAwesomeIcon icon={faDatabase} className="text-2xl text-[var(--color-text-muted)] opacity-20" />
                                </div>
                                <div>
                                    <p className="text-sm font-black">Tidak Ada Jejak Audit</p>
                                    <p className="text-[11px] text-[var(--color-text-muted)]">Belum ada aktivitas yang direkam untuk kriteria ini.</p>
                                </div>
                            </div>
                        ) : (
                            logs.map(log => (
                                <LogRow
                                    key={log.id}
                                    entry={log}
                                    isExpanded={expandedId === log.id}
                                    onToggle={() => setExpandedId(expandedId === log.id ? null : log.id)}
                                    onRestore={setRestoreEntry}
                                />
                            ))
                        )}
                    </div>

                    {/* Pagination */}
                    {total > pageSize && (
                        <div className="px-5 py-3 border-t border-[var(--color-border)] bg-[var(--color-surface-alt)]/30 flex items-center justify-between">
                            <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
                                Menampilkan {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} dari {total} log
                            </p>
                            <div className="flex items-center gap-1">
                                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="w-8 h-8 rounded-lg border border-[var(--color-border)] flex items-center justify-center disabled:opacity-30 hover:bg-[var(--color-surface)]">
                                    <FontAwesomeIcon icon={faChevronLeft} className="text-[10px]" />
                                </button>
                                <div className="px-3 h-8 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[10px] font-black">
                                    {page}
                                </div>
                                <button onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / pageSize)} className="w-8 h-8 rounded-lg border border-[var(--color-border)] flex items-center justify-center disabled:opacity-30 hover:bg-[var(--color-surface)]">
                                    <FontAwesomeIcon icon={faChevronRight} className="text-[10px]" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Catatan integritas */}
                <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 flex items-start gap-3">
                    <FontAwesomeIcon icon={faCircleInfo} className="text-indigo-500 text-sm mt-0.5" />
                    <div>
                        <p className="text-[11px] font-black text-indigo-500 uppercase tracking-widest mb-1">Penting: Integritas Data</p>
                        <p className="text-[10px] text-[var(--color-text-muted)] leading-relaxed">
                            Audit trail ini adalah record permanen yang tidak dapat diubah oleh administrator biasa.
                            Gunakan data ini untuk investigasi forensik jika terjadi kejanggalan pada data Master atau Operational.
                        </p>
                    </div>
                </div>

                <div className="h-4" />
            </div>

            {/* Modal: Restore */}
            {restoreEntry && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setRestoreEntry(null)}>
                    <div className="w-full max-w-sm bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="p-6">
                            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-4">
                                <FontAwesomeIcon icon={faTrashRestore} className="text-xl text-amber-500" />
                            </div>
                            <h3 className="text-lg font-black text-[var(--color-text)] mb-1">Pulihkan Data?</h3>
                            <p className="text-[11px] text-[var(--color-text-muted)] mb-4 leading-relaxed">
                                Anda akan mengembalikan data yang dihapus ke tabel{' '}
                                <span className="font-bold text-amber-600 underline">
                                    {TABLE_LABELS[restoreEntry.table_name] || restoreEntry.table_name}
                                </span>.
                                Tindakan ini sendiri akan dicatat sebagai entri Audit baru.
                            </p>
                            <div className="flex gap-2 pt-2">
                                <button onClick={() => setRestoreEntry(null)} className="flex-1 h-10 rounded-xl border border-[var(--color-border)] text-[11px] font-black hover:bg-[var(--color-surface-alt)] transition-all">
                                    Batal
                                </button>
                                <button onClick={handleRestore} disabled={restoring} className="flex-1 h-10 rounded-xl bg-amber-500 text-white text-[11px] font-black hover:bg-amber-600 transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50 flex items-center justify-center gap-2">
                                    {restoring ? <FontAwesomeIcon icon={faSpinner} className="animate-spin" /> : 'Ya, Pulihkan'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Cleanup */}
            {isCleanupOpen && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setIsCleanupOpen(false)}>
                    <div className="w-full max-w-sm bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="p-6">
                            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center mb-4">
                                <FontAwesomeIcon icon={faEraser} className="text-xl text-rose-500" />
                            </div>
                            <h3 className="text-lg font-black text-[var(--color-text)] mb-1">Pembersihan Log</h3>
                            <p className="text-[11px] text-[var(--color-text-muted)] mb-4 leading-relaxed">
                                Hapus log audit permanen untuk menjaga performa sistem. Log yang dihapus tidak dapat dipulihkan.
                            </p>
                            <div className="space-y-3 mb-6">
                                <label className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Hapus log lebih lama dari:</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {[30, 90, 180].map(d => (
                                        <button
                                            key={d}
                                            onClick={() => setCleanupDays(d)}
                                            className={`h-9 rounded-xl border text-[10px] font-black transition-all ${cleanupDays === d ? 'bg-rose-500 border-rose-500 text-white shadow-lg shadow-rose-500/20' : 'border-[var(--color-border)] hover:bg-[var(--color-surface-alt)]'}`}
                                        >
                                            {d} Hari
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="flex gap-2 pt-2">
                                <button onClick={() => setIsCleanupOpen(false)} className="flex-1 h-10 rounded-xl border border-[var(--color-border)] text-[11px] font-black hover:bg-[var(--color-surface-alt)] transition-all">
                                    Batal
                                </button>
                                <button onClick={handleCleanup} disabled={clearing} className="flex-1 h-10 rounded-xl bg-rose-500 text-white text-[11px] font-black hover:bg-rose-600 transition-all shadow-lg shadow-rose-500/20 disabled:opacity-50 flex items-center justify-center gap-2">
                                    {clearing ? <FontAwesomeIcon icon={faSpinner} className="animate-spin" /> : 'Eksekusi Hapus'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    )
}