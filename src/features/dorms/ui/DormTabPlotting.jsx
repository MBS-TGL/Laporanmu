import React from 'react'
import { EmptyState } from '@shared/components/DataDisplay'
import RichSelect from '@shared/components/RichSelect'
import Pagination from '@shared/components/Pagination'
import BulkActionsBar from '@shared/components/BulkActionsBar'
import { useLanguage } from '@context/Language'
import {
    Search, X, Sliders, RotateCcw, LayoutGrid, Table,
    CheckCircle2, User, UserMinus, ArrowRightLeft, Bed, AlertCircle, Users
} from 'lucide-react'
import { maskName } from '@features/dorms/utils/dormUtils'

export default function DormTabPlotting({
    searchQuery,
    setSearchQuery,
    selectedRoomTab,
    setSelectedRoomTab,
    viewMode,
    setViewMode,
    selectedIds,
    setSelectedIds,
    showAdvFilter,
    setShowAdvFilter,
    activeFilters,
    selectedClassFilter,
    setSelectedClassFilter,
    classesList,
    dorms,
    selectedGenderFilter,
    setSelectedGenderFilter,
    selectedBuildingFilter,
    setSelectedBuildingFilter,
    buildingOptions,
    loading,
    filteredStudents,
    paginatedStudents,
    isPrivacyMode,
    toggleSelect,
    handleOpenEvictModal,
    handleOpenAssignModal,
    allSelected,
    toggleAll,
    page,
    setPage,
    pageSize,
    setPageSize,
    jumpPage,
    setJumpPage,
    handleBulkUnassign,
    setIsBulkAssignModalOpen,
    setSelectedBulkRoom,
    students
}) {
    const { t } = useLanguage()
    return (
        <div className="space-y-5 animate-in fade-in duration-300">
            {/* ── SEARCH & FILTER BAR (Standardized from BehaviorPage) ── */}
            <div className="glass rounded-[1.5rem] mb-4 border border-[var(--color-border)] overflow-hidden">
                {/* Row 1: Search + Quick Filters + Action Buttons */}
                <div className="flex items-center gap-1.5 p-2 xs:gap-2 xs:p-2.5 lg:p-3">
                    {/* Search Bar - Dynamic & Responsive */}
                    <div className="flex-1 min-w-[80px] sm:min-w-[140px] transition-all duration-300">
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--color-text-muted)] text-sm group-focus-within:text-[var(--color-primary)] transition-colors">
                                <Search className="w-4 h-4" />
                            </div>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                                placeholder={t('dorms.plotting.searchPlaceholder')}
                                className="input-field pl-10 w-full h-9 text-xs sm:text-sm bg-[var(--color-surface-alt)]/50 border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/10 transition-all rounded-xl font-bold placeholder:font-normal placeholder:opacity-40 outline-none"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => { setSearchQuery(''); setPage(1); }}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-lg hover:bg-[var(--color-surface-alt)] flex items-center justify-center text-[var(--color-text-muted)] transition-all"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Quick Filter Chips - Desktop Only */}
                    <div className="hidden lg:flex flex-initial items-center gap-2 overflow-x-auto scrollbar-hide py-0.5 min-w-0 h-full">
                        <div className="h-4 w-px bg-[var(--color-border)] mx-1" />

                        {/* Group 1: Status Plotting */}
                        <div className="flex items-center gap-1.5 shrink-0">
                            {[
                                { id: 'All', label: t('dorms.plotting.all'), icon: Users, activeCls: 'bg-[var(--color-primary)] border-[var(--color-primary)]' },
                                { id: 'Assigned', label: t('dorms.plotting.assigned'), icon: CheckCircle2, activeCls: 'bg-emerald-500 border-emerald-500' },
                                { id: 'Unassigned', label: t('dorms.plotting.unassigned'), icon: AlertCircle, activeCls: 'bg-amber-500 border-amber-500' },
                            ].map((s) => {
                                const isActive = selectedRoomTab === s.id || (s.id === 'Assigned' && selectedRoomTab !== 'All' && selectedRoomTab !== 'Unassigned' && selectedRoomTab !== '')
                                return (
                                    <button
                                        key={s.id}
                                        onClick={() => {
                                            if (s.id === 'Assigned') {
                                                setSelectedRoomTab('Assigned')
                                            } else {
                                                setSelectedRoomTab(s.id);
                                            }
                                            setPage(1);
                                        }}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border ${isActive
                                            ? `${s.activeCls} text-white`
                                            : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)]/30 hover:bg-[var(--color-primary)]/5 hover:text-[var(--color-primary)]'
                                            }`}
                                    >
                                        <s.icon className={`w-3.5 h-3.5 ${isActive ? 'opacity-100' : 'opacity-30'}`} />
                                        {s.label}
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="hidden lg:block w-px h-4 bg-[var(--color-border)] mx-2 shrink-0" />

                    {/* Action Buttons */}
                    <div className="flex items-center justify-end gap-1.5 xs:gap-2 shrink-0 lg:ml-auto">
                        {/* View Switcher (Cards vs Tabel) */}
                        <div className="bg-[var(--color-surface-alt)] p-1 rounded-xl border border-[var(--color-border)] flex gap-0.5 items-center shrink-0">
                            <button
                                onClick={() => setViewMode('cards')}
                                title={t('dorms.plotting.cards')}
                                className={`h-7 px-2.5 rounded-lg text-[10px] font-black tracking-widest uppercase transition-all flex items-center gap-1.5 ${viewMode === 'cards' ? 'bg-[var(--color-primary)] text-white shadow-sm' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
                            >
                                <LayoutGrid className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">{t('dorms.plotting.cards')}</span>
                            </button>
                            <button
                                onClick={() => setViewMode('table')}
                                title={t('dorms.plotting.table')}
                                className={`h-7 px-2.5 rounded-lg text-[10px] font-black tracking-widest uppercase transition-all flex items-center gap-1.5 ${viewMode === 'table' ? 'bg-[var(--color-primary)] text-white shadow-sm' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
                            >
                                <Table className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">{t('dorms.plotting.table')}</span>
                            </button>
                        </div>

                        {/* Pilih Semua / Batal */}
                        <button
                            onClick={toggleAll}
                            className={`h-9 px-2.5 xs:px-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 ${selectedIds.length > 0 ? 'bg-indigo-500 border-indigo-500 text-white shadow-md shadow-indigo-500/20' : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]'} `}
                            title={selectedIds.length > 0 ? t('dorms.plotting.deselectAll') : t('dorms.plotting.selectAll')}
                        >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">{selectedIds.length > 0 ? t('dorms.plotting.selected') : t('dorms.plotting.selectAll')}</span>
                            {selectedIds.length > 0 && (
                                <span className="w-4 h-4 rounded-full bg-white/20 text-white text-[9px] font-black flex items-center justify-center">
                                    {selectedIds.length}
                                </span>
                            )}
                        </button>

                        {/* Advanced Filter Sliders */}
                        <button
                            onClick={() => setShowAdvFilter(v => !v)}
                            className={`h-9 px-2.5 xs:px-3 sm:px-4 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${showAdvFilter || activeFilters.length > 0
                                ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white shadow-md shadow-[var(--color-primary)]/30'
                                : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]'}`}
                            title={t('dorms.plotting.advancedFilter')}
                        >
                            <Sliders className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">{t('dorms.plotting.filter')}</span>
                            {activeFilters.length > 0 && (
                                <span className="w-4 h-4 rounded-full bg-white/30 text-white text-[9px] font-black flex items-center justify-center">
                                    {activeFilters.length}
                                </span>
                            )}
                        </button>
                    </div>
                </div>

                {/* Active Filter Chips */}
                {activeFilters.length > 0 && (
                    <div className="px-3 pb-3 -mt-1 flex flex-wrap gap-2">
                        {activeFilters.map((f, i) => (
                            <button key={i} type="button" onClick={f.clear}
                                className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/40 text-[10px] font-black text-[var(--color-text)]" title={t('dorms.plotting.resetFilter')}>
                                {f.label}
                                <span className="w-5 h-5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)] group-hover:text-red-500 transition-colors">
                                    <X className="w-3.5 h-3.5" />
                                </span>
                            </button>
                        ))}
                        <button type="button"
                            onClick={() => {
                                setSelectedClassFilter('');
                                setSelectedRoomTab('All');
                                setSelectedGenderFilter('');
                                setSelectedBuildingFilter('');
                                setPage(1);
                            }}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-red-500/20 bg-red-500/5 text-[10px] font-black text-red-600" title={t('dorms.plotting.resetFilter')}>
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>{t('dorms.plotting.resetFilter')}</span>
                        </button>
                    </div>
                )}

                {/* Row 2: Advanced Filter Panel */}
                {showAdvFilter && (
                    <div className="border-t border-[var(--color-border)] p-3.5 bg-[var(--color-surface-alt)]/60 backdrop-blur-md animate-in fade-in slide-in-from-top-2">
                        {/* Header Panel with Standardized "Vertical Bar" Pattern */}
                        <div className="flex items-center justify-between mb-3.5">
                            <div className="flex items-center gap-2.5">
                                <div className="w-1 h-3.5 bg-[var(--color-primary)] rounded-full" />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--color-primary)] flex items-center gap-2">
                                    <Sliders className="w-3 h-3 opacity-60" />
                                    <span className="sm:hidden">{t('dorms.plotting.filter')}</span>
                                    <span className="hidden sm:inline">{t('dorms.plotting.advancedFilter')}</span>
                                </span>
                            </div>
                            <button
                                onClick={() => {
                                    setSelectedClassFilter('');
                                    setSelectedRoomTab('All');
                                    setSelectedGenderFilter('');
                                    setSelectedBuildingFilter('');
                                    setPage(1);
                                }}
                                className="text-[9px] font-black uppercase tracking-widest text-red-500 hover:bg-red-500/5 px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 border border-transparent hover:border-red-500/10"
                            >
                                <RotateCcw className="w-3 h-3" />
                                <span>{t('dorms.plotting.resetFilter')}</span>
                            </button>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div>
                                <label className="block text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1.5">{t('dorms.plotting.class')}</label>
                                <RichSelect
                                    value={selectedClassFilter}
                                    onChange={(val) => { setSelectedClassFilter(val); setPage(1); }}
                                    options={[
                                        { id: '', name: t('dorms.plotting.allClasses') },
                                        ...classesList.map(c => ({ id: c.id, name: c.name }))
                                    ]}
                                    placeholder={t('dorms.plotting.allClasses')}
                                    small
                                />
                            </div>
                            <div>
                                <label className="block text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1.5">{t('dorms.plotting.dorm')}</label>
                                <RichSelect
                                    value={selectedRoomTab}
                                    onChange={(val) => { setSelectedRoomTab(val); setPage(1); }}
                                    options={[
                                        { id: 'All', name: t('dorms.plotting.allDorms') },
                                        { id: 'Assigned', name: t('dorms.plotting.assigned') },
                                        { id: 'Unassigned', name: t('dorms.plotting.unassigned') },
                                        ...dorms.map(d => ({ id: d.id, name: d.id }))
                                    ]}
                                    placeholder={t('dorms.plotting.allDorms')}
                                    small
                                />
                            </div>
                            <div>
                                <label className="block text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1.5">{t('dorms.plotting.gender')}</label>
                                <RichSelect
                                    value={selectedGenderFilter}
                                    onChange={(val) => { setSelectedGenderFilter(val); setPage(1); }}
                                    options={[
                                        { id: '', name: t('dorms.plotting.allGenders') },
                                        { id: 'putra', name: t('dorms.plotting.male') },
                                        { id: 'putri', name: t('dorms.plotting.female') },
                                    ]}
                                    placeholder={t('dorms.plotting.allGenders')}
                                    small
                                />
                            </div>
                            <div>
                                <label className="block text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1.5">{t('dorms.plotting.building')}</label>
                                <RichSelect
                                    value={selectedBuildingFilter}
                                    onChange={(val) => { setSelectedBuildingFilter(val); setPage(1); }}
                                    options={[
                                        { id: '', name: t('dorms.plotting.allBuildings') },
                                        ...buildingOptions.map(b => ({ id: b, name: b }))
                                    ]}
                                    placeholder={t('dorms.plotting.allBuildings')}
                                    small
                                />
                            </div>
                            <div className="flex items-end justify-end">
                                <button onClick={() => setShowAdvFilter(false)}
                                    className="h-9 px-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[9px] font-black uppercase tracking-widest text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] transition-all">
                                    {t('dorms.plotting.closePanel')}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ── CARD 2: DATA CONTAINER ── */}
            <div className="glass rounded-[1.5rem] border border-[var(--color-border)] overflow-hidden">
                {loading ? (
                    <div className="p-4 sm:p-5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {[1, 2, 3, 4, 5, 6].map(i => (
                                <div key={i} className="h-24 rounded-2xl bg-[var(--color-surface-alt)] animate-pulse border border-[var(--color-border)]" />
                            ))}
                        </div>
                    </div>
                ) : filteredStudents.length === 0 ? (
                    <div className="p-4 sm:p-5">
                        <EmptyState
                            variant="plain"
                            icon={Search}
                            title={t('dorms.plotting.notFound')}
                            description={t('dorms.plotting.notFoundDesc')}
                            action={
                                <button
                                    onClick={() => {
                                        setSearchQuery('')
                                        setSelectedClassFilter('')
                                        setSelectedRoomTab('All')
                                        setSelectedGenderFilter('')
                                        setSelectedBuildingFilter('')
                                        setPage(1)
                                    }}
                                    className="h-9 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest border border-[var(--color-border)] hover:bg-[var(--color-surface-alt)] transition"
                                >
                                    {t('dorms.plotting.resetFilter')}
                                </button>
                            }
                        />
                    </div>
                ) : viewMode === 'cards' ? (
                    <div className="p-4 sm:p-5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {paginatedStudents.map(student => {
                                const room = student.metadata?.kamar
                                const isSelected = selectedIds.includes(student.id)
                                return (
                                    <div
                                        key={student.id}
                                        className={`p-4 rounded-2xl border bg-[var(--color-surface)] flex flex-col justify-between gap-3 group hover:scale-[1.01] transition duration-300 ${isSelected ? 'border-[var(--color-primary)] ring-1 ring-[var(--color-primary)]/10 shadow-sm' : 'border-[var(--color-border)] hover:border-[var(--color-border-hover)]'}`}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-start gap-3 min-w-0">
                                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${room ? 'bg-indigo-500/10 text-indigo-600' : 'bg-amber-500/10 text-amber-500'}`}>
                                                    <User className="w-4.5 h-4.5" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-[12px] font-black text-[var(--color-text)] truncate">{isPrivacyMode ? maskName(student.name) : student.name}</p>
                                                    <p className="text-[9px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider mt-0.5">{student.classes?.name || t('dorms.plotting.classEmpty')}</p>
                                                </div>
                                            </div>
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => toggleSelect(student.id)}
                                                className="w-4 h-4 rounded border-[var(--color-border)] cursor-pointer accent-[var(--color-primary)] mt-1"
                                            />
                                        </div>

                                        <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-3 mt-1">
                                            <div>
                                                <p className="text-[8px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">{t('dorms.plotting.kamarOccupancy')}</p>
                                                {room ? (
                                                    (() => {
                                                        const roomDetails = dorms.find(d => d.id === room)
                                                        const cap = roomDetails?.capacity || 30
                                                        const occupiedCount = students.filter(s => s.metadata?.kamar === room).length
                                                        return (
                                                            <p className="text-[11px] font-black mt-0.5 text-indigo-600 flex items-center gap-1">
                                                                <span>{room}</span>
                                                                <span className="text-[9px] text-[var(--color-text-muted)] font-black opacity-60">({occupiedCount}/{cap})</span>
                                                            </p>
                                                        )
                                                    })()
                                                ) : (
                                                    <p className="text-[11px] font-black mt-0.5 text-amber-500">
                                                        {t('dorms.plotting.unassigned')}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                {room && (
                                                    <button
                                                        onClick={() => handleOpenEvictModal(student)}
                                                        title={t('dorms.plotting.evictTooltip')}
                                                        className="w-8 h-8 flex items-center justify-center rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-red-500 hover:border-red-500/30 hover:bg-red-500/5 active:scale-95 transition-all"
                                                    >
                                                        <UserMinus className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleOpenAssignModal(student)}
                                                    className="h-8 px-3.5 flex items-center gap-1.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)]/30 active:scale-95 transition-all"
                                                >
                                                    <ArrowRightLeft className="w-3 h-3" />
                                                    {t('dorms.plotting.assignTooltip')}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[750px]">
                            <thead className="bg-[var(--color-surface-alt)]/60 border-b border-[var(--color-border)]">
                                <tr>
                                    <th className="px-5 py-3.5 w-12 text-center">
                                        <input
                                            type="checkbox"
                                            checked={allSelected}
                                            onChange={toggleAll}
                                            className="w-4 h-4 rounded border-[var(--color-border)] cursor-pointer accent-[var(--color-primary)]"
                                        />
                                    </th>
                                    <th className="px-5 py-3.5 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] w-[35%]">{t('dorms.plotting.thSantri')}</th>
                                    <th className="px-5 py-3.5 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] w-[20%]">{t('dorms.plotting.thStatus')}</th>
                                    <th className="px-5 py-3.5 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] w-[30%]">{t('dorms.plotting.thKamarOccupancy')}</th>
                                    <th className="px-5 py-3.5 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] text-center w-36">{t('dorms.plotting.thAction')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--color-border)]">
                                {paginatedStudents.map((student) => {
                                    const room = student.metadata?.kamar
                                    const isSelected = selectedIds.includes(student.id)
                                    return (
                                        <tr key={student.id} className={`transition-colors ${isSelected ? 'bg-[var(--color-primary)]/5' : 'hover:bg-[var(--color-surface-alt)]/25'}`}>
                                            <td className="px-5 py-3.5 text-center">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => toggleSelect(student.id)}
                                                    className="w-4 h-4 rounded border-[var(--color-border)] cursor-pointer accent-[var(--color-primary)]"
                                                />
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-2.5">
                                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-[11px] flex-shrink-0 ${room ? 'bg-indigo-500/10 text-indigo-600' : 'bg-amber-500/10 text-amber-600'}`}>
                                                        {student.name[0].toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black text-[var(--color-text)] leading-tight whitespace-nowrap">{isPrivacyMode ? maskName(student.name) : student.name}</p>
                                                        <p className="text-[9px] text-[var(--color-text-muted)] font-black uppercase tracking-wider opacity-50 mt-0.5">{student.classes?.name || t('dorms.plotting.classEmpty')}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                {room ? (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-xl text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 border border-emerald-500/25">
                                                        {t('dorms.plotting.badgeAssigned')}
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-xl text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-600 border border-dashed border-amber-500/25">
                                                        {t('dorms.plotting.badgeUnassigned')}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-5 py-3.5">
                                                {(() => {
                                                    if (!room) {
                                                        return (
                                                            <span className="text-xs font-bold text-[var(--color-text-muted)]/50">—</span>
                                                        )
                                                    }
                                                    const roomDetails = dorms.find(d => d.id === room)
                                                    const cap = roomDetails?.capacity || 30
                                                    const occupiedCount = students.filter(s => s.metadata?.kamar === room).length
                                                    return (
                                                        <div className="flex flex-col gap-0.5">
                                                            <span className="text-xs font-black text-indigo-600 flex items-center gap-1.5">
                                                                <Bed className="w-3.5 h-3.5 opacity-70" />
                                                                {room}
                                                            </span>
                                                            <span className="text-[10px] text-[var(--color-text-muted)] font-black opacity-60">
                                                                {occupiedCount} / {cap} {t('dorms.plotting.occupied')}
                                                            </span>
                                                        </div>
                                                    )
                                                })()}
                                            </td>
                                            <td className="px-5 py-3.5 text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <button
                                                        onClick={() => handleOpenAssignModal(student)}
                                                        title={t('dorms.plotting.assignTooltipTable')}
                                                        className="w-7 h-7 flex items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 transition-all"
                                                    >
                                                        <ArrowRightLeft className="w-3.5 h-3.5" />
                                                    </button>
                                                    {room ? (
                                                        <button
                                                            onClick={() => handleOpenEvictModal(student)}
                                                            title={t('dorms.plotting.evictTooltip')}
                                                            className="w-7 h-7 flex items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:text-red-500 hover:bg-red-500/5 transition-all"
                                                        >
                                                            <UserMinus className="w-3.5 h-3.5" />
                                                        </button>
                                                    ) : (
                                                        <button
                                                            disabled
                                                            className="w-7 h-7 rounded-lg opacity-0 pointer-events-none flex-shrink-0 inline-flex items-center justify-center"
                                                        >
                                                            <UserMinus className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination Footer */}
                {filteredStudents.length > 0 && (
                    <Pagination
                        totalRows={filteredStudents.length}
                        page={page}
                        pageSize={pageSize}
                        setPage={setPage}
                        setPageSize={setPageSize}
                        label={t('dorms.plotting.paginationLabel')}
                        jumpPage={jumpPage}
                        setJumpPage={setJumpPage}
                    />
                )}
            </div>

            {/* Floating Bulk Actions Bar */}
            <BulkActionsBar
                selectedCount={selectedIds.length}
                onClear={() => setSelectedIds([])}
                title={t('dorms.plotting.selected')}
                subtitle={t('dorms.plotting.bulkActionsSubtitle')}
            >
                <button
                    onClick={() => { setSelectedBulkRoom(''); setIsBulkAssignModalOpen(true); }}
                    className="h-9 px-4 rounded-xl transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest bg-[var(--color-primary)] text-white hover:scale-105 active:scale-95 justify-center shadow-lg shadow-[var(--color-primary)]/10"
                >
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                    <span>{t('dorms.plotting.bulkAssign')} ({selectedIds.length})</span>
                </button>
                <button
                    onClick={handleBulkUnassign}
                    className="h-9 px-4 rounded-xl transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500 hover:text-white justify-center shadow-lg shadow-rose-500/5"
                >
                    <UserMinus className="w-3.5 h-3.5" />
                    <span>{t('dorms.plotting.bulkEvict')}</span>
                </button>
            </BulkActionsBar>
        </div>
    )
}
