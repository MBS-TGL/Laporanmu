import React, { memo } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faTriangleExclamation,
    faBoxArchive,
    faCircleExclamation,
    faTrash,
    faSpinner
} from '@fortawesome/free-solid-svg-icons'
import { Modal } from '@shared/components'

export const ArchiveModal = memo(function ArchiveModal({
    isOpen,
    onClose,
    selectedItem,
    onConfirm,
    submitting
}) {
    if (!selectedItem) return null

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Konfirmasi Arsip"
            description="Tahun akademik ini akan diarsipkan."
            icon={faBoxArchive}
            iconBg="bg-amber-500/10"
            iconColor="text-amber-600"
            size="sm"
            footer={
                <div className="flex gap-2.5">
                    <button type="button" onClick={onClose}
                        className="h-9 px-4 rounded-xl border border-[var(--color-border)] text-[10px] font-black text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-all">
                        Batal
                    </button>
                    <div className="flex-1" />
                    <button type="button" onClick={onConfirm} disabled={submitting}
                        className="h-9 px-5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-[10px] transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 disabled:opacity-50">
                        {submitting ? <FontAwesomeIcon icon={faSpinner} className="fa-spin text-[9px]" /> : <FontAwesomeIcon icon={faBoxArchive} className="text-[9px]" />}
                        {submitting ? 'Mengarsipkan...' : 'Arsipkan Sekarang'}
                    </button>
                </div>
            }
        >
            <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[11px] font-bold text-[var(--color-text-muted)] leading-relaxed shadow-sm">
                    Tahun Pelajaran <span className="px-2 py-0.5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] font-black mx-1 whitespace-nowrap">{selectedItem.name} {selectedItem.semester}</span> akan diarsipkan. Data tetap aman dan dapat dipulihkan kapan saja dari menu arsip.
                </div>
            </div>
        </Modal>
    )
})

export const DeactivateModal = memo(function DeactivateModal({
    isOpen,
    onClose,
    selectedItem,
    onConfirm,
    submitting
}) {
    if (!selectedItem) return null

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Nonaktifkan Periode"
            description="Sistem akan berjalan tanpa periode acuan aktif."
            icon={faTriangleExclamation}
            iconBg="bg-orange-500/10"
            iconColor="text-orange-600"
            size="sm"
            footer={
                <div className="flex gap-2.5">
                    <button type="button" onClick={onClose}
                        className="h-9 px-4 rounded-xl border border-[var(--color-border)] text-[10px] font-black text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-all">
                        Batal
                    </button>
                    <div className="flex-1" />
                    <button type="button" onClick={onConfirm} disabled={submitting}
                        className="h-9 px-5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-[10px] transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 disabled:opacity-50">
                        {submitting ? <FontAwesomeIcon icon={faSpinner} className="fa-spin text-[9px]" /> : <FontAwesomeIcon icon={faCircleExclamation} className="text-[9px]" />}
                        {submitting ? 'Memproses...' : 'Nonaktifkan Sekarang'}
                    </button>
                </div>
            }
        >
            <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[11px] font-bold text-[var(--color-text-muted)] leading-relaxed shadow-sm">
                    Nonaktifkan <span className="px-2 py-0.5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] font-black mx-1 whitespace-nowrap">{selectedItem.name} {selectedItem.semester}</span>? Seluruh sistem tidak akan memiliki tahun aktif sampai Anda mengaktifkan periode lain.
                </div>
            </div>
        </Modal>
    )
})
