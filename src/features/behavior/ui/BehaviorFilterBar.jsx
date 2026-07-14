import React, { useMemo } from 'react'
import {
    Search, X, ClipboardList, CheckCircle2, AlertCircle, ArrowDown,
    ArrowUp, LayoutList, Table, Sliders, RotateCcw
} from 'lucide-react'
import { useLanguage } from '@context/Language'
import RichSelect from '@shared/components/RichSelect'

export default function BehaviorFilterBar({
    searchQuery,
    setSearchQuery,
    searchInputRef,
    filterType,
    setFilterType,
    filterClass,
    setFilterClass,
    sortBy,
    setSortBy,
    viewMode,
    setViewMode,
    selectedIds,
    setSelectedIds,
    reports,
    classesList,
    showAdvFilter,
    setShowAdvFilter,
    setPage,
    resetAllFilters,
}) {
    const { t, tNum } = useLanguage()
    const tp = (key) => t(`behavior.${key}`)

    const allSelected = reports.length > 0 && reports.every((r) => selectedIds.includes(r.id))

    const activeFilters = useMemo(() => {
        const chips = []
        if (filterType === 'positive') chips.push({ label: `${tp('positive')} (+)`, clear: () => setFilterType('') })
        if (filterType === 'negative') chips.push({ label: `${tp('negative')} (−)`, clear: () => setFilterType('') })
        if (filterClass) chips.push({ label: `${tp('classLabel')}: ${filterClass}`, clear: () => setFilterClass('') })
        if (sortBy !== 'newest') chips.push({ label: `${tp('sortLabel')}: ${tp('oldest')}`, clear: () => setSortBy('newest') })
        return chips
    }, [filterType, filterClass, sortBy, t])

    return (
        <div className="glass rounded-[1.5rem] mb-4 border border-[var(--color-border)] overflow-hidden">
            {/* Visual Grouping: Search (Left), Filters (Center), Actions (Right) */}
            <div className="grid grid-cols-[minmax(0,_1fr)_auto] items-center gap-x-2 gap-y-2.5 p-2 xs:p-2.5 lg:flex lg:flex-row lg:items-center lg:gap-0 lg:p-3">
                
                {/* Group 1: Search Bar (Left) */}
                <div className="col-start-1 row-start-1 col-span-1 flex-1 w-full min-w-0 lg:min-w-[140px] lg:pr-0">
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--color-text-muted)] text-sm group-focus-within:text-[var(--color-primary)] transition-colors">
                            <Search className="w-4 h-4" />
                        </div>
                        <input
                            ref={searchInputRef}
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={tp('searchPlaceholder')}
                            className="input-field pl-10 w-full h-9 text-xs sm:text-sm bg-[var(--color-surface-alt)]/50 border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/10 transition-all rounded-xl font-bold placeholder:font-normal placeholder:opacity-40"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-lg hover:bg-[var(--color-surface-alt)] flex items-center justify-center text-[var(--color-text-muted)] transition-all"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Divider 1 (Desktop) */}
                <div className="hidden lg:block w-[1px] h-5 bg-[var(--color-border)] lg:mx-2.5 xl:mx-4 shrink-0" />

                {/* Group 2: Quick Filters & Sorting (Center) */}
                <div className="col-start-1 row-start-2 col-span-2 flex flex-nowrap items-center gap-1 pt-2.5 lg:pt-0 lg:px-0 shrink-0 w-full lg:w-auto overflow-x-auto scrollbar-hide border-t border-[var(--color-border)] lg:border-t-0">
                    <div className="flex items-center gap-1 shrink-0 py-0.5">
                        {[
                            { id: '', label: tp('all'), icon: ClipboardList, activeCls: 'bg-[var(--color-primary)] border-[var(--color-primary)]' },
                            { id: 'positive', label: tp('positive'), icon: CheckCircle2, activeCls: 'bg-emerald-500 border-emerald-500' },
                            { id: 'negative', label: tp('negative'), icon: AlertCircle, activeCls: 'bg-rose-500 border-rose-500' },
                        ].map((s) => (
                            <button
                                key={s.id}
                                onClick={() => {
                                    setFilterType(s.id)
                                    setPage(1)
                                }}
                                className={`flex items-center gap-1 lg:gap-2 px-2 lg:px-3 py-1.5 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-normal sm:tracking-widest whitespace-nowrap transition-all border ${
                                    filterType === s.id
                                        ? `${s.activeCls} text-white`
                                        : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)]/30 hover:bg-[var(--color-primary)]/5 hover:text-[var(--color-primary)]'
                                }`}
                            >
                                <s.icon className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${filterType === s.id ? 'opacity-100' : 'opacity-30'}`} />
                                {s.label}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={() => {
                            setSortBy(sortBy === 'newest' ? 'oldest' : 'newest')
                            setPage(1)
                        }}
                        className={`flex items-center gap-1 lg:gap-2 px-2 lg:px-3 py-1.5 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-normal sm:tracking-widest whitespace-nowrap transition-all border shrink-0 ${
                            sortBy === 'oldest'
                                ? 'bg-amber-500 border-amber-500 text-white'
                                : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-amber-500/30 hover:bg-amber-500/5 hover:text-amber-600'
                        }`}
                    >
                        {sortBy === 'newest' ? <ArrowDown className="w-3 h-3 sm:w-3.5 sm:h-3.5 opacity-30" /> : <ArrowUp className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
                        {sortBy === 'newest' ? tp('newest') : tp('oldest')}
                    </button>
                </div>

                {/* Divider 2 (Desktop) */}
                <div className="hidden lg:block w-[1px] h-5 bg-[var(--color-border)] lg:mx-2.5 xl:mx-4 shrink-0" />

                {/* Group 3: Action Buttons (Right) */}
                <div className="col-start-2 row-start-1 col-span-1 flex flex-nowrap items-center justify-end gap-1.5 lg:gap-2 lg:pt-0 lg:pl-0 shrink-0">
                    {/* View Mode Switcher */}
                    <div className="bg-[var(--color-surface-alt)] p-1 rounded-xl border border-[var(--color-border)] flex gap-0.5">
                        <button
                            onClick={() => setViewMode('timeline')}
                            title={tp('timeline')}
                            className={`h-7 px-2 lg:px-2.5 rounded-lg text-[10px] font-black tracking-widest uppercase transition-all flex items-center gap-1.5 ${
                                viewMode === 'timeline' ? 'bg-[var(--color-primary)] text-white shadow-sm' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                            }`}
                        >
                            <LayoutList className="w-3.5 h-3.5" />
                            <span className="hidden xl:inline">{tp('timeline')}</span>
                        </button>
                        <button
                            onClick={() => setViewMode('table')}
                            title={tp('tableView')}
                            className={`h-7 px-2 lg:px-2.5 rounded-lg text-[10px] font-black tracking-widest uppercase transition-all flex items-center gap-1.5 ${
                                viewMode === 'table' ? 'bg-[var(--color-primary)] text-white shadow-sm' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                            }`}
                        >
                            <Table className="w-3.5 h-3.5" />
                            <span className="hidden xl:inline">{tp('tableView')}</span>
                        </button>
                    </div>

                    {/* Pilih Semua / Batal */}
                    <button
                        onClick={() => setSelectedIds(allSelected ? [] : reports.map((r) => r.id))}
                        className={`h-9 px-2.5 lg:px-3 rounded-xl border text-[10px] font-black uppercase tracking-wider lg:tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 ${
                            selectedIds.length > 0 ? 'bg-indigo-500 border-indigo-500 text-white shadow-md shadow-indigo-500/20' : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]'
                        }`}
                        title={tp('selectAll')}
                    >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span className="hidden xl:inline">{selectedIds.length > 0 ? tp('selected') : tp('selectAll')}</span>
                        {selectedIds.length > 0 && (
                            <span className="w-4 h-4 rounded-full bg-white/20 text-white text-[9px] font-black flex items-center justify-center">
                                {tNum(selectedIds.length)}
                            </span>
                        )}
                    </button>

                    {/* Advanced Filter Sliders */}
                    <button
                        onClick={() => setShowAdvFilter((v) => !v)}
                        className={`h-9 px-2.5 lg:px-3 rounded-xl border text-[10px] font-black uppercase tracking-wider lg:tracking-widest transition-all flex items-center justify-center gap-2 ${
                            showAdvFilter || activeFilters.length > 0
                                ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white shadow-md shadow-[var(--color-primary)]/30'
                                : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]'
                        }`}
                        title={tp('advancedFilter')}
                    >
                        <Sliders className="w-3.5 h-3.5" />
                        <span className="hidden xl:inline">{tp('filterShort')}</span>
                        {activeFilters.length > 0 && (
                            <span className="w-4 h-4 rounded-full bg-white/30 text-white text-[9px] font-black flex items-center justify-center">
                                {tNum(activeFilters.length)}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* Active Filter Chips */}
            {activeFilters.length > 0 && (
                <div className="px-3 pb-3 -mt-1 flex flex-wrap gap-2">
                    {activeFilters.map((f, i) => (
                        <button
                            key={i}
                            type="button"
                            onClick={f.clear}
                            className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/40 text-[10px] font-black text-[var(--color-text)]"
                            title={tp('deleteFilter')}
                        >
                            {f.label}
                            <span className="w-5 h-5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)] group-hover:text-red-500 transition-colors">
                                <X className="w-3.5 h-3.5" />
                            </span>
                        </button>
                    ))}
                    <button
                        type="button"
                        onClick={resetAllFilters}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-red-500/20 bg-red-500/5 text-[10px] font-black text-red-600"
                        title={tp('resetAllFilters')}
                    >
                        <RotateCcw className="w-3.5 h-3.5" />
                        {tp('resetAllFilters')}
                    </button>
                </div>
            )}

            {/* Row 2: Advanced Filter Panel */}
            {showAdvFilter && (
                <div className="border-t border-[var(--color-border)] p-3.5 bg-[var(--color-surface-alt)]/60 backdrop-blur-md animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center justify-between mb-3.5">
                        <div className="flex items-center gap-2.5">
                            <div className="w-1 h-3.5 bg-[var(--color-primary)] rounded-full" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--color-primary)] flex items-center gap-2">
                                <Sliders className="w-3 h-3 opacity-60" />
                                <span className="sm:hidden">{tp('filterShort')}</span>
                                <span className="hidden sm:inline">{tp('advancedFilter')}</span>
                            </span>
                        </div>
                        <button
                            onClick={resetAllFilters}
                            className="text-[9px] font-black uppercase tracking-widest text-red-500 hover:bg-red-500/5 px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 border border-transparent hover:border-red-500/10"
                        >
                            <RotateCcw className="w-3 h-3" />
                            <span className="sm:hidden">{tp('resetShort')}</span>
                            <span className="hidden sm:inline">{tp('resetAllFilters')}</span>
                        </button>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <div>
                            <label className="block text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1.5">{tp('filterCategory')}</label>
                            <RichSelect
                                value={filterType}
                                onChange={(val) => {
                                    setFilterType(val)
                                    setPage(1)
                                }}
                                options={[
                                    { id: '', name: tp('allBehaviors') },
                                    { id: 'positive', name: `${tp('positive')} (+)` },
                                    { id: 'negative', name: `${tp('negative')} (−)` },
                                ]}
                                placeholder={tp('allBehaviors')}
                                small
                            />
                        </div>
                        <div>
                            <label className="block text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1.5">{tp('classLabel')}</label>
                            <RichSelect
                                value={filterClass}
                                onChange={(val) => {
                                    setFilterClass(val)
                                    setPage(1)
                                }}
                                options={[
                                    { id: '', name: tp('allClasses') },
                                    ...classesList.map((c) => ({ id: c, name: c })),
                                ]}
                                placeholder={tp('allClasses')}
                                small
                                searchable
                                maxHeight={200}
                            />
                        </div>
                        <div>
                            <label className="block text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1.5">{tp('sortLabel')}</label>
                            <RichSelect
                                value={sortBy}
                                onChange={(val) => {
                                    setSortBy(val)
                                    setPage(1)
                                }}
                                options={[
                                    { id: 'newest', name: `↓ ${tp('newest')}` },
                                    { id: 'oldest', name: `↑ ${tp('oldest')}` },
                                ]}
                                small
                            />
                        </div>
                        <div className="flex items-end justify-end">
                            <button
                                onClick={() => setShowAdvFilter(false)}
                                className="h-9 px-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[9px] font-black uppercase tracking-widest text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] transition-all"
                            >
                                {tp('closePanel')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
