import React, { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faBoxArchive,
    faChevronLeft,
    faChevronRight,
    faRotateLeft,
    faSpinner,
    faTrash,
    faTriangleExclamation
} from '@fortawesome/free-solid-svg-icons'
import { Modal, EmptyState } from '@shared/components'
import { getProgramLabel } from '@features/enrollment/utils/enrollmentConstants'

export default function EnrollmentArchiveModal({
    isOpen,
    onClose,
    archivedEnrollments,
    loadingArchived,
    fetchArchivedEnrollments,
    handleRestoreEnrollment,
    handlePermanentDeleteEnrollment,
    addToast
}) {
    const [archivePage, setArchivePage] = useState(1)
    const archivePageSize = 10

    const [deleteTarget, setDeleteTarget] = useState(null)
    const [deleting, setDeleting] = useState(false)
    const [restoring, setRestoring] = useState(false)

    if (!isOpen) return null

    const onRestore = async (enrollment) => {
        setRestoring(true)
        try {
            await handleRestoreEnrollment(enrollment)
        } finally {
            setRestoring(false)
        }
    }

    const confirmPermanentDelete = async () => {
        if (!deleteTarget) return
        setDeleting(true)
        try {
            await handlePermanentDeleteEnrollment(deleteTarget)
            setDeleteTarget(null)
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
            title="Arsip Pendaftar"
            description="Kelola dan pulihkan data calon santri yang telah diarsipkan."
            icon={faBoxArchive}
            iconBg="bg-amber-500/10"
            iconColor="text-amber-600"
            size="lg"
            mobileVariant="bottom-sheet"
            footer={
                <div className="flex items-center w-full">
                    <button
                        onClick={onClose}
                        className="h-10 px-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] text-[10px] font-black uppercase tracking-widest hover:bg-[var(--color-surface-alt)] transition-all flex items-center justify-center"
                    >
                        Tutup
                    </button>
                    <div className="flex-1" />
                </div>
            }
        >
            <div className="space-y-3 relative">

                {/* ====== DELETE CONFIRMATION OVERLAY ====== */}
                <div
                    className={`absolute inset-0 z-20 bg-[var(--color-surface)] flex flex-col items-center justify-center gap-4 p-6 rounded-xl transition-all duration-300 ease-out ${deleteTarget ? 'opacity-100 visible scale-100' : 'opacity-0 invisible scale-95 pointer-events-none'}`}
                >
                    <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                        <FontAwesomeIcon icon={faTriangleExclamation} className="text-red-500 text-2xl" />
                    </div>
                    <div className="text-center max-w-xs">
                        <p className="text-sm font-black text-[var(--color-text)] mb-1">Hapus Permanen?</p>
                        <p className="text-[11px] font-medium text-[var(--color-text-muted)] leading-relaxed">
                         Data calon santri <b className="text-red-500">{deleteTarget?.name}</b> akan dihapus secara permanen dari database. Tindakan ini <b>tidak dapat dibatalkan</b>.
                        </p>
                    </div>
                    <div className="flex items-center w-full max-w-xs gap-3 mt-2">
                        <button
                            onClick={() => setDeleteTarget(null)}
                            disabled={deleting}
                            className="h-10 px-5 rounded-xl bg-[var(--color-surface-alt)] font-black text-[10px] uppercase tracking-widest text-[var(--color-text-muted)] hover:bg-[var(--color-border)] transition-colors border border-[var(--color-border)] disabled:opacity-50 shrink-0"
                        >
                            Batal
                        </button>
                        <div className="flex-1" />
                        <button
                            onClick={confirmPermanentDelete}
                            disabled={deleting}
                            className="h-10 px-5 rounded-xl bg-red-500 hover:brightness-110 text-white text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-red-500/20 disabled:opacity-50 flex items-center justify-center gap-2 shrink-0"
                        >
                            {deleting ? <><FontAwesomeIcon icon={faSpinner} className="fa-spin" /> Menghapus...</> : <><FontAwesomeIcon icon={faTrash} /> Hapus Permanen</>}
                        </button>
                    </div>
                </div>

                {/* ====== MAIN CONTENT ====== */}
                <div className="p-2.5 bg-amber-500/10 rounded-xl border border-amber-500/20 flex items-center gap-3">
                    <FontAwesomeIcon icon={faBoxArchive} className="text-amber-600 text-base shrink-0" />
                    <div>
                        <p className="text-[11px] font-black text-amber-700 dark:text-amber-400">{archivedEnrollments.length} pendaftar di arsip</p>
                        <p className="text-[10px] text-[var(--color-text-muted)] font-medium">Pulihkan untuk mengembalikan ke daftar aktif seleksi, atau hapus permanen.</p>
                    </div>
                </div>

                {loadingArchived ? (
                    <div className="text-center py-12 text-[var(--color-text-muted)]">
                        <FontAwesomeIcon icon={faSpinner} className="fa-spin mb-3 text-xl" />
                        <p className="text-xs font-bold">Memuat arsip...</p>
                    </div>
                ) : archivedEnrollments.length === 0 ? (
                    <EmptyState
                        icon={faBoxArchive}
                        title="Arsip Kosong"
                        description="Tidak ada data pendaftaran yang diarsipkan saat ini."
                        variant="dashed"
                        color="amber"
                    />
                ) : (
                    <div className="space-y-3">
                        <div className="border border-[var(--color-border)] rounded-xl overflow-hidden bg-[var(--color-surface)] shadow-sm">
                            <table className="w-full text-xs">
                                <thead className="bg-[var(--color-surface-alt)] sticky top-0">
                                    <tr className="text-left text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] border-b border-[var(--color-border)]">
                                        <th className="px-3 py-2.5">Calon Santri</th>
                                        <th className="px-3 py-2.5 text-center whitespace-nowrap">Program</th>
                                        <th className="px-3 py-2.5 text-center whitespace-nowrap">Diarsipkan</th>
                                        <th className="px-3 py-2.5 text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {archivedEnrollments.slice((archivePage - 1) * archivePageSize, archivePage * archivePageSize).map(e => (
                                        <tr key={e.id} className="border-b last:border-0 border-[var(--color-border)] hover:bg-[var(--color-surface-alt)]/40 transition-colors">
                                            <td className="px-3 py-2.5">
                                                <p className="font-bold text-[var(--color-text)] text-xs leading-snug whitespace-nowrap">{e.name}</p>
                                                <p className="text-[9px] font-mono text-[var(--color-text-muted)]">{e.registration_number}</p>
                                            </td>
                                            <td className="px-3 py-2.5 text-center whitespace-nowrap">
                                                <span className="text-[9px] font-black bg-[var(--color-primary)]/10 text-[var(--color-primary)] px-1.5 py-0.5 rounded-md border border-[var(--color-primary)]/20">
                                                    {getProgramLabel(e.program)}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2.5 text-center text-[10px] font-medium text-[var(--color-text-muted)] whitespace-nowrap">
                                                {formatRelativeDate(e.metadata?.deleted_at)}
                                            </td>
                                            <td className="px-3 py-2.5 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button
                                                        onClick={() => onRestore(e)}
                                                        disabled={restoring}
                                                        className="h-7 px-2.5 rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white border border-emerald-500/20 text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1 disabled:opacity-50"
                                                    >
                                                        <FontAwesomeIcon icon={faRotateLeft} className="text-[8px]" />
                                                        Pulihkan
                                                    </button>
                                                    <button
                                                        onClick={() => setDeleteTarget(e)}
                                                        className="h-7 px-2.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/20 text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1"
                                                    >
                                                        <FontAwesomeIcon icon={faTrash} className="text-[8px]" />
                                                        Hapus
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Arsip */}
                        {archivedEnrollments.length > archivePageSize && (
                            <div className="flex items-center justify-between px-1">
                                <p className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">
                                    Halaman {archivePage} dari {Math.ceil(archivedEnrollments.length / archivePageSize)}
                                </p>
                                <div className="flex gap-1.5">
                                    <button
                                        disabled={archivePage === 1}
                                        onClick={() => setArchivePage(p => p - 1)}
                                        className="w-7 h-7 rounded-lg border border-[var(--color-border)] flex items-center justify-center disabled:opacity-30 hover:bg-[var(--color-surface-alt)] shadow-sm transition-colors"
                                    >
                                        <FontAwesomeIcon icon={faChevronLeft} className="text-[9px]" />
                                    </button>
                                    <button
                                        disabled={archivePage >= Math.ceil(archivedEnrollments.length / archivePageSize)}
                                        onClick={() => setArchivePage(p => p + 1)}
                                        className="w-7 h-7 rounded-lg border border-[var(--color-border)] flex items-center justify-center disabled:opacity-30 hover:bg-[var(--color-surface-alt)] shadow-sm transition-colors"
                                    >
                                        <FontAwesomeIcon icon={faChevronRight} className="text-[9px]" />
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
