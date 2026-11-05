import { useState } from 'react'
import { Clock, Printer } from 'lucide-react'
import { Badge, Button, Modal } from '@shared/components'

/* ───────────────────────────── Util Teks & Tanggal ───────────────────────────── */

/** Strip HTML tags + decode entity umum untuk excerpt yang bersih. */
export const stripHtml = (html = '') => html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()

/** Format tanggal Indonesia panjang: 5 November 2026. */
export const formatDateLong = (d) =>
    new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })

/** Format tanggal Indonesia pendek: 5 Nov 2026. */
export const formatDateShort = (d) =>
    new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })

/** Nama tampilan penulis berita. */
export const newsAuthor = (item) => item.display_name || item.author?.split('@')[0] || 'Admin'

/* ───────────────────────────── Detail Modal Berita ───────────────────────────── */

export const NEWS_FONT_SIZES = [
    { key: 'sm', body: 'text-sm', title: 'text-xl sm:text-2xl' },
    { key: 'md', body: 'text-base', title: 'text-2xl sm:text-3xl' },
    { key: 'lg', body: 'text-lg', title: 'text-3xl sm:text-4xl' },
]

// Warna aksen untuk dokumen cetak (window.print buka dokumen baru — CSS var tidak ikut,
// jadi resolve nilai token di runtime).
const resolvePrimary = () => {
    try {
        const v = getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim()
        return v || '#4f46e5'
    } catch {
        return '#4f46e5'
    }
}

/** Modal detail berita bersama — dipakai LandingPage & InformationPage. */
export function NewsDetailModal({ news, onClose }) {
    const [fontSize, setFontSize] = useState('sm')
    if (!news) return null
    const fs = NEWS_FONT_SIZES.find(f => f.key === fontSize)

    const handlePrint = () => {
        const primary = resolvePrimary()
        const w = window.open('', '_blank', 'width=800,height=600')
        w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${news.title}</title>
        <style>
            @page{margin:20mm} body{font-family:system-ui,sans-serif;max-width:100%;margin:0;padding:40px;color:#111;line-height:1.75}
            h1{font-size:1.75rem;font-weight:700;margin-bottom:.5rem;line-height:1.25}
            .meta{font-size:.7rem;color:#888;text-transform:uppercase;letter-spacing:.1em;margin-bottom:1.5rem;border-bottom:1px solid #eee;padding-bottom:.75rem}
            p{margin-bottom:.9rem}strong{color:${primary}}
            ul,ol{margin-left:1.5rem;margin-bottom:.9rem}li{margin-bottom:.25rem}
            blockquote{border-left:3px solid ${primary};padding-left:1rem;color:#666;font-style:italic;margin-bottom:.9rem}
            h2{font-size:1.2rem;font-weight:700;margin:1.5rem 0 .4rem}h3{font-size:1rem;font-weight:700;margin:1.2rem 0 .4rem}
            img{border-radius:.5rem;max-width:100%;margin:1rem 0}
            .footer{margin-top:2rem;padding-top:1rem;border-top:1px solid #eee;font-size:.7rem;color:#aaa;display:flex;justify-content:space-between}
        </style></head><body>
        <div class="meta">${news.tag} · ${formatDateLong(news.created_at)}${news.read_time ? ` · ${news.read_time} mnt baca` : ''}</div>
        <h1>${news.title}</h1>
        <div class="content">${news.content}</div>
        <div class="footer"><span>Diterbitkan oleh ${newsAuthor(news)}</span><span>Laporanmu</span></div>
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
            description={`${formatDateLong(news.created_at)}${news.read_time ? ` · ${news.read_time} mnt baca` : ''}`}
            footer={(
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white font-semibold text-sm shrink-0">
                        {(news.display_name || news.author || 'A').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-0.5">Diterbitkan oleh</p>
                        <p className="text-sm font-semibold text-text truncate">{newsAuthor(news)}</p>
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
                        {news.read_time && (
                            <span className="text-xs font-semibold uppercase tracking-wider text-text-muted flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" /> {news.read_time} mnt baca
                            </span>
                        )}
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
