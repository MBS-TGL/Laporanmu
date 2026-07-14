import React, { memo } from 'react'
import { Link } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faArrowRight,
    faDoorOpen,
    faClock,
} from '@fortawesome/free-solid-svg-icons'

export const GatePresence = memo(function GatePresence({ recentGate, loading }) {
    return (
        <div className="glass rounded-[1.5rem] p-5 relative overflow-hidden bg-gradient-to-br from-[var(--color-surface)] to-[var(--color-surface-alt)] group hover:shadow-2xl hover:shadow-emerald-500/10 transition-all duration-500">
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-colors" />
            <div className="mb-4 flex justify-between items-center relative z-10">
                <div>
                    <p className="text-[13px] font-black text-[var(--color-text)]">Gate Presence</p>
                    <p className="text-[10px] text-[var(--color-text-muted)] opacity-70 mt-0.5">Aktivitas gerbang aktif</p>
                </div>
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 relative">
                    <FontAwesomeIcon icon={faDoorOpen} className="text-[10px]" />
                    {!loading && recentGate.length > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                        </span>
                    )}
                </div>
            </div>
            <div className="space-y-2.5 relative z-10">
                {loading ? (
                    [1, 2].map(i => <div key={i} className="h-10 rounded-xl bg-[var(--color-surface-alt)] animate-pulse" />)
                ) : recentGate.length === 0 ? (
                    <div className="py-5 text-center border-2 border-dashed border-[var(--color-border)] rounded-2xl bg-[var(--color-surface)]/50">
                        <p className="text-[10px] font-black text-[var(--color-text-muted)] opacity-60">Semua di dalam sekolah</p>
                    </div>
                ) : (
                    recentGate.map(g => (
                        <div key={g.id} className="flex items-center gap-3 p-2 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] hover:border-emerald-500/30 transition-all">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ml-1 shrink-0" />
                            <div className="flex-1 min-w-0">
                                <p className="text-[11px] font-black text-[var(--color-text)] truncate">{g.name}</p>
                                <p className="text-[9px] text-[var(--color-text-muted)] font-bold uppercase tracking-tighter opacity-60 mt-0.5">{g.type}</p>
                            </div>
                            <div className="flex items-center gap-1.5 text-right px-2 shrink-0">
                                <FontAwesomeIcon icon={faClock} className="text-[8px] text-[var(--color-text-muted)] opacity-40" />
                                <span className="text-[10px] font-black tabular-nums text-[var(--color-text-muted)]">{g.time}</span>
                            </div>
                        </div>
                    ))
                )}
            </div>
            <Link to="/boarding/gate" className="mt-4 relative z-10 w-full flex items-center justify-center p-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[9px] font-black text-[var(--color-text-muted)] hover:text-emerald-500 hover:border-emerald-500/30 transition-all uppercase tracking-widest gap-2">
                Monitor Gerbang <FontAwesomeIcon icon={faArrowRight} className="text-[8px]" />
            </Link>
        </div>
    )
})
