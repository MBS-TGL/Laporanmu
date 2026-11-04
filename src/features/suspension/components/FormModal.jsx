import { useState, useEffect, useRef, memo } from 'react'
import { Search, Loader2, User } from 'lucide-react'
import {
  Modal, RichSelect, DatePicker,
} from '@shared/components'
import { JENJANG_OPTIONS } from '../utils/suspensionConstants'

const inputCls = 'w-full h-10 px-3 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text)] text-sm placeholder:text-[var(--color-text-muted)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 focus:border-[var(--color-primary)] transition-all'
const labelCls = 'text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)] opacity-70 mb-1.5 flex items-center gap-1.5'

function StudentPicker({ value, onSelect, findStudents, suggestJenjang, disabled }) {
  const [term, setTerm] = useState('')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const [searching, setSearching] = useState(false)
  const timer = useRef(null)
  const boxRef = useRef(null)

  useEffect(() => {
    const close = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  const onChange = (val) => {
    setTerm(val)
    if (timer.current) clearTimeout(timer.current)
    if (val.trim().length < 2) {
      setResults([])
      setOpen(false)
      return
    }
    setSearching(true)
    timer.current = setTimeout(async () => {
      const list = await findStudents(val)
      setResults(list)
      setSearching(false)
      setOpen(true)
    }, 300)
  }

  return (
    <div ref={boxRef} className="relative">
      <label className={labelCls} htmlFor="sus-student">Siswa (ketik minimal 2 huruf)</label>
      {value ? (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--color-primary)]/5 border border-[var(--color-primary)]/20">
          <div className="w-9 h-9 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center shrink-0 overflow-hidden">
            <span className="text-sm font-bold text-[var(--color-primary)]">{value.name?.charAt(0)}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-[var(--color-text)] truncate">{value.name}</p>
            <p className="text-xs text-[var(--color-text-muted)] truncate">{value.classes?.name || '-'} · {suggestJenjang(value.classes?.grade)}</p>
          </div>
          {!disabled && (
            <button
              type="button"
              onClick={() => { onSelect(null); setTerm('') }}
              className="h-9 px-3 rounded-xl text-xs font-bold text-[var(--color-text-muted)] hover:text-[var(--color-danger)] border border-[var(--color-border)]"
            >
              Ganti
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input
              id="sus-student"
              value={term}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Cari nama siswa…"
              disabled={disabled}
              className={`${inputCls} pl-9`}
              autoComplete="off"
            />
            {searching && <Loader2 className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-[var(--color-text-muted)]" />}
          </div>
          {open && results.length > 0 && (
            <div className="absolute z-20 mt-1 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl overflow-hidden max-h-56 overflow-y-auto">
              {results.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => { onSelect(s); setOpen(false); setTerm('') }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[var(--color-surface-alt)] text-left"
                >
                  <span className="w-8 h-8 rounded-lg bg-[var(--color-surface-alt)] border border-[var(--color-border)] flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-[var(--color-text-muted)]" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-[var(--color-text)] truncate">{s.name}</span>
                    <span className="block text-xs text-[var(--color-text-muted)] truncate">{s.classes?.name || '-'}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// Form buat skorsing. Jenjang terisi otomatis dari kelas, bisa dioverride manual.
// Parent me-remount via key setiap modal dibuka, jadi state awal selalu segar
// tanpa useEffect reset (mematuhi react-hooks/set-state-in-effect).
function FormModal({ isOpen, onClose, onSubmit, findStudents, findReports, suggestJenjang, saving }) {
  const today = new Date().toISOString().slice(0, 10)
  const [student, setStudent] = useState(null)
  const [jenjang, setJenjang] = useState('SMA')
  const [startDate, setStartDate] = useState(today)
  const [endDate, setEndDate] = useState(today)
  const [reason, setReason] = useState('')
  const [reports, setReports] = useState([])
  const [reportId, setReportId] = useState('')

  // Dipanggil dari StudentPicker saat siswa dipilih / diganti.
  const handleStudent = (s) => {
    setStudent(s)
    if (s?.classes?.grade) setJenjang(suggestJenjang(s.classes.grade))
    if (s?.id) {
      findReports(s.id).then((list) => {
        setReports(list || [])
        setReportId('')
      })
    } else {
      setReports([])
      setReportId('')
    }
  }

  const valid = student && startDate && endDate && endDate >= startDate
    && reason.trim().length >= 10 && !saving

  const submit = (e) => {
    e?.preventDefault()
    if (!valid) return
    onSubmit({
      student, jenjang, startDate, endDate,
      reasonSummary: reason.trim(),
      violationReportId: reportId || null,
    })
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Buat Data Skorsing"
      description="Siswa dipulangkan ke rumah dan mendapat pembinaan lewat tautan wali."
      icon={User}
      footer={(
        <>
          <button
            type="button"
            onClick={onClose}
            className="h-10 px-4 rounded-xl text-sm font-bold text-[var(--color-text-muted)] border border-[var(--color-border)] hover:bg-[var(--color-surface-alt)]"
          >
            Batal
          </button>
          <button
            type="submit"
            form="suspension-form"
            disabled={!valid}
            className="h-10 px-5 rounded-xl text-sm font-bold bg-[var(--color-primary)] text-white disabled:opacity-50 flex items-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Simpan
          </button>
        </>
      )}
    >
      <form id="suspension-form" onSubmit={submit} className="space-y-4">
      <StudentPicker
        value={student}
        onSelect={handleStudent}
        findStudents={findStudents}
        suggestJenjang={suggestJenjang}
        disabled={saving}
      />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls} htmlFor="sus-jenjang">Jenjang</label>
            <RichSelect
              value={jenjang}
              onChange={setJenjang}
              options={JENJANG_OPTIONS}
              compact
            />
          </div>
          <div>
            <label className={labelCls} htmlFor="sus-report">Relasi pelanggaran (opsional)</label>
            <RichSelect
              value={reportId}
              onChange={setReportId}
              placeholder={reports.length ? 'Pilih catatan…' : 'Tidak ada catatan'}
              options={reports.map((r) => ({
                value: r.id,
                label: `${r.reported_at?.slice(0, 10) || ''} · ${r.point_rules?.name || 'Pelanggaran'} (${r.points})`,
              }))}
              compact
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Tanggal mulai</label>
            <DatePicker value={startDate} onChange={setStartDate} />
          </div>
          <div>
            <label className={labelCls}>Tanggal selesai</label>
            <DatePicker value={endDate} onChange={setEndDate} min={startDate} />
          </div>
        </div>
        <div>
          <label className={labelCls} htmlFor="sus-reason">
            Alasan / ringkasan (internal — tidak tampil ke wali)
          </label>
          <textarea
            id="sus-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Contoh: Melanggar tata tertib berat (perkelahian). Dipulangkan 5 hari dengan tugas pembinaan…"
            className={`${inputCls} h-auto py-2.5 min-h-[76px] resize-y`}
          />
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            Minimal 10 karakter. Hanya dibaca guru/BK di dashboard.
          </p>
        </div>
      </form>
    </Modal>
  )
}

export default memo(FormModal)
