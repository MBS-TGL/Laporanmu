import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { supabase } from '@lib/supabase'
import { logAudit } from '@utils/auditLogger'
import { STATUS_CONFIG } from '@features/teachers/components/TeacherRow'
import { useDebounce } from '@hooks'

const LS_FILTERS = 'teachers_filters'
const LS_COLS = 'teachers_columns'
const LS_PAGE_SIZE = 'teachers_page_size'

export function useTeachersCore({ addToast, profile }) {
    // core
    const [teachers, setTeachers] = useState([])
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [totalRows, setTotalRows] = useState(0)
    const [subjectsList, setSubjectsList] = useState([])
    const [classesList, setClassesList] = useState([])
    const [stats, setStats] = useState({ total: 0, active: 0, male: 0, female: 0, guru: 0, karyawan: 0 })
    const [uploadingPhoto, setUploadingPhoto] = useState(false)

    // filters
    const [searchQuery, setSearchQuery] = useState('')
    const debouncedSearch = useDebounce(searchQuery, 350)
    const [filterSubject, setFilterSubject] = useState('')
    const [filterGender, setFilterGender] = useState('')
    const [filterStatus, setFilterStatus] = useState('active')
    const [filterType, setFilterType] = useState('') // '' | 'guru' | 'karyawan'
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
    const [isShortcutOpen, setIsShortcutOpen] = useState(false)
    const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false)

    // modals
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false)
    const [isArchivedOpen, setIsArchivedOpen] = useState(false)
    const [isProfileOpen, setIsProfileOpen] = useState(false)
    const [isImportModalOpen, setIsImportModalOpen] = useState(false)
    const [isExportModalOpen, setIsExportModalOpen] = useState(false)
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

    // Sticky portal refs & rects for header menu + shortcut dropdowns
    const headerMenuBtnRef = useRef(null)
    const shortcutBtnRef = useRef(null)
    const [headerMenuRect, setHeaderMenuRect] = useState(null)
    const [shortcutRect, setShortcutRect] = useState(null)

    // Deferred unmount: keeps portal in DOM for 200ms after close so exit animation can play
    const [headerMenuMounted, setHeaderMenuMounted] = useState(false)

    // --- Stats Carousel Dot Indicator ---
    const statsScrollRef = useRef(null)
    const [activeStatIdx, setActiveStatIdx] = useState(0)

    // ── persist ──────────────────────────────────────────────────────────────
    useEffect(() => {
        try {
            const f = JSON.parse(localStorage.getItem(LS_FILTERS) || '{}')
            if (f.filterGender) setFilterGender(f.filterGender)
            if (f.filterStatus !== undefined) setFilterStatus(f.filterStatus)
            if (f.filterSubject) setFilterSubject(f.filterSubject)
            if (f.filterType) setFilterType(f.filterType)
            if (f.sortBy) setSortBy(f.sortBy)
        } catch { }
        try {
            const c = JSON.parse(localStorage.getItem(LS_COLS) || '{}')
            if (Object.keys(c).length) setVisibleCols(c)
        } catch { }
    }, [])

    useEffect(() => {
        try {
            localStorage.setItem(LS_FILTERS, JSON.stringify({ filterGender, filterStatus, filterSubject, filterType, sortBy }))
        } catch { }
    }, [filterGender, filterStatus, filterSubject, filterType, sortBy])

    useEffect(() => {
        try {
            localStorage.setItem(LS_COLS, JSON.stringify(visibleCols))
        } catch { }
    }, [visibleCols])

    useEffect(() => {
        try {
            localStorage.setItem(LS_PAGE_SIZE, pageSize)
        } catch { }
    }, [pageSize])

    // debounce handled by useDebounce hook — reset page on search change
    useEffect(() => { setPage(1) }, [debouncedSearch])

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
            if (quickStatusRef.current && !quickStatusRef.current.contains(e.target)) setQuickStatusId(null)
        }
        document.addEventListener('mousedown', h)
        return () => document.removeEventListener('mousedown', h)
    }, [])

    // ── computed ──────────────────────────────────────────────────────────────
    const activeFilterCount = [filterGender, filterSubject, filterMissing, filterType, filterStatus !== 'active' ? filterStatus : ''].filter(Boolean).length
    const hasActiveFilters = !!(searchQuery || activeFilterCount)
    const resetAllFilters = useCallback(() => { setSearchQuery(''); setFilterSubject(''); setFilterGender(''); setFilterMissing(''); setFilterStatus('active'); setFilterType(''); setPage(1) }, [])

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
            if (debouncedSearch) { const s = debouncedSearch.replace(/%/g, '\\%').replace(/_/g, '\\_'); q = q.or(`name.ilike.%${s}%,nbm.ilike.%${s}%,email.ilike.%${s}%,subject.ilike.%${s}%`) }
            const { data, error, count } = await q
            if (error) throw error

            let teachersWithAvatar = data || []
            const emails = teachersWithAvatar.map(t => t.email).filter(Boolean)
            if (emails.length > 0) {
                try {
                    const { data: profilesData } = await supabase
                        .from('profiles_with_email')
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
                    // View belum dibuat — skip
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
    }, [page, pageSize, sortBy, filterStatus, filterGender, filterSubject, filterType, filterMissing, debouncedSearch, addToast])

    const fetchStats = useCallback(async () => {
        try {
            const { data } = await supabase.from('teachers').select('id,gender,status,type').is('deleted_at', null)
            if (data) setStats({ total: data.length, active: data.filter(t => t.status === 'active').length, male: data.filter(t => t.gender === 'L').length, female: data.filter(t => t.gender === 'P').length, guru: data.filter(t => !t.type || t.type === 'guru').length, karyawan: data.filter(t => t.type === 'karyawan').length })
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
    useEffect(() => { fetchData() }, [page, sortBy, filterStatus, filterGender, filterSubject, filterType, filterMissing, debouncedSearch])

    // ── crud ──────────────────────────────────────────────────────────────────
    const handleAdd = useCallback(() => { setSelectedItem(null); setIsModalOpen(true) }, [])
    const handleEdit = useCallback(item => { setSelectedItem(item); setIsModalOpen(true) }, [])
    
    const handleSubmit = useCallback(async (payload) => {
        setSubmitting(true)
        try {
            if (selectedItem) {
                const { error } = await supabase.from('teachers').update(payload).eq('id', selectedItem.id)
                if (error) throw error
                addToast('Data guru berhasil diupdate', 'success')
                await logAudit({ action: 'UPDATE', source: 'OPERATIONAL', tableName: 'teachers', recordId: selectedItem.id, oldData: selectedItem, newData: { ...selectedItem, ...payload } })
            } else {
                const { data: insData, error } = await supabase.from('teachers').insert([payload]).select().single()
                if (error) throw error
                addToast('Guru baru berhasil ditambahkan', 'success')
                await logAudit({ action: 'INSERT', source: 'OPERATIONAL', tableName: 'teachers', recordId: insData?.id, newData: payload })
            }
            setIsModalOpen(false); fetchData(); fetchStats()
            return null
        } catch (err) {
            return { error: true, code: err.code, message: 'Gagal menyimpan data.' }
        } finally {
            setSubmitting(false)
        }
    }, [selectedItem, fetchData, fetchStats, addToast])

    const handleArchive = useCallback(async () => {
        if (!teacherToAction) return
        setSubmitting(true)
        try {
            const { error } = await supabase.from('teachers').update({ deleted_at: new Date().toISOString() }).eq('id', teacherToAction.id)
            if (error) throw error
            addToast(`"${teacherToAction.name}" diarsipkan`, 'success')
            await logAudit({ action: 'UPDATE', source: 'OPERATIONAL', tableName: 'teachers', recordId: teacherToAction.id, oldData: teacherToAction, newData: { ...teacherToAction, deleted_at: new Date().toISOString() } })
            setIsArchiveModalOpen(false)
            setTeacherToAction(null)
            fetchData()
            fetchStats()
        } catch {
            addToast('Gagal mengarsipkan', 'error')
        } finally {
            setSubmitting(false)
        }
    }, [teacherToAction, fetchData, fetchStats, addToast])

    const handleRestore = useCallback(async teacher => {
        try {
            const { error } = await supabase.from('teachers').update({ deleted_at: null }).eq('id', teacher.id)
            if (error) throw error
            addToast(`"${teacher.name}" dipulihkan`, 'success')
            await logAudit({ action: 'RESTORE', source: 'OPERATIONAL', tableName: 'teachers', recordId: teacher.id, oldData: teacher, newData: { ...teacher, deleted_at: null } })
            setArchivedTeachers(prev => prev.filter(t => t.id !== teacher.id))
            fetchData()
            fetchStats()
        } catch {
            addToast('Gagal memulihkan', 'error')
        }
    }, [fetchData, fetchStats, addToast])

    const fetchArchived = useCallback(async () => {
        setLoadingArchived(true)
        try {
            const { data, error } = await supabase.from('teachers').select('*').not('deleted_at', 'is', null).order('deleted_at', { ascending: false })
            if (error) throw error
            setArchivedTeachers(data || [])
        } catch {
            addToast('Gagal memuat arsip', 'error')
        } finally {
            setLoadingArchived(false)
        }
    }, [addToast])

    // ── pin ───────────────────────────────────────────────────────────────────
    const handleTogglePin = useCallback(async teacher => {
        const newPinned = !teacher.is_pinned

        // Optimistic UI Update
        setTeachers(prev => {
            const updated = prev.map(t =>
                t.id === teacher.id ? { ...t, is_pinned: newPinned } : t
            )
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
                        <FontAwesomeIcon icon={faThumbtack} className="text-amber-400 rotate-[-45deg] text-[10px]" />
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
    }, [addToast])

    const handlePhotoUpload = useCallback(async (file) => {
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
    }, [addToast])

    // ── quick status ──────────────────────────────────────────────────────────
    const handleQuickStatus = useCallback(async (teacher, newStatus) => {
        try {
            const { error } = await supabase.from('teachers').update({ status: newStatus }).eq('id', teacher.id)
            if (error) throw error
            addToast(`Status ${teacher.name} → ${STATUS_CONFIG[newStatus].label}`, 'success')
            await logAudit({ action: 'UPDATE', source: 'OPERATIONAL', tableName: 'teachers', recordId: teacher.id, oldData: teacher, newData: { ...teacher, status: newStatus } })
            setQuickStatusId(null)
            fetchData()
            fetchStats()
        } catch {
            addToast('Gagal update status', 'error')
        }
    }, [fetchData, fetchStats, addToast])

    // ── profile ───────────────────────────────────────────────────────────────
    const openProfile = useCallback(async (teacher, tab = 'info') => {
        setProfileTeacher(teacher)
        setProfileStats(null)
        setProfileReports([])
        setProfileTab(tab)
        setLoadingProfile(true)
        setIsProfileOpen(true)
        try {
            const { data: reports } = await supabase.from('reports').select('id,created_at,points,description').eq('teacher_name', teacher.name).order('created_at', { ascending: false })
            if (reports) {
                const thisMonth = new Date()
                thisMonth.setDate(1)
                thisMonth.setHours(0, 0, 0, 0)
                setProfileReports(reports)
                setProfileStats({
                    total: reports.length,
                    monthly: reports.filter(r => new Date(r.created_at) >= thisMonth).length,
                    totalPts: reports.reduce((a, r) => a + (r.points || 0), 0),
                    posCount: reports.filter(r => (r.points || 0) > 0).length,
                    negCount: reports.filter(r => (r.points || 0) < 0).length
                })
            }
        } catch { } finally { setLoadingProfile(false) }
    }, [])

    // ── bulk ──────────────────────────────────────────────────────────────────
    const allPageIds = useMemo(() => teachers.map(t => t.id), [teachers])
    const allSelected = useMemo(() => allPageIds.length > 0 && allPageIds.every(id => selectedIds.includes(id)), [allPageIds, selectedIds])
    const someSelected = useMemo(() => selectedIds.length > 0 && !allSelected, [selectedIds, allSelected])
    const toggleSelectAll = useCallback(() => allSelected ? setSelectedIds(prev => prev.filter(id => !allPageIds.includes(id))) : setSelectedIds(prev => [...new Set([...prev, ...allPageIds])]), [allSelected, allPageIds])
    const toggleSelect = useCallback(id => setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]), [])

    const handleBulkArchive = useCallback(async () => {
        setSubmitting(true)
        try {
            const idsSnap = [...selectedIds]
            const { error } = await supabase.from('teachers').update({ deleted_at: new Date().toISOString() }).in('id', idsSnap)
            if (error) throw error
            addToast(`${idsSnap.length} guru diarsipkan`, 'success')
            await logAudit({ action: 'UPDATE', source: 'OPERATIONAL', tableName: 'teachers', newData: { bulk_archive: true, count: idsSnap.length, ids: idsSnap } })
            setSelectedIds([])
            setIsBulkModalOpen(false)
            fetchData()
            fetchStats()
        } catch {
            addToast('Gagal arsip massal', 'error')
        } finally {
            setSubmitting(false)
        }
    }, [selectedIds, fetchData, fetchStats, addToast])

    const bulkWATeachers = useMemo(() => teachers.filter(t => selectedIds.includes(t.id) && t.phone), [teachers, selectedIds])
    
    const startBulkWA = useCallback(() => {
        if (!bulkWATeachers.length) {
            addToast('Tidak ada guru terpilih dengan nomor WA', 'warning')
            return
        }
        setBulkWAIndex(0)
        setBulkWAResults({})
        setIsBulkWAOpen(true)
    }, [bulkWATeachers, addToast])

    const sendNextWA = useCallback(() => {
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
    }, [bulkWAIndex, bulkWATeachers, waTemplate])

    return {
        teachers, setTeachers, loading, setLoading, submitting, setSubmitting, totalRows, setTotalRows,
        subjectsList, setSubjectsList, classesList, setClassesList, stats, setStats, uploadingPhoto, setUploadingPhoto,
        searchQuery, setSearchQuery, debouncedSearch, filterSubject, setFilterSubject, filterGender, setFilterGender,
        filterStatus, setFilterStatus, filterType, setFilterType, filterMissing, setFilterMissing, sortBy, setSortBy,
        page, setPage, jumpPage, setJumpPage, showAdvFilter, setShowAdvFilter, pageSize, setPageSize,
        visibleCols, setVisibleCols, isColMenuOpen, setIsColMenuOpen, menuPos, setMenuPos, colMenuRef,
        isPrivacyMode, setIsPrivacyMode, isShortcutOpen, setIsShortcutOpen, isHeaderMenuOpen, setIsHeaderMenuOpen,
        isModalOpen, setIsModalOpen, isArchiveModalOpen, setIsArchiveModalOpen, isArchivedOpen, setIsArchivedOpen,
        isProfileOpen, setIsProfileOpen, isImportModalOpen, setIsImportModalOpen, isExportModalOpen, setIsExportModalOpen,
        isBulkModalOpen, setIsBulkModalOpen, isBulkWAOpen, setIsBulkWAOpen, selectedItem, setSelectedItem,
        teacherToAction, setTeacherToAction, profileTeacher, setProfileTeacher, profileStats, setProfileStats,
        profileReports, setProfileReports, loadingProfile, setLoadingProfile, profileTab, setProfileTab,
        archivedTeachers, setArchivedTeachers, loadingArchived, setLoadingArchived, selectedIds, setSelectedIds,
        bulkWAIndex, setBulkWAIndex, bulkWAResults, setBulkWAResults, waTemplate, setWaTemplate,
        quickStatusId, setQuickStatusId, quickStatusRef, headerMenuBtnRef, shortcutBtnRef, headerMenuRect,
        setHeaderMenuRect, shortcutRect, setShortcutRect, headerMenuMounted, setHeaderMenuMounted,
        statsScrollRef, activeStatIdx, setActiveStatIdx,
        activeFilterCount, hasActiveFilters, resetAllFilters, fetchData, fetchStats,
        handleAdd, handleEdit, handleSubmit, handleArchive, handleRestore, fetchArchived,
        handleTogglePin, handlePhotoUpload, handleQuickStatus, openProfile,
        allPageIds, allSelected, someSelected, toggleSelectAll, toggleSelect, handleBulkArchive,
        bulkWATeachers, startBulkWA, sendNextWA
    }
}
