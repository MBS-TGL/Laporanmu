import { memo } from 'react'
import { Check, Minus, AlertCircle } from 'lucide-react'
import {
  formatTanggalPendek, dayOfWeek, eachDay,
} from '../utils/suspensionConstants'

const DOW = ['Ahd', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']

// Grid progres harian: hijau = terisi, merah = kosong (terlewat / belum diisi).
// Props: suspension {start_date,end_date}, logByDate {date: log}, selected, onSelect.
function ProgressGrid({ suspension, logByDate, selected, onSelect }) {
  if (!suspension) return null
  const days = eachDay(suspension.start_date, suspension.end_date)
  if (!days.length) return null

  return (
    <div>
      <div className="flex items-center gap-4 mb-3 text-xs font-bold text-[var(--color-text-muted)]">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-emerald-500 inline-block" /> Terisi
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-[var(--color-surface-alt)] border border-[var(--color-border)] inline-block" /> Belum diisi
        </span>
        <span className="flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 text-[var(--color-danger)]" /> Hari ini kosong
        </span>
      </div>
      <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
        {days.map((d) => {
          const filled = Boolean(logByDate[d])
          const isToday = d === new Date().toISOString().slice(0, 10)
          const active = selected === d
          return (
            <button
              key={d}
              type="button"
              onClick={() => onSelect?.(d)}
              aria-label={`${formatTanggalPendek(d)} ${filled ? 'terisi' : 'belum diisi'}`}
              className={`rounded-xl border p-2 text-center transition-all min-h-[64px] ${
                active
                  ? 'border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/30'
                  : filled
                    ? 'border-emerald-500/30 bg-emerald-500/5'
                    : 'border-[var(--color-border)] bg-[var(--color-surface)]'
              }`}
            >
              <span className="block text-xs font-bold uppercase text-[var(--color-text-muted)]">
                {DOW[dayOfWeek(d)]}
              </span>
              <span className="block text-sm font-bold text-[var(--color-text)] tabular-nums">
                {d.slice(8, 10)}/{d.slice(5, 7)}
              </span>
              <span className="mt-1 flex justify-center">
                {filled
                  ? <Check className="w-4 h-4 text-emerald-500" />
                  : isToday
                    ? <AlertCircle className="w-4 h-4 text-[var(--color-danger)]" />
                    : <Minus className="w-4 h-4 text-[var(--color-text-muted)] opacity-50" />}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default memo(ProgressGrid)
