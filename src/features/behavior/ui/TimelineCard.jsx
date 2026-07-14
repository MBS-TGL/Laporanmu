import React from 'react'
import { Eye, Edit2, Trash2, CheckCircle2 } from 'lucide-react'
import { useLanguage } from '@context/Language'
import { getAvatarColorByName } from '../utils/avatarUtils'

export default function TimelineCard({
    r,
    students,
    violationTypes,
    isPrivacyMode,
    selectedIds,
    pressingId,
    handleCardPressStart,
    handleCardPressEnd,
    handleCardPressCancel,
    toggleSelect,
    handleOpenDetail,
    handleEdit,
    setItemToDelete,
    setIsDeleteModalOpen,
}) {
    const { language, t, tNum } = useLanguage()

    const fmtLocale = language === 'ar' ? 'ar-SA' : language === 'en' ? 'en-US' : 'id-ID'
    const fmtTime = (d) => (d ? new Date(d).toLocaleTimeString(fmtLocale, { hour: '2-digit', minute: '2-digit' }) : '')

    const tDb = (text) => {
        if (!text) return text
        const key = `db.${text}`
        const val = t(key)
        return val === key ? text : val
    }

    const tp = (key) => t(`behavior.${key}`)

    const mask = (str, visibleLen = 3) => {
        if (!isPrivacyMode || !str) return str
        if (str.length <= visibleLen) return str[0] + '*'.repeat(Math.max(0, str.length - 1))
        return str.substring(0, visibleLen) + '***'
    }

    const getTypeName = (id) => {
        const name = violationTypes.find((vt) => vt.id === id)?.name ?? '—'
        return tDb(name)
    }

    const isPos = (r.points ?? 0) > 0
    const stud = students.find((x) => x.id === r.student_id)

    const cardRef = React.useRef(null)

    React.useEffect(() => {
        const el = cardRef.current
        if (!el) return

        const onTouchStart = (e) => handleCardPressStart(e, r.id)
        const onTouchEnd = (e) => handleCardPressEnd(e, r.id, r)
        const onTouchMove = () => handleCardPressCancel()

        el.addEventListener('touchstart', onTouchStart, { passive: true })
        el.addEventListener('touchend', onTouchEnd, { passive: true })
        el.addEventListener('touchmove', onTouchMove, { passive: true })

        return () => {
            el.removeEventListener('touchstart', onTouchStart)
            el.removeEventListener('touchend', onTouchEnd)
            el.removeEventListener('touchmove', onTouchMove)
        }
    }, [r.id, r, handleCardPressStart, handleCardPressEnd, handleCardPressCancel])

    return (
        <div className="relative group/item -ml-[28px] pl-[28px] sm:-ml-[64px] sm:pl-[64px]">
            {/* Time — right-aligned in 0→36px zone. Hidden on mobile. */}
            <div className="absolute pointer-events-none hidden sm:flex items-center justify-end left-0 top-1/2 -translate-y-1/2 w-[36px] z-[1]">
                <span className="text-[10px] font-black uppercase tracking-wider tabular-nums leading-none text-[var(--color-text-muted)] opacity-40 group-hover/item:opacity-75 transition-opacity">
                    {fmtTime(r.reported_at)}
                </span>
            </div>

            {/* Small colored dot — centered at line on desktop/mobile */}
            <div
                className="absolute pointer-events-none left-[10px] sm:left-[44px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full z-[1] border-2 border-[var(--color-surface)] shadow-[0_0_8px_currentColor] transition-transform duration-200 group-hover/item:scale-125"
                style={{
                    background: isPos ? '#10b981' : '#ef4444',
                    color: isPos ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)',
                }}
            />

            {/* Card — z=2 so it renders over the line/dot visually */}
            <div
                ref={cardRef}
                style={{ position: 'relative', zIndex: 2 }}
                onMouseDown={(e) => handleCardPressStart(e, r.id)}
                onMouseUp={(e) => handleCardPressEnd(e, r.id, r)}
                onMouseLeave={handleCardPressCancel}
                onContextMenu={(e) => {
                    if (window.innerWidth < 640) e.preventDefault()
                }}
                className={`rounded-2xl border px-4 py-3.5 transition-all duration-200 select-none sm:select-text ${
                    pressingId === r.id ? 'scale-[0.98]' : 'hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/[0.015]'
                } ${
                    selectedIds.includes(r.id)
                        ? 'bg-[var(--color-primary)]/[0.03] border-[var(--color-primary)]/40 ring-2 ring-[var(--color-primary)]/10 shadow-sm shadow-[var(--color-primary)]/5'
                        : isPos
                        ? 'bg-[var(--color-surface)] border-[var(--color-border)] hover:border-emerald-500/30 hover:bg-emerald-500/[0.01]'
                        : 'bg-[var(--color-surface)] border-[var(--color-border)] hover:border-rose-500/30 hover:bg-rose-500/[0.01]'
                }`}
            >
                {pressingId === r.id && (
                    <div className="absolute top-0 left-0 right-0 h-1 bg-[var(--color-primary)]/10 overflow-hidden rounded-t-2xl z-[10]">
                        <div
                            className="h-full bg-gradient-to-r from-[var(--color-primary)]/60 to-[var(--color-primary)]"
                            style={{
                                animation: 'longpress-progress 800ms linear forwards',
                            }}
                        />
                    </div>
                )}

                {/* ── DESKTOP layout ─────────────────────── */}
                <div className="hidden sm:flex items-center gap-3">
                    {/* Checkbox */}
                    <input
                        type="checkbox"
                        checked={selectedIds.includes(r.id)}
                        onChange={() => toggleSelect(r.id)}
                        className="w-4 h-4 flex-shrink-0 rounded-md border-[var(--color-border)]/80 text-[var(--color-primary)] focus:ring-[var(--color-primary)]/20 cursor-pointer transition-all hover:scale-105"
                    />
                    {/* Avatar */}
                    <div
                        className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center font-black text-xs shadow-inner ${getAvatarColorByName(stud?.name).bg} ring-2 ${getAvatarColorByName(stud?.name).ring}`}
                    >
                        {(tDb(stud?.name) || '?')[0].toUpperCase()}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-black text-[var(--color-text)] tracking-tight leading-none group-hover/item:text-[var(--color-primary)] transition-colors">
                                {mask(tDb(stud?.name) || '—')}
                            </span>
                            {stud?.class_name && (
                                <span className="px-2 py-0.5 rounded-full bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[8px] font-black text-[var(--color-text-muted)] uppercase tracking-widest flex-shrink-0 shadow-sm">
                                    {stud.class_name}
                                </span>
                            )}
                        </div>
                        <p className="text-[11px] font-bold text-[var(--color-text)] mt-1.5 flex items-center gap-2 leading-none">
                            <span className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${isPos ? 'bg-emerald-500 shadow-[0_0_4px_#10b981]' : 'bg-rose-500 shadow-[0_0_4px_#f43f5e]'}`} />
                            {getTypeName(r.violation_type_id)}
                        </p>
                        {r.notes && (
                            <div className={`mt-2 py-1 px-3 border-l-2 ${isPos ? 'border-emerald-500/40 bg-emerald-500/[0.02]' : 'border-rose-500/40 bg-rose-500/[0.02]'} rounded-r-xl max-w-xl shadow-inner`}>
                                <p className="text-[10px] italic font-semibold text-[var(--color-text-muted)] opacity-85 leading-relaxed break-words">
                                    "{mask(tDb(r.notes))}"
                                </p>
                            </div>
                        )}
                    </div>
                    {/* Points + Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                        <div
                            className={`flex items-center justify-center min-w-[46px] h-6 rounded-full text-[11px] font-black tracking-tight border ${
                                isPos
                                    ? 'bg-gradient-to-r from-emerald-500/10 to-emerald-500/20 text-emerald-600 border-emerald-500/30 shadow-sm shadow-emerald-500/5'
                                    : 'bg-gradient-to-r from-rose-500/10 to-rose-500/20 text-rose-600 border-rose-500/30 shadow-sm shadow-rose-500/5'
                            }`}
                        >
                            {isPos ? '+' : ''}{tNum(r.points)}
                        </div>
                        <button
                            onClick={() => handleOpenDetail(r)}
                            className="w-8 h-8 flex items-center justify-center rounded-xl text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 hover:scale-105 active:scale-95 transition-all"
                            title={tp('tooltipView')}
                        >
                            <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                            onClick={() => handleEdit(r)}
                            className="w-8 h-8 flex items-center justify-center rounded-xl text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 hover:scale-105 active:scale-95 transition-all"
                            title={tp('tooltipEdit')}
                        >
                            <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                            onClick={() => {
                                setItemToDelete(r)
                                setIsDeleteModalOpen(true)
                            }}
                            className="w-8 h-8 flex items-center justify-center rounded-xl text-[var(--color-text-muted)] hover:text-rose-600 hover:bg-rose-600/10 hover:scale-105 active:scale-95 transition-all"
                            title={tp('tooltipDelete')}
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>

                {/* ── MOBILE layout ──────────────────────── */}
                <div className="flex sm:hidden flex-col gap-3">
                    {/* Top: Avatar + Name/Class + Points */}
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                            <div
                                className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center font-black text-xs transition-all duration-200 ${
                                    selectedIds.includes(r.id)
                                        ? 'bg-[var(--color-primary)] text-white shadow-lg shadow-[var(--color-primary)]/20 rotate-0 scale-100'
                                        : `${getAvatarColorByName(stud?.name).bg} ring-2 ${getAvatarColorByName(stud?.name).ring}`
                                }`}
                            >
                                {selectedIds.includes(r.id) ? (
                                    <CheckCircle2 className="w-4 h-4 animate-in zoom-in-50 duration-200" />
                                ) : (
                                    (tDb(stud?.name) || '?')[0].toUpperCase()
                                )}
                            </div>
                            <div className="min-w-0">
                                <span className="block text-[13px] font-black text-[var(--color-text)] tracking-tight leading-tight truncate">
                                    {mask(tDb(stud?.name) || '—')}
                                </span>
                                {stud?.class_name && (
                                    <span className="block text-[10px] text-[var(--color-text-muted)] mt-0.5 font-medium truncate">
                                        {stud.class_name}
                                    </span>
                                )}
                            </div>
                        </div>

                        <div
                            className={`shrink-0 flex items-center justify-center min-w-[34px] h-5 rounded-full text-[10px] font-black border ${
                                isPos ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                            }`}
                        >
                            {isPos ? '+' : ''}{tNum(r.points)}
                        </div>
                    </div>

                    {/* Type */}
                    <div className="pl-[42px]">
                        <p className="text-[11px] font-bold text-[var(--color-text)] flex items-center gap-1.5 leading-snug">
                            <span className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${isPos ? 'bg-emerald-500 shadow-[0_0_4px_#10b981]' : 'bg-rose-500 shadow-[0_0_4px_#f43f5e]'}`} />
                            {getTypeName(r.violation_type_id)}
                        </p>
                    </div>

                    {/* Notes */}
                    {r.notes && (
                        <div className="ml-[42px] py-1 px-2.5 border-l-2 border-[var(--color-border)] bg-[var(--color-surface-alt)]/35 rounded-r-lg">
                            <p className="text-[10px] italic font-semibold text-[var(--color-text-muted)] opacity-85 leading-relaxed break-words">
                                "{mask(tDb(r.notes))}"
                            </p>
                        </div>
                    )}

                    {/* Footer: Date/Reporter & Actions */}
                    <div className="flex items-center justify-between gap-2 mt-1 pt-2.5 border-t border-[var(--color-border)]/40 pl-[42px]">
                        <div className="text-[10px] text-[var(--color-text-muted)] font-medium truncate leading-none">
                            {fmtTime(r.reported_at)}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                            <button
                                onClick={() => handleOpenDetail(r)}
                                className="w-7 h-7 flex items-center justify-center rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)]/30 active:scale-95 transition-all"
                                title={tp('tooltipView')}
                            >
                                <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={() => handleEdit(r)}
                                className="w-7 h-7 flex items-center justify-center rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)]/30 active:scale-95 transition-all"
                                title={tp('tooltipEdit')}
                            >
                                <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={() => {
                                    setItemToDelete(r)
                                    setIsDeleteModalOpen(true)
                                }}
                                className="w-7 h-7 flex items-center justify-center rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-rose-600 hover:border-rose-500/40 active:scale-95 transition-all"
                                title={tp('tooltipDelete')}
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
