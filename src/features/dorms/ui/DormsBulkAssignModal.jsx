import React, { useEffect } from 'react'
import Modal from '@shared/components/Modal'
import { useLanguage } from '@context/Language'
import { Bed, Check, X } from 'lucide-react'

export default function DormsBulkAssignModal({
    isOpen,
    onClose,
    selectedCount,
    selectedStudents = [],
    onRemoveStudent,
    dorms,
    selectedRoom,
    setSelectedRoom,
    onSave,
    submitting
}) {
    const { t, tNum } = useLanguage()

    // Auto-close modal when there are no students selected
    useEffect(() => {
        if (isOpen && selectedCount === 0) {
            onClose()
        }
    }, [isOpen, selectedCount, onClose])

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={t('dorms.bulkAssign.title')}
            description={t('dorms.bulkAssign.desc').replace('{count}', tNum(selectedCount || 0))}
            icon={Bed}
            size="md"
            mobileVariant="bottom-sheet"
            footer={
                <div className="flex items-center w-full gap-3">
                    <button
                        onClick={onClose}
                        className="h-9.5 px-4 sm:px-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] text-xs font-bold uppercase tracking-wider transition-all shrink-0"
                    >
                        {t('dorms.bulkAssign.cancel')}
                    </button>
                    <div className="flex-1" />
                    <button
                        onClick={onSave}
                        disabled={submitting || !selectedRoom}
                        className="h-9.5 px-5 sm:px-6 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 text-white text-xs font-bold uppercase tracking-wider shadow-md shadow-[var(--color-primary)]/20 transition-all flex items-center justify-center gap-2 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {submitting ? (
                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <Check className="w-3.5 h-3.5" />
                        )}
                        {t('dorms.bulkAssign.save')}
                    </button>
                </div>
            }
        >
            <div className="space-y-4">
                {selectedStudents.length > 0 && (
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] block mb-1">
                            {t('dorms.bulkAssign.selectedStudentsTitle')} ({tNum(selectedStudents.length)})
                        </label>
                        <div className="grid grid-cols-2 gap-1.5 max-h-[140px] overflow-y-auto p-2 bg-[var(--color-surface-alt)]/30 border border-[var(--color-border)]/50 rounded-2xl custom-scrollbar">
                            {selectedStudents.map(student => (
                                <div
                                    key={student.id}
                                    className="flex items-center justify-between pl-3 pr-1.5 py-1 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]/60 text-xs font-medium text-[var(--color-text)] min-w-0"
                                >
                                    <div className="flex items-center gap-1.5 min-w-0 mr-1">
                                        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${student.gender === 'P' || student.gender === 'Perempuan' ? 'bg-pink-500 shadow-sm shadow-pink-500/20' : 'bg-[var(--color-primary)]'}`} />
                                        <span className="truncate">{student.name}</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => onRemoveStudent?.(student.id)}
                                        className="w-4 h-4 rounded-lg hover:bg-[var(--color-surface-alt)] hover:text-red-500 flex items-center justify-center text-[var(--color-text-muted)] opacity-60 hover:opacity-100 transition-all shrink-0"
                                        title={t('dorms.plotting.deselectAll') || 'Remove'}
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] block mb-1.5">{t('dorms.bulkAssign.selectTargetRoom')}</label>
                    <div className="bg-[var(--color-surface-alt)]/30 border border-[var(--color-border)]/50 rounded-2xl p-2">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-[150px] overflow-y-auto pr-1 custom-scrollbar">
                            {(dorms || []).map((room) => {
                                const isSelected = selectedRoom === room.id
                                return (
                                    <button
                                        key={room.id}
                                        onClick={() => setSelectedRoom(room.id)}
                                        className={`py-2 px-2.5 rounded-xl border text-xs transition-all text-left flex items-center justify-between min-w-0 ${isSelected
                                            ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 text-[var(--color-primary)] font-bold'
                                            : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-surface-alt)]/60 hover:border-[var(--color-border-hover)] font-medium'
                                            }`}
                                    >
                                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                            <Bed className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)] opacity-50'}`} />
                                            <div className="flex flex-col min-w-0 leading-tight">
                                                <span className="truncate">{room.id}</span>
                                                {room.ar && <span className="text-[10px] opacity-60 font-medium truncate" dir="rtl">{room.ar}</span>}
                                            </div>
                                        </div>
                                        {isSelected && <Check className="w-3 h-3 stroke-[3px] shrink-0 ml-1 text-[var(--color-primary)]" />}
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </Modal>
    )
}
