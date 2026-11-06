import { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react'
import { createPortal } from 'react-dom'
import {
    Archive, ArrowDownAZ, Bed, Briefcase, Building, CheckCheck, Eye, EyeOff,
    FileInput, FileOutput, Keyboard, LoaderCircle, Plus, RefreshCw, RotateCcw, School,
    Search, SlidersHorizontal, SquareCheck, Trash2, Users, X
} from 'lucide-react'
import { usePageShortcuts } from '@shared/hooks/usePageShortcuts'
import ShortcutsModal from '@shared/components/ShortcutsModal'

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

// Library for Export/Import — xlsx & papaparse di-load dinamis saat aksi berjalan

// Components
import { ClassRow, ClassMobileCard } from '@features/classes/components/ClassRow'
import FormModal from '@features/classes/components/FormModal'
import ArchiveModal from '@features/classes/components/ArchiveModal'
import ImportDataModal from '@shared/components/import-export/ImportDataModal'
import ExportDataModal from '@shared/components/import-export/ExportDataModal'
import { SYSTEM_COLS, buildImportConfig, EXPORT_CONFIG, LEVELS, PROGRAMS } from '@features/classes/components/importExportConfig'
import { useImportExportCore } from '@shared/hooks/useImportExportCore'
import Pagination from '@shared/components/Pagination'


const LS_FILTERS = 'classes_filters'
const LS_COLS = 'classes_columns'
const LS_PAGE_SIZE = 'classes_page_size'

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

    // Konfigurasi modal import (butuh daftar guru & tahun ajaran untuk kolom entity)
    const importConfig = useMemo(
        () => buildImportConfig({ teachersList, academicYearsList }),
        [teachersList, academicYearsList]
    )

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
    const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false)

    // Pagination
    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(() => {
        try { return Number(localStorage.getItem(LS_PAGE_SIZE)) || 10 } catch { return 10 }
    })
    const [jumpPage, setJumpPage] = useState('')

    // Refs
    const searchInputRef = useRef(null)
    const headerMenuRef = useRef(null)
    const colMenuRef = useRef(null)

    // Sticky portal refs & rects for header menu dropdown
    const headerMenuBtnRef = useRef(null)
    const [headerMenuRect, setHeaderMenuRect] = useState(null)
    const [headerMenuMounted, setHeaderMenuMounted] = useState(false)

    // Selection
    const [selectedIds, setSelectedIds] = useState([])

    // Modals
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
    const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false)

    const [isArchivedModalOpen, setIsArchivedModalOpen] = useState(false)
    const [selectedItem, setSelectedItem] = useState(null)
    const [itemToDelete, setItemToDelete] = useState(null)

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
        }
        document.addEventListener('mousedown', h)
        return () => document.removeEventListener('mousedown', h)
    }, [])

    // ── computed ──────────────────────────────────────────────────────────────
    const activeFilterCount = (filterLevel ? 1 : 0) + (filterProgram ? 1 : 0) + (filterNoTeacher ? 1 : 0) + (filterCrowded ? 1 : 0)
    const hasActiveFilters = !!(searchQuery || activeFilterCount)
    const resetAllFilters = () => { setSearchQuery(''); setFilterLevel(''); setFilterProgram(''); setFilterNoTeacher(false); setFilterCrowded(false); setPage(1) }

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
            icon: Briefcase,
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
            icon: School,
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

    // ── Import/Export (mesin generik useImportExportCore) ───────────────────
    const getExportData = async (scope = 'filtered', cols = []) => {
        let q = supabase.from('classes').select('name, grade, major, homeroom_teacher_id, academic_year_id, students(count)').order('name')
        if (scope === 'filtered') {
            if (filterLevel) q = q.eq('grade', filterLevel)
            if (filterProgram) q = q.ilike('major', `%${filterProgram}%`)
        } else if (scope === 'selected') {
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
            cols.forEach(key => {
                const col = ALL_EXPORT_COLUMNS.find(x => x.key === key)
                if (col) row[col.label] = col.fn(enriched)
            })
            return row
        })
    }

    const validatePreview = (preview) => {
        const issues = []
        const dupeIndices = []
        const validated = preview.map((row, i) => {
            const rowIssues = []
            if (!row.name) rowIssues.push('Nama Kelas tidak boleh kosong')
            if (!row.grade) rowIssues.push('Tingkat tidak boleh kosong')
            else if (!LEVELS.includes(row.grade)) rowIssues.push(`Tingkat "${row.grade}" tidak valid. (Gunakan: ${LEVELS.join(', ')})`)

            if (row.program && !PROGRAMS.includes(row.program)) rowIssues.push(`Program "${row.program}" tidak dikenali (Gunakan: Boarding/Reguler)`)
            if (row.teacher && !row.homeroom_teacher_id) rowIssues.push(`Wali Kelas "${row.teacher}" tidak ditemukan, akan dikosongkan`)
            if (row.year && !row.academic_year_id) rowIssues.push(`Tahun Ajaran "${row.year}" tidak ditemukan, akan dikosongkan`)

            if (row.name && preview.slice(0, i).some(p => (p.name || '').toLowerCase() === row.name.toLowerCase())) {
                rowIssues.push(`Nama Kelas "${row.name}" duplikat dalam file`)
                row._isDupe = true
                dupeIndices.push(i)
            }

            if (rowIssues.length) {
                const isError = rowIssues.some(msg => msg.includes('tidak boleh kosong') || msg.includes('tidak valid'))
                issues.push({ row: i + 2, level: row._isDupe ? 'dupe' : (isError ? 'error' : 'warn'), messages: rowIssues })
                if (isError) row._hasError = true
                else if (row._isDupe) row._hasError = false // duplikat ditangani terpisah
                else row._hasWarn = true
            }
            return row
        })
        return { validated, issues, dupeIndices }
    }

    const importExport = useImportExportCore({
        systemCols: SYSTEM_COLS,
        addToast,
        table: 'classes',
        messages: {
            hasErrors: 'Masih ada ERROR. Perbaiki file dulu.',
            noValidRows: 'Tidak ada baris valid untuk diimport',
            commitSuccess: (n) => `Berhasil import ${n} kelas`,
            commitFailed: () => 'Gagal import (cek constraint DB)',
        },
        buildPreview: async (raw, mapping) => {
            const teacherByName = Object.fromEntries(teachersList.map(t => [t.name.toLowerCase().trim(), t.id]))
            const yearByLabel = Object.fromEntries(academicYearsList.map(y => [y.label.toLowerCase().trim(), y.id]))

            const preview = raw.map((row, i) => {
                const data = {}
                SYSTEM_COLS.forEach(sys => {
                    const fileCol = mapping[sys.key]
                    data[sys.key] = fileCol ? (row[fileCol] || '').toString().trim() : ''
                })

                // Normalisasi
                const { name, grade, program, gender_type, teacher, year } = data

                let homeroom_teacher_id = null
                if (teacher) homeroom_teacher_id = teacherByName[teacher.toLowerCase()] || null

                let academic_year_id = null
                if (year) academic_year_id = yearByLabel[year.toLowerCase()] || null

                // major = gabungan program + tipe gender
                let gType = gender_type.toUpperCase().trim()
                if (['L', 'LAKI-LAKI', 'LAKI LAKI', 'MALE', 'PUTRA'].includes(gType)) gType = 'Putra'
                else if (['P', 'PEREMPUAN', 'FEMALE', 'PUTRI'].includes(gType)) gType = 'Putri'
                else gType = gender_type

                const major = [program, gType].filter(Boolean).join(' ') || null

                return {
                    ...data,
                    grade: grade.toString(),
                    _row: i,
                    major,
                    homeroom_teacher_id,
                    academic_year_id,
                    _isDupe: false,
                    _hasError: false,
                    _hasWarn: false,
                }
            })
            return validatePreview(preview)
        },
        validate: validatePreview,
        resyncRow: (row) => {
            if (row.homeroom_teacher_id !== undefined) {
                row.teacher = teachersList.find(t => t.id === row.homeroom_teacher_id)?.name || ''
            }
            if (row.academic_year_id !== undefined) {
                row.year = academicYearsList.find(y => y.id === row.academic_year_id)?.label || ''
            }
            if (row.program !== undefined || row.gender_type !== undefined) {
                let gType = (row.gender_type || '').toUpperCase().trim()
                if (['L', 'LAKI-LAKI', 'LAKI LAKI', 'MALE', 'PUTRA'].includes(gType)) gType = 'Putra'
                else if (['P', 'PEREMPUAN', 'FEMALE', 'PUTRI'].includes(gType)) gType = 'Putri'
                else gType = row.gender_type
                row.major = [row.program, gType].filter(Boolean).join(' ') || null
            }
            return row
        },
        buildCommitRow: (r) => ({
            name: r.name,
            grade: r.grade,
            major: r.major || null,
            homeroom_teacher_id: r.homeroom_teacher_id || null,
            academic_year_id: r.academic_year_id || null,
        }),
        afterCommit: async () => { await fetchData() },
        audit: {
            source: 'SYSTEM',
            insertPayload: (count) => ({ bulk_import: true, count }),
        },
        template: {
            headers: ['Nama Kelas', 'Tingkat', 'Program', 'Tipe Gender', 'Wali Kelas', 'Tahun Ajaran'],
            widths: [20, 10, 12, 14, 25, 20],
            rows: [
                ['VII A', '7', 'Reguler', 'Putra', '', ''],
                ['VIII Boarding A', '8', 'Boarding', 'Putri', '', ''],
            ],
            filename: 'Template_Import_Kelas',
        },
        export: {
            getExportData,
            defaultFileName: 'export_kelas',
            pdfTitle: 'Laporan Data Kelas',
            pdfMeta: (rows, scope) => `Tanggal: ${new Date().toLocaleDateString('id-ID')}  |  Total: ${rows.length} kelas  |  Scope: ${scope === 'filtered' ? 'Filter Aktif' : scope === 'selected' ? 'Dipilih' : 'Semua'}`,
            auditSource: 'MASTER',
            auditPayload: (fmt, count, ctx) => ({ format: fmt, scope: ctx.exportScope, columns: ctx.exportColumns, count }),
            toast: (fmt, n) => `Export ${fmt === 'csv' ? 'CSV' : fmt === 'xlsx' ? 'Excel' : 'PDF'} berhasil (${n} kelas)`,
            failed: (fmt) => `Gagal export ${fmt === 'csv' ? 'CSV' : fmt === 'xlsx' ? 'Excel' : 'PDF'}`,
        },
    })

    const {
        isImportModalOpen, setIsImportModalOpen, isExportModalOpen, setIsExportModalOpen,
        exporting, exportScope, setExportScope, exportColumns, setExportColumns,
        importStep, setImportStep, importFileName, importPreview, setImportPreview,
        importIssues, setImportIssues, importFileHeaders, importColumnMapping, setImportColumnMapping,
        importRawData, importLoading, importDragOver, setImportDragOver,
        importValidationOpen, setImportValidationOpen, importing, importProgress,
        importEditCell, setImportEditCell, importSkipDupes, setImportSkipDupes,
        importReadyRows, hasImportBlockingErrors,
        processImportFile, handleImportClick, resetImport, handleCommitImport,
        buildImportPreview, handleImportCellEdit, handleRemoveImportRow,
        handleDownloadTemplate, handleExportCSV, handleExportExcel, handleExportPDF,
    } = importExport

    const isAnyModalOpen = isModalOpen || isDeleteModalOpen || isBulkDeleteOpen || isExportModalOpen || isImportModalOpen || isArchivedModalOpen

    // ── SHORTCUTS (binding + daftar modal dari satu deklarasi — usePageShortcuts) ──
    const sc = usePageShortcuts({
        isBlocked: isAnyModalOpen || isHeaderMenuOpen,
        items: [
            { section: 'Navigasi', keys: ['Ctrl', 'K'], label: 'Fokus ke search', icon: Search, onSelect: () => { searchInputRef.current?.focus(); searchInputRef.current?.select() } },
            { section: 'Navigasi', keys: ['Ctrl', 'F'], label: 'Toggle filter lanjutan', icon: SlidersHorizontal, onSelect: () => setShowAdvFilter(v => !v) },
            { section: 'Navigasi', keys: ['Esc'], label: 'Tutup / clear / deselect', icon: X, onSelect: () => { if (isAnyModalOpen) return; if (searchQuery) { setSearchQuery(''); return } if (selectedIds.length) { setSelectedIds([]); return } if (hasActiveFilters) { resetAllFilters() } } },
            { section: 'Aksi', keys: ['N'], label: 'Tambah kelas baru', icon: Plus, onSelect: handleAdd },
            { section: 'Aksi', keys: ['Ctrl', 'A'], label: 'Pilih semua / deselect', icon: CheckCheck, onSelect: toggleSelectAll },
            { section: 'Aksi', keys: ['Ctrl', 'E'], label: 'Buka export', icon: FileOutput, onSelect: () => setIsExportModalOpen(true) },
            { section: 'Tampilan', keys: ['P'], label: 'Toggle privacy mode', icon: EyeOff, onSelect: () => setIsPrivacyMode(v => !v) },
            { section: 'Tampilan', keys: ['R'], label: 'Refresh data', icon: RefreshCw, onSelect: fetchData },
            { section: 'Tampilan', keys: ['X'], label: 'Reset semua filter', icon: RotateCcw, onSelect: resetAllFilters },
            { section: 'Tampilan', keys: ['?'], label: 'Tampilkan shortcut ini', icon: Keyboard },
        ],
    })

    return (
        <DashboardLayout title="Data Kelas" hideHeader={isAnyModalOpen} hideSidebar={isAnyModalOpen}>
            <style>{isAnyModalOpen ? ` .top-nav, .sidebar, .floating-dock { display: none !important; } main { padding-top: 0 !important; } ` : ''}</style>
            <div className="space-y-4">

                {/* Read-only Banner */}
                {!canEdit && (
                    <div className="px-4 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-2">
                        <EyeOff className="w-4 h-4 text-rose-500 shrink-0" />
                        <p className="text-xs font-bold text-rose-600">Mode Read-only — Edit data kelas dinonaktifkan oleh administrator.</p>
                    </div>
                )}

                {/* Bulk Action Bar */}
                {selectedIds.length > 0 && (
                    <div className="mb-4 px-4 py-3 rounded-2xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 flex items-center justify-between gap-3 flex-wrap animate-in slide-in-from-top-2">
                        <p className="text-sm font-bold text-[var(--color-primary)] tracking-tight">{selectedIds.length} kelas dipilih</p>
                        <div className="flex items-center gap-2 flex-wrap">
                            <button onClick={() => setIsBulkDeleteOpen(true)} className="h-8 px-4 rounded-xl bg-red-500/10 text-red-600 text-xs font-bold uppercase tracking-wide hover:bg-red-500 hover:text-white transition-all flex items-center gap-2"><Trash2 className="w-4 h-4" /> Hapus</button>
                            <button onClick={() => setSelectedIds([])} className="h-8 px-4 rounded-xl bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] text-xs font-bold uppercase tracking-wide hover:text-[var(--color-text)] transition-all flex items-center gap-2"><X className="w-4 h-4" /> Batal</button>
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
                                            <p className="text-xs opacity-60 font-medium leading-tight mt-0.5">Unggah data kelas masal dari file Excel/CSV</p>
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
                                    <button onClick={() => { setIsHeaderMenuOpen(false); fetchArchived(); setIsArchivedModalOpen(true) }}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--color-surface-alt)] text-[var(--color-text)] transition-all group">
                                        <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <Archive className="w-4 h-4" />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-xs font-bold leading-tight">Arsip Kelas</p>
                                            <p className="text-xs opacity-60 font-medium leading-tight mt-0.5">Lihat & pulihkan data kelas tidak aktif</p>
                                        </div>
                                    </button>
                                </div>
                            </>,
                            getPortalContainer('portal-class-header-menu')
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
                            <span>{canEdit ? 'Tambah Kelas' : 'Read-only'}</span>
                        </button>
                        </>
                    }
                />

                {/* ── Stats ── */}
                <StatsCarousel count={STAT_CARD_COUNT} cols={4}>
                    {[
                        { icon: School, label: 'Total Kelas', value: stats.total, borderColor: 'border-t-[var(--color-primary)]', iconBg: 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]', onClick: () => { setFilterProgram(''); setFilterLevel(''); setPage(1) } },
                        { icon: Bed, label: 'Boarding', value: stats.boarding, borderColor: 'border-t-amber-500', iconBg: 'bg-amber-500/10 text-amber-500', onClick: () => { setFilterProgram('Boarding'); setPage(1) } },
                        { icon: Building, label: 'Reguler', value: stats.reguler, borderColor: 'border-t-emerald-500', iconBg: 'bg-emerald-500/10 text-emerald-500', onClick: () => { setFilterProgram('Reguler'); setPage(1) } },
                        { icon: Users, label: 'Total Siswa', value: stats.totalStudents, borderColor: 'border-t-pink-500', iconBg: 'bg-pink-500/10 text-pink-500', onClick: () => { setFilterCrowded(true); setPage(1) } },
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

                            {/* Group 1: Program */}
                            <div className="flex items-center gap-1.5 shrink-0">
                                {[
                                    { id: '', label: 'Semua', icon: School },
                                    { id: 'Boarding', label: 'Boarding', icon: Bed, activeCls: 'bg-amber-500 border-amber-500' },
                                    { id: 'Reguler', label: 'Reguler', icon: Building, activeCls: 'bg-emerald-500 border-emerald-500' },
                                ].map((s) => (
                                    <button
                                        key={s.id}
                                        onClick={() => { setFilterProgram(s.id); setPage(1) }}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wide whitespace-nowrap transition-all border ${filterProgram === s.id
                                            ? `${s.activeCls || 'bg-[var(--color-primary)] border-[var(--color-primary)]'} text-white`
                                            : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)]/30 hover:bg-[var(--color-primary)]/5 hover:text-[var(--color-primary)]'
                                            }`}
                                    >
                                        <s.icon className={`text-xs ${filterProgram === s.id ? 'opacity-100' : 'opacity-30'}`} />
                                        {s.label}
                                    </button>
                                ))}
                            </div>

                            {/* Separator */}
                            <div className="h-4 w-px bg-[var(--color-border)] mx-1 shrink-0" />

                            {/* Group 2: Filter Cepat */}
                            <div className="flex items-center gap-1.5 shrink-0">
                                {[
                                    { id: 'no_teacher', label: 'Tanpa Wali', icon: Briefcase, active: filterNoTeacher, onClick: () => { setFilterNoTeacher(!filterNoTeacher); setPage(1) }, activeCls: 'bg-amber-500 border-amber-500' },
                                    { id: 'crowded', label: 'Padat (>35)', icon: Users, active: filterCrowded, onClick: () => { setFilterCrowded(!filterCrowded); setPage(1) }, activeCls: 'bg-blue-500 border-blue-500' },
                                ].map((g) => (
                                    <button
                                        key={g.id}
                                        onClick={g.onClick}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wide whitespace-nowrap transition-all border ${g.active
                                            ? `${g.activeCls} text-white`
                                            : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)]/30 hover:bg-[var(--color-primary)]/5 hover:text-[var(--color-primary)]'
                                            }`}
                                    >
                                        <g.icon className={`text-xs ${g.active ? 'opacity-100' : 'opacity-30'}`} />
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
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wide whitespace-nowrap transition-all border ${sortBy !== 'name'
                                        ? 'bg-amber-500 border-amber-500 text-white'
                                        : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-amber-500/30 hover:bg-amber-500/5 hover:text-amber-600'
                                        }`}
                                >
                                    <ArrowDownAZ className={`w-4 h-4 ${sortBy !== 'name' ? 'opacity-100' : 'opacity-30'}`} />
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
                    {(searchQuery || filterLevel || filterProgram || filterNoTeacher || filterCrowded) && (
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
                                {filterLevel && (
                                    <button type="button" onClick={() => setFilterLevel('')}
                                        className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/5 text-xs font-bold text-[var(--color-primary)]" title="Hapus filter tingkat">
                                        <span className="opacity-70">Kelas</span> {filterLevel}
                                        <span className="w-5 h-5 rounded-lg bg-white/70 dark:bg-[var(--color-surface)] border border-[var(--color-primary)]/20 flex items-center justify-center text-[var(--color-primary)] opacity-70 group-hover:opacity-100 transition-opacity">
                                            <X className="w-4 h-4" />
                                        </span>
                                    </button>
                                )}
                                {filterProgram && (
                                    <button type="button" onClick={() => setFilterProgram('')}
                                        className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/40 text-xs font-bold text-[var(--color-text)]" title="Hapus filter program">
                                        {filterProgram}
                                        <span className="w-5 h-5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)] group-hover:text-red-500 transition-colors">
                                            <X className="w-4 h-4" />
                                        </span>
                                    </button>
                                )}
                                {filterNoTeacher && (
                                    <button type="button" onClick={() => setFilterNoTeacher(false)}
                                        className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-amber-500/20 bg-amber-500/10 text-xs font-bold text-amber-600" title="Hapus filter tanpa wali">
                                        Tanpa Wali
                                        <span className="w-5 h-5 rounded-lg bg-white/70 dark:bg-[var(--color-surface)] border border-amber-500/20 flex items-center justify-center text-amber-600 opacity-70 group-hover:opacity-100 transition-opacity">
                                            <X className="w-4 h-4" />
                                        </span>
                                    </button>
                                )}
                                {filterCrowded && (
                                    <button type="button" onClick={() => setFilterCrowded(false)}
                                        className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-blue-500/20 bg-blue-500/10 text-xs font-bold text-blue-600" title="Hapus filter kelas padat">
                                        Kelas Padat
                                        <span className="w-5 h-5 rounded-lg bg-white/70 dark:bg-[var(--color-surface)] border border-blue-500/20 flex items-center justify-center text-blue-600 opacity-70 group-hover:opacity-100 transition-opacity">
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
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)] mb-1.5">Tingkat / Grade</label>
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
                                        <label className="block text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)] mb-1.5">Program</label>
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
                                        <label className="block text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)] mb-1.5">Urutkan</label>
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
                                    <label className="block text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)] mb-1.5">Menu Cepat & Aksi</label>
                                    <div className="flex gap-1.5 overflow-x-auto pb-1">
                                        {[
                                            { label: 'Semua', icon: School, active: !filterNoTeacher && !filterCrowded, onClick: () => { setFilterNoTeacher(false); setFilterCrowded(false); setSortBy('name') } },
                                            { label: 'Tanpa Wali', icon: Briefcase, active: filterNoTeacher, onClick: () => { setFilterNoTeacher(true); setFilterCrowded(false); setPage(1) } },
                                            { label: 'Kelas Padat', icon: Users, active: filterCrowded, onClick: () => { setFilterCrowded(true); setFilterNoTeacher(false); setPage(1) } },
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

                {/* Main Content Area */}
                <div className="bg-surface rounded-[1.5rem] border border-[var(--color-border)] overflow-hidden min-h-[400px]">
                    {loading ? (
                        <div className="p-6 space-y-4"><div className="hidden md:block"><TableSkeleton rows={8} cols={7} /></div><div className="md:hidden"><CardSkeleton count={4} /></div></div>
                    ) : (
                        <>
                            <div className="overflow-x-auto whitespace-nowrap hidden md:block">
                                <table className="w-full text-left border-collapse text-sm">
                                    <thead className="bg-[var(--color-surface-alt)] sticky top-0 z-10 border-b border-[var(--color-border)]">
                                        <tr className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
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
                                                        <div className={`absolute z-[9999] w-48 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl p-2 space-y-0.5 animate-in fade-in zoom-in-95 ${menuPos.showUp ? 'slide-in-from-bottom-2' : 'slide-in-from-top-2'}`}
                                                            style={{ top: menuPos.top, right: menuPos.right }}>
                                                            <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)] px-3 py-2">Atur Kolom</p>
                                                            {[{ key: 'level', label: 'Tingkat' }, { key: 'program', label: 'Program Studi' }, { key: 'gender', label: 'Gender / Tipe' }, { key: 'teacher', label: 'Wali Kelas' }, { key: 'students', label: 'Jumlah Siswa' }, { key: 'year', label: 'Tahun Akademik' }].map(({ key, label }) => (
                                                                <button key={key} onClick={() => toggleColumn(key)} className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-[var(--color-surface-alt)] transition-all group text-left">
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
                                        {totalFilteredRows === 0 ? (
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
                                                            Tidak ditemukan kelas yang cocok dengan filter atau database masih kosong.
                                                        </p>
                                                        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 mb-4">
                                                            {searchQuery || filterLevel || filterProgram || filterNoTeacher || filterCrowded ? (
                                                                <button
                                                                    onClick={resetAllFilters}
                                                                    className="h-9 px-4 rounded-xl text-xs font-bold uppercase tracking-wide border border-[var(--color-border)] hover:bg-[var(--color-surface-alt)] transition"
                                                                >
                                                                    Reset Semua Filter
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    onClick={handleAdd}
                                                                    disabled={!canEdit}
                                                                    className="h-9 px-5 rounded-xl bg-[var(--color-primary)] text-white text-xs font-bold uppercase tracking-wide shadow-lg hover:brightness-110 transition-all flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                                                                >
                                                                    <Plus className="w-4 h-4" />
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
                                            <div className="relative w-24 h-24 rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xl flex items-center justify-center">
                                                <Search className="w-6 h-6 text-[var(--color-primary)]/30" />
                                                <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-2xl bg-[var(--color-surface)] shadow-lg flex items-center justify-center border border-[var(--color-border)]">
                                                    <X className="w-4 h-4 text-red-500" />
                                                </div>
                                            </div>
                                        </div>
                                        <h3 className="text-lg font-bold text-[var(--color-text)] mb-2">Pencarian Tidak Ditemukan</h3>
                                        <p className="text-xs font-bold text-[var(--color-text-muted)] max-w-[280px] leading-relaxed mb-6">
                                            Tidak ditemukan kelas yang cocok dengan filter atau database masih kosong.
                                        </p>
                                        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 mb-4">
                                            {searchQuery || filterLevel || filterProgram || filterNoTeacher || filterCrowded ? (
                                                <button
                                                    onClick={resetAllFilters}
                                                    className="h-9 px-4 rounded-xl text-xs font-bold uppercase tracking-wide border border-[var(--color-border)] hover:bg-[var(--color-surface-alt)] transition"
                                                >
                                                    Reset Semua Filter
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={handleAdd}
                                                    disabled={!canEdit}
                                                    className="h-9 px-5 rounded-xl bg-[var(--color-primary)] text-white text-xs font-bold uppercase tracking-wide shadow-lg hover:brightness-110 transition-all flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                                                >
                                                    <Plus className="w-4 h-4" />
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
                <FormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} selectedItem={selectedItem} teachersList={teachersList} academicYearsList={academicYearsList} onSubmit={handleSubmit} submitting={submitting} />

                {/* Delete Modal */}
                <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Hapus Kelas" size="sm">
                    <div className="space-y-6">
                        <div className="p-4 bg-red-500/10 rounded-2xl flex items-center gap-4 text-red-500 border border-red-500/20 shadow-inner">
                            <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center shrink-0 text-xl border border-red-500/30 animate-pulse"><Trash2 className="w-6 h-6" /></div>
                            <div className="min-w-0"><h3 className="text-sm font-bold uppercase tracking-wider">Konfirmasi Hapus</h3><p className="text-xs font-bold opacity-70 mt-1 uppercase tracking-wide">Penghapusan tidak dapat dibatalkan.</p></div>
                        </div>
                        <p className="text-xs text-[var(--color-text)] leading-relaxed font-bold px-1">Yakin menghapus kelas <span className="text-red-500 font-bold px-1.5 py-0.5 bg-red-500/10 rounded-md border border-red-500/20">{itemToDelete?.name}</span>? <span className="text-xs text-[var(--color-text-muted)] mt-2 block opacity-60">Siswa yang terdaftar akan kehilangan referensi kelas.</span></p>
                        <div className="flex gap-3 pt-2">
                            <button onClick={() => setIsDeleteModalOpen(false)} className="h-11 flex-1 rounded-xl bg-[var(--color-surface-alt)] hover:bg-[var(--color-border)] text-[var(--color-text)] font-bold text-xs uppercase tracking-wide transition-all">BATAL</button>
                                <button onClick={handleDeleteConfirm} disabled={submitting} className="h-11 flex-[1.5] rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-xs uppercase tracking-wide shadow-lg transition-all">{submitting ? <LoaderCircle className="w-4 h-4 animate-spin" /> : 'HAPUS PERMANEN'}</button>
                        </div>
                    </div>
                </Modal>

                {/* Bulk Delete Modal */}
                <Modal isOpen={isBulkDeleteOpen} onClose={() => setIsBulkDeleteOpen(false)} title="Hapus Massal Kelas" size="sm">
                    <div className="space-y-6">
                        <div className="p-4 bg-red-500/10 rounded-2xl flex items-center gap-4 text-red-500 border border-red-500/20 shadow-inner">
                            <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center shrink-0 text-xl border border-red-500/30 animate-pulse"><Trash2 className="w-6 h-6" /></div>
                            <div className="min-w-0"><h3 className="text-sm font-bold uppercase tracking-wider">Konfirmasi Hapus Massal</h3><p className="text-xs font-bold opacity-70 mt-1 uppercase tracking-wide">{selectedIds.length} kelas akan dihapus permanen.</p></div>
                        </div>
                        <p className="text-xs text-[var(--color-text)] leading-relaxed font-bold px-1">Yakin menghapus <span className="text-red-500 font-bold px-1.5 py-0.5 bg-red-500/10 rounded-md border border-red-500/20">{selectedIds.length} kelas</span>? <span className="text-xs text-[var(--color-text-muted)] mt-2 block opacity-60">Penghapusan tidak dapat dibatalkan.</span></p>
                        <div className="flex gap-3 pt-2">
                            <button onClick={() => setIsBulkDeleteOpen(false)} className="h-11 flex-1 rounded-xl bg-[var(--color-surface-alt)] hover:bg-[var(--color-border)] text-[var(--color-text)] font-bold text-xs uppercase tracking-wide transition-all">BATAL</button>
                                <button onClick={handleBulkDelete} disabled={submitting} className="h-11 flex-[1.5] rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-xs uppercase tracking-wide shadow-lg transition-all">{submitting ? <LoaderCircle className="w-4 h-4 animate-spin" /> : 'HAPUS SEMUA'}</button>
                        </div>
                    </div>
                </Modal>

                {/* Export Modal */}
                <ExportDataModal
                    isOpen={isExportModalOpen}
                    onClose={() => setIsExportModalOpen(false)}
                    items={classes}
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

                {/* Arsip Kelas Modal */}
                <ArchiveModal
                    isOpen={isArchivedModalOpen}
                    onClose={() => setIsArchivedModalOpen(false)}
                    archivedClasses={archivedClasses}
                    handleRestore={handleRestore}
                    handlePermanentDelete={handlePermanentDelete}
                />

                {/* ── Import Modal ── */}
                <ImportDataModal
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

            </div>
        </DashboardLayout>
    )
}
