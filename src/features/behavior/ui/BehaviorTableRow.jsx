import React from 'react'
import { Eye, Edit2, Trash2 } from 'lucide-react'
import { useLanguage } from '@context/Language'
import { getAvatarColorByName } from '../utils/avatarUtils'

export default function BehaviorTableRow({
    r,
    students,
    violationTypes,
    selectedIds,
    toggleSelect,
    isPrivacyMode,
    visibleCols,
    handleOpenDetail,
    handleEdit,
    setItemToDelete,
    setIsDeleteModalOpen,
}) {
    const { language, t, tNum } = useLanguage()

    const fmtLocale = language === 'ar' ? 'ar-SA' : language === 'en' ? 'en-US' : 'id-ID'
    const fmtTime = (d) => (d ? new Date(d).toLocaleTimeString(fmtLocale, { hour: '2-digit', minute: '2-digit' }) : '')
    const fmtDate = (d) => (d ? new Date(d).toLocaleDateString(fmtLocale, { day: '2-digit', month: 'short', year: 'numeric' }) : '—')

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

    const isP = (r.points ?? 0) > 0
    const s = students.find((x) => x.id === r.student_id)

    return (
        <tr
            className={`transition-colors group/row ${
                selectedIds.includes(r.id) ? 'bg-[var(--color-primary)]/5' : 'hover:bg-[var(--color-surface-alt)]/40'
            }`}
        >
            <td className="px-4 py-3 text-center">
                <input
                    type="checkbox"
                    checked={selectedIds.includes(r.id)}
                    onChange={() => toggleSelect(r.id)}
                    className="w-4 h-4 rounded border-[var(--color-border)] cursor-pointer"
                />
            </td>
            <td className="px-4 py-3">
                <div className="flex items-center gap-2.5">
                    <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-[11px] flex-shrink-0 ${getAvatarColorByName(s?.name).bg} ring-2 ${getAvatarColorByName(s?.name).ring}`}
                    >
                        {(tDb(s?.name) || '?')[0].toUpperCase()}
                    </div>
                    <div>
                        <p className="text-sm font-black text-[var(--color-text)] leading-tight truncate max-w-[200px]">
                            {mask(tDb(s?.name) || '—')}
                        </p>
                        {s?.class_name && (
                            <p className="text-[9px] text-[var(--color-text-muted)] font-black uppercase tracking-wider opacity-50">
                                {s.class_name}
                            </p>
                        )}
                    </div>
                </div>
            </td>
            {visibleCols.type && (
                <td className="px-4 py-3">
                    <p className="text-xs font-bold text-[var(--color-text)]">{getTypeName(r.violation_type_id)}</p>
                    {r.notes && (
                        <p className="text-[10px] text-[var(--color-text-muted)] opacity-60 truncate max-w-[280px]">
                            {mask(tDb(r.notes))}
                        </p>
                    )}
                </td>
            )}
            {visibleCols.points && (
                <td className="px-4 py-3 text-center">
                    <span
                        className={`inline-flex items-center justify-center min-w-[40px] px-2 py-0.5 rounded-full text-[11px] font-black border ${
                            isP ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-red-500/10 text-red-600 border-red-500/20'
                        }`}
                    >
                        {r.points > 0 ? '+' : ''}
                        {tNum(r.points)}
                    </span>
                </td>
            )}
            {visibleCols.time && (
                <td className="px-4 py-3">
                    <p className="text-xs font-bold text-[var(--color-text)]">{fmtDate(r.reported_at)}</p>
                    <p className="text-[10px] text-[var(--color-text-muted)] opacity-50 tabular-nums">{fmtTime(r.reported_at)}</p>
                </td>
            )}
            {visibleCols.teacher && (
                <td className="px-4 py-3">
                    <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wide opacity-50 truncate max-w-[140px]">
                        {mask(r.teacher_name || '—')}
                    </p>
                </td>
            )}
            <td className="px-4 py-3 text-center relative">
                <div className="flex items-center justify-center gap-1 transition-opacity duration-150">
                    <button
                        onClick={() => handleOpenDetail(r)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 transition-all"
                        title={tp('tooltipView')}
                    >
                        <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={() => handleEdit(r)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 transition-all"
                        title={tp('tooltipEdit')}
                    >
                        <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={() => {
                            setItemToDelete(r)
                            setIsDeleteModalOpen(true)
                        }}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:text-red-500 hover:bg-red-500/5 transition-all"
                        title={tp('tooltipDelete')}
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>
            </td>
        </tr>
    )
}
