import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
    AlertCircle,
    Archive,
    ArrowLeft,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    ClipboardList,
    Download,
    Maximize2,
    Minus,
    PieChart,
    Plus,
    Printer,
    RefreshCw,
    Search,
    Sliders,
    Table,
    Trash2,
    Users,
    X,
} from 'lucide-react'

import { EmptyState, Skeleton } from '@shared/components'
import RaportPrintCard from './RaportPrintCard'

import { BULAN, FISIK_FIELDS, HAFALAN_FIELDS } from '@utils/reports/raportConstants'
import { RAPORT_TYPES, getClassLevel, getGradePredicate } from '@features/raport/utils/raportTypeRegistry'

const WhatsAppIcon = (props) => (
    <svg viewBox="0 0 448 512" fill="currentColor" {...props}>
        <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7 .9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z" />
    </svg>
)

/* ------------------------------------------------------------------ */
/* constants & helpers                                                 */
/* ------------------------------------------------------------------ */

const PAGE_STEP = 12
const ZOOM_STEP = 0.1
const ZOOM_MIN = 0.4
const ZOOM_MAX = 1.2

const EMPTY_FILTER = { classId: '', year: '', month: '', semester: '', academic_year: '' }

const STATUS_OPTIONS = [
    { id: 'all', label: 'Semua' },
    { id: 'complete', label: 'Lengkap' },
    { id: 'incomplete', label: 'Belum lengkap' },
]

const SORT_OPTIONS = [
    { id: 'newest', label: 'Terbaru' },
    { id: 'oldest', label: 'Terlama' },
    { id: 'name', label: 'Nama kelas' },
    { id: 'progress', label: 'Kelengkapan' },
]

const inputCls =
    'h-10 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-xs font-bold text-[var(--color-text)] outline-none focus:border-indigo-500/50 transition-colors'

const iconBtnCls =
    'w-9 h-9 rounded-xl border border-[var(--color-border)] hover:bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] flex items-center justify-center transition-colors disabled:opacity-40 disabled:pointer-events-none'

const pctOf = (e) => (e.count ? Math.round((e.completed / e.count) * 100) : 0)
const isComplete = (e) => e.count > 0 && e.completed === e.count
const clampZoom = (z) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z))

const periodLabel = (e) =>
    !e.report_type || e.report_type === 'bulanan'
        ? `${BULAN.find((b) => b.id === e.month)?.id_str ?? ''} ${e.year ?? ''}`.trim()
        : `Sem. ${e.semester} (${e.academic_year})`

const comparePeriod = (a, b) =>
    (a.year || 0) - (b.year || 0) ||
    (a.month || 0) - (b.month || 0) ||
    (a.academic_year || '').localeCompare(b.academic_year || '') ||
    (a.semester || 0) - (b.semester || 0)

const progressColor = (pct) => (pct === 100 ? '#10b981' : pct >= 70 ? '#6366f1' : pct >= 40 ? '#f59e0b' : '#ef4444')

function matchesBase(e, { filter, search, isMonthly }) {
    if (filter.classId && e.class_id !== filter.classId) return false
    if (search && !(e.class_name || '').toLowerCase().includes(search.toLowerCase())) return false
    if (isMonthly) {
        if (filter.year && String(e.year) !== String(filter.year)) return false
        if (filter.month && String(e.month) !== String(filter.month)) return false
    } else {
        if (filter.academic_year && e.academic_year !== filter.academic_year) return false
        if (filter.semester && String(e.semester) !== String(filter.semester)) return false
    }
    return true
}

function getPeriodSummary({ archiveList, archiveFilter, archiveSearch, isMonthly }) {
    const latest = archiveList[0] || null
    let entries = []
    let title = ''

    if (isMonthly) {
        const month = archiveFilter.month ? Number(archiveFilter.month) : latest?.month
        const year = archiveFilter.year ? Number(archiveFilter.year) : latest?.year
        const bulan = BULAN.find((b) => b.id === month)?.id_str ?? '—'
        entries = archiveList.filter((e) => e.month === month && e.year === year)
        title = `Ringkasan ${bulan} ${year || ''}`.trim()
    } else {
        const sem = archiveFilter.semester ? Number(archiveFilter.semester) : latest?.semester
        const ay = archiveFilter.academic_year || latest?.academic_year
        entries = archiveList.filter((e) => e.semester === sem && e.academic_year === ay)
        title = `Ringkasan Semester ${sem || ''} (${ay || ''})`
    }

    entries = entries.filter(
        (e) =>
            (!archiveFilter.classId || e.class_id === archiveFilter.classId) &&
            (!archiveSearch || (e.class_name || '').toLowerCase().includes(archiveSearch.toLowerCase()))
    )

    const totalSantri = entries.reduce((a, e) => a + e.count, 0)
    const totalDone = entries.reduce((a, e) => a + e.completed, 0)
    return {
        entries,
        title,
        totalSantri,
        totalDone,
        avg: totalSantri ? Math.round((totalDone / totalSantri) * 100) : 0,
        completeClasses: entries.filter(isComplete).length,
    }
}

/* ------------------------------------------------------------------ */
/* shared: preview pane (zoom, fit-to-width, student nav)              */
/* ------------------------------------------------------------------ */

function PreviewPane({ children, cardRef, zoom, setZoom, manualZoomRef, nav, actions, fill = false }) {
    const wrapRef = useRef(null)
    const [size, setSize] = useState({ w: 0, h: 0 })

    const fit = useCallback(() => {
        const wrap = wrapRef.current
        const card = cardRef.current
        if (!wrap || !card || !card.offsetWidth) return
        setZoom(Math.min(1, (wrap.clientWidth - 32) / card.offsetWidth))
        manualZoomRef.current = false
    }, [cardRef, manualZoomRef, setZoom])

    // ukuran kartu asli (tanpa scale) + auto-fit selama user belum zoom manual
    useEffect(() => {
        const wrap = wrapRef.current
        const card = cardRef.current
        if (!wrap || !card) return
        const measure = () => {
            const w = card.offsetWidth
            const h = card.offsetHeight
            setSize((s) => (s.w === w && s.h === h ? s : { w, h }))
            if (!manualZoomRef.current) fit()
        }
        const ro = new ResizeObserver(measure)
        ro.observe(wrap)
        ro.observe(card)
        measure()
        return () => ro.disconnect()
    }, [cardRef, manualZoomRef, fit])

    const changeZoom = (delta) => {
        manualZoomRef.current = true
        setZoom((z) => z + delta)
    }

    return (
        <div className={`flex flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden ${fill ? 'flex-1 min-h-0' : ''}`}>
            <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 border-b border-[var(--color-border)]">
                <div className="flex items-center gap-1.5">
                    {nav && (
                        <>
                            <button type="button" onClick={nav.onPrev} disabled={nav.index <= 0} aria-label="Santri sebelumnya" className={iconBtnCls}>
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <span className="text-xs font-bold text-[var(--color-text-muted)] tabular-nums min-w-[52px] text-center">
                                {nav.index + 1} / {nav.total}
                            </span>
                            <button type="button" onClick={nav.onNext} disabled={nav.index >= nav.total - 1} aria-label="Santri berikutnya" className={iconBtnCls}>
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </>
                    )}
                </div>
                <div className="flex items-center gap-1.5">
                    <button type="button" onClick={() => changeZoom(-ZOOM_STEP)} aria-label="Perkecil" className={iconBtnCls}>
                        <Minus className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-bold tabular-nums w-10 text-center text-[var(--color-text)]">{Math.round(zoom * 100)}%</span>
                    <button type="button" onClick={() => changeZoom(ZOOM_STEP)} aria-label="Perbesar" className={iconBtnCls}>
                        <Plus className="w-4 h-4" />
                    </button>
                    <button type="button" onClick={fit} className="h-9 px-3 rounded-xl border border-[var(--color-border)] hover:bg-[var(--color-surface-alt)] text-xs font-bold text-[var(--color-text)] transition-colors">
                        Sesuaikan
                    </button>
                    {actions}
                </div>
            </div>

            <div ref={wrapRef} className={`overflow-auto custom-scrollbar bg-gray-50 dark:bg-slate-900/50 p-4 ${fill ? 'flex-1' : 'max-h-[75vh] min-h-[420px]'}`}>
                <div style={{ width: size.w ? size.w * zoom : undefined, height: size.h ? size.h * zoom : undefined, margin: '0 auto' }}>
                    <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top left', width: 'max-content' }} className="shadow-2xl">
                        <div ref={cardRef}>{children}</div>
                    </div>
                </div>
            </div>
        </div>
    )
}

/* ------------------------------------------------------------------ */
/* detail arsip (preview + edit)                                       */
/* ------------------------------------------------------------------ */

function ArchiveDetail(props) {
    const {
        archivePreview, setArchivePreview,
        archiveEditMode, setArchiveEditMode,
        archiveEditScores, setArchiveEditScores,
        archiveEditExtras, setArchiveEditExtras,
        archiveEditSaving, saveArchiveEdit,
        previewStudentId, setPreviewStudentId,
        exportBulkPDF, openPrintWindow, sendWATextOnly,
        pageSize, setPageSize, lang, setLang,
        previewZoom, setPreviewZoom,
        isFullScreenPreview, setIsFullScreenPreview,
        settings, previewContainerRef, manualZoomRef,
        reportType = 'bulanan',
    } = props

    const {
        students: pStu = [], scores: pSc = {}, extras: pEx = {},
        className: pClass, bulanObj: pBulan, tahun: pTahun, musyrif: pMus, entry,
    } = archivePreview

    const rtObj = RAPORT_TYPES[reportType] || RAPORT_TYPES.bulanan
    const pCriteria = rtObj.getCriteria(pClass)
    const classLevel = pClass ? getClassLevel(pClass) : 'SMP'
    const isMonthly = reportType === 'bulanan'

    const [studentQuery, setStudentQuery] = useState('')
    const fsCardRef = useRef(null)
    const fsManualRef = useRef(false)
    const [fsZoom, setFsZoom] = useState(1)

    const setFsZoomClamped = useCallback((v) => setFsZoom((z) => clampZoom(typeof v === 'function' ? v(z) : v)), [])

    const pStudent = (previewStudentId && pStu.find((s) => s.id === previewStudentId)) || pStu[0]
    const index = pStudent ? pStu.findIndex((s) => s.id === pStudent.id) : -1

    const editSc = (sid) => (archiveEditMode ? { ...pSc[sid], ...(archiveEditScores[sid] || {}) } : pSc[sid])
    const editEx = (sid) => (archiveEditMode ? { ...pEx[sid], ...(archiveEditExtras[sid] || {}) } : pEx[sid])
    const isDirty = (sid) =>
        Object.keys(archiveEditScores[sid] || {}).length > 0 || Object.keys(archiveEditExtras[sid] || {}).length > 0
    const dirtyCount = pStu.filter((s) => isDirty(s.id)).length

    const go = useCallback(
        (dir) => {
            const next = pStu[index + dir]
            if (next) setPreviewStudentId(next.id)
        },
        [pStu, index, setPreviewStudentId]
    )

    // ← / → untuk pindah santri (tidak aktif saat mengetik)
    useEffect(() => {
        const onKey = (e) => {
            if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
            if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName)) return
            go(e.key === 'ArrowRight' ? 1 : -1)
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [go])

    if (!pStudent) {
        return (
            <div className="space-y-6 animate-fade-in">
                <button type="button" onClick={() => setArchivePreview(null)} className={iconBtnCls} aria-label="Kembali ke daftar arsip">
                    <ArrowLeft className="w-4 h-4" />
                </button>
                <EmptyState variant="dashed" color="slate" icon={Users} title="Arsip ini belum berisi santri" description="Tidak ada data santri yang tersimpan pada arsip ini." />
            </div>
        )
    }

    const handleScoreEdit = (key, val) => {
        const raw = val.replace(/[^0-9]/g, '')
        const maxVal = isMonthly ? 9 : 100
        if (raw !== '' && Number(raw) > maxVal) return
        setArchiveEditScores((prev) => ({ ...prev, [pStudent.id]: { ...(prev[pStudent.id] || {}), [key]: raw } }))
    }

    const handleExtraEdit = (key, val) =>
        setArchiveEditExtras((prev) => ({ ...prev, [pStudent.id]: { ...(prev[pStudent.id] || {}), [key]: val } }))

    const cancelEdit = () => {
        setArchiveEditMode(false)
        setArchiveEditScores({})
        setArchiveEditExtras({})
    }

    const q = studentQuery.trim().toLowerCase()
    const visibleStudents = q ? pStu.filter((s) => s.name.toLowerCase().includes(q)) : pStu
    const completeCount = pStu.filter((s) => {
        const sc = editSc(s.id)
        return pCriteria.every((c) => sc?.[c.key] !== '' && sc?.[c.key] != null)
    }).length

    const renderCard = (student) => (
        <RaportPrintCard
            student={student}
            scores={editSc(student.id)}
            extra={editEx(student.id)}
            bulanObj={pBulan}
            tahun={pTahun}
            musyrif={pMus}
            className={pClass}
            lang={lang}
            settings={settings}
            pageSize={pageSize}
            reportType={entry.report_type || 'bulanan'}
            selectedSemester={entry.semester}
            academicYear={entry.academic_year}
            selectedClass={pClass}
        />
    )

    const nav = { index, total: pStu.length, onPrev: () => go(-1), onNext: () => go(1) }

    const sectionTitle = 'text-[11px] font-black uppercase tracking-wider text-[var(--color-text-muted)]'
    const fieldBox = 'flex items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-2.5 h-10'

    const editForm = (
        <div className="p-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] space-y-5">
            <div className="flex items-center gap-3 border-b border-[var(--color-border)] pb-4">
                <div className="w-10 h-10 rounded-xl bg-violet-500 text-white flex items-center justify-center shrink-0">
                    <Sliders className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                    <h4 className="text-sm font-black text-[var(--color-text)] truncate">Edit: {pStudent.name}</h4>
                    <p className="text-xs text-[var(--color-text-muted)]">Perubahan tiap santri tersimpan sementara sampai kamu menekan Simpan.</p>
                </div>
            </div>

            <div className="space-y-2">
                <h5 className={`${sectionTitle} flex items-center gap-1.5`}>
                    <ClipboardList className="w-3.5 h-3.5 opacity-60" /> Nilai kriteria
                    <span className="normal-case font-semibold tracking-normal opacity-70">(0–{isMonthly ? 9 : 100})</span>
                </h5>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {pCriteria.map((k) => {
                        const val = editSc(pStudent.id)?.[k.key] ?? ''
                        const g = val !== '' ? getGradePredicate(val, reportType, classLevel) : null
                        return (
                            <label key={k.key} className="flex flex-col p-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]">
                                <span className="text-[11px] font-black" style={{ color: k.color || 'inherit' }}>{k.id}</span>
                                <span className="text-[10px] text-[var(--color-text-muted)] font-medium mb-1.5 truncate">{k.label || ''}</span>
                                <div className="flex items-center gap-1.5 mt-auto">
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        value={val}
                                        onChange={(e) => handleScoreEdit(k.key, e.target.value)}
                                        placeholder="—"
                                        className="w-full h-9 text-center text-sm font-black rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] focus:border-indigo-500 outline-none text-[var(--color-text)]"
                                    />
                                    {g && (
                                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded shrink-0" style={{ background: g.bg, color: g.color }}>{g.id}</span>
                                    )}
                                </div>
                            </label>
                        )
                    })}
                </div>
            </div>

            {(rtObj.hasFisik || rtObj.hasHafalan) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {rtObj.hasFisik && (
                        <div className="space-y-2">
                            <h5 className={sectionTitle}>Kondisi fisik</h5>
                            <div className="grid grid-cols-2 gap-2">
                                {FISIK_FIELDS.map((f) => {
                                    const Icon = f.icon
                                    return (
                                        <div key={f.key} className={fieldBox}>
                                            <Icon style={{ color: f.color }} className="w-3.5 h-3.5 shrink-0 opacity-80" />
                                            <input type="number" inputMode="decimal" placeholder={f.label} value={editEx(pStudent.id)?.[f.key] ?? ''} onChange={(e) => handleExtraEdit(f.key, e.target.value)} className="flex-1 w-0 text-xs font-bold bg-transparent text-[var(--color-text)] outline-none" />
                                            <span className="text-[10px] text-[var(--color-text-muted)] font-black">{f.unit}</span>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                    {rtObj.hasHafalan && (
                        <div className="space-y-2">
                            <h5 className={sectionTitle}>Perkembangan hafalan</h5>
                            <div className="grid grid-cols-2 gap-2">
                                {HAFALAN_FIELDS.map((f) => {
                                    const Icon = f.icon
                                    return (
                                        <div key={f.key} className={fieldBox}>
                                            <Icon style={{ color: f.color }} className="w-3.5 h-3.5 shrink-0 opacity-80" />
                                            <input type="text" placeholder={f.ph} value={editEx(pStudent.id)?.[f.key] ?? ''} onChange={(e) => handleExtraEdit(f.key, e.target.value)} className="flex-1 w-0 text-xs font-bold bg-transparent text-[var(--color-text)] outline-none" />
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {rtObj.hasAttendance && (
                <div className="space-y-2">
                    <h5 className={sectionTitle}>Ketidakhadiran</h5>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[
                            { key: 'hari_sakit', label: 'Sakit' },
                            { key: 'hari_izin', label: 'Izin' },
                            { key: 'hari_alpa', label: 'Alpa' },
                            { key: 'hari_pulang', label: 'Pulang' },
                        ].map((item) => (
                            <label key={item.key} className="flex flex-col gap-1 p-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-center">
                                <span className="text-[11px] font-black text-[var(--color-text-muted)]">{item.label}</span>
                                <div className="flex items-center justify-center gap-1">
                                    <input type="number" min="0" placeholder="0" value={editEx(pStudent.id)?.[item.key] ?? ''} onChange={(e) => handleExtraEdit(item.key, e.target.value)} className="w-12 h-8 text-center text-sm font-black rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] outline-none focus:border-indigo-500" />
                                    <span className="text-[10px] font-bold text-[var(--color-text-muted)]">hari</span>
                                </div>
                            </label>
                        ))}
                    </div>
                </div>
            )}

            {rtObj.hasCatatan && (
                <div className="space-y-2">
                    <h5 className={sectionTitle}>Catatan wali kelas</h5>
                    <textarea
                        placeholder="Tulis catatan perkembangan untuk santri..."
                        value={editEx(pStudent.id)?.catatan ?? ''}
                        onChange={(e) => handleExtraEdit('catatan', e.target.value)}
                        className="w-full h-24 p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-sm outline-none focus:bg-[var(--color-surface)] focus:border-indigo-500/50 text-[var(--color-text)] resize-none transition-colors"
                    />
                </div>
            )}

            <div className="flex items-center gap-3 pt-4 border-t border-[var(--color-border)]">
                <button type="button" onClick={cancelEdit} disabled={archiveEditSaving} className="h-10 px-5 rounded-xl border border-[var(--color-border)] hover:bg-[var(--color-surface-alt)] text-[var(--color-text)] text-xs font-black transition-colors disabled:opacity-60">
                    Batalkan semua
                </button>
                <button type="button" onClick={saveArchiveEdit} disabled={archiveEditSaving || dirtyCount === 0} className="flex-1 h-10 rounded-xl bg-indigo-500 text-white text-xs font-black hover:bg-indigo-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                    {archiveEditSaving ? 'Menyimpan...' : dirtyCount ? `Simpan perubahan (${dirtyCount} santri)` : 'Belum ada perubahan'}
                </button>
            </div>
        </div>
    )

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <button type="button" onClick={() => setArchivePreview(null)} aria-label="Kembali ke daftar arsip" className={`${iconBtnCls} w-10 h-10`}>
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div>
                        <h3 className="text-base font-black text-[var(--color-text)]">Detail arsip: {pClass}</h3>
                        <p className="text-xs text-[var(--color-text-muted)] font-medium">
                            {periodLabel(entry)} · {pStu.length} santri · {completeCount} lengkap
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button type="button" onClick={() => exportBulkPDF(entry)} className="h-10 px-4 rounded-xl bg-amber-500 text-white text-xs font-black hover:bg-amber-600 transition-colors flex items-center gap-2">
                        <Download className="w-4 h-4" /> Export PDF
                    </button>
                    <button type="button" onClick={() => openPrintWindow(pStu)} className="h-10 px-4 rounded-xl bg-indigo-500 text-white text-xs font-black hover:bg-indigo-600 transition-colors flex items-center gap-2">
                        <Printer className="w-4 h-4" /> Cetak raport ini
                    </button>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
                {/* Daftar santri */}
                <aside className="w-full lg:w-64 xl:w-72 shrink-0">
                    <div className="p-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] lg:sticky lg:top-4">
                        <div className="flex items-center justify-between mb-2">
                            <span className={sectionTitle}>Daftar santri</span>
                            <span className="text-[11px] font-bold text-[var(--color-text-muted)] tabular-nums">{completeCount}/{pStu.length} lengkap</span>
                        </div>
                        {pStu.length > 10 && (
                            <div className="relative mb-2">
                                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                                <input type="text" value={studentQuery} onChange={(e) => setStudentQuery(e.target.value)} placeholder="Cari santri..." className="w-full h-9 pl-9 pr-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-xs font-semibold text-[var(--color-text)] outline-none focus:border-indigo-500/50" />
                            </div>
                        )}
                        <div className="space-y-1 max-h-[50vh] lg:max-h-[60vh] overflow-y-auto custom-scrollbar pr-1">
                            {visibleStudents.map((s) => {
                                const current = s.id === pStudent.id
                                const sc = editSc(s.id)
                                const complete = pCriteria.every((c) => sc?.[c.key] !== '' && sc?.[c.key] != null)
                                const dirty = archiveEditMode && isDirty(s.id)
                                return (
                                    <button
                                        key={s.id}
                                        type="button"
                                        aria-current={current ? 'true' : undefined}
                                        onClick={() => setPreviewStudentId(s.id)}
                                        className={`w-full text-left p-2.5 rounded-xl text-xs font-bold transition-colors flex items-center justify-between gap-2 border ${current ? 'bg-indigo-500/5 text-indigo-500 border-indigo-500/20' : 'border-transparent text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] hover:text-[var(--color-text)]'}`}
                                    >
                                        <span className="truncate">{s.name}</span>
                                        <span className="flex items-center gap-1.5 shrink-0">
                                            {dirty && <span title="Ada perubahan belum disimpan" className="w-2 h-2 rounded-full bg-violet-500" />}
                                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-black ${complete ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`} title={complete ? 'Nilai lengkap' : 'Nilai belum lengkap'}>
                                                {complete ? '✓' : '…'}
                                            </span>
                                        </span>
                                    </button>
                                )
                            })}
                            {visibleStudents.length === 0 && <p className="text-xs text-[var(--color-text-muted)] p-2">Tidak ada santri yang cocok.</p>}
                        </div>
                    </div>
                </aside>

                {/* Preview / edit */}
                <div className="flex-1 min-w-0 space-y-4">
                    <div className="p-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            {archiveEditMode ? (
                                <span className="text-xs font-black text-violet-500 px-2">Mode edit aktif</span>
                            ) : (
                                <button type="button" onClick={() => setArchiveEditMode(true)} className="h-9 px-3 rounded-lg border border-[var(--color-border)] text-indigo-500 hover:bg-indigo-500/5 text-xs font-black flex items-center gap-1.5 transition-colors">
                                    <Sliders className="w-4 h-4" /> Edit nilai
                                </button>
                            )}
                            {sendWATextOnly && (
                                <button type="button" onClick={() => sendWATextOnly(pStudent, editSc(pStudent.id), editEx(pStudent.id))} className="h-9 px-3 rounded-lg border border-[var(--color-border)] text-emerald-600 hover:bg-emerald-500/5 text-xs font-black flex items-center gap-1.5 transition-colors">
                                    <WhatsAppIcon className="w-4 h-4" /> Kirim WA
                                </button>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <select aria-label="Ukuran kertas" value={pageSize} onChange={(e) => setPageSize(e.target.value)} className={`${inputCls} h-9`}>
                                <option value="a4">Kertas A4</option>
                                <option value="f4">Kertas F4/Folio</option>
                            </select>
                            <select aria-label="Bahasa raport" value={lang} onChange={(e) => setLang(e.target.value)} className={`${inputCls} h-9`}>
                                <option value="ar">Bhs. Arab</option>
                                <option value="id">Bhs. Indonesia</option>
                            </select>
                        </div>
                    </div>

                    <div className={archiveEditMode ? 'grid gap-4 2xl:grid-cols-2 items-start' : ''}>
                        {archiveEditMode && editForm}
                        <PreviewPane
                            cardRef={previewContainerRef}
                            zoom={previewZoom}
                            setZoom={setPreviewZoom}
                            manualZoomRef={manualZoomRef}
                            nav={nav}
                            actions={
                                <button type="button" onClick={() => setIsFullScreenPreview(true)} aria-label="Layar penuh" className={iconBtnCls}>
                                    <Maximize2 className="w-4 h-4" />
                                </button>
                            }
                        >
                            {renderCard(pStudent)}
                        </PreviewPane>
                    </div>
                </div>
            </div>

            {isFullScreenPreview && (
                <div className="fixed inset-0 z-[90] bg-slate-900/90 backdrop-blur-sm flex flex-col p-3 sm:p-6" role="dialog" aria-modal="true" aria-label={`Preview raport ${pStudent.name}`}>
                    <div className="flex items-center justify-between mb-3 text-white">
                        <p className="text-sm font-black truncate">{pStudent.name} · {pClass}</p>
                        <button type="button" onClick={() => setIsFullScreenPreview(false)} aria-label="Tutup layar penuh" className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    <PreviewPane fill cardRef={fsCardRef} zoom={fsZoom} setZoom={setFsZoomClamped} manualZoomRef={fsManualRef} nav={nav}>
                        {renderCard(pStudent)}
                    </PreviewPane>
                </div>
            )}
        </div>
    )
}

/* ------------------------------------------------------------------ */
/* daftar arsip + statistik                                            */
/* ------------------------------------------------------------------ */

function ArchiveCard({ entry, loadArchiveDetail, exportBulkPDF, setConfirmDelete }) {
    const pct = pctOf(entry)
    const missing = entry.count - entry.completed
    return (
        <article className="flex flex-col h-full p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-indigo-500/30 transition-colors">
            <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                    <h4 className="text-sm font-black text-[var(--color-text)] truncate">{entry.class_name}</h4>
                    <p className="text-xs text-[var(--color-text-muted)] font-semibold mt-0.5">
                        {periodLabel(entry)} · {entry.lang === 'ar' ? 'عربي' : 'Indonesia'}
                    </p>
                </div>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full shrink-0 ${entry.lang === 'ar' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-indigo-500/10 text-indigo-600'}`}>
                    {entry.lang === 'ar' ? 'Pondok' : 'Reguler'}
                </span>
            </div>

            <div className="mb-3">
                <div className="flex justify-between items-center text-xs font-bold text-[var(--color-text-muted)] mb-1.5">
                    <span>
                        {entry.completed}/{entry.count} lengkap
                        {missing > 0 && <span className="ml-1.5 text-amber-600">· {missing} belum</span>}
                    </span>
                    <span className="tabular-nums">{pct}%</span>
                </div>
                <div role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} className="h-2 rounded-full bg-[var(--color-surface-alt)] overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: progressColor(pct) }} />
                </div>
            </div>

            <div className="text-xs text-[var(--color-text-muted)] mb-4 flex items-center gap-1.5 min-h-[1.25rem]">
                {entry.musyrif && (
                    <>
                        <Users className="w-3.5 h-3.5 opacity-60 shrink-0" />
                        <span className="truncate">{entry.musyrif}</span>
                    </>
                )}
            </div>

            <div className="flex gap-2 mt-auto">
                <button type="button" onClick={() => loadArchiveDetail(entry)} className="flex-1 h-9 rounded-lg bg-indigo-500 text-white text-xs font-black flex items-center justify-center gap-1.5 hover:bg-indigo-600 transition-colors">
                    <Search className="w-3.5 h-3.5" /> Buka
                </button>
                <button type="button" onClick={() => exportBulkPDF(entry)} className="flex-1 h-9 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-700 text-xs font-black flex items-center justify-center gap-1.5 hover:bg-amber-500/20 transition-colors">
                    <Download className="w-3.5 h-3.5" /> PDF
                </button>
                <button type="button" onClick={() => setConfirmDelete(entry)} aria-label={`Hapus arsip ${entry.class_name}`} title="Hapus arsip" className="h-9 w-9 rounded-lg text-[var(--color-text-muted)] flex items-center justify-center hover:bg-red-500/10 hover:text-red-500 transition-colors">
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
        </article>
    )
}

function ArchiveStats({ summary, loadArchiveDetail }) {
    const { entries, title, totalSantri, totalDone, avg, completeClasses } = summary

    if (!entries.length) {
        return (
            <EmptyState
                variant="dashed"
                color="slate"
                icon={PieChart}
                title="Tidak ada data statistik"
                description="Pilih bulan/tahun (atau semester) yang memiliki arsip untuk melihat ringkasan kelas."
            />
        )
    }

    const sorted = [...entries].sort((a, b) => pctOf(a) - pctOf(b))
    const stat = (label, value) => (
        <div className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
            <p className="text-[11px] font-bold text-[var(--color-text-muted)]">{label}</p>
            <p className="text-xl font-black text-[var(--color-text)] tabular-nums">{value}</p>
        </div>
    )

    return (
        <div className="space-y-4">
            <h4 className="text-sm font-black text-[var(--color-text)]">{title}</h4>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {stat('Kelas', entries.length)}
                {stat('Kelas lengkap', `${completeClasses}/${entries.length}`)}
                {stat('Raport lengkap', `${totalDone}/${totalSantri}`)}
                {stat('Kelengkapan', `${avg}%`)}
            </div>

            <div className="space-y-2">
                <p className="text-xs font-bold text-[var(--color-text-muted)]">Progress per kelas · yang paling belum lengkap di atas</p>
                {sorted.map((entry) => {
                    const pct = pctOf(entry)
                    const color = progressColor(pct)
                    return (
                        <button key={entry.key} type="button" onClick={() => loadArchiveDetail(entry)} className="w-full text-left flex items-center gap-3 p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-indigo-500/30 transition-colors">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-sm font-black text-[var(--color-text)] truncate">{entry.class_name}</span>
                                    <span className="text-xs font-black ml-2 tabular-nums" style={{ color }}>{pct}%</span>
                                </div>
                                <div className="h-2 rounded-full bg-[var(--color-surface-alt)] overflow-hidden">
                                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
                                </div>
                                <p className="text-xs text-[var(--color-text-muted)] mt-1.5">
                                    {entry.completed}/{entry.count} santri lengkap{entry.musyrif ? ` · ${entry.musyrif}` : ''}
                                </p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)] shrink-0" />
                        </button>
                    )
                })}
            </div>
        </div>
    )
}

function ArchiveOverview(props) {
    const {
        archiveList, archiveLoading,
        archiveFilter, setArchiveFilter,
        archiveSearch, setArchiveSearch,
        archiveSort, setArchiveSort,
        archiveStatusFilter, setArchiveStatusFilter,
        archiveTab, setArchiveTab,
        archiveVisibleCount, setArchiveVisibleCount,
        loadArchiveDetail, exportBulkPDF, setConfirmDelete,
        setStep, onRefresh, reportType = 'bulanan',
    } = props

    const isMonthly = reportType === 'bulanan'
    const status = archiveStatusFilter || 'all'
    const sort = archiveSort || 'newest'

    // filter dasar (tanpa status) dipakai juga untuk menghitung jumlah di chip status
    const base = useMemo(
        () => archiveList.filter((e) => matchesBase(e, { filter: archiveFilter, search: archiveSearch, isMonthly })),
        [archiveList, archiveFilter, archiveSearch, isMonthly]
    )

    const counts = useMemo(
        () => ({ all: base.length, complete: base.filter(isComplete).length, incomplete: base.filter((e) => !isComplete(e)).length }),
        [base]
    )

    const filtered = useMemo(() => {
        const list = status === 'all' ? base : base.filter((e) => (status === 'complete' ? isComplete(e) : !isComplete(e)))
        const sorted = [...list]
        if (sort === 'oldest') sorted.sort(comparePeriod)
        else if (sort === 'newest') sorted.sort((a, b) => comparePeriod(b, a))
        else if (sort === 'name') sorted.sort((a, b) => (a.class_name || '').localeCompare(b.class_name || ''))
        else if (sort === 'progress') sorted.sort((a, b) => pctOf(a) - pctOf(b))
        return sorted
    }, [base, status, sort])

    const uniqueYears = useMemo(
        () =>
            isMonthly
                ? [...new Set(archiveList.map((e) => e.year))].sort((a, b) => b - a)
                : [...new Set(archiveList.map((e) => e.academic_year))].sort((a, b) => (b || '').localeCompare(a || '')),
        [archiveList, isMonthly]
    )

    // balik ke 12 kartu pertama setiap filter berubah
    useEffect(() => {
        setArchiveVisibleCount(PAGE_STEP)
    }, [archiveFilter, archiveSearch, status, sort, setArchiveVisibleCount])

    const cardsToRender = filtered.slice(0, archiveVisibleCount)
    const hasActiveFilter = Boolean(archiveSearch) || status !== 'all'
    const hasPeriodFilter = Boolean(archiveFilter.classId || (isMonthly ? archiveFilter.month : archiveFilter.semester))
    const resetAll = () => {
        setArchiveSearch('')
        setArchiveStatusFilter?.('all')
        setArchiveFilter({ ...EMPTY_FILTER })
    }

    const tabs = [
        { id: 'list', label: 'Daftar arsip', icon: Table },
        { id: 'ringkasan', label: 'Statistik', icon: PieChart },
    ]

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <button type="button" onClick={() => setStep(0)} aria-label="Kembali" className={`${iconBtnCls} w-10 h-10`}>
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div>
                        <h3 className="text-base font-black text-[var(--color-text)]">Riwayat &amp; Arsip</h3>
                        <p className="text-xs text-[var(--color-text-muted)] font-medium">Lihat dan kelola database raport yang telah disimpan.</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {onRefresh && (
                        <button type="button" onClick={onRefresh} disabled={archiveLoading} aria-label="Muat ulang arsip" title="Muat ulang" className={`${iconBtnCls} w-10 h-10`}>
                            <RefreshCw className={`w-4 h-4 ${archiveLoading ? 'animate-spin' : ''}`} />
                        </button>
                    )}
                    <div role="tablist" className="flex items-center gap-1 p-1 rounded-2xl bg-[var(--color-surface-alt)] border border-[var(--color-border)]">
                        {tabs.map(({ id, label, icon: Icon }) => (
                            <button key={id} type="button" role="tab" aria-selected={archiveTab === id} onClick={() => setArchiveTab(id)}
                                className={`h-9 px-4 rounded-xl text-xs font-black flex items-center gap-2 transition-colors ${archiveTab === id ? 'bg-[var(--color-surface)] text-indigo-500 shadow-sm border border-[var(--color-border)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}>
                                <Icon className="w-4 h-4" /> {label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Toolbar */}
            <div className="space-y-3 p-4 rounded-2xl bg-[var(--color-surface-alt)] border border-[var(--color-border)]">
                <div className="flex flex-wrap gap-3">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                        <input type="text" aria-label="Cari kelas" placeholder="Cari kelas..." value={archiveSearch} onChange={(e) => setArchiveSearch(e.target.value)} className={`${inputCls} w-full pl-10 pr-9`} />
                        {archiveSearch && (
                            <button type="button" onClick={() => setArchiveSearch('')} aria-label="Hapus pencarian" className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md hover:bg-black/5 flex items-center justify-center text-[var(--color-text-muted)]">
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>

                    {isMonthly ? (
                        <>
                            <select aria-label="Tahun" value={archiveFilter.year} onChange={(e) => setArchiveFilter((p) => ({ ...p, year: e.target.value }))} className={inputCls}>
                                <option value="">Semua tahun</option>
                                {uniqueYears.map((y) => <option key={y} value={y}>{y}</option>)}
                            </select>
                            <select aria-label="Bulan" value={archiveFilter.month} onChange={(e) => setArchiveFilter((p) => ({ ...p, month: e.target.value }))} className={inputCls}>
                                <option value="">Semua bulan</option>
                                {BULAN.map((b) => <option key={b.id} value={b.id}>{b.id_str}</option>)}
                            </select>
                        </>
                    ) : (
                        <>
                            <select aria-label="Tahun ajaran" value={archiveFilter.academic_year || ''} onChange={(e) => setArchiveFilter((p) => ({ ...p, academic_year: e.target.value }))} className={inputCls}>
                                <option value="">Semua tahun ajaran</option>
                                {uniqueYears.map((y) => <option key={y} value={y}>{y}</option>)}
                            </select>
                            <select aria-label="Semester" value={archiveFilter.semester || ''} onChange={(e) => setArchiveFilter((p) => ({ ...p, semester: e.target.value }))} className={inputCls}>
                                <option value="">Semua semester</option>
                                <option value="1">Semester 1 (Ganjil)</option>
                                <option value="2">Semester 2 (Genap)</option>
                            </select>
                        </>
                    )}

                    {archiveTab === 'list' && setArchiveSort && (
                        <select aria-label="Urutkan" value={sort} onChange={(e) => setArchiveSort(e.target.value)} className={inputCls}>
                            {SORT_OPTIONS.map((o) => <option key={o.id} value={o.id}>Urutkan: {o.label}</option>)}
                        </select>
                    )}
                </div>

                {archiveTab === 'list' && setArchiveStatusFilter && (
                    <div className="flex flex-wrap items-center gap-2">
                        {STATUS_OPTIONS.map((o) => (
                            <button key={o.id} type="button" aria-pressed={status === o.id} onClick={() => setArchiveStatusFilter(o.id)}
                                className={`h-8 px-3 rounded-full text-xs font-bold border transition-colors ${status === o.id ? 'bg-indigo-500 text-white border-indigo-500' : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] border-[var(--color-border)] hover:text-[var(--color-text)]'}`}>
                                {o.label} <span className="opacity-70 tabular-nums">{counts[o.id]}</span>
                            </button>
                        ))}
                        {hasActiveFilter && (
                            <button type="button" onClick={() => { setArchiveSearch(''); setArchiveStatusFilter('all') }} className="h-8 px-2 text-xs font-bold text-indigo-500 hover:underline">
                                Reset pencarian
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Body */}
            {archiveLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3" aria-busy="true">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                    <Skeleton className="h-3.5 w-2/3 rounded mb-2" />
                                    <Skeleton className="h-3 w-1/2 rounded" />
                                </div>
                                <Skeleton className="h-4 w-12 rounded-full" />
                            </div>
                            <Skeleton className="h-2 w-full rounded-full mb-4" />
                            <div className="flex gap-2">
                                <Skeleton className="flex-1 h-9 rounded-lg" />
                                <Skeleton className="flex-1 h-9 rounded-lg" />
                                <Skeleton className="h-9 w-9 rounded-lg" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : archiveTab === 'ringkasan' ? (
                <ArchiveStats summary={getPeriodSummary({ archiveList, archiveFilter, archiveSearch, isMonthly })} loadArchiveDetail={loadArchiveDetail} />
            ) : filtered.length === 0 ? (
                <EmptyState
                    variant="dashed"
                    color="slate"
                    icon={archiveList.length ? Archive : AlertCircle}
                    title="Arsip tidak ditemukan"
                    description={
                        hasActiveFilter || hasPeriodFilter
                            ? 'Coba ubah filter atau hapus pencarian untuk menemukan arsip yang kamu cari.'
                            : 'Belum ada raport yang tersimpan. Selesaikan input nilai di step 2, lalu simpan untuk membuat arsip.'
                    }
                    action={
                        (hasActiveFilter || hasPeriodFilter) && (
                            <button type="button" onClick={resetAll} className="h-9 px-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-xs font-black hover:text-[var(--color-text)] transition-colors flex items-center gap-2 mx-auto">
                                <X className="w-3.5 h-3.5" /> Reset semua filter
                            </button>
                        )
                    }
                />
            ) : (
                <div>
                    <p className="text-xs font-semibold text-[var(--color-text-muted)] mb-3">
                        Menampilkan {cardsToRender.length} dari {filtered.length} arsip
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 items-stretch">
                        {cardsToRender.map((entry) => (
                            <ArchiveCard key={entry.key} entry={entry} loadArchiveDetail={loadArchiveDetail} exportBulkPDF={exportBulkPDF} setConfirmDelete={setConfirmDelete} />
                        ))}
                    </div>
                    {filtered.length > archiveVisibleCount && (
                        <div className="flex justify-center mt-8">
                            <button type="button" onClick={() => setArchiveVisibleCount((prev) => prev + PAGE_STEP)} className="h-10 px-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-alt)] hover:text-indigo-500 hover:border-indigo-500/30 text-[var(--color-text)] text-xs font-black transition-colors flex items-center gap-2">
                                <ChevronDown className="w-4 h-4" />
                                Muat lebih banyak ({filtered.length - archiveVisibleCount} tersisa)
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

/* ------------------------------------------------------------------ */

export default function RaportArchive(props) {
    return props.archivePreview ? <ArchiveDetail {...props} /> : <ArchiveOverview {...props} />
}