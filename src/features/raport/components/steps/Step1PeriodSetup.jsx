import React from 'react'
import {
    School, MoonStar, Search, Check, ArrowLeft, ArrowRight,
    ClipboardList, Eye, Loader2, ChevronRight, Moon, Sun
} from 'lucide-react'
import { EmptyState } from '@shared/components/DataDisplay'
import RichSelect from '@shared/components/RichSelect'
import { BULAN } from '@utils/reports/raportConstants'
import { RAPORT_TYPES } from '@utils/reports/raportTypeRegistry'

export default function Step1PeriodSetup({
    selectedClassId,
    setSelectedClassId,
    tempSelectedClassId,
    setTempSelectedClassId,
    classSelectionType,
    setClassSelectionType,
    classSelectionGrade,
    setClassSelectionGrade,
    searchQuery,
    setSearchQuery,
    pickerFilteredClasses,
    classProgress,
    classesList,
    selectedMonth,
    setSelectedMonth,
    selectedYear,
    setSelectedYear,
    musyrif,
    setMusyrif,
    homeroomTeacherName,
    lang,
    setLang,
    setShowTemplatePreviewModal,
    loading,
    loadStudents,
    setStep,
    selectedClass,
    monthOptions,
    yearOptions,
    reportType,
    selectedSemester,
    setSelectedSemester,
    academicYear,
    setAcademicYear
}) {
    const rtObj = RAPORT_TYPES[reportType] || RAPORT_TYPES.bulanan

    // Build academic year options dynamically
    const currentYear = new Date().getFullYear()
    const academicYearOptions = [
        { id: `${currentYear - 2}/${currentYear - 1}`, name: `${currentYear - 2}/${currentYear - 1}` },
        { id: `${currentYear - 1}/${currentYear}`, name: `${currentYear - 1}/${currentYear}` },
        { id: `${currentYear}/${currentYear + 1}`, name: `${currentYear}/${currentYear + 1}` },
        { id: `${currentYear + 1}/${currentYear + 2}`, name: `${currentYear + 1}/${currentYear + 2}` }
    ]

    const semesterOptions = [
        { id: 1, name: 'Semester 1 (Ganjil)' },
        { id: 2, name: 'Semester 2 (Genap)' }
    ]

    if (!selectedClassId) {
        return (
            <div className="space-y-6 animate-fade-in pb-2">
                <div className="p-5 rounded-3xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center shrink-0">
                            <School className="text-indigo-500 w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-[var(--color-text)]">Pilih Kelas</h3>
                            <p className="text-[11px] text-[var(--color-text-muted)] font-medium">
                                Langkah 1: Pilih kelas aktif untuk mulai mengisi atau mencetak {rtObj.name.toLowerCase()}.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    {/* Search and Category Filter Row */}
                    <div className="flex flex-col md:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] w-3.5 h-3.5" />
                            <input
                                type="text"
                                placeholder="Cari nama kelas..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full h-12 pl-11 pr-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-sm font-bold text-[var(--color-text)] outline-none focus:border-indigo-500/50 transition-all shadow-sm"
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
                                    className={`h-10 px-4 rounded-xl text-[10px] font-black transition-all flex items-center justify-center gap-2 ${
                                        classSelectionType === opt.id
                                            ? 'bg-indigo-600 text-white shadow-md'
                                            : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-white dark:hover:bg-slate-800'
                                    }`}
                                >
                                    {(() => {
                                        const Icon = opt.icon
                                        return <Icon className="w-2.5 h-2.5 shrink-0" />
                                    })()}
                                    <span className="whitespace-nowrap">{opt.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Grade Filters */}
                    <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-2xl">
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
                                className={`h-8 px-3.5 rounded-lg text-[9px] font-black border transition-all ${
                                    classSelectionGrade === opt.id
                                        ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-600 shadow-sm'
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
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {pickerFilteredClasses.map(cls => {
                                const isBoarding = (cls.name || '').toLowerCase().includes('boarding') || (cls.name || '').toLowerCase().includes('pondok')
                                const teacher = cls.teachers?.name || 'Wali Kelas -'
                                const studentCount = classProgress[cls.id]?.total || 0
                                const isEmpty = studentCount === 0
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
                                        className={`p-4 rounded-2xl border transition-all text-left flex items-center gap-3.5 relative overflow-hidden group shadow-sm active:scale-[0.98]
                                            ${isEmpty
                                                ? 'opacity-40 cursor-not-allowed bg-slate-100/50 dark:bg-slate-800/30 border-dashed border-[var(--color-border)]'
                                                : isSelected
                                                    ? 'border-indigo-500 bg-indigo-500/10 ring-2 ring-indigo-500/20 shadow-md scale-[1.01]'
                                                    : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-indigo-500/50 hover:bg-indigo-500/5 hover:shadow-md'
                                            }`}
                                    >
                                        {/* Leading Circle with Initial / Checkmark */}
                                        <div
                                            className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 font-black text-xs transition-all
                                            ${isEmpty
                                                ? 'bg-slate-200 text-slate-400'
                                                : isSelected
                                                    ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30'
                                                    : isBoarding
                                                        ? 'bg-emerald-500/10 text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white'
                                                        : 'bg-indigo-500/10 text-indigo-600 group-hover:bg-indigo-500 group-hover:text-white'
                                            }`}
                                        >
                                            {isSelected ? <Check className="w-3.5 h-3.5 text-white animate-bounce" /> : cls.name?.charAt(0)}
                                        </div>

                                        {/* Core Info */}
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center justify-between gap-2 mb-1">
                                                <span className={`text-[12px] font-black transition-colors truncate ${isSelected ? 'text-indigo-600' : 'text-[var(--color-text)]'}`}>
                                                    {cls.name}
                                                </span>
                                                {isEmpty ? (
                                                    <span className="text-[7px] font-black px-1.5 py-0.5 rounded-md bg-rose-500/10 text-rose-500 border border-rose-500/20 shrink-0">
                                                        Kosong
                                                    </span>
                                                ) : (
                                                    <span className={`text-[7px] font-black px-1.5 py-0.5 rounded-md border shrink-0 ${isBoarding ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20'}`}>
                                                        {isBoarding ? 'Boarding' : 'Reguler'}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 opacity-70">
                                                <p className="text-[9.5px] font-bold text-[var(--color-text-muted)] truncate">{teacher}</p>
                                                <div className="w-1 h-1 rounded-full bg-[var(--color-border)] shrink-0" />
                                                <p className={`text-[9.5px] font-black shrink-0 ${isEmpty ? 'text-rose-500 font-bold' : 'text-indigo-500'}`}>
                                                    {studentCount} Siswa
                                                </p>
                                            </div>
                                        </div>
                                    </button>
                                )
                            })}
                        </div>
                    )}
                </div>

                <div className="flex gap-2 sm:gap-4 pt-4 border-t border-[var(--color-border)]">
                    <button
                        onClick={() => setStep(1)} // Go back to class selection
                        className="h-12 px-4 rounded-2xl border border-[var(--color-border)] text-xs sm:text-sm font-black text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-all flex items-center gap-2 shrink-0"
                    >
                        <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> <span className="hidden sm:inline">Kembali</span>
                    </button>

                    <button
                        type="button"
                        disabled={!tempSelectedClassId}
                        onClick={() => {
                            const cls = classesList.find(c => c.id === tempSelectedClassId)
                            setSelectedClassId(tempSelectedClassId)
                            // Set default language according to report type
                            setLang(rtObj.defaultLang)
                            if (cls?.metadata?.homeroom_teacher) setMusyrif(cls.metadata.homeroom_teacher)
                        }}
                        className={`flex-1 h-12 rounded-2xl text-white text-xs sm:text-sm font-black shadow-lg transition-all flex items-center justify-center gap-2 overflow-hidden px-2
                            ${!tempSelectedClassId
                                ? 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed shadow-none'
                                : 'bg-emerald-500 shadow-emerald-500/20 hover:brightness-110 active:scale-95'
                            }`}
                    >
                        <span className="whitespace-nowrap">Lanjut ke Setup Periode</span>
                        <ArrowRight className="w-3 h-3 opacity-70" />
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="p-5 rounded-3xl bg-gradient-to-br from-emerald-500/10 to-indigo-500/10 border border-emerald-500/20">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                        <ClipboardList className="text-emerald-500 w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-[var(--color-text)]">Setup {rtObj.name}</h3>
                        <p className="text-[11px] text-[var(--color-text-muted)] font-medium">
                            Langkah 2: Tentukan periode dan bahasa pengantar untuk raport kelas ini.
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] flex items-center gap-2">
                            <School className="w-3.5 h-3.5 opacity-60 mr-1" /> Kelas Terpilih
                        </label>
                        <div className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                <div className="w-10 h-10 rounded-[1.2rem] bg-emerald-500 flex items-center justify-center text-white text-xs font-black shadow-lg shadow-emerald-500/20 shrink-0">
                                    {selectedClass?.name?.charAt(0) || 'K'}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-[14px] font-black text-[var(--color-text)] truncate leading-tight">
                                        {selectedClass?.name || 'Memuat nama kelas...'}
                                    </p>
                                    <p className="text-[10px] text-emerald-600/70 font-bold uppercase tracking-wider">
                                        {classProgress[selectedClass?.id]?.total || 0} Siswa Terdaftar
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    setSelectedClassId('')
                                    setMusyrif('')
                                }}
                                className="h-9 px-4 rounded-xl border border-emerald-500/30 bg-white text-emerald-600 text-[11px] font-black hover:bg-emerald-500/10 transition-all shrink-0 shadow-sm active:scale-95"
                            >
                                Ganti
                            </button>
                        </div>
                    </div>

                    {rtObj.periodType === 'monthly' ? (
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Bulan</label>
                                <RichSelect
                                    value={selectedMonth}
                                    onChange={val => setSelectedMonth(Number(val))}
                                    options={monthOptions}
                                    placeholder="Pilih Bulan"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Tahun</label>
                                <RichSelect
                                    value={selectedYear}
                                    onChange={val => setSelectedYear(Number(val))}
                                    options={yearOptions}
                                    placeholder="Pilih Tahun"
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Semester</label>
                                <RichSelect
                                    value={selectedSemester}
                                    onChange={val => setSelectedSemester(Number(val))}
                                    options={semesterOptions}
                                    placeholder="Pilih Semester"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Tahun Ajaran</label>
                                <RichSelect
                                    value={academicYear}
                                    onChange={val => setAcademicYear(val)}
                                    options={academicYearOptions}
                                    placeholder="Pilih Tahun Ajaran"
                                />
                            </div>
                        </div>
                    )}
                </div>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">
                                Musyrif / Wali Kelas
                            </label>
                            {homeroomTeacherName && musyrif !== homeroomTeacherName && (
                                <button
                                    type="button"
                                    onClick={() => setMusyrif(homeroomTeacherName)}
                                    className="text-[9px] font-black text-indigo-500 hover:underline"
                                >
                                    Reset ke Wali Kelas
                                </button>
                            )}
                        </div>
                        <input
                            value={musyrif}
                            onChange={e => setMusyrif(e.target.value)}
                            placeholder={homeroomTeacherName || 'Nama lengkap musyrif...'}
                            className="w-full h-11 px-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-sm font-bold text-[var(--color-text)] outline-none focus:border-indigo-500/50 transition-all"
                        />
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">
                                Template Bahasa
                            </label>
                            <button
                                type="button"
                                onClick={() => setShowTemplatePreviewModal(true)}
                                className="text-[9px] font-black text-indigo-500 hover:underline flex items-center gap-1"
                            >
                                <Eye className="w-3.5 h-3.5 mr-1.5" /> Lihat Perbedaan Template
                            </button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { v: 'ar', label: 'العربية', sub: 'Pondok / Boarding', icon: MoonStar, color: 'text-emerald-500' },
                                { v: 'id', label: 'Indonesia', sub: 'Sekolah / Reguler', icon: School, color: 'text-indigo-500' }
                            ].map(opt => (
                                <button
                                    key={opt.v}
                                    onClick={() => setLang(opt.v)}
                                    className={`p-4 rounded-2xl border text-left transition-all ${
                                        lang === opt.v
                                            ? 'bg-indigo-500/10 border-indigo-500/50 shadow-sm'
                                            : 'bg-[var(--color-surface-alt)] border-[var(--color-border)] hover:border-indigo-500/20'
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <span className={`text-base font-black ${lang === opt.v ? 'text-indigo-600' : 'text-[var(--color-text)]'}`}>
                                            {opt.label}
                                        </span>
                                        {(() => {
                                            const Icon = opt.icon
                                            return (
                                                <Icon
                                                    className={`w-4 h-4 transition-colors ${
                                                        lang === opt.v ? opt.color : 'text-[var(--color-text-muted)] opacity-60'
                                                    }`}
                                                />
                                            )
                                        })()}
                                    </div>
                                    <p className="text-[10px] text-[var(--color-text-muted)] font-medium leading-tight">{opt.sub}</p>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex gap-2 sm:gap-4 pt-4 border-t border-[var(--color-border)]">
                <button
                    onClick={() => {
                        setSelectedClassId('')
                        setMusyrif('')
                    }}
                    className="h-12 px-4 rounded-2xl border border-[var(--color-border)] text-xs sm:text-sm font-black text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-all flex items-center gap-2 shrink-0"
                >
                    <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> <span className="hidden sm:inline">Kembali</span>
                </button>
                <button
                    onClick={async () => {
                        if (!selectedClassId) return
                        const ok = await loadStudents()
                        if (ok) setStep(3)
                    }}
                    disabled={!selectedClassId || loading}
                    className="flex-1 h-12 rounded-2xl bg-emerald-500 text-white text-xs sm:text-sm font-black shadow-lg shadow-emerald-500/20 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 overflow-hidden px-2"
                >
                    {loading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                        <ChevronRight className="w-3 h-3 opacity-70" />
                    )}
                    <span className="whitespace-nowrap">{loading ? 'Memuat Santri...' : 'Mulai Input Nilai'}</span>
                </button>
            </div>
        </div>
    )
}
