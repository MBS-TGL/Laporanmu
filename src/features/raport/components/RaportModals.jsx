import { memo, useState } from 'react'
import {
    Keyboard, X, ChevronLeft, ChevronRight,
    Search, Info, Lightbulb, Save,
    Table, Check, Archive, Paintbrush, FileText, ClipboardList, Eye, Loader2, Download
} from 'lucide-react'
import Modal from '@shared/components/Modal'
import RichSelect from '@shared/components/RichSelect'

// Simple SVG replacement for WhatsApp icon
export const WhatsAppIcon = (props) => (
    <svg viewBox="0 0 24 24" fill="currentColor" className={props.className} style={props.style} width={props.width || "1em"} height={props.height || "1em"}>
        <path d="M12.012 1c-6.067 0-11 4.934-11 11a10.957 10.957 0 001.605 5.679L1 23l5.52-1.748A10.949 10.949 0 0012.012 23c6.067 0 11-4.933 11-11s-4.933-11-11-11zm5.12 15.65c-.218.614-1.077 1.15-1.636 1.218-.557.068-1.229.098-3.003-.618-2.28-.92-3.738-3.23-3.852-3.38-.114-.15-.92-1.227-.92-2.355 0-1.127.59-1.682.802-1.912.213-.23.46-.287.613-.287.154 0 .307.003.44.01.14.007.327-.052.51.393.187.456.64 1.56.697 1.674.057.115.095.249.019.402-.077.153-.153.249-.306.42-.154.173-.326.288-.135.614.19.326.85 1.397 1.82 2.261.97.864 1.787 1.132 2.094 1.266.307.135.48.115.652-.076.173-.192.748-.864.947-1.161.2-.298.4-.249.671-.15.27.097 1.722.812 2.018.96.297.147.494.22.567.346.073.125.073.722-.145 1.336z" />
    </svg>
)

// ─── Shortcut Modal Content ──────────────────────────────────────────────────

export const ShortcutModalContent = memo(() => {
    const items = [
        { section: 'Navigasi Sel (Excel-like)' },
        { keys: ['Tab', 'Enter'], label: 'Pindah ke cell berikutnya' },
        { keys: ['↑', '↓'], label: 'Naik / turun baris' },
        { keys: ['←', '→'], label: 'Pindah kolom kriteria' },
        { keys: ['Esc'], label: 'Tutup modal / panel' },
        { section: 'Aksi & Pengeditan' },
        { keys: ['Ctrl', 'S'], label: 'Simpan semua nilai' },
        { keys: ['Ctrl', 'Z'], label: 'Undo nilai' },
        { keys: ['Ctrl', 'Y'], label: 'Redo nilai' },
        { keys: ['/'], label: 'Fokus ke pencarian santri' },
        { keys: ['?'], label: 'Tampilkan shortcut ini' },
    ]

    return (
        <div className="p-3 space-y-0.5">
            {items.map((item, i) => item.section ? (
                <p key={i} className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] pt-3 pb-1 px-1 first:pt-0">{item.section}</p>
            ) : (
                <div key={i} className="flex items-center justify-between px-1.5 py-1.5 rounded-lg hover:bg-[var(--color-surface-alt)] transition-all">
                    <span className="text-[11px] font-semibold text-[var(--color-text)] opacity-80">{item.label}</span>
                    <div className="flex items-center gap-1">
                        {item.keys.map((k, ki) => (
                            <div key={ki} className="flex items-center gap-1">
                                <span className="px-1.5 py-0.5 rounded-md bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[9px] font-black text-[var(--color-text-muted)] font-mono min-w-[20px] text-center shadow-sm">{k}</span>
                                {ki < item.keys.length - 1 && <span className="text-[9px] opacity-30">+</span>}
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    )
})

// ─── WA Blast Confirm Content ────────────────────────────────────────────────

export const WaBlastConfirmContent = memo(({ isOpen, onClose, queue, onConfirm, onCancel, lang, setLang, pageSize, setPageSize, buildWaMessage, onPreviewStudent, handleDownloadPdf, generatingPdfIds }) => {
    const [selectedIds, setSelectedIds] = useState(new Set(queue.map(s => s.id)))
    const [isDebug, setIsDebug] = useState(false)
    const [showPreviewMsg, setShowPreviewMsg] = useState(false)

    const handleConfirm = () => {
        onConfirm(queue.filter(s => selectedIds.has(s.id)), isDebug)
    }

    const toggleAll = () => {
        if (selectedIds.size === queue.length) setSelectedIds(new Set())
        else setSelectedIds(new Set(queue.map(s => s.id)))
    }

    const toggleOne = (id) => {
        const newSet = new Set(selectedIds)
        if (newSet.has(id)) newSet.delete(id)
        else newSet.add(id)
        setSelectedIds(newSet)
    }

    const langOptions = [
        { id: 'id', name: 'Bahasa Indonesia' },
        { id: 'ar', name: 'Bahasa Arab (العربية)' }
    ]

    const pageSizeOptions = [
        { id: 'a4', name: 'A4 (210 × 297 mm)' },
        { id: 'f4', name: 'F4 / Folio (215 × 330 mm)' }
    ]

    const firstSelectedStudent = queue.find(s => selectedIds.has(s.id))

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Konfirmasi WA Blast"
            description="Preview dan pilih wali santri target penerima raport"
            icon={WhatsAppIcon}
            variant={isDebug ? "amber" : "green"}
            size="md"
            footer={
                <div className="flex items-center w-full gap-3">
                    <button onClick={onCancel} className="h-10 px-5 rounded-xl border border-[var(--color-border)] text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] transition-all">
                        Batal
                    </button>
                    <div className="flex-1" />
                    <button onClick={handleConfirm} disabled={selectedIds.size === 0} className={`h-10 px-6 rounded-xl text-white text-[10px] font-black uppercase tracking-widest shadow-lg transition-all flex items-center gap-2 disabled:opacity-50 ${isDebug
                        ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20'
                        : 'bg-green-500 hover:bg-green-600 shadow-green-500/20'
                        }`}>
                        <WhatsAppIcon className="w-4 h-4" />
                        {isDebug ? `Simulasikan Blast (${selectedIds.size})` : `Kirim ke ${selectedIds.size} Santri`}
                    </button>
                </div>
            }
        >
            <div className="space-y-3">
                {/* Header info */}
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/5 border border-amber-500/10 text-[11px] text-amber-800 dark:text-amber-300 font-semibold leading-relaxed">
                    <Info className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                    <p className="flex-1">
                        Sistem mengirim pesan otomatis di latar belakang (Background API). Pastikan token API (Fonnte) valid dan kuota mencukupi agar proses lancar.
                    </p>
                </div>

                {/* Document Settings */}
                <div className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] space-y-2">
                    <div className="flex items-center gap-1.5">
                        <ClipboardList className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                        <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text)]">Pengaturan Dokumen Raport</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="space-y-0.5 text-left">
                            <label className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-wider">Bahasa Raport</label>
                            <RichSelect
                                value={lang}
                                onChange={setLang}
                                options={langOptions}
                                small
                            />
                        </div>
                        <div className="space-y-0.5 text-left">
                            <label className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-wider">Ukuran Kertas</label>
                            <RichSelect
                                value={pageSize}
                                onChange={setPageSize}
                                options={pageSizeOptions}
                                small
                            />
                        </div>
                        <div className="space-y-0.5 text-left flex flex-col justify-end">
                            <label className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-wider block mb-1">Status Pengiriman</label>
                            <button
                                type="button"
                                onClick={() => setIsDebug(d => !d)}
                                className={`h-[34px] w-full flex items-center justify-center gap-1.5 px-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${isDebug
                                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-600'
                                    : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]'
                                    }`}
                            >
                                <span className={`w-2 h-2 rounded-full ${isDebug ? 'bg-amber-500 animate-pulse' : 'bg-slate-300'}`} />
                                {isDebug ? 'Mode Debug' : 'Kirim Asli'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* List */}
                <div className="border border-[var(--color-border)] rounded-2xl bg-[var(--color-surface)] overflow-hidden shadow-sm">
                    {/* Select All header */}
                    <div className="flex items-center justify-between px-4 py-3 bg-[var(--color-surface-alt)] border-b border-[var(--color-border)]">
                        <button onClick={toggleAll} className="flex items-center gap-2 text-[10px] font-black text-[var(--color-text)] hover:text-green-600 transition-colors">
                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${selectedIds.size === queue.length ? 'bg-green-500 border-green-500' : 'border-[var(--color-border)] bg-white'}`}>
                                {selectedIds.size === queue.length && <Check className="w-2.5 h-2.5 text-white" />}
                            </div>
                            Pilih Semua ({queue.length})
                        </button>
                        <span className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-wider">Target Pengiriman</span>
                    </div>
                    {/* Scrollable list */}
                    <div className="p-2 space-y-1 max-h-[160px] overflow-y-auto custom-scrollbar bg-[var(--color-surface)]">
                        {queue.map((s, idx) => {
                            const isSelected = selectedIds.has(s.id)
                            return (
                                <div key={s.id}
                                    className={`w-full flex items-center gap-3 py-1.5 px-2.5 rounded-lg border transition-all ${isSelected ? 'bg-green-500/5 border-green-500/20' : 'border-[var(--color-border)] hover:bg-[var(--color-surface-alt)]'}`}>
                                    {/* Clickable body area to toggle checkbox */}
                                    <button type="button" onClick={() => toggleOne(s.id)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                                        {/* Checkbox */}
                                        <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-all ${isSelected ? 'bg-green-500 border-green-500' : 'border-[var(--color-border)] bg-white'}`}>
                                            {isSelected && <Check className="w-2 h-2 text-white" />}
                                        </div>
                                        {/* Index + Name */}
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                            <span className="text-[9px] font-black text-[var(--color-text-muted)] w-5 shrink-0">{idx + 1}</span>
                                            <div className="min-w-0">
                                                <div className="text-[11px] font-black text-[var(--color-text)] truncate">{s.name}</div>
                                            </div>
                                        </div>
                                        {/* Phone Number */}
                                        <div className="text-[10px] font-black text-[var(--color-text-muted)] px-2">
                                            {s.phone ? (s.phone.length > 8 ? s.phone.substring(0, 4) + '****' + s.phone.slice(-4) : s.phone) : '—'}
                                        </div>
                                    </button>

                                    {/* Action button to preview digital raport */}
                                    {onPreviewStudent && (
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onPreviewStudent(s.id);
                                            }}
                                            className="p-1 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500 dark:text-zinc-400 transition-colors shrink-0 flex items-center justify-center animate-in fade-in duration-200"
                                            title="Preview Raport Digital"
                                        >
                                            <Eye className="w-3.5 h-3.5" />
                                        </button>
                                    )}

                                    {/* Action button to download PDF raport */}
                                    {handleDownloadPdf && (
                                        <button
                                            type="button"
                                            disabled={generatingPdfIds?.has(s.id)}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDownloadPdf(s);
                                            }}
                                            className="p-1 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500 dark:text-zinc-400 transition-colors shrink-0 flex items-center justify-center animate-in fade-in duration-200 disabled:opacity-50"
                                            title="Download PDF Raport"
                                        >
                                            {generatingPdfIds?.has(s.id) ? (
                                                <Loader2 className="w-3.5 h-3.5 animate-spin text-green-600" />
                                            ) : (
                                                <Download className="w-3.5 h-3.5" />
                                            )}
                                        </button>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* WhatsApp Message Preview Toggle & Panel */}
                {selectedIds.size > 0 && buildWaMessage && (
                    <div className="space-y-2">
                        <div className="flex justify-end">
                            <button
                                type="button"
                                onClick={() => setShowPreviewMsg(v => !v)}
                                className="text-[10px] font-black text-green-600 hover:text-green-700 transition-colors uppercase tracking-wider flex items-center gap-1"
                            >
                                <FileText className="w-3.5 h-3.5" />
                                {showPreviewMsg ? 'Sembunyikan Preview Pesan' : 'Lihat Preview Pesan (Simulasi)'}
                            </button>
                        </div>
                        {showPreviewMsg && firstSelectedStudent && (
                            <div className="p-3 rounded-2xl bg-[#e5ddd5] dark:bg-zinc-800 border border-[var(--color-border)] space-y-1.5 max-h-[220px] overflow-y-auto custom-scrollbar shadow-inner text-left">
                                <div className="text-[9px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest flex items-center justify-between">
                                    <span>WhatsApp Bubble Preview</span>
                                    <div className="flex items-center gap-1.5">
                                        {onPreviewStudent && (
                                            <button
                                                type="button"
                                                onClick={() => onPreviewStudent(firstSelectedStudent.id)}
                                                className="bg-green-600 hover:bg-green-700 text-white font-black text-[9px] uppercase tracking-wider px-2.5 py-0.5 rounded transition-all flex items-center gap-1"
                                            >
                                                👁️ Preview Raport
                                            </button>
                                        )}
                                        {handleDownloadPdf && (
                                            <button
                                                type="button"
                                                disabled={generatingPdfIds?.has(firstSelectedStudent.id)}
                                                onClick={() => handleDownloadPdf(firstSelectedStudent)}
                                                className="bg-zinc-600 hover:bg-zinc-700 disabled:bg-zinc-400 text-white font-black text-[9px] uppercase tracking-wider px-2 py-0.5 rounded transition-all flex items-center gap-1.5"
                                            >
                                                {generatingPdfIds?.has(firstSelectedStudent.id) ? (
                                                    <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                                ) : (
                                                    <Download className="w-2.5 h-2.5" />
                                                )}
                                                Download PDF
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div
                                    className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 p-3 rounded-lg rounded-tl-none relative shadow-sm border border-zinc-200/50 dark:border-zinc-700 font-mono text-[10.5px] leading-relaxed whitespace-pre-wrap select-text"
                                    style={{ fontFamily: "Segoe UI, -apple-system, sans-serif" }}
                                >
                                    <div className="absolute top-0 -left-2 w-0 h-0 border-[8px] border-transparent border-t-white dark:border-t-zinc-900 border-r-white dark:border-r-zinc-900" />
                                    {buildWaMessage(firstSelectedStudent, `https://laporanmu.github.io/raport_${firstSelectedStudent.name.toLowerCase().replace(/\s+/g, '_')}.pdf`)}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </Modal>
    )
})

// ─── Circular SVG Ring Progress ──────────────────────────────────────────────
// ─── Circular SVG Ring — Larger, with subtle glow shadow ─────────────────────
const CircleRing = ({ pct, color, trackColor, size = 112, stroke = 9 }) => {
    const r = (size / 2) - stroke - 2
    const circ = 2 * Math.PI * r
    const offset = circ - (pct / 100) * circ
    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={trackColor} strokeWidth={stroke} />
            <circle
                cx={size / 2} cy={size / 2} r={r} fill="none"
                stroke={color} strokeWidth={stroke}
                strokeLinecap="round"
                strokeDasharray={circ}
                strokeDashoffset={offset}
                style={{ transition: 'stroke-dashoffset 0.7s cubic-bezier(0.34,1.56,0.64,1), stroke 0.4s ease' }}
            />
        </svg>
    )
}

// ─── Initials Avatar ──────────────────────────────────────────────────────────
const InitialAvatar = ({ name, color = 'bg-slate-500' }) => {
    const initials = name ? name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() : '?'
    return (
        <div className={`w-9 h-9 rounded-xl ${color} flex items-center justify-center text-white text-xs font-black shrink-0`}>
            {initials}
        </div>
    )
}

// ─── Step Pipeline ────────────────────────────────────────────────────────────
const STEPS_WA = [
    { key: 'generating', label: 'PDF' },
    { key: 'uploading', label: 'Upload' },
    { key: 'sending', label: 'Kirim' },
]
const STEPS_ZIP = [
    { key: 'generating', label: 'Generate PDF' },
    { key: 'zipping', label: 'Compress ZIP' },
]

const StepPipeline = ({ steps, currentStatus, accentColor = '#22c55e' }) => {
    const currentIdx = steps.findIndex(s => s.key === currentStatus)
    return (
        <div className="flex items-center gap-1">
            {steps.map((s, i) => {
                const isDone = i < currentIdx
                const isActive = i === currentIdx
                return (
                    <div key={s.key} className="flex items-center gap-1">
                        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[8.5px] font-black uppercase tracking-wider transition-all duration-300 ${isDone ? 'bg-emerald-500/15 text-emerald-600' :
                                isActive ? 'text-white' :
                                    'bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] opacity-50'
                            }`} style={isActive ? { backgroundColor: accentColor } : {}}>
                            {isDone && <span className="mr-0.5">✓</span>}
                            {isActive && <span className="w-1.5 h-1.5 rounded-full bg-white/70 animate-pulse mr-0.5 inline-block" />}
                            {s.label}
                        </div>
                        {i < steps.length - 1 && (
                            <div className={`w-3 h-px ${isDone ? 'bg-emerald-400' : 'bg-[var(--color-border)]'}`} />
                        )}
                    </div>
                )
            })}
        </div>
    )
}

// ─── WA Blast Progress ────────────────────────────────────────────────────────
export const WaBlastProgressContent = memo(({ progress, total, done, failed, activeName, active, onCancel, status }) => {
    const pct = total > 0 ? Math.min(100, Math.round((progress / total) * 100)) : 0
    const isFinished = status === 'done' || (!active && total > 0 && progress >= total)
    const isAborted = status === 'aborted'
    const remaining = Math.max(0, total - progress)
    const isSimulating = status === 'simulating'

    // Color tokens
    const accent = isAborted ? '#ef4444' : isFinished ? '#10b981' : isSimulating ? '#f59e0b' : '#22c55e'
    const track = isAborted ? '#fecaca' : isFinished ? '#a7f3d0' : isSimulating ? '#fde68a' : '#bbf7d0'

    return (
        <div className="space-y-4">
            <style>{`
                @keyframes blast-scan { 0%{opacity:0;transform:translateX(-100%)} 20%{opacity:1} 80%{opacity:1} 100%{opacity:0;transform:translateX(100%)} }
                .blast-scan { animation: blast-scan 2.2s ease-in-out infinite; }
                @keyframes ring-glow { 0%,100%{opacity:0.3} 50%{opacity:0.7} }
                .ring-glow { animation: ring-glow 2s ease-in-out infinite; }
            `}</style>

            {/* ── Top Hero: Ring centered, flanked by stats ── */}
            <div className={`relative rounded-[1.75rem] overflow-hidden border p-5 transition-colors duration-700 ${isAborted ? 'bg-rose-50/80 border-rose-200 dark:bg-rose-950/30 dark:border-rose-800/50' :
                    isFinished ? 'bg-emerald-50/80 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800/50' :
                        isSimulating ? 'bg-amber-50/80 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800/50' :
                            'bg-green-50/80 border-green-200 dark:bg-green-950/30 dark:border-green-800/50'
                }`}>
                {/* Scan line */}
                {active && !isFinished && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent blast-scan pointer-events-none" />
                )}

                <div className="flex items-center gap-4">
                    {/* Ring */}
                    <div className="relative shrink-0">
                        {/* Glow */}
                        {active && !isFinished && (
                            <div className="absolute inset-0 rounded-full ring-glow blur-md" style={{ backgroundColor: accent, opacity: 0.2 }} />
                        )}
                        <CircleRing pct={pct} color={accent} trackColor={track} size={100} stroke={8} />
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            {isFinished && !isAborted ? (
                                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                            ) : isAborted ? (
                                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.5" strokeLinecap="round">
                                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            ) : (
                                <>
                                    <span className="text-lg font-black tabular-nums leading-none" style={{ color: accent }}>{pct}</span>
                                    <span className="text-[9px] font-black opacity-60" style={{ color: accent }}>%</span>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Text block */}
                    <div className="flex-1 min-w-0">
                        <p className="text-[17px] font-black tracking-tight leading-snug" style={{ color: isAborted ? '#dc2626' : isFinished ? '#059669' : 'var(--color-text)' }}>
                            {isAborted ? 'Blast Dibatalkan' :
                                isFinished ? 'Blast Selesai!' :
                                    isSimulating ? 'Mensimulasikan...' :
                                        'Mengirim Raport...'}
                        </p>
                        <p className="text-[11px] text-[var(--color-text-muted)] font-semibold mt-0.5 tabular-nums">
                            <span className="font-black" style={{ color: accent }}>{progress}</span> / {total} santri
                        </p>
                        {active && !isFinished && (
                            <div className="mt-2">
                                <StepPipeline steps={STEPS_WA} currentStatus={status} accentColor={accent} />
                            </div>
                        )}
                    </div>
                </div>

                {/* Bottom progress rail */}
                <div className="mt-4 relative h-2 rounded-full overflow-hidden bg-black/8 dark:bg-white/8">
                    <div
                        className="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out"
                        style={{ width: `${pct}%`, backgroundColor: accent }}
                    />
                </div>
            </div>

            {/* ── Stat Cards ── */}
            <div className="grid grid-cols-3 gap-2">
                {[
                    { label: 'Terkirim', val: done || 0, color: '#059669', bg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-200 dark:border-emerald-800/50', icon: '✓' },
                    { label: 'Gagal', val: failed || 0, color: '#dc2626', bg: 'bg-rose-50 dark:bg-rose-950/30', border: 'border-rose-200 dark:border-rose-800/50', icon: '✕' },
                    { label: 'Tersisa', val: remaining, color: '#64748b', bg: 'bg-slate-50 dark:bg-slate-900/30', border: 'border-slate-200 dark:border-slate-700/50', icon: '…' },
                ].map(({ label, val, color, bg, border, icon }) => (
                    <div key={label} className={`${bg} border ${border} rounded-2xl py-3 px-2 flex flex-col items-center gap-0.5 transition-all`}>
                        <span className="text-[8px] font-black uppercase tracking-widest opacity-60" style={{ color }}>{label}</span>
                        <span className="text-[22px] font-black tabular-nums leading-none" style={{ color }}>{val}</span>
                    </div>
                ))}
            </div>

            {/* ── Active Student ── */}
            {active && activeName && (
                <div className="flex items-center gap-3 px-3.5 py-3 rounded-2xl bg-[var(--color-surface-alt)] border border-[var(--color-border)]">
                    <InitialAvatar name={activeName} color="bg-green-600" />
                    <div className="flex-1 min-w-0">
                        <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] leading-none">Dikirim ke</p>
                        <p className="text-[13px] font-black text-[var(--color-text)] truncate mt-1 leading-none">{activeName}</p>
                    </div>
                    {/* Triple dot pulse */}
                    <div className="flex items-center gap-1 shrink-0">
                        {[0, 1, 2].map(i => (
                            <div key={i} className="w-1.5 h-1.5 rounded-full bg-green-500" style={{ animation: `bounce 1.2s ${i * 0.2}s ease-in-out infinite` }} />
                        ))}
                    </div>
                </div>
            )}

            {/* ── Cancel ── */}
            {active && onCancel && (
                <button
                    onClick={onCancel}
                    className="w-full h-10 rounded-2xl text-rose-500 text-[10px] font-black uppercase tracking-widest transition-all active:scale-[0.98] hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50 flex items-center justify-center gap-1.5"
                >
                    <X className="w-3.5 h-3.5" />
                    Batalkan Antrean
                </button>
            )}
        </div>
    )
})

// ─── ZIP Blast Progress ───────────────────────────────────────────────────────
export const ZipBlastProgressContent = memo(({ progress, total, done, failed, activeName, active, onCancel, status }) => {
    const pct = total > 0 ? Math.min(100, Math.round((progress / total) * 100)) : 0
    const isFinished = status === 'done' || (!active && total > 0 && progress >= total)
    const isAborted = status === 'aborted'
    const remaining = Math.max(0, total - progress)

    const accent = isAborted ? '#ef4444' : isFinished ? '#10b981' : '#0d9488'
    const track = isAborted ? '#fecaca' : isFinished ? '#a7f3d0' : '#99f6e4'

    return (
        <div className="space-y-4">
            <style>{`
                @keyframes zip-scan { 0%{opacity:0;transform:translateX(-100%)} 20%{opacity:1} 80%{opacity:1} 100%{opacity:0;transform:translateX(100%)} }
                .zip-scan { animation: zip-scan 2.4s ease-in-out infinite; }
            `}</style>

            {/* Hero */}
            <div className={`relative rounded-[1.75rem] overflow-hidden border p-5 transition-colors duration-700 ${isAborted ? 'bg-rose-50/80 border-rose-200 dark:bg-rose-950/30 dark:border-rose-800/50' :
                    isFinished ? 'bg-emerald-50/80 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800/50' :
                        'bg-teal-50/80 border-teal-200 dark:bg-teal-950/30 dark:border-teal-800/50'
                }`}>
                {active && !isFinished && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent zip-scan pointer-events-none" />
                )}

                <div className="flex items-center gap-4">
                    <div className="relative shrink-0">
                        <CircleRing pct={pct} color={accent} trackColor={track} size={100} stroke={8} />
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            {isFinished && !isAborted ? (
                                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                            ) : isAborted ? (
                                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.5" strokeLinecap="round">
                                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            ) : (
                                <>
                                    <span className="text-lg font-black tabular-nums leading-none" style={{ color: accent }}>{pct}</span>
                                    <span className="text-[9px] font-black opacity-60" style={{ color: accent }}>%</span>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="flex-1 min-w-0">
                        <p className="text-[17px] font-black tracking-tight leading-snug" style={{ color: isAborted ? '#dc2626' : isFinished ? '#059669' : 'var(--color-text)' }}>
                            {isAborted ? 'Ekspor Dibatalkan' :
                                isFinished ? 'Ekspor Selesai!' :
                                    'Mengemas ZIP...'}
                        </p>
                        <p className="text-[11px] text-[var(--color-text-muted)] font-semibold mt-0.5 tabular-nums">
                            <span className="font-black" style={{ color: accent }}>{progress}</span> / {total} raport
                        </p>
                        {active && !isFinished && (
                            <div className="mt-2">
                                <StepPipeline steps={STEPS_ZIP} currentStatus={status} accentColor={accent} />
                            </div>
                        )}
                    </div>
                </div>

                <div className="mt-4 relative h-2 rounded-full overflow-hidden bg-black/8 dark:bg-white/8">
                    <div
                        className="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out"
                        style={{ width: `${pct}%`, backgroundColor: accent }}
                    />
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2">
                {[
                    { label: 'Sukses', val: done || 0, color: '#059669', bg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-200 dark:border-emerald-800/50' },
                    { label: 'Gagal', val: failed || 0, color: '#dc2626', bg: 'bg-rose-50 dark:bg-rose-950/30', border: 'border-rose-200 dark:border-rose-800/50' },
                    { label: 'Tersisa', val: remaining, color: '#64748b', bg: 'bg-slate-50 dark:bg-slate-900/30', border: 'border-slate-200 dark:border-slate-700/50' },
                ].map(({ label, val, color, bg, border }) => (
                    <div key={label} className={`${bg} border ${border} rounded-2xl py-3 px-2 flex flex-col items-center gap-0.5`}>
                        <span className="text-[8px] font-black uppercase tracking-widest opacity-60" style={{ color }}>{label}</span>
                        <span className="text-[22px] font-black tabular-nums leading-none" style={{ color }}>{val}</span>
                    </div>
                ))}
            </div>

            {/* Active */}
            {active && activeName && (
                <div className="flex items-center gap-3 px-3.5 py-3 rounded-2xl bg-[var(--color-surface-alt)] border border-[var(--color-border)]">
                    <InitialAvatar name={activeName} color="bg-teal-600" />
                    <div className="flex-1 min-w-0">
                        <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] leading-none">Sedang dikemas</p>
                        <p className="text-[13px] font-black text-[var(--color-text)] truncate mt-1 leading-none">{activeName}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                        {[0, 1, 2].map(i => (
                            <div key={i} className="w-1.5 h-1.5 rounded-full bg-teal-500" style={{ animation: `bounce 1.2s ${i * 0.2}s ease-in-out infinite` }} />
                        ))}
                    </div>
                </div>
            )}

            {/* Cancel */}
            {active && onCancel && (
                <button
                    onClick={onCancel}
                    className="w-full h-10 rounded-2xl text-rose-500 text-[10px] font-black uppercase tracking-widest transition-all active:scale-[0.98] hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50 flex items-center justify-center gap-1.5"
                >
                    <X className="w-3.5 h-3.5" />
                    Batal Ekspor
                </button>
            )}
        </div>
    )
})

