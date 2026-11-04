import { useLanguage } from '@context'
import { PAGE_T } from '@features/gate/utils/gateConstants'
import DatePicker from '@shared/components/DatePicker'
import TimePicker from '@shared/components/TimePicker'

export default function DateTime({ dateValue, timeValue, onDateChange, onTimeChange, label }) {
  const { language } = useLanguage()
  const tp = (key) => PAGE_T[language]?.[key] || PAGE_T["id"]?.[key] || key
  return (
    <div>
      <label className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)]/70 mb-1.5 block">
        {label} <span className="normal-case opacity-60">({tp('formEtaDesc')})</span>
      </label>
      <div className="grid grid-cols-[1.2fr_0.8fr] gap-2">
        <DatePicker
          value={dateValue}
          onChange={onDateChange}
          clearable={false}
        />
        <TimePicker
          value={timeValue}
          onChange={onTimeChange}
        />
      </div>
    </div>
  )
}
