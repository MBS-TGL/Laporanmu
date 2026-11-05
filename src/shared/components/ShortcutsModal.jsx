import { memo, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowDown, ArrowUp, Command, CornerDownLeft, Search } from 'lucide-react'
import { formatKey } from '@utils/keyboard'

/* ───────────────────────── Kbd ───────────────────────── */

/**
 * Chip <kbd>. Diekspor supaya bisa dipakai juga sebagai hint di samping search / tombol.
 * `inverted` dipakai di atas background berwarna (baris aktif).
 */
export const Kbd = ({ children, inverted = false, className = '' }) => (
    <kbd
        className={`inline-flex items-center justify-center min-w-6 h-6 px-1.5 rounded-md border text-xs font-semibold font-mono transition-colors
        ${inverted
                ? 'border-white/30 bg-white/20 text-white'
                : 'border-border bg-surface-alt text-text-muted shadow-sm'
            } ${className}`}
    >
        {typeof children === 'string' ? formatKey(children) : children}
    </kbd>
)

/* ───────────────────────── Highlight ───────────────────────── */

const escapeRegExp = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Tandai bagian teks yang cocok dengan query (seperti Algolia DocSearch). */
const Highlight = ({ text, query, inverted }) => {
    const q = query.trim()
    if (!q) return text
    const parts = text.split(new RegExp(`(${escapeRegExp(q)})`, 'ig'))
    return parts.map((part, i) =>
        part.toLowerCase() === q.toLowerCase() ? (
            <mark
                key={i}
                className={`bg-transparent font-semibold underline decoration-2 underline-offset-4 ${inverted ? 'text-white decoration-white/70' : 'text-primary decoration-primary/40'
                    }`}
            >
                {part}
            </mark>
        ) : (
            <span key={i}>{part}</span>
        )
    )
}

/* ───────────────────────── Komponen utama ───────────────────────── */

/**
 * Palet keyboard shortcut ala Tailwind docs / Linear / Supabase.
 *
 * @param {boolean} isOpen
 * @param {Function} onClose
 * @param {string}  [title]        label aksesibilitas dialog
 * @param {string}  [hint]         teks kecil di footer kanan
 * @param {string}  [placeholder]
 * @param {Array<{
 *   title: string,
 *   items: Array<{
 *     keys: string[],
 *     label: string,
 *     icon?: React.ComponentType<{ className?: string }>,
 *     onSelect?: Function   // opsional: Enter / klik menjalankan aksinya
 *   }>
 * }>} sections
 *
 * Di Mac, 'Ctrl' otomatis tampil sebagai ⌘.
 * Semua keydown di dalam palet tidak diteruskan ke listener halaman, jadi `Esc`
 * hanya menutup palet (tidak ikut clear / deselect di halaman).
 */
const ShortcutsModal = memo(function ShortcutsModal({
    isOpen,
    onClose,
    title = 'Keyboard Shortcuts',
    hint = 'Tekan ? untuk toggle',
    placeholder = 'Cari shortcut…',
    sections = [],
}) {
    const [query, setQuery] = useState('')
    const [active, setActive] = useState(0)
    const inputRef = useRef(null)
    const returnFocusRef = useRef(null)
    const listId = useId()

    /* Filter + beri index global supaya navigasi panah lintas grup */
    const { groups, flat } = useMemo(() => {
        const q = query.trim().toLowerCase()
        let idx = 0
        const flatItems = []
        const result = sections
            .map(section => {
                const items = section.items.filter(item => {
                    if (!q) return true
                    return (
                        item.label.toLowerCase().includes(q) ||
                        section.title.toLowerCase().includes(q) ||
                        item.keys.join(' ').toLowerCase().includes(q)
                    )
                })
                return {
                    title: section.title,
                    items: items.map(item => {
                        const entry = { ...item, index: idx++ }
                        flatItems.push(entry)
                        return entry
                    }),
                }
            })
            .filter(g => g.items.length > 0)
        return { groups: result, flat: flatItems }
    }, [sections, query])

    /* Buka: kunci scroll + fokus ke input; tutup: kembalikan fokus.
       Reset query/active TIDAK di sini — dilakukan event-driven di requestClose/onChange. */
    useEffect(() => {
        if (!isOpen) return
        returnFocusRef.current = document.activeElement
        const prevOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        const t = setTimeout(() => inputRef.current?.focus(), 0)
        return () => {
            clearTimeout(t)
            document.body.style.overflow = prevOverflow
            returnFocusRef.current?.focus?.()
        }
    }, [isOpen])

    /* Jaga baris aktif tetap terlihat saat scroll */
    useEffect(() => {
        if (!isOpen) return
        document.getElementById(`${listId}-${active}`)?.scrollIntoView({ block: 'nearest' })
    }, [active, isOpen, listId])

    /* Tutup + reset state — event-driven, jadi buka berikutnya selalu bersih */
    const requestClose = useCallback(() => {
        setQuery('')
        setActive(0)
        onClose()
    }, [onClose])

    if (!isOpen) return null

    const run = item => {
        if (!item?.onSelect) return
        requestClose()
        // beri waktu modal tertutup & fokus kembali sebelum aksi dijalankan
        setTimeout(item.onSelect, 0)
    }

    const handleKeyDown = e => {
        // Jangan bocor ke listener halaman (Esc, ?, N, P, dst.)
        e.stopPropagation()

        switch (e.key) {
            case 'Escape':
                e.preventDefault()
                if (query) {
                    setQuery('')
                    setActive(0)
                } else {
                    requestClose()
                }
                break
            case 'ArrowDown':
                e.preventDefault()
                if (flat.length) setActive(i => (i + 1) % flat.length)
                break
            case 'ArrowUp':
                e.preventDefault()
                if (flat.length) setActive(i => (i - 1 + flat.length) % flat.length)
                break
            case 'Enter':
                e.preventDefault()
                run(flat[active])
                break
            case '?':
                // Query kosong: `?` berfungsi sebagai toggle tutup, seperti di Linear
                if (!query) {
                    e.preventDefault()
                    onClose()
                }
                break
            default:
        }
    }

    const activeItem = flat[active]

    return createPortal(
        <div
            className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[10vh] sm:pt-[14vh] bg-black/40 backdrop-blur-sm"
            onMouseDown={e => e.target === e.currentTarget && requestClose()}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-label={title}
                onKeyDown={handleKeyDown}
                className="w-full max-w-xl flex flex-col max-h-[70vh] rounded-2xl border border-border bg-surface shadow-2xl overflow-hidden"
            >
                {/* ── Search ── */}
                <div className="flex items-center gap-3 px-4 h-14 shrink-0 border-b border-border">
                    <Search className="w-4 h-4 text-text-muted shrink-0" aria-hidden="true" />
                    <input
                        ref={inputRef}
                        value={query}
                        onChange={e => {
                            setQuery(e.target.value)
                            setActive(0)
                        }}
                        placeholder={placeholder}
                        spellCheck={false}
                        autoComplete="off"
                        role="combobox"
                        aria-expanded="true"
                        aria-controls={listId}
                        aria-activedescendant={activeItem ? `${listId}-${activeItem.index}` : undefined}
                        className="flex-1 min-w-0 bg-transparent text-sm text-text placeholder:text-text-muted outline-none"
                    />
                    <button
                        type="button"
                        onClick={requestClose}
                        aria-label="Tutup"
                        className="rounded-md active:scale-95 transition-transform"
                    >
                        <Kbd className="bg-surface cursor-pointer hover:bg-surface-alt">Esc</Kbd>
                    </button>
                </div>

                {/* ── Hasil ── */}
                <div id={listId} role="listbox" aria-label={title} className="flex-1 overflow-y-auto overscroll-contain p-2">
                    {groups.length === 0 ? (
                        <div className="py-14 text-center text-sm text-text-muted">
                            Tidak ada shortcut untuk <span className="font-semibold text-text">“{query}”</span>
                        </div>
                    ) : (
                        groups.map(group => (
                            <div key={group.title} className="mb-2 last:mb-0" role="group" aria-label={group.title}>
                                <p className="px-2 pt-2 pb-1.5 text-sm font-semibold text-text">{group.title}</p>
                                <div className="space-y-1">
                                    {group.items.map(item => {
                                        const isActive = item.index === active
                                        const Icon = item.icon || Command
                                        return (
                                            <div
                                                key={item.label}
                                                id={`${listId}-${item.index}`}
                                                role="option"
                                                aria-selected={isActive}
                                                onMouseMove={() => !isActive && setActive(item.index)}
                                                onClick={() => run(item)}
                                                className={`flex items-center gap-3 h-11 px-2 rounded-xl transition-colors duration-100
                                                ${item.onSelect ? 'cursor-pointer' : 'cursor-default'}
                                                ${isActive ? 'bg-primary text-white' : 'bg-surface-alt/60 text-text'}`}
                                            >
                                                <span
                                                    className={`flex items-center justify-center w-7 h-7 shrink-0 rounded-lg border
                                                    ${isActive
                                                            ? 'border-white/30 bg-white/15 text-white'
                                                            : 'border-border bg-surface text-text-muted'
                                                        }`}
                                                >
                                                    <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                                                </span>
                                                <span className="flex-1 min-w-0 truncate text-sm">
                                                    <Highlight text={item.label} query={query} inverted={isActive} />
                                                </span>
                                                <span className="flex items-center gap-1 shrink-0">
                                                    {item.keys.map((k, i) => (
                                                        <Kbd key={`${k}-${i}`} inverted={isActive}>{k}</Kbd>
                                                    ))}
                                                </span>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* ── Footer ── */}
                <div className="flex items-center justify-between gap-3 px-4 h-11 shrink-0 border-t border-border text-xs text-text-muted">
                    <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1.5">
                            <Kbd className="!min-w-5 !h-5 !px-1"><ArrowUp className="w-3 h-3" /></Kbd>
                            <Kbd className="!min-w-5 !h-5 !px-1"><ArrowDown className="w-3 h-3" /></Kbd>
                            pilih
                        </span>
                        {activeItem?.onSelect && (
                            <span className="flex items-center gap-1.5">
                                <Kbd className="!min-w-5 !h-5 !px-1"><CornerDownLeft className="w-3 h-3" /></Kbd>
                                jalankan
                            </span>
                        )}
                    </div>
                    <span className="hidden sm:inline">{hint}</span>
                </div>
            </div>
        </div>,
        document.body
    )
})

export default ShortcutsModal
