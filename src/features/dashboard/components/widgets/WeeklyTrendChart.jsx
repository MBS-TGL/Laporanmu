import React, { memo } from 'react'
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts'

export const WeeklyTrendChart = memo(function WeeklyTrendChart({ chartData, loading }) {
    return (
        <div className="glass rounded-[1.5rem] p-5 flex flex-col h-full relative z-10 hover:shadow-2xl hover:shadow-[var(--color-primary)]/5 transition-shadow duration-500 min-h-[380px]">
            <div className="flex items-center justify-between mb-5">
                <div>
                    <p className="text-[13px] font-black text-[var(--color-text)]">Tren Mingguan</p>
                    <p className="text-[10px] text-[var(--color-text-muted)] opacity-70 mt-0.5">7 hari terakhir</p>
                </div>
                {!loading && (
                    <div className="flex items-center gap-3 text-[10px] font-bold">
                        <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-red-500" />
                            <span className="text-[var(--color-text-muted)]">Pelanggaran</span>
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span className="text-[var(--color-text-muted)]">Prestasi</span>
                        </span>
                    </div>
                )}
            </div>

            <div className="h-[280px] w-full relative">
                {loading ? (
                    <div className="absolute inset-0 flex flex-col gap-4">
                        <div className="flex-1 w-full bg-[var(--color-surface-alt)] animate-pulse rounded-2xl relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
                        </div>
                        <div className="flex justify-between px-2">
                             {[1,2,3,4,5,6,7].map(i => <div key={i} className="w-6 h-2 bg-[var(--color-surface-alt)] animate-pulse rounded" />)}
                        </div>
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorViolations" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                                </linearGradient>
                                <linearGradient id="colorAchievements" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                            <XAxis dataKey="name" stroke="var(--color-text-muted)" fontSize={10} axisLine={false} tickLine={false} dy={10} />
                            <YAxis stroke="var(--color-text-muted)" fontSize={10} axisLine={false} tickLine={false} dx={-10} />
                            <Tooltip contentStyle={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', fontSize: 11 }} cursor={{ fill: 'var(--color-surface-alt)' }} />
                            <Area type="monotone" dataKey="pelanggaran" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorViolations)" />
                            <Area type="monotone" dataKey="prestasi" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorAchievements)" />
                        </AreaChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    )
})
