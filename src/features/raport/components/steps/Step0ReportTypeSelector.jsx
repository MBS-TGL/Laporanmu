import React from 'react'
import { Calendar, Mic, BookOpen, Award, ChevronRight, History } from 'lucide-react'
import { RAPORT_TYPES } from '@utils/reports/raportTypeRegistry'

export default function Step0ReportTypeSelector({
    setReportType,
    setStep,
    loadArchive
}) {
    const cardData = [
        {
            type: RAPORT_TYPES.bulanan,
            desc: 'Laporan perkembangan akhlak, ibadah, kebersihan, ziyadah, murojaah, dan catatan kepribadian santri setiap bulan.',
            badge: 'Bulanan',
            badgeBg: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
            icon: Calendar,
            color: 'from-indigo-500 to-purple-500',
            glow: 'shadow-indigo-500/10 hover:shadow-indigo-500/20 hover:border-indigo-500/50'
        },
        {
            type: RAPORT_TYPES.pondok_lisan,
            desc: 'Laporan hasil ujian lisan semester (Tajwid, Hafalan, Qiraah, Nahwu, Shorof, Muhadatsah, Imla).',
            badge: 'Semester',
            badgeBg: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
            icon: Mic,
            color: 'from-emerald-500 to-teal-500',
            glow: 'shadow-emerald-500/10 hover:shadow-emerald-500/20 hover:border-emerald-500/50'
        },
        {
            type: RAPORT_TYPES.pondok_mapel,
            desc: 'Laporan hasil belajar mata pelajaran kepesantrenan (Aqidah, Akhlaq, Fiqih, Hadits, Quran, dll) dengan KKM dinamis SMP/SMA.',
            badge: 'Semester',
            badgeBg: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
            icon: BookOpen,
            color: 'from-amber-500 to-orange-500',
            glow: 'shadow-amber-500/10 hover:shadow-amber-500/20 hover:border-amber-500/50'
        },
        {
            type: RAPORT_TYPES.umum,
            desc: 'Laporan penilaian umum kurikulum nasional sekolah formal (Matematika, IPA, IPS, Bahasa Indonesia/Inggris, PKn, PAI, dll).',
            badge: 'Semester',
            badgeBg: 'bg-sky-500/10 text-sky-500 border-sky-500/20',
            icon: Award,
            color: 'from-sky-500 to-blue-500',
            glow: 'shadow-sky-500/10 hover:shadow-sky-500/20 hover:border-sky-500/50'
        }
    ]

    return (
        <div className="space-y-8 animate-fade-in max-w-5xl mx-auto px-2 py-4">
            {/* Header / Intro */}
            <div className="text-center space-y-3">
                <h1 className="text-2xl sm:text-3xl font-black text-[var(--color-text)] tracking-tight">
                    Layanan Evaluasi & Raport Santri
                </h1>
                <p className="text-xs sm:text-sm text-[var(--color-text-muted)] max-w-2xl mx-auto font-medium leading-relaxed">
                    Pilih tipe raport di bawah ini untuk memulai pengisian nilai baru, mengedit draf, atau mencetak lembar raport santri.
                </p>
            </div>

            {/* Grid of Report Types */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {cardData.map(({ type, desc, badge, badgeBg, icon: Icon, color, glow }) => (
                    <button
                        key={type.id}
                        onClick={() => {
                            setReportType(type.id)
                            setStep(1) // Go to class selection
                        }}
                        className={`p-6 rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] text-left transition-all duration-300 flex flex-col justify-between relative overflow-hidden group shadow-md active:scale-[0.99] ${glow}`}
                    >
                        {/* Background subtle gradient glow on hover */}
                        <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${color} opacity-0 group-hover:opacity-5 blur-2xl transition-all duration-500 rounded-full`} />

                        <div>
                            {/* Card Header: Icon & Badge */}
                            <div className="flex items-center justify-between mb-4">
                                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform duration-300`}>
                                    <Icon className="w-5.5 h-5.5" />
                                </div>
                                <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${badgeBg}`}>
                                    {badge}
                                </span>
                            </div>

                            {/* Title & Description */}
                            <h3 className="text-base font-black text-[var(--color-text)] group-hover:text-indigo-500 transition-colors duration-200 mb-2">
                                {type.name}
                            </h3>
                            <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed font-medium mb-6">
                                {desc}
                            </p>
                        </div>

                        {/* Card Action / Footer */}
                        <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-4 w-full">
                            <span className="text-[10px] font-black text-indigo-500 group-hover:translate-x-1 transition-transform flex items-center gap-1">
                                Pilih Tipe Raport <ChevronRight className="w-3.5 h-3.5" />
                            </span>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    setReportType(type.id)
                                    setStep(5) // Go straight to archives (was step 4)
                                    if (loadArchive) loadArchive()
                                }}
                                className="h-8 px-3.5 rounded-xl border border-[var(--color-border)] hover:bg-[var(--color-surface-alt)] text-[9.5px] font-black text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-all flex items-center gap-1.5 shadow-sm"
                            >
                                <History className="w-3.5 h-3.5" />
                                Riwayat
                            </button>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    )
}
