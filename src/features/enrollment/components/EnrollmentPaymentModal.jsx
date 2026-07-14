import React, { useState, useEffect, useRef } from 'react'
import { Modal } from '@shared/components'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faMoneyBillWave, faCheckCircle, faXmarkCircle, faClock,
    faExternalLinkAlt, faUpload, faSpinner, faCalendarAlt, faUserCheck, faUndo
} from '@fortawesome/free-solid-svg-icons'
import { supabase } from '@lib/supabase'

function PaymentRow({ type, label, amount, paymentInfo, onUpdateStatus, enrollment, submitting }) {
    const fileRef = useRef(null)
    const [uploading, setUploading] = useState(false)

    const status = paymentInfo?.status || 'belum'
    const proofUrl = paymentInfo?.proof_url || null
    const confirmedAt = paymentInfo?.confirmed_at || null
    const confirmedBy = paymentInfo?.confirmed_by || null

    const formatPrice = (val) => {
        return new Date().toLocaleDateString === undefined ? val : Number(val).toLocaleString('id-ID')
    }

    const formatDate = (dateStr) => {
        if (!dateStr) return ''
        return new Date(dateStr).toLocaleString('id-ID', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        })
    }

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return
        if (!file.type.startsWith('image/')) {
            alert('File harus berupa gambar!')
            return
        }
        if (file.size > 3 * 1024 * 1024) {
            alert('Ukuran file maksimal 3MB!')
            return
        }

        setUploading(true)
        try {
            const ext = file.name.split('.').pop()
            const path = `payment-proofs/${enrollment.id}-${type}-${Date.now()}.${ext}`

            // Uploading to standard bucket 'raport-mbs' under path
            const { error: uploadError } = await supabase.storage
                .from('raport-mbs')
                .upload(path, file, { upsert: true, contentType: file.type })

            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage.from('raport-mbs').getPublicUrl(path)
            
            // Set as pending or directly lunas when uploaded
            await onUpdateStatus(type, 'pending', publicUrl)
        } catch (err) {
            console.error('[PaymentRow] Upload error:', err)
            alert('Gagal mengupload bukti pembayaran: ' + err.message)
        } finally {
            setUploading(false)
            if (fileRef.current) fileRef.current.value = ''
        }
    }

    return (
        <div className="p-3.5 border border-[var(--color-border)] rounded-2xl bg-[var(--color-surface)] shadow-sm flex flex-col justify-between gap-3 transition-all hover:border-[var(--color-primary)]/20 hover:shadow-md">
            {/* Top row: Fee Label, Amount & Status */}
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60 leading-tight">{label}</p>
                    <div className="flex items-baseline gap-0.5 mt-1">
                        <span className="text-[10px] font-black text-[var(--color-text-muted)] opacity-55">Rp</span>
                        <span className="text-base font-black text-[var(--color-text)] tracking-tight tabular-nums">{formatPrice(amount)}</span>
                    </div>
                </div>

                <div className="shrink-0">
                    {status === 'lunas' && (
                        <span className="px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-1 shadow-sm">
                            <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></span> Lunas
                        </span>
                    )}
                    {status === 'pending' && (
                        <span className="px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest text-amber-600 bg-amber-500/10 border border-amber-500/20 flex items-center gap-1 shadow-sm animate-pulse">
                            <span className="w-1 h-1 rounded-full bg-amber-500 animate-pulse"></span> Pending
                        </span>
                    )}
                    {status === 'belum' && (
                        <span className="px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest text-[var(--color-text-muted)] bg-[var(--color-surface-alt)]/50 border border-[var(--color-border)] flex items-center gap-1 shadow-sm opacity-60">
                            <span className="w-1 h-1 rounded-full bg-slate-400"></span> Belum
                        </span>
                    )}
                </div>
            </div>

            {/* Middle Section: Premium Dashed Upload Box / Preview Area */}
            <div className="flex flex-col gap-2.5 p-3 rounded-2xl bg-[var(--color-surface-alt)]/40 border border-dashed border-[var(--color-border)] text-xs text-center items-center justify-center min-h-[115px] transition-all hover:bg-[var(--color-surface-alt)]/65">
                {proofUrl ? (
                    <div className="flex flex-col items-center gap-1.5 w-full">
                        <div className="relative group w-11 h-11 rounded-lg overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface)] shadow-md">
                            <img src={proofUrl} alt="Bukti transfer" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                            <a href={proofUrl} target="_blank" rel="noreferrer" className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px]" title="Lihat Bukti">
                                <FontAwesomeIcon icon={faExternalLinkAlt} />
                            </a>
                        </div>
                        <div>
                            <p className="font-bold text-[11px] text-[var(--color-text)] leading-tight">Bukti Terlampir</p>
                            <a href={proofUrl} target="_blank" rel="noreferrer" className="text-[9px] font-extrabold text-[var(--color-primary)] hover:underline inline-flex items-center gap-0.5 mt-0.5">
                                Lihat Bukti <FontAwesomeIcon icon={faExternalLinkAlt} className="text-[7px]" />
                            </a>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-1.5 text-center py-0.5">
                        <div className="w-7 h-7 rounded-full bg-[var(--color-primary)]/5 flex items-center justify-center text-[var(--color-primary)]">
                            <FontAwesomeIcon icon={faUpload} className="text-[10px] opacity-75" />
                        </div>
                        <div>
                            <p className="font-bold text-[var(--color-text-muted)] text-[10px] leading-tight">Belum Ada Bukti</p>
                            <p className="text-[8px] text-[var(--color-text-muted)] opacity-55 mt-0.5 leading-none">Maks 3MB (JPG/PNG/WebP)</p>
                        </div>
                    </div>
                )}

                <div className="w-full">
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                    <button
                        onClick={() => fileRef.current?.click()}
                        disabled={uploading || submitting}
                        className="w-full h-7.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] text-[9px] font-black uppercase tracking-wider transition-all disabled:opacity-50 flex items-center justify-center gap-1 shadow-sm"
                    >
                        {uploading ? (
                            <><FontAwesomeIcon icon={faSpinner} className="fa-spin text-[var(--color-primary)] text-[8px]" /> Mengunggah</>
                        ) : (
                            <><FontAwesomeIcon icon={faUpload} className="text-[8px]" /> {proofUrl ? 'Ganti File' : 'Unggah File'}</>
                        )}
                    </button>
                </div>
            </div>

            {/* Bottom Actions & Meta */}
            <div className="flex flex-col gap-2.5 pt-2.5 border-t border-[var(--color-border)]/40 w-full">
                {status === 'lunas' && (
                    <div className="flex flex-col gap-0.5 text-[8px] text-[var(--color-text-muted)] opacity-85 bg-[var(--color-surface-alt)]/40 p-1.5 rounded-lg border border-[var(--color-border)]/30 leading-normal text-left">
                        <span className="flex items-center gap-1"><FontAwesomeIcon icon={faCalendarAlt} className="opacity-60 text-[7px]" /> <b>Waktu:</b> {formatDate(confirmedAt)}</span>
                        <span className="flex items-center gap-1"><FontAwesomeIcon icon={faUserCheck} className="opacity-60 text-[7px]" /> <b>Oleh:</b> {confirmedBy || 'Panitia'}</span>
                    </div>
                )}

                <div className="flex gap-2 w-full">
                    {status !== 'belum' && (
                        <button
                            onClick={() => onUpdateStatus(type, 'belum', null)}
                            disabled={submitting}
                            className="flex-1 h-7.5 rounded-lg border border-rose-500/20 bg-rose-500/5 text-rose-600 hover:bg-rose-500/10 text-[9px] font-black uppercase tracking-widest transition-all disabled:opacity-50 flex items-center justify-center gap-1"
                        >
                            <FontAwesomeIcon icon={faUndo} /> Reset
                        </button>
                    )}
                    {status !== 'lunas' && (
                        <button
                            onClick={() => onUpdateStatus(type, 'lunas', proofUrl)}
                            disabled={submitting}
                            className="flex-1 h-7.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[9px] font-black uppercase tracking-widest transition-all shadow-md shadow-emerald-500/10 disabled:opacity-50 flex items-center justify-center gap-1"
                        >
                            <FontAwesomeIcon icon={faCheckCircle} /> Lunas
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}

export default function EnrollmentPaymentModal({ isOpen, onClose, enrollment, onUpdateStatus, submitting }) {
    if (!isOpen || !enrollment) return null

    // Wave details and customized fee logic
    const waveMeta = enrollment.wave_metadata || {}
    const meta = enrollment.metadata || {}
    const currentPayment = meta.payment || {}

    const regFee = Number(waveMeta.registration_fee || 0)
    const reregFee = Number(waveMeta.reregistration_fee || 0)
    const equipFee = Number(waveMeta.equipment_fee || 0)

    const paymentInfo = {
        registration: { status: 'belum', amount: regFee, proof_url: null, ...(currentPayment.registration || {}) },
        reregistration: { status: 'belum', amount: reregFee, proof_url: null, ...(currentPayment.reregistration || {}) },
        equipment: { status: 'belum', amount: equipFee, proof_url: null, ...(currentPayment.equipment || {}) }
    }

    const handleRowStatusUpdate = async (type, nextStatus, nextProofUrl) => {
        await onUpdateStatus?.(enrollment, type, nextStatus, nextProofUrl)
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Kelola Keuangan & Pembayaran"
            description={`Data transaksi pembayaran pendaftaran calon santri: ${enrollment.name}`}
            icon={faMoneyBillWave}
            size="lg"
            footer={
                <div className="flex justify-end">
                    <button
                        onClick={onClose}
                        className="h-9 px-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] text-[10px] font-black uppercase tracking-widest transition-all shadow-sm shrink-0"
                    >
                        Selesai & Tutup
                    </button>
                </div>
            }
        >
            <div className="space-y-3.5 py-0.5">
                {/* Wave details summary banner */}
                <div className="p-3 rounded-2xl bg-[var(--color-primary)]/[0.03] border border-[var(--color-primary)]/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div>
                        <p className="font-extrabold text-[var(--color-primary)] text-sm">Gelombang: {enrollment.waveName || '-'}</p>
                        <p className="text-[10px] text-[var(--color-text-muted)] font-semibold mt-0.5">Tahun Ajaran: {waveMeta.academic_year || '2026/2027'}</p>
                    </div>
                    <div className="sm:text-right">
                        <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60">Total Tagihan</p>
                        <p className="text-base font-black text-[var(--color-primary)] mt-0.5 tabular-nums">
                            Rp{Number(regFee + reregFee + equipFee).toLocaleString('id-ID')}
                        </p>
                    </div>
                </div>

                {/* Rows list */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                    <PaymentRow
                        type="registration"
                        label="1. Uang Pendaftaran"
                        amount={regFee}
                        paymentInfo={paymentInfo.registration}
                        onUpdateStatus={handleRowStatusUpdate}
                        enrollment={enrollment}
                        submitting={submitting}
                    />
                    <PaymentRow
                        type="reregistration"
                        label="2. Uang Daftar Ulang"
                        amount={reregFee}
                        paymentInfo={paymentInfo.reregistration}
                        onUpdateStatus={handleRowStatusUpdate}
                        enrollment={enrollment}
                        submitting={submitting}
                    />
                    <PaymentRow
                        type="equipment"
                        label="3. Uang Perlengkapan"
                        amount={equipFee}
                        paymentInfo={paymentInfo.equipment}
                        onUpdateStatus={handleRowStatusUpdate}
                        enrollment={enrollment}
                        submitting={submitting}
                    />
                </div>
            </div>
        </Modal>
    )
}
