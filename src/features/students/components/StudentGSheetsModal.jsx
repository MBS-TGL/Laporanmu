import React, { useMemo } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCircleCheck, faCircleExclamation, faDownload, faLink, faSpinner, faTable, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons'
import Modal from '@shared/components/Modal'
import { useLanguage } from '@context'

export default function StudentGSheetsModal({
    isOpen,
    onClose,
    gSheetsUrl,
    setGSheetsUrl,
    fetchingGSheets,
    handleFetchGSheets,
    onDownloadTemplate
}) {
    const { t, language } = useLanguage()
    // --- Enterprise Logic: Smart URL Validation ---
    const urlStatus = useMemo(() => {
        if (!gSheetsUrl) return 'empty'
        if (gSheetsUrl.includes('docs.google.com/spreadsheets/d/')) {
            // Check if it's likely a complete ID (at least 20 chars for ID)
            const match = gSheetsUrl.match(/\/d\/([a-zA-Z0-9-_]{20,})/)
            return match ? 'valid' : 'incomplete'
        }
        return 'invalid'
    }, [gSheetsUrl])

    if (!isOpen) return null

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Import dari Google Sheets"
            description={<span className="block truncate">Sinkronisasi secara otomatis melalui tautan publik Google Sheets.</span>}
            icon={faLink}
            iconBg="bg-emerald-500/10"
            iconColor="text-emerald-600"
            size="md"
            mobileVariant="bottom-sheet"
            footer={
                <div className="flex items-center w-full gap-2">
                    <button
                        onClick={onDownloadTemplate}
                        title="Download Format Excel/CSV"
                        className="h-10 px-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-emerald-600 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-all flex items-center justify-center gap-1.5 shrink-0 group"
                    >
                        <FontAwesomeIcon icon={faDownload} className="opacity-80 group-hover:animate-bounce text-[9px]" />
                        <span>Template</span>
                    </button>

                    <button
                        onClick={onClose}
                        className="h-10 px-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] text-[10px] font-black uppercase tracking-widest hover:bg-[var(--color-surface-alt)] transition-all flex items-center justify-center shrink-0"
                    >
                        Batal
                    </button>

                    <div className="flex-1" />
                    
                    <button
                        onClick={handleFetchGSheets}
                        disabled={fetchingGSheets || urlStatus !== 'valid'}
                        className="h-10 px-4 rounded-xl bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 border border-white/10 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {fetchingGSheets ? (
                            <><FontAwesomeIcon icon={faSpinner} className="fa-spin text-[9px]" /> <span>Sinkron...</span></>
                        ) : (
                            <><FontAwesomeIcon icon={faLink} className="opacity-80 text-[9px]" /> <span>Hubungkan</span></>
                        )}
                    </button>
                </div>
            }
        >
            <div className="space-y-6">
                {/* 1. Guideline & Format Table */}
                <div className="group rounded-[1.5rem] border border-[var(--color-border)] overflow-hidden bg-[var(--color-surface)] shadow-sm hover:border-emerald-500/30 transition-all">
                    <div className="bg-emerald-500/[0.03] px-4 py-3 flex items-center justify-between border-b border-[var(--color-border)]">
                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                            <FontAwesomeIcon icon={faTable} className="opacity-50" />
                            Struktur Kolom Wajib
                        </span>
                        <div className="flex gap-1">
                            {[1, 2, 3].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-emerald-500/20" />)}
                        </div>
                    </div>
                    <div className="overflow-x-auto custom-scrollbar p-1">
                        <table className="w-full text-left border-collapse min-w-[400px]">
                            <thead>
                                <tr>
                                    <th className="px-3 py-2 text-[10px] font-black text-center text-[var(--color-text-muted)] border-b border-r border-[var(--color-border)] bg-[var(--color-surface-alt)]/30 w-10"></th>
                                    {[
                                        { col: 'A', key: 'name' },
                                        { col: 'B', key: 'gender' },
                                        { col: 'C', key: 'phone' },
                                        { col: 'D', key: 'class_name' }
                                    ].map(h => (
                                        <th key={h.col} className="px-3 py-2 border-b border-r last:border-r-0 border-[var(--color-border)] text-center">
                                            <p className="text-[10px] font-black text-[var(--color-text)] leading-none mb-1">{h.col}</p>
                                            <p className="text-[8px] font-black text-emerald-500 uppercase tracking-widest leading-none">({h.key})</p>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {[
                                    { n: '1', name: t('behavior.tplStudent1'), g: language === 'en' ? 'M' : 'L', p: '0812...', c: t('behavior.tplClass1') },
                                    { n: '2', name: t('behavior.tplStudent2'), g: language === 'en' ? 'F' : 'P', p: '0857...', c: t('behavior.tplClass2') }
                                ].map((row, idx) => (
                                    <tr key={idx} className="border-b last:border-b-0 border-[var(--color-border)]">
                                        <td className="px-3 py-2 text-[9px] font-black text-[var(--color-text-muted)] text-center bg-[var(--color-surface-alt)]/30 border-r border-[var(--color-border)]">{row.n}</td>
                                        <td className="px-3 py-2 text-[11px] text-[var(--color-text)] font-bold border-r border-[var(--color-border)]">{row.name}</td>
                                        <td className="px-3 py-2 text-[11px] text-[var(--color-text)] font-bold text-center border-r border-[var(--color-border)]">{row.g}</td>
                                        <td className="px-3 py-2 text-[11px] font-mono text-emerald-600 font-bold border-r border-[var(--color-border)]">{row.p}</td>
                                        <td className="px-3 py-2 text-[11px] text-[var(--color-text)] font-bold">{row.c}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* 2. Important Access Guide */}
                <div className="relative overflow-hidden p-4 rounded-2xl bg-emerald-500/[0.04] border border-emerald-500/10 flex gap-4 items-start shadow-sm group">
                    <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:scale-110 transition-transform">
                        <FontAwesomeIcon icon={faCircleCheck} size="3x" className="text-emerald-500" />
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-white dark:bg-gray-800 shadow-sm flex items-center justify-center shrink-0 border border-emerald-500/20">
                        <FontAwesomeIcon icon={faCircleExclamation} className="text-emerald-500 text-sm" />
                    </div>
                    <div className="space-y-1">
                        <p className="text-[11px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">Wajib: Akses Publik</p>
                        <p className="text-[11px] font-bold text-emerald-800/70 dark:text-emerald-300/70 leading-relaxed">
                            Buka menu <b className="text-emerald-900 dark:text-emerald-200">Share</b> di GSheets, lalu ubah General Access menjadi <span className="bg-emerald-500/20 px-1.5 py-0.5 rounded-md text-emerald-700 dark:text-emerald-300">Anyone with the link</span> agar sistem dapat membaca data.
                        </p>
                    </div>
                </div>

                {/* 3. Input URL with Smart Validation Feedback */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between px-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">URL Google Sheets</label>
                        {urlStatus === 'valid' && <span className="text-[9px] font-black text-emerald-500 uppercase flex items-center gap-1 animate-in fade-in slide-in-from-right-2"><FontAwesomeIcon icon={faCircleCheck} /> Link Terdeteksi</span>}
                        {urlStatus === 'invalid' && gSheetsUrl && <span className="text-[9px] font-black text-red-500 uppercase flex items-center gap-1 animate-in fade-in slide-in-from-right-2"><FontAwesomeIcon icon={faTriangleExclamation} /> Bukan Link GSheets</span>}
                        {urlStatus === 'incomplete' && <span className="text-[9px] font-black text-amber-500 uppercase flex items-center gap-1 animate-in fade-in slide-in-from-right-2"><FontAwesomeIcon icon={faSpinner} className="fa-spin" /> Menunggu Link Lengkap</span>}
                    </div>
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <FontAwesomeIcon
                                icon={faLink}
                                className={`transition-colors duration-300 ${urlStatus === 'valid' ? 'text-emerald-500' : 'text-[var(--color-text-muted)] opacity-50'}`}
                            />
                        </div>
                        <input
                            type="url"
                            value={gSheetsUrl}
                            onChange={e => setGSheetsUrl(e.target.value)}
                            placeholder="https://docs.google.com/spreadsheets/d/.../edit"
                            className={`input-field text-sm w-full pl-11 pr-4 py-3.5 rounded-[1.25rem] border-[var(--color-border)] bg-[var(--color-surface)] shadow-none transition-all outline-none ring-offset-[var(--color-surface)] focus:ring-4
                                ${urlStatus === 'valid' ? 'focus:ring-emerald-500/10 border-emerald-500/40' : 'focus:ring-[var(--color-primary)]/10 focus:border-[var(--color-primary)]'}
                            `}
                        />
                    </div>
                    <div className="flex gap-4 pl-1">
                        <p className="text-[9px] text-[var(--color-text-muted)] font-medium leading-relaxed">
                            Pastikan header di baris ke-1 berisi: <span className="font-black text-[var(--color-text)]">name, gender, phone, class_name</span>.
                        </p>
                    </div>
                </div>
            </div>
        </Modal>
    )
}
