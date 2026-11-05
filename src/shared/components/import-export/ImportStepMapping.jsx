import { ArrowRight } from 'lucide-react'
import RichSelect from '@shared/components/RichSelect'
import { useLanguage } from '@context'

/**
 * Langkah 2 wizard import: grid pencocokan kolom file ke kolom sistem.
 * Setiap systemCols dirender sebagai baris [label sistem] → [RichSelect header file].
 *
 * Props:
 * - systemCols           : [{ key, label }] — definisi kolom sistem (dari hook/page)
 * - requiredKeys         : [string] — kolom wajib, ditandai * ; mapping belum lengkap
 *                          men-disable tombol "Review Data" di footer
 * - importFileHeaders    : [string] — header hasil parse file
 * - importColumnMapping / setImportColumnMapping : state mapping { sys_key: header }
 */
export default function ImportStepMapping({
    systemCols, requiredKeys,
    importFileHeaders,
    importColumnMapping, setImportColumnMapping
}) {
    const { t } = useLanguage()

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)]">{t('shared.import.mapTitle')}</span>
                <span className="text-xs font-bold py-1 px-2 rounded-lg bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text-muted)]">
                    {t('shared.import.colsFound').replace('{n}', importFileHeaders.length)}
                </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[45vh] overflow-y-auto pr-1 custom-scrollbar">
                {systemCols.map(sys => {
                    const mapped = importColumnMapping[sys.key]
                    const isRequired = requiredKeys.includes(sys.key)
                    return (
                        <div key={sys.key} className={`p-2.5 rounded-xl border transition-all ${mapped ? 'bg-success/4 border-success/20' : 'bg-[var(--color-surface-alt)]/50 border-[var(--color-border)]'}`}>
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex flex-col w-[130px] shrink-0">
                                    <span className="text-xs font-bold text-[var(--color-text)] flex items-center gap-1">
                                        {sys.label}
                                        {isRequired && <span className="text-danger text-xs">*</span>}
                                    </span>
                                    <span className="text-xs font-bold text-[var(--color-text-muted)] opacity-50 uppercase tracking-tight">{t('shared.import.mapSystem')}</span>
                                </div>

                                <div className="flex items-center gap-1.5 opacity-30">
                                    <ArrowRight className={`w-4 h-4 ${mapped ? 'text-success opacity-100' : ''}`} />
                                </div>

                                <div className="flex-1 min-w-0 relative">
                                    <RichSelect
                                        small
                                        value={mapped || ''}
                                        onChange={(val) => setImportColumnMapping(v => ({ ...v, [sys.key]: val }))}
                                        options={importFileHeaders.map(h => ({ id: h, name: h }))}
                                        placeholder={t('shared.import.mapSkip')}
                                        extraOption={{ id: '', name: t('shared.import.mapSkip') }}
                                        status={mapped ? 'success' : 'normal'}
                                        searchable={importFileHeaders.length > 5}
                                    />
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
