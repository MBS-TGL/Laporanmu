import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import {
    Plus, Search, X, Loader2, Shield, Gavel, Trophy, Sliders,
    Trash2, Eye, EyeOff, Download, Archive, RotateCcw, Keyboard,
    Check, AlertTriangle, AlertCircle, Info, Edit2, Layers,
    GraduationCap, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight,
    Ban, MoreHorizontal
} from 'lucide-react'
import Modal from '@shared/components/Modal'
import ConfirmDialog from '@shared/components/ConfirmDialog'
import RichSelect from '@shared/components/RichSelect'
import Pagination from '@shared/components/Pagination'
const LazyRulesExportModal = React.lazy(() => import('./modals/RulesExportModal'))
import { StatCard, EmptyState } from '@shared/components/DataDisplay'
import { useToast } from '@context/Toast'
import { useAuth } from '@context/Auth'
import { useFlag } from '@context/FeatureFlags'
import { useLanguage } from '@context/Language'
import { supabase } from '@lib/supabase'
import { logAudit } from '@utils/auditLogger'

import { buildPrintHTML, openPrintWindow } from '@utils/printTemplate'

const CATEGORIES = ['Kedisiplinan', 'Akademik', 'Tata Tertib', 'Sikap', 'Prestasi', 'Lainnya']
const LS_COLS = 'Poin_columns'
const LS_PAGE_SIZE = 'Poin_page_size'

export default function PointRulesTab({ showStats = true, initialPoin = [], initialClasses = [] }) {
    const { addToast } = useToast()
    const { profile } = useAuth()
    const { enabled: teacherPoinEnabled } = useFlag('access.teacher_poin')
    const { enabled: canViolation } = useFlag('module.pelanggaran')
    const { enabled: canAchievement } = useFlag('module.prestasi')

    const { t, tNum, dir, language } = useLanguage()
    const tp = useCallback((key, params) => t(`behavior.${key}`, params), [t])

    const getCategoryLabel = useCallback((cat) => {
        if (!cat || cat === 'undefined') return tp('cat.Lainnya') || 'Lainnya'
        const translated = tp(`cat.${cat}`)
        if (translated && translated.toUpperCase().startsWith('BEHAVIOR.CAT.')) return cat
        return translated
    }, [tp])

    const canEdit = profile?.role === 'guru' ? teacherPoinEnabled : true

    const renderCard = (v) => {
        const isExpanded = expandedCardId === v.id
        return (
            <div key={v.id} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden shadow-sm transition-all duration-200">
                <div className="p-3.5 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                        {/* Icon container */}
                        <div className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 border mt-0.5 ${
                            v.is_negative 
                                ? 'bg-red-50/70 dark:bg-red-500/10 text-red-500 border-red-500/10' 
                                : 'bg-emerald-50/70 dark:bg-emerald-500/10 text-emerald-500 border-emerald-500/10'
                        }`}>
                            {v.is_negative ? <Ban className="w-4 h-4" /> : <Trophy className="w-4 h-4" />}
                        </div>
                        {/* Title & metadata info */}
                        <div className="min-w-0">
                            <h4 className="text-[13px] font-black text-[var(--color-text)] leading-snug break-words">{v.name}</h4>
                            <div className="flex items-center gap-1.5 mt-1">
                                <span className={`px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider ${
                                    v.is_negative 
                                        ? 'bg-red-500/10 text-red-500' 
                                        : 'bg-emerald-500/10 text-emerald-500'
                                }`}>
                                    {v.is_negative ? tp('violation') : tp('achievement')}
                                </span>
                                <span className="text-[10px] text-[var(--color-text-muted)] font-bold truncate">
                                    · {getCategoryLabel(v.category)}
                                </span>
                            </div>
                        </div>
                    </div>
                    {/* Points & Action Button */}
                    <div className="flex items-center gap-2 shrink-0 mt-0.5">
                        <div className={`px-2.5 py-1 rounded-xl text-[10px] font-black ${
                            v.is_negative 
                                ? 'bg-red-500/10 text-red-500' 
                                : 'bg-emerald-500/10 text-emerald-500'
                        }`}>
                            {isPrivacyMode ? '***' : `${v.points > 0 ? '+' : ''}${v.points}`}
                        </div>
                        {canEdit && (
                            <button
                                onClick={() => setExpandedCardId(isExpanded ? null : v.id)}
                                className={`w-8 h-8 rounded-xl border flex items-center justify-center transition-all active:scale-95 ${
                                    isExpanded 
                                        ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-sm shadow-[var(--color-primary)]/10' 
                                        : 'bg-[var(--color-surface-alt)]/50 border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] hover:text-[var(--color-text)]'
                                }`}
                            >
                                <MoreHorizontal className="w-4.5 h-4.5" />
                            </button>
                        )}
                    </div>
                </div>

                {v.description && (
                    <p className="text-[10px] font-semibold text-[var(--color-text-muted)]/75 leading-relaxed px-3.5 pb-3.5 -mt-1 pl-[48px]">
                        {v.description}
                    </p>
                )}

                {/* Collapsible Action Buttons drawer */}
                {isExpanded && canEdit && (
                    <div className="flex border-t border-[var(--color-border)] bg-[var(--color-surface-alt)]/20 animate-in slide-in-from-top-2 duration-150">
                        <button
                            onClick={() => handleEdit(v)}
                            className="flex-1 py-2.5 flex items-center justify-center gap-2 border-r border-[var(--color-border)] text-xs font-bold text-[var(--color-text)] hover:bg-[var(--color-surface-alt)]/50 transition-all"
                        >
                            <Edit2 className="w-3.5 h-3.5 opacity-70" />
                            <span>{tp('edit')}</span>
                        </button>
                        <button
                            onClick={() => { setItemToDelete(v); setIsDeleteModalOpen(true) }}
                            className="flex-1 py-2.5 flex items-center justify-center gap-2 text-xs font-bold text-rose-500 hover:bg-rose-500/[0.03] transition-all"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>{tp('delete')}</span>
                        </button>
                    </div>
                )}
            </div>
        )
    }

    const [poin, setPoin] = useState(initialPoin)
    const [loading, setLoading] = useState(!initialPoin || initialPoin.length === 0)
    const [submitting, setSubmitting] = useState(false)

    // Stats
    const [stats, setStats] = useState({ total: 0, poin: 0, achievements: 0, avgPoints: 0 })

    // UI states
    const [searchQuery, setSearchQuery] = useState('')
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')
    const [filterCategory, setFilterCategory] = useState('')
    const [filterType, setFilterType] = useState('') // 'violation' or 'achievement'
    const [filterStatus, setFilterStatus] = useState('active')
    const [sortBy, setSortBy] = useState('name')
    const [isFilterOpen, setIsFilterOpen] = useState(false)
    const [filterExtreme, setFilterExtreme] = useState(false) // Points >= 20

    // Privasi Mode
    const [isPrivacyMode, setIsPrivacyMode] = useState(false)
    const [isShortcutOpen, setIsShortcutOpen] = useState(false)
    const shortcutRef = useRef(null)

    // Pagination
    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(() => {
        try { return Number(localStorage.getItem(LS_PAGE_SIZE)) || 10 } catch { return 10 }
    })
    const [jumpPage, setJumpPage] = useState('')

    // Refs
    const searchInputRef = useRef(null)
    const colMenuRef = useRef(null)

    // Selection
    const [selectedIds, setSelectedIds] = useState([])

    // Modals
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
    const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false)
    const [isExportModalOpen, setIsExportModalOpen] = useState(false)
    const [selectedItem, setSelectedItem] = useState(null)
    const [expandedCardId, setExpandedCardId] = useState(null)
    const [formCategory, setFormCategory] = useState('Kedisiplinan')
    const [formStatus, setFormStatus] = useState('active')

    useEffect(() => {
        if (isModalOpen) {
            setFormCategory(selectedItem?.category || 'Kedisiplinan')
            setFormStatus(selectedItem?.status || 'active')
        }
    }, [isModalOpen, selectedItem])

    const [itemToDelete, setItemToDelete] = useState(null)
    const [exporting, setExporting] = useState(false)
    const [exportScope, setExportScope] = useState('filtered')
    const [exportColumns, setExportColumns] = useState(['name', 'type', 'category', 'points', 'status', 'description'])

    // Columns
    const defaultCols = { description: true, type: true, category: true, points: true, status: true }
    const [visibleCols, setVisibleCols] = useState(() => {
        try { return JSON.parse(localStorage.getItem(LS_COLS)) || defaultCols }
        catch { return defaultCols }
    })

    const [isColMenuOpen, setIsColMenuOpen] = useState(false)
    const [menuPos, setMenuPos] = useState({ top: 0, right: 0, showUp: false })

    useEffect(() => {
        if (!isColMenuOpen) return
        const handleScroll = () => setIsColMenuOpen(false)
        window.addEventListener('scroll', handleScroll, { capture: true, passive: true })
        return () => window.removeEventListener('scroll', handleScroll, { capture: true })
    }, [isColMenuOpen])

    // Reset Poin States
    const [isResetModalOpen, setIsResetModalOpen] = useState(false)
    const [resetPointsClassIds, setResetPointsClassIds] = useState([])
    const [classesList, setClassesList] = useState(initialClasses)
    const [resettingPoints, setResettingPoints] = useState(false)
    const [resetPointsSearch, setResetPointsSearch] = useState('')
    const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false)
    const [confirmText, setConfirmText] = useState('')

    const [hasOpenedForm, setHasOpenedForm] = useState(false)
    const [hasOpenedDelete, setHasOpenedDelete] = useState(false)
    const [hasOpenedBulkDelete, setHasOpenedBulkDelete] = useState(false)
    const [hasOpenedExport, setHasOpenedExport] = useState(false)
    const [hasOpenedReset, setHasOpenedReset] = useState(false)
    const [hasOpenedResetConfirm, setHasOpenedResetConfirm] = useState(false)

    useEffect(() => { if (isModalOpen) setHasOpenedForm(true) }, [isModalOpen])
    useEffect(() => { if (isDeleteModalOpen) setHasOpenedDelete(true) }, [isDeleteModalOpen])
    useEffect(() => { if (isBulkDeleteOpen) setHasOpenedBulkDelete(true) }, [isBulkDeleteOpen])
    useEffect(() => { if (isExportModalOpen) setHasOpenedExport(true) }, [isExportModalOpen])
    useEffect(() => { if (isResetModalOpen) setHasOpenedReset(true) }, [isResetModalOpen])
    useEffect(() => { if (isResetConfirmOpen) setHasOpenedResetConfirm(true) }, [isResetConfirmOpen])

    // Sync state with parent props when they load
    useEffect(() => {
        if (initialPoin && initialPoin.length > 0) {
            setPoin(initialPoin)
            setLoading(false)
        }
    }, [initialPoin])

    useEffect(() => {
        if (initialClasses && initialClasses.length > 0) {
            setClassesList(initialClasses)
        }
    }, [initialClasses])

    // Derive statistics automatically when point rules change
    useEffect(() => {
        const s = {
            total: poin.length,
            poin: poin.filter(v => v.is_negative).length,
            achievements: poin.filter(v => !v.is_negative).length,
            avgPoints: poin.length ? Math.round(poin.reduce((acc, v) => acc + Math.abs(v.points), 0) / poin.length) : 0
        }
        setStats(s)
    }, [poin])

    // ── DATA FETCHING ──────────────────────────────────────────────
    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase.from('point_rules').select('*').order('name')
            if (error) throw error
            if (data) {
                const filtered = data.filter(v => {
                    if (v.is_negative) return canViolation
                    return canAchievement
                })
                setPoin(filtered)
            }
        } catch (err) {
            console.error(err)
            addToast(tp('rulesToastMetaLoadError'), 'error')
        } finally {
            setLoading(false)
        }
    }, [addToast, canViolation, canAchievement])

    const fetchDataRef = useRef(fetchData)
    useEffect(() => { fetchDataRef.current = fetchData }, [fetchData])

    useEffect(() => {
        if (!initialPoin || initialPoin.length === 0) {
            fetchData()
        }
        const ch = supabase.channel('violation-types-rt')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'point_rules' }, () => fetchDataRef.current?.())
            .subscribe()

        // Fetch classes for reset modal
        if (!initialClasses || initialClasses.length === 0) {
            const fetchClasses = async () => {
                const { data } = await supabase.from('classes').select('*').order('name')
                if (data) setClassesList(data)
            }
            fetchClasses()
        }

        return () => {
            supabase.removeChannel(ch)
        }
    }, [fetchData, initialPoin, initialClasses])

    // ── UI EFFECTS ─────────────────────────────────────────────────
    useEffect(() => {
        if (!searchQuery) {
            setDebouncedSearchQuery('')
            return
        }
        const timer = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery)
        }, 300)
        return () => clearTimeout(timer)
    }, [searchQuery])

    useEffect(() => { localStorage.setItem(LS_COLS, JSON.stringify(visibleCols)) }, [visibleCols])
    useEffect(() => { localStorage.setItem(LS_PAGE_SIZE, pageSize) }, [pageSize])

    const isAnyModalOpen = isModalOpen || isDeleteModalOpen || isBulkDeleteOpen || isExportModalOpen || isResetModalOpen || isResetConfirmOpen

    // Active Filter Count
    const activeFilterCount = (filterCategory ? 1 : 0) + (filterType ? 1 : 0) + (filterStatus !== 'active' ? 1 : 0) + (filterExtreme ? 1 : 0)
    const resetAllFilters = () => {
        setSearchQuery('')
        setFilterCategory('')
        setFilterType('')
        setFilterStatus('active')
        setFilterExtreme(false)
        setPage(1)
    }

    // Click Outside
    useEffect(() => {
        const handler = (e) => {
            if (shortcutRef.current && !shortcutRef.current.contains(e.target)) setIsShortcutOpen(false)
            if (colMenuRef.current && !colMenuRef.current.contains(e.target)) setIsColMenuOpen(false)
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    const handleAdd = () => { setSelectedItem(null); setIsModalOpen(true) }
    const handleEdit = item => { setSelectedItem(item); setIsModalOpen(true) }

    const filteredResetClasses = useMemo(() => {
        return [...classesList]
            .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }))
            .filter(c => c.name.toLowerCase().includes(resetPointsSearch.toLowerCase()))
    }, [classesList, resetPointsSearch])

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (isAnyModalOpen) return
            // Jangan aktifkan shortcut saat user sedang mengetik di input/textarea/select
            const tag = document.activeElement?.tagName
            const isEditing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || document.activeElement?.isContentEditable
            if (isEditing && !(e.ctrlKey && e.key === 'k')) return

            if (e.ctrlKey && e.key === 'k') { e.preventDefault(); searchInputRef.current?.focus() }
            if (e.key === '?') { e.preventDefault(); setIsShortcutOpen(v => !v) }
            if (e.key === 'n') { e.preventDefault(); handleAdd() }
            if (e.key === 'p') { e.preventDefault(); setIsPrivacyMode(v => !v) }
            if (e.key === 'r') { e.preventDefault(); fetchData() }
            if (e.key === 'x') { e.preventDefault(); resetAllFilters() }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isAnyModalOpen, fetchData])

    // Filter & Sort Logic
    const filteredPoin = useMemo(() => {
        let result = poin.filter(v => {
            const q = debouncedSearchQuery.toLowerCase()
            const matchSearch = !q || v.name.toLowerCase().includes(q) || (v.description || '').toLowerCase().includes(q)
            const matchCat = !filterCategory || v.category === filterCategory
            const matchType = !filterType || (filterType === 'violation' ? v.is_negative : !v.is_negative)
            const matchStatus = !filterStatus || v.status === filterStatus
            const matchExtreme = !filterExtreme || Math.abs(v.points) >= 20
            return matchSearch && matchCat && matchType && matchStatus && matchExtreme
        })
        if (sortBy === 'name') result.sort((a, b) => a.name.localeCompare(b.name))
        else if (sortBy === 'points') result.sort((a, b) => Math.abs(b.points) - Math.abs(a.points))
        else if (sortBy === 'newest') result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        return result
    }, [poin, debouncedSearchQuery, filterCategory, filterType, filterStatus, filterExtreme, sortBy])

    const totalRows = filteredPoin.length
    const pagedPoin = filteredPoin.slice((page - 1) * pageSize, page * pageSize)

    useEffect(() => { setPage(1) }, [debouncedSearchQuery, filterCategory, filterType, filterStatus, filterExtreme])

    // Insights Row
    const insights = useMemo(() => {
        const res = []
        const extremeCount = poin.filter(v => Math.abs(v.points) >= 20).length
        if (extremeCount > 0) res.push({
            id: 'extreme',
            label: tp('rulesExtremeInsight', { count: extremeCount }),
            desc: tp('rulesExtremeInsightDesc'),
            icon: AlertTriangle,
            color: 'text-amber-500',
            bg: 'bg-amber-500/10',
            active: filterExtreme,
            onClick: () => { setFilterExtreme(!filterExtreme); setIsFilterOpen(true) }
        })

        const inactiveCount = poin.filter(v => v.status === 'inactive').length
        if (inactiveCount > 0) res.push({
            id: 'archived',
            label: tp('rulesInactiveInsight', { count: inactiveCount }),
            desc: tp('rulesInactiveInsightDesc'),
            icon: Archive,
            color: 'text-gray-500',
            bg: 'bg-gray-500/10',
            active: filterStatus === 'inactive',
            onClick: () => { setFilterStatus(filterStatus === 'inactive' ? 'active' : 'inactive'); setIsFilterOpen(true) }
        })

        return res
    }, [poin, filterExtreme, filterStatus])

    // Handlers
    const handleSubmit = async (formData) => {
        setSubmitting(true)
        try {
            const payload = {
                name: formData.name,
                points: formData.is_negative ? -Math.abs(formData.points) : Math.abs(formData.points),
                category: formData.category,
                is_negative: formData.is_negative,
                description: formData.description,
                status: formData.status
            }
            if (selectedItem) {
                const { error } = await supabase.from('point_rules').update(payload).eq('id', selectedItem.id)
                if (error) throw error
                addToast(tp('rulesToastUpdateSuccess'), 'success')
                await logAudit({ action: 'UPDATE', source: 'SYSTEM', tableName: 'point_rules', recordId: selectedItem.id, oldData: selectedItem, newData: { ...selectedItem, ...payload } })
            } else {
                const { data: insData, error } = await supabase.from('point_rules').insert(payload).select().single()
                if (error) throw error
                addToast(tp('rulesToastCreateSuccess'), 'success')
                await logAudit({ action: 'INSERT', source: 'SYSTEM', tableName: 'point_rules', recordId: insData?.id, newData: payload })
            }
            setIsModalOpen(false)
            fetchData()
        } catch (err) { addToast(err.message || tp('rulesToastSaveError'), 'error') }
        finally { setSubmitting(false) }
    }

    const handleDeleteConfirm = async () => {
        if (!itemToDelete) return
        setSubmitting(true)
        try {
            const { error } = await supabase.from('point_rules').delete().eq('id', itemToDelete.id)
            if (error) throw error
            addToast(tp('rulesToastDeleteSuccess'), 'success')
            await logAudit({ action: 'DELETE', source: 'SYSTEM', tableName: 'point_rules', recordId: itemToDelete.id, oldData: itemToDelete })
            setIsDeleteModalOpen(false)
            fetchData()
        } catch { addToast(tp('rulesToastDeleteError'), 'error') }
        finally { setSubmitting(false) }
    }

    const handleBulkDelete = async () => {
        setSubmitting(true)
        try {
            const idsSnap = [...selectedIds]
            const { error } = await supabase.from('point_rules').delete().in('id', idsSnap)
            if (error) throw error
            addToast(tp('rulesToastBulkDeleteSuccess', { count: idsSnap.length }), 'success')
            await logAudit({ action: 'DELETE', source: 'SYSTEM', tableName: 'point_rules', oldData: { bulk: true, count: idsSnap.length, ids: idsSnap } })
            setSelectedIds([])
            setIsBulkDeleteOpen(false)
            fetchData()
        } catch { addToast(tp('rulesToastDeleteError'), 'error') }
        finally { setSubmitting(false) }
    }

    const handleBatchResetPoints = async () => {
        setResettingPoints(true)
        try {
            const isAllSelected = resetPointsClassIds.length === classesList.length
            let query = supabase.from('students').update({ total_points: 0 }).is('deleted_at', null)
            if (!isAllSelected) {
                query = query.in('class_id', resetPointsClassIds)
            }

            const { error } = await query
            if (error) throw error

            const selectedClassNames = classesList
                .filter(c => resetPointsClassIds.includes(c.id))
                .map(c => c.name)
                .join(', ')

            await logAudit({
                action: 'UPDATE',
                source: 'SYSTEM',
                tableName: 'students',
                newData: {
                    batch_reset_points: true,
                    class_ids: isAllSelected ? 'all' : resetPointsClassIds,
                    description: `Reset poin siswa ke 0 untuk ${isAllSelected ? 'semua kelas' : `${resetPointsClassIds.length} kelas: ${selectedClassNames}`}`
                }
            })

            addToast(tp('rulesToastResetSuccess'), 'success')
            setIsResetConfirmOpen(false)
            setConfirmText('')
        } catch (err) {
            console.error(err)
            addToast(tp('rulesToastResetError'), 'error')
        } finally {
            setResettingPoints(false)
        }
    }

    const handleCancelConfirm = () => {
        setIsResetConfirmOpen(false)
        setIsResetModalOpen(true)
        setConfirmText('')
    }

    const toggleSelect = id => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
    const toggleSelectAll = () => {
        const ids = pagedPoin.map(v => v.id)
        setSelectedIds(prev => ids.every(id => prev.includes(id)) ? prev.filter(id => !ids.includes(id)) : [...new Set([...prev, ...ids])])
    }
    const allSelected = pagedPoin.length > 0 && pagedPoin.every(v => selectedIds.includes(v.id))

    // Points Badge Helper
    const getPointStyle = (val) => {
        const abs = Math.abs(val)
        if (val > 0) return 'bg-emerald-500 shadow-emerald-500/30'
        if (abs >= 20) return 'bg-red-600 shadow-red-600/30'
        if (abs >= 10) return 'bg-orange-500 shadow-orange-500/30'
        return 'bg-amber-500 shadow-amber-500/30'
    }

    // Export Logic
    const handleExport = async (format, fileName, options = {}) => {
        setExporting(true)
        try {
            let q = supabase.from('point_rules').select('*').order('name')
            if (exportScope === 'selected') {
                q = q.in('id', selectedIds)
            } else if (exportScope === 'filtered') {
                q = q.in('id', filteredPoin.map(x => x.id))
            }
            const { data, error } = await q
            if (error) throw error
            const mapped = (data || []).map(v => {
                const row = {}
                if (exportColumns.includes('name')) row[tp('rulesFieldName')] = v.name
                if (exportColumns.includes('type')) row[tp('rulesColTypePreset')] = v.is_negative ? tp('rulesFieldTypeViolation') : tp('rulesFieldTypeAchievement')
                if (exportColumns.includes('category')) row[tp('category')] = getCategoryLabel(v.category)
                if (exportColumns.includes('points')) row[tp('rulesColWeightPreset')] = v.points
                if (exportColumns.includes('status')) row[tp('rulesFieldStatus')] = v.status === 'active' ? tp('rulesFieldStatusActive') : tp('rulesFieldStatusInactive')
                if (exportColumns.includes('description')) row[tp('notes')] = v.description || '-'
                return row
            })

            const finalFileName = fileName || `data_poin_${new Date().toISOString().slice(0, 10)}`

            if (format === 'csv') {
                const { default: Papa } = await import('papaparse')
                const csvData = Papa.unparse(mapped, { header: options.includeHeader !== false })
                const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' })
                const link = document.createElement('a')
                link.href = URL.createObjectURL(blob)
                link.setAttribute('download', `${finalFileName}.csv`)
                link.click()
            } else if (format === 'excel') {
                const XLSX = await import('xlsx')
                const ws = XLSX.utils.json_to_sheet(mapped, { skipHeader: options.includeHeader === false })
                const wb = XLSX.utils.book_new()
                XLSX.utils.book_append_sheet(wb, ws, tp('tabRules'))
                XLSX.writeFile(wb, `${finalFileName}.xlsx`)
            } else if (format === 'pdf') {
                const [{ default: jsPDF }, autoTableMod] = await Promise.all([
                    import('jspdf'),
                    import('jspdf-autotable'),
                ])
                const autoTable = autoTableMod.default || autoTableMod
                const doc = new jsPDF({ orientation: options.orientation || 'landscape' })

                const width = doc.internal.pageSize.width
                const height = doc.internal.pageSize.height

                // Draw Letterhead Box Logo
                doc.setFillColor(30, 58, 95) // #1e3a5f
                doc.roundedRect(14, 12, 12, 12, 2, 2, 'F')

                // Draw simple mortarboard cap symbol
                doc.setDrawColor(255, 255, 255)
                doc.setLineWidth(0.4)
                doc.line(16, 17, 20, 15)
                doc.line(20, 15, 24, 17)
                doc.line(24, 17, 20, 19)
                doc.line(20, 19, 16, 17)
                doc.line(18, 18, 18, 20.5)
                doc.line(22, 18, 22, 20.5)
                doc.line(18, 20.5, 22, 20.5)

                // School Name and Subtitle
                doc.setTextColor(30, 58, 95) // #1e3a5f
                doc.setFont('Helvetica', 'bold')
                doc.setFontSize(11)
                doc.text('SMP Muhammadiyah 04 Tanggul', 29, 16)

                doc.setTextColor(85, 85, 85) // #555
                doc.setFont('Helvetica', 'normal')
                doc.setFontSize(8)
                doc.text('Muhammadiyah Boarding School', 29, 20)

                doc.setTextColor(136, 136, 136) // #888
                doc.setFontSize(7.5)
                doc.text('Jln. Pemandian No 88, Tanggul, Jember', 29, 23.5)

                // Right aligned doc badge & date
                const now = new Date()
                const dateLocale = language === 'ar' ? 'ar-SA' : language === 'en' ? 'en-US' : 'id-ID'
                const docNo = `ATR/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String((now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()) % 9999 + 1).padStart(4, '0')}`
                const printDateStr = new Intl.DateTimeFormat(dateLocale, { dateStyle: 'medium', timeStyle: 'short' }).format(now) + ' WIB'

                // Badge rect
                doc.setFillColor(30, 58, 95)
                doc.roundedRect(width - 50, 11, 36, 5, 1, 1, 'F')
                doc.setTextColor(255, 255, 255)
                doc.setFont('Helvetica', 'bold')
                doc.setFontSize(7)
                doc.text('ATURAN POIN', width - 32, 14.5, { align: 'center' })

                doc.setTextColor(85, 85, 85)
                doc.setFont('Helvetica', 'normal')
                doc.setFontSize(8)
                doc.text(`No. Dok: ${docNo}`, width - 14, 20, { align: 'right' })
                doc.setTextColor(170, 170, 170)
                doc.setFontSize(7.5)
                doc.text(`Dicetak: ${printDateStr}`, width - 14, 23.5, { align: 'right' })

                // Blue line
                doc.setDrawColor(30, 58, 95)
                doc.setLineWidth(0.6)
                doc.line(14, 27, width - 14, 27)

                // Title
                doc.setTextColor(26, 26, 26) // #1a1a1a
                doc.setFont('Helvetica', 'bold')
                doc.setFontSize(13)
                doc.text(tp('rulesExportTitle') || 'Konfigurasi Aturan Poin', 14, 34)

                doc.setTextColor(85, 85, 85)
                doc.setFont('Helvetica', 'normal')
                doc.setFontSize(8)
                doc.text('Laporan Konfigurasi Aturan Poin Terdaftar', 14, 38)

                // Total Badge
                doc.setTextColor(30, 58, 95)
                doc.setFont('Helvetica', 'bold')
                doc.setFontSize(18)
                doc.text(String(data.length), width - 14, 35, { align: 'right' })
                doc.setTextColor(170, 170, 170)
                doc.setFontSize(7.5)
                doc.text('TOTAL ATURAN', width - 14, 38.5, { align: 'right' })

                // Stats Cards Y = 42
                const totalViolations = data.filter(v => v.is_negative).length
                const totalAchievements = data.filter(v => !v.is_negative).length
                const avgWeight = data.length ? Math.round(data.reduce((acc, v) => acc + Math.abs(v.points), 0) / data.length) : 0

                const cardGap = 4
                const cardW = (width - 28 - 3 * cardGap) / 4
                const cardH = 15
                const cardY = 42

                const drawCard = (x, title, val, sub, colorRGB) => {
                    doc.setDrawColor(212, 212, 212)
                    doc.setFillColor(255, 255, 255)
                    doc.setLineWidth(0.25)
                    doc.roundedRect(x, cardY, cardW, cardH, 1.5, 1.5, 'FD')

                    // Left color accent bar
                    doc.setFillColor(colorRGB[0], colorRGB[1], colorRGB[2])
                    doc.rect(x, cardY, 1.5, cardH, 'F')

                    // Texts
                    doc.setTextColor(136, 136, 136)
                    doc.setFont('Helvetica', 'bold')
                    doc.setFontSize(7)
                    doc.text(title.toUpperCase(), x + 4, cardY + 4)

                    doc.setTextColor(26, 26, 26)
                    doc.setFont('Helvetica', 'bold')
                    doc.setFontSize(13)
                    doc.text(String(val), x + 4, cardY + 10.5)

                    if (sub) {
                        doc.setTextColor(187, 187, 187)
                        doc.setFont('Helvetica', 'normal')
                        doc.setFontSize(6.5)
                        doc.text(sub, x + 4, cardY + 13.5)
                    }
                }

                drawCard(14, 'Total Aturan', data.length, 'aktif terdaftar', [30, 58, 95])
                drawCard(14 + cardW + cardGap, 'Poin Pelanggaran', totalViolations, 'tipe negatif (-)', [220, 38, 38])
                drawCard(14 + (cardW + cardGap) * 2, 'Poin Prestasi', totalAchievements, 'tipe positif (+)', [16, 185, 129])
                drawCard(14 + (cardW + cardGap) * 3, 'Rata-rata Poin', avgWeight, 'nilai bobot poin', [245, 158, 11])

                // Info Strip Y = 60
                const stripY = 60
                doc.setFillColor(240, 244, 248) // #f0f4f8
                doc.setDrawColor(205, 214, 224) // #cdd6e0
                doc.setLineWidth(0.2)
                doc.roundedRect(14, stripY, width - 28, 6, 1, 1, 'FD')

                const itemGap = (width - 28) / 4
                const scopeLabel = exportScope === 'filtered' ? 'Filter Aktif' : exportScope === 'selected' ? 'Dipilih' : 'Semua'
                const operatorName = profile?.name || 'Sistem Otomatis'

                doc.setTextColor(136, 136, 136)
                doc.setFont('Helvetica', 'normal')
                doc.setFontSize(7.5)

                // Item 1
                doc.text('Jangkauan: ', 18, stripY + 4.2)
                doc.setFont('Helvetica', 'bold')
                doc.setTextColor(26, 26, 26)
                doc.text(scopeLabel, 33, stripY + 4.2)

                // Item 2
                doc.setFont('Helvetica', 'normal')
                doc.setTextColor(136, 136, 136)
                doc.text('Operator: ', 18 + itemGap, stripY + 4.2)
                doc.setFont('Helvetica', 'bold')
                doc.setTextColor(26, 26, 26)
                doc.text(operatorName, 18 + itemGap + 12, stripY + 4.2)

                // Item 3
                doc.setFont('Helvetica', 'normal')
                doc.setTextColor(136, 136, 136)
                doc.text('Status: ', 18 + itemGap * 2, stripY + 4.2)
                doc.setFont('Helvetica', 'bold')
                doc.setTextColor(26, 26, 26)
                doc.text('Aktif', 18 + itemGap * 2 + 10, stripY + 4.2)

                // Item 4
                doc.setFont('Helvetica', 'normal')
                doc.setTextColor(136, 136, 136)
                doc.text('Aplikasi: ', 18 + itemGap * 3, stripY + 4.2)
                doc.setFont('Helvetica', 'bold')
                doc.setTextColor(26, 26, 26)
                doc.text('LaporanMu', 18 + itemGap * 3 + 11, stripY + 4.2)

                const headers = Object.keys(mapped[0] || {})
                const rows = mapped.map(r => headers.map(h => String(r[h] ?? '')))

                autoTable(doc, {
                    head: [headers],
                    body: rows,
                    startY: 69,
                    theme: 'grid',
                    styles: { fontSize: 7.5, cellPadding: 2 },
                    headStyles: { fillColor: [30, 58, 95], textColor: 255, fontStyle: 'bold' },
                    alternateRowStyles: { fillColor: [248, 250, 252] }
                })

                // Signature block
                let finalY = doc.lastAutoTable.finalY + 8
                if (finalY + 30 > height) {
                    doc.addPage()
                    finalY = 20
                }
                doc.setTextColor(136, 136, 136)
                doc.setFont('Helvetica', 'normal')
                doc.setFontSize(7.5)
                doc.text('Mengetahui,', width - 50, finalY)
                doc.setTextColor(30, 58, 95)
                doc.setFont('Helvetica', 'bold')
                doc.setFontSize(8.5)
                doc.text('Kepala Sekolah', width - 50, finalY + 4)

                doc.setDrawColor(200, 200, 200)
                doc.setLineWidth(0.2)
                doc.line(width - 50, finalY + 22, width - 14, finalY + 22)

                const pageCount = doc.internal.getNumberOfPages()
                for (let i = 1; i <= pageCount; i++) {
                    doc.setPage(i)
                    doc.setFontSize(7)
                    doc.setTextColor(150)
                    doc.setFont('Helvetica', 'normal')
                    doc.text('laporanmu.my.id • LaporanMu', 14, height - 8)
                    doc.text(`Halaman ${tNum(i)} dari ${tNum(pageCount)}`, width - 14, height - 8, { align: 'right' })
                }

                doc.save(`${finalFileName}.pdf`)
            } else if (format === 'word') {
                const headers = Object.keys(mapped[0] || {})
                const htmlRows = mapped.map(r => `
                    <tr>
                        ${headers.map(h => `<td style="border: 1px solid #cbd5e1; padding: 8px;">${r[h]}</td>`).join('')}
                    </tr>
                `).join('')

                const htmlContent = `
                    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
                    <head>
                        <title>${tp('rulesExportTitle') || 'Konfigurasi Aturan Poin'}</title>
                        <style>
                            body { font-family: Arial, sans-serif; }
                            table { width: 100%; border-collapse: collapse; }
                            th { border: 1px solid #cbd5e1; background-color: #f8fafc; padding: 8px; text-align: left; font-weight: bold; }
                            td { border: 1px solid #cbd5e1; padding: 8px; }
                        </style>
                    </head>
                    <body>
                        <h2>${tp('rulesExportTitle') || 'Konfigurasi Aturan Poin'}</h2>
                        <table>
                            <thead>
                                <tr>
                                    ${headers.map(h => `<th>${h}</th>`).join('')}
                                </tr>
                            </thead>
                            <tbody>
                                ${htmlRows}
                            </tbody>
                        </table>
                    </body>
                    </html>
                `
                const blob = new Blob(['\ufeff' + htmlContent], { type: 'application/msword' })
                const link = document.createElement('a')
                link.href = URL.createObjectURL(blob)
                link.setAttribute('download', `${finalFileName}.doc`)
                link.click()
            } else if (format === 'print') {
                const totalViolations = data.filter(v => v.is_negative).length
                const totalAchievements = data.filter(v => !v.is_negative).length
                const avgWeight = data.length ? Math.round(data.reduce((acc, v) => acc + Math.abs(v.points), 0) / data.length) : 0

                const headers = Object.keys(mapped[0] || {})
                const tableHeaders = ['#', ...headers]

                const htmlRows = mapped.map((r, i) => {
                    const cells = headers.map(h => {
                        const val = r[h] ?? '-'
                        if (h === tp('rulesColTypePreset')) {
                            const isViolation = val === tp('rulesFieldTypeViolation')
                            const badgeClass = isViolation ? 'tag-visitor guru' : 'tag-visitor santri'
                            return `<td><span class="${badgeClass}">${val}</span></td>`
                        }
                        if (h === tp('rulesFieldStatus')) {
                            const isActive = val === tp('rulesFieldStatusActive')
                            const badgeClass = isActive ? 'tag-status success' : 'tag-status warning'
                            return `<td><span class="${badgeClass}">${val}</span></td>`
                        }
                        if (h === tp('rulesColWeightPreset')) {
                            const points = Number(val)
                            const color = points > 0 ? '#16a34a' : '#dc2626'
                            return `<td style="color:${color};font-weight:700">${points > 0 ? '+' : ''}${tNum(points)}</td>`
                        }
                        return `<td>${val}</td>`
                    }).join('')
                    return `<tr><td>${tNum(i + 1)}</td>${cells}</tr>`
                }).join('')

                const scopeLabel = exportScope === 'filtered' 
                    ? tp('exportScopeFiltered') 
                    : exportScope === 'selected' 
                        ? tp('rulesExportScopeSelected', { count: selectedIds.length }) 
                        : tp('exportScopeAll')
                const operatorValue = profile?.name || (language === 'ar' ? 'نظام تلقائي' : language === 'en' ? 'Automated System' : 'Sistem Otomatis')

                const translatedLabels = {
                    id: {
                        scope: 'Jangkauan',
                        operator: 'Operator',
                        status: 'Status',
                        app: 'Aplikasi',
                        active: 'Aktif',
                        principal: 'Kepala Sekolah',
                        subtitle: 'Laporan Konfigurasi Aturan Poin Terdaftar'
                    },
                    en: {
                        scope: 'Scope',
                        operator: 'Operator',
                        status: 'Status',
                        app: 'Application',
                        active: 'Active',
                        principal: 'School Principal',
                        subtitle: 'Registered Point Rules Configuration Report'
                    },
                    ar: {
                        scope: 'النطاق',
                        operator: 'المشغل',
                        status: 'الحالة',
                        app: 'التطبيق',
                        active: 'نشط',
                        principal: 'مدير المدرسة',
                        subtitle: 'تقرير تكوين قواعد النقاط المسجلة'
                    }
                }
                const tl = translatedLabels[language] || translatedLabels.id

                const htmlContent = buildPrintHTML({
                    language,
                    docBadge: tp('tabRules'),
                    title: tp('rulesExportTitle') || 'Konfigurasi Aturan Poin',
                    subtitle: tl.subtitle,
                    totalCount: data.length,
                    totalLabel: tp('rulesTotal'),
                    stats: [
                        { label: tp('rulesTotal'), value: tNum(data.length), type: 'total', description: tp('rulesTotalSub') },
                        { label: tp('rulesViolations'), value: tNum(totalViolations), type: 'pelanggaran', description: tp('rulesViolationsSub') },
                        { label: tp('rulesAchievements'), value: tNum(totalAchievements), type: 'prestasi', description: tp('rulesAchievementsSub') },
                        { label: tp('rulesAvg'), value: tNum(avgWeight), type: 'avg', description: tp('rulesAvgSub') },
                    ],
                    infoStrip: [
                        { label: tl.scope, value: scopeLabel },
                        { label: tl.operator, value: operatorValue },
                        { label: tl.status, value: tl.active },
                        { label: tl.app, value: 'LaporanMu' }
                    ],
                    tableHeaders,
                    tableRowsHTML: htmlRows,
                    showSignature: true,
                    signatureTitle: tl.principal,
                    signatureName: '',
                    paperSize: options.orientation === 'portrait' ? 'A4 portrait' : 'A4 landscape'
                })

                openPrintWindow(htmlContent)
            }

            await logAudit({
                action: 'EXPORT',
                source: 'OPERATIONAL',
                tableName: 'point_rules',
                newData: {
                    format,
                    scope: exportScope,
                    count: data.length,
                    columns: exportColumns
                }
            })

            addToast(tp('rulesExportSuccess'), 'success')
            setIsExportModalOpen(false)
        } catch (err) {
            console.error(err)
            addToast(tp('rulesExportFailed'), 'error')
        } finally {
            setExporting(false)
        }
    }

    return (
        <div className="space-y-6">
            {/* Read-only Banner */}
            {!canEdit && (
                <div className="px-4 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-2">
                    <EyeOff className="text-rose-500 shrink-0 w-4 h-4" />
                    <p className="text-[11px] font-bold text-rose-600">{tp('rulesReadOnlyBanner')}</p>
                </div>
            )}

            {/* Sub-Header Actions */}
            <div className="glass rounded-[1.5rem] border border-[var(--color-border)] p-4 flex flex-col sm:flex-row items-center justify-between gap-4 bg-[var(--color-surface-alt)]/10">
                <div>
                    <h3 className="text-sm font-black text-[var(--color-text)]">{tp('rulesTitleConfig')}</h3>
                    <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">
                        {tp('rulesSubtitleConfig')}
                    </p>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 justify-end w-full sm:w-auto">
                    {/* Reset Button */}
                    {canEdit && (
                        <button
                            onClick={() => { setResetPointsClassIds(classesList.map(c => c.id)); setIsResetModalOpen(true) }}
                            className="w-9 h-9 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] hover:text-orange-500 hover:border-orange-500/30 flex items-center justify-center transition-all sm:w-auto sm:px-3 sm:gap-2 text-xs font-bold shrink-0"
                            title={tp('rulesResetPointsTitle')}
                        >
                            <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                            <span className="hidden sm:inline">{tp('rulesResetPoints')}</span>
                        </button>
                    )}

                    {/* Export Button */}
                    <button
                        onClick={() => setIsExportModalOpen(true)}
                        className="w-9 h-9 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)]/30 flex items-center justify-center transition-all sm:w-auto sm:px-3 sm:gap-2 text-xs font-bold shrink-0"
                        title={tp('rulesExportTitle')}
                    >
                        <Download className="w-3.5 h-3.5 shrink-0" />
                        <span className="hidden sm:inline">{tp('rulesExport')}</span>
                    </button>

                    {/* Privacy Toggle */}
                    <button
                        onClick={() => {
                            setIsPrivacyMode(!isPrivacyMode)
                        }}
                        className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all sm:w-auto sm:px-3 sm:gap-2 text-xs font-bold shrink-0 ${isPrivacyMode ? 'bg-amber-500/10 border-amber-500/30 text-amber-600' : 'bg-[var(--color-surface-alt)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
                        title={isPrivacyMode ? tp('disablePrivacy') : tp('enablePrivacy')}
                    >
                        {isPrivacyMode ? <EyeOff className="w-3.5 h-3.5 shrink-0" /> : <Eye className="w-3.5 h-3.5 shrink-0" />}
                        <span className="hidden sm:inline">{tp('privacy')}</span>
                    </button>

                    {/* Add Button */}
                    {canEdit && (
                        <button
                            onClick={handleAdd}
                            className="h-9 px-3 rounded-xl bg-[var(--color-primary)] text-white flex items-center justify-center gap-1.5 transition-all hover:scale-[1.02] active:scale-95 shadow-md shadow-[var(--color-primary)]/20 border border-white/10 text-[10px] font-black uppercase tracking-widest whitespace-nowrap flex-1 sm:flex-initial"
                            title={tp('rulesAdd')}
                        >
                            <Plus className="w-3.5 h-3.5 shrink-0" />
                            <span className="sm:hidden">{tp('rulesAdd').split(' ')[0]}</span>
                            <span className="hidden sm:inline">{tp('rulesAdd')}</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Stats Overview */}
            {showStats && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard icon={Shield} label={tp('rulesTotal')} value={stats.total} color="primary" loading={loading} />
                    <StatCard icon={Gavel} label={tp('rulesViolations')} value={stats.poin} color="rose" loading={loading} />
                    <StatCard icon={Trophy} label={tp('rulesAchievements')} value={stats.achievements} color="emerald" loading={loading} />
                    <StatCard icon={Info} label={tp('rulesAvg')} value={stats.avgPoints} color="amber" loading={loading} />
                </div>
            )}


            {/* Filters & Actions */}
            <div className="glass rounded-[1.5rem] border border-[var(--color-border)] overflow-hidden">
                {/* Row 1: Search + Quick Filters + Filter Toggle */}
                <div className="grid grid-cols-[minmax(0,_1fr)_auto] items-center gap-x-2 gap-y-2.5 p-2 xs:p-2.5 lg:flex lg:flex-row lg:items-center lg:gap-0 lg:p-3">

                    {/* Group 1: Search Bar */}
                    <div className="col-start-1 row-start-1 col-span-1 flex-1 w-full min-w-0 lg:min-w-[160px]">
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--color-text-muted)] group-focus-within:text-[var(--color-primary)] transition-colors">
                                <Search className="w-4 h-4" />
                            </div>
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder={tp('rulesSearchPlaceholder')}
                                className="input-field pl-10 w-full h-9 text-xs sm:text-sm bg-[var(--color-surface-alt)]/50 border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/10 transition-all rounded-xl font-bold placeholder:font-normal placeholder:opacity-40"
                            />
                            {searchQuery && (
                                <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-lg hover:bg-[var(--color-surface-alt)] flex items-center justify-center text-[var(--color-text-muted)] transition-all">
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Divider 1 (Desktop only) */}
                    <div className="hidden lg:block w-[1px] h-5 bg-[var(--color-border)] lg:mx-2.5 xl:mx-4 shrink-0" />

                    {/* Group 2: Quick Filter Chips */}
                    <div className="col-start-1 row-start-2 col-span-2 flex flex-nowrap items-center gap-1 pt-2.5 lg:pt-0 shrink-0 w-full lg:w-auto overflow-x-auto scrollbar-hide border-t border-[var(--color-border)] lg:border-t-0">
                        <div className="flex items-center gap-1 w-full lg:w-auto lg:shrink-0 py-0.5">
                            {[
                                { id: '', label: tp('all'), icon: Layers, activeCls: 'bg-[var(--color-primary)] border-[var(--color-primary)]' },
                                { id: 'violation', label: tp('violation'), icon: Gavel, activeCls: 'bg-rose-500 border-rose-500' },
                                { id: 'achievement', label: tp('achievement'), icon: Trophy, activeCls: 'bg-emerald-500 border-emerald-500' },
                            ].map((s) => (
                                <button
                                    key={s.id}
                                    onClick={() => { setFilterType(s.id); setPage(1) }}
                                    className={`flex-1 lg:flex-initial flex items-center justify-center gap-1 lg:gap-2 px-2 lg:px-3 py-1.5 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-normal sm:tracking-widest whitespace-nowrap transition-all border ${
                                        filterType === s.id
                                            ? `${s.activeCls} text-white`
                                            : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)]/30 hover:bg-[var(--color-primary)]/5 hover:text-[var(--color-primary)]'
                                    }`}
                                >
                                    <s.icon className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${filterType === s.id ? 'opacity-100' : 'opacity-30'}`} />
                                    {s.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Divider 2 (Desktop only) */}
                    <div className="hidden lg:block w-[1px] h-5 bg-[var(--color-border)] lg:mx-2.5 xl:mx-4 shrink-0" />

                    {/* Group 3: Action Buttons */}
                    <div className="col-start-2 row-start-1 col-span-1 flex flex-nowrap items-center justify-end gap-1.5 lg:gap-2 shrink-0">
                        {/* Select All */}
                        <button
                            onClick={toggleSelectAll}
                            className={`h-9 px-2.5 lg:px-3 rounded-xl border text-[10px] font-black uppercase tracking-wider lg:tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 ${
                                selectedIds.length > 0
                                    ? 'bg-indigo-500 border-indigo-500 text-white shadow-md shadow-indigo-500/20'
                                    : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]'
                            }`}
                            title={tp('selectAll')}
                        >
                            <Check className="w-3.5 h-3.5" />
                            <span className="hidden xl:inline">{selectedIds.length > 0 ? tp('selected') : tp('selectAll')}</span>
                            {selectedIds.length > 0 && (
                                <span className="w-4 h-4 rounded-full bg-white/20 text-white text-[9px] font-black flex items-center justify-center">
                                    {tNum(selectedIds.length)}
                                </span>
                            )}
                        </button>

                        {/* Advanced Filter Toggle */}
                        <button
                            onClick={() => setIsFilterOpen(!isFilterOpen)}
                            className={`h-9 px-2.5 lg:px-3 rounded-xl border text-[10px] font-black uppercase tracking-wider lg:tracking-widest transition-all flex items-center justify-center gap-2 ${
                                isFilterOpen || activeFilterCount > 0
                                    ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white shadow-md shadow-[var(--color-primary)]/30'
                                    : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]'
                            }`}
                            title={tp('advancedFilter')}
                        >
                            <Sliders className="w-3.5 h-3.5" />
                            <span className="hidden xl:inline">{tp('filterShort')}</span>
                            {activeFilterCount > 0 && (
                                <span className="w-4 h-4 rounded-full bg-white/30 text-white text-[9px] font-black flex items-center justify-center">
                                    {activeFilterCount}
                                </span>
                            )}
                        </button>
                    </div>
                </div>

                {/* Active Filter Chips */}
                {(debouncedSearchQuery || filterCategory || (filterType && filterType !== '') || filterStatus !== 'active' || filterExtreme) && (
                    <div className="px-3 pb-3 -mt-1 flex flex-wrap gap-2">
                        {debouncedSearchQuery && (
                            <button type="button" onClick={() => setSearchQuery('')}
                                className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/40 text-[10px] font-black text-[var(--color-text)]">
                                <Search className="w-3 h-3 opacity-60" />
                                <span className="max-w-[180px] truncate">"{debouncedSearchQuery}"</span>
                                <span className="w-5 h-5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)] group-hover:text-red-500 transition-colors">
                                    <X className="w-3.5 h-3.5" />
                                </span>
                            </button>
                        )}
                        {filterCategory && (
                            <button type="button" onClick={() => setFilterCategory('')}
                                className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/5 text-[10px] font-black text-[var(--color-primary)]">
                                <span className="opacity-70">{tp('category')}:</span> {getCategoryLabel(filterCategory)}
                                <span className="w-5 h-5 rounded-lg bg-white/70 dark:bg-[var(--color-surface)] border border-[var(--color-primary)]/20 flex items-center justify-center text-[var(--color-primary)] opacity-70 group-hover:opacity-100 transition-opacity">
                                    <X className="w-3.5 h-3.5" />
                                </span>
                            </button>
                        )}
                        {filterStatus !== 'active' && (
                            <button type="button" onClick={() => setFilterStatus('active')}
                                className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-amber-500/20 bg-amber-500/10 text-[10px] font-black text-amber-600">
                                {tp('status')}: {filterStatus === 'inactive' ? tp('rulesStatusInactive') : filterStatus}
                                <span className="w-5 h-5 rounded-lg bg-white/70 dark:bg-[var(--color-surface)] border border-amber-500/20 flex items-center justify-center text-amber-600 opacity-70 group-hover:opacity-100 transition-opacity">
                                    <X className="w-3.5 h-3.5" />
                                </span>
                            </button>
                        )}
                        {filterExtreme && (
                            <button type="button" onClick={() => setFilterExtreme(false)}
                                className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-red-500/20 bg-red-500/10 text-[10px] font-black text-red-600">
                                {tp('rulesExtremePoints')}
                                <span className="w-5 h-5 rounded-lg bg-white/70 dark:bg-[var(--color-surface)] border border-red-500/20 flex items-center justify-center text-red-600 opacity-70 group-hover:opacity-100 transition-opacity">
                                    <X className="w-3.5 h-3.5" />
                                </span>
                            </button>
                        )}
                        <button type="button" onClick={resetAllFilters}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-red-500/20 bg-red-500/5 text-[10px] font-black text-red-600">
                            <RotateCcw className="w-3.5 h-3.5" />
                            {tp('resetAllFilters')}
                        </button>
                    </div>
                )}

                {/* Advanced Filter Panel */}
                {isFilterOpen && (
                    <div className="border-t border-[var(--color-border)] p-3.5 bg-[var(--color-surface-alt)]/60 backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="flex items-center justify-between mb-3.5">
                            <div className="flex items-center gap-2.5">
                                <div className="w-1 h-3.5 bg-[var(--color-primary)] rounded-full" />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--color-primary)] flex items-center gap-2">
                                    <Sliders className="w-3 h-3 opacity-60" />
                                    <span className="sm:hidden">{tp('filterShort')}</span>
                                    <span className="hidden sm:inline">{tp('advancedFilter')}</span>
                                </span>
                            </div>
                            <button
                                onClick={resetAllFilters}
                                className="text-[9px] font-black uppercase tracking-widest text-red-500 hover:bg-red-500/5 px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 border border-transparent hover:border-red-500/10"
                            >
                                <RotateCcw className="w-3 h-3" />
                                <span className="sm:hidden">{tp('resetShort')}</span>
                                <span className="hidden sm:inline">{tp('resetAllFilters')}</span>
                            </button>
                        </div>

                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                            <div>
                                <label className="block text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1.5">{tp('category')}</label>
                                <RichSelect
                                    value={filterCategory}
                                    onChange={(val) => { setFilterCategory(val); setPage(1) }}
                                    options={[
                                        { id: '', name: tp('rulesAllCategories') },
                                        ...CATEGORIES.map(c => ({ id: c, name: tp(`cat.${c}`) || c }))
                                    ]}
                                    placeholder={tp('rulesAllCategories')}
                                    small
                                />
                            </div>
                            <div>
                                <label className="block text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1.5">{tp('rulesType')}</label>
                                <RichSelect
                                    value={filterType}
                                    onChange={(val) => { setFilterType(val); setPage(1) }}
                                    options={[
                                        { id: '', name: tp('rulesAllTypes') },
                                        { id: 'violation', name: tp('rulesViolationsOnly') },
                                        { id: 'achievement', name: tp('rulesAchievementsOnly') },
                                    ]}
                                    placeholder={tp('rulesAllTypes')}
                                    small
                                />
                            </div>
                            <div>
                                <label className="block text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1.5">{tp('rulesOrder')}</label>
                                <RichSelect
                                    value={sortBy}
                                    onChange={(val) => { setSortBy(val); setPage(1) }}
                                    options={[
                                        { id: 'name', name: tp('rulesOrderName') },
                                        { id: 'points', name: tp('rulesOrderPoints') },
                                        { id: 'newest', name: `↓ ${tp('newest')}` },
                                    ]}
                                    small
                                />
                            </div>
                            <div className="flex items-end justify-end">
                                <button
                                    onClick={() => setIsFilterOpen(false)}
                                    className="h-9 px-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[9px] font-black uppercase tracking-widest text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] transition-all"
                                >
                                    {tp('closePanel')}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Bulk Action Bar */}
            {selectedIds.length > 0 && (
                <div className="px-4 py-3 rounded-2xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 flex items-center justify-between gap-3 flex-wrap animate-in slide-in-from-top-2">
                    <p className="text-sm font-black text-[var(--color-primary)] tracking-tight">{tp('rulesSelectedCount', { count: selectedIds.length })}</p>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setIsBulkDeleteOpen(true)} className="h-8 px-4 rounded-xl bg-red-500/10 text-red-600 text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all flex items-center gap-2">
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>{tp('delete')}</span>
                        </button>
                        <button onClick={() => setSelectedIds([])} className="h-8 px-4 rounded-xl bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] text-[10px] font-black uppercase tracking-widest hover:text-[var(--color-text)] transition-all flex items-center gap-2">
                            <X className="w-3.5 h-3.5" />
                            <span>{tp('cancel')}</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Main Content Area */}
            <div className="glass rounded-[1.5rem] border border-[var(--color-border)] overflow-hidden mt-4">
                {loading ? (
                    <div className="p-6 space-y-4">
                        <div className="animate-pulse space-y-3">
                            <div className="h-10 bg-[var(--color-surface-alt)] rounded-xl w-full" />
                            {[1, 2, 3, 4, 5].map(idx => (
                                <div key={idx} className="h-16 bg-[var(--color-surface-alt)]/60 rounded-xl w-full" />
                            ))}
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Desktop Table View */}
                        <div className="overflow-x-auto whitespace-nowrap hidden md:block">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-[var(--color-surface-alt)]/50 border-b border-[var(--color-border)]">
                                    <tr>
                                        <th className="px-4 py-3.5 w-10 text-center">
                                            <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} className="w-4 h-4 rounded border-[var(--color-border)] text-[var(--color-primary)] cursor-pointer" />
                                        </th>
                                        <th className="px-4 py-3.5 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">{tp('rulesColIdentity')}</th>
                                        {visibleCols.description && <th className="px-4 py-3.5 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">{tp('rulesColDescription')}</th>}
                                        {visibleCols.type && <th className="px-4 py-3.5 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] text-center w-28">{tp('rulesColType')}</th>}
                                        {visibleCols.category && <th className="px-4 py-3.5 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] text-center w-28">{tp('rulesColCategory')}</th>}
                                        {visibleCols.points && <th className="px-4 py-3.5 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] text-center w-28">{tp('rulesColWeight')}</th>}
                                        <th className="px-4 py-3.5 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] text-center w-28 relative">
                                            <span>{tp('rulesColAction')}</span>
                                            <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                                <button onClick={(e) => {
                                                    const rect = e.currentTarget.getBoundingClientRect()
                                                    const spaceBelow = window.innerHeight - rect.bottom
                                                    const showUp = spaceBelow < 185 && rect.top > 185
                                                    setMenuPos({
                                                        top: showUp ? (rect.top + window.scrollY - 8) : (rect.bottom + window.scrollY + 8),
                                                        right: window.innerWidth - rect.right - window.scrollX,
                                                        showUp
                                                    })
                                                    setIsColMenuOpen(p => !p)
                                                }} title={tp('manageColumns')}
                                                    className={`w-6 h-6 rounded-md flex items-center justify-center transition-all ${isColMenuOpen ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]'}`}>
                                                    <svg width="10" height="10" viewBox="0 0 12 12" fill="currentColor"><rect x="0" y="0" width="5" height="5" rx="1" /><rect x="7" y="0" width="5" height="5" rx="1" /><rect x="0" y="7" width="5" height="5" rx="1" /><rect x="7" y="7" width="5" height="5" rx="1" /></svg>
                                                </button>
                                                {isColMenuOpen && createPortal(
                                                    <div ref={colMenuRef} className="absolute z-[9999] w-44 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl p-2 space-y-0.5 animate-in fade-in zoom-in-95"
                                                        style={{
                                                            top: menuPos.top,
                                                            right: menuPos.right,
                                                            transform: menuPos.showUp ? 'translateY(-100%)' : undefined
                                                        }}>
                                                         <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] px-3 py-2">{tp('manageColumns')}</p>
                                                        {[{ key: 'description', label: tp('rulesColDescription') }, { key: 'type', label: tp('rulesColTypePreset') }, { key: 'category', label: tp('rulesColCategory') }, { key: 'points', label: tp('rulesColWeightPreset') }].map(({ key, label }) => (
                                                            <button key={key} onClick={() => setVisibleCols(p => ({ ...p, [key]: !p[key] }))} className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-[var(--color-surface-alt)] transition-all group text-left">
                                                                <span className="text-[10px] font-bold text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition-colors">{label}</span>
                                                                <div className={`w-7 h-4 rounded-full transition-all flex items-center px-0.5 ${visibleCols[key] ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'}`}>
                                                                    <div className={`w-3 h-3 rounded-full bg-white shadow-sm transition-all ${visibleCols[key] ? 'translate-x-[12px]' : 'translate-x-0'}`} />
                                                                </div>
                                                            </button>
                                                        ))}
                                                    </div>,
                                                    document.body
                                                )}
                                            </div>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--color-border)]">
                                    {totalRows === 0 ? (
                                        <tr>
                                            <td colSpan={10} className="px-6 py-12 text-center align-middle">
                                                <EmptyState
                                                    variant="plain"
                                                    color="slate"
                                                    icon={Search}
                                                    title={tp('rulesNoResults')}
                                                    description={tp('rulesNoResultsDesc')}
                                                    action={
                                                        <button
                                                            onClick={resetAllFilters}
                                                            className="h-9 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest border border-[var(--color-border)] hover:bg-[var(--color-surface-alt)] transition"
                                                        >
                                                            {tp('resetAllFilters')}
                                                        </button>
                                                    }
                                                />
                                            </td>
                                        </tr>
                                    ) : pagedPoin.map(rule => (
                                        <tr key={rule.id} className="hover:bg-[var(--color-surface-alt)]/40 transition-all group">
                                            <td className="px-4 py-3 w-10 text-center">
                                                <input type="checkbox" checked={selectedIds.includes(rule.id)} onChange={() => toggleSelect(rule.id)} className="w-4 h-4 rounded border-[var(--color-border)] text-[var(--color-primary)] cursor-pointer" />
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2.5">
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0 ${rule.is_negative ? 'bg-red-500' : 'bg-emerald-500'}`}>
                                                        {rule.is_negative ? <Gavel className="w-4 h-4" /> : <Trophy className="w-4 h-4" />}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-black text-[var(--color-text)] truncate">{rule.name}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            {visibleCols.description && (
                                                <td className="px-4 py-3">
                                                    <p className="text-[11px] font-bold text-[var(--color-text-muted)] line-clamp-1 max-w-xs">{rule.description || '—'}</p>
                                                </td>
                                            )}
                                            {visibleCols.type && (
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-wider border ${rule.is_negative ? 'bg-red-500/10 border-red-500/20 text-red-600' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600'}`}>
                                                        {rule.is_negative ? tp('violation') : tp('achievement')}
                                                    </span>
                                                </td>
                                            )}
                                            {visibleCols.category && (
                                                <td className="px-4 py-3 text-center">
                                                    <span className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest">{getCategoryLabel(rule.category)}</span>
                                                </td>
                                            )}
                                            {visibleCols.points && (
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`inline-flex items-center justify-center min-w-[40px] px-2 py-0.5 rounded-full text-[11px] font-black border ${
                                                        rule.points > 0 ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-red-500/10 text-red-600 border-red-500/20'
                                                    }`}>
                                                        {isPrivacyMode ? '***' : `${rule.points > 0 ? '+' : ''}${tNum(rule.points)}`}
                                                    </span>
                                                </td>
                                            )}
                                            <td className="px-4 py-3 text-center whitespace-nowrap">
                                                <div className="flex items-center justify-center gap-1">
                                                    {canEdit && (
                                                        <button
                                                            onClick={() => handleEdit(rule)}
                                                            className="w-7 h-7 flex items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 transition-all"
                                                            title={tp('edit')}
                                                        >
                                                            <Edit2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                    {canEdit && (
                                                        <button
                                                            onClick={() => { setItemToDelete(rule); setIsDeleteModalOpen(true) }}
                                                            className="w-7 h-7 flex items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:text-red-500 hover:bg-red-500/5 transition-all"
                                                            title={tp('delete')}
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Stack View */}
                        <div className="md:hidden p-3.5 xs:p-4 bg-[var(--color-surface-alt)]/30 border-b border-[var(--color-border)]">
                            {totalRows === 0 ? (
                                <div className="py-10 px-4 bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)]">
                                    <EmptyState
                                        variant="plain"
                                        color="slate"
                                        icon={Search}
                                        title={tp('rulesNoResults')}
                                        description={tp('rulesNoResultsDescMobile') || tp('rulesNoResultsDesc')}
                                        action={
                                            <button
                                                onClick={resetAllFilters}
                                                className="h-8 px-3 rounded-lg text-[9px] font-black uppercase tracking-widest border border-[var(--color-border)] hover:bg-[var(--color-surface-alt)] transition"
                                            >
                                                {tp('resetAll')}
                                            </button>
                                        }
                                    />
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {/* Violations Section */}
                                    {pagedPoin.some(v => v.is_negative) && (
                                        <div className="space-y-2">
                                            <div className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] px-1 py-1">
                                                {tp('violation')}
                                            </div>
                                            <div className="flex flex-col gap-2.5">
                                                {pagedPoin.filter(v => v.is_negative).map(v => renderCard(v))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Achievements Section */}
                                    {pagedPoin.some(v => !v.is_negative) && (
                                        <div className="space-y-2">
                                            <div className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] px-1 py-1">
                                                {tp('achievement')}
                                            </div>
                                            <div className="flex flex-col gap-2.5">
                                                {pagedPoin.filter(v => !v.is_negative).map(v => renderCard(v))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Pagination Footer */}
                        <Pagination
                            totalRows={totalRows}
                            page={page}
                            pageSize={pageSize}
                            setPage={setPage}
                            setPageSize={setPageSize}
                            label={tp('rulesPaginationLabel')}
                            jumpPage={jumpPage}
                            setJumpPage={setJumpPage}
                        />
                    </>
                )}
            </div>

            {hasOpenedForm && (
                <Modal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    title={selectedItem ? tp('rulesEditTitle') : tp('rulesAddTitle')}
                    description={selectedItem ? tp('rulesEditDesc') : tp('rulesAddDesc')}
                    size="md"
                    mobileVariant="bottom-sheet"
                    icon={selectedItem ? Edit2 : Plus}
                    iconBg="bg-[var(--color-primary)]/10"
                    iconColor="text-[var(--color-primary)]"
                    footer={
                        <div className="flex items-center w-full gap-3">
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                className="h-10 px-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] text-[10px] font-black uppercase tracking-widest transition-all shrink-0"
                            >
                                {tp('cancel')}
                            </button>
                            <div className="flex-1" />
                            <button
                                type="submit"
                                form="point-rule-form"
                                disabled={submitting}
                                className="h-10 px-6 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-[var(--color-primary)]/20 transition-all flex items-center justify-center gap-2 shrink-0"
                            >
                                {submitting ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                    <Check className="w-3.5 h-3.5" />
                                )}
                                {selectedItem ? tp('rulesBtnUpdate') : tp('rulesBtnSave')}
                            </button>
                        </div>
                    }
                >
                    <form id="point-rule-form" onSubmit={(e) => {
                        e.preventDefault()
                        const formData = new FormData(e.target)
                        handleSubmit({
                            name: formData.get('name'),
                            points: Number(formData.get('points')),
                            category: formData.get('category'),
                            is_negative: formData.get('type') === 'violation',
                            description: formData.get('description'),
                            status: formData.get('status')
                        })
                    }} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-3 md:col-span-2">
                                <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] ml-1">{tp('rulesFieldName')}</label>
                                <input name="name" defaultValue={selectedItem?.name} required placeholder={tp('rulesFieldNamePlaceholder')} className="w-full px-4 h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] outline-none transition-all text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] placeholder:opacity-40" />
                            </div>
                            <div className="space-y-3">
                                <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] ml-1">{tp('category')}</label>
                                <input type="hidden" name="category" value={formCategory} />
                                <RichSelect
                                    value={formCategory}
                                    onChange={(val) => setFormCategory(val)}
                                    options={CATEGORIES.map(c => ({ id: c, name: tp(`cat.${c}`) || c }))}
                                />
                            </div>
                            <div className="space-y-3">
                                <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] ml-1">{tp('rulesFieldType')}</label>
                                <div className="flex p-1 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-xl h-11">
                                    <label className="flex-1 flex items-center justify-center gap-2 cursor-pointer">
                                        <input type="radio" name="type" value="violation" defaultChecked={selectedItem ? selectedItem.is_negative : true} className="hidden peer" />
                                        <div className="w-full h-full flex items-center justify-center rounded-lg peer-checked:bg-red-500 peer-checked:text-white text-[var(--color-text-muted)] font-bold text-[9.5px] transition-all">{tp('rulesFieldTypeViolation')}</div>
                                    </label>
                                    <label className="flex-1 flex items-center justify-center gap-2 cursor-pointer">
                                        <input type="radio" name="type" value="achievement" defaultChecked={selectedItem ? !selectedItem.is_negative : false} className="hidden peer" />
                                        <div className="w-full h-full flex items-center justify-center rounded-lg peer-checked:bg-emerald-500 peer-checked:text-white text-[var(--color-text-muted)] font-bold text-[9.5px] transition-all">{tp('rulesFieldTypeAchievement')}</div>
                                    </label>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] ml-1">{tp('rulesFieldPoints')}</label>
                                <input type="number" name="points" defaultValue={selectedItem ? Math.abs(selectedItem.points) : ''} required min="1" placeholder={tp('rulesFieldPointsPlaceholder')} className="w-full px-4 h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] outline-none transition-all text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] placeholder:opacity-40" />
                            </div>
                            <div className="space-y-3">
                                <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] ml-1">{tp('rulesFieldStatus')}</label>
                                <input type="hidden" name="status" value={formStatus} />
                                <RichSelect
                                    value={formStatus}
                                    onChange={(val) => setFormStatus(val)}
                                    options={[
                                        { id: 'active', name: tp('rulesFieldStatusActive') },
                                        { id: 'inactive', name: tp('rulesFieldStatusInactive') }
                                    ]}
                                />
                            </div>
                            <div className="space-y-3 md:col-span-2">
                                <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] ml-1">{tp('rulesFieldDescription')}</label>
                                <textarea name="description" defaultValue={selectedItem?.description} rows={3} placeholder={tp('rulesFieldDescriptionPlaceholder')} className="w-full p-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl text-sm focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] outline-none transition-all text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] placeholder:opacity-40 resize-none" />
                            </div>
                        </div>
                    </form>
                </Modal>
            )}

            {/* Modal Delete Confirmation */}
            {hasOpenedDelete && (
                <ConfirmDialog
                    isOpen={isDeleteModalOpen}
                    onClose={() => setIsDeleteModalOpen(false)}
                    onConfirm={handleDeleteConfirm}
                    title={tp('rulesDeleteTitle')}
                    description={tp('rulesDeleteRisk')}
                    icon={Trash2}
                    confirmText={tp('rulesBtnDeleteNow')}
                    confirmIcon={Trash2}
                    cancelText={tp('cancel')}
                    submitting={submitting}
                >
                    <div className="px-1 space-y-3">
                        <p className="text-xs text-[var(--color-text)] leading-relaxed font-bold">
                            {tp('rulesDeleteWarningTemplate').replace('{name}', '').replace('?', '').trim()}
                        </p>
                        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-500/5 border border-red-500/20">
                            <Trash2 className="w-3.5 h-3.5 text-red-500 shrink-0" />
                            <span className="text-sm text-red-500 font-black break-words min-w-0">{itemToDelete?.name}</span>
                        </div>
                        <p className="text-[11px] text-[var(--color-text-muted)] font-bold">
                            {tp('rulesDeletePermanent')} — {tp('rulesDeleteRisk')}
                        </p>
                    </div>
                </ConfirmDialog>
            )}

            {/* Modal Bulk Delete */}
            {hasOpenedBulkDelete && (
                <Modal isOpen={isBulkDeleteOpen} onClose={() => setIsBulkDeleteOpen(false)} title={tp('rulesBulkDeleteConfirmTitle', { count: selectedIds.length })} size="sm" mobileVariant="bottom-sheet">
                    <div className="space-y-6 text-center">
                        <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-red-500/20 shadow-xl"><Trash2 className="text-3xl w-10 h-10" /></div>
                        <h3 className="text-lg font-black text-[var(--color-text)] uppercase tracking-tight">{tp('rulesBulkDeleteConfirmTitle', { count: selectedIds.length })}</h3>
                        <p className="text-[11px] text-[var(--color-text-muted)] font-black uppercase tracking-widest leading-relaxed">{tp('rulesBulkDeleteWarning')}</p>
                        <div className="flex gap-3 pt-4">
                            <button onClick={() => setIsBulkDeleteOpen(false)} className="h-11 flex-1 rounded-xl bg-[var(--color-surface-alt)] text-[var(--color-text)] font-black text-[10px] uppercase tracking-widest">{tp('cancel')}</button>
                            <button onClick={handleBulkDelete} disabled={submitting} className="h-11 flex-1 rounded-xl bg-red-500 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-red-500/20 transition-all flex items-center justify-center">
                                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : tp('rulesBtnBulkDeleteConfirm')}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Export Modal */}
            <React.Suspense fallback={null}>
                {hasOpenedExport && (
                    <LazyRulesExportModal
                        isOpen={isExportModalOpen}
                        onClose={() => setIsExportModalOpen(false)}
                        rulesCount={totalRows}
                        selectedCount={selectedIds.length}
                        exportScope={exportScope}
                        setExportScope={setExportScope}
                        exportColumns={exportColumns}
                        setExportColumns={setExportColumns}
                        exporting={exporting}
                        handleExport={handleExport}
                    />
                )}
            </React.Suspense>

            {/* Reset Poin Siswa Modal */}
            {hasOpenedReset && (
                <Modal
                    isOpen={isResetModalOpen}
                    onClose={() => setIsResetModalOpen(false)}
                    title={tp('resetPointsTitle')}
                    description={tp('resetPointsDesc')}
                    icon={RotateCcw}
                    iconBg="bg-orange-500/10"
                    iconColor="text-orange-500"
                    size="md"
                    mobileVariant="bottom-sheet"
                    footer={
                        <div className="flex items-center w-full gap-3">
                            <button
                                type="button"
                                onClick={() => setIsResetModalOpen(false)}
                                className="h-10 px-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] text-[10px] font-black uppercase tracking-widest transition-all shrink-0"
                            >
                                {tp('cancel')}
                            </button>
                            <div className="flex-1" />
                            <button
                                type="button"
                                disabled={resetPointsClassIds.length === 0}
                                onClick={() => {
                                    setIsResetModalOpen(false)
                                    setIsResetConfirmOpen(true)
                                }}
                                className="h-10 px-6 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-orange-500/20 transition-all flex items-center justify-center gap-2 shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>{tp('resetPointsBtnConfirm')}</span>
                            </button>
                        </div>
                    }
                >
                    <div className="space-y-4">
                        <div className="space-y-3">
                            <div className="flex items-center justify-between gap-4">
                                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] flex items-center gap-2 shrink-0">
                                    <GraduationCap className="opacity-40 w-4 h-4" /> <span>{tp('resetPointsSelectClass')}</span>
                                </label>
                                <div className="relative group flex-1 max-w-[200px]">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[var(--color-text-muted)] group-focus-within:text-[var(--color-primary)] transition-colors">
                                        <Search className="w-3.5 h-3.5" />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder={tp('resetPointsSearchClassPlaceholder')}
                                        value={resetPointsSearch}
                                        onChange={(e) => setResetPointsSearch(e.target.value)}
                                        className="w-full h-9 pl-9 pr-8 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[11px] font-medium focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] transition-all outline-none"
                                    />
                                    {resetPointsSearch && (
                                        <button
                                            onClick={() => setResetPointsSearch('')}
                                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-[var(--color-text-muted)] hover:text-rose-500 transition-colors"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="border border-[var(--color-border)] bg-[var(--color-surface-alt)]/15 rounded-2xl p-2.5 max-h-[200px] overflow-y-auto custom-scrollbar">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {/* Option Semua Kelas */}
                                    {!resetPointsSearch && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const isAllSelected = resetPointsClassIds.length === classesList.length
                                                if (isAllSelected) {
                                                    setResetPointsClassIds([])
                                                } else {
                                                    setResetPointsClassIds(classesList.map(c => c.id))
                                                }
                                            }}
                                            className={`col-span-full p-2.5 rounded-xl border text-left flex items-center gap-3 transition-all hover:scale-[1.01] active:scale-95 group mb-1 ${resetPointsClassIds.length === classesList.length
                                                ? 'bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-500/20'
                                                : 'border-orange-500/30 bg-orange-500/5 text-orange-600 hover:bg-orange-500/10'
                                                }`}
                                        >
                                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${resetPointsClassIds.length === classesList.length ? 'bg-white/20 text-white' : 'bg-orange-500 text-white shadow-sm'
                                                }`}>
                                                <Layers className="w-3.5 h-3.5" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-black text-[10px] uppercase tracking-wider leading-tight">{tp('resetPointsAllClasses')}</p>
                                            </div>
                                            {resetPointsClassIds.length === classesList.length && <Check className="w-3 h-3 opacity-60" />}
                                        </button>
                                    )}

                                    {filteredResetClasses.map(c => {
                                        const isSelected = resetPointsClassIds.includes(c.id)
                                        return (
                                            <button
                                                key={c.id}
                                                type="button"
                                                onClick={() => {
                                                    setResetPointsClassIds(prev =>
                                                        prev.includes(c.id)
                                                            ? prev.filter(id => id !== c.id)
                                                            : [...prev, c.id]
                                                    )
                                                }}
                                                className={`p-2.5 rounded-xl border text-left flex items-center gap-3 transition-all hover:scale-[1.01] active:scale-95 group ${isSelected
                                                    ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white shadow-lg shadow-[var(--color-primary)]/20'
                                                    : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-surface-alt)]'
                                                    }`}
                                            >
                                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'bg-white/20 text-white' : 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                                                    }`}>
                                                    <GraduationCap className="w-3.5 h-3.5" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-black text-[10px] uppercase tracking-wider leading-tight">{c.name}</p>
                                                </div>
                                                {isSelected && <Check className="w-3 h-3 opacity-60" />}
                                            </button>
                                        )
                                    })}

                                    {filteredResetClasses.length === 0 && (
                                        <div className="col-span-full py-8 text-center space-y-2">
                                            <div className="w-8 h-8 rounded-full bg-[var(--color-surface-alt)] flex items-center justify-center mx-auto opacity-40">
                                                <Search className="w-4 h-4" />
                                            </div>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-40">{tp('resetPointsClassNotFound')}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 px-2.5 py-1 bg-red-500/5 rounded-lg border border-red-500/10">
                            <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                            <span className="text-[9px] text-red-600 dark:text-red-400 font-extrabold leading-snug">{tp('resetPointsWarning')}</span>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Modal Konfirmasi Ganda Reset Poin */}
            {hasOpenedResetConfirm && (
                <ConfirmDialog
                    isOpen={isResetConfirmOpen}
                    onClose={handleCancelConfirm}
                    onConfirm={handleBatchResetPoints}
                    title={language === 'ar' ? 'تأكيد إعادة تعيين النقاط' : language === 'en' ? 'Confirm Reset Points' : 'Konfirmasi Reset Poin'}
                    description={language === 'ar' ? 'ستتم إعادة جميع نقاط الطلاب المتراكمة إلى 0.' : language === 'en' ? 'All accumulated student points will be reset to 0.' : 'Semua akumulasi poin siswa akan kembali menjadi 0.'}
                    icon={AlertTriangle}
                    iconBg="bg-red-500/10"
                    iconColor="text-red-500"
                    mobileVariant="bottom-sheet"
                    confirmText={language === 'ar' ? 'نعم، أعد التعيين الآن' : language === 'en' ? 'Yes, Reset Now' : 'Ya, Reset Sekarang'}
                    confirmIcon={RotateCcw}
                    confirmClassName="h-10 px-6 rounded-xl bg-red-500 hover:bg-red-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-500/20 transition-all flex items-center justify-center gap-2 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                    confirmDisabled={confirmText.toUpperCase() !== 'RESET'}
                    cancelText={tp('cancel')}
                    submitting={resettingPoints}
                >
                    <div className="space-y-4">
                        {/* Informasi Target Reset */}
                        <div className="text-xs text-[var(--color-text)] leading-relaxed font-bold space-y-2">
                            <p>{language === 'ar' ? 'هل أنت متأكد أنك تريد إعادة تعيين النقاط لـ:' : language === 'en' ? 'Are you sure you want to reset points for:' : 'Apakah Anda yakin ingin mereset poin untuk:'}</p>
                            <div className="p-3 bg-[var(--color-surface-alt)] rounded-xl border border-[var(--color-border)]">
                                <span className="text-[9px] text-[var(--color-text-muted)] font-black uppercase tracking-widest block mb-1">
                                    {language === 'ar' ? 'الفصول المستهدفة:' : language === 'en' ? 'Target Classes:' : 'Target Kelas:'}
                                </span>
                                {resetPointsClassIds.length === classesList.length ? (
                                    <span className="text-xs text-[var(--color-primary)] font-black uppercase leading-normal">
                                        {language === 'ar' ? 'جميع الفصول' : language === 'en' ? 'All Classes' : 'Semua Kelas'}
                                    </span>
                                ) : (
                                    <div className="flex flex-wrap gap-1.5 mt-1 max-h-[80px] overflow-y-auto custom-scrollbar pr-1">
                                        {classesList.filter(c => resetPointsClassIds.includes(c.id)).map(c => (
                                            <span key={c.id} className="text-[9px] font-black uppercase tracking-wide px-2 py-0.5 bg-[var(--color-primary)]/10 text-[var(--color-primary)] rounded-md border border-[var(--color-primary)]/20 shrink-0">
                                                {c.name}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Input Verifikasi Teks (Friction UX) */}
                        <div className="space-y-2">
                            <label className="block text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">
                                {language === 'ar' ? <>اكتب <span className="text-red-500 font-bold">"RESET"</span> للتأكيد:</> : language === 'en' ? <>Type <span className="text-red-500 font-bold">"RESET"</span> to confirm:</> : <>Ketik <span className="text-red-500 font-bold">"RESET"</span> untuk mengonfirmasi:</>}
                            </label>
                            <input 
                                type="text"
                                value={confirmText}
                                onChange={(e) => setConfirmText(e.target.value)}
                                placeholder="RESET"
                                className="w-full px-4 h-10 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-center text-xs font-black tracking-widest focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none transition-all uppercase placeholder:opacity-30"
                            />
                        </div>
                    </div>
                </ConfirmDialog>
            )}
        </div>
    )
}
