import React, { useState, useEffect, useCallback, useMemo, memo } from 'react'
import { createPortal } from 'react-dom'
import { Calendar, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react'
import { useLanguage } from '@context'
import { usePopover, useIsMobile } from '@shared/hooks/usePopover'

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

const DatePicker = memo(({
    value, // Format: YYYY-MM-DD
    onChange,
    placeholder,
    small = false,
    disabled = false,
    className = "",
    compact = false,
    clearable = true,
    min // YYYY-MM-DD — tanggal sebelum ini dinonaktifkan
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

    const isMobile = useIsMobile()
    const { triggerRef, isOpen, open, close, updateCoords, coords } = usePopover({ dropdownHeight: 300 })

    const [isFocused, setIsFocused] = useState(false)
    const [typedValue, setTypedValue] = useState('')

    const [currentDate, setCurrentDate] = useState(() => {
        if (value) {
            const d = new Date(value)
            if (!isNaN(d.getTime())) return d
        }
        return new Date()
    })

    const month = currentDate.getMonth()
    const year = currentDate.getFullYear()

    // Batas minimum (awal hari) — prop `min` kini benar-benar diterapkan
    const minDate = useMemo(() => {
        if (!min) return null
        const d = new Date(min)
        return isNaN(d.getTime()) ? null : new Date(d.getFullYear(), d.getMonth(), d.getDate())
    }, [min])

    const isBeforeMin = useCallback((day) => {
        if (!minDate || !day) return false
        return new Date(year, month, day) < minDate
    }, [minDate, year, month])

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

    const handleFocus = () => {
        setIsFocused(true)
        open()
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
        if (parsed && (!minDate || parsed >= minDate)) {
            const formattedMonth = String(parsed.getMonth() + 1).padStart(2, '0')
            const formattedDay = String(parsed.getDate()).padStart(2, '0')
            const yyyymmdd = `${parsed.getFullYear()}-${formattedMonth}-${formattedDay}`
            onChange(yyyymmdd)
            setCurrentDate(parsed)
        }
    }

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
        if (isBeforeMin(day)) return
        const formattedMonth = String(month + 1).padStart(2, '0')
        const formattedDay = String(day).padStart(2, '0')
        onChange(`${year}-${formattedMonth}-${formattedDay}`)
        setTypedValue(currentLocale.formatTyped(day, month, year))
        close()
    }, [year, month, onChange, currentLocale, close, isBeforeMin])

    const handleToday = useCallback((e) => {
        e.stopPropagation()
        e.preventDefault()
        const today = new Date()
        if (minDate && new Date(today.getFullYear(), today.getMonth(), today.getDate()) < minDate) return
        const formattedMonth = String(today.getMonth() + 1).padStart(2, '0')
        const formattedDay = String(today.getDate()).padStart(2, '0')
        onChange(`${today.getFullYear()}-${formattedMonth}-${formattedDay}`)
        setTypedValue(currentLocale.formatTyped(today.getDate(), today.getMonth(), today.getFullYear()))
        close()
    }, [onChange, currentLocale, close, minDate])

    const handleClear = useCallback((e) => {
        e.stopPropagation()
        e.preventDefault()
        onChange('')
        setTypedValue('')
        close()
    }, [onChange, close])

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
                    className="w-8 h-8 rounded-lg hover:bg-[var(--color-surface-alt)] text-[var(--color-text)] flex items-center justify-center transition-colors border border-[var(--color-border)]/30 active:scale-90"
                >
                    <ChevronLeft className="w-4 h-4 opacity-70" />
                </button>
                <span className="text-xs font-bold uppercase tracking-wide leading-none text-[var(--color-text)] truncate px-1">
                    {currentLocale.months[month]} {tNum(year)}
                </span>
                <button
                    type="button"
                    onClick={handleNextMonth}
                    className="w-8 h-8 rounded-lg hover:bg-[var(--color-surface-alt)] text-[var(--color-text)] flex items-center justify-center transition-colors border border-[var(--color-border)]/30 active:scale-90"
                >
                    <ChevronRight className="w-4 h-4 opacity-70" />
                </button>
            </div>

            {/* Days Short Name Header */}
            <div className="grid grid-cols-7 text-center mb-1.5 select-none">
                {currentLocale.daysShort.map((d, i) => (
                    <span key={i} className="text-xs font-semibold leading-none text-[var(--color-text-muted)] tracking-wide opacity-70">
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
                    const disabledDay = isBeforeMin(day)

                    return (
                        <button
                            key={`day-${day}`}
                            type="button"
                            onClick={() => handleSelectDay(day)}
                            disabled={disabledDay}
                            className={`w-full aspect-square max-w-[40px] max-h-[40px] mx-auto rounded-lg text-xs font-semibold leading-none tabular-nums transition-colors relative flex items-center justify-center ${selected
                                ? 'bg-[var(--color-primary)] text-white font-bold shadow-md scale-105'
                                : activeToday
                                    ? 'border-2 border-[var(--color-primary)] text-[var(--color-primary)] font-bold'
                                    : disabledDay
                                        ? 'text-[var(--color-text-muted)] opacity-30 cursor-not-allowed'
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
                        className="text-xs font-bold uppercase tracking-wide leading-none text-danger hover:bg-danger/10 px-2.5 py-1.5 rounded-lg transition-colors border border-transparent"
                    >
                        {currentLocale.clear}
                    </button>
                ) : (
                    <div />
                )}
                <button
                    type="button"
                    onClick={handleToday}
                    className="text-xs font-bold uppercase tracking-wide leading-none text-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 px-2.5 py-1.5 rounded-lg transition-colors border border-transparent"
                >
                    {currentLocale.today}
                </button>
            </div>
        </div>
    )

    return (
        <div className={`relative ${className}`} ref={triggerRef}>
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
                className={`w-full pl-9 pr-8 ${small || compact ? 'h-8' : 'h-9'} rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] focus:border-[var(--color-primary)] focus:bg-[var(--color-surface)] outline-none transition-colors text-xs sm:text-sm font-medium leading-none tabular-nums shadow-sm ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            />

            <Calendar
                className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)] opacity-50 pointer-events-none"
            />

            <ChevronDown
                className={`absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40 transition-transform duration-200 pointer-events-none ${isOpen ? 'rotate-180 text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'}`}
            />

            {/* Portal Dropdown Calendar */}
            {isOpen && createPortal(
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
                            className="fixed bottom-0 left-0 right-0 z-[99999] bg-[var(--color-surface)] border-t border-[var(--color-border)] rounded-t-2xl shadow-xl animate-in slide-in-from-bottom duration-200 flex flex-col pb-4"
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
                        data-popover-panel
                        className="fixed z-[99999] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150"
                        style={{
                            left: Math.max(16, Math.min(coords.left, window.innerWidth - 240 - 16)),
                            top: coords.placement === 'top' ? 'auto' : coords.bottom + 8,
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

DatePicker.displayName = 'DatePicker'

export default DatePicker
