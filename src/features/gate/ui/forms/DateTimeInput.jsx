import { useLanguage } from '@context'
import { PAGE_T } from '@features/gate/utils/gateConstants'
import RichDatePicker from '@shared/components/RichDatePicker'
import RichTimePicker from '@shared/components/RichTimePicker'

export default function DateTimeInput({ dateValue, timeValue, onDateChange, onTimeChange, label }) {
  const { language } = useLanguage()
  const tp = (key) => PAGE_T[language]?.[key] || PAGE_T["id"]?.[key] || key
  return (
    <div>
      <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60 mb-1.5 block">
        {label} <span className="normal-case opacity-70">({tp('formEtaDesc')})</span>
      </label>
      <div className="grid grid-cols-[1.2fr_0.8fr] gap-2">
        <RichDatePicker
          value={dateValue}
          onChange={onDateChange}
          clearable={false}
        />
        <RichTimePicker
          value={timeValue}
          onChange={onTimeChange}
        />
      </div>
    </div>
  )
}
