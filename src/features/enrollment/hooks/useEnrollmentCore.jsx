import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '@lib/supabase'
import { logAudit } from '@utils/auditLogger'
import {
    ENROLLMENT_STATUS, getStatusConfig, REQUIRED_DOCUMENTS
} from '@features/enrollment/utils/enrollmentConstants'

const STATUS_ORDER = {
    'mendaftar': 1,
    'verifikasi': 2,
    'tes': 3,
    'diterima': 4,
    'ditolak': 4,
    'daftar_ulang': 5
}


export function useEnrollmentCore({ addToast, addUndoToast }) {
    // ── DATA ──
    const [enrollments, setEnrollments] = useState([])
    const [waves, setWaves] = useState([])
    const [loading, setLoading] = useState(true)
    const [totalRows, setTotalRows] = useState(0)
    const [archivedEnrollments, setArchivedEnrollments] = useState([])
    const [loadingArchived, setLoadingArchived] = useState(false)
    const [allEnrollments, setAllEnrollments] = useState([])

    // ── FILTERS ──
    const [searchQuery, setSearchQuery] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')
    const [filterWave, setFilterWave] = useState('')
    const [filterStatus, setFilterStatus] = useState('')
    const [filterGender, setFilterGender] = useState('')
    const [filterProgram, setFilterProgram] = useState('')
    const [filterDateFrom, setFilterDateFrom] = useState('')
    const [filterDateTo, setFilterDateTo] = useState('')
    const [sortBy, setSortBy] = useState('date_desc')

    // ── PAGINATION ──
    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(10)

    // ── MODALS ──
    const [isFormOpen, setIsFormOpen] = useState(false)
    const [isProfileOpen, setIsProfileOpen] = useState(false)
    const [isWaveModalOpen, setIsWaveModalOpen] = useState(false)
    const [activeModal, setActiveModal] = useState(null) // 'delete' | 'bulkApprove' | 'bulkReject' | null
    const [isConvertOpen, setIsConvertOpen] = useState(false)
    const [isAssessmentOpen, setIsAssessmentOpen] = useState(false)
    const [assessmentEnrollment, setAssessmentEnrollment] = useState(null)

    // ── ACTION CONTEXT ──
    const [selectedEnrollment, setSelectedEnrollment] = useState(null)
    const [enrollmentToDelete, setEnrollmentToDelete] = useState(null)
    const [selectedIds, setSelectedIds] = useState([])
    const [submitting, setSubmitting] = useState(false)
    const [uploadingPhoto, setUploadingPhoto] = useState(false)
    const [sendingReminders, setSendingReminders] = useState(false)
    const [convertingEnrollment, setConvertingEnrollment] = useState(null)
    const [converting, setConverting] = useState(false)

    // ── CLASSES ──
    const [classes, setClasses] = useState([])

    // ── REFS ──
    const searchInputRef = useRef(null)

    // ── DEBOUNCE SEARCH ──
    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 350)
        return () => clearTimeout(t)
    }, [searchQuery])

    // Reset page on filter change
    useEffect(() => { setPage(1) }, [debouncedSearch, filterWave, filterStatus, filterGender, filterProgram, sortBy, filterDateFrom, filterDateTo])

    // ── GLOBAL STATS & PIPELINE ──
    const [globalStats, setGlobalStats] = useState({
        total: 0, mendaftar: 0, verifikasi: 0, tes: 0, diterima: 0, ditolak: 0,
        boys: 0, girls: 0, quota: 0, quotaUsed: 0, quotaLeft: 0, activeWave: null
    })

    const pipelineDistribution = useMemo(() => {
        const total = globalStats.total || 1
        return {
            mendaftar: Math.round((globalStats.mendaftar / total) * 100),
            verifikasi: Math.round((globalStats.verifikasi / total) * 100),
            tes: Math.round((globalStats.tes / total) * 100),
            diterima: Math.round((globalStats.diterima / total) * 100),
            ditolak: Math.round((globalStats.ditolak / total) * 100),
        }
    }, [globalStats])

    const activeFilterCount = useMemo(() =>
        [filterWave, filterStatus, filterGender, filterProgram, debouncedSearch, filterDateFrom, filterDateTo].filter(Boolean).length
        , [filterWave, filterStatus, filterGender, filterProgram, debouncedSearch, filterDateFrom, filterDateTo])

    const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds])
    const selectedEnrollments = useMemo(() =>
        enrollments.filter(e => selectedIdSet.has(e.id))
        , [enrollments, selectedIdSet])
    const allSelected = enrollments.length > 0 && selectedIds.length === enrollments.length

    const isAnyModalOpen = useMemo(() =>
        !!(isFormOpen || isProfileOpen || isWaveModalOpen || activeModal || isAssessmentOpen)
        , [isFormOpen, isProfileOpen, isWaveModalOpen, activeModal, isAssessmentOpen])

    // ── FETCH WAVES ──
    const fetchWaves = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('enrollment_waves')
                .select('*')
                .order('created_at', { ascending: true })
            if (error) throw error
            setWaves(data || [])
            return data || []
        } catch (err) {
            console.error('[useEnrollmentCore] Error fetching waves:', err)
            return []
        }
    }, [])

    // ── FETCH DATA ──
    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            // 1. Fetch Waves & Classes
            const wavesData = await fetchWaves()
            const { data: classesData } = await supabase
                .from('classes')
                .select('*')
                .order('name', { ascending: true })
            setClasses(classesData || [])

            // 2. Fetch all entries for global statistics calculation
            const { data: allRows, error: statsErr } = await supabase
                .from('enrollments')
                .select('id, gender, status, wave_id, metadata, program, school_origin, created_at')
                .is('metadata->>deleted_at', null)

            if (statsErr) throw statsErr
            setAllEnrollments(allRows || [])

            const total = allRows.length
            const mendaftar = allRows.filter(e => e.status === 'mendaftar').length
            const verifikasi = allRows.filter(e => e.status === 'verifikasi').length
            const tes = allRows.filter(e => e.status === 'tes').length
            const diterima = allRows.filter(e => e.status === 'diterima').length
            const ditolak = allRows.filter(e => e.status === 'ditolak').length
            const boys = allRows.filter(e => e.gender === 'L').length
            const girls = allRows.filter(e => e.gender === 'P').length

            const activeWave = wavesData.find(w => w.is_active)
            const quota = activeWave?.quota || 0
            const quotaUsed = diterima
            const quotaLeft = Math.max(0, quota - quotaUsed)

            setGlobalStats({
                total, mendaftar, verifikasi, tes, diterima, ditolak,
                boys, girls, quota, quotaUsed, quotaLeft, activeWave
            })

            // 3. Build filtered page query
            let q = supabase
                .from('enrollments')
                .select('*, enrollment_waves(name, metadata)', { count: 'exact' })
                .is('metadata->>deleted_at', null)

            if (filterWave) q = q.eq('wave_id', filterWave)
            if (filterStatus) q = q.eq('status', filterStatus)
            if (filterGender) q = q.eq('gender', filterGender)
            if (filterProgram) q = q.eq('program', filterProgram)
            if (filterDateFrom) q = q.gte('created_at', filterDateFrom)
            if (filterDateTo) q = q.lte('created_at', filterDateTo + 'T23:59:59')

            if (debouncedSearch) {
                const s = debouncedSearch.replace(/%/g, '\\%').replace(/_/g, '\\_')
                q = q.or(`name.ilike.%${s}%,registration_number.ilike.%${s}%,nisn.ilike.%${s}%,phone.ilike.%${s}%,school_origin.ilike.%${s}%`)
            }

            if (sortBy === 'name_asc') q = q.order('name', { ascending: true })
            else if (sortBy === 'name_desc') q = q.order('name', { ascending: false })
            else if (sortBy === 'date_asc') q = q.order('created_at', { ascending: true })
            else q = q.order('created_at', { ascending: false })

            const from = (page - 1) * pageSize
            const to = from + pageSize - 1
            q = q.range(from, to)

            const { data: pageRows, count, error: pageErr } = await q
            if (pageErr) throw pageErr

            setTotalRows(count || 0)

            const transformed = (pageRows || []).map(e => {
                const meta = e.metadata || {}
                return {
                    id: e.id,
                    registration_number: e.registration_number || `PSB-${new Date(e.created_at || Date.now()).getFullYear()}-${String(e.id).slice(0, 4).toUpperCase()}`,
                    name: e.name,
                    gender: e.gender || 'L',
                    birth_place: e.birth_place || meta.birth_place || '',
                    birth_date: e.birth_date || meta.birth_date || '',
                    nisn: e.nisn || meta.nisn || '',
                    school_origin: e.school_origin || meta.school_origin || '',
                    previous_pesantren: e.previous_pesantren || meta.previous_pesantren || '',
                    phone: e.phone || meta.phone || '',
                    photo_url: e.photo_url || meta.photo_url || '',
                    program: e.program || meta.program || 'reguler',
                    quran_level: e.quran_level || meta.quran_level || 'belum',
                    hafalan_quran: e.hafalan_quran ?? meta.hafalan_quran ?? 0,
                    test_score: e.test_score || meta.test_score || null,
                    status: e.status || 'mendaftar',
                    wave_id: e.wave_id || '',
                    waveName: e.enrollment_waves?.name || '-',

                    // Metadata auxiliary nested fields
                    father_name: meta.father_name || '',
                    father_occupation: meta.father_occupation || '',
                    father_education: meta.father_education || '',
                    father_phone: meta.father_phone || '',
                    mother_name: meta.mother_name || '',
                    mother_occupation: meta.mother_occupation || '',
                    mother_education: meta.mother_education || '',
                    mother_phone: meta.mother_phone || '',
                    guardian_name: meta.guardian_name || '',
                    guardian_relation: meta.guardian_relation || '',
                    guardian_phone: meta.guardian_phone || '',
                    address: meta.address || '',
                    health_notes: meta.health_notes || '',
                    uniform_size: meta.uniform_size || 'M',
                    documents: meta.documents || {},
                    history: meta.history || [],
                    notes: e.notes || meta.notes || '',
                    interview: meta.interview || null,
                    wave_metadata: e.enrollment_waves?.metadata || {},
                    metadata: meta,
                    created_at: e.created_at
                }
            })

            setEnrollments(transformed)
        } catch (err) {
            console.error('[useEnrollmentCore] Fetch data error:', err)
            addToast('Gagal memuat data pendaftaran dari database', 'error')
        } finally {
            setLoading(false)
        }
    }, [page, pageSize, filterWave, filterStatus, filterGender, filterProgram, filterDateFrom, filterDateTo, sortBy, debouncedSearch, fetchWaves, addToast])

    useEffect(() => { fetchData() }, [fetchData])

    // Self-healing: auto-link enrollments without wave_id to the active wave
    useEffect(() => {
        if (loading || waves.length === 0 || enrollments.length === 0) return

        const activeWave = waves.find(w => w.is_active)
        if (!activeWave) return

        const unlinked = enrollments.filter(e => !e.wave_id)
        if (unlinked.length === 0) return

        const patchUnlinked = async () => {
            console.log(`[Self-Healing] Patching ${unlinked.length} enrollments to active wave: ${activeWave.name}`)
            let patchedAny = false
            for (const e of unlinked) {
                try {
                    const { error } = await supabase
                        .from('enrollments')
                        .update({ wave_id: activeWave.id })
                        .eq('id', e.id)
                    if (!error) patchedAny = true
                } catch (err) {
                    console.error('[Self-Healing] Error patching enrollment:', e.name, err)
                }
            }
            if (patchedAny) {
                fetchData()
            }
        }
        patchUnlinked()
    }, [enrollments, waves, loading, fetchData])

    // ── CRUD MUTATION ACTIONS ──
    const handleAdd = useCallback(() => {
        setSelectedEnrollment(null)
        setIsFormOpen(true)
    }, [])

    const handleEdit = useCallback((enrollment) => {
        setSelectedEnrollment(enrollment)
        setIsFormOpen(true)
    }, [])

    const handleViewProfile = useCallback((enrollment) => {
        setSelectedEnrollment(enrollment)
        setIsProfileOpen(true)
    }, [])

    const closeModal = useCallback(() => {
        setActiveModal(null)
    }, [])

    const closeForm = useCallback(() => {
        setIsFormOpen(false)
        setSelectedEnrollment(null)
    }, [])

    const closeProfile = useCallback(() => {
        setIsProfileOpen(false)
        setSelectedEnrollment(null)
    }, [])

    const handleSubmit = useCallback(async (formData) => {
        setSubmitting(true)
        try {
            const isEdit = !!(selectedEnrollment && selectedEnrollment.id)

            const payload = {
                name: formData.name,
                gender: formData.gender || 'L',
                birth_place: formData.birth_place || null,
                birth_date: formData.birth_date || null,
                nisn: formData.nisn || null,
                school_origin: formData.school_origin || null,
                previous_pesantren: formData.previous_pesantren || null,
                phone: formData.phone || null,
                photo_url: formData.photo_url || null,
                program: formData.program || 'reguler',
                quran_level: formData.quran_level || 'belum',
                hafalan_quran: formData.hafalan_quran || 0,
                status: formData.status || 'mendaftar',
                wave_id: formData.wave_id || globalStats.activeWave?.id || null,
                metadata: {
                    father_name: formData.father_name || '',
                    father_occupation: formData.father_occupation || '',
                    father_education: formData.father_education || '',
                    father_phone: formData.father_phone || '',
                    mother_name: formData.mother_name || '',
                    mother_occupation: formData.mother_occupation || '',
                    mother_education: formData.mother_education || '',
                    mother_phone: formData.mother_phone || '',
                    guardian_name: formData.guardian_name || '',
                    guardian_relation: formData.guardian_relation || '',
                    guardian_phone: formData.guardian_phone || '',
                    address: formData.address || '',
                    health_notes: formData.health_notes || '',
                    uniform_size: formData.uniform_size || 'M',
                    test_score: formData.test_score || null,
                    documents: formData.documents || {}
                }
            }

            if (isEdit) {
                const { error } = await supabase
                    .from('enrollments')
                    .update(payload)
                    .eq('id', selectedEnrollment.id)
                if (error) throw error

                await logAudit({
                    action: 'UPDATE', source: 'OPERATIONAL', tableName: 'enrollments', recordId: selectedEnrollment.id,
                    oldData: selectedEnrollment,
                    newData: { ...selectedEnrollment, ...formData }
                })
                addToast('Data pendaftaran berhasil diperbarui', 'success')
            } else {
                payload.registration_number = generateCode()

                const { data, error } = await supabase
                    .from('enrollments')
                    .insert([payload])
                    .select()
                if (error) throw error

                await logAudit({
                    action: 'INSERT', source: 'OPERATIONAL', tableName: 'enrollments', recordId: data?.[0]?.id,
                    newData: payload
                })
                addToast('Pendaftaran santri baru berhasil disimpan', 'success')
            }

            setIsFormOpen(false)
            setSelectedEnrollment(null)
            fetchData()
        } catch (err) {
            console.error('[useEnrollmentCore] Submit error:', err)
            addToast('Gagal menyimpan data pendaftaran', 'error')
        } finally {
            setSubmitting(false)
        }
    }, [selectedEnrollment, addToast, fetchData, globalStats])

    const checkForWaitingListPromotion = useCallback(async (waveId) => {
        if (!waveId) return

        try {
            const { data: wave } = await supabase
                .from('enrollment_waves')
                .select('*')
                .eq('id', waveId)
                .single()
            if (!wave) return
            const quota = wave.metadata?.quota || wave.quota || 0

            const { data: accepted } = await supabase
                .from('enrollments')
                .select('id, metadata')
                .in('status', ['diterima', 'daftar_ulang'])
                .eq('wave_id', waveId)
                .is('metadata->>deleted_at', null)

            const activeAccepted = (accepted || []).filter(e => !e.metadata?.is_waiting_list)
            const activeCount = activeAccepted.length

            if (activeCount < quota) {
                const slotsOpen = quota - activeCount

                const { data: waitingList } = await supabase
                    .from('enrollments')
                    .select('*')
                    .eq('wave_id', waveId)
                    .eq('status', 'diterima')
                    .eq('metadata->>is_waiting_list', 'true')
                    .is('metadata->>deleted_at', null)
                    .order('created_at', { ascending: true })
                    .limit(slotsOpen)

                if (waitingList && waitingList.length > 0) {
                    for (const candidate of waitingList) {
                        const meta = candidate.metadata || {}
                        const currentHistory = meta.history || []
                        const nextMeta = {
                            ...meta,
                            is_waiting_list: false,
                            history: [...currentHistory, {
                                action: 'STATUS_CHANGE',
                                from: 'waiting_list',
                                to: 'diterima',
                                timestamp: new Date().toISOString(),
                                by: 'Sistem PSB (Auto-Promote)'
                            }]
                        }

                        await supabase
                            .from('enrollments')
                            .update({ metadata: nextMeta })
                            .eq('id', candidate.id)

                        await logAudit({
                            action: 'UPDATE', source: 'OPERATIONAL', tableName: 'enrollments', recordId: candidate.id,
                            oldData: candidate,
                            newData: { ...candidate, metadata: nextMeta }
                        })

                        addToast(`Ananda ${candidate.name} otomatis dipromosikan dari Waiting List!`, 'success')
                    }
                    fetchData()
                }
            }
        } catch (err) {
            console.error('[useEnrollmentCore] Waiting list promotion error:', err)
        }
    }, [addToast, fetchData])

    const confirmDelete = useCallback((enrollment) => {
        setEnrollmentToDelete(enrollment)
        setActiveModal('delete')
    }, [])

    const executeDelete = useCallback(async () => {
        if (!enrollmentToDelete) return
        try {
            const meta = enrollmentToDelete.metadata || {}
            const nextMeta = { ...meta, deleted_at: new Date().toISOString() }
            const { error } = await supabase
                .from('enrollments')
                .update({ metadata: nextMeta })
                .eq('id', enrollmentToDelete.id)
            if (error) throw error

            addToast(`Pendaftar "${enrollmentToDelete.name}" berhasil diarsipkan`, 'success')

            await logAudit({
                action: 'UPDATE', source: 'OPERATIONAL', tableName: 'enrollments', recordId: enrollmentToDelete.id,
                oldData: enrollmentToDelete,
                newData: { ...enrollmentToDelete, metadata: nextMeta }
            })

            const wasAccepted = (enrollmentToDelete.status === 'diterima' || enrollmentToDelete.status === 'daftar_ulang') && !enrollmentToDelete.metadata?.is_waiting_list
            if (wasAccepted) {
                await checkForWaitingListPromotion(enrollmentToDelete.wave_id)
            }

            setActiveModal(null)
            setEnrollmentToDelete(null)
            fetchData()
        } catch (err) {
            console.error('[useEnrollmentCore] Archive error:', err)
            addToast('Gagal mengarsipkan data pendaftaran', 'error')
        }
    }, [enrollmentToDelete, addToast, fetchData, checkForWaitingListPromotion])

    // ── ARCHIVE FUNCTIONS ──
    const fetchArchivedEnrollments = useCallback(async () => {
        setLoadingArchived(true)
        try {
            const { data, error } = await supabase
                .from('enrollments')
                .select('*, enrollment_waves(name)')
                .not('metadata->>deleted_at', 'is', null)
                .order('created_at', { ascending: false })
            if (error) throw error
            setArchivedEnrollments((data || []).map(e => ({
                ...e,
                waveName: e.enrollment_waves?.name || '-'
            })))
        } catch (err) {
            console.error('Fetch archived error:', err)
            addToast('Gagal memuat arsip', 'error')
        } finally {
            setLoadingArchived(false)
        }
    }, [addToast])

    const handleRestoreEnrollment = useCallback(async (enrollment) => {
        try {
            const meta = { ...enrollment.metadata }
            delete meta.deleted_at

            const { error } = await supabase
                .from('enrollments')
                .update({ metadata: meta })
                .eq('id', enrollment.id)
            if (error) throw error

            addToast(`${enrollment.name} berhasil dipulihkan`, 'success')
            await logAudit({
                action: 'UPDATE',
                source: 'SYSTEM',
                tableName: 'enrollments',
                recordId: enrollment.id,
                oldData: enrollment,
                newData: { ...enrollment, metadata: meta }
            })
            fetchArchivedEnrollments()
            fetchData()
        } catch (err) {
            console.error('Restore error:', err)
            addToast('Gagal memulihkan', 'error')
        }
    }, [fetchArchivedEnrollments, fetchData, addToast])

    const handlePermanentDeleteEnrollment = useCallback(async (enrollment) => {
        try {
            const { error } = await supabase
                .from('enrollments')
                .delete()
                .eq('id', enrollment.id)
            if (error) throw error

            addToast(`${enrollment.name} dihapus permanen`, 'success')
            await logAudit({
                action: 'DELETE',
                source: 'SYSTEM',
                tableName: 'enrollments',
                recordId: enrollment.id,
                oldData: enrollment
            })
            fetchArchivedEnrollments()
        } catch (err) {
            console.error('Permanent delete error:', err)
            addToast('Gagal menghapus data', 'error')
        }
    }, [fetchArchivedEnrollments, addToast])

    // ── HELPERS & NOTIFICATIONS ──
    const generateCode = useCallback(() => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
        const part1 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
        const part2 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
        return `REG-${part1}-${part2}`
    }, [])

    const sendFonnteMessage = async (target, message) => {
        const token = import.meta.env.VITE_FONNTE_TOKEN || ''
        if (!token) return console.log('Fonnte token is not defined')
        try {
            const res = await fetch('https://api.fonnte.com/send', {
                method: 'POST',
                headers: {
                    'Authorization': token,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    target: target,
                    message: message
                })
            })
            const data = await res.json()
            return data.status === true
        } catch (err) {
            console.error('[Fonnte] Error sending message:', err)
            return false
        }
    }

    const handleSendDocumentReminders = useCallback(async () => {
        setSendingReminders(true)
        try {
            // Fetch all active enrollments in 'mendaftar' status
            const { data, error } = await supabase
                .from('enrollments')
                .select('*')
                .eq('status', 'mendaftar')
                .is('metadata->>deleted_at', null)
            
            if (error) throw error
            
            // Filter ones with incomplete documents (< 100%)
            const targets = (data || []).filter(e => {
                const meta = e.metadata || {}
                const docs = meta.documents || {}
                const presentCount = REQUIRED_DOCUMENTS.filter(d => docs[d.id]).length
                return presentCount < REQUIRED_DOCUMENTS.length
            })
            
            if (targets.length === 0) {
                addToast('Tidak ada pendaftar berstatus "Mendaftar" dengan dokumen belum lengkap.', 'info')
                return { count: 0, sent: 0 }
            }
            
            let sentCount = 0
            for (const t of targets) {
                const phone = t.phone || t.metadata?.father_phone || t.metadata?.mother_phone
                if (!phone) continue
                
                const missingDocs = REQUIRED_DOCUMENTS
                    .filter(d => !t.metadata?.documents?.[d.id])
                    .map(d => `- ${d.name}`)
                    .join('\n')
                
                const reg = t.registration_number || `PSB-${new Date(t.created_at).getFullYear()}-${String(t.id).slice(0, 4).toUpperCase()}`
                const msg = `Assalamualaikum Wr. Wb.\n\nYth. Wali dari *${t.name}*,\n\nKami menginfokan bahwa dokumen pendaftaran untuk nomor pendaftaran *${reg}* belum lengkap.\n\n*Dokumen yang kurang:*\n${missingDocs}\n\nMohon segera melengkapi dokumen di atas untuk melanjutkan proses verifikasi.\n\nTerima kasih.`
                
                let cleanPhone = phone.replace(/[^0-9]/g, '')
                if (cleanPhone.startsWith('0')) {
                    cleanPhone = '62' + cleanPhone.slice(1)
                }
                
                const sent = await sendFonnteMessage(cleanPhone, msg)
                if (sent) sentCount++
                
                // Add log audit trail to each targeted student
                const oldMeta = t.metadata || {}
                const oldHistory = oldMeta.history || []
                const newHistory = [
                    ...oldHistory,
                    {
                        date: new Date().toISOString(),
                        action: 'Kirim Pengingat Berkas',
                        user: 'System Scheduler',
                        notes: 'Pengingat dokumen kurang dikirim via WhatsApp Fonnte'
                    }
                ]
                
                await supabase
                    .from('enrollments')
                    .update({
                        metadata: {
                            ...oldMeta,
                            history: newHistory
                        }
                    })
                    .eq('id', t.id)
            }
            
            addToast(`Berhasil mengirimkan ${sentCount} pengingat dokumen kurang via WhatsApp.`, 'success')
            fetchData()
            return { count: targets.length, sent: sentCount }
        } catch (err) {
            console.error('[useEnrollmentCore] Send document reminders error:', err)
            addToast('Gagal mengirimkan pengingat dokumen', 'error')
            return { count: 0, sent: 0 }
        } finally {
            setSendingReminders(false)
        }
    }, [addToast, fetchData])

    const triggerNotification = useCallback(async (enrollment, newStatus) => {
        const phone = enrollment.phone || enrollment.father_phone || enrollment.mother_phone
        if (!phone) return

        let msg = ''
        const name = enrollment.name
        const reg = enrollment.registration_number || ''

        if (newStatus === 'verifikasi') {
            msg = `Assalamualaikum Wr. Wb.\n\nYth. Wali dari *${name}*,\n\nBerkas pendaftaran calon santri dengan nomor pendaftaran *${reg}* telah berhasil diverifikasi.\n\nTerima kasih.`
        } else if (newStatus === 'tes') {
            msg = `Assalamualaikum Wr. Wb.\n\nYth. Wali dari *${name}*,\n\nPendaftaran *${reg}* dinyatakan lolos berkas. Tahap selanjutnya adalah Ujian Seleksi.\n\nTerima kasih.`
        } else if (newStatus === 'diterima') {
            msg = `Assalamualaikum Wr. Wb.\n\nSelamat! Calon santri atas nama *${name}* (*${reg}*) dinyatakan *DITERIMA* di Muhammadiyah Boarding School Tanggul.\n\nSilakan lakukan daftar ulang. Terima kasih.`
        } else if (newStatus === 'ditolak') {
            msg = `Assalamualaikum Wr. Wb.\n\nYth. Wali dari *${name}*,\n\nKami menyampaikan permohonan maaf bahwa pendaftaran *${reg}* saat ini belum dapat diterima.\n\nTerima kasih.`
        }

        if (!msg) return

        let cleanPhone = phone.replace(/[^0-9]/g, '')
        if (cleanPhone.startsWith('0')) {
            cleanPhone = '62' + cleanPhone.slice(1)
        }

        // Try Fonnte
        const sent = await sendFonnteMessage(cleanPhone, msg)
        if (sent) {
            addToast('Notifikasi terkirim via Fonnte', 'success')
        } else {
            // Fallback to WhatsApp Web
            const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`
            window.open(url, '_blank')
            addToast('Membuka WhatsApp Web untuk notifikasi', 'info')
        }
    }, [addToast])

    const handleConvertToStudent = useCallback(async (enrollment, classId) => {
        if (!classId) {
            addToast('Silakan pilih kelas tujuan terlebih dahulu', 'warning')
            return false
        }
        setConverting(true)
        try {
            const pin = String(Math.floor(1000 + Math.random() * 9000))
            const regCode = enrollment.registration_number && enrollment.registration_number.startsWith('REG-')
                ? enrollment.registration_number
                : generateCode()

            const studentPayload = {
                registration_code: regCode,
                pin: pin,
                total_points: 0,
                name: enrollment.name,
                gender: enrollment.gender || 'L',
                class_id: classId,
                phone: enrollment.phone || enrollment.father_phone || enrollment.mother_phone || '',
                photo_url: enrollment.photo_url || '',
                nisn: enrollment.nisn || '',
                nis: enrollment.nis || '',
                birth_date: enrollment.birth_date || null,
                birth_place: enrollment.birth_place || '',
                address: enrollment.address || '',
                guardian_name: enrollment.father_name || enrollment.guardian_name || '',
                guardian_relation: enrollment.father_name ? 'Ayah' : (enrollment.guardian_relation || 'Ayah'),
                status: 'aktif',
                tags: [],
                metadata: {
                    school_origin: enrollment.school_origin || '',
                    uniform_size: enrollment.uniform_size || 'M',
                    health_notes: enrollment.health_notes || '',
                    previous_pesantren: enrollment.previous_pesantren || '',
                    father_name: enrollment.father_name || '',
                    father_occupation: enrollment.father_occupation || '',
                    father_education: enrollment.father_education || '',
                    father_phone: enrollment.father_phone || '',
                    mother_name: enrollment.mother_name || '',
                    mother_occupation: enrollment.mother_occupation || '',
                    mother_education: enrollment.mother_education || '',
                    mother_phone: enrollment.mother_phone || '',
                    converted_from_enrollment_id: enrollment.id
                }
            }

            // Insert to students
            const { data: studentData, error: studentError } = await supabase
                .from('students')
                .insert([studentPayload])
                .select()
            if (studentError) throw studentError

            // Update enrollment metadata & status
            const currentMeta = enrollment.metadata || {}
            const nextMeta = {
                ...currentMeta,
                converted_to_student: {
                    status: true,
                    converted_at: new Date().toISOString(),
                    student_id: studentData?.[0]?.id,
                    generated_nis: enrollment.nis || ''
                }
            }

            const { error: enrollUpdateErr } = await supabase
                .from('enrollments')
                .update({
                    status: 'diterima',
                    metadata: nextMeta
                })
                .eq('id', enrollment.id)
            if (enrollUpdateErr) throw enrollUpdateErr

            // Add Audit Log
            await logAudit({
                action: 'INSERT',
                source: 'SYSTEM',
                tableName: 'students',
                recordId: studentData?.[0]?.id,
                newData: studentPayload
            })

            addToast(`Santri "${enrollment.name}" berhasil dikonversi menjadi siswa aktif!`, 'success')
            setIsConvertOpen(false)
            setConvertingEnrollment(null)
            fetchData()
            return true
        } catch (err) {
            console.error('[useEnrollmentCore] Conversion error:', err)
            addToast('Gagal mengonversi pendaftar menjadi siswa aktif: ' + err.message, 'error')
            return false
        } finally {
            setConverting(false)
        }
    }, [addToast, generateCode, fetchData])

    const updateNotes = useCallback(async (enrollment, notesText) => {
        try {
            const meta = enrollment.metadata || {}
            const nextMeta = { ...meta, notes: notesText }

            // We update metadata.notes and also the notes column if it exists in the schema to ensure robustness
            const updatePayload = { metadata: nextMeta }
            if ('notes' in enrollment) {
                updatePayload.notes = notesText
            }

            const { error } = await supabase
                .from('enrollments')
                .update(updatePayload)
                .eq('id', enrollment.id)
            if (error) throw error

            addToast(`Catatan internal ${enrollment.name} berhasil disimpan`, 'success')

            await logAudit({
                action: 'UPDATE', source: 'OPERATIONAL', tableName: 'enrollments', recordId: enrollment.id,
                oldData: enrollment,
                newData: { ...enrollment, notes: notesText, metadata: nextMeta }
            })

            fetchData()

            setSelectedEnrollment(prev => {
                if (prev && prev.id === enrollment.id) {
                    return { ...prev, notes: notesText, metadata: nextMeta }
                }
                return prev
            })

            return true
        } catch (err) {
            console.error('[useEnrollmentCore] Save notes error:', err)
            addToast('Gagal menyimpan catatan internal', 'error')
            return false
        }
    }, [addToast, fetchData])

    const updateOrientation = useCallback(async (enrollment, orientationData) => {
        try {
            const meta = enrollment.metadata || {}
            const nextMeta = { ...meta, orientation: orientationData }

            const { error } = await supabase
                .from('enrollments')
                .update({ metadata: nextMeta })
                .eq('id', enrollment.id)
            if (error) throw error

            addToast(`Jadwal Orientasi ${enrollment.name} berhasil disimpan`, 'success')

            await logAudit({
                action: 'UPDATE', source: 'OPERATIONAL', tableName: 'enrollments', recordId: enrollment.id,
                oldData: enrollment,
                newData: { ...enrollment, metadata: nextMeta }
            })

            fetchData()

            setSelectedEnrollment(prev => {
                if (prev && prev.id === enrollment.id) {
                    return { ...prev, metadata: nextMeta }
                }
                return prev
            })

            return true
        } catch (err) {
            console.error('[useEnrollmentCore] Save orientation error:', err)
            addToast('Gagal menyimpan jadwal orientasi', 'error')
            return false
        }
    }, [addToast, fetchData])

    const sendOrientationNotification = useCallback(async (enrollment) => {
        const phone = enrollment.phone || enrollment.metadata?.father_phone || enrollment.metadata?.mother_phone
        if (!phone) {
            addToast('Nomor HP wali santri tidak tersedia', 'warning')
            return false
        }

        const orient = enrollment.metadata?.orientation || {}
        if (!orient.date) {
            addToast('Jadwal orientasi belum diset', 'warning')
            return false
        }

        const dateFormatted = new Date(orient.date).toLocaleDateString('id-ID', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })

        const reg = enrollment.registration_number || ''
        const msg = `Assalamualaikum Wr. Wb.\n\nYth. Wali dari *${enrollment.name}*,\n\nBerikut adalah jadwal Orientasi / Masa Pengenalan Sekolah (MOS) untuk nomor pendaftaran *${reg}*:\n\n📅 *Hari/Tanggal:* ${dateFormatted}\n⏰ *Waktu:* ${orient.time || '-'}\n📍 *Tempat/Lokasi:* ${orient.location || '-'}\n📝 *Keperluan/Catatan:* ${orient.notes || '-'}\n\nMohon hadir tepat waktu sesuai jadwal di atas. Terima kasih.`

        let cleanPhone = phone.replace(/[^0-9]/g, '')
        if (cleanPhone.startsWith('0')) {
            cleanPhone = '62' + cleanPhone.slice(1)
        }

        // Try Fonnte
        const sent = await sendFonnteMessage(cleanPhone, msg)
        if (sent) {
            addToast('Jadwal Orientasi berhasil dikirim via WhatsApp Fonnte', 'success')
            
            // Add audit log for reminder sent
            const oldMeta = enrollment.metadata || {}
            const oldHistory = oldMeta.history || []
            const newHistory = [
                ...oldHistory,
                {
                    date: new Date().toISOString(),
                    action: 'Kirim Jadwal Orientasi',
                    user: 'Panitia Pusat',
                    notes: `Jadwal orientasi dikirim via WhatsApp: ${orient.date} ${orient.time}`
                }
            ]
            await supabase
                .from('enrollments')
                .update({ metadata: { ...oldMeta, history: newHistory } })
                .eq('id', enrollment.id)
                
            fetchData()
            setSelectedEnrollment(prev => prev ? { ...prev, metadata: { ...oldMeta, history: newHistory } } : prev)
            return true
        } else {
            // Fallback to WhatsApp Web
            const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`
            window.open(url, '_blank')
            addToast('Membuka WhatsApp Web untuk mengirim Jadwal Orientasi', 'info')
            return true
        }
    }, [addToast, fetchData])


    const updatePaymentStatus = useCallback(async (enrollment, type, status, proofUrl = null) => {
        try {
            const meta = enrollment.metadata || {}
            const currentPayment = meta.payment || {}

            const nextTypePayment = {
                ...(currentPayment[type] || {}),
                status,
                proof_url: proofUrl !== undefined ? proofUrl : (currentPayment[type]?.proof_url || null),
                confirmed_at: status === 'lunas' ? new Date().toISOString() : (status === 'belum' ? null : (currentPayment[type]?.confirmed_at || null)),
                confirmed_by: status === 'lunas' ? 'Panitia Pusat' : (status === 'belum' ? null : (currentPayment[type]?.confirmed_by || null))
            }

            const nextPayment = {
                ...currentPayment,
                [type]: nextTypePayment
            }

            const nextMeta = {
                ...meta,
                payment: nextPayment
            }

            const { error } = await supabase
                .from('enrollments')
                .update({ metadata: nextMeta })
                .eq('id', enrollment.id)

            if (error) throw error

            const typeLabel = type === 'registration' ? 'Pendaftaran' : type === 'reregistration' ? 'Daftar Ulang' : 'Perlengkapan'
            addToast(`Status pembayaran ${typeLabel} ${enrollment.name} diperbarui ke ${status.toUpperCase()}`, 'success')

            await logAudit({
                action: 'UPDATE', source: 'OPERATIONAL', tableName: 'enrollments', recordId: enrollment.id,
                oldData: enrollment,
                newData: { ...enrollment, metadata: nextMeta }
            })

            fetchData()

            setSelectedEnrollment(prev => {
                if (prev && prev.id === enrollment.id) {
                    return { ...prev, metadata: nextMeta }
                }
                return prev
            })

            return true
        } catch (err) {
            console.error('[useEnrollmentCore] Save payment status error:', err)
            addToast('Gagal mengubah status pembayaran', 'error')
            return false
        }
    }, [addToast, fetchData])

    // ── STATUS TRANSITIONS ──
    const updateStatus = useCallback(async (enrollment, newStatus) => {
        // Intercept 'tes' -> 'diterima'
        if (enrollment.status === 'tes' && newStatus === 'diterima') {
            setAssessmentEnrollment(enrollment)
            setIsAssessmentOpen(true)
            return
        }

        try {
            const wasAccepted = (enrollment.status === 'diterima' || enrollment.status === 'daftar_ulang') && !enrollment.metadata?.is_waiting_list
            const waveId = enrollment.wave_id

            let isWaitingList = false
            if ((newStatus === 'diterima' || newStatus === 'daftar_ulang') && waveId) {
                const { data: wave } = await supabase
                    .from('enrollment_waves')
                    .select('*')
                    .eq('id', waveId)
                    .single()

                const quota = Number(wave?.metadata?.quota || wave?.quota || 0)
                if (quota > 0) {
                    const { data: accepted } = await supabase
                        .from('enrollments')
                        .select('id, metadata')
                        .in('status', ['diterima', 'daftar_ulang'])
                        .eq('wave_id', waveId)
                        .is('metadata->>deleted_at', null)

                    const activeAccepted = (accepted || []).filter(e => !e.metadata?.is_waiting_list && e.id !== enrollment.id)
                    const activeCount = activeAccepted.length
                    isWaitingList = activeCount >= quota
                }
            }

            const meta = enrollment.metadata || {}
            const currentHistory = meta.history || []
            const newHistory = [...currentHistory, {
                action: 'STATUS_CHANGE',
                from: enrollment.status,
                to: newStatus,
                timestamp: new Date().toISOString(),
                by: 'Panitia Pusat'
            }]
            const nextMeta = {
                ...meta,
                history: newHistory,
                is_waiting_list: isWaitingList
            }

            const { error } = await supabase
                .from('enrollments')
                .update({ status: newStatus, metadata: nextMeta })
                .eq('id', enrollment.id)
            if (error) throw error

            const cfg = getStatusConfig(newStatus)
            if (isWaitingList) {
                addToast(`Status ${enrollment.name} diubah ke ${cfg.label} (Masuk Waiting List karena kuota penuh)`, 'warning')
            } else {
                addToast(`Status ${enrollment.name} berhasil diubah ke ${cfg.label}`, 'success')
            }

            await logAudit({
                action: 'UPDATE', source: 'OPERATIONAL', tableName: 'enrollments', recordId: enrollment.id,
                oldData: enrollment,
                newData: { ...enrollment, status: newStatus, metadata: nextMeta }
            })

            if (wasAccepted && (newStatus !== 'diterima' && newStatus !== 'daftar_ulang')) {
                await checkForWaitingListPromotion(waveId)
            }

            fetchData()

            const isForward = (STATUS_ORDER[newStatus] || 0) > (STATUS_ORDER[enrollment.status] || 0)
            if (isForward) {
                triggerNotification(enrollment, newStatus)
            }
        } catch (err) {
            console.error('[useEnrollmentCore] Status transition error:', err)
            addToast('Gagal memperbarui status pendaftar', 'error')
        }
    }, [addToast, fetchData, triggerNotification, checkForWaitingListPromotion])

    const handleAssessmentSubmit = useCallback(async (formData) => {
        if (!assessmentEnrollment) return
        setSubmitting(true)
        try {
            const waveId = assessmentEnrollment.wave_id
            let isWaitingList = false
            if (waveId) {
                const { data: wave } = await supabase
                    .from('enrollment_waves')
                    .select('*')
                    .eq('id', waveId)
                    .single()

                const quota = Number(wave?.metadata?.quota || wave?.quota || 0)
                if (quota > 0) {
                    const { data: accepted } = await supabase
                        .from('enrollments')
                        .select('id, metadata')
                        .in('status', ['diterima', 'daftar_ulang'])
                        .eq('wave_id', waveId)
                        .is('metadata->>deleted_at', null)

                    const activeAccepted = (accepted || []).filter(e => !e.metadata?.is_waiting_list && e.id !== assessmentEnrollment.id)
                    const activeCount = activeAccepted.length
                    isWaitingList = activeCount >= quota
                }
            }

            const meta = assessmentEnrollment.metadata || {}
            const currentHistory = meta.history || []
            const newHistory = [...currentHistory, {
                action: 'STATUS_CHANGE',
                from: assessmentEnrollment.status,
                to: 'diterima',
                timestamp: new Date().toISOString(),
                by: 'Panitia Pusat (Penilaian Tes)'
            }]
            const nextMeta = {
                ...meta,
                history: newHistory,
                test_score: formData.test_score,
                interview: formData.interview || null,
                is_waiting_list: isWaitingList
            }

            const { error } = await supabase
                .from('enrollments')
                .update({
                    status: 'diterima',
                    quran_level: formData.quran_level,
                    hafalan_quran: formData.hafalan_quran,
                    metadata: nextMeta
                })
                .eq('id', assessmentEnrollment.id)
            if (error) throw error

            const cfg = getStatusConfig('diterima')
            if (isWaitingList) {
                addToast(`Pendaftar ${assessmentEnrollment.name} lulus seleksi & status menjadi ${cfg.label} (Masuk Waiting List karena kuota penuh)`, 'warning')
            } else {
                addToast(`Pendaftar ${assessmentEnrollment.name} lulus tes & status menjadi ${cfg.label}`, 'success')
            }

            await logAudit({
                action: 'UPDATE', source: 'OPERATIONAL', tableName: 'enrollments', recordId: assessmentEnrollment.id,
                oldData: assessmentEnrollment,
                newData: {
                    ...assessmentEnrollment,
                    status: 'diterima',
                    quran_level: formData.quran_level,
                    hafalan_quran: formData.hafalan_quran,
                    test_score: formData.test_score,
                    metadata: nextMeta
                }
            })

            fetchData()
            triggerNotification(assessmentEnrollment, 'diterima')
            setIsAssessmentOpen(false)
            setAssessmentEnrollment(null)
        } catch (err) {
            console.error('[useEnrollmentCore] Assessment error:', err)
            addToast(`Gagal: ${err.message || 'Terjadi kesalahan sistem'}`, 'error')
        } finally {
            setSubmitting(false)
        }
    }, [assessmentEnrollment, addToast, fetchData, triggerNotification])

    // ── BULK ACTIONS ──
    const toggleSelectAll = useCallback(() => {
        setSelectedIds(prev =>
            prev.length === enrollments.length
                ? []
                : enrollments.map(e => e.id)
        )
    }, [enrollments])

    const toggleSelect = useCallback((id) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        )
    }, [])

    const handleBulkApprove = useCallback(async () => {
        if (!selectedIds.length) return
        try {
            const firstId = selectedIds[0]
            const firstEnroll = selectedEnrollments.find(e => e.id === firstId)
            const waveId = firstEnroll?.wave_id

            if (waveId) {
                const { data: wave } = await supabase
                    .from('enrollment_waves')
                    .select('*')
                    .eq('id', waveId)
                    .single()

                const quota = wave?.metadata?.quota || wave?.quota || 0

                const { data: accepted } = await supabase
                    .from('enrollments')
                    .select('id, metadata')
                    .in('status', ['diterima', 'daftar_ulang'])
                    .eq('wave_id', waveId)
                    .is('metadata->>deleted_at', null)

                const activeAccepted = (accepted || []).filter(e => !e.metadata?.is_waiting_list)
                let activeCount = activeAccepted.length

                for (const enrollId of selectedIds) {
                    const e = selectedEnrollments.find(x => x.id === enrollId) || {}
                    const isWaitingList = activeCount >= quota
                    const meta = e.metadata || {}
                    const nextMeta = {
                        ...meta,
                        is_waiting_list: isWaitingList,
                        history: [...(meta.history || []), {
                            action: 'STATUS_CHANGE',
                            from: e.status || 'mendaftar',
                            to: 'diterima',
                            timestamp: new Date().toISOString(),
                            by: 'Panitia Pusat (Massal)'
                        }]
                    }

                    await supabase
                        .from('enrollments')
                        .update({ status: 'diterima', metadata: nextMeta })
                        .eq('id', enrollId)

                    if (!isWaitingList) activeCount++
                }

                addToast(`${selectedIds.length} pendaftar berhasil diproses (sebagian mungkin masuk Waiting List jika kuota penuh)`, 'success')
            } else {
                const { error } = await supabase
                    .from('enrollments')
                    .update({ status: 'diterima' })
                    .in('id', selectedIds)
                if (error) throw error
                addToast(`${selectedIds.length} pendaftar berhasil diterima`, 'success')
            }

            selectedEnrollments.forEach(e => triggerNotification(e, 'diterima'))
            setSelectedIds([])
            setActiveModal(null)
            fetchData()
        } catch (err) {
            console.error('[useEnrollmentCore] Bulk approve error:', err)
            addToast('Gagal menerima pendaftar secara massal', 'error')
        }
    }, [selectedIds, selectedEnrollments, addToast, fetchData, triggerNotification])

    const handleBulkReject = useCallback(async () => {
        if (!selectedIds.length) return
        try {
            const wavesToCheck = [...new Set(selectedEnrollments
                .filter(e => (e.status === 'diterima' || e.status === 'daftar_ulang') && !e.metadata?.is_waiting_list)
                .map(e => e.wave_id)
                .filter(Boolean))]

            const { error } = await supabase
                .from('enrollments')
                .update({ status: 'ditolak' })
                .in('id', selectedIds)
            if (error) throw error

            addToast(`${selectedIds.length} pendaftar berhasil ditolak`, 'success')
            selectedEnrollments.forEach(e => triggerNotification(e, 'ditolak'))

            for (const waveId of wavesToCheck) {
                await checkForWaitingListPromotion(waveId)
            }

            setSelectedIds([])
            setActiveModal(null)
            fetchData()
        } catch (err) {
            console.error('[useEnrollmentCore] Bulk reject error:', err)
            addToast('Gagal menolak pendaftar secara massal', 'error')
        }
    }, [selectedIds, selectedEnrollments, addToast, fetchData, triggerNotification, checkForWaitingListPromotion])

    const handleBulkArchive = useCallback(async () => {
        if (!selectedIds.length) return
        try {
            const wavesToCheck = [...new Set(selectedEnrollments
                .filter(e => (e.status === 'diterima' || e.status === 'daftar_ulang') && !e.metadata?.is_waiting_list)
                .map(e => e.wave_id)
                .filter(Boolean))]

            const { data, error: fetchErr } = await supabase
                .from('enrollments')
                .select('id, metadata')
                .in('id', selectedIds)
            if (fetchErr) throw fetchErr

            const updates = (data || []).map(row => {
                const meta = row.metadata || {}
                return supabase
                    .from('enrollments')
                    .update({ metadata: { ...meta, deleted_at: new Date().toISOString() } })
                    .eq('id', row.id)
            })

            await Promise.all(updates)

            addToast(`${selectedIds.length} pendaftar berhasil diarsipkan`, 'success')

            for (const waveId of wavesToCheck) {
                await checkForWaitingListPromotion(waveId)
            }

            setSelectedIds([])
            setActiveModal(null)
            fetchData()
        } catch (err) {
            console.error('[useEnrollmentCore] Bulk archive error:', err)
            addToast('Gagal mengarsipkan pendaftar secara massal', 'error')
        }
    }, [selectedIds, selectedEnrollments, addToast, fetchData, checkForWaitingListPromotion])

    const handleBulkStatusChange = useCallback(async (newStatus) => {
        if (!selectedIds.length) return
        try {
            const wavesToCheck = [...new Set(selectedEnrollments
                .filter(e => (e.status === 'diterima' || e.status === 'daftar_ulang') && !e.metadata?.is_waiting_list)
                .map(e => e.wave_id)
                .filter(Boolean))]

            const { error } = await supabase
                .from('enrollments')
                .update({ status: newStatus })
                .in('id', selectedIds)
            if (error) throw error

            const cfg = getStatusConfig(newStatus)
            addToast(`${selectedIds.length} pendaftar diubah status menjadi ${cfg.label}`, 'success')
            selectedEnrollments.forEach(e => {
                const isForward = (STATUS_ORDER[newStatus] || 0) > (STATUS_ORDER[e.status] || 0)
                if (isForward) {
                    triggerNotification(e, newStatus)
                }
            })

            if (newStatus !== 'diterima' && newStatus !== 'daftar_ulang') {
                for (const waveId of wavesToCheck) {
                    await checkForWaitingListPromotion(waveId)
                }
            }

            setSelectedIds([])
            setActiveModal(null)
            fetchData()
        } catch (err) {
            console.error('[useEnrollmentCore] Bulk status change error:', err)
            addToast('Gagal memperbarui status secara massal', 'error')
        }
    }, [selectedIds, selectedEnrollments, addToast, fetchData, triggerNotification, checkForWaitingListPromotion])

    // ── PHOTO UPLOAD ──
    const handlePhotoUpload = useCallback(async (file) => {
        if (!file) return null
        setUploadingPhoto(true)
        try {
            const fileName = `enrollment_${Date.now()}.${file.name?.split('.').pop() || 'jpg'}`
            const { error } = await supabase.storage.from('enrollment-photos').upload(fileName, file)
            if (error) throw error
            const { data } = supabase.storage.from('enrollment-photos').getPublicUrl(fileName)
            return data.publicUrl
        } catch (err) {
            console.error('[useEnrollmentCore] Photo upload error:', err)
            // Fallback to student-photo if bucket not found or failed
            try {
                const fileName = `enrollment_${Date.now()}.${file.name?.split('.').pop() || 'jpg'}`
                const { error } = await supabase.storage.from('student-photo').upload(fileName, file)
                if (error) throw error
                const { data } = supabase.storage.from('student-photo').getPublicUrl(fileName)
                return data.publicUrl
            } catch (fallbackErr) {
                console.error('[useEnrollmentCore] Fallback photo upload error:', fallbackErr)
                return null
            }
        } finally {
            setUploadingPhoto(false)
        }
    }, [])

    // ── FILTER RESET ──
    const resetAllFilters = useCallback(() => {
        setSearchQuery('')
        setFilterWave('')
        setFilterStatus('')
        setFilterGender('')
        setFilterProgram('')
        setFilterDateFrom('')
        setFilterDateTo('')
        setSortBy('date_desc')
        setPage(1)
    }, [])

    return {
        // Data
        enrollments,
        waves,
        loading,
        totalRows,
        globalStats,
        pipelineDistribution,
        archivedEnrollments,
        loadingArchived,

        // Filters
        searchQuery, setSearchQuery,
        debouncedSearch,
        filterWave, setFilterWave,
        filterStatus, setFilterStatus,
        filterGender, setFilterGender,
        filterProgram, setFilterProgram,
        filterDateFrom, setFilterDateFrom,
        filterDateTo, setFilterDateTo,
        sortBy, setSortBy,
        activeFilterCount,
        resetAllFilters,

        // Pagination
        page, setPage,
        pageSize, setPageSize,

        // Modals
        isFormOpen, setIsFormOpen,
        isProfileOpen, setIsProfileOpen,
        isWaveModalOpen, setIsWaveModalOpen,
        activeModal, setActiveModal,
        isAnyModalOpen,
        isConvertOpen, setIsConvertOpen,
        isAssessmentOpen, setIsAssessmentOpen,
        assessmentEnrollment, setAssessmentEnrollment,

        // Actions
        selectedEnrollment, setSelectedEnrollment,
        enrollmentToDelete,
        selectedIds, setSelectedIds,
        selectedIdSet,
        selectedEnrollments,
        allSelected,
        submitting,
        uploadingPhoto,
        sendingReminders,
        convertingEnrollment, setConvertingEnrollment,
        converting,
        classes,
        allEnrollments,

        // Functions
        fetchData,
        handleAdd, handleEdit, handleViewProfile,
        closeModal, closeForm, closeProfile,
        handleSubmit, confirmDelete, executeDelete,
        updateStatus, handleAssessmentSubmit, updateNotes, updatePaymentStatus, updateOrientation, sendOrientationNotification,
        toggleSelectAll, toggleSelect,
        handleBulkApprove, handleBulkReject,
        fetchArchivedEnrollments,
        handleRestoreEnrollment,
        handlePermanentDeleteEnrollment,
        handleBulkArchive,
        handleBulkStatusChange,
        handleConvertToStudent,
        generateCode,
        handlePhotoUpload,
        handleSendDocumentReminders,

        // Refs
        searchInputRef,
    }
}
