import { useState } from 'react'
import { Edit2, Trash2, Check, Loader2 } from 'lucide-react'
import Modal from '@shared/components/Modal'
import { useLanguage } from '@context'
import {
  PAGE_T, getVisitorTypes,
  PRESETS_GURU, PRESETS_KARYAWAN, PRESETS_SANTRI, PRESETS_TAMU
} from '@features/gate/utils/gateConstants'
import { fmtTime, timeStrToISO } from '@features/gate/hooks/useGateCore'
import PresetPills from '@features/gate/ui/PresetPills'
import TimeInput from '@features/gate/ui/TimeInput'

export default function EditLogModal({ log, onSave, onDelete, onCancel, saving }) {
  const { language } = useLanguage()
  const tp = (key) => PAGE_T[language]?.[key] || PAGE_T["id"]?.[key] || key
  const visitorTypes = getVisitorTypes(language)
  const typeMeta = Object.fromEntries(visitorTypes.map(t => [t.key, t]))

  const isInternal = log.visitor_type !== 'tamu'
  const [purpose, setPurpose] = useState(log.purpose || '')
  const [destination, setDestination] = useState(log.destination || '')
  const [vehicle, setVehicle] = useState(log.vehicle_plate || '')
  const [timeIn, setTimeIn] = useState(fmtTime(log.check_in).replace('.', ':'))
  const [timeOut, setTimeOut] = useState(log.check_out ? fmtTime(log.check_out).replace('.', ':') : '')
  const [timeEst, setTimeEst] = useState(log.estimated_return ? fmtTime(log.estimated_return).replace('.', ':') : '')
  const [confirmDel, setConfirmDel] = useState(false)

  const handleSave = () => {
    const today = new Date(log.check_in)
    onSave({
      purpose: purpose.trim() || log.purpose,
      destination: destination.trim() || null,
      vehicle_plate: vehicle.trim() || null,
      check_in: timeStrToISO(today, timeIn),
      check_out: timeOut ? timeStrToISO(today, timeOut) : null,
      estimated_return: timeEst ? timeStrToISO(today, timeEst) : null,
    })
  }

  const meta = typeMeta[log.visitor_type] || typeMeta.tamu
  const activePresets = log.visitor_type === 'karyawan' ? PRESETS_KARYAWAN : log.visitor_type === 'tamu' ? PRESETS_TAMU : log.visitor_type === 'santri' ? PRESETS_SANTRI : PRESETS_GURU

  const destLabel = tp('formInstitution') === 'Instansi' ? 'Menemui / Tujuan' : language === 'en' ? 'Person to Visit / Destination' : 'الشخص المراد زيارته / الوجهة'

  return (
    <Modal
      isOpen={true}
      onClose={onCancel}
      title={tp('modalEditTitle')}
      description={log.visitor_name}
      icon={Edit2}
      iconBg={meta.bg}
      iconColor={meta.color}
      size="md"
      mobileVariant="bottom-sheet"
      footer={
        (() => {
          const saveWords = tp('modalEditSave').toUpperCase().split(' ')
          const saveLabel = (
            <>
              {saveWords[0]}
              {saveWords.slice(1).join(' ') && (
                <span className="hidden min-[380px]:inline"> {saveWords.slice(1).join(' ')}</span>
              )}
            </>
          )

          const delWords = tp('modalEditDeleteConfirm').toUpperCase().split(' ')
          const delLabel = (
            <>
              {delWords[0]}
              {delWords.slice(1).join(' ') && (
                <span className="hidden min-[380px]:inline"> {delWords.slice(1).join(' ')}</span>
              )}
            </>
          )

          return (
            <div className="flex items-center w-full gap-2 sm:gap-3">
              {onDelete && (
                confirmDel ? (
                  <>
                    <button onClick={() => setConfirmDel(false)} className="h-10 px-3.5 sm:px-5 rounded-xl border border-[var(--color-border)] text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] transition-all shrink-0">{tp('modalEditCancel').toUpperCase()}</button>
                    <div className="flex-1" />
                    <button onClick={onDelete} disabled={saving} className="h-10 px-4 sm:px-6 rounded-xl text-white text-[10px] font-black uppercase tracking-wider bg-red-600 hover:bg-red-700 shadow-lg shadow-red-500/20 transition-all flex items-center justify-center gap-1.5 sm:gap-2 shrink-0">
                      {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      {delLabel}
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => setConfirmDel(true)} disabled={saving} className="w-10 h-10 rounded-xl border border-red-500/30 text-[var(--color-text-muted)] hover:text-red-500 hover:bg-red-500/10 transition-all flex items-center justify-center shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="flex-1" />
                    <button onClick={onCancel} disabled={saving} className="h-10 px-3.5 sm:px-5 rounded-xl border border-[var(--color-border)] text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] transition-all shrink-0">{tp('modalEditCancel').toUpperCase()}</button>
                    <button onClick={handleSave} disabled={saving} className="h-10 px-4 sm:px-6 rounded-xl text-white text-[10px] font-black uppercase tracking-wider bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 shadow-lg shadow-[var(--color-primary)]/20 transition-all flex items-center justify-center gap-1.5 sm:gap-2 shrink-0">
                      {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      {saveLabel}
                    </button>
                  </>
                )
              )}
              {!onDelete && (
                <>
                  <div className="flex-1" />
                  <button onClick={onCancel} disabled={saving} className="h-10 px-3.5 sm:px-5 rounded-xl border border-[var(--color-border)] text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] transition-all shrink-0">{tp('modalEditCancel').toUpperCase()}</button>
                  <button onClick={handleSave} disabled={saving} className="h-10 px-4 sm:px-6 rounded-xl text-white text-[10px] font-black uppercase tracking-wider bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 shadow-lg shadow-[var(--color-primary)]/20 transition-all flex items-center justify-center gap-1.5 sm:gap-2 shrink-0">
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    {saveLabel}
                  </button>
                </>
              )}
            </div>
          )
        })()
      }
    >
      <div className="space-y-3 pt-2">
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60 mb-1.5 block">{tp('formPurposeTamu')}</label>
          <input value={purpose} onChange={e => setPurpose(e.target.value)}
            className="w-full h-9 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[12px] font-bold text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] transition-all" />
          <PresetPills presets={activePresets} value={purpose} onSelect={setPurpose} />
        </div>
        {!isInternal && (
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60 mb-1.5 block">{destLabel}</label>
            <input value={destination} onChange={e => setDestination(e.target.value)} placeholder="Opsional..."
              className="w-full h-9 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[12px] font-bold text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] transition-all" />
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <TimeInput value={timeIn} onChange={setTimeIn} label={isInternal ? tp('formTimeOut') : tp('formTimeIn')} clearable={false} />
          <TimeInput value={timeOut} onChange={setTimeOut} label={isInternal ? (language === 'en' ? 'Return Time' : language === 'ar' ? 'وقت العودة' : 'Jam Kembali') : tp('formTimeOut')} clearable={true} />
        </div>
        <TimeInput value={timeEst} onChange={setTimeEst} label={isInternal ? tp('formEta') : tp('formEtaTamu')} clearable={true} />
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60 mb-1.5 block">{tp('tableVehicle')}</label>
          <input value={vehicle} onChange={e => setVehicle(e.target.value)} placeholder="Opsional..."
            className="w-full h-9 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[12px] font-bold text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] transition-all" />
        </div>
      </div>
    </Modal>
  )
}
