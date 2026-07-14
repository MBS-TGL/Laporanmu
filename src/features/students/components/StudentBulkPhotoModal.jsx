import React, { useState, useMemo } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCamera, faCheck, faSpinner, faTrash, faCompress, faUser } from '@fortawesome/free-solid-svg-icons'
import Modal from '@shared/components/Modal'
import RichSelect from '@shared/components/RichSelect'

export default function StudentBulkPhotoModal({
    isOpen,
    onClose,
    uploadingBulkPhotos,
    bulkPhotoMatches,
    handleBulkPhotoMatch,
    handleBulkPhotoUpload,
    setBulkPhotoMatches,
    allStudentsForBulk = [],
    matchingPhotos = false,
}) {
    const [matchMethod, setMatchMethod] = useState('nisn')
    const [autoCompress, setAutoCompress] = useState(true)

    if (!isOpen) return null

    // Menghapus spesifik foto dari list preview (opsional jika foto salah cocok)
    const handleRemoveMatch = (index) => {
        setBulkPhotoMatches(prev => prev.filter((_, i) => i !== index))
    }

    // Manual match: user picks a student for an unmatched photo
    const handleManualMatch = (index, studentId) => {
        const student = allStudentsForBulk.find(s => s.id === studentId)
        if (!student) return
        setBulkPhotoMatches(prev => prev.map((item, i) =>
            i === index ? { ...item, studentId: student.id, studentName: student.name, status: 'matched' } : item
        ))
    }

    // Build RichSelect options with recommendation sorting per-item
    const buildStudentOptions = (fileName) => {
        const normalize = (str) => (str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
        const fileBase = normalize(fileName.replace(/\.[^.]+$/, ''))
        const fileWords = fileBase.split(/\s+/).filter(w => w.length > 0)

        // Score each student by similarity to the filename
        const scored = allStudentsForBulk.map(s => {
            const stdName = normalize(s.name)
            const stdWords = stdName.split(/\s+/).filter(w => w.length > 0)
            let score = 0
            if (stdName === fileBase) score = 100
            else if (stdName.includes(fileBase) || fileBase.includes(stdName)) score = 80
            else {
                const matchedWords = fileWords.filter(fw => stdWords.some(sw => sw.startsWith(fw) || fw.startsWith(sw)))
                score = fileWords.length > 0 ? Math.round((matchedWords.length / fileWords.length) * 60) : 0
            }
            return { id: s.id, name: s.name, icon: faUser, score }
        })

        // Sort: high-score (recommendations) first, then alphabetical
        return scored.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    }

    const methods = [
        { id: 'nisn', label: 'NISN', desc: 'Contoh: 0012345.jpg' },
        { id: 'name', label: 'Nama', desc: 'Contoh: Ahmad Muazza.png' },
        { id: 'code', label: 'ID/Reg', desc: 'Contoh: REG-ABCD.jpg' },
    ]

    const matchedCount = bulkPhotoMatches.filter(m => m.status === 'matched').length
    const unmatchedCount = bulkPhotoMatches.filter(m => m.status === 'unmatched').length

    // Format file size helper
    const formatSize = (bytes) => {
        if (bytes < 1024) return `${bytes} B`
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={() => { if (!uploadingBulkPhotos) onClose() }}
            title="Bulk Match Foto Siswa"
            description="Unggah banyak foto sekaligus. Sistem akan mencocokkan nama file dengan data siswa secara otomatis."
            icon={faCamera}
            iconBg="bg-indigo-500/10"
            iconColor="text-indigo-600"
            size="lg"
            mobileVariant="bottom-sheet"
            footer={
                <div className="flex items-center w-full gap-3">
                    <button 
                        onClick={() => { if (!uploadingBulkPhotos) onClose() }} 
                        disabled={uploadingBulkPhotos}
                        className="h-10 px-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] text-[10px] font-black uppercase tracking-widest hover:bg-[var(--color-surface-alt)] transition-all flex items-center justify-center shrink-0"
                    >
                        {bulkPhotoMatches.length > 0 ? 'Batal' : 'Tutup'}
                    </button>

                    <div className="flex-1" />

                    {bulkPhotoMatches.length > 0 && (
                        <div className="flex items-center gap-3">
                            <p className="hidden md:block text-[10px] font-bold text-[var(--color-text-muted)] animate-in fade-in duration-500">
                                Siap simpan: <span className="text-emerald-600 font-black px-1.5 py-0.5 bg-emerald-500/10 rounded border border-emerald-500/20">{matchedCount}</span>
                            </p>
                            <button
                                onClick={handleBulkPhotoUpload}
                                disabled={uploadingBulkPhotos || matchedCount === 0}
                                className="h-10 px-8 rounded-xl bg-[var(--color-primary)] text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-[var(--color-primary)]/20 hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed border border-white/10"
                            >
                                {uploadingBulkPhotos ? <><FontAwesomeIcon icon={faSpinner} className="fa-spin" /> Mengupload...</> : <><FontAwesomeIcon icon={faCheck} /> Simpan Foto</>}
                            </button>
                        </div>
                    )}
                </div>
            }
        >
            <div className="space-y-5">
                {/* Match Method */}
                <div className="space-y-2">
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)] opacity-70">Metode Pencocokan</p>
                    <div className="flex p-1 bg-[var(--color-surface-alt)]/50 rounded-xl border border-[var(--color-border)]">
                        {methods.map(m => (
                            <button
                                key={m.id}
                                onClick={() => setMatchMethod(m.id)}
                                className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2
                                ${matchMethod === m.id ? 'bg-[var(--color-primary)] text-white shadow-md' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]'}
                                `}
                            >
                                <span className="truncate">{m.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Auto Compress Toggle */}
                <label className="flex items-center gap-3 p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/30 cursor-pointer hover:bg-[var(--color-surface-alt)]/60 transition-colors select-none">
                    <div className={`w-9 h-5 rounded-full relative transition-colors ${autoCompress ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'}`}>
                        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${autoCompress ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="text-[10px] font-black uppercase tracking-wider text-[var(--color-text)]">
                            <FontAwesomeIcon icon={faCompress} className="mr-1.5 text-[var(--color-primary)]" />
                            Auto Kompres Gambar
                        </div>
                        <div className="text-[9px] text-[var(--color-text-muted)] mt-0.5">Kompres ke max 800×800px, kualitas 70% (hemat storage)</div>
                    </div>
                </label>

                {/* Dropzone - compact when photos already loaded */}
                <div className={`border-2 border-dashed border-[var(--color-primary)]/30 bg-[var(--color-primary)]/5 flex flex-col items-center text-center group hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 transition-all cursor-pointer relative rounded-2xl overflow-hidden ${bulkPhotoMatches.length > 0 ? 'p-4' : 'p-8'}`}>
                    <input
                        type="file"
                        multiple
                        accept="image/*"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        onChange={(e) => handleBulkPhotoMatch(e.target.files, matchMethod, autoCompress)}
                        disabled={uploadingBulkPhotos || matchingPhotos}
                    />
                    {matchingPhotos ? (
                        <div className="flex items-center gap-3 py-1">
                            <FontAwesomeIcon icon={faSpinner} className="fa-spin text-lg text-[var(--color-primary)]" />
                            <span className="text-xs font-bold text-[var(--color-text-muted)]">Mencocokkan foto...</span>
                        </div>
                    ) : bulkPhotoMatches.length > 0 ? (
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center text-[var(--color-primary)] group-hover:scale-110 transition-transform shrink-0">
                                <FontAwesomeIcon icon={faCamera} className="text-sm" />
                            </div>
                            <div className="text-left">
                                <div className="text-xs font-black text-[var(--color-text)]">Tambah File Foto Lain</div>
                                <div className="text-[10px] text-[var(--color-text-muted)]">Klik atau drag foto ke sini</div>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="w-14 h-14 rounded-2xl bg-[var(--color-primary)]/10 flex items-center justify-center text-[var(--color-primary)] mb-4 group-hover:scale-110 transition-transform">
                                <FontAwesomeIcon icon={faCamera} className="text-2xl" />
                            </div>
                            <h4 className="text-sm font-black text-[var(--color-text)] mb-1">
                                Drag & Drop atau Pilih Foto Massal
                            </h4>
                            <p className="text-[11px] text-[var(--color-text-muted)] max-w-xs transition-all">
                                Pastikan nama file foto menggunakan <b>{methods.find(m => m.id === matchMethod).label}</b> siswa ({methods.find(m => m.id === matchMethod).desc})
                            </p>
                        </>
                    )}
                </div>

                {/* Results Table */}
                {bulkPhotoMatches.length > 0 && (
                    <div className="space-y-2">
                        {/* Stats Summary */}
                        <div className="flex items-center gap-2 text-[10px] font-bold">
                            <span className="text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">{matchedCount} Matched</span>
                            {unmatchedCount > 0 && <span className="text-amber-600 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">{unmatchedCount} Unmatched</span>}
                            <span className="text-[var(--color-text-muted)] ml-auto">{bulkPhotoMatches.length} total</span>
                        </div>

                        <div className="border border-[var(--color-border)] rounded-xl overflow-hidden bg-[var(--color-surface)] shadow-sm">
                            <div className="max-h-[35vh] overflow-auto scrollbar-none">
                                <table className="w-full text-[11px]">
                                    <thead className="bg-[var(--color-surface-alt)] sticky top-0 z-10 border-b border-[var(--color-border)]">
                                        <tr className="text-left font-black uppercase tracking-widest text-[var(--color-text-muted)]">
                                            <th className="p-3 w-14 text-center">Foto</th>
                                            <th className="p-3">Nama File</th>
                                            <th className="p-3">Siswa Cocok</th>
                                            <th className="p-3 text-center">Status</th>
                                            <th className="p-3 w-10 text-center"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--color-border)]">
                                        {bulkPhotoMatches.map((item, i) => (
                                            <tr key={i} className="hover:bg-[var(--color-surface-alt)]/50 transition-colors group" style={{ contentVisibility: 'auto', containIntrinsicSize: '0 56px' }}>
                                                <td className="p-2 text-center">
                                                    <img
                                                        src={item.preview}
                                                        loading="lazy"
                                                        className="w-10 h-10 rounded-lg object-cover border border-[var(--color-border)] shadow-sm mx-auto bg-[var(--color-surface-alt)]"
                                                        alt=""
                                                    />
                                                </td>
                                                <td className="p-3">
                                                    <div className="font-medium opacity-70 truncate max-w-[120px]" title={item.file.name}>{item.originalFile?.name || item.file.name}</div>
                                                    {autoCompress && item.originalSize !== item.compressedSize && (
                                                        <div className="text-[8px] text-emerald-600 font-bold mt-0.5">
                                                            {formatSize(item.originalSize)} → {formatSize(item.compressedSize)}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="p-3">
                                                    {item.status === 'matched' ? (
                                                        <span className="font-bold text-[var(--color-text)] truncate block max-w-[150px]" title={item.studentName}>
                                                            {item.studentName}
                                                        </span>
                                                    ) : (
                                                        <RichSelect
                                                            compact
                                                            searchable
                                                            placeholder="Pilih siswa..."
                                                            value=""
                                                            options={buildStudentOptions(item.originalFile?.name || item.file.name)}
                                                            onChange={(studentId) => handleManualMatch(i, studentId)}
                                                            small
                                                        />
                                                    )}
                                                </td>
                                                <td className="p-3 text-center">
                                                    {item.status === 'matched' ? (
                                                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-black uppercase tracking-wider text-[8px] inline-flex items-center gap-1 border border-emerald-500/20">
                                                            Matched
                                                        </span>
                                                    ) : (
                                                        <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 font-black uppercase tracking-wider text-[8px] inline-flex items-center gap-1 border border-amber-500/20">
                                                            Unmatched
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="p-3 text-center">
                                                    <button
                                                        onClick={() => handleRemoveMatch(i)}
                                                        disabled={uploadingBulkPhotos}
                                                        className="w-7 h-7 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-colors opacity-50 group-hover:opacity-100 disabled:opacity-20 flex items-center justify-center mx-auto"
                                                        title="Hapus"
                                                    >
                                                        <FontAwesomeIcon icon={faTrash} className="text-[10px]" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    )
}
