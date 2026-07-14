import React, { useRef, useEffect, memo, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faTags,
    faCheckCircle,
    faXmark,
    faCheck,
    faPen,
    faTrash,
    faCircleInfo,
} from '@fortawesome/free-solid-svg-icons'
import Modal from '@shared/components/Modal'
import { AvailableTags } from '@features/students/utils/studentsConstants'

/**
 * StudentTagModal Component
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
const StudentTagModal = ({
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
                tagInputRef.current?.focus()
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
                icon={faTags}
                iconBg="bg-violet-500/10"
                iconColor="text-violet-600"
                size="md"
                mobileVariant="bottom-sheet"
                footer={
                    <div className="flex items-center w-full gap-3">
                        <button
                            onClick={onClose}
                            className="h-10 px-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] text-[10px] font-black uppercase tracking-widest hover:bg-[var(--color-surface-alt)] transition-all flex items-center justify-center shrink-0"
                        >
                            Tutup
                        </button>
                        <div className="flex-1" />
                        <button
                            onClick={onClose}
                            className="h-10 px-8 rounded-xl bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-600/20 hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 border border-white/10 shrink-0"
                        >
                            <FontAwesomeIcon icon={faCheckCircle} className="text-xs opacity-80" />
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
                                    <div className="w-1 h-3.5 bg-indigo-500 rounded-full" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text)]">Cari atau Buat Baru</span>
                                    <div className="h-[1px] flex-1 bg-gradient-to-r from-[var(--color-border)] to-transparent opacity-40" />
                                </div>
                                <div className="relative group">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] opacity-40 group-focus-within:text-indigo-500 group-focus-within:opacity-100 transition-all">
                                        <FontAwesomeIcon icon={faTags} className="text-sm" />
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
                                        className="w-full h-12 bg-[var(--color-surface-alt)]/50 border border-[var(--color-border)] rounded-2xl pl-12 pr-28 text-sm font-bold focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all outline-none placeholder:font-medium placeholder:opacity-30"
                                    />
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                        <button
                                            onClick={() => {
                                                if (tagInputRef.current?.value.trim()) {
                                                    handleToggleTag(student, tagInputRef.current.value.trim());
                                                    tagInputRef.current.value = '';
                                                }
                                            }}
                                            className="h-8 px-4 rounded-xl bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-indigo-600/20"
                                        >
                                            Tambah
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Section: Active Tags */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2.5 px-1">
                                    <div className="w-1 h-3.5 bg-emerald-500 rounded-full" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text)]">Label Tersemat</span>
                                    <div className="h-[1px] flex-1 bg-gradient-to-r from-[var(--color-border)] to-transparent opacity-40" />
                                </div>
                                <div className="flex flex-wrap gap-2.5 p-4 rounded-3xl bg-emerald-500/5 border border-emerald-500/10 min-h-[70px] content-start transition-all relative">
                                    <div className="absolute -top-3 right-6">
                                        <span className="text-[10px] font-black text-emerald-600 bg-white px-3 py-1 rounded-full ring-1 ring-emerald-500/20 uppercase tracking-tighter shadow-md">
                                            {studentTags.length} - Aktif
                                        </span>
                                    </div>
                                    {studentTags.length === 0 ? (
                                        <div className="w-full py-2 flex flex-col items-center justify-center opacity-30">
                                            <FontAwesomeIcon icon={faTags} className="mb-1 text-sm text-[var(--color-text-muted)]" />
                                            <span className="text-[8px] font-bold uppercase tracking-widest">Belum ada label</span>
                                        </div>
                                    ) : (
                                        studentTags.map(tag => (
                                            <button
                                                key={tag}
                                                onClick={() => handleToggleTag(student, tag)}
                                                className="group flex items-center gap-2 pl-3 pr-2 py-1.5 bg-white border border-[var(--color-border)] rounded-full text-[11px] font-black text-[var(--color-text)] shadow-sm hover:border-red-500 hover:text-red-600 hover:bg-red-50 transition-all active:scale-95"
                                            >
                                                <span className="opacity-70 group-hover:hidden text-emerald-500">#</span>
                                                {tag}
                                                <div className="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-red-500/10 transition-colors">
                                                    <FontAwesomeIcon icon={faXmark} className="text-[8px]" />
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
                                    <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text)]">Katalog Label Global</span>
                                    <div className="h-[1px] flex-1 bg-gradient-to-r from-[var(--color-border)] to-transparent opacity-40" />
                                </div>

                                <div className="flex flex-wrap gap-2 max-h-[200px] overflow-y-auto pr-1 custom-scrollbar content-start p-1">
                                    {dbTags.map(tag => {
                                        const isActive = studentTags.includes(tag);
                                        const isEditing = tagToEdit === tag;

                                        if (isEditing) {
                                            return (
                                                <div key={tag} className="flex items-center rounded-full border-2 border-violet-500 bg-white shadow-xl shadow-violet-500/10 animate-in zoom-in-95 duration-200 overflow-hidden">
                                                    <input
                                                        autoFocus
                                                        type="text"
                                                        value={renameInput}
                                                        onChange={e => setRenameInput(e.target.value)}
                                                        className="w-32 pl-4 pr-2 py-1.5 text-[11px] font-black text-violet-700 outline-none bg-transparent"
                                                        onKeyDown={e => {
                                                            if (e.key === 'Enter') handleGlobalRenameTag(tag, renameInput)
                                                            if (e.key === 'Escape') setTagToEdit(null)
                                                        }}
                                                    />
                                                    <div className="flex items-center border-l border-violet-100 bg-violet-50/50">
                                                        <button
                                                            onClick={() => handleGlobalRenameTag(tag, renameInput)}
                                                            className="w-8 h-8 flex items-center justify-center text-emerald-600 hover:bg-emerald-500 hover:text-white transition-all"
                                                            title="Simpan"
                                                        >
                                                            <FontAwesomeIcon icon={faCheck} className="text-[8px]" />
                                                        </button>
                                                        <button
                                                            onClick={() => setTagToEdit(null)}
                                                            className="w-8 h-8 flex items-center justify-center text-red-400 hover:bg-red-500 hover:text-white transition-all"
                                                            title="Batal"
                                                        >
                                                            <FontAwesomeIcon icon={faXmark} className="text-[9px]" />
                                                        </button>
                                                    </div>
                                                </div>
                                            )
                                        }

                                        return (
                                            <div key={tag} className="group relative">
                                                <div className={`flex items-center gap-0 rounded-full border transition-all duration-300 shadow-sm overflow-hidden ${isActive
                                                    ? 'bg-[var(--color-primary)] border-[var(--color-primary)] shadow-lg shadow-[var(--color-primary)]/20'
                                                    : 'bg-white border-[var(--color-border)] hover:border-[var(--color-primary)]/50'
                                                    }`}>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleToggleTag(student, tag)}
                                                        className={`flex-1 flex items-center gap-2 pl-4 pr-3 py-2 text-[11px] font-black transition-all ${isActive ? 'text-white' : 'text-[var(--color-text-muted)] hover:text-[var(--color-primary)]'
                                                            }`}
                                                    >
                                                        <div className="shrink-0 flex items-center justify-center">
                                                            {isActive ? (
                                                                <FontAwesomeIcon icon={faCheck} className="text-[8px]" />
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
                                                            <FontAwesomeIcon icon={faPen} className="text-[7px]" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => { e.stopPropagation(); setConfirmDeleteTag(tag) }}
                                                            className={`w-8 h-8 flex items-center justify-center transition-colors ${isActive ? 'text-white/70 hover:text-white' : 'text-red-500 hover:bg-red-50'}`}
                                                            title="Hapus Global"
                                                        >
                                                            <FontAwesomeIcon icon={faXmark} className="text-[8px]" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>

                                <div className="p-3 rounded-xl bg-blue-50/50 border border-blue-100 flex items-start gap-3 mt-2">
                                    <FontAwesomeIcon icon={faCircleInfo} className="text-blue-500 text-[11px] mt-0.5 opacity-60" />
                                    <p className="text-[11px] text-blue-700 font-medium leading-relaxed">
                                        Klik label untuk menyematkan ke siswa. Gunakan ikon <FontAwesomeIcon icon={faPen} className="text-blue-500 mx-0.5" /> untuk ubah nama atau <FontAwesomeIcon icon={faXmark} className="text-red-500 mx-0.5" /> untuk hapus global.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </Modal>

            {/* Global Tag Delete Confirmation */}
            <Modal
                isOpen={!!confirmDeleteTag}
                onClose={() => setConfirmDeleteTag(null)}
                title="Konfirmasi Hapus Label"
                description="Label akan dihapus secara permanen dari database sistem."
                icon={faTrash}
                iconBg="bg-red-50"
                iconColor="text-red-500"
                size="sm"
                footer={
                    <div className="flex items-center w-full gap-3">
                        <button
                            onClick={() => setConfirmDeleteTag(null)}
                            className="h-10 px-5 rounded-xl border border-[var(--color-border)] text-[var(--color-text-muted)] text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center justify-center shrink-0"
                        >
                            Batal
                        </button>
                        <div className="flex-1" />
                        <button
                            onClick={async () => {
                                const tag = confirmDeleteTag;
                                setConfirmDeleteTag(null);
                                await handleGlobalDeleteTag(tag, true);
                            }}
                            className="h-10 px-6 rounded-xl bg-red-500 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-500/20 hover:bg-red-600 active:scale-95 transition-all flex items-center justify-center gap-2 shrink-0"
                        >
                            <FontAwesomeIcon icon={faTrash} className="text-[10px] opacity-80" />
                            Hapus Global
                        </button>
                    </div>
                }
            >
                <div className="py-2">
                    <p className="text-[11px] text-slate-500 leading-relaxed font-bold">
                        Label <span className="px-2 py-0.5 rounded-md bg-red-50 text-red-600 font-black border border-red-100 mx-1">#{confirmDeleteTag}</span> akan dihapus dari seluruh data siswa.
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium mt-3 leading-relaxed">
                        Tindakan ini akan membersihkan label tersebut secara permanen dari database. Data siswa lainnya tidak akan terpengaruh.
                    </p>
                </div>
            </Modal>
        </>
    )
}

export default memo(StudentTagModal)
