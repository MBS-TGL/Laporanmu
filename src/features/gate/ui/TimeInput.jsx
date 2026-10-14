import { useLanguage } from '@context'
import { PAGE_T } from '@features/gate/utils/gateConstants'
import RichTimePicker from '@shared/components/RichTimePicker'

export default function TimeInput({ value, onChange, label, clearable = true }) {
  const { language } = useLanguage()
  const tp = (key) => PAGE_T[language]?.[key] || PAGE_T["id"]?.[key] || key
  return (
    <div>
      <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5 block">
        {label} <span className="normal-case opacity-70">({tp('formEtaDesc')})</span>
      </label>
      <RichTimePicker
        value={value}
        onChange={onChange}
        clearable={clearable}
        placeholder="--:--"
      />
    </div>
  )
}
