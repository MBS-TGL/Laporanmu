import { useState, useRef, useCallback, useEffect } from 'react'

/**
 * Flag mobile untuk popover/picker (bottom-sheet di bawah breakpoint).
 * Menggantikan listener resize yang sebelumnya di-copy di tiap komponen.
 */
export function useIsMobile(breakpoint = 640) {
    const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < breakpoint)
    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < breakpoint)
        check()
        window.addEventListener('resize', check)
        return () => window.removeEventListener('resize', check)
    }, [breakpoint])
    return isMobile
}

/**
 * Engine popover bersama (RichSelect / DatePicker / TimePicker):
 * - updateCoords: ukur trigger, cari ancestor scrollable, flip bottom/top + maxHeight
 * - open/close/toggle dengan state tunggal
 * - Listener aktif hanya saat open: click-outside (abaikan panel ber-atribut
 *   data-popover-panel, portal di document.body), reposition saat scroll/resize,
 *   auto-close saat trigger keluar viewport container.
 *
 * Panel popover cukup diberi atribut `data-popover-panel` — tidak perlu
 * stopPropagation manual.
 */
export function usePopover({ dropdownHeight = 240, margin = 8 } = {}) {
    const triggerRef = useRef(null)
    const [isOpen, setIsOpen] = useState(false)
    const [coords, setCoords] = useState({
        top: 0, bottom: 0, left: 0, right: 0, width: 0,
        placement: 'bottom', maxHeight: dropdownHeight
    })

    const updateCoords = useCallback(() => {
        const el = triggerRef.current
        if (!el) return
        const rect = el.getBoundingClientRect()

        let containerBottom = window.innerHeight - margin
        let containerTop = margin
        let clamped = false
        let ancestor = el.parentElement
        while (ancestor && ancestor !== document.body) {
            const { overflow, overflowY } = window.getComputedStyle(ancestor)
            if (/(auto|scroll)/.test(overflow + overflowY)) {
                const containerRect = ancestor.getBoundingClientRect()
                containerBottom = containerRect.bottom - margin
                containerTop = containerRect.top + margin
                clamped = true
                break
            }
            ancestor = ancestor.parentElement
        }

        // Trigger tergulir keluar area terlihat container → tutup popover
        if (clamped && (rect.bottom < containerTop || rect.top > containerBottom)) {
            setIsOpen(false)
            return
        }

        const spaceBelow = containerBottom - rect.bottom
        const spaceAbove = rect.top - containerTop
        const shouldFlip = spaceBelow < dropdownHeight && spaceAbove > spaceBelow

        setCoords({
            top: rect.top,
            bottom: rect.bottom,
            left: rect.left,
            right: rect.right,
            width: rect.width,
            placement: shouldFlip ? 'top' : 'bottom',
            maxHeight: shouldFlip ? spaceAbove - 16 : spaceBelow - 16
        })
    }, [dropdownHeight, margin])

    const close = useCallback(() => setIsOpen(false), [])
    const open = useCallback(() => {
        updateCoords()
        setIsOpen(true)
    }, [updateCoords])
    const toggle = useCallback(() => {
        setIsOpen(v => {
            if (!v) updateCoords()
            return !v
        })
    }, [updateCoords])

    useEffect(() => {
        if (!isOpen) return

        const handleClickOutside = (e) => {
            if (triggerRef.current?.contains(e.target)) return
            if (e.target.closest?.('[data-popover-panel]')) return
            setIsOpen(false)
        }
        document.addEventListener('mousedown', handleClickOutside)

        // Reposisi saat ancestor scrollable / window scroll & resize
        const scrollableAncestors = []
        let ancestor = triggerRef.current?.parentElement
        while (ancestor && ancestor !== document.body) {
            const { overflow, overflowY } = window.getComputedStyle(ancestor)
            if (/(auto|scroll)/.test(overflow + overflowY)) {
                scrollableAncestors.push(ancestor)
                ancestor.addEventListener('scroll', updateCoords, { passive: true })
            }
            ancestor = ancestor.parentElement
        }
        window.addEventListener('scroll', updateCoords, true)
        window.addEventListener('resize', updateCoords)

        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
            scrollableAncestors.forEach(a => a.removeEventListener('scroll', updateCoords))
            window.removeEventListener('scroll', updateCoords, true)
            window.removeEventListener('resize', updateCoords)
        }
    }, [isOpen, updateCoords])

    return { triggerRef, isOpen, open, close, toggle, updateCoords, coords }
}
