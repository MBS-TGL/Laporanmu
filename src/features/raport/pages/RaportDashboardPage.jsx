import React, { memo, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRaportContext } from '@features/raport/context/RaportContext'
import { School, Search, ChevronRight, Zap, X, Users, PieChart, CheckCircle2, Archive } from 'lucide-react'
import StatsCarousel from '@shared/components/StatsCarousel'
import { StatCard, EmptyState } from '@shared/components/DataDisplay'
import Skeleton from '@shared/components/Skeleton'
import { RAPORT_TYPES } from '@features/raport/utils/raportTypeRegistry'
import { BULAN } from '@utils/reports/raportConstants'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getGender(name = '') {
    const n = name.toUpperCase()
    if (n.includes('PUTRI') || n.includes('PEREMPUAN') || n.includes('WANITA')) return 'putri'
    if (n.includes('PUTRA') || n.includes('LAKI')) return 'putra'
    return 'other'
}

function getGradeNum(name = '') {
    // Match digits followed by a letter or space (e.g. "7A", "10B", "12 BOARDING")
    const m = name.match(/(\d{1,2})(?=[A-Za-z\s]|$)/)
    return m ? parseInt(m[1]) : null
}

// ─── Compact Row Card (memoized) ──────────────────────────────────────────────

const ClassRow = memo(function ClassRow({ cls, progress, onSelect, onArchive }) {
    const pct = progress?.pct ?? 0
    const done = progress?.done ?? 0
    const total = progress?.total ?? 0
    const gradeNum = getGradeNum(cls.name)  // null if not found
    const gender = getGender(cls.name)

    const gradeColor = gender === 'putra'
        ? 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20'
        : 'bg-violet-500/10 text-violet-600 border-violet-500/20'

    const progressColor = pct === 0
        ? 'bg-[var(--color-border)]'
        : pct < 50 ? 'bg-amber-500'
        : pct < 100 ? 'bg-indigo-500'
        : 'bg-emerald-500'

    return (
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-indigo-400/40 hover:bg-[var(--color-surface-alt)]/60 transition-all group">
            {/* Grade badge */}
            <div className={`w-8 h-8 shrink-0 rounded-lg border flex items-center justify-center text-[11px] font-black leading-none ${gradeColor}`}>
                {gradeNum ?? '—'}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-[11px] font-black text-[var(--color-text)] truncate leading-tight">
                        {cls.name}
                    </span>
                    {total > 0 && (
                        <span className="shrink-0 text-[9px] font-black px-1.5 py-0.5 rounded-md bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] border border-[var(--color-border)]">
                            {total}
                        </span>
                    )}
                </div>
                <p className="text-[9px] text-[var(--color-text-muted)] font-medium truncate opacity-70 leading-tight mt-0.5">
                    {cls.teachers?.name || 'Wali Kelas —'}
                </p>
            </div>

            {/* Progress */}
            <div className="shrink-0 flex flex-col items-end gap-1 w-12">
                <span className={`text-[10px] font-black ${pct === 100 ? 'text-emerald-500' : pct > 0 ? 'text-indigo-500' : 'text-[var(--color-text-muted)]'}`}>
                    {pct}%
                </span>
                <div className="w-full h-1 rounded-full bg-[var(--color-border)]">
                    <div
                        className={`h-full rounded-full transition-all duration-700 ${progressColor}`}
                        style={{ width: `${pct}%` }}
                    />
                </div>
                <span className="text-[8px] text-[var(--color-text-muted)] opacity-50 font-bold">{done}/{total}</span>
            </div>

            {/* Actions */}
            <button
                onClick={() => onSelect(cls.id)}
                className="shrink-0 w-8 h-8 rounded-lg bg-indigo-500 text-white flex items-center justify-center hover:bg-indigo-600 active:scale-95 transition-all shadow-md shadow-indigo-500/20"
                title="Input Raport"
            >
                <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
                onClick={(e) => { e.stopPropagation(); onArchive(cls.id) }}
                className="shrink-0 w-8 h-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] flex items-center justify-center hover:border-amber-400/50 hover:text-amber-500 active:scale-95 transition-all"
                title="Lihat Arsip"
            >
                <Archive className="w-3 h-3" />
            </button>
        </div>
    )
})

// ─── Group Section ─────────────────────────────────────────────────────────────

const ClassGroup = memo(function ClassGroup({ label, accent, classes, classProgress, onSelect, onArchive }) {
    if (!classes.length) return null
    return (
        <div>
            <div className={`flex items-center gap-2 mb-2 px-1`}>
                <div className={`w-1.5 h-4 rounded-full ${accent}`} />
                <span className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                    {label}
                </span>
                <span className="text-[9px] font-bold text-[var(--color-text-muted)] opacity-50">
                    ({classes.length} kelas)
                </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-1.5">
                {classes.map(cls => (
                    <ClassRow
                        key={cls.id}
                        cls={cls}
                        progress={classProgress[cls.id]}
                        onSelect={onSelect}
                        onArchive={onArchive}
                    />
                ))}
            </div>
        </div>
    )
})

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function ClassRowSkeleton() {
    return (
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]">
            <Skeleton className="w-8 h-8 rounded-lg shrink-0" />
            <div className="flex-1 min-w-0 space-y-1.5">
                <Skeleton className="h-3 w-3/4 rounded-md" />
                <Skeleton className="h-2.5 w-1/2 rounded-md opacity-50" />
            </div>
            <Skeleton className="w-12 h-6 rounded-md shrink-0" />
            <Skeleton className="w-8 h-8 rounded-lg shrink-0" />
            <Skeleton className="w-8 h-8 rounded-lg shrink-0" />
        </div>
    )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function RaportDashboardPage({ isAcademic = false }) {
    const navigate = useNavigate()
    const { core } = useRaportContext()
    const {
        classesList, classProgress, pageLoading,
        searchQuery, setSearchQuery, filterType, setFilterType,
        reportType, setReportType,
        lastSession, setLastSession, setSelectedClassId,
        filteredClasses, step0Stats
    } = core

    const basePath = isAcademic ? '/academic/raport' : '/raport'

    const handleSelectClass = (clsId) => {
        setSelectedClassId(clsId)
        navigate(`${basePath}/setup/${clsId}`)
    }

    const handleArchive = (clsId) => {
        setSelectedClassId(clsId)
        navigate(`${basePath}/archive?classId=${clsId}`)
    }

    // Group by gender then sort by grade number
    const { putraClasses, putriClasses, otherClasses } = useMemo(() => {
        const sorted = [...filteredClasses].sort((a, b) => {
            const ga = getGradeNum(a.name) ?? 99
            const gb = getGradeNum(b.name) ?? 99
            if (ga !== gb) return ga - gb
            return a.name.localeCompare(b.name)
        })
        return {
            putraClasses: sorted.filter(c => getGender(c.name) === 'putra'),
            putriClasses: sorted.filter(c => getGender(c.name) === 'putri'),
            otherClasses: sorted.filter(c => getGender(c.name) === 'other'),
        }
    }, [filteredClasses])

    return (
        <div className="space-y-5">
            {/* ── STATS CAROUSEL ── */}
            <StatsCarousel count={4}>
                <StatCard icon={School}        label="Total Kelas"    value={step0Stats.totalKelas}    color="indigo"  loading={pageLoading} />
                <StatCard icon={Users}         label="Total Siswa"    value={step0Stats.totalSiswa}    color="emerald" loading={pageLoading} />
                <StatCard icon={CheckCircle2}  label="Raport Lengkap" value={step0Stats.raportLengkap} color="indigo"  loading={pageLoading} />
                <StatCard icon={PieChart}      label="Rata Input"     value={step0Stats.rataInput}     color="amber"   loading={pageLoading} />
            </StatsCarousel>

            {/* ── REPORT TYPE SWITCHER ── */}
            <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-xl">
                {Object.values(RAPORT_TYPES).map(rt => {
                    const isActive = reportType === rt.id
                    return (
                        <button
                            key={rt.id}
                            onClick={() => setReportType(rt.id)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-black transition-all ${isActive ? 'bg-[var(--color-surface)] text-indigo-600 shadow-sm border border-indigo-500/20' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
                        >
                            {rt.name}
                        </button>
                    )
                })}
            </div>

            {/* ── BANNER SESI TERAKHIR ── */}
            {lastSession && classesList.find(c => c.id === lastSession.classId) && (
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-indigo-500/20 bg-indigo-500/5">
                    <Zap className="text-indigo-500 w-3.5 h-3.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                        <span className="text-[11px] font-black text-[var(--color-text)]">Lanjutkan: </span>
                        <span className="text-[11px] text-[var(--color-text-muted)] font-medium truncate">
                            {lastSession.className} · {BULAN.find(b => b.id === lastSession.month)?.id_str} {lastSession.year}
                        </span>
                    </div>
                    <button
                        onClick={() => {
                            setSelectedClassId(lastSession.classId)
                            navigate(`${basePath}/input/${lastSession.classId}?month=${lastSession.month}&year=${lastSession.year}`)
                        }}
                        className="h-7 px-3 rounded-lg bg-indigo-600 text-white text-[9px] font-black hover:bg-indigo-700 transition-all shrink-0 shadow-md shadow-indigo-500/20"
                    >
                        Buka →
                    </button>
                    <button
                        onClick={() => { localStorage.removeItem('raport_last_session'); setLastSession(null) }}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-red-500 hover:bg-red-50 transition-all shrink-0"
                    >
                        <X className="w-3 h-3" />
                    </button>
                </div>
            )}

            {/* ── SEARCH & FILTER ── */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <div className="relative flex-1 group">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] group-focus-within:text-indigo-500 transition-colors" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Cari nama kelas atau wali kelas..."
                        className="w-full h-9 pl-9 pr-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[11px] font-bold placeholder:text-[var(--color-text-muted)]/50 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all"
                    />
                </div>
                <div className="flex items-center gap-1.5">
                    {[
                        { key: 'all', label: 'Semua' },
                        { key: 'boarding', label: 'Boarding' },
                        { key: 'regular', label: 'Reguler' },
                    ].map(({ key, label }) => (
                        <button
                            key={key}
                            onClick={() => setFilterType(key)}
                            className={`h-9 px-3.5 rounded-xl text-[10px] font-black transition-all whitespace-nowrap ${filterType === key ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20' : 'bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── CLASS GROUPS ── */}
            {pageLoading ? (
                <div className="space-y-5">
                    {['Putra', 'Putri'].map(label => (
                        <div key={label}>
                            <div className="flex items-center gap-2 mb-2 px-1">
                                <Skeleton className="w-1.5 h-4 rounded-full" />
                                <Skeleton className="h-3 w-20 rounded-md" />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-1.5">
                                {Array.from({ length: 6 }).map((_, i) => <ClassRowSkeleton key={i} />)}
                            </div>
                        </div>
                    ))}
                </div>
            ) : filteredClasses.length === 0 ? (
                <EmptyState
                    icon={School}
                    title={classesList.length === 0 ? 'Belum Ada Kelas' : 'Kelas Tidak Ditemukan'}
                    description={
                        classesList.length === 0
                            ? 'Tambahkan kelas terlebih dahulu melalui menu Master Data.'
                            : 'Tidak ada kelas yang sesuai dengan kata kunci pencarian Anda.'
                    }
                    color="indigo"
                />
            ) : (
                <div className="space-y-5">
                    <ClassGroup
                        label="Kelas Putra"
                        accent="bg-indigo-500"
                        classes={putraClasses}
                        classProgress={classProgress}
                        onSelect={handleSelectClass}
                        onArchive={handleArchive}
                    />
                    <ClassGroup
                        label="Kelas Putri"
                        accent="bg-violet-500"
                        classes={putriClasses}
                        classProgress={classProgress}
                        onSelect={handleSelectClass}
                        onArchive={handleArchive}
                    />
                    <ClassGroup
                        label="Kelas Lainnya"
                        accent="bg-slate-400"
                        classes={otherClasses}
                        classProgress={classProgress}
                        onSelect={handleSelectClass}
                        onArchive={handleArchive}
                    />
                </div>
            )}
        </div>
    )
}
