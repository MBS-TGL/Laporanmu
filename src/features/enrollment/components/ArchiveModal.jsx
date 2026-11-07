import { Archive } from 'lucide-react'
import { ArchiveDataModal } from '@shared/components'
import { fmtRelative } from '@utils/formatters'
import { getProgramLabel } from '@features/enrollment/utils/enrollmentConstants'

/**
 * Wrapper arsip Pendaftar (PSB) di atas ArchiveDataModal (shared).
 * Logika DB (restore / hapus permanen) di-delegasikan ke handler dari
 * EnrollmentPage — wrapper hanya menyusun kolom & konfirmasi.
 */
export default function ArchiveModal({
    isOpen,
    onClose,
    archivedEnrollments,
    loadingArchived,
    handleRestoreEnrollment,
    handlePermanentDeleteEnrollment,
}) {
    const columns = [
        {
            key: 'program',
            header: 'Program',
            align: 'center',
            render: (e) => (
                <span className="font-bold bg-[var(--color-primary)]/10 text-[var(--color-primary)] px-1.5 py-0.5 rounded-md border border-[var(--color-primary)]/20 whitespace-nowrap">
                    {getProgramLabel(e.program)}
                </span>
            ),
        },
        {
            key: 'deleted_at',
            header: 'Diarsipkan',
            align: 'center',
            render: (e) => <span className="font-medium text-[var(--color-text-muted)] whitespace-nowrap">{fmtRelative(e.metadata?.deleted_at)}</span>,
        },
    ]

    return (
        <ArchiveDataModal
            isOpen={isOpen}
            onClose={onClose}
            title="Arsip Pendaftar"
            description="Kelola dan pulihkan data calon santri yang telah diarsipkan."
            rows={archivedEnrollments}
            loading={loadingArchived}
            entityLabel="pendaftar"
            nameKey="name"
            nameHeader="Calon Santri"
            secondaryKey="registration_number"
            dangerNote="akan dihapus secara permanen dari database"
            columns={columns}
            onRestore={handleRestoreEnrollment}
            onPermanentDelete={handlePermanentDeleteEnrollment}
        />
    )
}
