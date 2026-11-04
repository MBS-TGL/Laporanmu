import { memo } from 'react'
import { Check } from 'lucide-react'

// Satu blok waktu: render tiap item template sebagai checkbox/pilihan,
// bukan ketikan panjang. value disimpan di entries[item_key].
function LogBlockForm({ block, items, entries, onChange }) {
  if (!items?.length) return null

  return (
    <section aria-label={`${block.label} (${block.time})`} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
      <header className="px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface-alt)]/50">
        <h3 className="text-sm font-black text-[var(--color-text)]">{block.label}</h3>
        <p className="text-[11px] text-[var(--color-text-muted)] font-medium">{block.time} WIB</p>
      </header>
      <div className="divide-y divide-[var(--color-border)]">
        {items.map((item) => (
          <ItemRow
            key={item.item_key}
            item={item}
            value={entries[item.item_key]}
            onChange={(v) => onChange(item.item_key, v)}
          />
        ))}
      </div>
    </section>
  )
}

function ItemRow({ item, value, onChange }) {
  const { input_type: type, label_id: label, options } = item
  const opts = Array.isArray(options) ? options : []

  // ── check: toggle Ya/Belum ──
  if (type === 'check') {
    const on = value === true
    return (
      <button
        type="button"
        role="checkbox"
        aria-checked={on}
        onClick={() => onChange(!on)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left min-h-[52px] active:bg-[var(--color-surface-alt)]"
      >
        <span className={`w-7 h-7 shrink-0 rounded-lg border-2 flex items-center justify-center transition-colors ${
          on ? 'bg-emerald-500 border-emerald-500' : 'border-[var(--color-border)] bg-[var(--color-surface)]'
        }`}>
          {on && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
        </span>
        <span className={`text-sm ${on ? 'font-bold text-[var(--color-text)]' : 'text-[var(--color-text-muted)]'}`}>
          {label}
        </span>
      </button>
    )
  }

  // ── choice: pilgan (mis. olahraga / bantu rumah) ──
  if (type === 'choice') {
    return (
      <div className="px-4 py-3">
        <p className="text-sm text-[var(--color-text)] mb-2">{label}</p>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={label}>
          {opts.map((opt) => {
            const active = value === opt
            return (
              <button
                key={opt}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onChange(active ? null : opt)}
                className={`min-h-[40px] px-3 rounded-xl text-xs font-bold border ${
                  active
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white'
                    : 'border-[var(--color-border)] text-[var(--color-text-muted)]'
                }`}
              >
                {opt}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // ── surah: surah + ayat ──
  if (type === 'surah') {
    const v = (value && typeof value === 'object') ? value : {}
    const set = (k, val) => onChange({ ...v, [k]: val || undefined })
    return (
      <div className="px-4 py-3">
        <p className="text-sm text-[var(--color-text)] mb-2">{label}</p>
        <div className="grid grid-cols-2 gap-2">
          <input
            value={v.surah || ''}
            onChange={(e) => set('surah', e.target.value)}
            placeholder="Surah (cth. Al-Mulk)"
            aria-label="Nama surah"
            className="h-11 px-3 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
          />
          <input
            value={v.ayat || ''}
            onChange={(e) => set('ayat', e.target.value)}
            placeholder="Ayat (cth. 1–10)"
            aria-label="Ayat"
            className="h-11 px-3 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
          />
        </div>
      </div>
    )
  }

  // ── wafa: jilid + halaman ──
  if (type === 'wafa') {
    const v = (value && typeof value === 'object') ? value : {}
    const set = (k, val) => onChange({ ...v, [k]: val || undefined })
    return (
      <div className="px-4 py-3">
        <p className="text-sm text-[var(--color-text)] mb-2">{label}</p>
        <div className="grid grid-cols-2 gap-2">
          <input
            value={v.jilid || ''}
            onChange={(e) => set('jilid', e.target.value)}
            placeholder="Jilid"
            aria-label="Jilid"
            className="h-11 px-3 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
          />
          <input
            value={v.halaman || ''}
            onChange={(e) => set('halaman', e.target.value)}
            placeholder="Halaman"
            aria-label="Halaman"
            className="h-11 px-3 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
          />
        </div>
      </div>
    )
  }

  // ── text & tugas_ref: catatan singkat / penanda ──
  const textVal = typeof value === 'string' ? value : (value?.text || '')
  if (type === 'tugas_ref') {
    return (
      <div className="px-4 py-3">
        <p className="text-sm text-[var(--color-text)]">{label}</p>
        <p className="text-[11px] text-[var(--color-text-muted)] mt-1">
          Kerjakan tugas di bawah (blok Tugas KBM), lalu centang bila selesai.
        </p>
        <button
          type="button"
          role="checkbox"
          aria-checked={value === true}
          onClick={() => onChange(value === true ? null : true)}
          className="mt-2 flex items-center gap-2 min-h-[44px]"
        >
          <span className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center ${
            value === true ? 'bg-emerald-500 border-emerald-500' : 'border-[var(--color-border)]'
          }`}>
            {value === true && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
          </span>
          <span className="text-xs font-bold text-[var(--color-text-muted)]">Tugas KBM hari ini selesai</span>
        </button>
      </div>
    )
  }

  return (
    <div className="px-4 py-3">
      <label className="text-sm text-[var(--color-text)] block mb-2" htmlFor={`log-${item.item_key}`}>
        {label}
      </label>
      <input
        id={`log-${item.item_key}`}
        value={textVal}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Tulis singkat…"
        className="w-full h-11 px-3 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
      />
    </div>
  )
}

export default memo(LogBlockForm)
