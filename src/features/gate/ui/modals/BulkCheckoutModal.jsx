import { useState } from 'react'
import { Check } from 'lucide-react'
import Modal from '@shared/components/Modal'
import { useLanguage } from '@context'
import { getVisitorTypes } from '@features/gate/utils/gateConstants'

export default function BulkCheckoutModal({ logs = [], onConfirm, onCancel }) {
  const { language } = useLanguage()
  const [reason, setReason] = useState('')
  const count = logs.length

  const visitorTypes = getVisitorTypes(language)
  const typeMeta = Object.fromEntries(visitorTypes.map(t => [t.key, t]))

  const presets = language === 'en'
    ? ['End of session', 'Dismissal time', 'Administrative process']
    : language === 'ar'
      ? ['نهاية الجلسة', 'وقت الانصراف', 'إجراء إداري']
      : ['Akhir sesi', 'Waktu pulang', 'Proses administrasi']

  return (
    <Modal
      isOpen={true}
      onClose={onCancel}
      title={language === 'en' ? 'Bulk Check-out' : language === 'ar' ? 'تسجيل خروج جماعي' : 'Check-out Massal'}
      description={language === 'en'
        ? `Process check-out for ${count} selected entries`
        : language === 'ar'
          ? `معالجة تسجيل خروج ${count} إدخالات محددة`
          : `Proses check-out untuk ${count} entri yang dipilih`}
      icon={Check}
      iconBg="bg-indigo-500/10"
      iconColor="text-indigo-500"
      size="sm"
      mobileVariant="bottom-sheet"
      footer={
        <div className="flex items-center w-full gap-3">
          <button onClick={onCancel} className="h-10 px-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[10px] font-black uppercase tracking-wider hover:bg-[var(--color-surface-alt)] transition-all shrink-0">
            {language === 'en' ? 'CANCEL' : language === 'ar' ? 'إلغاء' : 'BATAL'}
          </button>
          <div className="flex-1" />
          <button
            onClick={() => onConfirm(reason.trim())}
            className="h-10 px-6 rounded-xl bg-indigo-500 text-white text-[10px] font-black uppercase tracking-wider shadow-lg shadow-indigo-500/20 hover:bg-indigo-600 transition-all flex items-center justify-center gap-2 shrink-0"
          >
            <Check className="w-3.5 h-3.5" />
            <span>{language === 'en' ? 'CONFIRM CHECK-OUT' : language === 'ar' ? 'تأكيد الخروج' : 'PROSES CHECK-OUT'}</span>
          </button>
        </div>
      }
    >
      <div className="space-y-3 pt-1">
        {/* Name list */}
        <div className="border border-indigo-500/20 rounded-xl overflow-hidden">
          <div className="px-3 py-1.5 bg-indigo-500/5 border-b border-indigo-500/15">
            <p className="text-[9px] font-black uppercase tracking-widest text-indigo-500/70">
              {language === 'en' ? `${count} entries to check-out` : language === 'ar' ? `${count} إدخالات للخروج` : `${count} entri akan di-check-out`}
            </p>
          </div>
          <div className="divide-y divide-[var(--color-border)] max-h-36 overflow-y-auto">
            {logs.map(log => {
              const meta = typeMeta[log.visitor_type] || typeMeta.tamu
              return (
                <div key={log.id} className="flex items-center gap-2.5 px-3 py-1.5">
                  <span className={`text-[8px] font-black px-1.5 py-0.5 rounded shrink-0 ${meta.bg} ${meta.color}`}>{meta.label}</span>
                  <span className="text-[12px] font-bold text-[var(--color-text)] truncate">{log.visitor_name}</span>
                  <span className="text-[9px] text-[var(--color-text-muted)] shrink-0 ml-auto">{log.purpose}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Reason field */}
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60 mb-1.5 block">
            {language === 'en' ? 'Reason / Note (optional)' : language === 'ar' ? 'السبب / ملاحظة (اختياري)' : 'Alasan / Catatan (opsional)'}
          </label>
          <input
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder={language === 'en' ? 'e.g. Dismissal time...' : language === 'ar' ? 'مثال: وقت الانصراف...' : 'cth. Waktu pulang...'}
            className="w-full h-9 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[12px] font-bold text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] transition-all"
          />
          <div className="flex flex-wrap gap-1.5 mt-2">
            {presets.map(p => (
              <button key={p} type="button" onClick={() => setReason(p)}
                className={`h-7 px-2.5 rounded-lg text-[10px] font-black transition-all border shrink-0 ${reason === p
                  ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)]/30 text-[var(--color-primary)]'
                  : 'border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}>
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  )
}
