import { Loader2 } from 'lucide-react'
import Modal from './Modal'

/**
 * ConfirmDialog — wrapper Modal dengan footer aksi standar (cancel + confirm).
 *
 * Props:
 *  - isOpen, onClose, onConfirm        : state & handlers
 *  - title, description                : teks header modal
 *  - icon, iconBg, iconColor           : ikon header
 *  - size, mobileVariant               : diteruskan ke Modal
 *  - confirmText                       : label tombol konfirmasi
 *  - confirmIcon                       : komponen icon Lucide untuk tombol konfirmasi
 *  - confirmClassName                  : override class tombol konfirmasi (opsional)
 *  - cancelText                        : label tombol batal
 *  - submitting                        : tampilkan spinner & disable tombol
 *  - children                          : konten body modal
 */
export default function ConfirmDialog({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    icon,
    iconBg = 'bg-red-500/10',
    iconColor = 'text-red-500',
    size = 'sm',
    mobileVariant = 'bottom-sheet',
    confirmText = 'Konfirmasi',
    confirmIcon: ConfirmIcon,
    confirmClassName,
    confirmDisabled = false,
    cancelText = 'Batal',
    submitting = false,
    children,
}) {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            description={description}
            icon={icon}
            iconBg={iconBg}
            iconColor={iconColor}
            size={size}
            mobileVariant={mobileVariant}
            footer={
                <div className="flex items-center w-full gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={submitting}
                        className="h-10 px-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] text-[10px] font-black uppercase tracking-widest transition-all shrink-0 disabled:opacity-50"
                    >
                        {cancelText}
                    </button>
 
                    <div className="flex-1" />
 
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={submitting || confirmDisabled}
                        className={
                            confirmClassName ||
                            'h-10 px-6 rounded-xl bg-red-500 hover:bg-red-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-500/20 transition-all flex items-center justify-center gap-2 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed'
                        }
                    >
                        {submitting ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : ConfirmIcon ? (
                            <ConfirmIcon className="w-3.5 h-3.5 opacity-70" />
                        ) : null}
                        {confirmText}
                    </button>
                </div>
            }
        >
            {children}
        </Modal>
    )
}
