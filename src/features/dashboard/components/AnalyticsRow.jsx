import React from 'react'
import { Link } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowRight, faChartPie, faShieldAlt } from '@fortawesome/free-solid-svg-icons'

export default function AnalyticsRow({ raportProgress, riskStudents, loading }) {
    return (
        <div className="grid lg:grid-cols-2 gap-4">
            {/* ① Progress Raport Bulanan */}
            <div className="glass rounded-[1.5rem] p-5 flex flex-col">
                <div className="flex items-center justify-between mb-5">
                    <div>
                        <p className="text-[13px] font-black text-[var(--color-text)]">Raport Bulan Ini</p>
                        <p className="text-[10px] text-[var(--color-text-muted)] opacity-70 mt-0.5">Progress pengisian per kelas</p>
                    </div>
                    <span className="text-[9px] font-black text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-2 py-1 rounded-lg">
                        {new Date().toLocaleDateString('id-ID', { month: 'long' })}
                    </span>
                </div>
                {loading ? (
                    <div className="space-y-3">
                        {[1, 2, 3, 4].map(i => <div key={i} className="h-8 rounded-xl bg-[var(--color-surface-alt)] animate-pulse" />)}
                    </div>
                ) : raportProgress.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center gap-3 py-10 opacity-50 text-center hover:opacity-100 transition-opacity">
                        <div className="w-12 h-12 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center text-xl">
                            <FontAwesomeIcon icon={faChartPie} />
                        </div>
                        <div>
                            <p className="text-[12px] font-black text-[var(--color-text)]">Belum Ada Data</p>
                            <p className="text-[9px] text-[var(--color-text-muted)] mt-0.5">Progress pengisian raport kosong</p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-1.5 flex-1">
                        {raportProgress.map((cls, i) => {
                            const color = cls.pct === 100 ? '#10b981' : cls.pct >= 50 ? '#f59e0b' : '#ef4444'
                            const bgHover = cls.pct === 100 ? 'hover:border-emerald-500/30 hover:bg-emerald-500/5' : cls.pct >= 50 ? 'hover:border-amber-500/30 hover:bg-amber-500/5' : 'hover:border-red-500/30 hover:bg-red-500/5'
                            const radius = 6
                            const circ = 2 * Math.PI * radius
                            const offset = circ - (cls.pct / 100) * circ
                            return (
                                <div key={i} className={`flex items-center justify-between p-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] transition-all ${bgHover}`}>
                                    <span className="text-[11px] font-bold text-[var(--color-text)] truncate flex-1">{cls.className}</span>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <span className="text-[10px] font-black tabular-nums" style={{ color }}>{cls.filled}/{cls.total}</span>
                                        <div className="relative w-4 h-4">
                                            <svg className="w-4 h-4 transform -rotate-90">
                                                <circle cx="8" cy="8" r="6" stroke="var(--color-border)" strokeWidth="2" fill="none" />
                                                <circle cx="8" cy="8" r="6" stroke={color} strokeWidth="2" fill="none" strokeDasharray={circ} strokeDashoffset={offset} className="transition-all duration-1000" strokeLinecap="round" />
                                            </svg>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
                {!loading && raportProgress.length > 0 && (() => {
                    const totalFilled = raportProgress.reduce((a, c) => a + c.filled, 0)
                    const totalAll = raportProgress.reduce((a, c) => a + c.total, 0)
                    const overallPct = totalAll > 0 ? Math.round((totalFilled / totalAll) * 100) : 0
                    const color = overallPct === 100 ? '#10b981' : overallPct >= 50 ? '#f59e0b' : '#ef4444'
                    return (
                        <div className="mt-4 pt-4 border-t border-[var(--color-border)] flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-[var(--color-text-muted)]">Total keseluruhan</span>
                                <span className="text-sm font-black tabular-nums leading-none mt-0.5" style={{ color }}>{overallPct}%</span>
                            </div>
                            <Link to="/raport" className="text-[10px] font-black text-[var(--color-primary)] hover:opacity-70 flex items-center gap-1.5 transition-all">
                                Lihat Semua Raport <FontAwesomeIcon icon={faArrowRight} className="text-[8px]" />
                            </Link>
                        </div>
                    )
                })()}
            </div>

            {/* ② Siswa Risiko */}
            <div className="glass rounded-[1.5rem] p-5 flex flex-col">
                <div className="flex items-center justify-between mb-5">
                    <div>
                        <p className="text-[13px] font-black text-[var(--color-text)]">Siswa Risiko</p>
                        <p className="text-[10px] text-[var(--color-text-muted)] opacity-70 mt-0.5">Poin total negatif</p>
                    </div>
                    <span className="text-[9px] font-black text-red-500 bg-red-500/10 px-2 py-1 rounded-lg">
                        Perlu Perhatian
                    </span>
                </div>
                {loading ? (
                    <div className="space-y-2">
                        {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-11 rounded-xl bg-[var(--color-surface-alt)] animate-pulse" />)}
                    </div>
                ) : riskStudents.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center gap-3 py-10 opacity-60 text-center hover:opacity-100 transition-opacity">
                        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center text-xl shadow-lg shadow-emerald-500/5">
                            <FontAwesomeIcon icon={faShieldAlt} />
                        </div>
                        <div>
                            <p className="text-[12px] font-black text-emerald-500">Kondisi Aman</p>
                            <p className="text-[9px] text-[var(--color-text-muted)] mt-0.5">Tidak ada siswa berisiko (poin negatif)</p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-1.5 flex-1">
                        {riskStudents.map((s, i) => (
                            <div key={s.id} className="flex items-center gap-3 p-2 rounded-xl border border-red-500/10 hover:border-red-500/20 transition-all">
                                <div className="w-5 h-5 rounded-md bg-red-500/10 text-red-500 flex items-center justify-center text-[9px] font-black shrink-0">
                                    {i + 1}
                                </div>
                                <div className="flex-1 min-w-0 flex items-center justify-between">
                                    <div>
                                        <p className="text-[11px] font-bold text-[var(--color-text)] truncate">{s.name}</p>
                                        <p className="text-[9px] text-[var(--color-text-muted)] truncate">{s.className}</p>
                                    </div>
                                    <span className="text-[11px] font-black text-red-500 shrink-0 tabular-nums ml-2 bg-red-500/5 px-2 py-0.5 rounded-md">{s.points}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                <Link to="/master/students"
                    className="mt-4 pt-4 border-t border-[var(--color-border)] text-[10px] font-black text-[var(--color-primary)] hover:opacity-70 flex items-center justify-end gap-1.5 transition-all">
                    Lihat Semua Siswa <FontAwesomeIcon icon={faArrowRight} className="text-[8px]" />
                </Link>
            </div>
        </div>
    )
}
