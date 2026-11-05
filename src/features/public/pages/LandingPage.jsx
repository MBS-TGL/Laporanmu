import { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react'
import { Link } from 'react-router-dom'
import {
    ArrowRight,
    Calendar,
    ChartLine,
    ChevronDown,
    Clock,
    Newspaper,
    Quote,
    Search,
    Shield,
    Star,
    User,
    Users
} from 'lucide-react'
import { useAuth } from '@context/Auth'
import { supabase } from '@lib/supabase'
import { Badge, Skeleton } from '@shared/components'
import PublicLayout, { ctaCls, microLabelCls } from '../components/PublicLayout'
import Reveal from '../components/Reveal'
import { NewsDetailModal, stripHtml, formatDateShort, formatDateLong, newsAuthor } from '../components/newsShared'

const ChatAssistant = lazy(() => import('@core/components/ChatAssistant'))

/* Nav landing: anchor ke section + link PSB (funnel pendaftaran). */
const LANDING_NAV = [
    { label: 'Visi', href: '#visi-misi' },
    { label: 'Fitur', href: '#fitur' },
    { label: 'Alur', href: '#alur' },
    { label: 'Informasi', href: '#Informasi' },
    { label: 'PSB', href: '/psb' },
]

const LANDING_FOOTER_LINKS = [
    { label: 'Visi', href: '#visi-misi' },
    { label: 'Fitur', href: '#fitur' },
    { label: 'Alur', href: '#alur' },
    { label: 'Informasi', href: '#Informasi' },
    { label: 'PSB Online', href: '/psb' },
    { label: 'Cek Status PSB', href: '/psb/status' },
]

/* ───────────────────────────── Landing Page ───────────────────────────── */
export default function LandingPage() {
    const { user } = useAuth()
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
        <PublicLayout
            variant="landing"
            navItems={LANDING_NAV}
            footerLinks={LANDING_FOOTER_LINKS}
            newsBadge={newsBadge}
            showCheckCta
        >
            <style>{`
                @media print {
                    nav, footer, section, .no-print, .fixed, .absolute:not(.news-modal), .ChatAssistant-bubble { display: none !important; }
                    .news-modal { position: static !important; width: 100% !important; height: auto !important; margin: 0 !important; padding: 0 !important; }
                }
            `}</style>

            {/* ═══ HERO ═══ */}
            <section className="pt-32 lg:pt-44 pb-20 lg:pb-28 relative z-10 flex flex-col items-center justify-center min-h-[90vh]">
                {/* Ambient glow halus di belakang hero */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
                    <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full bg-primary/[0.07] blur-3xl" />
                    <div className="absolute top-40 -left-40 w-96 h-96 rounded-full bg-primary/[0.05] blur-3xl" />
                    <div className="absolute top-56 -right-40 w-96 h-96 rounded-full bg-primary/[0.04] blur-3xl" />
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full text-center relative">
                    {/* Badge */}
                    <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-surface border border-border shadow-sm mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
                        </span>
                        <span className="text-sm font-medium text-text">
            Sistem Kedisiplinan, Raport &amp; PSB Terintegrasi
                        </span>
                    </div>

                    <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-text mb-6 leading-[1.1] max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                        Kelola Perilaku Siswa
                        <br className="hidden sm:block" />
                        <span className="gradient-text"> Lebih Modern &amp; Terukur</span>
                    </h1>

                    <p className="text-lg sm:text-xl text-text-muted mb-10 max-w-2xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-4 duration-500">
                        Layanan resmi pemantauan perilaku, raport, dan pendaftaran santri baru secara terintegrasi — memudahkan koordinasi antara sekolah dan wali murid secara transparan.
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
                <div className="w-full max-w-5xl mx-auto mt-16 lg:mt-20 px-4 sm:px-6 lg:px-8 animate-in fade-in slide-in-from-bottom-4 duration-700 relative">
                    <div className="absolute inset-x-8 -bottom-6 h-24 bg-primary/10 blur-2xl rounded-full pointer-events-none" aria-hidden />
                    <div className="relative rounded-xl border border-border bg-surface shadow-xl shadow-primary/5 p-1.5">
                        <div className="rounded-lg overflow-hidden bg-surface border border-border flex flex-col">
                            {/* Mockup Header */}
                            <div className="h-11 bg-surface-alt border-b border-border flex items-center px-3 gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-full bg-danger/70" />
                                <div className="w-2.5 h-2.5 rounded-full bg-warning/70" />
                                <div className="w-2.5 h-2.5 rounded-full bg-success/70" />
                                <div className="mx-auto bg-surface border border-border rounded-md h-6 w-1/3 flex items-center justify-center">
                                    <span className="text-xs text-text-muted font-medium">laporanmu.my.id</span>
                                </div>
                            </div>
                            {/* Mockup Body */}
                            <div className="p-6 grid grid-cols-12 gap-5 h-[380px]">
                                {/* Sidebar */}
                                <div className="col-span-3 hidden md:flex flex-col gap-3">
                                    <div className="h-8 w-24 bg-border rounded-md mb-4" />
                                    {[1, 2, 3, 4].map(i => (
                                        <div key={i} className={`h-10 w-full rounded-lg flex items-center gap-2 px-3 ${i === 1 ? 'bg-primary/10' : 'bg-surface-alt'}`}>
                                            <div className={`w-4 h-4 rounded-md ${i === 1 ? 'bg-primary/40' : 'bg-border'}`} />
                                            <div className={`h-2.5 flex-1 rounded-full ${i === 1 ? 'bg-primary/30' : 'bg-border'}`} />
                                        </div>
                                    ))}
                                </div>
                                {/* Main Content */}
                                <div className="col-span-12 md:col-span-9 flex flex-col gap-5">
                                    <div className="flex justify-between items-center">
                                        <div className="h-8 w-48 bg-surface-alt rounded-lg" />
                                        <div className="h-10 w-32 bg-primary rounded-lg shadow-sm" />
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
                                                    className={`w-full rounded-t-md border border-primary/10 ${i % 3 === 2 ? 'bg-success/40 border-success/20' : 'bg-primary/25'}`}
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
                                <h3 className="text-3xl font-bold text-text mb-12 leading-tight">Membangun Karakter &amp; Integritas Siswa Secara Berkelanjutan.</h3>

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
                                <h2 className="text-3xl font-bold text-text mb-3">Informasi &amp; <span className="text-primary">Pengumuman</span></h2>
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
                                                        {stripHtml(news[0].excerpt || news[0].content).slice(0, 160)}…
                                                    </p>
                                                    <div className={`flex items-center gap-4 ${microLabelCls} text-text-muted`}>
                                                        <span className="flex items-center gap-1.5">
                                                            <Calendar className="w-4 h-4" />
                                                            {formatDateLong(news[0].created_at)}
                                                        </span>
                                                        {news[0].read_time && (
                                                            <span className="flex items-center gap-1.5">
                                                                <Clock className="w-4 h-4" />
                                                                {news[0].read_time} mnt baca
                                                            </span>
                                                        )}
                                                        <span className="flex items-center gap-1.5">
                                                            <User className="w-4 h-4" />
                                                            {newsAuthor(news[0])}
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
                                                            {formatDateShort(item.created_at)}
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
                                                        {stripHtml(item.excerpt || item.content).slice(0, 140)}…
                                                    </p>
                                                    <div className="mt-auto pt-4 border-t border-border flex items-center justify-between">
                                                        <span className={`${microLabelCls} text-text-muted flex items-center gap-1.5`}>
                                                            <User className="w-3.5 h-3.5" />
                                                            {newsAuthor(item)}
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
                        <div className="rounded-xl bg-primary-dark p-10 sm:p-16 text-center text-white shadow-sm relative overflow-hidden">
                            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[500px] h-[250px] rounded-full bg-white/10 blur-3xl pointer-events-none" aria-hidden />
                            <h2 className="text-3xl sm:text-5xl font-bold mb-6 relative">
                                Siap Transformasi Kedisiplinan Sekolah?
                            </h2>
                            <p className="text-base sm:text-lg text-white/80 mb-10 max-w-2xl mx-auto relative">
                                Tinggalkan buku catatan manual. Beralih ke Laporanmu untuk pencatatan perilaku yang berintegritas dan transparan.
                            </p>
                            <div className="flex flex-col sm:flex-row justify-center gap-4 relative">
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
        </PublicLayout>
    )
}
