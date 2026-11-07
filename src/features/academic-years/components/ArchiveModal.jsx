import { supabase } from '@lib/supabase'
import { ArchiveDataModal } from '@shared/components'
import { fmtRelative } from '@utils/formatters'

/**
 * Wrapper arsip Tahun Pelajaran di atas ArchiveDataModal (shared).
 * Nama tampilan = name + semester; toast sukses menyertakan keduanya.
 */
export default function ArchiveModal({
    isOpen,
    onClose,
    archivedYears,
    loadingArchived,
    setArchivedYears,
    fetchData,
    addToast
}) {
    const handleRestore = async (year) => {
        const { error } = await supabase.from('academic_years').update({ deleted_at: null }).eq('id', year.id)
        if (error) throw error
        addToast(`${year.name} ${year.semester} berhasil dipulihkan`, 'success')
    }

    const handlePermanentDelete = async (year) => {
        const { error } = await supabase.from('academic_years').delete().eq('id', year.id)
        if (error) throw error
    }

    const handleRemoved = (year) => {
        setArchivedYears(prev => prev.filter(y => y.id !== year.id))
    }

    return (
        <ArchiveDataModal
            isOpen={isOpen}
            onClose={onClose}
            title="Arsip Tahun Pelajaran"
            description="Kelola dan pulihkan periode yang telah dihapus sementara."
            rows={archivedYears}
            loading={loadingArchived}
            entityLabel="periode"
            nameKey="name"
            nameHeader="Periode"
            nameRender={(y) => `${y.name} ${y.semester}`}
            dangerNote="beserta seluruh data yang terikat periode ini akan dihapus secara permanen"
            columns={[
                {
                    key: 'deleted_at',
                    header: 'Diarsipkan',
                    align: 'center',
                    render: (y) => <span className="font-medium text-[var(--color-text-muted)] whitespace-nowrap">{fmtRelative(y.deleted_at)}</span>,
                },
            ]}
            onRestore={handleRestore}
            onPermanentDelete={handlePermanentDelete}
            onRemoved={handleRemoved}
            fetchData={fetchData}
        />
    )
}
