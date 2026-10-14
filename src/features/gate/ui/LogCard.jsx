import { memo, useMemo } from 'react'
import {
  LogIn, LogOut, Clock, Bell, Edit2
} from 'lucide-react'
import { useLanguage } from '@context'
import { PAGE_T, getVisitorTypes, translatePurpose } from '@features/gate/utils/gateConstants'
import { durasi, fmtTime } from '@features/gate/hooks/useGateCore'

const LogCard = memo(function LogCard({ log, onReturn, onCheckout, onEdit, isSelected, onToggleSelect, selectionMode }) {
  const { language } = useLanguage()
  const tp = (key) => PAGE_T[language]?.[key] || PAGE_T["id"]?.[key] || key

  // Memoize so getVisitorTypes + fromEntries doesn't run on every render
  const typeMeta = useMemo(() => {
    const visitorTypes = getVisitorTypes(language)
    return Object.fromEntries(visitorTypes.map(t => [t.key, t]))
  }, [language])

  const meta = typeMeta[log.visitor_type] || typeMeta.tamu
  const isInternal = log.visitor_type !== 'tamu'
  const isActive = !log.check_out
  const dur = durasi(log.check_in, log.check_out, language)
  const overTime = isInternal && isActive && (Date.now() - new Date(log.check_in).getTime()) > 2 * 60 * 60 * 1000

  // ETA Alert: Jika lewat dari jam estimasi
  const etaPassed = isActive && log.estimated_return && new Date(log.estimated_return) < new Date()

  const statusLabel = isActive
    ? (isInternal
      ? (language === 'en' ? '● Out' : language === 'ar' ? '● خارج' : '● Sedang Keluar')
      : (language === 'en' ? '● Inside' : language === 'ar' ? '● بالداخل' : '● Di Dalam'))
    : ''

  const btnLabel = isInternal
    ? (language === 'en' ? 'Return' : language === 'ar' ? 'عودة' : 'Kembali')
    : (language === 'en' ? 'Exit' : language === 'ar' ? 'خروج' : 'Keluar')

  const etaLabel = isInternal
    ? (language === 'en' ? 'ETA' : language === 'ar' ? 'العودة المتوقعة' : 'Est. Kembali')
    : (language === 'en' ? 'Est. Out' : language === 'ar' ? 'الخروج المتوقع' : 'Est. Keluar')
  const overdueLabel = isInternal
    ? (language === 'en' ? 'Overdue' : language === 'ar' ? 'متأخر عن العودة' : 'Lewat ETA')
    : (language === 'en' ? 'Est. Out' : language === 'ar' ? 'الخروج المتوقع' : 'Est. Keluar')
  const longOutLabel = language === 'en' ? 'Long Exit' : language === 'ar' ? 'خروج طويل' : 'Lama keluar'

  const IconComp = meta.icon

  // Card border/bg — computed once, no nested ternary animating
  let cardClass = 'border-[var(--color-border)] bg-[var(--color-surface)]'
  if (etaPassed) cardClass = 'border-red-500/60 bg-red-500/[0.06]'
  else if (overTime) cardClass = 'border-amber-500/40 bg-amber-500/[0.04]'
  else if (isActive && isInternal) cardClass = 'border-red-500/20 bg-red-500/[0.03]'
  else if (isActive && !isInternal) cardClass = 'border-emerald-500/20 bg-emerald-500/[0.03]'

  return (
    <div className={`flex items-start gap-3 p-3 rounded-xl border transition-colors group relative gpu-card ${isSelected ? 'ring-2 ring-[var(--color-primary)] border-[var(--color-primary)]' : ''} ${cardClass}`}>

      {/* Multi-select check */}
      {selectionMode && (
        <div className="shrink-0 flex items-center h-9 pr-1">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect(log.id)}
            className="w-5 h-5 rounded-lg border-2 border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]/30 cursor-pointer transition-colors bg-[var(--color-surface)] checked:bg-[var(--color-primary)]"
          />
        </div>
      )}

      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${meta.bg}`}>
        <IconComp className={`w-4 h-4 ${meta.color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="text-sm font-bold text-[var(--color-text)] truncate">{log.visitor_name}</p>
          <span className={`text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-md ${meta.bg} ${meta.color}`}>{meta.label}</span>
          {isActive && <span className={`text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-md ${isInternal ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500'}`}>{statusLabel}</span>}
          {overTime && !etaPassed && <span className="text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-600 flex items-center gap-1"><Bell className="w-3 h-3" />{longOutLabel}</span>}
          {etaPassed && <span className="text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-md bg-red-600 text-white flex items-center gap-1"><Clock className="w-3 h-3" />{overdueLabel}</span>}
        </div>
        <p className="text-xs text-[var(--color-text-muted)] mt-1 leading-normal font-medium">
          {translatePurpose(log.purpose, language)}
        </p>

        {/* Check-in / ETA info */}
        <div className="mt-2 flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-text-muted)]">
            {isInternal ? <LogOut className="w-3.5 h-3.5" /> : <LogIn className="w-3.5 h-3.5" />}
            {fmtTime(log.check_in, language)}
          </div>
          {log.estimated_return && isActive && (
            <div className={`flex items-center gap-1.5 text-xs font-semibold ${etaPassed ? 'text-red-600' : 'text-[var(--color-text-muted)]'}`}>
              <Clock className="w-3.5 h-3.5" />
              {etaLabel} {fmtTime(log.estimated_return, language)}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {dur && <span className="text-[11px] text-[var(--color-text-muted)] font-semibold bg-[var(--color-surface-alt)] border border-[var(--color-border)] px-2 py-0.5 rounded-md">{dur}</span>}
          {log.vehicle_plate && <span className="text-[11px] text-[var(--color-text-muted)] font-semibold bg-[var(--color-surface-alt)] border border-[var(--color-border)] px-2 py-0.5 rounded-md">{log.vehicle_plate}</span>}
        </div>
        {log.destination && <p className="text-[11px] text-[var(--color-text-muted)] mt-1">→ {log.destination}</p>}
        {log.visitor_nip && <p className="text-[11px] text-[var(--color-text-muted)] opacity-70 mt-0.5">{log.visitor_nip}</p>}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button onClick={() => onEdit(log)}
          className="h-8.5 w-8.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)]/30 flex items-center justify-center transition-colors sm:opacity-0 sm:group-hover:opacity-100"
          title="Edit Data">
          <Edit2 className="w-3.5 h-3.5" />
        </button>
        {isActive && (
          <button onClick={() => isInternal ? onReturn(log) : onCheckout(log)}
            className={`h-8.5 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors active:scale-95 ${isInternal
              ? 'bg-emerald-500 text-white hover:bg-emerald-600'
              : 'bg-red-500 text-white hover:bg-red-600'}`}>
            {isInternal ? <LogIn className="w-3.5 h-3.5" /> : <LogOut className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{btnLabel}</span>
          </button>
        )}
      </div>
    </div>
  )
})

export default LogCard
