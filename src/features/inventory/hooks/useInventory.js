import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { supabase } from '@lib/supabase'

const TABLE = 'dorm_inventories'

const CATEGORIES = [
    { id: 'all', label: 'Semua', icon: 'fa-layer-group', color: 'slate' },
    { id: 'furniture', label: 'Furniture', icon: 'fa-chair', color: 'blue', keywords: ['meja', 'kursi', 'lemari', 'kasur', 'bantal', 'selimut', 'rak', 'tempat tidur', 'sofa'] },
    { id: 'elektronik', label: 'Elektronik', icon: 'fa-plug', color: 'violet', keywords: ['kipas', 'kipas angin', 'lampu', 'kabel', 'stop kontak', 'kipas ventilasi', 'tv', 'ac', 'kipas listrik'] },
    { id: 'atk', label: 'ATK & Kantor', icon: 'fa-pen', color: 'amber', keywords: ['pensil', 'pena', 'buku', 'kertas', 'map', 'stapler', 'tinta', 'spidol'] },
    { id: 'ibadah', label: 'Ibadah', icon: 'fa-mosque', color: 'emerald', keywords: ['sajadah', 'mukena', 'alat sholat', 'tasbih', 'alquran', 'kitab'] },
    { id: 'kebersihan', label: 'Kebersihan', icon: 'fa-broom', color: 'cyan', keywords: ['sapu', 'pel', 'ember', 'sikat', 'sabun', 'shampo', 'handuk'] },
    { id: 'dapur', label: 'Dapur & Masak', icon: 'fa-utensils', color: 'orange', keywords: ['panci', 'wajan', 'kompor', 'piring', 'gelas', 'sendok', 'garpu', 'baskom'] },
    { id: 'lainnya', label: 'Lainnya', icon: 'fa-box', color: 'slate', keywords: [] }
]

const CONDITION_THRESHOLDS = {
    excellent: { min: 95, label: 'Sangat Baik', color: 'emerald' },
    good: { min: 75, label: 'Baik', color: 'green' },
    fair: { min: 50, label: 'Kurang', color: 'amber' },
    poor: { min: 0, label: 'Buruk', color: 'red' }
}

function categorizeItem(name) {
    const lower = (name || '').toLowerCase()
    for (const cat of CATEGORIES) {
        if (cat.id === 'all' || cat.id === 'lainnya') continue
        if (cat.keywords.some(kw => lower.includes(kw))) return cat.id
    }
    return 'lainnya'
}

function getConditionPct(item) {
    const total = item.total_quantity || 0
    if (total === 0) return null
    return Math.round(((item.good_condition_count || 0) / total) * 100)
}

function getConditionLevel(pct) {
    if (pct === null) return 'fair'
    if (pct >= 95) return 'excellent'
    if (pct >= 75) return 'good'
    if (pct >= 50) return 'fair'
    return 'poor'
}

function formatDate(dateStr) {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatRelativeDate(dateStr) {
    if (!dateStr) return 'Belum pernah dicek'
    const now = new Date()
    const d = new Date(dateStr)
    const diff = Math.floor((now - d) / (1000 * 60 * 60 * 24))
    if (diff === 0) return 'Hari ini'
    if (diff === 1) return 'Kemarin'
    if (diff < 7) return `${diff} hari lalu`
    if (diff < 30) return `${Math.floor(diff / 7)} minggu lalu`
    if (diff < 365) return `${Math.floor(diff / 30)} bulan lalu`
    return `${Math.floor(diff / 365)} tahun lalu`
}

export function useInventory({ addToast }) {
    const [items, setItems] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [filterCategory, setFilterCategory] = useState('all')
    const [filterCondition, setFilterCondition] = useState('all')
    const [sortBy, setSortBy] = useState('name_asc')
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isDetailOpen, setIsDetailOpen] = useState(false)
    const [isExportOpen, setIsExportOpen] = useState(false)
    const [editingItem, setEditingItem] = useState(null)
    const [selectedItem, setSelectedItem] = useState(null)
    const [selectedIds, setSelectedIds] = useState(new Set())
    const [submitting, setSubmitting] = useState(false)
    const [viewMode, setViewMode] = useState(() => {
        try { return localStorage.getItem('inventory_view_mode') || 'table' } catch { return 'table' }
    })

    const formDataRef = useRef({
        item_name: '',
        total_quantity: 0,
        good_condition_count: 0,
        damaged_condition_count: 0,
        notes: '',
        dorm_id: null
    })

    const fetchItems = useCallback(async () => {
        try {
            setLoading(true)
            const { data, error } = await supabase
                .from(TABLE)
                .select('*')
                .order('item_name', { ascending: true })
            if (error) throw error
            setItems(data || [])
        } catch (err) {
            console.error('Error fetching inventory:', err)
            addToast?.('Gagal memuat data inventaris', 'error')
        } finally {
            setLoading(false)
        }
    }, [addToast])

    useEffect(() => { fetchItems() }, [fetchItems])

    // ── Stats ──
    const stats = useMemo(() => {
        const total = items.length
        const totalQty = items.reduce((s, i) => s + (i.total_quantity || 0), 0)
        const goodQty = items.reduce((s, i) => s + (i.good_condition_count || 0), 0)
        const damagedQty = items.reduce((s, i) => s + (i.damaged_condition_count || 0), 0)
        const missingQty = totalQty - goodQty - damagedQty
        const healthPct = totalQty > 0 ? Math.round((goodQty / totalQty) * 100) : 0
        const catCounts = {}
        CATEGORIES.forEach(c => { if (c.id !== 'all') catCounts[c.id] = 0 })
        items.forEach(i => { const cat = categorizeItem(i.item_name); catCounts[cat] = (catCounts[cat] || 0) + 1 })
        return { total, totalQty, goodQty, damagedQty, missingQty, healthPct, catCounts }
    }, [items])

    // ── Filtered & Sorted ──
    const filteredItems = useMemo(() => {
        return items
            .filter(item => {
                const matchSearch = !searchQuery || item.item_name?.toLowerCase().includes(searchQuery.toLowerCase()) || item.notes?.toLowerCase().includes(searchQuery.toLowerCase())
                const cat = categorizeItem(item.item_name)
                const matchCat = filterCategory === 'all' || cat === filterCategory
                const pct = getConditionPct(item)
                const level = getConditionLevel(pct)
                const matchCond = filterCondition === 'all' || level === filterCondition
                return matchSearch && matchCat && matchCond
            })
            .sort((a, b) => {
                switch (sortBy) {
                    case 'name_asc': return (a.item_name || '').localeCompare(b.item_name || '')
                    case 'name_desc': return (b.item_name || '').localeCompare(a.item_name || '')
                    case 'total_desc': return (b.total_quantity || 0) - (a.total_quantity || 0)
                    case 'total_asc': return (a.total_quantity || 0) - (b.total_quantity || 0)
                    case 'condition_desc': return (getConditionPct(b) ?? 0) - (getConditionPct(a) ?? 0)
                    case 'condition_asc': return (getConditionPct(a) ?? 100) - (getConditionPct(b) ?? 100)
                    case 'damaged_desc': return (b.damaged_condition_count || 0) - (a.damaged_condition_count || 0)
                    case 'recent': return new Date(b.last_checked_at || 0) - new Date(a.last_checked_at || 0)
                    default: return 0
                }
            })
    }, [items, searchQuery, filterCategory, filterCondition, sortBy])

    // ── Selection ──
    const allSelected = filteredItems.length > 0 && filteredItems.every(i => selectedIds.has(i.id))
    const someSelected = filteredItems.some(i => selectedIds.has(i.id))

    const toggleSelectAll = useCallback(() => {
        if (allSelected) {
            setSelectedIds(new Set())
        } else {
            setSelectedIds(new Set(filteredItems.map(i => i.id)))
        }
    }, [allSelected, filteredItems])

    const toggleSelect = useCallback((id) => {
        setSelectedIds(prev => {
            const n = new Set(prev)
            n.has(id) ? n.delete(id) : n.add(id)
            return n
        })
    }, [])

    const clearSelection = useCallback(() => setSelectedIds(new Set()), [])

    // ── CRUD ──
    const openAddModal = useCallback(() => {
        setEditingItem(null)
        formDataRef.current = { item_name: '', total_quantity: 0, good_condition_count: 0, damaged_condition_count: 0, notes: '', dorm_id: null }
        setIsModalOpen(true)
    }, [])

    const openEditModal = useCallback((item) => {
        setEditingItem(item)
        formDataRef.current = {
            item_name: item.item_name || '',
            total_quantity: item.total_quantity || 0,
            good_condition_count: item.good_condition_count || 0,
            damaged_condition_count: item.damaged_condition_count || 0,
            notes: item.notes || '',
            dorm_id: item.dorm_id || null
        }
        setIsModalOpen(true)
    }, [])

    const openDetail = useCallback((item) => {
        setSelectedItem(item)
        setIsDetailOpen(true)
    }, [])

    const closeModal = useCallback(() => {
        setIsModalOpen(false)
        setEditingItem(null)
    }, [])

    const closeDetail = useCallback(() => {
        setIsDetailOpen(false)
        setSelectedItem(null)
    }, [])

    const handleSave = useCallback(async (formData) => {
        setSubmitting(true)
        try {
            const payload = {
                item_name: formData.item_name?.trim(),
                total_quantity: Number(formData.total_quantity) || 0,
                good_condition_count: Number(formData.good_condition_count) || 0,
                damaged_condition_count: Number(formData.damaged_condition_count) || 0,
                notes: formData.notes?.trim() || null,
                dorm_id: formData.dorm_id || null,
                last_checked_at: new Date().toISOString()
            }
            if (editingItem) {
                const { error } = await supabase.from(TABLE).update(payload).eq('id', editingItem.id)
                if (error) throw error
                addToast?.('Item berhasil diperbarui', 'success')
            } else {
                const { error } = await supabase.from(TABLE).insert([payload])
                if (error) throw error
                addToast?.('Item berhasil ditambahkan', 'success')
            }
            closeModal()
            fetchItems()
        } catch (err) {
            console.error('Error saving:', err)
            addToast?.(err.message || 'Gagal menyimpan', 'error')
        } finally {
            setSubmitting(false)
        }
    }, [editingItem, addToast, closeModal, fetchItems])

    const handleDelete = useCallback(async (itemId) => {
        try {
            const { error } = await supabase.from(TABLE).delete().eq('id', itemId)
            if (error) throw error
            addToast?.('Item berhasil dihapus', 'success')
            fetchItems()
        } catch (err) {
            console.error('Error deleting:', err)
            addToast?.('Gagal menghapus item', 'error')
        }
    }, [addToast, fetchItems])

    const handleBulkDelete = useCallback(async () => {
        if (selectedIds.size === 0) return
        try {
            const ids = Array.from(selectedIds)
            const { error } = await supabase.from(TABLE).delete().in('id', ids)
            if (error) throw error
            addToast?.(`${ids.length} item berhasil dihapus`, 'success')
            setSelectedIds(new Set())
            fetchItems()
        } catch (err) {
            addToast?.('Gagal menghapus item', 'error')
        }
    }, [selectedIds, addToast, fetchItems])

    // ── Export ──
    const exportData = useCallback((format = 'csv') => {
        const data = selectedIds.size > 0
            ? items.filter(i => selectedIds.has(i.id))
            : filteredItems

        if (format === 'csv') {
            const headers = ['Nama Item', 'Total', 'Kondisi Baik', 'Kondisi Rusak', 'Kondisi (%)', 'Kategori', 'Terakhir Dicek', 'Catatan']
            const rows = data.map(i => {
                const pct = getConditionPct(i)
                return [i.item_name, i.total_quantity || 0, i.good_condition_count || 0, i.damaged_condition_count || 0, pct !== null ? `${pct}%` : '—', categorizeItem(i.item_name), formatDate(i.last_checked_at), i.notes || '']
            })
            const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n')
            const blob = new Blob([csv], { type: 'text/csv' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a'); a.href = url; a.download = `inventaris_${new Date().toISOString().slice(0, 10)}.csv`; a.click()
            URL.revokeObjectURL(url)
            addToast?.(`Export ${data.length} item ke CSV`, 'success')
        }
    }, [items, filteredItems, selectedIds, addToast])

    // ── Keyboard shortcuts ──
    useEffect(() => {
        const handler = (e) => {
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return
            if (e.key === 'n' && !e.ctrlKey && !e.metaKey) { e.preventDefault(); openAddModal() }
            if (e.key === 'x') { e.preventDefault(); clearSelection() }
            if (e.key === 'Escape') { setIsModalOpen(false); setIsDetailOpen(false); setIsExportOpen(false); clearSelection() }
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [openAddModal, clearSelection])

    const switchView = useCallback((mode) => {
        setViewMode(mode)
        try { localStorage.setItem('inventory_view_mode', mode) } catch {}
    }, [])

    return {
        items: filteredItems,
        allItems: items,
        loading,
        searchQuery, setSearchQuery,
        filterCategory, setFilterCategory,
        filterCondition, setFilterCondition,
        sortBy, setSortBy,
        isModalOpen, setIsModalOpen,
        isDetailOpen, setIsDetailOpen,
        isExportOpen, setIsExportOpen,
        editingItem, selectedItem,
        selectedIds, allSelected, someSelected,
        submitting, stats, formDataRef,
        viewMode, switchView,
        categories: CATEGORIES,
        openAddModal, openEditModal, openDetail, closeModal, closeDetail,
        toggleSelectAll, toggleSelect, clearSelection,
        handleSave, handleDelete, handleBulkDelete,
        exportData, fetchItems,
        categorizeItem, getConditionPct, getConditionLevel, formatDate, formatRelativeDate
    }
}

export { CATEGORIES, categorizeItem, getConditionPct, getConditionLevel, CONDITION_THRESHOLDS, formatDate, formatRelativeDate }
