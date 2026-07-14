import React, { useState, useRef, useEffect, useCallback, useMemo, memo } from 'react'
import { createPortal } from 'react-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronDown, faSearch, faXmark, faCheck } from '@fortawesome/free-solid-svg-icons'

/**
 * RichSelect - A premium, reusable dropdown component with auto-flip, portal, search, and dynamic grouping/tab filtering.
 * 
 * @param {boolean} compact - Lightweight mode: no portal, smaller padding, inline absolute dropdown.
 *                             Ideal for pagination or toolbar selects with few options.
 */
/**
 * Polymorphic icon renderer - supports both FontAwesome icon objects and Lucide React components.
 * FontAwesome: pass icon object like { iconName: 'bed', ... }
 * Lucide React: pass component reference like Bed, Calendar, etc.
 */
const renderIcon = (icon, className = '') => {
    if (!icon) return null
    const isFontAwesome = typeof icon === 'object' && icon !== null && 'iconName' in icon
    if (isFontAwesome) {
        return <FontAwesomeIcon icon={icon} className={className} />
    }
    const IconComp = icon
    return <IconComp className={className} />
}

const RichSelect = memo(({
    value,
    onChange,
    options = [],
    placeholder = 'Pilih...',
    icon,
    extraOption,
    small,
    status = 'normal',
    searchable = false,
    className = "",
    disabled = false,
    allowCustom = false,
    compact = false,
    usePortal = true,
    buttonClassName = "",
    maxHeight
}) => {
    const [isOpen, setIsOpen] = useState(false)
    const [search, setSearch] = useState('')
    const [activeGroup, setActiveGroup] = useState('All')
    const [isMobile, setIsMobile] = useState(false)

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 640)
        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

    const [coords, setCoords] = useState({ top: 0, left: 0, width: 0, placement: 'bottom', maxHeight: 240 })
    const [compactPlacement, setCompactPlacement] = useState('bottom')
    const ref = useRef(null)
    const searchInputRef = useRef(null)

    const statusClasses = {
        error: 'border-rose-500/50 focus:border-rose-500 focus:ring-rose-500 bg-rose-50/5 dark:bg-rose-500/5',
        success: 'border-emerald-500/50 focus:border-emerald-500 focus:ring-emerald-500 bg-emerald-50/5 dark:bg-emerald-500/5',
        normal: 'border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)]'
    }

    const iconStatusClasses = {
        error: 'text-rose-500 opacity-80',
        success: 'text-emerald-500 opacity-80',
        normal: 'text-[var(--color-text-muted)] opacity-50 group-focus-within:text-[var(--color-primary)] group-hover:text-[var(--color-primary)]'
    }

    // Identify unique groups in options
    const uniqueGroups = useMemo(() => {
        const set = new Set()
        options.forEach(o => {
            if (o.group) set.add(o.group)
        })
        return Array.from(set)
    }, [options])

    const updateCoords = useCallback(() => {
        if (ref.current) {
            const rect = ref.current.getBoundingClientRect()
            const dropdownHeight = searchable ? 320 : 260
            const margin = 8

            let containerBottom = window.innerHeight - margin
            let containerTop = margin
            let hasScrollableAncestor = false
            let el = ref.current.parentElement
            while (el && el !== document.body) {
                const { overflow, overflowY } = window.getComputedStyle(el)
                if (/(auto|scroll)/.test(overflow + overflowY)) {
                    const containerRect = el.getBoundingClientRect()
                    containerBottom = containerRect.bottom - margin
                    containerTop = containerRect.top + margin
                    hasScrollableAncestor = true
                    break
                }
                el = el.parentElement
            }

            if (hasScrollableAncestor) {
                if (rect.bottom < containerTop || rect.top > containerBottom) {
                    setIsOpen(false)
                    return
                }
            }

            const spaceBelow = containerBottom - rect.bottom
            const spaceAbove = rect.top - containerTop

            const shouldFlip = spaceBelow < dropdownHeight && spaceAbove > spaceBelow

            setCoords({
                top: rect.top,
                bottom: rect.bottom,
                left: rect.left,
                width: rect.width,
                placement: shouldFlip ? 'top' : 'bottom',
                maxHeight: shouldFlip ? spaceAbove : spaceBelow
            })
        }
    }, [searchable, setIsOpen])

    const toggle = useCallback(() => {
        const nextState = !isOpen
        if (nextState) {
            if ((compact || !usePortal) && ref.current) {
                const rect = ref.current.getBoundingClientRect()
                const dropdownH = searchable ? 320 : Math.min(options.length * 36 + 16, 240)
                const spaceBelow = window.innerHeight - rect.bottom - 8
                setCompactPlacement(spaceBelow < dropdownH ? 'top' : 'bottom')
            } else if (usePortal) {
                updateCoords()
            }
            setSearch('')
            setActiveGroup('All')
        }
        setIsOpen(nextState)
    }, [isOpen, compact, usePortal, updateCoords, options.length, searchable])

    const handleSelect = useCallback((id) => {
        onChange(id)
        setIsOpen(false)
    }, [onChange])

    useEffect(() => {
        if (!isOpen) return

        const handleClickOutside = (e) => {
            if (ref.current && !ref.current.contains(e.target)) setIsOpen(false)
        }
        document.addEventListener('mousedown', handleClickOutside)

        if (searchable && searchInputRef.current) {
            setTimeout(() => searchInputRef.current?.focus(), 100)
        }

        if (!compact && usePortal) {
            const scrollableAncestors = []
            let el = ref.current?.parentElement
            while (el && el !== document.body) {
                const { overflow, overflowY } = window.getComputedStyle(el)
                if (/(auto|scroll)/.test(overflow + overflowY)) {
                    scrollableAncestors.push(el)
                    el.addEventListener('scroll', updateCoords, { passive: true })
                }
                el = el.parentElement
            }
            window.addEventListener('scroll', updateCoords, true)
            window.addEventListener('resize', updateCoords)

            return () => {
                document.removeEventListener('mousedown', handleClickOutside)
                scrollableAncestors.forEach(a => a.removeEventListener('scroll', updateCoords))
                window.removeEventListener('scroll', updateCoords, true)
                window.removeEventListener('resize', updateCoords)
            }
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [isOpen, updateCoords, searchable, compact, usePortal])

    // Filtered options based on search query & active tab pill group
    const filteredOptions = useMemo(() => {
        let list = options
        if (search) {
            const s = search.toLowerCase()
            list = list.filter(o => o.name?.toLowerCase().includes(s) || o.id?.toString().toLowerCase().includes(s))
        }
        if (activeGroup !== 'All') {
            list = list.filter(o => o.group === activeGroup)
        }
        return list
    }, [options, search, activeGroup])

    // Group options dynamically
    const groupedOptions = useMemo(() => {
        if (uniqueGroups.length === 0) return null

        const map = {}
        filteredOptions.forEach(opt => {
            const g = opt.group || 'Lainnya'
            if (!map[g]) map[g] = []
            map[g].push(opt)
        })
        return map
    }, [filteredOptions, uniqueGroups])

    const selectedOption = useMemo(() => {
        return options.find(o => String(o.id) === String(value)) || (extraOption?.id === value ? extraOption : (allowCustom && value ? { id: value, name: value } : null))
    }, [options, value, extraOption, allowCustom])

    // ─── Dropdown content (shared between compact & portal modes) ───
    const renderDropdown = () => (
        <div className="flex flex-col min-h-0 h-full">
            {/* Search Bar */}
            {searchable && (
                <div className="p-2 border-b border-[var(--color-border)] bg-[var(--color-surface-alt)]/30 shrink-0">
                    <div className="relative">
                        <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-[var(--color-text-muted)] opacity-40" />
                        <input
                            ref={searchInputRef}
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Cari..."
                            className="w-full h-8 pl-8 pr-8 rounded-lg border-[var(--color-border)] bg-[var(--color-surface)] text-[11px] focus:border-[var(--color-primary)] focus:ring-0 outline-none transition-all font-bold"
                        />
                        {search && (
                            <button
                                onClick={() => setSearch('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-[var(--color-text-muted)] hover:text-red-500 transition-colors"
                            >
                                <FontAwesomeIcon icon={faXmark} className="text-[10px]" />
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Dynamic Grouping Filter Pills */}
            {uniqueGroups.length > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-[var(--color-border)]/40 bg-[var(--color-surface-alt)]/20 overflow-x-auto shrink-0 select-none custom-scrollbar">
                    <button
                        type="button"
                        onClick={() => setActiveGroup('All')}
                        className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider transition-all border ${activeGroup === 'All'
                                ? 'bg-[var(--color-primary)] text-white border-transparent shadow-sm'
                                : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] border-[var(--color-border)] hover:bg-[var(--color-surface-alt)]'
                            }`}
                    >
                        Semua
                    </button>
                    {uniqueGroups.map(g => {
                        const isPelanggaran = g.toLowerCase().includes('pelanggaran')
                        const isPrestasi = g.toLowerCase().includes('prestasi')
                        const isActive = activeGroup === g

                        let activeClasses = 'bg-[var(--color-primary)] text-white border-transparent'
                        if (isPelanggaran) activeClasses = 'bg-rose-500 text-white border-transparent shadow-sm shadow-rose-500/10'
                        if (isPrestasi) activeClasses = 'bg-emerald-500 text-white border-transparent shadow-sm shadow-emerald-500/10'

                        return (
                            <button
                                key={g}
                                type="button"
                                onClick={() => setActiveGroup(g)}
                                className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider transition-all border shrink-0 ${isActive
                                        ? activeClasses
                                        : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] border-[var(--color-border)] hover:bg-[var(--color-surface-alt)]'
                                    }`}
                            >
                                {g}
                            </button>
                        )
                    })}
                </div>
            )}

            {/* Options List */}
            <div
                className="py-1 overflow-y-auto custom-scrollbar flex-1 min-h-0"
                style={{ maxHeight: isMobile ? 'calc(75vh - 120px)' : (compact ? 200 : Math.max(60, Math.min(maxHeight || (searchable ? 280 : 240), coords.maxHeight - (searchable ? (uniqueGroups.length > 0 ? 92 : 52) : 8)))) }}
            >
                {extraOption && (
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleSelect(extraOption.id) }}
                        className={`w-full text-left px-3 py-1.5 text-[11px] font-bold hover:bg-[var(--color-primary)]/5 transition-all flex items-center justify-between group whitespace-nowrap ${value === extraOption.id ? 'text-[var(--color-primary)] bg-[var(--color-primary)]/5' : 'text-amber-600'}`}
                    >
                        <div className="flex items-center gap-2.5">
                            <div className={`w-1.5 h-1.5 rounded-full ${value === extraOption.id ? 'bg-[var(--color-primary)]' : 'bg-amber-600'}`} />
                            {extraOption.name}
                        </div>
                        {value === extraOption.id && <FontAwesomeIcon icon={faCheck} className="text-[10px]" />}
                    </button>
                )}

                {allowCustom && search && !options.some(o => o.name?.toLowerCase() === search.toLowerCase()) && (
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleSelect(search) }}
                        className="w-full text-left px-3 py-1.5 text-[11px] font-bold text-[var(--color-primary)] bg-[var(--color-primary)]/5 hover:bg-[var(--color-primary)]/10 transition-all flex items-center justify-between group whitespace-nowrap border-b border-[var(--color-border)]"
                    >
                        <div className="flex items-center gap-2.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] animate-pulse" />
                            <span>Gunakan "{search}"</span>
                        </div>
                        <FontAwesomeIcon icon={faCheck} className="text-[10px]" />
                    </button>
                )}

                {filteredOptions.length === 0 ? (
                    <div className="px-4 py-6 text-center">
                        <p className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest opacity-40">{allowCustom ? 'Ketik untuk menambahkan' : 'Tidak ditemukan'}</p>
                    </div>
                ) : groupedOptions ? (
                    /* ─── Grouped Rendering ─── */
                    Object.keys(groupedOptions).map(groupName => (
                        <div key={groupName} className="flex flex-col">
                            {/* Sticky Color-coded Group Header */}
                            <div className={`px-4 py-1.5 text-[9px] font-black uppercase tracking-widest border-y border-[var(--color-border)]/35 sticky top-0 backdrop-blur-md z-10 select-none ${groupName.toLowerCase().includes('pelanggaran')
                                    ? 'text-rose-500 bg-rose-50/90 dark:bg-rose-950/20'
                                    : groupName.toLowerCase().includes('prestasi')
                                        ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50/90 dark:bg-emerald-950/20'
                                        : 'text-[var(--color-text-muted)] bg-[var(--color-surface-alt)]/90'
                                }`}>
                                {groupName}
                            </div>

                            {/* Group Options */}
                            {groupedOptions[groupName].map(opt => (
                                <button
                                    key={opt.id}
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); handleSelect(opt.id) }}
                                    className={`w-full text-left ${compact ? 'px-3 py-1.5' : 'px-4 py-2'} text-[11px] font-bold hover:bg-[var(--color-primary)]/5 transition-all flex items-center justify-between group whitespace-nowrap ${String(value) === String(opt.id) ? 'text-[var(--color-primary)] bg-[var(--color-primary)]/5' : 'text-[var(--color-text)]'}`}
                                >
                                    <div className="flex items-center gap-2.5">
                                        <div className={`w-1.5 h-1.5 rounded-full transition-all ${String(value) === String(opt.id) ? 'bg-[var(--color-primary)] scale-125 shadow-[0_0_8px_rgba(var(--color-primary-rgb),0.4)]' : 'bg-[var(--color-border)] group-hover:bg-[var(--color-text-muted)]'}`} />
                                        {opt.render ? opt.render : opt.name}
                                    </div>
                                    {String(value) === String(opt.id) && <FontAwesomeIcon icon={faCheck} className="text-[10px] animate-in zoom-in-50 duration-300" />}
                                </button>
                            ))}
                        </div>
                    ))
                ) : (
                    /* ─── Flat Rendering ─── */
                    filteredOptions.map((opt) => (
                        <button
                            key={opt.id}
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleSelect(opt.id) }}
                            className={`w-full text-left ${compact ? 'px-3 py-1.5' : 'px-4 py-2'} text-[11px] font-bold hover:bg-[var(--color-primary)]/5 transition-all flex items-center justify-between group whitespace-nowrap ${String(value) === String(opt.id) ? 'text-[var(--color-primary)] bg-[var(--color-primary)]/5' : 'text-[var(--color-text)]'}`}
                        >
                            <div className="flex items-center gap-2.5">
                                <div className={`w-1.5 h-1.5 rounded-full transition-all ${String(value) === String(opt.id) ? 'bg-[var(--color-primary)] scale-125 shadow-[0_0_8px_rgba(var(--color-primary-rgb),0.4)]' : 'bg-[var(--color-border)] group-hover:bg-[var(--color-text-muted)]'}`} />
                                {opt.render ? opt.render : opt.name}
                            </div>
                            {String(value) === String(opt.id) && <FontAwesomeIcon icon={faCheck} className="text-[10px] animate-in zoom-in-50 duration-300" />}
                        </button>
                    ))
                )}
            </div>
        </div>
    )

    const hasCustomHeight = buttonClassName && /\bh-\[?\w+\]?\b/.test(buttonClassName)
    let heightClass = ''
    let paddingClass = ''

    if (compact) {
        heightClass = 'h-8'
        paddingClass = 'px-2.5'
    } else if (small) {
        heightClass = 'h-8 sm:h-9'
        paddingClass = icon ? 'pl-8 pr-3 rtl:pl-3 rtl:pr-8' : 'px-3'
    } else {
        heightClass = 'h-11'
        paddingClass = icon ? 'pl-9 pr-3 rtl:pl-3 rtl:pr-9' : 'px-3'
    }

    return (
        <div className={`relative ${className}`} ref={ref}>
            <button
                type="button"
                onClick={disabled ? undefined : toggle}
                disabled={disabled}
                className={`w-full flex items-center justify-between gap-2 ${hasCustomHeight ? '' : heightClass} ${paddingClass} rounded-lg sm:rounded-xl border ${statusClasses[status]} bg-[var(--color-surface)] hover:bg-[var(--color-surface-alt)]/50 focus:ring-1 outline-none transition-all text-[11px] sm:text-[12px] font-bold relative group shadow-sm ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${buttonClassName}`}
            >
                <div className="flex items-center gap-2 truncate">
                    {icon && !compact && renderIcon(icon, `absolute ${small ? 'left-3 rtl:left-auto rtl:right-3 w-3 h-3 text-[10px]' : 'left-3.5 rtl:left-auto rtl:right-3.5 w-3.5 h-3.5 text-xs'} top-1/2 -translate-y-1/2 transition-colors ${iconStatusClasses[status]}`)}
                    <span className={selectedOption ? 'text-[var(--color-text)]' : 'text-[var(--color-text-muted)] opacity-60'}>
                        {selectedOption ? (selectedOption.render ? selectedOption.render : selectedOption.name) : placeholder}
                    </span>
                </div>
                <FontAwesomeIcon icon={faChevronDown} className={`text-[9px] opacity-40 transition-transform duration-300 shrink-0 ${isOpen ? 'rotate-180 text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'}`} />
            </button>

            {isOpen && (!usePortal || compact ? (
                /* ─── Compact/Inline: absolute dropdown ─── */
                <div
                    className={`absolute z-50 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-2xl overflow-hidden animate-in fade-in ${compactPlacement === 'top' ? 'slide-in-from-bottom-2' : 'slide-in-from-top-2'} duration-150`}
                    onMouseDown={(e) => e.stopPropagation()}
                    style={{
                        minWidth: '100%',
                        right: 0,
                        ...(compactPlacement === 'top'
                            ? { bottom: '100%', marginBottom: 4 }
                            : { top: '100%', marginTop: 4 }
                        ),
                    }}
                >
                    {renderDropdown()}
                </div>
            ) : (
                /* ─── Full: portal dropdown ─── */
                createPortal(
                    isMobile ? (
                        <>
                            <div
                                className="fixed inset-0 bg-black/40 z-[99998] animate-in fade-in duration-200"
                                onMouseDown={(e) => {
                                    e.stopPropagation()
                                    setIsOpen(false)
                                }}
                            />
                            <div
                                className="fixed bottom-0 left-0 right-0 z-[99999] bg-[var(--color-surface)] border-t border-[var(--color-border)] rounded-t-2xl shadow-2xl animate-in slide-in-from-bottom duration-200 flex flex-col pb-safe"
                                onMouseDown={(e) => e.stopPropagation()}
                                style={{
                                    maxHeight: '75vh',
                                    width: '100%',
                                }}
                            >
                                <div className="w-12 h-1 bg-[var(--color-border)] rounded-full mx-auto my-2.5 shrink-0" />
                                {renderDropdown()}
                            </div>
                        </>
                    ) : (
                        <div
                            className={`fixed z-[99999] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl sm:rounded-2xl shadow-2xl animate-in fade-in ${coords.placement === 'top' ? 'slide-in-from-bottom-2' : 'slide-in-from-top-2'} flex flex-col`}
                            onMouseDown={(e) => e.stopPropagation()}
                            style={{
                                width: 'max-content',
                                minWidth: coords.width,
                                maxWidth: small ? Math.max(200, coords.width) : Math.max(300, coords.width),
                                maxHeight: Math.max(80, coords.maxHeight),
                                overflow: 'hidden',
                                left: coords.left,
                                top: coords.placement === 'top' ? 'auto' : coords.bottom + 8,
                                bottom: coords.placement === 'top' ? (window.innerHeight - coords.top) + 8 : 'auto',
                            }}
                        >
                            {renderDropdown()}
                        </div>
                    ),
                    document.body
                )
            ))}
        </div>
    )
})

RichSelect.displayName = 'RichSelect'

export default RichSelect