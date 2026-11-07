import { supabase } from '@lib/supabase'
import { ArchiveDataModal } from '@shared/components'
import { fmtRelative } from '@utils/formatters'

/**
 * Wrapper arsip Kelas di atas ArchiveDataModal (shared).
 * Hapus permanen kelas: tanpa cleanup FK khusus (relasi siswa dilepas via
 * constraint/behavior database).
 */
export default function ArchiveModal({
    isOpen,
    onClose,
    archivedClasses,
    loadingArchived,
    setArchivedClasses,
    fetchData,
    fetchStats,
    addToast
}) {
    const handleRestore = async (cls) => {
        const { error } = await supabase.from('classes').update({ deleted_at: null }).eq('id', cls.id)
        if (error) throw error
        addToast(`${cls.name} berhasil dipulihkan`, 'success')
    }

    const handlePermanentDelete = async (cls) => {
        const { error } = await supabase.from('classes').delete().eq('id', cls.id)
        if (error) throw error
    }

    const handleRemoved = (cls) => {
        setArchivedClasses(prev => prev.filter(c => c.id !== cls.id))
    }

    return (
        <ArchiveDataModal
            isOpen={isOpen}
            onClose={onClose}
            title="Arsip Kelas"
            description="Kelola dan pulihkan data kelas yang telah dihapus sementara."
            rows={archivedClasses}
            loading={loadingArchived}
            entityLabel="kelas"
            nameKey="name"
            nameHeader="Kelas"
            secondaryKey="grade"
            secondaryFallback="—"
            columns={[
                {
                    key: 'major',
                    header: 'Program / Major',
                    align: 'center',
                    render: (c) => (
                        <span className="font-bold bg-[var(--color-primary)]/10 text-[var(--color-primary)] px-1.5 py-0.5 rounded-md border border-[var(--color-primary)]/20 whitespace-nowrap">{c.major || '—'}</span>
                    ),
                },
                {
                    key: 'deleted_at',
                    header: 'Diarsipkan',
                    align: 'center',
                    render: (c) => <span className="font-medium text-[var(--color-text-muted)] whitespace-nowrap">{fmtRelative(c.deleted_at)}</span>,
                },
            ]}
            onRestore={handleRestore}
            onPermanentDelete={handlePermanentDelete}
            onRemoved={handleRemoved}
            fetchData={fetchData}
            fetchStats={fetchStats}
        />
    )
}
