import React from 'react'
import { useState, useRef, useEffect, useCallback, memo, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { createRoot } from 'react-dom/client'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faArrowRightArrowLeft,
    faTimes,
    faLink,
    faCheck,
    faRocket,
    faLightbulb,
    faRotateLeft,
    faXmark,
    faUserTie,
    faInfoCircle,
    faSquareCheck,
    faTable,
    faThumbtack,
    faPlus,
    faSearch,
    faEdit,
    faTrash,
    faMars,
    faVenus,
    faDownload,
    faPen,
    faShieldHalved,
    faPenNib,
    faPaperPlane,
    faUpload,
    faUsers,
    faTrophy,
    faSpinner,
    faHistory,
    faQrcode,
    faIdCard,
    faArrowTrendUp,
    faArrowTrendDown,
    faCheckCircle,
    faGraduationCap,
    faCamera,
    faChevronLeft,
    faChevronRight,
    faAnglesLeft,
    faAnglesRight,
    faTriangleExclamation,
    faPrint,
    faSliders,
    faTableList,
    faSchool,
    faBullhorn,
    faArchive,
    faBoxArchive,
    faCrown,
    faCheckDouble,
    faFileLines,
    faImage,
    faBolt,
    faTags,
    faEye,
    faLayerGroup,
    faEyeSlash,
    faCircleExclamation,
    faKeyboard,
    faCircleInfo,
    faArrowRight,
    faArrowLeft,
    faSync,
    faRotate,
    faArrowUpFromBracket,
    faFileImport,
    faFileExport,
    faClipboardList,
    faSortAlphaDown,
    faArrowUp91,
    faDoorOpen,
    faLevelDownAlt,
    faChartPie,
    faClockRotateLeft
} from '@fortawesome/free-solid-svg-icons'
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons'
import { LIST_KAMAR } from '@utils/reports/raportConstants'

import DashboardLayout from '@core/layouts/DashboardLayout'
import {
    Breadcrumb,
    PageHeader,
    Modal,
    RichSelect,
    StatsCarousel,
    StatCard,
    EmptyState,
    Pagination
} from '@shared/components'
import { useToast, useFlag, useLanguage } from '@context'
import { supabase } from '@lib/supabase'
import mbsLogo from '@assets/images/logos/logo-mbs.png'
import { SortOptions, RiskThreshold, AvailableTags, getTagColor, calculateCompleteness, maskInfo, formatRelativeDate } from '@features/students/utils/studentsConstants'
import { useStudentsImportExport } from '@features/students/hooks/useStudentsImportExport'
import { generateStudentPDF as _generateStudentPDF, handlePrintThermal as _handlePrintThermal, handleSavePNG as _handleSavePNG } from '@features/students/utils/studentPdfUtils'
import { useStudentsCore } from '@features/students/hooks/useStudentsCore'
import StudentClassHistoryModal from '@features/students/components/StudentClassHistoryModal'
import { MobileListSkeleton, MobileCardSkeleton } from '@shared/components/Skeleton'

// NOTE(perf): library import/export di-load on-demand via dynamic import
// NOTE(perf): jsPDF/html2canvas/qrcode/autotable di-load on-demand via dynamic import

// FIX BOTTOM NAV Z-INDEX:
// Di DashboardLayout atau komponen BottomNav, pastikan z-index bottom nav
// lebih tinggi dari backdrop modal (z-[60]). Contoh:
//   <nav className="fixed bottom-0 z-[80] ...">
// Ini mencegah backdrop modal mencover bottom nav sehingga tap nav tetap berfungsi.

import StudentArchiveModal from '@features/students/components/StudentArchiveModal'
import StudentBulkPhotoModal from '@features/students/components/StudentBulkPhotoModal'
import StudentResetPointsModal from '@features/students/components/StudentResetPointsModal'
import StudentGSheetsModal from '@features/students/components/StudentGSheetsModal'
import StudentFormModal from '@features/students/components/StudentFormModal'
import StudentInlineAddRow from '@features/students/components/StudentInlineAddRow'
import { StudentRow, StudentMobileCard, StudentMobileListRow, StudentSkeletonRow, StudentSkeletonCard } from '@features/students/components/StudentRow'

const LazyQRCodeCanvas = React.lazy(() =>
    import('qrcode.react').then((m) => ({ default: m.QRCodeCanvas }))
)

const LazyStudentAccessCardModal = React.lazy(() =>
    import('@features/students/components/StudentAccessCardModal')
)
const LazyStudentProfileModal = React.lazy(() =>
    import('@features/students/components/StudentProfileModal')
)
const LazyStudentExportModal = React.lazy(() =>
    import('@features/students/components/StudentExportModal')
)
const LazyStudentImportModal = React.lazy(() =>
    import('@features/students/components/StudentImportModal')
)
const LazyStudentTagModal = React.lazy(() =>
    import('@features/students/components/StudentTagModal')
)





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
// State ketikan HARUS di komponen terpisah supaya keystroke tidak
// re-render seluruh StudentsPage (3000+ baris)
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
                placeholder="Cari nama, NISN..."
                className="input-field pl-10 w-full h-9 text-xs sm:text-sm bg-[var(--color-surface-alt)]/50 border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/10 transition-all rounded-xl font-bold placeholder:font-normal placeholder:opacity-40"
            />
        </div>
    )
})
DebouncedSearchInput.displayName = 'DebouncedSearchInput'

// --- REUSABLE UI HELPERS (Isolated to prevent lag) ---
const SelectedStudentsCarousel = memo(({
    selectedStudents,
    removingStudentId,
    setRemovingStudentId,
    toggleSelectStudent,
    isPromoteMode = false,
    bulkClassId = null,
    classesList = []
}) => {
    const [activeIdx, setActiveIdx] = useState(0);
    const scrollRef = useRef(null);

    const handleScroll = () => {
        const el = scrollRef.current;
        if (!el) return;
        const count = selectedStudents.length;
        if (count <= 1) return;
        const cardWidth = el.scrollWidth / count;
        const idx = Math.round(el.scrollLeft / cardWidth);
        const nextIdx = Math.min(idx, count - 1);
        if (nextIdx !== activeIdx) {
            setActiveIdx(nextIdx);
        }
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
                <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest flex items-center gap-2">
                    <FontAwesomeIcon icon={faUsers} className="opacity-40" /> Siswa Terpilih
                </label>
                <span className="text-[10px] font-black text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-2 py-0.5 rounded-full">{selectedStudents.length} Orang</span>
            </div>
            <div
                ref={scrollRef}
                onScroll={handleScroll}
                className="flex gap-2.5 overflow-x-auto pb-4 pt-2 px-1 custom-scrollbar -mx-1 snap-x snap-mandatory"
            >
                {selectedStudents.map(student => {
                    const isRemoving = removingStudentId === student.id;

                    // Default styles
                    let statusColor = 'border-[var(--color-border)] bg-[var(--color-surface)]';
                    let icon = faUserTie;
                    let iconColor = 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]';

                    // Promote specific logic
                    if (isPromoteMode && bulkClassId) {
                        const targetClass = classesList.find(cl => cl.id === bulkClassId);
                        const originLevel = parseInt(student.className) || 0;
                        const targetLevel = targetClass ? (parseInt(targetClass.name) || 0) : 0;

                        if (targetLevel < originLevel) {
                            statusColor = 'bg-red-50 border-red-200';
                            icon = faTriangleExclamation;
                            iconColor = 'bg-red-500 text-white shadow-lg shadow-red-500/20';
                        } else if (targetLevel === originLevel) {
                            statusColor = 'bg-amber-50 border-amber-200';
                            icon = faRotateLeft;
                            iconColor = 'bg-amber-500 text-white shadow-lg shadow-amber-500/20';
                        } else if (targetLevel > originLevel) {
                            statusColor = 'bg-indigo-50 border-indigo-200';
                            icon = faRocket;
                            iconColor = 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20';
                        }
                    }

                    return (
                        <button
                            key={student.id}
                            type="button"
                            onClick={() => {
                                setRemovingStudentId(student.id);
                                setTimeout(() => {
                                    toggleSelectStudent(student.id);
                                    setRemovingStudentId(null);
                                }, 300);
                            }}
                            className={`flex-shrink-0 flex items-center gap-2.5 p-2 rounded-xl border transition-all duration-300 min-w-[170px] shadow-sm text-left group relative snap-center ${statusColor} ${isRemoving ? 'opacity-0 scale-95 blur-md translate-y-2' : 'hover:border-[var(--color-primary)]/40 hover:shadow-md active:scale-95'}`}
                        >
                            <div className="flex items-center gap-2.5 w-full transition-all duration-300 group-hover:blur-[2px] group-hover:opacity-30">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black overflow-hidden shrink-0 transition-all duration-500 group-hover:rotate-6 ${iconColor}`}>
                                    {student.foto ? <img src={student.foto} alt="" className="w-full h-full object-cover" /> : (student.name?.charAt(0) || '?')}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-[10px] font-black text-[var(--color-text)] truncate leading-tight tracking-tight">{student.name}</p>
                                    <p className="text-[8px] truncate font-bold uppercase tracking-wider mt-0.5 flex items-center gap-1 text-[var(--color-text-muted)] opacity-60">
                                        <FontAwesomeIcon icon={isPromoteMode && bulkClassId ? icon : faUserTie} className="text-[7px]" />
                                        {student.className || 'Tanpa Kelas'}
                                    </p>
                                </div>
                            </div>
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 z-20">
                                <div className="w-7 h-7 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg shadow-red-500/40 scale-75 group-hover:scale-110 transition-transform duration-300">
                                    <FontAwesomeIcon icon={faXmark} className="text-[10px]" />
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>
            {selectedStudents.length > 1 && (
                <div className="flex justify-center gap-1.5 -mt-2 mb-2 sm:hidden">
                    {selectedStudents.slice(0, 10).map((_, i) => (
                        <div
                            key={i}
                            className={`rounded-full transition-all duration-300 ${activeIdx === i
                                ? 'w-5 h-1.5 bg-[var(--color-primary)]'
                                : 'w-1.5 h-1.5 bg-[var(--color-text-muted)]/30'
                                }`}
                        />
                    ))}
                    {selectedStudents.length > 10 && (
                        <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-text-muted)]/10" />
                    )}
                </div>
            )}
        </div>
    );
});


export default function StudentsPage() {
    const { addToast, addUndoToast } = useToast()
    const { dir } = useLanguage()
    const { enabled: canEdit } = useFlag('access.teacher_students')
    const navigateLocal = useNavigate()
    const [classSearchQuery, setClassSearchQuery] = useState('')
    const [removingStudentId, setRemovingStudentId] = useState(null)

    const core = useStudentsCore({ addToast, addUndoToast })

    // De-structure from core
    const {
        students, classesList, loading, globalStats, totalRows, fetchData, fetchStats,
        searchQuery, setSearchQuery, filterClass, setFilterClass, filterClasses, setFilterClasses,
        filterGender, setFilterGender, filterStatus, setFilterStatus, filterTag, setFilterTag,
        filterMissing, setFilterMissing, sortBy, setSortBy, filterPointMode, setFilterPointMode,
        filterPointMin, setFilterPointMin, filterPointMax, setFilterPointMax,
        showAdvancedFilter, setShowAdvancedFilter, debouncedSearch, activeFilterCount, resetAllFilters,
        isModalOpen, setIsModalOpen, isPrintModalOpen, setIsPrintModalOpen,
        activeModal, setActiveModal, isHeaderMenuOpen, setIsHeaderMenuOpen,
        isShortcutOpen, setIsShortcutOpen, photoZoom, setPhotoZoom,
        isPrivacyMode, setIsPrivacyMode, isAnyModalOpen,
        selectedStudent, setSelectedStudent, studentToDelete, setStudentToDelete,
        selectedStudentIds, setSelectedStudentIds, submitting, setSubmitting,
        newlyCreatedStudent, setNewlyCreatedStudent,
        bulkClassId, setBulkClassId, bulkTagAction, setBulkTagAction,
        bulkPointValue, setBulkPointValue, bulkPointLabel, setBulkPointLabel,
        bulkRoomId, setBulkRoomId,
        behaviorHistory, setBehaviorHistory, raportHistory, setRaportHistory,
        profileTab, setProfileTab, timelineFilter, setTimelineFilter,
        timelineVisible, setTimelineVisible, auditLogs, setAuditLogs, loadingAudit, setLoadingAudit,
        loadingHistory,
        handleSubmit, handleAdd, handleEdit, confirmDelete, executeDelete, closeModal,
        toggleSelectAll, toggleSelectStudent, handleBulkPromote, handleBulkDelete,
        handleBulkPointUpdate, handleBulkTagApply, handleBulkRoomAssign,
        fetchArchivedStudents, handleRestoreStudent, handlePermanentDelete, setArchivedStudents,
        fetchUsedTags, handleToggleTag, handleGlobalDeleteTag, handleGlobalRenameTag,
        fetchBehaviorHistory, fetchRaportHistory, handleViewProfile,
        handleResetPin, checkDuplicate, fetchAuditLog, fetchClassHistory, handleViewClassHistory,
        handleQuickPoint, handleInlineUpdate, handleTogglePin, handlePhotoUpload,
        handleInlineSubmit, handleViewQR, handleViewPrint, handleBulkWA, buildWAMessage, openWAForStudent, waTemplate,
        generateStudentPDF, handlePrintSingle, handlePrintThermal, handleSavePNG, handleBulkPrint,
        handleBulkPhotoMatch, handleBulkPhotoUpload, handleClassBreakdown, handleBatchResetPoints,
        // State Helpers
        tagToEdit, setTagToEdit, duplicateWarning,
        checkingDuplicate, gSheetsUrl, setGSheetsUrl, fetchingGSheets, setFetchingGSheets,
        page, setPage, pageSize, setPageSize, jumpPage, setJumpPage, generatingPdf,
        studentForTags, setStudentForTags, renameInput, setRenameInput,
        archivePage, setArchivePage, archivePageSize, setArchivePageSize, loadingRaport,
        allSelected, someSelected, lastReportMap,
        allUsedTags, tagStats, loadingArchived, archivedStudents, loadingClassHistory, classHistory,
        isInlineAddOpen, setIsInlineAddOpen, inlineForm, setInlineForm, submittingInline, setSubmittingInline,
        classBreakdownData, loadingBreakdown, resetPointsClassId, setResetPointsClassId, resettingPoints,
        resettingPin, uploadingPhoto, broadcastTemplate, setBroadcastTemplate, customWaMsg, setCustomWaMsg, broadcastIndex, setBroadcastIndex,
        formDataRef, importFileInputRef, photoInputRef, searchInputRef, headerMenuRef, shortcutRef, cardCaptureRef,
        selectedStudents, selectedStudentsWithPhone, selectedIdSet, generateCode, handleAddCustomTag,
        bulkPhotoMatches, uploadingBulkPhotos, setBulkPhotoMatches, allStudentsForBulk, matchingPhotos,
    } = core
    const { enabled: canImportCSV } = useFlag('students.import_csv')
    const { enabled: canImportGSheets } = useFlag('students.import_gsheets')
    const { enabled: canExport } = useFlag('students.export')
    const { enabled: canBulkPhoto } = useFlag('students.bulk_photo')
    const { enabled: canArchive } = useFlag('students.archive')
    const { enabled: canResetPoints } = useFlag('students.reset_points')
    const { enabled: canAddStudent } = useFlag('students.add')
    const { enabled: canEditStudent } = useFlag('students.edit')
    const { enabled: canDeleteStudent } = useFlag('students.delete')
    const { enabled: canShowStats } = useFlag('students.stats')
    const { enabled: canPrintCard } = useFlag('students.print_card')
    const { enabled: canPromote } = useFlag('students.promote')
    const { enabled: canBulkTag } = useFlag('students.bulk_tag')
    const { enabled: canPrivacyMode } = useFlag('students.privacy_mode')
    const { enabled: canAdvancedFilter } = useFlag('students.filters_advanced')
    const { enabled: canBulkRoom } = useFlag('students.bulk_room')
    const { enabled: canBulkPoint } = useFlag('students.bulk_point')

    // --- Enterprise Enforcement: Sync flags with state ---
    useEffect(() => {
        if (!canPrivacyMode && core.isPrivacyMode) {
            core.setIsPrivacyMode(false)
        }
    }, [canPrivacyMode, core.isPrivacyMode, core.setIsPrivacyMode])

    // --- Enterprise Logic: Data Fetching ---
    const statsScrollRef = useRef(null)
    const [activeStatIdx, setActiveStatIdx] = useState(0)



    // Import/Export Logic
    const importExport = useStudentsImportExport({
        students, classesList, fetchData, fetchStats, addToast, closeModal, importFileInputRef, generateCode,
        filterClasses, filterClass, filterGender, filterStatus, filterTag, filterMissing, debouncedSearch,
        filterPointMode, filterPointMin, filterPointMax, sortBy, selectedStudentIds, selectedStudents, gSheetsUrl,
        setFetchingGSheets, fetchingGSheets, profile: core.profile
    })

    const handleViewTags = useCallback((s) => {
        setStudentForTags(s)
        setActiveModal('tag')
    }, [setStudentForTags, setActiveModal])

    const {
        isImportModalOpen, setIsImportModalOpen, isExportModalOpen, setIsExportModalOpen,
        exportScope, setExportScope, exportColumns, setExportColumns,
        importFileName, setImportFileName, importPreview, setImportPreview,
        importIssues, setImportIssues, importing, setImporting,
        importProgress, setImportProgress, importStep, setImportStep,
        importRawData, setImportRawData, importFileHeaders, setImportFileHeaders,
        importColumnMapping, setImportColumnMapping, importDuplicates, setImportDuplicates,
        importSkipDupes, setImportSkipDupes, importDragOver, setImportDragOver,
        importValidationOpen, setImportValidationOpen, importLoading, setImportLoading,
        isRevalidating, setIsRevalidating, importEditCell, setImportEditCell,
        importCachedDBStudents, setImportCachedDBStudents, exporting, setExporting,
        importReadyRows, hasImportBlockingErrors, ALL_EXPORT_COLUMNS, SYSTEM_COLS,
        processImportFile, handleImportClick, handleFileChange, handleCommitImport,
        handleBulkFix, validateImportPreview, handleDownloadTemplate,
        handleExportCSV, handleExportExcel, handleExportPDF, handleFetchGSheets,
        fetchFilteredForExport, getExportData, importTab, setImportTab,
        downloadBlob, buildImportPreview, handleImportCellEdit, handleRemoveImportRow
    } = importExport

    const timelineFiltered = useMemo(() =>
        timelineFilter === 'pos' ? behaviorHistory.filter(i => (i.points ?? 0) > 0)
            : timelineFilter === 'neg' ? behaviorHistory.filter(i => (i.points ?? 0) < 0)
                : behaviorHistory
        , [behaviorHistory, timelineFilter])

    // UI States for Column Visibility
    const [visibleColumns, setVisibleColumns] = useState(() => {
        try {
            const saved = localStorage.getItem('students_visible_columns')
            if (saved) return JSON.parse(saved)
        } catch (err) { console.error('Error loading visible columns:', err) }
        return {
            gender: true,
            kelas: true,
            status: true,
            poin: true,
            last_report: false,
            profil: true,
            tags: true,
            aksi: true
        }
    })

    useEffect(() => {
        localStorage.setItem('students_visible_columns', JSON.stringify(visibleColumns))
    }, [visibleColumns])

    const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 768 : false)
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768)
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    const [mobileView, setMobileView] = useState(() => {
        try { return localStorage.getItem('students_mobile_view') || 'card' } catch { return 'card' }
    }) // 'card' | 'list'
    const [isViewTransitioning, setIsViewTransitioning] = useState(false)
    const [pendingView, setPendingView] = useState(mobileView)
    const viewTransitionTimer = useRef(null)

    const switchMobileView = useCallback((newView) => {
        if (newView === mobileView || isViewTransitioning) return
        setPendingView(newView) // instant button highlight
        setIsViewTransitioning(true)
        if (viewTransitionTimer.current) clearTimeout(viewTransitionTimer.current)
        viewTransitionTimer.current = setTimeout(() => {
            setMobileView(newView)
            try { localStorage.setItem('students_mobile_view', newView) } catch (e) { }
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    setIsViewTransitioning(false)
                })
            })
        }, 280)
    }, [mobileView, isViewTransitioning])

    // Stable callback for DebouncedSearchInput
    const handleSearchChange = useCallback((val) => setSearchQuery(val), [setSearchQuery])

    const quickAddRef = useRef(null)
    const [isColMenuOpen, setIsColMenuOpen] = useState(false)
    const [colMenuPos, setColMenuPos] = useState({ top: 0, left: 0 })
    const colMenuRef = useRef(null)

    // Sticky portal refs & rects for header menu + shortcut dropdowns
    const headerMenuBtnRef = useRef(null)
    const shortcutBtnRef = useRef(null)
    const [headerMenuRect, setHeaderMenuRect] = useState(null)
    const [shortcutRect, setShortcutRect] = useState(null)
    // Deferred unmount: keeps portal in DOM for 200ms after close so exit animation can play
    const [headerMenuMounted, setHeaderMenuMounted] = useState(false)
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

    const toggleColumn = (key) => setVisibleColumns(prev => ({
        ...prev,
        [key]: !prev[key]
    }))

    const timelineGroups = useMemo(() =>
        timelineFiltered.reduce((acc, item) => {
            const key = new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
            if (!acc[key]) acc[key] = []
            acc[key].push(item)
            return acc
        }, {})
        , [timelineFiltered])

    // ---- GLOBAL LISTENERS (Shortcuts & Click Outside) ----
    useEffect(() => {
        const handleGlobalKeyDown = (e) => {
            const isTyping = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)

            if (e.key === 'Escape') {
                if (isTyping) {
                    document.activeElement.blur()
                } else {
                    setIsColMenuOpen(false)
                    setIsHeaderMenuOpen(false)
                    setIsShortcutOpen(false)
                }
                return
            }

            if (isTyping) return

            const key = e.key.toLowerCase()

            if (e.ctrlKey && key === 'k') {
                e.preventDefault()
                searchInputRef.current?.focus()
            } else if (e.ctrlKey && key === 'f') {
                e.preventDefault()
                setShowAdvancedFilter(v => !v)
            } else if (key === 'n') {
                e.preventDefault()
                handleAdd()
            } else if (e.ctrlKey && key === 'a') {
                e.preventDefault()
                toggleSelectAll()
            } else if (e.ctrlKey && key === 'e') {
                e.preventDefault()
                setIsExportModalOpen(true)
            } else if (key === 'p') {
                setIsPrivacyMode(v => !v)
            } else if (key === 'r') {
                fetchData(); fetchStats()
            } else if (key === 'x') {
                resetAllFilters()
            } else if (e.key === '?') {
                setIsShortcutOpen(v => !v)
            }
        }

        const handleGlobalClick = (e) => {
            // Check if click is outside gear icon AND outside the portaled menu
            if (colMenuRef.current &&
                !colMenuRef.current.contains(e.target) &&
                !e.target.closest('#portal-column-menu')) {
                setIsColMenuOpen(false)
            }
        }

        window.addEventListener('keydown', handleGlobalKeyDown)
        document.addEventListener('mousedown', handleGlobalClick)
        document.addEventListener('touchstart', handleGlobalClick)

        return () => {
            window.removeEventListener('keydown', handleGlobalKeyDown)
            document.removeEventListener('mousedown', handleGlobalClick)
            document.removeEventListener('touchstart', handleGlobalClick)
        }
    }, [handleAdd, toggleSelectAll, setIsExportModalOpen, fetchData, fetchStats, resetAllFilters, setIsHeaderMenuOpen, setIsShortcutOpen, setIsPrivacyMode, setShowAdvancedFilter, setIsColMenuOpen])

    const timelineStats = useMemo(() => {
        const pos = behaviorHistory.filter(i => (i.points ?? 0) > 0)
        const neg = behaviorHistory.filter(i => (i.points ?? 0) < 0)
        const totalPos = pos.reduce((a, i) => a + (i.points ?? 0), 0)
        const totalNeg = neg.reduce((a, i) => a + (i.points ?? 0), 0)
        const thisMonth = new Date()
        const thisMonthCount = behaviorHistory.filter(i => {
            const d = new Date(i.created_at)
            return d.getMonth() === thisMonth.getMonth() && d.getFullYear() === thisMonth.getFullYear()
        }).length
        return { pos: pos.length, neg: neg.length, totalPos, totalNeg, thisMonthCount }
    }, [behaviorHistory])

    const navigate = navigateLocal;


    return (
        <DashboardLayout title="Data Siswa" hideHeader={isAnyModalOpen} hideSidebar={isAnyModalOpen}>
            <style>
                {isAnyModalOpen ? `
                    .top-nav, .sidebar, .floating-dock { display: none !important; }
                    main { padding-top: 0 !important; }
                ` : ''}
            </style>

            <div className="p-4 md:p-6 space-y-4 max-w-[1800px] mx-auto min-h-screen relative">


                {/* Read-only Banner */}
                {!canEdit && (
                    <div className="px-4 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-2">
                        <FontAwesomeIcon icon={faEyeSlash} className="text-rose-500 shrink-0 text-xs" />
                        <p className="text-[11px] font-bold text-rose-600">Mode Read-only —” Edit data siswa dinonaktifkan oleh administrator.</p>
                    </div>
                )}

                {/* Header */}
                <PageHeader
                    badge="Master Data"
                    breadcrumbs={['Student Directory']}
                    title="Data Siswa"
                    subtitle={`Kelola ${globalStats.total} data siswa aktif dalam sistem laporan.`}
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
                                    {canImportCSV && (
                                        <button onClick={() => { setIsHeaderMenuOpen(false); handleImportClick() }}
                                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--color-surface-alt)] text-[var(--color-text)] transition-all group">
                                            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                <FontAwesomeIcon icon={faFileImport} className="text-xs" />
                                            </div>
                                            <div className="text-left">
                                                <p className="text-[11px] font-black leading-tight">Import CSV / Excel</p>
                                                <p className="text-[9px] opacity-60 font-medium leading-tight mt-0.5">Unggah data murid masal dari file Excel/CSV</p>
                                            </div>
                                        </button>
                                    )}
                                    {canImportGSheets && (
                                        <button onClick={() => { setIsHeaderMenuOpen(false); setActiveModal('gsheets') }}
                                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--color-surface-alt)] text-[var(--color-text)] transition-all group">
                                            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                <FontAwesomeIcon icon={faLink} className="text-xs" />
                                            </div>
                                            <div className="text-left">
                                                <p className="text-[11px] font-black leading-tight">Import GSheets</p>
                                                <p className="text-[9px] opacity-60 font-medium leading-tight mt-0.5">Sinkronisasi data otomatis via Google Sheets</p>
                                            </div>
                                        </button>
                                    )}
                                    {canExport && (
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
                                    )}
                                    {canBulkPhoto && (
                                        <button onClick={() => { setIsHeaderMenuOpen(false); setActiveModal('bulkPhoto') }}
                                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--color-surface-alt)] text-[var(--text-color)] transition-all group">
                                            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                <FontAwesomeIcon icon={faCamera} className="text-xs" />
                                            </div>
                                            <div className="text-left">
                                                <p className="text-[11px] font-black leading-tight">Bulk Foto</p>
                                                <p className="text-[9px] opacity-60 font-medium leading-tight mt-0.5">Update foto siswa secara masal via NISN</p>
                                            </div>
                                        </button>
                                    )}

                                    {(canArchive || canResetPoints) && <div className="h-px bg-[var(--color-border)] my-1 mx-2" />}
                                    {(canArchive || canResetPoints) && <p className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Manajemen</p>}

                                    {canArchive && (
                                        <button onClick={() => { setIsHeaderMenuOpen(false); fetchArchivedStudents(); setActiveModal('archived') }}
                                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--color-surface-alt)] text-[var(--color-text)] transition-all group">
                                            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                <FontAwesomeIcon icon={faBoxArchive} className="text-xs" />
                                            </div>
                                            <div className="text-left">
                                                <p className="text-[11px] font-black leading-tight">Arsip Siswa</p>
                                                <p className="text-[9px] opacity-60 font-medium leading-tight mt-0.5">Lihat & pulihkan data siswa tidak aktif</p>
                                            </div>
                                        </button>
                                    )}
                                    {canResetPoints && (
                                        <button
                                            onClick={() => { setResetPointsClassId(''); setActiveModal('resetPoints'); setIsHeaderMenuOpen(false); }}
                                            disabled={!canEdit}
                                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[var(--color-text)] transition-all group ${!canEdit ? 'opacity-40 cursor-not-allowed' : 'hover:bg-[var(--color-surface-alt)]'}`}
                                        >
                                            <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                <FontAwesomeIcon icon={faRotateLeft} className="text-xs" />
                                            </div>
                                            <div className="text-left">
                                                <p className="text-[11px] font-black leading-tight">Reset Poin</p>
                                                <p className="text-[9px] opacity-60 font-medium leading-tight mt-0.5">Bersihkan semua poin untuk semester baru</p>
                                            </div>
                                        </button>
                                    )}
                                </div>
                            </>,
                            getPortalContainer('portal-header-menu')
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
                                            { keys: ['N'], label: 'Tambah siswa baru' },
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
                            getPortalContainer('portal-shortcut-menu')
                        )}

                        <input
                            type="file"
                            ref={importFileInputRef}
                            onChange={handleFileChange}
                            className="hidden"
                            accept=".csv,.xlsx"
                        />

                        {canPrivacyMode && (
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
                        )}

                        {canAddStudent && (
                            <button
                                onClick={handleAdd}
                                disabled={!canEdit}
                                className="h-9 px-4 sm:px-5 rounded-xl bg-[var(--color-primary)] text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-95 shadow-md shadow-[var(--color-primary)]/20 disabled:opacity-40 disabled:cursor-not-allowed border border-white/10"
                            >
                                <FontAwesomeIcon icon={faPlus} className="text-[10px]" />
                                <span>{canEdit ? 'Tambah Siswa' : 'Read-only'}</span>
                            </button>
                        )}
                        </>
                    }
                />

                {/* Stats Row Wrapper */}
                {canShowStats && (
                    <StatsCarousel count={4} cols={4}>
                        <StatCard
                            key="total"
                            icon={faUsers}
                            label="Total Siswa"
                            value={globalStats.total}
                            subValue="Siswa aktif terdaftar"
                            color="sky"
                        />
                        <StatCard
                            key="boys"
                            icon={faMars}
                            label="Putra"
                            value={globalStats.boys}
                            subValue={`${Math.round((globalStats.boys / (globalStats.total || 1)) * 100)}% dari total siswa`}
                            color="indigo"
                        />
                        <StatCard
                            key="girls"
                            icon={faVenus}
                            label="Putri"
                            value={globalStats.girls}
                            subValue={`${Math.round((globalStats.girls / (globalStats.total || 1)) * 100)}% dari total siswa`}
                            color="rose"
                        />
                        <StatCard
                            key="points"
                            icon={faTrophy}
                            label="Rata-rata Poin"
                            value={globalStats.avgPoints}
                            trend={globalStats.avgPointsLastWeek !== null ? Math.abs(globalStats.avgPointsLastWeek) : null}
                            trendUp={globalStats.avgPointsLastWeek >= 0}
                            subValue="Rata-rata poin per siswa"
                            color="emerald"
                            onClick={() => { setFilterPointMode('positive'); resetAllFilters({ filterPointMode: 'positive' }) }}
                        />
                    </StatsCarousel>
                )}

                {/*  INSIGHT ROW */}
                {(globalStats.risk > 0 || globalStats.incompleteCount > 0 || globalStats.topPerformer || (globalStats.worstClass && globalStats.worstClass.avg < 0) || globalStats.avgPointsLastWeek !== null) && (
                    <div className="flex overflow-x-auto scrollbar-hide gap-2 mb-6 animate-in fade-in slide-in-from-top-1 duration-500 pb-1">

                        {/* Siswa berisiko */}
                        {globalStats.risk > 0 && (
                            <button
                                onClick={() => { setFilterPointMode(filterPointMode === 'risk' ? '' : 'risk'); setShowAdvancedFilter(true) }}
                                className={`flex items-center gap-3 px-3 py-2 rounded-xl border transition-all hover:scale-[1.02] active:scale-95 shrink-0 ${filterPointMode === 'risk' ? 'border-red-500 bg-red-500/5 ring-1 ring-red-500' : 'bg-red-500/[0.08] border-red-500/20 hover:bg-red-500/[0.15] text-red-600'}`}
                            >
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${filterPointMode === 'risk' ? 'bg-red-500 text-white' : 'bg-red-500/15'}`}>
                                    <FontAwesomeIcon icon={faTriangleExclamation} className="text-[10px]" />
                                </div>
                                <div className="text-left whitespace-nowrap">
                                    <p className="text-[10px] font-black leading-none">{globalStats.risk} Berisiko</p>
                                    <p className="text-[9px] text-[var(--color-text-muted)] font-bold mt-0.5">Poin rendah</p>
                                </div>
                            </button>
                        )}

                        {/* Data tidak lengkap */}
                        {globalStats.incompleteCount > 0 && (
                            <button
                                onClick={() => { setFilterMissing(filterMissing === 'all' ? '' : 'all'); setShowAdvancedFilter(true) }}
                                className={`flex items-center gap-3 px-3 py-2 rounded-xl border transition-all hover:scale-[1.02] active:scale-95 shrink-0 ${filterMissing === 'all' ? 'border-amber-500 bg-amber-500/5 ring-1 ring-amber-500' : 'bg-amber-500/[0.08] border-amber-500/20 hover:bg-amber-500/[0.15]'}`}
                            >
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${filterMissing === 'all' ? 'bg-amber-500 text-white' : 'bg-amber-500/15'}`}>
                                    <FontAwesomeIcon icon={faCircleExclamation} className="text-amber-500 text-[10px]" />
                                </div>
                                <div className="text-left whitespace-nowrap">
                                    <p className={`text-[10px] font-black leading-none ${filterMissing === 'photo' ? 'text-amber-600' : 'text-amber-600 dark:text-amber-400'}`}>{globalStats.incompleteCount} Tidak Lengkap</p>
                                    <p className="text-[9px] text-[var(--color-text-muted)] font-bold mt-0.5">Foto / NISN / Whatsapp</p>
                                </div>
                            </button>
                        )}

                        {/* Tren poin minggu ini */}
                        {globalStats.avgPointsLastWeek !== null && (
                            <div className={`flex items-center gap-3 px-3 py-2 rounded-xl border transition-all shrink-0 ${globalStats.avgPointsLastWeek >= 0 ? 'bg-emerald-500/[0.08] border-emerald-500/20' : 'bg-red-500/[0.08] border-red-500/20'}`}>
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${globalStats.avgPointsLastWeek >= 0 ? 'bg-emerald-500/15' : 'bg-red-500/15'}`}>
                                    <FontAwesomeIcon icon={globalStats.avgPointsLastWeek >= 0 ? faArrowTrendUp : faArrowTrendDown} className={`text-[10px] ${globalStats.avgPointsLastWeek >= 0 ? 'text-emerald-500' : 'text-red-500'}`} />
                                </div>
                                <div className="text-left whitespace-nowrap">
                                    <p className={`text-[10px] font-black leading-none ${globalStats.avgPointsLastWeek >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                                        Tren {globalStats.avgPointsLastWeek >= 0 ? '▲' : '▼'} {globalStats.avgPointsLastWeek > 0 ? '+' : ''}{globalStats.avgPointsLastWeek} / siswa
                                    </p>
                                    <p className="text-[9px] text-[var(--color-text-muted)] font-bold mt-0.5">Delta 7 hari</p>
                                </div>
                            </div>
                        )}

                        {/* Top performer */}
                        {globalStats.topPerformer && (
                            <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-indigo-500/[0.08] border border-indigo-500/20 transition-all shrink-0">
                                <div className="w-7 h-7 rounded-lg bg-indigo-500/15 flex items-center justify-center shrink-0">
                                    <FontAwesomeIcon icon={faCrown} className="text-indigo-500 text-[10px]" />
                                </div>
                                <div className="text-left whitespace-nowrap">
                                    <p className="text-[10px] font-black text-indigo-500 leading-none truncate max-w-[140px]">{globalStats.topPerformer.name}</p>
                                    <p className="text-[9px] text-[var(--color-text-muted)] font-bold mt-0.5">Top Performer Â· +{globalStats.topPerformer.points}</p>
                                </div>
                            </div>
                        )}

                        {/* Kelas rata-rata terendah */}
                        {globalStats.worstClass && globalStats.worstClass.avg < 0 && (
                            <button
                                onClick={() => { setFilterClass(globalStats.worstClass.id); setFilterClasses([]); setPage(1); setShowAdvancedFilter(true) }}
                                className={`flex items-center gap-3 px-3 py-2 rounded-xl border transition-all hover:scale-[1.02] active:scale-95 shrink-0 ${filterClass === globalStats.worstClass.id ? 'border-orange-500 bg-orange-500/5 ring-1 ring-orange-500' : 'bg-orange-500/[0.08] border-orange-500/20 hover:bg-orange-500/[0.15]'}`}
                            >
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${filterClass === globalStats.worstClass.id ? 'bg-orange-500 text-white' : 'bg-orange-500/15'}`}>
                                    <FontAwesomeIcon icon={faSchool} className="text-orange-500 text-[10px]" />
                                </div>
                                <div className="text-left whitespace-nowrap">
                                    <p className={`text-[10px] font-black leading-none truncate max-w-[140px] ${filterClass === globalStats.worstClass.id ? 'text-orange-600' : 'text-orange-600 dark:text-orange-400'}`}>{globalStats.worstClass.name}</p>
                                    <p className="text-[9px] text-[var(--color-text-muted)] font-bold mt-0.5">Rata terendah ({globalStats.worstClass.avg})</p>
                                </div>
                            </button>
                        )}

                    </div>
                )}
                {/* ———————————————————————————————————— END INSIGHT ROW ———————————————————————————————————— */}

                {/* Filters & Sort */}
                <div className="glass rounded-[1.5rem] mb-4 border border-[var(--color-border)] overflow-hidden">

                    {/* Row 1: Search + Quick Filters + Action Buttons */}
                    <div className="flex items-center gap-2 p-2.5 lg:p-3">
                        {/* Search Bar - Dynamic & Responsive */}
                        <div className="flex-initial w-full lg:w-[232px] xl:w-[352px] min-w-[120px] transition-all duration-300">
                            <DebouncedSearchInput
                                searchQuery={searchQuery}
                                onSearch={handleSearchChange}
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
                                    { id: '', label: 'Semua', icon: faUsers },
                                    { id: 'aktif', label: 'Aktif', icon: faCheckCircle },
                                    { id: 'lulus', label: 'Lulus', icon: faGraduationCap },
                                ].map((s) => (
                                    <button
                                        key={s.id}
                                        onClick={() => setFilterStatus(s.id)}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border ${filterStatus === s.id
                                            ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white'
                                            : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)]/30 hover:bg-[var(--color-primary)]/5 hover:text-[var(--color-primary)]'
                                            }`}
                                    >
                                        <FontAwesomeIcon icon={s.icon} className={`text-[10px] ${filterStatus === s.id ? 'opacity-100' : 'opacity-30'}`} />
                                        {s.label}
                                    </button>
                                ))}
                            </div>

                            {/* Separator */}
                            <div className="h-4 w-px bg-[var(--color-border)] mx-1 shrink-0" />

                            {/* Group 2: Gender */}
                            <div className="flex items-center gap-1.5 shrink-0">
                                {[
                                    { id: 'L', label: 'Putra', icon: faMars, activeCls: 'bg-blue-500 border-blue-500' },
                                    { id: 'P', label: 'Putri', icon: faVenus, activeCls: 'bg-pink-500 border-pink-500' },
                                ].map((g) => (
                                    <button
                                        key={g.id}
                                        onClick={() => setFilterGender(filterGender === g.id ? '' : g.id)}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border ${filterGender === g.id
                                            ? `${g.activeCls} text-white`
                                            : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)]/30 hover:bg-[var(--color-primary)]/5 hover:text-[var(--color-primary)]'
                                            }`}
                                    >
                                        <FontAwesomeIcon icon={g.icon} className={`text-[10px] ${filterGender === g.id ? 'opacity-100' : 'opacity-30'}`} />
                                        {g.label}
                                    </button>
                                ))}
                            </div>
                            {/* Group 3: Quick Sort */}
                            <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                    onClick={() => setSortBy(sortBy === 'name' ? '-name' : 'name')}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border ${sortBy.includes('name')
                                        ? 'bg-amber-500 border-amber-500 text-white'
                                        : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-amber-500/30 hover:bg-amber-500/5 hover:text-amber-600'
                                        }`}
                                >
                                    <FontAwesomeIcon icon={faSortAlphaDown} className={`text-[10px] ${sortBy.includes('name') ? 'opacity-100' : 'opacity-30'}`} />
                                    Nama {sortBy === 'name' ? 'A-Z' : 'Z-A'}
                                </button>
                                <button
                                    onClick={() => setSortBy(sortBy === '-points' ? 'points' : '-points')}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border ${sortBy.includes('points')
                                        ? 'bg-emerald-500 border-emerald-500 text-white'
                                        : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-emerald-500/30 hover:bg-emerald-500/5 hover:text-emerald-600'
                                        }`}
                                >
                                    <FontAwesomeIcon icon={faArrowUp91} className={`text-[10px] ${sortBy.includes('points') ? 'opacity-100' : 'opacity-30'}`} />
                                    {sortBy === '-points' ? 'Poin Tertinggi' : 'Poin Terendah'}
                                </button>
                            </div>
                        </div>


                        {/* Dedicated Divider for Enterprise Look */}
                        <div className="hidden lg:block w-px h-4 bg-[var(--color-border)] mx-2 shrink-0" />

                        {/* Action Buttons: Always visible, grouped nicely on mobile */}
                        <div className="flex items-center justify-end gap-2 shrink-0 lg:ml-auto">
                            <button
                                onClick={toggleSelectAll}
                                className={`h-9 px-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 ${selectedStudentIds.length > 0 ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]'} `}
                                title="Pilih Semua / Batal"
                            >
                                <FontAwesomeIcon icon={selectedStudentIds.length > 0 ? faCheckDouble : faSquareCheck} />
                                <span className="hidden xs:inline">{selectedStudentIds.length > 0 ? 'Terpilih' : 'Pilih'}</span>
                                {selectedStudentIds.length > 0 && (
                                    <span className="w-4 h-4 rounded-full bg-white/20 text-white text-[9px] font-black flex items-center justify-center">
                                        {selectedStudentIds.length}
                                    </span>
                                )}
                            </button>

                            {canAdvancedFilter && (
                                <button
                                    onClick={() => setShowAdvancedFilter(!showAdvancedFilter)}
                                    className={`h-9 px-3 sm:px-4 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 ${showAdvancedFilter || activeFilterCount > 0 ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white shadow-md shadow-[var(--color-primary)]/30' : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]'} `}
                                >
                                    <FontAwesomeIcon icon={faSliders} />
                                    <span className="hidden xs:inline">Lainnya</span>
                                    {activeFilterCount > 0 && (
                                        <span className="w-4 h-4 rounded-full bg-white/30 text-white text-[9px] font-black flex items-center justify-center">
                                            {activeFilterCount}
                                        </span>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>


                    {/* Active Filter Chips */}
                    {(searchQuery || filterClass || filterGender || filterStatus || filterTag || filterMissing || filterPointMode) && (
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
                                {filterClass && (
                                    <button type="button" onClick={() => { setFilterClass(''); setFilterClasses([]) }}
                                        className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/5 text-[10px] font-black text-[var(--color-primary)]" title="Hapus filter kelas">
                                        <FontAwesomeIcon icon={faSchool} className="text-[10px] opacity-70" />
                                        {classesList.find(c => c.id === filterClass)?.name || 'Kelas'}
                                        <span className="w-5 h-5 rounded-lg bg-white/70 dark:bg-[var(--color-surface)] border border-[var(--color-primary)]/20 flex items-center justify-center text-[var(--color-primary)] opacity-70 group-hover:opacity-100 transition-opacity">
                                            <FontAwesomeIcon icon={faXmark} className="text-[10px]" />
                                        </span>
                                    </button>
                                )}
                                {filterGender && (
                                    <button type="button" onClick={() => setFilterGender('')}
                                        className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/40 text-[10px] font-black text-[var(--color-text)]" title="Hapus filter gender">
                                        <FontAwesomeIcon icon={filterGender === 'L' ? faMars : faVenus} className="text-[10px] opacity-70" />
                                        Gender: {filterGender === 'L' ? 'Putra' : 'Putri'}
                                        <span className="w-5 h-5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)] group-hover:text-red-500 transition-colors">
                                            <FontAwesomeIcon icon={faXmark} className="text-[10px]" />
                                        </span>
                                    </button>
                                )}
                                {filterStatus && (
                                    <button type="button" onClick={() => setFilterStatus('')}
                                        className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-amber-500/20 bg-amber-500/10 text-[10px] font-black text-amber-600" title="Hapus filter status">
                                        Status: {(filterStatus?.charAt(0).toUpperCase() || '') + (filterStatus?.slice(1) || '')}
                                        <span className="w-5 h-5 rounded-lg bg-white/70 dark:bg-[var(--color-surface)] border border-amber-500/20 flex items-center justify-center text-amber-600 opacity-70 group-hover:opacity-100 transition-opacity">
                                            <FontAwesomeIcon icon={faXmark} className="text-[10px]" />
                                        </span>
                                    </button>
                                )}
                                {filterTag && (
                                    <button type="button" onClick={() => setFilterTag('')}
                                        className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-indigo-500/20 bg-indigo-500/10 text-[10px] font-black text-indigo-600" title="Hapus filter label">
                                        <FontAwesomeIcon icon={faTags} className="text-[10px] opacity-70" />
                                        {filterTag}
                                        <span className="w-5 h-5 rounded-lg bg-white/70 dark:bg-[var(--color-surface)] border border-indigo-500/20 flex items-center justify-center text-indigo-600 opacity-70 group-hover:opacity-100 transition-opacity">
                                            <FontAwesomeIcon icon={faXmark} className="text-[10px]" />
                                        </span>
                                    </button>
                                )}
                                {filterMissing && (
                                    <button type="button" onClick={() => setFilterMissing('')}
                                        className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-orange-500/20 bg-orange-500/10 text-[10px] font-black text-orange-600" title="Hapus filter data hilang">
                                        {filterMissing === 'photo' ? 'Foto Kosong' : filterMissing === 'wa' ? 'Tanpa WA' : filterMissing === 'all' ? 'Data Tidak Lengkap' : filterMissing}
                                        <span className="w-5 h-5 rounded-lg bg-white/70 dark:bg-[var(--color-surface)] border border-orange-500/20 flex items-center justify-center text-orange-600 opacity-70 group-hover:opacity-100 transition-opacity">
                                            <FontAwesomeIcon icon={faXmark} className="text-[10px]" />
                                        </span>
                                    </button>
                                )}
                                {filterPointMode && (
                                    <button type="button" onClick={() => { setFilterPointMode(''); setFilterPointMin(''); setFilterPointMax('') }}
                                        className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-[10px] font-black text-emerald-600" title="Hapus filter poin">
                                        Poin: {filterPointMode === 'risk' ? 'Risiko' : filterPointMode === 'positive' ? 'Positif' : filterPointMode === 'custom' ? `${filterPointMin || '∞'}—${filterPointMax || '∞'}` : filterPointMode}
                                        <span className="w-5 h-5 rounded-lg bg-white/70 dark:bg-[var(--color-surface)] border border-emerald-500/20 flex items-center justify-center text-emerald-600 opacity-70 group-hover:opacity-100 transition-opacity">
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

                    {/* Row 2: Expandable filter panel */}
                    {showAdvancedFilter && (
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

                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-x-3 gap-y-3 mb-3">
                                {/* Kelas */}
                                <div>
                                    <label className="block text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1">Kelas</label>
                                    <RichSelect
                                        value={filterClass}
                                        onChange={(val) => { setFilterClass(val); setFilterClasses([]); setPage(1) }}
                                        options={classesList.map(c => ({ id: c.id, name: c.name }))}
                                        placeholder="Semua Kelas"
                                        small
                                        searchable
                                    />
                                </div>

                                {/* Gender */}
                                <div>
                                    <label className="block text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1">Gender</label>
                                    <RichSelect
                                        value={filterGender}
                                        onChange={(val) => { setFilterGender(val); setPage(1) }}
                                        options={[
                                            { id: '', name: 'Semua' },
                                            { id: 'L', name: 'Putra' },
                                            { id: 'P', name: 'Putri' },
                                        ]}
                                        placeholder="Semua"
                                        small
                                    />
                                </div>

                                {/* Status */}
                                <div>
                                    <label className="block text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1">Status</label>
                                    <RichSelect
                                        value={filterStatus}
                                        onChange={(val) => { setFilterStatus(val); setPage(1) }}
                                        options={[
                                            { id: '', name: 'Semua Status' },
                                            { id: 'aktif', name: 'Aktif' },
                                            { id: 'lulus', name: 'Lulus' },
                                            { id: 'pindah', name: 'Pindah' },
                                            { id: 'keluar', name: 'Keluar' },
                                        ]}
                                        placeholder="Semua Status"
                                        small
                                    />
                                </div>

                                {/* Label/Tag */}
                                <div>
                                    <label className="block text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1">Label</label>
                                    <RichSelect
                                        value={filterTag}
                                        onChange={(val) => { setFilterTag(val); setPage(1) }}
                                        options={Array.from(new Set([...AvailableTags, ...allUsedTags])).sort().map(t => ({ id: t, name: t }))}
                                        placeholder="Semua Label"
                                        small
                                        searchable
                                    />
                                </div>

                                {/* Urutkan */}
                                <div className="col-span-1">
                                    <label className="block text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1">Urutkan</label>
                                    <RichSelect
                                        value={sortBy}
                                        onChange={(val) => setSortBy(val)}
                                        options={SortOptions.map(opt => ({ id: opt.value, name: opt.label }))}
                                        small
                                    />
                                </div>

                                {/* Custom Poin Range */}
                                <div className="col-span-1">
                                    <label className="block text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1">Rentang Poin (Min - Max)</label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            value={filterPointMin}
                                            onChange={(e) => { setFilterPointMin(e.target.value); setFilterPointMode(e.target.value || filterPointMax ? 'custom' : ''); setPage(1) }}
                                            placeholder="Min"
                                            className="input-field h-8 sm:h-9 text-[11px] sm:text-xs w-full rounded-lg sm:rounded-xl border-[var(--color-border)] bg-[var(--color-surface)] focus:border-[var(--color-primary)] px-2.5"
                                        />
                                        <span className="text-[10px] text-[var(--color-text-muted)] font-black">-</span>
                                        <input
                                            type="number"
                                            value={filterPointMax}
                                            onChange={(e) => { setFilterPointMax(e.target.value); setFilterPointMode(filterPointMin || e.target.value ? 'custom' : ''); setPage(1) }}
                                            placeholder="Max"
                                            className="input-field h-8 sm:h-9 text-[11px] sm:text-xs w-full rounded-lg sm:rounded-xl border-[var(--color-border)] bg-[var(--color-surface)] focus:border-[var(--color-primary)] px-2.5"
                                        />
                                    </div>
                                </div>

                                {/* Preset Poin - Inline with Rentang */}
                                <div className="col-span-2 lg:col-span-1">
                                    <label className="block text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1">Preset Poin</label>
                                    <div className="flex items-center gap-1.5">
                                        {[
                                            { value: '', label: 'Semua', icon: null },
                                            { value: 'risk', label: 'Risiko', icon: faTriangleExclamation },
                                            { value: 'positive', label: 'Positif', icon: faCheck },
                                        ].map(opt => (
                                            <button key={opt.value} type="button"
                                                onClick={() => { setFilterPointMode(opt.value); setFilterPointMin(''); setFilterPointMax(''); setPage(1) }}
                                                className={`h-8 px-2.5 rounded-lg text-[9px] font-black uppercase border transition-all flex items-center justify-center gap-1.5 shrink-0 ${filterPointMode === opt.value && opt.value !== '' ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-sm' : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] bg-[var(--color-surface)]'}`}
                                            >
                                                {opt.icon && <FontAwesomeIcon icon={opt.icon} className="text-[9px]" />}
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Desktop Only: Quick Menu & Actions Relocation */}
                                <div className="hidden lg:block lg:col-span-3 pl-4 ml-4 border-l border-[var(--color-border)]/30">
                                    <label className="block text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1">Menu Cepat & Aksi</label>
                                    <div className="flex items-center justify-between">
                                        <div className="flex flex-wrap items-center gap-1.5">
                                            {[
                                                { label: 'Semua', icon: faUsers, active: !filterMissing && sortBy !== 'created_at' && sortBy !== 'total_points_desc', onClick: () => { setFilterMissing(''); setSortBy('name_asc'); } },
                                                { label: 'Foto Kosong', icon: faImage, active: filterMissing === 'photo', onClick: () => { setFilterMissing('photo'); setPage(1); } },
                                                { label: 'Tanpa WA', icon: faWhatsapp, active: filterMissing === 'wa', onClick: () => { setFilterMissing('wa'); setPage(1); } },
                                                { label: 'Top Performer', icon: faTrophy, active: sortBy === 'total_points_desc', onClick: () => { setSortBy('total_points_desc'); setPage(1); } },
                                                { label: 'Siswa Baru', icon: faPlus, active: sortBy === 'created_at', onClick: () => { setSortBy('created_at'); setPage(1); } },
                                            ].map((s, i) => (
                                                <button key={i} onClick={s.onClick}
                                                    className={`h-8 px-2.5 rounded-lg border flex items-center gap-2 transition-all ${s.active ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-sm' : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]'}`}>
                                                    <FontAwesomeIcon icon={s.icon} className="text-[9px]" />
                                                    <span className="text-[9px] font-black uppercase tracking-widest whitespace-nowrap">{s.label}</span>
                                                </button>
                                            ))}
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {activeFilterCount > 0 && (
                                                <button
                                                    onClick={async () => {
                                                        try {
                                                            const XLSX = await import('xlsx')
                                                            const rows = await fetchFilteredForExport()
                                                            const ws = XLSX.utils.json_to_sheet(rows)
                                                            const wb = XLSX.utils.book_new()
                                                            XLSX.utils.book_append_sheet(wb, ws, 'Filter')
                                                            const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
                                                            const blob = new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
                                                            downloadBlob(blob, `export_filter_${new Date().toISOString().slice(0, 10)}.xlsx`)
                                                            addToast(`${rows.length} baris berhasil diekspor sebagai Excel`, 'success')
                                                        } catch { addToast('Gagal export', 'error') }
                                                    }}
                                                    className="h-8 px-3 rounded-lg bg-teal-500/10 text-teal-600 hover:bg-teal-500 hover:text-white transition-all text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 border border-teal-500/20"
                                                >
                                                    <FontAwesomeIcon icon={faDownload} className="text-[8px]" />
                                                    Export
                                                </button>
                                            )}
                                            <button
                                                onClick={() => setShowAdvancedFilter(false)}
                                                className="h-8 px-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-[9px] font-black uppercase tracking-widest text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] transition-all"
                                            >
                                                Tutup Panel
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Mobile/Tablet Only: Data Needs Presets - Separate row */}
                            <div className="lg:hidden pt-3 border-t border-[var(--color-border)]/30 mt-1">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mr-2">Cepat:</span>
                                        {[
                                            { label: 'Semua', icon: faUsers, active: !filterMissing && sortBy !== 'created_at' && sortBy !== 'total_points_desc', onClick: () => { setFilterMissing(''); setSortBy('name_asc'); } },
                                            { label: 'Foto Kosong', icon: faImage, active: filterMissing === 'photo', onClick: () => { setFilterMissing('photo'); setPage(1); } },
                                            { label: 'Tanpa WA', icon: faWhatsapp, active: filterMissing === 'wa', onClick: () => { setFilterMissing('wa'); setPage(1); } },
                                            { label: 'Top Performer', icon: faTrophy, active: sortBy === 'total_points_desc', onClick: () => { setSortBy('total_points_desc'); setPage(1); } },
                                            { label: 'Siswa Baru', icon: faPlus, active: sortBy === 'created_at', onClick: () => { setSortBy('created_at'); setPage(1); } },
                                        ].map((s, i) => (
                                            <button key={i} onClick={s.onClick}
                                                className={`h-7 px-2.5 rounded-lg border flex items-center gap-2 transition-all ${s.active ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-sm' : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]'}`}>
                                                <FontAwesomeIcon icon={s.icon} className="text-[9px]" />
                                                <span className="text-[9px] font-black uppercase tracking-widest whitespace-nowrap">{s.label}</span>
                                            </button>
                                        ))}
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {activeFilterCount > 0 && (
                                            <button
                                                onClick={async () => {
                                                    try {
                                                        const XLSX = await import('xlsx')
                                                        const rows = await fetchFilteredForExport()
                                                        const ws = XLSX.utils.json_to_sheet(rows)
                                                        const wb = XLSX.utils.book_new()
                                                        XLSX.utils.book_append_sheet(wb, ws, 'Filter')
                                                        const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
                                                        const blob = new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
                                                        downloadBlob(blob, `export_filter_${new Date().toISOString().slice(0, 10)}.xlsx`)
                                                        addToast(`${rows.length} baris berhasil diekspor sebagai Excel`, 'success')
                                                    } catch { addToast('Gagal export', 'error') }
                                                }}
                                                className="h-7 px-3 rounded-lg bg-teal-500/10 text-teal-600 hover:bg-teal-500 hover:text-white transition-all text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 border border-teal-500/20"
                                            >
                                                <FontAwesomeIcon icon={faDownload} className="text-[8px]" />
                                                Export
                                            </button>
                                        )}
                                        <button
                                            onClick={() => setShowAdvancedFilter(false)}
                                            className="h-7 px-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-[9px] font-black uppercase tracking-widest text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] transition-all"
                                        >
                                            Tutup Panel
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Removed: Smart Presets - SaaS Navigation Style */}
                {loading ? (
                    <div className="glass rounded-[1.5rem] border border-[var(--color-border)] overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-[var(--color-surface-alt)]">
                                    <tr className="text-left text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">
                                        <th className="px-6 py-4 w-10"></th>
                                        <th className="px-6 py-4">Siswa</th>
                                        <th className="px-6 py-4 text-center">Gender</th>
                                        <th className="px-6 py-4 text-center">Kelas</th>
                                        <th className="px-6 py-4 text-center">Poin</th>
                                        <th className="px-6 py-4 text-center">Lap. Terakhir</th>
                                        <th className="px-6 py-4 text-center">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Array.from({ length: 8 }).map((_, i) => (
                                        <tr key={i} className="border-t border-[var(--color-border)]">
                                            <td className="px-6 py-4"><div className="w-4 h-4 rounded bg-[var(--color-border)] animate-pulse" /></td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-[var(--color-border)] animate-pulse shrink-0" />
                                                    <div className="space-y-2">
                                                        <div className="h-3 w-32 rounded bg-[var(--color-border)] animate-pulse" />
                                                        <div className="h-2 w-24 rounded bg-[var(--color-border)] animate-pulse opacity-60" />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4"><div className="w-8 h-8 rounded-lg bg-[var(--color-border)] animate-pulse mx-auto" /></td>
                                            <td className="px-6 py-4"><div className="h-5 w-20 rounded-md bg-[var(--color-border)] animate-pulse mx-auto" /></td>
                                            <td className="px-6 py-4"><div className="h-4 w-10 rounded bg-[var(--color-border)] animate-pulse mx-auto" /></td>
                                            <td className="px-6 py-4"><div className="h-4 w-20 rounded bg-[var(--color-border)] animate-pulse mx-auto" /></td>
                                            <td className="px-6 py-4"><div className="h-7 w-28 rounded-lg bg-[var(--color-border)] animate-pulse ml-auto" /></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <div>
                        <div className="glass rounded-[1.5rem] border border-[var(--color-border)] overflow-hidden">
                            {/* Desktop View */}
                            {!isMobile && (
                                <div className="hidden md:block overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-[var(--color-surface-alt)] sticky top-0 z-10">
                                            <tr className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">
                                                <th className="px-4 py-4 text-center w-12">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedStudentIds.length === students.length && students.length > 0}
                                                        onChange={toggleSelectAll}
                                                        className="w-4 h-4 rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)] accent-[var(--color-primary)] cursor-pointer shrink-0"
                                                    />
                                                </th>
                                                <th className="px-4 py-4 text-left min-w-[250px]">Siswa</th>

                                                {visibleColumns.gender && (
                                                    <th className="px-4 py-4 text-center w-20">Gender</th>
                                                )}
                                                {visibleColumns.kelas && (
                                                    <th className="px-4 py-4 text-center w-44">Kelas</th>
                                                )}
                                                {visibleColumns.status && (
                                                    <th className="px-4 py-4 text-center w-32">Status</th>
                                                )}
                                                {visibleColumns.poin && (
                                                    <th className="px-4 py-4 text-center w-28">Poin</th>
                                                )}
                                                {visibleColumns.last_report && (
                                                    <th className="px-4 py-4 text-center w-32 whitespace-nowrap">Lap. Terakhir</th>
                                                )}
                                                {visibleColumns.profil && (
                                                    <th className="px-4 py-4 text-center w-32">Profil</th>
                                                )}
                                                {visibleColumns.tags && (
                                                    <th className="px-4 py-4 text-center w-28">Label</th>
                                                )}

                                                {/* COLUMN TOGGLE BUTTON —” di dalam header Aksi */}
                                                <th className="px-4 py-4 text-center pr-4 relative w-[280px]">
                                                    <div className="flex items-center justify-center">
                                                        {visibleColumns.aksi && <span>Aksi</span>}
                                                    </div>

                                                    {/* Toggle Button —” absolute kanan, seperti checkbox di kiri */}
                                                    <div className="absolute right-6 top-1/2 -translate-y-1/2" ref={colMenuRef}>
                                                        <button
                                                            onClick={(e) => {
                                                                const rect = e.currentTarget.getBoundingClientRect()
                                                                const menuHeight = 220
                                                                const spaceBelow = window.innerHeight - rect.bottom
                                                                const showUp = spaceBelow < menuHeight && rect.top > menuHeight
                                                                setColMenuPos({
                                                                    top: showUp ? (rect.top + window.scrollY - menuHeight - 8) : (rect.bottom + window.scrollY + 8),
                                                                    right: window.innerWidth - rect.right - window.scrollX,
                                                                    showUp
                                                                })
                                                                setIsColMenuOpen(p => !p)
                                                            }}
                                                            title="Atur kolom"
                                                            className={`w-6 h-6 rounded-md flex items-center justify-center transition-all
                                ${isColMenuOpen
                                                                    ? 'bg-[var(--color-primary)] text-white'
                                                                    : 'bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]'
                                                                }`}
                                                        >
                                                            <svg width="11" height="11" viewBox="0 0 12 12" fill="currentColor">
                                                                <rect x="0" y="0" width="5" height="5" rx="1" />
                                                                <rect x="7" y="0" width="5" height="5" rx="1" />
                                                                <rect x="0" y="7" width="5" height="5" rx="1" />
                                                                <rect x="7" y="7" width="5" height="5" rx="1" />
                                                            </svg>
                                                        </button>

                                                        {/* Dropdown Menu —” Portal agar tidak ter-clip oleh overflow tabel */}
                                                        {isColMenuOpen && createPortal(
                                                            <div
                                                                id="portal-column-menu"
                                                                onMouseDown={(e) => e.stopPropagation()}
                                                                className={`absolute z-[9999] w-44 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl shadow-black/10 p-2 space-y-0.5 animate-in fade-in zoom-in-95 ${colMenuPos.showUp ? 'slide-in-from-bottom-2' : 'slide-in-from-top-2'}`}
                                                                style={{ top: colMenuPos.top, right: colMenuPos.right }}
                                                            >
                                                                <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] px-3 py-2">
                                                                    Tampilkan Kolom
                                                                </p>
                                                                {[
                                                                    { key: 'gender', label: 'Gender' },
                                                                    { key: 'kelas', label: 'Kelas' },
                                                                    { key: 'status', label: 'Status' },
                                                                    { key: 'poin', label: 'Poin' },
                                                                    { key: 'last_report', label: 'Lap. Terakhir' },
                                                                    { key: 'profil', label: 'Profil' },
                                                                    { key: 'tags', label: 'Label' },
                                                                    { key: 'aksi', label: 'Aksi' },
                                                                ].map(({ key, label }) => (
                                                                    <button
                                                                        key={key}
                                                                        onClick={() => toggleColumn(key)}
                                                                        className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-[var(--color-surface-alt)] transition-all group text-left"
                                                                    >
                                                                        <span className="text-[11px] font-bold text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition-colors">{label}</span>
                                                                        <div className={`w-8 h-4.5 rounded-full transition-all flex items-center px-0.5 ${visibleColumns[key] ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'}`}>
                                                                            <div className={`w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-all ${visibleColumns[key] ? 'translate-x-[14px]' : 'translate-x-0'}`} />
                                                                        </div>
                                                                    </button>
                                                                ))}
                                                            </div>,
                                                            getPortalContainer('portal-column-menu')
                                                        )}
                                                    </div>
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {loading ? (
                                                Array.from({ length: 10 }).map((_, i) => (
                                                    <StudentSkeletonRow key={i} />
                                                ))
                                            ) : students.length === 0 ? (
                                                <tr>
                                                    <td colSpan={9} className="px-6 py-20">
                                                        <EmptyState
                                                            variant="plain"
                                                            icon={activeFilterCount > 0 || searchQuery ? faSearch : faUsers}
                                                            title={activeFilterCount > 0 || searchQuery ? "Pencarian Tidak Ditemukan" : "Belum Ada Data Siswa"}
                                                            description={activeFilterCount > 0 || searchQuery
                                                                ? "Maaf, kami tidak menemukan data siswa dengan kriteria tersebut. Coba ubah kata kunci atau reset filter."
                                                                : "Database siswa Anda masih kosong. Mulai tambahkan siswa baru atau import data untuk mulai mengelola."
                                                            }
                                                            action={
                                                                activeFilterCount > 0 || searchQuery ? (
                                                                    <button
                                                                        type="button"
                                                                        onClick={resetAllFilters}
                                                                        className="h-9 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest border border-[var(--color-border)] hover:bg-[var(--color-surface-alt)] transition"
                                                                    >
                                                                        Reset Semua Filter
                                                                    </button>
                                                                ) : (
                                                                    <button
                                                                        onClick={() => { setIsModalOpen(true); setActiveModal('add'); }}
                                                                        className="h-9 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest bg-[var(--color-primary)] text-white shadow-lg shadow-[var(--color-primary)]/20 hover:scale-105 transition-all flex items-center gap-2"
                                                                    >
                                                                        <FontAwesomeIcon icon={faPlus} />
                                                                        Tambah Siswa Pertama
                                                                    </button>
                                                                )
                                                            }
                                                        />
                                                    </td>
                                                </tr>
                                            ) : (
                                                students.map((student) => (
                                                    <StudentRow
                                                        key={student.id}
                                                        student={student}
                                                        visibleColumns={visibleColumns}
                                                        isSelected={selectedIdSet.has(student.id)}
                                                        lastReportMap={lastReportMap}
                                                        isPrivacyMode={isPrivacyMode}
                                                        onEdit={canEdit && canEditStudent ? handleEdit : null}
                                                        onViewProfile={handleViewProfile}
                                                        onViewQR={handleViewQR}
                                                        onViewPrint={handleViewPrint}
                                                        onViewTags={handleViewTags}
                                                        onViewClassHistory={handleViewClassHistory}
                                                        onConfirmDelete={canEdit && canDeleteStudent ? confirmDelete : null}
                                                        onClassBreakdown={handleClassBreakdown}
                                                        onPhotoZoom={setPhotoZoom}
                                                        onToggleSelect={toggleSelectStudent}
                                                        onQuickPoint={handleQuickPoint}
                                                        onInlineUpdate={canEdit && canEditStudent ? handleInlineUpdate : null}
                                                        onTogglePin={handleTogglePin}
                                                        classesList={classesList}
                                                        formatRelativeDate={formatRelativeDate}
                                                        RiskThreshold={RiskThreshold}
                                                        buildWAMessage={buildWAMessage}
                                                        openWAForStudent={openWAForStudent}
                                                        waTemplate={waTemplate}
                                                    />
                                                ))
                                            )}

                                            {/* Quick Inline Add Row */}
                                            {isInlineAddOpen && (
                                                <StudentInlineAddRow
                                                    classesList={classesList}
                                                    submitting={submittingInline}
                                                    canEdit={canEdit}
                                                    visibleColumns={visibleColumns}
                                                    initialClassId={inlineForm.class_id}
                                                    onSubmit={handleInlineSubmit}
                                                    onCancel={() => setIsInlineAddOpen(false)}
                                                />
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {/* Quick Add trigger FOR DESKTOP — stays below table */}
                            {!isMobile && !isInlineAddOpen && canEdit && canAddStudent && (
                                <div className="hidden md:block p-4 border-t border-[var(--color-border)] bg-[var(--color-surface-alt)]/5">
                                    <button
                                        onClick={() => {
                                            setIsInlineAddOpen(true)
                                        }}
                                        className="w-full py-3 flex items-center justify-center gap-2 text-[11px] font-black uppercase tracking-widest text-[var(--color-primary)] bg-[var(--color-primary)]/[0.04] hover:bg-[var(--color-primary)]/10 active:scale-[0.99] transition-all border-2 border-[var(--color-primary)]/20 hover:border-[var(--color-primary)]/40 border-dashed rounded-2xl"
                                    >
                                        <FontAwesomeIcon icon={faPlus} className="text-[10px]" />
                                        Quick Add Siswa
                                    </button>
                                </div>
                            )}

                            {/* Mobile View Selection Header */}
                            {isMobile && selectedStudentIds.length > 0 && (
                                <div className="sticky top-0 z-40 -mx-3 mb-4 px-4 py-2 bg-[var(--color-surface)]/80 backdrop-blur-md border-b border-[var(--color-border)] flex items-center justify-between animate-in slide-in-from-top-4 duration-300">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-lg bg-[var(--color-primary)] text-white flex items-center justify-center text-[10px] font-black">
                                            {selectedStudentIds.length}
                                        </div>
                                        <p className="text-[11px] font-black uppercase tracking-widest text-[var(--color-text)]">Siswa Terpilih</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={toggleSelectAll}
                                            className="h-8 px-3 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[10px] font-black uppercase tracking-widest text-[var(--color-text)] hover:bg-[var(--color-border)] transition-all"
                                        >
                                            {selectedStudentIds.length === students.length ? 'Batal Semua' : 'Pilih Semua'}
                                        </button>
                                        <button
                                            onClick={() => setSelectedStudentIds([])}
                                            className="h-8 w-8 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all"
                                        >
                                            <FontAwesomeIcon icon={faXmark} />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {isMobile && (
                                <div
                                    className="md:hidden px-3 pb-3 space-y-3"
                                    style={{
                                        paddingBottom:
                                            selectedStudentIds.length > 0
                                                ? `calc(var(--floating-bar-bottom, 16px) + 64px + env(safe-area-inset-bottom))`
                                                : `calc(var(--floating-bar-bottom, 16px) + env(safe-area-inset-bottom))`,
                                    }}
                                >

                                    {loading ? (
                                        <div className="space-y-4 pt-2">
                                            {mobileView === 'card' ? (
                                                Array.from({ length: 5 }).map((_, i) => (
                                                    <StudentSkeletonCard key={i} />
                                                ))
                                            ) : (
                                                <div className="bg-[var(--color-surface)] rounded-[1.5rem] border border-[var(--color-border)] divide-y divide-[var(--color-border)]/50 overflow-hidden shadow-sm">
                                                    {Array.from({ length: 8 }).map((_, i) => (
                                                        <div key={i} className="animate-pulse flex items-center gap-4 px-4 py-4">
                                                            <div className="w-10 h-10 rounded-xl bg-[var(--color-surface-alt)]" />
                                                            <div className="flex-1 space-y-2">
                                                                <div className="w-3/4 h-3 bg-[var(--color-surface-alt)] rounded" />
                                                                <div className="w-1/2 h-2 bg-[var(--color-surface-alt)]/60 rounded" />
                                                            </div>
                                                            <div className="w-10 h-6 bg-[var(--color-surface-alt)] rounded-lg" />
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ) : students.length === 0 ? (
                                        <div className="py-12">
                                            <EmptyState
                                                variant="plain"
                                                icon={activeFilterCount > 0 || searchQuery ? faSearch : faUsers}
                                                title={activeFilterCount > 0 || searchQuery ? "Pencarian Tidak Ditemukan" : "Belum Ada Data Siswa"}
                                                description={activeFilterCount > 0 || searchQuery
                                                    ? "Maaf, kami tidak menemukan siswa dengan kriteria tersebut. Coba ubah kata kunci atau reset filter."
                                                    : "Database siswa Anda masih kosong. Mulai tambahkan siswa baru untuk mulai mengelola."
                                                }
                                                action={
                                                    activeFilterCount > 0 || searchQuery ? (
                                                        <button
                                                            onClick={resetAllFilters}
                                                            className="h-9 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest border border-[var(--color-border)] hover:bg-[var(--color-surface-alt)] transition"
                                                        >
                                                            Reset Semua Filter
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => { setIsModalOpen(true); setActiveModal('add'); }}
                                                            className="h-9 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest bg-[var(--color-primary)] text-white shadow-lg shadow-[var(--color-primary)]/20 active:scale-95 transition-all flex items-center gap-2"
                                                        >
                                                            <FontAwesomeIcon icon={faPlus} />
                                                            Tambah Siswa Pertama
                                                        </button>
                                                    )
                                                }
                                            />
                                        </div>
                                    ) : (
                                        <>
                                            {/* Mobile View Switcher */}
                                            <div className="pt-3 pb-2 px-1 mb-1 flex items-center justify-between bg-[var(--color-surface)]/20 rounded-2xl -mx-3 px-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] animate-pulse" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">
                                                        {totalRows} Data ditemukan
                                                    </span>
                                                </div>
                                                <div className="flex items-center bg-[var(--color-surface)] shadow-inner p-1 rounded-[1.2rem] border border-[var(--color-border)]">
                                                    <button
                                                        onClick={() => switchMobileView('card')}
                                                        className={`h-8 px-4 rounded-xl flex items-center gap-2 text-[10px] font-black transition-all duration-200 ${pendingView === 'card' ? 'bg-[var(--color-primary)] text-white shadow-md shadow-[var(--color-primary)]/20' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)]'}`}
                                                    >
                                                        <FontAwesomeIcon icon={faTable} className="text-[11px]" />
                                                        Card
                                                    </button>
                                                    <button
                                                        onClick={() => switchMobileView('list')}
                                                        className={`h-8 px-4 rounded-xl flex items-center gap-2 text-[10px] font-black transition-all duration-200 ${pendingView === 'list' ? 'bg-[var(--color-primary)] text-white shadow-md shadow-[var(--color-primary)]/20' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)]'}`}
                                                    >
                                                        <FontAwesomeIcon icon={faTableList} className="text-[11px]" />
                                                        List
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="mt-2 relative">
                                                {/* Skeleton Transition Overlay */}
                                                {isViewTransitioning && (
                                                    <div className="animate-in fade-in duration-150 z-10 relative">
                                                        {mobileView === 'card'
                                                            ? <MobileListSkeleton count={7} />
                                                            : <MobileCardSkeleton count={3} />
                                                        }
                                                    </div>
                                                )}

                                                {/* Card View Container */}
                                                {mobileView === 'card' && (
                                                    <div
                                                        className="space-y-3 transition-all duration-300 ease-in-out"
                                                        style={{
                                                            opacity: !isViewTransitioning ? 1 : 0,
                                                            transform: !isViewTransitioning ? 'translateY(0)' : 'translateY(-8px)',
                                                            width: '100%',
                                                        }}
                                                    >
                                                        {students.map(student => {
                                                            const isRisk = (student.total_points || 0) <= RiskThreshold
                                                            return (
                                                                <div
                                                                    key={student.id}
                                                                    className={`relative rounded-2xl transition-all ${isRisk ? 'ring-1 ring-red-500/40 ring-offset-0' : ''}`}
                                                                >
                                                                    {isRisk && (
                                                                        <div className="absolute left-0 top-4 bottom-4 w-1 rounded-r-full bg-red-500 z-10 pointer-events-none" />
                                                                    )}
                                                                    <StudentMobileCard
                                                                        student={student}
                                                                        isSelected={selectedIdSet.has(student.id)}
                                                                        hasSelection={selectedIdSet.size > 0}
                                                                        onToggleSelect={toggleSelectStudent}
                                                                        onViewProfile={handleViewProfile}
                                                                        onEdit={canEdit ? handleEdit : null}
                                                                        onConfirmDelete={canEdit ? confirmDelete : null}
                                                                        onTogglePin={handleTogglePin}
                                                                        onQuickPoint={handleQuickPoint}
                                                                        isPrivacyMode={isPrivacyMode}
                                                                        RiskThreshold={RiskThreshold}
                                                                        buildWAMessage={buildWAMessage}
                                                                        openWAForStudent={openWAForStudent}
                                                                        waTemplate={waTemplate}
                                                                    />
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                )}

                                                {/* List View Container */}
                                                {mobileView === 'list' && (
                                                    <div
                                                        className="flex flex-col gap-2 transition-all duration-300 ease-in-out"
                                                        style={{
                                                            opacity: !isViewTransitioning ? 1 : 0,
                                                            transform: !isViewTransitioning ? 'translateY(0)' : 'translateY(8px)',
                                                            width: '100%',
                                                        }}
                                                    >
                                                        {students.length > 0 && canEdit && (
                                                            <div className="text-[9px] font-black text-[var(--color-text-muted)] opacity-50 text-center uppercase tracking-widest flex items-center justify-center gap-2 pb-1 animate-pulse">
                                                                <FontAwesomeIcon icon={faCircleInfo} />
                                                                Ketuk baris siswa untuk menu cepat & poin
                                                            </div>
                                                        )}
                                                        <div className="bg-[var(--color-surface)] rounded-[1.5rem] border border-[var(--color-border)] divide-y divide-[var(--color-border)]/40 overflow-hidden shadow-sm">
                                                            {students.map((student) => (
                                                                <StudentMobileListRow
                                                                    key={student.id}
                                                                    student={student}
                                                                    isSelected={selectedIdSet.has(student.id)}
                                                                    hasSelection={selectedIdSet.size > 0}
                                                                    onToggleSelect={toggleSelectStudent}
                                                                    onViewProfile={handleViewProfile}
                                                                    onEdit={canEdit ? handleEdit : null}
                                                                    onTogglePin={handleTogglePin}
                                                                    onQuickPoint={handleQuickPoint}
                                                                    isPrivacyMode={isPrivacyMode}
                                                                    RiskThreshold={RiskThreshold}
                                                                    canEdit={canEdit}
                                                                    onConfirmDelete={canEdit ? confirmDelete : null}
                                                                    buildWAMessage={buildWAMessage}
                                                                    openWAForStudent={openWAForStudent}
                                                                    waTemplate={waTemplate}
                                                                />
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Quick Add trigger — stays below list */}
                                                {!isInlineAddOpen && canEdit && canAddStudent && (
                                                    <button
                                                        onClick={() => {
                                                            setIsInlineAddOpen(true)
                                                            setTimeout(() => quickAddRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80)
                                                        }}
                                                        className="w-full py-3 flex items-center justify-center gap-2 text-[11px] font-black uppercase tracking-widest text-[var(--color-primary)] bg-[var(--color-primary)]/[0.04] hover:bg-[var(--color-primary)]/10 active:scale-[0.98] transition-all border-2 border-[var(--color-primary)]/20 hover:border-[var(--color-primary)]/40 border-dashed rounded-2xl mt-4 mb-2 shadow-sm"
                                                    >
                                                        <FontAwesomeIcon icon={faPlus} className="text-[10px]" />
                                                        Quick Add Siswa
                                                    </button>
                                                )}

                                                {/* Quick Add form — BELOW the list (correct position) */}
                                                {isInlineAddOpen && canEdit && canAddStudent && (
                                                    <div ref={quickAddRef} className="p-3 rounded-2xl border border-[var(--color-primary)]/25 bg-[var(--color-primary)]/[0.02] shadow-sm mt-2 animate-in slide-in-from-bottom-4 fade-in duration-300">
                                                        <div className="flex items-center justify-between gap-3 mb-2">
                                                            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Quick Add Siswa</p>
                                                            <button
                                                                type="button"
                                                                onClick={() => setIsInlineAddOpen(false)}
                                                                className="h-8 w-8 rounded-xl border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] transition-all flex items-center justify-center"
                                                            >
                                                                <FontAwesomeIcon icon={faXmark} />
                                                            </button>
                                                        </div>

                                                        <form
                                                            onSubmit={(e) => {
                                                                e.preventDefault()
                                                                handleInlineSubmit()
                                                            }}
                                                            className="grid grid-cols-1 gap-2.5"
                                                        >
                                                            <input
                                                                type="text"
                                                                value={inlineForm.name}
                                                                onChange={e => setInlineForm(p => ({ ...p, name: e.target.value }))}
                                                                placeholder="Nama siswa..."
                                                                autoFocus
                                                                required
                                                                className="input-field text-sm h-11 px-3 rounded-xl border-[var(--color-border)] focus:border-[var(--color-primary)] bg-[var(--color-surface)] w-full font-bold"
                                                            />

                                                            <div className="grid grid-cols-[1fr_112px] gap-2">
                                                                <RichSelect
                                                                    value={inlineForm.class_id}
                                                                    onChange={val => setInlineForm(p => ({ ...p, class_id: val }))}
                                                                    options={classesList.map(c => ({ id: c.id, name: c.name }))}
                                                                    placeholder="Pilih kelas"
                                                                    small
                                                                    searchable
                                                                />
                                                                <div className="flex items-center justify-end gap-1">
                                                                    {['L', 'P'].map(g => (
                                                                        <button
                                                                            key={g}
                                                                            type="button"
                                                                            onClick={() => setInlineForm(p => ({ ...p, gender: g }))}
                                                                            className={`h-11 flex-1 rounded-xl text-[10px] font-black border transition-all ${inlineForm.gender === g
                                                                                ? (g === 'L' ? 'bg-blue-500 text-white border-blue-500 shadow-lg shadow-blue-500/15' : 'bg-pink-500 text-white border-pink-500 shadow-lg shadow-pink-500/15')
                                                                                : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] bg-[var(--color-surface)]'}`}
                                                                        >
                                                                            {g}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </div>

                                                            <input
                                                                type="tel"
                                                                value={inlineForm.phone}
                                                                onChange={e => setInlineForm(p => ({ ...p, phone: e.target.value.replace(/\D/g, '') }))}
                                                                placeholder="No. HP/WA (opsional)"
                                                                className="input-field text-[11px] h-11 px-3 rounded-xl border-[var(--color-border)] bg-[var(--color-surface)] w-full font-bold"
                                                            />

                                                            <button
                                                                type="submit"
                                                                disabled={submittingInline || !canEdit || !inlineForm.name.trim()}
                                                                className="h-11 w-full rounded-xl bg-[var(--color-primary)] text-white text-[10px] font-black uppercase tracking-widest hover:brightness-110 shadow-lg shadow-[var(--color-primary)]/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                                            >
                                                                {submittingInline ? <FontAwesomeIcon icon={faSpinner} className="fa-spin" /> : <><FontAwesomeIcon icon={faCheck} /> Simpan</>}
                                                            </button>
                                                        </form>
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}

                            {/* Pagination Footer */}
                            {totalRows > 0 && (
                                <Pagination
                                    totalRows={totalRows}
                                    page={page}
                                    pageSize={pageSize}
                                    setPage={setPage}
                                    setPageSize={setPageSize}
                                    label="Siswa"
                                    jumpPage={jumpPage}
                                    setJumpPage={setJumpPage}
                                />
                            )}
                        </div>
                    </div>
                )}

                {/* IMPORT MODAL (lazy chunk) */}
                {/* ===================== */}
                <React.Suspense fallback={null}>
                    {isImportModalOpen && (
                        <LazyStudentImportModal
                            isOpen={isImportModalOpen}
                            onClose={() => {
                                if (importing) return
                                setIsImportModalOpen(false)
                                setImportPreview([])
                                setImportIssues([])
                                setImportDuplicates([])
                                setImportFileName('')
                                setImportDragOver(false)
                                setImportStep(1)
                            }}
                            importing={importing}
                            importStep={importStep}
                            setImportStep={setImportStep}
                            importPreview={importPreview}
                            importDuplicates={importDuplicates}
                            importFileName={importFileName}
                            importFileInputRef={importFileInputRef}
                            importDragOver={importDragOver}
                            setImportDragOver={setImportDragOver}
                            processImportFile={processImportFile}
                            classesList={classesList}
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
                    )}
                </React.Suspense>

                {/* (old inline Import Modal JSX removed; now lazy-loaded) */}
                {/* dead-code Import modal block deleted */}

                {/* ===================== */}
                {/* Fitur 2 - Batch Reset Poin Modal */}
                <StudentResetPointsModal
                    isOpen={activeModal === 'resetPoints'}
                    onClose={closeModal}
                    classesList={classesList}
                    resetPointsClassId={resetPointsClassId}
                    setResetPointsClassId={setResetPointsClassId}
                    resettingPoints={resettingPoints}
                    handleBatchResetPoints={handleBatchResetPoints}
                />

                {/* BULK PHOTO MATCHER MODAL */}
                <StudentBulkPhotoModal
                    isOpen={activeModal === 'bulkPhoto'}
                    onClose={closeModal}
                    uploadingBulkPhotos={uploadingBulkPhotos}
                    bulkPhotoMatches={bulkPhotoMatches}
                    handleBulkPhotoMatch={handleBulkPhotoMatch}
                    handleBulkPhotoUpload={handleBulkPhotoUpload}
                    setBulkPhotoMatches={setBulkPhotoMatches}
                    allStudentsForBulk={allStudentsForBulk}
                    matchingPhotos={matchingPhotos}
                />

                {/* ===================== */}
                {/* GUARDIAN BROADCAST HUB */}
                {/* ===================== */}
                {
                    activeModal === 'bulkWA' && (
                        <Modal
                            isOpen={activeModal === 'bulkWA'}
                            onClose={() => closeModal()}
                            title="Guardian Broadcast Hub"
                            description="Kirim pesan massal ke wali murid menggunakan template otomatis."
                            icon={faWhatsapp}
                            iconBg="bg-emerald-500/10"
                            iconColor="text-emerald-600"
                            size="lg"
                            mobileVariant="bottom-sheet"
                            footer={
                                <div className="p-0 bg-[var(--color-surface)] flex items-center justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1">
                                            <span>Kemajuan Hub</span>
                                            <span>{broadcastIndex + 1} / {selectedStudentsWithPhone.length}</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-[var(--color-surface-alt)] rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-[var(--color-primary)] transition-all duration-500"
                                                style={{ width: `${selectedStudentsWithPhone.length ? ((broadcastIndex + 1) / selectedStudentsWithPhone.length) * 100 : 0}%` }}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => closeModal()}
                                            className="h-11 px-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] text-[10px] font-black uppercase tracking-widest hover:bg-[var(--color-surface-alt)] transition-all"
                                        >
                                            Tutup
                                        </button>
                                        <button
                                            onClick={() => {
                                                selectedStudentsWithPhone.forEach((s, i) => {
                                                    setTimeout(() => {
                                                        setBroadcastIndex(i);
                                                        openWAForStudent(s, buildWAMessage(s, broadcastTemplate));
                                                    }, i * 1200);
                                                });
                                            }}
                                            className="h-11 px-6 rounded-xl bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 shrink-0"
                                        >
                                            <FontAwesomeIcon icon={faPaperPlane} />
                                            Mulai Siaran Massal
                                        </button>
                                    </div>
                                </div>
                            }
                        >
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                                {/* Selector Section */}
                                <div className="lg:col-span-4 space-y-4">
                                    <div className="p-4 rounded-2xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Pilih Template Pesan</label>
                                        {[
                                            { id: 'summary', label: 'Laporan Akademik Lengkap', icon: faFileLines },
                                            { id: 'points', label: 'Ringkasan Poin Perilaku', icon: faTrophy },
                                            { id: 'security', label: 'Akses Portal (ID & PIN)', icon: faShieldHalved },
                                            { id: 'custom', label: 'Pesan Kustom Sekolah', icon: faPenNib },
                                        ].map(t => (
                                            <button
                                                key={t.id}
                                                onClick={() => setBroadcastTemplate(t.id)}
                                                className={`w-full p-3 rounded-xl border text-left flex items-center gap-3 transition-all ${broadcastTemplate === t.id ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white shadow-lg' : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-border)]'}`}
                                            >
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${broadcastTemplate === t.id ? 'bg-white/20' : 'bg-[var(--color-surface-alt)]'}`}>
                                                    <FontAwesomeIcon icon={t.icon} className="text-xs" />
                                                </div>
                                                <span className="text-[11px] font-bold leading-tight">{t.label}</span>
                                            </button>
                                        ))}
                                    </div>

                                    {broadcastTemplate === 'custom' && (
                                        <textarea
                                            value={customWaMsg}
                                            onChange={(e) => setCustomWaMsg(e.target.value)}
                                            placeholder="Tulis pesan kustom di sini... Gunakan {nama}, {poin}, {kelas} sebagai tag otomatis."
                                            className="w-full h-32 p-3 text-xs rounded-2xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] focus:border-[var(--color-primary)] outline-none"
                                        />
                                    )}
                                </div>

                                {/* Preview & Action Section */}
                                <div className="lg:col-span-8 flex flex-col">
                                    <div className="flex-1 bg-[var(--color-surface-alt)]/30 border border-[var(--color-border)] rounded-2xl overflow-hidden flex flex-col min-h-[400px]">
                                        <div className="p-3 border-b border-[var(--color-border)] bg-[var(--color-surface)]/50 flex items-center justify-between">
                                            <h5 className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Antrean Siaran ({selectedStudentsWithPhone.length} Wali)</h5>
                                            {broadcastIndex >= 0 && (
                                                <div className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 text-[9px] font-black animate-pulse">SIARAN BERJALAN...</div>
                                            )}
                                        </div>

                                        <div className="flex-1 overflow-auto p-4 space-y-3 max-h-[350px] scrollbar-none">
                                            {selectedStudentsWithPhone.map((s, idx) => (
                                                <div key={idx} className={`p-3 rounded-xl border transition-all ${broadcastIndex === idx ? 'bg-[var(--color-primary)]/5 border-[var(--color-primary)]' : 'bg-[var(--color-surface)] border-[var(--color-border)] opacity-70'}`}>
                                                    <div className="flex items-start justify-between gap-3 mb-2">
                                                        <div>
                                                            <p className="text-[11px] font-black leading-none">{s.name}</p>
                                                            <p className="text-[9px] text-[var(--color-text-muted)] mt-1 font-bold">Wali: {s.guardian_name || '---'} ({s.phone})</p>
                                                        </div>
                                                        <button
                                                            onClick={() => openWAForStudent(s, buildWAMessage(s, broadcastTemplate))}
                                                            className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white transition-all flex items-center justify-center text-[10px]"
                                                        >
                                                            <FontAwesomeIcon icon={faWhatsapp} />
                                                        </button>
                                                    </div>
                                                    <div className="p-2.5 rounded-lg bg-[var(--color-surface-alt)]/50 border border-black/5 text-[10px] font-medium leading-relaxed line-clamp-2">
                                                        {buildWAMessage(s, broadcastTemplate)}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Modal>
                    )
                }

                {/* ===================== */}
                {/* EXPORT MODAL (lazy chunk) */}
                {/* ===================== */}
                <React.Suspense fallback={null}>
                    {isExportModalOpen && (
                        <LazyStudentExportModal
                            isOpen={isExportModalOpen}
                            onClose={() => { if (exporting) return; setIsExportModalOpen(false) }}
                            students={students}
                            selectedStudentIds={selectedStudentIds}
                            exportScope={exportScope}
                            setExportScope={setExportScope}
                            exportColumns={exportColumns}
                            setExportColumns={setExportColumns}
                            exporting={exporting}
                            handleExportCSV={handleExportCSV}
                            handleExportExcel={handleExportExcel}
                            handleExportPDF={handleExportPDF}
                            generateStudentPDF={generateStudentPDF}
                            addToast={addToast}
                        />
                    )}
                </React.Suspense>

                {
                    isModalOpen && (
                        <StudentFormModal
                            isOpen={isModalOpen}
                            onClose={() => setIsModalOpen(false)}
                            selectedStudent={selectedStudent}
                            classesList={classesList}
                            onSubmit={handleSubmit}
                            submitting={submitting}
                            onPhotoUpload={handlePhotoUpload}
                            uploadingPhoto={uploadingPhoto}
                        />
                    )
                }

                {/* Modal Cetak Kartu & Akses Siswa (lazy-loaded) */}
                <React.Suspense fallback={null}>
                    {isPrintModalOpen && (
                        <LazyStudentAccessCardModal
                            isOpen={isPrintModalOpen}
                            onClose={() => {
                                setIsPrintModalOpen(false);
                                if (newlyCreatedStudent) setNewlyCreatedStudent(null);
                            }}
                            selectedStudent={selectedStudent}
                            selectedStudents={selectedStudents}
                            newlyCreatedStudent={newlyCreatedStudent}
                            isPrivacyMode={isPrivacyMode}
                            maskInfo={maskInfo}
                            addToast={addToast}
                            cardCaptureRef={cardCaptureRef}
                            waTemplate={waTemplate}
                            buildWAMessage={buildWAMessage}
                            openWAForStudent={openWAForStudent}
                            handleResetPin={handleResetPin}
                            resettingPin={resettingPin}
                            generatingPdf={generatingPdf}
                            handlePrintSingle={handlePrintSingle}
                            handleSavePNG={handleSavePNG}
                            handlePrintThermal={handlePrintThermal}
                            generateStudentPDF={generateStudentPDF}
                        />
                    )}
                </React.Suspense>
                {/* Modal Detail Profil Siswa —” lazy loaded */}
                {
                    activeModal === 'profile' && selectedStudent && (
                        <React.Suspense fallback={null}>
                            <LazyStudentProfileModal
                                isOpen={activeModal === 'profile'}
                                onClose={closeModal}
                                selectedStudent={selectedStudent}
                                isPrivacyMode={isPrivacyMode}
                                maskInfo={maskInfo}
                                calculateCompleteness={calculateCompleteness}
                                behaviorHistory={behaviorHistory}
                                loadingHistory={loadingHistory}
                                RiskThreshold={RiskThreshold}
                                canEdit={canEdit}
                                handleEdit={handleEdit}
                                profileTab={profileTab}
                                setProfileTab={setProfileTab}
                                timelineStats={timelineStats}
                                timelineFilter={timelineFilter}
                                setTimelineFilter={setTimelineFilter}
                                timelineVisible={timelineVisible}
                                setTimelineVisible={setTimelineVisible}
                                timelineFiltered={timelineFiltered}
                                raportHistory={raportHistory}
                                loadingRaport={loadingRaport}
                                addToast={addToast}
                                onOpenTagModal={() => { setStudentForTags(selectedStudent); setActiveModal('tag') }}
                                buildWAMessage={buildWAMessage}
                                openWAForStudent={openWAForStudent}
                            />
                        </React.Suspense>
                    )
                }

                {/* Bulk Promote Modal - ENTERPRISE EDITION */}
                {
                    activeModal === 'bulkPromote' && (
                        <Modal
                            isOpen={activeModal === 'bulkPromote'}
                            onClose={() => { closeModal(); setClassSearchQuery('') }}
                            title="Kenaikan Kelas Massal"
                            description="Pindahkan rombongan siswa ke tingkat kelas berikutnya."
                            icon={faGraduationCap}
                            iconBg="bg-[var(--color-primary)]/10"
                            iconColor="text-[var(--color-primary)]"
                            size="md"
                            mobileVariant="bottom-sheet"
                            footer={
                                <div className="flex gap-3 w-full">
                                    <button
                                        type="button"
                                        onClick={() => { closeModal(); setClassSearchQuery('') }}
                                        className="flex-1 h-12 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] text-[11px] font-black uppercase tracking-widest transition-all"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleBulkPromote}
                                        disabled={submitting || !bulkClassId}
                                        className="flex-[2] h-12 rounded-2xl bg-[var(--color-primary)] text-white text-[10px] md:text-[11px] font-black uppercase tracking-widest hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2 md:gap-3 shadow-xl shadow-[var(--color-primary)]/20 active:scale-[0.98] whitespace-nowrap px-2"
                                    >
                                        {submitting ? <FontAwesomeIcon icon={faSpinner} className="fa-spin" /> : (
                                            <>
                                                <FontAwesomeIcon icon={faGraduationCap} className="text-xs md:text-sm" />
                                                <span>Proses Kenaikan <span className="hidden sm:inline">({selectedStudentIds.length} Siswa)</span></span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            }
                        >
                            <div className="space-y-4 md:space-y-6">
                                {/* Selected Students Summary */}
                                <SelectedStudentsCarousel
                                    selectedStudents={selectedStudents}
                                    removingStudentId={removingStudentId}
                                    setRemovingStudentId={setRemovingStudentId}
                                    toggleSelectStudent={toggleSelectStudent}
                                    isPromoteMode={true}
                                    bulkClassId={bulkClassId}
                                    classesList={classesList}
                                />

                                <div className="h-px bg-gradient-to-r from-transparent via-[var(--color-border)] to-transparent" />

                                {/* Smart Level Safety Banners */}
                                {(() => {
                                    const results = selectedStudentIds.map(id => {
                                        const s = students.find(st => st.id === id);
                                        const targetClass = classesList.find(cl => cl.id === bulkClassId);
                                        const originLevel = parseInt(s?.className) || 0;
                                        const targetLevel = targetClass ? (parseInt(targetClass.name) || 0) : 0;
                                        if (!bulkClassId) return null;
                                        if (targetLevel < originLevel) return 'downgrade';
                                        if (targetLevel === originLevel) return 'stay';
                                        if (targetLevel > originLevel + 1) return 'skip';
                                        return 'normal';
                                    });

                                    const hasDowngrade = results.includes('downgrade');
                                    const hasStay = results.includes('stay');
                                    const hasSkip = results.includes('skip');

                                    const removeBatch = (condition) => {
                                        const idsToRemove = selectedStudentIds.filter(id => {
                                            const s = students.find(st => st.id === id);
                                            const targetClass = classesList.find(cl => cl.id === bulkClassId);
                                            const originLevel = parseInt(s?.className) || 0;
                                            const targetLevel = targetClass ? (parseInt(targetClass.name) || 0) : 0;

                                            if (!bulkClassId) return false;
                                            if (condition === 'downgrade') return targetLevel < originLevel;
                                            if (condition === 'stay') return targetLevel === originLevel;
                                            return false;
                                        });

                                        if (idsToRemove.length > 0) {
                                            idsToRemove.forEach((id, index) => {
                                                setTimeout(() => toggleSelectStudent(id), index * 50);
                                            });
                                            addToast(`${idsToRemove.length} siswa berhasil dikeluarkan`, 'success');
                                        }
                                    };

                                    return (
                                        <div className="space-y-2">
                                            {hasDowngrade && (
                                                <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-1 duration-300">
                                                    <div className="flex gap-2.5 items-center">
                                                        <div className="w-8 h-8 rounded-lg bg-red-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-red-500/20">
                                                            <FontAwesomeIcon icon={faTriangleExclamation} className="text-sm animate-pulse" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-[10px] font-black text-red-700 uppercase tracking-widest leading-none">Kritis: Penurunan Kelas!</p>
                                                            <p className="text-[9px] text-red-600/80 font-bold mt-1 leading-tight">Ada siswa yang dipindahkan ke level yang lebih rendah.</p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeBatch('downgrade')}
                                                        className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-[9px] font-black uppercase tracking-wider hover:bg-red-700 transition-all shadow-md active:scale-95 shrink-0"
                                                    >
                                                        Keluarkan Siswa
                                                    </button>
                                                </div>
                                            )}
                                            {hasStay && (
                                                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-1 duration-300">
                                                    <div className="flex gap-2.5 items-center">
                                                        <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/20">
                                                            <FontAwesomeIcon icon={faRotateLeft} className="text-sm" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest leading-none">Peringatan: Tetap di Kelas</p>
                                                            <p className="text-[9px] text-amber-600/80 font-bold mt-1 leading-tight">Siswa ini akan tetap berada di tingkat yang sama.</p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeBatch('stay')}
                                                        className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-[9px] font-black uppercase tracking-wider hover:bg-amber-700 transition-all shadow-md active:scale-95 shrink-0"
                                                    >
                                                        Keluarkan Siswa
                                                    </button>
                                                </div>
                                            )}
                                            {hasSkip && (
                                                <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-200 flex gap-3 items-center animate-in fade-in slide-in-from-top-1 duration-300">
                                                    <div className="w-8 h-8 rounded-lg bg-indigo-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/20">
                                                        <FontAwesomeIcon icon={faRocket} className="text-sm" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-[10px] font-black text-indigo-700 uppercase tracking-widest leading-none">Info: Loncatan Kelas</p>
                                                        <p className="text-[9px] text-indigo-600/80 font-bold mt-1 leading-tight">Ada siswa yang meloncat 1 tingkat atau lebih.</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}

                                {/* Class Selection Section */}
                                <div className="space-y-4">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
                                        <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest flex items-center gap-2 shrink-0">
                                            <FontAwesomeIcon icon={faGraduationCap} className="opacity-40" /> Pilih Kelas Tujuan
                                        </label>

                                        {/* Quick Search Classes */}
                                        <div className="relative w-full sm:max-w-[200px]">
                                            <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] opacity-30" />
                                            <input
                                                type="text"
                                                placeholder="Cari kelas..."
                                                value={classSearchQuery}
                                                onChange={(e) => setClassSearchQuery(e.target.value)}
                                                className="w-full h-8 pl-8 pr-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[11px] font-bold outline-none focus:border-[var(--color-primary)] transition-all"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-1">
                                        {classesList.filter(c => c.name.toLowerCase().includes(classSearchQuery.toLowerCase())).length === 0 ? (
                                            <div className="col-span-full py-12 text-center space-y-3 bg-[var(--color-surface-alt)] rounded-3xl border-2 border-dashed border-[var(--color-border)]">
                                                <div className="w-12 h-12 rounded-2xl bg-[var(--color-primary)]/5 text-[var(--color-primary)] flex items-center justify-center mx-auto opacity-20">
                                                    <FontAwesomeIcon icon={faSearch} className="text-xl" />
                                                </div>
                                                <p className="text-[11px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-40">Kelas tidak ditemukan</p>
                                            </div>
                                        ) : classesList
                                            .filter(c => c.name.toLowerCase().includes(classSearchQuery.toLowerCase()))
                                            .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }))
                                            .map(c => {
                                                const isSelected = bulkClassId === c.id;
                                                const isPutra = c.name.toUpperCase().includes('PUTRA');
                                                const isPutri = c.name.toUpperCase().includes('PUTRI');

                                                return (
                                                    <button
                                                        key={c.id}
                                                        type="button"
                                                        onClick={() => setBulkClassId(bulkClassId === c.id ? '' : c.id)}
                                                        className={`p-3 rounded-2xl border-2 text-left flex items-center gap-3 transition-all duration-300 hover:scale-[1.02] active:scale-[0.97] group relative overflow-hidden ${isSelected
                                                            ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white shadow-2xl shadow-[var(--color-primary)]/30 z-10'
                                                            : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-surface-alt)] shadow-sm'
                                                            }`}
                                                    >
                                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all duration-500 ${isSelected ? 'bg-white/20 text-white rotate-[360deg]' : 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] group-hover:bg-[var(--color-primary)] group-hover:text-white'
                                                            }`}>
                                                            <FontAwesomeIcon icon={faGraduationCap} className="text-xs" />
                                                        </div>
                                                        <div className="flex-1 min-w-0 pr-10">
                                                            <div className="flex items-center gap-2">
                                                                <p className="font-black text-[11px] uppercase tracking-wider truncate leading-tight">{c.name}</p>
                                                                {/* Inline Gender Icon */}
                                                                {(isPutra || isPutri) && (
                                                                    <FontAwesomeIcon
                                                                        icon={isPutra ? faMars : faVenus}
                                                                        className={`text-[8px] ${isSelected ? 'text-white' : isPutra ? 'text-blue-500' : 'text-pink-500'} opacity-70`}
                                                                    />
                                                                )}
                                                            </div>
                                                            <p className={`text-[9px] mt-0.5 font-medium ${isSelected ? 'text-white/60' : 'text-[var(--color-text-muted)]'}`}>Pilih sebagai tujuan</p>
                                                        </div>

                                                        {/* Selection Indicator */}
                                                        <div className={`absolute right-4 top-1/2 -translate-y-1/2 transition-all duration-300 ${isSelected ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}>
                                                            <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center border border-white/40">
                                                                <FontAwesomeIcon icon={faCheck} className="text-[10px]" />
                                                            </div>
                                                        </div>

                                                        {/* Bottom Gender Badge */}
                                                        {(isPutra || isPutri) && !isSelected && (
                                                            <div className={`absolute bottom-0 right-0 px-2 py-0.5 rounded-tl-xl text-[7px] font-black uppercase tracking-tighter ${isPutra ? 'bg-blue-100 text-blue-600' : 'bg-pink-100 text-pink-600'
                                                                }`}>
                                                                {isPutra ? 'Putra' : 'Putri'}
                                                            </div>
                                                        )}

                                                        {/* Subtle Shine Effect */}
                                                        {isSelected && (
                                                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
                                                        )}
                                                    </button>
                                                );
                                            })}
                                    </div>
                                </div>

                                {/* Information Alert */}
                                <div className="p-4 rounded-2xl bg-[var(--color-primary)]/5 border border-[var(--color-primary)]/15 flex gap-4 items-start">
                                    <div className="w-8 h-8 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center shrink-0">
                                        <FontAwesomeIcon icon={faInfoCircle} className="text-sm" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[11px] font-black text-[var(--color-primary)] uppercase tracking-widest">Informasi Sistem</p>
                                        <p className="text-[10px] text-[var(--color-text-muted)] font-medium leading-relaxed">
                                            Proses ini akan memperbarui status kelas siswa secara permanen. Pastikan Anda telah melakukan verifikasi terhadap daftar siswa dan kelas tujuan sebelum menekan tombol konfirmasi.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </Modal>
                    )
                }

                {/* Delete (Arsip) Modal */}
                {
                    activeModal === 'delete' && (
                        <Modal
                            isOpen={activeModal === 'delete'}
                            onClose={() => closeModal()}
                            title="Konfirmasi Arsip"
                            description="Siswa akan dipindahkan ke folder Arsip"
                            icon={faBoxArchive}
                            iconBg="bg-amber-500/10"
                            iconColor="text-amber-600"
                            size="sm"
                            mobileVariant="bottom-sheet"
                            footer={
                                <div className="flex items-center w-full gap-3">
                                    <button
                                        type="button"
                                        onClick={() => closeModal()}
                                        className="h-10 px-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] text-[10px] font-black uppercase tracking-widest transition-all shrink-0"
                                    >
                                        Batal
                                    </button>
                                    <div className="flex-1" />
                                    <button
                                        type="button"
                                        onClick={executeDelete}
                                        className="h-10 px-6 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 shrink-0"
                                    >
                                        <FontAwesomeIcon icon={faBoxArchive} className="text-[11px] opacity-70" />
                                        Arsipkan
                                    </button>
                                </div>
                            }
                        >
                            <div className="px-1">
                                <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed font-bold">
                                    Siswa <span className="text-amber-600 font-black px-1.5 py-0.5 bg-amber-500/10 rounded-md border border-amber-500/20">{studentToDelete?.name}</span> akan diarsipkan. Riwayat laporan & poin tetap tersimpan dengan aman.
                                </p>
                            </div>
                        </Modal>
                    )
                }

                {/* Bulk Delete Modal */}
                {
                    activeModal === 'bulkDelete' && (
                        <Modal
                            isOpen={activeModal === 'bulkDelete'}
                            onClose={() => closeModal()}
                            title="Konfirmasi Hapus"
                            description={`${selectedStudentIds.length} siswa akan dihapus secara permanen`}
                            icon={faTrash}
                            iconBg="bg-red-500/10"
                            iconColor="text-red-500"
                            size="sm"
                            mobileVariant="bottom-sheet"
                            footer={
                                <div className="flex items-center w-full gap-3">
                                    <button
                                        type="button"
                                        onClick={() => closeModal()}
                                        className="h-10 px-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] text-[10px] font-black uppercase tracking-widest transition-all shrink-0"
                                    >
                                        Batal
                                    </button>
                                    <div className="flex-1" />
                                    <button
                                        type="button"
                                        onClick={handleBulkDelete}
                                        disabled={submitting}
                                        className="h-10 px-6 rounded-xl bg-red-500 hover:bg-red-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shrink-0"
                                    >
                                        {submitting ? <FontAwesomeIcon icon={faSpinner} className="fa-spin" /> : (
                                            <>
                                                <FontAwesomeIcon icon={faTrash} className="text-[11px] opacity-70" />
                                                Hapus Permanen
                                            </>
                                        )}
                                    </button>
                                </div>
                            }
                        >
                            <div className="px-1">
                                <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed font-bold">
                                    Anda akan menghapus <span className="text-red-500 font-black bg-red-500/10 px-1.5 py-0.5 rounded-md border border-red-500/20">{selectedStudentIds.length} siswa</span>. Tindakan ini tidak dapat dibatalkan. Riwayat behavior mereka akan hilang.
                                </p>
                            </div>
                        </Modal>
                    )
                }
                {/* Modal Arsip Siswa */}
                <StudentArchiveModal
                    isOpen={activeModal === 'archived'}
                    onClose={closeModal}
                    archivedStudents={archivedStudents}
                    loadingArchived={loadingArchived}
                    setArchivedStudents={setArchivedStudents}
                    fetchArchivedStudents={fetchArchivedStudents}
                    fetchData={fetchData}
                    fetchStats={fetchStats}
                    addToast={addToast}
                />

                {/* Modal Riwayat Kelas */}
                <StudentClassHistoryModal
                    isOpen={activeModal === 'classHistory'}
                    onClose={() => closeModal()}
                    selectedStudent={selectedStudent}
                    loading={loadingClassHistory}
                    history={classHistory}
                />

                {/* Fitur 1 - Class Breakdown Modal */}
                {
                    activeModal === 'classBreakdown' && (
                        <Modal
                            isOpen={activeModal === 'classBreakdown'}
                            onClose={() => closeModal()}
                            title={`Statistik Kelas — ${classBreakdownData?.className || ''}`}
                            description="Ringkasan data, demografi, dan performa poin per kelas."
                            icon={faChartPie}
                            iconBg="bg-indigo-500/10"
                            iconColor="text-indigo-600"
                            size="md"
                            mobileVariant="bottom-sheet"
                        >
                            {loadingBreakdown ? (
                                <div className="text-center py-10 text-[var(--color-text-muted)]">
                                    <FontAwesomeIcon icon={faSpinner} className="fa-spin text-2xl mb-2 block" />
                                    <p className="text-sm">Memuat statistik...</p>
                                </div>
                            ) : classBreakdownData && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                        {[
                                            { label: 'Total Siswa', value: classBreakdownData.total, color: 'text-[var(--color-primary)]' },
                                            { label: 'Putra', value: classBreakdownData.boys, color: 'text-blue-500' },
                                            { label: 'Putri', value: classBreakdownData.girls, color: 'text-pink-500' },
                                            { label: 'Rata-rata Poin', value: classBreakdownData.avgPoints, color: classBreakdownData.avgPoints >= 0 ? 'text-emerald-500' : 'text-red-500' },
                                        ].map(item => (
                                            <div key={item.label} className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/40 text-center">
                                                <p className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-1">{item.label}</p>
                                                <p className={`text-xl font-black ${item.color}`}>{item.value}</p>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="p-3 rounded-xl border border-red-500/20 bg-red-500/5 flex items-center gap-3">
                                        <FontAwesomeIcon icon={faTriangleExclamation} className="text-red-500 shrink-0" />
                                        <div>
                                            <p className="text-[10px] font-black text-red-600 dark:text-red-400 uppercase">Siswa Risiko (â‰¤ {RiskThreshold})</p>
                                            <p className="text-lg font-black text-red-500">{classBreakdownData.riskCount} siswa</p>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                            <FontAwesomeIcon icon={faTrophy} className="text-amber-500" />
                                            Top 3 Poin Tertinggi
                                        </p>
                                        <div className="space-y-2">
                                            {classBreakdownData.topStudents.map((s, idx) => (
                                                <div key={s.id} className="flex items-center gap-3 p-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/30">
                                                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${idx === 0 ? 'bg-yellow-400/20 text-yellow-600' :
                                                        idx === 1 ? 'bg-gray-400/20 text-gray-500' :
                                                            'bg-orange-400/20 text-orange-600'
                                                        }`}>#{idx + 1}</span>
                                                    <span className="flex-1 text-sm font-bold text-[var(--color-text)] truncate">{s.name}</span>
                                                    <span className={`text-sm font-black ${s.total_points >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{s.total_points}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex justify-end">
                                        <button onClick={() => { closeModal(); setFilterClass(''); const cls = classesList.find(c => c.name === classBreakdownData.className); if (cls) setFilterClass(cls.id) }}
                                            className="btn bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/20 h-9 px-5 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-[var(--color-primary)]/20 transition">
                                            Filter Kelas Ini
                                        </button>
                                    </div>
                                </div>
                            )}
                        </Modal>
                    )
                }


                {/* Modal Kelola Label —” lazy loaded */}
                {
                    activeModal === 'tag' && (
                        <React.Suspense fallback={null}>
                            <LazyStudentTagModal
                                isOpen={activeModal === 'tag'}
                                onClose={closeModal}
                                student={studentForTags}
                                allUsedTags={allUsedTags}
                                handleToggleTag={handleToggleTag}
                                tagToEdit={tagToEdit}
                                setTagToEdit={setTagToEdit}
                                renameInput={renameInput}
                                setRenameInput={setRenameInput}
                                handleGlobalRenameTag={handleGlobalRenameTag}
                                handleGlobalDeleteTag={handleGlobalDeleteTag}
                            />
                        </React.Suspense>
                    )
                }

                {/* Fitur 12 - Google Sheets Import Modal */}
                <StudentGSheetsModal
                    isOpen={activeModal === 'gsheets'}
                    onClose={closeModal}
                    gSheetsUrl={gSheetsUrl}
                    setGSheetsUrl={setGSheetsUrl}
                    fetchingGSheets={fetchingGSheets}
                    handleFetchGSheets={handleFetchGSheets}
                    onDownloadTemplate={handleDownloadTemplate}
                />

                {/* Fitur 13 - Photo Zoom Overlay */}
                {/* Photo Zoom Modal */}
                {
                    photoZoom && (
                        <Modal
                            isOpen={!!photoZoom}
                            onClose={() => setPhotoZoom(null)}
                            title="Foto Profil"
                            description="Preview foto profil siswa"
                            icon={faImage}
                            iconBg="bg-[var(--color-primary)]/10"
                            iconColor="text-[var(--color-primary)]"
                            size="md"
                            noPadding={true}
                            contentClassName="flex flex-col bg-[var(--color-surface-alt)]"
                            footer={
                                <div className="flex items-center justify-between w-full gap-3">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <div className="w-8 h-8 rounded-lg bg-[var(--color-primary)]/10 flex items-center justify-center text-[var(--color-primary)] text-xs font-black shrink-0">
                                            {(photoZoom.name || '?').charAt(0)}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[10px] font-bold text-[var(--color-text)] truncate">{photoZoom.name}</p>
                                            <p className="text-[8px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider truncate">
                                                {[photoZoom.registrationCode, photoZoom.className].filter(Boolean).join(' • ')}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <button
                                            onClick={async () => {
                                                try {
                                                    const res = await fetch(photoZoom.url)
                                                    const blob = await res.blob()
                                                    const url = URL.createObjectURL(blob)
                                                    const a = document.createElement('a')
                                                    a.href = url
                                                    a.download = `${(photoZoom.name || 'foto').replace(/\s+/g, '_')}.jpg`
                                                    document.body.appendChild(a)
                                                    a.click()
                                                    document.body.removeChild(a)
                                                    URL.revokeObjectURL(url)
                                                } catch { }
                                            }}
                                            className="h-9 px-4 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-[9px] font-black uppercase tracking-widest hover:bg-[var(--color-primary)] hover:text-white transition-all flex items-center gap-2 border border-[var(--color-primary)]/20"
                                        >
                                            <FontAwesomeIcon icon={faDownload} className="text-[10px]" /> Download
                                        </button>
                                    </div>
                                </div>
                            }
                        >
                            <div className="relative w-full aspect-[3/4] sm:aspect-auto sm:h-[55vh] flex items-center justify-center p-6">
                                <img
                                    src={photoZoom.url}
                                    alt={photoZoom.name}
                                    className="max-w-full max-h-full rounded-2xl object-contain shadow-2xl ring-1 ring-white/10"
                                    onError={(e) => { e.target.onerror = null; e.target.src = '' }}
                                />
                            </div>
                        </Modal>
                    )
                }

                {/* CSS Print Styles */}
                <style dangerouslySetInnerHTML={{
                    __html: `
                @media print {
                    /* Reset everything */
                    body > *:not(#portal-root) { 
                        position: absolute !important;
                        left: -9999px !important;
                        visibility: hidden !important;
                    }
                    #portal-root { 
                        display: block !important; 
                        position: static !important; 
                        visibility: visible !important;
                    }
                    
                    /* Background Colors */
                    * {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }

                    /* Portal Content Positioning */
                    .modal-overlay {
                        position: fixed !important;
                        top: 0 !important; left: 0 !important;
                        width: 100vw !important; height: 100vh !important;
                        background: white !important;
                        display: block !important;
                        visibility: visible !important;
                        z-index: 9999999 !important;
                        padding: 0 !important; margin: 0 !important;
                        backdrop-filter: none !important;
                    }

                    .modal-content {
                        position: relative !important;
                        top: 0 !important; left: 0 !important;
                        width: 100% !important; max-width: none !important;
                        height: auto !important;
                        box-shadow: none !important;
                        border: none !important;
                        padding: 20mm 0 !important; margin: 0 !important;
                        display: block !important;
                        visibility: visible !important;
                        background: white !important;
                    }

                    /* Hide Non-Card Elements */
                    .modal-content > div:first-child,
                    .no-print, 
                    button {
                        display: none !important;
                        visibility: hidden !important;
                    }

                    /* Card Container for Print */
                    #printable-cards {
                        display: flex !important;
                        flex-direction: row !important;
                        gap: 15mm !important;
                        justify-content: center !important;
                        align-items: center !important;
                        visibility: visible !important;
                        opacity: 1 !important;
                        transform: none !important;
                        scale: 1 !important;
                        margin: 0 auto !important;
                    }
                    
                    #printable-cards * {
                        visibility: visible !important;
                    }

                    /* Layout Setup */
                    @page {
                        size: landscape;
                        margin: 0;
                    }
                }
            `}} />
                {/* ===================== */}
                {/* FLOATING BULK ACTION BAR - SaaS STYLE */}
                {/* ===================== */}
                   {
                    selectedStudentIds.length > 0 && createPortal(
                        <div
                            className="fixed -translate-x-1/2 z-[250] w-[95%] md:w-max max-w-[95%] animate-in fade-in slide-in-from-bottom-8 duration-700 cubic-bezier(0.34, 1.56, 0.64, 1)"
                            style={{ 
                                left: dir === 'rtl'
                                    ? 'calc(50vw - (var(--sidebar-width, 0px) / 2))'
                                    : 'calc(50vw + (var(--sidebar-width, 0px) / 2))',
                                bottom: 'var(--floating-bar-bottom, 16px)' 
                            }}
                        >
                            <div className="relative">
                                <div className="relative glass-morphism bg-gray-900/90 dark:bg-gray-800/95 backdrop-blur-3xl border border-white/20 rounded-2xl px-3 py-2 flex items-center gap-4 text-white overflow-hidden shadow-2xl">
                                    {/* Animated scanline */}
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />

                                    {/* Left: count badge + label */}
                                    <div className="flex items-center gap-2 shrink-0">
                                        <div className="w-9 h-9 rounded-xl bg-indigo-500 flex items-center justify-center font-black text-sm shrink-0">
                                            {selectedStudentIds.length}
                                        </div>
                                        <div className="hidden md:block">
                                            <p className="text-[9px] font-black uppercase tracking-widest opacity-50 leading-none">Terpilih</p>
                                            <p className="text-[10px] font-bold leading-none mt-0.5">Aksi Massal</p>
                                        </div>
                                    </div>

                                    {/* Divider */}
                                    <div className="w-px h-6 bg-white/10 shrink-0 hidden md:block" />

                                    {/* Center: action buttons */}
                                    <div className="flex items-center gap-1.5 py-0.5 overflow-x-auto no-scrollbar">
                                        <button
                                            onClick={handleBulkWA}
                                            className="h-8 w-8 md:w-auto md:px-3 shrink-0 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all duration-200 flex items-center justify-center md:justify-start gap-1.5 text-[9px] font-black uppercase tracking-widest"
                                            title="Broadcast WA"
                                        >
                                            <FontAwesomeIcon icon={faWhatsapp} className="text-sm" />
                                            <span className="hidden md:inline">Whatsapp</span>
                                        </button>

                                        {canPrintCard && (
                                            <button
                                                onClick={handleBulkPrint}
                                                className="h-8 w-8 md:w-auto md:px-3 shrink-0 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500 hover:text-white transition-all duration-200 flex items-center justify-center md:justify-start gap-1.5 text-[9px] font-black uppercase tracking-widest"
                                                title="Cetak Kartu"
                                            >
                                                <FontAwesomeIcon icon={faPrint} className="text-sm" />
                                                <span className="hidden md:inline">Cetak</span>
                                            </button>
                                        )}

                                        {canBulkTag && (
                                            <button
                                                onClick={() => setActiveModal('bulkTag')}
                                                className="h-8 w-8 md:w-auto md:px-3 shrink-0 rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20 hover:bg-violet-500 hover:text-white transition-all duration-200 flex items-center justify-center md:justify-start gap-1.5 text-[9px] font-black uppercase tracking-widest"
                                                title="Beri Label"
                                            >
                                                <FontAwesomeIcon icon={faTags} className="text-sm" />
                                                <span className="hidden md:inline">Label</span>
                                            </button>
                                        )}

                                        {canPromote && (
                                            <button
                                                onClick={() => setActiveModal('bulkPromote')}
                                                className="h-8 w-8 md:w-auto md:px-3 shrink-0 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500 hover:text-white transition-all duration-200 flex items-center justify-center md:justify-start gap-1.5 text-[9px] font-black uppercase tracking-widest"
                                                title="Naik Kelas"
                                            >
                                                <FontAwesomeIcon icon={faGraduationCap} className="text-sm" />
                                                <span className="hidden md:inline">Naik</span>
                                            </button>
                                        )}

                                        {canBulkPoint && (
                                            <button
                                                onClick={() => setActiveModal('bulkPoint')}
                                                className="h-8 w-8 md:w-auto md:px-3 shrink-0 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20 hover:bg-orange-500 hover:text-white transition-all duration-200 flex items-center justify-center md:justify-start gap-1.5 text-[9px] font-black uppercase tracking-widest"
                                                title="Beri Poin"
                                            >
                                                <FontAwesomeIcon icon={faBolt} className="text-sm" />
                                                <span className="hidden md:inline">Poin</span>
                                            </button>
                                        )}
                                        {canBulkRoom && (
                                            <button
                                                onClick={() => setActiveModal('bulkRoom')}
                                                className="h-8 w-8 md:w-auto md:px-3 shrink-0 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20 hover:bg-teal-500 hover:text-white transition-all duration-200 flex items-center justify-center md:justify-start gap-1.5 text-[9px] font-black uppercase tracking-widest"
                                                title="Tetapkan Kamar"
                                            >
                                                <FontAwesomeIcon icon={faDoorOpen} className="text-sm" />
                                                <span className="hidden md:inline">Kamar</span>
                                            </button>
                                        )}
                                    </div>

                                    {/* Right: dismiss */}
                                    <div className="w-px h-6 bg-white/10 shrink-0" />
                                    <button
                                        onClick={() => setSelectedStudentIds([])}
                                        className="h-9 w-9 flex items-center justify-center rounded-xl bg-white/5 hover:bg-red-500/20 hover:text-red-400 transition-all text-white/50 shrink-0"
                                        title="Batal Pilih"
                                    >
                                        <FontAwesomeIcon icon={faXmark} />
                                    </button>
                                </div>
                            </div>
                        </div>,
                        document.body
                    )
                }
                {/* ===================== */}
                {/* BULK TAG MODAL - SaaS STYLE */}
                {/* ===================== */}
                {
                    activeModal === 'bulkTag' && (
                        <Modal
                            isOpen={activeModal === 'bulkTag'}
                            onClose={() => closeModal()}
                            title={`Aksi Label Massal — ${selectedStudentIds.length} Siswa`}
                            description="Tambah atau hapus label untuk rombongan siswa terpilih."
                            icon={faTags}
                            iconBg="bg-indigo-500/10"
                            iconColor="text-indigo-600"
                            size="sm"
                            mobileVariant="bottom-sheet"
                            footer={
                                <div className="flex justify-end">
                                    <button
                                        onClick={() => closeModal()}
                                        className="h-11 px-8 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-indigo-700 transition-all active:scale-95 shadow-lg shadow-indigo-600/20"
                                    >
                                        Selesai
                                    </button>
                                </div>
                            }
                        >
                            <div className="space-y-4 md:space-y-6">
                                {<SelectedStudentsCarousel
                                    selectedStudents={selectedStudents}
                                    removingStudentId={removingStudentId}
                                    setRemovingStudentId={setRemovingStudentId}
                                    toggleSelectStudent={toggleSelectStudent}
                                />}

                                <div className="h-px bg-gradient-to-r from-transparent via-[var(--color-border)] to-transparent" />

                                {/* Mode Toggle */}
                                <div className="flex p-1 bg-[var(--color-surface-alt)] rounded-xl border border-[var(--color-border)]">
                                    <button
                                        onClick={() => setBulkTagAction('add')}
                                        className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${bulkTagAction === 'add' ? 'bg-indigo-500 text-white shadow-lg' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
                                    >
                                        Tambah Label
                                    </button>
                                    <button
                                        onClick={() => setBulkTagAction('remove')}
                                        className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${bulkTagAction === 'remove' ? 'bg-red-500 text-white shadow-lg' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
                                    >
                                        Hapus Label
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Pilih Label untuk Diaplikasikan</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {Array.from(new Set([...AvailableTags, ...allUsedTags])).sort().map(tag => (
                                            <button
                                                key={tag}
                                                onClick={() => handleBulkTagApply(tag)}
                                                disabled={submitting}
                                                className={`p-3 rounded-xl border text-xs font-bold transition-all text-left flex items-center justify-between group hover:scale-[1.02] active:scale-95 ${bulkTagAction === 'add'
                                                    ? 'hover:border-indigo-500 hover:bg-indigo-500/5'
                                                    : 'hover:border-red-500 hover:bg-red-500/5'
                                                    } border-[var(--color-border)] bg-[var(--color-surface)]`}
                                            >
                                                <span className="flex items-center gap-2 truncate">
                                                    <div className={`w-2 h-2 rounded-full shrink-0 ${getTagColor(tag).split(' ')[0]}`} />
                                                    <span className="truncate">{tag}</span>
                                                </span>
                                                <FontAwesomeIcon
                                                    icon={bulkTagAction === 'add' ? faPlus : faTrash}
                                                    className={`text-[9px] opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ${bulkTagAction === 'add' ? 'text-indigo-500' : 'text-red-500'}`}
                                                />
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10">
                                    <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold leading-relaxed">
                                        {bulkTagAction === 'add'
                                            ? `* Memilih label akan MENAMBAHKAN label tersebut ke SEMUA (${selectedStudentIds.length}) siswa yang Anda pilih.`
                                            : `* Memilih label akan MENGHAPUS label tersebut dari SEMUA (${selectedStudentIds.length}) siswa yang memiliki label itu.`}
                                    </p>
                                </div>
                            </div>
                        </Modal>
                    )
                }
                {/* ===================== */}
                {/* BULK POINT MODAL - SaaS STYLE */}
                {/* ===================== */}
                {
                    canBulkPoint && activeModal === 'bulkPoint' && (
                        <Modal
                            isOpen={activeModal === 'bulkPoint'}
                            onClose={() => closeModal()}
                            title={`Aksi Poin Massal — ${selectedStudentIds.length} Siswa`}
                            description="Berikan poin positif atau negatif ke seluruh siswa terpilih."
                            icon={faBolt}
                            iconBg="bg-orange-500/10"
                            iconColor="text-orange-500"
                            size="sm"
                            mobileVariant="bottom-sheet"
                            footer={
                                <div className="space-y-3">
                                    <div className="flex p-3 rounded-2xl bg-amber-500/5 border border-amber-500/10 gap-3 items-start">
                                        <FontAwesomeIcon icon={faCircleExclamation} className="text-amber-500 mt-0.5" />
                                        <p className="text-[10px] text-amber-700 dark:text-amber-400 font-bold leading-relaxed">
                                            Poin akan ditambahkan ke total poin masing-masing siswa. Pastikan jumlah dan alasan sudah benar sebelum memproses.
                                        </p>
                                    </div>
                                    <div className="flex gap-3">
                                        <button
                                            type="button"
                                            onClick={() => closeModal()}
                                            className="flex-1 h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] text-[10px] font-black uppercase tracking-widest hover:bg-[var(--color-surface-alt)] transition-all"
                                        >
                                            Batal
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleBulkPointUpdate}
                                            disabled={submitting || !bulkPointValue}
                                            className="flex-[2] h-11 rounded-xl bg-orange-500 text-white text-[10px] font-black uppercase tracking-widest hover:brightness-110 transition-all disabled:opacity-50 shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2"
                                        >
                                            {submitting ? <FontAwesomeIcon icon={faSpinner} className="fa-spin" /> : (
                                                <>
                                                    <FontAwesomeIcon icon={faBolt} className="text-xs" />
                                                    Proses Poin Massal
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            }
                        >
                            <div className="space-y-4 md:space-y-6">
                                {<SelectedStudentsCarousel
                                    selectedStudents={selectedStudents}
                                    removingStudentId={removingStudentId}
                                    setRemovingStudentId={setRemovingStudentId}
                                    toggleSelectStudent={toggleSelectStudent}
                                />}

                                <div className="h-px bg-gradient-to-r from-transparent via-[var(--color-border)] to-transparent" />

                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] block mb-2">Jumlah Poin</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={bulkPointValue}
                                                onChange={e => setBulkPointValue(Number(e.target.value))}
                                                placeholder="Contoh: 10 atau -10"
                                                className="input-field w-full h-12 px-4 pr-24 rounded-xl border-[var(--color-border)] bg-[var(--color-surface-alt)] text-lg font-black [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 outline-none transition-all"
                                            />
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1">
                                                <button onClick={() => setBulkPointValue(10)} className="h-7 px-2 rounded-lg bg-emerald-500/10 text-emerald-600 text-[9px] font-black hover:bg-emerald-500 hover:text-white transition-all">+10</button>
                                                <button onClick={() => setBulkPointValue(-10)} className="h-7 px-2 rounded-lg bg-red-500/10 text-red-600 text-[9px] font-black hover:bg-red-500 hover:text-white transition-all">-10</button>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] block mb-2">Alasan / Keterangan</label>
                                        <input
                                            type="text"
                                            value={bulkPointLabel}
                                            onChange={e => setBulkPointLabel(e.target.value)}
                                            placeholder="Contoh: Hadiah Lomba Kebersihan"
                                            className="input-field w-full h-11 px-4 rounded-xl border-[var(--color-border)] bg-[var(--color-surface-alt)] text-sm font-bold focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 outline-none transition-all"
                                        />
                                    </div>
                                </div>
                            </div>
                        </Modal>
                    )
                }
                {/* ===================== */}
                {/* BULK ROOM MODAL - SaaS STYLE */}
                {/* ===================== */}
                {
                    canBulkRoom && activeModal === 'bulkRoom' && (
                        <Modal
                            isOpen={activeModal === 'bulkRoom'}
                            onClose={() => closeModal()}
                            title={`Penetapan Kamar Massal — ${selectedStudentIds.length} Siswa`}
                            description="Pindahkan santri terpilih ke kamar asrama secara sekaligus."
                            icon={faDoorOpen}
                            iconBg="bg-teal-500/10"
                            iconColor="text-teal-600"
                            size="sm"
                            mobileVariant="bottom-sheet"
                            footer={
                                <div className="space-y-3">
                                    {bulkRoomId && (
                                        <div className="flex p-3 rounded-2xl bg-teal-500/5 border border-teal-500/15 gap-3 items-start">
                                            <FontAwesomeIcon icon={faCircleExclamation} className="text-teal-500 mt-0.5 shrink-0" />
                                            <p className="text-[10px] text-teal-700 dark:text-teal-400 font-bold leading-relaxed">
                                                {selectedStudentIds.length} siswa akan ditetapkan ke kamar
                                                <span className="font-black mx-1">
                                                    {bulkRoomId === '-' ? 'Lainnya / Kosong' : bulkRoomId}
                                                </span>.
                                                Kamar sebelumnya akan ditimpa.
                                            </p>
                                        </div>
                                    )}
                                    <div className="flex gap-3">
                                        <button
                                            type="button"
                                            onClick={() => closeModal()}
                                            className="flex-1 h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] text-[10px] font-black uppercase tracking-widest transition-all"
                                        >
                                            Batal
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleBulkRoomAssign}
                                            disabled={submitting || !bulkRoomId}
                                            className="flex-[2] h-11 rounded-xl bg-teal-500 text-white text-[10px] font-black uppercase tracking-widest hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-teal-500/20"
                                        >
                                            {submitting ? <FontAwesomeIcon icon={faSpinner} className="fa-spin" /> : (
                                                <><FontAwesomeIcon icon={faDoorOpen} className="text-xs" /> Tetapkan Kamar</>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            }
                        >
                            <div className="space-y-4 md:space-y-6">
                                {<SelectedStudentsCarousel
                                    selectedStudents={selectedStudents}
                                    removingStudentId={removingStudentId}
                                    setRemovingStudentId={setRemovingStudentId}
                                    toggleSelectStudent={toggleSelectStudent}
                                />}

                                <div className="h-px bg-gradient-to-r from-transparent via-[var(--color-border)] to-transparent" />
                                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] block mb-3">Pilih Kamar Tujuan</label>

                                {/* Opsi Kosongkan */}
                                <button
                                    type="button"
                                    onClick={() => setBulkRoomId(bulkRoomId === '-' ? '' : '-')}
                                    className={`w-full p-3 rounded-xl border text-xs font-bold transition-all text-left flex items-center gap-3 hover:scale-[1.01] active:scale-95 ${bulkRoomId === '-'
                                        ? 'bg-amber-500/10 border-amber-500 text-amber-700'
                                        : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:border-amber-500/40 hover:bg-amber-500/5'
                                        }`}
                                >
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${bulkRoomId === '-' ? 'bg-amber-500 text-white' : 'bg-amber-500/10 text-amber-500'}`}>
                                        <FontAwesomeIcon icon={faDoorOpen} className="text-xs" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-black text-[11px]">Lainnya / Kosongkan</p>
                                        <p className="text-[9px] opacity-60 mt-0.5">Hapus penugasan kamar untuk siswa terpilih</p>
                                    </div>
                                    {bulkRoomId === '-' && <FontAwesomeIcon icon={faCheck} className="ml-auto text-amber-600 text-xs" />}
                                </button>

                                <div className="h-px bg-[var(--color-border)] my-1" />

                                {/* Daftar Kamar */}
                                {LIST_KAMAR.map(kamar => (
                                    <button
                                        key={kamar.id}
                                        type="button"
                                        onClick={() => setBulkRoomId(bulkRoomId === kamar.id ? '' : kamar.id)}
                                        className={`w-full p-3 rounded-xl border text-xs font-bold transition-all text-left flex items-center gap-3 hover:scale-[1.01] active:scale-95 ${bulkRoomId === kamar.id
                                            ? 'bg-teal-500/10 border-teal-500 text-teal-700 dark:text-teal-300'
                                            : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:border-teal-500/40 hover:bg-teal-500/5'
                                            }`}
                                    >
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${bulkRoomId === kamar.id ? 'bg-teal-500 text-white' : 'bg-teal-500/10 text-teal-600'}`}>
                                            <FontAwesomeIcon icon={faDoorOpen} className="text-xs" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-black text-[11px]">{kamar.id}</p>
                                            <p className="text-[9px] opacity-50 mt-0.5 font-medium" dir="rtl">{kamar.ar}</p>
                                        </div>
                                        {bulkRoomId === kamar.id && <FontAwesomeIcon icon={faCheck} className="ml-auto text-teal-600 text-xs shrink-0" />}
                                    </button>
                                ))}
                            </div>
                        </Modal>
                    )
                }
            </div >
        </DashboardLayout >
    )
}