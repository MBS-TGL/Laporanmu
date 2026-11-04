import React, { memo } from 'react'
import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    ResponsiveContainer,
} from 'recharts'
import { ClipboardList } from 'lucide-react'

export const PointsConfigPie = memo(function PointsConfigPie({ pieData, loading }) {
    return (
        <div className="bg-surface border border-border rounded-[1.5rem] p-5 flex flex-col relative overflow-hidden group hover:shadow-md transition-shadow duration-500">
            <div className="mb-5 flex justify-between items-start relative z-10">
                <div>
                    <p className="text-base font-black text-[var(--color-text)]">Konfigurasi Poin</p>
                    <p className="text-xs text-[var(--color-text-muted)] opacity-75 mt-0.5">Minggu ini</p>
                </div>
                <div className="w-9 h-9 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center shrink-0">
                    <ClipboardList className="text-xs" />
                </div>
            </div>

            {loading ? (
                <div className="h-40 flex items-center justify-center">
                    <div className="w-20 h-20 border-4 border-[var(--color-border)] border-t-[var(--color-primary)] rounded-full animate-spin" />
                </div>
            ) : pieData.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 opacity-60 hover:opacity-100 transition-opacity">
                    <div className="w-12 h-12 rounded-2xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/20 flex items-center justify-center text-xl shadow-lg">
                        <ClipboardList />
                    </div>
                    <div className="text-center">
                        <p className="text-sm font-black text-[var(--color-text)]">Belum Ada Data</p>
                        <p className="text-xs text-[var(--color-text-muted)] mt-0.5">Tidak ada konfigurasi poin</p>
                    </div>
                </div>
            ) : (
                <>
                    <div className="h-40 relative z-10">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={3} dataKey="value" stroke="var(--color-surface)" strokeWidth={2}>
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', fontSize: 12 }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="grid grid-cols-2 gap-x-2 gap-y-3 mt-4 relative z-10">
                        {pieData.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-xs font-semibold">
                                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                                <span className="text-[var(--color-text-muted)] truncate">{item.name}</span>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    )
})
