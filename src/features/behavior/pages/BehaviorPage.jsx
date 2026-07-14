import React, { useCallback, useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
    Plus, Search, Loader2, ArrowUp, ArrowDown, AlertTriangle,
    ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, CheckCircle2,
    Calendar, ClipboardList, Table, LayoutList, Upload, Download, FileSpreadsheet, FileText,
    Keyboard, Eye, EyeOff, Archive, RotateCcw, Sliders, Trash2, Edit2, X, AlertCircle, FileEdit,
    Shield, Gavel, Trophy, Info
} from 'lucide-react'
import { useAuth } from '@context/Auth'
import { useFlag } from '@context/FeatureFlags'
const LazyPointRulesTab = React.lazy(() => import('../ui/PointRulesTab'))

const LazyBehaviorExportModal = React.lazy(() => import('../ui/modals/BehaviorExportModal'))
const LazyBehaviorImportModal = React.lazy(() => import('../ui/modals/BehaviorImportModal'))
const LazyBehaviorFormModal = React.lazy(() => import('../ui/modals/BehaviorFormModal'))
const LazyBehaviorDetailModal = React.lazy(() => import('../ui/modals/BehaviorDetailModal'))
import DashboardLayout from '@core/layouts/DashboardLayout'
import StatsCarousel from '@shared/components/StatsCarousel'
import Breadcrumb from '@shared/components/Breadcrumb'
import PageHeader from '@shared/components/PageHeader'
import { StatCard, EmptyState } from '@shared/components/DataDisplay'
import Modal from '@shared/components/Modal'
import ConfirmDialog from '@shared/components/ConfirmDialog'
import BehaviorFilterBar from '../ui/BehaviorFilterBar'
import TimelineCard from '../ui/TimelineCard'
import BehaviorTableRow from '../ui/BehaviorTableRow'
import RichSelect from '@shared/components/RichSelect'
import { TableSkeleton } from '@shared/components/Skeleton'
import { useLanguage } from '@context/Language'
import Pagination from '@shared/components/Pagination'
import BulkActionsBar from '@shared/components/BulkActionsBar'
import { useBehaviorCore } from '../hooks/useBehaviorCore'

function getPortalContainer(id) {
    let el = document.getElementById(id);
    if (!el) {
        el = document.createElement('div');
        el.id = id;
        document.body.appendChild(el);
    }
    return el;
}


export default function BehaviorPage() {
    const { t, tNum, dir } = useLanguage()
    const tp = useCallback((key) => t(`behavior.${key}`), [t])

    const {
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
        handleRemoveImportRow,
        copyingData,
        copyDataFromMonth
    } = useBehaviorCore()

    const { profile } = useAuth()
    const { enabled: showPoinTab } = useFlag('module.violation_types')
    const isDevAdminTeacher = profile ? ['developer', 'admin', 'guru'].includes(profile.role?.toLowerCase()) : false

    const rulesStats = React.useMemo(() => {
        const activeRules = violationTypes.filter(v => (v.status || 'active') === 'active')
        const total = activeRules.length
        const violations = activeRules.filter(v => v.points < 0).length
        const achievements = activeRules.filter(v => v.points > 0).length
        const avgPoints = total ? Math.round(activeRules.reduce((acc, v) => acc + Math.abs(v.points), 0) / total) : 0
        return { total, violations, achievements, avgPoints }
    }, [violationTypes])

    const [activeTab, setActiveTab] = useState('reports')

    const [hasOpenedForm, setHasOpenedForm] = useState(false)
    const [hasOpenedDetail, setHasOpenedDetail] = useState(false)
    const [hasOpenedExport, setHasOpenedExport] = useState(false)
    const [hasOpenedImport, setHasOpenedImport] = useState(false)
    const [hasOpenedDelete, setHasOpenedDelete] = useState(false)
    const [hasOpenedBulkDelete, setHasOpenedBulkDelete] = useState(false)

    useEffect(() => { if (isModalOpen) setHasOpenedForm(true) }, [isModalOpen])
    useEffect(() => { if (isDetailOpen) setHasOpenedDetail(true) }, [isDetailOpen])
    useEffect(() => { if (isExportModalOpen) setHasOpenedExport(true) }, [isExportModalOpen])
    useEffect(() => { if (isImportModalOpen) setHasOpenedImport(true) }, [isImportModalOpen])
    useEffect(() => { if (isDeleteModalOpen) setHasOpenedDelete(true) }, [isDeleteModalOpen])
    useEffect(() => { if (isBulkDeleteOpen) setHasOpenedBulkDelete(true) }, [isBulkDeleteOpen])

    const handleTabChange = (newTab) => {
        setActiveTab(newTab)
    }

    const tDb = useCallback((text) => {
        if (!text) return text
        const key = `db.${text}`
        const val = t(key)
        return val === key ? text : val
    }, [t])

    const mask = useCallback((str, visibleLen = 3) => {
        if (!isPrivacyMode || !str) return str
        if (str.length <= visibleLen) return str[0] + '*'.repeat(Math.max(0, str.length - 1))
        return str.substring(0, visibleLen) + '***'
    }, [isPrivacyMode])

    const getTypeName = useCallback((id) => {
        const name = violationTypes.find((vt) => vt.id === id)?.name ?? '—'
        return tDb(name)
    }, [violationTypes, tDb])

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return
        await processImportFile(file)
        e.target.value = ''
    }

    const trendDiff = stats.today - (stats.yesterday || 0)
    const trendValue = trendDiff > 0 ? `+${trendDiff}` : trendDiff < 0 ? `${trendDiff}` : '0'
    const trendUp = trendDiff > 0 ? true : trendDiff < 0 ? false : null

    return (
        <DashboardLayout title={tp('title')}>
            <style>{`
                @keyframes longpress-progress {
                    0% { width: 0%; }
                    100% { width: 100%; }
                }
            `}</style>
            <div className="p-4 md:p-6 space-y-4 max-w-[1800px] mx-auto">


                {/* Read-only Banner — access.teacher_poin flag off */}
                {!canInput && (
                    <div className="px-4 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-2">
                        <EyeOff className="text-rose-500 shrink-0 w-4 h-4" />
                        <p className="text-[11px] font-bold text-rose-600 flex-1">{tp('readOnlyBanner')}</p>
                    </div>
                )}

                <React.Suspense fallback={null}>
                    {hasOpenedExport && (
                        <LazyBehaviorExportModal
                            isOpen={isExportModalOpen}
                            onClose={() => setIsExportModalOpen(false)}
                            exportScope={exportScope}
                            setExportScope={setExportScope}
                            exportColumns={exportColumns}
                            setExportColumns={setExportColumns}
                            handleExportCSV={handleExportCSV}
                            handleExportExcel={handleExportExcel}
                            handleExportPDF={handleExportPDF}
                            selectedCount={selectedIds.length}
                            allCount={totalRows}
                        />
                    )}
                    {hasOpenedImport && (
                        <LazyBehaviorImportModal
                            isOpen={isImportModalOpen}
                            onClose={() => setIsImportModalOpen(false)}
                            importing={importing}
                            importStep={importStep}
                            setImportStep={setImportStep}
                            importPreview={importPreview}
                            importFileName={importFileName}
                            importFileInputRef={importFileInputRef}
                            importDragOver={importDragOver}
                            setImportDragOver={setImportDragOver}
                            processImportFile={processImportFile}
                            students={students}
                            violationTypes={violationTypes}
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
                            handleBulkFix={handleBulkFix}
                            copyingData={copyingData}
                            copyDataFromMonth={copyDataFromMonth}
                        />
                    )}
                    <input
                        type="file"
                        ref={importFileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                        accept=".csv, .xlsx, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                    />
                </React.Suspense>

                {/* ── PAGE HEADER ── */}
                <PageHeader
                    badge="boarding"
                    breadcrumbs={[tp('analytics')]}
                    title={tp('title')}
                    subtitle={tp('subtitle')}
                    actions={activeTab === 'reports' ? (
                        <>

                            {/* Tombol opsi dropdown */}
                            <div className="relative">
                                <button
                                    ref={headerMenuBtnRef}
                                    onClick={() => { if (!isHeaderMenuOpen) setHeaderMenuRect(headerMenuBtnRef.current?.getBoundingClientRect()); setIsHeaderMenuOpen(v => !v) }}
                                    className={`h-9 w-9 rounded-lg border flex items-center justify-center text-sm transition-all ${isHeaderMenuOpen ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)]/30 text-[var(--color-primary)]' : 'bg-[var(--color-surface-alt)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-border)]'}`}
                                    title={tp('reportOptions')}
                                >
                                    <Sliders className="w-4 h-4" />
                                </button>

                                {/* Portaled Header Menu Dropdown */}
                                {headerMenuMounted && headerMenuRect && createPortal(
                                    <>
                                        <div
                                            className={`fixed inset-0 z-[9990] bg-black/[0.08] transition-opacity duration-200 ${isHeaderMenuOpen ? 'opacity-100' : 'opacity-0'}`}
                                            onClick={() => setIsHeaderMenuOpen(false)}
                                        />
                                        <div
                                            className={`fixed z-[9991] w-56 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl p-2 transition-[opacity,transform] duration-200 ease-out origin-top-right
                                            ${isHeaderMenuOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-2'}`}
                                            style={{
                                                top: headerMenuRect.bottom + 8,
                                                left: Math.max(10, headerMenuRect.right - 224)
                                            }}
                                        >
                                            <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] px-3 py-2">{tp('reportOptions')}</p>
                                            <button onClick={() => { setIsImportModalOpen(true); setIsHeaderMenuOpen(false) }}
                                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--color-surface-alt)] text-[var(--color-text)] transition-all group text-left">
                                                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                    <Upload className="w-4 h-4 text-xs" />
                                                </div>
                                                <div className="text-left">
                                                    <p className="text-[11px] font-black leading-tight">{tp('importData')}</p>
                                                    <p className="text-[9px] opacity-40 font-bold uppercase tracking-wider">xls, csv</p>
                                                </div>
                                            </button>
                                            <button onClick={() => { setIsExportModalOpen(true); setIsHeaderMenuOpen(false) }}
                                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--color-surface-alt)] text-[var(--color-text)] transition-all group text-left">
                                                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                    <Download className="w-4 h-4 text-xs" />
                                                </div>
                                                <div className="text-left">
                                                    <p className="text-[11px] font-black leading-tight">{tp('exportData')}</p>
                                                    <p className="text-[9px] opacity-40 font-bold uppercase tracking-wider">xls, csv</p>
                                                </div>
                                            </button>
                                        </div>
                                    </>,
                                    getPortalContainer('portal-header-menu')
                                )}
                            </div>

                            {/* Keyboard Shortcuts Button Standalone */}
                            <div className="relative hidden sm:block">
                                <button
                                    ref={shortcutBtnRef}
                                    onClick={() => { if (!isShortcutOpen) setShortcutRect(shortcutBtnRef.current?.getBoundingClientRect()); setIsShortcutOpen(v => !v) }}
                                    className={`h-9 w-9 rounded-lg border flex items-center justify-center transition-all ${isShortcutOpen ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)]/30 text-[var(--color-primary)]' : 'bg-[var(--color-surface-alt)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
                                    title={tp('shortcutTitle')}
                                >
                                    <Keyboard className="w-4 h-4 text-sm" />
                                </button>

                                {/* Portaled Keyboard Shortcuts Dropdown */}
                                {shortcutMounted && shortcutRect && createPortal(
                                    <>
                                        <div className="fixed inset-0 z-[9990] bg-black/[0.08]" onClick={() => setIsShortcutOpen(false)} />
                                        <div
                                            className={`fixed z-[9991] w-72 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl shadow-black/10 overflow-hidden text-left animate-in fade-in zoom-in-95 duration-200
                                            ${isShortcutOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-2'}`}
                                            style={{
                                                top: shortcutRect.bottom + 8,
                                                left: Math.max(10, shortcutRect.right - 288)
                                            }}
                                        >
                                            <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between">
                                                <p className="text-[11px] font-black uppercase tracking-widest text-[var(--color-text)]">{tp('shortcuts')}</p>
                                                <span className="text-[9px] text-[var(--color-text-muted)] font-bold">{tp('shortcutToggle')}</span>
                                            </div>
                                            <div className="p-3 space-y-0.5">
                                                {[
                                                    { section: tp('nav') },
                                                    { keys: ['Ctrl', 'K'], label: tp('shortcutSearch') },
                                                    { keys: ['Esc'], label: tp('shortcutEsc') },
                                                    { section: tp('actions') },
                                                    { keys: ['N'], label: tp('shortcutAdd') },
                                                    { keys: ['Ctrl', 'E'], label: tp('shortcutExport') },
                                                    { keys: ['Ctrl', 'I'], label: tp('shortcutImport') },
                                                    { section: tp('views') },
                                                    { keys: ['P'], label: tp('shortcutPrivacy') },
                                                    { keys: ['R'], label: tp('shortcutRefresh') },
                                                    { keys: ['X'], label: tp('shortcutReset') },
                                                    { keys: ['?'], label: tp('shortcutShow') },
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
                            </div>

                            {/* Privasi Button Standalone */}
                            <button
                                onClick={() => {
                                    setIsPrivacyMode(!isPrivacyMode)
                                }}
                                className={`h-9 px-3 rounded-lg border flex items-center gap-2 transition-all ${isPrivacyMode ? 'bg-amber-500/10 border-amber-500/30 text-amber-600' : 'bg-[var(--color-surface-alt)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'} `}
                                title={isPrivacyMode ? tp('disablePrivacy') : tp('enablePrivacy')}
                            >
                                {isPrivacyMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                <span className="text-[10px] font-black uppercase tracking-widest hidden md:inline">
                                    {tp('privacy')}
                                </span>
                            </button>

                            {/* Primary Add Button */}
                            <button onClick={handleAdd} disabled={!canInput}
                                className="h-9 px-4 sm:px-5 rounded-xl bg-[var(--color-primary)] text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-95 shadow-md shadow-[var(--color-primary)]/20 disabled:opacity-40 disabled:cursor-not-allowed border border-white/10"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                <span className="text-[10px] font-black uppercase tracking-widest">{canInput ? tp('createReport') : tp('readOnly')}</span>
                            </button>
                        </>
                    ) : null}
                />

                {/* ── STATS OVERVIEW (Top Level) ── */}
                {activeTab === 'reports' ? (
                    <StatsCarousel count={4} cols={4}>
                        <StatCard key="total" icon={ClipboardList} label={tp('total')} value={stats.total} color="primary" />
                        <StatCard key="positive" icon={CheckCircle2} label={tp('positive')} value={stats.positive} color="emerald"
                            onClick={() => setFilterType(prev => prev === 'positive' ? '' : 'positive')}
                            className={filterType === 'positive' ? 'ring-2 ring-[var(--color-primary)]/30' : ''} />
                        <StatCard key="negative" icon={AlertCircle} label={tp('negative')} value={stats.negative} color="rose"
                            onClick={() => setFilterType(prev => prev === 'negative' ? '' : 'negative')}
                            className={filterType === 'negative' ? 'ring-2 ring-[var(--color-primary)]/30' : ''} />
                        <StatCard key="today" icon={Calendar} label={tp('today')} value={stats.today} color="amber"
                            trend={trendValue}
                            trendUp={trendUp} />
                    </StatsCarousel>
                ) : (
                    <StatsCarousel count={4} cols={4}>
                        <StatCard key="total-rules" icon={Shield} label={tp('rulesTotal')} value={rulesStats.total} color="primary" />
                        <StatCard key="violations-rules" icon={Gavel} label={tp('rulesViolations')} value={rulesStats.violations} color="rose" />
                        <StatCard key="achievements-rules" icon={Trophy} label={tp('rulesAchievements')} value={rulesStats.achievements} color="emerald" />
                        <StatCard key="avg-rules" icon={Info} label={tp('rulesAvg')} value={rulesStats.avgPoints} color="amber" />
                    </StatsCarousel>
                )}

                {/* ── TABS ── */}
                {isDevAdminTeacher && showPoinTab && (
                    <div className="flex gap-1 sm:gap-1.5 p-1 rounded-2xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] w-full lg:w-fit overflow-x-auto scrollbar-hide">
                        <button
                            onClick={() => handleTabChange('reports')}
                            className={`flex-1 lg:flex-none h-9 px-6 rounded-xl text-[11px] font-black flex items-center justify-center gap-2 transition-all whitespace-nowrap ${activeTab === 'reports'
                                ? 'bg-[var(--color-surface)] text-[var(--color-primary)] shadow-sm'
                                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
                        >
                            <ClipboardList className="w-3.5 h-3.5" />
                            <span>{tp('tabReports')}</span>
                        </button>
                        <button
                            onClick={() => handleTabChange('rules')}
                            className={`flex-1 lg:flex-none h-9 px-6 rounded-xl text-[11px] font-black flex items-center justify-center gap-2 transition-all whitespace-nowrap ${activeTab === 'rules'
                                ? 'bg-[var(--color-surface)] text-[var(--color-primary)] shadow-sm'
                                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
                        >
                            <Sliders className="w-3.5 h-3.5" />
                            <span>{tp('tabRules')}</span>
                        </button>
                    </div>
                )}

                {activeTab === 'reports' ? (
                    <>

                {/* ── SEARCH + FILTER ── */}
                <BehaviorFilterBar
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    searchInputRef={searchInputRef}
                    filterType={filterType}
                    setFilterType={setFilterType}
                    filterClass={filterClass}
                    setFilterClass={setFilterClass}
                    sortBy={sortBy}
                    setSortBy={setSortBy}
                    viewMode={viewMode}
                    setViewMode={setViewMode}
                    selectedIds={selectedIds}
                    setSelectedIds={setSelectedIds}
                    reports={reports}
                    classesList={classesList}
                    showAdvFilter={showAdvFilter}
                    setShowAdvFilter={setShowAdvFilter}
                    setPage={setPage}
                    resetAllFilters={resetAllFilters}
                />

                {/* ── CONTENT ── */}
                {loading && reports.length === 0 ? (
                    viewMode === 'table' ? (
                        <TableSkeleton rows={10} cols={6} />
                    ) : (
                        <div className="glass rounded-2xl border border-[var(--color-border)] overflow-hidden animate-pulse">
                            <div className="p-4 sm:p-5">
                                <div className="relative pl-[28px] sm:pl-[64px]">
                                    {/* Vertical timeline line skeleton */}
                                    <div className="absolute top-0 bottom-0 pointer-events-none left-[14px] sm:left-[48px] w-[2px] bg-gradient-to-b from-[var(--color-border)]/40 via-[var(--color-border)]/20 to-transparent z-0" />
                                    
                                    {/* Group date skeleton */}
                                    {[1, 2].map((gi) => (
                                        <div key={gi} className={gi < 2 ? 'mb-7' : ''}>
                                            {/* Date Header skeleton */}
                                            <div className="relative mb-3.5 -ml-[28px] pl-[28px] sm:-ml-[64px] sm:pl-[64px] flex items-center">
                                                <div className="absolute pointer-events-none left-[9px] sm:left-[43px] w-4 h-4 rounded-full bg-[var(--color-border)]" />
                                                <div className="h-6 w-32 bg-[var(--color-border)] rounded-2xl" />
                                            </div>

                                            {/* Timeline Item skeletons */}
                                            <div className="space-y-2">
                                                {[1, 2].map((idx) => (
                                                    <div key={idx} className="relative -ml-[28px] pl-[28px] sm:-ml-[64px] sm:pl-[64px]">
                                                        <div className="absolute pointer-events-none left-[10px] sm:left-[44px] w-2.5 h-2.5 rounded-full bg-[var(--color-border)]" />
                                                        <div className="rounded-2xl border border-[var(--color-border)]/60 bg-[var(--color-surface)]/60 px-4 py-3.5 flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-[var(--color-border)] shrink-0" />
                                                            <div className="flex-1 space-y-2">
                                                                <div className="h-4 bg-[var(--color-border)] rounded-md w-1/3" />
                                                                <div className="h-3 bg-[var(--color-border)]/60 rounded w-2/3" />
                                                            </div>
                                                            <div className="w-12 h-6 bg-[var(--color-border)]/50 rounded-lg shrink-0" />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )
                ) : totalRows === 0 && !debouncedSearch && !filterType && !filterClass ? (
                    <div className="glass rounded-2xl border border-[var(--color-border)] overflow-hidden">
                        <div className="p-4 sm:p-5">
                            <EmptyState
                                variant="plain"
                                color="slate"
                                icon={ClipboardList}
                                title={tp('noReports')}
                                description={tp('noReportsDesc')}
                                action={
                                    <button onClick={handleAdd} disabled={!canInput} className="btn btn-primary h-10 px-6 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-[var(--color-primary)]/20 disabled:opacity-40 disabled:cursor-not-allowed">
                                        {canInput ? tp('createNow') : tp('readOnly')}
                                    </button>
                                }
                            />
                        </div>
                    </div>
                ) : viewMode === 'timeline' ? (

                    <div className={`glass rounded-2xl border border-[var(--color-border)] overflow-hidden animate-in fade-in duration-300 transition-all duration-300 relative ${loading ? 'opacity-65 pointer-events-none select-none blur-[0.5px]' : ''}`}>
                        {loading && (
                            <div className="absolute top-0 left-0 right-0 h-0.5 bg-[var(--color-primary)]/10 z-50 overflow-hidden">
                                <div className="h-full bg-[var(--color-primary)] animate-pulse w-full" />
                            </div>
                        )}
                        <div className="p-4 sm:p-5">
                            {reports.length === 0 ? (
                                <EmptyState
                                    variant="plain"
                                    color="slate"
                                    icon={Search}
                                    title={tp('noSearchResult')}
                                    description={tp('noSearchResultDesc')}
                                    action={
                                        <button
                                            type="button"
                                            onClick={resetAllFilters}
                                            className="h-9 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] transition-all"
                                        >
                                            {tp('resetAllFilters')}
                                        </button>
                                    }
                                />
                            ) : (
                                /* Timeline container — mobile smaller padding left, desktop 64px */
                                <div className="relative pl-[28px] sm:pl-[64px]">

                                {/* Vertical line at x=14px on mobile, x=48px on desktop */}
                                <div className="absolute top-0 bottom-0 pointer-events-none left-[14px] sm:left-[48px] w-[2px] bg-gradient-to-b from-[var(--color-primary)]/30 via-[var(--color-border)] to-transparent z-0" />

                                {groupedReports.map(([date, items], gi) => (
                                    <div key={date} className={gi < groupedReports.length - 1 ? 'mb-7' : ''}>

                                        {/* ── Date header ── */}
                                            <div className="relative mb-3.5 -ml-[28px] pl-[28px] sm:-ml-[64px] sm:pl-[64px]">
                                            {/* Large double-ring dot on the line */}
                                            <div className="absolute pointer-events-none left-[9px] sm:left-[43px] top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[var(--color-primary)]/20 flex items-center justify-center z-10 shadow-[0_0_8px_rgba(79,70,229,0.3)]">
                                                <div className="w-2 h-2 rounded-full bg-[var(--color-primary)] ring-2 ring-[var(--color-surface)]" />
                                            </div>
                                            <div className="flex items-center gap-3 bg-[var(--color-surface)]/95 backdrop-blur-md pl-4 pr-5 py-1.5 rounded-2xl border border-[var(--color-border)] w-fit shadow-md shadow-black/[0.02] shrink-0">
                                                <span className="text-[11px] font-black uppercase text-[var(--color-text)] tracking-wider leading-none whitespace-nowrap">{fmtDayLabel(date)}</span>
                                                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] opacity-40 animate-pulse shrink-0" />
                                                <span className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider font-extrabold leading-none whitespace-nowrap">{tNum(items.length)} {tp('reportCount')}</span>
                                            </div>
                                        </div>

                                        {/* ── Timeline items ── */}
                                        <div className="space-y-2">
                                            {items.map(r => (
                                                <TimelineCard
                                                    key={r.id}
                                                    r={r}
                                                    students={students}
                                                    violationTypes={violationTypes}
                                                    isPrivacyMode={isPrivacyMode}
                                                    selectedIds={selectedIds}
                                                    pressingId={pressingId}
                                                    handleCardPressStart={handleCardPressStart}
                                                    handleCardPressEnd={handleCardPressEnd}
                                                    handleCardPressCancel={handleCardPressCancel}
                                                    toggleSelect={toggleSelect}
                                                    handleOpenDetail={handleOpenDetail}
                                                    handleEdit={handleEdit}
                                                    setItemToDelete={setItemToDelete}
                                                    setIsDeleteModalOpen={setIsDeleteModalOpen}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            )}
                        </div>
                        <Pagination
                            totalRows={totalRows}
                            page={page}
                            pageSize={pageSize}
                            setPage={setPage}
                            setPageSize={setPageSize}
                            label={tp('reportCount')}
                            jumpPage={jumpPage}
                            setJumpPage={setJumpPage}
                        />
                    </div>

                ) : (
                    /* ═══════════════════════════════════════════════════════════
                       TABLE VIEW — pagination inside the same card
                    ═══════════════════════════════════════════════════════════ */
                    <div className={`glass rounded-2xl border border-[var(--color-border)] overflow-hidden animate-in fade-in duration-300 transition-all duration-300 relative ${loading ? 'opacity-65 pointer-events-none select-none blur-[0.5px]' : ''}`}>
                        {loading && (
                            <div className="absolute top-0 left-0 right-0 h-0.5 bg-[var(--color-primary)]/10 z-50 overflow-hidden">
                                <div className="h-full bg-[var(--color-primary)] animate-pulse w-full" />
                            </div>
                        )}
                        {reports.length === 0 ? (
                            <div className="p-4 sm:p-5">
                                <EmptyState
                                    variant="plain"
                                    color="slate"
                                    icon={Search}
                                    title={tp('noSearchResult')}
                                    description={tp('noSearchResultDesc')}
                                    action={
                                        <button
                                            type="button"
                                            onClick={resetAllFilters}
                                            className="h-9 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] transition-all"
                                        >
                                            {tp('resetAllFilters')}
                                        </button>
                                    }
                                />
                            </div>
                        ) : (
                            <>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse min-w-[750px]">
                                        <thead className="bg-[var(--color-surface-alt)]/60 border-b border-[var(--color-border)]">
                                            <tr>
                                                <th className="px-4 py-3.5 w-10 text-center">
                                                    <input type="checkbox" checked={allSelected}
                                                        onChange={() => setSelectedIds(allSelected ? [] : reports.map(r => r.id))}
                                                        className="w-4 h-4 rounded border-[var(--color-border)] cursor-pointer" />
                                                </th>
                                                <th className="px-4 py-3.5 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] w-[25%]">{tp('studentCol')}</th>
                                                {visibleCols.type && <th className="px-4 py-3.5 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] w-[35%]">{tp('reportType')}</th>}
                                                {visibleCols.points && <th className="px-4 py-3.5 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] text-center w-[10%]">{tp('points')}</th>}
                                                {visibleCols.time && <th className="px-4 py-3.5 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] w-[15%]">{tp('time')}</th>}
                                                {visibleCols.teacher && <th className="px-4 py-3.5 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] w-[15%]">{tp('recordedBy')}</th>}
                                                <th className="px-4 py-3.5 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] text-center w-28 relative">
                                                    <span>{tp('actions')}</span>
                                                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                                        <button
                                                            onClick={(e) => {
                                                                const rect = e.currentTarget.getBoundingClientRect()
                                                                const spaceBelow = window.innerHeight - rect.bottom
                                                                const showUp = spaceBelow < 185 && rect.top > 185
                                                                setMenuPos({
                                                                    top: showUp ? (rect.top + window.scrollY - 8) : (rect.bottom + window.scrollY + 8),
                                                                    right: window.innerWidth - rect.right - window.scrollX,
                                                                    showUp
                                                                })
                                                                setIsColMenuOpen(p => !p)
                                                            }}
                                                            className={`w-6 h-6 rounded-md flex items-center justify-center transition-all ${isColMenuOpen ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]'}`}
                                                        >
                                                            <svg width="10" height="10" viewBox="0 0 12 12" fill="currentColor"><rect x="0" y="0" width="5" height="5" rx="1" /><rect x="7" y="0" width="5" height="5" rx="1" /><rect x="0" y="7" width="5" height="5" rx="1" /><rect x="7" y="7" width="5" height="5" rx="1" /></svg>
                                                        </button>
                                                        {isColMenuOpen && createPortal(
                                                            <div ref={colMenuRef} className="absolute z-[9999] w-44 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl p-2 space-y-0.5 animate-in fade-in zoom-in-95 slide-in-from-top-2"
                                                                style={{
                                                                    top: menuPos.top,
                                                                    right: menuPos.right,
                                                                    transform: menuPos.showUp ? 'translateY(-100%)' : undefined
                                                                }}>
                                                                <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] px-3 py-2">{tp('manageColumns')}</p>
                                                                {[
                                                                    { key: 'type', label: tp('reportType') },
                                                                    { key: 'points', label: tp('points') },
                                                                    { key: 'time', label: tp('time') },
                                                                    { key: 'teacher', label: tp('recordedBy') }
                                                                ].map(({ key, label }) => (
                                                                    <button key={key} onClick={() => setVisibleCols(p => ({ ...p, [key]: !p[key] }))} className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-[var(--color-surface-alt)] transition-all group text-left">
                                                                        <span className="text-[10px] font-bold text-[var(--color-text)] group-hover:text-[var(--color-primary)]">{label}</span>
                                                                        <div className={`w-7 h-4 rounded-full transition-all flex items-center px-0.5 ${visibleCols[key] ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'}`}>
                                                                            <div className={`w-3 h-3 rounded-full bg-white shadow-sm transition-all ${visibleCols[key] ? 'translate-x-[12px]' : 'translate-x-0'}`} />
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
                                        <tbody className="divide-y divide-[var(--color-border)]">
                                            {reports.map(r => (
                                                <BehaviorTableRow
                                                    key={r.id}
                                                    r={r}
                                                    students={students}
                                                    violationTypes={violationTypes}
                                                    selectedIds={selectedIds}
                                                    toggleSelect={toggleSelect}
                                                    isPrivacyMode={isPrivacyMode}
                                                    visibleCols={visibleCols}
                                                    handleOpenDetail={handleOpenDetail}
                                                    handleEdit={handleEdit}
                                                    setItemToDelete={setItemToDelete}
                                                    setIsDeleteModalOpen={setIsDeleteModalOpen}
                                                />
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <Pagination
                                    totalRows={totalRows}
                                    page={page}
                                    pageSize={pageSize}
                                    setPage={setPage}
                                    setPageSize={setPageSize}
                                    label={tp('reportCount')}
                                    jumpPage={jumpPage}
                                    setJumpPage={setJumpPage}
                                />
                            </>
                        )}
                    </div>
                )}

                {/* ── FLOATING BULK ACTION BAR ── */}
                <BulkActionsBar
                    selectedCount={selectedIds.length}
                    onClear={() => setSelectedIds([])}
                    title={tp('selected')}
                    subtitle={tp('bulkActions')}
                >
                    {/* Action 1: Export Selected */}
                    <button
                        onClick={() => {
                            setExportScope('selected');
                            setIsExportModalOpen(true);
                        }}
                        className="h-9 px-4 rounded-xl transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white justify-center shadow-lg shadow-emerald-500/5"
                    >
                        <Download className="w-3.5 h-3.5" />
                        <span>{tp('exportData')}</span>
                    </button>

                    {/* Action 2: Delete Selected (Only for roles with input capability) */}
                    {canInput && (
                        <button
                            onClick={() => setIsBulkDeleteOpen(true)}
                            className="h-9 px-4 rounded-xl transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500 hover:text-white justify-center shadow-lg shadow-red-500/5"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>{tp('delete')}</span>
                        </button>
                    )}
                </BulkActionsBar>

                {/* ── WIZARD FORM MODAL ── */}
                <React.Suspense fallback={null}>
                    {hasOpenedForm && (
                        <LazyBehaviorFormModal
                            isOpen={isModalOpen}
                            onClose={() => setIsModalOpen(false)}
                            selectedItem={selectedItem}
                            students={students}
                            violationTypes={violationTypes}
                            classesList={classesList}
                            onSubmit={handleSubmit}
                            submitting={submitting}
                        />
                    )}
                </React.Suspense>

                {/* ── DELETE MODAL ── */}
                {hasOpenedDelete && (
                    <ConfirmDialog
                        isOpen={isDeleteModalOpen}
                        onClose={() => setIsDeleteModalOpen(false)}
                        onConfirm={handleDeleteConfirm}
                        title={tp('deleteReport')}
                        description={tp('deleteReportDesc')}
                        icon={Trash2}
                        confirmText={tp('yesDelete')}
                        confirmIcon={Trash2}
                        cancelText={tp('cancel')}
                        submitting={submitting}
                    >
                        <div className="px-1">
                            <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed font-bold">
                                {(() => {
                                    const deleteConfirmText = tp('deleteConfirmTemplate')
                                        .replace('{student}', '___STUDENT___')
                                        .replace('{points}', '___POINTS___');
                                    const parts = deleteConfirmText.split(/(___STUDENT___|___POINTS___)/);
                                    return parts.map((part, i) => {
                                        if (part === '___STUDENT___') {
                                            return (
                                                <span key={i} className="text-red-500 font-black px-1.5 py-0.5 bg-red-500/10 rounded-md border border-red-500/20">
                                                    {mask(students.find(s => s.id === itemToDelete?.student_id)?.name || '')}
                                                </span>
                                            );
                                        }
                                        if (part === '___POINTS___') {
                                            return (
                                                <span key={i} className="text-red-500 font-black px-1.5 py-0.5 bg-red-500/10 rounded-md border border-red-500/20">
                                                    {itemToDelete?.points > 0 ? `+${tNum(itemToDelete.points)}` : tNum(itemToDelete?.points)}
                                                </span>
                                            );
                                        }
                                        return part;
                                    });
                                })()}
                            </p>
                        </div>
                    </ConfirmDialog>
                )}

                {/* ── BULK DELETE MODAL ── */}
                {hasOpenedBulkDelete && (
                    <ConfirmDialog
                        isOpen={isBulkDeleteOpen}
                        onClose={() => setIsBulkDeleteOpen(false)}
                        onConfirm={handleBulkDelete}
                        title={tp('bulkDelete')}
                        description={tp('bulkDeleteDesc')}
                        icon={Trash2}
                        confirmText={`${tp('yesDelete')} ${tNum(selectedIds.length)} ${tp('reportCount')}`}
                        confirmIcon={Trash2}
                        cancelText={tp('cancel')}
                        submitting={submitting}
                    >
                        <div className="px-1 space-y-3">
                            {/* Warning text */}
                            <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed font-bold">
                                {tp('bulkDeleteWarning1')} <span className="text-red-500 font-black px-1.5 py-0.5 bg-red-500/10 rounded-md border border-red-500/20">{tNum(selectedIds.length)} {tp('reportCount')}</span> {tp('bulkDeleteWarning2')}
                            </p>

                            {/* Preview list of reports to be deleted */}
                            <div className={`rounded-xl border border-red-500/10 bg-red-500/[0.03] overflow-hidden ${selectedIds.length > 4 ? 'max-h-[200px] overflow-y-auto' : ''}`}>
                                {selectedIds.map((id, idx) => {
                                    const r = reports.find(x => x.id === id)
                                    if (!r) return null
                                    const s = students.find(x => x.id === r.student_id)
                                    const isPos = (r.points ?? 0) > 0
                                    return (
                                        <div key={id} className={`flex items-center gap-2.5 px-3 py-2 ${idx < selectedIds.length - 1 ? 'border-b border-red-500/10' : ''}`}>
                                            {/* Avatar */}
                                            <div className={`w-6 h-6 rounded-lg flex items-center justify-center font-black text-[10px] shrink-0 ${isPos ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'}`}>
                                                {(s?.name || '?')[0].toUpperCase()}
                                            </div>
                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[11px] font-black text-[var(--color-text)] truncate">{isPrivacyMode ? mask(s?.name || '—') : (s?.name || '—')}</p>
                                                <p className="text-[9px] text-[var(--color-text-muted)] opacity-60 truncate">{getTypeName(r.violation_type_id)}</p>
                                            </div>
                                            {/* Points badge */}
                                            <span className={`shrink-0 text-[10px] font-black px-1.5 py-0.5 rounded-lg border ${isPos ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-red-500/10 text-red-600 border-red-500/20'}`}>
                                                {isPos ? '+' : ''}{tNum(r.points)}
                                            </span>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </ConfirmDialog>
                )}

                {/* ── DETAIL MODAL ── */}
                <React.Suspense fallback={null}>
                    {hasOpenedDetail && (
                        <LazyBehaviorDetailModal
                            isOpen={isDetailOpen}
                            onClose={() => { setIsDetailOpen(false); setDetailItem(null); }}
                            detailItem={detailItem}
                            students={students}
                            violationTypes={violationTypes}
                            isPrivacyMode={isPrivacyMode}
                            canInput={canInput}
                            onEdit={(r) => { setSelectedItem(r); setIsModalOpen(true) }}
                            onDelete={(r) => { setItemToDelete(r); setIsDeleteModalOpen(true) }}
                        />
                    )}
                </React.Suspense>
                    </>
                ) : (
                    <React.Suspense fallback={
                        <div className="h-64 flex flex-col items-center justify-center gap-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl">
                            <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)]" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] animate-pulse">{t('behavior.loading')}</span>
                        </div>
                    }>
                        <LazyPointRulesTab
                            showStats={false}
                            initialPoin={violationTypes}
                            initialClasses={classesObjects}
                        />
                    </React.Suspense>
                )}

            </div>
        </DashboardLayout >
    )
}