import React from 'react'
import {
    RotateCcw,
    Type, Columns, Lightbulb, AlignJustify, Hash, Award, BookOpen, Globe, Eye
} from 'lucide-react'

// ── Default layout config ───────────────────────────────────────────────────
export const DEFAULT_LAYOUT_CONFIG = {
    // Font sizes (pt)
    arMainFontSize: 15.5,    // Arabic subject names di tabel nilai utama
    arSecFontSize: 13.5,     // Arabic labels di tabel fisik/hafalan/absensi
    arScaleFontSize: 13.5,   // Arabic labels di nظام التقدير
    arValueFontSize: 13.5,   // Arabic nilai/angka di tabel sekunder

    // Column widths (%)
    scoreColWidth: 10,        // Kolom Nilai/النقاط
    gradeColWidth: 15,        // Kolom Predikat/التقدير
    numColWidth: 6,           // Kolom No/الرقم
    subjectArWidth: 34.5,     // Kolom Arabic subject name
    subjectIdWidth: 34.5,     // Kolom Indonesian subject name

    // Visibility toggles
    showCapaianHafalan: true, // Tampilkan baris Hafalan di tabel Perkembangan Hafalan
}

export const LS_LAYOUT_KEY = 'raport_layout_config'

export function loadLayoutConfig() {
    try {
        const raw = localStorage.getItem(LS_LAYOUT_KEY)
        if (!raw) return { ...DEFAULT_LAYOUT_CONFIG }
        return { ...DEFAULT_LAYOUT_CONFIG, ...JSON.parse(raw) }
    } catch {
        return { ...DEFAULT_LAYOUT_CONFIG }
    }
}

export function saveLayoutConfig(cfg) {
    try { localStorage.setItem(LS_LAYOUT_KEY, JSON.stringify(cfg)) } catch { }
}

// ── Individual Slider Control ────────────────────────────────────────────────
function SliderControl({ label, sublabel, icon: Icon, value, min, max, step = 0.5, unit = 'pt', onChange, accentColor = '#6366f1' }) {
    const pct = ((value - min) / (max - min)) * 100
    return (
        <div className="flex flex-col gap-2 p-3 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)]">
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                    {Icon && (
                        <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0" style={{ background: `${accentColor}18` }}>
                            <Icon className="w-3 h-3" style={{ color: accentColor }} />
                        </div>
                    )}
                    <div className="min-w-0">
                        <p className="text-[11px] font-bold text-[var(--color-text)] leading-tight truncate">{label}</p>
                        {sublabel && <p className="text-[9px] text-[var(--color-text-muted)] leading-tight truncate mt-0.5">{sublabel}</p>}
                    </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                    <button
                        onClick={() => onChange(Math.max(min, Number((value - step).toFixed(1))))}
                        className="w-6 h-6 rounded-md bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-indigo-500 hover:border-indigo-500/40 transition-all flex items-center justify-center text-[12px] font-black leading-none"
                    >−</button>
                    <span className="text-[11px] font-black tabular-nums w-14 text-center rounded-lg px-1 py-1 border border-[var(--color-border)] bg-[var(--color-surface)]" style={{ color: accentColor }}>
                        {value}{unit}
                    </span>
                    <button
                        onClick={() => onChange(Math.min(max, Number((value + step).toFixed(1))))}
                        className="w-6 h-6 rounded-md bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-indigo-500 hover:border-indigo-500/40 transition-all flex items-center justify-center text-[12px] font-black leading-none"
                    >+</button>
                </div>
            </div>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={e => onChange(Number(e.target.value))}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                style={{
                    accentColor,
                    background: `linear-gradient(to right, ${accentColor} 0%, ${accentColor} ${pct}%, var(--color-border) ${pct}%, var(--color-border) 100%)`
                }}
            />
        </div>
    )
}

// ── Toggle Switch Control ───────────────────────────────────────────────────
function ToggleControl({ label, sublabel, icon: Icon, checked, onChange, accentColor = '#10b981' }) {
    return (
        <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)]">
            <div className="flex items-center gap-2 min-w-0">
                {Icon && (
                    <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0" style={{ background: `${accentColor}18` }}>
                        <Icon className="w-3 h-3" style={{ color: accentColor }} />
                    </div>
                )}
                <div className="min-w-0">
                    <p className="text-[11px] font-bold text-[var(--color-text)] leading-tight truncate">{label}</p>
                    {sublabel && <p className="text-[9px] text-[var(--color-text-muted)] leading-tight truncate mt-0.5">{sublabel}</p>}
                </div>
            </div>
            <button
                type="button"
                role="switch"
                aria-checked={checked}
                onClick={() => onChange(!checked)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${checked ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
            >
                <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${checked ? 'translate-x-5' : 'translate-x-0'
                        }`}
                />
            </button>
        </div>
    )
}

// ── Section Header ────────────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, label, color = '#6366f1' }) {
    return (
        <div className="flex items-center gap-2 pt-2">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}18` }}>
                <Icon className="w-3 h-3" style={{ color }} />
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest" style={{ color }}>{label}</p>
            <div className="flex-1 h-px" style={{ background: `${color}25` }} />
        </div>
    )
}

// ── Main Panel Component ─────────────────────────────────────────────────────
export default function RaportLayoutSettings({ config, onChange }) {
    const set = (key, val) => {
        const next = { ...config, [key]: val }
        onChange(next)
        saveLayoutConfig(next)
    }

    const reset = () => {
        onChange({ ...DEFAULT_LAYOUT_CONFIG })
        saveLayoutConfig({ ...DEFAULT_LAYOUT_CONFIG })
    }

    const isModified = JSON.stringify(config) !== JSON.stringify(DEFAULT_LAYOUT_CONFIG)

    return (
        <div className="space-y-3">
            {/* Reset hint */}
            {isModified && (
                <div className="flex items-center justify-between px-1">
                    <span className="text-[9px] font-black px-2 py-1 rounded-full bg-violet-500/10 text-violet-500">DIUBAH</span>
                    <button
                        onClick={reset}
                        className="h-7 px-3 rounded-lg text-[9px] font-black text-amber-600 bg-amber-500/10 hover:bg-amber-500/20 transition-all flex items-center gap-1.5"
                    >
                        <RotateCcw className="w-3 h-3" /> Reset ke Default
                    </button>
                </div>
            )}

            {/* ── Visibility Toggles ── */}
            <SectionHeader icon={Eye} label="Tampilan Baris Tabel" color="#10b981" />
            <div className="space-y-2">
                <ToggleControl
                    label="Baris Hafalan"
                    sublabel="Tampilkan baris Hafalan di tabel Perkembangan Hafalan"
                    icon={Award}
                    checked={config.showCapaianHafalan !== false}
                    accentColor="#10b981"
                    onChange={v => set('showCapaianHafalan', v)}
                />
            </div>

            {/* ── Font Sizes ── */}
            <SectionHeader icon={Type} label="Ukuran Font Arab (pt)" color="#8b5cf6" />
            <div className="space-y-2">
                <SliderControl
                    label="Nama Mapel"
                    sublabel="Tabel nilai utama (baris كتب، فقه، ...)"
                    icon={BookOpen}
                    value={config.arMainFontSize}
                    min={10} max={22}
                    accentColor="#8b5cf6"
                    onChange={v => set('arMainFontSize', v)}
                />
                <SliderControl
                    label="Fisik / Hafalan / Absensi"
                    sublabel="Label baris di tabel bawah"
                    icon={AlignJustify}
                    value={config.arSecFontSize}
                    min={9} max={20}
                    accentColor="#8b5cf6"
                    onChange={v => set('arSecFontSize', v)}
                />
                <SliderControl
                    label="Skala Nilai (نظام التقدير)"
                    sublabel="Label predikat di tabel skala"
                    icon={Award}
                    value={config.arScaleFontSize}
                    min={9} max={20}
                    accentColor="#8b5cf6"
                    onChange={v => set('arScaleFontSize', v)}
                />
                <SliderControl
                    label="Angka di Tabel Sekunder"
                    sublabel="Nilai berat, tinggi, kehadiran, dll."
                    icon={Hash}
                    value={config.arValueFontSize}
                    min={9} max={20}
                    accentColor="#8b5cf6"
                    onChange={v => set('arValueFontSize', v)}
                />
            </div>

            {/* ── Column Widths ── */}
            <SectionHeader icon={Columns} label="Lebar Kolom Tabel (%)" color="#0ea5e9" />
            <div className="space-y-2">
                <SliderControl
                    label="No. / الرقم"
                    sublabel="Kolom nomor urut"
                    icon={Hash}
                    value={config.numColWidth}
                    min={4} max={12} step={0.5} unit="%"
                    accentColor="#0ea5e9"
                    onChange={v => set('numColWidth', v)}
                />
                <SliderControl
                    label="Nilai / النقاط"
                    sublabel="Kolom angka nilai"
                    icon={Award}
                    value={config.scoreColWidth}
                    min={6} max={18} step={0.5} unit="%"
                    accentColor="#0ea5e9"
                    onChange={v => set('scoreColWidth', v)}
                />
                <SliderControl
                    label="Predikat / التقدير"
                    sublabel="Kolom predikat (Baik, Mumtaz, ...)"
                    icon={Award}
                    value={config.gradeColWidth}
                    min={8} max={22} step={0.5} unit="%"
                    accentColor="#0ea5e9"
                    onChange={v => set('gradeColWidth', v)}
                />
                <SliderControl
                    label="Nama Mapel Arab"
                    sublabel="Kolom teks arab nama mata pelajaran"
                    icon={BookOpen}
                    value={config.subjectArWidth}
                    min={20} max={55} step={0.5} unit="%"
                    accentColor="#0ea5e9"
                    onChange={v => set('subjectArWidth', v)}
                />
                <SliderControl
                    label="Nama Mapel Indonesia"
                    sublabel="Kolom teks latin nama mata pelajaran"
                    icon={Globe}
                    value={config.subjectIdWidth}
                    min={20} max={55} step={0.5} unit="%"
                    accentColor="#0ea5e9"
                    onChange={v => set('subjectIdWidth', v)}
                />
            </div>

            {/* Hint */}
            <div className="flex items-start gap-2 px-2.5 py-2 rounded-xl bg-indigo-500/5 border border-indigo-500/15">
                <Lightbulb className="w-3 h-3 text-indigo-400 shrink-0 mt-0.5" />
                <p className="text-[8px] text-indigo-400 leading-relaxed">
                    Perubahan langsung terlihat di preview. Pengaturan disimpan otomatis di browser ini.
                </p>
            </div>
        </div>
    )
}
