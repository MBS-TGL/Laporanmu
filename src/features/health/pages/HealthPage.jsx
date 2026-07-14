import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '@lib/supabase'
import { useToast, useLanguage } from '@context'
import DashboardLayout from '@core/layouts/DashboardLayout'
import {
    PageHeader,
    EmptyState, StatCard,
    StatsCarousel,
    Pagination,
    RichDatePicker,
    RichTimePicker,
    RichSelect,
    Modal
} from '@shared/components'
import { askAi } from '@lib/ai'
import {
    HeartPulse, Search, Plus, Trash2, X, Edit2,
    Calendar, User, Clock, AlertCircle, Bed,
    ArrowRightLeft, FileSpreadsheet, Download,
    Check, Pill, FileText, CheckCircle2, Star,
    Printer, Sparkles, Eye, EyeOff, Sliders
} from 'lucide-react'

// Local storage keys for fallback persistence
const LS_HEALTH_LOGS = 'laporanmu_health_logs'
const LS_HEALTH_MEDS = 'laporanmu_health_medicines'

const maskInfo = (str, vis = 3) => {
    if (!str) return '—'
    const s = String(str)
    if (s.length <= vis) return s.charAt(0) + '*'.repeat(s.length - 1)
    return s.slice(0, vis) + '*'.repeat(s.length - vis)
}

export default function HealthPage() {
    const { addToast } = useToast()
    const { language, tNum } = useLanguage()

    // Tab state
    const [activeTab, setActiveTab] = useState('medical') // 'medical' | 'resting' | 'inventory'
    const [isPrivacyMode, setIsPrivacyMode] = useState(false)

    // Dropdown menu (Cetak / Export) state
    const [isDataMenuOpen, setIsDataMenuOpen] = useState(false)
    const [dataMenuRect, setDataMenuRect] = useState(null)
    const [dataMenuMounted, setDataMenuMounted] = useState(false)
    const dataMenuBtnRef = useRef(null)

    // Mount/unmount dropdown with animation delay
    useEffect(() => {
        if (isDataMenuOpen) {
            setDataMenuMounted(true)
        } else {
            const t = setTimeout(() => setDataMenuMounted(false), 200)
            return () => clearTimeout(t)
        }
    }, [isDataMenuOpen])

    // Close dropdown on outside click
    useEffect(() => {
        if (!isDataMenuOpen) return
        const handler = (e) => {
            if (dataMenuBtnRef.current && !dataMenuBtnRef.current.contains(e.target) && !e.target.closest('#portal-health-header-menu')) {
                setIsDataMenuOpen(false)
            }
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [isDataMenuOpen])

    // Data states
    const [logs, setLogs] = useState([])
    const [medicines, setMedicines] = useState([])
    const [studentsList, setStudentsList] = useState([])
    const [classesList, setClassesList] = useState([])
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [aiLoading, setAiLoading] = useState(false)

    // Filters & Pagination states
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedStatusFilter, setSelectedStatusFilter] = useState('All')
    const [selectedClassFilter, setSelectedClassFilter] = useState('All')
    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(8)

    // Modal Control states
    const [isRecordModalOpen, setIsRecordModalOpen] = useState(false)
    const [isMedModalOpen, setIsMedModalOpen] = useState(false)
    const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false)
    const [isConfirmSembuhOpen, setIsConfirmSembuhOpen] = useState(false)

    // Form/Active items states
    const [activeLog, setActiveLog] = useState(null)
    const [activeMed, setActiveMed] = useState(null)
    const [logToDelete, setLogToDelete] = useState(null)
    const [logToSembuh, setLogToSembuh] = useState(null)

    // Form Inputs
    const [formLog, setFormLog] = useState({
        student_id: '',
        date: '',
        time: '',
        complaint: '',
        diagnosis: '',
        treatment: '',
        medicine_id: '',
        medicine_qty: 1,
        status: 'UKS'
    })

    const [selectedMeds, setSelectedMeds] = useState([
        { medicine_id: '', qty: 1 }
    ])

    const [formMed, setFormMed] = useState({
        name: '',
        category: 'Analgesik / Antipiretik',
        stock: 0,
        unit: 'tablet',
        min_stock: 10,
        description: ''
    })

    // Precomputed values & translations helper
    const tp = (key) => {
        const trans = {
            title: { id: 'Klinik & Kesehatan', en: 'Clinic & Health', ar: 'العيادة والصحة' },
            desc: { id: 'Pos Kesehatan Pesantren (Poskestren) & catatan rekam medis berkala santri.', en: 'Pesantren Health Center (Poskestren) & student medical record logs.', ar: 'مركز الصحة في المدرسة وسجلات تقarير الطلاب الطبية.' },
            tabMedical: { id: 'Rekam Medis', en: 'Medical Records', ar: 'السجلات الطبية' },
            tabResting: { id: 'Santri Observasi', en: 'Santri Observasi', ar: 'الطلاب في الملاحظة' },
            tabInventory: { id: 'Stok & Inventaris Obat', en: 'Medicine Stock', ar: 'مخزون الأدوية' },
            statTotal: { id: 'Total Rekam Medis', en: 'Total Records', ar: 'إجمالي السجلات' },
            statResting: { id: 'Sedang Istirahat', en: 'Resting in UKS', ar: 'تحت الملاحظة حالياً' },
            statLowStock: { id: 'Stok Obat Kritis', en: 'Low Medicine Stock', ar: 'أدوية منخفضة المخزون' },
            statHealthy: { id: 'Status UKS', en: 'Clinic Status', ar: 'حالة العيادة' },
            searchPlaceholder: { id: 'Cari nama santri, keluhan, obat...', en: 'Search student, complaint, medicine...', ar: 'بحث عن اسم، شكوى، دواء...' },
            btnRecordAdd: { id: 'Tambah Catatan', en: 'Add Medical Record', ar: 'إضافة سجل طبي' },
            btnMedAdd: { id: 'Tambah Obat', en: 'Add New Medicine', ar: 'إضافة دواء جديد' },
            emptyTitle: { id: 'Tidak Ada Data Medis', en: 'No Medical Records Found', ar: 'لا توجد سجلات طبية' },
            emptyDesc: { id: 'Belum ada rekam medis yang dicatat atau data tidak sesuai dengan filter.', en: 'No medical records have been recorded or matching the current filters.', ar: 'لم يتم تسجيل أي سجل طبي أو لا توجد نتائج مطابقة للتصفية.' },
            privacyModeOn: { id: 'Matikan Mode Privasi', en: 'Disable Privacy Mode', ar: 'تعطيل وضع الخصوصية' },
            privacyModeOff: { id: 'Aktifkan Mode Privasi', en: 'Enable Privacy Mode', ar: 'تفعيل وضع الخصوصية' },
            privacy: { id: 'Privasi', en: 'Privacy', ar: 'الخصوصية' }
        }
        return trans[key]?.[language] || trans[key]?.id || key
    }

    // Load Data from Supabase with full local storage fallback
    const fetchData = async () => {
        try {
            setLoading(true)

            // 1. Fetch active students & classes from database if available
            const { data: stdData } = await supabase
                .from('students')
                .select('id, name, metadata, class_id, classes(id, name)')
                .is('deleted_at', null)
                .order('name')

            const { data: clsData } = await supabase
                .from('classes')
                .select('id, name')
                .order('name')

            if (stdData && stdData.length > 0) {
                const formatted = stdData.map(s => ({
                    id: s.id,
                    name: s.name,
                    class_name: s.classes?.name || s.metadata?.kelas || 'Tanpa Kelas'
                }))
                setStudentsList(formatted)
            } else {
                setStudentsList([])
            }

            if (clsData) {
                setClassesList(clsData)
            }

            // 2. Fetch health_logs from Supabase
            const { data: logData, error: logErr } = await supabase
                .from('health_logs')
                .select('*')
                .order('created_at', { ascending: false })

            if (logErr) throw logErr
            setLogs(logData || [])

        } catch (err) {
            console.warn('[HealthPage] Gagal fetch logs Supabase, fallback ke localStorage:', err.message)
            try {
                const savedLogs = localStorage.getItem(LS_HEALTH_LOGS)
                setLogs(savedLogs ? JSON.parse(savedLogs) : [])
            } catch {
                setLogs([])
            }
        } finally {
            // Load medicines from Supabase or localStorage fallback
            try {
                const { data: medData, error: medErr } = await supabase
                    .from('health_medicines')
                    .select('*')
                    .order('name', { ascending: true })

                if (medErr) throw medErr
                if (medData && medData.length > 0) {
                    setMedicines(medData)
                } else {
                    const savedMeds = localStorage.getItem(LS_HEALTH_MEDS)
                    setMedicines(savedMeds ? JSON.parse(savedMeds) : [])
                }
            } catch (err) {
                console.warn('[HealthPage] Gagal fetch medicines Supabase, fallback ke localStorage:', err.message)
                const savedMeds = localStorage.getItem(LS_HEALTH_MEDS)
                setMedicines(savedMeds ? JSON.parse(savedMeds) : [])
            }
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [])

    // Synchronize local storage fallbacks on change
    useEffect(() => {
        if (!loading && logs.length > 0) {
            localStorage.setItem(LS_HEALTH_LOGS, JSON.stringify(logs))
        }
    }, [logs, loading])

    useEffect(() => {
        if (!loading && medicines.length > 0) {
            localStorage.setItem(LS_HEALTH_MEDS, JSON.stringify(medicines))
        }
    }, [medicines, loading])

    // Reset pagination on search filter modifications
    useEffect(() => {
        setPage(1)
    }, [searchQuery, selectedStatusFilter, selectedClassFilter, activeTab])

    // --- Actions ---

    // Save Medical Record to Supabase (With auto stock deduction and fallback)
    const handleSaveRecord = async (e) => {
        e.preventDefault()
        if (!formLog.student_id) {
            addToast('Silakan pilih santri terlebih dahulu', 'error')
            return
        }

        const selectedStudent = studentsList.find(s => s.id === formLog.student_id)
        
        // Filter out non-selected medicines
        const activeMedsList = selectedMeds.filter(m => m.medicine_id)
        const primaryMed = activeMedsList[0] || null
        const selectedMed = primaryMed ? medicines.find(m => m.id === primaryMed.medicine_id) : null

        // Format combined medicine_name
        let formattedMedName = 'Tidak ada obat / obat luar saja'
        if (activeMedsList.length > 0) {
            formattedMedName = activeMedsList.map(item => {
                const medObj = medicines.find(m => m.id === item.medicine_id)
                return medObj ? `${medObj.name} (${item.qty}x)` : ''
            }).filter(Boolean).join(' + ')
        }

        setSubmitting(true)
        try {
            const currentObj = {
                date: formLog.date || new Date().toISOString().split('T')[0],
                time: formLog.time || new Date().toTimeString().split(' ')[0].slice(0, 5),
                student_id: formLog.student_id,
                student_name: selectedStudent?.name || 'Santri',
                class_name: selectedStudent?.class_name || 'Umum',
                complaint: formLog.complaint,
                diagnosis: formLog.diagnosis,
                treatment: formLog.treatment,
                medicine_id: primaryMed ? primaryMed.medicine_id : null,
                medicine_name: formattedMedName,
                medicine_qty: primaryMed ? Number(primaryMed.qty) : 0,
                status: formLog.status
            }

            let insertedData = null

            if (activeLog) {
                // UPDATE IN SUPABASE
                const { data, error } = await supabase
                    .from('health_logs')
                    .update(currentObj)
                    .eq('id', activeLog.id)
                    .select()

                if (error) throw error
                insertedData = data?.[0] || { ...currentObj, id: activeLog.id, created_at: activeLog.created_at }

                setLogs(prev => prev.map(l => l.id === activeLog.id ? insertedData : l))
                addToast('Rekam medis berhasil diperbarui', 'success')
            } else {
                // INSERT IN SUPABASE
                const { data, error } = await supabase
                    .from('health_logs')
                    .insert([currentObj])
                    .select()

                if (error) throw error
                insertedData = data?.[0] || { ...currentObj, id: `log-${Date.now()}`, created_at: new Date().toISOString() }

                // Dynamic stock deduction update in Supabase for ALL selected medicines
                for (const item of activeMedsList) {
                    const medObj = medicines.find(m => m.id === item.medicine_id)
                    if (medObj && item.qty > 0) {
                        const nextStock = Math.max(0, medObj.stock - Number(item.qty))
                        
                        await supabase
                            .from('health_medicines')
                            .update({ stock: nextStock })
                            .eq('id', item.medicine_id)

                        setMedicines(prev => prev.map(m => m.id === item.medicine_id ? { ...m, stock: nextStock } : m))
                    }
                }

                setLogs(prev => [insertedData, ...prev])
                addToast('Rekam medis berhasil dicatat', 'success')
            }

            setIsRecordModalOpen(false)
            setActiveLog(null)
        } catch (err) {
            console.error('[HealthPage] Gagal menyimpan ke Supabase, fallback ke local:', err.message)
            
            // Fallback localStorage flow
            const backupId = activeLog ? activeLog.id : `log-${Date.now()}`
            const backupObj = {
                id: backupId,
                date: formLog.date || new Date().toISOString().split('T')[0],
                time: formLog.time || new Date().toTimeString().split(' ')[0].slice(0, 5),
                student_id: formLog.student_id,
                student_name: selectedStudent?.name || 'Santri',
                class_name: selectedStudent?.class_name || 'Umum',
                complaint: formLog.complaint,
                diagnosis: formLog.diagnosis,
                treatment: formLog.treatment,
                medicine_id: primaryMed ? primaryMed.medicine_id : null,
                medicine_name: formattedMedName,
                medicine_qty: primaryMed ? Number(primaryMed.qty) : 0,
                status: formLog.status,
                created_at: activeLog ? activeLog.created_at : new Date().toISOString()
            }

            // Deduct stock locally for all selected medicines
            if (!activeLog) {
                setMedicines(prev => prev.map(m => {
                    const chosen = activeMedsList.find(item => item.medicine_id === m.id)
                    if (chosen) {
                        return { ...m, stock: Math.max(0, m.stock - Number(chosen.qty)) }
                    }
                    return m
                }))
            }

            if (activeLog) {
                setLogs(prev => prev.map(l => l.id === activeLog.id ? backupObj : l))
                addToast('Rekam medis berhasil diperbarui (Lokal)', 'success')
            } else {
                setLogs(prev => [backupObj, ...prev])
                addToast('Rekam medis berhasil dicatat (Lokal)', 'success')
            }

            setIsRecordModalOpen(false)
            setActiveLog(null)
        } finally {
            setSubmitting(false)
        }
    }

    // Delete Medical Record
    const handleDeleteRecord = async () => {
        if (!logToDelete) return
        setSubmitting(true)
        try {
            const { error } = await supabase
                .from('health_logs')
                .delete()
                .eq('id', logToDelete.id)

            if (error) throw error

            setLogs(prev => prev.filter(l => l.id !== logToDelete.id))
            addToast('Catatan medis berhasil dihapus', 'success')
            setIsConfirmDeleteOpen(false)
            setLogToDelete(null)
        } catch (err) {
            console.warn('[HealthPage] Gagal hapus di Supabase, fallback ke lokal:', err.message)
            setLogs(prev => prev.filter(l => l.id !== logToDelete.id))
            addToast('Catatan medis berhasil dihapus (Lokal)', 'success')
            setIsConfirmDeleteOpen(false)
            setLogToDelete(null)
        } finally {
            setSubmitting(false)
        }
    }

    // Mark Resting Student as Recovered / Sembuh
    const handleSembuh = async () => {
        if (!logToSembuh) return
        setSubmitting(true)
        try {
            const { error } = await supabase
                .from('health_logs')
                .update({ status: 'Kembali' })
                .eq('id', logToSembuh.id)

            if (error) throw error

            setLogs(prev => prev.map(l => l.id === logToSembuh.id ? { ...l, status: 'Kembali' } : l))
            addToast(`${logToSembuh.student_name} telah sembuh & kembali mengikuti KBM`, 'success')
            setIsConfirmSembuhOpen(false)
            setLogToSembuh(null)
        } catch (err) {
            console.warn('[HealthPage] Gagal update sembuh di Supabase, fallback ke lokal:', err.message)
            setLogs(prev => prev.map(l => l.id === logToSembuh.id ? { ...l, status: 'Kembali' } : l))
            addToast(`${logToSembuh.student_name} telah sembuh & kembali mengikuti KBM (Lokal)`, 'success')
            setIsConfirmSembuhOpen(false)
            setLogToSembuh(null)
        } finally {
            setSubmitting(false)
        }
    }

    // Save Medicine (Add / Edit) with Supabase persistence
    const handleSaveMedicine = async (e) => {
        e.preventDefault()
        if (!formMed.name || !formMed.category) {
            addToast('Nama obat dan kategori wajib diisi', 'error')
            return
        }

        setSubmitting(true)
        try {
            const medObj = {
                name: formMed.name,
                category: formMed.category,
                stock: Number(formMed.stock) || 0,
                unit: formMed.unit,
                min_stock: Number(formMed.min_stock) || 10,
                description: formMed.description
            }

            let savedObj = null

            if (activeMed) {
                const { data, error } = await supabase
                    .from('health_medicines')
                    .update(medObj)
                    .eq('id', activeMed.id)
                    .select()

                if (error) throw error
                savedObj = data?.[0] || { ...medObj, id: activeMed.id }

                setMedicines(prev => prev.map(m => m.id === activeMed.id ? savedObj : m))
                addToast('Data obat berhasil diperbarui', 'success')
            } else {
                const { data, error } = await supabase
                    .from('health_medicines')
                    .insert([medObj])
                    .select()

                if (error) throw error
                savedObj = data?.[0] || { ...medObj, id: `med-${Date.now()}` }

                setMedicines(prev => [...prev, savedObj])
                addToast('Obat baru berhasil ditambahkan', 'success')
            }
            setIsMedModalOpen(false)
            setActiveMed(null)
        } catch (err) {
            console.warn('[HealthPage] Gagal simpan obat ke Supabase, fallback ke lokal:', err.message)
            
            const backupId = activeMed ? activeMed.id : `med-${Date.now()}`
            const backupMed = {
                id: backupId,
                name: formMed.name,
                category: formMed.category,
                stock: Number(formMed.stock) || 0,
                unit: formMed.unit,
                min_stock: Number(formMed.min_stock) || 10,
                description: formMed.description
            }

            if (activeMed) {
                setMedicines(prev => prev.map(m => m.id === activeMed.id ? backupMed : m))
                addToast('Data obat berhasil diperbarui (Lokal)', 'success')
            } else {
                setMedicines(prev => [...prev, backupMed])
                addToast('Obat baru berhasil ditambahkan (Lokal)', 'success')
            }
            setIsMedModalOpen(false)
            setActiveMed(null)
        } finally {
            setSubmitting(false)
        }
    }

    // Smart Hybrid AI Predictor for Student Medical Records (Groq LLM + Local Fallback Engine)
    const handleAIAnalyze = async () => {
        if (!formLog.complaint.trim()) return

        setAiLoading(true)
        
        try {
            // 1. Try calling the powerful Groq AI model
            const rawResponse = await askAi(formLog.complaint, "medical")
            
            // Check if response contains an error or isn't structured JSON
            if (rawResponse && !rawResponse.startsWith("Error") && !rawResponse.includes("API Key Groq")) {
                const parsed = JSON.parse(rawResponse)
                
                if (parsed.diagnosis && parsed.treatment) {
                    let mappedMeds = []

                    // Match multiple medicines dynamically from local database using comma-separated keywords from Groq
                    if (parsed.medicine_keyword) {
                        const keywords = parsed.medicine_keyword.split(',').map(k => k.trim().toLowerCase()).filter(Boolean)
                        
                        for (const kw of keywords) {
                            const matchedMed = medicines.find(m => 
                                m.name.toLowerCase().includes(kw) || 
                                kw.includes(m.name.toLowerCase())
                            )
                            if (matchedMed) {
                                let qty = 1
                                if (kw.includes('paracetamol')) qty = 3
                                else if (kw.includes('sanaflu') || kw.includes('flu')) qty = 3
                                else if (kw.includes('diapet') || kw.includes('oralit')) qty = 2
                                mappedMeds.push({ medicine_id: matchedMed.id, qty })
                            }
                        }
                    }

                    // Fallback to empty single row if no medicines were matched
                    if (mappedMeds.length === 0) {
                        mappedMeds = [{ medicine_id: '', qty: 1 }]
                    }

                    setSelectedMeds(mappedMeds)

                    setFormLog(prev => ({
                        ...prev,
                        diagnosis: parsed.diagnosis,
                        treatment: parsed.treatment,
                        medicine_id: mappedMeds[0]?.medicine_id || '',
                        medicine_qty: mappedMeds[0]?.qty || 1
                    }))

                    addToast('Rekomendasi Asisten AI Groq berhasil diterapkan!', 'success')
                    setAiLoading(false)
                    return
                }
            }
        } catch (err) {
            console.warn('[HealthPage] Gagal menggunakan Groq AI, menggunakan asisten lokal:', err)
        }

        // 2. Local Fallback Engine (Runs completely offline, instant, zero latency)
        setTimeout(() => {
            const complaintLower = formLog.complaint.toLowerCase()
            
            let guessedDiagnosis = 'Pemeriksaan UKS'
            let guessedTreatment = 'Istirahat di ruang UKS dan pantau kondisi fisik santri secara berkala.'
            let guessedMedicineId = '' // Default: Tidak ada obat / obat luar saja
            let guessedMedicineQty = 1

            // 1. Demam / Panas / Menggigil
            if (
                complaintLower.includes('panas') || 
                complaintLower.includes('demam') || 
                complaintLower.includes('gigil') || 
                complaintLower.includes('suhu') ||
                complaintLower.includes('hangat')
            ) {
                guessedDiagnosis = 'Gejala Influenza / ISPA / Demam'
                guessedTreatment = 'Bedrest di UKS, kompres hangat di dahi, dan ukur suhu badan berkala.'
                const pcm = medicines.find(m => m.name.toLowerCase().includes('paracetamol'))
                if (pcm) {
                    guessedMedicineId = pcm.id
                    guessedMedicineQty = 3
                }
            }
            // 2. Pusing / Sakit Kepala
            else if (
                complaintLower.includes('pusing') || 
                complaintLower.includes('sakit kepala') || 
                complaintLower.includes('migrain') || 
                complaintLower.includes('pening') ||
                complaintLower.includes('nyut')
            ) {
                guessedDiagnosis = 'Sakit Kepala / Cephalgia'
                guessedTreatment = 'Istirahat baring di ruang UKS yang tenang/gelap, perbanyak minum air putih hangat.'
                const pcm = medicines.find(m => m.name.toLowerCase().includes('paracetamol'))
                if (pcm) {
                    guessedMedicineId = pcm.id
                    guessedMedicineQty = 1
                }
            }
            // 3. Maag Kambuh / Mual / Lambung
            else if (
                complaintLower.includes('maag') || 
                complaintLower.includes('lambung') || 
                complaintLower.includes('mual') || 
                complaintLower.includes('muntah') || 
                complaintLower.includes('ulu hati') || 
                complaintLower.includes('perih perut') ||
                complaintLower.includes('asam lambung')
            ) {
                guessedDiagnosis = 'Dispepsia / Maag Kambuh'
                guessedTreatment = 'Istirahat baring di UKS, berikan air hangat, dan ingatkan santri untuk makan teratur.'
                const ant = medicines.find(m => m.name.toLowerCase().includes('antasida'))
                if (ant) {
                    guessedMedicineId = ant.id
                    guessedMedicineQty = 1
                }
            }
            // 4. Gatal-gatal / Alergi
            else if (
                complaintLower.includes('gatal') || 
                complaintLower.includes('alergi') || 
                complaintLower.includes('ruam') || 
                complaintLower.includes('bintik') || 
                complaintLower.includes('panu') || 
                complaintLower.includes('kurap') ||
                complaintLower.includes('kudis')
            ) {
                guessedDiagnosis = 'Dermatitis Alergi Kulit'
                guessedTreatment = 'Bersihkan area kulit yang gatal dengan air mengalir, oleskan bedak salisilat/salep, jangan digaruk.'
                const ctm = medicines.find(m => m.name.toLowerCase().includes('ctm'))
                if (ctm) {
                    guessedMedicineId = ctm.id
                    guessedMedicineQty = 1
                }
            }
            // 5. Batuk / Pilek / Flu
            else if (
                complaintLower.includes('batuk') || 
                complaintLower.includes('pilek') || 
                complaintLower.includes('flu') || 
                complaintLower.includes('bersin') || 
                complaintLower.includes('tenggorokan') ||
                complaintLower.includes('sanaflu')
            ) {
                guessedDiagnosis = 'Influenza / Common Cold'
                guessedTreatment = 'Minum air hangat yang banyak, hindari makanan berminyak/es, serta istirahat yang cukup.'
                const flu = medicines.find(m => m.name.toLowerCase().includes('sanaflu') || m.name.toLowerCase().includes('flu'))
                if (flu) {
                    guessedMedicineId = flu.id
                    guessedMedicineQty = 3
                }
            }
            // 6. Luka Lecet / Terjatuh / Keseleo
            else if (
                complaintLower.includes('luka') || 
                complaintLower.includes('jatuh') || 
                complaintLower.includes('lecet') || 
                complaintLower.includes('darah') || 
                complaintLower.includes('keseleo') || 
                complaintLower.includes('terkilir') ||
                complaintLower.includes('sobek')
            ) {
                guessedDiagnosis = 'Luka Ringan / Ekskoriasi'
                guessedTreatment = 'Bersihkan luka dengan antiseptik/betadine, pasang perban/plester steril untuk mencegah infeksi.'
                const bet = medicines.find(m => m.name.toLowerCase().includes('betadine') || m.name.toLowerCase().includes('antiseptik'))
                if (bet) {
                    guessedMedicineId = bet.id
                    guessedMedicineQty = 1
                }
            }
            // 7. Diare / Mencret / Mules
            else if (
                complaintLower.includes('diare') || 
                complaintLower.includes('mencret') || 
                complaintLower.includes('mules') || 
                complaintLower.includes('sakit perut mules')
            ) {
                guessedDiagnosis = 'Gastroenteritis Ringan / Diare'
                guessedTreatment = 'Minum air hangat banyak/oralit secara bertahap untuk mencegah dehidrasi, hindari makanan pedas.'
                const dia = medicines.find(m => m.name.toLowerCase().includes('diapet') || m.name.toLowerCase().includes('oralit'))
                if (dia) {
                    guessedMedicineId = dia.id
                    guessedMedicineQty = 2
                }
            }
            // 8. Sakit Gigi
            else if (
                complaintLower.includes('gigi') || 
                complaintLower.includes('gusi') || 
                complaintLower.includes('geraham')
            ) {
                guessedDiagnosis = 'Sakit Gigi / Odontalgia'
                guessedTreatment = 'Kumur dengan air garam hangat, hindari makanan manis/keras/dingin, rujuk ke dokter gigi jika nyeri menetap.'
                const pcm = medicines.find(m => m.name.toLowerCase().includes('paracetamol'))
                if (pcm) {
                    guessedMedicineId = pcm.id
                    guessedMedicineQty = 1
                }
            }
            // 9. Sakit Mata / Iritasi
            else if (
                complaintLower.includes('mata') || 
                complaintLower.includes('belekan') || 
                complaintLower.includes('merah mata')
            ) {
                guessedDiagnosis = 'Iritasi Mata Ringan'
                guessedTreatment = 'Bersihkan mata dengan air mengalir bersih, berikan obat tetes mata/antiseptik, dan hindari mengucek mata.'
                const eye = medicines.find(m => m.name.toLowerCase().includes('antiseptik') || m.name.toLowerCase().includes('betadine'))
                if (eye) {
                    guessedMedicineId = eye.id
                    guessedMedicineQty = 1
                }
            }
            // 10. Herpes / Cacar Air / Varicella
            else if (
                complaintLower.includes('herpes') || 
                complaintLower.includes('cacar') || 
                complaintLower.includes('dompo') || 
                complaintLower.includes('bintil air')
            ) {
                guessedDiagnosis = 'Infeksi Herpes Zoster / Cacar Air'
                guessedTreatment = 'Jaga kebersihan kulit, jangan memecahkan bintil air, istirahat bedrest di UKS.'
                const acy = medicines.find(m => m.name.toLowerCase().includes('acyclovir') || m.name.toLowerCase().includes('antiviral'))
                if (acy) {
                    guessedMedicineId = acy.id
                    guessedMedicineQty = 3
                }
            }

            setFormLog(prev => ({
                ...prev,
                diagnosis: guessedDiagnosis,
                treatment: guessedTreatment,
                medicine_id: guessedMedicineId,
                medicine_qty: guessedMedicineQty
            }))

            setSelectedMeds([
                { medicine_id: guessedMedicineId, qty: guessedMedicineQty }
            ])

            addToast('Rekomendasi asisten lokal berhasil diterapkan!', 'success')
            setAiLoading(false)
        }, 600)
    }

    // Helper for editing a log
    const openEditLogModal = (log) => {
        setActiveLog(log)
        setFormLog({
            student_id: log.student_id || '',
            date: log.date,
            time: log.time,
            complaint: log.complaint,
            diagnosis: log.diagnosis || '',
            treatment: log.treatment,
            medicine_id: log.medicine_id || '',
            medicine_qty: log.medicine_qty || 1,
            status: log.status
        })
        setSelectedMeds([
            { medicine_id: log.medicine_id || '', qty: log.medicine_qty || 1 }
        ])
        setIsRecordModalOpen(true)
    }

    // Helper for editing a medicine
    const openEditMedModal = (med) => {
        setActiveMed(med)
        setFormMed({
            name: med.name,
            category: med.category,
            stock: med.stock,
            unit: med.unit,
            min_stock: med.min_stock,
            description: med.description || ''
        })
        setIsMedModalOpen(true)
    }

    // --- Data Processing & Filters ---

    // Filtered Health Logs
    const filteredLogs = useMemo(() => {
        return logs.filter(log => {
            const matchSearch =
                (log.student_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (log.complaint || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (log.diagnosis || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (log.medicine_name || '').toLowerCase().includes(searchQuery.toLowerCase())

            const matchStatus = selectedStatusFilter === 'All' || log.status === selectedStatusFilter
            const matchClass = selectedClassFilter === 'All' || log.class_name === selectedClassFilter

            return matchSearch && matchStatus && matchClass
        })
    }, [logs, searchQuery, selectedStatusFilter, selectedClassFilter])

    // Current Resting Students
    const restingStudents = useMemo(() => {
        return logs.filter(l => l.status === 'UKS' || l.status === 'Asrama')
    }, [logs])

    // Medicine Stock Alerts (Low Stock)
    const lowStockMeds = useMemo(() => {
        return medicines.filter(m => m.stock <= m.min_stock)
    }, [medicines])

    // Student options mapped for RichSelect component
    const studentOptions = useMemo(() => {
        return studentsList.map(s => ({
            id: s.id,
            name: `${s.name} (Kelas ${s.class_name})`
        }))
    }, [studentsList])

    // Medicine options mapped for RichSelect component
    const medicineOptions = useMemo(() => {
        return medicines.map(m => ({
            id: m.id,
            name: `${m.name} (Tersedia: ${m.stock} ${m.unit})`
        }))
    }, [medicines])

    // Paginated Logs
    const paginatedLogs = useMemo(() => {
        const start = (page - 1) * pageSize
        return filteredLogs.slice(start, start + pageSize)
    }, [filteredLogs, page, pageSize])

    // Filtered Medicines
    const filteredMeds = useMemo(() => {
        if (!searchQuery) return medicines
        return medicines.filter(m =>
            m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            m.category.toLowerCase().includes(searchQuery.toLowerCase())
        )
    }, [medicines, searchQuery])

    // Total unique classes in health logs for filter dropdown
    const availableClasses = useMemo(() => {
        const classes = new Set(logs.map(l => l.class_name))
        return Array.from(classes).filter(Boolean)
    }, [logs])

    // Status filter options for the toolbar dropdown
    const statusFilterOptions = useMemo(() => {
        return [
            { id: 'UKS', name: 'Istirahat di UKS' },
            { id: 'Asrama', name: 'Istirahat di Kamar' },
            { id: 'Kembali', name: 'Kembali ke Kelas' }
        ]
    }, [])

    // Class filter options for the toolbar dropdown
    const classFilterOptions = useMemo(() => {
        return availableClasses.map(c => ({
            id: c,
            name: c
        }))
    }, [availableClasses])

    const handlePrintLogs = () => {
        const printWindow = window.open('', '_blank')
        const html = `
            <html>
                <head>
                    <title>Jurnal Kesehatan Poskestren LaporanMu</title>
                    <style>
                        body { font-family: sans-serif; padding: 20px; color: #333; }
                        h1 { text-align: center; font-size: 20px; margin-bottom: 5px; }
                        h2 { text-align: center; font-size: 14px; margin-top: 0; color: #666; font-weight: normal; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                        th, td { border: 1px solid #ccc; padding: 8px; text-align: left; font-size: 11px; }
                        th { background: #f0f0f0; }
                    </style>
                </head>
                <body>
                    <h1>Jurnal Kesehatan Santri (Poskestren)</h1>
                    <h2>LaporanMu - Periode Mei 2026</h2>
                    <table>
                        <thead>
                            <tr>
                                <th>Tanggal & Waktu</th>
                                <th>Nama Santri</th>
                                <th>Kelas</th>
                                <th>Keluhan</th>
                                <th>Diagnosis</th>
                                <th>Tindakan / Perawatan</th>
                                <th>Pemberian Obat</th>
                                <th>Status Akhir</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${filteredLogs.map(l => `
                                <tr>
                                    <td>${l.date} ${l.time}</td>
                                    <td><strong>${l.student_name}</strong></td>
                                    <td>${l.class_name}</td>
                                    <td>${l.complaint}</td>
                                    <td>${l.diagnosis || '-'}</td>
                                    <td>${l.treatment}</td>
                                    <td>${l.medicine_name} (${l.medicine_qty})</td>
                                    <td>${l.status === 'UKS' ? 'Istirahat di UKS' : l.status === 'Asrama' ? 'Istirahat di Asrama' : 'Kembali ke Kelas'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    <script>window.print();</script>
                </body>
            </html>
        `
        printWindow.document.write(html)
        printWindow.document.close()
    }

    const handleExportCSV = () => {
        const headers = ['Tanggal', 'Waktu', 'Nama Santri', 'Kelas', 'Keluhan', 'Diagnosis', 'Tindakan', 'Obat', 'Jumlah Obat', 'Status']
        const rows = filteredLogs.map(l => [
            l.date, l.time, l.student_name, l.class_name,
            l.complaint, l.diagnosis || '', l.treatment,
            l.medicine_name, l.medicine_qty, l.status
        ])
        const csvContent = "data:text/csv;charset=utf-8,"
            + [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n')

        const encodedUri = encodeURI(csvContent)
        const link = document.createElement("a")
        link.setAttribute("href", encodedUri)
        link.setAttribute("download", `rekam_medis_uks_${new Date().toISOString().slice(0, 10)}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    return (
        <DashboardLayout title={tp('title')}>
            <div className="p-4 sm:p-6 space-y-5">
                {/* ─── PAGE HEADER WITH INTEGRATED BREADCRUMB ─── */}
                <PageHeader
                    badge="Kesantrian"
                    breadcrumbs={['UKS & Poskestren']}
                    title={tp('title')}
                    subtitle={tp('desc')}
                    actions={
                        <div className="flex items-center gap-2">
                            {/* Dropdown: Cetak / Ekspor */}
                            {activeTab === 'medical' && (
                                <div className="relative">
                                    <button
                                        ref={dataMenuBtnRef}
                                        onClick={() => {
                                            if (!isDataMenuOpen) {
                                                setDataMenuRect(dataMenuBtnRef.current?.getBoundingClientRect())
                                            }
                                            setIsDataMenuOpen(v => !v)
                                        }}
                                        className={`h-9 w-9 rounded-xl border flex items-center justify-center transition-all ${
                                            isDataMenuOpen
                                                ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)]/30 text-[var(--color-primary)]'
                                                : 'bg-[var(--color-surface-alt)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-border)]'
                                        }`}
                                        title="Opsi Cetak & Ekspor"
                                    >
                                        <Sliders className="w-4 h-4" />
                                    </button>

                                    {dataMenuMounted && dataMenuRect && createPortal(
                                        <>
                                            <div
                                                className={`fixed inset-0 z-[9990] bg-black/[0.08] transition-opacity duration-200 ${isDataMenuOpen ? 'opacity-100' : 'opacity-0'}`}
                                                onClick={() => setIsDataMenuOpen(false)}
                                            />
                                            <div
                                                id="portal-health-header-menu"
                                                className={`fixed z-[9991] w-56 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl p-2 transition-[opacity,transform] duration-200 ease-out origin-top-right ${
                                                    isDataMenuOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-2'
                                                }`}
                                                style={{ top: dataMenuRect.bottom + 8, left: Math.max(10, dataMenuRect.right - 224) }}
                                            >
                                                <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] px-3 py-2">Opsi Data</p>
                                                <button
                                                    onClick={() => { setIsDataMenuOpen(false); handlePrintLogs(); }}
                                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--color-surface-alt)] text-[var(--color-text)] transition-all group text-left"
                                                >
                                                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                        <Printer className="w-4 h-4" />
                                                    </div>
                                                    <div className="text-left">
                                                        <p className="text-[11px] font-black leading-tight">Cetak Jurnal Medis</p>
                                                        <p className="text-[9px] opacity-40 font-bold uppercase tracking-wider">pdf / kertas</p>
                                                    </div>
                                                </button>
                                                <div className="h-px bg-[var(--color-border)] my-1" />
                                                <button
                                                    onClick={() => { setIsDataMenuOpen(false); handleExportCSV(); }}
                                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--color-surface-alt)] text-[var(--color-text)] transition-all group text-left"
                                                >
                                                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                        <Download className="w-4 h-4" />
                                                    </div>
                                                    <div className="text-left">
                                                        <p className="text-[11px] font-black leading-tight">Unduh Data Rekam Medis</p>
                                                        <p className="text-[9px] opacity-40 font-bold uppercase tracking-wider">xlsx / csv</p>
                                                    </div>
                                                </button>
                                            </div>
                                        </>,
                                        document.body
                                    )}
                                </div>
                            )}

                            {/* Privasi — di tengah, selalu tampil */}
                            <button
                                onClick={() => setIsPrivacyMode(v => !v)}
                                className={`h-9 px-3 rounded-xl border flex items-center gap-2 transition-all ${
                                    isPrivacyMode
                                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-600'
                                        : 'bg-[var(--color-surface-alt)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                                }`}
                                title={isPrivacyMode ? tp('privacyModeOn') : tp('privacyModeOff')}
                            >
                                {isPrivacyMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                <span className="text-[10px] font-black uppercase tracking-widest hidden md:inline">{tp('privacy')}</span>
                            </button>
                            {activeTab === 'medical' && (
                                <button
                                    onClick={() => {
                                        setActiveLog(null)
                                        setFormLog({
                                            student_id: '',
                                            date: new Date().toISOString().split('T')[0],
                                            time: new Date().toTimeString().split(' ')[0].slice(0, 5),
                                            complaint: '',
                                            diagnosis: '',
                                            treatment: '',
                                            medicine_id: '',
                                            medicine_qty: 1,
                                            status: 'UKS'
                                        })
                                        setSelectedMeds([
                                            { medicine_id: '', qty: 1 }
                                        ])
                                        setIsRecordModalOpen(true)
                                    }}
                                    className="h-9 px-4 sm:px-5 rounded-xl transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest bg-[var(--color-primary)] text-white hover:scale-[1.02] active:scale-95 shadow-md shadow-[var(--color-primary)]/20 border border-white/10"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>{tp('btnRecordAdd')}</span>
                                </button>
                            )}
                            {activeTab === 'inventory' && (
                                <button
                                    onClick={() => {
                                        setActiveMed(null)
                                        setFormMed({
                                            name: '',
                                            category: 'Analgesik / Antipiretik',
                                            stock: 50,
                                            unit: 'tablet',
                                            min_stock: 15,
                                            description: ''
                                        })
                                        setIsMedModalOpen(true)
                                    }}
                                    className="h-9 px-4 sm:px-5 rounded-xl transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest bg-emerald-600 text-white hover:scale-[1.02] active:scale-95 shadow-md shadow-emerald-600/20 border border-white/10"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>{tp('btnMedAdd')}</span>
                                </button>
                            )}
                        </div>
                    }
                />

                {/* ─── HIGH-DENSITY STATISTICS CAROUSEL ─── */}
                <StatsCarousel count={4} className="mb-5">
                    <StatCard
                        onClick={() => { setActiveTab('medical'); setSelectedStatusFilter('All'); }}
                        isActive={activeTab === 'medical' && selectedStatusFilter === 'All'}
                        label={tp('statTotal')}
                        value={logs.length}
                        icon={Star}
                        color="primary"
                    />
                    <StatCard
                        onClick={() => setActiveTab('resting')}
                        isActive={activeTab === 'resting'}
                        label={tp('statResting')}
                        value={restingStudents.length}
                        icon={Bed}
                        color="amber"
                    />
                    <StatCard
                        onClick={() => { setActiveTab('inventory'); }}
                        isActive={activeTab === 'inventory'}
                        label={tp('statLowStock')}
                        value={lowStockMeds.length}
                        icon={Pill}
                        color={lowStockMeds.length > 0 ? "rose" : "indigo"}
                    />
                    <StatCard
                        label={tp('statHealthy')}
                        value="SIAGA"
                        icon={HeartPulse}
                        color="emerald"
                    />
                </StatsCarousel>

                {/* ─── NAVIGATION TABS ─── */}
                <div className="flex gap-1 sm:gap-1.5 p-1 rounded-2xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] w-full sm:w-fit overflow-x-auto scrollbar-hide shrink-0">
                    <button
                        onClick={() => { setActiveTab('medical'); setSearchQuery(''); }}
                        className={`flex-1 sm:flex-none h-9 px-6 rounded-xl text-[11px] font-black flex items-center justify-center gap-2 transition-all whitespace-nowrap ${activeTab === 'medical' ? 'bg-[var(--color-surface)] text-[var(--color-primary)] shadow-sm' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
                    >
                        <FileText className="w-3.5 h-3.5 shrink-0" />
                        <span>{tp('tabMedical')}</span>
                    </button>
                    <button
                        onClick={() => { setActiveTab('resting'); setSearchQuery(''); }}
                        className={`flex-1 sm:flex-none h-9 px-6 rounded-xl text-[11px] font-black flex items-center justify-center gap-2 transition-all whitespace-nowrap ${activeTab === 'resting' ? 'bg-[var(--color-surface)] text-[var(--color-primary)] shadow-sm' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
                    >
                        <Bed className="w-3.5 h-3.5 shrink-0" />
                        <span>{tp('tabResting')} ({tNum(restingStudents.length)})</span>
                    </button>
                    <button
                        onClick={() => { setActiveTab('inventory'); setSearchQuery(''); }}
                        className={`flex-1 sm:flex-none h-9 px-6 rounded-xl text-[11px] font-black flex items-center justify-center gap-2 transition-all whitespace-nowrap ${activeTab === 'inventory' ? 'bg-[var(--color-surface)] text-[var(--color-primary)] shadow-sm' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
                    >
                        <Pill className="w-3.5 h-3.5 shrink-0" />
                        <span>{tp('tabInventory')}</span>
                    </button>
                </div>

                {/* ─── TAB: REKAM MEDIS (MEDICAL RECORDS) ─── */}
                {activeTab === 'medical' && (
                    <div className="glass rounded-[1.5rem] border border-[var(--color-border)] overflow-hidden animate-in fade-in duration-200">
                        {/* Toolbar */}
                        <div className="p-4 border-b border-[var(--color-border)] flex flex-col md:flex-row md:items-center gap-3 bg-[var(--color-surface-alt)]/20">
                            {/* Search bar */}
                            <div className="relative flex-1 min-w-[200px]">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)] pointer-events-none" />
                                <input
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    placeholder={tp('searchPlaceholder')}
                                    className="w-full h-9 pl-9 pr-8 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[12px] font-bold focus:outline-none focus:border-[var(--color-primary)] transition-all"
                                />
                                {searchQuery && (
                                    <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>

                            {/* Class & Status Filters */}
                            <div className="flex flex-wrap items-center gap-2">
                                <div className="w-[170px]">
                                    <RichSelect
                                        value={selectedStatusFilter}
                                        onChange={setSelectedStatusFilter}
                                        options={statusFilterOptions}
                                        placeholder="Semua Observasi"
                                        small
                                        extraOption={{ id: 'All', name: 'Semua Observasi' }}
                                        buttonClassName="!h-9 !rounded-xl text-[11px] font-black"
                                    />
                                </div>

                                <div className="w-[150px]">
                                    <RichSelect
                                        value={selectedClassFilter}
                                        onChange={setSelectedClassFilter}
                                        options={classFilterOptions}
                                        placeholder="Semua Kelas"
                                        small
                                        extraOption={{ id: 'All', name: 'Semua Kelas' }}
                                        buttonClassName="!h-9 !rounded-xl text-[11px] font-black"
                                    />
                                </div>

                            </div>
                        </div>

                        {/* List / Table */}
                        <div className="overflow-x-auto">
                            {loading ? (
                                <div className="p-12 flex flex-col items-center justify-center gap-3">
                                    <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                                    <p className="text-[11px] text-[var(--color-text-muted)] font-black uppercase tracking-widest">Memuat rekam medis...</p>
                                </div>
                            ) : logs.length === 0 ? (
                                <EmptyState
                                    title={tp('emptyTitle')}
                                    description={tp('emptyDesc')}
                                    icon={HeartPulse}
                                    variant="plain"
                                />
                            ) : filteredLogs.length === 0 ? (
                                <EmptyState
                                    icon={Search}
                                    title="Pencarian Tidak Ditemukan"
                                    description="Tidak ada santri yang sesuai dengan filter atau kata kunci pencarian Anda."
                                    variant="plain"
                                    color="indigo"
                                    action={
                                        <button
                                            onClick={() => {
                                                setSearchQuery('')
                                                setSelectedStatusFilter('All')
                                                setSelectedClassFilter('All')
                                            }}
                                            className="h-9 px-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition"
                                        >
                                            Reset Filter
                                        </button>
                                    }
                                />
                            ) : (
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-[var(--color-surface-alt)]/60 border-b border-[var(--color-border)] text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">
                                            <th className="px-4 py-3.5">Santri</th>
                                            <th className="px-4 py-3.5">Tanggal & Waktu</th>
                                            <th className="px-4 py-3.5">Keluhan Utama</th>
                                            <th className="px-4 py-3.5">Diagnosis</th>
                                            <th className="px-4 py-3.5">Penanganan</th>
                                            <th className="px-4 py-3.5">Pemberian Obat</th>
                                            <th className="px-4 py-3.5">Status Observasi</th>
                                            <th className="px-4 py-3.5 text-right w-28">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--color-border)]">
                                        {paginatedLogs.map(log => (
                                            <tr key={log.id} className="group hover:bg-[var(--color-surface-alt)]/10 transition-colors">
                                                <td className="px-4 py-3">
                                                    <div className="flex flex-col">
                                                        <span className={`text-[12px] font-black text-[var(--color-text)] ${isPrivacyMode ? 'blur-sm select-none' : ''}`}>{isPrivacyMode ? maskInfo(log.student_name, 3) : log.student_name}</span>
                                                        <span className="text-[10px] text-[var(--color-text-muted)] font-bold">Kelas {isPrivacyMode ? maskInfo(log.class_name, 2) : log.class_name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-[11px] text-[var(--color-text-muted)] font-bold tabular-nums">
                                                    <div>{log.date}</div>
                                                    <div className="text-[10px] opacity-75">{log.time}</div>
                                                </td>
                                                <td className="px-4 py-3 text-[12px] text-[var(--color-text)] font-semibold max-w-[200px] truncate" title={!isPrivacyMode ? log.complaint : undefined}>
                                                    <span className={isPrivacyMode ? 'blur-sm select-none' : ''}>{isPrivacyMode ? maskInfo(log.complaint, 4) : log.complaint}</span>
                                                </td>
                                                <td className="px-4 py-3 text-[11px] text-[var(--color-text-muted)] font-black">
                                                    <span className={isPrivacyMode ? 'blur-sm select-none' : ''}>{isPrivacyMode ? maskInfo(log.diagnosis, 4) : (log.diagnosis || '-')}</span>
                                                </td>
                                                <td className="px-4 py-3 text-[11px] text-[var(--color-text-muted)] max-w-[220px] truncate" title={!isPrivacyMode ? log.treatment : undefined}>
                                                    <span className={isPrivacyMode ? 'blur-sm select-none' : ''}>{isPrivacyMode ? maskInfo(log.treatment, 4) : log.treatment}</span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    {log.medicine_name && log.medicine_name !== '-' ? (
                                                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-[10px] font-black">
                                                            <Pill className="w-3 h-3" />
                                                            <span>{log.medicine_name} ({tNum(log.medicine_qty)})</span>
                                                        </span>
                                                    ) : <span className="text-[10px] text-[var(--color-text-muted)] opacity-50">-</span>}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {log.status === 'UKS' && (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 border border-amber-500/20 text-[10px] font-black">
                                                            <Bed className="w-3.5 h-3.5" />
                                                            <span>UKS</span>
                                                        </span>
                                                    )}
                                                    {log.status === 'Asrama' && (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-600 border border-indigo-500/20 text-[10px] font-black">
                                                            <ArrowRightLeft className="w-3.5 h-3.5" />
                                                            <span>Kamar</span>
                                                        </span>
                                                    )}
                                                    {log.status === 'Kembali' && (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 border border-emerald-500/20 text-[10px] font-black">
                                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                                            <span>Kembali KBM</span>
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        {log.status !== 'Kembali' && (
                                                            <button
                                                                onClick={() => { setLogToSembuh(log); setIsConfirmSembuhOpen(true) }}
                                                                className="w-7 h-7 rounded-lg border border-emerald-500/20 text-emerald-600 bg-emerald-500/5 hover:bg-emerald-500 hover:text-white flex items-center justify-center transition-all"
                                                                title="Tandai Sembuh"
                                                            >
                                                                <Check className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => openEditLogModal(log)}
                                                            className="w-7 h-7 rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-indigo-600 flex items-center justify-center transition-all bg-[var(--color-surface)]"
                                                            title="Edit Catatan"
                                                        >
                                                            <Edit2 className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={() => { setLogToDelete(log); setIsConfirmDeleteOpen(true) }}
                                                            className="w-7 h-7 rounded-lg border border-rose-500/20 text-rose-500 bg-rose-500/5 hover:bg-rose-500 hover:text-white flex items-center justify-center transition-all"
                                                            title="Hapus Catatan"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        {/* Pagination */}
                        {filteredLogs.length > pageSize && (
                            <div className="p-4 border-t border-[var(--color-border)] bg-[var(--color-surface-alt)]/10">
                                <Pagination
                                    page={page}
                                    total={filteredLogs.length}
                                    pageSize={pageSize}
                                    onChange={setPage}
                                />
                            </div>
                        )}
                    </div>
                )}

                {/* ─── TAB: SANTRI OBSERVASI (UKS) ─── */}
                {activeTab === 'resting' && (
                    <div className="animate-in fade-in duration-200">
                        {restingStudents.length === 0 ? (
                            <EmptyState
                                icon={CheckCircle2}
                                title="Alhamdulillah! Semua Santri Sehat"
                                description="Saat ini tidak ada santri yang sedang dirawat atau beristirahat di Poskestren/UKS."
                                color="emerald"
                                variant="plain"
                            />
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {restingStudents.map(log => (
                                    <div key={log.id} className="glass rounded-[1.5rem] border border-[var(--color-border)] hover:border-amber-500/30 p-5 transition-all relative overflow-hidden group">
                                        {/* Status Tag */}
                                        <div className="absolute top-4 right-4">
                                            {log.status === 'UKS' ? (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 text-amber-600 border border-amber-500/20 text-[10px] font-black">
                                                    <Bed className="w-3.5 h-3.5" />
                                                    <span>Observasi UKS</span>
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/15 text-indigo-600 border border-indigo-500/20 text-[10px] font-black">
                                                    <ArrowRightLeft className="w-3.5 h-3.5" />
                                                    <span>Istirahat Kamar</span>
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                                                <User className="w-6 h-6 text-[var(--color-text-muted)]" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <h4 className={`text-[14px] font-black text-[var(--color-text)] truncate ${isPrivacyMode ? 'blur-sm select-none' : ''}`}>{isPrivacyMode ? maskInfo(log.student_name, 3) : log.student_name}</h4>
                                                <p className="text-[11px] text-[var(--color-text-muted)] font-bold mb-3">Kelas {isPrivacyMode ? maskInfo(log.class_name, 2) : log.class_name}</p>

                                                <div className="space-y-2 text-[12px] text-[var(--color-text)] font-medium">
                                                    <div>
                                                        <span className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider block font-bold">Keluhan</span>
                                                        <p className={`font-semibold text-rose-500 text-[12px] ${isPrivacyMode ? 'blur-sm select-none' : ''}`}>{isPrivacyMode ? maskInfo(log.complaint, 4) : log.complaint}</p>
                                                    </div>
                                                    <div>
                                                        <span className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider block font-bold">Rencana Tindakan & Obat</span>
                                                        <p className={`text-[11px] text-[var(--color-text-muted)] ${isPrivacyMode ? 'blur-sm select-none' : ''}`}>{isPrivacyMode ? maskInfo(log.treatment, 4) : log.treatment} • <strong className="text-[var(--color-text)] font-black">{log.medicine_name}</strong></p>
                                                    </div>
                                                    <div className="pt-1 text-[10px] text-[var(--color-text-muted)] flex items-center gap-1.5">
                                                        <Clock className="w-3.5 h-3.5" />
                                                        <span>Mulai istirahat: {log.date} {log.time}</span>
                                                    </div>
                                                </div>

                                                <div className="mt-5 flex gap-2">
                                                    <button
                                                        onClick={() => { setLogToSembuh(log); setIsConfirmSembuhOpen(true) }}
                                                        className="flex-1 h-9 bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-black rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm"
                                                    >
                                                        <Check className="w-4 h-4" />
                                                        <span>Sudah Sembuh & Kembali</span>
                                                    </button>
                                                    <button
                                                        onClick={() => openEditLogModal(log)}
                                                        className="w-9 h-9 border border-[var(--color-border)] hover:bg-[var(--color-surface-alt)]/20 text-[var(--color-text-muted)] hover:text-[var(--color-text)] rounded-xl flex items-center justify-center transition-all bg-[var(--color-surface)]"
                                                        title="Edit Log Medis"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ─── TAB: INVENTARIS OBAT (INVENTORY) ─── */}
                {activeTab === 'inventory' && (
                    <div className="glass rounded-[1.5rem] border border-[var(--color-border)] overflow-hidden animate-in fade-in duration-200">
                        {/* Toolbar */}
                        <div className="p-4 border-b border-[var(--color-border)] flex flex-col md:flex-row md:items-center gap-3 bg-[var(--color-surface-alt)]/20">
                            {/* Search bar */}
                            <div className="relative flex-1 min-w-[200px]">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)] pointer-events-none" />
                                <input
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    placeholder="Cari nama obat, kategori..."
                                    className="w-full h-9 pl-9 pr-8 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[12px] font-bold focus:outline-none focus:border-[var(--color-primary)] transition-all"
                                />
                                {searchQuery && (
                                    <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Inventory Table */}
                        <div className="overflow-x-auto">
                            {medicines.length === 0 ? (
                                <EmptyState
                                    icon={Pill}
                                    title="Inventaris Obat Kosong"
                                    description="Belum ada obat yang terdaftar di dalam inventaris Poskestren."
                                    variant="plain"
                                    color="indigo"
                                />
                            ) : filteredMeds.length === 0 ? (
                                <EmptyState
                                    icon={Search}
                                    title="Pencarian Tidak Ditemukan"
                                    description="Tidak ada obat yang sesuai dengan kata kunci pencarian Anda."
                                    variant="plain"
                                    color="indigo"
                                    action={
                                        <button
                                            onClick={() => setSearchQuery('')}
                                            className="h-9 px-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition"
                                        >
                                            Reset Filter
                                        </button>
                                    }
                                />
                            ) : (
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-[var(--color-surface-alt)]/60 border-b border-[var(--color-border)] text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">
                                            <th className="px-4 py-3.5">Nama Obat</th>
                                            <th className="px-4 py-3.5">Kategori</th>
                                            <th className="px-4 py-3.5">Deskripsi / Indikasi</th>
                                            <th className="px-4 py-3.5">Level Stok</th>
                                            <th className="px-4 py-3.5">Jumlah Tersedia</th>
                                            <th className="px-4 py-3.5 text-right w-28">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--color-border)]">
                                        {filteredMeds.map(med => {
                                            const isLow = med.stock <= med.min_stock
                                            const percentage = Math.min(100, Math.round((med.stock / (med.min_stock * 3)) * 100))
                                            return (
                                                <tr key={med.id} className="group hover:bg-[var(--color-surface-alt)]/10 transition-colors">
                                                    <td className="px-4 py-3 font-black text-[12px] text-[var(--color-text)]">{med.name}</td>
                                                    <td className="px-4 py-3">
                                                        <span className="text-[10px] font-black px-2 py-0.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-text-muted)]">
                                                            {med.category}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-[11px] text-[var(--color-text-muted)] max-w-[200px] truncate" title={med.description}>
                                                        {med.description || '-'}
                                                    </td>
                                                    <td className="px-4 py-3 min-w-[120px]">
                                                        <div className="flex items-center gap-2">
                                                            <div className="flex-1 h-2 rounded-full bg-[var(--color-border)] overflow-hidden">
                                                                <div
                                                                    className={`h-2 rounded-full transition-all ${isLow ? 'bg-rose-500' : 'bg-emerald-500'}`}
                                                                    style={{ width: `${percentage}%` }}
                                                                />
                                                            </div>
                                                            <span className="text-[10px] font-bold text-[var(--color-text-muted)] tabular-nums">{tNum(percentage)}%</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className={`text-[12px] font-black tabular-nums ${isLow ? 'text-rose-600 font-extrabold' : 'text-[var(--color-text)]'}`}>
                                                                {tNum(med.stock)}
                                                            </span>
                                                            <span className="text-[10px] text-[var(--color-text-muted)] font-bold">{med.unit}</span>
                                                            {isLow && (
                                                                <span className="inline-flex items-center text-[8.5px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-600 border border-rose-500/20 ml-2">
                                                                    LOW STOCK
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button
                                                                onClick={() => openEditMedModal(med)}
                                                                className="w-7 h-7 rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-indigo-600 flex items-center justify-center transition-all bg-[var(--color-surface)]"
                                                                title="Edit Obat"
                                                            >
                                                                <Edit2 className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button
                                                                onClick={async () => {
                                                                    try {
                                                                        await supabase.from('health_medicines').delete().eq('id', med.id)
                                                                    } catch {}
                                                                    setMedicines(prev => prev.filter(m => m.id !== med.id))
                                                                    addToast('Obat berhasil dihapus dari inventaris', 'success')
                                                                }}
                                                                className="w-7 h-7 rounded-lg border border-rose-500/20 text-rose-500 bg-rose-500/5 hover:bg-rose-500 hover:text-white flex items-center justify-center transition-all"
                                                                title="Hapus Obat"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                )}

                {/* ─── MODAL: TAMBAH / EDIT REKAM MEDIS ─── */}
                <Modal
                    isOpen={isRecordModalOpen}
                    onClose={() => setIsRecordModalOpen(false)}
                    title={activeLog ? 'Edit Catatan Medis' : 'Tambah Catatan Medis'}
                    description={activeLog ? 'Perbarui data rekam medis santri' : 'Catat riwayat pemeriksaan kesehatan santri baru'}
                    icon={HeartPulse}
                    iconBg="bg-emerald-500/10"
                    iconColor="text-emerald-600"
                    size="lg"
                    footer={
                        <div className="flex items-center justify-between gap-2.5 w-full">
                            <button
                                type="button"
                                onClick={() => setIsRecordModalOpen(false)}
                                className="h-10 px-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] text-[10px] font-black uppercase tracking-widest transition"
                            >
                                Batal
                            </button>
                            <button
                                type="submit"
                                form="record-form"
                                disabled={submitting}
                                className="h-10 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-600/20 transition flex items-center justify-center gap-2"
                            >
                                <Check className="w-3.5 h-3.5" />
                                <span>{submitting ? 'Menyimpan...' : 'Simpan Catatan'}</span>
                            </button>
                        </div>
                    }
                >
                    <form id="record-form" onSubmit={handleSaveRecord} className="space-y-4 text-left">
                        {/* Pilih Santri */}
                        <div>
                            <label className="text-[9.5px] font-black uppercase tracking-widest text-[var(--color-text-muted)] block mb-1.5">Santri / Pasien</label>
                            <RichSelect
                                value={formLog.student_id}
                                onChange={val => setFormLog(prev => ({ ...prev, student_id: val }))}
                                options={studentOptions}
                                placeholder="Pilih Santri / Pasien..."
                                searchable
                                icon={User}
                            />
                        </div>

                        {/* Tanggal & Waktu Custom Pickers */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="text-[9.5px] font-black uppercase tracking-widest text-[var(--color-text-muted)] block mb-1.5">Tanggal Masuk</label>
                                <RichDatePicker
                                    value={formLog.date}
                                    onChange={val => setFormLog(prev => ({ ...prev, date: val }))}
                                    placeholder="Pilih tanggal"
                                />
                            </div>
                            <div>
                                <label className="text-[9.5px] font-black uppercase tracking-widest text-[var(--color-text-muted)] block mb-1.5">Waktu / Jam</label>
                                <RichTimePicker
                                    value={formLog.time}
                                    onChange={val => setFormLog(prev => ({ ...prev, time: val }))}
                                />
                            </div>
                        </div>

                        {/* Keluhan & Diagnosis */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <div className="flex justify-between items-center mb-1.5">
                                    <label className="text-[9.5px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Keluhan Santri</label>
                                    {formLog.complaint.trim().length >= 3 && (
                                        <button
                                            type="button"
                                            onClick={handleAIAnalyze}
                                            disabled={aiLoading}
                                            className={`text-[8.5px] font-black uppercase tracking-wider flex items-center gap-1 px-2 py-0.5 rounded-lg transition-all duration-300 ${
                                                aiLoading
                                                    ? 'bg-purple-100 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400 animate-pulse'
                                                    : 'bg-purple-500/10 text-purple-600 hover:bg-purple-600 hover:text-white dark:bg-purple-500/20 dark:text-purple-400 dark:hover:bg-purple-600 dark:hover:text-white active:scale-95'
                                            }`}
                                            title="Gunakan AI untuk mendeteksi Diagnosis Awal, Tindakan, dan Obat secara otomatis"
                                        >
                                            <Sparkles className={`w-2.5 h-2.5 ${aiLoading ? 'animate-spin' : ''}`} />
                                            <span>{aiLoading ? 'Menganalisis...' : 'Rekomendasi AI'}</span>
                                        </button>
                                    )}
                                </div>
                                <textarea
                                    value={formLog.complaint}
                                    onChange={e => setFormLog(prev => ({ ...prev, complaint: e.target.value }))}
                                    placeholder="Contoh: Panas dingin, mual, sakit tenggorokan..."
                                    className="w-full h-20 p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[12px] font-bold focus:outline-none focus:border-[var(--color-primary)] resize-none"
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-[9.5px] font-black uppercase tracking-widest text-[var(--color-text-muted)] block mb-1.5">Diagnosis Awal</label>
                                <textarea
                                    value={formLog.diagnosis}
                                    onChange={e => setFormLog(prev => ({ ...prev, diagnosis: e.target.value }))}
                                    placeholder="Contoh: Gejala Influenza, Maag akut..."
                                    className="w-full h-20 p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[12px] font-bold focus:outline-none focus:border-[var(--color-primary)] resize-none"
                                />
                            </div>
                        </div>

                        {/* Penanganan & Obat */}
                        <div>
                            <label className="text-[9.5px] font-black uppercase tracking-widest text-[var(--color-text-muted)] block mb-1.5">Tindakan / Penanganan</label>
                            <input
                                value={formLog.treatment}
                                onChange={e => setFormLog(prev => ({ ...prev, treatment: e.target.value }))}
                                placeholder="Contoh: Diberi kompres hangat, disuruh tidur bedrest"
                                className="w-full h-10 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[12px] font-bold focus:outline-none focus:border-[var(--color-primary)]"
                                required
                            />
                        </div>

                        {/* Daftar Obat Diberikan (Mendukung Multi-Obat) */}
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <label className="text-[9.5px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Obat Diberikan</label>
                                <button
                                    type="button"
                                    onClick={() => setSelectedMeds(prev => [...prev, { medicine_id: '', qty: 1 }])}
                                    className="text-[8.5px] font-black uppercase tracking-wider text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 flex items-center gap-1 transition"
                                >
                                    <Plus className="w-3 h-3" />
                                    <span>Tambah Obat</span>
                                </button>
                            </div>

                            {selectedMeds.map((item, index) => (
                                <div key={index} className="grid grid-cols-12 gap-2 items-end animate-in slide-in-from-left-2 duration-200">
                                    <div className="col-span-8 sm:col-span-9">
                                        <RichSelect
                                            value={item.medicine_id || ''}
                                            onChange={val => {
                                                const next = [...selectedMeds]
                                                next[index].medicine_id = val
                                                setSelectedMeds(next)
                                            }}
                                            options={medicineOptions}
                                            placeholder="Tidak ada obat / obat luar saja"
                                            searchable
                                            icon={Pill}
                                            extraOption={{ id: '', name: 'Tidak ada obat / obat luar saja' }}
                                        />
                                    </div>
                                    <div className="col-span-3 sm:col-span-2">
                                        <input
                                            type="number"
                                            min="1"
                                            value={item.qty}
                                            onChange={e => {
                                                const next = [...selectedMeds]
                                                next[index].qty = Math.max(1, Number(e.target.value) || 1)
                                                setSelectedMeds(next)
                                            }}
                                            className="w-full h-10 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[12px] font-bold focus:outline-none focus:border-[var(--color-primary)] text-center"
                                        />
                                    </div>
                                    <div className="col-span-1 flex justify-center pb-2">
                                        {selectedMeds.length > 1 ? (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSelectedMeds(prev => prev.filter((_, idx) => idx !== index))
                                                }}
                                                className="text-rose-500 hover:text-rose-600 transition p-1"
                                                title="Hapus Obat"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        ) : (
                                            <div className="w-6 h-6" />
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Status Rekomendasi */}
                        <div>
                            <label className="text-[9.5px] font-black uppercase tracking-widest text-[var(--color-text-muted)] block mb-1.5">Rekomendasi Observasi</label>
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { k: 'UKS', l: 'Rawat di UKS' },
                                    { k: 'Asrama', l: 'Rest di Asrama' },
                                    { k: 'Kembali', l: 'Kembali KBM' }
                                ].map(s => (
                                    <button
                                        type="button"
                                        key={s.k}
                                        onClick={() => setFormLog(prev => ({ ...prev, status: s.k }))}
                                        className={`h-10 rounded-xl border text-[11px] font-black transition-all ${formLog.status === s.k
                                            ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm'
                                            : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)]'
                                            }`}
                                    >
                                        {s.l}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </form>
                </Modal>

                {/* ─── MODAL: TAMBAH / EDIT OBAT INVENTARIS ─── */}
                <Modal
                    isOpen={isMedModalOpen}
                    onClose={() => setIsMedModalOpen(false)}
                    title={activeMed ? 'Edit Data Obat' : 'Tambah Obat Baru'}
                    description={activeMed ? 'Perbarui stok dan kategori obat' : 'Tambahkan obat baru ke daftar inventaris Poskestren'}
                    icon={Pill}
                    iconBg="bg-indigo-500/10"
                    iconColor="text-indigo-600"
                    size="md"
                    footer={
                        <div className="flex items-center justify-between gap-2.5 w-full">
                            <button
                                type="button"
                                onClick={() => setIsMedModalOpen(false)}
                                className="h-10 px-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] text-[10px] font-black uppercase tracking-widest transition"
                            >
                                Batal
                            </button>
                            <button
                                type="submit"
                                form="med-form"
                                className="h-10 px-6 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20 transition flex items-center justify-center gap-2"
                            >
                                <Check className="w-3.5 h-3.5" />
                                <span>Simpan Obat</span>
                            </button>
                        </div>
                    }
                >
                    <form id="med-form" onSubmit={handleSaveMedicine} className="space-y-4 text-left">
                        {/* Nama Obat */}
                        <div>
                            <label className="text-[9.5px] font-black uppercase tracking-widest text-[var(--color-text-muted)] block mb-1.5">Nama Obat / Merek</label>
                            <input
                                value={formMed.name}
                                onChange={e => setFormMed(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="Contoh: Paracetamol 500mg, Sanaflu..."
                                className="w-full h-10 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[12px] font-bold focus:outline-none focus:border-[var(--color-primary)]"
                                required
                            />
                        </div>

                        {/* Kategori & Satuan */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[9.5px] font-black uppercase tracking-widest text-[var(--color-text-muted)] block mb-1.5">Kategori</label>
                                <select
                                    value={formMed.category}
                                    onChange={e => setFormMed(prev => ({ ...prev, category: e.target.value }))}
                                    className="w-full h-10 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[12px] font-bold focus:outline-none focus:border-[var(--color-primary)] cursor-pointer"
                                    required
                                >
                                    <option value="Analgesik / Antipiretik">Analgesik / Antipiretik</option>
                                    <option value="Antibiotik">Antibiotik</option>
                                    <option value="Obat Lambung">Obat Lambung</option>
                                    <option value="Obat Flu & Batuk">Obat Flu & Batuk</option>
                                    <option value="Antiseptik">Antiseptik</option>
                                    <option value="Anti-alergi">Anti-alergi</option>
                                    <option value="Multivitamin">Multivitamin</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-[9.5px] font-black uppercase tracking-widest text-[var(--color-text-muted)] block mb-1.5">Satuan</label>
                                <select
                                    value={formMed.unit}
                                    onChange={e => setFormMed(prev => ({ ...prev, unit: e.target.value }))}
                                    className="w-full h-10 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[12px] font-bold focus:outline-none focus:border-[var(--color-primary)] cursor-pointer"
                                >
                                    <option value="tablet">Tablet / Kaplet</option>
                                    <option value="botol">Botol / Syrup</option>
                                    <option value="tube">Tube / Salep</option>
                                    <option value="sachet">Sachet / Puyer</option>
                                </select>
                            </div>
                        </div>

                        {/* Stok Awal & Stok Minimum */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[9.5px] font-black uppercase tracking-widest text-[var(--color-text-muted)] block mb-1.5">Stok Tersedia</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={formMed.stock}
                                    onChange={e => setFormMed(prev => ({ ...prev, stock: e.target.value }))}
                                    className="w-full h-10 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[12px] font-bold focus:outline-none focus:border-[var(--color-primary)]"
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-[9.5px] font-black uppercase tracking-widest text-[var(--color-text-muted)] block mb-1.5">Stok Minimum (Alert)</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={formMed.min_stock}
                                    onChange={e => setFormMed(prev => ({ ...prev, min_stock: e.target.value }))}
                                    className="w-full h-10 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[12px] font-bold focus:outline-none focus:border-[var(--color-primary)]"
                                    required
                                />
                            </div>
                        </div>

                        {/* Deskripsi */}
                        <div>
                            <label className="text-[9.5px] font-black uppercase tracking-widest text-[var(--color-text-muted)] block mb-1.5">Indikasi / Keterangan</label>
                            <textarea
                                value={formMed.description}
                                onChange={e => setFormMed(prev => ({ ...prev, description: e.target.value }))}
                                placeholder="Contoh: Digunakan untuk meredakan nyeri ringan & demam tinggi..."
                                className="w-full h-20 p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[12px] font-bold focus:outline-none focus:border-[var(--color-primary)] resize-none"
                            />
                        </div>
                    </form>
                </Modal>

                {/* ─── MODAL: KONFIRMASI HAPUS CATATAN MEDIS ─── */}
                <Modal
                    isOpen={isConfirmDeleteOpen}
                    onClose={() => setIsConfirmDeleteOpen(false)}
                    title="Konfirmasi Hapus"
                    description="Tindakan ini permanen dan tidak bisa dibatalkan"
                    icon={Trash2}
                    iconBg="bg-rose-500/10"
                    iconColor="text-rose-600"
                    size="sm"
                    footer={
                        <div className="flex items-center justify-end gap-2 w-full">
                            <button
                                onClick={() => setIsConfirmDeleteOpen(false)}
                                className="h-10 px-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] text-[10px] font-black uppercase tracking-widest transition"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleDeleteRecord}
                                disabled={submitting}
                                className="h-10 px-6 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-black uppercase tracking-widest transition flex items-center justify-center gap-2 shadow-lg shadow-rose-600/20"
                            >
                                {submitting ? 'Menghapus...' : 'Ya, Hapus'}
                            </button>
                        </div>
                    }
                >
                    <p className="text-[12px] text-[var(--color-text)] font-semibold leading-relaxed">
                        Apakah kamu yakin ingin menghapus rekam medis santri <strong className="text-rose-500">{logToDelete?.student_name}</strong> tanggal <strong>{logToDelete?.date}</strong>?
                    </p>
                </Modal>

                {/* ─── MODAL: KONFIRMASI SUDAH SEMBUH ─── */}
                <Modal
                    isOpen={isConfirmSembuhOpen}
                    onClose={() => setIsConfirmSembuhOpen(false)}
                    title="Santri Sembuh & Kembali"
                    description="Konfirmasi pemulihan kesehatan santri"
                    icon={CheckCircle2}
                    iconBg="bg-emerald-500/10"
                    iconColor="text-emerald-600"
                    size="sm"
                    footer={
                        <div className="flex items-center justify-end gap-2 w-full">
                            <button
                                onClick={() => setIsConfirmSembuhOpen(false)}
                                className="h-10 px-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] text-[10px] font-black uppercase tracking-widest transition"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleSembuh}
                                disabled={submitting}
                                className="h-10 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-widest transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
                            >
                                {submitting ? 'Memproses...' : 'Ya, Santri Sembuh'}
                            </button>
                        </div>
                    }
                >
                    <p className="text-[12px] text-[var(--color-text)] font-semibold leading-relaxed">
                        Apakah santri <strong className="text-emerald-600">{logToSembuh?.student_name}</strong> sudah pulih sepenuhnya dan diizinkan kembali ke kelas / aktivitas KBM pesantren?
                    </p>
                </Modal>

            </div>
        </DashboardLayout>
    )
}
