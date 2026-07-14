import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faArrowLeft,
    faArrowRight,
    faArrowRightArrowLeft,
    faCheck,
    faChevronDown,
    faDownload,
    faFileLines,
    faSpinner,
    faFilter,
    faTags,
    faUpload,
    faFileImport,
    faCheckCircle,
    faCopy,
    faCircleExclamation,
    faTriangleExclamation,
    faPen,
    faTrash,
    faRotate,
    faBolt,
    faSchool,
    faTableList,
    faChevronUp
} from '@fortawesome/free-solid-svg-icons'
import Modal from '@shared/components/Modal'
import RichSelect from '@shared/components/RichSelect'
import { useLanguage } from '@context'

export default function StudentImportModal(props) {
    const { t, language } = useLanguage()
    const [showClassesDropdown, setShowClassesDropdown] = useState(false)
    const classesDropdownRef = useRef(null)

    // Handle click outside for dropdown
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (classesDropdownRef.current && !classesDropdownRef.current.contains(e.target)) {
                setShowClassesDropdown(false)
            }
        }
        if (showClassesDropdown) {
            document.addEventListener('mousedown', handleClickOutside)
        }
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [showClassesDropdown])

    const {
        isOpen,
        onClose,
        importing,
        importStep,
        setImportStep,
        importPreview,
        importDuplicates,
        importFileName,
        importFileInputRef,
        importDragOver,
        setImportDragOver,
        processImportFile,
        classesList,
        handleDownloadTemplate,
        importFileHeaders,
        SYSTEM_COLS,
        importColumnMapping,
        setImportColumnMapping,
        importRawData,
        importLoading,
        setImportLoading,
        buildImportPreview,
        importIssues,
        importValidationOpen,
        setImportValidationOpen,
        importProgress,
        handleCommitImport,
        handleImportClick,
        hasImportBlockingErrors,
        importReadyRows,
        handleImportCellEdit,
        importEditCell,
        setImportEditCell,
        handleRemoveImportRow,
        importSkipDupes,
        setImportSkipDupes,
        handleBulkFix
    } = props

    const [showClasses, setShowClasses] = useState(false)
    const [filterIssuesOnly, setFilterIssuesOnly] = useState(false)

    // Inline Editor Component - Memoized for high performance in large tables
    const EditableCell = React.memo(({ rowIdx, colKey, value, importPreview, classesList, importEditCell, setImportEditCell, handleImportCellEdit }) => {
        const isEditing = importEditCell?.row === rowIdx && importEditCell?.col === colKey
        const [searchTerm, setSearchTerm] = useState('')
        const cellRef = useRef(null)
        const [coords, setCoords] = useState(null)

        // Use useLayoutEffect for zero-latency positioning
        React.useLayoutEffect(() => {
            if (isEditing && cellRef.current) {
                const rect = cellRef.current.getBoundingClientRect()
                setCoords({
                    anchorTop: rect.top,
                    left: rect.left,
                    width: rect.width
                })
            } else {
                setCoords(null)
            }
        }, [isEditing])

        const renderDropdown = (content) => {
            if (!coords) return null

            return createPortal(
                <div
                    className="fixed z-[9999]"
                    style={{
                        bottom: (window.innerHeight - coords.anchorTop) + 8,
                        left: coords.left,
                        minWidth: Math.max(coords.width, colKey === 'class_id' ? 220 : 140)
                    }}
                >
                    <div className="flex flex-col bg-[var(--color-surface)] border border-[var(--color-primary)] rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl border-t-[var(--color-primary)]">
                        {content}
                    </div>
                    <div className="fixed inset-0 -z-10 bg-black/0" onClick={() => setImportEditCell(null)} />
                </div>,
                document.body
            )
        }

        if (isEditing) {
            if (colKey === 'class_id') {
                const filteredClasses = classesList.filter(c =>
                    c.name.toLowerCase().includes(searchTerm.toLowerCase())
                )

                return (
                    <div ref={cellRef} className="relative">
                        <div className="bg-[var(--color-primary)]/10 rounded-lg px-2 py-1 text-[var(--color-primary)] font-black border border-[var(--color-primary)] shadow-sm">
                            {importPreview[rowIdx]._className || 'Pilih...'}
                        </div>
                        {renderDropdown(
                            <>
                                <div className="p-2 border-b border-[var(--color-border)] bg-[var(--color-surface-alt)]/50">
                                    <input
                                        autoFocus
                                        className="w-full bg-transparent text-[10px] font-bold outline-none placeholder:font-normal placeholder:opacity-30"
                                        placeholder="Cari kelas..."
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        onKeyDown={e => {
                                            if (e.key === 'Escape') setImportEditCell(null)
                                            if (e.key === 'Enter' && filteredClasses.length > 0) {
                                                handleImportCellEdit(rowIdx, colKey, filteredClasses[0].id)
                                                setImportEditCell(null)
                                            }
                                        }}
                                    />
                                </div>
                                <div className="max-h-[160px] overflow-auto py-1 scrollbar-none">
                                    {filteredClasses.length > 0 ? filteredClasses.map(c => (
                                        <button
                                            key={c.id}
                                            className="w-full px-4 py-2 text-left text-[10px] font-bold hover:bg-[var(--color-primary)]/10 hover:text-[var(--color-primary)] transition-colors flex items-center justify-between group"
                                            onClick={() => {
                                                handleImportCellEdit(rowIdx, colKey, c.id)
                                                setImportEditCell(null)
                                            }}
                                        >
                                            <span className="truncate">{c.name}</span>
                                            {value === c.id && <FontAwesomeIcon icon={faCheck} className="text-[8px]" />}
                                        </button>
                                    )) : (
                                        <div className="px-3 py-3 text-[9px] text-[var(--color-text-muted)] italic text-center">Data tidak ditemukan</div>
                                    )}
                                </div>
                                <button
                                    className="p-2 text-[8px] font-black uppercase tracking-widest text-[var(--color-text-muted)] hover:text-red-500 transition-colors border-t border-[var(--color-border)]"
                                    onClick={() => setImportEditCell(null)}
                                >
                                    Batal
                                </button>
                            </>
                        )}
                    </div>
                )
            }

            if (colKey === 'gender') {
                const options = [
                    { id: 'L', name: 'Laki-laki' },
                    { id: 'P', name: 'Perempuan' }
                ]
                return (
                    <div ref={cellRef} className="relative">
                        <div className="bg-[var(--color-primary)]/10 rounded-lg px-2 py-1 text-[var(--color-primary)] font-black uppercase text-center border border-[var(--color-primary)] shadow-sm">
                            {value || '-'}
                        </div>
                        {renderDropdown(
                            <div className="py-1">
                                {options.map(opt => (
                                    <button
                                        key={opt.id}
                                        className="w-full px-4 py-2.5 text-left text-[10px] font-bold hover:bg-[var(--color-primary)]/10 hover:text-[var(--color-primary)] transition-colors flex items-center justify-between"
                                        onClick={() => {
                                            handleImportCellEdit(rowIdx, colKey, opt.id)
                                            setImportEditCell(null)
                                        }}
                                    >
                                        <span>{opt.name}</span>
                                        {value === opt.id && <FontAwesomeIcon icon={faCheck} className="text-[8px]" />}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )
            }

            return (
                <input
                    autoFocus
                    className="w-full bg-[var(--color-surface)] border-2 border-[var(--color-primary)] rounded-lg px-2 py-1 text-[10px] font-black outline-none shadow-lg transition-all"
                    value={value || ''}
                    onChange={(e) => handleImportCellEdit(rowIdx, colKey, e.target.value)}
                    onBlur={() => setImportEditCell(null)}
                    onKeyDown={(e) => e.key === 'Enter' && setImportEditCell(null)}
                />
            )
        }

        const isCentered = ['gender'].includes(colKey)
        const displayValue = colKey === 'class_id' ? (importPreview[rowIdx]._className || '-') : (value || '-')
        const isEmpty = !value || value === '-'

        return (
            <div
                className={`group cursor-pointer hover:bg-[var(--color-primary)]/5 px-1.5 py-0.5 -mx-1.5 rounded-md transition-all flex items-center ${isCentered ? 'justify-center' : 'justify-between'} gap-2 min-h-[20px] ${isEmpty ? 'text-red-500/40 italic font-normal' : ''}`}
                onClick={() => setImportEditCell({ row: rowIdx, col: colKey })}
            >
                <span className={isCentered ? '' : 'truncate'}>{displayValue}</span>
                {!isCentered && <FontAwesomeIcon icon={faPen} className="text-[7px] opacity-0 group-hover:opacity-30 transition-opacity" />}
            </div>
        )
    })

    if (!isOpen) return null

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Import Data Siswa"
            description="Unggah data siswa secara masal dari file Excel atau CSV. Sistem akan memvalidasi data secara otomatis."
            icon={faFileImport}
            iconBg="bg-emerald-500/10"
            iconColor="text-emerald-600"
            size="lg"
            mobileVariant="bottom-sheet"
            footer={
                <div className="flex items-center w-full gap-3">
                    {importStep === 1 ? (
                        <button
                            onClick={onClose}
                            className="h-10 px-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] text-[10px] font-black uppercase tracking-widest hover:bg-[var(--color-surface-alt)] transition-all flex items-center justify-center"
                        >
                            Batal
                        </button>
                    ) : (
                        <button
                            onClick={() => setImportStep(v => v - 1)}
                            disabled={importing}
                            className="h-10 px-6 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text-muted)] text-[11px] font-black uppercase tracking-widest disabled:opacity-50 hover:bg-[var(--color-border)] transition-all flex items-center gap-2"
                        >
                            <FontAwesomeIcon icon={faArrowLeft} />
                            Kembali
                        </button>
                    )}

                    <div className="flex-1" />

                    <div className="flex items-center gap-3">
                        {importing && (
                            <span className="text-[10px] font-bold text-[var(--color-text-muted)] flex items-center gap-2">
                                <FontAwesomeIcon icon={faSpinner} className="fa-spin text-[var(--color-primary)]" />
                                {importProgress.done}/{importProgress.total}
                            </span>
                        )}

                        {importStep === 1 ? (
                            <button
                                onClick={() => (importRawData.length > 0 && importFileName) ? setImportStep(2) : importFileInputRef.current?.click()}
                                className="h-10 px-6 rounded-xl bg-[var(--color-primary)] hover:brightness-110 text-white text-[11px] font-black uppercase tracking-widest shadow-lg shadow-[var(--color-primary)]/20 transition-all flex items-center gap-2"
                            >
                                {(importRawData.length > 0 && importFileName) ? (
                                    <>Lanjutkan <FontAwesomeIcon icon={faArrowRight} /></>
                                ) : (
                                    <>Pilih File <FontAwesomeIcon icon={faUpload} /></>
                                )}
                            </button>
                        ) : importStep === 2 ? (
                            <button
                                onClick={async () => {
                                    setImportStep(3)
                                    setImportLoading(true)
                                    await buildImportPreview(importRawData, importColumnMapping)
                                    setImportLoading(false)
                                }}
                                disabled={!importColumnMapping.name || !importColumnMapping.class_name}
                                className="h-10 px-6 rounded-xl bg-[var(--color-primary)] hover:brightness-110 text-white text-[11px] font-black uppercase tracking-widest disabled:opacity-40 shadow-lg shadow-[var(--color-primary)]/20 transition-all flex items-center gap-2"
                            >
                                Review Data <FontAwesomeIcon icon={faArrowRight} />
                            </button>
                        ) : (
                            <button
                                onClick={handleCommitImport}
                                disabled={importing || hasImportBlockingErrors || importReadyRows.length === 0}
                                className="h-10 px-6 rounded-xl bg-[var(--color-primary)] hover:brightness-110 text-white text-[11px] font-black uppercase tracking-widest disabled:opacity-40 shadow-lg shadow-[var(--color-primary)]/20 transition-all flex items-center gap-2"
                            >
                                {importing
                                    ? <><FontAwesomeIcon icon={faSpinner} className="fa-spin" /> Mengimport...</>
                                    : <><FontAwesomeIcon icon={faCheck} /> Selesaikan Import</>}
                            </button>
                        )}
                    </div>
                </div>
            }
        >
            {/* Header Progress Steppers */}
            <div className="flex items-center justify-center gap-3 mb-6">
                {[
                    { step: 1, label: 'Upload', desc: 'Pilih File' },
                    { step: 2, label: 'Mapping', desc: 'Atur Kolom' },
                    { step: 3, label: 'Review', desc: 'Validasi' },
                ].map((s, idx) => (
                    <React.Fragment key={s.step}>
                        <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-black transition-all shadow-sm
                                ${importStep >= s.step ? 'bg-[var(--color-primary)] text-white scale-110' : 'bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] border border-[var(--color-border)] opacity-40'}`}>
                                {importStep > s.step ? <FontAwesomeIcon icon={faCheck} className="text-[9px]" /> : s.step}
                            </div>
                            <div className="flex flex-col">
                                <span className={`text-[10px] md:text-[11px] font-black uppercase tracking-wider leading-none ${importStep >= s.step ? 'text-[var(--color-text)]' : 'text-[var(--color-text-muted)] opacity-50'}`}>{s.label}</span>
                                <span className="text-[9px] font-bold text-[var(--color-text-muted)] opacity-40 uppercase tracking-tight mt-1">{s.desc}</span>
                            </div>
                        </div>
                        {s.step < 3 && <div className={`w-6 h-0.5 rounded-full transition-all ${importStep > s.step ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)] opacity-30'}`} />}
                    </React.Fragment>
                ))}
            </div>

            {/* Consolidated File Status Bar (SaaS Style) */}
            {importFileName && (
                <div className="flex items-center justify-between gap-4 mb-6 px-1 animate-in fade-in slide-in-from-top-4 duration-700">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 shrink-0 shadow-sm">
                            <FontAwesomeIcon icon={faFileLines} className="text-[10px]" />
                            <span className="text-[10.5px] font-black truncate max-w-[240px]">{importFileName}</span>
                        </div>
                        {importPreview.length > 0 && (
                            <div className="px-3.5 py-1.5 rounded-full bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text-muted)] text-[10px] font-black shadow-sm shrink-0">
                                {importPreview.length} baris
                            </div>
                        )}
                    </div>

                    <button
                        onClick={handleImportClick}
                        className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-red-500 hover:border-red-500/30 text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 shadow-sm group"
                    >
                        <FontAwesomeIcon icon={faArrowRightArrowLeft} className="text-[9px] group-hover:rotate-180 transition-transform duration-500" />
                        Ganti File
                    </button>
                </div>
            )}

            {importStep === 1 && (
                <div className="space-y-2.5">
                    <div
                        onDragOver={e => { e.preventDefault(); setImportDragOver(true) }}
                        onDragLeave={() => setImportDragOver(false)}
                        onDrop={async e => {
                            e.preventDefault()
                            setImportDragOver(false)
                            const file = e.dataTransfer.files?.[0]
                            if (file) await processImportFile(file)
                        }}
                        onClick={() => importFileInputRef.current?.click()}
                        className={`w-full h-14 rounded-xl border-2 border-dashed cursor-pointer flex items-center justify-center gap-3 transition-all
                        ${importDragOver
                                ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 scale-[1.01]'
                                : 'border-[var(--color-primary)]/30 bg-[var(--color-primary)]/4 hover:border-[var(--color-primary)]/60 hover:bg-[var(--color-primary)]/8'}`}
                    >
                        <FontAwesomeIcon icon={faUpload} className={`text-sm transition-all ${importDragOver ? 'text-[var(--color-primary)] scale-110' : 'text-[var(--color-primary)]/60'}`} />
                        <div className="text-left">
                            <p className="text-[11px] font-black text-[var(--color-primary)] uppercase tracking-wider leading-none">
                                {importDragOver ? 'Lepaskan file di sini' : 'Drag & Drop atau Klik untuk Pilih File'}
                            </p>
                            <p className="text-[10px] text-[var(--color-text-muted)] font-bold mt-1 opacity-60">Mendukung .csv dan .xlsx</p>
                        </div>
                    </div>

                    {/* --- Reference & Guidance Section (Compact & Zero-Scroll) --- */}
                    <div className="space-y-4">
                        {/* Top Header: Actions & Classes Reference */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3 bg-[var(--color-surface-alt)]/50 rounded-2xl border border-[var(--color-border)] shadow-sm">
                            <div className="flex items-center gap-6">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                                        <FontAwesomeIcon icon={faSchool} className="text-xs" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black uppercase tracking-wider text-[var(--color-text)]">Data Referensi</span>
                                        <span className="text-[8px] font-bold text-emerald-600">Siswa & Kelas</span>
                                    </div>
                                </div>

                                <div className="relative" ref={classesDropdownRef}>
                                    <button
                                        onClick={() => setShowClassesDropdown(!showClassesDropdown)}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all duration-300
                                            ${showClassesDropdown
                                                ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/20'
                                                : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text)] hover:border-emerald-500/50 hover:bg-emerald-500/5'}`}
                                    >
                                        <span className="text-[10px] font-black uppercase tracking-widest">Daftar Kelas Valid</span>
                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-lg ${showClassesDropdown ? 'bg-white/20' : 'bg-emerald-500/10 text-emerald-600'}`}>{classesList.length}</span>
                                        <FontAwesomeIcon icon={faChevronDown} className={`text-[8px] transition-transform duration-300 ${showClassesDropdown ? 'rotate-180' : ''}`} />
                                    </button>

                                    {showClassesDropdown && (
                                        <div className="absolute top-full left-0 mt-2 w-[320px] bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-2xl z-[100] animate-in fade-in slide-in-from-top-2 duration-200">
                                            <div className="p-3 border-b border-[var(--color-border)]/50">
                                                <span className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">Daftar Kelas (Copy & Paste):</span>
                                            </div>
                                            <div className="p-2 max-h-[140px] overflow-y-auto custom-scrollbar">
                                                <div className="grid grid-cols-2 gap-1.5">
                                                    {classesList.map(c => (
                                                        <span key={c.id} className="px-2 py-1.5 rounded-lg bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[9px] font-bold text-[var(--color-text)] hover:border-emerald-500/30 transition-colors truncate">
                                                            {c.name}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="p-3 bg-[var(--color-surface-alt)]/30 rounded-b-2xl border-t border-[var(--color-border)]/50">
                                                <p className="text-[8px] text-[var(--color-text-muted)] italic leading-tight">
                                                    * Pastikan penulisan di Excel persis seperti di atas.
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <button
                                onClick={handleDownloadTemplate}
                                className="shrink-0 h-9 px-4 rounded-xl bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-emerald-600 hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-emerald-500/20"
                            >
                                <FontAwesomeIcon icon={faDownload} /> Download Template
                            </button>
                        </div>

                        {/* Bottom: Excel Structure Table */}
                        <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] overflow-hidden shadow-sm flex flex-col">
                            <div className="px-4 py-2 bg-[var(--color-surface-alt)] border-b border-[var(--color-border)] flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <FontAwesomeIcon icon={faTableList} className="text-[var(--color-primary)] text-xs" />
                                    <span className="text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)]">Visualisasi Struktur Kolom Excel</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="relative flex h-1.5 w-1.5">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                                    </span>
                                    <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">Auto-Match Active</span>
                                </div>
                            </div>

                            <div className="overflow-hidden bg-[var(--color-surface-alt)]/10">
                                <table className="w-full border-collapse table-fixed">
                                    <thead>
                                        <tr className="bg-[var(--color-surface)]">
                                            <th className="w-8 border-r border-b border-[var(--color-border)]"></th>
                                            {[
                                                { l: 'A', k: 'NAME', n: 'Nama Lengkap', w: 'w-[21%]' },
                                                { l: 'B', k: 'GENDER', n: 'L/P', w: 'w-[13%]' },
                                                { l: 'C', k: 'CLASS', n: 'Nama Kelas', w: 'w-[21%]' },
                                                { l: 'D', k: 'WA', n: 'WhatsApp', w: 'w-[14%]' },
                                                { l: 'E', k: 'NIS', n: 'NIS', w: 'w-[13%]' },
                                                { l: 'F', k: 'WALI', n: 'Wali', w: 'w-[18%]' }
                                            ].map((col, i) => (
                                                <th key={i} className={`px-2 py-1.5 border-r border-b border-[var(--color-border)] text-left ${col.w} min-w-0 overflow-hidden`}>
                                                    <div className="flex flex-col min-w-0">
                                                        <div className="flex items-center justify-between gap-1 min-w-0">
                                                            <span className="text-[9px] font-black text-[var(--color-text)] shrink-0">{col.l}</span>
                                                            <span className="text-[7.5px] font-bold text-emerald-600 opacity-80 truncate" title={col.k}>({col.k})</span>
                                                        </div>
                                                        <div className="h-0.5 w-full bg-emerald-500/20 rounded-full mt-1"></div>
                                                    </div>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {[
                                            [t('behavior.tplStudent1'), language === 'en' ? 'M' : 'L', t('behavior.tplClass1'), '08123...', '2024001', language === 'en' ? 'James Smith' : language === 'ar' ? 'محمد' : 'Ahmad'],
                                            [t('behavior.tplStudent2'), language === 'en' ? 'F' : 'P', t('behavior.tplClass2'), '08567...', '2024002', language === 'en' ? 'Mary Doe' : language === 'ar' ? 'علي' : 'Aminah']
                                        ].map((row, rIdx) => (
                                            <tr key={rIdx}>
                                                <td className="bg-[var(--color-surface-alt)] border-r border-b border-[var(--color-border)] text-[8px] font-bold text-[var(--color-text-muted)] text-center py-1">
                                                    {rIdx + 1}
                                                </td>
                                                {row.map((cell, cIdx) => (
                                                    <td key={cIdx} className="px-2 py-1 border-r border-b border-[var(--color-border)] bg-[var(--color-surface)]/40 overflow-hidden">
                                                        <span className="text-[9px] font-medium text-[var(--color-text)] opacity-70 truncate block" title={cell}>{cell}</span>
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="px-4 py-1.5 bg-[var(--color-surface)] border-t border-[var(--color-border)] flex items-center justify-between">
                                <p className="text-[8px] text-[var(--color-text-muted)] font-medium italic opacity-60">
                                    * Gunakan judul kolom yang mendekati nama di atas untuk pencocokan otomatis.
                                </p>
                                <div className="flex gap-1.5">
                                    {['.xlsx', '.csv'].map(ext => (
                                        <span key={ext} className="text-[7px] font-black text-[var(--color-primary)] px-1 py-0.5 bg-[var(--color-primary)]/5 rounded border border-[var(--color-primary)]/10">{ext}</span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {importStep === 2 && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Cocokkan Kolom File</span>
                        <span className="text-[9px] font-bold py-1 px-2 rounded-lg bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text-muted)]">
                            {importFileHeaders.length} kolom ditemukan
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[35vh] overflow-y-auto pr-1 custom-scrollbar">
                        {SYSTEM_COLS.map(sys => {
                            const mapped = importColumnMapping[sys.key]
                            return (
                                <div key={sys.key} className={`p-2.5 rounded-xl border transition-all ${mapped ? 'bg-emerald-500/4 border-emerald-500/20' : 'bg-[var(--color-surface-alt)]/50 border-[var(--color-border)]'}`}>
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex flex-col w-[130px] shrink-0">
                                            <span className="text-[10px] font-black text-[var(--color-text)] flex items-center gap-1">
                                                {sys.label}
                                                {['name', 'class_name'].includes(sys.key) && <span className="text-red-500 text-[9px]">*</span>}
                                            </span>
                                            <span className="text-[8px] font-bold text-[var(--color-text-muted)] opacity-50 uppercase tracking-tight">Sistem</span>
                                        </div>

                                        <div className="flex items-center gap-1.5 opacity-30">
                                            <FontAwesomeIcon icon={faArrowRight} className={`text-[8px] ${mapped ? 'text-emerald-500 opacity-100' : ''}`} />
                                        </div>

                                        <div className="flex-1 min-w-0 relative">
                                            <RichSelect
                                                small
                                                value={mapped || ''}
                                                onChange={(val) => setImportColumnMapping(v => ({ ...v, [sys.key]: val }))}
                                                options={importFileHeaders.map(h => ({ id: h, name: h }))}
                                                placeholder="-- Lewati Kolom --"
                                                extraOption={{ id: '', name: '-- Lewati Kolom --' }}
                                                status={mapped ? 'success' : 'normal'}
                                                searchable={importFileHeaders.length > 5}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {importStep === 3 && (
                <div className="space-y-4">
                    {importLoading ? (
                        <div className="flex items-center justify-center py-14 text-[var(--color-text-muted)] gap-2">
                            <FontAwesomeIcon icon={faSpinner} className="fa-spin" />
                            <span className="text-xs font-bold">Memproses preview...</span>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Minimal Status & Action Bar */}
                            <div className="flex flex-wrap items-center justify-between gap-3 p-2 rounded-2xl bg-[var(--color-surface-alt)]/50 border border-[var(--color-border)] shadow-sm">
                                {/* Stats Group */}
                                <div className="flex items-center gap-2 p-1 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)]/50">
                                    {[
                                        { label: 'Total Baris', value: importPreview.length, color: 'text-[var(--color-text-muted)]', bg: 'bg-[var(--color-border)]/20', icon: faFileLines },
                                        { label: 'Siap Import', value: importReadyRows.length, color: 'text-emerald-600', bg: 'bg-emerald-500/10', icon: faCheckCircle },
                                        { label: 'Siswa Duplikat', value: importPreview.filter(r => r._isDupe).length, color: 'text-violet-600', bg: 'bg-violet-500/10', icon: faCopy },
                                        { label: 'Ada Isu/Error', value: importPreview.filter(r => r._hasError).length, color: 'text-red-600', bg: 'bg-red-500/10', icon: faCircleExclamation },
                                    ].map((stat, i) => (
                                        <div key={i} className={`flex items-center gap-2 px-2 py-1 rounded-lg ${stat.bg} ${stat.color} transition-all`} title={stat.label}>
                                            <FontAwesomeIcon icon={stat.icon} className="text-[10px] opacity-70" />
                                            <span className="text-[11px] font-black">{stat.value}</span>
                                        </div>
                                    ))}
                                </div>

                                {/* Actions Group */}
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setImportSkipDupes(!importSkipDupes)}
                                        className={`flex items-center gap-2 h-8 px-3 rounded-xl border text-[10px] font-black uppercase tracking-tight transition-all
                                            ${importSkipDupes
                                                ? 'bg-violet-500 text-white border-violet-500 shadow-md shadow-violet-500/20'
                                                : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] border-[var(--color-border)] hover:border-violet-500/40 hover:text-violet-600'}`}
                                    >
                                        <FontAwesomeIcon icon={faCopy} className="text-[9px]" />
                                        <span className="hidden sm:inline">{importSkipDupes ? 'Lewati Duplikat' : 'Ikutkan Duplikat'}</span>
                                        <span className="sm:hidden">{importSkipDupes ? 'Lewati' : 'Ikut'}</span>
                                    </button>

                                    <button
                                        onClick={() => setFilterIssuesOnly(!filterIssuesOnly)}
                                        className={`flex items-center gap-2 h-8 px-3 rounded-xl border text-[10px] font-black uppercase tracking-tight transition-all
                                            ${filterIssuesOnly
                                                ? 'bg-red-500 text-white border-red-500 shadow-md shadow-red-500/20'
                                                : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] border-[var(--color-border)] hover:border-red-500/40 hover:text-red-500'}`}
                                    >
                                        <FontAwesomeIcon icon={filterIssuesOnly ? faCheck : faFilter} className="text-[9px]" />
                                        <span>{filterIssuesOnly ? 'Hanya Isu' : 'Semua'}</span>
                                    </button>
                                </div>
                            </div>

                            {/* Bulk Fix Section - Smart Suggestion */}
                            {importIssues.some(iss => iss.messages.some(m => m.includes('Kelas tidak valid'))) && (
                                <div className="p-3 rounded-2xl bg-amber-500/5 border border-amber-500/15 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in zoom-in-95 duration-500">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                                            <FontAwesomeIcon icon={faBolt} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">Perbaikan Massal Tersedia</p>
                                            <p className="text-[10px] font-bold text-amber-600/80">Beberapa baris memiliki kelas yang tidak dikenali. Petakan semuanya ke satu kelas?</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <select
                                            onChange={(e) => {
                                                if (e.target.value) {
                                                    handleBulkFix('class_id', e.target.value);
                                                    e.target.value = '';
                                                }
                                            }}
                                            className="h-9 px-3 rounded-xl bg-white border border-amber-500/30 text-[10px] font-black uppercase tracking-widest outline-none focus:ring-4 focus:ring-amber-500/10 transition-all cursor-pointer"
                                        >
                                            <option value="">-- Pilih Kelas --</option>
                                            {classesList.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })).map(c => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            )}

                            <div className="rounded-2xl border border-[var(--color-border)] overflow-hidden bg-[var(--color-surface)] shadow-sm">
                                <div className="max-h-[40vh] overflow-auto scrollbar-none">
                                    <table className="w-full border-collapse table-fixed">
                                        <thead>
                                            <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-alt)]/30">
                                                <th className="px-2 py-2 text-left text-[8px] font-black uppercase tracking-tighter text-[var(--color-text-muted)] w-[18%]">Nama</th>
                                                <th className="px-2 py-2 text-left text-[8px] font-black uppercase tracking-tighter text-[var(--color-text-muted)] w-[18%]">Kelas</th>
                                                <th className="px-2 py-2 text-center text-[8px] font-black uppercase tracking-tighter text-[var(--color-text-muted)] w-[12%]">L/P</th>
                                                <th className="px-2 py-2 text-left text-[8px] font-black uppercase tracking-tighter text-[var(--color-text-muted)] w-[20%]">Whatsapp</th>
                                                <th className="px-2 py-2 text-left text-[8px] font-black uppercase tracking-tighter text-[var(--color-text-muted)] w-[20%]">NISN</th>
                                                <th className="px-2 py-2 text-center text-[8px] font-black uppercase tracking-tighter text-[var(--color-text-muted)] w-[12%]">Aksi</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {importPreview
                                                .map((r, originalIdx) => ({ ...r, originalIdx }))
                                                .filter(r => !filterIssuesOnly || (r._hasError || r._isDupe || r._hasWarn))
                                                .slice(0, 300)
                                                .map((r) => {
                                                    const i = r.originalIdx
                                                    const isError = r._hasError
                                                    const isDupe = r._isDupe
                                                    const isWarn = r._hasWarn
                                                    return (
                                                        <tr key={i} className={`hover:bg-[var(--color-surface-alt)]/40 transition-colors border-b border-[var(--color-border)]/30 last:border-0 ${isError ? 'bg-red-500/3' : isDupe ? 'bg-violet-500/3' : ''}`}>
                                                            <td className="px-2 py-0.5 font-bold text-[var(--color-text)] text-[10px] truncate">
                                                                <EditableCell
                                                                    rowIdx={i} colKey="name" value={r.name}
                                                                    importPreview={importPreview} classesList={classesList}
                                                                    importEditCell={importEditCell} setImportEditCell={setImportEditCell}
                                                                    handleImportCellEdit={handleImportCellEdit}
                                                                />
                                                            </td>
                                                            <td className="px-2 py-0.5 text-[var(--color-text-muted)] font-bold text-[10px] truncate">
                                                                <EditableCell
                                                                    rowIdx={i} colKey="class_id" value={r.class_id}
                                                                    importPreview={importPreview} classesList={classesList}
                                                                    importEditCell={importEditCell} setImportEditCell={setImportEditCell}
                                                                    handleImportCellEdit={handleImportCellEdit}
                                                                />
                                                            </td>
                                                            <td className="px-2 py-0.5 text-center text-[var(--color-text-muted)] font-bold text-[10px]">
                                                                <EditableCell
                                                                    rowIdx={i} colKey="gender" value={r.gender}
                                                                    importPreview={importPreview} classesList={classesList}
                                                                    importEditCell={importEditCell} setImportEditCell={setImportEditCell}
                                                                    handleImportCellEdit={handleImportCellEdit}
                                                                />
                                                            </td>
                                                            <td className="px-2 py-0.5 text-[var(--color-text-muted)] font-bold text-[10px] truncate">
                                                                <EditableCell
                                                                    rowIdx={i} colKey="phone" value={r.phone}
                                                                    importPreview={importPreview} classesList={classesList}
                                                                    importEditCell={importEditCell} setImportEditCell={setImportEditCell}
                                                                    handleImportCellEdit={handleImportCellEdit}
                                                                />
                                                            </td>
                                                            <td className="px-2 py-0.5 text-[var(--color-text-muted)] font-bold text-[10px] truncate">
                                                                <EditableCell
                                                                    rowIdx={i} colKey="nisn" value={r.nisn}
                                                                    importPreview={importPreview} classesList={classesList}
                                                                    importEditCell={importEditCell} setImportEditCell={setImportEditCell}
                                                                    handleImportCellEdit={handleImportCellEdit}
                                                                />
                                                            </td>
                                                            <td className="px-2 py-1">
                                                                <div className="flex items-center justify-center gap-2">
                                                                    {isError ? <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500/15 text-red-600 animate-pulse"><FontAwesomeIcon icon={faCircleExclamation} className="text-[10px]" /></span>
                                                                        : isDupe ? <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-violet-500/15 text-violet-600"><FontAwesomeIcon icon={faCopy} className="text-[10px]" /></span>
                                                                            : isWarn ? <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-500/15 text-amber-600"><FontAwesomeIcon icon={faTriangleExclamation} className="text-[10px]" /></span>
                                                                                : <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-500/15 text-green-600"><FontAwesomeIcon icon={faCheckCircle} className="text-[10px]" /></span>}

                                                                    <button
                                                                        onClick={() => handleRemoveImportRow(i)}
                                                                        className="w-5 h-5 rounded-full bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center group/del"
                                                                        title="Hapus Baris"
                                                                    >
                                                                        <FontAwesomeIcon icon={faTrash} className="text-[9px] group-hover/del:scale-110 transition-transform" />
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )
                                                })}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] bg-[var(--color-surface-alt)] border-t border-[var(--color-border)] flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <span>Menampilkan {Math.min(importPreview.filter(r => !filterIssuesOnly || (r._hasError || r._isDupe || r._hasWarn)).length, 300)} dari {importPreview.length} total baris</span>
                                        <div className="w-px h-3 bg-[var(--color-border)]" />
                                        <span className="text-emerald-600 flex items-center gap-1.5">
                                            <FontAwesomeIcon icon={faCheckCircle} className="text-[8px]" />
                                            {importReadyRows.length} baris siap diimport
                                        </span>
                                    </div>
                                    {filterIssuesOnly && <span className="text-red-500 animate-pulse">Filter "Hanya Isu" Aktif</span>}
                                </div>
                            </div>

                            {importIssues.length > 0 && (
                                <div className="rounded-2xl border border-[var(--color-border)] overflow-hidden bg-[var(--color-surface-alt)]/20">
                                    <button
                                        type="button"
                                        onClick={() => setImportValidationOpen(v => !v)}
                                        className="w-full px-3 py-2 bg-[var(--color-surface-alt)] border-b border-[var(--color-border)] flex items-center justify-between hover:bg-[var(--color-border)]/30 transition-colors cursor-pointer"
                                    >
                                        <span className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] flex items-center gap-1.5">
                                            <FontAwesomeIcon icon={faChevronDown} className={`text-[7px] transition-transform ${importValidationOpen ? '' : '-rotate-90'}`} />
                                            Catatan Validasi
                                        </span>
                                        <span className="text-[8px] font-bold text-[var(--color-text-muted)] opacity-50">{importIssues.length} isu</span>
                                    </button>
                                    {importValidationOpen && <div className="max-h-[140px] overflow-auto divide-y divide-[var(--color-border)]">
                                        {importIssues.map((issue, idx) => {
                                            const levelStyle = issue.level === 'error'
                                                ? { pill: 'bg-red-500/15 text-red-600', row: 'border-l-2 border-l-red-500 bg-red-500/3' }
                                                : issue.level === 'dupe'
                                                    ? { pill: 'bg-violet-500/15 text-violet-600', row: 'border-l-2 border-l-violet-500 bg-violet-500/3' }
                                                    : { pill: 'bg-amber-500/15 text-amber-600', row: 'border-l-2 border-l-amber-400 bg-amber-500/3' }
                                            return (
                                                <div key={idx} className={`flex items-start gap-3 px-3 py-2 ${levelStyle.row}`}>
                                                    <span className={`mt-0.5 shrink-0 px-1.5 py-0.5 rounded text-[8px] font-black ${levelStyle.pill}`}>
                                                        {issue.level === 'dupe' ? 'DUPLIKAT' : issue.level.toUpperCase()}
                                                    </span>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-[9px] font-black text-[var(--color-text-muted)] mb-0.5">Baris {issue.row}</p>
                                                        {issue.messages.map((msg, mi) => (
                                                            <p key={mi} className="text-[10px] font-bold text-[var(--color-text)] leading-snug">{msg}</p>
                                                        ))}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

        </Modal>
    )
}

