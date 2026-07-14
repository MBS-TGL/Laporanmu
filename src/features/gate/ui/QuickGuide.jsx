import { Plus, LogOut, LogIn, Car, Search, Tag, Clock, Keyboard } from 'lucide-react'
import { useLanguage } from '@context'
import { PAGE_T } from '@features/gate/utils/gateConstants'

export default function QuickGuide({ mode = 'internal' }) {
  const { language } = useLanguage()
  const tp = (key) => PAGE_T[language]?.[key] || PAGE_T["id"]?.[key] || key
  const isTamu = mode === 'tamu'
  const items = isTamu
    ? [
      { icon: Plus, text: tp('guideTamu1'), color: 'bg-emerald-400' },
      { icon: LogOut, text: tp('guideTamu2'), color: 'bg-red-400' },
      { icon: Car, text: tp('guideTamu3'), color: 'bg-amber-400' }
    ]
    : [
      { icon: Search, text: tp('guideInt1'), color: 'bg-[var(--color-primary)]' },
      { icon: Tag, text: tp('guideInt2'), color: 'bg-indigo-400' },
      { icon: Clock, text: tp('guideInt3'), color: 'bg-emerald-400' },
      { icon: RotateCcwHelper, text: tp('guideInt4'), color: 'bg-amber-400' }
    ]

  // Helper helper internally
  function RotateCcwHelper(props) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
        <path d="M3 3v5h5" />
      </svg>
    )
  }

  return (
    <div className="animate-in slide-in-from-bottom-4 duration-500">
      <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60 mb-4 flex items-center gap-2">
        <Keyboard className="w-3.5 h-3.5" /> {tp('guideTitle')}
      </p>
      <div className="space-y-3">
        {items.map((t, i) => {
          const IconComp = t.icon
          return (
            <div key={i} className="flex items-start gap-3 group">
              <div className={`w-6 h-6 rounded-lg ${t.color}/10 ${t.color.replace('bg-', 'text-')} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
                <IconComp className="w-3 h-3" />
              </div>
              <p className="text-[11px] text-[var(--color-text-muted)] font-medium leading-relaxed group-hover:text-[var(--color-text)] transition-colors">
                {t.text}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
