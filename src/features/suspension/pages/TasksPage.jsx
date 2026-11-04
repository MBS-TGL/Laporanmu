import { useState, useMemo } from 'react'
import {
  BookOpenCheck, Plus, Pencil, Trash2, Star, User,
  ImageIcon, Lock,
} from 'lucide-react'
import DashboardLayout from '@core/layouts/DashboardLayout'
import {
  PageHeader, RichSelect, EmptyState, TableSkeleton, ConfirmDialog, Skeleton,
} from '@shared/components'
import useSuspensionTasks from '../hooks/useSuspensionTasks'
import TaskForm from '../components/TaskForm'
import GradeModal from '../components/GradeModal'
import { formatTanggalPendek } from '../utils/suspensionConstants'

export default function TasksPage() {
  const {
    activeList, selectedId, setSelectedId,
    tasks, myTasks, submissions,
    loading, saving, isAdmin,
    canManageTask, saveTask, removeTask, grade, fetchPhotos,
  } = useSuspensionTasks()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [gradeOpen, setGradeOpen] = useState(false)
  const [gradeTask, setGradeTask] = useState(null)
  const [gradeSub, setGradeSub] = useState(null)
  const [photos, setPhotos] = useState([])
  const [photosLoading, setPhotosLoading] = useState(false)
  const [gradeSaving, setGradeSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [showMine, setShowMine] = useState(true)

  const subByTask = useMemo(() => {
    const map = {}
    submissions.forEach((s) => { map[s.task_id] = s })
    return map
  }, [submissions])

  const visible = showMine && !isAdmin ? myTasks : tasks

  const selected = activeList.find((s) => s.id === selectedId)

  const openGrade = async (task) => {
    const sub = subByTask[task.id]
    setGradeTask(task)
    setGradeSub(sub || null)
    setPhotos([])
    setGradeOpen(true)
    if (sub) {
      setPhotosLoading(true)
      const list = await fetchPhotos(sub.id)
      setPhotos(list)
      setPhotosLoading(false)
    }
  }

  const submitGrade = async ({ score, teacherComment }) => {
    if (!gradeSub) return
    setGradeSaving(true)
    const ok = await grade(gradeSub, { score, teacherComment })
    setGradeSaving(false)
    if (ok) setGradeOpen(false)
  }

  const submitTask = async (payload) => {
    const { error } = await saveTask(payload, editing)
    if (!error) {
      setFormOpen(false)
      setEditing(null)
    }
  }

  const doDelete = async () => {
    if (!deleteTarget) return
    const ok = await removeTask(deleteTarget)
    if (ok) setDeleteTarget(null)
  }

  return (
    <DashboardLayout>
      <PageHeader
        title="Tugas Skorsing"
        subtitle="Tambah tugas pembinaan dan nilai bukti pengerjaan siswa."
        breadcrumbs={[{ label: 'Kesantrian' }, { label: 'Tugas Skorsing' }]}
        actions={(
          <button
            type="button"
            onClick={() => { setEditing(null); setFormOpen(true) }}
            disabled={!selectedId}
            className="h-10 px-4 rounded-xl text-sm font-bold bg-[var(--color-primary)] text-white flex items-center gap-2 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" /> Tambah Tugas
          </button>
        )}
      />

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="flex-1">
          <RichSelect
            value={selectedId}
            onChange={setSelectedId}
            placeholder={activeList.length ? 'Pilih siswa skorsing…' : 'Tidak ada skorsing aktif'}
            options={activeList.map((s) => ({
              value: s.id,
              label: `${s.student?.name || '-'} · ${s.student?.classes?.name || '-'} (${s.jenjang})`,
            }))}
            compact
            className="w-full"
          />
        </div>
        {!isAdmin && (
          <button
            type="button"
            onClick={() => setShowMine((v) => !v)}
            aria-pressed={showMine}
            className={`h-10 px-4 rounded-xl text-xs font-bold border flex items-center gap-2 ${
              showMine
                ? 'border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--color-primary)]/5'
                : 'border-[var(--color-border)] text-[var(--color-text-muted)]'
            }`}
          >
            <User className="w-4 h-4" />
            {showMine ? 'Tugas saya' : 'Semua tugas'}
          </button>
        )}
      </div>

      {selected && (
        <p className="text-xs text-[var(--color-text-muted)] mb-3">
          {selected.student?.name} · {formatTanggalPendek(selected.start_date)} – {formatTanggalPendek(selected.end_date)}
        </p>
      )}

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-12 rounded-xl" />
          <TableSkeleton rows={4} cols={3} />
        </div>
      ) : !selectedId ? (
        <EmptyState
          icon={BookOpenCheck}
          title="Pilih skorsing aktif"
          description="Pilih siswa di atas untuk melihat dan menambah tugas."
        />
      ) : !visible.length ? (
        <EmptyState
          icon={BookOpenCheck}
          title={showMine && !isAdmin ? 'Belum ada tugas buatan Anda' : 'Belum ada tugas'}
          description="Tambah tugas lewat tombol di atas."
        />
      ) : (
        <div className="space-y-2">
          {visible.map((t) => {
            const sub = subByTask[t.id]
            const mine = canManageTask(t)
            const photoCount = (sub?.photo_urls?.length || 0)
            return (
              <article key={t.id} className="p-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)]">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-primary)]">{t.subject}</p>
                    <h3 className="text-sm font-bold text-[var(--color-text)] mt-0.5">{t.title}</h3>
                    {t.description && <p className="text-xs text-[var(--color-text-muted)] mt-1 whitespace-pre-wrap">{t.description}</p>}
                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs text-[var(--color-text-muted)]">
                      {t.due_date && <span>Tenggat: {formatTanggalPendek(t.due_date)}</span>}
                      {t.target_tahfidz?.surah && <span>Tahfidz: {t.target_tahfidz.surah}{t.target_tahfidz.ayat ? ` : ${t.target_tahfidz.ayat}` : ''}</span>}
                      {t.target_wafa?.jilid && <span>Wafa: jilid {t.target_wafa.jilid}{t.target_wafa.halaman ? ` hal. ${t.target_wafa.halaman}` : ''}</span>}
                      {!mine && <span className="flex items-center gap-1"><Lock className="w-3 h-3" /> milik guru lain</span>}
                    </div>
                  </div>
                  <span className={`shrink-0 text-xs font-bold px-2 py-1 rounded-lg border ${
                    !sub ? 'bg-slate-500/10 text-[var(--color-text-muted)] border-[var(--color-border)]'
                    : sub.status === 'dinilai' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                  }`}>
                    {!sub ? 'belum dikerjakan' : sub.status === 'dinilai' ? `dinilai${sub.score != null ? ` · ${sub.score}` : ''}` : 'dikerjakan'}
                  </span>
                </div>

                {sub && (
                  <div className="mt-2 text-xs text-[var(--color-text-muted)] flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <ImageIcon className="w-3.5 h-3.5" /> {photoCount} foto
                    </span>
                    {sub.note && <span className="truncate">“{sub.note}”</span>}
                  </div>
                )}

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => openGrade(t)}
                    disabled={!sub}
                    className="h-9 px-3 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20 flex items-center gap-1.5 disabled:opacity-40"
                  >
                    <Star className="w-4 h-4" /> {sub?.status === 'dinilai' ? 'Lihat Nilai' : 'Nilai'}
                  </button>
                  {mine ? (
                    <>
                      <button
                        type="button"
                        onClick={() => { setEditing(t); setFormOpen(true) }}
                        className="h-9 px-3 rounded-xl text-xs font-bold border border-[var(--color-border)] flex items-center gap-1.5 hover:bg-[var(--color-surface-alt)]"
                      >
                        <Pencil className="w-4 h-4" /> Ubah
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(t)}
                        className="h-9 px-3 rounded-xl text-xs font-bold border border-[var(--color-border)] text-[var(--color-text-muted)] flex items-center gap-1.5 hover:text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10"
                      >
                        <Trash2 className="w-4 h-4" /> Hapus
                      </button>
                    </>
                  ) : (
                    <span className="text-xs text-[var(--color-text-muted)] self-center">
                      {isAdmin ? '' : 'Hanya pembuat tugas yang bisa mengubah.'}
                    </span>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )}

      <TaskForm
        key={formOpen ? `taskform-${editing?.id || 'baru'}` : 'taskform-tutup'}
        isOpen={formOpen}
        onClose={() => { setFormOpen(false); setEditing(null) }}
        onSubmit={submitTask}
        editing={editing}
        saving={saving}
      />

      <GradeModal
        key={gradeOpen ? `grade-${gradeTask?.id}-${gradeSub?.id || 'baru'}` : 'grade-tutup'}
        isOpen={gradeOpen}
        onClose={() => setGradeOpen(false)}
        onSubmit={submitGrade}
        task={gradeTask}
        submission={gradeSub}
        photos={photos}
        photosLoading={photosLoading}
        canGrade={gradeTask ? canManageTask(gradeTask) : false}
        saving={gradeSaving}
      />

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={doDelete}
        title="Hapus tugas ini?"
        description="Bukti yang sudah dikumpulkan wali ikut terhapus."
        confirmText="Ya, hapus"
      />
    </DashboardLayout>
  )
}
