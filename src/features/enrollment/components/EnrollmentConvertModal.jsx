import React, { useState, memo, useCallback } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faUsers, faSpinner, faCheck, faTimes, faUserGraduate,
    faSchool, faCalendarAlt, faIdCard
} from '@fortawesome/free-solid-svg-icons'
import { Modal } from '@shared/components'

const selectClass = "w-full px-3.5 h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-sm font-medium text-[var(--color-text)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all outline-none cursor-pointer"

function EnrollmentConvertModal({
    isOpen,
    onClose,
    enrollment,
    classes = [],
    onConvert,
    converting = false
}) {
    const [selectedClassId, setSelectedClassId] = useState('')
    const [touched, setTouched] = useState(false)

    const handleSubmit = useCallback(async (e) => {
        e.preventDefault()
        setTouched(true)
        if (!selectedClassId) return

        const success = await onConvert?.(enrollment, selectedClassId)
        if (success) {
            setSelectedClassId('')
            setTouched(false)
        }
    }, [enrollment, selectedClassId, onConvert])

    if (!isOpen || !enrollment) return null

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Konversi ke Siswa Aktif"
            description="Aktifkan santri baru ini sebagai siswa aktif di sistem sekolah"
            icon={faUserGraduate}
            iconBg="bg-indigo-500/10"
            iconColor="text-indigo-600"
            size="md"
            mobileVariant="bottom-sheet"
            footer={
                <div className="flex items-center justify-end gap-2 w-full">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={converting}
                        className="h-10 px-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50 shrink-0"
                    >
                        Batal
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={converting || !selectedClassId}
                        className="h-10 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
                    >
                        {converting ? (
                            <>
                                <FontAwesomeIcon icon={faSpinner} className="fa-spin" />
                                <span>Mengonversi...</span>
                            </>
                        ) : (
                            <>
                                <FontAwesomeIcon icon={faCheck} className="text-[10px]" />
                                <span>Konversi Sekarang</span>
                            </>
                        )}
                    </button>
                </div>
            }
        >
            <form onSubmit={handleSubmit} className="space-y-5">
                {/* Info Santri */}
                <div className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/30 space-y-3">
                    <span className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60 block">
                        Detail Pendaftar
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                        <div className="space-y-1">
                            <span className="text-[var(--color-text-muted)] block">Nama Lengkap</span>
                            <span className="font-bold text-[var(--color-text)] text-sm">{enrollment.name}</span>
                        </div>
                        <div className="space-y-1">
                            <span className="text-[var(--color-text-muted)] block">No Registrasi</span>
                            <span className="font-mono font-bold text-indigo-500 bg-indigo-500/5 px-2 py-0.5 rounded-lg border border-indigo-500/10 inline-block">
                                {enrollment.registration_number}
                            </span>
                        </div>
                        <div className="space-y-1">
                            <span className="text-[var(--color-text-muted)] block">Program Studi</span>
                            <span className="font-bold text-[var(--color-text)] uppercase">{enrollment.program}</span>
                        </div>
                        <div className="space-y-1">
                            <span className="text-[var(--color-text-muted)] block">Asal Sekolah</span>
                            <span className="font-bold text-[var(--color-text)]">{enrollment.school_origin || '-'}</span>
                        </div>
                    </div>
                </div>

                {/* Pilih Kelas */}
                <div className="space-y-2">
                    <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest ml-0.5">
                        Pilih Kelas Tujuan <span className="text-red-500 font-black">*</span>
                    </label>
                    <select
                        value={selectedClassId}
                        onChange={(e) => setSelectedClassId(e.target.value)}
                        className={`${selectClass} ${touched && !selectedClassId ? 'border-rose-500/50 focus:border-rose-500' : ''}`}
                        disabled={converting}
                    >
                        <option value="">-- Pilih Kelas --</option>
                        {classes.map((cls) => (
                            <option key={cls.id} value={cls.id}>
                                {cls.name} ({cls.homeroom_teacher || 'Belum ada Wali Kelas'})
                            </option>
                        ))}
                    </select>
                    {touched && !selectedClassId && (
                        <p className="text-[10px] text-rose-500 font-bold ml-1">Kelas tujuan wajib dipilih</p>
                    )}
                </div>

                {/* Info Tambahan */}
                <div className="p-3.5 border border-dashed border-indigo-500/20 bg-indigo-500/[0.01] rounded-2xl flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0">
                        <FontAwesomeIcon icon={faIdCard} className="text-xs" />
                    </div>
                    <div className="space-y-1">
                        <span className="text-[11px] font-bold text-[var(--color-text)] block">Penerbitan Kredensial Otomatis</span>
                        <p className="text-[10px] text-[var(--color-text-muted)] leading-relaxed font-medium">
                            Sistem akan secara otomatis menyalin data biodata santri dan wali, men-generate Nomor Registrasi siswa (*REG-XXXX-XXXX*) sebagai kode masuk, serta membuat PIN 4-digit acak untuk akses wali santri.
                        </p>
                    </div>
                </div>
            </form>
        </Modal>
    )
}

export default memo(EnrollmentConvertModal)
