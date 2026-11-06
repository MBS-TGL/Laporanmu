import { Copy, School, Zap } from 'lucide-react'
import { SYSTEM_COLS as RAW_SYSTEM_COLS } from '@features/behavior/hooks/useImportExport'
import CopyMonthPanel from './CopyMonthPanel'

/**
 * Konfigurasi modal Import untuk fitur Behavior (laporan perilaku).
 * Logika parse/validasi/commit tetap di useImportExport (hook) — file ini
 * hanya deklarasi UI. Fitur khusus: tab "Salin Bulan Lain" (extraUploadTabs)
 * dan dua slot perbaikan massal (siswa & jenis perilaku).
 *
 * Config dibangun per-render: label i18n (behavior.*) dan daftar dinamis
 * (siswa, jenis perilaku) + aksi dari hook.
 */

export const buildImportConfig = ({
    t, tNum, language,
    students = [], violationTypes = [],
    handleBulkFix, copyingData, copyDataFromMonth, onClose
}) => {
    const tp = (key) => t(`behavior.${key}`)

    return {
        title: tp('importTitle'),
        description: tp('importDesc'),
        size: 'lg',
        // Hook behavior memakai labelKey (i18n) — petakan ke label untuk UI shared
        systemCols: RAW_SYSTEM_COLS.map(s => ({ ...s, label: tp(s.labelKey) })),
        requiredKeys: ['student_name', 'rule_name'],
        columns: [
            {
                key: 'student_id', label: tp('colStudent'), w: 'w-[26%]', required: true,
                editor: {
                    type: 'entity',
                    list: students,
                    labelKey: 'name',
                    displayKey: '_studentName',
                    searchKeys: ['name', 'class_name'],
                    minWidth: 240,
                    renderOption: (s) => (
                        <div className="flex flex-col truncate pr-2">
                            <span className="truncate">{s.name}</span>
                            {s.class_name && <span className="text-xs text-[var(--color-text-muted)] font-normal">{s.class_name}</span>}
                        </div>
                    ),
                },
            },
            {
                key: 'violation_type_id', label: tp('colRule'), w: 'w-[28%]', required: true,
                editor: {
                    type: 'entity',
                    list: violationTypes,
                    labelKey: 'name',
                    displayKey: '_violationName',
                    minWidth: 200,
                    renderOption: (v) => (
                        <div className="flex items-center justify-between w-full">
                            <span className="truncate pr-2">{v.name}</span>
                            <span className={`text-xs font-bold px-1 py-0.5 rounded ${v.points > 0 ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                                {v.points > 0 ? `+${tNum(v.points)}` : tNum(v.points)}
                            </span>
                        </div>
                    ),
                },
            },
            { key: 'points', label: tp('colPoints'), w: 'w-[12%]', center: true },
            { key: 'notes', label: tp('colNotes'), w: 'w-[22%]' },
        ],
        template: {
            cols: [
                { l: 'A', k: 'NAME', n: tp('colStudent'), w: 'w-[30%]' },
                { l: 'B', k: 'BEHAVIOR', n: tp('colRule'), w: 'w-[30%]' },
                { l: 'C', k: 'POINTS', n: tp('colPoints'), w: 'w-[12%]' },
                { l: 'D', k: 'NOTES', n: tp('colNotes'), w: 'w-[28%]' },
            ],
            rows: [
                [tp('tplStudent1'), tp('tplRule1'), '-5', tp('tplNotes1')],
                [tp('tplStudent2'), tp('tplRule2'), '10', tp('tplNotes2_short')],
            ],
        },
        reference: { icon: School, title: tp('importRefData'), desc: tp('importRefDesc') },
        features: { previewCap: 300 },
        extraUploadTabs: [
            {
                id: 'copy',
                label: tp('importTabCopy'),
                icon: Copy,
                render: () => (
                    <CopyMonthPanel
                        tp={tp}
                        language={language}
                        copyingData={copyingData}
                        copyDataFromMonth={copyDataFromMonth}
                        onClose={onClose}
                    />
                ),
            },
        ],
        // Dua slot perbaikan massal: petakan siswa & petakan jenis perilaku
        renderBulkFix: ({ importIssues }) => (
            <>
                {importIssues.some(iss => iss.types?.includes('student')) && (
                    <div className="p-3 rounded-2xl bg-amber-500/5 border border-amber-500/15 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in zoom-in-95 duration-500">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                                <Zap className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wide text-amber-700">{tp('importBulkStudentTitle')}</p>
                                <p className="text-xs font-bold text-amber-600/80">{tp('importBulkStudentDesc')}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <select
                                onChange={(e) => {
                                    if (e.target.value) {
                                        handleBulkFix('student_id', e.target.value)
                                        e.target.value = ''
                                    }
                                }}
                                className="h-9 px-3 rounded-xl bg-[var(--color-surface)] border border-amber-500/30 text-xs font-bold uppercase tracking-wide outline-none focus:ring-4 focus:ring-amber-500/10 transition-all cursor-pointer"
                            >
                                <option value="">{tp('importBulkStudentSelect')}</option>
                                {students.sort((a, b) => a.name.localeCompare(b.name)).map(s => (
                                    <option key={s.id} value={s.id}>{s.name} ({s.class_name || tp('importNoClass')})</option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}

                {importIssues.some(iss => iss.types?.includes('rule')) && (
                    <div className="p-3 rounded-2xl bg-violet-500/5 border border-violet-500/15 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in zoom-in-95 duration-500">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-violet-500/10 text-violet-600 flex items-center justify-center shrink-0">
                                <Zap className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wide text-violet-700">{tp('importBulkBehaviorTitle')}</p>
                                <p className="text-xs font-bold text-violet-600/80">{tp('importBulkBehaviorDesc')}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <select
                                onChange={(e) => {
                                    if (e.target.value) {
                                        handleBulkFix('violation_type_id', e.target.value)
                                        e.target.value = ''
                                    }
                                }}
                                className="h-9 px-3 rounded-xl bg-[var(--color-surface)] border border-violet-500/30 text-xs font-bold uppercase tracking-wide outline-none focus:ring-4 focus:ring-violet-500/10 transition-all cursor-pointer"
                            >
                                <option value="">{tp('importBulkBehaviorSelect')}</option>
                                {violationTypes.sort((a, b) => a.name.localeCompare(b.name)).map(v => (
                                    <option key={v.id} value={v.id}>{v.name} ({v.points > 0 ? `+${tNum(v.points)}` : tNum(v.points)})</option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}
            </>
        ),
    }
}
