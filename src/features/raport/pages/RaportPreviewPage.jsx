import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useRaportContext } from '@features/raport/context/RaportContext'
import {
    ArrowLeft, Printer, Download, Search, Check, FileArchive,
    SlidersHorizontal, Sparkles, User, X, Loader2, Phone,
    FileText, CheckCircle2, AlertCircle, AlertTriangle, ChevronRight, ChevronDown,
    ZoomIn, ZoomOut, Maximize2, Languages, PenTool, Fingerprint, QrCode
} from 'lucide-react'
import RaportPrintCard from '@features/raport/components/RaportPrintCard'
import RaportSummaryPage from '@features/raport/components/RaportSummaryPage'
import RaportLayoutSettings from '@features/raport/components/RaportLayoutSettings'
import { buildRaportPrintDocumentHtml } from '@features/raport/utils/raportPrintHtml'
import { BULAN } from '@utils/reports/raportConstants'
import Modal from '@shared/components/Modal'
import ConfirmDialog from '@shared/components/ConfirmDialog'
import {
    WhatsAppIcon,
    WaBlastConfirmContent,
    WaBlastProgressContent,
    ZipBlastProgressContent
} from '@features/raport/components/RaportModals'

export default function RaportPreviewPage({ isAcademic = false }) {
    const { classId } = useParams()
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()
    const { core, importExport, pageSize, setPageSize, layoutConfig, setLayoutConfig } = useRaportContext()

    const {
        selectedClass, setSelectedClassId, selectedMonth, setSelectedMonth,
        selectedYear, setSelectedYear, selectedSemester, setSelectedSemester, academicYear, setAcademicYear,
        reportType, setReportType, students, scores, extras, musyrif, bulanObj, lang, setLang,
        previewStudentId, setPreviewStudentId, selectedStudentIds, setPrintQueue, behaviorReports,
        loadStudents, catatanArabMap, handleDownloadPdf, generatingPdfIds, settings,
        printQueue, printRenderedCount, setPrintRenderedCount, archivePreview, silentPrintRef, addToast
    } = core

    const {
        handlePrintAll, runZipBlast, setWaBlastConfirm, waBlastConfirm,
        waBlast, setWaBlast, zipBlast, setZipBlast, waBlastAbortRef, zipAbortRef,
        runWaBlast, buildWaMessage, signMode, handleSetSignMode, signatures
    } = importExport

    const basePath = isAcademic ? '/academic/raport' : '/raport'

    const [tabView, setTabView] = useState('card') // 'card' | 'rekap'
    const [searchStudent, setSearchStudent] = useState('')
    const [filterStatus, setFilterStatus] = useState('all') // 'all' | 'complete' | 'incomplete'
    const [isLayoutSettingsOpen, setIsLayoutSettingsOpen] = useState(false)
    const [showSigDropdown, setShowSigDropdown] = useState(false)
    const [showPrintDropdown, setShowPrintDropdown] = useState(false)
    const [massPrintConfirm, setMassPrintConfirm] = useState(false)
    
    // ── Auto-Fit & Dynamic Zoom Logic ──
    const previewContainerRef = useRef(null)
    const [zoomMode, setZoomMode] = useState('fit') // 'fit' | 'custom'
    const [fitZoom, setFitZoom] = useState(0.65)
    const [customZoom, setCustomZoom] = useState(0.65)

    useEffect(() => {
        const el = previewContainerRef.current
        if (!el) return

        const updateFitZoom = () => {
            const rect = el.getBoundingClientRect()
            const containerWidth = rect.width || el.clientWidth
            if (!containerWidth || containerWidth < 100) return
            
            const computed = window.getComputedStyle(el)
            const padL = parseFloat(computed.paddingLeft) || 16
            const padR = parseFloat(computed.paddingRight) || 16
            
            // Available space inside container with generous breathing room
            const availableWidth = Math.max(200, containerWidth - padL - padR - 32)
            const cardWidthPx = pageSize === 'f4' ? 813 : 794
            
            // Comfortably fit within container (capped at 0.80 for clean framing)
            const calculated = Math.min(0.80, Math.max(0.35, (availableWidth / cardWidthPx) * 0.96))
            const rounded = Number(calculated.toFixed(2))
            setFitZoom(rounded)
        }

        const raf = requestAnimationFrame(updateFitZoom)
        const resizeObserver = new ResizeObserver(updateFitZoom)
        resizeObserver.observe(el)
        return () => {
            cancelAnimationFrame(raf)
            resizeObserver.disconnect()
        }
    }, [pageSize])

    const currentZoom = zoomMode === 'fit' ? fitZoom : customZoom

    const handleZoomChange = (newZ) => {
        setZoomMode('custom')
        setCustomZoom(Number(Math.max(0.3, Math.min(1.4, newZ)).toFixed(2)))
    }

    // ── Batch Printing Logic ──
    const printContainerRef = useRef(null)
    const printExecutingRef = useRef(false)
    const exportingPdfRef = useRef(false)

    const executePrint = useCallback((stuList) => {
        const container = printContainerRef.current; if (!container) return
        const cards = container.querySelectorAll('.raport-card'); if (!cards.length) { addToast('Gagal menyiapkan raport', 'error'); return }
        const html = [...cards].map(c => c.outerHTML).join('')
        const titleStr = stuList.length === 1 ? `Raport ${stuList[0].name}_${selectedClass?.name}_${bulanObj?.id_str} ${selectedYear}` : `Raport Kelas ${selectedClass?.name}_${bulanObj?.id_str} ${selectedYear}`
        const win = window.open('', '_blank'); if (!win) { addToast('Popup diblokir browser.', 'error'); printExecutingRef.current = false; setPrintQueue([]); setPrintRenderedCount(0); return }
        win.document.write(buildRaportPrintDocumentHtml(html, pageSize, titleStr))
        win.document.close();
        win.focus();
        if (win.document.fonts && win.document.fonts.ready) {
            win.document.fonts.ready.then(async () => {
                await Promise.all([
                    win.document.fonts.load('400 16px Amiri'),
                    win.document.fonts.load('700 16px Amiri'),
                ]);
                setTimeout(() => {
                    win.print();
                    printExecutingRef.current = false;
                    setPrintQueue([]);
                    setPrintRenderedCount(0);
                }, 500);
            }).catch((err) => {
                console.error("Font loading failed, printing anyway:", err);
                setTimeout(() => {
                    win.print();
                    printExecutingRef.current = false;
                    setPrintQueue([]);
                    setPrintRenderedCount(0);
                }, 500);
            });
        } else {
            setTimeout(() => {
                win.print();
                printExecutingRef.current = false;
                setPrintQueue([]);
                setPrintRenderedCount(0);
            }, 800);
        }
    }, [selectedClass, bulanObj, selectedYear, addToast, pageSize, setPrintQueue, setPrintRenderedCount])

    useEffect(() => {
        if (!printQueue || !printQueue.length) { printExecutingRef.current = false; return }
        const expectedCount = printQueue.length + (printQueue.length > 1 ? 1 : 0)
        if (printRenderedCount < expectedCount) return
        if (printExecutingRef.current) return
        if (exportingPdfRef.current) return
        if (silentPrintRef?.current) return
        printExecutingRef.current = true
        const stuList = (archivePreview ? archivePreview.students : students).filter(s => printQueue.includes(s.id))
        executePrint(stuList)
    }, [printRenderedCount, printQueue, students, archivePreview, executePrint, silentPrintRef])

    useEffect(() => {
        if (classId) setSelectedClassId(classId)
    }, [classId, setSelectedClassId])

    useEffect(() => {
        if (classId && students.length === 0) {
            loadStudents(classId, selectedMonth, selectedYear, lang, reportType, selectedSemester, academicYear)
        }
    }, [classId, students.length, selectedMonth, selectedYear, lang, reportType, selectedSemester, academicYear, loadStudents])

    // ── Filtered Students & Stats Calculation ──
    const studentStatusMap = useMemo(() => {
        const map = {}
        students.forEach(s => {
            const studentScores = scores[s.id] || {}
            const filledCriteria = Object.values(studentScores).filter(v => v !== null && v !== undefined && v !== '').length
            const isComplete = filledCriteria > 0
            map[s.id] = { filledCriteria, isComplete }
        })
        return map
    }, [students, scores])

    const completedCount = useMemo(() => {
        return students.filter(s => studentStatusMap[s.id]?.isComplete).length
    }, [students, studentStatusMap])

    const filteredStudents = useMemo(() => {
        return students.filter(s => {
            const query = searchStudent.toLowerCase().trim()
            const matchQuery = !query || s.name.toLowerCase().includes(query) || (s.nis && String(s.nis).includes(query))
            if (!matchQuery) return false

            const status = studentStatusMap[s.id]
            if (filterStatus === 'complete') return status?.isComplete
            if (filterStatus === 'incomplete') return !status?.isComplete
            return true
        })
    }, [students, searchStudent, filterStatus, studentStatusMap])

    const currentStudent = students.find(s => s.id === previewStudentId) || filteredStudents[0] || students[0]
    const studentIdx = currentStudent ? students.findIndex(s => s.id === currentStudent.id) + 1 : 1

    const handlePrintCurrent = useCallback(() => {
        if (!currentStudent) {
            addToast('Pilih santri terlebih dahulu', 'warning')
            return
        }
        setShowPrintDropdown(false)
        printExecutingRef.current = false
        setPrintRenderedCount(0)
        setPrintQueue([currentStudent.id])
    }, [currentStudent, addToast, setPrintQueue, setPrintRenderedCount])

    const incompleteCount = students.length - completedCount

    const requestPrintAll = useCallback(() => {
        setShowPrintDropdown(false)
        if (!students.length) {
            addToast('Tidak ada data untuk dicetak', 'warning')
            return
        }
        if (incompleteCount > 0) {
            setMassPrintConfirm(true)
            return
        }
        handlePrintAll()
    }, [students.length, incompleteCount, addToast, handlePrintAll])

    const digitalMissing = useMemo(() => {
        if (signMode !== 'digital' || !signatures) return []
        const missing = []
        if (!signatures.pengasuh?.url) missing.push('Pengasuh')
        if (!signatures.wali_kelas?.url) missing.push('Wali Kelas')
        return missing
    }, [signMode, signatures])

    useEffect(() => {
        if (!showSigDropdown && !showPrintDropdown) return
        const onDown = (e) => {
            if (!e.target.closest('[data-sig-dropdown-anchor]')) setShowSigDropdown(false)
            if (!e.target.closest('[data-print-dropdown-anchor]')) setShowPrintDropdown(false)
        }
        document.addEventListener('mousedown', onDown)
        return () => document.removeEventListener('mousedown', onDown)
    }, [showSigDropdown, showPrintDropdown])

    // ── Keyboard Arrow Navigation ──
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target?.tagName)) return
            if (!filteredStudents || filteredStudents.length === 0) return

            const currentFilteredIdx = filteredStudents.findIndex(s => s.id === previewStudentId)
            if (e.key === 'ArrowDown') {
                e.preventDefault()
                const nextIdx = currentFilteredIdx < filteredStudents.length - 1 ? currentFilteredIdx + 1 : 0
                setPreviewStudentId(filteredStudents[nextIdx].id)
            } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                const prevIdx = currentFilteredIdx > 0 ? currentFilteredIdx - 1 : filteredStudents.length - 1
                setPreviewStudentId(filteredStudents[prevIdx].id)
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [filteredStudents, previewStudentId, setPreviewStudentId])

    if (!selectedClass) {
        return (
            <div className="p-8 text-center space-y-4">
                <p className="text-sm font-bold text-[var(--color-text-muted)]">Kelas tidak ditemukan.</p>
                <button onClick={() => navigate(basePath)} className="px-4 py-2 rounded-xl bg-indigo-500 text-white text-xs font-black">
                    Kembali ke Dashboard
                </button>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {/* Top Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--color-border)]">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate(`${basePath}/input/${classId}?month=${selectedMonth}&year=${selectedYear}&type=${reportType}`)}
                        className="w-9 h-9 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-alt)] flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-all shadow-sm"
                        title="Kembali ke Input Nilai"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div>
                        <h2 className="text-sm font-black text-[var(--color-text)]">
                            Preview & Cetak — Kelas {selectedClass.name}
                        </h2>
                        <p className="text-[10px] text-[var(--color-text-muted)] font-semibold mt-0.5">
                            {bulanObj?.id_str || ''} {selectedYear} · {students.length} Santri · {completedCount} Siap Cetak
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    {/* Switch View (Kartu / Rekap) */}
                    <div className="flex items-center p-1 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)]">
                        <button
                            onClick={() => setTabView('card')}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${tabView === 'card' ? 'bg-[var(--color-surface)] text-indigo-600 shadow-sm' : 'text-[var(--color-text-muted)]'}`}
                        >
                            Kartu Raport
                        </button>
                        <button
                            onClick={() => setTabView('rekap')}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${tabView === 'rekap' ? 'bg-[var(--color-surface)] text-indigo-600 shadow-sm' : 'text-[var(--color-text-muted)]'}`}
                        >
                            Rekapitulasi Kelas
                        </button>
                    </div>

                    {/* Language Switcher */}
                    <button
                        onClick={() => setLang?.(l => l === 'ar' ? 'id' : 'ar')}
                        className="h-8.5 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[10px] font-black uppercase hover:bg-[var(--color-surface-alt)] transition-all shadow-sm flex items-center gap-1.5"
                        title={`Bahasa Raport: ${lang === 'ar' ? 'Bahasa Arab (العربية)' : 'Bahasa Indonesia'} (Klik untuk beralih)`}
                    >
                        <Languages className="w-3.5 h-3.5 text-indigo-500" />
                        <span>{lang === 'ar' ? 'AR' : 'ID'}</span>
                    </button>

                    {/* Page Size Switcher */}
                    <button
                        onClick={() => setPageSize(s => s === 'f4' ? 'a4' : 'f4')}
                        className="h-8.5 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[10px] font-black uppercase hover:bg-[var(--color-surface-alt)] transition-all shadow-sm flex items-center gap-1.5"
                        title={`Ukuran Kertas: ${pageSize.toUpperCase()} (Klik untuk ganti ke ${pageSize === 'f4' ? 'A4' : 'F4'})`}
                    >
                        <FileText className="w-3.5 h-3.5 text-indigo-500" />
                        <span>{pageSize.toUpperCase()}</span>
                    </button>

                    {/* Layout Settings Toggle */}
                    <button
                        onClick={() => setIsLayoutSettingsOpen(true)}
                        className="h-8.5 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[10px] font-black flex items-center gap-1.5 hover:bg-[var(--color-surface-alt)] transition-all shadow-sm"
                    >
                        <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Layout</span>
                    </button>

                    {/* Signature mode: manual / digital / QR */}
                    <div className="relative" data-sig-dropdown-anchor>
                        <button
                            type="button"
                            onClick={() => { setShowPrintDropdown(false); setShowSigDropdown(p => !p) }}
                            className="h-8.5 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[10px] font-black flex items-center gap-1.5 hover:bg-[var(--color-surface-alt)] transition-all shadow-sm select-none"
                            title="Pilih mode tanda tangan"
                        >
                            {signMode === 'digital' ? (
                                <Fingerprint className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            ) : signMode === 'qrcode' ? (
                                <QrCode className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                            ) : (
                                <PenTool className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                            )}
                            <span>
                                {signMode === 'digital' ? 'TTD Digital' : signMode === 'qrcode' ? 'TTD QR' : 'TTD Manual'}
                            </span>
                            <ChevronDown className={`w-3.5 h-3.5 text-[var(--color-text-muted)] transition-transform ${showSigDropdown ? 'rotate-180' : ''}`} />
                        </button>
                        {showSigDropdown && (
                            <div className="absolute right-0 top-full mt-1.5 w-44 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl z-50 overflow-hidden py-1">
                                <button
                                    type="button"
                                    onClick={() => { handleSetSignMode('basah'); setShowSigDropdown(false) }}
                                    className={`w-full px-3.5 py-2.5 text-left text-[10px] font-black transition-colors flex items-center gap-2 ${signMode === 'basah' ? 'bg-[var(--color-surface-alt)] text-indigo-500' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]/50'}`}
                                >
                                    <PenTool className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                    <span>TTD Manual</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { handleSetSignMode('digital'); setShowSigDropdown(false) }}
                                    className={`w-full px-3.5 py-2.5 text-left text-[10px] font-black transition-colors flex items-center gap-2 ${signMode === 'digital' ? 'bg-[var(--color-surface-alt)] text-emerald-500' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]/50'}`}
                                >
                                    <Fingerprint className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                    <span>TTD Digital</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { handleSetSignMode('qrcode'); setShowSigDropdown(false) }}
                                    className={`w-full px-3.5 py-2.5 text-left text-[10px] font-black transition-colors flex items-center gap-2 ${signMode === 'qrcode' ? 'bg-[var(--color-surface-alt)] text-cyan-500' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]/50'}`}
                                >
                                    <QrCode className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                                    <span>TTD QR Code</span>
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Print: siswa ini / semua kelas */}
                    <div className="relative" data-print-dropdown-anchor>
                        <button
                            type="button"
                            onClick={() => { setShowSigDropdown(false); setShowPrintDropdown(p => !p) }}
                            className="h-8.5 px-4 rounded-xl bg-indigo-600 text-white text-[10px] font-black flex items-center gap-1.5 hover:bg-indigo-700 transition-all shadow-md shadow-indigo-500/20 select-none"
                        >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Cetak</span>
                            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showPrintDropdown ? 'rotate-180' : ''}`} />
                        </button>
                        {showPrintDropdown && (
                            <div className="absolute right-0 top-full mt-1.5 w-56 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl z-50 overflow-hidden py-1">
                                <button
                                    type="button"
                                    onClick={handlePrintCurrent}
                                    disabled={!currentStudent}
                                    className="w-full px-3.5 py-2.5 text-left text-[10px] font-black transition-colors flex items-center gap-2 text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] disabled:opacity-50"
                                >
                                    <Printer className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                    <span className="min-w-0 truncate">Siswa ini{currentStudent ? ` — ${currentStudent.name}` : ''}</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={requestPrintAll}
                                    className="w-full px-3.5 py-2.5 text-left text-[10px] font-black transition-colors flex items-center gap-2 text-[var(--color-text)] hover:bg-[var(--color-surface-alt)]"
                                >
                                    <Printer className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                    <span>Semua kelas ({students.length})</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {digitalMissing.length > 0 && (
                <div className="flex items-start gap-2.5 px-3.5 py-2.5 rounded-xl border border-amber-500/25 bg-amber-500/10 text-amber-800 dark:text-amber-200">
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                    <p className="text-[11px] font-semibold leading-snug">
                        TTD digital belum tersedia untuk {digitalMissing.join(' & ')}. Kartu akan tampil tanpa gambar tanda tangan. Unggah di Pengaturan → Tanda Tangan.
                    </p>
                </div>
            )}

            {/* Layout Settings Modal */}
            <Modal
                isOpen={isLayoutSettingsOpen}
                onClose={() => setIsLayoutSettingsOpen(false)}
                title="Kustomisasi Layout"
                description="Atur font arab & lebar kolom raport"
                icon={SlidersHorizontal}
                iconBg="bg-violet-500/10"
                iconColor="text-violet-500"
                size="md"
            >
                <RaportLayoutSettings
                    config={layoutConfig}
                    onChange={setLayoutConfig}
                />
            </Modal>

            {/* Main Content Area */}
            {tabView === 'rekap' ? (
                <div className="overflow-x-auto p-4 bg-[var(--color-surface-alt)] rounded-2xl border border-[var(--color-border)] flex justify-center shadow-inner">
                    <RaportSummaryPage
                        students={students}
                        scores={scores}
                        extras={extras}
                        bulanObj={bulanObj}
                        tahun={selectedYear}
                        musyrif={musyrif}
                        className={selectedClass.name}
                        reportType={reportType}
                        selectedSemester={selectedSemester}
                        academicYear={academicYear}
                        selectedClass={selectedClass}
                        behaviorReports={behaviorReports}
                        pageSize={pageSize}
                        settings={settings}
                    />
                </div>
            ) : (
                <div className="flex flex-col lg:flex-row gap-4 items-start">
                    {/* ── Left Sidebar: Redesigned Student Container ── */}
                    <div className="w-full lg:w-[320px] xl:w-[350px] shrink-0 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-sm flex flex-col overflow-hidden lg:sticky lg:top-4 max-h-[calc(100vh-120px)] transition-all">
                        
                        {/* Sidebar Header */}
                        <div className="p-3.5 border-b border-[var(--color-border)] bg-[var(--color-surface-alt)]/50 space-y-2.5">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-sm">
                                        <User className="w-3.5 h-3.5" />
                                    </div>
                                    <span className="text-[11px] font-black uppercase tracking-wider text-[var(--color-text)]">
                                        Daftar Santri
                                    </span>
                                </div>
                                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)]">
                                    {filteredStudents.length} {searchStudent || filterStatus !== 'all' ? `/ ${students.length}` : ''} Santri
                                </span>
                            </div>

                            {/* Search Box */}
                            <div className="relative">
                                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                                <input
                                    type="text"
                                    value={searchStudent}
                                    onChange={e => setSearchStudent(e.target.value)}
                                    placeholder="Cari nama santri / NIS..."
                                    className="w-full h-8.5 pl-8.5 pr-8 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[11px] font-semibold text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all"
                                />
                                {searchStudent && (
                                    <button
                                        onClick={() => setSearchStudent('')}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] transition-colors"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                )}
                            </div>

                            {/* Filter Status Pills */}
                            <div className="flex items-center gap-1.5 pt-0.5">
                                {[
                                    { id: 'all', label: 'Semua' },
                                    { id: 'complete', label: 'Lengkap' },
                                    { id: 'incomplete', label: 'Belum' },
                                ].map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setFilterStatus(tab.id)}
                                        className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                                            filterStatus === tab.id
                                                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/20'
                                                : 'bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)]'
                                        }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Student List Container with proper padding and custom scrollbar */}
                        <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5 custom-scrollbar min-h-[220px]">
                            {filteredStudents.length === 0 ? (
                                <div className="py-12 px-4 text-center space-y-2">
                                    <div className="w-10 h-10 rounded-2xl bg-[var(--color-surface-alt)] flex items-center justify-center mx-auto text-[var(--color-text-muted)]">
                                        <Search className="w-5 h-5 opacity-40" />
                                    </div>
                                    <p className="text-[11px] font-bold text-[var(--color-text-muted)]">
                                        Santri tidak ditemukan
                                    </p>
                                    {searchStudent && (
                                        <button
                                            onClick={() => setSearchStudent('')}
                                            className="text-[10px] font-black text-indigo-600 hover:underline"
                                        >
                                            Reset Pencarian
                                        </button>
                                    )}
                                </div>
                            ) : (
                                filteredStudents.map((s) => {
                                    const isSel = (currentStudent?.id === s.id)
                                    const originalIdx = students.findIndex(st => st.id === s.id)
                                    const status = studentStatusMap[s.id]
                                    const initials = s.name ? s.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() : '?'

                                    return (
                                        <div
                                            key={s.id}
                                            onClick={() => setPreviewStudentId(s.id)}
                                            className={`group relative w-full text-left p-2.5 rounded-xl border transition-all duration-200 cursor-pointer flex items-center gap-2.5 ${
                                                isSel
                                                    ? 'bg-indigo-500/8 border-indigo-500/40 shadow-sm shadow-indigo-500/5'
                                                    : 'bg-[var(--color-surface)] border-[var(--color-border)]/60 hover:border-indigo-500/30 hover:bg-[var(--color-surface-alt)]/70'
                                            }`}
                                        >
                                            {/* Left Indicator Accent Bar */}
                                            {isSel && (
                                                <div className="absolute left-0 top-2.5 bottom-2.5 w-1 bg-indigo-600 rounded-r-full" />
                                            )}

                                            {/* Avatar Inisial */}
                                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black shrink-0 transition-all ${
                                                isSel
                                                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30'
                                                    : 'bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text-muted)] group-hover:border-indigo-500/30 group-hover:text-indigo-600'
                                            }`}>
                                                {initials}
                                            </div>

                                            {/* Student Details */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-1">
                                                    <p className={`text-[11.5px] font-black truncate leading-tight transition-colors ${
                                                        isSel ? 'text-indigo-600 dark:text-indigo-400' : 'text-[var(--color-text)]'
                                                    }`}>
                                                        {s.name}
                                                    </p>
                                                    {isSel && (
                                                        <div className="w-4 h-4 rounded-full bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                                                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-[9px] font-bold text-[var(--color-text-muted)] shrink-0">
                                                        #{originalIdx + 1}
                                                    </span>
                                                    {s.nis ? (
                                                        <span className="text-[9px] font-semibold text-[var(--color-text-muted)] truncate">
                                                            NIS: {s.nis}
                                                        </span>
                                                    ) : null}

                                                    <div className="flex-1" />

                                                    {/* Status Badge */}
                                                    {status?.isComplete ? (
                                                        <span className="inline-flex items-center gap-1 text-[8.5px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-md shrink-0">
                                                            <span className="w-1 h-1 rounded-full bg-emerald-500" />
                                                            Lengkap
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 text-[8.5px] font-black text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-md shrink-0">
                                                            <span className="w-1 h-1 rounded-full bg-amber-500" />
                                                            Belum Lengkap
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Quick print / PDF */}
                                            <div className={`flex items-center gap-1 shrink-0 ${isSel ? '' : 'opacity-0 group-hover:opacity-100'}`}>
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        setPreviewStudentId(s.id)
                                                        printExecutingRef.current = false
                                                        setPrintRenderedCount(0)
                                                        setPrintQueue([s.id])
                                                    }}
                                                    className={`p-1.5 rounded-lg border transition-all ${
                                                        isSel
                                                            ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20'
                                                            : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)]'
                                                    }`}
                                                    title={`Cetak raport ${s.name}`}
                                                >
                                                    <Printer className="w-3 h-3" />
                                                </button>
                                                {handleDownloadPdf && (
                                                    <button
                                                        type="button"
                                                        disabled={generatingPdfIds?.has(s.id)}
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            handleDownloadPdf(s)
                                                        }}
                                                        className={`p-1.5 rounded-lg border transition-all ${
                                                            isSel
                                                                ? 'border-indigo-500/20 bg-indigo-500/10 text-indigo-600 hover:bg-indigo-500/20'
                                                                : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)]'
                                                        }`}
                                                        title={`Download PDF ${s.name}`}
                                                    >
                                                        {generatingPdfIds?.has(s.id) ? (
                                                            <Loader2 className="w-3 h-3 animate-spin text-indigo-600" />
                                                        ) : (
                                                            <Download className="w-3 h-3" />
                                                        )}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                        </div>

                        {/* Sidebar Footer */}
                        <div className="p-2.5 px-3 border-t border-[var(--color-border)] bg-[var(--color-surface-alt)]/30 flex items-center justify-between text-[9.5px] font-semibold text-[var(--color-text-muted)]">
                            <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                <span>{completedCount}/{students.length} Lengkap</span>
                            </div>
                            <div className="flex items-center gap-1 opacity-70">
                                <span className="px-1 py-0.5 rounded bg-[var(--color-surface)] border border-[var(--color-border)] font-mono text-[8px]">↑</span>
                                <span className="px-1 py-0.5 rounded bg-[var(--color-surface)] border border-[var(--color-border)] font-mono text-[8px]">↓</span>
                                <span className="text-[8.5px]">Navigasi</span>
                            </div>
                        </div>
                    </div>

                    {/* ── Right Panel: Raport Card Preview with Auto-Fit Zoom ── */}
                    <div
                        ref={previewContainerRef}
                        className="flex-1 min-w-0 w-full overflow-x-auto overflow-y-auto p-4 lg:p-6 bg-[var(--color-surface-alt)] rounded-2xl border border-[var(--color-border)] flex flex-col items-center min-h-[80vh] shadow-inner custom-scrollbar"
                    >
                        {/* Zoom Controls Bar */}
                        <div className="flex items-center gap-1.5 mb-5 bg-[var(--color-surface)] border border-[var(--color-border)] p-1 rounded-xl shadow-sm sticky top-0 z-10">
                            <button
                                type="button"
                                onClick={() => handleZoomChange(currentZoom - 0.05)}
                                className="w-7 h-7 rounded-lg hover:bg-[var(--color-surface-alt)] flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-all font-bold"
                                title="Perkecil Zoom (-5%)"
                            >
                                <ZoomOut className="w-3.5 h-3.5" />
                            </button>
                            <span className="text-[10px] font-black px-2 text-[var(--color-text)] tabular-nums min-w-[42px] text-center">
                                {Math.round(currentZoom * 100)}%
                            </span>
                            <button
                                type="button"
                                onClick={() => handleZoomChange(currentZoom + 0.05)}
                                className="w-7 h-7 rounded-lg hover:bg-[var(--color-surface-alt)] flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-all font-bold"
                                title="Perbesar Zoom (+5%)"
                            >
                                <ZoomIn className="w-3.5 h-3.5" />
                            </button>
                            <div className="w-px h-4 bg-[var(--color-border)] mx-1" />
                            <button
                                type="button"
                                onClick={() => setZoomMode('fit')}
                                className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase transition-all flex items-center gap-1 ${
                                    zoomMode === 'fit'
                                        ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/20'
                                        : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)]'
                                }`}
                                title="Otomatis sesuaikan skala agar pas di tengah layar"
                            >
                                <Maximize2 className="w-2.5 h-2.5" />
                                <span>Fit Layar</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => handleZoomChange(0.5)}
                                className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase transition-all ${
                                    zoomMode === 'custom' && Math.round(currentZoom * 100) === 50
                                        ? 'bg-indigo-500/10 text-indigo-600 font-black'
                                        : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]'
                                }`}
                            >
                                50%
                            </button>
                            <button
                                type="button"
                                onClick={() => handleZoomChange(0.65)}
                                className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase transition-all ${
                                    zoomMode === 'custom' && Math.round(currentZoom * 100) === 65
                                        ? 'bg-indigo-500/10 text-indigo-600 font-black'
                                        : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]'
                                }`}
                            >
                                65%
                            </button>
                            <button
                                type="button"
                                onClick={() => handleZoomChange(0.8)}
                                className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase transition-all ${
                                    zoomMode === 'custom' && Math.round(currentZoom * 100) === 80
                                        ? 'bg-indigo-500/10 text-indigo-600 font-black'
                                        : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]'
                                }`}
                            >
                                80%
                            </button>
                            <button
                                type="button"
                                onClick={() => handleZoomChange(1.0)}
                                className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase transition-all ${
                                    zoomMode === 'custom' && Math.round(currentZoom * 100) === 100
                                        ? 'bg-indigo-500/10 text-indigo-600 font-black'
                                        : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]'
                                }`}
                            >
                                100%
                            </button>
                        </div>

                        {currentStudent ? (
                            <div className="w-full flex justify-center py-2">
                                <div
                                    className="shadow-2xl rounded-sm transition-all duration-200 border border-black/10 dark:border-white/10 mx-auto"
                                    style={{
                                        width: pageSize === 'f4' ? `calc(215mm * ${currentZoom})` : `calc(210mm * ${currentZoom})`,
                                        height: pageSize === 'f4' ? `calc(330mm * ${currentZoom})` : `calc(297mm * ${currentZoom})`,
                                        position: 'relative',
                                        overflow: 'hidden'
                                    }}
                                >
                                    <div
                                        style={{
                                            transform: `scale(${currentZoom})`,
                                            transformOrigin: 'top left',
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            width: pageSize === 'f4' ? '215mm' : '210mm',
                                            height: pageSize === 'f4' ? '330mm' : '297mm',
                                        }}
                                    >
                                        <RaportPrintCard
                                            student={currentStudent}
                                            scores={scores[currentStudent.id]}
                                            extra={extras[currentStudent.id]}
                                            bulanObj={bulanObj}
                                            tahun={selectedYear}
                                            musyrif={musyrif}
                                            className={selectedClass.name}
                                            lang={lang}
                                            pageSize={pageSize}
                                            catatanArab={catatanArabMap[currentStudent.id]}
                                            studentIndex={studentIdx}
                                            settings={settings}
                                            reportType={reportType}
                                            selectedSemester={selectedSemester}
                                            academicYear={academicYear}
                                            selectedClass={selectedClass}
                                            layoutConfig={layoutConfig}
                                            signMode={signMode}
                                            signatures={signatures}
                                            behaviorReports={behaviorReports[currentStudent.id]}
                                        />
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="p-8 text-center text-xs text-[var(--color-text-muted)] font-bold">
                                Pilih santri di sebelah kiri untuk melihat preview kartu raport.
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Mass print incomplete confirm */}
            <ConfirmDialog
                isOpen={massPrintConfirm}
                onClose={() => setMassPrintConfirm(false)}
                onConfirm={() => {
                    setMassPrintConfirm(false)
                    handlePrintAll()
                }}
                title="Nilai belum lengkap"
                description={`${incompleteCount} dari ${students.length} santri belum lengkap. Tetap cetak ${students.length} raport?`}
                icon={AlertTriangle}
                iconBg="bg-amber-500/10"
                iconColor="text-amber-500"
                confirmText="Tetap Cetak"
                confirmIcon={Printer}
                confirmClassName="h-10 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
                cancelText="Batal"
            />

            {/* WA Blast Confirm Modal */}
            {waBlastConfirm && (
                <WaBlastConfirmContent
                    isOpen={!!waBlastConfirm}
                    onClose={() => setWaBlastConfirm(null)}
                    queue={waBlastConfirm}
                    onConfirm={(targetList, isDebug) => {
                        setWaBlastConfirm(null)
                        runWaBlast(targetList, isDebug)
                    }}
                    onCancel={() => setWaBlastConfirm(null)}
                    lang={lang}
                    pageSize={pageSize}
                    buildWaMessage={buildWaMessage}
                    onPreviewStudent={(id) => setPreviewStudentId(id)}
                    handleDownloadPdf={handleDownloadPdf}
                    generatingPdfIds={generatingPdfIds}
                />
            )}

            {/* WA Blast Progress Modal */}
            {waBlast && (
                <Modal
                    isOpen={!!waBlast.active || waBlast.status === 'done' || waBlast.status === 'aborted'}
                    onClose={() => {
                        if (!waBlast.active) setWaBlast(null)
                    }}
                    title="Pengiriman WhatsApp Blast"
                    description={waBlast.active ? "Sedang mengirim raport santri ke wali murid..." : "Proses pengiriman selesai"}
                    variant={waBlast.status === 'aborted' ? "red" : waBlast.status === 'done' ? "green" : "green"}
                    size="md"
                >
                    <WaBlastProgressContent
                        progress={waBlast.progress}
                        total={waBlast.total}
                        done={waBlast.done}
                        failed={waBlast.failed}
                        activeName={waBlast.activeName}
                        active={waBlast.active}
                        onCancel={() => {
                            if (waBlastAbortRef) waBlastAbortRef.current = true
                        }}
                        status={waBlast.status}
                    />
                </Modal>
            )}

            {/* ZIP Blast Progress Modal */}
            {zipBlast && (
                <Modal
                    isOpen={!!zipBlast.active || zipBlast.status === 'done' || zipBlast.status === 'aborted'}
                    onClose={() => {
                        if (!zipBlast.active) setZipBlast(null)
                    }}
                    title="Ekspor Arsip ZIP Raport"
                    description={zipBlast.active ? "Sedang mengemas raport santri ke file ZIP..." : "Pengemasan selesai"}
                    variant={zipBlast.status === 'aborted' ? "red" : zipBlast.status === 'done' ? "green" : "teal"}
                    size="md"
                >
                    <ZipBlastProgressContent
                        progress={zipBlast.progress}
                        total={zipBlast.total}
                        done={zipBlast.done}
                        failed={zipBlast.failed}
                        activeName={zipBlast.activeName}
                        active={zipBlast.active}
                        onCancel={() => {
                            if (zipAbortRef) zipAbortRef.current = true
                        }}
                        status={zipBlast.status}
                    />
                </Modal>
            )}

            {/* Hidden Print Container */}
            {printQueue?.length > 0 && (
                <div ref={printContainerRef} style={{ position: 'fixed', left: '-9999px', top: 0, width: '1000px', visibility: 'hidden', pointerEvents: 'none' }}>
                    {printQueue.length > 1 && (
                        <RaportSummaryPage
                            students={(archivePreview ? archivePreview.students : students).filter(s => printQueue.includes(s.id))}
                            scores={scores}
                            extras={extras}
                            bulanObj={bulanObj}
                            tahun={selectedYear}
                            musyrif={musyrif}
                            className={selectedClass?.name}
                            reportType={reportType}
                            selectedSemester={selectedSemester}
                            academicYear={academicYear}
                            selectedClass={selectedClass}
                            onRendered={() => setPrintRenderedCount(c => c + 1)}
                            behaviorReports={behaviorReports}
                            pageSize={pageSize}
                            settings={settings}
                        />
                    )}
                    {(archivePreview ? archivePreview.students : students).filter(s => printQueue.includes(s.id)).map((s, idx) => (
                        <RaportPrintCard
                            key={s.id}
                            student={s}
                            scores={scores[s.id]}
                            extra={extras[s.id]}
                            bulanObj={bulanObj}
                            tahun={selectedYear}
                            musyrif={musyrif}
                            className={selectedClass?.name}
                            lang={lang}
                            settings={settings}
                            pageSize={pageSize}
                            catatanArab={catatanArabMap ? catatanArabMap[s.id] : null}
                            studentIndex={idx + 1}
                            onRendered={() => setPrintRenderedCount(c => c + 1)}
                            reportType={reportType}
                            selectedSemester={selectedSemester}
                            academicYear={academicYear}
                            selectedClass={selectedClass}
                            layoutConfig={layoutConfig}
                            signMode={archivePreview ? 'basah' : signMode}
                            signatures={archivePreview ? null : signatures}
                            behaviorReports={behaviorReports[s.id]}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}
