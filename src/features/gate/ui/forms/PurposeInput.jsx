import { useState, useEffect, useRef } from 'react'
import { Tag } from 'lucide-react'
import { useLanguage } from '@context'
import { presetTranslations } from '@features/gate/utils/gateConstants'

export default function PurposeInput({ value, onChange, presets, placeholder, label, required }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const { language } = useLanguage()

  const translatePreset = (p) => {
    return presetTranslations[language]?.[p] || p
  }

  useEffect(() => {
    const handler = e => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative w-full">
      {label && (
        <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60 mb-1.5 block">
          {label} {required && <span className="text-red-400">*</span>}
        </label>
      )}
      <div className="relative">
        <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--color-text-muted)] pointer-events-none rtl:left-auto rtl:right-3" />
        <input
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          placeholder={placeholder}
          className="w-full h-10 pl-8 pr-3 rtl:pl-3 rtl:pr-8 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[12px] font-bold text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]/40 focus:outline-none focus:border-[var(--color-primary)] transition-all"
        />
      </div>

      {open && presets && presets.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-2xl p-2 flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
          {presets.map(p => {
            const translated = translatePreset(p)
            const isSelected = value === p || value === translated
            return (
              <button
                key={p}
                type="button"
                onClick={() => {
                  onChange(translated)
                  setOpen(false)
                }}
                className={`h-7 px-2.5 rounded-lg text-[10px] font-black transition-all border shrink-0 ${isSelected
                  ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)]/30 text-[var(--color-primary)]'
                  : 'border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-border)]'
                }`}
              >
                {translated}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
