import {
    useState, useEffect, useCallback, useRef,
    useMemo, memo, useDeferredValue, useTransition,
} from 'react'
import { createPortal } from 'react-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faChevronLeft, faChevronRight, faSave, faSpinner, faExclamationTriangle,
    faUserCheck, faHeartPulse, faFileCircleCheck, faCircleXmark,
    faDoorOpen, faRotateLeft, faFileExport, faCircleCheck, faCloudArrowUp,
    faTriangleExclamation, faMagnifyingGlass, faChalkboardTeacher,
    faCalendarDays, faChartSimple, faBolt, faChevronDown,
    faXmark, faLightbulb, faCheck, faTableList, faArrowPointer,
    faFloppyDisk, faArrowsRotate, faListCheck,
    faRotateRight, faBullseye, faUsers, faPlus,
    faCopy, faEye, faEyeSlash, faFilter, faFileImport,
    faPrint, faBell, faStickyNote, faArrowDown, faCrosshairs,
    faArrowTrendUp, faArrowTrendDown, faGear, faUpload,
    faBorderAll, faList, faTableCells,
    faKeyboard, faMagnifyingGlassPlus, faWandMagicSparkles,
    faSearch, faPerson, faArrowRight, faLinkSlash,
    faClockRotateLeft, faLink, faClock, faMoneyBillWave,
    faClipboardCheck, faUserClock, faUserTie, faBookOpen,
    faLayerGroup,
} from '@fortawesome/free-solid-svg-icons'
import DashboardLayout from '@core/layouts/DashboardLayout'
import Breadcrumb from '@shared/components/Breadcrumb'
import { EmptyState } from '@shared/components/DataDisplay'
import Pagination from '@shared/components/Pagination'
import { useToast } from '@context/Toast'
import { useLanguage } from '@context/Language'
import { useAuth } from '@context/Auth'
import { supabase } from '@lib/supabase'
import { logAudit } from '@utils/auditLogger'


// ─── Constants ────────────────────────────────────────────────────────────────

const BULAN_NAMA = [
    '', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

const STATUS_CYCLE = ['', 'H', 'S', 'I', 'A', 'P']

const STATUS_META = {
    H: { label: 'Hadir', color: 'text-emerald-600', cellBg: 'bg-emerald-500/15', cellBorder: 'border-emerald-500/30', textColor: '#059669', icon: faUserCheck },
    S: { label: 'Sakit', color: 'text-amber-600', cellBg: 'bg-amber-500/15', cellBorder: 'border-amber-500/30', textColor: '#d97706', icon: faHeartPulse },
    I: { label: 'Izin', color: 'text-blue-600', cellBg: 'bg-blue-500/15', cellBorder: 'border-blue-500/30', textColor: '#2563eb', icon: faFileCircleCheck },
    A: { label: 'Alpa', color: 'text-red-600', cellBg: 'bg-red-500/15', cellBorder: 'border-red-500/30', textColor: '#dc2626', icon: faCircleXmark },
    P: { label: 'Pulang Awal', color: 'text-purple-600', cellBg: 'bg-purple-500/15', cellBorder: 'border-purple-500/30', textColor: '#7c3aed', icon: faDoorOpen },
}

const STATUS_LIST = ['H', 'S', 'I', 'A', 'P']
const DOW_SHORT = ['Mg', 'Sn', 'Sl', 'Rb', 'Km', 'Jm', 'Sb']

const W_NO = 40
const W_NAMA = 176

const TABS = [
    { key: 'teacher', label: 'Guru Pengampu', icon: faChalkboardTeacher, desc: 'Absensi guru mata pelajaran', tableName: 'teachers', typeFilter: 'guru', detailKey: 'subject', emptyLabel: 'Guru' },
    { key: 'mentor', label: 'Mudabbir', icon: faUserClock, desc: 'Absensi pembimbing dari siswa hafidz', tableName: 'students', typeFilter: null, detailKey: 'group_name', emptyLabel: 'Mudabbir' },
    { key: 'student', label: 'Siswa', icon: faUsers, desc: 'Absensi santri harian', tableName: 'students', typeFilter: null, detailKey: 'class_name', emptyLabel: 'Santri' },
]

const SESSIONS = [
    { key: 'mengaji', label: 'Mengaji Wafa', time: '07:30 - 08:10', icon: faBookOpen },
    { key: 'tahfidz', label: 'Tahfidz', time: '14:05 - 14:45', icon: faLayerGroup },
]

const STATUS_COLORS = {
    H: { bg: '#dcfce7', text: '#166534', border: '#86efac' },
    S: { bg: '#fef9c3', text: '#854d0e', border: '#fde047' },
    I: { bg: '#dbeafe', text: '#1e3a8a', border: '#93c5fd' },
    A: { bg: '#fee2e2', text: '#7f1d1d', border: '#fca5a5' },
    P: { bg: '#f3e8ff', text: '#581c87', border: '#d8b4fe' },
}

const draftKey = (tab, y, m, session) => `wafa_${tab}_${session}_${y}_${m}`


// ─── Helpers ──────────────────────────────────────────────────────────────────

const getDaysInMonth = (y, m) => new Date(y, m, 0).getDate()
const getDow = (y, m, d) => new Date(y, m - 1, d).getDay()
const isWeekend = (y, m, d) => { const w = getDow(y, m, d); return w === 0 || w === 6 }

function cycleStatus(curr) {
    const i = STATUS_CYCLE.indexOf(curr || '')
    return STATUS_CYCLE[(i + 1) % STATUS_CYCLE.length]
}

function summarize(days = {}, y, m) {
    const out = { H: 0, S: 0, I: 0, A: 0, P: 0 }
    for (let d = 1; d <= getDaysInMonth(y, m); d++) {
        const s = days[d] || ''
        if (out[s] !== undefined) out[s]++
    }
    return out
}

function countWeekdays(y, m) {
    let n = 0
    for (let d = 1; d <= getDaysInMonth(y, m); d++) if (!isWeekend(y, m, d)) n++
    return n
}

function haptic(type = 'light') {
    if (!navigator.vibrate) return
    const patterns = { light: [8], medium: [15], success: [10, 50, 10], warning: [20, 40, 20], error: [30, 30, 60] }
    navigator.vibrate(patterns[type] || patterns.light)
}


// ─── DayCell ──────────────────────────────────────────────────────────────────

const DayCell = memo(({ status, weekend, invalid, isToday, isFocused, onMouseDown, onMouseEnter }) => {
    const meta = status ? STATUS_META[status] : null

    if (invalid) return (
        <td style={{ width: 32, minWidth: 32, border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface-alt)', opacity: 0.3 }} />
    )

    return (
        <td
            style={{
                width: 32, minWidth: 32,
                border: isFocused ? '2px solid #6366f1' : '1px solid var(--color-border)',
                backgroundColor: meta
                    ? undefined
                    : isFocused
                        ? '#6366f10a'
                        : isToday
                            ? '#6366f105'
                            : weekend
                                ? 'var(--color-surface-alt)'
                                : undefined,
                cursor: 'pointer',
                userSelect: 'none',
                padding: 0,
                position: 'relative',
                zIndex: isFocused ? 2 : undefined,
            }}
            className={`${meta ? `${meta.cellBg} ${meta.cellBorder}` : ''} ${isToday && !isFocused ? 'shadow-[inset_0_0_0_1px_#6366f1,inset_0_0_8px_rgba(99,102,241,0.2)]' : ''}`}
            onMouseDown={onMouseDown}
            onMouseEnter={onMouseEnter}
        >
            {isToday && !meta && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 z-10" />
                    <div className="absolute w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping opacity-75" />
                </div>
            )}
            <div
                className={`w-full h-full flex items-center justify-center text-[11px] font-black transition-all duration-75 hover:brightness-90 active:scale-90 ${meta ? meta.color : weekend ? 'text-[var(--color-text-muted)]/20' : 'text-transparent hover:text-[var(--color-text-muted)]/30'}`}
                style={{ height: 28 }}
            >
                {status || (weekend ? '·' : '')}
            </div>
        </td>
    )
})


// ─── Row (per item) ──────────────────────────────────────────────────────────

const Row = memo(({ item, idx, days, tahun, bulan, daysInMonth, todayDate, onCellMouseDown, onCellMouseEnter, onRowFill, onNoteClick, note, hideWeekend, focusedDay, alpaThreshold, hadirThreshold, visibleDays }) => {
    const sum = useMemo(() => summarize(days, tahun, bulan), [days, tahun, bulan])
    const weekdays = useMemo(() => countWeekdays(tahun, bulan), [tahun, bulan])
    const pct = weekdays > 0 ? Math.round((sum.H / weekdays) * 100) : 0
    const alertAlpa = sum.A >= (alpaThreshold ?? 3)
    const alertHadir = pct < (hadirThreshold ?? 75) && weekdays > 0 && sum.H + sum.S + sum.I + sum.A + sum.P > 0
    const hasNote = !!note

    return (
        <tr className={`table-row-lazy ${alertAlpa ? 'bg-red-500/[0.02]' : ''}`}>
            {/* No — sticky */}
            <td style={{
                position: 'sticky', left: 0, zIndex: 4,
                width: W_NO, minWidth: W_NO,
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                textAlign: 'center',
                boxShadow: '2px 0 4px -2px rgba(0,0,0,0.06)',
            }}>
                <div className="w-6 h-6 rounded-full bg-[var(--color-surface-alt)] border border-[var(--color-border)] flex items-center justify-center text-[10px] font-black text-[var(--color-text-muted)] mx-auto">
                    {idx + 1}
                </div>
            </td>

            {/* Nama — sticky, klik untuk row fill */}
            <td
                onClick={(e) => onRowFill(e, item)}
                style={{
                    position: 'sticky', left: W_NO, zIndex: 4,
                    width: W_NAMA, minWidth: W_NAMA, maxWidth: W_NAMA,
                    backgroundColor: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRight: '2px solid var(--color-border)',
                    padding: '6px 12px',
                    boxShadow: '4px 0 8px -4px rgba(0,0,0,0.08)',
                    cursor: 'pointer',
                }}
                title="Klik untuk isi baris ini"
                className="group"
            >
                <div className="flex items-center justify-between gap-1">
                    <div className="min-w-0">
                        <p className="text-[12px] font-bold text-[var(--color-text)] truncate group-hover:text-[var(--color-primary)] transition-colors">{item.name}</p>
                        {alertAlpa
                            ? <p className="text-[9px] font-black text-red-500 flex items-center gap-1 mt-0.5">
                                <FontAwesomeIcon icon={faTriangleExclamation} className="text-[8px]" />Alpa {sum.A}×
                            </p>
                            : alertHadir
                                ? <p className="text-[9px] font-black text-amber-500 flex items-center gap-1 mt-0.5">
                                    <FontAwesomeIcon icon={faBell} className="text-[8px]" />Hadir {pct}%
                                </p>
                                : item.nisn
                                    ? <p className="text-[9px] text-[var(--color-text-muted)] truncate">{item.nisn}</p>
                                    : <p className="text-[9px] text-[var(--color-text-muted)] truncate">{item.detail}</p>
                        }
                    </div>
                    <div className="w-5 shrink-0">
                        <button
                            onClick={(e) => { e.stopPropagation(); onNoteClick(e, item) }}
                            className={`w-5 h-5 rounded flex items-center justify-center transition-all ${hasNote ? 'text-amber-500' : 'opacity-0 group-hover:opacity-40 text-[var(--color-text-muted)]'}`}
                            title={hasNote ? `Catatan: ${note}` : 'Tambah catatan'}
                        >
                            <FontAwesomeIcon icon={faStickyNote} className="text-[8px]" />
                        </button>
                    </div>
                </div>
            </td>

            {/* Day cells */}
            {(visibleDays || Array.from({ length: 31 }, (_, i) => i + 1)).map(d => (
                <DayCell
                    key={d}
                    status={d <= daysInMonth ? (days?.[d] || '') : ''}
                    weekend={d <= daysInMonth && isWeekend(tahun, bulan, d)}
                    invalid={d > daysInMonth}
                    isToday={d === todayDate}
                    isFocused={focusedDay === d}
                    onMouseDown={() => onCellMouseDown(item.id, d)}
                    onMouseEnter={() => onCellMouseEnter(item.id, d)}
                />
            ))}

            {/* Summary cols — STICKY RIGHT */}
            {STATUS_LIST.map((s, i) => {
                const rightOffset = 40 + (STATUS_LIST.length - 1 - i) * 28
                return (
                    <td key={s}
                        style={{
                            position: 'sticky', right: rightOffset, zIndex: 4,
                            width: 28, minWidth: 28, textAlign: 'center',
                            backgroundColor: 'var(--color-surface)',
                            border: '1px solid var(--color-border)',
                            borderLeft: i === 0 ? '2px solid var(--color-border)' : '1px solid var(--color-border)',
                            boxShadow: i === 0 ? '-4px 0 8px -4px rgba(0,0,0,0.08)' : 'none'
                        }}
                    >
                        <span className={`text-[10px] font-black ${STATUS_META[s].color} ${sum[s] === 0 ? 'opacity-20' : ''}`}>
                            {sum[s]}
                        </span>
                    </td>
                )
            })}

            {/* % hadir — STICKY RIGHT */}
            <td
                style={{
                    position: 'sticky', right: 0, zIndex: 4,
                    width: 40, minWidth: 40, textAlign: 'center',
                    backgroundColor: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderLeft: '2px solid var(--color-border)',
                    boxShadow: '-2px 0 4px -2px rgba(0,0,0,0.06)'
                }}
            >
                <div className="flex flex-col items-center gap-0.5 py-1">
                    <span className={`text-[10px] font-black tabular-nums ${pct >= 80 ? 'text-emerald-600' : pct >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                        {pct}%
                    </span>
                    <div className="w-5 h-0.5 rounded-full bg-[var(--color-border)] overflow-hidden">
                        <div className="h-full rounded-full transition-all"
                            style={{ width: `${pct}%`, background: pct >= 80 ? '#059669' : pct >= 60 ? '#d97706' : '#dc2626' }} />
                    </div>
                </div>
            </td>
        </tr>
    )
}, (p, n) =>
    p.item === n.item && p.idx === n.idx && p.days === n.days &&
    p.tahun === n.tahun && p.bulan === n.bulan && p.daysInMonth === n.daysInMonth &&
    p.todayDate === n.todayDate && p.note === n.note && p.hideWeekend === n.hideWeekend &&
    p.focusedDay === n.focusedDay && p.alpaThreshold === n.alpaThreshold &&
    p.hadirThreshold === n.hadirThreshold && p.visibleDays === n.visibleDays &&
    p.onCellMouseDown === n.onCellMouseDown && p.onCellMouseEnter === n.onCellMouseEnter &&
    p.onRowFill === n.onRowFill && p.onNoteClick === n.onNoteClick
)


// ─── RowSkeleton ──────────────────────────────────────────────────────────────

function RowSkeleton({ colCount = 31 }) {
    return (
        <tr className="animate-pulse">
            <td style={{
                position: 'sticky', left: 0, zIndex: 4, width: W_NO, minWidth: W_NO,
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)', padding: 8, textAlign: 'center',
                boxShadow: '2px 0 4px -2px rgba(0,0,0,0.06)',
            }}>
                <div className="w-6 h-6 rounded-full bg-[var(--color-border)] mx-auto" />
            </td>
            <td style={{
                position: 'sticky', left: W_NO, zIndex: 4, width: W_NAMA, minWidth: W_NAMA,
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)', borderRight: '2px solid var(--color-border)',
                padding: '8px 12px',
                boxShadow: '4px 0 8px -4px rgba(0,0,0,0.08)',
            }}>
                <div className="h-3 w-28 rounded bg-[var(--color-border)] mb-1.5" />
                <div className="h-2.5 w-16 rounded bg-[var(--color-border)]" />
            </td>
            {Array.from({ length: colCount }).map((_, i) => (
                <td key={i} className="border border-[var(--color-border)] p-0"
                    style={{ width: 32, minWidth: 32 }}>
                    <div className="w-full h-7 bg-[var(--color-border)]/30" />
                </td>
            ))}
            {STATUS_LIST.map((s, i) => {
                const rightOffset = 40 + (STATUS_LIST.length - 1 - i) * 28
                return (
                    <td key={s}
                        style={{
                            position: 'sticky', right: rightOffset, zIndex: 4,
                            width: 28, minWidth: 28,
                            backgroundColor: 'var(--color-surface)',
                            border: '1px solid var(--color-border)',
                            borderLeft: i === 0 ? '2px solid var(--color-border)' : '1px solid var(--color-border)',
                        }}
                    />
                )
            })}
            <td style={{
                position: 'sticky', right: 0, zIndex: 4,
                width: 40, minWidth: 40,
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderLeft: '2px solid var(--color-border)',
            }} />
        </tr>
    )
}


// ─── MassActionDropdown ───────────────────────────────────────────────────────

function MassActionDropdown({ items, dataMap, setDataMap, tahun, bulan, daysInMonth, onDirty, addToast, tabKey, activeSession }) {
    const [open, setOpen] = useState(false)
    const [menuPos, setMenuPos] = useState({ x: 0, y: 0 })
    const btnRef = useRef(null)
    const menuRef = useRef(null)

    useEffect(() => {
        const h = (e) => {
            if (btnRef.current && !btnRef.current.contains(e.target) && menuRef.current && !menuRef.current.contains(e.target)) setOpen(false)
        }
        document.addEventListener('mousedown', h)
        return () => document.removeEventListener('mousedown', h)
    }, [])

    const handleToggle = () => {
        if (!open && btnRef.current) {
            const r = btnRef.current.getBoundingClientRect()
            setMenuPos({ x: r.left, y: r.bottom + 6 })
        }
        setOpen(v => !v)
    }

    const applyAll = useCallback((statusCode) => {
        setDataMap(prev => {
            const next = { ...prev }
            for (const item of items) {
                const curr = { ...(next[item.id] || {}) }
                for (let d = 1; d <= daysInMonth; d++) {
                    if (!isWeekend(tahun, bulan, d)) {
                        const dayObj = { ...(curr[d] || {}) }
                        dayObj[activeSession] = statusCode
                        curr[d] = dayObj
                    }
                }
                next[item.id] = curr
            }
            return next
        })
        onDirty()
        setOpen(false)
        logAudit({ action: 'UPDATE', source: 'SYSTEM', tableName: `wafa_${tabKey}_attendance`, newData: { intent: 'mass_fill', status: statusCode, count: items.length } })
        addToast(`Semua hari kerja diisi: ${STATUS_META[statusCode].label}`, 'success')
    }, [items, tahun, bulan, daysInMonth, setDataMap, onDirty, addToast, tabKey, activeSession])

    const handleReset = useCallback(() => {
        setDataMap(prev => {
            const next = { ...prev }
            for (const item of items) {
                const curr = { ...(next[item.id] || {}) }
                for (const dayKey of Object.keys(curr)) {
                    const dayObj = { ...(curr[dayKey] || {}) }
                    delete dayObj[activeSession]
                    if (Object.keys(dayObj).length === 0) delete curr[dayKey]; else curr[dayKey] = dayObj
                }
                next[item.id] = curr
            }
            return next
        })
        onDirty()
        setOpen(false)
        logAudit({ action: 'DELETE', source: 'SYSTEM', tableName: `wafa_${tabKey}_attendance`, newData: { intent: 'mass_reset', count: items.length } })
        addToast('Semua data absensi direset', 'info')
    }, [items, setDataMap, onDirty, addToast, tabKey, activeSession])

    return (
        <>
            <button ref={btnRef} type="button" onClick={handleToggle}
                className="h-8 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[10px] font-black text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-border)] active:scale-95 transition-all flex items-center gap-1.5 shrink-0">
                <FontAwesomeIcon icon={faListCheck} className="text-[9px]" />
                Aksi Massal
                <FontAwesomeIcon icon={faChevronDown} className={`text-[8px] transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && createPortal(
                <div ref={menuRef} style={{
                    position: 'fixed', left: Math.min(menuPos.x, window.innerWidth - 216), top: menuPos.y, zIndex: 9999, width: 208,
                }} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl overflow-hidden py-1">
                    <p className="px-3 pt-1.5 pb-1 text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">
                        Isi semua hari kerja dengan:
                    </p>
                    {STATUS_LIST.map(s => (
                        <button key={s} onClick={() => applyAll(s)}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-[11px] font-bold hover:bg-[var(--color-surface-alt)] transition-colors text-left">
                            <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black border ${STATUS_META[s].cellBg} ${STATUS_META[s].color.replace('text-', 'border-').replace('600', '500/30')}`}>
                                {s}
                            </span>
                            <span className={STATUS_META[s].color}>{STATUS_META[s].label}</span>
                        </button>
                    ))}
                    <div className="my-1 border-t border-[var(--color-border)]" />
                    <button onClick={handleReset}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-[11px] font-bold hover:bg-red-500/5 transition-colors text-left text-red-500">
                        <span className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] bg-red-500/10 border border-red-500/20">
                            <FontAwesomeIcon icon={faArrowsRotate} className="text-[9px]" />
                        </span>
                        Reset Semua
                    </button>
                </div>,
                document.body
            )}
        </>
    )
}


// ─── NotePopup ────────────────────────────────────────────────────────────────

function NotePopup({ item, note, x, y, onSave, onClose }) {
    const [val, setVal] = useState(note || '')
    const ref = useRef(null)
    useEffect(() => {
        const h = (e) => { if (ref.current && !ref.current.contains(e.target)) { onSave(val); onClose() } }
        document.addEventListener('mousedown', h)
        return () => document.removeEventListener('mousedown', h)
    }, [onClose, onSave, val])
    return createPortal(
        <div ref={ref} style={{
            position: 'fixed', left: Math.min(x, window.innerWidth - 240), top: y + 4, zIndex: 9999,
            width: 232, background: 'var(--color-surface)', border: '1px solid var(--color-border)',
            borderRadius: 14, boxShadow: '0 8px 32px rgba(0,0,0,0.14)', overflow: 'hidden',
        }}>
            <div style={{ padding: '8px 12px 6px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <FontAwesomeIcon icon={faStickyNote} style={{ fontSize: 10, color: '#f59e0b' }} />
                <p style={{ fontSize: 11, fontWeight: 900, color: 'var(--color-text)', margin: 0, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    Catatan — {item.name.split(' ')[0]}
                </p>
                <button onClick={() => { onSave(val); onClose() }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                    <FontAwesomeIcon icon={faXmark} style={{ fontSize: 10, color: 'var(--color-text-muted)' }} />
                </button>
            </div>
            <div style={{ padding: 12 }}>
                <textarea autoFocus value={val} onChange={e => setVal(e.target.value)}
                    placeholder="Tulis catatan singkat..."
                    style={{
                        width: '100%', minHeight: 72, resize: 'vertical', fontSize: 11, fontWeight: 600,
                        color: 'var(--color-text)', background: 'var(--color-surface-alt)',
                        border: '1px solid var(--color-border)', borderRadius: 8, padding: '6px 8px',
                        outline: 'none', fontFamily: 'inherit',
                    }}
                    onKeyDown={e => { if (e.key === 'Escape') { onSave(val); onClose() } }} />
                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                    {val && (
                        <button onClick={() => setVal('')}
                            style={{ flex: 1, height: 28, borderRadius: 8, border: '1px solid var(--color-border)', background: 'none', fontSize: 10, fontWeight: 700, color: '#dc2626', cursor: 'pointer' }}>
                            Hapus Catatan
                        </button>
                    )}
                    <button onClick={() => { onSave(val); onClose() }}
                        style={{ flex: 1, height: 28, borderRadius: 8, background: 'var(--color-primary)', border: 'none', fontSize: 10, fontWeight: 900, color: '#fff', cursor: 'pointer' }}>
                        Simpan
                    </button>
                </div>
            </div>
        </div>,
        document.body
    )
}


// ─── ImportModal ──────────────────────────────────────────────────────────────

function ImportModal({ itemList, tahun, bulan, daysInMonth, onImport, onClose }) {
    const [file, setFile] = useState(null)
    const [preview, setPreview] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    const handleFile = async (f) => {
        if (!f) return
        setFile(f); setError(null); setLoading(true)
        try {
            const XLSX = (await import('xlsx')).default
            const buf = await f.arrayBuffer()
            const wb = XLSX.read(buf, { type: 'array' })
            const ws = wb.Sheets[wb.SheetNames[0]]
            const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
            if (rows.length < 2) throw new Error('File tidak valid atau kosong')
            const header = rows[0].map(h => String(h).toLowerCase().trim())
            const namaCol = header.findIndex(h => h.includes('nama'))
            if (namaCol < 0) throw new Error('Kolom "Nama" tidak ditemukan di baris pertama')
            const nameMap = {}
            for (const item of itemList) nameMap[item.name.toLowerCase().replace(/\s+/g, ' ').trim()] = item.id
            const matched = []; const unmatched = []
            for (let r = 1; r < rows.length; r++) {
                const row = rows[r]
                const rawName = String(row[namaCol] || '').trim()
                if (!rawName) continue
                const key = rawName.toLowerCase().replace(/\s+/g, ' ')
                const sid = nameMap[key]
                if (!sid) { unmatched.push(rawName); continue }
                const days = {}
                for (let d = 1; d <= daysInMonth; d++) {
                    const colIdx = header.findIndex(h => h === String(d))
                    if (colIdx >= 0) {
                        const v = String(row[colIdx] || '').trim().toUpperCase()
                        if (['H', 'S', 'I', 'A', 'P'].includes(v)) days[d] = v
                    }
                }
                matched.push({ sid, name: rawName, days })
            }
            setPreview({ matched, unmatched })
        } catch (e) {
            setError(e.message)
        }
        setLoading(false)
    }

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={e => { if (e.target === e.currentTarget) onClose() }}>
            <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[85vh]">
                <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center">
                            <FontAwesomeIcon icon={faFileImport} className="text-blue-500 text-sm" />
                        </div>
                        <div>
                            <p className="text-[13px] font-black text-[var(--color-text)]">Import Absensi</p>
                            <p className="text-[10px] text-[var(--color-text-muted)]">Upload file Excel/CSV {BULAN_NAMA[bulan]} {tahun}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-[var(--color-surface-alt)] flex items-center justify-center">
                        <FontAwesomeIcon icon={faXmark} className="text-[var(--color-text-muted)]" />
                    </button>
                </div>
                <div className="p-5 overflow-y-auto flex-1 space-y-4">
                    <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/20">
                        <p className="text-[10px] font-black text-blue-600 mb-1">Format yang didukung:</p>
                        <p className="text-[10px] text-[var(--color-text-muted)] leading-relaxed">
                            Baris pertama = header. Harus ada kolom <strong>Nama</strong>. Kolom tanggal = angka (1, 2, 3, ...).
                            Nilai: <strong>H</strong> Hadir · <strong>S</strong> Sakit · <strong>I</strong> Izin · <strong>A</strong> Alpa · <strong>P</strong> Pulang Awal.
                        </p>
                    </div>
                    <label className="flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed border-[var(--color-border)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)]/3 transition-all cursor-pointer">
                        <FontAwesomeIcon icon={faUpload} className="text-2xl text-[var(--color-text-muted)]" />
                        <p className="text-[12px] font-bold text-[var(--color-text-muted)]">
                            {file ? file.name : 'Klik atau seret file di sini'}
                        </p>
                        <p className="text-[10px] text-[var(--color-text-muted)]">.xlsx, .xls, .csv</p>
                        <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={e => handleFile(e.target.files[0])} />
                    </label>
                    {loading && <div className="flex items-center justify-center gap-2 py-4"><FontAwesomeIcon icon={faSpinner} className="animate-spin text-[var(--color-primary)]" /><span className="text-[11px] text-[var(--color-text-muted)]">Membaca file...</span></div>}
                    {error && <div className="p-3 rounded-xl bg-red-500/8 border border-red-500/20 text-[11px] font-bold text-red-600">{error}</div>}
                    {preview && (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-md">{preview.matched.length} cocok</span>
                                {preview.unmatched.length > 0 && <span className="text-[10px] font-black text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-md">{preview.unmatched.length} tidak ditemukan</span>}
                            </div>
                            {preview.unmatched.length > 0 && (
                                <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
                                    <p className="text-[9px] font-black text-amber-600 mb-1 uppercase tracking-wider">Tidak ditemukan di daftar:</p>
                                    {preview.unmatched.slice(0, 5).map((n, i) => <p key={i} className="text-[10px] text-[var(--color-text-muted)]">· {n}</p>)}
                                    {preview.unmatched.length > 5 && <p className="text-[9px] text-[var(--color-text-muted)]">...dan {preview.unmatched.length - 5} lainnya</p>}
                                </div>
                            )}
                        </div>
                    )}
                </div>
                <div className="px-5 py-3 border-t border-[var(--color-border)] flex gap-2 justify-end">
                    <button onClick={onClose} className="h-9 px-4 rounded-xl border border-[var(--color-border)] text-[10px] font-black text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-all">Batal</button>
                    <button disabled={!preview || preview.matched.length === 0}
                        onClick={() => { onImport(preview.matched); onClose() }}
                        className="h-9 px-5 rounded-xl bg-[var(--color-primary)] text-white text-[10px] font-black disabled:opacity-40 hover:opacity-90 transition-all flex items-center gap-2">
                        <FontAwesomeIcon icon={faCheck} className="text-[9px]" />
                        Terapkan ({preview?.matched.length || 0})
                    </button>
                </div>
            </div>
        </div>,
        document.body
    )
}


// ─── AlertThresholdModal ──────────────────────────────────────────────────────

function AlertThresholdModal({ threshold, onSave, onClose }) {
    const [alpa, setAlpa] = useState(threshold.alpa)
    const [hadirPct, setHadirPct] = useState(threshold.hadirPct)
    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={e => { if (e.target === e.currentTarget) onClose() }}>
            <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-2xl w-full max-w-xs overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center">
                            <FontAwesomeIcon icon={faBell} className="text-amber-500 text-sm" />
                        </div>
                        <div>
                            <p className="text-[13px] font-black text-[var(--color-text)]">Ambang Batas Alert</p>
                            <p className="text-[10px] text-[var(--color-text-muted)]">Tampilkan notifikasi otomatis</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-[var(--color-surface-alt)] flex items-center justify-center">
                        <FontAwesomeIcon icon={faXmark} className="text-[var(--color-text-muted)]" />
                    </button>
                </div>
                <div className="p-5 space-y-4">
                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)] mb-2">
                            Alpa ≥ <span className="text-red-600 text-[14px] ml-1">{alpa}</span> hari → merah
                        </label>
                        <input type="range" min={1} max={10} value={alpa} onChange={e => setAlpa(+e.target.value)} className="w-full accent-red-500 h-1.5 cursor-pointer" />
                        <div className="flex justify-between text-[9px] text-[var(--color-text-muted)] mt-1"><span>1</span><span>5</span><span>10</span></div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)] mb-2">
                            Kehadiran &lt; <span className="text-amber-600 text-[14px] ml-1">{hadirPct}%</span> → kuning
                        </label>
                        <input type="range" min={30} max={90} step={5} value={hadirPct} onChange={e => setHadirPct(+e.target.value)} className="w-full accent-amber-500 h-1.5 cursor-pointer" />
                        <div className="flex justify-between text-[9px] text-[var(--color-text-muted)] mt-1"><span>30%</span><span>60%</span><span>90%</span></div>
                    </div>
                </div>
                <div className="px-5 py-3 border-t border-[var(--color-border)] flex gap-2 justify-end">
                    <button onClick={onClose} className="h-9 px-4 rounded-xl border border-[var(--color-border)] text-[10px] font-black text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-all">Batal</button>
                    <button onClick={() => { onSave({ alpa, hadirPct }); onClose() }}
                        className="h-9 px-5 rounded-xl bg-[var(--color-primary)] text-white text-[10px] font-black hover:opacity-90 transition-all flex items-center gap-2">
                        <FontAwesomeIcon icon={faCheck} className="text-[9px]" /> Simpan
                    </button>
                </div>
            </div>
        </div>,
        document.body
    )
}


// ─── ColFillPopup ─────────────────────────────────────────────────────────────

function ColFillPopup({ day, dow, x, y, onFill, onClear, onClose, itemCount }) {
    const ref = useRef(null)
    useEffect(() => {
        const h = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose() }
        document.addEventListener('mousedown', h)
        return () => document.removeEventListener('mousedown', h)
    }, [onClose])

    return createPortal(
        <div ref={ref} style={{
            position: 'fixed', left: Math.min(x, window.innerWidth - 210), top: y + 4, zIndex: 9999,
            width: 200, background: 'var(--color-surface)', border: '1px solid var(--color-border)',
            borderRadius: 14, boxShadow: '0 8px 32px rgba(0,0,0,0.14)', overflow: 'hidden',
        }}>
            <div style={{ padding: '8px 12px 6px', borderBottom: '1px solid var(--color-border)' }}>
                <p style={{ fontSize: 11, fontWeight: 900, color: 'var(--color-text)', margin: 0 }}>
                    {DOW_SHORT[dow]} · Tanggal {day}
                </p>
                <p style={{ fontSize: 9, color: 'var(--color-text-muted)', marginTop: 2 }}>
                    Isi semua {itemCount} dengan:
                </p>
            </div>
            <div style={{ padding: '4px 0' }}>
                {STATUS_LIST.map(s => (
                    <button key={s} onClick={() => { onFill(s); onClose() }}
                        className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-[var(--color-surface-alt)] transition-colors text-left"
                        style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                        <span className={`w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-black border ${STATUS_META[s].cellBg} ${STATUS_META[s].color}`} style={{ flexShrink: 0 }}>{s}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text)' }}>{STATUS_META[s].label}</span>
                    </button>
                ))}
                <div style={{ margin: '4px 12px', height: 1, background: 'var(--color-border)' }} />
                <button onClick={() => { onClear(); onClose() }}
                    className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-red-500/5 transition-colors text-left"
                    style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                    <span className="w-6 h-6 rounded-md flex items-center justify-center bg-[var(--color-surface-alt)] border border-[var(--color-border)]" style={{ flexShrink: 0 }}>
                        <FontAwesomeIcon icon={faArrowsRotate} style={{ fontSize: 9, color: 'var(--color-text-muted)' }} />
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#dc2626' }}>Kosongkan hari ini</span>
                </button>
            </div>
        </div>,
        document.body
    )
}


// ─── RowFillPopup ─────────────────────────────────────────────────────────────

function RowFillPopup({ item, x, y, onFill, onClear, onClose, weekdays }) {
    const ref = useRef(null)
    useEffect(() => {
        const h = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose() }
        document.addEventListener('mousedown', h)
        return () => document.removeEventListener('mousedown', h)
    }, [onClose])

    return createPortal(
        <div ref={ref} style={{
            position: 'fixed', left: Math.min(x, window.innerWidth - 210), top: y + 4, zIndex: 9999,
            width: 200, background: 'var(--color-surface)', border: '1px solid var(--color-border)',
            borderRadius: 14, boxShadow: '0 8px 32px rgba(0,0,0,0.14)', overflow: 'hidden',
        }}>
            <div style={{ padding: '8px 12px 6px', borderBottom: '1px solid var(--color-border)' }}>
                <p style={{ fontSize: 11, fontWeight: 900, color: 'var(--color-text)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.name.split(' ').slice(0, 2).join(' ')}
                </p>
                <p style={{ fontSize: 9, color: 'var(--color-text-muted)', marginTop: 2 }}>
                    Isi {weekdays} hari kerja dengan:
                </p>
            </div>
            <div style={{ padding: '4px 0' }}>
                {STATUS_LIST.map(s => (
                    <button key={s} onClick={() => { onFill(s); onClose() }}
                        className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-[var(--color-surface-alt)] transition-colors text-left"
                        style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                        <span className={`w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-black border ${STATUS_META[s].cellBg} ${STATUS_META[s].color}`} style={{ flexShrink: 0 }}>{s}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text)' }}>{STATUS_META[s].label}</span>
                    </button>
                ))}
                <div style={{ margin: '4px 12px', height: 1, background: 'var(--color-border)' }} />
                <button onClick={() => { onClear(); onClose() }}
                    className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-red-500/5 transition-colors text-left"
                    style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                    <span className="w-6 h-6 rounded-md flex items-center justify-center bg-[var(--color-surface-alt)] border border-[var(--color-border)]" style={{ flexShrink: 0 }}>
                        <FontAwesomeIcon icon={faArrowsRotate} style={{ fontSize: 9, color: 'var(--color-text-muted)' }} />
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#dc2626' }}>Reset baris ini</span>
                </button>
            </div>
        </div>,
        document.body
    )
}


// ─── ConfirmModal ─────────────────────────────────────────────────────────────

function ConfirmModal({ message, confirmLabel = 'Lanjutkan', onConfirm, onCancel }) {
    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={e => { if (e.target === e.currentTarget) onCancel() }}>
            <div className="w-full max-w-xs bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-2xl overflow-hidden">
                <div className="flex items-start gap-3 px-5 pt-5 pb-4">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0 mt-0.5">
                        <FontAwesomeIcon icon={faTriangleExclamation} className="text-amber-500 text-[13px]" />
                    </div>
                    <div>
                        <p className="text-[13px] font-black text-[var(--color-text)]">Ada perubahan belum disimpan</p>
                        <p className="text-[11px] text-[var(--color-text-muted)] mt-1">{message}</p>
                    </div>
                </div>
                <div className="flex gap-2 px-5 pb-4">
                    <button onClick={onCancel} className="flex-1 h-9 rounded-xl border border-[var(--color-border)] text-[11px] font-black text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] transition-all">Batal</button>
                    <button onClick={onConfirm} className="flex-1 h-9 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-black transition-all">{confirmLabel}</button>
                </div>
            </div>
        </div>
    )
}


// ─── MobileCardView ───────────────────────────────────────────────────────────

function MobileCardView({ items, dataMap, tahun, bulan, daysInMonth, todayDate, onCellClick, notesMap, onNoteClick, alpaThreshold, hadirThreshold, loadingData }) {
    const weekdays = useMemo(() => countWeekdays(tahun, bulan), [tahun, bulan])

    if (loadingData) return (
        <div className="p-4 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 animate-pulse">
                    <div className="h-3 w-32 rounded bg-[var(--color-border)] mb-3" />
                    <div className="flex flex-wrap gap-1">
                        {Array.from({ length: Math.min(daysInMonth, 15) }).map((_, j) => <div key={j} className="w-7 h-7 rounded-lg bg-[var(--color-border)]/40" />)}
                    </div>
                </div>
            ))}
        </div>
    )

    if (items.length === 0) return (
        <div className="py-16 flex flex-col items-center gap-2 text-[var(--color-text-muted)]">
            <FontAwesomeIcon icon={faMagnifyingGlass} className="text-2xl opacity-20" />
            <p className="text-[12px] font-bold">Tidak ada data</p>
        </div>
    )

    return (
        <div className="p-3 space-y-2.5">
            {items.map((item, idx) => {
                const days = dataMap[item.id] || {}
                const sum = summarize(days, tahun, bulan)
                const pct = weekdays > 0 ? Math.round((sum.H / weekdays) * 100) : 0
                const hasNote = !!notesMap[item.id]
                const alertAlpa = sum.A >= (alpaThreshold ?? 3)
                const alertHadir = pct < (hadirThreshold ?? 75) && weekdays > 0 && sum.H + sum.S + sum.I + sum.A + sum.P > 0

                return (
                    <div key={item.id} className={`rounded-2xl border bg-[var(--color-surface)] overflow-hidden ${alertAlpa ? 'border-red-300/60' : alertHadir ? 'border-amber-300/60' : 'border-[var(--color-border)]'}`}>
                        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--color-border)] bg-[var(--color-surface-alt)]/40">
                            <div className="flex items-center gap-2 min-w-0">
                                <div className="w-6 h-6 rounded-full bg-[var(--color-surface-alt)] border border-[var(--color-border)] flex items-center justify-center text-[9px] font-black text-[var(--color-text-muted)] shrink-0">{idx + 1}</div>
                                <div className="min-w-0">
                                    <p className="text-[13px] font-bold text-[var(--color-text)] truncate">{item.name}</p>
                                    <p className="text-[9px] text-[var(--color-text-muted)] truncate">{item.detail}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                                {alertAlpa && (
                                    <span className="text-[9px] font-black text-red-500 flex items-center gap-0.5 bg-red-500/10 px-1.5 py-0.5 rounded-md">
                                        <FontAwesomeIcon icon={faTriangleExclamation} className="text-[7px]" />Alpa {sum.A}×
                                    </span>
                                )}
                                {alertHadir && !alertAlpa && (
                                    <span className="text-[9px] font-black text-amber-500 flex items-center gap-0.5 bg-amber-500/10 px-1.5 py-0.5 rounded-md">
                                        <FontAwesomeIcon icon={faBell} className="text-[7px]" />Hadir {pct}%
                                    </span>
                                )}
                                <span className={`text-[10px] font-black ${pct >= 80 ? 'text-emerald-600' : pct >= 60 ? 'text-amber-600' : 'text-red-600'}`}>{pct}%</span>
                                <button onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); onNoteClick?.({ item, x: r.left, y: r.bottom }) }}
                                    className={`w-6 h-6 rounded-md flex items-center justify-center ml-1 transition-all ${hasNote ? 'text-amber-500 bg-amber-500/10' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]'}`}>
                                    <FontAwesomeIcon icon={faStickyNote} className="text-[9px]" />
                                </button>
                            </div>
                        </div>
                        <div className="px-3 py-3">
                            <div className="flex flex-wrap gap-1">
                                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => {
                                    const s = days[d] || ''
                                    const weekend = isWeekend(tahun, bulan, d)
                                    const isToday = d === todayDate
                                    return (
                                        <button key={d}
                                            onClick={() => onCellClick(item.id, d)}
                                            style={s ? { background: STATUS_COLORS[s]?.bg, border: `1.5px solid ${STATUS_COLORS[s]?.border}` } : { background: weekend ? 'var(--color-surface-alt)' : 'var(--color-surface)', border: '1px solid var(--color-border)' }}
                                            className={`w-7 h-7 rounded-lg text-[10px] font-black transition-all active:scale-90 flex items-center justify-center ${isToday ? 'ring-1 ring-indigo-400' : ''}`}>
                                            <span style={{ color: s ? STATUS_COLORS[s]?.text : weekend ? 'var(--color-text-muted)' : 'var(--color-text-muted)', opacity: s ? 1 : 0.4 }}>
                                                {s || d}
                                            </span>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}


// ─── MobileListView ───────────────────────────────────────────────────────────

function MobileListView({ items, dataMap, tahun, bulan, daysInMonth, todayDate, onCellClick, notesMap, onNoteClick, alpaThreshold, hadirThreshold, loadingData }) {
    const weekdays = useMemo(() => countWeekdays(tahun, bulan), [tahun, bulan])

    if (loadingData) return (
        <div className="divide-y divide-[var(--color-border)]">
            {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3 animate-pulse">
                    <div className="w-6 h-6 rounded-full bg-[var(--color-border)]" />
                    <div className="flex-1"><div className="h-3 w-28 rounded bg-[var(--color-border)] mb-1.5" /><div className="h-2 w-16 rounded bg-[var(--color-border)]" /></div>
                    <div className="flex gap-1">{Array.from({ length: 5 }).map((_, j) => <div key={j} className="w-7 h-7 rounded-lg bg-[var(--color-border)]/40" />)}</div>
                </div>
            ))}
        </div>
    )

    if (items.length === 0) return (
        <div className="py-16 flex flex-col items-center gap-2 text-[var(--color-text-muted)]">
            <FontAwesomeIcon icon={faMagnifyingGlass} className="text-2xl opacity-20" />
            <p className="text-[12px] font-bold">Tidak ada data</p>
        </div>
    )

    return (
        <div className="divide-y divide-[var(--color-border)]">
            {items.map((item, idx) => {
                const days = dataMap[item.id] || {}
                const sum = summarize(days, tahun, bulan)
                const pct = weekdays > 0 ? Math.round((sum.H / weekdays) * 100) : 0
                const hasNote = !!notesMap[item.id]
                const alertAlpa = sum.A >= (alpaThreshold ?? 3)
                const alertHadir = pct < (hadirThreshold ?? 75) && weekdays > 0 && sum.H + sum.S + sum.I + sum.A + sum.P > 0

                return (
                    <div key={item.id} className={`flex items-center gap-2.5 px-4 py-2.5 ${alertAlpa ? 'bg-red-500/[0.03]' : alertHadir ? 'bg-amber-500/[0.03]' : ''}`}>
                        <div className="w-5 h-5 rounded-full bg-[var(--color-surface-alt)] border border-[var(--color-border)] flex items-center justify-center text-[8px] font-black text-[var(--color-text-muted)] shrink-0">{idx + 1}</div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1">
                                <p className="text-[12px] font-bold text-[var(--color-text)] truncate">{item.name}</p>
                                {hasNote && <FontAwesomeIcon icon={faStickyNote} className="text-[8px] text-amber-500 shrink-0" />}
                            </div>
                            <p className="text-[9px] text-[var(--color-text-muted)] truncate">{item.detail}</p>
                        </div>
                        <div className="flex items-center gap-0.5 shrink-0">
                            {STATUS_LIST.map(s => {
                                const total = sum[s] || 0
                                return (
                                    <div key={s} className="flex flex-col items-center">
                                        <span className={`text-[10px] font-black ${STATUS_META[s].color} ${total === 0 ? 'opacity-20' : ''}`}>{total}</span>
                                        <span className="text-[7px] text-[var(--color-text-muted)]">{s}</span>
                                    </div>
                                )
                            })}
                            <div className="flex flex-col items-center ml-1">
                                {alertAlpa && (
                                    <span className="text-[7px] font-black text-red-500 flex items-center gap-0.5">
                                        <FontAwesomeIcon icon={faTriangleExclamation} className="text-[6px]" />Alpa {sum.A}×
                                    </span>
                                )}
                                {alertHadir && !alertAlpa && (
                                    <span className="text-[7px] font-black text-amber-500 flex items-center gap-0.5">
                                        <FontAwesomeIcon icon={faBell} className="text-[6px]" />Hadir {pct}%
                                    </span>
                                )}
                                <span className={`text-[10px] font-black ${pct >= 80 ? 'text-emerald-600' : pct >= 60 ? 'text-amber-600' : 'text-red-600'}`}>{pct}%</span>
                                <span className="text-[7px] text-[var(--color-text-muted)]">%</span>
                            </div>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}


// ─── GroupManageModal ─────────────────────────────────────────────────────────
function GroupManageModal({ groups, teacherList, studentList, onClose, onRefresh, addToast }) {
    const [mode, setMode] = useState('list') // list | create | edit
    const [selectedGroup, setSelectedGroup] = useState(null)
    const [groupName, setGroupName] = useState('')
    const [guruId, setGuruId] = useState('')
    const [mudabbirIds, setMudabbirIds] = useState([])
    const [studentIds, setStudentIds] = useState([])
    const [searchMudabbir, setSearchMudabbir] = useState('')
    const [searchStudent, setSearchStudent] = useState('')
    const [saving, setSaving] = useState(false)

    const guruList = teacherList.filter(t => t.original?.type === 'guru' || t.original?.type === 'pengabdian')
    const mudabbirPool = studentList // all students can be mudabbir candidates
    const filteredMudabbir = mudabbirPool.filter(s => !studentIds.includes(s.id) && s.name?.toLowerCase().includes(searchMudabbir.toLowerCase()))
    const filteredStudents = studentList.filter(s => !mudabbirIds.includes(s.id) && s.name?.toLowerCase().includes(searchStudent.toLowerCase()))

    const startCreate = () => { setMode('create'); setGroupName(''); setGuruId(''); setMudabbirIds([]); setStudentIds([]) }
    const startEdit = (g) => {
        setMode('edit'); setSelectedGroup(g)
        setGroupName(g.name); setGuruId(g.guru_id)
        setMudabbirIds((g.members || []).filter(m => m.role === 'mudabbir').map(m => m.student_id))
        setStudentIds((g.members || []).filter(m => m.role === 'student').map(m => m.student_id))
    }

    const handleSave = async () => {
        if (!groupName.trim() || !guruId) { addToast('Nama kelompok dan guru wajib diisi', 'warning'); return }
        setSaving(true)
        try {
            let groupId = selectedGroup?.id
            if (mode === 'create') {
                const { data, error } = await supabase.from('wafa_groups').insert({ name: groupName.trim(), guru_id: guruId }).select().single()
                if (error) throw error
                groupId = data.id
            } else {
                const { error } = await supabase.from('wafa_groups').update({ name: groupName.trim(), guru_id: guruId }).eq('id', groupId)
                if (error) throw error
            }
            // Upsert members
            const allMembers = [
                ...mudabbirIds.map(sid => ({ group_id: groupId, student_id: sid, role: 'mudabbir' })),
                ...studentIds.map(sid => ({ group_id: groupId, student_id: sid, role: 'student' })),
            ]
            // Delete existing members, then insert new
            const { error: deleteErr } = await supabase.from('wafa_group_members').delete().eq('group_id', groupId)
            if (deleteErr) throw deleteErr
            if (allMembers.length > 0) {
                const { error } = await supabase.from('wafa_group_members').insert(allMembers)
                if (error) throw error
            }
            addToast(mode === 'create' ? 'Kelompok berhasil dibuat' : 'Kelompok berhasil diupdate', 'success')
            await onRefresh()
            setMode('list')
        } catch (err) {
            addToast('Gagal menyimpan: ' + err.message, 'error')
        } finally { setSaving(false) }
    }

    const handleDelete = async (g) => {
        if (!confirm(`Hapus kelompok "${g.name}"?`)) return
        try {
            await supabase.from('wafa_group_members').delete().eq('group_id', g.id)
            await supabase.from('wafa_groups').update({ deleted_at: new Date().toISOString() }).eq('id', g.id)
            addToast('Kelompok dihapus', 'success')
            await onRefresh()
        } catch (err) { addToast('Gagal hapus', 'error') }
    }

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" onClick={onClose}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <div className="relative bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
                    <div>
                        <h2 className="text-sm font-black text-[var(--color-text)]">
                            {mode === 'list' ? 'Kelola Kelompok Bimbingan' : mode === 'create' ? 'Buat Kelompok Baru' : 'Edit Kelompok'}
                        </h2>
                        <p className="text-[10px] text-[var(--color-text-muted)] font-medium mt-0.5">
                            {mode === 'list' ? `${groups.length} kelompok terdaftar` : 'Atur guru, mudabbir & siswa'}
                        </p>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] transition-all">
                        <FontAwesomeIcon icon={faXmark} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-5">
                    {mode === 'list' ? (
                        <>
                            <button onClick={startCreate}
                                className="w-full h-10 rounded-xl border-2 border-dashed border-[var(--color-border)] text-[11px] font-black text-[var(--color-text-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 transition-all flex items-center justify-center gap-2 mb-4">
                                <FontAwesomeIcon icon={faPlus} className="text-[10px]" />
                                Buat Kelompok Baru
                            </button>
                            {groups.length === 0 ? (
                                <p className="text-center text-[11px] text-[var(--color-text-muted)] py-8">Belum ada kelompok</p>
                            ) : (
                                <div className="space-y-2">
                                    {groups.map(g => (
                                        <div key={g.id} className="flex items-center gap-3 p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/30 hover:shadow-sm transition-all">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[12px] font-black text-[var(--color-text)] truncate">{g.name}</p>
                                                <p className="text-[9px] font-bold text-[var(--color-text-muted)] mt-0.5">{g.guru_name || '—'} · {g.mudabbirCount || 0} mudabbir · {g.studentCount || 0} siswa</p>
                                            </div>
                                            <button onClick={() => startEdit(g)} className="h-7 px-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[9px] font-bold text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-all">Edit</button>
                                            <button onClick={() => handleDelete(g)} className="h-7 px-2.5 rounded-lg border border-red-500/20 bg-red-500/5 text-[9px] font-bold text-red-500 hover:bg-red-500/10 transition-all">Hapus</button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    ) : (
                        /* Create/Edit form */
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1 block">Nama Kelompok *</label>
                                <input type="text" value={groupName} onChange={e => setGroupName(e.target.value)} placeholder="Contoh: Kelompok Afrizal"
                                    className="w-full h-9 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[12px] font-bold text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1 block">Guru Pengampu *</label>
                                <select value={guruId} onChange={e => setGuruId(e.target.value)}
                                    className="w-full h-9 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[12px] font-bold text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] appearance-none">
                                    <option value="">Pilih Guru</option>
                                    {guruList.map(g => <option key={g.id} value={g.id}>{g.name} — {g.detail || 'Guru'}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1 block">Mudabbir (Siswa Hafidz)</label>
                                <input type="text" value={searchMudabbir} onChange={e => setSearchMudabbir(e.target.value)} placeholder="Cari mudabbir..."
                                    className="w-full h-8 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[11px] font-bold mb-2 focus:outline-none focus:border-[var(--color-primary)]" />
                                <div className="max-h-32 overflow-y-auto rounded-xl border border-[var(--color-border)] divide-y divide-[var(--color-border)]">
                                    {mudabbirIds.length > 0 && mudabbirIds.map(id => {
                                        const s = studentList.find(x => x.id === id)
                                        return s ? (
                                            <div key={id} className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/5">
                                                <span className="text-[10px] font-bold text-[var(--color-text)] flex-1">{s.name}</span>
                                                <button onClick={() => setMudabbirIds(prev => prev.filter(x => x !== id))} className="text-red-500 text-[9px] font-bold">Hapus</button>
                                            </div>
                                        ) : null
                                    })}
                                    {filteredMudabbir.slice(0, 10).map(s => (
                                        <button key={s.id} onClick={() => setMudabbirIds(prev => [...prev, s.id])}
                                            className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[var(--color-surface-alt)] text-left transition-colors">
                                            <span className="text-[10px] font-bold text-[var(--color-text)] flex-1">{s.name}</span>
                                            <span className="text-[9px] text-[var(--color-text-muted)]">{s.detail}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1 block">Siswa</label>
                                <input type="text" value={searchStudent} onChange={e => setSearchStudent(e.target.value)} placeholder="Cari siswa..."
                                    className="w-full h-8 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[11px] font-bold mb-2 focus:outline-none focus:border-[var(--color-primary)]" />
                                <div className="max-h-40 overflow-y-auto rounded-xl border border-[var(--color-border)] divide-y divide-[var(--color-border)]">
                                    {studentIds.length > 0 && studentIds.map(id => {
                                        const s = studentList.find(x => x.id === id)
                                        return s ? (
                                            <div key={id} className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500/5">
                                                <span className="text-[10px] font-bold text-[var(--color-text)] flex-1">{s.name}</span>
                                                <button onClick={() => setStudentIds(prev => prev.filter(x => x !== id))} className="text-red-500 text-[9px] font-bold">Hapus</button>
                                            </div>
                                        ) : null
                                    })}
                                    {filteredStudents.slice(0, 10).map(s => (
                                        <button key={s.id} onClick={() => setStudentIds(prev => [...prev, s.id])}
                                            className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[var(--color-surface-alt)] text-left transition-colors">
                                            <span className="text-[10px] font-bold text-[var(--color-text)] flex-1">{s.name}</span>
                                            <span className="text-[9px] text-[var(--color-text-muted)]">{s.detail}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-[var(--color-border)]">
                    {mode !== 'list' && (
                        <button onClick={() => setMode('list')} className="h-8 px-3 rounded-xl border border-[var(--color-border)] text-[10px] font-black text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-all">
                            Kembali
                        </button>
                    )}
                    {mode !== 'list' && (
                        <button onClick={handleSave} disabled={saving}
                            className="h-8 px-4 rounded-xl bg-[var(--color-primary)] text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-[var(--color-primary)]/20 disabled:opacity-60">
                            {saving ? <FontAwesomeIcon icon={faSpinner} className="animate-spin" /> : <FontAwesomeIcon icon={faSave} />}
                            Simpan
                        </button>
                    )}
                </div>
            </div>
        </div>,
        document.body
    )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function HalaqahPage() {
    const { addToast } = useToast()
    const { dir } = useLanguage()
    const { profile } = useAuth()
    const now = new Date()

    // Tab
    const [activeTab, setActiveTab] = useState('teacher')
    const [activeSession, setActiveSession] = useState('mengaji')

    // Date
    const [tahun, setTahun] = useState(now.getFullYear())
    const [bulan, setBulan] = useState(now.getMonth() + 1)

    // Data per tab
    const [classList, setClassList] = useState([])
    const [filterClassId, setFilterClassId] = useState('')
    const [teacherList, setTeacherList] = useState([])
    const [mentorList, setMentorList] = useState([])
    const [studentList, setStudentList] = useState([])

    // Group data for Siswa tab
    const [groups, setGroups] = useState([])
    const [selectedGroupId, setSelectedGroupId] = useState(null)
    const [showGroupModal, setShowGroupModal] = useState(false)

    // Data maps: { [itemId]: { [day]: 'H'|'S'|'I'|'A'|'P' } }
    const [teacherData, setTeacherData] = useState({})
    const [mentorData, setMentorData] = useState({})
    const [studentData, setStudentData] = useState({})
    const [originalTeacherData, setOriginalTeacherData] = useState({})
    const [originalMentorData, setOriginalMentorData] = useState({})
    const [originalStudentData, setOriginalStudentData] = useState({})

    // Notes maps
    const [teacherNotes, setTeacherNotes] = useState({})
    const [mentorNotes, setMentorNotes] = useState({})
    const [studentNotes, setStudentNotes] = useState({})

    // UI state
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [isDirty, setIsDirty] = useState(false)
    const [isOnline, setIsOnline] = useState(() => typeof navigator !== 'undefined' ? navigator.onLine : true)
    const [searchRaw, setSearchRaw] = useState('')
    const search = useDeferredValue(searchRaw)
    const [hideWeekend, setHideWeekend] = useState(false)
    const [mobileView, setMobileView] = useState(() => localStorage.getItem('wafa_halaqah_mobile_view') || 'table')
    const [noteTarget, setNoteTarget] = useState(null)
    const [showImport, setShowImport] = useState(false)
    const [showAlertConfig, setShowAlertConfig] = useState(false)
    const [confirmModal, setConfirmModal] = useState(null)
    const [colFillTarget, setColFillTarget] = useState(null)
    const [rowFillTarget, setRowFillTarget] = useState(null)

    // Pagination
    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(25)
    const [jumpPage, setJumpPage] = useState('')

    // Undo/redo
    const historyRef = useRef([])
    const historyIdxRef = useRef(-1)
    const [canUndo, setCanUndo] = useState(false)
    const [canRedo, setCanRedo] = useState(false)

    // Drag-to-fill
    const dragRef = useRef({ active: false, status: null })
    const [, startDragTransition] = useTransition()

    // Alert threshold
    const [alertThreshold, setAlertThreshold] = useState(() => {
        try { return JSON.parse(localStorage.getItem('wafa_alert_threshold') || 'null') || { alpa: 3, hadirPct: 75 } }
        catch { return { alpa: 3, hadirPct: 75 } }
    })

    // Focused cell for keyboard nav
    const [focusedCell, setFocusedCell] = useState(null)
    const filteredItemsRef = useRef([])
    const searchInputRef = useRef(null)
    const todayColRef = useRef(null)
    const draftTimerRef = useRef(null)
    const handleSaveRef = useRef(null)

    // Today
    const todayRef = useRef({ d: now.getDate(), m: now.getMonth() + 1, y: now.getFullYear() })
    const todayDate = (bulan === todayRef.current.m && tahun === todayRef.current.y) ? todayRef.current.d : null

    // Derived
    const daysInMonth = useMemo(() => getDaysInMonth(tahun, bulan), [tahun, bulan])

    const dayMeta = useMemo(() => Array.from({ length: 31 }, (_, i) => {
        const d = i + 1
        return {
            d,
            invalid: d > daysInMonth,
            weekend: d <= daysInMonth && isWeekend(tahun, bulan, d),
            dow: d <= daysInMonth ? getDow(tahun, bulan, d) : null,
        }
    }), [daysInMonth, tahun, bulan])

    const visibleDays = useMemo(() =>
        dayMeta.filter(dm => !dm.invalid && !(hideWeekend && dm.weekend)).map(dm => dm.d),
        [dayMeta, hideWeekend]
    )

    // Current tab data
    const currentTab = TABS.find(t => t.key === activeTab)
    const currentList = useMemo(() => activeTab === 'teacher' ? teacherList : activeTab === 'mentor' ? mentorList : studentList, [activeTab, teacherList, mentorList, studentList])
    const currentData = useMemo(() => activeTab === 'teacher' ? teacherData : activeTab === 'mentor' ? mentorData : studentData, [activeTab, teacherData, mentorData, studentData])
    const currentOriginal = useMemo(() => activeTab === 'teacher' ? originalTeacherData : activeTab === 'mentor' ? originalMentorData : originalStudentData, [activeTab, originalTeacherData, originalMentorData, originalStudentData])
    const currentNotes = useMemo(() => activeTab === 'teacher' ? teacherNotes : activeTab === 'mentor' ? mentorNotes : studentNotes, [activeTab, teacherNotes, mentorNotes, studentNotes])

    const setCurrentData = useCallback((updater) => {
        const setter = activeTab === 'teacher' ? setTeacherData : activeTab === 'mentor' ? setMentorData : setStudentData
        setter(updater)
    }, [activeTab])

    const setCurrentOriginal = useCallback((val) => {
        const setter = activeTab === 'teacher' ? setOriginalTeacherData : activeTab === 'mentor' ? setOriginalMentorData : setOriginalStudentData
        setter(val)
    }, [activeTab])

    const setCurrentNotes = useCallback((updater) => {
        const setter = activeTab === 'teacher' ? setTeacherNotes : activeTab === 'mentor' ? setMentorNotes : setStudentNotes
        setter(updater)
    }, [activeTab])

    // Filtered items
    const filteredItems = useMemo(() => {
        let list = currentList
        // Group filter — only for students tab
        if (activeTab === 'student' && selectedGroupId) {
            const group = groups.find(g => g.id === selectedGroupId)
            if (group) {
                const groupStudentIds = group.members.filter(m => m.role === 'student').map(m => m.student_id)
                list = list.filter(item => groupStudentIds.includes(item.id))
            }
        }
        // Class filter — only for students tab (when no group selected)
        else if (activeTab === 'student' && filterClassId) {
            list = list.filter(item => item.classId === filterClassId)
        }
        if (search.trim()) {
            const q = search.toLowerCase()
            list = list.filter(item => item.name?.toLowerCase().includes(q) || item.detail?.toLowerCase().includes(q))
        }
        return list
    }, [currentList, search, activeTab, filterClassId, selectedGroupId, groups])

    // Paginated items
    const totalPages = useMemo(() => Math.max(1, Math.ceil(filteredItems.length / pageSize)), [filteredItems.length, pageSize])
    const safePage = useMemo(() => Math.min(page, totalPages), [page, totalPages])
    const paginatedItems = useMemo(() => {
        if (activeTab !== 'student') return filteredItems
        const start = (safePage - 1) * pageSize
        return filteredItems.slice(start, start + pageSize)
    }, [filteredItems, safePage, pageSize, activeTab])

    filteredItemsRef.current = filteredItems

    // Display data: flattened by activeSession for all tabs
    const displayData = useMemo(() => {
        const flat = {}
        for (const [itemId, days] of Object.entries(currentData)) {
            const flatDays = {}
            for (const [day, val] of Object.entries(days)) {
                flatDays[day] = val?.[activeSession] || ''
            }
            flat[itemId] = flatDays
        }
        return flat
    }, [currentData, activeSession])

    // Write helper: always writes to raw currentData with session awareness
    const setDayValue = useCallback((prev, itemId, day, value) => {
        const curr = prev[itemId] || {}
        const dayObj = { ...(curr[day] || {}) }
        if (value === '') delete dayObj[activeSession]; else dayObj[activeSession] = value
        const newDays = { ...curr }
        if (Object.keys(dayObj).length === 0) delete newDays[day]; else newDays[day] = dayObj
        return { ...prev, [itemId]: newDays }
    }, [activeSession])

    // Column summary
    const statsList = useMemo(() => filteredItems.length > 0 ? filteredItems : currentList, [filteredItems, currentList])

    const colSummary = useMemo(() => {
        const out = {}
        for (let d = 1; d <= daysInMonth; d++) {
            let h = 0, x = 0
            for (const item of statsList) {
                const v = displayData[item.id]?.[d] || ''
                if (v === 'H') h++; else if (v) x++
            }
            out[d] = { h, x }
        }
        return out
    }, [displayData, statsList, daysInMonth])

    // Summary stats
    const summary = useMemo(() => {
        const counts = { H: 0, S: 0, I: 0, A: 0, P: 0, total: statsList.length }
        for (const item of statsList) {
            const sum = summarize(displayData[item.id] || {}, tahun, bulan)
            for (const k of STATUS_LIST) counts[k] += sum[k]
        }
        return counts
    }, [statsList, displayData, tahun, bulan])

    // Completion %
    const completionPct = useMemo(() => {
        if (!statsList.length) return 0
        let filled = 0, total = 0
        for (let d = 1; d <= daysInMonth; d++) {
            if (isWeekend(tahun, bulan, d)) continue
            total += statsList.length
            for (const item of statsList) {
                if (displayData[item.id]?.[d]) filled++
            }
        }
        return total > 0 ? Math.round((filled / total) * 100) : 0
    }, [displayData, statsList, daysInMonth, tahun, bulan])

    // ── Undo/Redo ──
    const pushHistory = useCallback((map) => {
        const MAX = 30
        const stack = historyRef.current
        const idx = historyIdxRef.current
        stack.splice(idx + 1)
        stack.push(structuredClone(map))
        if (stack.length > MAX) stack.shift()
        historyIdxRef.current = stack.length - 1
        setCanUndo(historyIdxRef.current > 0)
        setCanRedo(false)
    }, [])

    const applyUndo = useCallback(() => {
        const stack = historyRef.current
        if (historyIdxRef.current <= 0) return
        historyIdxRef.current--
        setCurrentData(structuredClone(stack[historyIdxRef.current]))
        setIsDirty(true)
        setCanUndo(historyIdxRef.current > 0)
        setCanRedo(true)
    }, [setCurrentData])

    const applyRedo = useCallback(() => {
        const stack = historyRef.current
        if (historyIdxRef.current >= stack.length - 1) return
        historyIdxRef.current++
        setCurrentData(structuredClone(stack[historyIdxRef.current]))
        setIsDirty(true)
        setCanUndo(true)
        setCanRedo(historyIdxRef.current < stack.length - 1)
    }, [setCurrentData])

    // ── Fetch groups for Siswa tab ──
    const fetchGroups = useCallback(async () => {
        try {
            const { data: groupsData, error: groupsErr } = await supabase
                .from('wafa_groups')
                .select('id, name, guru_id, created_at, teachers:guru_id(name)')
                .is('deleted_at', null)
                .order('name')
            if (groupsErr) throw groupsErr

            const { data: membersData } = await supabase
                .from('wafa_group_members')
                .select('group_id, student_id, role')

            const membersByGroup = {}
            for (const m of membersData || []) {
                if (!membersByGroup[m.group_id]) membersByGroup[m.group_id] = []
                membersByGroup[m.group_id].push(m)
            }

            const enriched = (groupsData || []).map(g => ({
                ...g,
                guru_name: g.teachers?.name || null,
                members: membersByGroup[g.id] || [],
                mudabbirCount: (membersByGroup[g.id] || []).filter(m => m.role === 'mudabbir').length,
                studentCount: (membersByGroup[g.id] || []).filter(m => m.role === 'student').length,
            }))

            setGroups(enriched)
        } catch (err) {
            console.error('Fetch groups error:', err)
        }
    }, [])

    // ── Fetch data ──
    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            // Fetch classes
            const { data: classesData } = await supabase.from('classes').select('id, name').order('name')
            if (classesData) setClassList(classesData)

            // Fetch teachers
            const { data: teachers, error: teacherErr } = await supabase.from('teachers')
                .select('id, name, subject, status, type, gender')
                .is('deleted_at', null).eq('status', 'active').order('name')
            if (teacherErr) console.error('Teacher fetch error:', teacherErr)

            // Fetch students — match useStudentsCore pattern exactly
            const { data: students, error: studentErr } = await supabase.from('students')
                .select('*, classes(name)')
                .is('deleted_at', null)
                .order('name')
            if (studentErr) console.error('Student fetch error:', studentErr)

            // Split teachers
            const guruList = (teachers || []).filter(t => !t.type || t.type === 'guru' || t.type === 'pengabdian')

            setTeacherList(guruList.map(t => ({ id: t.id, name: t.name, detail: t.subject || 'Guru', gender: t.gender, nisn: null, original: t })))
            setStudentList((students || []).map(s => ({ id: s.id, name: s.name, detail: s.classes?.name || s.nisn || 'Santri', nisn: s.nisn, gender: s.gender, classId: s.class_id, original: s })))

            // Fetch group members to find mudabbir (students assigned as mudabbir)
            const { data: mudabbirMembers } = await supabase
                .from('wafa_group_members')
                .select('student_id, group_id, wafa_groups(name)')
                .eq('role', 'mudabbir')

            const mudabbirById = {}
            for (const m of mudabbirMembers || []) {
                if (!mudabbirById[m.student_id]) {
                    const student = (students || []).find(s => s.id === m.student_id)
                    if (student) {
                        mudabbirById[m.student_id] = {
                            id: student.id,
                            name: student.name,
                            detail: m.wafa_groups?.name || student.classes?.name || 'Mudabbir',
                            gender: student.gender,
                            nisn: student.nisn,
                            original: student,
                        }
                    }
                }
            }
            const mudabbirListData = Object.values(mudabbirById)
            setMentorList(mudabbirListData)

            // Fetch attendance for each type
            const allIds = [
                ...guruList.map(t => t.id),
                ...mudabbirListData.map(m => m.id),
                ...(students || []).map(s => s.id),
            ]

            const { data: attendance } = allIds.length > 0
                ? await supabase.from('wafa_attendance')
                    .select('item_id, days')
                    .in('item_id', allIds)
                    .eq('year', tahun).eq('month', bulan)
                : { data: [] }

            const tMap = {}, mMap = {}, sMap = {}
            for (const g of guruList) {
                const ex = attendance?.find(a => a.item_id === g.id)
                tMap[g.id] = ex?.days ? { ...ex.days } : {}
            }
            for (const m of mudabbirListData) {
                const ex = attendance?.find(a => a.item_id === m.id)
                mMap[m.id] = ex?.days ? { ...ex.days } : {}
            }
            for (const s of (students || [])) {
                const ex = attendance?.find(a => a.item_id === s.id)
                sMap[s.id] = ex?.days ? { ...ex.days } : {}
            }

            setTeacherData(tMap); setOriginalTeacherData(structuredClone(tMap))
            setMentorData(mMap); setOriginalMentorData(structuredClone(mMap))
            setStudentData(sMap); setOriginalStudentData(structuredClone(sMap))

            // Fetch groups
            await fetchGroups()

            // Init history
            const currentMap = activeTab === 'teacher' ? tMap : activeTab === 'mentor' ? mMap : sMap
            historyRef.current = [structuredClone(currentMap)]
            historyIdxRef.current = 0
            setCanUndo(false); setCanRedo(false)
            setIsDirty(false)
        } catch (err) {
            console.error('Fetch error:', err)
            addToast('Gagal memuat data presensi', 'error')
        } finally {
            setLoading(false)
        }
    }, [tahun, bulan, addToast, activeTab, fetchGroups])

    // Load draft from localStorage
    useEffect(() => {
        try {
            const raw = localStorage.getItem(draftKey(activeTab, tahun, bulan, activeSession))
            if (raw) {
                const draft = JSON.parse(raw)
                if (draft?.dataMap) {
                    setCurrentData(draft.dataMap)
                    setIsDirty(true)
                }
            }
        } catch { /* ignore */ }
    }, [activeTab, tahun, bulan, activeSession, setCurrentData])

    // Initial fetch
    useEffect(() => { fetchData() }, [fetchData])

    // Title
    useEffect(() => {
        document.title = `Presensi Halaqah · ${BULAN_NAMA[bulan]} ${tahun} | Laporanmu`
        return () => { document.title = 'Laporanmu' }
    }, [bulan, tahun])

    // Online/offline
    useEffect(() => {
        const on = () => { setIsOnline(true); addToast('Koneksi kembali', 'success') }
        const off = () => { setIsOnline(false); addToast('Offline — perubahan disimpan lokal', 'warning') }
        window.addEventListener('online', on); window.addEventListener('offline', off)
        return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
    }, [addToast])

    // Beforeunload
    useEffect(() => {
        const h = (e) => { if (isDirty) { e.preventDefault(); e.returnValue = '' } }
        window.addEventListener('beforeunload', h)
        return () => window.removeEventListener('beforeunload', h)
    }, [isDirty])

    // Auto-save draft
    useEffect(() => {
        if (!isDirty) return
        if (draftTimerRef.current) clearTimeout(draftTimerRef.current)
        draftTimerRef.current = setTimeout(() => {
            try {
                const payload = JSON.stringify({ dataMap: currentData, savedAt: Date.now() })
                if (payload.length < 2 * 1024 * 1024) localStorage.setItem(draftKey(activeTab, tahun, bulan, activeSession), payload)
            } catch { /* quota */ }
        }, 500)
        return () => { if (draftTimerRef.current) clearTimeout(draftTimerRef.current) }
    }, [currentData, isDirty, activeTab, tahun, bulan, activeSession])

    // Keyboard shortcuts
    useEffect(() => {
        const h = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); handleSaveRef.current?.() }
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); applyUndo() }
            if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); applyRedo() }
        }
        window.addEventListener('keydown', h)
        return () => window.removeEventListener('keydown', h)
    }, [applyUndo, applyRedo])

    // Keyboard nav
    useEffect(() => {
        const h = (e) => {
            if (!focusedCell) return
            const { rowIdx, day } = focusedCell
            const activeDays = visibleDays
            if (!activeDays.length) return
            const dayPos = activeDays.indexOf(day)

            if (e.key === 'ArrowRight') { e.preventDefault(); setFocusedCell({ rowIdx, day: activeDays[Math.min(dayPos + 1, activeDays.length - 1)] }) }
            else if (e.key === 'ArrowLeft') { e.preventDefault(); setFocusedCell({ rowIdx, day: activeDays[Math.max(dayPos - 1, 0)] }) }
            else if (e.key === 'ArrowDown') { e.preventDefault(); setFocusedCell({ rowIdx: Math.min(rowIdx + 1, filteredItems.length - 1), day }) }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setFocusedCell({ rowIdx: Math.max(rowIdx - 1, 0), day }) }
            else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); const s = filteredItems[rowIdx]; if (s) handleCellClick(s.id, day) }
            else if (e.key === 'Escape') { setFocusedCell(null) }
        }
        window.addEventListener('keydown', h)
        return () => window.removeEventListener('keydown', h)
    }, [focusedCell, filteredItems, visibleDays])

    // ── Handlers ──
    const handleCellClick = useCallback((itemId, day) => {
        setCurrentData(prev => {
            const curr = prev[itemId] || {}
            const currentVal = curr[day]?.[activeSession] || ''
            const next = cycleStatus(currentVal)
            const updated = setDayValue(prev, itemId, day, next)
            pushHistory(updated)
            return updated
        })
        setIsDirty(true)
        haptic('light')
    }, [pushHistory, setCurrentData, activeSession, setDayValue])

    const handleCellMouseDown = useCallback((itemId, day) => {
        setFocusedCell(prev => {
            const rowIdx = filteredItemsRef.current.findIndex(s => s.id === itemId)
            return { rowIdx, day }
        })
        setCurrentData(prev => {
            const curr = prev[itemId] || {}
            const currentVal = curr[day]?.[activeSession] || ''
            const next = cycleStatus(currentVal)
            dragRef.current = { active: true, status: next }
            return setDayValue(prev, itemId, day, next)
        })
        setIsDirty(true)
    }, [setCurrentData, activeSession, setDayValue])

    const handleCellMouseEnter = useCallback((itemId, day) => {
        if (!dragRef.current.active) return
        const status = dragRef.current.status
        startDragTransition(() => {
            setCurrentData(prev => {
                const curr = prev[itemId] || {}
                const currentVal = curr[day]?.[activeSession] || ''
                if (currentVal === status) return prev
                return setDayValue(prev, itemId, day, status)
            })
        })
        setIsDirty(true)
    }, [startDragTransition, setCurrentData, activeSession, setDayValue])

    // Mouseup commit
    useEffect(() => {
        const stop = () => {
            if (dragRef.current.active) {
                dragRef.current = { active: false, status: null }
                setCurrentData(prev => { pushHistory(prev); return prev })
            }
        }
        window.addEventListener('mouseup', stop)
        window.addEventListener('touchend', stop)
        return () => { window.removeEventListener('mouseup', stop); window.removeEventListener('touchend', stop) }
    }, [pushHistory, setCurrentData])

    const handleColFill = useCallback((day, status) => {
        const targetItems = filteredItems.length > 0 ? filteredItems : currentList
        setCurrentData(prev => {
            let next = prev
            for (const item of targetItems) {
                next = setDayValue(next, item.id, day, status)
            }
            pushHistory(next)
            return next
        })
        setIsDirty(true)
        logAudit({ action: 'UPDATE', source: 'SYSTEM', tableName: `wafa_${activeTab}_attendance`, newData: { intent: 'column_fill', day, status, count: targetItems.length } })
    }, [filteredItems, currentList, pushHistory, setCurrentData, activeTab, setDayValue])

    const handleColClear = useCallback((day) => {
        const targetItems = filteredItems.length > 0 ? filteredItems : currentList
        setCurrentData(prev => {
            let next = prev
            for (const item of targetItems) {
                next = setDayValue(next, item.id, day, '')
            }
            pushHistory(next)
            return next
        })
        setIsDirty(true)
    }, [filteredItems, currentList, pushHistory, setCurrentData, setDayValue])

    const handleRowFill = useCallback((itemId, status) => {
        setCurrentData(prev => {
            const newDays = {}
            for (let d = 1; d <= daysInMonth; d++) {
                if (!isWeekend(tahun, bulan, d)) {
                    if (status !== '') {
                        const existing = prev[itemId]?.[d] || {}
                        newDays[d] = { ...existing, [activeSession]: status }
                    }
                } else {
                    if (prev[itemId]?.[d]) newDays[d] = prev[itemId][d]
                }
            }
            const updated = { ...prev, [itemId]: newDays }
            pushHistory(updated)
            return updated
        })
        setIsDirty(true)
    }, [daysInMonth, tahun, bulan, pushHistory, setCurrentData, activeSession])

    const handleRowClear = useCallback((itemId) => {
        setCurrentData(prev => {
            const next = { ...prev }
            const curr = { ...(next[itemId] || {}) }
            for (const dayKey of Object.keys(curr)) {
                const dayObj = { ...(curr[dayKey] || {}) }
                delete dayObj[activeSession]
                if (Object.keys(dayObj).length === 0) delete curr[dayKey]; else curr[dayKey] = dayObj
            }
            next[itemId] = curr
            pushHistory(next)
            return next
        })
        setIsDirty(true)
    }, [pushHistory, setCurrentData, activeSession])

    const handleReset = useCallback(() => {
        setCurrentData(structuredClone(currentOriginal))
        setIsDirty(false)
        try { localStorage.removeItem(draftKey(activeTab, tahun, bulan, activeSession)) } catch { }
    }, [currentOriginal, setCurrentData, activeTab, tahun, bulan, activeSession])

    const handleSave = useCallback(async () => {
        if (saving || !isDirty) return
        if (!isOnline) {
            addToast('Tidak ada koneksi — data tetap ditandai belum disimpan', 'warning')
            haptic('error')
            return
        }
        const prevOriginal = structuredClone(currentOriginal)
        setSaving(true)
        const upserts = currentList.map(item => ({
            item_id: item.id, tab: activeTab, year: tahun, month: bulan,
            days: currentData[item.id] || {}, updated_by: profile?.id ?? null,
        }))
        const { error } = await supabase.from('wafa_attendance')
            .upsert(upserts, { onConflict: 'item_id,tab,year,month' })
        setSaving(false)
        if (error) {
            setCurrentOriginal(prevOriginal); setIsDirty(true)
            addToast('Gagal menyimpan: ' + error.message, 'error')
            haptic('error')
        } else {
            setCurrentOriginal(structuredClone(currentData)); setIsDirty(false)
            try { localStorage.removeItem(draftKey(activeTab, tahun, bulan, activeSession)) } catch { }
            addToast(`Absensi ${BULAN_NAMA[bulan]} ${tahun} tersimpan ✓`, 'success')
            await logAudit({ action: 'UPDATE', source: 'SYSTEM', tableName: `wafa_${activeTab}_attendance`, newData: { year: tahun, month: bulan, count: currentList.length } })
            haptic('success')
        }
    }, [saving, isDirty, currentList, currentData, currentOriginal, tahun, bulan, activeTab, profile, isOnline, addToast, setCurrentOriginal])

    useEffect(() => { handleSaveRef.current = handleSave }, [handleSave])

    const prevBulan = useCallback(() => {
        const doNav = () => {
            if (bulan === 1) { setTahun(t => t - 1); setBulan(12) } else setBulan(b => b - 1)
            setIsDirty(false)
        }
        if (isDirty) {
            setConfirmModal({
                message: 'Perubahan yang belum disimpan akan hilang jika pindah bulan.',
                confirmLabel: 'Pindah Bulan',
                onConfirm: () => { setConfirmModal(null); doNav() },
            })
            return
        }
        doNav()
    }, [bulan, isDirty])

    const nextBulan = useCallback(() => {
        const doNav = () => {
            if (bulan === 12) { setTahun(t => t + 1); setBulan(1) } else setBulan(b => b + 1)
            setIsDirty(false)
        }
        if (isDirty) {
            setConfirmModal({
                message: 'Perubahan yang belum disimpan akan hilang jika pindah bulan.',
                confirmLabel: 'Pindah Bulan',
                onConfirm: () => { setConfirmModal(null); doNav() },
            })
            return
        }
        doNav()
    }, [bulan, isDirty])

    const handleImport = useCallback((matched) => {
        setCurrentData(prev => {
            const next = { ...prev }
            for (const { sid, days } of matched) {
                const curr = { ...(next[sid] || {}) }
                for (const [day, val] of Object.entries(days)) {
                    const dayObj = { ...(curr[day] || {}) }
                    dayObj[activeSession] = val
                    curr[day] = dayObj
                }
                next[sid] = curr
            }
            pushHistory(next)
            return next
        })
        setIsDirty(true)
        addToast(`${matched.length} data diimport ✓`, 'success')
    }, [pushHistory, addToast, setCurrentData, activeSession])

    const handleSaveNote = useCallback((itemId, text) => {
        setCurrentNotes(prev => {
            const next = text ? { ...prev, [itemId]: text } : Object.fromEntries(Object.entries({ ...prev }).filter(([k]) => k !== itemId))
            try { localStorage.setItem(`wafa_notes_${activeTab}_${tahun}_${bulan}`, JSON.stringify(next)) } catch { }
            return next
        })
    }, [activeTab, tahun, bulan, setCurrentNotes])

    const handleSaveThreshold = useCallback((val) => {
        setAlertThreshold(val)
        try { localStorage.setItem('wafa_alert_threshold', JSON.stringify(val)) } catch { }
        addToast('Ambang batas alert disimpan ✓', 'success')
    }, [addToast])

    const handleRowFillClick = useCallback((e, item) => {
        const rect = e.currentTarget.getBoundingClientRect()
        setRowFillTarget({ item, x: rect.right, y: rect.bottom })
    }, [])

    const handleNoteClick = useCallback((e, item) => {
        const rect = e.currentTarget.getBoundingClientRect()
        setNoteTarget({ item, x: rect.left, y: rect.bottom })
    }, [])

    const handleTabChange = useCallback((newTab) => {
        if (isDirty) {
            setConfirmModal({
                message: 'Perubahan yang belum disimpan akan hilang jika ganti tab.',
                confirmLabel: 'Ganti Tab',
                onConfirm: () => { setActiveTab(newTab); setActiveSession('mengaji'); setSelectedGroupId(null); setSearchRaw(''); setFilterClassId(''); setPage(1); setIsDirty(false); setConfirmModal(null) },
            })
            return
        }
        setActiveTab(newTab); setActiveSession('mengaji'); setSelectedGroupId(null); setSearchRaw(''); setFilterClassId(''); setPage(1); setIsDirty(false)
    }, [isDirty])

    const handleSessionChange = useCallback((newSession) => {
        if (newSession === activeSession) return
        if (isDirty) {
            setConfirmModal({
                message: 'Perubahan yang belum disimpan akan hilang jika ganti sesi.',
                confirmLabel: 'Ganti Sesi',
                onConfirm: () => { setActiveSession(newSession); setIsDirty(false); setConfirmModal(null) },
            })
            return
        }
        setActiveSession(newSession)
    }, [isDirty, activeSession])

    const handleScrollToToday = useCallback(() => {
        if (todayColRef.current) {
            todayColRef.current.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
        }
    }, [])

    // ── Render ──
    return (
        <DashboardLayout>
            <div className="p-4 md:p-6 max-w-[1800px] mx-auto">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                        <Breadcrumb items={['Dashboard', 'Akademik', 'Presensi Halaqah']} />
                        <h1 className="text-2xl font-black font-heading tracking-tight text-[var(--color-text)]">Presensi Halaqah</h1>
                        <p className="text-[var(--color-text-muted)] text-[11px] mt-0.5 font-medium opacity-70">
                            <span className="sm:hidden">Input & rekap absensi guru, mentor & siswa per bulan.</span>
                            <span className="hidden sm:inline">Klik sel untuk ganti status · Tahan & geser untuk isi banyak · Klik nama/tanggal untuk isi cepat</span>
                        </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        {!isOnline && (
                            <div className="flex items-center gap-1.5 text-[10px] font-black px-2 py-1 rounded-full border text-red-500 border-red-500/20 bg-red-500/5">
                                <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                <span className="hidden sm:inline">Offline</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Tab bar — data source tabs */}
                <div className="flex items-center bg-[var(--color-surface-alt)] rounded-xl border border-[var(--color-border)] p-0.5 mb-3 w-full sm:w-fit overflow-x-auto">
                    {TABS.map(tab => {
                        const count = tab.key === 'teacher' ? teacherList.length : tab.key === 'mentor' ? mentorList.length : (filterClassId ? studentList.filter(s => s.classId === filterClassId).length : studentList.length)
                        return (
                            <button key={tab.key} onClick={() => handleTabChange(tab.key)}
                                className={`h-8 px-3 sm:px-4 rounded-xl text-[11px] font-black flex items-center gap-1.5 transition-all whitespace-nowrap ${activeTab === tab.key
                                    ? 'bg-[var(--color-surface)] text-[var(--color-text)] shadow-sm'
                                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}>
                                <FontAwesomeIcon icon={tab.icon} className="text-[10px] shrink-0" />
                                <span className="hidden xs:inline">{tab.label}</span>
                                <span className="xs:hidden">{tab.label.split(' ')[0]}</span>
                                <span className="text-[9px] opacity-50">({count})</span>
                            </button>
                        )
                    })}
                </div>

                {/* Session tabs */}
                <div className="flex items-center bg-[var(--color-surface-alt)] rounded-xl border border-[var(--color-border)] p-0.5 mb-3 w-full sm:w-fit overflow-x-auto">
                    {SESSIONS.map(sess => (
                        <button key={sess.key} onClick={() => handleSessionChange(sess.key)}
                            className={`h-8 px-3 sm:px-4 rounded-xl text-[11px] font-black flex items-center gap-1.5 transition-all whitespace-nowrap flex-1 sm:flex-none justify-center ${activeSession === sess.key
                                ? 'bg-[var(--color-surface)] text-[var(--color-text)] shadow-sm'
                                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}>
                            <FontAwesomeIcon icon={sess.icon} className="text-[10px] shrink-0" />
                            <span>{sess.label.split(' ')[0]}</span>
                            <span className="text-[9px] opacity-40 font-medium hidden sm:inline">{sess.time}</span>
                        </button>
                    ))}
                </div>

                {/* Group cards — only for Siswa tab */}
                {activeTab === 'student' && (
                    <div className="mb-5">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-[11px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Kelompok Bimbingan</h3>
                            <button onClick={() => setShowGroupModal(true)}
                                className="h-7 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[10px] font-black text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-border)] active:scale-95 transition-all flex items-center gap-1.5">
                                <FontAwesomeIcon icon={faPlus} className="text-[9px]" />
                                Kelola Kelompok
                            </button>
                        </div>
                        {groups.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-alt)]/30 p-6 text-center">
                                <FontAwesomeIcon icon={faUsers} className="text-2xl text-[var(--color-text-muted)] opacity-30 mb-2" />
                                <p className="text-[11px] text-[var(--color-text-muted)] font-medium">Belum ada kelompok. Buat kelompok untuk mengelompokkan siswa per guru pengampu.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                                {groups.map(g => (
                                    <button key={g.id} onClick={() => { setSelectedGroupId(selectedGroupId === g.id ? null : g.id); setPage(1) }}
                                        className={`text-left rounded-xl border p-3 transition-all ${selectedGroupId === g.id
                                            ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 shadow-md shadow-[var(--color-primary)]/10'
                                            : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:shadow-md'}`}>
                                        <p className="text-[12px] font-black text-[var(--color-text)] truncate">{g.name}</p>
                                        <p className="text-[9px] font-bold text-[var(--color-text-muted)] mt-0.5 truncate">{g.guru_name || 'Guru'}</p>
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className="text-[9px] font-bold text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded">{g.mudabbirCount} mudabbir</span>
                                            <span className="text-[9px] font-bold text-indigo-600 bg-indigo-500/10 px-1.5 py-0.5 rounded">{g.studentCount} siswa</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Controls bar */}
                <div className="flex flex-col gap-2 mb-4">
                    {/* Row 1: Month nav + Search + Alert config */}
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 shrink-0">
                            <button onClick={prevBulan}
                                className="h-8 w-8 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] transition-all active:scale-95">
                                <FontAwesomeIcon icon={faChevronLeft} className="text-[10px]" />
                            </button>
                            <div className="flex items-center gap-1 px-1">
                                <FontAwesomeIcon icon={faCalendarDays} className="text-[var(--color-primary)] text-[11px]" />
                                <span className="text-[12px] font-black text-[var(--color-text)]">{BULAN_NAMA[bulan]} {tahun}</span>
                            </div>
                            <button onClick={nextBulan}
                                className="h-8 w-8 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] transition-all active:scale-95">
                                <FontAwesomeIcon icon={faChevronRight} className="text-[10px]" />
                            </button>
                        </div>

                        {/* Class filter — only for Siswa tab */}
                        {activeTab === 'student' && (
                            <div className="relative shrink-0">
                                <select value={filterClassId} onChange={e => { setFilterClassId(e.target.value); setPage(1) }}
                                    className="h-8 pl-2.5 pr-7 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[11px] font-bold text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] transition-colors appearance-none cursor-pointer">
                                    <option value="">Semua Kelas</option>
                                    {classList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                                <FontAwesomeIcon icon={faChevronDown} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[8px] text-[var(--color-text-muted)] pointer-events-none" />
                            </div>
                        )}

                        <div className="flex-1 relative min-w-0">
                            <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-[var(--color-text-muted)]" />
                            <input ref={searchInputRef} type="text" value={searchRaw} onChange={e => setSearchRaw(e.target.value)}
                                placeholder={`Cari ${currentTab?.label?.toLowerCase() || ''}...`}
                                className="w-full h-8 pl-8 pr-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[11px] font-semibold text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 focus:border-[var(--color-primary)] transition-all" />
                        </div>

                        <button onClick={() => setShowAlertConfig(true)}
                            className="h-8 w-8 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] flex items-center justify-center shrink-0 hover:bg-[var(--color-border)] hover:text-[var(--color-text)] active:scale-95 transition-all"
                            title="Pengaturan Alert">
                            <FontAwesomeIcon icon={faGear} className="text-[10px]" />
                        </button>
                    </div>

                    {/* Row 2: Action buttons */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <button onClick={handleScrollToToday}
                            className="h-7 px-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[10px] font-black text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-border)] active:scale-95 transition-all flex items-center gap-1 shrink-0">
                            <FontAwesomeIcon icon={faCrosshairs} className="text-[8px]" />
                            <span className="hidden sm:inline">Hari Ini</span>
                            <span className="sm:hidden">Hari</span>
                        </button>

                        <button onClick={() => setHideWeekend(v => !v)}
                            className={`h-7 px-2.5 rounded-lg border text-[10px] font-black transition-all flex items-center gap-1 shrink-0 ${hideWeekend
                                ? 'border-[var(--color-primary)]/30 bg-[var(--color-primary)]/8 text-[var(--color-primary)]'
                                : 'border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}>
                            <FontAwesomeIcon icon={hideWeekend ? faEyeSlash : faEye} className="text-[8px]" />
                            <span className="hidden sm:inline">{hideWeekend ? 'Tampilkan' : 'Sembunyikan'} Weekend</span>
                            <span className="sm:hidden">WE</span>
                        </button>

                        <MassActionDropdown
                            items={filteredItems.length > 0 ? filteredItems : currentList} dataMap={displayData} setDataMap={setCurrentData}
                            tahun={tahun} bulan={bulan} daysInMonth={daysInMonth}
                            onDirty={() => setIsDirty(true)} addToast={addToast} tabKey={activeTab} activeSession={activeSession} />

                        <div className="flex gap-1 p-0.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shrink-0">
                            {[{ key: 'table', icon: faTableList }, { key: 'card', icon: faBorderAll }, { key: 'list', icon: faList }].map(v => (
                                <button key={v.key} onClick={() => { setMobileView(v.key); localStorage.setItem('wafa_halaqah_mobile_view', v.key) }}
                                    className={`w-7 h-7 rounded-md flex items-center justify-center transition-all ${mobileView === v.key ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}>
                                    <FontAwesomeIcon icon={v.icon} className="text-[10px]" />
                                </button>
                            ))}
                        </div>

                        <div className="flex gap-0.5 shrink-0">
                            <button onClick={applyUndo} disabled={!canUndo}
                                className="h-7 w-7 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] flex items-center justify-center text-[var(--color-text-muted)] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                title="Undo">
                                <FontAwesomeIcon icon={faRotateLeft} className="text-[8px]" />
                            </button>
                            <button onClick={applyRedo} disabled={!canRedo}
                                className="h-7 w-7 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] flex items-center justify-center text-[var(--color-text-muted)] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                title="Redo">
                                <FontAwesomeIcon icon={faRotateRight} className="text-[8px]" />
                            </button>
                        </div>

                        <button onClick={() => setShowImport(true)}
                            className="h-7 px-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[10px] font-black text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-border)] active:scale-95 transition-all flex items-center gap-1 shrink-0">
                            <FontAwesomeIcon icon={faFileImport} className="text-[8px]" />
                            <span className="hidden sm:inline">Import</span>
                        </button>
                    </div>
                </div>

                {/* Summary cards */}
                <div className="grid grid-cols-3 sm:grid-cols-7 gap-2 mb-6">
                    {[
                        { key: 'total', label: 'Total', value: summary.total, icon: faClipboardCheck, color: 'from-slate-500 to-slate-600' },
                        { key: 'H', label: 'Hadir', value: summary.H, icon: faCheck, color: 'from-emerald-500 to-emerald-600' },
                        { key: 'S', label: 'Sakit', value: summary.S, icon: faHeartPulse, color: 'from-amber-500 to-amber-600' },
                        { key: 'I', label: 'Izin', value: summary.I, icon: faDoorOpen, color: 'from-blue-500 to-blue-600' },
                        { key: 'A', label: 'Alpa', value: summary.A, icon: faCircleXmark, color: 'from-red-500 to-red-600' },
                        { key: 'P', label: 'Pulang', value: summary.P, icon: faDoorOpen, color: 'from-purple-500 to-purple-600' },
                        { key: 'pct', label: 'Completion', value: `${completionPct}%`, icon: faChartSimple, color: 'from-indigo-500 to-indigo-600' },
                    ].map(card => (
                        <div key={card.key} className="relative overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 group hover:shadow-md transition-all">
                            <div className={`absolute inset-0 bg-gradient-to-br ${card.color} opacity-[0.03] group-hover:opacity-[0.06] transition-opacity`} />
                            <div className="relative">
                                <FontAwesomeIcon icon={card.icon} className={`w-3.5 h-3.5 bg-gradient-to-br ${card.color} bg-clip-text`} style={{ color: 'transparent', WebkitBackgroundClip: 'text' }} />
                                <p className="text-[11px] font-bold text-[var(--color-text-muted)] mt-1">{card.label}</p>
                                <p className="text-lg font-black text-[var(--color-text)] leading-none mt-0.5">{card.value}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Content */}
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="flex flex-col items-center gap-3">
                            <FontAwesomeIcon icon={faSpinner} className="animate-spin text-2xl text-[var(--color-primary)]" />
                            <p className="text-[12px] text-[var(--color-text-muted)] font-medium">Memuat data presensi...</p>
                        </div>
                    </div>
                ) : filteredItems.length === 0 ? (
                    <EmptyState icon={faClipboardCheck} title="Belum Ada Data"
                        description={`Tidak ada data ${currentTab?.label?.toLowerCase() || ''} untuk ditampilkan.`} />
                ) : mobileView === 'card' ? (
                    <MobileCardView items={activeTab === 'student' ? paginatedItems : filteredItems} dataMap={displayData} tahun={tahun} bulan={bulan}
                        daysInMonth={daysInMonth} todayDate={todayDate} onCellClick={handleCellClick}
                        notesMap={currentNotes} onNoteClick={handleNoteClick} loadingData={loading}
                        alpaThreshold={alertThreshold.alpa} hadirThreshold={alertThreshold.hadirPct} />
                ) : mobileView === 'list' ? (
                    <MobileListView items={activeTab === 'student' ? paginatedItems : filteredItems} dataMap={displayData} tahun={tahun} bulan={bulan}
                        daysInMonth={daysInMonth} todayDate={todayDate} onCellClick={handleCellClick}
                        notesMap={currentNotes} onNoteClick={handleNoteClick} loadingData={loading}
                        alpaThreshold={alertThreshold.alpa} hadirThreshold={alertThreshold.hadirPct} />
                ) : (
                    /* Desktop table — monthly calendar grid */
                    <div className="overflow-x-auto rounded-xl border border-[var(--color-border)]">
                        <table style={{ borderCollapse: 'collapse', minWidth: 'max-content', width: '100%' }}>
                            <thead>
                                {/* Row 1: angka tanggal */}
                                <tr style={{ backgroundColor: 'var(--color-surface-alt)' }}>
                                    <th rowSpan={2} style={{
                                        position: 'sticky', left: 0, zIndex: 6,
                                        width: W_NO, minWidth: W_NO,
                                        backgroundColor: 'var(--color-surface-alt)',
                                        borderRight: '1px solid var(--color-border)',
                                        borderBottom: '2px solid var(--color-border)',
                                        padding: '0 4px', textAlign: 'center',
                                        boxShadow: '2px 0 4px -2px rgba(0,0,0,0.06)',
                                        verticalAlign: 'middle',
                                    }}>
                                        <span className="text-[9px] font-black text-[var(--color-text-muted)]">#</span>
                                    </th>
                                    <th rowSpan={2} style={{
                                        position: 'sticky', left: W_NO, zIndex: 6,
                                        width: W_NAMA, minWidth: W_NAMA,
                                        backgroundColor: 'var(--color-surface-alt)',
                                        borderRight: '2px solid var(--color-border)',
                                        borderBottom: '2px solid var(--color-border)',
                                        padding: '0 12px', textAlign: 'left',
                                        boxShadow: '4px 0 10px -4px rgba(0,0,0,0.12)',
                                        verticalAlign: 'middle',
                                    }}>
                                        <span className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Nama</span>
                                    </th>
                                    {dayMeta.filter(dm => !(hideWeekend && dm.weekend) && !dm.invalid).map(({ d, weekend, dow }) => (
                                        <th key={d}
                                            ref={d === todayDate ? todayColRef : undefined}
                                            onClick={!loading && currentList.length > 0
                                                ? (e) => {
                                                    const rect = e.currentTarget.getBoundingClientRect()
                                                    setColFillTarget({ d, dow, x: rect.left, y: rect.bottom })
                                                }
                                                : undefined
                                            }
                                            style={{
                                                width: 36, minWidth: 36,
                                                padding: '8px 0', textAlign: 'center',
                                                borderBottom: '2px solid var(--color-border)',
                                                borderLeft: d === todayDate ? '1px solid #6366f130' : '1px solid var(--color-border)',
                                                backgroundColor: d === todayDate ? '#6366f108' : weekend ? '#fee2e240' : 'var(--color-surface-alt)',
                                                cursor: 'pointer', transition: 'background-color 0.2s',
                                            }}
                                            title={`Klik untuk isi semua — tgl ${d}`}
                                            className="group hover:bg-indigo-50/50">
                                            <span className="text-[11px] font-black transition-transform group-active:scale-90 inline-block"
                                                style={{ color: d === todayDate ? '#6366f1' : weekend ? '#ef4444' : 'var(--color-text-muted)' }}>
                                                {d}
                                            </span>
                                        </th>
                                    ))}
                                    {/* Summary headers — STICKY RIGHT */}
                                    {STATUS_LIST.map((s, i) => {
                                        const rightOffset = 40 + (STATUS_LIST.length - 1 - i) * 28
                                        return (
                                            <th key={s} rowSpan={2} style={{
                                                position: 'sticky', right: rightOffset, zIndex: 6,
                                                width: 28, minWidth: 28,
                                                padding: '6px 2px', textAlign: 'center',
                                                borderBottom: '2px solid var(--color-border)',
                                                borderLeft: i === 0 ? '2px solid var(--color-border)' : '1px solid var(--color-border)',
                                                background: 'var(--color-surface-alt)', verticalAlign: 'middle',
                                                boxShadow: i === 0 ? '-4px 0 8px -4px rgba(0,0,0,0.08)' : 'none'
                                            }}>
                                                <span className={`text-[9px] font-black ${STATUS_META[s].color}`}>{s}</span>
                                            </th>
                                        )
                                    })}
                                    <th rowSpan={2} style={{
                                        position: 'sticky', right: 0, zIndex: 6,
                                        width: 40, minWidth: 40,
                                        padding: '6px 2px', textAlign: 'center',
                                        borderBottom: '2px solid var(--color-border)',
                                        borderLeft: '2px solid var(--color-border)',
                                        background: 'var(--color-surface-alt)', verticalAlign: 'middle',
                                        boxShadow: '-2px 0 4px -2px rgba(0,0,0,0.06)'
                                    }}>
                                        <span className="text-[9px] font-black text-[var(--color-text-muted)]">%</span>
                                    </th>
                                </tr>

                                {/* Row 2: nama hari */}
                                <tr className="bg-[var(--color-surface-alt)]">
                                    {dayMeta.filter(dm => !(hideWeekend && dm.weekend) && !dm.invalid).map(({ d, weekend, dow }) => (
                                        <th key={d} style={{
                                            width: 36, minWidth: 36, padding: '4px 0', textAlign: 'center',
                                            borderBottom: '1px solid var(--color-border)',
                                            borderLeft: d === todayDate ? '1px solid #6366f130' : '1px solid var(--color-border)',
                                            backgroundColor: d === todayDate ? '#6366f108' : weekend ? '#fee2e240' : 'var(--color-surface-alt)',
                                        }}>
                                            <span className="text-[8px] font-bold uppercase tracking-tighter"
                                                style={{ color: weekend ? '#f87171' : 'var(--color-text-muted)', opacity: d === todayDate ? 1 : 0.6 }}>
                                                {DOW_SHORT[dow]}
                                            </span>
                                        </th>
                                    ))}
                                </tr>
                            </thead>

                            <tbody>
                                {loading
                                    ? Array.from({ length: 6 }).map((_, i) => <RowSkeleton key={i} colCount={visibleDays.length} />)
                                    : filteredItems.length === 0
                                        ? (
                                            <tr>
                                                <td colSpan={38} className="py-12 text-center">
                                                    <EmptyState icon={faMagnifyingGlass} title="Tidak ada hasil"
                                                        description={`Tidak ada yang cocok dengan "${searchRaw}"`} variant="plain" color="slate"
                                                        action={
                                                            <button onClick={() => setSearchRaw('')}
                                                                className="h-8 px-4 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[11px] font-black text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-all">
                                                                Hapus pencarian
                                                            </button>
                                                        } />
                                                </td>
                                            </tr>
                                        )
                                        : (activeTab === 'student' ? paginatedItems : filteredItems).map((item, idx) => (
                                            <Row key={item.id} item={item} idx={idx}
                                                days={displayData[item.id] || {}}
                                                tahun={tahun} bulan={bulan} daysInMonth={daysInMonth}
                                                todayDate={todayDate}
                                                onCellMouseDown={handleCellMouseDown}
                                                onCellMouseEnter={handleCellMouseEnter}
                                                onRowFill={handleRowFillClick}
                                                onNoteClick={handleNoteClick}
                                                note={currentNotes[item.id]}
                                                hideWeekend={hideWeekend}
                                                visibleDays={visibleDays}
                                                focusedDay={focusedCell?.rowIdx === idx ? focusedCell.day : null}
                                                alpaThreshold={alertThreshold.alpa}
                                                hadirThreshold={alertThreshold.hadirPct} />
                                        ))
                                }
                            </tbody>

                            {/* Footer total per kolom */}
                            {!loading && currentList.length > 0 && (
                                <tfoot>
                                    <tr className="bg-[var(--color-surface-alt)]">
                                        <td style={{ position: 'sticky', left: 0, zIndex: 4, width: W_NO, minWidth: W_NO, backgroundColor: 'var(--color-surface-alt)', borderTop: '2px solid var(--color-border)', borderRight: '1px solid var(--color-border)', boxShadow: '2px 0 4px -2px rgba(0,0,0,0.06)' }} />
                                        <td style={{ position: 'sticky', left: W_NO, zIndex: 4, width: W_NAMA, minWidth: W_NAMA, backgroundColor: 'var(--color-surface-alt)', borderTop: '2px solid var(--color-border)', borderRight: '2px solid var(--color-border)', padding: '6px 12px', boxShadow: '4px 0 8px -4px rgba(0,0,0,0.08)' }}>
                                            <span className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Total / Hari</span>
                                        </td>
                                        {dayMeta.filter(dm => !(hideWeekend && dm.weekend) && !dm.invalid).map(({ d, weekend }) => {
                                            const { h, x } = colSummary[d] || { h: 0, x: 0 }
                                            const exceedAlpa = alertThreshold.alpa != null && x >= alertThreshold.alpa
                                            return (
                                                <td key={d} style={{
                                                    width: 32, minWidth: 32, padding: '4px 0', textAlign: 'center',
                                                    borderTop: '2px solid var(--color-border)', borderLeft: '1px solid var(--color-border)',
                                                    background: exceedAlpa ? 'rgba(239,68,68,0.06)' : weekend ? 'var(--color-surface-alt)' : 'var(--color-surface-alt)',
                                                    opacity: weekend ? 0.35 : 1,
                                                }}>
                                                    {h > 0 && <span style={{ display: 'block', fontSize: 8, fontWeight: 900, color: '#059669', lineHeight: '1.2' }}>{h}</span>}
                                                    {x > 0 && <span style={{ display: 'block', fontSize: 8, fontWeight: 900, color: exceedAlpa ? '#dc2626' : '#f59e0b', lineHeight: '1.2' }}>{x}</span>}
                                                </td>
                                            )
                                        })}
                                        {STATUS_LIST.map((s, i) => {
                                            const rightOffset = 40 + (STATUS_LIST.length - 1 - i) * 28
                                            const total = statsList.reduce((acc, item) => acc + Object.values(displayData[item.id] || {}).filter(v => v === s).length, 0)
                                            return (
                                                <td key={s} style={{
                                                    position: 'sticky', right: rightOffset, zIndex: 4,
                                                    width: 28, minWidth: 28, textAlign: 'center',
                                                    borderTop: '2px solid var(--color-border)',
                                                    borderLeft: i === 0 ? '2px solid var(--color-border)' : '1px solid var(--color-border)',
                                                    background: 'var(--color-surface-alt)',
                                                    boxShadow: i === 0 ? '-4px 0 8px -4px rgba(0,0,0,0.08)' : 'none'
                                                }}>
                                                    <span className={`text-[10px] font-black ${STATUS_META[s].color} ${total === 0 ? 'opacity-20' : ''}`}>{total}</span>
                                                </td>
                                            )
                                        })}
                                        <td style={{
                                            position: 'sticky', right: 0, zIndex: 4,
                                            width: 40, minWidth: 40,
                                            borderTop: '2px solid var(--color-border)',
                                            borderLeft: '2px solid var(--color-border)',
                                            background: 'var(--color-surface-alt)',
                                            boxShadow: '-2px 0 4px -2px rgba(0,0,0,0.06)'
                                        }} />
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                )}

                {/* Pagination — only for Siswa tab */}
                {activeTab === 'student' && filteredItems.length > 0 && (
                    <div className="mt-4 rounded-2xl border border-[var(--color-border)] overflow-hidden">
                        <Pagination
                            totalRows={filteredItems.length}
                            page={safePage}
                            pageSize={pageSize}
                            setPage={setPage}
                            setPageSize={(v) => { setPageSize(v); setPage(1) }}
                            label="Siswa"
                            jumpPage={jumpPage}
                            setJumpPage={setJumpPage}
                        />
                    </div>
                )}

                {/* Footer bar */}
                {currentList.length > 0 && (
                    <div className="px-5 py-3 border-t border-[var(--color-border)] flex flex-wrap items-center justify-between gap-3 bg-[var(--color-surface-alt)]/20">
                        <p className="text-[11px] text-[var(--color-text-muted)] font-medium">
                            {filteredItems.length !== currentList.length
                                ? `${filteredItems.length} dari ${currentList.length} ${currentTab?.label?.toLowerCase() || ''}`
                                : `${currentList.length} ${currentTab?.label?.toLowerCase() || ''}`
                            } &middot; {BULAN_NAMA[bulan]} {tahun} &middot; {daysInMonth} hari
                        </p>
                        <button onClick={handleSave} disabled={saving || !isDirty}
                            className={`h-9 px-5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${isDirty
                                ? 'bg-[var(--color-primary)] hover:opacity-90 text-white shadow-lg shadow-[var(--color-primary)]/20'
                                : 'bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text-muted)] cursor-not-allowed opacity-60'}`}>
                            {saving ? <FontAwesomeIcon icon={faSpinner} className="animate-spin" /> : <FontAwesomeIcon icon={faSave} />}
                            {isDirty ? 'Simpan Perubahan' : 'Tersimpan'}
                        </button>
                    </div>
                )}

                {/* Floating save bar */}
                <div className={`fixed bottom-20 sm:bottom-6 -translate-x-1/2 z-50 transition-all duration-300 px-4 w-full sm:w-auto ${isDirty
                    ? 'opacity-100 translate-y-0 pointer-events-auto'
                    : 'opacity-0 translate-y-4 pointer-events-none'}`}
                    style={{ left: dir === 'rtl' ? 'calc(50vw - (var(--sidebar-width, 0px) / 2))' : 'calc(50vw + (var(--sidebar-width, 0px) / 2))' }}>
                    <div className="flex items-center gap-2 sm:gap-3 px-4 py-2.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur-xl shadow-2xl">
                        <FontAwesomeIcon icon={faExclamationTriangle} className="text-amber-400 shrink-0" />
                        <span className="text-[11px] text-[var(--color-text-muted)] font-medium flex-1 sm:flex-none">
                            <span className="hidden sm:inline">Ada perubahan belum disimpan</span>
                            <span className="sm:hidden">Belum disimpan</span>
                        </span>
                        <button onClick={handleReset}
                            className="h-8 px-3 rounded-xl border border-[var(--color-border)] text-[var(--color-text-muted)] text-[10px] font-black hover:text-[var(--color-text)] transition-all flex items-center gap-1.5 shrink-0">
                            <FontAwesomeIcon icon={faRotateLeft} className="text-[9px]" />
                            <span className="hidden sm:inline">Reset</span>
                        </button>
                        <button onClick={handleSave} disabled={saving}
                            className="h-8 px-4 rounded-xl bg-[var(--color-primary)] hover:opacity-90 text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-[var(--color-primary)]/20 disabled:opacity-60 shrink-0">
                            {saving ? <FontAwesomeIcon icon={faSpinner} className="animate-spin" /> : <FontAwesomeIcon icon={faSave} />}
                            Simpan
                        </button>
                    </div>
                </div>

                <div className="h-8" />

                {/* Confirm Modal */}
                {confirmModal && (
                    <ConfirmModal message={confirmModal.message} confirmLabel={confirmModal.confirmLabel}
                        onConfirm={confirmModal.onConfirm} onCancel={() => setConfirmModal(null)} />
                )}

                {/* Note popup */}
                {noteTarget && (
                    <NotePopup item={noteTarget.item} note={currentNotes[noteTarget.item.id]}
                        x={noteTarget.x} y={noteTarget.y}
                        onSave={(text) => handleSaveNote(noteTarget.item.id, text)}
                        onClose={() => setNoteTarget(null)} />
                )}

                {/* Import modal */}
                {showImport && (
                    <ImportModal itemList={filteredItems.length > 0 ? filteredItems : currentList} tahun={tahun} bulan={bulan} daysInMonth={daysInMonth}
                        onImport={handleImport} onClose={() => setShowImport(false)} />
                )}

                {/* Alert threshold modal */}
                {showAlertConfig && (
                    <AlertThresholdModal threshold={alertThreshold} onSave={handleSaveThreshold} onClose={() => setShowAlertConfig(false)} />
                )}

                {/* Group manage modal */}
                {showGroupModal && (
                    <GroupManageModal groups={groups} teacherList={currentTab?.key === 'teacher' ? teacherList : currentTab?.key === 'mentor' ? mentorList : [...teacherList, ...mentorList]} studentList={studentList} onClose={() => setShowGroupModal(false)} onRefresh={fetchGroups} addToast={addToast} />
                )}

                {/* ColFill popup */}
                {colFillTarget && (
                    <ColFillPopup day={colFillTarget.d} dow={colFillTarget.dow} x={colFillTarget.x} y={colFillTarget.y}
                        itemCount={filteredItems.length > 0 ? filteredItems.length : currentList.length}
                        onFill={(status) => handleColFill(colFillTarget.d, status)}
                        onClear={() => handleColClear(colFillTarget.d)}
                        onClose={() => setColFillTarget(null)} />
                )}

                {/* RowFill popup */}
                {rowFillTarget && (
                    <RowFillPopup item={rowFillTarget.item} x={rowFillTarget.x} y={rowFillTarget.y}
                        weekdays={countWeekdays(tahun, bulan)}
                        onFill={(status) => handleRowFill(rowFillTarget.item.id, status)}
                        onClear={() => handleRowClear(rowFillTarget.item.id)}
                        onClose={() => setRowFillTarget(null)} />
                )}
            </div>
        </DashboardLayout>
    )
}
