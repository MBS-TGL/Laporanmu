import React from 'react'
import { EmptyState } from '@shared/components/DataDisplay'
import { useLanguage } from '@context/Language'
import {
    Plus, Bed, ClipboardList, Edit2, Trash2
} from 'lucide-react'

export default function DormTabKelola({
    setEditingDorm,
    setNewDorm,
    setIsDormModalOpen,
    loadingDorms,
    dorms,
    students,
    musyrifList,
    setInventoryModalDorm,
    handleOpenDeleteDormModal
}) {
    const { t, tNum } = useLanguage()
    return (
        <div className="space-y-5 animate-in fade-in duration-300">
            {/* Header toolbar */}
            <div className="glass rounded-[1.5rem] border border-[var(--color-border)] p-4 flex flex-col sm:flex-row items-center justify-between gap-4 bg-[var(--color-surface-alt)]/10">
                <div>
                    <h3 className="text-sm sm:text-base font-bold text-[var(--color-text)]">{t('dorms.manage.title')}</h3>
                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{t('dorms.manage.subtitle')}</p>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 justify-end w-full sm:w-auto">
                    <button
                        onClick={() => {
                            setEditingDorm(null);
                            setNewDorm({ id: '', ar: '', capacity: 30, gender: '', building: '', status: 'active', musyrif_id: '' });
                            setIsDormModalOpen(true);
                        }}
                        className="h-9 px-4 rounded-xl bg-[var(--color-primary)] text-white flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-95 shadow-md shadow-[var(--color-primary)]/20 border border-white/10 text-xs font-bold uppercase tracking-wider whitespace-nowrap flex-1 sm:flex-initial"
                    >
                        <Plus className="w-3.5 h-3.5 shrink-0" />
                        <span className="sm:hidden">{t('dorms.manage.addDorm').split(' ')[0]}</span>
                        <span className="hidden sm:inline">{t('dorms.manage.addDorm')}</span>
                    </button>
                </div>
            </div>

            {/* List/Grid of Dorms */}
            <div className="glass rounded-[1.5rem] border border-[var(--color-border)] overflow-hidden">
                {loadingDorms ? (
                    <div className="py-20 flex flex-col items-center justify-center gap-3">
                        <div className="w-8 h-8 border-3 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
                        <p className="text-xs text-[var(--color-text-muted)] font-bold uppercase tracking-wider">{t('dorms.manage.loading')}</p>
                    </div>
                ) : dorms.length === 0 ? (
                    <EmptyState
                        icon={Bed}
                        title={t('dorms.manage.noDorms')}
                        description={t('dorms.manage.noDormsDesc')}
                    />
                ) : (
                    <>
                        {/* Mobile Card Layout (md:hidden) */}
                        <div className="grid grid-cols-1 gap-3.5 md:hidden p-4 bg-[var(--color-surface-alt)]/20">
                            {dorms.map((room) => {
                                const occupants = students.filter(s => s.metadata?.kamar === room.id)
                                const count = occupants.length
                                const cap = room.capacity || 30
                                const percent = Math.min((count / cap) * 100, 100)
                                const musyrif = musyrifList.find(m => m.id === room.musyrif_id)

                                let progressColor = 'bg-[var(--color-primary)]'
                                if (percent >= 100) progressColor = 'bg-rose-500'
                                else if (percent >= 85) progressColor = 'bg-amber-500'

                                return (
                                    <div 
                                        key={room.id} 
                                        className="bg-[var(--color-surface)] border border-[var(--color-border)]/70 rounded-2xl p-4 space-y-3 shadow-sm transition-all hover:border-[var(--color-border-hover)]"
                                    >
                                        {/* Header Row */}
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0">
                                                    <Bed className="w-4 h-4" />
                                                </div>
                                                <div className="min-w-0">
                                                    <span className="text-sm font-bold text-[var(--color-text)] block leading-tight">{room.id}</span>
                                                    <span className="text-xs text-[var(--color-text-muted)] font-medium uppercase tracking-wider block mt-0.5">
                                                        {room.building || '—'} • {room.gender === 'putra' ? t('dorms.plotting.male') : room.gender === 'putri' ? t('dorms.plotting.female') : t('dorms.plotting.all')}
                                                    </span>
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-center gap-2.5 shrink-0">
                                                <span className="text-xs font-bold text-[var(--color-text-muted)] tracking-wider" dir="rtl">
                                                    {room.ar || '—'}
                                                </span>
                                                {room.status === 'maintenance' ? (
                                                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-rose-500/10 text-rose-600 border border-rose-500/20">
                                                        {t('dorms.manage.statusMaintenance')}
                                                    </span>
                                                ) : room.status === 'full' ? (
                                                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 border border-amber-500/20">
                                                        {t('dorms.manage.statusLocked')}
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                                                        {t('dorms.manage.statusActive')}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="h-px bg-[var(--color-border)]/50" />

                                        {/* Occupancy & PJ Musyrif */}
                                        <div className="grid grid-cols-2 gap-4 text-xs">
                                            <div className="space-y-1">
                                                <span className="block text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Okupansi</span>
                                                <div className="flex items-center gap-1.5">
                                                    <span className={`font-bold ${percent >= 100 ? 'text-rose-500' : percent >= 85 ? 'text-amber-500' : 'text-[var(--color-primary)]'}`}>
                                                        {tNum(count)} / {tNum(cap)}
                                                    </span>
                                                    <span className="text-[var(--color-text-muted)] font-medium">({tNum(Math.round(percent))}%)</span>
                                                </div>
                                                <div className="w-full bg-[var(--color-surface-alt)] h-1.5 rounded-full overflow-hidden mt-1">
                                                    <div className={`${progressColor} h-full transition-all duration-500`} style={{ width: `${percent}%` }} />
                                                </div>
                                            </div>
                                            
                                            <div className="space-y-1">
                                                <span className="block text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">{t('dorms.manage.thMusyrif')}</span>
                                                <span className="font-semibold text-[var(--color-text)] truncate block">
                                                    {musyrif ? musyrif.name : t('dorms.manage.noMusyrif')}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="h-px bg-[var(--color-border)]/50" />

                                        {/* Actions */}
                                        <div className="flex items-center justify-between gap-2 pt-0.5">
                                            <button
                                                onClick={() => setInventoryModalDorm(room)}
                                                className="flex-1 h-8.5 rounded-xl border border-[var(--color-border)] text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] hover:text-indigo-500 hover:bg-indigo-500/5 transition flex items-center justify-center gap-1.5"
                                            >
                                                <ClipboardList className="w-3.5 h-3.5" />
                                                <span>{t('dorms.manage.viewInventory')}</span>
                                            </button>
                                            
                                            <div className="flex items-center gap-1.5">
                                                <button
                                                    onClick={() => {
                                                        setEditingDorm(room);
                                                        setNewDorm({
                                                            id: room.id,
                                                            ar: room.ar || '',
                                                            capacity: room.capacity,
                                                            gender: room.gender || '',
                                                            building: room.building || '',
                                                            status: room.status || 'active',
                                                            musyrif_id: room.musyrif_id || ''
                                                        });
                                                        setIsDormModalOpen(true);
                                                    }}
                                                    className="w-8.5 h-8.5 flex items-center justify-center rounded-xl border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 transition"
                                                    title={t('dorms.manage.editDorm')}
                                                >
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    onClick={() => handleOpenDeleteDormModal(room)}
                                                    className="w-8.5 h-8.5 flex items-center justify-center rounded-xl border border-red-500/20 text-red-500 bg-red-500/5 hover:bg-red-500/10 transition"
                                                    title={t('dorms.manage.deleteDorm')}
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>

                        {/* Desktop Table Layout (hidden md:block) */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[750px]">
                                <thead className="bg-[var(--color-surface-alt)]/60 border-b border-[var(--color-border)]">
                                    <tr>
                                        <th className="px-5 py-3 text-start text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] w-[20%]">{t('dorms.manage.thRoomName')}</th>
                                        <th className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] text-right w-[12%]" dir="rtl">{t('dorms.manage.thRoomArab')}</th>
                                        <th className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] text-center w-[10%]">{t('dorms.manage.thCapacity')}</th>
                                        <th className="px-5 py-3 text-start text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] w-[18%]">{t('dorms.manage.thOccupancy')}</th>
                                        <th className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] text-center w-[10%]">{t('dorms.manage.thStatus')}</th>
                                        <th className="px-5 py-3 text-start text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] w-[18%]">{t('dorms.manage.thMusyrif')}</th>
                                        <th className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] text-center w-28">{t('dorms.manage.thAction')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--color-border)]">
                                    {dorms.map((room) => {
                                        const occupants = students.filter(s => s.metadata?.kamar === room.id)
                                        const count = occupants.length
                                        const cap = room.capacity || 30
                                        const percent = Math.min((count / cap) * 100, 100)

                                        let progressColor = 'bg-[var(--color-primary)]'
                                        if (percent >= 100) progressColor = 'bg-rose-500'
                                        else if (percent >= 85) progressColor = 'bg-amber-500'

                                        return (
                                            <tr key={room.id} className="transition-colors hover:bg-[var(--color-surface-alt)]/25">
                                                <td className="px-5 py-3.5">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center flex-shrink-0">
                                                            <Bed className="w-4 h-4" />
                                                        </div>
                                                        <div>
                                                            <span className="text-sm font-bold text-[var(--color-text)] block leading-tight">{room.id}</span>
                                                            {(room.building || room.gender) && (
                                                                <span className="text-xs text-[var(--color-text-muted)] font-medium uppercase tracking-wider block mt-0.5">
                                                                    {room.building || '—'} • {room.gender === 'putra' ? t('dorms.plotting.male') : room.gender === 'putri' ? t('dorms.plotting.female') : t('dorms.plotting.all')}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-3.5 text-right text-xs font-bold text-[var(--color-text-muted)] tracking-wider" dir="rtl">
                                                    {room.ar || '—'}
                                                </td>
                                                <td className="px-5 py-3.5 text-center text-xs font-bold text-[var(--color-text)]">
                                                    {tNum(cap)} {t('dorms.plotting.paginationLabel')}
                                                </td>
                                                <td className="px-5 py-3.5 min-w-[200px]">
                                                    <div className="space-y-1.5 max-w-[180px]">
                                                        <div className="flex items-center justify-between text-xs font-bold">
                                                            <span className={percent >= 100 ? 'text-rose-500' : percent >= 85 ? 'text-amber-500' : 'text-[var(--color-primary)]'}>
                                                                {tNum(count)} / {tNum(cap)} {t('dorms.manage.occupancyText')}
                                                            </span>
                                                            <span className="text-[10px] text-[var(--color-text-muted)] font-medium">
                                                                {tNum(Math.round(percent))}%
                                                            </span>
                                                        </div>
                                                        <div className="w-full bg-[var(--color-surface-alt)] h-1.5 rounded-full overflow-hidden">
                                                            <div className={`${progressColor} h-full transition-all duration-500`} style={{ width: `${percent}%` }} />
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-3.5 text-center">
                                                    {room.status === 'maintenance' ? (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-rose-500/10 text-rose-600 border border-rose-500/25">
                                                            {t('dorms.manage.statusMaintenance')}
                                                        </span>
                                                    ) : room.status === 'full' ? (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 border border-amber-500/25">
                                                            {t('dorms.manage.statusLocked')}
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 border border-emerald-500/25">
                                                            {t('dorms.manage.statusActive')}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    {(() => {
                                                        const musyrif = musyrifList.find(m => m.id === room.musyrif_id)
                                                        return musyrif ? (
                                                            <span className="text-xs font-bold text-[var(--color-text)]">
                                                                {musyrif.name}
                                                            </span>
                                                        ) : (
                                                            <span className="text-xs text-[var(--color-text-muted)] italic opacity-60">
                                                                {t('dorms.manage.noMusyrif')}
                                                            </span>
                                                        )
                                                    })()}
                                                </td>
                                                <td className="px-5 py-3.5 text-center">
                                                    <div className="flex items-center justify-center gap-1.5">
                                                        {/* Tombol baru — Lihat Inventori */}
                                                        <button
                                                            onClick={() => setInventoryModalDorm(room)}
                                                            className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:text-indigo-500 hover:bg-indigo-500/5 transition-all"
                                                            title={t('dorms.manage.viewInventory')}
                                                        >
                                                            <ClipboardList className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setEditingDorm(room);
                                                                setNewDorm({
                                                                    id: room.id,
                                                                    ar: room.ar || '',
                                                                    capacity: room.capacity,
                                                                    gender: room.gender || '',
                                                                    building: room.building || '',
                                                                    status: room.status || 'active',
                                                                    musyrif_id: room.musyrif_id || ''
                                                                });
                                                                setIsDormModalOpen(true);
                                                            }}
                                                            className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 transition-all"
                                                            title={t('dorms.manage.editDorm')}
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleOpenDeleteDormModal(room)}
                                                            className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:text-red-500 hover:bg-red-500/5 transition-all"
                                                            title={t('dorms.manage.deleteDorm')}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}
