import React, { useState, useRef, useEffect, useCallback, useMemo, memo } from 'react'
import { createPortal } from 'react-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faClock, faChevronDown, faChevronUp, faCheck } from '@fortawesome/free-solid-svg-icons'
import { useLanguage } from '@context'

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

const RichTimePicker = memo(({
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
    
    // Active visual state inside the popover
    const [activeTimeStr, setActiveTimeStr] = useState(value || '12:00')
    const [is24h, setIs24h] = useState(defaultIs24h)

    // Synchronize is24h default format when active language changes
    useEffect(() => {
        setIs24h(defaultIs24h)
    }, [defaultIs24h])

    const ref = useRef(null)
    const [coords, setCoords] = useState({ top: 0, bottom: 0, left: 0, right: 0, width: 0, placement: 'bottom' })

    // Update internal active time when prop changes
    useEffect(() => {
        if (value) {
            setActiveTimeStr(value)
        }
    }, [value])

    const updateCoords = useCallback(() => {
        if (ref.current) {
            const rect = ref.current.getBoundingClientRect()
            const dropdownHeight = 150
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
                right: rect.right,
                width: rect.width,
                placement: shouldFlip ? 'top' : 'bottom'
            })
        }
    }, [setIsOpen])

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
        updateCoords()
        setIsOpen(true)
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

    useEffect(() => {
        if (!isOpen) return

        const handleClickOutside = (e) => {
            if (ref.current && !ref.current.contains(e.target)) {
                handleDone()
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
    }, [isOpen, updateCoords, activeTimeStr])

    // Time adjustment functions
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
        setIsOpen(false)
    }, [onChange])

    const handleDone = () => {
        onChange(activeTimeStr)
        setIsOpen(false)
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
                            className="w-8 h-5 flex items-center justify-center text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 rounded transition-colors active:scale-75"
                        >
                            <FontAwesomeIcon icon={faChevronUp} />
                        </button>
                        <span className="text-[24px] font-black tracking-wider text-[var(--color-text)] select-none">
                            {tNum(timeDisplay.hour)}
                        </span>
                        <button
                            type="button"
                            onClick={() => adjustHour(-1)}
                            className="w-8 h-5 flex items-center justify-center text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 rounded transition-colors active:scale-75"
                        >
                            <FontAwesomeIcon icon={faChevronDown} />
                        </button>
                    </div>

                    <span className="text-xl font-black text-[var(--color-text-muted)] pb-1 select-none">:</span>

                    {/* Minute adjusters */}
                    <div className="flex flex-col items-center">
                        <button
                            type="button"
                            onClick={() => adjustMinute(1)}
                            className="w-8 h-5 flex items-center justify-center text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 rounded transition-colors active:scale-75"
                        >
                            <FontAwesomeIcon icon={faChevronUp} />
                        </button>
                        <span className="text-[24px] font-black tracking-wider text-[var(--color-text)] select-none">
                            {tNum(timeDisplay.minute)}
                        </span>
                        <button
                            type="button"
                            onClick={() => adjustMinute(-1)}
                            className="w-8 h-5 flex items-center justify-center text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 rounded transition-colors active:scale-75"
                        >
                            <FontAwesomeIcon icon={faChevronDown} />
                        </button>
                    </div>

                    {/* AM/PM toggle (12h mode only, comfortable large pill) */}
                    {!is24h && (
                        <button
                            type="button"
                            onClick={togglePeriod}
                            className="ml-1 px-2.5 py-1.5 text-[11px] font-black tracking-widest text-white bg-[var(--color-primary)] rounded-lg shadow-sm hover:brightness-110 active:scale-90 transition-all select-none"
                        >
                            {timeDisplay.period}
                        </button>
                    )}
                </div>
            </div>

            {/* Popover Footer Action */}
            <div className="p-2 border-t border-[var(--color-border)]/45 bg-[var(--color-surface-alt)]/15 h-[44px] shrink-0 flex items-center gap-2">
                {clearable && (
                    <button
                        type="button"
                        onClick={handleClear}
                        className="px-2.5 h-8 rounded-xl border border-red-200 bg-red-50 text-red-500 hover:bg-red-100 text-[9.5px] font-black tracking-widest uppercase transition-all shrink-0"
                    >
                        {currentLocale.clear}
                    </button>
                )}
                <button
                    type="button"
                    onClick={() => setIs24h(!is24h)}
                    className="px-3 h-8 rounded-xl border border-[var(--color-border)] hover:bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] hover:text-[var(--color-primary)] text-[9.5px] font-black tracking-widest uppercase transition-colors shrink-0"
                >
                    {is24h ? '24H' : '12H'}
                </button>
                <button
                    type="button"
                    onClick={handleDone}
                    className="flex-1 h-8 rounded-xl bg-[var(--color-primary)] text-white text-[9.5px] font-black uppercase tracking-widest hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-1 shadow-sm"
                >
                    <FontAwesomeIcon icon={faCheck} className="text-[10px] text-white" />
                    <span>{currentLocale.done}</span>
                </button>
            </div>
        </>
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
                placeholder={placeholder}
                inputMode={isMobile ? 'none' : undefined}
                readOnly={isMobile || disabled}
                className={`w-full pl-9 pr-8 h-[40px] rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] focus:border-[var(--color-primary)] focus:bg-[var(--color-surface)] outline-none transition-all text-xs font-black shadow-sm ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            />
            
            <FontAwesomeIcon 
                icon={faClock} 
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-[var(--color-text-muted)] opacity-50 pointer-events-none" 
            />
            
            <FontAwesomeIcon 
                icon={faChevronDown} 
                className={`absolute right-3.5 top-1/2 -translate-y-1/2 text-[9px] opacity-40 transition-transform duration-300 pointer-events-none ${isOpen ? 'rotate-180 text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'}`} 
            />

            {/* Premium Headerless Highly-Readable Dropdown */}
            {isOpen && createPortal(
                isMobile ? (
                    <>
                        <div
                            className="fixed inset-0 bg-black/40 z-[99998] animate-in fade-in duration-200"
                            onMouseDown={(e) => {
                                e.stopPropagation()
                                handleDone()
                            }}
                        />
                        <div
                            className="fixed bottom-0 left-0 right-0 z-[99999] bg-[var(--color-surface)] border-t border-[var(--color-border)] rounded-t-2xl shadow-2xl animate-in slide-in-from-bottom duration-200 flex flex-col select-none"
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
                        className={`fixed z-[99999] w-[200px] h-[150px] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in ${coords.placement === 'top' ? 'slide-in-from-bottom-3' : 'slide-in-from-top-3'} select-none flex flex-col justify-between`}
                        onMouseDown={(e) => {
                            e.stopPropagation()
                            e.preventDefault()
                        }}
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

RichTimePicker.displayName = 'RichTimePicker'

export default RichTimePicker