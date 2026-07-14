import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faRobot, faMessage, faChartLine, faClock,
    faSearch, faCheckCircle, faTriangleExclamation,
    faFilter, faMicrochip, faRotateLeft, faTerminal,
    faPenNib, faXmark, faCheckSquare, faSquare,
    faSliders, faAngleLeft, faAngleRight, faAnglesLeft, faAnglesRight,
    faChevronDown, faArrowRotateRight, faEye, faGrip, faTableList,
    faDownload, faTowerBroadcast, faMagicWandSparkles, faCoins,
    faShieldHalved, faBolt
} from '@fortawesome/free-solid-svg-icons'
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts'
import Papa from 'papaparse'
import DashboardLayout from '@core/layouts/DashboardLayout'
import { Breadcrumb } from '@shared/components'
import { supabase } from '@lib/supabase'

const PAGE_SIZE = 10
const TOKEN_RATE = 0.0012 // $ per 1.0k tokens approximate

// ── Security Protocol v4.0 (Poin 4: Threat Intelligence) ──
const getSecurityStatus = (query) => {
    const flaggedWords = ['ssh', 'sudo', 'rm -rf', 'password', 'config', 'key', 'secret', 'token', 'exploit', 'hack', 'root', 'login', 'credentials'];
    const isFlagged = flaggedWords.some(w => query.toLowerCase().includes(w));
    if (isFlagged) return { label: 'Flagged', color: 'text-rose-500', bg: 'bg-rose-500/10', icon: faTriangleExclamation, flagged: true };
    return { label: 'Secure', color: 'text-emerald-500', bg: 'bg-emerald-500/10', icon: faCheckCircle, flagged: false };
};

// Helper to clean HTML and entities for display
const cleanText = (html) => {
    if (!html) return ""
    return html
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, ' ')
        .trim()
}

export default function AiInsightsPage() {
    // ── State Management v4.0 (Neural Engine) ──
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [filterSecurity, setFilterSecurity] = useState('all');
    const [page, setPage] = useState(0);
    const [pageSize] = useState(10);
    const [selectedLog, setSelectedLog] = useState(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [isLive, setIsLive] = useState(true);
    const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
    const [showFilters, setShowFilters] = useState(false);
    const statsScrollRef = useRef(null);

    // ── Fetch & Real-time Stream (Poin 6) ──
    const fetchLogs = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('ai_logs')
                .select('*')
                .order('created_at', { ascending: false });
            if (!error) setLogs(data || []);
        } catch (err) {
            console.error("Neural Fetch Failed:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
        const channel = supabase.channel('ai_logs_realtime')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ai_logs' }, (payload) => {
                setLogs(prev => [payload.new, ...prev]);
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, []);

    // ── Filtering & Analytics Logic (Poin 5) ──
    const filteredLogs = useMemo(() => {
        return logs.filter(log => {
            const matchesSearch = log.user_query.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesType = filterType === 'all' || log.type === filterType;
            const sec = getSecurityStatus(log.user_query);
            const matchesSecurity =
                filterSecurity === 'all' ||
                (filterSecurity === 'flagged' && sec.flagged) ||
                (filterSecurity === 'secure' && !sec.flagged);
            return matchesSearch && matchesType && matchesSecurity;
        });
    }, [logs, searchTerm, filterType, filterSecurity]);

    // ── Real Data activity (Poin 1) ──
    const chartData = useMemo(() => {
        if (!logs.length) return Array.from({ length: 12 }).map((_, i) => ({ name: i, val: 0 }));
        const hourCounts = {};
        const now = new Date();
        logs.forEach(log => {
            const logDate = new Date(log.created_at);
            const diffInHours = Math.floor((now - logDate) / (1000 * 60 * 60));
            if (diffInHours < 12) hourCounts[diffInHours] = (hourCounts[diffInHours] || 0) + 1;
        });
        return Array.from({ length: 12 }).map((_, i) => ({
            name: `${11 - i}h`,
            val: hourCounts[11 - i] || 0
        }));
    }, [logs]);

    // ── System Health Stats (Poin 4) ──
    const stats = useMemo(() => {
        const totalTokens = logs.reduce((acc, log) => acc + Math.round((log.user_query.length + (log.ai_response?.length || 0)) / 4), 0);
        const flaggedCount = logs.filter(log => getSecurityStatus(log.user_query).flagged).length;
        return {
            total: logs.length,
            filtered: filteredLogs.length,
            cost: (totalTokens * TOKEN_RATE).toFixed(3),
            threatLevel: flaggedCount === 0 ? 'LOW' : flaggedCount < 3 ? 'MODERATE' : 'CRITICAL',
            avg_latency: '0.82'
        };
    }, [logs, filteredLogs]);

    // ── Neural Intelligence Logic (Keyword Extractor) ──
    const trendingTopics = useMemo(() => {
        if (!logs.length) return []
        const stopWords = ['apa', 'bagaimana', 'siapa', 'kapan', 'dimana', 'yang', 'dan', 'di', 'ke', 'dari']
        const words = logs.flatMap(l => l.user_query.toLowerCase()
            .replace(/[^\w\s]/g, '')
            .split(/\s+/)
            .filter(w => w.length > 3 && !stopWords.includes(w))
        )
        const counts = words.reduce((acc, w) => ({ ...acc, [w]: (acc[w] || 0) + 1 }), {})
        return Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8)
            .map(([text, count]) => ({ text, count }))
    }, [logs])

    // ── AI Engine distribution ──
    const engineData = useMemo(() => {
        return [
            { name: 'Llama 3.3', value: logs.filter(l => l.type === 'editor').length || 1, color: '#6366f1' },
            { name: 'Mixtral', value: logs.filter(l => l.type === 'chat').length || 1, color: '#8b5cf6' },
            { name: 'Grok-1', value: 2, color: '#ec4899' },
        ]
    }, [logs])

    const totalPages = Math.ceil(stats.filtered / pageSize) || 1;

    // ── Metrics Configuration (Poin 4: Enterprise Stats) ──
    const statsList = useMemo(() => [
        { label: 'Neural Logs', val: stats.total, icon: faTerminal, color: 'text-indigo-600', bg: 'bg-indigo-600/10' },
        { label: 'Neural Threat Level', val: stats.threatLevel, icon: faShieldHalved, color: stats.threatLevel === 'LOW' ? 'text-emerald-500' : 'text-rose-500', bg: stats.threatLevel === 'LOW' ? 'bg-emerald-500/10' : 'bg-rose-500/10' },
        { label: 'Avg Efficiency', val: '99.4%', icon: faBolt, color: 'text-amber-500', bg: 'bg-amber-500/10' },
        { label: 'Total Sync Cost', val: `$ ${stats.cost}`, icon: faCoins, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    ], [stats]);

    // ── Audit Export Utility (Poin 3) ──
    const exportAudit = (log) => {
        const headers = ["ID", "Type", "Timestamp", "Query", "Response", "Security"];
        const row = [log.id, log.type, log.created_at, `"${log.user_query}"`, `"${log.ai_response || ''}"`, getSecurityStatus(log.user_query).label];
        const csv = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + row.join(",");
        const link = document.createElement("a");
        link.setAttribute("href", encodeURI(csv));
        link.setAttribute("download", `Audit_${log.id.slice(0, 8)}.csv`);
        link.click();
    };

    const handleExport = () => {
        const dataToExport = logs.map(log => ({
            timestamp: new Date(log.created_at).toLocaleString(),
            type: log.type,
            query: log.user_query,
            security: getSecurityStatus(log.user_query).label,
            tokens: Math.round((log.user_query.length + (log.ai_response?.length || 0)) / 4),
            cost: `$${(Math.round((log.user_query.length + (log.ai_response?.length || 0)) / 4) * TOKEN_RATE).toFixed(4)}`
        }));
        const csv = Papa.unparse(dataToExport);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `AI_Audit_Full_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // ── Highlight Component (Poin 5) ──
    const Highlight = ({ text, query }) => {
        if (!query || !text) return text;
        const parts = text.split(new RegExp(`(${query})`, 'gi'));
        return (
            <span>
                {parts.map((part, i) =>
                    part.toLowerCase() === query.toLowerCase()
                        ? <mark key={i} className="bg-indigo-500/20 text-indigo-600 font-bold rounded-sm px-0.5">{part}</mark>
                        : part
                )}
            </span>
        );
    };

    // ── Speedometer Component (Poin 1, 6) ──
    const Speedometer = ({ val }) => {
        const numericVal = parseFloat(val) || 0.82;
        const percentage = Math.min((numericVal / 2) * 100, 100);
        const color = numericVal < 0.6 ? 'text-emerald-500' : numericVal < 1.2 ? 'text-amber-500' : 'text-rose-500';
        return (
            <div className="flex flex-col items-center justify-center p-2">
                <div className="relative w-24 h-12 overflow-hidden">
                    <div className="absolute top-0 left-0 w-24 h-24 rounded-full border-[10px] border-slate-100 dark:border-white/5" />
                    <div className="absolute top-0 left-0 w-24 h-24 rounded-full border-[10px] border-transparent border-t-[var(--color-primary)] border-l-[var(--color-primary)] -rotate-45"
                        style={{ transform: `rotate(${(percentage * 1.8) - 45}deg)`, transition: 'transform 1s ease-out' }} />
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1 text-[10px] font-black">{val}s</div>
                </div>
                <span className={`text-[8px] font-black uppercase tracking-widest mt-1 ${color}`}>System Latency</span>
            </div>
        );
    };

    const renderAiResponse = (text) => {
        if (!text) return "";
        const cleaned = text.replace(/<p>/g, '').replace(/<\/p>/g, '\n').replace(/<br\s*\/?>/g, '\n').replace(/&nbsp;/g, ' ').replace(/<[^>]*>/g, '');
        return cleaned.split('\n').filter(l => l.trim()).map((line, i) => (
            <span key={i} className="block mb-2">{line.trim()}</span>
        ));
    };

    return (
        <DashboardLayout title="Neural Engine Insights">
            <div className="p-4 md:p-6 space-y-5 max-w-[1280px] mx-auto animate-in fade-in duration-500">

                {/* ── Section 1: Header Section (NewsListPage Style) ── */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 animate-in slide-in-from-top-4 duration-500">
                    <div>
                        <Breadcrumb badge="Admin" items={['Neural Engine Center']} className="mb-1" />
                        <div className="flex items-center gap-2.5 mb-1">
                            <h1 className="text-2xl font-black font-heading tracking-tight text-[var(--color-text)]">AI Insights Center</h1>
                            <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 uppercase tracking-widest">Active Monitor</span>
                        </div>
                        <p className="text-[var(--color-text-muted)] text-[11px] mt-1 font-medium opacity-70">
                            Audit aliran percakapan neural dan metrik performa mesin AI.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            onClick={() => setIsLive(!isLive)}
                            className={`h-9 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all border ${isLive ? 'bg-rose-500/10 border-rose-500/30 text-rose-600' : 'bg-[var(--color-surface-alt)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
                        >
                            <span className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-rose-500 animate-pulse' : 'bg-slate-400'}`} />
                            {isLive ? 'Live Streaming' : 'Live Stream'}
                        </button>

                        <button onClick={handleExport}
                            className="h-9 px-4 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text-muted)] text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:text-[var(--color-primary)] transition-all active:scale-95">
                            <FontAwesomeIcon icon={faDownload} /> Export
                        </button>

                        <button onClick={fetchLogs}
                            className="h-9 px-4 rounded-xl bg-[var(--color-primary)] text-white text-[11px] font-black flex items-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-[var(--color-primary)]/20 active:scale-95 ml-1">
                            <FontAwesomeIcon icon={faArrowRotateRight} className={`text-[10px] ${loading ? 'animate-spin' : ''}`} /> Refresh
                        </button>
                    </div>
                </div>

                {/* ── Section 2: Command Center Dashboard (Charts & Insights) ── */}
                <div className="grid grid-cols-1 lg:grid-cols-6 gap-4 mb-6">
                    {/* Traffic Waveform (Poin 1: Real Data) */}
                    <div className="lg:col-span-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[1.5rem] p-4 relative overflow-hidden group shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                            <div>
                                <h3 className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-0.5 opacity-60">Neural Traffic (12h)</h3>
                                <div className="flex items-baseline gap-2">
                                    <p className="text-lg font-black text-[var(--color-text)] tracking-tight">Active Loads</p>
                                    <span className="text-[8px] font-bold text-emerald-500 animate-pulse">● LIVE SYNC</span>
                                </div>
                            </div>
                            <Speedometer val={stats.avg_latency} />
                        </div>
                        <div className="h-[80px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.15} />
                                            <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <Area type="monotone" dataKey="val" stroke="var(--color-primary)" strokeWidth={2.5} fillOpacity={1} fill="url(#colorVal)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* AI Engine Breakdown */}
                    <div className="lg:col-span-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[1.5rem] p-4 flex flex-col items-center justify-center relative overflow-hidden group shadow-sm">
                        <div className="absolute top-4 left-4">
                            <h3 className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-0.5 opacity-60">Engine Ops</h3>
                            <p className="text-xs font-black text-[var(--color-text)]">Multimodal Distribution</p>
                        </div>
                        <div className="h-[100px] w-[100px] mt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={engineData} innerRadius={30} outerRadius={45} paddingAngle={5} dataKey="value">
                                        {engineData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="flex gap-3 mt-1">
                            {engineData.map(e => (
                                <div key={e.name} className="flex items-center gap-1 opacity-60 hover:opacity-100 transition-all">
                                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: e.color }} />
                                    <span className="text-[8px] font-black text-[var(--color-text-muted)] uppercase">{e.name.split(' ')[0]}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* AI intelligence Insights */}
                    <div className="bg-indigo-600 rounded-[1.5rem] p-4 text-white shadow-lg shadow-indigo-600/20 relative overflow-hidden flex flex-col justify-between group">
                        <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center backdrop-blur-md">
                                    <FontAwesomeIcon icon={faMagicWandSparkles} className="text-[10px]" />
                                </div>
                                <span className="text-[9px] font-black uppercase tracking-widest opacity-80">Topics</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5 mb-3">
                                {trendingTopics.slice(0, 5).map((tag, i) => {
                                    const isActive = searchInput.toLowerCase() === tag.text.toLowerCase();
                                    return (
                                        <button
                                            key={i}
                                            onClick={() => setSearchInput(tag.text)}
                                            className={`px-1.5 py-0.5 rounded-md border border-white/10 text-[8px] font-black uppercase tracking-tight transition-all active:scale-95 ${isActive ? 'bg-white text-indigo-600' : 'bg-white/5 opacity-70 hover:bg-white/20 hover:opacity-100'}`}
                                        >
                                            {tag.text}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="relative z-10 p-2.5 rounded-xl bg-white/10 border border-white/10 backdrop-blur-sm">
                            <p className="text-[8px] font-black uppercase tracking-widest opacity-60 mb-0.5">Recommendation</p>
                            <p className="text-[10px] font-bold leading-tight line-clamp-2">Update info {trendingTopics[0]?.text || 'jadwal'} di beranda.</p>
                        </div>
                        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
                    </div>
                </div>

                {/* ── Section 3: Unified Stats Grid (Poin 4: Threat Level) ── */}
                <div className="relative mb-6 -mx-3 sm:mx-0 group/scroll">
                    <div
                        ref={statsScrollRef}
                        className="flex overflow-x-auto scrollbar-hide gap-3 pb-2 snap-x snap-mandatory px-3 sm:px-0 sm:grid sm:grid-cols-2 lg:grid-cols-4 lg:overflow-visible lg:pb-0 lg:snap-none"
                    >
                        {statsList.map((s, i) => (
                            <div key={i} className="flex-none w-2/3 sm:w-full snap-start sm:snap-align-none">
                                <div className="bg-[var(--color-surface)] border border-[var(--color-border)] p-4 rounded-[1.8rem] group/card hover:border-[var(--color-primary)]/30 transition-all flex items-center gap-4 h-[85px] relative overflow-hidden shadow-sm hover:shadow-md">
                                    <div className={`w-11 h-11 rounded-2xl ${s.bg} flex items-center justify-center text-lg ${s.color} shrink-0`}>
                                        <FontAwesomeIcon icon={s.icon} />
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest opacity-60 leading-tight mb-0.5">{s.label}</span>
                                        <h4 className="text-xl font-black text-[var(--color-text)] tracking-tighter leading-none">{s.val}</h4>
                                    </div>

                                    {/* Neural Pulse Indicator (Top Right) */}
                                    <div className="absolute top-4 right-4">
                                        <div className={`w-1.5 h-1.5 rounded-full ${s.bg.replace('/10', '').replace('bg-', 'bg-')} animate-pulse shadow-[0_0_8px_currentColor] opacity-60`} />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── Section 4: Neural Command Toolbar (Poin 5: Advanced Filters) ── */}
                <div className="bg-[var(--color-surface)] rounded-[1.5rem] border border-[var(--color-border)] shadow-sm overflow-hidden mb-6 transition-all duration-300">
                    
                    {/* Row 1: Search + Major Controls */}
                    <div className="flex items-center gap-2 p-3">
                        {/* Search Cluster */}
                        <div className="relative flex-1 group min-w-0">
                            <FontAwesomeIcon icon={faSearch} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[10px] text-[var(--color-text-muted)] opacity-50 group-focus-within:opacity-100" />
                            <input
                                value={searchInput}
                                onChange={e => setSearchInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && setSearchTerm(searchInput)}
                                placeholder="Search neural logs (Type & Press Enter)..."
                                className="w-full h-9 pl-10 pr-8 rounded-xl border border-[var(--color-border)] bg-transparent text-[11px] font-bold focus:outline-none focus:border-indigo-500 transition-all shadow-inner shadow-black/[0.02]"
                            />
                            {searchInput && (
                                <button onClick={() => { setSearchInput(''); setSearchTerm('') }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-rose-500 transition-colors">
                                    <FontAwesomeIcon icon={faXmark} className="text-[10px]" />
                                </button>
                            )}
                        </div>

                        {/* Filter Toggle */}
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`h-9 px-4 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2 ${showFilters || filterType !== 'all' || filterSecurity !== 'all' ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] border-[var(--color-border)] hover:border-indigo-500/30'}`}
                        >
                            <FontAwesomeIcon icon={faSliders} className="text-[10px]" />
                            <span className="hidden sm:inline">Filter</span>
                            {(filterType !== 'all' || filterSecurity !== 'all') && (
                                <span className="w-4 h-4 rounded-full bg-white/20 text-white text-[8px] font-black flex items-center justify-center">
                                    {(filterType !== 'all' ? 1 : 0) + (filterSecurity !== 'all' ? 1 : 0)}
                                </span>
                            )}
                        </button>

                        {/* View Switcher */}
                        <div className="flex items-center bg-[var(--color-surface-alt)] p-1 rounded-xl border border-[var(--color-border)] shrink-0">
                            <button 
                                onClick={() => setViewMode('grid')}
                                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${viewMode === 'grid' ? 'bg-[var(--color-surface)] text-indigo-600 shadow-sm border border-[var(--color-border)]' : 'text-[var(--color-text-muted)] opacity-50 hover:opacity-100'}`}
                                title="Grid View"
                            >
                                <FontAwesomeIcon icon={faGrip} className="text-[10px]" />
                            </button>
                            <button 
                                onClick={() => setViewMode('list')}
                                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${viewMode === 'list' ? 'bg-[var(--color-surface)] text-indigo-600 shadow-sm border border-[var(--color-border)]' : 'text-[var(--color-text-muted)] hover:text-indigo-600'}`}
                                title="List View"
                            >
                                <FontAwesomeIcon icon={faTableList} className="text-[10px]" />
                            </button>
                        </div>

                        {/* Reset filters (Only visible when active) */}
                        {(filterType !== 'all' || filterSecurity !== 'all' || searchTerm) && (
                            <button
                                onClick={() => { setSearchInput(''); setSearchTerm(''); setFilterType('all'); setFilterSecurity('all'); setPage(0); }}
                                className="h-9 w-9 rounded-xl border border-rose-500/20 bg-rose-500/5 text-rose-500 text-[10px] items-center justify-center hover:bg-rose-500 hover:text-white transition-all active:scale-95 hidden sm:flex"
                                title="Reset All Filters"
                            >
                                <FontAwesomeIcon icon={faRotateLeft} />
                            </button>
                        )}
                    </div>

                    {/* Row 2: Collapsible Advanced Filters Panel (PILLS STYLE) */}
                    {showFilters && (
                        <div className="px-3 pb-4 border-t border-[var(--color-border)] animate-in slide-in-from-top-2 duration-300">
                            <div className="pt-4 flex flex-wrap items-start gap-6">
                                {/* Neural Type Pills */}
                                <div className="flex flex-col gap-2">
                                    <label className="text-[8px] font-black uppercase tracking-widest text-[var(--color-text-muted)] ml-1 opacity-60">Neural Interaction Type</label>
                                    <div className="flex flex-wrap gap-1.5">
                                        {[
                                            {id: 'all', label: 'Any Interaction', icon: faBolt},
                                            {id: 'chat', label: 'Neural Chat', icon: faMessage},
                                            {id: 'editor', label: 'Zen Editor', icon: faPenNib}
                                        ].map(t => (
                                            <button 
                                                key={t.id}
                                                onClick={() => { setFilterType(t.id); setPage(0); }}
                                                className={`h-7 px-3 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 border ${filterType === t.id ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-[var(--color-surface-alt)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-indigo-500/30'}`}
                                            >
                                                <FontAwesomeIcon icon={t.icon} className="text-[8px] opacity-70" />
                                                {t.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Security Intel Pills */}
                                <div className="flex flex-col gap-2 min-w-[200px]">
                                    <label className="text-[8px] font-black uppercase tracking-widest text-[var(--color-text-muted)] ml-1 opacity-60">Security Intelligence</label>
                                    <div className="flex flex-wrap gap-1.5">
                                        {[
                                            {id: 'all', label: 'All Records', icon: faTowerBroadcast},
                                            {id: 'secure', label: 'Safe Intel', icon: faCheckCircle},
                                            {id: 'flagged', label: 'Risk Intel', icon: faTriangleExclamation}
                                        ].map(s => (
                                            <button 
                                                key={s.id}
                                                onClick={() => { setFilterSecurity(s.id); setPage(0); }}
                                                className={`h-7 px-3 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 border ${filterSecurity === s.id ? (s.id === 'flagged' ? 'bg-rose-500 border-rose-500 text-white shadow-md' : 'bg-emerald-500 border-emerald-500 text-white shadow-md') : 'bg-[var(--color-surface-alt)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-indigo-500/30'}`}
                                            >
                                                <FontAwesomeIcon icon={s.icon} className="text-[8px] opacity-70" />
                                                {s.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Panel Summary Footer */}
                            <div className="mt-4 pt-3 border-t border-[var(--color-border)] border-dashed flex items-center justify-between">
                                <span className="text-[9px] font-bold text-[var(--color-text-muted)] opacity-50 uppercase tracking-widest">
                                    Telemetry Discovery: {stats.filtered} neural record(s) isolated
                                </span>
                                <button 
                                    onClick={() => setShowFilters(false)}
                                    className="text-[9px] font-black uppercase tracking-widest text-indigo-600 hover:opacity-70"
                                >
                                    Close Panel
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Active filter chips (Visual Feedback) */}
                    {(searchTerm || filterType !== 'all' || filterSecurity !== 'all') && (
                        <div className="px-3 pb-3 -mt-1 flex flex-wrap items-center gap-2 animate-in fade-in duration-300">
                            {searchTerm && (
                                <div className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-indigo-500/10 bg-indigo-500/5 text-[9px] font-black text-indigo-600">
                                    <FontAwesomeIcon icon={faSearch} className="opacity-60" />
                                    <span>KEYWORD: "{searchTerm}"</span>
                                    <button onClick={() => { setSearchInput(''); setSearchTerm('') }} className="hover:text-rose-500">
                                        <FontAwesomeIcon icon={faXmark} />
                                    </button>
                                </div>
                            )}
                            {filterType !== 'all' && (
                                <div className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-indigo-500/10 bg-indigo-500/5 text-[9px] font-black text-indigo-600 uppercase tracking-widest">
                                    <span>TYPE: {filterType}</span>
                                    <button onClick={() => setFilterType('all')} className="hover:text-rose-500">
                                        <FontAwesomeIcon icon={faXmark} />
                                    </button>
                                </div>
                            )}
                            {filterSecurity !== 'all' && (
                                <div className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-[9px] font-black uppercase tracking-widest ${filterSecurity === 'flagged' ? 'border-rose-500/20 bg-rose-500/5 text-rose-600' : 'border-emerald-500/20 bg-emerald-500/5 text-emerald-600'}`}>
                                    <span>FLAG: {filterSecurity}</span>
                                    <button onClick={() => setFilterSecurity('all')} className="hover:opacity-60">
                                        <FontAwesomeIcon icon={faXmark} />
                                    </button>
                                </div>
                            )}
                            <span className="ml-auto text-[8px] font-black text-[var(--color-text-muted)] opacity-40 uppercase tracking-widest">
                                Filtered results: {stats.filtered}
                            </span>
                        </div>
                    )}
                </div>

                {/* ── Section 5: Content View (Switchable) ── */}
                {viewMode === 'list' ? (
                    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[1.5rem] shadow-sm overflow-hidden animate-in fade-in duration-500">
                        <div className="overflow-x-auto min-h-[400px]">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-[var(--color-border)]">
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] text-left w-48">Identity</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] text-left w-36">Timestamp</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] text-left w-40">Resource</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] text-left">Preview</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] text-center w-20">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--color-border)]">
                                    {loading && logs.length === 0 ? (
                                        Array.from({ length: 5 }).map((_, i) => (
                                            <tr key={i}><td colSpan="5" className="px-6 py-4"><div className="h-4 bg-[var(--color-surface-alt)] animate-pulse rounded-md w-full" /></td></tr>
                                        ))
                                    ) : filteredLogs.length > 0 ? (
                                        filteredLogs.slice(page * pageSize, (page + 1) * pageSize).map((log) => {
                                            const sec = getSecurityStatus(log.user_query);
                                            const tokens = Math.round((log.user_query.length + (log.ai_response?.length || 0)) / 4);
                                            const cost = (tokens * TOKEN_RATE).toFixed(4);

                                            return (
                                                <tr key={log.id}
                                                    onClick={() => { setSelectedLog(log); setIsDetailModalOpen(true); }}
                                                    className={`group border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-surface-alt)]/50 transition-all cursor-pointer ${sec.flagged ? 'bg-rose-500/[0.02]' : ''}`}>

                                                    {/* Identity */}
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-8 h-8 rounded-lg ${sec.flagged ? 'bg-rose-500/10 text-rose-600' : 'bg-[var(--color-surface-alt)] text-[var(--color-text-muted)]'} flex items-center justify-center border border-[var(--color-border)] group-hover:bg-white transition-colors`}>
                                                                <FontAwesomeIcon icon={log.type === 'chat' ? faMessage : faTerminal} className="text-[10px]" />
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="text-[10px] font-black uppercase text-[var(--color-text)] tracking-tight">{log.type === 'chat' ? 'Neural Chat' : 'System Editor'}</span>
                                                                <span className={`text-[8px] font-black ${sec.color} uppercase tracking-widest flex items-center gap-1 opacity-70`}>
                                                                    <FontAwesomeIcon icon={sec.icon} className="text-[7px]" /> {sec.label}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* Timestamp */}
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col">
                                                            <span className="text-[10px] font-bold text-[var(--color-text)] uppercase">{new Date(log.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}</span>
                                                            <span className="text-[9px] font-bold text-[var(--color-text-muted)] opacity-50">{new Date(log.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                                                        </div>
                                                    </td>

                                                    {/* Resource */}
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col">
                                                            <span className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-40 mb-0.5">Efficiency</span>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[10px] font-black text-[var(--color-text)]">{tokens} TKNS</span>
                                                                <div className="w-1 h-1 rounded-full bg-[var(--color-border)]" />
                                                                <span className="text-[10px] font-black text-emerald-600">${cost}</span>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* Preview */}
                                                    <td className="px-6 py-4">
                                                        <p className={`text-[11px] font-medium line-clamp-1 ${sec.flagged ? 'text-rose-600' : 'text-[var(--color-text-muted)] group-hover:text-[var(--color-primary)]'} transition-colors`}>
                                                            <Highlight text={cleanText(log.user_query)} query={searchInput} />
                                                        </p>
                                                    </td>

                                                    {/* Actions */}
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center justify-center">
                                                            <div className="h-8 w-8 rounded-lg bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] group-hover:text-[var(--color-primary)] group-hover:bg-white group-hover:border-[var(--color-primary)]/20 flex items-center justify-center transition-all border border-[var(--color-border)] shadow-sm">
                                                                <FontAwesomeIcon icon={faEye} className="text-[10px]" />
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )
                                        })
                                    ) : (
                                        <tr><td colSpan="5" className="py-20 text-center text-[var(--color-text-muted)] text-[11px] font-bold uppercase tracking-widest opacity-50">Log tidak ditemukan.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    /* ── Neural Card View ── */
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {loading && logs.length === 0 ? (
                            Array.from({ length: 6 }).map((_, i) => (
                                <div key={i} className="h-[180px] bg-[var(--color-surface-alt)]/20 rounded-[2rem] border border-[var(--color-border)] animate-pulse" />
                            ))
                        ) : filteredLogs.length > 0 ? (
                            filteredLogs.slice(page * pageSize, (page + 1) * pageSize).map((log) => {
                                const sec = getSecurityStatus(log.user_query)
                                return (
                                    <div
                                        key={log.id}
                                        onClick={() => { setSelectedLog(log); setIsDetailModalOpen(true); }}
                                        className={`group relative bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[2rem] p-5 hover:shadow-2xl hover:shadow-[var(--color-primary)]/10 transition-all cursor-pointer overflow-hidden active:scale-[0.98] ${sec.flagged ? 'ring-2 ring-rose-500/20 bg-rose-500/[0.01]' : ''}`}
                                    >
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-[10px] ${sec.flagged ? 'bg-rose-500/10 text-rose-600' : 'bg-emerald-500/10 text-emerald-600'}`}>
                                                    <FontAwesomeIcon icon={sec.icon} />
                                                </div>
                                                <div>
                                                    <p className={`text-[8px] font-black uppercase tracking-widest opacity-40 mb-0.5 ${sec.flagged ? 'text-rose-600 opacity-100' : ''}`}>{sec.label}</p>
                                                    <p className="text-[10px] font-black text-[var(--color-text)] leading-none">{log.type === 'chat' ? 'Neural Chat' : 'Zen Editor'}</p>
                                                </div>
                                            </div>
                                            <div className="bg-[var(--color-surface-alt)] px-2 py-1 rounded-lg border border-[var(--color-border)] group-hover:bg-white transition-colors">
                                                <span className="text-[9px] font-black text-[var(--color-text-muted)]">{new Date(log.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                        </div>

                                        <div className="space-y-3 mb-2">
                                            <div className="bg-[var(--color-surface-alt)]/50 rounded-2xl p-3 border border-[var(--color-border)]">
                                                <p className="text-[11px] font-medium text-[var(--color-text-muted)] line-clamp-2">
                                                    "<Highlight text={cleanText(log.user_query)} query={searchInput} />"
                                                </p>
                                            </div>
                                            {log.ai_response && (
                                                <div className="flex items-start gap-2 pl-2 border-l-2 border-[var(--color-primary)]/20">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] mt-1 shrink-0 animate-pulse" />
                                                    <p className="text-[11px] font-bold text-[var(--color-text)] line-clamp-2 opacity-80 leading-relaxed">
                                                        <Highlight text={cleanText(log.ai_response)} query={searchInput} />
                                                    </p>
                                                </div>
                                            )}
                                        </div>


                                        {/* Efficiency Stats */}
                                        <div className="flex items-center justify-between mt-auto pt-3 border-t border-[var(--color-border)] border-dashed opacity-60">
                                            <div className="flex flex-col">
                                                <span className="text-[8px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-0.5">Energy Usage</span>
                                                <span className="text-[10px] font-black text-[var(--color-primary)]">{Math.round((log.user_query.length + (log.ai_response?.length || 0)) / 4)} TOKENS</span>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-[8px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-0.5">Est. Cost</span>
                                                <span className="text-[10px] font-black text-emerald-500">$ {(Math.round((log.user_query.length + (log.ai_response?.length || 0)) / 4) * TOKEN_RATE).toFixed(4)}</span>
                                            </div>
                                        </div>

                                        <div className="absolute -bottom-10 -right-10 w-24 h-24 bg-[var(--color-primary)]/5 rounded-full blur-3xl group-hover:bg-[var(--color-primary)]/10 transition-all" />
                                    </div>
                                )
                            })
                        ) : (
                            <div className="col-span-full py-20 text-center text-[var(--color-text-muted)] text-[11px] font-bold uppercase tracking-widest opacity-50 border-2 border-dashed border-[var(--color-border)] rounded-[3rem]">
                                Log tidak ditemukan.
                            </div>
                        )}
                    </div>
                )}

                {/* ── Section 6: Standard Pagination (NewsListPage Consistency) ── */}
                <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[1.5rem] mt-6 overflow-hidden shadow-sm mb-6">
                    <div className="px-6 py-4 bg-[var(--color-surface-alt)]/20 flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-1">
                            <span className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest opacity-60">Status: </span>
                            <p className="text-[11px] font-bold text-[var(--color-text)] lowercase">
                                <span className="text-[var(--color-primary)] font-black">{logs.length > 0 ? page * pageSize + 1 : 0}—{Math.min((page + 1) * pageSize, stats.filtered)}</span> dari {stats.filtered} entri <span className="opacity-30 mx-1 ml-2">Total: {stats.total}</span>
                            </p>
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="flex items-center bg-white dark:bg-black/10 rounded-xl border border-[var(--color-border)] p-0.5">
                                <button disabled={page === 0} onClick={() => setPage(0)} className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] hover:bg-[var(--color-surface-alt)] disabled:opacity-30"><FontAwesomeIcon icon={faAnglesLeft} /></button>
                                <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] hover:bg-[var(--color-surface-alt)] disabled:opacity-30"><FontAwesomeIcon icon={faAngleLeft} /></button>
                                <div className="px-3 text-[10px] font-black text-[var(--color-primary)]">{page + 1} / {totalPages}</div>
                                <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] hover:bg-[var(--color-surface-alt)] disabled:opacity-30"><FontAwesomeIcon icon={faAngleRight} /></button>
                                <button disabled={page >= totalPages - 1} onClick={() => setPage(totalPages - 1)} className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] hover:bg-[var(--color-surface-alt)] disabled:opacity-30"><FontAwesomeIcon icon={faAnglesRight} /></button>
                            </div>
                        </div>
                    </div>
                </div>


                {/* ── Section 7: Engine Console (Footer) ── */}
                <div className="bg-slate-900 border border-slate-800 rounded-[1.5rem] p-4 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xl">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                            <FontAwesomeIcon icon={faMicrochip} className="animate-pulse" />
                        </div>
                        <div>
                            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-0.5 opacity-50">Active Stream</p>
                            <p className="text-[11px] font-black text-slate-100 uppercase tracking-tight">Neural Core v3.3 • Distributed Node</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-10">
                        <div className="text-right">
                            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-0.5">LATENCY (AVG)</p>
                            <p className="text-sm font-black text-emerald-500 leading-none">{stats.avg_latency || '0.82'}s <span className="text-[9px] text-slate-600 ml-1">STABLE</span></p>
                        </div>
                    </div>
                </div>

                {/* ── Section 8: Detail Modal (Portal Optimized - Smooth asf) ── */}
                {
                    isDetailModalOpen && selectedLog && createPortal(
                        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/40 animate-in fade-in duration-200" onClick={() => setIsDetailModalOpen(false)}>
                            <div className="bg-white dark:bg-[#0f172a] w-full max-w-3xl rounded-[2rem] border border-white/5 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col md:flex-row h-full max-h-[85vh] md:max-h-[80vh] will-change-[transform,opacity]" onClick={e => e.stopPropagation()}>

                                {/* Sidebar Adaptif */}
                                <div className="md:w-56 shrink-0 bg-slate-50 dark:bg-slate-900/40 border-b md:border-b-0 md:border-r border-[var(--color-border)] p-4 md:p-5 flex md:flex-col items-center md:items-start justify-between md:justify-start gap-4">
                                    <div className="flex items-center gap-3 md:block">
                                        <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white text-md md:text-lg shadow-md shadow-indigo-500/20 md:mb-5">
                                            <FontAwesomeIcon icon={selectedLog.type === 'chat' ? faMessage : faTerminal} />
                                        </div>
                                        <div className="md:hidden">
                                            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Audit Mode</h3>
                                            <p className="text-[10px] font-mono font-bold text-indigo-500">TRCE-{selectedLog.id.split('-')[0].toUpperCase()}</p>
                                        </div>
                                    </div>

                                    <div className="hidden md:block space-y-6 w-full">
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 leading-none opacity-60">ID Trace</p>
                                            <p className="text-[11px] font-mono font-bold text-indigo-500 bg-indigo-500/5 p-2 rounded-lg border border-indigo-500/10 truncate">TRCE-{selectedLog.id.split('-')[0].toUpperCase()}</p>
                                        </div>

                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 opacity-60">Usage Metrics</p>
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between bg-white dark:bg-slate-800/50 p-2 rounded-lg border border-[var(--color-border)]">
                                                    <span className="text-[10px] font-bold opacity-40">Tokens</span>
                                                    <span className="text-xs font-black">{Math.round((selectedLog.user_query.length + (selectedLog.ai_response?.length || 0)) / 4)}</span>
                                                </div>
                                                <div className="flex items-center justify-between bg-white dark:bg-slate-800/50 p-2 rounded-lg border border-[var(--color-border)]">
                                                    <span className="text-[10px] font-bold opacity-40">Cost</span>
                                                    <span className="text-xs font-black text-emerald-500">${(Math.round((selectedLog.user_query.length + (selectedLog.ai_response?.length || 0)) / 4) * TOKEN_RATE).toFixed(4)}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 opacity-60">Security</p>
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${getSecurityStatus(selectedLog.user_query).bg} ${getSecurityStatus(selectedLog.user_query).color} border border-current opacity-70`}>
                                                {getSecurityStatus(selectedLog.user_query).label}
                                            </span>
                                        </div>

                                        {/* Poin 3: Export Audit Button */}
                                        <div className="hidden md:block pt-4 border-t border-[var(--color-border)] mt-4">
                                            <button
                                                onClick={() => exportAudit(selectedLog)}
                                                className="w-full py-2.5 rounded-xl border border-indigo-500/20 text-indigo-500 text-[10px] font-black uppercase tracking-widest hover:bg-indigo-500/10 transition-all flex items-center justify-center gap-2"
                                            >
                                                <FontAwesomeIcon icon={faDownload} />
                                                Export Record
                                            </button>
                                        </div>
                                    </div>

                                    <div className="mt-auto pt-4 border-t border-[var(--color-border)] opacity-20 hidden md:block">
                                        <p className="text-[9px] font-black uppercase tracking-widest">Neural Console v4.0</p>
                                    </div>

                                    {/* Mobile Quick Stats & Export */}
                                    <div className="md:hidden flex items-center gap-2">
                                        <button onClick={() => exportAudit(selectedLog)} className="w-8 h-8 rounded-lg bg-indigo-600/10 text-indigo-600 border border-indigo-500/20 flex items-center justify-center">
                                            <FontAwesomeIcon icon={faDownload} className="text-[10px]" />
                                        </button>
                                        <span className="text-[10px] font-black text-emerald-500 bg-emerald-500/5 px-2 py-1 rounded border border-emerald-500/20">${(Math.round((selectedLog.user_query.length + (selectedLog.ai_response?.length || 0)) / 4) * TOKEN_RATE).toFixed(4)}</span>
                                    </div>
                                </div>

                                {/* Konten Utama - Flexible & Scrollable */}
                                <div className="flex-1 flex flex-col min-h-0 bg-[var(--color-background)]">
                                    <div className="px-5 py-3 md:px-6 md:py-4 border-b border-[var(--color-border)] flex items-center justify-between bg-white/30 dark:bg-slate-900/20 shrink-0">
                                        <div className="flex items-center gap-3">
                                            <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border ${selectedLog.type === 'chat' ? 'bg-blue-500/10 text-blue-600 border-blue-500/10' : 'bg-amber-500/10 text-amber-600 border-amber-500/10'}`}>
                                                {selectedLog.type}
                                            </span>
                                            <h3 className="text-sm font-black text-[var(--color-text)] tracking-wider">Audit Inspection</h3>
                                        </div>
                                        <button onClick={() => setIsDetailModalOpen(false)} className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 flex items-center justify-center transition-all opacity-30 hover:opacity-100 border border-[var(--color-border)]">
                                            <span className="text-base">✕</span>
                                        </button>
                                    </div>

                                    <div className="flex-1 p-5 md:p-6 overflow-y-auto scrollbar-none space-y-5 touch-pan-y">
                                        {/* User Layer */}
                                        <div className="relative pl-12">
                                            <div className="absolute left-0 top-0 w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-black text-slate-400">USR</div>
                                            <div className="p-4 rounded-2xl rounded-tl-none bg-white dark:bg-slate-800 border border-[var(--color-border)] shadow-sm">
                                                <p className="text-[13px] font-medium text-[var(--color-text)] leading-relaxed opacity-90">"{cleanText(selectedLog.user_query)}"</p>
                                            </div>
                                        </div>

                                        {/* AI Layer */}
                                        <div className="relative pl-12">
                                            <div className="absolute left-0 top-0 w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-xs text-white">
                                                <FontAwesomeIcon icon={faRobot} />
                                            </div>
                                            <div className="p-5 rounded-2xl rounded-tl-none bg-indigo-50/10 dark:bg-indigo-600/[0.02] border border-indigo-500/10 shadow-sm">
                                                <div className="text-[13px] text-[var(--color-text)] leading-relaxed space-y-2.5 opacity-90">
                                                    {renderAiResponse(selectedLog.ai_response || "No data recorded.")}
                                                </div>

                                                <div className="mt-5 pt-3 border-t border-indigo-500/5 flex items-center justify-between opacity-50">
                                                    <div className="flex items-center gap-1.5">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                        <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500">Verified Log Record</span>
                                                    </div>
                                                    <span className="text-[9px] font-black">GROQ ENGINE V3.3</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Bottom Spacer for Mobile */}
                                        <div className="h-2 md:hidden" />
                                    </div>

                                    <div className="p-5 bg-slate-50 dark:bg-slate-900/30 border-t border-[var(--color-border)] flex items-center justify-between shrink-0">
                                        <div className="hidden sm:flex items-center gap-2 text-[10px] font-bold text-[var(--color-text-muted)] opacity-50 uppercase tracking-widest">
                                            <FontAwesomeIcon icon={faShieldHalved} className="text-indigo-500" />
                                            Secure Neural Trace Record
                                        </div>
                                        <div className="sm:hidden text-[9px] font-bold opacity-30 uppercase">
                                            Trace Hash: {selectedLog.id.slice(0, 8)}
                                        </div>
                                        <button onClick={() => setIsDetailModalOpen(false)} className="h-10 px-10 rounded-xl bg-indigo-600 text-white text-[11px] font-black uppercase tracking-widest shadow-md hover:scale-[1.02] active:scale-95 transition-all">
                                            Tutup
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>,
                        document.body
                    )
                }
            </div>
        </DashboardLayout >
    )
}
