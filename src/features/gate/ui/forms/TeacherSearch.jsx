import { useMemo } from 'react'
import { useLanguage } from '@context'
import RichSelect from '@shared/components/RichSelect'

export default function TeacherSearch({ teacherList, value, onChange, label, icon }) {
  const { language } = useLanguage()
  const options = useMemo(() => {
    return teacherList.map(t => ({
      id: t.id,
      name: t.nbm ? `${t.name} (${t.nbm})` : t.name
    }))
  }, [teacherList])

  const placeholderText = language === 'ar'
    ? `-- اختر ${label} --`
    : language === 'en'
      ? `-- Select ${label} --`
      : `-- Pilih ${label} --`

  return (
    <div>
      <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5 block">{label}</label>
      <RichSelect
        value={value}
        onChange={onChange}
        options={options}
        placeholder={placeholderText}
        searchable={true}
        icon={icon}
        className="w-full"
        buttonClassName="h-10.5 rounded-xl text-sm"
      />
    </div>
  )
}
