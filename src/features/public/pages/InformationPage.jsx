import { useState, useEffect, useCallback, useRef, memo } from 'react'
import { Link } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faSearch, faNewspaper, faCalendar, faClock,
    faUser, faArrowRight, faXmark, faTimes,
    faMoon, faSun, faBars, faChevronLeft, faChevronRight, faPrint
} from '@fortawesome/free-solid-svg-icons'
import { supabase } from '@lib/supabase'
import { useTheme } from '@context/Theme'
import { useAuth } from '@context/Auth'

const PAGE_SIZE = 9
const CATEGORIES = ['Semua', 'Informasi', 'Kegiatan', 'Prestasi', 'Pengumuman']

const formatDate = (d) =>
    new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })

const stripHtml = (html = '') => html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ').trim()

// ─── Navbar ───────────────────────────────────────────────────────────────────
const Navbar = memo(() => {
    const { user } = useAuth()
    const { isDark, toggleTheme } = useTheme()
    const [scrolled, setScrolled] = useState(false)
    const [menuOpen, setMenuOpen] = useState(false)
    useEffect(() => {
        const fn = () => setScrolled(window.scrollY > 20)
        window.addEventListener('scroll', fn, { passive: true })
        return () => window.removeEventListener('scroll', fn)
    }, [])
    return (
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

                    {/* Desktop Nav - centered */}
                    <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center gap-8 bg-[var(--color-surface)]/50 dark:bg-[var(--color-surface-alt)]/50 backdrop-blur-md px-6 py-2.5 rounded-full border border-[var(--color-border)]">
                        <Link to="/" className="text-[var(--color-text-muted)] hover:text-[var(--color-primary)] font-medium text-sm transition-all hover:scale-105 active:scale-95">Beranda</Link>
                        <Link to="/informasi" className="text-[var(--color-primary)] font-black text-sm">Informasi</Link>
                        <Link to="/check" className="text-[var(--color-text-muted)] hover:text-[var(--color-primary)] font-medium text-sm transition-all hover:scale-105 active:scale-95">Cek Poin</Link>
                    </div>

                    {/* Desktop Actions */}
                    <div className="hidden md:flex items-center gap-4 z-50">
                        <button onClick={toggleTheme} className="w-10 h-10 rounded-full flex items-center justify-center bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)]/30 transition-all">
                            <FontAwesomeIcon icon={isDark ? faSun : faMoon} />
                        </button>
                        <Link to={user ? "/dashboard" : "/login"} className="inline-flex items-center px-5 py-2 text-[13px] font-black rounded-xl bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-dark)] text-white shadow-lg shadow-indigo-500/20 hover:scale-105 active:scale-95 transition-all">
                            {user ? 'Ke Dashboard' : 'Login Staff'}
                        </Link>
                    </div>

                    {/* Mobile Actions */}
                    <div className="flex items-center gap-3 md:hidden z-50">
                        <button onClick={toggleTheme} className="w-10 h-10 flex items-center justify-center rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text)]">
                            <FontAwesomeIcon icon={isDark ? faSun : faMoon} />
                        </button>
                        <button onClick={() => setMenuOpen(p => !p)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-dark)] text-white shadow-lg shadow-[var(--color-primary)]/30">
                            <FontAwesomeIcon icon={menuOpen ? faTimes : faBars} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu */}
            {menuOpen && (
                <div className="md:hidden absolute top-full left-4 right-4 mt-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl p-3 space-y-1 animate-in fade-in duration-200">
                    {[['/', 'Beranda'], ['/informasi', 'Informasi'], ['/check', 'Cek Poin'], [user ? '/dashboard' : '/login', user ? 'Ke Dashboard' : 'Login Staff']].map(([to, label]) => (
                        <Link key={to} to={to} onClick={() => setMenuOpen(false)} className="flex items-center px-4 py-3 rounded-xl text-sm font-semibold text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] transition-colors">{label}</Link>
                    ))}
                </div>
            )}
        </nav>
    )
})
Navbar.displayName = 'Navbar'

// ─── Shared News Detail Modal ──────────────────────────────────────────────────
const FONT_SIZES = [
    { key: 'sm', body: 'text-sm', title: 'text-xl sm:text-2xl' },
    { key: 'md', body: 'text-base', title: 'text-2xl sm:text-3xl' },
    { key: 'lg', body: 'text-lg', title: 'text-3xl sm:text-4xl' },
]

const DetailModal = memo(({ item, onClose }) => {
    const [fontSize, setFontSize] = useState('sm')
    if (!item) return null
    const fs = FONT_SIZES.find(f => f.key === fontSize)
    const fmt = (d) => new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    const handlePrint = () => {
        const w = window.open('', '_blank', 'width=800,height=600')
        w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${item.title}</title>
        <style>
            @page{margin:20mm} body{font-family:system-ui,sans-serif;max-width:100%;margin:0;padding:0;color:#111;line-height:1.75}
            h1{font-size:1.75rem;font-weight:900;margin-bottom:.5rem;line-height:1.25}
            .meta{font-size:.7rem;color:#888;text-transform:uppercase;letter-spacing:.1em;margin-bottom:1.5rem;border-bottom:1px solid #eee;padding-bottom:.75rem}
            p{margin-bottom:.9rem}strong{color:#4f46e5}
            ul,ol{margin-left:1.5rem;margin-bottom:.9rem}li{margin-bottom:.25rem}
            blockquote{border-left:3px solid #4f46e5;padding-left:1rem;color:#666;font-style:italic;margin-bottom:.9rem}
            h2{font-size:1.2rem;font-weight:900;margin:1.5rem 0 .4rem}h3{font-size:1rem;font-weight:800;margin:1.2rem 0 .4rem}
            img{border-radius:.5rem;max-width:100%;margin:1rem 0}
            .footer{margin-top:2rem;padding-top:1rem;border-top:1px solid #eee;font-size:.7rem;color:#aaa;display:flex;justify-content:space-between}
        </style></head><body>
        <div class="meta">${item.tag} · ${fmt(item.created_at)}${item.read_time ? ` · ${item.read_time} mnt baca` : ''}</div>
        <h1>${item.title}</h1>
        ${item.content}
        <div class="footer"><span>Diterbitkan oleh ${item.display_name || (item.author?.split('@')[0] || 'Admin')}</span><span>Laporanmu</span></div>
        </body></html>`)
        w.document.close()
        setTimeout(() => w.print(), 300)
    }
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-200" onClick={onClose} />
            <div className="relative w-full max-w-2xl bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                {/* Thumbnail */}
                {item.image_url && (
                    <div className="h-56 sm:h-64 w-full shrink-0 relative">
                        <img src={item.image_url} alt={item.image_alt || item.title} className="w-full h-full object-cover" />
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
                            <span className="px-3 py-1.5 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-[10px] font-black uppercase tracking-[0.15em] border border-[var(--color-primary)]/10">{item.tag}</span>
                            <span className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest opacity-60">{formatDate(item.created_at)}</span>
                            {item.read_time && (
                                <span className="text-[10px] font-bold text-[var(--color-text-muted)] opacity-60 flex items-center gap-1">
                                    <FontAwesomeIcon icon={faClock} className="text-[8px]" />{item.read_time} mnt baca
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            {/* Font size controls */}
                            <div className="flex items-center gap-0.5 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-xl p-1">
                                {FONT_SIZES.map((f, i) => (
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
                    <h2 className={`${fs.title} font-black text-[var(--color-text)] mb-6 leading-tight tracking-tight`}>{item.title}</h2>
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
                        dangerouslySetInnerHTML={{ __html: item.content }} />
                </div>
                {/* Footer */}
                <div className="shrink-0 px-6 sm:px-10 py-4 border-t border-[var(--color-border)] bg-[var(--color-surface)]/80 backdrop-blur-sm flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] flex items-center justify-center text-white font-black text-base shadow-md shrink-0">
                        {(item.display_name || item.author || 'A').charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-50 mb-0.5">Diterbitkan oleh</p>
                        <p className="text-sm font-black text-[var(--color-text)]">{item.display_name || item.author?.split('@')[0] || 'Admin'}</p>
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
})
DetailModal.displayName = 'DetailModal'

const SkeletonCard = () => (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[2rem] overflow-hidden animate-pulse">
        <div className="h-44 bg-[var(--color-surface-alt)]" />
        <div className="p-6 space-y-3">
            <div className="h-3 w-24 bg-[var(--color-surface-alt)] rounded-full" />
            <div className="h-4 w-full bg-[var(--color-surface-alt)] rounded-full" />
            <div className="h-4 w-3/4 bg-[var(--color-surface-alt)] rounded-full" />
            <div className="h-3 w-full bg-[var(--color-surface-alt)] rounded-full" />
        </div>
    </div>
)

const NewsCard = memo(({ item, onClick }) => {
    const excerpt = stripHtml(item.excerpt || item.content).slice(0, 140) + '…'
    return (
        <div onClick={() => onClick(item)} className="group bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[2rem] overflow-hidden hover:shadow-xl hover:border-[var(--color-primary)]/30 transition-all duration-300 flex flex-col cursor-pointer">
            <div className="h-44 overflow-hidden shrink-0 bg-[var(--color-surface-alt)]">
                {item.image_url
                    ? <img src={item.image_url} alt={item.image_alt || item.title} loading="lazy" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    : <div className="w-full h-full flex items-center justify-center opacity-15"><FontAwesomeIcon icon={faNewspaper} className="text-4xl" /></div>
                }
            </div>
            <div className="p-6 flex flex-col flex-1">
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <span className="px-2.5 py-1 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-[9px] font-black uppercase tracking-wider border border-[var(--color-primary)]/10">{item.tag}</span>
                    <span className="text-[9px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest opacity-50">{formatDate(item.created_at)}</span>
                    {item.read_time && <span className="text-[9px] text-[var(--color-text-muted)] opacity-50 flex items-center gap-1"><FontAwesomeIcon icon={faClock} className="text-[8px]" />{item.read_time} mnt</span>}
                </div>
                <h3 className="text-base font-black text-[var(--color-text)] leading-tight mb-2 group-hover:text-[var(--color-primary)] transition-colors line-clamp-2">{item.title}</h3>
                <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed line-clamp-3 opacity-75 flex-1">{excerpt}</p>
                <div className="flex items-center justify-between pt-4 mt-3 border-t border-[var(--color-border)]/50">
                    <span className="text-[9px] font-bold text-[var(--color-text-muted)] opacity-50 flex items-center gap-1">
                        <FontAwesomeIcon icon={faUser} className="text-[8px]" />{item.display_name || item.author?.split('@')[0] || 'Admin'}
                    </span>
                    <span className="text-[10px] font-black text-[var(--color-primary)] flex items-center gap-1.5">Baca <FontAwesomeIcon icon={faArrowRight} className="text-[9px]" /></span>
                </div>
            </div>
        </div>
    )
})
NewsCard.displayName = 'NewsCard'

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function InformationPage() {
    const { user } = useAuth()
    const [news, setNews] = useState([])
    const [loading, setLoading] = useState(true)
    const [totalCount, setTotalCount] = useState(0)
    const [search, setSearch] = useState('')
    const [inputVal, setInputVal] = useState('')
    const [activeCategory, setActiveCategory] = useState('Semua')
    const [page, setPage] = useState(1)
    const [selectedNews, setSelectedNews] = useState(null)
    const [newsBadge, setNewsBadge] = useState(0)
    const debounceRef = useRef(null)
    const realtimeDebounceRef = useRef(null)

    const fetchNews = useCallback(async () => {
        setLoading(true)
        let q = supabase
            .from('news')
            .select('id,title,excerpt,content,tag,image_url,image_alt,created_at,author,display_name,read_time', { count: 'exact' })
            .eq('is_published', true)
            .order('created_at', { ascending: false })
        if (activeCategory !== 'Semua') q = q.eq('tag', activeCategory)
        if (search) q = q.ilike('title', `%${search}%`)
        q = q.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)
        const { data, count } = await q
        setNews(data || [])
        setTotalCount(count || 0)
        setLoading(false)
    }, [search, activeCategory, page])

    useEffect(() => { fetchNews() }, [fetchNews])

    useEffect(() => {
        const ch = supabase.channel('news-pub')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'news' }, (payload) => {
                clearTimeout(realtimeDebounceRef.current)
                realtimeDebounceRef.current = setTimeout(() => {
                    if (payload.eventType === 'INSERT' && payload.new?.is_published) {
                        setNewsBadge(n => n + 1)
                    } else {
                        fetchNews()
                    }
                }, 500)
            })
            .subscribe()
        return () => supabase.removeChannel(ch)
    }, [fetchNews])

    useEffect(() => {
        const fn = (e) => { if (e.key === 'Escape') setSelectedNews(null) }
        window.addEventListener('keydown', fn)
        return () => window.removeEventListener('keydown', fn)
    }, [])

    const handleSearch = (val) => {
        setInputVal(val)
        clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => { setSearch(val); setPage(1) }, 400)
    }

    const totalPages = Math.ceil(totalCount / PAGE_SIZE)

    return (
        <div className="min-h-screen bg-[var(--color-surface)] transition-colors duration-300">
            <Navbar />

            {/* New news banner */}
            {newsBadge > 0 && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 z-40 w-full max-w-xl px-4 animate-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center gap-3 px-4 py-3 bg-[var(--color-surface)] border border-[var(--color-primary)]/30 rounded-2xl shadow-xl shadow-black/10">
                        <span className="w-2 h-2 rounded-full bg-[var(--color-primary)] animate-pulse shrink-0" />
                        <p className="text-sm font-bold text-[var(--color-primary)] flex-1">
                            {newsBadge} berita baru tersedia
                        </p>
                        <button onClick={() => { fetchNews(); setNewsBadge(0) }}
                            className="px-3 py-1.5 rounded-xl bg-[var(--color-primary)] text-white text-[10px] font-black uppercase tracking-widest hover:brightness-110 transition-all shrink-0">
                            Muat Ulang
                        </button>
                        <button onClick={() => setNewsBadge(0)} className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors">
                            <FontAwesomeIcon icon={faXmark} className="text-xs" />
                        </button>
                    </div>
                </div>
            )}

            {/* Hero header */}
            <div className="pt-28 pb-12 px-6 text-center relative overflow-hidden">
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute -top-20 left-1/3 w-96 h-96 bg-[var(--color-primary)]/5 rounded-full blur-[100px]" />
                    <div className="absolute bottom-0 right-1/3 w-80 h-80 bg-[var(--color-accent)]/5 rounded-full blur-[100px]" />
                </div>
                <div className="relative max-w-2xl mx-auto">
                    <span className="text-[var(--color-primary)] font-bold uppercase tracking-[0.3em] text-[10px] mb-3 block">Portal Informasi</span>
                    <h1 className="text-4xl sm:text-5xl font-black text-[var(--color-text)] mb-3 leading-tight tracking-tight">
                        Informasi & <span className="text-[var(--color-primary)]">Pengumuman</span>
                    </h1>
                    <p className="text-[var(--color-text-muted)] text-base mb-8">
                        Update terkini seputar Laporanmu, jadwal, dan pengumuman penting sekolah.
                    </p>
                    <div className="relative max-w-lg mx-auto">
                        <FontAwesomeIcon icon={faSearch} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] text-sm pointer-events-none" />
                        <input type="text" value={inputVal} onChange={e => handleSearch(e.target.value)}
                            placeholder="Cari informasi atau pengumuman..."
                            className="w-full pl-12 pr-12 h-14 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/10 text-sm font-medium outline-none transition-all shadow-lg" />
                        {inputVal && (
                            <button onClick={() => { setInputVal(''); setSearch(''); setPage(1) }} className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors">
                                <FontAwesomeIcon icon={faXmark} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 pb-24">
                {/* Category chips */}
                <div className="flex items-center gap-2 flex-wrap mb-8">
                    {CATEGORIES.map(cat => (
                        <button key={cat} onClick={() => { setActiveCategory(cat); setPage(1) }}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors border ${activeCategory === cat
                                ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-md shadow-[var(--color-primary)]/20'
                                : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)]/30'}`}>
                            {cat}
                        </button>
                    ))}
                    {!loading && <span className="ml-auto text-[10px] font-black text-[var(--color-text-muted)] opacity-50 uppercase tracking-widest">{totalCount} informasi</span>}
                </div>

                {search && !loading && (
                    <div className="flex items-center gap-2 mb-6 text-sm text-[var(--color-text-muted)]">
                        Hasil untuk "<span className="font-bold text-[var(--color-text)]">{search}</span>" — {totalCount} ditemukan
                        <button onClick={() => { setInputVal(''); setSearch(''); setPage(1) }} className="ml-2 text-[var(--color-primary)] font-bold hover:underline text-xs">Hapus</button>
                    </div>
                )}

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
                    </div>
                ) : news.length === 0 ? (
                    <div className="flex flex-col items-center py-32 text-center">
                        <div className="w-20 h-20 rounded-full bg-[var(--color-surface-alt)] flex items-center justify-center mb-6">
                            <FontAwesomeIcon icon={faNewspaper} className="text-3xl text-[var(--color-text-muted)] opacity-30" />
                        </div>
                        <h3 className="text-xl font-black text-[var(--color-text)] mb-2">Tidak ada informasi</h3>
                        <p className="text-sm text-[var(--color-text-muted)]">{search ? `Tidak ada yang cocok dengan "${search}".` : 'Belum ada informasi dipublikasikan.'}</p>
                        {(search || activeCategory !== 'Semua') && (
                            <button onClick={() => { setInputVal(''); setSearch(''); setActiveCategory('Semua'); setPage(1) }}
                                className="mt-6 px-6 py-3 rounded-2xl bg-[var(--color-primary)] text-white text-sm font-bold hover:brightness-110 transition-all">
                                Lihat semua
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {news.map(item => <NewsCard key={item.id} item={item} onClick={setSelectedNews} />)}
                        </div>
                        {totalPages > 1 && (
                            <div className="flex items-center justify-center gap-2 mt-14">
                                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                                    className="w-10 h-10 rounded-xl border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)] hover:border-[var(--color-primary)] disabled:opacity-30 transition-colors">
                                    <FontAwesomeIcon icon={faChevronLeft} className="text-xs" />
                                </button>
                                {Array.from({ length: totalPages }, (_, i) => i + 1)
                                    .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                                    .reduce((acc, p, idx, arr) => { if (idx > 0 && p - arr[idx - 1] > 1) acc.push('…'); acc.push(p); return acc }, [])
                                    .map((p, i) => p === '…'
                                        ? <span key={`e${i}`} className="w-10 h-10 flex items-center justify-center text-[var(--color-text-muted)]">…</span>
                                        : <button key={p} onClick={() => setPage(p)}
                                            className={`w-10 h-10 rounded-xl text-[11px] font-black transition-colors ${p === page ? 'bg-[var(--color-primary)] text-white' : 'border border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)]'}`}>
                                            {p}
                                        </button>
                                    )}
                                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                                    className="w-10 h-10 rounded-xl border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)] hover:border-[var(--color-primary)] disabled:opacity-30 transition-colors">
                                    <FontAwesomeIcon icon={faChevronRight} className="text-xs" />
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>

            <footer className="border-t border-[var(--color-border)] py-6 px-6">
                <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-[var(--color-text-muted)]">
                    <Link to="/" className="font-heading font-bold text-base text-[var(--color-text)]">Laporanmu</Link>
                    <span>© 2026 Laporanmu. All rights reserved.</span>
                    <div className="flex items-center gap-4">
                        <Link to="/" className="hover:text-[var(--color-primary)] transition-colors">Beranda</Link>
                        <Link to="/check" className="hover:text-[var(--color-primary)] transition-colors">Cek Poin</Link>
                        <Link to={user ? "/dashboard" : "/login"} className="hover:text-[var(--color-primary)] transition-colors">{user ? 'Ke Dashboard' : 'Login'}</Link>
                    </div>
                </div>
            </footer>

            <DetailModal item={selectedNews} onClose={() => setSelectedNews(null)} />
        </div>
    )
}