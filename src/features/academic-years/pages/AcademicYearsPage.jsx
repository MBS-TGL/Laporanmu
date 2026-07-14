import React, { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react'
import { createPortal } from 'react-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faPlus, faEdit, faTrash, faSearch, faSpinner, faCalendar,
    faCheckCircle, faXmark, faSliders, faBoxArchive, faRotateLeft,
    faKeyboard, faChevronLeft, faChevronRight, faGrip,
    faAnglesLeft, faAnglesRight, faDownload, faCopy,
    faGraduationCap, faLayerGroup, faCircleCheck, faCheck,
    faClock, faCalendarDay, faTableList, faHistory, faFileImport,
    faFingerprint, faTimeline, faTimes, faFileExport, faEye, faEyeSlash
} from '@fortawesome/free-solid-svg-icons'
import DashboardLayout from '@core/layouts/DashboardLayout'
import { useToast } from '@context/Toast'
import { useLanguage } from '@context/Language'
import { useAuth } from '@context/Auth'
import { useFlag } from '@context/FeatureFlags'
import { supabase } from '@lib/supabase'
import { logAudit } from '@utils/auditLogger'
import { useDebounce } from '@hooks/useDebounce'
import {
    PageHeader,
    Modal,
    Breadcrumb,
    Pagination,
    TableSkeleton,
    CardSkeleton,
    AuditTimeline,
    StatsCarousel,
    StatCard,
    EmptyState
} from '@shared/components'
import AcademicYearFormModal from '@features/academic-years/components/AcademicYearFormModal'
import { ArchiveModal, DeactivateModal } from '@features/academic-years/components/AcademicYearActionModals'
import AcademicYearArchiveModal from '@features/academic-years/components/AcademicYearArchiveModal'


const LazyAcademicYearExportModal = React.lazy(() => import('@features/academic-years/components/AcademicYearExportModal'))
const LazyAcademicYearImportModal = React.lazy(() => import('@features/academic-years/components/AcademicYearImportModal'))

const SYSTEM_COLS = [
    { key: 'name', label: 'Tahun Pelajaran (e.g. 2024/2025)' },
    { key: 'semester', label: 'Semester (Ganjil / Genap)' },
    { key: 'start_date', label: 'Tanggal Mulai (YYYY-MM-DD)' },
    { key: 'end_date', label: 'Tanggal Selesai (YYYY-MM-DD)' },
    { key: 'curriculum', label: 'Kurikulum (e.g. Merdeka)' },
]

const LS_COLS = 'academic_years_columns'
const LS_PAGE_SIZE = 'academic_years_page_size'

// Singleton portal manager — same pattern as StudentsPage
const _portalContainers = {}
function getPortalContainer(id) {
    if (typeof document === 'undefined') return null
    if (!_portalContainers[id]) {
        let el = document.getElementById(id)
        if (!el) {
            el = document.createElement('div')
            el.id = id
            document.body.appendChild(el)
        }
        _portalContainers[id] = el
    }
    return _portalContainers[id]
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
                placeholder="Cari nama tahun pelajaran (contoh: 2024/2025)... (Ctrl+K)"
                className="input-field pl-10 w-full h-9 text-xs sm:text-sm bg-[var(--color-surface-alt)]/50 border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/10 transition-all rounded-xl font-bold placeholder:font-normal placeholder:opacity-40"
            />
        </div>
    )
})
DebouncedSearchInput.displayName = 'DebouncedSearchInput'

function TimelineView({ years, onEdit, onHistory, onSetActive, onDuplicate, onDelete, onToggleLock, canEdit }) {
    if (years.length === 0) {
        return (
            <EmptyState
                icon={faSearch}
                title="Tidak Ada Data Ditemukan"
                description="Sesuaikan filter atau kata kunci pencarian Anda"
                color="indigo"
            />
        )
    }

    const sorted = [...years].sort((a, b) => new Date(a.start_date) - new Date(b.start_date))

    return (
        <div className="relative w-full overflow-hidden bg-[var(--color-surface-alt)]/10">
            {/* ── Premium Ambient Background ── */}
            <div className="absolute inset-0 opacity-20 pointer-events-none overflow-hidden">
                <div className="absolute top-0 left-1/4 w-[200px] h-[200px] bg-[var(--color-primary)]/10 blur-[80px] rounded-full animate-pulse" />
                <div className="absolute bottom-0 right-1/4 w-[200px] h-[200px] bg-indigo-500/10 blur-[80px] rounded-full" />
            </div>

            <div className="relative overflow-x-auto pb-8 pt-12 no-scrollbar select-none flex justify-start lg:justify-center" style={{ minHeight: '400px' }}>
                
                {/* ── Premium Ambient Background ── */}
                <div className="absolute inset-0 pointer-events-none opacity-[0.05] dark:opacity-[0.08]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, var(--color-text) 1px, transparent 0)', backgroundSize: '32px 32px' }} />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[10rem] md:text-[16rem] font-black font-heading tracking-widest text-[var(--color-text)] opacity-5 dark:opacity-10 pointer-events-none whitespace-nowrap select-none flex items-center justify-center">
                    TIMELINE
                </div>

                <div className="flex items-start px-8 md:px-32 relative mx-auto z-10" style={{ minWidth: 'max-content' }}>
                    {/* ── Global Timeline Path (Infinite) ── */}
                    <div className="absolute top-[72px] left-[-2000px] right-[-2000px] h-[3px] bg-gradient-to-r from-transparent via-[var(--color-border)] to-transparent opacity-60 pointer-events-none" />

                    {/* Active Gradient Path (Card Width) */}
                    <div className="absolute top-[72px] left-16 right-16 md:left-32 md:right-32 h-[3px] bg-gradient-to-r from-transparent via-[var(--color-primary)]/80 to-transparent shadow-[0_0_15px_rgba(var(--color-primary-rgb),0.5)] pointer-events-none" />

                    {sorted.map((year, idx) => {
                        const isActive = year.is_active
                        const isGanjil = year.semester === 'Ganjil'

                        return (
                            <div key={year.id} className="relative flex flex-col items-center group/item shrink-0" style={{ width: '260px' }}>
                                {/* ── Interactive Node Anchor ── */}
                                <div className="relative z-10 flex items-center justify-center w-14 h-14 mb-8">
                                    {/* Pulse Aura for Active */}
                                    {isActive && (
                                        <>
                                            <div className="absolute inset-0 bg-[var(--color-primary)]/20 rounded-full animate-ping duration-[3000ms]" />
                                            <div className="absolute inset-2 bg-[var(--color-primary)]/30 rounded-full animate-pulse duration-[2000ms]" />
                                        </>
                                    )}

                                    {/* Multi-layered Premium Node */}
                                    <div className={`relative flex items-center justify-center w-10 h-10 rounded-full border-[4px] border-[var(--color-surface)] transition-all duration-700 group-hover/item:scale-125 shadow-xl ${isActive ? 'bg-[var(--color-primary)] border-[var(--color-surface)] shadow-[0_0_25px_rgba(var(--color-primary-rgb),0.5)] scale-110' : 'bg-[var(--color-surface-alt)] border-[var(--color-border)] group-hover/item:border-[var(--color-primary)]'}`}>
                                        <div className={`w-3 h-3 rounded-full transition-all duration-500 ${isActive ? 'bg-white scale-110 shadow-[0_0_10px_white]' : 'bg-[var(--color-border)] group-hover/item:bg-[var(--color-primary)] shadow-none'}`} />
                                    </div>
                                </div>

                                {/* ── Visual Stalk (Connection) ── */}
                                <div className="relative w-[3px] h-12 -mt-8 mb-4 overflow-hidden rounded-full">
                                    <div className={`absolute inset-0 bg-gradient-to-b from-[var(--color-primary)]/80 to-transparent transition-opacity duration-700 ${isActive ? 'opacity-100' : 'opacity-0 group-hover/item:opacity-100'}`} />
                                    <div className={`absolute inset-0 bg-gradient-to-b from-[var(--color-border)] to-transparent transition-opacity duration-700 ${isActive ? 'opacity-0' : 'opacity-100 group-hover/item:opacity-0'}`} />
                                    {/* Micro-node anchor on path */}
                                    <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full shadow-sm ${isActive ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'}`} />
                                </div>

                                {/* ── Premium Card (Centered Layout) ── */}
                                <div className={`px-4 w-full transition-all duration-700 ${isActive ? 'opacity-100' : 'opacity-70 grayscale-[30%] group-hover/item:opacity-100 group-hover/item:grayscale-0'}`}>
                                    <div className={`relative group/card glass rounded-[1.5rem] p-5 border-2 transition-all duration-700 hover:-translate-y-2 hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.1)] flex flex-col items-center text-center ${isActive ? 'border-[var(--color-primary)]/50 shadow-xl shadow-[var(--color-primary)]/10 ring-4 ring-[var(--color-primary)]/5' : 'border-[var(--color-border)] hover:border-[var(--color-primary)]/40 shadow-lg shadow-black/[0.02]'}`}>
                                        {/* Dynamic Glow Layer */}
                                        <div className={`absolute -inset-3 rounded-[2.5rem] opacity-0 group-hover/card:opacity-10 dark:group-hover/card:opacity-20 transition-opacity duration-1000 pointer-events-none blur-xl ${isActive ? 'bg-[var(--color-primary)]' : 'bg-indigo-500'}`} />

                                        {/* Card Header & Badges (Centered) */}
                                        <div className="flex items-center justify-center gap-1.5 mb-3 flex-wrap">
                                            <div className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest shrink-0 ${isGanjil ? 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/10' : 'bg-purple-500/10 text-purple-600 border border-purple-500/10'}`}>
                                                {year.semester}
                                            </div>
                                            {isActive && (
                                                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-[9px] font-black shadow-sm border border-emerald-500/20">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
                                                    AKTIF
                                                </div>
                                            )}
                                            {year.is_locked && (
                                                <span className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest bg-rose-500/10 text-rose-600 border border-rose-500/20 flex items-center gap-1">
                                                    <FontAwesomeIcon icon={faBoxArchive} className="text-[7px]" />
                                                    TUTUP
                                                </span>
                                            )}
                                        </div>

                                        {/* Content Block (Centered) */}
                                        <div className="relative space-y-1.5 w-full">
                                            <p className="text-[8px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)] opacity-50 leading-none">Periode Akademik</p>
                                            <h4 className="text-2xl font-black font-heading tracking-tight text-[var(--color-text)] leading-none group-hover/card:text-[var(--color-primary)] transition-colors duration-500">
                                                {year.name}
                                            </h4>

                                            {/* Curriculum */}
                                            <div className="flex justify-center pt-1.5 pb-0.5">
                                                <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest border ${year.curriculum === 'Merdeka' ? 'bg-blue-500/10 text-blue-600 border-blue-500/20' : 'bg-orange-500/10 text-orange-600 border-orange-500/20'}`}>
                                                    Kurikulum {year.curriculum || 'Merdeka'}
                                                </span>
                                            </div>

                                            {/* Duration */}
                                            <div className="flex items-center justify-center gap-2 pt-3 mt-3 border-t border-[var(--color-border)] text-[var(--color-text-muted)] text-[10px] font-bold">
                                                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 bg-[var(--color-surface)] border border-[var(--color-border)] group-hover/card:border-[var(--color-primary)]/30 group-hover/card:text-[var(--color-primary)] transition-all`}>
                                                    <FontAwesomeIcon icon={faCalendarDay} className="text-[9px]" />
                                                </div>
                                                <div className="flex flex-col text-left">
                                                    <span className="text-[7px] font-black uppercase tracking-widest opacity-50 leading-none mb-0.5">Masa Berlaku</span>
                                                    <span className="leading-tight text-[9px] text-[var(--color-text)]">{new Date(year.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} — {new Date(year.end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: '2-digit' })}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Abstract Decorative SVG (Watermark) */}
                                        <div className="absolute right-4 bottom-4 opacity-[0.03] pointer-events-none group-hover/card:scale-150 group-hover/card:opacity-10 transition-all duration-1000 grayscale flex items-center justify-center">
                                            <FontAwesomeIcon icon={faTimeline} className="text-6xl" />
                                        </div>

                                        {/* Premium Action Layer */}
                                        <div className="mt-4 pt-3 border-t border-[var(--color-border)] flex flex-col gap-2.5 opacity-0 group-hover/card:opacity-100 translate-y-3 group-hover/card:translate-y-0 transition-all duration-500 w-full">
                                            {/* Primary Action (Full Width) */}
                                            {canEdit && !isActive && !year.is_locked && (
                                                <button onClick={() => onSetActive(year)} className="w-full h-8 rounded-xl bg-[var(--color-primary)] text-white text-[10px] font-black uppercase tracking-[0.1em] hover:shadow-[0_10px_20px_-5px_rgba(var(--color-primary-rgb),0.4)] hover:scale-[1.02] transition-all active:scale-95 flex items-center justify-center gap-2">
                                                    Aktifkan Periode
                                                </button>
                                            )}
                                            
                                            {/* Secondary Actions (Icon Row) */}
                                            <div className="flex items-center justify-center gap-2 w-full">
                                                {canEdit && (
                                                    <button onClick={() => onEdit(year)} className="w-8 h-8 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)] transition-all flex items-center justify-center">
                                                        <FontAwesomeIcon icon={faEdit} className="text-[10px]" />
                                                    </button>
                                                )}
                                                <button onClick={() => onHistory(year)} className="w-8 h-8 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-indigo-500 hover:border-indigo-500 transition-all flex items-center justify-center">
                                                    <FontAwesomeIcon icon={faHistory} className="text-[10px]" />
                                                </button>
                                                {canEdit && (
                                                    <button onClick={() => onDuplicate(year)} title="Duplikat" className="w-8 h-8 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-emerald-500 hover:border-emerald-500 transition-all flex items-center justify-center">
                                                        <FontAwesomeIcon icon={faCopy} className="text-[10px]" />
                                                    </button>
                                                )}
                                                {canEdit && !isActive && (
                                                    <button onClick={() => onToggleLock(year)} title={year.is_locked ? "Buka Buku" : "Tutup Buku"} className={`w-8 h-8 rounded-xl transition-all flex items-center justify-center ${year.is_locked ? 'bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white border border-rose-500/20' : 'bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-rose-500 hover:border-rose-500'}`}>
                                                        <FontAwesomeIcon icon={year.is_locked ? faRotateLeft : faBoxArchive} className="text-[10px]" />
                                                    </button>
                                                )}
                                                {canEdit && isActive && (
                                                    <button onClick={() => onDelete(year)} className="w-8 h-8 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center">
                                                        <FontAwesomeIcon icon={faBoxArchive} className="text-[10px]" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}




export default function AcademicYearsPage() {
    const { addToast, addUndoToast } = useToast()
    const { dir } = useLanguage()
    const { profile } = useAuth()
    const { enabled: canEdit } = useFlag('access.teacher_academic')

    const [years, setYears] = useState([])
    const [archivedYears, setArchivedYears] = useState([])
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [stats, setStats] = useState({ total: 0, active: 0, ganjil: 0, genap: 0 })

    // --- Stats Carousel Dot Indicator ---
    const statsScrollRef = useRef(null)
    const [activeStatIdx, setActiveStatIdx] = useState(0)
    const STAT_CARD_COUNT = 4

    // Search & Filter
    const [searchQuery, setSearchQuery] = useState('')
    const [filterSemester, setFilterSemester] = useState('')
    const [filterStatus, setFilterStatus] = useState('')
    const [filterCurriculum, setFilterCurriculum] = useState('')
    const [filterLock, setFilterLock] = useState('')
    const [filterTimeStatus, setFilterTimeStatus] = useState('') // 'Akan Datang' | 'Sedang Berjalan' | 'Sudah Selesai'
    const [sortBy, setSortBy] = useState('name_desc')
    const [isFilterOpen, setIsFilterOpen] = useState(false)

    // Pagination
    const [page, setPage] = useState(1)
    const [jumpPage, setJumpPage] = useState('')
    const [pageSize, setPageSize] = useState(() => {
        try { return Number(localStorage.getItem(LS_PAGE_SIZE)) || 10 } catch { return 10 }
    })

    // Selection
    const [selectedIds, setSelectedIds] = useState([])

    // Columns
    const defaultCols = { period: true, semester: true, curriculum: true, duration: true, status: true }
    const [visibleCols, setVisibleCols] = useState(() => {
        try { return JSON.parse(localStorage.getItem(LS_COLS)) || defaultCols }
        catch { return defaultCols }
    })
    const [isColMenuOpen, setIsColMenuOpen] = useState(false)
    const [colMenuPos, setColMenuPos] = useState({ top: 0, right: 0, showUp: false })
    const colMenuRef = useRef(null)
    const colMenuPortalRef = useRef(null)

    // UI
    const [isPrivacyMode, setIsPrivacyMode] = useState(false)
    const [mobileView, setMobileView] = useState(() => {
        try { return localStorage.getItem('ay_mobile_view') || 'card' } catch { return 'card' }
    }) // 'card' | 'list'
    const [isShortcutOpen, setIsShortcutOpen] = useState(false)
    const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false)
    const headerMenuRef = useRef(null)
    const shortcutRef = useRef(null)
    const headerMenuBtnRef = useRef(null)
    const shortcutBtnRef = useRef(null)
    const [headerMenuRect, setHeaderMenuRect] = useState(null)
    const [shortcutRect, setShortcutRect] = useState(null)
    // Deferred unmount: keeps portal in DOM for 200ms after close so exit animation can play
    const [headerMenuMounted, setHeaderMenuMounted] = useState(false)
    const searchInputRef = useRef(null)

    const [viewMode, setViewMode] = useState(() => {
        try { return localStorage.getItem('ay_view_mode') || 'table' } catch { return 'table' }
    }) // 'table' | 'timeline' | 'card'

    // Selection & Data state
    const [selectedItem, setSelectedItem] = useState(null)
    const [itemToDelete, setItemToDelete] = useState(null)
    const [itemToDeactivate, setItemToDeactivate] = useState(null)
    const [itemToPermanentDelete, setItemToPermanentDelete] = useState(null)
    const [readOnlyDetailItem, setReadOnlyDetailItem] = useState(null)
    const [historyItem, setHistoryItem] = useState(null)

    // Modal Visibility
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
    const [isArchivedOpen, setIsArchivedOpen] = useState(false)
    const [loadingArchived, setLoadingArchived] = useState(false)
    const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false)
    const [isPermanentDeleteOpen, setIsPermanentDeleteOpen] = useState(false)
    const [isDeactivateConfirmOpen, setIsDeactivateConfirmOpen] = useState(false)
    const [isReadOnlyDetailOpen, setIsReadOnlyDetailOpen] = useState(false)
    const [isHistoryOpen, setIsHistoryOpen] = useState(false)
    const [isImportModalOpen, setIsImportModalOpen] = useState(false)
    const [isExportModalOpen, setIsExportModalOpen] = useState(false)

    // Import State
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
    const importFileInputRef = useRef(null)

    // Export State
    const [exportScope, setExportScope] = useState('filtered')
    const [exportColumns, setExportColumns] = useState(['name', 'semester', 'start_date', 'end_date', 'curriculum', 'is_active', 'is_locked'])
    const [exporting, setExporting] = useState(false)

    // ── Fetch ────────────────────────────────────────────────────────────────
    const fetchData = useCallback(async () => {
        if (!supabase) return
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('academic_years')
                .select('id,name,semester,start_date,end_date,is_active,deleted_at,created_at,curriculum,is_locked')
                .order('name', { ascending: false })
            if (error) throw error
            const active = (data || []).filter(y => y.deleted_at === undefined || y.deleted_at === null)
            setYears(active)
            setStats({
                total: active.length,
                active: active.filter(y => y.is_active).length,
                ganjil: active.filter(y => y.semester === 'Ganjil').length,
                genap: active.filter(y => y.semester === 'Genap').length,
            })
        } catch { addToast('Gagal memuat data tahun pelajaran', 'error') }
        finally { setLoading(false) }
    }, [addToast])

    const fetchArchived = useCallback(async () => {
        if (!supabase) return
        setLoadingArchived(true)
        try {
            const { data } = await supabase
                .from('academic_years')
                .select('id,name,semester,start_date,end_date,is_active,deleted_at,created_at,curriculum,is_locked')
                .not('deleted_at', 'is', null)
                .order('created_at', { ascending: false })
            setArchivedYears(data || [])
        } catch { }
        finally { setLoadingArchived(false) }
    }, [])

    useEffect(() => { fetchData() }, [fetchData])

    useEffect(() => {
        const handler = (e) => {
            if (!isColMenuOpen) return
            const inBtn = colMenuRef.current?.contains(e.target)
            const inMenu = colMenuPortalRef.current?.contains(e.target)
            if (!inBtn && !inMenu) setIsColMenuOpen(false)
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [isColMenuOpen])

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
        const handler = (e) => {
            if (isModalOpen || isDeleteModalOpen) return
            const isTyping = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)

            if (e.key === 'Escape') {
                if (isTyping) { document.activeElement.blur() }
                else { setIsColMenuOpen(false); setIsHeaderMenuOpen(false); setIsShortcutOpen(false); setSearchQuery(''); setSelectedIds([]) }
                return
            }

            if (isTyping) return

            if (e.ctrlKey && e.key === 'k') { e.preventDefault(); searchInputRef.current?.focus() }
            else if (e.key === 'n') { e.preventDefault(); handleAdd() }
            else if (e.key === 'e' || e.key === 'E') { if (selectedIds.length === 1) { const item = years.find(y => y.id === selectedIds[0]); if (item) handleEdit(item) } }
            else if (e.key === 'x' || e.key === 'X') { resetAllFilters() }
            else if (e.key === '?') { setIsShortcutOpen(v => !v) }
        }
        document.addEventListener('keydown', handler)
        return () => document.removeEventListener('keydown', handler)
    }, [isModalOpen, isDeleteModalOpen, selectedIds, years])

    useEffect(() => {
        localStorage.setItem(LS_COLS, JSON.stringify(visibleCols))
    }, [visibleCols])
    useEffect(() => {
        localStorage.setItem(LS_PAGE_SIZE, pageSize)
    }, [pageSize])
    useEffect(() => {
        localStorage.setItem('ay_view_mode', viewMode)
    }, [viewMode])

    const handleAdd = () => {
        let nextSuggested = null
        if (years.length > 0) {
            const latest = [...years].sort((a, b) => {
                if (a.name !== b.name) return b.name.localeCompare(a.name)
                return b.semester === 'Genap' ? 1 : -1
            })[0]

            if (latest.semester === 'Ganjil') {
                nextSuggested = { ...latest, id: undefined, semester: 'Genap', is_active: false }
            } else {
                const match = latest.name.match(/(\d{4})\/(\d{4})/)
                if (match) {
                    const nextStart = parseInt(match[1]) + 1
                    const nextEnd = parseInt(match[2]) + 1
                    nextSuggested = { ...latest, id: undefined, name: `${nextStart}/${nextEnd}`, semester: 'Ganjil', is_active: false }
                }
            }
        }
        setSelectedItem(nextSuggested)
        setIsModalOpen(true)
    }
    const handleEdit = (item) => {
        setSelectedItem(item)
        setIsModalOpen(true)
    }

    const handleOpenReadOnlyDetail = (item) => {
        setReadOnlyDetailItem(item)
        setIsReadOnlyDetailOpen(true)
    }

    const handleOpenHistory = (item) => {
        setHistoryItem(item)
        setIsHistoryOpen(true)
    }

    const handleSubmit = async (formData, setFormErrors) => {
        if (!supabase || submitting) return
        setSubmitting(true)

        const errors = {}
        if (!formData.name.trim()) errors.name = 'Nama tahun pelajaran wajib diisi'
        if (!formData.startDate) errors.startDate = 'Tanggal mulai wajib diisi'
        if (!formData.endDate) errors.endDate = 'Tanggal selesai wajib diisi'
        if (formData.startDate && formData.endDate && formData.endDate <= formData.startDate) errors.endDate = 'Tanggal selesai harus setelah tanggal mulai'

        if (Object.keys(errors).length > 0) {
            setFormErrors(errors)
            setSubmitting(false)
            return
        }

        try {
            const overlap = years.some(y => {
                if (selectedItem && y.id === selectedItem.id) return false
                const s = new Date(y.start_date)
                const e = new Date(y.end_date)
                const targetS = new Date(formData.startDate)
                const targetE = new Date(formData.endDate)
                return (targetS >= s && targetS <= e) || (targetE >= s && targetE <= e) || (targetS <= s && targetE >= e)
            })

            if (overlap) {
                const dupe = years.find(y => {
                    const s = new Date(y.start_date); const e = new Date(y.end_date)
                    const targetS = new Date(formData.startDate); const targetE = new Date(formData.endDate)
                    return (targetS >= s && targetS <= e) || (targetE >= s && targetE <= e) || (targetS <= s && targetE >= e)
                })
                setFormErrors({ endDate: `Periode tumpang tindih dengan ${dupe.name} ${dupe.semester}` })
                setSubmitting(false)
                return
            }

            const payload = {
                name: formData.name.trim(),
                semester: formData.semester,
                start_date: formData.startDate,
                end_date: formData.endDate,
                curriculum: formData.curriculum || 'Merdeka'
            }

            if (selectedItem?.id) {
                const { data, error } = await supabase.from('academic_years').update(payload).eq('id', selectedItem.id).select()
                if (error) throw error
                if (!data || data.length === 0) throw new Error('Gagal mengupdate data')

                if (formData.makeActive && !selectedItem.is_active) {
                    await supabase.from('academic_years').update({ is_active: false }).neq('id', selectedItem.id)
                    await supabase.from('academic_years').update({ is_active: true }).eq('id', selectedItem.id)
                } else if (!formData.makeActive && selectedItem.is_active) {
                    await supabase.from('academic_years').update({ is_active: false }).eq('id', selectedItem.id)
                }

                addToast('Tahun pelajaran berhasil diupdate', 'success')
                await logAudit({ action: 'UPDATE', source: 'MASTER', tableName: 'academic_years', recordId: selectedItem.id, oldData: selectedItem, newData: { ...selectedItem, ...payload } })
            } else {
                const { data, error } = await supabase.from('academic_years').insert({ ...payload, is_active: false }).select()
                if (error) throw error
                if (!data || data.length === 0) throw new Error('Gagal menambahkan data')

                if (formData.makeActive && data[0]?.id) {
                    await supabase.from('academic_years').update({ is_active: false }).neq('id', data[0].id)
                    await supabase.from('academic_years').update({ is_active: true }).eq('id', data[0].id)
                }

                addToast('Tahun pelajaran berhasil ditambahkan', 'success')
                await logAudit({ action: 'INSERT', source: 'MASTER', tableName: 'academic_years', recordId: data?.[0]?.id, newData: { ...payload, is_active: formData.makeActive } })
            }
            setIsModalOpen(false)
            setSelectedItem(null)
            fetchData()
        } catch (err) {
            if (err?.code === '23505') {
                addToast('Tidak bisa menyimpan: sudah ada tahun pelajaran lain yang aktif.', 'error')
            } else if (err?.code === '23514') {
                addToast('Tidak bisa menyimpan: pastikan tanggal mulai lebih kecil dari tanggal selesai.', 'error')
            } else if (err?.code === '23P01') {
                const clash = findOverlappingYear({
                    semester: formData.semester,
                    startDate: formData.startDate,
                    endDate: formData.endDate,
                    excludeId: selectedItem?.id || null,
                })
                if (clash) {
                    setFormErrors?.({ endDate: `Periode bentrok dengan ${clash.name} (${clash.semester}) · ${formatDate(clash.start_date)}–${formatDate(clash.end_date)}` })
                } else {
                    addToast('Tidak bisa menyimpan: periode bertabrakan dengan data lain.', 'error')
                }
            } else { addToast(err?.message || 'Gagal menyimpan data', 'error') }
        }
        finally { setSubmitting(false) }
    }

    const handleSetActive = async (item) => {
        if (submitting) return
        setSubmitting(true)
        try {
            const { error: e1 } = await supabase.from('academic_years').update({ is_active: false }).neq('id', item.id).select()
            if (e1) throw e1
            const { data, error: e2 } = await supabase.from('academic_years').update({ is_active: true }).eq('id', item.id).select()
            if (e2) throw e2
            addToast(`${item.name} ${item.semester} diaktifkan`, 'success')
            await logAudit({ action: 'UPDATE', source: 'MASTER', tableName: 'academic_years', recordId: item.id, oldData: item, newData: { ...item, is_active: true } })
            fetchData()
        } catch (err) { addToast(err?.message || 'Gagal mengaktifkan', 'error') }
        finally { setSubmitting(false) }
    }

    const handleToggleLock = async (item) => {
        if (submitting) return
        setSubmitting(true)
        try {
            const newStatus = !item.is_locked
            const { error } = await supabase.from('academic_years').update({ is_locked: newStatus }).eq('id', item.id)
            if (error) throw error
            addToast(`Tahun pelajaran berhasil di${newStatus ? 'tutup' : 'buka'}`, 'success')
            await logAudit({ action: 'UPDATE', source: 'MASTER', tableName: 'academic_years', recordId: item.id, oldData: item, newData: { ...item, is_locked: newStatus } })
            fetchData()
        } catch (err) { addToast(err?.message || 'Gagal mengubah status', 'error') }
        finally { setSubmitting(false) }
    }

    const handleDeactivate = (item) => {
        setItemToDeactivate(item)
        setIsDeactivateConfirmOpen(true)
    }

    const handleDeactivateConfirm = async () => {
        if (!itemToDeactivate || submitting) return
        setSubmitting(true)
        try {
            const { error } = await supabase.from('academic_years').update({ is_active: false }).eq('id', itemToDeactivate.id).select()
            if (error) throw error
            addToast(`${itemToDeactivate.name} ${itemToDeactivate.semester} dinonaktifkan`, 'success')
            await logAudit({ action: 'UPDATE', source: 'MASTER', tableName: 'academic_years', recordId: itemToDeactivate.id, oldData: itemToDeactivate, newData: { ...itemToDeactivate, is_active: false } })
            setIsDeactivateConfirmOpen(false)
            setItemToDeactivate(null)
            fetchData()
        } catch (err) { addToast(err.message || 'Gagal menonaktifkan', 'error') }
        finally { setSubmitting(false) }
    }

    const handleDuplicate = (item) => {
        setSelectedItem({ ...item, id: undefined, name: `${item.name} (Salinan)` })
        setIsModalOpen(true)
    }

    const getTimeStatus = (start, end) => {
        if (!start || !end) return null
        const now = new Date(); const s = new Date(start); const e = new Date(end)
        if (now < s) return { label: 'Akan Datang', cls: 'bg-blue-500/10 text-blue-600 border-blue-500/20' }
        if (now > e) return { label: 'Sudah Selesai', cls: 'bg-gray-500/10 text-gray-500 border-gray-500/20' }
        return { label: 'Sedang Berjalan', cls: 'bg-amber-500/10 text-amber-600 border-amber-500/20' }
    }

    const findOverlappingYear = ({ semester, startDate, endDate, excludeId = null }) => {
        if (!semester || !startDate || !endDate) return null
        const targetS = new Date(startDate); const targetE = new Date(endDate)
        return years.find(y => {
            if (excludeId && y.id === excludeId) return false
            if (y.semester !== semester) return false
            const s = new Date(y.start_date); const e = new Date(y.end_date)
            return (targetS >= s && targetS <= e) || (targetE >= s && targetE <= e) || (targetS <= s && targetE >= e)
        }) || null
    }

    const handleDeleteConfirm = async () => {
        if (!itemToDelete) return
        setSubmitting(true)
        const archived = itemToDelete
        try {
            await supabase.from('academic_years').update({ deleted_at: new Date().toISOString() }).eq('id', archived.id)
            await logAudit({ action: 'UPDATE', source: 'MASTER', tableName: 'academic_years', recordId: archived.id, newData: { deleted_at: new Date().toISOString() } })
            setIsDeleteModalOpen(false); fetchData()
            addUndoToast(`${archived.name} diarsipkan.`, async () => {
                await supabase.from('academic_years').update({ deleted_at: null }).eq('id', archived.id)
                fetchData()
            }, 6000)
        } catch { addToast('Gagal mengarsipkan', 'error') }
        finally { setSubmitting(false); setItemToDelete(null) }
    }

    const handleRestore = async (item) => {
        try {
            await supabase.from('academic_years').update({ deleted_at: null }).eq('id', item.id)
            addToast('Berhasil dipulihkan', 'success')
            fetchArchived(); fetchData()
        } catch { addToast('Gagal memulihkan', 'error') }
    }

    const handlePermanentDelete = async (item) => {
        try {
            await supabase.from('academic_years').delete().eq('id', item.id)
            addToast('Data dihapus permanen', 'success')
            setIsPermanentDeleteOpen(false); fetchArchived()
        } catch { addToast('Gagal menghapus permanen', 'error') }
    }

    const handleBulkDelete = async () => {
        setSubmitting(true)
        try {
            await supabase.from('academic_years').update({ deleted_at: new Date().toISOString() }).in('id', selectedIds)
            addToast(`${selectedIds.length} data diarsipkan`, 'success')
            setSelectedIds([]); setIsBulkDeleteOpen(false); fetchData()
        } catch { addToast('Gagal menghapus massal', 'error') }
        finally { setSubmitting(false) }
    }



    // Helper formatting
    const formatDate = (d) => d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'
    const getDuration = (s, e) => {
        if (!s || !e) return '-'
        const diff = Math.ceil(Math.abs(new Date(e) - new Date(s)) / (1000 * 60 * 60 * 24 * 30))
        return `${diff} Bulan`
    }

    // Count active filters
    const activeFilterCount = (filterSemester ? 1 : 0) + (filterTimeStatus ? 1 : 0) + (searchQuery ? 1 : 0)

    // ── EXPORT HANDLERS ──────────────────────────────────────────────────────
    const getExportData = async () => {
        let q = supabase.from('academic_years').select('name,semester,start_date,end_date,curriculum,is_active,is_locked').is('deleted_at', null)

        if (exportScope === 'selected' && selectedIds.length > 0) {
            q = q.in('id', selectedIds)
        } else if (exportScope === 'filtered') {
            if (filterSemester) q = q.eq('semester', filterSemester)
            if (filterStatus) q = q.eq('is_active', filterStatus === 'active')
            if (filterCurriculum) q = q.eq('curriculum', filterCurriculum)
            if (filterLock) q = q.eq('is_locked', filterLock === 'locked')
        }

        const { data, error } = await q
        if (error) { addToast('Gagal memuat data export', 'error'); return [] }

        return (data || []).map(y => {
            const row = {}
            exportColumns.forEach(colKey => {
                if (colKey === 'name') row['Tahun Pelajaran'] = y.name
                if (colKey === 'semester') row['Semester'] = y.semester
                if (colKey === 'start_date') row['Mulai'] = y.start_date
                if (colKey === 'end_date') row['Selesai'] = y.end_date
                if (colKey === 'curriculum') row['Kurikulum'] = y.curriculum
                if (colKey === 'is_active') row['Status Aktif'] = y.is_active ? 'Aktif' : 'Nonaktif'
                if (colKey === 'is_locked') row['Status Kunci'] = y.is_locked ? 'Terkunci' : 'Terbuka'
            })
            return row
        })
    }

    const handleExportCSV = async (filename, options = {}) => {
        setExporting(true)
        try {
            const rows = await getExportData()
            if (!rows.length) return addToast('Tidak ada data untuk diekspor', 'warning')

            const headers = Object.keys(rows[0])
            const csvContent = [
                ...(options.includeHeader !== false ? [headers.join(',')] : []),
                ...rows.map(r => headers.map(h => {
                    const v = String(r[h] ?? '').replace(/"/g, '""')
                    return `"${v}"`
                }).join(','))
            ].join('\n')

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
            const a = document.createElement('a')
            a.href = URL.createObjectURL(blob)
            a.download = `${filename || 'export_tahun_pelajaran'}.csv`
            a.click()

            await logAudit({
                action: 'EXPORT',
                source: 'MASTER',
                tableName: 'academic_years',
                newData: { format: 'csv', scope: exportScope, columns: exportColumns, count: rows.length }
            })

            addToast(`Export CSV berhasil (${rows.length} periode)`, 'success')
            setIsExportModalOpen(false)
        } catch { addToast('Gagal export CSV', 'error') }
        finally { setExporting(false) }
    }

    const handleExportExcel = async (filename) => {
        setExporting(true)
        try {
            const rows = await getExportData()
            if (!rows.length) return addToast('Tidak ada data untuk diekspor', 'warning')
            const XLSX = await import('xlsx')
            const ws = XLSX.utils.json_to_sheet(rows)
            ws['!cols'] = Object.keys(rows[0]).map(k => ({ wch: Math.max(k.length, 18) }))
            const wb = XLSX.utils.book_new()
            XLSX.utils.book_append_sheet(wb, ws, 'Data Periode')
            XLSX.writeFile(wb, `${filename || 'export_tahun_pelajaran'}.xlsx`)

            await logAudit({
                action: 'EXPORT',
                source: 'MASTER',
                tableName: 'academic_years',
                newData: { format: 'xlsx', scope: exportScope, columns: exportColumns, count: rows.length }
            })

            addToast(`Export Excel berhasil (${rows.length} periode)`, 'success')
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
            doc.text('Laporan Data Tahun Pelajaran', 14, 12)
            doc.setFontSize(8)
            doc.text(`Tanggal: ${new Date().toLocaleDateString('id-ID')}  |  Total: ${allRows.length} periode  |  Scope: ${exportScope === 'filtered' ? 'Filter Aktif' : exportScope === 'selected' ? 'Dipilih' : 'Semua'}`, 14, 18)

            const headers = Object.keys(allRows[0])
            const body = allRows.map(r => headers.map(h => r[h]))

            autoTable(doc, {
                startY: 22,
                head: [headers],
                body: body,
                theme: 'grid',
                styles: { fontSize: 8, cellPadding: 2 },
                headStyles: { fillColor: [79, 70, 229], textColor: 255 },
                alternateRowStyles: { fillColor: [248, 250, 252] },
                columnStyles: {
                    'Semester': { halign: 'center' },
                    'Mulai': { halign: 'center' },
                    'Selesai': { halign: 'center' },
                    'Kurikulum': { halign: 'center' },
                    'Status Aktif': { halign: 'center' },
                    'Status Kunci': { halign: 'center' }
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

            doc.save(`${filename || 'export_tahun_pelajaran'}.pdf`)

            await logAudit({
                action: 'EXPORT',
                source: 'MASTER',
                tableName: 'academic_years',
                newData: { format: 'pdf', scope: exportScope, columns: exportColumns, count: allRows.length }
            })

            addToast(`Export PDF berhasil (${allRows.length} periode)`, 'success')
            setIsExportModalOpen(false)
        } catch { addToast('Gagal export PDF', 'error') }
        finally { setExporting(false) }
    }

    // ── IMPORT HANDLERS ──────────────────────────────────────────────────────
    const handleImportClick = () => {
        if (!isImportModalOpen) {
            setImportFileName('')
            setImportRawData([])
            setImportPreview([])
            setImportIssues([])
            setImportStep(1)
            setIsImportModalOpen(true)
        } else {
            importFileInputRef.current?.click()
        }
    }

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return
        await processImportFile(file)
        e.target.value = ''
    }

    const processImportFile = async file => {
        if (!file) return
        setImportFileName(file.name)
        setImportLoading(true)
        try {
            const data = await file.arrayBuffer()
            const XLSX = await import('xlsx')
            const wb = XLSX.read(data, { type: 'array' })
            const wsname = wb.SheetNames[0]
            const ws = wb.Sheets[wsname]
            const rawJson = XLSX.utils.sheet_to_json(ws, { header: 1 })

            if (!rawJson || rawJson.length < 2) {
                addToast('File kosong atau tidak memiliki baris data', 'error')
                return
            }

            const headers = (rawJson[0] || []).map(h => String(h || '').trim()).filter(Boolean)
            setImportFileHeaders(headers)

            const rows = rawJson.slice(1).filter(r => r.some(c => c !== undefined && c !== null && c !== ''))
            setImportRawData(rows)

            // Auto mapping
            const map = {}
            SYSTEM_COLS.forEach(sys => {
                const best = headers.find(h => h.toLowerCase().includes(sys.key.toLowerCase()) || sys.label.toLowerCase().includes(h.toLowerCase()))
                if (best) map[sys.key] = best
            })
            setImportColumnMapping(map)
            setImportStep(2)
        } catch {
            addToast('Gagal membaca file Excel/CSV', 'error')
        } finally {
            setImportLoading(false)
        }
    }

    const buildImportPreview = async (rawRows, mapping) => {
        setImportLoading(true)
        try {
            const nameCol = importFileHeaders.indexOf(mapping.name)
            const semCol = importFileHeaders.indexOf(mapping.semester)
            const startCol = importFileHeaders.indexOf(mapping.start_date)
            const endCol = importFileHeaders.indexOf(mapping.end_date)
            const curCol = importFileHeaders.indexOf(mapping.curriculum)

            const preview = rawRows.map((row, i) => {
                const data = {
                    name: row[nameCol] !== undefined ? String(row[nameCol]).trim() : '',
                    semester: row[semCol] !== undefined ? String(row[semCol]).trim() : '',
                    start_date: row[startCol] !== undefined ? String(row[startCol]).trim() : '',
                    end_date: row[endCol] !== undefined ? String(row[endCol]).trim() : '',
                    curriculum: row[curCol] !== undefined ? String(row[curCol]).trim() : 'Merdeka',
                }
                return { ...data, _row: i }
            })

            // Validation
            const issues = []
            preview.forEach((row, i) => {
                const rowIssues = []
                if (!row.name) rowIssues.push('Tahun Pelajaran tidak boleh kosong')
                if (!row.semester) rowIssues.push('Semester tidak boleh kosong')
                if (!row.start_date) rowIssues.push('Tanggal mulai tidak boleh kosong')
                if (!row.end_date) rowIssues.push('Tanggal selesai tidak boleh kosong')
                
                if (row.semester && !['Ganjil', 'Genap'].includes(row.semester)) {
                    rowIssues.push('Semester harus Ganjil atau Genap')
                }

                if (row.name && row.semester && years.some(y => y.name === row.name && y.semester === row.semester)) {
                    rowIssues.push(`Periode "${row.name} (${row.semester})" sudah ada di database`)
                    row._isDupe = true
                }

                if (rowIssues.length) {
                    issues.push({ row: i + 2, level: 'error', messages: rowIssues })
                    row._hasError = true
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

            const rowIssues = []
            if (!next[rowIdx].name) rowIssues.push('Tahun Pelajaran tidak boleh kosong')
            if (!next[rowIdx].semester) rowIssues.push('Semester tidak boleh kosong')
            if (!next[rowIdx].start_date) rowIssues.push('Tanggal mulai tidak boleh kosong')
            if (!next[rowIdx].end_date) rowIssues.push('Tanggal selesai tidak boleh kosong')

            if (next[rowIdx].semester && !['Ganjil', 'Genap'].includes(next[rowIdx].semester)) {
                rowIssues.push('Semester harus Ganjil atau Genap')
            }

            next[rowIdx]._hasError = rowIssues.length > 0

            const newIssues = importIssues.filter(iss => iss.row !== rowIdx + 2)
            if (rowIssues.length) {
                newIssues.push({ row: rowIdx + 2, level: 'error', messages: rowIssues })
            }
            setImportIssues(newIssues.sort((a, b) => a.row - b.row))

            return next
        })
    }

    const handleRemoveImportRow = idx => {
        setImportPreview(prev => prev.filter((_, i) => i !== idx))
        setImportIssues(prev => prev.filter(iss => iss.row !== idx + 2).map(iss => iss.row > idx + 2 ? { ...iss, row: iss.row - 1 } : iss))
    }

    const handleBulkFix = (colKey, value) => {
        setImportPreview(prev => prev.map(r => ({ ...r, [colKey]: value, _hasError: colKey === 'name' ? !value : r._hasError })))
        if (colKey === 'name' && value) setImportIssues(prev => prev.filter(iss => !iss.messages.includes('Tahun Pelajaran tidak boleh kosong')))
        addToast(`Berhasil merubah semua baris ke ${value}`, 'success')
    }

    const handleDownloadTemplate = async () => {
        const headers = [
            'Tahun Pelajaran',
            'Semester',
            'Tanggal Mulai (YYYY-MM-DD)',
            'Tanggal Selesai (YYYY-MM-DD)',
            'Kurikulum'
        ]
        const data = [
            ['2024/2025', 'Ganjil', '2024-07-01', '2024-12-31', 'Merdeka'],
            ['2024/2025', 'Genap', '2025-01-01', '2025-06-30', 'Merdeka']
        ]
        const XLSX = await import('xlsx')
        const ws = XLSX.utils.aoa_to_sheet([headers, ...data])

        ws['!cols'] = [
            { wch: 20 },
            { wch: 15 },
            { wch: 25 },
            { wch: 25 },
            { wch: 18 }
        ]

        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, 'Template Import')
        XLSX.writeFile(wb, 'Template Import Periode.xlsx')
    }

    const importReadyRows = importPreview.filter(r => !r._hasError)
    const hasImportBlockingErrors = importIssues.some(x => x.level === 'error')

    const handleCommitImport = async () => {
        if (!importPreview.length) { addToast('Tidak ada data untuk diimport', 'error'); return }
        if (hasImportBlockingErrors) { addToast('Masih ada ERROR. Perbaiki file dulu.', 'error'); return }

        const validRows = importPreview.filter(r => !r._hasError && (!importSkipDupes || !r._isDupe))
        if (!validRows.length) { addToast('Tidak ada baris valid yang baru', 'warning'); return }

        setImporting(true); setImportProgress({ done: 0, total: validRows.length })
        try {
            const CHUNK = 50
            for (let i = 0; i < validRows.length; i += CHUNK) {
                const chunk = validRows.slice(i, i + CHUNK).map(r => ({
                    name: r.name,
                    semester: r.semester,
                    start_date: r.start_date,
                    end_date: r.end_date,
                    curriculum: r.curriculum || 'Merdeka',
                    is_active: false
                }))
                const { error } = await supabase.from('academic_years').insert(chunk); if (error) throw error
                setImportProgress({ done: Math.min(i + CHUNK, validRows.length), total: validRows.length })
            }
            addToast(`Berhasil import ${validRows.length} periode`, 'success')
            await logAudit({ action: 'INSERT', source: 'MASTER', tableName: 'academic_years', newData: { bulk_import: true, count: validRows.length, data: validRows } })
            setIsImportModalOpen(false); setImportPreview([]); setImportIssues([]); setImportFileName(''); setImportStep(1)
            fetchData()
        } catch { addToast('Gagal import (cek constraint DB / duplikat)', 'error') }
        finally { setImporting(false) }
    }

    const resetAllFilters = () => {
        setSearchQuery('')
        setFilterSemester('')
        setFilterStatus('')
        setFilterCurriculum('')
        setFilterLock('')
        setFilterTimeStatus('')
        setPage(1)
        setSelectedIds([])
    }

    // filtering logic
    const filtered = useMemo(() => {
        return years.filter(y => {
            const matchesSearch = !searchQuery || y.name.toLowerCase().includes(searchQuery.toLowerCase())
            const matchesSemester = !filterSemester || y.semester === filterSemester
            const matchesStatus = !filterStatus || (filterStatus === 'active' ? y.is_active : !y.is_active)
            const matchesCurriculum = !filterCurriculum || y.curriculum === filterCurriculum
            const matchesLock = !filterLock || (filterLock === 'locked' ? y.is_locked : !y.is_locked)
            if (filterTimeStatus) {
                const ts = getTimeStatus(y.start_date, y.end_date)
                if (ts?.label !== filterTimeStatus) return false
            }
            return matchesSearch && matchesSemester && matchesStatus && matchesCurriculum && matchesLock
        }).sort((a, b) => {
            // Selalu letakkan yang aktif di paling atas (Pinned)
            if (a.is_active && !b.is_active) return -1
            if (!a.is_active && b.is_active) return 1

            if (sortBy === 'name_asc') return a.name.localeCompare(b.name)
            if (sortBy === 'name_desc') return b.name.localeCompare(a.name)
            if (sortBy === 'start_asc') return new Date(a.start_date) - new Date(b.start_date)
            return new Date(b.start_date) - new Date(a.start_date)
        })
    }, [years, searchQuery, filterSemester, filterStatus, filterCurriculum, filterLock, filterTimeStatus, sortBy])

    const totalRows = filtered.length
    const paged = filtered.slice((page - 1) * pageSize, page * pageSize)
    const isTrulyEmpty = years.length === 0
    const isEmpty = filtered.length === 0

    const toggleSelect = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
    const toggleSelectAll = () => setSelectedIds(selectedIds.length === paged.length ? [] : paged.map(y => y.id))

    return (
        <DashboardLayout title="Tahun Pelajaran">
            <div className="p-4 md:p-6 space-y-4 max-w-[1800px] mx-auto">

                {/* Selection Action Bar ── */}
                {selectedIds.length > 0 && (
                    <div
                        className="fixed bottom-6 -translate-x-1/2 z-[100] w-[90%] max-w-xl animate-in fade-in slide-in-from-bottom-8 duration-500"
                        style={{
                            left: dir === 'rtl'
                                ? 'calc(50vw - (var(--sidebar-width, 0px) / 2))'
                                : 'calc(50vw + (var(--sidebar-width, 0px) / 2))'
                        }}
                    >
                        <div className="bg-gray-900 text-white rounded-[2.5rem] p-2 pr-6 shadow-2xl flex items-center gap-4 border border-white/10 backdrop-blur-xl">
                            <div className="w-10 h-10 rounded-full bg-[var(--color-primary)] flex items-center justify-center font-black text-sm shadow-lg shadow-[var(--color-primary)]/20 animate-bounce">
                                {selectedIds.length}
                            </div>
                            <div className="flex-1">
                                <p className="text-[11px] font-black uppercase tracking-widest text-white/90">Data Terpilih</p>
                                <p className="text-[9px] font-bold text-white/50 tracking-tight">Lakukan aksi massal pada data ini</p>
                            </div>
                            <div className="h-8 w-px bg-white/10" />
                            <button onClick={() => setSelectedIds([])} className="h-10 px-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-all">Batal</button>
                            <button onClick={() => setIsBulkDeleteOpen(true)} className="h-10 px-5 rounded-2xl bg-red-500 hover:bg-red-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-500/20 transition-all flex items-center gap-2 active:scale-95">
                                <FontAwesomeIcon icon={faBoxArchive} className="text-[9px]" />
                                Arsipkan
                            </button>
                        </div>
                    </div>
                )}

                {!canEdit && (
                    <div className="px-4 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-2">
                        <FontAwesomeIcon icon={faCheckCircle} className="text-rose-500 shrink-0 text-xs" />
                        <p className="text-[11px] font-bold text-rose-600">Mode Read-only — Edit tahun pelajaran dinonaktifkan oleh administrator.</p>
                    </div>
                )}

                {/* ── Header Row ── */}
                <PageHeader
                    badge="Master Data"
                    breadcrumbs={['Academic Cycle']}
                    title="Tahun Pelajaran"
                    subtitle={`Kelola ${stats.total} periode akademik dalam ekosistem.`}
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
                                    <button onClick={() => { setIsHeaderMenuOpen(false); handleImportClick() }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--color-surface-alt)] text-[var(--color-text)] transition-all group">
                                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <FontAwesomeIcon icon={faFileImport} className="text-xs" />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-[11px] font-black leading-tight">Import CSV / Excel</p>
                                            <p className="text-[9px] opacity-60 font-medium leading-tight mt-0.5">Unggah data periode masal dari file Excel/CSV</p>
                                        </div>
                                    </button>
                                    <button onClick={() => { setIsHeaderMenuOpen(false); setIsExportModalOpen(true) }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--color-surface-alt)] text-[var(--color-text)] transition-all group">
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
                                    <button onClick={() => { setIsHeaderMenuOpen(false); fetchArchived(); setIsArchivedOpen(true) }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--color-surface-alt)] text-[var(--color-text)] transition-all group">
                                        <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <FontAwesomeIcon icon={faBoxArchive} className="text-xs" />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-[11px] font-black leading-tight">Arsip Periode</p>
                                            <p className="text-[9px] opacity-60 font-medium leading-tight mt-0.5">Lihat & pulihkan data periode tidak aktif</p>
                                        </div>
                                    </button>
                                </div>
                            </>,
                            getPortalContainer('portal-academic-header-menu')
                        )}

                        <input
                            type="file"
                            ref={importFileInputRef}
                            onChange={handleFileChange}
                            className="hidden"
                            accept=".csv,.xlsx"
                        />

                        {/* Keyboard Shortcuts Button - hidden on mobile */}
                        <button onClick={() => { if (!isShortcutOpen) setShortcutRect(shortcutBtnRef.current?.getBoundingClientRect()); setIsShortcutOpen(v => !v) }}
                            ref={shortcutBtnRef}
                            className={`hidden sm:flex h-9 w-9 rounded-lg border items-center justify-center transition-all active:scale-95
                                ${isShortcutOpen
                                    ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)]/30 text-[var(--color-primary)]'
                                    : 'bg-[var(--color-surface-alt)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                                }`}
                            title="Keyboard Shortcuts (?)">
                            <FontAwesomeIcon icon={faKeyboard} className="text-sm" />
                        </button>

                        {/* Portaled Keyboard Shortcuts Dropdown */}
                        {isShortcutOpen && shortcutRect && createPortal(
                            <>
                                <div className="fixed inset-0 z-[9990] bg-black/5 backdrop-blur-[1px]" onClick={() => setIsShortcutOpen(false)} />
                                <div className="fixed z-[9991] w-72 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl shadow-black/10 overflow-hidden text-left animate-in fade-in zoom-in-95 duration-200"
                                    style={{
                                        top: shortcutRect.bottom + 8,
                                        left: Math.max(10, shortcutRect.right - 288)
                                    }}>
                                    <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between bg-[var(--color-surface-alt)]/50">
                                        <p className="text-[11px] font-black uppercase tracking-widest text-[var(--color-text)]">Keyboard Shortcuts</p>
                                        <span className="text-[9px] text-[var(--color-text-muted)] font-bold">Tekan ? untuk toggle</span>
                                    </div>
                                    <div className="p-3 space-y-0.5">
                                        {[{ section: 'Navigasi' }, { keys: ['Ctrl', 'K'], label: 'Fokus ke search' }, { section: 'Aksi' }, { keys: ['N'], label: 'Tambah periode baru' }, { keys: ['X'], label: 'Reset semua filter' }, { keys: ['?'], label: 'Tampilkan shortcut ini' }].map((item, i) => item.section ? (
                                            <p key={i} className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] pt-2 pb-1 px-1">{item.section}</p>
                                        ) : (
                                            <div key={i} className="flex items-center justify-between px-1 py-1 rounded-lg hover:bg-[var(--color-surface-alt)] transition-all">
                                                <span className="text-[11px] font-semibold text-[var(--color-text)]">{item.label}</span>
                                                <div className="flex items-center gap-1">{item.keys.map((k, ki) => <span key={ki} className="px-1.5 py-0.5 rounded-md bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[9px] font-black text-[var(--color-text-muted)] font-mono">{k}</span>)}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </>,
                            getPortalContainer('portal-academic-shortcut-menu')
                        )}

                        {/* Privasi toggle */}
                        <button onClick={() => {
                            const next = !isPrivacyMode
                            setIsPrivacyMode(next)
                            addToast(next ? 'Mode privasi diaktifkan — Data sensitif disembunyikan' : 'Mode privasi dinonaktifkan', next ? 'info' : 'success')
                        }}
                            className={`h-9 w-9 sm:w-auto sm:px-3 rounded-lg border flex items-center justify-center sm:justify-start gap-2 transition-all active:scale-95 ${isPrivacyMode ? 'bg-amber-500/10 border-amber-500/30 text-amber-600' : 'bg-[var(--color-surface-alt)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'} `}
                            title={isPrivacyMode ? "Matikan Mode Privasi" : "Aktifkan Mode Privasi"}>
                            <FontAwesomeIcon icon={isPrivacyMode ? faEyeSlash : faEye} className="text-sm" />
                            <span className="text-[10px] font-black uppercase tracking-widest hidden md:inline">Privasi</span>
                        </button>

                        {/* Add button */}
                        {canEdit && (
                            <button onClick={handleAdd} className="h-9 px-4 sm:px-5 rounded-xl bg-[var(--color-primary)] text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-95 shadow-md shadow-[var(--color-primary)]/20 disabled:opacity-40 disabled:cursor-not-allowed border border-white/10">
                                <FontAwesomeIcon icon={faPlus} className="text-[10px]" />
                                <span>Tambah Periode</span>
                            </button>
                        )}
                        </>
                    }
                />

                {/* ── Stats ── */}
                <StatsCarousel count={STAT_CARD_COUNT} cols={4}>
                    {[
                        { icon: faLayerGroup, label: 'Total Periode', value: stats.total, borderColor: 'border-t-blue-500', iconBg: 'bg-blue-500/10 text-blue-500' },
                        { icon: faCircleCheck, label: 'Status Aktif', value: stats.active, borderColor: 'border-t-emerald-500', iconBg: 'bg-emerald-500/10 text-emerald-500' },
                        { icon: faGraduationCap, label: 'Smt. Ganjil', value: stats.ganjil, borderColor: 'border-t-indigo-500', iconBg: 'bg-indigo-500/10 text-indigo-500' },
                        { icon: faGraduationCap, label: 'Smt. Genap', value: stats.genap, borderColor: 'border-t-purple-500', iconBg: 'bg-purple-500/10 text-purple-500' },
                    ].map((s, i) => (
                        <StatCard
                            key={i}
                            icon={s.icon}
                            label={s.label}
                            value={s.value}
                            borderColor={s.borderColor}
                            iconBg={s.iconBg}
                        />
                    ))}
                </StatsCarousel>

                {/* ── Filter Bar ── */}
                <div className="glass rounded-[1.5rem] mb-4 border border-[var(--color-border)] overflow-hidden">
                    <div className="flex flex-row items-center gap-2 p-3">
                        <div className="flex-1 min-w-[120px] transition-all duration-300">
                            <DebouncedSearchInput
                                searchQuery={searchQuery}
                                onSearch={setSearchQuery}
                                inputRef={searchInputRef}
                                isLoading={loading}
                            />
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                            <div className="hidden md:flex items-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/20 p-1 shadow-none">
                                <button onClick={() => setViewMode('table')} className={`h-7 px-3 rounded-lg flex items-center gap-2 text-[9px] font-black uppercase tracking-wider transition-all ${viewMode === 'table' ? 'bg-[var(--color-primary)] text-white shadow-md' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]'}`}>
                                    <FontAwesomeIcon icon={faTableList} className="text-[9px]" />
                                    <span>Tabel</span>
                                </button>
                                <button onClick={() => setViewMode('timeline')} className={`h-7 px-3 rounded-lg flex items-center gap-2 text-[9px] font-black uppercase tracking-wider transition-all ${viewMode === 'timeline' ? 'bg-[var(--color-primary)] text-white shadow-md' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]'}`}>
                                    <FontAwesomeIcon icon={faTimeline} className="text-[9px]" />
                                    <span>Linimasa</span>
                                </button>
                            </div>
                            <button
                                onClick={() => setIsFilterOpen(!isFilterOpen)}
                                className={`h-9 px-3 sm:px-4 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${isFilterOpen || activeFilterCount > 0 ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white shadow-md shadow-[var(--color-primary)]/30' : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]'}`}
                            >
                                <FontAwesomeIcon icon={faSliders} />
                                <span className="hidden xs:inline">Filter</span>
                                {activeFilterCount > 0 && <span className="w-4 h-4 rounded-full bg-white/30 text-white text-[9px] font-black flex items-center justify-center">{activeFilterCount}</span>}
                            </button>
                            {activeFilterCount > 0 && <button onClick={resetAllFilters} className="h-9 px-3 rounded-xl border border-red-500/20 bg-red-500/5 text-red-500 text-[10px] font-black uppercase tracking-widest transition-all hover:bg-red-500/10 flex items-center gap-1.5"><FontAwesomeIcon icon={faXmark} /><span className="hidden sm:inline">Reset</span></button>}
                        </div>
                    </div>

                    {/* Active Chips */}
                    {(searchQuery || filterSemester || filterTimeStatus) && (
                        <div className="px-3 pb-3 -mt-1 flex flex-wrap gap-2 animate-in fade-in slide-in-from-top-1 duration-300">
                            {searchQuery && (
                                <button type="button" onClick={() => setSearchQuery('')} className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/40 text-[10px] font-black text-[var(--color-text)]">
                                    <FontAwesomeIcon icon={faSearch} className="opacity-40" />
                                    <span>"{searchQuery.slice(0, 20)}{searchQuery.length > 20 ? '...' : ''}"</span>
                                    <FontAwesomeIcon icon={faTimes} className="text-[8px] opacity-40 group-hover:text-red-500 transition-colors" />
                                </button>
                            )}
                            {filterSemester && (
                                <button type="button" onClick={() => setFilterSemester('')} className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/5 text-[10px] font-black text-[var(--color-primary)]">
                                    <span>{filterSemester}</span>
                                    <FontAwesomeIcon icon={faTimes} className="text-[8px] opacity-40 group-hover:text-red-500 transition-colors" />
                                </button>
                            )}
                            {filterTimeStatus && (
                                <button type="button" onClick={() => setFilterTimeStatus('')}
                                    className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-amber-500/20 bg-amber-500/10 text-[10px] font-black text-amber-600">
                                    Status: {filterTimeStatus}
                                    <span className="w-5 h-5 rounded-lg bg-white/70 dark:bg-[var(--color-surface)] border border-amber-500/20 flex items-center justify-center text-amber-600 opacity-70 group-hover:opacity-100 transition-opacity">
                                        <FontAwesomeIcon icon={faTimes} className="text-[10px]" />
                                    </span>
                                </button>
                            )}
                            <button onClick={resetAllFilters} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black text-red-500 hover:bg-red-500/5 transition-all">
                                <FontAwesomeIcon icon={faRotateLeft} className="text-[9px]" />
                                Hapus Semua
                            </button>
                        </div>
                    )}

                    {isFilterOpen && (
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
                                    Reset Semua
                                </button>
                            </div>

                            <div className="grid grid-cols-1 xl:grid-cols-[1fr_auto] gap-4">
                                {/* Primary Grid: Selects */}
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                    <div className="space-y-1.5">
                                        <label className="block text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1.5">Semester</label>
                                        <select value={filterSemester} onChange={e => setFilterSemester(e.target.value)} className="w-full h-9 px-3 text-xs font-bold bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl appearance-none outline-none focus:border-[var(--color-primary)]">
                                            <option value="">Semua Semester</option>
                                            <option value="Ganjil">Ganjil</option>
                                            <option value="Genap">Genap</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="block text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1.5">Status</label>
                                        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-full h-9 px-3 text-xs font-bold bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl appearance-none outline-none focus:border-[var(--color-primary)]">
                                            <option value="">Semua Status</option>
                                            <option value="active">Aktif</option>
                                            <option value="inactive">Tidak Aktif</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="block text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1.5">Kurikulum</label>
                                        <select value={filterCurriculum} onChange={e => setFilterCurriculum(e.target.value)} className="w-full h-9 px-3 text-xs font-bold bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl appearance-none outline-none focus:border-[var(--color-primary)]">
                                            <option value="">Semua Kurikulum</option>
                                            <option value="Merdeka">Kurikulum Merdeka</option>
                                            <option value="K13">Kurikulum 2013</option>
                                            <option value="KTSP">KTSP</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="block text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1.5">Kunci Data</label>
                                        <select value={filterLock} onChange={e => setFilterLock(e.target.value)} className="w-full h-9 px-3 text-xs font-bold bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl appearance-none outline-none focus:border-[var(--color-primary)]">
                                            <option value="">Semua</option>
                                            <option value="open">Bisa Diedit</option>
                                            <option value="locked">Terkunci (Read-only)</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="block text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1.5">Urutan</label>
                                        <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="w-full h-9 px-3 text-xs font-bold bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl appearance-none outline-none focus:border-[var(--color-primary)]">
                                            <option value="name_desc">Terupate</option>
                                            <option value="name_asc">Terlama</option>
                                            <option value="start_asc">Terdekat</option>
                                        </select>
                                    </div>
                                </div>
                                
                                {/* Secondary Grid: Actions */}
                                <div className="space-y-1.5 flex flex-col">
                                    <label className="block text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1.5 opacity-0 hidden xl:block">Aksi</label>
                                    <div className="flex items-center gap-2 mt-auto h-9">
                                        <button onClick={toggleSelectAll} className="h-full px-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[9px] font-black uppercase tracking-widest text-[var(--color-text)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-all">
                                            {selectedIds.length === paged.length && paged.length > 0 ? 'Batal Pilih' : 'Pilih Semua'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>



                {/* ── Main Data View ── */}
                <div className="glass rounded-[1.5rem] border border-[var(--color-border)] overflow-hidden">
                    {loading ? (
                        <div className="p-12 space-y-4">
                            <div className="flex gap-4">
                                <TableSkeleton rows={5} cols={4} />
                            </div>
                        </div>
                    ) : (
                        <>
                            {viewMode === 'timeline' ? (
                                <TimelineView
                                    years={filtered}
                                    onEdit={handleEdit}
                                    onSetActive={handleSetActive}
                                    onDuplicate={handleDuplicate}
                                    onDelete={(y) => { setItemToDelete(y); setIsDeleteModalOpen(true) }}
                                    onToggleLock={handleToggleLock}
                                    onHistory={handleOpenHistory}
                                    canEdit={canEdit}
                                    submitting={submitting}
                                />
                            ) : (
                                <>
                                    <div className="hidden md:block overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead className="bg-[var(--color-surface-alt)] sticky top-0 z-10">
                                                <tr className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">
                                                    <th className="px-6 py-4 text-center w-12">
                                                        <input type="checkbox" checked={selectedIds.length === paged.length && paged.length > 0} onChange={toggleSelectAll} className="w-4 h-4 rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)] accent-[var(--color-primary)] cursor-pointer" />
                                                    </th>
                                                    {visibleCols.period && <th className="px-6 py-4 text-left">Tahun Pelajaran</th>}
                                                    {visibleCols.semester && <th className="px-6 py-4 text-left">Semester</th>}
                                                    {visibleCols.curriculum && <th className="px-6 py-4 text-left">Kurikulum</th>}
                                                    {visibleCols.duration && <th className="px-6 py-4 text-left">Pelaksanaan</th>}
                                                    {visibleCols.status && <th className="px-6 py-4 text-left">Status</th>}
                                                    <th className="px-6 py-4 text-center pr-6 w-32 relative">
                                                        <div className="flex items-center justify-center">
                                                            <span>Aksi</span>
                                                        </div>
                                                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                            <button ref={colMenuRef} onClick={(e) => {
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
                                                            }} title="Atur tampilan kolom"
                                                                className={`w-6 h-6 rounded-md flex items-center justify-center transition-all ${isColMenuOpen ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]'}`}>
                                                                <svg width="11" height="11" viewBox="0 0 12 12" fill="currentColor"><rect x="0" y="0" width="5" height="5" rx="1" /><rect x="7" y="0" width="5" height="5" rx="1" /><rect x="0" y="7" width="5" height="5" rx="1" /><rect x="7" y="7" width="5" height="5" rx="1" /></svg>
                                                            </button>
                                                            {isColMenuOpen && createPortal(
                                                                <div ref={colMenuPortalRef} className={`absolute z-[9999] w-48 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl shadow-black/10 p-2 space-y-0.5 animate-in fade-in zoom-in-95 ${colMenuPos.showUp ? 'slide-in-from-bottom-2' : 'slide-in-from-top-2'}`}
                                                                    style={{ top: colMenuPos.top, right: colMenuPos.right }}>
                                                                    <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] px-3 py-2">Atur Kolom</p>
                                                                    {[{ key: 'period', label: 'Tahun Pelajaran' }, { key: 'semester', label: 'Semester' }, { key: 'curriculum', label: 'Kurikulum' }, { key: 'duration', label: 'Pelaksanaan' }, { key: 'status', label: 'Status' }].map(({ key, label }) => (
                                                                        <button key={key} onClick={() => setVisibleCols(p => ({ ...p, [key]: !p[key] }))} className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-[var(--color-surface-alt)] transition-all group text-left">
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
{isEmpty ? (
                                                    <tr><td colSpan="5" className="py-24 text-center"><EmptyState icon={faSearch} title="Tidak ada data ditemukan" description="Sesuaikan filter atau kata kunci pencarian Anda" color="slate" variant="plain" /></td></tr>
                                                ) : paged.map(year => {
                                                    const isSelected = selectedIds.includes(year.id);
                                                    const ts = getTimeStatus(year.start_date, year.end_date)
                                                    return (
                                                        <tr key={year.id} className={`border-t border-[var(--color-border)] transition-colors group/row ${isSelected ? 'bg-[var(--color-primary)]/5' : 'hover:bg-[var(--color-surface-alt)]/40'}`}>
                                                            <td className="px-6 py-4"><input type="checkbox" checked={selectedIds.includes(year.id)} onChange={() => toggleSelect(year.id)} className="w-4 h-4 rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)] accent-[var(--color-primary)] cursor-pointer" /></td>
                                                            {visibleCols.period && (
                                                                <td className="px-6 py-4">
                                                                    <div className="flex items-start gap-3">
                                                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-black shadow-sm relative transition-transform hover:scale-110 shrink-0 ${year.is_active ? 'bg-gradient-to-br from-[var(--color-primary)]/10 to-[var(--color-accent)]/10 text-[var(--color-primary)]' : 'bg-[var(--color-surface-alt)] text-[var(--color-text-muted)]'}`}>
                                                                            <span className="relative z-10">{year.name?.slice(2, 4) || '??'}</span>
                                                                        </div>
                                                                        <div className="flex flex-col min-w-0 flex-1">
                                                                            <span className="font-extrabold text-sm text-[var(--color-text)] leading-snug truncate">
                                                                                {year.name}
                                                                            </span>
                                                                            <p className="text-[10px] text-[var(--color-text-muted)] font-mono opacity-60 uppercase tracking-wider mt-1">ID: {year.id.slice(0, 8)}</p>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                            )}
                                                            {visibleCols.semester && (
                                                                <td className="px-6 py-4">
                                                                    <span className={`text-[9px] font-black px-2 py-1 rounded-lg uppercase tracking-widest border ${year.semester === 'Ganjil' ? 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20' : 'bg-purple-500/10 text-purple-600 border-purple-500/20'}`}>
                                                                        {year.semester}
                                                                    </span>
                                                                </td>
                                                            )}
                                                            {visibleCols.curriculum && (
                                                                <td className="px-6 py-4">
                                                                    <span className="text-[11px] font-bold text-[var(--color-text-muted)]">
                                                                        {year.curriculum || 'Merdeka'}
                                                                    </span>
                                                                </td>
                                                            )}
                                                            {visibleCols.duration && (
                                                                <td className="px-6 py-4">
                                                                    <div className="flex flex-col">
                                                                        <span className="text-[11px] font-bold text-[var(--color-text)] whitespace-nowrap">{formatDate(year.start_date)} — {formatDate(year.end_date)}</span>
                                                                        <span className="text-[10px] text-[var(--color-text-muted)] mt-0.5">{getDuration(year.start_date, year.end_date)}</span>
                                                                    </div>
                                                                </td>
                                                            )}
                                                            {visibleCols.status && (
                                                                <td className="px-6 py-4 text-left">
                                                                    <div className="flex flex-wrap items-center gap-1.5">
                                                                        {year.is_active ? (
                                                                            <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded-lg">Aktif</span>
                                                                        ) : (
                                                                            <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] border border-[var(--color-border)] rounded-lg">Tidak Aktif</span>
                                                                        )}
                                                                        {year.is_locked && (
                                                                            <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-lg flex items-center gap-1">
                                                                                <FontAwesomeIcon icon={faBoxArchive} className="text-[8px]"/> Tutup
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                            )}
                                                            <td className="px-6 py-4">
                                                                <div className="flex items-center justify-center gap-1">
                                                                    {canEdit && (
                                                                        <button onClick={() => handleEdit(year)} title="Edit" className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-blue-500 hover:bg-blue-500/10 transition-all text-sm"><FontAwesomeIcon icon={faEdit} /></button>
                                                                    )}
                                                                    <button onClick={() => handleOpenHistory(year)} title="Riwayat" className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-purple-500 hover:bg-purple-500/10 transition-all text-sm"><FontAwesomeIcon icon={faHistory} /></button>
                                                                    {canEdit && (
                                                                        <button onClick={() => { setItemToDelete(year); setIsDeleteModalOpen(true) }} title="Hapus" className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-red-500 hover:bg-red-500/10 transition-all text-sm"><FontAwesomeIcon icon={faTrash} /></button>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="md:hidden divide-y divide-[var(--color-border)]">
                                        {paged.map(year => {
                                            const isSelected = selectedIds.includes(year.id);
                                            return (
                                                <div key={year.id} className={`p-4 transition-colors group/mob ${isSelected ? 'bg-[var(--color-primary)]/5' : ''}`}>
                                                    <div className="flex items-start gap-3">
                                                        <div className="flex flex-col items-center gap-3 pt-1">
                                                            <input type="checkbox" checked={selectedIds.includes(year.id)} onChange={() => toggleSelect(year.id)} className="w-4 h-4 rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)] accent-[var(--color-primary)] cursor-pointer shrink-0 mt-1" />
                                                        </div>
                                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-black shadow-sm relative transition-transform shrink-0 ${year.is_active ? 'bg-gradient-to-br from-[var(--color-primary)]/10 to-[var(--color-accent)]/10 text-[var(--color-primary)]' : 'bg-[var(--color-surface-alt)] text-[var(--color-text-muted)]'}`}>
                                                            <span className="relative z-10">{year.name?.slice(2, 4) || '??'}</span>
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-start justify-between gap-2">
                                                                <div className="min-w-0 flex-1" onClick={() => handleOpenReadOnlyDetail(year)}>
                                                                    <button className="font-extrabold text-sm text-[var(--color-text)] hover:text-[var(--color-primary)] text-left truncate block w-full">{year.name}</button>
                                                                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                                                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-widest border ${year.semester === 'Ganjil' ? 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20' : 'bg-purple-500/10 text-purple-600 border-purple-500/20'}`}>{year.semester}</span>
                                                                        <span className="text-[10px] font-bold text-[var(--color-text-muted)]">{formatDate(year.start_date)} — {formatDate(year.end_date)}</span>
                                                                    </div>
                                                                    <p className="text-[10px] text-[var(--color-text-muted)] font-mono mt-1 opacity-60 uppercase tracking-widest">ID: {year.id.slice(0, 8)}</p>
                                                                </div>
                                                                <div className="flex items-center gap-1">
                                                                    {canEdit && <button onClick={() => handleEdit(year)} className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]"><FontAwesomeIcon icon={faEdit} className="text-xs" /></button>}
                                                                </div>
                                                            </div>
                                                            <div className="mt-3 flex items-center gap-2">
                                                                {year.is_active ? (
                                                                    <div className="flex-1 h-9 rounded-xl flex items-center justify-center text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">Aktif</div>
                                                                ) : (
                                                                    <div className="flex-1 h-9 rounded-xl flex items-center justify-center text-[10px] font-black uppercase tracking-widest bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] border border-[var(--color-border)]">Tidak Aktif</div>
                                                                )}
                                                                <button onClick={() => handleOpenHistory(year)} className="flex-1 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 border border-indigo-500/20 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all"><FontAwesomeIcon icon={faHistory} className="text-xs" /> Riwayat</button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </>
                            )}
                        </>
                    )}
                    <Pagination totalRows={totalRows} page={page} pageSize={pageSize} setPage={setPage} setPageSize={setPageSize} label="data" jumpPage={jumpPage} setJumpPage={setJumpPage} />
                </div>

                {/* ── Modals ── */}
                <AcademicYearFormModal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setSelectedItem(null); }} selectedItem={selectedItem} years={years} onSubmit={handleSubmit} submitting={submitting} />
                <ArchiveModal isOpen={isDeleteModalOpen} onClose={() => { setIsDeleteModalOpen(false); setItemToDelete(null); }} selectedItem={itemToDelete} onConfirm={handleDeleteConfirm} submitting={submitting} />
                <DeactivateModal isOpen={isDeactivateConfirmOpen} onClose={() => { setIsDeactivateConfirmOpen(false); setItemToDeactivate(null); }} selectedItem={itemToDeactivate} onConfirm={handleDeactivateConfirm} submitting={submitting} />

                <Modal isOpen={isReadOnlyDetailOpen} onClose={() => { setIsReadOnlyDetailOpen(false); setReadOnlyDetailItem(null) }} title="Detail Tahun Pelajaran" size="full" mobileVariant="bottom-sheet">
                    {readOnlyDetailItem && (() => {
                        const ts = getTimeStatus(readOnlyDetailItem.start_date, readOnlyDetailItem.end_date)
                        return (
                            <div className="space-y-4 pb-2">
                                <div className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/30 flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Tahun Pelajaran</p>
                                        <h4 className="text-lg font-black text-[var(--color-text)] leading-tight truncate">{readOnlyDetailItem.name}</h4>
                                        <div className="flex flex-wrap items-center gap-2 mt-2">
                                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${readOnlyDetailItem.semester === 'Ganjil' ? 'bg-blue-500/10 text-blue-600 border border-blue-500/20' : 'bg-purple-500/10 text-purple-600 border border-purple-500/20'}`}>Semester {readOnlyDetailItem.semester}</span>
                                        </div>
                                    </div>
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-black shrink-0 ${readOnlyDetailItem.is_active ? 'bg-[var(--color-primary)] text-white shadow-md' : 'bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)]'}`}>{readOnlyDetailItem.name?.slice(2, 4) || '??'}</div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-2">Periode</p>
                                        <div className="text-xs font-bold">{formatDate(readOnlyDetailItem.start_date)} — {formatDate(readOnlyDetailItem.end_date)}</div>
                                    </div>
                                    <div className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-2">Durasi</p>
                                        <div className="text-xs font-black">{getDuration(readOnlyDetailItem.start_date, readOnlyDetailItem.end_date)}</div>
                                    </div>
                                </div>
                                <button onClick={() => { setIsReadOnlyDetailOpen(false); handleOpenHistory(readOnlyDetailItem) }} className="w-full h-12 rounded-xl bg-indigo-500/10 text-indigo-600 font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 border border-indigo-500/20"><FontAwesomeIcon icon={faHistory} />Riwayat Perubahan</button>
                                <button onClick={() => { setIsReadOnlyDetailOpen(false); setReadOnlyDetailItem(null) }} className="w-full h-12 rounded-xl bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] font-black text-[10px] uppercase tracking-widest transition-all">Tutup</button>
                            </div>
                        )
                    })()}
                </Modal>

                <Modal isOpen={isHistoryOpen} onClose={() => { setIsHistoryOpen(false); setHistoryItem(null) }} title={`Riwayat · ${historyItem?.name || ''}`} description="Audit log untuk rekaman ini." icon={faFingerprint} iconBg="bg-orange-500/10" iconColor="text-orange-500" size="lg">
                    {historyItem && <div className="h-[60vh] overflow-hidden"><AuditTimeline tableName="academic_years" recordId={historyItem.id} limit={30} /></div>}
                </Modal>

                <Modal isOpen={isBulkDeleteOpen} onClose={() => setIsBulkDeleteOpen(false)} title="Arsipkan Massal" description={`Pindahkan ${selectedIds.length} data ke arsip.`} icon={faBoxArchive} iconBg="bg-red-500/10" iconColor="text-red-500" size="sm" footer={<div className="flex gap-3"><button onClick={() => setIsBulkDeleteOpen(false)} className="h-9 px-4 rounded-xl border border-[var(--color-border)] text-[10px] font-black text-[var(--color-text-muted)] transition-all">Batal</button><div className="flex-1" /><button onClick={handleBulkDelete} disabled={submitting} className="h-9 px-5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-black text-[10px] transition-all flex items-center gap-2">Arsipkan Sekarang</button></div>}>
                    <p className="text-[11px] font-bold text-red-700/70 p-4 rounded-2xl bg-red-500/5 border border-red-500/10">Anda akan mengarsipkan <span className="font-black text-red-600">{selectedIds.length} tahun pelajaran</span> secara bersamaan.</p>
                </Modal>

                <AcademicYearArchiveModal
                    isOpen={isArchivedOpen}
                    onClose={() => setIsArchivedOpen(false)}
                    archivedYears={archivedYears}
                    loadingArchived={loadingArchived}
                    setArchivedYears={setArchivedYears}
                    fetchArchivedYears={fetchArchived}
                    fetchData={fetchData}
                    addToast={addToast}
                />

                <React.Suspense fallback={null}>
                    {isExportModalOpen && (
                        <LazyAcademicYearExportModal
                            isOpen={isExportModalOpen}
                            onClose={() => { if (exporting) return; setIsExportModalOpen(false) }}
                            years={filtered}
                            selectedIds={selectedIds}
                            exportScope={exportScope}
                            setExportScope={setExportScope}
                            exportColumns={exportColumns}
                            setExportColumns={setExportColumns}
                            exporting={exporting}
                            handleExportCSV={handleExportCSV}
                            handleExportExcel={handleExportExcel}
                            handleExportPDF={handleExportPDF}
                            addToast={addToast}
                        />
                    )}
                    {isImportModalOpen && (
                        <LazyAcademicYearImportModal
                            isOpen={isImportModalOpen}
                            onClose={() => {
                                if (importing) return
                                setIsImportModalOpen(false)
                                setImportPreview([])
                                setImportIssues([])
                                setImportFileName('')
                                setImportDragOver(false)
                                setImportStep(1)
                            }}
                            importing={importing}
                            importStep={importStep}
                            setImportStep={setImportStep}
                            importPreview={importPreview}
                            importFileName={importFileName}
                            importFileInputRef={importFileInputRef}
                            importDragOver={importDragOver}
                            setImportDragOver={setImportDragOver}
                            processImportFile={processImportFile}
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
            </div>
        </DashboardLayout>
    )
}