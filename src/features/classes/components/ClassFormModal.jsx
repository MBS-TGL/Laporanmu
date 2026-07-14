import React, { useState, useEffect, useCallback, memo } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faPlus, faEdit, faSpinner, faCheckCircle, faChevronDown, faSchool, faBuilding, faBed, faMars, faVenus, faIdBadge, faUserTie, faCalendarAlt, faTriangleExclamation
} from '@fortawesome/free-solid-svg-icons'
import { Modal, RichSelect } from '@shared/components'

const ClassFormModal = memo(function ClassFormModal({
    isOpen,
    onClose,
    selectedItem,
    teachersList,
    academicYearsList,
    onSubmit,
    submitting
}) {
    const LEVELS = ['7', '8', '9', '10', '11', '12']
    const PROGRAMS = ['Boarding', 'Reguler']
    const GENDERS = ['Putra', 'Putri']

    const INIT = {
        name: '',
        level: '7',
        program: 'Boarding',
        gender_type: 'Putra',
        homeroom_teacher_id: '',
        academic_year_id: academicYearsList[0]?.id || ''
    }

    const [form, setForm] = useState(INIT)
    const [formError, setFormError] = useState('')
    const [touched, setTouched] = useState({})
    const [attemptedSubmit, setAttemptedSubmit] = useState(false)

    useEffect(() => {
        if (!isOpen) return
        if (selectedItem) {
            const teacherIds = teachersList.map(t => t.id)
            const validTeacherId = teacherIds.includes(selectedItem.homeroom_teacher_id)
                ? selectedItem.homeroom_teacher_id
                : ''
            setForm({
                name: selectedItem.name || '',
                level: selectedItem.grade || '7',
                program: selectedItem.major?.includes('Reguler') ? 'Reguler' : 'Boarding',
                gender_type: selectedItem.major?.includes('Putri') ? 'Putri' : 'Putra',
                homeroom_teacher_id: validTeacherId,
                academic_year_id: selectedItem.academic_year_id || academicYearsList[0]?.id || ''
            })
        } else {
            setForm({ ...INIT, academic_year_id: academicYearsList[0]?.id || '' })
        }
        setFormError('')
        setTouched({})
        setAttemptedSubmit(false)
    }, [isOpen, selectedItem, academicYearsList, teachersList])

    const setField = useCallback((key, val) => {
        setForm(p => ({ ...p, [key]: val }))
    }, [])

    const setFieldTouched = (field) => setTouched(prev => ({ ...prev, [field]: true }))

    const getStatus = (field, isRequired = false) => {
        const value = form[field]
        const isTouched = touched[field] || attemptedSubmit

        if (isRequired) {
            if (isTouched && (!value || (typeof value === 'string' && !value.trim()))) return 'error'
            if (value && (typeof value === 'string' ? value.trim() : true)) return 'success'
        } else {
            if (value && (typeof value === 'string' ? value.trim() : true)) return 'success'
        }
        return 'normal'
    }

    const overallProgress = (() => {
        const fields = ['name', 'homeroom_teacher_id', 'academic_year_id']
        const filled = fields.filter(f => form[f]).length
        return Math.round((filled / fields.length) * 100)
    })()

    const handleSubmit = async (e) => {
        e?.preventDefault()
        setAttemptedSubmit(true)
        const name = (form.name || '').trim()
        if (!name) { setFormError('Nama kelas wajib diisi.'); return }
        setFormError('')
        
        const sanitized = {
            ...form,
            name,
            homeroom_teacher_id: form.homeroom_teacher_id || null,
            academic_year_id: form.academic_year_id || null,
        }
        const result = await onSubmit(sanitized)
        if (result?.error) {
            setFormError(result.message || 'Gagal menyimpan data kelas.')
        }
    }

    if (!isOpen) return null
    const hasTeachers = (teachersList?.length || 0) > 0

    const inputCls = (field, required = false) => {
        const s = getStatus(field, required)
        return `w-full px-4 h-11 rounded-xl border bg-[var(--color-surface)] outline-none transition-all text-[13px] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] placeholder:opacity-40 ${
            s === 'error' ? 'border-rose-500/50 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 bg-rose-50/5' :
            s === 'success' ? 'border-emerald-500/30 bg-emerald-50/5 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500' :
            'border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]'
        }`
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={selectedItem ? 'Edit Data Kelas' : 'Tambah Kelas Baru'}
            description={
                <div className="flex items-center gap-2">
                    <div className="h-1.5 w-24 bg-[var(--color-border)] rounded-full overflow-hidden shrink-0">
                        <div
                            className="h-full bg-[var(--color-primary)] transition-all duration-500"
                            style={{ width: `${overallProgress}%` }}
                        />
                    </div>
                    <span className="text-[10px] font-black text-[var(--color-primary)]">{overallProgress}% Lengkap</span>
                </div>
            }
            icon={selectedItem ? faEdit : faPlus}
            iconBg="bg-[var(--color-primary)]/10"
            iconColor="text-[var(--color-primary)]"
            size="lg"
            mobileVariant="bottom-sheet"
            footer={
                <div className="flex items-center w-full gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="h-10 px-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] text-[10px] font-black uppercase tracking-widest transition-all shrink-0 flex items-center justify-center"
                    >
                        Batal
                    </button>
                    <div className="flex-1" />
                    <button
                        type="submit"
                        form="class-form-modal"
                        disabled={submitting}
                        className="h-10 px-6 sm:px-8 rounded-xl bg-[var(--color-primary)] text-white text-[10px] font-bold uppercase tracking-wider hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-[var(--color-primary)]/20 disabled:opacity-50 disabled:cursor-not-allowed border border-white/10 shrink-0"
                    >
                        {submitting ? (
                            <>
                                <FontAwesomeIcon icon={faSpinner} className="fa-spin" />
                                <span>Menyimpan...</span>
                            </>
                        ) : (
                            <>
                                <FontAwesomeIcon icon={faCheckCircle} className="text-xs opacity-80 shrink-0" />
                                <span className="truncate hidden sm:inline">{selectedItem ? 'Simpan Perubahan' : 'Simpan Data'}</span>
                                <span className="truncate sm:hidden">Simpan</span>
                            </>
                        )}
                    </button>
                </div>
            }
        >
            <form id="class-form-modal" onSubmit={handleSubmit} className="space-y-6">
                {/* ── Section: Identitas Kelas ── */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2.5 pt-2">
                        <div className="w-1 h-4 bg-[var(--color-primary)] rounded-full" />
                        <FontAwesomeIcon icon={faIdBadge} className="text-[var(--color-primary)] text-[10px] opacity-70" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text)]">Identitas Kelas</span>
                        <div className="h-[1px] flex-1 bg-gradient-to-r from-[var(--color-border)] to-transparent opacity-40" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Nama Kelas */}
                        <div className="relative group">
                            <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 mb-1 block opacity-50">Nama Kelas <span className="text-rose-500">*</span></label>
                            <input
                                type="text"
                                required
                                value={form.name}
                                onChange={e => setField('name', e.target.value)}
                                onBlur={() => setFieldTouched('name')}
                                placeholder="e.g. 7A, 10 MIPA 1"
                                className={inputCls('name', true)}
                                autoFocus
                            />
                            <p className="mt-1 ml-1 text-[10px] font-bold text-[var(--color-text-muted)] opacity-60">
                                Gunakan format singkat (e.g. 7A, 10 MIPA 1).
                            </p>
                        </div>

                        {/* Gender Segment */}
                        <div className="relative group">
                            <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 mb-1 block opacity-50">Segmen Gender</label>
                            <div className="flex p-1 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-xl h-11">
                                {GENDERS.map(g => (
                                    <button
                                        key={g}
                                        type="button"
                                        onClick={() => setField('gender_type', g)}
                                        className={`flex-1 rounded-lg text-[10px] font-bold tracking-wider transition-all duration-200 flex items-center justify-center gap-2 ${form.gender_type === g
                                            ? 'bg-[var(--color-primary)] text-white shadow-md shadow-[var(--color-primary)]/20'
                                            : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)]'}`}
                                    >
                                        <FontAwesomeIcon icon={g === 'Putra' ? faMars : faVenus} className="text-[10px]" />
                                        {g}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Tingkat & Program */}
                        <div className="relative group">
                            <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 mb-1 block opacity-50">Tingkat / Grade</label>
                            <RichSelect
                                value={form.level}
                                onChange={val => setField('level', val)}
                                options={LEVELS.map(l => ({ id: l, name: `Kelas ${l}` }))}
                                placeholder="Pilih Tingkat"
                                icon={faSchool}
                                status={getStatus('level')}
                            />
                        </div>

                        <div className="relative group">
                            <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 mb-1 block opacity-50">Program</label>
                            <div className="flex p-1 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-xl h-11">
                                {PROGRAMS.map(p => (
                                    <button
                                        key={p}
                                        type="button"
                                        onClick={() => setField('program', p)}
                                        className={`flex-1 rounded-lg text-[10px] font-bold tracking-wider transition-all duration-200 flex items-center justify-center gap-2 ${form.program === p
                                            ? 'bg-[var(--color-primary)] text-white shadow-md shadow-[var(--color-primary)]/20'
                                            : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)]'}`}
                                    >
                                        <FontAwesomeIcon icon={p === 'Boarding' ? faBed : faBuilding} className="text-[10px]" />
                                        {p}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Section: Penanggung Jawab & Periode ── */}
                <div className="space-y-4 pb-4">
                    <div className="flex items-center gap-2.5 pt-2">
                        <div className="w-1 h-4 bg-[var(--color-primary)] rounded-full" />
                        <FontAwesomeIcon icon={faUserTie} className="text-[var(--color-primary)] text-[10px] opacity-70" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text)]">Penanggung Jawab & Periode</span>
                        <div className="h-[1px] flex-1 bg-gradient-to-r from-[var(--color-border)] to-transparent opacity-40" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Wali Kelas */}
                        <div className="relative group">
                            <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 mb-1 block opacity-50">Wali Kelas (Homeroom Teacher)</label>
                            <RichSelect
                                value={form.homeroom_teacher_id || ''}
                                onChange={val => setField('homeroom_teacher_id', val)}
                                options={teachersList.map(t => ({ id: t.id, name: t.name }))}
                                extraOption={{ id: '', name: '— Tanpa Wali Kelas —' }}
                                placeholder={hasTeachers ? 'Pilih Wali Kelas' : 'Tidak ada data guru'}
                                icon={faUserTie}
                                searchable
                                disabled={!hasTeachers}
                                status={getStatus('homeroom_teacher_id')}
                            />
                            {!hasTeachers && (
                                <p className="mt-1.5 ml-1 text-[10px] font-bold text-amber-600 dark:text-amber-500 flex items-center gap-2">
                                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-lg bg-amber-500/10 border border-amber-500/20">!</span>
                                    Tidak ada data guru. Tambahkan guru dulu di menu Master → Guru.
                                </p>
                            )}
                        </div>

                        {/* Tahun Akademik */}
                        <div className="relative group">
                            <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 mb-1 block opacity-50">Tahun Akademik <span className="text-rose-500">*</span></label>
                            <RichSelect
                                value={form.academic_year_id}
                                onChange={val => setField('academic_year_id', val)}
                                options={academicYearsList.map(y => ({ id: y.id, name: y.label }))}
                                placeholder="Pilih Tahun Akademik"
                                icon={faCalendarAlt}
                                status={getStatus('academic_year_id', true)}
                            />
                        </div>
                    </div>
                </div>

                {formError && (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 animate-in fade-in">
                        <FontAwesomeIcon icon={faTriangleExclamation} className="text-red-500 shrink-0" />
                        <p className="text-xs font-bold text-red-600">{formError}</p>
                    </div>
                )}
            </form>
        </Modal>
    )
})

export default ClassFormModal