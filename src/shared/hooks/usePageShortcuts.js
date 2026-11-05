import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const TYPING_TAGS = ['INPUT', 'TEXTAREA', 'SELECT']

/** ['Ctrl','K'] → { mod:true, shift:false, alt:false, key:'k' } — 'Esc' → key:'escape' */
const parseCombo = keys => {
    let mod = false
    let shift = false
    let alt = false
    let key = null
    for (const k of keys) {
        const l = k.toLowerCase()
        if (l === 'ctrl' || l === 'meta' || l === 'cmd' || l === '⌘') mod = true
        else if (l === 'alt' || l === '⌥') alt = true
        else if (l === 'shift') shift = true
        else key = l === 'esc' ? 'escape' : l
    }
    return { mod, shift, alt, key }
}

/**
 * Mesin keyboard shortcut halaman — dipakai bersama <ShortcutsModal>.
 *
 * SATU array `items` jadi sumber tunggal untuk binding keyboard DAN daftar di modal:
 *
 *   const sc = usePageShortcuts({
 *     isBlocked: isAnyModalOpen,          // modal/menu lain terbuka → hanya Esc berlaku
 *     items: [
 *       { section: 'Navigasi', keys: ['Ctrl', 'K'], label: 'Fokus ke search', icon: Search,
 *         onSelect: () => searchRef.current?.focus() },
 *       { section: 'Aksi', keys: ['N'], label: 'Tambah data', when: canAdd, onSelect: handleAdd },
 *       { section: 'Tampilan', keys: ['?'], label: 'Tampilkan shortcut ini', icon: Keyboard },
 *     ],
 *   })
 *
 *   <ShortcutsModal isOpen={sc.isOpen} onClose={sc.close} sections={sc.sections} />
 *
 * Aturan (mengikuti perilaku halaman Data Siswa):
 * - `?` toggle palet; saat palet terbuka, Esc menutupnya dulu (tidak ikut aksi halaman).
 * - Esc di luar palet: blur bila sedang mengetik, jalankan item keys:['Esc'] bila ada.
 * - `when: false` → binding nonaktif DAN item disembunyikan dari daftar (daftar jujur).
 * - Huruf tunggal: tanpa modifier, tanpa Shift, tidak auto-repeat. Ctrl/⌘ = sama saja.
 * - Listener global terpasang sekali (latest-ref) — closure items selalu segar.
 *
 * @returns {{ isOpen: boolean, open: Function, close: Function, toggle: Function,
 *             sections: Array<{ title: string, items: Array<{ keys: string[], label: string,
 *             icon?: React.ComponentType, onSelect?: Function }> }> }}
 */
export function usePageShortcuts({ isBlocked = false, items = [] }) {
    const [isOpen, setIsOpen] = useState(false)
    const open = useCallback(() => setIsOpen(true), [])
    const close = useCallback(() => setIsOpen(false), [])
    const toggle = useCallback(() => setIsOpen(v => !v), [])

    // Nilai terbaru di ref → listener terpasang sekali, closure selalu segar
    const latest = useRef({ isBlocked, items, isOpen })
    useEffect(() => {
        latest.current = { isBlocked, items, isOpen }
    })

    useEffect(() => {
        const onKeyDown = e => {
            const { isBlocked: blocked, items: list, isOpen: paletteOpen } = latest.current
            const el = document.activeElement
            const isTyping = !!el && (TYPING_TAGS.includes(el.tagName) || el.isContentEditable)

            // ── Escape: tutup palet dulu kalau terbuka, blur saat mengetik, baru aksi halaman ──
            if (e.key === 'Escape') {
                if (paletteOpen) {
                    e.preventDefault()
                    setIsOpen(false)
                    return
                }
                if (isTyping) {
                    el.blur()
                    return
                }
                const escItem = list.find(it => it.onSelect && it.keys.some(k => k.toLowerCase() === 'esc'))
                if (escItem) {
                    e.preventDefault()
                    escItem.onSelect(e)
                }
                return
            }

            if (isTyping || e.isComposing || e.defaultPrevented) return
            if (blocked) return

            // ── `?` toggle palet ──
            if (e.key === '?') {
                e.preventDefault()
                setIsOpen(v => !v)
                return
            }

            const mod = e.ctrlKey || e.metaKey
            for (const it of list) {
                if (!it.onSelect || it.when === false) continue
                const { mod: wantsMod, alt, key } = parseCombo(it.keys)
                if (!key || key === '?' || alt) continue
                if (e.key.toLowerCase() !== key) continue
                if (wantsMod) {
                    if (!mod || e.altKey) continue
                } else {
                    if (mod || e.shiftKey || e.repeat) continue
                }
                e.preventDefault()
                it.onSelect(e)
                return
            }
        }

        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [])

    // Sections untuk <ShortcutsModal> — dikelompokkan per `section`,
    // item `when: false` disembunyikan supaya daftar jujur dengan izin halaman.
    const sections = useMemo(() => {
        const order = []
        const bySection = new Map()
        items.forEach(it => {
            if (it.when === false) return
            if (!bySection.has(it.section)) {
                bySection.set(it.section, [])
                order.push(it.section)
            }
            bySection.get(it.section).push({ keys: it.keys, label: it.label, icon: it.icon, onSelect: it.onSelect })
        })
        return order.map(title => ({ title, items: bySection.get(title) }))
    }, [items])

    return { isOpen, open, close, toggle, sections }
}

export default usePageShortcuts
