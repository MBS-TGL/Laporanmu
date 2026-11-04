import React, { memo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowDown, ArrowRight, ArrowUp, ClipboardCheck } from 'lucide-react'

export const RecentReports = memo(function RecentReports({ recentReports, loading }) {
    return (
        <div className="bg-surface border border-border rounded-[1.5rem] p-5 sm:p-6 relative z-10 hover:shadow-md transition-shadow duration-500 flex flex-col h-full">
            <div className="flex items-center justify-between mb-5">
                <div>
                    <p className="text-base font-bold text-[var(--color-text)]">Laporan Terbaru</p>
                    <p className="text-xs text-[var(--color-text-muted)] opacity-75 mt-0.5">Aktivitas perilaku terkini</p>
                </div>
                <Link to="/raport" className="h-8 px-3.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-xs font-bold text-[var(--color-text-muted)] hover:text-[var(--color-text)] flex items-center gap-2 transition-all">
                    Lihat Semua <ArrowRight className="w-4 h-4" />
                </Link>
            </div>
            <div className="space-y-2.5 flex-1">
                {loading ? (
                    [1, 2, 3, 4, 5].map(i => <div key={i} className="h-14 rounded-xl bg-[var(--color-surface-alt)] animate-pulse" />)
                ) : recentReports.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-16 text-center opacity-70 hover:opacity-100 transition-opacity">
                        <div className="w-16 h-16 rounded-2xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)] text-3xl mb-4 shadow-lg">
                            <ClipboardCheck className="w-4 h-4" />
                        </div>
                        <p className="text-sm font-bold text-[var(--color-text)] mb-1">Belum Ada Laporan</p>
                        <p className="text-xs text-[var(--color-text-muted)] max-w-xs px-4 leading-relaxed">Semua tenang dan aman. Belum ada aktivitas perilaku baru yang tercatat.</p>
                    </div>
                ) : (
                    recentReports.map((report) => (
                        <div key={report.id} className="flex items-center gap-3.5 p-3.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl hover:border-[var(--color-primary)]/30 transition-all hover:scale-[1.01]">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0 ${report.points > 0 ? 'bg-emerald-500/15 text-emerald-500' : 'bg-red-500/15 text-red-500'}`}>
                                {report.points > 0 ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-[var(--color-text)] truncate">{report.student}</p>
                                <p className="text-xs text-[var(--color-text-muted)] truncate mt-0.5">{report.class} · {report.type}</p>
                            </div>
                            <div className="text-right shrink-0">
                                <p className={`text-sm font-bold ${report.points > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                    {report.points > 0 ? '+' : ''}{report.points}
                                </p>
                                <p className="text-xs text-[var(--color-text-muted)] font-semibold mt-0.5">{report.time}</p>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
})
