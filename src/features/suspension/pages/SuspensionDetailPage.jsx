import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, User, CalendarDays, BookOpenCheck, ClipboardCheck,
  Download, FileText, Link2, Phone,
} from 'lucide-react'
import DashboardLayout from '@core/layouts/DashboardLayout'
import {
  PageHeader, StatCard, StatsCarousel, Skeleton, EmptyState,
} from '@shared/components'
import useSuspensionDetail from '../hooks/useSuspensionDetail'
import ProgressGrid from '../components/ProgressGrid'
import FollowupTimeline from '../components/FollowupTimeline'
import { generateRekapPdf, generateBackupPdf } from '../utils/suspensionPdf'
import { LOG_BLOCKS, formatTanggalPanjang } from '../utils/suspensionConstants'

export default function SuspensionDetailPage() {
  const { id } = useParams()
  const nav = useNavigate()
  const {
    suspension, tasks, subByTask, logs, logByDate, followups, templates,
    days, stats, loading, error, addFollowup, removeFollowup,
  } = useSuspensionDetail(id)

  const [selectedDay, setSelectedDay] = useState('')
  const [pdfLoading, setPdfLoading] = useState(null)

  const selectedLog = selectedDay ? logByDate[selectedDay] : null

  // Kelompokkan template aktif per blok (sekali hitung per templates)
  const templatesByBlock = useMemo(() => {
    const map = {}
    LOG_BLOCKS.forEach((b) => { map[b.key] = [] })
    ;(templates || []).forEach((t) => {
      if (map[t.block_key]) map[t.block_key].push(t)
    })
    return map
  }, [templates])

  const entryLabel = (tpl, value) => {
    if (value === true) return 'Ya'
    if (value === false || value === undefined || value === null || value === '') return '—'
    if (typeof value === 'object') {
      const parts = []
      if (value.surah) parts.push(`${value.surah}${value.ayat ? ` : ${value.ayat}` : ''}`)
      if (value.jilid) parts.push(`Jilid ${value.jilid}${value.halaman ? ` hal. ${value.halaman}` : ''}`)
      if (value.choice) parts.push(value.choice)
      if (value.text) parts.push(value.text)
      return parts.join(' · ') || '—'
    }
    return String(value)
  }

  const downloadPdf = async (kind) => {
    if (!suspension) return
    setPdfLoading(kind)
    try {
      const blob = kind === 'rekap'
        ? await generateRekapPdf({ suspension, days, logByDate, tasks, subByTask, followups })
        : await generateBackupPdf({ suspension, days, templates: templatesByBlock })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const safe = (suspension.student?.name || 'siswa').replace(/\s+/g, '_')
      a.download = kind === 'rekap'
        ? `rekap-skorsing-${safe}.pdf`
        : `lembar-cadangan-${safe}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 5000)
    } finally {
      setPdfLoading(null)
    }
  }

  return (
    <DashboardLayout>
      <button
        type="button"
        onClick={() => nav('/suspensions')}
        className="mb-3 h-9 px-3 rounded-xl text-xs font-bold text-[var(--color-text-muted)] border border-[var(--color-border)] flex items-center gap-1.5 hover:bg-[var(--color-surface-alt)]"
      >
        <ArrowLeft className="w-4 h-4" /> Kembali ke daftar
      </button>

      {loading ? (
        <Skeleton className="h-64 rounded-2xl" />
      ) : error || !suspension ? (
        <div className="p-6 rounded-2xl border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/5 text-sm text-[var(--color-danger)]">
          {error || 'Data tidak ditemukan.'}
        </div>
      ) : (
        <>
          <PageHeader
            title={suspension.student?.name || 'Detail Skorsing'}
            subtitle={`${suspension.student?.classes?.name || '-'} · ${suspension.jenjang} · ${formatTanggalPanjang(suspension.start_date)} – ${formatTanggalPanjang(suspension.end_date)}`}
            breadcrumbs={[{ label: 'Kesantrian' }, { label: 'Skorsing' }, { label: 'Detail' }]}
            badge={suspension.status}
            actions={(
              <>
                <button
                  type="button"
                  onClick={() => downloadPdf('rekap')}
                  disabled={pdfLoading !== null}
                  className="h-10 px-4 rounded-xl text-xs font-bold bg-[var(--color-primary)] text-white flex items-center gap-2 disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  {pdfLoading === 'rekap' ? 'Membuat…' : 'Rekap PDF'}
                </button>
                <button
                  type="button"
                  onClick={() => downloadPdf('backup')}
                  disabled={pdfLoading !== null}
                  className="h-10 px-4 rounded-xl text-xs font-bold border border-[var(--color-border)] flex items-center gap-2 hover:bg-[var(--color-surface-alt)] disabled:opacity-50"
                >
                  <FileText className="w-4 h-4" />
                  {pdfLoading === 'backup' ? 'Membuat…' : 'Lembar Cadangan'}
                </button>
              </>
            )}
          />

          <div className="mb-5">
            <StatsCarousel count={4}>
              <StatCard icon={ClipboardCheck} label="Hari terisi" value={`${stats.filledDays}/${stats.totalDays}`} color="emerald" progressValue={stats.filledDays} progressMax={stats.totalDays || 1} />
              <StatCard icon={CalendarDays} label="Hari kosong" value={stats.emptyDays} color="rose" />
              <StatCard icon={BookOpenCheck} label="Tugas selesai" value={`${stats.doneTasks}/${stats.totalTasks}`} color="sky" progressValue={stats.doneTasks} progressMax={stats.totalTasks || 1} />
              <StatCard icon={User} label="Tugas dinilai" value={`${stats.gradedTasks}/${stats.totalTasks}`} color="amber" progressValue={stats.gradedTasks} progressMax={stats.totalTasks || 1} />
            </StatsCarousel>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-4">
              <section className="p-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)]">
                <h3 className="text-sm font-black text-[var(--color-text)] mb-3">Progres Harian</h3>
                <ProgressGrid
                  suspension={suspension}
                  logByDate={logByDate}
                  selected={selectedDay}
                  onSelect={(d) => setSelectedDay((prev) => (prev === d ? '' : d))}
                />
              </section>

              <section className="p-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)]">
                <h3 className="text-sm font-black text-[var(--color-text)] mb-1">
                  {selectedDay ? `Isian ${formatTanggalPanjang(selectedDay)}` : 'Isian harian'}
                </h3>
                {!selectedDay ? (
                  <p className="text-xs text-[var(--color-text-muted)]">Pilih salah satu hari di atas untuk melihat isiannya.</p>
                ) : !selectedLog ? (
                  <EmptyState title="Hari ini belum diisi" description="Wali belum mengirim log untuk tanggal ini." />
                ) : (
                  <div className="space-y-4 mt-3">
                    {LOG_BLOCKS.map((block) => {
                      const items = templatesByBlock[block.key] || []
                      const shown = items.filter((t) => selectedLog.entries?.[t.item_key] !== undefined)
                      if (!shown.length) return null
                      return (
                        <div key={block.key}>
                          <p className="text-[11px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1.5">
                            {block.label} <span className="font-medium normal-case">({block.time})</span>
                          </p>
                          <dl className="divide-y divide-[var(--color-border)] rounded-xl border border-[var(--color-border)] overflow-hidden">
                            {shown.map((t) => (
                              <div key={t.item_key} className="flex justify-between gap-3 px-3 py-2 bg-[var(--color-surface-alt)]/40">
                                <dt className="text-xs text-[var(--color-text-muted)]">{t.label_id}</dt>
                                <dd className="text-xs font-bold text-[var(--color-text)] text-right max-w-[55%]">
                                  {entryLabel(t, selectedLog.entries[t.item_key])}
                                </dd>
                              </div>
                            ))}
                          </dl>
                        </div>
                      )
                    })}
                    {selectedLog.note_optional && (
                      <p className="text-xs text-[var(--color-text)] p-3 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)]">
                        <span className="font-black">Catatan wali: </span>{selectedLog.note_optional}
                      </p>
                    )}
                  </div>
                )}
              </section>

              <section className="p-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)]">
                <h3 className="text-sm font-black text-[var(--color-text)] mb-3 flex items-center gap-2">
                  <BookOpenCheck className="w-4 h-4" /> Tugas & Penilaian ({tasks.length})
                </h3>
                {!tasks.length ? (
                  <EmptyState title="Belum ada tugas" description="Guru menambahkan tugas lewat halaman Tugas Skorsing." />
                ) : (
                  <div className="space-y-2">
                    {tasks.map((t) => {
                      const sub = subByTask[t.id]
                      return (
                        <div key={t.id} className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/40">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-[var(--color-text)]">{t.title}</p>
                              <p className="text-[11px] text-[var(--color-text-muted)]">{t.subject}{t.due_date ? ` · tenggat ${t.due_date}` : ''}</p>
                            </div>
                            <span className={`shrink-0 text-[10px] font-black px-2 py-1 rounded-lg border ${
                              !sub ? 'bg-slate-500/10 text-[var(--color-text-muted)] border-[var(--color-border)]'
                              : sub.status === 'dinilai' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                            }`}>
                              {!sub ? 'belum' : sub.status === 'dinilai' ? `dinilai${sub.score != null ? ` · ${sub.score}` : ''}` : 'dikerjakan'}
                            </span>
                          </div>
                          {sub?.note && <p className="text-xs text-[var(--color-text)] mt-1">“{sub.note}”</p>}
                          {sub?.teacher_comment && (
                            <p className="text-xs text-[var(--color-text-muted)] mt-1">
                              <span className="font-bold">Komentar guru: </span>{sub.teacher_comment}
                            </p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </section>
            </div>

            <div className="space-y-4">
              <section className="p-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)]">
                <h3 className="text-sm font-black text-[var(--color-text)] mb-2">Ringkasan</h3>
                <dl className="text-xs space-y-1.5">
                  <div className="flex justify-between gap-2">
                    <dt className="text-[var(--color-text-muted)]">Siswa</dt>
                    <dd className="font-bold text-[var(--color-text)] text-right">{suspension.student?.name}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-[var(--color-text-muted)]">Kelas</dt>
                    <dd className="font-bold text-[var(--color-text)] text-right">{suspension.student?.classes?.name || '-'}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-[var(--color-text-muted)]">Periode</dt>
                    <dd className="font-bold text-[var(--color-text)] text-right tabular-nums">{days.length} hari</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-[var(--color-text-muted)]">Log terkumpul</dt>
                    <dd className="font-bold text-[var(--color-text)] text-right tabular-nums">{logs.length}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-[var(--color-text-muted)]">Tautan aktif</dt>
                    <dd className="font-bold text-[var(--color-text)] text-right flex items-center gap-1">
                      <Link2 className="w-3.5 h-3.5" /> /skorsing/…
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-[var(--color-text-muted)]">Alasan (internal)</dt>
                    <dd className="font-bold text-[var(--color-text)] text-right max-w-[60%]">{suspension.reason_summary}</dd>
                  </div>
                </dl>
                <div className="mt-3 pt-3 border-t border-[var(--color-border)] flex gap-2">
                  <a
                    href="/tugas-skorsing"
                    className="flex-1 h-9 rounded-xl text-xs font-bold border border-[var(--color-border)] flex items-center justify-center gap-1.5 hover:bg-[var(--color-surface-alt)]"
                  >
                    <BookOpenCheck className="w-4 h-4" /> Tugas
                  </a>
                  <a
                    href={`https://wa.me/${String(suspension.student?.phone || '').replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 h-9 rounded-xl text-xs font-bold bg-emerald-600 text-white flex items-center justify-center gap-1.5"
                  >
                    <Phone className="w-4 h-4" /> Hubungi
                  </a>
                </div>
              </section>

              <section className="p-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)]">
                <FollowupTimeline items={followups} onAdd={addFollowup} onDelete={removeFollowup} />
              </section>
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  )
}
