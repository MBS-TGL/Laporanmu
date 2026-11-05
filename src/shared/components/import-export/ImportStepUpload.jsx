import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Download, TableProperties, Upload } from 'lucide-react'
import { useLanguage } from '@context'

/**
 * Langkah 1 wizard import: dropzone file, panel referensi copy-paste (opsional),
 * tombol download template, dan tabel visualisasi struktur kolom Excel.
 *
 * Props:
 * - config.template : { cols: [{ l, k, n, w }], rows: [[..],[..]] } — visualisasi struktur
 * - config.reference: { icon, title, desc, buttonLabel, dropdownLabel, items, itemKey, hint }
 * - importDragOver / setImportDragOver : state drag&drop dari page/hook
 * - processImportFile(file) : parser milik feature
 * - fileInputRef            : ref ke <input type="file"> milik shell
 * - handleDownloadTemplate  : generator template milik feature
 */
export default function ImportStepUpload({
    config,
    importDragOver, setImportDragOver,
    processImportFile, fileInputRef, handleDownloadTemplate
}) {
    const { t } = useLanguage()
    const reference = config.reference
    const template = config.template
    const [showRefDropdown, setShowRefDropdown] = useState(false)
    const refDropdownWrapRef = useRef(null)

    useEffect(() => {
        if (!showRefDropdown) return
        const handleClickOutside = (e) => {
            if (refDropdownWrapRef.current && !refDropdownWrapRef.current.contains(e.target)) {
                setShowRefDropdown(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [showRefDropdown])

    const RefIcon = reference?.icon
    const refItems = (reference?.items || []).map(it =>
        typeof it === 'string' ? it : it[reference.itemKey || 'name']
    )

    return (
        <div className="space-y-2.5">
            {/* Dropzone */}
            <div
                onDragOver={e => { e.preventDefault(); setImportDragOver(true) }}
                onDragLeave={() => setImportDragOver(false)}
                onDrop={async e => {
                    e.preventDefault()
                    setImportDragOver(false)
                    const file = e.dataTransfer.files?.[0]
                    if (file) await processImportFile(file)
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`w-full h-14 rounded-xl border-2 border-dashed cursor-pointer flex items-center justify-center gap-3 transition-all
                ${importDragOver
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 scale-[1.01]'
                        : 'border-[var(--color-primary)]/30 bg-[var(--color-primary)]/4 hover:border-[var(--color-primary)]/60 hover:bg-[var(--color-primary)]/8'}`}
            >
                <Upload className={`w-4 h-4 transition-all ${importDragOver ? 'text-[var(--color-primary)] scale-110' : 'text-[var(--color-primary)]/60'}`} />
                <div className="text-left">
                    <p className="text-xs font-bold text-[var(--color-primary)] uppercase tracking-wider leading-none">
                        {importDragOver ? t('shared.import.dropActive') : t('shared.import.dropIdle')}
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)] font-bold mt-1 opacity-60">{t('shared.import.dropFormats')}</p>
                </div>
            </div>

            {/* Referensi + Template */}
            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3 bg-[var(--color-surface-alt)]/50 rounded-2xl border border-[var(--color-border)] shadow-sm">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2.5">
                            {RefIcon && (
                                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                    <RefIcon className="w-4 h-4" />
                                </div>
                            )}
                            <div className="flex flex-col">
                                <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-text)]">
                                    {reference?.title || t('shared.import.refTitle')}
                                </span>
                                {reference?.desc && (
                                    <span className="text-xs font-bold text-primary">{reference.desc}</span>
                                )}
                            </div>
                        </div>

                        {/* Dropdown copy-paste daftar nilai valid */}
                        {reference?.items?.length > 0 && (
                            <div className="relative" ref={refDropdownWrapRef}>
                                <button
                                    type="button"
                                    onClick={() => setShowRefDropdown(v => !v)}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all duration-300
                                    ${showRefDropdown
                                            ? 'bg-primary text-white border-primary shadow-lg'
                                            : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text)] hover:border-primary/50 hover:bg-primary/5'}`}
                                >
                                    <span className="text-xs font-bold uppercase tracking-wide">{reference.buttonLabel}</span>
                                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded-lg ${showRefDropdown ? 'bg-white/20' : 'bg-primary/10 text-primary'}`}>
                                        {refItems.length}
                                    </span>
                                    <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${showRefDropdown ? 'rotate-180' : ''}`} />
                                </button>

                                {showRefDropdown && (
                                    <div className="absolute top-full left-0 mt-2 w-[320px] bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-xl z-[100] animate-in fade-in slide-in-from-top-2 duration-200">
                                        <div className="p-3 border-b border-[var(--color-border)]/50">
                                            <span className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wide">
                                                {reference.dropdownLabel}
                                            </span>
                                        </div>
                                        <div className="p-2 max-h-[140px] overflow-y-auto custom-scrollbar">
                                            <div className="grid grid-cols-2 gap-1.5">
                                                {refItems.map((label, i) => (
                                                    <span key={i} className="px-2 py-1.5 rounded-lg bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-xs font-bold text-[var(--color-text)] hover:border-success/30 transition-colors truncate">
                                                        {label}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="p-3 bg-[var(--color-surface-alt)]/30 rounded-b-2xl border-t border-[var(--color-border)]/50">
                                            <p className="text-xs text-[var(--color-text-muted)] italic leading-tight">
                                                {reference.hint || t('shared.import.refHint')}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={handleDownloadTemplate}
                        className="shrink-0 h-9 px-4 rounded-xl bg-success text-white text-xs font-bold uppercase tracking-wide flex items-center justify-center gap-2 hover:bg-success hover:scale-[1.02] active:scale-95 transition-all shadow-lg"
                    >
                        <Download className="w-4 h-4" /> {t('shared.import.downloadTemplate')}
                    </button>
                </div>

                {/* Visualisasi struktur kolom Excel */}
                {template && (
                    <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] overflow-hidden shadow-sm flex flex-col">
                        <div className="px-4 py-2 bg-[var(--color-surface-alt)] border-b border-[var(--color-border)] flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <TableProperties className="w-4 h-4 text-[var(--color-primary)]" />
                                <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                                    {t('shared.import.structureTitle')}
                                </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="relative flex h-1.5 w-1.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-success"></span>
                                </span>
                                <span className="text-xs font-bold text-success tracking-wide">{t('shared.import.autoMatch')}</span>
                            </div>
                        </div>

                        <div className="overflow-hidden bg-[var(--color-surface-alt)]/10">
                            <table className="w-full border-collapse table-fixed">
                                <thead>
                                    <tr className="bg-[var(--color-surface)]">
                                        <th className="w-8 border-r border-b border-[var(--color-border)]"></th>
                                        {template.cols.map((col, i) => (
                                            <th key={i} className={`px-2 py-1.5 border-r border-b border-[var(--color-border)] text-left ${col.w} min-w-0 overflow-hidden`}>
                                                <div className="flex flex-col min-w-0">
                                                    <div className="flex items-center justify-between gap-1 min-w-0">
                                                        <span className="text-xs font-bold text-[var(--color-text)] shrink-0">{col.l}</span>
                                                        <span className="text-[7.5px] font-bold text-success opacity-80 truncate" title={col.n}>({col.k})</span>
                                                    </div>
                                                    <div className="h-0.5 w-full bg-success/20 rounded-full mt-1"></div>
                                                </div>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {template.rows.map((row, rIdx) => (
                                        <tr key={rIdx}>
                                            <td className="bg-[var(--color-surface-alt)] border-r border-b border-[var(--color-border)] text-xs font-bold text-[var(--color-text-muted)] text-center py-1">
                                                {rIdx + 1}
                                            </td>
                                            {row.map((cell, cIdx) => (
                                                <td key={cIdx} className="px-2 py-1 border-r border-b border-[var(--color-border)] bg-[var(--color-surface)]/40 overflow-hidden">
                                                    <span className="text-xs font-medium text-[var(--color-text)] opacity-70 truncate block" title={cell}>{cell}</span>
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="px-4 py-1.5 bg-[var(--color-surface)] border-t border-[var(--color-border)] flex items-center justify-between">
                            <p className="text-xs text-[var(--color-text-muted)] font-medium italic opacity-60">
                                {t('shared.import.structureNote')}
                            </p>
                            <div className="flex gap-1.5">
                                {['.xlsx', '.csv'].map(ext => (
                                    <span key={ext} className="text-[7px] font-bold text-[var(--color-primary)] px-1 py-0.5 bg-[var(--color-primary)]/5 rounded border border-[var(--color-primary)]/10">{ext}</span>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
