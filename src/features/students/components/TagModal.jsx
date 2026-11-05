import React, { useRef, useEffect, memo, useState } from 'react'
import { Check, CircleCheck, Info, Pen, Tags, Trash2, X } from 'lucide-react'
import Modal from '@shared/components/Modal'
import ConfirmDialog from '@shared/components/ConfirmDialog'
import { AvailableTags } from '@features/students/utils/studentsConstants'

/**
 * TagModal Component
 * Handles individual student tag management with a global tag library.
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Modal open state
 * @param {function} props.onClose - Function to close modal
 * @param {Object} props.student - The student object being tagged
 * @param {Array} props.allUsedTags - All tags currently used in the database
 * @param {function} props.handleToggleTag - Function to add/remove tag from student
 * @param {string|null} props.tagToEdit - Tag currently being renamed
 * @param {function} props.setTagToEdit - Set which tag to rename
 * @param {string} props.renameInput - Current value of rename input
 * @param {function} props.setRenameInput - Update rename input value
 * @param {function} props.handleGlobalRenameTag - Function to rename tag globally
 * @param {function} props.handleGlobalDeleteTag - Function to delete tag globally
 */
const TagModal = ({
    isOpen,
    onClose,
    student,
    allUsedTags,
    handleToggleTag,
    tagToEdit,
    setTagToEdit,
    renameInput,
    setRenameInput,
    handleGlobalRenameTag,
    handleGlobalDeleteTag,
}) => {
    const tagInputRef = useRef(null)
    const [confirmDeleteTag, setConfirmDeleteTag] = useState(null)

    // Sync input ref with modal visibility
    useEffect(() => {
        if (isOpen && tagInputRef.current) {
            // Delay focus slightly to ensure modal animation doesn't interfere
            const timer = setTimeout(() => {
                tagInputRef.current?.focus({ preventScroll: true })
            }, 300)
            return () => clearTimeout(timer)
        }
    }, [isOpen])

    if (!student && !isOpen) return null

    const studentTags = student?.tags || []
    const dbTags = Array.from(new Set([...AvailableTags, ...allUsedTags])).sort()

    return (
        <>
            <Modal
                isOpen={isOpen}
                onClose={onClose}
                title={`Kelola Label — ${student?.name || ''}`}
                description="Atur pengelompokan siswa dengan sistem label dinamis."
                icon={Tags}
                iconBg="bg-violet-500/10"
                iconColor="text-violet-600"
                size="md"
                mobileVariant="bottom-sheet"
                footer={
                <div className="flex items-center w-full gap-3">
                    <button
                        onClick={onClose}
                        className="h-9 px-5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] text-xs font-bold uppercase tracking-wide leading-none whitespace-nowrap transition-colors shrink-0"
                    >
                        Tutup
                    </button>
                    <div className="flex-1" />
                    <button
                        onClick={onClose}
                        className="h-9 px-6 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white text-xs font-bold uppercase tracking-wide leading-none whitespace-nowrap shadow-sm transition-colors flex items-center justify-center gap-2 shrink-0"
                    >
                        <CircleCheck className="w-4 h-4 opacity-80" />
                        Selesai & Simpan
                    </button>
                </div>
                }
            >
                <div className="space-y-5 py-2">
                    {student && (
                        <div className="space-y-6">
                            {/* Section: Quick Add */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2.5 px-1">
                                    <div className="w-1 h-3.5 bg-[var(--color-primary)] rounded-full" />
                                    <span className="text-xs font-bold uppercase tracking-wide text-[var(--color-text)]">Cari atau Buat Baru</span>
                                    <div className="h-[1px] flex-1 bg-gradient-to-r from-[var(--color-border)] to-transparent opacity-40" />
                                </div>
                                <div className="relative group">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] opacity-40 group-focus-within:text-[var(--color-primary)] group-focus-within:opacity-100 transition-all">
                                        <Tags className="w-4 h-4" />
                                    </div>
                                    <input
                                        type="text"
                                        ref={tagInputRef}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && tagInputRef.current.value.trim()) {
                                                handleToggleTag(student, tagInputRef.current.value.trim());
                                                tagInputRef.current.value = '';
                                            }
                                        }}
                                        placeholder="Ketik nama label lalu tekan Enter..."
                                        className="w-full h-12 bg-[var(--color-surface-alt)]/50 border border-[var(--color-border)] rounded-2xl pl-12 pr-28 text-sm font-bold focus:bg-white focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/5 transition-all outline-none placeholder:font-medium placeholder:opacity-30"
                                    />
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                        <button
                                            onClick={() => {
                                                if (tagInputRef.current?.value.trim()) {
                                                    handleToggleTag(student, tagInputRef.current.value.trim());
                                                    tagInputRef.current.value = '';
                                                }
                                            }}
                                            className="h-8 px-4 rounded-xl bg-[var(--color-primary)] text-white text-xs font-bold uppercase tracking-wide hover:bg-[var(--color-primary-dark)] active:scale-95 transition-all shadow-sm"
                                        >
                                            Tambah
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Section: Active Tags */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2.5 px-1">
                                    <div className="w-1 h-3.5 bg-success rounded-full" />
                                    <span className="text-xs font-bold uppercase tracking-wide text-[var(--color-text)]">Label Tersemat</span>
                                    <div className="h-[1px] flex-1 bg-gradient-to-r from-[var(--color-border)] to-transparent opacity-40" />
                                </div>
                                <div className="flex flex-wrap gap-2.5 p-4 rounded-3xl bg-success/5 border border-success/10 min-h-[70px] content-start transition-all relative">
                                    <div className="absolute -top-3 right-6">
                                        <span className="text-xs font-bold text-success bg-white px-3 py-1 rounded-full ring-1 ring-success/20 uppercase tracking-tighter shadow-md">
                                            {studentTags.length} - Aktif
                                        </span>
                                    </div>
                                    {studentTags.length === 0 ? (
                                        <div className="w-full py-2 flex flex-col items-center justify-center opacity-30">
                                            <Tags className="w-4 h-4 mb-1 text-[var(--color-text-muted)]" />
                                            <span className="text-xs font-bold uppercase tracking-wide">Belum ada label</span>
                                        </div>
                                    ) : (
                                        studentTags.map(tag => (
                                            <button
                                                key={tag}
                                                onClick={() => handleToggleTag(student, tag)}
                                                className="group flex items-center gap-2 pl-3 pr-2 py-1.5 bg-white border border-[var(--color-border)] rounded-full text-xs font-bold text-[var(--color-text)] shadow-sm hover:border-danger hover:text-danger hover:bg-danger/5 transition-all active:scale-95"
                                            >
                                                <span className="opacity-70 group-hover:hidden text-success">#</span>
                                                {tag}
                                                <div className="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-danger/10 transition-colors">
                                                    <X className="w-4 h-4" />
                                                </div>
                                            </button>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Section: Global Library */}
                            <div className="space-y-4 pt-2">
                                <div className="flex items-center gap-2.5 px-1">
                                    <div className="w-1 h-3.5 bg-violet-500 rounded-full" />
                                    <span className="text-xs font-bold uppercase tracking-wide text-[var(--color-text)]">Katalog Label Global</span>
                                    <div className="h-[1px] flex-1 bg-gradient-to-r from-[var(--color-border)] to-transparent opacity-40" />
                                </div>

                                <div className="flex flex-wrap gap-2 max-h-[200px] overflow-y-auto pr-1 custom-scrollbar content-start p-1">
                                    {dbTags.map(tag => {
                                        const isActive = studentTags.includes(tag);
                                        const isEditing = tagToEdit === tag;

                                        if (isEditing) {
                                            return (
                                                <div key={tag} className="flex items-center rounded-full border-2 border-violet-500 bg-white shadow-xl animate-in zoom-in-95 duration-200 overflow-hidden">
                                                    <input
                                                        autoFocus
                                                        type="text"
                                                        value={renameInput}
                                                        onChange={e => setRenameInput(e.target.value)}
                                                        className="w-32 pl-4 pr-2 py-1.5 text-xs font-bold text-violet-700 outline-none bg-transparent"
                                                        onKeyDown={e => {
                                                            if (e.key === 'Enter') handleGlobalRenameTag(tag, renameInput)
                                                            if (e.key === 'Escape') setTagToEdit(null)
                                                        }}
                                                    />
                                                    <div className="flex items-center border-l border-violet-100 bg-violet-50/50">
                                                        <button
                                                            onClick={() => handleGlobalRenameTag(tag, renameInput)}
                                                            className="w-8 h-8 flex items-center justify-center text-success hover:bg-success hover:text-white transition-all"
                                                            title="Simpan"
                                                        >
                                                            <Check className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => setTagToEdit(null)}
                                                            className="w-8 h-8 flex items-center justify-center text-danger/70 hover:bg-danger hover:text-white transition-all"
                                                            title="Batal"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            )
                                        }

                                        return (
                                            <div key={tag} className="group relative">
                                                <div className={`flex items-center gap-0 rounded-full border transition-all duration-300 shadow-sm overflow-hidden ${isActive
                                                    ? 'bg-[var(--color-primary)] border-[var(--color-primary)] shadow-lg'
                                                    : 'bg-white border-[var(--color-border)] hover:border-[var(--color-primary)]/50'
                                                    }`}>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleToggleTag(student, tag)}
                                                        className={`flex-1 flex items-center gap-2 pl-4 pr-3 py-2 text-xs font-bold transition-all ${isActive ? 'text-white' : 'text-[var(--color-text-muted)] hover:text-[var(--color-primary)]'
                                                            }`}
                                                    >
                                                        <div className="shrink-0 flex items-center justify-center">
                                                            {isActive ? (
                                                                <Check className="w-4 h-4" />
                                                            ) : (
                                                                <div className="w-1.5 h-1.5 rounded-full bg-slate-200 group-hover:bg-[var(--color-primary)]/40 transition-colors" />
                                                            )}
                                                        </div>
                                                        <span className="truncate">{tag}</span>
                                                    </button>

                                                    <div className="flex items-center w-0 group-hover:w-16 transition-all duration-300 opacity-0 group-hover:opacity-100 overflow-hidden border-l border-transparent group-hover:border-white/20 group-hover:bg-black/5 shrink-0">
                                                        <button
                                                            type="button"
                                                            onClick={(e) => { e.stopPropagation(); setTagToEdit(tag); setRenameInput(tag) }}
                                                            className={`w-8 h-8 flex items-center justify-center transition-colors ${isActive ? 'text-white/70 hover:text-white' : 'text-blue-500 hover:bg-blue-50'}`}
                                                            title="Ubah Nama"
                                                        >
                                                            <Pen className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => { e.stopPropagation(); setConfirmDeleteTag(tag) }}
                                                            className={`w-8 h-8 flex items-center justify-center transition-colors ${isActive ? 'text-white/70 hover:text-white' : 'text-danger hover:bg-danger/10'}`}
                                                            title="Hapus Global"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>

                                <div className="p-3 rounded-xl bg-blue-50/50 border border-blue-100 flex items-start gap-3 mt-2">
                                    <Info className="w-4 h-4 text-blue-500 mt-0.5 opacity-60" />
                                    <p className="text-xs text-blue-700 font-medium leading-relaxed">
                                        Klik label untuk menyematkan ke siswa. Gunakan ikon <Pen className="w-4 h-4 text-blue-500 mx-0.5" /> untuk ubah nama atau <X className="w-4 h-4 text-danger mx-0.5" /> untuk hapus global.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </Modal>

            {/* Global Tag Delete Confirmation */}
            <ConfirmDialog
                isOpen={!!confirmDeleteTag}
                onClose={() => setConfirmDeleteTag(null)}
                onConfirm={async () => {
                    const tag = confirmDeleteTag;
                    setConfirmDeleteTag(null);
                    await handleGlobalDeleteTag(tag, true);
                }}
                title="Konfirmasi Hapus Label"
                description="Label akan dihapus secara permanen dari database sistem."
                icon={Trash2}
                confirmText="Hapus Global"
                confirmIcon={Trash2}
            >
                <div className="py-2">
                    <p className="text-xs text-[var(--color-text-muted)] leading-relaxed font-bold">
                        Label <span className="px-2 py-0.5 rounded-md bg-danger/10 text-danger font-bold border border-danger/20 mx-1">#{confirmDeleteTag}</span> akan dihapus dari seluruh data siswa.
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)] font-medium mt-3 leading-relaxed">
                        Tindakan ini akan membersihkan label tersebut secara permanen dari database. Data siswa lainnya tidak akan terpengaruh.
                    </p>
                </div>
            </ConfirmDialog>
        </>
    )
}

export default memo(TagModal)
