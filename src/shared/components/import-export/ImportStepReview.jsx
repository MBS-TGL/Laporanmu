import { useState } from 'react'
import {
    Check, ChevronDown, CircleAlert, CircleCheck, Copy, FileText, Funnel,
    LoaderCircle, Trash2, TriangleAlert
} from 'lucide-react'
import EditableCell from './EditableCell'
import { useLanguage } from '@context'

/**
 * Langkah 3 wizard import: statistik preview, filter isu, tabel review yang
 * bisa diedit inline (EditableCell), dan accordion catatan validasi.
 *
 * Props:
 * - config               : konfigurasi fitur (columns, features, renderBulkFix)
 * - importPreview        : row hasil buildImportPreview (flag _hasError/_isDupe/_hasWarn)
 * - importReadyRows      : baris siap commit (dihitung hook/page)
 * - importIssues         : [{ row, level, messages }]
 * - importLoading        : true saat buildImportPreview berjalan
 * - importValidationOpen / setImportValidationOpen
 * - importSkipDupes / setImportSkipDupes : hanya dirender jika config.features.skipDupes
 * - importEditCell / setImportEditCell / handleImportCellEdit / handleRemoveImportRow
 */
export default function ImportStepReview({
    config,
    importPreview, importReadyRows, importIssues, importLoading,
    importValidationOpen, setImportValidationOpen,
    importSkipDupes, setImportSkipDupes,
    importEditCell, setImportEditCell, handleImportCellEdit, handleRemoveImportRow
}) {
    const { t, tNum } = useLanguage()
    const [filterIssuesOnly, setFilterIssuesOnly] = useState(false)
    const showDupes = !!config.features?.skipDupes && !!setImportSkipDupes
    const cap = config.features?.previewCap === 0 ? Infinity : (config.features?.previewCap ?? 300)

    const filtered = importPreview
        .map((r, originalIdx) => ({ ...r, originalIdx }))
        .filter(r => !filterIssuesOnly || (r._hasError || r._isDupe || r._hasWarn))
    const visibleRows = filtered.slice(0, cap)

    const cellCtx = { importEditCell, setImportEditCell, handleImportCellEdit }

    return (
        <div className="space-y-4">
            {importLoading ? (
                <div className="flex items-center justify-center py-14 text-[var(--color-text-muted)] gap-2">
                    <LoaderCircle className="w-4 h-4 animate-spin" />
                    <span className="text-xs font-bold">{t('shared.import.processingPreview')}</span>
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Statistik + aksi cepat */}
                    <div className="flex flex-wrap items-center justify-between gap-3 p-2 rounded-2xl bg-[var(--color-surface-alt)]/50 border border-[var(--color-border)] shadow-sm">
                        <div className="flex items-center gap-2 p-1 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)]/50">
                            {[
                                { label: t('shared.import.statTotal'), value: importPreview.length, color: 'text-[var(--color-text-muted)]', bg: 'bg-[var(--color-border)]/20', icon: FileText },
                                { label: t('shared.import.statReady'), value: importReadyRows.length, color: 'text-success', bg: 'bg-success/10', icon: CircleCheck },
                                ...(showDupes ? [{ label: t('shared.import.statDupes'), value: importPreview.filter(r => r._isDupe).length, color: 'text-violet-600', bg: 'bg-violet-500/10', icon: Copy }] : []),
                                { label: t('shared.import.statIssues'), value: importPreview.filter(r => r._hasError).length, color: 'text-danger', bg: 'bg-danger/10', icon: CircleAlert },
                            ].map((stat, i) => (
                                <div key={i} className={`flex items-center gap-2 px-2 py-1 rounded-lg ${stat.bg} ${stat.color} transition-all`} title={stat.label}>
                                    <stat.icon className="text-xs opacity-70" />
                                    <span className="text-xs font-bold">{tNum(stat.value)}</span>
                                </div>
                            ))}
                        </div>

                        <div className="flex items-center gap-2">
                            {showDupes && (
                                <button
                                    type="button"
                                    onClick={() => setImportSkipDupes(!importSkipDupes)}
                                    className={`flex items-center gap-2 h-8 px-3 rounded-xl border text-xs font-bold uppercase tracking-tight transition-all
                                    ${importSkipDupes
                                            ? 'bg-violet-500 text-white border-violet-500 shadow-md'
                                            : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] border-[var(--color-border)] hover:border-violet-500/40 hover:text-violet-600'}`}
                                >
                                    <Copy className="w-4 h-4" />
                                    <span className="hidden sm:inline">{importSkipDupes ? t('shared.import.skipDupes') : t('shared.import.keepDupes')}</span>
                                    <span className="sm:hidden">{importSkipDupes ? t('shared.import.skipShort') : t('shared.import.keepShort')}</span>
                                </button>
                            )}

                            <button
                                type="button"
                                onClick={() => setFilterIssuesOnly(!filterIssuesOnly)}
                                className={`flex items-center gap-2 h-8 px-3 rounded-xl border text-xs font-bold uppercase tracking-tight transition-all
                                ${filterIssuesOnly
                                        ? 'bg-danger text-white border-danger shadow-md'
                                        : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] border-[var(--color-border)] hover:border-danger/40 hover:text-danger'}`}
                            >
                                {filterIssuesOnly ? <Check className="w-4 h-4" /> : <Funnel className="w-4 h-4" />}
                                <span>{filterIssuesOnly ? t('shared.import.filterIssues') : t('shared.import.filterAll')}</span>
                            </button>
                        </div>
                    </div>

                    {/* Slot perbaikan massal spesifik fitur */}
                    {config.renderBulkFix?.({ importPreview, importIssues, config })}

                    {/* Tabel review */}
                    <div className="rounded-2xl border border-[var(--color-border)] overflow-hidden bg-[var(--color-surface)] shadow-sm">
                        <div className="max-h-[50vh] overflow-auto scrollbar-none">
                            <table className="w-full border-collapse table-fixed">
                                <thead>
                                    <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-alt)]/30">
                                        {config.columns.map(col => (
                                            <th key={col.key} className={`px-2 py-2 ${col.center ? 'text-center' : 'text-left'} text-xs font-bold uppercase tracking-tighter text-[var(--color-text-muted)] ${col.w}`}>
                                                {col.label}
                                            </th>
                                        ))}
                                        <th className="px-2 py-2 text-center text-xs font-bold uppercase tracking-tighter text-[var(--color-text-muted)] w-[12%]">
                                            {t('shared.import.colActions')}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {visibleRows.map((r) => {
                                        const i = r.originalIdx
                                        const isError = r._hasError
                                        const isDupe = r._isDupe
                                        const isWarn = r._hasWarn
                                        return (
                                            <tr key={i} className={`hover:bg-[var(--color-surface-alt)]/40 transition-colors border-b border-[var(--color-border)]/30 last:border-0 ${isError ? 'bg-danger/3' : isDupe ? 'bg-violet-500/3' : ''}`}>
                                                {config.columns.map(col => (
                                                    <td key={col.key} className={`px-2 py-0.5 ${col.center ? 'text-center' : 'text-left'} ${col.required ? 'text-[var(--color-text)]' : 'text-[var(--color-text-muted)]'} font-bold text-xs truncate`}>
                                                        <EditableCell
                                                            rowIdx={i} colKey={col.key} value={r[col.key]} row={r}
                                                            editor={col.editor} center={col.center} required={col.required}
                                                            {...cellCtx}
                                                        />
                                                    </td>
                                                ))}
                                                <td className="px-2 py-1">
                                                    <div className="flex items-center justify-center gap-2">
                                                        {isError
                                                            ? <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-danger/15 text-danger animate-pulse"><CircleAlert className="w-4 h-4" /></span>
                                                            : isDupe
                                                                ? <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-violet-500/15 text-violet-600"><Copy className="w-4 h-4" /></span>
                                                                : isWarn
                                                                    ? <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-500/15 text-amber-600"><TriangleAlert className="w-4 h-4" /></span>
                                                                    : <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-500/15 text-green-600"><CircleCheck className="w-4 h-4" /></span>}

                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveImportRow(i)}
                                                            className="w-5 h-5 rounded-full bg-danger/10 text-danger hover:bg-danger hover:text-white transition-all flex items-center justify-center group/del"
                                                            title={t('shared.import.deleteRow')}
                                                            aria-label={t('shared.import.deleteRow')}
                                                        >
                                                            <Trash2 className="w-4 h-4 group-hover/del:scale-110 transition-transform" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                        <div className="px-3 py-2 text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)] bg-[var(--color-surface-alt)] border-t border-[var(--color-border)] flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <span>
                                    {t('shared.import.showingRows')
                                        .replace('{shown}', tNum(Math.min(filtered.length, cap)))
                                        .replace('{total}', tNum(importPreview.length))}
                                </span>
                                <div className="w-px h-3 bg-[var(--color-border)]" />
                                <span className="text-success flex items-center gap-1.5">
                                    <CircleCheck className="w-4 h-4" />
                                    {t('shared.import.rowsReady').replace('{n}', tNum(importReadyRows.length))}
                                </span>
                            </div>
                            {filterIssuesOnly && <span className="text-danger animate-pulse">{t('shared.import.filterActive')}</span>}
                        </div>
                    </div>

                    {/* Accordion catatan validasi */}
                    {importIssues.length > 0 && (
                        <div className="rounded-2xl border border-[var(--color-border)] overflow-hidden bg-[var(--color-surface-alt)]/20">
                            <button
                                type="button"
                                onClick={() => setImportValidationOpen(v => !v)}
                                className="w-full px-3 py-2 bg-[var(--color-surface-alt)] border-b border-[var(--color-border)] flex items-center justify-between hover:bg-[var(--color-border)]/30 transition-colors cursor-pointer"
                            >
                                <span className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)] flex items-center gap-1.5">
                                    <ChevronDown className={`w-4 h-4 transition-transform ${importValidationOpen ? '' : '-rotate-90'}`} />
                                    {t('shared.import.validationNotes')}
                                </span>
                                <span className="text-xs font-bold text-[var(--color-text-muted)] opacity-50">
                                    {t('shared.import.issuesCount').replace('{n}', tNum(importIssues.length))}
                                </span>
                            </button>
                            {importValidationOpen && (
                                <div className="max-h-[140px] overflow-auto divide-y divide-[var(--color-border)]">
                                    {importIssues.map((issue, idx) => {
                                        const levelStyle = issue.level === 'error'
                                            ? { pill: 'bg-danger/15 text-danger', row: 'border-l-2 border-l-danger bg-danger/3' }
                                            : issue.level === 'dupe'
                                                ? { pill: 'bg-violet-500/15 text-violet-600', row: 'border-l-2 border-l-violet-500 bg-violet-500/3' }
                                                : { pill: 'bg-amber-500/15 text-amber-600', row: 'border-l-2 border-l-amber-400 bg-amber-500/3' }
                                        return (
                                            <div key={idx} className={`flex items-start gap-3 px-3 py-2 ${levelStyle.row}`}>
                                                <span className={`mt-0.5 shrink-0 px-1.5 py-0.5 rounded text-xs font-bold ${levelStyle.pill}`}>
                                                    {issue.level === 'dupe' ? t('shared.import.dupeLabel') : issue.level.toUpperCase()}
                                                </span>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-bold text-[var(--color-text-muted)] mb-0.5">{t('shared.import.rowLabel')} {tNum(issue.row)}</p>
                                                    {issue.messages.map((msg, mi) => (
                                                        <p key={mi} className="text-xs font-bold text-[var(--color-text)] leading-snug">{msg}</p>
                                                    ))}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
