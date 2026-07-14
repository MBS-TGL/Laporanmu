import React from 'react'
import {
    AlertTriangle, X, Zap, ChevronRight, Archive, Search, School, Moon, Sun, ArrowLeft
} from 'lucide-react'
import { EmptyState } from '@shared/components/DataDisplay'
import Skeleton from '@shared/components/Skeleton'
import { BULAN } from '@utils/reports/raportConstants'
import { RAPORT_TYPES } from '@utils/reports/raportTypeRegistry'

const ClassCardSkeleton = () => (
    <div className="p-4 rounded-[2rem] border border-[var(--color-border)] bg-[var(--color-surface-alt)] animate-pulse">
        <div className="flex items-start justify-between mb-4">
            <Skeleton className="w-12 h-12 rounded-2xl" />
            <Skeleton className="w-16 h-5 rounded-lg opacity-60" />
        </div>
        <Skeleton className="h-5 w-3/4 rounded-lg mb-2" />
        <Skeleton className="h-3 w-1/2 rounded-md opacity-40" />
    </div>
)

export default function Step0ClassSelection({
    newMonthBanner,
    setNewMonthBanner,
    lastSession,
    setLastSession,
    classesList,
    setSelectedClassId,
    setSelectedMonth,
    setSelectedYear,
    setLang,
    setStep,
    loadStudents,
    searchQuery,
    setSearchQuery,
    filterType,
    setFilterType,
    filteredClasses,
    pageLoading,
    classProgress,
    showAllIncompleteBanner,
    setShowAllIncompleteBanner,
    searchInputRef,
    loadArchive,
    now,
    reportType,
}) {
    const rtObj = RAPORT_TYPES[reportType] || RAPORT_TYPES.bulanan

    return (
        <div className="space-y-6">
            {/* Banner Raport Belum Lengkap */}
            {newMonthBanner && reportType === 'bulanan' && (
                <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/8 flex items-start gap-3 overflow-hidden">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0 mt-0.5">
                        <AlertTriangle className="text-amber-500 w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-black text-[var(--color-text)] mb-0.5">
                            Raport {newMonthBanner.prevMonthStr} {newMonthBanner.prevYear} belum lengkap!
                        </p>
                        <p className="text-[10px] text-[var(--color-text-muted)] mb-3">
                            {newMonthBanner.classesNotArchived.length} kelas masih ada santri yang belum diisi.
                        </p>

                        {/* Mobile: Grid 2 Col | Tablet: 3-4 Col | Desktop: Flex Wrap */}
                        <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:flex md:flex-wrap items-center gap-2 mt-3">
                            {(showAllIncompleteBanner ? newMonthBanner.classesNotArchived : newMonthBanner.classesNotArchived.slice(0, 8)).map(cls => (
                                <button
                                    key={cls.class_id}
                                    onClick={() => {
                                        setSelectedClassId(cls.class_id);
                                        setSelectedMonth(newMonthBanner.prevMonth);
                                        setSelectedYear(newMonthBanner.prevYear);
                                        const clsObj = classesList.find(c => c.id === cls.class_id);
                                        if (clsObj) {
                                            const n = (clsObj.name || '').toLowerCase();
                                            setLang(n.includes('boarding') || n.includes('pondok') ? 'ar' : 'id')
                                        }
                                        setStep(2) // Go to Period Setup step
                                    }}
                                    className="h-9 px-3 rounded-xl bg-white/70 border border-amber-500/30 text-amber-900 text-[10px] font-black hover:bg-white hover:shadow-md hover:border-amber-500 transition-all flex items-center justify-between gap-2 shrink-0 shadow-sm"
                                >
                                    <span className="truncate min-w-0">{cls.class_name.split(' ')[0]}</span>
                                    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-md shrink-0 ${cls.filled === 0 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                        {cls.filled}/{cls.total}
                                    </span>
                                </button>
                            ))}
                            {!showAllIncompleteBanner && newMonthBanner.classesNotArchived.length > 8 && (
                                <button
                                    onClick={() => setShowAllIncompleteBanner(true)}
                                    className="h-9 px-3 rounded-xl bg-amber-500/10 border border-dashed border-amber-500/40 text-amber-600 text-[9px] font-black hover:bg-amber-500/20 transition-all flex items-center justify-center gap-1.5"
                                >
                                    +{newMonthBanner.classesNotArchived.length - 8} kelas lagi
                                </button>
                            )}
                            {showAllIncompleteBanner && (
                                <button
                                    onClick={() => setShowAllIncompleteBanner(false)}
                                    className="h-9 px-3 rounded-xl text-amber-600 text-[9px] font-black hover:underline transition-all"
                                >
                                    Sembunyikan
                                </button>
                            )}
                        </div>

                        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-amber-500/10">
                            <button
                                onClick={() => setNewMonthBanner(null)}
                                className="h-8 px-4 rounded-xl bg-white/50 border border-amber-500/20 text-amber-700 text-[9px] font-black hover:bg-white transition-all"
                            >
                                Nanti
                            </button>
                            <button
                                onClick={() => {
                                    localStorage.setItem(newMonthBanner.dismissKey, '1')
                                    setNewMonthBanner(null)
                                }}
                                className="h-8 px-4 rounded-xl bg-white/50 border border-amber-500/20 text-amber-700 text-[9px] font-black hover:bg-white transition-all"
                            >
                                Jangan ingatkan
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Banner Lanjutkan Sesi Terakhir */}
            {lastSession && lastSession.reportType === reportType && classesList.find(c => c.id === lastSession.classId) && (
                <div className="flex items-center gap-3 p-3 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 shadow-sm">
                    <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center shrink-0">
                        <Zap className="text-indigo-500 w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-black text-[var(--color-text)] leading-tight">Lanjutkan yang tadi?</p>
                        <p className="text-[9px] text-[var(--color-text-muted)] font-medium truncate opacity-70">
                            {lastSession.className} · {
                                lastSession.reportType === 'bulanan'
                                    ? `${BULAN.find(b => b.id === lastSession.month)?.id_str} ${lastSession.year}`
                                    : `Semester ${lastSession.selectedSemester} (${lastSession.academicYear})`
                            }
                        </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                        <button
                            onClick={async () => {
                                setSelectedClassId(lastSession.classId)
                                if (lastSession.reportType === 'bulanan') {
                                    setSelectedMonth(lastSession.month)
                                    setSelectedYear(lastSession.year)
                                }
                                setLang(lastSession.useLang)
                                const ok = await loadStudents(lastSession.classId, lastSession.month, lastSession.year, lastSession.useLang)
                                if (ok) setStep(3) // Go directly to input table
                            }}
                            className="h-8 px-4 rounded-xl bg-indigo-600 text-white text-[9px] font-black hover:bg-indigo-700 transition-all shadow-md shadow-indigo-500/20"
                        >
                            Buka →
                        </button>
                        <button
                            onClick={() => {
                                localStorage.removeItem('raport_last_session')
                                setLastSession(null)
                            }}
                            className="w-8 h-8 rounded-xl flex items-center justify-center text-[var(--color-text-muted)] hover:text-red-500 hover:bg-red-50 transition-all"
                        >
                            <X className="w-2.5 h-2.5" />
                        </button>
                    </div>
                </div>
            )}

            {/* ── SEARCH & FILTER CONTROLS ── */}
            <div className="flex flex-col gap-4 border-b border-[var(--color-border)]/50 pb-6">
                <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setStep(0)} // Go back to selector
                            className="mr-2 p-1.5 rounded-lg border border-[var(--color-border)] hover:bg-[var(--color-surface-alt)] transition-all text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                        >
                            <ArrowLeft className="w-3.5 h-3.5" />
                        </button>
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                            <School className="text-indigo-500 w-3.5 h-3.5" />
                        </div>
                        <label className="text-[10px] font-black uppercase tracking-[0.15em] text-[var(--color-text-muted)]">
                            Pilih Kelas · {rtObj.name}
                        </label>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    {/* Search Row */}
                    <div className="relative flex-1 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] w-3 h-3 opacity-40 group-focus-within:text-indigo-500 group-focus-within:opacity-100 transition-all" />
                        <input
                            ref={searchInputRef}
                            type="text"
                            placeholder="Cari nama kelas..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full h-11 pl-11 pr-10 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] outline-none text-[13px] font-bold transition-all focus:border-indigo-500/50 focus:shadow-xl focus:shadow-indigo-500/5 text-[var(--color-text)]"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center text-[var(--color-text-muted)] hover:text-red-500 transition-all"
                            >
                                <X className="w-2.5 h-2.5" />
                            </button>
                        )}
                    </div>

                    {/* Filter Row */}
                    <div className="grid grid-cols-3 sm:flex sm:items-center gap-1.5 p-1 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-2xl w-full sm:w-auto overflow-hidden shrink-0 shadow-inner">
                        {[
                            { id: 'all', label: 'Semua', icon: School },
                            { id: 'boarding', label: 'Board', icon: Moon },
                            { id: 'regular', label: 'Reguler', icon: Sun }
                        ].map(opt => (
                            <button
                                key={opt.id}
                                onClick={() => setFilterType(opt.id)}
                                className={`h-9 sm:px-5 rounded-xl text-[10px] font-black transition-all flex items-center justify-center gap-1.5 sm:gap-2 ${
                                    filterType === opt.id
                                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
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
            </div>

            {/* Grid Area */}
            <div className="relative">
                {filteredClasses.length === 0 && !pageLoading ? (
                    <EmptyState
                        variant="dashed"
                        color={searchQuery ? 'indigo' : 'slate'}
                        icon={searchQuery ? Search : School}
                        title={searchQuery ? `"${searchQuery}" tidak ditemukan` : 'Belum ada kelas'}
                        description={searchQuery ? 'Coba kata kunci lain atau hapus filter.' : 'Tambahkan kelas di menu Master Terlebih dahulu.'}
                        action={searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="h-10 px-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[10px] font-black text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:shadow-lg transition-all flex items-center gap-2 mx-auto"
                            >
                                <X className="w-3.5 h-3.5 mr-1" /> Reset Filter
                            </button>
                        )}
                    />
                ) : pageLoading ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                        {Array.from({ length: 8 }).map((_, i) => <ClassCardSkeleton key={i} />)}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                        {filteredClasses.map(cls => {
                            const isBoarding = (cls.name || '').toLowerCase().includes('boarding') || (cls.name || '').toLowerCase().includes('pondok')
                            const prog = classProgress[cls.id]
                            const teacher = cls.teachers?.name || 'Wali Kelas -'
                            const isDone = prog && prog.total > 0 && prog.done === prog.total
                            const pct = typeof prog?.pct === 'number'
                                ? prog.pct
                                : (prog?.total ? Math.round((prog.done / prog.total) * 100) : 0)
                            const lastLabel = prog?.lastMonth ? `${BULAN.find(b => b.id === prog.lastMonth)?.id_str} ${prog.lastYear}` : null

                            return (
                                <div
                                    key={cls.id}
                                    className="group relative rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-indigo-500/50 hover:shadow-md transition-all duration-200 flex items-center p-2.5 gap-3 h-[72px]"
                                >
                                    {/* Small Initial */}
                                    <div
                                        className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 font-black text-[10px] transition-all ${
                                            isDone
                                                ? 'bg-emerald-500 text-white'
                                                : isBoarding
                                                    ? 'bg-indigo-500/10 text-indigo-600'
                                                    : 'bg-emerald-500/10 text-emerald-600'
                                        }`}
                                    >
                                        {cls.name?.charAt(0)}
                                    </div>

                                    {/* Main Info Area */}
                                    <div className="min-w-0 flex-1 flex flex-col justify-center gap-0.5">
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-[11px] font-black text-[var(--color-text)] truncate group-hover:text-indigo-600 transition-colors uppercase tracking-tight leading-none">
                                                {cls.name}
                                            </h3>
                                            <span
                                                className={`text-[6px] font-black px-1 py-0.5 rounded-md border shrink-0 ${
                                                    isBoarding
                                                        ? 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20'
                                                        : 'bg-sky-500/10 text-sky-500 border-sky-500/20'
                                                }`}
                                            >
                                                {isBoarding ? 'B' : 'R'}
                                            </span>
                                        </div>
                                        <p className="text-[9px] font-bold text-[var(--color-text-muted)] truncate opacity-60 leading-none">
                                            {teacher}
                                        </p>

                                        {/* Slim Progress */}
                                        <div className="flex items-center gap-2 mt-1">
                                            <div className="h-1 flex-1 rounded-full bg-[var(--color-border)]/40 overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-1000 ${isDone ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                            <span className="text-[8px] font-black text-indigo-500 w-6 text-right">{pct}%</span>
                                        </div>
                                    </div>

                                    {/* Right Side Actions */}
                                    <div className="flex items-center gap-1 shrink-0 ml-1 h-full pl-2 border-l border-[var(--color-border)]/50">
                                        <button
                                            onClick={() => {
                                                setSelectedClassId(cls.id)
                                                // Initialize default language
                                                setLang(rtObj.defaultLang)
                                                setStep(2) // Go to Period Setup step
                                            }}
                                            title="Setup & Mulai Input"
                                            className="w-8 h-8 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-lg transition-all flex items-center justify-center shrink-0"
                                        >
                                            <ChevronRight className="w-3 h-3" />
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                setSelectedClassId(cls.id)
                                                setStep(5) // Go to Archive
                                                loadArchive()
                                            }}
                                            disabled={reportType === 'bulanan' ? !lastLabel : false}
                                            title="Lihat Arsip"
                                            className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 transition-all ${
                                                reportType !== 'bulanan' || lastLabel
                                                    ? 'border-[var(--color-border)] bg-[var(--color-surface-alt)] hover:border-indigo-500/30 hover:text-indigo-600 text-[var(--color-text-muted)]'
                                                    : 'opacity-20 cursor-not-allowed border-dashed'
                                            }`}
                                        >
                                            <Archive className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}
