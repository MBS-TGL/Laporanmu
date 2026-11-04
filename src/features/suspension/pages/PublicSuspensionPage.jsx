import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import {
  MoonStar, GraduationCap, WifiOff, CheckCircle2, Save,
  Loader2, AlertTriangle, Clock3, Info,
} from 'lucide-react'
import mbsLogo from '@assets/images/logos/logo-mbs.png'
import usePublicSuspension from '../hooks/usePublicSuspension'
import DayNavigator from '../components/DayNavigator'
import LogBlockForm from '../components/LogBlockForm'
import TaskUploadCard from '../components/TaskUploadCard'
import {
  LOG_BLOCKS, formatTanggalPendek, isSeninKamis, isWeekend,
} from '../utils/suspensionConstants'

// Halaman publik wali: /skorsing/:token (tanpa login, HP-first, tema terang).
// Privasi: hanya nama + tanggal yang tampil; alasan pelanggaran TIDAK tampil.
export default function PublicSuspensionPage() {
  const { token } = useParams()
  const {
    info, validating, validateError,
    date, setDate, dayData, loadingDay,
    entries, updateEntry, note, updateNote,
    saving, saveState, saveError, saveNow,
    online, pendingCount,
    submitTask, submittingTask,
  } = usePublicSuspension(token)

  const itemsByBlock = useMemo(() => {
    const map = {}
    LOG_BLOCKS.forEach((b) => { map[b.key] = [] })
    ;(dayData?.templates || []).forEach((t) => {
      if (map[t.block_key]) map[t.block_key].push(t)
    })
    return map
  }, [dayData])

  const filledSet = useMemo(() => {
    const s = new Set()
    // Hari ini dianggap terisi bila log server ada
    if (dayData?.log && date) s.add(date)
    return s
  }, [dayData, date])

  const saveHint = {
    idle: null,
    saving: { icon: Clock3, text: 'Menyimpan otomatis…', cls: 'text-[var(--color-text-muted)]' },
    saved: { icon: CheckCircle2, text: 'Tersimpan', cls: 'text-emerald-600' },
    offline: { icon: WifiOff, text: pendingCount > 0 ? `Offline — ${pendingCount} tersimpan di HP` : 'Offline — tersimpan di HP', cls: 'text-amber-600' },
    error: { icon: AlertTriangle, text: 'Gagal menyimpan otomatis', cls: 'text-[var(--color-danger)]' },
  }[saveState]

  if (validating) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6" data-theme="light">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600" />
          <p className="text-sm text-slate-500 mt-3 font-medium">Memeriksa tautan…</p>
        </div>
      </div>
    )
  }

  if (validateError || !info) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6">
        <div className="max-w-sm w-full text-center bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
          <AlertTriangle className="w-10 h-10 mx-auto text-rose-500" />
          <h1 className="text-lg font-bold text-slate-900 mt-4">Tautan tidak berlaku</h1>
          <p className="text-sm text-slate-500 mt-2 leading-relaxed">
            {validateError || 'Tautan tidak valid.'}
            <br />
            Hubungi pihak sekolah untuk tautan baru.
          </p>
        </div>
      </div>
    )
  }

  const weekend = date ? isWeekend(date) : false
  const seninKamis = date ? isSeninKamis(date) : false

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 pb-28">
      {/* Header ringan: logo + nama + periode (tanpa alasan pelanggaran) */}
      <header className="sticky top-0 z-10 bg-white border-b border-slate-200">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center gap-3">
          <img src={mbsLogo} alt="MBS Tanggul" className="w-10 h-10 object-contain shrink-0" loading="lazy" decoding="async" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Pembinaan di Rumah</p>
            <h1 className="text-base font-bold truncate">{info.student_name}</h1>
            <p className="text-xs text-slate-500">
              {info.class_name ? `${info.class_name} · ` : ''}{info.jenjang} · {formatTanggalPendek(info.start_date)} – {formatTanggalPendek(info.end_date)}
            </p>
          </div>
          {!online && (
            <span className="shrink-0 flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg bg-amber-100 text-amber-700">
              <WifiOff className="w-3.5 h-3.5" /> Offline
            </span>
          )}
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 pt-4 space-y-4">
        <div className="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-100 flex gap-2.5">
          <Info className="w-5 h-5 text-indigo-600 shrink-0" />
          <p className="text-xs text-slate-700 leading-relaxed">
            Isi kegiatan ananda setiap hari dengan jujur. Centang yang sudah dilakukan —
            tersimpan otomatis{online ? '' : ', walau tanpa internet'}.
          </p>
        </div>

        <DayNavigator days={info.days || []} date={date} onChange={setDate} filledSet={filledSet} />

        {weekend && (
          <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-100 text-xs text-slate-700">
            Akhir pekan: ganti ekstrakurikuler dengan kegiatan bermanfaat di rumah (kerja bakti / membantu usaha orang tua) + tugas ekstra pembina.
          </div>
        )}
        {seninKamis && !weekend && (
          <div className="p-3 rounded-2xl bg-amber-50 border border-amber-100 text-xs text-slate-700 flex items-center gap-2">
            <MoonStar className="w-4 h-4 text-amber-600 shrink-0" />
            Hari ini Senin/Kamis — ada pilihan puasa sunah di blok Dini Hari.
          </div>
        )}

        {loadingDay ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-36 rounded-2xl bg-slate-200 animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            <TaskUploadCard
              tasks={dayData?.tasks || []}
              submissions={dayData?.submissions || []}
              onSubmit={submitTask}
              submittingId={submittingTask}
              online={online}
            />
            {LOG_BLOCKS.map((block) => (
              <LogBlockForm
                key={block.key}
                block={block}
                items={itemsByBlock[block.key]}
                entries={entries}
                onChange={updateEntry}
              />
            ))}
            <section aria-label="Catatan wali" className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
              <div className="px-4 py-3">
                <label htmlFor="wali-note" className="text-sm font-bold block mb-2">
                  Catatan untuk pembina <span className="font-normal text-slate-400">(opsional)</span>
                </label>
                <textarea
                  id="wali-note"
                  value={note}
                  onChange={(e) => updateNote(e.target.value)}
                  rows={3}
                  placeholder="Contoh: Ananda kurang enak badan, salat tetap dikerjakan duduk…"
                  className="w-full px-3 py-2.5 min-h-[84px] rounded-xl bg-slate-50 border border-slate-200 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 resize-y"
                />
              </div>
            </section>
          </>
        )}
      </main>

      {/* Bar bawah: status autosave + tombol Simpan besar */}
      <div className="fixed bottom-0 inset-x-0 z-10 bg-white border-t border-slate-200" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
        <div className="max-w-xl mx-auto px-4 pt-2.5">
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-bold flex items-center gap-1.5 ${saveHint?.cls || 'text-slate-400'}`}>
              {saveHint ? <saveHint.icon className="w-3.5 h-3.5" /> : <GraduationCap className="w-3.5 h-3.5" />}
              {saveHint?.text || 'Isian tersimpan otomatis'}
            </span>
            {saveError && <span className="text-xs text-rose-500 font-medium">{saveError}</span>}
          </div>
          <button
            type="button"
            onClick={() => saveNow()}
            disabled={saving || !date}
            className="w-full h-[52px] rounded-2xl text-base font-bold bg-indigo-600 text-white flex items-center justify-center gap-2 disabled:opacity-50 min-h-[52px] active:scale-[0.99]"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            {saving ? 'Menyimpan…' : 'Simpan Log Hari Ini'}
          </button>
        </div>
      </div>
    </div>
  )
}
