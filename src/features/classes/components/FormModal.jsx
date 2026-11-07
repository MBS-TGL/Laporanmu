import React, { memo } from 'react'
import { Bed, Briefcase, Building, Calendar, CircleCheck, IdCard, LoaderCircle, Plus, School, SquarePen, TriangleAlert } from 'lucide-react'
import { MarsIcon, Modal, RichSelect, VenusIcon } from '@shared/components'
import { useFormDraft } from '@shared/hooks/useFormDraft'

const FormModal = memo(function FormModal({
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

    // Draft + validasi UX (touched/status/progress) dari primitif shared
    const draft = useFormDraft({
        isOpen,
        selectedItem,
        buildDraft: (item) => {
            if (item) {
                const teacherIds = teachersList.map(t => t.id)
                const validTeacherId = teacherIds.includes(item.homeroom_teacher_id)
                    ? item.homeroom_teacher_id
                    : ''
                return {
                    name: item.name || '',
                    level: item.grade || '7',
                    program: item.major?.includes('Reguler') ? 'Reguler' : 'Boarding',
                    gender_type: item.major?.includes('Putri') ? 'Putri' : 'Putra',
                    homeroom_teacher_id: validTeacherId,
                    academic_year_id: item.academic_year_id || academicYearsList[0]?.id || ''
                }
            }
            return {
                name: '',
                level: '7',
                program: 'Boarding',
                gender_type: 'Putra',
                homeroom_teacher_id: '',
                academic_year_id: academicYearsList[0]?.id || ''
            }
        }
    })
    const { form, setField, markTouched: setFieldTouched, getStatus, overallProgress, formError, setFormError, beginSubmit, fail } = draft

    const handleSubmit = async (e) => {
        e?.preventDefault()
        beginSubmit()
        const name = (form.name || '').trim()
        if (!name) { fail('Nama kelas wajib diisi.'); return }

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

    if (!isOpen || !form) return null
    const hasTeachers = (teachersList?.length || 0) > 0
    const progress = overallProgress(['name', 'homeroom_teacher_id', 'academic_year_id'])

    const inputCls = (field, required = false) => {
        const s = getStatus(field, required)
        return `w-full px-4 h-11 rounded-xl border bg-[var(--color-surface)] outline-none transition-all text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] placeholder:opacity-40 ${
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
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <span className="text-xs font-bold text-[var(--color-primary)]">{progress}% Lengkap</span>
                </div>
            }
            icon={selectedItem ? SquarePen : Plus}
            iconBg="bg-[var(--color-primary)]/10"
            iconColor="text-[var(--color-primary)]"
            size="lg"
            mobileVariant="bottom-sheet"
            footer={
                <div className="flex items-center w-full gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="h-10 px-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] text-xs font-bold uppercase tracking-wide transition-all shrink-0 flex items-center justify-center"
                    >
                        Batal
                    </button>
                    <div className="flex-1" />
                    <button
                        type="submit"
                        form="class-form-modal"
                        disabled={submitting}
                        className="h-10 px-6 sm:px-8 rounded-xl bg-[var(--color-primary)] text-white text-xs font-bold uppercase tracking-wider hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed border border-white/10 shrink-0"
                    >
                        {submitting ? (
                            <>
                                <LoaderCircle className="w-4 h-4 animate-spin" />
                                <span>Menyimpan...</span>
                            </>
                        ) : (
                            <>
                                <CircleCheck className="w-4 h-4 opacity-80 shrink-0" />
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
                        <IdCard className="w-4 h-4 text-[var(--color-primary)] opacity-70" />
                        <span className="text-xs font-bold uppercase tracking-wide text-[var(--color-text)]">Identitas Kelas</span>
                        <div className="h-[1px] flex-1 bg-gradient-to-r from-[var(--color-border)] to-transparent opacity-40" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Nama Kelas */}
                        <div className="relative group">
                            <label className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 mb-1 block opacity-50">Nama Kelas <span className="text-rose-500">*</span></label>
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
                            <p className="mt-1 ml-1 text-xs font-bold text-[var(--color-text-muted)] opacity-60">
                                Gunakan format singkat (e.g. 7A, 10 MIPA 1).
                            </p>
                        </div>

                        {/* Gender Segment */}
                        <div className="relative group">
                            <label className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 mb-1 block opacity-50">Segmen Gender</label>
                            <div className="flex p-1 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-xl h-11">
                                {GENDERS.map(g => (
                                    <button
                                        key={g}
                                        type="button"
                                        onClick={() => setField('gender_type', g)}
                                        className={`flex-1 rounded-lg text-xs font-bold tracking-wider transition-all duration-200 flex items-center justify-center gap-2 ${form.gender_type === g
                                            ? 'bg-[var(--color-primary)] text-white shadow-md'
                                            : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)]'}`}
                                    >
                                        {g === 'Putra' ? <MarsIcon className="w-4 h-4" /> : <VenusIcon className="w-4 h-4" />}
                                        {g}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Tingkat & Program */}
                        <div className="relative group">
                            <label className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 mb-1 block opacity-50">Tingkat / Grade</label>
                            <RichSelect
                                value={form.level}
                                onChange={val => setField('level', val)}
                                options={LEVELS.map(l => ({ id: l, name: `Kelas ${l}` }))}
                                placeholder="Pilih Tingkat"
                                icon={School}
                                status={getStatus('level')}
                            />
                        </div>

                        <div className="relative group">
                            <label className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 mb-1 block opacity-50">Program</label>
                            <div className="flex p-1 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-xl h-11">
                                {PROGRAMS.map(p => (
                                    <button
                                        key={p}
                                        type="button"
                                        onClick={() => setField('program', p)}
                                        className={`flex-1 rounded-lg text-xs font-bold tracking-wider transition-all duration-200 flex items-center justify-center gap-2 ${form.program === p
                                            ? 'bg-[var(--color-primary)] text-white shadow-md'
                                            : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)]'}`}
                                    >
                                        {p === 'Boarding' ? <Bed className="w-4 h-4" /> : <Building className="w-4 h-4" />}
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
                        <Briefcase className="w-4 h-4 text-[var(--color-primary)] opacity-70" />
                        <span className="text-xs font-bold uppercase tracking-wide text-[var(--color-text)]">Penanggung Jawab & Periode</span>
                        <div className="h-[1px] flex-1 bg-gradient-to-r from-[var(--color-border)] to-transparent opacity-40" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Wali Kelas */}
                        <div className="relative group">
                            <label className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 mb-1 block opacity-50">Wali Kelas (Homeroom Teacher)</label>
                            <RichSelect
                                value={form.homeroom_teacher_id || ''}
                                onChange={val => setField('homeroom_teacher_id', val)}
                                options={teachersList.map(t => ({ id: t.id, name: t.name }))}
                                extraOption={{ id: '', name: '— Tanpa Wali Kelas —' }}
                                placeholder={hasTeachers ? 'Pilih Wali Kelas' : 'Tidak ada data guru'}
                                icon={Briefcase}
                                searchable
                                disabled={!hasTeachers}
                                status={getStatus('homeroom_teacher_id')}
                            />
                            {!hasTeachers && (
                                <p className="mt-1.5 ml-1 text-xs font-bold text-amber-600 dark:text-amber-500 flex items-center gap-2">
                                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-lg bg-amber-500/10 border border-amber-500/20">!</span>
                                    Tidak ada data guru. Tambahkan guru dulu di menu Master → Guru.
                                </p>
                            )}
                        </div>

                        {/* Tahun Akademik */}
                        <div className="relative group">
                            <label className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 mb-1 block opacity-50">Tahun Akademik <span className="text-rose-500">*</span></label>
                            <RichSelect
                                value={form.academic_year_id}
                                onChange={val => setField('academic_year_id', val)}
                                options={academicYearsList.map(y => ({ id: y.id, name: y.label }))}
                                placeholder="Pilih Tahun Akademik"
                                icon={Calendar}
                                status={getStatus('academic_year_id', true)}
                            />
                        </div>
                    </div>
                </div>

                {formError && (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 animate-in fade-in">
                        <TriangleAlert className="w-4 h-4 text-red-500 shrink-0" />
                        <p className="text-xs font-bold text-red-600">{formError}</p>
                    </div>
                )}
            </form>
        </Modal>
    )
})

export default FormModal