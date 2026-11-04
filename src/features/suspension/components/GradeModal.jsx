import { useState, memo } from 'react'
import { Star, Loader2, ImageIcon } from 'lucide-react'
import { Modal, EmptyState } from '@shared/components'

// Penilaian guru: lihat foto bukti, beri nilai 0-100 + komentar.
// Tombol simpan hanya dirender bila canGrade (pemilik task / admin).
function GradeModal({ isOpen, onClose, onSubmit, task, submission, photos, photosLoading, canGrade, saving }) {
  // Diinisialisasi dari `submission` saat mount; parent me-remount via key
  // setiap modal dibuka, jadi tidak perlu useEffect reset.
  const [score, setScore] = useState(submission?.score ?? '')
  const [comment, setComment] = useState(submission?.teacher_comment || '')
  const [viewer, setViewer] = useState(null)

  const scoreNum = score === '' ? null : Number(score)
  const scoreValid = score === '' || (Number.isInteger(scoreNum) && scoreNum >= 0 && scoreNum <= 100)

  const submit = (e) => {
    e?.preventDefault()
    if (!canGrade || !scoreValid || saving) return
    onSubmit({ score: scoreNum, teacherComment: comment.trim() || null })
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Nilai Tugas"
      description={task ? `${task.subject} · ${task.title}` : ''}
      icon={Star}
      size="lg"
      footer={canGrade ? (
        <>
          <button
            type="button"
            onClick={onClose}
            className="h-10 px-4 rounded-xl text-sm font-bold text-[var(--color-text-muted)] border border-[var(--color-border)]"
          >
            Tutup
          </button>
          <button
            type="submit"
            form="grade-form"
            disabled={!scoreValid || saving}
            className="h-10 px-5 rounded-xl text-sm font-bold bg-[var(--color-primary)] text-white disabled:opacity-50 flex items-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Simpan Nilai
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={onClose}
          className="h-10 px-5 rounded-xl text-sm font-bold bg-[var(--color-primary)] text-white"
        >
          Tutup
        </button>
      )}
    >
      <div className="space-y-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)] mb-2">
            Bukti pengerjaan {submission?.note ? `· “${submission.note}”` : ''}
          </p>
          {photosLoading ? (
            <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
              <Loader2 className="w-4 h-4 animate-spin" /> Memuat foto…
            </div>
          ) : !photos?.length ? (
            <EmptyState icon={ImageIcon} title="Belum ada foto" description="Wali belum mengunggah bukti foto." />
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {photos.map((src, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setViewer(src)}
                  className="rounded-xl overflow-hidden border border-[var(--color-border)] aspect-square bg-[var(--color-surface-alt)]"
                >
                  <img src={src} alt={`Bukti ${i + 1}`} className="w-full h-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </div>

        {viewer && (
          <div
            className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4"
            onClick={() => setViewer(null)}
            role="dialog"
            aria-label="Pratinjau foto"
          >
            <img src={viewer} alt="Pratinjau bukti" className="max-h-full max-w-full rounded-xl object-contain" loading="lazy" decoding="async" />
          </div>
        )}

        {canGrade ? (
          <form id="grade-form" onSubmit={submit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)] mb-1.5 block" htmlFor="grade-score">
                  Nilai (0–100, opsional)
                </label>
                <input
                  id="grade-score"
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={score}
                  onChange={(e) => setScore(e.target.value)}
                  placeholder="85"
                  className="w-full h-10 px-3 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 tabular-nums"
                />
                {!scoreValid && <p className="text-xs text-[var(--color-danger)] mt-1">Nilai harus bilangan 0–100.</p>}
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)] mb-1.5">Status</p>
                <p className="h-10 flex items-center text-sm font-bold text-emerald-600">Dinilai</p>
              </div>
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)] mb-1.5 block" htmlFor="grade-comment">
                Komentar untuk wali / siswa
              </label>
              <textarea
                id="grade-comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                placeholder="Contoh: Bagus, lanjutkan ke latihan berikutnya…"
                className="w-full px-3 py-2.5 min-h-[72px] rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text)] text-sm placeholder:text-[var(--color-text-muted)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 resize-y"
              />
            </div>
          </form>
        ) : (
          submission && (
            <div className="text-sm p-3 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)]">
              {submission.score != null && <p className="font-bold text-[var(--color-text)]">Nilai: {submission.score}</p>}
              {submission.teacher_comment && <p className="text-[var(--color-text-muted)] mt-1">{submission.teacher_comment}</p>}
            </div>
          )
        )}
      </div>
    </Modal>
  )
}

export default memo(GradeModal)
