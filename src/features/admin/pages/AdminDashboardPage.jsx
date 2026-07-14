import { useState, useEffect, useMemo } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faDatabase, faRobot, faShieldHalved, faServer,
    faTerminal, faMicrochip, faCloud, faRotateLeft,
    faArrowUp, faArrowDown, faBolt, faTriangleExclamation,
    faCircleCheck, faDownload, faTableColumns, faCube
} from '@fortawesome/free-solid-svg-icons'
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Cell, PieChart, Pie
} from 'recharts'
import DashboardLayout from '@core/layouts/DashboardLayout'
import { Breadcrumb } from '@shared/components'
import { supabase } from '@lib/supabase'

const TOKEN_RATE = 0.0012

export default function AdminDashboardPage() {
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState({
        dbRows: 0,
        aiTokens: 0,
        aiCost: 0,
        tempTasks: 0,
        errorLogs: 0,
        storageUsage: '1.2 GB',
        latency: '0.82s'
    })

    const [dbDistribution, setDbDistribution] = useState([])
    const [aiTrend, setAiTrend] = useState([])
    const [systemLogs, setSystemLogs] = useState([])

    const fetchTechnicalStats = async () => {
        setLoading(true)
        try {
            const tables = ['students', 'reports', 'teachers', 'gate_logs', 'ai_logs', 'audit_logs']
            const counts = await Promise.all(tables.map(async (t) => {
                const { count } = await supabase.from(t).select('*', { count: 'exact', head: true })
                return { name: t, count: count || 0 }
            }))

            const totalRows = counts.reduce((acc, c) => acc + c.count, 0)
            setDbDistribution(counts.map(c => ({
                name: c.name.replace('_', ' '),
                value: c.count,
                color: c.name === 'ai_logs' ? '#6366f1' : c.name === 'reports' ? '#ef4444' : '#10b981'
            })))

            const { data: aiLogs } = await supabase
                .from('ai_logs')
                .select('user_query, ai_response, created_at')
                .order('created_at', { ascending: false })
            
            let totalTokens = 0
            if (aiLogs) {
                totalTokens = aiLogs.reduce((acc, log) => {
                    return acc + Math.round((log.user_query.length + (log.ai_response?.length || 0)) / 4)
                }, 0)

                const last7Days = Array.from({ length: 7 }).map((_, i) => {
                    const d = new Date()
                    d.setDate(d.getDate() - i)
                    d.setHours(0,0,0,0)
                    return d
                }).reverse()

                const trend = last7Days.map(date => {
                    const dayLogs = aiLogs.filter(l => new Date(l.created_at) >= date && new Date(l.created_at) < new Date(date.getTime() + 86400000))
                    return {
                        name: date.toLocaleDateString('id-ID', { weekday: 'short' }),
                        tokens: dayLogs.reduce((acc, l) => acc + Math.round((l.user_query.length + (l.ai_response?.length || 0)) / 4), 0)
                    }
                })
                setAiTrend(trend)
            }

            const { count: errCount } = await supabase
                .from('audit_logs')
                .select('*', { count: 'exact', head: true })
                .ilike('action', '%error%')

            const { data: recentAudit } = await supabase
                .from('audit_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(5)

            setSystemLogs(recentAudit || [])
            setStats({
                dbRows: totalRows,
                aiTokens: totalTokens,
                aiCost: (totalTokens * TOKEN_RATE).toFixed(4),
                tempTasks: 42,
                errorLogs: errCount || 0,
                storageUsage: (totalRows * 0.05).toFixed(1) + ' MB',
                latency: '0.82s'
            })

        } catch (err) { console.error(err) } finally { setLoading(false) }
    }

    useEffect(() => { fetchTechnicalStats() }, [])

    return (
        <DashboardLayout title="Admin Hub">
            <div className="p-4 md:p-6 space-y-5 max-w-[1280px] mx-auto animate-in fade-in duration-700">
                
                {/* ── HEADER ── */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8 animate-in slide-in-from-top-4 duration-500">
                    <div>
                        <Breadcrumb badge="Admin" items={['Technical Dashboard']} className="mb-1" />
                        <div className="flex items-center gap-2.5 mb-1">
                            <h1 className="text-2xl font-black font-heading tracking-tight text-[var(--color-text)]">Admin Dashboard Center</h1>
                            <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 uppercase tracking-widest animate-pulse">System Active</span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 opacity-70">
                            <p className="text-[var(--color-text-muted)] text-[11px] font-medium leading-none">
                                Pusat monitoring infrastruktur & data neural.
                            </p>
                            <div className="h-3 w-px bg-[var(--color-border)]" />
                            <div className="flex items-center gap-1.5 text-[9px] font-black text-indigo-500 uppercase tracking-widest">
                                <FontAwesomeIcon icon={faServer} className="text-[8px]" />
                                ap-southeast-1 (SG)
                            </div>
                            <div className="h-3 w-px bg-[var(--color-border)]" />
                            <div className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Production Build</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={fetchTechnicalStats} className="h-9 px-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-[var(--color-surface-alt)] transition-all shadow-sm group">
                            <FontAwesomeIcon icon={faRotateLeft} className={`${loading ? 'animate-spin' : 'group-hover:rotate-180'} transition-transform duration-500`} /> Refresh Sync
                        </button>
                    </div>
                </div>

                {/* ── STATS ROW ── */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    {[
                        { label: 'DB Complexity', val: stats.dbRows, sub: 'Total Rows', icon: faDatabase, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
                        { label: 'Neural Traffic', val: stats.aiTokens, sub: `${stats.aiTokens} Tkns`, icon: faRobot, color: 'text-violet-500', bg: 'bg-violet-500/10' },
                        { label: 'Cloud Assets', val: stats.storageUsage, sub: 'Est. Size', icon: faCloud, color: 'text-sky-500', bg: 'bg-sky-500/10' },
                        { label: 'System Health', val: 'Healthy', sub: `${stats.latency} Stable`, icon: faBolt, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                    ].map((s, i) => (
                        <div key={i} className="glass rounded-[1.5rem] p-4 border border-[var(--color-border)] flex items-center gap-3 hover:shadow-lg transition-all group">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm shrink-0 ${s.bg} group-hover:scale-110 transition-transform`}>
                                <FontAwesomeIcon icon={s.icon} className={s.color} />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60 leading-none mb-1">{s.label}</p>
                                <p className={`text-xl font-black font-heading leading-none tabular-nums ${s.color}`}>{loading ? '…' : s.val}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* ── CHARTS ROW ── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    <div className="lg:col-span-2 glass rounded-[1.5rem] border border-[var(--color-border)] p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-5">
                            <div>
                                <h3 className="text-[13px] font-black text-[var(--color-text)]">Neural Consumption</h3>
                                <p className="text-[10px] text-[var(--color-text-muted)] opacity-70">Tren penggunaan token AI 7 hari terakhir</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[11px] font-black text-emerald-500">$ {stats.aiCost}</p>
                            </div>
                        </div>
                        <div className="h-[200px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={aiTrend}>
                                    <defs>
                                        <linearGradient id="colorTokens" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                                    <XAxis dataKey="name" fontSize={9} axisLine={false} tickLine={false} />
                                    <YAxis fontSize={9} axisLine={false} tickLine={false} />
                                    <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid var(--color-border)', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px' }} />
                                    <Area type="monotone" dataKey="tokens" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#colorTokens)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="glass rounded-[1.5rem] border border-[var(--color-border)] p-6 shadow-sm flex flex-col items-center">
                        <div className="w-full text-left mb-4">
                            <h3 className="text-[13px] font-black text-[var(--color-text)]">Data Distribution</h3>
                            <p className="text-[10px] text-[var(--color-text-muted)] opacity-70">Baris data per modul</p>
                        </div>
                        <div className="h-[140px] w-full relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={dbDistribution} innerRadius={40} outerRadius={60} paddingAngle={4} dataKey="value">
                                        {dbDistribution.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-lg font-black">{stats.dbRows}</span>
                                <span className="text-[8px] font-black uppercase text-[var(--color-text-muted)]">Rows</span>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-4 w-full">
                            {dbDistribution.slice(0, 4).map((d, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: d.color }} />
                                    <span className="text-[9px] font-bold text-[var(--color-text-muted)] truncate capitalize">{d.name}</span>
                                    <span className="text-[9px] font-black ml-auto">{d.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ── RECENT AUDIT ── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    <div className="glass rounded-[2rem] border border-[var(--color-border)] p-1 overflow-hidden shadow-sm">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]/50">
                            <h3 className="text-[12px] font-black text-[var(--color-text)] flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                                Recent System Audit
                            </h3>
                            <button className="text-[9px] font-black text-indigo-500 uppercase tracking-widest hover:opacity-70 transition-opacity">
                                View Full Logs
                            </button>
                        </div>
                        <div className="p-2 space-y-1.5">
                            {systemLogs.length === 0 ? (
                                <p className="text-[10px] text-[var(--color-text-muted)] text-center py-10 opacity-50 font-medium">Monitoring connections...</p>
                            ) : (
                                systemLogs.map((log, i) => (
                                    <div key={i} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-[var(--color-surface-alt)] border border-transparent hover:border-[var(--color-border)] group transition-all">
                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border transition-all ${log.action === 'ERROR' ? 'bg-rose-500/10 border-rose-500/20 text-rose-500' : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-500'}`}>
                                            <FontAwesomeIcon icon={log.action === 'ERROR' ? faTriangleExclamation : faMicrochip} className="text-[10px]" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-0.5">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-[11px] font-black text-[var(--color-text)] uppercase tracking-tight">{log.action || 'MUTATION'}</p>
                                                    <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-[var(--color-border)] text-[var(--color-text-muted)] uppercase">{log.source?.split('-')[0] || 'System'}</span>
                                                </div>
                                                <span className="text-[9px] font-bold text-[var(--color-text-muted)] opacity-60 tabular-nums">{new Date(log.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                                            </div>
                                            <p className="text-[10px] text-[var(--color-text-muted)] font-mono truncate opacity-60">trc_id: {log.id?.slice(0, 8)}... {JSON.stringify(log.newData || log.oldData || '').slice(0, 50)}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        {[
                            { title: 'DB', icon: faDatabase, color: 'text-indigo-500', bg: 'bg-indigo-500/5', to: '/admin/database', status: 'Healthy' },
                            { title: 'Logs', icon: faTerminal, color: 'text-purple-500', bg: 'bg-purple-500/5', to: '/admin/logs', status: 'Syncing' },
                            { title: 'AI', icon: faRobot, color: 'text-sky-500', bg: 'bg-sky-500/5', to: '/admin/ai-insights', status: 'Active' },
                            { title: 'Cloud', icon: faCloud, color: 'text-amber-500', bg: 'bg-amber-500/5', to: '/admin/storage', status: 'Normal' },
                            { title: 'Svr', icon: faServer, color: 'text-emerald-500', bg: 'bg-emerald-500/5', to: '/admin/tasks', status: 'Idle' },
                            { title: 'ACL', icon: faShieldHalved, color: 'text-rose-500', bg: 'bg-rose-500/5', to: '/admin/users', status: 'Locked' },
                        ].map((c, i) => (
                            <a key={i} href={c.to} className="group glass p-4 rounded-[1.5rem] border border-[var(--color-border)] flex flex-col items-center justify-center text-center gap-2 hover:border-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/5 transition-all active:scale-95 relative overflow-hidden">
                                <div className={`w-10 h-10 rounded-2xl ${c.bg} ${c.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                                    <FontAwesomeIcon icon={c.icon} className="text-sm" />
                                </div>
                                <div className="space-y-0.5">
                                    <p className="text-[11px] font-black text-[var(--color-text)] transition-colors">{c.title}</p>
                                    <div className="flex items-center gap-1">
                                        <div className="w-1 h-1 rounded-full bg-emerald-500" />
                                        <span className="text-[8px] font-black text-[var(--color-text-muted)] uppercase tracking-widest opacity-60 group-hover:opacity-100 transition-opacity">{c.status}</span>
                                    </div>
                                </div>
                                <div className="absolute top-0 right-0 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <FontAwesomeIcon icon={faRotateLeft} className="text-[8px] text-[var(--color-text-muted)]" />
                                </div>
                            </a>
                        ))}
                    </div>
                </div>

            </div>
        </DashboardLayout>
    )
}

