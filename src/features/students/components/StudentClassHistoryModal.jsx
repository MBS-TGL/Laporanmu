import React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { 
    faClockRotateLeft, 
    faSpinner, 
    faArrowRightArrowLeft, 
    faArrowRight,
    faCalendarDays,
    faNoteSticky,
    faCircle,
    faCheckCircle,
    faTimeline
} from '@fortawesome/free-solid-svg-icons'
import Modal from '@shared/components/Modal'
import { EmptyState } from '@shared/components/DataDisplay'
import { formatRelativeDate } from '@features/students/utils/studentsConstants'

/**
 * StudentClassHistoryModal Component
 * Displays a vertical timeline of a student's class movement history.
 */
export default function StudentClassHistoryModal({
    isOpen,
    onClose,
    selectedStudent,
    loading,
    history = []
}) {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Riwayat Kelas — ${selectedStudent?.name || ''}`}
            description="Lacak setiap perubahan dan perpindahan kelas siswa secara kronologis."
            icon={faClockRotateLeft}
            iconBg="bg-violet-500/10"
            iconColor="text-violet-600"
            size="md"
            mobileVariant="bottom-sheet"
            footer={
                <div className="flex items-center w-full gap-3">
                    <button
                        onClick={onClose}
                        className="h-10 px-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] text-[10px] font-black uppercase tracking-widest hover:bg-[var(--color-surface-alt)] transition-all flex items-center justify-center shrink-0"
                    >
                        Tutup
                    </button>
                    <div className="flex-1" />
                    <button
                        onClick={onClose}
                        className="h-10 px-8 rounded-xl bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-600/20 hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 border border-white/10 shrink-0"
                    >
                        <FontAwesomeIcon icon={faCheckCircle} className="text-xs opacity-80" />
                        Selesai & Simpan
                    </button>
                </div>
            }
        >
            <div className="space-y-4 py-1">
                {/* Reduced spacing and paddings to eliminate excessive empty space */}
                {loading ? (
                    <div className="text-center py-12 text-[var(--color-text-muted)]">
                        <div className="relative w-12 h-12 mx-auto mb-4">
                            <div className="absolute inset-0 rounded-full border-4 border-indigo-500/10" />
                            <div className="absolute inset-0 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Sinkronisasi Data...</span>
                    </div>
                ) : history.length === 0 ? (
                    <div className="py-2">
                        <EmptyState 
                            variant="dashed"
                            color="slate"
                            icon={faArrowRightArrowLeft}
                            title="Belum ada riwayat"
                            description="Siswa ini belum pernah berpindah kelas sejak pertama kali terdaftar."
                        />
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Section Header Consistent with Tag Modal */}
                        <div className="flex items-center gap-2.5 px-1">
                            <div className="w-1 h-3.5 bg-indigo-500 rounded-full" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text)] flex items-center gap-2">
                                <FontAwesomeIcon icon={faTimeline} className="text-[9px] opacity-40" />
                                Riwayat Kronologis
                            </span>
                            <div className="h-[1px] flex-1 bg-gradient-to-r from-[var(--color-border)] to-transparent opacity-40" />
                        </div>

                        <div className="relative pl-8 space-y-5 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar pb-2">
                            {/* Vertical Timeline Line */}
                            <div className="absolute left-3.5 top-2 bottom-6 w-[2px] bg-gradient-to-b from-indigo-500 via-indigo-200 to-transparent opacity-30" />

                            {history.map((h, idx) => (
                                <div key={h.id || idx} className="relative animate-in slide-in-from-left-4 duration-500" style={{ animationDelay: `${idx * 100}ms` }}>
                                    {/* Timeline Dot */}
                                    <div className="absolute -left-[32.5px] top-1.5 w-6 h-6 rounded-xl bg-white border-2 border-indigo-500 flex items-center justify-center z-10 shadow-sm group">
                                        <FontAwesomeIcon icon={faCircle} className="text-[6px] text-indigo-500 group-hover:scale-150 transition-transform" />
                                    </div>

                                    <div className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/5 transition-all group">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                            <div className="flex items-center gap-3">
                                                <div className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/50 text-slate-400 font-black text-[10px] tracking-tight border border-slate-200/50">
                                                    {h.from_class?.name || 'MABA'}
                                                </div>
                                                <FontAwesomeIcon icon={faArrowRight} className="text-[10px] text-indigo-500 opacity-40" />
                                                <div className="px-4 py-1.5 rounded-lg bg-indigo-500 text-white font-black text-[11px] tracking-tight shadow-lg shadow-indigo-500/10">
                                                    {h.to_class?.name || 'ERROR'}
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-100 shrink-0 self-start sm:self-center">
                                                <FontAwesomeIcon icon={faCalendarDays} className="text-[9px] text-slate-400" />
                                                <span className="text-[10px] font-black text-slate-600">{new Date(h.changed_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                            </div>
                                        </div>

                                        {/* Additional Info Footer */}
                                        <div className="mt-4 pt-3 border-t border-dashed border-[var(--color-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-2 opacity-80">
                                            <div className="flex items-center gap-2">
                                                <FontAwesomeIcon icon={faNoteSticky} className="text-[10px] text-indigo-400" />
                                                <span className="text-[10px] font-bold text-[var(--color-text-muted)] italic line-clamp-1">
                                                    {h.note || 'Pindah otomatis via kenaikan kelas'}
                                                </span>
                                            </div>
                                            <div className="text-[9px] font-black text-indigo-500 uppercase tracking-tighter bg-indigo-50 px-2 py-0.5 rounded">
                                                {formatRelativeDate(h.changed_at)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    )
}
