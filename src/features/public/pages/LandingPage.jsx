import { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react'
import { Link } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faArrowRight,
    faChartLine,
    faShieldAlt,
    faUsers,
    faMoon,
    faSun,
    faBars,
    faTimes,
    faQuoteLeft,
    faSearch,
    faClock,
    faUser,
    faStar,
    faNewspaper,
    faTag,
    faCalendar,
    faPrint,
    faEnvelope,
    faPhone,
    faLocationDot,
    faChevronDown
} from '@fortawesome/free-solid-svg-icons'
import { useTheme } from '@context/Theme'
import { useAuth } from '@context/Auth'
import { supabase } from '@lib/supabase'

const ChatAssistant = lazy(() => import('@core/layouts/ChatAssistant'))

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
            h1{font-size:1.75rem;font-weight:900;margin-bottom:.5rem;line-height:1.25}
            .meta{font-size:.7rem;color:#888;text-transform:uppercase;letter-spacing:.1em;margin-bottom:1.5rem;border-bottom:1px solid #eee;padding-bottom:.75rem}
            p{margin-bottom:.9rem}strong{color:#4f46e5}
            ul,ol{margin-left:1.5rem;margin-bottom:.9rem}li{margin-bottom:.25rem}
            blockquote{border-left:3px solid #4f46e5;padding-left:1rem;color:#666;font-style:italic;margin-bottom:.9rem}
            h2{font-size:1.2rem;font-weight:900;margin:1.5rem 0 .4rem}h3{font-size:1rem;font-weight:800;margin:1.2rem 0 .4rem}
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-200" onClick={onClose} />
            <div className="relative w-full max-w-2xl bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                {/* Thumbnail */}
                {news.image_url && (
                    <div className="h-56 sm:h-64 w-full shrink-0 relative">
                        <img src={news.image_url} alt={news.image_alt || news.title} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-surface)] via-transparent to-transparent" />
                        <button onClick={onClose} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/20 hover:bg-black/40 backdrop-blur-sm text-white flex items-center justify-center border border-white/10 transition-colors">
                            <FontAwesomeIcon icon={faTimes} />
                        </button>
                    </div>
                )}
                {/* Body */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 sm:p-10">
                    {/* Meta + Font Size + Close — always in one row, no overlap */}
                    <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-3 py-1.5 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-[10px] font-black uppercase tracking-[0.15em] border border-[var(--color-primary)]/10">{news.tag}</span>
                            <span className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest opacity-60">{formatDate(news.created_at)}</span>
                            {news.read_time && (
                                <span className="text-[10px] font-bold text-[var(--color-text-muted)] opacity-60 flex items-center gap-1">
                                    <FontAwesomeIcon icon={faClock} className="text-[8px]" />{news.read_time} mnt baca
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            {/* Font size controls */}
                            <div className="flex items-center gap-0.5 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-xl p-1">
                                {NEWS_FONT_SIZES.map((f, i) => (
                                    <button key={f.key} onClick={() => setFontSize(f.key)}
                                        className={`w-7 h-7 rounded-lg flex items-center justify-center font-black transition-colors ${fontSize === f.key ? 'bg-[var(--color-primary)] text-white shadow-sm' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
                                        style={{ fontSize: 10 + i * 2 }}>
                                        A
                                    </button>
                                ))}
                            </div>
                            {/* Close button — next to font toggle, never overlaps */}
                            <button onClick={onClose} className="w-8 h-8 rounded-full bg-[var(--color-surface-alt)] hover:bg-[var(--color-border)] border border-[var(--color-border)] text-[var(--color-text-muted)] flex items-center justify-center transition-colors">
                                <FontAwesomeIcon icon={faTimes} className="text-xs" />
                            </button>
                        </div>
                    </div>
                    <h2 className={`${fs.title} font-black text-[var(--color-text)] mb-6 leading-tight tracking-tight`}>{news.title}</h2>
                    <style>{`
                        .news-modal-body p{margin-bottom:1rem}
                        .news-modal-body h2{font-size:1.3rem;font-weight:900;margin:1.5rem 0 .5rem;color:var(--color-text)}
                        .news-modal-body h3{font-size:1.1rem;font-weight:800;margin:1.25rem 0 .4rem;color:var(--color-text)}
                        .news-modal-body ul{list-style:disc;margin-left:1.5rem;margin-bottom:1rem}
                        .news-modal-body ol{list-style:decimal;margin-left:1.5rem;margin-bottom:1rem}
                        .news-modal-body li{margin-bottom:.3rem}
                        .news-modal-body strong{font-weight:800;color:var(--color-primary)}
                        .news-modal-body a{color:var(--color-primary);text-decoration:underline}
                        .news-modal-body blockquote{border-left:3px solid var(--color-primary);padding-left:1rem;margin-bottom:1rem;opacity:.75;font-style:italic}
                        .news-modal-body img{border-radius:.75rem;max-width:100%;margin:1rem 0}
                    `}</style>
                    <div className={`news-modal-body ${fs.body} text-[var(--color-text)] leading-[1.85] font-medium opacity-90`}
                        style={{ overflowWrap: 'anywhere' }}
                        dangerouslySetInnerHTML={{ __html: news.content }} />
                </div>
                {/* Footer */}
                <div className="shrink-0 px-6 sm:px-10 py-4 border-t border-[var(--color-border)] bg-[var(--color-surface)]/80 backdrop-blur-sm flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] flex items-center justify-center text-white font-black text-base shadow-md shrink-0">
                        {(news.display_name || news.author || 'A').charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-50 mb-0.5">Diterbitkan oleh</p>
                        <p className="text-sm font-black text-[var(--color-text)]">{news.display_name || news.author?.split('@')[0] || 'Admin'}</p>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                        <button onClick={handlePrint} className="px-4 py-2 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] hover:bg-[var(--color-border)] transition-colors flex items-center gap-1.5">
                            <FontAwesomeIcon icon={faPrint} className="text-[9px]" /> Print
                        </button>
                        <button onClick={onClose} className="px-4 py-2 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] hover:bg-[var(--color-border)] transition-colors">Tutup</button>
                    </div>
                </div>
            </div>
        </div>
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
        <div className="min-h-screen bg-[var(--color-surface)] transition-colors duration-300 overflow-hidden">
            <style>{`
                @media print {
                    nav, footer, section, .no-print, .fixed, .absolute:not(.news-modal), .ChatAssistant-bubble { display: none !important; }
                    .news-modal { position: static !important; width: 100% !important; height: auto !important; margin: 0 !important; padding: 0 !important; }
                }
            `}</style>
            {/* Ambient Background Glows */}
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-primary/10 dark:bg-primary/5 blur-[100px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-accent/10 dark:bg-accent/5 blur-[120px]" />
            </div>

            {/* ═══ NAVBAR ═══ */}
            <nav className={`fixed w-full z-50 transition-all duration-300 ${scrolled ? 'glass py-3' : 'bg-transparent py-5'}`}>
                <div className="max-w-7xl mx-auto px-6 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between relative">
                        {/* Logo */}
                        <Link to="/" className="flex items-center gap-3 group relative z-50">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] flex items-center justify-center shadow-lg shadow-indigo-500/30 group-hover:scale-105 transition-transform duration-300">
                                <span className="text-white font-bold text-xl font-heading">L</span>
                            </div>
                            <span className="font-heading font-bold text-2xl text-[var(--color-text)] tracking-tight">Laporan<span className="text-[var(--color-primary)]">mu</span></span>
                        </Link>

                        {/* Desktop Nav */}
                        <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center gap-8 bg-[var(--color-surface)]/50 dark:bg-[var(--color-surface-alt)]/50 backdrop-blur-md px-6 py-2.5 rounded-full border border-[var(--color-border)]">
                            <a href="#visi-misi" className="text-[var(--color-text-muted)] hover:text-[var(--color-primary)] font-medium text-sm transition-all hover:scale-105 active:scale-95">Visi</a>
                            <a href="#fitur" className="text-[var(--color-text-muted)] hover:text-[var(--color-primary)] font-medium text-sm transition-all hover:scale-105 active:scale-95">Fitur</a>
                            <a href="#alur" className="text-[var(--color-text-muted)] hover:text-[var(--color-primary)] font-medium text-sm transition-all hover:scale-105 active:scale-95">Alur</a>
                            <a href="#Informasi" onClick={() => setNewsBadge(0)} className="relative text-[var(--color-text-muted)] hover:text-[var(--color-primary)] font-medium text-sm transition-all hover:scale-105 active:scale-95">
                                Informasi
                                {newsBadge > 0 && (
                                    <span className="absolute -top-2 -right-3.5 min-w-[16px] h-4 px-0.5 rounded-full bg-rose-500 text-white text-[8px] font-black flex items-center justify-center leading-none shadow-sm">
                                        {newsBadge > 9 ? '9+' : newsBadge}
                                    </span>
                                )}
                            </a>
                        </div>

                        {/* Desktop Actions */}
                        <div className="hidden md:flex items-center gap-4 z-50">
                            <button onClick={toggleTheme} className="w-10 h-10 rounded-full flex items-center justify-center bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)]/30 transition-all" aria-label="Toggle theme">
                                <FontAwesomeIcon icon={isDark ? faSun : faMoon} />
                            </button>
                            <Link to="/check" className="inline-flex items-center px-4 py-2 text-[13px] font-bold rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] transition-all">
                                Cek Poin & Raport
                            </Link>
                            <Link to={user ? "/dashboard" : "/login"} className="inline-flex items-center px-5 py-2 text-[13px] font-black rounded-xl bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-dark)] text-white shadow-lg shadow-indigo-500/20 hover:scale-105 active:scale-95 transition-all">
                                {user ? 'Ke Dashboard' : 'Login Staff'}
                            </Link>
                        </div>

                        {/* Mobile Actions */}
                        <div className="flex items-center gap-3 md:hidden z-50">
                            <button onClick={toggleTheme} className="w-10 h-10 flex items-center justify-center rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text)]">
                                <FontAwesomeIcon icon={isDark ? faSun : faMoon} />
                            </button>
                            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-dark)] text-white shadow-lg shadow-[var(--color-primary)]/30">
                                <FontAwesomeIcon icon={isMobileMenuOpen ? faTimes : faBars} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile Menu Overlay */}
                <div className={`fixed inset-0 z-40 md:hidden transition-all duration-300 ${isMobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
                    <div className={`absolute right-4 left-4 top-24 bg-[var(--color-surface)] rounded-2xl shadow-2xl border border-[var(--color-border)] p-5 transition-all duration-300 transform ${isMobileMenuOpen ? 'translate-y-0 scale-100' : '-translate-y-4 scale-95'}`}>
                        <div className="flex flex-col gap-2">
                            {[
                                { name: 'Visi & Misi', id: 'visi-misi' },
                                { name: 'Fitur Utama', id: 'fitur' },
                                { name: 'Alur Kerja', id: 'alur' },
                                { name: 'Informasi', id: 'Informasi' }
                            ].map((item, i) => (
                                <a key={i} href={`#${item.id}`} className="flex items-center px-4 py-3.5 rounded-xl text-sm font-semibold text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] hover:text-[var(--color-primary)] transition-colors" onClick={() => setIsMobileMenuOpen(false)}>
                                    {item.name}
                                </a>
                            ))}
                            <div className="h-px bg-[var(--color-border)] my-2 mx-2" />
                            <Link to="/check" className="flex items-center justify-center px-4 py-3.5 rounded-xl bg-[var(--color-surface-alt)] text-[var(--color-text)] font-semibold text-sm border border-[var(--color-border)] active:scale-95 transition-all w-full" onClick={() => setIsMobileMenuOpen(false)}>
                                Cek Data Siswa
                            </Link>
                            <Link to={user ? "/dashboard" : "/login"} className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white font-bold text-sm shadow-lg shadow-[var(--color-primary)]/20 active:scale-95 transition-all w-full mt-2" onClick={() => setIsMobileMenuOpen(false)}>
                                {user ? 'Ke Dashboard' : 'Login Staff'}
                                <FontAwesomeIcon icon={faArrowRight} className="text-xs" />
                            </Link>
                        </div>
                    </div>
                </div>
            </nav>

            {/* ═══ HERO ═══ */}
            <section className="pt-32 lg:pt-48 pb-20 lg:pb-32 relative z-10 flex flex-col items-center justify-center min-h-[90vh]">
                <div className="max-w-7xl mx-auto px-6 sm:px-6 lg:px-8 w-full text-center">
                    {/* Badge */}
                    <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-[var(--color-surface)]/80 backdrop-blur-md border border-[var(--color-primary)]/20 shadow-xl shadow-[var(--color-primary)]/5 mb-10 animate-[fadeIn_1s_ease-out]">
                        <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-accent)] opacity-75" />
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-[var(--color-primary)]" />
                        </span>
                        <span className="text-sm font-semibold text-[var(--color-text)] tracking-wide">
                            Sistem Manajemen Perilaku Siswa
                        </span>
                    </div>

                    <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-[var(--color-text)] mb-8 leading-[1.1] max-w-4xl mx-auto animate-[fadeIn_1s_ease-out_0.2s_both]">
                        Kelola Perilaku Siswa
                        <br className="hidden sm:block" />
                        <span className="gradient-text"> Lebih Modern & Terukur</span>
                    </h1>

                    <p className="text-lg sm:text-xl text-[var(--color-text-muted)] mb-12 max-w-2xl mx-auto leading-relaxed animate-[fadeIn_1s_ease-out_0.4s_both]">
                        Layanan resmi pemantauan perilaku dan prestasi siswa secara terintegrasi. Memudahkan koordinasi antara sekolah dan wali murid secara transparan.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-5 w-full sm:w-auto animate-[fadeIn_1s_ease-out_0.6s_both]">
                        <Link to={user ? "/dashboard" : "/login"} className="btn btn-primary w-full sm:w-auto group text-base px-8 py-4">
                            {user ? 'Ke Dashboard' : 'Mulai Sekarang'}
                            <FontAwesomeIcon icon={faArrowRight} className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                        </Link>
                        <Link to="/check" className="btn btn-secondary w-full sm:w-auto text-base px-8 py-4 bg-[var(--color-surface)]/80 backdrop-blur">
                            Portal Wali Murid
                        </Link>
                    </div>
                </div>

                {/* Dashboard Preview Mockup */}
                <div className="w-full max-w-5xl mx-auto mt-20 px-4 sm:px-6 lg:px-8 animate-[fadeIn_1s_ease-out_0.8s_both]">
                    <div className="relative rounded-2xl border border-[var(--color-border)]/50 bg-[var(--color-surface)]/40 p-2 glass shadow-2xl">
                        <div className="rounded-xl overflow-hidden bg-[var(--color-surface)] border border-[var(--color-border)] flex flex-col">
                            {/* Mockup Header */}
                            <div className="h-12 bg-[var(--color-surface-alt)] border-b border-[var(--color-border)] flex items-center px-4 gap-2">
                                <div className="w-3 h-3 rounded-full bg-red-400" />
                                <div className="w-3 h-3 rounded-full bg-amber-400" />
                                <div className="w-3 h-3 rounded-full bg-green-400" />
                                <div className="mx-auto bg-[var(--color-surface)] border border-[var(--color-border)] rounded-md h-6 w-1/3 flex items-center justify-center">
                                    <span className="text-[10px] text-[var(--color-text-muted)] font-mono">app.laporanmu.com</span>
                                </div>
                            </div>
                            {/* Mockup Body */}
                            <div className="p-6 grid grid-cols-12 gap-6 h-[400px]">
                                {/* Sidebar */}
                                <div className="col-span-3 hidden md:flex flex-col gap-3">
                                    <div className="h-8 w-24 bg-[var(--color-border)] rounded-md mb-4" />
                                    {[1, 2, 3, 4].map(i => (
                                        <div key={i} className={`h-10 w-full rounded-lg ${i === 1 ? 'bg-[var(--color-primary)]/10' : 'bg-[var(--color-surface-alt)]'}`} />
                                    ))}
                                </div>
                                {/* Main Content */}
                                <div className="col-span-12 md:col-span-9 flex flex-col gap-6">
                                    <div className="flex justify-between items-center">
                                        <div className="h-8 w-48 bg-[var(--color-surface-alt)] rounded-lg" />
                                        <div className="h-10 w-32 bg-[var(--color-primary)] rounded-lg opacity-80" />
                                    </div>
                                    <div className="grid grid-cols-3 gap-4">
                                        {[
                                            { color: 'bg-blue-500/15', accent: 'bg-blue-500' },
                                            { color: 'bg-emerald-500/15', accent: 'bg-emerald-500' },
                                            { color: 'bg-amber-500/15', accent: 'bg-amber-500' }
                                        ].map((card, i) => (
                                            <div key={i} className={`h-28 ${card.color} rounded-xl border border-[var(--color-border)] p-4 flex flex-col justify-between`}>
                                                <div className={`w-8 h-8 rounded-full ${card.accent} opacity-30`} />
                                                <div className="space-y-1">
                                                    <div className="h-4 w-12 bg-[var(--color-border)] rounded" />
                                                    <div className="h-6 w-20 bg-[var(--color-border)] rounded" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="h-full bg-[var(--color-surface-alt)] rounded-xl border border-[var(--color-border)] p-4 flex items-end gap-2">
                                        {/* Mini bar chart */}
                                        {[40, 65, 45, 80, 55, 70, 90, 60, 75, 50, 85, 68].map((h, i) => (
                                            <div key={i} className="flex-1 flex flex-col justify-end h-full">
                                                <div
                                                    className="w-full rounded-t-md bg-[var(--color-primary)]/20 border border-[var(--color-primary)]/10"
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
                <div className="absolute top-0 right-0 w-96 h-96 bg-[var(--color-primary)]/5 rounded-full blur-[100px] -mr-48 -mt-48" />
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-[var(--color-accent)]/5 rounded-full blur-[100px] -ml-48 -mb-48" />

                <div className="max-w-7xl mx-auto px-6 sm:px-6 lg:px-8 relative">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 sm:gap-16 items-start">
                        {/* Vision */}
                        <Reveal>
                            <div className="bg-gradient-to-br from-slate-900 to-indigo-950 p-8 sm:p-12 rounded-[2.5rem] sm:rounded-[3.5rem] text-white shadow-2xl relative overflow-hidden group border border-white/5">
                                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500">
                                    <FontAwesomeIcon icon={faQuoteLeft} className="text-8xl text-indigo-400" />
                                </div>
                                <span className="inline-block px-4 py-1.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-bold uppercase tracking-[0.2em] mb-8 border border-indigo-500/30">Visi Utama</span>
                                <h2 className="text-3xl sm:text-4xl font-black mb-10 leading-tight">
                                    Mewujudkan Ekosistem Sekolah yang <span className="text-indigo-400">Disiplin, Adil, dan Transparan</span> Melalui Pendekatan Inovatif.
                                </h2>
                                <p className="text-white/70 leading-relaxed text-lg border-l-2 border-indigo-500 pl-6">
                                    "Kedisiplinan bukan tentang hukuman, melainkan tentang pembentukan karakter yang siap menghadapi masa depan."
                                </p>
                            </div>
                        </Reveal>

                        {/* Mission */}
                        <Reveal delay={0.15}>
                            <div className="py-2">
                                <span className="text-[var(--color-primary)] font-bold uppercase tracking-[0.3em] text-[10px] mb-4 block">Misi Kedisiplinan</span>
                                <h3 className="text-3xl font-black text-[var(--color-text)] mb-12 leading-tight">Membangun Karakter & Integritas Siswa Secara Berkelanjutan.</h3>

                                <div className="space-y-12">
                                    {[
                                        { icon: faShieldAlt, color: 'bg-blue-500/10 text-blue-500', title: 'Integritas Data', desc: 'Menjamin setiap rekaman perilaku tercatat secara akurat, objektif, dan transparan tanpa ada manipulasi.' },
                                        { icon: faChartLine, color: 'bg-emerald-500/10 text-emerald-500', title: 'Monitoring Pertumbuhan', desc: 'Fokus pada evaluasi prestasi dan perilaku harian untuk mendukung potensi terbaik setiap murid.' },
                                        { icon: faUsers, color: 'bg-amber-500/10 text-amber-500', title: 'Sinergi Orang Tua', desc: 'Memperkuat jalinan komunikasi antara sekolah dan wali murid dalam memantau tumbuh kembang karakter siswa.' }
                                    ].map((misi, i) => (
                                        <Reveal key={i} delay={0.1 * (i + 1)}>
                                            <div className="flex gap-6 group">
                                                <div className={`w-14 h-14 shrink-0 rounded-2xl ${misi.color} flex items-center justify-center text-xl shadow-sm border border-transparent group-hover:scale-110 transition-all duration-300`}>
                                                    <FontAwesomeIcon icon={misi.icon} />
                                                </div>
                                                <div>
                                                    <h4 className="text-lg font-bold text-[var(--color-text)] mb-2 group-hover:text-[var(--color-primary)] transition-colors">{misi.title}</h4>
                                                    <p className="text-[var(--color-text-muted)] text-sm leading-relaxed max-w-sm">{misi.desc}</p>
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
            <section id="fitur" className="py-24 relative z-10 bg-[var(--color-surface-alt)]/30 border-t border-[var(--color-border)]">
                <div className="max-w-7xl mx-auto px-6 sm:px-6 lg:px-8">
                    <Reveal>
                        <div className="text-center mb-16">
                            <span className="text-[var(--color-primary)] font-bold uppercase tracking-[0.3em] text-[10px] mb-3 block">Modul Terintegrasi</span>
                            <h2 className="text-3xl sm:text-4xl font-black text-[var(--color-text)] mb-4">
                                Fitur Unggulan <span className="text-[var(--color-primary)]">Laporanmu</span>
                            </h2>
                            <p className="text-sm sm:text-base text-[var(--color-text-muted)] max-w-xl mx-auto leading-relaxed">
                                Sistem dirancang khusus untuk mempermudah tugas guru BK, staf keamanan, wali kelas, hingga wali murid.
                            </p>
                        </div>
                    </Reveal>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {[
                            { icon: faChartLine, title: "Poin Perilaku & Tatib", desc: "Catat skor pelanggaran (minus) dan prestasi (plus) siswa secara instan sesuai aturan buku saku sekolah." },
                            { icon: faSearch, title: "Portal Wali Murid", desc: "Orang tua cukup memasukkan NISN/ID siswa untuk mengecek rekapitulasi poin, absensi, dan raport secara real-time tanpa perlu mendaftar." },
                            { icon: faUsers, title: "Raport Bulanan & Absensi", desc: "Pembuatan laporan absensi bulanan serta akumulasi nilai perilaku siswa secara otomatis untuk wali kelas." },
                            { icon: faShieldAlt, title: "Sistem Keamanan Gerbang", desc: "Modul khusus untuk satpam/petugas piket mencatat waktu keterlambatan atau izin keluar masuk siswa di gerbang sekolah." },
                            { icon: faNewspaper, title: "Pengumuman Real-time", desc: "Bagikan berita penting sekolah, jadwal ujian, rapat wali murid, hingga artikel edukasi karakter secara terintegrasi." },
                            { icon: faStar, title: "AI Insights & Prediksi", desc: "Analisis cerdas berbasis AI untuk mendeteksi dini tren perilaku buruk siswa agar sekolah dapat memberikan tindakan preventif." }
                        ].map((fitur, idx) => (
                            <Reveal key={idx} delay={0.08 * idx}>
                                <div className="group h-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[2rem] p-8 hover:border-[var(--color-primary)]/50 transition-all duration-300 hover:shadow-xl flex flex-col">
                                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-[var(--color-primary)] flex items-center justify-center text-lg mb-6 group-hover:scale-110 transition-transform">
                                        <FontAwesomeIcon icon={fitur.icon} />
                                    </div>
                                    <h4 className="font-bold text-[var(--color-text)] text-lg mb-3 group-hover:text-[var(--color-primary)] transition-colors">{fitur.title}</h4>
                                    <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">{fitur.desc}</p>
                                </div>
                            </Reveal>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══ Informasi ═══ */}
            <Reveal>
                <section id="Informasi" className="py-24 relative z-10">
                    <div className="max-w-7xl mx-auto px-6 sm:px-6 lg:px-8">
                        {/* Section header */}
                        <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
                            <div>
                                <span className="text-[var(--color-primary)] font-bold uppercase tracking-[0.3em] text-[10px] mb-3 block">Informasi Terkini</span>
                                <h2 className="text-3xl font-extrabold text-[var(--color-text)] mb-3">Informasi & <span className="text-[var(--color-primary)]">Pengumuman</span></h2>
                                <p className="text-[var(--color-text-muted)] font-medium text-sm sm:text-base max-w-md">Update terkini seputar Laporanmu, jadwal, dan pengumuman penting sekolah.</p>
                            </div>
                            <a href="/informasi" className="group text-[var(--color-primary)] font-bold flex items-center gap-2 hover:gap-3 text-sm transition-all shrink-0">
                                Lihat Semua Informasi
                                <FontAwesomeIcon icon={faArrowRight} className="text-xs group-hover:translate-x-0.5 transition-transform" />
                            </a>
                        </div>

                        {newsLoading ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="h-72 rounded-[2rem] bg-[var(--color-surface-alt)] animate-pulse border border-[var(--color-border)]" />
                                ))}
                            </div>
                        ) : news.length === 0 ? (
                            <div className="col-span-full py-20 text-center text-[var(--color-text-muted)] font-black bg-[var(--color-surface-alt)]/30 rounded-[3rem] border-2 border-dashed border-[var(--color-border)] uppercase tracking-[0.3em] text-[10px] opacity-50">
                                Belum ada Informasi
                            </div>
                        ) : (
                            <div className="space-y-8">
                                {/* Featured hero card — shown if first article is featured */}
                                {news[0]?.is_featured && (
                                    <Reveal>
                                        <div
                                            className="group relative rounded-[2.5rem] overflow-hidden border border-[var(--color-border)] hover:border-[var(--color-primary)]/30 transition-all duration-500 hover:shadow-2xl cursor-pointer"
                                            onClick={() => setSelectedNews(news[0])}
                                        >
                                            <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[320px]">
                                                {/* Image */}
                                                <div className="relative overflow-hidden lg:order-2 h-64 lg:h-auto">
                                                    {news[0].image_url ? (
                                                        <img src={news[0].image_url} alt={news[0].image_alt || news[0].title} loading="lazy"
                                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                                                    ) : (
                                                        <div className="w-full h-full bg-gradient-to-br from-[var(--color-primary)]/20 to-[var(--color-accent)]/20 flex items-center justify-center">
                                                            <FontAwesomeIcon icon={faNewspaper} className="text-6xl text-[var(--color-primary)]/30" />
                                                        </div>
                                                    )}
                                                    <div className="absolute inset-0 bg-gradient-to-t lg:bg-gradient-to-r from-[var(--color-surface)] to-transparent" />
                                                </div>
                                                {/* Content */}
                                                <div className="relative lg:order-1 p-8 sm:p-10 flex flex-col justify-center bg-[var(--color-surface)]">
                                                    <div className="flex items-center gap-2 mb-4 flex-wrap">
                                                        <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 text-[9px] font-black uppercase tracking-widest border border-amber-500/20">
                                                            <FontAwesomeIcon icon={faStar} className="text-[7px]" /> Featured
                                                        </span>
                                                        <span className="px-3 py-1 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-[9px] font-black uppercase tracking-widest border border-[var(--color-primary)]/10">
                                                            {news[0].tag}
                                                        </span>
                                                    </div>
                                                    <h3 className="text-2xl sm:text-3xl font-black text-[var(--color-text)] leading-tight mb-4 group-hover:text-[var(--color-primary)] transition-colors">
                                                        {news[0].title}
                                                    </h3>
                                                    <p className="text-sm text-[var(--color-text-muted)] leading-relaxed mb-6 opacity-80 line-clamp-3">
                                                        {stripHtml(news[0].excerpt || news[0].content).slice(0, 160) + '…'}
                                                    </p>
                                                    <div className="flex items-center gap-4 text-[10px] text-[var(--color-text-muted)] font-bold uppercase tracking-widest opacity-60">
                                                        <span className="flex items-center gap-1.5">
                                                            <FontAwesomeIcon icon={faCalendar} />
                                                            {new Date(news[0].created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                                                        </span>
                                                        {news[0].read_time && (
                                                            <span className="flex items-center gap-1.5">
                                                                <FontAwesomeIcon icon={faClock} />
                                                                {news[0].read_time} mnt baca
                                                            </span>
                                                        )}
                                                        <span className="flex items-center gap-1.5">
                                                            <FontAwesomeIcon icon={faUser} />
                                                            {news[0].display_name || news[0].author?.split('@')[0] || 'Admin'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </Reveal>
                                )}

                                {/* Regular cards grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                    {news.filter((_, i) => i > 0 || !news[0]?.is_featured).slice(0, 3).map((item, i) => (
                                        <Reveal key={item.id} delay={0.08 * i}>
                                            <div
                                                className="group bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[2.5rem] overflow-hidden hover:shadow-2xl hover:border-[var(--color-primary)]/30 transition-all duration-500 flex flex-col h-full cursor-pointer ring-1 ring-inset ring-transparent hover:ring-[var(--color-primary)]/10"
                                                onClick={() => setSelectedNews(item)}
                                            >
                                                <div className="h-44 w-full overflow-hidden shrink-0 relative">
                                                    {item.image_url ? (
                                                        <img src={item.image_url} alt={item.image_alt || item.title} loading="lazy"
                                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                                    ) : (
                                                        <div className="w-full h-full bg-gradient-to-br from-[var(--color-primary)]/20 to-[var(--color-accent)]/20 flex items-center justify-center">
                                                            <FontAwesomeIcon icon={faNewspaper} className="text-4xl text-[var(--color-primary)]/30" />
                                                        </div>
                                                    )}
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                                                </div>
                                                <div className="p-7 flex flex-col flex-1">
                                                    <div className="flex items-center gap-2 mb-4 flex-wrap">
                                                        <span className="px-3 py-1 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-[9px] font-black uppercase tracking-wider border border-[var(--color-primary)]/10">
                                                            {item.tag}
                                                        </span>
                                                        <span className="text-[var(--color-text-muted)] text-[9px] font-bold uppercase tracking-widest opacity-50">
                                                            {new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                        </span>
                                                        {item.read_time && (
                                                            <span className="text-[var(--color-text-muted)] text-[9px] font-bold opacity-50 flex items-center gap-1">
                                                                <FontAwesomeIcon icon={faClock} className="text-[8px]" /> {item.read_time} mnt
                                                            </span>
                                                        )}
                                                    </div>
                                                    <h3 className="text-xl font-black text-[var(--color-text)] mb-3 leading-tight group-hover:text-[var(--color-primary)] transition-colors line-clamp-2">
                                                        {item.title}
                                                    </h3>
                                                    <p className="text-sm text-[var(--color-text-muted)] leading-relaxed mb-4 line-clamp-3 font-medium opacity-80">
                                                        {stripHtml(item.excerpt || item.content).slice(0, 140) + '…'}
                                                    </p>
                                                    <div className="mt-auto pt-5 border-t border-[var(--color-border)]/50 flex items-center justify-between">
                                                        <span className="text-[9px] font-black text-[var(--color-text-muted)] opacity-50 uppercase tracking-widest flex items-center gap-1.5">
                                                            <FontAwesomeIcon icon={faUser} className="text-[8px]" />
                                                            {item.display_name || item.author?.split('@')[0] || 'Admin'}
                                                        </span>
                                                        <button className="group/btn inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[var(--color-primary)] hover:gap-2.5 transition-all duration-200">
                                                            Baca
                                                            <FontAwesomeIcon icon={faArrowRight} className="text-[9px]" />
                                                        </button>
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
            <section id="alur" className="py-20 bg-[var(--color-surface)] relative z-10 border-t border-[var(--color-border)]">
                <div className="max-w-7xl mx-auto px-6 sm:px-6 lg:px-8">
                    <Reveal>
                        <div className="text-center mb-16">
                            <h2 className="text-3xl sm:text-4xl font-black text-[var(--color-text)] mb-4 leading-tight">
                                Alur Kerja <span className="text-[var(--color-primary)]">Sederhana</span>
                            </h2>
                            <p className="text-sm sm:text-base text-[var(--color-text-muted)] max-w-xl mx-auto leading-relaxed">
                                Membangun ekosistem kedisiplinan sekolah yang modern hanya butuh 3 langkah instan.
                            </p>
                        </div>
                    </Reveal>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">

                        {[
                            { step: '01', title: 'Input Master Data', desc: 'Atur poin pelanggaran dan prestasi sesuai buku tatib sekolah Anda.' },
                            { step: '02', title: 'Catat Perilaku', desc: 'Guru/BK mencatat kejadian lewat dashboard yang cepat dan instan.' },
                            { step: '03', title: 'Analisis & Pantau', desc: 'Sistem akumulasi poin otomatis. Wali murid bisa pantau via HP.' },
                        ].map((item, idx) => (
                            <Reveal key={idx} delay={0.12 * idx}>
                                <div className="relative z-10 group bg-[var(--color-bg)] border border-[var(--color-border)] rounded-[2.5rem] p-8 hover:border-[var(--color-primary)]/50 transition-all duration-300 shadow-sm flex flex-col items-center text-center hover:shadow-xl">
                                    <div className="w-14 h-14 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center font-black text-xl shadow-lg shadow-indigo-500/30 mb-8 group-hover:scale-110 transition-transform">
                                        {item.step}
                                    </div>
                                    <h4 className="font-bold text-[var(--color-text)] text-lg mb-3 tracking-tight group-hover:text-[var(--color-primary)] transition-colors">{item.title}</h4>
                                    <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">{item.desc}</p>
                                </div>
                            </Reveal>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══ FAQ SECTION ═══ */}
            <section className="py-24 bg-[var(--color-surface-alt)]/20 border-t border-[var(--color-border)] relative z-10">
                <div className="max-w-4xl mx-auto px-6">
                    <Reveal>
                        <div className="text-center mb-16">
                            <span className="text-[var(--color-primary)] font-bold uppercase tracking-[0.3em] text-[10px] mb-3 block">Tanya Jawab</span>
                            <h2 className="text-3xl font-black text-[var(--color-text)] mb-4">Pertanyaan Populer</h2>
                            <p className="text-sm text-[var(--color-text-muted)] max-w-md mx-auto">Masih bingung? Temukan jawaban untuk pertanyaan yang paling sering diajukan di bawah ini.</p>
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
                                    <div className="border border-[var(--color-border)] rounded-2xl bg-[var(--color-surface)] overflow-hidden transition-all duration-300">
                                        <button
                                            onClick={() => setOpenFaq(isOpen ? null : idx)}
                                            className="w-full px-6 py-5 text-left flex items-center justify-between gap-4 font-bold text-sm sm:text-base text-[var(--color-text)] hover:bg-[var(--color-surface-alt)]/50 transition-colors"
                                        >
                                            <span>{faq.q}</span>
                                            <span className={`text-[var(--color-primary)] transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
                                                <FontAwesomeIcon icon={faChevronDown} className="text-xs" />
                                            </span>
                                        </button>
                                        <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isOpen ? 'max-h-48 border-t border-[var(--color-border)]' : 'max-h-0'}`}>
                                            <p className="px-6 py-5 text-sm text-[var(--color-text-muted)] leading-relaxed bg-[var(--color-surface-alt)]/20">
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
                        <div className="rounded-[3rem] bg-gradient-to-r from-[var(--color-primary-dark)] via-[var(--color-primary)] to-[var(--color-accent)] p-10 sm:p-16 text-center text-white shadow-2xl relative overflow-hidden">
                            {/* Decorative */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
                            <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full blur-3xl" />

                            <div className="relative z-10">
                                <h2 className="text-3xl sm:text-5xl font-bold mb-6 font-heading">
                                    Siap Transformasi Kedisiplinan Sekolah?
                                </h2>
                                <p className="text-base sm:text-xl text-white/80 mb-10 max-w-2xl mx-auto font-medium">
                                    Tinggalkan buku catatan manual. Beralih ke Laporanmu untuk pencatatan perilaku yang berintegritas dan transparan.
                                </p>
                                <div className="flex flex-col sm:flex-row justify-center gap-4">
                                    <Link to={user ? "/dashboard" : "/login"} className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-white text-[var(--color-primary-dark)] font-bold text-lg hover:scale-105 transition-transform shadow-xl w-full sm:w-auto">
                                        {user ? 'Ke Dashboard' : 'Login Staff / Guru'}
                                    </Link>
                                    <Link to="/check" className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl border-2 border-white/30 hover:bg-white/10 text-white font-bold text-lg transition-colors w-full sm:w-auto">
                                        <FontAwesomeIcon icon={faSearch} className="text-sm" />
                                        Cek Data Siswa
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </Reveal>

            {/* ═══ FOOTER ═══ */}
            <footer id="kontak" className="bg-[var(--color-surface)] text-[var(--color-text)] py-12 md:py-16 border-t border-[var(--color-border)] relative z-10">
                <div className="max-w-7xl mx-auto px-6">
                    {/* Kontak Detail Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-12 mb-12 border-b border-[var(--color-border)]">
                        <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center shrink-0">
                                <FontAwesomeIcon icon={faEnvelope} className="text-sm" />
                            </div>
                            <div>
                                <h5 className="font-bold text-xs uppercase tracking-widest text-[var(--color-text-muted)] mb-1">Hubungi Kami</h5>
                                <a href="mailto:support@laporanmu.com" className="text-sm font-semibold hover:text-[var(--color-primary)] transition-colors">itzme.rizal@gmail.com</a>
                            </div>
                        </div>
                        <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center shrink-0">
                                <FontAwesomeIcon icon={faPhone} className="text-sm" />
                            </div>
                            <div>
                                <h5 className="font-bold text-xs uppercase tracking-widest text-[var(--color-text-muted)] mb-1">WhatsApp Center</h5>
                                <a href="https://wa.me/6281230660013" target="_blank" rel="noreferrer" className="text-sm font-semibold hover:text-[var(--color-primary)] transition-colors">+62 812-3066-0013</a>
                            </div>
                        </div>
                        <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center shrink-0">
                                <FontAwesomeIcon icon={faLocationDot} className="text-sm" />
                            </div>
                            <div>
                                <h5 className="font-bold text-xs uppercase tracking-widest text-[var(--color-text-muted)] mb-1">Alamat Layanan</h5>
                                <p className="text-sm font-semibold text-[var(--color-text)]">Jln. Pemandian No. 88, Patemon, Tanggul.</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col lg:flex-row items-center justify-between gap-6 lg:gap-4">
                        <div className="flex flex-col md:flex-row items-center gap-4 md:gap-10">
                            <Link to="/" className="flex items-center gap-2 group">
                                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] flex items-center justify-center">
                                    <span className="text-white font-bold text-sm">L</span>
                                </div>
                                <span className="font-heading font-bold text-lg tracking-tight text-[var(--color-text)]">Laporanmu</span>
                            </Link>

                            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-[10px] md:text-[11px] font-bold uppercase tracking-widest text-[var(--color-text-muted)]">
                                {[
                                    { name: 'Visi', id: 'visi-misi' },
                                    { name: 'Fitur', id: 'fitur' },
                                    { name: 'Alur', id: 'alur' },
                                    { name: 'Informasi', id: 'Informasi' }
                                ].map((item, idx) => (
                                    <a key={idx} href={`#${item.id}`} className="hover:text-[var(--color-primary)] transition-colors">
                                        {item.name}
                                    </a>
                                ))}
                                <Link to={user ? "/dashboard" : "/login"} className="text-[var(--color-primary)] hover:opacity-80">{user ? 'Ke Dashboard' : 'Akses Portal'}</Link>
                            </div>
                        </div>

                        <div className="flex items-center gap-6 text-[10px] md:text-[11px] text-[var(--color-text-muted)] font-medium">
                            <span>© 2026 <span className="text-[var(--color-text)] font-semibold">Laporanmu.</span> Built for excellence.</span>
                            <div className="hidden sm:flex items-center gap-4 uppercase font-bold tracking-widest border-l border-[var(--color-border)] pl-6">
                                <Link to="/privacy" className="hover:text-[var(--color-text)] transition-colors">Privacy</Link>
                                <Link to="/terms" className="hover:text-[var(--color-text)] transition-colors">Terms</Link>
                            </div>
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
                className={`fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full glass border border-[var(--color-border)] text-[var(--color-primary)] flex items-center justify-center shadow-lg transition-all duration-300 hover:scale-110 active:scale-90 ${showScrollTop ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}
                aria-label="Scroll to top"
            >
                <FontAwesomeIcon icon={faArrowRight} className="-rotate-90" />
            </button>
        </div>
    )
}