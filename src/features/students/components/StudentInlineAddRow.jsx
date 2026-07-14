import React, { useState, useEffect, useRef } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCheck, faXmark, faSpinner } from '@fortawesome/free-solid-svg-icons'
import { LIST_KAMAR } from '@utils/reports/raportConstants'
import RichSelect from '@shared/components/RichSelect'

export default function StudentInlineAddRow({
    classesList,
    onSubmit,
    onCancel,
    submitting,
    initialClassId,
    canEdit,
    visibleColumns = {}
}) {
    const vc = {
        gender: true,
        kelas: true,
        status: true,
        poin: true,
        last_report: true,
        profil: true,
        tags: true,
        aksi: true,
        ...visibleColumns
    }

    const nameInputRef = useRef(null)
    const [localForm, setLocalForm] = useState({
        name: '',
        gender: 'L',
        class_id: initialClassId || '',
        phone: '',
        nisn: '',
        nis: '',
        kamar: ''
    })

    useEffect(() => {
        if (nameInputRef.current) {
            nameInputRef.current.focus()
        }
    }, [])

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault()
            handleSubmit()
        } else if (e.key === 'Escape') {
            e.preventDefault()
            onCancel()
        }
    }

    const handleSubmit = async () => {
        if (!localForm.name || !localForm.class_id || !canEdit) return
        await onSubmit(localForm)
        setLocalForm(prev => ({ ...prev, name: '', phone: '' }))
    }

    return (
        <tr className="border-t-2 border-[var(--color-primary)]/30 bg-[var(--color-primary)]/[0.01] transition-all duration-300">
            {/* Column 1: Selection (Empty) */}
            <td className="px-4 py-3">
                <div className="w-4 h-4 rounded border border-[var(--color-border)] opacity-20 mx-auto" />
            </td>

            {/* Column 2: Name / Siswa */}
            <td className="px-4 py-3">
                <input
                    ref={nameInputRef}
                    type="text"
                    value={localForm.name}
                    onChange={e => setLocalForm(p => ({ ...p, name: e.target.value }))}
                    onKeyDown={handleKeyDown}
                    placeholder="Nama siswa baru..."
                    className="input-field text-sm h-9 px-3 rounded-xl border-[var(--color-border)] focus:border-[var(--color-primary)] bg-[var(--color-surface)] w-full font-bold"
                />
            </td>

            {/* Column 3: Gender */}
            {vc.gender && (
                <td className="px-4 py-3 text-center">
                    <div className="flex gap-1 justify-center">
                        {['L', 'P'].map(g => (
                            <button key={g} type="button" onClick={() => setLocalForm(p => ({ ...p, gender: g }))}
                                className={`w-8 h-8 rounded-lg text-[10px] font-black border transition-all ${localForm.gender === g ? (g === 'L' ? 'bg-blue-500 text-white border-blue-500 shadow-lg shadow-blue-500/20' : 'bg-pink-500 text-white border-pink-500 shadow-lg shadow-pink-500/20') : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] bg-[var(--color-surface)]'}`}
                            >{g}</button>
                        ))}
                    </div>
                </td>
            )}

            {/* Column 4: Class */}
            {vc.kelas && (
                <td className="px-4 py-3 text-center">
                    <RichSelect
                        small
                        value={localForm.class_id}
                        onChange={val => setLocalForm(p => ({ ...p, class_id: val }))}
                        options={classesList}
                        placeholder="Pilih Kelas"
                        className="w-full"
                    />
                </td>
            )}

            {/* Column 5: WhatsApp (fills Status column) */}
            {vc.status && (
                <td className="px-4 py-3 text-center">
                    <input
                        type="text"
                        value={localForm.phone}
                        onChange={e => setLocalForm(p => ({ ...p, phone: e.target.value.replace(/\D/g, '') }))}
                        onKeyDown={handleKeyDown}
                        placeholder="No. WhatsApp"
                        className="input-field text-[10px] h-9 px-3 rounded-xl border-[var(--color-border)] bg-[var(--color-surface)] w-full text-center font-bold"
                    />
                </td>
            )}

            {/* Column 6: NISN (fills Poin column) */}
            {vc.poin && (
                <td className="px-4 py-3 text-center">
                    <input
                        type="text"
                        value={localForm.nisn}
                        onChange={e => setLocalForm(p => ({ ...p, nisn: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                        onKeyDown={handleKeyDown}
                        placeholder="NISN"
                        className="input-field text-[10px] h-9 px-2 rounded-xl border-[var(--color-border)] bg-[var(--color-surface)] w-full text-center font-bold"
                    />
                </td>
            )}

            {/* Column 7: NIS (fills Lap. Terakhir column) */}
            {vc.last_report && (
                <td className="px-4 py-3 text-center">
                    <input
                        type="text"
                        value={localForm.nis}
                        onChange={e => setLocalForm(p => ({ ...p, nis: e.target.value }))}
                        onKeyDown={handleKeyDown}
                        placeholder="NIS"
                        className="input-field text-[10px] h-9 px-2 rounded-xl border-[var(--color-border)] bg-[var(--color-surface)] w-full text-center font-bold"
                    />
                </td>
            )}

            {/* Column 8: Kamar (fills Profil column) */}
            {vc.profil && (
                <td className="px-4 py-3 text-center">
                    <RichSelect
                        small
                        value={localForm.kamar}
                        onChange={val => setLocalForm(p => ({ ...p, kamar: val }))}
                        options={LIST_KAMAR?.map(k => ({ id: k.id, name: k.id })) || []}
                        placeholder="Pilih Kamar"
                        className="w-full"
                    />
                </td>
            )}

            {/* Column 9: Tags (Empty) */}
            {vc.tags && <td className="px-4 py-3" />}

            {/* Column 10: Actions (Save/Cancel) */}
            {vc.aksi && (
                <td className="px-4 py-3 text-center w-[280px]">
                    <div className="flex items-center justify-center gap-1.5">
                        <button onClick={handleSubmit} disabled={submitting || !canEdit || !localForm.name || !localForm.class_id}
                            className="h-9 px-3 rounded-xl bg-[var(--color-primary)] text-white text-[10px] font-black uppercase tracking-widest hover:brightness-110 shadow-lg shadow-[var(--color-primary)]/20 transition-all disabled:opacity-50 flex items-center gap-1.5">
                            {submitting ? <FontAwesomeIcon icon={faSpinner} className="fa-spin" /> : <><FontAwesomeIcon icon={faCheck} /> Simpan</>}
                        </button>
                        <button onClick={onCancel}
                            className="h-9 w-9 rounded-xl border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-red-500 hover:text-white hover:border-red-500 transition-all flex items-center justify-center">
                            <FontAwesomeIcon icon={faXmark} />
                        </button>
                    </div>
                </td>
            )}
        </tr>
    )
}
