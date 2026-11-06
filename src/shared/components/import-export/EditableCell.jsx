import { memo, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, Pen } from 'lucide-react'
import { useLanguage } from '@context'

/**
 * EditableCell — sel pada tabel review import yang bisa diklik untuk diedit inline.
 * Dropdown editor dirender via portal (fixed, anchor dari bawah sel) agar tidak
 * terpotong scroll container modal.
 *
 * Props:
 * - rowIdx            : index baris pada importPreview
 * - colKey            : key kolom pada row
 * - value             : nilai sel saat ini
 * - row               : objek row utuh (fallback display entity via displayKey)
 * - center            : rata tengah (kolom enum/kategori)
 * - required          : sel kosong ditandai merah italic
 * - editor            : definisi editor dari config.columns
 *     { type: 'text' }
 *     { type: 'enum',   options: [string | {id,name}], clearable? }
 *     { type: 'entity', list, labelKey?, displayKey?, searchKeys?, renderOption?, minWidth?, clearable? }
 * - importEditCell    : state { row, col } dari page/hook
 * - setImportEditCell : setter state edit
 * - handleImportCellEdit(rowIdx, key, value) : aksi edit dari page/hook
 *
 * Entity commit menulis id ke colKey DAN label ke displayKey via dua panggilan
 * handleImportCellEdit — sesuai pola existing (mis. _teacherRaw, _className).
 */
const EditableCell = memo(function EditableCell({
    rowIdx, colKey, value, row,
    center, required, editor,
    importEditCell, setImportEditCell, handleImportCellEdit
}) {
    const { t } = useLanguage()
    const type = editor?.type || 'text'
    const isEditing = importEditCell?.row === rowIdx && importEditCell?.col === colKey
    const [searchTerm, setSearchTerm] = useState('')
    const cellRef = useRef(null)
    const [coords, setCoords] = useState(null)

    useLayoutEffect(() => {
        if (isEditing && cellRef.current) {
            const rect = cellRef.current.getBoundingClientRect()
            setCoords({ anchorTop: rect.top, left: rect.left, width: rect.width })
        } else {
            setCoords(null)
        }
    }, [isEditing])

    const normOpt = (o) => (typeof o === 'string' ? { id: o, name: o } : o)
    const normItem = normOpt
    const getByPath = (obj, path) => path.split('.').reduce((acc, k) => (acc == null ? acc : acc[k]), obj)
    const labelOf = (item) => (editor.labelFn ? editor.labelFn(item) : item[editor.labelKey || 'name'])

    // Resolve display value per tipe editor
    let displayValue = value || '-'
    if (type === 'entity') {
        const list = (editor.list || []).map(normItem)
        const found = list.find(it => it.id === value)
        displayValue = (found ? labelOf(found) : '') || row?.[editor.displayKey] || '-'
    } else if (type === 'enum') {
        const opt = (editor.options || []).map(normOpt).find(o => o.id === value)
        if (opt) displayValue = opt.name
    }

    const commit = (val, extra) => {
        handleImportCellEdit(rowIdx, colKey, val)
        if (extra) handleImportCellEdit(rowIdx, extra.key, extra.value)
        setImportEditCell(null)
    }

    const close = () => setImportEditCell(null)

    const renderDropdown = (content) => {
        if (!coords) return null
        return createPortal(
            <div
                className="fixed z-[9999]"
                style={{
                    bottom: (window.innerHeight - coords.anchorTop) + 8,
                    left: coords.left,
                    minWidth: Math.max(coords.width, editor?.minWidth || 140)
                }}
            >
                <div className="flex flex-col bg-[var(--color-surface)] border border-[var(--color-primary)] rounded-2xl shadow-xl overflow-hidden border-t-[var(--color-primary)]">
                    {content}
                </div>
                <div className="fixed inset-0 -z-10 bg-black/0" onClick={close} />
            </div>,
            document.body
        )
    }

    // ---- Mode editing ----
    if (isEditing) {
        if (type === 'enum') {
            const options = (editor.options || []).map(normOpt)
            return (
                <div ref={cellRef} className="relative">
                    <div className="bg-[var(--color-primary)]/10 rounded-lg px-2 py-1 text-[var(--color-primary)] font-bold uppercase text-center border border-[var(--color-primary)] shadow-sm">
                        {displayValue}
                    </div>
                    {renderDropdown(
                        <div className="py-1">
                            {options.map(opt => (
                                <button
                                    key={opt.id}
                                    type="button"
                                    className="w-full px-4 py-2.5 text-left text-xs font-bold hover:bg-[var(--color-primary)]/10 hover:text-[var(--color-primary)] transition-colors flex items-center justify-between"
                                    onClick={() => commit(opt.id)}
                                >
                                    <span>{opt.name}</span>
                                    {value === opt.id && <Check className="w-4 h-4" />}
                                </button>
                            ))}
                            {editor.clearable && (
                                <button
                                    type="button"
                                    className="w-full px-4 py-2 text-left text-xs font-bold text-danger hover:bg-danger/10 transition-colors border-t border-[var(--color-border)] mt-1"
                                    onClick={() => commit('')}
                                >
                                    {t('shared.import.clear')}
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )
        }

        if (type === 'entity') {
            const labelKey = editor.labelKey || 'name'
            const searchKeys = editor.searchKeys || [labelKey]
            const list = (editor.list || []).map(normItem)
            const filtered = list.filter(item =>
                searchKeys.some(k => String(getByPath(item, k) ?? '').toLowerCase().includes(searchTerm.toLowerCase()))
            )
            const currentDisplay = displayValue === '-' ? '' : displayValue

            return (
                <div ref={cellRef} className="relative">
                    <div className="bg-[var(--color-primary)]/10 rounded-lg px-2 py-1 text-[var(--color-primary)] font-bold border border-[var(--color-primary)] shadow-sm truncate max-w-[120px]">
                        {currentDisplay || t('shared.import.pick')}
                    </div>
                    {renderDropdown(
                        <>
                            <div className="p-2 border-b border-[var(--color-border)] bg-[var(--color-surface-alt)]/50">
                                <input
                                    autoFocus
                                    className="w-full bg-transparent text-xs font-bold outline-none placeholder:font-normal placeholder:opacity-30"
                                    placeholder={t('shared.import.search')}
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Escape') close()
                                        if (e.key === 'Enter' && filtered.length > 0) {
                                            const item = filtered[0]
                                            commit(item.id, editor.displayKey ? { key: editor.displayKey, value: labelOf(item) } : null)
                                        }
                                    }}
                                />
                            </div>
                            <div className="max-h-[160px] overflow-auto py-1 scrollbar-none">
                                {filtered.length > 0 ? filtered.map(item => (
                                    <button
                                        key={item.id}
                                        type="button"
                                        className="w-full px-4 py-2 text-left text-xs font-bold hover:bg-[var(--color-primary)]/10 hover:text-[var(--color-primary)] transition-colors flex items-center justify-between gap-2"
                                        onClick={() => commit(item.id, editor.displayKey ? { key: editor.displayKey, value: labelOf(item) } : null)}
                                    >
                                        {editor.renderOption
                                            ? <div className="flex-1 min-w-0">{editor.renderOption(item)}</div>
                                            : <span className="truncate">{labelOf(item)}</span>}
                                        {value === item.id && <Check className="w-4 h-4 shrink-0" />}
                                    </button>
                                )) : (
                                    <div className="px-3 py-3 text-xs text-[var(--color-text-muted)] italic text-center">{t('shared.import.notFound')}</div>
                                )}
                            </div>
                            {editor.clearable !== false && (
                                <button
                                    type="button"
                                    className="p-2 text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)] hover:text-danger transition-colors border-t border-[var(--color-border)]"
                                    onClick={() => commit(null, editor.displayKey ? { key: editor.displayKey, value: '' } : null)}
                                >
                                    {t('shared.import.clear')}
                                </button>
                            )}
                        </>
                    )}
                </div>
            )
        }

        // text (default)
        return (
            <input
                autoFocus
                className="w-full bg-[var(--color-surface)] border-2 border-[var(--color-primary)] rounded-lg px-2 py-1 text-xs font-bold outline-none shadow-lg transition-all"
                value={value || ''}
                onChange={(e) => handleImportCellEdit(rowIdx, colKey, e.target.value)}
                onBlur={close}
                onKeyDown={(e) => e.key === 'Enter' && close()}
            />
        )
    }

    // ---- Mode tampilan ----
    const isEmpty = !displayValue || displayValue === '-'
    const emptyClass = isEmpty
        ? (required ? 'text-danger/40 italic font-normal bg-danger/5' : 'text-[var(--color-text-muted)] opacity-50')
        : ''

    return (
        <div
            className={`group cursor-pointer hover:bg-[var(--color-primary)]/5 px-1.5 py-0.5 -mx-1.5 rounded-md transition-all flex items-center ${center ? 'justify-center' : 'justify-between'} gap-2 min-h-[20px] ${emptyClass}`}
            onClick={() => setImportEditCell({ row: rowIdx, col: colKey })}
        >
            <span className={center ? '' : 'truncate'}>{displayValue}</span>
            {!center && <Pen className="w-4 h-4 opacity-0 group-hover:opacity-30 transition-opacity shrink-0" />}
        </div>
    )
})

export default EditableCell
