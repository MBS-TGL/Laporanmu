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
    faRotateRight, faBullseye, faUsers,
    faCopy, faEye, faEyeSlash, faFilter, faFileImport,
    faPrint, faBell, faStickyNote, faArrowDown, faCrosshairs,
    faArrowTrendUp, faArrowTrendDown, faGear, faUpload,
    faBorderAll, faList, faTableCells,
    faKeyboard, faMagnifyingGlassPlus, faWandMagicSparkles,
    faSearch, faPerson, faArrowRight, faLinkSlash,
    faClockRotateLeft, faLink, faClock, faMoneyBillWave
} from '@fortawesome/free-solid-svg-icons'
import DashboardLayout from '@core/layouts/DashboardLayout'
import Breadcrumb from '@shared/components/Breadcrumb'
import { EmptyState } from '@shared/components/DataDisplay'
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

// Lebar sticky cols (px) — harus konsisten antara th dan td
const W_NO = 40   // kolom #
const W_NAMA = 176  // kolom Nama

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

const draftKey = (cid, y, m) => `absensi_monthly_${cid}_${y}_${m}`

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
                className={`w-full h-full flex items-center justify-center text-[11px] font-black transition-all duration-75 hover:brightness-90 active:scale-90 ${meta ? meta.color : weekend ? 'text-[var(--color-text-muted)]/20' : 'text-transparent hover:text-[var(--color-text-muted)]/30'
                    }`}
                style={{ height: 28 }}
            >
                {status || (weekend ? '·' : '')}
            </div>
        </td>
    )
})

// ─── StudentRow ───────────────────────────────────────────────────────────────

const StudentRow = memo(({ student, idx, days, tahun, bulan, daysInMonth, todayDate, onCellMouseDown, onCellMouseEnter, onRowFill, onNoteClick, note, hideWeekend, focusedDay, alpaThreshold, hadirThreshold, visibleDays, onSetFocusedCell }) => {
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
                onClick={(e) => onRowFill(e, student)}
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
                title="Klik untuk isi baris siswa ini"
                className="group"
            >
                <div className="flex items-center justify-between gap-1">
                    <div className="min-w-0">
                        <p className="text-[12px] font-bold text-[var(--color-text)] truncate group-hover:text-[var(--color-primary)] transition-colors">{student.name}</p>
                        {alertAlpa
                            ? <p className="text-[9px] font-black text-red-500 flex items-center gap-1 mt-0.5">
                                <FontAwesomeIcon icon={faTriangleExclamation} className="text-[8px]" />Alpa {sum.A}×
                            </p>
                            : alertHadir
                                ? <p className="text-[9px] font-black text-amber-500 flex items-center gap-1 mt-0.5">
                                    <FontAwesomeIcon icon={faBell} className="text-[8px]" />Hadir {pct}%
                                </p>
                                : student.nisn
                                    ? <p className="text-[9px] text-[var(--color-text-muted)] truncate">{student.nisn}</p>
                                    : null
                        }
                    </div>
                    {/* Note button — fixed width agar nama tidak shift */}
                    <div className="w-5 shrink-0">
                        <button
                            onClick={(e) => { e.stopPropagation(); onNoteClick(e, student) }}
                            className={`w-5 h-5 rounded flex items-center justify-center transition-all ${hasNote ? 'text-amber-500' : 'opacity-0 group-hover:opacity-40 text-[var(--color-text-muted)]'}`}
                            title={hasNote ? `Catatan: ${note}` : 'Tambah catatan'}
                        >
                            <FontAwesomeIcon icon={faStickyNote} className="text-[8px]" />
                        </button>
                    </div>
                </div>
            </td>

            {/* Day cells — respects hideWeekend */}
            {(visibleDays || Array.from({ length: 31 }, (_, i) => i + 1)).map(d => (
                <DayCell
                    key={d}
                    status={d <= daysInMonth ? (days?.[d] || '') : ''}
                    weekend={d <= daysInMonth && isWeekend(tahun, bulan, d)}
                    invalid={d > daysInMonth}
                    isToday={d === todayDate}
                    isFocused={focusedDay === d}
                    onMouseDown={() => onCellMouseDown(student.id, d)}
                    onMouseEnter={() => onCellMouseEnter(student.id, d)}
                />
            ))}

            {/* Summary cols — STICKY RIGHT */}
            {STATUS_LIST.map((s, i) => {
                const rightOffset = 40 + (STATUS_LIST.length - 1 - i) * 28;
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
                );
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
    p.student === n.student && p.idx === n.idx && p.days === n.days &&
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
                const rightOffset = 40 + (STATUS_LIST.length - 1 - i) * 28;
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
                );
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

function MassActionDropdown({ studentList, dataMap, setDataMap, tahun, bulan, daysInMonth, onDirty, addToast }) {
    const [open, setOpen] = useState(false)
    const [menuPos, setMenuPos] = useState({ x: 0, y: 0 })
    const btnRef = useRef(null)
    const menuRef = useRef(null)

    useEffect(() => {
        const h = (e) => {
            if (
                btnRef.current && !btnRef.current.contains(e.target) &&
                menuRef.current && !menuRef.current.contains(e.target)
            ) setOpen(false)
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
            for (const s of studentList) {
                const days = {}
                for (let d = 1; d <= daysInMonth; d++) {
                    if (!isWeekend(tahun, bulan, d)) days[d] = statusCode
                }
                next[s.id] = days
            }
            return next
        })
        onDirty()
        setOpen(false)
        logAudit({ action: 'UPDATE', source: 'SYSTEM', tableName: 'student_attendance', newData: { intent: 'mass_fill', status: statusCode, count: studentList.length } })
        addToast(`Semua hari kerja diisi: ${STATUS_META[statusCode].label}`, 'success')
    }, [studentList, tahun, bulan, daysInMonth, setDataMap, onDirty, addToast])

    const handleReset = useCallback(() => {
        setDataMap(prev => {
            const next = { ...prev }
            for (const s of studentList) next[s.id] = {}
            return next
        })
        onDirty()
        setOpen(false)
        logAudit({ action: 'DELETE', source: 'SYSTEM', tableName: 'student_attendance', newData: { intent: 'mass_reset', count: studentList.length } })
        addToast('Semua data absensi direset', 'info')
    }, [studentList, setDataMap, onDirty, addToast])

    return (
        <>
            <button
                ref={btnRef}
                type="button"
                onClick={handleToggle}
                className="h-8 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[10px] font-black text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-border)] active:scale-95 transition-all flex items-center gap-1.5 shrink-0"
            >
                <FontAwesomeIcon icon={faListCheck} className="text-[9px]" />
                Aksi Massal
                <FontAwesomeIcon icon={faChevronDown} className={`text-[8px] transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && createPortal(
                <div
                    ref={menuRef}
                    style={{
                        position: 'fixed',
                        left: Math.min(menuPos.x, window.innerWidth - 216),
                        top: menuPos.y,
                        zIndex: 9999,
                        width: 208,
                    }}
                    className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl overflow-hidden py-1"
                >
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

// ─── NotePopup — catatan per siswa per bulan ────────────────────────────────

function NotePopup({ student, note, x, y, onSave, onClose }) {
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
                    Catatan — {student.name.split(' ')[0]}
                </p>
                <button onClick={() => { onSave(val); onClose() }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                    <FontAwesomeIcon icon={faXmark} style={{ fontSize: 10, color: 'var(--color-text-muted)' }} />
                </button>
            </div>
            <div style={{ padding: 12 }}>
                <textarea
                    autoFocus
                    value={val}
                    onChange={e => setVal(e.target.value)}
                    placeholder="Tulis catatan singkat (misal: sakit operasi, pindah sekolah...)"
                    style={{
                        width: '100%', minHeight: 72, resize: 'vertical', fontSize: 11, fontWeight: 600,
                        color: 'var(--color-text)', background: 'var(--color-surface-alt)',
                        border: '1px solid var(--color-border)', borderRadius: 8, padding: '6px 8px',
                        outline: 'none', fontFamily: 'inherit',
                    }}
                    onKeyDown={e => { if (e.key === 'Escape') { onSave(val); onClose() } }}
                />
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

// ─── ImportModal — upload CSV/Excel absensi lama ─────────────────────────────

function ImportModal({ studentList, tahun, bulan, daysInMonth, onImport, onClose }) {
    const [file, setFile] = useState(null)
    const [preview, setPreview] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    const loadXLSX = async () => {
        return await import('xlsx')
    }

    const handleFile = async (f) => {
        if (!f) return
        setFile(f); setError(null); setLoading(true)
        try {
            const XLSX = await loadXLSX()
            const buf = await f.arrayBuffer()
            const wb = XLSX.read(buf, { type: 'array' })
            const ws = wb.Sheets[wb.SheetNames[0]]
            const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
            // Cari baris header & kolom nama
            if (rows.length < 2) throw new Error('File tidak valid atau kosong')
            const header = rows[0].map(h => String(h).toLowerCase().trim())
            const namaCol = header.findIndex(h => h.includes('nama'))
            if (namaCol < 0) throw new Error('Kolom "Nama" tidak ditemukan di baris pertama')
            // Map siswa by name
            const nameMap = {}
            for (const s of studentList) nameMap[s.name.toLowerCase().replace(/\s+/g, ' ').trim()] = s.id
            // Parse absensi per hari
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
                    {/* Format hint */}
                    <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/20">
                        <p className="text-[10px] font-black text-blue-600 mb-1">Format yang didukung:</p>
                        <p className="text-[10px] text-[var(--color-text-muted)] leading-relaxed">
                            Baris pertama = header. Harus ada kolom <strong>Nama</strong>. Kolom tanggal = angka (1, 2, 3, ...).
                            Nilai: <strong>H</strong> Hadir · <strong>S</strong> Sakit · <strong>I</strong> Izin · <strong>A</strong> Alpa · <strong>P</strong> Pulang Awal.
                        </p>
                    </div>
                    {/* Drop zone */}
                    <label className="flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed border-[var(--color-border)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)]/3 transition-all cursor-pointer">
                        <FontAwesomeIcon icon={faUpload} className="text-2xl text-[var(--color-text-muted)]" />
                        <p className="text-[12px] font-bold text-[var(--color-text-muted)]">
                            {file ? file.name : 'Klik atau seret file di sini'}
                        </p>
                        <p className="text-[10px] text-[var(--color-text-muted)]">.xlsx, .xls, .csv</p>
                        <input type="file" accept=".xlsx,.xls,.csv" className="hidden"
                            onChange={e => handleFile(e.target.files[0])} />
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
                                    <p className="text-[9px] font-black text-amber-600 mb-1 uppercase tracking-wider">Tidak ditemukan di daftar siswa:</p>
                                    {preview.unmatched.slice(0, 5).map((n, i) => <p key={i} className="text-[10px] text-[var(--color-text-muted)]">· {n}</p>)}
                                    {preview.unmatched.length > 5 && <p className="text-[9px] text-[var(--color-text-muted)]">...dan {preview.unmatched.length - 5} lainnya</p>}
                                </div>
                            )}
                        </div>
                    )}
                </div>
                <div className="px-5 py-3 border-t border-[var(--color-border)] flex gap-2 justify-end">
                    <button onClick={onClose} className="h-9 px-4 rounded-xl border border-[var(--color-border)] text-[10px] font-black text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-all">Batal</button>
                    <button
                        disabled={!preview || preview.matched.length === 0}
                        onClick={() => { onImport(preview.matched); onClose() }}
                        className="h-9 px-5 rounded-xl bg-[var(--color-primary)] text-white text-[10px] font-black disabled:opacity-40 hover:opacity-90 transition-all flex items-center gap-2">
                        <FontAwesomeIcon icon={faCheck} className="text-[9px]" />
                        Terapkan ({preview?.matched.length || 0} siswa)
                    </button>
                </div>
            </div>
        </div>,
        document.body
    )
}

// ─── AlertThresholdModal — konfigurasi ambang batas alert ────────────────────

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
                        <input type="range" min={1} max={10} value={alpa} onChange={e => setAlpa(+e.target.value)}
                            className="w-full accent-red-500 h-1.5 cursor-pointer" />
                        <div className="flex justify-between text-[9px] text-[var(--color-text-muted)] mt-1">
                            <span>1</span><span>5</span><span>10</span>
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)] mb-2">
                            Kehadiran &lt; <span className="text-amber-600 text-[14px] ml-1">{hadirPct}%</span> → kuning
                        </label>
                        <input type="range" min={30} max={90} step={5} value={hadirPct} onChange={e => setHadirPct(+e.target.value)}
                            className="w-full accent-amber-500 h-1.5 cursor-pointer" />
                        <div className="flex justify-between text-[9px] text-[var(--color-text-muted)] mt-1">
                            <span>30%</span><span>60%</span><span>90%</span>
                        </div>
                    </div>
                </div>
                <div className="px-5 py-3 border-t border-[var(--color-border)] flex gap-2 justify-end">
                    <button onClick={onClose} className="h-9 px-4 rounded-xl border border-[var(--color-border)] text-[10px] font-black text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-all">Batal</button>
                    <button onClick={() => { onSave({ alpa, hadirPct }); onClose() }}
                        className="h-9 px-5 rounded-xl bg-[var(--color-primary)] text-white text-[10px] font-black hover:opacity-90 transition-all flex items-center gap-2">
                        <FontAwesomeIcon icon={faCheck} className="text-[9px]" />
                        Simpan
                    </button>
                </div>
            </div>
        </div>,
        document.body
    )
}

// ─── MobileCardView — Option B: card per siswa dengan dot grid ───────────────

const STATUS_COLORS = {
    H: { bg: '#dcfce7', text: '#166534', border: '#86efac' },
    S: { bg: '#fef9c3', text: '#854d0e', border: '#fde047' },
    I: { bg: '#dbeafe', text: '#1e3a8a', border: '#93c5fd' },
    A: { bg: '#fee2e2', text: '#7f1d1d', border: '#fca5a5' },
    P: { bg: '#f3e8ff', text: '#581c87', border: '#d8b4fe' },
}

function MobileCardView({ filteredStudents, dataMap, tahun, bulan, daysInMonth, todayDate, onCellClick, notesMap, onNoteClick, alpaThreshold, hadirThreshold, loadingData }) {
    // ── Semua hooks sebelum early return (Rules of Hooks) ──
    const weekdays = useMemo(() => countWeekdays(tahun, bulan), [tahun, bulan])

    if (loadingData) return (
        <div className="p-4 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 animate-pulse">
                    <div className="h-3 w-32 rounded bg-[var(--color-border)] mb-3" />
                    <div className="flex flex-wrap gap-1">
                        {Array.from({ length: 31 }).map((_, j) => <div key={j} className="w-8 h-8 rounded-lg bg-[var(--color-border)]/40" />)}
                    </div>
                </div>
            ))}
        </div>
    )
    if (filteredStudents.length === 0) return (
        <div className="py-16 flex flex-col items-center gap-2 text-[var(--color-text-muted)]">
            <FontAwesomeIcon icon={faMagnifyingGlass} className="text-2xl opacity-20" />
            <p className="text-[12px] font-bold">Tidak ada siswa</p>
        </div>
    )
    return (
        <div className="p-3 space-y-2.5">
            {filteredStudents.map((s, idx) => {
                const days = dataMap[s.id] || {}
                const sum = { H: 0, S: 0, I: 0, A: 0, P: 0 }
                for (let d = 1; d <= daysInMonth; d++) { const v = days[d]; if (sum[v] !== undefined) sum[v]++ }
                const pct = weekdays > 0 ? Math.round((sum.H / weekdays) * 100) : 0
                const alertAlpa = sum.A >= (alpaThreshold ?? 3)
                const alertHadir = pct < (hadirThreshold ?? 75) && weekdays > 0 && Object.keys(days).length > 0
                const hasNote = !!notesMap[s.id]

                return (
                    <div key={s.id} className={`rounded-2xl border bg-[var(--color-surface)] overflow-hidden transition-all ${alertAlpa ? 'border-red-300 dark:border-red-800' : 'border-[var(--color-border)]'}`}>
                        {/* Card header */}
                        <div className={`flex items-center justify-between px-4 py-2.5 border-b border-[var(--color-border)] ${alertAlpa ? 'bg-red-500/5' : 'bg-[var(--color-surface-alt)]/40'}`}>
                            <div className="flex items-center gap-2 min-w-0">
                                <div className="w-6 h-6 rounded-full bg-[var(--color-surface-alt)] border border-[var(--color-border)] flex items-center justify-center text-[9px] font-black text-[var(--color-text-muted)] shrink-0">
                                    {idx + 1}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[13px] font-bold text-[var(--color-text)] truncate">{s.name}</p>
                                    {alertAlpa && <p className="text-[9px] font-black text-red-500 flex items-center gap-1"><FontAwesomeIcon icon={faTriangleExclamation} className="text-[8px]" />Alpa {sum.A}×</p>}
                                    {!alertAlpa && alertHadir && <p className="text-[9px] font-black text-amber-500 flex items-center gap-1"><FontAwesomeIcon icon={faBell} className="text-[8px]" />Hadir {pct}%</p>}
                                </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                                {/* Mini stats */}
                                {['H', 'S', 'I', 'A', 'P'].filter(k => sum[k] > 0).map(k => (
                                    <span key={k} style={{ background: STATUS_COLORS[k].bg, color: STATUS_COLORS[k].text, border: `1px solid ${STATUS_COLORS[k].border}` }}
                                        className="text-[9px] font-black px-1.5 py-0.5 rounded-md">
                                        {k}{sum[k]}
                                    </span>
                                ))}
                                {/* Note btn */}
                                <button onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); onNoteClick({ student: s, x: r.left, y: r.bottom }) }}
                                    className={`w-6 h-6 rounded-md flex items-center justify-center ml-1 transition-all ${hasNote ? 'text-amber-500 bg-amber-500/10' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]'}`}>
                                    <FontAwesomeIcon icon={faStickyNote} className="text-[9px]" />
                                </button>
                            </div>
                        </div>

                        {/* Dot grid — 7 kolom penuh, angka & status dalam 1 tombol */}
                        <div className="px-2 pt-2 pb-1">
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
                                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => {
                                    const v = days[d] || ''
                                    const isWknd = isWeekend(tahun, bulan, d)
                                    const isT = d === todayDate
                                    const meta = STATUS_COLORS[v]
                                    return (
                                        <button key={d}
                                            onMouseDown={() => onCellClick(s.id, d)}
                                            style={{
                                                ...(meta
                                                    ? { background: meta.bg, border: `1.5px solid ${meta.border}`, boxShadow: isT ? '0 0 0 2px #6366f1' : undefined }
                                                    : { background: isWknd ? 'var(--color-surface-alt)' : 'var(--color-surface)', border: isT ? '1px solid #6366f1' : '1px solid var(--color-border)' }
                                                ),
                                                aspectRatio: '1 / 1.1',
                                            }}
                                            className={`rounded-lg transition-all active:scale-90 select-none flex flex-col items-center justify-center w-full relative overflow-hidden ${isT && !meta ? 'shadow-[inset_0_0_8px_rgba(99,102,241,0.15)] bg-indigo-500/5' : ''}`}
                                        >
                                            {isT && !meta && (
                                                <div className="absolute top-[3px] right-[3px] flex items-center justify-center">
                                                    <div className="w-1 h-1 rounded-full bg-indigo-500 z-10" />
                                                    <div className="absolute w-1 h-1 rounded-full bg-indigo-500 animate-ping opacity-75" />
                                                </div>
                                            )}
                                            <span style={{ fontSize: 12, fontWeight: 900, lineHeight: 1, color: meta ? meta.text : 'transparent' }}>
                                                {v}
                                            </span>
                                            <span style={{ fontSize: 7, fontWeight: 700, lineHeight: 1.1, color: isWknd ? '#fca5a5' : meta ? meta.text : 'var(--color-text-muted)', opacity: meta ? 0.6 : isWknd ? 0.5 : 0.4 }}>
                                                {d}
                                            </span>
                                        </button>
                                    )
                                })}
                                {/* Placeholder invisible — isi sisa kolom baris terakhir agar mentok kanan */}
                                {Array.from({ length: (7 - (daysInMonth % 7)) % 7 }).map((_, i) => (
                                    <div key={`ph-${i}`} style={{ aspectRatio: '1 / 1.1', opacity: 0, pointerEvents: 'none' }} />
                                ))}
                            </div>
                        </div>

                        {/* Progress bar */}
                        <div className="px-3 pb-3 flex items-center gap-2">
                            <div className="flex-1 h-1.5 rounded-full bg-[var(--color-border)] overflow-hidden">
                                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: pct >= 80 ? '#059669' : pct >= 60 ? '#d97706' : '#dc2626' }} />
                            </div>
                            <span className={`text-[10px] font-black tabular-nums min-w-[32px] text-right ${pct >= 80 ? 'text-emerald-600' : pct >= 60 ? 'text-amber-600' : 'text-red-600'}`}>{pct}%</span>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}

// ─── MobileListView — Option C: list ringkas + bottom drawer detail ──────────

function MobileListView({ filteredStudents, dataMap, tahun, bulan, daysInMonth, todayDate, onCellClick, notesMap, onNoteClick, alpaThreshold, hadirThreshold, loadingData }) {
    const [expandedId, setExpandedId] = useState(null)
    const weekdays = useMemo(() => countWeekdays(tahun, bulan), [tahun, bulan])

    // ── Semua hooks HARUS sebelum early return (Rules of Hooks) ──
    const handleBackdrop = useCallback((e) => {
        if (e.target === e.currentTarget) setExpandedId(null)
    }, [])

    // Last 5 weekdays — dihitung selalu, bukan setelah early return
    const lastFiveDays = useMemo(() => {
        const today = new Date()
        const maxD = (bulan === today.getMonth() + 1 && tahun === today.getFullYear()) ? today.getDate() : daysInMonth
        const result = []
        for (let d = maxD; d >= 1 && result.length < 5; d--) {
            if (!isWeekend(tahun, bulan, d)) result.unshift(d)
        }
        return result
    }, [tahun, bulan, daysInMonth])

    const expanded = expandedId ? filteredStudents.find(s => s.id === expandedId) : null

    // ── Early returns setelah semua hooks ──
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

    if (filteredStudents.length === 0) return (
        <div className="py-16 flex flex-col items-center gap-2 text-[var(--color-text-muted)]">
            <FontAwesomeIcon icon={faMagnifyingGlass} className="text-2xl opacity-20" />
            <p className="text-[12px] font-bold">Tidak ada siswa</p>
        </div>
    )

    return (
        <>
            <div className="divide-y divide-[var(--color-border)]">
                {filteredStudents.map((s, idx) => {
                    const days = dataMap[s.id] || {}
                    const sum = { H: 0, S: 0, I: 0, A: 0, P: 0 }
                    for (let d = 1; d <= daysInMonth; d++) { const v = days[d]; if (sum[v] !== undefined) sum[v]++ }
                    const pct = weekdays > 0 ? Math.round((sum.H / weekdays) * 100) : 0
                    const alertAlpa = sum.A >= (alpaThreshold ?? 3)
                    const hasNote = !!notesMap[s.id]

                    return (
                        <div key={s.id} className={`flex items-center gap-2.5 px-4 py-2.5 transition-colors ${alertAlpa ? 'bg-red-500/[0.02]' : ''}`}>
                            {/* No */}
                            <div className="w-5 h-5 rounded-full bg-[var(--color-surface-alt)] border border-[var(--color-border)] flex items-center justify-center text-[8px] font-black text-[var(--color-text-muted)] shrink-0">
                                {idx + 1}
                            </div>

                            {/* Name + progress */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1">
                                    <p className="text-[12px] font-bold text-[var(--color-text)] truncate">{s.name}</p>
                                    {hasNote && <FontAwesomeIcon icon={faStickyNote} className="text-[8px] text-amber-500 shrink-0" />}
                                </div>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <div className="w-12 h-1 rounded-full bg-[var(--color-border)] overflow-hidden">
                                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: pct >= 80 ? '#059669' : pct >= 60 ? '#d97706' : '#dc2626' }} />
                                    </div>
                                    <span className={`text-[9px] font-black tabular-nums ${alertAlpa ? 'text-red-500' : 'text-[var(--color-text-muted)]'}`}>
                                        {alertAlpa ? `⚠ Alpa ${sum.A}×` : `${pct}%`}
                                    </span>
                                </div>
                            </div>

                            {/* Last 5 days — merged day+status */}
                            <div className="flex items-center gap-0.5 shrink-0">
                                {lastFiveDays.map(d => {
                                    const v = days[d] || ''
                                    const meta = STATUS_COLORS[v]
                                    const isT = d === todayDate
                                    return (
                                        <button key={d}
                                            onMouseDown={() => onCellClick(s.id, d)}
                                            style={meta
                                                ? { background: meta.bg, border: `1.5px solid ${meta.border}`, boxShadow: isT ? '0 0 0 1.5px #6366f1' : undefined }
                                                : { background: 'var(--color-surface-alt)', border: isT ? '1.5px solid #6366f1' : '1px solid var(--color-border)' }
                                            }
                                            className="w-8 h-9 rounded-lg transition-all active:scale-90 select-none flex flex-col items-center justify-center">
                                            <span style={{ fontSize: 11, fontWeight: 900, lineHeight: 1, color: meta ? meta.text : 'transparent' }}>{v}</span>
                                            <span style={{ fontSize: 7, fontWeight: 700, lineHeight: 1.2, color: meta ? meta.text : 'var(--color-text-muted)', opacity: 0.45 }}>{d}</span>
                                        </button>
                                    )
                                })}
                            </div>

                            {/* Expand button */}
                            <button onClick={() => setExpandedId(s.id)}
                                className="w-8 h-8 rounded-xl bg-[var(--color-primary)] flex items-center justify-center text-white transition-all hover:opacity-85 active:scale-90 shrink-0 shadow-sm shadow-[var(--color-primary)]/20">
                                <FontAwesomeIcon icon={faChevronRight} className="text-[9px]" />
                            </button>
                        </div>
                    )
                })}
            </div>

            {/* Bottom drawer — detail bulan penuh */}
            {expanded && createPortal(
                <div
                    className="fixed inset-0 z-50 flex flex-col justify-end"
                    style={{ paddingBottom: 'max(90px, calc(74px + env(safe-area-inset-bottom)))' }}
                    onClick={handleBackdrop}
                >
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setExpandedId(null)} />
                    <div
                        className="relative bg-[var(--color-surface)] rounded-t-3xl border-t border-[var(--color-border)] shadow-2xl flex flex-col"
                        style={{ maxHeight: 'calc(100dvh - 140px)' }}
                    >
                        {/* Handle */}
                        <div className="flex justify-center pt-2.5 pb-1 shrink-0">
                            <div className="w-9 h-1 rounded-full bg-[var(--color-border)]" />
                        </div>

                        {/* Drawer header */}
                        <div className="flex items-center justify-between px-5 pb-3 pt-1 border-b border-[var(--color-border)] shrink-0">
                            <div className="min-w-0">
                                <p className="text-[15px] font-black text-[var(--color-text)] truncate">{expanded.name}</p>
                                <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">{BULAN_NAMA[bulan]} {tahun} · {daysInMonth} hari</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0 ml-3">
                                <button
                                    onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); onNoteClick({ student: expanded, x: r.left, y: r.bottom }); setExpandedId(null) }}
                                    className={`h-8 px-3 rounded-xl text-[10px] font-black flex items-center gap-1.5 transition-all ${notesMap[expanded.id]
                                        ? 'text-amber-600 bg-amber-500/10 border border-amber-500/20'
                                        : 'text-[var(--color-text-muted)] bg-[var(--color-surface-alt)] border border-[var(--color-border)]'}`}>
                                    <FontAwesomeIcon icon={faStickyNote} className="text-[9px]" />
                                    Catatan
                                </button>
                                <button
                                    onClick={() => setExpandedId(null)}
                                    className="w-8 h-8 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-all">
                                    <FontAwesomeIcon icon={faXmark} className="text-[11px]" />
                                </button>
                            </div>
                        </div>

                        {/* Scrollable content */}
                        <div className="overflow-y-auto flex-1 px-5 py-4" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
                            {(() => {
                                const days = dataMap[expanded.id] || {}
                                const sum = { H: 0, S: 0, I: 0, A: 0, P: 0 }
                                for (let d = 1; d <= daysInMonth; d++) { const v = days[d]; if (sum[v] !== undefined) sum[v]++ }
                                const pct = weekdays > 0 ? Math.round((sum.H / weekdays) * 100) : 0
                                return (
                                    <>
                                        {/* Stats grid — 3 kolom */}
                                        <div className="grid grid-cols-3 gap-2 mb-4">
                                            {STATUS_LIST.map(k => (
                                                <div key={k} style={{ background: STATUS_COLORS[k].bg, border: `1px solid ${STATUS_COLORS[k].border}` }}
                                                    className="rounded-xl px-3 py-2 flex flex-col">
                                                    <span style={{ color: STATUS_COLORS[k].text, fontSize: 9, fontWeight: 900, opacity: 0.7 }} className="uppercase tracking-wider">{STATUS_META[k].label}</span>
                                                    <span style={{ color: STATUS_COLORS[k].text, fontSize: 22, fontWeight: 900, lineHeight: 1.1 }}>{sum[k]}</span>
                                                </div>
                                            ))}
                                            <div className="rounded-xl px-3 py-2 flex flex-col bg-[var(--color-surface-alt)] border border-[var(--color-border)]">
                                                <span className="text-[9px] font-black uppercase tracking-wider text-[var(--color-text-muted)]" style={{ opacity: 0.7 }}>Kehadiran</span>
                                                <span className={`font-black leading-tight`} style={{ fontSize: 22, color: pct >= 80 ? '#059669' : pct >= 60 ? '#d97706' : '#dc2626' }}>{pct}%</span>
                                            </div>
                                        </div>

                                        {/* Dot grid */}
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
                                            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => {
                                                const v = days[d] || ''
                                                const isWknd = isWeekend(tahun, bulan, d)
                                                const isT = d === todayDate
                                                const meta = STATUS_COLORS[v]
                                                return (
                                                    <button key={d} onMouseDown={() => onCellClick(expanded.id, d)}
                                                        style={{
                                                            ...(meta
                                                                ? { background: meta.bg, border: `2px solid ${meta.border}`, boxShadow: isT ? '0 0 0 2px #6366f1' : undefined }
                                                                : { background: isWknd ? 'var(--color-surface-alt)' : 'var(--color-surface)', border: isT ? '2px solid #6366f1' : '1px solid var(--color-border)' }
                                                            ),
                                                            aspectRatio: '1 / 1.15',
                                                        }}
                                                        className="rounded-xl transition-all active:scale-90 select-none flex flex-col items-center justify-center w-full">
                                                        <span style={{ fontSize: 14, fontWeight: 900, lineHeight: 1, color: meta ? meta.text : 'transparent' }}>{v}</span>
                                                        <span style={{ fontSize: 9, fontWeight: 700, lineHeight: 1.2, color: isWknd ? '#fca5a5' : meta ? meta.text : 'var(--color-text-muted)', opacity: meta ? 0.6 : isWknd ? 0.5 : 0.4 }}>{d}</span>
                                                    </button>
                                                )
                                            })}
                                            {/* Placeholder — isi sisa kolom baris terakhir */}
                                            {Array.from({ length: (7 - (daysInMonth % 7)) % 7 }).map((_, i) => (
                                                <div key={`ph-${i}`} style={{ aspectRatio: '1 / 1.15', opacity: 0, pointerEvents: 'none' }} />
                                            ))}
                                        </div>
                                    </>
                                )
                            })()}
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    )
}

// ─── Haptic feedback helper ───────────────────────────────────────────────────

function haptic(type = 'light') {
    if (!navigator.vibrate) return
    const patterns = {
        light: [8],
        medium: [15],
        success: [10, 50, 10],
        warning: [20, 40, 20],
        error: [30, 30, 60],
    }
    navigator.vibrate(patterns[type] || patterns.light)
}

// ─── CommandPalette — ⌘K shortcut launcher ───────────────────────────────────

function CommandPalette({ open, onClose, onAction, studentCount, bulan, tahun, completionPct, isDirty, filterMode, hideWeekend, mobileView }) {
    const [query, setQuery] = useState('')
    const inputRef = useRef(null)
    const prevBulan = bulan === 1 ? 12 : bulan - 1
    const prevTahun = bulan === 1 ? tahun - 1 : tahun

    useEffect(() => {
        if (open) {
            setQuery('')
            setTimeout(() => inputRef.current?.focus(), 50)
        }
    }, [open])

    useEffect(() => {
        const h = (e) => { if (e.key === 'Escape') onClose() }
        if (open) window.addEventListener('keydown', h)
        return () => window.removeEventListener('keydown', h)
    }, [open, onClose])

    const COMMANDS = useMemo(() => [
        {
            group: 'Data',
            items: [
                { id: 'fill-hadir', label: 'Isi semua: Hadir', desc: 'Set semua hari kerja = H', icon: faUserCheck, color: '#059669', action: () => onAction('fill', 'H') },
                { id: 'fill-alpa', label: 'Isi semua: Alpa', desc: 'Set semua hari kerja = A', icon: faCircleXmark, color: '#dc2626', action: () => onAction('fill', 'A') },
                { id: 'copy-last', label: 'Copy bulan lalu', desc: `Salin data ${BULAN_NAMA[prevBulan]} ${prevTahun}`, icon: faCopy, color: '#6366f1', action: () => onAction('copyLastMonth') },
                { id: 'reset', label: 'Reset semua data', desc: 'Kosongkan seluruh absensi bulan ini', icon: faArrowsRotate, color: '#dc2626', action: () => onAction('reset') },
                { id: 'save', label: 'Simpan perubahan', desc: isDirty ? 'Ada perubahan belum tersimpan' : 'Sudah tersimpan', icon: faSave, color: '#059669', action: () => onAction('save'), disabled: !isDirty },
                { id: 'undo', label: 'Batalkan (Undo)', desc: 'Ctrl+Z', icon: faRotateLeft, color: '#888', action: () => onAction('undo') },
            ]
        },
        {
            group: 'Tampilan',
            items: [
                { id: 'hide-weekend', label: hideWeekend ? 'Tampilkan weekend' : 'Sembunyikan weekend', desc: 'Toggle kolom Sabtu & Minggu', icon: hideWeekend ? faEye : faEyeSlash, color: '#6366f1', action: () => onAction('toggleWeekend') },
                { id: 'filter-alpa', label: 'Filter: siswa alpa', desc: 'Tampilkan hanya yang sering alpa', icon: faFilter, color: '#dc2626', action: () => onAction('filterAlpa') },
                { id: 'filter-all', label: 'Reset filter', desc: 'Tampilkan semua siswa', icon: faArrowsRotate, color: '#888', action: () => onAction('filterAll'), disabled: filterMode === 'all' },
                { id: 'today', label: 'Scroll ke hari ini', desc: 'Auto-focus kolom aktif', icon: faCrosshairs, color: '#6366f1', action: () => onAction('scrollToToday') },
                { id: 'view-card', label: 'View: Card', desc: 'Tampilan dot grid per siswa (mobile)', icon: faBorderAll, color: '#6366f1', action: () => onAction('setMobileView', 'card') },
                { id: 'view-list', label: 'View: List', desc: 'Tampilan ringkas + expand (mobile)', icon: faList, color: '#6366f1', action: () => onAction('setMobileView', 'list') },
                { id: 'view-table', label: 'View: Tabel', desc: 'Tampilan tabel klasik', icon: faTableCells, color: '#6366f1', action: () => onAction('setMobileView', 'table') },
            ]
        },
        {
            group: 'Info',
            items: [
                { id: 'info', label: `${studentCount} siswa · ${completionPct}% terisi`, desc: `${BULAN_NAMA[bulan]} ${tahun}`, icon: faChartSimple, color: '#888', action: () => { }, disabled: true },
            ]
        },
    ], [isDirty, filterMode, hideWeekend, mobileView, bulan, tahun, prevBulan, prevTahun, studentCount, completionPct])

    const filtered = useMemo(() => {
        if (!query.trim()) return COMMANDS
        const q = query.toLowerCase()
        return COMMANDS.map(g => ({
            ...g,
            items: g.items.filter(i => i.label.toLowerCase().includes(q) || (i.desc || '').toLowerCase().includes(q))
        })).filter(g => g.items.length > 0)
    }, [query, COMMANDS])

    if (!open) return null
    return createPortal(
        <div className="fixed inset-0 z-[200] flex flex-col items-center pt-[10vh] px-4 pb-4 bg-black/50 backdrop-blur-sm"
            onClick={e => { if (e.target === e.currentTarget) onClose() }}>
            <div className="w-full max-w-lg bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-2xl overflow-hidden flex flex-col max-h-[75vh]">
                {/* Search input */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--color-border)]">
                    <FontAwesomeIcon icon={faMagnifyingGlass} className="text-[var(--color-text-muted)] text-[13px] shrink-0" />
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="Ketik perintah... (isi hadir, copy, filter alpa, ...)"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Enter') {
                                const first = filtered[0]?.items[0]
                                if (first && !first.disabled) { first.action(); onClose(); haptic('light') }
                            }
                        }}
                        className="flex-1 text-[13px] bg-transparent border-none outline-none text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]/50"
                    />
                    <kbd className="hidden sm:flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black text-[var(--color-text-muted)] bg-[var(--color-surface-alt)] border border-[var(--color-border)]">ESC</kbd>
                </div>
                {/* Results */}
                <div className="overflow-y-auto flex-1">
                    {filtered.length === 0 ? (
                        <div className="py-10 flex flex-col items-center gap-2 text-[var(--color-text-muted)]">
                            <FontAwesomeIcon icon={faMagnifyingGlass} className="text-xl opacity-20" />
                            <p className="text-[12px] font-bold">Tidak ada perintah ditemukan</p>
                        </div>
                    ) : filtered.map(group => (
                        <div key={group.group}>
                            <p className="px-4 pt-3 pb-1 text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">{group.group}</p>
                            {group.items.map(item => (
                                <button key={item.id}
                                    disabled={item.disabled}
                                    onClick={() => { if (!item.disabled) { item.action(); onClose(); haptic('light') } }}
                                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-[var(--color-surface-alt)] ${item.disabled ? 'opacity-40 cursor-default' : 'cursor-pointer'}`}
                                >
                                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                                        style={{ background: item.color + '18', border: `1px solid ${item.color}30` }}>
                                        <FontAwesomeIcon icon={item.icon} style={{ color: item.color, fontSize: 11 }} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[12px] font-bold text-[var(--color-text)] leading-tight">{item.label}</p>
                                        {item.desc && <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5 truncate">{item.desc}</p>}
                                    </div>
                                </button>
                            ))}
                        </div>
                    ))}
                </div>
                {/* Footer shortcut hint */}
                <div className="px-4 py-2 border-t border-[var(--color-border)] flex items-center gap-3">
                    <span className="text-[9px] text-[var(--color-text-muted)]">
                        <kbd className="px-1 py-0.5 rounded bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[8px] font-black">↵</kbd> pilih
                        <span className="ml-2"><kbd className="px-1 py-0.5 rounded bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[8px] font-black">↑↓</kbd> navigasi</span>
                        <span className="ml-2"><kbd className="px-1 py-0.5 rounded bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[8px] font-black">Esc</kbd> tutup</span>
                    </span>
                </div>
            </div>
        </div>,
        document.body
    )
}

// ─── MobileToolbarSheet — bottom drawer untuk overflow actions di mobile ──────

function MobileToolbarSheet({ open, onClose, children }) {
    useEffect(() => {
        if (open) document.body.style.overflow = 'hidden'
        else document.body.style.overflow = ''
        return () => { document.body.style.overflow = '' }
    }, [open])

    if (!open) return null
    return createPortal(
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            {/* Sheet */}
            <div className="relative bg-[var(--color-surface)] rounded-t-2xl border-t border-[var(--color-border)] shadow-2xl overflow-hidden">
                {/* Handle */}
                <div className="flex justify-center pt-3 pb-1">
                    <div className="w-8 h-1 rounded-full bg-[var(--color-border)]" />
                </div>
                <div className="px-4 pb-2 pt-1 flex items-center justify-between">
                    <p className="text-[11px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">Pengaturan Tampilan</p>
                    <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]">
                        <FontAwesomeIcon icon={faXmark} className="text-[11px]" />
                    </button>
                </div>
                <div className="px-4 pb-6 space-y-1">
                    {children}
                </div>
            </div>
        </div>,
        document.body
    )
}

// ─── ColFillPopup — klik angka header tanggal → isi semua siswa ───────────────

function ColFillPopup({ day, dow, x, y, onFill, onClear, onClose, studentCount }) {
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
                    Isi semua {studentCount} siswa dengan:
                </p>
            </div>
            <div style={{ padding: '4px 0' }}>
                {STATUS_LIST.map(s => (
                    <button key={s} onClick={() => { onFill(s); onClose() }}
                        className={`w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-[var(--color-surface-alt)] transition-colors text-left`}
                        style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                        <span className={`w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-black border ${STATUS_META[s].cellBg} ${STATUS_META[s].color}`} style={{ flexShrink: 0 }}>
                            {s}
                        </span>
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

// ─── RowFillPopup — klik nama siswa → isi semua hari kerjanya ─────────────────

function RowFillPopup({ student, x, y, onFill, onClear, onClose, weekdays }) {
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
                    {student.name.split(' ').slice(0, 2).join(' ')}
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
                        <span className={`w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-black border ${STATUS_META[s].cellBg} ${STATUS_META[s].color}`} style={{ flexShrink: 0 }}>
                            {s}
                        </span>
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
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#dc2626' }}>Reset siswa ini</span>
                </button>
            </div>
        </div>,
        document.body
    )
}



function RekapBulananPanel({ classId, tahun, bulan, studentList, dataMap }) {
    const { addToast } = useToast()
    const { profile } = useAuth()

    const [raportMap, setRaportMap] = useState({})
    const [syncing, setSyncing] = useState(false)
    const [syncDone, setSyncDone] = useState(false)
    // Feature 9: Delta vs bulan lalu
    const [lastMonthMap, setLastMonthMap] = useState({})
    // Mobile view switcher for rekap
    const [rekapMobileView, setRekapMobileView] = useState(() => {
        try { return localStorage.getItem('rekap_mobile_view') || 'a' } catch { return 'a' }
    })

    const weekdays = useMemo(() => countWeekdays(tahun, bulan), [tahun, bulan])
    const daysInMonth = useMemo(() => getDaysInMonth(tahun, bulan), [tahun, bulan])
    const rekapData = useMemo(() => {
        const r = {}
        for (const s of studentList) r[s.id] = summarize(dataMap[s.id] || {}, tahun, bulan)
        return r
    }, [studentList, dataMap, tahun, bulan])

    const summary = useMemo(() => {
        if (!studentList.length) return null
        const total = studentList.length
        const avgHadir = Math.round(studentList.reduce((a, s) => a + (rekapData[s.id]?.H || 0), 0) / total * 10) / 10
        const alpaCount = studentList.filter(s => (rekapData[s.id]?.A || 0) >= 3).length
        return { total, avgHadir, alpaCount }
    }, [rekapData, studentList])

    useEffect(() => {
        if (!classId || !studentList.length) return
        setSyncDone(false)
        const ids = studentList.map(s => s.id)
        supabase.from('student_monthly_reports')
            .select('student_id, hari_sakit, hari_izin, hari_alpa, hari_pulang')
            .in('student_id', ids).eq('month', bulan).eq('year', tahun)
            .then(({ data }) => {
                const m = {}
                for (const r of (data || [])) m[r.student_id] = r
                setRaportMap(m)
            })
        // Feature 9: Load previous month
        const prevBulanVal = bulan === 1 ? 12 : bulan - 1
        const prevTahunVal = bulan === 1 ? tahun - 1 : tahun
        supabase.from('student_attendance')
            .select('student_id, days')
            .in('student_id', ids).eq('year', prevTahunVal).eq('month', prevBulanVal)
            .then(({ data }) => {
                const m = {}
                for (const r of (data || [])) {
                    m[r.student_id] = summarize(r.days || {}, prevTahunVal, prevBulanVal)
                }
                setLastMonthMap(m)
            })
    }, [classId, tahun, bulan, studentList])

    const handleSync = async () => {
        if (syncing) return
        setSyncing(true)
        const upserts = studentList.map(s => ({
            student_id: s.id, month: bulan, year: tahun,
            hari_sakit: rekapData[s.id]?.S || 0,
            hari_izin: rekapData[s.id]?.I || 0,
            hari_alpa: rekapData[s.id]?.A || 0,
            hari_pulang: rekapData[s.id]?.P || 0,
            updated_by: profile?.id,
        }))
        const { error } = await supabase.from('student_monthly_reports')
            .upsert(upserts, { onConflict: 'student_id,month,year' })
        setSyncing(false)
        if (error) {
            addToast('Gagal sinkronisasi: ' + error.message, 'error')
        } else {
            addToast(`${studentList.length} siswa berhasil disinkronkan ke Raport ✓`, 'success')
            setSyncDone(true)
            const ids = studentList.map(s => s.id)
            const { data } = await supabase.from('student_monthly_reports')
                .select('student_id, hari_sakit, hari_izin, hari_alpa, hari_pulang')
                .in('student_id', ids).eq('month', bulan).eq('year', tahun)
            if (data) { const m = {}; for (const r of data) m[r.student_id] = r; setRaportMap(m) }
            await logAudit({
                action: 'UPDATE', source: 'OPERATIONAL', tableName: 'student_monthly_reports',
                newData: { bulk_sync: true, count: studentList.length, month: bulan, year: tahun, classId }
            })
        }
    }


    // Feature 8: Cetak rekap
    const handlePrint = useCallback(() => {
        const prevBulanVal = bulan === 1 ? 12 : bulan - 1
        const hasLastMonth = Object.keys(lastMonthMap).length > 0
        const rows = studentList.map((s, idx) => {
            const r = rekapData[s.id] || {}
            const pct = weekdays > 0 ? Math.round(((r.H || 0) / weekdays) * 100) : 0
            const lm = lastMonthMap[s.id] || {}
            const delta = (r.H || 0) - (lm.H || 0)
            return `<tr>
                <td>${idx + 1}</td>
                <td style="text-align:left">${s.name}</td>
                <td style="color:#059669">${r.H || 0}</td>
                <td style="color:#d97706">${r.S || 0}</td>
                <td style="color:#2563eb">${r.I || 0}</td>
                <td style="color:${(r.A || 0) > 0 ? '#dc2626' : '#999'}">${r.A || 0}</td>
                <td style="color:#7c3aed">${r.P || 0}</td>
                <td style="font-weight:900;color:${pct >= 80 ? '#059669' : pct >= 60 ? '#d97706' : '#dc2626'}">${pct}%</td>
                ${hasLastMonth ? `<td style="font-weight:900;color:${delta > 0 ? '#059669' : delta < 0 ? '#dc2626' : '#999'}">${delta > 0 ? '+' : ''}${delta}</td>` : ''}
            </tr>`
        }).join('')
        const win = window.open('', '_blank', 'width=900,height=700')
        win.document.write(`<!DOCTYPE html><html><head>
            <title>Rekap Absensi — ${BULAN_NAMA[bulan]} ${tahun}</title>
            <style>
                * { box-sizing: border-box; margin: 0; padding: 0; }
                body { font-family: Arial, sans-serif; font-size: 11px; color: #111; padding: 20px; }
                h1 { font-size: 14px; font-weight: 900; margin-bottom: 4px; }
                p.sub { font-size: 10px; color: #666; margin-bottom: 16px; }
                table { width: 100%; border-collapse: collapse; }
                th, td { border: 1px solid #ddd; padding: 5px 8px; text-align: center; }
                th { background: #f5f5f5; font-weight: 900; font-size: 9px; text-transform: uppercase; }
                td:nth-child(2) { text-align: left; }
                tr:nth-child(even) { background: #fafafa; }
                @media print { body { padding: 10mm; } }
            </style>
        </head><body>
            <h1>Rekap Absensi — ${BULAN_NAMA[bulan]} ${tahun}</h1>
            <p class="sub">${weekdays} hari kerja efektif &middot; ${studentList.length} siswa</p>
            <table>
                <thead><tr>
                    <th width="32">#</th>
                    <th style="text-align:left">Nama Siswa</th>
                    <th>H</th><th>S</th><th>I</th><th>A</th><th>P</th>
                    <th>Hadir %</th>
                    ${hasLastMonth ? `<th>Δ vs ${BULAN_NAMA[prevBulanVal]}</th>` : ''}
                </tr></thead>
                <tbody>${rows}</tbody>
            </table>
            <script>window.onload=()=>window.print()<\/script>
        </body></html>`)
        win.document.close()
        logAudit({
            action: 'PRINT', source: 'OPERATIONAL', tableName: 'student_attendance',
            newData: { format: 'HTML_PRINT', count: studentList.length, month: bulan, year: tahun, classId }
        })
    }, [studentList, rekapData, lastMonthMap, weekdays, bulan, tahun, profile, classId])

    const handleExport = async () => {
        const XLSX = await import('xlsx')
        const dim = getDaysInMonth(tahun, bulan)
        const rows = studentList.map((s, i) => {
            const row = { No: i + 1, Nama: s.name, NISN: s.nisn || '' }
            for (let d = 1; d <= dim; d++) row[`${d}`] = dataMap[s.id]?.[d] || ''
            const r = rekapData[s.id] || {}
            row.H = r.H || 0; row.S = r.S || 0; row.I = r.I || 0; row.A = r.A || 0; row.P = r.P || 0
            row['%'] = weekdays > 0 ? `${Math.round(((r.H || 0) / weekdays) * 100)}%` : '0%'
            return row
        })
        const ws = XLSX.utils.json_to_sheet(rows)
        ws['!cols'] = [{ wch: 4 }, { wch: 24 }, { wch: 14 },
        ...Array.from({ length: dim }, () => ({ wch: 3 })),
        ...Array.from({ length: 6 }, () => ({ wch: 5 })),
        ]
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, `${BULAN_NAMA[bulan]} ${tahun}`)
        XLSX.writeFile(wb, `Absensi_${BULAN_NAMA[bulan]}_${tahun}.xlsx`)
        addToast('Export Excel berhasil ✓', 'success')

        logAudit({
            action: 'EXPORT', source: 'OPERATIONAL', tableName: 'student_attendance',
            newData: { format: 'XLSX', count: studentList.length, month: bulan, year: tahun, classId }
        })
    }


    return (
        <div>
            <div className="px-4 py-3 border-b border-[var(--color-border)]">

                {/* ── Desktop: satu baris ── */}
                <div className="hidden sm:flex items-center justify-between gap-3">
                    <div>
                        <p className="text-[13px] font-black text-[var(--color-text)]">Rekap — {BULAN_NAMA[bulan]} {tahun}</p>
                        <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">{weekdays} hari efektif · Senin–Jumat</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={handleExport}
                            className="h-8 px-3 rounded-xl border border-[var(--color-border)] text-[10px] font-black text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] hover:text-[var(--color-text)] transition-all flex items-center gap-1.5">
                            <FontAwesomeIcon icon={faFileExport} className="text-[9px]" /> Export Excel
                        </button>
                        <button onClick={handlePrint}
                            className="h-8 px-3 rounded-xl border border-[var(--color-border)] text-[10px] font-black text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] hover:text-[var(--color-text)] transition-all flex items-center gap-1.5">
                            <FontAwesomeIcon icon={faPrint} className="text-[9px]" /> Cetak
                        </button>
                        <button onClick={handleSync} disabled={syncing}
                            className={`h-8 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${syncDone
                                ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-600'
                                : 'bg-[var(--color-primary)] hover:opacity-90 text-white shadow-sm shadow-[var(--color-primary)]/20 disabled:opacity-60'}`}>
                            <FontAwesomeIcon icon={syncing ? faSpinner : syncDone ? faCircleCheck : faCloudArrowUp} className={syncing ? 'animate-spin' : ''} />
                            {syncing ? 'Menyinkronkan...' : syncDone ? 'Tersinkronkan' : 'Sync ke Raport'}
                            <span className={`text-[8px] font-black px-1 py-0.5 rounded ${syncDone ? 'bg-emerald-500/20 text-emerald-600' : 'bg-white/20 text-white'}`}>AUTO</span>
                        </button>
                    </div>
                </div>

                {/* ── Mobile: dua baris ── */}
                <div className="sm:hidden space-y-2">
                    {/* Baris 1: Judul + Sync */}
                    <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                            <p className="text-[13px] font-black text-[var(--color-text)] leading-tight">Rekap — {BULAN_NAMA[bulan]} {tahun}</p>
                            <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">{weekdays} hari efektif · Senin–Jumat</p>
                        </div>
                        <button onClick={handleSync} disabled={syncing}
                            className={`shrink-0 h-8 px-3 rounded-xl text-[10px] font-black flex items-center gap-1.5 transition-all ${syncDone
                                ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-600'
                                : 'bg-[var(--color-primary)] hover:opacity-90 text-white shadow-sm shadow-[var(--color-primary)]/20 disabled:opacity-60'}`}>
                            <FontAwesomeIcon icon={syncing ? faSpinner : syncDone ? faCircleCheck : faCloudArrowUp} className={`text-[10px] ${syncing ? 'animate-spin' : ''}`} />
                            {syncing ? '' : syncDone ? 'Sinkron' : 'Sync'}
                            <span className={`text-[7px] font-black px-1 py-0.5 rounded ${syncDone ? 'bg-emerald-500/20 text-emerald-600' : 'bg-white/20 text-white'}`}>AUTO</span>
                        </button>
                    </div>
                    {/* Baris 2: View switcher kiri, Export+Cetak kanan */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-0.5 bg-[var(--color-surface-alt)] rounded-xl border border-[var(--color-border)] p-0.5">
                            {[
                                { key: 'a', label: 'Kompak', icon: faList },
                                { key: 'c', label: 'Grid', icon: faTableCells },
                                { key: 'd', label: 'Heatmap', icon: faBorderAll },
                            ].map(v => (
                                <button key={v.key}
                                    onClick={() => { setRekapMobileView(v.key); try { localStorage.setItem('rekap_mobile_view', v.key) } catch { } }}
                                    title={v.label}
                                    className={`w-8 h-7 rounded-lg flex items-center justify-center text-[10px] transition-all ${rekapMobileView === v.key ? 'bg-[var(--color-surface)] text-[var(--color-primary)] shadow-sm' : 'text-[var(--color-text-muted)]'}`}>
                                    <FontAwesomeIcon icon={v.icon} />
                                </button>
                            ))}
                        </div>
                        <div className="flex items-center gap-1.5">
                            <button onClick={handleExport}
                                className="h-7 px-2.5 rounded-xl border border-[var(--color-border)] text-[10px] font-black text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] transition-all flex items-center gap-1.5">
                                <FontAwesomeIcon icon={faFileExport} className="text-[9px]" /> Export
                            </button>
                            <button onClick={handlePrint}
                                className="h-7 px-2.5 rounded-xl border border-[var(--color-border)] text-[10px] font-black text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] transition-all flex items-center gap-1.5">
                                <FontAwesomeIcon icon={faPrint} className="text-[9px]" /> Cetak
                            </button>
                        </div>
                    </div>
                </div>

            </div>

            {summary && (
                <div className="grid grid-cols-3 gap-3 px-5 py-3 border-b border-[var(--color-border)]">
                    {[
                        { label: 'Rata-rata Hadir', val: summary.avgHadir, sub: `hari / ${weekdays} efektif`, color: 'text-emerald-600' },
                        { label: 'Kehadiran Kelas', val: `${weekdays > 0 ? Math.round((summary.avgHadir / weekdays) * 100) : 0}%`, sub: 'rata-rata kelas', color: 'text-[var(--color-primary)]' },
                        { label: 'Alpa ≥ 3 hari', val: summary.alpaCount, sub: 'siswa perlu perhatian', color: summary.alpaCount > 0 ? 'text-red-600' : 'text-[var(--color-text-muted)]' },
                    ].map(c => (
                        <div key={c.label} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/50 p-3">
                            <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1">{c.label}</p>
                            <p className={`text-[20px] font-black leading-none ${c.color}`}>{c.val}</p>
                            <p className="text-[9px] text-[var(--color-text-muted)] mt-0.5">{c.sub}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* ════ MOBILE VIEWS ════ */}

            {/* ── View A: Compact + bar ── */}
            {rekapMobileView === 'a' && (
                <div className="sm:hidden divide-y divide-[var(--color-border)]">
                    {studentList.map((s, idx) => {
                        const r = rekapData[s.id] || {}
                        const pct = weekdays > 0 ? Math.round(((r.H || 0) / weekdays) * 100) : 0
                        const rap = raportMap[s.id]
                        const synced = rap && rap.hari_sakit === (r.S || 0) && rap.hari_izin === (r.I || 0) && rap.hari_alpa === (r.A || 0)
                        const alertAlpa = (r.A || 0) >= 3
                        const lm = lastMonthMap[s.id]
                        const delta = lm ? (r.H || 0) - (lm.H || 0) : null
                        const pctColor = pct >= 80 ? '#059669' : pct >= 60 ? '#d97706' : '#dc2626'

                        return (
                            <div key={s.id} className={`px-4 py-2.5 ${alertAlpa ? 'bg-red-500/[0.02]' : ''}`}>
                                {/* Baris 1: nomor + nama + % */}
                                <div className="flex items-center gap-2 mb-1.5">
                                    <div className="w-5 h-5 rounded-full bg-[var(--color-surface-alt)] border border-[var(--color-border)] flex items-center justify-center text-[8px] font-black text-[var(--color-text-muted)] shrink-0">
                                        {idx + 1}
                                    </div>
                                    <p className="text-[12px] font-bold text-[var(--color-text)] flex-1 min-w-0 truncate">{s.name}</p>
                                    {delta !== null && delta !== 0 && (
                                        <span className={`text-[9px] font-black flex items-center gap-0.5 shrink-0 ${delta > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                            <FontAwesomeIcon icon={delta > 0 ? faArrowTrendUp : faArrowTrendDown} className="text-[8px]" />
                                            {delta > 0 ? `+${delta}` : delta}
                                        </span>
                                    )}
                                    <span className="text-[13px] font-black shrink-0 tabular-nums" style={{ color: pctColor }}>{pct}%</span>
                                </div>
                                {/* Baris 2: dot stats + bar + sinkron */}
                                <div className="flex items-center gap-1.5 pl-7">
                                    {STATUS_LIST.filter(k => (r[k] || 0) > 0).map(k => (
                                        <span key={k} className="flex items-center gap-1 text-[10px] font-bold shrink-0" style={{ color: STATUS_COLORS[k].text }}>
                                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: STATUS_COLORS[k].border, display: 'inline-block', flexShrink: 0 }} />
                                            {k} {r[k]}
                                        </span>
                                    ))}
                                    <div className="flex-1 h-1.5 rounded-full bg-[var(--color-border)] overflow-hidden mx-1">
                                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: pctColor }} />
                                    </div>
                                    {rap && (
                                        <span className="text-[9px] font-black shrink-0" style={{ color: synced ? '#059669' : '#d97706' }}>
                                            {synced ? '✓' : '!'}
                                        </span>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* ── View C: Fixed columns grid ── */}
            {rekapMobileView === 'c' && (
                <div className="sm:hidden">
                    {/* Sticky header */}
                    <div className="grid border-b border-[var(--color-border)] bg-[var(--color-surface-alt)] px-3 py-2 sticky top-0 z-10"
                        style={{ gridTemplateColumns: '1fr 32px 32px 32px 32px 40px' }}>
                        <span className="text-[9px] font-black uppercase tracking-wider text-[var(--color-text-muted)]">Nama</span>
                        {['H', 'S', 'I', 'A', 'P'].map(k => (
                            <span key={k} className="text-[9px] font-black text-center" style={{ color: STATUS_COLORS[k].text }}>{k}</span>
                        ))}
                        <span className="text-[9px] font-black uppercase tracking-wider text-[var(--color-text-muted)] text-right">%</span>
                    </div>
                    {/* Rows */}
                    <div className="divide-y divide-[var(--color-border)]">
                        {studentList.map((s, idx) => {
                            const r = rekapData[s.id] || {}
                            const pct = weekdays > 0 ? Math.round(((r.H || 0) / weekdays) * 100) : 0
                            const alertAlpa = (r.A || 0) >= 3
                            const pctColor = pct >= 80 ? '#059669' : pct >= 60 ? '#d97706' : '#dc2626'
                            return (
                                <div key={s.id}
                                    className={`grid items-center px-3 py-2.5 ${alertAlpa ? 'bg-red-500/[0.02]' : ''}`}
                                    style={{ gridTemplateColumns: '1fr 32px 32px 32px 32px 40px' }}>
                                    <div className="min-w-0 pr-1">
                                        <p className="text-[11px] font-bold text-[var(--color-text)] truncate leading-tight">{s.name}</p>
                                        {alertAlpa && <p className="text-[8px] font-black text-red-500 mt-0.5">Alpa {r.A}×</p>}
                                    </div>
                                    {['H', 'S', 'I', 'A', 'P'].map(k => (
                                        <span key={k} className="text-[12px] font-black text-center tabular-nums"
                                            style={{ color: (r[k] || 0) > 0 ? STATUS_COLORS[k].text : 'var(--color-text-muted)', opacity: (r[k] || 0) === 0 ? 0.2 : 1 }}>
                                            {r[k] || 0}
                                        </span>
                                    ))}
                                    <div className="flex flex-col items-end gap-0.5">
                                        <span className="text-[11px] font-black tabular-nums" style={{ color: pctColor }}>{pct}%</span>
                                        <div className="w-full h-1 rounded-full bg-[var(--color-border)] overflow-hidden">
                                            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: pctColor }} />
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* ── View D: Mini heatmap (GitHub-style) ── */}
            {rekapMobileView === 'd' && (
                <div className="sm:hidden divide-y divide-[var(--color-border)]">
                    {studentList.map((s, idx) => {
                        const r = rekapData[s.id] || {}
                        const days = dataMap[s.id] || {}
                        const pct = weekdays > 0 ? Math.round(((r.H || 0) / weekdays) * 100) : 0
                        const alertAlpa = (r.A || 0) >= 3
                        const pctColor = pct >= 80 ? '#059669' : pct >= 60 ? '#d97706' : '#dc2626'
                        // Build ordered weekday dots
                        const weekdayList = []
                        for (let d = 1; d <= daysInMonth; d++) {
                            if (!isWeekend(tahun, bulan, d)) weekdayList.push(d)
                        }
                        return (
                            <div key={s.id} className={`px-4 py-2.5 ${alertAlpa ? 'bg-red-500/[0.02]' : ''}`}>
                                {/* Nama + % */}
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-5 h-5 rounded-full bg-[var(--color-surface-alt)] border border-[var(--color-border)] flex items-center justify-center text-[8px] font-black text-[var(--color-text-muted)] shrink-0">
                                        {idx + 1}
                                    </div>
                                    <p className="text-[12px] font-bold text-[var(--color-text)] flex-1 min-w-0 truncate">{s.name}</p>
                                    <span className="text-[13px] font-black tabular-nums shrink-0" style={{ color: pctColor }}>{pct}%</span>
                                </div>
                                {/* Heatmap dots — setiap dot = 1 hari kerja */}
                                <div className="pl-7">
                                    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${weekdays}, 1fr)`, gap: 3 }}>
                                        {weekdayList.map(d => {
                                            const v = days[d] || ''
                                            const color = v
                                                ? STATUS_COLORS[v].border
                                                : 'var(--color-border)'
                                            const bg = v
                                                ? STATUS_COLORS[v].bg
                                                : 'var(--color-surface-alt)'
                                            return (
                                                <div key={d} title={`${d}: ${v || 'kosong'}`}
                                                    style={{
                                                        aspectRatio: '1',
                                                        borderRadius: 3,
                                                        background: bg,
                                                        border: `1px solid ${color}`,
                                                        opacity: v ? 1 : 0.4,
                                                    }}
                                                />
                                            )
                                        })}
                                    </div>
                                    {/* Legend mini */}
                                    <div className="flex items-center gap-2.5 mt-1.5 flex-wrap">
                                        {STATUS_LIST.filter(k => (r[k] || 0) > 0).map(k => (
                                            <span key={k} className="flex items-center gap-1 text-[9px] font-bold" style={{ color: STATUS_COLORS[k].text }}>
                                                <span style={{ width: 7, height: 7, borderRadius: 2, background: STATUS_COLORS[k].bg, border: `1px solid ${STATUS_COLORS[k].border}`, display: 'inline-block' }} />
                                                {STATUS_META[k].label.split(' ')[0]} {r[k]}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* ── Desktop: Tabel ── */}
            <div className="hidden sm:block overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-[var(--color-surface-alt)] sticky top-0 z-10">
                        <tr>
                            <th className="px-4 py-3 text-left w-10"><span className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">#</span></th>
                            <th className="px-4 py-3 text-left"><span className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Nama</span></th>
                            {STATUS_LIST.map(s => (
                                <th key={s} className="px-3 py-3 text-center">
                                    <span className={`text-[9px] font-black uppercase tracking-widest ${STATUS_META[s].color}`}>
                                        <FontAwesomeIcon icon={STATUS_META[s].icon} className="mr-1" />{STATUS_META[s].label}
                                    </span>
                                </th>
                            ))}
                            <th className="px-3 py-3 text-center"><span className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Hadir %</span></th>
                            <th className="px-3 py-3 text-center"><span className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Δ Bulan Lalu</span></th>
                            <th className="px-3 py-3 text-center"><span className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Di Raport</span></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-border)]">
                        {studentList.map((s, idx) => {
                            const r = rekapData[s.id] || {}
                            const pct = weekdays > 0 ? Math.round(((r.H || 0) / weekdays) * 100) : 0
                            const rap = raportMap[s.id]
                            const synced = rap && rap.hari_sakit === (r.S || 0) && rap.hari_izin === (r.I || 0) && rap.hari_alpa === (r.A || 0)
                            const alertAlpa = (r.A || 0) >= 3
                            return (
                                <tr key={s.id} className={`transition-colors hover:bg-[var(--color-surface-alt)]/50 ${alertAlpa ? 'bg-red-500/[0.02]' : ''}`}>
                                    <td className="px-4 py-2.5">
                                        <div className="w-6 h-6 rounded-full bg-[var(--color-surface-alt)] border border-[var(--color-border)] flex items-center justify-center text-[10px] font-black text-[var(--color-text-muted)]">{idx + 1}</div>
                                    </td>
                                    <td className="px-4 py-2.5 min-w-[160px]">
                                        <p className="text-[13px] font-bold text-[var(--color-text)]">{s.name}</p>
                                        {alertAlpa && <p className="text-[9px] font-black text-red-600 flex items-center gap-1 mt-0.5"><FontAwesomeIcon icon={faTriangleExclamation} className="text-[8px]" />Alpa {r.A} hari</p>}
                                    </td>
                                    <td className="px-3 py-2.5 text-center"><span className="text-[13px] font-black text-emerald-600">{r.H || 0}</span></td>
                                    <td className="px-3 py-2.5 text-center"><span className="text-[13px] font-black text-amber-600">{r.S || 0}</span></td>
                                    <td className="px-3 py-2.5 text-center"><span className="text-[13px] font-black text-blue-600">{r.I || 0}</span></td>
                                    <td className="px-3 py-2.5 text-center"><span className={`text-[13px] font-black ${(r.A || 0) > 0 ? 'text-red-600' : 'text-[var(--color-text-muted)]'}`}>{r.A || 0}</span></td>
                                    <td className="px-3 py-2.5 text-center"><span className="text-[13px] font-black text-purple-600">{r.P || 0}</span></td>
                                    <td className="px-3 py-2.5 text-center">
                                        <div className="flex flex-col items-center gap-1">
                                            <span className={`text-[12px] font-black ${pct >= 80 ? 'text-emerald-600' : pct >= 60 ? 'text-amber-600' : 'text-red-600'}`}>{pct}%</span>
                                            <div className="w-12 h-1.5 rounded-full bg-[var(--color-border)] overflow-hidden">
                                                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: pct >= 80 ? '#059669' : pct >= 60 ? '#d97706' : '#dc2626' }} />
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-3 py-2.5 text-center">
                                        {(() => {
                                            const lm = lastMonthMap[s.id]
                                            if (!lm) return <span className="text-[9px] text-[var(--color-text-muted)]">—</span>
                                            const delta = (r.H || 0) - (lm.H || 0)
                                            return (
                                                <span className={`text-[11px] font-black flex items-center justify-center gap-1 ${delta > 0 ? 'text-emerald-600' : delta < 0 ? 'text-red-600' : 'text-[var(--color-text-muted)]'}`}>
                                                    {delta > 0 && <FontAwesomeIcon icon={faArrowTrendUp} className="text-[9px]" />}
                                                    {delta < 0 && <FontAwesomeIcon icon={faArrowTrendDown} className="text-[9px]" />}
                                                    {delta > 0 ? `+${delta}` : delta}
                                                </span>
                                            )
                                        })()}
                                    </td>
                                    <td className="px-3 py-2.5 text-center">
                                        {rap
                                            ? synced
                                                ? <span className="inline-flex items-center gap-1 text-[9px] font-black text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded-md"><FontAwesomeIcon icon={faCircleCheck} className="text-[8px]" /> Sinkron</span>
                                                : <span className="inline-flex items-center gap-1 text-[9px] font-black text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded-md"><FontAwesomeIcon icon={faTriangleExclamation} className="text-[8px]" /> Beda</span>
                                            : <span className="text-[9px] text-[var(--color-text-muted)] font-bold">Belum ada</span>
                                        }
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

// ─── ConfirmModal ──────────────────────────────────────────────────────────────

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
                    <button onClick={onCancel}
                        className="flex-1 h-9 rounded-xl border border-[var(--color-border)] text-[11px] font-black text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] transition-all">
                        Batal
                    </button>
                    <button onClick={onConfirm}
                        className="flex-1 h-9 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-black transition-all">
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    )
}

// ─── TutorialModal ────────────────────────────────────────────────────────────

function TutorialModal({ onClose }) {
    const [step, setStep] = useState(0)

    const SLIDES = [
        {
            icon: faCalendarDays,
            iconColor: 'text-emerald-500',
            iconBg: 'bg-emerald-500/15',
            title: 'Selamat Datang di Absensi Bulanan',
            subtitle: 'Format baru — lebih detail, lebih mudah',
            body: (
                <div className="space-y-3 text-[11px] text-[var(--color-text)] leading-relaxed">
                    <div className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]">
                        <p className="font-black mb-1 flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-full bg-emerald-500 text-white text-[9px] font-black flex items-center justify-center shrink-0">1</span>
                            Pilih Kelas & Bulan
                        </p>
                        <p className="text-[var(--color-text-muted)] pl-6">Gunakan dropdown kelas di kiri dan tombol navigasi bulan untuk memilih periode absensi yang ingin diisi.</p>
                    </div>
                    <div className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]">
                        <p className="font-black mb-1 flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-full bg-emerald-500 text-white text-[9px] font-black flex items-center justify-center shrink-0">2</span>
                            Isi Absensi Harian
                        </p>
                        <p className="text-[var(--color-text-muted)] pl-6">Tabel menampilkan 31 kolom tanggal. Klik sel untuk mengisi status kehadiran siswa per hari.</p>
                    </div>
                    <div className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]">
                        <p className="font-black mb-1 flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-full bg-emerald-500 text-white text-[9px] font-black flex items-center justify-center shrink-0">3</span>
                            Simpan & Sync ke Raport
                        </p>
                        <p className="text-[var(--color-text-muted)] pl-6">Tekan Simpan atau Ctrl+S. Setelah tersimpan, gunakan tab Rekap untuk sinkronisasi data ke Raport bulanan.</p>
                    </div>
                </div>
            ),
            tips: 'Tabel ini menggantikan format mingguan lama. Semua data tersimpan per hari sehingga detail kehadiran bisa dilacak kapan saja.',
        },
        {
            icon: faArrowPointer,
            iconColor: 'text-indigo-500',
            iconBg: 'bg-indigo-500/15',
            title: 'Cara Mengisi Sel Absensi',
            subtitle: 'Klik sel untuk ganti status — cycling otomatis',
            body: (
                <div className="space-y-2.5 text-[11px] text-[var(--color-text)] leading-relaxed">
                    <p className="text-[var(--color-text-muted)]">Setiap klik pada sel akan berpindah ke status berikutnya secara berurutan:</p>
                    {/* Satu baris: badge + panah */}
                    <div className="flex items-center gap-1 flex-nowrap">
                        {[...STATUS_LIST, ''].map((s, i) => (
                            <div key={i} className="flex items-center gap-1 shrink-0">
                                {s
                                    ? <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-[12px] font-black border ${STATUS_META[s].cellBg} ${STATUS_META[s].color}`}>{s}</span>
                                    : <span className="w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-black border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-text-muted)]">—</span>
                                }
                                {i < 5 && <FontAwesomeIcon icon={faChevronRight} className="text-[var(--color-text-muted)] opacity-25 text-[8px] shrink-0" />}
                            </div>
                        ))}
                    </div>
                    {/* Legend: huruf → label */}
                    <div className="grid grid-cols-3 gap-1.5">
                        {STATUS_LIST.map(s => (
                            <div key={s} className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border ${STATUS_META[s].cellBg} ${STATUS_META[s].cellBorder}`}>
                                <span className={`text-[11px] font-black ${STATUS_META[s].color}`}>{s}</span>
                                <span className="text-[9px] font-bold text-[var(--color-text-muted)]">=</span>
                                <span className={`text-[10px] font-black ${STATUS_META[s].color}`}>{STATUS_META[s].label}</span>
                            </div>
                        ))}
                        <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)]">
                            <span className="text-[11px] font-black text-[var(--color-text-muted)]">—</span>
                            <span className="text-[9px] font-bold text-[var(--color-text-muted)]">=</span>
                            <span className="text-[10px] font-black text-[var(--color-text-muted)]">Kosong</span>
                        </div>
                    </div>
                    <div className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] mt-2">
                        <p className="font-bold text-[var(--color-text-muted)] mb-2">Keterangan kolom warna:</p>
                        <div className="space-y-1.5">
                            <div className="flex items-start gap-2">
                                <span className="w-5 h-5 rounded-full bg-red-400/20 border border-red-400/30 flex items-center justify-center shrink-0 mt-0.5">
                                    <FontAwesomeIcon icon={faCalendarDays} className="text-red-400 text-[7px]" />
                                </span>
                                <span className="text-[10px] text-[var(--color-text-muted)]">Kolom <b>Sabtu &amp; Minggu</b> — angka merah &amp; redup, tetap bisa diisi jika sekolah masuk</span>
                            </div>
                            <div className="flex items-start gap-2">
                                <span className="w-5 h-5 rounded-lg bg-[var(--color-surface-alt)] border border-[var(--color-border)] flex items-center justify-center shrink-0 mt-0.5">
                                    <FontAwesomeIcon icon={faCircleXmark} className="text-[var(--color-text-muted)]/30 text-[8px]" />
                                </span>
                                <span className="text-[10px] text-[var(--color-text-muted)]">Kolom <b>tanggal tidak valid</b> (misal Feb 30–31) — disabled otomatis, tidak bisa diklik</span>
                            </div>
                        </div>
                    </div>
                </div>
            ),
            tips: 'Klik lagi saat sudah Pulang Awal (P) akan balik ke kosong. Siklus: kosong → H → S → I → A → P → kosong.',
        },
        {
            icon: faListCheck,
            iconColor: 'text-rose-500',
            iconBg: 'bg-rose-500/15',
            title: 'Aksi Massal',
            subtitle: 'Isi banyak siswa sekaligus dengan cepat',
            body: (
                <div className="space-y-3 text-[11px] text-[var(--color-text)] leading-relaxed">
                    <p className="text-[var(--color-text-muted)]">Tombol <strong>Aksi Massal</strong> di toolbar memungkinkan kamu mengisi semua hari kerja (Senin–Jumat) untuk semua siswa sekaligus.</p>
                    <div className="grid grid-cols-2 gap-2">
                        {STATUS_LIST.map(s => (
                            <div key={s} className={`flex items-center gap-2 p-2 rounded-xl border ${STATUS_META[s].cellBg} ${STATUS_META[s].cellBorder}`}>
                                <span className={`w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-black border ${STATUS_META[s].cellBg} ${STATUS_META[s].color}`}>{s}</span>
                                <div>
                                    <p className={`text-[10px] font-black ${STATUS_META[s].color}`}>{STATUS_META[s].label}</p>
                                    <p className="text-[9px] text-[var(--color-text-muted)]">Isi semua hari kerja</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="p-2.5 rounded-xl border border-red-500/20 bg-red-500/5 flex items-center gap-2">
                        <FontAwesomeIcon icon={faArrowsRotate} className="text-red-500 text-[11px] shrink-0" />
                        <p className="text-[10px] text-red-600"><strong>Reset Semua</strong> — hapus seluruh isian bulan ini dan mulai dari kosong.</p>
                    </div>
                </div>
            ),
            tips: 'Aksi massal berguna untuk awal bulan — isi semua Hadir dulu, lalu koreksi siswa yang tidak hadir satu per satu.',
        },
        {
            icon: faFloppyDisk,
            iconColor: 'text-sky-500',
            iconBg: 'bg-sky-500/15',
            title: 'Simpan, Draft & Ctrl+S',
            subtitle: 'Data aman meski koneksi terputus',
            body: (
                <div className="space-y-3 text-[11px] text-[var(--color-text)] leading-relaxed">
                    <div className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]">
                        <p className="font-black mb-1 flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-lg bg-sky-500/15 border border-sky-500/20 flex items-center justify-center shrink-0">
                                <FontAwesomeIcon icon={faFloppyDisk} className="text-sky-500 text-[8px]" />
                            </span>
                            Simpan ke Server
                        </p>
                        <p className="text-[var(--color-text-muted)]">Klik tombol <strong>Simpan Perubahan</strong> di pojok kanan bawah tabel, atau gunakan pintasan <strong>Ctrl+S</strong> (Cmd+S di Mac) untuk menyimpan ke database.</p>
                    </div>
                    <div className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]">
                        <p className="font-black mb-1 flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-lg bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center shrink-0">
                                <FontAwesomeIcon icon={faTableList} className="text-indigo-500 text-[8px]" />
                            </span>
                            Auto-Draft Lokal
                        </p>
                        <p className="text-[var(--color-text-muted)]">Setiap perubahan otomatis disimpan sebagai draft di browser (0.5 detik setelah mengetik). Jika tiba-tiba browser tertutup, draft bisa dipulihkan saat membuka halaman kembali.</p>
                    </div>
                    <div className="p-3 rounded-xl border border-amber-500/20 bg-amber-500/5">
                        <p className="font-black text-amber-600 mb-1 flex items-center gap-1.5">
                            <FontAwesomeIcon icon={faTriangleExclamation} className="text-amber-500 text-[10px]" />
                            Floating Save Bar
                        </p>
                        <p className="text-amber-700/70">Bar oranye di bagian bawah layar muncul jika ada perubahan belum disimpan. Klik <strong>Reset</strong> untuk membatalkan atau <strong>Simpan</strong> untuk menyimpan.</p>
                    </div>
                </div>
            ),
            tips: 'Draft lokal hanya tersimpan di browser yang sama. Jika membuka dari perangkat lain, data hanya tersedia setelah disimpan ke server.',
        },
        {
            icon: faChartSimple,
            iconColor: 'text-violet-500',
            iconBg: 'bg-violet-500/15',
            title: 'Tab Rekap & Sync ke Raport',
            subtitle: 'Akumulasi dan sinkronisasi data absensi',
            body: (
                <div className="space-y-3 text-[11px] text-[var(--color-text)] leading-relaxed">
                    <p className="text-[var(--color-text-muted)]">Tab <strong>Rekap</strong> menampilkan akumulasi H/S/I/A/P per siswa untuk bulan yang dipilih, beserta persentase kehadiran.</p>
                    <div className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]">
                        <p className="font-black mb-1 text-violet-600 flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-lg bg-violet-500/15 border border-violet-500/20 flex items-center justify-center shrink-0">
                                <FontAwesomeIcon icon={faArrowsRotate} className="text-violet-500 text-[8px]" />
                            </span>
                            Sync ke Raport
                        </p>
                        <p className="text-[var(--color-text-muted)]">Tombol <strong>Sync ke Raport</strong> menyalin data S/I/A/P ke tabel <code className="text-[9px] bg-[var(--color-border)] px-1 py-0.5 rounded">student_monthly_reports</code> yang dipakai halaman Raport.</p>
                    </div>
                    <div className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]">
                        <p className="font-black mb-1 flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-lg bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center shrink-0">
                                <FontAwesomeIcon icon={faFileExport} className="text-emerald-500 text-[8px]" />
                            </span>
                            Export Excel
                        </p>
                        <p className="text-[var(--color-text-muted)]">Download data absensi lengkap (per hari + rekap) dalam format .xlsx. Kolom tanggal menampilkan kode H/S/I/A/P.</p>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded-xl border border-red-500/20 bg-red-500/5">
                        <FontAwesomeIcon icon={faTriangleExclamation} className="text-red-500 shrink-0" />
                        <p className="text-[10px] text-red-600">Siswa alpa <strong>≥ 3 hari</strong> ditandai merah di rekap sebagai peringatan perhatian khusus.</p>
                    </div>
                </div>
            ),
            tips: 'Selalu klik Simpan sebelum pindah ke tab Rekap agar data yang ditampilkan sudah ter-update.',
        },
    ]

    const slide = SLIDES[step]
    const isLast = step === SLIDES.length - 1
    const isFirst = step === 0

    return createPortal(
        <div
            className="fixed inset-0 z-[203] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={e => { if (e.target === e.currentTarget) onClose() }}
        >
            <div
                className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
                role="dialog" aria-modal="true" aria-label="Tutorial Absensi"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[var(--color-border)]">
                    <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${slide.iconBg}`}>
                            <FontAwesomeIcon icon={slide.icon} className={`text-base ${slide.iconColor}`} />
                        </div>
                        <div>
                            <p className="text-[13px] font-black text-[var(--color-text)] leading-tight">{slide.title}</p>
                            <p className="text-[10px] text-[var(--color-text-muted)]">{slide.subtitle}</p>
                        </div>
                    </div>
                    <button onClick={onClose} aria-label="Tutup tutorial"
                        className="w-8 h-8 rounded-lg hover:bg-[var(--color-surface-alt)] flex items-center justify-center text-[var(--color-text-muted)] transition-all shrink-0">
                        <FontAwesomeIcon icon={faXmark} />
                    </button>
                </div>

                {/* Dot navigator */}
                <div className="flex items-center justify-center gap-1.5 pt-4 px-6">
                    {SLIDES.map((_, i) => (
                        <button key={i} onClick={() => setStep(i)}
                            className={`rounded-full transition-all ${i === step ? 'w-5 h-2 bg-emerald-500' : 'w-2 h-2 bg-[var(--color-border)] hover:bg-emerald-500/40'}`}
                            aria-label={`Slide ${i + 1}`} />
                    ))}
                    <span className="ml-2 text-[9px] text-[var(--color-text-muted)] font-bold">{step + 1}/{SLIDES.length}</span>
                </div>

                {/* Body */}
                <div className="px-6 pt-4 pb-2 overflow-y-auto flex-1">
                    {typeof slide.body === 'string'
                        ? <p className="text-[12px] text-[var(--color-text)] leading-relaxed">{slide.body}</p>
                        : slide.body
                    }
                </div>

                {/* Tips */}
                <div className="px-6 pb-2">
                    <div className="p-3 rounded-xl bg-emerald-500/8 border border-emerald-500/20 flex items-start gap-2">
                        <FontAwesomeIcon icon={faLightbulb} className="text-emerald-500 text-[11px] mt-0.5 shrink-0" />
                        <p className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 leading-snug">{slide.tips}</p>
                    </div>
                </div>

                {/* Footer nav */}
                <div className="flex items-center gap-3 px-6 py-4">
                    <button onClick={() => setStep(v => Math.max(0, v - 1))} disabled={isFirst}
                        className="h-9 px-4 rounded-xl border border-[var(--color-border)] text-[10px] font-black text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-all disabled:opacity-30 flex items-center gap-1.5">
                        <FontAwesomeIcon icon={faChevronLeft} className="text-[9px]" /> Sebelumnya
                    </button>
                    <div className="flex-1" />
                    {isLast ? (
                        <button onClick={onClose}
                            className="h-9 px-5 rounded-xl bg-emerald-500 text-white text-[10px] font-black hover:bg-emerald-600 transition-all flex items-center gap-1.5 shadow-lg shadow-emerald-500/20">
                            <FontAwesomeIcon icon={faCheck} className="text-[9px]" /> Selesai
                        </button>
                    ) : (
                        <button onClick={() => setStep(v => Math.min(SLIDES.length - 1, v + 1))}
                            className="h-9 px-5 rounded-xl bg-emerald-500 text-white text-[10px] font-black hover:bg-emerald-600 transition-all flex items-center gap-1.5 shadow-lg shadow-emerald-500/20">
                            Berikutnya <FontAwesomeIcon icon={faChevronRight} className="text-[9px]" />
                        </button>
                    )}
                </div>
            </div>
        </div>,
        document.body
    )
}


// ─── Guru Attendance Tab ─────────────────────────────────────────────────────
// (embedded directly — uses AttendancePage's imports and constants)

// ─── Constants ─────────────────────────────────────────────────────────────────

const HARI_NAMA = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
const HARI_KEY = ['minggu', 'senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu']

const JAM_MASUK = '07:00:00'
const JAM_KELUAR = '15:30:00'
// ── Potongan gaji per menit terlambat — sesuaikan kebijakan pesantren ──────────
const POTONGAN_PER_MENIT = 1000 // Rp 1.000 per menit (default)

const GURU_STATUS_META = {
    hadir: { label: 'Hadir', color: 'text-emerald-600', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', dot: 'bg-emerald-500' },
    terlambat: { label: 'Terlambat', color: 'text-amber-600', bg: 'bg-amber-500/10', border: 'border-amber-500/20', dot: 'bg-amber-500' },
    pulang_awal: { label: 'Pulang Awal', color: 'text-purple-600', bg: 'bg-purple-500/10', border: 'border-purple-500/20', dot: 'bg-purple-500' },
    alpha: { label: 'Alpha', color: 'text-red-600', bg: 'bg-red-500/10', border: 'border-red-500/20', dot: 'bg-red-500' },
    izin: { label: 'Izin', color: 'text-blue-600', bg: 'bg-blue-500/10', border: 'border-blue-500/20', dot: 'bg-blue-500' },
    sakit: { label: 'Sakit', color: 'text-orange-600', bg: 'bg-orange-500/10', border: 'border-orange-500/20', dot: 'bg-orange-500' },
    libur: { label: 'Libur', color: 'text-slate-500', bg: 'bg-slate-500/10', border: 'border-slate-500/20', dot: 'bg-slate-400' },
}

const GURU_LETTER_MAP = {
    hadir: 'H',
    terlambat: 'T',
    pulang_awal: 'P',
    alpha: 'A',
    izin: 'I',
    sakit: 'S',
    libur: 'L'
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function fmtDateG(d) {
    if (!d) return '—'
    const x = new Date(d)
    return `${x.getDate()} ${BULAN_NAMA[x.getMonth() + 1]} ${x.getFullYear()}`
}

function fmtTime(t) {
    if (!t) return '—'
    return t.slice(0, 5) // HH:MM
}

function timeToMinutes(t) {
    if (!t) return null
    const [h, m] = t.split(':').map(Number)
    return h * 60 + m
}


function calcStatus(scanIn, scanOut, workDays, dateStr) {
    const dow = new Date(dateStr).getDay()
    const dayKey = HARI_KEY[dow]
    if (!workDays.includes(dayKey)) return 'libur'
    if (!scanIn) return 'alpha'
    const inMins = timeToMinutes(scanIn)
    const limitIn = timeToMinutes(JAM_MASUK)  // 420
    const limitOut = timeToMinutes(JAM_KELUAR) // 930
    const outMins = scanOut ? timeToMinutes(scanOut) : null
    const terlambat = inMins > limitIn
    const pulangAwal = outMins !== null && outMins < limitOut
    if (terlambat) return 'terlambat'
    if (pulangAwal) return 'pulang_awal'
    return 'hadir'
}

function lateMins(scanIn) {
    if (!scanIn) return 0
    const inMins = timeToMinutes(scanIn)
    const limitIn = timeToMinutes(JAM_MASUK)
    return Math.max(0, inMins - limitIn)
}

function earlyLeaveMins(scanOut) {
    if (!scanOut) return 0
    const outMins = timeToMinutes(scanOut)
    const limitOut = timeToMinutes(JAM_KELUAR)
    return Math.max(0, limitOut - outMins)
}

// Parse Fingerspot XLS — returns array of { name, date, scan1, scan2, scan3, scan4 }
async function parseFingerspotXLS(file) {
    const XLSX = await import('xlsx')
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => {
            try {
                const wb = XLSX.read(e.target.result, { type: 'array' })
                const ws = wb.Sheets[wb.SheetNames[0]]
                const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })

                // Find header row
                let headerIdx = rows.findIndex(r =>
                    r.some(c => String(c).toLowerCase().includes('nama')) &&
                    r.some(c => String(c).toLowerCase().includes('tanggal'))
                )
                if (headerIdx === -1) headerIdx = 0

                const headers = rows[headerIdx].map(h => String(h).toLowerCase().trim())
                const colNama = headers.findIndex(h => h === 'nama')
                const colTgl = headers.findIndex(h => h === 'tanggal')
                const colS1 = headers.findIndex(h => h === 'scan 1' || h === 'scan1')
                const colS2 = headers.findIndex(h => h === 'scan 2' || h === 'scan2')
                const colS3 = headers.findIndex(h => h === 'scan 3' || h === 'scan3')
                const colS4 = headers.findIndex(h => h === 'scan 4' || h === 'scan4')

                const result = []
                let lastNama = ''

                for (let i = headerIdx + 1; i < rows.length; i++) {
                    const row = rows[i]
                    if (!row || row.every(c => c === '' || c === null)) continue

                    const nama = String(row[colNama] || '').trim() || lastNama
                    const tgl = String(row[colTgl] || '').trim()
                    if (!tgl || tgl.length < 8) continue

                    if (row[colNama]) lastNama = nama

                    // Parse DD-MM-YYYY to YYYY-MM-DD
                    let dateStr = tgl
                    if (tgl.includes('-')) {
                        const parts = tgl.split('-')
                        if (parts[0].length === 2) { // DD-MM-YYYY
                            dateStr = `${parts[2]}-${parts[1]}-${parts[0]}`
                        }
                    }

                    const getTime = (col) => {
                        if (col === -1) return null
                        const v = String(row[col] || '').trim()
                        return v.length >= 5 ? v.slice(0, 8) : null
                    }

                    result.push({
                        name: nama,
                        date: dateStr,
                        scan1: getTime(colS1),
                        scan2: getTime(colS2),
                        scan3: getTime(colS3),
                        scan4: getTime(colS4),
                    })
                }
                resolve(result)
            } catch (err) {
                reject(err)
            }
        }
        reader.onerror = reject
        reader.readAsArrayBuffer(file)
    })
}

// ─── StatusBadge ───────────────────────────────────────────────────────────────

function StatusBadge({ status, size = 'sm' }) {
    const meta = GURU_STATUS_META[status] || STATUS_META.alpha
    const sz = size === 'xs' ? 'text-[8px] px-1.5 py-0.5' : 'text-[9px] px-2 py-0.5'
    return (
        <span className={`inline-flex items-center gap-1 font-black rounded-full border ${sz} ${meta.bg} ${meta.border} ${meta.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${meta.dot}`} />
            {meta.label}
        </span>
    )
}

// ─── AttendanceSettingsModal ──────────────────────────────────────────────────

const DEFAULT_ATTENDANCE_SETTINGS = {
    jam_masuk: '07:00',
    jam_keluar: '15:30',
    standar_jam: 8,
    standar_menit: 0,
    potongan_nominal: 1000,
    potongan_interval: 5,
    lembur_enabled: true,
    lembur_nominal: 2000,
    lembur_interval: 60,
}

// Helper functions for AttendanceSettingsModal
const handleTimeChangeStatic = (form, set, key, val) => {
    let clean = val.replace(/[^0-9:]/g, '')
    if (clean.length > 5) clean = clean.slice(0, 5)
    if (clean.length === 2 && !clean.includes(':')) clean += ':'
    set(key, clean)
}

const InputRow = ({ label, sub, children, compact = false }) => (
    <div className={`flex items-center justify-between gap-4 border-b border-[var(--color-border)] last:border-0 ${compact ? 'py-2' : 'py-3'}`}>
        <div className="min-w-0">
            <p className="text-[12px] font-black text-[var(--color-text)] leading-none">{label}</p>
            {sub && <p className="text-[10px] text-[var(--color-text-muted)] mt-1 leading-tight">{sub}</p>}
        </div>
        <div className="shrink-0">{children}</div>
    </div>
)

function AttendanceSettingsModal({ settings, onSave, onClose }) {
    const [form, setForm] = useState({ ...DEFAULT_ATTENDANCE_SETTINGS, ...settings })
    const [saving, setSaving] = useState(false)
    const { addToast } = useToast()

    const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }))

    const fmtPotongan = () => {
        const rp = new Intl.NumberFormat('id-ID').format(form.potongan_nominal)
        return `Rp ${rp} per ${form.potongan_interval} menit telat`
    }

    const fmtLembur = () => {
        const rp = new Intl.NumberFormat('id-ID').format(form.lembur_nominal)
        return `Rp ${rp} per ${form.lembur_interval} menit lembur`
    }

    const handleSave = async () => {
        setSaving(true)
        const { error } = await supabase.from('teacher_attendance_config')
            .upsert({ id: 1, ...form, updated_at: new Date().toISOString() }, { onConflict: 'id' })
        setSaving(false)
        if (error) {
            addToast('Gagal menyimpan: ' + error.message, 'error')
        } else {
            await logAudit({ action: 'UPDATE', source: 'SYSTEM', tableName: 'teacher_attendance_config', recordId: '1', newData: form })
            addToast('Pengaturan absensi guru tersimpan ✓', 'success')
            onSave(form)
            onClose()
        }
    }

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={e => { if (e.target === e.currentTarget) onClose() }}>
            <div className="w-full max-w-3xl bg-[var(--color-surface)] rounded-[32px] border border-[var(--color-border)] shadow-2xl flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--color-border)]">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-[var(--color-primary)]/10 flex items-center justify-center">
                            <FontAwesomeIcon icon={faGear} className="text-[var(--color-primary)] text-lg" />
                        </div>
                        <div>
                            <p className="text-[15px] font-black text-[var(--color-text)]">Pengaturan Absensi Guru</p>
                            <p className="text-[11px] text-[var(--color-text-muted)]">Konfigurasi jam kerja, kebijakan potongan & lembur</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 rounded-2xl border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] transition-all">
                        <FontAwesomeIcon icon={faXmark} className="text-sm" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1 bg-[var(--color-surface-alt)]/30">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Kolom Kiri: Jam Kerja */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 px-1">
                                <FontAwesomeIcon icon={faClock} className="text-[10px] text-[var(--color-primary)]" />
                                <p className="text-[10px] font-black uppercase tracking-[0.1em] text-[var(--color-text-muted)]">Jadwal Jam Kerja</p>
                            </div>
                            <div className="bg-[var(--color-surface)] rounded-[24px] border border-[var(--color-border)] px-5 py-1 shadow-sm">
                                <InputRow label="Jam Masuk" sub="Waktu kedatangan guru agar tidak dihitung terlambat.">
                                    <div className="relative group">
                                        <input type="text" value={form.jam_masuk} placeholder="07:00"
                                            onChange={e => handleTimeChangeStatic(form, set, 'jam_masuk', e.target.value)}
                                            className="h-11 px-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[14px] font-black text-[var(--color-text)] outline-none focus:border-[var(--color-primary)] focus:bg-[var(--color-surface)] transition-all w-32 text-center shadow-sm" />
                                        <FontAwesomeIcon icon={faClock} className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[var(--color-text-muted)] group-focus-within:text-[var(--color-primary)] transition-colors pointer-events-none" />
                                    </div>
                                </InputRow>
                                <InputRow label="Jam Keluar" sub="Waktu minimal pulang agar tidak dihitung pulang awal.">
                                    <div className="relative group">
                                        <input type="text" value={form.jam_keluar} placeholder="15:30"
                                            onChange={e => handleTimeChangeStatic(form, set, 'jam_keluar', e.target.value)}
                                            className="h-11 px-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[14px] font-black text-[var(--color-text)] outline-none focus:border-[var(--color-primary)] focus:bg-[var(--color-surface)] transition-all w-32 text-center shadow-sm" />
                                        <FontAwesomeIcon icon={faClock} className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[var(--color-text-muted)] group-focus-within:text-[var(--color-primary)] transition-colors pointer-events-none" />
                                    </div>
                                </InputRow>
                                <InputRow label="Standar Kerja" sub="Durasi minimal kerja harian agar tidak dihitung pulang awal/lembur.">
                                    <div className="flex items-center gap-3">
                                        <div className="flex flex-col items-center gap-1">
                                            <input type="text" inputMode="numeric" placeholder="8"
                                                value={form.standar_jam}
                                                onChange={e => set('standar_jam', e.target.value.replace(/\D/g, ''))}
                                                className="h-11 w-12 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[15px] font-black text-[var(--color-text)] text-center outline-none focus:border-[var(--color-primary)] focus:bg-[var(--color-surface)] transition-all shadow-sm" />
                                            <span className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">Jam</span>
                                        </div>
                                        <div className="flex flex-col items-center gap-1">
                                            <input type="text" inputMode="numeric" placeholder="0"
                                                value={form.standar_menit}
                                                onChange={e => set('standar_menit', e.target.value.replace(/\D/g, ''))}
                                                className="h-11 w-16 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[15px] font-black text-[var(--color-text)] text-center outline-none focus:border-[var(--color-primary)] focus:bg-[var(--color-surface)] transition-all shadow-sm" />
                                            <span className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">Menit</span>
                                        </div>
                                    </div>
                                </InputRow>
                            </div>
                        </div>

                        {/* Kolom Kanan: Kebijakan Potongan & Lembur */}
                        <div className="space-y-4">
                            {/* Potongan */}
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 px-1">
                                    <FontAwesomeIcon icon={faMoneyBillWave} className="text-[10px] text-amber-500" />
                                    <p className="text-[10px] font-black uppercase tracking-[0.1em] text-[var(--color-text-muted)]">Kebijakan Potongan</p>
                                </div>
                                <div className="bg-[var(--color-surface)] rounded-[24px] border border-[var(--color-border)] px-5 py-1 shadow-sm">
                                    <InputRow label="Potongan Gaji">
                                        <div className="flex items-center gap-1 bg-[var(--color-surface-alt)] p-1 rounded-2xl border border-[var(--color-border)] h-11 shrink-0">
                                            <div className="flex items-center gap-1 px-2.5 border-r border-[var(--color-border)] h-full">
                                                <span className="text-[10px] font-black text-[var(--color-text-muted)] tracking-tighter">RP</span>
                                                <input type="number" min={0} step={500} value={form.potongan_nominal} onChange={e => set('potongan_nominal', +e.target.value)}
                                                    className="w-14 bg-transparent text-[14px] font-black text-[var(--color-text)] outline-none text-right" />
                                            </div>
                                            <div className="flex items-center gap-1.5 px-2.5 h-full">
                                                <span className="text-[10px] font-black text-[var(--color-text-muted)] tracking-tighter">PER</span>
                                                <input type="number" min={1} max={60} value={form.potongan_interval} onChange={e => set('potongan_interval', +e.target.value)}
                                                    className="w-10 bg-transparent text-[14px] font-black text-[var(--color-text)] outline-none text-center" />
                                                <span className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-tighter">MENIT</span>
                                            </div>
                                        </div>
                                    </InputRow>
                                </div>
                            </div>

                            {/* Lembur */}
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 px-1">
                                    <FontAwesomeIcon icon={faArrowTrendUp} className="text-[10px] text-purple-500" />
                                    <p className="text-[10px] font-black uppercase tracking-[0.1em] text-[var(--color-text-muted)]">Lembur & Ekstra</p>
                                </div>
                                <div className="bg-[var(--color-surface)] rounded-[24px] border border-[var(--color-border)] px-5 py-1 shadow-sm">
                                    <div className="flex items-center justify-between py-2.5 border-b border-[var(--color-border)]">
                                        <div>
                                            <p className="text-[12px] font-black text-[var(--color-text)]">Status Lembur</p>
                                            <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5 leading-none">Aktifkan kalkulasi otomatis</p>
                                        </div>
                                        <button onClick={() => set('lembur_enabled', !form.lembur_enabled)}
                                            className={`w-10 h-5.5 rounded-full transition-all relative ${form.lembur_enabled ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'}`}>
                                            <div className={`absolute top-1 w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-all ${form.lembur_enabled ? 'left-[calc(100%-18px)]' : 'left-1'}`} />
                                        </button>
                                    </div>
                                    {form.lembur_enabled && (
                                        <InputRow label="Biaya Lembur">
                                            <div className="flex items-center gap-1 bg-[var(--color-surface-alt)] p-1 rounded-2xl border border-[var(--color-border)] h-11 shrink-0">
                                                <div className="flex items-center gap-1 px-2.5 border-r border-[var(--color-border)] h-full">
                                                    <span className="text-[10px] font-black text-[var(--color-text-muted)] tracking-tighter">RP</span>
                                                    <input type="number" min={0} step={500} value={form.lembur_nominal} onChange={e => set('lembur_nominal', +e.target.value)}
                                                        className="w-14 bg-transparent text-[14px] font-black text-[var(--color-text)] outline-none text-right" />
                                                </div>
                                                <div className="flex items-center gap-1.5 px-2.5 h-full">
                                                    <span className="text-[10px] font-black text-[var(--color-text-muted)] tracking-tighter">PER</span>
                                                    <input type="number" min={1} max={120} value={form.lembur_interval} onChange={e => set('lembur_interval', +e.target.value)}
                                                        className="w-10 bg-transparent text-[14px] font-black text-[var(--color-text)] outline-none text-center" />
                                                    <span className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-tighter">MENIT</span>
                                                </div>
                                            </div>
                                        </InputRow>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Info Note Full Width */}
                    <div className="mt-8 flex items-start gap-4 p-4 rounded-[20px] bg-blue-500/5 border border-blue-500/10">
                        <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                            <FontAwesomeIcon icon={faTriangleExclamation} className="text-blue-500 text-sm" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[11px] font-black text-blue-700">Informasi Penting</p>
                            <p className="text-[10px] text-blue-600/80 leading-relaxed mt-0.5">
                                Parameter ini digunakan sebagai acuan perhitungan otomatis pada dashboard. Jam Masuk & Keluar wajib diisi dalam <strong>Format 24 Jam</strong>. Perubahan tidak akan mengubah data historis yang sudah tersimpan, namun mempengaruhi laporan saat ini.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-5 py-3 border-t border-[var(--color-border)] flex gap-2 justify-end bg-[var(--color-surface)]">
                    <button onClick={onClose} className="h-9 px-4 rounded-xl border border-[var(--color-border)] text-[10px] font-black text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-all">Batal</button>
                    <button onClick={handleSave} disabled={saving}
                        className="h-9 px-5 rounded-xl bg-[var(--color-primary)] text-white text-[10px] font-black hover:opacity-90 transition-all flex items-center gap-2 disabled:opacity-60">
                        {saving ? <FontAwesomeIcon icon={faSpinner} className="animate-spin" /> : <FontAwesomeIcon icon={faSave} />}
                        Simpan Pengaturan
                    </button>
                </div>
            </div>
        </div>,
        document.body
    )
}

// ─── HistoryDrawer ─────────────────────────────────────────────────────────────

function HistoryDrawer({ teacher, onClose, settings = DEFAULT_ATTENDANCE_SETTINGS }) {
    const [records, setRecords] = useState([])
    const [loading, setLoading] = useState(true)
    const [filterMonth, setFilterMonth] = useState('')
    const now = new Date()

    useEffect(() => {
        if (!teacher) return
        setLoading(true)
        supabase.from('teacher_attendance')
            .select('*')
            .eq('teacher_id', teacher.id)
            .order('date', { ascending: false })
            .limit(120)
            .then(({ data }) => { setRecords(data || []); setLoading(false) })
    }, [teacher])

    const filtered = useMemo(() => {
        if (!filterMonth) return records
        return records.filter(r => r.date?.slice(0, 7) === filterMonth)
    }, [records, filterMonth])

    const months = useMemo(() => {
        const s = new Set(records.map(r => r.date?.slice(0, 7)).filter(Boolean))
        return [...s].sort().reverse()
    }, [records])

    // ── Kalkulasi jam kerja & lembur ──────────────────────────────────────────
    const calcWorkMinutes = (scanIn, scanOut) => {
        if (!scanIn || !scanOut) return null
        const [h1, m1] = scanIn.split(':').map(Number)
        const [h2, m2] = scanOut.split(':').map(Number)
        const total = (h2 * 60 + m2) - (h1 * 60 + m1)
        return total > 0 ? total : null
    }

    const fmtDuration = (minutes) => {
        if (!minutes || minutes <= 0) return '—'
        const h = Math.floor(minutes / 60)
        const m = minutes % 60
        return m > 0 ? `${h}j ${m}m` : `${h}j`
    }

    const STANDARD_WORK_MINUTES = ((settings.standar_jam ?? 8) * 60) + (settings.standar_menit ?? 0)

    const calcPotongan = (lateMinutes) => {
        if (!lateMinutes || lateMinutes <= 0) return 0
        const interval = settings.potongan_interval ?? 5
        const nominal = settings.potongan_nominal ?? 1000
        return Math.floor(lateMinutes / interval) * nominal
    }

    const calcLembur = (extraMinutes) => {
        if (!extraMinutes || extraMinutes <= 0 || !settings.lembur_enabled) return 0
        const interval = settings.lembur_interval ?? 60
        const nominal = settings.lembur_nominal ?? 2000
        return Math.floor(extraMinutes / interval) * nominal
    }

    const fmtRupiah = (n) => {
        if (!n) return '—'
        return 'Rp ' + new Intl.NumberFormat('id-ID').format(n)
    }

    const stats = useMemo(() => {
        const src = filtered.filter(r => r.status !== 'libur')
        let totalWorkMin = 0, totalLemburMin = 0, workDayCount = 0, totalLateMin = 0, totalPotongan = 0, totalLemburPay = 0
        for (const r of src) {
            const wm = calcWorkMinutes(r.scan_in, r.scan_out)
            if (wm !== null) {
                totalWorkMin += wm
                workDayCount++
                if (wm > STANDARD_WORK_MINUTES) {
                    const extra = wm - STANDARD_WORK_MINUTES
                    totalLemburMin += extra
                    totalLemburPay += calcLembur(extra)
                }
            }
            if (r.late_minutes > 0) {
                totalLateMin += r.late_minutes
                totalPotongan += calcPotongan(r.late_minutes)
            }
        }
        return {
            hadir: src.filter(r => r.status === 'hadir').length,
            terlambat: src.filter(r => r.status === 'terlambat').length,
            alpha: src.filter(r => r.status === 'alpha').length,
            total: src.length,
            totalWorkMin,
            totalLemburMin,
            avgWorkMin: workDayCount > 0 ? Math.round(totalWorkMin / workDayCount) : 0,
            workDayCount,
            totalLateMin,
            totalPotongan,
            totalLemburPay,
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filtered, settings])

    if (!teacher) return null

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={e => { if (e.target === e.currentTarget) onClose() }}>
            <div className="w-full max-w-lg bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] shadow-2xl flex flex-col max-h-[88vh] overflow-hidden">

                {/* Header */}
                <div className="sticky top-0 bg-[var(--color-surface)] border-b border-[var(--color-border)] px-5 py-4 flex items-center gap-3 z-10 rounded-t-3xl shrink-0">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] flex items-center justify-center text-white font-black text-base shrink-0">
                        {teacher.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-black text-[var(--color-text)] truncate">{teacher.name}</p>
                        <p className="text-[10px] text-[var(--color-text-muted)]">{teacher.type ? teacher.type.charAt(0).toUpperCase() + teacher.type.slice(1) : 'Guru'} · Riwayat Kehadiran</p>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-xl border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors">
                        <FontAwesomeIcon icon={faXmark} className="text-xs" />
                    </button>
                </div>

                <div className="p-5 space-y-4 flex-1 overflow-y-auto">
                    {/* Stats kehadiran */}
                    <div className="grid grid-cols-3 gap-2">
                        {[
                            { label: 'Hadir', val: stats.hadir, color: 'text-emerald-600', bg: 'bg-emerald-500/8', border: 'border-emerald-500/20' },
                            { label: 'Terlambat', val: stats.terlambat, color: 'text-amber-600', bg: 'bg-amber-500/8', border: 'border-amber-500/20' },
                            { label: 'Alpha', val: stats.alpha, color: 'text-red-600', bg: 'bg-red-500/8', border: 'border-red-500/20' },
                        ].map(s => (
                            <div key={s.label} className={`rounded-2xl border ${s.border} ${s.bg} p-3 text-center`}>
                                <p className={`text-xl font-black ${s.color}`}>{s.val}</p>
                                <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">{s.label}</p>
                            </div>
                        ))}
                    </div>

                    {/* Stats jam kerja & lembur */}
                    <div className="grid grid-cols-3 gap-2">
                        {[
                            { label: 'Total Jam', val: fmtDuration(stats.totalWorkMin), color: 'text-blue-600', bg: 'bg-blue-500/8', border: 'border-blue-500/20', icon: faClockRotateLeft },
                            { label: 'Rata-rata', val: fmtDuration(stats.avgWorkMin), color: 'text-indigo-600', bg: 'bg-indigo-500/8', border: 'border-indigo-500/20', icon: faChartSimple },
                            { label: 'Total Lembur', val: settings.lembur_enabled !== false ? fmtDuration(stats.totalLemburMin) : '—', color: stats.totalLemburMin > 0 && settings.lembur_enabled !== false ? 'text-purple-600' : 'text-[var(--color-text-muted)]', bg: stats.totalLemburMin > 0 && settings.lembur_enabled !== false ? 'bg-purple-500/8' : 'bg-[var(--color-surface-alt)]', border: stats.totalLemburMin > 0 && settings.lembur_enabled !== false ? 'border-purple-500/20' : 'border-[var(--color-border)]', icon: faArrowTrendUp },
                        ].map(s => (
                            <div key={s.label} className={`rounded-2xl border ${s.border} ${s.bg} p-3 text-center`}>
                                <p className={`text-[15px] font-black tabular-nums ${s.color}`}>{s.val}</p>
                                <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mt-0.5">{s.label}</p>
                            </div>
                        ))}
                    </div>

                    {/* Potongan & total terlambat */}
                    {stats.terlambat > 0 && (
                        <div className="grid grid-cols-2 gap-2">
                            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3 text-center">
                                <p className="text-[15px] font-black tabular-nums text-amber-600">{stats.totalLateMin}m</p>
                                <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mt-0.5">Total Terlambat</p>
                            </div>
                            <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-3 text-center">
                                <p className="text-[13px] font-black tabular-nums text-red-600">{fmtRupiah(stats.totalPotongan)}</p>
                                <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mt-0.5">Est. Potongan</p>
                            </div>
                        </div>
                    )}

                    {stats.totalLemburMin > 0 && settings.lembur_enabled !== false && (
                        <div className="px-3 py-2 rounded-xl bg-purple-500/5 border border-purple-500/15 flex items-center gap-2">
                            <FontAwesomeIcon icon={faArrowTrendUp} className="text-purple-500 text-xs shrink-0" />
                            <p className="text-[10px] text-purple-700 font-bold">
                                Lembur dihitung dari kelebihan di atas <strong>{settings.standar_jam ?? 8} jam/hari</strong> standar kerja.
                            </p>
                        </div>
                    )}

                    {/* Filter bulan */}
                    <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
                        className="w-full h-9 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[11px] font-black text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]">
                        <option value="">Semua Bulan</option>
                        {months.map(m => {
                            const [y, mo] = m.split('-')
                            return <option key={m} value={m}>{BULAN_NAMA[parseInt(mo)]} {y}</option>
                        })}
                    </select>

                    {/* Records */}
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <FontAwesomeIcon icon={faSpinner} className="animate-spin text-xl text-[var(--color-primary)]" />
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="text-center py-12 text-[var(--color-text-muted)]">
                            <p className="text-[12px] font-black">Belum ada data</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {filtered.map(r => {
                                const workMin = calcWorkMinutes(r.scan_in, r.scan_out)
                                const lemburMin = workMin !== null && workMin > STANDARD_WORK_MINUTES
                                    ? workMin - STANDARD_WORK_MINUTES : 0
                                const potonganRec = r.late_minutes > 0 ? calcPotongan(r.late_minutes) : 0
                                return (
                                    <div key={r.id} className="rounded-2xl border border-[var(--color-border)] p-3 flex items-center gap-3 hover:bg-[var(--color-surface-alt)]/40 transition-colors">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <p className="text-[11px] font-black text-[var(--color-text)]">{fmtDateG(r.date)}</p>
                                                <p className="text-[9px] text-[var(--color-text-muted)]">
                                                    {HARI_NAMA[new Date(r.date).getDay()]}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <p className="text-[10px] text-[var(--color-text-muted)] tabular-nums">
                                                    {fmtTime(r.scan_in)} → {fmtTime(r.scan_out)}
                                                </p>
                                                {workMin !== null && (
                                                    <span className="text-[9px] font-black text-blue-600 bg-blue-500/8 px-1.5 py-0.5 rounded-md border border-blue-500/20">
                                                        {fmtDuration(workMin)}
                                                    </span>
                                                )}
                                                {r.late_minutes > 0 && (
                                                    <span className="text-[9px] font-black text-amber-600 bg-amber-500/8 px-1.5 py-0.5 rounded-md border border-amber-500/20">
                                                        terlambat +{r.late_minutes}m
                                                    </span>
                                                )}
                                                {potonganRec > 0 && (
                                                    <span className="text-[9px] font-black text-red-600 bg-red-500/8 px-1.5 py-0.5 rounded-md border border-red-500/20">
                                                        −{fmtRupiah(potonganRec)}
                                                    </span>
                                                )}
                                                {lemburMin > 0 && settings.lembur_enabled !== false && (
                                                    <span className="text-[9px] font-black text-purple-600 bg-purple-500/8 px-1.5 py-0.5 rounded-md border border-purple-500/20">
                                                        lembur +{fmtDuration(lemburMin)}
                                                    </span>
                                                )}
                                                {r.early_leave_minutes > 0 && (
                                                    <span className="text-[9px] text-purple-600 font-bold bg-purple-500/8 px-1.5 py-0.5 rounded-md border border-purple-500/20">
                                                        pulang −{r.early_leave_minutes}m
                                                    </span>
                                                )}
                                            </div>
                                            {r.notes && <p className="text-[9px] text-[var(--color-text-muted)] mt-1">"{r.notes}"</p>}
                                        </div>
                                        <StatusBadge status={r.status} size="xs" />
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    )
}

// ─── ImportModal ───────────────────────────────────────────────────────────────

function FingerspotImportModal({ teachers, onClose, onImported }) {
    const { addToast } = useToast()
    const { profile } = useAuth()
    const fileRef = useRef(null)
    const [step, setStep] = useState(1) // 1=upload, 2=mapping, 3=preview, 4=importing
    const [parsing, setParsing] = useState(false)
    const [rawRows, setRawRows] = useState([])
    const [nameMap, setNameMap] = useState({}) // fingerspotName → teacherId
    const [importing, setImporting] = useState(false)
    const [progress, setProgress] = useState({ done: 0, total: 0 })

    const fingerspotNames = useMemo(() => [...new Set(rawRows.map(r => r.name))].sort(), [rawRows])

    const unmapped = useMemo(() =>
        fingerspotNames.filter(n => !nameMap[n]),
        [fingerspotNames, nameMap]
    )

    // ── Auto-match by similarity ──────────────────────────────────────────────
    useEffect(() => {
        if (!fingerspotNames.length || !teachers.length) return

        // Jaro similarity
        const jaro = (s1, s2) => {
            if (s1 === s2) return 1
            const len1 = s1.length, len2 = s2.length
            const matchDist = Math.floor(Math.max(len1, len2) / 2) - 1
            const s1m = new Array(len1).fill(false)
            const s2m = new Array(len2).fill(false)
            let matches = 0, transpositions = 0
            for (let i = 0; i < len1; i++) {
                const start = Math.max(0, i - matchDist)
                const end = Math.min(i + matchDist + 1, len2)
                for (let j = start; j < end; j++) {
                    if (s2m[j] || s1[i] !== s2[j]) continue
                    s1m[i] = true; s2m[j] = true; matches++; break
                }
            }
            if (!matches) return 0
            let k = 0
            for (let i = 0; i < len1; i++) {
                if (!s1m[i]) continue
                while (!s2m[k]) k++
                if (s1[i] !== s2[k]) transpositions++
                k++
            }
            return (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3
        }

        // Jaro-Winkler: boost if prefix matches
        const jw = (s1, s2) => {
            const j = jaro(s1, s2)
            let prefix = 0
            for (let i = 0; i < Math.min(4, s1.length, s2.length); i++) {
                if (s1[i] === s2[i]) prefix++; else break
            }
            return j + prefix * 0.1 * (1 - j)
        }

        // Common Indonesian name abbreviation expansions
        const INITIALS = {
            m: ['muhammad', 'mohammad', 'moh', 'muhamad', 'mochamad', 'mohamad'],
            a: ['abdul', 'ahmad', 'achmad', 'agus'],
            s: ['siti', 'sri', 'slamet', 'sulaiman'],
            n: ['nur', 'noor', 'nurul'],
            r: ['raden', 'rizky', 'rizki'],
            h: ['haji', 'hasan'],
        }

        // Return all name variants (original + abbreviated expansions)
        const variants = (name) => {
            const words = name.toLowerCase().replace(/\s+/g, ' ').trim().split(' ')
            const result = [words]
            if (words[0].length === 1 && INITIALS[words[0]]) {
                INITIALS[words[0]].forEach(exp => result.push([exp, ...words.slice(1)]))
            }
            return result
        }

        // Score a fingerspot name against a teacher name (0-1)
        const score = (fpName, teacherName) => {
            const tNorm = teacherName.toLowerCase().replace(/\s+/g, ' ').trim()
            const tWords = tNorm.split(' ')
            let best = 0
            for (const fpWords of variants(fpName)) {
                if (fpWords.join(' ') === tNorm) return 1.0

                // Single-word fp name: exact match against ANY word in teacher name
                // e.g. "Rasyidi" → "Ali Rasyidi", "rifandi" → "Muhammad Rifandi"
                if (fpWords.length === 1) {
                    const wordMatch = tWords.some(tw => tw === fpWords[0])
                    if (wordMatch) { best = Math.max(best, 0.90); continue }
                    // Fuzzy single-word match against each teacher word
                    const fuzzyWord = Math.max(...tWords.map(tw => jw(fpWords[0], tw)))
                    if (fuzzyWord > 0.88) { best = Math.max(best, fuzzyWord * 0.92); continue }
                }

                const firstOk = fpWords[0] === tWords[0] || jw(fpWords[0], tWords[0]) > 0.88
                const lastOk = fpWords[fpWords.length - 1] === tWords[tWords.length - 1]
                if (firstOk && lastOk && fpWords.length >= 2) { best = Math.max(best, 0.95); continue }
                if (lastOk && fpWords.length >= 2) {
                    const midOk = fpWords.slice(0, -1).some(w => tWords.some(tw => jw(w, tw) > 0.85))
                    if (midOk) { best = Math.max(best, 0.88); continue }
                }
                best = Math.max(best, jw(fpWords.join(' '), tNorm))
            }
            return best
        }

        const THRESHOLD = 0.82
        const auto = {}

        fingerspotNames.forEach(fn => {
            // Priority: fingerspot_name field exact match
            const fpExact = teachers.find(t =>
                t.fingerspot_name &&
                t.fingerspot_name.toLowerCase().trim() === fn.toLowerCase().trim()
            )
            if (fpExact) { auto[fn] = fpExact.id; return }

            // Pick teacher with highest similarity score
            let bestScore = 0, bestTeacher = null
            teachers.forEach(t => {
                const s = score(fn, t.name)
                if (s > bestScore) { bestScore = s; bestTeacher = t }
            })
            if (bestScore >= THRESHOLD && bestTeacher) auto[fn] = bestTeacher.id
        })

        setNameMap(prev => ({ ...auto, ...prev }))
    }, [fingerspotNames, teachers])


    const handleFile = async (file) => {
        if (!file) return
        if (!file.name.match(/\.(xls|xlsx)$/i)) {
            addToast('Hanya file .xls atau .xlsx yang didukung', 'error'); return
        }
        setParsing(true)
        try {
            const rows = await parseFingerspotXLS(file)
            setRawRows(rows)
            setStep(2)
        } catch (e) {
            addToast('Gagal membaca file: ' + e.message, 'error')
        } finally {
            setParsing(false)
        }
    }

    // Build preview rows with computed status
    const previewRows = useMemo(() => {
        return rawRows.map(r => {
            const teacherId = nameMap[r.name]
            const teacher = teachers.find(t => t.id === teacherId)
            const workDays = teacher?.work_days || ['senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu']
            const scanIn = r.scan1
            const scanOut = r.scan2 || r.scan3 || r.scan4
            const status = teacherId ? calcStatus(scanIn, scanOut, workDays, r.date) : null
            return {
                ...r, teacherId, teacher, scanIn, scanOut, status,
                lateMinutes: lateMins(scanIn),
                earlyLeaveMinutes: earlyLeaveMins(scanOut),
            }
        }).filter(r => r.teacherId && r.status && r.status !== 'libur')
    }, [rawRows, nameMap, teachers])

    const handleImport = async () => {
        if (!previewRows.length) return
        setImporting(true)
        setProgress({ done: 0, total: previewRows.length })
        try {
            const CHUNK = 50
            for (let i = 0; i < previewRows.length; i += CHUNK) {
                const chunk = previewRows.slice(i, i + CHUNK).map(r => ({
                    teacher_id: r.teacherId,
                    date: r.date,
                    scan_in: r.scanIn,
                    scan_out: r.scanOut,
                    status: r.status,
                    late_minutes: r.lateMinutes,
                    early_leave_minutes: r.earlyLeaveMinutes,
                    source: 'fingerspot',
                    imported_by: profile?.id || null,
                }))
                const { error } = await supabase.from('teacher_attendance')
                    .upsert(chunk, { onConflict: 'teacher_id,date' })
                if (error) throw error
                setProgress({ done: Math.min(i + CHUNK, previewRows.length), total: previewRows.length })
            }
            await logAudit({
                action: 'INSERT', source: 'SYSTEM', tableName: 'teacher_attendance', recordId: null,
                newData: { source: 'fingerspot', count: previewRows.length }
            })
            addToast(`${previewRows.length} record absensi berhasil diimpor ✓`, 'success')
            onImported()
            onClose()
        } catch (e) {
            addToast('Gagal import: ' + e.message, 'error')
        } finally {
            setImporting(false)
        }
    }

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-2xl max-h-[90vh] bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] shadow-2xl flex flex-col overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-[var(--color-border)] flex items-center justify-between shrink-0">
                    <div>
                        <p className="text-[13px] font-black text-[var(--color-text)]">Import Fingerspot</p>
                        <p className="text-[10px] text-[var(--color-text-muted)]">
                            {step === 1 && 'Upload file XLS export dari Fingerspot Personnel'}
                            {step === 2 && `${fingerspotNames.length} nama ditemukan · ${unmapped.length} belum dipetakan`}
                            {step === 3 && `${previewRows.length} record siap diimpor`}
                        </p>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-xl border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
                        <FontAwesomeIcon icon={faXmark} className="text-xs" />
                    </button>
                </div>

                {/* Steps indicator */}
                <div className="px-6 py-3 border-b border-[var(--color-border)] flex items-center gap-2 shrink-0">
                    {['Upload', 'Mapping Nama', 'Preview'].map((s, i) => (
                        <div key={s} className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border transition-all
                                ${step > i + 1 ? 'bg-emerald-500 border-emerald-500 text-white' :
                                    step === i + 1 ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white' :
                                        'border-[var(--color-border)] text-[var(--color-text-muted)]'}`}>
                                {step > i + 1 ? <FontAwesomeIcon icon={faCheck} /> : i + 1}
                            </div>
                            <span className={`text-[10px] font-black ${step === i + 1 ? 'text-[var(--color-text)]' : 'text-[var(--color-text-muted)]'}`}>{s}</span>
                            {i < 2 && <FontAwesomeIcon icon={faArrowRight} className="text-[8px] text-[var(--color-border)]" />}
                        </div>
                    ))}
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6">
                    {/* Step 1 — Upload */}
                    {step === 1 && (
                        <div
                            className="border-2 border-dashed border-[var(--color-border)] rounded-2xl p-12 text-center cursor-pointer hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 transition-all"
                            onClick={() => fileRef.current?.click()}
                            onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]) }}
                            onDragOver={e => e.preventDefault()}
                        >
                            <input ref={fileRef} type="file" accept=".xls,.xlsx" className="hidden"
                                onChange={e => handleFile(e.target.files[0])} />
                            {parsing ? (
                                <FontAwesomeIcon icon={faSpinner} className="animate-spin text-3xl text-[var(--color-primary)] mb-4" />
                            ) : (
                                <FontAwesomeIcon icon={faUpload} className="text-3xl text-[var(--color-text-muted)] mb-4" />
                            )}
                            <p className="text-[13px] font-black text-[var(--color-text)]">{parsing ? 'Membaca file...' : 'Drag & drop atau klik untuk pilih file'}</p>
                            <p className="text-[10px] text-[var(--color-text-muted)] mt-1">Format: .xls atau .xlsx dari Fingerspot Personnel</p>
                        </div>
                    )}

                    {/* Step 2 — Mapping */}
                    {step === 2 && (
                        <div className="space-y-3">
                            <div className="p-3 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)]">
                                <p className="text-[10px] text-[var(--color-text-muted)]">
                                    Cocokkan nama di Fingerspot dengan guru di sistem. Nama yang sudah cocok otomatis terpilih.
                                    Kalau ada nama yang tidak perlu diimpor, biarkan kosong.
                                </p>
                            </div>
                            {fingerspotNames.map(fn => {
                                const mapped = nameMap[fn]
                                return (
                                    <div key={fn} className="glass rounded-2xl border border-[var(--color-border)] p-3 flex items-center gap-3">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[11px] font-black text-[var(--color-text)] truncate">{fn}</p>
                                            <p className="text-[9px] text-[var(--color-text-muted)]">Fingerspot</p>
                                        </div>
                                        <FontAwesomeIcon icon={mapped ? faLink : faLinkSlash}
                                            className={`text-xs shrink-0 ${mapped ? 'text-emerald-500' : 'text-[var(--color-text-muted)]'}`} />
                                        <select
                                            value={nameMap[fn] || ''}
                                            onChange={e => setNameMap(prev => ({ ...prev, [fn]: e.target.value || null }))}
                                            className="h-8 px-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[10px] font-black text-[var(--color-text)] outline-none focus:border-[var(--color-primary)] min-w-0 max-w-[180px]"
                                        >
                                            <option value="">— Abaikan —</option>
                                            {teachers.map(t => (
                                                <option key={t.id} value={t.id}>{t.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )
                            })}
                        </div>
                    )}

                    {/* Step 3 — Preview */}
                    {step === 3 && (
                        <div className="space-y-2">
                            {/* Summary stats */}
                            <div className="grid grid-cols-3 gap-2 mb-4">
                                {Object.entries(
                                    previewRows.reduce((acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc }, {})
                                ).map(([status, count]) => (
                                    <div key={status} className="glass rounded-2xl border border-[var(--color-border)] p-2 text-center">
                                        <p className="text-lg font-black text-[var(--color-text)]">{count}</p>
                                        <StatusBadge status={status} size="xs" />
                                    </div>
                                ))}
                            </div>
                            {/* Table preview */}
                            <div className="rounded-2xl border border-[var(--color-border)] overflow-hidden">
                                <div className="grid grid-cols-[1fr_100px_80px_80px_90px] gap-2 px-4 py-2 bg-[var(--color-surface-alt)] text-[8px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">
                                    {['Nama Guru', 'Tanggal', 'Masuk', 'Keluar', 'Status'].map(h => <div key={h}>{h}</div>)}
                                </div>
                                <div className="divide-y divide-[var(--color-border)] max-h-64 overflow-y-auto">
                                    {previewRows.map((r, i) => (
                                        <div key={i} className="grid grid-cols-[1fr_100px_80px_80px_90px] gap-2 px-4 py-2.5 hover:bg-[var(--color-surface-alt)]/50">
                                            <p className="text-[11px] font-bold text-[var(--color-text)] truncate">{r.teacher?.name}</p>
                                            <p className="text-[10px] text-[var(--color-text-muted)] tabular-nums">{r.date}</p>
                                            <p className="text-[10px] tabular-nums font-bold text-[var(--color-text)]">{fmtTime(r.scanIn)}</p>
                                            <p className="text-[10px] tabular-nums font-bold text-[var(--color-text)]">{fmtTime(r.scanOut)}</p>
                                            <StatusBadge status={r.status} size="xs" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-[var(--color-border)] flex items-center justify-between shrink-0">
                    <button onClick={() => step > 1 ? setStep(s => s - 1) : onClose()}
                        className="h-9 px-4 rounded-xl border border-[var(--color-border)] text-[11px] font-black text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors">
                        {step === 1 ? 'Batal' : '← Kembali'}
                    </button>
                    {step === 1 && (
                        <p className="text-[9px] text-[var(--color-text-muted)]">
                            Export dari Fingerspot Personnel → Report → Excel
                        </p>
                    )}
                    {step === 2 && (
                        <button onClick={() => setStep(3)}
                            className="h-9 px-4 rounded-xl bg-[var(--color-primary)] text-white text-[11px] font-black hover:brightness-110 transition-all">
                            Preview → ({rawRows.length} baris)
                        </button>
                    )}
                    {step === 3 && (
                        <button onClick={handleImport} disabled={importing || !previewRows.length}
                            className="h-9 px-5 rounded-xl bg-[var(--color-primary)] text-white text-[11px] font-black hover:brightness-110 transition-all flex items-center gap-2 disabled:opacity-50">
                            {importing
                                ? <><FontAwesomeIcon icon={faSpinner} className="animate-spin text-xs" /> {progress.done}/{progress.total}</>
                                : <><FontAwesomeIcon icon={faFileImport} className="text-xs" /> Import {previewRows.length} Record</>}
                        </button>
                    )}
                </div>
            </div>
        </div>,
        document.body
    )
}

// ─── Main GuruAttendanceTab ────────────────────────────────────────────────────

function GuruTab() {
    const { addToast } = useToast()
    const now = new Date()
    const [viewMode, setViewMode] = useState('bulanan') // 'harian' | 'mingguan' | 'bulanan'
    const [tahun, setTahun] = useState(now.getFullYear())
    const [bulan, setBulan] = useState(now.getMonth() + 1)
    const [selectedDate, setSelectedDate] = useState(now.toISOString().slice(0, 10))
    const [teachers, setTeachers] = useState([])
    const [attendance, setAttendance] = useState([]) // flat records
    const [loading, setLoading] = useState(false)
    const [showImport, setShowImport] = useState(false)
    const [showSettings, setShowSettings] = useState(false)
    const [historyTeacher, setHistoryTeacher] = useState(null)
    const [search, setSearch] = useState('')
    const [filterStatus, setFilterStatus] = useState('')
    const [settings, setSettings] = useState(DEFAULT_ATTENDANCE_SETTINGS)

    // Load settings from DB
    useEffect(() => {
        supabase.from('teacher_attendance_config').select('*').eq('id', 1).maybeSingle()
            .then(({ data }) => {
                if (data) setSettings({ ...DEFAULT_ATTENDANCE_SETTINGS, ...data })
            })
    }, [])

    // Load teachers
    useEffect(() => {
        supabase.from('teachers')
            .select('id, name, type, status, work_days, fingerspot_name')
            .is('deleted_at', null)
            .order('name')
            .then(({ data }) => setTeachers(data || []))
    }, [])

    // Load attendance data based on viewMode
    const loadData = useCallback(async () => {
        setLoading(true)
        try {
            let from, to
            if (viewMode === 'harian') {
                from = selectedDate; to = selectedDate
            } else if (viewMode === 'mingguan') {
                const d = new Date(selectedDate)
                const dow = d.getDay()
                const mon = new Date(d); mon.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1))
                const sun = new Date(mon); sun.setDate(mon.getDate() + 6)
                from = mon.toISOString().slice(0, 10)
                to = sun.toISOString().slice(0, 10)
            } else {
                from = `${tahun}-${String(bulan).padStart(2, '0')}-01`
                const lastDay = getDaysInMonth(tahun, bulan)
                to = `${tahun}-${String(bulan).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
            }
            const { data, error } = await supabase.from('teacher_attendance')
                .select('*')
                .gte('date', from)
                .lte('date', to)
                .order('date')
            if (error) throw error
            setAttendance(data || [])
        } catch (e) {
            addToast('Gagal memuat data: ' + e.message, 'error')
        } finally {
            setLoading(false)
        }
    }, [viewMode, selectedDate, tahun, bulan, addToast])

    useEffect(() => { loadData() }, [loadData])

    // ── Jam kerja helper (shared di GuruTab) ─────────────────────────────────
    const calcWorkMinutesG = (scanIn, scanOut) => {
        if (!scanIn || !scanOut) return null
        const [h1, m1] = scanIn.split(':').map(Number)
        const [h2, m2] = scanOut.split(':').map(Number)
        const total = (h2 * 60 + m2) - (h1 * 60 + m1)
        return total > 0 ? total : null
    }
    const fmtDurationG = (minutes) => {
        if (!minutes || minutes <= 0) return '—'
        const h = Math.floor(minutes / 60)
        const m = minutes % 60
        return m > 0 ? `${h}j ${m}m` : `${h}j`
    }
    const STANDARD_MIN = 8 * 60

    // Group attendance by teacher for monthly/weekly view
    const teacherRows = useMemo(() => {
        const map = {}
        attendance.forEach(a => {
            if (!map[a.teacher_id]) map[a.teacher_id] = []
            map[a.teacher_id].push(a)
        })
        const STANDARD_MIN_DYN = ((settings.standar_jam ?? 8) * 60) + (settings.standar_menit ?? 0)

        const calcLemburInternal = (extraMinutes) => {
            if (!extraMinutes || extraMinutes <= 0 || !settings.lembur_enabled) return 0
            const intv = settings.lembur_interval ?? 60
            const nom = settings.lembur_nominal ?? 2000
            return Math.floor(extraMinutes / intv) * nom
        }

        const calcPotonganInternal = (lateMin) => {
            if (!lateMin || lateMin <= 0) return 0
            const intv = settings.potongan_interval ?? 5
            const nom = settings.potongan_nominal ?? 1000
            return Math.floor(lateMin / intv) * nom
        }
        return teachers.map(t => {
            const recs = map[t.id] || []
            let totalWorkMin = 0, totalLemburMin = 0, workDayCount = 0, totalLateMin = 0, totalPotongan = 0, totalLemburPay = 0
            for (const r of recs) {
                if (r.status === 'hadir' || r.status === 'terlambat' || r.status === 'pulang_awal') {
                    const wm = calcWorkMinutesG(r.scan_in, r.scan_out)
                    if (wm !== null) {
                        totalWorkMin += wm; workDayCount++
                        if (wm > STANDARD_MIN_DYN) {
                            const extra = wm - STANDARD_MIN_DYN
                            totalLemburMin += extra
                            totalLemburPay += calcLemburInternal(extra)
                        }
                    }
                }
                if (r.late_minutes > 0) {
                    totalLateMin += r.late_minutes
                    totalPotongan += calcPotonganInternal(r.late_minutes)
                }
            }
            return {
                ...t,
                records: recs,
                stats: {
                    hadir: recs.filter(r => r.status === 'hadir').length,
                    terlambat: recs.filter(r => r.status === 'terlambat').length,
                    alpha: recs.filter(r => r.status === 'alpha').length,
                    pulang_awal: recs.filter(r => r.status === 'pulang_awal').length,
                    total: recs.filter(r => r.status !== 'libur').length,
                    totalWorkMin,
                    totalLemburMin,
                    totalLateMin,
                    totalPotongan,
                    totalLemburPay,
                    avgWorkMin: workDayCount > 0 ? Math.round(totalWorkMin / workDayCount) : 0,
                }
            }
        })
    }, [teachers, attendance, settings])

    // Daily view — group by teacher for selected date
    const dailyRows = useMemo(() => {
        const dayRecs = attendance.filter(a => a.date === selectedDate)
        const map = Object.fromEntries(dayRecs.map(a => [a.teacher_id, a]))
        return teachers
            .filter(t => {
                const dow = new Date(selectedDate).getDay()
                const wd = t.work_days || ['senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu']
                return wd.includes(HARI_KEY[dow])
            })
            .map(t => ({ ...t, record: map[t.id] || null }))
    }, [teachers, attendance, selectedDate])

    const filtered = useMemo(() => {
        const src = viewMode === 'harian' ? dailyRows : teacherRows
        return src.filter(t => {
            const matchSearch = !search || t.name.toLowerCase().includes(search.toLowerCase())
            const matchStatus = !filterStatus || (
                viewMode === 'harian'
                    ? t.record?.status === filterStatus
                    : t.stats[filterStatus] > 0
            )
            return matchSearch && matchStatus
        })
    }, [viewMode, dailyRows, teacherRows, search, filterStatus])

    // Nav helpers
    const prevPeriod = () => {
        if (viewMode === 'harian') {
            const d = new Date(selectedDate); d.setDate(d.getDate() - 1)
            setSelectedDate(d.toISOString().slice(0, 10))
        } else if (viewMode === 'mingguan') {
            const d = new Date(selectedDate); d.setDate(d.getDate() - 7)
            setSelectedDate(d.toISOString().slice(0, 10))
        } else {
            if (bulan === 1) { setBulan(12); setTahun(y => y - 1) } else setBulan(m => m - 1)
        }
    }
    const nextPeriod = () => {
        if (viewMode === 'harian') {
            const d = new Date(selectedDate); d.setDate(d.getDate() + 1)
            setSelectedDate(d.toISOString().slice(0, 10))
        } else if (viewMode === 'mingguan') {
            const d = new Date(selectedDate); d.setDate(d.getDate() + 7)
            setSelectedDate(d.toISOString().slice(0, 10))
        } else {
            if (bulan === 12) { setBulan(1); setTahun(y => y + 1) } else setBulan(m => m + 1)
        }
    }

    const periodLabel = useMemo(() => {
        if (viewMode === 'harian') {
            const d = new Date(selectedDate)
            return `${HARI_NAMA[d.getDay()]}, ${fmtDateG(selectedDate)}`
        }
        if (viewMode === 'mingguan') {
            const d = new Date(selectedDate)
            const dow = d.getDay()
            const mon = new Date(d); mon.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1))
            const sun = new Date(mon); sun.setDate(mon.getDate() + 6)
            return `${mon.getDate()} – ${sun.getDate()} ${BULAN_NAMA[sun.getMonth() + 1]} ${sun.getFullYear()}`
        }
        return `${BULAN_NAMA[bulan]} ${tahun}`
    }, [viewMode, selectedDate, bulan, tahun])

    // Monthly grid days
    const monthDays = useMemo(() => {
        if (viewMode !== 'bulanan') return []
        const days = []
        const total = getDaysInMonth(tahun, bulan)
        for (let d = 1; d <= total; d++) {
            const dow = getDow(tahun, bulan, d)
            days.push({ d, dow, isWeekend: dow === 0 || dow === 6 })
        }
        return days
    }, [viewMode, tahun, bulan])

    // Summary stats for header
    const summary = useMemo(() => ({
        total: teachers.length,
        hadir: attendance.filter(a => a.status === 'hadir').length,
        terlambat: attendance.filter(a => a.status === 'terlambat').length,
        alpha: attendance.filter(a => a.status === 'alpha').length,
    }), [teachers, attendance])

    return (
        <div className="space-y-4">

            {/* ── Header controls — mirror pola Siswa: view tabs + period nav di luar card ── */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                {/* View mode tabs */}
                <div className="flex items-center bg-[var(--color-surface-alt)] rounded-xl border border-[var(--color-border)] p-0.5">
                    {[
                        { key: 'harian', label: 'Harian', icon: faCalendarDays },
                        { key: 'mingguan', label: 'Mingguan', icon: faCalendarDays },
                        { key: 'bulanan', label: 'Bulanan', icon: faChartSimple },
                    ].map(v => (
                        <button key={v.key} onClick={() => setViewMode(v.key)}
                            className={`h-8 px-4 rounded-xl text-[11px] font-black flex items-center gap-1.5 transition-all ${viewMode === v.key ? 'bg-[var(--color-surface)] text-[var(--color-text)] shadow-sm' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}>
                            <FontAwesomeIcon icon={v.icon} className="text-[9px]" />
                            {v.label}
                        </button>
                    ))}
                </div>

                {/* Period nav */}
                <div className="flex items-center gap-0.5 bg-[var(--color-surface-alt)] rounded-xl border border-[var(--color-border)] p-0.5">
                    <button onClick={prevPeriod} className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)] transition-all">
                        <FontAwesomeIcon icon={faChevronLeft} className="text-[10px]" />
                    </button>
                    <span className="px-3 text-[12px] font-black text-[var(--color-text)] min-w-[160px] text-center tabular-nums">{periodLabel}</span>
                    <button onClick={nextPeriod} className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)] transition-all">
                        <FontAwesomeIcon icon={faChevronRight} className="text-[10px]" />
                    </button>
                </div>
            </div>

            {/* ── Main card — sama strukturnya dengan Siswa: card + toolbar di dalam ── */}
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">

                {/* Toolbar di dalam card: search + import + settings */}
                <div className="px-3 md:px-4 py-2.5 border-b border-[var(--color-border)] flex items-center gap-2">
                    <div className="relative flex-1 max-w-xs">
                        <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-[var(--color-text-muted)] pointer-events-none" />
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari nama guru..."
                            className="w-full h-8 pl-8 pr-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[11px] font-medium text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] outline-none focus:border-[var(--color-primary)] transition-all" />
                    </div>
                    <button onClick={() => setShowSettings(true)}
                        className="h-8 w-8 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] flex items-center justify-center hover:text-[var(--color-text)] hover:border-[var(--color-primary)]/40 transition-all shrink-0 ml-auto"
                        title="Pengaturan absensi guru">
                        <FontAwesomeIcon icon={faGear} className="text-[11px]" />
                    </button>
                    <button onClick={() => setShowImport(true)}
                        className="h-8 px-3 rounded-xl bg-[var(--color-primary)] text-white text-[10px] font-black flex items-center gap-1.5 hover:brightness-110 transition-all shrink-0">
                        <FontAwesomeIcon icon={faFileImport} className="text-[9px]" />
                        <span className="hidden sm:inline">Import Fingerspot</span>
                        <span className="sm:hidden">Import</span>
                    </button>
                </div>


                {/* Main table content (inside card) */}
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <FontAwesomeIcon icon={faSpinner} className="animate-spin text-2xl text-[var(--color-primary)]" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <FontAwesomeIcon icon={faCalendarDays} className="text-3xl text-[var(--color-text-muted)] opacity-30" />
                        <p className="text-[12px] font-black text-[var(--color-text)]">Belum ada data</p>
                        <p className="text-[10px] text-[var(--color-text-muted)]">Import data dari Fingerspot untuk mulai</p>
                        <button onClick={() => setShowImport(true)}
                            className="h-8 px-4 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-[10px] font-black border border-[var(--color-primary)]/20 hover:bg-[var(--color-primary)]/20 transition-all">
                            Import Sekarang
                        </button>
                    </div>
                ) : viewMode === 'harian' ? (
                    /* Daily view */
                    <>
                        <div className="hidden md:grid grid-cols-[1fr_120px_90px_90px_110px_80px] gap-3 px-5 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[8px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">
                            {['Nama Guru', 'Tipe', 'Jam Masuk', 'Jam Keluar', 'Status', ''].map((h, i) => <div key={i}>{h}</div>)}
                        </div>
                        <div className="divide-y divide-[var(--color-border)]">
                            {filtered.map(t => (
                                <div key={t.id} className="grid grid-cols-1 md:grid-cols-[1fr_120px_90px_90px_110px_80px] gap-3 px-5 py-3 items-center hover:bg-[var(--color-surface-alt)]/40 transition-colors">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[var(--color-primary)]/20 to-[var(--color-accent)]/20 flex items-center justify-center text-[var(--color-primary)] font-black text-sm shrink-0">
                                            {t.name.charAt(0).toUpperCase()}
                                        </div>
                                        <p className="text-[12px] font-black text-[var(--color-text)]">{t.name}</p>
                                    </div>
                                    <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text-muted)] w-fit">
                                        {t.type ? t.type.charAt(0).toUpperCase() + t.type.slice(1) : 'Guru'}
                                    </span>
                                    <p className="text-[11px] font-bold text-[var(--color-text)] tabular-nums">{fmtTime(t.record?.scan_in)}</p>
                                    <p className="text-[11px] font-bold text-[var(--color-text)] tabular-nums">{fmtTime(t.record?.scan_out)}</p>
                                    <div>{t.record ? <StatusBadge status={t.record.status} /> : <span className="text-[9px] text-[var(--color-text-muted)]">—</span>}</div>
                                    <button onClick={() => setHistoryTeacher(t)}
                                        className="h-7 px-2.5 rounded-lg border border-[var(--color-border)] text-[9px] font-black text-[var(--color-text-muted)] hover:text-[var(--color-text)] flex items-center gap-1 transition-colors">
                                        <FontAwesomeIcon icon={faClockRotateLeft} className="text-[8px]" /> Riwayat
                                    </button>
                                </div>
                            ))}
                        </div>
                    </>
                ) : viewMode === 'bulanan' ? (
                    /* Monthly grid view */
                    <div className="overflow-x-auto">
                        <table style={{ borderCollapse: 'collapse', minWidth: 'max-content', width: '100%' }}>
                            <thead>
                                <tr style={{ backgroundColor: 'var(--color-surface-alt)' }}>
                                    <th rowSpan={2} style={{
                                        position: 'sticky', left: 0, zIndex: 6,
                                        width: W_NO, minWidth: W_NO,
                                        backgroundColor: 'var(--color-surface-alt)',
                                        borderRight: '1px solid var(--color-border)',
                                        borderBottom: '2px solid var(--color-border)',
                                        padding: '8px 4px', textAlign: 'center',
                                        verticalAlign: 'middle',
                                        boxShadow: '2px 0 4px -2px rgba(0,0,0,0.06)',
                                    }}>
                                        <span className="text-[9px] font-black text-[var(--color-text-muted)]">#</span>
                                    </th>
                                    <th rowSpan={2} style={{
                                        position: 'sticky', left: W_NO, zIndex: 6,
                                        width: W_NAMA, minWidth: W_NAMA,
                                        backgroundColor: 'var(--color-surface-alt)',
                                        borderRight: '2px solid var(--color-border)',
                                        borderBottom: '2px solid var(--color-border)',
                                        padding: '8px 12px', textAlign: 'left',
                                        verticalAlign: 'middle',
                                        boxShadow: '4px 0 8px -4px rgba(0,0,0,0.08)',
                                    }}>
                                        <span className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Nama Guru</span>
                                    </th>
                                    {monthDays.map(({ d, isWeekend }) => (
                                        <th key={d} style={{
                                            width: 32, minWidth: 32, padding: '6px 0', textAlign: 'center',
                                            borderBottom: '2px solid var(--color-border)',
                                            borderLeft: '1px solid var(--color-border)',
                                            backgroundColor: 'var(--color-surface-alt)',
                                        }}>
                                            <span style={{ fontSize: 10, fontWeight: 900, color: isWeekend ? '#f87171' : 'var(--color-text-muted)' }}>{d}</span>
                                        </th>
                                    ))}
                                    <th rowSpan={2} style={{ minWidth: 100, borderBottom: '2px solid var(--color-border)', borderLeft: '2px solid var(--color-border)', background: 'var(--color-surface-alt)', verticalAlign: 'middle' }}>
                                        <span className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Ringkasan</span>
                                    </th>
                                    <th rowSpan={2} style={{ width: 60, borderBottom: '2px solid var(--color-border)', borderLeft: '1px solid var(--color-border)', background: 'var(--color-surface-alt)', verticalAlign: 'middle' }}>
                                        <span className="text-[9px] font-black uppercase tracking-widest text-blue-500">Jam Kerja</span>
                                    </th>
                                    <th rowSpan={2} style={{ width: 60, borderBottom: '2px solid var(--color-border)', borderLeft: '1px solid var(--color-border)', background: 'var(--color-surface-alt)', verticalAlign: 'middle' }}>
                                        <span className="text-[9px] font-black uppercase tracking-widest text-purple-500">Lembur</span>
                                    </th>
                                    <th rowSpan={2} style={{ width: 40, borderBottom: '2px solid var(--color-border)', borderLeft: '1px solid var(--color-border)', background: 'var(--color-surface-alt)', verticalAlign: 'middle' }}></th>
                                </tr>
                                <tr style={{ backgroundColor: 'var(--color-surface-alt)' }}>
                                    {monthDays.map(({ d, dow, isWeekend }) => (
                                        <th key={d} style={{ width: 32, minWidth: 32, padding: '2px 0', textAlign: 'center', borderBottom: '1px solid var(--color-border)', borderLeft: '1px solid var(--color-border)', background: 'var(--color-surface-alt)' }}>
                                            <span style={{ fontSize: 8, fontWeight: 700, color: isWeekend ? '#fca5a5' : 'var(--color-text-muted)', opacity: isWeekend ? 0.8 : 0.4 }}>{DOW_SHORT[dow]}</span>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--color-border)]">
                                {filtered.map((t, idx) => {
                                    const recMap = Object.fromEntries(t.records.map(r => [r.date?.slice(8, 10), r]))
                                    return (
                                        <tr key={t.id} className="hover:bg-[var(--color-surface-alt)]/30 transition-colors">
                                            <td style={{
                                                position: 'sticky', left: 0, zIndex: 4,
                                                width: W_NO, minWidth: W_NO,
                                                backgroundColor: 'var(--color-surface)',
                                                borderRight: '1px solid var(--color-border)',
                                                textAlign: 'center',
                                                boxShadow: '2px 0 4px -2px rgba(0,0,0,0.06)',
                                            }}>
                                                <div className="w-6 h-6 rounded-full bg-[var(--color-surface-alt)] border border-[var(--color-border)] flex items-center justify-center mx-auto text-[10px] font-black text-[var(--color-text-muted)]">
                                                    {idx + 1}
                                                </div>
                                            </td>
                                            <td style={{
                                                position: 'sticky', left: W_NO, zIndex: 4,
                                                width: W_NAMA, minWidth: W_NAMA,
                                                backgroundColor: 'var(--color-surface)',
                                                borderRight: '2px solid var(--color-border)',
                                                padding: '8px 12px',
                                                boxShadow: '4px 0 8px -4px rgba(0,0,0,0.08)',
                                            }}>
                                                <p className="text-[11px] font-black text-[var(--color-text)] truncate max-w-[140px]">{t.name}</p>
                                                <p className="text-[9px] text-[var(--color-text-muted)]">{t.type ? t.type.charAt(0).toUpperCase() + t.type.slice(1) : 'Guru'}</p>
                                            </td>
                                            {monthDays.map(({ d, isWeekend }) => {
                                                const key = String(d).padStart(2, '0')
                                                const rec = recMap[key]
                                                const wd = t.work_days || ['senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu']
                                                const dow = getDow(tahun, bulan, d)
                                                const isLibur = !wd.includes(HARI_KEY[dow])
                                                const status = rec?.status
                                                const meta = status ? GURU_STATUS_META[status] : null
                                                const letter = status ? (GURU_LETTER_MAP[status] || status.charAt(0).toUpperCase()) : (isLibur ? 'L' : isWeekend ? '·' : '')

                                                return (
                                                    <td key={d} style={{
                                                        width: 32, minWidth: 32, height: 32,
                                                        borderLeft: '1px solid var(--color-border)',
                                                        textAlign: 'center', padding: 0,
                                                        backgroundColor: meta ? undefined : (isLibur || isWeekend ? 'var(--color-surface-alt)' : undefined)
                                                    }} className={meta ? `${meta.bg} ${meta.border}` : ''}>
                                                        <span className={`text-[11px] font-black ${meta ? meta.color : (isLibur ? 'text-slate-400/50' : 'text-slate-300/30')}`}>
                                                            {letter}
                                                        </span>
                                                    </td>
                                                )
                                            })}
                                            <td style={{ padding: '0 12px', borderLeft: '2px solid var(--color-border)' }}>
                                                <div className="flex gap-1 flex-wrap items-center">
                                                    {t.stats.hadir > 0 && <span className="text-[8px] font-black text-emerald-600 bg-emerald-500/8 px-1.5 py-0.5 rounded-md border border-emerald-500/20">{t.stats.hadir} H</span>}
                                                    {t.stats.terlambat > 0 && <span className="text-[8px] font-black text-amber-600 bg-amber-500/8 px-1.5 py-0.5 rounded-md border border-amber-500/20">{t.stats.terlambat} T</span>}
                                                    {t.stats.alpha > 0 && <span className="text-[8px] font-black text-red-600 bg-red-500/8 px-1.5 py-0.5 rounded-md border border-red-500/20">{t.stats.alpha} A</span>}
                                                </div>
                                            </td>
                                            <td style={{ textAlign: 'center', borderLeft: '1px solid var(--color-border)' }}>
                                                <span className="text-[10px] font-black text-blue-600 tabular-nums">{fmtDurationG(t.stats.totalWorkMin)}</span>
                                            </td>
                                            <td style={{ textAlign: 'center', borderLeft: '1px solid var(--color-border)' }}>
                                                <span className="text-[10px] font-black text-purple-600 tabular-nums">{t.stats.totalLemburMin > 0 ? fmtDurationG(t.stats.totalLemburMin) : '—'}</span>
                                            </td>
                                            <td style={{ textAlign: 'center', borderLeft: '1px solid var(--color-border)' }}>
                                                <button onClick={() => setHistoryTeacher(t)}
                                                    className="w-7 h-7 rounded-lg border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors mx-auto">
                                                    <FontAwesomeIcon icon={faEye} className="text-[9px]" />
                                                </button>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    /* Weekly view — same as monthly but filtered to 7 days */
                    <div className="divide-y divide-[var(--color-border)]">
                        {filtered.map(t => (
                            <div key={t.id} className="px-5 py-3 flex items-center gap-4">
                                <div className="flex-1 min-w-0">
                                    <p className="text-[12px] font-black text-[var(--color-text)] truncate">{t.name}</p>
                                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                                        {t.records.map(r => (
                                            <div key={r.id} className="flex items-center gap-1">
                                                <span className="text-[9px] text-[var(--color-text-muted)]">{HARI_NAMA[new Date(r.date).getDay()].slice(0, 3)}</span>
                                                <StatusBadge status={r.status} size="xs" />
                                            </div>
                                        ))}
                                        {t.records.length === 0 && <span className="text-[9px] text-[var(--color-text-muted)]">Tidak ada data minggu ini</span>}
                                    </div>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="text-[10px] font-black text-[var(--color-text)]">{t.stats.hadir + t.stats.terlambat}/{t.stats.total} hari</p>
                                    <p className="text-[9px] text-[var(--color-text-muted)]">kehadiran</p>
                                </div>
                                <button onClick={() => setHistoryTeacher(t)}
                                    className="h-8 w-8 rounded-xl border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors shrink-0">
                                    <FontAwesomeIcon icon={faEye} className="text-xs" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>{/* end main card */}

            {/* Import modal */}
            {
                showImport && (
                    <FingerspotImportModal
                        teachers={teachers}
                        onClose={() => setShowImport(false)}
                        onImported={loadData}
                    />
                )
            }

            {/* Settings modal */}
            {showSettings && (
                <AttendanceSettingsModal
                    settings={settings}
                    onSave={(s) => setSettings(s)}
                    onClose={() => setShowSettings(false)}
                />
            )}

            {/* History drawer */}
            {
                historyTeacher && (
                    <HistoryDrawer
                        teacher={historyTeacher}
                        onClose={() => setHistoryTeacher(null)}
                        settings={settings}
                    />
                )
            }
        </div>
    )
}


// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AttendancePage() {
    const { addToast } = useToast()
    const { dir } = useLanguage()
    const { profile } = useAuth()
    const now = new Date()

    const [classList, setClassList] = useState([])
    const [classId, setClassId] = useState('')
    const [tahun, setTahun] = useState(now.getFullYear())
    const [bulan, setBulan] = useState(now.getMonth() + 1)
    const [studentList, setStudentList] = useState([])
    const [dataMap, setDataMap] = useState({})
    const [originalMap, setOriginalMap] = useState({})
    const [loadingClass, setLoadingClass] = useState(true)
    const [loadingData, setLoadingData] = useState(false)
    const [saving, setSaving] = useState(false)
    const [isDirty, setIsDirty] = useState(false)
    const [mainTab, setMainTab] = useState('siswa')
    const [activeTab, setActiveTab] = useState('input')
    const [isOnline, setIsOnline] = useState(() => typeof navigator !== 'undefined' ? navigator.onLine : true)
    const [draftAvail, setDraftAvail] = useState(false)
    const [showTutorial, setShowTutorial] = useState(false)

    // Undo/Redo history
    const historyRef = useRef([])
    const historyIdxRef = useRef(-1)
    const [canUndo, setCanUndo] = useState(false)
    const [canRedo, setCanRedo] = useState(false)

    // Drag-to-fill state
    const dragRef = useRef({ active: false, status: null })

    // ColFill & RowFill popup
    const [colFillTarget, setColFillTarget] = useState(null) // { d, dow, x, y }
    const [rowFillTarget, setRowFillTarget] = useState(null) // { student, x, y }

    // Today
    const todayRef = useRef({ d: now.getDate(), m: now.getMonth() + 1, y: now.getFullYear() })
    const todayDate = (bulan === todayRef.current.m && tahun === todayRef.current.y)
        ? todayRef.current.d : null

    const [searchRaw, setSearchRaw] = useState('')
    const search = useDeferredValue(searchRaw)

    // ── Feature 1: Copy bulan lalu ──
    const [copyingLastMonth, setCopyingLastMonth] = useState(false)
    // ── Feature 2: Keyboard nav state ──
    const [focusedCell, setFocusedCell] = useState(null) // { rowIdx, day }
    const tableBodyRef = useRef(null)
    // ── Feature 3: Hide weekend ──
    const [hideWeekend, setHideWeekend] = useState(false)
    // ── Feature 4: Filter row siswa ──
    const [filterMode, setFilterMode] = useState('all') // 'all' | 'alpa' | 'empty' | 'belum'
    // ── Feature 5: Scroll ke hari ini handled via ref ──
    const todayColRef = useRef(null)
    // Ref to always-current filteredStudents — keeps handleCellMouseDown stable (no deps)
    const filteredStudentsRef = useRef([])
    // ── Feature 6: Catatan per siswa ──
    const [notesMap, setNotesMap] = useState({}) // { studentId: string }
    const [noteTarget, setNoteTarget] = useState(null) // { student, x, y }
    // ── Feature 7: Import CSV/Excel ──
    const [showImport, setShowImport] = useState(false)
    // ── Feature 10: Alert threshold ──
    const [alertThreshold, setAlertThreshold] = useState(() => {
        try { return JSON.parse(localStorage.getItem('absensi_alert_threshold') || 'null') || { alpa: 3, hadirPct: 75 } }
        catch { return { alpa: 3, hadirPct: 75 } }
    })
    const [showAlertConfig, setShowAlertConfig] = useState(false)
    const [showMobileSheet, setShowMobileSheet] = useState(false)
    const [confirmModal, setConfirmModal] = useState(null) // { message, confirmLabel, onConfirm }
    // ── Mobile view mode: 'table' | 'card' | 'list' ──────────────────────────
    const [mobileView, setMobileView] = useState(() => {
        try { return localStorage.getItem('absensi_mobile_view') || 'table' } catch { return 'table' }
    })
    // ── Command Palette ───────────────────────────────────────────────────────
    const [showCommandPalette, setShowCommandPalette] = useState(false)

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

    // Feature 3: visibleDays — filtered by hideWeekend
    const visibleDays = useMemo(() =>
        dayMeta.filter(dm => !dm.invalid && !(hideWeekend && dm.weekend)).map(dm => dm.d),
        [dayMeta, hideWeekend]
    )

    const filteredStudents = useMemo(() => {
        let list = studentList
        if (search.trim()) {
            const q = search.toLowerCase()
            list = list.filter(s => s.name.toLowerCase().includes(q) || (s.nisn && s.nisn.includes(q)))
        }
        if (filterMode === 'alpa') list = list.filter(s => (dataMap[s.id] ? Object.values(dataMap[s.id]).filter(v => v === 'A').length : 0) >= alertThreshold.alpa)
        else if (filterMode === 'belum') list = list.filter(s => {
            const days = dataMap[s.id] || {}
            const filledWeekdays = Object.entries(days).filter(([d, v]) => v && !isWeekend(tahun, bulan, +d)).length
            return filledWeekdays === 0
        })
        else if (filterMode === 'empty') list = list.filter(s => {
            const days = dataMap[s.id] || {}
            return Object.values(days).some(v => !v) || Object.keys(days).length < visibleDays.filter(d => !isWeekend(tahun, bulan, d)).length
        })
        return list
    }, [studentList, search, filterMode, dataMap, tahun, bulan, alertThreshold.alpa, visibleDays])

    // Always-current ref — keeps handleCellMouseDown zero-dependency (stable)
    filteredStudentsRef.current = filteredStudents

    const colSummary = useMemo(() => {
        const out = {}
        for (let d = 1; d <= daysInMonth; d++) {
            let h = 0, x = 0
            for (const s of studentList) {
                const v = dataMap[s.id]?.[d] || ''
                if (v === 'H') h++; else if (v) x++
            }
            out[d] = { h, x }
        }
        return out
    }, [dataMap, studentList, daysInMonth])

    // Progress completion: % hari kerja yang sudah terisi (semua siswa)
    const completionPct = useMemo(() => {
        if (!studentList.length) return 0
        let filled = 0, total = 0
        for (let d = 1; d <= daysInMonth; d++) {
            if (isWeekend(tahun, bulan, d)) continue
            total += studentList.length
            for (const s of studentList) {
                if (dataMap[s.id]?.[d]) filled++
            }
        }
        return total > 0 ? Math.round((filled / total) * 100) : 0
    }, [dataMap, studentList, daysInMonth, tahun, bulan])

    // Push snapshot ke history untuk undo/redo
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
        setDataMap(structuredClone(stack[historyIdxRef.current]))
        setIsDirty(true)
        setCanUndo(historyIdxRef.current > 0)
        setCanRedo(true)
    }, [])

    const applyRedo = useCallback(() => {
        const stack = historyRef.current
        if (historyIdxRef.current >= stack.length - 1) return
        historyIdxRef.current++
        setDataMap(structuredClone(stack[historyIdxRef.current]))
        setIsDirty(true)
        setCanUndo(true)
        setCanRedo(historyIdxRef.current < stack.length - 1)
    }, [])

    const draftTimerRef = useRef(null)
    const handleSaveRef = useRef(null)

    useEffect(() => {
        const cls = classList.find(c => c.id === classId)
        document.title = cls ? `Absensi ${cls.name} · ${BULAN_NAMA[bulan]} ${tahun} | Laporanmu` : 'Absensi Bulanan | Laporanmu'
        return () => { document.title = 'Laporanmu' }
    }, [classId, classList, bulan, tahun])

    useEffect(() => {
        const on = () => { setIsOnline(true); addToast('Koneksi kembali', 'success') }
        const off = () => { setIsOnline(false); addToast('Offline — perubahan disimpan lokal', 'warning') }
        window.addEventListener('online', on); window.addEventListener('offline', off)
        return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
    }, [addToast])

    useEffect(() => {
        const h = (e) => { if (isDirty) { e.preventDefault(); e.returnValue = '' } }
        window.addEventListener('beforeunload', h)
        return () => window.removeEventListener('beforeunload', h)
    }, [isDirty])

    useEffect(() => {
        const h = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); handleSaveRef.current?.() }
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); applyUndo() }
            if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); applyRedo() }
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); setShowCommandPalette(v => !v); haptic('light') }
        }
        window.addEventListener('keydown', h)
        return () => window.removeEventListener('keydown', h)
    }, [applyUndo, applyRedo])

    useEffect(() => {
        setLoadingClass(true)
        supabase.from('classes').select('id, name').order('name').then(({ data }) => {
            if (data?.length) { setClassList(data); setClassId(data[0].id) }
            setLoadingClass(false)
        })
    }, [])

    useEffect(() => {
        if (!classId) return
        try { setDraftAvail(!!localStorage.getItem(draftKey(classId, tahun, bulan))) }
        catch { setDraftAvail(false) }
    }, [classId, tahun, bulan])

    useEffect(() => {
        if (!classId || !studentList.length || !isDirty) return
        if (draftTimerRef.current) clearTimeout(draftTimerRef.current)
        draftTimerRef.current = setTimeout(() => {
            try {
                const payload = JSON.stringify({ dataMap, savedAt: Date.now() })
                if (payload.length < 2 * 1024 * 1024) { localStorage.setItem(draftKey(classId, tahun, bulan), payload); setDraftAvail(true) }
            } catch { /* quota */ }
        }, 500)
        return () => { if (draftTimerRef.current) clearTimeout(draftTimerRef.current) }
    }, [dataMap, isDirty, classId, tahun, bulan, studentList.length])

    const loadData = useCallback(async () => {
        if (!classId) return
        setLoadingData(true); setSearchRaw('')
        const [{ data: students }, { data: attendance }] = await Promise.all([
            supabase.from('students').select('id, name, nisn')
                .eq('class_id', classId).is('deleted_at', null).eq('is_active', true).order('name'),
            supabase.from('student_attendance').select('student_id, days')
                .eq('class_id', classId).eq('year', tahun).eq('month', bulan),
        ])
        setStudentList(students || [])
        const map = {}
        for (const s of (students || [])) {
            const ex = attendance?.find(a => a.student_id === s.id)
            map[s.id] = ex?.days ? { ...ex.days } : {}
        }
        setDataMap(map); setOriginalMap(structuredClone(map))
        setIsDirty(false); setLoadingData(false)
        historyRef.current = [structuredClone(map)]
        historyIdxRef.current = 0
        setCanUndo(false); setCanRedo(false)
    }, [classId, tahun, bulan])

    useEffect(() => { loadData() }, [loadData])

    const [, startDragTransition] = useTransition()

    const handleCellClick = useCallback((sid, day) => {
        setDataMap(prev => {
            const curr = prev[sid] || {}
            const next = cycleStatus(curr[day] || '')
            const newDays = { ...curr }
            if (next === '') delete newDays[day]; else newDays[day] = next
            const updated = { ...prev, [sid]: newDays }
            pushHistory(updated)
            return updated
        })
        setIsDirty(true)
        haptic('light')
    }, [pushHistory])

    // Drag-to-fill: mousedown sets status, mouseenter applies instantly via transition
    const handleCellMouseDown = useCallback((sid, day) => {
        // Update focused cell — find rowIdx from filteredStudents at call time
        setFocusedCell(prev => {
            const rowIdx = filteredStudentsRef.current.findIndex(s => s.id === sid)
            return { rowIdx, day }
        })
        setDataMap(prev => {
            const curr = prev[sid] || {}
            const next = cycleStatus(curr[day] || '')
            dragRef.current = { active: true, status: next }
            const newDays = { ...curr }
            if (next === '') delete newDays[day]; else newDays[day] = next
            return { ...prev, [sid]: newDays }
            // pushHistory deferred to mouseup for smooth drag
        })
        setIsDirty(true)
    }, [])

    const handleCellMouseEnter = useCallback((sid, day) => {
        if (!dragRef.current.active) return
        const status = dragRef.current.status
        // useTransition: drag updates are non-urgent, keeps UI responsive
        startDragTransition(() => {
            setDataMap(prev => {
                const curr = prev[sid] || {}
                if ((curr[day] || '') === status) return prev
                const newDays = { ...curr }
                if (status === '') delete newDays[day]; else newDays[day] = status
                return { ...prev, [sid]: newDays }
            })
        })
        setIsDirty(true)
    }, [startDragTransition])

    // Commit history snapshot only once on mouseup — not on every cell during drag
    useEffect(() => {
        const stop = () => {
            if (dragRef.current.active) {
                dragRef.current = { active: false, status: null }
                setDataMap(prev => { pushHistory(prev); return prev })
            }
        }
        window.addEventListener('mouseup', stop)
        window.addEventListener('touchend', stop)
        return () => {
            window.removeEventListener('mouseup', stop)
            window.removeEventListener('touchend', stop)
        }
    }, [pushHistory])

    // Col fill: isi semua siswa untuk satu tanggal
    const handleColFill = useCallback((day, status) => {
        setDataMap(prev => {
            const next = { ...prev }
            for (const s of studentList) {
                const newDays = { ...next[s.id] }
                if (status === '') delete newDays[day]; else newDays[day] = status
                next[s.id] = newDays
            }
            pushHistory(next)
            return next
        })
        setIsDirty(true)
        logAudit({ action: 'UPDATE', source: 'MASTER', tableName: 'student_attendance', newData: { intent: 'column_fill', day, status, count: studentList.length, class_id: classId } })
    }, [studentList, pushHistory, classId])

    const handleColClear = useCallback((day) => {
        setDataMap(prev => {
            const next = { ...prev }
            for (const s of studentList) {
                const newDays = { ...next[s.id] }
                delete newDays[day]
                next[s.id] = newDays
            }
            pushHistory(next)
            return next
        })
        setIsDirty(true)
        logAudit({ action: 'UPDATE', source: 'MASTER', tableName: 'student_attendance', newData: { intent: 'column_clear', day, count: studentList.length, class_id: classId } })
    }, [studentList, pushHistory, classId])

    // Row fill: isi semua hari kerja satu siswa
    const handleRowFill = useCallback((sid, status) => {
        setDataMap(prev => {
            const newDays = {}
            for (let d = 1; d <= daysInMonth; d++) {
                if (!isWeekend(tahun, bulan, d)) {
                    if (status !== '') newDays[d] = status
                } else {
                    if (prev[sid]?.[d]) newDays[d] = prev[sid][d] // preserve weekend entries
                }
            }
            const updated = { ...prev, [sid]: newDays }
            pushHistory(updated)
            return updated
        })
        setIsDirty(true)
        logAudit({ action: 'UPDATE', source: 'MASTER', tableName: 'student_attendance', recordId: sid, newData: { intent: 'row_fill', status, class_id: classId } })
    }, [daysInMonth, tahun, bulan, pushHistory, classId])

    const handleRowClear = useCallback((sid) => {
        setDataMap(prev => {
            const updated = { ...prev, [sid]: {} }
            pushHistory(updated)
            return updated
        })
        setIsDirty(true)
        logAudit({ action: 'UPDATE', source: 'MASTER', tableName: 'student_attendance', recordId: sid, newData: { intent: 'row_clear', class_id: classId } })
    }, [pushHistory, classId])

    const markDirty = useCallback(() => setIsDirty(true), [])

    const handleReset = useCallback(() => {
        setDataMap(structuredClone(originalMap)); setIsDirty(false)
    }, [originalMap])

    const handleChangeClass = useCallback((newId) => {
        if (isDirty) {
            setConfirmModal({
                message: 'Perubahan yang belum disimpan akan hilang jika ganti kelas.',
                confirmLabel: 'Ganti Kelas',
                onConfirm: () => { setClassId(newId); setIsDirty(false); setConfirmModal(null) },
            })
            return
        }
        setClassId(newId); setIsDirty(false)
    }, [isDirty])

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

    const handleSave = useCallback(async () => {
        if (saving || !isDirty || !classId) return
        const prevOriginal = structuredClone(originalMap)
        setOriginalMap(structuredClone(dataMap))
        setIsDirty(false); setSaving(true)
        if (!isOnline) {
            setSaving(false); addToast('Offline — data tersimpan lokal, sync saat online', 'warning'); return
        }
        const upserts = studentList.map(s => ({
            student_id: s.id, class_id: classId, year: tahun, month: bulan,
            days: dataMap[s.id] || {}, updated_by: profile?.id ?? null,
        }))
        const { error } = await supabase.from('student_attendance')
            .upsert(upserts, { onConflict: 'student_id,year,month' })
        setSaving(false)
        if (error) {
            setOriginalMap(prevOriginal); setIsDirty(true)
            addToast('Gagal menyimpan: ' + error.message, 'error')
            haptic('error')
        } else {
            try { localStorage.removeItem(draftKey(classId, tahun, bulan)) } catch { }
            setDraftAvail(false)
            addToast(`Absensi ${BULAN_NAMA[bulan]} ${tahun} tersimpan ✓`, 'success')
            await logAudit({
                action: 'UPDATE', source: 'SYSTEM', tableName: 'student_attendance', recordId: null,
                newData: { class_id: classId, year: tahun, month: bulan, count: studentList.length }
            })
            haptic('success')
        }
    }, [saving, isDirty, classId, tahun, bulan, studentList, dataMap, originalMap, profile, isOnline, addToast])

    useEffect(() => { handleSaveRef.current = handleSave }, [handleSave])

    // ── Feature 1: Copy bulan lalu ────────────────────────────────────────────
    const handleCopyLastMonth = useCallback(async () => {
        if (!classId || copyingLastMonth) return
        const prevBulanVal = bulan === 1 ? 12 : bulan - 1
        const prevTahunVal = bulan === 1 ? tahun - 1 : tahun
        setCopyingLastMonth(true)
        const { data } = await supabase.from('student_attendance')
            .select('student_id, days')
            .eq('class_id', classId).eq('year', prevTahunVal).eq('month', prevBulanVal)
        setCopyingLastMonth(false)
        if (!data || data.length === 0) {
            addToast(`Tidak ada data absensi ${BULAN_NAMA[prevBulanVal]} ${prevTahunVal}`, 'info')
            return
        }
        setDataMap(prev => {
            const next = { ...prev }
            for (const s of studentList) {
                const found = data.find(d => d.student_id === s.id)
                if (found?.days) next[s.id] = { ...found.days }
            }
            pushHistory(next)
            return next
        })
        setIsDirty(true)
        logAudit({ action: 'INSERT', source: 'SYSTEM', tableName: 'student_attendance', newData: { intent: 'copy_last_month', from_year: prevTahunVal, from_month: prevBulanVal, count: data.length } })
        addToast(`Data ${BULAN_NAMA[prevBulanVal]} ${prevTahunVal} disalin ✓`, 'success')
    }, [classId, bulan, tahun, studentList, copyingLastMonth, pushHistory, addToast, profile])

    // ── Feature 5: Scroll ke hari ini ────────────────────────────────────────
    const handleScrollToToday = useCallback(() => {
        if (todayColRef.current) {
            todayColRef.current.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
        }
    }, [])

    // ── Feature 2: Keyboard nav ───────────────────────────────────────────────
    useEffect(() => {
        const h = (e) => {
            if (!focusedCell) return
            const { rowIdx, day } = focusedCell
            const activeDays = visibleDays
            if (!activeDays.length) return
            const dayPos = activeDays.indexOf(day)

            if (e.key === 'ArrowRight') {
                e.preventDefault()
                const nextDay = activeDays[Math.min(dayPos + 1, activeDays.length - 1)]
                setFocusedCell({ rowIdx, day: nextDay })
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault()
                const prevDay = activeDays[Math.max(dayPos - 1, 0)]
                setFocusedCell({ rowIdx, day: prevDay })
            } else if (e.key === 'ArrowDown') {
                e.preventDefault()
                const nextRow = Math.min(rowIdx + 1, filteredStudents.length - 1)
                setFocusedCell({ rowIdx: nextRow, day })
            } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                const prevRow = Math.max(rowIdx - 1, 0)
                setFocusedCell({ rowIdx: prevRow, day })
            } else if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                const s = filteredStudents[rowIdx]
                if (s) handleCellClick(s.id, day)
            } else if (e.key === 'Escape') {
                setFocusedCell(null)
            }
        }
        window.addEventListener('keydown', h)
        return () => window.removeEventListener('keydown', h)
    }, [focusedCell, filteredStudents, visibleDays, handleCellClick])

    // ── Feature 6: Notes persistence ─────────────────────────────────────────
    useEffect(() => {
        if (!classId) return
        try {
            const raw = localStorage.getItem(`absensi_notes_${classId}_${tahun}_${bulan}`)
            setNotesMap(raw ? JSON.parse(raw) : {})
        } catch { setNotesMap({}) }
    }, [classId, tahun, bulan])

    const handleSaveNote = useCallback((studentId, text) => {
        setNotesMap(prev => {
            const next = text ? { ...prev, [studentId]: text } : Object.fromEntries(Object.entries({ ...prev }).filter(([k]) => k !== studentId))
            try { localStorage.setItem(`absensi_notes_${classId}_${tahun}_${bulan}`, JSON.stringify(next)) } catch { }
            return next
        })
    }, [classId, tahun, bulan])

    // ── Feature 7: Import CSV/Excel ───────────────────────────────────────────
    const handleImport = useCallback((matched) => {
        setDataMap(prev => {
            const next = { ...prev }
            for (const { sid, days } of matched) next[sid] = { ...days }
            pushHistory(next)
            return next
        })
        setIsDirty(true)
        addToast(`${matched.length} siswa diimport ✓`, 'success')
        logAudit({ action: 'INSERT', source: 'MASTER', tableName: 'student_attendance', newData: { intent: 'import', count: matched.length, class_id: classId, year: tahun, month: bulan } })
    }, [pushHistory, addToast, classId, tahun, bulan])

    // ── Feature 10: Save alert threshold ─────────────────────────────────────
    const handleSaveThreshold = useCallback((val) => {
        setAlertThreshold(val)
        try { localStorage.setItem('absensi_alert_threshold', JSON.stringify(val)) } catch { }
        addToast('Ambang batas alert disimpan ✓', 'success')
        logAudit({ action: 'UPDATE', source: 'MASTER', tableName: 'preferences', newData: { type: 'alert_threshold', ...val } })
    }, [addToast])

    // ── Fix 3: Stable callbacks — not recreated per-student per-render ──────────
    const handleRowFillClick = useCallback((e, student) => {
        const rect = e.currentTarget.getBoundingClientRect()
        setRowFillTarget({ student, x: rect.right, y: rect.bottom })
    }, [])

    const handleNoteClick = useCallback((e, student) => {
        const rect = e.currentTarget.getBoundingClientRect()
        setNoteTarget({ student, x: rect.left, y: rect.bottom })
    }, [])

    // ── Command Palette actions ───────────────────────────────────────────────
    const handleCommandAction = useCallback((action, payload) => {
        switch (action) {
            case 'fill':
                setDataMap(prev => {
                    const next = { ...prev }
                    for (const s of studentList) {
                        const days = {}
                        for (let d = 1; d <= daysInMonth; d++) {
                            if (!isWeekend(tahun, bulan, d)) days[d] = payload
                        }
                        next[s.id] = days
                    }
                    pushHistory(next)
                    return next
                })
                setIsDirty(true)
                logAudit({ action: 'UPDATE', source: 'SYSTEM', tableName: 'student_attendance', newData: { intent: 'mass_fill', status: payload, count: studentList.length } })
                addToast(`Semua hari kerja diisi: ${STATUS_META[payload].label}`, 'success')
                haptic('medium')
                break
            case 'copyLastMonth': handleCopyLastMonth(); haptic('light'); break
            case 'reset':
                setDataMap(prev => {
                    const next = { ...prev }
                    for (const s of studentList) next[s.id] = {}
                    pushHistory(next)
                    return next
                })
                setIsDirty(true)
                logAudit({ action: 'DELETE', source: 'SYSTEM', tableName: 'student_attendance', newData: { intent: 'mass_reset', count: studentList.length } })
                addToast('Semua data direset', 'info')
                haptic('warning')
                break
            case 'save': handleSaveRef.current?.(); haptic('success'); break
            case 'undo': applyUndo(); haptic('light'); break
            case 'toggleWeekend': setHideWeekend(v => !v); haptic('light'); break
            case 'filterAlpa': setFilterMode('alpa'); haptic('light'); break
            case 'filterAll': setFilterMode('all'); haptic('light'); break
            case 'scrollToToday': handleScrollToToday(); haptic('light'); break
            case 'setMobileView':
                setMobileView(payload)
                try { localStorage.setItem('absensi_mobile_view', payload) } catch { }
                haptic('light')
                break
            default: break
        }
    }, [studentList, daysInMonth, tahun, bulan, pushHistory, addToast,
        handleCopyLastMonth, applyUndo, handleScrollToToday])

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <DashboardLayout>
            <div className="p-4 md:p-6 max-w-[1800px] mx-auto">

                {/* Page header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                        <Breadcrumb badge="academic" items={['Attendance Analytics']} className="mb-1" />
                        <h1 className="text-2xl font-black font-heading tracking-tight text-[var(--color-text)]">Absensi Bulanan</h1>
                        <p className="text-[var(--color-text-muted)] text-[11px] mt-0.5 font-medium opacity-70">
                            <span className="sm:hidden">Input &amp; rekap absensi siswa per bulan.</span>
                            <span className="hidden sm:inline">Klik sel untuk ganti status · Tahan &amp; geser untuk isi banyak · Klik nama/tanggal untuk isi cepat</span>
                        </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        {/* ⌘K + Tutorial — hanya tampil di tab Siswa */}
                        {mainTab === 'siswa' && (
                            <>
                                <button
                                    onClick={() => { setShowCommandPalette(true); haptic('light') }}
                                    className="h-8 px-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] text-[10px] font-black flex items-center gap-1.5 hover:bg-[var(--color-border)] hover:text-[var(--color-text)] active:scale-95 transition-all"
                                    title="Command Palette (Ctrl+K)"
                                >
                                    <FontAwesomeIcon icon={faKeyboard} className="text-[9px]" />
                                    <span>⌘ K</span>
                                </button>
                                <button
                                    onClick={() => setShowTutorial(true)}
                                    className="h-8 px-3 rounded-lg border border-amber-500/30 bg-amber-500/8 text-amber-500 text-[10px] font-black flex items-center gap-1.5 hover:bg-amber-500/15 active:scale-95 transition-all"
                                    title="Panduan & Tutorial"
                                >
                                    <FontAwesomeIcon icon={faLightbulb} className="text-[9px]" />
                                    <span>Tutorial</span>
                                </button>
                            </>
                        )}
                        {/* Online indicator — hanya tampil kalau offline */}
                        {!isOnline && (
                            <div className="flex items-center gap-1.5 text-[10px] font-black px-2 py-1 rounded-full border text-red-500 border-red-500/20 bg-red-500/5 transition-colors">
                                <div className="w-1.5 h-1.5 rounded-full shrink-0 bg-red-500" />
                                <span className="hidden sm:inline">Offline</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Main Tab: Siswa / Guru ── */}
                <div className="flex items-center bg-[var(--color-surface-alt)] rounded-xl border border-[var(--color-border)] p-0.5 w-fit mb-5">
                    {[
                        { key: 'siswa', label: 'Absensi Siswa', icon: faChalkboardTeacher },
                        { key: 'guru', label: 'Absensi Guru', icon: faUsers },
                    ].map(t => (
                        <button key={t.key} onClick={() => setMainTab(t.key)}
                            className={`h-8 px-4 rounded-xl text-[11px] font-black flex items-center gap-1.5 transition-all ${mainTab === t.key
                                ? 'bg-[var(--color-surface)] text-[var(--color-text)] shadow-sm'
                                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}>
                            <FontAwesomeIcon icon={t.icon} className="text-[10px]" />
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* ── Guru Tab ── */}
                {mainTab === 'guru' && <GuruTab />}

                {/* ── Siswa Tab ── */}
                {mainTab === 'siswa' && <>

                    {/* Controls bar */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-6">
                        {/* Baris 1 mobile: Kelas + Tabs */}
                        <div className="flex items-center gap-2">
                            {loadingClass ? (
                                <div className="h-9 flex-1 sm:flex-none sm:w-40 rounded-xl bg-[var(--color-border)] animate-pulse" />
                            ) : (
                                <div className="relative flex-1 sm:flex-none">
                                    <FontAwesomeIcon icon={faChalkboardTeacher} className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-[var(--color-text-muted)] pointer-events-none" />
                                    <select value={classId} onChange={e => handleChangeClass(e.target.value)}
                                        className="w-full h-9 pl-8 pr-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[12px] font-bold text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] transition-colors appearance-none cursor-pointer">
                                        {classList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                            )}

                            {/* Tabs — muncul di kanan kelas pada mobile */}
                            <div className="flex items-center bg-[var(--color-surface-alt)] rounded-xl border border-[var(--color-border)] p-0.5 sm:hidden ml-auto">
                                {[
                                    { key: 'input', icon: faCalendarDays },
                                    { key: 'rekap', icon: faChartSimple },
                                ].map(t => (
                                    <button key={t.key} onClick={() => setActiveTab(t.key)}
                                        className={`h-8 px-3 rounded-xl text-[11px] font-black flex items-center gap-1.5 transition-all ${activeTab === t.key
                                            ? 'bg-[var(--color-surface)] text-[var(--color-text)] shadow-sm'
                                            : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}>
                                        <FontAwesomeIcon icon={t.icon} className="text-[10px]" />
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Baris 2 mobile / sama baris desktop: Month nav + Tabs */}
                        <div className="flex items-center gap-2">
                            {/* Month nav */}
                            <div className="flex items-center gap-0.5 bg-[var(--color-surface-alt)] rounded-xl border border-[var(--color-border)] p-0.5 flex-1 sm:flex-none justify-between sm:justify-start">
                                <button onClick={prevBulan} className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)] transition-all">
                                    <FontAwesomeIcon icon={faChevronLeft} className="text-[10px]" />
                                </button>
                                <span className="px-2 text-[12px] font-black text-[var(--color-text)] min-w-[110px] text-center tabular-nums">
                                    {BULAN_NAMA[bulan]} {tahun}
                                </span>
                                <button onClick={nextBulan} className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)] transition-all">
                                    <FontAwesomeIcon icon={faChevronRight} className="text-[10px]" />
                                </button>
                            </div>

                            {/* Tabs — hanya di desktop */}
                            <div className="hidden sm:flex items-center bg-[var(--color-surface-alt)] rounded-xl border border-[var(--color-border)] p-0.5 ml-auto">
                                {[
                                    { key: 'input', label: 'Input', icon: faCalendarDays },
                                    { key: 'rekap', label: 'Rekap', icon: faChartSimple },
                                ].map(t => (
                                    <button key={t.key} onClick={() => setActiveTab(t.key)}
                                        className={`h-8 px-4 rounded-xl text-[11px] font-black flex items-center gap-1.5 transition-all ${activeTab === t.key
                                            ? 'bg-[var(--color-surface)] text-[var(--color-text)] shadow-sm'
                                            : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}>
                                        <FontAwesomeIcon icon={t.icon} className="text-[10px]" />
                                        {t.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Draft banner */}
                    {draftAvail && !isDirty && (
                        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-amber-500/20 bg-amber-500/5 mb-4">
                            <FontAwesomeIcon icon={faExclamationTriangle} className="text-amber-500 shrink-0" />
                            <p className="text-[11px] text-amber-600 font-medium flex-1">Ada draft dari sesi sebelumnya</p>
                            <button onClick={() => {
                                try {
                                    const raw = localStorage.getItem(draftKey(classId, tahun, bulan))
                                    if (raw) { const { dataMap: dm } = JSON.parse(raw); setDataMap(dm); setIsDirty(true); setDraftAvail(false) }
                                } catch { }
                            }} className="text-[10px] font-black text-amber-600 hover:text-amber-700 underline underline-offset-2">Pulihkan</button>
                            <button onClick={() => {
                                try { localStorage.removeItem(draftKey(classId, tahun, bulan)) } catch { }
                                setDraftAvail(false)
                            }} className="text-[10px] font-black text-[var(--color-text-muted)] hover:text-[var(--color-text)]">Buang</button>
                        </div>
                    )}

                    {/* Main card */}
                    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden shadow-sm">

                        {/* ══ TAB INPUT ══════════════════════════════════════════ */}
                        {activeTab === 'input' && (
                            <>
                                {/* ── Toolbar ── */}
                                <div className="px-3 md:px-4 py-3 border-b border-[var(--color-border)] flex flex-col gap-3">

                                    {/* Row 1: Actions & Controls */}
                                    <div className="flex items-center justify-between w-full overflow-x-auto no-scrollbar pb-1 sm:pb-0 gap-4">
                                        
                                        {/* Left: Data & History Actions */}
                                        <div className="flex items-center gap-3 shrink-0">
                                            {/* Group: Data Actions */}
                                            <div className="flex items-center bg-[var(--color-surface-alt)] rounded-xl border border-[var(--color-border)] p-0.5 shadow-sm">
                                                <MassActionDropdown
                                                    studentList={studentList}
                                                    dataMap={dataMap}
                                                    setDataMap={setDataMap}
                                                    tahun={tahun}
                                                    bulan={bulan}
                                                    daysInMonth={daysInMonth}
                                                    onDirty={markDirty}
                                                    addToast={addToast}
                                                />
                                                <div className="w-px h-4 bg-[var(--color-border)] mx-0.5" />
                                                <button onClick={handleCopyLastMonth} disabled={copyingLastMonth || loadingData}
                                                    className="h-8 px-2.5 rounded-lg text-[10px] font-black text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)] transition-all flex items-center gap-1.5 disabled:opacity-40"
                                                    title="Salin data dari bulan lalu">
                                                    {copyingLastMonth ? <FontAwesomeIcon icon={faSpinner} className="animate-spin text-[9px]" /> : <FontAwesomeIcon icon={faCopy} className="text-[9px]" />}
                                                    <span className="hidden lg:inline">Salin Bulan Lalu</span>
                                                    <span className="lg:hidden sm:inline">Salin</span>
                                                </button>
                                                <button onClick={() => setShowImport(true)}
                                                    className="h-8 px-2.5 rounded-lg text-[10px] font-black text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)] transition-all flex items-center gap-1.5"
                                                    title="Import data">
                                                    <FontAwesomeIcon icon={faFileImport} className="text-[9px]" />
                                                    <span className="hidden sm:inline">Import</span>
                                                </button>
                                            </div>

                                            {/* Group: History & Navigation */}
                                            <div className="flex items-center bg-[var(--color-surface-alt)] rounded-xl border border-[var(--color-border)] p-0.5 shadow-sm">
                                                <button onClick={applyUndo} disabled={!canUndo} title="Batalkan (Ctrl+Z)"
                                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)] transition-all disabled:opacity-30">
                                                    <FontAwesomeIcon icon={faRotateLeft} className="text-[10px]" />
                                                </button>
                                                <button onClick={applyRedo} disabled={!canRedo} title="Ulangi (Ctrl+Y)"
                                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)] transition-all disabled:opacity-30">
                                                    <FontAwesomeIcon icon={faRotateRight} className="text-[10px]" />
                                                </button>
                                                <div className="w-px h-4 bg-[var(--color-border)] mx-0.5" />
                                                <button onClick={handleScrollToToday} disabled={!todayDate}
                                                    className="h-8 px-3 rounded-lg text-[10px] font-black text-indigo-600 hover:bg-indigo-500/10 transition-all flex items-center gap-1.5 disabled:opacity-40"
                                                    title="Scroll ke kolom hari ini">
                                                    <FontAwesomeIcon icon={faCrosshairs} className="text-[9px]" />
                                                    <span className="hidden sm:inline text-indigo-700">HARI INI</span>
                                                </button>
                                            </div>
                                        </div>

                                        {/* Right: View Settings & Legend */}
                                        <div className="flex items-center gap-3 shrink-0 ml-auto">
                                            {/* Group: View Settings (Desktop) */}
                                            <div className="hidden sm:flex items-center bg-[var(--color-surface-alt)] rounded-xl border border-[var(--color-border)] p-0.5 shadow-sm">
                                                <button onClick={() => setHideWeekend(v => !v)}
                                                    className={`h-8 px-3 rounded-lg text-[10px] font-black transition-all flex items-center gap-1.5 ${hideWeekend ? 'bg-indigo-500 text-white shadow-sm' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)]'}`}
                                                    title="Toggle akhir pekan">
                                                    <FontAwesomeIcon icon={hideWeekend ? faEyeSlash : faEye} className="text-[9px]" />
                                                    <span className="hidden lg:inline">{hideWeekend ? 'Tampilkan Weekend' : 'Sembunyikan Weekend'}</span>
                                                </button>
                                                <div className="w-px h-4 bg-[var(--color-border)] mx-0.5" />
                                                <select value={filterMode} onChange={e => setFilterMode(e.target.value)}
                                                    className={`h-8 px-2 rounded-lg text-[10px] font-black outline-none cursor-pointer bg-transparent transition-all ${filterMode !== 'all' ? 'text-amber-600' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}>
                                                    <option value="all">Semua Siswa</option>
                                                    <option value="alpa">Alpa ≥ {alertThreshold.alpa}</option>
                                                    <option value="belum">Belum diisi</option>
                                                </select>
                                                <button onClick={() => setShowAlertConfig(true)}
                                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)] transition-all"
                                                    title="Konfigurasi alert">
                                                    <FontAwesomeIcon icon={faBell} className="text-[10px]" />
                                                </button>
                                            </div>

                                            {/* Legend — Compact (Desktop Only) */}
                                            <div className="hidden xl:flex items-center gap-1.5 px-2 py-1 bg-[var(--color-surface-alt)]/50 rounded-xl border border-[var(--color-border)]">
                                                {STATUS_LIST.map(s => (
                                                    <div key={s}
                                                        className={`w-6 h-6 rounded-md border flex items-center justify-center text-[10px] font-black cursor-help transition-all hover:scale-110 shadow-sm ${STATUS_META[s].cellBg} ${STATUS_META[s].color} ${STATUS_META[s].cellBorder}`}
                                                        title={STATUS_META[s].label}>
                                                        {s}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Row 2: Search & Progress */}
                                    <div className="flex items-center gap-4 w-full">
                                        
                                        {/* Desktop Progress - Wider to balance space */}
                                        <div className="hidden lg:flex flex-col items-start gap-1 w-64 xl:w-80 shrink-0">
                                            <div className="flex items-center justify-between w-full">
                                                <span className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest opacity-60">Penyelesaian</span>
                                                <span className={`text-[10px] font-black tabular-nums ${completionPct === 100 ? 'text-emerald-600' : completionPct >= 60 ? 'text-indigo-600' : 'text-amber-600'}`}>{completionPct}%</span>
                                            </div>
                                            <div className="w-full h-1.5 rounded-full bg-[var(--color-border)] overflow-hidden">
                                                <div className="h-full transition-all duration-700 ease-out"
                                                    style={{
                                                        width: `${completionPct}%`,
                                                        backgroundColor: completionPct === 100 ? '#059669' : completionPct >= 60 ? '#6366f1' : '#d97706',
                                                        boxShadow: '0 0 4px rgba(0,0,0,0.1)'
                                                    }}
                                                />
                                            </div>
                                        </div>

                                        {/* Mobile view switchers & progress */}
                                        <div className="sm:hidden flex items-center gap-2 shrink-0">
                                            {/* View switcher */}
                                            <div className="flex items-center gap-0.5 bg-[var(--color-surface-alt)] rounded-xl border border-[var(--color-border)] p-0.5">
                                                {[
                                                    { key: 'table', icon: faTableCells, label: 'Tabel' },
                                                    { key: 'card', icon: faBorderAll, label: 'Card' },
                                                    { key: 'list', icon: faList, label: 'List' },
                                                ].map(v => (
                                                    <button key={v.key}
                                                        onClick={() => { setMobileView(v.key); try { localStorage.setItem('absensi_mobile_view', v.key) } catch { } }}
                                                        className={`w-8 h-7 rounded-lg flex items-center justify-center text-[10px] transition-all ${mobileView === v.key ? 'bg-white shadow-sm text-indigo-600' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}>
                                                        <FontAwesomeIcon icon={v.icon} />
                                                    </button>
                                                ))}
                                            </div>
                                            
                                            {/* Mobile completion compact */}
                                            {studentList.length > 0 && (
                                                <div className="flex items-center gap-2 px-2 h-8 bg-[var(--color-surface-alt)] rounded-lg border border-[var(--color-border)]">
                                                    <div className="w-10 h-1 rounded-full bg-[var(--color-border)] overflow-hidden">
                                                        <div className="h-full rounded-full transition-all duration-300"
                                                            style={{ width: `${completionPct}%`, background: completionPct === 100 ? '#059669' : completionPct >= 60 ? '#6366f1' : '#d97706' }} />
                                                    </div>
                                                    <span className={`text-[10px] font-black tabular-nums ${completionPct === 100 ? 'text-emerald-600' : completionPct >= 60 ? 'text-indigo-500' : 'text-amber-600'}`}>
                                                        {completionPct}%
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Search Input — Flex-1 to stretch & fill the remaining space without max-width */}
                                        <div className="relative group flex-1 w-full">
                                            <FontAwesomeIcon icon={faMagnifyingGlass} className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-[var(--color-text-muted)] group-focus-within:text-indigo-500 transition-colors pointer-events-none" />
                                            <input value={searchRaw} onChange={e => setSearchRaw(e.target.value)} placeholder="Cari nama / NISN..."
                                                className="w-full h-8 sm:h-9 pl-9 pr-8 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/50 text-[11px] font-medium text-[var(--color-text)] outline-none focus:border-indigo-500 focus:bg-[var(--color-surface)] focus:shadow-md transition-all placeholder:opacity-50" />
                                            {searchRaw && (
                                                <button onClick={() => setSearchRaw('')} className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-[var(--color-text-muted)] hover:text-red-500 text-[14px] transition-colors">&times;</button>
                                            )}
                                        </div>

                                        <button onClick={() => setShowMobileSheet(true)}
                                            className="sm:hidden shrink-0 w-8 h-8 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] shadow-sm text-indigo-600 flex items-center justify-center active:scale-95 transition-transform">
                                            <FontAwesomeIcon icon={faGear} className="text-xs" />
                                        </button>
                                    </div>
                                </div>

                                {/* ── Mobile toolbar sheet ── */}
                                <MobileToolbarSheet open={showMobileSheet} onClose={() => setShowMobileSheet(false)}>
                                    {/* Hide Weekend */}
                                    <button
                                        onClick={() => setHideWeekend(v => !v)}
                                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${hideWeekend
                                            ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-600'
                                            : 'border-[var(--color-border)] text-[var(--color-text)]'}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <FontAwesomeIcon icon={hideWeekend ? faEyeSlash : faEye} className="text-[13px] w-4" />
                                            <div className="text-left">
                                                <p className="text-[12px] font-black">Sembunyikan Weekend</p>
                                                <p className="text-[10px] text-[var(--color-text-muted)]">Sembunyikan kolom Sabtu & Minggu</p>
                                            </div>
                                        </div>
                                        <div className={`w-8 h-4 rounded-full transition-colors ${hideWeekend ? 'bg-indigo-500' : 'bg-[var(--color-border)]'}`}>
                                            <div className={`w-3.5 h-3.5 rounded-full bg-white shadow mt-0.5 transition-all ${hideWeekend ? 'ml-4' : 'ml-0.5'}`} />
                                        </div>
                                    </button>

                                    {/* Filter siswa */}
                                    <div className="px-4 py-3 rounded-xl border border-[var(--color-border)]">
                                        <p className="text-[11px] font-black text-[var(--color-text)] mb-2 flex items-center gap-2">
                                            <FontAwesomeIcon icon={faFilter} className="text-[11px]" />
                                            Filter Siswa
                                        </p>
                                        <div className="flex flex-col gap-1.5">
                                            {[
                                                { val: 'all', label: 'Semua Siswa', sub: 'Tampilkan semua' },
                                                { val: 'alpa', label: `Alpa ≥ ${alertThreshold.alpa} hari`, sub: 'Siswa perlu perhatian' },
                                                { val: 'belum', label: 'Belum diisi', sub: 'Data masih kosong' },
                                            ].map(opt => (
                                                <button key={opt.val}
                                                    onClick={() => setFilterMode(opt.val)}
                                                    className={`flex items-center justify-between px-3 py-2 rounded-lg border text-left transition-all ${filterMode === opt.val
                                                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-700'
                                                        : 'border-[var(--color-border)] text-[var(--color-text-muted)]'}`}>
                                                    <div>
                                                        <p className="text-[11px] font-black">{opt.label}</p>
                                                        <p className="text-[9px] opacity-70">{opt.sub}</p>
                                                    </div>
                                                    {filterMode === opt.val && <FontAwesomeIcon icon={faCheck} className="text-amber-600 text-[11px]" />}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Alert threshold */}
                                    <button
                                        onClick={() => { setShowMobileSheet(false); setTimeout(() => setShowAlertConfig(true), 200) }}
                                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-[var(--color-border)] text-[var(--color-text)] transition-all hover:bg-[var(--color-surface-alt)]"
                                    >
                                        <FontAwesomeIcon icon={faBell} className="text-[13px] w-4 text-amber-500" />
                                        <div className="text-left">
                                            <p className="text-[12px] font-black">Konfigurasi Alert</p>
                                            <p className="text-[10px] text-[var(--color-text-muted)]">Alpa ≥ {alertThreshold.alpa} hari · Hadir &lt; {alertThreshold.hadirPct}%</p>
                                        </div>
                                        <FontAwesomeIcon icon={faChevronRight} className="ml-auto text-[10px] text-[var(--color-text-muted)]" />
                                    </button>
                                </MobileToolbarSheet>

                                {/* ── Mobile: Card View ── */}
                                <div className={`sm:hidden ${mobileView === 'card' ? '' : 'hidden'}`}>
                                    <MobileCardView
                                        filteredStudents={filteredStudents}
                                        dataMap={dataMap}
                                        tahun={tahun} bulan={bulan} daysInMonth={daysInMonth}
                                        todayDate={todayDate}
                                        onCellClick={handleCellClick}
                                        notesMap={notesMap}
                                        onNoteClick={setNoteTarget}
                                        alpaThreshold={alertThreshold.alpa}
                                        hadirThreshold={alertThreshold.hadirPct}
                                        loadingData={loadingData}
                                    />
                                </div>

                                {/* ── Mobile: List View ── */}
                                <div className={`sm:hidden ${mobileView === 'list' ? '' : 'hidden'}`}>
                                    <MobileListView
                                        filteredStudents={filteredStudents}
                                        dataMap={dataMap}
                                        tahun={tahun} bulan={bulan} daysInMonth={daysInMonth}
                                        todayDate={todayDate}
                                        onCellClick={handleCellClick}
                                        notesMap={notesMap}
                                        onNoteClick={setNoteTarget}
                                        alpaThreshold={alertThreshold.alpa}
                                        hadirThreshold={alertThreshold.hadirPct}
                                        loadingData={loadingData}
                                    />
                                </div>

                                {/* ── Desktop always table + Mobile table view ── */}
                                <div className={`${mobileView !== 'table' ? 'hidden sm:block' : ''}`}>
                                    {/* Landscape table */}
                                    <div className="overflow-x-auto">
                                        <table style={{ borderCollapse: 'collapse', minWidth: 'max-content', width: '100%' }}>
                                            <thead>
                                                {/* Row 1: angka tanggal — # dan Nama span 2 baris */}
                                                <tr style={{ backgroundColor: 'var(--color-surface-alt)' }}>
                                                    {/* No header — rowSpan 2 */}
                                                    <th
                                                        rowSpan={2}
                                                        style={{
                                                            position: 'sticky', left: 0, zIndex: 6,
                                                            width: W_NO, minWidth: W_NO,
                                                            backgroundColor: 'var(--color-surface-alt)',
                                                            borderRight: '1px solid var(--color-border)',
                                                            borderBottom: '2px solid var(--color-border)',
                                                            padding: '0 4px', textAlign: 'center',
                                                            boxShadow: '2px 0 4px -2px rgba(0,0,0,0.06)',
                                                            verticalAlign: 'middle',
                                                        }}
                                                    >
                                                        <span className="text-[9px] font-black text-[var(--color-text-muted)]">#</span>
                                                    </th>
                                                    {/* Nama header — rowSpan 2 */}
                                                    <th
                                                        rowSpan={2}
                                                        style={{
                                                            position: 'sticky', left: W_NO, zIndex: 6,
                                                            width: W_NAMA, minWidth: W_NAMA,
                                                            backgroundColor: 'var(--color-surface-alt)',
                                                            borderRight: '2px solid var(--color-border)',
                                                            borderBottom: '2px solid var(--color-border)',
                                                            padding: '0 12px', textAlign: 'left',
                                                            boxShadow: '4px 0 10px -4px rgba(0,0,0,0.12)',
                                                            verticalAlign: 'middle',
                                                        }}
                                                    >
                                                        <span className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Nama Siswa</span>
                                                    </th>
                                                    {/* Day number headers */}
                                                    {dayMeta.filter(dm => !(hideWeekend && dm.weekend) && !dm.invalid).map(({ d, weekend, dow }) => (
                                                        <th key={d}
                                                            ref={d === todayDate ? todayColRef : undefined}
                                                            onClick={!loadingData && studentList.length > 0
                                                                ? (e) => {
                                                                    const rect = e.currentTarget.getBoundingClientRect()
                                                                    setColFillTarget({ d, dow, x: rect.left, y: rect.bottom })
                                                                }
                                                                : undefined
                                                            }
                                                            style={{
                                                                width: 36, minWidth: 36,
                                                                padding: '8px 0',
                                                                textAlign: 'center',
                                                                borderBottom: '2px solid var(--color-border)',
                                                                borderLeft: d === todayDate ? '1px solid #6366f130' : '1px solid var(--color-border)',
                                                                backgroundColor: d === todayDate ? '#6366f108' : weekend ? '#fee2e240' : 'var(--color-surface-alt)',
                                                                cursor: 'pointer',
                                                                transition: 'background-color 0.2s',
                                                            }}
                                                            title={`Klik untuk isi semua siswa — tgl ${d}`}
                                                            className="group hover:bg-indigo-50/50"
                                                        >
                                                            <span className={`text-[11px] font-black transition-transform group-active:scale-90 inline-block`}
                                                                style={{ color: d === todayDate ? '#6366f1' : weekend ? '#ef4444' : 'var(--color-text-muted)' }}>
                                                                {d}
                                                            </span>
                                                        </th>
                                                    ))}
                                                    {/* Summary headers — STICKY RIGHT */}
                                                    {STATUS_LIST.map((s, i) => {
                                                        const rightOffset = 40 + (STATUS_LIST.length - 1 - i) * 28;
                                                        return (
                                                            <th key={s}
                                                                rowSpan={2}
                                                                style={{
                                                                    position: 'sticky', right: rightOffset, zIndex: 6,
                                                                    width: 28, minWidth: 28,
                                                                    padding: '6px 2px', textAlign: 'center',
                                                                    borderBottom: '2px solid var(--color-border)',
                                                                    borderLeft: i === 0 ? '2px solid var(--color-border)' : '1px solid var(--color-border)',
                                                                    background: 'var(--color-surface-alt)',
                                                                    verticalAlign: 'middle',
                                                                    boxShadow: i === 0 ? '-4px 0 8px -4px rgba(0,0,0,0.08)' : 'none'
                                                                }}
                                                            >
                                                                <span className={`text-[9px] font-black ${STATUS_META[s].color}`}>{s}</span>
                                                            </th>
                                                        );
                                                    })}
                                                    <th rowSpan={2} style={{
                                                        position: 'sticky', right: 0, zIndex: 6,
                                                        width: 40, minWidth: 40,
                                                        padding: '6px 2px', textAlign: 'center',
                                                        borderBottom: '2px solid var(--color-border)',
                                                        borderLeft: '2px solid var(--color-border)',
                                                        background: 'var(--color-surface-alt)',
                                                        verticalAlign: 'middle',
                                                        boxShadow: '-2px 0 4px -2px rgba(0,0,0,0.06)'
                                                    }}>
                                                        <span className="text-[9px] font-black text-[var(--color-text-muted)]">%</span>
                                                    </th>
                                                </tr>

                                                {/* Row 2: nama hari */}
                                                <tr className="bg-[var(--color-surface-alt)]">
                                                    {/* # dan Nama sudah di-rowSpan dari Row 1, tidak perlu placeholder */}
                                                    {dayMeta.filter(dm => !(hideWeekend && dm.weekend) && !dm.invalid).map(({ d, weekend, dow }) => (
                                                        <th key={d}
                                                            style={{
                                                                width: 36, minWidth: 36, padding: '4px 0', textAlign: 'center',
                                                                borderBottom: '1px solid var(--color-border)',
                                                                borderLeft: d === todayDate ? '1px solid #6366f130' : '1px solid var(--color-border)',
                                                                backgroundColor: d === todayDate ? '#6366f108' : weekend ? '#fee2e240' : 'var(--color-surface-alt)',
                                                            }}
                                                        >
                                                            <span className={`text-[8px] font-bold uppercase tracking-tighter`}
                                                                style={{ color: weekend ? '#f87171' : 'var(--color-text-muted)', opacity: d === todayDate ? 1 : 0.6 }}>
                                                                {DOW_SHORT[dow]}
                                                            </span>
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>

                                            <tbody>
                                                {loadingData
                                                    ? Array.from({ length: 6 }).map((_, i) => <RowSkeleton key={i} colCount={visibleDays.length} />)
                                                    : filteredStudents.length === 0
                                                        ? (
                                                            <tr>
                                                                <td colSpan={38} className="py-12 text-center">
                                                                    {searchRaw ? (
                                                                        // Empty: search no results
                                                                        <EmptyState 
                                                                            icon={faMagnifyingGlass}
                                                                            title="Tidak ada hasil"
                                                                            description={`Tidak ada siswa yang cocok dengan "${searchRaw}"`}
                                                                            variant="plain"
                                                                            color="slate"
                                                                            action={
                                                                                <button onClick={() => setSearchRaw('')}
                                                                                    className="h-8 px-4 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[11px] font-black text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-all">
                                                                                    Hapus pencarian
                                                                                </button>
                                                                            }
                                                                        />
                                                                    ) : filterMode !== 'all' ? (
                                                                        // Empty: filter active
                                                                        <EmptyState 
                                                                            icon={faFilter}
                                                                            title="Tidak ada siswa yang cocok"
                                                                            description="Filter aktif tidak menemukan siswa"
                                                                            variant="plain"
                                                                            color="slate"
                                                                            action={
                                                                                <button onClick={() => setFilterMode('all')}
                                                                                    className="h-8 px-4 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[11px] font-black text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-all flex items-center gap-1.5">
                                                                                    <FontAwesomeIcon icon={faArrowsRotate} className="text-[9px]" /> Reset filter
                                                                                </button>
                                                                            }
                                                                        />
                                                                    ) : completionPct === 0 && studentList.length > 0 ? (
                                                                        // Empty: no data yet this month — engaging CTA
                                                                        <EmptyState 
                                                                            icon={faCalendarDays}
                                                                            title={`Belum ada absensi ${BULAN_NAMA[bulan]}`}
                                                                            description="Mulai isi sekarang, atau salin dari bulan sebelumnya jika polanya sama."
                                                                            variant="plain"
                                                                            color="indigo"
                                                                            action={
                                                                                <div className="flex items-center gap-2 flex-wrap justify-center">
                                                                                    <button
                                                                                        onClick={handleCopyLastMonth}
                                                                                        disabled={copyingLastMonth}
                                                                                        className="h-9 px-4 rounded-xl bg-[var(--color-primary)] text-white text-[11px] font-black flex items-center gap-2 hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 shadow-sm shadow-[var(--color-primary)]/20">
                                                                                        {copyingLastMonth ? <FontAwesomeIcon icon={faSpinner} className="animate-spin" /> : <FontAwesomeIcon icon={faCopy} />}
                                                                                        Copy dari {BULAN_NAMA[bulan === 1 ? 12 : bulan - 1]}
                                                                                    </button>
                                                                                    <button
                                                                                        onClick={() => { setShowCommandPalette(true); haptic('light') }}
                                                                                        className="h-9 px-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[11px] font-black text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-border)] active:scale-95 transition-all flex items-center gap-2">
                                                                                        <FontAwesomeIcon icon={faWandMagicSparkles} className="text-[9px]" />
                                                                                        Isi cepat ⌘K
                                                                                    </button>
                                                                                </div>
                                                                            }
                                                                        />
                                                                    ) : (
                                                                        // Generic empty
                                                                        <EmptyState 
                                                                            icon={faUsers}
                                                                            title="Tidak ada siswa aktif"
                                                                            description="Siswa kelas ini belum ditambahkan atau tidak ada siswa aktif."
                                                                            variant="plain"
                                                                            color="slate"
                                                                        />
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        )
                                                        : filteredStudents.map((s, idx) => {
                                                            return (
                                                                <StudentRow
                                                                    key={s.id}
                                                                    student={s} idx={idx}
                                                                    days={dataMap[s.id] || {}}
                                                                    tahun={tahun} bulan={bulan}
                                                                    daysInMonth={daysInMonth}
                                                                    todayDate={todayDate}
                                                                    onCellMouseDown={handleCellMouseDown}
                                                                    onCellMouseEnter={handleCellMouseEnter}
                                                                    onRowFill={handleRowFillClick}
                                                                    onNoteClick={handleNoteClick}
                                                                    note={notesMap[s.id]}
                                                                    hideWeekend={hideWeekend}
                                                                    visibleDays={visibleDays}
                                                                    focusedDay={focusedCell?.rowIdx === idx ? focusedCell.day : null}
                                                                    alpaThreshold={alertThreshold.alpa}
                                                                    hadirThreshold={alertThreshold.hadirPct}
                                                                />
                                                            )
                                                        })
                                                }
                                            </tbody>

                                            {/* Footer total per kolom */}
                                            {!loadingData && studentList.length > 0 && (
                                                <tfoot>
                                                    <tr className="bg-[var(--color-surface-alt)]">
                                                        <td
                                                            style={{ position: 'sticky', left: 0, zIndex: 4, width: W_NO, minWidth: W_NO, backgroundColor: 'var(--color-surface-alt)', borderTop: '2px solid var(--color-border)', borderRight: '1px solid var(--color-border)', boxShadow: '2px 0 4px -2px rgba(0,0,0,0.06)' }}
                                                        />
                                                        <td
                                                            style={{ position: 'sticky', left: W_NO, zIndex: 4, width: W_NAMA, minWidth: W_NAMA, backgroundColor: 'var(--color-surface-alt)', borderTop: '2px solid var(--color-border)', borderRight: '2px solid var(--color-border)', padding: '6px 12px', boxShadow: '4px 0 8px -4px rgba(0,0,0,0.08)' }}
                                                        >
                                                            <span className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Total / Hari</span>
                                                        </td>
                                                        {dayMeta.filter(dm => !(hideWeekend && dm.weekend) && !dm.invalid).map(({ d, weekend }) => {
                                                            const { h, x } = colSummary[d] || { h: 0, x: 0 }
                                                            return (
                                                                <td key={d}
                                                                    style={{
                                                                        width: 32, minWidth: 32, padding: '4px 0', textAlign: 'center',
                                                                        borderTop: '2px solid var(--color-border)',
                                                                        borderLeft: '1px solid var(--color-border)',
                                                                        background: 'var(--color-surface-alt)',
                                                                        opacity: weekend ? 0.35 : 1,
                                                                    }}
                                                                >
                                                                    {h > 0 && <span style={{ display: 'block', fontSize: 8, fontWeight: 900, color: '#059669', lineHeight: '1.2' }}>{h}</span>}
                                                                    {x > 0 && <span style={{ display: 'block', fontSize: 8, fontWeight: 900, color: '#dc2626', lineHeight: '1.2' }}>{x}</span>}
                                                                </td>
                                                            )
                                                        })}
                                                        {STATUS_LIST.map((s, i) => {
                                                            const rightOffset = 40 + (STATUS_LIST.length - 1 - i) * 28;
                                                            const total = studentList.reduce((acc, st) =>
                                                                acc + Object.values(dataMap[st.id] || {}).filter(v => v === s).length, 0)
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
                                </div>{/* end table wrapper */}

                                {/* Footer bar */}
                                {studentList.length > 0 && (
                                    <div className="px-5 py-3 border-t border-[var(--color-border)] flex flex-wrap items-center justify-between gap-3 bg-[var(--color-surface-alt)]/20">
                                        <p className="text-[11px] text-[var(--color-text-muted)] font-medium">
                                            {filteredStudents.length !== studentList.length
                                                ? `${filteredStudents.length} dari ${studentList.length} siswa`
                                                : `${studentList.length} siswa`
                                            } &middot; {BULAN_NAMA[bulan]} {tahun} &middot; {daysInMonth} hari
                                        </p>
                                        <button onClick={handleSave} disabled={saving || !isDirty}
                                            className={`h-9 px-5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${isDirty
                                                ? 'bg-[var(--color-primary)] hover:opacity-90 text-white shadow-lg shadow-[var(--color-primary)]/20'
                                                : 'bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text-muted)] cursor-not-allowed opacity-60'
                                                }`}>
                                            {saving ? <FontAwesomeIcon icon={faSpinner} className="animate-spin" /> : <FontAwesomeIcon icon={faSave} />}
                                            {isDirty ? 'Simpan Perubahan' : 'Tersimpan'}
                                        </button>
                                    </div>
                                )}
                            </>
                        )}

                        {/* ══ TAB REKAP ══════════════════════════════════════════ */}
                        {activeTab === 'rekap' && (
                            <RekapBulananPanel
                                classId={classId} tahun={tahun} bulan={bulan}
                                studentList={studentList} dataMap={dataMap}
                            />
                        )}

                    </div>

                    {/* Floating save bar */}
                    <div
                        className={`fixed bottom-20 sm:bottom-6 -translate-x-1/2 z-50 transition-all duration-300 px-4 w-full sm:w-auto ${isDirty && activeTab === 'input'
                            ? 'opacity-100 translate-y-0 pointer-events-auto'
                            : 'opacity-0 translate-y-4 pointer-events-none'}`}
                        style={{
                            left: dir === 'rtl'
                                ? 'calc(50vw - (var(--sidebar-width, 0px) / 2))'
                                : 'calc(50vw + (var(--sidebar-width, 0px) / 2))'
                        }}
                    >
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

                    {/* Confirm Modal — ganti kelas/bulan saat ada perubahan */}
                    {confirmModal && (
                        <ConfirmModal
                            message={confirmModal.message}
                            confirmLabel={confirmModal.confirmLabel}
                            onConfirm={confirmModal.onConfirm}
                            onCancel={() => setConfirmModal(null)}
                        />
                    )}

                    {/* Feature 6: Note popup */}
                    {noteTarget && (
                        <NotePopup
                            student={noteTarget.student}
                            note={notesMap[noteTarget.student.id]}
                            x={noteTarget.x}
                            y={noteTarget.y}
                            onSave={(text) => handleSaveNote(noteTarget.student.id, text)}
                            onClose={() => setNoteTarget(null)}
                        />
                    )}

                    {/* Feature 7: Import modal */}
                    {showImport && (
                        <ImportModal
                            studentList={studentList}
                            tahun={tahun}
                            bulan={bulan}
                            daysInMonth={daysInMonth}
                            onImport={handleImport}
                            onClose={() => setShowImport(false)}
                        />
                    )}

                    {/* Feature 10: Alert threshold modal */}
                    {showAlertConfig && (
                        <AlertThresholdModal
                            threshold={alertThreshold}
                            onSave={handleSaveThreshold}
                            onClose={() => setShowAlertConfig(false)}
                        />
                    )}

                    {/* ColFill popup */}
                    {colFillTarget && (
                        <ColFillPopup
                            day={colFillTarget.d}
                            dow={colFillTarget.dow}
                            x={colFillTarget.x}
                            y={colFillTarget.y}
                            studentCount={studentList.length}
                            onFill={(status) => handleColFill(colFillTarget.d, status)}
                            onClear={() => handleColClear(colFillTarget.d)}
                            onClose={() => setColFillTarget(null)}
                        />
                    )}

                    {/* RowFill popup */}
                    {rowFillTarget && (
                        <RowFillPopup
                            student={rowFillTarget.student}
                            x={rowFillTarget.x}
                            y={rowFillTarget.y}
                            weekdays={countWeekdays(tahun, bulan)}
                            onFill={(status) => handleRowFill(rowFillTarget.student.id, status)}
                            onClear={() => handleRowClear(rowFillTarget.student.id)}
                            onClose={() => setRowFillTarget(null)}
                        />
                    )}
                </> /* end siswa */}
            </div>

            {/* ── Global modals — aktif di kedua tab siswa & guru ── */}

            {/* Tutorial modal */}
            {showTutorial && <TutorialModal onClose={() => setShowTutorial(false)} />}

            {/* Command Palette */}
            <CommandPalette
                open={showCommandPalette}
                onClose={() => setShowCommandPalette(false)}
                onAction={handleCommandAction}
                studentCount={studentList.length}
                bulan={bulan} tahun={tahun}
                completionPct={completionPct}
                isDirty={isDirty}
                filterMode={filterMode}
                hideWeekend={hideWeekend}
                mobileView={mobileView}
            />

        </DashboardLayout>
    )
}