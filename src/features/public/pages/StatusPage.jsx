import React, { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
    ArrowLeft, CircleCheck, CircleX, Clock, GraduationCap, Info, Landmark,
    LoaderCircle, Moon, Phone, Search, Sun, TriangleAlert, Upload, User, UserCheck
} from 'lucide-react'
import { supabase } from '@lib/supabase'
import { useTheme } from '@context/Theme'

export default function StatusPage() {
    const { isDark, toggleTheme } = useTheme()
    const [searchForm, setSearchForm] = useState({ regNum: '', phone: '' })
    const [searching, setSearching] = useState(false)
    const [errorMsg, setErrorMsg] = useState('')
    const [enrollment, setEnrollment] = useState(null)
    const [wave, setWave] = useState(null)

    // Notice banner inline (pengganti alert) — { type: 'success' | 'error', msg }
    const [notice, setNotice] = useState(null)

    // Form states
    const [confirmChecked, setConfirmChecked] = useState(false)
    const [confirming, setConfirming] = useState(false)

    // File upload loading per payment category
    const [uploadingCategory, setUploadingCategory] = useState({
        registration: false,
        reregistration: false,
        equipment: false
    })

    const fileRefs = {
        registration: useRef(null),
        reregistration: useRef(null),
        equipment: useRef(null)
    }

    useEffect(() => {
        document.title = 'Laporanmu - Cek Status Kelulusan & PSB'
        return () => { document.title = 'Laporanmu' }
    }, [])

    const handleSearchChange = (e) => setSearchForm(prev => ({ ...prev, [e.target.name]: e.target.value }))

    const handleSearch = async (e) => {
        e.preventDefault()
        if (!searchForm.regNum.trim() || !searchForm.phone.trim()) {
            setErrorMsg('Mohon isi nomor registrasi dan nomor HP wali!')
            return
        }

        setSearching(true)
        setErrorMsg('')
        setEnrollment(null)
        setWave(null)

        try {
            // Find enrollment matching reg number
            const { data, error } = await supabase
                .from('enrollments')
                .select('*, enrollment_waves(*)')
                .eq('registration_number', searchForm.regNum.trim().toUpperCase())
                .is('metadata->>deleted_at', null)
                .limit(1)

            if (error) throw error

            if (!data || data.length === 0) {
                setErrorMsg('Pendaftaran tidak ditemukan! Silakan periksa kembali Nomor Registrasi Anda.')
                setSearching(false)
                return
            }

            const candidate = data[0]

            // Format phones for loose check
            const cleanInputPhone = searchForm.phone.replace(/[^0-9]/g, '')
            const cleanDbPhone = (candidate.phone || candidate.metadata?.phone || '').replace(/[^0-9]/g, '')
            const cleanDbFatherPhone = (candidate.metadata?.father_phone || '').replace(/[^0-9]/g, '')
            const cleanDbMotherPhone = (candidate.metadata?.mother_phone || '').replace(/[^0-9]/g, '')

            const isPhoneMatch =
                cleanInputPhone === cleanDbPhone ||
                cleanInputPhone === cleanDbFatherPhone ||
                cleanInputPhone === cleanDbMotherPhone ||
                (cleanDbPhone.endsWith(cleanInputPhone) && cleanInputPhone.length >= 8) ||
                (cleanDbFatherPhone.endsWith(cleanInputPhone) && cleanInputPhone.length >= 8) ||
                (cleanDbMotherPhone.endsWith(cleanInputPhone) && cleanInputPhone.length >= 8)

            if (!isPhoneMatch) {
                setErrorMsg('Nomor HP Wali tidak cocok dengan data pendaftaran!')
                setSearching(false)
                return
            }

            setEnrollment(candidate)
            setWave(candidate.enrollment_waves)
        } catch (err) {
            console.error('[PublicStatusCheck] Search error:', err)
            setErrorMsg('Terjadi kesalahan sistem saat memproses data.')
        } finally {
            setSearching(false)
        }
    }

    // Refresh candidate profile in page
    const refreshData = async (enrollmentId) => {
        try {
            const { data } = await supabase
                .from('enrollments')
                .select('*, enrollment_waves(*)')
                .eq('id', enrollmentId)
                .single()
            if (data) {
                setEnrollment(data)
                setWave(data.enrollment_waves)
            }
        } catch (err) {
            console.error('[PublicStatusCheck] Refresh error:', err)
        }
    }

    // Confirm Kesediaan Bergabung
    const handleConfirmAcceptance = async () => {
        if (!confirmChecked) return
        setConfirming(true)
        try {
            const meta = enrollment.metadata || {}
            const currentHistory = meta.history || []
            const newHistory = [...currentHistory, {
                action: 'ACCEPTANCE_CONFIRMATION',
                from: 'diterima',
                to: 'daftar_ulang',
                timestamp: new Date().toISOString(),
                by: 'Calon Santri (Mandiri)'
            }]

            const nextMeta = {
                ...meta,
                acceptance_confirmed: true,
                history: newHistory
            }

            // Update status to 'daftar_ulang' and set acceptance_confirmed to true
            const { error } = await supabase
                .from('enrollments')
                .update({
                    status: 'daftar_ulang',
                    metadata: nextMeta
                })
                .eq('id', enrollment.id)

            if (error) throw error

            // Log System Audit Trail
            await supabase.from('audit_logs').insert([{
                action: 'UPDATE',
                source: 'PUBLIC',
                table_name: 'enrollments',
                record_id: enrollment.id,
                old_data: enrollment,
                new_data: { ...enrollment, status: 'daftar_ulang', metadata: nextMeta },
                created_at: new Date().toISOString()
            }])

            setNotice({ type: 'success', msg: 'Terima kasih! Konfirmasi kesediaan bergabung telah berhasil disimpan. Silakan lakukan proses daftar ulang.' })
            await refreshData(enrollment.id)
        } catch (err) {
            console.error('[PublicStatusCheck] Confirm error:', err)
            setNotice({ type: 'error', msg: 'Gagal memproses konfirmasi. Silakan coba lagi.' })
        } finally {
            setConfirming(false)
        }
    }

    // Upload Payment Proof
    const handlePaymentProofUpload = async (type, e) => {
        const file = e.target.files?.[0]
        if (!file) return
        if (!file.type.startsWith('image/')) {
            setNotice({ type: 'error', msg: 'File harus berupa gambar (JPG/PNG/WebP)!' })
            return
        }
        if (file.size > 3 * 1024 * 1024) {
            setNotice({ type: 'error', msg: 'Ukuran file maksimal 3MB!' })
            return
        }

        setUploadingCategory(prev => ({ ...prev, [type]: true }))
        try {
            const ext = file.name.split('.').pop()
            const path = `payment-proofs/${enrollment.id}-${type}-${Date.now()}.${ext}`

            // Uploading to standard bucket 'raport-mbs' under path
            const { error: uploadError } = await supabase.storage
                .from('raport-mbs')
                .upload(path, file, { upsert: true, contentType: file.type })

            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage.from('raport-mbs').getPublicUrl(path)

            // Update metadata.payment status to 'pending' and set proof_url
            const meta = enrollment.metadata || {}
            const currentPayment = meta.payment || {}
            const nextPayment = {
                ...currentPayment,
                [type]: {
                    ...(currentPayment[type] || {}),
                    status: 'pending',
                    proof_url: publicUrl,
                    uploaded_at: new Date().toISOString()
                }
            }

            const nextMeta = {
                ...meta,
                payment: nextPayment
            }

            const { error: updateError } = await supabase
                .from('enrollments')
                .update({ metadata: nextMeta })
                .eq('id', enrollment.id)

            if (updateError) throw updateError

            // Log System Audit Trail
            await supabase.from('audit_logs').insert([{
                action: 'UPDATE',
                source: 'PUBLIC',
                table_name: 'enrollments',
                record_id: enrollment.id,
                old_data: enrollment,
                new_data: { ...enrollment, metadata: nextMeta },
                created_at: new Date().toISOString()
            }])

            setNotice({ type: 'success', msg: 'Bukti pembayaran berhasil diunggah! Mohon menunggu verifikasi keuangan oleh panitia pusat.' })
            await refreshData(enrollment.id)
        } catch (err) {
            console.error('[PublicStatusCheck] Upload error:', err)
            setNotice({ type: 'error', msg: 'Gagal mengupload bukti pembayaran. Silakan coba lagi.' })
        } finally {
            setUploadingCategory(prev => ({ ...prev, [type]: false }))
            if (fileRefs[type].current) fileRefs[type].current.value = ''
        }
    }

    // Render Timeline Steps
    const renderTimeline = () => {
        if (!enrollment) return null

        const status = enrollment.status
        const steps = [
            { key: 'mendaftar', label: 'Pendaftaran' },
            { key: 'verifikasi', label: 'Verifikasi Berkas' },
            { key: 'tes', label: 'Ujian Seleksi' },
            { key: 'diterima', label: 'Hasil Kelulusan' },
            { key: 'daftar_ulang', label: 'Daftar Ulang' }
        ]

        const getStepIndex = (st) => {
            if (st === 'mendaftar') return 0
            if (st === 'verifikasi') return 1
            if (st === 'tes') return 2
            if (st === 'diterima') return 3
            if (st === 'daftar_ulang') return 4
            if (st === 'ditolak') return 3
            return 0
        }

        const currentIndex = getStepIndex(status)
        const isRejected = status === 'ditolak'

        return (
            <div className="bg-surface shadow-sm border border-border rounded-2xl p-6 md:p-8 space-y-6">
                <h4 className="text-xs font-bold uppercase tracking-wide text-text-muted">Timeline Tahap Pendaftaran</h4>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-2">
                    {steps.map((st, i) => {
                        const isDone = i < currentIndex
                        const isActive = i === currentIndex

                        let circleClass = 'bg-surface-alt text-text-muted border border-border'
                        if (isDone) circleClass = 'bg-success text-white border-success'
                        if (isActive) {
                            if (isRejected) circleClass = 'bg-danger text-white border-danger'
                            else if (status === 'diterima' && enrollment.metadata?.is_waiting_list) circleClass = 'bg-warning text-white border-warning'
                            else circleClass = 'bg-primary text-white border-primary shadow-md'
                        }

                        return (
                            <div key={st.key} className="flex-1 flex flex-col md:items-center gap-2 relative">
                                <div className="flex items-center gap-3 md:flex-col md:gap-2 text-left md:text-center">
                                    {/* Line connecting in Mobile */}
                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs transition-all shrink-0 ${circleClass}`}>
                                        {isDone ? <CircleCheck className="w-4 h-4" /> : i + 1}
                                    </div>
                                    <div className="leading-tight">
                                        <p className={`text-xs font-bold uppercase tracking-wider ${isActive ? 'text-text' : 'text-text-muted opacity-70'}`}>
                                            {st.label}
                                        </p>
                                        <p className="text-xs text-text-muted opacity-70 mt-0.5">
                                            {isActive ? (isRejected ? 'Belum Diterima' : (enrollment.metadata?.is_waiting_list && status === 'diterima' ? 'Waiting List' : 'Tahap Aktif')) : (isDone ? 'Selesai' : 'Belum Mulai')}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        )
    }

    // Render Stats and Congratulation Box
    const renderStatusBanner = () => {
        if (!enrollment) return null

        const status = enrollment.status
        const isWaitingList = enrollment.metadata?.is_waiting_list
        const isAccepted = status === 'diterima' && !isWaitingList
        const isReregistered = status === 'daftar_ulang'
        const isRejected = status === 'ditolak'

        if (isAccepted) {
            return (
                <div className="celebrate-card p-6 md:p-8 rounded-2xl bg-success/10 border border-success/20 text-center space-y-4">
                    <div className="w-14 h-14 rounded-full bg-success/20 text-success text-2xl flex items-center justify-center mx-auto">
                        <GraduationCap className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-xl md:text-2xl font-bold text-success">Selamat, Anda Dinyatakan LULUS!</h3>
                        <p className="text-sm font-bold text-text">Ananda dinyatakan diterima sebagai calon santri Muhammadiyah Boarding School Tanggul.</p>
                        <p className="text-xs text-text-muted max-w-lg mx-auto leading-relaxed pt-1">
                            Langkah selanjutnya adalah melakukan konfirmasi kesediaan bergabung sebelum kuota gelombang ditutup. Silakan isi form persetujuan di bawah ini.
                        </p>
                    </div>

                    {/* Confirmation Form */}
                    {!enrollment.metadata?.acceptance_confirmed ? (
                        <div className="bg-surface border border-border rounded-xl p-5 max-w-lg mx-auto text-left space-y-4 shadow-sm">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-text flex items-center gap-1.5">
                                <UserCheck className="w-4 h-4 text-success" />
                                Form Konfirmasi Kesediaan
                            </h4>
                            <label className="flex items-start gap-3 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={confirmChecked}
                                    onChange={(e) => setConfirmChecked(e.target.checked)}
                                    className="mt-1 w-4 h-4 rounded border-border text-success focus:ring-success"
                                />
                                <span className="text-xs font-semibold text-text leading-relaxed">
                                    Kami selaku orang tua / wali calon santri menyatakan <strong>BERSEDIA</strong> untuk bergabung dan menyetujui seluruh tata tertib serta administrasi daftar ulang Muhammadiyah Boarding School Tanggul.
                                </span>
                            </label>
                            <button
                                onClick={handleConfirmAcceptance}
                                disabled={!confirmChecked || confirming}
                                className="w-full h-11 rounded-xl bg-success hover:brightness-110 text-white font-bold uppercase tracking-wider text-xs transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {confirming ? (
                                    <><LoaderCircle className="w-4 h-4 animate-spin" /> Memproses Konfirmasi...</>
                                ) : (
                                    <>Konfirmasi Kesediaan Bergabung</>
                                )}
                            </button>
                        </div>
                    ) : (
                        <div className="bg-success/5 border border-success/20 rounded-xl p-3.5 max-w-md mx-auto text-xs font-bold text-success">
                            Kesediaan bergabung telah dikonfirmasi pada {new Date(enrollment.metadata?.history?.find(h => h.action === 'ACCEPTANCE_CONFIRMATION')?.timestamp || Date.now()).toLocaleString('id-ID')}
                        </div>
                    )}
                </div>
            )
        }

        if (isReregistered) {
            return (
                <div className="p-6 md:p-8 rounded-2xl bg-primary/10 border border-primary/20 text-center space-y-4">
                    <div className="w-14 h-14 rounded-full bg-primary/20 text-primary text-2xl flex items-center justify-center mx-auto">
                        <UserCheck className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-xl md:text-2xl font-bold text-primary">Kesediaan Bergabung Terkonfirmasi</h3>
                        <p className="text-sm font-bold text-text">Status pendaftaran Ananda saat ini memasuki tahap: <strong>Daftar Ulang</strong>.</p>
                        <p className="text-xs text-text-muted max-w-lg mx-auto leading-relaxed pt-1">
                            Silakan lakukan proses pelunasan administrasi keuangan di bawah ini untuk mengunci kuota dan mendapatkan PIN Registrasi Siswa Aktif.
                        </p>
                    </div>
                </div>
            )
        }

        if (isWaitingList && status === 'diterima') {
            return (
                <div className="p-6 md:p-8 rounded-2xl bg-warning/10 border border-warning/20 text-center space-y-4">
                    <div className="w-14 h-14 rounded-full bg-warning/20 text-warning text-2xl flex items-center justify-center mx-auto">
                        <Clock className="w-6 h-6 animate-pulse" />
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-xl md:text-2xl font-bold text-warning">Masuk Daftar Cadangan (Waiting List)</h3>
                        <p className="text-sm font-bold text-text">Hasil Ujian Lulus, namun Kuota Gelombang ini Penuh.</p>
                        <p className="text-xs text-text-muted max-w-lg mx-auto leading-relaxed pt-1">
                            Ananda saat ini berada di antrean cadangan. Apabila ada calon santri yang membatalkan pendaftaran atau mengundurkan diri, sistem akan secara otomatis mempromosikan Ananda menjadi siswa aktif berdasarkan urutan tertua.
                        </p>
                    </div>
                </div>
            )
        }

        if (isRejected) {
            return (
                <div className="p-6 md:p-8 rounded-2xl bg-danger/10 border border-danger/20 text-center space-y-4">
                    <div className="w-14 h-14 rounded-full bg-danger/20 text-danger text-2xl flex items-center justify-center mx-auto">
                        <CircleX className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-xl md:text-2xl font-bold text-danger">Belum Berhasil Lolos Ujian</h3>
                        <p className="text-sm font-bold text-text">Kami mohon maaf, pendaftaran Ananda saat ini belum dapat diterima.</p>
                        <p className="text-xs text-text-muted max-w-lg mx-auto leading-relaxed pt-1">
                            Terima kasih telah berpartisipasi dan mendaftar di Muhammadiyah Boarding School Tanggul. Tetap semangat, semoga sukses dalam pendidikan di tempat lain!
                        </p>
                    </div>
                </div>
            )
        }

        // Default / mendaftar / verifikasi / tes
        return (
            <div className="p-5 rounded-xl bg-primary/5 border border-primary/10 flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Info className="w-4 h-4" />
                </div>
                <div className="space-y-0.5">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-text">Status Pendaftaran Aktif</h5>
                    <p className="text-xs text-text-muted leading-relaxed">
                        {status === 'mendaftar' && 'Berkas pendaftaran Anda telah kami terima dan sedang dalam antrean proses verifikasi oleh panitia pusat.'}
                        {status === 'verifikasi' && 'Berkas terverifikasi lengkap! Tahap selanjutnya adalah menunggu jadwal ujian seleksi lisan & quran.'}
                        {status === 'tes' && 'Tahap ujian seleksi lisan & quran sedang berlangsung. Silakan hubungi admin panitia untuk jadwal lengkap.'}
                    </p>
                </div>
            </div>
        )
    }

    // Render payment upload card list
    const renderPaymentSection = () => {
        if (!enrollment || (!enrollment.metadata?.acceptance_confirmed && enrollment.status !== 'daftar_ulang')) return null

        const waveMeta = wave?.metadata || {}
        const meta = enrollment.metadata || {}
        const currentPayment = meta.payment || {}

        const regFee = Number(waveMeta.registration_fee || wave?.registration_fee || 0)
        const reregFee = Number(waveMeta.reregistration_fee || wave?.reregistration_fee || 0)
        const equipFee = Number(waveMeta.equipment_fee || wave?.equipment_fee || 0)

        const payments = [
            { type: 'registration', label: '1. Uang Pendaftaran', amount: regFee },
            { type: 'reregistration', label: '2. Uang Daftar Ulang', amount: reregFee },
            { type: 'equipment', label: '3. Uang Perlengkapan', amount: equipFee }
        ]

        const formatPrice = (val) => Number(val).toLocaleString('id-ID')

        return (
            <div className="bg-surface shadow-sm border border-border rounded-2xl p-6 md:p-8 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
                    <div>
                        <h4 className="text-sm font-bold uppercase tracking-wider text-text">Informasi Pembayaran &amp; Daftar Ulang</h4>
                        <p className="text-xs text-text-muted font-bold mt-0.5">Silakan lakukan transfer ke rekening resmi pesantren di bawah ini</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs font-bold uppercase tracking-wide text-text-muted">Total Tagihan Administrasi</p>
                        <p className="text-lg font-bold text-primary mt-0.5 tabular-nums">
                            Rp{formatPrice(regFee + reregFee + equipFee)}
                        </p>
                    </div>
                </div>

                {/* Bank Account Info Card */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 rounded-xl bg-surface-alt border border-border text-xs">
                    <div className="space-y-2">
                        <p className="font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                            <Landmark className="w-4 h-4" /> Bank Syariah Indonesia (BSI)
                        </p>
                        <div className="space-y-0.5">
                            <p className="text-xs text-text-muted font-bold">Nomor Rekening:</p>
                            <p className="text-base font-bold text-text select-all tracking-wide">7788-9999-00</p>
                        </div>
                        <div className="space-y-0.5">
                            <p className="text-xs text-text-muted font-bold">Atas Nama:</p>
                            <p className="font-bold text-text">PESANTREN LAPORANMU PSB</p>
                        </div>
                    </div>
                    <div className="space-y-2 border-t sm:border-t-0 sm:border-l border-border pt-3 sm:pt-0 sm:pl-5 flex flex-col justify-center">
                        <div className="flex items-start gap-2 text-xs text-text-muted font-bold leading-normal">
                            <TriangleAlert className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                            <div className="space-y-1">
                                <p>Pastikan mengunggah foto/screenshot bukti transfer yang jelas dan terbaca nominalnya.</p>
                                <p>Proses verifikasi manual berkas transfer memakan waktu maksimal 1-2 hari kerja.</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Payment Category Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {payments.map(p => {
                        const payInfo = currentPayment[p.type] || {}
                        const status = payInfo.status || 'belum'
                        const proofUrl = payInfo.proof_url || null

                        return (
                            <div key={p.type} className="p-4 border border-border rounded-xl bg-surface shadow-sm space-y-3 transition-all hover:border-primary/30 flex flex-col justify-between">
                                <div className="space-y-2">
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <p className="text-xs font-bold uppercase tracking-wide text-text-muted">{p.label}</p>
                                            <div className="flex items-baseline gap-0.5 mt-0.5">
                                                <span className="text-xs font-bold text-text-muted">Rp</span>
                                                <span className="text-sm font-bold text-text tabular-nums">{formatPrice(p.amount)}</span>
                                            </div>
                                        </div>

                                        {/* Status Badge */}
                                        <div className="shrink-0">
                                            {status === 'lunas' && (
                                                <span className="px-2 py-0.5 rounded-lg text-xs font-bold uppercase tracking-wider text-success bg-success/10 border border-success/20">Lunas</span>
                                            )}
                                            {status === 'pending' && (
                                                <span className="px-2 py-0.5 rounded-lg text-xs font-bold uppercase tracking-wider text-warning bg-warning/10 border border-warning/20 animate-pulse">Pending</span>
                                            )}
                                            {status === 'belum' && (
                                                <span className="px-2 py-0.5 rounded-lg text-xs font-bold uppercase tracking-wider text-text-muted bg-surface-alt border border-border">Belum</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Proof preview */}
                                    <div className="p-2.5 rounded-lg bg-surface-alt border border-border text-xs flex items-center gap-2">
                                        {proofUrl ? (
                                            <>
                                                <img src={proofUrl} alt="Bukti transfer" className="w-8 h-8 rounded object-cover border border-border shrink-0" loading="lazy" decoding="async" />
                                                <div className="min-w-0">
                                                    <p className="font-bold text-text truncate">Bukti terlampir</p>
                                                    <a href={proofUrl} target="_blank" rel="noreferrer" className="text-xs font-bold text-primary hover:underline">Lihat Bukti</a>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="w-8 h-8 rounded bg-border/30 flex items-center justify-center text-text-muted opacity-50 shrink-0">
                                                    <Upload className="w-4 h-4" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-semibold text-text-muted">Belum ada bukti</p>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Upload button */}
                                {status !== 'lunas' && (
                                    <div className="pt-2">
                                        <input
                                            ref={fileRefs[p.type]}
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={(e) => handlePaymentProofUpload(p.type, e)}
                                        />
                                        <button
                                            onClick={() => fileRefs[p.type].current?.click()}
                                            disabled={uploadingCategory[p.type]}
                                            className="w-full h-8 rounded-lg border border-border bg-surface text-text-muted hover:text-text text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                                        >
                                            {uploadingCategory[p.type] ? (
                                                <><LoaderCircle className="w-4 h-4 animate-spin" /> Unggah...</>
                                            ) : (
                                                <><Upload className="w-4 h-4" /> {proofUrl ? 'Ganti Bukti' : 'Unggah Bukti'}</>
                                            )}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-app-bg transition-colors duration-300 pb-16">
            {/* Header navbar */}
            <header className="border-b border-border bg-surface sticky top-0 z-50 transition-colors">
                <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
                    <Link to="/psb" className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-sm">
                            L
                        </div>
                        <span className="font-bold text-lg text-text tracking-tight">Laporan<span className="text-primary">mu</span></span>
                        <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider border border-primary/20 hidden sm:inline-block">
                            PSB
                        </span>
                    </Link>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={toggleTheme}
                            className="w-9 h-9 rounded-lg border border-border text-text-muted hover:text-text flex items-center justify-center transition-all bg-surface text-sm"
                        >
                            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                        </button>
                        <Link to="/psb" className="h-9 px-4 rounded-lg border border-border text-text-muted hover:text-text flex items-center justify-center gap-2 transition-all bg-surface text-xs font-bold uppercase tracking-wider">
                            <ArrowLeft className="w-4 h-4" /> <span className="hidden sm:inline">Pendaftaran</span>
                        </Link>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 pt-8 md:pt-12 space-y-8">
                {/* Notice banner inline (sukses / error) */}
                {notice && (
                    <div className={`p-4 rounded-xl border text-sm font-bold text-left flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300 ${
                        notice.type === 'success'
                            ? 'bg-success/10 border-success/20 text-success'
                            : 'bg-danger/10 border-danger/20 text-danger'
                    }`}>
                        {notice.type === 'success'
                            ? <CircleCheck className="w-5 h-5 shrink-0 mt-0.5" />
                            : <TriangleAlert className="w-5 h-5 shrink-0 mt-0.5" />}
                        <span className="flex-1">{notice.msg}</span>
                        <button onClick={() => setNotice(null)} className="shrink-0 opacity-60 hover:opacity-100 transition-opacity">
                            <CircleX className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {/* Search Header Container */}
                {!enrollment && (
                    <div className="max-w-md mx-auto text-center space-y-6 pt-4">
                        <div className="space-y-2">
                            <h2 className="text-2xl md:text-3xl font-bold text-text tracking-tight">Cek Status Kelulusan Anda</h2>
                            <p className="text-xs text-text-muted leading-relaxed max-w-sm mx-auto">
                                Masukkan Nomor Registrasi PSB Anda dan Nomor HP Wali yang didaftarkan untuk memeriksa status kelulusan seleksi.
                            </p>
                        </div>

                        {errorMsg && (
                            <div className="p-3.5 rounded-xl bg-danger/10 border border-danger/20 text-xs font-bold text-danger text-left flex items-start gap-2.5">
                                <CircleX className="w-4 h-4 shrink-0 mt-0.5" />
                                <span>{errorMsg}</span>
                            </div>
                        )}

                        <form onSubmit={handleSearch} className="bg-surface shadow-lg border border-border rounded-2xl p-6 text-left space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs font-bold uppercase tracking-wide text-text-muted">Nomor Registrasi (PSB-XXXX-XXXX)</label>
                                <div className="relative">
                                    <User className="w-4 h-4 absolute left-4 top-3.5 text-text-muted opacity-40" />
                                    <input
                                        type="text"
                                        name="regNum"
                                        placeholder="PSB-2026-0001"
                                        value={searchForm.regNum}
                                        onChange={handleSearchChange}
                                        className="w-full h-11 pl-11 pr-4 rounded-xl border border-border bg-surface text-text text-xs focus:border-primary focus:ring-4 focus:ring-primary/10 font-semibold uppercase outline-none transition-all"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold uppercase tracking-wide text-text-muted">Nomor HP Wali</label>
                                <div className="relative">
                                    <Phone className="w-4 h-4 absolute left-4 top-3.5 text-text-muted opacity-40" />
                                    <input
                                        type="text"
                                        name="phone"
                                        placeholder="081234567890"
                                        value={searchForm.phone}
                                        onChange={handleSearchChange}
                                        className="w-full h-11 pl-11 pr-4 rounded-xl border border-border bg-surface text-text text-xs focus:border-primary focus:ring-4 focus:ring-primary/10 font-semibold outline-none transition-all"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={searching}
                                className="w-full h-11 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold uppercase tracking-wider text-xs transition-all shadow-sm flex items-center justify-center gap-2"
                            >
                                {searching ? (
                                    <><LoaderCircle className="w-4 h-4 animate-spin" /> Memeriksa...</>
                                ) : (
                                    <><Search className="w-4 h-4" /> Cek Status Sekarang</>
                                )}
                            </button>
                        </form>
                    </div>
                )}

                {/* Candidate details panel */}
                {enrollment && (
                    <div className="space-y-6">
                        {/* Profile Header Widget */}
                        <div className="bg-surface shadow-sm border border-border rounded-2xl p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary text-xl font-bold flex items-center justify-center shrink-0">
                                    {enrollment.name?.charAt(0)}
                                </div>
                                <div className="space-y-0.5">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-lg font-bold text-text leading-tight">{enrollment.name}</h3>
                                        <span className="text-xs font-bold uppercase tracking-wider bg-surface-alt px-2 py-0.5 rounded-lg border border-border">
                                            {enrollment.program}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-text-muted font-bold">
                                        <span>No. Reg: {enrollment.registration_number}</span>
                                        <span>•</span>
                                        <span>Sekolah Asal: {enrollment.school_origin}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => {
                                        setEnrollment(null)
                                        setWave(null)
                                        setSearchForm({ regNum: '', phone: '' })
                                        setNotice(null)
                                    }}
                                    className="h-9 px-4 rounded-lg border border-border text-text-muted hover:text-text text-xs font-bold uppercase tracking-wider transition-all bg-surface"
                                >
                                    Cek Nomor Lain
                                </button>
                            </div>
                        </div>

                        {/* Stats Banner / Result card */}
                        {renderStatusBanner()}

                        {/* Interactive Timeline */}
                        {renderTimeline()}

                        {/* Payment proofs section */}
                        {renderPaymentSection()}
                    </div>
                )}
            </main>
        </div>
    )
}
