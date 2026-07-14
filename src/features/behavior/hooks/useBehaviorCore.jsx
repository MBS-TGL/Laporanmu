import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { supabase } from '@lib/supabase'
import { logAudit } from '@utils/auditLogger'
import { useToast } from '@context/Toast'
import { useAuth } from '@context/Auth'
import { useFlag } from '@context/FeatureFlags'
import { useLanguage } from '@context/Language'
import { useBehaviorImportExport } from './useBehaviorImportExport'

const LS_VIEW = 'reports_view'
const LS_COLS = 'reports_columns'
const LS_PAGE_SIZE = 'reports_page_size'

export function useBehaviorCore() {
    const { profile } = useAuth()
    const { addToast } = useToast()
    const { language, t, tNum } = useLanguage()
    const tp = useCallback((key) => t(`behavior.${key}`), [t])

    // access.teacher_poin flag — if off, teachers cannot add/edit/delete points
    const { enabled: teacherPoinEnabled } = useFlag('access.teacher_poin')
    const { enabled: canViolation } = useFlag('module.pelanggaran')
    const { enabled: canAchievement } = useFlag('module.prestasi')
    const canInput = profile?.role === 'guru' ? teacherPoinEnabled : true

    const [reports, setReports] = useState([])
    const [students, setStudents] = useState([])
    const [violationTypes, setViolationTypes] = useState([])
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [totalRows, setTotalRows] = useState(0)
    const [stats, setStats] = useState({ total: 0, positive: 0, negative: 0, today: 0, yesterday: 0 })

    const [searchQuery, setSearchQuery] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')
    const [filterType, setFilterType] = useState('')
    const [filterClass, setFilterClass] = useState('')
    const [sortBy, setSortBy] = useState('newest')
    const [showAdvFilter, setShowAdvFilter] = useState(false)
    const [page, setPage] = useState(1)
    const [jumpPage, setJumpPage] = useState('')
    const [pageSize, setPageSize] = useState(() => {
        try { return Number(localStorage.getItem(LS_PAGE_SIZE)) || 10 } catch { return 10 }
    })
    const [viewMode, setViewMode] = useState(() => {
        try { return localStorage.getItem(LS_VIEW) || 'timeline' } catch { return 'timeline' }
    })

    const [isModalOpen, setIsModalOpen] = useState(false)
    const [selectedItem, setSelectedItem] = useState(null)
    const [detailItem, setDetailItem] = useState(null)
    const [isDetailOpen, setIsDetailOpen] = useState(false)
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
    const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false)
    const [itemToDelete, setItemToDelete] = useState(null)
    const [selectedIds, setSelectedIds] = useState([])
    const [classesList, setClassesList] = useState([]) // fetched directly from classes table
    const [classesObjects, setClassesObjects] = useState([])

    const searchInputRef = useRef(null)
    const colMenuRef = useRef(null)
    const importFileInputRef = useRef(null)
    const shortcutRef = useRef(null)
    const pressTimerRef = useRef(null)
    const [pressingId, setPressingId] = useState(null)

    // columns
    const [visibleCols, setVisibleCols] = useState({ type: true, points: true, time: true, teacher: true })
    const [isColMenuOpen, setIsColMenuOpen] = useState(false)
    const [menuPos, setMenuPos] = useState({ top: 0, right: 0, showUp: false })

    // Export/Import & UX States
    const [isShortcutOpen, setIsShortcutOpen] = useState(false)
    const [isPrivacyMode, setIsPrivacyMode] = useState(false)
    const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false)
    const headerMenuBtnRef = useRef(null)
    const shortcutBtnRef = useRef(null)
    const [headerMenuRect, setHeaderMenuRect] = useState(null)
    const [shortcutRect, setShortcutRect] = useState(null)
    const [headerMenuMounted, setHeaderMenuMounted] = useState(false)
    const [shortcutMounted, setShortcutMounted] = useState(false)

    useEffect(() => {
        if (isHeaderMenuOpen) {
            setHeaderMenuMounted(true)
        } else {
            const t = setTimeout(() => setHeaderMenuMounted(false), 200)
            return () => clearTimeout(t)
        }
    }, [isHeaderMenuOpen])

    useEffect(() => {
        if (isShortcutOpen) {
            setShortcutMounted(true)
        } else {
            const t = setTimeout(() => setShortcutMounted(false), 200)
            return () => clearTimeout(t)
        }
    }, [isShortcutOpen])

    useEffect(() => {
        if (!isHeaderMenuOpen && !isShortcutOpen) return
        const update = () => {
            if (isHeaderMenuOpen && headerMenuBtnRef.current) setHeaderMenuRect(headerMenuBtnRef.current.getBoundingClientRect())
            if (isShortcutOpen && shortcutBtnRef.current) setShortcutRect(shortcutBtnRef.current.getBoundingClientRect())
        }
        update()
        window.addEventListener('resize', update)
        return () => { window.removeEventListener('resize', update) }
    }, [isHeaderMenuOpen, isShortcutOpen])

    // Derived
    const totalPages = Math.ceil(totalRows / pageSize)
    const fromRow = totalRows === 0 ? 0 : (page - 1) * pageSize + 1
    const toRow = Math.min(page * pageSize, totalRows)

    const activeFilters = useMemo(() => {
        const chips = []
        if (filterType === 'positive') chips.push({ label: `${tp('positive')} (+)`, clear: () => setFilterType('') })
        if (filterType === 'negative') chips.push({ label: `${tp('negative')} (−)`, clear: () => setFilterType('') })
        if (filterClass) chips.push({ label: `${tp('classLabel')}: ${filterClass}`, clear: () => setFilterClass('') })
        if (sortBy !== 'newest') chips.push({ label: `${tp('sortLabel')}: ${tp('oldest')}`, clear: () => setSortBy('newest') })
        return chips
    }, [filterType, filterClass, sortBy, tp])

    const groupedReports = useMemo(() => {
        const groups = {}
        reports.forEach(r => {
            const key = (r.reported_at || '').slice(0, 10)
            if (!groups[key]) groups[key] = []
            groups[key].push(r)
        })
        return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]))
    }, [reports])

    const toggleSelect = (id) => setSelectedIds(ids => ids.includes(id) ? ids.filter(i => i !== id) : [...ids, id])
    const allSelected = reports.length > 0 && reports.every(r => selectedIds.includes(r.id))

    const fmtDayLabel = (d) => {
        const today = new Date().toISOString().slice(0, 10)
        const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
        const ds = d.slice(0, 10)
        if (ds === today) return tp('today')
        if (ds === yesterday) return tp('yesterday')
        const loc = language === 'ar' ? 'ar-SA' : language === 'en' ? 'en-US' : 'id-ID'
        return new Date(d).toLocaleDateString(loc, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    }

    const resetAllFilters = () => {
        setSearchQuery(''); setFilterType(''); setFilterClass(''); setSortBy('newest'); setPage(1)
    }

    // Effects
    useEffect(() => {
        const t = setTimeout(() => { setDebouncedSearch(searchQuery.trim()); setPage(1) }, 350)
        return () => clearTimeout(t)
    }, [searchQuery])

    useEffect(() => { localStorage.setItem(LS_VIEW, viewMode) }, [viewMode])

    // Load/Save columns
    useEffect(() => {
        try {
            const c = JSON.parse(localStorage.getItem(LS_COLS) || '{}')
            if (Object.keys(c).length) setVisibleCols(c)
        } catch { }
    }, [])
    useEffect(() => {
        localStorage.setItem(LS_COLS, JSON.stringify(visibleCols))
    }, [visibleCols])
    useEffect(() => {
        localStorage.setItem(LS_PAGE_SIZE, pageSize)
    }, [pageSize])

    // Keydown/global click listener
    useEffect(() => {
        const h = e => {
            const isTyping = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)
            if (e.ctrlKey && e.key === 'k') { e.preventDefault(); searchInputRef.current?.focus() }
            if (e.ctrlKey && e.key === 'e') { e.preventDefault(); setIsExportModalOpen(true) }
            if (e.ctrlKey && e.key === 'i') { e.preventDefault(); setIsImportModalOpen(true) }
            if (e.key === 'n' && !e.ctrlKey && !isTyping) { e.preventDefault(); setIsModalOpen(true) }
            if (e.key === 'Escape') {
                setSearchQuery(''); setSelectedIds([]);
                setIsModalOpen(false); setIsExportModalOpen(false); setIsImportModalOpen(false)
                setIsShortcutOpen(false); setIsDeleteModalOpen(false); setIsBulkDeleteOpen(false)
                setIsDetailOpen(false); setDetailItem(null);
            }
            if (e.key === '?' && !isTyping) setIsShortcutOpen(v => !v)

            if (colMenuRef.current && !colMenuRef.current.contains(e.target)) {
                setIsColMenuOpen(false)
            }
        }
        const handleGlobalClick = (e) => {
            if (colMenuRef.current && !colMenuRef.current.contains(e.target)) setIsColMenuOpen(false)
            if (headerMenuBtnRef.current && !headerMenuBtnRef.current.contains(e.target) && !e.target.closest('#portal-header-menu')) {
                setIsHeaderMenuOpen(false)
            }
            if (shortcutBtnRef.current && !shortcutBtnRef.current.contains(e.target) && !e.target.closest('#portal-shortcut-menu')) {
                setIsShortcutOpen(false)
            }
        }
        const handleScroll = () => {
            setIsColMenuOpen(false)
            setIsHeaderMenuOpen(false)
            setIsShortcutOpen(false)
        }
        document.addEventListener('keydown', h)
        document.addEventListener('mousedown', handleGlobalClick)
        document.addEventListener('scroll', handleScroll, { capture: true, passive: true })
        return () => {
            document.removeEventListener('keydown', h)
            document.removeEventListener('mousedown', handleGlobalClick)
            document.removeEventListener('scroll', handleScroll, { capture: true })
        }
    }, [])

    // Fetchers
    const fetchMetadata = useCallback(async () => {
        try {
            const [studRes, vtRes, classRes] = await Promise.all([
                supabase.from('students').select('id,name,class_id,total_points,classes(id,name)').order('name'),
                supabase.from('point_rules').select('id,name,category,points,is_negative,status').order('name'),
                supabase.from('classes').select('id,name').order('name'),
            ])
            if (studRes.data) {
                setStudents(studRes.data.map(s => ({
                    id: s.id,
                    name: s.name,
                    class_id: s.class_id,
                    class_name: s.classes?.name || '',
                    total_points: s.total_points || 0,
                })))
            }
            if (vtRes.data) {
                const filteredVTs = vtRes.data.filter(vt => {
                    if (vt.points > 0) return canAchievement
                    if (vt.points < 0) return canViolation
                    return true
                })
                setViolationTypes(filteredVTs)
            }
            if (classRes.data) {
                setClassesObjects(classRes.data)
                setClassesList(classRes.data.map(c => c.name).filter(Boolean).sort())
            }
        } catch { addToast(tp('toastLoadMetaError'), 'error') }
    }, [addToast, canAchievement, canViolation, tp])

    const fetchReports = useCallback(async () => {
        setLoading(true)
        try {
            const from = (page - 1) * pageSize
            const to = from + pageSize - 1
            let q = supabase
                .from('reports')
                .select('id,student_id,violation_type_id,points,notes,reported_at,teacher_name', { count: 'exact' })
                .order('reported_at', { ascending: sortBy === 'oldest' })
                .range(from, to)

            if (filterType === 'positive') q = q.gt('points', 0)
            if (filterType === 'negative') q = q.lt('points', 0)

            if (!canViolation) q = q.gt('points', -1)
            if (!canAchievement) q = q.lt('points', 1)

            if (filterClass) {
                const classStudentIds = students
                    .filter(st => st.class_name === filterClass)
                    .map(st => st.id)
                if (!classStudentIds.length) {
                    setReports([]); setTotalRows(0); setLoading(false); return
                }
                q = q.in('student_id', classStudentIds)
            }

            if (debouncedSearch) {
                const [matchedS, matchedT] = await Promise.all([
                    supabase.from('students').select('id').ilike('name', `%${debouncedSearch}%`),
                    supabase.from('point_rules').select('id').ilike('name', `%${debouncedSearch}%`),
                ])
                const sIds = (matchedS.data || []).map(s => s.id)
                const tIds = (matchedT.data || []).map(t => t.id)
                if (!sIds.length && !tIds.length) { setReports([]); setTotalRows(0); setLoading(false); return }
                const ors = []
                if (sIds.length) ors.push(`student_id.in.(${sIds.join(',')})`)
                if (tIds.length) ors.push(`violation_type_id.in.(${tIds.join(',')})`)
                q = q.or(ors.join(','))
            }

            const { data, error, count } = await q
            if (error) throw error

            setReports(data || [])
            setTotalRows(count ?? 0)
        } catch { addToast(tp('toastLoadReportError'), 'error') }
        finally { setLoading(false) }
    }, [page, pageSize, debouncedSearch, filterType, filterClass, sortBy, students, canViolation, canAchievement, addToast, tp])

    const fetchStats = useCallback(async () => {
        try {
            const todayStr = new Date().toISOString().slice(0, 10)
            const tomorrowStr = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
            const yesterdayStr = new Date(Date.now() - 86400000).toISOString().slice(0, 10)

            const withModuleFilter = (q) => {
                if (!canViolation) q = q.gt('points', -1)
                if (!canAchievement) q = q.lt('points', 1)
                return q
            }

            const [totalRes, positiveRes, negativeRes, todayRes, yesterdayRes] = await Promise.all([
                withModuleFilter(supabase.from('reports').select('*', { count: 'exact', head: true })),
                canAchievement
                    ? supabase.from('reports').select('*', { count: 'exact', head: true }).gt('points', 0)
                    : Promise.resolve({ count: 0 }),
                canViolation
                    ? supabase.from('reports').select('*', { count: 'exact', head: true }).lt('points', 0)
                    : Promise.resolve({ count: 0 }),
                withModuleFilter(
                    supabase.from('reports').select('*', { count: 'exact', head: true })
                        .gte('reported_at', `${todayStr}T00:00:00`)
                        .lt('reported_at', `${tomorrowStr}T00:00:00`)
                ),
                withModuleFilter(
                    supabase.from('reports').select('*', { count: 'exact', head: true })
                        .gte('reported_at', `${yesterdayStr}T00:00:00`)
                        .lt('reported_at', `${todayStr}T00:00:00`)
                ),
            ])

            setStats({
                total: totalRes.count ?? 0,
                positive: positiveRes.count ?? 0,
                negative: negativeRes.count ?? 0,
                today: todayRes.count ?? 0,
                yesterday: yesterdayRes.count ?? 0,
            })
        } catch { }
    }, [canAchievement, canViolation])

    const fetchRef = useRef(fetchReports)
    const fetchStatsRef = useRef(fetchStats)
    useEffect(() => { fetchRef.current = fetchReports }, [fetchReports])
    useEffect(() => { fetchStatsRef.current = fetchStats }, [fetchStats])
    useEffect(() => { fetchMetadata() }, [fetchMetadata])
    useEffect(() => { fetchReports() }, [fetchReports])
    useEffect(() => { fetchStats() }, [fetchStats])

    useEffect(() => {
        const ch = supabase.channel('reports-rt')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'reports' }, () => {
                fetchRef.current(); fetchStatsRef.current()
            }).subscribe()
        return () => supabase.removeChannel(ch)
    }, [])

    // CRUD Handlers
    const handleAdd = () => {
        setSelectedItem(null)
        setIsModalOpen(true)
    }
    const handleOpenDetail = (r) => {
        setDetailItem(r)
        setIsDetailOpen(true)
    }
    const handleEdit = (r) => {
        setSelectedItem(r)
        setIsModalOpen(true)
    }

    const handleSubmit = async (modalFormData) => {
        setSubmitting(true)
        try {
            const vt = violationTypes.find(v => v.id === modalFormData.violation_type_id)
            const payload = {
                student_id: modalFormData.student_id,
                violation_type_id: modalFormData.violation_type_id,
                reporter_id: profile?.id ?? null,
                teacher_name: profile?.name ?? tp('unknown'),
                points: vt?.points ?? 0,
                notes: modalFormData.notes || null,
                reported_at: modalFormData.reported_at
                    ? new Date(modalFormData.reported_at).toISOString()
                    : (selectedItem ? selectedItem.reported_at : new Date().toISOString()),
            }
            if (selectedItem) {
                const { error } = await supabase.from('reports').update(payload).eq('id', selectedItem.id)
                if (error) throw error
                addToast(tp('toastUpdateSuccess'), 'success')
                await logAudit({
                    action: 'UPDATE', source: 'OPERATIONAL', tableName: 'reports', recordId: selectedItem.id,
                    oldData: selectedItem,
                    newData: { ...selectedItem, ...payload }
                })
            } else {
                const { data: insData, error } = await supabase.from('reports').insert([payload]).select().single()
                if (error) throw error
                addToast(tp('toastCreateSuccess'), 'success')
                await logAudit({
                    action: 'INSERT', source: 'OPERATIONAL', tableName: 'reports', recordId: insData?.id,
                    newData: insData || payload
                })
            }
            setIsModalOpen(false); fetchReports(); fetchStats()
        } catch (err) { addToast(err.message || tp('toastSaveError'), 'error') }
        finally { setSubmitting(false) }
    }

    const handleDeleteConfirm = async () => {
        if (!itemToDelete) return
        setSubmitting(true)
        try {
            const { error } = await supabase.from('reports').delete().eq('id', itemToDelete.id)
            if (error) throw error
            addToast(tp('toastDeleteSuccess'), 'success')
            await logAudit({
                action: 'DELETE', source: 'OPERATIONAL', tableName: 'reports', recordId: itemToDelete.id,
                oldData: itemToDelete
            })
            setIsDeleteModalOpen(false); fetchReports(); fetchStats()
        } catch (err) { addToast(err.message || tp('toastDeleteError'), 'error') }
        finally { setSubmitting(false); setItemToDelete(null) }
    }

    const handleBulkDelete = async () => {
        if (!selectedIds.length) return
        setSubmitting(true)
        const idsSnap = [...selectedIds]
        try {
            const { error } = await supabase.from('reports').delete().in('id', idsSnap)
            if (error) throw error
            addToast(`${tNum(idsSnap.length)} ${tp('toastBulkDeleteSuccess')}`, 'success')
            await logAudit({
                action: 'DELETE', source: 'OPERATIONAL', tableName: 'reports', recordId: null,
                oldData: { bulk: true, count: idsSnap.length, ids: idsSnap }
            })
            setSelectedIds([]); setIsBulkDeleteOpen(false); fetchReports(); fetchStats()
        } catch (err) { addToast(err.message || tp('toastBulkDeleteError'), 'error') }
        finally { setSubmitting(false) }
    }

    // Mobile gesture handlers
    const handleCardPressStart = useCallback((e, id) => {
        if (window.innerWidth >= 640) return
        if (e.target.closest('button') || e.target.closest('input') || e.target.closest('a')) return

        if (pressTimerRef.current) clearTimeout(pressTimerRef.current)
        setPressingId(id)
        pressTimerRef.current = setTimeout(() => {
            setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
            if (navigator.vibrate) {
                navigator.vibrate(50)
            }
            setPressingId(null)
        }, 800)
    }, [])

    const handleCardPressEnd = useCallback((e, id, report) => {
        if (window.innerWidth >= 640) return
        if (e.target.closest('button') || e.target.closest('input') || e.target.closest('a')) return

        if (pressTimerRef.current) {
            clearTimeout(pressTimerRef.current)
            pressTimerRef.current = null
        }
        if (pressingId === id) {
            setSelectedIds(prev => {
                if (prev.length > 0) {
                    return prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
                } else {
                    handleOpenDetail(report)
                    return prev
                }
            })
        }
        setPressingId(null)
    }, [pressingId, handleOpenDetail])

    const handleCardPressCancel = useCallback(() => {
        if (pressTimerRef.current) {
            clearTimeout(pressTimerRef.current)
            pressTimerRef.current = null
        }
        setPressingId(null)
    }, [])

    // Import/Export integration
    const importExport = useBehaviorImportExport({
        reports,
        students,
        violationTypes,
        classesList,
        fetchReports,
        fetchStats,
        addToast,
        closeModal: () => {},
        importFileInputRef,
        filterType,
        filterClass,
        debouncedSearch,
        sortBy,
        selectedIds,
        profile
    })

    const {
        isImportModalOpen, setIsImportModalOpen,
        isExportModalOpen, setIsExportModalOpen,
        exportScope, setExportScope,
        exportColumns, setExportColumns,
        importFileName, setImportFileName,
        importPreview, setImportPreview,
        importIssues, setImportIssues,
        importing, setImporting,
        importProgress, setImportProgress,
        importStep, setImportStep,
        importRawData, setImportRawData,
        importFileHeaders, setImportFileHeaders,
        importColumnMapping, setImportColumnMapping,
        importDragOver, setImportDragOver,
        importValidationOpen, setImportValidationOpen,
        importLoading, setImportLoading,
        importEditCell, setImportEditCell,
        importReadyRows,
        hasImportBlockingErrors,
        SYSTEM_COLS,
        ALL_EXPORT_COLUMNS,
        copyingData,
        copyDataFromMonth,
        processImportFile,
        handleImportClick,
        handleCommitImport,
        handleBulkFix,
        handleDownloadTemplate,
        handleExportCSV,
        handleExportExcel,
        handleExportPDF,
        buildImportPreview,
        handleImportCellEdit,
        handleRemoveImportRow
    } = importExport

    return {
        // States & Meta
        reports,
        students,
        violationTypes,
        classesList,
        classesObjects,
        loading,
        submitting,
        totalRows,
        stats,
        searchQuery, setSearchQuery,
        debouncedSearch,
        filterType, setFilterType,
        filterClass, setFilterClass,
        sortBy, setSortBy,
        showAdvFilter, setShowAdvFilter,
        page, setPage,
        jumpPage, setJumpPage,
        pageSize, setPageSize,
        viewMode, setViewMode,

        // Modal & CRUD States
        isModalOpen, setIsModalOpen,
        selectedItem, setSelectedItem,
        detailItem, setDetailItem,
        isDetailOpen, setIsDetailOpen,
        isDeleteModalOpen, setIsDeleteModalOpen,
        isBulkDeleteOpen, setIsBulkDeleteOpen,
        itemToDelete, setItemToDelete,
        selectedIds, setSelectedIds,
        pressingId,

        // Table Columns
        visibleCols, setVisibleCols,
        isColMenuOpen, setIsColMenuOpen,
        menuPos, setMenuPos,

        // UX & Dialog States
        isShortcutOpen, setIsShortcutOpen,
        isPrivacyMode, setIsPrivacyMode,
        isHeaderMenuOpen, setIsHeaderMenuOpen,
        headerMenuRect, setHeaderMenuRect,
        shortcutRect, setShortcutRect,
        headerMenuMounted, setHeaderMenuMounted,
        shortcutMounted, setShortcutMounted,

        // Derived / Selectors
        totalPages,
        fromRow,
        toRow,
        activeFilters,
        groupedReports,
        allSelected,

        // Refs
        searchInputRef,
        colMenuRef,
        importFileInputRef,
        shortcutRef,
        headerMenuBtnRef,
        shortcutBtnRef,

        // Handlers
        canInput,
        handleAdd,
        handleOpenDetail,
        handleEdit,
        handleSubmit,
        handleDeleteConfirm,
        handleBulkDelete,
        handleCardPressStart,
        handleCardPressEnd,
        handleCardPressCancel,
        toggleSelect,
        fmtDayLabel,
        resetAllFilters,

        // Import/Export States & Handlers
        isImportModalOpen, setIsImportModalOpen,
        isExportModalOpen, setIsExportModalOpen,
        exportScope, setExportScope,
        exportColumns, setExportColumns,
        importFileName, setImportFileName,
        importPreview, setImportPreview,
        importIssues, setImportIssues,
        importing, setImporting,
        importProgress, setImportProgress,
        importStep, setImportStep,
        importRawData, setImportRawData,
        importFileHeaders, setImportFileHeaders,
        importColumnMapping, setImportColumnMapping,
        importDragOver, setImportDragOver,
        importValidationOpen, setImportValidationOpen,
        importLoading, setImportLoading,
        importEditCell, setImportEditCell,
        importReadyRows,
        hasImportBlockingErrors,
        SYSTEM_COLS,
        ALL_EXPORT_COLUMNS,
        copyingData,
        copyDataFromMonth,
        processImportFile,
        handleImportClick,
        handleCommitImport,
        handleBulkFix,
        handleDownloadTemplate,
        handleExportCSV,
        handleExportExcel,
        handleExportPDF,
        buildImportPreview,
        handleImportCellEdit,
        handleRemoveImportRow
    }
}
