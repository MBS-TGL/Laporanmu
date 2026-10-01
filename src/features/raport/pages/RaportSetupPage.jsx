import React, { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useRaportContext } from '@features/raport/context/RaportContext'
import RichSelect from '@shared/components/RichSelect'
import Modal from '@shared/components/Modal'
import { EmptyState } from '@shared/components/DataDisplay'
import { supabase } from '@lib/supabase'
import {
    ArrowLeft, ArrowRight, ChevronRight, Sliders, MoonStar,
    School, Eye, UserCheck, Search, Check, Loader2
} from 'lucide-react'

function getGradeNum(name = '') {
    const m = (name || '').match(/(\d{1,2})(?=[A-Za-z\s]|$)/)
    return m ? m[1] : '?'
}

function getTeacherName(teachers) {
    if (!teachers) return ''
    if (Array.isArray(teachers)) return teachers[0]?.name || ''
    if (typeof teachers === 'object') return teachers.name || ''
    return String(teachers)
}

export default function RaportSetupPage({ isAcademic = false }) {
    const { classId } = useParams()
    const navigate = useNavigate()
    const { core, activeRtObj, monthOptions, yearOptions } = useRaportContext()

    const {
        classesList, selectedClass, setSelectedClassId, selectedMonth, setSelectedMonth,
        selectedYear, setSelectedYear, selectedSemester, setSelectedSemester, academicYear, setAcademicYear,
        musyrif, setMusyrif, homeroomTeacherName, setHomeroomTeacherName, reportType, loadStudents, now, lang, setLang,
        classProgress
    } = core

    // Local states for class picker when no classId is selected
    const [tempSelectedClassId, setTempSelectedClassId] = useState('')
    const [searchQuery, setSearchQuery] = useState('')
    const [classSelectionType, setClassSelectionType] = useState('all') // 'all', 'boarding', 'regular'
    const [classSelectionGrade, setClassSelectionGrade] = useState('all') // 'all', '7', '8', '9', '10'

    const [studentCount, setStudentCount] = useState(null)
    const [showTemplateModal, setShowTemplateModal] = useState(false)
    const [submitting, setSubmitting] = useState(false)

    const basePath = isAcademic ? '/academic/raport' : '/raport'

    useEffect(() => {
        if (classId) {
            setSelectedClassId(classId)
            setTempSelectedClassId(classId)
        }
    }, [classId, setSelectedClassId])

    // Auto-fetch and auto-fill homeroom teacher / musyrif if empty
    useEffect(() => {
        if (!selectedClass) return
        const directTeacher = getTeacherName(selectedClass.teachers) || selectedClass.homeroom_teacher_name || selectedClass.teacher_name || ''
        if (directTeacher) {
            setHomeroomTeacherName(directTeacher)
            setMusyrif(prev => prev || directTeacher)
        } else if (selectedClass.id) {
            supabase
                .from('classes')
                .select('id, name, homeroom_teacher_id, teachers:homeroom_teacher_id(name)')
                .eq('id', selectedClass.id)
                .single()
                .then(({ data, error }) => {
                    if (!error && data) {
                        const tName = getTeacherName(data.teachers) || data.homeroom_teacher_name || ''
                        if (tName) {
                            setHomeroomTeacherName(tName)
                            setMusyrif(prev => prev || tName)
                        }
                    }
                })
        }
    }, [selectedClass, setHomeroomTeacherName, setMusyrif])

    // Fetch total student count for selected class
    useEffect(() => {
        if (!selectedClass?.id) return
        let isMounted = true
        supabase
            .from('students')
            .select('id', { count: 'exact', head: true })
            .eq('class_id', selectedClass.id)
            .is('deleted_at', null)
            .then(({ count, error }) => {
                if (!error && isMounted && count !== null) {
                    setStudentCount(count)
                }
            })
        return () => { isMounted = false }
    }, [selectedClass?.id])

    // Class Picker Filtered List
    const pickerFilteredClasses = useMemo(() => {
        if (!classesList) return []
        return classesList.filter(cls => {
            if (!cls) return false
            // Search query filter
            if (searchQuery) {
                const q = searchQuery.toLowerCase()
                const matchName = (cls.name || '').toLowerCase().includes(q)
                const matchTeacher = getTeacherName(cls.teachers).toLowerCase().includes(q)
                if (!matchName && !matchTeacher) return false
            }
            // Category filter
            const isBoarding = (cls.name || '').toLowerCase().includes('boarding') || (cls.name || '').toLowerCase().includes('pondok')
            if (classSelectionType === 'boarding' && !isBoarding) return false
            if (classSelectionType === 'regular' && isBoarding) return false

            // Grade filter
            if (classSelectionGrade !== 'all') {
                const grade = getGradeNum(cls.name)
                if (grade !== classSelectionGrade) return false
            }

            return true
        })
    }, [classesList, searchQuery, classSelectionType, classSelectionGrade])

    const isMonthly = activeRtObj?.periodType === 'monthly'

    const handleContinue = async () => {
        if (!selectedClass || submitting) return
        setSubmitting(true)
        try {
            const ok = await loadStudents(selectedClass.id, selectedMonth, selectedYear, lang, reportType, selectedSemester, academicYear)
            if (ok) {
                navigate(`${basePath}/input/${selectedClass.id}?month=${selectedMonth}&year=${selectedYear}&type=${reportType}`)
            }
        } finally {
            setSubmitting(false)
        }
    }

    const titleText = isAcademic ? 'Setup Raport Sekolah' : 'Setup Raport Pondok'

    // ── STEP 1: CLASS SELECTION (IF NO CLASS SELECTED) ──
    if (!classId && (!selectedClassId || !selectedClass)) {
        return (
            <div className="w-full space-y-6 animate-fade-in">
                {/* Banner */}
                <div className="relative overflow-hidden rounded-2xl p-4 sm:p-5 bg-gradient-to-r from-indigo-50 via-purple-50 to-indigo-50/60 dark:from-indigo-950/40 dark:via-purple-950/30 dark:to-indigo-950/20 border border-indigo-200/80 dark:border-indigo-800/40 shadow-xs flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-indigo-500/15 dark:bg-indigo-500/25 border border-indigo-400/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 shadow-xs">
                        <School className="w-6 h-6" />
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-base sm:text-lg font-black text-slate-800 dark:text-slate-100 tracking-tight leading-snug">
                            Pilih Kelas Raport
                        </h2>
                        <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed mt-0.5">
                            Langkah 1: Pilih kelas aktif untuk mulai mengisi atau mencetak {activeRtObj?.name || 'raport'}.
                        </p>
                    </div>
                </div>

                <div className="space-y-4">
                    {/* Search and Category Filter Row */}
                    <div className="flex flex-col md:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] w-4 h-4" />
                            <input
                                type="text"
                                placeholder="Cari nama kelas atau nama wali kelas..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full h-12 pl-11 pr-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-sm font-bold text-[var(--color-text)] outline-none focus:border-indigo-500 transition-all shadow-xs"
                            />
                        </div>

                        {/* Class Type Segmented Switch */}
                        <div className="flex items-center gap-1 p-1 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-2xl shadow-inner shrink-0 overflow-hidden">
                            {[
                                { id: 'all', label: 'Semua Kategori', icon: School },
                                { id: 'boarding', label: 'Boarding', icon: MoonStar },
                                { id: 'regular', label: 'Reguler', icon: School }
                            ].map(opt => (
                                <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => setClassSelectionType(opt.id)}
                                    className={`h-10 px-4 rounded-xl text-[10px] font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${classSelectionType === opt.id
                                        ? 'bg-indigo-600 text-white shadow-md'
                                        : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)]'
                                        }`}
                                >
                                    {(() => {
                                        const Icon = opt.icon
                                        return <Icon className="w-3.5 h-3.5 shrink-0" />
                                    })()}
                                    <span className="whitespace-nowrap">{opt.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Grade Filters */}
                    <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mr-2">
                            Tingkat Kelas:
                        </span>
                        {[
                            { id: 'all', label: 'Semua Tingkat' },
                            { id: '7', label: 'Tingkat 7 / VII' },
                            { id: '8', label: 'Tingkat 8 / VIII' },
                            { id: '9', label: 'Tingkat 9 / IX' },
                            { id: '10', label: 'Tingkat 10 / X' }
                        ].map(opt => (
                            <button
                                key={opt.id}
                                type="button"
                                onClick={() => setClassSelectionGrade(opt.id)}
                                className={`h-8 px-3.5 rounded-xl text-[10px] font-black border transition-all cursor-pointer ${classSelectionGrade === opt.id
                                    ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-600 dark:text-indigo-400 shadow-xs'
                                    : 'border-[var(--color-border)] text-[var(--color-text-muted)] bg-[var(--color-surface)] hover:border-indigo-500/25 hover:text-indigo-600'
                                    }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>

                    {/* Card Grid */}
                    {pickerFilteredClasses.length === 0 ? (
                        <EmptyState
                            icon={Search}
                            title="Kelas tidak ditemukan"
                            subtitle="Coba kata kunci pencarian lain atau pastikan kelas memiliki siswa terdaftar."
                            variant="dashed"
                        />
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                            {pickerFilteredClasses.map(cls => {
                                const isBoarding = (cls.name || '').toLowerCase().includes('boarding') || (cls.name || '').toLowerCase().includes('pondok')
                                const teacher = getTeacherName(cls.teachers) || 'Wali Kelas -'
                                const count = classProgress[cls.id]?.total || 0
                                const isEmpty = count === 0
                                const isSelected = tempSelectedClassId === cls.id

                                return (
                                    <button
                                        key={cls.id}
                                        type="button"
                                        disabled={isEmpty}
                                        onClick={() => {
                                            if (isEmpty) return
                                            setTempSelectedClassId(cls.id)
                                        }}
                                        className={`p-4 rounded-2xl border transition-all text-left flex items-center gap-3.5 relative overflow-hidden group shadow-xs cursor-pointer ${isEmpty
                                            ? 'opacity-40 cursor-not-allowed bg-slate-100/50 dark:bg-slate-800/30 border-dashed border-[var(--color-border)]'
                                            : isSelected
                                                ? 'border-indigo-500 bg-indigo-500/10 ring-2 ring-indigo-500/20 shadow-md scale-[1.01]'
                                                : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-indigo-500/50 hover:bg-indigo-500/5'
                                            }`}
                                    >
                                        <div
                                            className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 font-black text-xs transition-all ${isEmpty
                                                ? 'bg-slate-200 text-slate-400'
                                                : isSelected
                                                    ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30'
                                                    : isBoarding
                                                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white'
                                                        : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white'
                                                }`}
                                        >
                                            {isSelected ? <Check className="w-4 h-4 text-white" /> : (cls.name?.charAt(0) || 'K')}
                                        </div>

                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center justify-between gap-2 mb-1">
                                                <span className={`text-[13px] font-black transition-colors truncate ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-[var(--color-text)]'}`}>
                                                    {cls.name}
                                                </span>
                                                {isEmpty ? (
                                                    <span className="text-[8px] font-black px-1.5 py-0.5 rounded-md bg-rose-500/10 text-rose-500 border border-rose-500/20 shrink-0">
                                                        Kosong
                                                    </span>
                                                ) : (
                                                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md border shrink-0 ${isBoarding ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20'}`}>
                                                        {isBoarding ? 'Boarding' : 'Reguler'}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 opacity-80">
                                                <p className="text-[10px] font-bold text-[var(--color-text-muted)] truncate">{teacher}</p>
                                                <div className="w-1 h-1 rounded-full bg-[var(--color-border)] shrink-0" />
                                                <p className={`text-[10px] font-black shrink-0 ${isEmpty ? 'text-rose-500' : 'text-indigo-500'}`}>
                                                    {count} Siswa
                                                </p>
                                            </div>
                                        </div>
                                    </button>
                                )
                            })}
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-4 pt-2 border-t border-[var(--color-border)]/60">
                    <button
                        type="button"
                        onClick={() => navigate(basePath)}
                        className="h-14 px-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-alt)] text-[var(--color-text)] font-extrabold text-xs transition-all flex items-center justify-center gap-2 shadow-xs shrink-0 active:scale-98 cursor-pointer"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Kembali</span>
                    </button>

                    <button
                        type="button"
                        disabled={!tempSelectedClassId}
                        onClick={() => {
                            if (!tempSelectedClassId) return
                            navigate(`${basePath}/setup/${tempSelectedClassId}`)
                        }}
                        className={`h-14 flex-1 px-6 rounded-2xl text-white font-black text-sm transition-all flex items-center justify-center gap-2 shadow-lg ${!tempSelectedClassId
                            ? 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed shadow-none'
                            : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/25 active:scale-[0.99] cursor-pointer'
                            }`}
                    >
                        <span>Lanjut ke Setup Periode</span>
                        <ArrowRight className="w-5 h-5" />
                    </button>
                </div>
            </div>
        )
    }

    // ── STEP 2: SETUP PERIODE & BAHASA FORM ──
    const gradeNum = getGradeNum(selectedClass?.name || '')
    const displayStudentCount = studentCount ?? selectedClass?.total_students ?? selectedClass?.student_count ?? '…'

    return (
        <div className="w-full space-y-3">

            {/* Banner */}
            <div className="rounded-2xl px-3 py-2.5 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50/60 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/40 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-400/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <Sliders className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                    <h2 className="text-sm font-black text-slate-800 dark:text-slate-100 leading-tight">{titleText}</h2>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                        Langkah 1: Tentukan periode dan bahasa pengantar untuk raport kelas ini.
                    </p>
                </div>
            </div>

            {/*
                Grid 2 kolom x 3 baris (tinggi tiap baris diatur manual):
                Kiri  : Kelas Terpilih (baris 1-2) + Bulan/Tahun (baris 3)
                Kanan : Musyrif (baris 1)          + Template Bahasa (baris 2-3)

                ===== PANDUAN UKURAN (cari class ini lalu ubah angkanya) =====
                1) TINGGI BARIS GRID (paling berpengaruh):
                   md:grid-rows-[4.25rem_0.75rem_4.25rem]
                   - angka 1 (4.25rem) = tinggi baris Musyrif (kanan atas)
                   - angka 3 (4.25rem) = tinggi baris Bulan/Tahun (kiri bawah)
                   - angka 2 (0.75rem) = baris tengah, hanya penentu tinggi kotak Kelas & Bahasa
                   Tinggi kotak Kelas  = angka1 + angka2 + 2x jarak - label
                   Tinggi kartu Bahasa = angka2 + angka3 + 2x jarak - label
                   -> kecilkan angka 2 untuk memperkecil Kelas & Bahasa,
                      besarkan angka 1 dan 3 (sekalian h-11 input) untuk memperbesar Musyrif & Bulan/Tahun.
                   Jangan angka 1 dan 3 lebih kecil dari (label ~14px + tinggi input + 4px).
                2) TINGGI INPUT/DROPDOWN: "h-11" (Musyrif) dan "!h-11" (Bulan, Tahun, Semester, Tahun Ajaran)
                3) JARAK ANTAR KOTAK: gap-y-2 (vertikal), gap-x-3 (horizontal)
                4) KOTAK KELAS: p-2 (padding), w-9 h-9 (avatar), text-[13px] (nama), text-[9px] (jumlah siswa)
                5) KARTU BAHASA: px-3 (padding), text-sm (judul), text-[9px] (sub), w-4 h-4 (ikon)
                6) TOMBOL BAWAH: h-10 (Kembali & Mulai Input Nilai)
            */}
            <div className="grid grid-cols-1 md:grid-cols-2 md:grid-rows-[4.25rem_0.75rem_4.25rem] gap-x-3 gap-y-2">

                {/* Kelas Terpilih — kiri, tinggi 2 */}
                <div className="md:col-start-1 md:row-start-1 md:row-span-2 flex flex-col gap-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Kelas Terpilih
                    </label>
                    <div className="flex-1 p-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/20 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-full bg-emerald-500 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/30">
                                {gradeNum}
                            </div>
                            <div className="min-w-0">
                                <h3 className="text-[13px] font-black text-[var(--color-text)] truncate leading-tight">
                                    {selectedClass?.name || 'Memuat Kelas...'}
                                </h3>
                                <span className="text-[9px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
                                    {displayStudentCount} SISWA TERDAFTAR
                                </span>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => { setSelectedClassId(''); navigate(basePath) }}
                            className="px-3 py-1 rounded-xl border border-emerald-500/40 bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 font-black text-[11px] hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition-all shrink-0 active:scale-95 cursor-pointer"
                        >
                            Ganti
                        </button>
                    </div>
                </div>

                {/* Musyrif — kanan, tinggi 1 */}
                <div className="md:col-start-2 md:row-start-1 space-y-1">
                    <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                            Musyrif / Wali Kelas
                        </label>
                        {homeroomTeacherName && musyrif !== homeroomTeacherName && (
                            <button
                                type="button"
                                onClick={() => setMusyrif(homeroomTeacherName)}
                                className="text-[9px] font-bold text-indigo-500 hover:underline flex items-center gap-1"
                            >
                                <UserCheck className="w-3 h-3" />
                                Pakai Wali Resmi ({homeroomTeacherName})
                            </button>
                        )}
                    </div>
                    <input
                        type="text"
                        value={musyrif}
                        onChange={e => setMusyrif(e.target.value)}
                        placeholder="Nama Wali Kelas / Musyrif"
                        className="w-full h-11 px-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-sm font-bold text-[var(--color-text)] focus:outline-none focus:border-indigo-500 transition-all"
                    />
                </div>

                {/* Periode — kiri bawah, tinggi 1 */}
                {isMonthly ? (
                    <div className="md:col-start-1 md:row-start-3 grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Bulan</label>
                            <RichSelect
                                value={selectedMonth}
                                onChange={val => setSelectedMonth(Number(val))}
                                options={monthOptions}
                                placeholder="Pilih Bulan"
                                buttonClassName="!h-11 !rounded-2xl border-[var(--color-border)] bg-[var(--color-surface-alt)] font-bold text-sm px-4 flex items-center"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Tahun</label>
                            <RichSelect
                                value={selectedYear}
                                onChange={val => setSelectedYear(Number(val))}
                                options={yearOptions}
                                placeholder="Pilih Tahun"
                                buttonClassName="!h-11 !rounded-2xl border-[var(--color-border)] bg-[var(--color-surface-alt)] font-bold text-sm px-4 flex items-center"
                            />
                        </div>
                    </div>
                ) : (
                    <div className="md:col-start-1 md:row-start-3 grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Semester</label>
                            <RichSelect
                                value={selectedSemester}
                                onChange={val => setSelectedSemester(Number(val))}
                                options={[
                                    { id: 1, name: 'Semester 1 (Ganjil)' },
                                    { id: 2, name: 'Semester 2 (Genap)' }
                                ]}
                                placeholder="Pilih Semester"
                                buttonClassName="!h-11 !rounded-2xl border-[var(--color-border)] bg-[var(--color-surface-alt)] font-bold text-sm px-4 flex items-center"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Tahun Ajaran</label>
                            <RichSelect
                                value={academicYear}
                                onChange={val => setAcademicYear(val)}
                                options={Array.from({ length: 3 }).map((_, i) => {
                                    const startYear = (now?.getFullYear() || 2026) - 1 + i
                                    const val = `${startYear}/${startYear + 1}`
                                    return { id: val, name: val }
                                })}
                                placeholder="Pilih Tahun Ajaran"
                                buttonClassName="!h-11 !rounded-2xl border-[var(--color-border)] bg-[var(--color-surface-alt)] font-bold text-sm px-4 flex items-center"
                            />
                        </div>
                    </div>
                )}

                {/* Template Bahasa — kanan, tinggi 2 */}
                <div className="md:col-start-2 md:row-start-2 md:row-span-2 flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Template Bahasa</label>
                        <button
                            type="button"
                            onClick={() => setShowTemplateModal(true)}
                            className="text-[10px] font-bold text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 flex items-center gap-1 cursor-pointer"
                        >
                            <Eye className="w-3.5 h-3.5" />
                            Lihat Perbedaan Template
                        </button>
                    </div>
                    <div className="flex-1 grid grid-cols-2 gap-3">
                        {[
                            { id: 'ar', title: 'العربية', sub: 'Pondok / Boarding', Icon: MoonStar },
                            { id: 'id', title: 'Indonesia', sub: 'Sekolah / Reguler', Icon: School },
                        ].map(({ id, title, sub, Icon }) => (
                            <button
                                key={id}
                                type="button"
                                onClick={() => setLang(id)}
                                className={`h-full px-3 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer ${lang === id
                                    ? 'bg-indigo-500/10 dark:bg-indigo-950/40 border-2 border-indigo-500'
                                    : 'bg-[var(--color-surface-alt)] border-[var(--color-border)] hover:border-indigo-300'
                                    }`}
                            >
                                <div>
                                    <span className={`text-sm font-black block leading-tight ${lang === id ? 'text-indigo-600 dark:text-indigo-400' : 'text-[var(--color-text)]'}`}>
                                        {title}
                                    </span>
                                    <span className="text-[9px] font-medium text-[var(--color-text-muted)]">{sub}</span>
                                </div>
                                <Icon className={`w-4 h-4 shrink-0 ${lang === id ? 'text-indigo-600 dark:text-indigo-400' : 'text-[var(--color-text-muted)] opacity-60'}`} />
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Action bar */}
            <div className="flex items-center gap-3 pt-1">
                <button
                    type="button"
                    onClick={() => { setSelectedClassId(''); navigate(basePath) }}
                    className="h-10 px-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-alt)] text-[var(--color-text)] font-extrabold text-xs transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Kembali</span>
                </button>
                <button
                    type="button"
                    onClick={handleContinue}
                    disabled={submitting}
                    className="h-10 flex-1 px-5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-black text-sm transition-all flex items-center justify-center gap-2 shadow-md shadow-emerald-500/25 cursor-pointer"
                >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-5 h-5" />}
                    <span>{submitting ? 'Memuat Data...' : 'Mulai Input Nilai'}</span>
                </button>
            </div>

            {/* Template Difference Modal */}
            <Modal
                isOpen={showTemplateModal}
                onClose={() => setShowTemplateModal(false)}
                title="Perbedaan Template Raport"
                size="md"
            >
                <div className="space-y-4 py-1">
                    <div className="p-4 rounded-2xl border border-indigo-500/30 bg-indigo-500/5 dark:bg-indigo-950/20 space-y-2">
                        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                            <MoonStar className="w-5 h-5" />
                            <h4 className="text-sm font-black">Template Bahasa Arab (Pondok / Boarding)</h4>
                        </div>
                        <ul className="text-xs text-[var(--color-text-muted)] space-y-1.5 font-medium pl-6 list-disc">
                            <li>Format cetak Right-to-Left (RTL) khas pesantren.</li>
                            <li>Judul mata pelajaran dan istilah predikat dicetak dalam Bahasa Arab (ممتاز, جيد جداً, dsb).</li>
                            <li>Tersedia kolom Hafalan Qur'an (Ziyadah & Murojaah), Kehadiran, dan Catatan Musyrif.</li>
                        </ul>
                    </div>

                    <div className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/20 space-y-2">
                        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                            <School className="w-5 h-5" />
                            <h4 className="text-sm font-black">Template Bahasa Indonesia (Sekolah / Reguler)</h4>
                        </div>
                        <ul className="text-xs text-[var(--color-text-muted)] space-y-1.5 font-medium pl-6 list-disc">
                            <li>Format cetak Left-to-Right (LTR) standar nasional.</li>
                            <li>Menggunakan istilah mata pelajaran umum & predikat nilai Indonesia (Sangat Baik, Baik, dsb).</li>
                            <li>Sangat cocok untuk laporan berkala akademik sekolah umum & pengurusan administrasi resmi.</li>
                        </ul>
                    </div>

                    <div className="pt-2 text-center">
                        <button
                            type="button"
                            onClick={() => setShowTemplateModal(false)}
                            className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
                        >
                            Saya Mengerti
                        </button>
                    </div>
                </div>
            </Modal>

        </div>
    )
}

