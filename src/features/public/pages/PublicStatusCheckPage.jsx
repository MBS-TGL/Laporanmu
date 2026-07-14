import React, { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faSearch, faUserCheck, faCheckCircle, faTimesCircle, faClock,
    faUpload, faSpinner, faArrowLeft, faBuildingColumns, faUser, faPhone,
    faBookQuran, faGraduationCap, faMapMarkerAlt, faChevronRight, faFileInvoiceDollar,
    faInfoCircle, faExclamationTriangle, faCalendarAlt, faMoon, faSun
} from '@fortawesome/free-solid-svg-icons'
import { supabase } from '@lib/supabase'
import { useTheme } from '@context/Theme'

// Confetti-like animations CSS
const CONFETTI_STYLE = `
@keyframes celebrate {
    0% { transform: scale(0.95); opacity: 0.8; }
    50% { transform: scale(1.02); opacity: 1; filter: drop-shadow(0 0 15px rgba(16, 185, 129, 0.4)); }
    100% { transform: scale(0.95); opacity: 0.8; }
}
.celebrate-card {
    animation: celebrate 4s ease-in-out infinite;
}
`

export default function PublicStatusCheckPage() {
    const { isDark, toggleTheme } = useTheme()
    const [searchForm, setSearchForm] = useState({ regNum: '', phone: '' })
    const [searching, setSearching] = useState(false)
    const [errorMsg, setErrorMsg] = useState('')
    const [enrollment, setEnrollment] = useState(null)
    const [wave, setWave] = useState(null)

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

        // Inject celebration animation CSS
        const styleEl = document.createElement('style')
        styleEl.innerHTML = CONFETTI_STYLE
        document.head.appendChild(styleEl)

        return () => {
            document.title = 'Laporanmu'
            document.head.removeChild(styleEl)
        }
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

            alert('Terima kasih! Konfirmasi kesediaan bergabung telah berhasil disimpan. Silakan lakukan proses daftar ulang.')
            await refreshData(enrollment.id)
        } catch (err) {
            console.error('[PublicStatusCheck] Confirm error:', err)
            alert('Gagal memproses konfirmasi: ' + err.message)
        } finally {
            setConfirming(false)
        }
    }

    // Upload Payment Proof
    const handlePaymentProofUpload = async (type, e) => {
        const file = e.target.files?.[0]
        if (!file) return
        if (!file.type.startsWith('image/')) {
            alert('File harus berupa gambar (JPG/PNG/WebP)!')
            return
        }
        if (file.size > 3 * 1024 * 1024) {
            alert('Ukuran file maksimal 3MB!')
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

            alert('Bukti pembayaran berhasil diunggah! Mohon menunggu verifikasi keuangan oleh panitia pusat.')
            await refreshData(enrollment.id)
        } catch (err) {
            console.error('[PublicStatusCheck] Upload error:', err)
            alert('Gagal mengupload bukti pembayaran: ' + err.message)
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
            <div className="bg-[var(--color-surface)] shadow-md border border-[var(--color-border)] rounded-3xl p-6 md:p-8 space-y-6">
                <h4 className="text-xs font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60">Timeline Tahap Pendaftaran</h4>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-2">
                    {steps.map((st, i) => {
                        const isDone = i < currentIndex
                        const isActive = i === currentIndex
                        const isFuture = i > currentIndex

                        let circleClass = 'bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] border border-[var(--color-border)]'
                        if (isDone) circleClass = 'bg-emerald-500 text-white border-emerald-500'
                        if (isActive) {
                            if (isRejected) circleClass = 'bg-rose-500 text-white border-rose-500'
                            else if (status === 'diterima' && enrollment.metadata?.is_waiting_list) circleClass = 'bg-amber-500 text-white border-amber-500'
                            else circleClass = 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-md shadow-[var(--color-primary)]/20'
                        }

                        return (
                            <div key={st.key} className="flex-1 flex flex-col md:items-center gap-2 relative">
                                <div className="flex items-center gap-3 md:flex-col md:gap-2 text-left md:text-center">
                                    {/* Line connecting in Mobile */}
                                    <div className={`w-8 h-8 rounded-2xl flex items-center justify-center font-black text-xs transition-all ${circleClass}`}>
                                        {isDone ? <FontAwesomeIcon icon={faCheckCircle} /> : i + 1}
                                    </div>
                                    <div className="leading-tight">
                                        <p className={`text-xs font-bold uppercase tracking-wider ${isActive ? 'text-[var(--color-text)]' : 'text-[var(--color-text-muted)] opacity-70'}`}>
                                            {st.label}
                                        </p>
                                        <p className="text-[9px] text-[var(--color-text-muted)] opacity-55 mt-0.5">
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
                <div className="celebrate-card p-6 md:p-8 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-4">
                    <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-2xl flex items-center justify-center mx-auto">
                        <FontAwesomeIcon icon={faGraduationCap} />
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-xl md:text-2xl font-black text-emerald-600 dark:text-emerald-400">Selamat, Anda Dinyatakan LULUS!</h3>
                        <p className="text-sm font-bold text-[var(--color-text)]">Ananda dinyatakan diterima sebagai calon santri Muhammadiyah Boarding School Tanggul.</p>
                        <p className="text-xs text-[var(--color-text-muted)] opacity-80 max-w-lg mx-auto leading-relaxed pt-1">
                            Langkah selanjutnya adalah melakukan konfirmasi kesediaan bergabung sebelum kuota gelombang ditutup. Silakan isi form persetujuan di bawah ini.
                        </p>
                    </div>

                    {/* Confirmation Form */}
                    {!enrollment.metadata?.acceptance_confirmed ? (
                        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 max-w-lg mx-auto text-left space-y-4 shadow-sm">
                            <h4 className="text-xs font-black uppercase tracking-wider text-[var(--color-text)] flex items-center gap-1.5">
                                <FontAwesomeIcon icon={faUserCheck} className="text-emerald-500" />
                                Form Konfirmasi Kesediaan
                            </h4>
                            <label className="flex items-start gap-3 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={confirmChecked}
                                    onChange={(e) => setConfirmChecked(e.target.checked)}
                                    className="mt-1 w-4 h-4 rounded border-[var(--color-border)] text-emerald-600 focus:ring-emerald-500"
                                />
                                <span className="text-[11px] font-semibold text-[var(--color-text)] leading-relaxed">
                                    Kami selaku orang tua / wali calon santri menyatakan <strong>BERSEDIA</strong> untuk bergabung dan menyetujui seluruh tata tertib serta administrasi daftar ulang Muhammadiyah Boarding School Tanggul.
                                </span>
                            </label>
                            <button
                                onClick={handleConfirmAcceptance}
                                disabled={!confirmChecked || confirming}
                                className="w-full h-11 rounded-xl bg-emerald-600 hover:brightness-110 text-white font-black uppercase tracking-wider text-xs transition-all shadow-md shadow-emerald-500/10 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {confirming ? (
                                    <><FontAwesomeIcon icon={faSpinner} className="fa-spin" /> Memproses Konfirmasi...</>
                                ) : (
                                    <>Konfirmasi Kesediaan Bergabung</>
                                )}
                            </button>
                        </div>
                    ) : (
                        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-3.5 max-w-md mx-auto text-xs font-bold text-emerald-700 dark:text-emerald-400">
                            Kesediaan bergabung telah dikonfirmasi pada {new Date(enrollment.metadata?.history?.find(h => h.action === 'ACCEPTANCE_CONFIRMATION')?.timestamp || Date.now()).toLocaleString('id-ID')}
                        </div>
                    )}
                </div>
            )
        }

        if (isReregistered) {
            return (
                <div className="p-6 md:p-8 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 text-center space-y-4">
                    <div className="w-14 h-14 rounded-full bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-2xl flex items-center justify-center mx-auto animate-bounce">
                        <FontAwesomeIcon icon={faUserCheck} />
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-xl md:text-2xl font-black text-indigo-600 dark:text-indigo-400">Kesediaan Bergabung Terkonfirmasi</h3>
                        <p className="text-sm font-bold text-[var(--color-text)]">Status pendaftaran Ananda saat ini memasuki tahap: <strong>Daftar Ulang</strong>.</p>
                        <p className="text-xs text-[var(--color-text-muted)] opacity-80 max-w-lg mx-auto leading-relaxed pt-1">
                            Silakan lakukan proses pelunasan administrasi keuangan di bawah ini untuk mengunci kuota dan mendapatkan PIN Registrasi Siswa Aktif.
                        </p>
                    </div>
                </div>
            )
        }

        if (isWaitingList && status === 'diterima') {
            return (
                <div className="p-6 md:p-8 rounded-3xl bg-amber-500/10 border border-amber-500/20 text-center space-y-4">
                    <div className="w-14 h-14 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-500 text-2xl flex items-center justify-center mx-auto">
                        <FontAwesomeIcon icon={faClock} className="animate-pulse" />
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-xl md:text-2xl font-black text-amber-600 dark:text-amber-400">Masuk Daftar Cadangan (Waiting List)</h3>
                        <p className="text-sm font-bold text-[var(--color-text)]">Hasil Ujian Lulus, namun Kuota Gelombang ini Penuh.</p>
                        <p className="text-xs text-[var(--color-text-muted)] opacity-80 max-w-lg mx-auto leading-relaxed pt-1">
                            Ananda saat ini berada di antrean cadangan. Apabila ada calon santri yang membatalkan pendaftaran atau mengundurkan diri, sistem akan secara otomatis mempromosikan Ananda menjadi siswa aktif berdasarkan urutan tertua.
                        </p>
                    </div>
                </div>
            )
        }

        if (isRejected) {
            return (
                <div className="p-6 md:p-8 rounded-3xl bg-rose-500/10 border border-rose-500/20 text-center space-y-4">
                    <div className="w-14 h-14 rounded-full bg-rose-500/20 text-rose-600 dark:text-rose-400 text-2xl flex items-center justify-center mx-auto">
                        <FontAwesomeIcon icon={faTimesCircle} />
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-xl md:text-2xl font-black text-rose-600 dark:text-rose-400">Belum Berhasil Lolos Ujian</h3>
                        <p className="text-sm font-bold text-[var(--color-text)]">Kami mohon maaf, pendaftaran Ananda saat ini belum dapat diterima.</p>
                        <p className="text-xs text-[var(--color-text-muted)] opacity-80 max-w-lg mx-auto leading-relaxed pt-1">
                            Terima kasih telah berpartisipasi dan mendaftar di Muhammadiyah Boarding School Tanggul. Tetap semangat, semoga sukses dalam pendidikan di tempat lain!
                        </p>
                    </div>
                </div>
            )
        }

        // Default / mendaftar / verifikasi / tes
        return (
            <div className="p-5 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                    <FontAwesomeIcon icon={faInfoCircle} />
                </div>
                <div className="space-y-0.5">
                    <h5 className="text-xs font-black uppercase tracking-wider text-[var(--color-text)]">Status Pendaftaran Aktif</h5>
                    <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed">
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
            <div className="bg-[var(--color-surface)] shadow-md border border-[var(--color-border)] rounded-3xl p-6 md:p-8 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--color-border)]/40 pb-4">
                    <div>
                        <h4 className="text-sm font-black uppercase tracking-wider text-[var(--color-text)]">Informasi Pembayaran & Daftar Ulang</h4>
                        <p className="text-[10px] text-[var(--color-text-muted)] opacity-60 font-bold mt-0.5">Silakan lakukan transfer ke rekening resmi pesantren di bawah ini</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60">Total Tagihan Administrasi</p>
                        <p className="text-lg font-black text-[var(--color-primary)] mt-0.5 tabular-nums">
                            Rp{formatPrice(regFee + reregFee + equipFee)}
                        </p>
                    </div>
                </div>

                {/* Bank Account Info Card */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 text-xs">
                    <div className="space-y-2">
                        <p className="font-black text-indigo-700 uppercase tracking-wider flex items-center gap-1.5">
                            <FontAwesomeIcon icon={faBuildingColumns} /> Bank Syariah Indonesia (BSI)
                        </p>
                        <div className="space-y-0.5">
                            <p className="text-[10px] text-[var(--color-text-muted)] font-bold">Nomor Rekening:</p>
                            <p className="text-base font-black text-[var(--color-text)] select-all tracking-wide">7788-9999-00</p>
                        </div>
                        <div className="space-y-0.5">
                            <p className="text-[10px] text-[var(--color-text-muted)] font-bold">Atas Nama:</p>
                            <p className="font-black text-[var(--color-text)]">PESANTREN LAPORANMU PSB</p>
                        </div>
                    </div>
                    <div className="space-y-2 border-t sm:border-t-0 sm:border-l border-[var(--color-border)] pt-3 sm:pt-0 sm:pl-5 flex flex-col justify-center">
                        <div className="flex items-start gap-2 text-[10px] text-[var(--color-text-muted)] font-bold leading-normal">
                            <FontAwesomeIcon icon={faExclamationTriangle} className="text-amber-500 shrink-0 mt-0.5" />
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
                            <div key={p.type} className="p-4 border border-[var(--color-border)] rounded-2xl bg-[var(--color-surface)] shadow-sm space-y-3 transition-all hover:border-[var(--color-primary)]/20 flex flex-col justify-between">
                                <div className="space-y-2">
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60">{p.label}</p>
                                            <div className="flex items-baseline gap-0.5 mt-0.5">
                                                <span className="text-[9px] font-bold text-[var(--color-text-muted)] opacity-55">Rp</span>
                                                <span className="text-sm font-black text-[var(--color-text)] tabular-nums">{formatPrice(p.amount)}</span>
                                            </div>
                                        </div>

                                        {/* Status Badge */}
                                        <div className="shrink-0">
                                            {status === 'lunas' && (
                                                <span className="px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-500/10 border border-emerald-500/20">Lunas</span>
                                            )}
                                            {status === 'pending' && (
                                                <span className="px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-wider text-amber-600 bg-amber-500/10 border border-amber-500/20 animate-pulse">Pending</span>
                                            )}
                                            {status === 'belum' && (
                                                <span className="px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-wider text-[var(--color-text-muted)] bg-[var(--color-surface-alt)] border border-[var(--color-border)] opacity-60">Belum</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Proof preview */}
                                    <div className="p-2.5 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)]/50 text-[10px] flex items-center gap-2">
                                        {proofUrl ? (
                                            <>
                                                <img src={proofUrl} alt="Bukti transfer" className="w-8 h-8 rounded object-cover border border-[var(--color-border)] shrink-0" />
                                                <div className="min-w-0">
                                                    <p className="font-bold text-[var(--color-text)] truncate">Bukti terlampir</p>
                                                    <a href={proofUrl} target="_blank" rel="noreferrer" className="text-[9px] font-black text-[var(--color-primary)] hover:underline">Lihat Bukti</a>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="w-8 h-8 rounded bg-[var(--color-border)]/30 flex items-center justify-center text-[var(--color-text-muted)] opacity-50 shrink-0">
                                                    <FontAwesomeIcon icon={faUpload} />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-semibold text-[var(--color-text-muted)]">Belum ada bukti</p>
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
                                            className="w-full h-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] text-[9px] font-black uppercase tracking-wider transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                                        >
                                            {uploadingCategory[p.type] ? (
                                                <><FontAwesomeIcon icon={faSpinner} className="fa-spin" /> Unggah...</>
                                            ) : (
                                                <><FontAwesomeIcon icon={faUpload} /> {proofUrl ? 'Ganti Bukti' : 'Unggah Bukti'}</>
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
        <div className="min-h-screen bg-[var(--color-background)] transition-colors duration-300 pb-16">
            {/* Header navbar */}
            <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)]/70 backdrop-blur-md sticky top-0 z-50 transition-colors">
                <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
                    <Link to="/psb" className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[var(--color-primary)] to-indigo-600 flex items-center justify-center text-white text-xs font-black shadow-md shadow-[var(--color-primary)]/10">
                            LM
                        </div>
                        <span className="text-[14px] font-black text-[var(--color-text)] tracking-wider">LAPORANMU PSB</span>
                    </Link>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={toggleTheme}
                            className="w-9 h-9 rounded-xl border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] flex items-center justify-center transition-all bg-[var(--color-surface)] text-sm"
                        >
                            <FontAwesomeIcon icon={isDark ? faSun : faMoon} />
                        </button>
                        <Link to="/psb" className="h-9 px-4 rounded-xl border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] flex items-center justify-center gap-2 transition-all bg-[var(--color-surface)] text-[10px] font-black uppercase tracking-wider">
                            <FontAwesomeIcon icon={faArrowLeft} /> Kembali ke Pendaftaran
                        </Link>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 pt-8 md:pt-12 space-y-8">
                {/* Search Header Container */}
                {!enrollment && (
                    <div className="max-w-md mx-auto text-center space-y-6 pt-4">
                        <div className="space-y-2">
                            <h2 className="text-2xl md:text-3xl font-black text-[var(--color-text)] tracking-tight">Cek Status Kelulusan Anda</h2>
                            <p className="text-xs text-[var(--color-text-muted)] opacity-85 leading-relaxed max-w-sm mx-auto">
                                Masukkan Nomor Registrasi PSB Anda dan Nomor HP Wali yang didaftarkan untuk memeriksa status kelulusan seleksi.
                            </p>
                        </div>

                        {errorMsg && (
                            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs font-bold text-rose-600 dark:text-rose-400 text-left flex items-start gap-2.5">
                                <FontAwesomeIcon icon={faTimesCircle} className="shrink-0 mt-0.5 text-xs" />
                                <span>{errorMsg}</span>
                            </div>
                        )}

                        <form onSubmit={handleSearch} className="bg-[var(--color-surface)] shadow-xl border border-[var(--color-border)] rounded-3xl p-6 text-left space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60">Nomor Registrasi (PSB-XXXX-XXXX)</label>
                                <div className="relative">
                                    <FontAwesomeIcon icon={faUser} className="absolute left-4.5 top-3.5 text-xs text-[var(--color-text-muted)] opacity-40" />
                                    <input
                                        type="text"
                                        name="regNum"
                                        placeholder="PSB-2026-0001"
                                        value={searchForm.regNum}
                                        onChange={handleSearchChange}
                                        className="w-full h-11 pl-11 pr-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] text-xs focus:ring-2 focus:ring-[var(--color-primary)] font-semibold uppercase"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60">Nomor HP Wali</label>
                                <div className="relative">
                                    <FontAwesomeIcon icon={faPhone} className="absolute left-4.5 top-3.5 text-xs text-[var(--color-text-muted)] opacity-40" />
                                    <input
                                        type="text"
                                        name="phone"
                                        placeholder="081234567890"
                                        value={searchForm.phone}
                                        onChange={handleSearchChange}
                                        className="w-full h-11 pl-11 pr-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] text-xs focus:ring-2 focus:ring-[var(--color-primary)] font-semibold"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={searching}
                                className="w-full h-11 rounded-xl bg-gradient-to-tr from-[var(--color-primary)] to-indigo-600 text-white font-black uppercase tracking-wider text-xs transition-all shadow-md shadow-[var(--color-primary)]/10 flex items-center justify-center gap-2"
                            >
                                {searching ? (
                                    <><FontAwesomeIcon icon={faSpinner} className="fa-spin" /> Memeriksa...</>
                                ) : (
                                    <><FontAwesomeIcon icon={faSearch} /> Cek Status Sekarang</>
                                )}
                            </button>
                        </form>
                    </div>
                )}

                {/* Candidate details panel */}
                {enrollment && (
                    <div className="space-y-6">
                        {/* Profile Header Widget */}
                        <div className="bg-[var(--color-surface)] shadow-md border border-[var(--color-border)] rounded-3xl p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xl font-black flex items-center justify-center shrink-0">
                                    {enrollment.name?.charAt(0)}
                                </div>
                                <div className="space-y-0.5">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-lg font-black text-[var(--color-text)] leading-tight">{enrollment.name}</h3>
                                        <span className="text-[10px] font-black uppercase tracking-wider bg-[var(--color-surface-alt)] px-2 py-0.5 rounded-lg border border-[var(--color-border)]">
                                            {enrollment.program}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3 text-[10px] text-[var(--color-text-muted)] font-bold">
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
                                    }}
                                    className="h-9 px-4.5 rounded-xl border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] text-[10px] font-black uppercase tracking-wider transition-all bg-[var(--color-surface)]"
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
