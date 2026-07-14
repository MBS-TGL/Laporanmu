import React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faChevronLeft, faChevronRight, faAnglesLeft, faAnglesRight
} from '@fortawesome/free-solid-svg-icons'
import RichSelect from './RichSelect'
import { useLanguage } from '@context'

const PAGINATION_STRINGS = {
    id: { totalData: 'Total Data', showing: 'Menampilkan', of: 'dari', rows: 'Baris:', page: 'Halaman', jump: 'Tujuan', jumpTip: 'Jump ke hal...', statusPrefix: 'Informasi' },
    en: { totalData: 'Total Data', showing: 'Showing', of: 'of', rows: 'Rows:', page: 'Page', jump: 'Go to', jumpTip: 'Jump to page...', statusPrefix: 'Information' },
    ar: { totalData: 'إجمالي البيانات', showing: 'عرض', of: 'من', rows: 'صفوف:', page: 'صفحة', jump: 'اذهب', jumpTip: 'انتقل إلى صفحة...', statusPrefix: 'معلومات' },
}

const PAGE_SIZE_OPTIONS = [
    { id: 10, name: '10' },
    { id: 25, name: '25' },
    { id: 50, name: '50' },
    { id: 100, name: '100' },
]

function getPageSizeMobileOptions(str) {
    return [
        { id: 10, name: `10 / ${str}` },
        { id: 25, name: `25 / ${str}` },
        { id: 50, name: `50 / ${str}` },
        { id: 100, name: `100 / ${str}` },
    ]
}

/**
 * Standard Pagination component based on StudentsPage style.
 */
function getPageItems(current, total) {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
    if (current <= 4) return [1, 2, 3, 4, 5, '...', total]
    if (current >= total - 3) return [1, '...', total - 4, total - 3, total - 2, total - 1, total]
    return [1, '...', current - 1, current, current + 1, '...', total]
}

export default function Pagination({
    totalRows,
    page,
    pageSize,
    setPage,
    setPageSize,
    label = 'Baris',
    jumpPage,
    setJumpPage,
}) {
    const { language } = useLanguage()
    const s = PAGINATION_STRINGS[language] || PAGINATION_STRINGS.id
    const PAGE_SIZE_OPTIONS_MOBILE = getPageSizeMobileOptions(s.page)
    const totalPages = Math.max(1, Math.ceil(totalRows / pageSize))
    const fromRow = totalRows === 0 ? 0 : (page - 1) * pageSize + 1
    const toRow = Math.min(page * pageSize, totalRows)

    if (totalRows === 0) return null

    const handlePageSizeChange = (val) => {
        setPageSize(Number(val))
        setPage(1)
    }

    return (
        <div className="p-4 border-t border-[var(--color-border)] bg-[var(--color-surface-alt)]/20 rounded-b-2xl">
            {/* ── MOBILE COMPACT PAGINATION (< md) ── */}
            <div className="flex md:hidden flex-col gap-3.5">
                <div className="flex items-center justify-between px-1">
                    <div className="flex flex-col">
                        <span className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60 mb-0.5">{s.totalData}</span>
                        <span className="text-[12px] font-extrabold text-[var(--color-text)] tracking-tight">{totalRows} <span className="text-[10px] font-bold opacity-60 uppercase tracking-wider ml-0.5">{label}</span></span>
                    </div>
                    <div className="w-24">
                        <RichSelect
                            value={pageSize}
                            onChange={handlePageSizeChange}
                            options={PAGE_SIZE_OPTIONS_MOBILE}
                            compact
                            small
                        />
                    </div>
                </div>

                <div className="flex items-center justify-between w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[1.25rem] shadow-sm p-1.5">
                    <div className="flex items-center gap-1">
                        <button
                            disabled={page <= 1}
                            onClick={() => setPage(1)}
                            className="w-9 h-9 flex items-center justify-center rounded-[0.8rem] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] hover:text-[var(--color-primary)] transition-all disabled:opacity-20 disabled:hover:bg-transparent disabled:active:scale-100 active:scale-90"
                        >
                            <FontAwesomeIcon icon={faAnglesLeft} className="text-[10px]" />
                        </button>
                        <button
                            disabled={page <= 1}
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            className="w-9 h-9 flex items-center justify-center rounded-[0.8rem] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] hover:text-[var(--color-primary)] transition-all disabled:opacity-20 disabled:hover:bg-transparent disabled:active:scale-100 active:scale-90"
                        >
                            <FontAwesomeIcon icon={faChevronLeft} className="text-[12px]" />
                        </button>
                    </div>

                    <div className="flex flex-col items-center justify-center px-2">
                        <span className="text-[8px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60 mb-0.5">{s.page}</span>
                        <div className="flex items-baseline gap-1">
                            <span className="text-[14px] font-black text-[var(--color-primary)] leading-none">{page}</span>
                            <span className="text-[10px] font-bold text-[var(--color-text-muted)] opacity-50 leading-none">/ {totalPages}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-1">
                        <button
                            disabled={page >= totalPages}
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            className="w-9 h-9 flex items-center justify-center rounded-[0.8rem] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] hover:text-[var(--color-primary)] transition-all disabled:opacity-20 disabled:hover:bg-transparent disabled:active:scale-100 active:scale-90"
                        >
                            <FontAwesomeIcon icon={faChevronRight} className="text-[12px]" />
                        </button>
                        <button
                            disabled={page >= totalPages}
                            onClick={() => setPage(totalPages)}
                            className="w-9 h-9 flex items-center justify-center rounded-[0.8rem] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] hover:text-[var(--color-primary)] transition-all disabled:opacity-20 disabled:hover:bg-transparent disabled:active:scale-100 active:scale-90"
                        >
                            <FontAwesomeIcon icon={faAnglesRight} className="text-[10px]" />
                        </button>
                    </div>
                </div>
            </div>

            {/* ── DESKTOP FULL PAGINATION (md+) ── */}
            <div className="hidden md:flex md:flex-row items-center justify-between gap-4">
                <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="flex flex-col items-center sm:items-start text-left">
                        <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-50 leading-none mb-1">{s.statusPrefix} {label}</p>
                        <p className="text-[11px] font-bold text-[var(--color-text)] whitespace-nowrap">
                            {s.showing} <span className="text-[var(--color-primary)]">{fromRow}—{toRow}</span> {s.of} <span className="text-[var(--color-primary)]">{totalRows}</span> {label}
                        </p>
                    </div>
                    <div className="h-8 w-px bg-[var(--color-border)] hidden sm:block mx-1 opacity-50" />
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60">{s.rows}</span>
                        <div className="w-[72px]">
                            <RichSelect
                                value={pageSize}
                                onChange={handlePageSizeChange}
                                options={PAGE_SIZE_OPTIONS}
                                compact
                                small
                            />
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2">
                    <div className="flex items-center gap-1">
                        <button disabled={page <= 1} onClick={() => setPage(1)}
                            className="h-9 w-9 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-all disabled:opacity-20 active:scale-90"
                        >
                            <FontAwesomeIcon icon={faAnglesLeft} className="text-[10px]" />
                        </button>
                        <button disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}
                            className="h-9 w-9 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-all disabled:opacity-20 active:scale-90"
                        >
                            <FontAwesomeIcon icon={faChevronLeft} className="text-[10px]" />
                        </button>
                    </div>

                    <div className="flex items-center gap-1.5 px-1">
                        {getPageItems(page, totalPages).map((it, idx) => (
                            it === '...' ? (
                                <span key={`sep-${idx}`} className="w-6 flex items-center justify-center text-[var(--color-text-muted)] font-bold opacity-30 text-xs">...</span>
                            ) : (
                                <button key={`pg-${it}`} onClick={() => setPage(it)}
                                    className={`h-9 min-w-[36px] px-2.5 rounded-xl font-black text-[10px] transition-all active:scale-95
                                    ${it === page
                                            ? 'bg-[var(--color-primary)] text-white shadow-lg shadow-[var(--color-primary)]/20'
                                            : 'bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface-alt)]'}`}
                                >
                                    {it}
                                </button>
                            )
                        ))}
                    </div>

                    <div className="flex items-center gap-1">
                        <button disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            className="h-9 w-9 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-all disabled:opacity-20 active:scale-90"
                        >
                            <FontAwesomeIcon icon={faChevronRight} className="text-[10px]" />
                        </button>
                        <button disabled={page >= totalPages} onClick={() => setPage(totalPages)}
                            className="h-9 w-9 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-all disabled:opacity-20 active:scale-90"
                        >
                            <FontAwesomeIcon icon={faAnglesRight} className="text-[10px]" />
                        </button>
                    </div>

                    <div className="md:ml-2 relative flex items-center group">
                        <input
                            value={jumpPage}
                            onChange={e => setJumpPage(e.target.value.replace(/[^\d]/g, ''))}
                            onKeyDown={e => {
                                if (e.key === 'Enter') {
                                    const n = Number(jumpPage);
                                    if (n >= 1 && n <= totalPages) { setPage(n); setJumpPage('') }
                                }
                            }}
                            placeholder={s.jump}
                            className="w-16 h-9 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-center text-[10px] font-black focus:border-[var(--color-primary)] transition-all outline-none"
                        />
                        <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[8px] font-black py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                            {s.jumpTip}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
