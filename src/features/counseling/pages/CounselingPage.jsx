import React, { useState, useEffect, useMemo } from 'react'
import { supabase } from '@lib/supabase'
import { useToast, useLanguage, useAuth } from '@context'
import DashboardLayout from '@core/layouts/DashboardLayout'
import {
    PageHeader,
    StatCard,
    StatsCarousel,
    Pagination,
    RichSelect,
    Modal
} from '@shared/components'
import { askAi } from '@lib/ai'
import {
    HeartHandshake, Search, Plus, Trash2, X, Edit2,
    Calendar, User, Clock, AlertCircle, FileSpreadsheet,
    Download, Check, FileText, CheckCircle2,
    Printer, Sparkles, AlertTriangle, Info
} from 'lucide-react'

// Local storage key for fallback persistence
const LS_COUNSELING_LOGS = 'laporanmu_counseling_logs'

// High-quality mock sessions for instant offline/initial bootstrap
const INITIAL_MOCK_LOGS = [
    {
        id: 'c-1',
        date: new Date().toISOString().split('T')[0],
        time: '09:30',
        student_id: 'std-1',
        student_name: 'Ahmad Fauzi',
        class_name: 'Kelas 10-A',
        counselor_name: 'Ustadz H. Akhmad Hambali, S.Psi.',
        category: 'pribadi',
        complaint: 'Sering menangis di malam hari karena sangat merindukan rumah (homesick), nafsu makan menurun drastis, dan menolak berinteraksi dengan teman satu kamarnya.',
        diagnosis: 'Homesickness & Hambatan Penyesuaian Diri',
        action_plan: 'Berikan bimbingan konseling supportif secara rutin, berkoordinasi dengan Musyrif asrama untuk memberikan perhatian ekstra, serta izinkan telepon keluarga terjadwal seminggu sekali.',
        urgency: 'sedang',
        status: 'selesai',
        created_at: new Date(Date.now() - 3600000 * 2).toISOString()
    },
    {
        id: 'c-2',
        date: new Date().toISOString().split('T')[0],
        time: '14:00',
        student_id: 'std-2',
        student_name: 'Yusuf Al-Fatih',
        class_name: 'Kelas 11-B',
        counselor_name: 'Ustadz H. Akhmad Hambali, S.Psi.',
        category: 'akademik',
        complaint: 'Mengalami penurunan motivasi belajar yang signifikan pada semester genap ini, sering tertidur di kelas saat KBM berlangsung, dan tugas sekolah banyak yang menunggak.',
        diagnosis: 'Penurunan Motivasi Belajar (Demotivasi)',
        action_plan: 'Lakukan konseling kognitif untuk mengidentifikasi penyebab kelelahan mental santri, bantu susun jadwal belajar mandiri yang realistis, dan berikan sesi monitoring mingguan.',
        urgency: 'ringan',
        status: 'selesai',
        created_at: new Date(Date.now() - 3600000 * 5).toISOString()
    },
    {
        id: 'c-3',
        date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
        time: '10:15',
        student_id: 'std-3',
        student_name: 'Fathimah Az-Zahra',
        class_name: 'Kelas 10-B',
        counselor_name: 'Ustadzah Siti Aminah, S.Pd.',
        category: 'sosial',
        complaint: 'Mengalami konflik dan kesalahpahaman verbal dengan teman sekamarnya terkait pembagian piket kebersihan kamar asrama, sehingga suasana kamar menjadi canggung.',
        diagnosis: 'Konflik Sosial Teman Sebaya (Peer Dispute)',
        action_plan: 'Lakukan mediasi kedua belah pihak di ruang BK secara netral, fasilitasi penyusunan kesepakatan damai, serta buat aturan piket asrama yang disetujui bersama.',
        urgency: 'sedang',
        status: 'proses',
        created_at: new Date(Date.now() - 86400000).toISOString()
    },
    {
        id: 'c-4',
        date: new Date(Date.now() - 86400000 * 3).toISOString().split('T')[0],
        time: '08:00',
        student_id: 'std-4',
        student_name: 'Ali bin Abi Thalib',
        class_name: 'Kelas 12-A',
        counselor_name: 'Ustadz H. Akhmad Hambali, S.Psi.',
        category: 'pribadi',
        complaint: 'Menunjukkan gejala kecemasan berlebih (anxiety) menjelang Ujian Akhir Sekolah. Tangan sering gemetar, keringat dingin, dan mengalami insomnia akut selama 5 hari terakhir.',
        diagnosis: 'Kecemasan Akademik Akut (Exam Anxiety)',
        action_plan: 'Berikan sesi terapi relaksasi pernapasan terpandu, ajarkan teknik self-talk positif, berkoordinasi dengan wali santri untuk memberikan dukungan moral tanpa menuntut berlebihan.',
        urgency: 'tinggi',
        status: 'proses',
        created_at: new Date(Date.now() - 86400000 * 3).toISOString()
    }
]

export default function CounselingPage() {
    const { addToast } = useToast()
    const { language, tNum } = useLanguage()
    const { profile } = useAuth()

    // View States
    const [viewMode, setViewMode] = useState('list') // 'list' | 'timeline'
    const [logs, setLogs] = useState([])
    const [studentsList, setStudentsList] = useState([])
    const [classesList, setClassesList] = useState([])
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [aiLoading, setAiLoading] = useState(false)

    // Filters & Pagination
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('All')
    const [selectedUrgencyFilter, setSelectedUrgencyFilter] = useState('All')
    const [selectedStatusFilter, setSelectedStatusFilter] = useState('All')
    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(8)

    // Modals
    const [isSessionModalOpen, setIsSessionModalOpen] = useState(false)
    const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false)
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false)

    // Selection / Active State
    const [activeLog, setActiveLog] = useState(null)
    const [logToDelete, setLogToDelete] = useState(null)
    const [logToPrint, setLogToPrint] = useState(null)

    // Form Inputs
    const [formLog, setFormLog] = useState({
        student_id: '',
        date: new Date().toISOString().split('T')[0],
        time: new Date().toTimeString().split(' ')[0].slice(0, 5),
        counselor_name: '',
        category: 'pribadi',
        complaint: '',
        diagnosis: '',
        action_plan: '',
        urgency: 'ringan',
        status: 'proses'
    })

    // Auto set counselor name to current logged-in user profile
    useEffect(() => {
        if (profile?.name && !formLog.counselor_name) {
            setFormLog(prev => ({ ...prev, counselor_name: profile.name }))
        }
    }, [profile, isSessionModalOpen])

    // --- Fetch Data ---
    const fetchData = async () => {
        setLoading(true)
        try {
            // 1. Fetch Students
            const { data: stdData, error: stdErr } = await supabase
                .from('students')
                .select('id, name, class_id, classes(name)')
                .is('deleted_at', null)
                .order('name')

            let fetchedStudents = []
            if (!stdErr && stdData) {
                fetchedStudents = stdData.map(s => ({
                    id: s.id,
                    name: s.name,
                    class_name: s.classes?.name || 'Tanpa Kelas'
                }))
                setStudentsList(fetchedStudents)
            } else {
                // local fallback mock students
                fetchedStudents = [
                    { id: 'std-1', name: 'Ahmad Fauzi', class_name: 'Kelas 10-A' },
                    { id: 'std-2', name: 'Yusuf Al-Fatih', class_name: 'Kelas 11-B' },
                    { id: 'std-3', name: 'Fathimah Az-Zahra', class_name: 'Kelas 10-B' },
                    { id: 'std-4', name: 'Ali bin Abi Thalib', class_name: 'Kelas 12-A' },
                    { id: 'std-5', name: 'Hamzah bin Abdul Muthalib', class_name: 'Kelas 12-B' }
                ]
                setStudentsList(fetchedStudents)
            }

            // 2. Fetch Classes
            const { data: clsData, error: clsErr } = await supabase
                .from('classes')
                .select('id, name')
                .order('name')

            if (!clsErr && clsData) {
                setClassesList(clsData)
            }

            // 3. Fetch Counseling Logs from Supabase
            const { data: sessionsData, error: sessionsErr } = await supabase
                .from('counseling_logs')
                .select('*')
                .order('date', { ascending: false })
                .order('time', { ascending: false })

            if (!sessionsErr && sessionsData) {
                setLogs(sessionsData)
                localStorage.setItem(LS_COUNSELING_LOGS, JSON.stringify(sessionsData))
            } else {
                console.warn('[CounselingPage] Menggunakan fallback database lokal.')
                const local = localStorage.getItem(LS_COUNSELING_LOGS)
                if (local) {
                    setLogs(JSON.parse(local))
                } else {
                    setLogs(INITIAL_MOCK_LOGS)
                    localStorage.setItem(LS_COUNSELING_LOGS, JSON.stringify(INITIAL_MOCK_LOGS))
                }
            }
        } catch (err) {
            console.error('[CounselingPage] Error loading data:', err)
            addToast('Gagal terhubung dengan server, menggunakan cache lokal.', 'warning')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [])

    // --- Actions ---

    // Save record to Supabase with local storage fallback
    const handleSaveRecord = async (e) => {
        e.preventDefault()
        if (!formLog.student_id) {
            addToast('Silakan pilih santri terlebih dahulu', 'error')
            return
        }

        const selectedStudent = studentsList.find(s => s.id === formLog.student_id)

        setSubmitting(true)
        try {
            const currentObj = {
                date: formLog.date || new Date().toISOString().split('T')[0],
                time: formLog.time || new Date().toTimeString().split(' ')[0].slice(0, 5),
                student_id: formLog.student_id,
                student_name: selectedStudent?.name || 'Santri',
                class_name: selectedStudent?.class_name || 'Umum',
                counselor_name: formLog.counselor_name || profile?.name || 'Konselor',
                category: formLog.category,
                complaint: formLog.complaint,
                diagnosis: formLog.diagnosis,
                action_plan: formLog.action_plan,
                urgency: formLog.urgency,
                status: formLog.status
            }

            let insertedData = null

            if (activeLog) {
                // UPDATE IN SUPABASE
                const { data, error } = await supabase
                    .from('counseling_logs')
                    .update(currentObj)
                    .eq('id', activeLog.id)
                    .select()

                if (error) throw error
                insertedData = data?.[0] || { ...currentObj, id: activeLog.id, created_at: activeLog.created_at }

                setLogs(prev => prev.map(l => l.id === activeLog.id ? insertedData : l))
                addToast('Sesi konseling berhasil diperbarui', 'success')
            } else {
                // INSERT IN SUPABASE
                const { data, error } = await supabase
                    .from('counseling_logs')
                    .insert([currentObj])
                    .select()

                if (error) throw error
                insertedData = data?.[0] || { ...currentObj, id: `c-${Date.now()}`, created_at: new Date().toISOString() }

                setLogs(prev => [insertedData, ...prev])
                addToast('Sesi konseling berhasil dicatat', 'success')
            }

            // Sync cache
            const nextLogs = activeLog
                ? logs.map(l => l.id === activeLog.id ? insertedData : l)
                : [insertedData, ...logs]
            localStorage.setItem(LS_COUNSELING_LOGS, JSON.stringify(nextLogs))

            setIsSessionModalOpen(false)
            setActiveLog(null)
        } catch (err) {
            console.error('[CounselingPage] Gagal menyimpan ke Supabase, fallback ke local:', err.message)

            // Local Storage fallback flow
            const backupId = activeLog ? activeLog.id : `c-${Date.now()}`
            const backupObj = {
                id: backupId,
                date: formLog.date || new Date().toISOString().split('T')[0],
                time: formLog.time || new Date().toTimeString().split(' ')[0].slice(0, 5),
                student_id: formLog.student_id,
                student_name: selectedStudent?.name || 'Santri',
                class_name: selectedStudent?.class_name || 'Umum',
                counselor_name: formLog.counselor_name || profile?.name || 'Konselor',
                category: formLog.category,
                complaint: formLog.complaint,
                diagnosis: formLog.diagnosis,
                action_plan: formLog.action_plan,
                urgency: formLog.urgency,
                status: formLog.status,
                created_at: activeLog ? activeLog.created_at : new Date().toISOString()
            }

            let nextLogs = []
            if (activeLog) {
                nextLogs = logs.map(l => l.id === activeLog.id ? backupObj : l)
                addToast('Sesi konseling disimpan secara lokal (Offline)', 'info')
            } else {
                nextLogs = [backupObj, ...logs]
                addToast('Sesi konseling berhasil dicatat secara lokal (Offline)', 'info')
            }

            setLogs(nextLogs)
            localStorage.setItem(LS_COUNSELING_LOGS, JSON.stringify(nextLogs))
            setIsSessionModalOpen(false)
            setActiveLog(null)
        } finally {
            setSubmitting(false)
        }
    }

    // Toggle session status (proses <-> selesai)
    const handleToggleStatus = async (item) => {
        const nextStatus = item.status === 'selesai' ? 'proses' : 'selesai'
        try {
            const { error } = await supabase
                .from('counseling_logs')
                .update({ status: nextStatus })
                .eq('id', item.id)

            if (error) throw error
            setLogs(prev => prev.map(l => l.id === item.id ? { ...l, status: nextStatus } : l))
            addToast(`Status sesi diubah menjadi ${nextStatus === 'selesai' ? 'Selesai' : 'Dalam Proses'}`, 'success')
        } catch {
            // offline fallback
            const nextLogs = logs.map(l => l.id === item.id ? { ...l, status: nextStatus } : l)
            setLogs(nextLogs)
            localStorage.setItem(LS_COUNSELING_LOGS, JSON.stringify(nextLogs))
            addToast(`Status sesi diubah secara lokal menjadi ${nextStatus === 'selesai' ? 'Selesai' : 'Dalam Proses'}`, 'info')
        }
    }

    // Delete a record
    const handleDeleteRecord = async () => {
        if (!logToDelete) return
        try {
            const { error } = await supabase
                .from('counseling_logs')
                .delete()
                .eq('id', logToDelete.id)

            if (error) throw error
            setLogs(prev => prev.filter(l => l.id !== logToDelete.id))
            addToast('Sesi konseling berhasil dihapus', 'success')
        } catch {
            // offline fallback
            const nextLogs = logs.filter(l => l.id !== logToDelete.id)
            setLogs(nextLogs)
            localStorage.setItem(LS_COUNSELING_LOGS, JSON.stringify(nextLogs))
            addToast('Sesi konseling dihapus dari penyimpanan lokal', 'info')
        } finally {
            setIsConfirmDeleteOpen(false)
            setLogToDelete(null)
        }
    }

    // --- Smart AI Counseling Helper (Groq LLM + Local Heuristic Fallback Engine) ---
    const handleAIAnalyze = async () => {
        if (!formLog.complaint.trim()) {
            addToast('Tuliskan keluhan atau deskripsi masalah santri terlebih dahulu untuk dianalisis AI', 'warning')
            return
        }

        setAiLoading(true)
        addToast('Asisten BK AI sedang menganalisis masalah...', 'info')

        try {
            // 1. Calling the powerful Groq AI model using "counseling" type
            const rawResponse = await askAi(formLog.complaint, "counseling")

            if (rawResponse && !rawResponse.startsWith("Error") && !rawResponse.includes("API Key Groq")) {
                try {
                    const parsed = JSON.parse(rawResponse)

                    setFormLog(prev => ({
                        ...prev,
                        diagnosis: parsed.diagnosis || prev.diagnosis,
                        action_plan: parsed.treatment || prev.action_plan,
                        category: parsed.category || prev.category,
                        urgency: parsed.urgency || prev.urgency
                    }))

                    addToast('Analisis cerdas Konselor AI Groq berhasil diterapkan!', 'success')
                    setAiLoading(false)
                    return
                } catch (jsonErr) {
                    console.warn('[CounselingPage] JSON parse error, falling back to heuristics:', jsonErr)
                }
            }

            // 2. Fallback heuristic rules engine
            setTimeout(() => {
                const text = formLog.complaint.toLowerCase()
                let suggested = {
                    diagnosis: 'Bimbingan Karakter Rutin',
                    action_plan: 'Lakukan percakapan mendalam, dengarkan dengan empati, dan berikan nasihat pembinaan akhlak santri.',
                    category: 'pribadi',
                    urgency: 'ringan'
                }

                // Heuristic mapping rules
                if (text.includes('kangen') || text.includes('rumah') || text.includes('menangis') || text.includes('pulang') || text.includes('ortu') || text.includes('orang tua')) {
                    suggested = {
                        diagnosis: 'Homesickness & Kesulitan Adaptasi',
                        action_plan: 'Berikan bimbingan emosional supportif, motivasi santri, berkoordinasi dengan Musyrif asrama, dan izinkan telepon keluarga.',
                        category: 'pribadi',
                        urgency: 'sedang'
                    }
                } else if (text.includes('berantem') || text.includes('teman') || text.includes('kamar') || text.includes('bertengkar') || text.includes('ejek') || text.includes('konflik')) {
                    suggested = {
                        diagnosis: 'Konflik Sosial Teman Sebaya',
                        action_plan: 'Lakukan mediasi damai kedua belah pihak di ruang BK, buat kesepakatan tertulis bersama, dan pantau hubungan mereka.',
                        category: 'sosial',
                        urgency: 'sedang'
                    }
                } else if (text.includes('malas') || text.includes('belajar') || text.includes('tidur') || text.includes('tugas') || text.includes('nilai') || text.includes('kbm') || text.includes('sekolah')) {
                    suggested = {
                        diagnosis: 'Penurunan Motivasi Belajar (Demotivasi)',
                        action_plan: 'Lakukan konseling akademik, bantu susun jadwal belajar mandiri yang teratur, dan monitor perkembangannya bersama wali kelas.',
                        category: 'akademik',
                        urgency: 'ringan'
                    }
                } else if (text.includes('kuliah') || text.includes('kerja') || text.includes('lanjut') || text.includes('universitas') || text.includes('jurusan') || text.includes('masa depan')) {
                    suggested = {
                        diagnosis: 'Kebingungan Perencanaan Karir Lanjutan',
                        action_plan: 'Eksplorasi minat bakat melalui tes kepribadian ringan, berikan peta pilihan universitas/pondok, dan beri motivasi karir.',
                        category: 'karir',
                        urgency: 'ringan'
                    }
                } else if (text.includes('gemeter') || text.includes('takut') || text.includes('cemas') || text.includes('insomnia') || text.includes('panik') || text.includes('jantung')) {
                    suggested = {
                        diagnosis: 'Kecemasan Berlebih (Anxiety State)',
                        action_plan: 'Bimbing santri melakukan teknik relaksasi pernapasan 4-7-8, ajarkan mind-calming, dan beritahu wali santri untuk support moral.',
                        category: 'pribadi',
                        urgency: 'tinggi'
                    }
                }

                setFormLog(prev => ({
                    ...prev,
                    diagnosis: suggested.diagnosis,
                    action_plan: suggested.action_plan,
                    category: suggested.category,
                    urgency: suggested.urgency
                }))

                addToast('Rekomendasi asisten BK lokal berhasil diterapkan!', 'success')
                setAiLoading(false)
            }, 800)

        } catch (err) {
            console.error('[CounselingPage] AI Analyze failure:', err)
            addToast('Gagal memproses dengan asisten AI', 'error')
            setAiLoading(false)
        }
    }

    // --- Filter & Search Logic ---
    const filteredLogs = useMemo(() => {
        return logs.filter(log => {
            const matchesSearch =
                (log.student_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (log.counselor_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (log.complaint || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (log.diagnosis || '').toLowerCase().includes(searchQuery.toLowerCase())

            const matchesCategory = selectedCategoryFilter === 'All' || log.category === selectedCategoryFilter
            const matchesUrgency = selectedUrgencyFilter === 'All' || log.urgency === selectedUrgencyFilter
            const matchesStatus = selectedStatusFilter === 'All' || log.status === selectedStatusFilter

            return matchesSearch && matchesCategory && matchesUrgency && matchesStatus
        })
    }, [logs, searchQuery, selectedCategoryFilter, selectedUrgencyFilter, selectedStatusFilter])

    // Pagination
    const totalRows = filteredLogs.length
    const totalPages = Math.ceil(totalRows / pageSize)
    const paginatedLogs = useMemo(() => {
        const start = (page - 1) * pageSize
        return filteredLogs.slice(start, start + pageSize)
    }, [filteredLogs, page, pageSize])

    useEffect(() => {
        setPage(1)
    }, [searchQuery, selectedCategoryFilter, selectedUrgencyFilter, selectedStatusFilter])

    // --- Statistics ---
    const stats = useMemo(() => {
        const total = logs.length
        const completed = logs.filter(l => l.status === 'selesai').length
        const active = total - completed
        const highUrgency = logs.filter(l => l.urgency === 'tinggi').length

        return { total, completed, active, highUrgency }
    }, [logs])

    // --- Grouping by Date for Timeline View ---
    const timelineGroups = useMemo(() => {
        const map = {}
        filteredLogs.forEach(log => {
            const key = log.date || 'Tanggapan Lain'
            if (!map[key]) map[key] = []
            map[key].push(log)
        })
        // Sort dates descending
        return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]))
    }, [filteredLogs])

    // --- Open Add / Edit Modals ---
    const openAddModal = () => {
        setActiveLog(null)
        setFormLog({
            student_id: '',
            date: new Date().toISOString().split('T')[0],
            time: new Date().toTimeString().split(' ')[0].slice(0, 5),
            counselor_name: profile?.name || '',
            category: 'pribadi',
            complaint: '',
            diagnosis: '',
            action_plan: '',
            urgency: 'ringan',
            status: 'proses'
        })
        setIsSessionModalOpen(true)
    }

    const openEditModal = (log) => {
        setActiveLog(log)
        setFormLog({
            student_id: log.student_id,
            date: log.date,
            time: log.time,
            counselor_name: log.counselor_name,
            category: log.category,
            complaint: log.complaint,
            diagnosis: log.diagnosis,
            action_plan: log.action_plan,
            urgency: log.urgency,
            status: log.status
        })
        setIsSessionModalOpen(true)
    }

    // --- Print Utility ---
    const handlePrint = (log) => {
        setLogToPrint(log)
        setIsPrintModalOpen(true)
    }

    const executePrintWindow = () => {
        const printWindow = window.open('', '_blank', 'width=800,height=900')
        if (!printWindow) return

        const categoryLabels = {
            pribadi: 'Bimbingan Pribadi (Personal)',
            sosial: 'Bimbingan Sosial (Interaksi)',
            akademik: 'Bimbingan Akademik (Belajar)',
            karir: 'Bimbingan Karir & Lanjutan'
        }

        const urgencyLabels = {
            ringan: 'Ringan (Rutin)',
            sedang: 'Sedang (Perlu Perhatian)',
            tinggi: 'Tinggi (Darurat/Khusus)'
        }

        const statusLabels = {
            proses: 'DALAM PROSES PEMBINAAN',
            selesai: 'SELESAI / PAMPANG SOLUSI'
        }

        const htmlContent = `
            <html>
            <head>
                <title>Laporan Hasil Konseling Santri - ${logToPrint.student_name}</title>
                <style>
                    body {
                        font-family: 'Times New Roman', serif;
                        margin: 40px;
                        font-size: 14px;
                        color: #1e293b;
                        line-height: 1.5;
                    }
                    .header {
                        text-align: center;
                        border-bottom: 3px double #000;
                        padding-bottom: 12px;
                        margin-bottom: 25px;
                    }
                    .header h2 {
                        margin: 0;
                        font-size: 20px;
                        font-weight: bold;
                    }
                    .header p {
                        margin: 4px 0 0;
                        font-size: 12px;
                        font-style: italic;
                    }
                    .title {
                        text-align: center;
                        text-decoration: underline;
                        font-size: 16px;
                        font-weight: bold;
                        margin-bottom: 25px;
                        text-transform: uppercase;
                    }
                    .info-table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-bottom: 25px;
                    }
                    .info-table td {
                        padding: 6px 4px;
                        vertical-align: top;
                    }
                    .info-table td.label {
                        width: 25%;
                        font-weight: bold;
                    }
                    .info-table td.colon {
                        width: 3%;
                    }
                    .content-section {
                        margin-bottom: 20px;
                    }
                    .content-section h3 {
                        font-size: 14px;
                        border-bottom: 1px solid #94a3b8;
                        padding-bottom: 4px;
                        margin: 0 0 8px 0;
                        text-transform: uppercase;
                        font-weight: bold;
                    }
                    .content-section p {
                        margin: 0;
                        text-align: justify;
                        white-space: pre-line;
                    }
                    .badge {
                        display: inline-block;
                        border: 1px solid #000;
                        padding: 2px 8px;
                        font-size: 11px;
                        font-weight: bold;
                        border-radius: 4px;
                    }
                    .signature-area {
                        margin-top: 60px;
                        width: 100%;
                        display: flex;
                        justify-content: space-between;
                    }
                    .signature-box {
                        width: 40%;
                        text-align: center;
                    }
                    .signature-space {
                        height: 70px;
                    }
                    @media print {
                        body { margin: 20px; }
                        button { display: none; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h2>MAJELIS PENDIDIKAN DASAR DAN MENENGAH</h2>
                    <h2>PONDOK PESANTREN MBS TANGGUL JEMBER</h2>
                    <p>Jl. K.H. Dewantara No. 17, Tanggul, Kabupaten Jember, Jawa Timur 68155</p>
                </div>

                <div class="title">KARTU REKAM BIMBINGAN KONSELING (BK)</div>

                <table class="info-table">
                    <tr>
                        <td class="label">Nama Santri</td>
                        <td class="colon">:</td>
                        <td><strong>${logToPrint.student_name}</strong></td>
                    </tr>
                    <tr>
                        <td class="label">Kelas / Kamar</td>
                        <td class="colon">:</td>
                        <td>${logToPrint.class_name || 'Umum'}</td>
                    </tr>
                    <tr>
                        <td class="label">Tanggal & Jam</td>
                        <td class="colon">:</td>
                        <td>${new Date(logToPrint.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })} pukul ${logToPrint.time} WIB</td>
                    </tr>
                    <tr>
                        <td class="label">Kategori Bimbingan</td>
                        <td class="colon">:</td>
                        <td>${categoryLabels[logToPrint.category] || logToPrint.category}</td>
                    </tr>
                    <tr>
                        <td class="label">Tingkat Urgensi</td>
                        <td class="colon">:</td>
                        <td><span class="badge">${urgencyLabels[logToPrint.urgency] || logToPrint.urgency}</span></td>
                    </tr>
                    <tr>
                        <td class="label">Status Kasus</td>
                        <td class="colon">:</td>
                        <td><strong>${statusLabels[logToPrint.status] || logToPrint.status}</strong></td>
                    </tr>
                </table>

                <div class="content-section">
                    <h3>1. Deskripsi Keluhan & Gejala Permasalahan</h3>
                    <p>${logToPrint.complaint || '—'}</p>
                </div>

                <div class="content-section">
                    <h3>2. Identifikasi / Diagnosis Konselor</h3>
                    <p>${logToPrint.diagnosis || '—'}</p>
                </div>

                <div class="content-section">
                    <h3>3. Tindakan & Rencana Solusi Tindak Lanjut</h3>
                    <p>${logToPrint.action_plan || '—'}</p>
                </div>

                <div class="signature-area">
                    <div class="signature-box">
                        <p>Mengetahui,</p>
                        <p><strong>Kepala Sekolah / Pengasuh</strong></p>
                        <div class="signature-space"></div>
                        <p>__________________________</p>
                    </div>
                    <div class="signature-box">
                        <p>Tanggul, ${new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                        <p><strong>Guru Bimbingan & Konseling</strong></p>
                        <div class="signature-space"></div>
                        <p><strong>${logToPrint.counselor_name || '—'}</strong></p>
                    </div>
                </div>

                <script>
                    window.onload = function() {
                        window.print();
                        setTimeout(function() { window.close(); }, 500);
                    }
                </script>
            </body>
            </html>
        `
        printWindow.document.write(htmlContent)
        printWindow.document.close()
        setIsPrintModalOpen(false)
    }

    // --- Export CSV / Excel ---
    const handleExportCSV = () => {
        if (logs.length === 0) {
            addToast('Tidak ada data konseling yang dapat diekspor', 'warning')
            return
        }

        const headers = ['ID', 'Tanggal', 'Jam', 'Nama Santri', 'Kelas', 'Konselor', 'Kategori', 'Masalah', 'Diagnosis BK', 'Rencana Tindakan', 'Urgensi', 'Status']
        const csvRows = [headers.join(';')]

        logs.forEach(l => {
            const row = [
                l.id,
                l.date,
                l.time,
                `"${(l.student_name || '').replace(/"/g, '""')}"`,
                `"${(l.class_name || '').replace(/"/g, '""')}"`,
                `"${(l.counselor_name || '').replace(/"/g, '""')}"`,
                l.category,
                `"${(l.complaint || '').replace(/"/g, '""')}"`,
                `"${(l.diagnosis || '').replace(/"/g, '""')}"`,
                `"${(l.action_plan || '').replace(/"/g, '""')}"`,
                l.urgency,
                l.status
            ]
            csvRows.push(row.join(';'))
        })

        const csvString = '\uFEFF' + csvRows.join('\n') // Adding BOM for Excel compatibility
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)

        const link = document.createElement('a')
        link.setAttribute('href', url)
        link.setAttribute('download', `rekap_bimbingan_konseling_${new Date().toISOString().slice(0, 10)}.csv`)
        link.style.visibility = 'hidden'

        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)

        addToast('Laporan konseling berhasil diekspor ke Excel (CSV) ✓', 'success')
    }

    // Helper options for Student Select
    const studentOptions = useMemo(() => {
        return studentsList.map(s => ({
            id: s.id,
            name: s.name,
            group: s.class_name
        }))
    }, [studentsList])

    // Utility Labels styling helper
    const getUrgencyBadge = (urgency) => {
        const styles = {
            ringan: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs font-semibold py-0.5 px-2 rounded-full border',
            sedang: 'bg-amber-500/10 text-amber-600 border-amber-500/20 text-xs font-semibold py-0.5 px-2 rounded-full border',
            tinggi: 'bg-rose-500/15 text-rose-600 border-rose-500/20 text-xs font-bold py-0.5 px-2 rounded-full border animate-pulse'
        }
        const labels = { ringan: '🟢 Ringan', sedang: '🟡 Sedang', tinggi: '🔴 Tinggi' }
        return <span className={styles[urgency] || styles.ringan}>{labels[urgency] || urgency}</span>
    }

    const getCategoryBadge = (category) => {
        const styles = {
            pribadi: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
            sosial: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
            akademik: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
            karir: 'bg-teal-500/10 text-teal-600 border-teal-500/20'
        }
        const labels = { pribadi: 'Pribadi', sosial: 'Sosial', akademik: 'Belajar', karir: 'Karir' }
        return <span className={`text-[10px] font-bold py-0.5 px-2 rounded-lg border uppercase tracking-wider ${styles[category] || ''}`}>{labels[category] || category}</span>
    }

    return (
        <DashboardLayout title="Konseling & BK">
            <div className="p-4 md:p-6 space-y-5">

                {/* Header */}
                <PageHeader
                    title="Bimbingan & Konseling (BK)"
                    subtitle="Pusat pembinaan karakter, solusi psikososial, dan arahan karir santri MBS Tanggul."
                    breadcrumbs={['Konseling & BK']}
                    badge="Kesantrian"
                    actions={
                        <>
                            <button
                                onClick={handleExportCSV}
                                className="h-9 px-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] hover:bg-[var(--color-surface)] text-[var(--color-text)] text-xs font-bold flex items-center gap-2 transition-all"
                            >
                                <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                                <span>Ekspor Excel</span>
                            </button>
                            <button
                                onClick={openAddModal}
                                className="h-9 px-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-lg shadow-purple-600/15 hover:scale-[1.02] active:scale-95 transition-all"
                            >
                                <Plus className="w-4 h-4" />
                                <span>Catat Konseling</span>
                            </button>
                        </>
                    }
                />

                {/* Stats Section */}
                <StatsCarousel count={4} cols={4}>
                    <StatCard
                        icon={HeartHandshake}
                        label="Total Sesi Konseling"
                        value={stats.total}
                        color="indigo"
                    />
                    <StatCard
                        icon={CheckCircle2}
                        label="Sesi Selesai (Solusi)"
                        value={stats.completed}
                        color="emerald"
                    />
                    <StatCard
                        icon={Clock}
                        label="Pembinaan Berjalan"
                        value={stats.active}
                        color="amber"
                    />
                    <StatCard
                        icon={AlertTriangle}
                        label="Urgent (Tingkat Tinggi)"
                        value={stats.highUrgency}
                        color="rose"
                    />
                </StatsCarousel>

                {/* Search & Filter Toolbar */}
                <div className="glass p-4 rounded-2xl border border-[var(--color-border)] flex flex-col md:flex-row gap-4 items-center justify-between">

                    {/* Left: Search input */}
                    <div className="relative w-full md:max-w-xs shrink-0">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)] opacity-50" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Cari santri, konselor, keluhan..."
                            className="w-full h-9 pl-9 pr-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/50 focus:bg-[var(--color-surface)] text-[12px] font-bold outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-all"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-red-500"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>

                    {/* Middle: Custom select filters */}
                    <div className="flex flex-wrap items-center gap-2.5 w-full justify-start md:justify-end">
                        <div className="w-[125px]">
                            <RichSelect
                                value={selectedCategoryFilter}
                                onChange={setSelectedCategoryFilter}
                                placeholder="Kategori"
                                compact
                                options={[
                                    { id: 'All', name: 'Semua Kategori' },
                                    { id: 'pribadi', name: 'Pribadi' },
                                    { id: 'sosial', name: 'Sosial' },
                                    { id: 'akademik', name: 'Belajar' },
                                    { id: 'karir', name: 'Karir' }
                                ]}
                            />
                        </div>

                        <div className="w-[120px]">
                            <RichSelect
                                value={selectedUrgencyFilter}
                                onChange={setSelectedUrgencyFilter}
                                placeholder="Urgensi"
                                compact
                                options={[
                                    { id: 'All', name: 'Semua Urgensi' },
                                    { id: 'ringan', name: 'Ringan' },
                                    { id: 'sedang', name: 'Sedang' },
                                    { id: 'tinggi', name: 'Tinggi' }
                                ]}
                            />
                        </div>

                        <div className="w-[125px]">
                            <RichSelect
                                value={selectedStatusFilter}
                                onChange={setSelectedStatusFilter}
                                placeholder="Status"
                                compact
                                options={[
                                    { id: 'All', name: 'Semua Status' },
                                    { id: 'proses', name: 'Dalam Proses' },
                                    { id: 'selesai', name: 'Selesai' }
                                ]}
                            />
                        </div>

                        {/* View Switcher Tabs */}
                        <div className="flex items-center rounded-xl bg-[var(--color-surface-alt)] p-0.5 border border-[var(--color-border)] ml-auto md:ml-0 shrink-0 select-none">
                            <button
                                onClick={() => setViewMode('list')}
                                className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${viewMode === 'list' ? 'bg-[var(--color-surface)] text-[var(--color-primary)] shadow-sm' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
                            >
                                Tabel
                            </button>
                            <button
                                onClick={() => setViewMode('timeline')}
                                className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${viewMode === 'timeline' ? 'bg-[var(--color-surface)] text-[var(--color-primary)] shadow-sm' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
                            >
                                Lini Masa
                            </button>
                        </div>
                    </div>
                </div>

                {/* Main Content Area */}
                {loading ? (
                    <div className="glass rounded-2xl border border-[var(--color-border)] p-12 text-center">
                        <div className="animate-spin inline-block w-8 h-8 border-[3px] border-current border-t-transparent text-purple-600 rounded-full mb-3" role="status" aria-label="loading">
                            <span className="sr-only">Loading...</span>
                        </div>
                        <p className="text-[var(--color-text-muted)] text-sm font-bold animate-pulse">Menghubungkan ke layanan database Laporanmu...</p>
                    </div>
                ) : filteredLogs.length === 0 ? (
                    logs.length === 0 ? (
                        <div className="text-center py-20 rounded-2xl border-2 border-dashed border-[var(--color-border)] bg-[var(--color-surface-alt)]/20">
                            <div className="w-14 h-14 bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl transform rotate-3 shadow-lg">
                                <HeartHandshake className="w-6 h-6" />
                            </div>
                            <h3 className="text-lg font-black text-[var(--color-text)] mb-2">Belum Ada Sesi Konseling</h3>
                            <p className="text-sm text-[var(--color-text-muted)] max-w-xs mx-auto mb-6 opacity-70">
                                Gunakan tombol "Catat Konseling" untuk mendaftarkan sesi bimbingan santri pertama.
                            </p>
                            <button onClick={openAddModal} className="h-9 px-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-alt)] text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-all active:scale-95">
                                Catat Sekarang
                            </button>
                        </div>
                    ) : (
                        <div className="text-center py-20 rounded-2xl border-2 border-dashed border-[var(--color-border)] bg-[var(--color-surface-alt)]/20">
                            <div className="w-14 h-14 bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl transform rotate-3 shadow-lg">
                                <Search className="w-6 h-6" />
                            </div>
                            <h3 className="text-lg font-black text-[var(--color-text)] mb-2">Pencarian Tidak Ditemukan</h3>
                            <p className="text-sm text-[var(--color-text-muted)] max-w-xs mx-auto mb-6 opacity-70">
                                Tidak ada santri yang sesuai dengan filter atau kata kunci pencarian Anda.
                            </p>
                            <button
                                onClick={() => {
                                    setSearchQuery('')
                                    setSelectedCategoryFilter('All')
                                    setSelectedUrgencyFilter('All')
                                    setSelectedStatusFilter('All')
                                }}
                                className="h-9 px-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-alt)] text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-all active:scale-95"
                            >
                                Reset Filter
                            </button>
                        </div>
                    )
                ) : viewMode === 'list' ? (
                    /* --- TABLE VIEW --- */
                    <div className="glass rounded-2xl border border-[var(--color-border)] overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-[var(--color-surface-alt)]/80 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] border-b border-[var(--color-border)]">
                                        <th className="py-4 px-5">Waktu</th>
                                        <th className="py-4 px-5">Santri / Kelas</th>
                                        <th className="py-4 px-5">Kategori & Urgensi</th>
                                        <th className="py-4 px-5">Diagnosis Masalah</th>
                                        <th className="py-4 px-5">Konselor</th>
                                        <th className="py-4 px-5">Status</th>
                                        <th className="py-4 px-5 text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--color-border)] text-xs">
                                    {paginatedLogs.map((log) => (
                                        <tr key={log.id} className="hover:bg-[var(--color-surface-alt)]/25 transition-colors group">
                                            <td className="py-4 px-5 font-bold whitespace-nowrap text-[var(--color-text-muted)]">
                                                <div className="flex items-center gap-1.5">
                                                    <Calendar className="w-3.5 h-3.5 text-purple-500 opacity-60" />
                                                    <span>{log.date}</span>
                                                    <span className="opacity-40">|</span>
                                                    <span>{log.time}</span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-5">
                                                <div className="font-extrabold text-[var(--color-text)] mb-0.5">{log.student_name}</div>
                                                <div className="text-[10px] text-[var(--color-text-muted)] font-bold">{log.class_name}</div>
                                            </td>
                                            <td className="py-4 px-5 space-y-1.5 whitespace-nowrap">
                                                <div>{getCategoryBadge(log.category)}</div>
                                                <div>{getUrgencyBadge(log.urgency)}</div>
                                            </td>
                                            <td className="py-4 px-5 max-w-[220px]">
                                                <div className="font-extrabold text-[var(--color-text)] truncate" title={log.diagnosis}>
                                                    {log.diagnosis || '—'}
                                                </div>
                                                <p className="text-[10px] text-[var(--color-text-muted)] line-clamp-1 mt-0.5 leading-relaxed" title={log.complaint}>
                                                    {log.complaint}
                                                </p>
                                            </td>
                                            <td className="py-4 px-5 whitespace-nowrap font-bold text-[var(--color-text-muted)]">
                                                <div className="flex items-center gap-1.5">
                                                    <User className="w-3.5 h-3.5 opacity-40 text-purple-600" />
                                                    <span className="text-[11px] truncate max-w-[140px]" title={log.counselor_name}>
                                                        {log.counselor_name || 'BK'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-5 whitespace-nowrap">
                                                <button
                                                    onClick={() => handleToggleStatus(log)}
                                                    className={`py-1 px-3 rounded-full text-[9px] font-black uppercase tracking-wider border transition-all ${log.status === 'selesai'
                                                            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20'
                                                            : 'bg-amber-500/10 text-amber-600 border-amber-500/20 hover:bg-amber-500/20 animate-pulse'
                                                        }`}
                                                >
                                                    {log.status === 'selesai' ? '✓ Selesai' : '⏳ Pembinaan'}
                                                </button>
                                            </td>
                                            <td className="py-4 px-5 text-right whitespace-nowrap">
                                                <div className="flex items-center justify-end gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => handlePrint(log)}
                                                        className="w-7 h-7 rounded-lg border border-[var(--color-border)] hover:bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-purple-600 flex items-center justify-center transition-colors"
                                                        title="Cetak Kartu BK"
                                                    >
                                                        <Printer className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => openEditModal(log)}
                                                        className="w-7 h-7 rounded-lg border border-[var(--color-border)] hover:bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-indigo-600 flex items-center justify-center transition-colors"
                                                        title="Edit Sesi"
                                                    >
                                                        <Edit2 className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => { setLogToDelete(log); setIsConfirmDeleteOpen(true) }}
                                                        className="w-7 h-7 rounded-lg border border-[var(--color-border)] hover:bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-red-500 flex items-center justify-center transition-colors"
                                                        title="Hapus"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Footer */}
                        {totalPages > 1 && (
                            <div className="py-4 px-5 bg-[var(--color-surface-alt)]/30 border-t border-[var(--color-border)] flex items-center justify-between">
                                <p className="text-[10px] font-bold text-[var(--color-text-muted)] opacity-60">
                                    Menampilkan {tNum((page - 1) * pageSize + 1)} - {tNum(Math.min(page * pageSize, totalRows))} dari {tNum(totalRows)} sesi konseling
                                </p>
                                <Pagination
                                    currentPage={page}
                                    totalPages={totalPages}
                                    onPageChange={setPage}
                                />
                            </div>
                        )}
                    </div>
                ) : (
                    /* --- TIMELINE TIMELOG VIEW --- */
                    <div className="space-y-6 max-w-4xl mx-auto py-2">
                        {timelineGroups.map(([dateString, groupLogs]) => (
                            <div key={dateString} className="relative pl-6 sm:pl-8 space-y-4">

                                {/* Absolute Timeline Dot & vertical track line */}
                                <div className="absolute left-0 top-1.5 bottom-0 w-0.5 bg-gradient-to-b from-purple-500 to-indigo-500/10">
                                    <div className="absolute top-0 -left-1.5 w-3.5 h-3.5 rounded-full border-2 border-[var(--color-surface)] bg-purple-500 shadow-md shadow-purple-600/30" />
                                </div>

                                {/* Date Header Label */}
                                <h3 className="text-sm font-black text-[var(--color-text)] font-heading uppercase tracking-wider">
                                    {new Date(dateString).toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                                </h3>

                                {/* Cards in this date */}
                                <div className="space-y-3.5">
                                    {groupLogs.map(log => (
                                        <div key={log.id} className="glass p-5 rounded-2xl border border-[var(--color-border)] hover:border-purple-500/30 transition-all duration-300 relative group overflow-hidden">

                                            {/* Glow Accent */}
                                            <div className="absolute -right-16 -top-16 w-36 h-36 bg-purple-500/5 rounded-full blur-3xl pointer-events-none group-hover:bg-purple-500/10 transition-all" />

                                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">

                                                {/* Left Details */}
                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="text-[10px] font-black font-mono text-[var(--color-text-muted)] bg-[var(--color-surface-alt)] px-2 py-0.5 rounded border border-[var(--color-border)]">
                                                            {log.time} WIB
                                                        </span>
                                                        {getCategoryBadge(log.category)}
                                                        {getUrgencyBadge(log.urgency)}
                                                    </div>

                                                    <h4 className="text-[15px] font-black text-[var(--color-text)]">
                                                        {log.student_name} <span className="text-xs font-bold text-[var(--color-text-muted)]">({log.class_name})</span>
                                                    </h4>

                                                    {log.diagnosis && (
                                                        <div className="flex items-center gap-1.5">
                                                            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                                                            <span className="text-[11px] font-extrabold text-[var(--color-primary)]">
                                                                Diagnosis: {log.diagnosis}
                                                            </span>
                                                        </div>
                                                    )}

                                                    <div className="text-xs text-[var(--color-text-muted)] leading-relaxed space-y-1.5 mt-2 bg-[var(--color-surface-alt)]/25 p-3.5 rounded-xl border border-[var(--color-border)]/30">
                                                        <p><strong className="text-[var(--color-text)]">Masalah:</strong> "{log.complaint}"</p>
                                                        {log.action_plan && (
                                                            <p className="border-t border-[var(--color-border)]/40 pt-1.5 mt-1.5">
                                                                <strong className="text-[var(--color-text)]">Rencana Solusi:</strong> {log.action_plan}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Right Actions */}
                                                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-4 shrink-0 border-t sm:border-t-0 border-[var(--color-border)] pt-3 sm:pt-0">
                                                    <div className="space-y-1.5 text-left sm:text-right">
                                                        <p className="text-[9px] font-bold uppercase tracking-widest text-[var(--color-text-muted)] opacity-60">Konselor</p>
                                                        <p className="text-xs font-extrabold text-[var(--color-text)]">{log.counselor_name}</p>
                                                    </div>

                                                    <div className="flex items-center gap-1.5">
                                                        <button
                                                            onClick={() => handleToggleStatus(log)}
                                                            className={`py-1 px-2.5 rounded-xl text-[9px] font-black uppercase tracking-wider border transition-all ${log.status === 'selesai'
                                                                    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20'
                                                                    : 'bg-amber-500/10 text-amber-600 border-amber-500/20 hover:bg-amber-500/20 animate-pulse'
                                                                }`}
                                                        >
                                                            {log.status === 'selesai' ? 'Selesai' : '⏳ Pembinaan'}
                                                        </button>

                                                        <button
                                                            onClick={() => handlePrint(log)}
                                                            className="w-7 h-7 rounded-lg border border-[var(--color-border)] hover:bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-purple-600 flex items-center justify-center transition-colors"
                                                            title="Cetak Hasil Konseling"
                                                        >
                                                            <Printer className="w-3.5 h-3.5" />
                                                        </button>

                                                        <button
                                                            onClick={() => openEditModal(log)}
                                                            className="w-7 h-7 rounded-lg border border-[var(--color-border)] hover:bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-indigo-600 flex items-center justify-center transition-colors"
                                                            title="Edit"
                                                        >
                                                            <Edit2 className="w-3.5 h-3.5" />
                                                        </button>

                                                        <button
                                                            onClick={() => { setLogToDelete(log); setIsConfirmDeleteOpen(true) }}
                                                            className="w-7 h-7 rounded-lg border border-[var(--color-border)] hover:bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-red-500 flex items-center justify-center transition-colors"
                                                            title="Hapus"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </div>

                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* --- Modal 1: Add / Edit Session --- */}
                <Modal
                    isOpen={isSessionModalOpen}
                    onClose={() => setIsSessionModalOpen(false)}
                    title={activeLog ? 'Edit Sesi Bimbingan BK' : 'Catat Sesi Bimbingan BK'}
                    icon={HeartHandshake}
                    size="lg"
                    description="Catat detail permasalahan, diagnosis bimbingan konseling, dan rencana solusi santri."
                >
                    <form onSubmit={handleSaveRecord} className="space-y-4">

                        {/* Student & Class Row */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">
                                    Pilih Santri <span className="text-red-500">*</span>
                                </label>
                                <RichSelect
                                    value={formLog.student_id}
                                    onChange={(id) => setFormLog(prev => ({ ...prev, student_id: id }))}
                                    options={studentOptions}
                                    placeholder="Cari santri..."
                                    searchable
                                    disabled={activeLog !== null}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">
                                    Konselor / Pembimbing
                                </label>
                                <input
                                    type="text"
                                    value={formLog.counselor_name}
                                    onChange={(e) => setFormLog(prev => ({ ...prev, counselor_name: e.target.value }))}
                                    placeholder="Nama ustadz / ustadzah pembimbing"
                                    className="w-full h-10 px-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[12px] font-bold outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
                                />
                            </div>
                        </div>

                        {/* Date & Time Row */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">
                                    Tanggal Bimbingan
                                </label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)] opacity-50" />
                                    <input
                                        type="date"
                                        value={formLog.date}
                                        onChange={(e) => setFormLog(prev => ({ ...prev, date: e.target.value }))}
                                        className="w-full h-10 pl-10 pr-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[12px] font-bold outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">
                                    Jam Sesi
                                </label>
                                <div className="relative">
                                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)] opacity-50" />
                                    <input
                                        type="time"
                                        value={formLog.time}
                                        onChange={(e) => setFormLog(prev => ({ ...prev, time: e.target.value }))}
                                        className="w-full h-10 pl-10 pr-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[12px] font-bold outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">
                                    Kategori Bimbingan
                                </label>
                                <RichSelect
                                    value={formLog.category}
                                    onChange={(val) => setFormLog(prev => ({ ...prev, category: val }))}
                                    options={[
                                        { id: 'pribadi', name: 'Pribadi' },
                                        { id: 'sosial', name: 'Sosial' },
                                        { id: 'akademik', name: 'Belajar' },
                                        { id: 'karir', name: 'Karir' }
                                    ]}
                                    compact
                                />
                            </div>
                        </div>

                        {/* Complaint (Keluhan) */}
                        <div className="relative">
                            <div className="flex justify-between items-center mb-1.5">
                                <label className="block text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)]">
                                    Keluhan & Masalah Santri <span className="text-red-500">*</span>
                                </label>
                                <button
                                    type="button"
                                    onClick={handleAIAnalyze}
                                    disabled={aiLoading}
                                    className="h-7 px-3 bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 active:scale-95 transition-all border border-purple-500/20"
                                >
                                    <Sparkles className={`w-3.5 h-3.5 ${aiLoading ? 'animate-spin' : ''}`} />
                                    <span>{aiLoading ? 'Menganalisis...' : '✨ Asisten AI'}</span>
                                </button>
                            </div>
                            <textarea
                                value={formLog.complaint}
                                onChange={(e) => setFormLog(prev => ({ ...prev, complaint: e.target.value }))}
                                placeholder="Jelaskan secara detail keluhan santri, gejala psikososial, atau kebingungan yang dihadapi..."
                                rows="3"
                                className="w-full p-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[12px] font-bold outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 leading-relaxed"
                            />
                        </div>

                        {/* Diagnosis & Action Plan */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">
                                    Diagnosis / Identifikasi Akar Masalah
                                </label>
                                <input
                                    type="text"
                                    value={formLog.diagnosis}
                                    onChange={(e) => setFormLog(prev => ({ ...prev, diagnosis: e.target.value }))}
                                    placeholder="Contoh: Homesickness Ringan, Penurunan Motivasi"
                                    className="w-full h-10 px-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[12px] font-bold outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">
                                    Rencana Tindakan / Solusi BK
                                </label>
                                <input
                                    type="text"
                                    value={formLog.action_plan}
                                    onChange={(e) => setFormLog(prev => ({ ...prev, action_plan: e.target.value }))}
                                    placeholder="Contoh: Bimbingan supportif, koordinasi asrama"
                                    className="w-full h-10 px-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[12px] font-bold outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
                                />
                            </div>
                        </div>

                        {/* Urgency & Status Row */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-[var(--color-border)] pt-4">

                            {/* Urgency Radio Selector */}
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)] mb-2">
                                    Tingkat Urgensi
                                </label>
                                <div className="flex gap-2">
                                    {['ringan', 'sedang', 'tinggi'].map(urg => {
                                        const styles = {
                                            ringan: 'border-emerald-500/20 text-emerald-600 bg-emerald-500/5',
                                            sedang: 'border-amber-500/20 text-amber-600 bg-amber-500/5',
                                            tinggi: 'border-rose-500/25 text-rose-600 bg-rose-500/5'
                                        }
                                        const checkedStyles = {
                                            ringan: 'bg-emerald-500/15 border-emerald-500 text-emerald-700 shadow-sm ring-1 ring-emerald-500',
                                            sedang: 'bg-amber-500/15 border-amber-500 text-amber-700 shadow-sm ring-1 ring-amber-500',
                                            tinggi: 'bg-rose-500/20 border-rose-500 text-rose-700 shadow-sm ring-1 ring-rose-500'
                                        }
                                        const label = { ringan: 'Ringan', sedang: 'Sedang', tinggi: 'Tinggi' }
                                        const isChecked = formLog.urgency === urg

                                        return (
                                            <button
                                                type="button"
                                                key={urg}
                                                onClick={() => setFormLog(prev => ({ ...prev, urgency: urg }))}
                                                className={`flex-1 py-2 px-3 border rounded-xl text-center text-xs font-black uppercase tracking-wider transition-all select-none ${isChecked ? checkedStyles[urg] : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]'}`}
                                            >
                                                {label[urg]}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Status Selector */}
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)] mb-2">
                                    Status Sesi Bimbingan
                                </label>
                                <div className="flex rounded-xl bg-[var(--color-surface-alt)] p-0.5 border border-[var(--color-border)] select-none">
                                    <button
                                        type="button"
                                        onClick={() => setFormLog(prev => ({ ...prev, status: 'proses' }))}
                                        className={`flex-1 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${formLog.status === 'proses' ? 'bg-[var(--color-surface)] text-amber-600 border border-amber-500/10 shadow-sm' : 'text-[var(--color-text-muted)]'}`}
                                    >
                                        ⏳ Pembinaan
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormLog(prev => ({ ...prev, status: 'selesai' }))}
                                        className={`flex-1 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${formLog.status === 'selesai' ? 'bg-[var(--color-surface)] text-emerald-600 border border-emerald-500/10 shadow-sm' : 'text-[var(--color-text-muted)]'}`}
                                    >
                                        ✓ Selesai
                                    </button>
                                </div>
                            </div>

                        </div>

                        {/* Footer buttons */}
                        <div className="flex justify-end gap-2 border-t border-[var(--color-border)]/50 pt-4 mt-6">
                            <button
                                type="button"
                                onClick={() => setIsSessionModalOpen(false)}
                                className="h-10 px-4 rounded-xl border border-[var(--color-border)] text-xs font-black text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] transition-colors active:scale-95"
                            >
                                Batal
                            </button>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="h-10 px-6 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-black flex items-center gap-2 active:scale-95 transition-all shadow-md shadow-purple-600/10 disabled:opacity-50"
                            >
                                {submitting ? 'Menyimpan...' : 'Simpan Sesi'}
                            </button>
                        </div>
                    </form>
                </Modal>

                {/* --- Modal 2: Confirm Delete --- */}
                <Modal
                    isOpen={isConfirmDeleteOpen}
                    onClose={() => setIsConfirmDeleteOpen(false)}
                    title="Hapus Sesi Bimbingan?"
                    icon={AlertCircle}
                    iconBg="bg-rose-500/10"
                    iconColor="text-rose-500"
                    size="sm"
                    description="Tindakan ini permanen. Catatan hasil konseling santri ini akan dihapus dari sistem."
                >
                    <div className="flex justify-end gap-2 mt-4">
                        <button
                            type="button"
                            onClick={() => setIsConfirmDeleteOpen(false)}
                            className="h-9 px-4 rounded-xl border border-[var(--color-border)] text-xs font-black text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] transition-colors active:scale-95"
                        >
                            Batal
                        </button>
                        <button
                            type="button"
                            onClick={handleDeleteRecord}
                            className="h-9 px-5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-black transition-all active:scale-95 shadow-sm"
                        >
                            Ya, Hapus
                        </button>
                    </div>
                </Modal>

                {/* --- Modal 3: Print Confirmation --- */}
                <Modal
                    isOpen={isPrintModalOpen}
                    onClose={() => setIsPrintModalOpen(false)}
                    title="Cetak Rekam Konseling BK"
                    icon={Printer}
                    size="md"
                    description="Siapkan pencetakan Kartu Rekam Bimbingan Konseling resmi santri."
                >
                    {logToPrint && (
                        <div className="space-y-4">
                            <div className="bg-[var(--color-surface-alt)] p-4 rounded-xl border border-[var(--color-border)] text-xs space-y-2">
                                <p><strong>Nama Santri:</strong> {logToPrint.student_name}</p>
                                <p><strong>Kelas:</strong> {logToPrint.class_name}</p>
                                <p><strong>Diagnosis Masalah:</strong> {logToPrint.diagnosis || '—'}</p>
                                <p><strong>Status Kasus:</strong> {logToPrint.status === 'selesai' ? 'Selesai' : 'Dalam Pembinaan'}</p>
                            </div>

                            <div className="flex justify-end gap-2 border-t border-[var(--color-border)] pt-4 mt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsPrintModalOpen(false)}
                                    className="h-10 px-4 rounded-xl border border-[var(--color-border)] text-xs font-black text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] transition-all active:scale-95"
                                >
                                    Tutup
                                </button>
                                <button
                                    type="button"
                                    onClick={executePrintWindow}
                                    className="h-10 px-5 bg-purple-600 hover:bg-purple-50 text-white rounded-xl text-xs font-black flex items-center gap-2 transition-all active:scale-95 shadow-md shadow-purple-600/10 hover:from-purple-500 hover:to-indigo-500"
                                >
                                    <Printer className="w-4 h-4" />
                                    <span>Cetak Sekarang</span>
                                </button>
                            </div>
                        </div>
                    )}
                </Modal>

            </div>
        </DashboardLayout>
    )
}
