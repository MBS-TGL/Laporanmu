import React, { memo, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faEdit, faTrash, faMars, faVenus, faBoxArchive,
    faUserTie, faThumbtack, faShieldHalved, faIdCard, faClockRotateLeft
} from '@fortawesome/free-solid-svg-icons'
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons'

export const STATUS_CONFIG = {
    active: { label: 'Aktif', color: 'bg-emerald-500/10 text-emerald-600' },
    inactive: { label: 'Nonaktif', color: 'bg-rose-500/10 text-rose-600' },
    cuti: { label: 'Cuti', color: 'bg-amber-500/10 text-amber-600' },
}

// ─── Avatar — handles error state, no gradient bleed ──────────────────────────
function Avatar({ url, name, size = 'w-10 h-10', textSize = 'text-xs', rounded = 'rounded-full' }) {
    const [imgError, setImgError] = useState(false)
    const letter = name?.charAt(0)?.toUpperCase() || '?'
    const showImg = url && !imgError
    return (
        <div className={`${size} ${rounded} overflow-hidden shrink-0 flex items-center justify-center font-black shadow-sm relative cursor-pointer transition-transform hover:scale-110
            ${showImg ? 'bg-[var(--color-surface-alt)]' : 'bg-gradient-to-br from-[var(--color-primary)]/10 to-[var(--color-accent)]/10 text-[var(--color-primary)]'}`}>
            {showImg
                ? <img src={url} alt={name} className="w-full h-full object-cover relative z-10" onError={() => setImgError(true)} />
                : <span className={`${textSize} relative z-10`}>{letter}</span>
            }
        </div>
    )
}

// ─── Desktop Row ─────────────────────────────────────────────────────────────
const TeacherRow = memo(({
    teacher,
    selectedIds,
    toggleSelect,
    visibleCols,
    isPrivacyMode,
    disp,
    openProfile,
    handleEdit,
    handleTogglePin,
    handleQuickStatus,
    setTeacherToAction,
    setIsArchiveModalOpen,
    setIsDeleteModalOpen,
    quickStatusId,
    setQuickStatusId,
    quickStatusRef,
}) => {
    const isSelected = selectedIds.includes(teacher.id)

    return (
        <tr className={`border-t border-[var(--color-border)] transition-colors group/row
            ${isSelected ? 'bg-[var(--color-primary)]/5' : 'hover:bg-[var(--color-surface-alt)]/40'}
            ${teacher.is_pinned ? 'bg-amber-500/[0.04] border-l-2 border-l-amber-400' : ''}
        `}>
            <td className="px-6 py-4">
                <div className="flex items-center gap-2">
                    <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(teacher.id)} className="w-4 h-4 rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)] accent-[var(--color-primary)] cursor-pointer" />
                    <button
                        onClick={() => handleTogglePin(teacher)}
                        title={teacher.is_pinned ? 'Unpin guru' : 'Pin ke atas'}
                        className={`w-5 h-5 rounded-md flex items-center justify-center transition-all
                            ${teacher.is_pinned
                                ? 'text-amber-500 opacity-100'
                                : 'text-[var(--color-text-muted)] opacity-0 group-hover/row:opacity-100 hover:text-amber-500'
                            }`}
                    >
                        <FontAwesomeIcon
                            icon={faThumbtack}
                            className={`text-[9px] transition-transform ${teacher.is_pinned ? 'rotate-0' : 'rotate-45'}`}
                        />
                    </button>
                </div>
            </td>
            <td className="px-6 py-4">
                <div className="flex items-start gap-3">
                    <div className="relative shrink-0">
                        <Avatar url={teacher.avatar_url} name={teacher.name} />
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                        <button onClick={() => openProfile(teacher)} className="font-extrabold text-sm text-[var(--color-text)] hover:text-[var(--color-primary)] transition-colors text-left leading-snug truncate">
                            {teacher.name}
                        </button>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            {teacher.nbm && <p className="text-[10px] text-[var(--color-text-muted)] font-mono opacity-60 uppercase tracking-wider">{teacher.nbm}</p>}
                            <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-widest border ${teacher.type === 'karyawan' ? 'bg-blue-500/10 text-blue-600 border-blue-500/20' : 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20'}`}>
                                {teacher.type === 'karyawan' ? 'Karyawan' : 'Guru'}
                            </span>
                        </div>
                    </div>
                </div>
            </td>
            {visibleCols.nbm && <td className="px-6 py-4 text-xs text-[var(--color-text-muted)] font-mono">{disp(teacher.nbm)}</td>}
            {visibleCols.subject && <td className="px-6 py-4">{teacher.subject ? <span className="px-2.5 py-1 rounded-md bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/20 text-[10px] font-black uppercase tracking-widest">{teacher.subject}</span> : <span className="text-xs text-[var(--color-text-muted)]">—</span>}</td>}
            {visibleCols.gender && <td className="px-6 py-4 text-left"><span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm shadow-inner border transition-all ${teacher.gender === 'L' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' : teacher.gender === 'P' ? 'bg-pink-500/10 text-pink-500 border-pink-500/20' : 'bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] border-transparent'}`}><FontAwesomeIcon icon={teacher.gender === 'L' ? faMars : faVenus} /></span></td>}
            {visibleCols.contact && (
                <td className="px-6 py-4 space-y-1">
                    {teacher.phone && <a href={`https://wa.me/${teacher.phone.replace(/^0/, '62')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-green-600 hover:text-green-700 font-bold w-fit"><FontAwesomeIcon icon={faWhatsapp} className="text-sm" />{disp(teacher.phone)}</a>}
                    {teacher.email && <p className="text-xs text-[var(--color-text-muted)] truncate max-w-[180px]">{disp(teacher.email)}</p>}
                    {!teacher.phone && !teacher.email && <span className="text-xs text-[var(--color-text-muted)]">—</span>}
                </td>
            )}
            {visibleCols.status && (
                <td className="px-6 py-4 text-left">
                    <div className="relative" ref={quickStatusId === teacher.id ? quickStatusRef : null}>
                        <button onClick={() => setQuickStatusId(quickStatusId === teacher.id ? null : teacher.id)}
                            className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider cursor-pointer hover:opacity-80 transition-all ${STATUS_CONFIG[teacher.status]?.color}`}>
                            {STATUS_CONFIG[teacher.status]?.label}
                        </button>
                        {quickStatusId === teacher.id && (
                            <div className="absolute top-8 left-0 z-30 w-36 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                {Object.entries(STATUS_CONFIG).filter(([k]) => k !== teacher.status).map(([k, v]) => (
                                    <button key={k} onClick={() => handleQuickStatus(teacher, k)} className="w-full px-3 py-2 text-left text-[10px] font-black hover:bg-[var(--color-surface-alt)] transition-all flex items-center gap-2">
                                        <span className={v.color}>{v.label}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </td>
            )}
            {visibleCols.join && <td className="px-6 py-4 text-xs text-[var(--color-text-muted)]">{teacher.join_date ? new Date(teacher.join_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</td>}
            <td className="px-6 py-4">
                <div className="flex items-center justify-center gap-1">
                    <button onClick={() => openProfile(teacher)} title="Lihat Profil" className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-emerald-500 hover:bg-emerald-500/10 transition-all text-sm">
                        <FontAwesomeIcon icon={faUserTie} />
                    </button>
                    <button
                        disabled={!teacher.phone}
                        onClick={() => teacher.phone && window.open(`https://wa.me/${teacher.phone.replace(/^0/, '62')}`, '_blank')}
                        title={teacher.phone ? "Hubungi via WhatsApp" : "Nomer WA belum diatur"}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all text-sm
                            ${teacher.phone
                                ? 'text-[var(--color-text-muted)] hover:text-emerald-600 hover:bg-emerald-500/10'
                                : 'text-slate-400 opacity-60 grayscale cursor-not-allowed'}`}
                    >
                        <FontAwesomeIcon icon={faWhatsapp} />
                    </button>
                    {handleEdit && (
                        <button onClick={() => handleEdit(teacher)} title="Edit" className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-blue-500 hover:bg-blue-500/10 transition-all text-sm">
                            <FontAwesomeIcon icon={faEdit} />
                        </button>
                    )}
                    <button onClick={() => openProfile(teacher, 'audit')} title="Audit Trail" className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-purple-500 hover:bg-purple-500/10 transition-all text-sm">
                        <FontAwesomeIcon icon={faShieldHalved} />
                    </button>
                    {setIsArchiveModalOpen && (
                        <button onClick={() => { setTeacherToAction(teacher); setIsArchiveModalOpen(true) }} title="Arsipkan" className="w-8 h-8 rounded-lg flex items-center justify-center text-red-400 hover:text-red-500 hover:bg-red-500/10 transition-all text-sm">
                            <FontAwesomeIcon icon={faBoxArchive} />
                        </button>
                    )}
                </div>
            </td>
        </tr>
    )
})

// ─── Mobile Card ─────────────────────────────────────────────────────────────
const TeacherMobileCard = memo(({
    teacher,
    selectedIds,
    toggleSelect,
    isPrivacyMode,
    disp,
    openProfile,
    handleEdit,
    handleTogglePin,
    setTeacherToAction,
    setIsArchiveModalOpen,
}) => {
    const isSelected = selectedIds.includes(teacher.id)

    return (
        <div className={`p-4 transition-colors ${isSelected ? 'bg-[var(--color-primary)]/5' : ''} ${teacher.is_pinned ? 'bg-amber-500/[0.04] border-l-4 border-l-amber-400' : ''}`}>
            <div className="flex items-start gap-3">
                <div className="flex flex-col items-center gap-3">
                    <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(teacher.id)} className="w-4 h-4 rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)] accent-[var(--color-primary)] cursor-pointer shrink-0 mt-1" />
                    <button
                        onClick={() => handleTogglePin(teacher)}
                        className={`w-6 h-6 rounded-md flex items-center justify-center transition-all ${teacher.is_pinned ? 'text-amber-500' : 'text-[var(--color-text-muted)] opacity-40'}`}
                    >
                        <FontAwesomeIcon icon={faThumbtack} className={`text-[10px] ${teacher.is_pinned ? '' : 'rotate-45'}`} />
                    </button>
                </div>
                <div className="relative shrink-0">
                    <Avatar url={teacher.avatar_url} name={teacher.name} size="w-12 h-12" textSize="text-sm" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                            <button onClick={() => openProfile(teacher)} className="font-extrabold text-sm text-[var(--color-text)] hover:text-[var(--color-primary)] text-left truncate block w-full">{teacher.name}</button>
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                {teacher.subject && <span className="px-2 py-0.5 rounded-md bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/20 text-[9px] font-black uppercase tracking-widest">{teacher.subject}</span>}
                                <span className={`px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-widest ${STATUS_CONFIG[teacher.status]?.color}`}>{STATUS_CONFIG[teacher.status]?.label}</span>
                                <span className={`px-2 py-0.5 rounded-md border text-[9px] font-black uppercase tracking-widest ${teacher.type === 'karyawan' ? 'bg-blue-500/10 text-blue-600 border-blue-500/20' : 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20'}`}>
                                    {teacher.type === 'karyawan' ? 'Karyawan' : 'Guru'}
                                </span>
                            </div>
                            <p className="text-[10px] text-[var(--color-text-muted)] font-mono mt-1 opacity-60 uppercase tracking-widest">{teacher.nbm || 'NO NBM'}</p>
                        </div>
                        <div className="flex items-center gap-1">
                            <button onClick={() => openProfile(teacher)} className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]"><FontAwesomeIcon icon={faUserTie} className="text-xs" /></button>
                            {handleEdit && <button onClick={() => handleEdit(teacher)} className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]"><FontAwesomeIcon icon={faEdit} className="text-xs" /></button>}
                        </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                        <button
                            disabled={!teacher.phone}
                            onClick={() => teacher.phone && window.open(`https://wa.me/${teacher.phone.replace(/^0/, '62')}`, '_blank')}
                            className={`flex-1 h-9 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all
                                ${teacher.phone ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 active:scale-95' : 'bg-slate-100 text-slate-400 grayscale opacity-60 cursor-not-allowed'}`}
                        >
                            <FontAwesomeIcon icon={faWhatsapp} className="text-xs" /> WhatsApp
                        </button>
                        {setIsArchiveModalOpen && <button onClick={() => { setTeacherToAction(teacher); setIsArchiveModalOpen(true) }} className="flex-1 h-9 rounded-xl bg-red-500/10 text-red-600 border border-red-500/20 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all"><FontAwesomeIcon icon={faBoxArchive} className="text-xs" /> Arsipkan</button>}
                    </div>
                </div>
            </div>
        </div>
    )
})

export { TeacherRow, TeacherMobileCard }