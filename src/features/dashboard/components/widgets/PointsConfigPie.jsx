import React, { memo } from 'react'
import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    ResponsiveContainer,
} from 'recharts'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faClipboardList } from '@fortawesome/free-solid-svg-icons'

export const PointsConfigPie = memo(function PointsConfigPie({ pieData, loading }) {
    return (
        <div className="glass rounded-[1.5rem] p-5 flex flex-col relative overflow-hidden group hover:shadow-2xl hover:shadow-indigo-500/10 transition-shadow duration-500">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/10 transition-colors" />
            <div className="mb-5 flex justify-between items-start relative z-10">
                <div>
                    <p className="text-[13px] font-black text-[var(--color-text)]">Konfigurasi Poin</p>
                    <p className="text-[10px] text-[var(--color-text-muted)] opacity-70 mt-0.5">Minggu ini</p>
                </div>
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
                    <FontAwesomeIcon icon={faClipboardList} className="text-[10px]" />
                </div>
            </div>

            {loading ? (
                <div className="h-40 flex items-center justify-center">
                    <div className="w-20 h-20 border-4 border-[var(--color-border)] border-t-indigo-500 rounded-full animate-spin" />
                </div>
            ) : pieData.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 opacity-60 hover:opacity-100 transition-opacity">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 flex items-center justify-center text-xl shadow-lg shadow-indigo-500/10">
                        <FontAwesomeIcon icon={faClipboardList} />
                    </div>
                    <div className="text-center">
                        <p className="text-[12px] font-black text-[var(--color-text)]">Belum Ada Data</p>
                        <p className="text-[9px] text-[var(--color-text-muted)] mt-0.5">Tidak ada konfigurasi poin</p>
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
                                <Tooltip contentStyle={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', fontSize: 11 }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="grid grid-cols-2 gap-x-2 gap-y-3 mt-4 relative z-10">
                        {pieData.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-[10px] font-bold">
                                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                                <span className="text-[var(--color-text-muted)] truncate">{item.name}</span>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    )
})
