import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@lib/supabase'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faPlus, faPen, faTrash, faHistory, faSync, faTools,
    faCircleInfo, faChevronRight, faDatabase, faSearch,
    faClock, faExclamationTriangle, faStopwatch, faFingerprint,
    faAngleDown, faXmark, faShieldHalved
} from '@fortawesome/free-solid-svg-icons'
import { fmtDate, fmtTime, fmtDateTime, fmtRelative } from '@utils/formatters'

const SEVERITY_STYLES = {
    LOW: { label: 'Low', color: 'bg-slate-500/10 text-slate-500 border-slate-500/20', icon: faCircleInfo },
    MEDIUM: { label: 'Medium', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20', icon: faExclamationTriangle },
    HIGH: { label: 'High', color: 'bg-orange-500/10 text-orange-500 border-orange-500/20', icon: faExclamationTriangle },
    CRITICAL: { label: 'Critical', color: 'bg-rose-500/10 text-rose-500 border-rose-500/20', icon: faShieldHalved },
}

/**
 * ActionBadge — Chip kecil penanda tipe aksi (INSERT, UPDATE, DELETE, dst)
 * @param {string} action — Tipe aksi dari kolom `action` di audit_logs
 */
export const ActionBadge = ({ action }) => {
    const config = {
        INSERT: { label: 'TAMBAH', color: 'bg-emerald-500/10 text-emerald-500', icon: faPlus },
        UPDATE: { label: 'UBAH', color: 'bg-amber-500/10 text-amber-500', icon: faPen },
        DELETE: { label: 'HAPUS', color: 'bg-rose-500/10 text-rose-500', icon: faTrash },
        RESTORE: { label: 'PULIH', color: 'bg-indigo-500/10 text-indigo-500', icon: faHistory },
        EXECUTE: { label: 'JALAN', color: 'bg-sky-500/10 text-sky-500', icon: faSync },
        LOGIN: { label: 'MASUK', color: 'bg-emerald-500/10 text-emerald-500', icon: faHistory },
        REPAIR: { label: 'PERBAIKAN', color: 'bg-purple-500/10 text-purple-500', icon: faTools },
    }
    const c = config[action] || { label: action, color: 'bg-gray-500/10 text-gray-500', icon: faHistory }

    return (
        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest flex items-center gap-1 w-fit ${c.color}`}>
            <FontAwesomeIcon icon={c.icon} className="text-[7px]" />
            {c.label}
        </span>
    )
}

/**
 * JsonVisualizer — Tampilkan objek JSON dalam format key:value berwarna
 * @param {object} data — Objek JSON yang akan ditampilkan
 */
export const JsonVisualizer = ({ data }) => {
    if (!data || typeof data !== 'object') {
        return <span className="text-[var(--color-text-muted)]">null</span>
    }

    const renderValue = (val) => {
        if (val === null) return <span className="text-rose-400">null</span>
        if (typeof val === 'boolean') return <span className="text-amber-400">{val.toString()}</span>
        if (typeof val === 'number') return <span className="text-sky-400 font-mono">{val}</span>
        if (typeof val === 'string') return <span className="text-emerald-400">"{val}"</span>
        return JSON.stringify(val)
    }

    return (
        <div className="space-y-1 font-mono text-[10px]">
            {Object.entries(data).map(([key, val]) => (
                <div key={key} className="flex gap-2">
                    <span className="text-[var(--color-primary)] opacity-70 shrink-0">{key}:</span>
                    <span className="truncate">{renderValue(val)}</span>
                </div>
            ))}
        </div>
    )
}

// Helper internal — hitung diff antara dua objek
const _getDiff = (oldObj, newObj, changedFields = null) => {
    const changes = {}
    const allKeys = new Set([...Object.keys(oldObj || {}), ...Object.keys(newObj || {})])
    allKeys.forEach(key => {
        const oldVal = oldObj?.[key]
        const newVal = newObj?.[key]
        const bothNull = (oldVal === null || oldVal === undefined) && (newVal === null || newVal === undefined)
        if (bothNull) return
        if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
            if (changedFields && changedFields.length > 0 && !changedFields.includes(key)) return
            changes[key] = { old: oldVal, new: newVal }
        }
    })
    return changes
}

/**
 * DiffViewer — Side-by-side diff antara old_data and new_data dari audit log
 */
export const DiffViewer = ({ oldData, newData, changedFields }) => {
    const diff = _getDiff(oldData, newData, changedFields || null)
    const keys = Object.keys(diff)

    if (keys.length === 0) return (
        <div className="flex flex-col items-center justify-center py-8 opacity-40">
            <FontAwesomeIcon icon={faCircleInfo} className="text-xl mb-2" />
            <p className="text-[10px] font-bold uppercase tracking-widest">Tidak ada perubahan terbaca</p>
        </div>
    )

    return (
        <div className="space-y-3">
            <div className="hidden lg:grid grid-cols-2 gap-4 mb-2">
                <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-50 px-2">
                    Data Sebelumnya
                </p>
                <p className="text-[9px] font-black uppercase tracking-widest text-emerald-500 opacity-80 px-2 text-right">
                    Data Terbaru
                </p>
            </div>

            {keys.map(key => {
                const isSensitive = ['password', 'secret', 'token'].includes(key.toLowerCase())
                const valOld = diff[key].old
                const valNew = diff[key].new

                return (
                    <div key={key} className="group">
                        <div className="px-2 py-1.5 rounded-lg border border-[var(--color-border)]/20 bg-[var(--color-surface-alt)]/30 group-hover:border-[var(--color-primary)]/30 transition-all">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[9px] font-black uppercase text-[var(--color-text-muted)] tracking-tighter">
                                    {key.replace(/_/g, ' ')}
                                </span>
                                {isSensitive && (
                                    <span className="text-[8px] font-black text-rose-500 border border-rose-500/20 px-1.5 py-0.5 rounded uppercase">
                                        Sensitif
                                    </span>
                                )}
                            </div>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {/* Old Value */}
                                <div className="p-2 rounded-lg bg-rose-500/5 border border-rose-500/10 min-h-[32px] flex items-center">
                                    <code className="text-[10px] font-mono break-all text-rose-600/70 line-through">
                                        {isSensitive
                                            ? '••••••••'
                                            : (typeof valOld === 'object'
                                                ? JSON.stringify(valOld)
                                                : String(valOld ?? 'null'))}
                                    </code>
                                </div>
                                {/* New Value */}
                                <div className="relative p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 min-h-[32px] flex items-center">
                                    <div className="absolute -left-2 top-1/2 -translate-y-1/2 hidden lg:flex w-4 h-4 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] items-center justify-center z-10">
                                        <FontAwesomeIcon icon={faChevronRight} className="text-[8px] text-[var(--color-text-muted)] opacity-30" />
                                    </div>
                                    <code className="text-[10px] font-mono font-black break-all text-emerald-600">
                                        {isSensitive
                                            ? '••••••••'
                                            : (typeof valNew === 'object'
                                                ? JSON.stringify(valNew)
                                                : String(valNew ?? 'null'))}
                                    </code>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}

/**
 * DeleteTombstone — Tampilkan snapshot record yang dihapus (old_data)
 */
export const DeleteTombstone = ({ data }) => {
    if (!data || typeof data !== 'object' || Object.keys(data).length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-6 opacity-40">
                <FontAwesomeIcon icon={faDatabase} className="text-xl mb-2" />
                <p className="text-[10px] font-bold uppercase tracking-widest">Data forensik tidak tersedia</p>
            </div>
        )
    }

    const sensitiveKeys = ['password', 'secret', 'token', 'hash']
    const entries = Object.entries(data).filter(([, v]) => v !== null && v !== undefined)

    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2 mb-3">
                <div className="flex-1 h-px bg-rose-500/20" />
                <span className="text-[8px] font-black uppercase tracking-widest text-rose-500/70 flex items-center gap-1.5">
                    <FontAwesomeIcon icon={faTrash} className="text-[7px]" /> Snapshot Record Sebelum Dihapus
                </span>
                <div className="flex-1 h-px bg-rose-500/20" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {entries.map(([key, val]) => {
                    const isSensitive = sensitiveKeys.some(s => key.toLowerCase().includes(s))
                    return (
                        <div key={key} className="p-2.5 rounded-xl bg-rose-500/5 border border-rose-500/10 group">
                            <div className="text-[8px] font-black uppercase tracking-widest text-rose-400/70 mb-1">
                                {key.replace(/_/g, ' ')}
                            </div>
                            <code className="text-[10px] font-mono text-rose-600/80 break-all block">
                                {isSensitive ? '••••••••' : (typeof val === 'object' ? JSON.stringify(val) : String(val))}
                            </code>
                        </div>
                    )
                })}
            </div>
            <p className="text-[9px] text-[var(--color-text-muted)] opacity-50 text-center pt-2">
                Record ini tidak lagi ada di database. Gunakan tombol "Pulihkan" untuk restore.
            </p>
        </div>
    )
}

/**
 * InsertViewer — Tampilkan field-field record baru untuk aksi INSERT
 */
export const InsertViewer = ({ data }) => {
    if (!data || typeof data !== 'object') return null

    const entries = Object.entries(data).filter(([, v]) => v !== null && v !== undefined)
    if (entries.length === 0) return null

    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2 mb-3">
                <div className="flex-1 h-px bg-emerald-500/20" />
                <span className="text-[8px] font-black uppercase tracking-widest text-emerald-500/70 flex items-center gap-1.5">
                    <FontAwesomeIcon icon={faPlus} className="text-[7px]" /> Data Record Baru
                </span>
                <div className="flex-1 h-px bg-emerald-500/20" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {entries.map(([key, val]) => (
                    <div key={key} className="p-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                        <div className="text-[8px] font-black uppercase tracking-widest text-emerald-500/70 mb-1">
                            {key.replace(/_/g, ' ')}
                        </div>
                        <code className="text-[10px] font-mono text-emerald-600 break-all block">
                            {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                        </code>
                    </div>
                ))}
            </div>
        </div>
    )
}

/**
 * AuditTimeline — Timeline vertikal audit log untuk satu record spesifik.
 */
export function AuditTimeline({ tableName, recordId, limit = 20, showSearch = false, stickyHeader = false, containerClassName = "" }) {
    const [logs, setLogs] = useState([])
    const [loading, setLoading] = useState(true)
    const [expandedId, setExpandedId] = useState(null)
    const [search, setSearch] = useState('')
    const [restoringId, setRestoringId] = useState(null)

    const fetchLogs = useCallback(async () => {
        if (!tableName || !recordId) return
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('audit_logs')
                .select('*')
                .eq('table_name', tableName)
                .eq('record_id', recordId)
                .order('created_at', { ascending: false })
                .limit(limit)

            if (error) throw error

            const uids = [...new Set((data || []).map(r => r.user_id).filter(Boolean))]
            let profileMap = {}
            if (uids.length) {
                const { data: pData } = await supabase
                    .from('profiles')
                    .select('id,name')
                    .in('id', uids)
                if (pData) pData.forEach(p => { profileMap[p.id] = p })
            }

            setLogs((data || []).map(r => ({
                ...r,
                actor_name: profileMap[r.user_id]?.name || 'System',
            })))
        } catch (e) {
            console.error('[AuditTimeline]', e.message)
        } finally {
            setLoading(false)
        }
    }, [tableName, recordId, limit])

    const handleRestore = async (log) => {
        if (!window.confirm('Pulihkan data ini? Aksi ini akan menulis ulang state record saat ini.')) return
        setRestoringId(log.id)
        try {
            const targetData = log.old_data
            if (!targetData) throw new Error('Data forensik tidak ditemukan')

            const { error } = await supabase
                .from(tableName)
                .upsert({ id: recordId, ...targetData })
            if (error) throw error

            const { data: { user } } = await supabase.auth.getUser()
            await supabase.from('audit_logs').insert({
                user_id: user.id,
                action: 'RESTORE',
                source: 'MASTER',
                table_name: tableName,
                record_id: recordId,
                old_data: {},
                new_data: { restored_from: log.id, action: log.action },
                url: window.location.href,
            })
            window.location.reload()
        } catch (e) {
            alert('Gagal memulihkan: ' + e.message)
        } finally {
            setRestoringId(null)
        }
    }

    useEffect(() => { fetchLogs() }, [fetchLogs])

    const filteredLogs = logs.filter(l =>
        l.action.toLowerCase().includes(search.toLowerCase()) ||
        l.actor_name.toLowerCase().includes(search.toLowerCase())
    )

    if (loading) return (
        <div className="space-y-4 p-2">
            {[1, 2, 3].map(i => (
                <div key={i} className="flex gap-4 animate-pulse">
                    <div className="w-8 h-8 rounded-full bg-[var(--color-surface-alt)]" />
                    <div className="flex-1 space-y-2">
                        <div className="h-3 w-1/2 bg-[var(--color-surface-alt)] rounded" />
                        <div className="h-2 w-1/4 bg-[var(--color-surface-alt)] rounded opacity-50" />
                    </div>
                </div>
            ))}
        </div>
    )

    if (logs.length === 0) return (
        <div className="py-12 flex flex-col items-center justify-center text-center opacity-30 gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[var(--color-surface-alt)] flex items-center justify-center">
                <FontAwesomeIcon icon={faHistory} className="text-xl" />
            </div>
            <div>
                <p className="text-[10px] font-black uppercase tracking-widest">Belum ada jejak audit</p>
                <p className="text-[9px] font-bold">Aktivitas forensik untuk data ini tidak ditemukan.</p>
            </div>
        </div>
    )

    return (
        <div className={`space-y-1 ${containerClassName} ${stickyHeader ? 'pt-0' : ''}`}>
            {showSearch && (
                <div className={`relative ${stickyHeader ? 'sticky top-0 z-[30] bg-[var(--color-surface)] py-1.5 px-3 -mx-0 border-b border-[var(--color-border)]/50 shadow-sm transition-shadow' : 'mb-4'}`}>
                    <FontAwesomeIcon icon={faSearch} className="absolute left-6 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] text-[10px]" />
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Cari dalam riwayat..."
                        className="w-full h-8 pl-9 pr-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/50 text-[10px] font-bold outline-none focus:border-[var(--color-primary)] transition-all"
                    />
                </div>
            )}

            <div className={`relative space-y-0 ${stickyHeader ? 'pb-3' : ''}`}>
                <div className="absolute left-[18px] top-2 bottom-2 w-px bg-[var(--color-border)] opacity-60" />

                {filteredLogs.map(log => {
                    const isExpanded = expandedId === log.id
                    return (
                        <div key={log.id} className="relative pl-8 pb-1 last:pb-0">
                            <div className={`absolute left-[14px] top-[1.1rem] w-2 h-2 rounded-full border transition-all z-10
                                ${log.action === 'INSERT' ? 'bg-emerald-500/30 border-emerald-500/40' :
                                  log.action === 'UPDATE' ? 'bg-orange-500/30 border-orange-500/40' :
                                  log.action === 'DELETE' ? 'bg-rose-500/30 border-rose-500/40' :
                                  'bg-indigo-500/30 border-indigo-500/40'}
                                ${isExpanded ? 'ring-4 ring-current opacity-100 scale-125' : 'opacity-60'}`} 
                                style={isExpanded ? { '--tw-ring-color': log.action === 'INSERT' ? 'rgba(16,185,129,0.1)' : log.action === 'UPDATE' ? 'rgba(245,158,11,0.1)' : 'rgba(244,63,94,0.1)' } : {}}
                            />

                            <button
                                onClick={() => setExpandedId(isExpanded ? null : log.id)}
                                className={`w-full text-left group transition-all rounded-2xl p-1.5 border
                                    ${isExpanded
                                        ? 'bg-[var(--color-surface-alt)] border-[var(--color-border)] shadow-sm'
                                        : 'bg-transparent border-transparent hover:bg-[var(--color-surface-alt)]/30'}`}
                            >
                                <div className="flex items-center justify-between mb-0.5">
                                    <div className="flex items-center gap-2">
                                        <ActionBadge action={log.action} />
                                        <span className="text-[11px] font-black text-[var(--color-text)] tracking-tight">
                                            {log.actor_name}
                                        </span>
                                    </div>
                                    <span className="text-[9px] font-bold text-[var(--color-text-muted)] tabular-nums opacity-50">
                                        {fmtRelative(log.created_at)}
                                    </span>
                                </div>

                                <p className="text-[9.5px] text-[var(--color-text-muted)] font-medium leading-tight opacity-60">
                                    {log.action === 'UPDATE' ? 'Melakukan perubahan data record'
                                        : log.action === 'INSERT' ? 'Membuat record baru di sistem'
                                            : log.action === 'DELETE' ? 'Menghapus record dari sistem'
                                                : 'Aktivitas sistem'}
                                    <span className="mx-1.5 opacity-30">·</span>
                                    {fmtDateTime(log.created_at)}
                                </p>

                                {isExpanded && (
                                    <div className="mt-2 pt-2.5 border-t border-[var(--color-border)] space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
                                        <div className="p-2.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]/50 space-y-2.5">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <FontAwesomeIcon icon={faClock} className="text-[10px] text-indigo-500" />
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">
                                                        Forensic Diff
                                                    </span>
                                                </div>
                                                <div className="text-[8px] font-mono text-[var(--color-text-muted)] opacity-50">
                                                    IP: {log.ip_address || '?.?.?.?'}
                                                </div>
                                            </div>

                                            {log.action === 'UPDATE' && (
                                                <DiffViewer
                                                    oldData={log.old_data}
                                                    newData={log.new_data}
                                                    changedFields={log.changed_fields}
                                                />
                                            )}
                                            {log.action === 'DELETE' && (
                                                <DeleteTombstone data={log.old_data} />
                                            )}
                                            {log.action === 'INSERT' && (
                                                <InsertViewer data={log.new_data} />
                                            )}
                                            {!['UPDATE', 'DELETE', 'INSERT'].includes(log.action) && (
                                                <DiffViewer oldData={log.old_data} newData={log.new_data} />
                                            )}

                                            <div className="pt-3 border-t border-[var(--color-border)]/50 flex items-center justify-between gap-6">
                                                <div className="flex-1 flex flex-wrap items-center gap-4">
                                                    {log.severity && (() => {
                                                        const sev = SEVERITY_STYLES[log.severity] || SEVERITY_STYLES.LOW
                                                        return (
                                                            <div className="flex items-center gap-2 pr-4 border-r border-[var(--color-border)] last:border-0 border-opacity-30">
                                                                <div className={`w-6 h-6 rounded-lg ${sev.color.split(' ')[0]} flex items-center justify-center`}>
                                                                    <FontAwesomeIcon icon={faExclamationTriangle} className="text-[9px]" />
                                                                </div>
                                                                <div className="flex flex-col">
                                                                    <span className="text-[8px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-50">Severity</span>
                                                                    <span className={`text-[9.5px] font-black uppercase ${sev.color.split(' ')[1]}`}>
                                                                        {sev.label}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        )
                                                    })()}

                                                    {log.duration_ms != null && (
                                                        <div className="flex items-center gap-2 pr-4 border-r border-[var(--color-border)] last:border-0 border-opacity-30">
                                                            <div className="w-6 h-6 rounded-lg bg-[var(--color-surface-alt)] flex items-center justify-center text-[var(--color-text-muted)]">
                                                                <FontAwesomeIcon icon={faStopwatch} className="text-[9px]" />
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="text-[8px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-50">Durasi</span>
                                                                <span className={`text-[9px] font-mono font-bold ${log.duration_ms > 2000 ? 'text-rose-500' : log.duration_ms > 500 ? 'text-amber-500' : 'text-emerald-500'}`}>
                                                                    {log.duration_ms}ms
                                                                </span>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {log.session_id && (
                                                        <div className="flex items-center gap-2 group cursor-help" title={log.session_id}>
                                                            <div className="w-6 h-6 rounded-lg bg-[var(--color-surface-alt)] flex items-center justify-center text-[var(--color-text-muted)] group-hover:bg-[var(--color-primary)]/10 group-hover:text-[var(--color-primary)] transition-colors">
                                                                <FontAwesomeIcon icon={faFingerprint} className="text-[9px]" />
                                                            </div>
                                                            <div className="flex flex-col min-w-0">
                                                                <span className="text-[8px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-50">Session</span>
                                                                <span className="text-[9px] font-mono font-bold text-[var(--color-text)] truncate max-w-[100px] block">
                                                                    {log.session_id.slice(0, 12)}...
                                                                </span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                {(log.action === 'DELETE' || log.action === 'UPDATE') && (
                                                    <div className="shrink-0">
                                                        <button
                                                            onClick={e => { e.stopPropagation(); handleRestore(log) }}
                                                            disabled={restoringId === log.id}
                                                            className={`h-7 px-3 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2
                                                                ${restoringId === log.id
                                                                    ? 'bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] animate-pulse'
                                                                    : 'bg-amber-500 text-white hover:bg-amber-600 shadow-lg shadow-amber-500/20 active:scale-95'}`}
                                                        >
                                                            <FontAwesomeIcon icon={faHistory} className={restoringId === log.id ? 'animate-spin' : ''} />
                                                            {restoringId === log.id
                                                                ? 'Memulihkan...'
                                                                : log.action === 'DELETE' ? 'Pulihkan Record' : 'Revert ke State ini'}
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {!isExpanded && (
                                    <div className="flex items-center justify-end mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <span className="text-[8px] font-black uppercase text-[var(--color-primary)] flex items-center gap-1.5">
                                            Detail Forensik <FontAwesomeIcon icon={faChevronRight} className="text-[7px]" />
                                        </span>
                                    </div>
                                )}
                            </button>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
