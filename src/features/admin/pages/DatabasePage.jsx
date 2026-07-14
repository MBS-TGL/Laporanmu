import { useState, useEffect, useCallback, useMemo } from 'react'
import { StatsCarousel, Breadcrumb } from '@shared/components'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faDatabase, faShieldHalved, faRotateRight, faSpinner,
    faCircleCheck, faTriangleExclamation, faCircleExclamation,
    faUsers, faChalkboardTeacher, faSchool, faClipboardList,
    faCalendarAlt, faExclamationTriangle, faShield,
    faPersonWalkingArrowRight, faUserShield, faBolt,
    faChevronDown, faChevronUp, faSearch, faXmark,
    faDownload, faArrowsRotate, faCheckDouble,
    faLinkSlash, faCalendarWeek, faCircleInfo, faFloppyDisk,
} from '@fortawesome/free-solid-svg-icons'
import DashboardLayout from '@core/layouts/DashboardLayout'
import { useToast, useAuth } from '@context'
import { supabase } from '@lib/supabase'

// ─── Constants ────────────────────────────────────────────────────────────────

const ALLOWED_ROLES = ['admin', 'developer', 'superadmin']

const TABLE_CONFIG = [
    { key: 'students', label: 'Siswa', icon: faUsers, color: 'text-indigo-500', bg: 'bg-indigo-500/10', softDelete: true, dateCol: 'created_at' },
    { key: 'teachers', label: 'Guru & Karyawan', icon: faChalkboardTeacher, color: 'text-emerald-500', bg: 'bg-emerald-500/10', softDelete: true, dateCol: 'created_at' },
    { key: 'classes', label: 'Kelas', icon: faSchool, color: 'text-blue-500', bg: 'bg-blue-500/10', softDelete: false, dateCol: 'created_at' },
    { key: 'student_monthly_reports', label: 'Raport Bulanan', icon: faClipboardList, color: 'text-purple-500', bg: 'bg-purple-500/10', softDelete: false, dateCol: 'created_at' },
    { key: 'reports', label: 'Poin Siswa', icon: faShield, color: 'text-orange-500', bg: 'bg-orange-500/10', softDelete: false, dateCol: 'reported_at' },
    { key: 'point_rules', label: 'Konfigurasi Poin', icon: faExclamationTriangle, color: 'text-red-500', bg: 'bg-red-500/10', softDelete: false, dateCol: 'created_at' },
    { key: 'academic_years', label: 'Tahun Pelajaran', icon: faCalendarAlt, color: 'text-teal-500', bg: 'bg-teal-500/10', softDelete: true, dateCol: 'created_at' },
    { key: 'gate_logs', label: 'Log Gerbang', icon: faPersonWalkingArrowRight, color: 'text-rose-500', bg: 'bg-rose-500/10', softDelete: false, dateCol: 'created_at' },
    { key: 'profiles', label: 'Profil Akun', icon: faUserShield, color: 'text-violet-500', bg: 'bg-violet-500/10', softDelete: false, dateCol: 'created_at' },
    { key: 'feature_flags', label: 'Feature Flags', icon: faBolt, color: 'text-amber-500', bg: 'bg-amber-500/10', softDelete: false, dateCol: null },
    { key: 'audit_logs', label: 'Audit Logs', icon: faDatabase, color: 'text-slate-500', bg: 'bg-slate-500/10', softDelete: false, optional: true, dateCol: 'created_at' },
    { key: 'school_settings', label: 'Pengaturan Sekolah', icon: faFloppyDisk, color: 'text-cyan-500', bg: 'bg-cyan-500/10', softDelete: false, optional: true, dateCol: null },
]

const INTEGRITY_CHECKS = [
    {
        id: 'orphan_students',
        label: 'Siswa tanpa kelas valid',
        desc: 'Siswa aktif yang class_id-nya kosong atau tidak cocok dengan tabel classes',
        severity: 'warning',
        icon: faUsers,
        canRepair: true,
        columns: [
            { label: 'Nama Siswa', key: 'name', width: '1fr' },
            { label: 'Class ID', key: 'class_id', width: '200px', mono: true },
        ],
    },
    {
        id: 'duplicate_reg_codes',
        label: 'Duplikat ID Reg (Siswa)',
        desc: 'Siswa yang memiliki ID Registrasi / Nomor Induk yang sama',
        severity: 'error',
        icon: faCheckDouble,
        columns: [
            { label: 'ID Reg', key: 'code', width: '120px', mono: true, highlight: true },
            { label: 'Nama-nama Terkait', key: 'names', width: '1fr' },
            { label: 'Jumlah', key: 'count', width: '70px' },
        ],
    },
    {
        id: 'orphan_reports',
        label: 'Poin tanpa siswa valid',
        desc: 'Data poin yang student_id-nya tidak ada di tabel students',
        severity: 'error',
        icon: faShield,
        canRepair: true,
        columns: [
            { label: 'Report ID', key: 'id', width: '200px', mono: true },
            { label: 'Student ID', key: 'student_id', width: '200px', mono: true },
            { label: 'Poin', key: 'points', width: '70px', highlight: true },
        ],
    },
    {
        id: 'orphan_raport',
        label: 'Raport tanpa siswa valid',
        desc: 'Raport bulanan yang student_id-nya tidak ada di tabel students',
        severity: 'error',
        icon: faClipboardList,
        canRepair: true,
        columns: [
            { label: 'Raport ID', key: 'id', width: '200px', mono: true },
            { label: 'Student ID', key: 'student_id', width: '200px', mono: true },
            { label: 'Bulan/Tahun', key: 'period', width: '100px' },
        ],
    },
    {
        id: 'empty_classes',
        label: 'Kelas tanpa siswa',
        desc: 'Kelas aktif yang tidak memiliki siswa sama sekali',
        severity: 'info',
        icon: faSchool,
        columns: [
            { label: 'Nama Kelas', key: 'name', width: '1fr' },
            { label: 'ID', key: 'id', width: '200px', mono: true },
        ],
    },
    {
        id: 'duplicate_students',
        label: 'Siswa dengan nama duplikat',
        desc: 'Nama siswa yang muncul lebih dari 1x dalam satu kelas',
        severity: 'warning',
        icon: faCheckDouble,
        columns: [
            { label: 'Nama Siswa', key: 'name', width: '1fr' },
            { label: 'Kelas', key: 'class_name', width: '120px' },
            { label: 'Jumlah', key: 'dup_count', width: '70px', highlight: true },
        ],
    },
    {
        id: 'unlinked_teachers',
        label: 'Guru tanpa akun login',
        desc: 'Guru aktif yang belum di-link ke profil akun',
        severity: 'info',
        icon: faLinkSlash,
        columns: [
            { label: 'Nama Guru', key: 'name', width: '1fr' },
            { label: 'NBM / NIP', key: 'nbm', width: '140px', mono: true },
        ],
    },
    {
        id: 'duplicate_teachers',
        label: 'Duplikat NBM (Guru/Karyawan)',
        desc: 'Guru/Karyawan yang memiliki NBM/NIP yang sama',
        severity: 'warning',
        icon: faCheckDouble,
        columns: [
            { label: 'NBM / NIP', key: 'nbm', width: '140px', mono: true, highlight: true },
            { label: 'Nama-nama Terkait', key: 'names', width: '1fr' },
            { label: 'Jumlah', key: 'dup_count', width: '70px' },
        ],
    },
]

const SEVERITY_STYLE = {
    error: { color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/25', icon: faCircleExclamation },
    warning: { color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/25', icon: faTriangleExclamation },
    info: { color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/25', icon: faCircleInfo },
    ok: { color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/25', icon: faCircleCheck },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtNumber = (n) => typeof n === 'number' ? n.toLocaleString('id-ID') : '—'
const fmtDateTime = (d) => {
    if (!d) return '—'
    return new Date(d).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

// ─── Table Row ────────────────────────────────────────────────────────────────

function TableRow({ table, data, isExpanded, onToggle }) {
    const { active, deleted, total, exists, lastCreated, error } = data || {}

    if (!exists && !error) {
        return (
            <div className="flex items-center gap-3 px-5 py-3.5 opacity-40">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${table.bg}`}>
                    <FontAwesomeIcon icon={table.icon} className={`text-[11px] ${table.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-black text-[var(--color-text-muted)]">{table.label}</p>
                    <p className="text-[9px] text-[var(--color-text-muted)] font-mono">{table.key}</p>
                </div>
                <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] border border-[var(--color-border)]">
                    Tidak ada
                </span>
            </div>
        )
    }

    return (
        <div className={`transition-colors ${isExpanded ? 'bg-[var(--color-primary)]/[0.02]' : 'hover:bg-[var(--color-surface-alt)]/50'}`}>
            <div
                className="grid grid-cols-1 md:grid-cols-[1fr_100px_100px_100px_140px_40px] gap-3 px-5 py-3.5 items-center cursor-pointer"
                onClick={onToggle}
            >
                {/* Name */}
                <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${table.bg}`}>
                        <FontAwesomeIcon icon={table.icon} className={`text-[11px] ${table.color}`} />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[12px] font-black text-[var(--color-text)] truncate">{table.label}</p>
                        <p className="text-[9px] text-[var(--color-text-muted)] font-mono">{table.key}</p>
                    </div>
                </div>

                {/* Active */}
                <div className="hidden md:block text-center">
                    <p className="text-[15px] font-black text-[var(--color-text)] tabular-nums">{fmtNumber(active ?? total)}</p>
                    <p className="text-[8px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Aktif</p>
                </div>

                {/* Deleted */}
                <div className="hidden md:block text-center">
                    {table.softDelete ? (
                        <>
                            <p className={`text-[15px] font-black tabular-nums ${deleted > 0 ? 'text-amber-500' : 'text-[var(--color-text-muted)]'}`}>
                                {fmtNumber(deleted ?? 0)}
                            </p>
                            <p className="text-[8px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Dihapus</p>
                        </>
                    ) : (
                        <span className="text-[8px] text-[var(--color-text-muted)]">—</span>
                    )}
                </div>

                {/* Total */}
                <div className="hidden md:block text-center">
                    <p className="text-[15px] font-black text-[var(--color-primary)] tabular-nums">{fmtNumber(total)}</p>
                    <p className="text-[8px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Total</p>
                </div>

                {/* Last created */}
                <div className="hidden md:block">
                    <p className="text-[10px] font-bold text-[var(--color-text-muted)] truncate">{fmtDateTime(lastCreated)}</p>
                    <p className="text-[8px] text-[var(--color-text-muted)] opacity-60">Terakhir dibuat</p>
                </div>

                {/* Expand */}
                <div className="hidden md:flex items-center justify-center">
                    <FontAwesomeIcon
                        icon={isExpanded ? faChevronUp : faChevronDown}
                        className={`text-[10px] ${isExpanded ? 'text-[var(--color-primary)]' : 'text-[var(--color-border)]'}`}
                    />
                </div>
            </div>

            {/* Expanded detail — mobile friendly stats */}
            {isExpanded && (
                <div className="px-5 pb-4 border-t border-[var(--color-border)]/50">
                    <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="p-3 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)]">
                            <p className="text-[8px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1">Aktif</p>
                            <p className="text-lg font-black text-[var(--color-text)] tabular-nums">{fmtNumber(active ?? total)}</p>
                        </div>
                        {table.softDelete && (
                            <div className="p-3 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)]">
                                <p className="text-[8px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1">Soft Deleted</p>
                                <p className={`text-lg font-black tabular-nums ${deleted > 0 ? 'text-amber-500' : 'text-[var(--color-text)]'}`}>
                                    {fmtNumber(deleted ?? 0)}
                                </p>
                            </div>
                        )}
                        <div className="p-3 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)]">
                            <p className="text-[8px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1">Total Rows</p>
                            <p className="text-lg font-black text-[var(--color-primary)] tabular-nums">{fmtNumber(total)}</p>
                        </div>
                        <div className="p-3 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)]">
                            <p className="text-[8px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1">Entry Terakhir</p>
                            <p className="text-[11px] font-bold text-[var(--color-text)]">{fmtDateTime(lastCreated)}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

// ─── Integrity Check Row ──────────────────────────────────────────────────────

function IntegrityRow({ check, result, isExpanded, onToggle, onRepair }) {
    const count = result?.count ?? null
    const items = result?.items || []
    const repairing = result?.repairing ?? false
    const isOk = count === 0
    const severity = isOk ? 'ok' : check.severity
    const style = SEVERITY_STYLE[severity]
    const hasItems = items.length > 0
    const canExpand = !isOk && hasItems

    return (
        <div className={`rounded-xl border transition-all ${style.border} ${isOk ? 'bg-transparent' : isExpanded ? style.bg : 'hover:' + style.bg}`}>
            {/* Header — clickable saat ada data */}
            <div
                className={`flex items-center gap-3 px-4 py-3 ${canExpand ? 'cursor-pointer' : ''}`}
                onClick={canExpand ? onToggle : undefined}
            >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${style.bg}`}>
                    <FontAwesomeIcon icon={isOk ? faCircleCheck : style.icon} className={`text-[11px] ${style.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <p className={`text-[12px] font-black leading-tight ${isOk ? 'text-[var(--color-text-muted)]' : 'text-[var(--color-text)]'}`}>
                            {check.label}
                        </p>
                        {count !== null && !isOk && (
                            <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full border ${style.bg} ${style.color} ${style.border}`}>
                                {count} ditemukan
                            </span>
                        )}
                    </div>
                    <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">{check.desc}</p>
                </div>
                {count !== null && isOk && (
                    <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shrink-0">
                        Bersih
                    </span>
                )}
                {canExpand && (
                    <div className="flex items-center gap-2 shrink-0">
                        {check.canRepair && !isOk && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onRepair(check.id) }}
                                disabled={repairing}
                                className={`text-[10px] font-black px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 disabled:opacity-50 ${style.bg} ${style.color} ${style.border} hover:scale-105 active:scale-95`}
                                title={`Bersihkan data ${check.label}`}
                            >
                                <FontAwesomeIcon icon={repairing ? faSpinner : faTrash} className={repairing ? 'animate-spin' : ''} />
                                <span>{repairing ? 'Membersihkan...' : 'Bersihkan'}</span>
                            </button>
                        )}
                        <FontAwesomeIcon
                            icon={isExpanded ? faChevronUp : faChevronDown}
                            className={`text-[10px] ${isExpanded ? style.color : 'text-[var(--color-text-muted)]'}`}
                        />
                    </div>
                )}
            </div>

            {/* Expanded detail — daftar data bermasalah */}
            {isExpanded && hasItems && (
                <div className="px-4 pb-3">
                    <div className="rounded-xl border border-[var(--color-border)] overflow-hidden">
                        {/* Column headers */}
                        <div className="grid gap-2 px-3 py-2 bg-[var(--color-surface-alt)] border-b border-[var(--color-border)]" style={{ gridTemplateColumns: check.columns?.map(c => c.width || '1fr').join(' ') || '1fr' }}>
                            {(check.columns || [{ label: 'Data', key: 'label' }]).map((col, i) => (
                                <p key={i} className="text-[8px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">
                                    {col.label}
                                </p>
                            ))}
                        </div>

                        {/* Data rows */}
                        <div className="max-h-[280px] overflow-y-auto divide-y divide-[var(--color-border)]">
                            {items.slice(0, 50).map((item, idx) => (
                                <div
                                    key={item.id || idx}
                                    className="grid gap-2 px-3 py-2 hover:bg-[var(--color-surface-alt)]/50 transition-colors"
                                    style={{ gridTemplateColumns: check.columns?.map(c => c.width || '1fr').join(' ') || '1fr' }}
                                >
                                    {(check.columns || [{ key: 'label' }]).map((col, i) => (
                                        <p key={i} className={`text-[11px] truncate ${col.mono ? 'font-mono text-[10px] text-[var(--color-text-muted)]'
                                            : col.highlight ? `font-bold ${style.color}`
                                                : 'font-medium text-[var(--color-text)]'
                                            }`}>
                                            {item[col.key] ?? '—'}
                                        </p>
                                    ))}
                                </div>
                            ))}
                        </div>

                        {/* Footer — if truncated */}
                        {items.length > 50 && (
                            <div className="px-3 py-2 bg-[var(--color-surface-alt)] border-t border-[var(--color-border)]">
                                <p className="text-[9px] text-[var(--color-text-muted)] font-bold">
                                    Menampilkan 50 dari {items.length} data. Sisanya bisa dilihat langsung di Supabase.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DatabasePage() {
    const { profile } = useAuth()
    const { addToast } = useToast()
    const isAllowed = ALLOWED_ROLES.includes(profile?.role)

    const [tableData, setTableData] = useState({})
    const [integrityResults, setIntegrityResults] = useState({})
    const [loadingTables, setLoadingTables] = useState(true)
    const [loadingIntegrity, setLoadingIntegrity] = useState(false)
    const [expandedTable, setExpandedTable] = useState(null)
    const [expandedIntegrity, setExpandedIntegrity] = useState(null)
    const [search, setSearch] = useState('')
    const [lastRefresh, setLastRefresh] = useState(null)
    const [autoRefresh, setAutoRefresh] = useState(false)

    // ── Fetch table counts ────────────────────────────────────────────────────

    const fetchTableCounts = useCallback(async (quiet = false) => {
        if (!isAllowed) return
        if (!quiet) setLoadingTables(true)

        const results = {}

        await Promise.all(TABLE_CONFIG.map(async (table) => {
            try {
                // Count total
                const { count: totalCount, error: totalErr } = await supabase
                    .from(table.key)
                    .select('*', { count: 'exact', head: true })

                if (totalErr) {
                    if (totalErr.message?.includes('does not exist') || totalErr.message?.includes('Not Found') || totalErr.code === '42P01' || totalErr.code === 'PGRST116') {
                        results[table.key] = { exists: false }
                        return
                    }
                    throw totalErr
                }

                let active = totalCount
                let deleted = 0

                if (table.softDelete) {
                    const { count: activeCount } = await supabase
                        .from(table.key)
                        .select('*', { count: 'exact', head: true })
                        .is('deleted_at', null)

                    active = activeCount ?? 0
                    deleted = (totalCount ?? 0) - active
                }

                // Get last created
                let lastCreated = null
                if (table.dateCol) {
                    try {
                        const { data: lastRow } = await supabase
                            .from(table.key)
                            .select(table.dateCol)
                            .order(table.dateCol, { ascending: false })
                            .limit(1)
                            .maybeSingle()
                        lastCreated = lastRow?.[table.dateCol] ?? null
                    } catch { /* some tables might not have created_at */ }
                }

                results[table.key] = {
                    exists: true,
                    total: totalCount ?? 0,
                    active,
                    deleted,
                    lastCreated,
                }
            } catch (err) {
                results[table.key] = { exists: true, total: 0, error: err.message }
            }
        }))

        setTableData(results)
        setLastRefresh(new Date())
        if (!quiet) setLoadingTables(false)
    }, [isAllowed])

    // ── Fetch integrity checks ────────────────────────────────────────────────

    const fetchIntegrity = useCallback(async () => {
        if (!isAllowed) return
        setLoadingIntegrity(true)
        setExpandedIntegrity(null)

        const results = {}

        try {
            // ── Fetch base data ──────────────────────────────────────
            const { data: allStudents, error: errStudents } = await supabase.from('students').select('id, name, class_id, registration_code').is('deleted_at', null)
            const { data: allTeachers, error: errTeachers } = await supabase.from('teachers').select('id, name, nbm').is('deleted_at', null)
            const { data: allClasses, error: errClasses } = await supabase.from('classes').select('id, name')

            if (errStudents) throw new Error('Gagal memuat data siswa: ' + errStudents.message)
            if (errTeachers) throw new Error('Gagal memuat data guru: ' + errTeachers.message)
            if (errClasses) throw new Error('Gagal memuat data kelas: ' + errClasses.message)

            const classIds = new Set((allClasses || []).map(c => c.id))
            const classMap = Object.fromEntries((allClasses || []).map(c => [c.id, c.name]))
            const studentIds = new Set((allStudents || []).map(s => s.id))

            // Fetch ALL student IDs including soft-deleted for orphan checks
            const { data: allHistoricalStudents, error: errHistStudents } = await supabase.from('students').select('id')
            if (errHistStudents) throw new Error('Gagal memuat data histori siswa: ' + errHistStudents.message)
            const allStudentIds = new Set((allHistoricalStudents || []).map(s => s.id))

            // 1. Orphan students — students with class_id not in classes
            const orphanStudents = (allStudents || []).filter(s => s.class_id && !classIds.has(s.class_id))
            results.orphan_students = {
                count: orphanStudents.length,
                items: orphanStudents.map(s => ({ id: s.id, name: s.name || '(tanpa nama)', class_id: s.class_id })),
            }

            // 2. Orphan reports — reports with student_id not in students
            const { data: allReports } = await supabase.from('reports').select('id, student_id, points')
            const orphanReports = (allReports || []).filter(r => r.student_id && !allStudentIds.has(r.student_id))
            results.orphan_reports = {
                count: orphanReports.length,
                items: orphanReports.map(r => ({ id: r.id, student_id: r.student_id, points: r.points ?? '—' })),
            }

            // 3. Orphan raport — raport with student_id not in students
            const { data: allRaport } = await supabase.from('student_monthly_reports').select('id, student_id, month, year')
            const orphanRaport = (allRaport || []).filter(r => r.student_id && !allStudentIds.has(r.student_id))
            results.orphan_raport = {
                count: orphanRaport.length,
                items: orphanRaport.map(r => ({
                    id: r.id,
                    student_id: r.student_id,
                    period: r.month && r.year ? `${r.month}/${r.year}` : '—',
                })),
            }

            // 4. Empty classes — classes with no students
            const classStudentCount = {}
                ; (allStudents || []).forEach(s => {
                    if (s.class_id) classStudentCount[s.class_id] = (classStudentCount[s.class_id] || 0) + 1
                })
            const emptyClasses = (allClasses || []).filter(c => !classStudentCount[c.id])
            results.empty_classes = {
                count: emptyClasses.length,
                items: emptyClasses.map(c => ({ id: c.id, name: c.name || '(tanpa nama)' })),
            }

            // 5. Duplicate students — same name in same class
            const nameGroups = {}
                ; (allStudents || []).forEach(s => {
                    const key = `${(s.name || '').trim().toLowerCase()}__${s.class_id}`
                    if (!nameGroups[key]) nameGroups[key] = { name: s.name, class_id: s.class_id, ids: [] }
                    nameGroups[key].ids.push(s.id)
                })
            const duplicates = Object.values(nameGroups).filter(g => g.ids.length > 1)
            results.duplicate_students = {
                count: duplicates.reduce((sum, g) => sum + g.ids.length - 1, 0),
                items: duplicates.map(g => ({
                    id: g.ids.join(','),
                    name: g.name || '(tanpa nama)',
                    class_name: classMap[g.class_id] || g.class_id || '—',
                    dup_count: `${g.ids.length}x`,
                })),
            }

            // 6. Unlinked teachers — teachers without profile_id
            try {
                const { data: unlinked } = await supabase
                    .from('teachers')
                    .select('id, name, nbm')
                    .is('deleted_at', null)
                    .is('profile_id', null)
                results.unlinked_teachers = {
                    count: (unlinked || []).length,
                    items: (unlinked || []).map(t => ({ id: t.id, name: t.name || '(tanpa nama)', nbm: t.nbm || '—' })),
                }
            } catch {
                results.unlinked_teachers = { count: 0, items: [], note: 'profile_id column may not exist' }
            }

            // 7. Duplicate IDs (Registration Code)
            const regCodeMap = {}
                ; (allStudents || []).forEach(s => {
                    if (!s.registration_code) return
                    const code = s.registration_code.trim()
                    if (!regCodeMap[code]) regCodeMap[code] = []
                    regCodeMap[code].push(s.name)
                })
            const duplicateRegs = Object.entries(regCodeMap).filter(([_, ns]) => ns.length > 1)
            results.duplicate_reg_codes = {
                count: duplicateRegs.reduce((sum, [_, ns]) => sum + ns.length - 1, 0),
                items: duplicateRegs.map(([code, ns]) => ({
                    id: code,
                    code: code,
                    names: ns.join(', '),
                    count: `${ns.length}x`
                }))
            }

            // 8. Duplicate Teachers (NBM)
            const nbmMap = {}
                ; (allTeachers || []).forEach(t => {
                    if (!t.nbm) return
                    const nbm = t.nbm.trim()
                    if (!nbmMap[nbm]) nbmMap[nbm] = []
                    nbmMap[nbm].push(t.name)
                })
            const duplicateNbms = Object.entries(nbmMap).filter(([_, ns]) => ns.length > 1)
            results.duplicate_teachers = {
                count: duplicateNbms.reduce((sum, [_, ns]) => sum + ns.length - 1, 0),
                items: duplicateNbms.map(([nbm, ns]) => ({
                    id: nbm,
                    nbm,
                    names: ns.join(', '),
                    dup_count: `${ns.length}x`
                }))
            }

        } catch (err) {
            console.error(err)
            addToast('Gagal cek integritas: ' + err.message, 'error')
        }

        setIntegrityResults(results)
        setLoadingIntegrity(false)
    }, [isAllowed, addToast])

    const handleRepair = async (id) => {
        if (!confirm(`Tindakan ini akan menghapus data yang tidak valid secara permanen. Lanjutkan?`)) return

        setIntegrityResults(prev => ({ ...prev, [id]: { ...prev[id], repairing: true } }))
        try {
            const result = integrityResults[id]
            const itemsToDelete = result?.items?.map(item => item.id) || []

            if (itemsToDelete.length === 0) return

            let table = ''
            let action = 'delete'

            if (id === 'orphan_reports') table = 'reports'
            else if (id === 'orphan_raport') table = 'student_monthly_reports'
            else if (id === 'orphan_students') {
                table = 'students'
                action = 'clear_class'
            }

            if (!table) throw new Error('Action cleanup belum didukung untuk tabel ini.')

            let error = null
            if (action === 'delete') {
                const { error: err } = await supabase.from(table).delete().in('id', itemsToDelete)
                error = err
            } else if (action === 'clear_class') {
                const { error: err } = await supabase.from(table).update({ class_id: null }).in('id', itemsToDelete)
                error = err
            }

            if (error) throw error

            const msg = action === 'delete'
                ? `${itemsToDelete.length} data ${table} berhasil dibersihkan`
                : `${itemsToDelete.length} siswa berhasil diperbaiki (kelas dikosongkan)`
            addToast(msg, 'success')
            await logAudit({
                action: action === 'delete' ? 'DELETE' : 'UPDATE',
                source: 'SYSTEM',
                tableName: table,
                newData: { repair: true, id: id, count: itemsToDelete.length, ids: itemsToDelete }
            })
            fetchIntegrity()
            fetchTableCounts(true)
        } catch (err) {
            addToast('Gagal membersihkan data: ' + err.message, 'error')
            setIntegrityResults(prev => ({ ...prev, [id]: { ...prev[id], repairing: false } }))
        }
    }

    // ── Initial load ──────────────────────────────────────────────────────────

    useEffect(() => { fetchTableCounts() }, [fetchTableCounts])

    // ── Auto refresh ──────────────────────────────────────────────────────────

    useEffect(() => {
        if (!autoRefresh) return
        const iv = setInterval(() => fetchTableCounts(true), 60000)
        return () => clearInterval(iv)
    }, [autoRefresh, fetchTableCounts])

    // ── Computed stats ────────────────────────────────────────────────────────

    const summaryStats = useMemo(() => {
        const tables = Object.values(tableData)
        const existing = tables.filter(t => t.exists)
        const totalRows = existing.reduce((sum, t) => sum + (t.total || 0), 0)
        const totalActive = existing.reduce((sum, t) => sum + (t.active ?? t.total ?? 0), 0)
        const totalDeleted = existing.reduce((sum, t) => sum + (t.deleted || 0), 0)
        return {
            tableCount: existing.length,
            totalRows,
            totalActive,
            totalDeleted,
        }
    }, [tableData])

    const integrityScore = useMemo(() => {
        const results = Object.values(integrityResults)
        if (results.length === 0) return null
        const issues = results.filter(r => (r.count || 0) > 0).length
        return {
            total: results.length,
            passed: results.length - issues,
            failed: issues,
            percentage: Math.round(((results.length - issues) / results.length) * 100),
        }
    }, [integrityResults])

    // ── Filtered tables ───────────────────────────────────────────────────────

    const filteredTables = useMemo(() => {
        if (!search.trim()) return TABLE_CONFIG
        const q = search.toLowerCase()
        return TABLE_CONFIG.filter(t =>
            t.label.toLowerCase().includes(q) ||
            t.key.toLowerCase().includes(q)
        )
    }, [search])

    // ── Export summary ────────────────────────────────────────────────────────

    const exportSummary = () => {
        const lines = ['Database Health Summary', `Generated: ${new Date().toISOString()}`, '']
        lines.push('TABLE COUNTS', '─'.repeat(60))
        TABLE_CONFIG.forEach(t => {
            const d = tableData[t.key]
            if (!d?.exists) { lines.push(`${t.key}: (tidak ada)`); return }
            lines.push(`${t.key}: ${d.total} total, ${d.active ?? d.total} aktif${d.deleted ? `, ${d.deleted} dihapus` : ''}`)
        })
        lines.push('', 'INTEGRITY CHECKS', '─'.repeat(60))
        INTEGRITY_CHECKS.forEach(c => {
            const r = integrityResults[c.id]
            lines.push(`[${r?.count === 0 ? 'OK' : r?.count != null ? 'ISSUE' : '??'}] ${c.label}: ${r?.count ?? 'belum dicek'} ${r?.count > 0 ? `(${c.severity})` : ''}`)
        })
        lines.push('', `Total rows: ${summaryStats.totalRows}`, `Tables: ${summaryStats.tableCount}`)

        const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8;' })
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = `db_health_${new Date().toISOString().slice(0, 10)}.txt`
        a.click()
        URL.revokeObjectURL(a.href)
        addToast('Summary diekspor ✓', 'success')
    }

    // ─── Access denied ────────────────────────────────────────────────────────

    if (!isAllowed) return (
        <DashboardLayout title="Database Health">
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
                <div className="w-20 h-20 rounded-3xl bg-red-500/10 flex items-center justify-center">
                    <FontAwesomeIcon icon={faShieldHalved} className="text-3xl text-red-500" />
                </div>
                <div className="text-center">
                    <h2 className="text-xl font-black text-[var(--color-text)] mb-2">Akses Terbatas</h2>
                    <p className="text-[var(--color-text-muted)] text-sm">
                        Halaman ini hanya untuk <span className="font-black text-red-500">Admin</span> atau <span className="font-black text-red-500">Developer</span>.
                    </p>
                </div>
            </div>
        </DashboardLayout>
    )

    // ─── Main render ──────────────────────────────────────────────────────────

    return (
        <DashboardLayout title="Database Health">
            <div className="p-4 md:p-6 space-y-4">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <Breadcrumb badge="Admin" items={['Engine Health']} className="mb-1" />
                        <div className="flex items-center gap-2.5 mb-1">
                            <h1 className="text-2xl font-black font-heading tracking-tight text-[var(--color-text)]">Database Health</h1>
                            {integrityScore && (
                                <div
                                    className={`px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 ${integrityScore.percentage >= 90 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600'
                                        : integrityScore.percentage >= 70 ? 'bg-amber-500/10 border-amber-500/20 text-amber-600'
                                            : 'bg-red-500/10 border-red-500/20 text-red-600'
                                        }`}
                                >
                                    <div className={`w-1 h-1 rounded-full ${integrityScore.percentage >= 90 ? 'bg-emerald-500' : integrityScore.percentage >= 70 ? 'bg-amber-500' : 'bg-red-500'}`} />
                                    <span>Score: {integrityScore.percentage}%</span>
                                </div>
                            )}
                            <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 uppercase tracking-widest">
                                Admin Only
                            </span>
                        </div>
                        <p className="text-[var(--color-text-muted)] text-[11px] font-medium opacity-70">
                            Monitoring jumlah data, integritas, dan kesehatan database.
                            {lastRefresh && (
                                <span className="ml-2 tabular-nums">
                                    Terakhir: {fmtDateTime(lastRefresh)}
                                </span>
                            )}
                        </p>
                    </div>
                    <div className="flex gap-2 items-center">
                        <button
                            onClick={() => setAutoRefresh(v => !v)}
                            className={`h-9 px-3 rounded-xl border text-[10px] font-black flex items-center gap-2 transition-all ${autoRefresh
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600'
                                : 'border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                                }`}
                            title="Auto-refresh 60 detik"
                        >
                            <FontAwesomeIcon icon={faArrowsRotate} className={autoRefresh ? 'animate-spin' : ''} style={{ animationDuration: '3s' }} />
                            <span className="hidden sm:inline">{autoRefresh ? 'Auto On' : 'Auto-refresh'}</span>
                        </button>
                        <button
                            onClick={() => fetchTableCounts()}
                            disabled={loadingTables}
                            className="h-9 w-9 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] flex items-center justify-center hover:text-[var(--color-text)] transition-all disabled:opacity-50"
                            title="Refresh"
                        >
                            <FontAwesomeIcon icon={faRotateRight} className={`text-sm ${loadingTables ? 'animate-spin' : ''}`} />
                        </button>
                        <button
                            onClick={exportSummary}
                            disabled={loadingTables}
                            className="h-9 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] text-[10px] font-black flex items-center gap-1.5 hover:text-[var(--color-text)] transition-all disabled:opacity-40"
                        >
                            <FontAwesomeIcon icon={faDownload} className="text-[10px]" />
                            <span className="hidden sm:inline">Export</span>
                        </button>
                    </div>
                </div>

                {/* Summary Stats */}
                <StatsCarousel count={4}>
                    {[
                        { label: 'Total Tabel', value: summaryStats.tableCount, icon: faDatabase, color: 'text-cyan-500', bg: 'bg-cyan-500/10' },
                        { label: 'Total Rows', value: summaryStats.totalRows, icon: faBolt, color: 'text-[var(--color-primary)]', bg: 'bg-[var(--color-primary)]/10' },
                        { label: 'Integrity Score', value: integrityScore?.percentage != null ? `${integrityScore.percentage}%` : '—', icon: faShieldHalved, color: integrityScore?.percentage >= 90 ? 'text-emerald-500' : integrityScore?.percentage >= 70 ? 'text-amber-500' : 'text-red-500', bg: integrityScore?.percentage >= 90 ? 'bg-emerald-500/10' : integrityScore?.percentage >= 70 ? 'bg-amber-500/10' : 'bg-red-500/10' },
                        { label: 'Soft Deleted', value: summaryStats.totalDeleted, icon: faTriangleExclamation, color: 'text-amber-500', bg: 'bg-amber-500/10' },
                    ].map((s, i) => (
                        <div key={i} className="shrink-0 snap-center w-[200px] xs:w-[220px] sm:w-auto glass rounded-[1.5rem] p-4 flex items-center gap-3 border border-[var(--color-border)] transition-all hover:scale-[1.02]">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${s.bg}`}>
                                <FontAwesomeIcon icon={s.icon} className={`text-sm ${s.color}`} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">{s.label}</p>
                                <p className={`text-xl font-black font-heading tabular-nums ${i === 2 ? s.color : 'text-[var(--color-text)]'}`}>
                                    {loadingTables && i !== 2 ? '—' : s.value}
                                </p>
                            </div>
                        </div>
                    ))}
                </StatsCarousel>

                {/* Search */}
                <div className="glass rounded-[1.5rem] border border-[var(--color-border)] overflow-hidden">
                    <div className="flex items-center gap-2 p-3">
                        <div className="flex-1 relative">
                            <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] text-sm pointer-events-none" />
                            <input
                                type="text" value={search} onChange={e => setSearch(e.target.value)}
                                placeholder="Cari tabel..."
                                className="w-full h-9 pl-9 pr-8 rounded-xl border border-[var(--color-border)] bg-transparent text-xs font-medium text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] outline-none focus:border-[var(--color-primary)] transition-all"
                            />
                            {search && (
                                <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
                                    <FontAwesomeIcon icon={faXmark} className="text-xs" />
                                </button>
                            )}
                        </div>
                        <span className="text-[10px] font-bold text-[var(--color-text-muted)] shrink-0 tabular-nums">
                            {filteredTables.length} tabel
                        </span>
                    </div>
                </div>

                {/* Table Counts */}
                <div className="glass rounded-[1.5rem] border border-[var(--color-border)] overflow-hidden">
                    <div className="hidden md:grid grid-cols-[1fr_100px_100px_100px_140px_40px] gap-3 px-5 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface-alt)]">
                        {['Tabel', 'Aktif', 'Dihapus', 'Total', 'Terakhir Dibuat', ''].map((h, i) => (
                            <div key={i} className={`text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] ${i > 0 && i < 4 ? 'text-center' : ''}`}>
                                {h}
                            </div>
                        ))}
                    </div>

                    {loadingTables ? (
                        <div className="divide-y divide-[var(--color-border)]">
                            {Array.from({ length: 8 }).map((_, i) => (
                                <div key={i} className="px-5 py-3.5 flex items-center gap-3 animate-pulse">
                                    <div className="w-8 h-8 rounded-xl bg-[var(--color-border)] shrink-0" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-3 w-1/3 bg-[var(--color-border)] rounded" />
                                        <div className="h-2.5 w-1/4 bg-[var(--color-border)] rounded opacity-60" />
                                    </div>
                                    <div className="h-4 w-12 bg-[var(--color-border)] rounded hidden md:block" />
                                    <div className="h-4 w-12 bg-[var(--color-border)] rounded hidden md:block" />
                                    <div className="h-4 w-12 bg-[var(--color-border)] rounded hidden md:block" />
                                </div>
                            ))}
                        </div>
                    ) : filteredTables.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-[var(--color-surface-alt)] flex items-center justify-center">
                                <FontAwesomeIcon icon={faDatabase} className="text-2xl text-[var(--color-text-muted)] opacity-30" />
                            </div>
                            <div className="text-center">
                                <p className="text-[13px] font-black text-[var(--color-text)] mb-1">Tidak ditemukan</p>
                                <p className="text-[11px] text-[var(--color-text-muted)] opacity-60">Coba ubah kata kunci pencarian.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="divide-y divide-[var(--color-border)]">
                            {filteredTables.map(table => (
                                <TableRow
                                    key={table.key}
                                    table={table}
                                    data={tableData[table.key]}
                                    isExpanded={expandedTable === table.key}
                                    onToggle={() => setExpandedTable(expandedTable === table.key ? null : table.key)}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Integrity Checks */}
                <div className="glass rounded-[1.5rem] border border-[var(--color-border)] overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)] bg-[var(--color-surface-alt)]">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                                <FontAwesomeIcon icon={faCheckDouble} className="text-sm text-emerald-500" />
                            </div>
                            <div>
                                <p className="text-[13px] font-black text-[var(--color-text)]">Cek Integritas Data</p>
                                <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">
                                    Periksa data yang tidak konsisten, orphan, atau duplikat.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {integrityScore && (
                                <div className="hidden sm:flex items-center gap-2">
                                    <div className={`text-[10px] font-black px-2.5 py-1 rounded-full ${integrityScore.failed === 0
                                        ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                        : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                                        }`}>
                                        {integrityScore.passed}/{integrityScore.total} OK
                                    </div>
                                    <div className="w-16 h-1.5 rounded-full bg-[var(--color-border)] overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-500 ${integrityScore.failed === 0 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                                            style={{ width: `${integrityScore.percentage}%` }}
                                        />
                                    </div>
                                </div>
                            )}
                            <button
                                onClick={fetchIntegrity}
                                disabled={loadingIntegrity}
                                className="h-9 px-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-[10px] font-black flex items-center gap-1.5 hover:bg-emerald-500/20 transition-all disabled:opacity-50"
                            >
                                {loadingIntegrity ? (
                                    <FontAwesomeIcon icon={faSpinner} className="animate-spin text-[10px]" />
                                ) : (
                                    <FontAwesomeIcon icon={faCheckDouble} className="text-[10px]" />
                                )}
                                <span className="hidden sm:inline">{loadingIntegrity ? 'Memeriksa...' : 'Jalankan Cek'}</span>
                            </button>
                        </div>
                    </div>

                    <div className="p-3 space-y-2">
                        {Object.keys(integrityResults).length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 gap-3">
                                <div className="w-14 h-14 rounded-2xl bg-[var(--color-surface-alt)] flex items-center justify-center">
                                    <FontAwesomeIcon icon={faCheckDouble} className="text-2xl text-[var(--color-text-muted)] opacity-30" />
                                </div>
                                <div className="text-center">
                                    <p className="text-[13px] font-black text-[var(--color-text)] mb-1">Belum Diperiksa</p>
                                    <p className="text-[11px] text-[var(--color-text-muted)] opacity-60">
                                        Klik "Jalankan Cek" untuk memeriksa konsistensi dan integritas data.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            INTEGRITY_CHECKS.map(check => (
                                <IntegrityRow
                                    key={check.id}
                                    check={check}
                                    result={integrityResults[check.id]}
                                    isExpanded={expandedIntegrity === check.id}
                                    onToggle={() => setExpandedIntegrity(expandedIntegrity === check.id ? null : check.id)}
                                    onRepair={handleRepair}
                                />
                            ))
                        )}
                    </div>
                </div>

                {/* Info note */}
                <div className="p-3 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] flex items-start gap-2.5">
                    <FontAwesomeIcon icon={faCircleInfo} className="text-[var(--color-text-muted)] text-xs mt-0.5 shrink-0" />
                    <p className="text-[10px] text-[var(--color-text-muted)] leading-relaxed">
                        Data ditarik langsung dari Supabase via <code className="bg-[var(--color-surface)] px-1 rounded font-mono text-[9px]">SELECT COUNT(*)</code>.
                        Integritas data dicek dengan cross-reference antar tabel. Tidak ada data yang diubah — hanya baca.
                    </p>
                </div>

                <div className="h-8" />
            </div>
        </DashboardLayout>
    )
}
