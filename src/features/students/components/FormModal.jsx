import React, { useState, useRef, useEffect, useCallback, memo } from 'react'
import { createPortal } from 'react-dom'
import { ArrowLeft, ArrowRight, Briefcase, Camera, ChevronDown, CircleCheck, Coins, DoorOpen, Eye, FileText, Footprints, GraduationCap, History, House, IdCard, Landmark, LoaderCircle, MapPin, Pen, Phone, Plus, Save, School, SquarePen, Trash2, TriangleAlert, User, Users, Zap } from 'lucide-react'
import { MarsIcon, VenusIcon, WhatsAppIcon } from '@shared/components'
import { supabase } from '@lib/supabase'
import Modal from '@shared/components/Modal'
import RichSelect from '@shared/components/RichSelect'
import { LIST_KAMAR } from '@utils/reports/raportConstants'
import {
    EDUCATION_LEVELS,
    OCCUPATION_LIST,
    INCOME_RANGES,
    SPECIAL_NEEDS,
    LIVING_WITH,
    TRANSPORT_MODES
} from '@features/students/utils/studentsConstants'

const FormModal = memo(function FormModal({

    isOpen, onClose, selectedStudent, classesList,
    onSubmit, submitting, onPhotoUpload, uploadingPhoto,
}) {
    const INIT = {
        name: '', gender: 'L', class_id: '', phone: '', photo_url: '',
        nisn: '',
        guardian_name: '',
        status: 'aktif', tags: [], kamar: '',
        // Father
        father_name: '', father_nik: '', father_education: '', father_occupation: '', father_income: '', father_alive: true,
        // Mother
        mother_name: '', mother_nik: '', mother_education: '', mother_occupation: '', mother_income: '', mother_alive: true,
        // Address Detail
        address_rt: '', address_rw: '', address_village: '', address_district: '', address_city: '', address_province: '', address_postal_code: '',
        living_with: 'Orang Tua',
        // Documents & EMIS
        no_kk: '', no_akta: '', special_needs: 'Tidak Ada', hobby: '', aspiration: '', transport: 'Jalan Kaki'
    }

    const STATUS_OPTIONS = [
        { key: 'aktif', label: 'Aktif', activeCls: 'bg-success' },
        { key: 'lulus', label: 'Lulus', activeCls: 'bg-blue-500' },
        { key: 'keluar', label: 'Keluar', activeCls: 'bg-slate-700' },
    ]

    const [form, setForm] = useState(INIT)
    const [metadataFields, setMetadataFields] = useState([]) // [{key, value}]
    const [touched, setTouched] = useState({})
    const [attemptedSubmit, setAttemptedSubmit] = useState(false)
    const [duplicateWarning, setDuplicateWarning] = useState(null)
    const [showOptional, setShowOptional] = useState(false)
    const [showMetadata, setShowMetadata] = useState(false)
    const [avatarPreview, setAvatarPreview] = useState(null)

    // Wizard & Logic States
    const [currentStep, setCurrentStep] = useState(1)
    const [isQuickMode, setIsQuickMode] = useState(false)
    const [hasDraft, setHasDraft] = useState(false)

    const [avatarFile, setAvatarFile] = useState(null)
    const [photoError, setPhotoError] = useState(false)
    const dupTimerRef = useRef(null)
    const photoRef = useRef(null)

    const DRAFT_KEY = selectedStudent ? `student_draft_edit_${selectedStudent.id}` : 'student_draft_new'

    // Load Draft
    useEffect(() => {
        if (isOpen) {
            const saved = localStorage.getItem(DRAFT_KEY)
            if (saved && !selectedStudent) { // Only suggest for new students to avoid overwriting existing data unexpectedly
                setHasDraft(true)
            }
        }
    }, [isOpen, DRAFT_KEY, selectedStudent])

    // Save Draft (Debounced 500ms to eliminate synchronous I/O blocking during fast typing)
    useEffect(() => {
        if (!isOpen || submitting || !form.name) return
        const timer = setTimeout(() => {
            try {
                localStorage.setItem(DRAFT_KEY, JSON.stringify({ form, metadataFields }))
            } catch (e) { console.error('Failed to save draft', e) }
        }, 500)
        return () => clearTimeout(timer)
    }, [form, metadataFields, isOpen, submitting, DRAFT_KEY])

    const loadDraft = () => {
        const saved = localStorage.getItem(DRAFT_KEY)
        if (saved) {
            const { form: savedForm, metadataFields: savedMeta } = JSON.parse(saved)
            setForm(savedForm)
            setMetadataFields(savedMeta)
            setHasDraft(false)
            addToast('Draft berhasil dimuat', 'success')
        }
    }

    const handleSafeClose = useCallback(() => {
        onClose()
    }, [onClose])

    const clearDraft = useCallback(() => {
        localStorage.removeItem(DRAFT_KEY)
        setHasDraft(false)
    }, [DRAFT_KEY])

    const calculateStepProgress = (step) => {
        if (step === 1) {
            const fields = ['name', 'class_id', 'gender', 'nisn']
            const filled = fields.filter(f => form[f]).length
            return Math.round((filled / fields.length) * 100)
        }
        if (step === 2) {
            const fields = ['father_name', 'mother_name', 'phone']
            const filled = fields.filter(f => form[f]).length
            return Math.round((filled / fields.length) * 100)
        }
        if (step === 3) {
            const fields = ['address_city', 'no_kk', 'hobby']
            const filled = fields.filter(f => form[f]).length
            return Math.round((filled / fields.length) * 100)
        }
        return 0
    }

    const overallProgress = Math.round((calculateStepProgress(1) + calculateStepProgress(2) + calculateStepProgress(3)) / 3)

    // Helper to determine validation status
    const getStatus = (field, isRequired = false) => {
        const value = form[field]
        const isTouched = touched[field] || attemptedSubmit

        if (field === 'nisn' && value && value.length !== 10) return 'warning'
        if ((field === 'father_nik' || field === 'mother_nik') && value && value.length !== 16) return 'warning'
        if (field === 'phone' && value && (value.length < 10 || !value.startsWith('08'))) return 'warning'

        if (isRequired) {
            if (isTouched && (!value || (typeof value === 'string' && !value.trim()))) return 'error'
            if (value && (typeof value === 'string' ? value.trim() : true)) return 'success'
        } else {
            if (value && (typeof value === 'string' ? value.trim() : true)) return 'success'
        }
        return 'normal'
    }

    const setFieldTouched = (field) => setTouched(prev => ({ ...prev, [field]: true }))


    const handleFileChange = useCallback((e) => {
        const file = e.target.files[0]
        if (file) {
            setAvatarFile(file)
            const url = URL.createObjectURL(file)
            setAvatarPreview(url)
        }
    }, [])

    useEffect(() => {
        return () => {
            if (avatarPreview && avatarPreview.startsWith('blob:')) {
                URL.revokeObjectURL(avatarPreview)
            }
        }
    }, [avatarPreview])

    // Reset / populate form setiap kali modal dibuka
    useEffect(() => {
        if (!isOpen) return
        if (selectedStudent) {
            const meta = selectedStudent.metadata || {}
            setForm({
                name: selectedStudent.name || '',
                gender: selectedStudent.gender || 'L',
                class_id: selectedStudent.class_id || '',
                phone: selectedStudent.phone || '',
                photo_url: selectedStudent.photo_url || '',
                nisn: selectedStudent.nisn || '',
                guardian_name: selectedStudent.guardian_name || '',
                status: selectedStudent.status || 'aktif',
                tags: selectedStudent.tags || [],
                kamar: meta.kamar || '',
                // Father
                father_name: meta.father?.name || '',
                father_nik: meta.father?.nik || '',
                father_education: meta.father?.education || '',
                father_occupation: meta.father?.occupation || '',
                father_income: meta.father?.income || '',
                father_alive: meta.father?.alive ?? true,
                // Mother
                mother_name: meta.mother?.name || '',
                mother_nik: meta.mother?.nik || '',
                mother_education: meta.mother?.education || '',
                mother_occupation: meta.mother?.occupation || '',
                mother_income: meta.mother?.income || '',
                mother_alive: meta.mother?.alive ?? true,
                // Address Detail
                address_rt: meta.address_detail?.rt || '',
                address_rw: meta.address_detail?.rw || '',
                address_village: meta.address_detail?.village || '',
                address_district: meta.address_detail?.district || '',
                address_city: meta.address_detail?.city || '',
                address_province: meta.address_detail?.province || '',
                address_postal_code: meta.address_detail?.postal_code || '',
                living_with: meta.address_detail?.living_with || 'Orang Tua',
                // Documents & EMIS
                no_kk: meta.documents?.no_kk || '',
                no_akta: meta.documents?.no_akta || '',
                special_needs: meta.special_needs || 'Tidak Ada',
                hobby: meta.hobby || '',
                aspiration: meta.aspiration || '',
                transport: meta.transport || 'Jalan Kaki'
            })
            // Handle Metadata
            const excludedKeys = ['kamar', 'father', 'mother', 'address_detail', 'documents', 'special_needs', 'hobby', 'aspiration', 'transport']
            const metaArray = Object.entries(meta)
                .filter(([k]) => !excludedKeys.includes(k))
                .map(([k, v]) => ({ key: k, value: v }))
            setMetadataFields(metaArray)
            setShowMetadata(metaArray.length > 0)
            setShowOptional(!!(selectedStudent.nisn || selectedStudent.guardian_name || (selectedStudent.tags || []).length > 0))
        } else {
            setForm(INIT)
            setMetadataFields([])
            setShowOptional(false)
            setShowMetadata(false)
        }
        setTouched({})
        setAttemptedSubmit(false)
        setDuplicateWarning(null)
        setCurrentStep(1)
        setIsQuickMode(false)
        setPhotoError(false)
    }, [isOpen, selectedStudent])


    const checkDuplicate = useCallback(async (name, classId) => {
        if (!name || name.trim().length < 3 || !classId) { setDuplicateWarning(null); return }
        try {
            const { data } = await supabase
                .from('students')
                .select('id, name, registration_code')
                .ilike('name', `%${name.trim()}%`)
                .eq('class_id', classId)
                .is('deleted_at', null)
                .limit(3)
            const filtered = (data || []).filter(d => !selectedStudent || d.id !== selectedStudent.id)
            setDuplicateWarning(filtered.length > 0 ? filtered : null)
        } catch { setDuplicateWarning(null) }
    }, [selectedStudent])

    const handleDupCheck = useCallback((name, classId) => {
        clearTimeout(dupTimerRef.current)
        dupTimerRef.current = setTimeout(() => checkDuplicate(name, classId), 600)
    }, [checkDuplicate])

    const setField = useCallback((key, value) => {
        setForm(prev => ({ ...prev, [key]: value }))
    }, [])

    const handleAddMeta = () => setMetadataFields(p => [...p, { key: '', value: '' }])
    const handleRemoveMeta = (index) => setMetadataFields(p => p.filter((_, i) => i !== index))
    const handleUpdateMeta = (index, k, v) => setMetadataFields(p => {
        const next = [...p]; next[index] = { key: k, value: v }; return next;
    })

    const handleSubmit = (e) => {
        e.preventDefault()
        setAttemptedSubmit(true)

        // Safety: Only allow submission from the final step (Review) 
        // OR if explicitly in Quick Mode / using the Step 1 shortcut
        const isFinalStep = currentStep === 3
        const isStep1Shortcut = currentStep === 1 && !isQuickMode && form.name && form.class_id

        if (!isQuickMode && !isFinalStep && !isStep1Shortcut) return

        // Validate required
        if (!form.name.trim() || !form.class_id) {
            // Focus first error (simplified)
            return
        }

        const metadata = {
            kamar: form.kamar,
            father: {
                name: form.father_name,
                nik: form.father_nik,
                education: form.father_education,
                occupation: form.father_occupation,
                income: form.father_income,
                alive: form.father_alive
            },
            mother: {
                name: form.mother_name,
                nik: form.mother_nik,
                education: form.mother_education,
                occupation: form.mother_occupation,
                income: form.mother_income,
                alive: form.mother_alive
            },
            address_detail: {
                rt: form.address_rt,
                rw: form.address_rw,
                village: form.address_village,
                district: form.address_district,
                city: form.address_city,
                province: form.address_province,
                postal_code: form.address_postal_code,
                living_with: form.living_with
            },
            documents: {
                no_kk: form.no_kk,
                no_akta: form.no_akta
            },
            special_needs: form.special_needs,
            hobby: form.hobby,
            aspiration: form.aspiration,
            transport: form.transport
        }

        const excludedKeys = ['kamar', 'father', 'mother', 'address_detail', 'documents', 'special_needs', 'hobby', 'aspiration', 'transport']
        metadataFields.forEach(m => {
            if (m.key.trim() && !excludedKeys.includes(m.key.trim())) {
                metadata[m.key.trim()] = m.value
            }
        })
        // Kirim hanya kolom yang ada di tabel students + metadata (jsonb).
        // Field detail (orang tua, alamat, dokumen, dll) sudah dibungkus di dalam metadata.
        // `kamar` ikut dikirim karena dipakai parent; nilainya juga tersimpan di metadata.kamar.
        const STUDENT_FIELDS = ['name', 'gender', 'class_id', 'phone', 'photo_url', 'nisn', 'guardian_name', 'status', 'tags', 'kamar']
        const payload = { metadata }
        STUDENT_FIELDS.forEach(k => { payload[k] = form[k] })
        onSubmit(payload)
        clearDraft()
    }


    if (!isOpen) return null

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={selectedStudent ? 'Edit Data Siswa' : 'Tambah Siswa Baru'}
            description={
                <div className="flex items-center gap-2">
                    <div className="h-1.5 w-24 bg-[var(--color-border)] rounded-full overflow-hidden shrink-0">
                        <div
                            className="h-full bg-[var(--color-primary)] transition-all duration-500"
                            style={{ width: `${overallProgress}%` }}
                        />
                    </div>
                    <span className="text-xs font-bold text-[var(--color-primary)]">{overallProgress}% Lengkap</span>
                </div>
            }
            icon={selectedStudent ? SquarePen : Plus}
            iconBg="bg-[var(--color-primary)]/10"
            iconColor="text-[var(--color-primary)]"
            size="lg"
            mobileVariant="bottom-sheet"
            footer={
                <div className="flex flex-col w-full gap-3">
                    {/* Stepper Navigation */}
                    <div className="flex items-center w-full gap-3">
                        {currentStep > 1 && !isQuickMode ? (
                            <button
                                key="btn-back"
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    setCurrentStep(prev => prev - 1)
                                }}
                                className="h-9 px-5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] text-xs font-bold uppercase tracking-wider leading-none whitespace-nowrap transition-colors flex items-center justify-center gap-2 shrink-0"
                            >
                                <ArrowLeft className="w-4 h-4 opacity-50" />
                                Kembali
                            </button>
                        ) : (
                            <button
                                key="btn-close"
                                type="button"
                                onClick={handleSafeClose}
                                className="h-9 px-5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] text-xs font-bold uppercase tracking-wide leading-none whitespace-nowrap transition-colors shrink-0 flex items-center justify-center"
                            >
                                Batal
                            </button>
                        )}

                        <div className="flex-1" />

                        {/* Quick Mode & Direct Submit (Step 1 only) */}
                        {currentStep === 1 && !isQuickMode && form.name && form.class_id && (
                            <button
                                type="submit"
                                form="student-form-modal"
                                disabled={submitting}
                                title="Lewati Step 2 & 3 dan langsung simpan"
                                className="h-9 px-4 sm:px-5 rounded-lg bg-success/10 text-success text-xs font-bold uppercase tracking-wide leading-none whitespace-nowrap hover:bg-success hover:text-white transition-colors border border-success/20 flex items-center justify-center gap-2 shrink-0 group"
                            >
                                <Zap className="w-4 h-4 opacity-70 group-hover:animate-pulse" />
                                <span className="hidden sm:inline">Daftar Cepat</span>
                            </button>
                        )}

                        {currentStep < 3 && !isQuickMode ? (
                            <button
                                key="btn-next"
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    if (currentStep === 1 && (!form.name.trim() || !form.class_id)) {
                                        setAttemptedSubmit(true)
                                        return
                                    }
                                    setCurrentStep(prev => prev + 1)
                                }}
                                className="h-9 px-6 sm:px-8 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white text-xs font-bold uppercase tracking-wider leading-none whitespace-nowrap transition-colors flex items-center justify-center gap-2 shadow-sm shrink-0"
                            >
                                <span className="hidden sm:inline">Selanjutnya</span>
                                <span className="sm:hidden">Lanjut</span>
                                <ArrowRight className="w-4 h-4 opacity-80" />
                            </button>
                        ) : (
                            <button
                                key="btn-submit"
                                type="submit"
                                form="student-form-modal"
                                disabled={submitting}
                                className="h-9 px-6 sm:px-8 rounded-lg bg-success hover:bg-success-dark text-white text-xs font-bold uppercase tracking-wider leading-none whitespace-nowrap transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                            >
                                {submitting ? (
                                    <>
                                        <LoaderCircle className="w-4 h-4 animate-spin" />
                                        <span>Menyimpan...</span>
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-4 h-4 opacity-80 shrink-0" />
                                        <span className="truncate hidden sm:inline">{selectedStudent ? 'Simpan Perubahan' : 'Daftarkan Siswa'}</span>
                                        <span className="truncate sm:hidden">Simpan</span>
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            }
        >
            <form
                id="student-form-modal"
                onSubmit={handleSubmit}
                className="space-y-4"
            >
                {/* 0. Stepper Header & Quick Mode Toggle */}
                <div className="flex flex-col gap-3">
                    {hasDraft && (
                        <div className="flex items-center justify-between p-2 rounded-xl bg-warning/10 border border-warning/20 animate-in slide-in-from-top-2">
                            <div className="flex items-center gap-2">
                                <History className="w-4 h-4 text-warning" />
                                <span className="text-xs font-bold text-amber-700">Ada draft data yang belum selesai</span>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={clearDraft} className="text-xs font-bold uppercase text-warning-dark/50 hover:text-warning-dark">Hapus</button>
                                <button onClick={loadDraft} className="px-2 py-1 rounded-lg bg-warning text-white text-xs font-bold uppercase tracking-wider shadow-sm">Lanjutkan</button>
                            </div>
                        </div>
                    )}

                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                            {[1, 2, 3].map(step => (
                                <React.Fragment key={step}>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (step === 1 || (step === 2 && form.name && form.class_id) || (step === 3 && form.name && form.class_id)) {
                                                setCurrentStep(step)
                                                setIsQuickMode(false)
                                            }
                                        }}
                                        className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all relative ${currentStep === step ? 'bg-[var(--color-primary)] text-white shadow-lg scale-110' : step < currentStep ? 'bg-success text-white' : 'bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] border border-[var(--color-border)]'}`}
                                    >
                                        {step < currentStep ? <CircleCheck className="w-4 h-4" /> : <span className="text-xs font-bold">{step}</span>}

                                        {/* Tooltip-like label */}
                                        <span className={`absolute -bottom-5 left-1/2 -translate-x-1/2 text-[7px] font-bold uppercase tracking-tighter whitespace-nowrap transition-opacity ${currentStep === step ? 'opacity-100' : 'opacity-0'}`}>
                                            {step === 1 ? 'Pokok' : step === 2 ? 'Keluarga' : 'Lengkap'}
                                        </span>
                                    </button>
                                    {step < 3 && <div className={`h-[2px] w-6 rounded-full ${step < currentStep ? 'bg-success' : 'bg-[var(--color-border)]'}`} />}
                                </React.Fragment>
                            ))}
                        </div>

                        <button
                            type="button"
                            onClick={() => {
                                setIsQuickMode(!isQuickMode)
                                if (!isQuickMode) setCurrentStep(1)
                            }}
                            className={`h-7 px-2.5 rounded-lg border transition-all flex items-center gap-2 ${isQuickMode ? 'bg-warning border-warning text-white shadow-lg' : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]'}`}
                        >
                            <Zap className={`w-4 h-4 ${isQuickMode ? 'animate-pulse' : 'opacity-40'}`} />
                            <span className="text-xs font-bold uppercase tracking-wider">Mode Cepat</span>
                        </button>
                    </div>
                    <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-[var(--color-border)] to-transparent opacity-30 mt-1" />
                </div>

                {/* STEP 1: Core Info */}
                {(currentStep === 1 || isQuickMode) && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                        {/* Avatar & Core Section */}
                        <div className="flex flex-col sm:flex-row gap-4">
                            {/* Avatar */}
                            <div className="relative group shrink-0 mx-auto sm:mx-0">
                                <div
                                    className={`w-[88px] h-[88px] rounded-2xl bg-[var(--color-surface-alt)] border flex items-center justify-center overflow-hidden transition-all cursor-pointer ${form.photo_url || avatarPreview ? 'border-success/50' : 'border-[var(--color-border)] hover:border-[var(--color-primary)]'}`}
                                    onClick={() => photoRef.current?.click()}
                                >
                                    {(avatarPreview || (form.photo_url && !photoError)) ? (
                                        <img
                                            src={avatarPreview || form.photo_url}
                                            alt="Preview"
                                            className="w-full h-full object-cover animate-in fade-in zoom-in duration-300"
                                            onError={() => setPhotoError(true)}
                                            loading="lazy" decoding="async" />
                                    ) : (
                                        <div className="flex flex-col items-center justify-center gap-1.5 opacity-40 group-hover:opacity-100 group-hover:text-[var(--color-primary)] transition-all">
                                            <Camera className="w-5 h-5" />
                                            <span className="text-xs font-bold uppercase tracking-wider">Foto</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <input
                                type="file" ref={photoRef}
                                onChange={async (e) => {
                                    handleFileChange(e)
                                    const file = e.target.files[0]
                                    if (file) {
                                        const url = await onPhotoUpload(file)
                                        if (url) setField('photo_url', url)
                                    }
                                }}
                                className="hidden" accept="image/*"
                            />
                            {uploadingPhoto && (
                                <div className="absolute inset-0 rounded-2xl bg-[var(--color-surface)] flex items-center justify-center z-20 border border-[var(--color-border)]">
                                    <LoaderCircle className="w-4 h-4 animate-spin text-[var(--color-primary)]" />
                                </div>
                            )}

                            {/* Basic Inputs */}
                            <div className="flex-1 w-full space-y-3">
                                <div className="relative group">
                                    <label className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 mb-1 block opacity-50">
                                        Nama Lengkap <span className="text-danger">*</span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={form.name}
                                            onChange={(e) => {
                                                setField('name', e.target.value)
                                                handleDupCheck(e.target.value, form.class_id)
                                            }}
                                            onBlur={() => setFieldTouched('name')}
                                            placeholder="Masukkan nama lengkap siswa..."
                                            className={`w-full pl-9 pr-3 h-11 rounded-xl border bg-[var(--color-surface)] outline-none transition-all text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] placeholder:opacity-40 
                                            ${getStatus('name', true) === 'error' ? 'border-danger/50 focus:border-danger focus:ring-1 focus:ring-danger bg-danger/5' :
                                                    getStatus('name', true) === 'success' ? 'border-success/50 focus:border-success focus:ring-1 focus:ring-success bg-success/5' :
                                                        'border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]'}`}
                                            autoFocus
                                        />
                                        <User className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors ${getStatus('name', true) === 'error' ? 'text-danger' : getStatus('name', true) === 'success' ? 'text-success' : 'text-[var(--color-text-muted)] opacity-50 group-focus-within:text-[var(--color-primary)]'}`} />

                                        {getStatus('name', true) === 'success' && (
                                            <CircleCheck className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-success animate-in zoom-in" />
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-3">
                                    <div className="relative group">
                                        <label className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 mb-1 block opacity-50">NISN</label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={form.nisn}
                                                onChange={(e) => setField('nisn', e.target.value.replace(/\D/g, '').slice(0, 10))}
                                                onBlur={() => setFieldTouched('nisn')}
                                                placeholder="10 Digit"
                                                className={`w-full pl-9 pr-3 h-11 rounded-xl border outline-none transition-all text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] placeholder:opacity-40 bg-[var(--color-surface)]
                                                ${touched.nisn && form.nisn && form.nisn.length !== 10 ? 'border-warning bg-warning/10' :
                                                        getStatus('nisn') === 'success' ? 'border-success/30 bg-success/5' : 'border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]'}`}
                                            />
                                            <IdCard className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors ${getStatus('nisn') === 'success' ? 'text-success' : 'text-[var(--color-text-muted)] opacity-50 group-focus-within:text-[var(--color-primary)]'}`} />
                                        </div>
                                    </div>

                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2.5 pt-2">
                            <div className="w-1 h-4 bg-[var(--color-primary)] rounded-full" />
                            <User className="w-4 h-4 text-[var(--color-primary)] opacity-70" />
                            <span className="text-xs font-bold uppercase tracking-wide text-[var(--color-text)]">Detail Personal</span>
                            <div className="h-[1px] flex-1 bg-gradient-to-r from-[var(--color-border)] to-transparent opacity-40" />
                        </div>


                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 opacity-50">
                                    Jenis Kelamin <span className="text-danger">*</span>
                                </label>
                                <div className="flex p-1 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-xl h-11">
                                    {[
                                        ['L', 'Putra', 'bg-[var(--color-primary)] text-white shadow-lg'],
                                        ['P', 'Putri', 'bg-rose-500 text-white shadow-lg']
                                    ].map(([val, label, activeCls]) => (
                                        <button
                                            key={val}
                                            type="button"
                                            onClick={() => setField('gender', val)}
                                            className={`flex-1 rounded-lg text-xs font-bold tracking-wider transition-all duration-200 ${form.gender === val
                                                ? activeCls
                                                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 opacity-50">Status</label>
                                <div className="flex p-1 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-xl h-11">
                                    {[
                                        { key: 'aktif', label: 'Aktif', activeCls: 'bg-success text-white shadow-lg' },
                                        { key: 'lulus', label: 'Lulus', activeCls: 'bg-blue-500 text-white shadow-lg' },
                                        { key: 'keluar', label: 'Keluar', activeCls: 'bg-slate-700 text-white shadow-lg' },
                                    ].map((opt) => (
                                        <button
                                            key={opt.key}
                                            type="button"
                                            onClick={() => setField('status', opt.key)}
                                            className={`flex-1 rounded-lg text-xs font-bold tracking-wider transition-all duration-200 ${form.status === opt.key
                                                ? opt.activeCls
                                                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2.5 pt-2">
                            <div className="w-1 h-4 bg-[var(--color-primary)] rounded-full" />
                            <School className="w-4 h-4 text-[var(--color-primary)] opacity-70" />
                            <span className="text-xs font-bold uppercase tracking-wide text-[var(--color-text)]">Penempatan & Akademik</span>
                            <div className="h-[1px] flex-1 bg-gradient-to-r from-[var(--color-border)] to-transparent opacity-40" />
                        </div>

                        {/* 2. Placement - Flat layout */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 opacity-50">Kamar Asrama</label>
                                <RichSelect
                                    value={form.kamar}
                                    onChange={(val) => setField('kamar', val)}
                                    options={LIST_KAMAR.map(k => ({ id: k.id, name: k.id }))}
                                    placeholder="Pilih Kamar"
                                    icon={DoorOpen}
                                    extraOption={{ id: '-', name: 'Lainnya / Kosong' }}
                                    status={getStatus('kamar')}
                                    searchable
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 opacity-50">
                                    Kelas Akademik <span className="text-danger">*</span>
                                </label>
                                <RichSelect
                                    value={form.class_id}
                                    onChange={(val) => {
                                        setField('class_id', val)
                                        handleDupCheck(form.name, val)
                                        setFieldTouched('class_id')
                                    }}
                                    options={classesList}
                                    placeholder="Pilih Kelas"
                                    icon={GraduationCap}
                                    status={getStatus('class_id', true)}
                                    searchable
                                />
                                {/* Duplicate Warning */}
                                {duplicateWarning && (
                                    <div className="p-3 rounded-xl border border-warning/30 bg-warning/10 dark:bg-warning/5 text-warning-dark dark:text-warning animate-in slide-in-from-top-2 flex gap-3">
                                        <TriangleAlert className="w-4 h-4 text-warning mt-0.5" />
                                        <div>
                                            <p className="text-xs font-bold uppercase tracking-wider mb-1">Potensi Duplikasi</p>
                                            <div className="space-y-0.5">
                                                {duplicateWarning.map(d => (
                                                    <p key={d.id} className="text-xs">
                                                        {d.name} <span className="opacity-50">[{d.registration_code}]</span>
                                                    </p>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* STEP 2: Family & Contact */}
                {currentStep === 2 && !isQuickMode && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="flex items-center gap-3">
                            <div className="h-0.5 flex-1 bg-gradient-to-r from-transparent to-[var(--color-primary)]/20" />
                            <span className="text-xs font-bold uppercase tracking-wide text-[var(--color-primary)]">Data Keluarga & Kontak</span>
                            <div className="h-0.5 flex-1 bg-gradient-to-l from-transparent to-[var(--color-primary)]/20" />
                        </div>

                        <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-[var(--color-primary)]/[0.03] border border-[var(--color-primary)]/10">
                            <span className="text-xs font-bold text-indigo-600/70 uppercase">Progress Section</span>
                            <span className="text-xs font-bold text-indigo-600">{calculateStepProgress(2)}%</span>
                        </div>

                        <div className="space-y-4">
                            {/* Parents Info Card */}
                            <div className="p-4 border border-[var(--color-border)] rounded-2xl bg-[var(--color-surface)] space-y-4">
                                {/* AYAH */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2.5 pt-2">
                                        <div className="w-1 h-4 bg-[var(--color-primary)] rounded-full" />
                                        <IdCard className="w-4 h-4 text-[var(--color-primary)] opacity-70" />
                                        <span className="text-xs font-bold uppercase tracking-wide text-[var(--color-text)]">Data Ayah</span>
                                        <div className="h-[1px] flex-1 bg-gradient-to-r from-[var(--color-border)] to-transparent opacity-40" />
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="relative group">
                                            <label className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 mb-1 block opacity-50">Nama Ayah</label>
                                            <input
                                                type="text" value={form.father_name}
                                                onChange={(e) => setField('father_name', e.target.value)}
                                                className="w-full px-3 h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-sm outline-none focus:border-[var(--color-primary)] transition-all"
                                                placeholder="Nama Lengkap Ayah"
                                            />
                                        </div>
                                        <div className="relative group">
                                            <label className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 mb-1 block opacity-50">NIK Ayah</label>
                                            <input
                                                type="text" value={form.father_nik}
                                                onChange={(e) => setField('father_nik', e.target.value.replace(/\D/g, '').slice(0, 16))}
                                                className={`w-full px-3 h-11 rounded-xl border bg-[var(--color-surface)] text-sm outline-none transition-all ${getStatus('father_nik') === 'warning' ? 'border-warning bg-warning/10' : 'border-[var(--color-border)] focus:border-[var(--color-primary)]'}`}
                                                placeholder="16 Digit NIK"
                                            />
                                            {getStatus('father_nik') === 'warning' && <p className="text-xs text-warning-dark mt-1 ml-1">NIK harus 16 digit</p>}
                                        </div>
                                        <div className="relative group">
                                            <label className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 mb-1 block opacity-50">Pendidikan</label>
                                            <RichSelect
                                                value={form.father_education}
                                                onChange={(val) => setField('father_education', val)}
                                                options={EDUCATION_LEVELS.map(o => ({ id: o, name: o }))}
                                                placeholder="Pilih Pendidikan"
                                                icon={Landmark}
                                            />
                                        </div>
                                        <div className="relative group">
                                            <label className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 mb-1 block opacity-50">Pekerjaan</label>
                                            <RichSelect
                                                value={form.father_occupation}
                                                onChange={(val) => setField('father_occupation', val)}
                                                options={OCCUPATION_LIST.map(o => ({ id: o, name: o }))}
                                                placeholder="Pilih Pekerjaan"
                                                icon={Briefcase}
                                            />
                                        </div>
                                        <div className="relative group">
                                            <label className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 mb-1 block opacity-50">Penghasilan Bulanan</label>
                                            <RichSelect
                                                value={form.father_income}
                                                onChange={(val) => setField('father_income', val)}
                                                options={INCOME_RANGES.map(o => ({ id: o, name: o }))}
                                                placeholder="Pilih Rentang"
                                                icon={Coins}
                                            />
                                        </div>
                                        <div className="relative group">
                                            <label className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 mb-1 block opacity-50">Status</label>
                                            <div className="flex p-1 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-xl h-11">
                                                {[
                                                    { v: true, l: 'Masih Hidup', activeCls: 'bg-[var(--color-primary)] text-white shadow-sm' },
                                                    { v: false, l: 'Sudah Wafat', activeCls: 'bg-slate-700 text-white shadow-lg' }
                                                ].map(opt => (
                                                    <button
                                                        key={String(opt.v)} type="button"
                                                        onClick={() => setField('father_alive', opt.v)}
                                                        className={`flex-1 rounded-lg text-xs font-bold tracking-wider transition-all duration-200 ${form.father_alive === opt.v
                                                            ? opt.activeCls
                                                            : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
                                                    >
                                                        {opt.l}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* IBU */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-1 h-4 bg-[var(--color-primary)] rounded-full" />
                                        <User className="w-4 h-4 text-[var(--color-primary)] opacity-70" />
                                        <span className="text-xs font-bold uppercase tracking-wide text-[var(--color-text)]">Data Ibu</span>
                                        <div className="h-[1px] flex-1 bg-gradient-to-r from-[var(--color-border)] to-transparent opacity-40" />
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="relative group">
                                            <label className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 mb-1 block opacity-50">Nama Ibu <span className="text-danger">*</span></label>
                                            <input
                                                type="text" value={form.mother_name}
                                                onChange={(e) => setField('mother_name', e.target.value)}
                                                className="w-full px-3 h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-sm outline-none focus:border-danger transition-all"
                                                placeholder="Nama Lengkap Ibu"
                                            />
                                        </div>
                                        <div className="relative group">
                                            <label className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 mb-1 block opacity-50">NIK Ibu</label>
                                            <input
                                                type="text" value={form.mother_nik}
                                                onChange={(e) => setField('mother_nik', e.target.value.replace(/\D/g, '').slice(0, 16))}
                                                className={`w-full px-3 h-11 rounded-xl border bg-[var(--color-surface)] text-sm outline-none transition-all ${getStatus('mother_nik') === 'warning' ? 'border-warning bg-warning/10' : 'border-[var(--color-border)] focus:border-danger'}`}
                                                placeholder="16 Digit NIK"
                                            />
                                            {getStatus('mother_nik') === 'warning' && <p className="text-xs text-warning-dark mt-1 ml-1">NIK harus 16 digit</p>}
                                        </div>
                                        <div className="relative group">
                                            <label className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 mb-1 block opacity-50">Pendidikan</label>
                                            <RichSelect
                                                value={form.mother_education}
                                                onChange={(val) => setField('mother_education', val)}
                                                options={EDUCATION_LEVELS.map(o => ({ id: o, name: o }))}
                                                placeholder="Pilih Pendidikan"
                                                icon={Landmark}
                                            />
                                        </div>
                                        <div className="relative group">
                                            <label className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 mb-1 block opacity-50">Pekerjaan</label>
                                            <RichSelect
                                                value={form.mother_occupation}
                                                onChange={(val) => setField('mother_occupation', val)}
                                                options={OCCUPATION_LIST.map(o => ({ id: o, name: o }))}
                                                placeholder="Pilih Pekerjaan"
                                                icon={Briefcase}
                                            />
                                        </div>
                                        <div className="relative group">
                                            <label className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 mb-1 block opacity-50">Penghasilan Bulanan</label>
                                            <RichSelect
                                                value={form.mother_income}
                                                onChange={(val) => setField('mother_income', val)}
                                                options={INCOME_RANGES.map(o => ({ id: o, name: o }))}
                                                placeholder="Pilih Rentang"
                                                icon={Coins}
                                            />
                                        </div>
                                        <div className="relative group">
                                            <label className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 mb-1 block opacity-50">Status</label>
                                            <div className="flex p-1 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-xl h-11">
                                                {[
                                                    { v: true, l: 'Masih Hidup', activeCls: 'bg-rose-500 text-white shadow-lg' },
                                                    { v: false, l: 'Sudah Wafat', activeCls: 'bg-slate-700 text-white shadow-lg' }
                                                ].map(opt => (
                                                    <button
                                                        key={String(opt.v)} type="button"
                                                        onClick={() => setField('mother_alive', opt.v)}
                                                        className={`flex-1 rounded-lg text-xs font-bold tracking-wider transition-all duration-200 ${form.mother_alive === opt.v
                                                            ? opt.activeCls
                                                            : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
                                                    >
                                                        {opt.l}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Guardian Info Card */}
                            <div className="p-4 border border-[var(--color-border)] rounded-2xl bg-[var(--color-surface)] space-y-4">
                                <div className="flex items-center gap-2.5 pt-2">
                                    <div className="w-1 h-4 bg-[var(--color-primary)] rounded-full" />
                                    <Phone className="w-4 h-4 text-[var(--color-primary)] opacity-70" />
                                    <span className="text-xs font-bold uppercase tracking-wide text-[var(--color-text)]">Info Wali & Kontak</span>
                                    <div className="h-[1px] flex-1 bg-gradient-to-r from-[var(--color-border)] to-transparent opacity-40" />
                                </div>
                                <div className="space-y-4">
                                    <div className="relative group">
                                        <label className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 mb-1 block opacity-50">Nama Wali</label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={form.guardian_name}
                                                onChange={(e) => setField('guardian_name', e.target.value)}
                                                placeholder="Cth: Ahmad Fauzi"
                                                className="w-full pl-9 pr-3 h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] outline-none transition-all text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] placeholder:opacity-40"
                                            />
                                            <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] opacity-50" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 gap-4">
                                        <div className="relative group">
                                            <label className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 mb-1 block opacity-50">No. HP Wali <span className="text-success">*</span></label>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    value={form.phone}
                                                    onChange={(e) => setField('phone', e.target.value.replace(/\D/g, '').slice(0, 15))}
                                                    placeholder="08xxxxxxxxxx"
                                                    className={`w-full pl-9 pr-3 h-11 rounded-xl border bg-[var(--color-surface)] outline-none transition-all text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] placeholder:opacity-40 
                                                        ${getStatus('phone') === 'warning' ? 'border-warning bg-warning/10' : 'focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] border-[var(--color-border)]'}`}
                                                />
                                                <WhatsAppIcon className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors ${getStatus('phone') === 'warning' ? 'text-warning' : 'text-success opacity-70'}`} />
                                            </div>
                                            {getStatus('phone') === 'warning' && <p className="text-xs text-warning-dark mt-1 ml-1">Format HP tidak valid (08... min 10 digit)</p>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* STEP 3: Address & EMIS */}
                {currentStep === 3 && !isQuickMode && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="flex items-center gap-3">
                            <div className="h-0.5 flex-1 bg-gradient-to-r from-transparent to-success/20" />
                            <span className="text-xs font-bold uppercase tracking-wide text-success">Alamat, Dokumen & Review</span>
                            <div className="h-0.5 flex-1 bg-gradient-to-l from-transparent to-success/20" />
                        </div>

                        {/* Completion indicator */}
                        <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-success/[0.03] border border-success/10">
                            <span className="text-xs font-bold text-success/70 uppercase">Progress Section</span>
                            <span className="text-xs font-bold text-success">{calculateStepProgress(3)}%</span>
                        </div>

                        {/* Address & Docs content */}
                        <div className="space-y-4">
                            <div className="p-4 border border-[var(--color-border)] rounded-2xl bg-[var(--color-surface)] space-y-4">
                                <div className="flex items-center gap-2.5 pt-2">
                                    <div className="w-1 h-4 bg-success rounded-full" />
                                    <MapPin className="w-4 h-4 text-success opacity-70" />
                                    <span className="text-xs font-bold uppercase tracking-wide text-[var(--color-text)]">Alamat & Domisili</span>
                                    <div className="h-[1px] flex-1 bg-gradient-to-r from-[var(--color-border)] to-transparent opacity-40" />
                                </div>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                        <div className="relative group">
                                            <label className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 mb-1 block opacity-50">RT/RW</label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="text" value={form.address_rt}
                                                    onChange={(e) => setField('address_rt', e.target.value.substring(0, 3))}
                                                    className="w-full px-2 h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-sm outline-none focus:border-success text-center"
                                                    placeholder="00"
                                                />
                                                <input
                                                    type="text" value={form.address_rw}
                                                    onChange={(e) => setField('address_rw', e.target.value.substring(0, 3))}
                                                    className="w-full px-2 h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-sm outline-none focus:border-success text-center"
                                                    placeholder="00"
                                                />
                                            </div>
                                        </div>
                                        <div className="col-span-2 relative group">
                                            <label className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 mb-1 block opacity-50">Desa / Kelurahan</label>
                                            <input
                                                type="text" value={form.address_village}
                                                onChange={(e) => setField('address_village', e.target.value)}
                                                className="w-full px-3 h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-sm outline-none focus:border-success transition-all"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="relative group">
                                            <label className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 mb-1 block opacity-50">Kecamatan</label>
                                            <input
                                                type="text" value={form.address_district}
                                                onChange={(e) => setField('address_district', e.target.value)}
                                                className="w-full px-3 h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-sm outline-none focus:border-success transition-all"
                                                placeholder="Cth: Kebayoran Baru"
                                            />
                                        </div>
                                        <div className="relative group">
                                            <label className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 mb-1 block opacity-50">Kabupaten / Kota</label>
                                            <input
                                                type="text" value={form.address_city}
                                                onChange={(e) => setField('address_city', e.target.value)}
                                                className="w-full px-3 h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-sm outline-none focus:border-success transition-all"
                                                placeholder="Cth: Jakarta Selatan"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="relative group">
                                            <label className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 mb-1 block opacity-50">Provinsi</label>
                                            <input
                                                type="text" value={form.address_province}
                                                onChange={(e) => setField('address_province', e.target.value)}
                                                className="w-full px-3 h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-sm outline-none focus:border-success transition-all"
                                                placeholder="Cth: DKI Jakarta"
                                            />
                                        </div>
                                        <div className="relative group">
                                            <label className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 mb-1 block opacity-50">Kode Pos</label>
                                            <input
                                                type="text" value={form.address_postal_code}
                                                onChange={(e) => setField('address_postal_code', e.target.value.replace(/\D/g, '').slice(0, 5))}
                                                className="w-full px-3 h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-sm outline-none focus:border-success transition-all"
                                                placeholder="12345"
                                            />
                                        </div>
                                    </div>
                                    <div className="relative group">
                                        <label className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 mb-1 block opacity-50">Tinggal Bersama</label>
                                        <RichSelect
                                            value={form.living_with}
                                            onChange={(val) => setField('living_with', val)}
                                            options={LIVING_WITH.map(o => ({ id: o, name: o }))}
                                            placeholder="Pilih Status Tinggal"
                                            icon={House}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* ── Dokumen & EMIS ── */}
                            <div className="p-4 border border-[var(--color-border)] rounded-2xl bg-[var(--color-surface)] space-y-4">
                                <div className="flex items-center gap-2.5 pt-2">
                                    <div className="w-1 h-4 bg-warning rounded-full" />
                                    <FileText className="w-4 h-4 text-warning opacity-70" />
                                    <span className="text-xs font-bold uppercase tracking-wide text-[var(--color-text)]">Dokumen & EMIS</span>
                                    <div className="h-[1px] flex-1 bg-gradient-to-r from-[var(--color-border)] to-transparent opacity-40" />
                                </div>
                                <div className="relative group">
                                    <label className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 mb-1 block opacity-50">No. Akta Kelahiran</label>
                                    <input
                                        type="text" value={form.no_akta}
                                        onChange={(e) => setField('no_akta', e.target.value)}
                                        className="w-full px-3 h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-sm outline-none focus:border-warning"
                                        placeholder="Cth: 12345/01/2024"
                                    />
                                </div>
                                <div className="relative group">
                                    <label className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 mb-1 block opacity-50">Kebutuhan Khusus</label>
                                    <RichSelect
                                        value={form.special_needs}
                                        onChange={(val) => setField('special_needs', val)}
                                        options={SPECIAL_NEEDS.map(o => ({ id: o, name: o }))}
                                        placeholder="Pilih Kebutuhan"
                                        icon={Footprints}
                                    />
                                </div>
                                <div className="relative group">
                                    <label className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 mb-1 block opacity-50">Hobi</label>
                                    <input
                                        type="text" value={form.hobby}
                                        onChange={(e) => setField('hobby', e.target.value)}
                                        className="w-full px-3 h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-sm outline-none focus:border-warning"
                                        placeholder="Cth: Membaca, Olahraga"
                                    />
                                </div>
                                <div className="relative group">
                                    <label className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 mb-1 block opacity-50">Cita-cita</label>
                                    <input
                                        type="text" value={form.aspiration}
                                        onChange={(e) => setField('aspiration', e.target.value)}
                                        className="w-full px-3 h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-sm outline-none focus:border-warning"
                                        placeholder="Cth: Guru, Insinyur"
                                    />
                                </div>
                                <div className="relative group">
                                    <label className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 mb-1 block opacity-50">Transportasi</label>
                                    <RichSelect
                                        value={form.transport}
                                        onChange={(val) => setField('transport', val)}
                                        options={TRANSPORT_MODES.map(o => ({ id: o, name: o }))}
                                        placeholder="Pilih Transportasi"
                                        icon={Footprints}
                                    />
                                </div>
                            </div>

                            {/* Metadata (Special Notes) */}
                            <div className={`border border-[var(--color-border)] rounded-2xl bg-[var(--color-surface)] overflow-hidden`}>
                                <button
                                    type="button"
                                    onClick={() => setShowMetadata(v => !v)}
                                    className={`w-full flex items-center justify-between px-4 py-3 transition-colors ${showMetadata ? 'bg-[var(--color-surface-alt)]/50' : 'hover:bg-[var(--color-surface-alt)]/30'}`}
                                >
                                    <div className="flex items-center gap-3 text-left">
                                        <div className="w-8 h-8 rounded-lg bg-[var(--color-surface-alt)] flex items-center justify-center border border-[var(--color-border)]">
                                            <Pen className="w-4 h-4 text-[var(--color-text-muted)]" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-[var(--color-text)]">Catatan Khusus</p>
                                            <p className="text-xs text-[var(--color-text-muted)]">Alergi, Riwayat Kesehatan, dll.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {metadataFields.length > 0 && (
                                            <span className="text-xs font-bold bg-[var(--color-primary)] text-white px-2 py-0.5 rounded-full">
                                                {metadataFields.length}
                                            </span>
                                        )}
                                        <ChevronDown className={`w-4 h-4 opacity-40 transition-transform duration-300 ${showMetadata ? 'rotate-180' : ''}`} />
                                    </div>
                                </button>

                                <div className={`grid transition-all duration-300 ease-in-out ${showMetadata ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                                    <div className="overflow-hidden">
                                        <div className="p-4 pt-3 border-t border-[var(--color-border)] space-y-3">
                                            <div className="space-y-2">
                                                {metadataFields.map((m, idx) => (
                                                    <div key={idx} className="flex gap-2 items-start animate-in slide-in-from-left-2 duration-300">
                                                        <input
                                                            placeholder="Label"
                                                            className="w-1/3 px-3 h-9 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-xs outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all"
                                                            value={m.key}
                                                            onChange={(e) => handleUpdateMeta(idx, e.target.value, m.value)}
                                                        />
                                                        <input
                                                            placeholder="Keterangan..."
                                                            className="flex-1 px-3 h-9 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-xs outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all"
                                                            value={m.value}
                                                            onChange={(e) => handleUpdateMeta(idx, m.key, e.target.value)}
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveMeta(idx)}
                                                            className="w-9 h-9 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:bg-danger/10 hover:text-danger transition-colors shrink-0"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={handleAddMeta}
                                                className="w-full h-9 rounded-lg border border-dashed border-[var(--color-border)] bg-transparent hover:bg-[var(--color-surface-alt)]/50 transition-colors text-xs font-semibold flex items-center justify-center gap-2 mt-2 text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                                            >
                                                <Plus className="w-4 h-4" />
                                                Tambah Field
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {/* SUMMARY REVIEW CARD - ADAPTIVE ENTERPRISE EDITION */}
                            <div className="p-6 rounded-[3rem] bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text)] shadow-sm space-y-5 relative overflow-hidden group/review">
                                {/* Themed Decorative Blurs */}
                                <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: `radial-gradient(circle at 2px 2px, var(--color-text) 1px, transparent 0)`, backgroundSize: '24px 24px' }} />

                                {/* Header + Completion Ring */}
                                <div className="flex items-center justify-between relative z-10">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-2xl bg-success/10 flex items-center justify-center border border-success/20">
                                            <Eye className="w-4 h-4 text-success" />
                                        </div>
                                        <div>
                                            <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-text)]">Review Konfirmasi</span>
                                            <p className="text-xs text-[var(--color-text-muted)] font-medium">Validasi akhir data santri</p>
                                        </div>
                                    </div>
                                    {/* Completion Ring */}
                                    {(() => {
                                        const fields = [form.name, form.nisn, form.class_id, form.gender, form.mother_name, form.phone, form.address_city]
                                        const filled = fields.filter(Boolean).length
                                        const pct = Math.round((filled / fields.length) * 100)
                                        const radius = 16, circ = 2 * Math.PI * radius, offset = circ - (pct / 100) * circ
                                        return (
                                            <div className="relative w-14 h-14 shrink-0">
                                                <svg className="w-14 h-14 -rotate-90" viewBox="0 0 40 40">
                                                    <circle cx="20" cy="20" r={radius} fill="none" stroke="var(--color-border)" strokeWidth="3.5" />
                                                    <circle cx="20" cy="20" r={radius} fill="none" stroke={pct === 100 ? '#10b981' : '#6366f1'} strokeWidth="3.5" strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-1000" />
                                                </svg>
                                                <span className={`absolute inset-0 flex items-center justify-center text-xs font-bold ${pct === 100 ? 'text-success' : 'text-[var(--color-primary)]'}`}>{pct}%</span>
                                            </div>
                                        )
                                    })()}
                                </div>

                                <div className="space-y-3 relative z-10">
                                    {/* Identitas Section */}
                                    <div className="p-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm">
                                        <div className="flex items-center gap-2 mb-3">
                                            <IdCard className="w-4 h-4 text-[var(--color-primary)]" />
                                            <span className="text-xs font-bold uppercase tracking-wide text-[var(--color-primary)]/80">Identitas Santri</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-y-3 gap-x-4">
                                            <div>
                                                <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-tight opacity-60">Nama</p>
                                                <p className="text-xs font-bold text-[var(--color-text)] truncate">{form.name || <span className="text-[var(--color-text-muted)] italic opacity-40">belum diisi</span>}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-tight opacity-60">NISN</p>
                                                <p className="text-xs font-bold text-[var(--color-text)]">{form.nisn || '---'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-tight opacity-60">Kelas</p>
                                                <p className="text-xs font-bold text-[var(--color-text)]">{classesList.find(c => c.id === form.class_id)?.name || '---'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-tight opacity-60">Gender / Status</p>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    {form.gender === 'L' ? (
                                                        <div className="flex items-center gap-1.5 px-1.5 py-0.5 rounded-md bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20">
                                                            <MarsIcon className="w-4 h-4 text-[var(--color-primary)]" />
                                                            <span className="text-xs font-bold text-[var(--color-primary)] uppercase tracking-tight">Putra</span>
                                                        </div>
                                                    ) : form.gender === 'P' ? (
                                                        <div className="flex items-center gap-1.5 px-1.5 py-0.5 rounded-md bg-rose-500/10 border border-rose-500/20">
                                                            <VenusIcon className="w-4 h-4 text-danger" />
                                                            <span className="text-xs font-bold text-danger uppercase tracking-tight">Putri</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs font-bold text-[var(--color-text)]">---</span>
                                                    )}
                                                    <span className="text-[var(--color-text-muted)] mx-0.5 opacity-30">·</span>
                                                    <span className="text-success text-xs font-bold uppercase tracking-wider">{form.status || '---'}</span>
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-tight opacity-60">Kamar</p>
                                                <p className="text-xs font-bold text-[var(--color-text)]">{form.kamar || '---'}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Keluarga Section */}
                                    <div className="p-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Users className="w-4 h-4 text-danger" />
                                            <span className="text-xs font-bold uppercase tracking-wide text-danger/80">Keluarga & Kontak</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-y-3 gap-x-4">
                                            <div>
                                                <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-tight opacity-60">Ayah</p>
                                                <p className="text-xs font-bold text-[var(--color-text)] truncate">{form.father_name || '---'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-tight opacity-60">Ibu</p>
                                                <p className="text-xs font-bold text-[var(--color-text)] truncate">{form.mother_name || '---'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-tight opacity-60">Wali</p>
                                                <p className="text-xs font-bold text-[var(--color-text)] truncate">{form.guardian_name || '---'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-tight opacity-60">Kontak WA</p>
                                                <p className="text-xs font-bold text-success flex items-center gap-1.5">
                                                    <WhatsAppIcon className="w-4 h-4" />
                                                    {form.phone || '---'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {/* Alamat Section */}
                                        <div className="p-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm">
                                            <div className="flex items-center gap-2 mb-3">
                                                <MapPin className="w-4 h-4 text-success" />
                                                <span className="text-xs font-bold uppercase tracking-wide text-success/80">Alamat</span>
                                            </div>
                                            <div className="space-y-2.5">
                                                <div>
                                                    <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-tight opacity-60">Kota / Prov</p>
                                                    <p className="text-xs font-bold text-[var(--color-text)] truncate">{form.address_city || '---'}, {form.address_province || '---'}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Dokumen Section */}
                                        <div className="p-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm">
                                            <div className="flex items-center gap-2 mb-3">
                                                <FileText className="w-4 h-4 text-warning" />
                                                <span className="text-xs font-bold uppercase tracking-wide text-warning/80">Dokumen</span>
                                            </div>
                                            <div className="space-y-2.5">
                                                <div>
                                                    <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-tight opacity-60">No. Akta</p>
                                                    <p className="text-xs font-bold text-[var(--color-text)]">{form.no_akta || '---'}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Footer */}
                                <div className="pt-4 border-t border-[var(--color-border)] flex items-center justify-between relative z-10">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-6 h-6 rounded-full bg-success/10 flex items-center justify-center shrink-0">
                                            <CircleCheck className="w-4 h-4 text-success" />
                                        </div>
                                        <p className="text-xs text-[var(--color-text-muted)] italic leading-snug">Data valid & siap disimpan.</p>
                                    </div>
                                    <div className="flex -space-x-2">
                                        {[1, 2, 3].map(i => (
                                            <div key={i} className="w-5 h-5 rounded-full border-2 border-[var(--color-surface)] bg-success/20 flex items-center justify-center">
                                                <div className="w-1.5 h-1.5 rounded-full bg-success" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

            </form>
        </Modal>
    )
})

export default FormModal