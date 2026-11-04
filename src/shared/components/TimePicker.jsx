import React, { useState, useEffect, useCallback, useMemo, memo } from 'react'
import { createPortal } from 'react-dom'
import { Clock, ChevronDown, ChevronUp, Check } from 'lucide-react'
import { useLanguage } from '@context'
import { usePopover, useIsMobile } from '@shared/hooks/usePopover'

const TIME_LOCALES = {
    id: {
        clear: 'Hapus',
        done: 'Selesai',
        am: 'AM',
        pm: 'PM'
    },
    en: {
        clear: 'Clear',
        done: 'Done',
        am: 'AM',
        pm: 'PM'
    },
    ar: {
        clear: 'حذف',
        done: 'تم',
        am: 'ص',
        pm: 'م'
    }
}

const normalizeArabicDigits = (str) => {
    if (!str) return ''
    const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩']

    // Normalize Eastern Arabic numerals and am/pm indicator translations
    let clean = str.replace(/[٠-٩]/g, d => String(arabicDigits.indexOf(d)))
    clean = clean.replace(/ص/g, 'AM').replace(/م/g, 'PM')
    return clean
}

// Parse typed time strings in 12H (e.g., "01:06 PM", "1:30 am") or 24H (e.g., "13:06", "9:15")
const parseTimeString = (str) => {
    if (!str) return null
    const clean = normalizeArabicDigits(str.trim().toUpperCase())

    // Check 12H format with AM/PM: e.g. "01:06 PM", "1:06 PM", "5:30 AM"
    let match = clean.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/)
    if (match) {
        let h = parseInt(match[1], 10)
        const m = parseInt(match[2], 10)
        const period = match[3]
        if (h >= 1 && h <= 12 && m >= 0 && m < 60) {
            if (period === 'PM' && h < 12) h += 12
            if (period === 'AM' && h === 12) h = 0
            return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
        }
    }

    // Check 24H format: e.g. "13:06", "09:15", "9:15"
    match = clean.match(/^(\d{1,2}):(\d{2})$/)
    if (match) {
        const h = parseInt(match[1], 10)
        const m = parseInt(match[2], 10)
        if (h >= 0 && h < 24 && m >= 0 && m < 60) {
            return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
        }
    }
    return null
}

const TimePicker = memo(({
    value, // Format: "HH:MM"
    onChange,
    disabled = false,
    className = "",
    compact = false,
    placeholder = "--:-- --",
    clearable = false
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

    const currentLocale = useMemo(() => TIME_LOCALES[systemLanguage] || TIME_LOCALES.id, [systemLanguage])

    // Default to 12H for English, 24H for Indonesian / Arabic
    const defaultIs24h = useMemo(() => systemLanguage !== 'en', [systemLanguage])

    const isMobile = useIsMobile()
    const { triggerRef, isOpen, open, close, coords } = usePopover({ dropdownHeight: 170 })

    const [isFocused, setIsFocused] = useState(false)
    const [typedValue, setTypedValue] = useState('')

    // Active visual state inside the popover
    const [activeTimeStr, setActiveTimeStr] = useState(value || '12:00')
    const [is24h, setIs24h] = useState(defaultIs24h)

    // Synchronize is24h default format when active language changes
    useEffect(() => {
        setIs24h(defaultIs24h)
    }, [defaultIs24h])

    // Update internal active time when prop changes
    useEffect(() => {
        if (value) {
            setActiveTimeStr(value)
        }
    }, [value])

    const formatTimeHelper = useCallback((timeStr) => {
        if (!timeStr) return ''
        const [hStr, mStr] = timeStr.split(':')
        const h24 = parseInt(hStr || '0', 10)
        const m = mStr || '00'

        if (is24h) {
            return `${String(h24).padStart(2, '0')}:${m}`
        } else {
            const isPm = h24 >= 12
            const suffix = isPm ? currentLocale.pm : currentLocale.am
            let h12 = h24 % 12
            if (h12 === 0) h12 = 12
            return `${String(h12).padStart(2, '0')}:${m} ${suffix}`
        }
    }, [is24h, currentLocale])

    // Format display value based on format
    const displayVal = useMemo(() => {
        return tNum(formatTimeHelper(value))
    }, [value, formatTimeHelper, tNum])

    // Sync input field value
    useEffect(() => {
        if (!isFocused) {
            setTypedValue(displayVal)
        }
    }, [displayVal, isFocused])

    // Update typedValue when activeTimeStr changes while popover is open
    useEffect(() => {
        if (isOpen) {
            setTypedValue(formatTimeHelper(activeTimeStr))
        }
    }, [activeTimeStr, isOpen, formatTimeHelper])

    const handleFocus = () => {
        setIsFocused(true)
        open()
    }

    const handleBlur = () => {
        setIsFocused(false)
        setTypedValue(displayVal)
    }

    const handleInputChange = (e) => {
        const val = e.target.value
        setTypedValue(val)

        const parsed = parseTimeString(val)
        if (parsed) {
            onChange(parsed)
            setActiveTimeStr(parsed)
        }
    }

    // Time adjustment functions (langsung commit — nilai draft tidak pernah tertahan)
    const adjustHour = (amount) => {
        let [h, m] = activeTimeStr.split(':').map(Number)
        h = (h + amount + 24) % 24
        const nextTime = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
        setActiveTimeStr(nextTime)
        onChange(nextTime)
    }

    const adjustMinute = (amount) => {
        let [h, m] = activeTimeStr.split(':').map(Number)
        m = (m + amount + 60) % 60
        const nextTime = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
        setActiveTimeStr(nextTime)
        onChange(nextTime)
    }

    const togglePeriod = () => {
        let [h, m] = activeTimeStr.split(':').map(Number)
        if (h >= 12) {
            h -= 12
        } else {
            h += 12
        }
        const nextTime = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
        setActiveTimeStr(nextTime)
        onChange(nextTime)
    }

    // Parsed visual time values for digital dial face
    const timeDisplay = useMemo(() => {
        const [hStr, mStr] = activeTimeStr.split(':')
        const h24 = parseInt(hStr || '0', 10)

        let hh = String(h24).padStart(2, '0')
        let suffix = ''

        if (!is24h) {
            const isPm = h24 >= 12
            suffix = isPm ? currentLocale.pm : currentLocale.am
            let h12 = h24 % 12
            if (h12 === 0) h12 = 12
            hh = String(h12).padStart(2, '0')
        }

        return {
            hour: hh,
            minute: mStr || '00',
            period: suffix
        }
    }, [activeTimeStr, is24h, currentLocale])

    const handleClear = useCallback((e) => {
        e.stopPropagation()
        e.preventDefault()
        onChange('')
        close()
    }, [onChange, close])

    const handleDone = () => {
        onChange(activeTimeStr)
        close()
    }

    const renderClockDropdown = () => (
        <>
            {/* Clock Face Adjusters */}
            <div className="px-4 py-2 flex-1 flex flex-col justify-center">
                <div className="flex items-center justify-center gap-8 sm:gap-4 py-2 bg-[var(--color-surface-alt)]/60 border border-[var(--color-border)]/45 rounded-2xl relative shadow-inner h-[88px]">
                    {/* Hour adjusters */}
                    <div className="flex flex-col items-center">
                        <button
                            type="button"
                            onClick={() => adjustHour(1)}
                            className="w-8 h-7 flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 rounded transition-colors active:scale-75"
                        >
                            <ChevronUp className="w-4 h-4" />
                        </button>
                        <span className="text-2xl font-bold tracking-tight tabular-nums leading-none text-[var(--color-text)] select-none">
                            {tNum(timeDisplay.hour)}
                        </span>
                        <button
                            type="button"
                            onClick={() => adjustHour(-1)}
                            className="w-8 h-7 flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 rounded transition-colors active:scale-75"
                        >
                            <ChevronDown className="w-4 h-4" />
                        </button>
                    </div>

                    <span className="text-xl font-bold leading-none text-[var(--color-text-muted)] pb-1 select-none">:</span>

                    {/* Minute adjusters */}
                    <div className="flex flex-col items-center">
                        <button
                            type="button"
                            onClick={() => adjustMinute(1)}
                            className="w-8 h-7 flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 rounded transition-colors active:scale-75"
                        >
                            <ChevronUp className="w-4 h-4" />
                        </button>
                        <span className="text-2xl font-bold tracking-tight tabular-nums leading-none text-[var(--color-text)] select-none">
                            {tNum(timeDisplay.minute)}
                        </span>
                        <button
                            type="button"
                            onClick={() => adjustMinute(-1)}
                            className="w-8 h-7 flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 rounded transition-colors active:scale-75"
                        >
                            <ChevronDown className="w-4 h-4" />
                        </button>
                    </div>

                    {/* AM/PM toggle (12h mode only, comfortable large pill) */}
                    {!is24h && (
                        <button
                            type="button"
                            onClick={togglePeriod}
                            className="ml-1 px-2.5 py-1.5 text-xs font-bold tracking-wide leading-none text-white bg-[var(--color-primary)] rounded-lg shadow-sm hover:brightness-110 active:scale-90 transition-colors select-none"
                        >
                            {timeDisplay.period}
                        </button>
                    )}
                </div>
            </div>

            {/* Popover Footer Action */}
            <div className="p-2 border-t border-[var(--color-border)]/45 bg-[var(--color-surface-alt)]/15 h-[48px] shrink-0 flex items-center gap-2">
                {clearable && (
                    <button
                        type="button"
                        onClick={handleClear}
                        className="px-3 h-8 rounded-lg border border-danger/30 bg-danger/10 text-danger hover:bg-danger/20 text-xs font-bold tracking-wide leading-none uppercase transition-colors shrink-0"
                    >
                        {currentLocale.clear}
                    </button>
                )}
                <button
                    type="button"
                    onClick={() => setIs24h(!is24h)}
                    className="px-3 h-8 rounded-lg border border-[var(--color-border)] hover:bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] hover:text-[var(--color-primary)] text-xs font-bold tracking-wide leading-none uppercase transition-colors shrink-0"
                >
                    {is24h ? '24H' : '12H'}
                </button>
                <button
                    type="button"
                    onClick={handleDone}
                    className="flex-1 h-8 rounded-lg bg-[var(--color-primary)] text-white text-xs font-bold uppercase tracking-wide leading-none hover:brightness-110 active:scale-[0.98] transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                >
                    <Check className="w-4 h-4 text-white" />
                    <span>{currentLocale.done}</span>
                </button>
            </div>
        </>
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
                placeholder={placeholder}
                inputMode={isMobile ? 'none' : undefined}
                readOnly={isMobile || disabled}
                className={`w-full pl-9 pr-8 ${compact ? 'h-8' : 'h-9'} rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] focus:border-[var(--color-primary)] focus:bg-[var(--color-surface)] outline-none transition-colors text-xs sm:text-sm font-medium leading-none tabular-nums shadow-sm ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            />

            <Clock
                className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)] opacity-50 pointer-events-none"
            />

            <ChevronDown
                className={`absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40 transition-transform duration-200 pointer-events-none ${isOpen ? 'rotate-180 text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'}`}
            />

            {/* Headerless Highly-Readable Dropdown */}
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
                            className="fixed bottom-0 left-0 right-0 z-[99999] bg-[var(--color-surface)] border-t border-[var(--color-border)] rounded-t-2xl shadow-xl animate-in slide-in-from-bottom duration-200 flex flex-col select-none"
                            onMouseDown={(e) => {
                                e.stopPropagation()
                                e.preventDefault()
                            }}
                            style={{ height: 'auto' }}
                        >
                            <div className="w-12 h-1 bg-[var(--color-border)] rounded-full mx-auto my-2.5 shrink-0" />
                            <div className="flex justify-center w-full pb-4">
                                <div className="w-full max-w-[280px] h-[150px] flex flex-col justify-between">
                                    {renderClockDropdown()}
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div
                        data-popover-panel
                        className={`fixed z-[99999] w-[200px] h-[150px] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-xl overflow-hidden animate-in fade-in ${coords.placement === 'top' ? 'slide-in-from-bottom-3' : 'slide-in-from-top-3'} duration-150 select-none flex flex-col justify-between`}
                        style={{
                            left: Math.max(16, Math.min(coords.right - 200, window.innerWidth - 200 - 16)),
                            top: coords.placement === 'top' ? 'auto' : coords.bottom + 8,
                            bottom: coords.placement === 'top' ? (window.innerHeight - coords.top) + 8 : 'auto',
                        }}
                    >
                        {renderClockDropdown()}
                    </div>
                ),
                document.body
            )}
        </div>
    )
})

TimePicker.displayName = 'TimePicker'

export default TimePicker
