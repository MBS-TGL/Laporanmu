import React, { useState, useRef, useEffect, useMemo } from 'react'

import {
    ArrowLeft, School, Loader2, Save, Printer, Search, Zap, Sparkles, AlertTriangle,
    Download, Check, Users, CheckCircle2, ChevronLeft, ChevronRight, X, TrendingUp,
    FileText, Scale, Ruler, HeartPulse, AlertCircle, DoorOpen, BookOpen, ClipboardList, Copy,
    FolderArchive, Paintbrush
} from 'lucide-react'
const WhatsAppIcon = (props) => (
    <svg viewBox="0 0 448 512" fill="currentColor" {...props}>
        <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7 .9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z" />
    </svg>
)
import { EmptyState, Modal, BulkActionsBar } from '@shared/components'
import RichSelect from '@shared/components/RichSelect'
import StudentRow, { ExtraInput, ExtraTextarea } from './RaportRecordRow'
import { RadarChart } from './RaportCharts'

import {
    BULAN, FISIK_FIELDS, HAFALAN_FIELDS, calcAvg
} from '@utils/reports/raportConstants'
import { getGradePredicate, getClassLevel, RAPORT_TYPES } from '@utils/reports/raportTypeRegistry'
import { isComplete, generateAutoComment } from '@utils/reports/raportHelpers'
import { supabase } from '@lib/supabase'

const ROW_HEIGHT = 188

const DesktopSkeleton = ({ criteria = [] }) => (
    <div className="overflow-x-auto rounded-xl border border-[var(--color-border)] fade-in animate-in duration-300">
        <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 910, tableLayout: 'fixed' }}>
            <colgroup>
                <col style={{ width: 36 }} />
                <col style={{ width: 140 }} />
                {(criteria || []).map(k => <col key={k.key} style={{ width: 54 }} />)}
                <col style={{ width: 170 }} />
                <col style={{ width: 160 }} />
                <col style={{ width: 130 }} />
            </colgroup>
            <thead>
                <tr className="bg-[var(--color-surface-alt)] border-b border-[var(--color-border)]">
                    <th style={{ padding: '10px 8px' }} className="text-center">
                        <div className="w-4 h-4 bg-[var(--color-border)] rounded animate-pulse mx-auto" />
                    </th>
                    <th style={{ padding: '10px 0' }} className="text-center sticky left-0 bg-[var(--color-surface-alt)] border-r border-[var(--color-border)]">
                        <div className="w-16 h-3 bg-[var(--color-border)] rounded animate-pulse mx-auto" />
                    </th>
                    {(criteria || []).map(k => (
                        <th key={k.key} style={{ padding: '10px 4px' }} className="text-center">
                            <div className="w-8 h-3 bg-[var(--color-border)] rounded animate-pulse mx-auto" />
                        </th>
                    ))}
                    <th style={{ padding: '10px 8px' }} className="text-center">
                        <div className="w-12 h-3 bg-[var(--color-border)] rounded animate-pulse mx-auto" />
                    </th>
                    <th style={{ padding: '10px 8px' }} className="text-center">
                        <div className="w-20 h-3 bg-[var(--color-border)] rounded animate-pulse mx-auto" />
                    </th>
                    <th style={{ padding: '10px 8px' }} className="text-center">
                        <div className="w-10 h-3 bg-[var(--color-border)] rounded animate-pulse mx-auto" />
                    </th>
                </tr>
            </thead>
            <tbody>
                {[...Array(5)].map((_, i) => (
                    <tr key={i} className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
                        <td className="p-3 text-center">
                            <div className="w-3.5 h-3.5 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded animate-pulse mx-auto" />
                        </td>
                        <td className="p-3 sticky left-0 bg-[var(--color-surface)] border-r border-[var(--color-border)]">
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-[var(--color-surface-alt)] animate-pulse shrink-0" />
                                <div className="flex-1 space-y-1">
                                    <div className="h-2.5 bg-[var(--color-surface-alt)] rounded animate-pulse w-20" />
                                    <div className="h-2 bg-[var(--color-surface-alt)] rounded animate-pulse w-12" />
                                </div>
                            </div>
                        </td>
                        {(criteria || []).map(k => (
                            <td key={k.key} className="p-3 text-center">
                                <div className="w-9 h-8 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-lg animate-pulse mx-auto" />
                            </td>
                        ))}
                        <td className="p-3">
                            <div className="flex items-center justify-center gap-1">
                                {[...Array(3)].map((_, idx) => (
                                    <div key={idx} className="w-8 h-8 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-lg animate-pulse" />
                                ))}
                            </div>
                        </td>
                        <td className="p-3">
                            <div className="space-y-1.5">
                                <div className="h-8 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-lg animate-pulse w-full" />
                            </div>
                        </td>
                        <td className="p-3 sticky right-0 bg-[var(--color-surface)] border-l border-[var(--color-border)]">
                            <div className="flex items-center justify-center gap-1.5">
                                <div className="w-8 h-8 bg-[var(--color-surface-alt)] rounded-lg animate-pulse" />
                                <div className="w-8 h-8 bg-[var(--color-surface-alt)] rounded-lg animate-pulse" />
                            </div>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
)

const MobileSkeleton = () => (
    <div className="p-4 space-y-4 fade-in animate-in duration-300">
        <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-[var(--color-border)]">
                <div className="w-10 h-10 rounded-full bg-[var(--color-surface-alt)] animate-pulse shrink-0" />
                <div className="flex-1 space-y-2">
                    <div className="h-3.5 bg-[var(--color-surface-alt)] rounded animate-pulse w-32" />
                    <div className="h-2.5 bg-[var(--color-surface-alt)] rounded animate-pulse w-20" />
                </div>
                <div className="w-8 h-8 rounded-lg bg-[var(--color-surface-alt)] animate-pulse" />
            </div>
            <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="space-y-1">
                            <div className="h-2 bg-[var(--color-surface-alt)] rounded animate-pulse w-12" />
                            <div className="h-9 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-lg animate-pulse" />
                        </div>
                    ))}
                </div>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-[var(--color-border)]">
                <div className="w-20 h-8 bg-[var(--color-surface-alt)] rounded-lg animate-pulse" />
                <div className="flex gap-2">
                    <div className="w-8 h-8 bg-[var(--color-surface-alt)] rounded-lg animate-pulse" />
                    <div className="w-8 h-8 bg-[var(--color-surface-alt)] rounded-lg animate-pulse" />
                </div>
            </div>
        </div>
    </div>
)
const SCORE_KEYS = [
    { key: 'nilai_akhlak', short: 'AKH' },
    { key: 'nilai_ibadah', short: 'IBA' },
    { key: 'nilai_kebersihan', short: 'KEB' },
    { key: 'nilai_quran', short: "QUR" },
    { key: 'nilai_bahasa', short: 'BHS' },
]
const scoreColor = (v, maxScore = 100) => {
    if (v === null || v === undefined || v === '') return 'bg-[var(--color-surface-alt)] text-[var(--color-text-muted)]'
    const n = Number(v)
    const normalized = maxScore <= 10 ? (n * 100) / maxScore : n
    if (normalized >= 90) return 'bg-emerald-500/15 text-emerald-700'
    if (normalized >= 75) return 'bg-indigo-500/15 text-indigo-700'
    if (normalized >= 60) return 'bg-amber-500/15 text-amber-700'
    return 'bg-rose-500/15 text-rose-700'
}

const CopyDataModal = ({ isOpen, onClose, students, scores, extras, currentMonth, currentYear, copyFromLastMonth, maxScore }) => {
    const defaultMonth = currentMonth === 1 ? 12 : currentMonth - 1
    const defaultYear = currentMonth === 1 ? currentYear - 1 : currentYear
    const [sourceMonth, setSourceMonth] = useState(defaultMonth)
    const [sourceYear, setSourceYear] = useState(defaultYear)
    const [loading, setLoading] = useState(false)
    const [sourceData, setSourceData] = useState({})
    const [selectedIds, setSelectedIds] = useState(new Set())
    const [overwriteAll, setOverwriteAll] = useState(false)
    const [executing, setExecuting] = useState(false)

    const years = useMemo(() => {
        const cur = new Date().getFullYear()
        return Array.from({ length: 5 }, (_, i) => cur - 3 + i)
    }, [])

    useEffect(() => {
        if (!isOpen) return
        let active = true
        setLoading(true)
        const run = async () => {
            try {
                const ids = students.map(s => s.id)
                const { data } = await supabase
                    .from('student_monthly_reports')
                    .select('student_id,nilai_akhlak,nilai_ibadah,nilai_kebersihan,nilai_quran,nilai_bahasa')
                    .in('student_id', ids).eq('month', sourceMonth).eq('year', sourceYear)
                if (!active) return
                const map = {}
                for (const r of (data || [])) map[r.student_id] = r
                setSourceData(map)
                // auto-select all students with source data
                setSelectedIds(new Set(Object.keys(map).filter(id => {
                    const r = map[id]
                    return SCORE_KEYS.some(k => r[k.key] !== null && r[k.key] !== undefined)
                })))
            } finally {
                if (active) setLoading(false)
            }
        }
        run()
        return () => { active = false }
    }, [sourceMonth, sourceYear, students, isOpen])

    const hasCurrent = (id) => {
        const sc = scores[id], ex = extras[id]
        return (sc && Object.values(sc).some(v => v !== '' && v !== null && v !== undefined)) ||
               (ex && Object.values(ex).some(v => v !== '' && v !== null && v !== undefined))
    }
    const hasSource = (id) => {
        const r = sourceData[id]
        return r && SCORE_KEYS.some(k => r[k.key] !== null && r[k.key] !== undefined)
    }

    const studentsWithSource = students.filter(s => hasSource(s.id))
    const conflicts = students.filter(s => hasSource(s.id) && hasCurrent(s.id))
    const selectedCount = selectedIds.size

    const toggleAll = () => {
        if (selectedIds.size === studentsWithSource.length)
            setSelectedIds(new Set())
        else
            setSelectedIds(new Set(studentsWithSource.map(s => s.id)))
    }
    const toggleOne = (id) => {
        setSelectedIds(prev => {
            const n = new Set(prev)
            n.has(id) ? n.delete(id) : n.add(id)
            return n
        })
    }

    const handleConfirm = async () => {
        if (!selectedCount) return
        setExecuting(true)
        try {
            await copyFromLastMonth(sourceMonth, sourceYear, Array.from(selectedIds), overwriteAll)
            onClose()
        } finally { setExecuting(false) }
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Salin Data Nilai" description="Preview dan pilih santri yang akan disalin nilainya"
            icon={Copy} iconBg="bg-amber-500/10" iconColor="text-amber-600" size="lg" mobileVariant="bottom-sheet"
            footer={
                <div className="flex items-center w-full gap-3">
                    <button onClick={onClose} className="h-10 px-5 rounded-xl border border-[var(--color-border)] text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] transition-all">Batal</button>
                    <div className="flex-1" />
                    <div className="flex items-center gap-2 text-[10px] font-black text-amber-700">
                        <button onClick={() => setOverwriteAll(v => !v)}
                            className={`flex items-center gap-1.5 px-3 h-8 rounded-lg border transition-all ${overwriteAll ? 'bg-amber-500/15 border-amber-500/30 text-amber-700' : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]'}`}>
                            <AlertTriangle className="w-3 h-3" />
                            <span>Timpa semua</span>
                        </button>
                    </div>
                    <button onClick={handleConfirm} disabled={!selectedCount || executing}
                        className="h-10 px-6 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2 disabled:opacity-50">
                        {executing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                        Salin {selectedCount > 0 ? `(${selectedCount})` : ''}
                    </button>
                </div>
            }>
            <div className="space-y-4">
                {/* Unified Source Selector & Stats */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl bg-[var(--color-surface-alt)] border border-[var(--color-border)]">
                    {/* selectors */}
                    <div className="flex items-center gap-2 flex-grow sm:flex-grow-0">
                        <div className="flex-1 sm:w-44">
                            <RichSelect value={sourceMonth} onChange={v => setSourceMonth(Number(v))}
                                options={BULAN.map(b => ({ id: b.id, name: `${b.id_str} (${b.ar})` }))} small />
                        </div>
                        <div className="flex-1 sm:w-28">
                            <RichSelect value={sourceYear} onChange={v => setSourceYear(Number(v))}
                                options={years.map(y => ({ id: y, name: String(y) }))} small />
                        </div>
                    </div>
                    {/* stats */}
                    <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-500/5 border border-emerald-500/10 text-emerald-700 text-[10px] font-black">
                            <span>Tersedia:</span>
                            <span className="bg-emerald-500/10 text-emerald-600 px-1.5 py-0.5 rounded-md font-black text-[10px] min-w-[18px] text-center">{studentsWithSource.length}</span>
                        </div>
                        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-500/5 border border-amber-500/10 text-amber-700 text-[10px] font-black">
                            <span>Konflik:</span>
                            <span className="bg-amber-500/10 text-amber-600 px-1.5 py-0.5 rounded-md font-black text-[10px] min-w-[18px] text-center">{conflicts.length}</span>
                        </div>
                        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-indigo-500/5 border border-indigo-500/10 text-indigo-750 text-[10px] font-black">
                            <span>Dipilih:</span>
                            <span className="bg-indigo-500/10 text-indigo-600 px-1.5 py-0.5 rounded-md font-black text-[10px] min-w-[18px] text-center">{selectedCount}</span>
                        </div>
                    </div>
                </div>

                {/* Student List */}
                {loading ? (
                    <div className="flex items-center justify-center gap-2 py-8 text-[10px] font-black text-[var(--color-text-muted)] animate-pulse">
                        <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                        Memuat data nilai sumber...
                    </div>
                ) : studentsWithSource.length === 0 ? (
                    <div className="flex items-center gap-2 p-4 rounded-xl bg-rose-500/5 border border-rose-500/10 text-[10px] text-rose-700 font-bold">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        Tidak ada data nilai untuk periode ini.
                    </div>
                ) : (
                    <div className="border border-[var(--color-border)] rounded-2xl bg-[var(--color-surface)] overflow-hidden shadow-sm">
                        {/* Select All header */}
                        <div className="flex items-center justify-between px-4 py-3 bg-[var(--color-surface-alt)] border-b border-[var(--color-border)]">
                            <button onClick={toggleAll} className="flex items-center gap-2 text-[10px] font-black text-[var(--color-text)] hover:text-indigo-600 transition-colors">
                                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${selectedIds.size === studentsWithSource.length ? 'bg-indigo-500 border-indigo-500' : 'border-[var(--color-border)] bg-white'}`}>
                                    {selectedIds.size === studentsWithSource.length && <Check className="w-2.5 h-2.5 text-white" />}
                                </div>
                                Pilih Semua ({studentsWithSource.length})
                            </button>
                            <span className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-wider">Preview Nilai Sumber</span>
                        </div>
                        {/* Scrollable list */}
                        <div className="p-3 space-y-1.5 max-h-[160px] overflow-y-auto custom-scrollbar bg-[var(--color-surface)]">
                            {students.map((s, idx) => {
                                const src = sourceData[s.id]
                                const hasData = hasSource(s.id)
                                const isConflict = hasData && hasCurrent(s.id)
                                const isSelected = selectedIds.has(s.id)
                                return (
                                    <button key={s.id} type="button"
                                        onClick={() => hasData && toggleOne(s.id)}
                                        disabled={!hasData}
                                        className={`w-full flex items-center gap-3 p-2.5 rounded-xl border text-left transition-all ${isSelected ? 'bg-indigo-500/5 border-indigo-500/20' : hasData ? 'border-[var(--color-border)] hover:bg-[var(--color-surface-alt)]' : 'border-[var(--color-border)]/40 opacity-40 cursor-not-allowed'}`}>
                                        {/* Checkbox */}
                                        <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${isSelected ? 'bg-indigo-500 border-indigo-500' : 'border-[var(--color-border)] bg-white'}`}>
                                            {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                                        </div>
                                        {/* Index + Name */}
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                            <span className="text-[9px] font-black text-[var(--color-text-muted)] w-5 shrink-0">{idx + 1}</span>
                                            <div className="min-w-0">
                                                <div className="text-[11px] font-black text-[var(--color-text)] truncate">{s.name}</div>
                                                {isConflict && <div className="text-[9px] font-bold text-amber-600 flex items-center gap-1"><AlertTriangle className="w-2.5 h-2.5" />Ada nilai aktif</div>}
                                            </div>
                                        </div>
                                        {/* Score chips */}
                                        <div className="flex items-center gap-1 shrink-0">
                                            {SCORE_KEYS.map(({ key, short }) => {
                                                const v = src?.[key]
                                                return (
                                                    <div key={key} className={`w-9 h-7 rounded-lg flex flex-col items-center justify-center ${scoreColor(v, maxScore)}`} title={short}>
                                                        <span className="text-[8px] font-black leading-none opacity-60">{short}</span>
                                                        <span className="text-[10px] font-black leading-none">{v ?? '—'}</span>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    )
}

export default function RaportInputTable({
    // Context States

    globalSaveIndicator,
    criteria,
    maxScore,
    reportType,
    setReportType,
    isAcademicRaport,
    selectedSemester,
    academicYear,
    students,
    filteredStudents,
    scores,
    setScores,
    extras,
    setExtras,
    savedIds,
    setSavedIds,
    saving,
    savingAll,
    setSavingAll,
    studentSearch,
    setStudentSearch,
    showIncompleteOnly,
    setShowIncompleteOnly,
    showNoPhoneOnly,
    setShowNoPhoneOnly,
    selectedMonth,
    selectedYear,
    musyrif,
    selectedClass,
    progressPct,
    hasUnsavedMemo,
    noPhoneCount,
    bulkMode,
    setBulkMode,
    bulkValues,
    setBulkValues,
    bulkSelected,
    setBulkSelected,
    visibleRange,
    tableScrollRef,
    mobileActiveIdx,
    setMobileActiveIdx,
    templateOpenId,
    catatanArabMap,
    prevMonthScores,
    studentTrend,
    sendingWA,
    canEdit,
    lang,
    copyingLastMonth,
    loading,

    // Actions & Handlers
    copyFromLastMonth,
    handleResetClass,
    setStep,
    setSelectedClassId,
    setPendingNav,
    saveAll,
    saveStudent,
    resetStudent,
    generateAndSendWA,
    handlePDF,
    handleResetStudent,
    handleBulkToggle,
    handleKeyDown,
    handleTemplateToggle,
    handleTemplateApply,
    handleTranslitToggle,
    handleScoreChange,
    handleExtraChange,
    handleCatatanChange,
    triggerAutoSave,
    openStudentDetailDrawer,
    setIsExportModalOpen,
    setWaBlastConfirm,
    addToast,
    setConfirmModal,
    runZipBlast,
    openPrintWindow,
    cellRefs
}) {
    const classLevel = getClassLevel(selectedClass)
    const rtObj = RAPORT_TYPES[reportType] || RAPORT_TYPES.bulanan
    const getGrade = (val) => getGradePredicate(val, reportType, classLevel)

    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false)
    const [isCopyModalOpen, setIsCopyModalOpen] = useState(false)


    const classStats = React.useMemo(() => {
        const activeCriteria = criteria || []
        let overallSum = 0
        let overallCount = 0
        let completeCount = 0

        const criteriaSums = {}
        const criteriaCounts = {}
        activeCriteria.forEach(k => {
            criteriaSums[k.key] = 0
            criteriaCounts[k.key] = 0
        })

        students.forEach(s => {
            const sc = scores[s.id] || {}
            if (isComplete(sc, activeCriteria)) {
                completeCount++
            }
            activeCriteria.forEach(k => {
                const val = sc[k.key]
                if (val !== '' && val !== null && val !== undefined) {
                    const num = Number(val)
                    overallSum += num
                    overallCount++
                    criteriaSums[k.key] += num
                    criteriaCounts[k.key]++
                }
            })
        })
        const overallAverage = overallCount > 0 ? (overallSum / overallCount).toFixed(1) : '—'

        const criteriaAverages = activeCriteria.map(k => {
            const cnt = criteriaCounts[k.key]
            const avg = cnt > 0 ? (criteriaSums[k.key] / cnt).toFixed(1) : '—'
            return {
                ...k,
                average: avg
            }
        })

        return {
            overallAverage,
            criteriaAverages,
            completed: completeCount,
            total: students.length,
            incomplete: students.length - completeCount
        }
    }, [students, scores, criteria])

    return (
        <div className="space-y-4">
            {/* ── TOOLBAR CONTAINER ── */}
            {/* ── MOBILE TOOLBAR (md:hidden) ── */}
            <div className="md:hidden space-y-2">
                {/* Row 1: Header (Back + Class Title + Mobile Actions) */}
                <div className="flex items-center gap-1.5 w-full">
                    <button
                        onClick={() => {
                            if (hasUnsavedMemo) {
                                setPendingNav({ action: () => { setStep(0); setSelectedClassId('') } })
                                return
                            }
                            setStep(0); setSelectedClassId('')
                        }}
                        className="flex-1 flex items-center gap-1.5 px-2.5 h-8 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] overflow-hidden min-w-0 transition-all group"
                        title="Kembali ke Pemilihan Kelas"
                    >
                        <ArrowLeft className="w-3 h-3 shrink-0 group-hover:-translate-x-0.5 transition-transform" />
                        <span className="w-px h-3 bg-[var(--color-border)] shrink-0" />
                        <School className="text-emerald-500 w-3 h-3 shrink-0" />
                        <span className="text-[9px] font-black text-[var(--color-text)] truncate">{selectedClass?.name}</span>
                        <span className="w-px h-2.5 bg-[var(--color-border)] mx-0.5 shrink-0" />
                        <span className="text-[8px] font-bold text-[var(--color-text-muted)] uppercase whitespace-nowrap shrink-0">
                            {reportType === 'bulanan' ? `${BULAN[selectedMonth - 1]?.id_str} ${selectedYear}` : `Sem ${selectedSemester} (${academicYear})`}
                        </span>
                    </button>
                    <button onClick={saveAll} disabled={savingAll || !canEdit} className="h-8 w-8 rounded-xl bg-emerald-500 text-white text-[10px] font-black hover:bg-emerald-600 flex items-center justify-center relative disabled:opacity-70 shrink-0">
                        {savingAll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        {!savingAll && hasUnsavedMemo && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 border-2 border-white animate-pulse" />}
                    </button>
                    <button onClick={() => setStep(3)} className="h-8 w-8 rounded-xl bg-indigo-500 text-white text-[10px] font-black hover:bg-indigo-600 flex items-center justify-center shrink-0">
                        <Printer className="w-3.5 h-3.5" />
                    </button>
                </div>

                {!isAcademicRaport && (
                    <div className="flex items-center bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-xl p-0.5 w-full justify-between gap-0.5 shadow-sm h-8">
                        {[
                            { id: 'bulanan', label: 'Bulanan' },
                            { id: 'pondok_lisan', label: 'Lisan' },
                            { id: 'pondok_mapel', label: 'Mapel' }
                        ].map(t => (
                            <button
                                key={t.id}
                                onClick={async () => {
                                    if (reportType === t.id) return
                                    if (hasUnsavedMemo) {
                                        setConfirmModal({
                                            title: 'Perubahan Belum Disimpan',
                                            description: 'Anda memiliki perubahan nilai yang belum disimpan.',
                                            body: (
                                                <>
                                                    Apakah Anda yakin ingin berpindah tipe raport? Perubahan yang belum disimpan akan hilang.
                                                </>
                                            ),
                                            icon: AlertTriangle,
                                            iconBg: 'bg-red-500/10',
                                            iconColor: 'text-red-500',
                                            variant: 'red',
                                            confirmLabel: 'Ya, Pindah',
                                            confirmIcon: AlertTriangle,
                                            onConfirm: async () => {
                                                setConfirmModal(null)
                                                setReportType(t.id)
                                            }
                                        })
                                        return
                                    }
                                    setReportType(t.id)
                                }}
                                className={`flex-1 h-full rounded-lg text-[9px] font-black uppercase tracking-wider text-center transition-all flex items-center justify-center ${reportType === t.id
                                    ? 'bg-indigo-600 text-white shadow-sm'
                                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                                    }`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>
                )}

                {/* Row 4: Search & Incomplete/WA filters */}
                <div className="flex gap-1.5 w-full">
                    <div className="relative flex-1 min-w-0">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none" />
                        <input type="text" placeholder="Cari santri..." value={studentSearch} onChange={e => setStudentSearch(e.target.value)}
                            className="h-8 w-full pl-8 pr-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[11px] font-black text-[var(--color-text)] outline-none focus:border-indigo-500/50 transition-all" />
                    </div>

                    {classStats.incomplete > 0 && (
                        <button
                            onClick={() => { setShowIncompleteOnly(v => !v); setShowNoPhoneOnly(false) }}
                            className={`h-8 px-3 rounded-xl border text-[10px] font-black flex items-center justify-center gap-1.5 transition-all shrink-0 ${showIncompleteOnly
                                ? 'bg-amber-500 text-white border-amber-500 shadow-sm shadow-amber-500/10'
                                : 'bg-amber-500/10 border-amber-500/20 text-amber-600'
                                }`}
                            title="Belum Lengkap"
                        >
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>{classStats.incomplete}</span>
                        </button>
                    )}

                    {noPhoneCount > 0 && (
                        <button
                            onClick={() => { setShowNoPhoneOnly(v => !v); setShowIncompleteOnly(false) }}
                            className={`h-8 px-3 rounded-xl border text-[10px] font-black flex items-center justify-center gap-1.5 transition-all shrink-0 ${showNoPhoneOnly
                                ? 'bg-rose-500 text-white border-rose-500 shadow-sm shadow-rose-500/10'
                                : 'bg-rose-500/10 border-rose-500/20 text-rose-600'
                                }`}
                            title="Tanpa WA"
                        >
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span>{noPhoneCount}</span>
                        </button>
                    )}
                </div>

                {/* Row 5: Actions Row (Consolidated & auto-fitted to width with icon-only buttons) */}
                <div className="grid grid-cols-5 gap-1.5 w-full">
                    <button
                        onClick={() => {
                            setBulkValues({})
                            setIsBulkModalOpen(true)
                        }}
                        className="h-8 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-600 flex items-center justify-center transition-all hover:bg-violet-500/20"
                        title="Isi Massal"
                    >
                        <Sparkles className="w-3.5 h-3.5" />
                    </button>

                    <button
                        onClick={() => setIsExportModalOpen(true)}
                        className="h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 flex items-center justify-center transition-all hover:bg-indigo-500/20"
                        title="Export Data"
                    >
                        <Download className="w-3.5 h-3.5" />
                    </button>

                    <button
                        onClick={() => {
                            const withPhone = students.filter(s => s.phone && isComplete(scores[s.id] || {}, criteria))
                            if (withPhone.length) {
                                setWaBlastConfirm({ queue: withPhone })
                            } else {
                                addToast('Belum ada santri dengan nomor WA & nilai lengkap', 'warning')
                            }
                        }}
                        className="h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 flex items-center justify-center transition-all hover:bg-emerald-500/20"
                        title="Blast WA"
                    >
                        <WhatsAppIcon className="w-3.5 h-3.5" />
                    </button>

                    <button
                        onClick={() => setIsCopyModalOpen(true)}
                        disabled={copyingLastMonth || !canEdit}
                        className="h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center transition-all hover:bg-amber-500/20 disabled:opacity-50"
                        title="Salin Data Nilai"
                    >
                        {copyingLastMonth ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>

                    <button
                        onClick={handleResetClass}
                        disabled={!canEdit}
                        className="h-8 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 flex items-center justify-center transition-all hover:bg-red-500/20 disabled:opacity-50"
                        title="Reset Kelas"
                    >
                        <AlertTriangle className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* ── DESKTOP TOOLBAR (hidden md:block) ── */}
            <div className="hidden md:block space-y-2.5">
                {/* ROW 1: Context + Progress + Actions */}
                <div className="w-full flex flex-row flex-nowrap items-center gap-4 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden py-0.5">
                    {/* Left Info Group (Context + Badges) */}
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        {/* Combined Back/Change Class & Class Info */}
                        <button
                            onClick={() => {
                                if (hasUnsavedMemo) {
                                    setPendingNav({ action: () => { setStep(0); setSelectedClassId('') } })
                                    return
                                }
                                setStep(0); setSelectedClassId('')
                            }}
                            className="h-9 px-3 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:border-indigo-500/30 hover:bg-slate-500/5 transition-all flex items-center gap-2 flex-1 min-w-[160px] group"
                            title="Kembali ke Pemilihan Kelas"
                        >
                            <ArrowLeft className="w-3.5 h-3.5 text-[var(--color-text-muted)] group-hover:text-[var(--color-text)] group-hover:-translate-x-0.5 transition-all" />
                            <span className="w-px h-3.5 bg-[var(--color-border)]" />
                            <div className="flex items-center justify-between flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 min-w-0">
                                    <School className="text-emerald-500 w-3.5 h-3.5 shrink-0 group-hover:scale-105 transition-transform" />
                                    <span className="text-[10px] font-black text-[var(--color-text)] group-hover:text-emerald-500 transition-colors whitespace-nowrap truncate">{selectedClass?.name}</span>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0 ml-1.5">
                                    <span className="w-px h-3 bg-[var(--color-border)]" />
                                    <span className="text-[9px] font-black text-[var(--color-text-muted)] uppercase">
                                        {reportType === 'bulanan' ? `${BULAN[selectedMonth - 1]?.id_str} ${selectedYear}` : `Sem ${selectedSemester} (${academicYear})`}
                                    </span>
                                </div>
                            </div>
                        </button>

                        {!isAcademicRaport && (
                            <>
                                <span className="w-px h-4 bg-[var(--color-border)] shrink-0 self-center" />
                                <div className="flex items-center bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-xl p-0.5 shrink-0 gap-0.5 shadow-sm h-9">
                                    {[
                                        { id: 'bulanan', label: 'Bulanan', shortLabel: 'Bulanan' },
                                        { id: 'pondok_lisan', label: 'Ujian Lisan', shortLabel: 'Lisan' },
                                        { id: 'pondok_mapel', label: 'Mapel Pondok', shortLabel: 'Mapel' }
                                    ].map(t => (
                                        <button
                                            key={t.id}
                                            disabled={loading}
                                            onClick={async () => {
                                                if (reportType === t.id) return
                                                if (hasUnsavedMemo) {
                                                    setConfirmModal({
                                                        title: 'Perubahan Belum Disimpan',
                                                        description: 'Anda memiliki perubahan nilai yang belum disimpan.',
                                                        body: (
                                                            <>
                                                                Apakah Anda yakin ingin berpindah tipe raport? Perubahan yang belum disimpan akan hilang.
                                                            </>
                                                        ),
                                                        icon: AlertTriangle,
                                                        iconBg: 'bg-red-500/10',
                                                        iconColor: 'text-red-500',
                                                        variant: 'red',
                                                        confirmLabel: 'Ya, Pindah',
                                                        confirmIcon: AlertTriangle,
                                                        onConfirm: async () => {
                                                            setConfirmModal(null)
                                                            setReportType(t.id)
                                                        }
                                                    })
                                                    return
                                                }
                                                setReportType(t.id)
                                            }}
                                            className={`px-2.5 h-full rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center justify-center ${reportType === t.id
                                                ? 'bg-indigo-600 text-white shadow-sm'
                                                : loading
                                                    ? 'text-[var(--color-text-muted)]/40 cursor-not-allowed'
                                                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                                                }`}
                                        >
                                            <span className="hidden [@media(min-width:1150px)]:inline">{t.label}</span>
                                            <span className="inline [@media(min-width:1150px)]:hidden">{t.shortLabel}</span>
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}

                        {/* Section Divider */}
                        <span className="w-px h-4 bg-[var(--color-border)] shrink-0 self-center" />

                        {/* Middle Stats Badges */}
                        <div className="flex flex-row flex-nowrap items-center gap-1.5 shrink-0">
                            {musyrif && (
                                <div className="hidden [@media(min-width:1440px)]:flex items-center gap-1.5 px-2.5 h-9 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[9px] font-black uppercase tracking-wider shrink-0" title={`Wali Kelas: ${musyrif}`}>
                                    <Users className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                    <span><span className="hidden [@media(min-width:1440px)]:inline">Wali: </span><span className="text-[var(--color-text)] font-black inline-block max-w-[80px] [@media(min-width:1440px)]:max-w-[150px] truncate align-bottom">{musyrif}</span></span>
                                </div>
                            )}

                            <div className={`flex items-center justify-center gap-1 px-1.5 [@media(min-width:1350px)]:px-2 h-9 rounded-xl border text-[9px] font-black uppercase tracking-wider transition-all duration-300 shrink-0 ${globalSaveIndicator === 'saving'
                                ? 'bg-amber-500/10 border-amber-500/20 text-amber-600 shadow-sm animate-pulse'
                                : 'bg-emerald-500/5 border-emerald-500/20 text-emerald-600'
                                }`}
                                title={globalSaveIndicator === 'saving' ? 'Sedang menyimpan data otomatis' : 'Autosave Aktif'}>
                                {globalSaveIndicator === 'saving' ? (
                                    <Loader2 className="w-3 h-3 animate-spin text-amber-600" />
                                ) : (
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                )}
                                <span>
                                    {globalSaveIndicator === 'saving' ? (
                                        <span>Menyimpan...</span>
                                    ) : (
                                        <span className="hidden [@media(min-width:1350px)]:inline">
                                            Autosave
                                        </span>
                                    )}
                                </span>
                            </div>

                            {/* Progress Bar */}
                            <div className="hidden [@media(min-width:1600px)]:flex items-center gap-2 px-2 h-9 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] w-20 shrink-0">
                                <div className="flex-1 h-1 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] overflow-hidden relative">
                                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${progressPct}%`, background: progressPct === 100 ? '#10b981' : progressPct > 50 ? '#6366f1' : '#f59e0b' }} />
                                </div>
                                <span className="text-[8px] font-black text-[var(--color-text-muted)] uppercase whitespace-nowrap">{Math.round(progressPct)}%</span>
                            </div>

                            <div className="hidden [@media(min-width:1600px)]:flex items-center gap-1 px-2 h-9 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[9px] font-black uppercase tracking-wider shrink-0" title="Statistik Ketuntasan Nilai Santri">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                <span>Tuntas: <span className="text-emerald-500 text-[10px] font-black">{classStats.completed}/{classStats.total}</span></span>
                            </div>
                        </div>
                    </div>

                    {/* Section Divider */}
                    <span className="w-px h-4 bg-[var(--color-border)] shrink-0 self-center" />

                    {/* Right Action buttons */}
                    <div className="flex items-center gap-1.5 shrink-0">
                        <button onClick={saveAll} disabled={savingAll || !canEdit} className="h-9 px-4 rounded-xl bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all flex items-center gap-1.5 relative disabled:opacity-70 shrink-0" title="Simpan Semua Nilai">
                            {savingAll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3 h-3" />}
                            <span>{savingAll ? 'Proses...' : <span>Simpan<span className="hidden [@media(min-width:1150px)]:inline"> Semua</span></span>}</span>
                            {!savingAll && hasUnsavedMemo && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-400 border border-white animate-pulse" />}
                        </button>
                        <button onClick={() => setStep(3)} className="h-9 px-4 rounded-xl bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all flex items-center justify-center gap-1.5 shrink-0" title="Preview & Cetak Raport">
                            <Printer className="w-3 h-3" />
                            <span className="hidden [@media(min-width:1150px)]:inline">Preview & Cetak</span>
                        </button>
                    </div>
                </div>

                {/* ROW 2: Search + Filters + Exports */}
                <div className="w-full flex flex-row flex-nowrap items-center justify-between gap-2.5 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden py-0.5">
                    {/* Left Group: Search Bar & Filters */}
                    <div className="flex flex-row flex-nowrap items-center gap-1.5 min-w-0 flex-1">
                        {/* Search Bar */}
                        <div className="relative flex-1 min-w-[120px] transition-all duration-300">
                            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none" />
                            <input type="text" placeholder="Cari santri..." value={studentSearch} onChange={e => setStudentSearch(e.target.value)}
                                className="h-9 w-full pl-7 pr-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[11px] font-black text-[var(--color-text)] outline-none focus:border-indigo-500/50 transition-all" />
                        </div>

                        {/* Filters */}
                        {(classStats.incomplete > 0 || noPhoneCount > 0) && (
                            <>
                                <span className="w-px h-4 bg-[var(--color-border)] shrink-0 self-center" />
                                {classStats.incomplete > 0 && (
                                    <button
                                        onClick={() => { setShowIncompleteOnly(v => !v); setShowNoPhoneOnly(false) }}
                                        className={`h-9 px-2.5 rounded-xl border text-[9px] font-black flex items-center gap-1 transition-all shrink-0 ${showIncompleteOnly
                                            ? 'bg-amber-500 text-white border-amber-500 shadow-sm shadow-amber-500/10'
                                            : 'bg-amber-500/10 border-amber-500/20 text-amber-600 hover:bg-amber-500/20'
                                            }`}
                                        title="Tampilkan santri yang nilainya belum lengkap"
                                    >
                                        <AlertTriangle className="w-3 h-3" />
                                        <span>{classStats.incomplete}<span className="hidden lg:inline"> Belum Lengkap</span></span>
                                    </button>
                                )}

                                {noPhoneCount > 0 && (
                                    <button
                                        onClick={() => { setShowNoPhoneOnly(v => !v); setShowIncompleteOnly(false) }}
                                        className={`h-9 px-2.5 rounded-xl border text-[9px] font-black flex items-center gap-1 transition-all shrink-0 ${showNoPhoneOnly
                                            ? 'bg-rose-500 text-white border-rose-500 shadow-sm shadow-rose-500/10'
                                            : 'bg-rose-500/10 border-rose-500/20 text-rose-600 hover:bg-rose-500/20'
                                            }`}
                                        title="Tampilkan santri tanpa nomor WA"
                                    >
                                        <AlertCircle className="w-3 h-3" />
                                        <span>{noPhoneCount}<span className="hidden lg:inline"> Tanpa WA</span></span>
                                    </button>
                                )}
                            </>
                        )}
                    </div>

                    {/* Section Divider */}
                    <span className="w-px h-4 bg-[var(--color-border)] shrink-0 self-center" />

                    {/* Right Group: Navigation Guide & Tool buttons */}
                    <div className="flex flex-row flex-nowrap items-center gap-2 shrink-0">
                        {/* Navigation Guide */}
                        <div className="hidden xl:flex items-center gap-1.5 px-2.5 h-9 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] shrink-0">
                            <Zap className="w-3 h-3 text-amber-500" />
                            <span className="text-[8px] font-black text-[var(--color-text-muted)] uppercase">Navigasi:</span>
                            <div className="flex items-center gap-1 ml-0.5">
                                <span className="px-1 py-0.5 rounded border border-[var(--color-border)] bg-[var(--color-surface)] text-[7px] font-bold">TAB</span>
                                <span className="text-[8px] font-bold text-[var(--color-text-muted)]">-</span>
                                <div className="flex items-center gap-0.5">
                                    <span className="px-0.5 py-0.5 rounded border border-[var(--color-border)] bg-[var(--color-surface)] text-[7px]">↑</span>
                                    <span className="px-0.5 py-0.5 rounded border border-[var(--color-border)] bg-[var(--color-surface)] text-[7px]">↓</span>
                                    <span className="px-0.5 py-0.5 rounded border border-[var(--color-border)] bg-[var(--color-surface)] text-[7px]">←</span>
                                    <span className="px-0.5 py-0.5 rounded border border-[var(--color-border)] bg-[var(--color-surface)] text-[7px]">→</span>
                                </div>
                            </div>
                        </div>

                        {/* Section Divider between Navigasi and Actions */}
                        <span className="hidden xl:inline w-px h-4 bg-[var(--color-border)] shrink-0 self-center" />

                        {/* Action Tools */}
                        <div className="flex flex-row flex-nowrap items-center gap-1.5">
                            <button
                                onClick={() => {
                                    setBulkValues({})
                                    setIsBulkModalOpen(true)
                                }}
                                className="h-9 px-2.5 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-600 text-[9px] font-black flex items-center justify-center gap-1 transition-all hover:bg-violet-500/25 flex-grow min-w-[36px] shrink-0"
                                title="Isi Massal Nilai"
                            >
                                <Sparkles className="w-3 h-3" />
                                <span className="hidden xl:inline">Isi Massal</span>
                            </button>

                            <button onClick={() => setIsExportModalOpen(true)} className="h-9 px-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 text-[9px] font-black flex items-center justify-center gap-1 transition-all hover:bg-indigo-500/20 flex-grow min-w-[36px] shrink-0" title="Export Data Raport">
                                <Download className="w-3 h-3" />
                                <span className="hidden lg:inline">Export</span>
                            </button>

                            <button onClick={() => {
                                const withPhone = students.filter(s => s.phone && isComplete(scores[s.id] || {}, criteria))
                                if (withPhone.length) {
                                    setWaBlastConfirm({ queue: withPhone })
                                } else {
                                    addToast('Belum ada santri dengan nomor WA & nilai lengkap', 'warning')
                                }
                            }} className="h-9 px-2.5 rounded-xl bg-green-500/10 border border-green-500/20 text-green-600 text-[9px] font-black flex items-center justify-center gap-1 transition-all hover:bg-green-500/20 flex-grow min-w-[36px] shrink-0" title="Blast WhatsApp Nilai">
                                <WhatsAppIcon className="w-3 h-3" /> <span className="hidden lg:inline">Blast WA</span>
                            </button>

                            <button onClick={() => setIsCopyModalOpen(true)} disabled={copyingLastMonth || !canEdit} className="h-9 px-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 text-[9px] font-black flex items-center justify-center gap-1.5 transition-all hover:bg-amber-500/20 disabled:opacity-50 flex-grow min-w-[36px] shrink-0" title="Salin Data Periode">
                                {copyingLastMonth ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Copy className="w-3.5 h-3.5" />}
                                <span className="hidden lg:inline">Salin Data</span>
                            </button>

                            <button onClick={handleResetClass} disabled={!canEdit} className="h-9 px-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 text-[9px] font-black flex items-center justify-center gap-1 transition-all hover:bg-red-500/20 disabled:opacity-50 flex-grow min-w-[36px] shrink-0" title="Reset Kelas">
                                <AlertTriangle className="w-3 h-3" />
                                <span className="hidden lg:inline">Reset Kelas</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Floating Bulk Action Bar */}
            {/* Floating Bulk Action Bar */}
            <BulkActionsBar
                selectedCount={bulkSelected.size}
                onClear={() => setBulkSelected(new Set())}
                title="Terpilih"
                subtitle="Aksi Massal"
            >
                <button 
                    onClick={async () => {
                        const selected = students.filter(s => bulkSelected.has(s.id))
                        if (!selected.length) return
                        const isBulanan = reportType === 'bulanan'
                        const hasAnyData = (sc, ex) =>
                            criteria.some(k => sc[k.key] !== '' && sc[k.key] !== null && sc[k.key] !== undefined) ||
                            [ex.berat_badan, ex.tinggi_badan, ex.ziyadah, ex.murojaah,
                            ex.hari_sakit, ex.hari_izin, ex.hari_alpa, ex.hari_pulang, ex.catatan
                            ].some(v => v !== '' && v !== null && v !== undefined)
                        const toSave = selected.filter(s => hasAnyData(scores[s.id] || {}, extras[s.id] || {}))
                        if (!toSave.length) { addToast('Santri yang dipilih belum ada yang diisi nilainya', 'warning'); return }
                        setSavingAll(true)
                        try {
                            let upserted, error
                            if (isBulanan) {
                                // ── Monthly: flat column schema
                                const payloads = toSave.map(s => {
                                    const sc = scores[s.id] || {}, ex = extras[s.id] || {}
                                    return {
                                        student_id: s.id, month: selectedMonth, year: selectedYear,
                                        musyrif_name: musyrif, updated_by: null, updated_by_name: null,
                                        ...Object.fromEntries(Object.entries(sc).map(([k, v]) => [k, v === '' ? null : Number(v)])),
                                        berat_badan: ex.berat_badan !== '' && ex.berat_badan != null ? Number(ex.berat_badan) : null,
                                        tinggi_badan: ex.tinggi_badan !== '' && ex.tinggi_badan != null ? Number(ex.tinggi_badan) : null,
                                        ziyadah: ex.ziyadah || null, murojaah: ex.murojaah || null,
                                        hari_sakit: ex.hari_sakit !== '' && ex.hari_sakit != null ? Number(ex.hari_sakit) : 0,
                                        hari_izin: ex.hari_izin !== '' && ex.hari_izin != null ? Number(ex.hari_izin) : 0,
                                        hari_alpa: ex.hari_alpa !== '' && ex.hari_alpa != null ? Number(ex.hari_alpa) : 0,
                                        hari_pulang: ex.hari_pulang !== '' && ex.hari_pulang != null ? Number(ex.hari_pulang) : 0,
                                        catatan: ex.catatan || null
                                    }
                                });
                                ({ data: upserted, error } = await supabase
                                    .from('student_monthly_reports')
                                    .upsert(payloads, { onConflict: 'student_id,month,year' })
                                    .select('id, student_id'))
                            } else {
                                // ── Semester: scores/extras JSON schema
                                const payloads = toSave.map(s => {
                                    const sc = scores[s.id] || {}, ex = extras[s.id] || {}
                                    return {
                                        student_id: s.id,
                                        report_type: reportType,
                                        semester: selectedSemester,
                                        academic_year: academicYear,
                                        musyrif_name: musyrif,
                                        updated_by: null, updated_by_name: null,
                                        scores: Object.fromEntries(
                                            Object.entries(sc).map(([k, v]) => [k, v === '' ? null : Number(v)])
                                        ),
                                        extras: {
                                            berat_badan: ex.berat_badan !== '' && ex.berat_badan != null ? Number(ex.berat_badan) : null,
                                            tinggi_badan: ex.tinggi_badan !== '' && ex.tinggi_badan != null ? Number(ex.tinggi_badan) : null,
                                            hari_sakit: ex.hari_sakit !== '' && ex.hari_sakit != null ? Number(ex.hari_sakit) : 0,
                                            hari_izin: ex.hari_izin !== '' && ex.hari_izin != null ? Number(ex.hari_izin) : 0,
                                            hari_alpa: ex.hari_alpa !== '' && ex.hari_alpa != null ? Number(ex.hari_alpa) : 0,
                                            hari_pulang: ex.hari_pulang !== '' && ex.hari_pulang != null ? Number(ex.hari_pulang) : 0,
                                            catatan: ex.catatan || null
                                        }
                                    }
                                });
                                ({ data: upserted, error } = await supabase
                                    .from('student_semester_reports')
                                    .upsert(payloads, { onConflict: 'student_id,report_type,semester,academic_year' })
                                    .select('id, student_id'))
                            }
                            if (error) throw error
                            if (upserted?.length) {
                                setSavedIds(prev => { const n = new Set(prev); toSave.forEach(s => n.add(s.id)); return n })
                            }
                            const skipped = selected.length - toSave.length
                            addToast(skipped > 0 ? `${toSave.length} disimpan, ${skipped} dilewati (kosong)` : `${toSave.length} raport tersimpan`, 'success')
                            setBulkSelected(new Set())
                        } catch (e) { addToast('Gagal simpan: ' + e.message, 'error') }
                        finally { setSavingAll(false) }
                    }}
                    disabled={savingAll}
                    className="h-10 sm:h-9 px-3 rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20 hover:bg-violet-600 hover:text-white transition-all flex items-center justify-center gap-1.5 text-[9px] font-black uppercase tracking-widest disabled:opacity-50"
                    title="Simpan Semua"
                >
                    {savingAll ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                        <Save className="w-3.5 h-3.5" />
                    )}
                    <span>Simpan Semua</span>
                </button>

                <button 
                    onClick={() => setIsBulkModalOpen(true)}
                    className="h-10 sm:h-9 px-3 rounded-xl bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20 hover:bg-fuchsia-600 hover:text-white transition-all flex items-center justify-center gap-1.5 text-[9px] font-black uppercase tracking-widest"
                    title="Isi Massal"
                >
                    <Paintbrush className="w-3.5 h-3.5" />
                    <span>Isi Massal</span>
                </button>

                <button 
                    onClick={() => {
                        const withPhone = students.filter(s => bulkSelected.has(s.id) && s.phone && isComplete(scores[s.id] || {}, criteria))
                        if (!withPhone.length) { addToast('Tidak ada santri terpilih dengan WA & nilai lengkap', 'warning'); return }
                        setWaBlastConfirm({ queue: withPhone })
                    }}
                    className="h-10 sm:h-9 px-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-600 hover:text-white transition-all flex items-center justify-center gap-1.5 text-[9px] font-black uppercase tracking-widest"
                    title="WA Blast"
                >
                    <WhatsAppIcon className="w-3.5 h-3.5" />
                    <span>WA Blast</span>
                </button>

                <button 
                    onClick={() => {
                        const toExport = students.filter(s => bulkSelected.has(s.id) && isComplete(scores[s.id] || {}, criteria))
                        if (!toExport.length) { addToast('Tidak ada santri terpilih dengan nilai lengkap', 'warning'); return }
                        runZipBlast(toExport, null)
                    }}
                    disabled={savingAll}
                    className="h-10 sm:h-9 px-3 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center gap-1.5 text-[9px] font-black uppercase tracking-widest disabled:opacity-50"
                    title="Export ZIP"
                >
                    <FolderArchive className="w-3.5 h-3.5" />
                    <span>Export ZIP</span>
                </button>
            </BulkActionsBar>

                <Modal
                    isOpen={isBulkModalOpen}
                    onClose={() => setIsBulkModalOpen(false)}
                    title="Isi Massal Nilai"
                    description="Berlaku hanya untuk kolom nilai yang masih kosong."
                    icon={Sparkles}
                    iconBg="bg-violet-500/10"
                    iconColor="text-violet-600"
                    size="md"
                    footer={
                        <div className="flex items-center justify-between w-full">
                            <button
                                onClick={() => setIsBulkModalOpen(false)}
                                className="h-9 px-4 rounded-xl border border-[var(--color-border)] text-[10px] font-black text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] transition-all"
                            >
                                Batal
                            </button>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => {
                                        setBulkValues({})
                                    }}
                                    className="h-9 px-4 rounded-xl border border-[var(--color-border)] text-[10px] font-black text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] transition-all"
                                >
                                    Reset Input
                                </button>
                                <button
                                    onClick={() => {
                                        const keys = Object.keys(bulkValues).filter(k => bulkValues[k] !== '')
                                        if (!keys.length) { addToast('Isi minimal satu kolom data', 'warning'); return }

                                        const targetStudents = bulkSelected.size > 0
                                            ? students.filter(s => bulkSelected.has(s.id))
                                            : students;

                                        const scoreKeys = ['nilai_akhlak', 'nilai_ibadah', 'nilai_kebersihan', 'nilai_quran', 'nilai_bahasa']
                                        const extraKeys = ['berat_badan', 'tinggi_badan', 'hari_sakit', 'hari_izin', 'hari_alpa', 'hari_pulang', 'ziyadah', 'murojaah', 'catatan']

                                        const activeScoreKeys = keys.filter(k => scoreKeys.includes(k))
                                        const activeExtraKeys = keys.filter(k => extraKeys.includes(k))

                                        const changedIds = targetStudents
                                            .filter(s => {
                                                const curScores = scores[s.id] || {}
                                                const curExtras = extras[s.id] || {}
                                                const hasEmptyScore = activeScoreKeys.some(k => curScores[k] === '' || curScores[k] === null || curScores[k] === undefined)
                                                const hasEmptyExtra = activeExtraKeys.some(k => curExtras[k] === '' || curExtras[k] === null || curExtras[k] === undefined)
                                                return hasEmptyScore || hasEmptyExtra
                                            })
                                            .map(s => s.id)

                                        if (!changedIds.length) {
                                            addToast('Semua kolom target sudah memiliki nilai/data', 'warning')
                                            return
                                        }

                                        if (activeScoreKeys.length) {
                                            setScores(prev => {
                                                const next = { ...prev }
                                                for (const s of targetStudents) {
                                                    const cur = next[s.id] || {}
                                                    const updated = { ...cur }
                                                    let changed = false
                                                    for (const k of activeScoreKeys) {
                                                        if (cur[k] === '' || cur[k] === null || cur[k] === undefined) {
                                                            updated[k] = bulkValues[k]; changed = true
                                                        }
                                                    }
                                                    if (changed) next[s.id] = updated
                                                }
                                                return next
                                            })
                                        }

                                        if (activeExtraKeys.length) {
                                            setExtras(prev => {
                                                const next = { ...prev }
                                                for (const s of targetStudents) {
                                                    const cur = next[s.id] || {}
                                                    const updated = { ...cur }
                                                    let changed = false
                                                    for (const k of activeExtraKeys) {
                                                        if (cur[k] === '' || cur[k] === null || cur[k] === undefined) {
                                                            updated[k] = bulkValues[k]; changed = true
                                                        }
                                                    }
                                                    if (changed) next[s.id] = updated
                                                }
                                                return next
                                            })
                                        }

                                        changedIds.forEach(id => {
                                            setSavedIds(p => { const n = new Set(p); n.delete(id); return n })
                                            triggerAutoSave(id)
                                        })

                                        addToast(`Berhasil diterapkan ke ${changedIds.length} santri`, 'success')
                                        setIsBulkModalOpen(false)
                                    }}
                                    className="h-9 px-5 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-md shadow-[var(--color-primary)]/10"
                                >
                                    <Check className="w-3.5 h-3.5" />
                                    Terapkan Data
                                </button>
                            </div>
                        </div>
                    }
                >
                    <div className="space-y-5">
                        <div className="p-3 rounded-xl bg-slate-500/5 border border-[var(--color-border)]/50 text-[10px] text-[var(--color-text-muted)] font-bold">
                            {bulkSelected.size > 0 ? (
                                <span>
                                    Data massal akan diterapkan ke <span className="font-black text-violet-600">{bulkSelected.size} santri terpilih</span> yang kolom nilainya masih kosong.
                                </span>
                            ) : (
                                <span>
                                    Data massal akan diterapkan ke <span className="font-black text-[var(--color-text)]">semua ({students.length}) santri</span> di kelas ini yang kolom nilainya masih kosong.
                                </span>
                            )}
                        </div>

                        {/* Section 1: Nilai Akademik */}
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-2">Nilai Akademik</p>
                            <div className="grid grid-cols-5 gap-2">
                                {criteria.map(k => (
                                    <div key={k.key} className="flex flex-col gap-1 flex-1 min-w-0">
                                        <span className="text-[8px] font-black uppercase tracking-tight text-center truncate" style={{ color: k.color }}>
                                            {k.id}
                                        </span>
                                        <div className="relative rounded-xl overflow-hidden border transition-all duration-200"
                                            style={{
                                                borderColor: bulkValues[k.key] !== '' && bulkValues[k.key] != null ? k.color : 'var(--color-border)',
                                                boxShadow: bulkValues[k.key] !== '' && bulkValues[k.key] != null ? `${k.color}15 0 0 0 2px` : 'none'
                                            }}>
                                            <input
                                                type="number"
                                                min={0}
                                                max={maxScore}
                                                placeholder="—"
                                                value={bulkValues[k.key] ?? ''}
                                                onChange={e => setBulkValues(prev => ({
                                                    ...prev,
                                                    [k.key]: e.target.value === '' ? '' : Math.min(maxScore, Math.max(0, Number(e.target.value)))
                                                }))}
                                                className="w-full h-10 text-center text-sm font-black bg-[var(--color-surface)] outline-none transition-all appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                style={{
                                                    color: bulkValues[k.key] !== '' && bulkValues[k.key] != null ? k.color : 'var(--color-text-muted)'
                                                }}
                                            />
                                            <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: k.color }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Section 2: Fisik & Kehadiran */}
                        {(rtObj.hasFisik || rtObj.hasAttendance) && (
                            <div>
                                <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-2">Fisik & Kehadiran</p>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {[
                                        ...(rtObj.hasFisik ? [
                                            { key: 'berat_badan', label: 'Berat Badan', unit: 'kg', icon: Scale, color: '#6366f1' },
                                            { key: 'tinggi_badan', label: 'Tinggi Badan', unit: 'cm', icon: Ruler, color: '#06b6d4' }
                                        ] : []),
                                        ...(rtObj.hasAttendance ? [
                                            { key: 'hari_sakit', label: 'Sakit', unit: 'hari', icon: HeartPulse, color: '#ef4444' },
                                            { key: 'hari_izin', label: 'Izin', unit: 'hari', icon: AlertCircle, color: '#f59e0b' },
                                            { key: 'hari_alpa', label: 'Alpa', unit: 'hari', icon: AlertCircle, color: '#ef4444' },
                                            { key: 'hari_pulang', label: 'Pulang', unit: 'kali', icon: DoorOpen, color: '#8b5cf6' }
                                        ] : [])
                                    ].map(f => (
                                        <div key={f.key} className="flex flex-col gap-1 min-w-0">
                                            <span className="text-[8px] font-black uppercase tracking-tight text-[var(--color-text-muted)]">
                                                {f.label}
                                            </span>
                                            <div className="flex items-center gap-1 rounded-xl border border-[var(--color-border)] overflow-hidden bg-[var(--color-surface-alt)] focus-within:border-violet-500 focus-within:ring-2 focus-within:ring-violet-500/10 transition-all" style={{ height: 38 }}>
                                                <div className="w-8 h-full flex items-center justify-center shrink-0" style={{ background: f.color + '18' }}>
                                                    {(() => { const Icon = f.icon; return <Icon style={{ color: f.color }} className="w-3 h-3" /> })()}
                                                </div>
                                                <input
                                                    type="number"
                                                    min={0}
                                                    placeholder="—"
                                                    value={bulkValues[f.key] ?? ''}
                                                    onChange={e => setBulkValues(prev => ({
                                                        ...prev,
                                                        [f.key]: e.target.value === '' ? '' : Math.max(0, Number(e.target.value))
                                                    }))}
                                                    className="flex-1 w-0 h-full text-[11px] font-bold text-left px-2 bg-transparent text-[var(--color-text)] outline-none appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                />
                                                <span className="text-[8px] font-black text-[var(--color-text-muted)] pr-2.5 opacity-65 uppercase">{f.unit}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Section 3: Hafalan & Catatan */}
                        {(rtObj.hasHafalan || rtObj.hasCatatan) && (
                            <div>
                                <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-2">Hafalan & Catatan</p>
                                <div className="space-y-2.5">
                                    {rtObj.hasHafalan && (
                                        <div className="grid grid-cols-2 gap-2">
                                            {[
                                                { key: 'ziyadah', label: 'Ziyadah (Target Hafalan)', icon: BookOpen, color: '#10b981' },
                                                { key: 'murojaah', label: "Muroja'ah (Lancar)", icon: FileText, color: '#8b5cf6' }
                                            ].map(f => (
                                                <div key={f.key} className="flex flex-col gap-1 min-w-0">
                                                    <span className="text-[8px] font-black uppercase tracking-tight text-[var(--color-text-muted)]">
                                                        {f.label}
                                                    </span>
                                                    <div className="flex items-center gap-1 rounded-xl border border-[var(--color-border)] overflow-hidden bg-[var(--color-surface-alt)] focus-within:border-violet-500 focus-within:ring-2 focus-within:ring-violet-500/10 transition-all" style={{ height: 38 }}>
                                                        <div className="w-8 h-full flex items-center justify-center shrink-0" style={{ background: f.color + '18' }}>
                                                            {(() => { const Icon = f.icon; return <Icon style={{ color: f.color }} className="w-3 h-3" /> })()}
                                                        </div>
                                                        <input
                                                            type="text"
                                                            placeholder="—"
                                                            value={bulkValues[f.key] ?? ''}
                                                            onChange={e => setBulkValues(prev => ({
                                                                ...prev,
                                                                [f.key]: e.target.value
                                                            }))}
                                                            className="flex-1 w-0 h-full px-2 text-[11px] font-bold bg-transparent text-[var(--color-text)] outline-none"
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {rtObj.hasCatatan && (
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[8px] font-black uppercase tracking-tight text-[var(--color-text-muted)]">
                                                Catatan Perkembangan
                                            </span>
                                            <div className="flex rounded-xl border border-[var(--color-border)] overflow-hidden bg-[var(--color-surface-alt)] focus-within:border-violet-500 focus-within:ring-2 focus-within:ring-violet-500/10 transition-all">
                                                <div className="w-8 shrink-0 flex items-center justify-center border-r border-[var(--color-border)]/50" style={{ background: '#f59e0b12' }}>
                                                    <ClipboardList style={{ color: "#f59e0b" }} className="w-3 h-3" />
                                                </div>
                                                <textarea
                                                    rows={2}
                                                    placeholder="Tulis catatan yang ingin diterapkan secara massal..."
                                                    value={bulkValues.catatan ?? ''}
                                                    onChange={e => setBulkValues(prev => ({
                                                        ...prev,
                                                        catatan: e.target.value
                                                    }))}
                                                    className="flex-1 w-0 px-2.5 py-2 text-[11px] font-medium bg-transparent text-[var(--color-text)] outline-none resize-none leading-normal"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </Modal>

                {/* Desktop Table View */}
                <div className="hidden md:block">
                    {loading ? (
                        <DesktopSkeleton criteria={criteria} />
                    ) : filteredStudents.length === 0 ? (
                        <div className="py-10 flex items-center justify-center rounded-xl border border-dashed border-[var(--color-border)]">
                            <EmptyState
                                icon={Users}
                                variant="plain"
                                title={showIncompleteOnly ? 'Semua nilai sudah lengkap! 🎉' : 'Santri tidak ditemukan'}
                                description={showIncompleteOnly ? 'Tidak ada santri yang nilainya belum diisi.' : 'Coba kata kunci lain atau hapus filter.'}
                                action={
                                    <button onClick={() => { setShowIncompleteOnly(false); setShowNoPhoneOnly(false); setStudentSearch('') }}
                                        className="h-9 px-5 rounded-xl border border-[var(--color-border)] text-[11px] font-black hover:bg-[var(--color-surface-alt)] transition-all bg-[var(--color-surface)] text-[var(--color-text)] cursor-pointer">
                                        Tampilkan Semua
                                    </button>
                                }
                            />
                        </div>
                    ) : (
                        <div
                            ref={tableScrollRef}
                            className="overflow-x-auto rounded-xl border border-[var(--color-border)] fade-in animate-in duration-300"
                            style={{ maxHeight: 'calc(100vh - 140px)', overflowY: 'auto', overflowAnchor: 'none' }}
                        >
                            <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 910, tableLayout: 'fixed' }}>
                                <colgroup>
                                    <col style={{ width: 36 }} />
                                    <col style={{ width: 140 }} />
                                    {criteria.map(k => <col key={k.key} style={{ width: 54 }} />)}
                                    {(rtObj.hasFisik || rtObj.hasAttendance) && <col style={{ width: 170 }} />}
                                    {(rtObj.hasHafalan || rtObj.hasCatatan) && <col style={{ width: 160 }} />}
                                    <col style={{ width: 130 }} />
                                </colgroup>
                                <thead className="sticky top-0 z-20">
                                    <tr style={{ background: 'none' }}>
                                        <th style={{ padding: '10px 8px', textAlign: 'center', verticalAlign: 'middle', background: 'var(--color-surface-alt)', boxShadow: 'inset 0 -1px 0 var(--color-border)' }}>
                                            <input type="checkbox"
                                                checked={bulkSelected.size === filteredStudents.length && filteredStudents.length > 0}
                                                onChange={e => setBulkSelected(e.target.checked ? new Set(filteredStudents.map(s => s.id)) : new Set())}
                                                aria-label="Pilih semua"
                                                className="w-3.5 h-3.5 accent-violet-500 cursor-pointer"
                                            />
                                        </th>
                                        <th className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] sticky left-0 z-10" style={{ background: 'var(--color-surface-alt)', padding: '10px 0', textAlign: 'center', verticalAlign: 'middle', borderRight: '1px solid var(--color-border)', boxShadow: 'inset 0 -1px 0 var(--color-border)' }}>Santri</th>
                                        {criteria.map(k => (
                                            <th key={k.key} title={k.id} style={{ padding: '8px 2px', textAlign: 'center', verticalAlign: 'middle', background: 'var(--color-surface-alt)', boxShadow: 'inset 0 -1px 0 var(--color-border)' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minWidth: 0, overflow: 'hidden' }}>
                                                    <span style={{
                                                        fontSize: 9.5,
                                                        fontWeight: 900,
                                                        color: 'var(--color-text-muted)',
                                                        lineHeight: 1.2,
                                                        whiteSpace: 'nowrap',
                                                        textAlign: 'center',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        width: '100%',
                                                        textTransform: 'uppercase',
                                                        letterSpacing: '0.5px'
                                                    }}>
                                                        {k.id}
                                                    </span>
                                                </div>
                                            </th>
                                        ))}
                                        {(rtObj.hasFisik || rtObj.hasAttendance) && (
                                            <th style={{ padding: '10px 8px', textAlign: 'center', verticalAlign: 'middle', background: 'var(--color-surface-alt)', boxShadow: 'inset 0 -1px 0 var(--color-border)' }}>
                                                <span style={{ fontSize: 10, fontWeight: 900, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>
                                                    {rtObj.hasFisik && rtObj.hasAttendance ? 'Fisik & Kehadiran' : rtObj.hasFisik ? 'Fisik' : 'Kehadiran'}
                                                </span>
                                            </th>
                                        )}
                                        {(rtObj.hasHafalan || rtObj.hasCatatan) && (
                                            <th style={{ padding: '10px 8px', textAlign: 'center', verticalAlign: 'middle', background: 'var(--color-surface-alt)', boxShadow: 'inset 0 -1px 0 var(--color-border)' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                                                    <span style={{ fontSize: 10, fontWeight: 900, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>
                                                        {rtObj.hasHafalan && rtObj.hasCatatan ? 'Hafalan & Catatan' : rtObj.hasHafalan ? 'Hafalan' : 'Catatan'}
                                                    </span>
                                                </div>
                                            </th>
                                        )}
                                        <th className="sticky right-0 z-10" style={{ padding: '10px 8px', textAlign: 'center', verticalAlign: 'middle', fontSize: 10, fontWeight: 900, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 1, background: 'var(--color-surface-alt)', borderLeft: '1px solid var(--color-border)', borderRight: '1px solid var(--color-border)', boxShadow: 'inset 0 -1px 0 var(--color-border)' }}>Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredStudents.length > 20 && visibleRange.start > 0 && (
                                        <tr style={{ height: visibleRange.start * ROW_HEIGHT }}><td colSpan={99} /></tr>
                                    )}
                                    {(filteredStudents.length > 20
                                        ? filteredStudents.slice(visibleRange.start, visibleRange.end)
                                        : filteredStudents
                                    ).map((student, _vi) => {
                                        const si = filteredStudents.length > 20 ? visibleRange.start + _vi : _vi
                                        const sc = scores[student.id] || {}, ex = extras[student.id] || {}
                                        return (
                                            <StudentRow key={student.id}
                                                student={student} si={si} sc={sc} ex={ex}
                                                isSaved={savedIds.has(student.id)}
                                                isSaving={!!saving[student.id]}
                                                isDirty={!savedIds.has(student.id) && (criteria.some(k => sc[k.key] !== '' && sc[k.key] !== null) || Object.values(ex).some(v => v !== '' && v !== null))}
                                                isChecked={bulkSelected.has(student.id)}
                                                bulkMode={true} lang={lang}
                                                criteria={criteria}
                                                maxScore={maxScore}
                                                reportType={reportType}
                                                classLevel={classLevel}
                                                trendData={studentTrend[student.id]}
                                                prevScores={prevMonthScores[student.id]}
                                                templateOpen={templateOpenId === student.id}
                                                catatanArab={catatanArabMap[student.id]}
                                                sendingWAStatus={sendingWA[student.id]}
                                                onScoreChange={handleScoreChange}
                                                onExtraChange={handleExtraChange}
                                                onCatatanChange={handleCatatanChange}
                                                onSave={saveStudent}
                                                onWA={generateAndSendWA}
                                                onPDF={handlePDF}
                                                onReset={handleResetStudent}
                                                onBulkToggle={handleBulkToggle}
                                                onKeyDown={handleKeyDown}
                                                onTemplateToggle={handleTemplateToggle}
                                                onTemplateApply={handleTemplateApply}
                                                onTranslitToggle={handleTranslitToggle}
                                                cellRefs={cellRefs}
                                                generateAutoComment={generateAutoComment}
                                            />
                                        )
                                    })}
                                    {filteredStudents.length > 20 && visibleRange.end < filteredStudents.length && (
                                        <tr style={{ height: (filteredStudents.length - visibleRange.end) * ROW_HEIGHT }}><td colSpan={99} /></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden">
                    {loading ? (
                        <MobileSkeleton />
                    ) : filteredStudents.length === 0 ? (
                        <div className="p-4">
                            <EmptyState
                                icon={showIncompleteOnly ? CheckCircle2 : showNoPhoneOnly ? CheckCircle2 : Search}
                                title={showIncompleteOnly ? 'Semua nilai sudah lengkap! 🎉' : showNoPhoneOnly ? 'Semua santri sudah ada nomor WA ✓' : 'Santri tidak ditemukan'}
                                description={showIncompleteOnly ? 'Tidak ada santri yang nilainya belum diisi.' : showNoPhoneOnly ? 'Tidak ada santri tanpa nomor WA.' : 'Coba kata kunci lain atau hapus filter.'}
                                action={
                                    <button onClick={() => { setShowIncompleteOnly(false); setShowNoPhoneOnly(false); setStudentSearch('') }} className="h-8 px-4 rounded-xl border border-[var(--color-border)] text-[11px] font-black hover:bg-[var(--color-surface-alt)] transition-all bg-[var(--color-surface)] text-[var(--color-text)]">Tampilkan Semua</button>
                                }
                            />
                        </div>
                    ) : (() => {
                        const safeIdx = Math.min(mobileActiveIdx, filteredStudents.length - 1)
                        const student = filteredStudents[safeIdx]
                        if (!student) return null
                        const sc = scores[student.id] || {}, ex = extras[student.id] || {}
                        const avg = calcAvg(sc, criteria), isSaved = savedIds.has(student.id), isSaving = saving[student.id]
                        const isDirty = !isSaved && criteria.some(k => sc[k.key] !== '' && sc[k.key] !== null && sc[k.key] !== undefined)
                        const complete = isComplete(sc, criteria)
                        const goTo = (idx) => setMobileActiveIdx(Math.max(0, Math.min(filteredStudents.length - 1, idx)))
                        let _touchStartX = 0
                        const onTouchStart = (e) => { _touchStartX = e.touches[0].clientX }
                        const onTouchEnd = (e) => { const dx = e.changedTouches[0].clientX - _touchStartX; if (dx < -50) goTo(safeIdx + 1); else if (dx > 50) goTo(safeIdx - 1) }
                        return (
                            <div className="fade-in animate-in duration-300">
                                {/* Card dengan swipe gesture */}
                                <div className="rounded-2xl border bg-[var(--color-surface)] overflow-hidden transition-all"
                                    style={{ borderColor: complete ? '#10b98130' : isDirty ? '#f59e0b30' : 'var(--color-border)' }}
                                    onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
                                    {/* Sticky Header inside Card */}
                                    <div className="sticky top-0 z-10 flex items-center gap-2 px-3 py-2.5 border-b bg-[var(--color-surface)] transition-all"
                                        style={{ borderColor: complete ? '#10b98130' : 'var(--color-border)' }}>
                                        <input type="checkbox" checked={bulkSelected.has(student.id)}
                                            onChange={e => setBulkSelected(prev => { const n = new Set(prev); e.target.checked ? n.add(student.id) : n.delete(student.id); return n })}
                                            className="w-4 h-4 accent-violet-500 shrink-0 cursor-pointer" />
                                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text-muted)] shrink-0">{safeIdx + 1}/{filteredStudents.length}</span>
                                        <RadarChart scores={sc} size={30} />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[12px] font-black text-[var(--color-text)] truncate">{student.name}</p>
                                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                                {avg ? (
                                                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md" style={{ background: getGrade(Number(avg)).bg, color: getGrade(Number(avg)).uiColor }}>
                                                        {avg} — {getGrade(Number(avg)).id}
                                                    </span>
                                                ) : (
                                                    <span className="text-[8px] text-[var(--color-text-muted)]">Belum diisi</span>
                                                )}
                                                {isSaving && <Loader2 className="w-3 h-3 text-amber-500 animate-spin" />}
                                                {!isSaving && isDirty && <span className="text-[7px] font-black text-amber-500">● belum simpan</span>}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <button onClick={() => openStudentDetailDrawer(student)}
                                                title="Histori semua raport santri ini"
                                                className="h-8 w-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 flex items-center justify-center hover:bg-indigo-500/20 transition-all">
                                                <TrendingUp className="w-3 h-3" />
                                            </button>
                                            <button onClick={() => saveStudent(student.id)} disabled={isSaving || !canEdit}
                                                className="h-8 px-2 rounded-xl text-[10px] font-black flex items-center gap-1 shrink-0 transition-all"
                                                style={{ background: isSaved ? '#10b98115' : isDirty ? '#6366f115' : 'var(--color-surface-alt)', color: isSaved ? '#10b981' : isDirty ? '#6366f1' : 'var(--color-text-muted)', border: `1px solid ${isSaved ? '#10b98130' : isDirty ? '#6366f130' : 'var(--color-border)'}` }}>
                                                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : isSaved ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Save className="w-3.5 h-3.5" />}
                                            </button>
                                        </div>
                                    </div>
                                    {/* Body */}
                                    <div className="px-4 py-3 space-y-3">
                                        <div>
                                            <p className="text-[8px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1.5">Nilai Kriteria</p>
                                            <div className="grid grid-cols-5 gap-1.5">
                                                {criteria.map(k => (
                                                    <div key={k.key} className="flex flex-col items-center gap-0.5">
                                                        <span className="text-[7px] font-black uppercase tracking-wide" style={{ color: k.color }}>{k.id.slice(0, 3)}</span>
                                                        <input type="number" inputMode="decimal" min={0} max={maxScore} placeholder="—"
                                                            value={sc[k.key] ?? ''}
                                                            onChange={e => { const v = e.target.value === '' ? '' : Math.min(maxScore, Math.max(0, Number(e.target.value))); setScores(prev => ({ ...prev, [student.id]: { ...prev[student.id], [k.key]: v } })); setSavedIds(prev => { const n = new Set(prev); n.delete(student.id); return n }); triggerAutoSave(student.id) }}
                                                            className="w-full h-10 text-center text-base font-black rounded-xl outline-none transition-all appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                            style={{ background: sc[k.key] !== '' && sc[k.key] != null ? getGrade(Number(sc[k.key])).bg : 'var(--color-surface-alt)', color: sc[k.key] !== '' && sc[k.key] != null ? getGrade(Number(sc[k.key])).uiColor : 'var(--color-text-muted)', border: `2px solid ${sc[k.key] !== '' && sc[k.key] != null ? getGrade(Number(sc[k.key])).border : 'var(--color-border)'}` }} />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        {(rtObj.hasFisik || rtObj.hasAttendance) && (
                                            <div>
                                                <p className="text-[8px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1.5 flex justify-between items-center">
                                                    <span>{rtObj.hasFisik && rtObj.hasAttendance ? 'Fisik & Kehadiran' : rtObj.hasFisik ? 'Kondisi Fisik' : 'Ketidakhadiran'}</span>
                                                </p>
                                                <div className="grid grid-cols-2 gap-1.5">
                                                    {[
                                                        ...(rtObj.hasFisik ? [
                                                            { key: 'berat_badan', label: 'Berat Badan', icon: Scale, color: '#6366f1', unit: 'kg' },
                                                            { key: 'tinggi_badan', label: 'Tinggi Badan', icon: Ruler, color: '#06b6d4', unit: 'cm' }
                                                        ] : []),
                                                        ...(rtObj.hasAttendance ? [
                                                            { key: 'hari_sakit', label: 'Sakit', icon: HeartPulse, color: '#ef4444', unit: 'hr' },
                                                            { key: 'hari_izin', label: 'Izin', icon: AlertCircle, color: '#f59e0b', unit: 'hr' },
                                                            { key: 'hari_alpa', label: 'Alpa', icon: AlertCircle, color: '#ef4444', unit: 'hr' },
                                                            { key: 'hari_pulang', label: 'Pulang', icon: DoorOpen, color: '#8b5cf6', unit: 'x' }
                                                        ] : [])
                                                    ].map(f => (
                                                        <div key={f.key} className="flex items-center gap-1 rounded-lg border border-[var(--color-border)] overflow-hidden bg-[var(--color-surface-alt)]" style={{ height: 32 }}>
                                                            <div className="w-7 h-full flex items-center justify-center shrink-0" style={{ background: f.color + '18' }}>{(() => { const Icon = f.icon; return <Icon style={{ color: f.color }} className="w-3 h-3" /> })()}</div>
                                                            <ExtraInput type="text" inputMode="decimal" placeholder={f.label} value={ex[f.key] ?? ''} studentId={student.id} fieldKey={f.key} onCommit={handleExtraChange}
                                                                className="flex-1 w-0 h-full text-[11px] font-black text-left px-1.5 bg-transparent text-[var(--color-text)] outline-none" />
                                                            <span className="text-[7px] font-black text-[var(--color-text-muted)] pr-1.5 opacity-60 uppercase">{f.unit}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {rtObj.hasHafalan && (
                                            <div className="grid grid-cols-2 gap-1.5">
                                                {[{ key: 'ziyadah', ph: 'Ziyadah', icon: BookOpen, color: '#10b981' }, { key: 'murojaah', ph: "Muroja'ah", icon: FileText, color: '#8b5cf6' }].map(f => (
                                                    <div key={f.key} className="flex items-center gap-1 rounded-lg border border-[var(--color-border)]" style={{ height: 32 }}>
                                                        <div className="w-7 h-full flex items-center justify-center shrink-0 rounded-l-[7px]" style={{ background: f.color + '18' }}>{(() => { const Icon = f.icon; return <Icon style={{ color: f.color }} className="w-3 h-3" /> })()}</div>
                                                        <ExtraInput placeholder={f.ph} value={ex[f.key] ?? ''} studentId={student.id} fieldKey={f.key} onCommit={handleExtraChange}
                                                            className="flex-1 w-0 h-full px-1.5 text-[11px] font-bold bg-transparent text-[var(--color-text)] outline-none" />
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {rtObj.hasCatatan && (
                                            <div className="flex rounded-lg border border-[var(--color-border)] overflow-hidden">
                                                <div className="w-7 shrink-0 flex items-start justify-center pt-2" style={{ background: '#f59e0b18' }}><ClipboardList style={{ color: "#f59e0b" }} className="w-3 h-3" /></div>
                                                <ExtraTextarea placeholder="Catatan musyrif..." value={ex.catatan ?? ''} studentId={student.id} fieldKey="catatan" onCommit={handleCatatanChange}
                                                    maxLength={200} rows={2} className="flex-1 w-0 px-2 py-1.5 text-[11px] bg-transparent text-[var(--color-text)] outline-none resize-none leading-tight" />
                                                <button
                                                    onClick={() => { const c = generateAutoComment(sc, student.id, studentTrend[student.id], criteria, reportType, classLevel); if (!c) return; setExtras(prev => ({ ...prev, [student.id]: { ...prev[student.id], catatan: c } })); setSavedIds(prev => { const n = new Set(prev); n.delete(student.id); return n }); triggerAutoSave(student.id) }}
                                                    title="Generate komentar otomatis" disabled={!avg}
                                                    className="shrink-0 w-8 flex items-center justify-center text-amber-500 hover:text-amber-600 hover:bg-amber-500/10 transition-all disabled:opacity-30" aria-label="Generate komentar otomatis">
                                                    <Zap className="w-3 h-3" />
                                                </button>
                                            </div>
                                        )}
                                        <div className="flex gap-2 pt-1">
                                            <button onClick={() => { setPreviewStudentId(student.id); setStep(3) }} className="flex-1 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 text-[11px] font-black flex items-center justify-center gap-1.5 hover:bg-indigo-500/20 transition-all"><FileText className="w-3 h-3" /> PDF</button>
                                            <button onClick={() => generateAndSendWA(student)} disabled={!student.phone}
                                                className={`flex-1 h-9 rounded-xl border text-[11px] font-black flex items-center justify-center gap-1.5 transition-all ${!student.phone ? 'opacity-30 cursor-not-allowed bg-[var(--color-surface-alt)] border-[var(--color-border)] text-[var(--color-text-muted)]' : 'bg-green-500/10 border-green-500/20 text-green-600 hover:bg-green-500/20'}`}>
                                                <WhatsAppIcon className="w-3 h-3" /> WA
                                            </button>
                                            <button onClick={() => handleResetStudent(student)}
                                                className="h-9 w-9 rounded-xl border border-dashed border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-red-500 hover:border-red-500/30 flex items-center justify-center transition-all">
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Prominent prev/next navigation */}
                                <div className="flex gap-2 mt-3">
                                    <button onClick={() => goTo(safeIdx - 1)} disabled={safeIdx === 0}
                                        className="flex-1 h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] text-[11px] font-black flex items-center justify-center gap-2 hover:bg-[var(--color-surface)] hover:text-[var(--color-text)] disabled:opacity-30 transition-all">
                                        <ChevronLeft className="w-3.5 h-3.5" /> Sebelumnya
                                    </button>
                                    <div className="flex items-center gap-1 px-1">
                                        {filteredStudents.length <= 9
                                            ? filteredStudents.map((_, i) => (
                                                <button key={i} onClick={() => goTo(i)} className="rounded-full transition-all"
                                                    style={{ width: i === safeIdx ? 10 : 6, height: i === safeIdx ? 10 : 6, background: i === safeIdx ? 'var(--color-primary)' : 'var(--color-border)' }} />
                                            ))
                                            : <span className="text-[9px] font-black text-[var(--color-text-muted)] whitespace-nowrap">{safeIdx + 1}/{filteredStudents.length}</span>
                                        }
                                    </div>
                                    <button onClick={() => goTo(safeIdx + 1)} disabled={safeIdx === filteredStudents.length - 1}
                                        className="flex-1 h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] text-[11px] font-black flex items-center justify-center gap-2 hover:bg-[var(--color-surface)] hover:text-[var(--color-text)] disabled:opacity-30 transition-all">
                                        Berikutnya <ChevronRight className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        )
                    })()}
                </div>

                {/* Averages display */}
                <div className="hidden md:grid grid-cols-5 gap-2">
                    {classStats.criteriaAverages.map(k => {
                        const avg = k.average
                        const g = avg !== '—' ? getGrade(Number(avg)) : null
                        return (
                            <div key={k.key} className="p-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-center">
                                <div className="text-[8px] font-black uppercase tracking-widest mb-1" style={{ color: k.color }}>
                                    {k.id}
                                </div>
                                <div className="text-lg font-black" style={{ color: g?.uiColor || 'var(--color-text-muted)' }}>
                                    {avg}
                                </div>
                                <div className="text-[7px] font-bold text-[var(--color-text-muted)]">
                                    Rata - Rata Kelas
                                </div>
                            </div>
                        )
                    })}
                </div>

                <CopyDataModal
                    isOpen={isCopyModalOpen}
                    onClose={() => setIsCopyModalOpen(false)}
                    students={students}
                    scores={scores}
                    extras={extras}
                    currentMonth={selectedMonth}
                    currentYear={selectedYear}
                    copyFromLastMonth={copyFromLastMonth}
                    maxScore={maxScore}
                />
        </div>
    )
}
