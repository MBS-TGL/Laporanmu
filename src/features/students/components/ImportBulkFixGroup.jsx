import { Zap } from 'lucide-react'

/**
 * Slot perbaikan massal khusus fitur Students: pemetaan grup rombel Dapodik
 * (nama rombel + gender) ke kelas asli. Dirender lewat config.renderBulkFix.
 *
 * Rombel Dapodik campur putra/putri & program, sedangkan kelas asli dipisah
 * (mis. "A Boarding Putra"), jadi keputusan pemetaan per grup.
 */
export default function ImportBulkFixGroup({ importPreview, classesList, onFix }) {
    const validClassIds = new Set(classesList.map(c => c.id))
    const groups = {}
    importPreview.forEach(r => {
        if (!r._className || validClassIds.has(r.class_id)) return
        const key = `${r._className}||${r.gender || ''}`
        groups[key] = (groups[key] || 0) + 1
    })
    const entries = Object.entries(groups)
    if (!entries.length) return null

    const sortedClasses = [...classesList].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))

    return (
        <div className="p-3 rounded-2xl bg-amber-500/5 border border-amber-500/15 flex flex-col gap-3 animate-in zoom-in-95 duration-500">
            <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                    <Zap className="w-4 h-4" />
                </div>
                <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-amber-700">Petakan Rombel ke Kelas</p>
                    <p className="text-xs font-bold text-amber-600/80">Rombel dari file tidak cocok dengan nama kelas. Pilih kelas asli untuk tiap grup (rombel + gender).</p>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {entries.map(([key, count]) => {
                    const [rombel, gender] = key.split('||')
                    const genderLabel = gender === 'L' ? 'Laki-laki' : gender === 'P' ? 'Perempuan' : 'Tanpa Gender'
                    // Kelas sesuai gender ditampilkan lebih dulu biar cepat dipilih
                    const classes = gender === 'L' || gender === 'P'
                        ? [...sortedClasses].sort((a, b) => {
                              const am = a.name.toLowerCase().includes(gender === 'L' ? 'putra' : 'putri') ? 0 : 1
                              const bm = b.name.toLowerCase().includes(gender === 'L' ? 'putra' : 'putri') ? 0 : 1
                              return am - bm
                          })
                        : sortedClasses
                    return (
                        <div key={key} className="flex items-center justify-between gap-2 p-2 rounded-xl bg-[var(--color-surface)] border border-amber-500/20">
                            <div className="min-w-0">
                                <p className="text-xs font-bold text-[var(--color-text)] truncate">{rombel} · {genderLabel}</p>
                                <p className="text-[10px] font-bold text-[var(--color-text-muted)]">{count} baris</p>
                            </div>
                            <select
                                onChange={(e) => {
                                    if (e.target.value) {
                                        onFix(rombel, gender, e.target.value)
                                        e.target.value = ''
                                    }
                                }}
                                className="h-8 px-2 rounded-lg bg-[var(--color-surface)] border border-amber-500/30 text-xs font-bold uppercase tracking-wide outline-none focus:ring-4 focus:ring-amber-500/10 transition-all cursor-pointer max-w-[55%]"
                            >
                                <option value="">-- Pilih Kelas --</option>
                                {classes.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
