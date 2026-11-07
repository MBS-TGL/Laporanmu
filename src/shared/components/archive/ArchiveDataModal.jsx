import { useState } from 'react'
import { Archive, ChevronLeft, ChevronRight, LoaderCircle, RotateCcw, Trash2, TriangleAlert } from 'lucide-react'
import { Modal, EmptyState, DataTable } from '@shared/components'
import { useToast } from '@context'

/**
 * ArchiveDataModal — modal kelola arsip (soft-deleted rows) yang reusable:
 * banner count + loading + EmptyState + DataTable ter-paginasi (10/baris) +
 * aksi Pulihkan & overlay konfirmasi Hapus Permanen.
 *
 * Logika DB (restore / cleanup FK + delete) tetap di fitur lewat handler;
 * komponen menangani UX: loading state, konfirmasi, penghapusan baris dari
 * state parent, toast gagal, dan refetch data.
 *
 * Props:
 * - isOpen / onClose
 * - title / description / icon / iconBg / iconColor
 * - rows               : array arsip (dari state parent)
 * - loading            : true saat fetch arsip
 * - entityLabel        : 'guru' | 'kelas' | … untuk banner & empty state
 * - columns            : kolom DataTable (TANPA kolom aksi — ditambah otomatis)
 * - nameKey            : key nama untuk teks konfirmasi hapus (default 'name')
 * - nameHeader         : header kolom nama (default 'Nama')
 * - nameRender         : opsional (row) => string — tampilan nama kustom
 *                        (mis. `${y.name} ${y.semester}` untuk tahun pelajaran)
 * - secondaryKey       : opsional, baris ke-2 di bawah nama (mis. 'nbm', mono)
 * - secondaryFallback  : teks bila secondary kosong (default '—')
 * - dangerNote         : opsional, kalimat relasi yang ikut terhapus
 * - onRestore          : async (row) — DB + toast sukses milik fitur
 * - onPermanentDelete  : async (row) — cleanup FK + delete + toast sukses
 * - onRemoved          : (row) → hapus row dari state parent
 * - fetchData / fetchStats : refetch opsional setelah aksi sukses
 */
export default function ArchiveDataModal({
    isOpen, onClose,
    title, description,
    icon = Archive, iconBg = 'bg-amber-500/10', iconColor = 'text-amber-600',
    rows = [], loading = false,
    entityLabel = 'data',
    columns = [],
    nameKey = 'name',
    nameHeader = 'Nama',
    nameRender,
    secondaryKey,
    secondaryFallback = '—',
    dangerNote,
    onRestore, onPermanentDelete, onRemoved,
    fetchData, fetchStats,
}) {
    const { addToast } = useToast()
    const [page, setPage] = useState(1)
    const pageSize = 10
    const [deleteTarget, setDeleteTarget] = useState(null)
    const [deleting, setDeleting] = useState(false)
    const [restoring, setRestoring] = useState(false)

    if (!isOpen) return null

    const handleRestore = async (row) => {
        setRestoring(true)
        try {
            await onRestore(row)
            onRemoved?.(row)
            fetchData?.()
            fetchStats?.()
        } catch (err) {
            console.error('Restore error:', err)
            addToast('Gagal memulihkan', 'error')
        } finally {
            setRestoring(false)
        }
    }

    const confirmPermanentDelete = async () => {
        if (!deleteTarget) return
        setDeleting(true)
        try {
            await onPermanentDelete(deleteTarget)
            addToast(`${deleteTarget[nameKey]} dihapus permanen`, 'success')
            onRemoved?.(deleteTarget)
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

    const getName = (row) => (nameRender ? nameRender(row) : row[nameKey])

    const actionColumn = {
        key: 'actions',
        header: 'Aksi',
        align: 'right',
        render: (row) => (
            <div className="flex items-center justify-end gap-1.5">
                <button
                    onClick={() => handleRestore(row)}
                    disabled={restoring}
                    className="h-7 px-2.5 rounded-lg bg-success/10 text-success hover:bg-success hover:text-white border border-success/20 text-xs font-bold uppercase tracking-wide transition-all flex items-center gap-1 disabled:opacity-50"
                >
                    <RotateCcw className="w-4 h-4" />
                    Pulihkan
                </button>
                <button
                    onClick={() => setDeleteTarget(row)}
                    className="h-7 px-2.5 rounded-lg bg-danger/10 text-danger hover:bg-danger hover:text-white border border-danger/20 text-xs font-bold uppercase tracking-wide transition-all flex items-center gap-1"
                >
                    <Trash2 className="w-4 h-4" />
                    Hapus
                </button>
            </div>
        ),
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            description={description}
            icon={icon}
            iconBg={iconBg}
            iconColor={iconColor}
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

                {/* ====== OVERLAY KONFIRMASI HAPUS PERMANEN ====== */}
                <div
                    className={`absolute inset-0 z-20 bg-[var(--color-surface)] flex flex-col items-center justify-center gap-4 p-6 rounded-xl transition-all duration-300 ease-out ${deleteTarget ? 'opacity-100 visible scale-100' : 'opacity-0 invisible scale-95 pointer-events-none'}`}
                >
                    <div className="w-14 h-14 rounded-2xl bg-danger/10 border border-danger/20 flex items-center justify-center">
                        <TriangleAlert className="w-6 h-6 text-danger shrink-0" />
                    </div>
                    <div className="text-center max-w-xs">
                        <p className="text-sm font-bold text-[var(--color-text)] mb-1">Hapus Permanen?</p>
                        <p className="text-xs font-medium text-[var(--color-text-muted)] leading-relaxed">
                            Data <b className="text-danger">{deleteTarget ? getName(deleteTarget) : ''}</b> {dangerNote || 'akan dihapus secara permanen'}. Tindakan ini <b>tidak dapat dibatalkan</b>.
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
                            className="h-9 px-5 rounded-xl bg-danger hover:brightness-110 text-white text-xs font-bold uppercase tracking-wide transition-all shadow-lg disabled:opacity-50 flex items-center gap-2"
                        >
                            {deleting ? <><LoaderCircle className="w-4 h-4 animate-spin" /> Menghapus...</> : <><Trash2 className="w-4 h-4" /> Hapus Permanen</>}
                        </button>
                    </div>
                </div>

                {/* ====== BANNER ====== */}
                <div className="p-2.5 bg-amber-500/10 rounded-xl border border-amber-500/20 flex items-center gap-3">
                    <Archive className="w-5 h-5 text-amber-600 shrink-0" />
                    <div>
                        <p className="text-xs font-bold text-amber-700 dark:text-amber-400">{rows.length} {entityLabel} di arsip</p>
                        <p className="text-xs text-[var(--color-text-muted)] font-medium">Pulihkan untuk mengembalikan ke daftar aktif, atau hapus permanen.</p>
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-12 text-[var(--color-text-muted)]">
                        <LoaderCircle className="w-5 h-5 animate-spin mb-3" />
                        <p className="text-xs font-bold">Memuat arsip...</p>
                    </div>
                ) : rows.length === 0 ? (
                    <EmptyState
                        icon={Archive}
                        title="Arsip Kosong"
                        description={`Tidak ada data ${entityLabel} yang telah dihapus sementara saat ini.`}
                        variant="dashed"
                        color="amber"
                    />
                ) : (
                    <div className="space-y-3">
                        <DataTable
                            dense
                            data={rows.slice((page - 1) * pageSize, page * pageSize)}
                            columns={[
                                {
                                    key: 'name',
                                    header: nameHeader,
                                    render: (row) => (
                                        <>
                                            <p className="font-bold text-[var(--color-text)] leading-snug whitespace-nowrap">{getName(row)}</p>
                                            {secondaryKey && !nameRender && <p className="font-mono text-[var(--color-text-muted)]">{row[secondaryKey] || secondaryFallback}</p>}
                                        </>
                                    ),
                                },
                                ...columns,
                                actionColumn,
                            ]}
                        />

                        {/* Pagination Arsip */}
                        {rows.length > pageSize && (
                            <div className="flex items-center justify-between px-1">
                                <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wide">
                                    Halaman {page} dari {Math.ceil(rows.length / pageSize)}
                                </p>
                                <div className="flex gap-1.5">
                                    <button
                                        disabled={page === 1}
                                        onClick={() => setPage(p => p - 1)}
                                        className="w-7 h-7 rounded-lg border border-[var(--color-border)] flex items-center justify-center disabled:opacity-30 hover:bg-[var(--color-surface-alt)] shadow-sm transition-colors"
                                        aria-label="Halaman sebelumnya"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    <button
                                        disabled={page >= Math.ceil(rows.length / pageSize)}
                                        onClick={() => setPage(p => p + 1)}
                                        className="w-7 h-7 rounded-lg border border-[var(--color-border)] flex items-center justify-center disabled:opacity-30 hover:bg-[var(--color-surface-alt)] shadow-sm transition-colors"
                                        aria-label="Halaman berikutnya"
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
