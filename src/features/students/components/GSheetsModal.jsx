import React, { useMemo } from 'react'
import { CircleAlert, CircleCheck, Download, Link, LoaderCircle, Table, TriangleAlert } from 'lucide-react'
import Modal from '@shared/components/Modal'
import { useLanguage } from '@context'

export default function GSheetsModal({
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
            icon={Link}
            iconBg="bg-success/10"
            iconColor="text-success"
            size="md"
            mobileVariant="bottom-sheet"
            footer={
                <div className="flex items-center w-full gap-3">
                    <button
                        onClick={onDownloadTemplate}
                        title="Download Format Excel/CSV"
                        className="h-9 px-3 rounded-lg border border-success/20 bg-success/5 text-success text-xs font-bold uppercase tracking-wide leading-none whitespace-nowrap hover:bg-success hover:text-white transition-colors flex items-center justify-center gap-1.5 shrink-0 group"
                    >
                        <Download className="w-4 h-4 opacity-80 group-hover:animate-bounce" />
                        <span>Template</span>
                    </button>

                    <button
                        onClick={onClose}
                        className="h-9 px-5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] text-xs font-bold uppercase tracking-wide leading-none whitespace-nowrap transition-colors shrink-0"
                    >
                        Batal
                    </button>

                    <div className="flex-1" />

                    <button
                        onClick={handleFetchGSheets}
                        disabled={fetchingGSheets || urlStatus !== 'valid'}
                        className="h-9 px-5 rounded-lg bg-success hover:bg-success-dark text-white text-xs font-bold uppercase tracking-wide leading-none whitespace-nowrap shadow-sm transition-colors flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {fetchingGSheets ? (
                            <><LoaderCircle className="w-4 h-4 animate-spin" /> <span>Sinkron...</span></>
                        ) : (
                            <><Link className="w-4 h-4 opacity-80" /> <span>Hubungkan</span></>
                        )}
                    </button>
                </div>
            }
        >
            <div className="space-y-6">
                {/* 1. Guideline & Format Table */}
                <div className="group rounded-[1.5rem] border border-[var(--color-border)] overflow-hidden bg-[var(--color-surface)] shadow-sm hover:border-success/30 transition-all">
                    <div className="bg-success/[0.03] px-4 py-3 flex items-center justify-between border-b border-[var(--color-border)]">
                        <span className="text-xs font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                            <Table className="w-4 h-4 opacity-50" />
                            Struktur Kolom Wajib
                        </span>
                        <div className="flex gap-1">
                            {[1, 2, 3].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-success/20" />)}
                        </div>
                    </div>
                    <div className="overflow-x-auto custom-scrollbar p-1">
                        <table className="w-full text-left border-collapse min-w-[400px]">
                            <thead>
                                <tr>
                                    <th className="px-3 py-2 text-xs font-bold text-center text-[var(--color-text-muted)] border-b border-r border-[var(--color-border)] bg-[var(--color-surface-alt)]/30 w-10"></th>
                                    {[
                                        { col: 'A', key: 'name' },
                                        { col: 'B', key: 'gender' },
                                        { col: 'C', key: 'phone' },
                                        { col: 'D', key: 'class_name' }
                                    ].map(h => (
                                        <th key={h.col} className="px-3 py-2 border-b border-r last:border-r-0 border-[var(--color-border)] text-center">
                                            <p className="text-xs font-bold text-[var(--color-text)] leading-none mb-1">{h.col}</p>
                                            <p className="text-xs font-bold text-success uppercase tracking-wide leading-none">({h.key})</p>
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
                                        <td className="px-3 py-2 text-xs font-bold text-[var(--color-text-muted)] text-center bg-[var(--color-surface-alt)]/30 border-r border-[var(--color-border)]">{row.n}</td>
                                        <td className="px-3 py-2 text-xs text-[var(--color-text)] font-bold border-r border-[var(--color-border)]">{row.name}</td>
                                        <td className="px-3 py-2 text-xs text-[var(--color-text)] font-bold text-center border-r border-[var(--color-border)]">{row.g}</td>
                                        <td className="px-3 py-2 text-xs font-mono text-success font-bold border-r border-[var(--color-border)]">{row.p}</td>
                                        <td className="px-3 py-2 text-xs text-[var(--color-text)] font-bold">{row.c}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* 2. Important Access Guide */}
                <div className="relative overflow-hidden p-4 rounded-2xl bg-success/[0.04] border border-success/10 flex gap-4 items-start shadow-sm group">
                    <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:scale-110 transition-transform">
                        <CircleCheck size={48} className="text-success" />
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-white dark:bg-gray-800 shadow-sm flex items-center justify-center shrink-0 border border-success/20">
                        <CircleAlert className="w-4 h-4 text-success" />
                    </div>
                    <div className="space-y-1">
                        <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">Wajib: Akses Publik</p>
                        <p className="text-xs font-bold text-success-dark/70 dark:text-emerald-300/70 leading-relaxed">
                            Buka menu <b className="text-emerald-900 dark:text-emerald-200">Share</b> di GSheets, lalu ubah General Access menjadi <span className="bg-success/20 px-1.5 py-0.5 rounded-md text-emerald-700 dark:text-emerald-300">Anyone with the link</span> agar sistem dapat membaca data.
                        </p>
                    </div>
                </div>

                {/* 3. Input URL with Smart Validation Feedback */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between px-1">
                        <label className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)]">URL Google Sheets</label>
                        {urlStatus === 'valid' && <span className="text-xs font-bold text-success uppercase flex items-center gap-1 animate-in fade-in slide-in-from-right-2"><CircleCheck className="w-4 h-4" /> Link Terdeteksi</span>}
                        {urlStatus === 'invalid' && gSheetsUrl && <span className="text-xs font-bold text-danger uppercase flex items-center gap-1 animate-in fade-in slide-in-from-right-2"><TriangleAlert className="w-4 h-4" /> Bukan Link GSheets</span>}
                        {urlStatus === 'incomplete' && <span className="text-xs font-bold text-warning uppercase flex items-center gap-1 animate-in fade-in slide-in-from-right-2"><LoaderCircle className="w-4 h-4 animate-spin" /> Menunggu Link Lengkap</span>}
                    </div>
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Link className={`w-4 h-4 transition-colors duration-300 ${urlStatus === 'valid' ? 'text-success' : 'text-[var(--color-text-muted)] opacity-50'}`} />
                        </div>
                        <input
                            type="url"
                            value={gSheetsUrl}
                            onChange={e => setGSheetsUrl(e.target.value)}
                            placeholder="https://docs.google.com/spreadsheets/d/.../edit"
                            className={`input-field text-sm w-full pl-11 pr-4 py-3.5 rounded-[1.25rem] border-[var(--color-border)] bg-[var(--color-surface)] shadow-none transition-all outline-none ring-offset-[var(--color-surface)] focus:ring-4
                                ${urlStatus === 'valid' ? 'focus:ring-success/10 border-success/40' : 'focus:ring-[var(--color-primary)]/10 focus:border-[var(--color-primary)]'}
                            `}
                        />
                    </div>
                    <div className="flex gap-4 pl-1">
                        <p className="text-xs text-[var(--color-text-muted)] font-medium leading-relaxed">
                            Pastikan header di baris ke-1 berisi: <span className="font-bold text-[var(--color-text)]">name, gender, phone, class_name</span>.
                        </p>
                    </div>
                </div>
            </div>
        </Modal>
    )
}
