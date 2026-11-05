import { useState, useEffect, useCallback, useRef, memo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ChevronLeft, ChevronRight, Clock, Newspaper, Search, User, WifiOff, X } from 'lucide-react'
import { supabase } from '@lib/supabase'
import { Badge } from '@shared/components'
import PublicLayout, { microLabelCls } from '../components/PublicLayout'
import { NewsDetailModal, stripHtml, formatDateShort } from '../components/newsShared'

const PAGE_SIZE = 9
const CATEGORIES = ['Semua', 'Informasi', 'Kegiatan', 'Prestasi', 'Pengumuman']

const SkeletonCard = () => (
    <div className="bg-surface border border-border rounded-xl overflow-hidden animate-pulse">
        <div className="h-44 bg-surface-alt" />
        <div className="p-6 space-y-3">
            <div className="h-3 w-24 bg-surface-alt rounded-full" />
            <div className="h-4 w-full bg-surface-alt rounded-full" />
            <div className="h-4 w-3/4 bg-surface-alt rounded-full" />
            <div className="h-3 w-full bg-surface-alt rounded-full" />
        </div>
    </div>
)

const NewsCard = memo(({ item, onClick }) => {
    const excerpt = stripHtml(item.excerpt || item.content).slice(0, 140) + '…'
    return (
        <div onClick={() => onClick(item)} className="group bg-surface border border-border rounded-xl overflow-hidden hover:shadow-lg hover:border-primary/40 transition-all duration-300 flex flex-col cursor-pointer">
            <div className="h-44 overflow-hidden shrink-0 bg-surface-alt">
                {item.image_url
                    ? <img src={item.image_url} alt={item.image_alt || item.title} loading="lazy" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    : <div className="w-full h-full flex items-center justify-center opacity-15"><Newspaper className="w-6 h-6" /></div>
                }
            </div>
            <div className="p-6 flex flex-col flex-1">
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <Badge variant="primary">{item.tag}</Badge>
                    <span className={`${microLabelCls} text-text-muted`}>{formatDateShort(item.created_at)}</span>
                    {item.read_time && <span className={`${microLabelCls} text-text-muted flex items-center gap-1`}><Clock className="w-3.5 h-3.5" />{item.read_time} mnt</span>}
                </div>
                <h3 className="text-base font-bold text-text leading-tight mb-2 group-hover:text-primary transition-colors line-clamp-2">{item.title}</h3>
                <p className="text-xs text-text-muted leading-relaxed line-clamp-3 font-medium flex-1">{excerpt}</p>
                <div className="flex items-center justify-between pt-4 mt-3 border-t border-border/50">
                    <span className={`${microLabelCls} text-text-muted flex items-center gap-1`}>
                        <User className="w-3.5 h-3.5" />{item.display_name || item.author?.split('@')[0] || 'Admin'}
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-wider text-primary flex items-center gap-1.5">Baca <ArrowRight className="w-3.5 h-3.5" /></span>
                </div>
            </div>
        </div>
    )
})
NewsCard.displayName = 'NewsCard'

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function InformationPage() {
    const [news, setNews] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
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
        setError('')
        try {
            let q = supabase
                .from('news')
                .select('id,title,excerpt,content,tag,image_url,image_alt,created_at,author,display_name,read_time', { count: 'exact' })
                .eq('is_published', true)
                .order('created_at', { ascending: false })
            if (activeCategory !== 'Semua') q = q.eq('tag', activeCategory)
            if (search) q = q.ilike('title', `%${search}%`)
            q = q.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)
            const { data, count, error: fetchErr } = await q
            if (fetchErr) throw fetchErr
            setNews(data || [])
            setTotalCount(count || 0)
        } catch (err) {
            console.error('[PublicInfo] Fetch error:', err)
            setError('Gagal memuat informasi. Periksa koneksi internet Anda lalu coba lagi.')
            setNews([])
            setTotalCount(0)
        } finally {
            setLoading(false)
        }
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

    const INFO_NAV = [
        { label: 'Beranda', href: '/' },
        { label: 'Informasi', href: '/informasi' },
        { label: 'PSB', href: '/psb' },
        { label: 'Cek Poin', href: '/check' },
    ]

    return (
        <PublicLayout navItems={INFO_NAV} newsBadge={newsBadge}>
            <div className="min-h-[calc(100vh-64px)]">
                {/* New news banner */}
                {newsBadge > 0 && (
                    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-40 w-full max-w-xl px-4 animate-in slide-in-from-top-2 duration-300">
                        <div className="flex items-center gap-3 px-4 py-3 bg-surface border border-primary/30 rounded-xl shadow-xl">
                            <span className="w-2 h-2 rounded-full bg-primary animate-pulse shrink-0" />
                            <p className="text-sm font-bold text-primary flex-1">
                                {newsBadge} berita baru tersedia
                            </p>
                            <button onClick={() => { fetchNews(); setNewsBadge(0) }}
                                className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-bold uppercase tracking-wide hover:bg-primary-dark transition-colors shrink-0">
                                Muat Ulang
                            </button>
                            <button onClick={() => setNewsBadge(0)} className="text-text-muted hover:text-text transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}

                {/* Hero header */}
                <div className="pt-28 pb-12 px-4 sm:px-6 text-center relative overflow-hidden">
                    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
                        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full bg-primary/[0.06] blur-3xl" />
                    </div>
                    <div className="relative max-w-2xl mx-auto">
                        <span className={`${microLabelCls} text-primary mb-3 block`}>Portal Informasi</span>
                        <h1 className="text-4xl sm:text-5xl font-bold text-text mb-3 leading-tight tracking-tight">
                            Informasi &amp; <span className="text-primary">Pengumuman</span>
                        </h1>
                        <p className="text-text-muted text-base mb-8">
                            Update terkini seputar Laporanmu, jadwal, dan pengumuman penting sekolah.
                        </p>
                        <div className="relative max-w-lg mx-auto">
                            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                            <input type="text" value={inputVal} onChange={e => handleSearch(e.target.value)}
                                placeholder="Cari informasi atau pengumuman..."
                                className="w-full pl-12 pr-12 h-14 rounded-xl bg-surface border border-border focus:border-primary focus:ring-4 focus:ring-primary/10 text-sm font-medium outline-none transition-all shadow-sm" />
                            {inputVal && (
                                <button onClick={() => { setInputVal(''); setSearch(''); setPage(1) }} className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-text transition-colors">
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-24">
                    {/* Category chips */}
                    <div className="flex items-center gap-2 flex-wrap mb-8">
                        {CATEGORIES.map(cat => (
                            <button key={cat} onClick={() => { setActiveCategory(cat); setPage(1) }}
                                className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-colors border ${activeCategory === cat
                                    ? 'bg-primary text-white border-primary shadow-sm'
                                    : 'bg-surface border-border text-text-muted hover:border-primary/40 hover:text-text'}`}>
                                {cat}
                            </button>
                        ))}
                        {!loading && !error && <span className={`${microLabelCls} ml-auto text-text-muted`}>{totalCount} informasi</span>}
                    </div>

                    {search && !loading && !error && (
                        <div className="flex items-center gap-2 mb-6 text-sm text-text-muted">
                            Hasil untuk "<span className="font-bold text-text">{search}</span>" — {totalCount} ditemukan
                            <button onClick={() => { setInputVal(''); setSearch(''); setPage(1) }} className="ml-2 text-primary font-bold hover:underline text-xs">Hapus</button>
                        </div>
                    )}

                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
                        </div>
                    ) : error ? (
                        /* Error state — network/query gagal */
                        <div className="flex flex-col items-center py-32 text-center">
                            <div className="w-20 h-20 rounded-full bg-danger/10 flex items-center justify-center mb-6">
                                <WifiOff className="w-6 h-6 text-danger opacity-70" />
                            </div>
                            <h3 className="text-xl font-bold text-text mb-2">Gagal Memuat</h3>
                            <p className="text-sm text-text-muted max-w-sm">{error}</p>
                            <button onClick={fetchNews}
                                className="mt-6 px-6 py-3 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary-dark transition-colors">
                                Coba Lagi
                            </button>
                        </div>
                    ) : news.length === 0 ? (
                        <div className="flex flex-col items-center py-32 text-center">
                            <div className="w-20 h-20 rounded-full bg-surface-alt flex items-center justify-center mb-6">
                                <Newspaper className="w-6 h-6 text-text-muted opacity-40" />
                            </div>
                            <h3 className="text-xl font-bold text-text mb-2">Tidak ada informasi</h3>
                            <p className="text-sm text-text-muted">{search ? `Tidak ada yang cocok dengan "${search}".` : 'Belum ada informasi dipublikasikan.'}</p>
                            {(search || activeCategory !== 'Semua') && (
                                <button onClick={() => { setInputVal(''); setSearch(''); setActiveCategory('Semua'); setPage(1) }}
                                    className="mt-6 px-6 py-3 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary-dark transition-colors">
                                    Lihat semua
                                </button>
                            )}
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {news.map(item => <NewsCard key={item.id} item={item} onClick={setSelectedNews} />)}
                            </div>
                            {totalPages > 1 && (
                                <div className="flex items-center justify-center gap-2 mt-14">
                                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                                        className="w-10 h-10 rounded-lg border border-border flex items-center justify-center text-text-muted hover:border-primary disabled:opacity-30 transition-colors">
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                                        .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                                        .reduce((acc, p, idx, arr) => { if (idx > 0 && p - arr[idx - 1] > 1) acc.push('…'); acc.push(p); return acc }, [])
                                        .map((p, i) => p === '…'
                                            ? <span key={`e${i}`} className="w-10 h-10 flex items-center justify-center text-text-muted">…</span>
                                            : <button key={p} onClick={() => setPage(p)}
                                                className={`w-10 h-10 rounded-lg text-xs font-bold transition-colors ${p === page ? 'bg-primary text-white' : 'border border-border text-text-muted hover:border-primary'}`}>
                                                {p}
                                            </button>
                                        )}
                                    <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                                        className="w-10 h-10 rounded-lg border border-border flex items-center justify-center text-text-muted hover:border-primary disabled:opacity-30 transition-colors">
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            <NewsDetailModal news={selectedNews} onClose={() => setSelectedNews(null)} />
        </PublicLayout>
    )
}
