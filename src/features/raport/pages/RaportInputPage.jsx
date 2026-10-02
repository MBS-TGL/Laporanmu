import React, { useEffect, Suspense, lazy, useState, useRef, useMemo, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useRaportContext } from '@features/raport/context/RaportContext'
import { AlertTriangle, ArrowLeft, Save, Copy, Eye, Loader2, CheckCircle2, Globe, FileSpreadsheet, Archive } from 'lucide-react'
import { isComplete } from '@features/raport/utils/raportHelpers'
import { KRITERIA } from '@utils/reports/raportConstants'
import ConfirmDialog from '@shared/components/ConfirmDialog'
import Modal from '@shared/components/Modal'
import RaportPrintCard from '@features/raport/components/RaportPrintCard'
import RaportSummaryPage from '@features/raport/components/RaportSummaryPage'
import { WaBlastConfirmContent, WaBlastProgressContent, ZipBlastProgressContent, WhatsAppIcon } from '@features/raport/components/RaportModals'
import { buildRaportPrintDocumentHtml } from '@features/raport/utils/raportPrintHtml'

const LazyRaportInputTable = lazy(() => import('@features/raport/components/RaportInputTable'))
const LazyRaportExportModal = lazy(() => import('@features/raport/components/RaportExportModal'))

const ROW_HEIGHT = 188
const OVERSCAN = 5

export default function RaportInputPage({ isAcademic = false }) {
    const { classId } = useParams()
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()
    const {
        core,
        activeRtObj,
        activeCriteria,
        activeMaxScore,
        isAcademic: isAcad,
        importExport,
        pageSize,
        setPageSize,
        layoutConfig,
        printContainerRef,
        silentPrintRef
    } = useRaportContext()

    const {
        selectedClass, setSelectedClassId, selectedMonth, setSelectedMonth,
        selectedYear, setSelectedYear, selectedSemester, setSelectedSemester, academicYear, setAcademicYear,
        reportType, setReportType, students, loading, saveAll, savingAll, copyFromLastMonth, copyingLastMonth,
        lang, setLang, hasUnsavedMemo, loadStudents, bulanObj,
        scores, setScores, setScoresRaw, extras, setExtras, savedIds, setSavedIds,
        saving, canEdit, addToast, musyrif, prevMonthScores, prevMonthExtras,
        studentTrend, catatanArabMap, setCatatanArabMap, behaviorReports,
        progressPct, noPhoneCount, showIncompleteOnly, setShowIncompleteOnly,
        showNoPhoneOnly, setShowNoPhoneOnly, studentSearch, setStudentSearch,
        saveStudent, resetStudent, resetClass, autoSaveTimers,
        transliterateToArab, scoresHistoryRef, scoresHistoryIdxRef,
        bulkMode, setBulkMode, bulkSelected, setBulkSelected,
        previewStudentId, setPreviewStudentId, setStep,
        printQueue, setPrintQueue, printRenderedCount, setPrintRenderedCount, handleDownloadPdf, generatingPdfIds, settings
    } = core

    const {
        sendingWA, generateAndSendWA, runZipBlast, setWaBlastConfirm, waBlastConfirm,
        isExportModalOpen, setIsExportOpen: setIsExportModalOpen,
        waBlast, setWaBlast, zipBlast, setZipBlast, waBlastAbortRef, zipAbortRef,
        runWaBlast, buildWaMessage, handleExportCSV, handleExportExcel, handleExportAllClasses,
        handleExportZip, handlePrintAll, exporting, signMode, signatures
    } = importExport

    const basePath = isAcademic ? '/academic/raport' : '/raport'

    const queryMonth = searchParams.get('month')
    const queryYear = searchParams.get('year')
    const queryType = searchParams.get('type')

    useEffect(() => {
        if (classId) setSelectedClassId(classId)
        if (queryMonth) setSelectedMonth(Number(queryMonth))
        if (queryYear) setSelectedYear(Number(queryYear))
        if (queryType) setReportType(queryType)
    }, [classId, queryMonth, queryYear, queryType, setSelectedClassId, setSelectedMonth, setSelectedYear, setReportType])

    useEffect(() => {
        if (classId && students.length === 0 && !loading) {
            loadStudents(classId, selectedMonth, selectedYear, lang, reportType, selectedSemester, academicYear)
        }
    }, [classId, students.length, loading, selectedMonth, selectedYear, lang, reportType, selectedSemester, academicYear, loadStudents])

    // ── Instant Filtered Students ──
    const filteredStudents = useMemo(() => {
        let list = students
        if (studentSearch && studentSearch.trim()) {
            list = list.filter(s => s.name.toLowerCase().includes(studentSearch.toLowerCase()))
        }
        if (showNoPhoneOnly) {
            list = list.filter(s => !s.phone)
        }
        if (showIncompleteOnly) {
            list = list.filter(s => !isComplete(scores[s.id] || {}, activeCriteria))
        }
        return list
    }, [students, studentSearch, showNoPhoneOnly, showIncompleteOnly, scores, activeCriteria])

    // ── Virtual scroll ──
    const cellRefs = useRef({})
    const tableScrollRef = useRef(null)
    const [visibleRange, setVisibleRange] = useState({ start: 0, end: 30 })

    // ── Mobile card ──
    const [mobileActiveIdx, setMobileActiveIdx] = useState(0)

    // ── Bulk input ──
    const [bulkValues, setBulkValues] = useState({})

    // ── Template ──
    const [templateOpenId, setTemplateOpenId] = useState(null)
    useEffect(() => {
        if (!templateOpenId) return
        const handler = (e) => {
            if (!e.target.closest('[data-template-anchor]')) setTemplateOpenId(null)
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [templateOpenId])

    // ── Global save indicator ──
    const [globalSaveIndicator, setGlobalSaveIndicator] = useState(null)
    const globalSaveTimerRef = useRef(null)
    const saveAllRef = useRef(null)
    saveAllRef.current = saveAll

    // ── Confirm modal ──
    const [confirmModal, setConfirmModal] = useState(null)

    // ── Pending extras/scores refs for buffered updates ──
    const pendingExtrasRef = useRef({})
    const pendingScoresRef = useRef({})

    // ── Ctrl+S shortcut ──
    useEffect(() => {
        const handler = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); saveAllRef.current?.() }
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [])

    // ── Ctrl+Z / Ctrl+Y undo/redo ──
    useEffect(() => {
        const handler = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault()
                const hist = scoresHistoryRef.current
                const idx = scoresHistoryIdxRef.current
                if (idx > 0) { scoresHistoryIdxRef.current = idx - 1; setScoresRaw(JSON.parse(JSON.stringify(hist[idx - 1]))); addToast('Undo nilai', 'info') }
            } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
                e.preventDefault()
                const hist = scoresHistoryRef.current
                const idx = scoresHistoryIdxRef.current
                if (idx < hist.length - 1) { scoresHistoryIdxRef.current = idx + 1; setScoresRaw(JSON.parse(JSON.stringify(hist[idx + 1]))); addToast('Redo nilai', 'info') }
            }
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [addToast, scoresHistoryRef, scoresHistoryIdxRef, setScoresRaw])

    // ── Auto-save trigger ──
    const { enabled: autosaveEnabled } = { enabled: true } // default on; wired to feature flag if needed
    const triggerAutoSave = useCallback((studentId) => {
        if (!autosaveEnabled) return
        if (typeof autoSaveTimers.current[studentId] === 'function') autoSaveTimers.current[studentId]()
        if (globalSaveTimerRef.current) clearTimeout(globalSaveTimerRef.current)
        const scheduleIdle = (fn, timeout) => {
            if (typeof window.requestIdleCallback === 'function') {
                const id = window.requestIdleCallback(fn, { timeout })
                return () => window.cancelIdleCallback(id)
            }
            const t = setTimeout(fn, timeout)
            return () => clearTimeout(t)
        }
        let cancel
        autoSaveTimers.current[studentId] = () => cancel?.()
        cancel = scheduleIdle(() => {
            setGlobalSaveIndicator('saving')
            saveStudent(studentId)
            globalSaveTimerRef.current = setTimeout(() => setGlobalSaveIndicator(null), 2000)
        }, 2000)
    }, [saveStudent, autosaveEnabled, autoSaveTimers])

    // ── Flush helpers ──
    const flushExtras = useCallback((studentId) => {
        const pending = pendingExtrasRef.current[studentId]
        if (!pending) return
        setExtras(prev => ({ ...prev, [studentId]: { ...prev[studentId], ...pending } }))
        delete pendingExtrasRef.current[studentId]
    }, [setExtras])

    const flushScores = useCallback((studentId) => {
        const pending = pendingScoresRef.current[studentId]
        if (!pending) return
        setScores(prev => ({ ...prev, [studentId]: { ...prev[studentId], ...pending } }))
        delete pendingScoresRef.current[studentId]
    }, [setScores])

    // ── Score change handler (Draft Mode: only updates local state, no auto-save) ──
    const handleScoreChange = useCallback((studentId, key, value) => {
        setScores(prev => ({ ...prev, [studentId]: { ...prev[studentId], [key]: value } }))
        setSavedIds(prev => { const n = new Set(prev); n.delete(studentId); return n })
    }, [setScores, setSavedIds])

    // ── Extra change handler (Draft Mode: only updates local state, no auto-save) ──
    const handleExtraChange = useCallback((studentId, key, value) => {
        setExtras(prev => ({ ...prev, [studentId]: { ...prev[studentId], [key]: value } }))
        setSavedIds(prev => { const n = new Set(prev); n.delete(studentId); return n })
    }, [setExtras, setSavedIds])

    // ── Catatan change handler (Draft Mode: only updates local state, no auto-save) ──
    const handleCatatanChange = useCallback((studentId, key, value) => {
        setExtras(prev => ({ ...prev, [studentId]: { ...prev[studentId], [key]: value } }))
        setSavedIds(prev => { const n = new Set(prev); n.delete(studentId); return n })
        setCatatanArabMap(prev => { const n = { ...prev }; delete n[studentId]; return n })
    }, [setExtras, setSavedIds, setCatatanArabMap])

    // ── Template handlers ──
    const handleTemplateToggle = useCallback((studentId) => {
        setTemplateOpenId(prev => prev === studentId ? null : studentId)
    }, [])

    // ── Template apply (Draft Mode: no auto-save) ──
    const handleTemplateApply = useCallback((studentId, tmpl) => {
        setExtras(prev => ({ ...prev, [studentId]: { ...prev[studentId], catatan: tmpl } }))
        setSavedIds(prev => { const n = new Set(prev); n.delete(studentId); return n })
        setTemplateOpenId(null)
        setCatatanArabMap(prev => { const n = { ...prev }; delete n[studentId]; return n })
    }, [setExtras, setSavedIds, setCatatanArabMap])

    // ── Translit toggle ──
    const handleTranslitToggle = useCallback(async (studentId, catatan, currentArab) => {
        if (currentArab) {
            setCatatanArabMap(prev => { const n = { ...prev }; delete n[studentId]; return n })
        } else {
            const arab = await transliterateToArab(catatan)
            setCatatanArabMap(prev => ({ ...prev, [studentId]: arab }))
        }
    }, [transliterateToArab, setCatatanArabMap])

    // ── Bulk toggle ──
    const handleBulkToggle = useCallback((studentId, checked) => {
        setBulkSelected(prev => { const n = new Set(prev); checked ? n.add(studentId) : n.delete(studentId); return n })
    }, [setBulkSelected])

    // ── PDF handler ──
    const handlePDF = useCallback((studentId) => {
        setPreviewStudentId(studentId)
        navigate(`${basePath}/preview/${classId}?month=${selectedMonth}&year=${selectedYear}&type=${reportType}`)
    }, [setPreviewStudentId, navigate, basePath, classId, selectedMonth, selectedYear, reportType])

    // ── Batch Printing Logic ──
    const printExecutingRef = useRef(false)
    const exportingPdfRef = useRef(false)

    const executePrint = useCallback((stuList) => {
        const container = printContainerRef?.current; if (!container) return
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
    }, [selectedClass, bulanObj, selectedYear, addToast, pageSize, setPrintQueue, setPrintRenderedCount, printContainerRef])

    useEffect(() => {
        if (!printQueue || !printQueue.length) { printExecutingRef.current = false; return }
        const expectedCount = printQueue.length + (printQueue.length > 1 ? 1 : 0)
        if (printRenderedCount < expectedCount) return
        if (printExecutingRef.current) return
        if (exportingPdfRef.current) return
        if (silentPrintRef?.current) return
        printExecutingRef.current = true
        const stuList = students.filter(s => printQueue.includes(s.id))
        executePrint(stuList)
    }, [printRenderedCount, printQueue, students, executePrint, silentPrintRef])

    // ── Reset student ──
    const handleResetStudent = useCallback((student) => {
        setConfirmModal({
            title: 'Reset Nilai?',
            description: 'Nilai santri akan dikosongkan',
            body: (
                <span className="text-xs text-[var(--color-text-muted)] leading-relaxed block">
                    Siswa <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-500 font-bold border border-rose-500/20 inline-block">{student.name}</span> akan direset. Nilai akademik, hafalan, fisik, dan catatan santri ini akan dihapus secara permanen dari database.
                </span>
            ),
            icon: AlertTriangle,
            iconBg: 'bg-rose-500/10',
            iconColor: 'text-rose-500',
            confirmText: 'Ya, Reset Semua',
            confirmIcon: AlertTriangle,
            onConfirm: () => { setConfirmModal(null); resetStudent(student.id) }
        })
    }, [resetStudent])

    // ── Reset class ──
    const handleResetClass = useCallback(() => {
        setConfirmModal({
            title: 'Reset Nilai Satu Kelas?',
            description: 'Nilai satu kelas akan dikosongkan',
            body: (
                <span className="text-xs text-[var(--color-text-muted)] leading-relaxed block">
                    Semua data nilai untuk kelas <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-500 font-bold border border-rose-500/20 inline-block">{selectedClass?.name || ''}</span> akan dikosongkan.
                </span>
            ),
            icon: AlertTriangle,
            iconBg: 'bg-rose-500/10',
            iconColor: 'text-rose-500',
            confirmText: 'Ya, Reset Kelas',
            confirmIcon: AlertTriangle,
            onConfirm: () => { setConfirmModal(null); resetClass() }
        })
    }, [resetClass, selectedClass])

    // ── Keyboard navigation ──
    const handleKeyDown = useCallback((e, studentIdx, kriteriaIdx) => {
        const focusCell = (si, ki) => {
            const el = cellRefs.current[`${si}-${ki}`]
            if (el) {
                el.focus()
                const val = el.value; el.value = ''; el.value = val
            } else if (tableScrollRef.current) {
                tableScrollRef.current.scrollTop = si * ROW_HEIGHT
                requestAnimationFrame(() => {
                    const elDelayed = cellRefs.current[`${si}-${ki}`]
                    if (elDelayed) { elDelayed.focus(); const valD = elDelayed.value; elDelayed.value = ''; elDelayed.value = valD }
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

    // ── openStudentDetailDrawer (no-op placeholder; drawer not available in this page) ──
    const openStudentDetailDrawer = useCallback(() => {}, [])
    const openPrintWindow = useCallback(() => {
        navigate(`${basePath}/preview/${classId}?month=${selectedMonth}&year=${selectedYear}&type=${reportType}`)
    }, [navigate, basePath, classId, selectedMonth, selectedYear, reportType])
    const setPendingNav = useCallback(() => {}, [])

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
            {/* Main Input Table */}
            {loading ? (
                <div className="p-12 flex flex-col items-center justify-center gap-3 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                    <p className="text-xs font-bold text-[var(--color-text-muted)]">Memuat data santri & nilai...</p>
                </div>
            ) : (
                <Suspense fallback={
                    <div className="p-8 text-center text-xs font-bold text-[var(--color-text-muted)]">
                        Loading spreadsheet...
                    </div>
                }>
                    <LazyRaportInputTable
                        // Core data
                        globalSaveIndicator={globalSaveIndicator}
                        loading={loading}
                        criteria={activeCriteria}
                        maxScore={activeMaxScore}
                        reportType={reportType}
                        setReportType={setReportType}
                        isAcademicRaport={isAcad}
                        selectedSemester={selectedSemester}
                        academicYear={academicYear}
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
                        setSavingAll={() => {}}
                        studentSearch={studentSearch}
                        setStudentSearch={setStudentSearch}
                        showIncompleteOnly={showIncompleteOnly}
                        setShowIncompleteOnly={setShowIncompleteOnly}
                        showNoPhoneOnly={showNoPhoneOnly}
                        setShowNoPhoneOnly={setShowNoPhoneOnly}
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
                        tableScrollRef={tableScrollRef}
                        mobileActiveIdx={mobileActiveIdx}
                        setMobileActiveIdx={setMobileActiveIdx}
                        templateOpenId={templateOpenId}
                        catatanArabMap={catatanArabMap}
                        prevMonthScores={prevMonthScores}
                        prevMonthExtras={prevMonthExtras}
                        studentTrend={studentTrend}
                        sendingWA={sendingWA}
                        canEdit={canEdit}
                        lang={lang}
                        copyingLastMonth={copyingLastMonth}
                        // Handlers
                        copyFromLastMonth={copyFromLastMonth}
                        handleResetClass={handleResetClass}
                        setStep={(step) => {
                            if (step === 0) navigate(`${basePath}/setup/${classId}`)
                            else if (step === 3 || step === 1) navigate(`${basePath}/preview/${classId}?month=${selectedMonth}&year=${selectedYear}&type=${reportType}`)
                        }}
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
                        behaviorReports={behaviorReports}
                        autosaveEnabled={false}
                    />
                </Suspense>
            )}

            {/* SaaS Raport Export Modal */}
            <Suspense fallback={null}>
                {isExportModalOpen && (
                    <LazyRaportExportModal
                        isOpen={isExportModalOpen}
                        onClose={() => setIsExportModalOpen(false)}
                        students={students}
                        selectedStudentIds={Array.from(bulkSelected || [])}
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
                        criteria={activeCriteria}
                        reportType={reportType}
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
                        navigate(`${basePath}/preview/${classId}?month=${selectedMonth}&year=${selectedYear}&type=${reportType}`)
                    }}
                    handleDownloadPdf={handleDownloadPdf}
                    generatingPdfIds={generatingPdfIds}
                    onConfirm={(selectedQueue, isDebug) => {
                        setWaBlastConfirm(null)
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
                onClose={() => {
                    if (waBlast?.active) {
                        if (waBlastAbortRef.current) waBlastAbortRef.current.aborted = true
                        setWaBlast(prev => prev ? { ...prev, active: false, status: 'aborted' } : null)
                        addToast('WA Blast dibatalkan', 'info')
                    } else {
                        setWaBlast(null)
                    }
                }}
                title="Mengirim Pesan WhatsApp"
                description="Proses pengiriman raport via WhatsApp"
                icon={WhatsAppIcon}
                iconBg="bg-green-500/10"
                iconColor="text-green-600"
                size="md"
                closeOnOutsideClick={!waBlast?.active}
            >
                {waBlast && (
                    <WaBlastProgressContent
                        progress={(waBlast.done || 0) + (waBlast.failed || 0)}
                        total={waBlast.queue?.length || 0}
                        done={waBlast.done || 0}
                        failed={waBlast.failed || 0}
                        activeName={waBlast.active && waBlast.queue?.[waBlast.idx]?.name}
                        active={waBlast.active}
                        status={waBlast.status}
                        onCancel={() => {
                            if (waBlastAbortRef.current) waBlastAbortRef.current.aborted = true
                            setWaBlast(prev => prev ? { ...prev, active: false, status: 'aborted' } : null)
                            addToast('Membatalkan WA Blast...', 'info')
                        }}
                    />
                )}
            </Modal>

            {/* Zip Blast Progress Modal */}
            <Modal
                isOpen={!!zipBlast}
                onClose={() => {
                    if (zipBlast?.active) {
                        if (zipAbortRef.current) zipAbortRef.current.aborted = true
                        setZipBlast(prev => prev ? { ...prev, status: 'aborted', active: false } : null)
                        addToast('Ekspor ZIP dibatalkan', 'info')
                    } else {
                        setZipBlast(null)
                    }
                }}
                title="Export Arsip ZIP Raport"
                description="Menyiapkan file ZIP rapor PDF"
                icon={Archive}
                iconBg="bg-teal-500/10"
                iconColor="text-teal-600"
                size="md"
                closeOnOutsideClick={!zipBlast?.active}
            >
                {zipBlast && (
                    <ZipBlastProgressContent
                        progress={(zipBlast.done || 0) + (zipBlast.failed || 0)}
                        total={zipBlast.queue?.length || zipBlast.total || 0}
                        done={zipBlast.done || 0}
                        failed={zipBlast.failed || 0}
                        activeName={zipBlast.activeName || zipBlast.active}
                        active={!!zipBlast.active}
                        status={zipBlast.status}
                        onCancel={() => {
                            if (zipAbortRef.current) zipAbortRef.current.aborted = true
                            setZipBlast(prev => prev ? { ...prev, status: 'aborted', active: false } : null)
                        }}
                    />
                )}
            </Modal>

            {/* Hidden Print Container for PDF Generation & Batch Printing */}
            {printQueue?.length > 0 && (
                <div ref={printContainerRef} style={{ position: 'fixed', left: '-9999px', top: 0, width: '1000px', visibility: 'hidden', pointerEvents: 'none' }}>
                    {printQueue.length > 1 && (
                        <RaportSummaryPage
                            students={students.filter(s => printQueue.includes(s.id))}
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
                    {students.filter(s => printQueue.includes(s.id)).map((s, idx) => (
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
                            signMode={signMode}
                            signatures={signatures}
                            behaviorReports={behaviorReports ? behaviorReports[s.id] : undefined}
                        />
                    ))}
                </div>
            )}

            {/* Confirm Modal */}
            {confirmModal && (
                <ConfirmDialog
                    isOpen={!!confirmModal}
                    onClose={() => setConfirmModal(null)}
                    onConfirm={confirmModal.onConfirm}
                    title={confirmModal.title}
                    description={confirmModal.description}
                    icon={confirmModal.icon || AlertTriangle}
                    iconBg={confirmModal.iconBg || 'bg-rose-500/10'}
                    iconColor={confirmModal.iconColor || 'text-rose-500'}
                    confirmText={confirmModal.confirmText || confirmModal.confirmLabel || 'Konfirmasi'}
                    confirmIcon={confirmModal.confirmIcon}
                >
                    {confirmModal.body}
                </ConfirmDialog>
            )}
        </div>
    )
}
