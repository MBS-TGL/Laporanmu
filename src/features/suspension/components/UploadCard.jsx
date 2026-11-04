import { useState, useRef, memo } from 'react'
import {
  BookOpenCheck, Camera, X, Send, Loader2, CheckCircle2,
  ChevronDown, ChevronUp,
} from 'lucide-react'
import { compressImages } from '../utils/imageCompress'
import { MAX_PHOTOS_PER_SUBMIT, formatTanggalPendek } from '../utils/suspensionConstants'

// Blok utama: daftar tugas guru + upload foto bukti (kompres client) + kirim.
function UploadCard({ tasks, submissions, onSubmit, submittingId, online }) {
  const [openId, setOpenId] = useState(null)
  const [files, setFiles] = useState([])
  const [previews, setPreviews] = useState([])
  const [notes, setNotes] = useState({})
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState({})
  const inputRef = useRef({})

  if (!tasks?.length) return null

  const subByTask = {}
  ;(submissions || []).forEach((s) => { subByTask[s.task_id] = s })

  const pick = async (taskId, fileList) => {
    const chosen = Array.from(fileList || []).slice(0, MAX_PHOTOS_PER_SUBMIT)
    if (!chosen.length) return
    setBusy(true)
    setMsg((m) => ({ ...m, [taskId]: null }))
    try {
      const out = await compressImages(chosen)
      setFiles((f) => ({ ...f, [taskId]: out.map((o) => o.dataUrl) }))
      setPreviews((p) => ({ ...p, [taskId]: out.map((o) => o.dataUrl) }))
    } catch (err) {
      setMsg((m) => ({ ...m, [taskId]: err?.message || 'Gagal memproses foto.' }))
    } finally {
      setBusy(false)
    }
  }

  const removePhoto = (taskId, idx) => {
    setFiles((f) => ({ ...f, [taskId]: (f[taskId] || []).filter((_, i) => i !== idx) }))
    setPreviews((p) => ({ ...p, [taskId]: (p[taskId] || []).filter((_, i) => i !== idx) }))
  }

  const send = async (task) => {
    const imgs = files[task.id] || []
    const note = (notes[task.id] || '').trim()
    if (!imgs.length && !note) {
      setMsg((m) => ({ ...m, [task.id]: 'Lampirkan minimal satu foto atau tulis catatan.' }))
      return
    }
    setBusy(true)
    const res = await onSubmit(task.id, imgs, note)
    setBusy(false)
    if (res?.ok) {
      setFiles((f) => ({ ...f, [task.id]: [] }))
      setPreviews((p) => ({ ...p, [task.id]: [] }))
      setNotes((n) => ({ ...n, [task.id]: '' }))
      setMsg((m) => ({ ...m, [task.id]: 'ok' }))
      setOpenId(null)
    } else {
      setMsg((m) => ({ ...m, [task.id]: res?.message || 'Gagal mengirim.' }))
    }
  }

  return (
    <section aria-label="Tugas KBM" className="rounded-2xl border border-[var(--color-primary)]/30 bg-[var(--color-surface)] overflow-hidden">
      <header className="px-4 py-3 border-b border-[var(--color-primary)]/20 bg-[var(--color-primary)]/5">
        <h3 className="text-sm font-bold text-[var(--color-text)] flex items-center gap-2">
          <BookOpenCheck className="w-4 h-4 text-[var(--color-primary)]" />
          Tugas KBM Hari Ini ({tasks.length})
        </h3>
        <p className="text-xs text-[var(--color-text-muted)]">Kerjakan, foto hasilnya, lalu kirim lewat sini.</p>
      </header>
      <div className="divide-y divide-[var(--color-border)]">
        {tasks.map((t) => {
          const sub = subByTask[t.id]
          const open = openId === t.id
          const mine = previews[t.id] || []
          return (
            <div key={t.id} className="px-4 py-3">
              <button
                type="button"
                onClick={() => setOpenId(open ? null : t.id)}
                aria-expanded={open}
                className="w-full flex items-center justify-between gap-2 text-left min-h-[44px]"
              >
                <span className="min-w-0">
                  <span className="block text-xs font-bold uppercase tracking-wide text-[var(--color-primary)]">{t.subject}</span>
                  <span className="block text-sm font-bold text-[var(--color-text)] truncate">{t.title}</span>
                </span>
                <span className="flex items-center gap-1.5 shrink-0">
                  {sub?.status === 'dinilai' && (
                    <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600">
                      {sub.score != null ? `Nilai ${sub.score}` : 'Dinilai'}
                    </span>
                  )}
                  {sub && sub.status !== 'dinilai' && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  )}
                  {open ? <ChevronUp className="w-4 h-4 text-[var(--color-text-muted)]" /> : <ChevronDown className="w-4 h-4 text-[var(--color-text-muted)]" />}
                </span>
              </button>

              {open && (
                <div className="mt-2 space-y-3 pb-1">
                  {t.description && <p className="text-xs text-[var(--color-text-muted)] whitespace-pre-wrap">{t.description}</p>}
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-[var(--color-text-muted)]">
                    {t.due_date && <span>Tenggat: {formatTanggalPendek(t.due_date)}</span>}
                    {t.target_tahfidz?.surah && <span>Tahfidz: {t.target_tahfidz.surah}{t.target_tahfidz.ayat ? ` : ${t.target_tahfidz.ayat}` : ''}</span>}
                    {t.target_wafa?.jilid && <span>Wafa: jilid {t.target_wafa.jilid}{t.target_wafa.halaman ? ` hal. ${t.target_wafa.halaman}` : ''}</span>}
                  </div>

                  {mine.length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      {mine.map((src, i) => (
                        <div key={i} className="relative rounded-xl overflow-hidden border border-[var(--color-border)] aspect-square">
                          <img src={src} alt={`Bukti ${i + 1}`} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                          <button
                            type="button"
                            onClick={() => removePhoto(t.id, i)}
                            aria-label={`Hapus foto ${i + 1}`}
                            className="absolute top-1 right-1 w-7 h-7 rounded-lg bg-black/60 text-white flex items-center justify-center"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <input
                    ref={(el) => { inputRef.current[t.id] = el }}
                    type="file"
                    accept="image/*"
                    multiple
                    capture="environment"
                    className="hidden"
                    aria-label="Pilih foto bukti"
                    onChange={(e) => { pick(t.id, e.target.files); e.target.value = '' }}
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => inputRef.current[t.id]?.click()}
                      disabled={busy}
                      className="flex-1 h-11 rounded-xl text-xs font-bold border border-[var(--color-border)] flex items-center justify-center gap-2 min-h-[44px] disabled:opacity-50"
                    >
                      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                      {mine.length ? `Tambah foto (${mine.length})` : 'Ambil / Pilih foto'}
                    </button>
                    <button
                      type="button"
                      onClick={() => send(t)}
                      disabled={busy || submittingId === t.id || !online}
                      title={!online ? 'Perlu koneksi internet untuk mengunggah foto' : 'Kirim bukti tugas'}
                      className="flex-1 h-11 rounded-xl text-xs font-bold bg-[var(--color-primary)] text-white flex items-center justify-center gap-2 min-h-[44px] disabled:opacity-50"
                    >
                      {submittingId === t.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      Kirim Bukti
                    </button>
                  </div>

                  <input
                    value={notes[t.id] || ''}
                    onChange={(e) => setNotes((n) => ({ ...n, [t.id]: e.target.value }))}
                    placeholder="Catatan (opsional)…"
                    aria-label="Catatan tugas"
                    className="w-full h-11 px-3 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
                  />

                  {!online && (
                    <p className="text-xs text-amber-600">Sedang offline — foto hanya bisa dikirim saat online. Isian checklist tetap tersimpan otomatis.</p>
                  )}
                  {msg[t.id] && msg[t.id] !== 'ok' && (
                    <p className="text-xs text-[var(--color-danger)]">{msg[t.id]}</p>
                  )}
                  {msg[t.id] === 'ok' && (
                    <p className="text-xs text-emerald-600 font-bold">Terkirim. Guru akan memeriksa dan memberi nilai.</p>
                  )}
                  {sub?.teacher_comment && (
                    <p className="text-xs p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[var(--color-text)]">
                      <span className="font-bold">Komentar guru: </span>{sub.teacher_comment}
                    </p>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}

export default memo(UploadCard)
