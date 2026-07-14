import { useState, useMemo } from 'react'
import { LogOut, Loader2, Keyboard } from 'lucide-react'
import { useLanguage } from '@context'
import {
  PAGE_T, getVisitorTypes,
  PRESETS_GURU, PRESETS_KARYAWAN, PRESETS_SANTRI
} from '@features/gate/utils/gateConstants'
import { nowDateStr, nowTimeStr, dateTimeToISO } from '@features/gate/hooks/useGateCore'
import TeacherSearch from './TeacherSearch'
import PurposeInput from './PurposeInput'
import RichDatePicker from '@shared/components/RichDatePicker'
import RichTimePicker from '@shared/components/RichTimePicker'

export default function FormInternal({ internalList, onSubmit, loading }) {
  const { language } = useLanguage()
  const tp = (key) => PAGE_T[language]?.[key] || PAGE_T["id"]?.[key] || key
  const visitorTypes = getVisitorTypes(language)
  const typeMeta = Object.fromEntries(visitorTypes.map(t => [t.key, t]))

  const [visitorType, setVisitorType] = useState('guru')
  const [personId, setPersonId] = useState('')
  const [purpose, setPurpose] = useState('')
  const [dateOut, setDateOut] = useState(() => nowDateStr())
  const [timeOut, setTimeOut] = useState(() => nowTimeStr())
  const [timeEst, setTimeEst] = useState('')

  const filteredList = useMemo(
    () => internalList.filter(t => {
      if (visitorType === 'santri') return t.type === 'santri'
      return t.type === visitorType || (!t.type && visitorType !== 'santri')
    }),
    [internalList, visitorType]
  )

  const activePresets = visitorType === 'karyawan' ? PRESETS_KARYAWAN : visitorType === 'santri' ? PRESETS_SANTRI : PRESETS_GURU

  const canSubmit = personId && purpose.trim()

  const submit = () => {
    if (!canSubmit) return
    const person = internalList.find(t => t.id === personId)
    onSubmit({
      flow: 'internal',
      visitorType,
      personId,
      name: person?.name || '',
      nbm: person?.nbm || '',
      purpose: purpose.trim(),
      dateOut,
      timeOut,
      estimatedReturn: timeEst ? dateTimeToISO(dateOut, timeEst) : null,
    })
    setPersonId('')
    setPurpose('')
    setDateOut(nowDateStr())
    setTimeOut(nowTimeStr())
    setTimeEst('')
  }

  const handleKeyDown = e => { if (e.key === 'Enter' && canSubmit && !loading) submit() }

  const tanggalLabel = language === 'ar' ? 'التاريخ' : language === 'en' ? 'Date' : 'Tanggal'
  const jamKeluarLabel = language === 'ar' ? 'وقت الخروج' : language === 'en' ? 'Time Out' : 'Jam Keluar'
  const opsionalText = language === 'ar' ? '(اختياري)' : language === 'en' ? '(optional)' : '(opsional)'

  return (
    <div className="space-y-3" onKeyDown={handleKeyDown}>
      {/* Sub-tab Guru / Karyawan / Santri — scrollable on mobile */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide -mx-0.5 px-0.5 pb-0.5">
        {visitorTypes.filter(t => t.key !== 'tamu').map(t => {
          const IconComp = t.icon
          return (
            <button key={t.key} onClick={() => { setVisitorType(t.key); setPersonId('') }}
              className={`shrink-0 flex-1 min-w-0 h-8 rounded-xl text-[10px] font-black flex items-center justify-center gap-1.5 border transition-all ${visitorType === t.key
                ? `${t.bg} ${t.color} ${t.border}`
                : 'border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}>
              <IconComp className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{t.label}</span>
            </button>
          )
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
        <TeacherSearch
          teacherList={filteredList}
          value={personId}
          onChange={setPersonId}
          label={typeMeta[visitorType].label}
          icon={typeMeta[visitorType].icon}
        />

        <PurposeInput
          value={purpose}
          onChange={setPurpose}
          presets={activePresets}
          placeholder={tp('formPurposePlaceholder')}
          label={tp('formPurpose')}
        />
      </div>

      {/* Datetime: tanggal + jam keluar + estimasi */}
      <div className="space-y-3 pt-1">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60 mb-1.5 block">
              {tanggalLabel}
            </label>
            <RichDatePicker value={dateOut} onChange={setDateOut} clearable={false} />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60 mb-1.5 block">
              {jamKeluarLabel}
            </label>
            <RichTimePicker value={timeOut} onChange={setTimeOut} />
          </div>
        </div>

        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60 mb-1.5 block">
            {tp('formEta')} <span className="normal-case font-medium opacity-65">({opsionalText})</span>
          </label>
          <RichTimePicker value={timeEst} onChange={setTimeEst} clearable={true} />
        </div>
      </div>

      <button onClick={submit} disabled={loading || !canSubmit}
        className="w-full h-10 rounded-xl text-[12px] font-black flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 active:scale-[0.98] text-white shadow-lg shadow-[var(--color-primary)]/20 px-4">
        {loading
          ? <Loader2 className="w-4 h-4 animate-spin" />
          : <LogOut className="w-4 h-4" />}
        <span className="whitespace-nowrap">{tp('formSubmitOut')}</span>
      </button>

      <div className="flex items-center gap-1.5 justify-end opacity-30 mt-1.5 cursor-default hover:opacity-100 transition-opacity">
        <Keyboard className="w-3.5 h-3.5" />
        <span className="text-[9px] font-bold">{tp('formEnterHint')}</span>
      </div>
    </div>
  )
}
