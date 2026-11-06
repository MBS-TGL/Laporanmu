import { useState, useEffect, useMemo, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Archive, CalendarClock, ChevronLeft, ChevronRight, FilterX, LoaderCircle, RefreshCw, RotateCcw, Search, Trash2, TriangleAlert, Users, X } from 'lucide-react'
import { PageHeader, DataTable } from '@shared/components'
import DashboardLayout from '@core/layouts/DashboardLayout'
import { useToast } from '@context'
import { supabase } from '@lib/supabase'
import { logAudit } from '@utils/auditLogger'
import { formatRelativeDate } from '@features/students/utils/studentsConstants'

const PAGE_SIZE = 10
const DAY_MS = 1000 * 60 * 60 * 24

const PERIOD_OPTIONS = [
    { value: '', label: 'Semua' },
    { value: '7', label: '≤ 7 Hari' },
    { value: '30', label: '≤ 30 Hari' },
    { value: 'old', label: 'Lebih Lama' },
]

const daysArchived = (dateString) => Math.floor((Date.now() - new Date(dateString)) / DAY_MS)

/**
 * Halaman Arsip Siswa — pengganti ArchiveModal.
 * Kelola siswa yang di-soft-delete (deleted_at terisi): pulihkan atau hapus permanen,
 * dengan pencarian, filter kelas/periode, sorting, dan aksi massal. State tersinkron ke URL.
 * Route: /master/students/archive (guard role + module.students + students.archive di App.jsx)
 */
export default function ArchivePage() {
    const { addToast } = useToast()
    const [searchParams, setSearchParams] = useSearchParams()

    // ---- STATE ----
    const [archivedStudents, setArchivedStudents] = useState([])
    const [classesList, setClassesList] = useState([])
    const [loading, setLoading] = useState(true)

    const [search, setSearch] = useState(() => searchParams.get('q') || '')
    const [filterClass, setFilterClass] = useState(() => searchParams.get('c') || '')
    const [filterPeriod, setFilterPeriod] = useState(() => searchParams.get('p') || '')
    const [sortBy, setSortBy] = useState(() => searchParams.get('sort') || 'newest')

    const [deleteTarget, setDeleteTarget] = useState(null)
    const [deleting, setDeleting] = useState(false)
    const [restoring, setRestoring] = useState(false)

    const [selected, setSelected] = useState(() => new Set())
    const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
    const [bulkBusy, setBulkBusy] = useState(false)

    const [page, setPage] = useState(1)

    const hasFilter = Boolean(search || filterClass || filterPeriod)

    // ---- SYNC FILTERS KE URL (pattern useCore) ----
    useEffect(() => {
        const params = {}
        if (search) params.q = search
        if (filterClass) params.c = filterClass
        if (filterPeriod) params.p = filterPeriod
        if (sortBy !== 'newest') params.sort = sortBy

        Object.keys(params).forEach(key => !params[key] && delete params[key])
        const current = Object.fromEntries(searchParams.entries())
        if (JSON.stringify(current) !== JSON.stringify(params)) {
            setSearchParams(params, { replace: true })
        }
    }, [search, filterClass, filterPeriod, sortBy]) // eslint-disable-line react-hooks/exhaustive-deps

    // ---- FETCH ----
    const fetchArchived = useCallback(async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase.from('students').select(`*, classes(name)`).not('deleted_at', 'is', null).order('deleted_at', { ascending: false })
            if (error) throw error
            setArchivedStudents((data || []).map(s => ({ ...s, className: s.classes?.name || '-' })))
        } catch { addToast('Gagal memuat arsip', 'error') } finally { setLoading(false) }
    }, [addToast])

    const fetchClasses = useCallback(async () => {
        try {
            const { data, error } = await supabase.from('classes').select('id, name').order('name')
            if (error) throw error
            setClassesList(data || [])
        } catch { /* filter kelas bersifat opsional */ }
    }, [])

    useEffect(() => { fetchArchived() }, [fetchArchived])
    useEffect(() => { fetchClasses() }, [fetchClasses])

    // Reset ke halaman 1 saat filter berubah
    useEffect(() => { setPage(1) }, [search, filterClass, filterPeriod, sortBy])

    // ---- FILTER + SORT ----
    const filtered = useMemo(() => {
        let list = archivedStudents
        const q = search.trim().toLowerCase()
        if (q) list = list.filter(s => s.name?.toLowerCase().includes(q) || s.registration_code?.toLowerCase().includes(q))
        if (filterClass) list = list.filter(s => String(s.class_id) === String(filterClass))
        if (filterPeriod) {
            list = list.filter(s => {
                const d = daysArchived(s.deleted_at)
                if (filterPeriod === '7') return d <= 7
                if (filterPeriod === '30') return d > 7 && d <= 30
                return d > 30
            })
        }
        const sorted = [...list]
        switch (sortBy) {
            case 'oldest': sorted.sort((a, b) => new Date(a.deleted_at) - new Date(b.deleted_at)); break
            case 'name_asc': sorted.sort((a, b) => (a.name || '').localeCompare(b.name || '')); break
            case 'name_desc': sorted.sort((a, b) => (b.name || '').localeCompare(a.name || '')); break
            default: sorted.sort((a, b) => new Date(b.deleted_at) - new Date(a.deleted_at))
        }
        return sorted
    }, [archivedStudents, search, filterClass, filterPeriod, sortBy])

    const stats = useMemo(() => {
        const week = archivedStudents.filter(s => Date.now() - new Date(s.deleted_at) <= 7 * DAY_MS).length
        const month = archivedStudents.filter(s => Date.now() - new Date(s.deleted_at) <= 30 * DAY_MS).length
        return { total: archivedStudents.length, week, month }
    }, [archivedStudents])

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
    const safePage = Math.min(page, totalPages)
    const pagedRows = useMemo(
        () => filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
        [filtered, safePage]
    )

    // ---- SELEKSI (BULK) ----
    const toggleSelect = (s) => setSelected(prev => {
        const next = new Set(prev)
        next.has(s.id) ? next.delete(s.id) : next.add(s.id)
        return next
    })

    const allOnPageSelected = pagedRows.length > 0 && pagedRows.every(s => selected.has(s.id))
    const toggleSelectAll = () => setSelected(prev => {
        const next = new Set(prev)
        pagedRows.forEach(s => allOnPageSelected ? next.delete(s.id) : next.add(s.id))
        return next
    })

    const resetFilters = () => { setSearch(''); setFilterClass(''); setFilterPeriod(''); setSortBy('newest') }

    // ---- RESTORE SINGLE (audit-logged) ----
    const handleRestore = async (student) => {
        setRestoring(true)
        try {
            const { error } = await supabase.from('students').update({ deleted_at: null }).eq('id', student.id)
            if (error) throw error
            addToast(`${student.name} berhasil dipulihkan`, 'success')
            await logAudit({
                action: 'UPDATE', source: 'SYSTEM', tableName: 'students', recordId: student.id,
                oldData: student, newData: { ...student, deleted_at: null, restored: true }
            })
            setArchivedStudents(prev => prev.filter(s => s.id !== student.id))
        } catch { addToast('Gagal memulihkan', 'error') } finally { setRestoring(false) }
    }

    // ---- HAPUS PERMANEN (cascade + RLS guard + audit) ----
    const permanentDeleteOne = async (student) => {
        try {
            await supabase.from('student_class_history').delete().eq('student_id', student.id)
            await supabase.from('point_history').delete().eq('student_id', student.id)
            await supabase.from('reports').delete().eq('student_id', student.id)
            await supabase.from('student_monthly_reports').delete().eq('student_id', student.id)

            const { data, error } = await supabase.from('students').delete().eq('id', student.id).select()
            if (error) throw error
            if (!data || data.length === 0) {
                throw new Error("Penghapusan ditolak oleh database (mungkin terblokir RLS atau Foreign Key di tabel lain).")
            }

            await logAudit({
                action: 'DELETE', source: 'SYSTEM', tableName: 'students', recordId: student.id, oldData: student
            })
            return true
        } catch (err) {
            console.error('Delete error:', err)
            addToast(err.message || 'Gagal hapus permanen data', 'error')
            return false
        }
    }

    const confirmPermanentDelete = async () => {
        if (!deleteTarget) return
        setDeleting(true)
        const ok = await permanentDeleteOne(deleteTarget)
        if (ok) {
            addToast(`${deleteTarget.name} dihapus permanen`, 'success')
            setArchivedStudents(prev => prev.filter(s => s.id !== deleteTarget.id))
            setDeleteTarget(null)
        }
        setDeleting(false)
    }

    // ---- BULK RESTORE ----
    const bulkRestore = async () => {
        setBulkBusy(true)
        let ok = 0
        for (const id of selected) {
            const s = archivedStudents.find(x => x.id === id)
            if (!s) continue
            try {
                const { error } = await supabase.from('students').update({ deleted_at: null }).eq('id', id)
                if (error) throw error
                await logAudit({
                    action: 'UPDATE', source: 'SYSTEM', tableName: 'students', recordId: id,
                    oldData: s, newData: { ...s, deleted_at: null, restored: true }
                })
                ok++
            } catch { /* lanjut ke siswa berikutnya */ }
        }
        addToast(ok ? `${ok} siswa berhasil dipulihkan` : 'Gagal memulihkan siswa', ok ? 'success' : 'error')
        const ids = new Set(selected)
        setArchivedStudents(prev => prev.filter(s => !ids.has(s.id)))
        setSelected(new Set())
        setBulkBusy(false)
    }

    // ---- BULK HAPUS PERMANEN ----
    const bulkPermanentDelete = async () => {
        const targets = archivedStudents.filter(s => selected.has(s.id))
        setBulkBusy(true)
        let ok = 0
        for (const s of targets) {
            if (await permanentDeleteOne(s)) ok++
        }
        addToast(
            ok === targets.length ? `${ok} siswa dihapus permanen` : `${ok} dihapus, ${targets.length - ok} gagal`,
            ok ? 'success' : 'error'
        )
        setArchivedStudents(prev => prev.filter(s => !selected.has(s.id)))
        setSelected(new Set())
        setBulkDeleteOpen(false)
        setBulkBusy(false)
    }

    const showOverlay = Boolean(deleteTarget || bulkDeleteOpen)

    // ---- COLUMNS (DataTable) ----
    const columns = useMemo(() => [
        {
            key: 'name',
            header: 'Siswa',
            sortable: true,
            sortActive: sortBy === 'name_asc' ? 'asc' : sortBy === 'name_desc' ? 'desc' : null,
            onSort: () => setSortBy(prev => prev === 'name_asc' ? 'name_desc' : 'name_asc'),
            render: (s) => (
                <>
                    <p className="font-bold text-[var(--color-text)] leading-snug whitespace-nowrap">{s.name}</p>
                    <p className="font-mono text-[var(--color-text-muted)]">{s.registration_code}</p>
                </>
            ),
        },
        {
            key: 'className',
            header: 'Kelas',
            align: 'center',
            render: (s) => (
                <span className="font-bold bg-[var(--color-primary)]/10 text-[var(--color-primary)] px-1.5 py-0.5 rounded-md border border-[var(--color-primary)]/20 whitespace-nowrap">{s.className}</span>
            ),
        },
        {
            key: 'deleted_at',
            header: 'Diarsipkan',
            align: 'center',
            sortable: true,
            sortActive: sortBy === 'newest' ? 'desc' : sortBy === 'oldest' ? 'asc' : null,
            onSort: () => setSortBy(prev => prev === 'newest' ? 'oldest' : 'newest'),
            render: (s) => <span className="font-medium text-[var(--color-text-muted)] whitespace-nowrap">{formatRelativeDate(s.deleted_at)}</span>,
        },
        {
            key: 'actions',
            header: 'Aksi',
            align: 'right',
            render: (s) => (
                <div className="flex items-center justify-end gap-1.5">
                    <button
                        onClick={() => handleRestore(s)}
                        disabled={restoring || bulkBusy}
                        className="h-7 px-2.5 rounded-lg bg-success/10 text-success hover:bg-success hover:text-white border border-success/20 font-bold uppercase tracking-wide transition-colors flex items-center gap-1 disabled:opacity-50"
                    >
                        <RotateCcw className="w-4 h-4" />
                        Pulihkan
                    </button>
                    <button
                        onClick={() => setDeleteTarget(s)}
                        disabled={bulkBusy}
                        className="h-7 px-2.5 rounded-lg bg-danger/10 text-danger hover:bg-danger hover:text-white border border-danger/20 font-bold uppercase tracking-wide transition-colors flex items-center gap-1 disabled:opacity-50"
                    >
                        <Trash2 className="w-4 h-4" />
                        Hapus
                    </button>
                </div>
            ),
        },
    ], [sortBy, restoring, bulkBusy]) // eslint-disable-line react-hooks/exhaustive-deps

    const renderMobileCard = (s) => (
        <div className={`rounded-xl border p-3 bg-[var(--color-surface)] transition-colors ${selected.has(s.id) ? 'border-[var(--color-primary)]/40 bg-[var(--color-primary)]/5' : 'border-[var(--color-border)]'}`}>
            <div className="flex items-start gap-2.5">
                <input
                    type="checkbox"
                    checked={selected.has(s.id)}
                    onChange={() => toggleSelect(s)}
                    aria-label={`Pilih ${s.name}`}
                    className="w-4 h-4 mt-0.5 rounded accent-[var(--color-primary)] cursor-pointer shrink-0"
                />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                        <p className="font-bold text-[var(--color-text)] text-sm leading-snug truncate">{s.name}</p>
                        <span className="text-[10px] font-bold bg-[var(--color-primary)]/10 text-[var(--color-primary)] px-1.5 py-0.5 rounded-md border border-[var(--color-primary)]/20 shrink-0">{s.className}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-1">
                        <p className="text-xs font-mono text-[var(--color-text-muted)]">{s.registration_code}</p>
                        <p className="text-[11px] font-medium text-[var(--color-text-muted)]">{formatRelativeDate(s.deleted_at)}</p>
                    </div>
                    <div className="flex items-center gap-1.5 mt-2.5">
                        <button
                            onClick={() => handleRestore(s)}
                            disabled={restoring || bulkBusy}
                            className="flex-1 h-8 rounded-lg bg-success/10 text-success hover:bg-success hover:text-white border border-success/20 text-[11px] font-bold uppercase tracking-wide transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                        >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Pulihkan
                        </button>
                        <button
                            onClick={() => setDeleteTarget(s)}
                            disabled={bulkBusy}
                            className="flex-1 h-8 rounded-lg bg-danger/10 text-danger hover:bg-danger hover:text-white border border-danger/20 text-[11px] font-bold uppercase tracking-wide transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                            Hapus
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )

    return (
        <DashboardLayout>
            <div className="space-y-4">
                <PageHeader
                    badge="Kesantrian"
                    breadcrumbs={['Data Siswa', 'Arsip Siswa']}
                    title="Arsip Siswa"
                    subtitle="Kelola dan pulihkan data siswa yang telah dihapus sementara."
                    actions={
                        <button
                            onClick={fetchArchived}
                            disabled={loading}
                            title="Muat ulang data"
                            aria-label="Muat ulang data"
                            className="h-9 w-9 rounded-lg border flex items-center justify-center transition-all bg-surface-alt border-border text-text-muted enabled:hover:text-text enabled:active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    }
                />

                {/* ====== STAT CARDS ====== */}
                <div className="grid grid-cols-3 gap-3">
                    {[
                        { label: 'Total Arsip', value: stats.total, icon: Archive, color: 'var(--color-primary)' },
                        { label: 'Minggu Ini', value: stats.week, icon: CalendarClock, color: '#f59e0b' },
                        { label: '≤ 30 Hari', value: stats.month, icon: Users, color: '#10b981' },
                    ].map(({ label, value, icon: Icon, color }) => (
                        <div key={label} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5 sm:p-4 flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}1a`, color }}>
                                <Icon className="w-4.5 h-4.5" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-lg sm:text-xl font-bold text-[var(--color-text)] leading-none">{loading ? '—' : value}</p>
                                <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--color-text-muted)] mt-1 truncate">{label}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="relative">
                    {/* ====== DELETE CONFIRMATION OVERLAY (single / bulk) ====== */}
                    <div
                        className={`absolute inset-0 z-20 bg-[var(--color-app-bg)] flex flex-col items-center justify-center gap-4 p-6 rounded-xl transition-all duration-300 ease-out ${showOverlay ? 'opacity-100 visible scale-100' : 'opacity-0 invisible scale-95 pointer-events-none'}`}
                    >
                        <div className="w-14 h-14 rounded-2xl bg-danger/10 border border-danger/20 flex items-center justify-center">
                            <TriangleAlert className="w-6 h-6 text-danger" />
                        </div>
                        <div className="text-center max-w-xs">
                            <p className="text-sm font-bold text-[var(--color-text)] mb-1">
                                {bulkDeleteOpen ? `Hapus Permanen ${selected.size} Siswa?` : 'Hapus Permanen?'}
                            </p>
                            <p className="text-xs font-medium text-[var(--color-text-muted)] leading-relaxed">
                                {bulkDeleteOpen
                                    ? <>Akan menghapus <b className="text-danger">{selected.size} siswa</b> beserta semua relasinya (poin, absen, histori) secara permanen. Tindakan ini <b>tidak dapat dibatalkan</b>.</>
                                    : <>Data siswa <b className="text-danger">{deleteTarget?.name}</b> beserta semua relasi (poin, absen, histori) akan dihapus secara permanen. Tindakan ini <b>tidak dapat dibatalkan</b>.</>}
                            </p>
                        </div>
                        <div className="flex items-center w-full max-w-xs gap-3 mt-2">
                            <button
                                onClick={() => { setDeleteTarget(null); setBulkDeleteOpen(false) }}
                                disabled={deleting || bulkBusy}
                                className="h-9 px-5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] text-xs font-bold uppercase tracking-wide leading-none whitespace-nowrap transition-colors disabled:opacity-50 shrink-0"
                            >
                                Batal
                            </button>
                            <div className="flex-1" />
                            <button
                                onClick={bulkDeleteOpen ? bulkPermanentDelete : confirmPermanentDelete}
                                disabled={deleting || bulkBusy}
                                className="h-9 px-5 rounded-lg bg-danger hover:bg-danger-dark text-white text-xs font-bold uppercase tracking-wide leading-none whitespace-nowrap shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shrink-0"
                            >
                                {deleting || bulkBusy ? <><LoaderCircle className="w-4 h-4 animate-spin" /> Menghapus...</> : <><Trash2 className="w-4 h-4" /> Hapus Permanen</>}
                            </button>
                        </div>
                    </div>

                    {/* ====== BANNER RINGKASAN ====== */}
                    <div className="p-2.5 bg-warning/10 rounded-xl border border-warning/20 flex items-center gap-3">
                        <Archive className="w-5 h-5 text-warning-dark shrink-0" />
                        <div>
                            <p className="text-xs font-bold text-warning-dark dark:text-amber-400">{filtered.length} siswa di arsip</p>
                            <p className="text-xs text-[var(--color-text-muted)] font-medium">Pulihkan untuk mengembalikan ke daftar aktif, atau hapus permanen.</p>
                        </div>
                        {hasFilter && (
                            <button
                                onClick={resetFilters}
                                className="ml-auto h-7 px-2.5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-[11px] font-bold text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors flex items-center gap-1.5 shrink-0"
                            >
                                <FilterX className="w-3.5 h-3.5" />
                                Reset Filter
                            </button>
                        )}
                    </div>

                    {/* ====== FILTER BAR ====== */}
                    <div className="mt-4 flex flex-col sm:flex-row gap-2.5">
                        <div className="relative flex-1">
                            <Search className="w-4 h-4 text-[var(--color-text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Cari nama atau kode registrasi..."
                                className="w-full h-10 pl-10 pr-9 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 focus:border-[var(--color-primary)] transition-all"
                            />
                            {search && (
                                <button
                                    onClick={() => setSearch('')}
                                    aria-label="Bersihkan pencarian"
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                        <select
                            value={filterClass}
                            onChange={(e) => setFilterClass(e.target.value)}
                            aria-label="Filter kelas"
                            className="h-10 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm font-medium text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 focus:border-[var(--color-primary)] transition-all sm:w-44"
                        >
                            <option value="">Semua Kelas</option>
                            {classesList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <div className="flex rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1 gap-1 overflow-x-auto">
                            {PERIOD_OPTIONS.map(opt => (
                                <button
                                    key={opt.value || 'all'}
                                    onClick={() => setFilterPeriod(opt.value)}
                                    className={`h-8 px-3 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${filterPeriod === opt.value
                                        ? 'bg-[var(--color-primary)] text-white shadow-sm'
                                        : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)]'}`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* ====== KONTEN (DataTable + pagination) ====== */}
                    <div className="mt-4">
                        <div className="space-y-3">
                            <DataTable
                                columns={columns}
                                data={pagedRows}
                                loading={loading}
                                selectable
                                selectedIds={selected}
                                onToggleSelect={toggleSelect}
                                onToggleSelectAllPage={toggleSelectAll}
                                mobileCard={renderMobileCard}
                                empty={
                                    hasFilter
                                        ? { icon: Archive, title: 'Tidak Ditemukan', description: 'Tidak ada siswa yang cocok dengan filter aktif. Coba ubah atau reset filter.', variant: 'dashed', color: 'amber' }
                                        : { icon: Archive, title: 'Arsip Kosong', description: 'Tidak ada data siswa yang telah dihapus sementara saat ini.', variant: 'dashed', color: 'amber' }
                                }
                            />

                            {/* INFO + PAGINATION */}
                            {!loading && filtered.length > 0 && (
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-1">
                                    <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wide">
                                        Menampilkan {(safePage - 1) * PAGE_SIZE + 1}—{Math.min(safePage * PAGE_SIZE, filtered.length)} dari {filtered.length} Siswa
                                    </p>
                                    {totalPages > 1 && (
                                        <div className="flex items-center gap-1.5">
                                            <button
                                                disabled={safePage === 1}
                                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                                aria-label="Halaman sebelumnya"
                                                className="w-7 h-7 rounded-lg border border-[var(--color-border)] flex items-center justify-center disabled:opacity-30 hover:bg-[var(--color-surface-alt)] shadow-sm transition-colors"
                                            >
                                                <ChevronLeft className="w-4 h-4" />
                                            </button>
                                            <span className="text-xs font-bold text-[var(--color-text-muted)] px-1">{safePage} / {totalPages}</span>
                                            <button
                                                disabled={safePage >= totalPages}
                                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                                aria-label="Halaman berikutnya"
                                                className="w-7 h-7 rounded-lg border border-[var(--color-border)] flex items-center justify-center disabled:opacity-30 hover:bg-[var(--color-surface-alt)] shadow-sm transition-colors"
                                            >
                                                <ChevronRight className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ====== BULK ACTION BAR ====== */}
                {selected.size > 0 && !showOverlay && (
                    <div className="sticky bottom-4 z-30 flex items-center gap-2 sm:gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 shadow-xl shadow-black/10">
                        <div className="w-7 h-7 rounded-full bg-[var(--color-primary)] text-white text-xs font-bold flex items-center justify-center shrink-0">
                            {selected.size}
                        </div>
                        <p className="text-xs font-bold text-[var(--color-text)] hidden sm:block">siswa dipilih</p>
                        <div className="flex-1" />
                        <button
                            onClick={bulkRestore}
                            disabled={bulkBusy}
                            className="h-9 px-4 rounded-lg bg-success/10 text-success hover:bg-success hover:text-white border border-success/20 text-xs font-bold uppercase tracking-wide transition-colors flex items-center gap-1.5 disabled:opacity-50 whitespace-nowrap"
                        >
                            {bulkBusy ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                            Pulihkan
                        </button>
                        <button
                            onClick={() => setBulkDeleteOpen(true)}
                            disabled={bulkBusy}
                            className="h-9 px-4 rounded-lg bg-danger/10 text-danger hover:bg-danger hover:text-white border border-danger/20 text-xs font-bold uppercase tracking-wide transition-colors flex items-center gap-1.5 disabled:opacity-50 whitespace-nowrap"
                        >
                            <Trash2 className="w-4 h-4" />
                            Hapus Permanen
                        </button>
                        <button
                            onClick={() => setSelected(new Set())}
                            aria-label="Batal pilih"
                            className="w-9 h-9 rounded-lg border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors shrink-0"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>
        </DashboardLayout>
    )
}
