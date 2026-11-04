import { useState, memo } from 'react'
import { BookOpenCheck, Loader2 } from 'lucide-react'
import { Modal, RichDatePicker } from '@shared/components'

const inputCls = 'w-full h-10 px-3 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text)] text-sm placeholder:text-[var(--color-text-muted)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 focus:border-[var(--color-primary)] transition-all'
const labelCls = 'text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-70 mb-1.5 block'

// Form tambah/ubah tugas. Guru mengisi mapel sendiri + target tahfidz & Wafa opsional.
function TaskFormModal({ isOpen, onClose, onSubmit, editing, saving }) {
  // State diinisialisasi dari `editing` saat mount. Parent me-remount via key
  // setiap modal dibuka (key berisi id editing + status buka), jadi tidak
  // perlu useEffect reset — pola ini mematuhi react-hooks/set-state-in-effect.
  const [subject, setSubject] = useState(editing?.subject || '')
  const [title, setTitle] = useState(editing?.title || '')
  const [description, setDescription] = useState(editing?.description || '')
  const [dueDate, setDueDate] = useState(editing?.due_date || '')
  const [tahfidzSurah, setTahfidzSurah] = useState(editing?.target_tahfidz?.surah || '')
  const [tahfidzAyat, setTahfidzAyat] = useState(editing?.target_tahfidz?.ayat || '')
  const [wafaJilid, setWafaJilid] = useState(editing?.target_wafa?.jilid || '')
  const [wafaHalaman, setWafaHalaman] = useState(editing?.target_wafa?.halaman || '')

  const valid = subject.trim() && title.trim() && !saving

  const submit = (e) => {
    e?.preventDefault()
    if (!valid) return
    onSubmit({
      subject: subject.trim(),
      title: title.trim(),
      description: description.trim() || null,
      due_date: dueDate || null,
      target_tahfidz: tahfidzSurah.trim()
        ? { surah: tahfidzSurah.trim(), ayat: tahfidzAyat.trim() || null }
        : null,
      target_wafa: wafaJilid.trim()
        ? { jilid: wafaJilid.trim(), halaman: wafaHalaman.trim() || null }
        : null,
    })
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editing ? 'Ubah Tugas' : 'Tambah Tugas'}
      description="Tugas tampil di halaman wali pada blok Pagi & Siang."
      icon={BookOpenCheck}
      footer={(
        <>
          <button
            type="button"
            onClick={onClose}
            className="h-10 px-4 rounded-xl text-sm font-bold text-[var(--color-text-muted)] border border-[var(--color-border)]"
          >
            Batal
          </button>
          <button
            type="submit"
            form="suspension-task-form"
            disabled={!valid}
            className="h-10 px-5 rounded-xl text-sm font-bold bg-[var(--color-primary)] text-white disabled:opacity-50 flex items-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Simpan
          </button>
        </>
      )}
    >
      <form id="suspension-task-form" onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls} htmlFor="task-subject">Mata pelajaran</label>
            <input id="task-subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Matematika" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Tenggat (opsional)</label>
            <RichDatePicker value={dueDate} onChange={setDueDate} />
          </div>
        </div>
        <div>
          <label className={labelCls} htmlFor="task-title">Judul tugas</label>
          <input id="task-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Kerjakan latihan halaman 42 no. 1–10" className={inputCls} />
        </div>
        <div>
          <label className={labelCls} htmlFor="task-desc">Deskripsi / petunjuk</label>
          <textarea id="task-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Tulis langkah pengerjaan…" className={`${inputCls} h-auto py-2.5 min-h-[72px] resize-y`} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/40">
            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-2">Target tahfidz</p>
            <input value={tahfidzSurah} onChange={(e) => setTahfidzSurah(e.target.value)} placeholder="Surah" aria-label="Target surah" className={`${inputCls} mb-2`} />
            <input value={tahfidzAyat} onChange={(e) => setTahfidzAyat(e.target.value)} placeholder="Ayat (cth. 1–10)" aria-label="Target ayat" className={inputCls} />
          </div>
          <div className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/40">
            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-2">Target Wafa / BTA</p>
            <input value={wafaJilid} onChange={(e) => setWafaJilid(e.target.value)} placeholder="Jilid" aria-label="Target jilid" className={`${inputCls} mb-2`} />
            <input value={wafaHalaman} onChange={(e) => setWafaHalaman(e.target.value)} placeholder="Halaman" aria-label="Target halaman" className={inputCls} />
          </div>
        </div>
      </form>
    </Modal>
  )
}

export default memo(TaskFormModal)
