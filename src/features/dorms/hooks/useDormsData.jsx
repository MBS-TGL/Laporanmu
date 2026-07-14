import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '@lib/supabase'
import { LIST_KAMAR } from '@utils/reports/raportConstants'
import {
    LS_AUDITS,
    LS_TASKS,
    LS_LOGS,
    getMockAudits,
    getMockTasks,
    getMockShiftLogs
} from '@features/dorms/utils/dormMockData'

export function useDormsData(addToast) {
    // --- UI Filter & Pagination States ---
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedClassFilter, setSelectedClassFilter] = useState('')
    const [selectedRoomTab, setSelectedRoomTab] = useState('All')
    const [selectedGenderFilter, setSelectedGenderFilter] = useState('')
    const [selectedBuildingFilter, setSelectedBuildingFilter] = useState('')
    const [viewMode, setViewMode] = useState('cards')
    const [showAdvFilter, setShowAdvFilter] = useState(false)
    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(10)
    const [jumpPage, setJumpPage] = useState('')

    const [auditDateFrom, setAuditDateFrom] = useState('')
    const [auditDateTo, setAuditDateTo] = useState('')
    const [auditRoomFilter, setAuditRoomFilter] = useState('')

    // --- Core Data States ---
    const [students, setStudents] = useState([])
    const [classesList, setClassesList] = useState([])
    const [dorms, setDorms] = useState([])
    const [audits, setAudits] = useState([])
    const [inventories, setInventories] = useState([])
    const [musyrifList, setMusyrifList] = useState([])
    const [shiftLogs, setShiftLogs] = useState([])
    const [musyrifTasks, setMusyrifTasks] = useState([])

    // --- Loading & Submission States ---
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [bulkSubmitting, setBulkSubmitting] = useState(false)
    const [loadingDorms, setLoadingDorms] = useState(true)
    const [submittingDorm, setSubmittingDorm] = useState(false)
    const [submittingDeleteDorm, setSubmittingDeleteDorm] = useState(false)
    const [submittingDeleteAudit, setSubmittingDeleteAudit] = useState(false)
    const [loadingInventory, setLoadingInventory] = useState(false)
    const [submittingInventory, setSubmittingInventory] = useState(false)

    // --- Modal Controls & Temp States ---
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
    const [studentToAssign, setStudentToAssign] = useState(null)
    const [selectedTargetRoom, setSelectedTargetRoom] = useState('')
    const [assignStep, setAssignStep] = useState(1)
    const [isHeaderAssign, setIsHeaderAssign] = useState(false)

    const [isConfirmEvictOpen, setIsConfirmEvictOpen] = useState(false)
    const [studentToEvict, setStudentToEvict] = useState(null)

    const [selectedIds, setSelectedIds] = useState([])
    const [isBulkAssignModalOpen, setIsBulkAssignModalOpen] = useState(false)
    const [selectedBulkRoom, setSelectedBulkRoom] = useState('')

    const [isExportModalOpen, setIsExportModalOpen] = useState(false)
    const [exportScope, setExportScope] = useState('all')
    const [exportFormat, setExportFormat] = useState('csv')
    const [exportDataset, setExportDataset] = useState('plotting')

    // --- Import Modal States ---
    const [isImportModalOpen, setIsImportModalOpen] = useState(false)
    const [importFileName, setImportFileName] = useState('')
    const [importPreview, setImportPreview] = useState([])
    const [importIssues, setImportIssues] = useState([])
    const [importing, setImporting] = useState(false)
    const [importProgress, setImportProgress] = useState({ done: 0, total: 0 })
    const [importStep, setImportStep] = useState(1) // 1: Upload, 2: Mapping, 3: Review
    const [importRawData, setImportRawData] = useState([])
    const [importFileHeaders, setImportFileHeaders] = useState([])
    const [importColumnMapping, setImportColumnMapping] = useState({})
    const [importDragOver, setImportDragOver] = useState(false)
    const [importValidationOpen, setImportValidationOpen] = useState(false)
    const [importLoading, setImportLoading] = useState(false)
    const [importEditCell, setImportEditCell] = useState(null)

    const [isAuditModalOpen, setIsAuditModalOpen] = useState(false)
    const [newAudit, setNewAudit] = useState({
        room: 'Fachruddin',
        score: 85,
        rating: 'A',
        aspects: { kerapian: 85, kebersihan: 85, keharuman: 85 },
        notes: ''
    })
    const [auditToDelete, setAuditToDelete] = useState(null)
    const [isConfirmDeleteAuditOpen, setIsConfirmDeleteAuditOpen] = useState(false)

    const [isLogModalOpen, setIsLogModalOpen] = useState(false)
    const [newLog, setNewLog] = useState({ musyrifName: '', shift: 'Malam', notes: '', issues: '' })

    const [isDormModalOpen, setIsDormModalOpen] = useState(false)
    const [editingDorm, setEditingDorm] = useState(null)
    const [newDorm, setNewDorm] = useState({ id: '', ar: '', capacity: 30, gender: '', building: '', status: 'active', musyrif_id: '' })
    const [isConfirmDeleteDormOpen, setIsConfirmDeleteDormOpen] = useState(false)
    const [dormToDelete, setDormToDelete] = useState(null)

    const [selectedDormForInventory, setSelectedDormForInventory] = useState('')
    const [isInventoryModalOpen, setIsInventoryModalOpen] = useState(false)
    const [editingInventoryItem, setEditingInventoryItem] = useState(null)
    const [newInventoryItem, setNewInventoryItem] = useState({ item_name: '', total_quantity: 1, good_condition_count: 1, damaged_condition_count: 0, notes: '' })
    const [isConfirmDeleteInventoryOpen, setIsConfirmDeleteInventoryOpen] = useState(false)
    const [inventoryToDelete, setInventoryToDelete] = useState(null)
    const [inventoryModalDorm, setInventoryModalDorm] = useState(null)
    const [pendingInventoryDorm, setPendingInventoryDorm] = useState(null)

    // --- Data Fetching Functions ---
    const fetchDorms = async () => {
        try {
            setLoadingDorms(true)
            const { data, error } = await supabase
                .from('dorms')
                .select('*')
                .order('created_at', { ascending: true })

            if (error) throw error
            setDorms(data || [])
        } catch (err) {
            console.error('[DormsPage] Gagal memuat data kamar:', err.message)
            setDorms(LIST_KAMAR)
        } finally {
            setLoadingDorms(false)
        }
    }

    const fetchAudits = async () => {
        try {
            const { data, error } = await supabase
                .from('dorm_audits')
                .select('*')
                .order('created_at', { ascending: false })
            if (error) throw error
            setAudits(data || [])
        } catch (err) {
            console.warn('[DormsPage] Gagal mengambil audits dari Supabase, fallback ke localStorage:', err.message)
            try {
                const saved = localStorage.getItem(LS_AUDITS)
                setAudits(saved ? JSON.parse(saved) : getMockAudits())
            } catch {
                setAudits(getMockAudits())
            }
        }
    }

    const fetchShiftLogs = async () => {
        try {
            const { data, error } = await supabase
                .from('dorm_shift_logs')
                .select('*')
                .order('created_at', { ascending: false })
            if (error) throw error
            const formatted = (data || []).map(d => ({
                id: d.id,
                date: d.date,
                musyrifName: d.musyrif_name,
                shift: d.shift,
                notes: d.notes,
                issues: d.issues
            }))
            setShiftLogs(formatted)
        } catch (err) {
            console.warn('[DormsPage] Gagal mengambil shift logs dari Supabase, fallback ke localStorage:', err.message)
            try {
                const saved = localStorage.getItem(LS_LOGS)
                setShiftLogs(saved ? JSON.parse(saved) : getMockShiftLogs())
            } catch {
                setShiftLogs(getMockShiftLogs())
            }
        }
    }

    const fetchMusyrifTasks = async () => {
        try {
            const { data, error } = await supabase
                .from('dorm_musyrif_tasks')
                .select('*')
                .order('id', { ascending: true })
            if (error) throw error
            if (!data || data.length === 0) {
                setMusyrifTasks(getMockTasks())
            } else {
                const formatted = data.map(d => ({
                    id: d.id,
                    title: d.title,
                    desc: d.desc_text,
                    completed: d.completed,
                    completedAt: d.completed_at
                }))
                setMusyrifTasks(formatted)
            }
        } catch (err) {
            console.warn('[DormsPage] Gagal mengambil tasks dari Supabase, fallback ke localStorage:', err.message)
            try {
                const saved = localStorage.getItem(LS_TASKS)
                setMusyrifTasks(saved ? JSON.parse(saved) : getMockTasks())
            } catch {
                setMusyrifTasks(getMockTasks())
            }
        }
    }

    const fetchMusyrifList = async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, name, role')
                .order('name')
            if (error) throw error
            setMusyrifList(data || [])
        } catch (err) {
            console.warn('[DormsPage] Gagal memuat daftar musyrif:', err.message)
            setMusyrifList([])
        }
    }

    const fetchInventories = async () => {
        try {
            setLoadingInventory(true)
            const { data, error } = await supabase
                .from('dorm_inventories')
                .select('*')
                .order('dorm_id')
            if (error) throw error
            setInventories(data || [])
        } catch (err) {
            setInventories([])
        } finally {
            setLoadingInventory(false)
        }
    }

    const fetchData = useCallback(async () => {
        try {
            setLoading(true)
            const { data: stdData, error: stdErr } = await supabase
                .from('students')
                .select('id, name, metadata, class_id, classes(id, name), gender')
                .is('deleted_at', null)
                .order('name')

            if (stdErr) throw stdErr

            const { data: clsData, error: clsErr } = await supabase
                .from('classes')
                .select('id, name')
                .order('name')

            if (clsErr) throw clsErr

            setStudents(stdData || [])
            setClassesList(clsData || [])

            await fetchDorms()
            await fetchAudits()
            await fetchShiftLogs()
            await fetchMusyrifTasks()
            await fetchMusyrifList()
            await fetchInventories()
        } catch (err) {
            console.error('[DormsPage] Gagal mengambil data:', err.message)
            addToast('Gagal memuat data dari database', 'error')
        } finally {
            setLoading(false)
        }
    }, [addToast])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    // --- Filter Side-effects ---
    useEffect(() => {
        setPage(1)
    }, [searchQuery, selectedClassFilter, selectedRoomTab, selectedGenderFilter, selectedBuildingFilter])

    useEffect(() => {
        setSelectedIds([])
    }, [searchQuery, selectedClassFilter, selectedRoomTab, selectedGenderFilter, selectedBuildingFilter, page])

    // --- Assignment Handlers ---
    const handleOpenAssignModal = (student) => {
        setStudentToAssign(student)
        setSelectedTargetRoom(student ? (student.metadata?.kamar || '') : '')
        setAssignStep(student ? 2 : 1)
        setIsHeaderAssign(!student)
        setIsAssignModalOpen(true)
    }

    const handleSaveAssignment = async () => {
        if (!studentToAssign) return
        try {
            setSubmitting(true)
            const currentMetadata = studentToAssign.metadata || {}
            const nextMetadata = { ...currentMetadata, kamar: selectedTargetRoom }

            const { error } = await supabase
                .from('students')
                .update({ metadata: nextMetadata })
                .eq('id', studentToAssign.id)

            if (error) throw error

            setStudents(prev => prev.map(s => {
                if (s.id === studentToAssign.id) {
                    return { ...s, metadata: nextMetadata }
                }
                return s
            }))

            addToast(`Santri ${studentToAssign.name} berhasil dialokasikan ke kamar ${selectedTargetRoom || 'Dikosongkan'}`, 'success')
            setIsAssignModalOpen(false)
        } catch (err) {
            console.error('[DormsPage] Gagal menyimpan plotting:', err.message)
            addToast('Gagal memindahkan kamar santri', 'error')
        } finally {
            setSubmitting(false)
        }
    }

    const handleOpenEvictModal = (student) => {
        setStudentToEvict(student)
        setIsConfirmEvictOpen(true)
    }

    const handleConfirmEvict = async () => {
        if (!studentToEvict) return
        try {
            setSubmitting(true)
            const currentMetadata = studentToEvict.metadata || {}
            const nextMetadata = { ...currentMetadata, kamar: '' }

            const { error } = await supabase
                .from('students')
                .update({ metadata: nextMetadata })
                .eq('id', studentToEvict.id)

            if (error) throw error

            setStudents(prev => prev.map(s => {
                if (s.id === studentToEvict.id) {
                    return { ...s, metadata: nextMetadata }
                }
                return s
            }))

            addToast(`Plotting kamar ${studentToEvict.name} berhasil dikosongkan`, 'success')
            setIsConfirmEvictOpen(false)
        } catch (err) {
            console.error('[DormsPage] Gagal menghapus plotting:', err.message)
            addToast('Gagal mengeluarkan santri dari kamar', 'error')
        } finally {
            setSubmitting(false)
            setStudentToEvict(null)
        }
    }

    const toggleSelect = (id) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
    }

    const handleBulkAssignSave = async () => {
        if (selectedIds.length === 0 || !selectedBulkRoom) return
        try {
            setBulkSubmitting(true)

            const updates = selectedIds.map(async (id) => {
                const student = students.find(s => s.id === id)
                if (!student) return
                const currentMetadata = student.metadata || {}
                const nextMetadata = { ...currentMetadata, kamar: selectedBulkRoom }

                const { error } = await supabase
                    .from('students')
                    .update({ metadata: nextMetadata })
                    .eq('id', id)

                if (error) throw error
                return { id, nextMetadata }
            })

            const results = await Promise.all(updates)

            setStudents(prev => prev.map(s => {
                const match = results.find(r => r && r.id === s.id)
                if (match) {
                    return { ...s, metadata: match.nextMetadata }
                }
                return s
            }))

            addToast(`${selectedIds.length} santri berhasil dialokasikan ke kamar ${selectedBulkRoom}`, 'success')
            setIsBulkAssignModalOpen(false)
            setSelectedIds([])
        } catch (err) {
            console.error('[DormsPage] Gagal menyimpan plotting massal:', err.message)
            addToast('Gagal memindahkan kamar santri secara massal', 'error')
        } finally {
            setBulkSubmitting(false)
        }
    }

    const handleBulkUnassign = async () => {
        if (selectedIds.length === 0) return
        if (!window.confirm(`Apakah Anda yakin ingin menghapus plotting kamar untuk ${selectedIds.length} santri terpilih?`)) return
        try {
            setBulkSubmitting(true)

            const updates = selectedIds.map(async (id) => {
                const student = students.find(s => s.id === id)
                if (!student) return
                const currentMetadata = student.metadata || {}
                const nextMetadata = { ...currentMetadata, kamar: '' }

                const { error } = await supabase
                    .from('students')
                    .update({ metadata: nextMetadata })
                    .eq('id', id)

                if (error) throw error
                return { id, nextMetadata }
            })

            const results = await Promise.all(updates)

            setStudents(prev => prev.map(s => {
                const match = results.find(r => r && r.id === s.id)
                if (match) {
                    return { ...s, metadata: match.nextMetadata }
                }
                return s
            }))

            addToast(`Plotting kamar untuk ${selectedIds.length} santri berhasil dihapus`, 'success')
            setSelectedIds([])
        } catch (err) {
            console.error('[DormsPage] Gagal menghapus plotting massal:', err.message)
        } finally {
            setBulkSubmitting(false)
        }
    }

    // --- Master Dorm CRUD ---
    const handleSaveDorm = async (e) => {
        e.preventDefault()
        if (!newDorm.id.trim()) return
        try {
            setSubmittingDorm(true)
            const dormData = {
                ar: newDorm.ar || null,
                capacity: Number(newDorm.capacity),
                gender: newDorm.gender || null,
                building: newDorm.building || null,
                status: newDorm.status || 'active',
                musyrif_id: newDorm.musyrif_id || null
            }

            if (editingDorm) {
                const { error } = await supabase
                    .from('dorms')
                    .update(dormData)
                    .eq('id', editingDorm.id)
                if (error) throw error
                addToast(`Kamar ${editingDorm.id} berhasil diperbarui`, 'success')
            } else {
                const { error } = await supabase
                    .from('dorms')
                    .insert([{ id: newDorm.id, ...dormData }])
                if (error) throw error
                addToast(`Kamar ${newDorm.id} berhasil ditambahkan`, 'success')
            }
            setIsDormModalOpen(false)
            await fetchDorms()
        } catch (err) {
            console.error('[DormsPage] Gagal menyimpan kamar:', err.message)
            addToast('Gagal menyimpan data kamar', 'error')
        } finally {
            setSubmittingDorm(false)
        }
    }

    const handleOpenDeleteDormModal = (room) => {
        setDormToDelete(room)
        setIsConfirmDeleteDormOpen(true)
    }

    const handleConfirmDeleteDorm = async () => {
        if (!dormToDelete) return
        const roomName = dormToDelete.id
        try {
            setSubmittingDeleteDorm(true)
            const occupants = students.filter(s => s.metadata?.kamar === roomName)
            if (occupants.length > 0) {
                const studentIds = occupants.map(s => s.id)
                const updates = studentIds.map(async (id) => {
                    const studentObj = students.find(s => s.id === id)
                    const nextMetadata = { ...studentObj.metadata, kamar: '' }
                    const { error } = await supabase.from('students').update({ metadata: nextMetadata }).eq('id', id)
                    if (error) throw error
                    return { id, nextMetadata }
                })

                const results = await Promise.all(updates)

                setStudents(prev => prev.map(s => {
                    const match = results.find(r => r && r.id === s.id)
                    if (match) {
                        return { ...s, metadata: match.nextMetadata }
                    }
                    return s
                }))
            }

            const { error } = await supabase.from('dorms').delete().eq('id', roomName)
            if (error) throw error
            addToast(`Kamar ${roomName} berhasil dihapus`, 'success')
            await fetchDorms()
            setIsConfirmDeleteDormOpen(false)
            setDormToDelete(null)
        } catch (err) {
            console.error('[DormsPage] Gagal menghapus kamar:', err.message)
            addToast('Gagal menghapus kamar dari database', 'error')
        } finally {
            setSubmittingDeleteDorm(false)
        }
    }

    // --- Kebersihan Audits Handlers ---
    const handleSaveAudit = async (e) => {
        e.preventDefault()
        const avg = Math.round((Number(newAudit.aspects.kerapian) + Number(newAudit.aspects.kebersihan) + Number(newAudit.aspects.keharuman)) / 3)
        let rating = 'C'
        if (avg >= 85) rating = 'A'
        else if (avg >= 70) rating = 'B'

        const auditData = {
            date: new Date().toISOString().slice(0, 10),
            room: newAudit.room,
            score: avg,
            rating,
            aspects: { ...newAudit.aspects },
            notes: newAudit.notes || 'Pemeriksaan rutin asrama'
        }

        try {
            const { error } = await supabase
                .from('dorm_audits')
                .insert([auditData])

            if (error) throw error

            addToast(`Laporan kebersihan kamar ${newAudit.room} berhasil disubmit dengan predikat ${rating} (${avg} Poin)`, 'success')
            await fetchAudits()
        } catch (err) {
            console.warn('[DormsPage] Gagal menyimpan audit ke Supabase, fallback ke localStorage:', err.message)
            const localData = {
                id: Date.now().toString(),
                ...auditData
            }
            const nextAudits = [localData, ...audits]
            setAudits(nextAudits)
            localStorage.setItem(LS_AUDITS, JSON.stringify(nextAudits))
            addToast('Laporan kebersihan berhasil disimpan', 'success')
        } finally {
            setIsAuditModalOpen(false)
            setNewAudit({
                room: 'Fachruddin',
                score: 85,
                rating: 'A',
                aspects: { kerapian: 85, kebersihan: 85, keharuman: 85 },
                notes: ''
            })
        }
    }

    const handleOpenDeleteAuditModal = (audit) => {
        setAuditToDelete(audit)
        setIsConfirmDeleteAuditOpen(true)
    }

    const handleConfirmDeleteAudit = async () => {
        if (!auditToDelete) return
        const id = auditToDelete.id
        try {
            setSubmittingDeleteAudit(true)
            const isUUID = id && id.toString().length > 15
            if (isUUID) {
                const { error } = await supabase
                    .from('dorm_audits')
                    .delete()
                    .eq('id', id)
                if (error) throw error
                addToast('Laporan penilaian kebersihan berhasil dihapus', 'success')
                await fetchAudits()
            } else {
                const next = audits.filter(a => a.id !== id)
                setAudits(next)
                localStorage.setItem(LS_AUDITS, JSON.stringify(next))
                addToast('Laporan penilaian kebersihan berhasil dihapus', 'success')
            }
            setIsConfirmDeleteAuditOpen(false)
            setAuditToDelete(null)
        } catch (err) {
            console.error('[DormsPage] Gagal menghapus audit:', err.message)
            addToast('Gagal menghapus laporan kebersihan', 'error')
        } finally {
            setSubmittingDeleteAudit(false)
        }
    }

    // --- Inventory Handlers ---
    const handleSaveInventoryItem = async (e) => {
        e.preventDefault()
        if (!newInventoryItem.item_name.trim() || !selectedDormForInventory) return
        try {
            setSubmittingInventory(true)
            const payload = {
                dorm_id: selectedDormForInventory,
                item_name: newInventoryItem.item_name,
                total_quantity: Number(newInventoryItem.total_quantity) || 1,
                good_condition_count: Number(newInventoryItem.good_condition_count) || 0,
                damaged_condition_count: Number(newInventoryItem.damaged_condition_count) || 0,
                notes: newInventoryItem.notes || null,
                last_checked_at: new Date().toISOString()
            }
            if (editingInventoryItem) {
                const { error } = await supabase.from('dorm_inventories').update(payload).eq('id', editingInventoryItem.id)
                if (error) throw error
                addToast('Item inventaris berhasil diperbarui', 'success')
            } else {
                const { error } = await supabase.from('dorm_inventories').insert([payload])
                if (error) throw error
                addToast('Item inventaris berhasil ditambahkan', 'success')
            }
            setIsInventoryModalOpen(false)
            setEditingInventoryItem(null)
            setNewInventoryItem({ item_name: '', total_quantity: 1, good_condition_count: 1, damaged_condition_count: 0, notes: '' })
            await fetchInventories()
            if (pendingInventoryDorm) {
                setInventoryModalDorm(pendingInventoryDorm)
                setPendingInventoryDorm(null)
            }
        } catch (err) {
            console.error('[DormsPage] Gagal menyimpan inventaris:', err.message)
            addToast('Gagal menyimpan data inventaris. Pastikan tabel dorm_inventories sudah dibuat.', 'error')
        } finally {
            setSubmittingInventory(false)
        }
    }

    const handleConfirmDeleteInventory = async () => {
        if (!inventoryToDelete) return
        try {
            const { error } = await supabase.from('dorm_inventories').delete().eq('id', inventoryToDelete.id)
            if (error) throw error
            addToast('Item inventaris berhasil dihapus', 'success')
            setIsConfirmDeleteInventoryOpen(false)
            setInventoryToDelete(null)
            await fetchInventories()
            if (pendingInventoryDorm) {
                setInventoryModalDorm(pendingInventoryDorm)
                setPendingInventoryDorm(null)
            }
        } catch (err) {
            console.error('[DormsPage] Gagal menghapus inventaris:', err.message)
            addToast('Gagal menghapus item inventaris', 'error')
        }
    }

    // --- Musyrif ID Assignment (PJ Kamar) ---
    const handleSaveMusyrifId = async (dormId, musyrifId) => {
        try {
            const { error } = await supabase
                .from('dorms')
                .update({ musyrif_id: musyrifId || null })
                .eq('id', dormId)
            if (error) throw error
            addToast(`PJ Kamar ${dormId} berhasil diperbarui`, 'success')
            await fetchDorms()
        } catch (err) {
            console.error('[DormsPage] Gagal update musyrif_id:', err.message)
            addToast('Gagal menetapkan PJ Kamar', 'error')
        }
    }

    // --- Musyrif Task Control ---
    const toggleTask = async (taskId) => {
        const targetTask = musyrifTasks.find(t => t.id === taskId)
        if (!targetTask) return

        const nextCompleted = !targetTask.completed
        const completedTime = nextCompleted ? new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : null

        try {
            const { error } = await supabase
                .from('dorm_musyrif_tasks')
                .update({
                    completed: nextCompleted,
                    completed_at: completedTime,
                    updated_at: new Date().toISOString()
                })
                .eq('id', taskId)

            if (error) throw error
            addToast('Status tugas berhasil diperbarui', 'success')
            await fetchMusyrifTasks()
        } catch (err) {
            console.warn('[DormsPage] Gagal update task di Supabase, fallback ke localStorage:', err.message)
            const next = musyrifTasks.map(t => t.id === taskId ? { ...t, completed: nextCompleted, completedAt: completedTime } : t)
            setMusyrifTasks(next)
            localStorage.setItem(LS_TASKS, JSON.stringify(next))
            addToast('Status tugas berhasil diperbarui', 'success')
        }
    }

    const resetAllTasks = async () => {
        try {
            const { error } = await supabase
                .from('dorm_musyrif_tasks')
                .update({
                    completed: false,
                    completed_at: null,
                    updated_at: new Date().toISOString()
                })
                .neq('id', '0')

            if (error) throw error
            addToast('Seluruh daftar kontrol tugas musyrif berhasil direset', 'success')
            await fetchMusyrifTasks()
        } catch (err) {
            console.warn('[DormsPage] Gagal reset tasks di Supabase, fallback ke localStorage:', err.message)
            const next = musyrifTasks.map(t => ({ ...t, completed: false, completedAt: null }))
            setMusyrifTasks(next)
            localStorage.setItem(LS_TASKS, JSON.stringify(next))
            addToast('Seluruh daftar kontrol tugas musyrif berhasil direset', 'success')
        }
    }

    const handleSaveLog = async (e) => {
        e.preventDefault()
        if (!newLog.musyrifName) {
            addToast('Nama Musyrif penjaga wajib diisi', 'warning')
            return
        }

        const logData = {
            date: new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }),
            musyrif_name: newLog.musyrifName,
            shift: newLog.shift,
            notes: newLog.notes || 'Kondisi asrama kondusif',
            issues: newLog.issues || 'Nihil'
        }

        try {
            const { error } = await supabase
                .from('dorm_shift_logs')
                .insert([logData])

            if (error) throw error
            addToast('Jurnal piket musyrif berhasil disimpan', 'success')
            await fetchShiftLogs()
        } catch (err) {
            console.warn('[DormsPage] Gagal menyimpan log piket ke Supabase, fallback ke localStorage:', err.message)
            const localData = {
                id: Date.now().toString(),
                musyrifName: logData.musyrif_name,
                ...logData
            }
            const nextLogs = [localData, ...shiftLogs]
            setShiftLogs(nextLogs)
            localStorage.setItem(LS_LOGS, JSON.stringify(nextLogs))
            addToast('Jurnal piket musyrif berhasil disimpan', 'success')
        } finally {
            setIsLogModalOpen(false)
            setNewLog({ musyrifName: '', shift: 'Malam', notes: '', issues: '' })
        }
    }

    // --- Export Actions Handlers (Backward Compatibility) ---
    const handleOpenExportModal = useCallback((datasetType = 'plotting') => {
        setExportDataset(datasetType)
        setIsExportModalOpen(true)
    }, [])

    const handleExecuteExport = useCallback(() => {
        setIsExportModalOpen(true)
    }, [])

    const handleExportAuditsCSV = useCallback(() => {
        handleOpenExportModal('cleanliness')
    }, [handleOpenExportModal])

    const handleExportInventoriesCSV = useCallback(() => {
        handleOpenExportModal('inventory')
    }, [handleOpenExportModal])

    // --- Import Actions & Helper Handlers ---
    const SYSTEM_COLS = useMemo(() => [
        { key: 'student_name', label: 'Nama Siswa', synonyms: ['nama', 'student', 'siswa', 'student_name', 'nama siswa', 'name', 'nama lengkap'] },
        { key: 'class_name', label: 'Nama Kelas', synonyms: ['kelas', 'class', 'class_name', 'rombongan belajar', 'rombel', 'nama kelas'] },
        { key: 'room_name', label: 'Nama Kamar', synonyms: ['kamar', 'room', 'room_name', 'nama kamar', 'asrama', 'kamar asrama'] }
    ], [])

    const parseCSVFile = async (file) => {
        const Papa = (await import('papaparse')).default
        return new Promise((resolve, reject) => {
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => resolve(results.data || []),
                error: (err) => reject(err)
            })
        })
    }

    const parseExcelFile = async (file) => {
        const XLSX = await import('xlsx')
        const buf = await file.arrayBuffer()
        const wb = XLSX.read(buf, { type: 'array', cellDates: true })
        const json = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' })
        return json
    }

    const processImportFile = async (file) => {
        const ext = file.name.toLowerCase()
        if (!ext.endsWith('.csv') && !ext.endsWith('.xlsx')) {
            addToast('Format file tidak didukung. Harap unggah file .csv atau .xlsx', 'error')
            return
        }
        setImportFileName(file.name)
        setImportPreview([])
        setImportIssues([])
        setImportLoading(true)
        try {
            const isXlsx = ext.endsWith('.xlsx') || (file.type || '').includes('sheet')
            const rows = isXlsx ? await parseExcelFile(file) : await parseCSVFile(file)
            if (!rows.length) {
                addToast('File kosong atau tidak dapat dibaca', 'error')
                return
            }

            setImportRawData(rows)
            const headers = Object.keys(rows[0])
            setImportFileHeaders(headers)

            // Auto column mapping
            const mapping = {}
            const norm = (str) => (str || '').toLowerCase().replace(/[\s\xA0\n\r]+/g, ' ').trim()
            SYSTEM_COLS.forEach(sys => {
                const match = headers.find(h => {
                    const normH = norm(h)
                    const cleanH = norm(h.split(/[\(\[\{（\n\r]/)[0])
                    const normK = norm(sys.key)
                    const normL = norm(sys.label)
                    if (normH === normL || normH === normK || cleanH === normL || cleanH === normK) return true
                    if (sys.synonyms && sys.synonyms.some(syn => {
                        const s = norm(syn)
                        return normH === s || cleanH === s || cleanH.replace(/[^a-z0-9]/g, '') === s.replace(/[^a-z0-9]/g, '')
                    })) return true
                    return false
                })
                if (match) mapping[sys.key] = match
            })

            setImportColumnMapping(mapping)
            setImportStep(2)
        } catch (err) {
            console.error(err)
            addToast('Gagal membaca file import', 'error')
        } finally {
            setImportLoading(false)
        }
    }

    const validateImportPreview = useCallback((preview) => {
        const issues = []
        const validated = preview.map((r, idx) => {
            const rowIssues = []
            if (!r.student_id) {
                rowIssues.push({ level: 'error', type: 'student', message: `Santri "${r._studentName}" tidak ditemukan` })
            }
            if (!r.room_id) {
                rowIssues.push({ level: 'error', type: 'room', message: `Kamar "${r._roomName}" tidak ditemukan` })
            }
            if (rowIssues.length) {
                issues.push({
                    row: idx + 2,
                    level: 'error',
                    types: rowIssues.map(x => x.type),
                    messages: rowIssues.map(x => x.message)
                })
            }
            return {
                ...r,
                _hasError: rowIssues.length > 0
            }
        })
        setImportPreview(validated)
        setImportIssues(issues)
        setImportValidationOpen(issues.length > 0)
    }, [students, dorms])

    const buildImportPreview = async (rows, mapping) => {
        const sanitizeText = (s) => String(s ?? '').replace(/[<>]/g, '').trim()
        const pick = (obj, keys) => {
            for (const k of keys) {
                const v = obj?.[k]
                if (v !== undefined && v !== null && String(v).trim() !== '') return v
            }
            return ''
        }

        const preview = rows.map((r) => {
            const getVal = (row, sysKey) => {
                if (mapping && mapping[sysKey]) return sanitizeText(row[mapping[sysKey]])
                const colDef = SYSTEM_COLS.find(c => c.key === sysKey)
                return sanitizeText(pick(row, colDef ? colDef.synonyms : [sysKey]))
            }

            const studentName = getVal(r, 'student_name')
            const className = getVal(r, 'class_name')
            const roomName = getVal(r, 'room_name')

            // Match student by name and class
            const matchedStudent = students.find(s => {
                const nameMatches = s.name.toLowerCase() === studentName.toLowerCase()
                if (!nameMatches) return false
                if (className) {
                    return (s.classes?.name || '').toLowerCase() === className.toLowerCase()
                }
                return true
            })

            // Match dorm room by ID
            const matchedRoom = dorms.find(d => d.id.toLowerCase() === roomName.toLowerCase())

            return {
                student_id: matchedStudent?.id || '',
                room_id: matchedRoom?.id || '',
                _studentName: matchedStudent?.name || studentName || '',
                _className: className || matchedStudent?.classes?.name || '',
                _roomName: matchedRoom?.id || roomName || '',
                _hasError: false
            }
        })

        validateImportPreview(preview)
    }

    const handleImportCellEdit = (index, key, value) => {
        const newPrev = [...importPreview]
        const updatedRow = { ...newPrev[index], [key]: value }

        if (key === 'student_id') {
            const student = students.find(s => s.id === value)
            updatedRow._studentName = student?.name || ''
            updatedRow._className = student?.classes?.name || ''
        } else if (key === 'room_id') {
            const room = dorms.find(d => d.id === value)
            updatedRow._roomName = room?.id || ''
        }

        newPrev[index] = updatedRow
        validateImportPreview(newPrev)
    }

    const handleRemoveImportRow = (idx) => {
        const next = importPreview.filter((_, i) => i !== idx)
        validateImportPreview(next)
        addToast('Baris import berhasil dihapus', 'success')
    }

    const handleBulkFix = (sysKey, value) => {
        const newPrev = importPreview.map(r => {
            const updated = { ...r, [sysKey]: value }
            if (sysKey === 'student_id') {
                const student = students.find(s => s.id === value)
                updated._studentName = student?.name || ''
                updated._className = student?.classes?.name || ''
            } else if (sysKey === 'room_id') {
                const room = dorms.find(d => d.id === value)
                updated._roomName = room?.id || ''
            }
            return updated
        })
        validateImportPreview(newPrev)
        addToast(`Berhasil memperbarui semua baris bermasalah`, 'success')
    }

    const handleDownloadTemplate = async () => {
        const templateData = [
            {
                'Nama Siswa': 'Ahmad Fauzi',
                'Kelas': 'X-A',
                'Nama Kamar': dorms[0]?.id || 'Fachruddin'
            },
            {
                'Nama Siswa': 'Budi Santoso',
                'Kelas': 'X-B',
                'Nama Kamar': dorms[0]?.id || 'Fachruddin'
            }
        ]
        try {
            const XLSX = await import('xlsx')
            const ws = XLSX.utils.json_to_sheet(templateData)
            ws['!cols'] = [{ wch: 25 }, { wch: 20 }, { wch: 25 }]
            const wb = XLSX.utils.book_new()
            XLSX.utils.book_append_sheet(wb, ws, 'Template Plotting')
            const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
            const blob = new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
            const link = document.createElement('a')
            link.href = URL.createObjectURL(blob)
            link.download = 'template_plotting_kamar.xlsx'
            link.click()
            URL.revokeObjectURL(link.href)
            addToast('Berhasil mengunduh template impor', 'success')
        } catch {
            addToast('Gagal mengunduh template', 'error')
        }
    }

    const importReadyRows = useMemo(() => {
        if (!importPreview.length) return []
        const errorSet = new Set(importIssues.filter(x => x.level === 'error').map(x => x.row - 2))
        return importPreview.filter((_, i) => !errorSet.has(i))
    }, [importPreview, importIssues])

    const hasImportBlockingErrors = useMemo(() => {
        return importIssues.some(x => x.level === 'error')
    }, [importIssues])

    const handleCommitImport = async () => {
        if (!importPreview.length) {
            addToast('Tidak ada data untuk diimport', 'error')
            return
        }
        if (hasImportBlockingErrors) {
            addToast('Harap perbaiki semua error sebelum menyimpan', 'error')
            return
        }

        setImporting(true)
        setImportProgress({ done: 0, total: importReadyRows.length })

        const CHUNK = 50
        try {
            for (let i = 0; i < importReadyRows.length; i += CHUNK) {
                const chunk = importReadyRows.slice(i, i + CHUNK)
                const updates = chunk.map(async (r) => {
                    const studentObj = students.find(s => s.id === r.student_id)
                    if (!studentObj) return null
                    const nextMetadata = { ...studentObj.metadata, kamar: r.room_id }
                    const { error } = await supabase
                        .from('students')
                        .update({ metadata: nextMetadata })
                        .eq('id', r.student_id)
                    if (error) throw error
                    return { id: r.student_id, metadata: nextMetadata }
                })

                const results = await Promise.all(updates)

                // Update local state
                setStudents(prev => prev.map(s => {
                    const match = results.find(res => res && res.id === s.id)
                    return match ? { ...s, metadata: match.metadata } : s
                }))

                setImportProgress({ done: Math.min(i + CHUNK, importReadyRows.length), total: importReadyRows.length })
            }

            addToast(`Berhasil memplotting ${importReadyRows.length} santri ke kamar`, 'success')
            setIsImportModalOpen(false)
            setImportPreview([])
            setImportIssues([])
            setImportFileName('')
            setImportStep(1)
        } catch (err) {
            console.error(err)
            addToast('Gagal memproses import data', 'error')
        } finally {
            setImporting(false)
        }
    }

    // --- Computed / Memoized Values ---
    const stats = useMemo(() => {
        let totalCount = students.length
        let assignedCount = students.filter(s => s.metadata?.kamar).length
        let unassignedCount = totalCount - assignedCount

        const avgCleanliness = audits.length > 0
            ? Math.round(audits.reduce((acc, curr) => acc + curr.score, 0) / audits.length)
            : 0

        const completedTasks = musyrifTasks.filter(t => t.completed).length
        const totalTasks = musyrifTasks.length
        const taskProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

        return { totalCount, assignedCount, unassignedCount, avgCleanliness, taskProgress, completedTasks, totalTasks }
    }, [students, audits, musyrifTasks])

    const studentsByRoom = useMemo(() => {
        const mapping = {}
        dorms.forEach(room => {
            mapping[room.id] = []
        })

        students.forEach(s => {
            const roomVal = s.metadata?.kamar
            if (roomVal && mapping[roomVal]) {
                mapping[roomVal].push(s)
            }
        })
        return mapping
    }, [students, dorms])

    const activeFilters = useMemo(() => {
        const list = []
        if (selectedClassFilter) {
            const cls = classesList.find(c => c.id === selectedClassFilter)
            list.push({
                label: `Kelas: ${cls?.name || selectedClassFilter}`,
                clear: () => { setSelectedClassFilter(''); setPage(1); }
            })
        }
        if (selectedRoomTab && selectedRoomTab !== 'All') {
            let label = `Kamar: ${selectedRoomTab}`
            if (selectedRoomTab === 'Assigned') label = 'Status: Sudah Diplot'
            if (selectedRoomTab === 'Unassigned') label = 'Status: Belum Diplot'
            list.push({
                label,
                clear: () => { setSelectedRoomTab('All'); setPage(1); }
            })
        }
        if (selectedGenderFilter) {
            list.push({
                label: `Kelamin: ${selectedGenderFilter === 'putra' ? 'Putra' : 'Putri'}`,
                clear: () => { setSelectedGenderFilter(''); setPage(1); }
            })
        }
        if (selectedBuildingFilter) {
            list.push({
                label: `Gedung: ${selectedBuildingFilter}`,
                clear: () => { setSelectedBuildingFilter(''); setPage(1); }
            })
        }
        return list
    }, [selectedClassFilter, selectedRoomTab, selectedGenderFilter, selectedBuildingFilter, classesList])

    const filteredStudents = useMemo(() => {
        return students.filter(s => {
            const matchSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase())
            const matchClass = selectedClassFilter ? s.class_id === selectedClassFilter : true
            const roomVal = s.metadata?.kamar || ''

            let matchRoomTab = true
            if (selectedRoomTab === 'Unassigned') {
                matchRoomTab = !roomVal
            } else if (selectedRoomTab === 'Assigned') {
                matchRoomTab = !!roomVal
            } else if (selectedRoomTab !== 'All') {
                matchRoomTab = roomVal === selectedRoomTab
            }

            let matchGender = true
            if (selectedGenderFilter) {
                const dormOfStudent = dorms.find(d => d.id === roomVal)
                matchGender = dormOfStudent?.gender === selectedGenderFilter
            }

            let matchBuilding = true
            if (selectedBuildingFilter) {
                const dormOfStudent = dorms.find(d => d.id === roomVal)
                matchBuilding = dormOfStudent?.building === selectedBuildingFilter
            }

            return matchSearch && matchClass && matchRoomTab && matchGender && matchBuilding
        })
    }, [students, searchQuery, selectedClassFilter, selectedRoomTab, selectedGenderFilter, selectedBuildingFilter, dorms])

    const paginatedStudents = useMemo(() => {
        const startIndex = (page - 1) * pageSize
        return filteredStudents.slice(startIndex, startIndex + pageSize)
    }, [filteredStudents, page, pageSize])

    const filteredAudits = useMemo(() => {
        return audits.filter(a => {
            const matchRoom = auditRoomFilter ? a.room === auditRoomFilter : true
            const matchFrom = auditDateFrom ? a.date >= auditDateFrom : true
            const matchTo = auditDateTo ? a.date <= auditDateTo : true
            return matchRoom && matchFrom && matchTo
        })
    }, [audits, auditRoomFilter, auditDateFrom, auditDateTo])

    const buildingOptions = useMemo(() => {
        const buildings = dorms.map(d => d.building).filter(Boolean)
        return [...new Set(buildings)]
    }, [dorms])

    const exportPreviewCount = useMemo(() => {
        if (exportScope === 'assigned') return students.filter(s => s.metadata?.kamar).length
        if (exportScope === 'unassigned') return students.filter(s => !s.metadata?.kamar).length
        return students.length
    }, [students, exportScope])


    const allSelected = paginatedStudents.length > 0 && paginatedStudents.every(s => selectedIds.includes(s.id))

    const toggleAll = () => {
        if (allSelected) {
            const paginatedIds = paginatedStudents.map(s => s.id)
            setSelectedIds(prev => prev.filter(id => !paginatedIds.includes(id)))
        } else {
            const paginatedIds = paginatedStudents.map(s => s.id)
            setSelectedIds(prev => {
                const newIds = [...prev]
                paginatedIds.forEach(id => {
                    if (!newIds.includes(id)) newIds.push(id)
                })
                return newIds
            })
        }
    }

    return {
        // Filter states
        searchQuery, setSearchQuery,
        selectedClassFilter, setSelectedClassFilter,
        selectedRoomTab, setSelectedRoomTab,
        selectedGenderFilter, setSelectedGenderFilter,
        selectedBuildingFilter, setSelectedBuildingFilter,
        viewMode, setViewMode,
        showAdvFilter, setShowAdvFilter,
        page, setPage,
        pageSize, setPageSize,
        jumpPage, setJumpPage,
        auditDateFrom, setAuditDateFrom,
        auditDateTo, setAuditDateTo,
        auditRoomFilter, setAuditRoomFilter,

        // Core data
        students, classesList, dorms, audits, inventories, musyrifList, shiftLogs, musyrifTasks,
        loading, loadingDorms, loadingInventory,
        submitting, bulkSubmitting, submittingDorm, submittingDeleteDorm, submittingDeleteAudit, submittingInventory,

        // Modal states & setters
        isAssignModalOpen, setIsAssignModalOpen,
        studentToAssign, setStudentToAssign,
        selectedTargetRoom, setSelectedTargetRoom,
        assignStep, setAssignStep,
        isHeaderAssign, setIsHeaderAssign,
        isConfirmEvictOpen, setIsConfirmEvictOpen,
        studentToEvict, setStudentToEvict,
        selectedIds, setSelectedIds,
        isBulkAssignModalOpen, setIsBulkAssignModalOpen,
        selectedBulkRoom, setSelectedBulkRoom,
        isExportModalOpen, setIsExportModalOpen,
        exportScope, setExportScope,
        exportFormat, setExportFormat,
        exportDataset, setExportDataset,
        handleOpenExportModal,

        // Import states & selectors
        isImportModalOpen, setIsImportModalOpen,
        importFileName, setImportFileName,
        importPreview, setImportPreview,
        importIssues, setImportIssues,
        importing, setImporting,
        importProgress, setImportProgress,
        importStep, setImportStep,
        importRawData, setImportRawData,
        importFileHeaders, setImportFileHeaders,
        importColumnMapping, setImportColumnMapping,
        importDragOver, setImportDragOver,
        importValidationOpen, setImportValidationOpen,
        importLoading, setImportLoading,
        importEditCell, setImportEditCell,
        importReadyRows,
        hasImportBlockingErrors,
        SYSTEM_COLS,

        // Import Handlers
        processImportFile,
        buildImportPreview,
        handleImportCellEdit,
        handleRemoveImportRow,
        handleBulkFix,
        handleDownloadTemplate,
        handleCommitImport,

        isAuditModalOpen, setIsAuditModalOpen,
        newAudit, setNewAudit,
        auditToDelete, setAuditToDelete,
        isConfirmDeleteAuditOpen, setIsConfirmDeleteAuditOpen,
        isLogModalOpen, setIsLogModalOpen,
        newLog, setNewLog,
        isDormModalOpen, setIsDormModalOpen,
        editingDorm, setEditingDorm,
        newDorm, setNewDorm,
        isConfirmDeleteDormOpen, setIsConfirmDeleteDormOpen,
        dormToDelete, setDormToDelete,
        selectedDormForInventory, setSelectedDormForInventory,
        isInventoryModalOpen, setIsInventoryModalOpen,
        editingInventoryItem, setEditingInventoryItem,
        newInventoryItem, setNewInventoryItem,
        isConfirmDeleteInventoryOpen, setIsConfirmDeleteInventoryOpen,
        inventoryToDelete, setInventoryToDelete,
        inventoryModalDorm, setInventoryModalDorm,
        pendingInventoryDorm, setPendingInventoryDorm,

        // Computed values
        stats, studentsByRoom, activeFilters, filteredStudents, paginatedStudents, filteredAudits, buildingOptions, exportPreviewCount, allSelected,

        // Fetch triggers
        fetchData, fetchDorms, fetchAudits, fetchShiftLogs, fetchMusyrifTasks, fetchMusyrifList, fetchInventories,

        // Handlers
        handleOpenAssignModal,
        handleSaveAssignment,
        handleOpenEvictModal,
        handleConfirmEvict,
        toggleSelect,
        toggleAll,
        handleBulkAssignSave,
        handleBulkUnassign,
        handleSaveDorm,
        handleOpenDeleteDormModal,
        handleConfirmDeleteDorm,
        handleSaveAudit,
        handleOpenDeleteAuditModal,
        handleConfirmDeleteAudit,
        handleSaveInventoryItem,
        handleConfirmDeleteInventory,
        handleSaveMusyrifId,
        toggleTask,
        resetAllTasks,
        handleSaveLog,
        handleExecuteExport,
        handleExportAuditsCSV,
        handleExportInventoriesCSV
    }
}
