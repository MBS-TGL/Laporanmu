import { useState, memo } from 'react'
import {
  Phone, MessageCircle, MapPin, Plus, Trash2, Loader2, History,
} from 'lucide-react'
import { Modal, RichSelect, EmptyState } from '@shared/components'
import { FOLLOWUP_METHODS } from '../utils/suspensionConstants'

const METHOD_ICON = { call: Phone, wa: MessageCircle, visit: MapPin }
const METHOD_LABEL = Object.fromEntries(FOLLOWUP_METHODS.map((m) => [m.value, m.label]))

// Riwayat verifikasi pembina (telepon / WA / kunjungan mingguan).
function FollowupTimeline({ items, onAdd, onDelete }) {
  const [open, setOpen] = useState(false)
  const [method, setMethod] = useState('call')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState('')

  const submit = async (e) => {
    e?.preventDefault()
    if (notes.trim().length < 5 || saving) return
    setSaving(true)
    const res = await onAdd({ method, notes: notes.trim() })
    setSaving(false)
    if (!res?.error) {
      setOpen(false)
      setNotes('')
      setMethod('call')
    }
  }

  const remove = async (row) => {
    if (!window.confirm('Hapus catatan verifikasi ini?')) return
    setDeletingId(row.id)
    await onDelete(row)
    setDeletingId('')
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-black text-[var(--color-text)] flex items-center gap-2">
          <History className="w-4 h-4" /> Verifikasi Pembina
        </h3>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="h-9 px-3 rounded-xl text-xs font-bold bg-[var(--color-primary)] text-white flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> Catat
        </button>
      </div>

      {!items?.length ? (
        <EmptyState
          title="Belum ada verifikasi"
          description="Catat hasil telepon / WA / kunjungan mingguan ke wali di sini."
        />
      ) : (
        <ol className="relative border-l-2 border-[var(--color-border)] ml-2 space-y-4">
          {items.map((f) => {
            const Icon = METHOD_ICON[f.method] || Phone
            return (
              <li key={f.id} className="ml-4 relative">
                <span className="absolute -left-[25px] top-0 w-4 h-4 rounded-full bg-[var(--color-surface)] border-2 border-[var(--color-primary)]" />
                <div className="p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-black text-[var(--color-text)] flex items-center gap-1.5">
                      <Icon className="w-3.5 h-3.5" />
                      {METHOD_LABEL[f.method] || f.method}
                      <span className="font-medium text-[var(--color-text-muted)]">
                        · {new Date(f.contacted_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => remove(f)}
                      disabled={deletingId === f.id}
                      aria-label="Hapus catatan"
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10"
                    >
                      {deletingId === f.id
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-sm text-[var(--color-text)] mt-1 whitespace-pre-wrap">{f.notes}</p>
                </div>
              </li>
            )
          })}
        </ol>
      )}

      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title="Catat Verifikasi"
        icon={Phone}
        footer={(
          <>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="h-10 px-4 rounded-xl text-sm font-bold text-[var(--color-text-muted)] border border-[var(--color-border)]"
            >
              Batal
            </button>
            <button
              type="submit"
              form="followup-form"
              disabled={notes.trim().length < 5 || saving}
              className="h-10 px-5 rounded-xl text-sm font-bold bg-[var(--color-primary)] text-white disabled:opacity-50 flex items-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Simpan
            </button>
          </>
        )}
      >
        <form id="followup-form" onSubmit={submit} className="space-y-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1.5">Metode</p>
            <RichSelect value={method} onChange={setMethod} options={FOLLOWUP_METHODS} compact />
          </div>
          <div>
            <label
              className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1.5 block"
              htmlFor="fol-notes"
            >
              Hasil verifikasi
            </label>
            <textarea
              id="fol-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="Contoh: Telepon Ibu wali pukul 10.00 — ananda salat Subuh berjamaah, tugas Matematika sudah dikerjakan separuh…"
              className="w-full px-3 py-2.5 min-h-[96px] rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text)] text-sm placeholder:text-[var(--color-text-muted)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 resize-y"
            />
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default memo(FollowupTimeline)
