import React, { useState, useMemo, useRef, useEffect } from 'react'
import {
    CheckCircle2, FileText, Sliders, Loader2, Table, AlertTriangle, Users, Contact,
    Download, Hash, Star, HelpCircle, Tags, PieChart, ArrowDownAZ, FileSpreadsheet,
    ChevronDown, Settings, Heading, MoveHorizontal, MoveVertical, User, School, BookOpen,
    Heart, Brush, Languages, Scale, Ruler, HeartPulse, AlertCircle, DoorOpen, FileArchive, Printer
} from 'lucide-react'
import { Modal } from '@shared/components'

export default function RaportExportModal({
    isOpen,
    onClose,
    students = [],
    selectedStudentIds = [],
    activeClassName = '',
    selectedMonthName = '',
    selectedYear = '',
    exporting,
    handleExportCSV,
    handleExportExcel,
    handleExportAllClasses,
    handleExportZip,
    handlePrintAll,
    addToast,
    criteria = [],
    reportType
}) {
    const COLUMN_DEFS = useMemo(() => {
        const cols = [
            { key: 'nama', label: 'Nama Santri', icon: User }
        ]
        
        // Dynamic criteria columns
        if (criteria && criteria.length > 0) {
            criteria.forEach(k => {
                cols.push({
                    key: k.key,
                    label: `Nilai ${k.id}`,
                    icon: k.icon || Star
                })
            })
        } else {
            // fallback to bulanan columns if empty
            cols.push(
                { key: 'nilai_akhlak', label: 'Nilai Akhlak', icon: Star },
                { key: 'nilai_ibadah', label: 'Nilai Ibadah', icon: Heart },
                { key: 'nilai_kebersihan', label: 'Nilai Kebersihan', icon: Brush },
                { key: 'nilai_quran', label: 'Nilai Al-Qur\'an', icon: BookOpen },
                { key: 'nilai_bahasa', label: 'Nilai Bahasa', icon: Languages }
            )
        }

        // Common computed and extra columns
        cols.push(
            { key: 'avg', label: 'Rata-rata', icon: PieChart },
            { key: 'predikat', label: 'Predikat', icon: ArrowDownAZ },
            { key: 'berat_badan', label: 'Berat Badan', icon: Scale },
            { key: 'tinggi_badan', label: 'Tinggi Badan', icon: Ruler },
            { key: 'ziyadah', label: 'Ziyadah', icon: BookOpen },
            { key: 'murojaah', label: 'Muroja\'ah', icon: FileText },
            { key: 'hari_sakit', label: 'Absen Sakit', icon: HeartPulse },
            { key: 'hari_izin', label: 'Absen Izin', icon: AlertCircle },
            { key: 'hari_alpa', label: 'Absen Alpa', icon: AlertTriangle },
            { key: 'hari_pulang', label: 'Absen Pulang', icon: DoorOpen },
            { key: 'catatan', label: 'Catatan Musyrif', icon: FileText }
        )

        return cols
    }, [criteria])

    const PRESETS = useMemo(() => {
        const critKeys = (criteria && criteria.length > 0) ? criteria.map(k => k.key) : ['nilai_akhlak', 'nilai_ibadah', 'nilai_kebersihan', 'nilai_quran', 'nilai_bahasa']
        return [
            { id: 'all', label: 'Lengkap', cols: ['nama', ...critKeys, 'avg', 'predikat', 'berat_badan', 'tinggi_badan', 'ziyadah', 'murojaah', 'hari_sakit', 'hari_izin', 'hari_alpa', 'hari_pulang', 'catatan'] },
            { id: 'academic', label: 'Akademik Only', cols: ['nama', ...critKeys, 'avg', 'predikat'] },
            { id: 'physical', label: 'Kesehatan & Fisik', cols: ['nama', 'berat_badan', 'tinggi_badan'] },
            { id: 'attendance', label: 'Absensi/Kehadiran', cols: ['nama', 'hari_sakit', 'hari_izin', 'hari_alpa', 'hari_pulang'] },
            { id: 'evaluation', label: 'Tahfidz & Catatan', cols: ['nama', 'ziyadah', 'murojaah', 'catatan'] },
        ]
    }, [criteria])

    const defaultFileName = useMemo(() => {
        const monthStr = selectedMonthName ? `_${selectedMonthName}` : ''
        const classStr = activeClassName ? `_${activeClassName}` : '_Semua_Kelas'
        return `Raport${classStr}${monthStr}_${selectedYear}`.replace(/\s+/g, '_')
    }, [activeClassName, selectedMonthName, selectedYear])

    const [fileName, setFileName] = useState('')
    const [exportScope, setExportScope] = useState('filtered') // 'filtered' | 'selected' | 'all'
    const [exportColumns, setExportColumns] = useState([])
    const [advancedOpen, setAdvancedOpen] = useState(false)
    const [includeHeader, setIncludeHeader] = useState(true)
    const containerRef = useRef(null)

    // Set initial values
    useEffect(() => {
        if (isOpen) {
            setFileName(defaultFileName)
            if (PRESETS[0]) {
                setExportColumns(PRESETS[0].cols)
            }
            setExportScope(selectedStudentIds.length > 0 ? 'selected' : 'filtered')
        }
    }, [isOpen, defaultFileName, selectedStudentIds, PRESETS])

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
    }, [exportColumns, PRESETS])

    const columnButtons = useMemo(() => {
        return COLUMN_DEFS.map(({ key, label, icon }) => {
            const orderIdx = exportColumns.indexOf(key) + 1
            const isSelected = orderIdx > 0

            const toggleColumn = () => {
                if (key === 'nama') return // Nama must always be included
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
                    disabled={key === 'nama'}
                    className={`group relative flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl border text-left transition-all
                        ${key === 'nama' ? 'opacity-90 cursor-not-allowed border-emerald-200/50 bg-emerald-500/5 text-emerald-600' : ''}
                        ${isSelected && key !== 'nama'
                            ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 text-[var(--color-primary)] shadow-sm'
                            : !isSelected && key !== 'nama' ? 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-surface-alt)]' : ''}
                    `}
                >
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-all 
                        ${key === 'nama' ? 'bg-emerald-500 text-white shadow-sm' : ''}
                        ${isSelected && key !== 'nama' ? 'bg-[var(--color-primary)] text-white shadow-sm' : ''}
                        ${!isSelected && key !== 'nama' ? 'bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] group-hover:text-[var(--color-primary)]' : ''}`}>
                        {(() => {
                            const IconComp = icon
                            return <IconComp className="w-3 h-3" />
                        })()}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className={`text-[9px] font-black uppercase tracking-tight truncate 
                            ${key === 'nama' ? 'text-emerald-700 dark:text-emerald-500' : ''}
                            ${isSelected && key !== 'nama' ? 'text-[var(--color-primary)]' : ''}
                            ${!isSelected && key !== 'nama' ? 'text-[var(--color-text-muted)]' : ''}`}>{label}</div>
                    </div>
                    {isSelected && key !== 'nama' && (
                        <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[var(--color-primary)] text-white text-[8px] font-black flex items-center justify-center shadow-md border border-white dark:border-[var(--color-surface)] animate-in zoom-in duration-200">
                            {orderIdx}
                        </div>
                    )}
                </button>
            )
        })
    }, [exportColumns])

    if (!isOpen) return null

    const handlePresetClick = (cols) => {
        setExportColumns(cols)
    }

    const exportOptions = {
        includeHeader,
        columns: exportColumns,
        fileName
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Export Data Raport"
            description="Cadangkan, backup, atau cetak massal data raport bulanan santri ke format XLS, CSV, PDF, maupun ZIP."
            icon={Download}
            iconBg="bg-indigo-500/10"
            iconColor="text-indigo-600"
            size="lg"
            mobileVariant="bottom-sheet"
            contentClassName={exporting ? "relative !overflow-hidden" : "relative"}
            footer={
                <div className="flex items-center w-full">
                    <button
                        onClick={onClose}
                        className="h-10 px-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] text-[10px] font-black uppercase tracking-widest hover:bg-[var(--color-surface-alt)] transition-all flex items-center justify-center"
                    >
                        Tutup
                    </button>
                    <div className="flex-1" />
                </div>
            }
        >
            <div ref={containerRef}>
                {/* Premium Loading Overlay */}
                {exporting && (
                    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[var(--color-surface)]/60 backdrop-blur-md animate-in fade-in duration-300">
                        <div className="bg-gradient-to-b from-[var(--color-surface)] to-[var(--color-surface-alt)]/90 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.12)] border border-[var(--color-border)]/60 rounded-3xl p-8 flex flex-col items-center gap-5 scale-110 animate-in zoom-in-95 duration-300">
                            <div className="relative w-16 h-16">
                                <div className="absolute inset-0 rounded-full bg-[var(--color-primary)]/10 animate-ping opacity-75"></div>
                                <div className="absolute inset-0 rounded-full border-2 border-[var(--color-primary)]/10"></div>
                                <div 
                                    className="absolute inset-0 rounded-full border-2 border-transparent border-t-[var(--color-primary)] border-r-[var(--color-primary)] animate-spin"
                                    style={{ filter: 'drop-shadow(0 0 4px var(--color-primary))' }}
                                ></div>
                                <div className="absolute inset-0 m-auto w-10 h-10 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)]/60 flex items-center justify-center shadow-sm z-10">
                                    <Download className="w-5 h-5 text-[var(--color-primary)] animate-pulse" />
                                </div>
                            </div>
                            <div className="flex flex-col items-center">
                                <span className="text-[10px] font-black uppercase tracking-[0.35em] text-[var(--color-primary)]">Mengolah Data</span>
                                <span className="text-[8px] font-extrabold text-[var(--color-text-muted)] uppercase tracking-widest mt-1.5 flex items-center gap-1">
                                    Proses ekspor berjalan
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
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)] opacity-70">1 — Jangkauan Data Raport</p>
                        <div className="grid grid-cols-3 gap-2.5">
                            {[
                                { val: 'filtered', label: 'Kelas Aktif', desc: activeClassName || 'Pilih kelas dulu', icon: Sliders, disabled: !activeClassName },
                                { val: 'selected', label: 'Dipilih', desc: `${selectedStudentIds.length} santri`, icon: CheckCircle2, disabled: selectedStudentIds.length === 0 },
                                { val: 'all', label: 'Semua Kelas', desc: 'Backup seluruh kelas', icon: Users },
                            ].map(({ val, label, desc, icon, disabled }) => (
                                <button
                                    key={val}
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
                                        {(() => {
                                            const IconComp = icon
                                            return <IconComp className="w-4 h-4" />
                                        })()}
                                    </div>
                                    <div className="text-xs font-black text-[var(--color-text)] mb-0.5">{label}</div>
                                    <div className="text-[9px] font-bold text-[var(--color-text-muted)] leading-tight truncate">{desc}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Section 2: Columns */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)] opacity-70">2 — Kolom & Presets Raport</p>
                            <div className="flex gap-2">
                                <button onClick={() => handlePresetClick(COLUMN_DEFS.map(c => c.key))} className="text-[9px] font-black text-[var(--color-primary)] hover:underline uppercase tracking-widest bg-[var(--color-primary)]/5 px-2 py-1 rounded-lg transition-colors">Semua</button>
                                <button onClick={() => handlePresetClick(['nama'])} className="text-[9px] font-black text-rose-500 hover:underline uppercase tracking-widest bg-rose-500/5 px-2 py-1 rounded-lg transition-colors">Reset</button>
                            </div>
                        </div>

                        {/* Presets Grid */}
                        <div className="flex flex-col gap-2 p-3 bg-[var(--color-surface-alt)]/40 rounded-2xl border border-[var(--color-border)]/50">
                            <div className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-wider text-[var(--color-text-muted)] opacity-60">
                                <Tags className="w-3.5 h-3.5" />
                                <span>Pilih Paket Kolom (Preset)</span>
                            </div>
                            <div className="flex flex-row flex-nowrap overflow-x-auto gap-2 pb-0.5 scrollbar-none">
                                {PRESETS.map(preset => {
                                    const isActive = activePresetId === preset.id
                                    return (
                                        <button
                                            key={preset.id}
                                            onClick={() => handlePresetClick(preset.cols)}
                                            className={`px-3 py-1 rounded-full border text-[9px] font-black uppercase tracking-wider transition-all active:scale-95 shrink-0
                                                ${isActive
                                                    ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-sm shadow-[var(--color-primary)]/20'
                                                    : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)]/40 hover:text-[var(--color-primary)]'}`}
                                        >
                                            {preset.label}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Custom Columns Grid */}
                        <div className="relative flex items-center justify-center my-1">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-dashed border-[var(--color-border)]/65"></div>
                            </div>
                            <div className="relative bg-[var(--color-surface)] px-3 text-[8px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-50">
                                Pilih Kolom Kustom
                            </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {columnButtons}
                        </div>
                    </div>

                    {/* Section 3: File Config */}
                    <div className="space-y-3">
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)] opacity-70">3 — Konfigurasi File</p>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="flex-1 relative">
                                <input
                                    type="text"
                                    value={fileName}
                                    onChange={(e) => setFileName(e.target.value)}
                                    placeholder="Nama file export..."
                                    className="w-full bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-xl px-4 py-3 text-xs font-bold focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/20 transition-all placeholder:opacity-50 pr-20"
                                />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-1 rounded bg-[var(--color-border)] text-[8px] font-black uppercase text-[var(--color-text-muted)]">
                                    .xlsx / .csv
                                </div>
                            </div>
                            <button
                                onClick={() => setAdvancedOpen(!advancedOpen)}
                                className={`px-4 py-3 rounded-xl border transition-all flex items-center gap-2 text-xs font-black
                                    ${advancedOpen ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white' : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)]/40'}`}
                            >
                                <Settings className={`w-4 h-4 ${advancedOpen ? 'animate-spin-slow' : ''}`} />
                                Opsi
                            </button>
                        </div>

                        {advancedOpen && (
                            <div className="p-4 rounded-2xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black uppercase tracking-wider text-[var(--color-text-muted)] flex items-center gap-1.5">
                                        <Heading className="w-3.5 h-3.5" />
                                        Sertakan Baris Header
                                    </label>
                                    <div className="flex gap-1 bg-[var(--color-surface)] p-1 rounded-lg border border-[var(--color-border)]">
                                        {[{ v: true, l: 'Ya' }, { v: false, l: 'Tidak' }].map(opt => (
                                            <button
                                                key={String(opt.v)}
                                                onClick={() => setIncludeHeader(opt.v)}
                                                className={`flex-1 py-1 rounded-md text-[9px] font-black uppercase transition-all ${includeHeader === opt.v ? 'bg-[var(--color-primary)] text-white shadow-sm' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]'}`}
                                            >
                                                {opt.l}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Section 4: Export Formats */}
                    <div className="space-y-3">
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)] opacity-70">4 — Mulai Ekspor</p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                            {[
                                {
                                    label: 'Excel',
                                    icon: FileSpreadsheet,
                                    desc: '.xlsx',
                                    onClick: () => {
                                        if (exportScope === 'all') {
                                            handleExportAllClasses(fileName)
                                        } else {
                                            handleExportExcel(exportScope, exportOptions)
                                        }
                                    },
                                    color: 'hover:border-emerald-400 hover:bg-emerald-50 text-emerald-700',
                                    iconColor: 'text-emerald-500',
                                    disabled: exportScope === 'selected' && selectedStudentIds.length === 0,
                                    title: exportScope === 'selected' && selectedStudentIds.length === 0 ? 'Pilih minimal satu santri di tabel untuk menggunakan jangkauan ini' : 'Ekspor data ke Excel'
                                },
                                {
                                    label: 'CSV',
                                    icon: FileText,
                                    desc: 'Universal',
                                    onClick: () => handleExportCSV(exportScope, exportOptions),
                                    color: 'hover:border-slate-400 hover:bg-slate-50 text-slate-700',
                                    iconColor: 'text-slate-500',
                                    disabled: exportScope === 'all' || (exportScope === 'selected' && selectedStudentIds.length === 0),
                                    title: exportScope === 'all' ? 'Format CSV tidak mendukung ekspor multi-sheet kelas sekaligus' : (exportScope === 'selected' && selectedStudentIds.length === 0 ? 'Pilih minimal satu santri di tabel' : 'Ekspor data ke CSV')
                                },
                                {
                                    label: 'ZIP PDF',
                                    icon: FileArchive,
                                    desc: 'PDF Kartu Raport',
                                    onClick: () => handleExportZip(exportScope),
                                    color: 'hover:border-teal-400 hover:bg-teal-50 text-teal-700',
                                    iconColor: 'text-teal-500',
                                    disabled: exportScope === 'all' || (exportScope === 'selected' && selectedStudentIds.length === 0),
                                    title: exportScope === 'all' ? 'Arsip ZIP PDF massal dibatasi per kelas untuk mencegah tab browser crash' : (exportScope === 'selected' && selectedStudentIds.length === 0 ? 'Pilih minimal satu santri di tabel' : 'Unduh semua PDF raport dalam ZIP')
                                },
                                {
                                    label: 'Cetak Raport',
                                    icon: Printer,
                                    desc: 'Cetak Massal',
                                    onClick: () => handlePrintAll(exportScope),
                                    color: 'hover:border-indigo-400 hover:bg-indigo-50 text-indigo-700',
                                    iconColor: 'text-indigo-500',
                                    disabled: exportScope === 'all' || (exportScope === 'selected' && selectedStudentIds.length === 0),
                                    title: exportScope === 'all' ? 'Cetak massal dibatasi per kelas untuk mencegah kelebihan beban memori browser' : (exportScope === 'selected' && selectedStudentIds.length === 0 ? 'Pilih minimal satu santri di tabel' : 'Cetak massal raport kelas ini')
                                },
                            ].map(({ label, icon, desc, onClick, color, iconColor, disabled, title }) => (
                                <button
                                    key={label}
                                    onClick={() => { onClick(); onClose(); }}
                                    disabled={disabled || exporting || exportColumns.length === 0}
                                    title={title}
                                    className={`relative group h-24 rounded-2xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col items-center justify-center gap-1 transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 ${color}`}
                                >
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-1 transition-transform group-hover:scale-110 ${iconColor} bg-[var(--color-surface-alt)]`}>
                                        {(() => {
                                            const IconComp = icon
                                            return <IconComp className="w-5 h-5" />
                                        })()}
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
                                    <span className="text-[8px] font-bold opacity-60 uppercase">{desc}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {exportColumns.length === 0 && (
                        <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-red-500/5 border border-red-500/10 text-red-600 text-xs font-black uppercase tracking-tight animate-pulse">
                            <AlertTriangle className="w-4 h-4" />
                            Pilih minimal satu kolom untuk melanjutkan
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    )
}
