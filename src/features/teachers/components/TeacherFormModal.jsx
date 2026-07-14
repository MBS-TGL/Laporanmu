import React, { useState, useEffect, useCallback, memo, useRef } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faSpinner, faTriangleExclamation, faUser, faIdCard,
    faBook, faPhone, faEnvelope, faCalendarAlt, faMapMarkerAlt,
    faInfoCircle, faIdBadge, faGraduationCap, faCheckCircle,
    faSave, faPlus, faEdit, faCamera, faFingerprint,
    faBriefcase
} from '@fortawesome/free-solid-svg-icons'
import { Modal, RichSelect } from '@shared/components'

const DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']

const EMPTY_FORM = {
    name: '', nbm: '', subject: '', gender: 'L', phone: '', email: '',
    status: 'active', join_date: '', address: '', notes: '', class_id: '', type: 'guru',
    avatar_url: '', work_days: DAYS, fingerspot_name: '',
    nik: '', nip: '', nuptk: '', birth_place: '', birth_date: '',
    employment_status: 'GTY', teaching_hours: 0,
    last_education: '', major: '', graduation_year: ''
}

const TeacherFormModal = memo(function TeacherFormModal({
    isOpen, onClose, selectedItem, classesList, subjectsList,
    onSubmit, submitting, onPhotoUpload, uploadingPhoto
}) {
    const [form, setForm] = useState(EMPTY_FORM)
    const [formError, setFormError] = useState('')
    const [touched, setTouched] = useState({})
    const [attemptedSubmit, setAttemptedSubmit] = useState(false)
    const [avatarPreview, setAvatarPreview] = useState(null)
    const fileInputRef = useRef(null)

    useEffect(() => {
        if (!isOpen) return
        if (selectedItem) {
            setForm({
                name: selectedItem.name || '',
                nbm: selectedItem.nbm || '',
                subject: selectedItem.subject || '',
                gender: selectedItem.gender || 'L',
                phone: selectedItem.phone || '',
                email: selectedItem.email || '',
                status: selectedItem.status || 'active',
                join_date: selectedItem.join_date || '',
                address: selectedItem.address || '',
                notes: selectedItem.notes || '',
                class_id: selectedItem.class_id || '',
                type: selectedItem.type || 'guru',
                avatar_url: selectedItem.avatar_url || selectedItem.photo_url || '',
                work_days: selectedItem.work_days || DAYS,
                fingerspot_name: selectedItem.fingerspot_name || '',
                nik: selectedItem.nik || '',
                nip: selectedItem.nip || '',
                nuptk: selectedItem.nuptk || '',
                birth_place: selectedItem.birth_place || '',
                birth_date: selectedItem.birth_date || '',
                employment_status: selectedItem.employment_status || 'GTY',
                teaching_hours: selectedItem.teaching_hours || 0,
                last_education: selectedItem.last_education || '',
                major: selectedItem.major || '',
                graduation_year: selectedItem.graduation_year || '',
            })
            setAvatarPreview(selectedItem.avatar_url || selectedItem.photo_url || null)
        } else {
            setForm(EMPTY_FORM)
            setAvatarPreview(null)
        }
        setFormError('')
        setTouched({})
        setAttemptedSubmit(false)
    }, [isOpen, selectedItem])

    const setField = useCallback((key, value) => {
        setForm(prev => ({ ...prev, [key]: value }))
    }, [])

    const setFieldTouched = (field) => setTouched(prev => ({ ...prev, [field]: true }))

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Local preview
        const reader = new FileReader()
        reader.onloadend = () => setAvatarPreview(reader.result)
        reader.readAsDataURL(file)

        // Upload
        if (onPhotoUpload) {
            const url = await onPhotoUpload(file)
            if (url) {
                setField('avatar_url', url)
            }
        }
    }

    const toggleWorkDay = (day) => {
        setForm(prev => {
            const current = prev.work_days || []
            const next = current.includes(day)
                ? current.filter(d => d !== day)
                : [...current, day]
            return { ...prev, work_days: next }
        })
    }

    // Validation status helper
    const getStatus = (field, isRequired = false) => {
        const value = form[field]
        const isTouched = touched[field] || attemptedSubmit

        if (field === 'phone' && value && (value.length < 10 || !value.startsWith('08'))) return 'warning'
        if (field === 'email' && value && !value.includes('@')) return 'warning'

        if (isRequired) {
            if (isTouched && (!value || (typeof value === 'string' && !value.trim()))) return 'error'
            if (value && (typeof value === 'string' ? value.trim() : true)) return 'success'
        } else {
            if (value && (typeof value === 'string' ? value.trim() : true)) return 'success'
        }
        return 'normal'
    }

    // Progress calculation
    const overallProgress = (() => {
        const fields = ['name', 'nbm', 'subject', 'gender', 'phone', 'email', 'status', 'join_date', 'address', 'class_id', 'type', 'nik', 'last_education']
        const filled = fields.filter(f => form[f]).length
        return Math.round((filled / fields.length) * 100)
    })()

    const handleSubmit = async (e) => {
        e?.preventDefault()
        setAttemptedSubmit(true)
        const name = (form.name || '').trim()
        if (!name) { setFormError('Nama lengkap wajib diisi.'); return }
        setFormError('')
        const payload = {
            name,
            nbm: (form.nbm || '').trim() || null,
            subject: (form.subject || '').trim() || null,
            gender: form.gender || null,
            phone: (form.phone || '').trim() || null,
            email: (form.email || '').trim() || null,
            status: form.status || 'active',
            join_date: form.join_date || null,
            address: (form.address || '').trim() || null,
            notes: (form.notes || '').trim() || null,
            class_id: form.class_id || null,
            type: form.type || 'guru',
            avatar_url: form.avatar_url || null,
            photo_url: form.avatar_url || null,
            work_days: (form.work_days && form.work_days.length > 0)
                ? [...new Set(form.work_days)].sort((a, b) => DAYS.indexOf(a) - DAYS.indexOf(b))
                : DAYS,
            fingerspot_name: (form.fingerspot_name || '').trim() || null,
            nik: (form.nik || '').trim() || null,
            nip: (form.nip || '').trim() || null,
            nuptk: (form.nuptk || '').trim() || null,
            birth_place: (form.birth_place || '').trim() || null,
            birth_date: form.birth_date || null,
            employment_status: form.employment_status || 'GTY',
            teaching_hours: Number(form.teaching_hours) || 0,
            last_education: form.last_education || null,
            major: (form.major || '').trim() || null,
            graduation_year: Number(form.graduation_year) || null,
        }
        const result = await onSubmit(payload)
        if (result?.error) {
            if (result.code === '23505') setFormError('NBM sudah terdaftar.')
            else setFormError(result.message || 'Gagal menyimpan data.')
        }
    }

    if (!isOpen) return null

    const inputCls = (field, required = false) => {
        const s = getStatus(field, required)
        return `w-full px-4 h-11 rounded-xl border bg-[var(--color-surface)] outline-none transition-all text-[13px] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] placeholder:opacity-40 ${s === 'error' ? 'border-rose-500/50 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 bg-rose-50/5' :
            s === 'warning' ? 'border-amber-500 bg-amber-50/10 focus:border-amber-500 focus:ring-1 focus:ring-amber-500' :
                s === 'success' ? 'border-emerald-500/30 bg-emerald-50/5 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500' :
                    'border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]'
            }`
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={selectedItem ? `Edit Data ${form.type === 'karyawan' ? 'Karyawan' : 'Guru'}` : `Tambah ${form.type === 'karyawan' ? 'Karyawan' : 'Guru'} Baru`}
            description={
                <div className="flex items-center gap-2">
                    <div className="h-1.5 w-24 bg-[var(--color-border)] rounded-full overflow-hidden shrink-0">
                        <div
                            className="h-full bg-emerald-500 transition-all duration-500"
                            style={{ width: `${overallProgress}%` }}
                        />
                    </div>
                    <span className="text-[10px] font-black text-emerald-600">{overallProgress}% Lengkap</span>
                </div>
            }
            icon={selectedItem ? faEdit : faPlus}
            iconBg={selectedItem ? 'bg-indigo-500/10' : 'bg-emerald-500/10'}
            iconColor={selectedItem ? 'text-indigo-500' : 'text-emerald-600'}
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
                        form="teacher-form-modal"
                        disabled={submitting || uploadingPhoto}
                        className="h-10 px-6 sm:px-8 rounded-xl bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-wider hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 disabled:opacity-50 disabled:cursor-not-allowed border border-white/10 shrink-0"
                    >
                        {submitting ? (
                            <>
                                <FontAwesomeIcon icon={faSpinner} className="fa-spin" />
                                <span>Menyimpan...</span>
                            </>
                        ) : uploadingPhoto ? (
                            <>
                                <FontAwesomeIcon icon={faSpinner} className="fa-spin" />
                                <span className="hidden sm:inline">Mengunggah Foto...</span>
                                <span className="sm:hidden">Mengunggah...</span>
                            </>
                        ) : (
                            <>
                                <FontAwesomeIcon icon={faSave} className="text-xs opacity-80 shrink-0" />
                                <span className="truncate hidden sm:inline">{selectedItem ? 'Simpan Perubahan' : 'Simpan Data'}</span>
                                <span className="truncate sm:hidden">Simpan</span>
                            </>
                        )}
                    </button>
                </div>
            }
        >
            <form id="teacher-form-modal" onSubmit={handleSubmit} className="space-y-6">
                {/* ── Section: Identitas ── */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2.5 pt-2">
                        <div className="w-1 h-4 bg-indigo-500 rounded-full" />
                        <FontAwesomeIcon icon={faIdBadge} className="text-indigo-500 text-[10px] opacity-70" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text)]">Identitas</span>
                        <div className="h-[1px] flex-1 bg-gradient-to-r from-[var(--color-border)] to-transparent opacity-40" />
                    </div>

                    <div className="flex flex-col sm:flex-row gap-5">
                        <div className="shrink-0 flex flex-col items-center gap-2 pt-1">
                            <div className="relative group shrink-0 mx-auto sm:mx-0">
                                <div
                                    className={`w-[88px] h-[88px] rounded-2xl bg-[var(--color-surface-alt)] border flex items-center justify-center overflow-hidden transition-all cursor-pointer ${form.avatar_url || avatarPreview ? 'border-emerald-500/50' : 'border-[var(--color-border)] hover:border-[var(--color-primary)]'}`}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    {(avatarPreview || form.avatar_url) ? (
                                        <img src={avatarPreview || form.avatar_url} alt="Preview" className="w-full h-full object-cover animate-in fade-in zoom-in duration-300" />
                                    ) : (
                                        <div className="flex flex-col items-center justify-center gap-1.5 opacity-40 group-hover:opacity-100 group-hover:text-[var(--color-primary)] transition-all">
                                            <FontAwesomeIcon icon={faCamera} className="text-xl" />
                                            <span className="text-[8px] font-bold uppercase tracking-wider">Foto</span>
                                        </div>
                                    )}
                                    {uploadingPhoto && (
                                        <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center">
                                            <FontAwesomeIcon icon={faSpinner} className="fa-spin text-white" />
                                        </div>
                                    )}
                                </div>
                            </div>
                            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                        </div>

                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-10 gap-x-4 gap-y-3">
                            <div className="sm:col-span-10 relative group">
                                <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 mb-1 block opacity-50">Nama Lengkap <span className="text-rose-500">*</span></label>
                                <div className="relative">
                                    <input type="text" value={form.name} onChange={e => setField('name', e.target.value)} onBlur={() => setFieldTouched('name')} placeholder="Nama lengkap dengan gelar..." className={inputCls('name', true)} />
                                </div>
                            </div>

                            {/* Row: NIK - NIP - NUPTK (40% - 30% - 30%) */}
                            <div className="sm:col-span-4 relative group">
                                <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 mb-1 block opacity-50">NIK</label>
                                <input type="text" value={form.nik} onChange={e => setField('nik', e.target.value)} placeholder="16 digit angka" className={inputCls('nik')} />
                            </div>
                            <div className="sm:col-span-3 relative group">
                                <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 mb-1 block opacity-50">NIP</label>
                                <input type="text" value={form.nip} onChange={e => setField('nip', e.target.value)} placeholder="NIP" className={inputCls('nip')} />
                            </div>
                            <div className="sm:col-span-3 relative group">
                                <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 mb-1 block opacity-50">NUPTK</label>
                                <input type="text" value={form.nuptk} onChange={e => setField('nuptk', e.target.value)} placeholder="NUPTK" className={inputCls('nuptk')} />
                            </div>

                            {/* Row: NBM - Tempat Lahir - Tgl Lahir (40% - 30% - 30%) */}
                            <div className="sm:col-span-4 relative group">
                                <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 mb-1 block opacity-50">NBM</label>
                                <input type="text" value={form.nbm} onChange={e => setField('nbm', e.target.value)} placeholder="NBM" className={inputCls('nbm')} />
                            </div>
                            <div className="sm:col-span-3 relative group">
                                <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 mb-1 block opacity-50">Tempat Lahir</label>
                                <input type="text" value={form.birth_place} onChange={e => setField('birth_place', e.target.value)} placeholder="Kota Lahir" className={inputCls('birth_place')} />
                            </div>
                            <div className="sm:col-span-3 relative group">
                                <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 mb-1 block opacity-50">Tanggal Lahir</label>
                                <div className={`relative h-11 w-full rounded-xl border transition-all bg-[var(--color-surface)] focus-within:ring-1
                                    ${getStatus('birth_date') === 'error' ? 'border-rose-500/50 focus-within:border-rose-500 focus-within:ring-rose-500 bg-rose-50/5' :
                                    getStatus('birth_date') === 'warning' ? 'border-amber-500 bg-amber-50/10 focus-within:border-amber-500 focus-within:ring-amber-500' :
                                    getStatus('birth_date') === 'success' ? 'border-emerald-500/30 bg-emerald-50/5 focus-within:border-emerald-500 focus-within:ring-emerald-500' :
                                    'border-[var(--color-border)] focus-within:border-[var(--color-primary)] focus-within:ring-[var(--color-primary)]'
                                    }`}>
                                    <div className={`absolute inset-0 flex items-center px-4 pointer-events-none text-[13px] ${form.birth_date ? 'text-[var(--color-text)]' : 'text-[var(--color-text-muted)] opacity-40'}`}>
                                        {form.birth_date ? (() => {
                                            const parts = form.birth_date.split('-')
                                            if (parts.length === 3) {
                                                const [y, m, d] = parts
                                                return `${d}/${m}/${y}`
                                            }
                                            return form.birth_date
                                        })() : 'dd/mm/yyyy'}
                                    </div>
                                    <input
                                        type="date"
                                        value={form.birth_date}
                                        onChange={e => setField('birth_date', e.target.value)}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer outline-none bg-transparent date-input-hidden z-10"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Section: Kepegawaian ── */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2.5 pt-2">
                        <div className="w-1 h-4 bg-emerald-500 rounded-full" />
                        <FontAwesomeIcon icon={faBriefcase} className="text-emerald-500 text-[10px] opacity-70" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text)]">Kepegawaian</span>
                        <div className="h-[1px] flex-1 bg-gradient-to-r from-[var(--color-border)] to-transparent opacity-40" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="relative group">
                            <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 mb-1 block opacity-50">Status Kepegawaian</label>
                            <RichSelect
                                value={form.employment_status}
                                onChange={val => setField('employment_status', val)}
                                options={[
                                    { id: 'GTY', name: 'Tetap Yayasan (GTY/KTY)' },
                                    { id: 'GTT', name: 'Tidak Tetap (GTT/KTT)' },
                                    { id: 'Honorer', name: 'Honorer' },
                                    { id: 'PNS', name: 'PNS DPK' },
                                    { id: 'ASNP3K', name: 'ASN P3K' },
                                ]}
                                placeholder="Pilih status..."
                                icon={faIdBadge}
                            />
                        </div>
                        <div className="relative group">
                            <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 mb-1 block opacity-50">Mata Pelajaran Utama</label>
                            <RichSelect
                                value={form.subject}
                                onChange={val => setField('subject', val)}
                                options={(subjectsList || []).map(s => ({ id: s, name: s }))}
                                placeholder="e.g. Matematika"
                                icon={faBook}
                                searchable
                                allowCustom
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="relative group">
                                <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 mb-1 block opacity-50">Tgl Bergabung</label>
                                <div className={`relative h-11 w-full rounded-xl border transition-all bg-[var(--color-surface)] focus-within:ring-1
                                    ${getStatus('join_date') === 'error' ? 'border-rose-500/50 focus-within:border-rose-500 focus-within:ring-rose-500 bg-rose-50/5' :
                                    getStatus('join_date') === 'warning' ? 'border-amber-500 bg-amber-50/10 focus-within:border-amber-500 focus-within:ring-amber-500' :
                                    getStatus('join_date') === 'success' ? 'border-emerald-500/30 bg-emerald-50/5 focus-within:border-emerald-500 focus-within:ring-emerald-500' :
                                    'border-[var(--color-border)] focus-within:border-[var(--color-primary)] focus-within:ring-[var(--color-primary)]'
                                    }`}>
                                    <div className={`absolute inset-0 flex items-center px-4 pointer-events-none text-[13px] ${form.join_date ? 'text-[var(--color-text)]' : 'text-[var(--color-text-muted)] opacity-40'}`}>
                                        {form.join_date ? (() => {
                                            const parts = form.join_date.split('-')
                                            if (parts.length === 3) {
                                                const [y, m, d] = parts
                                                return `${d}/${m}/${y}`
                                            }
                                            return form.join_date
                                        })() : 'dd/mm/yyyy'}
                                    </div>
                                    <input
                                        type="date"
                                        value={form.join_date}
                                        onChange={e => setField('join_date', e.target.value)}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer outline-none bg-transparent date-input-hidden z-10"
                                    />
                                </div>
                            </div>
                            <div className="relative group">
                                <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 mb-1 block opacity-50">Jam Mengajar</label>
                                <input type="number" value={form.teaching_hours} onChange={e => setField('teaching_hours', e.target.value)} placeholder="0 Jam / Minggu" className={inputCls('teaching_hours')} />
                            </div>
                        </div>
                        <div className="relative group">
                            <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 mb-1 block opacity-50">Status Aktif</label>
                            <div className="flex p-1 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-xl h-11">
                                {[
                                    { key: 'active', label: 'Aktif', activeCls: 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' },
                                    { key: 'inactive', label: 'Nonaktif', activeCls: 'bg-slate-700 text-white shadow-lg shadow-slate-700/20' },
                                ].map((opt) => (
                                    <button key={opt.key} type="button" onClick={() => setField('status', opt.key)} className={`flex-1 rounded-lg text-[10px] font-bold transition-all duration-200 ${form.status === opt.key ? opt.activeCls : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}>{opt.label}</button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Section: Pendidikan Terakhir ── */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2.5 pt-2">
                        <div className="w-1 h-4 bg-blue-500 rounded-full" />
                        <FontAwesomeIcon icon={faGraduationCap} className="text-blue-500 text-[10px] opacity-70" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text)]">Pendidikan Terakhir</span>
                        <div className="h-[1px] flex-1 bg-gradient-to-r from-[var(--color-border)] to-transparent opacity-40" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="relative group">
                            <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 mb-1 block opacity-50">Tingkat Pendidikan</label>
                            <RichSelect
                                value={form.last_education}
                                onChange={val => setField('last_education', val)}
                                options={[
                                    { id: 'SMA', name: 'SMA/Sederajat' },
                                    { id: 'D1', name: 'D1' },
                                    { id: 'D2', name: 'D2' },
                                    { id: 'D3', name: 'D3' },
                                    { id: 'S1', name: 'S1' },
                                    { id: 'S2', name: 'S2' },
                                    { id: 'S3', name: 'S3' },
                                ]}
                                placeholder="Pilih tingkat..."
                                icon={faGraduationCap}
                            />
                        </div>
                        <div className="relative group">
                            <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 mb-1 block opacity-50">Jurusan / Program Studi</label>
                            <input type="text" value={form.major} onChange={e => setField('major', e.target.value)} placeholder="e.g. Pendidikan Bahasa Inggris" className={inputCls('major')} />
                        </div>
                        <div className="relative group">
                            <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 mb-1 block opacity-50">Tahun Lulus</label>
                            <input type="number" value={form.graduation_year} onChange={e => setField('graduation_year', e.target.value)} placeholder="Tahun" className={inputCls('graduation_year')} />
                        </div>
                        <div className="relative group">
                            <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 mb-1 block opacity-50">Jenis Kelamin</label>
                            <div className="flex p-1 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-xl h-11">
                                {[
                                    { key: 'L', label: 'Laki-laki', activeCls: 'bg-[var(--color-primary)] text-white shadow-lg shadow-[var(--color-primary)]/20' },
                                    { key: 'P', label: 'Perempuan', activeCls: 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' }
                                ].map(o => (
                                    <button key={o.key} type="button" onClick={() => setField('gender', o.key)} className={`flex-1 rounded-lg text-[10px] font-bold transition-all duration-200 ${form.gender === o.key ? o.activeCls : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}>{o.label}</button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Section: Kontak & Lokasi ── */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2.5 pt-2">
                        <div className="w-1 h-4 bg-amber-500 rounded-full" />
                        <FontAwesomeIcon icon={faEnvelope} className="text-amber-500 text-[10px] opacity-70" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text)]">Kontak & Lokasi</span>
                        <div className="h-[1px] flex-1 bg-gradient-to-r from-[var(--color-border)] to-transparent opacity-40" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="relative group">
                            <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 mb-1 block opacity-50">No. Handphone</label>
                            <div className="relative">
                                <input type="tel" value={form.phone} onChange={e => setField('phone', e.target.value)} placeholder="08xxxxxxxxxx" className={inputCls('phone')} />
                            </div>
                        </div>
                        <div className="relative group">
                            <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 mb-1 block opacity-50">Email</label>
                            <div className="relative">
                                <input type="email" value={form.email} onChange={e => setField('email', e.target.value)} placeholder="nama@guru.com" className={inputCls('email')} />
                            </div>
                        </div>
                        <div className="sm:col-span-2 relative group">
                            <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 mb-1 block opacity-50">Alamat Lengkap</label>
                            <textarea value={form.address} onChange={e => setField('address', e.target.value)} placeholder="Alamat domisili saat ini..." rows={2} className="w-full px-3 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] focus:border-[var(--color-primary)] outline-none text-[13px] resize-none" />
                        </div>
                    </div>
                </div>

                {/* ── Section: Presensi & Lainnya ── */}
                <div className="space-y-4 pb-4">
                    <div className="flex items-center gap-2.5 pt-2">
                        <div className="w-1 h-4 bg-slate-500 rounded-full" />
                        <FontAwesomeIcon icon={faFingerprint} className="text-slate-500 text-[10px] opacity-70" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text)]">Presensi & Lainnya</span>
                        <div className="h-[1px] flex-1 bg-gradient-to-r from-[var(--color-border)] to-transparent opacity-40" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="relative group">
                            <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 mb-1 block opacity-50">Nama di Fingerspot</label>
                            <div className="relative">
                                <input type="text" value={form.fingerspot_name} onChange={e => setField('fingerspot_name', e.target.value)} placeholder="Sesuai mesin absensi" className={inputCls('fingerspot_name')} />
                            </div>
                        </div>
                        <div className="relative group">
                            <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 mb-1 block opacity-50">Tipe Tugas</label>
                            <div className="flex p-1 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-xl h-11">
                                {[
                                    { key: 'guru', label: 'Guru', activeCls: 'bg-[var(--color-primary)] text-white shadow-lg shadow-[var(--color-primary)]/20' },
                                    { key: 'karyawan', label: 'Karyawan', activeCls: 'bg-slate-700 text-white shadow-lg shadow-slate-700/20' }
                                ].map(o => (
                                    <button key={o.key} type="button" onClick={() => setField('type', o.key)} className={`flex-1 rounded-lg text-[10px] font-bold transition-all duration-200 ${form.type === o.key ? o.activeCls : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}>{o.label}</button>
                                ))}
                            </div>
                        </div>
                        <div className="sm:col-span-2 relative group">
                            <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 mb-1 block opacity-50">Hari Kerja Aktif</label>
                            <div className="flex flex-wrap gap-2">
                                {DAYS.map(day => (
                                    <button key={day} type="button" onClick={() => toggleWorkDay(day)} className={`px-4 py-2 rounded-xl text-[10px] font-bold transition-all duration-200 border ${form.work_days.includes(day) ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-lg shadow-[var(--color-primary)]/20' : 'bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] border-[var(--color-border)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]'}`}>{day}</button>
                                ))}
                            </div>
                        </div>
                        <div className="sm:col-span-2 relative group">
                            <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 mb-1 block opacity-50">Catatan Internal</label>
                            <textarea value={form.notes} onChange={e => setField('notes', e.target.value)} placeholder="Informasi tambahan..." rows={2} className="w-full px-3 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] focus:border-[var(--color-primary)] outline-none text-[13px] resize-none" />
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

export default TeacherFormModal