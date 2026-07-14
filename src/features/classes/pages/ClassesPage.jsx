import { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react'
import { createPortal } from 'react-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faPlus, faSearch, faTimes, faSpinner, faBuilding, faSchool, faBed,
    faUsers, faFilter, faSliders, faChevronLeft, faChevronRight, faAnglesLeft, faAnglesRight,
    faTrash, faEye, faEyeSlash, faXmark, faDownload, faUpload, faBoxArchive, faRotateLeft,
    faKeyboard, faLink, faCheck, faChevronDown,
    faFileImport, faFileExport, faCheckCircle, faUserTie, faMars, faVenus, faSortAlphaDown,
    faCheckDouble, faSquareCheck
} from '@fortawesome/free-solid-svg-icons'

import DashboardLayout from '@core/layouts/DashboardLayout'
import Modal from '@shared/components/Modal'
import Breadcrumb from '@shared/components/Breadcrumb'
import PageHeader from '@shared/components/PageHeader'
import { useToast } from '@context/Toast'
import { useAuth } from '@context/Auth'
import { useFlag } from '@context/FeatureFlags'
import { supabase } from '@lib/supabase'
import { logAudit } from '@utils/auditLogger'
import { useDebounce } from '@hooks/useDebounce'
import { TableSkeleton, CardSkeleton } from '@shared/components/Skeleton'
import RichSelect from '@shared/components/RichSelect'
import StatsCarousel from '@shared/components/StatsCarousel'
import { StatCard } from '@shared/components/DataDisplay'

// Library for Export/Import
import Papa from 'papaparse'


// Components
import { ClassRow, ClassMobileCard } from '@features/classes/components/ClassRow'
import ClassFormModal from '@features/classes/components/ClassFormModal'
import ClassExportModal from '@features/classes/components/ClassExportModal'
import ClassArchiveModal from '@features/classes/components/ClassArchiveModal'
import ClassImportModal from '@features/classes/components/ClassImportModal'
import Pagination from '@shared/components/Pagination'


const LEVELS = ['7', '8', '9', '10', '11', '12']
const PROGRAMS = ['Boarding', 'Reguler']
const LS_FILTERS = 'classes_filters'
const LS_COLS = 'classes_columns'
const LS_PAGE_SIZE = 'classes_page_size'

const SYSTEM_COLS = [
    { key: 'name', label: 'Nama Kelas', synonyms: ['nama kelas', 'kelas', 'name', 'nama', 'class'] },
    { key: 'grade', label: 'Tingkat', synonyms: ['tingkat', 'grade', 'level'] },
    { key: 'program', label: 'Program', synonyms: ['program', 'major', 'boarding', 'reguler'] },
    { key: 'gender_type', label: 'Tipe Gender', synonyms: ['tipe gender', 'gender', 'putra', 'putri', 'l/p', 'jenis kelamin'] },
    { key: 'teacher', label: 'Wali Kelas', synonyms: ['wali kelas', 'wali', 'teacher', 'guru', 'nama guru'] },
    { key: 'year', label: 'Tahun Ajaran', synonyms: ['tahun ajaran', 'tahun', 'year', 'akademik', 'academic year'] }
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
                    <FontAwesomeIcon icon={faSpinner} className="animate-spin text-xs text-[var(--color-primary)]" />
                ) : (
                    <FontAwesomeIcon icon={faSearch} />
                )}
            </div>
            <input
                ref={inputRef}
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="Cari nama kelas, wali kelas, program... (Ctrl+K)"
                className="input-field pl-10 w-full h-9 text-xs sm:text-sm bg-[var(--color-surface-alt)]/50 border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/10 transition-all rounded-xl font-bold placeholder:font-normal placeholder:opacity-40"
            />
        </div>
    )
})
DebouncedSearchInput.displayName = 'DebouncedSearchInput'

export default function ClassesPage() {
    const { addToast } = useToast()
    const { profile } = useAuth()
    const { enabled: canEdit } = useFlag('access.teacher_classes')

    const [classes, setClasses] = useState([])
    const [archivedClasses, setArchivedClasses] = useState([])
    const [teachersList, setTeachersList] = useState([])
    const [academicYearsList, setAcademicYearsList] = useState([])
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)

    // Stats
    const [stats, setStats] = useState({ total: 0, boarding: 0, reguler: 0, totalStudents: 0 })

    // --- Stats Carousel Dot Indicator ---
    const statsScrollRef = useRef(null)
    const [activeStatIdx, setActiveStatIdx] = useState(0)
    const STAT_CARD_COUNT = 4

    // UI states
    const [searchQuery, setSearchQuery] = useState('')
    const [filterLevel, setFilterLevel] = useState('')
    const [filterProgram, setFilterProgram] = useState('')
    const [sortBy, setSortBy] = useState('name')
    const [filterNoTeacher, setFilterNoTeacher] = useState(false)
    const [filterCrowded, setFilterCrowded] = useState(false)
    const [showAdvFilter, setShowAdvFilter] = useState(false)

    // Privasi Mode
    const [isPrivacyMode, setIsPrivacyMode] = useState(false)
    const [isShortcutOpen, setIsShortcutOpen] = useState(false)
    const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false)

    // Pagination
    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(() => {
        try { return Number(localStorage.getItem(LS_PAGE_SIZE)) || 10 } catch { return 10 }
    })
    const [jumpPage, setJumpPage] = useState('')

    // Refs
    const searchInputRef = useRef(null)
    const importFileRef = useRef(null)
    const headerMenuRef = useRef(null)
    const shortcutRef = useRef(null)
    const colMenuRef = useRef(null)

    // Sticky portal refs & rects for header menu + shortcut dropdowns
    const headerMenuBtnRef = useRef(null)
    const shortcutBtnRef = useRef(null)
    const [headerMenuRect, setHeaderMenuRect] = useState(null)
    const [shortcutRect, setShortcutRect] = useState(null)
    const [headerMenuMounted, setHeaderMenuMounted] = useState(false)

    // Selection
    const [selectedIds, setSelectedIds] = useState([])

    // Modals
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
    const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false)
    const [isExportModalOpen, setIsExportModalOpen] = useState(false)
    const [isImportModalOpen, setIsImportModalOpen] = useState(false)
    const [isArchivedModalOpen, setIsArchivedModalOpen] = useState(false)
    const [selectedItem, setSelectedItem] = useState(null)
    const [itemToDelete, setItemToDelete] = useState(null)
    const [exporting, setExporting] = useState(false)
    const [exportScope, setExportScope] = useState('filtered')
    const [exportColumns, setExportColumns] = useState(['nama_kelas', 'tingkat', 'program', 'wali_kelas', 'tahun_ajaran', 'jumlah_siswa'])

    // Import
    const [importStep, setImportStep] = useState(1)
    const [importFileName, setImportFileName] = useState('')
    const [importRawData, setImportRawData] = useState([])
    const [importFileHeaders, setImportFileHeaders] = useState([])
    const [importColumnMapping, setImportColumnMapping] = useState({})
    const [importPreview, setImportPreview] = useState([])
    const [importIssues, setImportIssues] = useState([])
    const [importLoading, setImportLoading] = useState(false)
    const [importValidationOpen, setImportValidationOpen] = useState(true)
    const [importDragOver, setImportDragOver] = useState(false)
    const [importing, setImporting] = useState(false)
    const [importProgress, setImportProgress] = useState({ done: 0, total: 0 })
    const [importEditCell, setImportEditCell] = useState(null)
    const [importSkipDupes, setImportSkipDupes] = useState(true)

    // Columns
    const [isColMenuOpen, setIsColMenuOpen] = useState(false)
    const [menuPos, setMenuPos] = useState({ top: 0, right: 0 })
    const defaultCols = { level: true, program: true, gender: true, teacher: true, students: true, year: true }
    const [visibleCols, setVisibleCols] = useState(() => {
        try { return JSON.parse(localStorage.getItem(LS_COLS)) || defaultCols }
        catch { return defaultCols }
    })

    // ── persist ──────────────────────────────────────────────────────────────
    useEffect(() => {
        try { const f = JSON.parse(localStorage.getItem(LS_FILTERS) || '{}'); if (f.filterLevel) setFilterLevel(f.filterLevel); if (f.filterProgram) setFilterProgram(f.filterProgram); if (f.sortBy) setSortBy(f.sortBy); if (f.filterNoTeacher !== undefined) setFilterNoTeacher(f.filterNoTeacher); if (f.filterCrowded !== undefined) setFilterCrowded(f.filterCrowded) } catch { }
        try { const c = JSON.parse(localStorage.getItem(LS_COLS) || '{}'); if (Object.keys(c).length) setVisibleCols(c) } catch { }
    }, [])
    useEffect(() => { try { localStorage.setItem(LS_FILTERS, JSON.stringify({ filterLevel, filterProgram, sortBy, filterNoTeacher, filterCrowded })) } catch { } }, [filterLevel, filterProgram, sortBy, filterNoTeacher, filterCrowded])
    useEffect(() => { try { localStorage.setItem(LS_COLS, JSON.stringify(visibleCols)) } catch { } }, [visibleCols])
    useEffect(() => { try { localStorage.setItem(LS_PAGE_SIZE, pageSize) } catch { } }, [pageSize])

    // reset page on search/filter change
    useEffect(() => { setPage(1) }, [searchQuery, filterLevel, filterProgram, sortBy, filterNoTeacher, filterCrowded])

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
        if (!isHeaderMenuOpen && !isShortcutOpen) return
        const update = () => {
            if (isHeaderMenuOpen && headerMenuBtnRef.current) setHeaderMenuRect(headerMenuBtnRef.current.getBoundingClientRect())
            if (isShortcutOpen && shortcutBtnRef.current) setShortcutRect(shortcutBtnRef.current.getBoundingClientRect())
        }
        update()
        window.addEventListener('scroll', update, true)
        window.addEventListener('resize', update)
        return () => { window.removeEventListener('scroll', update, true); window.removeEventListener('resize', update) }
    }, [isHeaderMenuOpen, isShortcutOpen])

    useEffect(() => {
        const h = e => {
            if (colMenuRef.current && !colMenuRef.current.contains(e.target)) setIsColMenuOpen(false)
        }
        document.addEventListener('mousedown', h)
        return () => document.removeEventListener('mousedown', h)
    }, [])

    // ── computed ──────────────────────────────────────────────────────────────
    const activeFilterCount = (filterLevel ? 1 : 0) + (filterProgram ? 1 : 0) + (filterNoTeacher ? 1 : 0) + (filterCrowded ? 1 : 0)
    const hasActiveFilters = !!(searchQuery || activeFilterCount)
    const resetAllFilters = () => { setSearchQuery(''); setFilterLevel(''); setFilterProgram(''); setFilterNoTeacher(false); setFilterCrowded(false); setPage(1) }

    // ── keyboard shortcuts ────────────────────────────────────────────────────
    useEffect(() => {
        const handler = e => {
            const isTyping = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)
            const ctrl = e.ctrlKey || e.metaKey
            const anyModal = isModalOpen || isDeleteModalOpen || isBulkDeleteOpen || isExportModalOpen || isImportModalOpen || isArchivedModalOpen
            if (e.key === 'Escape') { if (isShortcutOpen) { setIsShortcutOpen(false); return } if (anyModal) return; if (searchQuery) { setSearchQuery(''); return } if (selectedIds.length) { setSelectedIds([]); return } if (hasActiveFilters) { resetAllFilters(); return } }
            if (ctrl && e.key === 'k') { e.preventDefault(); searchInputRef.current?.focus(); searchInputRef.current?.select(); return }
            if (ctrl && e.key === 'f' && !isTyping) { e.preventDefault(); setShowAdvFilter(v => !v); return }
            if (ctrl && e.key === 'a' && !isTyping) { e.preventDefault(); toggleSelectAll(); return }
            if (ctrl && e.key === 'e' && !isTyping) { e.preventDefault(); setIsExportModalOpen(true); return }
            if (e.key === 'n' && !isTyping) { e.preventDefault(); handleAdd(); return }
            if (e.key === 'p' && !isTyping) { e.preventDefault(); setIsPrivacyMode(v => !v); return }
            if (e.key === 'r' && !isTyping) { e.preventDefault(); fetchData(); return }
            if (e.key === 'x' && !isTyping) { e.preventDefault(); resetAllFilters(); return }
            if (e.key === '?' && !isTyping) { setIsShortcutOpen(v => !v); return }
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isModalOpen, isDeleteModalOpen, isBulkDeleteOpen, isExportModalOpen, isImportModalOpen, isArchivedModalOpen, isShortcutOpen, searchQuery, selectedIds, hasActiveFilters])

    // ── DATA FETCHING ──────────────────────────────────────────────
    const loadMetadata = useCallback(async () => {
        if (!supabase) return { t: {}, y: {} }
        try {
            const [tRes, yRes] = await Promise.all([
                supabase.from('teachers').select('id, name').order('name'),
                supabase.from('academic_years').select('id, name, semester').order('name', { ascending: false })
            ])
            const tList = tRes.data || []
            const yList = (yRes.data || []).map(y => ({ ...y, label: [y.name, y.semester].filter(Boolean).join(' ') || '—' }))
            setTeachersList(tList); setAcademicYearsList(yList)
            return { t: Object.fromEntries(tList.map(t => [t.id, t.name || '—'])), y: Object.fromEntries(yList.map(y => [y.id, y.label])) }
        } catch { return { t: {}, y: {} } }
    }, [])

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const { t: tMap, y: yMap } = await loadMetadata()
            let q = supabase.from('classes').select('id, name, grade, major, homeroom_teacher_id, academic_year_id, created_at, students(count)').order('name')
            const { data, error } = await q
            if (!error && data) {
                const mapped = data.map(row => ({
                    ...row,
                    teacherName: row.homeroom_teacher_id ? (tMap[row.homeroom_teacher_id] || '—') : '—',
                    academicYearName: row.academic_year_id ? (yMap[row.academic_year_id] || '—') : '—',
                    students: row.students?.[0]?.count ?? 0,
                }))
                setClasses(mapped)
                const s = { total: mapped.length, boarding: 0, reguler: 0, totalStudents: 0 }
                mapped.forEach(c => { if (c.major?.includes('Boarding')) s.boarding++; else s.reguler++; s.totalStudents += (c.students || 0) })
                setStats(s)
            }
        } catch (err) { console.error(err) }
        finally { setLoading(false) }
    }, [loadMetadata])

    const fetchArchived = useCallback(async () => {
        setLoadingArchived(true)
        try {
            const { data, error } = await supabase.from('classes').select('*').not('deleted_at', 'is', null).order('deleted_at', { ascending: false })
            if (error) throw error
            setArchivedClasses(data || [])
        } catch {
            setArchivedClasses([])
        } finally {
            setLoadingArchived(false)
        }
    }, [])

    const handleRestore = async (id) => {
        try {
            const { error } = await supabase.from('classes').update({ deleted_at: null }).eq('id', id)
            if (error) throw error
            addToast('Kelas berhasil dipulihkan', 'success'); await logAudit({ action: 'UPDATE', source: 'SYSTEM', tableName: 'classes', recordId: id, oldData: { id, restored: false }, newData: { deleted_at: null, restored: true } }); fetchArchived(); fetchData()
        } catch { addToast('Gagal memulihkan kelas', 'error') }
    }

    const handlePermanentDelete = async (id) => {
        if (!confirm('Hapus permanen kelas ini? Data tidak bisa dikembalikan.')) return
        try {
            const { error } = await supabase.from('classes').delete().eq('id', id)
            if (error) throw error
            addToast('Kelas dihapus permanen', 'success'); await logAudit({ action: 'DELETE', source: 'SYSTEM', tableName: 'classes', recordId: id, oldData: { permanent_delete: true } }); fetchArchived()
        } catch { addToast('Gagal menghapus permanen', 'error') }
    }

    const fetchDataRef = useRef(fetchData)
    useEffect(() => { fetchDataRef.current = fetchData }, [fetchData])
    useEffect(() => { fetchData() }, [fetchData])

    useEffect(() => {
        if (isArchivedModalOpen) fetchArchived()
    }, [isArchivedModalOpen, fetchArchived])

    // Realtime
    useEffect(() => {
        const ch = supabase.channel('classes-rt').on('postgres_changes', { event: '*', schema: 'public', table: 'classes' }, () => fetchDataRef.current?.()).subscribe()
        return () => supabase.removeChannel(ch)
    }, [])

    // Filter & Sort Logic
    const filteredClasses = useMemo(() => {
        let result = classes.filter(c => {
            const q = searchQuery.toLowerCase()
            const matchSearch = !q || c.name.toLowerCase().includes(q) || (c.major || '').toLowerCase().includes(q) || (c.teacherName || '').toLowerCase().includes(q)
            const matchLevel = !filterLevel || c.grade === filterLevel
            const matchProg = !filterProgram || (c.major || '').includes(filterProgram)
            const matchNoTeacher = !filterNoTeacher || !c.homeroom_teacher_id
            const matchCrowded = !filterCrowded || c.students > 35
            return matchSearch && matchLevel && matchProg && matchNoTeacher && matchCrowded
        })
        if (sortBy === 'name') result.sort((a, b) => a.name.localeCompare(b.name))
        else if (sortBy === 'level') result.sort((a, b) => (a.grade || '').localeCompare(b.grade || '') || a.name.localeCompare(b.name))
        else if (sortBy === 'students') result.sort((a, b) => (b.students || 0) - (a.students || 0))
        return result
    }, [classes, searchQuery, filterLevel, filterProgram, filterNoTeacher, filterCrowded, sortBy])

    const totalFilteredRows = filteredClasses.length

    const pagedClasses = filteredClasses.slice((page - 1) * pageSize, page * pageSize)

    // Insights
    const insights = useMemo(() => {
        const results = []
        const noTeacher = classes.filter(c => !c.homeroom_teacher_id)
        if (noTeacher.length > 0) results.push({
            id: 'noTeacher',
            label: `${noTeacher.length} Kelas Tanpa Wali`,
            desc: 'Wali kelas belum ditentukan',
            icon: faUserTie,
            color: 'text-amber-600 dark:text-amber-400',
            borderColor: 'border-amber-500/20',
            activeBorderColor: 'border-amber-500',
            activeBgColor: 'bg-amber-500/5',
            activeRingColor: 'ring-amber-500',
            bg: 'bg-amber-500/[0.08] hover:bg-amber-500/[0.15]',
            iconBg: 'bg-amber-500/15',
            iconColor: 'text-amber-500',
            activeIconBg: 'bg-amber-500 text-white',
            active: filterNoTeacher,
            onClick: () => { setFilterNoTeacher(v => !v); setPage(1); setShowAdvFilter(true) }
        })

        const crowded = classes.filter(c => c.students > 35)
        if (crowded.length > 0) results.push({
            id: 'crowded',
            label: `${crowded.length} Kelas Padat`,
            desc: 'Populasi siswa > 35 anak',
            icon: faSchool,
            color: 'text-blue-600 dark:text-blue-400',
            borderColor: 'border-blue-500/20',
            activeBorderColor: 'border-blue-500',
            activeBgColor: 'bg-blue-500/5',
            activeRingColor: 'ring-blue-500',
            bg: 'bg-blue-500/[0.08] hover:bg-blue-500/[0.15]',
            iconBg: 'bg-blue-500/15',
            iconColor: 'text-blue-500',
            activeIconBg: 'bg-blue-500 text-white',
            active: filterCrowded,
            onClick: () => { setFilterCrowded(v => !v); setPage(1); setShowAdvFilter(true) }
        })

        return results
    }, [classes, filterNoTeacher, filterCrowded])

    // Handlers
    const handleAdd = () => { setSelectedItem(null); setIsModalOpen(true) }
    const handleEdit = item => { setSelectedItem(item); setIsModalOpen(true) }

    const handleSubmit = async (formData) => {
        setSubmitting(true)
        const finalMajor = [formData.program, formData.gender_type].filter(Boolean).join(' ')
        const payload = { name: formData.name, grade: formData.level, major: finalMajor, homeroom_teacher_id: formData.homeroom_teacher_id || null, academic_year_id: formData.academic_year_id || null }
        try {
            if (selectedItem) { const { error } = await supabase.from('classes').update(payload).eq('id', selectedItem.id); if (error) throw error; addToast('Data kelas berhasil diupdate', 'success'); await logAudit({ action: 'UPDATE', source: 'SYSTEM', tableName: 'classes', recordId: selectedItem.id, oldData: selectedItem, newData: { ...selectedItem, ...payload } }) }
            else { const { data: insData, error } = await supabase.from('classes').insert(payload).select().single(); if (error) throw error; addToast('Kelas baru berhasil ditambahkan', 'success'); await logAudit({ action: 'INSERT', source: 'SYSTEM', tableName: 'classes', recordId: insData?.id, newData: payload }) }
            setIsModalOpen(false); fetchData()
        } catch (err) { addToast(err.message || 'Gagal menyimpan data', 'error') }
        finally { setSubmitting(false) }
    }

    const handleDeleteConfirm = async () => {
        if (!itemToDelete) return; setSubmitting(true)
        try {
            const { error } = await supabase.from('classes').delete().eq('id', itemToDelete.id)
            if (error) throw error
            addToast('Kelas berhasil dihapus', 'success'); await logAudit({ action: 'DELETE', source: 'SYSTEM', tableName: 'classes', recordId: itemToDelete.id, oldData: itemToDelete }); setIsDeleteModalOpen(false); fetchData()
        } catch { addToast('Gagal menghapus kelas', 'error') }
        finally { setSubmitting(false) }
    }

    const handleBulkDelete = async () => {
        setSubmitting(true)
        try {
            const { error } = await supabase.from('classes').delete().in('id', selectedIds)
            if (error) throw error
            addToast(`${selectedIds.length} kelas berhasil dihapus`, 'success'); await logAudit({ action: 'DELETE', source: 'SYSTEM', tableName: 'classes', newData: { bulk: true, count: selectedIds.length, ids: selectedIds } }); setSelectedIds([]); setIsBulkDeleteOpen(false); fetchData()
        } catch { addToast('Gagal menghapus kelas', 'error') }
        finally { setSubmitting(false) }
    }

    const toggleSelect = id => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
    const toggleSelectAll = () => {
        const ids = pagedClasses.map(c => c.id)
        setSelectedIds(prev => ids.every(id => prev.includes(id)) ? prev.filter(id => !ids.includes(id)) : [...new Set([...prev, ...ids])])
    }
    const allSelected = pagedClasses.length > 0 && pagedClasses.every(c => selectedIds.includes(c.id))
    const someSelected = pagedClasses.length > 0 && pagedClasses.some(c => selectedIds.includes(c.id)) && !allSelected

    const toggleColumn = (key) => setVisibleCols(prev => ({ ...prev, [key]: !prev[key] }))

    // Export Logic
    const ALL_EXPORT_COLUMNS = [
        { key: 'nama_kelas', label: 'Nama Kelas', fn: c => c.name || '-' },
        { key: 'tingkat', label: 'Tingkat / Grade', fn: c => c.grade || '-' },
        { key: 'program', label: 'Program / Major', fn: c => c.major || '-' },
        { key: 'wali_kelas', label: 'Wali Kelas', fn: c => c.teacherName || '-' },
        { key: 'tahun_ajaran', label: 'Tahun Ajaran', fn: c => c.academicYearName || '-' },
        { key: 'jumlah_siswa', label: 'Jumlah Siswa', fn: c => c.students || 0 },
    ]

    const getExportData = async () => {
        let q = supabase.from('classes').select('name, grade, major, homeroom_teacher_id, academic_year_id, students(count)').order('name')
        if (exportScope === 'filtered') {
            if (filterLevel) q = q.eq('grade', filterLevel)
            if (filterProgram) q = q.ilike('major', `%${filterProgram}%`)
        } else if (exportScope === 'selected') {
            q = q.in('id', selectedIds)
        }
        const { data, error } = await q; if (error) throw error
        const { t: tMap, y: yMap } = await loadMetadata()

        return (data || []).map(c => {
            const enriched = {
                ...c,
                teacherName: c.homeroom_teacher_id ? (tMap[c.homeroom_teacher_id] || '-') : '-',
                academicYearName: c.academic_year_id ? (yMap[c.academic_year_id] || '-') : '-',
                students: c.students?.[0]?.count || 0
            }
            const row = {}
            exportColumns.forEach(key => {
                const col = ALL_EXPORT_COLUMNS.find(x => x.key === key)
                if (col) row[col.label] = col.fn(enriched)
            })
            return row
        })
    }

    const handleExportCSV = async (filename, options = {}) => {
        setExporting(true)
        try {
            const rows = await getExportData(); if (!rows.length) return addToast('Tidak ada data', 'warning')
            const headers = Object.keys(rows[0])
            const csvContent = [
                ...(options.includeHeader !== false ? [headers.join(',')] : []),
                ...rows.map(r => headers.map(h => {
                    const v = String(r[h] ?? '').replace(/"/g, '""')
                    return `"${v}"`
                }).join(','))
            ].join('\n')
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
            const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.setAttribute('download', `${filename || 'export_kelas'}.csv`); link.click()
            addToast(`Export CSV berhasil (${rows.length} kelas)`, 'success')
            await logAudit({
                action: 'EXPORT',
                source: 'MASTER',
                tableName: 'classes',
                newData: {
                    format: 'csv',
                    scope: exportScope,
                    columns: exportColumns,
                    count: rows.length
                }
            })
            setIsExportModalOpen(false)
        } catch { addToast('Gagal export CSV', 'error') }
        finally { setExporting(false) }
    }

    const handleExportExcel = async (filename) => {
        setExporting(true)
        try {
            const rows = await getExportData(); if (!rows.length) return addToast('Tidak ada data', 'warning')
            const XLSX = await import('xlsx')
            const ws = XLSX.utils.json_to_sheet(rows); ws['!cols'] = Object.keys(rows[0]).map(k => ({ wch: Math.max(k.length, 14) }))
            const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Data Kelas')
            XLSX.writeFile(wb, `${filename || 'export_kelas'}.xlsx`)
            addToast(`Export Excel berhasil (${rows.length} kelas)`, 'success')
            await logAudit({
                action: 'EXPORT',
                source: 'MASTER',
                tableName: 'classes',
                newData: {
                    format: 'xlsx',
                    scope: exportScope,
                    columns: exportColumns,
                    count: rows.length
                }
            })
            setIsExportModalOpen(false)
        } catch { addToast('Gagal export Excel', 'error') }
        finally { setExporting(false) }
    }

    const handleExportPDF = async (filename, options = {}) => {
        setExporting(true)
        try {
            const [{ default: jsPDF }, autoTableMod] = await Promise.all([
                import('jspdf'),
                import('jspdf-autotable'),
            ])
            const autoTable = autoTableMod.default || autoTableMod
            const allRows = await getExportData()
            if (!allRows.length) return addToast('Tidak ada data untuk diekspor', 'warning')

            const doc = new jsPDF({ orientation: options.orientation || 'landscape' })
            doc.setFontSize(13)
            doc.text('Laporan Data Kelas', 14, 12)
            doc.setFontSize(8)
            doc.text(`Tanggal: ${new Date().toLocaleDateString('id-ID')}  |  Total: ${allRows.length} kelas  |  Scope: ${exportScope === 'filtered' ? 'Filter Aktif' : exportScope === 'selected' ? 'Dipilih' : 'Semua'}`, 14, 18)

            const headers = Object.keys(allRows[0])
            const rows = allRows.map(r => headers.map(h => String(r[h] ?? '')))

            autoTable(doc, {
                head: options.includeHeader !== false ? [headers] : [],
                body: rows,
                startY: 22,
                theme: 'grid',
                styles: { fontSize: 7.5, cellPadding: 2 },
                headStyles: { fillColor: [79, 70, 229], textColor: 255 },
                alternateRowStyles: { fillColor: [248, 250, 252] },
                columnStyles: {
                    'Tingkat': { halign: 'center' },
                    'Program': { halign: 'center' },
                    'Tipe Gender': { halign: 'center' },
                    'Tahun Ajaran': { halign: 'center' }
                }
            })

            // Add enterprise footer with pagination and metadata
            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(7);
                doc.setTextColor(150);
                const dateStr = new Date().toLocaleString('id-ID', {
                    dateStyle: 'medium',
                    timeStyle: 'short'
                });
                doc.text(`Dicetak otomatis oleh Laporanmu pada ${dateStr}`, 14, doc.internal.pageSize.height - 8);
                doc.text(`Halaman ${i} dari ${pageCount}`, doc.internal.pageSize.width - 35, doc.internal.pageSize.height - 8);
            }

            doc.save(`${filename || 'export_kelas'}.pdf`)
            addToast(`Export PDF berhasil (${allRows.length} kelas)`, 'success')

            await logAudit({
                action: 'EXPORT',
                source: 'MASTER',
                tableName: 'classes',
                newData: {
                    format: 'pdf',
                    scope: exportScope,
                    columns: exportColumns,
                    count: allRows.length
                }
            })
            setIsExportModalOpen(false)
        } catch (e) {
            console.error(e)
            addToast('Gagal export PDF', 'error')
        } finally {
            setExporting(false)
        }
    }

    // ── Import Logic ──────────────────────────────────────────────────────────
    const handleDownloadTemplate = async () => {
        const templateData = [
            { 'Nama Kelas': 'VII A', 'Tingkat': '7', 'Program': 'Reguler', 'Tipe Gender': 'Putra', 'Wali Kelas': '', 'Tahun Ajaran': '' },
            { 'Nama Kelas': 'VIII Boarding A', 'Tingkat': '8', 'Program': 'Boarding', 'Tipe Gender': 'Putri', 'Wali Kelas': '', 'Tahun Ajaran': '' },
        ]
        const XLSX = await import('xlsx')
        const ws = XLSX.utils.json_to_sheet(templateData)
        ws['!cols'] = [{ wch: 20 }, { wch: 10 }, { wch: 12 }, { wch: 14 }, { wch: 25 }, { wch: 20 }]
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, 'Template Import Kelas')
        XLSX.writeFile(wb, 'Template_Import_Kelas.xlsx')
    }

    const processImportFile = async file => {
        if (!file) return
        const ext = file.name.toLowerCase()
        if (!ext.endsWith('.csv') && !ext.endsWith('.xlsx')) { addToast('Format tidak didukung. Gunakan .csv atau .xlsx', 'error'); return }
        setImportFileName(file.name)
        setImportLoading(true)
        try {
            let rows = []
            if (ext.endsWith('.csv')) rows = await new Promise(res => Papa.parse(file, { header: true, skipEmptyLines: true, complete: r => res(r.data) }))
            else {
                const XLSX = await import('xlsx')
                rows = await new Promise(res => { const reader = new FileReader(); reader.onload = e => { const wb = XLSX.read(e.target.result, { type: 'array' }); res(XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' })) }; reader.readAsArrayBuffer(file) })
            }

            if (!rows.length) { addToast('File kosong or tidak terbaca', 'error'); return }

            const headers = Object.keys(rows[0])
            setImportRawData(rows)
            setImportFileHeaders(headers)

            // Auto-mapping
            const mapping = {}
            const norm = (str) => (str || '').toLowerCase().replace(/[\s\xA0\n\r]+/g, ' ').trim()
            SYSTEM_COLS.forEach(sys => {
                const match = headers.find(h => {
                    const normH = norm(h)
                    const cleanH = norm(h.split(/[\(\[\{（\n\r]/)[0])
                    const normL = norm(sys.label)
                    const normK = norm(sys.key)
                    if (normH === normL || normH === normK || cleanH === normL || cleanH === normK) return true
                    if (sys.synonyms && sys.synonyms.some(syn => {
                        const s = norm(syn)
                        return normH === s || cleanH === s || cleanH.replace(/[^a-z0-9]/g, '') === s.replace(/[^a-z0-9]/g, '')
                    })) return true
                    return false
                })
                if (match) mapping[sys.key] = match
            })
            setImportColumnMapping(mapping)
            setImportStep(2)
        } catch { addToast('Gagal membaca file import', 'error') }
        finally { setImportLoading(false) }
    }

    const buildImportPreview = async (raw, mapping) => {
        setImportLoading(true)
        try {
            const teacherByName = Object.fromEntries(teachersList.map(t => [t.name.toLowerCase().trim(), t.id]))
            const yearByLabel = Object.fromEntries(academicYearsList.map(y => [y.label.toLowerCase().trim(), y.id]))

            const preview = raw.map((row, i) => {
                const data = {}
                SYSTEM_COLS.forEach(sys => {
                    const fileCol = mapping[sys.key]
                    data[sys.key] = fileCol ? (row[fileCol] || '').toString().trim() : ''
                })

                // Normalization
                let { name, grade, program, gender_type, teacher, year } = data
                
                grade = grade.toString()
                
                let homeroom_teacher_id = null
                if (teacher) homeroom_teacher_id = teacherByName[teacher.toLowerCase()] || null

                let academic_year_id = null
                if (year) academic_year_id = yearByLabel[year.toLowerCase()] || null

                // Compose major
                let gType = gender_type.toUpperCase().trim()
                if (['L', 'LAKI-LAKI', 'LAKI LAKI', 'MALE', 'PUTRA'].includes(gType)) gType = 'Putra'
                else if (['P', 'PEREMPUAN', 'FEMALE', 'PUTRI'].includes(gType)) gType = 'Putri'
                else gType = gender_type

                const major = [program, gType].filter(Boolean).join(' ') || null

                return { ...data, _row: i, major, homeroom_teacher_id, academic_year_id }
            })

            // Validation
            const issues = []
            preview.forEach((row, i) => {
                const rowIssues = []
                if (!row.name) rowIssues.push('Nama Kelas tidak boleh kosong')
                if (!row.grade) rowIssues.push('Tingkat tidak boleh kosong')
                else if (!LEVELS.includes(row.grade)) rowIssues.push(`Tingkat "${row.grade}" tidak valid. (Gunakan: ${LEVELS.join(', ')})`)
                
                if (row.program && !PROGRAMS.includes(row.program)) rowIssues.push(`Program "${row.program}" tidak dikenali (Gunakan: Boarding/Reguler)`)
                if (row.teacher && !row.homeroom_teacher_id) rowIssues.push(`Wali Kelas "${row.teacher}" tidak ditemukan, akan dikosongkan`)
                if (row.year && !row.academic_year_id) rowIssues.push(`Tahun Ajaran "${row.year}" tidak ditemukan, akan dikosongkan`)

                if (row.name && preview.slice(0, i).some(p => p.name.toLowerCase() === row.name.toLowerCase())) {
                    rowIssues.push(`Nama Kelas "${row.name}" duplikat dalam file`)
                    row._isDupe = true
                }

                if (rowIssues.length) {
                    const isError = rowIssues.some(msg => msg.includes('tidak boleh kosong') || msg.includes('tidak valid'))
                    issues.push({ row: i + 2, level: row._isDupe ? 'dupe' : (isError ? 'error' : 'warn'), messages: rowIssues })
                    if (isError) row._hasError = true
                    else if (row._isDupe) row._hasError = false // handled separately
                    else row._hasWarn = true
                }
            })

            setImportPreview(preview)
            setImportIssues(issues)
        } finally {
            setImportLoading(false)
        }
    }

    const handleImportCellEdit = (rowIdx, colKey, newValue) => {
        setImportPreview(prev => {
            const next = [...prev]
            next[rowIdx] = { ...next[rowIdx], [colKey]: newValue }
            const r = next[rowIdx]

            // Recalculate major if program or gender_type changed
            if (colKey === 'program' || colKey === 'gender_type') {
                let gType = (r.gender_type || '').toUpperCase().trim()
                if (['L', 'LAKI-LAKI', 'LAKI LAKI', 'MALE', 'PUTRA'].includes(gType)) gType = 'Putra'
                else if (['P', 'PEREMPUAN', 'FEMALE', 'PUTRI'].includes(gType)) gType = 'Putri'
                else gType = r.gender_type
                r.major = [r.program, gType].filter(Boolean).join(' ') || null
            }

            // Minimal revalidation (can be improved)
            r._hasError = !r.name || !r.grade || !LEVELS.includes(r.grade)
            return next
        })
    }

    const handleRemoveImportRow = idx => {
        setImportPreview(prev => prev.filter((_, i) => i !== idx))
        setImportIssues(prev => prev.filter(iss => iss.row !== idx + 2).map(iss => iss.row > idx + 2 ? { ...iss, row: iss.row - 1 } : iss))
    }

    const handleBulkFix = (colKey, value) => {
        setImportPreview(prev => prev.map(r => ({ ...r, [colKey]: value, _hasError: (colKey === 'name' && !value) || (!r.grade) })))
        addToast(`Berhasil merubah semua baris`, 'success')
    }

    const handleImportClick = () => importFileRef.current?.click()

    const hasImportBlockingErrors = importIssues.some(x => x.level === 'error')
    const importReadyRows = importPreview.filter(r => !r._hasError && !(importSkipDupes && r._isDupe))

    const handleCommitImport = async () => {
        if (!importPreview.length) { addToast('Tidak ada data untuk diimport', 'error'); return }
        if (hasImportBlockingErrors) { addToast('Masih ada ERROR. Perbaiki file dulu.', 'error'); return }
        if (!importReadyRows.length) { addToast('Tidak ada baris valid untuk diimport', 'warning'); return }

        setImporting(true)
        setImportProgress({ done: 0, total: importReadyRows.length })

        try {
            const CHUNK = 50
            for (let i = 0; i < importReadyRows.length; i += CHUNK) {
                const chunk = importReadyRows.slice(i, i + CHUNK).map(r => ({
                    name: r.name,
                    grade: r.grade,
                    major: r.major || null,
                    homeroom_teacher_id: r.homeroom_teacher_id || null,
                    academic_year_id: r.academic_year_id || null,
                }))
                const { error } = await supabase.from('classes').insert(chunk)
                if (error) throw error
                setImportProgress({ done: Math.min(i + CHUNK, importReadyRows.length), total: importReadyRows.length })
            }

            addToast(`Berhasil import ${importReadyRows.length} kelas`, 'success')
            await logAudit({ action: 'INSERT', source: 'SYSTEM', tableName: 'classes', newData: { bulk_import: true, count: importReadyRows.length } })

            setIsImportModalOpen(false)
            setImportStep(1)
            setImportPreview([])
            setImportIssues([])
            setImportFileName('')
            setImportRawData([])
            setImportFileHeaders([])
            setImportColumnMapping({})
            fetchData()
        } catch { addToast('Gagal import (cek constraint DB)', 'error') }
        finally { setImporting(false) }
    }

    const isAnyModalOpen = isModalOpen || isDeleteModalOpen || isBulkDeleteOpen || isExportModalOpen || isImportModalOpen || isArchivedModalOpen

    return (
        <DashboardLayout title="Data Kelas" hideHeader={isAnyModalOpen} hideSidebar={isAnyModalOpen}>
            <style>{isAnyModalOpen ? ` .top-nav, .sidebar, .floating-dock { display: none !important; } main { padding-top: 0 !important; } ` : ''}</style>
            <div className="p-4 md:p-6 space-y-4 max-w-[1800px] mx-auto">

                {/* Read-only Banner */}
                {!canEdit && (
                    <div className="px-4 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-2">
                        <FontAwesomeIcon icon={faEyeSlash} className="text-rose-500 shrink-0 text-xs" />
                        <p className="text-[11px] font-bold text-rose-600">Mode Read-only — Edit data kelas dinonaktifkan oleh administrator.</p>
                    </div>
                )}

                {/* Bulk Action Bar */}
                {selectedIds.length > 0 && (
                    <div className="mb-4 px-4 py-3 rounded-2xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 flex items-center justify-between gap-3 flex-wrap animate-in slide-in-from-top-2">
                        <p className="text-sm font-black text-[var(--color-primary)] tracking-tight">{selectedIds.length} kelas dipilih</p>
                        <div className="flex items-center gap-2 flex-wrap">
                            <button onClick={() => setIsBulkDeleteOpen(true)} className="h-8 px-4 rounded-xl bg-red-500/10 text-red-600 text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all flex items-center gap-2"><FontAwesomeIcon icon={faTrash} /> Hapus</button>
                            <button onClick={() => setSelectedIds([])} className="h-8 px-4 rounded-xl bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] text-[10px] font-black uppercase tracking-widest hover:text-[var(--color-text)] transition-all flex items-center gap-2"><FontAwesomeIcon icon={faXmark} /> Batal</button>
                        </div>
                    </div>
                )}

                {/* ── Header ── */}
                <PageHeader
                    badge="Master Data"
                    breadcrumbs={['Class Management']}
                    title="Data Kelas"
                    subtitle={`Kelola ${stats.total} data kelas dalam sistem.`}
                    actions={
                        <>
                        {/* Header Menu Button */}
                        <button
                            ref={headerMenuBtnRef}
                            onClick={() => { if (!isHeaderMenuOpen) setHeaderMenuRect(headerMenuBtnRef.current?.getBoundingClientRect()); setIsHeaderMenuOpen(v => !v) }}
                            className={`h-9 w-9 rounded-lg border flex items-center justify-center text-sm transition-all active:scale-95 ${isHeaderMenuOpen ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)]/30 text-[var(--color-primary)]' : 'bg-[var(--color-surface-alt)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-border)]'}`}
                            title="Aksi lainnya"
                        >
                            <FontAwesomeIcon icon={faSliders} />
                        </button>

                        {/* Portaled Header Menu Dropdown */}
                        {headerMenuMounted && headerMenuRect && createPortal(
                            <>
                                <div
                                    className={`fixed inset-0 z-[9990] bg-black/5 backdrop-blur-[1px] transition-opacity duration-200 ${isHeaderMenuOpen ? 'opacity-100' : 'opacity-0'}`}
                                    onClick={() => setIsHeaderMenuOpen(false)}
                                />
                                <div
                                    className={`fixed z-[9991] w-56 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl p-2 transition-all duration-200 ease-out origin-top-right
                                        ${isHeaderMenuOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-2'}`}
                                    style={{
                                        top: headerMenuRect.bottom + 8,
                                        left: Math.max(10, headerMenuRect.right - 224)
                                    }}
                                >
                                    <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] px-3 py-2">Data</p>
                                    <button onClick={() => { setIsHeaderMenuOpen(false); setImportStep(1); setImportPreview([]); setImportFileName(''); setIsImportModalOpen(true) }}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--color-surface-alt)] text-[var(--color-text)] transition-all group">
                                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <FontAwesomeIcon icon={faFileImport} className="text-xs" />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-[11px] font-black leading-tight">Import CSV / Excel</p>
                                            <p className="text-[9px] opacity-60 font-medium leading-tight mt-0.5">Unggah data kelas masal dari file Excel/CSV</p>
                                        </div>
                                    </button>
                                    <button onClick={() => { setIsHeaderMenuOpen(false); setIsExportModalOpen(true) }}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--color-surface-alt)] text-[var(--color-text)] transition-all group">
                                        <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <FontAwesomeIcon icon={faFileExport} className="text-xs" />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-[11px] font-black leading-tight">Export Data</p>
                                            <p className="text-[9px] opacity-60 font-medium leading-tight mt-0.5">Cadangkan seluruh database ke format Excel</p>
                                        </div>
                                    </button>
                                    <div className="h-px bg-[var(--color-border)] my-1 mx-2" />
                                    <p className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Manajemen</p>
                                    <button onClick={() => { setIsHeaderMenuOpen(false); fetchArchived(); setIsArchivedModalOpen(true) }}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--color-surface-alt)] text-[var(--color-text)] transition-all group">
                                        <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <FontAwesomeIcon icon={faBoxArchive} className="text-xs" />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-[11px] font-black leading-tight">Arsip Kelas</p>
                                            <p className="text-[9px] opacity-60 font-medium leading-tight mt-0.5">Lihat & pulihkan data kelas tidak aktif</p>
                                        </div>
                                    </button>
                                </div>
                            </>,
                            getPortalContainer('portal-class-header-menu')
                        )}

                        {/* Keyboard Shortcuts Button - hidden on mobile */}
                        <button
                            ref={shortcutBtnRef}
                            onClick={() => { if (!isShortcutOpen) setShortcutRect(shortcutBtnRef.current?.getBoundingClientRect()); setIsShortcutOpen(v => !v) }}
                            className={`hidden sm:flex h-9 w-9 rounded-lg border items-center justify-center transition-all active:scale-95
                                ${isShortcutOpen
                                    ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)]/30 text-[var(--color-primary)]'
                                    : 'bg-[var(--color-surface-alt)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                                }`}
                            title="Keyboard Shortcuts (?)"
                        >
                            <FontAwesomeIcon icon={faKeyboard} className="text-sm" />
                        </button>

                        {/* Portaled Keyboard Shortcuts Dropdown */}
                        {isShortcutOpen && shortcutRect && createPortal(
                            <>
                                <div className="fixed inset-0 z-[9990] bg-black/5 backdrop-blur-[1px]" onClick={() => setIsShortcutOpen(false)} />
                                <div
                                    className="fixed z-[9991] w-72 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl shadow-black/10 overflow-hidden text-left animate-in fade-in zoom-in-95 duration-200"
                                    style={{
                                        top: shortcutRect.bottom + 8,
                                        left: Math.max(10, shortcutRect.right - 288)
                                    }}
                                >
                                    <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between">
                                        <p className="text-[11px] font-black uppercase tracking-widest text-[var(--color-text)]">Keyboard Shortcuts</p>
                                        <span className="text-[9px] text-[var(--color-text-muted)] font-bold">Tekan ? untuk toggle</span>
                                    </div>
                                    <div className="p-3 space-y-0.5">
                                        {[
                                            { section: 'Navigasi' },
                                            { keys: ['Ctrl', 'K'], label: 'Fokus ke search' },
                                            { keys: ['Ctrl', 'F'], label: 'Toggle filter lanjutan' },
                                            { keys: ['Esc'], label: 'Tutup / clear / deselect' },
                                            { section: 'Aksi' },
                                            { keys: ['N'], label: 'Tambah kelas baru' },
                                            { keys: ['Ctrl', 'A'], label: 'Pilih semua / deselect' },
                                            { keys: ['Ctrl', 'E'], label: 'Buka export' },
                                            { section: 'Tampilan' },
                                            { keys: ['P'], label: 'Toggle privacy mode' },
                                            { keys: ['R'], label: 'Refresh data' },
                                            { keys: ['X'], label: 'Reset semua filter' },
                                            { keys: ['?'], label: 'Tampilkan shortcut ini' },
                                        ].map((item, i) => item.section ? (
                                            <p key={i} className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] pt-2 pb-1 px-1">{item.section}</p>
                                        ) : (
                                            <div key={i} className="flex items-center justify-between px-1 py-1 rounded-lg hover:bg-[var(--color-surface-alt)] transition-all">
                                                <span className="text-[11px] font-semibold text-[var(--color-text)]">{item.label}</span>
                                                <div className="flex items-center gap-1">
                                                    {item.keys.map((k, ki) => (
                                                        <span key={ki} className="px-1.5 py-0.5 rounded-md bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[9px] font-black text-[var(--color-text-muted)] font-mono">{k}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </>,
                            getPortalContainer('portal-class-shortcut-menu')
                        )}

                        <input
                            type="file"
                            ref={importFileRef}
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) processImportFile(file);
                                e.target.value = '';
                            }}
                            className="hidden"
                            accept=".csv,.xlsx"
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
                            <FontAwesomeIcon icon={isPrivacyMode ? faEyeSlash : faEye} className="text-sm" />
                            <span className="text-[10px] font-black uppercase tracking-widest hidden md:inline">
                                Privasi
                            </span>
                        </button>

                        {/* Add button */}
                        <button onClick={handleAdd} disabled={!canEdit} className="h-9 px-4 sm:px-5 rounded-xl bg-[var(--color-primary)] text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-95 shadow-md shadow-[var(--color-primary)]/20 disabled:opacity-40 disabled:cursor-not-allowed border border-white/10">
                            <FontAwesomeIcon icon={faPlus} className="text-[10px]" />
                            <span>{canEdit ? 'Tambah Kelas' : 'Read-only'}</span>
                        </button>
                        </>
                    }
                />

                {/* ── Stats ── */}
                <StatsCarousel count={STAT_CARD_COUNT} cols={4}>
                    {[
                        { icon: faSchool, label: 'Total Kelas', value: stats.total, borderColor: 'border-t-[var(--color-primary)]', iconBg: 'bg-gradient-to-br from-[var(--color-primary)]/10 to-[var(--color-accent)]/10 text-[var(--color-primary)]', onClick: () => { setFilterProgram(''); setFilterLevel(''); setPage(1) } },
                        { icon: faBed, label: 'Boarding', value: stats.boarding, borderColor: 'border-t-amber-500', iconBg: 'bg-amber-500/10 text-amber-500', onClick: () => { setFilterProgram('Boarding'); setPage(1) } },
                        { icon: faBuilding, label: 'Reguler', value: stats.reguler, borderColor: 'border-t-emerald-500', iconBg: 'bg-emerald-500/10 text-emerald-500', onClick: () => { setFilterProgram('Reguler'); setPage(1) } },
                        { icon: faUsers, label: 'Total Siswa', value: stats.totalStudents, borderColor: 'border-t-pink-500', iconBg: 'bg-pink-500/10 text-pink-500', onClick: () => { setFilterCrowded(true); setPage(1) } },
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
                                    <FontAwesomeIcon icon={ins.icon} className={`text-[10px] ${ins.active ? 'text-white' : ins.iconColor}`} />
                                </div>
                                <div className="text-left whitespace-nowrap">
                                    <p className={`text-[10px] font-black leading-none ${ins.color}`}>{ins.label}</p>
                                    <p className="text-[9px] text-[var(--color-text-muted)] font-bold mt-0.5">{ins.desc}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                )}

                {/* ── Filter Bar ── */}
                <div className="glass rounded-[1.5rem] mb-4 border border-[var(--color-border)] overflow-hidden">
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

                            {/* Group 1: Program */}
                            <div className="flex items-center gap-1.5 shrink-0">
                                {[
                                    { id: '', label: 'Semua', icon: faSchool },
                                    { id: 'Boarding', label: 'Boarding', icon: faBed, activeCls: 'bg-amber-500 border-amber-500' },
                                    { id: 'Reguler', label: 'Reguler', icon: faBuilding, activeCls: 'bg-emerald-500 border-emerald-500' },
                                ].map((s) => (
                                    <button
                                        key={s.id}
                                        onClick={() => { setFilterProgram(s.id); setPage(1) }}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border ${filterProgram === s.id
                                            ? `${s.activeCls || 'bg-[var(--color-primary)] border-[var(--color-primary)]'} text-white`
                                            : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)]/30 hover:bg-[var(--color-primary)]/5 hover:text-[var(--color-primary)]'
                                            }`}
                                    >
                                        <FontAwesomeIcon icon={s.icon} className={`text-[10px] ${filterProgram === s.id ? 'opacity-100' : 'opacity-30'}`} />
                                        {s.label}
                                    </button>
                                ))}
                            </div>

                            {/* Separator */}
                            <div className="h-4 w-px bg-[var(--color-border)] mx-1 shrink-0" />

                            {/* Group 2: Filter Cepat */}
                            <div className="flex items-center gap-1.5 shrink-0">
                                {[
                                    { id: 'no_teacher', label: 'Tanpa Wali', icon: faUserTie, active: filterNoTeacher, onClick: () => { setFilterNoTeacher(!filterNoTeacher); setPage(1) }, activeCls: 'bg-amber-500 border-amber-500' },
                                    { id: 'crowded', label: 'Padat (>35)', icon: faUsers, active: filterCrowded, onClick: () => { setFilterCrowded(!filterCrowded); setPage(1) }, activeCls: 'bg-blue-500 border-blue-500' },
                                ].map((g) => (
                                    <button
                                        key={g.id}
                                        onClick={g.onClick}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border ${g.active
                                            ? `${g.activeCls} text-white`
                                            : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)]/30 hover:bg-[var(--color-primary)]/5 hover:text-[var(--color-primary)]'
                                            }`}
                                    >
                                        <FontAwesomeIcon icon={g.icon} className={`text-[10px] ${g.active ? 'opacity-100' : 'opacity-30'}`} />
                                        {g.label}
                                    </button>
                                ))}
                            </div>

                            {/* Separator */}
                            <div className="h-4 w-px bg-[var(--color-border)] mx-1 shrink-0" />

                            {/* Group 3: Quick Sort */}
                            <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                    onClick={() => { setSortBy(sortBy === 'name' ? 'level' : sortBy === 'level' ? 'students' : 'name'); setPage(1) }}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border ${sortBy !== 'name'
                                        ? 'bg-amber-500 border-amber-500 text-white'
                                        : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-amber-500/30 hover:bg-amber-500/5 hover:text-amber-600'
                                        }`}
                                >
                                    <FontAwesomeIcon icon={faSortAlphaDown} className={`text-[10px] ${sortBy !== 'name' ? 'opacity-100' : 'opacity-30'}`} />
                                    Urutkan: {sortBy === 'name' ? 'Nama A-Z' : sortBy === 'level' ? 'Tingkat' : 'Siswa Terbanyak'}
                                </button>
                            </div>
                        </div>

                        {/* Dedicated Divider for Enterprise Look */}
                        <div className="hidden lg:block w-px h-4 bg-[var(--color-border)] mx-2 shrink-0" />

                        {/* Action Buttons: Always visible, grouped nicely on mobile */}
                        <div className="flex items-center justify-end gap-2 shrink-0 lg:ml-auto">
                            <button
                                onClick={toggleSelectAll}
                                className={`h-9 px-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 ${selectedIds.length > 0 ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]'} `}
                                title="Pilih Semua / Batal"
                            >
                                <FontAwesomeIcon icon={selectedIds.length > 0 ? faCheckDouble : faSquareCheck} />
                                <span className="hidden xs:inline">{selectedIds.length > 0 ? 'Terpilih' : 'Pilih'}</span>
                                {selectedIds.length > 0 && (
                                    <span className="w-4 h-4 rounded-full bg-white/20 text-white text-[9px] font-black flex items-center justify-center">
                                        {selectedIds.length}
                                    </span>
                                )}
                            </button>

                            <button
                                onClick={() => setShowAdvFilter(!showAdvFilter)}
                                className={`h-9 px-3 sm:px-4 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${showAdvFilter || activeFilterCount > 0 ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white shadow-md shadow-[var(--color-primary)]/30' : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]'}`}
                            >
                                <FontAwesomeIcon icon={faSliders} />
                                <span className="hidden xs:inline">Filter</span>
                                {activeFilterCount > 0 && <span className="w-4 h-4 rounded-full bg-white/30 text-white text-[9px] font-black flex items-center justify-center">{activeFilterCount}</span>}
                            </button>
                        </div>
                    </div>

                    {/* Active Filter Chips */}
                    {(searchQuery || filterLevel || filterProgram || filterNoTeacher || filterCrowded) && (
                        <div className="px-3 pb-3 -mt-1">
                            <div className="flex flex-wrap gap-2">
                                {searchQuery && (
                                    <button type="button" onClick={() => setSearchQuery('')}
                                        className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/40 text-[10px] font-black text-[var(--color-text)]" title="Hapus pencarian">
                                        <FontAwesomeIcon icon={faSearch} className="text-[10px] opacity-60" />
                                        <span className="max-w-[180px] truncate">"{searchQuery}"</span>
                                        <span className="w-5 h-5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)] group-hover:text-red-500 transition-colors">
                                            <FontAwesomeIcon icon={faXmark} className="text-[10px]" />
                                        </span>
                                    </button>
                                )}
                                {filterLevel && (
                                    <button type="button" onClick={() => setFilterLevel('')}
                                        className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/5 text-[10px] font-black text-[var(--color-primary)]" title="Hapus filter tingkat">
                                        <span className="opacity-70">Kelas</span> {filterLevel}
                                        <span className="w-5 h-5 rounded-lg bg-white/70 dark:bg-[var(--color-surface)] border border-[var(--color-primary)]/20 flex items-center justify-center text-[var(--color-primary)] opacity-70 group-hover:opacity-100 transition-opacity">
                                            <FontAwesomeIcon icon={faXmark} className="text-[10px]" />
                                        </span>
                                    </button>
                                )}
                                {filterProgram && (
                                    <button type="button" onClick={() => setFilterProgram('')}
                                        className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/40 text-[10px] font-black text-[var(--color-text)]" title="Hapus filter program">
                                        {filterProgram}
                                        <span className="w-5 h-5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)] group-hover:text-red-500 transition-colors">
                                            <FontAwesomeIcon icon={faXmark} className="text-[10px]" />
                                        </span>
                                    </button>
                                )}
                                {filterNoTeacher && (
                                    <button type="button" onClick={() => setFilterNoTeacher(false)}
                                        className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-amber-500/20 bg-amber-500/10 text-[10px] font-black text-amber-600" title="Hapus filter tanpa wali">
                                        Tanpa Wali
                                        <span className="w-5 h-5 rounded-lg bg-white/70 dark:bg-[var(--color-surface)] border border-amber-500/20 flex items-center justify-center text-amber-600 opacity-70 group-hover:opacity-100 transition-opacity">
                                            <FontAwesomeIcon icon={faXmark} className="text-[10px]" />
                                        </span>
                                    </button>
                                )}
                                {filterCrowded && (
                                    <button type="button" onClick={() => setFilterCrowded(false)}
                                        className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-blue-500/20 bg-blue-500/10 text-[10px] font-black text-blue-600" title="Hapus filter kelas padat">
                                        Kelas Padat
                                        <span className="w-5 h-5 rounded-lg bg-white/70 dark:bg-[var(--color-surface)] border border-blue-500/20 flex items-center justify-center text-blue-600 opacity-70 group-hover:opacity-100 transition-opacity">
                                            <FontAwesomeIcon icon={faXmark} className="text-[10px]" />
                                        </span>
                                    </button>
                                )}
                                <button type="button" onClick={resetAllFilters}
                                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-red-500/20 bg-red-500/5 text-[10px] font-black text-red-600" title="Reset semua filter">
                                    <FontAwesomeIcon icon={faRotateLeft} className="text-[10px]" />
                                    Reset semua
                                </button>
                            </div>
                        </div>
                    )}

                    {showAdvFilter && (
                        <div className="border-t border-[var(--color-border)] p-3.5 bg-[var(--color-surface-alt)]/60 backdrop-blur-md animate-in fade-in slide-in-from-top-2">
                            {/* Header Panel with Standardized "Vertical Bar" Pattern */}
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-1 h-3.5 bg-indigo-500 rounded-full" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 flex items-center gap-2">
                                        <FontAwesomeIcon icon={faSliders} className="text-[9px] opacity-60" />
                                        Filter Lanjutan
                                    </span>
                                </div>
                                <button
                                    onClick={resetAllFilters}
                                    className="text-[9px] font-black uppercase tracking-widest text-red-500 hover:bg-red-50 px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 border border-transparent hover:border-red-100"
                                >
                                    <FontAwesomeIcon icon={faRotateLeft} className="text-[9px]" />
                                    Reset Semua Filter
                                </button>
                            </div>

                            <div className="grid grid-cols-1 xl:grid-cols-[1fr_auto] gap-4">
                                {/* Primary Grid: Selects */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div>
                                        <label className="block text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1.5">Tingkat / Grade</label>
                                        <RichSelect
                                            value={filterLevel}
                                            onChange={val => { setFilterLevel(val); setPage(1) }}
                                            options={[
                                                { id: '', name: 'Semua Tingkat' },
                                                ...LEVELS.map(l => ({ id: l, name: `Kelas ${l}` }))
                                            ]}
                                            placeholder="Semua Tingkat"
                                            small
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1.5">Program</label>
                                        <RichSelect
                                            value={filterProgram}
                                            onChange={val => { setFilterProgram(val); setPage(1) }}
                                            options={[
                                                { id: '', name: 'Semua Program' },
                                                ...PROGRAMS.map(p => ({ id: p, name: p }))
                                            ]}
                                            placeholder="Semua Program"
                                            small
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1.5">Urutkan</label>
                                        <RichSelect
                                            value={sortBy}
                                            onChange={val => { setSortBy(val); setPage(1) }}
                                            options={[
                                                { id: 'name', name: 'Nama (A-Z)' },
                                                { id: 'level', name: 'Tingkat' },
                                                { id: 'students', name: 'Populasi Siswa' }
                                            ]}
                                            placeholder="Urutkan"
                                            small
                                        />
                                    </div>
                                </div>

                                {/* Secondary Grid: Quick Filters */}
                                <div>
                                    <label className="block text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1.5">Menu Cepat & Aksi</label>
                                    <div className="flex gap-1.5 overflow-x-auto pb-1">
                                        {[
                                            { label: 'Semua', icon: faSchool, active: !filterNoTeacher && !filterCrowded, onClick: () => { setFilterNoTeacher(false); setFilterCrowded(false); setSortBy('name') } },
                                            { label: 'Tanpa Wali', icon: faUserTie, active: filterNoTeacher, onClick: () => { setFilterNoTeacher(true); setFilterCrowded(false); setPage(1) } },
                                            { label: 'Kelas Padat', icon: faUsers, active: filterCrowded, onClick: () => { setFilterCrowded(true); setFilterNoTeacher(false); setPage(1) } },
                                        ].map((s, i) => (
                                            <button key={i} onClick={s.onClick} className={`whitespace-nowrap h-9 px-3 rounded-xl border flex items-center gap-2 transition-all ${s.active ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-md shadow-[var(--color-primary)]/20' : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]'}`}>
                                                <FontAwesomeIcon icon={s.icon} className="text-[10px]" /><span className="text-[9px] font-black uppercase tracking-widest">{s.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Main Content Area */}
                <div className="glass rounded-[1.5rem] border border-[var(--color-border)] overflow-hidden min-h-[400px]">
                    {loading ? (
                        <div className="p-6 space-y-4"><div className="hidden md:block"><TableSkeleton rows={8} cols={7} /></div><div className="md:hidden"><CardSkeleton count={4} /></div></div>
                    ) : (
                        <>
                            <div className="overflow-x-auto whitespace-nowrap hidden md:block">
                                <table className="w-full text-left border-collapse text-sm">
                                    <thead className="bg-[var(--color-surface-alt)] sticky top-0 z-10 border-b border-[var(--color-border)]">
                                        <tr className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">
                                            <th className="px-6 py-4 w-12 text-center">
                                                <input type="checkbox" checked={allSelected} ref={el => { if (el) el.indeterminate = someSelected }} onChange={toggleSelectAll} className="w-4 h-4 rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)] accent-[var(--color-primary)] cursor-pointer" />
                                            </th>
                                            <th className="px-6 py-4">Identitas Kelas</th>
                                            {visibleCols.level && <th className="px-6 py-4 text-center">Level</th>}
                                            {visibleCols.program && <th className="px-6 py-4 text-center">Program</th>}
                                            {visibleCols.gender && <th className="px-6 py-4 text-center">Gender</th>}
                                            {visibleCols.teacher && <th className="px-6 py-4">Wali Kelas</th>}
                                            {visibleCols.students && <th className="px-6 py-4 text-center">Siswa</th>}
                                            {visibleCols.year && <th className="px-6 py-4 text-center">Akademik</th>}
                                            <th className="px-6 py-4 text-center pr-6 w-32 relative">
                                                <div className="flex items-center justify-center">
                                                    <span>Aksi</span>
                                                </div>
                                                {/* Toggle Button — absolute kanan */}
                                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                    <button onClick={(e) => {
                                                        const rect = e.currentTarget.getBoundingClientRect()
                                                        const menuHeight = 280
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
                                                        <div className={`absolute z-[9999] w-48 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl shadow-black/10 p-2 space-y-0.5 animate-in fade-in zoom-in-95 ${menuPos.showUp ? 'slide-in-from-bottom-2' : 'slide-in-from-top-2'}`}
                                                            style={{ top: menuPos.top, right: menuPos.right }}>
                                                            <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] px-3 py-2">Atur Kolom</p>
                                                            {[{ key: 'level', label: 'Tingkat' }, { key: 'program', label: 'Program Studi' }, { key: 'gender', label: 'Gender / Tipe' }, { key: 'teacher', label: 'Wali Kelas' }, { key: 'students', label: 'Jumlah Siswa' }, { key: 'year', label: 'Tahun Akademik' }].map(({ key, label }) => (
                                                                <button key={key} onClick={() => toggleColumn(key)} className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-[var(--color-surface-alt)] transition-all group text-left">
                                                                    <span className="text-[11px] font-bold text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition-colors">{label}</span>
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
                                        {totalFilteredRows === 0 ? (
                                            <tr>
                                                <td colSpan={10} className="px-6 py-28 text-center align-middle">
                                                    <div className="w-full h-full flex flex-col items-center justify-center text-center mx-auto animate-in fade-in zoom-in-95 duration-700">
                                                        <div className="relative mb-6">
                                                            <div className="absolute inset-0 bg-[var(--color-primary)]/10 blur-3xl rounded-full scale-150 animate-pulse" />
                                                            <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-[var(--color-surface)] to-[var(--color-surface-alt)] border border-[var(--color-border)] shadow-xl flex items-center justify-center">
                                                                <FontAwesomeIcon icon={faSearch} className="text-4xl text-[var(--color-primary)]/30" />
                                                                <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-2xl bg-[var(--color-surface)] shadow-lg flex items-center justify-center border border-[var(--color-border)]">
                                                                    <FontAwesomeIcon icon={faXmark} className="text-red-500 text-sm" />
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <h3 className="text-base font-black text-[var(--color-text)] mb-2">Pencarian Tidak Ditemukan</h3>
                                                        <p className="text-xs font-bold text-[var(--color-text-muted)] max-w-sm leading-relaxed mb-6">
                                                            Tidak ditemukan kelas yang cocok dengan filter atau database masih kosong.
                                                        </p>
                                                        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 mb-4">
                                                            {searchQuery || filterLevel || filterProgram || filterNoTeacher || filterCrowded ? (
                                                                <button
                                                                    onClick={resetAllFilters}
                                                                    className="h-9 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest border border-[var(--color-border)] hover:bg-[var(--color-surface-alt)] transition"
                                                                >
                                                                    Reset Semua Filter
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    onClick={handleAdd}
                                                                    disabled={!canEdit}
                                                                    className="h-9 px-5 rounded-xl bg-[var(--color-primary)] text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-[var(--color-primary)]/20 hover:brightness-110 transition-all flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                                                                >
                                                                    <FontAwesomeIcon icon={faPlus} />
                                                                    Tambah Kelas Pertama
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : pagedClasses.map(cls => (
                                            <ClassRow key={cls.id} cls={cls} selectedIds={selectedIds} toggleSelect={toggleSelect} visibleCols={visibleCols} handleEdit={canEdit ? handleEdit : null} setItemToDelete={canEdit ? setItemToDelete : null} setIsDeleteModalOpen={canEdit ? setIsDeleteModalOpen : null} isPrivacyMode={isPrivacyMode} />
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="md:hidden divide-y divide-[var(--color-border)]">
                                {totalFilteredRows === 0 ? (
                                    <div className="py-24 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in-95 duration-700">
                                        <div className="relative mb-6">
                                            <div className="absolute inset-0 bg-[var(--color-primary)]/10 blur-3xl rounded-full scale-150 animate-pulse" />
                                            <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-[var(--color-surface)] to-[var(--color-surface-alt)] border border-[var(--color-border)] shadow-xl flex items-center justify-center">
                                                <FontAwesomeIcon icon={faSearch} className="text-4xl text-[var(--color-primary)]/30" />
                                                <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-2xl bg-[var(--color-surface)] shadow-lg flex items-center justify-center border border-[var(--color-border)]">
                                                    <FontAwesomeIcon icon={faXmark} className="text-red-500 text-sm" />
                                                </div>
                                            </div>
                                        </div>
                                        <h3 className="text-lg font-black text-[var(--color-text)] mb-2">Pencarian Tidak Ditemukan</h3>
                                        <p className="text-xs font-bold text-[var(--color-text-muted)] max-w-[280px] leading-relaxed mb-6">
                                            Tidak ditemukan kelas yang cocok dengan filter atau database masih kosong.
                                        </p>
                                        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 mb-4">
                                            {searchQuery || filterLevel || filterProgram || filterNoTeacher || filterCrowded ? (
                                                <button
                                                    onClick={resetAllFilters}
                                                    className="h-9 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest border border-[var(--color-border)] hover:bg-[var(--color-surface-alt)] transition"
                                                >
                                                    Reset Semua Filter
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={handleAdd}
                                                    disabled={!canEdit}
                                                    className="h-9 px-5 rounded-xl bg-[var(--color-primary)] text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-[var(--color-primary)]/20 hover:brightness-110 transition-all flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                                                >
                                                    <FontAwesomeIcon icon={faPlus} />
                                                    Tambah Kelas Pertama
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ) : pagedClasses.map(cls => (
                                    <ClassMobileCard key={cls.id} cls={cls} selectedIds={selectedIds} toggleSelect={toggleSelect} handleEdit={canEdit ? handleEdit : null} setItemToDelete={canEdit ? setItemToDelete : null} setIsDeleteModalOpen={canEdit ? setIsDeleteModalOpen : null} />
                                ))}
                            </div>
                            <Pagination
                                totalRows={totalFilteredRows}
                                page={page}
                                pageSize={pageSize}
                                setPage={setPage}
                                setPageSize={setPageSize}
                                label="kelas"
                                jumpPage={jumpPage}
                                setJumpPage={setJumpPage}
                            />
                        </>
                    )}
                </div>

                {/* Modals */}
                <ClassFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} selectedItem={selectedItem} teachersList={teachersList} academicYearsList={academicYearsList} onSubmit={handleSubmit} submitting={submitting} />

                {/* Delete Modal */}
                <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Hapus Kelas" size="sm">
                    <div className="space-y-6">
                        <div className="p-4 bg-red-500/10 rounded-2xl flex items-center gap-4 text-red-500 border border-red-500/20 shadow-inner">
                            <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center shrink-0 text-xl border border-red-500/30 animate-pulse"><FontAwesomeIcon icon={faTrash} /></div>
                            <div className="min-w-0"><h3 className="text-sm font-black uppercase tracking-wider">Konfirmasi Hapus</h3><p className="text-[10px] font-bold opacity-70 mt-1 uppercase tracking-widest">Penghapusan tidak dapat dibatalkan.</p></div>
                        </div>
                        <p className="text-xs text-[var(--color-text)] leading-relaxed font-bold px-1">Yakin menghapus kelas <span className="text-red-500 font-black px-1.5 py-0.5 bg-red-500/10 rounded-md border border-red-500/20">{itemToDelete?.name}</span>? <span className="text-[10px] text-[var(--color-text-muted)] mt-2 block opacity-60">Siswa yang terdaftar akan kehilangan referensi kelas.</span></p>
                        <div className="flex gap-3 pt-2">
                            <button onClick={() => setIsDeleteModalOpen(false)} className="h-11 flex-1 rounded-xl bg-[var(--color-surface-alt)] hover:bg-[var(--color-border)] text-[var(--color-text)] font-black text-[10px] uppercase tracking-widest transition-all">BATAL</button>
                            <button onClick={handleDeleteConfirm} disabled={submitting} className="h-11 flex-[1.5] rounded-xl bg-red-500 hover:bg-red-600 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-red-500/20 transition-all">{submitting ? <FontAwesomeIcon icon={faSpinner} className="fa-spin" /> : 'HAPUS PERMANEN'}</button>
                        </div>
                    </div>
                </Modal>

                {/* Bulk Delete Modal */}
                <Modal isOpen={isBulkDeleteOpen} onClose={() => setIsBulkDeleteOpen(false)} title="Hapus Massal Kelas" size="sm">
                    <div className="space-y-6">
                        <div className="p-4 bg-red-500/10 rounded-2xl flex items-center gap-4 text-red-500 border border-red-500/20 shadow-inner">
                            <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center shrink-0 text-xl border border-red-500/30 animate-pulse"><FontAwesomeIcon icon={faTrash} /></div>
                            <div className="min-w-0"><h3 className="text-sm font-black uppercase tracking-wider">Konfirmasi Hapus Massal</h3><p className="text-[10px] font-bold opacity-70 mt-1 uppercase tracking-widest">{selectedIds.length} kelas akan dihapus permanen.</p></div>
                        </div>
                        <p className="text-xs text-[var(--color-text)] leading-relaxed font-bold px-1">Yakin menghapus <span className="text-red-500 font-black px-1.5 py-0.5 bg-red-500/10 rounded-md border border-red-500/20">{selectedIds.length} kelas</span>? <span className="text-[10px] text-[var(--color-text-muted)] mt-2 block opacity-60">Penghapusan tidak dapat dibatalkan.</span></p>
                        <div className="flex gap-3 pt-2">
                            <button onClick={() => setIsBulkDeleteOpen(false)} className="h-11 flex-1 rounded-xl bg-[var(--color-surface-alt)] hover:bg-[var(--color-border)] text-[var(--color-text)] font-black text-[10px] uppercase tracking-widest transition-all">BATAL</button>
                            <button onClick={handleBulkDelete} disabled={submitting} className="h-11 flex-[1.5] rounded-xl bg-red-500 hover:bg-red-600 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-red-500/20 transition-all">{submitting ? <FontAwesomeIcon icon={faSpinner} className="fa-spin" /> : 'HAPUS SEMUA'}</button>
                        </div>
                    </div>
                </Modal>

                {/* Export Modal */}
                <ClassExportModal
                    isOpen={isExportModalOpen}
                    onClose={() => setIsExportModalOpen(false)}
                    classes={classes}
                    selectedClassIds={selectedIds}
                    exportScope={exportScope}
                    setExportScope={setExportScope}
                    exportColumns={exportColumns}
                    setExportColumns={setExportColumns}
                    exporting={exporting}
                    handleExportCSV={handleExportCSV}
                    handleExportExcel={handleExportExcel}
                    handleExportPDF={handleExportPDF}
                />

                {/* Arsip Kelas Modal */}
                <ClassArchiveModal
                    isOpen={isArchivedModalOpen}
                    onClose={() => setIsArchivedModalOpen(false)}
                    archivedClasses={archivedClasses}
                    handleRestore={handleRestore}
                    handlePermanentDelete={handlePermanentDelete}
                />

                {/* ── Import Modal ── */}
                {/* ── Import Modal ── */}
                <ClassImportModal
                    isOpen={isImportModalOpen}
                    onClose={() => setIsImportModalOpen(false)}
                    importing={importing}
                    importStep={importStep}
                    setImportStep={setImportStep}
                    importPreview={importPreview}
                    importFileName={importFileName}
                    importDragOver={importDragOver}
                    setImportDragOver={setImportDragOver}
                    processImportFile={processImportFile}
                    teachersList={teachersList}
                    academicYearsList={academicYearsList}
                    handleDownloadTemplate={handleDownloadTemplate}
                    importFileHeaders={importFileHeaders}
                    SYSTEM_COLS={SYSTEM_COLS}
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
                    handleImportClick={handleImportClick}
                    hasImportBlockingErrors={hasImportBlockingErrors}
                    importReadyRows={importReadyRows}
                    handleImportCellEdit={handleImportCellEdit}
                    importEditCell={importEditCell}
                    setImportEditCell={setImportEditCell}
                    handleRemoveImportRow={handleRemoveImportRow}
                    importSkipDupes={importSkipDupes}
                    setImportSkipDupes={setImportSkipDupes}
                    handleBulkFix={handleBulkFix}
                />

            </div>
        </DashboardLayout>
    )
}