import React, { useState, useRef, useEffect, useCallback, useMemo, memo } from 'react'
import { createPortal } from 'react-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faCalendarAlt, faClock, faXmark, faChevronLeft,
    faChevronRight, faChevronDown, faChevronUp, faCheck
} from '@fortawesome/free-solid-svg-icons'

const MONTHS = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
]

const DAYS_SHORT = ['Sn', 'Sl', 'Rb', 'Km', 'Jm', 'Sb', 'Mg']

// Helper to format ISO YYYY-MM-DD and HH:MM
const parseDateTime = (val) => {
    const now = new Date()
    let dateStr = now.toISOString().slice(0, 10)
    let timeStr = now.toTimeString().slice(0, 5)

    if (val && val.includes('T')) {
        const parts = val.split('T')
        if (parts[0]) dateStr = parts[0]
        if (parts[1]) timeStr = parts[1].slice(0, 5)
    } else if (val) {
        dateStr = val
    }

    const [year, monthStr, dayStr] = dateStr.split('-')
    const [hStr, mStr] = timeStr.split(':')

    const y = parseInt(year || now.getFullYear(), 10)
    const m = parseInt(monthStr || (now.getMonth() + 1), 10) - 1 // 0-indexed
    const d = parseInt(dayStr || now.getDate(), 10)

    let hour = parseInt(hStr || '12', 10)
    const minute = mStr || '00'
    const period = hour >= 12 ? 'PM' : 'AM'
    hour = hour % 12
    if (hour === 0) hour = 12

    return {
        year: y,
        month: m,
        day: d,
        hour12: String(hour).padStart(2, '0'),
        minute,
        period,
        dateStr,
        time24Str: timeStr
    }
}

const RichDateTimePicker = memo(({
    value, // Format: YYYY-MM-DDTHH:MM
    onChange,
    placeholder = 'Pilih Tanggal & Waktu...',
    disabled = false,
    className = ""
}) => {
    const [isOpen, setIsOpen] = useState(false)
    const ref = useRef(null)
    const [coords, setCoords] = useState({ top: 0, bottom: 0, left: 0, right: 0, width: 0, placement: 'bottom' })

    // Active visual state inside the opened popover
    const parsed = useMemo(() => parseDateTime(value), [value])
    const [activeDateStr, setActiveDateStr] = useState(parsed.dateStr)
    const [activeTimeStr, setActiveTimeStr] = useState(parsed.time24Str)
    
    // 12h / 24h format state
    const [is24h, setIs24h] = useState(false)

    // Keep active calendar month view state
    const [calendarDate, setCalendarDate] = useState(() => {
        const d = new Date(parsed.dateStr)
        return isNaN(d.getTime()) ? new Date() : d
    })

    // Update active states when base value changes
    useEffect(() => {
        const p = parseDateTime(value)
        setActiveDateStr(p.dateStr)
        setActiveTimeStr(p.time24Str)
        const d = new Date(p.dateStr)
        if (!isNaN(d.getTime())) {
            setCalendarDate(d)
        }
    }, [value])

    const updateCoords = useCallback(() => {
        if (ref.current) {
            const rect = ref.current.getBoundingClientRect()
            // Highly readable scaled popover height: ~320px
            const dropdownHeight = 320
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

    const toggle = useCallback(() => {
        const nextState = !isOpen
        if (nextState) {
            updateCoords()
        }
        setIsOpen(nextState)
    }, [isOpen, updateCoords])

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
    }, [isOpen, updateCoords, activeDateStr, activeTimeStr])

    // Format display preview in input trigger button
    const displayLabel = useMemo(() => {
        if (!value) return placeholder
        const p = parseDateTime(value)
        const d = new Date(p.dateStr)
        if (isNaN(d.getTime())) return placeholder

        const datePart = `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
        
        let timePart = ''
        if (is24h) {
            timePart = p.time24Str
        } else {
            let h = parseInt(p.time24Str.split(':')[0] || '12', 10)
            const m = p.time24Str.split(':')[1] || '00'
            const suffix = h >= 12 ? 'PM' : 'AM'
            h = h % 12
            if (h === 0) h = 12
            timePart = `${String(h).padStart(2, '0')}:${m} ${suffix}`
        }

        return `${datePart} • ${timePart}`
    }, [value, placeholder, is24h])

    // Local active date parts for rendering calendar month
    const activeYear = calendarDate.getFullYear()
    const activeMonth = calendarDate.getMonth()

    const handlePrevMonth = useCallback((e) => {
        e.stopPropagation()
        setCalendarDate(new Date(activeYear, activeMonth - 1, 1))
    }, [activeYear, activeMonth])

    const handleNextMonth = useCallback((e) => {
        e.stopPropagation()
        setCalendarDate(new Date(activeYear, activeMonth + 1, 1))
    }, [activeYear, activeMonth])

    const handleSelectDay = useCallback((day) => {
        const formattedMonth = String(activeMonth + 1).padStart(2, '0')
        const formattedDay = String(day).padStart(2, '0')
        setActiveDateStr(`${activeYear}-${formattedMonth}-${formattedDay}`)
    }, [activeYear, activeMonth])

    // Calendar rendering calculations
    const daysInMonth = useMemo(() => new Date(activeYear, activeMonth + 1, 0).getDate(), [activeYear, activeMonth])
    const firstDayIndex = useMemo(() => {
        const d = new Date(activeYear, activeMonth, 1).getDay()
        return d === 0 ? 6 : d - 1
    }, [activeYear, activeMonth])

    const calendarGrid = useMemo(() => {
        const cells = []
        for (let i = 0; i < firstDayIndex; i++) cells.push(null)
        for (let i = 1; i <= daysInMonth; i++) cells.push(i)
        return cells
    }, [firstDayIndex, daysInMonth])

    const isDaySelected = useCallback((day) => {
        if (!activeDateStr || !day) return false
        const d = new Date(activeDateStr)
        return d.getDate() === day && d.getMonth() === activeMonth && d.getFullYear() === activeYear
    }, [activeDateStr, activeMonth, activeYear])

    const isToday = useCallback((day) => {
        if (!day) return false
        const today = new Date()
        return today.getDate() === day && today.getMonth() === activeMonth && today.getFullYear() === activeYear
    }, [activeMonth, activeYear])

    // Time adjustment functions
    const adjustHour = (amount) => {
        let [h, m] = activeTimeStr.split(':').map(Number)
        h = (h + amount + 24) % 24
        setActiveTimeStr(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    }

    const adjustMinute = (amount) => {
        let [h, m] = activeTimeStr.split(':').map(Number)
        m = (m + amount + 60) % 60
        setActiveTimeStr(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    }

    const togglePeriod = () => {
        let [h, m] = activeTimeStr.split(':').map(Number)
        if (h >= 12) {
            h -= 12
        } else {
            h += 12
        }
        setActiveTimeStr(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    }

    // Parsed visual time values for digital dial face
    const timeDisplay = useMemo(() => {
        const [hStr, mStr] = activeTimeStr.split(':')
        const h24 = parseInt(hStr || '0', 10)
        
        let hh = String(h24).padStart(2, '0')
        let suffix = ''
        
        if (!is24h) {
            suffix = h24 >= 12 ? 'PM' : 'AM'
            let h12 = h24 % 12
            if (h12 === 0) h12 = 12
            hh = String(h12).padStart(2, '0')
        }
        
        return {
            hour: hh,
            minute: mStr || '00',
            period: suffix
        }
    }, [activeTimeStr, is24h])

    const handleDone = () => {
        onChange(`${activeDateStr}T${activeTimeStr}`)
        setIsOpen(false)
    }

    return (
        <div className={`relative ${className}`} ref={ref}>
            {/* Input Trigger Button */}
            <button
                type="button"
                onClick={disabled ? undefined : toggle}
                disabled={disabled}
                className={`w-full flex items-center justify-between gap-2.5 px-3.5 h-[42px] rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-alt)]/50 focus:border-[var(--color-primary)] outline-none transition-all text-xs font-black relative group shadow-sm ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
                <div className="flex items-center gap-2 truncate">
                    <FontAwesomeIcon icon={faCalendarAlt} className="text-xs text-[var(--color-text-muted)] opacity-50 group-focus:text-[var(--color-primary)] group-hover:text-[var(--color-primary)] transition-colors shrink-0" />
                    <span className={value ? 'text-xs text-[var(--color-text)] tracking-wide font-extrabold' : 'text-[var(--color-text-muted)] opacity-60'}>
                        {displayLabel}
                    </span>
                </div>
                <FontAwesomeIcon icon={faChevronDown} className={`text-[9px] opacity-40 transition-transform duration-300 shrink-0 ${isOpen ? 'rotate-180 text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'}`} />
            </button>

            {/* Premium Readable & Scaled Width Portal Dropdown Menu (Desktop: 510px wide & 320px height, Mobile: 280px wide) */}
            {isOpen && createPortal(
                <div
                    className={`fixed z-[99999] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in ${coords.placement === 'top' ? 'slide-in-from-bottom-3' : 'slide-in-from-top-3'} select-none`}
                    onMouseDown={(e) => e.stopPropagation()}
                    style={{
                        width: 'max-content',
                        maxWidth: 'calc(100vw - 32px)',
                        left: Math.max(16, Math.min(coords.right - (window.innerWidth < 640 ? 280 : 510), window.innerWidth - (window.innerWidth < 640 ? 280 : 510) - 16)),
                        top: coords.placement === 'top' ? 'auto' : coords.bottom + 8,
                        bottom: coords.placement === 'top' ? (window.innerHeight - coords.top) + 8 : 'auto',
                    }}
                >
                    {/* Popover Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]/45 bg-[var(--color-surface-alt)]/25">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)] opacity-75">Tanggal & Waktu Kejadian</span>
                            <span className="text-xs sm:text-sm font-black text-[var(--color-primary)] mt-0.5 tracking-wide">
                                {(() => {
                                    const d = new Date(activeDateStr)
                                    const datePart = isNaN(d.getTime()) ? '' : `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
                                    return `${datePart}`
                                })()}
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={handleDone}
                            className="w-7 h-7 rounded-lg bg-[var(--color-border)]/20 hover:bg-red-500/10 text-[var(--color-text-muted)] hover:text-red-500 flex items-center justify-center transition-colors active:scale-90"
                        >
                            <FontAwesomeIcon icon={faXmark} className="text-xs sm:text-sm" />
                        </button>
                    </div>

                    {/* Scaled Desktop Side-by-Side (510px) vs Mobile Stacked (280px) Layout */}
                    <div className="flex flex-col sm:flex-row divide-y sm:divide-y-0 sm:divide-x divide-[var(--color-border)]/50 p-4 gap-4 sm:gap-5 items-stretch">
                        
                        {/* Column 1: Expanded Calendar (270px wide, 34px-36px cell touch targets) */}
                        <div className="w-[250px] sm:w-[270px] shrink-0">
                            {/* Date Picker Header */}
                            <div className="flex items-center justify-between mb-2.5 pb-1.5 border-b border-[var(--color-border)]/20">
                                <button
                                    type="button"
                                    onClick={handlePrevMonth}
                                    className="w-6.5 h-6.5 rounded-lg flex items-center justify-center hover:bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors active:scale-95"
                                >
                                    <FontAwesomeIcon icon={faChevronLeft} className="text-xs" />
                                </button>
                                <div className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-[var(--color-text)] select-none">
                                    {MONTHS[activeMonth]} {activeYear}
                                </div>
                                <button
                                    type="button"
                                    onClick={handleNextMonth}
                                    className="w-6.5 h-6.5 rounded-lg flex items-center justify-center hover:bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors active:scale-95"
                                >
                                    <FontAwesomeIcon icon={faChevronRight} className="text-xs" />
                                </button>
                            </div>

                            {/* Weekday Names */}
                            <div className="grid grid-cols-7 gap-0.5 text-center mb-1.5 select-none">
                                {DAYS_SHORT.map((d, idx) => (
                                    <div key={idx} className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)] opacity-60">
                                        {d}
                                    </div>
                                ))}
                            </div>

                            {/* Calendar Grid with perfect touch target scales */}
                            <div className="grid grid-cols-7 gap-0.5 sm:gap-1 text-center">
                                {calendarGrid.map((day, idx) => {
                                    if (day === null) {
                                        return <div key={`empty-${idx}`} className="w-[30px] h-[30px] sm:w-[34px] sm:h-[34px]" />
                                    }
                                    const selected = isDaySelected(day)
                                    const today = isToday(day)
                                    return (
                                        <button
                                            key={`day-${day}`}
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); handleSelectDay(day); }}
                                            className={`w-[30px] h-[30px] sm:w-[34px] sm:h-[34px] rounded-xl text-xs sm:text-sm font-black flex items-center justify-center transition-all active:scale-90 ${selected
                                                    ? 'bg-[var(--color-primary)] text-white shadow-md shadow-[var(--color-primary)]/20'
                                                    : today
                                                        ? 'border border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--color-primary)]/5 hover:bg-[var(--color-primary)]/10'
                                                        : 'text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] border border-transparent'
                                                }`}
                                        >
                                            {day}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Column 2: Large & High-Contrast Digital Clock (210px wide) */}
                        <div className="w-[250px] sm:w-[200px] shrink-0 pt-4 sm:pt-0 sm:pl-5 flex flex-col justify-between">
                            <div>
                                <div className="flex items-center justify-between mb-2.5">
                                    <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)] opacity-65">Set Waktu</span>
                                    {/* 12H / 24H Toggle Pill */}
                                    <button
                                        type="button"
                                        onClick={() => setIs24h(!is24h)}
                                        className="px-2.5 py-1 rounded-lg bg-[var(--color-primary)]/10 hover:bg-[var(--color-primary)]/20 text-[var(--color-primary)] text-[9px] sm:text-[10px] font-black tracking-widest uppercase transition-colors"
                                    >
                                        {is24h ? 'Format 24H' : 'Format 12H'}
                                    </button>
                                </div>

                                {/* Digital Clock Adjuster box (Ultra high contrast and readable) */}
                                <div className="flex items-center justify-center gap-2 sm:gap-2.5 py-2.5 bg-[var(--color-surface-alt)]/50 border border-[var(--color-border)]/50 rounded-2xl relative shadow-inner">
                                    
                                    {/* Hour adjuster */}
                                    <div className="flex flex-col items-center">
                                        <button
                                            type="button"
                                            onClick={() => adjustHour(1)}
                                            className="w-7 h-5.5 flex items-center justify-center text-xs sm:text-sm text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors active:scale-75"
                                        >
                                            <FontAwesomeIcon icon={faChevronUp} />
                                        </button>
                                        <span className="text-xl sm:text-2xl font-black tracking-wider text-[var(--color-text)] select-none">
                                            {timeDisplay.hour}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => adjustHour(-1)}
                                            className="w-7 h-5.5 flex items-center justify-center text-xs sm:text-sm text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors active:scale-75"
                                        >
                                            <FontAwesomeIcon icon={faChevronDown} />
                                        </button>
                                    </div>

                                    <span className="text-xl sm:text-2xl font-black text-[var(--color-text-muted)] pb-1.5">:</span>

                                    {/* Minute adjuster */}
                                    <div className="flex flex-col items-center">
                                        <button
                                            type="button"
                                            onClick={() => adjustMinute(1)}
                                            className="w-7 h-5.5 flex items-center justify-center text-xs sm:text-sm text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors active:scale-75"
                                        >
                                            <FontAwesomeIcon icon={faChevronUp} />
                                        </button>
                                        <span className="text-xl sm:text-2xl font-black tracking-wider text-[var(--color-text)] select-none">
                                            {timeDisplay.minute}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => adjustMinute(-1)}
                                            className="w-7 h-5.5 flex items-center justify-center text-xs sm:text-sm text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors active:scale-75"
                                        >
                                            <FontAwesomeIcon icon={faChevronDown} />
                                        </button>
                                    </div>

                                    {/* AM/PM toggle (12h mode only, bold and colorful) */}
                                    {!is24h && (
                                        <button
                                            type="button"
                                            onClick={togglePeriod}
                                            className="ml-1 px-2.5 py-1.5 text-xs sm:text-sm font-black tracking-widest text-white bg-[var(--color-primary)] rounded-xl shadow-md hover:brightness-110 active:scale-90 transition-all select-none"
                                        >
                                            {timeDisplay.period}
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Rapid Adjustment Grid with readable high-contrast layout */}
                            <div className="grid grid-cols-2 gap-1.5 mt-3 sm:mt-4">
                                <button
                                    type="button"
                                    onClick={() => adjustHour(1)}
                                    className="py-1.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 text-[9px] sm:text-[10px] font-black text-[var(--color-text-muted)] hover:text-[var(--color-primary)] active:scale-95 transition-all text-center"
                                >
                                    +1 Jam
                                </button>
                                <button
                                    type="button"
                                    onClick={() => adjustHour(-1)}
                                    className="py-1.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 text-[9px] sm:text-[10px] font-black text-[var(--color-text-muted)] hover:text-[var(--color-primary)] active:scale-95 transition-all text-center"
                                >
                                    -1 Jam
                                </button>
                                <button
                                    type="button"
                                    onClick={() => adjustMinute(10)}
                                    className="py-1.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 text-[9px] sm:text-[10px] font-black text-[var(--color-text-muted)] hover:text-[var(--color-primary)] active:scale-95 transition-all text-center"
                                >
                                    +10 Menit
                                </button>
                                <button
                                    type="button"
                                    onClick={() => adjustMinute(-10)}
                                    className="py-1.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 text-[9px] sm:text-[10px] font-black text-[var(--color-text-muted)] hover:text-[var(--color-primary)] active:scale-95 transition-all text-center"
                                >
                                    -10 Menit
                                </button>
                            </div>
                        </div>

                    </div>

                    {/* Popover Footer Action Confirm Button */}
                    <div className="p-3 border-t border-[var(--color-border)]/45 bg-[var(--color-surface-alt)]/15">
                        <button
                            type="button"
                            onClick={handleDone}
                            className="w-full h-10 rounded-2xl bg-[var(--color-primary)] text-white text-xs font-black uppercase tracking-widest hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-[var(--color-primary)]/20"
                        >
                            <FontAwesomeIcon icon={faCheck} className="text-sm text-white" />
                            <span>Selesai Memilih</span>
                        </button>
                    </div>
                </div>,
                document.body
            )}
        </div>
    )
})

RichDateTimePicker.displayName = 'RichDateTimePicker'

export default RichDateTimePicker
