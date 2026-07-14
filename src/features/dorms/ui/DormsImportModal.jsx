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
    faChevronUp,
    faUser,
    faHome,
    faVenusMars
} from '@fortawesome/free-solid-svg-icons'
import Modal from '@shared/components/Modal'

export default function DormsImportModal(props) {
    const {
        isOpen,
        onClose,
        importing,
        importStep,
        setImportStep,
        importPreview,
        importFileName,
        importFileInputRef,
        importDragOver,
        setImportDragOver,
        processImportFile,
        students = [], // all students from db
        dorms = [], // all dorms
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
        handleBulkFix
    } = props

    const [filterIssuesOnly, setFilterIssuesOnly] = useState(false)

    // Inline Editor Component - Memoized for high performance in large tables
    const EditableCell = React.memo(({ rowIdx, colKey, value, importPreview, students, dorms, importEditCell, setImportEditCell, handleImportCellEdit }) => {
        const isEditing = importEditCell?.row === rowIdx && importEditCell?.col === colKey
        const [searchTerm, setSearchTerm] = useState('')
        const cellRef = useRef(null)
        const [coords, setCoords] = useState(null)

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
                        minWidth: Math.max(coords.width, colKey === 'student_id' ? 240 : 180)
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
            if (colKey === 'student_id') {
                const filteredStudents = students.filter(s =>
                    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (s.classes?.name && s.classes.name.toLowerCase().includes(searchTerm.toLowerCase()))
                )

                return (
                    <div ref={cellRef} className="relative">
                        <div className="bg-[var(--color-primary)]/10 rounded-lg px-2 py-1 text-[var(--color-primary)] font-black border border-[var(--color-primary)] shadow-sm">
                            {importPreview[rowIdx]._studentName || 'Pilih Santri...'}
                        </div>
                        {renderDropdown(
                            <>
                                <div className="p-2 border-b border-[var(--color-border)] bg-[var(--color-surface-alt)]/50">
                                    <input
                                        autoFocus
                                        className="w-full bg-transparent text-[10px] font-bold outline-none placeholder:font-normal placeholder:opacity-30 text-[var(--color-text)]"
                                        placeholder="Cari nama santri..."
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        onKeyDown={e => {
                                            if (e.key === 'Escape') setImportEditCell(null)
                                            if (e.key === 'Enter' && filteredStudents.length > 0) {
                                                handleImportCellEdit(rowIdx, colKey, filteredStudents[0].id)
                                                setImportEditCell(null)
                                            }
                                        }}
                                    />
                                </div>
                                <div className="max-h-[160px] overflow-auto py-1 scrollbar-none">
                                    {filteredStudents.length > 0 ? filteredStudents.map(s => (
                                        <button
                                            key={s.id}
                                            type="button"
                                            className="w-full px-4 py-2 text-left text-[10px] font-bold hover:bg-[var(--color-primary)]/10 hover:text-[var(--color-primary)] transition-colors flex items-center justify-between group text-[var(--color-text)]"
                                            onClick={() => {
                                                handleImportCellEdit(rowIdx, colKey, s.id)
                                                setImportEditCell(null)
                                            }}
                                        >
                                            <div className="flex flex-col truncate pr-2">
                                                <span className="truncate">{s.name}</span>
                                                {s.classes?.name && <span className="text-[8px] text-[var(--color-text-muted)] font-normal">{s.classes.name}</span>}
                                            </div>
                                            {value === s.id && <FontAwesomeIcon icon={faCheck} className="text-[8px]" />}
                                        </button>
                                    )) : (
                                        <div className="px-3 py-3 text-[9px] text-[var(--color-text-muted)] italic text-center">Data tidak ditemukan</div>
                                    )}
                                </div>
                                <button
                                    type="button"
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

            if (colKey === 'room_id') {
                const filteredRooms = dorms.filter(d =>
                    d.id.toLowerCase().includes(searchTerm.toLowerCase())
                )

                return (
                    <div ref={cellRef} className="relative">
                        <div className="bg-[var(--color-primary)]/10 rounded-lg px-2 py-1 text-[var(--color-primary)] font-black border border-[var(--color-primary)] shadow-sm">
                            {importPreview[rowIdx]._roomName || 'Pilih Kamar...'}
                        </div>
                        {renderDropdown(
                            <>
                                <div className="p-2 border-b border-[var(--color-border)] bg-[var(--color-surface-alt)]/50">
                                    <input
                                        autoFocus
                                        className="w-full bg-transparent text-[10px] font-bold outline-none placeholder:font-normal placeholder:opacity-30 text-[var(--color-text)]"
                                        placeholder="Cari kamar..."
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        onKeyDown={e => {
                                            if (e.key === 'Escape') setImportEditCell(null)
                                            if (e.key === 'Enter' && filteredRooms.length > 0) {
                                                handleImportCellEdit(rowIdx, colKey, filteredRooms[0].id)
                                                setImportEditCell(null)
                                            }
                                        }}
                                    />
                                </div>
                                <div className="max-h-[160px] overflow-auto py-1 scrollbar-none">
                                    {filteredRooms.length > 0 ? filteredRooms.map(d => (
                                        <button
                                            key={d.id}
                                            type="button"
                                            className="w-full px-4 py-2 text-left text-[10px] font-bold hover:bg-[var(--color-primary)]/10 hover:text-[var(--color-primary)] transition-colors flex items-center justify-between group text-[var(--color-text)]"
                                            onClick={() => {
                                                handleImportCellEdit(rowIdx, colKey, d.id)
                                                setImportEditCell(null)
                                            }}
                                        >
                                            <div className="flex flex-col">
                                                <span>Kamar {d.id}</span>
                                                <span className="text-[8px] text-[var(--color-text-muted)] font-normal uppercase">{d.building} · {d.gender}</span>
                                            </div>
                                            {value === d.id && <FontAwesomeIcon icon={faCheck} className="text-[8px]" />}
                                        </button>
                                    )) : (
                                        <div className="px-3 py-3 text-[9px] text-[var(--color-text-muted)] italic text-center">Kamar tidak ditemukan</div>
                                    )}
                                </div>
                                <button
                                    type="button"
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
        }

        const hasError = colKey === 'student_id' 
            ? !importPreview[rowIdx].student_id 
            : colKey === 'room_id'
                ? !importPreview[rowIdx].room_id
                : false

        return (
            <div
                ref={cellRef}
                onClick={() => setImportEditCell({ row: rowIdx, col: colKey })}
                className={`group px-2.5 py-1.5 rounded-lg border text-left cursor-pointer transition-all flex items-center justify-between
                    ${hasError
                        ? 'border-red-500/30 bg-red-500/5 hover:bg-red-500/10 text-red-600'
                        : 'border-transparent hover:border-[var(--color-primary)]/30 hover:bg-[var(--color-primary)]/5 text-[var(--color-text)]'}`}
            >
                <span className="font-bold truncate max-w-[90%]">
                    {colKey === 'student_id'
                        ? (importPreview[rowIdx]._studentName || '—')
                        : colKey === 'room_id'
                            ? (importPreview[rowIdx]._roomName || '—')
                            : value}
                </span>
                <FontAwesomeIcon icon={faPen} className="text-[8px] opacity-0 group-hover:opacity-60 transition-opacity text-[var(--color-text-muted)]" />
            </div>
        )
    })

    if (!isOpen) return null

    const handleImportClickInternal = () => {
        importFileInputRef.current?.click()
    }

    const errorCount = importIssues.filter(x => x.level === 'error').length
    const warningCount = importIssues.filter(x => x.level === 'warning').length

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Import Plotting Kamar"
            description="Unggah file spreadsheet (.csv / .xlsx) untuk memplotting kamar santri secara massal."
            icon={faFileImport}
            iconBg="bg-amber-500/10"
            iconColor="text-amber-600"
            size={importStep === 3 ? 'xl' : 'lg'}
            mobileVariant="bottom-sheet"
            contentClassName={importing ? "relative !overflow-hidden" : "relative"}
            footer={
                <div className="flex items-center w-full gap-3">
                    {importStep > 1 && (
                        <button
                            type="button"
                            onClick={() => setImportStep(prev => prev - 1)}
                            className="h-10 px-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] text-[10px] font-black uppercase tracking-widest hover:bg-[var(--color-surface-alt)] hover:text-[var(--color-text)] transition-all flex items-center gap-2"
                        >
                            <FontAwesomeIcon icon={faArrowLeft} />
                            Kembali
                        </button>
                    )}
                    <div className="flex-1" />
                    {importStep === 2 && (
                        <button
                            type="button"
                            onClick={async () => {
                                setImportLoading(true)
                                try {
                                    await buildImportPreview(importRawData, importColumnMapping)
                                    setImportStep(3)
                                } finally {
                                    setImportLoading(false)
                                }
                            }}
                            disabled={!importColumnMapping.student_name || !importColumnMapping.room_name}
                            className="h-10 px-6 rounded-xl bg-[var(--color-primary)] text-white text-[10px] font-black uppercase tracking-widest hover:bg-[var(--color-primary)]/90 transition-all flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            Verifikasi Data
                            <FontAwesomeIcon icon={faArrowRight} />
                        </button>
                    )}
                    {importStep === 3 && (
                        <button
                            type="button"
                            onClick={handleCommitImport}
                            disabled={hasImportBlockingErrors || importPreview.length === 0}
                            className="h-10 px-6 rounded-xl bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-emerald-600/10"
                        >
                            Simpan ke Asrama
                            <FontAwesomeIcon icon={faCheck} />
                        </button>
                    )}
                </div>
            }
        >
            <div>
                {/* Overlay Import Progress / Saving */}
                {importing && (
                    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[var(--color-surface)]/60 backdrop-blur-md animate-in fade-in duration-300">
                        <div className="bg-gradient-to-b from-[var(--color-surface)] to-[var(--color-surface-alt)]/90 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.12)] border border-[var(--color-border)]/60 rounded-3xl p-8 flex flex-col items-center gap-5 scale-110 animate-in zoom-in-95 duration-300 w-80">
                            <div className="relative w-16 h-16">
                                <div className="absolute inset-0 rounded-full bg-emerald-500/10 animate-ping opacity-75"></div>
                                <div className="absolute inset-0 rounded-full border-2 border-emerald-500/10"></div>
                                <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-emerald-500 border-r-emerald-500 animate-spin"></div>
                                <div className="absolute inset-0 m-auto w-10 h-10 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)]/60 flex items-center justify-center shadow-sm z-10">
                                    <FontAwesomeIcon icon={faSpinner} className="text-emerald-500 text-sm animate-spin" />
                                </div>
                            </div>
                            <div className="flex flex-col items-center w-full">
                                <span className="text-[10px] font-black uppercase tracking-[0.35em] text-emerald-500">Menyimpan</span>
                                <span className="text-[9px] font-extrabold text-[var(--color-text-muted)] uppercase tracking-wider mt-1 text-center">
                                    Memproses Plotting Kamar...
                                </span>
                            </div>
                            <div className="w-full space-y-2 mt-2">
                                <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">
                                    <span>Kemajuan</span>
                                    <span>{importProgress.done} / {importProgress.total}</span>
                                </div>
                                <div className="w-full h-2 rounded-full bg-[var(--color-border)] overflow-hidden">
                                    <div
                                        className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                                        style={{ width: `${(importProgress.done / (importProgress.total || 1)) * 100}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Main Wizard Step UI */}
                <div className={`space-y-6 pb-2 transition-all duration-500 ${importing ? 'blur-sm grayscale-[0.5] opacity-50 pointer-events-none' : ''}`}>

                    {/* Step 1: File Upload */}
                    {importStep === 1 && (
                        <div className="space-y-5">
                            {/* Upload Area */}
                            <div className="flex flex-col items-center justify-center">
                                <input
                                    type="file"
                                    ref={importFileInputRef}
                                    className="hidden"
                                    accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                                    onChange={(e) => { const file = e.target.files?.[0]; if (file) processImportFile(file) }}
                                />
                                <div
                                    onDragOver={e => { e.preventDefault(); setImportDragOver(true) }}
                                    onDragLeave={() => setImportDragOver(false)}
                                    onDrop={async e => { e.preventDefault(); setImportDragOver(false); const file = e.dataTransfer.files?.[0]; if (file) await processImportFile(file) }}
                                    onClick={handleImportClickInternal}
                                    className={`w-full h-44 rounded-2xl border-2 border-dashed cursor-pointer flex flex-col items-center justify-center gap-4 transition-all
                                        ${importDragOver
                                            ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 scale-[1.01]'
                                            : 'border-[var(--color-border)] bg-[var(--color-surface-alt)]/30 hover:border-[var(--color-primary)]/60 hover:bg-[var(--color-primary)]/5'}`}
                                >
                                    {importLoading ? (
                                        <div className="flex flex-col items-center gap-2">
                                            <FontAwesomeIcon icon={faSpinner} className="text-2xl text-[var(--color-primary)] animate-spin" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Membaca file...</span>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="w-12 h-12 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center text-[var(--color-primary)]">
                                                <FontAwesomeIcon icon={faUpload} className="text-lg" />
                                            </div>
                                            <div className="text-center space-y-1">
                                                <p className="text-xs font-black text-[var(--color-text)]">Pilih atau Tarik File Spreadsheet Anda</p>
                                                <p className="text-[9px] text-[var(--color-text-muted)] font-bold uppercase tracking-wider">Mendukung format .csv dan .xlsx</p>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Download Template & Instructions Card */}
                            <div className="p-4 rounded-2xl bg-[var(--color-surface-alt)]/40 border border-[var(--color-border)] flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
                                        <p className="text-[10px] font-black uppercase tracking-wider text-[var(--color-text)]">Gunakan Template File Asrama</p>
                                    </div>
                                    <p className="text-[9px] text-[var(--color-text-muted)] font-bold max-w-md">
                                        Pastikan dokumen Anda berisi kolom minimal: Nama Siswa, Kelas, dan Nama Kamar agar terpetakan otomatis.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleDownloadTemplate}
                                    className="px-4 py-2.5 rounded-xl border border-[var(--color-border)] hover:border-[var(--color-primary)]/50 hover:bg-[var(--color-primary)]/5 text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-all flex items-center justify-center gap-2 shrink-0 bg-[var(--color-surface)] shadow-sm"
                                >
                                    <FontAwesomeIcon icon={faDownload} className="text-[10px]" />
                                    Unduh Template
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Columns Mapping */}
                    {importStep === 2 && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-amber-500/5 border border-amber-500/10 text-amber-600 text-[10px] font-bold">
                                <FontAwesomeIcon icon={faTriangleExclamation} className="text-xs shrink-0" />
                                <div>
                                    Petakan kolom dari file spreadsheet Anda (Kanan) ke Kolom Sistem LaporanMu (Kiri).
                                    Kolom yang cocok akan terpilih otomatis.
                                </div>
                            </div>

                            <div className="border border-[var(--color-border)] rounded-2xl overflow-hidden bg-[var(--color-surface)]">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="bg-[var(--color-surface-alt)] border-b border-[var(--color-border)]">
                                            <th className="px-4 py-3 text-left text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] w-1/2">Kolom Sistem</th>
                                            <th className="px-4 py-3 text-left text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] w-1/2">Kolom File Anda</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--color-border)]">
                                        {SYSTEM_COLS.map(sys => {
                                            const mappedVal = importColumnMapping[sys.key] || ''
                                            const isRequired = sys.key !== 'class_name'
                                            return (
                                                <tr key={sys.key} className="hover:bg-[var(--color-surface-alt)]/25 transition-colors">
                                                    <td className="px-4 py-3.5 flex flex-col gap-0.5">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-[10px] font-black text-[var(--color-text)]">{sys.label}</span>
                                                            {isRequired && <span className="text-[8px] bg-red-500/15 text-red-500 px-1.5 py-0.5 rounded font-black uppercase">Wajib</span>}
                                                        </div>
                                                        <span className="text-[8px] text-[var(--color-text-muted)] font-normal uppercase tracking-wider">Kunci: {sys.key}</span>
                                                    </td>
                                                    <td className="px-4 py-3.5">
                                                        <div className="relative">
                                                            <select
                                                                value={mappedVal}
                                                                onChange={(e) => {
                                                                    const val = e.target.value
                                                                    setImportColumnMapping(prev => ({ ...prev, [sys.key]: val }))
                                                                }}
                                                                className={`w-full bg-[var(--color-surface-alt)] border rounded-xl px-3 py-2 text-[10px] font-bold outline-none focus:border-[var(--color-primary)] transition-all appearance-none pr-8 text-[var(--color-text)]
                                                                    ${isRequired && !mappedVal ? 'border-red-500/30' : 'border-[var(--color-border)]'}`}
                                                            >
                                                                <option value="">-- Abaikan Kolom Ini --</option>
                                                                {importFileHeaders.map(h => (
                                                                    <option key={h} value={h}>{h}</option>
                                                                ))}
                                                            </select>
                                                            <FontAwesomeIcon icon={faChevronDown} className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] text-[var(--color-text-muted)] pointer-events-none" />
                                                        </div>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Review & Validation */}
                    {importStep === 3 && (
                        <div className="space-y-4">
                            {/* Validation Stats / Alert */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-[var(--color-surface-alt)] border border-[var(--color-border)]">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${errorCount > 0 ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`}></div>
                                        <p className="text-[10px] font-black uppercase tracking-wider text-[var(--color-text)]">Hasil Validasi Dokumen</p>
                                    </div>
                                    <p className="text-[9px] text-[var(--color-text-muted)] font-bold">
                                        Ditemukan <span className="text-red-500 font-extrabold">{errorCount} kesalahan</span> data santri / kamar yang tidak terdaftar di database.
                                    </p>
                                </div>

                                {/* Filter & Controls */}
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setFilterIssuesOnly(p => !p)}
                                        className={`px-3 py-1.5 rounded-xl border text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5
                                            ${filterIssuesOnly 
                                                ? 'bg-red-500/10 border-red-500/30 text-red-600' 
                                                : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)]/40'}`}
                                    >
                                        <FontAwesomeIcon icon={faFilter} className="text-[8px]" />
                                        Hanya Tampilkan Error
                                    </button>
                                </div>
                            </div>

                            {/* Bulk Fix Quick Actions (If Errors Exist) */}
                            {errorCount > 0 && (
                                <div className="p-3.5 rounded-2xl border border-red-500/10 bg-red-500/5 flex flex-col md:flex-row md:items-center justify-between gap-3 animate-in slide-in-from-top-2 duration-200">
                                    <div className="flex items-start gap-2.5">
                                        <FontAwesomeIcon icon={faBolt} className="text-red-500 text-xs mt-0.5 shrink-0" />
                                        <div className="space-y-0.5">
                                            <p className="text-[10px] font-black uppercase tracking-wider text-[var(--color-text)]">Perbaikan Cepat Massal</p>
                                            <p className="text-[8px] text-[var(--color-text-muted)] font-bold">Petakan semua rekod yang bermasalah langsung ke satu nilai kamar yang sama di bawah.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 min-w-[200px] max-w-xs w-full relative">
                                        <select
                                            onChange={(e) => {
                                                if (e.target.value) {
                                                    handleBulkFix('room_id', e.target.value)
                                                    e.target.value = ''
                                                }
                                            }}
                                            className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-[9px] font-black uppercase tracking-widest outline-none focus:border-red-500/40 appearance-none pr-8 text-[var(--color-text)]"
                                        >
                                            <option value="">-- Peta Massal Kamar --</option>
                                            {dorms.map(d => (
                                                <option key={d.id} value={d.id}>KAMAR {d.id}</option>
                                            ))}
                                        </select>
                                        <FontAwesomeIcon icon={faChevronDown} className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] text-[var(--color-text-muted)] pointer-events-none" />
                                    </div>
                                </div>
                            )}

                            {/* Table Preview */}
                            <div className="border border-[var(--color-border)] rounded-2xl overflow-hidden bg-[var(--color-surface)] max-h-[300px] overflow-y-auto">
                                <table className="w-full border-collapse">
                                    <thead className="bg-[var(--color-surface-alt)] border-b border-[var(--color-border)] sticky top-0 z-10">
                                        <tr>
                                            <th className="px-3 py-2.5 text-left text-[8px] font-black uppercase tracking-tighter text-[var(--color-text-muted)] w-[6%]">No</th>
                                            <th className="px-3 py-2.5 text-left text-[8px] font-black uppercase tracking-tighter text-[var(--color-text-muted)] w-[32%]">Nama Santri</th>
                                            <th className="px-3 py-2.5 text-left text-[8px] font-black uppercase tracking-tighter text-[var(--color-text-muted)] w-[20%]">Kelas</th>
                                            <th className="px-3 py-2.5 text-left text-[8px] font-black uppercase tracking-tighter text-[var(--color-text-muted)] w-[32%]">Kamar Target</th>
                                            <th className="px-3 py-2.5 text-center text-[8px] font-black uppercase tracking-tighter text-[var(--color-text-muted)] w-[10%]">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--color-border)]">
                                        {importPreview.map((row, idx) => {
                                            const issues = importIssues.find(x => x.row === idx + 2)
                                            const hasError = row._hasError
                                            
                                            if (filterIssuesOnly && !hasError) return null

                                            return (
                                                <tr key={idx} className={`hover:bg-[var(--color-surface-alt)]/20 transition-all ${hasError ? 'bg-red-500/[0.02]' : ''}`}>
                                                    <td className="px-3 py-2 text-[9px] font-black text-[var(--color-text-muted)] text-left">
                                                        {idx + 1}
                                                    </td>
                                                    <td className="px-3 py-2 text-[9px] font-bold">
                                                        <EditableCell
                                                            rowIdx={idx}
                                                            colKey="student_id"
                                                            value={row.student_id}
                                                            importPreview={importPreview}
                                                            students={students}
                                                            dorms={dorms}
                                                            importEditCell={importEditCell}
                                                            setImportEditCell={setImportEditCell}
                                                            handleImportCellEdit={handleImportCellEdit}
                                                        />
                                                    </td>
                                                    <td className="px-3 py-2 text-[9px] font-bold text-[var(--color-text-muted)]">
                                                        {row._className || '—'}
                                                    </td>
                                                    <td className="px-3 py-2 text-[9px] font-bold">
                                                        <EditableCell
                                                            rowIdx={idx}
                                                            colKey="room_id"
                                                            value={row.room_id}
                                                            importPreview={importPreview}
                                                            students={students}
                                                            dorms={dorms}
                                                            importEditCell={importEditCell}
                                                            setImportEditCell={setImportEditCell}
                                                            handleImportCellEdit={handleImportCellEdit}
                                                        />
                                                    </td>
                                                    <td className="px-3 py-2 text-center">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveImportRow(idx)}
                                                            className="w-7 h-7 rounded-lg hover:bg-red-500/10 text-[var(--color-text-muted)] hover:text-red-500 transition-all flex items-center justify-center"
                                                            title="Hapus baris ini dari import"
                                                        >
                                                            <FontAwesomeIcon icon={faTrash} className="text-[9px]" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                        {importPreview.length === 0 && (
                                            <tr>
                                                <td colSpan="5" className="px-4 py-8 text-center text-[10px] text-[var(--color-text-muted)] italic font-bold">
                                                    Tidak ada data asrama
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    )
}
