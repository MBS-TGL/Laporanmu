import React, { memo } from 'react'
import { Link } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faArrowRight,
    faArrowUp,
    faArrowDown,
    faClipboardCheck
} from '@fortawesome/free-solid-svg-icons'

export const RecentReports = memo(function RecentReports({ recentReports, loading }) {
    return (
        <div className="glass rounded-[1.5rem] p-5 relative z-10 hover:shadow-2xl hover:shadow-[var(--color-primary)]/5 transition-shadow duration-500 flex flex-col h-full">
            <div className="flex items-center justify-between mb-5">
                <div>
                    <p className="text-[13px] font-black text-[var(--color-text)]">Laporan Terbaru</p>
                    <p className="text-[10px] text-[var(--color-text-muted)] opacity-70 mt-0.5">Aktivitas perilaku terkini</p>
                </div>
                <Link to="/raport" className="h-7 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[10px] font-black text-[var(--color-text-muted)] hover:text-[var(--color-text)] flex items-center gap-1.5 transition-all">
                    Lihat Semua <FontAwesomeIcon icon={faArrowRight} className="text-[8px]" />
                </Link>
            </div>
            <div className="space-y-2 flex-1">
                {loading ? (
                    [1, 2, 3, 4, 5].map(i => <div key={i} className="h-14 rounded-xl bg-[var(--color-surface-alt)] animate-pulse" />)
                ) : recentReports.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-16 text-center opacity-70 hover:opacity-100 transition-opacity">
                        <div className="w-16 h-16 rounded-2xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)] text-3xl mb-4 shadow-lg shadow-black/5">
                            <FontAwesomeIcon icon={faClipboardCheck} />
                        </div>
                        <p className="text-[13px] font-black text-[var(--color-text)] mb-1">Belum Ada Laporan</p>
                        <p className="text-[10px] text-[var(--color-text-muted)] max-w-xs px-4 leading-relaxed">Semua tenang dan aman. Belum ada aktivitas perilaku baru yang tercatat.</p>
                    </div>
                ) : (
                    recentReports.map((report) => (
                        <div key={report.id} className="flex items-center gap-3 p-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl hover:border-[var(--color-primary)]/30 transition-all hover:scale-[1.01]">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white text-[11px] font-black shrink-0 ${report.points > 0 ? 'bg-emerald-500/15 text-emerald-500' : 'bg-red-500/15 text-red-500'}`}>
                                <FontAwesomeIcon icon={report.points > 0 ? faArrowUp : faArrowDown} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[12px] font-black text-[var(--color-text)] truncate">{report.student}</p>
                                <p className="text-[10px] text-[var(--color-text-muted)] truncate">{report.class} · {report.type}</p>
                            </div>
                            <div className="text-right shrink-0">
                                <p className={`text-[12px] font-black ${report.points > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                    {report.points > 0 ? '+' : ''}{report.points}
                                </p>
                                <p className="text-[9px] text-[var(--color-text-muted)] font-bold">{report.time}</p>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
})
