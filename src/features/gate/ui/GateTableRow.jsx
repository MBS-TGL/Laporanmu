import { memo, useMemo } from 'react'
import { Edit2, LogIn, LogOut, Users } from 'lucide-react'
import { getVisitorTypes, translatePurpose } from '@features/gate/utils/gateConstants'
import { durasi, fmtTime } from '@features/gate/hooks/useGateCore'

const GateTableRow = memo(function GateTableRow({
  log,
  isSelected,
  selectionMode,
  toggleSelect,
  setEditLog,
  handleReturn,
  handleCheckout,
  language,
  dir
}) {
  const visitorTypes = useMemo(() => getVisitorTypes(language), [language])
  const typeMeta = useMemo(() => {
    return Object.fromEntries(visitorTypes.map(t => [t.key, t]))
  }, [visitorTypes])

  const meta = typeMeta[log.visitor_type] || { label: log.visitor_type, bg: 'bg-slate-100', color: 'text-slate-600', icon: Users }
  const isActive = !log.check_out
  const isInternal = log.visitor_type !== 'tamu'
  const dur = durasi(log.check_in, log.check_out, language)
  const etaPassed = isActive && log.estimated_return && new Date(log.estimated_return) < new Date()
  const overTime = isInternal && isActive && (Date.now() - new Date(log.check_in).getTime()) > 2 * 60 * 60 * 1000
  const IconComp = meta.icon

  let rowBg = ''
  if (isSelected) rowBg = 'bg-[var(--color-primary)]/5'
  else if (etaPassed) rowBg = 'bg-red-500/5'
  else if (overTime) rowBg = 'bg-amber-500/5'

  return (
    <tr className={`group transition-colors hover:bg-[var(--color-surface-alt)]/60 ${rowBg}`}>
      {selectionMode && (
        <td className="px-3 py-1.5">
          <input type="checkbox" checked={isSelected}
            onChange={() => toggleSelect(log.id)}
            className="w-4 h-4 rounded border-2 border-[var(--color-border)] text-[var(--color-primary)] cursor-pointer" />
        </td>
      )}
      <td className="px-4 py-1.5">
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${meta.bg}`}>
            <IconComp className={`w-3 h-3 ${meta.color}`} />
          </div>
          <div className={dir === 'rtl' ? 'text-right' : ''}>
            <p className="text-[12px] font-black text-[var(--color-text)] leading-tight">{log.visitor_name}</p>
            <span className={`text-[8.5px] font-bold px-1 rounded ${meta.bg} ${meta.color} leading-none inline-block mt-0.5`}>{meta.label}</span>
          </div>
        </div>
      </td>
      <td className="px-4 py-1.5">
        <p className="text-[11px] font-semibold text-[var(--color-text-muted)] leading-tight">{translatePurpose(log.purpose, language)}</p>
        {log.destination && <p className="text-[9px] text-[var(--color-text-muted)] opacity-60 leading-none mt-0.5">→ {log.destination}</p>}
      </td>
      <td className="px-4 py-1.5">
        <p className="text-[11px] font-black text-[var(--color-text)] leading-none">{fmtTime(log.check_in, language)}</p>
        {log.estimated_return && isActive && (
          <p className={`text-[9px] font-bold mt-0.5 leading-none ${etaPassed ? 'text-red-600' : 'text-[var(--color-text-muted)] opacity-70'}`}>
            ETA {fmtTime(log.estimated_return, language)}
          </p>
        )}
      </td>
      <td className="px-4 py-1.5">
        {dur
          ? <span className="text-[9px] font-black text-[var(--color-text-muted)] bg-[var(--color-surface-alt)] px-1.5 py-0.5 rounded leading-none">{dur}</span>
          : <span className="text-[10px] text-[var(--color-text-muted)] opacity-40">—</span>}
      </td>
      <td className="px-4 py-1.5 text-start">
        <div className="flex items-center justify-start gap-1.5">
          {isActive ? (
            <span className="text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 leading-none">
              {language === 'en' ? 'ACTIVE' : language === 'ar' ? 'نشط' : 'AKTIF'}
            </span>
          ) : (
            <span className="text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider bg-slate-100 text-slate-500 border border-slate-200 leading-none">
              {language === 'en' ? 'DONE' : language === 'ar' ? 'مكتمل' : 'SELESAI'}
            </span>
          )}
          {etaPassed && <span className="text-[8px] font-black px-1 py-0.5 rounded bg-red-600 text-white leading-none">{language === 'en' ? 'PAST DUE' : language === 'ar' ? 'متأخر' : 'LEWAT ETA'}</span>}
          {overTime && !etaPassed && <span className="text-[8px] font-black px-1 py-0.5 rounded bg-amber-500/15 text-amber-600 leading-none">{language === 'en' ? 'OVER TIME' : language === 'ar' ? 'تجاوز' : 'LAMA'}</span>}
        </div>
      </td>
      <td className="px-4 py-1.5 text-center">
        <div className="inline-flex items-center justify-center gap-1">
          <button onClick={() => setEditLog(log)}
            className="h-6 w-6 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)]/30 flex items-center justify-center transition-all">
            <Edit2 className="w-2.5 h-2.5" />
          </button>
          {isActive && (
            <button onClick={() => isInternal ? handleReturn(log) : handleCheckout(log)}
              className={`h-6 w-6 rounded-lg flex items-center justify-center transition-all active:scale-95 ${isInternal ? 'bg-emerald-500 text-white hover:bg-emerald-600' : 'bg-red-500 text-white hover:bg-red-600'}`}
              title={isInternal ? (language === 'en' ? 'Return' : 'Kembali') : (language === 'en' ? 'Exit' : 'Keluar')}>
              {isInternal ? <LogIn className="w-2.5 h-2.5" /> : <LogOut className="w-2.5 h-2.5" />}
            </button>
          )}
        </div>
      </td>
    </tr>
  )
})

export default GateTableRow
