import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight, CircleCheck, Info, Moon, Sun, TriangleAlert } from 'lucide-react'
import { supabase } from '@lib/supabase'
import { useTheme } from '@context/Theme'

const generateRegNumber = () => {
    return `PSB-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`
}

/* Label chip kecil di atas input */
const Label = ({ children }) => (
    <label className="text-xs font-bold uppercase tracking-wider text-text-muted mb-1.5 block pl-1">{children}</label>
)

/* Style input form yang konsisten */
const inputCls = "w-full bg-surface border border-border focus:border-primary focus:ring-4 focus:ring-primary/10 rounded-xl px-4 py-3 text-sm text-text placeholder:text-text-muted placeholder:opacity-50 transition-all outline-none font-medium"

export default function EnrollmentPage() {
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
    const [errorMsg, setErrorMsg] = useState('')

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
        if (!activeWave) {
            setErrorMsg("Maaf, gelombang pendaftaran saat ini ditutup.")
            return
        }
        setSubmitting(true)
        setErrorMsg('')
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
            setErrorMsg("Gagal mendaftar. Periksa koneksi internet Anda lalu coba lagi.")
        } finally {
            setSubmitting(false)
        }
    }

    if (loadingWave) return (
        <div className="min-h-screen flex items-center justify-center bg-surface">
            <div className="w-10 h-10 border-[3px] border-primary border-t-transparent rounded-full animate-spin" />
        </div>
    )

    if (!activeWave) return (
        <div className="min-h-screen flex items-center justify-center bg-surface px-4 py-8 transition-colors">
            <div className="w-full max-w-[420px] bg-surface border border-border rounded-[2rem] p-8 shadow-sm text-center relative overflow-hidden animate-in fade-in zoom-in duration-500">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-primary opacity-30" />

                <div className="w-20 h-20 bg-warning/10 text-warning rounded-full flex items-center justify-center mx-auto mb-6">
                    <Info className="w-7 h-7" />
                </div>
                <h2 className="text-2xl font-bold text-text mb-2 tracking-tight">Pendaftaran Ditutup</h2>
                <p className="text-text-muted text-sm mb-8 leading-relaxed">Mohon maaf, saat ini tidak ada gelombang pendaftaran yang aktif. Pantau halaman informasi untuk jadwal gelombang berikutnya.</p>
                <div className="space-y-3">
                    <Link to="/psb/status" className="btn btn-primary w-full py-3">
                        Cek Status Kelulusan &amp; Daftar Ulang
                    </Link>
                    <Link to="/informasi" className="btn bg-surface-alt border border-border text-text-muted hover:text-text w-full py-3 text-xs font-bold uppercase tracking-wider block rounded-xl">
                        Lihat Informasi Terkini
                    </Link>
                    <Link to="/" className="block text-xs font-bold text-text-muted hover:text-text transition-colors pt-2">
                        ← Kembali ke Beranda
                    </Link>
                </div>
            </div>
        </div>
    )

    if (step === 3) return (
        <div className="min-h-screen flex items-center justify-center bg-surface px-4 py-8 transition-colors">
            <div className="w-full max-w-[420px] bg-surface border border-border rounded-[2rem] p-8 shadow-sm text-center animate-in zoom-in-95 duration-500 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-primary opacity-50" />

                <div className="w-24 h-24 bg-primary text-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl ring-8 ring-primary/10">
                    <CircleCheck className="w-8 h-8" />
                </div>
                <h2 className="text-3xl font-bold text-text mb-2 tracking-tight">Alhamdulillah!</h2>
                <p className="text-text-muted text-sm mb-8 leading-relaxed">Pendaftaran atas nama <strong className="text-text font-bold">{successData?.name}</strong> berhasil dikirim.</p>

                <div className="bg-surface-alt/50 border border-border rounded-2xl p-6 mb-8 relative">
                    <p className="text-xs font-bold uppercase tracking-wide text-text-muted mb-3">Nomor Pendaftaran Anda</p>
                    <p className="text-3xl font-bold text-primary tracking-wider">{successData?.regNum}</p>
                </div>

                <p className="text-sm font-medium text-text-muted mb-8 leading-relaxed px-2">Silakan simpan (screenshot) halaman ini untuk mengecek status secara berkala. Kami akan segera menghubungi Anda via WhatsApp.</p>

                <div className="space-y-3">
                    <Link to="/psb/status" className="btn btn-primary w-full py-3.5 text-sm font-bold">
                        Cek Status Pendaftaran
                    </Link>
                    <Link to="/" className="btn bg-surface-alt border border-border text-text-muted hover:text-text w-full py-3 text-xs font-bold uppercase tracking-wider block rounded-xl">
                        Selesai
                    </Link>
                </div>
            </div>
        </div>
    )

    const STEPS = ['Identitas Santri', 'Data Orang Tua', 'Alamat']

    return (
        <div className="min-h-screen flex items-center justify-center bg-surface relative overflow-hidden px-4 py-8 transition-colors">
            {/* Ambient glow halus */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
                <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[500px] h-[300px] rounded-full bg-primary/[0.06] blur-3xl" />
            </div>

            <div className="w-full max-w-[420px] space-y-6 relative">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2.5 group">
                        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                            <span className="text-white font-bold text-lg">L</span>
                        </div>
                        <span className="font-bold text-xl text-text tracking-tight">Laporan<span className="text-primary">mu</span></span>
                    </Link>
                    <button
                        onClick={toggleTheme}
                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-surface-alt border border-border text-text-muted hover:text-primary hover:border-primary/30 transition-all"
                        aria-label="Toggle theme"
                    >
                        {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                    </button>
                </div>

                {/* Title */}
                <div className="text-center sm:text-left mt-8 mb-4">
                    <h1 className="text-2xl font-bold text-text mb-2 tracking-tight">Pendaftaran Online</h1>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 flex-wrap">
                        <p className="text-sm text-text-muted">Gelombang Aktif: <span className="font-bold text-primary">{activeWave?.name}</span></p>
                        <Link to="/psb/status" className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
                            Cek Status Kelulusan <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                    </div>
                </div>

                {/* Step Indicator */}
                <div className="flex items-center gap-2 mb-2">
                    {STEPS.map((label, i) => (
                        <React.Fragment key={i}>
                            <div className="flex items-center gap-2">
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 shrink-0 ${
                                    i < step ? 'bg-primary text-white'
                                    : i === step ? 'bg-primary text-white ring-4 ring-primary/15'
                                    : 'bg-surface-alt text-text-muted border border-border'
                                }`}>
                                    {i < step ? <CircleCheck className="w-4 h-4" /> : i + 1}
                                </div>
                                <span className={`text-xs font-bold hidden sm:block ${i === step ? 'text-text' : 'text-text-muted'}`}>{label}</span>
                            </div>
                            {i < STEPS.length - 1 && (
                                <div className={`h-0.5 flex-1 rounded-full transition-colors duration-300 ${i < step ? 'bg-primary' : 'bg-border'}`} />
                            )}
                        </React.Fragment>
                    ))}
                </div>

                {/* Error banner inline */}
                {errorMsg && (
                    <div className="p-3.5 rounded-xl bg-danger/10 border border-danger/20 text-xs font-bold text-danger text-left flex items-start gap-2.5 animate-in fade-in slide-in-from-top-2 duration-300">
                        <TriangleAlert className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{errorMsg}</span>
                    </div>
                )}

                {/* Form Card */}
                <div className="bg-surface border border-border rounded-[2rem] p-5 sm:p-6 relative overflow-hidden shadow-sm animate-in fade-in zoom-in duration-700">
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-primary opacity-30" />

                    {step === 0 && (
                        <div className="space-y-3 animate-in fade-in slide-in-from-right-4 duration-500">
                            <div>
                                <Label>Nama Lengkap</Label>
                                <input type="text" name="name" value={form.name} onChange={handleChange} placeholder="Sesuai Akte Kelahiran" className={inputCls} />
                            </div>
                            <div>
                                <Label>Jenis Kelamin</Label>
                                <div className="flex gap-3">
                                    <label className={`flex-1 flex items-center justify-center gap-2 h-11 rounded-xl border cursor-pointer transition-all font-bold text-sm ${form.gender === 'L' ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-surface text-text-muted hover:border-primary/50'}`}>
                                        <input type="radio" name="gender" value="L" checked={form.gender === 'L'} onChange={handleChange} className="hidden" />
                                        Laki-laki
                                    </label>
                                    <label className={`flex-1 flex items-center justify-center gap-2 h-11 rounded-xl border cursor-pointer transition-all font-bold text-sm ${form.gender === 'P' ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-surface text-text-muted hover:border-primary/50'}`}>
                                        <input type="radio" name="gender" value="P" checked={form.gender === 'P'} onChange={handleChange} className="hidden" />
                                        Perempuan
                                    </label>
                                </div>
                            </div>
                            <div>
                                <Label>Pilihan Program</Label>
                                <div className="flex gap-3">
                                    <label className={`flex-1 flex flex-col items-center justify-center h-[52px] rounded-xl border cursor-pointer transition-all ${form.program === 'reguler' ? 'border-primary bg-primary/10' : 'border-border bg-surface hover:border-primary/50'}`}>
                                        <input type="radio" name="program" value="reguler" checked={form.program === 'reguler'} onChange={handleChange} className="hidden" />
                                        <span className={`font-bold text-sm leading-none ${form.program === 'reguler' ? 'text-primary' : 'text-text-muted'}`}>Reguler</span>
                                        <span className={`text-xs font-medium mt-1 leading-none ${form.program === 'reguler' ? 'text-primary/70' : 'text-text-muted/70'}`}>Fullday</span>
                                    </label>
                                    <label className={`flex-1 flex flex-col items-center justify-center h-[52px] rounded-xl border cursor-pointer transition-all ${form.program === 'boarding' ? 'border-primary bg-primary/10' : 'border-border bg-surface hover:border-primary/50'}`}>
                                        <input type="radio" name="program" value="boarding" checked={form.program === 'boarding'} onChange={handleChange} className="hidden" />
                                        <span className={`font-bold text-sm leading-none ${form.program === 'boarding' ? 'text-primary' : 'text-text-muted'}`}>Boarding</span>
                                        <span className={`text-xs font-medium mt-1 leading-none ${form.program === 'boarding' ? 'text-primary/70' : 'text-text-muted/70'}`}>Pondok</span>
                                    </label>
                                </div>
                            </div>
                            <div>
                                <Label>Asal Sekolah</Label>
                                <input type="text" name="school_origin" value={form.school_origin} onChange={handleChange} placeholder="Cth: SDIT Mutiara Hati" className={inputCls} />
                            </div>
                        </div>
                    )}

                    {step === 1 && (
                        <div className="space-y-3 animate-in fade-in slide-in-from-right-4 duration-500">
                            <div>
                                <Label>Nama Ayah</Label>
                                <input type="text" name="father_name" value={form.father_name} onChange={handleChange} placeholder="Nama lengkap Ayah" className={inputCls} />
                            </div>
                            <div>
                                <Label>Nama Ibu</Label>
                                <input type="text" name="mother_name" value={form.mother_name} onChange={handleChange} placeholder="Nama lengkap Ibu" className={inputCls} />
                            </div>
                            <div>
                                <Label>No. HP / WhatsApp (Aktif)</Label>
                                <input type="tel" name="phone" value={form.phone} onChange={handleChange} placeholder="08xxxxxxxxxx" className={`${inputCls} tabular-nums`} />
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-3 animate-in fade-in slide-in-from-right-4 duration-500">
                            <div>
                                <Label>Alamat Domisili</Label>
                                <textarea name="address" value={form.address} onChange={handleChange} placeholder="Jalan, RT/RW, Desa, Kecamatan..." className={`${inputCls} h-28 p-4 resize-none`} />
                            </div>
                            <div className="p-3.5 rounded-xl bg-primary/10 border border-primary/20 flex gap-3">
                                <Info className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
                                <p className="text-xs leading-relaxed text-text">Pastikan data sudah benar. Pihak pesantren akan menghubungi Anda via WhatsApp setelah data masuk.</p>
                            </div>
                        </div>
                    )}

                    {/* Footer Actions */}
                    <div className="flex items-center gap-3 mt-4 pt-4 border-t border-border/50">
                        {step > 0 && (
                            <button onClick={() => { setStep(s => s - 1); setErrorMsg('') }} className="btn bg-surface-alt text-text border border-border hover:bg-border py-3 px-5 transition-all text-sm font-bold shadow-none">
                                <ArrowLeft className="w-4 h-4" />
                            </button>
                        )}
                        {step < 2 ? (
                            <button disabled={!canNext()} onClick={() => setStep(s => s + 1)} className="btn btn-primary flex-1 w-full py-3 transition-all text-sm font-bold">
                                Lanjut <ArrowRight className="w-4 h-4 ml-2" />
                            </button>
                        ) : (
                            <button disabled={submitting || !canNext()} onClick={handleSubmit} className="btn btn-primary flex-1 w-full py-3 transition-all text-sm font-bold">
                                {submitting ? 'Memproses...' : 'Kirim Form'}
                            </button>
                        )}
                    </div>
                </div>

                {/* Footer Links */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2 pt-4 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300">
                    <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-wide text-text-muted">
                        <Link to="/check" className="hover:text-primary transition-colors">Wali Murid</Link>
                        <span className="w-1 h-1 rounded-full bg-border" />
                        <Link to="/login" className="hover:text-primary transition-colors">Guru/Staff Login</Link>
                    </div>
                    <Link to="/" className="text-xs font-bold text-text-muted hover:text-text transition-all flex items-center gap-2">
                        <span>← Beranda</span>
                    </Link>
                </div>
            </div>
        </div>
    )
}
