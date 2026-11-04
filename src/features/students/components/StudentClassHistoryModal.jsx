import React from 'react'
import { ArrowLeftRight, ArrowRight, CalendarDays, Circle, CircleCheck, History, StickyNote } from 'lucide-react'
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
            icon={History}
            iconBg="bg-violet-500/10"
            iconColor="text-violet-600"
            size="md"
            mobileVariant="bottom-sheet"
            footer={
                <div className="flex items-center w-full gap-3">
                    <button
                        onClick={onClose}
                        className="h-10 px-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] text-xs font-bold uppercase tracking-wide hover:bg-[var(--color-surface-alt)] transition-all flex items-center justify-center shrink-0"
                    >
                        Tutup
                    </button>
                    <div className="flex-1" />
                    <button
                        onClick={onClose}
                        className="h-10 px-8 rounded-xl bg-indigo-600 text-white text-xs font-bold uppercase tracking-wide shadow-lg hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 border border-white/10 shrink-0"
                    >
                        <CircleCheck className="w-4 h-4 opacity-80" />
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
                        <span className="text-xs font-bold uppercase tracking-wide opacity-40">Sinkronisasi Data...</span>
                    </div>
                ) : history.length === 0 ? (
                    <div className="py-2">
                        <EmptyState 
                            variant="dashed"
                            color="slate"
                            icon={ArrowLeftRight}
                            title="Belum ada riwayat"
                            description="Siswa ini belum pernah berpindah kelas sejak pertama kali terdaftar."
                        />
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Section Header Consistent with Tag Modal */}
                        <div className="flex items-center gap-2.5 px-1">
                            <div className="w-1 h-3.5 bg-indigo-500 rounded-full" />
                            <span className="text-xs font-bold uppercase tracking-wide text-[var(--color-text)] flex items-center gap-2">
                                <History className="w-4 h-4 opacity-40" />
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
                                        <Circle className="w-4 h-4 text-indigo-500 group-hover:scale-150 transition-transform" />
                                    </div>

                                        <div className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-indigo-500/30 hover:shadow-xl transition-all group">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                            <div className="flex items-center gap-3">
                                                <div className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/50 text-slate-400 font-bold text-xs tracking-tight border border-slate-200/50">
                                                    {h.from_class?.name || 'MABA'}
                                                </div>
                                                <ArrowRight className="w-4 h-4 text-indigo-500 opacity-40" />
                                                <div className="px-4 py-1.5 rounded-lg bg-indigo-500 text-white font-bold text-xs tracking-tight shadow-lg">
                                                    {h.to_class?.name || 'ERROR'}
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-100 shrink-0 self-start sm:self-center">
                                                <CalendarDays className="w-4 h-4 text-slate-400" />
                                                <span className="text-xs font-bold text-slate-600">{new Date(h.changed_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                            </div>
                                        </div>

                                        {/* Additional Info Footer */}
                                        <div className="mt-4 pt-3 border-t border-dashed border-[var(--color-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-2 opacity-80">
                                            <div className="flex items-center gap-2">
                                                <StickyNote className="w-4 h-4 text-indigo-400" />
                                                <span className="text-xs font-bold text-[var(--color-text-muted)] italic line-clamp-1">
                                                    {h.note || 'Pindah otomatis via kenaikan kelas'}
                                                </span>
                                            </div>
                                            <div className="text-xs font-bold text-indigo-500 uppercase tracking-tighter bg-indigo-50 px-2 py-0.5 rounded">
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
