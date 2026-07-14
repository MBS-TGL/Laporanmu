import React, { Fragment, useState, useEffect, useCallback, useRef, useMemo, memo, lazy, Suspense } from 'react'
import { createPortal } from 'react-dom'

import {
    Lock, Calendar, ChevronLeft, ChevronRight, Printer, Check, Loader2, Save, PieChart,
    Table, Search, ArrowLeft, ArrowRight, Eye, Download, CheckCircle2, AlertCircle, AlertTriangle,
    Zap, X, School, ClipboardList, Users, MoonStar, BookOpen, Brush, Languages, Star,
    Scale, Ruler, HeartPulse, DoorOpen, UploadCloud, FileText, FileSpreadsheet, FileArchive,
    Archive, Sliders, Plus, Filter, Sparkles, TrendingUp, TrendingDown, HelpCircle, Info,
    SortAsc, Wifi, Keyboard, Lightbulb, Moon, Sun, Maximize2, Minimize2, ChevronDown, Upload, ChevronUp,
    PenTool, Fingerprint,
    Cog,
    ActivityIcon,
    SlidersHorizontal
} from 'lucide-react'
const WhatsAppIcon = (props) => (
    <svg viewBox="0 0 448 512" fill="currentColor" {...props}>
        <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7 .9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z" />
    </svg>
)
import DashboardLayout from '@core/layouts/DashboardLayout'
import PageHeader from '@shared/components/PageHeader'
import { StatCard, EmptyState } from '@shared/components/DataDisplay'
import Modal from '@shared/components/Modal'
import RichSelect from '@shared/components/RichSelect'
import StatsCarousel from '@shared/components/StatsCarousel'
import { supabase } from '@lib/supabase'
import { logAudit } from '@utils/auditLogger'
import { useToast } from '@context/Toast'
import { useSchoolSettings } from '@context/SchoolSettings'
import { useAuth } from '@context/Auth'
import { useFlag } from '@context/FeatureFlags'

// Raport Components & Utils
import {
    MAX_SCORE, STORAGE_BUCKET, KRITERIA, GRADE, calcAvg, LABEL, toArabicNum,
    FISIK_FIELDS, HAFALAN_FIELDS, BULAN, CATATAN_TEMPLATES
} from '@utils/reports/raportConstants'
import { RAPORT_TYPES } from '@utils/reports/raportTypeRegistry'
import {
    isComplete, buildWaLines, escapeCsvCell, generateAutoComment
} from '@utils/reports/raportHelpers'
import { translitToAr, translitClassToAr, loadTranslitData } from '@utils/reports/translitData'
import { RadarChart, SparklineTrend } from '@features/raport/components/RaportCharts'
import RaportPrintCard from '@features/raport/components/RaportPrintCard'
import { buildRaportPrintDocumentHtml } from '@features/raport/utils/raportPrintHtml'
import RaportLayoutSettings, { loadLayoutConfig } from '@features/raport/components/RaportLayoutSettings'
import StudentRow, { ExtraInput, ExtraTextarea } from '@features/raport/components/RaportRecordRow'
import { ShortcutModalContent, WaBlastConfirmContent, WaBlastProgressContent, ZipBlastProgressContent } from '@features/raport/components/RaportModals'
import Skeleton from '@shared/components/Skeleton'
import { useRaportCore } from '@hooks/reports/useRaportCore'
import { useRaportImportExport } from '@hooks/reports/useRaportImportExport'
const LazyRaportInputTable = lazy(() => import('@features/raport/components/RaportInputTable'))
const LazyRaportArchive = lazy(() => import('@features/raport/components/RaportArchive'))

const LazyRaportImportModal = lazy(() => import('@features/raport/components/RaportImportModal'))
const LazyRaportExportModal = lazy(() => import('@features/raport/components/RaportExportModal'))
const LazyRaportTutorialModal = lazy(() => import('@features/raport/components/RaportTutorialModal').then(module => ({ default: module.RaportTutorialModal })))

// ─── Constants ───────────────────────────────────────────────────────────────

const ROW_HEIGHT = 188
const OVERSCAN = 5

// ─── Sub-components ──────────────────────────────────────────────────────────

const ClassCardSkeleton = () => (
    <div className="p-4 rounded-[2rem] border border-[var(--color-border)] bg-[var(--color-surface-alt)]">
        <div className="flex items-start justify-between mb-4">
            <Skeleton className="w-12 h-12 rounded-2xl" />
            <Skeleton className="w-16 h-5 rounded-lg opacity-60" />
        </div>
        <Skeleton className="h-5 w-3/4 rounded-lg mb-2" />
        <Skeleton className="h-3 w-1/2 rounded-md opacity-40" />
    </div>
)



// ─── Main Page ────────────────────────────────────────────────────────────────

function getPortalContainer(id) {
    let el = document.getElementById(id);
    if (!el) {
        el = document.createElement('div');
        el.id = id;
        document.body.appendChild(el);
    }
    return el;
}

export default function RaportPage() {
    const printContainerRef = useRef(null)
    const silentPrintRef = useRef(false) // skip executePrint saat generate PDF untuk WA
    const [layoutConfig, setLayoutConfig] = useState(() => loadLayoutConfig())
    const [pageSize, setPageSize] = useState('f4') // 'a4' | 'f4'

    // ── Hooks integration ──
    const core = useRaportCore()
    const {
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
        scoresHistoryRef, scoresHistoryIdxRef,
        printQueue, setPrintQueue, printRenderedCount, setPrintRenderedCount,
        bulkMode, setBulkMode, bulkSelected, setBulkSelected, selectedStudentIds,
        previewStudentId, setPreviewStudentId,
        extras, setExtras, saving, setSaving, savedIds, setSavedIds,
        existingReportIds, setExistingReportIds, savingAll, setSavingAll,
        copyingLastMonth, setCopyingLastMonth, studentSearch, setStudentSearch,
        draftAvailable, setDraftAvailable, isOnline, setIsOnline,
        newMonthBanner, setNewMonthBanner, prevMonthScores, setPrevMonthScores,
        studentTrend, setStudentTrend, catatanArabMap, setCatatanArabMap,
        saveAllConfirm, setSaveAllConfirm, showNoPhoneOnly, setShowNoPhoneOnly,
        showIncompleteOnly, setShowIncompleteOnly, lastSession, setLastSession,
        autoSaveTimers, completedCount, progressPct, noPhoneCount, hasUnsavedMemo,
        filteredClasses, step0Stats,
        transliterateToArab, transliterateNames, loadStudents, loadDraft, clearDraft,
        saveStudent, resetStudent, resetClass, saveAll, _doSaveAll, copyFromLastMonth,
        bulanObj, selectedClass
    } = core

    const activeRtObj = useMemo(() => RAPORT_TYPES[reportType] || RAPORT_TYPES.bulanan, [reportType])
    const activeCriteria = useMemo(() => activeRtObj.getCriteria(selectedClass), [activeRtObj, selectedClass])
    const activeMaxScore = activeRtObj.maxScore || 9
    const activeDbTable = activeRtObj.dbTable || 'student_monthly_reports'

    const years = useMemo(() => [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1], [now])

    const monthOptions = useMemo(() => BULAN.map(b => ({
        id: b.id,
        name: `${b.id_str} — ${b.ar}`
    })), [])

    const yearOptions = useMemo(() => years.map(y => ({
        id: y,
        name: String(y)
    })), [years])


    const importExport = useRaportImportExport(core, { printContainerRef, silentPrintRef, pageSize })
    const {
        raportLinks, setRaportLinks, sendingWA, setSendingWA,
        waBlastConfirm, setWaBlastConfirm, waBlast, setWaBlast,
        zipBlast, setZipBlast, exporting, setExporting,
        isImportModalOpen, setIsImportModalOpen, isExportModalOpen, setIsExportOpen: setIsExportModalOpen,
        waBlastAbortRef, zipAbortRef,
        buildWaMessage, sendWATextOnly, generatePDFBlob, uploadToSupabase,
        generateAndSendWA, runWaBlast, runZipBlast,
        handleExportCSV, handleExportExcel, handleExportAllClasses, handleExportZip, handlePrintAll,
        signMode, handleToggleSignMode, signatures
    } = importExport

    // ── Archive state
    const [archiveLoading, setArchiveLoading] = useState(false)
    const [archiveList, setArchiveList] = useState([])
    const [archiveFilter, setArchiveFilter] = useState({ classId: '', year: '', month: '' })
    const [archiveSearch, setArchiveSearch] = useState('')
    const [archiveSort, setArchiveSort] = useState('newest')
    const [archiveVisibleCount, setArchiveVisibleCount] = useState(12)
    const [archiveStatusFilter, setArchiveStatusFilter] = useState('all')
    const [archiveMinAvg, setArchiveMinAvg] = useState('')   // filter rata-rata < X
    const [archivePreview, setArchivePreview] = useState(null)
    const [trendModal, setTrendModal] = useState(null) // { student, trendData }

    // ── Archive inline edit state
    const [archiveEditMode, setArchiveEditMode] = useState(false)
    const [archiveEditScores, setArchiveEditScores] = useState({})
    const [archiveEditExtras, setArchiveEditExtras] = useState({})
    const [archiveEditSaving, setArchiveEditSaving] = useState(false)

    // ── Archive tab (list | ringkasan)
    const [archiveTab, setArchiveTab] = useState('list')
    const [tempSelectedClassId, setTempSelectedClassId] = useState('')

    const [generatingPdfIds, setGeneratingPdfIds] = useState(new Set())

    const handleDownloadPdf = useCallback(async (student) => {
        if (!student) return
        setGeneratingPdfIds(prev => {
            const next = new Set(prev)
            next.add(student.id)
            return next
        })
        try {
            const { blob, filename } = await generatePDFBlob(student)
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = filename
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)
            addToast(`✅ PDF ${student.name} berhasil diunduh`, 'success')
        } catch (err) {
            console.error(err)
            addToast('Gagal mengunduh PDF: ' + err.message, 'error')
        } finally {
            setGeneratingPdfIds(prev => {
                const next = new Set(prev)
                next.delete(student.id)
                return next
            })
        }
    }, [generatePDFBlob, addToast])
    const [classSelectionType, setClassSelectionType] = useState('all')
    const [classSelectionGrade, setClassSelectionGrade] = useState('all')

    const pickerFilteredClasses = useMemo(() => {
        let list = classesList

        if (searchQuery.trim()) {
            list = list.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
        }

        if (classSelectionType === 'boarding') {
            list = list.filter(c => (c.name || '').toLowerCase().includes('boarding') || (c.name || '').toLowerCase().includes('pondok'))
        } else if (classSelectionType === 'regular') {
            list = list.filter(c => !((c.name || '').toLowerCase().includes('boarding') || (c.name || '').toLowerCase().includes('pondok')))
        }

        if (classSelectionGrade !== 'all') {
            const g = classSelectionGrade
            list = list.filter(c => {
                const name = (c.name || '').toLowerCase()
                if (g === '7') return name.includes('7') || (name.includes('vii') && !name.includes('viii'))
                if (g === '8') return name.includes('8') || name.includes('viii')
                if (g === '9') return name.includes('9') || name.includes('ix')
                if (g === '10') return name.includes('10') || (name.includes('x') && !name.includes('ix'))
                return true
            })
        }

        return list
    }, [classesList, searchQuery, classSelectionType, classSelectionGrade])

    // ── Mobile card ──
    const [mobileActiveIdx, setMobileActiveIdx] = useState(0)

    // ── Student detail drawer ──
    const [studentDetailDrawer, setStudentDetailDrawer] = useState(null)
    const [studentDetailLoading, setStudentDetailLoading] = useState(false)

    // ── Modals
    const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false)
    const [headerMenuRect, setHeaderMenuRect] = useState(null)
    const headerMenuBtnRef = useRef(null)

    const [showShortcutModal, setShowShortcutModal] = useState(false)
    const [shortcutRect, setShortcutRect] = useState(null)
    const shortcutBtnRef = useRef(null)
    const saveAllRef = useRef(null)
    saveAllRef.current = saveAll
    const [showTutorialModal, setShowTutorialModal] = useState(false)
    const [showTemplatePreviewModal, setShowTemplatePreviewModal] = useState(false)

    const [hasOpenedImport, setHasOpenedImport] = useState(false)
    const [hasOpenedExport, setHasOpenedExport] = useState(false)
    const [hasOpenedTutorial, setHasOpenedTutorial] = useState(false)

    useEffect(() => { if (isImportModalOpen) setHasOpenedImport(true) }, [isImportModalOpen])
    useEffect(() => { if (isExportModalOpen) setHasOpenedExport(true) }, [isExportModalOpen])
    useEffect(() => { if (showTutorialModal) setHasOpenedTutorial(true) }, [showTutorialModal])
    const [previewZoom, setPreviewZoom] = useState(1) // 0.8 = 80% zoom out
    const [isFullScreenPreview, setIsFullScreenPreview] = useState(false)
    const [fullScreenZoom, setFullScreenZoom] = useState(1) // zoom khusus fullscreen
    const [showFullScreenHud, setShowFullScreenHud] = useState(true)
    const [isMobileViewport, setIsMobileViewport] = useState(() => (typeof window !== 'undefined' ? window.innerWidth < 768 : false))
    const [showMobileStudentPicker, setShowMobileStudentPicker] = useState(false)
    const [showSigDropdown, setShowSigDropdown] = useState(false)
    const [showActionDropdown, setShowActionDropdown] = useState(false)
    const previewContainerRef = useRef(null)
    const fullScreenScrollRef = useRef(null)
    const fullScreenHudTimerRef = useRef(null)
    const fullScreenLastTapRef = useRef(0)
    const bodyLockRef = useRef({ overflow: '', overscroll: '' })
    const manualZoomRef = useRef(false)
    const fullScreenPinchDistRef = useRef(null)
    const fullScreenPinchZoomRef = useRef(1)

    const fullScreenOuterWrapperRef = useRef(null)
    const fullScreenInnerWrapperRef = useRef(null)
    const fullScreenZoomLabelRef = useRef(null)
    const tempFullScreenZoomRef = useRef(fullScreenZoom)

    useEffect(() => {
        if (!showSigDropdown) return
        const handler = (e) => {
            if (!e.target.closest('[data-sig-dropdown-anchor]')) setShowSigDropdown(false)
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [showSigDropdown])

    useEffect(() => {
        if (!showActionDropdown) return
        const handler = (e) => {
            if (!e.target.closest('[data-action-dropdown-anchor]')) setShowActionDropdown(false)
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [showActionDropdown])

    useEffect(() => {
        tempFullScreenZoomRef.current = fullScreenZoom
        if (fullScreenZoomLabelRef.current) {
            fullScreenZoomLabelRef.current.textContent = `${Math.round(fullScreenZoom * 100)}%`
        }
        const naturalW = pageSize === 'f4' ? 812.6 : 793.7
        const naturalH = pageSize === 'f4' ? 1247 : 1122
        if (fullScreenOuterWrapperRef.current) {
            fullScreenOuterWrapperRef.current.style.width = `${naturalW * fullScreenZoom}px`
            fullScreenOuterWrapperRef.current.style.height = `${naturalH * fullScreenZoom}px`
        }
        if (fullScreenInnerWrapperRef.current) {
            fullScreenInnerWrapperRef.current.style.transform = `scale(${fullScreenZoom})`
        }
    }, [fullScreenZoom, pageSize])

    // Reset archive visible count on search/filter changes
    useEffect(() => {
        setArchiveVisibleCount(12)
    }, [archiveSearch, archiveFilter])

    // ── Auto-fit zoom: gunakan ResizeObserver agar akurat saat layout selesai render
    useEffect(() => {
        if (step !== 3) return
        manualZoomRef.current = false // Reset manual zoom if step or pageSize changes
        const calcFit = (containerW) => {
            // p-3 = 12px tiap sisi (24px total), p-10 = 40px tiap sisi (80px total)
            const padding = containerW < 640 ? 24 : 80
            const availW = containerW - padding
            const docW = pageSize === 'f4' ? 215 * 3.7795275591 : 210 * 3.7795275591
            const fit = Math.floor((availW / docW) * 100) / 100
            if (!manualZoomRef.current) {
                setPreviewZoom(Math.min(1, Math.max(0.3, fit)))
            }
        }
        // ResizeObserver — akurat, tidak bergantung pada window.innerWidth
        let ro
        const t = setTimeout(() => {
            const el = previewContainerRef.current
            if (!el) return
            calcFit(el.clientWidth)
            ro = new ResizeObserver(entries => {
                for (const e of entries) calcFit(e.contentRect.width)
            })
            ro.observe(el)
        }, 100)
        return () => { clearTimeout(t); ro?.disconnect() }
    }, [step, pageSize])

    useEffect(() => {
        const onResize = () => setIsMobileViewport(window.innerWidth < 768)
        window.addEventListener('resize', onResize)
        return () => window.removeEventListener('resize', onResize)
    }, [])

    // Safety unload block when there are unsaved drafts
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (hasUnsavedMemo) {
                const msg = 'Anda memiliki perubahan nilai yang belum disimpan. Apakah Anda yakin ingin keluar?'
                e.returnValue = msg
                return msg
            }
        }
        window.addEventListener('beforeunload', handleBeforeUnload)
        return () => window.removeEventListener('beforeunload', handleBeforeUnload)
    }, [hasUnsavedMemo])

    const getFullScreenFitZoom = useCallback((mobile = false) => {
        if (typeof window === 'undefined') return 1
        const docW = pageSize === 'f4' ? 215 * 3.7795275591 : 210 * 3.7795275591
        const horizontalPadding = mobile ? 28 : 120
        const availW = Math.max(320, window.innerWidth - horizontalPadding)
        return Math.min(mobile ? 1.25 : 1.3, Math.max(0.3, Math.floor((availW / docW) * 100) / 100))
    }, [pageSize])

    // ── Default zoom fullscreen: mobile fit-width, desktop 100%
    useEffect(() => {
        if (!isFullScreenPreview) return
        setFullScreenZoom(isMobileViewport ? getFullScreenFitZoom(true) : 1)
    }, [isFullScreenPreview, pageSize, isMobileViewport, getFullScreenFitZoom])

    const bumpFullScreenHud = useCallback(() => {
        setShowFullScreenHud(prev => prev ? prev : true)
        if (fullScreenHudTimerRef.current) clearTimeout(fullScreenHudTimerRef.current)
        if (!isFullScreenPreview || isMobileViewport) return
        fullScreenHudTimerRef.current = setTimeout(() => setShowFullScreenHud(false), 2000)
    }, [isFullScreenPreview, isMobileViewport])

    useEffect(() => {
        if (!isFullScreenPreview) {
            if (fullScreenHudTimerRef.current) clearTimeout(fullScreenHudTimerRef.current)
            setShowFullScreenHud(true)
            return
        }
        bumpFullScreenHud()
        return () => {
            if (fullScreenHudTimerRef.current) clearTimeout(fullScreenHudTimerRef.current)
        }
    }, [isFullScreenPreview, bumpFullScreenHud])

    // ── Lock body scroll while fullscreen modal open
    useEffect(() => {
        if (!isFullScreenPreview) return
        bodyLockRef.current = {
            overflow: document.body.style.overflow,
            overscroll: document.body.style.overscrollBehavior,
        }
        document.body.style.overflow = 'hidden'
        document.body.style.overscrollBehavior = 'none'
        return () => {
            document.body.style.overflow = bodyLockRef.current.overflow
            document.body.style.overscrollBehavior = bodyLockRef.current.overscroll
        }
    }, [isFullScreenPreview])

    // ── Confirm modals
    const [confirmDelete, setConfirmDelete] = useState(null)
    const [confirmModal, setConfirmModal] = useState(null)

    // ── Print
    const [pendingExport, setPendingExport] = useState(null)
    const [bulkValues, setBulkValues] = useState({})
    const [pendingNav, setPendingNav] = useState(null)
    const [templateOpenId, setTemplateOpenId] = useState(null) // FITUR 3: template catatan per santri

    // FIX 6: global auto-save indicator
    const [globalSaveIndicator, setGlobalSaveIndicator] = useState(null) // null | 'saving' | 'saved'
    const globalSaveTimerRef = useRef(null)
    const [stepVisible, setStepVisible] = useState(true)
    const prevStepRef = useRef(step)
    useEffect(() => {
        if (prevStepRef.current === step) return
        prevStepRef.current = step
        setStepVisible(false)
        const t = setTimeout(() => setStepVisible(true), 80)
        return () => clearTimeout(t)
    }, [step])

    // FIX 5: '/' shortcut fokus ke search kelas di step 0
    const searchInputRef = useRef(null)
    useEffect(() => {
        const handler = (e) => {
            if (step !== 0) return
            if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
                e.preventDefault()
                searchInputRef.current?.focus()
            }
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [step])

    // Close template dropdown saat klik di luar
    useEffect(() => {
        if (!templateOpenId) return
        const handler = (e) => {
            if (!e.target.closest('[data-template-anchor]')) setTemplateOpenId(null)
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [templateOpenId])
    // FIX MAJOR: state khusus untuk dismiss floating unsaved bar
    // — agar tombol × tidak memanipulasi savedIds (yang punya fungsi berbeda)
    const [unsavedBarDismissed, setUnsavedBarDismissed] = useState(false)

    // ── Refs
    const cellRefs = useRef({})
    // PERF: Virtual scroll — hanya render baris yang visible + overscan
    const tableScrollRef = useRef(null)
    const [visibleRange, setVisibleRange] = useState({ start: 0, end: 30 })

    // FIX 10: tab title dinamis — harus setelah selectedClass & bulanObj dideklarasi
    useEffect(() => {
        if (step === 2 && selectedClass?.name) {
            if (reportType === 'bulanan') {
                if (bulanObj?.id_str) {
                    document.title = `${selectedClass.name} · ${bulanObj.id_str} ${selectedYear} | Laporanmu`
                }
            } else {
                document.title = `${selectedClass.name} · Sem ${selectedSemester} (${academicYear}) | Laporanmu`
            }
        } else {
            document.title = `${isAcademicRaport ? 'Rapor & Penilaian' : 'Raport Pondok'} | Laporanmu`
        }
        return () => { document.title = 'Laporanmu' }
    }, [step, selectedClass, bulanObj, selectedYear, selectedSemester, academicYear, reportType, isAcademicRaport])

    // FIX MINOR: filteredStudents dipecah menjadi dua useMemo agar tidak
    // recompute setiap kali guru mengetik nilai.
    const baseFiltered = useMemo(() => {
        let list = students
        if (studentSearch.trim()) list = list.filter(s => s.name.toLowerCase().includes(studentSearch.toLowerCase()))
        if (showNoPhoneOnly) list = list.filter(s => !s.phone)
        return list
    }, [students, studentSearch, showNoPhoneOnly])

    // FIX MINOR: Saat showIncompleteOnly aktif, baris santri menghilang seketika
    // begitu nilai terakhir diisi — sebelum auto-save sempat jalan, membuat guru panik.
    // Solusi: gunakan snapshot filteredStudents yang di-update dengan debounce 1.5 detik
    // (sama dengan delay auto-save) saat filter "tidak lengkap" aktif.
    const [filteredStudents, setFilteredStudents] = useState(() => students)
    const filteredDebounceRef = useRef(null)
    useEffect(() => {
        const next = showIncompleteOnly
            ? baseFiltered.filter(s => !isComplete(scores[s.id] || {}, activeCriteria))
            : baseFiltered
        if (!showIncompleteOnly) {
            // Tanpa filter incomplete — update langsung, tidak perlu debounce, hindari re-render jika referensi sama
            setFilteredStudents(prev => {
                if (prev === next) return prev
                return next
            })
            return
        }
        // Dengan filter incomplete — debounce agar baris tidak langsung hilang
        // saat nilai terakhir baru saja diketik
        if (filteredDebounceRef.current) clearTimeout(filteredDebounceRef.current)
        filteredDebounceRef.current = setTimeout(() => setFilteredStudents(next), 1500)
        return () => { if (filteredDebounceRef.current) clearTimeout(filteredDebounceRef.current) }
    }, [baseFiltered, showIncompleteOnly, scores])

    // ── Fetch page data
    useEffect(() => {
        const fetchData = async () => {
            const curMonth = now.getMonth() + 1
            const curYear = now.getFullYear()
            try {
                // PERF #1: hanya fetch report bulan ini + 1 report terakhir per kelas
                // Sebelumnya fetch SEMUA history raport — mahal di DB besar
                const [classRes, studRes, curRepRes, lastRepRes] = await Promise.all([
                    supabase.from('classes').select('id, name, homeroom_teacher_id, teachers:homeroom_teacher_id(name)').order('name'),
                    supabase.from('students').select('id, class_id').is('deleted_at', null),
                    supabase.from('student_monthly_reports')
                        .select('student_id, nilai_akhlak, nilai_ibadah, nilai_kebersihan, nilai_quran, nilai_bahasa, berat_badan, tinggi_badan, hari_sakit, hari_izin, hari_alpa, hari_pulang, ziyadah, murojaah, catatan')
                        .eq('month', curMonth).eq('year', curYear),
                    supabase.from('student_monthly_reports')
                        .select('student_id, month, year')
                        .order('year', { ascending: false })
                        .order('month', { ascending: false })
                        .limit(5000),
                ])
                if (classRes.error) throw classRes.error
                if (studRes.error) throw studRes.error
                const classes = classRes.data || []
                const allStudents = studRes.data || []
                const curReports = curRepRes.data || []
                const lastReports = lastRepRes.data || []
                setClassesList(classes)
                setStats({
                    totalKelas: classes.length,
                    totalSiswa: allStudents.length,
                    totalRaport: lastReports.length,
                    bulanIni: curMonth,
                })
                const stuByClass = {}
                for (const s of allStudents) {
                    if (!stuByClass[s.class_id]) stuByClass[s.class_id] = []
                    stuByClass[s.class_id].push(s.id)
                }
                const stuToClass = {}
                for (const s of allStudents) stuToClass[s.id] = s.class_id
                const curProgressByStudent = {}
                for (const r of curReports) {
                    const progressFields = [
                        r.nilai_akhlak,
                        r.nilai_ibadah,
                        r.nilai_kebersihan,
                        r.nilai_quran,
                        r.nilai_bahasa,
                    ]
                    const filled = progressFields.filter(v => v !== '' && v !== null && v !== undefined).length
                    curProgressByStudent[r.student_id] = filled / progressFields.length
                }
                const curDoneSet = new Set(
                    curReports
                        .filter(r => ['nilai_akhlak', 'nilai_ibadah', 'nilai_kebersihan', 'nilai_quran', 'nilai_bahasa']
                            .every(k => r[k] !== '' && r[k] !== null && r[k] !== undefined))
                        .map(r => r.student_id)
                )
                const lastReportByClass = {}
                for (const r of lastReports) {
                    const cid = stuToClass[r.student_id]
                    if (!cid) continue
                    if (!lastReportByClass[cid]) {
                        lastReportByClass[cid] = { month: r.month, year: r.year }
                    }
                }
                const prog = {}
                for (const cls of classes) {
                    const ids = stuByClass[cls.id] || []
                    prog[cls.id] = {
                        total: ids.length,
                        done: ids.filter(id => curDoneSet.has(id)).length,
                        pct: ids.length ? Math.round((ids.reduce((acc, id) => acc + (curProgressByStudent[id] || 0), 0) / ids.length) * 100) : 0,
                        lastMonth: lastReportByClass[cls.id]?.month ?? null,
                        lastYear: lastReportByClass[cls.id]?.year ?? null,
                    }
                }
                setClassProgress(prog)
            } catch (e) {
                console.error('fetchData error:', e)
            } finally {
                setPageLoading(false)
            }
        }
        fetchData()
    }, [])

    // ── Auto-arsip banner
    useEffect(() => {
        if (!classesList.length) return
        const today = new Date()
        const dayOfMonth = today.getDate()
        // Banner muncul setelah tanggal 20 sampai akhir bulan
        if (dayOfMonth < 20) return
        const prevMonth = today.getMonth() === 0 ? 12 : today.getMonth()
        const prevYear = today.getMonth() === 0 ? today.getFullYear() - 1 : today.getFullYear()

        // Cek apakah banner bulan ini sudah pernah di-dismiss permanen
        const dismissKey = `banner_dismissed_${prevYear}_${prevMonth}`
        if (localStorage.getItem(dismissKey)) return

        const check = async () => {
            try {
                const classIds = classesList.map(c => c.id)
                const { data: stuData } = await supabase.from('students').select('id, class_id').in('class_id', classIds).is('deleted_at', null)
                if (!stuData?.length) return
                const allStudentIds = stuData.map(s => s.id)
                const { data: repData } = await supabase.from('student_monthly_reports').select('student_id').in('student_id', allStudentIds).eq('month', prevMonth).eq('year', prevYear)
                const archivedSet = new Set((repData || []).map(r => r.student_id))
                const stuByClass = {}
                for (const s of stuData) { if (!stuByClass[s.class_id]) stuByClass[s.class_id] = []; stuByClass[s.class_id].push(s.id) }
                // Kelas dianggap belum lengkap kalau ADA santri yang belum punya raport bulan itu
                const missing = classesList.filter(cls => {
                    const ids = stuByClass[cls.id] || []
                    return ids.length > 0 && ids.some(id => !archivedSet.has(id))
                }).map(cls => {
                    const ids = stuByClass[cls.id] || []
                    const filledCount = ids.filter(id => archivedSet.has(id)).length
                    return { class_id: cls.id, class_name: cls.name, filled: filledCount, total: ids.length }
                })
                if (missing.length) setNewMonthBanner({ prevMonth, prevYear, prevMonthStr: BULAN.find(b => b.id === prevMonth)?.id_str || '', classesNotArchived: missing, dismissKey })
            } catch (e) { console.error('Auto-arsip banner check error:', e) }
        }
        check()
    }, [classesList])

    // ── Reset student search when class changes
    useEffect(() => { setStudentSearch(''); setMusyrif(''); setCatatanArabMap({}) }, [selectedClassId])


    // ── Fetch homeroom teacher
    // FIX MINOR: dulu 2 query terpisah (N+1), sekarang 1 query dengan join
    useEffect(() => {
        if (!selectedClassId) { setHomeroomTeacherName(''); return }
        supabase
            .from('classes')
            .select('homeroom_teacher_id, teachers:homeroom_teacher_id(name)')
            .eq('id', selectedClassId)
            .single()
            .then(({ data }) => {
                const name = data?.teachers?.name || ''
                setHomeroomTeacherName(name)
                setMusyrif(prev => prev ? prev : name)
            })
    }, [selectedClassId])

    // ── Online/offline listener
    useEffect(() => {
        const onOnline = () => { setIsOnline(true); addToast('Koneksi kembali ✅', 'success') }
        const onOffline = () => { setIsOnline(false); addToast('Offline — data draft disimpan lokal', 'warning') }
        window.addEventListener('online', onOnline)
        window.addEventListener('offline', onOffline)
        return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline) }
    }, [])

    // ── Check localStorage draft when class+month+year selected
    useEffect(() => {
        if (!selectedClassId || !selectedMonth || !selectedYear) { setDraftAvailable(false); return }
        const key = `draft_raport_${selectedClassId}_${selectedMonth}_${selectedYear}`
        try { setDraftAvailable(!!localStorage.getItem(key)) } catch { setDraftAvailable(false) }
    }, [selectedClassId, selectedMonth, selectedYear])

    // ── Auto-save draft to localStorage on score/extra changes (step 2)
    // FIX MAJOR: debounce 500ms — mencegah write tiap keystroke & QuotaExceededError di mobile
    const draftSaveTimerRef = useRef(null)
    useEffect(() => {
        if (step !== 2 || !selectedClassId || !students.length) return
        if (draftSaveTimerRef.current) clearTimeout(draftSaveTimerRef.current)
        draftSaveTimerRef.current = setTimeout(() => {
            const key = `draft_raport_${selectedClassId}_${selectedMonth}_${selectedYear}`
            try {
                const payload = JSON.stringify({ scores, extras, savedAt: Date.now() })
                // Guard: jangan simpan kalau >4MB agar tidak QuotaExceededError
                if (payload.length > 4 * 1024 * 1024) {
                    console.warn('Draft terlalu besar, skip localStorage save')
                    return
                }
                localStorage.setItem(key, payload)
            } catch (e) {
                console.error('Draft localStorage save error:', e)
            }
        }, 500)
        return () => { if (draftSaveTimerRef.current) clearTimeout(draftSaveTimerRef.current) }
    }, [scores, extras, step, selectedClassId, selectedMonth, selectedYear, students.length])

    // FIX #4: Cleanup semua autoSaveTimers saat komponen unmount
    useEffect(() => {
        return () => {
            Object.values(autoSaveTimers.current).forEach(clearTimeout)
        }
    }, [])

    // ── Shortcut: "?" key opens shortcut modal
    useEffect(() => {
        const handler = (e) => {
            if (e.key === '?' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
                if (!showShortcutModal && shortcutBtnRef.current) {
                    setShortcutRect(shortcutBtnRef.current.getBoundingClientRect())
                }
                setShowShortcutModal(v => !v)
            }
            if (e.key === 'Escape') setShowShortcutModal(false)
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [showShortcutModal])

    // Sticky positioning for portaled shortcuts dropdown
    useEffect(() => {
        if (!showShortcutModal) return
        const update = () => {
            if (shortcutBtnRef.current) setShortcutRect(shortcutBtnRef.current.getBoundingClientRect())
        }
        update()
        window.addEventListener('scroll', update, true)
        window.addEventListener('resize', update)
        return () => {
            window.removeEventListener('scroll', update, true)
            window.removeEventListener('resize', update)
        }
    }, [showShortcutModal])

    // FIX #3: Ctrl+S — gunakan ref agar tidak ada TDZ (saveAll belum tersedia saat useEffect ini dibaca)
    useEffect(() => {
        const handler = (e) => { if ((e.ctrlKey || e.metaKey) && e.key === 's' && step === 2) { e.preventDefault(); saveAllRef.current?.() } }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [step])

    // ── Ctrl+Z Undo / Ctrl+Y Redo (scores only, step 2)
    useEffect(() => {
        const handler = (e) => {
            if (step !== 2) return
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault()
                const hist = scoresHistoryRef.current
                const idx = scoresHistoryIdxRef.current
                if (idx > 0) {
                    scoresHistoryIdxRef.current = idx - 1
                    setScoresRaw(JSON.parse(JSON.stringify(hist[idx - 1])))
                    addToast('Undo nilai', 'info')
                }
            } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
                e.preventDefault()
                const hist = scoresHistoryRef.current
                const idx = scoresHistoryIdxRef.current
                if (idx < hist.length - 1) {
                    scoresHistoryIdxRef.current = idx + 1
                    setScoresRaw(JSON.parse(JSON.stringify(hist[idx + 1])))
                    addToast('Redo nilai', 'info')
                }
            }
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [step, addToast])


    // ── Export methods mapped from hooks ──
    const exportCSV = useCallback(() => {
        handleExportCSV('all', {
            columns: ['nama', 'nilai_akhlak', 'nilai_ibadah', 'nilai_kebersihan', 'nilai_quran', 'nilai_bahasa', 'avg', 'predikat', 'berat_badan', 'tinggi_badan', 'ziyadah', 'murojaah', 'hari_sakit', 'hari_izin', 'hari_alpa', 'hari_pulang', 'catatan'],
            fileName: `Raport_${selectedClass?.name || ''}_${bulanObj?.id_str || ''}_${selectedYear}`
        })
    }, [handleExportCSV, selectedClass, bulanObj, selectedYear])

    const exportXLS = useCallback(() => {
        handleExportExcel('all', {
            columns: ['nama', 'nilai_akhlak', 'nilai_ibadah', 'nilai_kebersihan', 'nilai_quran', 'nilai_bahasa', 'avg', 'predikat', 'berat_badan', 'tinggi_badan', 'ziyadah', 'murojaah', 'hari_sakit', 'hari_izin', 'hari_alpa', 'hari_pulang', 'catatan'],
            fileName: `Raport_${selectedClass?.name || ''}_${bulanObj?.id_str || ''}_${selectedYear}`
        })
    }, [handleExportExcel, selectedClass, bulanObj, selectedYear])

    const exportAllClassesXLS = useCallback(() => {
        handleExportAllClasses(`Raport_Semua_Kelas_${bulanObj?.id_str || ''}_${selectedYear}`)
    }, [handleExportAllClasses, bulanObj, selectedYear])



    // ── Import XLS
    const fileInputRef = useRef(null)
    // Update rect on scroll to keep dropdowns attached
    useEffect(() => {
        if (isHeaderMenuOpen || showShortcutModal) {
            const handleScroll = () => {
                if (isHeaderMenuOpen && headerMenuBtnRef.current) {
                    setHeaderMenuRect(headerMenuBtnRef.current.getBoundingClientRect());
                }
                if (showShortcutModal && shortcutBtnRef.current) {
                    setShortcutRect(shortcutBtnRef.current.getBoundingClientRect());
                }
            };
            window.addEventListener('scroll', handleScroll, { passive: true });
            return () => window.removeEventListener('scroll', handleScroll);
        }
    }, [isHeaderMenuOpen, showShortcutModal]);

    const importXLS = useCallback(async (e) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Reset input agar bisa pilih file yang sama lagi
        e.target.value = ''

        // Guard: Import XLS hanya support schema raport bulanan
        if (reportType !== 'bulanan') {
            addToast('Import XLS hanya tersedia untuk Raport Bulanan. Gunakan input manual untuk tipe raport lain.', 'warning')
            return
        }

        const XLSX = await import('xlsx')

        setLoading(true)
        try {
            const reader = new FileReader()
            const data = await new Promise((resolve, reject) => {
                reader.onload = (evt) => resolve(evt.target.result)
                reader.onerror = reject
                reader.readAsArrayBuffer(file)
            })

            const wb = XLSX.read(data, { type: 'array' })

            // 1. Ambil data master untuk mapping
            const { data: allCls } = await supabase.from('classes').select('id, name')
            const { data: allStu } = await supabase.from('students').select('id, name, class_id').is('deleted_at', null)

            const classMap = {} // name -> id
            allCls?.forEach(c => { classMap[c.name.toLowerCase().trim()] = c.id })

            const payloads = []
            let totalProcessed = 0
            let notFound = []

            // 2. Proses tiap Sheet
            for (const sheetName of wb.SheetNames) {
                const ws = wb.Sheets[sheetName]
                const jsonData = XLSX.utils.sheet_to_json(ws, { header: 1 }) // Ambil raw rows

                if (jsonData.length < 2) continue // Skip sheet kosong/hanya header

                // Cari class_id berdasarkan nama sheet
                const clsId = classMap[sheetName.toLowerCase().trim()]

                // Iterasi baris data (skip header di index 0)
                for (let i = 1; i < jsonData.length; i++) {
                    const row = jsonData[i]
                    const sName = String(row[1] || '').trim() // Nama di kolom B (index 1)
                    if (!sName) continue

                    // Cari student_id berdasarkan nama + class_id (jika sheet name valid)
                    const student = allStu?.find(s =>
                        s.name.toLowerCase().trim() === sName.toLowerCase() &&
                        (!clsId || s.class_id === clsId)
                    )

                    if (!student) {
                        notFound.push(`${sName} (${sheetName})`)
                        continue
                    }

                    // Map values (pastikan index sesuai dengan exporter)
                    // Index: 2=Akhlak, 3=Ibadah, 4=Kebersihan, 5=Quran, 6=Bahasa
                    // Index: 9=BB, 10=TB, 11=Ziyadah, 12=Murojaah, 13=Sakit, 14=Izin, 15=Alpa, 16=Pulang, 17=Catatan
                    const getNum = (val) => (val === '' || val === undefined || val === null) ? null : Number(val)

                    payloads.push({
                        student_id: student.id,
                        month: selectedMonth,
                        year: selectedYear,
                        musyrif_name: musyrif,
                        updated_by: profile?.id ?? null,
                        updated_by_name: profile?.name ?? null,
                        nilai_akhlak: getNum(row[2]),
                        nilai_ibadah: getNum(row[3]),
                        nilai_kebersihan: getNum(row[4]),
                        nilai_quran: getNum(row[5]),
                        nilai_bahasa: getNum(row[6]),
                        berat_badan: getNum(row[9]),
                        tinggi_badan: getNum(row[10]),
                        ziyadah: row[11] || null,
                        murojaah: row[12] || null,
                        hari_sakit: getNum(row[13]) || 0,
                        hari_izin: getNum(row[14]) || 0,
                        hari_alpa: getNum(row[15]) || 0,
                        hari_pulang: getNum(row[16]) || 0,
                        catatan: row[17] || null
                    })
                    totalProcessed++
                }
            }

            if (payloads.length === 0) {
                addToast('Tidak ada data valid yang bisa diimport', 'warning')
                return
            }

            // 3. Bulk Upsert ke Supabase
            const { error: upsErr } = await supabase
                .from('student_monthly_reports')
                .upsert(payloads, { onConflict: 'student_id,month,year' })

            if (upsErr) throw upsErr

            addToast(`Berhasil import ${totalProcessed} data raport`, 'success')
            if (notFound.length > 0) {
                console.warn('Siswa tidak ditemukan:', notFound)
                addToast(`${notFound.length} siswa tidak ditemukan di database (cek log)`, 'warning')
            }

            // Reload data jika kelas yang sedang dibuka termasuk yang diimport
            loadStudents()

            logAudit({
                action: 'INSERT', source: 'OPERATIONAL', tableName: 'student_monthly_reports',
                newData: { method: 'IMPORT_XLS', count: totalProcessed, file_name: file.name }
            })

        } catch (err) {
            addToast('Gagal import: ' + err.message, 'error')
            console.error(err)
        } finally {
            setLoading(false)
        }
    }, [selectedMonth, selectedYear, musyrif, profile, addToast, loadStudents, reportType])

    // ── Auto-save
    const triggerAutoSave = useCallback((studentId) => {
        setSavedIds(prev => { const next = new Set(prev); next.delete(studentId); return next })
        if (autoSaveTimers.current[studentId]) clearTimeout(autoSaveTimers.current[studentId])
        // FIX 6: show "Menyimpan..." indicator
        setGlobalSaveIndicator('saving')
        if (globalSaveTimerRef.current) clearTimeout(globalSaveTimerRef.current)
        autoSaveTimers.current[studentId] = setTimeout(() => {
            saveStudent(studentId)
            setGlobalSaveIndicator('saved')
            globalSaveTimerRef.current = setTimeout(() => setGlobalSaveIndicator(null), 2000)
        }, 3000)
    }, [saveStudent])

    // PERF: Stable callback untuk update extras field — diperlukan agar ExtraInput memo()
    // tidak re-render tiap parent render (karena inline arrow selalu buat referensi baru).
    const handleExtraChange = useCallback((studentId, key, value) => {
        setExtras(prev => ({ ...prev, [studentId]: { ...prev[studentId], [key]: value } }))
        setSavedIds(prev => { const n = new Set(prev); n.delete(studentId); return n })
        triggerAutoSave(studentId)
    }, [triggerAutoSave])

    // Sama dengan handleExtraChange tapi juga reset terjemahan Arab catatan
    const handleCatatanChange = useCallback((studentId, key, value) => {
        setExtras(prev => ({ ...prev, [studentId]: { ...prev[studentId], [key]: value } }))
        setSavedIds(prev => { const n = new Set(prev); n.delete(studentId); return n })
        triggerAutoSave(studentId)
        setCatatanArabMap(prev => { const n = { ...prev }; delete n[studentId]; return n })
    }, [triggerAutoSave])

    // PERF: Stable callback untuk ScoreCell onChange — tiap inline arrow baru = ScoreCell re-render
    const handleScoreChange = useCallback((studentId, key, value) => {
        setScores(prev => ({ ...prev, [studentId]: { ...prev[studentId], [key]: value } }))
        setSavedIds(prev => { const n = new Set(prev); n.delete(studentId); return n })
        triggerAutoSave(studentId)
    }, [triggerAutoSave])

    // Stable: toggle template dropdown per santri
    const handleTemplateToggle = useCallback((studentId) => {
        setTemplateOpenId(prev => prev === studentId ? null : studentId)
    }, [])

    // Stable: apply template catatan ke santri
    const handleTemplateApply = useCallback((studentId, tmpl) => {
        setExtras(prev => ({ ...prev, [studentId]: { ...prev[studentId], catatan: tmpl } }))
        setSavedIds(prev => { const n = new Set(prev); n.delete(studentId); return n })
        triggerAutoSave(studentId)
        setTemplateOpenId(null)
        setCatatanArabMap(prev => { const n = { ...prev }; delete n[studentId]; return n })
    }, [triggerAutoSave])

    // Stable: toggle terjemahan Arab catatan
    const handleTranslitToggle = useCallback(async (studentId, catatan, currentArab) => {
        if (currentArab) {
            setCatatanArabMap(prev => { const n = { ...prev }; delete n[studentId]; return n })
        } else {
            const arab = await transliterateToArab(catatan)
            setCatatanArabMap(prev => ({ ...prev, [studentId]: arab }))
        }
    }, [transliterateToArab])

    // Stable: bulk checkbox toggle
    const handleBulkToggle = useCallback((studentId, checked) => {
        setBulkSelected(prev => { const n = new Set(prev); checked ? n.add(studentId) : n.delete(studentId); return n })
    }, [])

    // Stable: PDF preview
    const handlePDF = useCallback((studentId) => {
        setPreviewStudentId(studentId); setStep(3)
    }, [])

    // Stable: reset student — wrap dalam confirmModal
    const handleResetStudent = useCallback((student) => {
        setConfirmModal({
            title: 'Reset Nilai?',
            description: 'Nilai santri akan dikosongkan',
            body: (
                <>
                    Siswa <span className="text-red-500 font-black px-1.5 py-0.5 bg-red-500/10 rounded-md border border-red-500/20">{student.name}</span> akan direset. Nilai akademik, hafalan, fisik, dan catatan santri ini akan dihapus secara permanen dari database.
                </>
            ),
            icon: AlertTriangle,
            iconBg: 'bg-red-500/10',
            iconColor: 'text-red-500',
            variant: 'red',
            confirmLabel: 'Ya, Reset Semua',
            confirmIcon: AlertTriangle,
            onConfirm: () => { setConfirmModal(null); resetStudent(student.id) }
        })
    }, [resetStudent])

    const handleResetClass = useCallback(() => {
        setConfirmModal({
            title: 'Reset Nilai Satu Kelas?',
            description: 'Nilai satu kelas akan dikosongkan',
            body: (
                <>
                    Semua data nilai untuk kelas <span className="text-red-500 font-black px-1.5 py-0.5 bg-red-500/10 rounded-md border border-red-500/20">{selectedClass?.name || ''}</span> akan dikosongkan. Nilai akademik, hafalan, fisik, dan catatan seluruh santri di kelas ini akan dihapus secara permanen dari database.
                </>
            ),
            icon: AlertTriangle,
            iconBg: 'bg-red-500/10',
            iconColor: 'text-red-500',
            variant: 'red',
            confirmLabel: 'Ya, Reset Kelas',
            confirmIcon: AlertTriangle,
            onConfirm: () => { setConfirmModal(null); resetClass() }
        })
    }, [resetClass, selectedClass])





    // ── Keyboard nav
    const handleKeyDown = useCallback((e, studentIdx, kriteriaIdx) => {
        // FIX MINOR: Virtual scroll hanya me-render baris yang terlihat.
        // Sebelumnya focus() langsung dipanggil — jika baris tujuan di luar
        // viewport, ref-nya undefined dan fokus gagal diam-diam.
        // Solusi: scroll dulu ke posisi baris tujuan, lalu fokus setelah
        // satu frame agar React sempat merender baris tersebut.
        const focusCell = (si, ki) => {
            const el = cellRefs.current[`${si}-${ki}`]
            if (el) {
                el.focus()
                // Move cursor to end (works for type="number" too)
                const val = el.value
                el.value = ''
                el.value = val
            } else if (tableScrollRef.current) {
                // Baris belum di-render — scroll container ke posisi estimasi
                tableScrollRef.current.scrollTop = si * ROW_HEIGHT
                requestAnimationFrame(() => {
                    const elDelayed = cellRefs.current[`${si}-${ki}`]
                    if (elDelayed) {
                        elDelayed.focus()
                        const valD = elDelayed.value
                        elDelayed.value = ''
                        elDelayed.value = valD
                    }
                })
            }
        }
        if (e.key === 'Tab' || e.key === 'Enter') {
            e.preventDefault()
            let nSi = studentIdx, nKi = kriteriaIdx + 1
            if (nKi >= KRITERIA.length) { nKi = 0; nSi = studentIdx + 1 }
            if (nSi >= filteredStudents.length) nSi = 0
            focusCell(nSi, nKi)
        }
        if (e.key === 'ArrowDown') { e.preventDefault(); focusCell(studentIdx + 1, kriteriaIdx) }
        if (e.key === 'ArrowUp') { e.preventDefault(); focusCell(studentIdx - 1, kriteriaIdx) }
        if (e.key === 'ArrowRight') { e.preventDefault(); focusCell(studentIdx, kriteriaIdx + 1) }
        if (e.key === 'ArrowLeft') { e.preventDefault(); focusCell(studentIdx, kriteriaIdx - 1) }
    }, [filteredStudents.length])

    // ── Archive
    const loadArchive = useCallback(async () => {
        setArchiveLoading(true)
        try {
            // FIX MAJOR: Supabase membatasi response default 1000 baris.
            // Tanpa paginasi, arsip lama akan terpotong diam-diam tanpa error.
            // Solusi: fetch dalam batch 1000 hingga tidak ada data tersisa.
            const PAGE_SIZE = 1000
            let allReports = []
            let page = 0
            const tableName = reportType === 'bulanan' ? 'student_monthly_reports' : 'student_semester_reports'
            const selectCols = reportType === 'bulanan'
                ? 'student_id, month, year, musyrif_name, nilai_akhlak, nilai_ibadah, nilai_kebersihan, nilai_quran, nilai_bahasa'
                : 'student_id, report_type, semester, academic_year, musyrif_name, scores, extras'

            while (true) {
                let query = supabase.from(tableName).select(selectCols)
                if (reportType !== 'bulanan') {
                    query = query.eq('report_type', reportType)
                }
                const { data: batch, error: batchErr } = await query
                    .order(reportType === 'bulanan' ? 'year' : 'academic_year', { ascending: false })
                    .order(reportType === 'bulanan' ? 'month' : 'semester', { ascending: false })
                    .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
                if (batchErr) throw batchErr
                if (!batch?.length) break
                allReports = allReports.concat(batch)
                // Jika batch kurang dari PAGE_SIZE, berarti sudah halaman terakhir
                if (batch.length < PAGE_SIZE) break
                page++
            }
            const reports = allReports
            if (!reports.length) { setArchiveList([]); return }
            const studentIds = [...new Set(reports.map(r => r.student_id))]
            const { data: stuData } = await supabase.from('students').select('id, class_id').in('id', studentIds)
            const classIds = [...new Set((stuData || []).map(s => s.class_id).filter(Boolean))]
            const { data: classData } = await supabase.from('classes').select('id, name, grade, major').in('id', classIds)
            const stuMap = {}, clsMap = {}
            for (const s of (stuData || [])) stuMap[s.id] = s
            for (const c of (classData || [])) clsMap[c.id] = c
            const grouped = {}
            const rtObj = RAPORT_TYPES[reportType] || RAPORT_TYPES.bulanan

            for (const row of reports) {
                const stu = stuMap[row.student_id]; if (!stu?.class_id) continue
                const cls = clsMap[stu.class_id]; if (!cls) continue
                if (reportType === 'bulanan') {
                    const key = `${cls.id}__${row.month}__${row.year}`
                    if (!grouped[key]) grouped[key] = { key, class_id: cls.id, class_name: cls.name, month: row.month, year: row.year, musyrif: row.musyrif_name, count: 0, completed: 0, lang: 'id' }
                    grouped[key].count++
                    const hasAllMainScores = ['nilai_akhlak', 'nilai_ibadah', 'nilai_kebersihan', 'nilai_quran', 'nilai_bahasa']
                        .every(k => row[k] !== '' && row[k] !== null && row[k] !== undefined)
                    if (hasAllMainScores) grouped[key].completed++
                } else {
                    const key = `${cls.id}__${row.semester}__${row.academic_year.replace('/', '_')}`
                    if (!grouped[key]) grouped[key] = {
                        key,
                        class_id: cls.id,
                        class_name: cls.name,
                        semester: row.semester,
                        academic_year: row.academic_year,
                        report_type: row.report_type,
                        musyrif: row.musyrif_name,
                        count: 0,
                        completed: 0,
                        lang: 'id'
                    }
                    grouped[key].count++
                    const criteria = rtObj.getCriteria(cls)
                    const hasAllMainScores = criteria.every(k => row.scores?.[k.key] !== '' && row.scores?.[k.key] !== null && row.scores?.[k.key] !== undefined)
                    if (hasAllMainScores) grouped[key].completed++
                }
            }
            const list = Object.values(grouped).sort((a, b) => {
                if (reportType === 'bulanan') {
                    return b.year - a.year || b.month - a.month
                } else {
                    return b.academic_year.localeCompare(a.academic_year) || b.semester - a.semester
                }
            })
            setArchiveList(list)
            if (list.length > 0) {
                const latest = list[0]
                setArchiveFilter(prev => {
                    if (reportType === 'bulanan') {
                        if (!prev.year && !prev.month) {
                            return { ...prev, year: String(latest.year), month: String(latest.month) }
                        }
                    } else {
                        if (!prev.academic_year && !prev.semester) {
                            return { ...prev, academic_year: latest.academic_year, semester: String(latest.semester) }
                        }
                    }
                    return prev
                })
            }
        } catch (e) { addToast('Gagal memuat arsip', 'error'); console.error('loadArchive error:', e) }
        finally { setArchiveLoading(false) }
    }, [addToast, reportType])

    // ── Load student trend
    const loadStudentTrend = useCallback(async (stuIds) => {
        if (!stuIds?.length) return
        try {
            const tableName = reportType === 'bulanan' ? 'student_monthly_reports' : 'student_semester_reports'
            let query = supabase.from(tableName)
            if (reportType === 'bulanan') {
                query = query.select('student_id, month, year, nilai_akhlak, nilai_ibadah, nilai_kebersihan, nilai_quran, nilai_bahasa')
                    .in('student_id', stuIds)
                    .order('year').order('month')
            } else {
                query = query.select('student_id, semester, academic_year, scores')
                    .eq('report_type', reportType)
                    .in('student_id', stuIds)
                    .order('academic_year').order('semester')
            }
            const { data } = await query
            const trendMap = {}
            for (const r of (data || [])) {
                if (!trendMap[r.student_id]) trendMap[r.student_id] = []
                if (reportType === 'bulanan') {
                    trendMap[r.student_id].push({ month: r.month, year: r.year, scores: { nilai_akhlak: r.nilai_akhlak, nilai_ibadah: r.nilai_ibadah, nilai_kebersihan: r.nilai_kebersihan, nilai_quran: r.nilai_quran, nilai_bahasa: r.nilai_bahasa } })
                } else {
                    trendMap[r.student_id].push({ semester: r.semester, academic_year: r.academic_year, scores: r.scores })
                }
            }
            setStudentTrend(trendMap)
        } catch (e) { console.error('loadStudentTrend error:', e) }
    }, [reportType])

    const loadArchiveDetail = useCallback(async (entry) => {
        setArchiveLoading(true)
        try {
            const { data: stuData } = await supabase.from('students').select('id, name, phone, metadata').eq('class_id', entry.class_id).is('deleted_at', null).order('name')
            const ids = (stuData || []).map(s => s.id)
            const tableName = reportType === 'bulanan' ? 'student_monthly_reports' : 'student_semester_reports'
            let query = supabase.from(tableName).select('*').in('student_id', ids)
            if (reportType === 'bulanan') {
                query = query.eq('month', entry.month).eq('year', entry.year)
            } else {
                query = query.eq('report_type', reportType).eq('semester', entry.semester).eq('academic_year', entry.academic_year)
            }
            const { data: repData } = await query
            const rtObj = RAPORT_TYPES[reportType] || RAPORT_TYPES.bulanan
            const classObj = classesList.find(c => c.id === entry.class_id)
            const criteria = rtObj.getCriteria(classObj)

            const scMap = {}, exMap = {}
            for (const s of (stuData || [])) {
                const rep = repData?.find(r => r.student_id === s.id)
                if (reportType === 'bulanan') {
                    scMap[s.id] = { nilai_akhlak: rep?.nilai_akhlak ?? '', nilai_ibadah: rep?.nilai_ibadah ?? '', nilai_kebersihan: rep?.nilai_kebersihan ?? '', nilai_quran: rep?.nilai_quran ?? '', nilai_bahasa: rep?.nilai_bahasa ?? '' }
                    exMap[s.id] = { berat_badan: rep?.berat_badan ?? '', tinggi_badan: rep?.tinggi_badan ?? '', ziyadah: rep?.ziyadah ?? '', murojaah: rep?.murojaah ?? '', hari_sakit: rep?.hari_sakit ?? '', hari_izin: rep?.hari_izin ?? '', hari_alpa: rep?.hari_alpa ?? '', hari_pulang: rep?.hari_pulang ?? '', catatan: rep?.catatan ?? '' }
                } else {
                    const scObj = {}
                    criteria.forEach(k => {
                        scObj[k.key] = rep?.scores?.[k.key] ?? ''
                    })
                    scMap[s.id] = scObj
                    exMap[s.id] = {
                        berat_badan: rep?.extras?.berat_badan ?? '',
                        tinggi_badan: rep?.extras?.tinggi_badan ?? '',
                        hari_sakit: rep?.extras?.hari_sakit ?? '',
                        hari_izin: rep?.extras?.hari_izin ?? '',
                        hari_alpa: rep?.extras?.hari_alpa ?? '',
                        hari_pulang: rep?.extras?.hari_pulang ?? '',
                        catatan: rep?.catatan ?? rep?.extras?.catatan ?? ''
                    }
                }
            }
            const stuList = stuData || []
            setArchivePreview({
                students: stuList,
                scores: scMap,
                extras: exMap,
                bulanObj: reportType === 'bulanan' ? BULAN.find(b => b.id === entry.month) : null,
                tahun: reportType === 'bulanan' ? entry.year : null,
                musyrif: entry.musyrif,
                className: entry.class_name,
                lang: entry.lang,
                entry
            })
            setStudentTrend({})
            loadStudentTrend(stuList.map(s => s.id))
        } catch (e) { addToast('Gagal memuat detail arsip', 'error'); console.error('loadArchiveDetail error:', e) }
        finally { setArchiveLoading(false) }
    }, [loadStudentTrend, addToast, reportType, classesList])

    // ── Save archive inline edits back to Supabase
    const saveArchiveEdit = useCallback(async () => {
        if (!archivePreview) return
        setArchiveEditSaving(true)
        try {
            const { students: pStu, entry } = archivePreview
            const tableName = reportType === 'bulanan' ? 'student_monthly_reports' : 'student_semester_reports'
            const payloads = pStu.map(s => {
                const sc = archiveEditScores[s.id] || archivePreview.scores[s.id] || {}
                const ex = archiveEditExtras[s.id] || archivePreview.extras[s.id] || {}
                if (reportType === 'bulanan') {
                    return {
                        student_id: s.id,
                        month: entry.month,
                        year: entry.year,
                        musyrif_name: archivePreview.musyrif,
                        updated_by: profile?.id ?? null,
                        updated_by_name: profile?.name ?? null,
                        ...Object.fromEntries(Object.entries(sc).map(([k, v]) => [k, v === '' ? null : Number(v)])),
                        berat_badan: ex.berat_badan !== '' && ex.berat_badan != null ? Number(ex.berat_badan) : null,
                        tinggi_badan: ex.tinggi_badan !== '' && ex.tinggi_badan != null ? Number(ex.tinggi_badan) : null,
                        ziyadah: ex.ziyadah || null,
                        murojaah: ex.murojaah || null,
                        hari_sakit: ex.hari_sakit !== '' && ex.hari_sakit != null ? Number(ex.hari_sakit) : 0,
                        hari_izin: ex.hari_izin !== '' && ex.hari_izin != null ? Number(ex.hari_izin) : 0,
                        hari_alpa: ex.hari_alpa !== '' && ex.hari_alpa != null ? Number(ex.hari_alpa) : 0,
                        hari_pulang: ex.hari_pulang !== '' && ex.hari_pulang != null ? Number(ex.hari_pulang) : 0,
                        catatan: ex.catatan || null,
                    }
                } else {
                    return {
                        student_id: s.id,
                        report_type: reportType,
                        semester: entry.semester,
                        academic_year: entry.academic_year,
                        musyrif_name: archivePreview.musyrif,
                        updated_by: profile?.id ?? null,
                        updated_by_name: profile?.name ?? null,
                        scores: Object.fromEntries(Object.entries(sc).map(([k, v]) => [k, v === '' ? null : Number(v)])),
                        extras: {
                            berat_badan: ex.berat_badan !== '' && ex.berat_badan != null ? Number(ex.berat_badan) : null,
                            tinggi_badan: ex.tinggi_badan !== '' && ex.tinggi_badan != null ? Number(ex.tinggi_badan) : null,
                            hari_sakit: ex.hari_sakit !== '' && ex.hari_sakit != null ? Number(ex.hari_sakit) : 0,
                            hari_izin: ex.hari_izin !== '' && ex.hari_izin != null ? Number(ex.hari_izin) : 0,
                            hari_alpa: ex.hari_alpa !== '' && ex.hari_alpa != null ? Number(ex.hari_alpa) : 0,
                            hari_pulang: ex.hari_pulang !== '' && ex.hari_pulang != null ? Number(ex.hari_pulang) : 0,
                            catatan: ex.catatan || null,
                        }
                    }
                }
            })
            let query
            if (reportType === 'bulanan') {
                query = supabase.from(tableName).upsert(payloads, { onConflict: 'student_id,month,year' })
            } else {
                query = supabase.from(tableName).upsert(payloads, { onConflict: 'student_id,report_type,semester,academic_year' })
            }
            const { error } = await query
            if (error) throw error
            // Merge edits back into archivePreview so preview reflects saved data
            setArchivePreview(prev => {
                if (!prev) return prev
                const mergedScores = { ...prev.scores }
                const mergedExtras = { ...prev.extras }
                for (const sid of Object.keys(archiveEditScores)) mergedScores[sid] = { ...mergedScores[sid], ...archiveEditScores[sid] }
                for (const sid of Object.keys(archiveEditExtras)) mergedExtras[sid] = { ...mergedExtras[sid], ...archiveEditExtras[sid] }
                return { ...prev, scores: mergedScores, extras: mergedExtras }
            })
            setArchiveEditScores({})
            setArchiveEditExtras({})
            setArchiveEditMode(false)
            addToast(`${pStu.length} raport arsip berhasil diperbarui`, 'success')
            await logAudit({
                action: 'UPDATE', source: 'OPERATIONAL', tableName: tableName,
                newData: { bulk_archive_edit: true, count: pStu.length, class_name: archivePreview.className, ...(reportType === 'bulanan' ? { month: entry.month, year: entry.year } : { semester: entry.semester, academic_year: entry.academic_year }) }
            })
        } catch (e) { addToast('Gagal menyimpan: ' + e.message, 'error') }
        finally { setArchiveEditSaving(false) }
    }, [archivePreview, archiveEditScores, archiveEditExtras, addToast, reportType, profile])

    // ── Load full monthly history for student detail drawer
    const openStudentDetailDrawer = useCallback(async (student) => {
        setStudentDetailLoading(true)
        setStudentDetailDrawer({ student, history: null })
        try {
            const tableName = reportType === 'bulanan' ? 'student_monthly_reports' : 'student_semester_reports'
            let query = supabase.from(tableName)
            if (reportType === 'bulanan') {
                query = query.select('month, year, nilai_akhlak, nilai_ibadah, nilai_kebersihan, nilai_quran, nilai_bahasa, catatan, musyrif_name')
                    .eq('student_id', student.id)
                    .order('year', { ascending: true })
                    .order('month', { ascending: true })
            } else {
                query = query.select('semester, academic_year, scores, extras, musyrif_name')
                    .eq('report_type', reportType)
                    .eq('student_id', student.id)
                    .order('academic_year', { ascending: true })
                    .order('semester', { ascending: true })
            }
            const { data, error } = await query
            if (error) throw error
            const history = (data || []).map(r => {
                if (reportType === 'bulanan') {
                    return {
                        month: r.month, year: r.year,
                        musyrif: r.musyrif_name,
                        catatan: r.catatan,
                        scores: { nilai_akhlak: r.nilai_akhlak, nilai_ibadah: r.nilai_ibadah, nilai_kebersihan: r.nilai_kebersihan, nilai_quran: r.nilai_quran, nilai_bahasa: r.nilai_bahasa }
                    }
                } else {
                    return {
                        semester: r.semester, academic_year: r.academic_year,
                        musyrif: r.musyrif_name,
                        catatan: r.extras?.catatan ?? r.catatan ?? '',
                        scores: r.scores
                    }
                }
            })
            setStudentDetailDrawer({ student, history })
        } catch (e) {
            addToast('Gagal memuat histori santri: ' + e.message, 'error')
            setStudentDetailDrawer(null)
        } finally { setStudentDetailLoading(false) }
    }, [addToast, reportType])

    const executeDeleteArchive = useCallback(async (entry) => {
        setConfirmDelete(null)
        try {
            const { data: stuData } = await supabase.from('students').select('id').eq('class_id', entry.class_id)
            const ids = (stuData || []).map(s => s.id)
            if (!ids.length) { setArchiveList(prev => prev.filter(a => a.key !== entry.key)); addToast('Arsip berhasil dihapus', 'success'); return }
            const tableName = reportType === 'bulanan' ? 'student_monthly_reports' : 'student_semester_reports'
            let selectQuery = supabase.from(tableName).select('id').in('student_id', ids)
            if (reportType === 'bulanan') {
                selectQuery = selectQuery.eq('month', entry.month).eq('year', entry.year)
            } else {
                selectQuery = selectQuery.eq('report_type', reportType).eq('semester', entry.semester).eq('academic_year', entry.academic_year)
            }
            const { data: toDelete } = await selectQuery
            if (!toDelete?.length) { setArchiveList(prev => prev.filter(a => a.key !== entry.key)); addToast('Arsip berhasil dihapus', 'success'); return }
            const { error: delErr } = await supabase.from(tableName).delete().in('id', toDelete.map(r => r.id))
            if (delErr) throw delErr
            setArchiveList(prev => prev.filter(a => a.key !== entry.key))
            addToast('Arsip berhasil dihapus', 'success')
            await logAudit({
                action: 'DELETE', source: 'OPERATIONAL', tableName: tableName, recordId: null,
                oldData: { ...(reportType === 'bulanan' ? { archive_month: entry.month, archive_year: entry.year } : { semester: entry.semester, academic_year: entry.academic_year }), class_id: entry.class_id, count: toDelete.length }
            })
            loadArchive()
        } catch (e) { addToast('Gagal menghapus arsip: ' + e.message, 'error'); console.error('executeDeleteArchive error:', e) }
    }, [loadArchive, addToast])

    // ── Print
    const openPrintWindow = useCallback((stuList) => {
        if (!stuList?.length) { addToast('Tidak ada data untuk dicetak', 'warning'); return }
        setPrintRenderedCount(0); setPrintQueue(stuList.map(s => s.id))
    }, [addToast])

    const executePrint = useCallback((stuList) => {
        const container = printContainerRef.current; if (!container) return
        const cards = container.querySelectorAll('.raport-card'); if (!cards.length) { addToast('Gagal menyiapkan raport', 'error'); return }
        const html = [...cards].map(c => c.outerHTML).join('')
        const titleStr = stuList.length === 1 ? `Raport ${stuList[0].name}_${selectedClass?.name}_${bulanObj?.id_str} ${selectedYear}` : `Raport Kelas ${selectedClass?.name}_${bulanObj?.id_str} ${selectedYear}`
        const win = window.open('', '_blank'); if (!win) { addToast('Popup diblokir browser.', 'error'); setPrintQueue([]); setPrintRenderedCount(0); return }
        win.document.write(buildRaportPrintDocumentHtml(html, pageSize, titleStr))
        win.document.close();
        win.focus();
if (win.document.fonts && win.document.fonts.ready) {
                 win.document.fonts.ready.then(async () => {
                     // Paksa load font Arab secara eksplisit
await Promise.all([
                     win.document.fonts.load('400 16px Amiri'),
                     win.document.fonts.load('700 16px Amiri'),
                 ]);
                     setTimeout(() => {
                    win.print();
                    setPrintQueue([]);
                    setPrintRenderedCount(0);
                    logAudit({
                        action: 'PRINT', source: 'OPERATIONAL', tableName: activeDbTable,
                        newData: { format: 'PDF_PRINT', count: stuList.length, class_name: selectedClass?.name, month: selectedMonth, year: selectedYear }
                    });
                }, 500);
            }).catch((err) => {
                console.error("Font loading failed, printing anyway:", err);
                setTimeout(() => {
                    win.print();
                    setPrintQueue([]);
                    setPrintRenderedCount(0);
                }, 500);
            });
        } else {
            setTimeout(() => {
                win.print();
                setPrintQueue([]);
                setPrintRenderedCount(0);
            }, 800);
        }
    }, [selectedClass, bulanObj, selectedYear, addToast, profile, selectedMonth, pageSize])

    useEffect(() => {
        if (!printQueue.length || printRenderedCount < printQueue.length) return
        // Jika dipanggil dari generatePDFBlob untuk WA/PDF silent — skip print window
        if (silentPrintRef.current) return
        const stuList = (archivePreview ? archivePreview.students : students).filter(s => printQueue.includes(s.id))
        executePrint(stuList)
    }, [printRenderedCount, printQueue, students, archivePreview, executePrint])

    // ── Export PDF bulk
    const exportBulkPDF = useCallback(async (entry) => { setPendingExport(entry); await loadArchiveDetail(entry) }, [loadArchiveDetail])
    useEffect(() => {
        if (!pendingExport || !archivePreview || archivePreview.entry?.key !== pendingExport.key) return
        const entry = pendingExport; setPendingExport(null)
        const stuIds = archivePreview.students.map(s => s.id); setPrintRenderedCount(0); setPrintQueue(stuIds)
        const tryExport = (attempt = 0) => {
            const cards = printContainerRef.current?.querySelectorAll('.raport-card')
            if ((!cards || cards.length < stuIds.length) && attempt < 30) { setTimeout(() => tryExport(attempt + 1), 200); return }
            const html = [...(cards?.length ? cards : document.querySelectorAll('.raport-card'))].map(c => c.outerHTML).join('')
            const title = `Raport ${entry.class_name} ${BULAN.find(b => b.id === entry.month)?.id_str} ${entry.year}`
            const win = window.open('', '_blank'); if (!win) { addToast('Popup diblokir.', 'error'); return }
            win.document.write(buildRaportPrintDocumentHtml(html, pageSize, title))
            win.document.close();
            win.focus();
            if (win.document.fonts && win.document.fonts.ready) {
                win.document.fonts.ready.then(async () => {
                    // Paksa load font Arab secara eksplisit
await Promise.all([
                         win.document.fonts.load('400 16px Amiri'),
                         win.document.fonts.load('700 16px Amiri'),
                     ]);
                    setTimeout(() => {
                        win.print();
                        setPrintQueue([]);
                        setPrintRenderedCount(0);
                    }, 500);
                }).catch((err) => {
                    console.error("Font loading failed, printing anyway:", err);
                    setTimeout(() => {
                        win.print();
                        setPrintQueue([]);
                        setPrintRenderedCount(0);
                    }, 500);
                });
            } else {
                setTimeout(() => {
                    win.print();
                    setPrintQueue([]);
                    setPrintRenderedCount(0);
                }, 800);
            }
        }
        setTimeout(() => tryExport(), 300)
    }, [pendingExport, archivePreview, addToast, pageSize])

    // ─── Render helpers ───────────────────────────────────────────────────────

    useEffect(() => {
        if (step === 3 && window.innerWidth < 768) {
            const padding = 56 // extra breathing room: 12px container p-3 * 2 + 16px visual margin each side
            const containerWidth = window.innerWidth - padding
            const docWidth = pageSize === 'f4' ? 215 * 3.7795275591 : 210 * 3.7795275591
            const fitZoom = Math.floor((containerWidth / docWidth) * 100) / 100
            setPreviewZoom(Math.max(0.3, Math.min(0.8, fitZoom)))
        }
    }, [step, pageSize])

    // ── Handle Escape key for full screen
    useEffect(() => {
        const h = (e) => { if (e.key === 'Escape') setIsFullScreenPreview(false) }
        window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h)
    }, [])

    const renderStep0 = () => (
        <div className="space-y-6">
            {/* Banner Raport Belum Lengkap */}
            {newMonthBanner && (
                <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/8 flex items-start gap-3 overflow-hidden">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0 mt-0.5">
                        <AlertTriangle className="text-amber-500 w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-black text-[var(--color-text)] mb-0.5">Raport {newMonthBanner.prevMonthStr} {newMonthBanner.prevYear} belum lengkap!</p>
                        <p className="text-[10px] text-[var(--color-text-muted)] mb-3">
                            {newMonthBanner.classesNotArchived.length} kelas masih ada santri yang belum diisi.
                        </p>

                        {/* Mobile: Grid 2 Col | Tablet: 3-4 Col | Desktop: Flex Wrap */}
                        <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:flex md:flex-wrap items-center gap-2 mt-3">
                            {(showAllIncompleteBanner ? newMonthBanner.classesNotArchived : newMonthBanner.classesNotArchived.slice(0, 8)).map(cls => (
                                <button
                                    key={cls.class_id}
                                    onClick={() => {
                                        setSelectedClassId(cls.class_id);
                                        setSelectedMonth(newMonthBanner.prevMonth);
                                        setSelectedYear(newMonthBanner.prevYear);
                                        const clsObj = classesList.find(c => c.id === cls.class_id);
                                        if (clsObj) {
                                            const n = (clsObj.name || '').toLowerCase();
                                            setLang(n.includes('boarding') || n.includes('pondok') ? 'ar' : 'id')
                                        };
                                        setStep(1)
                                    }}
                                    className="h-9 px-3 rounded-xl bg-white/70 border border-amber-500/30 text-amber-900 text-[10px] font-black hover:bg-white hover:shadow-md hover:border-amber-500 transition-all flex items-center justify-between gap-2 shrink-0 shadow-sm"
                                >
                                    <span className="truncate min-w-0">{cls.class_name.split(' ')[0]}</span>
                                    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-md shrink-0 ${cls.filled === 0 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                        {cls.filled}/{cls.total}
                                    </span>
                                </button>
                            ))}
                            {!showAllIncompleteBanner && newMonthBanner.classesNotArchived.length > 8 && (
                                <button
                                    onClick={() => setShowAllIncompleteBanner(true)}
                                    className="h-9 px-3 rounded-xl bg-amber-500/10 border border-dashed border-amber-500/40 text-amber-600 text-[9px] font-black hover:bg-amber-500/20 transition-all flex items-center justify-center gap-1.5"
                                >
                                    +{newMonthBanner.classesNotArchived.length - 8} kelas lagi
                                </button>
                            )}
                            {showAllIncompleteBanner && (
                                <button
                                    onClick={() => setShowAllIncompleteBanner(false)}
                                    className="h-9 px-3 rounded-xl text-amber-600 text-[9px] font-black hover:underline transition-all"
                                >
                                    Sembunyikan
                                </button>
                            )}
                        </div>

                        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-amber-500/10">
                            <button onClick={() => setNewMonthBanner(null)} className="h-8 px-4 rounded-xl bg-white/50 border border-amber-500/20 text-amber-700 text-[9px] font-black hover:bg-white transition-all">
                                Nanti
                            </button>
                            <button onClick={() => { localStorage.setItem(newMonthBanner.dismissKey, '1'); setNewMonthBanner(null) }} className="h-8 px-4 rounded-xl bg-white/50 border border-amber-500/20 text-amber-700 text-[9px] font-black hover:bg-white transition-all">
                                Jangan ingatkan
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Banner Lanjutkan Sesi Terakhir */}
            {lastSession && classesList.find(c => c.id === lastSession.classId) && (
                <div className="flex items-center gap-3 p-3 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 shadow-sm">
                    <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center shrink-0">
                        <Zap className="text-indigo-500 w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-black text-[var(--color-text)] leading-tight">Lanjutkan yang tadi?</p>
                        <p className="text-[9px] text-[var(--color-text-muted)] font-medium truncate opacity-70">
                            {lastSession.className} · {BULAN.find(b => b.id === lastSession.month)?.id_str} {lastSession.year}
                        </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                        <button
                            onClick={async () => {
                                setSelectedClassId(lastSession.classId); setSelectedMonth(lastSession.month); setSelectedYear(lastSession.year); setLang(lastSession.useLang)
                                if (lastSession.reportType) setReportType(lastSession.reportType)
                                if (lastSession.selectedSemester) setSelectedSemester(Number(lastSession.selectedSemester))
                                if (lastSession.academicYear) setAcademicYear(lastSession.academicYear)
                                const ok = await loadStudents(lastSession.classId, lastSession.month, lastSession.year, lastSession.useLang, lastSession.reportType, lastSession.selectedSemester, lastSession.academicYear)
                                if (ok) setStep(2)
                            }}
                            className="h-8 px-4 rounded-xl bg-indigo-600 text-white text-[9px] font-black hover:bg-indigo-700 transition-all shadow-md shadow-indigo-500/20"
                        >
                            Buka →
                        </button>
                        <button
                            onClick={() => { localStorage.removeItem('raport_last_session'); setLastSession(null) }}
                            className="w-8 h-8 rounded-xl flex items-center justify-center text-[var(--color-text-muted)] hover:text-red-500 hover:bg-red-50 transition-all"
                        >
                            <X className="w-2.5 h-2.5" />
                        </button>
                    </div>
                </div>
            )}

            {/* ── SEARCH & FILTER CONTROLS ── */}
            <div className="flex flex-col gap-4 border-b border-[var(--color-border)]/50 pb-6">
                <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                            <School className="text-indigo-500 w-3.5 h-3.5" />
                        </div>
                        <label className="text-[10px] font-black uppercase tracking-[0.15em] text-[var(--color-text-muted)]">Pilih Kelas</label>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    {/* Search Row */}
                    <div className="relative flex-1 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] w-3 h-3 opacity-40 group-focus-within:text-indigo-500 group-focus-within:opacity-100 transition-all" />
                        <input
                            ref={searchInputRef}
                            type="text"
                            placeholder="Cari nama kelas..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full h-11 pl-11 pr-10 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] outline-none text-[13px] font-bold transition-all focus:border-indigo-500/50 focus:shadow-xl focus:shadow-indigo-500/5 text-[var(--color-text)]"
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center text-[var(--color-text-muted)] hover:text-red-500 transition-all">
                                <X className="w-2.5 h-2.5" />
                            </button>
                        )}
                    </div>

                    {/* Filter Row (Fixed grid on mobile to avoid 'offside') */}
                    <div className="grid grid-cols-3 sm:flex sm:items-center gap-1.5 p-1 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-2xl w-full sm:w-auto overflow-hidden shrink-0 shadow-inner">
                        {[
                            { id: 'all', label: 'Semua', icon: School },
                            { id: 'boarding', label: 'Boarding', icon: Moon },
                            { id: 'regular', label: 'Reguler', icon: Sun }
                        ].map(opt => (
                            <button
                                key={opt.id}
                                onClick={() => setFilterType(opt.id)}
                                className={`h-9 sm:px-5 rounded-xl text-[10px] font-black transition-all flex items-center justify-center gap-1.5 sm:gap-2 ${filterType === opt.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-white dark:hover:bg-slate-800'}`}
                            >
                                {(() => { const Icon = opt.icon; return <Icon className="w-2.5 h-2.5 shrink-0" /> })()}
                                <span className="whitespace-nowrap">{opt.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Grid Area */}
            <div className="relative">
                {filteredClasses.length === 0 && !pageLoading ? (
                    <EmptyState
                        variant="dashed"
                        color={searchQuery ? 'indigo' : 'slate'}
                        icon={searchQuery ? Search : School}
                        title={searchQuery ? `"${searchQuery}" tidak ditemukan` : 'Belum ada kelas'}
                        description={searchQuery ? 'Coba kata kunci lain atau hapus filter.' : 'Tambahkan kelas di menu Master Terlebih dahulu.'}
                        action={searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="h-10 px-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[10px] font-black text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:shadow-lg transition-all flex items-center gap-2 mx-auto">
                                <X className="w-3.5 h-3.5 mr-1" /> Reset Filter
                            </button>
                        )}
                    />
                ) : pageLoading ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                        {Array.from({ length: 8 }).map((_, i) => <ClassCardSkeleton key={i} />)}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                        {filteredClasses.map(cls => {
                            const isBoarding = (cls.name || '').toLowerCase().includes('boarding') || (cls.name || '').toLowerCase().includes('pondok')
                            const prog = classProgress[cls.id]
                            const teacher = cls.teachers?.name || 'Wali Kelas -'
                            const isDone = prog && prog.total > 0 && prog.done === prog.total
                            const isPartial = prog && prog.done > 0 && prog.done < prog.total
                            const pct = typeof prog?.pct === 'number'
                                ? prog.pct
                                : (prog?.total ? Math.round((prog.done / prog.total) * 100) : 0)
                            const lastLabel = prog?.lastMonth ? `${BULAN.find(b => b.id === prog.lastMonth)?.id_str} ${prog.lastYear}` : null

                            return (
                                <div
                                    key={cls.id}
                                    onClick={() => {
                                        setSelectedClassId(cls.id)
                                        setLang('id')
                                        if (cls.metadata?.homeroom_teacher) setMusyrif(cls.metadata.homeroom_teacher)
                                        setStep(1)
                                    }}
                                    className="group relative rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-indigo-500/50 hover:shadow-md cursor-pointer transition-all duration-200 flex items-center p-2.5 gap-3 h-[72px]"
                                >
                                    {/* Small Initial */}
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 font-black text-[10px] transition-all ${isDone ? 'bg-emerald-500 text-white' : isBoarding ? 'bg-indigo-500/10 text-indigo-600' : 'bg-emerald-500/10 text-emerald-600'}`}>
                                        {cls.name?.charAt(0)}
                                    </div>

                                    {/* Main Info Area */}
                                    <div className="min-w-0 flex-1 flex flex-col justify-center gap-0.5">
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-[11px] font-black text-[var(--color-text)] truncate group-hover:text-indigo-600 transition-colors uppercase tracking-tight leading-none">{cls.name}</h3>
                                            <span className={`text-[6px] font-black px-1 py-0.5 rounded-md border shrink-0 ${isBoarding ? 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20' : 'bg-sky-500/10 text-sky-500 border-sky-500/20'}`}>
                                                {isBoarding ? 'B' : 'R'}
                                            </span>
                                        </div>
                                        <p className="text-[9px] font-bold text-[var(--color-text-muted)] truncate opacity-60 leading-none">{teacher}</p>

                                        {/* Slim Progress */}
                                        <div className="flex items-center gap-2 mt-1">
                                            <div className="h-1 flex-1 rounded-full bg-[var(--color-border)]/40 overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-1000 ${isDone ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                            <span className="text-[8px] font-black text-indigo-500 w-6 text-right">{pct}%</span>
                                        </div>
                                    </div>

                                    {/* Right Side Actions */}
                                    <div className="flex items-center gap-1 shrink-0 ml-1 h-full pl-2 border-l border-[var(--color-border)]/50">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                setSelectedClassId(cls.id)
                                                setLang('id')
                                                if (cls.metadata?.homeroom_teacher) setMusyrif(cls.metadata.homeroom_teacher)
                                                setStep(1)
                                            }}
                                            title="Setup & Mulai Input"
                                            className="w-8 h-8 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-lg transition-all flex items-center justify-center shrink-0"
                                        >
                                            <ChevronRight className="w-3 h-3" />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setSelectedClassId(cls.id); setStep(4); loadArchive() }}
                                            disabled={!lastLabel}
                                            title="Lihat Arsip"
                                            className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 transition-all ${lastLabel ? 'border-[var(--color-border)] bg-[var(--color-surface-alt)] hover:border-indigo-500/30 hover:text-indigo-600 text-[var(--color-text-muted)]' : 'opacity-20 cursor-not-allowed border-dashed'}`}
                                        >
                                            <Archive className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )

    const renderStep1 = () => {
        if (!selectedClassId) {
            setTimeout(() => setStep(0), 0)
            return (
                <div className="py-20 flex flex-col items-center justify-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)]" />
                    <p className="text-xs font-black text-[var(--color-text-muted)] animate-pulse">Mengalihkan ke Dashboard...</p>
                </div>
            )
        }

        return (
            <div className="space-y-6 animate-fade-in">
                <div className="p-5 rounded-3xl bg-gradient-to-br from-emerald-500/10 to-indigo-500/10 border border-emerald-500/20">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                            <ClipboardList className="text-emerald-500 w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-[var(--color-text)]">Setup {isAcademicRaport ? 'Rapor & Penilaian' : 'Raport Pondok'}</h3>
                            <p className="text-[11px] text-[var(--color-text-muted)] font-medium">Langkah 1: Tentukan periode dan bahasa pengantar untuk raport kelas ini.</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] flex items-center gap-2">
                                <School className="w-3.5 h-3.5 opacity-60 mr-1" /> Kelas Terpilih
                            </label>
                            <div className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <div className="w-10 h-10 rounded-[1.2rem] bg-emerald-500 flex items-center justify-center text-white text-xs font-black shadow-lg shadow-emerald-500/20 shrink-0">
                                        {selectedClass?.name?.charAt(0) || 'K'}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[14px] font-black text-[var(--color-text)] truncate leading-tight">
                                            {selectedClass?.name || 'Memuat nama kelas...'}
                                        </p>
                                        <p className="text-[10px] text-emerald-600/70 font-bold uppercase tracking-wider">
                                            {(classProgress[selectedClass?.id]?.total || 0)} Siswa Terdaftar
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => { setSelectedClassId(''); setMusyrif(''); setStep(0) }}
                                    className="h-9 px-4 rounded-xl border border-emerald-500/30 bg-white text-emerald-600 text-[11px] font-black hover:bg-emerald-500/10 transition-all shrink-0 shadow-sm active:scale-95 dark:bg-slate-800 dark:hover:bg-slate-700"
                                >
                                    Ganti
                                </button>
                            </div>
                        </div>

                        {reportType === 'bulanan' ? (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Bulan</label>
                                    <RichSelect
                                        value={selectedMonth}
                                        onChange={val => setSelectedMonth(Number(val))}
                                        options={monthOptions}
                                        placeholder="Pilih Bulan"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Tahun</label>
                                    <RichSelect
                                        value={selectedYear}
                                        onChange={val => setSelectedYear(Number(val))}
                                        options={yearOptions}
                                        placeholder="Pilih Tahun"
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Semester</label>
                                    <RichSelect
                                        value={selectedSemester}
                                        onChange={val => setSelectedSemester(Number(val))}
                                        options={[
                                            { id: 1, name: 'Semester 1 (Ganjil)' },
                                            { id: 2, name: 'Semester 2 (Genap)' }
                                        ]}
                                        placeholder="Pilih Semester"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Tahun Ajaran</label>
                                    <RichSelect
                                        value={academicYear}
                                        onChange={val => setAcademicYear(val)}
                                        options={Array.from({ length: 3 }).map((_, i) => {
                                            const startYear = now.getFullYear() - 1 + i
                                            const val = `${startYear}/${startYear + 1}`
                                            return { id: val, name: val }
                                        })}
                                        placeholder="Pilih Tahun Ajaran"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Musyrif / Wali Kelas</label>
                                {homeroomTeacherName && musyrif !== homeroomTeacherName && (
                                    <button type="button" onClick={() => setMusyrif(homeroomTeacherName)} className="text-[9px] font-black text-indigo-500 hover:underline">Reset ke Wali Kelas</button>
                                )}
                            </div>
                            <input value={musyrif} onChange={e => setMusyrif(e.target.value)} placeholder={homeroomTeacherName || "Nama lengkap musyrif..."} className="w-full h-11 px-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-sm font-bold text-[var(--color-text)] outline-none focus:border-indigo-500/50 transition-all" />
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Template Bahasa</label>
                                <button
                                    type="button"
                                    onClick={() => setShowTemplatePreviewModal(true)}
                                    className="text-[9px] font-black text-indigo-500 hover:underline flex items-center gap-1"
                                >
                                    <Eye className="w-3.5 h-3.5 mr-1.5" /> Lihat Perbedaan Template
                                </button>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { v: 'ar', label: 'العربية', sub: 'Pondok / Boarding', icon: MoonStar, color: 'text-emerald-500' },
                                    { v: 'id', label: 'Indonesia', sub: 'Sekolah / Reguler', icon: School, color: 'text-indigo-500' }
                                ].map(opt => (
                                    <button key={opt.v} onClick={() => setLang(opt.v)} className={`p-4 rounded-2xl border text-left transition-all ${lang === opt.v ? 'bg-indigo-500/10 border-indigo-500/50 shadow-sm' : 'bg-[var(--color-surface-alt)] border-[var(--color-border)] hover:border-indigo-500/20'}`}>
                                        <div className="flex items-center justify-between mb-1">
                                            <span className={`text-base font-black ${lang === opt.v ? 'text-indigo-600' : 'text-[var(--color-text)]'}`}>{opt.label}</span>
                                            {(() => { const Icon = opt.icon; return <Icon className={`w-4 h-4 transition-colors ${lang === opt.v ? opt.color : 'text-[var(--color-text-muted)] opacity-60'}`} /> })()}
                                        </div>
                                        <p className="text-[10px] text-[var(--color-text-muted)] font-medium leading-tight">{opt.sub}</p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex gap-2 sm:gap-4 pt-4 border-t border-[var(--color-border)]">
                    <button onClick={() => { setSelectedClassId(''); setMusyrif(''); setStep(0) }} className="h-12 px-4 rounded-2xl border border-[var(--color-border)] text-xs sm:text-sm font-black text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-all flex items-center gap-2 shrink-0">
                        <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> <span className="hidden sm:inline">Kembali</span>
                    </button>
                    <button onClick={async () => { if (!selectedClassId) return; const ok = await loadStudents(); if (ok) setStep(2) }} disabled={!selectedClassId || loading} className="flex-1 h-12 rounded-2xl bg-emerald-500 text-white text-xs sm:text-sm font-black shadow-lg shadow-emerald-500/20 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 overflow-hidden px-2">
                        {loading ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                            <ChevronRight className="w-3 h-3 opacity-70" />
                        )}
                        <span className="whitespace-nowrap">
                            {loading ? 'Memuat Santri...' : 'Mulai Input Nilai'}
                        </span>
                    </button>
                </div>
            </div>
        )
    }

    const renderStep2 = () => {
        return (
            <Suspense fallback={
                <div className="py-20 flex flex-col items-center justify-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)]" />
                    <p className="text-xs font-black text-[var(--color-text-muted)] uppercase tracking-widest animate-pulse">Memuat Lembar Input Nilai...</p>
                </div>
            }>
                <LazyRaportInputTable
                    globalSaveIndicator={globalSaveIndicator}
                    loading={loading}
                    criteria={(() => { const rt = RAPORT_TYPES[reportType] || RAPORT_TYPES.bulanan; return rt.getCriteria(selectedClass) })()}
                    maxScore={(RAPORT_TYPES[reportType] || RAPORT_TYPES.bulanan).maxScore}
                    students={students}
                    filteredStudents={filteredStudents}
                    scores={scores}
                    setScores={setScores}
                    extras={extras}
                    setExtras={setExtras}
                    savedIds={savedIds}
                    setSavedIds={setSavedIds}
                    saving={saving}
                    savingAll={savingAll}
                    setSavingAll={setSavingAll}
                    studentSearch={studentSearch}
                    setStudentSearch={setStudentSearch}
                    showIncompleteOnly={showIncompleteOnly}
                    setShowIncompleteOnly={setShowIncompleteOnly}
                    showNoPhoneOnly={showNoPhoneOnly}
                    setShowNoPhoneOnly={setShowNoPhoneOnly}
                    reportType={reportType}
                    setReportType={setReportType}
                    isAcademicRaport={isAcademicRaport}
                    selectedSemester={selectedSemester}
                    academicYear={academicYear}
                    selectedMonth={selectedMonth}
                    selectedYear={selectedYear}
                    musyrif={musyrif}
                    selectedClass={selectedClass}
                    progressPct={progressPct}
                    hasUnsavedMemo={hasUnsavedMemo}
                    noPhoneCount={noPhoneCount}
                    bulkMode={bulkMode}
                    setBulkMode={setBulkMode}
                    bulkValues={bulkValues}
                    setBulkValues={setBulkValues}
                    bulkSelected={bulkSelected}
                    setBulkSelected={setBulkSelected}
                    visibleRange={visibleRange}
                    setVisibleRange={setVisibleRange}
                    tableScrollRef={tableScrollRef}
                    mobileActiveIdx={mobileActiveIdx}
                    setMobileActiveIdx={setMobileActiveIdx}
                    templateOpenId={templateOpenId}
                    catatanArabMap={catatanArabMap}
                    prevMonthScores={prevMonthScores}
                    studentTrend={studentTrend}
                    sendingWA={sendingWA}
                    canEdit={canEdit}
                    lang={lang}
                    copyingLastMonth={copyingLastMonth}
                    copyFromLastMonth={copyFromLastMonth}
                    handleResetClass={handleResetClass}
                    setStep={setStep}
                    setSelectedClassId={setSelectedClassId}
                    setPendingNav={setPendingNav}
                    saveAll={saveAll}
                    saveStudent={saveStudent}
                    resetStudent={resetStudent}
                    generateAndSendWA={generateAndSendWA}
                    handlePDF={handlePDF}
                    handleResetStudent={handleResetStudent}
                    handleBulkToggle={handleBulkToggle}
                    handleKeyDown={handleKeyDown}
                    handleTemplateToggle={handleTemplateToggle}
                    handleTemplateApply={handleTemplateApply}
                    handleTranslitToggle={handleTranslitToggle}
                    handleScoreChange={handleScoreChange}
                    handleExtraChange={handleExtraChange}
                    handleCatatanChange={handleCatatanChange}
                    triggerAutoSave={triggerAutoSave}
                    openStudentDetailDrawer={openStudentDetailDrawer}
                    setIsExportModalOpen={setIsExportModalOpen}
                    setWaBlastConfirm={setWaBlastConfirm}
                    addToast={addToast}
                    setConfirmModal={setConfirmModal}
                    runZipBlast={runZipBlast}
                    openPrintWindow={openPrintWindow}
                    cellRefs={cellRefs}
                />
            </Suspense>
        )
    }

    const renderStep3 = () => {
        const previewStudent = previewStudentId ? students.find(s => s.id === previewStudentId) : students[0]
        const completeCount = students.filter(s => isComplete(scores[s.id] || {}, activeCriteria)).length
        const totalCount = students.length
        const pct = totalCount ? Math.round((completeCount / totalCount) * 100) : 0

        return (
            <div className="space-y-6">
                {/* Header Stats */}
                <StatsCarousel count={4} cols={4}>
                    <StatCard key="total" label="Total Santri" value={totalCount} icon={Users} color="sky" />
                    <StatCard key="progress" label="Progress Lengkap" value={completeCount} icon={CheckCircle2} color="emerald" />
                    <StatCard key="pct" label="Persentase" value={pct} suffix="%" icon={PieChart} color="indigo" />
                    <StatCard key="periode" label="Periode" value={`${BULAN.find(b => b.id === selectedMonth)?.id_str} ${selectedYear}`} icon={Calendar} color="amber" />
                </StatsCarousel>

                <div className="flex flex-col lg:flex-row gap-6">
                    {/* Left: Sidebar Navigation - Desktop: Sidebar, Mobile: Smart Navigator */}
                    <div className="w-full lg:w-64 xl:w-72 space-y-4 self-start lg:sticky lg:top-6">
                        <div className="p-4 lg:p-5 rounded-3xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] shadow-sm">
                            <div className="flex items-center justify-between mb-3 lg:mb-4 px-1">
                                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">{window.innerWidth < 1024 ? 'Navigasi Santri' : 'Pilih Santri'}</p>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 font-black">{totalCount}</span>
                            </div>

                            {/* MOBILE: Smart Selector with Arrows & Custom FontAwesome Picker */}
                            <div className="lg:hidden flex items-center gap-2">
                                <button
                                    onClick={() => {
                                        const idx = students.findIndex(s => s.id === (previewStudentId || students[0].id))
                                        if (idx > 0) setPreviewStudentId(students[idx - 1].id)
                                    }}
                                    className="w-10 h-10 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-indigo-500 flex items-center justify-center active:scale-95 transition-all"
                                >
                                    <ChevronLeft className="w-3.5 h-3.5" />
                                </button>

                                <button
                                    onClick={() => setShowMobileStudentPicker(true)}
                                    className="flex-1 h-10 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-between gap-2 overflow-hidden"
                                >
                                    <div className="flex items-center gap-2 truncate min-w-0">
                                        {isComplete(scores[previewStudentId || students[0]?.id] || {}, activeCriteria) ? (
                                            <CheckCircle2 className="w-3 h-3 shrink-0 text-emerald-500" />
                                        ) : (
                                            <AlertCircle className="w-3 h-3 shrink-0 text-amber-500" />
                                        )}
                                        <span className="text-[11px] font-bold text-[var(--color-text)] truncate">
                                            {students.find(s => s.id === (previewStudentId || students[0]?.id))?.name || 'Pilih Santri'}
                                        </span>
                                    </div>
                                    <ChevronDown className="w-3 h-3 text-[var(--color-text-muted)] shrink-0" />
                                </button>

                                <button
                                    onClick={() => {
                                        const idx = students.findIndex(s => s.id === (previewStudentId || students[0].id))
                                        if (idx < students.length - 1) setPreviewStudentId(students[idx + 1].id)
                                    }}
                                    className="w-10 h-10 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-indigo-500 flex items-center justify-center active:scale-95 transition-all"
                                >
                                    <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                            </div>

                            {/* MOBILE STUDENT PICKER MODAL */}
                            <Modal
                                isOpen={showMobileStudentPicker}
                                onClose={() => setShowMobileStudentPicker(false)}
                                title="Pilih Santri"
                                size="md"
                            >
                                <div className="space-y-2 max-h-[60vh] overflow-y-auto custom-scrollbar pr-1">
                                    {students.map(s => {
                                        const complete = isComplete(scores[s.id] || {}, activeCriteria)
                                        const active = (previewStudentId || students[0]?.id) === s.id
                                        return (
                                            <button
                                                key={s.id}
                                                onClick={() => {
                                                    setPreviewStudentId(s.id)
                                                    setShowMobileStudentPicker(false)
                                                }}
                                                className={`w-full p-3 rounded-xl border flex items-center justify-between gap-3 transition-all ${active ? 'bg-indigo-500 border-indigo-500 text-white' : 'bg-[var(--color-surface-alt)] border-[var(--color-border)] text-[var(--color-text)]'}`}
                                            >
                                                <div className="flex items-center gap-3 truncate">
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${active ? 'bg-white/20' : 'bg-[var(--color-surface)]'}`}>
                                                        <span className={`text-[10px] font-black ${active ? 'text-white' : 'text-indigo-500'}`}>{s.name.charAt(0)}</span>
                                                    </div>
                                                    <span className="text-xs font-bold truncate">{s.name}</span>
                                                </div>
                                            </button>
                                        )
                                    })}
                                </div>
                            </Modal>

                            {/* DESKTOP: Vertical Sidebar List */}
                            <div className="hidden lg:flex flex-col gap-1.5 h-[calc(100vh-320px)] min-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                {students.map(s => {
                                    const complete = isComplete(scores[s.id] || {}, activeCriteria)
                                    const active = previewStudentId === s.id
                                    return (
                                        <button
                                            key={s.id}
                                            onClick={() => setPreviewStudentId(s.id)}
                                            className={`w-full p-2.5 rounded-xl border text-left transition-all ${active ? 'bg-indigo-500 border-indigo-500 text-white shadow-lg shadow-indigo-500/15' : 'bg-[var(--color-surface)] border-[var(--color-border)] hover:border-indigo-500/30'}`}
                                        >
                                            <div className="flex items-center gap-2.5">
                                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${active ? 'bg-white/20' : 'bg-[var(--color-surface-alt)]'}`}>
                                                    <span className={`text-[9px] font-black ${active ? 'text-white' : 'text-indigo-500'}`}>{s.name.charAt(0)}</span>
                                                </div>
                                                <span className="text-[11px] font-bold truncate flex-1">{s.name}</span>
                                                {complete && <CheckCircle2 className={`w-3 h-3 ${active ? 'text-white' : 'text-emerald-500'}`} />}
                                            </div>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <button onClick={() => openPrintWindow(students)} className="w-full h-11 rounded-2xl bg-indigo-500 text-white text-xs font-black shadow-lg shadow-indigo-500/20 hover:bg-indigo-600 transition-all flex items-center justify-center gap-2">
                                <Printer className="w-3.5 h-3.5 mr-1.5" /> Cetak Semua ({totalCount})
                            </button>
                            <button onClick={() => setStep(2)} className="w-full h-11 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] text-xs font-black hover:text-[var(--color-text)] transition-all flex items-center justify-center gap-2">
                                <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Kembali ke Input
                            </button>
                        </div>

                        <RaportLayoutSettings
                            config={layoutConfig}
                            onChange={setLayoutConfig}
                        />
                    </div>

                    {/* Right: Preview Area - Unified in one card */}
                    <div className="flex-1 flex flex-col rounded-[32px] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
                        <div className="px-4 py-4 rounded-t-[32px] border-b border-[var(--color-border)] bg-[var(--color-surface-alt)]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            {/* Row 1: Title & Mobile Toggle */}
                            <div className="flex items-center justify-between w-full sm:w-auto">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                                        <Search className="w-3 h-3 text-indigo-500" />
                                    </div>
                                    <h4 className="text-[11px] font-black text-[var(--color-text)] uppercase tracking-wider">Preview Raport</h4>
                                </div>
                                <button
                                    onClick={() => setIsFullScreenPreview(true)}
                                    className="h-10 w-10 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] flex sm:hidden items-center justify-center hover:text-indigo-500 transition-all"
                                >
                                    <Maximize2 className="w-3 h-3" />
                                </button>
                            </div>

                            {/* Row 2 & 3: Controls */}
                            <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center justify-start sm:justify-end gap-1.5 w-full sm:flex-1">
                                {/* Page Size selector */}
                                <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm h-10 w-full sm:w-auto shrink-0 justify-center">
                                    <button onClick={() => setPageSize('a4')} className={`flex-1 sm:flex-none px-3 h-8 rounded-lg text-[10px] font-black transition-all ${pageSize === 'a4' ? 'bg-amber-500 text-white shadow-sm' : 'text-[var(--color-text-muted)]'}`}>A4</button>
                                    <button onClick={() => setPageSize('f4')} className={`flex-1 sm:flex-none px-3 h-8 rounded-lg text-[10px] font-black transition-all ${pageSize === 'f4' ? 'bg-amber-500 text-white shadow-sm' : 'text-[var(--color-text-muted)]'}`}>F4</button>
                                </div>

                                {/* Language selector */}
                                <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm h-10 w-full sm:w-auto shrink-0 justify-center">
                                    <button onClick={() => setLang('ar')} className={`flex-1 sm:flex-none px-3 h-8 rounded-lg text-[10px] font-black transition-all ${lang === 'ar' ? 'bg-indigo-500 text-white shadow-sm' : 'text-[var(--color-text-muted)]'}`}>AR</button>
                                    <button onClick={() => setLang('id')} className={`flex-1 sm:flex-none px-3 h-8 rounded-lg text-[10px] font-black transition-all ${lang === 'id' ? 'bg-indigo-500 text-white shadow-sm' : 'text-[var(--color-text-muted)]'}`}>ID</button>
                                </div>

                                {/* Group: Signature Dropdown Selector */}
                                <div className="relative flex items-center w-full sm:w-auto shrink-0" data-sig-dropdown-anchor>
                                    <button
                                        onClick={() => setShowSigDropdown(p => !p)}
                                        className="w-full sm:w-auto h-10 px-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm text-[10px] font-black text-[var(--color-text)] flex items-center justify-between sm:justify-start gap-1.5 hover:bg-[var(--color-surface-alt)] active:scale-95 transition-all select-none whitespace-nowrap"
                                    >
                                        <span className="flex items-center gap-1.5">
                                            {signMode === 'digital' ? (
                                                <Fingerprint className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                            ) : (
                                                <PenTool className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                            )}
                                            {signMode === 'digital' ? 'TTD Digital' : 'TTD Basah'}
                                        </span>
                                        <ChevronDown className={`w-3.5 h-3.5 text-[var(--color-text-muted)] transition-transform duration-200 ${showSigDropdown ? 'rotate-180' : ''}`} />
                                    </button>

                                    {showSigDropdown && (
                                        <div className="absolute right-0 top-full mt-1.5 w-full sm:w-36 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl z-50 overflow-hidden py-1 animate-in fade-in slide-in-from-top-1 duration-100">
                                            <button
                                                onClick={() => {
                                                    if (signMode !== 'basah') handleToggleSignMode();
                                                    setShowSigDropdown(false);
                                                }}
                                                className={`w-full px-3.5 py-2.5 text-left text-[10px] font-black transition-colors flex items-center gap-2 ${signMode === 'basah' ? 'bg-[var(--color-surface-alt)] text-indigo-500' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]/50'}`}
                                            >
                                                <PenTool className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                                <span>TTD Basah</span>
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (signMode !== 'digital') handleToggleSignMode();
                                                    setShowSigDropdown(false);
                                                }}
                                                className={`w-full px-3.5 py-2.5 text-left text-[10px] font-black transition-colors flex items-center gap-2 ${signMode === 'digital' ? 'bg-[var(--color-surface-alt)] text-emerald-500' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]/50'}`}
                                            >
                                                <Fingerprint className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                                <span>TTD Digital</span>
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Zoom Control */}
                                <div className="flex items-center justify-between sm:justify-center gap-1 p-1 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm h-10 w-full sm:w-auto shrink-0">
                                    <button onClick={() => { manualZoomRef.current = true; setPreviewZoom(p => Math.max(0.3, p - 0.1)) }} className="flex-1 sm:flex-none h-8 text-[11px] text-[var(--color-text-muted)] hover:text-indigo-500 flex items-center justify-center"><Search className="w-3 h-3 mr-0.5" />-</button>
                                    <button
                                        onClick={() => {
                                            manualZoomRef.current = false
                                            const el = previewContainerRef.current
                                            if (!el) return
                                            const padding = window.innerWidth < 640 ? 24 : 80
                                            const availW = el.clientWidth - padding
                                            const docW = pageSize === 'f4' ? 215 * 3.7795275591 : 210 * 3.7795275591
                                            setPreviewZoom(Math.min(1, Math.max(0.3, Math.floor((availW / docW) * 100) / 100)))
                                        }}
                                        title="Fit ke lebar layar"
                                        className="flex-1 sm:flex-none text-[9px] font-black w-10 text-center text-indigo-500 tabular-nums hover:text-indigo-700 transition-colors cursor-pointer select-none"
                                    >{Math.round(previewZoom * 100)}%</button>
                                    <button onClick={() => { manualZoomRef.current = true; setPreviewZoom(p => Math.min(1.5, p + 0.1)) }} className="flex-1 sm:flex-none h-8 text-[11px] text-[var(--color-text-muted)] hover:text-indigo-500 flex items-center justify-center"><Search className="w-3 h-3 mr-0.5" />+</button>
                                </div>

                                {/* Action Dropdown Selector */}
                                <div className="relative flex items-center w-full sm:w-auto col-span-2 sm:col-span-1 shrink-0" data-action-dropdown-anchor>
                                    <button
                                        onClick={() => setShowActionDropdown(p => !p)}
                                        className="w-full sm:w-auto h-10 px-3.5 rounded-xl bg-indigo-500 text-white text-[10px] font-black flex items-center justify-center gap-1.5 hover:bg-indigo-600 active:scale-95 transition-all select-none shadow-lg shadow-indigo-500/20"
                                    >
                                        <Sliders className="w-3.5 h-3.5" />
                                        <span>Aksi Raport</span>
                                        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showActionDropdown ? 'rotate-180' : ''}`} />
                                    </button>

                                    {showActionDropdown && (
                                        <div className="absolute right-0 top-full mt-1.5 w-full sm:w-44 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl z-50 overflow-hidden py-1 animate-in fade-in slide-in-from-top-1 duration-100">
                                            <button
                                                onClick={() => {
                                                    setShowActionDropdown(false);
                                                    openPrintWindow([previewStudent].filter(Boolean));
                                                }}
                                                className="w-full px-3.5 py-2.5 text-left text-[10px] font-bold text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] transition-all flex items-center gap-2"
                                            >
                                                <Printer className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                                <span>Cetak Raport</span>
                                            </button>

                                            {previewStudent && (
                                                <button
                                                    disabled={generatingPdfIds.has(previewStudent.id)}
                                                    onClick={() => {
                                                        setShowActionDropdown(false);
                                                        handleDownloadPdf(previewStudent);
                                                    }}
                                                    className="w-full px-3.5 py-2.5 text-left text-[10px] font-bold text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] transition-all flex items-center gap-2 disabled:opacity-50"
                                                >
                                                    {generatingPdfIds.has(previewStudent.id) ? (
                                                        <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500 shrink-0" />
                                                    ) : (
                                                        <Download className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                                    )}
                                                    <span>Download PDF</span>
                                                </button>
                                            )}

                                            {previewStudent?.phone && (
                                                <button
                                                    onClick={() => {
                                                        setShowActionDropdown(false);
                                                        sendWATextOnly(previewStudent);
                                                    }}
                                                    className="w-full px-3.5 py-2.5 text-left text-[10px] font-bold text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] transition-all flex items-center gap-2"
                                                >
                                                    <WhatsAppIcon className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                                    <span>WhatsApp</span>
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <button
                                    onClick={() => setIsFullScreenPreview(true)}
                                    className="h-10 w-10 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hidden sm:flex items-center justify-center hover:text-indigo-500 transition-all shrink-0"
                                    title="Fullscreen Preview"
                                >
                                    <Maximize2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>

                        <div
                            ref={previewContainerRef}
                            className="flex-1 overflow-y-auto overflow-x-hidden bg-slate-200 dark:bg-slate-700 flex flex-col items-center custom-scrollbar p-3 sm:p-10 rounded-b-[31px]"
                            style={{ minHeight: window.innerWidth < 768 ? 300 : 600 }}
                            /* #5: Pinch-to-zoom gesture */
                            onTouchStart={e => {
                                if (e.touches.length === 2) {
                                    e.currentTarget._pinchStartDist = Math.hypot(
                                        e.touches[0].clientX - e.touches[1].clientX,
                                        e.touches[0].clientY - e.touches[1].clientY
                                    )
                                    e.currentTarget._pinchStartZoom = previewZoom
                                }
                            }}
                            onTouchMove={e => {
                                if (e.touches.length === 2 && e.currentTarget._pinchStartDist) {
                                    e.preventDefault()
                                    const dist = Math.hypot(
                                        e.touches[0].clientX - e.touches[1].clientX,
                                        e.touches[0].clientY - e.touches[1].clientY
                                    )
                                    const ratio = dist / e.currentTarget._pinchStartDist
                                    const newZoom = Math.min(1.5, Math.max(0.3, e.currentTarget._pinchStartZoom * ratio))
                                    manualZoomRef.current = true
                                    setPreviewZoom(Math.floor(newZoom * 100) / 100)
                                }
                            }}
                            onTouchEnd={e => { e.currentTarget._pinchStartDist = null }}
                        >
                            {/* #2: Animated eye-catching hint badge — hanya di mobile */}
                            <div className="lg:hidden flex items-center gap-1.5 mb-3 px-3 py-1.5 rounded-full bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-indigo-500/20 shadow-sm animate-pulse">
                                <Maximize2 className="w-3 h-3 text-indigo-500" />
                                <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">Klik raport untuk memperbesar</span>
                            </div>
                            {/* Layout Wrapper — menggunakan transform:scale agar layout width selalu akurat di Android */}
                            {(() => {
                                // Natural px size of the paper (96dpi)
                                const naturalW = pageSize === 'f4' ? 812.6 : 793.7
                                // A4: 297mm, F4: ~330mm
                                const naturalH = pageSize === 'f4' ? 1247 : 1122
                                return (
                                    <div
                                        className="mx-auto overflow-hidden"
                                        style={{
                                            width: `${naturalW * previewZoom}px`,
                                            height: `${naturalH * previewZoom}px`,
                                        }}
                                    >
                                        {/* #4: Pulse ring animation untuk hint tap-to-fullscreen */}
                                        <div
                                            className="relative shadow-2xl rounded-none overflow-hidden cursor-pointer transition-all group"
                                            style={{
                                                width: pageSize === 'f4' ? '215mm' : '210mm',
                                                transform: `scale(${previewZoom})`,
                                                transformOrigin: 'top left',
                                            }}
                                            onClick={() => setIsFullScreenPreview(true)}
                                        >
                                            {/* Pulse ring hanya di mobile — muncul di atas kertas */}
                                            <div className="lg:hidden absolute inset-0 rounded-none ring-2 ring-indigo-400/40 animate-pulse pointer-events-none z-10" />
                                            <div className="lg:hidden absolute inset-0 rounded-none ring-4 ring-indigo-400/10 animate-pulse pointer-events-none z-10" style={{ animationDelay: '0.3s' }} />
                                            {previewStudent && (
                                                <RaportPrintCard
                                                    student={previewStudent}
                                                    scores={scores[previewStudent.id]}
                                                    extra={extras[previewStudent.id]}
                                                    bulanObj={bulanObj}
                                                    tahun={selectedYear}
                                                    musyrif={musyrif}
                                                    className={selectedClass?.name}
                                                    lang={lang}
                                                    settings={settings}
                                                    pageSize={pageSize}
                                                    catatanArab={catatanArabMap[previewStudent.id]}
                                                    reportType={reportType}
                                                    selectedSemester={selectedSemester}
                                                    academicYear={academicYear}
                                                    selectedClass={selectedClass}
                                                    layoutConfig={layoutConfig}
                                                    signMode={signMode}
                                                    signatures={signatures}
                                                />
                                            )}
                                        </div>
                                    </div>
                                )
                            })()}
                            <div className="hidden sm:block h-8 w-full shrink-0" />
                        </div>
                    </div>
                </div>


            </div>
        )
    }

    const renderStep4 = () => {
        const _minAvgNum = archiveMinAvg !== '' ? Number(archiveMinAvg) : null
        let filtered = archiveList.filter(e =>
            (!archiveFilter.classId || e.class_id === archiveFilter.classId) &&
            (!archiveFilter.year || String(e.year) === String(archiveFilter.year)) &&
            (!archiveFilter.month || String(e.month) === String(archiveFilter.month)) &&
            (!archiveSearch || e.class_name.toLowerCase().includes(archiveSearch.toLowerCase())) &&
            (archiveStatusFilter === 'all' || (archiveStatusFilter === 'complete' ? e.completed === e.count && e.count > 0 : e.completed < e.count)) &&
            (_minAvgNum === null || (e.count > 0 && (e.completed / e.count) * 100 < _minAvgNum))
        )
        if (archiveSort === 'oldest') filtered = [...filtered].sort((a, b) => a.year - b.year || a.month - b.month)
        else if (archiveSort === 'name') filtered = [...filtered].sort((a, b) => a.class_name.localeCompare(b.class_name))
        else if (archiveSort === 'progress') filtered = [...filtered].sort((a, b) => (b.count ? b.completed / b.count : 0) - (a.count ? a.completed / a.count : 0))
        const uniqueYears = [...new Set(archiveList.map(e => e.year))].sort((a, b) => b - a)

        const cardsToRender = filtered.slice(0, archiveVisibleCount)

        if (archivePreview) {
            const { students: pStu, scores: pSc, extras: pEx, bulanObj: pBulan, tahun: pTahun, musyrif: pMus, className: pClass, lang: pLang, entry } = archivePreview
            const editSc = (sid) => archiveEditMode ? { ...pSc[sid], ...(archiveEditScores[sid] || {}) } : pSc[sid]
            const editEx = (sid) => archiveEditMode ? { ...pEx[sid], ...(archiveEditExtras[sid] || {}) } : pEx[sid]
            const pStudent = previewStudentId ? pStu.find(s => s.id === previewStudentId) : pStu[0]

            const handleScoreEdit = (key, val) => {
                const raw = val.replace(/[^0-9]/g, '')
                if (raw === '') {
                    setArchiveEditScores(prev => ({
                        ...prev,
                        [pStudent.id]: {
                            ...(prev[pStudent.id] || {}),
                            [key]: ''
                        }
                    }))
                    return
                }
                const num = Number(raw)
                const checkedNum = Math.min(100, Math.max(0, num))
                setArchiveEditScores(prev => ({
                    ...prev,
                    [pStudent.id]: {
                        ...(prev[pStudent.id] || {}),
                        [key]: checkedNum
                    }
                }))
            }

            const handleExtraEdit = (key, val) => {
                setArchiveEditExtras(prev => ({
                    ...prev,
                    [pStudent.id]: {
                        ...(prev[pStudent.id] || {}),
                        [key]: val
                    }
                }))
            }

            return (
                <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <button onClick={() => { setArchivePreview(null); setArchiveEditMode(false) }} className="w-10 h-10 rounded-xl border border-[var(--color-border)] hover:bg-[var(--color-surface-alt)] flex items-center justify-center transition-all">
                                <ArrowLeft className="w-4 h-4" />
                            </button>
                            <div>
                                <h3 className="text-base font-black text-[var(--color-text)]">{entry.class_name}</h3>
                                <p className="text-[11px] text-[var(--color-text-muted)] font-medium">{BULAN.find(b => b.id === entry.month)?.id_str} {entry.year} · {pStu.length} Santri</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <button onClick={() => setArchiveEditMode(!archiveEditMode)} className={`h-9 px-4 rounded-xl border text-xs font-black transition-all ${archiveEditMode ? 'bg-violet-500 border-violet-500 text-white shadow-lg shadow-violet-500/20' : 'bg-violet-500/10 border-violet-500/20 text-violet-600 hover:bg-violet-500/20'}`}>
                                <Sliders className="w-3.5 h-3.5 mr-2" /> {archiveEditMode ? 'Selesai Edit' : 'Edit Arsip'}
                            </button>
                            <button onClick={() => runZipBlast(pStu, entry)} className="h-9 px-4 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-600 text-xs font-black hover:bg-teal-500/20 transition-all">
                                <FileArchive className="w-3.5 h-3.5 mr-2" /> ZIP PDF
                            </button>
                            <button onClick={() => openPrintWindow(pStu)} className="h-9 px-4 rounded-xl bg-indigo-500 text-white text-xs font-black hover:bg-indigo-600 transition-all flex items-center gap-2">
                                <Printer className="w-3.5 h-3.5 mr-1.5" /> Cetak Semua
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-col lg:flex-row gap-6">
                        {/* Left: Sidebar Navigation */}
                        <div className="w-full lg:w-64 xl:w-72 p-4 lg:p-5 rounded-3xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] shadow-sm self-start lg:sticky lg:top-6">
                            <div className="flex items-center justify-between mb-4 px-1">
                                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Pilih Santri</p>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 font-black">{pStu.length}</span>
                            </div>
                            <div className="flex flex-col gap-1.5 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                                {pStu.map(s => {
                                    const sc = editSc(s.id) || {}
                                    const complete = isComplete(sc, activeCriteria)
                                    const active = previewStudentId === s.id
                                    return (
                                        <button
                                            key={s.id}
                                            onClick={() => setPreviewStudentId(s.id)}
                                            className={`w-full p-2.5 rounded-xl border text-left transition-all ${active ? 'bg-indigo-500 border-indigo-500 text-white shadow-lg shadow-indigo-500/15' : 'bg-[var(--color-surface)] border-[var(--color-border)] hover:border-indigo-500/30'}`}
                                        >
                                            <div className="flex items-center gap-2.5">
                                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${active ? 'bg-white/20' : 'bg-[var(--color-surface-alt)]'}`}>
                                                    <span className={`text-[9px] font-black ${active ? 'text-white' : 'text-indigo-500'}`}>{s.name.charAt(0)}</span>
                                                </div>
                                                <span className="text-[11px] font-bold truncate flex-1">{s.name}</span>
                                                {complete && <CheckCircle2 className={`w-3 h-3 ${active ? 'text-white' : 'text-emerald-500'}`} />}
                                            </div>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Right: Preview Area */}
                        <div className="flex-1 min-w-0">
                            {pStudent && (
                                <div className="space-y-4">
                                    {archiveEditMode ? (
                                        <div className="p-6 rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-md animate-fade-in space-y-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-violet-500 text-white flex items-center justify-center shadow-lg shadow-violet-500/20 shrink-0">
                                                    <Sliders className="w-3.5 h-3.5" />
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-black text-[var(--color-text)]">Edit Mode: {pStudent.name}</h4>
                                                    <p className="text-[10px] text-[var(--color-text-muted)] font-medium">Ubah nilai dan data tambahan untuk periode ini.</p>
                                                </div>
                                            </div>

                                            {/* Nilai Kriteria */}
                                            <div className="space-y-2">
                                                <h5 className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] flex items-center gap-1.5">
                                                    <ClipboardList className="w-3.5 h-3.5 opacity-50 mr-1.5" /> Nilai Kriteria
                                                </h5>
                                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                                    {KRITERIA.map(k => {
                                                        const val = editSc(pStudent.id)?.[k.key] ?? '';
                                                        const g = val !== '' ? GRADE(Number(val)) : null;
                                                        return (
                                                            <div key={k.key} className="flex flex-col p-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] shadow-sm">
                                                                <span className="text-[9px] font-black" style={{ color: k.color }}>{k.id}</span>
                                                                <span className="text-[7px] text-[var(--color-text-muted)] font-medium leading-none mb-1.5 truncate">{k.label}</span>
                                                                <div className="flex items-center gap-1.5 mt-auto">
                                                                    <input
                                                                        type="text"
                                                                        inputMode="numeric"
                                                                        value={val}
                                                                        onChange={(e) => handleScoreEdit(k.key, e.target.value)}
                                                                        className="w-full h-8 text-center text-[12px] font-black rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] focus:border-indigo-500 outline-none text-[var(--color-text)]"
                                                                        placeholder="—"
                                                                    />
                                                                    {g && (
                                                                        <span className="text-[8px] font-black px-1.5 py-0.5 rounded shrink-0" style={{ background: g.bg, color: g.color }}>
                                                                            {g.id}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            </div>

                                            {/* Kondisi Fisik & Perkembangan Hafalan */}
                                            {(activeRtObj.hasFisik || activeRtObj.hasHafalan) && (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {/* Fisik */}
                                                    {activeRtObj.hasFisik && (
                                                        <div className="space-y-2">
                                                            <h5 className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Kondisi Fisik</h5>
                                                            <div className="grid grid-cols-2 gap-2">
                                                                {FISIK_FIELDS.filter(f => f.key === 'berat_badan' || f.key === 'tinggi_badan').map(f => (
                                                                    <div key={f.key} className="flex items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-2.5 h-10">
                                                                        {(() => { const Icon = f.icon; return <Icon style={{ color: f.color }} className="w-3.5 h-3.5 shrink-0 opacity-80" /> })()}
                                                                        <input
                                                                            type="number"
                                                                            inputMode="decimal"
                                                                            placeholder={f.label}
                                                                            value={editEx(pStudent.id)?.[f.key] ?? ''}
                                                                            onChange={(e) => handleExtraEdit(f.key, e.target.value)}
                                                                            className="flex-1 w-0 text-[11px] font-bold bg-transparent text-[var(--color-text)] outline-none"
                                                                        />
                                                                        <span className="text-[9px] text-[var(--color-text-muted)] font-black">{f.unit}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Hafalan */}
                                                    {activeRtObj.hasHafalan && (
                                                        <div className="space-y-2">
                                                            <h5 className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Perkembangan Hafalan</h5>
                                                            <div className="grid grid-cols-2 gap-2">
                                                                {HAFALAN_FIELDS.map(f => (
                                                                    <div key={f.key} className="flex items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-2.5 h-10">
                                                                        {(() => { const Icon = f.icon; return <Icon style={{ color: f.color }} className="w-3.5 h-3.5 shrink-0 opacity-80" /> })()}
                                                                        <input
                                                                            type="text"
                                                                            placeholder={f.ph}
                                                                            value={editEx(pStudent.id)?.[f.key] ?? ''}
                                                                            onChange={(e) => handleExtraEdit(f.key, e.target.value)}
                                                                            className="flex-1 w-0 text-[11px] font-bold bg-transparent text-[var(--color-text)] outline-none"
                                                                        />
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Ketidakhadiran */}
                                            {activeRtObj.hasAttendance && (
                                                <div className="space-y-2">
                                                    <h5 className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Ketidakhadiran</h5>
                                                    <div className="grid grid-cols-4 gap-2">
                                                        {[
                                                            { key: 'hari_sakit', label: 'Sakit', color: '#ef4444' },
                                                            { key: 'hari_izin', label: 'Izin', color: '#3b82f6' },
                                                            { key: 'hari_alpa', label: 'Alpa', color: '#f59e0b' },
                                                            { key: 'hari_pulang', label: 'Pulang', color: '#10b981' }
                                                        ].map(item => (
                                                            <div key={item.key} className="flex flex-col p-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-center">
                                                                <span className="text-[8px] font-black text-[var(--color-text-muted)] uppercase tracking-wider mb-1">{item.label}</span>
                                                                <div className="flex items-center justify-center gap-1">
                                                                    <input
                                                                        type="number"
                                                                        min={0}
                                                                        value={editEx(pStudent.id)?.[item.key] ?? ''}
                                                                        onChange={(e) => handleExtraEdit(item.key, e.target.value)}
                                                                        className="w-10 h-7 text-center text-[11px] font-black rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] outline-none"
                                                                        placeholder="0"
                                                                    />
                                                                    <span className="text-[9px] text-[var(--color-text-muted)] font-bold">Hari</span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Catatan Musyrif */}
                                            {activeRtObj.hasCatatan && (
                                                <div className="space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <h5 className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Catatan Musyrif</h5>
                                                        <button
                                                            onClick={() => {
                                                                const c = generateAutoComment(editSc(pStudent.id), pStudent.id, []);
                                                                if (c) handleExtraEdit('catatan', c);
                                                            }}
                                                            className="h-6 px-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 text-[8px] font-black flex items-center gap-1 transition-all active:scale-95"
                                                        >
                                                            <Zap className="w-3 h-3" />
                                                            Generate Catatan
                                                        </button>
                                                    </div>
                                                    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] overflow-hidden">
                                                        <textarea
                                                            placeholder="Tulis catatan perkembangan di sini..."
                                                            value={editEx(pStudent.id)?.catatan ?? ''}
                                                            onChange={(e) => handleExtraEdit('catatan', e.target.value)}
                                                            maxLength={200}
                                                            rows={3}
                                                            className="w-full p-3 text-[11px] bg-transparent text-[var(--color-text)] outline-none resize-none leading-relaxed"
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            <div className="flex gap-3 pt-2">
                                                <button onClick={saveArchiveEdit} disabled={archiveEditSaving} className="flex-1 h-10 rounded-xl bg-emerald-500 text-white text-xs font-black shadow-lg shadow-emerald-500/10 hover:bg-emerald-600 disabled:opacity-60 transition-all active:scale-95 flex items-center justify-center gap-2">
                                                    {archiveEditSaving ? 'Menyimpan...' : 'Simpan Semua Perubahan'}
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col rounded-[32px] border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden shadow-sm">
                                            <div className="px-4 py-4 border-b border-[var(--color-border)] bg-[var(--color-surface-alt)]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                                {/* Row 1: Title & Mobile Toggle */}
                                                <div className="flex items-center justify-between w-full sm:w-auto">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                                                            <Search className="w-3 h-3 text-indigo-500" />
                                                        </div>
                                                        <h4 className="text-[11px] font-black text-[var(--color-text)] uppercase tracking-wider">Preview Raport</h4>
                                                    </div>
                                                    <button
                                                        onClick={() => setIsFullScreenPreview(true)}
                                                        className="h-8 w-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] flex items-center justify-center sm:hidden"
                                                    >
                                                        <Maximize2 className="w-3 h-3" />
                                                    </button>
                                                </div>

                                                {/* Row 2 & 3: Controls */}
                                                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                                                    {/* Group: Format & Lang - Stretching on Mobile */}
                                                    <div className="flex items-center gap-2 w-full sm:w-auto">
                                                        <div className="flex-1 sm:flex-initial flex items-center gap-1 p-1 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm h-10">
                                                            <button onClick={() => setPageSize('a4')} className={`flex-1 sm:px-3 h-8 rounded-lg text-[10px] font-black transition-all ${pageSize === 'a4' ? 'bg-amber-500 text-white shadow-sm' : 'text-[var(--color-text-muted)]'}`}>A4</button>
                                                            <button onClick={() => setPageSize('f4')} className={`flex-1 sm:px-3 h-8 rounded-lg text-[10px] font-black transition-all ${pageSize === 'f4' ? 'bg-amber-500 text-white shadow-sm' : 'text-[var(--color-text-muted)]'}`}>F4</button>
                                                        </div>
                                                        <div className="flex-1 sm:flex-initial flex items-center gap-1 p-1 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm h-10">
                                                            <button onClick={() => setLang('ar')} className={`flex-1 sm:px-3 h-8 rounded-lg text-[10px] font-black transition-all ${lang === 'ar' ? 'bg-indigo-500 text-white shadow-sm' : 'text-[var(--color-text-muted)]'}`}>AR</button>
                                                            <button onClick={() => setLang('id')} className={`flex-1 sm:px-3 h-8 rounded-lg text-[10px] font-black transition-all ${lang === 'id' ? 'bg-indigo-500 text-white shadow-sm' : 'text-[var(--color-text-muted)]'}`}>ID</button>
                                                        </div>
                                                    </div>

                                                    {/* Group: Zoom & Actions - Stretching on Mobile */}
                                                    <div className="flex items-center gap-2 w-full sm:w-auto">
                                                        {/* Zoom Control stretches on mobile */}
                                                        <div className="flex-1 sm:flex-initial flex items-center gap-1 p-1 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm h-10">
                                                            <button onClick={() => { manualZoomRef.current = true; setPreviewZoom(p => Math.max(0.3, p - 0.1)) }} className="flex-1 sm:w-8 h-8 text-[11px] text-[var(--color-text-muted)] hover:text-indigo-500 flex items-center justify-center"><Search className="w-3 h-3 mr-0.5" />-</button>
                                                            <button
                                                                onClick={() => {
                                                                    manualZoomRef.current = false
                                                                    const el = previewContainerRef.current
                                                                    if (!el) return
                                                                    const padding = window.innerWidth < 640 ? 24 : 80
                                                                    const availW = el.clientWidth - padding
                                                                    const docW = pageSize === 'f4' ? 215 * 3.7795275591 : 210 * 3.7795275591
                                                                    setPreviewZoom(Math.min(1, Math.max(0.3, Math.floor((availW / docW) * 100) / 100)))
                                                                }}
                                                                title="Fit ke lebar layar"
                                                                className="text-[9px] font-black w-10 text-center text-indigo-500 tabular-nums hover:text-indigo-700 transition-colors cursor-pointer select-none"
                                                            >{Math.round(previewZoom * 100)}%</button>
                                                            <button onClick={() => { manualZoomRef.current = true; setPreviewZoom(p => Math.min(1.5, p + 0.1)) }} className="flex-1 sm:w-8 h-8 text-[11px] text-[var(--color-text-muted)] hover:text-indigo-500 flex items-center justify-center"><Search className="w-3 h-3 mr-0.5" />+</button>
                                                        </div>

                                                        {pStudent?.phone && (
                                                            <button onClick={() => sendWATextOnly(pStudent)} className="h-10 px-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-700 text-[10px] font-black flex items-center justify-center gap-2 flex-1 sm:flex-initial">
                                                                <WhatsAppIcon className="w-3.5 h-3.5 mr-1" /> <span className="hidden xs:inline">Whatsapp</span>
                                                            </button>
                                                        )}

                                                        <button onClick={() => openPrintWindow([pStudent].filter(Boolean))} className="h-10 px-5 rounded-xl bg-emerald-500 text-white text-[10px] font-black flex items-center justify-center gap-2 flex-1 sm:flex-initial shadow-lg shadow-emerald-500/20">
                                                            <Printer className="w-3.5 h-3.5 mr-1" /> <span className="hidden xs:inline">Cetak</span>
                                                        </button>

                                                        <button
                                                            onClick={() => setIsFullScreenPreview(true)}
                                                            className="h-10 w-10 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hidden sm:flex items-center justify-center hover:text-indigo-500 transition-all"
                                                        >
                                                            <Maximize2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Report Card Body with interactive Zoom */}
                                            <div className="flex-1 overflow-y-auto overflow-x-hidden bg-gray-50 dark:bg-slate-900/50 flex flex-col items-center custom-scrollbar p-6 min-h-[500px]">
                                                <div
                                                    style={{ transform: `scale(${previewZoom})`, transformOrigin: 'top center' }}
                                                    className="shadow-2xl h-fit cursor-pointer relative"
                                                    onClick={() => setIsFullScreenPreview(true)}
                                                >
                                                    {/* Mobile pulse ring */}
                                                    <div className="lg:hidden absolute inset-0 rounded-none ring-2 ring-indigo-400/40 animate-pulse pointer-events-none z-10" />
                                                    <RaportPrintCard
                                                        student={pStudent}
                                                        scores={pSc[pStudent.id]}
                                                        extra={pEx[pStudent.id]}
                                                        bulanObj={pBulan}
                                                        tahun={pTahun}
                                                        musyrif={pMus}
                                                        className={pClass}
                                                        lang={lang}
                                                        settings={settings}
                                                        pageSize={pageSize}
                                                        reportType={entry.report_type || 'bulanan'}
                                                        selectedSemester={entry.semester || 1}
                                                        academicYear={entry.academic_year || ''}
                                                        selectedClass={pClass}
                                                        layoutConfig={layoutConfig}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )
        }

        return (
            <Suspense fallback={
                <div className="py-20 flex flex-col items-center justify-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)]" />
                    <p className="text-xs font-black text-[var(--color-text-muted)] uppercase tracking-widest animate-pulse">Memuat Arsip Raport...</p>
                </div>
            }>
                <LazyRaportArchive
                    archiveList={archiveList}
                    archiveLoading={archiveLoading}
                    archiveFilter={archiveFilter}
                    setArchiveFilter={setArchiveFilter}
                    archiveSearch={archiveSearch}
                    setArchiveSearch={setArchiveSearch}
                    archiveSort={archiveSort}
                    archiveTab={archiveTab}
                    setArchiveTab={setArchiveTab}
                    archiveVisibleCount={archiveVisibleCount}
                    setArchiveVisibleCount={setArchiveVisibleCount}
                    archivePreview={archivePreview}
                    setArchivePreview={setArchivePreview}
                    previewStudentId={previewStudentId}
                    setPreviewStudentId={setPreviewStudentId}
                    archiveEditMode={archiveEditMode}
                    setArchiveEditMode={setArchiveEditMode}
                    archiveEditScores={archiveEditScores}
                    setArchiveEditScores={setArchiveEditScores}
                    archiveEditExtras={archiveEditExtras}
                    setArchiveEditExtras={setArchiveEditExtras}
                    archiveEditSaving={archiveEditSaving}
                    archiveStatusFilter={archiveStatusFilter}
                    archiveMinAvg={archiveMinAvg}
                    loadArchiveDetail={loadArchiveDetail}
                    saveArchiveEdit={saveArchiveEdit}
                    exportBulkPDF={exportBulkPDF}
                    setConfirmDelete={setConfirmDelete}
                    runZipBlast={runZipBlast}
                    openPrintWindow={openPrintWindow}
                    sendWATextOnly={sendWATextOnly}
                    pageSize={pageSize}
                    setPageSize={setPageSize}
                    lang={lang}
                    setLang={setLang}
                    previewZoom={previewZoom}
                    setPreviewZoom={setPreviewZoom}
                    setIsFullScreenPreview={setIsFullScreenPreview}
                    settings={settings}
                    setStep={setStep}
                    previewContainerRef={previewContainerRef}
                    manualZoomRef={manualZoomRef}
                    reportType={reportType}
                />
            </Suspense>
        )
    }


    const printStudents = archivePreview ? archivePreview.students : students
    const printScores = archivePreview ? archivePreview.scores : scores
    const printExtras = archivePreview ? archivePreview.extras : extras
    const printBulan = archivePreview ? archivePreview.bulanObj : bulanObj
    const printYear = archivePreview ? archivePreview.tahun : selectedYear
    const printMusyrif = archivePreview ? archivePreview.musyrif : musyrif
    const printClass = archivePreview ? archivePreview.className : selectedClass?.name
    const printLang = archivePreview ? archivePreview.lang : lang
    const printReportType = archivePreview ? (archivePreview.entry?.report_type || 'bulanan') : reportType
    const printSemester = archivePreview ? (archivePreview.entry?.semester || selectedSemester) : selectedSemester
    const printAcademicYear = archivePreview ? (archivePreview.entry?.academic_year || academicYear) : academicYear
    const printSelectedClass = archivePreview ? selectedClass : selectedClass // Wait, if archivePreview, we don't have the full selectedClass object but className/level is enough. Let's pass printClass string or reconstructed object if needed. Wait, in RaportPrintCard, selectedClass is used to get ClassLevel (getClassLevel(classObj)). getClassLevel handles either string or object! So printSelectedClass can be: archivePreview ? archivePreview.className : selectedClass. Let's do that!
    const printSelectedClassResolved = archivePreview ? archivePreview.className : selectedClass

    // ── Fullscreen resolved preview variables
    const isArchiveMode = step === 4 && archivePreview
    const fsStudentsList = isArchiveMode ? archivePreview.students : students
    const fsStudent = isArchiveMode
        ? (archivePreview.students.find(s => s.id === previewStudentId) || archivePreview.students[0])
        : (students.find(s => s.id === previewStudentId) || students[0])

    const fsScores = isArchiveMode
        ? archivePreview.scores[fsStudent?.id]
        : scores[fsStudent?.id]

    const fsExtra = isArchiveMode
        ? archivePreview.extras[fsStudent?.id]
        : extras[fsStudent?.id]

    const fsBulan = isArchiveMode ? archivePreview.bulanObj : bulanObj
    const fsTahun = isArchiveMode ? archivePreview.tahun : selectedYear
    const fsMus = isArchiveMode ? archivePreview.musyrif : musyrif
    const fsClass = isArchiveMode ? archivePreview.className : selectedClass?.name
    const fsCatatanArab = isArchiveMode ? null : catatanArabMap[fsStudent?.id]
    const fsReportType = isArchiveMode ? (archivePreview.entry?.report_type || 'bulanan') : reportType
    const fsSemester = isArchiveMode ? (archivePreview.entry?.semester || selectedSemester) : selectedSemester
    const fsAcademicYear = isArchiveMode ? (archivePreview.entry?.academic_year || academicYear) : academicYear
    const fsSelectedClass = isArchiveMode ? archivePreview.className : selectedClass


    const stepLabels = ['Pilih Kelas', 'Setup Periode', 'Input Nilai', 'Preview & Cetak']

    const activeStepIndex = useMemo(() => {
        if (step === 0) return -1
        if (step === 1) {
            return selectedClassId ? 1 : 0
        }
        if (step === 2) return 2
        if (step === 3) return 3
        return -1
    }, [step, selectedClassId])

    // ── Guards ─────────────────────────────────────────────────────────────────

    if (isAllowed === null) return (
        <DashboardLayout>
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)]" />
            </div>
        </DashboardLayout>
    )
    if (!isAllowed) return (
        <DashboardLayout>
            <div className="p-4 md:p-6 flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
                <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center">
                    <Lock className="w-8 h-8 text-red-500" />
                </div>
                <div>
                    <h2 className="text-xl font-black text-[var(--color-text)] mb-1">Akses Ditolak</h2>
                    <p className="text-[12px] text-[var(--color-text-muted)] max-w-xs">Halaman ini hanya dapat diakses oleh <strong>Guru</strong> dan <strong>Admin</strong>.</p>
                </div>
                <button onClick={() => navigate(-1)} className="h-9 px-5 rounded-xl bg-[var(--color-primary)] text-white text-[11px] font-black hover:opacity-90 transition-all">Kembali</button>
            </div>
        </DashboardLayout>
    )

    // FIX MINOR: pageLoading pakai skeleton layout, bukan full-page spinner kosong
    if (pageLoading) {
        return (
            <DashboardLayout title={isAcademicRaport ? 'Rapor & Penilaian' : 'Raport Pondok'}>
                {/* Header skeleton */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                        <div className="h-7 w-44 bg-[var(--color-border)] rounded-lg animate-pulse mb-2" />
                        <div className="h-3 w-64 bg-[var(--color-border)] rounded animate-pulse" />
                    </div>
                    <div className="flex gap-2">
                        <div className="h-9 w-24 bg-[var(--color-border)] rounded-xl animate-pulse" />
                        <div className="h-9 w-28 bg-[var(--color-border)] rounded-xl animate-pulse" />
                    </div>
                </div>
                {/* Stats skeleton */}
                <StatsCarousel count={4}>
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="glass rounded-[1.5rem] p-4 flex items-center gap-3 animate-pulse min-h-[90px]">
                            <div className="w-12 h-12 rounded-xl bg-[var(--color-border)] shrink-0" />
                            <div className="flex-1">
                                <div className="h-2.5 w-16 bg-[var(--color-border)] rounded mb-2" />
                                <div className="h-5 w-10 bg-[var(--color-border)] rounded" />
                            </div>
                        </div>
                    ))}
                </StatsCarousel>
                {/* Kelas grid skeleton */}
                <div className="h-3 w-24 bg-[var(--color-border)] rounded animate-pulse mb-3" />
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                    {Array.from({ length: 8 }).map((_, i) => <ClassCardSkeleton key={i} />)}
                </div>
            </DashboardLayout>
        )
    }

    return (
        <DashboardLayout title={isAcademicRaport ? 'Rapor & Penilaian' : 'Raport Pondok'}>
            {/* Global auto-save indicator */}
            {step === 2 && globalSaveIndicator && (
                <div className={`fixed bottom-6 right-6 z-[9999] flex items-center gap-2 px-3.5 py-2.5 rounded-xl border shadow-2xl text-[10px] font-black transition-all duration-300 backdrop-blur-md ${globalSaveIndicator === 'saving' ? 'bg-amber-500/10 dark:bg-amber-500/20 border-amber-500/20 text-amber-600 dark:text-amber-400' : 'bg-emerald-500/10 dark:bg-emerald-500/20 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'}`}>
                    {globalSaveIndicator === 'saving' ? <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" /> : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                    {globalSaveIndicator === 'saving' ? 'Menyimpan...' : 'Tersimpan ✓'}
                </div>
            )}
            {/* TAMBAH INI: */}
            <div className="p-4 md:p-6 space-y-4 max-w-[1800px] mx-auto">

                {/* Read-only Banner — access.teacher_raport flag off */}
                {!canEdit && (
                    <div className="px-4 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-2">
                        <Lock className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        <p className="text-[11px] font-bold text-rose-600 flex-1">Mode Read-only — Edit raport dinonaktifkan oleh administrator.</p>
                    </div>
                )}

                {/* ── PAGE HEADER ── */}
                <PageHeader
                    badge="academic"
                    breadcrumbs={['Grade Reports']}
                    title={isAcademicRaport ? 'Rapor & Penilaian' : 'Raport Pondok'}
                    subtitle={isAcademicRaport ? 'Kelola dan cetak rapor umum & penilaian akademik per kelas.' : 'Kelola dan cetak raport pondok bulanan per kelas.'}
                    actions={
                        <>
                            {step >= 1 && step <= 3 && activeStepIndex !== -1 && (
                                <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] mr-2 shadow-sm">
                                    {stepLabels.map((label, i) => (
                                        <div key={i} className="flex items-center gap-1.5">
                                            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black transition-all ${activeStepIndex === i ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20' : activeStepIndex > i ? 'bg-emerald-500/20 text-emerald-500' : 'bg-[var(--color-surface)] text-[var(--color-text-muted)]'}`}>
                                                {activeStepIndex > i ? <Check className="w-2 h-2" /> : i + 1}
                                            </div>
                                            <span className={`text-[9px] font-bold transition-all ${activeStepIndex === i ? 'text-indigo-600 font-extrabold' : activeStepIndex > i ? 'text-emerald-600' : 'text-[var(--color-text-muted)]'}`}>{label}</span>
                                            {i < stepLabels.length - 1 && <div className="w-4 h-px bg-[var(--color-border)]" />}
                                        </div>
                                    ))}
                                </div>
                            )}

                            <button
                                ref={headerMenuBtnRef}
                                onClick={() => { if (!isHeaderMenuOpen) setHeaderMenuRect(headerMenuBtnRef.current?.getBoundingClientRect()); setIsHeaderMenuOpen(v => !v) }}
                                className={`h-9 w-9 rounded-lg border flex items-center justify-center text-sm transition-all active:scale-95 ${isHeaderMenuOpen ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-500 shadow-sm' : 'bg-[var(--color-surface-alt)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-border)]'}`}
                                title="Data & Backup Operations"
                            >
                                <Sliders className="w-3.5 h-3.5" />
                            </button>

                            <button
                                ref={shortcutBtnRef}
                                onClick={() => { if (!showShortcutModal) setShortcutRect(shortcutBtnRef.current?.getBoundingClientRect()); setShowShortcutModal(v => !v) }}
                                className={`hidden sm:flex h-9 w-9 rounded-lg border items-center justify-center text-sm transition-all active:scale-95
                                    ${showShortcutModal
                                        ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)]/30 text-[var(--color-primary)] shadow-sm'
                                        : 'bg-[var(--color-surface-alt)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-border)]'
                                    }`}
                                title="Keyboard Shortcuts (?)"
                            >
                                <Keyboard className="w-3.5 h-3.5" />
                            </button>

                            <button onClick={() => setShowTutorialModal(true)} aria-label="Panduan penggunaan" className="h-9 px-3 gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/8 text-amber-500 text-[10px] font-black flex items-center justify-center hover:bg-amber-500/15 transition-all" title="Panduan & Tutorial">
                                <Lightbulb className="w-3 h-3" />
                                Tutorial
                            </button>

                        </>
                    }
                />

                {/* ── STATS ── */}
                {step === 0 && (
                    <StatsCarousel count={4}>
                        <StatCard
                            icon={School}
                            label="Total Kelas"
                            value={step0Stats.totalKelas}
                            color="indigo"
                        />
                        <StatCard
                            icon={Users}
                            label="Total Siswa"
                            value={step0Stats.totalSiswa}
                            color="emerald"
                        />
                        <StatCard
                            icon={CheckCircle2}
                            label="Raport Lengkap"
                            value={step0Stats.raportLengkap}
                            color="indigo"
                        />
                        <StatCard
                            icon={PieChart}
                            label="Rata Input"
                            value={step0Stats.rataInput}
                            color="amber"
                        />
                    </StatsCarousel>
                )}


                {/* ── CONTENT — dengan animasi fade+slide antar step ── */}
                <div className="glass rounded-[1.5rem] border border-[var(--color-border)] p-4 sm:p-6">
                    <div key={step}
                        style={{
                            animation: 'stepFadeIn 0.22s cubic-bezier(0.16,1,0.3,1) both',
                        }}
                    >
                        {step === 0 && renderStep0()}
                        {step === 1 && renderStep1()}
                        {step === 2 && renderStep2()}
                        {step === 3 && renderStep3()}
                        {step === 4 && renderStep4()}
                    </div>
                </div>
                {/* Keyframe untuk animasi step */}
                <style>{`
                @keyframes stepFadeIn {
                    from { opacity: 0; transform: translateY(8px) scale(0.995); }
                    to   { opacity: 1; transform: translateY(0) scale(1); }
                }
            `}</style>

                {/* Portaled Header Menu Dropdown */}
                {isHeaderMenuOpen && headerMenuRect && createPortal(
                    <>
                        <div className="fixed inset-0 z-[9990] bg-black/5 backdrop-blur-[1px]" onClick={() => setIsHeaderMenuOpen(false)} />
                        <div
                            className="fixed z-[9991] w-56 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl p-0 animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-200 overflow-hidden"
                            style={{
                                top: headerMenuRect.bottom + 8,
                                left: Math.max(10, headerMenuRect.right - 224)
                            }}
                        >
                            <div className="p-2 space-y-1">
                                <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] px-3 py-1">Data</p>

                                {/* Import Section */}
                                <button onClick={() => { setIsHeaderMenuOpen(false); setIsImportModalOpen(true) }}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--color-surface-alt)] text-[var(--color-text)] transition-all group">
                                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <Upload className="w-3.5 h-3.5" />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-[11px] font-black leading-tight">Import XLS</p>
                                        <p className="text-[9px] opacity-60 font-medium leading-tight mt-0.5">Restore data dari file Excel backup</p>
                                    </div>
                                </button>

                                <button onClick={() => { setIsHeaderMenuOpen(false); setIsExportModalOpen(true) }}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--color-surface-alt)] text-[var(--color-text)] transition-all group">
                                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <Download className="w-3.5 h-3.5" />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-[11px] font-black leading-tight">Export Data</p>
                                        <p className="text-[9px] opacity-60 font-medium leading-tight mt-0.5">Cadangkan, backup, atau cetak massal</p>
                                    </div>
                                </button>

                                <div className="h-px bg-[var(--color-border)] my-1 mx-2" />
                                <p className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Manajemen</p>

                                <button onClick={() => { setIsHeaderMenuOpen(false); setStep(4); loadArchive() }}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--color-surface-alt)] text-[var(--color-text)] transition-all group">
                                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <Archive className="w-3.5 h-3.5" />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-[11px] font-black leading-tight">Riwayat Raport</p>
                                        <p className="text-[9px] opacity-60 font-medium leading-tight mt-0.5">Lihat dan cetak arsip bulan sebelumnya</p>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </>,
                    document.body
                )}

                {/* SaaS Raport Import Modal */}
                <Suspense fallback={null}>
                    {hasOpenedImport && (
                        <LazyRaportImportModal
                            isOpen={isImportModalOpen}
                            onClose={() => setIsImportModalOpen(false)}
                            selectedMonth={selectedMonth}
                            selectedYear={selectedYear}
                            selectedSemester={selectedSemester}
                            academicYear={academicYear}
                            musyrif={musyrif}
                            profile={profile}
                            onSuccess={loadStudents}
                            activeClassName={selectedClass?.name}
                            criteria={activeCriteria}
                            reportType={reportType}
                            maxScore={activeMaxScore}
                            dbTable={activeDbTable}
                        />
                    )}
                </Suspense>

                {/* SaaS Raport Export Modal */}
                <Suspense fallback={null}>
                    {hasOpenedExport && (
                        <LazyRaportExportModal
                            isOpen={isExportModalOpen}
                            onClose={() => setIsExportModalOpen(false)}
                            students={students}
                            selectedStudentIds={selectedStudentIds}
                            activeClassName={selectedClass?.name}
                            selectedMonthName={bulanObj?.id_str}
                            selectedYear={selectedYear}
                            exporting={exporting}
                            handleExportCSV={handleExportCSV}
                            handleExportExcel={handleExportExcel}
                            handleExportAllClasses={handleExportAllClasses}
                            handleExportZip={handleExportZip}
                            handlePrintAll={handlePrintAll}
                            addToast={addToast}
                        />
                    )}
                </Suspense>

                {/* ── Hidden print container ── */}
                {printQueue.length > 0 && (
                    <div ref={printContainerRef} style={{ position: 'fixed', left: '-9999px', top: 0, width: '1000px', visibility: 'hidden', pointerEvents: 'none' }}>
                        {printStudents.filter(s => printQueue.includes(s.id)).map(s => (
                            <RaportPrintCard key={s.id} student={s} scores={printScores[s.id]} extra={printExtras[s.id]} bulanObj={printBulan} tahun={printYear} musyrif={printMusyrif} className={printClass} lang={printLang} settings={settings} pageSize={pageSize} catatanArab={catatanArabMap[s.id]} studentIndex={printStudents.findIndex(x => x.id === s.id) + 1} onRendered={() => setPrintRenderedCount(c => c + 1)} reportType={printReportType} selectedSemester={printSemester} academicYear={printAcademicYear} selectedClass={printSelectedClassResolved} layoutConfig={layoutConfig} signMode={isArchiveMode ? 'basah' : signMode} signatures={isArchiveMode ? null : signatures} />
                        ))}
                    </div>
                )}

                {/* Portaled Keyboard Shortcuts Dropdown */}
                {showShortcutModal && shortcutRect && createPortal(
                    <>
                        <div className="fixed inset-0 z-[9990] bg-black/5 backdrop-blur-[1px]" onClick={() => setShowShortcutModal(false)} />
                        <div
                            className="fixed z-[9991] w-72 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl shadow-black/10 overflow-hidden text-left animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-200"
                            style={{
                                top: shortcutRect.bottom + 8,
                                left: Math.max(10, shortcutRect.right - 288)
                            }}
                        >
                            <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between bg-[var(--color-surface)]">
                                <p className="text-[11px] font-black uppercase tracking-widest text-[var(--color-text)]">Pintasan Keyboard</p>
                                <span className="text-[9px] text-[var(--color-text-muted)] font-bold">Tekan ? untuk toggle</span>
                            </div>
                            <div className="max-h-[60vh] overflow-y-auto">
                                <ShortcutModalContent />
                            </div>
                        </div>
                    </>,
                    document.body
                )}

                {/* Tutorial Modal */}
                <Suspense fallback={null}>
                    {hasOpenedTutorial && (
                        <LazyRaportTutorialModal
                            isOpen={showTutorialModal}
                            onClose={() => setShowTutorialModal(false)}
                        />
                    )}
                </Suspense>

                {/* WA Blast Confirm Modal */}
                {waBlastConfirm && (
                    <WaBlastConfirmContent
                        isOpen={!!waBlastConfirm}
                        onClose={() => setWaBlastConfirm(null)}
                        queue={waBlastConfirm.queue}
                        lang={lang}
                        setLang={setLang}
                        pageSize={pageSize}
                        setPageSize={setPageSize}
                        buildWaMessage={buildWaMessage}
                        onPreviewStudent={(studentId) => {
                            setPreviewStudentId(studentId)
                            setIsFullScreenPreview(true)
                        }}
                        handleDownloadPdf={handleDownloadPdf}
                        generatingPdfIds={generatingPdfIds}
                        onConfirm={(selectedQueue, isDebug) => {
                            setWaBlastConfirm(null)
                            // Tunggu satu frame agar React selesai me-render printContainerRef dengan opsi baru
                            setTimeout(() => {
                                runWaBlast(selectedQueue, waBlastAbortRef, isDebug)
                            }, 150)
                        }}
                        onCancel={() => setWaBlastConfirm(null)}
                    />
                )}

                {/* WA Blast Progress Modal */}
                <Modal
                    isOpen={!!waBlast}
                    onClose={() => !waBlast?.active && setWaBlast(null)}
                    title={waBlast?.status === 'simulating' ? "🧪 WA Blast - SIMULASI" : "WA Blast Progress"}
                    description={waBlast?.status === 'simulating' ? "Simulasi proses pengiriman pesan WhatsApp (dry run)" : "Pantau proses pengiriman pesan WhatsApp ke wali santri"}
                    icon={WhatsAppIcon}
                    variant={waBlast?.status === 'simulating' ? "amber" : "green"}
                    showClose={!waBlast?.active}
                >
                    {waBlast && (
                        <WaBlastProgressContent
                            progress={waBlast.done + waBlast.failed}
                            total={waBlast.queue.length}
                            done={waBlast.done}
                            failed={waBlast.failed}
                            activeName={waBlast.active && waBlast.queue[waBlast.idx]?.name}
                            active={waBlast.active}
                            status={waBlast.status}
                            onCancel={() => {
                                waBlastAbortRef.current = true
                                setWaBlast(prev => prev ? { ...prev, active: false } : null)
                                addToast('Membatalkan WA Blast...', 'info')
                            }}
                        />
                    )}
                </Modal>

                {/* ZIP Blast Progress Modal */}
                <Modal
                    isOpen={!!zipBlast}
                    onClose={() => !zipBlast?.active && setZipBlast(null)}
                    title="Ekspor ZIP Progress"
                    icon={FileArchive}
                    showClose={!zipBlast?.active}
                >
                    {zipBlast && (
                        <ZipBlastProgressContent
                            progress={zipBlast.done + zipBlast.failed}
                            total={zipBlast.total}
                            done={zipBlast.done}
                            failed={zipBlast.failed}
                            activeName={zipBlast.active && zipBlast.queue[zipBlast.idx]?.name}
                            active={zipBlast.active}
                            status={zipBlast.status}
                            onCancel={() => {
                                zipAbortRef.current = true
                                setZipBlast(prev => prev ? { ...prev, active: false } : null)
                                addToast('Membatalkan ekspor ZIP...', 'info')
                            }}
                        />
                    )}
                </Modal>



                {/* Delete Confirm Modal (Portal implementation replace) */}
                {confirmDelete && (
                    <Modal
                        isOpen={true}
                        onClose={() => setConfirmDelete(null)}
                        title="Hapus Arsip Raport"
                        description={<span className="text-red-500 font-black">Aksi ini tidak bisa dibatalkan!</span>}
                        icon={AlertTriangle}
                        iconBg="bg-red-500/10"
                        iconColor="text-red-500"
                        size="md"
                        footer={
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setConfirmDelete(null)}
                                    className="flex-1 h-10 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[11px] font-black text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] active:scale-95 transition-all shadow-sm"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={() => executeDeleteArchive(confirmDelete)}
                                    className="flex-1 h-10 rounded-xl bg-red-500 text-white text-[11px] font-black shadow-md shadow-red-500/10 hover:bg-red-600 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                                >
                                    Ya, Hapus Permanen
                                </button>
                            </div>
                        }
                    >
                        <div className="py-2 text-[12px] font-bold text-[var(--color-text)] leading-relaxed">
                            Anda akan menghapus arsip raport kelas{' '}
                            <span className="bg-red-500/10 text-red-600 px-2 py-0.5 rounded-lg font-black inline-block">
                                {confirmDelete.class_name}
                            </span>{' '}
                            untuk periode{' '}
                            <span className="bg-red-500/10 text-red-600 px-2 py-0.5 rounded-lg font-black inline-block">
                                {BULAN.find(b => b.id === confirmDelete.month)?.id_str} {confirmDelete.year}
                            </span>{' '}
                            secara permanen.
                        </div>
                    </Modal>
                )}


                {/* ── FLOATING UNSAVED BAR ── */}
                {
                    step === 2 && hasUnsavedMemo && !unsavedBarDismissed && (
                        <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2.5 md:py-3 rounded-2xl shadow-2xl border border-amber-500/30 bg-[var(--color-surface)] backdrop-blur-sm animate-bounce-subtle w-max max-w-[95vw]"
                            style={{ boxShadow: '0 8px 32px rgba(245,158,11,0.18)' }}>
                            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
                            <span className="text-[10px] md:text-[11px] font-black text-[var(--color-text)] whitespace-nowrap">
                                Ada perubahan yang belum disimpan
                            </span>
                            <button onClick={saveAll} disabled={savingAll}
                                className="h-8 px-4 rounded-xl bg-amber-500 text-white text-[10px] font-black hover:bg-amber-600 transition-all flex items-center gap-1.5 disabled:opacity-60 shadow-md shadow-amber-500/20">
                                {savingAll ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                                {savingAll ? 'Menyimpan...' : 'Simpan'}
                            </button>
                            {/* FIX MAJOR: tombol × hanya dismiss bar, tidak menyimpan apapun */}
                            <button
                                onClick={() => setUnsavedBarDismissed(true)}
                                aria-label="Tutup pengingat"
                                title="Tutup pengingat (data belum disimpan)"
                                className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-all"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    )
                }

                {/* Unsaved Navigation Confirm */}
                <Modal
                    isOpen={!!pendingNav}
                    onClose={() => setPendingNav(null)}
                    title="Yakin Ingin Keluar?"
                    icon={AlertTriangle}
                    variant="amber"
                >
                    <div className="space-y-6">
                        <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
                            Anda memiliki perubahan nilai yang belum disimpan. Perubahan tersebut akan <strong>hilang selamanya</strong> jika Anda keluar tanpa menyimpan.
                        </p>
                        <div className="flex flex-col gap-2">
                            <button
                                onClick={async () => { await saveAll(); const action = pendingNav.action; setPendingNav(null); action() }}
                                className="h-11 rounded-xl bg-emerald-500 text-white text-sm font-black shadow-lg shadow-emerald-500/20"
                            >
                                Simpan & Lanjut
                            </button>
                            <button
                                onClick={() => { const action = pendingNav.action; setPendingNav(null); action() }}
                                className="h-11 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-sm font-black"
                            >
                                Buang Perubahan
                            </button>
                            <button
                                onClick={() => setPendingNav(null)}
                                className="h-10 text-[var(--color-text-muted)] text-xs font-black"
                            >
                                Batal
                            </button>
                        </div>
                    </div>
                </Modal>

                {/* Student Detail History Drawer */}
                <Modal
                    isOpen={!!studentDetailDrawer}
                    onClose={() => setStudentDetailDrawer(null)}
                    title={studentDetailDrawer?.student?.name ?? 'Detail Santri'}
                    icon={TrendingUp}
                    size="lg"
                >
                    {studentDetailDrawer && (
                        <div className="space-y-6">
                            {studentDetailLoading ? (
                                <div className="space-y-3">
                                    {Array.from({ length: 4 }).map((_, i) => (
                                        <div key={i} className="h-20 rounded-2xl bg-[var(--color-surface-alt)] animate-pulse" />
                                    ))}
                                </div>
                            ) : !studentDetailDrawer.history?.length ? (
                                <EmptyState
                                    icon={Archive}
                                    title="Belum Ada Histori"
                                    subtitle="Santri ini belum memiliki record raport yang tersimpan."
                                />
                            ) : (() => {
                                const history = studentDetailDrawer.history
                                const allAvgs = history.map(h => calcAvg(h.scores)).filter(Boolean).map(Number)
                                const bestAvg = allAvgs.length ? Math.max(...allAvgs) : null
                                const latest = history[history.length - 1]
                                return (
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-3 gap-3">
                                            <StatCard label="Total Record" value={history.length} icon={Table} color="indigo" />
                                            <StatCard label="Skor Tertinggi" value={bestAvg?.toFixed(1) ?? '—'} icon={TrendingUp} color="emerald" />
                                            <StatCard label="Bulan Terakhir" value={BULAN.find(b => b.id === latest?.month)?.id_str || '—'} icon={Calendar} color="amber" />
                                        </div>

                                        <div className="space-y-3">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Histori Bulanan</p>
                                            {[...history].reverse().map(h => {
                                                const avg = calcAvg(h.scores)
                                                const g = avg ? GRADE(Number(avg)) : null
                                                return (
                                                    <div key={`${h.year}-${h.month}`} className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] hover:border-indigo-500/30 transition-all">
                                                        <div className="flex items-center justify-between mb-4">
                                                            <div>
                                                                <p className="text-xs font-black text-[var(--color-text)]">{BULAN.find(b => b.id === h.month)?.id_str} {h.year}</p>
                                                                <p className="text-[10px] text-[var(--color-text-muted)] font-medium mt-0.5">Musyrif: {h.musyrif || '—'}</p>
                                                            </div>
                                                            {avg && g && (
                                                                <div className="text-right">
                                                                    <p className="text-sm font-black" style={{ color: g.uiColor }}>{avg}</p>
                                                                    <p className="text-[9px] font-black uppercase tracking-widest opacity-60" style={{ color: g.uiColor }}>{g.id}</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="grid grid-cols-5 gap-2">
                                                            {KRITERIA.map(k => {
                                                                const val = h.scores[k.key]
                                                                const scG = val !== null ? GRADE(Number(val)) : null
                                                                return (
                                                                    <div key={k.key} className="text-center">
                                                                        <p className="text-[8px] font-black uppercase text-[var(--color-text-muted)] mb-1">{k.id.slice(0, 3)}</p>
                                                                        <div className="h-8 rounded-lg flex items-center justify-center text-xs font-black border border-[var(--color-border)]" style={{ background: scG?.bg || 'var(--color-surface)', color: scG?.uiColor || 'var(--color-text-muted)' }}>
                                                                            {val ?? '—'}
                                                                        </div>
                                                                    </div>
                                                                )
                                                            })}
                                                        </div>
                                                        {h.catatan && (
                                                            <div className="mt-3 p-2.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[11px] text-[var(--color-text-muted)] leading-relaxed">
                                                                "{h.catatan}"
                                                            </div>
                                                        )}
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )
                            })()}
                        </div>
                    )}
                </Modal>

                {/* Save All Confirmation */}
                <Modal
                    isOpen={!!saveAllConfirm}
                    onClose={() => setSaveAllConfirm(null)}
                    title="Simpan Nilai?"
                    description="Beberapa data santri belum terisi lengkap"
                    icon={AlertTriangle}
                    iconBg="bg-emerald-500/10"
                    iconColor="text-emerald-600"
                    size="sm"
                    mobileVariant="bottom-sheet"
                    footer={saveAllConfirm && (
                        <div className="flex items-center w-full gap-3">
                            <button
                                type="button"
                                onClick={() => setSaveAllConfirm(null)}
                                className="h-10 px-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] text-[10px] font-black uppercase tracking-widest transition-all shrink-0"
                            >
                                Batal
                            </button>
                            <div className="flex-1" />
                            <button
                                type="button"
                                onClick={_doSaveAll}
                                className="h-10 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 shrink-0"
                            >
                                <Save className="w-3.5 h-3.5 opacity-70" />
                                Simpan yang Terisi
                            </button>
                        </div>
                    )}
                >
                    {saveAllConfirm && (
                        <div className="space-y-4 px-1">
                            <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20 text-[11px] text-amber-700 font-bold leading-relaxed">
                                <span className="font-black text-amber-800">Perhatian:</span> Ada <span className="font-black text-amber-900">{saveAllConfirm.incompleteCount} santri</span> yang nilainya belum lengkap di bulan ini.
                            </div>
                            <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed font-bold">
                                Anda tetap bisa menyimpan raport yang sudah terisi. Santri dengan nilai kosong akan tetap disimpan dengan status "Belum Lengkap" di database.
                            </p>
                        </div>
                    )}
                </Modal>

                {/* General Confirmation Modal */}
                <Modal
                    isOpen={!!confirmModal}
                    onClose={() => setConfirmModal(null)}
                    title={confirmModal?.title ?? 'Konfirmasi'}
                    description={confirmModal?.description}
                    icon={confirmModal?.icon}
                    iconBg={confirmModal?.iconBg}
                    iconColor={confirmModal?.iconColor}
                    size={confirmModal?.size ?? 'sm'}
                    mobileVariant="bottom-sheet"
                    footer={confirmModal && (
                        <div className="flex items-center w-full gap-3">
                            <button
                                type="button"
                                onClick={() => setConfirmModal(null)}
                                className="h-10 px-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] text-[10px] font-black uppercase tracking-widest transition-all shrink-0"
                            >
                                Batal
                            </button>
                            <div className="flex-1" />
                            <button
                                type="button"
                                onClick={() => {
                                    confirmModal.onConfirm()
                                    setConfirmModal(null)
                                }}
                                className={`h-10 px-6 rounded-xl text-white text-[10px] font-black uppercase tracking-widest shadow-lg transition-all flex items-center justify-center gap-2 shrink-0 ${confirmModal.variant === 'amber'
                                    ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20'
                                    : 'bg-red-500 hover:bg-red-600 shadow-red-500/20'
                                    }`}
                            >
                                {(() => { if (!confirmModal.confirmIcon) return null; const Icon = confirmModal.confirmIcon; return <Icon className="w-3.5 h-3.5 opacity-70" /> })()}
                                {confirmModal.confirmLabel ?? 'Lanjutkan'}
                            </button>
                        </div>
                    )}
                >
                    {confirmModal && (
                        <div className="px-1">
                            <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed font-bold">
                                {confirmModal.body}
                            </p>
                        </div>
                    )}
                </Modal>

                {/* ── FULLSCREEN DIGITAL PREVIEW ── */}
                {isFullScreenPreview && createPortal(
                    <div
                        className="fixed inset-0 z-[99999] bg-slate-400/80 p-2 sm:p-3"
                        onClick={() => setIsFullScreenPreview(false)}
                        onMouseMove={bumpFullScreenHud}
                        onWheel={bumpFullScreenHud}
                        onTouchStart={bumpFullScreenHud}
                    >
                        <div
                            className="relative h-full w-full rounded-[24px] overflow-hidden border border-slate-200/80 bg-[#e9edf5] shadow-2xl"
                            onClick={e => e.stopPropagation()}
                        >
                            <div
                                className={`absolute left-3 right-3 z-20 h-12 px-2 sm:px-3 rounded-2xl flex items-center justify-between border border-slate-200/80 bg-white/92 shadow-sm transition-all duration-200 ${showFullScreenHud ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'}`}
                                style={{ top: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}
                            >
                                <div className="flex items-center gap-2 min-w-0">
                                    <button
                                        onClick={() => setIsFullScreenPreview(false)}
                                        className="w-9 h-9 sm:w-8 sm:h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 transition-all flex items-center justify-center shrink-0"
                                        title="Tutup fullscreen"
                                    >
                                        <ArrowLeft className="w-3.5 h-3.5" />
                                    </button>
                                    <div className="min-w-0">
                                        <p className="text-slate-800 text-[11px] font-black truncate max-w-[140px] sm:max-w-xs">
                                            {fsStudent?.name || 'Preview'}
                                        </p>
                                        <p className="text-[8px] text-slate-400 font-bold uppercase tracking-[0.14em]">
                                            Digital Preview
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 border border-slate-200">
                                        <span className="text-[9px] font-black text-slate-500">SIZE {pageSize.toUpperCase()}</span>
                                        <span className="text-slate-300">|</span>
                                        <span className="text-[9px] font-black text-slate-500">LANG {lang.toUpperCase()}</span>
                                        <span className="text-slate-300">|</span>
                                        <span className="text-[9px] font-black text-slate-500">TTD {isArchiveMode ? 'BASAH' : signMode.toUpperCase()}</span>
                                    </div>
                                    {fsStudent && (
                                        <button
                                            disabled={generatingPdfIds.has(fsStudent.id)}
                                            onClick={() => handleDownloadPdf(fsStudent)}
                                            className="w-9 h-9 sm:w-8 sm:h-8 rounded-lg bg-indigo-50 hover:bg-indigo-100 disabled:bg-slate-100 text-indigo-600 disabled:text-slate-400 border border-indigo-200/50 flex items-center justify-center transition-all"
                                            title="Download PDF Raport"
                                        >
                                            {generatingPdfIds.has(fsStudent.id) ? (
                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            ) : (
                                                <Download className="w-3.5 h-3.5" />
                                            )}
                                        </button>
                                    )}
                                    <button
                                        onClick={() => openPrintWindow([fsStudent].filter(Boolean))}
                                        className="w-9 h-9 sm:w-8 sm:h-8 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white shadow-md shadow-indigo-500/30 flex items-center justify-center transition-all"
                                        title="Cetak Raport"
                                    >
                                        <Printer className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>

                            <div
                                ref={fullScreenScrollRef}
                                className="h-full overflow-auto flex flex-col items-center px-3 sm:px-6 pt-20 pb-20"
                                style={{
                                    scrollbarWidth: 'none',
                                    msOverflowStyle: 'none',
                                    backgroundColor: 'transparent',
                                }}
                                onTouchStart={e => {
                                    bumpFullScreenHud()
                                    if (e.touches.length === 2) {
                                        fullScreenPinchDistRef.current = Math.hypot(
                                            e.touches[0].clientX - e.touches[1].clientX,
                                            e.touches[0].clientY - e.touches[1].clientY
                                        )
                                        fullScreenPinchZoomRef.current = tempFullScreenZoomRef.current
                                    }
                                }}
                                onTouchMove={e => {
                                    bumpFullScreenHud()
                                    if (e.touches.length === 2 && fullScreenPinchDistRef.current) {
                                        e.preventDefault()
                                        const dist = Math.hypot(
                                            e.touches[0].clientX - e.touches[1].clientX,
                                            e.touches[0].clientY - e.touches[1].clientY
                                        )
                                        const ratio = dist / fullScreenPinchDistRef.current
                                        const newZoom = Math.min(2, Math.max(0.3, fullScreenPinchZoomRef.current * ratio))

                                        const naturalW = pageSize === 'f4' ? 812.6 : 793.7
                                        const naturalH = pageSize === 'f4' ? 1247 : 1122
                                        if (fullScreenOuterWrapperRef.current) {
                                            fullScreenOuterWrapperRef.current.style.width = `${naturalW * newZoom}px`
                                            fullScreenOuterWrapperRef.current.style.height = `${naturalH * newZoom}px`
                                        }
                                        if (fullScreenInnerWrapperRef.current) {
                                            fullScreenInnerWrapperRef.current.style.transform = `scale(${newZoom})`
                                        }
                                        if (fullScreenZoomLabelRef.current) {
                                            fullScreenZoomLabelRef.current.textContent = `${Math.round(newZoom * 100)}%`
                                        }
                                        tempFullScreenZoomRef.current = newZoom
                                    }
                                }}
                                onTouchEnd={() => {
                                    fullScreenPinchDistRef.current = null
                                    if (tempFullScreenZoomRef.current !== fullScreenZoom) {
                                        setFullScreenZoom(Math.floor(tempFullScreenZoomRef.current * 100) / 100)
                                    }
                                }}
                                onMouseMove={bumpFullScreenHud}
                                onWheel={bumpFullScreenHud}
                                onClick={bumpFullScreenHud}
                                onTouchEndCapture={() => {
                                    bumpFullScreenHud()
                                    if (!isMobileViewport) return
                                    const now = Date.now()
                                    const since = now - fullScreenLastTapRef.current
                                    fullScreenLastTapRef.current = now
                                    if (since > 0 && since < 320) {
                                        const fit = getFullScreenFitZoom(true)
                                        setFullScreenZoom(prev => (Math.abs(prev - fit) < 0.04 ? 1 : fit))
                                    }
                                }}
                            >
                                {(() => {
                                    const naturalW = pageSize === 'f4' ? 812.6 : 793.7
                                    const naturalH = pageSize === 'f4' ? 1247 : 1122
                                    const s = fullScreenZoom
                                    return (
                                        <div
                                            ref={fullScreenOuterWrapperRef}
                                            className="shrink-0"
                                            style={{
                                                width: `${naturalW * fullScreenZoom}px`,
                                                height: `${naturalH * fullScreenZoom}px`,
                                                borderRadius: '0px',
                                                overflow: 'hidden',
                                                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
                                            }}
                                        >
                                            <div
                                                ref={fullScreenInnerWrapperRef}
                                                style={{ width: `${naturalW}px`, transformOrigin: 'top left', transform: `scale(${fullScreenZoom})` }}
                                            >
                                                {fsStudent && (
                                                    <RaportPrintCard
                                                        student={fsStudent}
                                                        scores={fsScores}
                                                        extra={fsExtra}
                                                        bulanObj={fsBulan}
                                                        tahun={fsTahun}
                                                        musyrif={fsMus}
                                                        className={fsClass}
                                                        lang={lang}
                                                        settings={settings}
                                                        pageSize={pageSize}
                                                        catatanArab={fsCatatanArab}
                                                        studentIndex={fsStudentsList.findIndex(s => s.id === fsStudent?.id) + 1}
                                                        reportType={fsReportType}
                                                        selectedSemester={fsSemester}
                                                        academicYear={fsAcademicYear}
                                                        selectedClass={fsSelectedClass}
                                                        layoutConfig={layoutConfig}
                                                        signMode={isArchiveMode ? 'basah' : signMode}
                                                        signatures={isArchiveMode ? null : signatures}
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    )
                                })()}
                            </div>

                            <div
                                className={`absolute left-3 right-3 z-20 flex items-center justify-center transition-all duration-200 ${showFullScreenHud ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'}`}
                                style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}
                            >
                                <div className="max-w-full overflow-x-auto no-scrollbar">
                                    <div className="flex items-center gap-0.5 sm:gap-1 p-0.5 sm:p-1 rounded-2xl bg-white/92 backdrop-blur border border-slate-200 shadow-sm w-max mx-auto">
                                        <button
                                            onClick={() => setFullScreenZoom(p => Math.round(Math.max(0.3, p - 0.1) * 100) / 100)}
                                            className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl text-slate-500 hover:text-slate-700 hover:bg-white transition-all flex items-center justify-center"
                                        >
                                            <Search className="w-3 h-3" />
                                            <span className="text-[10px] font-black leading-none ml-0.5">-</span>
                                        </button>
                                        <button
                                            ref={fullScreenZoomLabelRef}
                                            onClick={() => {
                                                setFullScreenZoom(getFullScreenFitZoom(isMobileViewport))
                                            }}
                                            title="Fit ke lebar viewer"
                                            className="min-w-[52px] h-9 sm:min-w-[56px] sm:h-10 px-1.5 sm:px-2 rounded-lg sm:rounded-xl text-indigo-500 hover:text-indigo-700 hover:bg-indigo-500/10 transition-all text-[10px] sm:text-[11px] font-black tabular-nums"
                                        >
                                            {Math.round(fullScreenZoom * 100)}%
                                        </button>
                                        <button
                                            onClick={() => setFullScreenZoom(p => Math.round(Math.min(2.0, p + 0.1) * 100) / 100)}
                                            className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl text-slate-500 hover:text-slate-700 hover:bg-white transition-all flex items-center justify-center"
                                        >
                                            <Search className="w-3 h-3" />
                                            <span className="text-[10px] font-black leading-none ml-0.5">+</span>
                                        </button>
                                        <div className="w-px h-5 sm:h-6 bg-slate-300 mx-0.5 sm:mx-1" />
                                        <button
                                            onClick={() => {
                                                const idx = fsStudentsList.findIndex(s => s.id === (fsStudent?.id))
                                                if (idx > 0) setPreviewStudentId(fsStudentsList[idx - 1].id)
                                            }}
                                            disabled={!fsStudent || fsStudentsList.findIndex(s => s.id === fsStudent?.id) === 0}
                                            className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl text-slate-500 hover:text-slate-700 hover:bg-white transition-all flex items-center justify-center disabled:opacity-30"
                                        >
                                            <ChevronLeft className="w-3 h-3" />
                                        </button>
                                        <span className="min-w-[46px] sm:min-w-[54px] text-center text-[9px] sm:text-[10px] font-black text-slate-400 tabular-nums">
                                            {(fsStudentsList.findIndex(s => s.id === fsStudent?.id) + 1)}/{fsStudentsList.length}
                                        </span>
                                        <button
                                            onClick={() => {
                                                const idx = fsStudentsList.findIndex(s => s.id === (fsStudent?.id))
                                                if (idx < fsStudentsList.length - 1) setPreviewStudentId(fsStudentsList[idx + 1].id)
                                            }}
                                            disabled={!fsStudent || fsStudentsList.findIndex(s => s.id === fsStudent?.id) === fsStudentsList.length - 1}
                                            className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl text-slate-500 hover:text-slate-700 hover:bg-white transition-all flex items-center justify-center disabled:opacity-30"
                                        >
                                            <ChevronRight className="w-3 h-3" />
                                        </button>
                                        <div className="w-px h-5 sm:h-6 bg-slate-300 mx-0.5 sm:mx-1" />
                                        <button
                                            onClick={() => setIsFullScreenPreview(false)}
                                            className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all flex items-center justify-center"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}
                {showTemplatePreviewModal && (
                    <Modal
                        isOpen={showTemplatePreviewModal}
                        onClose={() => setShowTemplatePreviewModal(false)}
                        title="Perbandingan Template Bahasa Raport"
                        icon={Languages}
                        iconBg="bg-indigo-500/10"
                        iconColor="text-indigo-500"
                        description="Perbandingan hasil cetak PDF template bahasa Arab vs Indonesia."
                        size="lg"
                        footer={
                            <div className="flex justify-end w-full">
                                <button
                                    type="button"
                                    onClick={() => setShowTemplatePreviewModal(false)}
                                    className="h-10 px-6 rounded-xl bg-[var(--color-primary)] text-white text-xs font-black hover:opacity-90 transition-all shadow-md shadow-indigo-500/10"
                                >
                                    Pahami Perbedaan
                                </button>
                            </div>
                        }
                    >
                        <div className="space-y-6 p-1">

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Boarding Arab */}
                                <div className="p-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
                                            <MoonStar className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-black text-emerald-700">العربية (Boarding / Pondok)</h4>
                                            <p className="text-[9px] text-emerald-600/70 font-bold uppercase tracking-wider">Desain Khusus Kepesantrenan</p>
                                        </div>
                                    </div>

                                    <ul className="space-y-2.5 text-[11px] text-[var(--color-text)]">
                                        <li className="flex items-start gap-2">
                                            <Check className="text-emerald-500 w-3 h-3 mt-0.5" />
                                            <span><strong>Bahasa Pengantar:</strong> Seluruh nama kriteria, predikat, dan nilai dikonversi otomatis ke Bahasa Arab formal (Fusha).</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <Check className="text-emerald-500 w-3 h-3 mt-0.5" />
                                            <span><strong>Skema Nilai Arab:</strong> Angka 1-100 otomatis diubah ke teks predikat Arab (ممتاز, جيد جداً, جيد, مقبول).</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <Check className="text-emerald-500 w-3 h-3 mt-0.5" />
                                            <span><strong>Fokus Penilaian:</strong> Akhlak, kedisiplinan shalat jamaah, hafalan Al-Qur'an (Juz & Surah), serta kondisi fisik santri.</span>
                                        </li>
                                    </ul>
                                </div>

                                {/* Reguler Indonesia */}
                                <div className="p-5 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20">
                                            <School className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-black text-indigo-700">Indonesia (Sekolah / Reguler)</h4>
                                            <p className="text-[9px] text-indigo-600/70 font-bold uppercase tracking-wider">Desain Akademik Formal</p>
                                        </div>
                                    </div>

                                    <ul className="space-y-2.5 text-[11px] text-[var(--color-text)]">
                                        <li className="flex items-start gap-2">
                                            <Check className="text-indigo-500 w-3 h-3 mt-0.5" />
                                            <span><strong>Bahasa Pengantar:</strong> Seluruh kriteria, label, dan deskripsi menggunakan Bahasa Indonesia yang formal dan baku.</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <Check className="text-indigo-500 w-3 h-3 mt-0.5" />
                                            <span><strong>Skema Nilai Numerik:</strong> Nilai ditampilkan sebagai angka numerik standar (85, 92, dst.) lengkap dengan skala huruf (A, B, C, D).</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <Check className="text-indigo-500 w-3 h-3 mt-0.5" />
                                            <span><strong>Fokus Penilaian:</strong> Kinerja akademis mata pelajaran, perkembangan bakat umum, ekstra kurikuler, dan presensi kehadiran.</span>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </Modal>
                )}
            </div >
        </DashboardLayout >
    )
}