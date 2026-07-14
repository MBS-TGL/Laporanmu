import { useState, useMemo } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faRotateLeft,
    faSpinner,
    faGraduationCap,
    faLayerGroup,
    faCheck,
    faSearch,
    faXmark,
    faCircleExclamation,
} from '@fortawesome/free-solid-svg-icons'
import Modal from '@shared/components/Modal'

export default function StudentResetPointsModal({
    isOpen,
    onClose,
    classesList = [],
    resetPointsClassId,
    setResetPointsClassId,
    resettingPoints,
    handleBatchResetPoints,
}) {
    const [resetPointsSearch, setResetPointsSearch] = useState('')

    const filteredResetClasses = useMemo(() => {
        return [...classesList]
            .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }))
            .filter(c => c.name.toLowerCase().includes(resetPointsSearch.toLowerCase()))
    }, [classesList, resetPointsSearch])

    const handleClose = () => {
        setResetPointsSearch('')
        onClose()
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title="Reset Poin Semester Baru"
            description="Set semua poin siswa ke 0 untuk semester/tahun ajaran baru."
            icon={faRotateLeft}
            iconBg="bg-orange-500/10"
            iconColor="text-orange-500"
            size="lg"
            mobileVariant="bottom-sheet"
            footer={
                <div className="flex items-center w-full gap-3">
                    <button
                        type="button"
                        onClick={handleClose}
                        className="h-10 px-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] text-[10px] font-black uppercase tracking-widest transition-all shrink-0"
                    >
                        Batal
                    </button>
                    <div className="flex-1" />
                    <button
                        type="button"
                        onClick={handleBatchResetPoints}
                        disabled={resettingPoints}
                        className="h-10 px-6 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-orange-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed shrink-0"
                    >
                        {resettingPoints ? (
                            <FontAwesomeIcon icon={faSpinner} className="fa-spin" />
                        ) : (
                            <>
                                <FontAwesomeIcon icon={faRotateLeft} className="text-[11px]" />
                                Reset Sekarang
                            </>
                        )}
                    </button>
                </div>
            }
        >
            <div className="space-y-4">
                <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] block mb-1 ml-1 flex items-center gap-2">
                        <FontAwesomeIcon icon={faGraduationCap} className="opacity-40" /> Pilih Kelas
                    </label>

                    <div className="space-y-3">
                        {/* Search Bar */}
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[var(--color-text-muted)] group-focus-within:text-[var(--color-primary)] transition-colors">
                                <FontAwesomeIcon icon={faSearch} className="text-[10px]" />
                            </div>
                            <input
                                type="text"
                                placeholder="Cari nama kelas atau gender..."
                                value={resetPointsSearch}
                                onChange={(e) => setResetPointsSearch(e.target.value)}
                                className="w-full h-10 pl-9 pr-4 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[11px] font-medium focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] transition-all outline-none"
                            />
                            {resetPointsSearch && (
                                <button
                                    type="button"
                                    onClick={() => setResetPointsSearch('')}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-[var(--color-text-muted)] hover:text-rose-500 transition-colors"
                                >
                                    <FontAwesomeIcon icon={faXmark} className="text-[10px]" />
                                </button>
                            )}
                        </div>

                        {/* Class List */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 py-1">
                            {/* Option: Semua Kelas (hidden when searching) */}
                            {!resetPointsSearch && (
                                <button
                                    type="button"
                                    onClick={() => setResetPointsClassId('')}
                                    className={`col-span-full p-2 rounded-xl border text-left flex items-center gap-2 transition-all hover:scale-[1.01] active:scale-95 group mb-1 ${resetPointsClassId === ''
                                            ? 'bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-500/20'
                                            : 'border-amber-500/30 bg-amber-500/5 text-amber-600 hover:bg-amber-500/10'
                                        }`}
                                >
                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${resetPointsClassId === '' ? 'bg-white/20 text-white' : 'bg-amber-500 text-white shadow-sm'
                                        }`}>
                                        <FontAwesomeIcon icon={faLayerGroup} className="text-xs" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-black text-[10px] uppercase tracking-wider leading-tight">Semua Kelas</p>
                                    </div>
                                    {resetPointsClassId === '' && <FontAwesomeIcon icon={faCheck} className="text-[10px] opacity-60" />}
                                </button>
                            )}

                            {/* Individual Class Options */}
                            {filteredResetClasses.map(c => (
                                <button
                                    key={c.id}
                                    type="button"
                                    onClick={() => setResetPointsClassId(c.id)}
                                    className={`p-2 rounded-xl border text-left flex items-center gap-2 transition-all hover:scale-[1.01] active:scale-95 group ${resetPointsClassId === c.id
                                            ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white shadow-lg shadow-[var(--color-primary)]/20'
                                            : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-surface-alt)]'
                                        }`}
                                >
                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${resetPointsClassId === c.id ? 'bg-white/20 text-white' : 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                                        }`}>
                                        <FontAwesomeIcon icon={faGraduationCap} className="text-xs" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-black text-[10px] uppercase tracking-wider leading-tight">{c.name}</p>
                                    </div>
                                    {resetPointsClassId === c.id && <FontAwesomeIcon icon={faCheck} className="text-[10px] opacity-60" />}
                                </button>
                            ))}

                            {/* Empty State */}
                            {filteredResetClasses.length === 0 && (
                                <div className="py-10 text-center space-y-2">
                                    <div className="w-10 h-10 rounded-full bg-[var(--color-surface-alt)] flex items-center justify-center mx-auto opacity-40">
                                        <FontAwesomeIcon icon={faSearch} className="text-xs" />
                                    </div>
                                    <p className="text-[11px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-40">
                                        Kelas tidak ditemukan
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Warning */}
                <div className="p-3 bg-red-500/5 rounded-2xl border border-red-500/10 text-[10px] text-red-600 dark:text-red-400 font-bold leading-relaxed">
                    <FontAwesomeIcon icon={faCircleExclamation} className="mr-2" />
                    Tindakan ini tidak bisa dibatalkan. Semua poin siswa akan direset ke 0 untuk rombongan kelas yang dipilih.
                </div>
            </div>
        </Modal>
    )
}
