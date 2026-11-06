import React, { useState } from 'react'
import { Archive, ChevronLeft, ChevronRight, LoaderCircle, RotateCcw, Trash2, TriangleAlert } from 'lucide-react'
import { Modal, EmptyState, DataTable } from '@shared/components'
import { supabase } from '@lib/supabase'

export default function ArchiveModal({
    isOpen,
    onClose,
    archivedTeachers,
    loadingArchived,
    setArchivedTeachers,
    fetchArchivedTeachers,
    fetchData,
    fetchStats,
    addToast
}) {
    const [archivePage, setArchivePage] = useState(1)
    const archivePageSize = 10

    const [deleteTarget, setDeleteTarget] = useState(null)
    const [deleting, setDeleting] = useState(false)
    const [restoring, setRestoring] = useState(false)

    if (!isOpen) return null

    const handleRestoreTeacher = async (teacher) => {
        setRestoring(true)
        try {
            const { error } = await supabase.from('teachers').update({ deleted_at: null }).eq('id', teacher.id)
            if (error) throw error
            addToast(`${teacher.name} berhasil dipulihkan`, 'success')
            setArchivedTeachers(prev => prev.filter(t => t.id !== teacher.id))
            fetchData?.()
            fetchStats?.()
        } catch {
            addToast('Gagal memulihkan', 'error')
        } finally {
            setRestoring(false)
        }
    }

    const confirmPermanentDelete = async () => {
        if (!deleteTarget) return
        setDeleting(true)
        try {
            // Nullify homeroom_teacher_id in classes
            await supabase.from('classes').update({ homeroom_teacher_id: null }).eq('homeroom_teacher_id', deleteTarget.id)

            // Delete logs
            await supabase.from('teacher_attendance').delete().eq('teacher_id', deleteTarget.id)
            await supabase.from('gate_logs').delete().eq('teacher_id', deleteTarget.id)

            const { data, error } = await supabase.from('teachers').delete().eq('id', deleteTarget.id).select()

            if (error) throw error
            if (!data || data.length === 0) {
                throw new Error("Penghapusan ditolak oleh database.")
            }

            addToast(`${deleteTarget.name} dihapus permanen`, 'success')
            setArchivedTeachers(prev => prev.filter(t => t.id !== deleteTarget.id))
            setDeleteTarget(null)
            fetchData?.()
            fetchStats?.()
        } catch (err) {
            console.error('Delete error:', err)
            addToast(err.message || 'Gagal hapus permanen data', 'error')
        } finally {
            setDeleting(false)
        }
    }

    const formatRelativeDate = (dateString) => {
        if (!dateString) return '-'
        const date = new Date(dateString)
        const diff = new Date() - date
        const days = Math.floor(diff / (1000 * 60 * 60 * 24))
        if (days === 0) return 'Hari ini'
        if (days === 1) return 'Kemarin'
        if (days < 7) return `${days} hari lalu`
        if (days < 30) return `${Math.floor(days / 7)} minggu lalu`
        return `${Math.floor(days / 30)} bulan lalu`
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Arsip Guru"
            description="Kelola dan pulihkan data guru yang telah dihapus sementara."
            icon={Archive}
            iconBg="bg-amber-500/10"
            iconColor="text-amber-600"
            size="lg"
            mobileVariant="bottom-sheet"
            footer={
                <div className="flex items-center w-full">
                    <button
                        onClick={onClose}
                        className="h-10 px-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] text-xs font-bold uppercase tracking-wide hover:bg-[var(--color-surface-alt)] transition-all flex items-center justify-center"
                    >
                        Tutup
                    </button>
                    <div className="flex-1" />
                </div>
            }
        >
            <div className="space-y-3 relative">

                {/* ====== DELETE CONFIRMATION OVERLAY (slides in smoothly) ====== */}
                <div
                    className={`absolute inset-0 z-20 bg-[var(--color-surface)] flex flex-col items-center justify-center gap-4 p-6 rounded-xl transition-all duration-300 ease-out ${deleteTarget ? 'opacity-100 visible scale-100' : 'opacity-0 invisible scale-95 pointer-events-none'}`}
                >
                    <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                        <TriangleAlert className="w-6 h-6 text-red-500" />
                    </div>
                    <div className="text-center max-w-xs">
                        <p className="text-sm font-bold text-[var(--color-text)] mb-1">Hapus Permanen?</p>
                        <p className="text-xs font-medium text-[var(--color-text-muted)] leading-relaxed">
                            Data guru <b className="text-red-500">{deleteTarget?.name}</b> beserta semua relasi (absen, log gerbang) akan dihapus secara permanen. Tindakan ini <b>tidak dapat dibatalkan</b>.
                        </p>
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                        <button
                            onClick={() => setDeleteTarget(null)}
                            disabled={deleting}
                            className="h-9 px-5 rounded-xl bg-[var(--color-surface-alt)] font-bold text-xs uppercase tracking-wide text-[var(--color-text-muted)] hover:bg-[var(--color-border)] transition-colors border border-[var(--color-border)] disabled:opacity-50"
                        >
                            Batal
                        </button>
                        <button
                            onClick={confirmPermanentDelete}
                            disabled={deleting}
                            className="h-9 px-5 rounded-xl bg-red-500 hover:brightness-110 text-white text-xs font-bold uppercase tracking-wide transition-all shadow-lg disabled:opacity-50 flex items-center gap-2"
                        >
                            {deleting ? <><LoaderCircle className="w-4 h-4 animate-spin" /> Menghapus...</> : <><Trash2 className="w-4 h-4" /> Hapus Permanen</>}
                        </button>
                    </div>
                </div>

                {/* ====== MAIN CONTENT ====== */}
                <div className="p-2.5 bg-amber-500/10 rounded-xl border border-amber-500/20 flex items-center gap-3">
                    <Archive className="w-5 h-5 text-amber-600 shrink-0" />
                    <div>
                        <p className="text-xs font-bold text-amber-700 dark:text-amber-400">{archivedTeachers.length} guru di arsip</p>
                        <p className="text-xs text-[var(--color-text-muted)] font-medium">Pulihkan untuk mengembalikan ke daftar aktif, atau hapus permanen.</p>
                    </div>
                </div>

                {loadingArchived ? (
                    <div className="text-center py-12 text-[var(--color-text-muted)]">
                        <LoaderCircle className="w-5 h-5 animate-spin mb-3" />
                        <p className="text-xs font-bold">Memuat arsip...</p>
                    </div>
                ) : archivedTeachers.length === 0 ? (
                    <EmptyState
                        icon={Archive}
                        title="Arsip Kosong"
                        description="Tidak ada data guru yang telah dihapus sementara saat ini."
                        variant="dashed"
                        color="amber"
                    />
                ) : (
                    <div className="space-y-3">
                        <DataTable
                            dense
                            data={archivedTeachers.slice((archivePage - 1) * archivePageSize, archivePage * archivePageSize)}
                            columns={[
                                {
                                    key: 'name',
                                    header: 'Guru',
                                    render: (t) => (
                                        <>
                                            <p className="font-bold text-[var(--color-text)] leading-snug whitespace-nowrap">{t.name}</p>
                                            <p className="font-mono text-[var(--color-text-muted)]">{t.nbm || 'Tanpa NBM'}</p>
                                        </>
                                    ),
                                },
                                {
                                    key: 'subject',
                                    header: 'Mata Pelajaran',
                                    align: 'center',
                                    render: (t) => (
                                        <span className="font-bold bg-[var(--color-primary)]/10 text-[var(--color-primary)] px-1.5 py-0.5 rounded-md border border-[var(--color-primary)]/20 whitespace-nowrap">{t.subject || '—'}</span>
                                    ),
                                },
                                {
                                    key: 'deleted_at',
                                    header: 'Diarsipkan',
                                    align: 'center',
                                    render: (t) => <span className="font-medium text-[var(--color-text-muted)] whitespace-nowrap">{formatRelativeDate(t.deleted_at)}</span>,
                                },
                                {
                                    key: 'actions',
                                    header: 'Aksi',
                                    align: 'right',
                                    render: (t) => (
                                        <div className="flex items-center justify-end gap-1.5">
                                            <button
                                                onClick={() => handleRestoreTeacher(t)}
                                                disabled={restoring}
                                                className="h-7 px-2.5 rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white border border-emerald-500/20 text-xs font-bold uppercase tracking-wide transition-all flex items-center gap-1 disabled:opacity-50"
                                            >
                                                <RotateCcw className="w-4 h-4" />
                                                Pulihkan
                                            </button>
                                            <button
                                                onClick={() => setDeleteTarget(t)}
                                                className="h-7 px-2.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/20 text-xs font-bold uppercase tracking-wide transition-all flex items-center gap-1"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                                Hapus
                                            </button>
                                        </div>
                                    ),
                                },
                            ]}
                        />

                        {/* Pagination Arsip */}
                        {archivedTeachers.length > archivePageSize && (
                            <div className="flex items-center justify-between px-1">
                                <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wide">
                                    Halaman {archivePage} dari {Math.ceil(archivedTeachers.length / archivePageSize)}
                                </p>
                                <div className="flex gap-1.5">
                                    <button
                                        disabled={archivePage === 1}
                                        onClick={() => setArchivePage(p => p - 1)}
                                        className="w-7 h-7 rounded-lg border border-[var(--color-border)] flex items-center justify-center disabled:opacity-30 hover:bg-[var(--color-surface-alt)] shadow-sm transition-colors"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    <button
                                        disabled={archivePage >= Math.ceil(archivedTeachers.length / archivePageSize)}
                                        onClick={() => setArchivePage(p => p + 1)}
                                        className="w-7 h-7 rounded-lg border border-[var(--color-border)] flex items-center justify-center disabled:opacity-30 hover:bg-[var(--color-surface-alt)] shadow-sm transition-colors"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </Modal>
    )
}
