import { useState, useEffect, useRef, useMemo } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faBell, faShieldAlt, faSpinner, faMoon, faSun,
    faCamera, faCheck, faXmark, faTrash,
    faEye, faEyeSlash, faEnvelope, faIdBadge, faClock,
    faTriangleExclamation
} from '@fortawesome/free-solid-svg-icons'
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons'
import DashboardLayout from '@core/layouts/DashboardLayout'
import Breadcrumb from '@shared/components/Breadcrumb'
import { useTheme } from '@context/Theme'
import { useToast } from '@context/Toast'
import { useAuth } from '@context/Auth'
import { supabase } from '@lib/supabase'
import { logAudit } from '@utils/auditLogger'

// ─── Constants ───────────────────────────────────────────────────────────────

const ROLE_META = {
    developer: { label: 'Developer', color: 'text-rose-600', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
    admin: { label: 'Admin', color: 'text-purple-600', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
    guru: { label: 'Guru', color: 'text-indigo-600', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20' },
    karyawan: { label: 'Karyawan', color: 'text-green-600', bg: 'bg-green-500/10', border: 'border-green-500/20' },
    satpam: { label: 'Satpam', color: 'text-blue-600', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
    viewer: { label: 'Viewer', color: 'text-gray-500', bg: 'bg-gray-500/10', border: 'border-gray-500/20' },
}

// ─── Pure Helpers (outside component to avoid re-creation on every render) ───

/**
 * Format a date string to Indonesian locale.
 * Returns '—' if the string is null/undefined or unparseable.
 */
function formatDate(dateString, options = {}) {
    if (!dateString) return '—'
    try {
        return new Date(dateString).toLocaleDateString('id-ID', options)
    } catch {
        return '—'
    }
}

/**
 * Compute password strength based on length AND character variety.
 * Consistent with the security tips shown in the sidebar (min 12 chars,
 * uppercase + lowercase + number + symbol).
 *
 * Returns { label, color, bars } — bars is 0–4.
 */
function computePwStrength(password) {
    if (!password) return { label: '', color: '', bars: 0 }

    const hasUpper = /[A-Z]/.test(password)
    const hasLower = /[a-z]/.test(password)
    const hasNumber = /[0-9]/.test(password)
    const hasSymbol = /[^A-Za-z0-9]/.test(password)
    const varietyScore = [hasUpper, hasLower, hasNumber, hasSymbol].filter(Boolean).length

    if (password.length >= 12 && varietyScore === 4) return { label: 'Kuat', color: 'bg-emerald-400', bars: 4 }
    if (password.length >= 10 && varietyScore >= 3) return { label: 'Cukup', color: 'bg-amber-400', bars: 3 }
    if (password.length >= 6 && varietyScore >= 2) return { label: 'Lemah', color: 'bg-red-400', bars: 2 }
    return { label: 'Sangat Lemah', color: 'bg-red-600', bars: 1 }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Divider() {
    return <div className="h-px bg-[var(--color-border)] my-5" />
}

function Toggle({ checked, onChange, disabled = false }) {
    return (
        <button
            onClick={() => !disabled && onChange(!checked)}
            type="button"
            disabled={disabled}
            className={`w-12 h-7 rounded-full transition-colors shrink-0 relative shadow-inner cursor-pointer 
                ${disabled ? 'opacity-40 cursor-not-allowed' : ''}
                ${checked ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'}`}
        >
            <span className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-200 
                ${checked ? 'translate-x-5' : 'translate-x-0'}`}
            />
        </button>
    )
}

/** Field label — renamed from `FL` for readability */
function FieldLabel({ children }) {
    return (
        <label className="block text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-2 ml-0.5">
            {children}
        </label>
    )
}

function PwInput({ label, value, onChange }) {
    const [show, setShow] = useState(false)
    return (
        <div>
            <FieldLabel>{label}</FieldLabel>
            <div className="relative">
                <input
                    type={show ? 'text' : 'password'}
                    value={value}
                    onChange={onChange}
                    placeholder="••••••••"
                    className="input-field font-bold text-sm h-11 pr-10 w-full"
                />
                <button
                    type="button"
                    onClick={() => setShow(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
                >
                    <FontAwesomeIcon icon={show ? faEyeSlash : faEye} className="text-xs" />
                </button>
            </div>
        </div>
    )
}

/**
 * Confirm dialog for password change.
 * Shown before actually calling the Supabase update.
 */
function ConfirmPwModal({ onConfirm, onCancel }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="glass rounded-2xl border border-[var(--color-border)] p-6 w-full max-w-sm shadow-2xl">
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                        <FontAwesomeIcon icon={faTriangleExclamation} />
                    </div>
                    <p className="font-black text-[var(--color-text)] text-sm">Konfirmasi Ubah Password</p>
                </div>
                <p className="text-[11px] text-[var(--color-text-muted)] mb-5 leading-relaxed">
                    Kamu akan mengubah password akun ini. Pastikan kamu mengingat password baru sebelum melanjutkan.
                </p>
                <div className="flex gap-2 justify-end">
                    <button
                        onClick={onCancel}
                        className="h-9 px-4 rounded-xl border border-[var(--color-border)] text-[10px] font-black text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-all flex items-center gap-1.5"
                    >
                        <FontAwesomeIcon icon={faXmark} className="text-[9px]" /> Batal
                    </button>
                    <button
                        onClick={onConfirm}
                        className="h-9 px-4 rounded-xl bg-[var(--color-primary)] text-white text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all flex items-center gap-2 shadow-lg shadow-[var(--color-primary)]/20"
                    >
                        <FontAwesomeIcon icon={faShieldAlt} /> Ya, Ubah
                    </button>
                </div>
            </div>
        </div>
    )
}

/**
 * AvatarUpload
 * - Uploads new photo to `user-photo` bucket
 * - Deletes photo and resets to initials
 * - Calls onAvatarChange(url | null) so the parent can update AuthContext
 *   directly → navbar stays in sync without needing refreshProfile
 */
function AvatarUpload({ profile, onAvatarChange }) {
    const { addToast } = useToast()
    const fileRef = useRef(null)
    const [uploading, setUploading] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || null)
    const [imgError, setImgError] = useState(false)
    const letter = profile?.name?.charAt(0)?.toUpperCase() || 'U'
    const showImg = avatarUrl && !imgError

    // Sync if context refreshes from outside
    useEffect(() => {
        setAvatarUrl(profile?.avatar_url || null)
        setImgError(false) // reset error saat url baru masuk
    }, [profile?.avatar_url])

    const handleFile = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return
        if (!file.type.startsWith('image/')) { addToast('File harus berupa gambar', 'error'); return }
        if (file.size > 2 * 1024 * 1024) { addToast('Ukuran maksimal 2MB', 'error'); return }

        setUploading(true)
        try {
            const ext = file.name.split('.').pop()
            const path = `${profile.id}/avatar.${ext}`

            const { error: uploadError } = await supabase.storage
                .from('user-photo')
                .upload(path, file, { upsert: true, contentType: file.type })
            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage.from('user-photo').getPublicUrl(path)
            const url = `${publicUrl}?t=${Date.now()}`

            const { error: profileError } = await supabase
                .from('profiles')
                .update({ avatar_url: url })
                .eq('id', profile.id)
            if (profileError) throw profileError

            setAvatarUrl(url)
            setImgError(false)
            onAvatarChange?.(url)
            addToast('Foto profil berhasil diupdate ✓', 'success')
            await logAudit({
                action: 'UPDATE',
                tableName: 'profiles',
                recordId: profile.id,
                source: 'SECURITY',
                newData: { avatar_url: url }
            })
        } catch (err) {
            addToast('Gagal upload: ' + err.message, 'error')
        } finally {
            setUploading(false)
            if (fileRef.current) fileRef.current.value = ''
        }
    }

    const handleDelete = async () => {
        if (!avatarUrl) return
        setDeleting(true)
        try {
            // Hapus semua file avatar milik user ini di storage
            const { data: files } = await supabase.storage
                .from('user-photo')
                .list(profile.id)

            if (files?.length) {
                const paths = files.map(f => `${profile.id}/${f.name}`)
                await supabase.storage.from('user-photo').remove(paths)
            }

            // Reset avatar_url di profile
            const { error } = await supabase
                .from('profiles')
                .update({ avatar_url: null })
                .eq('id', profile.id)
            if (error) throw error

            setAvatarUrl(null)
            setImgError(false)
            onAvatarChange?.(null)
            addToast('Foto profil dihapus', 'success')
            await logAudit({
                action: 'UPDATE',
                tableName: 'profiles',
                recordId: profile.id,
                source: 'SECURITY',
                newData: { avatar_url: null }
            })
        } catch (err) {
            addToast('Gagal menghapus: ' + err.message, 'error')
        } finally {
            setDeleting(false)
        }
    }

    const busy = uploading || deleting

    return (
        <div className="flex items-center gap-5">
            <div className="relative shrink-0">
                <div className={`w-20 h-20 rounded-2xl overflow-hidden border-2 border-[var(--color-border)] shadow-md flex items-center justify-center font-black text-white
                    ${showImg ? 'bg-[var(--color-surface-alt)]' : 'bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)]'}`}>
                    {showImg
                        ? <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" onError={() => setImgError(true)} />
                        : <span className="text-2xl">{letter}</span>
                    }
                </div>
                <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={busy}
                    className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-xl bg-[var(--color-primary)] text-white flex items-center justify-center shadow-lg hover:brightness-110 transition-all disabled:opacity-60"
                >
                    <FontAwesomeIcon
                        icon={uploading ? faSpinner : faCamera}
                        className={`text-[10px] ${uploading ? 'animate-spin' : ''}`}
                    />
                </button>
            </div>
            <div>
                <p className="text-sm font-black text-[var(--color-text)]">Foto Profil</p>
                <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">JPG, PNG, WebP · Maks 2MB</p>
                <div className="mt-2 flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        disabled={busy}
                        className="h-7 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[10px] font-black text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-all disabled:opacity-50 flex items-center gap-1.5"
                    >
                        {uploading
                            ? <><FontAwesomeIcon icon={faSpinner} className="animate-spin" /> Mengupload...</>
                            : 'Ganti Foto'
                        }
                    </button>
                    {avatarUrl && (
                        <button
                            type="button"
                            onClick={handleDelete}
                            disabled={busy}
                            className="h-7 px-3 rounded-lg border border-red-500/30 bg-red-500/10 text-[10px] font-black text-red-500 hover:bg-red-500/20 transition-all disabled:opacity-50 flex items-center gap-1.5"
                        >
                            {deleting
                                ? <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                                : <FontAwesomeIcon icon={faTrash} />
                            }
                            Hapus
                        </button>
                    )}
                </div>
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        </div>
    )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SettingsPage() {
    const { isDark, toggleTheme } = useTheme()
    const { addToast } = useToast()
    // `updateProfile` = setter dari AuthContext untuk patch profile di state secara langsung
    // Tambahkan di AuthContext kamu:
    //   const updateProfile = (patch) => setProfile(p => ({ ...p, ...patch }))
    const { profile, user, refreshProfile, updateProfile } = useAuth()

    // Profile form
    const [name, setName] = useState('')
    const [savingProfile, setSavingProfile] = useState(false)
    const [profileDirty, setProfileDirty] = useState(false)

    // Password form
    const [pw, setPw] = useState({ current: '', next: '', confirm: '' })
    const [savingPw, setSavingPw] = useState(false)
    const [showPwConfirm, setShowPwConfirm] = useState(false)

    // Sync name input when profile loads
    useEffect(() => {
        if (profile?.name) {
            setName(profile.name)
            setProfileDirty(false)
        }
    }, [profile?.name])

    const roleMeta = ROLE_META[profile?.role] || {
        label: profile?.role || 'Unknown',
        color: 'text-gray-600',
        bg: 'bg-gray-500/10',
        border: 'border-gray-500/20',
    }

    // ── Password strength (memoized, only re-computed when pw.next changes) ──
    const pwStrength = useMemo(() => computePwStrength(pw.next), [pw.next])

    // ── Derived: can we submit the password form? ──────────────────────────
    const pwFormReady = pw.current.length > 0
        && pw.next.length >= 12
        && pw.next === pw.confirm

    // ── Handlers ──────────────────────────────────────────────────────────

    const handleSaveProfile = async () => {
        if (!name.trim()) { addToast('Nama tidak boleh kosong', 'warning'); return }
        setSavingProfile(true)
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ name: name.trim() })
                .eq('id', profile.id)
            if (error) throw error
            // Patch langsung ke context → navbar langsung update tanpa fetch ulang
            updateProfile?.({ name: name.trim() })
            refreshProfile?.()
            addToast('Nama berhasil diupdate ✓', 'success')
            setProfileDirty(false)

            await logAudit({
                action: 'UPDATE',
                tableName: 'profiles',
                recordId: profile.id,
                source: 'SECURITY',
                oldData: { name: profile.name },
                newData: { name: name.trim() }
            })
        } catch (err) {
            addToast('Gagal menyimpan: ' + err.message, 'error')
        } finally {
            setSavingProfile(false)
        }
    }

    const handleSavePw = async () => {
        setSavingPw(true)
        setShowPwConfirm(false)
        try {
            // Verify current password first
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: user?.email,
                password: pw.current,
            })
            if (signInError) {
                addToast('Password saat ini tidak benar', 'error')
                return
            }
            const { error } = await supabase.auth.updateUser({ password: pw.next })
            if (error) throw error
            addToast('Password berhasil diubah ✓', 'success')
            setPw({ current: '', next: '', confirm: '' })

            await logAudit({
                action: 'UPDATE',
                tableName: 'auth.users',
                recordId: user.id,
                source: 'SECURITY',
                newData: { password_change: true }
            })
        } catch (err) {
            addToast('Gagal mengubah password: ' + err.message, 'error')
        } finally {
            setSavingPw(false)
        }
    }

    const handleNotificationClick = (type) => {
        addToast(
            `Fitur notifikasi ${type === 'email' ? 'Email' : 'WhatsApp'} akan segera hadir!`,
            'info',
            3000
        )
    }

    // ── Render ─────────────────────────────────────────────────────────────

    return (
        <DashboardLayout title="Pengaturan">
            {showPwConfirm && (
                <ConfirmPwModal
                    onConfirm={handleSavePw}
                    onCancel={() => setShowPwConfirm(false)}
                />
            )}

            <div className="p-4 md:p-6 space-y-5 max-w-[1800px] mx-auto">

                <div className="mb-6">
                    <Breadcrumb badge="Pengaturan" items={['Settings']} className="mb-1" />
                    <h1 className="text-2xl font-black font-heading tracking-tight text-[var(--color-text)]">Pengaturan</h1>
                    <p className="text-[11px] text-[var(--color-text-muted)] mt-1 font-medium">
                        Kelola profil, tampilan, dan keamanan akun kamu.
                    </p>
                </div>

                <div className="grid lg:grid-cols-[1fr_360px] gap-4 items-start">

                    {/* ── Kiri: Profil + Password ── */}
                    <div className="space-y-4">

                        {/* Profil */}
                        <div className="glass rounded-2xl border border-[var(--color-border)] p-5">
                            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-4">
                                Foto & Identitas
                            </p>
                            <AvatarUpload
                                profile={profile}
                                onAvatarChange={(url) => {
                                    // Update context state langsung → navbar ikut update seketika
                                    updateProfile?.({ avatar_url: url })
                                    refreshProfile?.()
                                }}
                            />
                            <Divider />
                            <div className="space-y-4">
                                <div>
                                    <FieldLabel>Nama Tampilan</FieldLabel>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={e => { setName(e.target.value); setProfileDirty(true) }}
                                            className="input-field font-bold text-sm h-11 pr-8 w-full"
                                            placeholder="Nama lengkap"
                                        />
                                        {profileDirty && name !== profile?.name && (
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-amber-400" />
                                        )}
                                    </div>
                                </div>
                                <div className="grid sm:grid-cols-2 gap-3">
                                    <div>
                                        <FieldLabel>Email</FieldLabel>
                                        <div className="h-11 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/50 flex items-center gap-2">
                                            <FontAwesomeIcon icon={faEnvelope} className="text-[var(--color-text-muted)] text-xs shrink-0" />
                                            <span className="text-sm text-[var(--color-text-muted)] font-medium truncate">
                                                {user?.email || '—'}
                                            </span>
                                        </div>
                                    </div>
                                    <div>
                                        <FieldLabel>Role</FieldLabel>
                                        <div className="h-11 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/50 flex items-center gap-2">
                                            <FontAwesomeIcon icon={faIdBadge} className="text-[var(--color-text-muted)] text-xs shrink-0" />
                                            <span className={`text-[11px] font-black px-2 py-0.5 rounded-lg border ${roleMeta.color} ${roleMeta.bg} ${roleMeta.border}`}>
                                                {roleMeta.label}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {profileDirty && (
                                <div className="flex items-center justify-end gap-2 mt-4 pt-4 border-t border-[var(--color-border)]">
                                    <button
                                        onClick={() => { setName(profile?.name || ''); setProfileDirty(false) }}
                                        className="h-9 px-4 rounded-xl border border-[var(--color-border)] text-[10px] font-black text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-all flex items-center gap-1.5"
                                    >
                                        <FontAwesomeIcon icon={faXmark} className="text-[9px]" /> Batal
                                    </button>
                                    <button
                                        onClick={handleSaveProfile}
                                        disabled={savingProfile}
                                        className="h-9 px-4 rounded-xl bg-[var(--color-primary)] text-white text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all flex items-center gap-2 shadow-lg shadow-[var(--color-primary)]/20 disabled:opacity-60"
                                    >
                                        {savingProfile
                                            ? <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                                            : <FontAwesomeIcon icon={faCheck} />
                                        }
                                        Simpan
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Password */}
                        <div className="glass rounded-2xl border border-[var(--color-border)] p-5">
                            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-4">
                                Ubah Password
                            </p>
                            <div className="space-y-4">
                                <PwInput
                                    label="Password Saat Ini"
                                    value={pw.current}
                                    onChange={e => setPw(p => ({ ...p, current: e.target.value }))}
                                />
                                <div className="grid sm:grid-cols-2 gap-4">
                                    <PwInput
                                        label="Password Baru"
                                        value={pw.next}
                                        onChange={e => setPw(p => ({ ...p, next: e.target.value }))}
                                    />
                                    <PwInput
                                        label="Konfirmasi"
                                        value={pw.confirm}
                                        onChange={e => setPw(p => ({ ...p, confirm: e.target.value }))}
                                    />
                                </div>

                                {pw.next && (
                                    <div className="space-y-1.5">
                                        {/* Strength bars */}
                                        <div className="flex items-center gap-1.5">
                                            {[1, 2, 3, 4].map(i => (
                                                <div
                                                    key={i}
                                                    className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= pwStrength.bars ? pwStrength.color : 'bg-[var(--color-border)]'}`}
                                                />
                                            ))}
                                            <span className="text-[10px] font-black text-[var(--color-text-muted)] w-20 text-right shrink-0">
                                                {pwStrength.label}
                                            </span>
                                        </div>

                                        {/* Min length hint — consistent with Tips Keamanan (12 chars) */}
                                        {pw.next.length < 12 && (
                                            <p className="text-[10px] text-amber-500 font-bold">
                                                Minimal 12 karakter ({12 - pw.next.length} lagi)
                                            </p>
                                        )}

                                        {/* Confirm match feedback */}
                                        {pw.confirm && pw.next !== pw.confirm && (
                                            <p className="text-[10px] text-red-500 font-bold">Password tidak cocok</p>
                                        )}
                                        {pw.confirm && pw.next === pw.confirm && pw.confirm.length > 0 && (
                                            <p className="text-[10px] text-emerald-500 font-bold flex items-center gap-1">
                                                <FontAwesomeIcon icon={faCheck} className="text-[8px]" /> Password cocok
                                            </p>
                                        )}
                                    </div>
                                )}

                                <div className="flex justify-end pt-2">
                                    <button
                                        onClick={() => setShowPwConfirm(true)}
                                        disabled={savingPw || !pwFormReady}
                                        className="h-10 px-6 rounded-xl bg-[var(--color-primary)] text-white text-[11px] font-black uppercase tracking-widest hover:opacity-90 transition-all flex items-center gap-2 shadow-lg shadow-[var(--color-primary)]/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {savingPw
                                            ? <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                                            : <FontAwesomeIcon icon={faShieldAlt} />
                                        }
                                        Ubah Password
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── Kanan: Tampilan + Info + Tips ── */}
                    <div className="space-y-4">

                        {/* Tampilan & Notifikasi */}
                        <div className="glass rounded-2xl border border-[var(--color-border)] p-5">
                            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-3">
                                Tampilan
                            </p>
                            <div className="flex items-center justify-between p-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/50">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center text-sm">
                                        <FontAwesomeIcon icon={isDark ? faMoon : faSun} />
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm text-[var(--color-text)]">Mode Gelap</p>
                                        <p className="text-[11px] text-[var(--color-text-muted)]">{isDark ? 'Aktif' : 'Nonaktif'}</p>
                                    </div>
                                </div>
                                <Toggle checked={isDark} onChange={toggleTheme} />
                            </div>

                            <Divider />

                            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-3">
                                Notifikasi
                            </p>

                            {/* Coming Soon Banner */}
                            <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-2">
                                <FontAwesomeIcon icon={faClock} className="text-amber-500 text-xs" />
                                <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                                    Fitur notifikasi sedang dalam pengembangan. Nantikan segera!
                                </p>
                            </div>

                            <div className="space-y-2 opacity-70">
                                {/* Email */}
                                <div
                                    className="flex items-center justify-between p-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/50 cursor-not-allowed"
                                    onClick={() => handleNotificationClick('email')}
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center text-sm shrink-0">
                                            <FontAwesomeIcon icon={faBell} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-bold text-sm text-[var(--color-text)]">Email</p>
                                            <p className="text-[11px] text-[var(--color-text-muted)] truncate">Ringkasan otomatis</p>
                                        </div>
                                    </div>
                                    <div className="shrink-0 ml-3">
                                        <Toggle checked={false} onChange={() => { }} disabled={true} />
                                    </div>
                                </div>

                                {/* WhatsApp */}
                                <div
                                    className="flex items-center justify-between p-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/50 cursor-not-allowed"
                                    onClick={() => handleNotificationClick('whatsapp')}
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-9 h-9 rounded-xl bg-green-500/10 text-green-500 flex items-center justify-center text-sm shrink-0">
                                            <FontAwesomeIcon icon={faWhatsapp} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-bold text-sm text-[var(--color-text)]">WhatsApp</p>
                                            <p className="text-[11px] text-[var(--color-text-muted)] truncate">Peringatan instan via WA</p>
                                        </div>
                                    </div>
                                    <div className="shrink-0 ml-3">
                                        <Toggle checked={false} onChange={() => { }} disabled={true} />
                                    </div>
                                </div>
                            </div>

                            <p className="text-[9px] text-[var(--color-text-muted)] text-center mt-4">
                                *Klik untuk mendapatkan notifikasi saat fitur tersedia
                            </p>
                        </div>

                        {/* Info Akun */}
                        <div className="glass rounded-2xl border border-[var(--color-border)] p-5">
                            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-3">
                                Info Akun
                            </p>
                            <div className="divide-y divide-[var(--color-border)]">
                                <div className="flex items-center justify-between py-3">
                                    <span className="text-[11px] font-bold text-[var(--color-text-muted)]">User ID</span>
                                    <span className="text-[11px] font-black text-[var(--color-text)] font-mono">
                                        {profile?.id ? profile.id.slice(0, 8) + '...' : '—'}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between py-3">
                                    <span className="text-[11px] font-bold text-[var(--color-text-muted)]">Terdaftar</span>
                                    <span className="text-[11px] font-black text-[var(--color-text)] font-mono">
                                        {formatDate(user?.created_at, { day: '2-digit', month: 'long', year: 'numeric' })}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between py-3">
                                    <span className="text-[11px] font-bold text-[var(--color-text-muted)]">Login Terakhir</span>
                                    <span className="text-[11px] font-black text-[var(--color-text)] font-mono">
                                        {user?.last_sign_in_at
                                            ? new Date(user.last_sign_in_at).toLocaleString('id-ID', {
                                                day: '2-digit', month: 'short', year: 'numeric',
                                                hour: '2-digit', minute: '2-digit',
                                            })
                                            : '—'
                                        }
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Tips Keamanan */}
                        <div className="glass rounded-2xl border border-[var(--color-border)] p-5">
                            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-3">
                                Tips Keamanan
                            </p>
                            <ul className="space-y-2.5">
                                {[
                                    'Gunakan minimal 12 karakter',
                                    'Kombinasikan huruf besar, kecil, angka & simbol',
                                    'Jangan pakai password yang sama di tempat lain',
                                    'Logout dari perangkat yang tidak dikenali',
                                ].map((tip, i) => (
                                    <li key={i} className="flex items-start gap-2 text-[11px] text-[var(--color-text-muted)]">
                                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)]/40 mt-1.5 shrink-0" />
                                        {tip}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>

                <div className="h-8" />
            </div>
        </DashboardLayout>
    )
}