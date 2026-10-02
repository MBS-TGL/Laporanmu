import { memo, useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import {
    Loader2, CheckCircle2, Save, FileText, X,
    ClipboardList, Zap, Lightbulb, Languages, Star, Heart,
    AlertTriangle, Compass, Plus, Minus, Copy, HeartPulse,
    BookOpen, Layers, Scale, Ruler, MessageSquare, Check
} from 'lucide-react'
import Modal from '@shared/components/Modal'
import { getGradePredicate, RAPORT_TYPES } from '@utils/reports/raportTypeRegistry'
import {
    FISIK_FIELDS, HAFALAN_FIELDS,
    CATATAN_TEMPLATES, calcAvg, HAFALAN_PRESETS
} from '@utils/reports/raportConstants'
import { RadarChart, SparklineTrend } from './RaportCharts'

// Simple SVG replacement for WhatsApp icon
const WhatsAppIcon = (props) => (
    <svg viewBox="0 0 24 24" fill="currentColor" className={props.className} style={props.style} width={props.width || "1em"} height={props.height || "1em"}>
        <path d="M12.012 1c-6.067 0-11 4.934-11 11a10.957 10.957 0 001.605 5.679L1 23l5.52-1.748A10.949 10.949 0 0012.012 23c6.067 0 11-4.933 11-11s-4.933-11-11-11zm5.12 15.65c-.218.614-1.077 1.15-1.636 1.218-.557.068-1.229.098-3.003-.618-2.28-.92-3.738-3.23-3.852-3.38-.114-.15-.92-1.227-.92-2.355 0-1.127.59-1.682.802-1.912.213-.23.46-.287.613-.287.154 0 .307.003.44.01.14.007.327-.052.51.393.187.456.64 1.56.697 1.674.057.115.095.249.019.402-.077.153-.153.249-.306.42-.154.173-.326.288-.135.614.19.326.85 1.397 1.82 2.261.97.864 1.787 1.132 2.094 1.266.307.135.48.115.652-.076.173-.192.748-.864.947-1.161.2-.298.4-.249.671-.15.27.097 1.722.812 2.018.96.297.147.494.22.567.346.073.125.073.722-.145 1.336z" />
    </svg>
)

// ─── Sub-components ──────────────────────────────────────────────────────────

export const ScoreCell = memo(({ value, studentId, kriteria, onScoreChange, onKeyDown, si, ki, cellRefs, maxScore, reportType, classLevel, warning }) => {
    const [focused, setFocused] = useState(false)
    const [hasError, setHasError] = useState(false)
    const [localVal, setLocalVal] = useState(value !== '' && value !== null && value !== undefined ? value : '')
    const debounceRef = useRef(null)

    useEffect(() => { if (!focused) setLocalVal(value !== '' && value !== null && value !== undefined ? value : '') }, [value, focused])

    const val = localVal !== '' && localVal !== null && localVal !== undefined ? Number(localVal) : ''
    const g = val !== '' ? getGradePredicate(val, reportType, classLevel, kriteria.key) : null

    const handleChange = (e) => {
        let raw = e.target.value.replace(/,/g, '.').replace(/[^0-9.]/g, '')
        const parts = raw.split('.')
        if (parts.length > 2) raw = parts[0] + '.' + parts.slice(1).join('')
        if (parts.length === 2 && parts[1].length > 1) {
            raw = parts[0] + '.' + parts[1].slice(0, 1)
        }
        if (raw.length > 1 && raw.startsWith('0') && !raw.startsWith('0.')) {
            raw = raw.replace(/^0+/, '') || '0'
        }

        if (raw === '' || raw === '.') {
            setLocalVal(raw)
            setHasError(false)
            if (debounceRef.current) clearTimeout(debounceRef.current)
            debounceRef.current = setTimeout(() => onScoreChange(studentId, kriteria.key, ''), 300)
            return
        }

        const num = Number(raw)
        if (isNaN(num) || num < 0 || num > maxScore) {
            setHasError(true)
            setTimeout(() => setHasError(false), 500)
            return
        }

        setLocalVal(raw)
        setHasError(false)
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => onScoreChange(studentId, kriteria.key, num), 300)
    }

    const handleBlur = () => {
        setFocused(false); setHasError(false)
        if (debounceRef.current) { clearTimeout(debounceRef.current); debounceRef.current = null }
        if (localVal === '' || localVal === '.') {
            onScoreChange(studentId, kriteria.key, '')
            setLocalVal('')
            return
        }
        let num = Number(localVal)
        if (isNaN(num)) num = ''
        else if (num > maxScore) num = maxScore
        else if (num < 0) num = 0

        const finalVal = num === '' ? '' : num
        setLocalVal(finalVal === '' ? '' : String(finalVal))
        if (String(finalVal) !== String(value ?? '')) onScoreChange(studentId, kriteria.key, finalVal)
    }

    return (
        <div className="relative" title={warning ? `${kriteria.id}: ${warning.msg}` : (g ? `${kriteria.id}: ${val} — ${g.id} (${g.label})` : kriteria.id)}>
            <input
                ref={el => { if (el) cellRefs.current[`${si}-${ki}`] = el }}
                type="text"
                inputMode="decimal"
                min={0}
                max={maxScore}
                value={localVal}
                onChange={handleChange}
                onKeyDown={e => onKeyDown(e, si, ki)}
                onFocus={() => setFocused(true)}
                onBlur={handleBlur}
                aria-label={`Nilai ${kriteria.id}`}
                className="w-9 h-8 text-center text-[13px] font-black rounded-lg outline-none transition-all appearance-none"
                style={{
                    background: hasError ? '#ef444415' : g ? g.bg : 'var(--color-surface-alt)',
                    color: hasError ? '#ef4444' : g ? g.uiColor : 'var(--color-text-muted)',
                    border: `2px solid ${hasError ? '#ef4444' : focused ? (g ? g.uiColor : 'var(--color-primary)') : (g ? g.border : 'var(--color-border)')}`
                }}
                placeholder="—"
            />
            {warning && (
                <div className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full flex items-center justify-center" style={{ background: warning.type === 'danger' ? '#ef4444' : '#f59e0b' }}>
                    <AlertTriangle className="w-2 h-2 text-white" />
                </div>
            )}
        </div>
    )
})

export const ExtraInput = memo(({ value, studentId, fieldKey, onCommit, ...inputProps }) => {
    const [localVal, setLocalVal] = useState(value ?? '')
    const [focused, setFocused] = useState(false)
    const debounceRef = useRef(null)

    useEffect(() => { setLocalVal(value ?? '') }, [value])

    const handleChange = (e) => {
        let v = e.target.value
        if (fieldKey === 'berat_badan' || fieldKey === 'tinggi_badan') {
            v = v.replace(/,/g, '.').replace(/[^0-9.]/g, '')
            const parts = v.split('.')
            if (parts.length > 2) v = parts[0] + '.' + parts.slice(1).join('')
            if (parts[1] && parts[1].length > 1) v = parts[0] + '.' + parts.slice(0, 1)
            if (v !== '' && Number(v) > 300) v = '300'
        } else if (fieldKey?.startsWith('hari_')) {
            v = v.replace(/[^0-9]/g, '')
            if (v !== '' && Number(v) > 365) v = '365'
        }
        setLocalVal(v)
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => onCommit(studentId, fieldKey, v), 300)
    }

    const handleBlur = () => {
        setTimeout(() => {
            setFocused(false)
        }, 150)
        if (debounceRef.current) { clearTimeout(debounceRef.current); debounceRef.current = null }
        let finalVal = localVal
        if (fieldKey === 'berat_badan' || fieldKey === 'tinggi_badan') {
            if (finalVal !== '' && Number(finalVal) > 300) finalVal = '300'
        }
        setLocalVal(finalVal)
        if (finalVal !== (value ?? '')) onCommit(studentId, fieldKey, finalVal)
    }

    const handleSelectPreset = (preset) => {
        setLocalVal(preset)
        if (debounceRef.current) clearTimeout(debounceRef.current)
        onCommit(studentId, fieldKey, preset)
        setFocused(false)
    }

    const presets = HAFALAN_PRESETS[fieldKey]

    return (
        <div className="relative flex-1 w-0 h-full flex items-center">
            <input
                {...inputProps}
                value={localVal}
                onChange={handleChange}
                onFocus={() => setFocused(true)}
                onBlur={handleBlur}
            />
            {focused && presets && (
                <div
                    className="absolute left-0 z-[100] w-[260px] bg-white/95 dark:bg-slate-900/98 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-2.5 shadow-2xl flex flex-col gap-1.5 animate-in fade-in zoom-in-95 duration-150"
                    style={{
                        top: 'calc(100% + 6px)'
                    }}
                >
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-1.5 mb-0.5">
                        <span className="text-[8px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                            Pilih Cepat {fieldKey === 'ziyadah' ? 'Ziyadah' : "Muroja'ah"}
                        </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        {presets.map(p => (
                            <button
                                key={p}
                                onMouseDown={(e) => {
                                    e.preventDefault()
                                    handleSelectPreset(p)
                                }}
                                className={`px-2.5 py-1 rounded-xl text-[9px] font-black tracking-tight border transition-all duration-200 hover:scale-105 active:scale-95 ${fieldKey === 'ziyadah'
                                    ? 'bg-emerald-500/10 dark:bg-emerald-500/20 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white dark:hover:text-white hover:border-emerald-500 hover:shadow-lg hover:shadow-emerald-500/20'
                                    : 'bg-violet-500/10 dark:bg-violet-500/20 border-violet-500/20 text-violet-600 dark:text-violet-400 hover:bg-violet-500 hover:text-white dark:hover:text-white hover:border-violet-500 hover:shadow-lg hover:shadow-violet-500/20'
                                    }`}
                            >
                                {p}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
})

export const ExtraTextarea = memo(({ value, studentId, fieldKey, onCommit, ...textareaProps }) => {
    const [localVal, setLocalVal] = useState(value ?? '')
    const debounceRef = useRef(null)
    useEffect(() => { setLocalVal(value ?? '') }, [value])
    const handleChange = (e) => {
        const v = e.target.value; setLocalVal(v)
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => onCommit(studentId, fieldKey, v), 300)
    }
    const handleBlur = () => {
        if (debounceRef.current) { clearTimeout(debounceRef.current); debounceRef.current = null }
        if (localVal !== (value ?? '')) onCommit(studentId, fieldKey, localVal)
    }
    return <textarea {...textareaProps} value={localVal} onChange={handleChange} onBlur={handleBlur} />
})

export const ExtraExpandingTextarea = memo(({ value, studentId, fieldKey, onCommit, color, label, icon: IconComponent, size = 'sm', ...rest }) => {
    const [localVal, setLocalVal] = useState(value ?? '')
    const [focused, setFocused] = useState(false)
    const [dropdownPos, setDropdownPos] = useState(null)
    const debounceRef = useRef(null)
    const taRef = useRef(null)
    const containerRef = useRef(null)

    const collapsedHeight = size === 'xl' ? '40px' : size === 'lg' ? '48px' : size === 'md' ? '40px' : '36px'
    const maxExpandHeight = size === 'lg' ? 200 : 160

    const presets = HAFALAN_PRESETS[fieldKey]

    useEffect(() => { setLocalVal(value ?? '') }, [value])

    const autoResize = () => {
        const el = taRef.current
        if (!el) return
        el.style.height = 'auto'
        el.style.height = Math.min(el.scrollHeight, maxExpandHeight) + 'px'
    }

    useEffect(() => {
        if (focused) autoResize()
    }, [focused, localVal])

    useEffect(() => {
        if (focused && taRef.current) {
            taRef.current.focus()
        }
    }, [focused])

    const updateDropdownPos = useCallback(() => {
        if (!containerRef.current) return
        const rect = containerRef.current.getBoundingClientRect()
        const width = Math.min(320, window.innerWidth - 32)
        let left = rect.left
        if (left + width > window.innerWidth - 16) {
            left = window.innerWidth - width - 16
        }
        if (left < 16) left = 16

        const spaceBelow = window.innerHeight - rect.bottom
        const dropdownHeight = 220
        const isAbove = spaceBelow < dropdownHeight && rect.top > dropdownHeight

        setDropdownPos({
            top: isAbove ? Math.max(8, rect.top - dropdownHeight - 6) : rect.bottom + 6,
            left,
            width
        })
    }, [])

    useEffect(() => {
        if (focused && presets && presets.length > 0) {
            updateDropdownPos()
            window.addEventListener('scroll', updateDropdownPos, true)
            window.addEventListener('resize', updateDropdownPos)
            return () => {
                window.removeEventListener('scroll', updateDropdownPos, true)
                window.removeEventListener('resize', updateDropdownPos)
            }
        }
    }, [focused, presets, updateDropdownPos])

    const handleChange = (e) => {
        const v = e.target.value
        setLocalVal(v)
        autoResize()
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => onCommit(studentId, fieldKey, v), 300)
    }

    const handleBlur = () => {
        setFocused(false)
        if (debounceRef.current) { clearTimeout(debounceRef.current); debounceRef.current = null }
        if (localVal !== (value ?? '')) onCommit(studentId, fieldKey, localVal)
    }

    const handleFocus = () => {
        setFocused(true)
        setTimeout(() => {
            autoResize()
            updateDropdownPos()
        }, 0)
    }

    const handleSelectPreset = (preset) => {
        setLocalVal(preset)
        if (debounceRef.current) clearTimeout(debounceRef.current)
        onCommit(studentId, fieldKey, preset)
        setFocused(false)
    }

    return (
        <div ref={containerRef} className="w-full relative">
            <div
                className="w-full relative flex rounded-xl border transition-all duration-200 overflow-hidden"
                style={{
                    background: 'var(--color-surface)',
                    borderColor: focused ? color : 'var(--color-border)',
                    boxShadow: focused ? `0 0 0 2px ${color}20` : '0 1px 2px rgba(0,0,0,0.02)',
                    minHeight: collapsedHeight,
                    minWidth: 0,
                }}
                title={label}
            >
                {IconComponent && (
                    <div
                        className="shrink-0 w-8.5 flex justify-center transition-all duration-200"
                        style={{
                            background: focused ? `${color}25` : `${color}15`,
                            alignItems: 'flex-start',
                            paddingTop: '10px',
                        }}
                    >
                        <IconComponent className="w-3.5 h-3.5" style={{ color }} />
                    </div>
                )}
                <div className="flex-1 min-w-0 relative flex items-start px-3 py-2.5">
                    {!focused && (
                        <span
                            className={`w-full text-xs leading-normal line-clamp-2 ${localVal ? 'font-bold text-[var(--color-text)]' : 'text-[var(--color-text-muted)] font-medium'}`}
                        >
                            {localVal || label}
                        </span>
                    )}
                    {focused && (
                        <textarea
                            ref={taRef}
                            value={localVal}
                            onChange={handleChange}
                            onFocus={handleFocus}
                            onBlur={handleBlur}
                            placeholder={`Isi ${label.toLowerCase()}...`}
                            rows={1}
                            className="w-full p-0 font-bold text-xs bg-transparent text-[var(--color-text)] outline-none resize-none leading-relaxed"
                            style={{ minHeight: '1.5rem' }}
                            {...rest}
                        />
                    )}
                </div>
                {!focused && (
                    <div
                        className="absolute inset-0 cursor-text"
                        onClick={() => {
                            setFocused(true)
                            updateDropdownPos()
                        }}
                    />
                )}
            </div>

            {/* Portaled Dropdown Preset Chips */}
            {focused && presets && presets.length > 0 && dropdownPos && createPortal(
                <div
                    className="fixed z-[99999] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-2.5 shadow-2xl flex flex-col gap-1.5 animate-in fade-in zoom-in-95 duration-150"
                    style={{
                        top: dropdownPos.top,
                        left: dropdownPos.left,
                        width: dropdownPos.width,
                    }}
                >
                    <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-1.5 mb-0.5">
                        <span className="text-[9px] font-black uppercase tracking-wider text-[var(--color-text-muted)]">
                            Pilihan Cepat {label || fieldKey}
                        </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pr-0.5 [scrollbar-width:thin]">
                        {presets.map(p => (
                            <button
                                key={p}
                                type="button"
                                onMouseDown={(e) => {
                                    e.preventDefault()
                                    handleSelectPreset(p)
                                }}
                                className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-[var(--color-surface-alt)] hover:bg-indigo-500 hover:text-white border border-[var(--color-border)] hover:border-indigo-500 text-[var(--color-text)] transition-all cursor-pointer"
                            >
                                {p}
                            </button>
                        ))}
                    </div>
                </div>,
                document.body
            )}
        </div>
    )
})

// ─── Main StudentRow ─────────────────────────────────────────────────────────

const studentRowAreEqual = (prev, next) => {
    return (
        prev.si === next.si &&
        prev.student === next.student &&
        prev.sc === next.sc &&
        prev.ex === next.ex &&
        prev.isSaved === next.isSaved &&
        prev.isSaving === next.isSaving &&
        prev.isDirty === next.isDirty &&
        prev.isChecked === next.isChecked &&
        prev.bulkMode === next.bulkMode &&
        prev.lang === next.lang &&
        prev.trendData === next.trendData &&
        prev.prevScores === next.prevScores &&
        prev.templateOpen === next.templateOpen &&
        prev.catatanArab === next.catatanArab &&
        prev.sendingWAStatus === next.sendingWAStatus &&
        prev.studentBehaviors === next.studentBehaviors &&
        prev.onScoreChange === next.onScoreChange &&
        prev.onExtraChange === next.onExtraChange &&
        prev.onCatatanChange === next.onCatatanChange &&
        prev.onSave === next.onSave &&
        prev.onWA === next.onWA &&
        prev.onPDF === next.onPDF &&
        prev.onReset === next.onReset &&
        prev.onBulkToggle === next.onBulkToggle &&
        prev.onKeyDown === next.onKeyDown &&
        prev.onTemplateToggle === next.onTemplateToggle &&
        prev.onTemplateApply === next.onTemplateApply &&
        prev.onTranslitToggle === next.onTranslitToggle &&
        prev.criteria === next.criteria &&
        prev.maxScore === next.maxScore &&
        prev.reportType === next.reportType &&
        prev.classLevel === next.classLevel
    )
}

const StudentRow = memo(({
    student, si, sc, ex, isSaved, isSaving, isDirty, isChecked,
    bulkMode, lang, trendData, prevScores, prevExtras, templateOpen, catatanArab, sendingWAStatus,
    studentBehaviors = [],
    onScoreChange, onExtraChange, onCatatanChange, onSave, onWA, onPDF, onReset,
    onBulkToggle, onKeyDown, onTemplateToggle, onTemplateApply, onTranslitToggle,
    generateAutoComment, cellRefs,
    criteria = [], maxScore, reportType, classLevel
}) => {
    const rtObj = RAPORT_TYPES[reportType] || RAPORT_TYPES.bulanan
    const [confirmReset, setConfirmReset] = useState(false)
    const confirmResetTimerRef = useRef(null)
    const handleResetClick = useCallback(() => {
        if (confirmReset) {
            clearTimeout(confirmResetTimerRef.current)
            setConfirmReset(false)
            onReset(student)
        } else {
            setConfirmReset(true)
            confirmResetTimerRef.current = setTimeout(() => setConfirmReset(false), 2500)
        }
    }, [confirmReset, onReset, student])

    // ── Score consistency warnings ──
    // Cross-reference pelanggaran/sholat/absensi with scores
    const scoreWarnings = useMemo(() => {
        const warnings = []
        const negPoints = studentBehaviors.filter(b => b.is_negative).reduce((sum, b) => sum + (b.points || 0), 0)
        const hasPelanggaran = !!(ex.pelanggaran || '').trim()
        const hasSholatIssue = !!(ex.sholat || '').trim()
        const highAbsence = Number(ex.hari_alpa || 0) >= 3
        const hasPrestasi = !!(ex.prestasi || '').trim()

        const akhlak = Number(sc.nilai_akhlak)
        const ibadah = Number(sc.nilai_ibadah)
        const bahasa = Number(sc.nilai_bahasa)
        const bersih = Number(sc.nilai_kebersihan)

        // Pelanggaran → Akhlak & Bahasa bisa saja rendah
        if ((negPoints > 0 || hasPelanggaran) && !hasPrestasi) {
            if (akhlak >= 8) warnings.push({ key: 'nilai_akhlak', msg: negPoints > 0 ? `${negPoints} poin pelanggaran` : 'Ada catatan pelanggaran', type: 'danger' })
            if (bahasa >= 8) warnings.push({ key: 'nilai_bahasa', msg: 'Pelanggaran tercatat', type: 'warning' })
        }

        // Sholat → Ibadah
        if (hasSholatIssue) {
            if (ibadah >= 8) warnings.push({ key: 'nilai_ibadah', msg: 'Ketertiban sholat bermasalah', type: 'danger' })
        }

        // Absensi tinggi → semua nilai
        if (highAbsence) {
            const highScores = criteria.filter(k => Number(sc[k.key]) >= 8)
            if (highScores.length > 0) {
                warnings.push({ key: '__all__', msg: `${ex.hari_alpa} hari alpa — cek ulang semua nilai`, type: 'warning' })
            }
        }

        // Kebersihan + pelanggaran kebersihan
        if (hasPelanggaran && bersih >= 8 && !hasPrestasi) {
            warnings.push({ key: 'nilai_kebersihan', msg: 'Pelanggaran tercatat', type: 'warning' })
        }

        return warnings
    }, [studentBehaviors, ex.pelanggaran, ex.sholat, ex.prestasi, ex.hari_alpa, sc, criteria])

    const [showModal, setShowModal] = useState(false)
    const [activeModalTab, setActiveModalTab] = useState('fisik')
    const templateBtnRef = useRef(null)
    const [dropdownCoords, setDropdownCoords] = useState(null)

    useEffect(() => {
        if (templateOpen && templateBtnRef.current) {
            const updateCoords = () => {
                const rect = templateBtnRef.current.getBoundingClientRect()
                const spaceBelow = window.innerHeight - rect.bottom
                const placement = spaceBelow >= 240 ? 'bottom' : 'top'
                setDropdownCoords({
                    top: rect.bottom + 6,
                    bottom: window.innerHeight - rect.top + 6,
                    right: window.innerWidth - rect.right,
                    placement
                })
            }
            updateCoords()
            window.addEventListener('resize', updateCoords)
            window.addEventListener('scroll', updateCoords, true)
            return () => {
                window.removeEventListener('resize', updateCoords)
                window.removeEventListener('scroll', updateCoords, true)
            }
        } else {
            setDropdownCoords(null)
        }
    }, [templateOpen])

    const activeFisikFields = FISIK_FIELDS.filter(f => {
        if (f.key === 'berat_badan' || f.key === 'tinggi_badan') {
            return rtObj.hasFisik
        }
        return rtObj.hasAttendance
    })
    const avg = calcAvg(sc, criteria)
    const g = avg ? getGradePredicate(Number(avg), reportType, classLevel) : null

    const hasFisikData = ex.berat_badan || ex.tinggi_badan || Number(ex.hari_sakit) > 0 || Number(ex.hari_izin) > 0 || Number(ex.hari_alpa) > 0 || Number(ex.hari_pulang) > 0
    const hasHafalanCatatanData = ex.ziyadah || ex.murojaah || ex.total_hafalan || ex.catatan || ex.pelanggaran || ex.prestasi || ex.sholat

    return (
        <>
            <tr className={`border-t border-[var(--color-border)] transition-colors group table-row-lazy ${isChecked ? 'bg-indigo-500/5' : si % 2 === 0 ? 'bg-[var(--color-surface)]' : 'bg-[var(--color-surface-alt)]'}`}>
                {bulkMode && (
                    <td className="text-center px-1" style={{ verticalAlign: 'middle', borderBottom: '1px solid var(--color-border)' }}>
                        <input type="checkbox" checked={isChecked} onChange={e => onBulkToggle(student.id, e.target.checked)} aria-label={`Pilih ${student.name}`} className="w-3.5 h-3.5 accent-violet-500 cursor-pointer" />
                    </td>
                )}
                <td className={`px-0 py-3 sticky left-0 z-10 transition-colors ${isChecked ? 'bg-indigo-500/5' : si % 2 === 0 ? 'bg-[var(--color-surface)]' : 'bg-[var(--color-surface-alt)]'}`} style={{ borderRight: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)' }}>
                    <div className="flex flex-col items-center justify-center text-center gap-1.5">
                        <RadarChart scores={sc} size={32} criteria={criteria} maxScore={maxScore} />
                        <div className="min-w-0">
                            <div className="text-[12px] font-black text-[var(--color-text)] leading-tight whitespace-normal break-words uppercase tracking-tight">{student.name}</div>
                            <div className="flex items-center justify-center gap-1 mt-0.5 flex-wrap">
                                {avg ? <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md" style={{ background: g?.bg || 'var(--color-surface-alt)', color: g?.uiColor || 'var(--color-text)' }}>{avg}</span> : <span className="text-[8px] text-[var(--color-text-muted)] font-bold">isi nilai</span>}
                                {isSaving && <Loader2 className="w-2 h-2 text-amber-500 animate-spin" />}
                                {!isSaving && isSaved && <CheckCircle2 className="w-2 h-2 text-emerald-500" />}
                                {!isSaving && !isSaved && isDirty && <span className="text-[8px] font-black text-amber-500 flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse inline-block" /></span>}
                                {trendData?.length >= 2 && <SparklineTrend trendData={trendData} criteria={criteria} />}
                            </div>
                        </div>
                    </div>
                </td>
                {criteria.map((k, ki) => {
                    const prevVal = prevScores?.[k.key], curVal = sc[k.key], hasDelta = (prevVal != null && curVal !== '' && curVal != null), delta = hasDelta ? Number(curVal) - Number(prevVal) : 0
                    const scoreWarn = scoreWarnings.find(w => w.key === k.key)
                    return (
                        <td key={k.key} className="py-2 text-center px-0.5" style={{ verticalAlign: 'middle', borderBottom: '1px solid var(--color-border)' }}>
                            <div className="flex flex-col items-center justify-center w-full">
                                <ScoreCell value={sc[k.key]} studentId={student.id} kriteria={k} onScoreChange={onScoreChange} onKeyDown={onKeyDown} si={si} ki={ki} cellRefs={cellRefs} maxScore={maxScore} reportType={reportType} classLevel={classLevel} warning={scoreWarn} />
                                <div style={{ height: 10, fontSize: 8, fontWeight: 900, lineHeight: 1, marginTop: 2 }} className="flex items-center justify-center">
                                    {hasDelta && delta > 0 && <span style={{ color: '#10b981' }} title={`Bulan lalu: ${prevVal}`}>▲{delta}</span>}
                                    {hasDelta && delta < 0 && <span style={{ color: '#ef4444' }} title={`Bulan lalu: ${prevVal}`}>▼{Math.abs(delta)}</span>}
                                    {hasDelta && delta === 0 && <span style={{ color: 'var(--color-text-muted)', opacity: 0.4 }}>—</span>}
                                </div>
                                {scoreWarn && (
                                    <div
                                        className="mt-1 mx-auto w-fit flex items-center justify-center gap-0.5 rounded border px-1 py-[1px]"
                                        style={{
                                            background: scoreWarn.type === 'danger' ? '#fef2f2' : '#fffbeb',
                                            borderColor: scoreWarn.type === 'danger' ? '#fecaca' : '#fde68a',
                                        }}
                                        title={scoreWarn.msg}
                                    >
                                        <AlertTriangle className="w-2.5 h-2.5 shrink-0" style={{ color: scoreWarn.type === 'danger' ? '#ef4444' : '#d97706' }} />
                                    </div>
                                )}
                            </div>
                        </td>
                    )
                })}
                {(rtObj.hasFisik || rtObj.hasAttendance) && (
                    <td className="px-2 py-2" style={{ verticalAlign: 'middle', borderBottom: '1px solid var(--color-border)' }}>
                        <button
                            type="button"
                            onClick={() => setShowModal(true)}
                            className={`w-full p-2.5 rounded-xl border text-left transition-all group flex flex-col justify-between gap-1.5 cursor-pointer min-h-[72px] ${hasFisikData
                                ? 'border-teal-500/30 bg-teal-500/5 hover:bg-teal-500/10 shadow-sm'
                                : 'border-dashed border-[var(--color-border)] hover:border-teal-400 bg-[var(--color-surface)] hover:bg-teal-500/5'
                                }`}
                        >
                            <div className="flex items-center justify-between text-[10px] font-black text-teal-600 dark:text-teal-400 w-full">
                                <span className="flex items-center gap-1.5"><HeartPulse className="w-3.5 h-3.5 shrink-0" /> Fisik &amp; Absensi</span>
                                <span className="text-[9px] font-extrabold text-[var(--color-text-muted)] group-hover:text-teal-600 transition-colors">Edit ›</span>
                            </div>

                            {hasFisikData ? (
                                <div className="space-y-1 w-full">
                                    {(ex.berat_badan || ex.tinggi_badan) ? (
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            {ex.berat_badan ? (
                                                <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20">
                                                    <Scale className="w-2.5 h-2.5 shrink-0 text-teal-600 dark:text-teal-400" /> {ex.berat_badan} kg
                                                </span>
                                            ) : null}
                                            {ex.tinggi_badan ? (
                                                <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20">
                                                    <Ruler className="w-2.5 h-2.5 shrink-0 text-teal-600 dark:text-teal-400" /> {ex.tinggi_badan} cm
                                                </span>
                                            ) : null}
                                        </div>
                                    ) : null}

                                    <div className="flex items-center gap-1 flex-wrap text-[9px] font-bold">
                                        {Number(ex.hari_alpa) > 0 ? (
                                            <span className="px-1.5 py-0.5 rounded-md bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 font-extrabold">
                                                A: {ex.hari_alpa} hr
                                            </span>
                                        ) : null}
                                        {Number(ex.hari_sakit) > 0 ? (
                                            <span className="px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/25">
                                                S: {ex.hari_sakit} hr
                                            </span>
                                        ) : null}
                                        {Number(ex.hari_izin) > 0 ? (
                                            <span className="px-1.5 py-0.5 rounded-md bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/25">
                                                I: {ex.hari_izin} hr
                                            </span>
                                        ) : null}
                                        {Number(ex.hari_pulang) > 0 ? (
                                            <span className="px-1.5 py-0.5 rounded-md bg-purple-500/15 text-purple-700 dark:text-purple-400 border border-purple-500/25">
                                                P: {ex.hari_pulang} hr
                                            </span>
                                        ) : null}
                                        {(!Number(ex.hari_alpa) && !Number(ex.hari_sakit) && !Number(ex.hari_izin) && !Number(ex.hari_pulang)) ? (
                                            <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20">
                                                <Check className="w-2.5 h-2.5 shrink-0 text-teal-600 dark:text-teal-400" /> Hadir Penuh
                                            </span>
                                        ) : null}
                                    </div>
                                </div>
                            ) : (
                                <span className="text-[9px] font-medium text-[var(--color-text-muted)] opacity-60">
                                    + Klik untuk isi fisik &amp; absensi
                                </span>
                            )}
                        </button>
                    </td>
                )}
                {(rtObj.hasHafalan || rtObj.hasCatatan) && (
                    <td className="px-2 py-2" style={{ verticalAlign: 'middle', borderBottom: '1px solid var(--color-border)' }}>
                        <button
                            type="button"
                            onClick={() => setShowModal(true)}
                            className={`w-full p-2.5 rounded-xl border text-left transition-all group flex flex-col justify-between gap-1.5 cursor-pointer min-h-[72px] ${hasHafalanCatatanData
                                ? 'border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 shadow-sm'
                                : 'border-dashed border-[var(--color-border)] hover:border-amber-400 bg-[var(--color-surface)] hover:bg-amber-500/5'
                                }`}
                        >
                            <div className="flex items-center justify-between text-[10px] font-black text-amber-600 dark:text-amber-400 w-full">
                                <span className="flex items-center gap-1.5"><ClipboardList className="w-3.5 h-3.5 shrink-0" /> Hafalan &amp; Catatan</span>
                                <span className="text-[9px] font-extrabold text-[var(--color-text-muted)] group-hover:text-amber-600 transition-colors">Edit ›</span>
                            </div>

                            {hasHafalanCatatanData ? (
                                <div className="space-y-1 w-full min-w-0">
                                    {(ex.ziyadah || ex.murojaah || ex.total_hafalan) ? (
                                        <div className="flex items-center gap-1 flex-wrap">
                                            {ex.ziyadah ? (
                                                <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 truncate max-w-[140px]" title={`Ziyadah: ${ex.ziyadah}`}>
                                                    <BookOpen className="w-2.5 h-2.5 shrink-0 text-emerald-500" />
                                                    <span className="truncate">Ziyadah: {ex.ziyadah}</span>
                                                </span>
                                            ) : null}
                                            {ex.murojaah ? (
                                                <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20 truncate max-w-[140px]" title={`Muroja'ah: ${ex.murojaah}`}>
                                                    <Layers className="w-2.5 h-2.5 shrink-0 text-indigo-500" />
                                                    <span className="truncate">Muroja'ah: {ex.murojaah}</span>
                                                </span>
                                            ) : null}
                                            {ex.total_hafalan ? (
                                                <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 truncate max-w-[140px]" title={`Total Hafalan: ${ex.total_hafalan}`}>
                                                    <Star className="w-2.5 h-2.5 shrink-0 text-amber-500" />
                                                    <span className="truncate">Hafalan: {ex.total_hafalan}</span>
                                                </span>
                                            ) : null}
                                        </div>
                                    ) : null}

                                    {(ex.catatan || ex.pelanggaran || ex.prestasi || ex.sholat) ? (
                                        <div className="flex items-center gap-1 flex-wrap min-w-0">
                                            {ex.catatan ? (
                                                <span className="text-[9px] font-medium text-[var(--color-text)] opacity-85 truncate flex items-center gap-1 w-full leading-tight" title={ex.catatan}>
                                                    <MessageSquare className="w-2.5 h-2.5 shrink-0 text-amber-500" />
                                                    <span className="truncate">"{ex.catatan}"</span>
                                                </span>
                                            ) : null}
                                            {ex.pelanggaran ? (
                                                <span className="inline-flex items-center gap-1 text-[8px] font-extrabold px-1.5 py-0.5 rounded-md bg-rose-500/15 text-rose-600 border border-rose-500/30 truncate" title={`Pelanggaran: ${ex.pelanggaran}`}>
                                                    <AlertTriangle className="w-2.5 h-2.5 shrink-0 text-rose-500" />
                                                    <span className="truncate">{ex.pelanggaran}</span>
                                                </span>
                                            ) : null}
                                            {ex.prestasi ? (
                                                <span className="inline-flex items-center gap-1 text-[8px] font-extrabold px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 truncate" title={`Prestasi: ${ex.prestasi}`}>
                                                    <Star className="w-2.5 h-2.5 shrink-0 text-emerald-500" />
                                                    <span className="truncate">{ex.prestasi}</span>
                                                </span>
                                            ) : null}
                                            {ex.sholat ? (
                                                <span className="inline-flex items-center gap-1 text-[8px] font-extrabold px-1.5 py-0.5 rounded-md bg-indigo-500/15 text-indigo-600 border border-indigo-500/30 truncate" title={`Catatan Sholat: ${ex.sholat}`}>
                                                    <Compass className="w-2.5 h-2.5 shrink-0 text-indigo-500" />
                                                    <span className="truncate">{ex.sholat}</span>
                                                </span>
                                            ) : null}
                                        </div>
                                    ) : null}
                                </div>
                            ) : (
                                <span className="text-[9px] font-medium text-[var(--color-text-muted)] opacity-60">
                                    + Klik untuk isi hafalan &amp; catatan
                                </span>
                            )}
                        </button>
                    </td>
                )}

                <td className={`px-2 py-3 sticky right-0 z-10 transition-colors ${si % 2 === 0 ? 'bg-[var(--color-surface)]' : 'bg-[var(--color-surface-alt)]'}`} style={{ verticalAlign: 'middle', borderLeft: '1px solid var(--color-border)', borderRight: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)' }}>
                    <div className="flex flex-col gap-1.5">
                        <button onClick={() => onSave(student.id)} disabled={isSaving} className="w-full h-8 rounded-lg flex items-center justify-center gap-1.5 text-[11px] font-black transition-all disabled:opacity-50" style={{ background: isSaved ? '#10b98115' : isDirty ? '#6366f115' : 'var(--color-surface-alt)', color: isSaved ? '#10b981' : isDirty ? '#6366f1' : 'var(--color-text-muted)', border: '1px solid', borderColor: isSaved ? '#10b98130' : isDirty ? '#6366f130' : 'var(--color-border)' }}>
                            {isSaving ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                            ) : isSaved ? (
                                <CheckCircle2 className="w-3 h-3" />
                            ) : (
                                <Save className="w-3 h-3" />
                            )}
                            {isSaving ? 'Menyimpan...' : isSaved ? 'Tersimpan' : 'Simpan'}
                        </button>
                        <div className="grid grid-cols-2 gap-1">
                            <button onClick={() => onPDF(student.id)} aria-label={`Preview PDF ${student.name}`} className="h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 flex items-center justify-center gap-1 text-[11px] font-black hover:bg-indigo-500/20 transition-all">
                                <FileText className="w-3 h-3" /> PDF
                            </button>
                            <button onClick={() => onWA(student)} disabled={!student.phone || (!!sendingWAStatus && sendingWAStatus !== 'done')} aria-label={`Kirim WA ke wali ${student.name}`}
                                className={`h-8 rounded-lg border text-[11px] font-black flex items-center justify-center gap-1 transition-all ${!student.phone ? 'opacity-30 cursor-not-allowed bg-[var(--color-surface-alt)] border-[var(--color-border)] text-[var(--color-text-muted)]' : sendingWAStatus === 'done' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 hover:bg-emerald-500/20' : sendingWAStatus ? 'bg-amber-500/10 border-amber-500/20 text-amber-500 cursor-wait' : 'bg-green-500/10 border-green-500/20 text-green-600 hover:bg-green-500/20'}`}>
                                {(() => {
                                    if (sendingWAStatus === 'generating' || sendingWAStatus === 'uploading') {
                                        return <Loader2 className="w-3 h-3 animate-spin" />
                                    }
                                    if (sendingWAStatus === 'done') {
                                        return <CheckCircle2 className="w-3 h-3" />
                                    }
                                    return <WhatsAppIcon className="w-3 h-3" />
                                })()}
                                WA
                            </button>
                        </div>
                        <button onClick={() => onReset(student)} aria-label={`Reset nilai ${student.name}`}
                            className="w-full h-7 rounded-lg flex items-center justify-center gap-1 text-[10px] font-black transition-all hover:bg-red-500/10 hover:text-red-500 text-[var(--color-text-muted)] border border-dashed border-[var(--color-border)] hover:border-red-400/40 cursor-pointer">
                            <X className="w-2.5 h-2.5" />
                            Reset
                        </button>
                    </div>
                </td>
            </tr>

            {/* DETAIL & CATATAN MODAL */}
            {showModal && (
                <Modal
                    isOpen={showModal}
                    onClose={() => setShowModal(false)}
                    title="Input Detail Santri"
                    description={`Lengkapi kondisi fisik, kehadiran, hafalan Qur'an & catatan evaluasi santri`}
                    icon={ClipboardList}
                    iconBg="bg-indigo-500/10"
                    iconColor="text-indigo-600"
                    size="lg"
                    footer={
                        <div className="flex items-center justify-between w-full">
                            <button
                                type="button"
                                onClick={() => setShowModal(false)}
                                className="h-10 px-5 rounded-xl border border-[var(--color-border)] text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] transition-all cursor-pointer"
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                onClick={() => { onSave(student.id); setShowModal(false) }}
                                className="h-10 px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-black text-xs uppercase tracking-wider transition-all shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer"
                            >
                                <Save className="w-4 h-4" />
                                <span>Simpan &amp; Selesai</span>
                            </button>
                        </div>
                    }
                >
                    <div className="space-y-4 py-1 text-left">
                        {/* Header Student Info Bar */}
                        <div className="p-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-md shadow-indigo-500/20">
                                    {student.name.charAt(0)}
                                </div>
                                <div className="min-w-0">
                                    <h4 className="text-xs font-black text-[var(--color-text)] truncate">{student.name}</h4>
                                </div>
                            </div>
                            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-black">
                                <span>Rata-rata:</span>
                                <span className="text-xs font-black">{avg || '—'}</span>
                            </div>
                        </div>

                        {/* Interactive Tab Navigation */}
                        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-[var(--color-surface-alt)] border border-[var(--color-border)]">
                            {(rtObj.hasFisik || rtObj.hasAttendance) && (
                                <button
                                    type="button"
                                    onClick={() => setActiveModalTab('fisik')}
                                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${activeModalTab === 'fisik'
                                        ? 'bg-[var(--color-surface)] text-teal-600 dark:text-teal-400 shadow-sm border border-[var(--color-border)]'
                                        : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                                        }`}
                                >
                                    <HeartPulse className="w-3.5 h-3.5" />
                                    <span>Fisik &amp; Absensi</span>
                                    {hasFisikData && <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />}
                                </button>
                            )}
                            {rtObj.hasHafalan && (
                                <button
                                    type="button"
                                    onClick={() => setActiveModalTab('hafalan')}
                                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${activeModalTab === 'hafalan'
                                        ? 'bg-[var(--color-surface)] text-emerald-600 dark:text-emerald-400 shadow-sm border border-[var(--color-border)]'
                                        : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                                        }`}
                                >
                                    <BookOpen className="w-3.5 h-3.5" />
                                    <span>Hafalan Qur'an</span>
                                    {(ex.ziyadah || ex.murojaah || ex.total_hafalan) && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                                </button>
                            )}
                            {rtObj.hasCatatan && (
                                <button
                                    type="button"
                                    onClick={() => setActiveModalTab('catatan')}
                                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${activeModalTab === 'catatan'
                                        ? 'bg-[var(--color-surface)] text-amber-600 dark:text-amber-400 shadow-sm border border-[var(--color-border)]'
                                        : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                                        }`}
                                >
                                    <ClipboardList className="w-3.5 h-3.5" />
                                    <span>Catatan</span>
                                    {(ex.catatan || ex.pelanggaran || ex.prestasi || ex.sholat) && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => setActiveModalTab('all')}
                                className={`py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${activeModalTab === 'all'
                                    ? 'bg-[var(--color-surface)] text-indigo-600 dark:text-indigo-400 shadow-sm border border-[var(--color-border)]'
                                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                                    }`}
                                title="Tampilkan semua seksi sekaligus"
                            >
                                <Layers className="w-3.5 h-3.5" />
                                <span>Semua</span>
                            </button>
                        </div>

                        {/* SECTION 1: FISIK & KEHADIRAN */}
                        {(rtObj.hasFisik || rtObj.hasAttendance) && (activeModalTab === 'fisik' || activeModalTab === 'all') && (
                            <div className="p-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] space-y-4 shadow-sm animate-in fade-in zoom-in-95 duration-200">
                                <h5 className="text-[11px] font-black uppercase tracking-wider text-[var(--color-text)]">
                                    Kondisi Fisik &amp; Kehadiran
                                </h5>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {activeFisikFields.map(f => {
                                        const IconComp = f.icon
                                        const curNum = Number(ex[f.key] ?? 0)
                                        const maxVal = f.key === 'berat_badan' || f.key === 'tinggi_badan' ? 300 : 300
                                        const handleStep = (delta) => {
                                            const next = Math.min(maxVal, Math.max(0, curNum + delta))
                                            onExtraChange(student.id, f.key, String(next))
                                        }
                                        return (
                                            <div key={f.key} className="space-y-1.5">
                                                <label className="text-[9px] font-black uppercase tracking-wider text-[var(--color-text)] flex items-center gap-1.5">
                                                    <IconComp className="w-3 h-3 shrink-0" style={{ color: f.color }} />
                                                    {f.fullLabel} <span className="opacity-40">({f.unit})</span>
                                                </label>
                                                <div className="flex items-stretch h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden transition-all focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-500/20 shadow-sm">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleStep(-1)}
                                                        disabled={curNum <= 0}
                                                        className="w-10 flex items-center justify-center border-r border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] active:scale-95 disabled:opacity-30 transition-all cursor-pointer shrink-0 text-lg font-light"
                                                    >−</button>
                                                    <input
                                                        type="number"
                                                        inputMode="decimal"
                                                        min={0}
                                                        max={maxVal}
                                                        placeholder="0"
                                                        value={ex[f.key] ?? ''}
                                                        onChange={e => onExtraChange(student.id, f.key, e.target.value === '' ? '' : String(Math.min(maxVal, Math.max(0, Number(e.target.value)))))}
                                                        className="flex-1 w-0 h-full text-sm font-bold text-center bg-transparent text-[var(--color-text)] outline-none appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => handleStep(1)}
                                                        disabled={curNum >= maxVal}
                                                        className="w-10 flex items-center justify-center border-l border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] active:scale-95 disabled:opacity-30 transition-all cursor-pointer shrink-0 text-lg font-light"
                                                    >+</button>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                        {/* SECTION 2: HAFALAN QUR'AN */}
                        {rtObj.hasHafalan && (activeModalTab === 'hafalan' || activeModalTab === 'all') && (
                            <div className="p-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] space-y-4 shadow-sm animate-in fade-in zoom-in-95 duration-200">
                                <div className="flex items-center justify-between">
                                    <h5 className="text-[11px] font-black uppercase tracking-wider text-[var(--color-text-muted)]">
                                        Capaian Hafalan Al-Qur'an
                                    </h5>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                                    {HAFALAN_FIELDS.map(f => {
                                        const IconComp = f.icon
                                        const prevVal = prevExtras?.[f.key]
                                        return (
                                            <div key={f.key} className="flex flex-col gap-1">
                                                {/* ExtraExpandingTextarea — tampilkan icon+label sendiri saat collapsed */}
                                                <ExtraExpandingTextarea
                                                    value={ex[f.key] ?? ''}
                                                    studentId={student.id}
                                                    fieldKey={f.key}
                                                    onCommit={onExtraChange}
                                                    color={f.color}
                                                    label={f.ph}
                                                    icon={IconComp}
                                                    size="xl"
                                                    placeholder={`Isi ${f.ph.toLowerCase()}...`}
                                                />
                                                {/* Salin pill — hanya tampil jika ada data sebelumnya */}
                                                {prevVal && (
                                                    <button
                                                        type="button"
                                                        onClick={() => onExtraChange(student.id, f.key, prevVal)}
                                                        className="self-start flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full border transition-all cursor-pointer hover:opacity-80 mt-0.5"
                                                        style={{ color: f.color, borderColor: `${f.color}30`, background: `${f.color}10` }}
                                                    >
                                                        <Copy className="w-2.5 h-2.5" />
                                                        Salin: {prevVal}
                                                    </button>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                        {/* SECTION 3: CATATAN & EVALUASI */}
                        {rtObj.hasCatatan && (activeModalTab === 'catatan' || activeModalTab === 'all') && (
                            <div className="p-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] space-y-4 shadow-sm animate-in fade-in zoom-in-95 duration-200">
                                <div className="flex items-center justify-between">
                                    <h5 className="text-[11px] font-black uppercase tracking-wider text-[var(--color-text-muted)]">
                                        Catatan Musyrif &amp; Evaluasi Santri
                                    </h5>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => { const c = generateAutoComment(sc, student.id, trendData, criteria, reportType, classLevel); if (!c) return; onCatatanChange(student.id, 'catatan', c) }}
                                            disabled={!avg}
                                            className="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold text-[10px] flex items-center gap-1 transition-all cursor-pointer disabled:opacity-30"
                                        >
                                            <Zap className="w-3.5 h-3.5" />
                                            Auto-Generate
                                        </button>
                                        <button
                                            ref={templateBtnRef}
                                            type="button"
                                            onClick={() => onTemplateToggle(student.id)}
                                            className={`px-3 py-1.5 rounded-lg font-bold text-[10px] flex items-center gap-1 transition-all cursor-pointer ${templateOpen
                                                ? 'bg-indigo-600 text-white shadow-md'
                                                : 'bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400'
                                                }`}
                                        >
                                            <Lightbulb className="w-3.5 h-3.5" />
                                            Template Catatan
                                        </button>

                                        {templateOpen && dropdownCoords && createPortal(
                                            <div className="fixed inset-0 z-[99998]" onClick={(e) => e.stopPropagation()}>
                                                {/* Backdrop for click outside */}
                                                <div
                                                    className="absolute inset-0 bg-black/5"
                                                    onClick={() => onTemplateToggle(student.id)}
                                                />
                                                {/* Floating Dropdown inside Document Body */}
                                                <div
                                                    className={`fixed z-[99999] w-72 p-2.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl space-y-1 animate-in fade-in ${dropdownCoords.placement === 'top' ? 'slide-in-from-bottom-2' : 'slide-in-from-top-2'
                                                        } duration-150`}
                                                    style={{
                                                        right: Math.max(12, dropdownCoords.right),
                                                        ...(dropdownCoords.placement === 'top'
                                                            ? { bottom: dropdownCoords.bottom }
                                                            : { top: dropdownCoords.top }
                                                        ),
                                                    }}
                                                >
                                                    <div className="flex items-center justify-between px-2 py-1 border-b border-[var(--color-border)] mb-1">
                                                        <p className="text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)]">Pilih Template Catatan:</p>
                                                        <button
                                                            type="button"
                                                            onClick={() => onTemplateToggle(student.id)}
                                                            className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] p-0.5 rounded text-xs font-bold transition-all cursor-pointer"
                                                            aria-label="Tutup"
                                                        >
                                                            <X className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                    <div className="max-h-60 overflow-y-auto space-y-1 custom-scrollbar">
                                                        {CATATAN_TEMPLATES.map((tmpl, ti) => (
                                                            <button
                                                                key={ti}
                                                                type="button"
                                                                onClick={() => {
                                                                    onTemplateApply(student.id, tmpl)
                                                                    onTemplateToggle(student.id)
                                                                }}
                                                                className="w-full text-left p-2 rounded-xl text-xs font-medium hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-[var(--color-text)] transition-all cursor-pointer leading-snug"
                                                            >
                                                                {tmpl}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>,
                                            document.body
                                        )}
                                    </div>
                                </div>

                                <ExtraExpandingTextarea
                                    value={ex.catatan ?? ''}
                                    studentId={student.id}
                                    fieldKey="catatan"
                                    onCommit={onCatatanChange}
                                    color="#f59e0b"
                                    label="Catatan Utama Musyrif"
                                    icon={ClipboardList}
                                    size="lg"
                                    placeholder="Tulis catatan evaluasi santri untuk periode ini..."
                                />

                                <div className="border-t border-[var(--color-border)] pt-3">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-2.5">Catatan Khusus</p>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        {[
                                            { key: 'pelanggaran', label: 'Pelanggaran', color: '#ef4444', icon: AlertTriangle, ph: 'Pelanggaran' },
                                            { key: 'prestasi', label: 'Prestasi', color: '#10b981', icon: Star, ph: 'Prestasi' },
                                            { key: 'sholat', label: 'Sholat', color: '#6366f1', icon: Compass, ph: 'Sholat' }
                                        ].map(f => (
                                            <ExtraExpandingTextarea
                                                key={f.key}
                                                value={ex[f.key] ?? ''}
                                                studentId={student.id}
                                                fieldKey={f.key}
                                                onCommit={onExtraChange}
                                                color={f.color}
                                                label={f.label}
                                                icon={f.icon}
                                                size="xl"
                                                placeholder={f.ph}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </Modal>
            )}
        </>
    )
}, studentRowAreEqual)

export default StudentRow
