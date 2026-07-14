import React, { useState, useRef, memo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faUserPlus, faUsers, faCheckCircle, faXmarkCircle, faClipboardList,
    faMars, faVenus, faSliders, faRotateLeft, faXmark, faWaveSquare,
    faSquareCheck, faCheckDouble, faBookQuran, faSearch, faSchool,
    faHourglassHalf, faArrowRight, faTrash, faBoxArchive, faChevronDown,
    faFileExport, faFileExcel, faFilePdf, faChartPie, faFileImport,
    faClipboardCheck, faGraduationCap, faBell, faSpinner
} from '@fortawesome/free-solid-svg-icons'
import DashboardLayout from '@core/layouts/DashboardLayout'
import {
    Breadcrumb,
    Modal,
    StatCard,
    EmptyState,
    StatsCarousel,
    Pagination,
    RichSelect,
    RichDatePicker
} from '@shared/components'
import { useToast, useLanguage } from '@context'
import { useEnrollmentCore } from '@features/enrollment/hooks/useEnrollmentCore'
import { EnrollmentRow, EnrollmentMobileCard, EnrollmentSkeletonRow, EnrollmentSkeletonCard } from '@features/enrollment/components/EnrollmentRow'
import EnrollmentFormModal from '@features/enrollment/components/EnrollmentFormModal'
import EnrollmentProfileModal from '@features/enrollment/components/EnrollmentProfileModal'
import EnrollmentWaveModal from '@features/enrollment/components/EnrollmentWaveModal'
import EnrollmentSearch from '@features/enrollment/components/EnrollmentSearch'
import EnrollmentArchiveModal from '@features/enrollment/components/EnrollmentArchiveModal'
import EnrollmentConvertModal from '@features/enrollment/components/EnrollmentConvertModal'
import EnrollmentImportModal from '@features/enrollment/components/EnrollmentImportModal'
import EnrollmentExportModal from '@features/enrollment/components/EnrollmentExportModal'
import EnrollmentStatsModal from '@features/enrollment/components/EnrollmentStatsModal'
import EnrollmentAssessmentModal from '@features/enrollment/components/EnrollmentAssessmentModal'
import EnrollmentPaymentModal from '@features/enrollment/components/EnrollmentPaymentModal'
import { useEnrollmentImportExport } from '@features/enrollment/hooks/useEnrollmentImportExport'
import { STATUS_CONFIG, PROGRAM_OPTIONS, REQUIRED_DOCUMENTS } from '@features/enrollment/utils/enrollmentConstants'

function getPortalContainer(id) {
    let el = document.getElementById(id)
    if (!el) { el = document.createElement('div'); el.id = id; document.body.appendChild(el) }
    return el
}


export default function EnrollmentPage() {
    const { addToast, addUndoToast } = useToast()
    const { dir } = useLanguage()
    const core = useEnrollmentCore({ addToast, addUndoToast })
    const [jumpPage, setJumpPage] = useState('')
    const [isArchiveOpen, setIsArchiveOpen] = useState(false)
    const [showStatusDropdown, setShowStatusDropdown] = useState(false)
    const [validationModal, setValidationModal] = useState({ isOpen: false, type: '', missingDocs: [], enrollment: null, nextStatus: '' })
    const [isPaymentOpen, setIsPaymentOpen] = useState(false)
    const [paymentEnrollment, setPaymentEnrollment] = useState(null)
    const [showAdvancedFilter, setShowAdvancedFilter] = useState(false)

    // Header menu dropdown
    const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false)
    const [headerMenuRect, setHeaderMenuRect] = useState(null)
    const headerMenuBtnRef = useRef(null)
    const [isStatsModalOpen, setIsStatsModalOpen] = useState(false)

    const {
        enrollments, waves, loading, totalRows, globalStats, pipelineDistribution,
        searchQuery, setSearchQuery, filterWave, setFilterWave,
        filterStatus, setFilterStatus, filterGender, setFilterGender,
        filterProgram, setFilterProgram,
        filterDateFrom, setFilterDateFrom, filterDateTo, setFilterDateTo,
        sortBy, setSortBy,
        activeFilterCount, resetAllFilters,
        page, setPage, pageSize, setPageSize,
        isFormOpen, isProfileOpen, isWaveModalOpen, setIsWaveModalOpen,
        activeModal, setActiveModal, selectedEnrollment,
        selectedIds, setSelectedIds, selectedIdSet, allSelected, submitting,
        uploadingPhoto, handlePhotoUpload,
        sendingReminders, handleSendDocumentReminders,
        handleAdd, handleEdit, handleViewProfile,
        closeForm, closeProfile, closeModal,
        handleSubmit, confirmDelete, executeDelete, enrollmentToDelete,
        updateStatus, toggleSelectAll, toggleSelect,
        handleBulkApprove, handleBulkReject, searchInputRef, fetchData,
        archivedEnrollments, loadingArchived, fetchArchivedEnrollments,
        handleRestoreEnrollment, handlePermanentDeleteEnrollment,
        handleBulkArchive, handleBulkStatusChange,
        isConvertOpen, setIsConvertOpen,
        isAssessmentOpen, setIsAssessmentOpen,
        assessmentEnrollment, handleAssessmentSubmit,
        convertingEnrollment, setConvertingEnrollment,
        converting, classes, handleConvertToStudent,
        generateCode, debouncedSearch, selectedEnrollments, allEnrollments,
        updateNotes, updatePaymentStatus, updateOrientation, sendOrientationNotification
    } = core

    const activePaymentEnrollment = paymentEnrollment ? enrollments.find(e => e.id === paymentEnrollment.id) || paymentEnrollment : null

    const handleSearchChange = useCallback((val) => setSearchQuery(val), [setSearchQuery])

    const handleStatusChangeWithValidation = useCallback((enrollment, nextStatus) => {
        const currentStatus = enrollment.status;

        // Validasi 1: Mendaftar -> Verifikasi (Membutuhkan dokumen kelengkapan fisik)
        if (currentStatus === 'mendaftar' && nextStatus === 'verifikasi') {
            const missingDocs = REQUIRED_DOCUMENTS.filter(doc => !enrollment.documents?.[doc.id]);
            if (missingDocs.length > 0) {
                setValidationModal({ isOpen: true, type: 'docs', missingDocs, enrollment, nextStatus });
                return;
            }
        }

        // Validasi 2: dihapus karena sudah di-handle oleh AssessmentModal di useEnrollmentCore

        // Lolos validasi, eksekusi pembaruan
        updateStatus(enrollment, nextStatus);
    }, [updateStatus]);

    const importFileInputRef = useRef(null)
    const ie = useEnrollmentImportExport({
        enrollments,
        waves,
        fetchData,
        addToast,
        closeModal,
        importFileInputRef,
        generateCode,
        selectedIds,
        selectedEnrollments,
        filterWave,
        filterStatus,
        filterGender,
        filterProgram,
        debouncedSearch,
        sortBy
    })

    return (
        <DashboardLayout title="PSB / Enrollment" subtitle="Penerimaan Santri Baru">
            <div className="p-4 md:p-6 space-y-4 max-w-[1800px] mx-auto min-h-screen relative">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                        <Breadcrumb badge="Master Data" items={['PSB / Enrollment']} className="mb-1" />
                        <h1 className="text-2xl font-black font-heading tracking-tight text-[var(--color-text)]">Penerimaan Santri Baru</h1>
                        <p className="text-[var(--color-text-muted)] text-[11px] mt-1 font-medium">Kelola pendaftaran dan seleksi calon santri baru</p>
                    </div>
                    <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
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
                        {isHeaderMenuOpen && headerMenuRect && createPortal(
                            <>
                                <div
                                    className="fixed inset-0 z-[9990] bg-black/5 backdrop-blur-[1px] transition-opacity duration-200 opacity-100"
                                    onClick={() => setIsHeaderMenuOpen(false)}
                                />
                                <div
                                    className="fixed z-[9991] w-56 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl p-2 transition-all duration-200 ease-out origin-top-right opacity-100 scale-100 translate-y-0 animate-in fade-in zoom-in-95"
                                    style={{
                                        top: headerMenuRect.bottom + 8,
                                        left: Math.max(10, headerMenuRect.right - 224)
                                    }}
                                >
                                    <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] px-3 py-2">Data</p>
                                    <button onClick={() => { setIsHeaderMenuOpen(false); ie.handleImportClick() }}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--color-surface-alt)] text-[var(--color-text)] transition-all group">
                                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <FontAwesomeIcon icon={faFileImport} className="text-xs" />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-[11px] font-black leading-tight">Import Excel / CSV</p>
                                            <p className="text-[9px] opacity-60 font-medium leading-tight mt-0.5">Unggah massal data calon santri</p>
                                        </div>
                                    </button>
                                    <button onClick={() => { setIsHeaderMenuOpen(false); ie.setIsExportModalOpen(true) }}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--color-surface-alt)] text-[var(--color-text)] transition-all group">
                                        <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <FontAwesomeIcon icon={faFileExport} className="text-xs" />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-[11px] font-black leading-tight">Export Data</p>
                                            <p className="text-[9px] opacity-60 font-medium leading-tight mt-0.5">Cadangkan data ke Excel, CSV, PDF</p>
                                        </div>
                                    </button>
                                    <button onClick={() => { setIsHeaderMenuOpen(false); setIsStatsModalOpen(true) }}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--color-surface-alt)] text-[var(--color-text)] transition-all group">
                                        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <FontAwesomeIcon icon={faChartPie} className="text-xs" />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-[11px] font-black leading-tight">Statistik PSB</p>
                                            <p className="text-[9px] opacity-60 font-medium leading-tight mt-0.5">Visualisasi chart data pendaftaran</p>
                                        </div>
                                    </button>

                                    <div className="h-px bg-[var(--color-border)] my-1 mx-2" />
                                    <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] px-3 py-2">Manajemen</p>
                                    <button onClick={() => { setIsHeaderMenuOpen(false); setIsWaveModalOpen(true) }}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--color-surface-alt)] text-[var(--color-text)] transition-all group">
                                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <FontAwesomeIcon icon={faWaveSquare} className="text-xs" />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-[11px] font-black leading-tight">Gelombang</p>
                                            <p className="text-[9px] opacity-60 font-medium leading-tight mt-0.5">Atur periode & kuota pendaftaran</p>
                                        </div>
                                    </button>
                                    <button onClick={() => { setIsHeaderMenuOpen(false); setIsArchiveOpen(true); fetchArchivedEnrollments() }}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--color-surface-alt)] text-[var(--color-text)] transition-all group">
                                        <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <FontAwesomeIcon icon={faBoxArchive} className="text-xs" />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-[11px] font-black leading-tight">Arsip Pendaftar</p>
                                            <p className="text-[9px] opacity-60 font-medium leading-tight mt-0.5">Lihat & pulihkan data yang diarsipkan</p>
                                        </div>
                                    </button>
                                    <button onClick={async () => { 
                                        setIsHeaderMenuOpen(false); 
                                        if (window.confirm("Kirim pengingat WhatsApp secara otomatis kepada pendaftar dengan dokumen persyaratan yang belum lengkap (< 100%)?")) {
                                            await handleSendDocumentReminders();
                                        }
                                    }}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--color-surface-alt)] text-[var(--color-text)] transition-all group"
                                        disabled={sendingReminders}
                                    >
                                        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <FontAwesomeIcon icon={sendingReminders ? faSpinner : faBell} className={`text-xs ${sendingReminders ? 'fa-spin' : ''}`} />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-[11px] font-black leading-tight">Pengingat Berkas</p>
                                            <p className="text-[9px] opacity-60 font-medium leading-tight mt-0.5">Kirim auto-nudge kelengkapan dokumen via WA</p>
                                        </div>
                                    </button>
                                </div>
                            </>,
                            getPortalContainer('portal-enrollment-header-menu')
                        )}

                        <button onClick={handleAdd} className="h-9 px-4 sm:px-5 rounded-xl bg-[var(--color-primary)] text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-95 shadow-md shadow-[var(--color-primary)]/20 border border-white/10 shrink-0">
                            <FontAwesomeIcon icon={faUserPlus} className="text-[10px]" />
                            <span>Tambah Pendaftar</span>
                        </button>
                    </div>
                </div>

                {/* Stats */}
                <StatsCarousel count={5} cols={5}>
                    <StatCard icon={faUsers} label="Total Pendaftar" value={globalStats.total} color="sky" />
                    <StatCard icon={faHourglassHalf} label="Menunggu" value={globalStats.mendaftar + globalStats.verifikasi} color="amber" />
                    <StatCard icon={faBookQuran} label="Tahap Tes" value={globalStats.tes} color="indigo" />
                    <StatCard icon={faCheckCircle} label="Diterima" value={globalStats.diterima} color="emerald" subValue={globalStats.quota ? `Kuota: ${globalStats.quotaLeft} sisa` : undefined} />
                    <StatCard icon={faXmarkCircle} label="Ditolak" value={globalStats.ditolak} color="rose" />
                </StatsCarousel>

                {/* Filter Bar */}
                <div className="glass rounded-[1.5rem] mb-4 border border-[var(--color-border)] overflow-hidden">
                    <div className="flex items-center gap-2 p-2.5 lg:p-3">
                        <div className="flex-initial w-full lg:w-[232px] xl:w-[352px] min-w-[120px]">
                            <EnrollmentSearch searchQuery={searchQuery} onSearch={handleSearchChange} inputRef={searchInputRef} isLoading={loading} />
                        </div>

                        {/* Quick Filters — Desktop */}
                        <div className="hidden lg:flex flex-1 items-center gap-2 overflow-x-auto scrollbar-hide py-0.5 min-w-0 pr-8 [mask-image:linear-gradient(to_right,black_calc(100%-32px),transparent)]">
                            <div className="h-4 w-px bg-[var(--color-border)] mx-1" />
                            {/* Status chips */}
                            <div className="flex items-center gap-1.5 shrink-0">
                                {[
                                    { id: '', label: 'Semua', icon: faUsers },
                                    { id: 'mendaftar', label: 'Mendaftar', icon: faClipboardList },
                                    { id: 'verifikasi', label: 'Verifikasi', icon: faHourglassHalf },
                                    { id: 'tes', label: 'Tes', icon: faBookQuran },
                                    { id: 'diterima', label: 'Diterima', icon: faCheckCircle },
                                    { id: 'ditolak', label: 'Ditolak', icon: faXmarkCircle },
                                ].map(s => (
                                    <button
                                        key={s.id}
                                        onClick={() => { setFilterStatus(s.id); setPage(1); }}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border ${filterStatus === s.id
                                            ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white shadow-sm shadow-[var(--color-primary)]/20'
                                            : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)]/30 hover:bg-[var(--color-primary)]/5'}`}
                                    >
                                        <FontAwesomeIcon icon={s.icon} className={`text-[10px] ${filterStatus === s.id ? 'opacity-100' : 'opacity-30'}`} />
                                        {s.label}
                                    </button>
                                ))}
                            </div>
                            <div className="h-4 w-px bg-[var(--color-border)] mx-1 shrink-0" />
                            {/* Gender */}
                            <div className="flex items-center gap-1.5 shrink-0">
                                {[
                                    { id: 'L', label: 'Putra', icon: faMars, cls: 'bg-blue-500 border-blue-500 hover:bg-blue-600' },
                                    { id: 'P', label: 'Putri', icon: faVenus, cls: 'bg-pink-500 border-pink-500 hover:bg-pink-600' }
                                ].map(g => (
                                    <button
                                        key={g.id}
                                        onClick={() => { setFilterGender(filterGender === g.id ? '' : g.id); setPage(1); }}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border ${filterGender === g.id
                                            ? `${g.cls} text-white shadow-sm shadow-black/10`
                                            : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)]/30 hover:bg-[var(--color-primary)]/5'}`}
                                    >
                                        <FontAwesomeIcon icon={g.icon} className={`text-[10px] ${filterGender === g.id ? 'opacity-100' : 'opacity-30'}`} />
                                        {g.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2 shrink-0 ml-auto">
                            <button onClick={toggleSelectAll}
                                className={`h-9 px-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2 ${selectedIds.length > 0
                                    ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white shadow-md shadow-[var(--color-primary)]/10'
                                    : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]'}`}>
                                <FontAwesomeIcon icon={selectedIds.length > 0 ? faCheckDouble : faSquareCheck} />
                                <span className="hidden xs:inline">{selectedIds.length > 0 ? 'Terpilih' : 'Pilih'}</span>
                                {selectedIds.length > 0 && <span className="w-4 h-4 rounded-full bg-white/20 text-white text-[9px] font-black flex items-center justify-center">{selectedIds.length}</span>}
                            </button>

                            <button
                                onClick={() => setShowAdvancedFilter(!showAdvancedFilter)}
                                className={`h-9 px-3 sm:px-4 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 ${showAdvancedFilter || activeFilterCount > 0 ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white shadow-md shadow-[var(--color-primary)]/30' : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]'} `}
                            >
                                <FontAwesomeIcon icon={faSliders} />
                                <span className="hidden xs:inline">Filter</span>
                                {activeFilterCount > 0 && (
                                    <span className="w-4 h-4 rounded-full bg-white/30 text-white text-[9px] font-black flex items-center justify-center">
                                        {activeFilterCount}
                                    </span>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Active filter chips */}
                    {activeFilterCount > 0 && (
                        <div className="px-3 pb-3 -mt-1">
                            <div className="flex flex-wrap gap-2">
                                {searchQuery && (
                                    <button onClick={() => setSearchQuery('')} className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/40 text-[10px] font-black text-[var(--color-text)]">
                                        <FontAwesomeIcon icon={faSearch} className="text-[10px] opacity-60" />
                                        <span className="max-w-[180px] truncate">"{searchQuery}"</span>
                                        <span className="w-5 h-5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)] group-hover:text-red-500 transition-colors"><FontAwesomeIcon icon={faXmark} className="text-[10px]" /></span>
                                    </button>
                                )}
                                {filterStatus && (
                                    <button onClick={() => setFilterStatus('')} className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/5 text-[10px] font-black text-[var(--color-primary)]">
                                        Status: {STATUS_CONFIG[filterStatus]?.label}
                                        <span className="w-5 h-5 rounded-lg bg-white/70 dark:bg-[var(--color-surface)] border border-[var(--color-primary)]/20 flex items-center justify-center opacity-70 group-hover:opacity-100"><FontAwesomeIcon icon={faXmark} className="text-[10px]" /></span>
                                    </button>
                                )}
                                {filterWave && (
                                    <button onClick={() => setFilterWave('')} className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/5 text-[10px] font-black text-[var(--color-primary)]">
                                        Gelombang: {waves && waves.find(w => w.id === filterWave)?.name}
                                        <span className="w-5 h-5 rounded-lg bg-white/70 dark:bg-[var(--color-surface)] border border-[var(--color-primary)]/20 flex items-center justify-center opacity-70 group-hover:opacity-100"><FontAwesomeIcon icon={faXmark} className="text-[10px]" /></span>
                                    </button>
                                )}
                                {filterGender && (
                                    <button onClick={() => setFilterGender('')} className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/40 text-[10px] font-black text-[var(--color-text)]">
                                        <FontAwesomeIcon icon={filterGender === 'L' ? faMars : faVenus} className="opacity-70" /> {filterGender === 'L' ? 'Putra' : 'Putri'}
                                        <span className="w-5 h-5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)] group-hover:text-red-500"><FontAwesomeIcon icon={faXmark} className="text-[10px]" /></span>
                                    </button>
                                )}
                                {filterProgram && (
                                    <button onClick={() => setFilterProgram('')} className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-indigo-500/20 bg-indigo-500/10 text-[10px] font-black text-indigo-600">
                                        Program: {PROGRAM_OPTIONS.find(p => p.id === filterProgram)?.name}
                                        <span className="w-5 h-5 rounded-lg bg-white/70 dark:bg-[var(--color-surface)] border border-indigo-500/20 flex items-center justify-center opacity-70 group-hover:opacity-100"><FontAwesomeIcon icon={faXmark} className="text-[10px]" /></span>
                                    </button>
                                )}
                                {(filterDateFrom || filterDateTo) && (
                                    <button onClick={() => { setFilterDateFrom(''); setFilterDateTo(''); }} className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-teal-500/20 bg-teal-500/10 text-[10px] font-black text-teal-600">
                                        Tanggal: {filterDateFrom ? new Date(filterDateFrom).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '...'} s/d {filterDateTo ? new Date(filterDateTo).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '...'}
                                        <span className="w-5 h-5 rounded-lg bg-white/70 dark:bg-[var(--color-surface)] border border-teal-500/20 flex items-center justify-center opacity-70 group-hover:opacity-100"><FontAwesomeIcon icon={faXmark} className="text-[10px]" /></span>
                                    </button>
                                )}
                                <button onClick={resetAllFilters} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-red-500/20 bg-red-500/5 text-[10px] font-black text-red-600">
                                    <FontAwesomeIcon icon={faRotateLeft} className="text-[10px]" /> Reset semua
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Expandable filter panel */}
                    {showAdvancedFilter && (
                        <div className="border-t border-[var(--color-border)] p-3.5 bg-[var(--color-surface-alt)]/60 backdrop-blur-md animate-in fade-in slide-in-from-top-2">
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

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-3">
                                {/* Status */}
                                <div>
                                    <label className="block text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1">Status</label>
                                    <RichSelect
                                        value={filterStatus}
                                        onChange={(val) => { setFilterStatus(val); setPage(1); }}
                                        options={[
                                            { id: '', name: 'Semua Status' },
                                            { id: 'mendaftar', name: 'Mendaftar (Waiting List)' },
                                            { id: 'verifikasi', name: 'Verifikasi Dokumen' },
                                            { id: 'tes', name: 'Tahap Tes Seleksi' },
                                            { id: 'diterima', name: 'Lulus / Diterima' },
                                            { id: 'ditolak', name: 'Ditolak' }
                                        ]}
                                        placeholder="Semua Status"
                                        small
                                    />
                                </div>

                                {/* Gelombang */}
                                <div>
                                    <label className="block text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1">Gelombang</label>
                                    <RichSelect
                                        value={filterWave}
                                        onChange={(val) => { setFilterWave(val); setPage(1); }}
                                        options={[
                                            { id: '', name: 'Semua Gelombang' },
                                            ...(waves ? waves.map(w => ({ id: w.id, name: w.name })) : [])
                                        ]}
                                        placeholder="Semua Gelombang"
                                        small
                                    />
                                </div>

                                {/* Program */}
                                <div>
                                    <label className="block text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1">Program</label>
                                    <RichSelect
                                        value={filterProgram}
                                        onChange={(val) => { setFilterProgram(val); setPage(1); }}
                                        options={[
                                            { id: '', name: 'Semua Program' },
                                            ...PROGRAM_OPTIONS.map(p => ({ id: p.id, name: p.name }))
                                        ]}
                                        placeholder="Semua Program"
                                        small
                                    />
                                </div>

                                {/* Jenis Kelamin */}
                                <div>
                                    <label className="block text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1">Jenis Kelamin</label>
                                    <RichSelect
                                        value={filterGender}
                                        onChange={(val) => { setFilterGender(val); setPage(1); }}
                                        options={[
                                            { id: '', name: 'Semua Jenis Kelamin' },
                                            { id: 'L', name: 'Putra (Laki-laki)' },
                                            { id: 'P', name: 'Putri (Perempuan)' }
                                        ]}
                                        placeholder="Semua Jenis Kelamin"
                                        small
                                    />
                                </div>

                                {/* Rentang Tanggal */}
                                <div className="sm:col-span-2 md:col-span-2 lg:col-span-2">
                                    <label className="block text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1">Rentang Tanggal</label>
                                    <div className="flex items-center gap-1.5 w-full">
                                        <RichDatePicker
                                            value={filterDateFrom}
                                            onChange={(val) => { setFilterDateFrom(val); setPage(1); }}
                                            placeholder="Dari"
                                            small
                                            className="w-full"
                                        />
                                        <span className="text-[10px] text-[var(--color-text-muted)] opacity-60 shrink-0">s/d</span>
                                        <RichDatePicker
                                            value={filterDateTo}
                                            onChange={(val) => { setFilterDateTo(val); setPage(1); }}
                                            placeholder="Sampai"
                                            small
                                            className="w-full"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Data Table Card */}
                <div className="glass rounded-[1.5rem] border border-[var(--color-border)] overflow-hidden">
                    {/* Desktop Table */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-[var(--color-surface-alt)]">
                                <tr className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] border-b border-[var(--color-border)]">
                                    <th className="w-10 pl-4 pr-1 py-3 text-center">
                                        <input
                                            type="checkbox"
                                            checked={allSelected && enrollments.length > 0}
                                            onChange={toggleSelectAll}
                                            className="w-4 h-4 rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)] accent-[var(--color-primary)] cursor-pointer shrink-0"
                                            title={allSelected ? "Batal pilih semua" : "Pilih semua"}
                                        />
                                    </th>
                                    <th className="py-3 px-3">Nama</th>
                                    <th className="py-3 px-3 hidden lg:table-cell">Asal Sekolah</th>
                                    <th className="py-3 px-3 hidden xl:table-cell">Program</th>
                                    <th className="py-3 px-3 hidden xl:table-cell">Quran</th>
                                    <th className="py-3 px-3">Status</th>
                                    <th className="py-3 px-3 hidden md:table-cell">Tgl Daftar</th>
                                    <th className="py-3 px-3">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--color-border)]/50">
                                {loading ? (
                                    Array.from({ length: 5 }).map((_, i) => <EnrollmentSkeletonRow key={i} />)
                                ) : enrollments.length === 0 ? (
                                    <tr><td colSpan={8} className="py-16 text-center px-4">
                                        {activeFilterCount > 0 || searchQuery ? (
                                            <EmptyState
                                                variant="plain"
                                                icon={faSearch}
                                                title="Pencarian Tidak Ditemukan"
                                                description="Maaf, kami tidak menemukan data pendaftar dengan kriteria tersebut. Coba ubah kata kunci atau reset filter."
                                                action={
                                                    <button onClick={resetAllFilters} className="px-5 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-alt)] text-[10px] font-black uppercase tracking-widest text-[var(--color-text)] transition-all shadow-sm active:scale-95 flex items-center justify-center gap-1.5 mx-auto">
                                                        <FontAwesomeIcon icon={faRotateLeft} className="text-[10px]" /> Reset Semua Filter
                                                    </button>
                                                }
                                            />
                                        ) : (
                                            <EmptyState
                                                variant="plain"
                                                icon={faUserPlus}
                                                title="Belum Ada Pendaftar"
                                                description="Tambah pendaftar baru untuk memulai pendataan calon santri."
                                                action={
                                                    <button onClick={handleAdd} className="px-5 py-2.5 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-[var(--color-primary)]/20 transition-all active:scale-95 flex items-center justify-center gap-1.5 mx-auto">
                                                        <FontAwesomeIcon icon={faUserPlus} className="text-[10px]" /> Tambah Pendaftar
                                                    </button>
                                                }
                                            />
                                        )}
                                    </td></tr>
                                ) : enrollments.map(e => (
                                    <EnrollmentRow key={e.id} enrollment={e} isSelected={selectedIdSet.has(e.id)}
                                        onToggleSelect={toggleSelect} onView={handleViewProfile} onEdit={handleEdit}
                                        onDelete={confirmDelete} onStatusChange={handleStatusChangeWithValidation} />
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Cards */}
                    <div className="md:hidden p-3 space-y-3">
                        {loading ? (
                            Array.from({ length: 3 }).map((_, i) => <EnrollmentSkeletonCard key={i} />)
                        ) : enrollments.length === 0 ? (
                            activeFilterCount > 0 || searchQuery ? (
                                <EmptyState
                                    icon={faSearch}
                                    title="Pencarian Tidak Ditemukan"
                                    description="Ubah kata kunci atau reset filter"
                                    action={
                                        <button onClick={resetAllFilters} className="px-4 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[9px] font-black uppercase tracking-widest text-[var(--color-text)] transition-all">
                                            Reset Filter
                                        </button>
                                    }
                                    variant="dashed"
                                />
                            ) : (
                                <EmptyState
                                    icon={faUserPlus}
                                    title="Belum Ada Pendaftar"
                                    description="Tambah pendaftar baru"
                                    action={
                                        <button onClick={handleAdd} className="px-4 py-2 rounded-xl bg-[var(--color-primary)] text-white text-[9px] font-black uppercase tracking-widest">
                                            Tambah Pendaftar
                                        </button>
                                    }
                                    variant="dashed"
                                />
                            )
                        ) : enrollments.map(e => (
                            <EnrollmentMobileCard key={e.id} enrollment={e} isSelected={selectedIdSet.has(e.id)}
                                onToggleSelect={toggleSelect} onView={handleViewProfile} onEdit={handleEdit}
                                onStatusChange={handleStatusChangeWithValidation} />
                        ))}
                    </div>

                    {/* Pagination */}
                    {totalRows > 0 && (
                        <Pagination totalRows={totalRows} page={page} pageSize={pageSize}
                            setPage={setPage} setPageSize={setPageSize} label="Pendaftar"
                            jumpPage={jumpPage} setJumpPage={setJumpPage} />
                    )}
                </div>
            </div>

            {/* Modals */}
            <EnrollmentFormModal isOpen={isFormOpen} onClose={closeForm} onSubmit={handleSubmit}
                enrollment={selectedEnrollment} submitting={submitting} waves={waves}
                onPhotoUpload={handlePhotoUpload} uploadingPhoto={uploadingPhoto} />
            <EnrollmentProfileModal isOpen={isProfileOpen} onClose={closeProfile}
                enrollment={selectedEnrollment} onEdit={(e) => { closeProfile(); handleEdit(e) }}
                onDelete={(e) => { closeProfile(); confirmDelete(e) }} onStatusChange={(e, s) => { closeProfile(); handleStatusChangeWithValidation(e, s) }}
                onConvertToStudent={(e) => {
                    setConvertingEnrollment(e);
                    setIsConvertOpen(true);
                }}
                onUpdateNotes={updateNotes}
                onUpdatePaymentStatus={updatePaymentStatus}
                onUpdateOrientation={updateOrientation}
                onSendOrientationNotification={sendOrientationNotification}
                onManagePayment={(e) => {
                    setPaymentEnrollment(e);
                    setIsPaymentOpen(true);
                }}
            />
            <EnrollmentConvertModal
                isOpen={isConvertOpen}
                onClose={() => { setIsConvertOpen(false); setConvertingEnrollment(null); }}
                enrollment={convertingEnrollment}
                classes={classes}
                onConvert={handleConvertToStudent}
                converting={converting}
            />
            <EnrollmentWaveModal isOpen={isWaveModalOpen} onClose={() => setIsWaveModalOpen(false)}
                waves={waves} addToast={addToast} onRefresh={fetchData} />
            <EnrollmentArchiveModal isOpen={isArchiveOpen} onClose={() => setIsArchiveOpen(false)}
                archivedEnrollments={archivedEnrollments} loadingArchived={loadingArchived}
                fetchArchivedEnrollments={fetchArchivedEnrollments} handleRestoreEnrollment={handleRestoreEnrollment}
                handlePermanentDeleteEnrollment={handlePermanentDeleteEnrollment} addToast={addToast} />

            {/* Validation Guard Modal */}
            <Modal
                isOpen={validationModal.isOpen}
                onClose={() => setValidationModal(prev => ({ ...prev, isOpen: false }))}
                title={validationModal.type === 'docs' ? "Dokumen Belum Lengkap" : "Peringatan Nilai Tes"}
                description={validationModal.type === 'docs' ? 'Ada dokumen fisik pendaftaran yang kurang' : 'Nilai Tes belum diisi untuk santri ini'}
                icon={validationModal.type === 'docs' ? faClipboardCheck : faGraduationCap}
                iconBg="bg-amber-500/10"
                iconColor="text-amber-500"
                size="sm"
                mobileVariant="bottom-sheet"
                footer={
                    <div className="flex items-center w-full gap-3">
                        <button
                            type="button"
                            onClick={() => setValidationModal(prev => ({ ...prev, isOpen: false }))}
                            className="h-10 px-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] text-[10px] font-black uppercase tracking-widest transition-all shrink-0"
                        >
                            Batal
                        </button>
                        <div className="flex-1" />
                        <button
                            type="button"
                            onClick={() => {
                                updateStatus(validationModal.enrollment, validationModal.nextStatus);
                                setValidationModal(prev => ({ ...prev, isOpen: false }));
                            }}
                            className="h-10 px-6 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 shrink-0"
                        >
                            <FontAwesomeIcon icon={faArrowRight} className="text-[11px] opacity-70" />
                            Tetap Lanjutkan
                        </button>
                    </div>
                }
            >
                <div className="px-1 space-y-3">
                    <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed font-bold">
                        {validationModal.type === 'docs'
                            ? `Siswa atas nama `
                            : `Siswa atas nama `}
                        <span className="text-amber-600 font-black px-1.5 py-0.5 bg-amber-500/10 rounded-md border border-amber-500/20">{validationModal.enrollment?.name}</span>
                        {validationModal.type === 'docs'
                            ? ` belum melengkapi dokumen berikut:`
                            : ` belum memiliki riwayat Nilai Tes/Seleksi. Apakah Anda yakin ingin meluluskannya secara langsung?`}
                    </p>
                    {validationModal.type === 'docs' && validationModal.missingDocs.length > 0 && (
                        <div className="flex flex-col gap-1.5 py-1">
                            {validationModal.missingDocs.map((doc, idx) => (
                                <div key={idx} className="flex items-center gap-2 text-[10px] font-bold text-[var(--color-text)] bg-[var(--color-surface-alt)] px-3 py-2 rounded-lg border border-[var(--color-border)]">
                                    <FontAwesomeIcon icon={faXmarkCircle} className="text-rose-500 shrink-0" />
                                    {doc.name}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </Modal>

            {/* Archive confirmation */}
            <Modal isOpen={activeModal === 'delete'} onClose={closeModal} title="Arsipkan Pendaftar" maxWidth="max-w-sm">
                <div className="px-6 py-4 text-center">
                    <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-amber-500/10 flex items-center justify-center"><FontAwesomeIcon icon={faBoxArchive} className="text-amber-500 text-xl" /></div>
                    <p className="text-sm font-bold text-[var(--color-text)] mb-1">Arsipkan "{enrollmentToDelete?.name}"?</p>
                    <p className="text-[11px] text-[var(--color-text-muted)]">Data pendaftaran akan dipindahkan ke folder Arsip.</p>
                </div>
                <div className="px-6 py-4 border-t border-[var(--color-border)] flex justify-end gap-2">
                    <button onClick={closeModal} className="px-4 py-2.5 rounded-xl border border-[var(--color-border)] text-[11px] font-bold text-[var(--color-text-muted)]">Batal</button>
                    <button onClick={executeDelete} className="px-4 py-2.5 rounded-xl bg-amber-500 text-white text-[11px] font-black">Arsipkan</button>
                </div>
            </Modal>

            {/* Bulk approve */}
            {activeModal === 'bulkApprove' && (
                <Modal
                    isOpen={activeModal === 'bulkApprove'}
                    onClose={closeModal}
                    title="Terima Pendaftar Massal"
                    description={`${selectedIds.length} calon santri akan diterima`}
                    icon={faCheckCircle}
                    iconBg="bg-emerald-500/10"
                    iconColor="text-emerald-600"
                    size="sm"
                    mobileVariant="bottom-sheet"
                    footer={
                        <div className="flex items-center w-full gap-3">
                            <button
                                type="button"
                                onClick={closeModal}
                                className="h-10 px-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] text-[10px] font-black uppercase tracking-widest transition-all shrink-0"
                            >
                                Batal
                            </button>
                            <div className="flex-1" />
                            <button
                                type="button"
                                onClick={handleBulkApprove}
                                className="h-10 px-6 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 shrink-0"
                            >
                                <FontAwesomeIcon icon={faCheckCircle} className="text-[11px] opacity-70" />
                                Terima Semua
                            </button>
                        </div>
                    }
                >
                    <div className="px-1 space-y-3">
                        <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed font-bold">
                            Anda akan menyetujui pendaftaran untuk calon santri berikut. Status mereka akan diubah menjadi <span className="text-emerald-600 font-black px-1.5 py-0.5 bg-emerald-500/10 rounded-md border border-emerald-500/20">Diterima</span>.
                        </p>
                        <div className="max-h-28 overflow-y-auto pr-1 flex flex-wrap gap-1.5 py-1 scrollbar-thin">
                            {enrollments
                                .filter(e => selectedIds.includes(e.id))
                                .map(e => (
                                    <span key={e.id} className="text-[10px] font-black px-2 py-0.5 bg-emerald-500/10 text-emerald-600 border border-emerald-500/15 rounded-md">
                                        {e.name}
                                    </span>
                                ))}
                        </div>
                    </div>
                </Modal>
            )}

            {/* Bulk reject */}
            {activeModal === 'bulkReject' && (
                <Modal
                    isOpen={activeModal === 'bulkReject'}
                    onClose={closeModal}
                    title="Tolak Pendaftar Massal"
                    description={`${selectedIds.length} calon santri akan ditolak`}
                    icon={faXmarkCircle}
                    iconBg="bg-rose-500/10"
                    iconColor="text-rose-500"
                    size="sm"
                    mobileVariant="bottom-sheet"
                    footer={
                        <div className="flex items-center w-full gap-3">
                            <button
                                type="button"
                                onClick={closeModal}
                                className="h-10 px-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] text-[10px] font-black uppercase tracking-widest transition-all shrink-0"
                            >
                                Batal
                            </button>
                            <div className="flex-1" />
                            <button
                                type="button"
                                onClick={handleBulkReject}
                                className="h-10 px-6 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-rose-500/20 transition-all flex items-center justify-center gap-2 shrink-0"
                            >
                                <FontAwesomeIcon icon={faXmarkCircle} className="text-[11px] opacity-70" />
                                Tolak Semua
                            </button>
                        </div>
                    }
                >
                    <div className="px-1 space-y-3">
                        <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed font-bold">
                            Anda akan menolak pendaftaran untuk calon santri berikut. Status mereka akan diubah menjadi <span className="text-rose-500 font-black px-1.5 py-0.5 bg-rose-500/10 rounded-md border border-rose-500/20">Ditolak</span>.
                        </p>
                        <div className="max-h-28 overflow-y-auto pr-1 flex flex-wrap gap-1.5 py-1 scrollbar-thin">
                            {enrollments
                                .filter(e => selectedIds.includes(e.id))
                                .map(e => (
                                    <span key={e.id} className="text-[10px] font-black px-2 py-0.5 bg-rose-500/10 text-rose-500 border border-rose-500/15 rounded-md">
                                        {e.name}
                                    </span>
                                ))}
                        </div>
                    </div>
                </Modal>
            )}

            {/* Bulk archive */}
            {activeModal === 'bulkArchive' && (
                <Modal
                    isOpen={activeModal === 'bulkArchive'}
                    onClose={closeModal}
                    title="Arsipkan Pendaftar Massal"
                    description={`${selectedIds.length} calon santri akan diarsipkan`}
                    icon={faBoxArchive}
                    iconBg="bg-amber-500/10"
                    iconColor="text-amber-500"
                    size="sm"
                    mobileVariant="bottom-sheet"
                    footer={
                        <div className="flex items-center w-full gap-3">
                            <button
                                type="button"
                                onClick={closeModal}
                                className="h-10 px-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] text-[10px] font-black uppercase tracking-widest transition-all shrink-0"
                            >
                                Batal
                            </button>
                            <div className="flex-1" />
                            <button
                                type="button"
                                onClick={async () => {
                                    await handleBulkArchive();
                                    closeModal();
                                }}
                                className="h-10 px-6 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 shrink-0"
                            >
                                <FontAwesomeIcon icon={faBoxArchive} className="text-[11px] opacity-70" />
                                Arsipkan Semua
                            </button>
                        </div>
                    }
                >
                    <div className="px-1 space-y-3">
                        <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed font-bold">
                            Anda akan mengarsipkan calon santri berikut. Data pendaftaran akan dipindahkan ke folder Arsip dan tetap tersimpan dengan aman.
                        </p>
                        <div className="max-h-28 overflow-y-auto pr-1 flex flex-wrap gap-1.5 py-1 scrollbar-thin">
                            {enrollments
                                .filter(e => selectedIds.includes(e.id))
                                .map(e => (
                                    <span key={e.id} className="text-[10px] font-black px-2 py-0.5 bg-amber-500/10 text-amber-500 border border-amber-500/15 rounded-md">
                                        {e.name}
                                    </span>
                                ))}
                        </div>
                    </div>
                </Modal>
            )}

            {/* Bulk Status Change Modal */}
            {activeModal === 'bulkStatusChange' && (
                <Modal
                    isOpen={activeModal === 'bulkStatusChange'}
                    onClose={closeModal}
                    title="Ubah Status Massal"
                    description={`Sesuaikan status untuk ${selectedIds.length} calon santri`}
                    icon={faSliders}
                    iconBg="bg-indigo-500/10"
                    iconColor="text-indigo-600"
                    size="md"
                    mobileVariant="bottom-sheet"
                    footer={
                        <div className="flex items-center w-full gap-3">
                            <button
                                type="button"
                                onClick={closeModal}
                                className="h-10 px-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] text-[10px] font-black uppercase tracking-widest transition-all shrink-0"
                            >
                                Batal
                            </button>
                        </div>
                    }
                >
                    <div className="space-y-4 py-1">
                        <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed font-bold">
                            Pilih status baru yang ingin Anda terapkan untuk calon santri yang terpilih:
                        </p>

                        <div className="space-y-1.5">
                            {[
                                { key: 'mendaftar', label: 'Mendaftar', desc: 'Pendaftaran baru masuk, menunggu berkas', activeColor: 'bg-sky-500/10 text-sky-500', iconColor: 'text-sky-500', barColor: 'bg-sky-500', icon: faClipboardList },
                                { key: 'verifikasi', label: 'Verifikasi', desc: 'Berkas dan data sedang divalidasi', activeColor: 'bg-amber-500/10 text-amber-600', iconColor: 'text-amber-500', barColor: 'bg-amber-500', icon: faHourglassHalf },
                                { key: 'tes', label: 'Tahap Tes', desc: 'Ujian seleksi lisan & baca Quran', activeColor: 'bg-purple-500/10 text-purple-600', iconColor: 'text-purple-500', barColor: 'bg-purple-500', icon: faBookQuran },
                                { key: 'diterima', label: 'Diterima', desc: 'Lolos seleksi & resmi bergabung', activeColor: 'bg-emerald-500/10 text-emerald-600', iconColor: 'text-emerald-500', barColor: 'bg-emerald-500', icon: faCheckCircle },
                                { key: 'ditolak', label: 'Ditolak', desc: 'Tidak memenuhi kriteria penerimaan', activeColor: 'bg-rose-500/10 text-rose-600', iconColor: 'text-rose-500', barColor: 'bg-rose-500', icon: faXmarkCircle }
                            ].map(opt => (
                                <button
                                    key={opt.key}
                                    type="button"
                                    onClick={async () => {
                                        await handleBulkStatusChange(opt.key);
                                        closeModal();
                                    }}
                                    className="w-full p-2.5 rounded-xl hover:bg-[var(--color-surface-alt)] hover:dark:bg-white/5 text-left transition-all duration-200 flex items-center justify-between group/opt cursor-pointer"
                                >
                                    <div className="flex items-center gap-3.5 min-w-0">
                                        {/* Left Accent Bar */}
                                        <div className={`w-1 h-7 rounded-full ${opt.barColor} opacity-40 group-hover/opt:opacity-100 transition-opacity`} />
                                        
                                        {/* Icon Container */}
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover/opt:scale-105 bg-[var(--color-surface-alt)] dark:bg-white/5 border border-[var(--color-border)]/40 ${opt.iconColor}`}>
                                            <FontAwesomeIcon icon={opt.icon} className="text-xs" />
                                        </div>

                                        {/* Text Info */}
                                        <div className="min-w-0">
                                            <p className="text-[10px] font-black uppercase tracking-wider text-[var(--color-text)] leading-none mb-1">{opt.label}</p>
                                            <p className="text-[10px] text-[var(--color-text-muted)] font-medium leading-none truncate">{opt.desc}</p>
                                        </div>
                                    </div>

                                    {/* Right Select Hint */}
                                    <div className="opacity-0 group-hover/opt:opacity-100 transition-all duration-200 transform translate-x-2 group-hover/opt:translate-x-0 pr-1 shrink-0">
                                        <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg ${opt.activeColor}`}>
                                            Pilih →
                                        </span>
                                    </div>
                                </button>
                            ))}
                        </div>

                        {/* Selection list summary */}
                        <div className="pt-2 border-t border-[var(--color-border)] mt-4">
                            <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-2">Santri yang akan diperbarui ({selectedIds.length}):</p>
                            <div className="max-h-24 overflow-y-auto pr-1 flex flex-wrap gap-1.5 scrollbar-thin">
                                {enrollments
                                    .filter(e => selectedIds.includes(e.id))
                                    .map(e => (
                                        <span key={e.id} className="text-[10px] font-black px-2 py-0.5 bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text-muted)] rounded-md">
                                            {e.name}
                                        </span>
                                    ))}
                            </div>
                        </div>
                    </div>
                </Modal>
            )}

            {/* ===================== */}
            {/* FLOATING BULK ACTION BAR - SaaS STYLE */}
            {/* ===================== */}
            {
                selectedIds.length > 0 && (
                    <div
                        className="fixed -translate-x-1/2 z-[250] w-max max-w-[95%] animate-in fade-in slide-in-from-bottom-8 duration-700 cubic-bezier(0.34, 1.56, 0.64, 1) bottom-[calc(84px+env(safe-area-inset-bottom))] lg:bottom-[max(24px,calc(16px+env(safe-area-inset-bottom)))]"
                        style={{
                            left: dir === 'rtl'
                                ? 'calc(50vw - (var(--sidebar-width, 0px) / 2))'
                                : 'calc(50vw + (var(--sidebar-width, 0px) / 2))'
                        }}
                    >
                        <div className="relative">
                            <div className="relative glass-morphism bg-gray-900/90 dark:bg-gray-800/95 backdrop-blur-3xl border border-white/20 rounded-2xl px-3 py-2 flex items-center gap-4 text-white shadow-2xl">
                                {/* Shimmer container overlay to keep shine within rounded corners */}
                                <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none z-0">
                                    {/* Animated scanline */}
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
                                </div>

                                {/* Left: count badge + label */}
                                <div className="flex items-center gap-2 shrink-0">
                                    <div className="w-9 h-9 rounded-xl bg-[var(--color-primary)] flex items-center justify-center font-black text-sm shrink-0">
                                        {selectedIds.length}
                                    </div>
                                    <div className="hidden sm:block">
                                        <p className="text-[9px] font-black uppercase tracking-widest opacity-50 leading-none">Terpilih</p>
                                        <p className="text-[10px] font-bold leading-none mt-0.5">Aksi Massal</p>
                                    </div>
                                </div>

                                {/* Divider */}
                                <div className="w-px h-6 bg-white/10 shrink-0" />

                                {/* Center: action buttons */}
                                <div className="flex items-center gap-1.5 py-0.5 overflow-x-auto no-scrollbar">
                                    <button
                                        onClick={() => setActiveModal('bulkApprove')}
                                        className="h-8 px-2.5 sm:px-3 shrink-0 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all duration-200 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest"
                                        title="Terima Massal"
                                    >
                                        <FontAwesomeIcon icon={faCheckCircle} className="text-xs animate-pulse" />
                                        <span className="hidden sm:inline">Terima</span>
                                    </button>

                                    <button
                                        onClick={() => setActiveModal('bulkReject')}
                                        className="h-8 px-2.5 sm:px-3 shrink-0 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500 hover:text-white transition-all duration-200 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest"
                                        title="Tolak Massal"
                                    >
                                        <FontAwesomeIcon icon={faXmarkCircle} className="text-xs" />
                                        <span className="hidden sm:inline">Tolak</span>
                                    </button>

                                    <button
                                        onClick={() => setActiveModal('bulkArchive')}
                                        className="h-8 px-2.5 sm:px-3 shrink-0 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500 hover:text-white transition-all duration-200 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest"
                                        title="Arsip Massal"
                                    >
                                        <FontAwesomeIcon icon={faBoxArchive} className="text-xs" />
                                        <span className="hidden sm:inline">Arsip</span>
                                    </button>

                                    <button
                                        onClick={() => setActiveModal('bulkStatusChange')}
                                        className="h-8 px-2.5 sm:px-3 shrink-0 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500 hover:text-white transition-all duration-200 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest"
                                        title="Ubah Status Massal"
                                    >
                                        <FontAwesomeIcon icon={faSliders} className="text-xs" />
                                        <span className="hidden sm:inline">Status</span>
                                    </button>
                                </div>

                                {/* Divider */}
                                <div className="w-px h-6 bg-white/10 shrink-0" />

                                {/* Right: Cancel button */}
                                <button
                                    onClick={() => setSelectedIds([])}
                                    className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all flex items-center justify-center text-xs shrink-0"
                                    title="Batal Pilih Semua"
                                >
                                    <FontAwesomeIcon icon={faXmark} />
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
            {/* Import & Export Modals */}
            <input
                ref={importFileInputRef}
                type="file"
                accept=".csv, .xlsx"
                className="hidden"
                onChange={ie.handleFileChange}
            />

            <EnrollmentImportModal
                isOpen={ie.isImportModalOpen}
                onClose={() => ie.setIsImportModalOpen(false)}
                importing={ie.importing}
                importStep={ie.importStep}
                setImportStep={ie.setImportStep}
                importPreview={ie.importPreview}
                importFileName={ie.importFileName}
                importFileInputRef={importFileInputRef}
                importDragOver={ie.importDragOver}
                setImportDragOver={ie.setImportDragOver}
                processImportFile={ie.processImportFile}
                waves={waves}
                handleDownloadTemplate={ie.handleDownloadTemplate}
                importFileHeaders={ie.importFileHeaders}
                SYSTEM_COLS={ie.SYSTEM_COLS}
                importColumnMapping={ie.importColumnMapping}
                setImportColumnMapping={ie.setImportColumnMapping}
                importRawData={ie.importRawData}
                importLoading={ie.importLoading}
                setImportLoading={ie.setImportLoading}
                buildImportPreview={ie.buildImportPreview}
                importIssues={ie.importIssues}
                importValidationOpen={ie.importValidationOpen}
                setImportValidationOpen={ie.setImportValidationOpen}
                importProgress={ie.importProgress}
                handleCommitImport={ie.handleCommitImport}
                handleImportClick={ie.handleImportClick}
                hasImportBlockingErrors={ie.hasImportBlockingErrors}
                importReadyRows={ie.importReadyRows}
                handleImportCellEdit={ie.handleImportCellEdit}
                importEditCell={ie.importEditCell}
                setImportEditCell={ie.setImportEditCell}
                handleRemoveImportRow={ie.handleRemoveImportRow}
                importSkipDupes={ie.importSkipDupes}
                setImportSkipDupes={ie.setImportSkipDupes}
                handleBulkFix={ie.handleBulkFix}
                importDuplicates={ie.importDuplicates}
            />

            <EnrollmentExportModal
                isOpen={ie.isExportModalOpen}
                onClose={() => ie.setIsExportModalOpen(false)}
                enrollments={enrollments}
                selectedIds={selectedIds}
                exportScope={ie.exportScope}
                setExportScope={ie.setExportScope}
                exportColumns={ie.exportColumns}
                setExportColumns={ie.setExportColumns}
                exporting={ie.exporting}
                handleExportCSV={ie.handleExportCSV}
                handleExportExcel={ie.handleExportExcel}
                handleExportPDF={ie.handleExportPDF}
                addToast={addToast}
            />

            <EnrollmentStatsModal
                isOpen={isStatsModalOpen}
                onClose={() => setIsStatsModalOpen(false)}
                enrollments={allEnrollments}
                waves={waves}
            />

            <EnrollmentAssessmentModal
                isOpen={isAssessmentOpen}
                onClose={() => setIsAssessmentOpen(false)}
                onSubmit={handleAssessmentSubmit}
                enrollment={assessmentEnrollment}
                submitting={submitting}
            />

            <EnrollmentPaymentModal
                isOpen={isPaymentOpen}
                onClose={() => { setIsPaymentOpen(false); setPaymentEnrollment(null); }}
                enrollment={activePaymentEnrollment}
                onUpdateStatus={updatePaymentStatus}
                submitting={submitting}
            />
        </DashboardLayout>
    )
}
