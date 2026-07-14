import { memo, useState, useEffect, useRef } from 'react'
import {
    Loader2, CheckCircle2, Save, FileText, X,
    ClipboardList, Zap, Lightbulb, Languages, Star, Heart
} from 'lucide-react'
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

export const ScoreCell = memo(({ value, studentId, kriteria, onScoreChange, onKeyDown, si, ki, cellRefs, maxScore, reportType, classLevel }) => {
    const [focused, setFocused] = useState(false)
    const [hasError, setHasError] = useState(false)
    const val = value !== '' && value !== null && value !== undefined ? Number(value) : ''
    const g = val !== '' ? getGradePredicate(val, reportType, classLevel, kriteria.key) : null

    const handleChange = (e) => {
        const raw = e.target.value.replace(/[^0-9]/g, '')
        if (raw === '') { setHasError(false); onScoreChange(studentId, kriteria.key, ''); return }
        const num = Number(raw)
        if (num < 0 || num > maxScore) {
            setHasError(true); onScoreChange(studentId, kriteria.key, Math.min(maxScore, Math.max(0, num)))
            setTimeout(() => setHasError(false), 1200)
        } else {
            setHasError(false); onScoreChange(studentId, kriteria.key, num)
        }
    }

    return (
        <div title={g ? `${kriteria.id}: ${val} — ${g.id} (${g.label})` : kriteria.id}>
            <input
                ref={el => { if (el) cellRefs.current[`${si}-${ki}`] = el }}
                type="text"
                inputMode="decimal"
                min={0}
                max={maxScore}
                value={val}
                onChange={handleChange}
                onKeyDown={e => onKeyDown(e, si, ki)}
                onFocus={() => setFocused(true)}
                onBlur={() => { setFocused(false); setHasError(false) }}
                aria-label={`Nilai ${kriteria.id}`}
                className="w-9 h-8 text-center text-[13px] font-black rounded-lg outline-none transition-all appearance-none"
                style={{
                    background: hasError ? '#ef444415' : g ? g.bg : 'var(--color-surface-alt)',
                    color: hasError ? '#ef4444' : g ? g.uiColor : 'var(--color-text-muted)',
                    border: `2px solid ${hasError ? '#ef4444' : focused ? (g ? g.uiColor : 'var(--color-primary)') : (g ? g.border : 'var(--color-border)')}`
                }}
                placeholder="—"
            />
        </div>
    )
})

export const ExtraInput = memo(({ value, studentId, fieldKey, onCommit, ...inputProps }) => {
    const [localVal, setLocalVal] = useState(value ?? '')
    const [focused, setFocused] = useState(false)
    const debounceRef = useRef(null)

    useEffect(() => { setLocalVal(value ?? '') }, [value])

    const handleChange = (e) => {
        const v = e.target.value; setLocalVal(v)
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => onCommit(studentId, fieldKey, v), 300)
    }

    const handleBlur = () => {
        setTimeout(() => {
            setFocused(false)
        }, 150)
        if (debounceRef.current) { clearTimeout(debounceRef.current); debounceRef.current = null }
        onCommit(studentId, fieldKey, localVal)
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
        onCommit(studentId, fieldKey, localVal)
    }
    return <textarea {...textareaProps} value={localVal} onChange={handleChange} onBlur={handleBlur} />
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
    bulkMode, lang, trendData, prevScores, templateOpen, catatanArab, sendingWAStatus,
    onScoreChange, onExtraChange, onCatatanChange, onSave, onWA, onPDF, onReset,
    onBulkToggle, onKeyDown, onTemplateToggle, onTemplateApply, onTranslitToggle,
    generateAutoComment, cellRefs,
    criteria = [], maxScore, reportType, classLevel
}) => {
    const rtObj = RAPORT_TYPES[reportType] || RAPORT_TYPES.bulanan
    const activeFisikFields = FISIK_FIELDS.filter(f => {
        if (f.key === 'berat_badan' || f.key === 'tinggi_badan') {
            return rtObj.hasFisik
        }
        return rtObj.hasAttendance
    })
    const avg = calcAvg(sc, criteria)
    const g = avg ? getGradePredicate(Number(avg), reportType, classLevel) : null
    return (
        <tr className={`border-t border-[var(--color-border)] transition-colors group table-row-lazy ${isChecked ? 'bg-indigo-500/5' : si % 2 === 0 ? 'bg-[var(--color-surface)]' : 'bg-[var(--color-surface-alt)]'}`}>
            {bulkMode && (
                <td className="text-center px-1" style={{ verticalAlign: 'middle' }}>
                    <input type="checkbox" checked={isChecked} onChange={e => onBulkToggle(student.id, e.target.checked)} aria-label={`Pilih ${student.name}`} className="w-3.5 h-3.5 accent-violet-500 cursor-pointer" />
                </td>
            )}
            <td className={`px-0 py-3 sticky left-0 z-10 transition-colors ${isChecked ? 'bg-indigo-500/5' : si % 2 === 0 ? 'bg-[var(--color-surface)]' : 'bg-[var(--color-surface-alt)]'}`} style={{ borderRight: '1px solid var(--color-border)' }}>
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
                return (
                    <td key={k.key} className="py-2 text-center" style={{ verticalAlign: 'middle' }}>
                        <div className="flex flex-col items-center justify-center">
                            <ScoreCell value={sc[k.key]} studentId={student.id} kriteria={k} onScoreChange={onScoreChange} onKeyDown={onKeyDown} si={si} ki={ki} cellRefs={cellRefs} maxScore={maxScore} reportType={reportType} classLevel={classLevel} />
                            <div style={{ height: 10, fontSize: 8, fontWeight: 900, lineHeight: 1, marginTop: 2 }} className="flex items-center justify-center">
                                {hasDelta && delta > 0 && <span style={{ color: '#10b981' }} title={`Bulan lalu: ${prevVal}`}>▲{delta}</span>}
                                {hasDelta && delta < 0 && <span style={{ color: '#ef4444' }} title={`Bulan lalu: ${prevVal}`}>▼{Math.abs(delta)}</span>}
                                {hasDelta && delta === 0 && <span style={{ color: 'var(--color-text-muted)', opacity: 0.4 }}>—</span>}
                            </div>
                        </div>
                    </td>
                )
            })}
            {(rtObj.hasFisik || rtObj.hasAttendance) && (
                <td className="px-2 py-3" style={{ verticalAlign: 'middle' }}>
                    <div className="grid grid-cols-2 gap-x-1.5 gap-y-2">
                        {activeFisikFields.map(f => {
                            const IconComp = f.icon
                            return (
                                <div key={f.key} className="flex flex-col gap-0.5">
                                    <span style={{ fontSize: 7.5, fontWeight: 900, color: f.color, letterSpacing: '0.4px', textTransform: 'uppercase', lineHeight: 1, paddingLeft: 2 }}>
                                        {f.label}
                                    </span>
                                    <div title={`${f.fullLabel} (${f.unit})`} className="flex items-center gap-0 rounded-md border border-[var(--color-border)] overflow-hidden" style={{ background: 'var(--color-surface)', height: 28 }}>
                                        <div className="w-6 h-full flex items-center justify-center shrink-0" style={{ background: f.color + '18' }}>
                                            <IconComp className="w-2.5 h-2.5" style={{ color: f.color }} />
                                        </div>
                                        <ExtraInput type="number" inputMode="decimal" placeholder="—" value={ex[f.key] ?? ''} studentId={student.id} fieldKey={f.key} onCommit={onExtraChange} aria-label={f.fullLabel} className="flex-1 w-0 h-full text-[11px] font-bold text-center px-0.5 bg-transparent text-[var(--color-text)] outline-none appearance-none" />
                                        <span className="text-[8px] text-[var(--color-text-muted)] font-bold pr-1 shrink-0">{f.unit}</span>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </td>
            )}
            {(rtObj.hasHafalan || rtObj.hasCatatan) && (
                <td className="px-2 py-3" style={{ verticalAlign: 'middle' }}>
                    <div className="flex flex-col gap-1.5">
                        {rtObj.hasHafalan && HAFALAN_FIELDS.map(f => {
                            const IconComp = f.icon
                            return (
                                <div key={f.key} className="flex items-center gap-1 rounded-md border border-[var(--color-border)]" style={{ background: 'var(--color-surface)', height: 32 }}>
                                    <div className="w-6 h-full flex items-center justify-center shrink-0 rounded-l-[5px]" style={{ background: f.color + '18' }}>
                                        <IconComp className="w-2.5 h-2.5" style={{ color: f.color }} />
                                    </div>
                                    <ExtraInput placeholder={f.ph} value={ex[f.key] ?? ''} studentId={student.id} fieldKey={f.key} onCommit={onExtraChange} aria-label={f.ph} className="flex-1 w-0 h-full px-1 text-[11px] font-bold bg-transparent text-[var(--color-text)] outline-none" />
                                </div>
                            )
                        })}
                        {rtObj.hasCatatan && (
                            <>
                                <div className="flex rounded-md border border-[var(--color-border)] overflow-hidden" style={{ background: 'var(--color-surface)', height: 32 }}>
                                    <div className="w-6 shrink-0 flex items-center justify-center" style={{ background: '#f59e0b18' }}>
                                        <ClipboardList className="w-2.5 h-2.5 text-[#f59e0b]" />
                                    </div>
                                    <ExtraInput placeholder="Catatan" value={ex.catatan ?? ''} studentId={student.id} fieldKey="catatan" onCommit={onCatatanChange} aria-label="Catatan musyrif" className="flex-1 w-0 h-full px-1.5 text-[11px] font-bold bg-transparent text-[var(--color-text)] outline-none" />
                                    <button onClick={() => { const c = generateAutoComment(sc, student.id, trendData, criteria, reportType, classLevel); if (!c) return; onCatatanChange(student.id, 'catatan', c) }} title="Generate komentar otomatis dari nilai" disabled={!avg} className="shrink-0 w-6 flex items-center justify-center text-amber-500 hover:text-amber-600 hover:bg-amber-500/10 transition-all disabled:opacity-30">
                                        <Zap className="w-2.5 h-2.5" />
                                    </button>
                                </div>
                                <div className="relative">
                                    <button onClick={() => onTemplateToggle(student.id)} className={`w-full h-6 rounded-md border text-[8px] font-black flex items-center justify-center gap-1 transition-all ${templateOpen ? 'bg-amber-500/15 border-amber-500/30 text-amber-600' : 'bg-[var(--color-surface-alt)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}>
                                        <Lightbulb className="w-2.5 h-2.5" /> Template Catatan
                                    </button>
                                    {templateOpen && (
                                        <div className="absolute left-0 right-0 z-30 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-xl overflow-hidden" style={{ ...(si < 2 ? { top: 'calc(100% + 4px)' } : { bottom: 'calc(100% + 4px)' }), minWidth: 200 }}>
                                            <p className="text-[7px] font-black uppercase tracking-widest text-[var(--color-text-muted)] px-2.5 pt-2 pb-1">Pilih template catatan</p>
                                            {CATATAN_TEMPLATES.map((tmpl, ti) => (<button key={ti} onMouseDown={() => onTemplateApply(student.id, tmpl)} className="w-full text-left px-2.5 py-1.5 text-[10px] text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] transition-all leading-snug border-t border-[var(--color-border)]/40 first:border-t-0">{tmpl}</button>))}
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </td>
            )}
            <td className={`px-2 py-3 sticky right-0 z-10 transition-colors ${si % 2 === 0 ? 'bg-[var(--color-surface)]' : 'bg-[var(--color-surface-alt)]'}`} style={{ verticalAlign: 'middle', borderLeft: '1px solid var(--color-border)', borderRight: '1px solid var(--color-border)' }}>
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
                        className="w-full h-7 rounded-lg flex items-center justify-center gap-1 text-[10px] font-black transition-all hover:bg-red-500/10 hover:text-red-500"
                        style={{ background: 'transparent', color: 'var(--color-text-muted)', border: '1px dashed var(--color-border)' }}>
                        <X className="w-2.5 h-2.5" /> Reset
                    </button>
                </div>
            </td>
        </tr>
    )
}, studentRowAreEqual)

export default StudentRow
