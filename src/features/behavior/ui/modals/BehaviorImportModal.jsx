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
    faStar,
    faCalendarAlt
} from '@fortawesome/free-solid-svg-icons'
import Modal from '@shared/components/Modal'
import RichSelect from '@shared/components/RichSelect'
import { useLanguage } from '@context'

export default function BehaviorImportModal(props) {
    const { language, t, tNum } = useLanguage()
    const tp = (key) => t(`behavior.${key}`)

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
        students, // all students from db
        violationTypes, // all point rules
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
        handleBulkFix,
        copyingData,
        copyDataFromMonth
    } = props

    const currentDate = new Date()
    const currentMonth = currentDate.getMonth() + 1
    const currentYear = currentDate.getFullYear()
    const defaultSourceMonth = currentMonth === 1 ? 12 : currentMonth - 1
    const defaultSourceYear = currentMonth === 1 ? currentYear - 1 : currentYear

    const [importTab, setImportTab] = useState('file') // 'file' | 'copy'
    const [copySourceMonth, setCopySourceMonth] = useState(defaultSourceMonth)
    const [copySourceYear, setCopySourceYear] = useState(defaultSourceYear)
    const [copyTargetMonth, setCopyTargetMonth] = useState(currentMonth)
    const [copyTargetYear, setCopyTargetYear] = useState(currentYear)

    const BULAN = [
        { id: 1, name: language === 'ar' ? 'يناير' : language === 'en' ? 'January' : 'Januari' },
        { id: 2, name: language === 'ar' ? 'فبراير' : language === 'en' ? 'February' : 'Februari' },
        { id: 3, name: language === 'ar' ? 'مارس' : language === 'en' ? 'March' : 'Maret' },
        { id: 4, name: language === 'ar' ? 'أبريل' : language === 'en' ? 'April' : 'April' },
        { id: 5, name: language === 'ar' ? 'مايو' : language === 'en' ? 'May' : 'Mei' },
        { id: 6, name: language === 'ar' ? 'يونيو' : language === 'en' ? 'June' : 'Juni' },
        { id: 7, name: language === 'ar' ? 'يوليو' : language === 'en' ? 'July' : 'Juli' },
        { id: 8, name: language === 'ar' ? 'أغسطس' : language === 'en' ? 'August' : 'Agustus' },
        { id: 9, name: language === 'ar' ? 'سبتمبر' : language === 'en' ? 'September' : 'September' },
        { id: 10, name: language === 'ar' ? 'أكتوبر' : language === 'en' ? 'October' : 'Oktober' },
        { id: 11, name: language === 'ar' ? 'نوفمبر' : language === 'en' ? 'November' : 'November' },
        { id: 12, name: language === 'ar' ? 'ديسمبر' : language === 'en' ? 'December' : 'Desember' },
    ]
    const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i)

    const [filterIssuesOnly, setFilterIssuesOnly] = useState(false)

    // Inline Editor Component - Memoized for high performance in large tables
    const EditableCell = React.memo(({ rowIdx, colKey, value, importPreview, students, violationTypes, importEditCell, setImportEditCell, handleImportCellEdit }) => {
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
                        minWidth: Math.max(coords.width, colKey === 'student_id' ? 240 : 200)
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
                    (s.class_name && s.class_name.toLowerCase().includes(searchTerm.toLowerCase()))
                )

                return (
                    <div ref={cellRef} className="relative">
                        <div className="bg-[var(--color-primary)]/10 rounded-lg px-2 py-1 text-[var(--color-primary)] font-black border border-[var(--color-primary)] shadow-sm">
                            {importPreview[rowIdx]._studentName || tp('importSelectStudent')}
                        </div>
                        {renderDropdown(
                            <>
                                <div className="p-2 border-b border-[var(--color-border)] bg-[var(--color-surface-alt)]/50">
                                    <input
                                        autoFocus
                                        className="w-full bg-transparent text-[10px] font-bold outline-none placeholder:font-normal placeholder:opacity-30"
                                        placeholder={tp('importSearchStudent')}
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
                                            className="w-full px-4 py-2 text-left text-[10px] font-bold hover:bg-[var(--color-primary)]/10 hover:text-[var(--color-primary)] transition-colors flex items-center justify-between group"
                                            onClick={() => {
                                                handleImportCellEdit(rowIdx, colKey, s.id)
                                                setImportEditCell(null)
                                            }}
                                        >
                                            <div className="flex flex-col truncate pr-2">
                                                <span className="truncate">{s.name}</span>
                                                {s.class_name && <span className="text-[8px] text-[var(--color-text-muted)] font-normal">{s.class_name}</span>}
                                            </div>
                                            {value === s.id && <FontAwesomeIcon icon={faCheck} className="text-[8px]" />}
                                        </button>
                                    )) : (
                                        <div className="px-3 py-3 text-[9px] text-[var(--color-text-muted)] italic text-center">{tp('importNoData')}</div>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    className="p-2 text-[8px] font-black uppercase tracking-widest text-[var(--color-text-muted)] hover:text-red-500 transition-colors border-t border-[var(--color-border)]"
                                    onClick={() => setImportEditCell(null)}
                                >
                                    {tp('cancel')}
                                </button>
                            </>
                        )}
                    </div>
                )
            }

            if (colKey === 'violation_type_id') {
                const filteredRules = violationTypes.filter(v =>
                    v.name.toLowerCase().includes(searchTerm.toLowerCase())
                )

                return (
                    <div ref={cellRef} className="relative">
                        <div className="bg-[var(--color-primary)]/10 rounded-lg px-2 py-1 text-[var(--color-primary)] font-black border border-[var(--color-primary)] shadow-sm">
                            {importPreview[rowIdx]._violationName || tp('importSelectBehavior')}
                        </div>
                        {renderDropdown(
                            <>
                                <div className="p-2 border-b border-[var(--color-border)] bg-[var(--color-surface-alt)]/50">
                                    <input
                                        autoFocus
                                        className="w-full bg-transparent text-[10px] font-bold outline-none placeholder:font-normal placeholder:opacity-30"
                                        placeholder={tp('importSearchBehavior')}
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        onKeyDown={e => {
                                            if (e.key === 'Escape') setImportEditCell(null)
                                            if (e.key === 'Enter' && filteredRules.length > 0) {
                                                handleImportCellEdit(rowIdx, colKey, filteredRules[0].id)
                                                setImportEditCell(null)
                                            }
                                        }}
                                    />
                                </div>
                                <div className="max-h-[160px] overflow-auto py-1 scrollbar-none">
                                    {filteredRules.length > 0 ? filteredRules.map(v => (
                                        <button
                                            key={v.id}
                                            type="button"
                                            className="w-full px-4 py-2 text-left text-[10px] font-bold hover:bg-[var(--color-primary)]/10 hover:text-[var(--color-primary)] transition-colors flex items-center justify-between group"
                                            onClick={() => {
                                                handleImportCellEdit(rowIdx, colKey, v.id)
                                                setImportEditCell(null)
                                            }}
                                        >
                                            <div className="flex items-center justify-between w-full">
                                                <span className="truncate pr-2">{v.name}</span>
                                                <span className={`text-[8px] font-black px-1 py-0.5 rounded ${v.points > 0 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'}`}>{v.points > 0 ? `+${tNum(v.points)}` : tNum(v.points)}</span>
                                            </div>
                                            {value === v.id && <FontAwesomeIcon icon={faCheck} className="text-[8px] ml-2 shrink-0" />}
                                        </button>
                                    )) : (
                                        <div className="px-3 py-3 text-[9px] text-[var(--color-text-muted)] italic text-center">{tp('importNoData')}</div>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    className="p-2 text-[8px] font-black uppercase tracking-widest text-[var(--color-text-muted)] hover:text-red-500 transition-colors border-t border-[var(--color-border)]"
                                    onClick={() => setImportEditCell(null)}
                                >
                                    {tp('cancel')}
                                </button>
                            </>
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

        const isCentered = ['points'].includes(colKey)
        let displayValue = value || '-'
        if (colKey === 'student_id') {
            displayValue = importPreview[rowIdx]._studentName || '-'
        } else if (colKey === 'violation_type_id') {
            displayValue = importPreview[rowIdx]._violationName || '-'
        }
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
            title={tp('importTitle')}
            description={tp('importDesc')}
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
                            {tp('cancel')}
                        </button>
                    ) : (
                        <button
                            onClick={() => setImportStep(v => v - 1)}
                            disabled={importing}
                            className="h-10 px-6 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text-muted)] text-[11px] font-black uppercase tracking-widest disabled:opacity-50 hover:bg-[var(--color-border)] transition-all flex items-center gap-2"
                        >
                            <FontAwesomeIcon icon={faArrowLeft} />
                            {tp('back')}
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
                            importTab === 'file' && (
                                <button
                                    onClick={() => (importRawData.length > 0 && importFileName) ? setImportStep(2) : importFileInputRef.current?.click()}
                                    className="h-10 px-6 rounded-xl bg-[var(--color-primary)] hover:brightness-110 text-white text-[11px] font-black uppercase tracking-widest shadow-lg shadow-[var(--color-primary)]/20 transition-all flex items-center gap-2"
                                >
                                    {(importRawData.length > 0 && importFileName) ? (
                                        <>{tp('continue')} <FontAwesomeIcon icon={faArrowRight} /></>
                                    ) : (
                                        <>{tp('importStepUploadDesc')} <FontAwesomeIcon icon={faUpload} /></>
                                    )}
                                </button>
                            )
                        ) : importStep === 2 ? (
                            <button
                                onClick={async () => {
                                    setImportStep(3)
                                    setImportLoading(true)
                                    await buildImportPreview(importRawData, importColumnMapping)
                                    setImportLoading(false)
                                }}
                                disabled={!importColumnMapping.student_name || !importColumnMapping.rule_name}
                                className="h-10 px-6 rounded-xl bg-[var(--color-primary)] hover:brightness-110 text-white text-[11px] font-black uppercase tracking-widest disabled:opacity-40 shadow-lg shadow-[var(--color-primary)]/20 transition-all flex items-center gap-2"
                            >
                                {tp('importReviewDataText')} <FontAwesomeIcon icon={faArrowRight} />
                            </button>
                        ) : (
                            <button
                                onClick={handleCommitImport}
                                disabled={importing || hasImportBlockingErrors || importReadyRows.length === 0}
                                className="h-10 px-6 rounded-xl bg-[var(--color-primary)] hover:brightness-110 text-white text-[11px] font-black uppercase tracking-widest disabled:opacity-40 shadow-lg shadow-[var(--color-primary)]/20 transition-all flex items-center gap-2"
                            >
                                {importing
                                    ? <><FontAwesomeIcon icon={faSpinner} className="fa-spin" /> {tp('importLoadingText')}</>
                                    : <><FontAwesomeIcon icon={faCheck} /> {tp('importFinishText')}</>}
                            </button>
                        )}
                    </div>
                </div>
            }
        >
            {/* Header Progress Steppers */}
            <div className="flex items-center justify-center gap-3 mb-6">
                {[
                    { step: 1, label: tp('importStepUpload'), desc: tp('importStepUploadDesc') },
                    { step: 2, label: tp('importStepMapping'), desc: tp('importStepMappingDesc') },
                    { step: 3, label: tp('importStepReview'), desc: tp('importStepReviewDesc') },
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

            {/* Consolidated File Status Bar */}
            {importFileName && (
                <div className="flex items-center justify-between gap-4 mb-6 px-1 animate-in fade-in slide-in-from-top-4 duration-700">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 shrink-0 shadow-sm">
                            <FontAwesomeIcon icon={faFileLines} className="text-[10px]" />
                            <span className="text-[10.5px] font-black truncate max-w-[240px]">{importFileName}</span>
                        </div>
                        {importPreview.length > 0 && (
                            <div className="px-3.5 py-1.5 rounded-full bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text-muted)] text-[10px] font-black shadow-sm shrink-0">
                                {tNum(importPreview.length)} {tp('importRows')}
                            </div>
                        )}
                    </div>

                    <button
                        onClick={handleImportClick}
                        className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-red-500 hover:border-red-500/30 text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 shadow-sm group"
                    >
                        <FontAwesomeIcon icon={faArrowRightArrowLeft} className="text-[9px] group-hover:rotate-180 transition-transform duration-500" />
                        {tp('importChangeFile')}
                    </button>
                </div>
            )}

            {importStep === 1 && (
                <div className="space-y-2.5">
                    {/* Tab Selection */}
                    <div className="flex gap-1.5 p-1 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] mb-4">
                        <button
                            type="button"
                            onClick={() => setImportTab('file')}
                            className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${importTab === 'file' ? 'bg-[var(--color-surface)] text-[var(--color-primary)] shadow-sm border border-[var(--color-border)]/50' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
                        >
                            <FontAwesomeIcon icon={faUpload} className="text-[9px]" />
                            {tp('importTabFile') || 'Import dari File'}
                        </button>
                        <button
                            type="button"
                            onClick={() => setImportTab('copy')}
                            className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${importTab === 'copy' ? 'bg-[var(--color-surface)] text-[var(--color-primary)] shadow-sm border border-[var(--color-border)]/50' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
                        >
                            <FontAwesomeIcon icon={faCopy} className="text-[9px]" />
                            {tp('importTabCopy') || 'Salin Bulan Lain'}
                        </button>
                    </div>

                    {importTab === 'file' ? (
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
                                        {importDragOver ? tp('importDropActive') : tp('importDropInactive')}
                                    </p>
                                    <p className="text-[10px] text-[var(--color-text-muted)] font-bold mt-1 opacity-60">{tp('importDropSupported')}</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {/* Top Header: Actions & Classes Reference */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3 bg-[var(--color-surface-alt)]/50 rounded-2xl border border-[var(--color-border)] shadow-sm">
                                    <div className="flex items-center gap-6">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                                                <FontAwesomeIcon icon={faSchool} className="text-xs" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-black uppercase tracking-wider text-[var(--color-text)]">{tp('importRefData')}</span>
                                                <span className="text-[8px] font-bold text-emerald-600">{tp('importRefDesc')}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleDownloadTemplate}
                                        className="shrink-0 h-9 px-4 rounded-xl bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-emerald-600 hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-emerald-500/20"
                                    >
                                        <FontAwesomeIcon icon={faDownload} /> {tp('importDownloadTemplate')}
                                    </button>
                                </div>

                                {/* Visual Column Mapping Structure */}
                                <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] overflow-hidden shadow-sm flex flex-col">
                                    <div className="px-4 py-2 bg-[var(--color-surface-alt)] border-b border-[var(--color-border)] flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <FontAwesomeIcon icon={faTableList} className="text-[var(--color-primary)] text-xs" />
                                            <span className="text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)]">{tp('importVisTitle')}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <span className="relative flex h-1.5 w-1.5">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                                            </span>
                                            <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">{tp('importVisAutoMatch')}</span>
                                        </div>
                                    </div>

                                    <div className="overflow-hidden bg-[var(--color-surface-alt)]/10">
                                        <table className="w-full border-collapse table-fixed">
                                            <thead>
                                                <tr className="bg-[var(--color-surface)]">
                                                    <th className="w-8 border-r border-b border-[var(--color-border)]"></th>
                                                    {[
                                                        { l: 'A', k: 'NAME', n: tp('colStudent'), w: 'w-[30%]' },
                                                        { l: 'B', k: 'BEHAVIOR', n: tp('colRule'), w: 'w-[30%]' },
                                                        { l: 'C', k: 'POINTS', n: tp('colPoints'), w: 'w-[12%]' },
                                                        { l: 'D', k: 'NOTES', n: tp('colNotes'), w: 'w-[28%]' }
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
                                                    [tp('tplStudent1'), tp('tplRule1'), '-5', tp('tplNotes1')],
                                                    [tp('tplStudent2'), tp('tplRule2'), '10', tp('tplNotes2_short')]
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
                                            {tp('importVisNote')}
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
                    ) : (
                        <div className="space-y-4 py-2 animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="p-4 rounded-2xl bg-[var(--color-surface-alt)]/50 border border-[var(--color-border)] shadow-sm space-y-4">
                                <div>
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-2">
                                        {tp('copySourceTitle') || 'SUMBER DATA BULANAN'}
                                    </h4>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[8px] font-black text-[var(--color-text-muted)] uppercase tracking-wider mb-1">
                                                {tp('month') || 'Bulan'}
                                            </label>
                                            <RichSelect
                                                small
                                                value={copySourceMonth}
                                                onChange={setCopySourceMonth}
                                                options={BULAN.map(b => ({ id: b.id, name: b.name }))}
                                                placeholder="Pilih Bulan"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[8px] font-black text-[var(--color-text-muted)] uppercase tracking-wider mb-1">
                                                {tp('year') || 'Tahun'}
                                            </label>
                                            <RichSelect
                                                small
                                                value={copySourceYear}
                                                onChange={setCopySourceYear}
                                                options={years.map(y => ({ id: y, name: String(y) }))}
                                                placeholder="Pilih Tahun"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="h-px bg-[var(--color-border)]/65" />

                                <div>
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-2">
                                        {tp('copyTargetTitle') || 'TUJUAN DATA BULANAN'}
                                    </h4>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[8px] font-black text-[var(--color-text-muted)] uppercase tracking-wider mb-1">
                                                {tp('month') || 'Bulan'}
                                            </label>
                                            <RichSelect
                                                small
                                                value={copyTargetMonth}
                                                onChange={setCopyTargetMonth}
                                                options={BULAN.map(b => ({ id: b.id, name: b.name }))}
                                                placeholder="Pilih Bulan"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[8px] font-black text-[var(--color-text-muted)] uppercase tracking-wider mb-1">
                                                {tp('year') || 'Tahun'}
                                            </label>
                                            <RichSelect
                                                small
                                                value={copyTargetYear}
                                                onChange={setCopyTargetYear}
                                                options={years.map(y => ({ id: y, name: String(y) }))}
                                                placeholder="Pilih Tahun"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/15 flex items-start gap-2.5 text-[10px] text-amber-600 font-bold leading-normal">
                                <FontAwesomeIcon icon={faCircleExclamation} className="text-amber-500 mt-0.5 shrink-0" />
                                <div>
                                    {tp('copyWarning') || 'Seluruh data laporan perilaku dari bulan sumber akan disalin ke bulan tujuan. Proses ini akan menduplikasi laporan dengan tanggal yang disesuaikan ke bulan tujuan.'}
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={async () => {
                                    const success = await copyDataFromMonth(copySourceMonth, copySourceYear, copyTargetMonth, copyTargetYear);
                                    if (success) onClose();
                                }}
                                disabled={copyingData}
                                className="w-full h-10 rounded-xl bg-[var(--color-primary)] hover:brightness-110 text-white text-[11px] font-black uppercase tracking-widest disabled:opacity-40 shadow-lg shadow-[var(--color-primary)]/20 transition-all flex items-center justify-center gap-2"
                            >
                                {copyingData ? (
                                    <><FontAwesomeIcon icon={faSpinner} className="fa-spin" /> {tp('copyingText') || 'Menyalin Laporan...'}</>
                                ) : (
                                    <><FontAwesomeIcon icon={faCopy} /> {tp('copyActionText') || 'Salin & Impor Laporan'}</>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            )}

            {importStep === 2 && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">{tp('importMapTitle')}</span>
                        <span className="text-[9px] font-bold py-1 px-2 rounded-lg bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text-muted)]">
                            {tNum(importFileHeaders.length)} {tp('importMapFound')}
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
                                                {tp(sys.labelKey)}
                                                {['student_name', 'rule_name'].includes(sys.key) && <span className="text-red-500 text-[9px]">*</span>}
                                            </span>
                                            <span className="text-[8px] font-bold text-[var(--color-text-muted)] opacity-50 uppercase tracking-tight">{tp('importMapSystem')}</span>
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
                                                placeholder={tp('importMapSkip')}
                                                extraOption={{ id: '', name: tp('importMapSkip') }}
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
                            <span className="text-xs font-bold">{tp('importProcessingPreview')}</span>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Minimal Status & Action Bar */}
                            <div className="flex flex-wrap items-center justify-between gap-3 p-2 rounded-2xl bg-[var(--color-surface-alt)]/50 border border-[var(--color-border)] shadow-sm">
                                {/* Stats Group */}
                                <div className="flex items-center gap-2 p-1 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)]/50">
                                    {[
                                        { label: tp('importStatTotal'), value: tNum(importPreview.length), color: 'text-[var(--color-text-muted)]', bg: 'bg-[var(--color-border)]/20', icon: faFileLines },
                                        { label: tp('importStatReady'), value: tNum(importReadyRows.length), color: 'text-emerald-600', bg: 'bg-emerald-500/10', icon: faCheckCircle },
                                        { label: tp('importStatIssues'), value: tNum(importPreview.filter(r => r._hasError).length), color: 'text-red-600', bg: 'bg-red-500/10', icon: faCircleExclamation },
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
                                        type="button"
                                        onClick={() => setFilterIssuesOnly(!filterIssuesOnly)}
                                        className={`flex items-center gap-2 h-8 px-3 rounded-xl border text-[10px] font-black uppercase tracking-tight transition-all
                                            ${filterIssuesOnly
                                                ? 'bg-red-500 text-white border-red-500 shadow-md shadow-red-500/20'
                                                : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] border-[var(--color-border)] hover:border-red-500/40 hover:text-red-500'}`}
                                    >
                                        <FontAwesomeIcon icon={filterIssuesOnly ? faCheck : faFilter} className="text-[9px]" />
                                        <span>{filterIssuesOnly ? tp('importFilterIssues') : tp('importFilterAll')}</span>
                                    </button>
                                </div>
                            </div>

                            {/* Bulk Fix Section - Smart Suggestion */}
                            {importIssues.some(iss => iss.types?.includes('student')) && (
                                <div className="p-3 rounded-2xl bg-amber-500/5 border border-amber-500/15 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in zoom-in-95 duration-500">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                                            <FontAwesomeIcon icon={faBolt} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">{tp('importBulkStudentTitle')}</p>
                                            <p className="text-[10px] font-bold text-amber-600/80">{tp('importBulkStudentDesc')}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <select
                                            onChange={(e) => {
                                                if (e.target.value) {
                                                    handleBulkFix('student_id', e.target.value);
                                                    e.target.value = '';
                                                }
                                            }}
                                            className="h-9 px-3 rounded-xl bg-white border border-amber-500/30 text-[10px] font-black uppercase tracking-widest outline-none focus:ring-4 focus:ring-amber-500/10 transition-all cursor-pointer"
                                        >
                                            <option value="">{tp('importBulkStudentSelect')}</option>
                                            {students.sort((a, b) => a.name.localeCompare(b.name)).map(s => (
                                                <option key={s.id} value={s.id}>{s.name} ({s.class_name || tp('importNoClass')})</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            )}

                            {importIssues.some(iss => iss.types?.includes('rule')) && (
                                <div className="p-3 rounded-2xl bg-violet-500/5 border border-violet-500/15 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in zoom-in-95 duration-500">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-xl bg-violet-500/10 text-violet-600 flex items-center justify-center shrink-0">
                                            <FontAwesomeIcon icon={faBolt} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-violet-700">{tp('importBulkBehaviorTitle')}</p>
                                            <p className="text-[10px] font-bold text-violet-600/80">{tp('importBulkBehaviorDesc')}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <select
                                            onChange={(e) => {
                                                if (e.target.value) {
                                                    handleBulkFix('violation_type_id', e.target.value);
                                                    e.target.value = '';
                                                }
                                            }}
                                            className="h-9 px-3 rounded-xl bg-white border border-violet-500/30 text-[10px] font-black uppercase tracking-widest outline-none focus:ring-4 focus:ring-violet-500/10 transition-all cursor-pointer"
                                        >
                                            <option value="">{tp('importBulkBehaviorSelect')}</option>
                                            {violationTypes.sort((a, b) => a.name.localeCompare(b.name)).map(v => (
                                                <option key={v.id} value={v.id}>{v.name} ({v.points > 0 ? `+${tNum(v.points)}` : tNum(v.points)})</option>
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
                                                <th className="px-2 py-2 text-left text-[8px] font-black uppercase tracking-tighter text-[var(--color-text-muted)] w-[26%]">{tp('colStudent')}</th>
                                                <th className="px-2 py-2 text-left text-[8px] font-black uppercase tracking-tighter text-[var(--color-text-muted)] w-[28%]">{tp('colRule')}</th>
                                                <th className="px-2 py-2 text-center text-[8px] font-black uppercase tracking-tighter text-[var(--color-text-muted)] w-[12%]">{tp('colPoints')}</th>
                                                <th className="px-2 py-2 text-left text-[8px] font-black uppercase tracking-tighter text-[var(--color-text-muted)] w-[22%]">{tp('colNotes')}</th>
                                                <th className="px-2 py-2 text-center text-[8px] font-black uppercase tracking-tighter text-[var(--color-text-muted)] w-[12%]">{tp('importRowActions')}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {importPreview
                                                .map((r, originalIdx) => ({ ...r, originalIdx }))
                                                .filter(r => !filterIssuesOnly || r._hasError)
                                                .slice(0, 300)
                                                .map((r) => {
                                                    const i = r.originalIdx
                                                    const isError = r._hasError
                                                    return (
                                                        <tr key={i} className={`hover:bg-[var(--color-surface-alt)]/40 transition-colors border-b border-[var(--color-border)]/30 last:border-0 ${isError ? 'bg-red-500/3' : ''}`}>
                                                            <td className="px-2 py-0.5 font-bold text-[var(--color-text)] text-[10px] truncate">
                                                                <EditableCell
                                                                    rowIdx={i} colKey="student_id" value={r.student_id}
                                                                    importPreview={importPreview} students={students} violationTypes={violationTypes}
                                                                    importEditCell={importEditCell} setImportEditCell={setImportEditCell}
                                                                    handleImportCellEdit={handleImportCellEdit}
                                                                />
                                                            </td>
                                                            <td className="px-2 py-0.5 text-[var(--color-text-muted)] font-bold text-[10px] truncate">
                                                                <EditableCell
                                                                    rowIdx={i} colKey="violation_type_id" value={r.violation_type_id}
                                                                    importPreview={importPreview} students={students} violationTypes={violationTypes}
                                                                    importEditCell={importEditCell} setImportEditCell={setImportEditCell}
                                                                    handleImportCellEdit={handleImportCellEdit}
                                                                />
                                                            </td>
                                                            <td className="px-2 py-0.5 text-center text-[var(--color-text-muted)] font-bold text-[10px]">
                                                                <EditableCell
                                                                    rowIdx={i} colKey="points" value={r.points}
                                                                    importPreview={importPreview} students={students} violationTypes={violationTypes}
                                                                    importEditCell={importEditCell} setImportEditCell={setImportEditCell}
                                                                    handleImportCellEdit={handleImportCellEdit}
                                                                />
                                                            </td>
                                                            <td className="px-2 py-0.5 text-[var(--color-text-muted)] font-bold text-[10px] truncate">
                                                                <EditableCell
                                                                    rowIdx={i} colKey="notes" value={r.notes}
                                                                    importPreview={importPreview} students={students} violationTypes={violationTypes}
                                                                    importEditCell={importEditCell} setImportEditCell={setImportEditCell}
                                                                    handleImportCellEdit={handleImportCellEdit}
                                                                />
                                                            </td>
                                                            <td className="px-2 py-1">
                                                                <div className="flex items-center justify-center gap-2">
                                                                    {isError ? <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500/15 text-red-600 animate-pulse"><FontAwesomeIcon icon={faCircleExclamation} className="text-[10px]" /></span>
                                                                        : <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-500/15 text-green-600"><FontAwesomeIcon icon={faCheckCircle} className="text-[10px]" /></span>}

                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleRemoveImportRow(i)}
                                                                        className="w-5 h-5 rounded-full bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center group/del"
                                                                        title={tp('importDeleteRow')}
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
                                        <span>{tp('importShowingRows').replace('{shown}', tNum(Math.min(importPreview.filter(r => !filterIssuesOnly || r._hasError).length, 300))).replace('{total}', tNum(importPreview.length))}</span>
                                        <div className="w-px h-3 bg-[var(--color-border)]" />
                                        <span className="text-emerald-600 flex items-center gap-1.5">
                                            <FontAwesomeIcon icon={faCheckCircle} className="text-[8px]" />
                                            {tNum(importReadyRows.length)} {tp('importRowsReady')}
                                        </span>
                                    </div>
                                    {filterIssuesOnly && <span className="text-red-500 animate-pulse">{tp('importActiveFilterIssues')}</span>}
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
                                            {tp('importValidationNotes')}
                                        </span>
                                        <span className="text-[8px] font-bold text-[var(--color-text-muted)] opacity-50">{tNum(importIssues.length)} {tp('importValidationCount')}</span>
                                    </button>
                                    {importValidationOpen && <div className="max-h-[140px] overflow-auto divide-y divide-[var(--color-border)]">
                                        {importIssues.map((issue, idx) => {
                                            const levelStyle = issue.level === 'error'
                                                ? { pill: 'bg-red-500/15 text-red-600', row: 'border-l-2 border-l-red-500 bg-red-500/3' }
                                                : { pill: 'bg-amber-500/15 text-amber-600', row: 'border-l-2 border-l-amber-400 bg-amber-500/3' }
                                            return (
                                                <div key={idx} className={`flex items-start gap-3 px-3 py-2 ${levelStyle.row}`}>
                                                    <span className={`mt-0.5 shrink-0 px-1.5 py-0.5 rounded text-[8px] font-black ${levelStyle.pill}`}>
                                                        {issue.level.toUpperCase()}
                                                    </span>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-[9px] font-black text-[var(--color-text-muted)] mb-0.5">{tp('row')} {tNum(issue.row)}</p>
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
