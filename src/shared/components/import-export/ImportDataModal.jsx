import { useRef, useState } from 'react'
import {
    ArrowLeft, ArrowLeftRight, ArrowRight, Check, FileInput, FileText,
    LoaderCircle, Upload
} from 'lucide-react'
import Modal from '@shared/components/Modal'
import ImportStepUpload from './ImportStepUpload'
import ImportStepMapping from './ImportStepMapping'
import ImportStepReview from './ImportStepReview'
import { useLanguage } from '@context'

/**
 * ImportDataModal — wizard import 3 langkah (Upload → Mapping → Review) yang
 * reusable untuk semua halaman admin. Layout & interaksi dikendalikan di sini;
 * data & logika (parse, validasi, commit) tetap milik hook/page masing-masing
 * fitur lewat props bernama — kontraknya sama dengan modal import lama.
 *
 * Props (wajib): isOpen, onClose, importing, importStep, setImportStep,
 *   importPreview, importFileName, importDragOver, setImportDragOver,
 *   processImportFile, handleDownloadTemplate, importFileHeaders,
 *   importColumnMapping, setImportColumnMapping, importRawData,
 *   importLoading, setImportLoading, buildImportPreview, importIssues,
 *   importValidationOpen, setImportValidationOpen, importProgress,
 *   handleCommitImport, hasImportBlockingErrors,
 *   importReadyRows, handleImportCellEdit, importEditCell, setImportEditCell,
 *   handleRemoveImportRow
 * Props (opsional): importSkipDupes/setImportSkipDupes (untuk features.skipDupes),
 *   fileInputRef (ref eksternal ke input file, mis. alur GSheets).
 *   handleImportClick dari page masih boleh dikirim (pembuka modal dari toolbar)
 *   tapi tidak lagi dipakai di dalam — tombol "Ganti File" langsung klik input.
 *
 * config:
 *   title, description, icon, iconBg, iconColor, size ('lg'|'xl')
 *   systemCols: [{ key, label, synonyms? }]     — grid mapping
 *   requiredKeys: [string]                      — tanda * + men-disable "Review Data"
 *   columns: [{ key, label, w, center?, required?, editor? }] — tabel review
 *   template: { cols: [{l,k,n,w}], rows: [[..]] }             — visualisasi Excel
 *   reference: { icon, title, desc, buttonLabel, dropdownLabel, items, itemKey, hint }
 *   features: { skipDupes: bool, previewCap: number (0 = tanpa batas) }
 *   extraUploadTabs: [{ id, label, icon, render }]  — tab tambahan step 1 (mis. salin bulan)
 *   renderBulkFix: (ctx) => JSX                     — slot perbaikan massal di step 3
 */
export default function ImportDataModal(props) {
    const {
        isOpen, onClose,
        importing, importStep, setImportStep,
        importPreview, importFileName, importDragOver, setImportDragOver,
        processImportFile, handleDownloadTemplate, importFileHeaders,
        importColumnMapping, setImportColumnMapping, importRawData,
        importLoading, setImportLoading, buildImportPreview,
        importIssues, importValidationOpen, setImportValidationOpen,
        importProgress, handleCommitImport,
        hasImportBlockingErrors, importReadyRows,
        handleImportCellEdit, importEditCell, setImportEditCell,
        handleRemoveImportRow,
        importSkipDupes, setImportSkipDupes,
        fileInputRef,
        config
    } = props

    const { t, tNum } = useLanguage()
    const internalRef = useRef(null)
    const inputRef = fileInputRef || internalRef
    const [activeTab, setActiveTab] = useState('file')

    if (!isOpen) return null

    const cfg = config || {}
    const requiredKeys = cfg.requiredKeys || []
    const mappingComplete = requiredKeys.every(k => !!importColumnMapping[k])
    const hasFile = importRawData.length > 0 && importFileName
    const extraTabs = cfg.extraUploadTabs || []
    const Icon = cfg.icon || FileInput

    const STEPS = [
        { step: 1, label: t('shared.import.stepUpload'), desc: t('shared.import.stepUploadDesc') },
        { step: 2, label: t('shared.import.stepMapping'), desc: t('shared.import.stepMappingDesc') },
        { step: 3, label: t('shared.import.stepReview'), desc: t('shared.import.stepReviewDesc') },
    ]

    const tabs = [
        { id: 'file', label: t('shared.import.tabFile'), icon: Upload },
        ...extraTabs,
    ]

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={cfg.title}
            description={cfg.description}
            icon={Icon}
            iconBg={cfg.iconBg || 'bg-primary/10'}
            iconColor={cfg.iconColor || 'text-primary'}
            size={cfg.size || 'lg'}
            mobileVariant="bottom-sheet"
            footer={
                <div className="flex items-center w-full gap-3">
                    {importStep === 1 ? (
                        <button
                            type="button"
                            onClick={onClose}
                            className="h-9 px-5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] text-xs font-bold uppercase tracking-wide leading-none whitespace-nowrap transition-colors flex items-center justify-center shrink-0"
                        >
                            {t('shared.import.cancel')}
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={() => setImportStep(v => v - 1)}
                            disabled={importing}
                            className="h-9 px-5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] text-xs font-bold uppercase tracking-wide leading-none whitespace-nowrap transition-colors disabled:opacity-50 flex items-center gap-2 shrink-0"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            {t('shared.import.back')}
                        </button>
                    )}

                    <div className="flex-1" />

                    <div className="flex items-center gap-3">
                        {importing && (
                            <span className="text-xs font-bold text-[var(--color-text-muted)] flex items-center gap-2">
                                <LoaderCircle className="w-4 h-4 animate-spin text-[var(--color-primary)]" />
                                {tNum(importProgress.done)}/{tNum(importProgress.total)}
                            </span>
                        )}

                        {importStep === 1 ? (
                            // Tombol utama disembunyikan saat tab non-file aktif (tab punya aksinya sendiri)
                            (extraTabs.length === 0 || activeTab === 'file') && (
                                <button
                                    type="button"
                                    onClick={() => hasFile ? setImportStep(2) : inputRef.current?.click()}
                                    className="h-9 px-5 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white text-xs font-bold uppercase tracking-wide leading-none whitespace-nowrap shadow-sm transition-colors flex items-center gap-2 shrink-0"
                                >
                                    {hasFile
                                        ? <>{t('shared.import.continue')} <ArrowRight className="w-4 h-4" /></>
                                        : <>{t('shared.import.chooseFile')} <Upload className="w-4 h-4" /></>}
                                </button>
                            )
                        ) : importStep === 2 ? (
                            <button
                                type="button"
                                onClick={async () => {
                                    setImportStep(3)
                                    setImportLoading(true)
                                    await buildImportPreview(importRawData, importColumnMapping)
                                    setImportLoading(false)
                                }}
                                disabled={!mappingComplete}
                                className="h-9 px-5 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white text-xs font-bold uppercase tracking-wide leading-none whitespace-nowrap disabled:opacity-40 shadow-sm transition-colors flex items-center gap-2 shrink-0"
                            >
                                {t('shared.import.reviewData')} <ArrowRight className="w-4 h-4" />
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={handleCommitImport}
                                disabled={importing || hasImportBlockingErrors || importReadyRows.length === 0}
                                className="h-9 px-5 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white text-xs font-bold uppercase tracking-wide leading-none whitespace-nowrap disabled:opacity-40 shadow-sm transition-colors flex items-center gap-2 shrink-0"
                            >
                                {importing
                                    ? <><LoaderCircle className="w-4 h-4 animate-spin" /> {t('shared.import.importing')}</>
                                    : <><Check className="w-4 h-4" /> {t('shared.import.finish')}</>}
                            </button>
                        )}
                    </div>
                </div>
            }
        >
            {/* Input file: ref internal, atau ref eksternal dari page (alur GSheets dll.) */}
            <input
                type="file"
                ref={inputRef}
                className="hidden"
                accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) processImportFile(file)
                    e.target.value = ''
                }}
            />

            {/* Header stepper */}
            <div className="flex items-center justify-center gap-3 mb-6">
                {STEPS.map((s) => (
                    <div key={s.step} className="flex items-center gap-3">
                        <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-sm
                                ${importStep >= s.step ? 'bg-[var(--color-primary)] text-white scale-110' : 'bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] border border-[var(--color-border)] opacity-40'}`}>
                                {importStep > s.step ? <Check className="w-4 h-4" /> : s.step}
                            </div>
                            <div className="flex flex-col">
                                <span className={`text-xs font-bold uppercase tracking-wider leading-none ${importStep >= s.step ? 'text-[var(--color-text)]' : 'text-[var(--color-text-muted)] opacity-50'}`}>{s.label}</span>
                                <span className="text-xs font-bold text-[var(--color-text-muted)] opacity-40 uppercase tracking-tight mt-1">{s.desc}</span>
                            </div>
                        </div>
                        {s.step < 3 && <div className={`w-6 h-0.5 rounded-full transition-all ${importStep > s.step ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)] opacity-30'}`} />}
                    </div>
                ))}
            </div>

            {/* Status file */}
            {importFileName && (
                <div className="flex items-center justify-between gap-4 mb-6 px-1 animate-in fade-in slide-in-from-top-4 duration-700">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 shrink-0 shadow-sm">
                            <FileText className="w-4 h-4" />
                            <span className="text-xs font-bold truncate max-w-[240px]">{importFileName}</span>
                        </div>
                        {importPreview.length > 0 && (
                            <div className="px-3.5 py-1.5 rounded-full bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text-muted)] text-xs font-bold shadow-sm shrink-0">
                                {t('shared.import.rowsCount').replace('{n}', tNum(importPreview.length))}
                            </div>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={() => inputRef.current?.click()}
                        className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-danger hover:border-danger/30 text-xs font-bold uppercase tracking-wider transition-all active:scale-95 shadow-sm group"
                    >
                        <ArrowLeftRight className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
                        {t('shared.import.changeFile')}
                    </button>
                </div>
            )}

            {/* Step 1: Upload (opsi tab tambahan spesifik fitur) */}
            {importStep === 1 && (
                <div>
                    {tabs.length > 1 && (
                        <div className="flex gap-1.5 p-1 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] mb-4">
                            {tabs.map(tab => {
                                const TabIcon = tab.icon
                                const active = activeTab === tab.id
                                return (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${active ? 'bg-[var(--color-surface)] text-[var(--color-primary)] shadow-sm border border-[var(--color-border)]/50' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
                                    >
                                        <TabIcon className="w-4 h-4" />
                                        {tab.label}
                                    </button>
                                )
                            })}
                        </div>
                    )}

                    {activeTab === 'file' ? (
                        <ImportStepUpload
                            config={cfg}
                            importDragOver={importDragOver}
                            setImportDragOver={setImportDragOver}
                            processImportFile={processImportFile}
                            fileInputRef={inputRef}
                            handleDownloadTemplate={handleDownloadTemplate}
                        />
                    ) : (
                        extraTabs.find(tab => tab.id === activeTab)?.render?.()
                    )}
                </div>
            )}

            {/* Step 2: Mapping */}
            {importStep === 2 && (
                <ImportStepMapping
                    systemCols={cfg.systemCols || []}
                    requiredKeys={requiredKeys}
                    importFileHeaders={importFileHeaders}
                    importColumnMapping={importColumnMapping}
                    setImportColumnMapping={setImportColumnMapping}
                />
            )}

            {/* Step 3: Review */}
            {importStep === 3 && (
                <ImportStepReview
                    config={cfg}
                    importPreview={importPreview}
                    importReadyRows={importReadyRows}
                    importIssues={importIssues}
                    importLoading={importLoading}
                    importValidationOpen={importValidationOpen}
                    setImportValidationOpen={setImportValidationOpen}
                    importSkipDupes={importSkipDupes}
                    setImportSkipDupes={setImportSkipDupes}
                    importEditCell={importEditCell}
                    setImportEditCell={setImportEditCell}
                    handleImportCellEdit={handleImportCellEdit}
                    handleRemoveImportRow={handleRemoveImportRow}
                />
            )}
        </Modal>
    )
}
