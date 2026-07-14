import React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faEdit, faTrash, faUsers, faMars, faVenus, faBed, faBuilding, faCalendarAlt, faEye, faEyeSlash, faChevronRight
} from '@fortawesome/free-solid-svg-icons'

export const ClassRow = React.memo(({
    cls,
    selectedIds,
    toggleSelect,
    visibleCols,
    handleEdit,
    setItemToDelete,
    setIsDeleteModalOpen,
    isPrivacyMode
}) => {
    const isSelected = selectedIds.includes(cls.id)
    const isNoTeacher = !cls.homeroom_teacher_id || cls.teacherName === '—'
    const isCrowded = (cls.students || 0) > 35

    const maskInfo = (str, visibleLen = 3) => {
        if (!str) return '---'
        if (str.length <= visibleLen) return str[0] + '*'.repeat(str.length - 1)
        return str.substring(0, visibleLen) + '***'
    }

    return (
        <tr className={`border-t border-[var(--color-border)] hover:bg-[var(--color-surface-alt)]/40 transition-colors group/row ${isSelected ? 'bg-[var(--color-primary)]/[0.04]' : ''}`}>
            <td className="px-6 py-4 text-center">
                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(cls.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-4 h-4 rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)] accent-[var(--color-primary)] cursor-pointer"
                />
            </td>

            {/* Identity */}
            <td
                className={`px-6 py-4 ${handleEdit ? 'cursor-pointer' : ''}`}
                onClick={handleEdit ? () => handleEdit(cls) : undefined}
                title={handleEdit ? `Edit ${cls.name}` : undefined}
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--color-primary)]/10 to-[var(--color-accent)]/10 flex items-center justify-center text-[var(--color-primary)] text-sm font-black shadow-inner shrink-0 border border-[var(--color-primary)]/20">
                        {cls.grade}
                    </div>
                    <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                            <span className="font-extrabold text-sm text-[var(--color-text)] truncate">{cls.name}</span>
                            {isNoTeacher && (
                                <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-500 text-[8px] font-black uppercase tracking-widest border border-amber-500/20">
                                    Tanpa Wali
                                </span>
                            )}
                            {isCrowded && (
                                <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-600 text-[8px] font-black uppercase tracking-widest border border-rose-500/20">
                                    Padat
                                </span>
                            )}
                        </div>
                        <span className="text-[9px] font-black text-[var(--color-text-muted)] opacity-60 uppercase tracking-widest">
                            LVL {cls.grade} • {cls.major}
                        </span>
                    </div>
                </div>
            </td>

            {/* Level Badge */}
            {visibleCols.level && (
                <td className="px-6 py-4 text-center">
                    <span className="px-2 py-0.5 rounded-md bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-[9px] font-black uppercase tracking-widest border border-[var(--color-primary)]/20">
                        Lvl {cls.grade}
                    </span>
                </td>
            )}

            {/* Program Badge */}
            {visibleCols.program && (
                <td className="px-6 py-4 text-center">
                    {cls.major.includes('Boarding') ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 text-[9px] font-black uppercase border border-amber-500/20 tracking-widest">
                            <FontAwesomeIcon icon={faBed} className="text-[8px]" /> Boarding
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] text-[9px] font-black uppercase border border-[var(--color-border)] tracking-widest">
                            <FontAwesomeIcon icon={faBuilding} className="text-[8px]" /> Reguler
                        </span>
                    )}
                </td>
            )}

            {/* Gender Icon */}
            {visibleCols.gender && (
                <td className="px-6 py-4 text-center">
                    <div className="flex justify-center">
                        {cls.major.includes('Putra') ? (
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs bg-blue-500/10 text-blue-500 border border-blue-500/20 shadow-inner" title="Putra">
                                <FontAwesomeIcon icon={faMars} />
                            </div>
                        ) : cls.major.includes('Putri') ? (
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs bg-pink-500/10 text-pink-500 border border-pink-500/20 shadow-inner" title="Putri">
                                <FontAwesomeIcon icon={faVenus} />
                            </div>
                        ) : (
                            <span className="text-[var(--color-text-muted)] text-[10px] opacity-30">—</span>
                        )}
                    </div>
                </td>
            )}

            {/* Teacher */}
            {visibleCols.teacher && (
                <td className="px-6 py-4">
                    <div className="flex flex-col">
                        <span className="font-bold text-xs text-[var(--color-text)] truncate max-w-[150px]">
                            {isPrivacyMode ? (
                                <span className="inline-flex items-center gap-2">
                                    <FontAwesomeIcon icon={faEyeSlash} className="text-[10px] opacity-50" />
                                    {maskInfo(cls.teacherName, 4)}
                                </span>
                            ) : (cls.teacherName || '—')}
                        </span>
                        <span className="text-[8px] font-black text-[var(--color-text-muted)] uppercase tracking-widest opacity-50">Wali Kelas</span>
                    </div>
                </td>
            )}

            {/* Students Count */}
            {visibleCols.students && (
                <td className="px-6 py-4 text-center">
                    <div className="inline-flex items-center gap-2 bg-[var(--color-surface-alt)]/50 px-2.5 py-1 rounded-md text-[10px] font-black text-[var(--color-text)] border border-[var(--color-border)]">
                        <FontAwesomeIcon icon={faUsers} className="text-[var(--color-primary)] text-[9px]" />
                        {cls.students || 0}
                    </div>
                    {isCrowded && (
                        <div className="mt-1 text-[8px] font-black uppercase tracking-widest text-rose-600 opacity-80">
                            Padat &gt; 35
                        </div>
                    )}
                </td>
            )}

            {/* Academic Year */}
            {visibleCols.year && (
                <td className="px-6 py-4 text-center">
                    <span className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest opacity-70">
                        {cls.academicYearName || '—'}
                    </span>
                </td>
            )}

            {/* Actions */}
            <td className="px-6 py-4 text-center">
                <div className="flex items-center justify-center gap-1 transition-opacity">
                    {handleEdit && (
                        <button
                            onClick={() => handleEdit(cls)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 transition-all text-sm"
                            title="Edit"
                            aria-label={`Edit kelas ${cls.name}`}
                        >
                            <FontAwesomeIcon icon={faEdit} />
                        </button>
                    )}
                    {setItemToDelete && setIsDeleteModalOpen && (
                        <button
                            onClick={() => { setItemToDelete(cls); setIsDeleteModalOpen(true) }}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-red-500 hover:bg-red-500/10 transition-all text-sm"
                            title="Hapus"
                            aria-label={`Hapus kelas ${cls.name}`}
                        >
                            <FontAwesomeIcon icon={faTrash} />
                        </button>
                    )}
                </div>
            </td>
        </tr>
    )
})

export const ClassMobileCard = React.memo(({
    cls,
    selectedIds,
    toggleSelect,
    handleEdit,
    setItemToDelete,
    setIsDeleteModalOpen
}) => {
    const isSelected = selectedIds.includes(cls.id)
    const isNoTeacher = !cls.homeroom_teacher_id || cls.teacherName === '—'
    const isCrowded = (cls.students || 0) > 35
    return (
        <div className={`p-4 transition-all duration-300 border-l-4 ${isSelected ? 'bg-[var(--color-primary)]/[0.03] border-[var(--color-primary)]' : 'bg-[var(--color-surface)] border-transparent active:bg-[var(--color-surface-alt)]/30'}`}>
            <div className="flex items-start gap-3">
                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(cls.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-4 h-4 mt-1 rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)] accent-[var(--color-primary)] cursor-pointer shrink-0"
                />

                {/* Identity */}
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[var(--color-primary)]/10 to-[var(--color-accent)]/10 flex items-center justify-center text-[var(--color-primary)] text-sm font-black shrink-0 border border-[var(--color-primary)]/20 shadow-inner">
                    {cls.grade}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                            <h3 className="font-extrabold text-sm text-[var(--color-text)] truncate">{cls.name}</h3>
                            <div className="flex items-center gap-1.5 mt-1">
                                {cls.major.includes('Boarding') ? (
                                    <span className="px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-600 text-[8px] font-black uppercase tracking-widest border border-amber-500/10">Boarding</span>
                                ) : (
                                    <span className="px-1.5 py-0.5 rounded-md bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] text-[8px] font-black uppercase tracking-widest border border-[var(--color-border)]">Reguler</span>
                                )}
                                {cls.major.includes('Putra') ? (
                                    <span className="px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-600 text-[8px] font-black uppercase tracking-widest border border-blue-500/10">Putra</span>
                                ) : cls.major.includes('Putri') ? (
                                    <span className="px-1.5 py-0.5 rounded-md bg-pink-500/10 text-pink-600 text-[8px] font-black uppercase tracking-widest border border-pink-500/10">Putri</span>
                                ) : null}
                                {isNoTeacher && (
                                    <span className="px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-500 text-[8px] font-black uppercase tracking-widest border border-amber-500/10">Tanpa Wali</span>
                                )}
                                {isCrowded && (
                                    <span className="px-1.5 py-0.5 rounded-md bg-rose-500/10 text-rose-600 text-[8px] font-black uppercase tracking-widest border border-rose-500/10">Padat</span>
                                )}
                            </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                            {handleEdit && <button onClick={() => handleEdit(cls)} className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-primary)] bg-[var(--color-surface-alt)]/50 text-xs transition-all"><FontAwesomeIcon icon={faEdit} /></button>}
                            {setItemToDelete && setIsDeleteModalOpen && <button onClick={() => { setItemToDelete(cls); setIsDeleteModalOpen(true) }} className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-red-500 bg-[var(--color-surface-alt)]/50 text-xs transition-all"><FontAwesomeIcon icon={faTrash} /></button>}
                        </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-4">
                        <div className="space-y-0.5">
                            <p className="text-[8px] font-black text-[var(--color-text-muted)] uppercase tracking-widest opacity-60">Wali Kelas</p>
                            <p className="font-bold text-[11px] text-[var(--color-text)] truncate">{cls.teacherName || '—'}</p>
                        </div>
                        <div className="space-y-0.5 text-right">
                            <p className="text-[8px] font-black text-[var(--color-text-muted)] uppercase tracking-widest opacity-60">Siswa</p>
                            <p className="font-bold text-[11px] text-[var(--color-text)]">
                                <FontAwesomeIcon icon={faUsers} className="text-[var(--color-primary)] mr-1.5 text-[9px]" />
                                {cls.students || 0}
                            </p>
                            {isCrowded && (
                                <p className="text-[8px] font-black uppercase tracking-widest text-rose-600 opacity-80">Padat &gt; 35</p>
                            )}
                        </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-dashed border-[var(--color-border)] flex items-center justify-between text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">
                        <span>Lvl {cls.grade}</span>
                        <span>{cls.academicYearName || '—'}</span>
                    </div>
                </div>
            </div>
        </div>
    )
})

ClassRow.displayName = 'ClassRow'
ClassMobileCard.displayName = 'ClassMobileCard'