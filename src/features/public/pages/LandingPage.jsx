import { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react'
import { Link } from 'react-router-dom'
import {
    ArrowRight,
    Calendar,
    ChartLine,
    ChevronDown,
    Clock,
    Mail,
    MapPin,
    Menu,
    Moon,
    Newspaper,
    Phone,
    Printer,
    Quote,
    Search,
    Shield,
    Star,
    Sun,
    User,
    Users,
    X
} from 'lucide-react'
import { useTheme } from '@context/Theme'
import { useAuth } from '@context/Auth'
import { supabase } from '@lib/supabase'
import { Button, Badge, Modal, Skeleton } from '@shared/components'

const ChatAssistant = lazy(() => import('@core/components/ChatAssistant'))

/* ───────────────────────────── CTA class helpers (untuk <Link>) ─────────────────────────────
   Meniru shared Button (size lg/md) karena Button merender <button> — CTA navigasi butuh <Link>. */
const CTA_VARIANTS = {
    primary: 'bg-primary text-white hover:bg-primary-dark',
    secondary: 'bg-surface-alt text-text border border-border hover:bg-border',
    light: 'bg-surface text-text hover:bg-surface-alt',
    ghost: 'text-white border border-white/40 hover:bg-white/10',
}
const ctaCls = (variant = 'primary', size = 'lg') =>
    `inline-flex items-center justify-center whitespace-nowrap font-semibold rounded-lg select-none transition-colors active:scale-[0.98] ${size === 'md' ? 'h-10 px-4 text-sm' : 'h-11 px-6 text-sm'} ${CTA_VARIANTS[variant]}`

/* Class level modul — satu sumber untuk pola berulang */
const navLinkCls = 'inline-flex items-center h-9 px-3 rounded-lg text-sm font-medium text-text-muted hover:bg-surface-alt hover:text-text transition-colors'
const iconBtnCls = 'inline-flex items-center justify-center w-9 h-9 rounded-lg bg-surface-alt border border-border text-text-muted hover:text-text hover:bg-border transition-colors active:scale-[0.98]'
const microLabelCls = 'text-xs font-semibold uppercase tracking-wider'

// Strip HTML tags + decode common entities for clean excerpt display
const stripHtml = (html = '') => html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()

/* ───────────────────────────── Hook: Scroll Reveal ───────────────────────────── */
function useReveal(threshold = 0.15) {
    const ref = useRef(null)
    const [visible, setVisible] = useState(false)

    useEffect(() => {
        const el = ref.current
        if (!el) return
        const obs = new IntersectionObserver(
            ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.unobserve(el) } },
            { threshold }
        )
        obs.observe(el)
        return () => obs.disconnect()
    }, [threshold])

    return [ref, visible]
}

/* ───────────────────────────── Reveal Wrapper ───────────────────────────── */
function Reveal({ children, className = '', delay = 0 }) {
    const [ref, visible] = useReveal()
    return (
        <div
            ref={ref}
            className={className}
            style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(32px)',
                transition: `opacity 0.7s cubic-bezier(.16,1,.3,1) ${delay}s, transform 0.7s cubic-bezier(.16,1,.3,1) ${delay}s`,
            }}
        >
            {children}
        </div>
    )
}

/* ───────────────────────────── News Detail Modal ───────────────────────────── */
const NEWS_FONT_SIZES = [
    { key: 'sm', body: 'text-sm', title: 'text-xl sm:text-2xl' },
    { key: 'md', body: 'text-base', title: 'text-2xl sm:text-3xl' },
    { key: 'lg', body: 'text-lg', title: 'text-3xl sm:text-4xl' },
]

function NewsDetailModal({ news, onClose }) {
    const [fontSize, setFontSize] = useState('sm')
    const fs = NEWS_FONT_SIZES.find(f => f.key === fontSize)
    const formatDate = (d) => new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    const handlePrint = () => {
        const w = window.open('', '_blank', 'width=800,height=600')
        const fmt = (d) => new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
        w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${news.title}</title>
        <style>
            @page{margin:20mm} body{font-family:system-ui,sans-serif;max-width:100%;margin:0;padding:40px;color:#111;line-height:1.75}
            h1{font-size:1.75rem;font-weight:700;margin-bottom:.5rem;line-height:1.25}
            .meta{font-size:.7rem;color:#888;text-transform:uppercase;letter-spacing:.1em;margin-bottom:1.5rem;border-bottom:1px solid #eee;padding-bottom:.75rem}
            p{margin-bottom:.9rem}strong{color:#4f46e5}
            ul,ol{margin-left:1.5rem;margin-bottom:.9rem}li{margin-bottom:.25rem}
            blockquote{border-left:3px solid #4f46e5;padding-left:1rem;color:#666;font-style:italic;margin-bottom:.9rem}
            h2{font-size:1.2rem;font-weight:700;margin:1.5rem 0 .4rem}h3{font-size:1rem;font-weight:700;margin:1.2rem 0 .4rem}
            img{border-radius:.5rem;max-width:100%;margin:1rem 0}
            .footer{margin-top:2rem;padding-top:1rem;border-top:1px solid #eee;font-size:.7rem;color:#aaa;display:flex;justify-content:space-between}
        </style></head><body>
        <div class="meta">${news.tag} · ${fmt(news.created_at)}${news.read_time ? ` · ${news.read_time} mnt baca` : ''}</div>
        <h1>${news.title}</h1>
        <div class="content">${news.content}</div>
        <div class="footer"><span>Diterbitkan oleh ${news.display_name || (news.author?.split('@')[0] || 'Admin')}</span><span>Laporanmu</span></div>
        </body></html>`)
        w.document.close()
        setTimeout(() => {
            w.focus()
            w.print()
        }, 300)
    }
    return (
        <Modal
            isOpen
            onClose={onClose}
            size="lg"
            noPadding
            title="Informasi Sekolah"
            description={`${formatDate(news.created_at)}${news.read_time ? ` · ${news.read_time} mnt baca` : ''}`}
            footer={(
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white font-semibold text-sm shrink-0">
                        {(news.display_name || news.author || 'A').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                        <p className={`${microLabelCls} text-text-muted mb-0.5`}>Diterbitkan oleh</p>
                        <p className="text-sm font-semibold text-text truncate">{news.display_name || news.author?.split('@')[0] || 'Admin'}</p>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                        <Button variant="secondary" size="sm" onClick={handlePrint}>
                            <Printer className="w-4 h-4" /> Print
                        </Button>
                        <Button variant="secondary" size="sm" onClick={onClose}>Tutup</Button>
                    </div>
                </div>
            )}
        >
            {/* Thumbnail */}
            {news.image_url && (
                <div className="h-56 sm:h-64 w-full shrink-0 relative">
                    <img src={news.image_url} alt={news.image_alt || news.title} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                    <div className="absolute inset-0 bg-gradient-to-t from-surface to-transparent" />
                </div>
            )}
            {/* Body */}
            <div className="px-6 sm:px-10 py-8">
                {/* Meta + Font Size */}
                <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="primary">{news.tag}</Badge>
                    </div>
                    {/* Font size controls */}
                    <div className="flex items-center gap-0.5 bg-surface-alt border border-border rounded-lg p-1 shrink-0">
                        {NEWS_FONT_SIZES.map((f, i) => (
                            <button key={f.key} onClick={() => setFontSize(f.key)}
                                className={`w-8 h-8 rounded-lg flex items-center justify-center font-semibold transition-colors ${fontSize === f.key ? 'bg-primary text-white' : 'text-text-muted hover:bg-surface hover:text-text'}`}
                                style={{ fontSize: 10 + i * 2 }}
                                aria-label={`Ukuran teks ${f.key.toUpperCase()}`}>
                                A
                            </button>
                        ))}
                    </div>
                </div>
                <h2 className={`${fs.title} font-bold text-text mb-6 leading-tight tracking-tight`}>{news.title}</h2>
                <style>{`
                    .news-modal-body p{margin-bottom:1rem}
                    .news-modal-body h2{font-size:1.3rem;font-weight:700;margin:1.5rem 0 .5rem;color:var(--color-text)}
                    .news-modal-body h3{font-size:1.1rem;font-weight:600;margin:1.25rem 0 .4rem;color:var(--color-text)}
                    .news-modal-body ul{list-style:disc;margin-left:1.5rem;margin-bottom:1rem}
                    .news-modal-body ol{list-style:decimal;margin-left:1.5rem;margin-bottom:1rem}
                    .news-modal-body li{margin-bottom:.3rem}
                    .news-modal-body strong{font-weight:700;color:var(--color-primary)}
                    .news-modal-body a{color:var(--color-primary);text-decoration:underline}
                    .news-modal-body blockquote{border-left:3px solid var(--color-primary);padding-left:1rem;margin-bottom:1rem;opacity:.75;font-style:italic}
                    .news-modal-body img{border-radius:.75rem;max-width:100%;margin:1rem 0}
                `}</style>
                <div className={`news-modal-body ${fs.body} text-text leading-[1.85] font-medium opacity-90`}
                    style={{ overflowWrap: 'anywhere' }}
                    dangerouslySetInnerHTML={{ __html: news.content }} />
            </div>
        </Modal>
    )
}

/* ───────────────────────────── Landing Page ───────────────────────────── */
export default function LandingPage() {
    const { user } = useAuth()
    const { isDark, toggleTheme } = useTheme()
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
    const [scrolled, setScrolled] = useState(false)
    const [news, setNews] = useState([])
    const [newsLoading, setNewsLoading] = useState(true)
    const [selectedNews, setSelectedNews] = useState(null)
    const [newsBadge, setNewsBadge] = useState(0)
    const [openFaq, setOpenFaq] = useState(null)
    const [showScrollTop, setShowScrollTop] = useState(false)
    const realtimeDebounceRef = useRef(null)

    const fetchNews = useCallback(async () => {
        const { data, error } = await supabase
            .from('news')
            .select('id, title, excerpt, content, tag, image_url, image_alt, created_at, author, display_name, is_featured, slug, read_time')
            .eq('is_published', true)
            .order('is_featured', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(6)

        if (!error && data) setNews(data)
        setNewsLoading(false)
    }, [])

    useEffect(() => {
        document.title = 'Laporanmu - Sistem Manajemen Perilaku & Kedisiplinan Siswa'

        const handleScroll = () => {
            setScrolled(window.scrollY > 20)
            setShowScrollTop(window.scrollY > 500)
        }
        window.addEventListener('scroll', handleScroll, { passive: true })

        fetchNews()

        // Realtime Listener — debounced
        const channel = supabase
            .channel('public:news')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'news' }, (payload) => {
                clearTimeout(realtimeDebounceRef.current)
                realtimeDebounceRef.current = setTimeout(() => {
                    if (payload.eventType === 'INSERT' && payload.new?.is_published) {
                        setNewsBadge(n => n + 1)
                    }
                    fetchNews()
                }, 500)
            })
            .subscribe()

        return () => {
            document.title = 'Laporanmu'
            window.removeEventListener('scroll', handleScroll)
            supabase.removeChannel(channel)
        }
    }, [fetchNews])

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    return (
        <div className="min-h-screen bg-surface transition-colors duration-300 overflow-x-hidden">
            <style>{`
                @media print {
                    nav, footer, section, .no-print, .fixed, .absolute:not(.news-modal), .ChatAssistant-bubble { display: none !important; }
                    .news-modal { position: static !important; width: 100% !important; height: auto !important; margin: 0 !important; padding: 0 !important; }
                }
            `}</style>

            {/* ═══ NAVBAR ═══ */}
            <nav className={`fixed w-full z-50 transition-colors duration-300 ${scrolled ? 'bg-surface border-b border-border py-3' : 'bg-transparent py-5'}`}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between relative">
                        {/* Logo */}
                        <Link to="/" className="flex items-center gap-2.5 relative z-50">
                            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
                                <span className="text-white font-bold text-lg">L</span>
                            </div>
                            <span className="font-bold text-xl text-text tracking-tight">Laporan<span className="text-primary">mu</span></span>
                        </Link>

                        {/* Desktop Nav */}
                        <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center gap-1 bg-surface px-2 py-2 rounded-full border border-border">
                            <a href="#visi-misi" className={navLinkCls}>Visi</a>
                            <a href="#fitur" className={navLinkCls}>Fitur</a>
                            <a href="#alur" className={navLinkCls}>Alur</a>
                            <a href="#Informasi" onClick={() => setNewsBadge(0)} className={`${navLinkCls} relative`}>
                                Informasi
                                {newsBadge > 0 && (
                                    <span className="absolute -top-1.5 -right-2 min-w-4 h-4 px-1 rounded-full bg-danger text-white text-xs font-semibold flex items-center justify-center leading-none">
                                        {newsBadge > 9 ? '9+' : newsBadge}
                                    </span>
                                )}
                            </a>
                        </div>

                        {/* Desktop Actions */}
                        <div className="hidden md:flex items-center gap-3 z-50">
                            <button onClick={toggleTheme} className={iconBtnCls} aria-label="Toggle theme">
                                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                            </button>
                            <Link to="/check" className={ctaCls('secondary', 'md')}>
                                Cek Poin & Raport
                            </Link>
                            <Link to={user ? "/dashboard" : "/login"} className={ctaCls('primary', 'md')}>
                                {user ? 'Ke Dashboard' : 'Login Staff'}
                            </Link>
                        </div>

                        {/* Mobile Actions */}
                        <div className="flex items-center gap-2 md:hidden z-50">
                            <button onClick={toggleTheme} className={iconBtnCls} aria-label="Toggle theme">
                                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                            </button>
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
                            {[
                                { name: 'Visi & Misi', id: 'visi-misi' },
                                { name: 'Fitur Utama', id: 'fitur' },
                                { name: 'Alur Kerja', id: 'alur' },
                                { name: 'Informasi', id: 'Informasi' }
                            ].map((item, i) => (
                                <a key={i} href={`#${item.id}`} className="flex items-center h-10 px-4 rounded-lg text-sm font-medium text-text hover:bg-surface-alt hover:text-primary transition-colors" onClick={() => setIsMobileMenuOpen(false)}>
                                    {item.name}
                                </a>
                            ))}
                            <div className="h-px bg-border my-2 mx-2" />
                            <Link to="/check" className={`${ctaCls('secondary', 'md')} w-full`} onClick={() => setIsMobileMenuOpen(false)}>
                                Cek Data Siswa
                            </Link>
                            <Link to={user ? "/dashboard" : "/login"} className={`${ctaCls('primary', 'md')} w-full mt-1.5`} onClick={() => setIsMobileMenuOpen(false)}>
                                {user ? 'Ke Dashboard' : 'Login Staff'}
                                <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>
                    </div>
                </div>
            </nav>

            {/* ═══ HERO ═══ */}
            <section className="pt-32 lg:pt-44 pb-20 lg:pb-28 relative z-10 flex flex-col items-center justify-center min-h-[90vh]">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full text-center">
                    {/* Badge */}
                    <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-surface border border-border shadow-sm mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
                        </span>
                        <span className="text-sm font-medium text-text">
                            Sistem Manajemen Perilaku Siswa
                        </span>
                    </div>

                    <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-text mb-6 leading-[1.1] max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                        Kelola Perilaku Siswa
                        <br className="hidden sm:block" />
                        <span className="gradient-text"> Lebih Modern & Terukur</span>
                    </h1>

                    <p className="text-lg sm:text-xl text-text-muted mb-10 max-w-2xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-4 duration-500">
                        Layanan resmi pemantauan perilaku dan prestasi siswa secara terintegrasi. Memudahkan koordinasi antara sekolah dan wali murid secara transparan.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <Link to={user ? "/dashboard" : "/login"} className={`${ctaCls('primary')} w-full sm:w-auto group`}>
                            {user ? 'Ke Dashboard' : 'Mulai Sekarang'}
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                        </Link>
                        <Link to="/check" className={`${ctaCls('secondary')} w-full sm:w-auto`}>
                            Portal Wali Murid
                        </Link>
                    </div>
                </div>

                {/* Dashboard Preview Mockup */}
                <div className="w-full max-w-5xl mx-auto mt-16 lg:mt-20 px-4 sm:px-6 lg:px-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="relative rounded-xl border border-border bg-surface shadow-sm p-1.5">
                        <div className="rounded-lg overflow-hidden bg-surface border border-border flex flex-col">
                            {/* Mockup Header */}
                            <div className="h-11 bg-surface-alt border-b border-border flex items-center px-3 gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-full bg-danger/70" />
                                <div className="w-2.5 h-2.5 rounded-full bg-warning/70" />
                                <div className="w-2.5 h-2.5 rounded-full bg-success/70" />
                                <div className="mx-auto bg-surface border border-border rounded-md h-6 w-1/3 flex items-center justify-center">
                                    <span className="text-xs text-text-muted font-medium">app.laporanmu.com</span>
                                </div>
                            </div>
                            {/* Mockup Body */}
                            <div className="p-6 grid grid-cols-12 gap-5 h-[380px]">
                                {/* Sidebar */}
                                <div className="col-span-3 hidden md:flex flex-col gap-3">
                                    <div className="h-8 w-24 bg-border rounded-md mb-4" />
                                    {[1, 2, 3, 4].map(i => (
                                        <div key={i} className={`h-10 w-full rounded-lg ${i === 1 ? 'bg-primary/10' : 'bg-surface-alt'}`} />
                                    ))}
                                </div>
                                {/* Main Content */}
                                <div className="col-span-12 md:col-span-9 flex flex-col gap-5">
                                    <div className="flex justify-between items-center">
                                        <div className="h-8 w-48 bg-surface-alt rounded-lg" />
                                        <div className="h-10 w-32 bg-primary rounded-lg" />
                                    </div>
                                    <div className="grid grid-cols-3 gap-4">
                                        {[
                                            { color: 'bg-primary/15', accent: 'bg-primary' },
                                            { color: 'bg-success/15', accent: 'bg-success' },
                                            { color: 'bg-warning/15', accent: 'bg-warning' }
                                        ].map((card, i) => (
                                            <div key={i} className={`h-28 ${card.color} rounded-xl border border-border p-4 flex flex-col justify-between`}>
                                                <div className={`w-8 h-8 rounded-full ${card.accent} opacity-40`} />
                                                <div className="space-y-1">
                                                    <div className="h-4 w-12 bg-border rounded" />
                                                    <div className="h-6 w-20 bg-border rounded" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="h-full bg-surface-alt rounded-xl border border-border p-4 flex items-end gap-2">
                                        {/* Mini bar chart */}
                                        {[40, 65, 45, 80, 55, 70, 90, 60, 75, 50, 85, 68].map((h, i) => (
                                            <div key={i} className="flex-1 flex flex-col justify-end h-full">
                                                <div
                                                    className="w-full rounded-t-md bg-primary/25 border border-primary/10"
                                                    style={{ height: `${h}%`, transition: 'height 1s ease' }}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══ VISI & MISI ═══ */}
            <section id="visi-misi" className="py-20 sm:py-24 relative z-10 overflow-hidden">

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 sm:gap-16 items-start">
                        {/* Vision */}
                        <Reveal>
                            <div className="bg-primary-dark p-8 sm:p-12 rounded-xl text-white shadow-sm relative overflow-hidden border border-white/10">
                                <div className="absolute top-0 right-0 p-8 opacity-10">
                                    <Quote className="w-6 h-6 text-primary-light" />
                                </div>
                                <span className="inline-block px-3 py-1 rounded-full bg-white/10 text-white text-xs font-semibold uppercase tracking-wider mb-8 border border-white/20">Visi Utama</span>
                                <h2 className="text-3xl sm:text-4xl font-bold mb-10 leading-tight">
                                    Mewujudkan Ekosistem Sekolah yang <span className="text-primary-light">Disiplin, Adil, dan Transparan</span> Melalui Pendekatan Inovatif.
                                </h2>
                                <p className="text-white/80 leading-relaxed text-lg border-l-2 border-primary-light pl-6">
                                    "Kedisiplinan bukan tentang hukuman, melainkan tentang pembentukan karakter yang siap menghadapi masa depan."
                                </p>
                            </div>
                        </Reveal>

                        {/* Mission */}
                        <Reveal delay={0.15}>
                            <div className="py-2">
                                <span className={`${microLabelCls} text-primary mb-4 block`}>Misi Kedisiplinan</span>
                                <h3 className="text-3xl font-bold text-text mb-12 leading-tight">Membangun Karakter & Integritas Siswa Secara Berkelanjutan.</h3>

                                <div className="space-y-10">
                                    {[
                                        { icon: Shield, color: 'bg-primary/10 text-primary', title: 'Integritas Data', desc: 'Menjamin setiap rekaman perilaku tercatat secara akurat, objektif, dan transparan tanpa ada manipulasi.' },
                                        { icon: ChartLine, color: 'bg-success/10 text-success', title: 'Monitoring Pertumbuhan', desc: 'Fokus pada evaluasi prestasi dan perilaku harian untuk mendukung potensi terbaik setiap murid.' },
                                        { icon: Users, color: 'bg-warning/10 text-warning', title: 'Sinergi Orang Tua', desc: 'Memperkuat jalinan komunikasi antara sekolah dan wali murid dalam memantau tumbuh kembang karakter siswa.' }
                                    ].map((misi, i) => (
                                        <Reveal key={i} delay={0.1 * (i + 1)}>
                                            <div className="flex gap-5">
                                                <div className={`w-14 h-14 shrink-0 rounded-xl ${misi.color} flex items-center justify-center`}>
                                                    <misi.icon className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <h4 className="text-lg font-bold text-text mb-2">{misi.title}</h4>
                                                    <p className="text-text-muted text-sm leading-relaxed max-w-sm">{misi.desc}</p>
                                                </div>
                                            </div>
                                        </Reveal>
                                    ))}
                                </div>
                            </div>
                        </Reveal>
                    </div>
                </div>
            </section>

            {/* ═══ FITUR UNGGULAN ═══ */}
            <section id="fitur" className="py-24 relative z-10 bg-surface-alt/40 border-t border-border">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <Reveal>
                        <div className="text-center mb-14">
                            <span className={`${microLabelCls} text-primary mb-3 block`}>Modul Terintegrasi</span>
                            <h2 className="text-3xl sm:text-4xl font-bold text-text mb-4">
                                Fitur Unggulan <span className="text-primary">Laporanmu</span>
                            </h2>
                            <p className="text-sm sm:text-base text-text-muted max-w-xl mx-auto leading-relaxed">
                                Sistem dirancang khusus untuk mempermudah tugas guru BK, staf keamanan, wali kelas, hingga wali murid.
                            </p>
                        </div>
                    </Reveal>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[
                            { icon: ChartLine, title: "Poin Perilaku & Tatib", desc: "Catat skor pelanggaran (minus) dan prestasi (plus) siswa secara instan sesuai aturan buku saku sekolah." },
                            { icon: Search, title: "Portal Wali Murid", desc: "Orang tua cukup memasukkan NISN/ID siswa untuk mengecek rekapitulasi poin, absensi, dan raport secara real-time tanpa perlu mendaftar." },
                            { icon: Users, title: "Raport Bulanan & Absensi", desc: "Pembuatan laporan absensi bulanan serta akumulasi nilai perilaku siswa secara otomatis untuk wali kelas." },
                            { icon: Shield, title: "Sistem Keamanan Gerbang", desc: "Modul khusus untuk satpam/petugas piket mencatat waktu keterlambatan atau izin keluar masuk siswa di gerbang sekolah." },
                            { icon: Newspaper, title: "Pengumuman Real-time", desc: "Bagikan berita penting sekolah, jadwal ujian, rapat wali murid, hingga artikel edukasi karakter secara terintegrasi." },
                            { icon: Star, title: "AI Insights & Prediksi", desc: "Analisis cerdas berbasis AI untuk mendeteksi dini tren perilaku buruk siswa agar sekolah dapat memberikan tindakan preventif." }
                        ].map((fitur, idx) => (
                            <Reveal key={idx} delay={0.08 * idx}>
                                <div className="group h-full bg-surface border border-border rounded-xl shadow-sm p-6 sm:p-8 hover:border-primary/40 transition-colors flex flex-col">
                                    <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-6">
                                        <fitur.icon className="w-6 h-6" />
                                    </div>
                                    <h4 className="font-bold text-text text-lg mb-3 group-hover:text-primary transition-colors">{fitur.title}</h4>
                                    <p className="text-sm text-text-muted leading-relaxed">{fitur.desc}</p>
                                </div>
                            </Reveal>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══ Informasi ═══ */}
            <Reveal>
                <section id="Informasi" className="py-24 relative z-10">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        {/* Section header */}
                        <div className="flex flex-col md:flex-row justify-between items-end mb-10 gap-6">
                            <div>
                                <span className={`${microLabelCls} text-primary mb-3 block`}>Informasi Terkini</span>
                                <h2 className="text-3xl font-bold text-text mb-3">Informasi & <span className="text-primary">Pengumuman</span></h2>
                                <p className="text-text-muted font-medium text-sm sm:text-base max-w-md">Update terkini seputar Laporanmu, jadwal, dan pengumuman penting sekolah.</p>
                            </div>
                            <Link to="/informasi" className="group inline-flex items-center gap-1.5 text-primary font-semibold text-sm hover:text-primary-dark transition-colors shrink-0">
                                Lihat Semua Informasi
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                            </Link>
                        </div>

                        {newsLoading ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {[1, 2, 3].map(i => (
                                    <Skeleton key={i} className="h-72 rounded-xl" />
                                ))}
                            </div>
                        ) : news.length === 0 ? (
                            <div className="py-16 text-center rounded-xl border-2 border-dashed border-border bg-surface-alt/40">
                                <Newspaper className="w-8 h-8 text-text-muted opacity-40 mx-auto mb-3" />
                                <p className={`${microLabelCls} text-text-muted`}>Belum ada Informasi</p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {/* Featured hero card — shown if first article is featured */}
                                {news[0]?.is_featured && (
                                    <Reveal>
                                        <div
                                            className="group relative rounded-xl overflow-hidden border border-border bg-surface shadow-sm hover:border-primary/40 transition-colors cursor-pointer"
                                            onClick={() => setSelectedNews(news[0])}
                                        >
                                            <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[320px]">
                                                {/* Image */}
                                                <div className="relative overflow-hidden lg:order-2 h-64 lg:h-auto">
                                                    {news[0].image_url ? (
                                                        <img src={news[0].image_url} alt={news[0].image_alt || news[0].title} loading="lazy"
                                                            className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                                                            <Newspaper className="w-6 h-6 text-primary/40" />
                                                        </div>
                                                    )}
                                                    <div className="absolute inset-0 bg-gradient-to-t lg:bg-gradient-to-r from-surface to-transparent" />
                                                </div>
                                                {/* Content */}
                                                <div className="relative lg:order-1 p-8 sm:p-10 flex flex-col justify-center bg-surface">
                                                    <div className="flex items-center gap-2 mb-4 flex-wrap">
                                                        <Badge variant="warning">
                                                            <Star className="w-3.5 h-3.5" /> Featured
                                                        </Badge>
                                                        <Badge variant="primary">{news[0].tag}</Badge>
                                                    </div>
                                                    <h3 className="text-2xl sm:text-3xl font-bold text-text leading-tight mb-4 group-hover:text-primary transition-colors">
                                                        {news[0].title}
                                                    </h3>
                                                    <p className="text-sm text-text-muted leading-relaxed mb-6 line-clamp-3">
                                                        {stripHtml(news[0].excerpt || news[0].content).slice(0, 160) + '…'}
                                                    </p>
                                                    <div className={`flex items-center gap-4 ${microLabelCls} text-text-muted`}>
                                                        <span className="flex items-center gap-1.5">
                                                            <Calendar className="w-4 h-4" />
                                                            {new Date(news[0].created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                                                        </span>
                                                        {news[0].read_time && (
                                                            <span className="flex items-center gap-1.5">
                                                                <Clock className="w-4 h-4" />
                                                                {news[0].read_time} mnt baca
                                                            </span>
                                                        )}
                                                        <span className="flex items-center gap-1.5">
                                                            <User className="w-4 h-4" />
                                                            {news[0].display_name || news[0].author?.split('@')[0] || 'Admin'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </Reveal>
                                )}

                                {/* Regular cards grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {news.filter((_, i) => i > 0 || !news[0]?.is_featured).slice(0, 3).map((item, i) => (
                                        <Reveal key={item.id} delay={0.08 * i}>
                                            <div
                                                className="group bg-surface border border-border rounded-xl overflow-hidden shadow-sm hover:border-primary/40 transition-colors flex flex-col h-full cursor-pointer"
                                                onClick={() => setSelectedNews(item)}
                                            >
                                                <div className="h-44 w-full overflow-hidden shrink-0 relative">
                                                    {item.image_url ? (
                                                        <img src={item.image_url} alt={item.image_alt || item.title} loading="lazy"
                                                            className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                                                            <Newspaper className="w-6 h-6 text-primary/40" />
                                                        </div>
                                                    )}
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                                                </div>
                                                <div className="p-6 flex flex-col flex-1">
                                                    <div className="flex items-center gap-2 mb-4 flex-wrap">
                                                        <Badge variant="primary">{item.tag}</Badge>
                                                        <span className={`${microLabelCls} text-text-muted`}>
                                                            {new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                        </span>
                                                        {item.read_time && (
                                                            <span className={`${microLabelCls} text-text-muted flex items-center gap-1`}>
                                                                <Clock className="w-3.5 h-3.5" /> {item.read_time} mnt
                                                            </span>
                                                        )}
                                                    </div>
                                                    <h3 className="text-lg font-bold text-text mb-3 leading-tight group-hover:text-primary transition-colors line-clamp-2">
                                                        {item.title}
                                                    </h3>
                                                    <p className="text-sm text-text-muted leading-relaxed mb-4 line-clamp-3 font-medium">
                                                        {stripHtml(item.excerpt || item.content).slice(0, 140) + '…'}
                                                    </p>
                                                    <div className="mt-auto pt-4 border-t border-border flex items-center justify-between">
                                                        <span className={`${microLabelCls} text-text-muted flex items-center gap-1.5`}>
                                                            <User className="w-3.5 h-3.5" />
                                                            {item.display_name || item.author?.split('@')[0] || 'Admin'}
                                                        </span>
                                                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary group-hover:text-primary-dark transition-colors">
                                                            Baca
                                                            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </Reveal>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </section>
            </Reveal>

            {/* ═══ ALUR KERJA ═══ */}
            <section id="alur" className="py-20 bg-surface relative z-10 border-t border-border">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <Reveal>
                        <div className="text-center mb-14">
                            <h2 className="text-3xl sm:text-4xl font-bold text-text mb-4 leading-tight">
                                Alur Kerja <span className="text-primary">Sederhana</span>
                            </h2>
                            <p className="text-sm sm:text-base text-text-muted max-w-xl mx-auto leading-relaxed">
                                Membangun ekosistem kedisiplinan sekolah yang modern hanya butuh 3 langkah instan.
                            </p>
                        </div>
                    </Reveal>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">

                        {[
                            { step: '01', title: 'Input Master Data', desc: 'Atur poin pelanggaran dan prestasi sesuai buku tatib sekolah Anda.' },
                            { step: '02', title: 'Catat Perilaku', desc: 'Guru/BK mencatat kejadian lewat dashboard yang cepat dan instan.' },
                            { step: '03', title: 'Analisis & Pantau', desc: 'Sistem akumulasi poin otomatis. Wali murid bisa pantau via HP.' },
                        ].map((item, idx) => (
                            <Reveal key={idx} delay={0.12 * idx}>
                                <div className="relative z-10 bg-app-bg border border-border rounded-xl p-8 shadow-sm hover:border-primary/40 transition-colors flex flex-col items-center text-center">
                                    <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center font-bold text-base mb-6">
                                        {item.step}
                                    </div>
                                    <h4 className="font-bold text-text text-lg mb-3 tracking-tight">{item.title}</h4>
                                    <p className="text-sm text-text-muted leading-relaxed">{item.desc}</p>
                                </div>
                            </Reveal>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══ FAQ SECTION ═══ */}
            <section className="py-24 bg-surface-alt/40 border-t border-border relative z-10">
                <div className="max-w-4xl mx-auto px-4 sm:px-6">
                    <Reveal>
                        <div className="text-center mb-14">
                            <span className={`${microLabelCls} text-primary mb-3 block`}>Tanya Jawab</span>
                            <h2 className="text-3xl font-bold text-text mb-4">Pertanyaan Populer</h2>
                            <p className="text-sm text-text-muted max-w-md mx-auto">Masih bingung? Temukan jawaban untuk pertanyaan yang paling sering diajukan di bawah ini.</p>
                        </div>
                    </Reveal>

                    <div className="space-y-4">
                        {[
                            { q: "Bagaimana cara orang tua/wali murid memantau poin anaknya?", a: "Orang tua tidak perlu mendaftar akun atau login. Cukup klik tombol 'Portal Wali Murid' atau akses menu 'Cek Poin & Raport', lalu masukkan NISN atau ID Siswa untuk melihat detail poin pelanggaran, absensi, dan raport secara langsung secara real-time." },
                            { q: "Siapa saja yang memiliki hak akses untuk menginput poin perilaku?", a: "Input poin perilaku hanya bisa dilakukan oleh staf sekolah yang terdaftar (seperti Guru BK, Wali Kelas, Guru Piket, dan Administrator) dengan login menggunakan email staf resmi yang disetujui." },
                            { q: "Apakah skor poin siswa bisa diatur ulang (reset)?", a: "Ya, sistem Laporanmu mendukung manajemen Tahun Pelajaran. Skor poin siswa dapat dikonfigurasi untuk di-reset secara otomatis setiap pergantian semester atau tahun ajaran baru oleh Administrator." },
                            { q: "Bagaimana jika ada kesalahan pencatatan poin pelanggaran?", a: "Jika terdapat kesalahan input poin oleh guru, wali murid dapat melakukan koordinasi dengan pihak sekolah. Administrator atau guru BK yang memiliki otorisasi dapat melakukan revisi atau menghapus riwayat pelanggaran tersebut melalui dashboard staf." }
                        ].map((faq, idx) => {
                            const isOpen = openFaq === idx
                            return (
                                <Reveal key={idx} delay={0.05 * idx}>
                                    <div className="border border-border rounded-xl bg-surface overflow-hidden">
                                        <button
                                            onClick={() => setOpenFaq(isOpen ? null : idx)}
                                            className="w-full px-6 py-5 text-left flex items-center justify-between gap-4 font-semibold text-sm sm:text-base text-text hover:bg-surface-alt/60 transition-colors"
                                        >
                                            <span>{faq.q}</span>
                                            <span className={`text-primary transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
                                                <ChevronDown className="w-4 h-4" />
                                            </span>
                                        </button>
                                        <div className={`transition-[max-height] duration-300 ease-in-out overflow-hidden ${isOpen ? 'max-h-56 border-t border-border' : 'max-h-0'}`}>
                                            <p className="px-6 py-5 text-sm text-text-muted leading-relaxed bg-surface-alt/30">
                                                {faq.a}
                                            </p>
                                        </div>
                                    </div>
                                </Reveal>
                            )
                        })}
                    </div>
                </div>
            </section>

            {/* ═══ CTA ═══ */}
            <Reveal>
                <section className="py-24 relative z-10 px-4 sm:px-6 lg:px-8">
                    <div className="max-w-5xl mx-auto">
                        <div className="rounded-xl bg-primary-dark p-10 sm:p-16 text-center text-white shadow-sm">
                            <h2 className="text-3xl sm:text-5xl font-bold mb-6">
                                Siap Transformasi Kedisiplinan Sekolah?
                            </h2>
                            <p className="text-base sm:text-lg text-white/80 mb-10 max-w-2xl mx-auto">
                                Tinggalkan buku catatan manual. Beralih ke Laporanmu untuk pencatatan perilaku yang berintegritas dan transparan.
                            </p>
                            <div className="flex flex-col sm:flex-row justify-center gap-4">
                                <Link to={user ? "/dashboard" : "/login"} className={`${ctaCls('light')} w-full sm:w-auto`}>
                                    {user ? 'Ke Dashboard' : 'Login Staff / Guru'}
                                </Link>
                                <Link to="/check" className={`${ctaCls('ghost')} w-full sm:w-auto`}>
                                    <Search className="w-4 h-4" />
                                    Cek Data Siswa
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>
            </Reveal>

            {/* ═══ FOOTER ═══ */}
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
                                <a href="mailto:support@laporanmu.com" className="text-sm font-medium hover:text-primary transition-colors">itzme.rizal@gmail.com</a>
                            </div>
                        </div>
                        <div className="flex items-start gap-4">
                            <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                <Phone className="w-4 h-4" />
                            </div>
                            <div>
                                <h5 className={`${microLabelCls} text-text-muted mb-1`}>WhatsApp Center</h5>
                                <a href="https://wa.me/6281230660013" target="_blank" rel="noreferrer" className="text-sm font-medium hover:text-primary transition-colors">+62 812-3066-0013</a>
                            </div>
                        </div>
                        <div className="flex items-start gap-4">
                            <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                <MapPin className="w-4 h-4" />
                            </div>
                            <div>
                                <h5 className={`${microLabelCls} text-text-muted mb-1`}>Alamat Layanan</h5>
                                <p className="text-sm font-medium text-text">Jln. Pemandian No. 88, Patemon, Tanggul.</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col lg:flex-row items-center justify-between gap-6 lg:gap-4">
                        <div className="flex flex-col md:flex-row items-center gap-4 md:gap-10">
                            <Link to="/" className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
                                    <span className="text-white font-bold text-sm">L</span>
                                </div>
                                <span className="font-bold text-lg tracking-tight text-text">Laporanmu</span>
                            </Link>

                            <div className={`flex flex-wrap justify-center gap-x-6 gap-y-2 ${microLabelCls} text-text-muted`}>
                                {[
                                    { name: 'Visi', id: 'visi-misi' },
                                    { name: 'Fitur', id: 'fitur' },
                                    { name: 'Alur', id: 'alur' },
                                    { name: 'Informasi', id: 'Informasi' }
                                ].map((item, idx) => (
                                    <a key={idx} href={`#${item.id}`} className="hover:text-primary transition-colors">
                                        {item.name}
                                    </a>
                                ))}
                                <Link to={user ? "/dashboard" : "/login"} className="text-primary hover:text-primary-dark transition-colors">{user ? 'Ke Dashboard' : 'Akses Portal'}</Link>
                            </div>
                        </div>

                        <div className="flex items-center gap-6 text-xs text-text-muted font-medium">
                            <span>© 2026 <span className="text-text font-semibold">Laporanmu.</span> Built for excellence.</span>
                        </div>
                    </div>
                </div>
            </footer>

            {/* ═══ NEWS DETAIL MODAL ═══ */}
            {selectedNews && <NewsDetailModal news={selectedNews} onClose={() => setSelectedNews(null)} />}

            {/* Lazy-loaded Chat Assistant */}
            <div className="no-print">
                <Suspense fallback={null}>
                    <ChatAssistant />
                </Suspense>
            </div>

            {/* Scroll to Top Floating Button */}
            <button
                onClick={scrollToTop}
                className={`fixed bottom-6 right-6 z-50 w-10 h-10 rounded-full bg-surface border border-border text-primary flex items-center justify-center shadow-xl transition-[opacity,transform] duration-300 hover:bg-surface-alt active:scale-[0.98] ${showScrollTop ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}
                aria-label="Scroll to top"
            >
                <ArrowRight className="w-4 h-4 -rotate-90" />
            </button>
        </div>
    )
}
