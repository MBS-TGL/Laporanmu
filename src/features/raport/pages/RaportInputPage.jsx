import React, { useEffect, Suspense, lazy, useState, useRef, useMemo, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useRaportContext } from '@features/raport/context/RaportContext'
import { AlertTriangle, ArrowLeft, Save, Copy, Eye, Loader2, CheckCircle2, Globe, FileSpreadsheet } from 'lucide-react'
import { isComplete } from '@utils/reports/raportHelpers'
import { KRITERIA } from '@utils/reports/raportConstants'

const LazyRaportInputTable = lazy(() => import('@features/raport/components/RaportInputTable'))

const ROW_HEIGHT = 188
const OVERSCAN = 5

export default function RaportInputPage({ isAcademic = false }) {
    const { classId } = useParams()
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()
    const { core, activeRtObj, activeCriteria, activeMaxScore, isAcademic: isAcad, importExport } = useRaportContext()

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
    } = core

    const { sendingWA, generateAndSendWA, runZipBlast, setWaBlastConfirm, setIsExportOpen: setIsExportModalOpen } = importExport

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

    // ── Filtered students (with debounce for "incomplete only") ──
    const baseFiltered = useMemo(() => {
        let list = students
        if (studentSearch.trim()) list = list.filter(s => s.name.toLowerCase().includes(studentSearch.toLowerCase()))
        if (showNoPhoneOnly) list = list.filter(s => !s.phone)
        return list
    }, [students, studentSearch, showNoPhoneOnly])

    const [filteredStudents, setFilteredStudents] = useState(() => students)
    const filteredDebounceRef = useRef(null)
    const scoresSnapshotRef = useRef(scores)
    scoresSnapshotRef.current = scores
    const extrasSnapshotRef = useRef(extras)
    extrasSnapshotRef.current = extras

    useEffect(() => {
        if (!showIncompleteOnly) {
            setFilteredStudents(prev => {
                if (prev === baseFiltered) return prev
                return baseFiltered
            })
            return
        }
        if (filteredDebounceRef.current) clearTimeout(filteredDebounceRef.current)
        filteredDebounceRef.current = setTimeout(() => {
            const sc = scoresSnapshotRef.current
            setFilteredStudents(baseFiltered.filter(s => !isComplete(sc[s.id] || {}, activeCriteria)))
        }, 1500)
        return () => { if (filteredDebounceRef.current) clearTimeout(filteredDebounceRef.current) }
    }, [baseFiltered, showIncompleteOnly, activeCriteria])

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

    // ── Score change handler ──
    const handleScoreChange = useCallback((studentId, key, value) => {
        const cur = pendingScoresRef.current[studentId]?.[key] ?? scoresSnapshotRef.current?.[studentId]?.[key]
        if (String(value) === String(cur ?? '')) return
        if (!pendingScoresRef.current[studentId]) pendingScoresRef.current[studentId] = {}
        pendingScoresRef.current[studentId][key] = value
        const markUnsaved = () => setSavedIds(prev => { const n = new Set(prev); n.delete(studentId); return n })
        if (typeof window.requestIdleCallback === 'function') {
            window.requestIdleCallback(markUnsaved, { timeout: 1500 })
        } else { setTimeout(markUnsaved, 500) }
        triggerAutoSave(studentId)
        if (typeof window.requestIdleCallback === 'function') {
            window.requestIdleCallback(() => flushScores(studentId), { timeout: 1000 })
        } else { setTimeout(() => flushScores(studentId), 300) }
    }, [triggerAutoSave, flushScores, setSavedIds])

    // ── Extra change handler ──
    const handleExtraChange = useCallback((studentId, key, value) => {
        const cur = pendingExtrasRef.current[studentId]?.[key] ?? extrasSnapshotRef.current?.[studentId]?.[key]
        if (String(value) === String(cur ?? '')) return
        if (!pendingExtrasRef.current[studentId]) pendingExtrasRef.current[studentId] = {}
        pendingExtrasRef.current[studentId][key] = value
        const markUnsaved = () => setSavedIds(prev => { const n = new Set(prev); n.delete(studentId); return n })
        if (typeof window.requestIdleCallback === 'function') {
            window.requestIdleCallback(markUnsaved, { timeout: 1500 })
        } else { setTimeout(markUnsaved, 500) }
        triggerAutoSave(studentId)
        if (typeof window.requestIdleCallback === 'function') {
            window.requestIdleCallback(() => flushExtras(studentId), { timeout: 1000 })
        } else { setTimeout(() => flushExtras(studentId), 300) }
    }, [triggerAutoSave, flushExtras, setSavedIds])

    // ── Catatan change handler ──
    const handleCatatanChange = useCallback((studentId, key, value) => {
        const cur = pendingExtrasRef.current[studentId]?.[key] ?? extrasSnapshotRef.current?.[studentId]?.[key]
        if (String(value) === String(cur ?? '')) return
        if (!pendingExtrasRef.current[studentId]) pendingExtrasRef.current[studentId] = {}
        pendingExtrasRef.current[studentId][key] = value
        const markUnsaved = () => setSavedIds(prev => { const n = new Set(prev); n.delete(studentId); return n })
        if (typeof window.requestIdleCallback === 'function') {
            window.requestIdleCallback(markUnsaved, { timeout: 1500 })
        } else { setTimeout(markUnsaved, 500) }
        triggerAutoSave(studentId)
        if (typeof window.requestIdleCallback === 'function') {
            window.requestIdleCallback(() => flushExtras(studentId), { timeout: 1000 })
        } else { setTimeout(() => flushExtras(studentId), 300) }
        setCatatanArabMap(prev => { const n = { ...prev }; delete n[studentId]; return n })
    }, [triggerAutoSave, flushExtras, setSavedIds, setCatatanArabMap])

    // ── Template handlers ──
    const handleTemplateToggle = useCallback((studentId) => {
        setTemplateOpenId(prev => prev === studentId ? null : studentId)
    }, [])

    const handleTemplateApply = useCallback((studentId, tmpl) => {
        setExtras(prev => ({ ...prev, [studentId]: { ...prev[studentId], catatan: tmpl } }))
        setSavedIds(prev => { const n = new Set(prev); n.delete(studentId); return n })
        triggerAutoSave(studentId)
        setTemplateOpenId(null)
        setCatatanArabMap(prev => { const n = { ...prev }; delete n[studentId]; return n })
    }, [triggerAutoSave, setExtras, setSavedIds, setCatatanArabMap])

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

    // ── Reset student ──
    const handleResetStudent = useCallback((student) => {
        setConfirmModal({
            title: 'Reset Nilai?',
            description: 'Nilai santri akan dikosongkan',
            body: (
                <>Siswa <span className="text-red-500 font-black px-1.5 py-0.5 bg-red-500/10 rounded-md border border-red-500/20">{student.name}</span> akan direset. Nilai akademik, hafalan, fisik, dan catatan santri ini akan dihapus secara permanen dari database.</>
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

    // ── Reset class ──
    const handleResetClass = useCallback(() => {
        setConfirmModal({
            title: 'Reset Nilai Satu Kelas?',
            description: 'Nilai satu kelas akan dikosongkan',
            body: (
                <>Semua data nilai untuk kelas <span className="text-red-500 font-black px-1.5 py-0.5 bg-red-500/10 rounded-md border border-red-500/20">{selectedClass?.name || ''}</span> akan dikosongkan.</>
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
                        autosaveEnabled={true}
                    />
                </Suspense>
            )}

            {/* Confirm Modal */}
            {confirmModal && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-[var(--color-surface)] rounded-2xl shadow-2xl p-6 max-w-sm w-full space-y-4 border border-[var(--color-border)]">
                        <div className="flex items-center gap-3">
                            {confirmModal.icon && (
                                <div className={`w-10 h-10 rounded-xl ${confirmModal.iconBg} flex items-center justify-center shrink-0`}>
                                    <confirmModal.icon className={`w-5 h-5 ${confirmModal.iconColor}`} />
                                </div>
                            )}
                            <div>
                                <p className="font-black text-sm text-[var(--color-text)]">{confirmModal.title}</p>
                                {confirmModal.description && (
                                    <p className="text-[11px] text-[var(--color-text-muted)]">{confirmModal.description}</p>
                                )}
                            </div>
                        </div>
                        {confirmModal.body && (
                            <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed">{confirmModal.body}</p>
                        )}
                        <div className="flex gap-2 justify-end">
                            <button
                                onClick={() => setConfirmModal(null)}
                                className="px-4 py-2 rounded-xl border border-[var(--color-border)] text-[11px] font-black text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] transition-all"
                            >
                                Batal
                            </button>
                            <button
                                onClick={confirmModal.onConfirm}
                                className={`px-4 py-2 rounded-xl text-white text-[11px] font-black transition-all ${confirmModal.variant === 'red' ? 'bg-red-500 hover:bg-red-600' : 'bg-indigo-500 hover:bg-indigo-600'}`}
                            >
                                {confirmModal.confirmLabel || 'Konfirmasi'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
