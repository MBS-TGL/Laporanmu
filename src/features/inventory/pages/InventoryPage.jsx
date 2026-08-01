import React, { useState, useRef, useEffect, useCallback, memo, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faPlus, faSearch, faEdit, faTrash, faBoxes, faBoxOpen, faTriangleExclamation,
    faCheckCircle, faSpinner, faSave, faTimes, faTable, faGripVertical, faDownload,
    faKeyboard, faFilter, faSort, faChevronDown, faCheck, faSquare, faSquareCheck,
    faArrowRight, faHeartPulse, faClipboardList, faTag, faCalendar, faInfoCircle,
    faEllipsisV, faExpand, faCompress, faPrint, faCopy
} from '@fortawesome/free-solid-svg-icons'
import {
    faChair, faPlug, faPen, faMosque, faBroom, faUtensils, faBox, faLayerGroup
} from '@fortawesome/free-solid-svg-icons'

import DashboardLayout from '@core/layouts/DashboardLayout'
import { PageHeader, Modal, RichSelect, StatsCarousel, StatCard, EmptyState } from '@shared/components'
import { useToast, useFlag, useLanguage } from '@context'
import { supabase } from '@lib/supabase'
import {
    useInventory, CATEGORIES, categorizeItem, getConditionPct, getConditionLevel,
    formatDate, formatRelativeDate
} from '@features/inventory/hooks/useInventory'

const CATEGORY_ICONS = { furniture: faChair, elektronik: faPlug, atk: faPen, ibadah: faMosque, kebersihan: faBroom, dapur: faUtensils, lainnya: faBox, all: faLayerGroup }

function getPortalContainer(id) {
    let el = document.getElementById(id)
    if (!el) { el = document.createElement('div'); el.id = id; document.body.appendChild(el) }
    return el
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── DebouncedSearchInput ──────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
const DebouncedSearchInput = memo(({ value, onSearch, placeholder }) => {
    const [local, setLocal] = useState(value)
    useEffect(() => { const t = setTimeout(() => onSearch(local), 300); return () => clearTimeout(t) }, [local])
    useEffect(() => { if (value === '' && local !== '') setLocal('') }, [value])
    return (
        <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--color-text-muted)] group-focus-within:text-[var(--color-primary)] transition-colors">
                <FontAwesomeIcon icon={faSearch} className="text-xs" />
            </div>
            <input ref={null} type="text" value={local} onChange={e => setLocal(e.target.value)} placeholder={placeholder}
                className="w-full h-9 pl-10 pr-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[11px] font-bold focus:outline-none focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/10 transition-all placeholder:font-normal placeholder:opacity-40" />
        </div>
    )
})
DebouncedSearchInput.displayName = 'DebouncedSearchInput'

// ═══════════════════════════════════════════════════════════════════════════════
// ── ConditionBadge ────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
function ConditionBadge({ item, size = 'sm' }) {
    const pct = getConditionPct(item)
    const level = getConditionLevel(pct)
    const colors = {
        excellent: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
        good: 'bg-green-500/10 text-green-600 border-green-500/20',
        fair: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
        poor: 'bg-red-500/10 text-red-600 border-red-500/20'
    }
    const labels = { excellent: 'Sangat Baik', good: 'Baik', fair: 'Kurang', poor: 'Buruk' }
    if (pct === null) return <span className="text-[9px] text-[var(--color-text-muted)]">—</span>
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[9px] font-black ${colors[level]} ${size === 'lg' ? 'text-[10px] px-2.5 py-1' : ''}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${level === 'excellent' ? 'bg-emerald-500' : level === 'good' ? 'bg-green-500' : level === 'fair' ? 'bg-amber-500' : 'bg-red-500'}`} />
            {pct}% — {labels[level]}
        </span>
    )
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── CategoryChip ──────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
function CategoryChip({ cat, active, count, onClick }) {
    const Icon = CATEGORY_ICONS[cat.id] || faBox
    const colorMap = {
        slate: active ? 'bg-slate-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
        blue: active ? 'bg-blue-500 text-white' : 'bg-blue-50 text-blue-600 hover:bg-blue-100',
        violet: active ? 'bg-violet-500 text-white' : 'bg-violet-50 text-violet-600 hover:bg-violet-100',
        amber: active ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-600 hover:bg-amber-100',
        emerald: active ? 'bg-emerald-500 text-white' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100',
        cyan: active ? 'bg-cyan-500 text-white' : 'bg-cyan-50 text-cyan-600 hover:bg-cyan-100',
        orange: active ? 'bg-orange-500 text-white' : 'bg-orange-50 text-orange-600 hover:bg-orange-100'
    }
    return (
        <button onClick={onClick}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black transition-all shrink-0 border ${active ? `${colorMap[cat.color]} border-transparent shadow-sm` : `${colorMap[cat.color]} border-transparent`}`}>
            <FontAwesomeIcon icon={Icon} className="text-[9px]" />
            <span>{cat.label}</span>
            {count !== undefined && (
                <span className={`ml-0.5 px-1.5 py-0.5 rounded-md text-[8px] font-black ${active ? 'bg-white/20' : 'bg-black/5'}`}>{count}</span>
            )}
        </button>
    )
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── BulkActionBar ─────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
function BulkActionBar({ count, onDelete, onExport, onClear, canEdit }) {
    if (count === 0) return null
    return (
        <div className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-[var(--color-text)] text-white shadow-2xl shadow-black/20 border border-white/10">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
                        <FontAwesomeIcon icon={faSquareCheck} className="text-xs" />
                    </div>
                    <span className="text-[11px] font-black">{count} dipilih</span>
                </div>
                <div className="w-px h-5 bg-white/20" />
                <button onClick={onExport} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-[10px] font-bold transition-all">
                    <FontAwesomeIcon icon={faDownload} className="text-[9px]" /> Export
                </button>
                {canEdit && (
                    <button onClick={onDelete} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/80 hover:bg-red-500 text-[10px] font-bold transition-all">
                        <FontAwesomeIcon icon={faTrash} className="text-[9px]" /> Hapus
                    </button>
                )}
                <button onClick={onClear} className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-white/10 text-[10px] font-bold transition-all">
                    <FontAwesomeIcon icon={faTimes} className="text-[9px]" />
                </button>
            </div>
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── ItemFormModal ─────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
function ItemFormModal({ isOpen, onClose, onSave, editingItem, submitting, formDataRef }) {
    const [form, setForm] = useState({ item_name: '', total_quantity: 0, good_condition_count: 0, damaged_condition_count: 0, notes: '' })

    useEffect(() => {
        if (isOpen) setForm({ ...formDataRef.current })
    }, [isOpen, editingItem, formDataRef])

    const set = (k, v) => setForm(p => ({ ...p, [k]: v }))
    const total = Number(form.total_quantity) || 0
    const good = Number(form.good_condition_count) || 0
    const damaged = Number(form.damaged_condition_count) || 0
    const unaccounted = total - good - damaged
    const pct = total > 0 ? Math.round((good / total) * 100) : null

    const handleSubmit = (e) => {
        e.preventDefault()
        if (!form.item_name?.trim()) return
        formDataRef.current = form
        onSave(form)
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={editingItem ? 'Edit Item Inventaris' : 'Tambah Item Baru'}
            icon={editingItem ? faEdit : faPlus} iconBg="bg-[var(--color-primary)]/10" iconColor="text-[var(--color-primary)]"
            size="md" mobileVariant="bottom-sheet"
            footer={
                <div className="flex items-center w-full gap-3">
                    <button onClick={onClose} className="h-10 px-5 rounded-xl border border-[var(--color-border)] text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] transition-all">Batal</button>
                    <div className="flex-1" />
                    <button onClick={handleSubmit} disabled={submitting || !form.item_name?.trim()}
                        className="h-10 px-6 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-[var(--color-primary)]/20 transition-all flex items-center gap-2 disabled:opacity-50">
                        {submitting ? <FontAwesomeIcon icon={faSpinner} className="animate-spin text-xs" /> : <FontAwesomeIcon icon={faSave} className="text-xs" />}
                        {editingItem ? 'Perbarui' : 'Simpan'}
                    </button>
                </div>
            }>
            <form onSubmit={handleSubmit} className="space-y-5">
                {/* Name */}
                <div>
                    <label className="block text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1.5">Nama Item *</label>
                    <input type="text" value={form.item_name || ''} onChange={e => set('item_name', e.target.value)}
                        placeholder="Contoh: Meja Belajar Lipat, Kipas Angin Dinding..."
                        className="w-full h-10 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[12px] font-bold focus:outline-none focus:border-[var(--color-primary)] transition" required />
                    {form.item_name && (
                        <div className="flex items-center gap-1.5 mt-1.5">
                            <FontAwesomeIcon icon={faTag} className="text-[8px] text-[var(--color-text-muted)]" />
                            <span className="text-[9px] text-[var(--color-text-muted)]">Kategori: <span className="font-black">{CATEGORIES.find(c => c.id === categorizeItem(form.item_name))?.label || 'Lainnya'}</span></span>
                        </div>
                    )}
                </div>

                {/* Quantity Grid */}
                <div>
                    <label className="block text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-2">Kuantitas & Kondisi</label>
                    <div className="grid grid-cols-3 gap-3">
                        <div className="relative">
                            <input type="number" min="0" value={form.total_quantity || ''} onChange={e => set('total_quantity', e.target.value)}
                                className="w-full h-12 px-3 pt-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[14px] font-black text-center focus:outline-none focus:border-[var(--color-primary)] transition peer" placeholder=" " />
                            <label className="absolute left-3 top-1.5 text-[8px] font-black uppercase tracking-widest text-[var(--color-text-muted)] peer-placeholder-shown:opacity-0 peer-focus:opacity-100 transition-opacity">Total</label>
                        </div>
                        <div className="relative">
                            <input type="number" min="0" value={form.good_condition_count || ''} onChange={e => set('good_condition_count', e.target.value)}
                                className="w-full h-12 px-3 pt-5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 text-[14px] font-black text-center focus:outline-none focus:border-emerald-500 transition peer" placeholder=" " />
                            <label className="absolute left-3 top-1.5 text-[8px] font-black uppercase tracking-widest text-emerald-500 peer-placeholder-shown:opacity-0 peer-focus:opacity-100 transition-opacity">Baik</label>
                        </div>
                        <div className="relative">
                            <input type="number" min="0" value={form.damaged_condition_count || ''} onChange={e => set('damaged_condition_count', e.target.value)}
                                className="w-full h-12 px-3 pt-5 rounded-xl border border-red-500/30 bg-red-500/5 text-[14px] font-black text-center focus:outline-none focus:border-red-500 transition peer" placeholder=" " />
                            <label className="absolute left-3 top-1.5 text-[8px] font-black uppercase tracking-widest text-red-500 peer-placeholder-shown:opacity-0 peer-focus:opacity-100 transition-opacity">Rusak</label>
                        </div>
                    </div>
                    {/* Health Bar */}
                    {total > 0 && (
                        <div className="mt-3 p-3 rounded-xl bg-[var(--color-surface-alt)]/50 border border-[var(--color-border)]/50">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-1.5">
                                    <FontAwesomeIcon icon={faHeartPulse} className="text-[9px] text-[var(--color-text-muted)]" />
                                    <span className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-wider">Kondisi</span>
                                </div>
                                <span className="text-[11px] font-black">{pct}%</span>
                            </div>
                            <div className="h-2 rounded-full bg-[var(--color-border)] overflow-hidden flex">
                                <div className="h-full bg-emerald-500 transition-all" style={{ width: `${total > 0 ? (good / total) * 100 : 0}%` }} />
                                <div className="h-full bg-red-500 transition-all" style={{ width: `${total > 0 ? (damaged / total) * 100 : 0}%` }} />
                            </div>
                            <div className="flex items-center justify-between mt-1.5">
                                <span className="text-[8px] font-bold text-emerald-600">Baik: {good}</span>
                                {unaccounted !== 0 && <span className="text-[8px] font-bold text-amber-600">Terkonfirmasi: {good + damaged}/{total}</span>}
                                <span className="text-[8px] font-bold text-red-600">Rusak: {damaged}</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Notes */}
                <div>
                    <label className="block text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1.5">Catatan</label>
                    <textarea value={form.notes || ''} onChange={e => set('notes', e.target.value)} rows={3}
                        placeholder="Kondisi, lokasi spesifik, atau catatan lainnya..."
                        className="w-full px-3 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[11px] font-bold focus:outline-none focus:border-[var(--color-primary)] transition resize-none" />
                </div>
            </form>
        </Modal>
    )
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── DetailDrawer ──────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
function DetailDrawer({ item, isOpen, onClose, onEdit, canEdit }) {
    const pct = item ? getConditionPct(item) : null
    const level = item ? getConditionLevel(pct) : null
    const cat = item ? CATEGORIES.find(c => c.id === categorizeItem(item?.item_name)) : null

    useEffect(() => {
        if (isOpen) document.body.style.overflow = 'hidden'
        else document.body.style.overflow = ''
        return () => { document.body.style.overflow = '' }
    }, [isOpen])

    if (!isOpen || !item) return null

    return (
        <>
            <div className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-[60] transition-opacity" onClick={onClose} />
            <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-[var(--color-surface)] z-[61] shadow-2xl border-l border-[var(--color-border)] animate-in slide-in-from-right duration-300 flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center shrink-0">
                            <FontAwesomeIcon icon={CATEGORY_ICONS[cat?.id] || faBox} className="text-[var(--color-primary)]" />
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-[13px] font-black text-[var(--color-text)] truncate">{item.item_name}</h2>
                            <p className="text-[9px] text-[var(--color-text-muted)] font-bold">{cat?.label || 'Lainnya'}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-[var(--color-surface-alt)] flex items-center justify-center transition-all">
                        <FontAwesomeIcon icon={faTimes} className="text-sm text-[var(--color-text-muted)]" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-5 space-y-5">
                    {/* Condition Card */}
                    <div className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/30">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Kondisi Saat Ini</span>
                            {pct !== null && <ConditionBadge item={item} size="lg" />}
                        </div>
                        {pct !== null ? (
                            <>
                                <div className="h-3 rounded-full bg-[var(--color-border)] overflow-hidden flex mb-3">
                                    <div className="h-full bg-emerald-500 transition-all" style={{ width: `${(item.good_condition_count / item.total_quantity) * 100}%` }} />
                                    <div className="h-full bg-red-500 transition-all" style={{ width: `${(item.damaged_condition_count / item.total_quantity) * 100}%` }} />
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="text-center p-2 rounded-xl bg-white/50">
                                        <p className="text-[18px] font-black text-[var(--color-text)]">{item.total_quantity || 0}</p>
                                        <p className="text-[8px] font-black text-[var(--color-text-muted)] uppercase">Total</p>
                                    </div>
                                    <div className="text-center p-2 rounded-xl bg-emerald-500/5">
                                        <p className="text-[18px] font-black text-emerald-600">{item.good_condition_count || 0}</p>
                                        <p className="text-[8px] font-black text-emerald-500 uppercase">Baik</p>
                                    </div>
                                    <div className="text-center p-2 rounded-xl bg-red-500/5">
                                        <p className="text-[18px] font-black text-red-600">{item.damaged_condition_count || 0}</p>
                                        <p className="text-[8px] font-black text-red-500 uppercase">Rusak</p>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <p className="text-[10px] text-[var(--color-text-muted)] text-center py-2">Belum ada data kuantitas</p>
                        )}
                    </div>

                    {/* Info List */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between py-2 border-b border-[var(--color-border)]/50">
                            <span className="text-[10px] font-bold text-[var(--color-text-muted)] flex items-center gap-2"><FontAwesomeIcon icon={faCalendar} className="text-[9px]" /> Terakhir Dicek</span>
                            <span className="text-[10px] font-black text-[var(--color-text)]">{formatDate(item.last_checked_at)}</span>
                        </div>
                        <div className="flex items-center justify-between py-2 border-b border-[var(--color-border)]/50">
                            <span className="text-[10px] font-bold text-[var(--color-text-muted)] flex items-center gap-2"><FontAwesomeIcon icon={faClipboardList} className="text-[9px]" /> Waktu Relatif</span>
                            <span className="text-[10px] font-black text-[var(--color-text)]">{formatRelativeDate(item.last_checked_at)}</span>
                        </div>
                        <div className="flex items-center justify-between py-2 border-b border-[var(--color-border)]/50">
                            <span className="text-[10px] font-bold text-[var(--color-text-muted)] flex items-center gap-2"><FontAwesomeIcon icon={faTag} className="text-[9px]" /> Kategori</span>
                            <span className="text-[10px] font-black text-[var(--color-text)]">{cat?.label || 'Lainnya'}</span>
                        </div>
                        {item.dorm_id && (
                            <div className="flex items-center justify-between py-2 border-b border-[var(--color-border)]/50">
                                <span className="text-[10px] font-bold text-[var(--color-text-muted)] flex items-center gap-2"><FontAwesomeIcon icon={faBoxOpen} className="text-[9px]" /> Lokasi</span>
                                <span className="text-[10px] font-black text-[var(--color-text)]">{item.dorm_id}</span>
                            </div>
                        )}
                    </div>

                    {/* Notes */}
                    {item.notes && (
                        <div className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
                            <div className="flex items-center gap-2 mb-2">
                                <FontAwesomeIcon icon={faInfoCircle} className="text-[9px] text-[var(--color-text-muted)]" />
                                <span className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Catatan</span>
                            </div>
                            <p className="text-[11px] text-[var(--color-text)] leading-relaxed whitespace-pre-wrap">{item.notes}</p>
                        </div>
                    )}

                    {/* Created */}
                    <div className="text-center py-2">
                        <span className="text-[9px] text-[var(--color-text-muted)]">Dibuat: {formatDate(item.created_at)}</span>
                    </div>
                </div>

                {/* Footer */}
                {canEdit && (
                    <div className="px-5 py-4 border-t border-[var(--color-border)]">
                        <button onClick={() => { onEdit(item); onClose() }}
                            className="w-full h-10 rounded-xl bg-[var(--color-primary)] text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[var(--color-primary)]/90 transition-all">
                            <FontAwesomeIcon icon={faEdit} className="text-[10px]" /> Edit Item
                        </button>
                    </div>
                )}
            </div>
        </>
    )
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── ExportModal ───────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
function ExportModal({ isOpen, onClose, onExport, totalFiltered, totalSelected }) {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Export Data Inventaris"
            icon={faDownload} iconBg="bg-indigo-500/10" iconColor="text-indigo-500" size="sm" mobileVariant="bottom-sheet">
            <div className="space-y-3">
                <p className="text-[11px] text-[var(--color-text-muted)]">
                    {totalSelected > 0 ? `Mengekspor ${totalSelected} item terpilih` : `Mengekspor ${totalFiltered} item yang ditampilkan`}
                </p>
                <div className="space-y-2">
                    <button onClick={() => { onExport('csv'); onClose() }}
                        className="w-full flex items-center gap-3 p-3 rounded-xl border border-[var(--color-border)] hover:bg-[var(--color-surface-alt)] transition-all text-left group">
                        <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <FontAwesomeIcon icon={faDownload} className="text-emerald-500 text-sm" />
                        </div>
                        <div>
                            <p className="text-[11px] font-black text-[var(--color-text)]">Export CSV</p>
                            <p className="text-[9px] text-[var(--color-text-muted)]">Format spreadsheet universal</p>
                        </div>
                    </button>
                </div>
            </div>
        </Modal>
    )
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── MAIN PAGE ────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
export default function InventoryPage() {
    const { addToast } = useToast()
    const { enabled: canEdit } = useFlag('access.teacher_students')

    const inv = useInventory({ addToast })
    const {
        items, loading, searchQuery, setSearchQuery,
        filterCategory, setFilterCategory, filterCondition, setFilterCondition,
        sortBy, setSortBy, isModalOpen, isDetailOpen, isExportOpen,
        editingItem, selectedItem, selectedIds, allSelected, someSelected,
        submitting, stats, formDataRef, viewMode, switchView,
        openAddModal, openEditModal, openDetail, closeModal, closeDetail,
        toggleSelectAll, toggleSelect, clearSelection,
        handleSave, handleDelete, handleBulkDelete, exportData, setIsModalOpen,
        setIsDetailOpen, setIsExportOpen
    } = inv

    const [deleteTarget, setDeleteTarget] = useState(null)
    const [isDeleteOpen, setIsDeleteOpen] = useState(false)

    const handleDeleteClick = useCallback((item) => { setDeleteTarget(item); setIsDeleteOpen(true) }, [])
    const confirmDelete = useCallback(async () => {
        if (!deleteTarget) return
        await handleDelete(deleteTarget.id)
        setIsDeleteOpen(false); setDeleteTarget(null)
    }, [deleteTarget, handleDelete])

    const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)
    useEffect(() => {
        const h = () => setIsMobile(window.innerWidth < 768)
        window.addEventListener('resize', h); return () => window.removeEventListener('resize', h)
    }, [])

    return (
        <DashboardLayout title="Inventaris & Aset">
            <div className="p-4 md:p-6 space-y-4 max-w-[1800px] mx-auto min-h-screen relative">
                {/* Header */}
                <PageHeader
                    badge="Master Data"
                    breadcrumbs={['Student Directory', 'Inventaris']}
                    title="Inventaris & Aset"
                    subtitle={`Kelola ${stats.total} item inventaris • ${stats.totalQty} total unit`}
                    actions={
                        <div className="flex items-center gap-2">
                            {/* Keyboard shortcut hint */}
                            <div className="hidden lg:flex items-center gap-1.5 px-2.5 h-9 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[9px] font-bold text-[var(--color-text-muted)]">
                                <FontAwesomeIcon icon={faKeyboard} className="text-[8px]" />
                                <span>N = tambah baru</span>
                            </div>

                            {/* Export */}
                            <button onClick={() => setIsExportOpen(true)}
                                className="h-9 w-9 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] transition-all"
                                title="Export">
                                <FontAwesomeIcon icon={faDownload} className="text-xs" />
                            </button>

                            {/* View Toggle */}
                            <div className="flex items-center bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-xl p-0.5 h-9">
                                <button onClick={() => switchView('table')}
                                    className={`h-full px-2.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1 ${viewMode === 'table' ? 'bg-white text-[var(--color-text)] shadow-sm' : 'text-[var(--color-text-muted)]'}`}>
                                    <FontAwesomeIcon icon={faTable} className="text-[8px]" /> <span className="hidden sm:inline">Tabel</span>
                                </button>
                                <button onClick={() => switchView('card')}
                                    className={`h-full px-2.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1 ${viewMode === 'card' ? 'bg-white text-[var(--color-text)] shadow-sm' : 'text-[var(--color-text-muted)]'}`}>
                                    <FontAwesomeIcon icon={faGripVertical} className="text-[8px]" /> <span className="hidden sm:inline">Kartu</span>
                                </button>
                            </div>

                            {/* Add Button */}
                            <button onClick={openAddModal} disabled={!canEdit}
                                className="h-9 px-4 sm:px-5 rounded-xl bg-[var(--color-primary)] text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-95 shadow-md shadow-[var(--color-primary)]/20 disabled:opacity-40 disabled:cursor-not-allowed border border-white/10">
                                <FontAwesomeIcon icon={faPlus} className="text-[10px]" />
                                <span className="hidden sm:inline">Tambah Item</span>
                            </button>
                        </div>
                    }
                />

                {/* Stats */}
                <StatsCarousel count={4} cols={4}>
                    <StatCard icon={faBoxes} label="Total Jenis" value={stats.total} subValue="Item terdaftar" color="sky" />
                    <StatCard icon={faBoxOpen} label="Total Unit" value={stats.totalQty} subValue="Seluruh unit" color="indigo" />
                    <StatCard icon={faHeartPulse} label="Kesehatan" value={`${stats.healthPct}%`} subValue={`${stats.goodQty} dari ${stats.totalQty} unit baik`} color="emerald" />
                    <StatCard icon={faTriangleExclamation} label="Rusak" value={stats.damagedQty} subValue={stats.damagedQty > 0 ? `${Math.round((stats.damagedQty / (stats.totalQty || 1)) * 100)}% dari total` : 'Tidak ada kerusakan'} color="rose" />
                </StatsCarousel>

                {/* Category Tabs */}
                <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
                    {CATEGORIES.map(cat => (
                        <CategoryChip key={cat.id} cat={cat} active={filterCategory === cat.id}
                            count={cat.id === 'all' ? stats.total : stats.catCounts[cat.id]}
                            onClick={() => setFilterCategory(cat.id)} />
                    ))}
                </div>

                {/* Toolbar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                    <div className="flex-1 min-w-0">
                        <DebouncedSearchInput value={searchQuery} onSearch={setSearchQuery} placeholder="Cari nama item, catatan..." />
                    </div>

                    {/* Condition Filter */}
                    <div className="flex items-center gap-1.5">
                        {[
                            { key: 'all', label: 'Semua' },
                            { key: 'excellent', label: 'Sangat Baik', color: 'emerald' },
                            { key: 'good', label: 'Baik', color: 'green' },
                            { key: 'fair', label: 'Kurang', color: 'amber' },
                            { key: 'poor', label: 'Buruk', color: 'red' }
                        ].map(f => (
                            <button key={f.key} onClick={() => setFilterCondition(f.key)}
                                className={`h-8 px-2.5 rounded-lg text-[9px] font-black uppercase tracking-wider border transition-all shrink-0 ${filterCondition === f.key
                                    ? f.key === 'all' ? 'bg-[var(--color-text)] text-white border-transparent' : `bg-${f.color}-500 text-white border-transparent`
                                    : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] border-[var(--color-border)] hover:bg-[var(--color-surface-alt)]'
                                    }`}>
                                {f.label}
                            </button>
                        ))}
                    </div>

                    {/* Sort */}
                    <div className="w-full sm:w-[170px] shrink-0">
                        <RichSelect compact value={sortBy} onChange={setSortBy}
                            options={[
                                { id: 'name_asc', name: 'Nama A-Z' },
                                { id: 'name_desc', name: 'Nama Z-A' },
                                { id: 'total_desc', name: 'Total ↓' },
                                { id: 'total_asc', name: 'Total ↑' },
                                { id: 'condition_desc', name: 'Kondisi Terbaik' },
                                { id: 'condition_asc', name: 'Kondisi Terburuk' },
                                { id: 'damaged_desc', name: 'Rusak Terbanyak' },
                                { id: 'recent', name: 'Terakhir Dicek' }
                            ]} />
                    </div>
                </div>

                {/* Select All */}
                {items.length > 0 && (
                    <div className="flex items-center justify-between">
                        <button onClick={toggleSelectAll}
                            className="flex items-center gap-2 text-[10px] font-black text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors">
                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${allSelected ? 'bg-[var(--color-primary)] border-[var(--color-primary)]' : someSelected ? 'bg-[var(--color-primary)]/20 border-[var(--color-primary)]' : 'border-[var(--color-border)] bg-white'}`}>
                                {allSelected && <FontAwesomeIcon icon={faCheck} className="text-[7px] text-white" />}
                                {someSelected && !allSelected && <div className="w-2 h-0.5 bg-[var(--color-primary)] rounded" />}
                            </div>
                            Pilih Semua ({items.length})
                        </button>
                        <span className="text-[9px] font-bold text-[var(--color-text-muted)]">
                            {selectedIds.size > 0 ? `${selectedIds.size} dipilih` : `${items.length} item`}
                        </span>
                    </div>
                )}

                {/* Content */}
                {loading ? (
                    <div className="flex items-center justify-center gap-2 py-16">
                        <FontAwesomeIcon icon={faSpinner} className="animate-spin text-sm text-[var(--color-primary)]" />
                        <span className="text-[11px] font-bold text-[var(--color-text-muted)]">Memuat data inventaris...</span>
                    </div>
                ) : items.length === 0 ? (
                    <EmptyState icon={faBoxes} title="Belum ada item inventaris"
                        subtitle="Mulai tambahkan item untuk mencatat sarana dan prasarana."
                        action={canEdit ? <button onClick={openAddModal} className="mt-3 h-9 px-4 rounded-xl bg-[var(--color-primary)] text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:scale-[1.02] active:scale-95"><FontAwesomeIcon icon={faPlus} className="text-[10px]" /> Tambah Item Pertama</button> : null} />
                ) : viewMode === 'card' || isMobile ? (
                    /* ── Card View ── */
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                        {items.map(item => {
                            const cat = CATEGORIES.find(c => c.id === categorizeItem(item.item_name))
                            const Icon = CATEGORY_ICONS[cat?.id] || faBox
                            const isSelected = selectedIds.has(item.id)
                            return (
                                <div key={item.id}
                                    className={`group p-4 rounded-2xl border transition-all cursor-pointer hover:shadow-md ${isSelected ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 shadow-sm' : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-primary)]/30'}`}
                                    onClick={() => openDetail(item)}>
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-2.5">
                                            <button onClick={e => { e.stopPropagation(); toggleSelect(item.id) }}
                                                className={`w-5 h-5 rounded border flex items-center justify-center transition-all shrink-0 ${isSelected ? 'bg-[var(--color-primary)] border-[var(--color-primary)]' : 'border-[var(--color-border)] bg-white group-hover:border-[var(--color-primary)]/40'}`}>
                                                {isSelected && <FontAwesomeIcon icon={faCheck} className="text-[7px] text-white" />}
                                            </button>
                                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center bg-${cat?.color || 'slate'}-50 text-${cat?.color || 'slate'}-500`}>
                                                <FontAwesomeIcon icon={Icon} className="text-sm" />
                                            </div>
                                        </div>
                                        {canEdit && (
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={e => { e.stopPropagation(); openEditModal(item) }}
                                                    className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center hover:bg-indigo-500/20 transition-all">
                                                    <FontAwesomeIcon icon={faEdit} className="text-[9px]" />
                                                </button>
                                                <button onClick={e => { e.stopPropagation(); handleDeleteClick(item) }}
                                                    className="w-7 h-7 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500/20 transition-all">
                                                    <FontAwesomeIcon icon={faTrash} className="text-[9px]" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <h3 className="text-[12px] font-black text-[var(--color-text)] mb-1 truncate">{item.item_name}</h3>
                                    <p className="text-[9px] text-[var(--color-text-muted)] mb-3">{cat?.label || 'Lainnya'}</p>
                                    <div className="flex items-center gap-2">
                                        <ConditionBadge item={item} />
                                    </div>
                                    {item.notes && <p className="text-[9px] text-[var(--color-text-muted)] mt-2 truncate">{item.notes}</p>}
                                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--color-border)]/50">
                                        <span className="text-[9px] text-[var(--color-text-muted)]">{formatRelativeDate(item.last_checked_at)}</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[9px] font-black text-[var(--color-text)]">{item.total_quantity || 0} unit</span>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                ) : (
                    /* ── Table View ── */
                    <div className="overflow-x-auto rounded-2xl border border-[var(--color-border)] fade-in animate-in duration-300">
                        <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 800 }}>
                            <thead>
                                <tr className="bg-[var(--color-surface-alt)] border-b border-[var(--color-border)]">
                                    <th className="text-center px-3 py-3 w-10">
                                        <button onClick={toggleSelectAll} className="flex items-center justify-center">
                                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${allSelected ? 'bg-[var(--color-primary)] border-[var(--color-primary)]' : someSelected ? 'bg-[var(--color-primary)]/20 border-[var(--color-primary)]' : 'border-[var(--color-border)] bg-white'}`}>
                                                {allSelected && <FontAwesomeIcon icon={faCheck} className="text-[7px] text-white" />}
                                                {someSelected && !allSelected && <div className="w-2 h-0.5 bg-[var(--color-primary)] rounded" />}
                                            </div>
                                        </button>
                                    </th>
                                    <th className="text-left px-4 py-3 text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Item</th>
                                    <th className="text-center px-3 py-3 text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Total</th>
                                    <th className="text-center px-3 py-3 text-[9px] font-black uppercase tracking-widest text-emerald-600">Baik</th>
                                    <th className="text-center px-3 py-3 text-[9px] font-black uppercase tracking-widest text-red-600">Rusak</th>
                                    <th className="text-center px-4 py-3 text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Kondisi</th>
                                    <th className="text-left px-4 py-3 text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Catatan</th>
                                    <th className="text-center px-3 py-3 text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item, idx) => {
                                    const cat = CATEGORIES.find(c => c.id === categorizeItem(item.item_name))
                                    const Icon = CATEGORY_ICONS[cat?.id] || faBox
                                    const isSelected = selectedIds.has(item.id)
                                    return (
                                        <tr key={item.id}
                                            className={`border-b border-[var(--color-border)] transition-all cursor-pointer ${isSelected ? 'bg-[var(--color-primary)]/5' : idx % 2 === 0 ? 'bg-[var(--color-surface)]' : 'bg-[var(--color-surface-alt)]/20'} hover:bg-[var(--color-primary)]/5`}
                                            onClick={() => openDetail(item)}>
                                            <td className="text-center px-3 py-3">
                                                <button onClick={e => { e.stopPropagation(); toggleSelect(item.id) }}>
                                                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all mx-auto ${isSelected ? 'bg-[var(--color-primary)] border-[var(--color-primary)]' : 'border-[var(--color-border)] bg-white'}`}>
                                                        {isSelected && <FontAwesomeIcon icon={faCheck} className="text-[7px] text-white" />}
                                                    </div>
                                                </button>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-${cat?.color || 'slate'}-50 text-${cat?.color || 'slate'}-500 shrink-0`}>
                                                        <FontAwesomeIcon icon={Icon} className="text-xs" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-[11px] font-black text-[var(--color-text)] truncate">{item.item_name}</p>
                                                        <p className="text-[8px] text-[var(--color-text-muted)] font-bold">{cat?.label || 'Lainnya'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="text-center px-3 py-3">
                                                <span className="text-[11px] font-black text-[var(--color-text)]">{item.total_quantity || 0}</span>
                                            </td>
                                            <td className="text-center px-3 py-3">
                                                <span className="inline-flex items-center justify-center min-w-[28px] h-6 px-2 rounded-lg bg-emerald-500/10 text-emerald-600 text-[10px] font-black">
                                                    {item.good_condition_count || 0}
                                                </span>
                                            </td>
                                            <td className="text-center px-3 py-3">
                                                <span className={`inline-flex items-center justify-center min-w-[28px] h-6 px-2 rounded-lg text-[10px] font-black ${(item.damaged_condition_count || 0) > 0 ? 'bg-red-500/10 text-red-600' : 'bg-gray-100 text-gray-400'}`}>
                                                    {item.damaged_condition_count || 0}
                                                </span>
                                            </td>
                                            <td className="text-center px-4 py-3">
                                                <ConditionBadge item={item} />
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-[10px] text-[var(--color-text-muted)] truncate block max-w-[180px]">{item.notes || '—'}</span>
                                            </td>
                                            <td className="text-center px-3 py-3">
                                                <div className="flex items-center justify-center gap-1">
                                                    {canEdit && (
                                                        <>
                                                            <button onClick={e => { e.stopPropagation(); openEditModal(item) }}
                                                                className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 flex items-center justify-center hover:bg-indigo-500/20 transition-all" title="Edit">
                                                                <FontAwesomeIcon icon={faEdit} className="text-[9px]" />
                                                            </button>
                                                            <button onClick={e => { e.stopPropagation(); handleDeleteClick(item) }}
                                                                className="w-7 h-7 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center hover:bg-red-500/20 transition-all" title="Hapus">
                                                                <FontAwesomeIcon icon={faTrash} className="text-[9px]" />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Bulk Action Bar */}
            <BulkActionBar count={selectedIds.size} onDelete={handleBulkDelete} onExport={() => setIsExportOpen(true)} onClear={clearSelection} canEdit={canEdit} />

            {/* Modals */}
            <ItemFormModal isOpen={isModalOpen} onClose={closeModal} onSave={handleSave} editingItem={editingItem} submitting={submitting} formDataRef={formDataRef} />
            <DetailDrawer item={selectedItem} isOpen={isDetailOpen} onClose={closeDetail} onEdit={openEditModal} canEdit={canEdit} />
            <ExportModal isOpen={isExportOpen} onClose={() => setIsExportOpen(false)} onExport={exportData} totalFiltered={items.length} totalSelected={selectedIds.size} />

            {/* Delete Confirm */}
            <Modal isOpen={isDeleteOpen} onClose={() => { setIsDeleteOpen(false); setDeleteTarget(null) }} title="Hapus Item"
                icon={faTriangleExclamation} iconBg="bg-red-500/10" iconColor="text-red-500" size="sm" mobileVariant="bottom-sheet"
                footer={
                    <div className="flex items-center w-full gap-3">
                        <button onClick={() => { setIsDeleteOpen(false); setDeleteTarget(null) }}
                            className="h-10 px-5 rounded-xl border border-[var(--color-border)] text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] transition-all">Batal</button>
                        <div className="flex-1" />
                        <button onClick={confirmDelete} disabled={submitting}
                            className="h-10 px-6 rounded-xl bg-red-500 hover:bg-red-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-500/20 transition-all flex items-center gap-2 disabled:opacity-50">
                            {submitting ? <FontAwesomeIcon icon={faSpinner} className="animate-spin text-xs" /> : <FontAwesomeIcon icon={faTrash} className="text-xs" />}
                            Hapus
                        </button>
                    </div>
                }>
                <p className="text-[11px] text-[var(--color-text)]">Yakin ingin menghapus <span className="font-black">"{deleteTarget?.item_name}"</span>? Tindakan ini tidak dapat dibatalkan.</p>
            </Modal>
        </DashboardLayout>
    )
}
