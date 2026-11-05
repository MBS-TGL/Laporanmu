import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Mail, MapPin, Menu, Moon, Phone, Sun, X } from 'lucide-react'
import { useTheme } from '@context/Theme'
import { useAuth } from '@context/Auth'
import usePublicSettings from '../hooks/usePublicSettings'

/* ───────────────────────────── Class helpers ───────────────────────────── */
const CTA_VARIANTS = {
    primary: 'bg-primary text-white hover:bg-primary-dark',
    secondary: 'bg-surface-alt text-text border border-border hover:bg-border',
    light: 'bg-surface text-text hover:bg-surface-alt',
    ghost: 'text-white border border-white/40 hover:bg-white/10',
}
const ctaCls = (variant = 'primary', size = 'lg') =>
    `inline-flex items-center justify-center whitespace-nowrap font-semibold rounded-lg select-none transition-colors active:scale-[0.98] ${size === 'md' ? 'h-10 px-4 text-sm' : 'h-11 px-6 text-sm'} ${CTA_VARIANTS[variant]}`

const navLinkCls = 'inline-flex items-center h-9 px-3 rounded-lg text-sm font-medium text-text-muted hover:bg-surface-alt hover:text-text transition-colors'
const iconBtnCls = 'inline-flex items-center justify-center w-9 h-9 rounded-lg bg-surface-alt border border-border text-text-muted hover:text-text hover:bg-border transition-colors active:scale-[0.98]'
const microLabelCls = 'text-xs font-semibold uppercase tracking-wider'

/** Nav bawaan: link antar halaman publik. */
const DEFAULT_NAV = [
    { label: 'Beranda', href: '/' },
    { label: 'Informasi', href: '/informasi' },
    { label: 'PSB', href: '/psb' },
    { label: 'Cek Poin', href: '/check' },
]

const DEFAULT_FOOTER_LINKS = [
    { label: 'Beranda', href: '/' },
    { label: 'Informasi', href: '/informasi' },
    { label: 'PSB Online', href: '/psb' },
    { label: 'Cek Status PSB', href: '/psb/status' },
    { label: 'Cek Poin & Raport', href: '/check' },
]

// Kontak layanan (belum ada field khusus di school_settings — default kontak tim)
const CONTACT = {
    email: 'itzme.rizal@gmail.com',
    wa: '+62 812-3066-0013',
    waLink: 'https://wa.me/6281230660013',
}

function ThemeToggle() {
    const { isDark, toggleTheme } = useTheme()
    return (
        <button onClick={toggleTheme} className={iconBtnCls} aria-label="Toggle theme">
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
    )
}

function Wordmark({ to = '/', size = 'md' }) {
    return (
        <Link to={to} className="flex items-center gap-2.5 shrink-0">
            <div className={`${size === 'lg' ? 'w-10 h-10' : 'w-9 h-9'} rounded-lg bg-primary flex items-center justify-center`}>
                <span className="text-white font-bold text-lg">L</span>
            </div>
            <span className={`font-bold text-text tracking-tight ${size === 'lg' ? 'text-2xl' : 'text-xl'}`}>
                Laporan<span className="text-primary">mu</span>
            </span>
        </Link>
    )
}

/* ───────────────────────────── Public Header ───────────────────────────── */
function PublicHeader({ variant, navItems, newsBadge = 0, showCheckCta }) {
    const { user } = useAuth()
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
    const [scrolled, setScrolled] = useState(false)

    useEffect(() => {
        const fn = () => setScrolled(window.scrollY > 20)
        window.addEventListener('scroll', fn, { passive: true })
        return () => window.removeEventListener('scroll', fn)
    }, [])

    // Landing: transparan di atas, solid saat scroll. Halaman lain: solid dengan blur ringan.
    const solid = variant !== 'landing' || scrolled

    return (
        <nav className={`fixed w-full z-50 transition-all duration-300 ${solid ? 'bg-surface border-b border-border py-3' : 'bg-transparent py-5'}`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between relative">
                    {/* Logo */}
                    <div className="relative z-50">
                        {variant === 'landing'
                            ? <Wordmark />
                            : <Wordmark size="lg" />}
                    </div>

                    {/* Desktop Nav */}
                    <div className={`hidden md:flex absolute left-1/2 -translate-x-1/2 items-center gap-1 bg-surface px-2 py-2 rounded-full border border-border ${variant === 'landing' ? '' : 'shadow-sm'}`}>
                        {navItems.map((item) => {
                            const cls = `${navLinkCls} relative`
                            const isAnchor = item.href.startsWith('#')
                            const isActive = !isAnchor && window.location.pathname === item.href
                            return isAnchor ? (
                                <a key={item.label} href={item.href} className={cls}>
                                    {item.label}
                                    {item.badge > 0 && (
                                        <span className="absolute -top-1.5 -right-2 min-w-4 h-4 px-1 rounded-full bg-danger text-white text-xs font-semibold flex items-center justify-center leading-none">
                                            {item.badge > 9 ? '9+' : item.badge}
                                        </span>
                                    )}
                                </a>
                            ) : (
                                <Link key={item.label} to={item.href} className={`${isActive ? 'text-primary font-semibold' : ''} ${cls}`}>
                                    {item.label}
                                </Link>
                            )
                        })}
                    </div>

                    {/* Desktop Actions */}
                    <div className="hidden md:flex items-center gap-3 z-50">
                        <ThemeToggle />
                        {showCheckCta && (
                            <Link to="/check" className={ctaCls('secondary', 'md')}>
                                Cek Poin & Raport
                            </Link>
                        )}
                        <Link to={user ? "/dashboard" : "/login"} className={ctaCls('primary', 'md')}>
                            {user ? 'Ke Dashboard' : 'Login Staff'}
                        </Link>
                    </div>

                    {/* Mobile Actions */}
                    <div className="flex items-center gap-2 md:hidden z-50">
                        <ThemeToggle />
                        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-primary text-white active:scale-[0.98] transition-colors" aria-label="Menu">
                            {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu Overlay */}
            <div className={`fixed inset-0 z-40 md:hidden transition-opacity duration-300 ${isMobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                <div className="absolute inset-0 bg-black/40" onClick={() => setIsMobileMenuOpen(false)} />
                <div className={`absolute right-4 left-4 top-24 bg-surface rounded-xl shadow-xl border border-border p-4 transition-[opacity,transform] duration-300 ${isMobileMenuOpen ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'}`}>
                    <div className="flex flex-col gap-1.5">
                        {navItems.map((item) => {
                            const isAnchor = item.href.startsWith('#')
                            const cls = "flex items-center h-10 px-4 rounded-lg text-sm font-medium text-text hover:bg-surface-alt hover:text-primary transition-colors"
                            return isAnchor ? (
                                <a key={item.label} href={item.href} className={cls} onClick={() => setIsMobileMenuOpen(false)}>
                                    {item.label}
                                    {item.badge > 0 && (
                                        <span className="ml-auto min-w-5 h-5 px-1.5 rounded-full bg-danger text-white text-xs font-semibold flex items-center justify-center leading-none">
                                            {item.badge > 9 ? '9+' : item.badge}
                                        </span>
                                    )}
                                </a>
                            ) : (
                                <Link key={item.label} to={item.href} className={cls} onClick={() => setIsMobileMenuOpen(false)}>
                                    {item.label}
                                </Link>
                            )
                        })}
                        <div className="h-px bg-border my-2 mx-2" />
                        <Link to={user ? "/dashboard" : "/login"} className={`${ctaCls('primary', 'md')} w-full`} onClick={() => setIsMobileMenuOpen(false)}>
                            {user ? 'Ke Dashboard' : 'Login Staff'}
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                </div>
            </div>
        </nav>
    )
}

/* ───────────────────────────── Public Footer ───────────────────────────── */
function PublicFooter({ footerLinks }) {
    const { user } = useAuth()
    const settings = usePublicSettings()

    return (
        <footer id="kontak" className="bg-surface text-text py-12 md:py-16 border-t border-border relative z-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Kontak Detail Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-12 mb-12 border-b border-border">
                    <div className="flex items-start gap-4">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                            <Mail className="w-4 h-4" />
                        </div>
                        <div>
                            <h5 className={`${microLabelCls} text-text-muted mb-1`}>Hubungi Kami</h5>
                            <a href={`mailto:${CONTACT.email}`} className="text-sm font-medium hover:text-primary transition-colors">{CONTACT.email}</a>
                        </div>
                    </div>
                    <div className="flex items-start gap-4">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                            <Phone className="w-4 h-4" />
                        </div>
                        <div>
                            <h5 className={`${microLabelCls} text-text-muted mb-1`}>WhatsApp Center</h5>
                            <a href={CONTACT.waLink} target="_blank" rel="noreferrer" className="text-sm font-medium hover:text-primary transition-colors">{CONTACT.wa}</a>
                        </div>
                    </div>
                    <div className="flex items-start gap-4">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                            <MapPin className="w-4 h-4" />
                        </div>
                        <div>
                            <h5 className={`${microLabelCls} text-text-muted mb-1`}>Alamat</h5>
                            <p className="text-sm font-medium text-text">{settings.school_address || settings.school_address_line1}</p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row items-center justify-between gap-6 lg:gap-4">
                    <div className="flex flex-col md:flex-row items-center gap-4 md:gap-10">
                        <Wordmark />

                        <div className={`flex flex-wrap justify-center gap-x-6 gap-y-2 ${microLabelCls} text-text-muted`}>
                            {footerLinks.map((item) => (
                                item.href.startsWith('#') ? (
                                    <a key={item.label} href={item.href} className="hover:text-primary transition-colors">
                                        {item.label}
                                    </a>
                                ) : (
                                    <Link key={item.label} to={item.href} className="hover:text-primary transition-colors">
                                        {item.label}
                                    </Link>
                                )
                            ))}
                            <Link to={user ? "/dashboard" : "/login"} className="text-primary hover:text-primary-dark transition-colors">
                                {user ? 'Ke Dashboard' : 'Akses Portal'}
                            </Link>
                        </div>
                    </div>

                    <div className="flex items-center gap-6 text-xs text-text-muted font-medium text-center">
                        <span>© {new Date().getFullYear()} <span className="text-text font-semibold">{settings.wa_footer || 'Laporanmu.'}</span></span>
                    </div>
                </div>
            </div>
        </footer>
    )
}

/* ───────────────────────────── PublicLayout ─────────────────────────────
   Layout bersama halaman publik: header (nav + theme + CTA) + footer.
   variant="landing" → header transparan di atas halaman, solid saat scroll.
   variant="solid"   → header solid selalu (default).                         */
export default function PublicLayout({
    children,
    variant = 'solid',
    navItems = DEFAULT_NAV,
    footerLinks = DEFAULT_FOOTER_LINKS,
    newsBadge = 0,
    showCheckCta = false,
}) {
    // Sisipkan badge realtime ke item nav yang cocok (biasanya Informasi).
    const nav = newsBadge > 0
        ? navItems.map((it) => (it.badgeKey === 'informasi' || it.label === 'Informasi' ? { ...it, badge: newsBadge } : it))
        : navItems

    return (
        <div className="min-h-screen bg-surface transition-colors duration-300 overflow-x-hidden">
            <PublicHeader variant={variant} navItems={nav} showCheckCta={showCheckCta} />
            {children}
            <PublicFooter footerLinks={footerLinks} />
        </div>
    )
}

export { ctaCls, navLinkCls, iconBtnCls, microLabelCls, Wordmark }
