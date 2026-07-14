import { Component } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faTriangleExclamation,
    faCircleExclamation,
    faRotateRight,
    faHouse,
    faCopy,
    faBug,
} from '@fortawesome/free-solid-svg-icons'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function genErrorId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID()
    }
    return `err-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function getTimestamp() {
    return new Date().toLocaleString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    })
}

// ─── ErrorFallback ────────────────────────────────────────────────────────────
// Komponen UI murni — dipisah dari logic boundary agar mudah dikustomisasi.
//
// Props:
//   error        → Error object
//   errorInfo    → React errorInfo (componentStack)
//   errorId      → ID unik untuk setiap kejadian error
//   timestamp    → Waktu error terjadi (string)
//   retryCount   → Berapa kali user sudah klik "Coba Lagi"
//   maxRetries   → Batas maksimal percobaan
//   onReset      → Callback reset state boundary
//   isDev        → Apakah environment development
//   isOffline    → Apakah navigator.onLine === false

function ErrorFallback({
    error,
    errorInfo,
    errorId,
    timestamp,
    retryCount,
    maxRetries,
    onReset,
    isDev,
    isOffline,
}) {
    const errorType = error?.constructor?.name ?? 'Error'
    const isModuleError = error?.message?.includes('Failed to fetch') || error?.message?.includes('dynamically imported module')
    const canRetry = retryCount < maxRetries
    const showRetryWarn = retryCount > 0
    const isAmber = isOffline || isModuleError

    // ── Handler: Salin detail error ke clipboard ──────────────────────────────
    const handleCopy = () => {
        const lines = [
            `Error ID  : ${errorId}`,
            `Waktu     : ${timestamp}`,
            `Tipe      : ${errorType}`,
            `Pesan     : ${error?.message ?? '—'}`,
            isDev && errorInfo?.componentStack
                ? `\nStack trace:\n${errorInfo.componentStack.trim()}`
                : '',
        ]
        navigator.clipboard?.writeText(lines.filter(Boolean).join('\n'))
    }

    // ── Handler: Kirim laporan bug via WhatsApp ───────────────────────────────
    const handleReport = () => {
        const message = encodeURIComponent(
            [
                `🐛 *Bug Report*`,
                ``,
                `*Error ID :* ${errorId}`,
                `*Waktu    :* ${timestamp}`,
                `*Tipe     :* ${errorType}`,
                `*Pesan    :* ${error?.message ?? '—'}`,
            ].join('\n')
        )
        window.open(`https://wa.me/6281230660013?text=${message}`, '_blank')
    }

    const handleHome = () => { window.location.href = '/' }

    const secondaryBtns = [
        { icon: faHouse, label: 'Beranda', fn: handleHome, aria: 'Kembali ke beranda' },
        { icon: faCopy, label: 'Salin', fn: handleCopy, aria: 'Salin detail error ke clipboard' },
        { icon: faBug, label: 'Laporkan', fn: handleReport, aria: 'Laporkan bug via WhatsApp' },
    ]

    return (
        <div
            role="alert"
            aria-live="assertive"
            aria-atomic="true"
            className="min-h-screen flex flex-col items-center justify-center px-4 gap-3 bg-[var(--color-surface)]"
            style={{ animation: 'eb-enter 0.25s cubic-bezier(0.16,1,0.3,1) both' }}
        >
            <style>{`
                @keyframes eb-enter {
                    from { opacity:0; transform:translateY(16px) scale(0.98); }
                    to   { opacity:1; transform:translateY(0) scale(1); }
                }
                .eb-details-arrow { transition: transform 0.2s; }
                details[open] .eb-details-arrow { transform: rotate(180deg); }
            `}</style>

            {/* Card utama — identik dengan modal di page lain */}
            <div className={`
                relative w-full max-w-md
                bg-[var(--color-surface)] border border-[var(--color-border)]
                rounded-2xl shadow-2xl
                flex flex-col items-center gap-4
                px-6 pt-8 pb-6
                ${isAmber ? 'border-t-[3px] border-t-amber-500' : 'border-t-[3px] border-t-red-500'}
            `}>

                {/* Badge tipe error — gaya badge tag di page */}
                <span className={`
                    absolute top-4 right-4
                    px-3 py-1 rounded-full font-mono
                    text-[10px] font-black uppercase tracking-[0.15em]
                    border
                    ${isAmber
                        ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                        : 'bg-red-500/10 text-red-500 border-red-500/10'}
                `}>
                    {errorType}
                </span>

                {/* Icon bulat */}
                <div className={`
                    w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 border-2
                    ${isAmber
                        ? 'bg-amber-500/10 border-amber-500/20'
                        : 'bg-red-500/10 border-red-500/20'}
                `}>
                    <FontAwesomeIcon
                        icon={isOffline ? faCircleExclamation : faTriangleExclamation}
                        className={`text-xl ${isAmber ? 'text-amber-500' : 'text-red-500'}`}
                    />
                </div>

                {/* Heading + subtext */}
                <div className="text-center max-w-xs">
                    <p className="text-base font-black text-[var(--color-text)] tracking-tight mb-1.5">
                        {isOffline ? 'Tidak ada koneksi' : isModuleError ? 'Gagal memuat modul' : 'Terjadi kesalahan'}
                    </p>
                    <p className="text-[12px] text-[var(--color-text-muted)] leading-relaxed">
                        {isOffline
                            ? 'Periksa koneksi internet kamu, lalu coba lagi.'
                            : isModuleError
                                ? 'Versi aplikasi telah diperbarui atau koneksi terputus. Silakan muat ulang halaman.'
                                : 'Aplikasi menemui masalah yang tidak terduga. Coba lagi atau kembali ke beranda.'}
                    </p>
                </div>

                {/* Error message — code block dengan border-left aksen */}
                {error?.message && (
                    <div
                        role="code"
                        aria-label="Pesan error"
                        className={`
                            w-full font-mono text-[11.5px] leading-relaxed break-all
                            bg-[var(--color-surface-alt)] border border-[var(--color-border)]
                            border-l-[3px] rounded-r-xl px-3 py-2.5
                            ${isAmber ? 'border-l-amber-500 text-amber-600' : 'border-l-red-500 text-red-500'}
                        `}
                    >
                        {error.message}
                    </div>
                )}

                {/* Stack trace — auto-open di DEV */}
                {isDev && errorInfo?.componentStack && (
                    <details open className="w-full">
                        <summary className="
                            text-[11px] text-[var(--color-text-muted)] cursor-pointer select-none
                            list-none inline-flex items-center gap-1.5
                            hover:text-[var(--color-text)] transition-colors
                        ">
                            <svg width="10" height="10" viewBox="0 0 10 10" fill="none"
                                className="eb-details-arrow" aria-hidden="true">
                                <path d="M2 3.5l3 3 3-3" stroke="currentColor"
                                    strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            Stack trace
                        </summary>
                        <pre className="
                            mt-2 p-3 rounded-xl
                            bg-[var(--color-surface-alt)] border border-[var(--color-border)]
                            text-[10px] text-red-400 overflow-auto max-h-44
                            leading-relaxed whitespace-pre-wrap
                        ">
                            {errorInfo.componentStack.trim()}
                        </pre>
                    </details>
                )}

                {/* Peringatan batas retry */}
                {showRetryWarn && (
                    <p
                        role="status"
                        aria-live="polite"
                        className={`text-[11px] text-center ${canRetry ? 'text-amber-500' : 'text-red-500'}`}
                    >
                        {canRetry
                            ? `Percobaan ke-${retryCount} dari ${maxRetries}`
                            : `Batas percobaan (${maxRetries}\u00d7) tercapai. Silakan kembali ke beranda.`}
                    </p>
                )}

                {/* Tombol aksi */}
                <div className="flex flex-col gap-2 w-full">

                    {/* Baris 1: primary full-width — gradient identik dengan button login/cta di page */}
                    <button
                        onClick={isModuleError ? () => window.location.reload() : onReset}
                        disabled={!canRetry}
                        autoFocus
                        aria-label={isModuleError ? 'Muat ulang halaman' : canRetry ? `Coba lagi, percobaan ke-${retryCount + 1}` : 'Batas percobaan tercapai'}
                        className={`
                            w-full h-10 rounded-xl
                            text-white text-[12px] font-black uppercase tracking-widest
                            flex items-center justify-center gap-2
                            hover:scale-[1.02] active:scale-[0.98] transition-all duration-200
                            disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100
                            ${isAmber
                                ? 'bg-gradient-to-r from-amber-500 to-amber-600 shadow-lg shadow-amber-500/20'
                                : 'bg-gradient-to-r from-red-500 to-red-600 shadow-lg shadow-red-500/20'
                            }
                        `}
                    >
                        <FontAwesomeIcon icon={isModuleError ? faRotateRight : faRotateRight} />
                        {isModuleError ? 'Muat Ulang Halaman' : canRetry ? 'Coba Lagi' : 'Batas Tercapai'}
                    </button>

                    {/* Baris 2: tiga ghost button sejajar — identik dengan secondary button di page */}
                    <div className="flex gap-2 w-full">
                        {secondaryBtns.map(({ icon, label, fn, aria }) => (
                            <button
                                key={label}
                                onClick={fn}
                                aria-label={aria}
                                className="
                                    flex-1 h-10 rounded-xl
                                    bg-[var(--color-surface-alt)] border border-[var(--color-border)]
                                    text-[var(--color-text-muted)] text-[10px] font-black uppercase tracking-widest
                                    flex items-center justify-center gap-1.5
                                    hover:bg-[var(--color-border)] hover:text-[var(--color-text)]
                                    active:scale-95 transition-all duration-150
                                "
                            >
                                <FontAwesomeIcon icon={icon} />
                                {label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Footer: Error ID + timestamp */}
            <p className="text-[10px] font-mono text-[var(--color-text-muted)] opacity-60 text-center tracking-wide">
                <span aria-label={`Error ID: ${errorId}`}>{errorId}</span>
                {' \u00b7 '}
                <time>{timestamp}</time>
            </p>
        </div>
    )
}

// ─── GlobalErrorBoundary ──────────────────────────────────────────────────────
// Taruh di App.jsx / main.jsx sebagai wrapper paling luar.
// Menangkap semua error yang tidak ter-catch oleh boundary yang lebih dalam.
//
// Usage:
//   <GlobalErrorBoundary>
//     <App />
//   </GlobalErrorBoundary>
//
// Props:
//   onError(error, errorInfo, errorId)
//     → Optional callback. Cocok untuk kirim ke Sentry, Datadog, dsb.
//       errorId bisa dijadikan Sentry tag agar mudah dilacak.
//
//   fallback
//     → Optional custom fallback. Bisa berupa:
//       - ReactNode biasa: <MyFallback />
//       - Render function: ({ error, errorInfo, reset }) => <MyFallback />
//
//   maxRetries (default: 3)
//     → Batas maksimal tombol "Coba Lagi" sebelum dinonaktifkan.
//
//   resetKeys (default: [])
//     → Array nilai yang jika berubah akan otomatis mereset boundary.
//       Cocok diisi dengan React Router location agar reset terjadi
//       saat user navigasi ke halaman lain.
//       Contoh: <GlobalErrorBoundary resetKeys={[location.pathname]}>

class GlobalErrorBoundary extends Component {
    static defaultProps = {
        maxRetries: 3,
        resetKeys: [],
    }

    constructor(props) {
        super(props)
        this.state = {
            error: null,
            errorInfo: null,
            errorId: null,
            timestamp: null,
            retryCount: 0,
        }
        this.handleReset = this.handleReset.bind(this)
    }

    static getDerivedStateFromError(error) {
        return {
            error,
            errorId: genErrorId(),
            timestamp: getTimestamp(),
        }
    }

    componentDidCatch(error, errorInfo) {
        this.setState({ errorInfo })

        if (typeof this.props.onError === 'function') {
            this.props.onError(error, errorInfo, this.state.errorId)
        }

        if (import.meta.env.DEV) {
            console.group('[GlobalErrorBoundary]')
            console.error('Error   :', error)
            console.error('Info    :', errorInfo)
            console.error('Error ID:', this.state.errorId)
            console.groupEnd()
        }
    }

    componentDidUpdate(prevProps) {
        if (!this.state.error) return

        const prevKeys = prevProps.resetKeys ?? []
        const nextKeys = this.props.resetKeys ?? []
        const hasChanged = nextKeys.some((key, i) => key !== prevKeys[i])

        if (hasChanged) this.handleReset()
    }

    handleReset() {
        this.setState(prev => ({
            error: null,
            errorInfo: null,
            errorId: null,
            timestamp: null,
            retryCount: prev.retryCount + 1,
        }))
    }

    render() {
        const { error, errorInfo, errorId, timestamp, retryCount } = this.state
        const { fallback, children, maxRetries } = this.props

        if (!error) return children

        if (fallback) {
            return typeof fallback === 'function'
                ? fallback({ error, errorInfo, reset: this.handleReset })
                : fallback
        }

        return (
            <ErrorFallback
                error={error}
                errorInfo={errorInfo}
                errorId={errorId}
                timestamp={timestamp}
                retryCount={retryCount}
                maxRetries={maxRetries}
                onReset={this.handleReset}
                isDev={import.meta.env.DEV}
                isOffline={!navigator.onLine}
            />
        )
    }
}

export default GlobalErrorBoundary