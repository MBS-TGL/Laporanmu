import React, { useState, useEffect, useMemo, useRef, memo, useCallback } from 'react'
import {
    Plus, Search, Loader2, ArrowUp, ArrowDown, AlertTriangle,
    ChevronRight, ArrowRight, ArrowLeft, RotateCcw, Edit2, Clock
} from 'lucide-react'
import Modal from '@shared/components/Modal'
import RichSelect from '@shared/components/RichSelect'
import RichDatePicker from '@shared/components/RichDatePicker'
import RichTimePicker from '@shared/components/RichTimePicker'
import { faBook } from '@fortawesome/free-solid-svg-icons'
import { useToast } from '@context'
import { useLanguage } from '@context'

const BehaviorFormModal = memo(function BehaviorFormModal({
    isOpen,
    onClose,
    selectedItem,
    students = [],
    violationTypes = [],
    classesList = [],
    onSubmit,
    submitting = false
}) {
    const { addToast } = useToast()
    const { language, t, tNum, dir } = useLanguage()
    const tp = useCallback((key) => t(`behavior.${key}`), [t])
    const tDb = useCallback((text) => {
        if (!text) return text
        const key = `db.${text}`
        const val = t(key)
        return val === key ? text : val
    }, [t])
    const [currentStep, setCurrentStep] = useState(1)
    const [modalSearch, setModalSearch] = useState('')
    const [debouncedModalSearch, setDebouncedModalSearch] = useState('')
    const [modalClassFilter, setModalClassFilter] = useState('')
    const [vtSearch, setVtSearch] = useState('')
    const [debouncedVtSearch, setDebouncedVtSearch] = useState('')
    const [vtTab, setVtTab] = useState('all') // 'all', 'violation', 'achievement'
    // Timezone-aware local ISO converter helper
    const toLocalDatetimeString = (dateOrIso) => {
        const d = dateOrIso ? new Date(dateOrIso) : new Date()
        const tzOffset = d.getTimezoneOffset() * 60000
        return (new Date(d.getTime() - tzOffset)).toISOString().slice(0, 16)
    }

    const [formData, setFormData] = useState({ student_id: '', violation_type_id: '', notes: '', reported_at: toLocalDatetimeString() })
    const [formErrors, setFormErrors] = useState({})
    const [hasDraft, setHasDraft] = useState(false)
    const [recentStudentIds, setRecentStudentIds] = useState([])
    const searchInputRef = useRef(null)

    // Highlight search match helper
    const highlightText = (text, search) => {
        if (!search) return text
        const parts = text.split(new RegExp(`(${search.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi'))
        return (
            <>
                {parts.map((part, i) =>
                    part.toLowerCase() === search.toLowerCase() ? (
                        <span key={i} className="bg-yellow-100 text-amber-950 px-0.5 rounded font-black">{part}</span>
                    ) : (
                        part
                    )
                )}
            </>
        )
    }

    const DRAFT_KEY = selectedItem ? `behavior_draft_edit_${selectedItem.id}` : 'behavior_draft_new'

    // Load Draft suggestion when modal is opened
    useEffect(() => {
        if (isOpen) {
            const saved = localStorage.getItem(DRAFT_KEY)
            if (saved && !selectedItem) {
                setHasDraft(true)
            }
        }
    }, [isOpen, DRAFT_KEY, selectedItem])

    // Auto-Save Draft (Debounced 500ms)
    useEffect(() => {
        if (!isOpen || submitting || selectedItem) return
        // Only save if student is chosen or notes is typed
        if (!formData.student_id && !formData.notes) return

        const timer = setTimeout(() => {
            try {
                localStorage.setItem(DRAFT_KEY, JSON.stringify(formData))
            } catch (e) {
                console.error('Failed to save draft', e)
            }
        }, 500)
        return () => clearTimeout(timer)
    }, [formData, isOpen, submitting, DRAFT_KEY, selectedItem])

    const loadDraft = () => {
        const saved = localStorage.getItem(DRAFT_KEY)
        if (saved) {
            try {
                const savedForm = JSON.parse(saved)
                setFormData(savedForm)
                setHasDraft(false)
                if (savedForm.student_id) {
                    setCurrentStep(2)
                }
                if (savedForm.violation_type_id) {
                    setCurrentStep(3)
                }
                if (addToast) addToast(tp('draftLoaded'), 'success')
            } catch (e) {
                console.error('Failed to parse draft', e)
            }
        }
    }

    const clearDraft = () => {
        localStorage.removeItem(DRAFT_KEY)
        setHasDraft(false)
    }

    // Debounce student and behavior search inputs
    useEffect(() => {
        if (!modalSearch) {
            setDebouncedModalSearch('')
            return
        }
        const timer = setTimeout(() => {
            setDebouncedModalSearch(modalSearch)
        }, 200)
        return () => clearTimeout(timer)
    }, [modalSearch])

    useEffect(() => {
        if (!vtSearch) {
            setDebouncedVtSearch('')
            return
        }
        const timer = setTimeout(() => {
            setDebouncedVtSearch(vtSearch)
        }, 200)
        return () => clearTimeout(timer)
    }, [vtSearch])

    // Load Recent Students on modal open
    useEffect(() => {
        if (isOpen) {
            try {
                const key = 'recent_reported_student_ids'
                const saved = localStorage.getItem(key)
                if (saved) {
                    setRecentStudentIds(JSON.parse(saved))
                }
            } catch (e) {
                console.error('Failed to load recent students', e)
            }
        }
    }, [isOpen])

    // Reset / Populate form
    useEffect(() => {
        if (!isOpen) return
        if (selectedItem) {
            setFormData({
                student_id: selectedItem.student_id || '',
                violation_type_id: selectedItem.violation_type_id || '',
                notes: selectedItem.notes || '',
                reported_at: toLocalDatetimeString(selectedItem.reported_at)
            })
            setFormErrors({})
            setCurrentStep(3)
        } else {
            setFormData({ student_id: '', violation_type_id: '', notes: '', reported_at: toLocalDatetimeString() })
            setFormErrors({})
            setCurrentStep(1)
            setModalSearch('')
            setDebouncedModalSearch('')
            setModalClassFilter('')
            setVtSearch('')
            setDebouncedVtSearch('')
            setVtTab('all')
        }
        setHasDraft(false)
    }, [isOpen, selectedItem])

    // Autofocus search input in step 1
    useEffect(() => {
        if (isOpen && currentStep === 1) {
            const timer = setTimeout(() => {
                searchInputRef.current?.focus()
            }, 300)
            return () => clearTimeout(timer)
        }
    }, [isOpen, currentStep])

    // Filter students
    const filteredStudentsForModal = useMemo(() => {
        let list = students
        if (modalClassFilter) list = list.filter(s => s.class_name === modalClassFilter)
        if (debouncedModalSearch) list = list.filter(s => s.name.toLowerCase().includes(debouncedModalSearch.toLowerCase()))
        return list
    }, [students, modalClassFilter, debouncedModalSearch])

    // Limit displayed students initially to prevent DOM thrashing and lag on open
    const displayedStudents = useMemo(() => {
        if (debouncedModalSearch || modalClassFilter) return filteredStudentsForModal
        return filteredStudentsForModal.slice(0, 25)
    }, [filteredStudentsForModal, debouncedModalSearch, modalClassFilter])

    // Filter and map recent students
    const recentStudents = useMemo(() => {
        if (!recentStudentIds || recentStudentIds.length === 0) return []
        return recentStudentIds
            .map(id => students.find(s => s.id === id))
            .filter(Boolean)
            .slice(0, 4) // Limit to 4 chips
    }, [recentStudentIds, students])

    // Filter violation/behavior types for Step 2
    const filteredViolationTypes = useMemo(() => {
        return violationTypes.filter(vt => {
            const matchesSearch = tDb(vt.name).toLowerCase().includes(debouncedVtSearch.toLowerCase())
            const isNegative = vt.points < 0
            if (vtTab === 'violation') return matchesSearch && isNegative
            if (vtTab === 'achievement') return matchesSearch && !isNegative
            return matchesSearch
        })
    }, [violationTypes, debouncedVtSearch, vtTab, tDb])

    const groupedVT = useMemo(() => {
        const violations = filteredViolationTypes.filter(vt => vt.points < 0)
        const achievements = filteredViolationTypes.filter(vt => vt.points > 0)
        return { violations, achievements }
    }, [filteredViolationTypes])

    const selectOptions = useMemo(() => {
        return violationTypes.map(vt => {
            const isNegative = vt.points < 0
            const ptsText = `[${tp('points')} ${isNegative ? '' : '+'}${tNum(vt.points)}]`
            return {
                id: vt.id,
                name: `${isNegative ? '🔴' : '🟢'} ${ptsText} ${tDb(vt.name)}`,
                group: isNegative ? tp('violation') : tp('achievement'),
                render: (
                    <span className="flex items-center gap-1.5 font-bold">
                        {isNegative ? (
                            <ArrowDown className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        ) : (
                            <ArrowUp className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        )}
                        <span className={isNegative ? 'text-rose-600 dark:text-rose-400 font-black' : 'text-emerald-600 dark:text-emerald-400 font-black'}>
                            {ptsText}
                        </span>
                        <span className="text-[var(--color-text)] font-semibold truncate">{tDb(vt.name)}</span>
                    </span>
                )
            }
        })
    }, [violationTypes, tp, tNum, tDb])

    const classOptions = useMemo(() => {
        return classesList.map(c => ({ id: c, name: c }))
    }, [classesList])

    const nextStep = (studentId = null) => {
        if (currentStep === 1) {
            const activeStudentId = studentId || formData.student_id
            if (!activeStudentId) return
            if (studentId) {
                setFormData(prev => ({ ...prev, student_id: studentId }))
            }
            setFormErrors(prev => ({ ...prev, student_id: '' }))
            setCurrentStep(2)
        } else if (currentStep === 2) {
            if (!formData.violation_type_id) return
            setFormErrors(prev => ({ ...prev, violation_type_id: '' }))
            setCurrentStep(3)
        }
    }

    const prevStep = () => {
        if (selectedItem) return
        if (currentStep === 2) {
            setCurrentStep(1)
        } else if (currentStep === 3) {
            setCurrentStep(2)
        }
    }

    const handleSubmit = (e) => {
        if (e) e.preventDefault()
        const errors = {}
        if (!formData.student_id) errors.student_id = tp('errStudentRequired')
        if (!formData.violation_type_id) errors.violation_type_id = tp('errTypeRequired')

        if (Object.keys(errors).length) {
            setFormErrors(errors)
            return
        }
        setFormErrors({})

        // Save to recent reported students
        try {
            const key = 'recent_reported_student_ids'
            const saved = localStorage.getItem(key)
            const list = saved ? JSON.parse(saved) : []
            const updated = [formData.student_id, ...list.filter(id => id !== formData.student_id)].slice(0, 5)
            localStorage.setItem(key, JSON.stringify(updated))
        } catch (e) {
            console.error('Failed to save recent student', e)
        }

        onSubmit(formData)
        clearDraft()
    }

    const progress = selectedItem ? 100 : (currentStep === 1 ? 33 : currentStep === 2 ? 66 : 100)

    if (!isOpen) return null

    const BackIcon = dir === 'rtl' ? ArrowRight : ArrowLeft
    const NextIcon = dir === 'rtl' ? ArrowLeft : ArrowRight

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={selectedItem ? tp('editReport') : tp('addReport')}
            description={
                <div className="flex items-center gap-2">
                    <div className="h-1.5 w-24 bg-[var(--color-border)] rounded-full overflow-hidden shrink-0">
                        <div
                            className="h-full bg-[var(--color-primary)] transition-all duration-500"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <span className="text-[10px] font-black text-[var(--color-primary)]">{tNum(progress)}% {tp('complete')}</span>
                </div>
            }
            icon={selectedItem ? Edit2 : Plus}
            iconBg="bg-[var(--color-primary)]/10"
            iconColor="text-[var(--color-primary)]"
            size="md"
            mobileVariant="bottom-sheet"
            contentClassName="custom-scrollbar"
            footer={
                <div className="flex items-center justify-between w-full">
                    {currentStep === 1 ? (
                        <button
                            type="button"
                            onClick={onClose}
                            className="h-10 px-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] text-[10px] font-black uppercase tracking-widest transition-all shrink-0"
                        >
                            {tp('cancel')}
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={prevStep}
                            className="h-10 px-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] text-[10px] font-black uppercase tracking-widest transition-all shrink-0 flex items-center justify-center gap-2"
                        >
                            <BackIcon className="w-3.5 h-3.5" />
                            <span>{t('behavior.back')}</span>
                        </button>
                    )}

                    <div className="flex-1" />

                    {currentStep === 1 && (
                        <button
                            type="button"
                            onClick={() => nextStep()}
                            disabled={!formData.student_id}
                            className="h-10 px-6 sm:px-8 rounded-xl bg-[var(--color-primary)] text-white text-[10px] font-bold uppercase tracking-wider hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-[var(--color-primary)]/10 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                        >
                            <span>{tp('next')}</span>
                            <NextIcon className="w-3.5 h-3.5 text-white" />
                        </button>
                    )}

                    {currentStep === 2 && (
                        <button
                            type="button"
                            onClick={() => nextStep()}
                            disabled={!formData.violation_type_id}
                            className="h-10 px-6 sm:px-8 rounded-xl bg-[var(--color-primary)] text-white text-[10px] font-bold uppercase tracking-wider hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-[var(--color-primary)]/10 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                        >
                            <span>{tp('next')}</span>
                            <NextIcon className="w-3.5 h-3.5 text-white" />
                        </button>
                    )}

                    {currentStep === 3 && (
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={submitting || !formData.violation_type_id}
                            className="h-10 px-6 sm:px-8 rounded-xl bg-[var(--color-primary)] text-white text-[10px] font-bold uppercase tracking-wider hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-[var(--color-primary)]/10 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    <span>{tp('saving')}</span>
                                </>
                            ) : (
                                <>
                                    {selectedItem ? <Edit2 className="w-3.5 h-3.5 animate-in fade-in" /> : <Plus className="w-3.5 h-3.5 animate-in fade-in" />}
                                    <span>{selectedItem ? tp('saveChanges') : tp('saveReport')}</span>
                                </>
                            )}
                        </button>
                    )}
                </div>
            }
        >
            <div className="space-y-4 py-1">
                {/* Draft Banner */}
                {hasDraft && (
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 animate-in slide-in-from-top-2">
                        <div className="flex items-center gap-2">
                            <RotateCcw className="text-amber-500 w-3.5 h-3.5" />
                            <span className="text-[10px] font-bold text-amber-700">{tp('hasDraft')}</span>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={clearDraft}
                                className="text-[9px] font-black uppercase text-amber-600/50 hover:text-amber-600 transition-colors"
                            >
                                {tp('deleteDraft')}
                            </button>
                            <button
                                onClick={loadDraft}
                                className="px-2.5 py-1 rounded-lg bg-amber-500 text-white text-[9px] font-black uppercase tracking-wider shadow-sm hover:bg-amber-600 transition-all active:scale-95"
                            >
                                {tp('continueDraft')}
                            </button>
                        </div>
                    </div>
                )}

                {currentStep === 1 && (
                    <div className="space-y-2 animate-in fade-in">
                        <div className="grid grid-cols-[120px_1fr] gap-2">
                            <div>
                                <label className="text-[10px] font-black uppercase text-[var(--color-text-muted)] tracking-widest block mb-1">
                                    {tp('classLabel')}
                                </label>
                                <RichSelect
                                    value={modalClassFilter}
                                    onChange={setModalClassFilter}
                                    options={classOptions}
                                    placeholder={tp('allClassesShort')}
                                    extraOption={{ id: '', name: tp('allClassesShort') }}
                                    small={true}
                                    buttonClassName="!h-8 sm:!h-8 rounded-xl px-3 text-xs"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase text-[var(--color-text-muted)] tracking-widest block mb-1">
                                    {tp('searchName')}
                                </label>
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] w-3 h-3 pointer-events-none" />
                                    <input
                                        type="text"
                                        ref={searchInputRef}
                                        value={modalSearch}
                                        onChange={e => setModalSearch(e.target.value)}
                                        placeholder={tp('searchPlaceholderModal')}
                                        className="input-field w-full h-8 pl-8 pr-3 rounded-xl border-[var(--color-border)] bg-[var(--color-surface-alt)] text-xs font-bold focus:border-[var(--color-primary)] transition-all placeholder:text-[var(--color-text-muted)]/50 outline-none"
                                    />
                                </div>
                            </div>
                        </div>

                        {recentStudents.length > 0 && (
                            <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                                <div className="flex items-center gap-1 text-[10px] font-black uppercase text-[var(--color-text-muted)] tracking-widest opacity-80">
                                    <Clock className="w-2.5 h-2.5 text-[var(--color-primary)]" />
                                    <span>{tp('recentlyReported')}</span>
                                </div>
                                <div className="flex flex-wrap gap-1 mt-1">
                                    {recentStudents.map(s => (
                                        <button
                                            key={s.id}
                                            type="button"
                                            onClick={() => nextStep(s.id)}
                                            className="h-6 px-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 active:scale-95 text-[10px] font-bold text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-all flex items-center gap-1 shadow-sm"
                                        >
                                            <div className="w-3.5 h-3.5 rounded bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center font-black text-[9px] leading-none">
                                                {s.name[0].toUpperCase()}
                                            </div>
                                            <span>{s.name.split(' ').slice(0, 2).join(' ')}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="border border-[var(--color-border)]/80 rounded-[1.25rem] p-1.5 bg-[var(--color-surface-alt)]/35">
                            <div className="max-h-[220px] overflow-y-auto custom-scrollbar pr-1 space-y-1">
                                {filteredStudentsForModal.length === 0 ? (
                                    <div className="py-8 text-center opacity-40">
                                        <Search className="w-4 h-4 mx-auto mb-1.5" />
                                        <p className="text-[10px] font-black uppercase tracking-widest">
                                            {students.length === 0 ? tp('loadingData') : tp('notFound')}
                                        </p>
                                    </div>
                                ) : (
                                    <>
                                        {displayedStudents.map(s => (
                                            <button
                                                key={s.id}
                                                onClick={() => nextStep(s.id)}
                                                className={`w-full px-2.5 py-1.5 rounded-xl border transition-all text-left flex items-center justify-between group active:scale-[0.99] ${formData.student_id === s.id
                                                    ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white shadow-lg shadow-[var(--color-primary)]/20'
                                                    : 'bg-[var(--color-surface)] border-[var(--color-border)]/50 hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-surface-alt)]'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-2.5">
                                                    <div
                                                        className={`w-6 h-6 rounded-lg flex items-center justify-center font-black text-xs flex-shrink-0 ${formData.student_id === s.id
                                                            ? 'bg-white/20 text-white'
                                                            : 'bg-[var(--color-surface-alt)] text-[var(--color-primary)]'
                                                            }`}
                                                    >
                                                        {s.name[0].toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold leading-tight">
                                                            {highlightText(s.name, debouncedModalSearch)}
                                                        </p>
                                                        <div className="flex items-center gap-1.5 mt-0.5 leading-none">
                                                            {s.class_name && (
                                                                <span className={`text-[10px] font-extrabold uppercase tracking-wider ${formData.student_id === s.id
                                                                    ? 'text-white/80'
                                                                    : 'text-[var(--color-text-muted)] opacity-60'
                                                                    }`}>
                                                                    {s.class_name}
                                                                </span>
                                                            )}
                                                            <span className={`text-[10px] font-black ${formData.student_id === s.id
                                                                ? 'text-white/90'
                                                                : (s.total_points ?? 0) >= 100
                                                                    ? 'text-emerald-500'
                                                                    : (s.total_points ?? 0) < 100
                                                                        ? 'text-rose-500'
                                                                        : 'text-[var(--color-primary)]'
                                                                }`}>
                                                                • {tNum(s.total_points ?? 0)} {tp('points')}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <ChevronRight
                                                    className={`w-3 h-3 ${formData.student_id === s.id ? 'text-white' : 'text-[var(--color-text-muted)]'
                                                        }`}
                                                />
                                            </button>
                                        ))}
                                        {filteredStudentsForModal.length > displayedStudents.length && (
                                            <div className="py-1.5 text-center text-[10px] font-bold text-[var(--color-text-muted)] opacity-50 bg-[var(--color-surface)] rounded-xl border border-dashed border-[var(--color-border)]/60 my-1 mx-0.5">
                                                {tp('showingCount').replace('{total}', tNum(filteredStudentsForModal.length))}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {currentStep === 2 && (
                    <div className="space-y-2 animate-in fade-in">
                        {/* Selected Student Card */}
                        {(() => {
                            const s = students.find(st => st.id === formData.student_id)
                            return (
                                <div className="p-1.5 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-2xl flex items-center gap-2">
                                    <div className="w-6.5 h-6.5 rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center font-black text-xs flex-shrink-0 animate-in fade-in">
                                        {(s?.name || '?')[0].toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[9px] font-black uppercase text-[var(--color-text-muted)] tracking-widest leading-none">
                                            {tp('recipient')}
                                        </p>
                                        <p className="text-sm font-bold text-[var(--color-text)] truncate leading-tight mt-1 animate-in fade-in">
                                            {s?.name}
                                            {s?.class_name && (
                                                <span className="text-[10px] font-bold text-[var(--color-text-muted)] ml-1.5 opacity-80">
                                                    - {s.class_name}
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                    {!selectedItem && (
                                        <button
                                            type="button"
                                            onClick={() => setCurrentStep(1)}
                                            className="w-6 h-6 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-primary)]/30 text-[var(--color-text-muted)] hover:text-[var(--color-primary)] flex items-center justify-center transition-all flex-shrink-0"
                                            aria-label="Change student"
                                        >
                                            <BackIcon className="w-2.5 h-2.5" />
                                        </button>
                                    )}
                                </div>
                            )
                        })()}

                        {/* Behavior Type Picker */}
                        <div className="space-y-1.5">
                            <div className="grid grid-cols-[230px_1fr] gap-2">
                                <div>
                                    <label className="text-[10px] font-black uppercase text-[var(--color-text-muted)] tracking-widest block mb-1">
                                        {tp('category')}
                                    </label>
                                    <div className="flex gap-1 bg-[var(--color-surface-alt)] p-0.5 rounded-xl border border-[var(--color-border)] h-8">
                                        {[
                                            { id: 'all', label: tp('all') },
                                            { id: 'violation', label: tp('violation') },
                                            { id: 'achievement', label: tp('achievement') }
                                        ].map(tab => (
                                            <button
                                                key={tab.id}
                                                type="button"
                                                onClick={() => setVtTab(tab.id)}
                                                className={`flex-1 h-full text-[11px] font-bold rounded-lg transition-all
                                                    ${vtTab === tab.id
                                                        ? 'bg-[var(--color-primary)] text-white shadow-sm'
                                                        : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
                                            >
                                                {tab.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase text-[var(--color-text-muted)] tracking-widest block mb-1">
                                        {tp('colRule')}
                                    </label>
                                    <div className="relative">
                                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] w-3 h-3 pointer-events-none" />
                                        <input
                                            type="text"
                                            value={vtSearch}
                                            onChange={e => setVtSearch(e.target.value)}
                                            placeholder={tp('searchPlaceholderBehavior')}
                                            className="input-field w-full h-8 pl-8 pr-3 rounded-xl border-[var(--color-border)] bg-[var(--color-surface-alt)] text-xs font-bold focus:border-[var(--color-primary)] transition-all placeholder:text-[var(--color-text-muted)]/50 outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Scrollable list of behavior types */}
                            <div className="border border-[var(--color-border)]/80 rounded-[1.25rem] p-1.5 bg-[var(--color-surface-alt)]/35 mt-1 animate-in fade-in">
                                <div className="max-h-[170px] overflow-y-auto custom-scrollbar pr-1 space-y-1">
                                    {filteredViolationTypes.length === 0 ? (
                                        <div className="py-8 text-center opacity-40">
                                            <Search className="w-4 h-4 mx-auto mb-1.5" />
                                            <p className="text-[10px] font-black uppercase tracking-widest">
                                                {tp('notFound')}
                                            </p>
                                        </div>
                                    ) : (
                                        <>
                                            {/* Violations Group */}
                                            {groupedVT.violations.length > 0 && (
                                                <div className="space-y-1">
                                                    <p className="text-[9px] font-black text-rose-500 uppercase tracking-wider px-1">
                                                        {tp('violation')}
                                                    </p>
                                                    {groupedVT.violations.map(vt => {
                                                        const ptsVal = `Poin ${vt.points}`
                                                        return (
                                                            <button
                                                                key={vt.id}
                                                                type="button"
                                                                onClick={() => {
                                                                    setFormData(prev => ({ ...prev, violation_type_id: vt.id }))
                                                                    setFormErrors(prev => ({ ...prev, violation_type_id: '' }))
                                                                    setCurrentStep(3)
                                                                }}
                                                                className={`w-full px-2.5 py-1.5 rounded-xl border transition-all text-left flex items-center justify-between group active:scale-[0.99]
                                                                    ${formData.violation_type_id === vt.id
                                                                        ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white'
                                                                        : 'bg-[var(--color-surface)] border-[var(--color-border)]/50 hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-surface-alt)]'}`}
                                                            >
                                                                <div className="flex items-center gap-2 min-w-0">
                                                                    <div className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 ${formData.violation_type_id === vt.id ? 'bg-white/20 text-white' : 'bg-rose-500/10 text-rose-500'}`}>
                                                                        <ArrowDown className="w-2.5 h-2.5" />
                                                                    </div>
                                                                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded flex-shrink-0 ${formData.violation_type_id === vt.id ? 'bg-white/20 text-white' : 'bg-rose-500/10 text-rose-500'}`}>
                                                                        {ptsVal}
                                                                    </span>
                                                                    <span className="text-xs font-bold truncate">
                                                                        {highlightText(tDb(vt.name), debouncedVtSearch)}
                                                                    </span>
                                                                </div>
                                                                <ChevronRight className={`w-3 h-3 flex-shrink-0 ${formData.violation_type_id === vt.id ? 'text-white' : 'text-[var(--color-text-muted)]'}`} />
                                                            </button>
                                                        )
                                                    })}
                                                </div>
                                            )}

                                            {/* Achievements Group */}
                                            {groupedVT.achievements.length > 0 && (
                                                <div className="space-y-1 mt-1.5">
                                                    <p className="text-[9px] font-black text-emerald-500 uppercase tracking-wider px-1">
                                                        {tp('achievement')}
                                                    </p>
                                                    {groupedVT.achievements.map(vt => {
                                                        const ptsVal = `Poin +${vt.points}`
                                                        return (
                                                            <button
                                                                key={vt.id}
                                                                type="button"
                                                                onClick={() => {
                                                                    setFormData(prev => ({ ...prev, violation_type_id: vt.id }))
                                                                    setFormErrors(prev => ({ ...prev, violation_type_id: '' }))
                                                                    setCurrentStep(3)
                                                                }}
                                                                className={`w-full px-2.5 py-1.5 rounded-xl border transition-all text-left flex items-center justify-between group active:scale-[0.99]
                                                                    ${formData.violation_type_id === vt.id
                                                                        ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white'
                                                                        : 'bg-[var(--color-surface)] border-[var(--color-border)]/50 hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-surface-alt)]'}`}
                                                            >
                                                                <div className="flex items-center gap-2 min-w-0">
                                                                    <div className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 ${formData.violation_type_id === vt.id ? 'bg-white/20 text-white' : 'bg-emerald-500/10 text-emerald-500'}`}>
                                                                        <ArrowUp className="w-2.5 h-2.5" />
                                                                    </div>
                                                                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded flex-shrink-0 ${formData.violation_type_id === vt.id ? 'bg-white/20 text-white' : 'bg-emerald-500/10 text-emerald-500'}`}>
                                                                        {ptsVal}
                                                                    </span>
                                                                    <span className="text-xs font-bold truncate">
                                                                        {highlightText(tDb(vt.name), debouncedVtSearch)}
                                                                    </span>
                                                                </div>
                                                                <ChevronRight className={`w-3 h-3 flex-shrink-0 ${formData.violation_type_id === vt.id ? 'text-white' : 'text-[var(--color-text-muted)]'}`} />
                                                            </button>
                                                        )
                                                    })}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {currentStep === 3 && (
                    <div className="space-y-3 animate-in fade-in">
                        {/* Selected Student Card */}
                        {(() => {
                            const s = students.find(st => st.id === formData.student_id)
                            return (
                                <div className="p-1.5 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-2xl flex items-center gap-2">
                                    <div className="w-6.5 h-6.5 rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center font-black text-xs flex-shrink-0 animate-in fade-in">
                                        {(s?.name || '?')[0].toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[9px] font-black uppercase text-[var(--color-text-muted)] tracking-widest leading-none">
                                            {tp('recipient')}
                                        </p>
                                        <p className="text-sm font-bold text-[var(--color-text)] truncate leading-tight mt-1 animate-in fade-in">
                                            {s?.name}
                                            {s?.class_name && (
                                                <span className="text-[10px] font-bold text-[var(--color-text-muted)] ml-1.5 opacity-80">
                                                    - {s.class_name}
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                    {!selectedItem && (
                                        <button
                                            type="button"
                                            onClick={() => setCurrentStep(1)}
                                            className="w-6 h-6 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-primary)]/30 text-[var(--color-text-muted)] hover:text-[var(--color-primary)] flex items-center justify-center transition-all flex-shrink-0"
                                            aria-label="Change student"
                                        >
                                            <BackIcon className="w-2.5 h-2.5" />
                                        </button>
                                    )}
                                </div>
                            )
                        })()}

                        {/* Selected Behavior Card */}
                        {(() => {
                            const selectedVT = violationTypes.find(vt => vt.id === formData.violation_type_id)
                            const isNegative = selectedVT?.points < 0
                            const ptsText = `[Poin ${isNegative ? '' : '+'}${selectedVT?.points || 0}]`
                            return (
                                <div className="p-1.5 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-2xl flex items-center gap-2 animate-in fade-in">
                                    <div className={`w-6.5 h-6.5 rounded-lg flex items-center justify-center flex-shrink-0 ${isNegative ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                                        {isNegative ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[9px] font-black uppercase text-[var(--color-text-muted)] tracking-widest leading-none">
                                            {tp('behaviorType')}
                                        </p>
                                        <div className="flex items-center gap-1.5 flex-wrap mt-0.5 leading-none">
                                            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${isNegative ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                                                {ptsText}
                                            </span>
                                            <span className="text-sm font-bold text-[var(--color-text)] truncate animate-in fade-in">
                                                {tDb(selectedVT?.name)}
                                            </span>
                                        </div>
                                    </div>
                                    {!selectedItem && (
                                        <button
                                            type="button"
                                            onClick={() => setCurrentStep(2)}
                                            className="w-6 h-6 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-primary)]/30 text-[var(--color-text-muted)] hover:text-[var(--color-primary)] flex items-center justify-center transition-all flex-shrink-0"
                                            aria-label="Change behavior"
                                        >
                                            <BackIcon className="w-2.5 h-2.5" />
                                        </button>
                                    )}
                                </div>
                            )
                        })()}

                        {/* Waktu Kejadian Section */}
                        <div className="space-y-1.5 border-t border-[var(--color-border)]/50 pt-3 animate-in fade-in duration-200">
                            <label className="text-[10px] font-black uppercase text-[var(--color-text-muted)] tracking-widest block mb-0.5">
                                {tp('dateTime')}
                            </label>
                            <div className="grid grid-cols-[1fr_110px] gap-2">
                                <RichDatePicker
                                    value={formData.reported_at.slice(0, 10)}
                                    clearable={false}
                                    onChange={(newDateVal) => {
                                        if (newDateVal) {
                                            const timePart = formData.reported_at.slice(11, 16) || '12:00'
                                            setFormData(prev => ({ ...prev, reported_at: `${newDateVal}T${timePart}` }))
                                        }
                                    }}
                                />
                                <RichTimePicker
                                    value={formData.reported_at.slice(11, 16)}
                                    onChange={(newTimeVal) => {
                                        if (newTimeVal) {
                                            const datePart = formData.reported_at.slice(0, 10) || toLocalDatetimeString().slice(0, 10)
                                            setFormData(prev => ({ ...prev, reported_at: `${datePart}T${newTimeVal}` }))
                                        }
                                    }}
                                />
                            </div>
                        </div>

                        {/* Catatan Section */}
                        <div className="space-y-1.5 border-t border-[var(--color-border)]/50 pt-3">
                            <label className="text-[10px] font-black uppercase text-[var(--color-text-muted)] tracking-widest block">
                                {tp('notes')} <span className="normal-case font-medium opacity-50">({tp('optional')})</span>
                            </label>
                            <textarea
                                value={formData.notes || ''}
                                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                placeholder={tp('notesPlaceholder')}
                                className="w-full bg-[var(--color-surface)] border border-[var(--color-border)]/60 rounded-xl p-2.5 text-sm font-bold text-[var(--color-text)] outline-none min-h-[70px] focus:ring-2 ring-[var(--color-primary)]/20 transition-all resize-none placeholder:text-[var(--color-text-muted)]/50"
                            />
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    )
})

export default BehaviorFormModal
