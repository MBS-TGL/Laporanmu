import React, { memo, useCallback } from 'react'
import { ClipboardList, MessageSquare, Edit2, Trash2 } from 'lucide-react'
import Modal from '@shared/components/Modal'
import { useLanguage } from '@context'

const BehaviorDetailModal = memo(function BehaviorDetailModal({
    isOpen,
    onClose,
    detailItem,
    students = [],
    violationTypes = [],
    isPrivacyMode = false,
    canInput = false,
    onEdit,
    onDelete,
}) {
    const { language, t } = useLanguage()
    const tp = useCallback((key) => t(`behavior.${key}`), [t])

    const tDb = useCallback((text) => {
        if (!text) return text
        const key = `db.${text}`
        const val = t(key)
        return val === key ? text : val
    }, [t])

    const getTypeName = (id) => {
        const name = violationTypes.find(vt => vt.id === id)?.name ?? '—'
        return tDb(name)
    }

    const fmtLocale = language === 'ar' ? 'ar-SA' : language === 'en' ? 'en-US' : 'id-ID'
    const fmtTime = (d) => d ? new Date(d).toLocaleTimeString(fmtLocale, { hour: '2-digit', minute: '2-digit' }) : ''
    const fmtDate = (d) => d ? new Date(d).toLocaleDateString(fmtLocale, { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

    const mask = (str, visibleLen = 3) => {
        if (!isPrivacyMode || !str) return str
        if (str.length <= visibleLen) return str[0] + '*'.repeat(Math.max(0, str.length - 1))
        return str.substring(0, visibleLen) + '***'
    }

    if (!isOpen) return null

    const isPos = (detailItem?.points ?? 0) > 0

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={tp('detailReport')}
            description={tp('detailReportDesc')}
            icon={ClipboardList}
            iconBg="bg-[var(--color-primary)]/10"
            iconColor="text-[var(--color-primary)]"
            size="md"
            mobileVariant="bottom-sheet"
            footer={
                <div className="flex items-center w-full gap-2">
                    {/* Edit & Delete — only visible when canInput */}
                    {canInput && (
                        <>
                            <button
                                type="button"
                                onClick={() => { onDelete?.(detailItem); onClose() }}
                                className="h-10 px-4 rounded-xl border border-red-500/20 bg-red-500/5 text-red-500 hover:bg-red-500 hover:text-white text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 shrink-0"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                                {tp('detailDelete')}
                            </button>
                            <button
                                type="button"
                                onClick={() => { onEdit?.(detailItem); onClose() }}
                                className="h-10 px-4 rounded-xl border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/5 text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 shrink-0"
                            >
                                <Edit2 className="w-3.5 h-3.5" />
                                {tp('detailEdit')}
                            </button>
                        </>
                    )}
                    <div className="flex-1" />
                    <button
                        type="button"
                        onClick={onClose}
                        className="h-10 px-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] text-[10px] font-black uppercase tracking-widest transition-all shrink-0"
                    >
                        {tp('close')}
                    </button>
                </div>
            }
        >
            {detailItem && (() => {
                const stud = students.find(s => s.id === detailItem.student_id)
                return (
                    <div className="space-y-4 px-1 py-2">
                        {/* Student Info Card */}
                        <div className="flex items-center gap-3 p-3.5 rounded-xl bg-[var(--color-surface-alt)]/40 border border-[var(--color-border)]/50">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm ${isPos ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`}>
                                {(stud?.name || '?')[0].toUpperCase()}
                            </div>
                            <div>
                                <h4 className="text-sm font-black text-[var(--color-text)]">{mask(stud?.name || '—')}</h4>
                                <p className="text-[10px] text-[var(--color-text-muted)] font-bold uppercase tracking-wider opacity-60 mt-0.5">{stud?.class_name || tp('noClass')}</p>
                            </div>
                        </div>

                        {/* Details Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {/* Jenis Laporan */}
                            <div className="p-3 rounded-xl border border-[var(--color-border)]/40 bg-[var(--color-surface)]">
                                <span className="text-[9px] font-black uppercase tracking-wider text-[var(--color-text-muted)] opacity-60">{tp('fieldReportType')}</span>
                                <p className="text-xs font-bold text-[var(--color-text)] mt-1">{getTypeName(detailItem.violation_type_id)}</p>
                            </div>

                            {/* Poin — more prominent */}
                            <div className="p-3 rounded-xl border border-[var(--color-border)]/40 bg-[var(--color-surface)]">
                                <span className="text-[9px] font-black uppercase tracking-wider text-[var(--color-text-muted)] opacity-60">{tp('fieldPoints')}</span>
                                <div className="flex items-center gap-2.5 mt-1.5">
                                    <span className={`inline-flex items-center justify-center min-w-[52px] px-3 py-1 rounded-xl text-base font-black border shadow-sm
                                        ${isPos
                                            ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30 shadow-emerald-500/10'
                                            : 'bg-red-500/15 text-red-600 border-red-500/30 shadow-red-500/10'
                                        }`}
                                    >
                                        {detailItem.points > 0 ? '+' : ''}{detailItem.points}
                                    </span>
                                    <span className={`text-[11px] font-bold ${isPos ? 'text-emerald-600' : 'text-red-500'}`}>
                                        {isPos ? tp('achievementPoints') : tp('violationPoints')}
                                    </span>
                                </div>
                            </div>

                            {/* Waktu Kejadian */}
                            <div className="p-3 rounded-xl border border-[var(--color-border)]/40 bg-[var(--color-surface)]">
                                <span className="text-[9px] font-black uppercase tracking-wider text-[var(--color-text-muted)] opacity-60">{tp('fieldRecordedAt')}</span>
                                <p className="text-xs font-bold text-[var(--color-text)] mt-1">{fmtDate(detailItem.reported_at)} {tp('atTime')} {fmtTime(detailItem.reported_at)}</p>
                            </div>

                            {/* Dicatat Oleh */}
                            <div className="p-3 rounded-xl border border-[var(--color-border)]/40 bg-[var(--color-surface)]">
                                <span className="text-[9px] font-black uppercase tracking-wider text-[var(--color-text-muted)] opacity-60">{tp('fieldRecordedBy')}</span>
                                <p className="text-xs font-bold text-[var(--color-text)] mt-1">{mask(detailItem.teacher_name || 'System')}</p>
                            </div>
                        </div>

                        {/* Catatan / Keterangan */}
                        <div className="p-3.5 rounded-xl border border-[var(--color-border)]/40 bg-[var(--color-surface)]">
                            <span className="text-[9px] font-black uppercase tracking-wider text-[var(--color-text-muted)] opacity-60">{tp('fieldNotes')}</span>
                            {detailItem.notes ? (
                                <p className="text-xs font-bold text-[var(--color-text)] mt-1.5 leading-relaxed bg-[var(--color-surface-alt)]/20 p-2.5 rounded-lg border border-[var(--color-border)]/30 italic">
                                    "{mask(detailItem.notes)}"
                                </p>
                            ) : (
                                // Empty state lebih halus dengan icon
                                <div className="mt-2 flex items-center gap-2.5 py-3 px-3 rounded-lg bg-[var(--color-surface-alt)]/30 border border-dashed border-[var(--color-border)]/40">
                                    <MessageSquare className="w-4 h-4 text-[var(--color-text-muted)] opacity-30 shrink-0" />
                                    <p className="text-[11px] text-[var(--color-text-muted)] opacity-50 font-semibold italic">
                                        {tp('noNotes')}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                )
            })()}
        </Modal>
    )
})

export default BehaviorDetailModal
