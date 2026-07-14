import { useLanguage } from '@context'
import { presetTranslations } from '@features/gate/utils/gateConstants'

export default function PresetPills({ presets, value, onSelect }) {
  const { language } = useLanguage()
  const translatePreset = (p) => {
    return presetTranslations[language]?.[p] || p
  }
  return (
    <div className="flex flex-row overflow-x-auto gap-1.5 mt-2 scrollbar-none pb-1">
      {presets.map(p => {
        const translated = translatePreset(p)
        const isSelected = value === p || value === translated
        return (
          <button key={p} type="button" onClick={() => onSelect(translated)}
            className={`h-7 px-2.5 rounded-lg text-[10px] font-black transition-all border shrink-0 ${isSelected
              ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)]/30 text-[var(--color-primary)]'
              : 'border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-border)]'}`}>
            {translated}
          </button>
        )
      })}
    </div>
  )
}
