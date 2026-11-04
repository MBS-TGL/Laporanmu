import React, { useState, useRef, useEffect, useCallback, useMemo, memo } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Search, X, Check } from 'lucide-react'
import { usePopover, useIsMobile } from '@shared/hooks/usePopover'

/**
 * RichSelect - Dropdown reusable dengan auto-flip, portal, search, dan grouping.
 *
 * @param {boolean} compact - Lightweight mode: no portal, smaller padding, inline absolute dropdown.
 *                             Ideal for pagination or toolbar selects with few options.
 * @param {object}  groupTones - Warna pill/header per group (case-insensitive), mis.
 *                               { pelanggaran: 'danger', prestasi: 'success' }. Default netral (primary).
 */
// Polymorphic icon renderer for Lucide React components.
const renderIcon = (icon, className) => {
    if (!icon) return null
    const IconComp = icon
    return <IconComp className={className} />
}

// Tone group → class pill aktif + header sticky (token, tanpa hardcode palet)
const GROUP_TONES = {
    primary: {
        pill: 'bg-primary text-white border-transparent shadow-sm',
        header: 'text-primary bg-primary/5'
    },
    danger: {
        pill: 'bg-danger text-white border-transparent shadow-sm',
        header: 'text-danger bg-danger/10'
    },
    success: {
        pill: 'bg-success text-white border-transparent shadow-sm',
        header: 'text-success bg-success/10'
    },
}

// Baris opsi — di-memo agar ketik search tidak me-render ulang semua row
const OptionRow = memo(function OptionRow({ opt, selected, compact, onSelect }) {
    return (
        <button
            key={opt.id}
            type="button"
            onClick={(e) => { e.stopPropagation(); onSelect(opt.id) }}
            className={`w-full text-left ${compact ? 'px-3 py-1.5' : 'px-3.5 py-2'} text-xs font-medium leading-5 tabular-nums hover:bg-[var(--color-primary)]/5 transition-colors flex items-center justify-between group whitespace-nowrap ${selected ? 'text-[var(--color-primary)] bg-[var(--color-primary)]/5 font-bold' : 'text-[var(--color-text)]'}`}
        >
            <div className="flex items-center gap-2.5">
                <div className={`w-1.5 h-1.5 rounded-full transition-colors ${selected ? 'bg-[var(--color-primary)] scale-125' : 'bg-[var(--color-border)] group-hover:bg-[var(--color-text-muted)]'}`} />
                {opt.render ? opt.render : opt.name}
            </div>
            {selected && <Check className="w-4 h-4" />}
        </button>
    )
})

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
    groupTones,
    className = "",
    disabled = false,
    allowCustom = false,
    compact = false,
    usePortal = true,
    buttonClassName = "",
    maxHeight
}) => {
    const [search, setSearch] = useState('')
    const [activeGroup, setActiveGroup] = useState('All')
    const isMobile = useIsMobile()

    const { triggerRef, isOpen, open, close, toggle: baseToggle, updateCoords, coords } = usePopover({
        dropdownHeight: searchable ? 320 : 260
    })
    const [compactPlacement, setCompactPlacement] = useState('bottom')
    const searchInputRef = useRef(null)

    const statusClasses = {
        error: 'border-danger/50 focus:border-danger focus:ring-danger bg-danger/5',
        success: 'border-success/50 focus:border-success focus:ring-success bg-success/5',
        normal: 'border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)]'
    }

    const iconStatusClasses = {
        error: 'text-danger opacity-80',
        success: 'text-success opacity-80',
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

    const toggle = useCallback(() => {
        if (isOpen) {
            close()
            return
        }
        if ((compact || !usePortal) && triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect()
            const dropdownH = searchable ? 320 : Math.min(options.length * 36 + 16, 240)
            const spaceBelow = window.innerHeight - rect.bottom - 8
            setCompactPlacement(spaceBelow < dropdownH ? 'top' : 'bottom')
        }
        setSearch('')
        setActiveGroup('All')
        open()
    }, [isOpen, close, open, compact, usePortal, options.length, searchable, triggerRef])

    const handleSelect = useCallback((id) => {
        onChange(id)
        close()
    }, [onChange, close])

    // Fokuskan search saat dropdown terbuka (rAF, bukan setTimeout)
    useEffect(() => {
        if (isOpen && searchable) {
            const raf = requestAnimationFrame(() => searchInputRef.current?.focus())
            return () => cancelAnimationFrame(raf)
        }
    }, [isOpen, searchable])

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

    // Resolve tone class untuk group (lookup case-insensitive di kedua sisi)
    const groupToneLookup = useMemo(() => {
        if (!groupTones) return null
        const map = {}
        Object.keys(groupTones).forEach(k => { map[k.toLowerCase()] = groupTones[k] })
        return map
    }, [groupTones])

    const getGroupTone = useCallback((groupName) => {
        if (!groupToneLookup) return GROUP_TONES.primary
        const tone = groupToneLookup[groupName?.toLowerCase()]
        return GROUP_TONES[tone] || GROUP_TONES.primary
    }, [groupToneLookup])

    // ─── Dropdown content (shared between compact & portal modes) ───
    const renderDropdown = () => (
        <div className="flex flex-col min-h-0 h-full">
            {/* Search Bar */}
            {searchable && (
                <div className="p-2 border-b border-[var(--color-border)] bg-[var(--color-surface-alt)]/30 shrink-0">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)] opacity-40" />
                        <input
                            ref={searchInputRef}
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Cari..."
                            className="w-full h-9 pl-8 pr-8 rounded-lg border-[var(--color-border)] bg-[var(--color-surface)] text-xs font-medium leading-none focus:border-[var(--color-primary)] focus:ring-0 outline-none transition-colors"
                        />
                        {search && (
                            <button
                                onClick={() => setSearch('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-[var(--color-text-muted)] hover:text-danger transition-colors"
                            >
                                <X className="w-4 h-4" />
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
                        className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide leading-none transition-colors border ${activeGroup === 'All'
                                ? 'bg-[var(--color-primary)] text-white border-transparent shadow-sm'
                                : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] border-[var(--color-border)] hover:bg-[var(--color-surface-alt)]'
                            }`}
                    >
                        Semua
                    </button>
                    {uniqueGroups.map(g => {
                        const tone = getGroupTone(g)
                        return (
                            <button
                                key={g}
                                type="button"
                                onClick={() => setActiveGroup(g)}
                                className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide leading-none transition-colors border shrink-0 ${activeGroup === g
                                        ? tone.pill
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
                        className={`w-full text-left px-3.5 py-2 text-xs font-medium leading-5 tabular-nums hover:bg-[var(--color-primary)]/5 transition-colors flex items-center justify-between group whitespace-nowrap ${value === extraOption.id ? 'text-[var(--color-primary)] bg-[var(--color-primary)]/5 font-bold' : 'text-amber-600'}`}
                    >
                        <div className="flex items-center gap-2.5">
                            <div className={`w-1.5 h-1.5 rounded-full ${value === extraOption.id ? 'bg-[var(--color-primary)]' : 'bg-amber-600'}`} />
                            {extraOption.name}
                        </div>
                        {value === extraOption.id && <Check className="w-4 h-4" />}
                    </button>
                )}

                {allowCustom && search && !options.some(o => o.name?.toLowerCase() === search.toLowerCase()) && (
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleSelect(search) }}
                        className="w-full text-left px-3.5 py-2 text-xs font-medium leading-5 tabular-nums text-[var(--color-primary)] bg-[var(--color-primary)]/5 hover:bg-[var(--color-primary)]/10 transition-colors flex items-center justify-between group whitespace-nowrap border-b border-[var(--color-border)]"
                    >
                        <div className="flex items-center gap-2.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] animate-pulse" />
                            <span>Gunakan "{search}"</span>
                        </div>
                        <Check className="w-4 h-4" />
                    </button>
                )}

                {filteredOptions.length === 0 ? (
                    <div className="px-4 py-6 text-center">
                        <p className="text-xs font-medium leading-5 text-[var(--color-text-muted)] opacity-60">{allowCustom ? 'Ketik untuk menambahkan' : 'Tidak ditemukan'}</p>
                    </div>
                ) : groupedOptions ? (
                    /* ─── Grouped Rendering ─── */
                    Object.keys(groupedOptions).map(groupName => (
                        <div key={groupName} className="flex flex-col">
                            {/* Sticky Group Header (tone via groupTones prop) */}
                            <div className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wide leading-none border-y border-[var(--color-border)]/35 sticky top-0 z-10 select-none ${getGroupTone(groupName).header}`}>
                                {groupName}
                            </div>
                            {groupedOptions[groupName].map(opt => (
                                <OptionRow
                                    key={opt.id}
                                    opt={opt}
                                    selected={String(value) === String(opt.id)}
                                    compact={compact}
                                    onSelect={handleSelect}
                                />
                            ))}
                        </div>
                    ))
                ) : (
                    /* ─── Flat Rendering ─── */
                    filteredOptions.map((opt) => (
                        <OptionRow
                            key={opt.id}
                            opt={opt}
                            selected={String(value) === String(opt.id)}
                            compact={compact}
                            onSelect={handleSelect}
                        />
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
        heightClass = 'h-8'
        paddingClass = icon ? 'pl-8 pr-3 rtl:pl-3 rtl:pr-8' : 'px-3'
    } else {
        // h-9 = tinggi kontrol standar app (samakan dengan Button/Input)
        heightClass = 'h-9'
        paddingClass = icon ? 'pl-9 pr-3 rtl:pl-3 rtl:pr-9' : 'px-3'
    }

    return (
        <div className={`relative ${className}`} ref={triggerRef}>
            <button
                type="button"
                onClick={disabled ? undefined : toggle}
                disabled={disabled}
                className={`w-full flex items-center justify-between gap-2 ${hasCustomHeight ? '' : heightClass} ${paddingClass} rounded-lg border ${statusClasses[status]} bg-[var(--color-surface)] hover:bg-[var(--color-surface-alt)]/50 focus:ring-1 outline-none transition-colors leading-none tabular-nums ${compact || small ? 'text-xs font-semibold' : 'text-sm font-medium'} relative group shadow-sm ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${buttonClassName}`}
            >
                <div className="flex items-center gap-2 truncate">
                    {icon && !compact && renderIcon(icon, `absolute ${small ? 'left-3 rtl:left-auto rtl:right-3' : 'left-3.5 rtl:left-auto rtl:right-3.5'} w-4 h-4 top-1/2 -translate-y-1/2 transition-colors ${iconStatusClasses[status]}`)}
                    <span className={selectedOption ? 'text-[var(--color-text)]' : 'text-[var(--color-text-muted)] opacity-60'}>
                        {selectedOption ? (selectedOption.render ? selectedOption.render : selectedOption.name) : placeholder}
                    </span>
                </div>
                <ChevronDown className={`w-4 h-4 opacity-40 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180 text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'}`} />
            </button>

            {isOpen && (!usePortal || compact ? (
                /* ─── Compact/Inline: absolute dropdown ─── */
                <div
                    className={`absolute z-50 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-xl overflow-hidden animate-in fade-in duration-150 ${compactPlacement === 'top' ? 'slide-in-from-bottom-2' : 'slide-in-from-top-2'}`}
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
                                    close()
                                }}
                            />
                            <div
                                className="fixed bottom-0 left-0 right-0 z-[99999] bg-[var(--color-surface)] border-t border-[var(--color-border)] rounded-t-2xl shadow-xl animate-in slide-in-from-bottom duration-200 flex flex-col pb-safe"
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
                            data-popover-panel
                            className={`fixed z-[99999] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl sm:rounded-2xl shadow-xl animate-in fade-in ${coords.placement === 'top' ? 'slide-in-from-bottom-2' : 'slide-in-from-top-2'} duration-150 flex flex-col`}
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
