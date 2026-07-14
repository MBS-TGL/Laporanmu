import { useState, useMemo, useEffect, useCallback, useRef, useDeferredValue } from 'react'
import { supabase } from '@lib/supabase'
import { logAudit } from '@utils/auditLogger'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faThumbtack } from '@fortawesome/free-solid-svg-icons'
import { RiskThreshold, calculateCompleteness } from '@features/students/utils/studentsConstants'
import { generateStudentPDF as _generateStudentPDF, handlePrintThermal as _handlePrintThermal, handleSavePNG as _handleSavePNG } from '@features/students/utils/studentPdfUtils'
import { useAuth } from '@context/Auth'

export function useStudentsCore({ addToast, addUndoToast }) {
    const navigate = useNavigate()
    const { profile } = useAuth()

    const [searchParams, setSearchParams] = useSearchParams()

    // ---- STATE: CORE DATA ----
    const [students, setStudents] = useState([])
    const [classesList, setClassesList] = useState([])
    const [loading, setLoading] = useState(true)
    const [globalStats, setGlobalStats] = useState({
        total: 0, boys: 0, girls: 0, avgPoints: 0, risk: 0,
        worstClass: null, topPerformer: null, incompleteCount: 0,
        noPhoneCount: 0, avgPointsLastWeek: null
    })
    const [totalRows, setTotalRows] = useState(0)

    // ---- STATE: FILTERING & SEARCH ----
    const [searchQuery, setSearchQuery] = useState('')
    const [filterClass, setFilterClass] = useState('')
    const [filterClasses, setFilterClasses] = useState([])
    const [filterGender, setFilterGender] = useState('')
    const [filterStatus, setFilterStatus] = useState('')
    const [filterTag, setFilterTag] = useState('')
    const [filterMissing, setFilterMissing] = useState('')
    const [sortBy, setSortBy] = useState('name_asc')
    const [filterPointMode, setFilterPointMode] = useState('')
    const [filterPointMin, setFilterPointMin] = useState('')
    const [filterPointMax, setFilterPointMax] = useState('')
    const [showAdvancedFilter, setShowAdvancedFilter] = useState(false)
    const [debouncedSearch, setDebouncedSearch] = useState('')

    // ---- STATE: MODALS & UI ----
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false)
    const [activeModal, setActiveModal] = useState(null)
    const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false)
    const [isShortcutOpen, setIsShortcutOpen] = useState(false)
    const [photoZoom, setPhotoZoom] = useState(null)
    const [isPrivacyMode, setIsPrivacyMode] = useState(false)

    // ---- STATE: ACTION CONTEXT ----
    const [selectedStudent, setSelectedStudent] = useState(null)
    const [studentToDelete, setStudentToDelete] = useState(null)
    const [selectedStudentIds, setSelectedStudentIds] = useState([])
    const [submitting, setSubmitting] = useState(false)
    const [newlyCreatedStudent, setNewlyCreatedStudent] = useState(null)

    // ---- STATE: BULK ACTIONS ----
    const [bulkClassId, setBulkClassId] = useState('')
    const [bulkTagAction, setBulkTagAction] = useState('add')
    const [bulkPointValue, setBulkPointValue] = useState(0)
    const [bulkPointLabel, setBulkPointLabel] = useState('')
    const [bulkRoomId, setBulkRoomId] = useState('')

    // ---- STATE: PROFILE / DETAIL ----
    const [behaviorHistory, setBehaviorHistory] = useState([])
    const [raportHistory, setRaportHistory] = useState([])
    const [profileTab, setProfileTab] = useState('info')
    const [timelineFilter, setTimelineFilter] = useState('all')
    const [timelineVisible, setTimelineVisible] = useState(8)
    const [auditLogs, setAuditLogs] = useState([])
    const [loadingAudit, setLoadingAudit] = useState(false)
    const [loadingHistory, setLoadingHistory] = useState(false)

    // ---- STATE: ARCHIVE & HISTORY ----
    const [archivedStudents, setArchivedStudents] = useState([])
    const [loadingArchived, setLoadingArchived] = useState(false)
    const [classHistory, setClassHistory] = useState([])
    const [loadingClassHistory, setLoadingClassHistory] = useState(false)

    // ---- SYNC FILTERS TO URL ----
    useEffect(() => {
        const q = searchParams.get('q') || ''
        const c = searchParams.get('c') || ''
        const g = searchParams.get('g') || ''
        const s = searchParams.get('s') || ''
        const t = searchParams.get('t') || ''

        if (q) setSearchQuery(q)
        if (c) setFilterClass(c)
        if (g) setFilterGender(g)
        if (s) setFilterStatus(s)
        if (t) setFilterTag(t)

        const sortByParam = searchParams.get('sort')
        if (sortByParam) setSortBy(sortByParam)
    }, [])

    useEffect(() => {
        const params = {}
        if (searchQuery) params.q = searchQuery
        if (filterClass) params.c = filterClass
        if (filterGender) params.g = filterGender
        if (filterStatus) params.s = filterStatus
        if (filterTag) params.t = filterTag
        if (sortBy !== 'name_asc') params.sort = sortBy

        // Clean URL by removing empty params
        Object.keys(params).forEach(key => !params[key] && delete params[key])

        // Only update if something changed to avoid infinity loops
        const current = Object.fromEntries(searchParams.entries())
        if (JSON.stringify(current) !== JSON.stringify(params)) {
            setSearchParams(params, { replace: true })
        }
    }, [searchQuery, filterClass, filterGender, filterStatus, filterTag, sortBy])

    // ---- STATE: OTHERS ----
    const [isInlineAddOpen, setIsInlineAddOpen] = useState(false)
    const [inlineForm, setInlineForm] = useState({ name: '', gender: 'L', class_id: '', phone: '', nisn: '', nis: '', kamar: '' })
    const [submittingInline, setSubmittingInline] = useState(false)
    const [uploadingPhoto, setUploadingPhoto] = useState(false)
    const [classBreakdownData, setClassBreakdownData] = useState(null)
    const [loadingBreakdown, setLoadingBreakdown] = useState(false)
    const [resetPointsClassId, setResetPointsClassId] = useState('')
    const [resettingPoints, setResettingPoints] = useState(false)
    const [resettingPin, setResettingPin] = useState(false)
    const [bulkPhotoFiles, setBulkPhotoFiles] = useState([])
    const [bulkPhotoMatches, setBulkPhotoMatches] = useState([])
    const [matchingPhotos, setMatchingPhotos] = useState(false)
    const [uploadingBulkPhotos, setUploadingBulkPhotos] = useState(false)
    const [allStudentsForBulk, setAllStudentsForBulk] = useState([])
    const [broadcastTemplate, setBroadcastTemplate] = useState('summary')
    const [customWaMsg, setCustomWaMsg] = useState('')
    const [broadcastIndex, setBroadcastIndex] = useState(-1)
    const [broadcastResults, setBroadcastResults] = useState({})
    const [allUsedTags, setAllUsedTags] = useState([])
    const [tagStats, setTagStats] = useState({})
    const [lastReportMap, setLastReportMap] = useState({})
    const [pendingArchive, setPendingArchive] = useState(null)
    const [gSheetsUrl, setGSheetsUrl] = useState('')
    const [fetchingGSheets, setFetchingGSheets] = useState(false)
    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(10)
    const [jumpPage, setJumpPage] = useState('')
    const [generatingPdf, setGeneratingPdf] = useState(false)
    const [duplicateWarning, setDuplicateWarning] = useState(null)
    const [checkingDuplicate, setCheckingDuplicate] = useState(false)
    const [newTagInput, setNewTagInput] = useState('')
    const [tagToEdit, setTagToEdit] = useState(null)
    const [studentForTags, setStudentForTags] = useState(null)
    const [renameInput, setRenameInput] = useState('')
    const [archivePage, setArchivePage] = useState(1)
    const [archivePageSize, setArchivePageSize] = useState(15)
    const [loadingRaport, setLoadingRaport] = useState(false)

    // ---- REFS ----
    const formDataRef = useRef({
        name: '', gender: 'L', class_id: '', phone: '', photo_url: '',
        nisn: '', nis: '', nik: '', birth_date: '', birth_place: '',
        religion: '', address: '',
        guardian_name: '', guardian_relation: 'Ayah',
        status: 'aktif', tags: []
    })
    const importFileInputRef = useRef(null)
    const photoInputRef = useRef(null)
    const searchInputRef = useRef(null)
    const headerMenuRef = useRef(null)
    const shortcutRef = useRef(null)
    const cardCaptureRef = useRef(null)

    // ---- COMPUTED ----
    const selectedIdSet = useMemo(() => new Set(selectedStudentIds), [selectedStudentIds])
    const selectedStudents = useMemo(() => {
        if (!selectedStudentIds.length) return []
        return students.filter((s) => selectedIdSet.has(s.id))
    }, [students, selectedIdSet, selectedStudentIds.length])
    const selectedStudentsWithPhone = useMemo(() => selectedStudents.filter((s) => s.phone), [selectedStudents])

    const activeFilterCount = useMemo(() =>
        [filterClass, filterClasses.length > 0 ? 'multi' : '', filterGender, filterStatus, filterTag, filterPointMode, filterMissing, debouncedSearch].filter(Boolean).length
        , [filterClass, filterClasses.length, filterGender, filterStatus, filterTag, filterPointMode, filterMissing, debouncedSearch])

    const isAnyModalOpen = useMemo(() =>
        !!(isModalOpen || !!activeModal || isPrintModalOpen || photoZoom)
        , [isModalOpen, activeModal, isPrintModalOpen, photoZoom])

    const allSelected = students.length > 0 && selectedStudentIds.length === students.length
    const someSelected = selectedStudentIds.length > 0 && selectedStudentIds.length < students.length

    // ---- EFFECTS ----
    // Debounce sudah dilakukan di StudentsPage (inputValue → searchQuery 350ms)
    // Di sini cukup pakai useDeferredValue untuk prioritas React, tanpa delay tambahan
    const deferredSearchQuery = useDeferredValue(searchQuery)
    useEffect(() => {
        setDebouncedSearch(deferredSearchQuery.trim())
    }, [deferredSearchQuery])

    useEffect(() => {
        try {
            const saved = localStorage.getItem('students_filters')
            if (saved) {
                const f = JSON.parse(saved)
                if (f.filterGender) setFilterGender(f.filterGender)
                if (f.filterStatus) setFilterStatus(f.filterStatus)
                if (f.filterTag) setFilterTag(f.filterTag)
                if (f.sortBy) setSortBy(f.sortBy)
                if (f.pageSize) setPageSize(f.pageSize)
            }
        } catch { /* ignore */ }
    }, [])

    useEffect(() => {
        try {
            localStorage.setItem('students_filters', JSON.stringify({
                filterGender, filterStatus, filterTag, sortBy, pageSize,
            }))
        } catch { /* ignore */ }
    }, [filterGender, filterStatus, filterTag, sortBy, pageSize])

    // ---- FUNCTIONS: LOAD DATA ----
    const fetchStats = useCallback(async (invalidateCache = false) => {
        // Kalau explicit refresh, reset cache ranking & trend
        if (invalidateCache) {
            rankingsFetchedRef.current = false
            trendMapRef.current = {}
            lastReportMapRef.current = {}
            setLastReportMap({})
        }
        try {
            const { data: statsData } = await supabase
                .from('students')
                .select('id, name, gender, total_points, class_id, photo_url, phone, nisn, metadata, classes(name)')
                .is('deleted_at', null)
            if (!statsData) return
            const total = statsData.length
            const boys = statsData.filter(s => s.gender === 'L').length
            const girls = statsData.filter(s => s.gender === 'P').length
            const risk = statsData.filter(s => (s.total_points || 0) < RiskThreshold).length
            const avgPoints = total > 0
                ? Math.round(statsData.reduce((acc, s) => acc + (s.total_points || 0), 0) / total)
                : 0
            const incompleteCount = statsData.filter(s => calculateCompleteness(s) < 80).length
            const noPhoneCount = statsData.filter(s => !s.phone).length

            const sorted = [...statsData].sort((a, b) => (b.total_points || 0) - (a.total_points || 0))
            const topPerformer = sorted[0] && (sorted[0].total_points || 0) > 0
                ? { name: sorted[0].name, points: sorted[0].total_points, className: sorted[0].classes?.name || '' }
                : null

            const classBuckets = {}
            statsData.forEach(s => {
                const cn = s.classes?.name || 'Tanpa Kelas'
                if (!classBuckets[cn]) classBuckets[cn] = []
                classBuckets[cn].push(s.total_points || 0)
            })
            let worstClass = null, worstAvg = 0
            Object.entries(classBuckets).forEach(([name, pts]) => {
                const avg = pts.reduce((a, b) => a + b, 0) / pts.length
                if (avg < worstAvg) { worstAvg = avg; worstClass = { name, avg: Math.round(avg), count: pts.length } }
            })

            let avgPointsLastWeek = null
            try {
                const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
                const { data: recentReports } = await supabase
                    .from('reports')
                    .select('points, created_at')
                    .gte('created_at', oneWeekAgo)
                if (recentReports && recentReports.length > 0) {
                    const weeklyDelta = recentReports.reduce((acc, r) => acc + (r.points || 0), 0)
                    avgPointsLastWeek = Math.round(weeklyDelta / (total || 1))
                }
            } catch { /* ignore */ }

            setGlobalStats({ total, boys, girls, avgPoints, risk, worstClass, topPerformer, incompleteCount, noPhoneCount, avgPointsLastWeek })
        } catch (err) {
            console.error('Fetch stats error:', err)
        }
    }, [])

    // ---- REFS: CACHE DATA YANG JARANG BERUBAH ----
    // Rankings & trend tidak perlu refetch setiap search/filter
    const rankingsRef = useRef({})
    const trendMapRef = useRef({})
    const lastReportMapRef = useRef({})
    const rankingsFetchedRef = useRef(false)

    const fetchRankingsAndTrends = useCallback(async (ids) => {
        // Fetch rankings sekali saja per session
        if (!rankingsFetchedRef.current) {
            try {
                const { data, error: rpcErr } = await supabase.rpc('get_student_rankings')
                if (!rpcErr && data) {
                    rankingsRef.current = Object.fromEntries((data || []).map((r, i) => [r.id, r.student_rank || (i + 1)]))
                }
            } catch { }
            rankingsFetchedRef.current = true
        }

        // Fetch trend hanya untuk IDs yang belum ada di cache
        const uncachedIds = ids.filter(id => !(id in trendMapRef.current))
        if (uncachedIds.length > 0) {
            try {
                const { data: reportsData } = await supabase
                    .from('reports')
                    .select('student_id, created_at, points')
                    .in('student_id', uncachedIds)
                    .order('created_at', { ascending: false })

                const newLastReportMap = { ...lastReportMapRef.current };

                // Group points by student
                const studentPointsMap = {};
                (reportsData || []).forEach(r => {
                    if (!studentPointsMap[r.student_id]) studentPointsMap[r.student_id] = []
                    if (studentPointsMap[r.student_id].length < 5) studentPointsMap[r.student_id].push(r.points)
                });

                Object.entries(studentPointsMap).forEach(([sid, pts]) => {
                    const latest = pts[0] || 0
                    trendMapRef.current[sid] = {
                        trend: latest > 0 ? 'up' : latest < 0 ? 'down' : 'neutral',
                        history: pts.reverse() // Reverse so it's chronologically left-to-right
                    }
                })

                    // Get latest report timestamps
                    (reportsData || []).forEach(r => {
                        if (!newLastReportMap[r.student_id]) newLastReportMap[r.student_id] = r.created_at
                    })

                // Siswa tanpa report = neutral
                uncachedIds.forEach(id => {
                    if (!(id in trendMapRef.current)) trendMapRef.current[id] = { trend: 'neutral', history: [] }
                })

                lastReportMapRef.current = newLastReportMap
                setLastReportMap(newLastReportMap)
            } catch { }
        }
    }, [])

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const { data: classesData } = await supabase.from('classes').select('*').order('name', { ascending: true })
            if (classesData) setClassesList(classesData)

            let q = supabase.from('students').select(`*, classes (name)`, { count: 'exact' }).is('deleted_at', null)
            if (filterClasses.length > 0) q = q.in('class_id', filterClasses)
            else if (filterClass) q = q.eq('class_id', filterClass)
            if (filterGender) q = q.eq('gender', filterGender)
            if (filterStatus) q = q.eq('status', filterStatus)
            if (filterTag) q = q.contains('tags', [filterTag])
            if (filterMissing === 'photo') q = q.or('photo_url.is.null,photo_url.eq.""')
            else if (filterMissing === 'wa') q = q.or('phone.is.null,phone.eq.""')
            else if (filterMissing === 'all') q = q.or('photo_url.is.null,photo_url.eq."",phone.is.null,phone.eq."",nisn.is.null,nisn.eq.""')

            if (debouncedSearch) {
                const s = debouncedSearch.replace(/%/g, '\\%').replace(/_/g, '\\_')
                q = q.or(`name.ilike.%${s}%,registration_code.ilike.%${s}%,nisn.ilike.%${s}%,phone.ilike.%${s}%`)
            }

            if (filterPointMode === 'risk') q = q.lt('total_points', RiskThreshold)
            else if (filterPointMode === 'positive') q = q.gt('total_points', 0)
            else if (filterPointMode === 'custom') {
                if (filterPointMin !== '') q = q.gte('total_points', Number(filterPointMin))
                if (filterPointMax !== '') q = q.lte('total_points', Number(filterPointMax))
            }

            if (sortBy === 'name_asc') q = q.order('name', { ascending: true })
            else if (sortBy === 'name_desc') q = q.order('name', { ascending: false })
            else if (sortBy === 'class_asc') q = q.order('class_id', { ascending: true }).order('name', { ascending: true })
            else if (sortBy === 'points_desc') q = q.order('total_points', { ascending: false, nullsFirst: false })
            else if (sortBy === 'points_asc') q = q.order('total_points', { ascending: true, nullsFirst: false })
            else if (sortBy === 'updated_desc') q = q.order('updated_at', { ascending: false })
            else q = q.order('name', { ascending: true })

            const from = (page - 1) * pageSize
            const to = from + pageSize - 1
            q = q.range(from, to)

            const { data: studentsData, count } = await q
            setTotalRows(count || 0)

            const ids = (studentsData || []).map(s => s.id)

            // Fetch rankings & trends dari cache (hanya hit DB untuk data baru)
            await fetchRankingsAndTrends(ids)

            const transformed = (studentsData || []).map(s => {
                const pts = s.total_points ?? 0
                const trendInfo = trendMapRef.current[s.id] || { trend: 'neutral', history: [] }
                return {
                    ...s,
                    className: s.classes?.name || '-',
                    code: s.registration_code,
                    points: pts,
                    trend: trendInfo.trend,
                    trendHistory: trendInfo.history,
                    _rank: rankingsRef.current[s.id] || '-',
                    is_pinned: s.is_pinned || false,
                }
            })

            transformed.sort((a, b) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0))
            setStudents(transformed)
        } catch (err) {
            console.error('Fetch error:', err)
            addToast('Gagal memuat data dari database', 'error')
        } finally {
            setLoading(false)
        }
    }, [page, pageSize, sortBy, filterGender, filterStatus, filterTag, filterMissing, debouncedSearch, filterClasses, filterClass, filterPointMode, filterPointMin, filterPointMax, addToast, fetchRankingsAndTrends])


    // ---- FUNCTIONS: BASIC CRUD ----
    const generateCode = useCallback(() => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
        const part1 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
        const part2 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
        return `REG-${part1}-${part2}`
    }, [])

    const closeModal = useCallback(() => setActiveModal(null), [])

    const handleAdd = useCallback(() => {
        setSelectedStudent(null)
        formDataRef.current = {
            name: '', gender: 'L', class_id: '', phone: '', photo_url: '',
            nisn: '', nis: '', nik: '', birth_date: '', birth_place: '',
            religion: '', address: '',
            guardian_name: '', guardian_relation: 'Ayah',
            status: 'aktif', tags: []
        }
        setIsModalOpen(true)
    }, [])

    const handleEdit = useCallback((student) => {
        setSelectedStudent(student)
        formDataRef.current = {
            name: student.name,
            gender: student.gender || 'L',
            class_id: student.class_id || '',
            phone: student.phone || '',
            photo_url: student.photo_url || '',
            nisn: student.nisn || '',
            nis: student.nis || '',
            nik: student.nik || '',
            birth_date: student.birth_date || '',
            birth_place: student.birth_place || '',
            religion: student.religion || '',
            address: student.address || '',
            guardian_name: student.guardian_name || '',
            guardian_relation: student.guardian_relation || 'Ayah',
            status: student.status || 'aktif',
            tags: student.tags || [],
        }
        setIsModalOpen(true)
    }, [])

    const confirmDelete = (student) => {
        setStudentToDelete(student)
        setActiveModal('delete')
    }

    const executeDelete = useCallback(async () => {
        if (!studentToDelete) return
        closeModal()
        const student = studentToDelete
        setStudentToDelete(null)

        setStudents(prev => prev.filter(s => s.id !== student.id))

        const timerId = setTimeout(async () => {
            try {
                const { error } = await supabase
                    .from('students')
                    .update({ deleted_at: new Date().toISOString() })
                    .eq('id', student.id)
                if (error) throw error
                await logAudit({
                    action: 'UPDATE', source: 'SYSTEM', tableName: 'students', recordId: student.id,
                    oldData: student, newData: { ...student, deleted_at: new Date().toISOString() }
                })
                fetchData()
                fetchStats()
            } catch {
                addToast('Gagal mengarsipkan siswa', 'error')
                fetchData()
            } finally {
                setPendingArchive(null)
            }
        }, 4000)

        setPendingArchive({ student, timerId })

        addUndoToast(
            `${student.name} diarsipkan`,
            () => {
                clearTimeout(timerId)
                setPendingArchive(null)
                fetchData()
                addToast(`${student.name} dibatalkan`, 'success')
            }
        )
    }, [studentToDelete, fetchData, fetchStats, addToast, addUndoToast])

    const handleSubmit = useCallback(async (formData) => {
        if (!formData.name || formData.name.trim().length < 3 || !formData.class_id) {
            addToast('Nama (min 3 karakter) dan kelas wajib diisi', 'warning')
            return
        }

        setSubmitting(true)
        try {
            if (selectedStudent && selectedStudent.id) {
                const { error } = await supabase
                    .from('students')
                    .update({
                        name: formData.name,
                        gender: formData.gender,
                        class_id: formData.class_id,
                        phone: formData.phone,
                        photo_url: formData.photo_url,
                        nisn: formData.nisn || null,
                        nis: formData.nis || null,
                        nik: formData.nik || null,
                        birth_date: formData.birth_date || null,
                        birth_place: formData.birth_place || null,
                        religion: formData.religion || null,
                        address: formData.address || null,
                        guardian_name: formData.guardian_name || null,
                        guardian_relation: formData.guardian_relation || null,
                        status: formData.status || 'aktif',
                        tags: formData.tags || [],
                        metadata: formData.metadata || {},
                    })
                    .eq('id', selectedStudent.id)
                if (error) throw error

                if (formData.class_id !== selectedStudent.class_id) {
                    await supabase.from('student_class_history').insert([{
                        student_id: selectedStudent.id,
                        from_class_id: selectedStudent.class_id,
                        to_class_id: formData.class_id,
                        changed_at: new Date().toISOString(),
                        note: 'Diubah manual'
                    }])
                }

                await logAudit({
                    action: 'UPDATE', source: 'SYSTEM', tableName: 'students', recordId: selectedStudent.id,
                    oldData: selectedStudent,
                    newData: { ...selectedStudent, ...formData }
                })
                addToast('Data siswa berhasil diperbarui', 'success')
            } else {
                const newCode = generateCode()
                const newPin = String(Math.floor(1000 + Math.random() * 9000))
                const newStudentData = {
                    registration_code: newCode,
                    pin: newPin,
                    total_points: 0,
                    name: formData.name,
                    gender: formData.gender,
                    class_id: formData.class_id,
                    phone: formData.phone,
                    photo_url: formData.photo_url,
                    nisn: formData.nisn || null,
                    nis: formData.nis || null,
                    nik: formData.nik || null,
                    birth_date: formData.birth_date || null,
                    birth_place: formData.birth_place || null,
                    religion: formData.religion || null,
                    address: formData.address || null,
                    guardian_name: formData.guardian_name || null,
                    guardian_relation: formData.guardian_relation || null,
                    status: formData.status || 'aktif',
                    tags: formData.tags || [],
                    metadata: formData.metadata || {},
                }
                const { data: insData, error } = await supabase.from('students').insert([newStudentData]).select('id').single()
                if (error) throw error
                await logAudit({
                    action: 'INSERT', source: 'SYSTEM', tableName: 'students', recordId: insData?.id,
                    newData: newStudentData
                })

                const studentToView = {
                    ...newStudentData,
                    code: newCode,
                    className: classesList.find(c => c.id === formData.class_id)?.name || '-'
                }
                setNewlyCreatedStudent(studentToView)
                setSelectedStudent(studentToView)
                setIsPrintModalOpen(true)
                addToast('Siswa berhasil didaftarkan', 'success')
            }
            setIsModalOpen(false)
            fetchData()
            fetchStats()
        } catch (err) {
            console.error('Submit error:', err)
            addToast('Gagal menyimpan data', 'error')
        } finally {
            setSubmitting(false)
        }
    }, [selectedStudent, fetchData, fetchStats, addToast, generateCode, classesList])

    // ---- FUNCTIONS: BULK ACTIONS ----
    const toggleSelectAll = useCallback(() => {
        setSelectedStudentIds(prev => prev.length === students.length ? [] : students.map(s => s.id))
    }, [students])

    const toggleSelectStudent = useCallback((id) => {
        setSelectedStudentIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
    }, [])

    const handleBulkPromote = async () => {
        if (!bulkClassId) return addToast('Pilih kelas tujuan terlebih dahulu', 'warning')
        setSubmitting(true)
        const idsToMove = [...selectedStudentIds]
        const count = idsToMove.length
        try {
            const { data: prevData } = await supabase.from('students').select('id, class_id').in('id', idsToMove)
            const prevClassMap = Object.fromEntries((prevData || []).map(s => [s.id, s.class_id]))
            const { error } = await supabase.from('students').update({ class_id: bulkClassId }).in('id', idsToMove)
            if (error) throw error
            closeModal()
            setSelectedStudentIds([])
            fetchData()
            fetchStats()
            await logAudit({
                action: 'UPDATE',
                source: 'SYSTEM',
                tableName: 'students',
                newData: {
                    bulk_promote: true,
                    count,
                    to_class_id: bulkClassId,
                    ids: idsToMove,
                    prev_classes: prevClassMap
                }
            })
            addUndoToast(`${count} siswa dipindahkan`, async () => {
                await Promise.all(idsToMove.map(id => supabase.from('students').update({ class_id: prevClassMap[id] }).eq('id', id)))
                fetchData()
                addToast('Dibatalkan', 'success')
            })
        } catch { addToast('Gagal', 'error') } finally { setSubmitting(false) }
    }

    const handleBulkDelete = async () => {
        if (!selectedStudentIds.length) return
        setSubmitting(true)
        const idsToDelete = [...selectedStudentIds]
        try {
            const { error } = await supabase.from('students').update({ deleted_at: new Date().toISOString() }).in('id', idsToDelete)
            if (error) throw error
            closeModal()
            setSelectedStudentIds([])
            fetchData()
            await logAudit({
                action: 'UPDATE',
                source: 'SYSTEM',
                tableName: 'students',
                newData: {
                    bulk_archive: true,
                    count: idsToDelete.length,
                    ids: idsToDelete
                }
            })
            addUndoToast(`${idsToDelete.length} siswa diarsipkan`, async () => {
                await supabase.from('students').update({ deleted_at: null }).in('id', idsToDelete)
                fetchData()
            })
        } catch { addToast('Gagal', 'error') } finally { setSubmitting(false) }
    }

    const handleBulkPointUpdate = async () => {
        if (!bulkPointValue || selectedStudentIds.length === 0) return
        setSubmitting(true)
        const idsToUpdate = [...selectedStudentIds]
        const count = idsToUpdate.length
        const pointDelta = bulkPointValue
        try {
            const { data: prevData } = await supabase.from('students').select('id, total_points').in('id', idsToUpdate)
            const prevPointMap = Object.fromEntries((prevData || []).map(s => [s.id, s.total_points || 0]))

            const updates = idsToUpdate.map(async (sid) => {
                const oldPoints = prevPointMap[sid] ?? 0
                const newPoints = oldPoints + pointDelta
                await supabase.from('students').update({ total_points: newPoints }).eq('id', sid)
                return supabase.from('point_history').insert([{
                    student_id: sid,
                    points: pointDelta,
                    label: bulkPointLabel || 'Aksi Massal',
                    created_at: new Date().toISOString()
                }])
            })

            await Promise.all(updates)
            await logAudit({
                action: 'UPDATE', source: 'OPERATIONAL', tableName: 'students',
                newData: { bulk_point_update: true, count: idsToUpdate.length, delta: pointDelta, label: bulkPointLabel || 'Aksi Massal' }
            })
            fetchData()
            closeModal()
            setBulkPointValue(0)
            setBulkPointLabel('')
            setSelectedStudentIds([])
            addUndoToast(`${count} siswa: poin ${pointDelta > 0 ? '+' : ''}${pointDelta}`, async () => {
                await Promise.all(idsToUpdate.map(id => supabase.from('students').update({ total_points: prevPointMap[id] }).eq('id', id)))
                fetchData()
                fetchStats()
            })
        } catch { addToast('Gagal', 'error') } finally { setSubmitting(false) }
    }

    const handleBulkRoomAssign = async () => {
        if (!bulkRoomId || selectedStudentIds.length === 0) return addToast('Pilih kamar terlebih dahulu', 'warning')
        setSubmitting(true)
        const idsToUpdate = [...selectedStudentIds]
        const count = idsToUpdate.length
        const roomVal = bulkRoomId
        try {
            // Fetch current metadata untuk preserve existing fields
            const { data: prevData } = await supabase.from('students').select('id, metadata').in('id', idsToUpdate)
            const prevMetaMap = Object.fromEntries((prevData || []).map(s => [s.id, s.metadata || {}]))

            const updates = idsToUpdate.map(id =>
                supabase.from('students').update({
                    metadata: { ...prevMetaMap[id], kamar: roomVal === '-' ? '' : roomVal }
                }).eq('id', id)
            )
            await Promise.all(updates)
            await logAudit({
                action: 'UPDATE', source: 'SYSTEM', tableName: 'students',
                newData: { bulk_room_assign: true, count, room: roomVal, ids: idsToUpdate }
            })
            closeModal()
            setBulkRoomId('')
            setSelectedStudentIds([])
            fetchData()
            addUndoToast(`${count} siswa → Kamar ${roomVal === '-' ? 'dikosongkan' : roomVal}`, async () => {
                await Promise.all(idsToUpdate.map(id =>
                    supabase.from('students').update({ metadata: prevMetaMap[id] }).eq('id', id)
                ))
                fetchData()
                addToast('Dibatalkan', 'success')
            })
        } catch { addToast('Gagal menetapkan kamar', 'error') } finally { setSubmitting(false) }
    }

    // ---- FUNCTIONS: ARCHIVE ----
    const fetchArchivedStudents = async () => {
        setLoadingArchived(true)
        try {
            const { data, error } = await supabase.from('students').select(`*, classes(name)`).not('deleted_at', 'is', null).order('deleted_at', { ascending: false })
            if (error) throw error
            setArchivedStudents((data || []).map(s => ({ ...s, className: s.classes?.name || '-' })))
        } catch { addToast('Gagal memuat arsip', 'error') } finally { setLoadingArchived(false) }
    }

    const handleRestoreStudent = async (student) => {
        try {
            const { error } = await supabase.from('students').update({ deleted_at: null }).eq('id', student.id)
            if (error) throw error
            addToast(`${student.name} berhasil dipulihkan`, 'success')
            await logAudit({
                action: 'UPDATE',
                source: 'SYSTEM',
                tableName: 'students',
                recordId: student.id,
                oldData: student,
                newData: { ...student, deleted_at: null, restored: true }
            })
            fetchArchivedStudents(); fetchData(); fetchStats()
        } catch { addToast('Gagal memulihkan', 'error') }
    }

    const handlePermanentDelete = async (student) => {
        if (!window.confirm(`Hapus permanen "${student.name}"?`)) return
        try {
            const { error } = await supabase.from('students').delete().eq('id', student.id)
            if (error) throw error
            addToast(`${student.name} dihapus permanen`, 'success')
            await logAudit({
                action: 'DELETE',
                source: 'SYSTEM',
                tableName: 'students',
                recordId: student.id,
                oldData: student
            })
            fetchArchivedStudents()
        } catch { addToast('Gagal hapus', 'error') }
    }

    // ---- FUNCTIONS: TAGS ----
    const fetchUsedTags = useCallback(async () => {
        try {
            const { data } = await supabase.from('students').select('tags').is('deleted_at', null)
            if (data) {
                const stats = {}, unique = []
                data.forEach(s => (s.tags || []).forEach(t => {
                    stats[t] = (stats[t] || 0) + 1
                    if (!unique.includes(t)) unique.push(t)
                }))
                setAllUsedTags(unique.sort())
                setTagStats(stats)
            }
        } catch { }
    }, [])

    const handleToggleTag = async (student, tag) => {
        if (!tag || !student) return
        const current = student.tags || []
        const isRemoving = current.includes(tag)
        const next = isRemoving ? current.filter(t => t !== tag) : [...current, tag]
        
        // Optimistic Update: Update UI immediately
        setStudentForTags({ ...student, tags: next })
        
        try {
            const { error } = await supabase.from('students').update({ tags: next }).eq('id', student.id)
            if (error) throw error
            
            addToast(`Label ${isRemoving ? 'dilepas' : 'disematkan'}`, 'success')
            await logAudit({
                action: 'UPDATE', source: 'MASTER', tableName: 'students',
                recordId: student.id,
                oldData: { tags: current },
                newData: { tags: next }
            })
            fetchData(); fetchUsedTags()
        } catch (err) { 
            console.error('Toggle tag error:', err)
            addToast('Gagal memperbarui label', 'error')
            // Rollback on error
            setStudentForTags(student)
        }
    }

    const handleBulkTagApply = async (tag) => {
        if (!tag || selectedStudentIds.length === 0) return
        setSubmitting(true)
        try {
            const { data } = await supabase.from('students').select('id, tags').in('id', selectedStudentIds).is('deleted_at', null)
            const prevTagMap = Object.fromEntries((data || []).map(s => [s.id, s.tags || []]))
            if (data) {
                const updates = data.map(s => {
                    const current = s.tags || []
                    const next = bulkTagAction === 'add' ? Array.from(new Set([...current, tag])) : current.filter(t => t !== tag)
                    return supabase.from('students').update({ tags: next }).eq('id', s.id)
                })
                await Promise.all(updates)
                await logAudit({
                    action: 'UPDATE', source: 'MASTER', tableName: 'students',
                    newData: { bulk_tag: true, action: bulkTagAction, tag, count: selectedStudentIds.length }
                })
                fetchData(); fetchUsedTags(); closeModal(); setSelectedStudentIds([])
                addUndoToast(`${selectedStudentIds.length} siswa diperbarui`, async () => {
                    await Promise.all(Object.keys(prevTagMap).map(id => supabase.from('students').update({ tags: prevTagMap[id] }).eq('id', id)))
                    fetchData(); fetchUsedTags()
                })
            }
        } catch { addToast('Gagal', 'error') } finally { setSubmitting(false) }
    }

    // ---- FUNCTIONS: PROFILE ACCESS ----
    const fetchBehaviorHistory = useCallback(async (studentId) => {
        setLoadingHistory(true)
        try {
            const { data } = await supabase.from('reports').select('*').eq('student_id', studentId).order('created_at', { ascending: false })
            setBehaviorHistory(data || [])
        } catch { setBehaviorHistory([]) } finally { setLoadingHistory(false) }
    }, [])

    const fetchRaportHistory = useCallback(async (studentId) => {
        try {
            const { data } = await supabase.from('student_monthly_reports').select('*').eq('student_id', studentId).order('created_at', { ascending: false })
            setRaportHistory(data || [])
        } catch { setRaportHistory([]) }
    }, [])

    const handleViewProfile = (student, tab = 'info') => {
        setSelectedStudent(student); setBehaviorHistory([]); setRaportHistory([])
        setTimelineFilter('all'); setTimelineVisible(8); setProfileTab(tab)
        setActiveModal('profile')
        fetchBehaviorHistory(student.id); fetchRaportHistory(student.id)
    }

    const resetAllFilters = useCallback(() => {
        setSearchQuery(''); setFilterClass(''); setFilterClasses([])
        setFilterGender(''); setFilterStatus(''); setFilterTag('')
        setFilterMissing(''); setSortBy('name_asc'); setFilterPointMode('')
        setFilterPointMin(''); setFilterPointMax(''); setSelectedStudentIds([])
        localStorage.removeItem('students_filters')
    }, [])

    // ---- FUNCTIONS: WA BROADCAST ----
    const waTemplate = `*Laporan Perkembangan Ananda {nama}*

Saat ini, Ananda tercatat memiliki total *{poin} poin* perilaku.
Tetap semangat dalam meningkatkan kedisiplinan dan prestasi!

Salam,
Laporanmu System`

    const buildWAMessage = (student, templateId) => {
        let template = waTemplate
        if (templateId === 'general') template = `Assalamualaikum Wr. Wb.\n\nBapak/Ibu Wali dari Ananda *{nama}* ({kelas}).\n\n`
        else if (templateId === 'intro') template = `Assalamualaikum Wr. Wb.\n\nPerkenalkan, saya dari *Laporanmu*. Ini terkait Ananda *{nama}* ({kelas}).\n\n`
        else if (templateId === 'points') template = `*Laporan Poin Perilaku Ananda {nama}*\n\nSaat ini Ananda memiliki total *{poin} poin* di sistem Laporanmu.\n\n_Terus semangatkan kedisiplinan dan prestasi ananda._\n\nWassalam.`
        else if (templateId === 'security') template = `*PEMBERITAHUAN KEAMANAN*\n\nInformasi akses Portal Orang Tua untuk ananda {nama}:\nID Reg : {kode}\nPIN    : {pin}\nPortal : [URL]\n\n_Mohon jaga kerahasiaan PIN anda._`
        else if (templateId === 'custom') template = customWaMsg || 'Halo Bapak/Ibu wali dari {nama}.'

        return template
            .replace(/{nama}/g, student.name)
            .replace(/{kelas}/g, classesList.find(c => c.id === student.class_id)?.name || '-')
            .replace(/{poin}/g, String(student.points ?? student.total_points ?? 0))
            .replace(/{kode}/g, student.registration_code || student.code || '-')
            .replace(/{pin}/g, student.pin || '-')
            .replace(/\[URL\]/g, window.location.origin + '/check')
    }

    const openWAForStudent = (student, msg) => {
        const phone = (student.phone || '').replace(/\D/g, '').replace(/^0/, '62')
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank')
    }

    // ---- FUNCTIONS: MISC ACTIONS ----
    const handleQuickPoint = async (student, amount, reason) => {
        try {
            const next = (student.total_points || 0) + amount
            await supabase.from('students').update({ total_points: next }).eq('id', student.id)
            addToast(`${amount > 0 ? '+' : ''}${amount} poin untuk ${student.name}`, 'success')
            await logAudit({
                action: 'UPDATE', source: 'OPERATIONAL', tableName: 'students',
                recordId: student.id,
                oldData: { total_points: student.total_points || 0 },
                newData: { total_points: next, quick_point: true, reason: reason || '-' }
            })
            fetchData(); fetchStats()
        } catch { addToast('Gagal', 'error') }
    }

    const handleTogglePin = async (student) => {
        const next = !student.is_pinned
        setStudents(prev => prev.map(s => s.id === student.id ? { ...s, is_pinned: next } : s).sort((a, b) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0)))
        try {
            await supabase.from('students').update({ is_pinned: next }).eq('id', student.id)
            addToast(next ? `"${student.name}" disematkan` : `Semat dilepas`, 'success')
            await logAudit({
                action: 'UPDATE', source: 'OPERATIONAL', tableName: 'students',
                recordId: student.id,
                newData: { is_pinned: next, name: student.name }
            })
        } catch { fetchData(); addToast('Gagal', 'error') }
    }

    const handlePhotoUpload = async (file) => {
        if (!file) return null
        setUploadingPhoto(true)
        try {
            const fileName = `student_${Date.now()}.${file.name.split('.').pop()}`
            await supabase.storage.from('student-photo').upload(fileName, file)
            const { data } = supabase.storage.from('student-photo').getPublicUrl(fileName)
            return data.publicUrl
        } catch { return null } finally { setUploadingPhoto(false) }
    }

    const handleViewQR = (student) => {
        setSelectedStudent(student)
        // If an explicit QR modal state exists, set it. Otherwise fallback to activeModal.
        // Assuming activeModal is the generic handler if no specific state exists.
        setActiveModal('qr')
    }

    const handleViewPrint = (student) => {
        setSelectedStudent(student)
        setIsPrintModalOpen(true)
    }

    const pdfCallbacks = { addToast, setGeneratingPdf }
    const generateStudentPDF = useCallback((targets, captureRef = null) => _generateStudentPDF(targets, captureRef, pdfCallbacks), [addToast])
    const handlePrintSingle = (student) => student && generateStudentPDF([student], cardCaptureRef)
    const handlePrintThermal = useCallback((student) => _handlePrintThermal(student, pdfCallbacks), [addToast])
    const handleSavePNG = useCallback((student) => _handleSavePNG(student, pdfCallbacks), [addToast])

    const handleBulkPrint = () => {
        setIsPrintModalOpen(true)
    }

    // Canvas-based image compression utility
    const compressImage = (file, maxSize = 800, quality = 0.7) => {
        return new Promise((resolve) => {
            const img = new Image()
            img.onload = () => {
                const canvas = document.createElement('canvas')
                let { width, height } = img
                if (width > maxSize || height > maxSize) {
                    if (width > height) { height = Math.round(height * maxSize / width); width = maxSize }
                    else { width = Math.round(width * maxSize / height); height = maxSize }
                }
                canvas.width = width; canvas.height = height
                const ctx = canvas.getContext('2d')
                ctx.drawImage(img, 0, 0, width, height)
                canvas.toBlob((blob) => {
                    const compressedFile = new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() })
                    resolve(compressedFile)
                }, 'image/jpeg', quality)
            }
            img.src = URL.createObjectURL(file)
        })
    }

    const handleBulkPhotoMatch = async (files, method = 'nisn', autoCompress = false) => {
        setMatchingPhotos(true)
        try {
            // Fetch ALL students from DB (not just the filtered/paginated ones)
            let allStudents = allStudentsForBulk
            if (allStudents.length === 0) {
                const { data } = await supabase
                    .from('students')
                    .select('id, name, nisn, registration_code')
                    .is('deleted_at', null)
                allStudents = data || []
                setAllStudentsForBulk(allStudents)
            }

            if (allStudents.length === 0) {
                addToast('Tidak ada data siswa ditemukan', 'error')
                return
            }

            // Normalize: lowercase, strip diacritics/unicode, keep spaces
            const normalize = (str) => (str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
            // Strip to alphanumeric only (for ID-based matching)
            const normalizeStrict = (str) => normalize(str).replace(/[^a-z0-9]/g, '')
            // Split name into words for word-overlap matching
            const getWords = (str) => normalize(str).split(/\s+/).filter(w => w.length > 0)

            const matches = await Promise.all(Array.from(files).map(async (file) => {
                // Optional auto-compress
                const originalSize = file.size
                const processedFile = autoCompress ? await compressImage(file) : file

                const fileBaseName = file.name.replace(/\.[^.]+$/, '').trim()
                const normalizedFileName = normalize(fileBaseName)
                const fileWords = getWords(fileBaseName)

                const s = allStudents.find(std => {
                    if (method === 'name') {
                        const normalizedStdName = normalize(std.name)
                        const stdWords = getWords(std.name)
                        if (normalizedStdName === normalizedFileName) return true
                        if (normalizedStdName.includes(normalizedFileName) || normalizedFileName.includes(normalizedStdName)) return true
                        if (normalizeStrict(std.name) === normalizeStrict(fileBaseName)) return true
                        if (fileWords.length >= 2 && fileWords.every(fw => stdWords.some(sw => sw.startsWith(fw) || fw.startsWith(sw)))) return true
                        return false
                    }
                    if (method === 'code') {
                        return normalizeStrict(std.registration_code) === normalizeStrict(fileBaseName) || normalizeStrict(std.id) === normalizeStrict(fileBaseName)
                    }
                    return normalizeStrict(std.nisn) === normalizeStrict(fileBaseName)
                })

                return {
                    file: processedFile,
                    originalFile: file,
                    studentId: s?.id || null,
                    studentName: s?.name || '?',
                    preview: URL.createObjectURL(processedFile),
                    status: s ? 'matched' : 'unmatched',
                    matchMethod: method,
                    originalSize,
                    compressedSize: processedFile.size
                }
            }))
            setBulkPhotoMatches(prev => [...prev, ...matches])
        } catch (err) {
            console.error('Bulk photo match error:', err)
            addToast('Gagal mencocokkan foto', 'error')
        } finally {
            setMatchingPhotos(false)
        }
    }

    const handleBulkPhotoUpload = async () => {
        const matched = bulkPhotoMatches.filter(m => m.status === 'matched')
        if (matched.length === 0) return
        setUploadingBulkPhotos(true)
        for (const item of matched) {
            try {
                const name = `${item.studentId}_${Date.now()}.${item.file.name.split('.').pop()}`
                await supabase.storage.from('student-photo').upload(name, item.file)
                const { data } = supabase.storage.from('student-photo').getPublicUrl(name)
                await supabase.from('students').update({ photo_url: data.publicUrl }).eq('id', item.studentId)
            } catch { }
        }
        addToast(`Selesai`, 'success'); closeModal(); setBulkPhotoMatches([]); setUploadingBulkPhotos(false); fetchData()
        await logAudit({
            action: 'UPDATE', source: 'OPERATIONAL', tableName: 'students',
            newData: { bulk_photo_upload: true, count: matched.length }
        })
    }

    const handleClassBreakdown = async (classId, className) => {
        setLoadingBreakdown(true); setActiveModal('classBreakdown')
        try {
            const { data } = await supabase.from('students').select('*').eq('class_id', classId).is('deleted_at', null)
            if (data) {
                const boys = data.filter(s => s.gender === 'L').length, girls = data.filter(s => s.gender === 'P').length
                const avg = data.length ? Math.round(data.reduce((a, s) => a + (s.total_points || 0), 0) / data.length) : 0
                const top = [...data].sort((a, b) => b.total_points - a.total_points).slice(0, 3)
                setClassBreakdownData({ className, total: data.length, boys, girls, avgPoints: avg, riskCount: data.filter(s => s.total_points <= RiskThreshold).length, topStudents: top, allStudents: data })
            }
        } catch { } finally { setLoadingBreakdown(false) }
    }


    const handleAddCustomTag = (e) => {
        if (e.key === 'Enter' && newTagInput.trim()) {
            if (studentForTags) {
                handleToggleTag(studentForTags, newTagInput.trim())
                setNewTagInput('')
            }
        }
    }

    const handleBatchResetPoints = async () => {
        const msg = resetPointsClassId
            ? `Reset semua poin siswa di kelas ini ke 0?`
            : `Reset SEMUA poin siswa di SELURUH kelas ke 0? Tindakan ini tidak bisa dibatalkan.`
        if (!window.confirm(msg)) return

        setResettingPoints(true)
        try {
            let q = supabase.from('students').update({ total_points: 0 }).is('deleted_at', null)
            if (resetPointsClassId) q = q.eq('class_id', resetPointsClassId)
            await q
            addToast('Poin direset', 'success')
            await logAudit({ action: 'UPDATE', source: 'OPERATIONAL', tableName: 'students', newData: { batch_reset_points: true, class_id: resetPointsClassId || 'all' } })
            closeModal(); fetchData(); fetchStats()
        } catch { addToast('Gagal', 'error') } finally { setResettingPoints(false) }
    }

    const handleResetPin = async (student) => {
        if (!window.confirm(`Reset PIN?`)) return
        setResettingPin(true)
        try {
            const pin = String(Math.floor(1000 + Math.random() * 9000))
            await supabase.from('students').update({ pin }).eq('id', student.id)
            addToast(`PIN: ${pin}`, 'success')
            await logAudit({ action: 'UPDATE', tableName: 'students', recordId: student.id, newData: { pin_reset: true, name: student.name } })
            fetchData()
        } catch { addToast('Gagal', 'error') } finally { setResettingPin(false) }
    }

    const checkDuplicate = async (name, classId) => {
        if (!name || name.trim().length < 3 || !classId) { setDuplicateWarning(null); return }
        setCheckingDuplicate(true)
        try {
            const { data } = await supabase.from('students').select('id, name').ilike('name', `%${name.trim()}%`).eq('class_id', classId).is('deleted_at', null).neq('id', selectedStudent?.id || 0).limit(3)
            setDuplicateWarning(data?.length ? data : null)
        } catch { } finally { setCheckingDuplicate(false) }
    }

    const fetchAuditLog = async (id) => {
        setLoadingAudit(true)
        try {
            const { data } = await supabase
                .from('audit_logs')
                .select('*')
                .eq('table_name', 'students')
                .eq('record_id', id)
                .order('created_at', { ascending: false })
                .limit(50)
            setAuditLogs(data || [])
        } catch { setAuditLogs([]) } finally { setLoadingAudit(false) }
    }

    const fetchClassHistory = async (id) => {
        setLoadingClassHistory(true)
        try {
            const { data } = await supabase.from('student_class_history').select('*, from_class:from_class_id(name), to_class:to_class_id(name)').eq('student_id', id).order('changed_at', { ascending: false })
            setClassHistory(data || [])
        } catch { setClassHistory([]) } finally { setLoadingClassHistory(false) }
    }

    const handleViewClassHistory = (s) => { setSelectedStudent(s); fetchClassHistory(s.id); setActiveModal('classHistory') }

    const handleInlineUpdate = async (id, field, value, data) => {
        let payload = {}, msg = ''
        if (field === 'name') { payload = { name: value }; msg = 'Nama updated' }
        else if (field === 'gender') { payload = { gender: value }; msg = 'Gender updated' }
        else if (field === 'kelas') {
            payload = { class_id: value }; msg = 'Kelas updated'
            if (value !== data.class_id) await supabase.from('student_class_history').insert([{ student_id: id, from_class_id: data.class_id, to_class_id: value, changed_at: new Date().toISOString() }])
        }
        else if (field === 'poin') { payload = { total_points: value }; msg = 'Poin updated' }
        try {
            await supabase.from('students').update(payload).eq('id', id)
            addToast(msg, 'success')
            await logAudit({
                action: 'UPDATE', tableName: 'students', recordId: id,
                oldData: { [field]: field === 'kelas' ? data?.class_id : data?.[field] },
                newData: payload
            })
            fetchData(); fetchStats()
        } catch { addToast('Gagal', 'error') }
    }

    const handleInlineSubmit = async (payloadOverride = null) => {
        const payload = payloadOverride || inlineForm
        if (!payload.name || !payload.class_id) return
        setSubmittingInline(true)
        try {
            const { error } = await supabase.from('students').insert([{
                name: payload.name,
                gender: payload.gender || 'L',
                class_id: payload.class_id,
                phone: payload.phone || null,
                nisn: payload.nisn || null,
                nis: payload.nis || null,
                kamar: payload.kamar || null,
                status: 'aktif',
                tags: [],
                registration_code: generateCode(),
                pin: String(Math.floor(1000 + Math.random() * 9000)),
                total_points: 0
            }])
            if (error) throw error
            addToast('Berhasil menambahkan siswa', 'success')
            await logAudit({ action: 'INSERT', tableName: 'students', newData: { name: payload.name, class_id: payload.class_id, gender: payload.gender, nisn: payload.nisn, nis: payload.nis, kamar: payload.kamar, via: 'inline' } })
            if (!payloadOverride) setInlineForm({ name: '', gender: 'L', class_id: inlineForm.class_id, phone: '', nisn: '', nis: '', kamar: '' })
            fetchData(); fetchStats()
        } catch (err) {
            console.error('Inline Add Error:', err)
            addToast('Gagal menambahkan siswa', 'error')
        } finally {
            setSubmittingInline(false)
        }
    }

    const handleBulkWA = () => {
        if (!selectedStudentsWithPhone.length) return addToast(selectedStudents.map(s => s.name).join(', ') + ' tidak memiliki nomor Whatsapp', 'error')
        setBroadcastResults({}); setBroadcastIndex(-1); setActiveModal('bulkWA')
    }

    const handleGlobalDeleteTag = async (tag, skipConfirm = false) => {
        if (!skipConfirm && !window.confirm(`Hapus label?`)) return
        setSubmitting(true)
        try {
            const { data } = await supabase.from('students').select('id, tags').contains('tags', [tag]).is('deleted_at', null)
            if (data) {
                await Promise.all(data.map(s => supabase.from('students').update({ tags: (s.tags || []).filter(t => t !== tag) }).eq('id', s.id)))
                
                // CRITICAL: Also update the currently active student in modal to reflect changes immediately
                if (studentForTags && studentForTags.tags?.includes(tag)) {
                    setStudentForTags(prev => ({
                        ...prev,
                        tags: (prev.tags || []).filter(t => t !== tag)
                    }))
                }

                await logAudit({
                    action: 'DELETE', source: 'MASTER', tableName: 'students',
                    newData: { global_delete_tag: true, tag, affected_count: data.length }
                })
                fetchData(); fetchUsedTags()
            }
        } catch { } finally { setSubmitting(false) }
    }

    const handleGlobalRenameTag = async (oldTag, newTag) => {
        if (!newTag || oldTag === newTag) { setTagToEdit(null); return }
        setSubmitting(true)
        try {
            const { data } = await supabase.from('students').select('id, tags').contains('tags', [oldTag]).is('deleted_at', null)
            if (data) {
                await Promise.all(data.map(s => supabase.from('students').update({ tags: (s.tags || []).map(t => t === oldTag ? newTag : t) }).eq('id', s.id)))
                
                // CRITICAL: Also update the currently active student in modal to reflect changes immediately
                if (studentForTags && studentForTags.tags?.includes(oldTag)) {
                    setStudentForTags(prev => ({
                        ...prev,
                        tags: (prev.tags || []).map(t => t === oldTag ? newTag : t)
                    }))
                }

                await logAudit({
                    action: 'UPDATE', source: 'MASTER', tableName: 'students',
                    newData: { global_rename_tag: true, old_tag: oldTag, new_tag: newTag, affected_count: data.length }
                })
                fetchData(); fetchUsedTags(); setTagToEdit(null)
            }
        } catch { } finally { setSubmitting(false) }
    }

    // ---- AUTO LOAD DATA ----
    useEffect(() => { fetchData() }, [fetchData])
    useEffect(() => { fetchStats() }, [fetchStats])
    useEffect(() => { fetchUsedTags() }, [fetchUsedTags])

    return {
        // Core data
        students, classesList, loading, globalStats, totalRows, fetchData, fetchStats,
        // Filtering
        searchQuery, setSearchQuery, filterClass, setFilterClass, filterClasses, setFilterClasses,
        filterGender, setFilterGender, filterStatus, setFilterStatus, filterTag, setFilterTag,
        filterMissing, setFilterMissing, sortBy, setSortBy, filterPointMode, setFilterPointMode,
        filterPointMin, setFilterPointMin, filterPointMax, setFilterPointMax,
        showAdvancedFilter, setShowAdvancedFilter, debouncedSearch, activeFilterCount, resetAllFilters,
        // Modals & UI
        isModalOpen, setIsModalOpen, isPrintModalOpen, setIsPrintModalOpen,
        activeModal, setActiveModal, isHeaderMenuOpen, setIsHeaderMenuOpen,
        isShortcutOpen, setIsShortcutOpen, photoZoom, setPhotoZoom,
        isPrivacyMode, setIsPrivacyMode, isAnyModalOpen,
        // Action Context
        selectedStudent, setSelectedStudent, studentToDelete, setStudentToDelete,
        selectedStudentIds, setSelectedStudentIds, submitting, setSubmitting,
        newlyCreatedStudent, setNewlyCreatedStudent,
        // Bulk
        bulkClassId, setBulkClassId, bulkTagAction, setBulkTagAction,
        bulkPointValue, setBulkPointValue, bulkPointLabel, setBulkPointLabel,
        bulkRoomId, setBulkRoomId,
        // Profile / Details
        behaviorHistory, setBehaviorHistory, raportHistory, setRaportHistory,
        profileTab, setProfileTab, timelineFilter, setTimelineFilter,
        timelineVisible, setTimelineVisible, auditLogs, setAuditLogs, loadingAudit, setLoadingAudit,
        loadingHistory,
        // Functional
        handleSubmit, handleAdd, handleEdit, confirmDelete, executeDelete, closeModal,
        toggleSelectAll, toggleSelectStudent, handleBulkPromote, handleBulkDelete,
        handleBulkPointUpdate, handleBulkTagApply, handleBulkRoomAssign,
        fetchArchivedStudents, handleRestoreStudent, handlePermanentDelete, setArchivedStudents,
        fetchUsedTags, handleToggleTag, handleGlobalDeleteTag, handleGlobalRenameTag,
        fetchBehaviorHistory, fetchRaportHistory, handleViewProfile,
        handleResetPin, checkDuplicate, fetchAuditLog, fetchClassHistory, handleViewClassHistory,
        handleQuickPoint, handleInlineUpdate, handleTogglePin, handlePhotoUpload, uploadingPhoto,
        handleInlineSubmit, handleViewQR, handleViewPrint, handleBulkWA, buildWAMessage, openWAForStudent, waTemplate,
        generateStudentPDF, handlePrintSingle, handlePrintThermal, handleSavePNG, handleBulkPrint,
        handleBulkPhotoMatch, handleBulkPhotoUpload, handleClassBreakdown, handleBatchResetPoints,
        bulkPhotoMatches, uploadingBulkPhotos, setBulkPhotoMatches, allStudentsForBulk, matchingPhotos,
        // State Helpers
        resetPointsClassId, setResetPointsClassId, resettingPoints,
        classBreakdownData, loadingBreakdown,
        setNewTagInput, newTagInput, tagToEdit, setTagToEdit, tagStats, duplicateWarning,
        checkingDuplicate, gSheetsUrl, setGSheetsUrl, fetchingGSheets, setFetchingGSheets,
        page, setPage, pageSize, setPageSize, jumpPage, setJumpPage, generatingPdf,
        studentForTags, setStudentForTags, renameInput, setRenameInput,
        archivePage, setArchivePage, archivePageSize, setArchivePageSize, loadingRaport,
        allSelected, someSelected, lastReportMap,
        allUsedTags, archivedStudents, loadingArchived, classHistory, loadingClassHistory,
        // Refs
        formDataRef, importFileInputRef, photoInputRef, searchInputRef, headerMenuRef, shortcutRef, cardCaptureRef,
        // Computed
        selectedStudents, selectedStudentsWithPhone, selectedIdSet, generateCode, handleAddCustomTag,
        // Inline Add State
        isInlineAddOpen, setIsInlineAddOpen, inlineForm, setInlineForm, submittingInline, setSubmittingInline
    }
}