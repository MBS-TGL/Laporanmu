import { useState } from 'react'
import { Clock, Check } from 'lucide-react'
import Modal from '@shared/components/Modal'
import { useLanguage } from '@context'
import { PAGE_T } from '@features/gate/utils/gateConstants'
import TimeInput from '@features/gate/ui/TimeInput'

export default function ConfirmTimeModal({ log, onConfirm, onCancel }) {
  const { language } = useLanguage()
  const tp = (key) => PAGE_T[language]?.[key] || PAGE_T["id"]?.[key] || key
  const isInternal = log.visitor_type !== 'tamu'
  const [time, setTime] = useState(() => {
    const d = new Date()
    const h = String(d.getHours()).padStart(2, '0')
    const m = String(d.getMinutes()).padStart(2, '0')
    return `${h}:${m}`
  })
  const label = isInternal ? (language === 'en' ? 'Return' : language === 'ar' ? 'العودة' : 'Kembali') : (language === 'en' ? 'Exit' : language === 'ar' ? 'الخروج' : 'Keluar')
  const colorCls = isInternal
    ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20'
    : 'bg-red-500 hover:bg-red-600 shadow-red-500/20'

  return (
    <Modal
      isOpen={true}
      onClose={onCancel}
      title={`${tp('modalConfirmTitle')} ${label}`}
      description={log.purpose}
      icon={Clock}
      iconBg={isInternal ? 'bg-emerald-500/10' : 'bg-red-500/10'}
      iconColor={isInternal ? 'text-emerald-500' : 'text-red-500'}
      size="sm"
      mobileVariant="bottom-sheet"
      footer={
        <div className="flex items-center w-full gap-3">
          <button onClick={onCancel} className="h-10 px-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[10px] font-black uppercase tracking-wider hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] transition-all shrink-0">{tp('modalConfirmCancel').toUpperCase()}</button>
          <div className="flex-1" />
          <button onClick={() => onConfirm(time)} className={`h-10 px-6 rounded-xl text-white text-[10px] font-black uppercase tracking-wider transition-all shadow-lg flex items-center justify-center gap-2 shrink-0 ${colorCls}`}>
            <Check className="w-3.5 h-3.5" />
            <span>{`${tp('modalConfirmSave')} ${label}`.toUpperCase()}</span>
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="p-3 bg-[var(--color-surface-alt)]/30 border border-[var(--color-border)] rounded-xl">
          <p className="text-[12px] font-black text-[var(--color-primary)] mb-1">{log.visitor_name}</p>
          <p className="text-[10px] text-[var(--color-text-muted)] font-medium leading-snug">{log.purpose}</p>
        </div>
        <TimeInput value={time} onChange={setTime} label={`${tp('modalConfirmTimeLabel')} ${label}`} clearable={false} />
      </div>
    </Modal>
  )
}
