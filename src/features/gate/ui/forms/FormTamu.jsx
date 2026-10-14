import { useState } from 'react'
import { LogIn, Loader2, Keyboard, IdCard, Building2, Car, Plus } from 'lucide-react'
import { useLanguage } from '@context'
import { PAGE_T, PRESETS_TAMU } from '@features/gate/utils/gateConstants'
import { nowDateStr, nowTimeStr, dateTimeToISO } from '@features/gate/hooks/useGateCore'
import PurposeInput from './PurposeInput'
import RichDatePicker from '@shared/components/RichDatePicker'
import RichTimePicker from '@shared/components/RichTimePicker'

export default function FormTamu({ onSubmit, loading }) {
  const { language } = useLanguage()
  const tp = (key) => PAGE_T[language]?.[key] || PAGE_T["id"]?.[key] || key
  const [name, setName] = useState('')
  const [institution, setInstitution] = useState('')
  const [purpose, setPurpose] = useState('')
  const [destination, setDestination] = useState('')
  const [vehicle, setVehicle] = useState('')
  const [dateIn, setDateIn] = useState(() => nowDateStr())
  const [timeIn, setTimeIn] = useState(() => nowTimeStr())
  const [timeEst, setTimeEst] = useState('')

  const canSubmit = name.trim() && purpose.trim()

  const submit = () => {
    if (!canSubmit) return
    onSubmit({
      flow: 'tamu',
      visitorType: 'tamu',
      name: name.trim(),
      institution: institution.trim(),
      purpose: purpose.trim(),
      destination: destination.trim(),
      vehicle: vehicle.trim(),
      dateIn,
      timeIn,
      estimatedReturn: timeEst ? dateTimeToISO(dateIn, timeEst) : null
    })
    setName(''); setInstitution(''); setPurpose(''); setDestination(''); setVehicle('')
    setDateIn(nowDateStr()); setTimeIn(nowTimeStr()); setTimeEst('')
  }

  const handleKeyDown = e => { if (e.key === 'Enter' && canSubmit && !loading) submit() }

  const destLabel = tp('formInstitution') === 'Instansi' ? 'Menemui / Tujuan' : language === 'en' ? 'Person to Visit / Destination' : 'الشخص المراد زيارته / الوجهة'

  const tanggalLabel = language === 'ar' ? 'التاريخ' : language === 'en' ? 'Date' : 'Tanggal'
  const jamMasukLabel = language === 'ar' ? 'وقت الدخول' : language === 'en' ? 'Time In' : 'Jam Masuk'
  const opsionalText = language === 'ar' ? '(اختياري)' : language === 'en' ? '(optional)' : '(opsional)'

  return (
    <div className="space-y-3" onKeyDown={handleKeyDown}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5 block">{tp('formName')} <span className="text-red-400">*</span></label>
          <div className="relative">
            <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)] pointer-events-none rtl:left-auto rtl:right-3" />
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Nama lengkap..."
              className="w-full h-10.5 pl-9 pr-3 rtl:pl-3 rtl:pr-9 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-sm font-medium text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]/50 focus:outline-none focus:border-[var(--color-primary)] transition-all" />
          </div>
        </div>
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5 block">{tp('formInstitution')}</label>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)] pointer-events-none rtl:left-auto rtl:right-3" />
            <input value={institution} onChange={e => setInstitution(e.target.value)} placeholder="Asal / Instansi / Desa..."
              className="w-full h-10.5 pl-9 pr-3 rtl:pl-3 rtl:pr-9 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-sm font-medium text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]/50 focus:outline-none focus:border-[var(--color-primary)] transition-all" />
          </div>
        </div>
      </div>

      <PurposeInput
        value={purpose}
        onChange={setPurpose}
        presets={PRESETS_TAMU}
        placeholder="Keperluan kunjungan..."
        label={tp('formPurposeTamu')}
        required
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5 block">{destLabel}</label>
          <input value={destination} onChange={e => setDestination(e.target.value)} placeholder="Ustadz X, TU, Kepala Sekolah..."
            className="w-full h-10.5 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-sm font-medium text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]/50 focus:outline-none focus:border-[var(--color-primary)] transition-all" />
        </div>
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5 block">{tp('tableVehicle')}</label>
          <div className="relative">
            <Car className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)] pointer-events-none rtl:left-auto rtl:right-3" />
            <input value={vehicle} onChange={e => setVehicle(e.target.value)} placeholder="Nopol (opsional)..."
              className="w-full h-10.5 pl-9 pr-3 rtl:pl-3 rtl:pr-9 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-sm font-medium text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]/50 focus:outline-none focus:border-[var(--color-primary)] transition-all" />
          </div>
        </div>
      </div>

      {/* Datetime: tanggal + jam masuk + estimasi */}
      <div className="space-y-3 pt-1">
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5 block">
              {tanggalLabel}
            </label>
            <RichDatePicker value={dateIn} onChange={setDateIn} clearable={false} />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5 block">
              {jamMasukLabel}
            </label>
            <RichTimePicker value={timeIn} onChange={setTimeIn} />
          </div>
        </div>

        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5 block">
            {tp('formEtaTamu')} <span className="normal-case font-normal text-[var(--color-text-muted)]/75">{opsionalText}</span>
          </label>
          <RichTimePicker value={timeEst} onChange={setTimeEst} clearable={true} />
        </div>
      </div>

      <div className="p-3 rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-alt)]/30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)] group cursor-pointer hover:border-emerald-500/30 transition-all">
            <Plus className="w-4 h-4 opacity-50 group-hover:scale-110 transition-transform" />
          </div>
          <div>
            <p className="text-xs font-bold text-[var(--color-text)] leading-tight">{tp('formIdentityPhoto')}</p>
            <p className="text-[11px] text-[var(--color-text-muted)]">{tp('formIdentityPhotoDesc')}</p>
          </div>
        </div>
        <IdCard className="w-4 h-4 text-emerald-500/30" />
      </div>

      <button onClick={submit} disabled={loading || !canSubmit}
        className="w-full h-11 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 active:scale-[0.98] text-white shadow-md shadow-[var(--color-primary)]/20 px-4">
        {loading
          ? <Loader2 className="w-4 h-4 animate-spin" />
          : <LogIn className="w-4 h-4" />}
        <span className="whitespace-nowrap">{tp('formSubmitIn')}</span>
      </button>

      <div className="flex items-center gap-1.5 justify-end opacity-40 mt-1 cursor-default hover:opacity-100 transition-opacity">
        <Keyboard className="w-3.5 h-3.5" />
        <span className="text-xs font-medium">{tp('formEnterHint')}</span>
      </div>
    </div>
  )
}
