import { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react'
import { createPortal } from 'react-dom'

import {
    Archive, ArrowDownAZ, ArrowUpNarrowWide, Briefcase, CheckCheck, CircleCheck, Eye, EyeOff,
    FileInput, FileOutput, Keyboard, LoaderCircle, Pin, Plus, Presentation, RefreshCw, RotateCcw,
    Search, SlidersHorizontal, SquareCheck, Users, X
} from 'lucide-react'
import { usePageShortcuts } from '@shared/hooks/usePageShortcuts'
import ShortcutsModal from '@shared/components/ShortcutsModal'
import DashboardLayout from '@core/layouts/DashboardLayout'
import { Modal, Breadcrumb, PageHeader, Pagination, StatsCarousel, StatCard, ActionBadge, DiffViewer, AuditTimeline, RichSelect, MarsIcon, VenusIcon, WhatsAppIcon } from '@shared/components'
import { useToast } from '@context/Toast'
import { useAuth } from '@context/Auth'
import { useFlag } from '@context/FeatureFlags'
import { supabase } from '@lib/supabase'
import { logAudit } from '@utils/auditLogger'
import { TeacherRow, TeacherMobileCard, STATUS_CONFIG } from '@features/teachers/components/TeacherRow'
import FormModal from '@features/teachers/components/FormModal'
import ProfileModal from '@features/teachers/components/ProfileModal'
import ImportDataModal from '@shared/components/import-export/ImportDataModal'
import ExportDataModal from '@shared/components/import-export/ExportDataModal'
import { SYSTEM_COLS, buildImportConfig, EXPORT_CONFIG } from '@features/teachers/components/importExportConfig'
import { useImportExportCore } from '@shared/hooks/useImportExportCore'
import ArchiveModal from '@features/teachers/components/ArchiveModal'


import { useDebounce } from '@hooks/useDebounce'

// STATUS_CONFIG imported from TeacherRow component
const LS_FILTERS = 'teachers_filters'
const LS_COLS = 'teachers_columns'
const LS_PAGE_SIZE = 'teachers_page_size'

const ALL_EXPORT_COLUMNS = [
    { key: 'nama', label: 'Nama', fn: t => t.name || '' },
    { key: 'nbm', label: 'NBM', fn: t => t.nbm || '' },
    { key: 'subject', label: 'Mata Pelajaran', fn: t => t.subject || '' },
    { key: 'gender', label: 'Gender', fn: t => t.gender === 'L' ? 'Laki-laki' : t.gender === 'P' ? 'Perempuan' : '-' },
    { key: 'phone', label: 'No. HP/WA', fn: t => t.phone || '' },
    { key: 'email', label: 'Email', fn: t => t.email || '' },
    { key: 'status', label: 'Status', fn: t => STATUS_CONFIG[t.status]?.label || t.status || '' },
    { key: 'join_date', label: 'Tgl Bergabung', fn: t => t.join_date || '' },
    { key: 'address', label: 'Alamat', fn: t => t.address || '' },
    { key: 'type', label: 'Jenis Pegawai', fn: t => t.type === 'karyawan' ? 'Karyawan' : t.type === 'pengabdian' ? 'Pengabdian' : 'Guru' },
    { key: 'nik', label: 'NIK', fn: t => t.nik || '' },
    { key: 'nip', label: 'NIP', fn: t => t.nip || '' },
    { key: 'nuptk', label: 'NUPTK', fn: t => t.nuptk || '' },
    { key: 'birth_place', label: 'Tempat Lahir', fn: t => t.birth_place || '' },
    { key: 'birth_date', label: 'Tanggal Lahir', fn: t => t.birth_date || '' },
    { key: 'employment_status', label: 'Status Kepegawaian', fn: t => t.employment_status || '' },
    { key: 'teaching_hours', label: 'Jam Mengajar', fn: t => t.teaching_hours || 0 },
    { key: 'last_education', label: 'Pendidikan Terakhir', fn: t => t.last_education || '' },
    { key: 'major', label: 'Jurusan', fn: t => t.major || '' },
    { key: 'graduation_year', label: 'Tahun Lulus', fn: t => t.graduation_year || '' }
]

const maskInfo = (str, vis = 4) => {
    if (!str) return '—'
    if (str.length <= vis) return str[0] + '*'.repeat(str.length - 1)
    return str.substring(0, vis) + '***'
}

function getPortalContainer(id) {
    let el = document.getElementById(id);
    if (!el) {
        el = document.createElement('div');
        el.id = id;
        document.body.appendChild(el);
    }
    return el;
}

// ── Isolated Search Input ────────────────────────────────────────────────────
const DebouncedSearchInput = memo(({ searchQuery, onSearch, inputRef, isLoading }) => {
    const [value, setValue] = useState(searchQuery)

    // Debounce: propagate ke parent setelah 350ms berhenti mengetik
    useEffect(() => {
        const t = setTimeout(() => onSearch(value), 350)
        return () => clearTimeout(t)
    }, [value])

    // Sync saat di-clear dari luar (resetAllFilters, klik chip ×)
    useEffect(() => {
        if (searchQuery === '' && value !== '') setValue('')
    }, [searchQuery])

    return (
        <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--color-text-muted)] text-sm group-focus-within:text-[var(--color-primary)] transition-colors">
                {isLoading ? (
                    <LoaderCircle className="w-4 h-4 animate-spin text-[var(--color-primary)]" />
                ) : (
                    <Search className="w-4 h-4" />
                )}
            </div>
            <input
                ref={inputRef}
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="Cari nama, NBM, mapel, email... (Ctrl+K)"
                className="input-field pl-10 w-full h-9 text-xs sm:text-sm bg-[var(--color-surface-alt)]/50 border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/10 transition-all rounded-xl font-bold placeholder:font-normal placeholder:opacity-40"
            />
        </div>
    )
})
DebouncedSearchInput.displayName = 'DebouncedSearchInput'

export default function TeachersPage() {
    // core
    const [teachers, setTeachers] = useState([])
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [totalRows, setTotalRows] = useState(0)
    const [subjectsList, setSubjectsList] = useState([])

    // Konfigurasi modal import (butuh daftar mapel untuk kolom entity & referensi)
    const importConfig = useMemo(
        () => buildImportConfig({ subjectsList }),
        [subjectsList]
    )
    const [classesList, setClassesList] = useState([])
    const [stats, setStats] = useState({ total: 0, active: 0, male: 0, female: 0, guru: 0, karyawan: 0, pengabdian: 0 })
    const [uploadingPhoto, setUploadingPhoto] = useState(false)
    // filters
    const [searchQuery, setSearchQuery] = useState('')
    const [filterSubject, setFilterSubject] = useState('')
    const [filterGender, setFilterGender] = useState('')
    const [filterStatus, setFilterStatus] = useState('active')
    const [filterType, setFilterType] = useState('') // '' | 'guru' | 'pengabdian' | 'karyawan'
    const [filterMissing, setFilterMissing] = useState('')
    const [sortBy, setSortBy] = useState('name_asc')
    const [page, setPage] = useState(1)
    const [jumpPage, setJumpPage] = useState('')
    const [showAdvFilter, setShowAdvFilter] = useState(false)
    const [pageSize, setPageSize] = useState(() => {
        try { return Number(localStorage.getItem(LS_PAGE_SIZE)) || 10 } catch { return 10 }
    })
    // columns
    const [visibleCols, setVisibleCols] = useState({ nbm: true, subject: true, gender: true, contact: true, status: true, join: true })
    const [isColMenuOpen, setIsColMenuOpen] = useState(false)
    const [menuPos, setMenuPos] = useState({ top: 0, right: 0 })
    const colMenuRef = useRef(null)
    // ui
    const [isPrivacyMode, setIsPrivacyMode] = useState(false)
    const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false)
    // modals
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false)
    const [isArchivedOpen, setIsArchivedOpen] = useState(false)
    const [isProfileOpen, setIsProfileOpen] = useState(false)
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false)
    const [isBulkWAOpen, setIsBulkWAOpen] = useState(false)
    // form
    const [selectedItem, setSelectedItem] = useState(null)
    const [teacherToAction, setTeacherToAction] = useState(null)
    // profile
    const [profileTeacher, setProfileTeacher] = useState(null)
    const [profileStats, setProfileStats] = useState(null)
    const [profileReports, setProfileReports] = useState([])
    const [loadingProfile, setLoadingProfile] = useState(false)
    const [profileTab, setProfileTab] = useState('info')
    // archived
    const [archivedTeachers, setArchivedTeachers] = useState([])
    const [loadingArchived, setLoadingArchived] = useState(false)
    // bulk
    const [selectedIds, setSelectedIds] = useState([])
    const [bulkWAIndex, setBulkWAIndex] = useState(-1)
    const [bulkWAResults, setBulkWAResults] = useState({})
    const [waTemplate, setWaTemplate] = useState('info')
    // quick status
    const [quickStatusId, setQuickStatusId] = useState(null)
    const quickStatusRef = useRef(null)

    const searchInputRef = useRef(null)
    const headerMenuRef = useRef(null)
    // Sticky portal refs & rects for header menu dropdown
    const headerMenuBtnRef = useRef(null)
    const [headerMenuRect, setHeaderMenuRect] = useState(null)
    // Deferred unmount: keeps portal in DOM for 200ms after close so exit animation can play
    const [headerMenuMounted, setHeaderMenuMounted] = useState(false)
    const { addToast } = useToast()
    const { profile } = useAuth()

    // --- Stats Carousel Dot Indicator ---
    const statsScrollRef = useRef(null)
    const [activeStatIdx, setActiveStatIdx] = useState(0)
    const STAT_CARD_COUNT = 5

    // access.teacher_teachers — kalau off, guru hanya bisa lihat (read-only)
    const { enabled: teacherTeachersEnabled } = useFlag('access.teacher_teachers')
    const canEdit = teacherTeachersEnabled

    // ── persist ──────────────────────────────────────────────────────────────
    useEffect(() => {
        try { const f = JSON.parse(localStorage.getItem(LS_FILTERS) || '{}'); if (f.filterGender) setFilterGender(f.filterGender); if (f.filterStatus !== undefined) setFilterStatus(f.filterStatus); if (f.filterSubject) setFilterSubject(f.filterSubject); if (f.filterType) setFilterType(f.filterType); if (f.sortBy) setSortBy(f.sortBy) } catch { }
        try { const c = JSON.parse(localStorage.getItem(LS_COLS) || '{}'); if (Object.keys(c).length) setVisibleCols(c) } catch { }
    }, [])
    useEffect(() => { try { localStorage.setItem(LS_FILTERS, JSON.stringify({ filterGender, filterStatus, filterSubject, filterType, sortBy })) } catch { } }, [filterGender, filterStatus, filterSubject, filterType, sortBy])
    useEffect(() => { try { localStorage.setItem(LS_COLS, JSON.stringify(visibleCols)) } catch { } }, [visibleCols])
    useEffect(() => { try { localStorage.setItem(LS_PAGE_SIZE, pageSize) } catch { } }, [pageSize])

    // reset page on search change
    useEffect(() => { setPage(1) }, [searchQuery])

    // ── outside click ─────────────────────────────────────────────────────────
    // Deferred unmount effect for header menu
    useEffect(() => {
        if (isHeaderMenuOpen) {
            setHeaderMenuMounted(true)
        } else {
            const t = setTimeout(() => setHeaderMenuMounted(false), 200)
            return () => clearTimeout(t)
        }
    }, [isHeaderMenuOpen])

    // Sticky positioning - keep portaled dropdowns anchored on scroll/resize
    useEffect(() => {
        if (!isHeaderMenuOpen) return
        const update = () => {
            if (isHeaderMenuOpen && headerMenuBtnRef.current) setHeaderMenuRect(headerMenuBtnRef.current.getBoundingClientRect())
        }
        update()
        window.addEventListener('scroll', update, true)
        window.addEventListener('resize', update)
        return () => { window.removeEventListener('scroll', update, true); window.removeEventListener('resize', update) }
    }, [isHeaderMenuOpen])

    useEffect(() => {
        const h = e => {
            if (colMenuRef.current && !colMenuRef.current.contains(e.target)) setIsColMenuOpen(false)
            if (quickStatusRef.current && !quickStatusRef.current.contains(e.target)) setQuickStatusId(null)
        }
        document.addEventListener('mousedown', h)
        return () => document.removeEventListener('mousedown', h)
    }, [])

    // ── computed ──────────────────────────────────────────────────────────────
    const activeFilterCount = [filterGender, filterSubject, filterMissing, filterType, filterStatus !== 'active' ? filterStatus : ''].filter(Boolean).length
    const hasActiveFilters = !!(searchQuery || activeFilterCount)
    const resetAllFilters = () => { setSearchQuery(''); setFilterSubject(''); setFilterGender(''); setFilterMissing(''); setFilterStatus('active'); setFilterType(''); setPage(1) }

    // ── fetch ─────────────────────────────────────────────────────────────────
    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const from = (page - 1) * pageSize, to = from + pageSize - 1
            const sortMap = { name_asc: { col: 'name', asc: true }, name_desc: { col: 'name', asc: false }, subject_asc: { col: 'subject', asc: true }, join_asc: { col: 'join_date', asc: true }, join_desc: { col: 'join_date', asc: false } }
            const { col, asc } = sortMap[sortBy] || sortMap.name_asc
            let q = supabase.from('teachers').select('*', { count: 'exact' }).is('deleted_at', null).order(col, { ascending: asc }).range(from, to)
            if (filterStatus) q = q.eq('status', filterStatus)
            if (filterGender) q = q.eq('gender', filterGender)
            if (filterSubject) q = q.eq('subject', filterSubject)
            if (filterType) q = q.eq('type', filterType)
            if (filterMissing === 'wa') q = q.or('phone.is.null,phone.eq.""')
            if (searchQuery) { const s = searchQuery.replace(/%/g, '\\%').replace(/_/g, '\\_'); q = q.or(`name.ilike.%${s}%,nbm.ilike.%${s}%,email.ilike.%${s}%,subject.ilike.%${s}%`) }
            const { data, error, count } = await q
            if (error) throw error

            // ── Inject avatar_url dari profiles via email ────────────────────
            // Butuh view `profiles_with_email` di Supabase (lihat komentar di bawah).
            // Jika view belum ada, bagian ini di-skip secara graceful.
            let teachersWithAvatar = data || []
            const emails = teachersWithAvatar.map(t => t.email).filter(Boolean)
            if (emails.length > 0) {
                try {
                    const { data: profilesData } = await supabase
                        .from('profiles_with_email')   // view: SELECT p.*, u.email FROM profiles p JOIN auth.users u ON u.id = p.id
                        .select('avatar_url, email')
                        .not('avatar_url', 'is', null)
                        .in('email', emails)

                    if (profilesData?.length) {
                        const avatarByEmail = Object.fromEntries(
                            profilesData.map(p => [p.email, p.avatar_url])
                        )
                        teachersWithAvatar = teachersWithAvatar.map(t =>
                            t.email && avatarByEmail[t.email]
                                ? { ...t, avatar_url: avatarByEmail[t.email] }
                                : t
                        )
                    }
                } catch {
                    // View belum dibuat — skip, avatar tidak tampil tapi app tetap jalan
                }
            }

            setTeachers([...teachersWithAvatar].sort((a, b) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0)))
            setTotalRows(count ?? 0)
            const { data: allSubj } = await supabase.from('teachers').select('subject').is('deleted_at', null).not('subject', 'is', null)
            if (allSubj) setSubjectsList([...new Set(allSubj.map(r => r.subject).filter(Boolean))].sort())
            const { data: cls } = await supabase.from('classes').select('id,name').order('name')
            if (cls) setClassesList(cls)
        } catch { addToast('Gagal memuat data guru', 'error') }
        finally { setLoading(false) }
    }, [page, sortBy, filterStatus, filterGender, filterSubject, filterType, filterMissing, searchQuery, addToast])

    const fetchStats = useCallback(async () => {
        try {
            const { data } = await supabase.from('teachers').select('id,gender,status,type').is('deleted_at', null)
            if (data) setStats({ total: data.length, active: data.filter(t => t.status === 'active').length, male: data.filter(t => t.gender === 'L').length, female: data.filter(t => t.gender === 'P').length, guru: data.filter(t => !t.type || t.type === 'guru').length, karyawan: data.filter(t => t.type === 'karyawan').length, pengabdian: data.filter(t => t.type === 'pengabdian').length })
        } catch { }
    }, [])

    const fetchDataRef = useRef(fetchData); const fetchStatsRef = useRef(fetchStats)
    useEffect(() => { fetchDataRef.current = fetchData }, [fetchData])
    useEffect(() => { fetchStatsRef.current = fetchStats }, [fetchStats])

    useEffect(() => {
        const ch = supabase.channel('teachers-rt').on('postgres_changes', { event: '*', schema: 'public', table: 'teachers' }, () => { fetchDataRef.current(); fetchStatsRef.current() }).subscribe()
        return () => supabase.removeChannel(ch)
    }, [])

    useEffect(() => { fetchStats() }, [])
    useEffect(() => { fetchData() }, [page, sortBy, filterStatus, filterGender, filterSubject, filterType, filterMissing, searchQuery])



    // Insights Row
    const insights = useMemo(() => {
        const res = []
        const noWARecords = teachers.filter(t => !t.phone).length
        if (noWARecords > 0) res.push({
            id: 'wa',
            label: `${noWARecords} Guru Tanpa WA`,
            desc: 'Kontak WhatsApp belum tersedia',
            icon: WhatsAppIcon,
            color: 'text-amber-600 dark:text-amber-400',
            borderColor: 'border-amber-500/20',
            activeBorderColor: 'border-amber-500',
            activeBgColor: 'bg-amber-500/5',
            activeRingColor: 'ring-amber-500',
            bg: 'bg-amber-500/[0.08] hover:bg-amber-500/[0.15]',
            iconBg: 'bg-amber-500/15',
            iconColor: 'text-amber-500',
            activeIconBg: 'bg-amber-500 text-white',
            active: filterMissing === 'wa',
            onClick: () => { setFilterMissing(filterMissing === 'wa' ? '' : 'wa'); setPage(1); setShowAdvFilter(true) }
        })

        const inactiveCount = teachers.filter(t => t.status === 'inactive').length
        if (inactiveCount > 0) res.push({
            id: 'archived',
            label: `${inactiveCount} Guru Nonaktif`,
            desc: 'Status saat ini sedang dideaktifkan',
            icon: Archive,
            color: 'text-gray-600 dark:text-gray-400',
            borderColor: 'border-gray-500/20',
            activeBorderColor: 'border-gray-500',
            activeBgColor: 'bg-gray-500/5',
            activeRingColor: 'ring-gray-500',
            bg: 'bg-gray-500/[0.08] hover:bg-gray-500/[0.15]',
            iconBg: 'bg-gray-500/15',
            iconColor: 'text-gray-500',
            activeIconBg: 'bg-gray-500 text-white',
            active: filterStatus === 'inactive',
            onClick: () => { setFilterStatus(filterStatus === 'inactive' ? 'active' : 'inactive'); setPage(1); setShowAdvFilter(true) }
        })

        return res
    }, [teachers, filterMissing, filterStatus])

    // ── crud ──────────────────────────────────────────────────────────────────
    const handleAdd = () => { setSelectedItem(null); setIsModalOpen(true) }
    const handleEdit = item => { setSelectedItem(item); setIsModalOpen(true) }
    const handleSubmit = async (payload) => {
        setSubmitting(true)
        try {
            if (selectedItem) { const { error } = await supabase.from('teachers').update(payload).eq('id', selectedItem.id); if (error) throw error; addToast('Data guru berhasil diupdate', 'success'); await logAudit({ action: 'UPDATE', source: 'OPERATIONAL', tableName: 'teachers', recordId: selectedItem.id, oldData: selectedItem, newData: { ...selectedItem, ...payload } }) }
            else { const { data: insData, error } = await supabase.from('teachers').insert([payload]).select().single(); if (error) throw error; addToast('Guru baru berhasil ditambahkan', 'success'); await logAudit({ action: 'INSERT', source: 'OPERATIONAL', tableName: 'teachers', recordId: insData?.id, newData: payload }) }
            setIsModalOpen(false); fetchData(); fetchStats()
            return null
        } catch (err) { return { error: true, code: err.code, message: 'Gagal menyimpan data.' } }
        finally { setSubmitting(false) }
    }
    const handleArchive = async () => {
        if (!teacherToAction) return; setSubmitting(true)
        try { const { error } = await supabase.from('teachers').update({ deleted_at: new Date().toISOString() }).eq('id', teacherToAction.id); if (error) throw error; addToast(`"${teacherToAction.name}" diarsipkan`, 'success'); await logAudit({ action: 'UPDATE', source: 'OPERATIONAL', tableName: 'teachers', recordId: teacherToAction.id, oldData: teacherToAction, newData: { ...teacherToAction, deleted_at: new Date().toISOString() } }); setIsArchiveModalOpen(false); setTeacherToAction(null); fetchData(); fetchStats() }
        catch { addToast('Gagal mengarsipkan', 'error') } finally { setSubmitting(false) }
    }
    const handleRestore = async teacher => {
        try { const { error } = await supabase.from('teachers').update({ deleted_at: null }).eq('id', teacher.id); if (error) throw error; addToast(`"${teacher.name}" dipulihkan`, 'success'); await logAudit({ action: 'RESTORE', source: 'OPERATIONAL', tableName: 'teachers', recordId: teacher.id, oldData: teacher, newData: { ...teacher, deleted_at: null } }); setArchivedTeachers(prev => prev.filter(t => t.id !== teacher.id)); fetchData(); fetchStats() }
        catch { addToast('Gagal memulihkan', 'error') }
    }
    const fetchArchived = async () => {
        setLoadingArchived(true)
        try { const { data, error } = await supabase.from('teachers').select('*').not('deleted_at', 'is', null).order('deleted_at', { ascending: false }); if (error) throw error; setArchivedTeachers(data || []) }
        catch { addToast('Gagal memuat arsip', 'error') } finally { setLoadingArchived(false) }
    }

    // ── pin ───────────────────────────────────────────────────────────────────
    const handleTogglePin = async teacher => {
        const newPinned = !teacher.is_pinned

        // Optimistic UI Update
        setTeachers(prev => {
            const updated = prev.map(t =>
                t.id === teacher.id ? { ...t, is_pinned: newPinned } : t
            )
            // Re-sort to put pinned at top
            return updated.sort((a, b) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0))
        })

        try {
            const { error } = await supabase
                .from('teachers')
                .update({ is_pinned: newPinned })
                .eq('id', teacher.id)

            if (error) throw error

            await logAudit({
                action: 'UPDATE',
                source: 'OPERATIONAL',
                tableName: 'teachers',
                recordId: teacher.id,
                oldData: { is_pinned: teacher.is_pinned },
                newData: { is_pinned: newPinned }
            })

            addToast(
                newPinned ? (
                    <span className="flex items-center gap-1.5">
                        <Pin className="w-4 h-4 text-amber-400 rotate-[-45deg]" />
                        "{teacher.name}" disematkan ke atas
                    </span>
                ) : (
                    `Sematkan "${teacher.name}" dilepas`
                ),
                'success'
            )
        } catch (err) {
            console.error('Pin error:', err)
            // Rollback on failure
            setTeachers(prev => {
                const rolledBack = prev.map(t =>
                    t.id === teacher.id ? { ...t, is_pinned: teacher.is_pinned } : t
                )
                return rolledBack.sort((a, b) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0))
            })
            addToast('Gagal menyematkan data', 'error')
        }
    }

    const handlePhotoUpload = async (file) => {
        if (!file) return null
        setUploadingPhoto(true)
        try {
            const fileName = `teacher_${Date.now()}.${file.name.split('.').pop()}`
            const { error } = await supabase.storage.from('teacher-photo').upload(fileName, file)
            if (error) throw error
            const { data } = supabase.storage.from('teacher-photo').getPublicUrl(fileName)
            return data.publicUrl
        } catch (err) {
            console.error('Photo upload error:', err)
            addToast('Gagal mengunggah foto', 'error')
            return null
        } finally { setUploadingPhoto(false) }
    }

    // ── quick status ──────────────────────────────────────────────────────────
    const handleQuickStatus = async (teacher, newStatus) => {
        try { const { error } = await supabase.from('teachers').update({ status: newStatus }).eq('id', teacher.id); if (error) throw error; addToast(`Status ${teacher.name} → ${STATUS_CONFIG[newStatus].label}`, 'success'); await logAudit({ action: 'UPDATE', source: 'OPERATIONAL', tableName: 'teachers', recordId: teacher.id, oldData: teacher, newData: { ...teacher, status: newStatus } }); setQuickStatusId(null); fetchData(); fetchStats() }
        catch { addToast('Gagal update status', 'error') }
    }

    // ── profile ───────────────────────────────────────────────────────────────
    const openProfile = async (teacher, tab = 'info') => {
        setProfileTeacher(teacher); setProfileStats(null); setProfileReports([]); setProfileTab(tab); setLoadingProfile(true); setIsProfileOpen(true)
        try {
            const { data: reports } = await supabase.from('reports').select('id,created_at,points,description').eq('teacher_name', teacher.name).order('created_at', { ascending: false })
            if (reports) {
                const thisMonth = new Date(); thisMonth.setDate(1); thisMonth.setHours(0, 0, 0, 0)
                setProfileReports(reports)
                setProfileStats({ total: reports.length, monthly: reports.filter(r => new Date(r.created_at) >= thisMonth).length, totalPts: reports.reduce((a, r) => a + (r.points || 0), 0), posCount: reports.filter(r => (r.points || 0) > 0).length, negCount: reports.filter(r => (r.points || 0) < 0).length })
            }
        } catch { } finally { setLoadingProfile(false) }
    }

    // ── bulk ──────────────────────────────────────────────────────────────────
    const allPageIds = teachers.map(t => t.id)
    const allSelected = allPageIds.length > 0 && allPageIds.every(id => selectedIds.includes(id))
    const someSelected = selectedIds.length > 0 && !allSelected
    const toggleSelectAll = () => allSelected ? setSelectedIds(prev => prev.filter(id => !allPageIds.includes(id))) : setSelectedIds(prev => [...new Set([...prev, ...allPageIds])])
    const toggleSelect = id => setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
    const handleBulkArchive = async () => {
        setSubmitting(true)
        try { const idsSnap = [...selectedIds]; const { error } = await supabase.from('teachers').update({ deleted_at: new Date().toISOString() }).in('id', idsSnap); if (error) throw error; addToast(`${idsSnap.length} guru diarsipkan`, 'success'); await logAudit({ action: 'UPDATE', source: 'OPERATIONAL', tableName: 'teachers', newData: { bulk_archive: true, count: idsSnap.length, ids: idsSnap } }); setSelectedIds([]); setIsBulkModalOpen(false); fetchData(); fetchStats() }
        catch { addToast('Gagal arsip massal', 'error') } finally { setSubmitting(false) }
    }
    const bulkWATeachers = useMemo(() => teachers.filter(t => selectedIds.includes(t.id) && t.phone), [teachers, selectedIds])
    const startBulkWA = () => { if (!bulkWATeachers.length) { addToast('Tidak ada guru terpilih dengan nomor WA', 'warning'); return }; setBulkWAIndex(0); setBulkWAResults({}); setIsBulkWAOpen(true) }
    const sendNextWA = () => {
        const t = bulkWATeachers[bulkWAIndex]
        if (!t) return
        const msg = {
            info: `Assalamu'alaikum, *${t.name}*.\nBerikut informasi akun Anda di sistem.`,
            notif: `Assalamu'alaikum, *${t.name}*.\nAda notifikasi baru untuk Anda di sistem.`
        }
        window.open(`https://wa.me/${t.phone.replace(/^0/, '62')}?text=${encodeURIComponent(msg[waTemplate] || msg.info)}`, '_blank')
        setBulkWAResults(prev => ({ ...prev, [t.id]: 'sent' }))
        setBulkWAIndex(bulkWAIndex + 1 < bulkWATeachers.length ? bulkWAIndex + 1 : -1)

        logAudit({
            action: 'SEND',
            source: 'OPERATIONAL',
            tableName: 'teachers',
            recordId: t.id,
            newData: { channel: 'whatsapp', template: waTemplate, recipient: t.name }
        })
    }
    // ── Import/Export (mesin generik useImportExportCore) ───────────────────
    const getExportData = async (scope = 'filtered', cols = []) => {
        let q = supabase.from('teachers').select('name,nbm,subject,gender,phone,email,status,join_date,address').is('deleted_at', null)

        if (scope === 'selected' && selectedIds.length > 0) {
            q = q.in('id', selectedIds)
        } else if (scope === 'filtered') {
            if (filterStatus) q = q.eq('status', filterStatus)
            if (filterGender) q = q.eq('gender', filterGender)
            if (filterSubject) q = q.eq('subject', filterSubject)
            if (filterType) q = q.eq('type', filterType)
        }

        q = q.order('name')
        const { data, error } = await q
        if (error) throw error

        return (data || []).map(t => {
            const row = {}
            cols.forEach(key => {
                const col = ALL_EXPORT_COLUMNS.find(c => c.key === key)
                if (col) row[col.label] = col.fn(t)
            })
            return row
        })
    }

    const validatePreview = (preview) => {
        const issues = []
        const dupeIndices = []
        const validated = preview.map((row, i) => {
            const rowIssues = []
            if (!row.name) rowIssues.push('Nama tidak boleh kosong')
            if (row.nbm && preview.slice(0, i).some(p => p.nbm === row.nbm)) rowIssues.push(`NBM "${row.nbm}" duplikat di file`)

            if (rowIssues.length) {
                issues.push({ row: i + 2, level: 'error', messages: rowIssues })
                row._hasError = true
            }
            return row
        })
        return { validated, issues, dupeIndices }
    }

    const importExport = useImportExportCore({
        systemCols: SYSTEM_COLS,
        addToast,
        table: 'teachers',
        messages: {
            hasErrors: 'Masih ada ERROR. Perbaiki file dulu.',
            noValidRows: 'Tidak ada baris valid',
            commitSuccess: (n) => `Berhasil import ${n} guru`,
            commitFailed: () => 'Gagal import (cek constraint DB / duplikat)',
            bulkFix: (value) => `Berhasil merubah semua baris ke ${value}`,
        },
        buildPreview: async (raw, mapping) => {
            const preview = raw.map((row, i) => {
                const data = {}
                SYSTEM_COLS.forEach(sys => {
                    const fileCol = mapping[sys.key]
                    data[sys.key] = fileCol ? (row[fileCol] || '').toString().trim() : ''
                })

                // Normalisasi
                if (data.gender) {
                    const g = data.gender.toUpperCase().trim()
                    data.gender = ['L', 'LAKI-LAKI', 'LAKI LAKI', 'MALE', 'PUTRA'].includes(g) ? 'L' : ['P', 'PEREMPUAN', 'FEMALE', 'PUTRI'].includes(g) ? 'P' : ''
                }
                if (data.status) {
                    const s = data.status.toLowerCase().trim()
                    data.status = ['active', 'aktif'].includes(s) ? 'active' : ['inactive', 'nonaktif'].includes(s) ? 'inactive' : ['leave', 'cuti'].includes(s) ? 'cuti' : 'active'
                }
                if (data.type) {
                    const t = data.type.toLowerCase().trim()
                    data.type = ['karyawan', 'staf', 'staff', 'non-guru', 'kary'].includes(t) ? 'karyawan' : ['pengabdian', 'pengab'].includes(t) ? 'pengabdian' : 'guru'
                }
                if (data.teaching_hours) {
                    data.teaching_hours = Number(data.teaching_hours) || 0
                }
                if (data.graduation_year) {
                    data.graduation_year = Number(data.graduation_year) || null
                }
                if (data.phone) {
                    data.phone = data.phone.toString().replace(/[\s-]/g, '')
                    if (data.phone.startsWith('62')) data.phone = '0' + data.phone.slice(2)
                }

                return { ...data, _row: i, _hasError: false }
            })
            return validatePreview(preview)
        },
        validate: validatePreview,
        buildCommitRow: (r) => ({
            name: r.name,
            nbm: r.nbm || null,
            subject: r.subject || null,
            gender: r.gender || null,
            phone: r.phone || null,
            email: r.email || null,
            status: r.status || 'active',
            type: r.type || 'guru',
            nik: r.nik || null,
            nip: r.nip || null,
            nuptk: r.nuptk || null,
            birth_place: r.birth_place || null,
            birth_date: r.birth_date || null,
            address: r.address || null,
            employment_status: r.employment_status || 'GTY',
            teaching_hours: Number(r.teaching_hours) || 0,
            last_education: r.last_education || null,
            major: r.major || null,
            graduation_year: r.graduation_year ? Number(r.graduation_year) : null
        }),
        afterCommit: async () => {
            fetchData()
            fetchStats()
        },
        audit: {
            source: 'OPERATIONAL',
            insertPayload: (count, rows) => ({ bulk_import: true, count, data: rows }),
        },
        template: {
            headers: [
                'Nama Lengkap', 'NBM', 'Mata Pelajaran', 'Jenis Kelamin (L/P)', 'No. WhatsApp',
                'Email', 'Status (active/inactive/cuti)', 'Jenis Pegawai (guru/pengabdian/karyawan)',
                'NIK', 'NIP', 'NUPTK', 'Tempat Lahir', 'Tanggal Lahir (YYYY-MM-DD)', 'Alamat',
                'Status Kepegawaian (GTY/PTY/GTT/PTT)', 'Jam Mengajar', 'Pendidikan Terakhir',
                'Jurusan', 'Tahun Lulus'
            ],
            widths: [25, 12, 20, 18, 15, 25, 28, 28, 20, 20, 20, 15, 25, 30, 35, 15, 20, 25, 12],
            rows: [
                ['Ahmad Fauzi, S.Pd', '12345678', 'Bahasa Indonesia', 'L', '081234567890', 'ahmad@sekolah.sch.id', 'active', 'guru', '3328123456789001', '198501012010011002', '9876543210987654', 'Sleman', '1985-01-01', 'Jl. Kaliurang KM 10, Sleman', 'GTY', '24', 'S1', 'Pendidikan Bahasa Indonesia', '2008'],
                ['Siti Aminah, M.Pd', '87654321', 'Matematika', 'P', '089876543210', 'siti@sekolah.sch.id', 'active', 'guru', '3328876543210002', '', '', 'Yogyakarta', '1988-05-12', 'Jl. Godean KM 5, Yogyakarta', 'PTY', '20', 'S2', 'Pendidikan Matematika', '2012'],
            ],
            filename: 'Template Import Guru',
        },
        export: {
            getExportData,
            defaultFileName: 'export_guru',
            sheetName: 'Data Guru',
            pdfTitle: 'Laporan Data Guru',
            pdfMeta: (rows, scope) => `Tanggal: ${new Date().toLocaleDateString('id-ID')}  |  Total: ${rows.length} guru  |  Scope: ${scope === 'filtered' ? 'Filter Aktif' : scope === 'selected' ? 'Dipilih' : 'Semua'}`,
            pdfColumnStyles: {
                'Gender': { halign: 'center' },
                'NBM': { halign: 'center' },
                'NIK': { halign: 'center' },
                'NIP': { halign: 'center' },
                'NUPTK': { halign: 'center' },
                'Status': { halign: 'center' },
                'Tgl Bergabung': { halign: 'center' },
                'Tanggal Lahir': { halign: 'center' },
                'No. HP/WA': { halign: 'center' },
                'Jam Mengajar': { halign: 'right' },
                'Tahun Lulus': { halign: 'center' }
            },
            auditPayload: (fmt, count, ctx) => ({ format: fmt, scope: ctx.exportScope, columns: ctx.exportColumns, count }),
            noData: 'Tidak ada data',
            toast: (fmt, n) => `Export ${fmt === 'csv' ? 'CSV' : fmt === 'xlsx' ? 'Excel' : 'PDF'} berhasil (${n} guru)`,
            failed: (fmt) => `Gagal export ${fmt === 'csv' ? 'CSV' : fmt === 'xlsx' ? 'Excel' : 'PDF'}`,
        },
    })

    const {
        isImportModalOpen, setIsImportModalOpen, isExportModalOpen, setIsExportModalOpen,
        exporting, exportScope, setExportScope, exportColumns, setExportColumns,
        importStep, setImportStep, importFileName, importPreview, setImportPreview,
        importIssues, setImportIssues, importFileHeaders, importColumnMapping, setImportColumnMapping,
        importRawData, importLoading, importDragOver: importDrag, setImportDragOver: setImportDrag,
        importValidationOpen, setImportValidationOpen, importing, importProgress,
        importEditCell, setImportEditCell, importSkipDupes, setImportSkipDupes,
        importReadyRows, hasImportBlockingErrors,
        processImportFile, handleImportClick, resetImport, handleCommitImport,
        buildImportPreview, handleImportCellEdit, handleRemoveImportRow, handleBulkFix,
        handleDownloadTemplate, handleExportCSV, handleExportExcel, handleExportPDF,
    } = importExport

    const disp = val => isPrivacyMode ? maskInfo(val) : (val || '—')

    const isAnyModalOpen = isModalOpen || isArchiveModalOpen || isArchivedOpen || isProfileOpen || isImportModalOpen || isExportModalOpen || isBulkModalOpen || isBulkWAOpen

    // ── SHORTCUTS (binding + daftar modal dari satu deklarasi — usePageShortcuts) ──
    const sc = usePageShortcuts({
        isBlocked: isAnyModalOpen || isHeaderMenuOpen,
        items: [
            { section: 'Navigasi', keys: ['Ctrl', 'K'], label: 'Fokus ke search', icon: Search, onSelect: () => { searchInputRef.current?.focus(); searchInputRef.current?.select() } },
            { section: 'Navigasi', keys: ['Ctrl', 'F'], label: 'Toggle filter lanjutan', icon: SlidersHorizontal, onSelect: () => setShowAdvFilter(v => !v) },
            { section: 'Navigasi', keys: ['Esc'], label: 'Tutup / clear / deselect', icon: X, onSelect: () => { if (isAnyModalOpen) return; if (searchQuery) { setSearchQuery(''); return } if (selectedIds.length) { setSelectedIds([]); return } if (hasActiveFilters) { resetAllFilters() } } },
            { section: 'Aksi', keys: ['N'], label: 'Tambah guru baru', icon: Plus, onSelect: handleAdd },
            { section: 'Aksi', keys: ['Ctrl', 'A'], label: 'Pilih semua / deselect', icon: CheckCheck, onSelect: toggleSelectAll },
            { section: 'Aksi', keys: ['Ctrl', 'E'], label: 'Buka export', icon: FileOutput, onSelect: () => setIsExportModalOpen(true) },
            { section: 'Tampilan', keys: ['P'], label: 'Toggle privacy mode', icon: EyeOff, onSelect: () => setIsPrivacyMode(v => !v) },
            { section: 'Tampilan', keys: ['R'], label: 'Refresh data', icon: RefreshCw, onSelect: fetchData },
            { section: 'Tampilan', keys: ['X'], label: 'Reset semua filter', icon: RotateCcw, onSelect: resetAllFilters },
            { section: 'Tampilan', keys: ['?'], label: 'Tampilkan shortcut ini', icon: Keyboard },
        ],
    })

    // ══════════════════════════════════════════════════════════════════════════
    return (
        <DashboardLayout title="Data Guru">
            {/* TAMBAH INI: */}
            <div className="space-y-4">

                {/* Read-only Banner */}
                {!canEdit && (
                    <div className="px-4 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-2">
                        <EyeOff className="w-4 h-4 text-rose-500 shrink-0" />
                        <p className="text-xs font-bold text-rose-600">Mode Read-only — Edit data guru dinonaktifkan oleh administrator.</p>
                    </div>
                )}

                {/* Bulk Action Bar */}
                {selectedIds.length > 0 && (
                    <div className="mb-4 px-4 py-3 rounded-2xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 flex items-center justify-between gap-3 flex-wrap">
                        <p className="text-sm font-bold text-[var(--color-primary)]">{selectedIds.length} guru dipilih</p>
                        <div className="flex items-center gap-2 flex-wrap">
                            <button onClick={startBulkWA} className="h-8 px-3 rounded-xl bg-green-500/10 text-green-600 text-xs font-bold uppercase tracking-wide hover:bg-green-500 hover:text-white transition-all flex items-center gap-1.5"><WhatsAppIcon className="w-4 h-4" />WA Massal</button>
                            <button onClick={() => setIsBulkModalOpen(true)} className="h-8 px-3 rounded-xl bg-amber-500/10 text-amber-600 text-xs font-bold uppercase tracking-wide hover:bg-amber-500 hover:text-white transition-all flex items-center gap-1.5"><Archive className="w-4 h-4" />Arsip</button>
                            <button onClick={() => setSelectedIds([])} className="h-8 px-3 rounded-xl bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] text-xs font-bold uppercase tracking-wide transition-all flex items-center gap-1.5"><X className="w-4 h-4" />Batal</button>
                        </div>
                    </div>
                )}

                {/* ── Header ── */}
                <PageHeader
                    badge="Master Data"
                    breadcrumbs={['Faculty Members']}
                    title="Data Guru"
                    subtitle={`Kelola ${stats.total} data ${filterType === 'karyawan' ? 'karyawan' : filterType === 'pengabdian' ? 'pengabdian' : filterType === 'guru' ? 'guru' : 'guru, pengabdian & karyawan'} dalam sistem.`}
                    actions={
                        <>
                            {/* Header Menu Button */}
                            <button
                                ref={headerMenuBtnRef}
                                onClick={() => { if (!isHeaderMenuOpen) setHeaderMenuRect(headerMenuBtnRef.current?.getBoundingClientRect()); setIsHeaderMenuOpen(v => !v) }}
                                className={`h-9 w-9 rounded-lg border flex items-center justify-center text-sm transition-all active:scale-95 ${isHeaderMenuOpen ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)]/30 text-[var(--color-primary)]' : 'bg-[var(--color-surface-alt)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-border)]'}`}
                                title="Aksi lainnya"
                            >
                                <SlidersHorizontal className="w-4 h-4" />
                            </button>

                            {/* Portaled Header Menu Dropdown */}
                            {headerMenuMounted && headerMenuRect && createPortal(
                                <>
                                    <div
                                        className={`fixed inset-0 z-[9990] bg-black/5 transition-opacity duration-200 ${isHeaderMenuOpen ? 'opacity-100' : 'opacity-0'}`}
                                        onClick={() => setIsHeaderMenuOpen(false)}
                                    />
                                    <div
                                        className={`fixed z-[9991] w-56 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl p-2 transition-all duration-200 ease-out origin-top-right
                                        ${isHeaderMenuOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-2'}`}
                                        style={{
                                            top: headerMenuRect.bottom + 8,
                                            left: Math.max(10, headerMenuRect.right - 224)
                                        }}
                                    >
                                        <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)] px-3 py-2">Data</p>
                                        <button onClick={() => { setIsHeaderMenuOpen(false); handleImportClick() }}
                                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--color-surface-alt)] text-[var(--color-text)] transition-all group">
                                            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                <FileInput className="w-4 h-4" />
                                            </div>
                                            <div className="text-left">
                                                <p className="text-xs font-bold leading-tight">Import Excel</p>
                                                <p className="text-xs opacity-60 font-medium leading-tight mt-0.5">Unggah data guru masal dari file Excel/CSV</p>
                                            </div>
                                        </button>
                                        <button onClick={() => { setIsHeaderMenuOpen(false); setIsExportModalOpen(true) }}
                                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--color-surface-alt)] text-[var(--color-text)] transition-all group">
                                            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                <FileOutput className="w-4 h-4" />
                                            </div>
                                            <div className="text-left">
                                                <p className="text-xs font-bold leading-tight">Export Data</p>
                                                <p className="text-xs opacity-60 font-medium leading-tight mt-0.5">Cadangkan seluruh database ke format Excel</p>
                                            </div>
                                        </button>
                                        <div className="h-px bg-[var(--color-border)] my-1 mx-2" />
                                        <p className="px-3 py-2 text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)]">Manajemen</p>
                                        <button onClick={() => { setIsHeaderMenuOpen(false); fetchArchived(); setIsArchivedOpen(true) }}
                                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--color-surface-alt)] text-[var(--color-text)] transition-all group">
                                            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                <Archive className="w-4 h-4" />
                                            </div>
                                            <div className="text-left">
                                                <p className="text-xs font-bold leading-tight">Arsip Guru</p>
                                                <p className="text-xs opacity-60 font-medium leading-tight mt-0.5">Lihat & pulihkan data guru tidak aktif</p>
                                            </div>
                                        </button>
                                    </div>
                                </>,
                                getPortalContainer('portal-teacher-header-menu')
                            )}

                            {/* Keyboard Shortcuts Button - hidden on mobile */}
                            <button
                                onClick={sc.toggle}
                                className={`hidden sm:flex h-9 w-9 rounded-lg border items-center justify-center transition-all active:scale-95
                                ${sc.isOpen
                                        ? 'bg-primary/10 border-primary/30 text-primary'
                                        : 'bg-surface-alt border-border text-text-muted hover:text-text'
                                    }`}
                                title="Keyboard Shortcuts (?)"
                            >
                                <Keyboard className="w-4 h-4" />
                            </button>

                            <ShortcutsModal
                                isOpen={sc.isOpen}
                                onClose={sc.close}
                                sections={sc.sections}
                            />

                            {/* Privasi toggle */}
                            <button
                                onClick={() => {
                                    const next = !isPrivacyMode
                                    setIsPrivacyMode(next)
                                    addToast(next ? 'Mode privasi diaktifkan — Data sensitif disembunyikan' : 'Mode privasi dinonaktifkan', next ? 'info' : 'success')
                                }}
                                className={`h-9 w-9 sm:w-auto sm:px-3 rounded-lg border flex items-center justify-center sm:justify-start gap-2 transition-all active:scale-95 ${isPrivacyMode ? 'bg-amber-500/10 border-amber-500/30 text-amber-600' : 'bg-[var(--color-surface-alt)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'} `}
                                title={isPrivacyMode ? "Matikan Mode Privasi" : "Aktifkan Mode Privasi"}
                            >
                                {isPrivacyMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                <span className="text-xs font-bold uppercase tracking-wide hidden md:inline">
                                    Privasi
                                </span>
                            </button>

                            {/* Add button */}
                            <button onClick={handleAdd} disabled={!canEdit} className="h-9 px-4 sm:px-5 rounded-xl bg-[var(--color-primary)] text-white text-xs font-bold uppercase tracking-wide flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-95 shadow-md disabled:opacity-40 disabled:cursor-not-allowed border border-white/10">
                                <Plus className="w-4 h-4" />
                                <span>{canEdit ? 'Tambah Guru' : 'Read-only'}</span>
                            </button>
                        </>
                    }
                />

                {/* ── Stats ── */}
                <StatsCarousel count={STAT_CARD_COUNT} cols={5}>
                    {[
                        { icon: Presentation, label: 'Total', value: stats.total, borderColor: 'border-t-[var(--color-primary)]', iconBg: 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]', onClick: () => { setFilterType(''); setPage(1) } },
                        { icon: CircleCheck, label: 'Aktif', value: stats.active, borderColor: 'border-t-emerald-500', iconBg: 'bg-emerald-500/10 text-emerald-500', onClick: () => { setFilterStatus('active'); setPage(1) } },
                        { icon: Presentation, label: 'Guru', value: stats.guru, borderColor: 'border-t-indigo-500', iconBg: 'bg-indigo-500/10 text-indigo-500', onClick: () => { setFilterType('guru'); setPage(1) } },
                        { icon: Briefcase, label: 'Karyawan', value: stats.karyawan, borderColor: 'border-t-blue-500', iconBg: 'bg-blue-500/10 text-blue-500', onClick: () => { setFilterType('karyawan'); setPage(1) } },
                        { icon: Briefcase, label: 'Pengabdian', value: stats.pengabdian, borderColor: 'border-t-emerald-600', iconBg: 'bg-emerald-600/10 text-emerald-600', onClick: () => { setFilterType('pengabdian'); setPage(1) } },
                    ].map((s, i) => (
                        <StatCard
                            key={i}
                            icon={s.icon}
                            label={s.label}
                            value={s.value}
                            borderColor={s.borderColor}
                            iconBg={s.iconBg}
                            onClick={s.onClick}
                        />
                    ))}
                </StatsCarousel>

                {/* Insights Hub */}
                {insights.length > 0 && (
                    <div className="flex overflow-x-auto scrollbar-hide gap-2 mb-6 animate-in fade-in slide-in-from-top-1 duration-500 pb-1">
                        {insights.map((ins) => (
                            <button
                                key={ins.id}
                                onClick={ins.onClick}
                                className={`flex items-center gap-3 px-3 py-2 rounded-xl border transition-all hover:scale-[1.02] active:scale-95 shrink-0
                                    ${ins.active
                                        ? `${ins.activeBorderColor} ${ins.activeBgColor} ring-1 ${ins.activeRingColor}`
                                        : `${ins.bg} ${ins.borderColor}`
                                    }`}
                            >
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0
                                    ${ins.active
                                        ? ins.activeIconBg
                                        : ins.iconBg
                                    }`}
                                >
                                    <ins.icon className={`text-xs ${ins.active ? 'text-white' : ins.iconColor}`} />
                                </div>
                                <div className="text-left whitespace-nowrap">
                                    <p className={`text-xs font-bold leading-none ${ins.color}`}>{ins.label}</p>
                                    <p className="text-xs text-[var(--color-text-muted)] font-bold mt-0.5">{ins.desc}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                )}

                {/* ── Filter Bar ── */}
                <div className="bg-surface rounded-[1.5rem] mb-4 border border-[var(--color-border)] overflow-hidden">
                    {/* Row 1: Search + Quick Filters + Action Buttons */}
                    <div className="flex items-center gap-2 p-2.5 lg:p-3">
                        {/* Search Bar - Dynamic & Responsive */}
                        <div className="flex-initial w-full lg:w-[232px] xl:w-[352px] min-w-[120px] transition-all duration-300">
                            <DebouncedSearchInput
                                searchQuery={searchQuery}
                                onSearch={setSearchQuery}
                                inputRef={searchInputRef}
                                isLoading={loading}
                            />
                        </div>

                        {/* Quick Filter Chips - Desktop Only */}
                        <div className="hidden lg:flex flex-1 items-center gap-2 overflow-x-auto scrollbar-hide py-0.5 min-w-0 pr-8 h-full [mask-image:linear-gradient(to_right,black_calc(100%-32px),transparent)]">
                            <div className="h-4 w-px bg-[var(--color-border)] mx-1 hidden lg:block" />

                            {/* Group 1: Status */}
                            <div className="flex items-center gap-1.5 shrink-0">
                                {[
                                    { id: '', label: 'Semua', icon: Users },
                                    { id: 'active', label: 'Aktif', icon: CircleCheck },
                                    { id: 'inactive', label: 'Nonaktif', icon: Briefcase },
                                ].map((s) => (
                                    <button
                                        key={s.id}
                                        onClick={() => { setFilterStatus(s.id); setPage(1) }}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wide whitespace-nowrap transition-all border ${filterStatus === s.id
                                            ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white'
                                            : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)]/30 hover:bg-[var(--color-primary)]/5 hover:text-[var(--color-primary)]'
                                            }`}
                                    >
                                        <s.icon className={`text-xs ${filterStatus === s.id ? 'opacity-100' : 'opacity-30'}`} />
                                        {s.label}
                                    </button>
                                ))}
                            </div>

                            {/* Separator */}
                            <div className="h-4 w-px bg-[var(--color-border)] mx-1 shrink-0" />

                            {/* Group 2: Gender */}
                            <div className="flex items-center gap-1.5 shrink-0">
                                {[
                                    { id: 'L', label: 'Putra', icon: MarsIcon, activeCls: 'bg-blue-500 border-blue-500' },
                                    { id: 'P', label: 'Putri', icon: VenusIcon, activeCls: 'bg-pink-500 border-pink-500' },
                                ].map((g) => (
                                    <button
                                        key={g.id}
                                        onClick={() => { setFilterGender(filterGender === g.id ? '' : g.id); setPage(1) }}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wide whitespace-nowrap transition-all border ${filterGender === g.id
                                            ? `${g.activeCls} text-white`
                                            : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)]/30 hover:bg-[var(--color-primary)]/5 hover:text-[var(--color-primary)]'
                                            }`}
                                    >
                                        <g.icon className={`text-xs ${filterGender === g.id ? 'opacity-100' : 'opacity-30'}`} />
                                        {g.label}
                                    </button>
                                ))}
                            </div>

                            {/* Separator */}
                            <div className="h-4 w-px bg-[var(--color-border)] mx-1 shrink-0" />

                            {/* Group 3: Quick Sort */}
                            <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                    onClick={() => { setSortBy(sortBy === 'name_asc' ? 'name_desc' : 'name_asc'); setPage(1) }}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wide whitespace-nowrap transition-all border ${sortBy.includes('name')
                                        ? 'bg-amber-500 border-amber-500 text-white'
                                        : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-amber-500/30 hover:bg-amber-500/5 hover:text-amber-600'
                                        }`}
                                >
                                    <ArrowDownAZ className={`w-4 h-4 ${sortBy.includes('name') ? 'opacity-100' : 'opacity-30'}`} />
                                    Nama {sortBy === 'name_asc' ? 'A-Z' : 'Z-A'}
                                </button>
                                <button
                                    onClick={() => { setSortBy(sortBy === 'subject_asc' ? 'name_asc' : 'subject_asc'); setPage(1) }}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wide whitespace-nowrap transition-all border ${sortBy === 'subject_asc'
                                        ? 'bg-emerald-500 border-emerald-500 text-white'
                                        : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-emerald-500/30 hover:bg-emerald-500/5 hover:text-emerald-600'
                                        }`}
                                >
                                    <ArrowUpNarrowWide className={`w-4 h-4 ${sortBy === 'subject_asc' ? 'opacity-100' : 'opacity-30'}`} />
                                    Mapel A-Z
                                </button>
                            </div>
                        </div>

                        {/* Dedicated Divider for Enterprise Look */}
                        <div className="hidden lg:block w-px h-4 bg-[var(--color-border)] mx-2 shrink-0" />

                        {/* Action Buttons: Always visible, grouped nicely on mobile */}
                        <div className="flex items-center justify-end gap-2 shrink-0 lg:ml-auto">
                            <button
                                onClick={toggleSelectAll}
                                className={`h-9 px-3 rounded-xl border text-xs font-bold uppercase tracking-wide transition-all active:scale-95 flex items-center justify-center gap-2 ${selectedIds.length > 0 ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]'} `}
                                title="Pilih Semua / Batal"
                            >
                                {selectedIds.length > 0 ? <CheckCheck className="w-4 h-4" /> : <SquareCheck className="w-4 h-4" />}
                                <span className="hidden xs:inline">{selectedIds.length > 0 ? 'Terpilih' : 'Pilih'}</span>
                                {selectedIds.length > 0 && (
                                    <span className="w-4 h-4 rounded-full bg-white/20 text-white text-xs font-bold flex items-center justify-center">
                                        {selectedIds.length}
                                    </span>
                                )}
                            </button>

                            <button
                                onClick={() => setShowAdvFilter(!showAdvFilter)}
                                className={`h-9 px-3 sm:px-4 rounded-xl border text-xs font-bold uppercase tracking-wide transition-all flex items-center justify-center gap-2 ${showAdvFilter || activeFilterCount > 0 ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white shadow-md' : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]'}`}
                            >
                                <SlidersHorizontal className="w-4 h-4" />
                                <span className="hidden xs:inline">Filter</span>
                                {activeFilterCount > 0 && <span className="w-4 h-4 rounded-full bg-white/30 text-white text-xs font-bold flex items-center justify-center">{activeFilterCount}</span>}
                            </button>
                        </div>
                    </div>

                    {/* Active Filter Chips */}
                    {(searchQuery || filterSubject || filterGender || (filterStatus && filterStatus !== 'active') || filterType || filterMissing) && (
                        <div className="px-3 pb-3 -mt-1">
                            <div className="flex flex-wrap gap-2">
                                {searchQuery && (
                                    <button type="button" onClick={() => setSearchQuery('')}
                                        className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/40 text-xs font-bold text-[var(--color-text)]" title="Hapus pencarian">
                                        <Search className="w-4 h-4 opacity-60" />
                                        <span className="max-w-[180px] truncate">"{searchQuery}"</span>
                                        <span className="w-5 h-5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)] group-hover:text-red-500 transition-colors">
                                            <X className="w-4 h-4" />
                                        </span>
                                    </button>
                                )}
                                {filterSubject && (
                                    <button type="button" onClick={() => setFilterSubject('')}
                                        className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/5 text-xs font-bold text-[var(--color-primary)]" title="Hapus filter mapel">
                                        <Presentation className="w-4 h-4 opacity-70" />
                                        {filterSubject}
                                        <span className="w-5 h-5 rounded-lg bg-white/70 dark:bg-[var(--color-surface)] border border-[var(--color-primary)]/20 flex items-center justify-center text-[var(--color-primary)] opacity-70 group-hover:opacity-100 transition-opacity">
                                            <X className="w-4 h-4" />
                                        </span>
                                    </button>
                                )}
                                {filterGender && (
                                    <button type="button" onClick={() => setFilterGender('')}
                                        className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/40 text-xs font-bold text-[var(--color-text)]" title="Hapus filter gender">
                                        {filterGender === 'L' ? <MarsIcon className="w-4 h-4 opacity-70" /> : <VenusIcon className="w-4 h-4 opacity-70" />}
                                        Gender: {filterGender === 'L' ? 'Putra' : 'Putri'}
                                        <span className="w-5 h-5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)] group-hover:text-red-500 transition-colors">
                                            <X className="w-4 h-4" />
                                        </span>
                                    </button>
                                )}
                                {filterStatus && filterStatus !== 'active' && (
                                    <button type="button" onClick={() => setFilterStatus('')}
                                        className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-amber-500/20 bg-amber-500/10 text-xs font-bold text-amber-600" title="Hapus filter status">
                                        Status: {(filterStatus?.charAt(0).toUpperCase() || '') + (filterStatus?.slice(1) || '')}
                                        <span className="w-5 h-5 rounded-lg bg-white/70 dark:bg-[var(--color-surface)] border border-amber-500/20 flex items-center justify-center text-amber-600 opacity-70 group-hover:opacity-100 transition-opacity">
                                            <X className="w-4 h-4" />
                                        </span>
                                    </button>
                                )}
                                {filterType && (
                                    <button type="button" onClick={() => setFilterType('')}
                                        className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-indigo-500/20 bg-indigo-500/10 text-xs font-bold text-indigo-600" title="Hapus filter jenis">
                                        <Briefcase className="w-4 h-4 opacity-70" />
                                        Jenis: {filterType === 'guru' ? 'Guru' : filterType === 'pengabdian' ? 'Pengabdian' : 'Karyawan'}
                                        <span className="w-5 h-5 rounded-lg bg-white/70 dark:bg-[var(--color-surface)] border border-indigo-500/20 flex items-center justify-center text-indigo-600 opacity-70 group-hover:opacity-100 transition-opacity">
                                            <X className="w-4 h-4" />
                                        </span>
                                    </button>
                                )}
                                {filterMissing && (
                                    <button type="button" onClick={() => setFilterMissing('')}
                                        className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-orange-500/20 bg-orange-500/10 text-xs font-bold text-orange-600" title="Hapus filter data hilang">
                                        {filterMissing === 'wa' ? 'Tanpa WA' : filterMissing}
                                        <span className="w-5 h-5 rounded-lg bg-white/70 dark:bg-[var(--color-surface)] border border-orange-500/20 flex items-center justify-center text-orange-600 opacity-70 group-hover:opacity-100 transition-opacity">
                                            <X className="w-4 h-4" />
                                        </span>
                                    </button>
                                )}
                                <button type="button" onClick={resetAllFilters}
                                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-red-500/20 bg-red-500/5 text-xs font-bold text-red-600" title="Reset semua filter">
                                    <RotateCcw className="w-4 h-4" />
                                    Reset semua
                                </button>
                            </div>
                        </div>
                    )}

                    {showAdvFilter && (
                        <div className="border-t border-[var(--color-border)] p-3.5 bg-[var(--color-surface-alt)] animate-in fade-in slide-in-from-top-2">
                            {/* Header Panel with Standardized "Vertical Bar" Pattern */}
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-1 h-3.5 bg-indigo-500 rounded-full" />
                                    <span className="text-xs font-bold uppercase tracking-wide text-indigo-600 flex items-center gap-2">
                                        <SlidersHorizontal className="w-4 h-4 opacity-60" />
                                        Filter Lanjutan
                                    </span>
                                </div>
                                <button
                                    onClick={resetAllFilters}
                                    className="text-xs font-bold uppercase tracking-wide text-red-500 hover:bg-red-50 px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 border border-transparent hover:border-red-100"
                                >
                                    <RotateCcw className="w-4 h-4" />
                                    Reset Semua Filter
                                </button>
                            </div>

                            <div className="grid grid-cols-1 xl:grid-cols-[1fr_auto] gap-4">
                                {/* Primary Grid: Selects */}
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)] mb-1.5">Jenis</label>
                                        <RichSelect
                                            value={filterType}
                                            onChange={val => { setFilterType(val); setPage(1) }}
                                            options={[
                                                { id: '', name: 'Semua Jenis' },
                                                { id: 'guru', name: 'Guru' },
                                                { id: 'pengabdian', name: 'Pengabdian' },
                                                { id: 'karyawan', name: 'Karyawan' }
                                            ]}
                                            placeholder="Semua Jenis"
                                            small
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)] mb-1.5">Mata Pelajaran</label>
                                        <RichSelect
                                            value={filterSubject}
                                            onChange={val => { setFilterSubject(val); setPage(1) }}
                                            options={[
                                                { id: '', name: 'Semua Mapel' },
                                                ...subjectsList.map(s => ({ id: s, name: s }))
                                            ]}
                                            placeholder="Semua Mapel"
                                            small
                                            searchable
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)] mb-1.5">Gender</label>
                                        <RichSelect
                                            value={filterGender}
                                            onChange={val => { setFilterGender(val); setPage(1) }}
                                            options={[
                                                { id: '', name: 'Semua' },
                                                { id: 'L', name: 'Laki-laki' },
                                                { id: 'P', name: 'Perempuan' }
                                            ]}
                                            placeholder="Semua"
                                            small
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)] mb-1.5">Status</label>
                                        <RichSelect
                                            value={filterStatus}
                                            onChange={val => { setFilterStatus(val); setPage(1) }}
                                            options={[
                                                { id: '', name: 'Semua Status' },
                                                { id: 'active', name: 'Aktif' },
                                                { id: 'inactive', name: 'Nonaktif' },
                                                { id: 'cuti', name: 'Cuti' }
                                            ]}
                                            placeholder="Semua Status"
                                            small
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)] mb-1.5">Urutkan</label>
                                        <RichSelect
                                            value={sortBy}
                                            onChange={val => { setSortBy(val); setPage(1) }}
                                            options={[
                                                { id: 'name_asc', name: 'Nama A–Z' },
                                                { id: 'name_desc', name: 'Nama Z–A' },
                                                { id: 'subject_asc', name: 'Mapel A–Z' },
                                                { id: 'join_desc', name: 'Bergabung Terbaru' },
                                                { id: 'join_asc', name: 'Bergabung Terlama' }
                                            ]}
                                            placeholder="Urutkan"
                                            small
                                        />
                                    </div>
                                </div>

                                {/* Secondary Grid: Quick Filters */}
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)] mb-1.5">Menu Cepat & Aksi</label>
                                    <div className="flex gap-1.5 overflow-x-auto pb-1">
                                        {[
                                            { label: 'Semua', icon: Users, active: !filterMissing && filterStatus === 'active', onClick: () => { setFilterMissing(''); setFilterStatus('active'); setSortBy('name_asc') } },
                                            { label: 'Tanpa WA', icon: WhatsAppIcon, active: filterMissing === 'wa', onClick: () => { setFilterMissing('wa'); setPage(1) } },
                                            { label: 'Nonaktif', icon: Briefcase, active: filterStatus === 'inactive', onClick: () => { setFilterStatus('inactive'); setPage(1) } },
                                            { label: 'Cuti', icon: Archive, active: filterStatus === 'cuti', onClick: () => { setFilterStatus('cuti'); setPage(1) } },
                                        ].map((s, i) => (
                                            <button key={i} onClick={s.onClick} className={`whitespace-nowrap h-9 px-3 rounded-xl border flex items-center gap-2 transition-all ${s.active ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-md' : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]'}`}>
                                                <s.icon className="text-xs" /><span className="text-xs font-bold uppercase tracking-wide">{s.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Table ── */}
                {loading ? (
                    <div className="bg-surface rounded-[1.5rem] border border-[var(--color-border)] overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-[var(--color-surface-alt)]">
                                <tr className="text-left text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
                                    <th className="px-6 py-4 w-10"></th><th className="px-6 py-4">Guru</th><th className="px-6 py-4">Mapel</th><th className="px-6 py-4">Kontak</th><th className="px-6 py-4">Status</th><th className="px-6 py-4">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>{Array.from({ length: 8 }).map((_, i) => (
                                <tr key={i} className="border-t border-[var(--color-border)]">
                                    <td className="px-6 py-4"><div className="w-4 h-4 rounded bg-[var(--color-border)] animate-pulse" /></td>
                                    <td className="px-6 py-4"><div className="flex items-center gap-3"><div className="w-9 h-9 rounded-xl bg-[var(--color-border)] animate-pulse shrink-0" /><div className="space-y-2"><div className="h-3 w-32 rounded bg-[var(--color-border)] animate-pulse" /><div className="h-2 w-20 rounded bg-[var(--color-border)] animate-pulse opacity-60" /></div></div></td>
                                    <td className="px-6 py-4"><div className="h-5 w-24 rounded-lg bg-[var(--color-border)] animate-pulse" /></td>
                                    <td className="px-6 py-4"><div className="h-3 w-28 rounded bg-[var(--color-border)] animate-pulse" /></td>
                                    <td className="px-6 py-4"><div className="h-5 w-16 rounded-lg bg-[var(--color-border)] animate-pulse" /></td>
                                    <td className="px-6 py-4"><div className="h-7 w-28 rounded-lg bg-[var(--color-border)] animate-pulse ml-auto" /></td>
                                </tr>
                            ))}</tbody>
                        </table>
                    </div>
                ) : (
                    <div className="bg-surface rounded-[1.5rem] border border-[var(--color-border)] overflow-hidden">
                        {/* Desktop */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-[var(--color-surface-alt)] sticky top-0 z-10">
                                    <tr className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
                                        <th className="px-6 py-4 text-center w-12">
                                            <input type="checkbox" checked={allSelected} ref={el => { if (el) el.indeterminate = someSelected }} onChange={toggleSelectAll} className="w-4 h-4 rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)] accent-[var(--color-primary)] cursor-pointer" />
                                        </th>
                                        <th className="px-6 py-4 text-left">Guru</th>
                                        {visibleCols.nbm && <th className="px-6 py-4 text-left">NBM</th>}
                                        {visibleCols.subject && <th className="px-6 py-4 text-left">Mata Pelajaran</th>}
                                        {visibleCols.gender && <th className="px-6 py-4 text-center">Gender</th>}
                                        {visibleCols.contact && <th className="px-6 py-4 text-left">Kontak</th>}
                                        {visibleCols.status && <th className="px-6 py-4 text-left">Status</th>}
                                        {visibleCols.join && <th className="px-6 py-4 text-left">Bergabung</th>}
                                        <th className="px-6 py-4 text-center pr-6 w-32 relative">
                                            <div className="flex items-center justify-center">
                                                <span>Aksi</span>
                                            </div>
                                            {/* Toggle Button — absolute kanan */}
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                <button onClick={(e) => {
                                                    const rect = e.currentTarget.getBoundingClientRect()
                                                    const menuHeight = 280 // Max height estimate
                                                    const spaceBelow = window.innerHeight - rect.bottom
                                                    const showUp = spaceBelow < menuHeight && rect.top > menuHeight
                                                    setMenuPos({
                                                        top: showUp ? (rect.top + window.scrollY - menuHeight - 8) : (rect.bottom + window.scrollY + 8),
                                                        right: window.innerWidth - rect.right - window.scrollX,
                                                        showUp
                                                    })
                                                    setIsColMenuOpen(p => !p)
                                                }} title="Atur tampilan kolom"
                                                    className={`w-6 h-6 rounded-md flex items-center justify-center transition-all ${isColMenuOpen ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]'}`}>
                                                    <svg width="11" height="11" viewBox="0 0 12 12" fill="currentColor"><rect x="0" y="0" width="5" height="5" rx="1" /><rect x="7" y="0" width="5" height="5" rx="1" /><rect x="0" y="7" width="5" height="5" rx="1" /><rect x="7" y="7" width="5" height="5" rx="1" /></svg>
                                                </button>
                                                {isColMenuOpen && createPortal(
                                                    <div className={`absolute z-[9999] w-48 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl p-2 space-y-0.5 animate-in fade-in zoom-in-95 ${menuPos.showUp ? 'slide-in-from-bottom-2' : 'slide-in-from-top-2'}`}
                                                        style={{ top: menuPos.top, right: menuPos.right }}>
                                                        <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)] px-3 py-2">Atur Kolom</p>
                                                        {[{ key: 'nbm', label: 'NBM' }, { key: 'subject', label: 'Mata Pelajaran' }, { key: 'gender', label: 'Jenis Kelamin' }, { key: 'contact', label: 'Kontak / HP' }, { key: 'status', label: 'Status Aktif' }, { key: 'join', label: 'Tgl Bergabung' }].map(({ key, label }) => (
                                                            <button key={key} onClick={() => setVisibleCols(p => ({ ...p, [key]: !p[key] }))} className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-[var(--color-surface-alt)] transition-all group text-left">
                                                                <span className="text-xs font-bold text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition-colors">{label}</span>
                                                                <div className={`w-8 h-4.5 rounded-full transition-all flex items-center px-0.5 ${visibleCols[key] ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'}`}>
                                                                    <div className={`w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-all ${visibleCols[key] ? 'translate-x-[14px]' : 'translate-x-0'}`} />
                                                                </div>
                                                            </button>
                                                        ))}
                                                    </div>,
                                                    document.body
                                                )}
                                            </div>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {teachers.length === 0 ? (
                                        <tr>
                                            <td colSpan={10} className="px-6 py-28 text-center align-middle">
                                                <div className="w-full h-full flex flex-col items-center justify-center text-center mx-auto animate-in fade-in zoom-in-95 duration-700">
                                                    <div className="relative mb-6">
                                                        <div className="relative w-24 h-24 rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xl flex items-center justify-center">
                                                            <Search className="w-6 h-6 text-[var(--color-primary)]/30" />
                                                            <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-2xl bg-[var(--color-surface)] shadow-lg flex items-center justify-center border border-[var(--color-border)]">
                                                                <X className="w-4 h-4 text-red-500" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <h3 className="text-base font-bold text-[var(--color-text)] mb-2">Pencarian Tidak Ditemukan</h3>
                                                    <p className="text-xs font-bold text-[var(--color-text-muted)] max-w-sm leading-relaxed mb-6">
                                                        Tidak ada guru atau karyawan yang cocok dengan kriteria pencarian. Coba ubah kata kunci atau reset filter.
                                                    </p>
                                                    <button onClick={resetAllFilters} className="h-9 px-4 rounded-xl text-xs font-bold uppercase tracking-wide border border-[var(--color-border)] hover:bg-[var(--color-surface-alt)] transition mb-4">
                                                        Reset Semua Filter
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : teachers.map(teacher => (
                                        <TeacherRow
                                            key={teacher.id}
                                            teacher={teacher}
                                            selectedIds={selectedIds}
                                            toggleSelect={toggleSelect}
                                            visibleCols={visibleCols}
                                            isPrivacyMode={isPrivacyMode}
                                            disp={disp}
                                            openProfile={openProfile}
                                            handleEdit={canEdit ? handleEdit : null}
                                            handleTogglePin={handleTogglePin}
                                            handleQuickStatus={handleQuickStatus}
                                            setTeacherToAction={setTeacherToAction}
                                            setIsArchiveModalOpen={canEdit ? setIsArchiveModalOpen : null}
                                            quickStatusId={quickStatusId}
                                            setQuickStatusId={setQuickStatusId}
                                            quickStatusRef={quickStatusRef}
                                        />
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Cards */}
                        <div className="md:hidden divide-y divide-[var(--color-border)]">
                            {teachers.length === 0 ? (
                                <div className="py-24 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in-95 duration-700">
                                    <div className="relative mb-6">
                                        <div className="relative w-24 h-24 rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xl flex items-center justify-center">
                                            <Search className="w-6 h-6 text-[var(--color-primary)]/30" />
                                            <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-2xl bg-[var(--color-surface)] shadow-lg flex items-center justify-center border border-[var(--color-border)]">
                                                <X className="w-4 h-4 text-red-500" />
                                            </div>
                                        </div>
                                    </div>
                                    <h3 className="text-lg font-bold text-[var(--color-text)] mb-2">Pencarian Tidak Ditemukan</h3>
                                    <p className="text-xs font-bold text-[var(--color-text-muted)] max-w-[280px] leading-relaxed mb-6">
                                        Tidak ada guru atau karyawan yang cocok dengan kriteria pencarian. Coba ubah kata kunci atau reset filter.
                                    </p>
                                    <button onClick={resetAllFilters} className="h-9 px-4 rounded-xl text-xs font-bold uppercase tracking-wide border border-[var(--color-border)] hover:bg-[var(--color-surface-alt)] transition mb-4">
                                        Reset Semua Filter
                                    </button>
                                </div>
                            ) : teachers.map(teacher => (
                                <TeacherMobileCard
                                    key={teacher.id}
                                    teacher={teacher}
                                    selectedIds={selectedIds}
                                    toggleSelect={toggleSelect}
                                    isPrivacyMode={isPrivacyMode}
                                    disp={disp}
                                    openProfile={openProfile}
                                    handleEdit={canEdit ? handleEdit : null}
                                    handleTogglePin={handleTogglePin}
                                    setTeacherToAction={setTeacherToAction}
                                    setIsArchiveModalOpen={canEdit ? setIsArchiveModalOpen : null}
                                />
                            ))}
                        </div>

                        <Pagination
                            totalRows={totalRows}
                            page={page}
                            pageSize={pageSize}
                            setPage={setPage}
                            setPageSize={setPageSize}
                            label="guru"
                            jumpPage={jumpPage}
                            setJumpPage={setJumpPage}
                        />

                    </div>
                )}

                {/* ════ MODAL Tambah/Edit ════ */}
                <FormModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    selectedItem={selectedItem}
                    classesList={classesList}
                    subjectsList={subjectsList}
                    onSubmit={handleSubmit}
                    submitting={submitting}
                    onPhotoUpload={handlePhotoUpload}
                    uploadingPhoto={uploadingPhoto}
                />

                {/* ════ MODAL Profil ════ */}
                <ProfileModal
                    isOpen={isProfileOpen}
                    onClose={() => setIsProfileOpen(false)}
                    selectedTeacher={profileTeacher}
                    loadingProfile={loadingProfile}
                    profileStats={profileStats}
                    profileReports={profileReports}
                    profileTab={profileTab}
                    setProfileTab={setProfileTab}
                    canEdit={canEdit}
                    handleEdit={handleEdit}
                    addToast={addToast}
                    fetchData={fetchData}
                />

                {/* ════ MODAL Import ════ */}
                <ImportDataModal
                    isOpen={isImportModalOpen}
                    onClose={() => { if (importing) return; resetImport(); setIsImportModalOpen(false) }}
                    importing={importing}
                    importStep={importStep}
                    setImportStep={setImportStep}
                    importPreview={importPreview}
                    importFileName={importFileName}
                    importDragOver={importDrag}
                    setImportDragOver={setImportDrag}
                    processImportFile={processImportFile}
                    handleDownloadTemplate={handleDownloadTemplate}
                    importFileHeaders={importFileHeaders}
                    importColumnMapping={importColumnMapping}
                    setImportColumnMapping={setImportColumnMapping}
                    importRawData={importRawData}
                    importLoading={importLoading}
                    setImportLoading={setImportLoading}
                    buildImportPreview={buildImportPreview}
                    importIssues={importIssues}
                    importValidationOpen={importValidationOpen}
                    setImportValidationOpen={setImportValidationOpen}
                    importProgress={importProgress}
                    handleCommitImport={handleCommitImport}
                    hasImportBlockingErrors={hasImportBlockingErrors}
                    importReadyRows={importReadyRows}
                    handleImportCellEdit={handleImportCellEdit}
                    importEditCell={importEditCell}
                    setImportEditCell={setImportEditCell}
                    handleRemoveImportRow={handleRemoveImportRow}
                    importSkipDupes={importSkipDupes}
                    setImportSkipDupes={setImportSkipDupes}
                    config={importConfig}
                />

                {/* ════ MODAL Export ════ */}
                <ExportDataModal
                    isOpen={isExportModalOpen}
                    onClose={() => setIsExportModalOpen(false)}
                    items={teachers}
                    selectedIds={selectedIds}
                    exportScope={exportScope}
                    setExportScope={setExportScope}
                    exportColumns={exportColumns}
                    setExportColumns={setExportColumns}
                    exporting={exporting}
                    handleExportCSV={handleExportCSV}
                    handleExportExcel={handleExportExcel}
                    handleExportPDF={handleExportPDF}
                    config={EXPORT_CONFIG}
                />

                {/* ════ MODAL Arsipkan ════ */}
                {isArchiveModalOpen && (
                    <Modal
                        isOpen={isArchiveModalOpen}
                        onClose={() => setIsArchiveModalOpen(false)}
                        title="Konfirmasi Arsip"
                        description="Guru akan dipindahkan ke folder Arsip"
                        icon={Archive}
                        iconBg="bg-amber-500/10"
                        iconColor="text-amber-600"
                        size="sm"
                        mobileVariant="bottom-sheet"
                        footer={
                            <div className="flex items-center w-full gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsArchiveModalOpen(false)}
                                    className="h-10 px-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] text-xs font-bold uppercase tracking-wide transition-all shrink-0"
                                >
                                    Batal
                                </button>
                                <div className="flex-1" />
                                <button
                                    type="button"
                                    onClick={handleArchive}
                                    disabled={submitting}
                                    className="h-10 px-6 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold uppercase tracking-wide shadow-lg transition-all flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
                                >
                                    {submitting ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Archive className="w-4 h-4 opacity-70" />}
                                    Arsipkan
                                </button>
                            </div>
                        }
                    >
                        <div className="px-1">
                            <p className="text-xs text-[var(--color-text-muted)] leading-relaxed font-bold">
                                Guru <span className="text-amber-600 font-bold px-1.5 py-0.5 bg-amber-500/10 rounded-md border border-amber-500/20">{teacherToAction?.name}</span> akan diarsipkan. Riwayat mengajar & data tetap tersimpan dengan aman.
                            </p>
                        </div>
                    </Modal>
                )}


                {isBulkModalOpen && (
                    <Modal
                        isOpen={isBulkModalOpen}
                        onClose={() => setIsBulkModalOpen(false)}
                        title="Arsip Massal"
                        description={`${selectedIds.length} guru akan diarsipkan`}
                        icon={Archive}
                        iconBg="bg-amber-500/10"
                        iconColor="text-amber-600"
                        size="sm"
                    >
                        <div className="space-y-6">
                            <div className="py-2">
                                <p className="text-xs text-[var(--color-text-muted)] leading-relaxed font-bold">
                                    Anda akan mengarsipkan <span className="text-amber-600 font-bold px-1.5 py-0.5 bg-amber-500/10 rounded-md border border-amber-500/20">{selectedIds.length} guru</span>.
                                </p>
                                <p className="text-xs text-[var(--color-text-muted)] mt-1 font-medium italic">
                                    Data ini dapat dipulihkan kapan saja melalui folder Arsip.
                                </p>
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => setIsBulkModalOpen(false)} className="flex-1 h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] text-xs font-bold uppercase tracking-wide transition-all">
                                    BATAL
                                </button>
                                <button
                                    onClick={handleBulkArchive}
                                    disabled={submitting}
                                    className="flex-[2] h-11 rounded-xl bg-amber-500 text-white text-xs font-bold uppercase tracking-wide hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg"
                                >
                                    {submitting ? <LoaderCircle className="w-4 h-4 animate-spin" /> : (
                                        <><Archive className="w-4 h-4" /> ARSIPKAN SEMUA</>
                                    )}
                                </button>
                            </div>
                        </div>
                    </Modal>
                )}

                {/* ════ MODAL WA Massal ════ */}
                <Modal isOpen={isBulkWAOpen} onClose={() => setIsBulkWAOpen(false)} title="WA Massal Guru" size="sm">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)]">Template Pesan</p>
                            {[{ id: 'info', label: 'Info Akun Sistem' }, { id: 'notif', label: 'Notifikasi Baru' }].map(t => (
                                <button key={t.id} onClick={() => setWaTemplate(t.id)} className={`w-full p-3 rounded-xl border text-left text-xs font-bold transition-all ${waTemplate === t.id ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white shadow-lg' : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-border)]'}`}>{t.label}</button>
                            ))}
                        </div>
                        <div className="p-3 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-xs text-[var(--color-text-muted)] font-medium">
                            {bulkWATeachers.length} guru dengan WA · {Object.values(bulkWAResults).filter(v => v === 'sent').length} sudah dikirim
                        </div>
                        <div className="max-h-56 overflow-y-auto space-y-2">
                            {bulkWATeachers.map((t, i) => (
                                <div key={t.id} className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all ${i === bulkWAIndex ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5' : bulkWAResults[t.id] === 'sent' ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-[var(--color-border)]'}`}>
                                    <div className="w-8 h-8 rounded-xl overflow-hidden bg-[var(--color-primary)] flex items-center justify-center text-white text-xs font-bold shrink-0">
                                        {t.avatar_url
                                            ? <img src={t.avatar_url} alt={t.name} className="w-full h-full object-cover" onError={e => { e.currentTarget.style.display = 'none' }} loading="lazy" decoding="async" />
                                            : t.name.charAt(0)
                                        }
                                    </div>
                                    <div className="flex-1 min-w-0"><p className="text-xs font-bold truncate">{t.name}</p><p className="text-xs text-[var(--color-text-muted)]">{t.phone}</p></div>
                                    {bulkWAResults[t.id] === 'sent' && <CircleCheck className="w-4 h-4 text-emerald-500 shrink-0" />}
                                    {i === bulkWAIndex && <span className="text-xs font-bold text-[var(--color-primary)] uppercase">Berikutnya</span>}
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-3 pt-2">
                            <button onClick={() => setIsBulkWAOpen(false)} className="flex-1 h-11 rounded-xl bg-[var(--color-surface-alt)] text-xs font-bold uppercase tracking-wide">Selesai</button>
                            {bulkWAIndex >= 0 && bulkWAIndex < bulkWATeachers.length && (
                                <button onClick={sendNextWA} className="flex-1 h-11 rounded-xl bg-green-500 text-white text-xs font-bold uppercase tracking-wide flex items-center justify-center gap-2 hover:brightness-110 transition-all">
                                    <WhatsAppIcon className="w-4 h-4" />Kirim ke {bulkWATeachers[bulkWAIndex]?.name.split(' ')[0]}
                                </button>
                            )}
                        </div>
                    </div>
                </Modal>

                {/* ════ MODAL Arsip List ════ */}
                <ArchiveModal
                    isOpen={isArchivedOpen}
                    onClose={() => setIsArchivedOpen(false)}
                    archivedTeachers={archivedTeachers}
                    loadingArchived={loadingArchived}
                    setArchivedTeachers={setArchivedTeachers}
                    fetchArchivedTeachers={fetchArchived}
                    fetchData={fetchData}
                    fetchStats={fetchStats}
                    addToast={addToast}
                />
            </div>
        </DashboardLayout >
    )
}
