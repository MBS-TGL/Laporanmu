import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faUser, faUsers, faCheckCircle, faInfoCircle, faArrowRight, faArrowLeft, faMapMarkerAlt, faMoon, faSun
} from '@fortawesome/free-solid-svg-icons'
import { supabase } from '@lib/supabase'
import { useTheme } from '@context/Theme'

const generateRegNumber = () => {
    return `PSB-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`
}

export default function PublicEnrollmentPage() {
    const { isDark, toggleTheme } = useTheme()
    const [step, setStep] = useState(0)
    const [form, setForm] = useState({
        name: '', gender: 'L', program: 'reguler', school_origin: '', phone: '',
        father_name: '', mother_name: '', address: ''
    })
    const [submitting, setSubmitting] = useState(false)
    const [successData, setSuccessData] = useState(null)
    const [activeWave, setActiveWave] = useState(null)
    const [loadingWave, setLoadingWave] = useState(true)

    useEffect(() => {
        document.title = 'Laporanmu - Pendaftaran Online'
        supabase.from('enrollment_waves').select('*').eq('is_active', true).limit(1).single()
            .then(({ data }) => {
                setActiveWave(data)
                setLoadingWave(false)
            })
            .catch(() => setLoadingWave(false))
        
        return () => { document.title = 'Laporanmu' }
    }, [])

    const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))

    const canNext = () => {
        if (step === 0) return form.name.trim().length >= 3 && form.school_origin.trim().length >= 2
        if (step === 1) return form.father_name.trim().length >= 3 && form.phone.trim().length >= 10
        return true
    }

    const handleSubmit = async () => {
        if (!activeWave) return alert("Maaf, gelombang pendaftaran saat ini ditutup.")
        setSubmitting(true)
        try {
            const regNum = generateRegNumber()
            const payload = {
                name: form.name,
                gender: form.gender,
                school_origin: form.school_origin,
                phone: form.phone,
                registration_number: regNum,
                status: 'mendaftar',
                wave_id: activeWave.id,
                program: form.program,
                metadata: {
                    father_name: form.father_name,
                    mother_name: form.mother_name,
                    address: form.address,
                    history: [{
                        action: 'STATUS_CHANGE',
                        from: 'draft',
                        to: 'mendaftar',
                        timestamp: new Date().toISOString(),
                        by: 'Pendaftaran Online'
                    }]
                }
            }

            const { error } = await supabase.from('enrollments').insert([payload])
            if (error) throw error

            setSuccessData({ regNum, name: form.name })
            setStep(3) // Success step
        } catch (err) {
            console.error(err)
            alert("Gagal mendaftar. Silakan coba lagi.")
        } finally {
            setSubmitting(false)
        }
    }

    if (loadingWave) return <div className="min-h-screen flex items-center justify-center bg-[var(--color-surface)]"><div className="w-10 h-10 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin"></div></div>

    if (!activeWave) return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--color-surface)] px-4 py-8 relative overflow-hidden transition-colors">
            <div className="absolute inset-0 pointer-events-none z-0">
                <div className="absolute top-[10%] -left-[10%] w-[400px] h-[400px] rounded-full bg-[var(--color-primary)]/10 blur-[80px]" />
                <div className="absolute bottom-[10%] -right-[10%] w-[500px] h-[500px] rounded-full bg-[var(--color-accent)]/10 blur-[100px]" />
            </div>
            
            <div className="w-full max-w-[420px] relative z-10 glass rounded-[2rem] p-8 shadow-2xl text-center">
                <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl">
                    <FontAwesomeIcon icon={faInfoCircle} />
                </div>
                <h2 className="text-2xl font-bold font-heading text-[var(--color-text)] mb-2">Pendaftaran Ditutup</h2>
                <p className="text-[var(--color-text-muted)] mb-6">Mohon maaf, saat ini tidak ada gelombang pendaftaran yang aktif.</p>
                <div className="space-y-3">
                    <Link to="/" className="btn btn-primary w-full py-3">Kembali ke Beranda</Link>
                    <Link to="/psb/status" className="btn bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] w-full py-3 text-xs font-bold uppercase tracking-wider block rounded-xl">
                        Cek Status Kelulusan & Daftar Ulang
                    </Link>
                </div>
            </div>
        </div>
    )

    if (step === 3) return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--color-surface)] px-4 py-8 relative overflow-hidden transition-colors">
            <div className="absolute inset-0 pointer-events-none z-0">
                <div className="absolute top-[20%] left-[20%] w-[400px] h-[400px] rounded-full bg-[var(--color-primary)]/20 blur-[100px]" />
                <div className="absolute bottom-[20%] right-[20%] w-[400px] h-[400px] rounded-full bg-[var(--color-accent)]/20 blur-[100px]" />
            </div>
            
            <div className="w-full max-w-[420px] relative z-10 glass rounded-[2rem] p-8 shadow-2xl text-center animate-in zoom-in-95 duration-500 overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[var(--color-primary)] via-[var(--color-accent)] to-[var(--color-primary)] opacity-50" />
                
                <div className="w-24 h-24 bg-[var(--color-primary)] text-white rounded-full flex items-center justify-center mx-auto mb-6 text-4xl shadow-xl shadow-[var(--color-primary)]/30 ring-8 ring-[var(--color-primary)]/10">
                    <FontAwesomeIcon icon={faCheckCircle} />
                </div>
                <h2 className="text-3xl font-bold font-heading text-[var(--color-text)] mb-2 tracking-tight">Alhamdulillah!</h2>
                <p className="text-[var(--color-text-muted)] mb-8 leading-relaxed">Pendaftaran atas nama <strong className="text-[var(--color-text)] font-black">{successData?.name}</strong> berhasil dikirim.</p>
                
                <div className="bg-[var(--color-surface-alt)]/50 border border-[var(--color-border)] rounded-3xl p-6 mb-8 relative">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)] mb-3">Nomor Pendaftaran Anda</p>
                    <p className="text-3xl font-black text-[var(--color-primary)] tracking-wider">{successData?.regNum}</p>
                </div>
                
                <p className="text-[13px] font-medium text-[var(--color-text-muted)] mb-8 leading-relaxed px-2">Silakan simpan (screenshot) halaman ini untuk mengecek status secara berkala. Kami akan segera menghubungi Anda via WhatsApp.</p>
                <Link to="/" className="btn btn-primary w-full py-4 text-sm font-bold shadow-lg shadow-[var(--color-primary)]/20">
                    Selesai
                </Link>
            </div>
        </div>
    )

    const STEPS = ['Identitas Calon Santri', 'Data Orang Tua / Wali', 'Alamat & Selesai']

    return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--color-surface)] relative overflow-hidden px-4 py-8 transition-colors">
            {/* Ambient Background Glows */}
            <div className="absolute inset-0 pointer-events-none z-0">
                <div className="absolute top-[10%] -left-[10%] w-[400px] h-[400px] rounded-full bg-[var(--color-primary)]/10 blur-[80px]" />
                <div className="absolute bottom-[10%] -right-[10%] w-[500px] h-[500px] rounded-full bg-[var(--color-accent)]/10 blur-[100px]" />
            </div>
            
            <div className="w-full max-w-[420px] space-y-6 relative z-10">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2.5 group">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                            <span className="text-white font-bold font-heading text-lg">L</span>
                        </div>
                        <span className="font-heading font-bold text-xl text-[var(--color-text)]">Laporan<span className="text-[var(--color-primary)]">mu</span></span>
                    </Link>
                    <button
                        onClick={toggleTheme}
                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)]/30 transition-all"
                        aria-label="Toggle theme"
                    >
                        <FontAwesomeIcon icon={isDark ? faSun : faMoon} className="text-sm" />
                    </button>
                </div>

                {/* Title */}
                <div className="text-center sm:text-left mt-8 mb-4">
                    <h1 className="text-2xl font-bold font-heading text-[var(--color-text)] mb-2">Pendaftaran Online</h1>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 flex-wrap">
                        <p className="text-sm text-[var(--color-text-muted)]">Gelombang Aktif: <span className="font-bold text-[var(--color-primary)]">{activeWave?.name}</span></p>
                        <Link to="/psb/status" className="text-xs font-bold text-[var(--color-primary)] hover:underline flex items-center gap-1">
                            Cek Status Kelulusan <FontAwesomeIcon icon={faArrowRight} className="text-[9px]" />
                        </Link>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-4 flex items-center justify-center gap-1.5">
                    {[0, 1, 2].map((i) => (
                        <div key={i} className="flex items-center">
                            <div className={`w-8 h-1.5 rounded-full transition-colors duration-300 ${i <= step ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'}`} />
                        </div>
                    ))}
                </div>

                {/* Form Card */}
                <div className="glass rounded-[2rem] p-5 sm:p-6 relative overflow-hidden shadow-2xl shadow-indigo-500/10 animate-in fade-in zoom-in duration-700">
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[var(--color-primary)] via-[var(--color-accent)] to-[var(--color-primary)] opacity-30" />

                    {step === 0 && (
                        <div className="space-y-3 animate-in fade-in slide-in-from-right-4 duration-500">
                            <div>
                                <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5 block pl-1">Nama Lengkap</label>
                                <input type="text" name="name" value={form.name} onChange={handleChange} placeholder="Sesuai Akte Kelahiran" className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/10 rounded-xl px-4 py-3 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] placeholder:opacity-50 transition-all outline-none font-medium" />
                            </div>
                            <div>
                                <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5 block pl-1">Jenis Kelamin</label>
                                <div className="flex gap-3">
                                    <label className={`flex-1 flex items-center justify-center gap-2 h-11 rounded-xl border cursor-pointer transition-all font-bold text-sm ${form.gender === 'L' ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]' : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)]/50'}`}>
                                        <input type="radio" name="gender" value="L" checked={form.gender === 'L'} onChange={handleChange} className="hidden" />
                                        Laki-laki
                                    </label>
                                    <label className={`flex-1 flex items-center justify-center gap-2 h-11 rounded-xl border cursor-pointer transition-all font-bold text-sm ${form.gender === 'P' ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-accent)]' : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:border-[var(--color-accent)]/50'}`}>
                                        <input type="radio" name="gender" value="P" checked={form.gender === 'P'} onChange={handleChange} className="hidden" />
                                        Perempuan
                                    </label>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5 block pl-1">Pilihan Program</label>
                                <div className="flex gap-3">
                                    <label className={`flex-1 flex flex-col items-center justify-center h-[52px] rounded-xl border cursor-pointer transition-all ${form.program === 'reguler' ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10' : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-primary)]/50'}`}>
                                        <input type="radio" name="program" value="reguler" checked={form.program === 'reguler'} onChange={handleChange} className="hidden" />
                                        <span className={`font-bold text-sm leading-none ${form.program === 'reguler' ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'}`}>Reguler</span>
                                        <span className={`text-[9px] font-medium mt-1 leading-none ${form.program === 'reguler' ? 'text-[var(--color-primary)]/70' : 'text-[var(--color-text-muted)]/70'}`}>Fullday</span>
                                    </label>
                                    <label className={`flex-1 flex flex-col items-center justify-center h-[52px] rounded-xl border cursor-pointer transition-all ${form.program === 'boarding' ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10' : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-primary)]/50'}`}>
                                        <input type="radio" name="program" value="boarding" checked={form.program === 'boarding'} onChange={handleChange} className="hidden" />
                                        <span className={`font-bold text-sm leading-none ${form.program === 'boarding' ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'}`}>Boarding</span>
                                        <span className={`text-[9px] font-medium mt-1 leading-none ${form.program === 'boarding' ? 'text-[var(--color-primary)]/70' : 'text-[var(--color-text-muted)]/70'}`}>Pondok</span>
                                    </label>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5 block pl-1">Asal Sekolah</label>
                                <input type="text" name="school_origin" value={form.school_origin} onChange={handleChange} placeholder="Cth: SDIT Mutiara Hati" className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/10 rounded-xl px-4 py-3 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] placeholder:opacity-50 transition-all outline-none font-medium" />
                            </div>
                        </div>
                    )}

                    {step === 1 && (
                        <div className="space-y-3 animate-in fade-in slide-in-from-right-4 duration-500">
                            <div>
                                <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5 block pl-1">Nama Ayah</label>
                                <input type="text" name="father_name" value={form.father_name} onChange={handleChange} placeholder="Nama lengkap Ayah" className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/10 rounded-xl px-4 py-3 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] placeholder:opacity-50 transition-all outline-none font-medium" />
                            </div>
                            <div>
                                <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5 block pl-1">Nama Ibu</label>
                                <input type="text" name="mother_name" value={form.mother_name} onChange={handleChange} placeholder="Nama lengkap Ibu" className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/10 rounded-xl px-4 py-3 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] placeholder:opacity-50 transition-all outline-none font-medium" />
                            </div>
                            <div>
                                <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5 block pl-1">No. HP / WhatsApp (Aktif)</label>
                                <input type="tel" name="phone" value={form.phone} onChange={handleChange} placeholder="08xxxxxxxxxx" className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/10 rounded-xl px-4 py-3 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] placeholder:opacity-50 transition-all outline-none font-medium tabular-nums" />
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-3 animate-in fade-in slide-in-from-right-4 duration-500">
                            <div>
                                <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5 block pl-1">Alamat Domisili</label>
                                <textarea name="address" value={form.address} onChange={handleChange} placeholder="Jalan, RT/RW, Desa, Kecamatan..." className="w-full h-28 bg-[var(--color-surface)] border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/10 rounded-xl p-4 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] placeholder:opacity-50 transition-all outline-none font-bold resize-none" />
                            </div>
                            <div className="p-3.5 rounded-xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 flex gap-3 text-[var(--color-primary)] text-sm font-medium">
                                <FontAwesomeIcon icon={faInfoCircle} className="mt-0.5 shrink-0" />
                                <p className="text-xs leading-relaxed text-[var(--color-text)]">Pastikan data sudah benar. Pihak pesantren akan menghubungi Anda via WhatsApp setelah data masuk.</p>
                            </div>
                        </div>
                    )}

                    {/* Footer Actions */}
                    <div className="flex items-center gap-3 mt-4 pt-4 border-t border-[var(--color-border)]/50">
                        {step > 0 && (
                            <button onClick={() => setStep(s => s - 1)} className="btn bg-[var(--color-surface-alt)] text-[var(--color-text)] border border-[var(--color-border)] hover:bg-[var(--color-border)] py-3 px-5 transition-all text-sm font-bold shadow-none">
                                <FontAwesomeIcon icon={faArrowLeft} />
                            </button>
                        )}
                        {step < 2 ? (
                            <button disabled={!canNext()} onClick={() => setStep(s => s + 1)} className="btn btn-primary flex-1 w-full py-3 transition-all text-sm font-bold shadow-lg shadow-[var(--color-primary)]/20">
                                Lanjut <FontAwesomeIcon icon={faArrowRight} className="ml-2" />
                            </button>
                        ) : (
                            <button disabled={submitting || !canNext()} onClick={handleSubmit} className="btn btn-primary flex-1 w-full py-3 transition-all text-sm font-bold shadow-lg shadow-[var(--color-primary)]/20">
                                {submitting ? 'Memproses...' : 'Kirim Form'}
                            </button>
                        )}
                    </div>
                </div>

                {/* Footer Links */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2 pt-4 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300">
                    <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">
                        <Link to="/check" className="hover:text-[var(--color-primary)] transition-colors">Wali Murid</Link>
                        <span className="w-1 h-1 rounded-full bg-[var(--color-border)]" />
                        <Link to="/login" className="hover:text-[var(--color-primary)] transition-colors">Guru/Staff Login</Link>
                    </div>
                    <Link to="/" className="text-[11px] font-bold text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-all flex items-center gap-2">
                        <span>← Beranda</span>
                    </Link>
                </div>
            </div>
        </div>
    )
}
