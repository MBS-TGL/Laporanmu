import React from 'react'
import { EmptyState } from '@shared/components/DataDisplay'
import RichSelect from '@shared/components/RichSelect'
import RichDatePicker from '@shared/components/RichDatePicker'
import { useLanguage } from '@context/Language'
import {
    Bed, Plus, X, ClipboardList, Trash2, Award, ShieldAlert
} from 'lucide-react'

export default function DormTabCleanliness({
    setIsAuditModalOpen,
    auditRoomFilter,
    setAuditRoomFilter,
    dorms,
    auditDateFrom,
    setAuditDateFrom,
    auditDateTo,
    setAuditDateTo,
    filteredAudits,
    audits,
    handleOpenDeleteAuditModal
}) {
    const { t, tNum } = useLanguage()
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 animate-in fade-in duration-300">
            {/* Room Rating Cleanliness Scorecard */}
            <div className="lg:col-span-2 space-y-4">
                <div className="glass rounded-[1.5rem] p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                        <div>
                            <p className="text-[13px] font-black text-[var(--color-text)]">{t('dorms.cleanliness.title')}</p>
                            <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">{t('dorms.cleanliness.subtitle')}</p>
                        </div>
                        <button
                            onClick={() => setIsAuditModalOpen(true)}
                            className="h-9 px-4 rounded-xl bg-[var(--color-primary)] text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-95 shadow-md shadow-[var(--color-primary)]/20 disabled:opacity-40 disabled:cursor-not-allowed border border-white/10"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            {t('dorms.cleanliness.inputRating')}
                        </button>
                    </div>

                    {/* Filter Bar */}
                    <div className="flex flex-wrap items-center gap-2 mb-4 p-3 rounded-xl bg-[var(--color-surface-alt)]/40 border border-[var(--color-border)]">

                        {/* Room Filter — RichSelect compact */}
                        <div className="flex-1 min-w-[110px]">
                            <RichSelect
                                icon={Bed}
                                value={auditRoomFilter}
                                onChange={setAuditRoomFilter}
                                placeholder={t('dorms.cleanliness.allDorms')}
                                options={dorms.map(d => ({ id: d.id, name: d.id }))}
                                extraOption={{ id: '', name: t('dorms.cleanliness.allDorms') }}
                            />
                        </div>

                        {/* Date Range — RichDatePicker */}
                        <div className="flex items-center gap-1.5">
                            <RichDatePicker
                                compact
                                value={auditDateFrom}
                                onChange={setAuditDateFrom}
                                clearable={false}
                                className="w-[190px]"
                            />
                            <span className="text-[10px] text-[var(--color-text-muted)] font-black">{t('dorms.cleanliness.upToDate')}</span>
                            <RichDatePicker
                                compact
                                value={auditDateTo}
                                onChange={setAuditDateTo}
                                clearable={false}
                                className="w-[190px]"
                            />
                        </div>

                        {/* Reset Button */}
                        {(auditRoomFilter || auditDateFrom || auditDateTo) && (
                            <button
                                onClick={() => { setAuditRoomFilter(''); setAuditDateFrom(''); setAuditDateTo(''); }}
                                className="h-8 px-2.5 rounded-xl border border-red-500/20 bg-red-500/5 text-red-500 text-[9px] font-black uppercase tracking-widest hover:bg-red-500/10 transition flex items-center gap-1.5"
                            >
                                <X className="w-3 h-3" /> {t('dorms.cleanliness.reset')}
                            </button>
                        )}

                        <span className="text-[9px] text-[var(--color-text-muted)] font-black ml-auto opacity-60">
                            {tNum(filteredAudits.length)} / {tNum(audits.length)} {t('dorms.cleanliness.reportsCount')}
                        </span>
                    </div>

                    <div className="space-y-3">
                        {filteredAudits.length === 0 ? (
                            <EmptyState
                                variant="plain"
                                icon={ClipboardList}
                                title={audits.length === 0 ? t('dorms.cleanliness.noAudits') : t('dorms.cleanliness.notFound')}
                                description={audits.length === 0 ? t('dorms.cleanliness.noAuditsDesc') : t('dorms.cleanliness.notFoundDesc')}
                                action={audits.length === 0 ? (
                                    <button
                                        onClick={() => setIsAuditModalOpen(true)}
                                        className="h-9 px-4 rounded-xl bg-[var(--color-primary)] text-white text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 shadow-lg shadow-[var(--color-primary)]/10 transition flex items-center gap-2 mx-auto"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        {t('dorms.cleanliness.inputRating')}
                                    </button>
                                ) : null}
                            />
                        ) : filteredAudits.map(audit => (
                            <div
                                key={audit.id}
                                className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col sm:flex-row sm:items-center justify-between gap-4 group hover:border-[var(--color-border-hover)] transition"
                            >
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2.5">
                                        <span className="text-[12px] font-black text-[var(--color-text)]">{audit.room}</span>
                                        <span className={`text-[8.5px] font-black px-2 py-0.5 rounded-md ${audit.rating === 'A' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-500'}`}>
                                            {t('dorms.cleanliness.predicate').replace('{rating}', audit.rating)}
                                        </span>
                                    </div>
                                    <p className="text-[10.5px] text-[var(--color-text-muted)]">{audit.notes}</p>
                                    
                                    <div className="flex flex-wrap items-center gap-2 pt-1.5">
                                        <span className="text-[9px] text-[var(--color-text-muted)] font-semibold shrink-0">
                                            {t('dorms.cleanliness.dateLabel')}: {audit.date}
                                        </span>
                                        <span className="text-[9px] text-[var(--color-text-muted)] opacity-40 shrink-0">•</span>
                                        
                                        {/* Kerapian */}
                                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-[var(--color-surface-alt)]/60 border border-[var(--color-border)]/40 text-[9px] font-bold">
                                            <span className="text-[var(--color-text-muted)]">{t('dorms.cleanliness.aspectKerapian')}:</span>
                                            <span className="text-[var(--color-text)]">{tNum(audit.aspects?.kerapian || 0)}</span>
                                            <div className="w-8 h-1 bg-[var(--color-border)] rounded-full overflow-hidden shrink-0">
                                                <div 
                                                    className="h-full bg-blue-500 rounded-full" 
                                                    style={{ width: `${audit.aspects?.kerapian || 0}%` }}
                                                />
                                            </div>
                                        </div>

                                        {/* Kebersihan */}
                                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-[var(--color-surface-alt)]/60 border border-[var(--color-border)]/40 text-[9px] font-bold">
                                            <span className="text-[var(--color-text-muted)]">{t('dorms.cleanliness.aspectKebersihan')}:</span>
                                            <span className="text-[var(--color-text)]">{tNum(audit.aspects?.kebersihan || 0)}</span>
                                            <div className="w-8 h-1 bg-[var(--color-border)] rounded-full overflow-hidden shrink-0">
                                                <div 
                                                    className="h-full bg-emerald-500 rounded-full" 
                                                    style={{ width: `${audit.aspects?.kebersihan || 0}%` }}
                                                />
                                            </div>
                                        </div>

                                        {/* Keharuman */}
                                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-[var(--color-surface-alt)]/60 border border-[var(--color-border)]/40 text-[9px] font-bold">
                                            <span className="text-[var(--color-text-muted)]">Keharuman:</span>
                                            <span className="text-[var(--color-text)]">{tNum(audit.aspects?.keharuman || 0)}</span>
                                            <div className="w-8 h-1 bg-[var(--color-border)] rounded-full overflow-hidden shrink-0">
                                                <div 
                                                    className="h-full bg-purple-500 rounded-full" 
                                                    style={{ width: `${audit.aspects?.keharuman || 0}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 justify-between sm:justify-end border-t sm:border-t-0 border-[var(--color-border)] pt-3 sm:pt-0">
                                    <div className="text-right sm:pr-2">
                                        <p className="text-[8px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">{t('dorms.cleanliness.avgScore')}</p>
                                        <div className="flex items-center gap-1.5 justify-end mt-0.5">
                                            <p className="text-xl font-black text-[var(--color-primary)]">{tNum(audit.score)} <span className="text-[10px] font-bold text-[var(--color-text-muted)]">/ {tNum(100)}</span></p>
                                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${audit.score >= 80 ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`} title={audit.score >= 80 ? 'Memenuhi Standar' : 'Di Bawah Standar'} />
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleOpenDeleteAuditModal(audit)}
                                        className="w-8 h-8 rounded-xl bg-red-500/5 hover:bg-red-500/10 text-red-500 transition flex items-center justify-center"
                                        title={t('dorms.cleanliness.deleteTooltip')}
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Best Cleanliness Performance & Guidelines */}
            <div className="space-y-4">
                <div className="glass rounded-[1.5rem] p-5 relative overflow-hidden">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] bg-emerald-500/5 rounded-full blur-[50px] pointer-events-none" />
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                            <Award className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-[12px] font-black text-[var(--color-text)]">{t('dorms.cleanliness.bestRoom')}</p>
                            <p className="text-[9px] text-[var(--color-text-muted)]">{t('dorms.cleanliness.bestRoomSub')}</p>
                        </div>
                    </div>

                    {audits.length === 0 ? (
                        <div className="bg-[var(--color-surface-alt)] border border-dashed border-[var(--color-border)] rounded-2xl p-5 text-center">
                            <p className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">{t('dorms.cleanliness.bestTitle')}</p>
                            <p className="text-[11px] text-[var(--color-text-muted)] mt-2 opacity-60">{t('dorms.cleanliness.noBestRoom')}</p>
                        </div>
                    ) : (() => {
                        const best = audits.reduce((prev, curr) => (curr.score > prev.score ? curr : prev), audits[0])
                        return (
                            <div className="relative bg-gradient-to-br from-amber-500/10 via-yellow-500/5 to-transparent border border-amber-500/20 rounded-2xl p-4 text-center overflow-hidden">
                                <div className="absolute -right-3 -top-3 w-16 h-16 bg-amber-500/10 rounded-full blur-xl pointer-events-none" />
                                <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest flex items-center justify-center gap-1">
                                    <span>🏆</span> {t('dorms.cleanliness.bestTitle')}
                                </p>
                                <p className="text-xl font-black text-[var(--color-text)] mt-1.5">{t('dorms.import.rowNameDorm').replace('{room}', best.room)}</p>
                                <p className="text-[11px] text-[var(--color-text-muted)] mt-1">{best.notes || t('dorms.cleanliness.bestRoomDesc')}</p>
                                <div className="w-fit mx-auto mt-4 bg-gradient-to-r from-amber-500 to-yellow-500 text-white font-black text-xs px-4 py-1.5 rounded-xl shadow-md shadow-amber-500/20">
                                    {t('dorms.cleanliness.bestPoints').replace('{score}', tNum(best.score))}
                                </div>
                            </div>
                        )
                    })()}
                </div>

                <div className="glass rounded-[1.5rem] p-5 space-y-3">
                    <div className="flex items-center gap-2 text-[12px] font-black text-[var(--color-text)]">
                        <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />
                        <span>{t('dorms.cleanliness.guidelines')}</span>
                    </div>
                    <p className="text-[10.5px] text-[var(--color-text-muted)] leading-relaxed">
                        {t('dorms.cleanliness.guidelinesDesc')}
                    </p>
                    <div className="space-y-2 pt-1.5">
                        <div className="flex items-start gap-2.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] mt-1.5 shrink-0" />
                            <p className="text-[10px] text-[var(--color-text)]"><strong>{t('dorms.cleanliness.guidelineKerapian')}</strong> {t('dorms.cleanliness.guidelineKerapianDesc')}</p>
                        </div>
                        <div className="flex items-start gap-2.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] mt-1.5 shrink-0" />
                            <p className="text-[10px] text-[var(--color-text)]"><strong>{t('dorms.cleanliness.guidelineKebersihan')}</strong> {t('dorms.cleanliness.guidelineKebersihanDesc')}</p>
                        </div>
                        <div className="flex items-start gap-2.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] mt-1.5 shrink-0" />
                            <p className="text-[10px] text-[var(--color-text)]"><strong>{t('dorms.cleanliness.guidelineKeharuman')}</strong> {t('dorms.cleanliness.guidelineKeharumanDesc')}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
