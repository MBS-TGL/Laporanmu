import React from 'react'
import {
    ArrowLeft,
    Sliders,
    FileArchive,
    CheckCircle2,
    ClipboardList,
    Users,
    Search,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    X,
    Maximize2,
    Table,
    PieChart,
    Archive,
    AlertCircle
} from 'lucide-react'

const WhatsAppIcon = (props) => (
    <svg viewBox="0 0 448 512" fill="currentColor" {...props}>
        <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7 .9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/>
    </svg>
)

import { EmptyState, Skeleton } from '@shared/components'
import RaportPrintCard from './RaportPrintCard'

import {
    BULAN, FISIK_FIELDS, HAFALAN_FIELDS, LABEL
} from '@utils/reports/raportConstants'
import { RAPORT_TYPES, getClassLevel, getGradePredicate } from '@features/raport/utils/raportTypeRegistry'

export default function RaportArchive({
    archiveList,
    archiveLoading,
    archiveFilter,
    setArchiveFilter,
    archiveSearch,
    setArchiveSearch,
    archiveSort,
    archiveTab,
    setArchiveTab,
    archiveVisibleCount,
    setArchiveVisibleCount,
    archivePreview,
    setArchivePreview,
    previewStudentId,
    setPreviewStudentId,
    archiveEditMode,
    setArchiveEditMode,
    archiveEditScores,
    setArchiveEditScores,
    archiveEditExtras,
    setArchiveEditExtras,
    archiveEditSaving,
    archiveStatusFilter,
    archiveMinAvg,

    // Actions & Helpers
    loadArchiveDetail,
    saveArchiveEdit,
    exportBulkPDF,
    setConfirmDelete,
    openPrintWindow,
    sendWATextOnly,
    pageSize,
    setPageSize,
    lang,
    setLang,
    previewZoom,
    setPreviewZoom,
    setIsFullScreenPreview,
    settings,
    setStep,
    previewContainerRef,
    manualZoomRef,
    reportType = 'bulanan',
}) {
    const _minAvgNum = archiveMinAvg !== '' ? Number(archiveMinAvg) : null
    const isMonthly = reportType === 'bulanan'
    const rtObj = RAPORT_TYPES[reportType] || RAPORT_TYPES.bulanan
    const criteria = rtObj.getCriteria()

    let filtered = archiveList.filter(e => {
        const matchesClass = !archiveFilter.classId || e.class_id === archiveFilter.classId
        const matchesSearch = !archiveSearch || e.class_name.toLowerCase().includes(archiveSearch.toLowerCase())
        const matchesStatus = archiveStatusFilter === 'all' || (archiveStatusFilter === 'complete' ? e.completed === e.count && e.count > 0 : e.completed < e.count)
        const matchesMinAvg = _minAvgNum === null || (e.count > 0 && (e.completed / e.count) * 100 < _minAvgNum)

        if (isMonthly) {
            const matchesYear = !archiveFilter.year || String(e.year) === String(archiveFilter.year)
            const matchesMonth = !archiveFilter.month || String(e.month) === String(archiveFilter.month)
            return matchesClass && matchesSearch && matchesStatus && matchesMinAvg && matchesYear && matchesMonth
        } else {
            const matchesAcadYear = !archiveFilter.academic_year || e.academic_year === archiveFilter.academic_year
            const matchesSem = !archiveFilter.semester || String(e.semester) === String(archiveFilter.semester)
            return matchesClass && matchesSearch && matchesStatus && matchesMinAvg && matchesAcadYear && matchesSem
        }
    })

    if (archiveSort === 'oldest') {
        filtered = [...filtered].sort((a, b) => {
            if (isMonthly) {
                return a.year - b.year || a.month - b.month
            } else {
                return a.academic_year.localeCompare(b.academic_year) || a.semester - b.semester
            }
        })
    } else if (archiveSort === 'name') {
        filtered = [...filtered].sort((a, b) => a.class_name.localeCompare(b.class_name))
    } else if (archiveSort === 'progress') {
        filtered = [...filtered].sort((a, b) => (b.count ? b.completed / b.count : 0) - (a.count ? a.completed / a.count : 0))
    }

    const uniqueYears = isMonthly
        ? [...new Set(archiveList.map(e => e.year))].sort((a, b) => b - a)
        : [...new Set(archiveList.map(e => e.academic_year))].sort((a, b) => b.localeCompare(a))

    const cardsToRender = filtered.slice(0, archiveVisibleCount)

    if (archivePreview) {
        const { students: pStu, scores: pSc, extras: pEx, bulanObj: pBulan, tahun: pTahun, musyrif: pMus, className: pClass, entry } = archivePreview
        const previewClassLevel = pClass ? getClassLevel(pClass) : 'SMP'
        const pCriteria = rtObj.getCriteria(pClass)

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
            const maxVal = reportType === 'bulanan' ? 9 : 100
            if (num > maxVal) return
            setArchiveEditScores(prev => ({
                ...prev,
                [pStudent.id]: {
                    ...(prev[pStudent.id] || {}),
                    [key]: raw
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
            <div className="space-y-6 animate-fade-in">
                {/* Header detail */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setArchivePreview(null)} className="w-10 h-10 rounded-xl border border-[var(--color-border)] hover:bg-[var(--color-surface-alt)] flex items-center justify-center transition-all">
                            <ArrowLeft className="w-3.5 h-3.5 animate-pulse-horizontal" />
                        </button>
                        <div>
                            <h3 className="text-base font-black text-[var(--color-text)]">Detail Arsip: {pClass}</h3>
                            <p className="text-[11px] text-[var(--color-text-muted)] font-medium">
                                {isMonthly
                                    ? `${pBulan?.id_str || ''} ${pTahun} · ${pStu.length} santri`
                                    : `Sem. ${entry.semester} (${entry.academic_year}) · ${pStu.length} santri`
                                }
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button onClick={() => exportBulkPDF(entry)} className="h-10 px-5 rounded-xl bg-amber-500 text-white text-xs font-black shadow-lg shadow-amber-500/10 hover:bg-amber-600 transition-all flex items-center gap-2 active:scale-95">
                            <FileArchive className="w-3.5 h-3.5" /> Export PDF
                        </button>
                        <button onClick={() => openPrintWindow(pStu)} className="h-10 px-5 rounded-xl bg-indigo-500 text-white text-xs font-black shadow-lg shadow-indigo-500/10 hover:bg-indigo-600 transition-all flex items-center gap-2 active:scale-95">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Cetak Massal
                        </button>
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-6">
                    {/* Daftar Santri */}
                    <div className="w-full lg:w-64 xl:w-72 space-y-2 shrink-0">
                        <div className="p-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
                            <span className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] block mb-3">Daftar Santri</span>
                            <div className="space-y-1 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
                                {pStu.map(s => {
                                    const isCurrent = s.id === pStudent.id
                                    const studentScores = editSc(s.id)
                                    // Check complete
                                    const complete = pCriteria.every(c => studentScores[c.key] !== '' && studentScores[c.key] !== null && studentScores[c.key] !== undefined)
                                    return (
                                        <button key={s.id} onClick={() => { setPreviewStudentId(s.id); setArchiveEditMode(false) }}
                                            className={`w-full text-left p-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between border ${isCurrent ? 'bg-indigo-500/5 text-indigo-500 border-indigo-500/20 shadow-sm' : 'border-transparent text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] hover:text-[var(--color-text)]'}`}>
                                            <span className="truncate mr-2">{s.name}</span>
                                            {complete ? (
                                                <span className="w-4 h-4 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 text-[10px] font-black">✓</span>
                                            ) : (
                                                <span className="w-4 h-4 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 text-[10px] font-black">…</span>
                                            )}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Preview Area / Edit Mode */}
                    <div className="flex-1 min-w-0">
                        {archiveEditMode ? (
                            <div className="p-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] space-y-5">
                                <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-violet-500 text-white flex items-center justify-center shadow-lg shadow-violet-500/20 shrink-0">
                                            <Sliders className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-black text-[var(--color-text)]">Edit Mode: {pStudent.name}</h4>
                                            <p className="text-[10px] text-[var(--color-text-muted)] font-medium">Ubah nilai dan data tambahan untuk periode ini.</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Nilai Kriteria */}
                                <div className="space-y-2">
                                    <h5 className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] flex items-center gap-1.5">
                                        <ClipboardList className="w-3.5 h-3.5 opacity-50" /> Nilai Kriteria
                                    </h5>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                        {pCriteria.map(k => {
                                            const val = editSc(pStudent.id)?.[k.key] ?? '';
                                            const g = val !== '' ? getGradePredicate(val, reportType, previewClassLevel) : null;
                                            return (
                                                <div key={k.key} className="flex flex-col p-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] shadow-sm">
                                                    <span className="text-[9px] font-black" style={{ color: k.color || 'inherit' }}>{k.id}</span>
                                                    <span className="text-[7px] text-[var(--color-text-muted)] font-medium leading-none mb-1.5 truncate">{k.label || ''}</span>
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
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Fisik */}
                                    {rtObj.hasFisik && (
                                        <div className="space-y-2">
                                            <h5 className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Kondisi Fisik</h5>
                                            <div className="grid grid-cols-2 gap-2">
                                                {FISIK_FIELDS.map(f => (
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
                                    {rtObj.hasHafalan && (
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

                                {/* Ketidakhadiran */}
                                {rtObj.hasAttendance && (
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
                                                            placeholder="0"
                                                            value={editEx(pStudent.id)?.[item.key] ?? ''}
                                                            onChange={(e) => handleExtraEdit(item.key, e.target.value)}
                                                            className="w-10 h-7 text-center text-xs font-black rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] outline-none focus:border-indigo-500"
                                                        />
                                                        <span className="text-[8px] font-bold text-[var(--color-text-muted)]">hari</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Catatan */}
                                {rtObj.hasCatatan && (
                                    <div className="space-y-2">
                                        <h5 className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Catatan Wali Kelas</h5>
                                        <textarea
                                            placeholder="Tulis catatan perkembangan untuk santri..."
                                            value={editEx(pStudent.id)?.catatan ?? ''}
                                            onChange={(e) => handleExtraEdit('catatan', e.target.value)}
                                            className="w-full h-20 p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-xs font-medium outline-none focus:bg-[var(--color-surface)] focus:border-indigo-500/50 text-[var(--color-text)] resize-none transition-all"
                                        />
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="flex items-center gap-3 pt-4 border-t border-[var(--color-border)]">
                                    <button onClick={() => { setArchiveEditMode(false); setArchiveEditScores({}); setArchiveEditExtras({}) }}
                                        className="h-10 px-5 rounded-xl border border-[var(--color-border)] hover:bg-[var(--color-surface-alt)] text-[var(--color-text)] text-xs font-black transition-all active:scale-95">
                                        Batal
                                    </button>
                                    <button onClick={saveArchiveEdit} disabled={archiveEditSaving}
                                        className="flex-1 h-10 rounded-xl bg-indigo-500 text-white text-xs font-black shadow-lg shadow-indigo-500/10 hover:bg-indigo-600 disabled:opacity-60 transition-all active:scale-95 flex items-center justify-center gap-2">
                                        {archiveEditSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="p-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] flex flex-wrap items-center justify-between gap-3 shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <button onClick={() => setArchiveEditMode(true)} className="h-8 px-3 rounded-lg border border-[var(--color-border)] text-indigo-500 hover:bg-indigo-500/5 text-[10px] font-black flex items-center gap-1.5 transition-all">
                                            <Sliders className="w-3.5 h-3.5" /> Edit Nilai
                                        </button>
                                        <button onClick={() => sendWATextOnly(pStudent, editSc(pStudent.id), editEx(pStudent.id))} className="h-8 px-3 rounded-lg border border-[var(--color-border)] text-emerald-500 hover:bg-emerald-500/5 text-[10px] font-black flex items-center gap-1.5 transition-all">
                                            <WhatsAppIcon className="w-3.5 h-3.5" /> Kirim WA
                                        </button>
                                    </div>

                                    {/* Page Size & Language controls */}
                                    <div className="flex items-center gap-2">
                                        <select value={pageSize} onChange={e => setPageSize(e.target.value)} className="h-8 px-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[10px] font-black outline-none text-[var(--color-text)]">
                                            <option value="a4">Kertas A4</option>
                                            <option value="f4">Kertas F4/Folio</option>
                                        </select>
                                        <select value={lang} onChange={e => setLang(e.target.value)} className="h-8 px-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[10px] font-black outline-none text-[var(--color-text)]">
                                            <option value="ar">Bhs. Arab</option>
                                            <option value="id">Bhs. Indonesia</option>
                                        </select>
                                        <button onClick={() => setIsFullScreenPreview(true)} className="w-8 h-8 rounded-lg border border-[var(--color-border)] hover:bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] flex items-center justify-center transition-all">
                                            <Maximize2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto overflow-x-hidden bg-gray-50 dark:bg-slate-900/50 flex flex-col items-center custom-scrollbar p-6 min-h-[500px]">
                                    <div
                                        style={{ transform: `scale(${previewZoom})`, transformOrigin: 'top center' }}
                                        className="shadow-2xl h-fit cursor-pointer relative"
                                        onClick={() => setIsFullScreenPreview(true)}
                                    >
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
                                            selectedSemester={entry.semester}
                                            academicYear={entry.academic_year}
                                            selectedClass={pClass}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <button onClick={() => setStep(0)} className="w-10 h-10 rounded-xl border border-[var(--color-border)] hover:bg-[var(--color-surface-alt)] flex items-center justify-center transition-all">
                        <ArrowLeft className="w-3.5 h-3.5" />
                    </button>
                    <div>
                        <h3 className="text-base font-black text-[var(--color-text)]">Riwayat & Arsip</h3>
                        <p className="text-[11px] text-[var(--color-text-muted)] font-medium">Lihat dan kelola database raport yang telah disimpan.</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] shadow-sm">
                    {[{ id: 'list', label: 'Daftar Arsip', icon: Table }, { id: 'ringkasan', label: 'Statistik', icon: PieChart }].map(tab => (
                        <button key={tab.id} onClick={() => setArchiveTab(tab.id)}
                            className={`h-9 px-4 rounded-xl text-[11px] font-black flex items-center gap-2 transition-all ${archiveTab === tab.id ? 'bg-[var(--color-surface)] text-indigo-500 shadow-md border border-[var(--color-border)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}>
                            {(() => { const Icon = tab.icon; return <Icon className="w-3.5 h-3.5" /> })()} {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex flex-wrap gap-3 p-4 rounded-2xl bg-[var(--color-surface-alt)] border border-[var(--color-border)]">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                    <input type="text" placeholder="Cari kelas..." value={archiveSearch} onChange={e => setArchiveSearch(e.target.value)} className="w-full h-10 pl-10 pr-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-xs font-bold text-[var(--color-text)] outline-none focus:border-indigo-500/50 transition-all" />
                </div>
                {isMonthly ? (
                    <>
                        <select value={archiveFilter.year} onChange={e => setArchiveFilter(p => ({ ...p, year: e.target.value }))} className="h-10 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-xs font-bold text-[var(--color-text)] outline-none text-[var(--color-text)]">
                            <option value="">Semua Tahun</option>
                            {uniqueYears.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                        <select value={archiveFilter.month} onChange={e => setArchiveFilter(p => ({ ...p, month: e.target.value }))} className="h-10 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-xs font-bold text-[var(--color-text)] outline-none text-[var(--color-text)]">
                            <option value="">Semua Bulan</option>
                            {BULAN.map(b => <option key={b.id} value={b.id}>{b.id_str}</option>)}
                        </select>
                    </>
                ) : (
                    <>
                        <select value={archiveFilter.academic_year || ''} onChange={e => setArchiveFilter(p => ({ ...p, academic_year: e.target.value }))} className="h-10 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-xs font-bold text-[var(--color-text)] outline-none text-[var(--color-text)]">
                            <option value="">Semua Tahun Ajaran</option>
                            {uniqueYears.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                        <select value={archiveFilter.semester || ''} onChange={e => setArchiveFilter(p => ({ ...p, semester: e.target.value }))} className="h-10 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-xs font-bold text-[var(--color-text)] outline-none text-[var(--color-text)]">
                            <option value="">Semua Semester</option>
                            <option value="1">Semester 1 (Ganjil)</option>
                            <option value="2">Semester 2 (Genap)</option>
                        </select>
                    </>
                )}
            </div>

            {archiveLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                    <Skeleton className="h-3 w-2/3 rounded mb-2" />
                                    <Skeleton className="h-2.5 w-1/2 rounded" />
                                </div>
                                <Skeleton className="h-4 w-12 rounded-full" />
                            </div>
                            <Skeleton className="h-1.5 w-full rounded-full mb-3" />
                            <div className="flex gap-1.5">
                                <Skeleton className="flex-1 h-8 rounded-lg" />
                                <Skeleton className="flex-1 h-8 rounded-lg" />
                                <Skeleton className="h-8 w-8 rounded-lg" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : archiveTab === 'ringkasan' ? (() => {
                const latestEntry = archiveList.length ? archiveList[0] : null
                
                let periodEntries = []
                let periodTitle = ''
                let periodSub = ''

                if (isMonthly) {
                    const targetMonth = archiveFilter.month ? Number(archiveFilter.month) : null
                    const targetYear = archiveFilter.year ? Number(archiveFilter.year) : null
                    const useMonth = targetMonth ?? latestEntry?.month
                    const useYear = targetYear ?? latestEntry?.year
                    const bulanLabel = BULAN.find(b => b.id === useMonth)?.id_str ?? '—'
                    
                    periodEntries = archiveList.filter(e =>
                        e.month === useMonth && e.year === useYear &&
                        (!archiveFilter.classId || e.class_id === archiveFilter.classId) &&
                        (!archiveSearch || e.class_name.toLowerCase().includes(archiveSearch.toLowerCase()))
                    )
                    periodTitle = `Ringkasan ${bulanLabel} ${useYear || ''}`
                    periodSub = `${periodEntries.length} kelas · ${periodEntries.reduce((a, e) => a + e.count, 0)} santri · ${periodEntries.reduce((a, e) => a + e.completed, 0)} raport lengkap`
                } else {
                    const targetSem = archiveFilter.semester ? Number(archiveFilter.semester) : null
                    const targetAcadYear = archiveFilter.academic_year || null
                    const useSem = targetSem ?? latestEntry?.semester
                    const useAcadYear = targetAcadYear ?? latestEntry?.academic_year
                    
                    periodEntries = archiveList.filter(e =>
                        e.semester === useSem && e.academic_year === useAcadYear &&
                        (!archiveFilter.classId || e.class_id === archiveFilter.classId) &&
                        (!archiveSearch || e.class_name.toLowerCase().includes(archiveSearch.toLowerCase()))
                    )
                    periodTitle = `Ringkasan Semester ${useSem || ''} (${useAcadYear || ''})`
                    periodSub = `${periodEntries.length} kelas · ${periodEntries.reduce((a, e) => a + e.count, 0)} santri · ${periodEntries.reduce((a, e) => a + e.completed, 0)} raport lengkap`
                }

                if (!periodEntries.length) return (
                    <EmptyState
                        variant="dashed"
                        color="slate"
                        icon={PieChart}
                        title="Tidak ada data statistik"
                        description="Pilih filter bulan/tahun yang memiliki data arsip untuk melihat ringkasan performa kelas."
                    />
                )

                return (
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 p-3 rounded-xl border border-[var(--color-border)] bg-gradient-to-r from-indigo-500/5 to-emerald-500/5">
                            <div className="w-9 h-9 rounded-xl bg-indigo-500/15 flex items-center justify-center shrink-0">
                                <PieChart className="w-4 h-4 text-indigo-500" />
                            </div>
                            <div>
                                <p className="text-[12px] font-black text-[var(--color-text)]">{periodTitle}</p>
                                <p className="text-[9px] text-[var(--color-text-muted)]">{periodSub}</p>
                            </div>
                            <div className="flex-1" />
                            <div className="text-right">
                                <p className="text-[9px] text-[var(--color-text-muted)] font-bold">Kelengkapan rata-rata</p>
                                <p className="text-[18px] font-black text-emerald-500">
                                    {(() => { const total = periodEntries.reduce((a, e) => a + e.count, 0); const done = periodEntries.reduce((a, e) => a + e.completed, 0); return total ? Math.round(done / total * 100) : 0 })()}%
                                </p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Progress per Kelas</p>
                            {[...periodEntries].sort((a, b) => (b.completed / (b.count || 1)) - (a.completed / (a.count || 1))).map(entry => {
                                const pct = entry.count ? Math.round(entry.completed / entry.count * 100) : 0
                                const barColor = pct === 100 ? '#10b981' : pct >= 70 ? '#6366f1' : pct >= 40 ? '#f59e0b' : '#ef4444'
                                return (
                                    <div key={entry.key} className="flex items-center gap-3 p-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-indigo-500/20 transition-all group cursor-pointer"
                                        onClick={() => loadArchiveDetail(entry)}>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-[11px] font-black text-[var(--color-text)] truncate">{entry.class_name}</span>
                                                <span className="text-[10px] font-black shrink-0 ml-2" style={{ color: barColor }}>{pct}%</span>
                                            </div>
                                            <div className="h-2 rounded-full bg-[var(--color-surface-alt)] overflow-hidden">
                                                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: barColor }} />
                                            </div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[8px] text-[var(--color-text-muted)]">{entry.completed}/{entry.count} santri lengkap</span>
                                                {entry.musyrif && <span className="text-[8px] text-[var(--color-text-muted)] opacity-60">· {entry.musyrif}</span>}
                                            </div>
                                        </div>
                                        <svg width="44" height="28" viewBox="0 0 44 28" className="shrink-0 opacity-60 group-hover:opacity-100 transition-all" aria-hidden="true">
                                            <rect x="0" y="0" width="44" height="28" rx="5" fill="var(--color-surface-alt)" />
                                            <rect x="4" y={28 - 4 - (pct / 100) * 20} width="16" height={(pct / 100) * 20 + 4} rx="3" fill={barColor} opacity="0.85" />
                                            <rect x="24" y={28 - 4 - ((entry.count ? entry.completed / entry.count : 0) * 20)} width="16" height={((entry.count ? entry.completed / entry.count : 0) * 20) + 4} rx="3" fill={barColor} opacity="0.4" />
                                        </svg>
                                    </div>
                                )
                            })}
                        </div>

                        <div className="space-y-2">
                            <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Heatmap Kriteria (dari arsip ter-load)</p>
                            <div className="overflow-x-auto rounded-xl border border-[var(--color-border)]">
                                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 400 }}>
                                    <thead>
                                        <tr style={{ background: 'var(--color-surface-alt)', borderBottom: '1px solid var(--color-border)' }}>
                                            <th className="px-3 py-2 text-left text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Kelas</th>
                                            {criteria.map(k => (
                                                <th key={k.key} className="px-2 py-2 text-center text-[9px] font-black" style={{ color: k.color || 'inherit' }}>{k.id}</th>
                                            ))}
                                            <th className="px-2 py-2 text-center text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Lengkap</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {periodEntries.map((entry, idx) => {
                                            const pct = entry.count ? entry.completed / entry.count : 0
                                            return (
                                                <tr key={entry.key} style={{ borderBottom: idx < periodEntries.length - 1 ? '1px solid var(--color-border)' : 'none' }}
                                                    className="hover:bg-[var(--color-surface-alt)] transition-all cursor-pointer" onClick={() => loadArchiveDetail(entry)}>
                                                    <td className="px-3 py-2">
                                                        <span className="text-[10px] font-black text-[var(--color-text)]">{entry.class_name}</span>
                                                    </td>
                                                    {criteria.map(k => (
                                                        <td key={k.key} className="px-2 py-2 text-center">
                                                            <div className="w-8 h-6 rounded-md mx-auto flex items-center justify-center text-[9px] font-black"
                                                                style={{ background: pct >= 0.9 ? (k.color || '#6366f1') + '20' : pct >= 0.5 ? (k.color || '#6366f1') + '10' : 'var(--color-surface-alt)', color: k.color || 'inherit', opacity: 0.5 + pct * 0.5 }}>
                                                                {pct >= 0.9 ? '✓' : pct >= 0.5 ? '…' : '—'}
                                                            </div>
                                                        </td>
                                                    ))}
                                                    <td className="px-2 py-2 text-center">
                                                        <span className="text-[10px] font-black" style={{ color: pct === 1 ? '#10b981' : pct >= 0.5 ? '#f59e0b' : '#ef4444' }}>
                                                            {Math.round(pct * 100)}%
                                                        </span>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            <p className="text-[8px] text-[var(--color-text-muted)] opacity-60">💡 Klik baris untuk buka detail kelas dan lihat nilai per santri.</p>
                        </div>
                    </div>
                )
            })() : filtered.length === 0 ? (
                <EmptyState
                    variant="dashed"
                    color="slate"
                    icon={Archive}
                    title="Arsip tidak ditemukan"
                    description={archiveSearch || archiveFilter.classId || (isMonthly ? archiveFilter.month : archiveFilter.semester)
                        ? 'Coba ubah filter atau hapus pencarian untuk menemukan arsip yang kamu cari.'
                        : 'Belum ada raport yang tersimpan. Selesaikan input nilai di step 2, lalu simpan untuk membuat arsip.'}
                    action={(archiveSearch || archiveFilter.classId || (isMonthly ? archiveFilter.month : archiveFilter.semester)) && (
                        <button onClick={() => { setArchiveSearch(''); setArchiveFilter({ classId: '', year: '', month: '', semester: '', academic_year: '' }) }}
                            className="h-9 px-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[11px] font-black hover:text-[var(--color-text)] transition-all flex items-center gap-2 mx-auto active:scale-95 shadow-sm">
                            <X className="w-3.5 h-3.5" /> Reset Filter
                        </button>
                    )}
                />
            ) : (
                <div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {cardsToRender.map(entry => {
                            const isMonthlyCard = !entry.report_type || entry.report_type === 'bulanan'
                            const pct = entry.count ? Math.round((entry.completed / entry.count) * 100) : 0
                            const subtitleText = isMonthlyCard
                                ? `${BULAN.find(b => b.id === entry.month)?.id_str} ${entry.year}`
                                : `Sem. ${entry.semester} (${entry.academic_year})`

                            return (
                                <div key={entry.key} className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-emerald-500/30 transition-all">
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <div className="text-[11px] font-black text-[var(--color-text)]">{entry.class_name}</div>
                                            <div className="text-[10px] text-[var(--color-text-muted)] font-bold mt-0.5">{subtitleText} · {entry.lang === 'ar' ? 'عربي' : 'Indonesia'}</div>
                                        </div>
                                        <span className={`text-[8px] font-black px-2 py-0.5 rounded-full ${entry.lang === 'ar' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-indigo-500/10 text-indigo-600'}`}>
                                            {entry.lang === 'ar' ? 'Pondok' : 'Reguler'}
                                        </span>
                                    </div>
                                    <div className="mb-3">
                                        <div className="flex justify-between text-[9px] font-bold text-[var(--color-text-muted)] mb-1">
                                            <span>{entry.completed}/{entry.count} lengkap</span>
                                            <span>{pct}%</span>
                                        </div>
                                        <div className="h-1.5 rounded-full bg-[var(--color-surface-alt)] overflow-hidden">
                                            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: pct === 100 ? '#10b981' : pct > 50 ? '#6366f1' : '#f59e0b' }} />
                                        </div>
                                    </div>
                                    {entry.musyrif && (
                                        <div className="text-[9px] text-[var(--color-text-muted)] mb-3 flex items-center gap-1">
                                            <Users className="w-3 h-3 opacity-50" /> {entry.musyrif}
                                        </div>
                                    )}
                                    <div className="flex gap-1.5">
                                        <button onClick={() => loadArchiveDetail(entry)} className="flex-1 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 text-[10px] font-black flex items-center justify-center gap-1.5 hover:bg-indigo-500/20 transition-all">
                                            <Search className="w-3.5 h-3.5" /> Preview
                                        </button>
                                        <button onClick={() => exportBulkPDF(entry)} className="flex-1 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 text-[10px] font-black flex items-center justify-center gap-1.5 hover:bg-amber-500/20 transition-all">
                                            <FileArchive className="w-3.5 h-3.5" /> Export PDF
                                        </button>
                                        <button onClick={() => setConfirmDelete(entry)} aria-label={`Hapus arsip ${entry.class_name}`} className="h-8 w-8 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center hover:bg-red-500/20 transition-all">
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                    {filtered.length > archiveVisibleCount && (
                        <div className="flex justify-center mt-8">
                            <button
                                onClick={() => setArchiveVisibleCount(prev => prev + 12)}
                                className="h-9 px-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-alt)] hover:text-indigo-500 hover:border-indigo-500/30 text-[var(--color-text)] text-[11px] font-black transition-all active:scale-95 shadow-sm flex items-center gap-2"
                            >
                                <ChevronDown className="w-3.5 h-3.5" />
                                Muat Lebih Banyak ({filtered.length - archiveVisibleCount} Kelas Tersisa)
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
