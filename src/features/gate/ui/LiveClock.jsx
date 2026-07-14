import { useState, useEffect } from 'react'
import { Clock } from 'lucide-react'
import { useLanguage } from '@context/Language'
import { fmtDate } from '@features/gate/hooks/useGateCore'

export default function LiveClock() {
  const { language } = useLanguage()
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const locales = { id: 'id-ID', en: 'en-US', ar: 'ar-EG' }

  return (
    <div className="flex flex-col items-end">
      <div className="flex items-center gap-2 text-[var(--color-text)]">
        <Clock className="w-3.5 h-3.5 text-[var(--color-primary)] animate-pulse" />
        <span className="text-[15px] font-black tabular-nums tracking-tight">
          {time.toLocaleTimeString(locales[language] || 'id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
        </span>
      </div>
      <div className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)] opacity-50 mt-0.5">
        {fmtDate(time, language)}
      </div>
    </div>
  )
}
