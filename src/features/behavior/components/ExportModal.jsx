import React, { useState, useMemo, useRef, useEffect } from 'react'
import {
    ArrowLeftRight,
    ArrowUpDown,
    Calendar,
    CircleCheck,
    ClipboardList,
    FileOutput,
    FilePen,
    FileSpreadsheet,
    FileText,
    Heading,
    School,
    Settings,
    SlidersHorizontal,
    Star,
    Tags,
    TriangleAlert,
    User
} from 'lucide-react'
import Modal from '@shared/components/Modal'
import { useLanguage } from '@context'

const COLUMN_DEFS = [
    { key: 'reported_at', label: 'colDate', icon: Calendar },
    { key: 'student', label: 'colStudent', icon: User },
    { key: 'class', label: 'colClass', icon: School },
    { key: 'rule', label: 'colRule', icon: Tags },
    { key: 'points', label: 'colPoints', icon: Star },
    { key: 'notes', label: 'colNotes', icon: FileText },
    { key: 'teacher', label: 'colTeacher', icon: FilePen },
]

const PRESETS = [
    { id: 'all', label: 'exportPresetLengkap', cols: ['reported_at', 'student', 'class', 'rule', 'points', 'notes', 'teacher'] },
    { id: 'summary', label: 'exportPresetRingkasan', cols: ['student', 'class', 'rule', 'points'] },
    { id: 'minimal', label: 'exportPresetDaftar', cols: ['reported_at', 'student', 'class', 'rule'] },
]

export default function ExportModal({
    isOpen,
    onClose,
    reportsCount,
    selectedCount,
    exportScope,
    setExportScope,
    exportColumns,
    setExportColumns,
    exporting,
    handleExportCSV,
    handleExportExcel,
    handleExportPDF,
    addToast,
}) {
    const { language, t, tNum } = useLanguage()
    const tp = (key) => t(`behavior.${key}`)

    const [fileName, setFileName] = useState('')
    const [advancedOpen, setAdvancedOpen] = useState(false)
    const [pdfOrientation, setPdfOrientation] = useState('landscape') // 'landscape' | 'portrait'
    const [includeHeader, setIncludeHeader] = useState(true)
    const containerRef = useRef(null)

    useEffect(() => {
        if (isOpen) {
            setFileName(`${tp('exportFilenamePrefix')}_${new Date().toISOString().slice(0, 10)}`)
        }
    }, [isOpen, language])

    useEffect(() => {
        if (exporting && containerRef.current) {
            const scrollContainer = containerRef.current.parentElement
            if (scrollContainer) {
                scrollContainer.scrollTop = 0
            }
        }
    }, [exporting])

    const activePresetId = useMemo(() => {
        const sortedCols = [...exportColumns].sort().join(',')
        const active = PRESETS.find(preset => {
            const presetSorted = [...preset.cols].sort().join(',')
            return sortedCols === presetSorted
        })
        return active ? active.id : null
    }, [exportColumns])

    if (!isOpen) return null

    const handlePresetClick = (cols) => {
        setExportColumns(cols)
    }

    const columnButtons = COLUMN_DEFS.map(({ key, label, icon }) => {
        const Icon = icon
        const orderIdx = exportColumns.indexOf(key) + 1
        const isSelected = orderIdx > 0

        const toggleColumn = () => {
            if (isSelected) {
                setExportColumns(prev => prev.filter(k => k !== key))
            } else {
                setExportColumns(prev => [...prev, key])
            }
        }

        return (
            <button
                key={key}
                onClick={toggleColumn}
                className={`group relative flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl border text-left transition-all
                    ${isSelected
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 text-[var(--color-primary)] shadow-sm'
                        : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-surface-alt)]'}
                `}
            >
                <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-all 
                    ${isSelected ? 'bg-[var(--color-primary)] text-white shadow-sm' : 'bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] group-hover:text-[var(--color-primary)]'}`}>
                    <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className={`text-xs font-bold uppercase tracking-tight truncate ${isSelected ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'}`}>{tp(label)}</div>
                </div>
                {isSelected && (
                    <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[var(--color-primary)] text-white text-xs font-bold flex items-center justify-center shadow-md border border-white dark:border-[var(--color-surface)] animate-in zoom-in duration-200">
                        {tNum(orderIdx)}
                    </div>
                )}
            </button>
        )
    })

    const exportOptions = {
        includeHeader,
        orientation: pdfOrientation
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={tp('exportTitle')}
            description={tp('exportDesc')}
            icon={FileOutput}
            iconBg="bg-amber-500/10"
            iconColor="text-amber-600"
            size="lg"
            mobileVariant="bottom-sheet"
            contentClassName={exporting ? "relative !overflow-hidden" : "relative"}
            footer={
                <div className="flex items-center w-full">
                    <button
                        onClick={onClose}
                        className="h-10 px-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] text-xs font-bold uppercase tracking-wide hover:bg-[var(--color-surface-alt)] transition-all flex items-center justify-center"
                    >
                        {tp('exportClose')}
                    </button>
                    <div className="flex-1" />
                </div>
            }
        >
            <div ref={containerRef}>
                {/* Overlay Loading Premium */}
                {exporting && (
                    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[var(--color-surface)] animate-in fade-in duration-300">
                        <div className="bg-[var(--color-surface)] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.12)] border border-[var(--color-border)]/60 rounded-3xl p-8 flex flex-col items-center gap-5 scale-110 animate-in zoom-in-95 duration-300">
                            <div className="relative w-16 h-16">
                                <div className="absolute inset-0 rounded-full bg-[var(--color-primary)]/10 animate-ping opacity-75"></div>
                                <div className="absolute inset-0 rounded-full border-2 border-[var(--color-primary)]/10"></div>
                                <div
                                    className="absolute inset-0 rounded-full border-2 border-transparent border-t-[var(--color-primary)] border-r-[var(--color-primary)] animate-spin"
                                    style={{ filter: 'drop-shadow(0 0 4px var(--color-primary))' }}
                                ></div>
                                <div className="absolute inset-0 m-auto w-10 h-10 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)]/60 flex items-center justify-center shadow-sm z-10">
                                    <FileOutput className="w-4 h-4 text-[var(--color-primary)] animate-pulse" />
                                </div>
                            </div>
                            <div className="flex flex-col items-center">
                                <span className="text-xs font-bold uppercase tracking-wide text-[var(--color-primary)]">{tp('exportLoading')}</span>
                                <span className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wide mt-1.5 flex items-center gap-1">
                                    {tp('exportLoadingDesc')}
                                    <span className="inline-flex gap-0.5 items-center">
                                        <span className="w-1 h-1 rounded-full bg-[var(--color-text-muted)] animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                        <span className="w-1 h-1 rounded-full bg-[var(--color-text-muted)] animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                        <span className="w-1 h-1 rounded-full bg-[var(--color-text-muted)] animate-bounce" style={{ animationDelay: '300ms' }}></span>
                                    </span>
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                <div className={`space-y-6 pb-2 transition-all duration-500 ${exporting ? 'blur-sm grayscale-[0.5] opacity-50 pointer-events-none' : ''}`}>
                    {/* Section 1: Scope */}
                    <div className="space-y-3">
                        <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)] opacity-70">{tp('exportScopeTitle')}</p>
                        <div className="grid grid-cols-3 gap-2.5">
                            {[
                                { val: 'filtered', label: tp('exportScopeFilter'), desc: `${tNum(reportsCount)} ${t('behavior.reports')}`, icon: SlidersHorizontal },
                                { val: 'selected', label: tp('exportScopeSelected'), desc: `${tNum(selectedCount)} ${t('behavior.reports')}`, icon: CircleCheck, disabled: selectedCount === 0 },
                                { val: 'all', label: tp('exportScopeAll'), desc: tp('exportScopeNoFilter'), icon: ClipboardList },
                            ].map(({ val, label, desc, icon, disabled }) => {
                                const Icon = icon
                                return (
                                <button
                                    key={val}
                                    type="button"
                                    onClick={() => !disabled && setExportScope(val)}
                                    disabled={disabled}
                                    className={`group p-3 rounded-2xl border-2 text-left transition-all
                                    ${exportScope === val
                                            ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5'
                                            : 'border-[var(--color-border)] hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-surface-alt)]'}
                                    ${disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer active:scale-95'}
                                    `}
                                >
                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-2 transition-all 
                                        ${exportScope === val ? 'bg-[var(--color-primary)] text-white shadow-lg' : 'bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] group-hover:bg-[var(--color-primary)]/10'}`}>
                                        <Icon className="w-4 h-4" />
                                    </div>
                                    <div className="text-xs font-bold text-[var(--color-text)] mb-0.5">{label}</div>
                                    <div className="text-xs font-bold text-[var(--color-text-muted)] leading-tight">{desc}</div>
                                </button>
                                )
                            })}
                        </div>
                    </div>

                    {/* Section 2: Columns */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)] opacity-70">{tp('exportColPresetTitle')}</p>
                            <div className="flex gap-2">
                                <button type="button" onClick={() => handlePresetClick(COLUMN_DEFS.map(c => c.key))} className="text-xs font-bold text-[var(--color-primary)] hover:underline uppercase tracking-wide bg-[var(--color-primary)]/5 px-2 py-1 rounded-lg transition-colors">{tp('exportColPresetAll')}</button>
                                <button type="button" onClick={() => handlePresetClick(['student', 'class', 'rule', 'points'])} className="text-xs font-bold text-rose-500 hover:underline uppercase tracking-wide bg-rose-500/5 px-2 py-1 rounded-lg transition-colors">{tp('exportColPresetReset')}</button>
                            </div>
                        </div>

                        {/* Presets Sub-section with label and horizontal scroll */}
                        <div className="flex flex-col gap-2 p-3 bg-[var(--color-surface-alt)]/40 rounded-2xl border border-[var(--color-border)]/50">
                            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] opacity-60">
                                <Tags className="w-4 h-4" />
                                <span>{tp('exportPresetHeader')}</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {PRESETS.map(preset => {
                                    const isActive = activePresetId === preset.id
                                    return (
                                        <button
                                            key={preset.id}
                                            type="button"
                                            onClick={() => handlePresetClick(preset.cols)}
                                            className={`px-3 py-1 rounded-full border text-xs font-bold uppercase tracking-wider transition-all active:scale-95 shrink-0
                                                ${isActive
                                                    ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-sm'
                                                    : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)]/40 hover:text-[var(--color-primary)]'}`}
                                        >
                                            {tp(preset.label)}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Divider Line */}
                        <div className="relative flex items-center justify-center my-1">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-dashed border-[var(--color-border)]/65"></div>
                            </div>
                            <div className="relative bg-[var(--color-surface)] px-3 text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)] opacity-50">
                                {tp('exportCustomCol')}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {columnButtons}
                        </div>
                    </div>

                    {/* Section 3: Filename & Advanced */}
                    <div className="space-y-3">
                        <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)] opacity-70">{tp('exportConfigTitle')}</p>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="flex-1 relative">
                                <input
                                    type="text"
                                    value={fileName}
                                    onChange={(e) => setFileName(e.target.value)}
                                    placeholder={tp('exportConfigPlaceholder')}
                                    className="w-full bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-xl px-4 py-3 text-xs font-bold focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/20 transition-all placeholder:opacity-50 pr-20"
                                />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-1 rounded bg-[var(--color-border)] text-xs font-bold uppercase text-[var(--color-text-muted)]">
                                    .xlsx / .csv / .pdf
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setAdvancedOpen(!advancedOpen)}
                                className={`px-4 py-3 rounded-xl border transition-all flex items-center gap-2 text-xs font-bold
                                    ${advancedOpen ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white' : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)]/40'}`}
                            >
                                <Settings className={advancedOpen ? 'animate-spin-slow w-4 h-4' : 'w-4 h-4'} />
                                {tp('exportConfigOptions')}
                            </button>
                        </div>

                        {advancedOpen && (
                            <div className="p-4 rounded-2xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] flex items-center gap-1.5">
                                        <Heading className="w-4 h-4" />
                                        {tp('exportConfigHeader')}
                                    </label>
                                    <div className="flex gap-1 bg-[var(--color-surface)] p-1 rounded-lg border border-[var(--color-border)]">
                                        {[{ v: true, l: tp('exportConfigHeaderYes') }, { v: false, l: tp('exportConfigHeaderNo') }].map(opt => (
                                            <button
                                                key={String(opt.v)}
                                                type="button"
                                                onClick={() => setIncludeHeader(opt.v)}
                                                className={`flex-1 py-1 rounded-md text-xs font-bold uppercase transition-all ${includeHeader === opt.v ? 'bg-[var(--color-primary)] text-white shadow-sm' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]'}`}
                                            >
                                                {opt.l}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] flex items-center gap-1.5">
                                        <ArrowLeftRight className="w-4 h-4" />
                                        {tp('exportConfigPdf')}
                                    </label>
                                    <div className="flex gap-1 bg-[var(--color-surface)] p-1 rounded-lg border border-[var(--color-border)]">
                                        {[
                                            { v: 'landscape', l: 'Landscape', icon: ArrowLeftRight },
                                            { v: 'portrait', l: 'Portrait', icon: ArrowUpDown }
                                        ].map(opt => (
                                            <button
                                                key={opt.v}
                                                type="button"
                                                onClick={() => setPdfOrientation(opt.v)}
                                                className={`flex-1 py-1 rounded-md text-xs font-bold uppercase transition-all flex items-center justify-center gap-1.5 ${pdfOrientation === opt.v ? 'bg-[var(--color-primary)] text-white shadow-sm' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]'}`}
                                            >
                                                <opt.icon className="text-xs" />
                                                {opt.l}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Section 4: Format Grid */}
                    <div className="space-y-3">
                        <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)] opacity-70">{tp('exportStartTitle')}</p>
                        <div className="grid grid-cols-3 gap-2.5">
                            {[
                                { label: 'CSV', icon: FileSpreadsheet, desc: 'Universal', onClick: () => handleExportCSV(fileName, exportOptions), color: 'hover:border-slate-400 hover:bg-slate-50', iconColor: 'text-slate-500' },
                                { label: 'Excel', icon: FileSpreadsheet, desc: '.xlsx', onClick: () => handleExportExcel(fileName), color: 'hover:border-emerald-400 hover:bg-emerald-50 text-emerald-700', iconColor: 'text-emerald-500' },
                                { label: 'PDF Tabel', icon: FileText, desc: 'Tabel', onClick: () => handleExportPDF(fileName, exportOptions), color: 'hover:border-rose-400 hover:bg-rose-50 text-rose-700', iconColor: 'text-rose-500' },
                            ].map(({ label, icon, desc, onClick, color, iconColor }) => {
                                const Icon = icon
                                return (
                                <button
                                    key={label}
                                    type="button"
                                    onClick={onClick}
                                    disabled={exporting || exportColumns.length === 0}
                                    className={`relative group h-24 rounded-2xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col items-center justify-center gap-1 transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 ${color}`}
                                >
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-1 transition-transform group-hover:scale-110 ${iconColor} bg-[var(--color-surface-alt)]`}>
                                        <Icon className="w-5 h-5" />
                                    </div>
                                    <span className="text-xs font-bold uppercase tracking-wide">{label}</span>
                                    <span className="text-xs font-bold opacity-60 uppercase">{desc}</span>
                                </button>
                                )
                            })}
                        </div>
                    </div>

                    {exportColumns.length === 0 && (
                        <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-red-500/5 border border-red-500/10 text-red-600 text-xs font-bold uppercase tracking-tight animate-pulse">
                            <TriangleAlert className="w-4 h-4" />
                            {tp('exportWarning')}
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    )
}
