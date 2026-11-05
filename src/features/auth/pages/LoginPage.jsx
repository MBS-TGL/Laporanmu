import { useState, useRef, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'


import { useAuth, useToast, useTheme } from '@context'
import { Modal } from '@shared/components'
import { ArrowRight, Eye, EyeOff, GraduationCap, IdCard, Key, Laptop, LoaderCircle, Lock, Mail, Moon, Shield, Sun, TriangleAlert } from 'lucide-react'

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [rememberMe, setRememberMe] = useState(false)
    const [capsLockOn, setCapsLockOn] = useState(false)
    const [loading, setLoading] = useState(false)
    const [errorMessage, setErrorMessage] = useState('')
    const { signIn, isDemoMode } = useAuth()
    const { addToast } = useToast()
    const { isDark, toggleTheme } = useTheme()
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const sessionReason = searchParams.get('reason')
    const [showHelpModal, setShowHelpModal] = useState(false)
    const [showDemoDrawer, setShowDemoDrawer] = useState(false)
    const [isShaking, setIsShaking] = useState(false)
    const emailInputRef = useRef(null)
    const passwordInputRef = useRef(null)

    const MAX_ATTEMPTS = 5;
    const COOLDOWN_DURATION = 60 * 1000; // 60 seconds

    const [loginAttempts, setLoginAttempts] = useState(() => {
        const stored = localStorage.getItem('loginAttempts');
        return stored ? parseInt(stored) : 0;
    });

    const [lockoutUntil, setLockoutUntil] = useState(() => {
        const stored = localStorage.getItem('lockoutUntil');
        return stored ? parseInt(stored) : null;
    });

    const [cooldownRemaining, setCooldownRemaining] = useState(0);

    useEffect(() => {
        document.title = 'Laporanmu - Login Staff & Guru'
        return () => {
            document.title = 'Laporanmu'
        }
    }, [])

    useEffect(() => {
        if (!lockoutUntil) return;

        const checkCooldown = () => {
            const now = Date.now();
            if (now >= lockoutUntil) {
                setLockoutUntil(null);
                setLoginAttempts(0);
                localStorage.removeItem('lockoutUntil');
                localStorage.removeItem('loginAttempts');
                setCooldownRemaining(0);
                setErrorMessage('');
            } else {
                setCooldownRemaining(Math.ceil((lockoutUntil - now) / 1000));
            }
        };

        checkCooldown();
        const interval = setInterval(checkCooldown, 1000);
        return () => clearInterval(interval);
    }, [lockoutUntil]);

    useEffect(() => {
        if (!lockoutUntil) {
            // Load remembered email
            const savedEmail = localStorage.getItem('laporanmu_remembered_email')
            if (savedEmail) {
                setEmail(savedEmail)
                setRememberMe(true)
                // If we have saved email, focus password instead
                setTimeout(() => passwordInputRef.current?.focus(), 100)
            } else {
                emailInputRef.current?.focus()
            }
        }
    }, [lockoutUntil])

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (cooldownRemaining > 0) {
            setErrorMessage(`Terlalu banyak percobaan. Silakan coba lagi dalam ${cooldownRemaining} detik.`)
            return
        }

        if (!email || !password) {
            setErrorMessage('Silakan isi email dan password')
            setIsShaking(true)
            setTimeout(() => setIsShaking(false), 500)
            return
        }
        if (!/\S+@\S+\.\S+/.test(email)) {
            setErrorMessage('Format email tidak valid')
            setIsShaking(true)
            setTimeout(() => setIsShaking(false), 500)
            return
        }

        setLoading(true)
        const { error } = await signIn(email, password, rememberMe)
        setLoading(false)

        if (error) {
            setIsShaking(true)
            setTimeout(() => setIsShaking(false), 500)
            const newAttempts = loginAttempts + 1;
            setLoginAttempts(newAttempts);
            localStorage.setItem('loginAttempts', newAttempts.toString());

            if (newAttempts >= MAX_ATTEMPTS) {
                const lockoutTime = Date.now() + COOLDOWN_DURATION;
                setLockoutUntil(lockoutTime);
                localStorage.setItem('lockoutUntil', lockoutTime.toString());
                setErrorMessage(`Terlalu banyak percobaan gagal. Silakan coba lagi dalam 60 detik.`);
                addToast('Akses ditangguhkan sementara demi keamanan.', 'error');
            } else {
                const remaining = MAX_ATTEMPTS - newAttempts;
                const msg = error.message || 'Login gagal, periksa kembali email dan password.';
                setErrorMessage(`${msg} (Sisa percobaan: ${remaining})`);
            }
            return
        }

        // Handle "Remember Me" persistence
        if (rememberMe) {
            localStorage.setItem('laporanmu_remembered_email', email)
        } else {
            localStorage.removeItem('laporanmu_remembered_email')
        }

        // Reset on success
        setLoginAttempts(0);
        localStorage.removeItem('loginAttempts');
        localStorage.removeItem('lockoutUntil');

        setErrorMessage('')
        addToast('Login berhasil! Selamat datang.', 'success')
        navigate('/dashboard')
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--color-surface)] relative overflow-hidden px-4 py-8 transition-colors">
            {/* Ambient Background Glows */}
            <div className="absolute inset-0 pointer-events-none z-0">
            </div>

            <div className="w-full max-w-[420px] space-y-6 relative z-10">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2.5 group">
                        <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)] flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                            <span className="text-white font-bold font-heading text-lg">L</span>
                        </div>
                        <span className="font-heading font-bold text-xl text-[var(--color-text)]">Laporan<span className="text-[var(--color-primary)]">mu</span></span>
                    </Link>
                    <button
                        onClick={toggleTheme}
                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)]/30 transition-all"
                        aria-label="Toggle theme"
                    >
                        { isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" /> }
                    </button>
                </div>

                {/* Title */}
                <div className="text-center sm:text-left mt-8 mb-4">
                    <h1 className="text-2xl font-bold font-heading text-[var(--color-text)] mb-2">Masuk ke Akun Anda</h1>
                    <p className="text-sm text-[var(--color-text-muted)]">Portal khusus staff & guru sekolah</p>
                </div>

                {/* Demo Trigger Button (Subtle) */}
                {!showDemoDrawer && (
                    <div className="flex flex-col items-center gap-2 animate-in fade-in slide-in-from-top-4 duration-1000">
                        <button
                            type="button"
                            onClick={() => {
                                if (!isDemoMode) {
                                    localStorage.setItem('laporanmu_force_demo', 'true')
                                    window.location.reload()
                                } else {
                                    setShowDemoDrawer(true)
                                }
                            }}
                            className="text-xs font-bold uppercase tracking-wide text-amber-600/60 hover:text-amber-600 bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/10 px-4 py-1.5 rounded-full transition-all flex items-center gap-2 group"
                        >
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 group-hover:scale-125 transition-transform animate-pulse" />
                            {isDemoMode ? "Punya Akun Demo? Klik di sini" : "Aktifkan Demo Mode"}
                        </button>
                        {isDemoMode && (import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY) && (
                            <button
                                type="button"
                                onClick={() => {
                                    localStorage.removeItem('laporanmu_force_demo')
                                    window.location.reload()
                                }}
                                className="text-xs font-bold uppercase tracking-wide text-indigo-500 hover:text-indigo-600 hover:underline transition-all"
                            >
                                Kembali ke Mode Database (Real)
                            </button>
                        )}
                    </div>
                )}

                {/* Session Expired Banner */}
                {sessionReason === 'session_expired' && (
                    <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-600 flex items-center justify-center shrink-0">
                            <TriangleAlert className="w-4 h-4" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-amber-700">Sesi telah berakhir</p>
                            <p className="text-xs text-amber-600/80 mt-0.5 leading-relaxed">
                                Sesi kamu dicabut oleh administrator. Silakan login kembali.
                            </p>
                        </div>
                    </div>
                )}

                {/* Form Card */}
                <div className={`bg-surface border border-border rounded-[2rem] p-6 sm:p-8 animate-in fade-in zoom-in duration-700 overflow-hidden relative shadow-xl ${isShaking ? 'animate-shake' : ''}`}>
                    {/* Visual Accent */}
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-[var(--color-primary)] opacity-30" />

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider pl-1">Email</label>
                            <div className="relative">
                                <Mail className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] opacity-70" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="nama@laporan.mu"
                                    ref={emailInputRef}
                                    onKeyDown={(e) => {
                                        setCapsLockOn(e.getModifierState('CapsLock'))
                                        if (e.key === 'Enter') {
                                            e.preventDefault()
                                            passwordInputRef.current?.focus()
                                        }
                                    }}
                                    className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/10 rounded-xl pl-11 pr-4 py-3.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] placeholder:opacity-50 transition-all outline-none"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider pl-1">Password</label>
                            <div className="relative">
                                <Lock className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] opacity-70" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    onKeyDown={(e) => setCapsLockOn(e.getModifierState('CapsLock'))}
                                    ref={passwordInputRef}
                                    placeholder="••••••••"
                                    className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/10 rounded-xl pl-11 pr-12 py-3.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] placeholder:opacity-50 transition-all outline-none"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(prev => !prev)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors p-2"
                                    aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                                >
                                    { showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" /> }
                                </button>
                            </div>
                            <div className="flex items-center justify-between px-1">
                                {capsLockOn ? (
                                    <p className="text-xs text-amber-500 font-bold uppercase tracking-wide flex items-center gap-1.5 animate-pulse">
                                        <TriangleAlert className="w-4 h-4" /> Caps Lock Aktif
                                    </p>
                                ) : <div />}
                                <button
                                    type="button"
                                    onClick={() => setShowHelpModal(true)}
                                    className="text-xs font-bold text-[var(--color-primary)] hover:text-[var(--color-accent)] transition-colors hover:underline"
                                >
                                    Lupa password?
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 pl-1 select-none">
                            <input
                                type="checkbox"
                                id="rememberMe"
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                                className="w-4 h-4 rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)] focus:ring-offset-[var(--color-surface)] bg-[var(--color-surface)] transition-all cursor-pointer"
                            />
                            <label htmlFor="rememberMe" className="text-sm text-[var(--color-text)] font-medium cursor-pointer">
                                Ingat saya
                            </label>
                        </div>

                        {errorMessage && (
                            <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center shrink-0">!</div>
                                <p className="text-xs font-medium text-red-500">
                                    {errorMessage}
                                </p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading || cooldownRemaining > 0}
                            className={`btn btn-primary w-full py-3.5 mt-2 shadow-lg ${(loading || cooldownRemaining > 0) ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                            {loading ? (
                                <><LoaderCircle className="w-4 h-4 animate-spin" /> Memproses...</>
                            ) : cooldownRemaining > 0 ? (
                                <>Coba lagi dalam {cooldownRemaining}s</>
                            ) : (
                                <>Masuk <ArrowRight className="w-4 h-4 ml-1" /></>
                            )}
                        </button>
                    </form>
                </div>

                {/* Footer Links */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300">
                    <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
                        <Link to="/check" className="hover:text-[var(--color-primary)] transition-colors">Wali Murid</Link>
                        <span className="w-1 h-1 rounded-full bg-[var(--color-border)]" />
                        <Link to="/informasi" className="hover:text-[var(--color-primary)] transition-colors">Informasi</Link>
                        <span className="w-1 h-1 rounded-full bg-[var(--color-border)]" />
                        <Link to="/psb" className="hover:text-[var(--color-primary)] transition-colors">PSB</Link>
                    </div>
                    <Link to="/" className="text-xs font-bold text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-all flex items-center gap-2">
                        <span>← Beranda</span>
                    </Link>
                </div>
            </div>

            {/* Help Modal */}
            <Modal
                isOpen={showHelpModal}
                onClose={() => setShowHelpModal(false)}
                title="Bantuan Login"
                size="sm"
                icon={Key}
                iconBg="bg-indigo-500/10"
                iconColor="text-indigo-500"
            >
                <div className="text-center">
                    <p className="text-sm text-[var(--color-text-muted)] mb-8 leading-relaxed">
                        Akses ditangguhkan atau lupa kata sandi? Silakan hubungi <span className="font-bold text-[var(--color-text)]">Admin Sekolah</span> atau <span className="font-bold text-[var(--color-text)]">Staf IT</span> melalui WhatsApp atau datang langsung ke ruang administrasi untuk mereset akun Anda.
                    </p>
                    <button
                        onClick={() => setShowHelpModal(false)}
                        className="btn btn-primary w-full py-4 text-xs font-bold uppercase tracking-wide"
                    >
                        Saya Mengerti
                    </button>
                </div>
            </Modal>

            {/* Demo Access Drawer/Modal */}
            <Modal
                isOpen={showDemoDrawer}
                onClose={() => setShowDemoDrawer(false)}
                title="Akun Demo"
                description={
                    <span className="text-amber-500 font-bold uppercase tracking-wide text-xs">
                        Gunakan password: demo123
                    </span>
                }
                icon={Key}
                iconBg="bg-amber-500/10"
                iconColor="text-amber-500"
                size="md"
                mobileVariant="bottom-sheet"
            >
                <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                    {[
                        { role: 'Developer', email: 'dev@laporanmu.id', desc: 'Akses penuh fitur sistem', Icon: Laptop, color: 'text-indigo-500 bg-indigo-500/10' },
                        { role: 'Admin', email: 'admin@laporanmu.id', desc: 'Manajemen data & user', Icon: Shield, color: 'text-rose-500 bg-rose-500/10' },
                        { role: 'Guru', email: 'guru@laporanmu.id', desc: 'Input nilai & presensi', Icon: GraduationCap, color: 'text-violet-500 bg-violet-500/10' },
                        { role: 'Satpam', email: 'satpam@laporanmu.id', desc: 'Buku tamu & izin keluar', Icon: IdCard, color: 'text-amber-500 bg-amber-500/10' },
                        { role: 'Viewer', email: 'viewer@laporanmu.id', desc: 'Hanya melihat dashboard', Icon: Eye, color: 'text-emerald-500 bg-emerald-500/10' },
                    ].map(u => (
                        <button
                            key={u.role}
                            type="button"
                            onClick={() => { setEmail(u.email); setPassword('demo123'); setShowDemoDrawer(false) }}
                            className="w-full flex items-center gap-4 p-4 rounded-2xl border border-[var(--color-border)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 transition-all group text-left"
                        >
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all ${u.color}`}>
                                <u.Icon className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-0.5">
                                    <span className="text-xs font-bold uppercase tracking-wider">{u.role}</span>
                                    <code className="text-xs font-mono text-[var(--color-text-muted)]">{u.email}</code>
                                </div>
                                <p className="text-xs text-[var(--color-text-muted)]">{u.desc}</p>
                            </div>
                        </button>
                    ))}
                </div>
            </Modal>
        </div>
    )
}