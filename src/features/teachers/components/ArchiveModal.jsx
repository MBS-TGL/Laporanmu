import { Archive } from 'lucide-react'
import { supabase } from '@lib/supabase'
import { ArchiveDataModal } from '@shared/components'
import { fmtRelative } from '@utils/formatters'

/**
 * Wrapper arsip Guru di atas ArchiveDataModal (shared).
 * Logika DB (restore / cleanup FK + hapus permanen) milik fitur ini:
 * hapus permanen guru men-nullify wali kelas & membersihkan log terkait.
 */
export default function ArchiveModal({
    isOpen,
    onClose,
    archivedTeachers,
    loadingArchived,
    setArchivedTeachers,
    fetchData,
    fetchStats,
    addToast
}) {
    const handleRestore = async (teacher) => {
        const { error } = await supabase.from('teachers').update({ deleted_at: null }).eq('id', teacher.id)
        if (error) throw error
        addToast(`${teacher.name} berhasil dipulihkan`, 'success')
    }

    const handlePermanentDelete = async (teacher) => {
        // Nullify homeroom_teacher_id in classes
        await supabase.from('classes').update({ homeroom_teacher_id: null }).eq('homeroom_teacher_id', teacher.id)

        // Delete logs
        await supabase.from('teacher_attendance').delete().eq('teacher_id', teacher.id)
        await supabase.from('gate_logs').delete().eq('teacher_id', teacher.id)

        const { data, error } = await supabase.from('teachers').delete().eq('id', teacher.id).select()
        if (error) throw error
        if (!data || data.length === 0) {
            throw new Error('Penghapusan ditolak oleh database.')
        }
    }

    const handleRemoved = (teacher) => {
        setArchivedTeachers(prev => prev.filter(t => t.id !== teacher.id))
    }

    return (
        <ArchiveDataModal
            isOpen={isOpen}
            onClose={onClose}
            title="Arsip Guru"
            description="Kelola dan pulihkan data guru yang telah dihapus sementara."
            rows={archivedTeachers}
            loading={loadingArchived}
            entityLabel="guru"
            nameKey="name"
            secondaryKey="nbm"
            secondaryFallback="Tanpa NBM"
            dangerNote="beserta semua relasi (absen, log gerbang) akan dihapus secara permanen"
            columns={[
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
                    render: (t) => <span className="font-medium text-[var(--color-text-muted)] whitespace-nowrap">{fmtRelative(t.deleted_at)}</span>,
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
