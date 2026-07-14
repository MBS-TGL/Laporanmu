import React, { useState, useRef, useEffect, useCallback, useMemo, memo } from 'react'
import { createPortal } from 'react-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCalendarAlt, faChevronLeft, faChevronRight, faChevronDown } from '@fortawesome/free-solid-svg-icons'
import { useLanguage } from '@context'

const LOCALES = {
    id: {
        months: [
            'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
            'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
        ],
        daysShort: ['Sn', 'Sl', 'Rb', 'Km', 'Jm', 'Sb', 'Mg'],
        formatResting: (d, m, y) => `${d} ${LOCALES.id.months[m]} ${y}`,
        formatTyped: (d, m, y) => `${d}/${m + 1}/${y}`,
        placeholder: 'Pilih Tanggal',
        today: 'Hari Ini',
        clear: 'Hapus',
        parse: (str) => {
            const clean = str.trim()
            let match = clean.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/)
            if (match) {
                const day = parseInt(match[1], 10)
                const month = parseInt(match[2], 10) - 1
                const year = parseInt(match[3], 10)
                return { day, month, year }
            }
            return null
        }
    },
    en: {
        months: [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ],
        daysShort: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'],
        formatResting: (d, m, y) => `${LOCALES.en.months[m]} ${d}, ${y}`,
        formatTyped: (d, m, y) => `${m + 1}/${d}/${y}`,
        placeholder: 'Choose Date',
        today: 'Today',
        clear: 'Clear',
        parse: (str) => {
            const clean = str.trim()
            let match = clean.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/)
            if (match) {
                const month = parseInt(match[1], 10) - 1
                const day = parseInt(match[2], 10)
                const year = parseInt(match[3], 10)
                return { day, month, year }
            }
            return null
        }
    },
    ar: {
        months: [
            'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
            'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
        ],
        daysShort: ['ن', 'ث', 'ر', 'خ', 'ج', 'س', 'ح'],
        formatResting: (d, m, y) => `${d} ${LOCALES.ar.months[m]} ${y}`,
        formatTyped: (d, m, y) => `${d}/${m + 1}/${y}`,
        placeholder: 'اختر التاريخ',
        today: 'اليوم',
        clear: 'حذف',
        parse: (str) => {
            const clean = str.trim()
            let match = clean.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/)
            if (match) {
                const day = parseInt(match[1], 10)
                const month = parseInt(match[2], 10) - 1
                const year = parseInt(match[3], 10)
                return { day, month, year }
            }
            return null
        }
    }
}

const normalizeArabicDigits = (str) => {
    if (!str) return ''
    const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩']
    return str.replace(/[٠-٩]/g, d => String(arabicDigits.indexOf(d)))
}

// Parse typed strings dynamically based on selected system language
const parseDateString = (str, lang) => {
    if (!str) return null
    const clean = normalizeArabicDigits(str.trim())

    // First try standard database format YYYY-MM-DD or YYYY/MM/DD
    let match = clean.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/)
    if (match) {
        const y = parseInt(match[1], 10)
        const m = parseInt(match[2], 10) - 1
        const d = parseInt(match[3], 10)
        const date = new Date(y, m, d)
        if (!isNaN(date.getTime()) && date.getFullYear() === y && date.getMonth() === m && date.getDate() === d) {
            return date
        }
    }

    // Next, try localized parser
    const parser = LOCALES[lang] || LOCALES.id
    const parsed = parser.parse(clean)
    if (parsed) {
        const { day, month, year } = parsed
        const date = new Date(year, month, day)
        if (!isNaN(date.getTime()) && date.getFullYear() === year && date.getMonth() === month && date.getDate() === day) {
            return date
        }
    }
    return null
}

const RichDatePicker = memo(({
    value, // Format: YYYY-MM-DD
    onChange,
    placeholder,
    small = false,
    disabled = false,
    className = "",
    compact = false,
    clearable = true
}) => {
    // Access active language context with safe fallback
    let systemLanguage = 'id'
    let tNum = (val) => String(val)
    try {
        const langCtx = useLanguage()
        if (langCtx && langCtx.language) {
            systemLanguage = langCtx.language
        }
        if (langCtx && langCtx.tNum) {
            tNum = langCtx.tNum
        }
    } catch {
        // Safe fallback
    }

    const currentLocale = useMemo(() => LOCALES[systemLanguage] || LOCALES.id, [systemLanguage])
    const defaultPlaceholder = useMemo(() => {
        const ph = placeholder || currentLocale.placeholder
        return tNum(ph)
    }, [placeholder, currentLocale, tNum])

    const [isOpen, setIsOpen] = useState(false)
    const [isFocused, setIsFocused] = useState(false)
    const [typedValue, setTypedValue] = useState('')
    const [isMobile, setIsMobile] = useState(false)

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 640)
        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

    const [currentDate, setCurrentDate] = useState(() => {
        if (value) {
            const d = new Date(value)
            if (!isNaN(d.getTime())) return d
        }
        return new Date()
    })

    const [coords, setCoords] = useState({ top: 0, left: 0, width: 0, placement: 'bottom', maxHeight: 360 })
    const ref = useRef(null)

    // Synchronize currentDate and typedValue when value prop or active language changes
    useEffect(() => {
        if (value) {
            const d = new Date(value)
            if (!isNaN(d.getTime())) {
                setCurrentDate(d)

                const [y, m, dStr] = value.split('-')
                setTypedValue(currentLocale.formatTyped(parseInt(dStr, 10), parseInt(m, 10) - 1, parseInt(y, 10)))
            }
        } else if (!isFocused) {
            setTypedValue('')
        }
    }, [value, isFocused, currentLocale])

    const updateCoords = useCallback(() => {
        if (ref.current) {
            const rect = ref.current.getBoundingClientRect()
            const dropdownHeight = 260
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
                left: rect.left,
                width: rect.width,
                placement: shouldFlip ? 'top' : 'bottom',
                maxHeight: shouldFlip ? spaceAbove - 16 : spaceBelow - 16
            })
        }
    }, [setIsOpen])

    const handleFocus = () => {
        setIsFocused(true)
        updateCoords()
        setIsOpen(true)
    }

    const handleBlur = () => {
        setIsFocused(false)

        // Restore input to match valid value
        if (value) {
            const [y, m, dStr] = value.split('-')
            setTypedValue(currentLocale.formatTyped(parseInt(dStr, 10), parseInt(m, 10) - 1, parseInt(y, 10)))
        } else {
            setTypedValue('')
        }
    }

    const handleInputChange = (e) => {
        const val = e.target.value
        setTypedValue(val)

        const parsed = parseDateString(val, systemLanguage)
        if (parsed) {
            const formattedMonth = String(parsed.getMonth() + 1).padStart(2, '0')
            const formattedDay = String(parsed.getDate()).padStart(2, '0')
            const yyyymmdd = `${parsed.getFullYear()}-${formattedMonth}-${formattedDay}`
            onChange(yyyymmdd)
            setCurrentDate(parsed)
        }
    }

    useEffect(() => {
        if (!isOpen) return

        const handleClickOutside = (e) => {
            if (ref.current && !ref.current.contains(e.target)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)

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
    }, [isOpen, updateCoords])

    const month = currentDate.getMonth()
    const year = currentDate.getFullYear()

    const handlePrevMonth = useCallback((e) => {
        e.stopPropagation()
        e.preventDefault()
        setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
    }, [])

    const handleNextMonth = useCallback((e) => {
        e.stopPropagation()
        e.preventDefault()
        setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
    }, [])

    const handleSelectDay = useCallback((day) => {
        const formattedMonth = String(month + 1).padStart(2, '0')
        const formattedDay = String(day).padStart(2, '0')
        onChange(`${year}-${formattedMonth}-${formattedDay}`)
        setTypedValue(currentLocale.formatTyped(day, month, year))
        setIsOpen(false)
    }, [year, month, onChange, currentLocale])

    const handleToday = useCallback((e) => {
        e.stopPropagation()
        e.preventDefault()
        const today = new Date()
        const formattedMonth = String(today.getMonth() + 1).padStart(2, '0')
        const formattedDay = String(today.getDate()).padStart(2, '0')
        onChange(`${today.getFullYear()}-${formattedMonth}-${formattedDay}`)
        setTypedValue(currentLocale.formatTyped(today.getDate(), today.getMonth(), today.getFullYear()))
        setIsOpen(false)
    }, [onChange, currentLocale])

    const handleClear = useCallback((e) => {
        e.stopPropagation()
        e.preventDefault()
        onChange('')
        setTypedValue('')
        setIsOpen(false)
    }, [onChange])

    // Generate days grid
    const daysInMonth = useMemo(() => new Date(year, month + 1, 0).getDate(), [year, month])

    // First day of month index (adjusted so Monday = 0, ..., Sunday = 6)
    const firstDayIndex = useMemo(() => {
        const d = new Date(year, month, 1).getDay()
        return d === 0 ? 6 : d - 1
    }, [year, month])

    const calendarGrid = useMemo(() => {
        const cells = []
        for (let i = 0; i < firstDayIndex; i++) {
            cells.push(null)
        }
        for (let i = 1; i <= daysInMonth; i++) {
            cells.push(i)
        }
        return cells
    }, [firstDayIndex, daysInMonth])

    const isSelected = useCallback((day) => {
        if (!value || !day) return false
        const [y, m, d] = value.split('-').map(Number)
        return d === day && (m - 1) === month && y === year
    }, [value, month, year])

    const isToday = useCallback((day) => {
        if (!day) return false
        const today = new Date()
        return today.getDate() === day && today.getMonth() === month && today.getFullYear() === year
    }, [month, year])

    // Display resting value (e.g., "29 Mei 2026" or "May 29, 2026")
    const displayVal = useMemo(() => {
        if (!value) return ''
        const [y, m, d] = value.split('-')
        const resting = currentLocale.formatResting(parseInt(d, 10), parseInt(m, 10) - 1, parseInt(y, 10))
        return tNum(resting)
    }, [value, currentLocale, tNum])

    const renderCalendar = () => (
        <div className={`p-2.5 bg-[var(--color-surface)] ${isMobile ? 'w-full max-w-sm px-4' : 'w-[230px] sm:w-[240px]'}`}>
            {/* Header: Month & Year Selector */}
            <div className="flex items-center justify-between mb-2 pb-1 border-b border-[var(--color-border)]/40 select-none">
                <button
                    type="button"
                    onClick={handlePrevMonth}
                    className="w-7 h-7 rounded-lg hover:bg-[var(--color-surface-alt)] text-[var(--color-text)] flex items-center justify-center transition-colors border border-[var(--color-border)]/30 active:scale-90"
                >
                    <FontAwesomeIcon icon={faChevronLeft} className="text-[10px] opacity-70" />
                </button>
                <span className="text-[10px] font-black uppercase tracking-[0.15em] text-[var(--color-text)]">
                    {currentLocale.months[month]} {tNum(year)}
                </span>
                <button
                    type="button"
                    onClick={handleNextMonth}
                    className="w-7 h-7 rounded-lg hover:bg-[var(--color-surface-alt)] text-[var(--color-text)] flex items-center justify-center transition-colors border border-[var(--color-border)]/30 active:scale-90"
                >
                    <FontAwesomeIcon icon={faChevronRight} className="text-[10px] opacity-70" />
                </button>
            </div>

            {/* Days Short Name Header */}
            <div className="grid grid-cols-7 text-center mb-1.5 select-none">
                {currentLocale.daysShort.map((d, i) => (
                    <span key={i} className="text-[9px] font-bold text-[var(--color-text-muted)] tracking-wider opacity-60">
                        {d}
                    </span>
                ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
                {calendarGrid.map((day, idx) => {
                    if (day === null) {
                        return <div key={`empty-${idx}`} />
                    }

                    const selected = isSelected(day)
                    const activeToday = isToday(day)

                    return (
                        <button
                            key={`day-${day}`}
                            type="button"
                            onClick={() => handleSelectDay(day)}
                            className={`w-full aspect-square max-w-[40px] max-h-[40px] mx-auto rounded-lg text-[10.5px] font-bold transition-all relative flex items-center justify-center ${selected
                                ? 'bg-[var(--color-primary)] text-white font-black shadow-md shadow-[var(--color-primary)]/10 scale-105'
                                : activeToday
                                    ? 'border-2 border-[var(--color-primary)]/50 text-[var(--color-primary)] font-black'
                                    : 'hover:bg-[var(--color-surface-alt)] text-[var(--color-text)]'
                                }`}
                        >
                            {tNum(day)}
                        </button>
                    )
                })}
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-between pt-2 border-t border-[var(--color-border)] select-none">
                {clearable ? (
                    <button
                        type="button"
                        onClick={handleClear}
                        className="text-[9px] font-black uppercase tracking-widest text-red-500 hover:bg-red-50 px-2 py-1.5 rounded-lg transition-all border border-transparent hover:border-red-100"
                    >
                        {currentLocale.clear}
                    </button>
                ) : (
                    <div />
                )}
                <button
                    type="button"
                    onClick={handleToday}
                    className="text-[9px] font-black uppercase tracking-widest text-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 px-2 py-1.5 rounded-lg transition-all border border-transparent"
                >
                    {currentLocale.today}
                </button>
            </div>
        </div>
    )

    return (
        <div className={`relative ${className}`} ref={ref}>
            <input
                type="text"
                value={isFocused ? tNum(typedValue) : displayVal}
                onChange={handleInputChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                disabled={disabled}
                placeholder={defaultPlaceholder}
                inputMode={isMobile ? 'none' : undefined}
                readOnly={isMobile || disabled}
                className={`w-full pl-9 pr-8 h-[40px] rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] focus:border-[var(--color-primary)] focus:bg-[var(--color-surface)] outline-none transition-all text-xs font-black shadow-sm ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            />

            <FontAwesomeIcon
                icon={faCalendarAlt}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-[var(--color-text-muted)] opacity-50 pointer-events-none"
            />

            <FontAwesomeIcon
                icon={faChevronDown}
                className={`absolute right-3.5 top-1/2 -translate-y-1/2 text-[9px] opacity-40 transition-transform duration-300 pointer-events-none ${isOpen ? 'rotate-180 text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'}`}
            />

            {/* Portal Dropdown Calendar */}
            {isOpen && createPortal(
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
                            className="fixed bottom-0 left-0 right-0 z-[99999] bg-[var(--color-surface)] border-t border-[var(--color-border)] rounded-t-2xl shadow-2xl animate-in slide-in-from-bottom duration-200 flex flex-col pb-4"
                            onMouseDown={(e) => {
                                e.stopPropagation()
                                e.preventDefault()
                            }}
                        >
                            <div className="w-12 h-1 bg-[var(--color-border)] rounded-full mx-auto my-2.5 shrink-0" />
                            <div className="flex justify-center w-full">
                                {renderCalendar()}
                            </div>
                        </div>
                    </>
                ) : (
                    <div
                        className="fixed z-[99999] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-3"
                        onMouseDown={(e) => {
                            e.stopPropagation()
                            e.preventDefault()
                        }}
                        style={{
                            left: Math.max(16, Math.min(coords.left, window.innerWidth - 240 - 16)),
                            top: coords.placement === 'top' ? 'auto' : coords.top + 48,
                            bottom: coords.placement === 'top' ? (window.innerHeight - coords.top) + 8 : 'auto',
                        }}
                    >
                        {renderCalendar()}
                    </div>
                ),
                document.body
            )}
        </div>
    )
})

RichDatePicker.displayName = 'RichDatePicker'

export default RichDatePicker