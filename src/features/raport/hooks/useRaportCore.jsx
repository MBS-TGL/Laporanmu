import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '@lib/supabase'
import { logAudit } from '@utils/auditLogger'
import { useToast } from '@context/Toast'
import { useSchoolSettings } from '@context/SchoolSettings'
import { useAuth } from '@context/Auth'
import { useFlag } from '@context/FeatureFlags'
import { BULAN } from '@utils/reports/raportConstants'
import { RAPORT_TYPES, getClassLevel, getGradePredicate } from '@utils/reports/raportTypeRegistry'
import { isComplete } from '@utils/reports/raportHelpers'
import { loadTranslitData } from '@utils/reports/translitData'

const ROW_HEIGHT = 188
const OVERSCAN = 5

export function useRaportCore() {
    const { addToast } = useToast()
    const { settings } = useSchoolSettings()
    const { profile } = useAuth()
    const now = useRef(new Date()).current

    const ALLOWED_ROLES = ['admin', 'guru', 'developer']
    const isAllowed = profile ? ALLOWED_ROLES.includes(profile.role?.toLowerCase()) : null

    // access.teacher_raport flag — kalau off, guru jadi read-only
    const { enabled: teacherRaportEnabled } = useFlag('access.teacher_raport')
    const canEdit = profile?.role === 'guru' ? teacherRaportEnabled : true

    // ── Page-level state
    const [classesList, setClassesList] = useState([])
    const [pageLoading, setPageLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [filterType, setFilterType] = useState('all') // all, boarding, regular
    const [isFilterOpen, setIsFilterOpen] = useState(false)
    const [stats, setStats] = useState({ totalKelas: 0, totalSiswa: 0, totalRaport: 0, bulanIni: now.getMonth() + 1 })
    const [classProgress, setClassProgress] = useState({})
    const [showAllIncompleteBanner, setShowAllIncompleteBanner] = useState(false)

    // ── Step state (0 = daftar kelas, 1 = setup, 2 = input, 3 = preview, 4 = arsip)
    const [step, setStep] = useState(0)

    const location = useLocation()
    const isAcademicRaport = location.pathname.startsWith('/academic/raport')

    // ── Report Type state
    const [reportType, setReportType] = useState(() => {
        return isAcademicRaport ? 'umum' : 'bulanan'
    })

    useEffect(() => {
        if (isAcademicRaport) {
            setReportType('umum')
        } else {
            setReportType('bulanan')
        }
        setSelectedClassId('')
        setMusyrif('')
        setStep(0)
    }, [isAcademicRaport])

    const [selectedSemester, setSelectedSemester] = useState(1) // 1 = Ganjil, 2 = Genap
    const [academicYear, setAcademicYear] = useState(() => {
        const yr = now.getFullYear()
        const mo = now.getMonth() + 1
        return mo >= 7 ? `${yr}/${yr + 1}` : `${yr - 1}/${yr}`
    })

    // Fetch active academic year and semester from DB on mount
    useEffect(() => {
        const fetchActivePeriod = async () => {
            try {
                const { data, error } = await supabase
                    .from('academic_years')
                    .select('name, semester')
                    .eq('is_active', true)
                    .maybeSingle()
                if (!error && data) {
                    if (data.name) setAcademicYear(data.name)
                    if (data.semester) {
                        const semNum = data.semester.toUpperCase() === 'GENAP' ? 2 : 1
                        setSelectedSemester(semNum)
                    }
                }
            } catch (err) {
                console.error('Gagal memuat tahun akademik aktif:', err)
            }
        }
        fetchActivePeriod()
    }, [])

    // ── Setup state
    const [selectedClassId, setSelectedClassId] = useState('')
    const [homeroomTeacherName, setHomeroomTeacherName] = useState('')
    const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1)
    const [selectedYear, setSelectedYear] = useState(now.getFullYear())
    const [musyrif, setMusyrif] = useState('')
    const [lang, setLang] = useState('id')

    // ── Data state
    const [students, setStudents] = useState([])
    const [loading, setLoading] = useState(false)
    const [transliterating, setTransliterating] = useState(false)
    const [scores, setScoresRaw] = useState({})
    
    // Undo history
    const scoresHistoryRef = useRef([])
    const scoresHistoryIdxRef = useRef(-1)

    const setScores = useCallback((updater) => {
        setScoresRaw(prev => {
            const next = typeof updater === 'function' ? updater(prev) : updater
            const hist = scoresHistoryRef.current
            const idx = scoresHistoryIdxRef.current
            const newHist = hist.slice(0, idx + 1)
            newHist.push(JSON.parse(JSON.stringify(next)))
            if (newHist.length > 30) newHist.shift()
            Promise.resolve().then(() => {
                scoresHistoryRef.current = newHist
                scoresHistoryIdxRef.current = newHist.length - 1
            })
            return next
        })
    }, [])

    const [extras, setExtras] = useState({})
    const [saving, setSaving] = useState({})
    const [savedIds, setSavedIds] = useState(new Set())
    const [existingReportIds, setExistingReportIds] = useState({})
    const [savingAll, setSavingAll] = useState(false)
    const [copyingLastMonth, setCopyingLastMonth] = useState(false)
    const [studentSearch, setStudentSearch] = useState('')
    const [draftAvailable, setDraftAvailable] = useState(false)
    const [isOnline, setIsOnline] = useState(() => typeof navigator !== 'undefined' ? navigator.onLine : true)
    const [newMonthBanner, setNewMonthBanner] = useState(null)
    const [prevMonthScores, setPrevMonthScores] = useState({})
    const [studentTrend, setStudentTrend] = useState({})
    const [catatanArabMap, setCatatanArabMap] = useState({})
    const [saveAllConfirm, setSaveAllConfirm] = useState(null)

    // Bulk & preview states
    const [bulkMode, setBulkMode] = useState(false)
    const [bulkSelected, setBulkSelected] = useState(new Set())
    const selectedStudentIds = useMemo(() => Array.from(bulkSelected), [bulkSelected])
    const [previewStudentId, setPreviewStudentId] = useState(null)

    // Print rendering queues (to render hidden cards in A4 layout for html2canvas capture)
    const [printQueue, setPrintQueue] = useState([])
    const [printRenderedCount, setPrintRenderedCount] = useState(0)

    // Other settings
    const [showNoPhoneOnly, setShowNoPhoneOnly] = useState(false)
    const [showIncompleteOnly, setShowIncompleteOnly] = useState(false)
    const [lastSession, setLastSession] = useState(() => {
        try {
            const raw = localStorage.getItem('raport_last_session')
            return raw ? JSON.parse(raw) : null
        } catch { return null }
    })

    // Auto-save logic triggers
    const autoSaveTimers = useRef({})
    
    // Computed values
    const selectedClass = useMemo(() => classesList.find(c => c.id === selectedClassId), [classesList, selectedClassId])
    const classLevel = useMemo(() => getClassLevel(selectedClass), [selectedClass])
    const bulanObj = useMemo(() => BULAN.find(b => b.id === selectedMonth), [selectedMonth])
    
    const completedCount = useMemo(() => {
        const rtObj = RAPORT_TYPES[reportType] || RAPORT_TYPES.bulanan
        const criteria = rtObj.getCriteria(selectedClass)
        return students.filter(s => isComplete(scores[s.id] || {}, criteria)).length
    }, [students, scores, reportType, selectedClass])

    const progressPct = useMemo(() => {
        if (!students.length) return 0
        const rtObj = RAPORT_TYPES[reportType] || RAPORT_TYPES.bulanan
        const criteria = rtObj.getCriteria(selectedClass)
        
        const totalRatio = students.reduce((acc, s) => {
            const sc = scores[s.id] || {}
            const ex = extras[s.id] || {}
            
            const progressFields = []
            criteria.forEach(k => {
                progressFields.push(sc[k.key])
            })
            
            if (rtObj.hasFisik) {
                progressFields.push(ex.berat_badan, ex.tinggi_badan)
            }
            if (rtObj.hasAttendance) {
                progressFields.push(ex.hari_sakit, ex.hari_izin, ex.hari_alpa, ex.hari_pulang)
            }
            if (rtObj.hasHafalan) {
                progressFields.push(ex.ziyadah, ex.murojaah)
            }
            if (rtObj.hasCatatan) {
                progressFields.push(ex.catatan)
            }
            
            const filled = progressFields.filter(v => v !== '' && v !== null && v !== undefined).length
            return acc + (progressFields.length ? (filled / progressFields.length) : 0)
        }, 0)
        return Math.round((totalRatio / students.length) * 100)
    }, [students, scores, extras, reportType, selectedClass])

    const noPhoneCount = useMemo(() => students.filter(s => !s.phone).length, [students])

    const hasUnsavedMemo = useMemo(() => {
        const rtObj = RAPORT_TYPES[reportType] || RAPORT_TYPES.bulanan
        const criteria = rtObj.getCriteria(selectedClass)
        
        return students.some(s => {
            if (savedIds.has(s.id)) return false
            const sc = scores[s.id] || {}, ex = extras[s.id] || {}
            
            const hasScoreValue = criteria.some(k => sc[k.key] !== '' && sc[k.key] !== null && sc[k.key] !== undefined)
            
            const checkFields = []
            if (rtObj.hasFisik) {
                checkFields.push(ex.berat_badan, ex.tinggi_badan)
            }
            if (rtObj.hasAttendance) {
                checkFields.push(ex.hari_sakit, ex.hari_izin, ex.hari_alpa, ex.hari_pulang)
            }
            if (rtObj.hasHafalan) {
                checkFields.push(ex.ziyadah, ex.murojaah)
            }
            if (rtObj.hasCatatan) {
                checkFields.push(ex.catatan)
            }
            
            const hasExtraValue = checkFields.some(v => v !== '' && v !== null && v !== undefined)
            
            return hasScoreValue || hasExtraValue
        })
    }, [students, scores, extras, savedIds, reportType, selectedClass])

    const filteredClasses = useMemo(() => {
        let list = classesList.filter(c => !searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase()))
        if (filterType === 'boarding') {
            list = list.filter(c => (c.name || '').toLowerCase().includes('boarding') || (c.name || '').toLowerCase().includes('pondok'))
        } else if (filterType === 'regular') {
            list = list.filter(c => !((c.name || '').toLowerCase().includes('boarding') || (c.name || '').toLowerCase().includes('pondok')))
        }
        return list
    }, [classesList, searchQuery, filterType])

    const step0Stats = useMemo(() => {
        const progressRows = Object.values(classProgress || {})
        const totalTargets = progressRows.reduce((acc, row) => acc + (row.total || 0), 0)
        const totalCompleted = progressRows.reduce((acc, row) => acc + (row.done || 0), 0)
        const weightedInput = totalTargets
            ? Math.round(progressRows.reduce((acc, row) => acc + ((row.pct || 0) * (row.total || 0)), 0) / totalTargets)
            : 0
        return {
            totalKelas: stats.totalKelas,
            totalSiswa: stats.totalSiswa,
            raportLengkap: `${totalCompleted}/${totalTargets}`,
            rataInput: `${weightedInput}%`,
        }
    }, [classProgress, stats.totalKelas, stats.totalSiswa])

    // ── Pre-load/Transliterate names ──
    const transliterateToArab = useCallback(async (name) => {
        const { KATA_ARAB: KA, ASMAUL_HUSNA: AH, DIGRAPH: DG, SINGLE: SG } = await loadTranslitData()
        const latinToArab = (word) => {
            let res = '', i = 0
            while (i < word.length) {
                const two = word.slice(i, i + 2).toLowerCase()
                const di = DG.find(([k]) => k === two)
                if (di) { res += di[1]; i += 2; continue }
                res += SG[word[i].toLowerCase()] || ''
                i++
            }
            return res
        }
        const words = name.toLowerCase().trim().split(/\s+/)
        const result = []
        for (const w of words) {
            if (KA[w]) { result.push(KA[w]); continue }
            const abdulMatch = w.match(/^ab[du]u?l?[-_]?(.+)$/) || w.match(/^abdi[-_]?(.+)$/)
            if (abdulMatch) {
                const suffix = abdulMatch[1]
                if (AH[suffix]) { result.push('عبد ' + AH[suffix]); continue }
                if (suffix === 'llah' || suffix === 'lah' || suffix === 'illah') { result.push('عبد الله'); continue }
            }
            if (w === 'bin' || w === 'ibn' || w === 'ibnu') { result.push('بن'); continue }
            if (w === 'binti' || w === 'bint') { result.push('بنت'); continue }
            if (w.endsWith('uddin') || w.endsWith('udin') || w.endsWith('addin') || w.endsWith('iddin')) {
                const base = w.replace(/(uddin|udin|addin|iddin)$/, '')
                if (KA[base]) { result.push(KA[base] + ' الدين'); continue }
            }
            if (w.startsWith('nur') || w.startsWith('noor')) {
                const suffix = w.replace(/^noo?r[-_]?/, '')
                const sufArab = KA[suffix] || AH[suffix]
                if (sufArab) { result.push('نور ' + sufArab.replace(/^ال/, '')); continue }
            }
            result.push(latinToArab(w))
        }
        return result.join(' ')
    }, [])

    const transliterateNames = useCallback(async (stuList) => {
        const needsTranslit = stuList.filter(s => !s.metadata?.nama_arab)
        if (!needsTranslit.length) return stuList
        const updated = [...stuList]
        const dbUpdates = []
        for (const s of needsTranslit) {
            const namaArab = await transliterateToArab(s.name)
            const newMeta = { ...(s.metadata || {}), nama_arab: namaArab }
            dbUpdates.push(supabase.from('students').update({ metadata: newMeta }).eq('id', s.id))
            const idx = updated.findIndex(x => x.id === s.id)
            if (idx !== -1) updated[idx] = { ...updated[idx], metadata: newMeta }
        }
        await Promise.allSettled(dbUpdates)
        return updated
    }, [transliterateToArab])

    // ── Load students ──
    const loadStudents = useCallback(async (overrideClassId, overrideMonth, overrideYear, overrideLang, overrideReportType, overrideSemester, overrideAcademicYear) => {
        const classId = overrideClassId ?? selectedClassId
        const month = overrideMonth ?? selectedMonth
        const year = overrideYear ?? selectedYear
        const useLang = overrideLang ?? lang
        const useReportType = overrideReportType ?? reportType
        const useSemester = Number(overrideSemester ?? selectedSemester)
        const useAcademicYear = overrideAcademicYear ?? academicYear
        if (!classId) return
        setLoading(true)
        const minTime = new Promise(resolve => setTimeout(resolve, 350))
        try {
            const { data: stuData, error: stuErr } = await supabase.from('students').select('id, name, registration_code, photo_url, gender, phone, metadata').eq('class_id', classId).is('deleted_at', null).order('name')
            if (stuErr) throw stuErr
            const ids = (stuData || []).map(s => s.id)
            
            const rtObj = RAPORT_TYPES[useReportType] || RAPORT_TYPES.bulanan
            const classObj = classesList.find(c => c.id === classId)
            const criteria = rtObj.getCriteria(classObj)

            let repData = [], prevRepData = []

            if (useReportType === 'bulanan') {
                const prevM = month === 1 ? 12 : month - 1
                const prevY = month === 1 ? year - 1 : year
                
                const [res1, res2] = await Promise.all([
                    supabase.from('student_monthly_reports').select('*').in('student_id', ids).eq('month', month).eq('year', year),
                    supabase.from('student_monthly_reports').select('student_id,nilai_akhlak,nilai_ibadah,nilai_kebersihan,nilai_quran,nilai_bahasa').in('student_id', ids).eq('month', prevM).eq('year', prevY),
                ])
                repData = res1.data || []
                prevRepData = res2.data || []
            } else {
                const prevSemester = useSemester === 2 ? 1 : 2
                const prevAcademicYear = useSemester === 2 ? useAcademicYear : (() => {
                    const parts = useAcademicYear.split('/')
                    if (parts.length === 2) {
                        return `${Number(parts[0]) - 1}/${Number(parts[1]) - 1}`
                    }
                    return useAcademicYear
                })()

                const [res1, res2] = await Promise.all([
                    supabase.from('student_semester_reports').select('*').in('student_id', ids).eq('report_type', useReportType).eq('semester', useSemester).eq('academic_year', useAcademicYear),
                    supabase.from('student_semester_reports').select('*').in('student_id', ids).eq('report_type', useReportType).eq('semester', prevSemester).eq('academic_year', prevAcademicYear),
                ])
                repData = res1.data || []
                prevRepData = res2.data || []
            }

            setTimeout(() => {
                if (useReportType === 'bulanan') {
                    const trendMonths = []
                    for (let i = 5; i >= 0; i--) {
                        let m = month - i, y = year
                        if (m <= 0) { m += 12; y -= 1 }
                        trendMonths.push({ m, y })
                    }
                    supabase.from('student_monthly_reports')
                        .select('student_id,month,year,nilai_akhlak,nilai_ibadah,nilai_kebersihan,nilai_quran,nilai_bahasa')
                        .in('student_id', ids)
                        .or(trendMonths.map(t => `and(month.eq.${t.m},year.eq.${t.y})`).join(','))
                        .order('year').order('month')
                        .then(({ data: trendData }) => {
                            const trendMap = {}
                            for (const r of (trendData || [])) {
                                if (!trendMap[r.student_id]) trendMap[r.student_id] = []
                                trendMap[r.student_id].push({ month: r.month, year: r.year, scores: { nilai_akhlak: r.nilai_akhlak, nilai_ibadah: r.nilai_ibadah, nilai_kebersihan: r.nilai_kebersihan, nilai_quran: r.nilai_quran, nilai_bahasa: r.nilai_bahasa } })
                            }
                            setStudentTrend(trendMap)
                        })
                } else {
                    supabase.from('student_semester_reports')
                        .select('student_id,semester,academic_year,scores')
                        .eq('report_type', useReportType)
                        .in('student_id', ids)
                        .order('academic_year').order('semester')
                        .then(({ data: trendData }) => {
                            const trendMap = {}
                            for (const r of (trendData || [])) {
                                if (!trendMap[r.student_id]) trendMap[r.student_id] = []
                                trendMap[r.student_id].push({ semester: r.semester, academic_year: r.academic_year, scores: r.scores })
                            }
                            setStudentTrend(trendMap)
                        })
                }
            }, 0)

            const prevScoreMap = {}
            for (const r of (prevRepData || [])) {
                if (useReportType === 'bulanan') {
                    prevScoreMap[r.student_id] = { nilai_akhlak: r.nilai_akhlak, nilai_ibadah: r.nilai_ibadah, nilai_kebersihan: r.nilai_kebersihan, nilai_quran: r.nilai_quran, nilai_bahasa: r.nilai_bahasa }
                } else {
                    const scObj = {}
                    criteria.forEach(k => {
                        scObj[k.key] = r.scores?.[k.key] ?? ''
                    })
                    prevScoreMap[r.student_id] = scObj
                }
            }
            setPrevMonthScores(prevScoreMap)

            const initScores = {}, initExtras = {}, initExisting = {}
            const initSavedIds = new Set()
            
            for (const s of (stuData || [])) {
                const rep = repData?.find(r => r.student_id === s.id)
                
                if (useReportType === 'bulanan') {
                    initScores[s.id] = { nilai_akhlak: rep?.nilai_akhlak ?? '', nilai_ibadah: rep?.nilai_ibadah ?? '', nilai_kebersihan: rep?.nilai_kebersihan ?? '', nilai_quran: rep?.nilai_quran ?? '', nilai_bahasa: rep?.nilai_bahasa ?? '' }
                    initExtras[s.id] = { berat_badan: rep?.berat_badan ?? '', tinggi_badan: rep?.tinggi_badan ?? '', ziyadah: rep?.ziyadah ?? '', murojaah: rep?.murojaah ?? '', hari_sakit: rep?.hari_sakit ?? '', hari_izin: rep?.hari_izin ?? '', hari_alpa: rep?.hari_alpa ?? '', hari_pulang: rep?.hari_pulang ?? '', catatan: rep?.catatan ?? '' }
                } else {
                    const scObj = {}
                    criteria.forEach(k => {
                        scObj[k.key] = rep?.scores?.[k.key] ?? ''
                    })
                    initScores[s.id] = scObj

                    initExtras[s.id] = {
                        berat_badan: rep?.extras?.berat_badan ?? '',
                        tinggi_badan: rep?.extras?.tinggi_badan ?? '',
                        hari_sakit: rep?.extras?.hari_sakit ?? '',
                        hari_izin: rep?.extras?.hari_izin ?? '',
                        hari_alpa: rep?.extras?.hari_alpa ?? '',
                        hari_pulang: rep?.extras?.hari_pulang ?? '',
                        catatan: rep?.catatan ?? rep?.extras?.catatan ?? ''
                    }
                }

                if (rep) { initExisting[s.id] = rep.id; initSavedIds.add(s.id) }
            }

            let finalStudents = stuData || []
            if (useLang === 'ar') {
                const needs = finalStudents.filter(s => !s.metadata?.nama_arab)
                if (needs.length) {
                    setTransliterating(true)
                    try { finalStudents = await transliterateNames(finalStudents) }
                    finally { setTransliterating(false) }
                }
            }
            scoresHistoryRef.current = [JSON.parse(JSON.stringify(initScores))]
            scoresHistoryIdxRef.current = 0
            setShowNoPhoneOnly(false)
            setShowIncompleteOnly(false)
            setStudents(finalStudents); setScoresRaw(initScores); setExtras(initExtras); setExistingReportIds(initExisting)
            setSavedIds(initSavedIds)
            try {
                const session = { classId, month, year, useLang, reportType: useReportType, selectedSemester: useSemester, academicYear: useAcademicYear, className: classesList.find(c => c.id === classId)?.name || '' }
                localStorage.setItem('raport_last_session', JSON.stringify(session))
                setLastSession(session)
            } catch { }
            await minTime
            return true
        } catch (e) { addToast('Gagal memuat siswa: ' + e.message, 'error'); console.error('loadStudents error:', e); return false }
        finally { setLoading(false) }
    }, [selectedClassId, selectedMonth, selectedYear, selectedSemester, academicYear, reportType, lang, transliterateNames, addToast, classesList])

    useEffect(() => {
        if (selectedClassId && step === 2) {
            loadStudents()
        }
    }, [reportType, selectedClassId, step, loadStudents])

    // ── Load offline draft ──
    const loadDraft = useCallback(() => {
        const suffixKey = reportType === 'bulanan' 
            ? `${selectedMonth}_${selectedYear}` 
            : `${selectedSemester}_${academicYear.replace('/', '_')}`
        const key = `draft_raport_${reportType}_${selectedClassId}_${suffixKey}`
        try {
            const raw = localStorage.getItem(key)
            if (!raw) return
            const { scores: dScores, extras: dExtras, savedAt } = JSON.parse(raw)
            setScores(dScores)
            setExtras(dExtras)
            setSavedIds(prev => {
                const next = new Set(prev)
                Object.keys(dScores || {}).forEach(id => next.delete(id))
                return next
            })
            const mins = Math.round((Date.now() - savedAt) / 60000)
            addToast(`Draft dimuat (disimpan ${mins < 1 ? 'baru saja' : mins + ' menit lalu'})`, 'success')
        } catch (e) { addToast('Gagal memuat draft', 'error'); console.error('loadDraft error:', e) }
    }, [selectedClassId, selectedMonth, selectedYear, selectedSemester, academicYear, reportType, addToast, setScores, setExtras])

    const clearDraft = useCallback(() => {
        const suffixKey = reportType === 'bulanan' 
            ? `${selectedMonth}_${selectedYear}` 
            : `${selectedSemester}_${academicYear.replace('/', '_')}`
        const key = `draft_raport_${reportType}_${selectedClassId}_${suffixKey}`
        try { localStorage.removeItem(key); setDraftAvailable(false); addToast('Draft dihapus', 'success') }
        catch (e) { console.error('clearDraft error:', e) }
    }, [selectedClassId, selectedMonth, selectedYear, selectedSemester, academicYear, reportType, addToast])

    // ── Save single ──
    const saveStudent = useCallback(async (studentId) => {
        const sc = scores[studentId], ex = extras[studentId] ?? {}
        if (!sc) return
        setSaving(prev => ({ ...prev, [studentId]: true }))
        try {
            const rtObj = RAPORT_TYPES[reportType] || RAPORT_TYPES.bulanan
            const tableName = rtObj.dbTable
            let error
            
            if (reportType === 'bulanan') {
                const payload = { 
                    student_id: studentId, 
                    month: selectedMonth, 
                    year: selectedYear, 
                    musyrif_name: musyrif, 
                    updated_by: profile?.id ?? null, 
                    updated_by_name: profile?.name ?? null, 
                    ...Object.fromEntries(Object.entries(sc).map(([k, v]) => [k, v === '' ? null : Number(v)])), 
                    berat_badan: ex.berat_badan !== '' ? Number(ex.berat_badan) : null, 
                    tinggi_badan: ex.tinggi_badan !== '' ? Number(ex.tinggi_badan) : null, 
                    ziyadah: ex.ziyadah || null, 
                    murojaah: ex.murojaah || null, 
                    hari_sakit: ex.hari_sakit !== '' ? Number(ex.hari_sakit) : 0, 
                    hari_izin: ex.hari_izin !== '' ? Number(ex.hari_izin) : 0, 
                    hari_alpa: ex.hari_alpa !== '' ? Number(ex.hari_alpa) : 0, 
                    hari_pulang: ex.hari_pulang !== '' ? Number(ex.hari_pulang) : 0, 
                    catatan: ex.catatan || null 
                }
                const existingId = existingReportIds[studentId]
                if (existingId) { 
                    ({ error } = await supabase.from(tableName).update(payload).eq('id', existingId)) 
                } else { 
                    const { data, error: upsErr } = await supabase.from(tableName).upsert(payload, { onConflict: 'student_id,month,year' }).select('id').single()
                    error = upsErr
                    if (!upsErr && data) setExistingReportIds(prev => ({ ...prev, [studentId]: data.id })) 
                }
                if (error) throw error
                await logAudit({
                    action: existingId ? 'UPDATE' : 'INSERT',
                    source: 'OPERATIONAL',
                    tableName: tableName,
                    recordId: existingId || null,
                    newData: payload,
                })
            } else {
                const payload = {
                    student_id: studentId,
                    report_type: reportType,
                    semester: selectedSemester,
                    academic_year: academicYear,
                    musyrif_name: musyrif,
                    updated_by: profile?.id ?? null,
                    updated_by_name: profile?.name ?? null,
                    scores: Object.fromEntries(Object.entries(sc).map(([k, v]) => [k, v === '' ? null : Number(v)])),
                    extras: {
                        berat_badan: ex.berat_badan !== '' ? Number(ex.berat_badan) : null,
                        tinggi_badan: ex.tinggi_badan !== '' ? Number(ex.tinggi_badan) : null,
                        hari_sakit: ex.hari_sakit !== '' ? Number(ex.hari_sakit) : 0,
                        hari_izin: ex.hari_izin !== '' ? Number(ex.hari_izin) : 0,
                        hari_alpa: ex.hari_alpa !== '' ? Number(ex.hari_alpa) : 0,
                        hari_pulang: ex.hari_pulang !== '' ? Number(ex.hari_pulang) : 0,
                        catatan: ex.catatan || null
                    }
                }
                const existingId = existingReportIds[studentId]
                if (existingId) {
                    ({ error } = await supabase.from(tableName).update(payload).eq('id', existingId))
                } else {
                    const { data, error: upsErr } = await supabase.from(tableName).upsert(payload, { onConflict: 'student_id,report_type,semester,academic_year' }).select('id').single()
                    error = upsErr
                    if (!upsErr && data) setExistingReportIds(prev => ({ ...prev, [studentId]: data.id }))
                }
                if (error) throw error
                await logAudit({
                    action: existingId ? 'UPDATE' : 'INSERT',
                    source: 'OPERATIONAL',
                    tableName: tableName,
                    recordId: existingId || null,
                    newData: payload,
                })
            }
            setSavedIds(prev => new Set([...prev, studentId]))
        } catch (e) { addToast(`Gagal menyimpan: ${e.message}`, 'error'); console.error('saveStudent error:', e) }
        finally { setSaving(prev => ({ ...prev, [studentId]: false })) }
    }, [scores, extras, reportType, selectedMonth, selectedYear, selectedSemester, academicYear, musyrif, existingReportIds, addToast, profile])

    // ── Reset student ──
    const resetStudent = useCallback(async (studentId) => {
        if (autoSaveTimers.current[studentId]) {
            clearTimeout(autoSaveTimers.current[studentId])
            delete autoSaveTimers.current[studentId]
        }
        
        const rtObj = RAPORT_TYPES[reportType] || RAPORT_TYPES.bulanan
        const criteria = rtObj.getCriteria(selectedClass)
        const emptySc = {}
        criteria.forEach(k => { emptySc[k.key] = '' })

        setScores(prev => ({ ...prev, [studentId]: emptySc }))
        setExtras(prev => ({ ...prev, [studentId]: { berat_badan: '', tinggi_badan: '', ziyadah: '', murojaah: '', hari_sakit: '', hari_izin: '', hari_alpa: '', hari_pulang: '', catatan: '' } }))
        setSavedIds(prev => { const n = new Set(prev); n.delete(studentId); return n })

        const existingId = existingReportIds[studentId]
        if (!existingId) return
        try {
            const { error } = await supabase.from(rtObj.dbTable).delete().eq('id', existingId)
            if (error) throw error
            setExistingReportIds(prev => { const n = { ...prev }; delete n[studentId]; return n })
            const studentName = students.find(s => s.id === studentId)?.name
            addToast(`Data ${studentName?.split(' ')[0] ?? ''} berhasil direset`, 'success')
            await logAudit({
                action: 'DELETE', source: 'OPERATIONAL', tableName: rtObj.dbTable, recordId: existingId,
                oldData: { student_id: studentId, student_name: studentName, report_type: reportType, month: selectedMonth, year: selectedYear, semester: selectedSemester, academic_year: academicYear }
            })
        } catch (e) {
            addToast(`Gagal hapus dari DB: ${e.message}`, 'error')
            console.error('resetStudent error:', e)
        }
    }, [existingReportIds, students, addToast, setScores, selectedMonth, selectedYear, selectedSemester, academicYear, reportType, selectedClass])

    // ── Save all ──
    const _doSaveAll = useCallback(async () => {
        setSaveAllConfirm(null)
        setSavingAll(true)
        try {
            const rtObj = RAPORT_TYPES[reportType] || RAPORT_TYPES.bulanan
            const criteria = rtObj.getCriteria(selectedClass)

            const hasAnyData = (sc, ex) =>
                criteria.some(k => sc[k.key] !== '' && sc[k.key] !== null && sc[k.key] !== undefined) ||
                [ex.berat_badan, ex.tinggi_badan, ex.ziyadah, ex.murojaah,
                ex.hari_sakit, ex.hari_izin, ex.hari_alpa, ex.hari_pulang, ex.catatan
                ].some(v => v !== '' && v !== null && v !== undefined)

            const studentsToSave = students.filter(s => hasAnyData(scores[s.id] || {}, extras[s.id] || {}))
            if (!studentsToSave.length) {
                addToast('Belum ada data yang diisi untuk disimpan', 'warning')
                return
            }

            const payloads = studentsToSave.map(s => { 
                const sc = scores[s.id] || {}, ex = extras[s.id] || {}
                if (reportType === 'bulanan') {
                    return { 
                        student_id: s.id, 
                        month: selectedMonth, 
                        year: selectedYear, 
                        musyrif_name: musyrif, 
                        updated_by: profile?.id ?? null, 
                        updated_by_name: profile?.name ?? null, 
                        ...Object.fromEntries(Object.entries(sc).map(([k, v]) => [k, v === '' ? null : Number(v)])), 
                        berat_badan: ex.berat_badan !== '' ? Number(ex.berat_badan) : null, 
                        tinggi_badan: ex.tinggi_badan !== '' ? Number(ex.tinggi_badan) : null, 
                        ziyadah: ex.ziyadah || null, 
                        murojaah: ex.murojaah || null, 
                        hari_sakit: ex.hari_sakit !== '' ? Number(ex.hari_sakit) : 0, 
                        hari_izin: ex.hari_izin !== '' ? Number(ex.hari_izin) : 0, 
                        hari_alpa: ex.hari_alpa !== '' ? Number(ex.hari_alpa) : 0, 
                        hari_pulang: ex.hari_pulang !== '' ? Number(ex.hari_pulang) : 0, 
                        catatan: ex.catatan || null 
                    } 
                } else {
                    return {
                        student_id: s.id,
                        report_type: reportType,
                        semester: selectedSemester,
                        academic_year: academicYear,
                        musyrif_name: musyrif,
                        updated_by: profile?.id ?? null,
                        updated_by_name: profile?.name ?? null,
                        scores: Object.fromEntries(Object.entries(sc).map(([k, v]) => [k, v === '' ? null : Number(v)])),
                        extras: {
                            berat_badan: ex.berat_badan !== '' ? Number(ex.berat_badan) : null,
                            tinggi_badan: ex.tinggi_badan !== '' ? Number(ex.tinggi_badan) : null,
                            hari_sakit: ex.hari_sakit !== '' ? Number(ex.hari_sakit) : 0,
                            hari_izin: ex.hari_izin !== '' ? Number(ex.hari_izin) : 0,
                            hari_alpa: ex.hari_alpa !== '' ? Number(ex.hari_alpa) : 0,
                            hari_pulang: ex.hari_pulang !== '' ? Number(ex.hari_pulang) : 0,
                            catatan: ex.catatan || null
                        }
                    }
                }
            })

            const tableName = rtObj.dbTable
            const conflictColumns = reportType === 'bulanan' 
                ? 'student_id,month,year' 
                : 'student_id,report_type,semester,academic_year'

            const { data: upserted, error } = await supabase
                .from(tableName)
                .upsert(payloads, { onConflict: conflictColumns })
                .select('id, student_id')

            if (error) throw error
            if (upserted?.length) {
                setExistingReportIds(prev => {
                    const next = { ...prev }
                    for (const r of upserted) next[r.student_id] = r.id
                    return next
                })
            }
            setSavedIds(prev => {
                const next = new Set(prev)
                studentsToSave.forEach(s => next.add(s.id))
                return next
            })
            const skipped = students.length - studentsToSave.length
            addToast(
                skipped > 0
                    ? `${studentsToSave.length} raport disimpan (${skipped} santri dilewati karena belum diisi)`
                    : `${studentsToSave.length} raport berhasil disimpan`,
                'success'
            )
            
            const suffixKey = reportType === 'bulanan' 
                ? `${selectedMonth}_${selectedYear}` 
                : `${selectedSemester}_${academicYear.replace('/', '_')}`
            try { const key = `draft_raport_${reportType}_${selectedClassId}_${suffixKey}`; localStorage.removeItem(key); setDraftAvailable(false) } catch { }

            logAudit({
                action: 'UPDATE', source: 'OPERATIONAL', tableName: tableName,
                newData: { bulk_save_all: true, count: studentsToSave.length, class_name: selectedClass?.name, report_type: reportType, month: selectedMonth, year: selectedYear, semester: selectedSemester, academic_year: academicYear }
            })
        } catch (e) { addToast(`Gagal menyimpan semua: ${e.message}`, 'error'); console.error('_doSaveAll error:', e) }
        finally { setSavingAll(false) }
    }, [students, scores, extras, reportType, selectedClass, selectedMonth, selectedYear, selectedSemester, academicYear, musyrif, selectedClassId, addToast])

    const saveAll = useCallback(async () => {
        const rtObj = RAPORT_TYPES[reportType] || RAPORT_TYPES.bulanan
        const criteria = rtObj.getCriteria(selectedClass)

        const hasAnyData = (sc, ex) =>
            criteria.some(k => sc[k.key] !== '' && sc[k.key] !== null && sc[k.key] !== undefined) ||
            [ex.berat_badan, ex.tinggi_badan, ex.ziyadah, ex.murojaah,
            ex.hari_sakit, ex.hari_izin, ex.hari_alpa, ex.hari_pulang, ex.catatan
            ].some(v => v !== '' && v !== null && v !== undefined)

        const studentsToSave = students.filter(s => hasAnyData(scores[s.id] || {}, extras[s.id] || {}))
        if (!studentsToSave.length) {
            addToast('Belum ada data yang diisi untuk disimpan', 'warning')
            return
        }
        const incomplete = students.filter(s => !isComplete(scores[s.id] || {}, criteria))
        if (incomplete.length > 0) {
            setSaveAllConfirm({ completedCount: completedCount, totalCount: students.length, incompleteCount: incomplete.length })
            return
        }
        await _doSaveAll()
    }, [students, scores, extras, reportType, selectedClass, completedCount, addToast, _doSaveAll])

    // ── Copy from last month ──
    const copyFromLastMonth = useCallback(async (fromMonth, fromYear, studentIds = null, overwriteAll = false) => {
        if (reportType !== 'bulanan') return
        if (!selectedClassId || !students.length) return
        const targetMonth = fromMonth ?? (selectedMonth === 1 ? 12 : selectedMonth - 1)
        const targetYear = fromYear ?? (selectedMonth === 1 ? selectedYear - 1 : selectedYear)
        setCopyingLastMonth(true)
        try {
            const ids = studentIds ?? students.map(s => s.id)
            const { data } = await supabase.from('student_monthly_reports').select('*').in('student_id', ids).eq('month', targetMonth).eq('year', targetYear)
            if (!data?.length) { addToast(`Tidak ada data untuk bulan ${BULAN.find(b => b.id === targetMonth)?.id_str} ${targetYear}`, 'warning'); return }
            
            const rtObj = RAPORT_TYPES[reportType]
            const criteria = rtObj.getCriteria(selectedClass)

            const toCopy = overwriteAll
                ? data
                : data.filter(rep => {
                    const cur = scores[rep.student_id] || {}
                    return criteria.every(k => cur[k.key] === '' || cur[k.key] === null || cur[k.key] === undefined)
                })
            const copied = toCopy.length
            setScores(prev => { const next = { ...prev }; for (const rep of toCopy) { next[rep.student_id] = { nilai_akhlak: rep.nilai_akhlak ?? '', nilai_ibadah: rep.nilai_ibadah ?? '', nilai_kebersihan: rep.nilai_kebersihan ?? '', nilai_quran: rep.nilai_quran ?? '', nilai_bahasa: rep.nilai_bahasa ?? '' } }; return next })
            setExtras(prev => { const next = { ...prev }; for (const rep of data) { const cur = next[rep.student_id] || {}; if (!cur.berat_badan && !cur.tinggi_badan) next[rep.student_id] = { ...cur, berat_badan: rep.berat_badan ?? '', tinggi_badan: rep.tinggi_badan ?? '' } }; return next })
            const copiedIds = new Set(toCopy.map(rep => rep.student_id))
            setSavedIds(prev => { const next = new Set(prev); for (const id of copiedIds) next.delete(id); return next })
            addToast(`Disalin dari ${BULAN.find(b => b.id === targetMonth)?.id_str} ${targetYear} — ${copied} santri`, 'success')
        } catch (e) { addToast('Gagal menyalin data', 'error'); console.error('copyFromLastMonth error:', e) }
        finally { setCopyingLastMonth(false) }
    }, [selectedClassId, students, selectedMonth, selectedYear, reportType, selectedClass, scores, addToast, setScores])

    // ── Reset Class (All Students) ──
    const resetClass = useCallback(async () => {
        if (!selectedClassId || !students.length) return
        
        // Clear all timers
        for (const studentId of Object.keys(autoSaveTimers.current)) {
            if (autoSaveTimers.current[studentId]) {
                clearTimeout(autoSaveTimers.current[studentId])
                delete autoSaveTimers.current[studentId]
            }
        }
        
        const rtObj = RAPORT_TYPES[reportType] || RAPORT_TYPES.bulanan
        const criteria = rtObj.getCriteria(selectedClass)

        // Clear local states for all students in the class
        const emptyScores = {}
        const emptyExtras = {}
        
        const emptySc = {}
        criteria.forEach(k => { emptySc[k.key] = '' })

        for (const s of students) {
            emptyScores[s.id] = emptySc
            emptyExtras[s.id] = { berat_badan: '', tinggi_badan: '', ziyadah: '', murojaah: '', hari_sakit: '', hari_izin: '', hari_alpa: '', hari_pulang: '', catatan: '' }
        }
        setScores(prev => ({ ...prev, ...emptyScores }))
        setExtras(prev => ({ ...prev, ...emptyExtras }))
        setSavedIds(prev => {
            const next = new Set(prev)
            for (const s of students) {
                next.delete(s.id)
            }
            return next
        })
        
        // Get database IDs to delete
        const dbIdsToDelete = students
            .map(s => existingReportIds[s.id])
            .filter(Boolean)
            
        if (!dbIdsToDelete.length) {
            addToast('Data kelas berhasil direset', 'success')
            return
        }
        
        setSavingAll(true)
        try {
            const { error } = await supabase.from(rtObj.dbTable).delete().in('id', dbIdsToDelete)
            if (error) throw error
            
            setExistingReportIds(prev => {
                const next = { ...prev }
                for (const s of students) {
                    delete next[s.id]
                }
                return next
            })
            
            addToast(`Data untuk ${students.length} santri berhasil direset`, 'success')
            await logAudit({
                action: 'DELETE', source: 'OPERATIONAL', tableName: rtObj.dbTable,
                description: `Reset all reports for class ${selectedClass?.name || selectedClassId} for type ${reportType} month/semester ${reportType === 'bulanan' ? selectedMonth : selectedSemester} year ${reportType === 'bulanan' ? selectedYear : academicYear}`
            })
        } catch (e) {
            addToast(`Gagal hapus dari DB: ${e.message}`, 'error')
            console.error('resetClass error:', e)
        } finally {
            setSavingAll(false)
        }
    }, [selectedClassId, students, existingReportIds, selectedMonth, selectedYear, selectedSemester, academicYear, reportType, selectedClass, addToast, setScores, setExtras, setSavedIds, setExistingReportIds])


    return {
        // States & refs
        addToast, settings, profile, now, isAllowed, canEdit,
        classesList, setClassesList, pageLoading, setPageLoading,
        searchQuery, setSearchQuery, filterType, setFilterType,
        isFilterOpen, setIsFilterOpen, stats, setStats,
        classProgress, setClassProgress, showAllIncompleteBanner, setShowAllIncompleteBanner,
        step, setStep, selectedClassId, setSelectedClassId,
        homeroomTeacherName, setHomeroomTeacherName, selectedMonth, setSelectedMonth,
        selectedYear, setSelectedYear, musyrif, setMusyrif, lang, setLang,
        reportType, setReportType, selectedSemester, setSelectedSemester, academicYear, setAcademicYear, isAcademicRaport,
        students, setStudents, loading, setLoading,
        transliterating, setTransliterating, scores, setScores, setScoresRaw,
        scoresHistoryRef, scoresHistoryIdxRef, extras, setExtras,
        saving, setSaving, savedIds, setSavedIds,
        existingReportIds, setExistingReportIds, savingAll, setSavingAll,
        copyingLastMonth, setCopyingLastMonth, studentSearch, setStudentSearch,
        draftAvailable, setDraftAvailable, isOnline, setIsOnline,
        newMonthBanner, setNewMonthBanner, prevMonthScores, setPrevMonthScores,
        studentTrend, setStudentTrend, catatanArabMap, setCatatanArabMap,
        saveAllConfirm, setSaveAllConfirm, showNoPhoneOnly, setShowNoPhoneOnly,
        showIncompleteOnly, setShowIncompleteOnly, lastSession, setLastSession,
        autoSaveTimers, completedCount, progressPct, noPhoneCount, hasUnsavedMemo,
        filteredClasses, step0Stats, selectedClass, classLevel, bulanObj,
        bulkMode, setBulkMode, bulkSelected, setBulkSelected, selectedStudentIds,
        previewStudentId, setPreviewStudentId, printQueue, setPrintQueue,
        printRenderedCount, setPrintRenderedCount,
        // Helper actions
        transliterateToArab, transliterateNames, loadStudents,
        loadDraft, clearDraft, saveStudent, resetStudent, resetClass, saveAll, _doSaveAll, copyFromLastMonth
    }
}
