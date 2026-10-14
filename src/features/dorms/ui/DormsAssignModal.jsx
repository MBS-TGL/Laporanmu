import React from 'react'
import Modal from '@shared/components/Modal'
import { useLanguage } from '@context/Language'
import { Search, X, Check, Bed, User } from 'lucide-react'

export default function DormsAssignModal({
    isOpen,
    onClose,
    assignStep,
    isHeaderAssign,
    studentToAssign,
    students = [],
    dorms,
    selectedTargetRoom,
    setSelectedTargetRoom,
    setStudentToAssign,
    setAssignStep,
    onSave,
    submitting
}) {
    const { t, tNum } = useLanguage()
    const [localQuery, setLocalQuery] = React.useState('')

    // Reset search query when modal opens/closes
    React.useEffect(() => {
        if (isOpen) {
            setLocalQuery('')
        }
    }, [isOpen])

    const filteredAssignStudents = React.useMemo(() => {
        const query = localQuery.trim().toLowerCase()
        if (!query) return students
        return students.filter(s =>
            s.name.toLowerCase().includes(query)
        )
    }, [students, localQuery])
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={assignStep === 1 ? t('dorms.assign.titleSelect') : t('dorms.assign.titlePlotting')}
            description={assignStep === 1 ? t('dorms.assign.descSelect') : t('dorms.assign.descPlotting')}
            icon={Bed}
            size="md"
            mobileVariant="bottom-sheet"
            footer={
                <div className="flex items-center w-full gap-3">
                    {assignStep === 1 ? (
                        <button
                            onClick={onClose}
                            className="h-9.5 px-4 sm:px-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] text-xs font-bold uppercase tracking-wider transition-all shrink-0"
                        >
                            {t('dorms.assign.cancel')}
                        </button>
                    ) : (
                        <>
                            {isHeaderAssign ? (
                                <button
                                    onClick={() => setAssignStep(1)}
                                    className="h-9.5 px-4 sm:px-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] text-xs font-bold uppercase tracking-wider transition-all shrink-0"
                                >
                                    {t('dorms.assign.back')}
                                </button>
                            ) : (
                                <button
                                    onClick={onClose}
                                    className="h-9.5 px-4 sm:px-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] text-xs font-bold uppercase tracking-wider transition-all shrink-0"
                                >
                                    {t('dorms.assign.cancel')}
                                </button>
                            )}
                            <div className="flex-1" />
                            <button
                                onClick={onSave}
                                disabled={submitting}
                                className="h-9.5 px-5 sm:px-6 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 text-white text-xs font-bold uppercase tracking-wider shadow-md shadow-[var(--color-primary)]/20 transition-all flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
                            >
                                {submitting ? (
                                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <Check className="w-3.5 h-3.5" />
                                )}
                                {t('dorms.assign.save')}
                            </button>
                        </>
                    )}
                </div>
            }
        >
            <div className="space-y-4">
                {assignStep === 1 ? (
                    <>
                        <div className="relative group mb-3">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[var(--color-text-muted)] text-sm">
                                <Search className="w-3.5 h-3.5" />
                            </div>
                            <input
                                type="text"
                                value={localQuery}
                                onChange={(e) => setLocalQuery(e.target.value)}
                                placeholder={t('dorms.assign.search')}
                                className="w-full h-10 pl-9 pr-8 text-sm bg-[var(--color-surface)] border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:outline-none transition-all rounded-xl font-medium"
                            />
                            {localQuery && (
                                <button
                                    onClick={() => setLocalQuery('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                        <div className="bg-[var(--color-surface-alt)]/30 border border-[var(--color-border)]/50 rounded-2xl p-2">
                            <div className="grid grid-cols-1 gap-1.5 max-h-[250px] overflow-y-auto pr-1 custom-scrollbar">
                                {filteredAssignStudents.length === 0 ? (
                                    <p className="text-xs text-[var(--color-text-muted)] text-center py-6 font-medium">
                                        {t('dorms.assign.notFound')}
                                    </p>
                                ) : (
                                    <>
                                        {filteredAssignStudents.slice(0, 20).map(student => {
                                            const room = student.metadata?.kamar
                                            return (
                                                <button
                                                    key={student.id}
                                                    onClick={() => {
                                                        setStudentToAssign(student)
                                                        setSelectedTargetRoom(room || '')
                                                        setAssignStep(2)
                                                    }}
                                                    className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-alt)]/60 hover:border-[var(--color-border-hover)] transition-all text-left flex items-center justify-between"
                                                >
                                                    <div>
                                                        <p className="text-sm font-bold text-[var(--color-text)]">{student.name}</p>
                                                        <p className="text-xs text-[var(--color-text-muted)] font-medium uppercase tracking-wider mt-0.5">
                                                            {student.classes?.name || t('dorms.plotting.classEmpty')}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        {room ? (
                                                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-600 border border-indigo-500/20">
                                                                {room}
                                                            </span>
                                                        ) : (
                                                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-500 border border-dashed border-amber-500/20">
                                                                {t('dorms.assign.unassigned')}
                                                            </span>
                                                        )}
                                                    </div>
                                                </button>
                                            )
                                        })}
                                        {filteredAssignStudents.length > 20 && (
                                            <p className="text-xs text-center text-[var(--color-text-muted)] py-2 font-medium border-t border-[var(--color-border)]/30 mt-2 bg-[var(--color-surface-alt)]/20 rounded-lg">
                                                {t('dorms.assign.showingLimit').replace('{total}', tNum(filteredAssignStudents.length))}
                                            </p>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="p-3.5 rounded-2xl bg-[var(--color-primary)]/[0.03] border border-[var(--color-primary)]/10 flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center shrink-0">
                                <User className="w-4.5 h-4.5" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-[var(--color-text)]">{studentToAssign?.name}</p>
                                <p className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider mt-0.5">
                                    {studentToAssign?.classes?.name || t('dorms.plotting.classEmpty')}
                                </p>
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] block mb-2">{t('dorms.assign.selectTargetRoom')}</label>
                            <div className="bg-[var(--color-surface-alt)]/30 border border-[var(--color-border)]/50 rounded-2xl p-2">
                                <div className="grid grid-cols-1 gap-1.5 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                                    <button
                                        onClick={() => setSelectedTargetRoom('')}
                                        className={`p-3 rounded-xl border text-xs font-bold transition-all text-left flex items-center justify-between ${!selectedTargetRoom
                                            ? 'border-amber-500 bg-amber-500/10 text-amber-600 shadow-sm'
                                            : 'border-dashed border-amber-500/30 bg-amber-500/5 text-amber-600/70 hover:bg-amber-500/10 hover:border-amber-500/50'
                                            }`}
                                    >
                                        <span className="flex items-center gap-2">
                                            <X className="w-3.5 h-3.5 shrink-0" />
                                            {t('dorms.assign.evictAction')}
                                        </span>
                                        {!selectedTargetRoom && <Check className="w-3.5 h-3.5 stroke-[3px] text-amber-600" />}
                                    </button>

                                    {dorms.map(room => {
                                        const isSelected = selectedTargetRoom === room.id
                                        return (
                                            <button
                                                key={room.id}
                                                onClick={() => setSelectedTargetRoom(room.id)}
                                                className={`p-3 rounded-xl border text-xs transition-all text-left flex items-center justify-between ${isSelected
                                                    ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 text-[var(--color-primary)] font-bold'
                                                    : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-surface-alt)]/60 hover:border-[var(--color-border-hover)] font-semibold'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <Bed className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)] opacity-50'}`} />
                                                    <span>{room.id}</span>
                                                    {room.ar && <span className="text-xs opacity-60 ml-1.5 font-medium" dir="rtl">{room.ar}</span>}
                                                </div>
                                                {isSelected && <Check className="w-3.5 h-3.5 stroke-[3px]" />}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </Modal>
    )
}
