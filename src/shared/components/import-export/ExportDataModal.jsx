import { useEffect, useRef, useState } from 'react'
import {
    ArrowLeftRight, ArrowUpDown, CircleCheck, FileOutput, FileSpreadsheet,
    FileText, Heading, Settings, SlidersHorizontal, Tags, TriangleAlert, Users
} from 'lucide-react'
import Modal from '@shared/components/Modal'
import { useLanguage } from '@context'

/**
 * ExportDataModal — modal export 4 seksi (Jangkauan → Kolom & Presets →
 * Konfigurasi File → Format) yang reusable. Logika pengambilan data & penulisan
 * file tetap milik hook/page fitur lewat handler yang di-inject.
 *
 * Props:
 * - isOpen / onClose / exporting
 * - items          : array data ter-filter saat ini (untuk deskripsi scope)
 * - selectedIds    : id terpilih (scope 'selected'; disable jika kosong)
 * - exportScope / setExportScope      : 'filtered' | 'selected' | 'all'
 * - exportColumns / setExportColumns  : array key kolom terpilih (berurutan)
 * - handleExportCSV(filename, { includeHeader, orientation })
 * - handleExportExcel(filename)
 * - handleExportPDF(filename, { includeHeader, orientation })
 *
 * config:
 *   title, description, icon (default FileOutput), iconBg, iconColor, size
 *   entityNoun     : 'siswa' | 'kelas' | ... untuk deskripsi count
 *   columnDefs     : [{ key, label, icon }]  (urutan = urutan kolom export)
 *   presets        : [{ id, label, cols }]
 *   defaultFileName: 'Data Siswa' (tanggal otomatis disuffix)
 *   resetCols      : [key] untuk tombol Reset (default: 2 kolom pertama)
 *   advanced       : { includeHeader: bool (default true), pdfOrientation: bool (default true) }
 */
export default function ExportDataModal({
    isOpen, onClose, exporting,
    items = [], selectedIds = [],
    exportScope, setExportScope,
    exportColumns, setExportColumns,
    handleExportCSV, handleExportExcel, handleExportPDF,
    config
}) {
    const { t, tNum } = useLanguage()
    const cfg = config || {}
    const columnDefs = cfg.columnDefs || []
    const presets = cfg.presets || []
    const advancedCfg = { includeHeader: true, pdfOrientation: true, ...(cfg.advanced || {}) }

    const [fileName, setFileName] = useState(`${cfg.defaultFileName || 'Data'} ${new Date().toISOString().slice(0, 10)}`)
    const [advancedOpen, setAdvancedOpen] = useState(false)
    const [pdfOrientation, setPdfOrientation] = useState('landscape')
    const [includeHeader, setIncludeHeader] = useState(advancedCfg.includeHeader)
    const containerRef = useRef(null)

    useEffect(() => {
        if (exporting && containerRef.current) {
            const scrollContainer = containerRef.current.parentElement
            if (scrollContainer) scrollContainer.scrollTop = 0
        }
    }, [exporting])

    // Pencocokan preset murah (jumlah preset kecil) — tanpa useMemo agar stabil terhadap
    // config yang dibangun per-render di page.
    const activePresetId = (() => {
        const sortedCols = [...exportColumns].sort().join(',')
        const active = presets.find(preset => [...preset.cols].sort().join(',') === sortedCols)
        return active ? active.id : null
    })()

    if (!isOpen) return null

    const resetCols = cfg.resetCols || columnDefs.slice(0, 2).map(c => c.key)
    const exportOptions = { includeHeader, orientation: pdfOrientation }

    const formatButtons = [
        { label: 'CSV', icon: FileSpreadsheet, desc: t('shared.export.formatCsvDesc'), onClick: () => handleExportCSV(fileName, exportOptions), color: 'hover:border-slate-400 hover:bg-slate-50', iconColor: 'text-slate-500' },
        { label: 'Excel', icon: FileSpreadsheet, desc: '.xlsx', onClick: () => handleExportExcel(fileName), color: 'hover:border-success hover:bg-success/5 text-success', iconColor: 'text-success' },
        { label: 'PDF', icon: FileText, desc: t('shared.export.formatPdfDesc'), onClick: () => handleExportPDF(fileName, exportOptions), color: 'hover:border-danger hover:bg-danger/5 text-danger', iconColor: 'text-danger' },
        ...(cfg.extraFormats || []),
    ]
    const formatGridCols = { 3: 'sm:grid-cols-3', 4: 'sm:grid-cols-4', 5: 'sm:grid-cols-5' }[formatButtons.length] || 'sm:grid-cols-3'

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={cfg.title}
            description={cfg.description}
            icon={cfg.icon || FileOutput}
            iconBg={cfg.iconBg || 'bg-amber-500/10'}
            iconColor={cfg.iconColor || 'text-amber-600'}
            size={cfg.size || 'lg'}
            mobileVariant="bottom-sheet"
            contentClassName={exporting ? 'relative !overflow-hidden' : 'relative'}
            footer={
                <div className="flex items-center w-full">
                    <button
                        type="button"
                        onClick={onClose}
                        className="h-10 px-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] text-xs font-bold uppercase tracking-wide hover:bg-[var(--color-surface-alt)] transition-all flex items-center justify-center"
                    >
                        {t('shared.export.close')}
                    </button>
                    <div className="flex-1" />
                </div>
            }
        >
            <div ref={containerRef}>
                {/* Overlay loading saat export berjalan */}
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
                                <span className="text-xs font-bold uppercase tracking-wide text-[var(--color-primary)]">{t('shared.export.processing')}</span>
                                <span className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wide mt-1.5 flex items-center gap-1">
                                    {t('shared.export.processingDesc')}
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
                    {/* Seksi 1: Jangkauan data */}
                    <div className="space-y-3">
                        <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)] opacity-70">1 — {t('shared.export.scopeTitle')}</p>
                        <div className="grid grid-cols-3 gap-2.5">
                            {[
                                { val: 'filtered', label: t('shared.export.scopeFiltered'), desc: `${tNum(items.length)} ${cfg.entityNoun || ''}`.trim(), icon: SlidersHorizontal },
                                { val: 'selected', label: t('shared.export.scopeSelected'), desc: `${tNum(selectedIds.length)} ${cfg.entityNoun || ''}`.trim(), icon: CircleCheck, disabled: selectedIds.length === 0 },
                                { val: 'all', label: t('shared.export.scopeAll'), desc: t('shared.export.scopeNoFilter'), icon: Users },
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
                                        ${disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer active:scale-95'}`}
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

                    {/* Seksi 2: Kolom & presets */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)] opacity-70">2 — {t('shared.export.columnsTitle')}</p>
                            <div className="flex gap-2">
                                <button type="button" onClick={() => setExportColumns(columnDefs.map(c => c.key))} className="text-xs font-bold text-[var(--color-primary)] hover:underline uppercase tracking-wide bg-[var(--color-primary)]/5 px-2 py-1 rounded-lg transition-colors">{t('shared.export.all')}</button>
                                <button type="button" onClick={() => setExportColumns(resetCols)} className="text-xs font-bold text-danger hover:underline uppercase tracking-wide bg-danger/5 px-2 py-1 rounded-lg transition-colors">{t('shared.export.reset')}</button>
                            </div>
                        </div>

                        {presets.length > 0 && (
                            <div className="flex flex-col gap-2 p-3 bg-[var(--color-surface-alt)]/40 rounded-2xl border border-[var(--color-border)]/50">
                                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] opacity-60">
                                    <Tags className="w-4 h-4" />
                                    <span>{t('shared.export.choosePreset')}</span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {presets.map(preset => {
                                        const isActive = activePresetId === preset.id
                                        return (
                                            <button
                                                key={preset.id}
                                                type="button"
                                                onClick={() => setExportColumns(preset.cols)}
                                                className={`px-3 py-1 rounded-full border text-xs font-bold uppercase tracking-wider transition-all active:scale-95 shrink-0
                                                ${isActive
                                                    ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-sm'
                                                    : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)]/40 hover:text-[var(--color-primary)]'}`}
                                            >
                                                {preset.label}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                        <div className="relative flex items-center justify-center my-1">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-dashed border-[var(--color-border)]/65"></div>
                            </div>
                            <div className="relative bg-[var(--color-surface)] px-3 text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)] opacity-50">
                                {t('shared.export.customCols')}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {columnDefs.map(({ key, label, icon: Icon }) => {
                                const orderIdx = exportColumns.indexOf(key) + 1
                                const isSelected = orderIdx > 0
                                const toggleColumn = () => {
                                    setExportColumns(prev => isSelected
                                        ? prev.filter(k => k !== key)
                                        : [...prev, key])
                                }
                                return (
                                    <button
                                        key={key}
                                        type="button"
                                        onClick={toggleColumn}
                                        className={`group relative flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl border text-left transition-all
                                        ${isSelected
                                            ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 text-[var(--color-primary)] shadow-sm'
                                            : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-surface-alt)]'}`}
                                    >
                                        <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-all
                                        ${isSelected ? 'bg-[var(--color-primary)] text-white shadow-sm' : 'bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] group-hover:text-[var(--color-primary)]'}`}>
                                            {Icon && <Icon className="w-4 h-4" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className={`text-xs font-bold uppercase tracking-tight truncate ${isSelected ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'}`}>{label}</div>
                                        </div>
                                        {isSelected && (
                                            <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[var(--color-primary)] text-white text-xs font-bold flex items-center justify-center shadow-md border border-white dark:border-[var(--color-surface)] animate-in zoom-in duration-200">
                                                {tNum(orderIdx)}
                                            </div>
                                        )}
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {/* Seksi 3: Konfigurasi file */}
                    <div className="space-y-3">
                        <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)] opacity-70">3 — {t('shared.export.fileTitle')}</p>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="flex-1 relative">
                                <input
                                    type="text"
                                    value={fileName}
                                    onChange={(e) => setFileName(e.target.value)}
                                    placeholder={t('shared.export.fileNamePlaceholder')}
                                    aria-label={t('shared.export.fileNamePlaceholder')}
                                    className="w-full bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-xl px-4 py-3 text-xs font-bold focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/20 transition-all placeholder:opacity-50 pr-20"
                                />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-1 rounded bg-[var(--color-border)] text-xs font-bold uppercase text-[var(--color-text-muted)]">
                                    .xlsx / .pdf
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setAdvancedOpen(!advancedOpen)}
                                className={`px-4 py-3 rounded-xl border transition-all flex items-center gap-2 text-xs font-bold
                                ${advancedOpen ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white' : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)]/40'}`}
                            >
                                <Settings className={`w-4 h-4 ${advancedOpen ? 'animate-spin-slow' : ''}`} />
                                {t('shared.export.options')}
                            </button>
                        </div>

                        {advancedOpen && (
                            <div className="p-4 rounded-2xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] flex items-center gap-1.5">
                                        <Heading className="w-4 h-4" />
                                        {t('shared.export.includeHeader')}
                                    </label>
                                    <div className="flex gap-1 bg-[var(--color-surface)] p-1 rounded-lg border border-[var(--color-border)]">
                                        {[{ v: true, l: t('shared.export.yes') }, { v: false, l: t('shared.export.no') }].map(opt => (
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
                                {advancedCfg.pdfOrientation && (
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] flex items-center gap-1.5">
                                            <ArrowLeftRight className="w-4 h-4" />
                                            {t('shared.export.pdfOrientation')}
                                        </label>
                                        <div className="flex gap-1 bg-[var(--color-surface)] p-1 rounded-lg border border-[var(--color-border)]">
                                            {[
                                                { v: 'landscape', l: t('shared.export.landscape'), icon: ArrowLeftRight },
                                                { v: 'portrait', l: t('shared.export.portrait'), icon: ArrowUpDown }
                                            ].map(opt => (
                                                <button
                                                    key={opt.v}
                                                    type="button"
                                                    onClick={() => setPdfOrientation(opt.v)}
                                                    className={`flex-1 py-1 rounded-md text-xs font-bold uppercase transition-all flex items-center justify-center gap-1.5 ${pdfOrientation === opt.v ? 'bg-[var(--color-primary)] text-white shadow-sm' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]'}`}
                                                >
                                                    <opt.icon className="w-4 h-4" />
                                                    {opt.l}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Seksi 4: Format */}
                    <div className="space-y-3">
                        <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)] opacity-70">4 — {t('shared.export.startTitle')}</p>
                        <div className={`grid grid-cols-1 gap-2.5 ${formatGridCols}`}>
                            {formatButtons.map(({ label, icon, desc, onClick, color, iconColor }) => {
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
                        <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-danger/5 border border-danger/10 text-danger text-xs font-bold uppercase tracking-tight animate-pulse">
                            <TriangleAlert className="w-4 h-4" />
                            {t('shared.export.minCols')}
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    )
}
