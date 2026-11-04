import { memo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  formatTanggalPanjang, formatTanggalPendek, dayOfWeek,
} from '../utils/suspensionConstants'

const DOW_SHORT = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']

// Navigasi 1 hari per halaman: prev/next + strip tanggal (HP-first).
function DayNavigator({ days, date, onChange, filledSet }) {
  const idx = days.indexOf(date)
  const prev = idx > 0 ? days[idx - 1] : null
  const next = idx >= 0 && idx < days.length - 1 ? days[idx + 1] : null

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => prev && onChange(prev)}
          disabled={!prev}
          aria-label="Hari sebelumnya"
          className="w-11 h-11 shrink-0 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-center disabled:opacity-30 min-w-[44px] min-h-[44px]"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 text-center px-1">
          <p className="text-base font-bold text-[var(--color-text)] leading-tight">
            {formatTanggalPanjang(date)}
          </p>
          <p className="text-xs text-[var(--color-text-muted)] font-medium">
            Hari {idx + 1} dari {days.length}
          </p>
        </div>
        <button
          type="button"
          onClick={() => next && onChange(next)}
          disabled={!next}
          aria-label="Hari berikutnya"
          className="w-11 h-11 shrink-0 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-center disabled:opacity-30 min-w-[44px] min-h-[44px]"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1" role="tablist" aria-label="Pilih tanggal">
        {days.map((d) => {
          const active = d === date
          const filled = filledSet?.has(d)
          return (
            <button
              key={d}
              type="button"
              role="tab"
              aria-selected={active}
              aria-label={`${formatTanggalPendek(d)}${filled ? ', sudah terisi' : ''}`}
              onClick={() => onChange(d)}
              className={`shrink-0 w-[52px] py-2 rounded-xl border text-center min-h-[52px] ${
                active
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white'
                  : filled
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-[var(--color-text)]'
                    : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]'
              }`}
            >
              <span className={`block text-xs font-bold uppercase ${active ? 'text-white/80' : 'text-[var(--color-text-muted)]'}`}>
                {DOW_SHORT[dayOfWeek(d)]}
              </span>
              <span className="block text-sm font-bold tabular-nums">{d.slice(8, 10)}</span>
              {filled && !active && <span className="block w-1.5 h-1.5 rounded-full bg-emerald-500 mx-auto mt-0.5" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default memo(DayNavigator)
