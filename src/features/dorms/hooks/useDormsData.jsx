import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '@lib/supabase'
import { LIST_KAMAR } from '@utils/reports/raportConstants'
import { useImportExportCore } from '@shared/hooks/useImportExportCore'
import { sanitizeText, pick } from '@utils/importExportEngine'
import {
    LS_AUDITS,
    LS_TASKS,
    LS_LOGS,
    getMockAudits,
    getMockTasks,
    getMockShiftLogs
} from '@features/dorms/utils/mockData'

const DORM_SYSTEM_COLS = [
    { key: 'student_name', label: 'Nama Siswa', synonyms: ['nama', 'student', 'siswa', 'student_name', 'nama siswa', 'name', 'nama lengkap'] },
    { key: 'class_name', label: 'Nama Kelas', synonyms: ['kelas', 'class', 'class_name', 'rombongan belajar', 'rombel', 'nama kelas'] },
    { key: 'room_name', label: 'Nama Kamar', synonyms: ['kamar', 'room', 'room_name', 'nama kamar', 'asrama', 'kamar asrama'] },
]

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
    const [isBulkAssignOpen, setIsBulkAssignOpen] = useState(false)
    const [selectedBulkRoom, setSelectedBulkRoom] = useState('')

    const [isExportModalOpen, setIsExportModalOpen] = useState(false)
    const [exportScope, setExportScope] = useState('all')
    const [exportFormat, setExportFormat] = useState('csv')
    const [exportDataset, setExportDataset] = useState('plotting')

    // --- Import (mesin generik via useImportExportCore) ---
    // Validasi domain: santri & kamar target wajib valid
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
        return { validated, issues, dupeIndices: [] }
    }, [students, dorms])

    // Commit khusus: per-row UPDATE students.metadata.kamar + merge state lokal.
    const importExport = useImportExportCore({
        systemCols: DORM_SYSTEM_COLS,
        addToast,
        table: 'students',
        audit: null, // perilaku lama tanpa audit — jangan tambah entri baru
        messages: {
            unsupportedFormat: 'Format file tidak didukung. Harap unggah file .csv atau .xlsx',
            emptyFile: 'File kosong atau tidak dapat dibaca',
            hasErrors: 'Harap perbaiki semua error sebelum menyimpan',
            commitSuccess: (n) => `Berhasil memplotting ${n} santri ke kamar`,
            commitFailed: () => 'Gagal memproses import data',
            removeRow: 'Baris import berhasil dihapus',
            bulkFix: () => 'Berhasil memperbarui semua baris bermasalah',
        },
        buildPreview: async (rows, mapping) => {
            const preview = rows.map((r) => {
                const getVal = (row, sysKey) => {
                    if (mapping && mapping[sysKey]) return sanitizeText(row[mapping[sysKey]])
                    const colDef = DORM_SYSTEM_COLS.find(c => c.key === sysKey)
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
            return validateImportPreview(preview)
        },
        validate: validateImportPreview,
        resyncRow: (row) => {
            if (row.student_id !== undefined) {
                const student = students.find(s => s.id === row.student_id)
                row._studentName = student?.name || ''
                row._className = student?.classes?.name || ''
            }
            if (row.room_id !== undefined) {
                const room = dorms.find(d => d.id === row.room_id)
                row._roomName = room?.id || ''
            }
            return row
        },
        buildCommitRow: (r) => r,
        commitRows: async (chunk) => {
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
        },
        template: {
            headers: ['Nama Siswa', 'Kelas', 'Nama Kamar'],
            widths: [25, 20, 25],
            rows: [
                ['Ahmad Fauzi', 'X-A', dorms[0]?.id || 'Fachruddin'],
                ['Budi Santoso', 'X-B', dorms[0]?.id || 'Fachruddin'],
            ],
            filename: 'template_plotting_kamar',
        },
    })

    // Template download dibungkus toast (perilaku lama)
    const handleDownloadTemplate = async () => {
        try {
            await importExport.handleDownloadTemplate()
            addToast('Berhasil mengunduh template impor', 'success')
        } catch {
            addToast('Gagal mengunduh template', 'error')
        }
    }

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
            setIsBulkAssignOpen(false)
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
        // Import/export generik (useImportExportCore) — key dorms di bawah menimpa yang bentrok
        ...importExport,
        handleDownloadTemplate,

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
        isBulkAssignOpen, setIsBulkAssignOpen,
        selectedBulkRoom, setSelectedBulkRoom,
        isExportModalOpen, setIsExportModalOpen,
        exportScope, setExportScope,
        exportFormat, setExportFormat,
        exportDataset, setExportDataset,
        handleOpenExportModal,

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
