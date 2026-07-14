import React, { useState, useMemo } from 'react'
import {
    PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid, AreaChart, Area
} from 'recharts'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faChartPie, faUsers, faVenusMars, faGraduationCap, faSchool, faWaveSquare, faCheckCircle, faFilter, faCalendarDays, faPercent,
    faChevronRight, faPrint, faInbox, faFileExcel, faMapMarkerAlt
} from '@fortawesome/free-solid-svg-icons'
import { Modal, RichSelect } from '@shared/components'

export default function EnrollmentStatsModal({ isOpen, onClose, enrollments, waves }) {
    const [selectedWave, setSelectedWave] = useState('all')

    // Map waves options array for RichSelect
    const waveOptions = useMemo(() => {
        const opts = [{ id: 'all', name: 'Semua Gelombang' }]
            ; (waves || []).forEach(w => {
                opts.push({ id: w.id, name: w.name })
            })
        return opts
    }, [waves])

    // 1. Filter enrollments array locally by selected wave!
    const filteredEnrollments = useMemo(() => {
        if (!enrollments) return []
        if (selectedWave === 'all') return enrollments
        return enrollments.filter(e => String(e.wave_id || '') === String(selectedWave))
    }, [enrollments, selectedWave])

    // 2. Process all analytics data dynamically from the filtered array
    const stats = useMemo(() => {
        if (!filteredEnrollments || filteredEnrollments.length === 0) {
            return {
                total: 0,
                funnel: { total: 0, verified: 0, test: 0, accepted: 0 },
                programGenderData: [],
                statusData: [],
                waveQuotaData: [],
                schoolData: [],
                dailyData: [],
                cityData: [],
                uniqueCitiesCount: 0,
                uniqueSchoolsCount: 0
            }
        }

        const total = filteredEnrollments.length

        // Funnel Seleksi Calculations
        const verified = filteredEnrollments.filter(e => ['verifikasi', 'tes', 'diterima'].includes(e.status)).length
        const test = filteredEnrollments.filter(e => ['tes', 'diterima'].includes(e.status)).length
        const accepted = filteredEnrollments.filter(e => e.status === 'diterima').length
        const funnel = { total, verified, test, accepted }

        // Program + Gender Stacked Data
        const progMap = {}
        filteredEnrollments.forEach(e => {
            const p = e.program || 'Lainnya'
            let formatted = p.charAt(0).toUpperCase() + p.slice(1)
            if (p === 'boarding') formatted = 'Boarding (Pondok)'
            else if (p === 'reguler') formatted = 'Reguler (Fullday)'
            if (!progMap[formatted]) {
                progMap[formatted] = { Putra: 0, Putri: 0 }
            }
            const g = (e.gender || '').toUpperCase()
            if (g === 'L') progMap[formatted].Putra++
            else if (g === 'P') progMap[formatted].Putri++
        })
        const programGenderData = Object.keys(progMap).map(name => ({
            name,
            'Putra (L)': progMap[name].Putra,
            'Putri (P)': progMap[name].Putri
        }))

        // Status Pie Data
        const statusMap = {}
        filteredEnrollments.forEach(e => {
            const s = e.status || 'pendaftar'
            let label = 'Pendaftar'
            if (s === 'verifikasi') label = 'Verifikasi'
            else if (s === 'tes') label = 'Tahap Tes'
            else if (s === 'diterima') label = 'Diterima'
            else if (s === 'ditolak') label = 'Ditolak'
            statusMap[label] = (statusMap[label] || 0) + 1
        })
        const statusColors = {
            'Pendaftar': '#94a3b8',
            'Verifikasi': '#f59e0b',
            'Tahap Tes': '#3b82f6',
            'Diterima': '#10b981',
            'Ditolak': '#ef4444'
        }
        const statusData = Object.keys(statusMap).map(name => ({
            name,
            value: statusMap[name],
            color: statusColors[name] || '#6366f1'
        }))

        // Progress Kuota per Gelombang
        const waveQuotaData = (waves || []).map(w => {
            // Count from entire enrollments so wave statistics are always global/absolute
            const count = (enrollments || []).filter(e => String(e.wave_id || '') === String(w.id)).length
            const quota = w.quota || null
            const percentage = quota ? Math.min(Math.round((count / quota) * 100), 100) : (count > 0 ? 100 : 0)
            return {
                id: w.id,
                name: w.name,
                count,
                quota,
                percentage
            }
        })

        // Top School Data (Truncated Y-Axis name to prevent clipping)
        const schoolMap = {}
        filteredEnrollments.forEach(e => {
            const s = e.school_origin || 'Tidak Diketahui'
            schoolMap[s] = (schoolMap[s] || 0) + 1
        })
        const schoolData = Object.keys(schoolMap)
            .map(name => ({
                name,
                displayName: name.length > 15 ? name.slice(0, 13) + '...' : name,
                'Jumlah': schoolMap[name]
            }))
            .sort((a, b) => b['Jumlah'] - a['Jumlah'])
            .slice(0, 5)

        // Trend Pendaftaran Harian with Mock padding for single date slope area display
        const dailyMap = {}
        filteredEnrollments.forEach(e => {
            const rawDate = e.created_at || e.date_created || new Date().toISOString()
            const dateOnly = rawDate.split('T')[0]
            dailyMap[dateOnly] = (dailyMap[dateOnly] || 0) + 1
        })
        const dailyKeys = Object.keys(dailyMap).sort()
        let dailyData = dailyKeys.map(dateStr => {
            const d = new Date(dateStr)
            const formatted = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
            return {
                name: formatted,
                'Pendaftar': dailyMap[dateStr]
            }
        })

        // Prepend mock point if there is only 1 entry so Recharts renders an Area slope instead of a single dot
        if (dailyData.length === 1 && dailyKeys.length > 0) {
            const singleDate = new Date(dailyKeys[0])
            const prevDate = new Date(singleDate)
            prevDate.setDate(singleDate.getDate() - 1)
            const prevFormatted = prevDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
            dailyData.unshift({
                name: prevFormatted,
                'Pendaftar': 0
            })
        }

        const uniqueSchoolsCount = new Set(filteredEnrollments.map(e => e.school_origin).filter(Boolean)).size

        // 5. Sebaran Wilayah parsing (Treemap or horizontal bar chart data)
        const citiesList = ['jember', 'banyuwangi', 'lumajang', 'bondowoso', 'situbondo', 'probolinggo', 'malang', 'surabaya', 'sidoarjo', 'pasuruan', 'jombang', 'nanjuk', 'kediri', 'blitar', 'madiun']
        const cityMap = {}
        filteredEnrollments.forEach(e => {
            const addr = (e.address || '').toLowerCase()
            const school = (e.school_origin || '').toLowerCase()
            let matchedCity = 'Lainnya'
            for (const city of citiesList) {
                if (addr.includes(city) || school.includes(city)) {
                    matchedCity = city.charAt(0).toUpperCase() + city.slice(1)
                    break
                }
            }
            if (matchedCity === 'Lainnya' && (addr.includes('tanggul') || school.includes('tanggul'))) {
                matchedCity = 'Jember'
            }
            cityMap[matchedCity] = (cityMap[matchedCity] || 0) + 1
        })
        
        // Define color schemes for cities
        const cityColors = ['#4f46e5', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#64748b']
        const cityData = Object.keys(cityMap)
            .map((name, index) => ({
                name,
                value: cityMap[name],
                color: cityColors[index % cityColors.length]
            }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5) // Limit top 5 cities for display

        const uniqueCitiesCount = Object.keys(cityMap).length

        return {
            total,
            funnel,
            programGenderData,
            statusData,
            waveQuotaData,
            schoolData,
            dailyData,
            uniqueSchoolsCount,
            cityData,
            uniqueCitiesCount
        }
    }, [filteredEnrollments, enrollments, waves, selectedWave])

    const handlePrint = () => {
        window.print()
    }

    const handleExportExcel = async () => {
        try {
            const XLSX = await import('xlsx')
            
            // 1. Prepare Summary Sheet Data
            const summaryRows = [
                ['RINGKASAN STATISTIK PENDAFTARAN (PSB)'],
                ['Gelombang:', selectedWave === 'all' ? 'Semua Gelombang' : (waves.find(w => String(w.id) === String(selectedWave))?.name || selectedWave)],
                ['Tanggal Cetak:', new Date().toLocaleString('id-ID')],
                [],
                ['METRIK UTAMA', 'JUMLAH'],
                ['Total Pendaftar', stats.total],
                ['Pendaftar Terverifikasi', stats.funnel.verified],
                ['Mengikuti Tes Seleksi', stats.funnel.test],
                ['Diterima', stats.funnel.accepted],
                [],
                ['DISTRIBUSI STATUS', 'JUMLAH'],
                ...stats.statusData.map(s => [s.name, s.value]),
                [],
                ['SEKOLAH ASAL TERPOPULER', 'JUMLAH'],
                ...stats.schoolData.map(s => [s.name, s['Jumlah']]),
                [],
                ['SEBARAN WILAYAH (KOTA ASAL)', 'JUMLAH'],
                ...stats.cityData.map(c => [c.name, c.value]),
            ]
            
            const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows)
            
            // 2. Prepare Detailed Enrollment List Sheet
            const detailHeaders = [
                'No. Registrasi', 'Nama Lengkap', 'Jenis Kelamin', 'NISN', 
                'Sekolah Asal', 'No. HP', 'Program Pilihan', 'Tingkat Quran', 
                'Hafalan (Juz)', 'Skor Tes', 'Status Pendaftaran', 'Gelombang'
            ]
            const detailRows = filteredEnrollments.map(e => [
                e.registration_number,
                e.name,
                e.gender === 'L' ? 'Putra' : 'Putri',
                e.nisn || '-',
                e.school_origin || '-',
                e.phone || '-',
                e.program === 'boarding' ? 'Boarding' : 'Reguler',
                e.quran_level || '-',
                e.hafalan_quran || 0,
                e.test_score || '-',
                e.status,
                e.waveName || '-'
            ])
            const wsDetail = XLSX.utils.aoa_to_sheet([detailHeaders, ...detailRows])
            
            // Create workbook and append sheets
            const wb = XLSX.utils.book_new()
            XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan Statistik')
            XLSX.utils.book_append_sheet(wb, wsDetail, 'Daftar Calon Santri')
            
            // Write file
            const waveSlug = selectedWave === 'all' ? 'semua' : selectedWave
            XLSX.writeFile(wb, `Laporan_Statistik_PSB_${waveSlug}_${Date.now()}.xlsx`)
        } catch (err) {
            console.error('Failed to export Excel:', err)
        }
    }

    if (!isOpen) return null

    const hasData = filteredEnrollments && filteredEnrollments.length > 0

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Analisis & Statistik PSB"
            description="Laporan grafik dan analisis distribusi pendaftaran santri baru secara real-time."
            icon={faChartPie}
            iconBg="bg-indigo-500/10"
            iconColor="text-indigo-600"
            size="xl"
            mobileVariant="bottom-sheet"
            footer={
                <div className="flex justify-between items-center w-full print:hidden">
                    <div className="flex gap-2">
                        <button
                            onClick={handlePrint}
                            className="h-10 px-4 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200 text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-all flex items-center gap-2"
                        >
                            <FontAwesomeIcon icon={faPrint} />
                            Cetak Laporan
                        </button>
                        <button
                            onClick={handleExportExcel}
                            className="h-10 px-4 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-100 transition-all flex items-center gap-2"
                        >
                            <FontAwesomeIcon icon={faFileExcel} />
                            Ekspor Excel
                        </button>
                    </div>
                    <button
                        onClick={onClose}
                        className="h-10 px-6 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text-muted)] text-[10px] font-black uppercase tracking-widest hover:bg-[var(--color-border)] transition-all"
                    >
                        Tutup
                    </button>
                </div>
            }
        >
            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    /* Document page size and margins optimized for A4 */
                    @page {
                        size: A4 portrait;
                        margin: 15mm 15mm 15mm 15mm;
                    }
                    
                    /* Reset backgrounds and enforce standard typography */
                    body {
                        background: white !important;
                        color: #0f172a !important;
                        font-family: 'Inter', system-ui, -apple-system, sans-serif !important;
                    }
                    
                    /* Hide EVERYTHING in body except our modal portal container */
                    body > *:not(#portal-modals-system) {
                        display: none !important;
                    }
                    
                    /* Flatten portal container to fit document pages */
                    #portal-modals-system {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        height: auto !important;
                        background: white !important;
                        padding: 0 !important;
                        margin: 0 !important;
                        overflow: visible !important;
                    }
                    
                    /* Flatten modal backdrop and overlays */
                    #portal-modals-system > div {
                        position: static !important;
                        padding: 0 !important;
                        margin: 0 !important;
                        background: white !important;
                        display: block !important;
                        opacity: 1 !important;
                        visibility: visible !important;
                        overflow: visible !important;
                    }
                    
                    #portal-modals-system .absolute.inset-0 {
                        display: none !important;
                    }
                    
                    /* Hide close button, modal drag handle, and footer */
                    button[aria-label="Close modal"],
                    .shrink-0.w-12.h-1.5,
                    .print\\:hidden,
                    div:has(> .print\\:hidden) {
                        display: none !important;
                    }

                    /* Style the original modal header in print to look like a premium document header */
                    #portal-modals-system [role="dialog"] .sticky.top-0 {
                        display: flex !important;
                        position: static !important;
                        background: transparent !important;
                        border-bottom: 2px solid #4f46e5 !important;
                        padding: 0 0 16px 0 !important;
                        margin-bottom: 12px !important;
                        box-shadow: none !important;
                        justify-content: flex-start !important;
                        gap: 14px !important;
                        align-items: center !important;
                    }
                    
                    #portal-modals-system [role="dialog"] .sticky.top-0 h3 {
                        color: #1e1b4b !important;
                        font-size: 20px !important;
                        font-weight: 900 !important;
                        text-transform: uppercase !important;
                        letter-spacing: -0.025em !important;
                        line-height: 1.1 !important;
                    }
                    
                    #portal-modals-system [role="dialog"] .sticky.top-0 div {
                        color: #475569 !important;
                        font-size: 10px !important;
                        font-weight: 800 !important;
                        opacity: 1 !important;
                        margin-top: 2px !important;
                    }
                    
                    #portal-modals-system [role="dialog"] .sticky.top-0 .w-9.h-9 {
                        background: #eef2ff !important;
                        border: 1px solid #c7d2fe !important;
                        color: #4f46e5 !important;
                        border-radius: 10px !important;
                        display: flex !important;
                        align-items: center !important;
                        justify-content: center !important;
                        width: 36px !important;
                        height: 36px !important;
                    }
                    
                    /* Flatten dialog frame and eliminate borders/shadows in print */
                    #portal-modals-system [role="dialog"] {
                        position: static !important;
                        width: 100% !important;
                        max-width: 100% !important;
                        height: auto !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        box-shadow: none !important;
                        border: none !important;
                        background: white !important;
                        display: block !important;
                        overflow: visible !important;
                    }
                    
                    #portal-modals-system [role="dialog"] > div {
                        position: static !important;
                        width: 100% !important;
                        max-width: 100% !important;
                        height: auto !important;
                        max-height: none !important;
                        box-shadow: none !important;
                        border: none !important;
                        border-radius: 0 !important;
                        background: white !important;
                        overflow: visible !important;
                        padding: 0 !important;
                        margin: 0 !important;
                        contain: none !important;
                    }
                    
                    /* Flatten modal content area container to prevent inner scrollbars in print */
                    #portal-modals-system [role="dialog"] .overflow-y-auto {
                        overflow: visible !important;
                        height: auto !important;
                        max-height: none !important;
                        padding: 0 !important;
                    }
                    
                    /* 2-Column Grid Layout for Charts in Print */
                    .grid {
                        display: grid !important;
                        grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
                        gap: 16px !important;
                    }
                    
                    /* Prevent cards from breaking or splitting across pages */
                    .grid > div,
                    .space-y-6 > div:not(.print-header-container),
                    .space-y-4 > div {
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                        background: white !important;
                        border: 1px solid #cbd5e1 !important;
                        box-shadow: none !important;
                        border-radius: 12px !important;
                    }
                    
                    .print-header-container {
                        border: none !important;
                        background: transparent !important;
                        box-shadow: none !important;
                        padding: 0 !important;
                        margin: 0 0 24px 0 !important;
                    }
                    
                    /* Force funnel steps to render side-by-side in print */
                    .flex-col.md\\:flex-row.items-stretch {
                        display: flex !important;
                        flex-direction: row !important;
                        gap: 8px !important;
                    }
                    .flex-col.md\\:flex-row.items-stretch > div {
                        flex: 1 !important;
                    }
                    
                    /* Ensure recharts responsive container is sized correctly */
                    .recharts-responsive-container {
                        width: 100% !important;
                        height: 100% !important;
                    }
                    
                    /* Force browser to print exact colors and backgrounds */
                    * {
                        print-color-adjust: exact !important;
                        -webkit-print-color-adjust: exact !important;
                        color-adjust: exact !important;
                    }
                }
            `}} />

            {/* Header Toolbar: Wave Filter directly in statistics */}
            <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center pb-4 mb-4 border-b border-[var(--color-border)]/50 print:hidden">
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Saring Gelombang:</span>
                    <RichSelect
                        value={selectedWave}
                        onChange={setSelectedWave}
                        options={waveOptions}
                        compact={true}
                        className="w-48"
                    />
                </div>
            </div>

            {!hasData ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 border border-slate-200/60 flex items-center justify-center text-2xl mb-4 animate-bounce">
                        <FontAwesomeIcon icon={faInbox} />
                    </div>
                    <h3 className="text-sm font-black text-[var(--color-text)]">Tidak Ada Data Ditemukan</h3>
                    <p className="text-[11px] text-[var(--color-text-muted)] mt-1 max-w-sm">
                        {selectedWave !== 'all'
                            ? 'Tidak ada calon santri terdaftar pada gelombang yang dipilih ini.'
                            : 'Tambahkan calon pendaftar atau impor berkas terlebih dahulu untuk melihat dashboard analitik.'}
                    </p>
                </div>
            ) : (
                <div className="space-y-6 print:space-y-4">
                    {/* Print-Only Executive Header & Stats Summary */}
                    <div className="hidden print:block mb-6 print-header-container">
                        <div className="flex justify-between items-center border-b-2 border-indigo-600 pb-4">
                            <div>
                                <h1 className="text-2xl font-black tracking-tight text-indigo-950 uppercase">LAPORAN ANALISIS & STATISTIK PSB</h1>
                                <p className="text-[10px] text-slate-500 font-extrabold mt-1">
                                    Penerimaan Santri Baru · Muhammadiyah Boarding School Tanggul
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Dicetak Tanggal</p>
                                <p className="text-[10px] font-extrabold text-slate-700 mt-1">
                                    {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Corong Seleksi Flow - Highly Visual Funnel with Arrow Connectors */}
                    <div className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Corong Seleksi (Funnel Pendaftaran)</span>
                            <FontAwesomeIcon icon={faFilter} className="text-violet-500 text-xs" />
                        </div>

                        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2">
                            {[
                                { title: 'Pendaftaran', sub: 'Santri Baru', count: stats.funnel.total, pct: '100%', bg: 'bg-indigo-50 border-indigo-200 text-indigo-700' },
                                { title: 'Terverifikasi', sub: 'Berkas Lengkap', count: stats.funnel.verified, pct: `${stats.funnel.total > 0 ? Math.round((stats.funnel.verified / stats.funnel.total) * 100) : 0}%`, bg: 'bg-amber-50 border-amber-200 text-amber-700' },
                                { title: 'Tahap Seleksi', sub: 'Mengikuti Ujian', count: stats.funnel.test, pct: `${stats.funnel.total > 0 ? Math.round((stats.funnel.test / stats.funnel.total) * 100) : 0}%`, bg: 'bg-blue-50 border-blue-200 text-blue-700' },
                                { title: 'Diterima', sub: 'Lolos Seleksi', count: stats.funnel.accepted, pct: `${stats.funnel.total > 0 ? Math.round((stats.funnel.accepted / stats.funnel.total) * 100) : 0}%`, bg: 'bg-emerald-50 border-emerald-200 text-emerald-700' }
                            ].map((step, idx) => (
                                <React.Fragment key={idx}>
                                    {idx > 0 && (
                                        <div className="hidden md:flex items-center justify-center text-slate-300">
                                            <FontAwesomeIcon icon={faChevronRight} className="text-lg animate-pulse" />
                                        </div>
                                    )}
                                    <div className={`flex-1 p-3 rounded-2xl border ${step.bg} flex flex-col items-center shadow-sm relative overflow-hidden group hover:scale-[1.02] transition-transform`}>
                                        <div className="absolute right-0 top-0 w-8 h-8 bg-white/20 rounded-bl-3xl flex items-center justify-center font-bold text-[8px]">
                                            #{idx + 1}
                                        </div>
                                        <span className="text-[9px] font-black uppercase tracking-wider leading-none mb-1">{step.title}</span>
                                        <span className="text-[8px] opacity-70 font-semibold mb-2">{step.sub}</span>
                                        <span className="text-xl font-black leading-none mb-1.5">{step.count}</span>
                                        <span className="text-[8px] font-black bg-white/40 px-2 py-0.5 rounded-full">{step.pct}</span>
                                    </div>
                                </React.Fragment>
                            ))}
                        </div>
                    </div>

                    {/* Chart Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* 1. Program & Gender Stacked Bar Chart */}
                        <div className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm flex flex-col">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Minat Program Studi + Gender</span>
                                <FontAwesomeIcon icon={faGraduationCap} className="text-emerald-500 text-xs" />
                            </div>
                            <div className="h-44 relative">
                                {stats.programGenderData.length === 0 ? (
                                    <div className="h-full flex items-center justify-center text-[10px] text-[var(--color-text-muted)] italic">Belum ada data program</div>
                                ) : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={stats.programGenderData} margin={{ left: -20, right: 10, top: 5, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.2} vertical={false} />
                                            <XAxis dataKey="name" stroke="var(--color-text-muted)" fontSize={9} fontWeight="bold" tickLine={false} />
                                            <YAxis stroke="var(--color-text-muted)" fontSize={9} tickLine={false} />
                                            <Tooltip contentStyle={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', fontSize: 10 }} />
                                            <Legend verticalAlign="top" height={24} iconType="circle" wrapperStyle={{ fontSize: 9, fontWeight: 'bold' }} />
                                            <Bar dataKey="Putra (L)" stackId="a" fill="#3b82f6" radius={[8, 8, 0, 0]} maxBarSize={32} />
                                            <Bar dataKey="Putri (P)" stackId="a" fill="#ec4899" radius={[8, 8, 0, 0]} maxBarSize={32} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        </div>

                        {/* 2. Status Distribution (Pie) */}
                        <div className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm flex flex-col">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Status Kelulusan / Seleksi</span>
                                <FontAwesomeIcon icon={faCheckCircle} className="text-indigo-500 text-xs" />
                            </div>
                            <div className="h-44 relative">
                                {stats.statusData.length === 0 ? (
                                    <div className="h-full flex items-center justify-center text-[10px] text-[var(--color-text-muted)] italic">Belum ada data status</div>
                                ) : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={stats.statusData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={45}
                                                outerRadius={65}
                                                paddingAngle={3}
                                                dataKey="value"
                                                stroke="var(--color-surface)"
                                                strokeWidth={2}
                                            >
                                                {stats.statusData.map((entry, idx) => (
                                                    <Cell key={`cell-${idx}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip contentStyle={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', fontSize: 10, fontFamily: 'monospace', fontWeight: 'bold' }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                            <div className="grid grid-cols-3 gap-2 mt-2">
                                {stats.statusData.map((item, idx) => (
                                    <div key={idx} className="flex items-center gap-1.5 text-[9px] font-black">
                                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                                        <span className="text-[var(--color-text-muted)] truncate">{item.name} ({item.value})</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 3. Progress Kuota per Gelombang - Thicker progress bars with responsive colors */}
                        <div className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm flex flex-col">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Keterisian Kuota Gelombang (Mutlak)</span>
                                <FontAwesomeIcon icon={faWaveSquare} className="text-violet-500 text-xs" />
                            </div>
                            <div className="flex-1 space-y-3.5 max-h-[180px] overflow-y-auto pr-1 custom-scrollbar">
                                {stats.waveQuotaData.length === 0 ? (
                                    <p className="text-[10px] text-[var(--color-text-muted)] italic text-center py-8">Tidak ada gelombang aktif</p>
                                ) : (
                                    stats.waveQuotaData.map((w, idx) => (
                                        <div key={idx} className="space-y-1.5">
                                            <div className="flex justify-between items-center text-[10px] font-black">
                                                <span className="text-[var(--color-text)]">{w.name}</span>
                                                <span className="text-[var(--color-text-muted)]">
                                                    {w.count} / <span className="text-[var(--color-text)]">{w.quota ? `${w.quota} Kuota` : '∞ (Tanpa Batas)'}</span>{w.quota ? ` (${w.percentage}%)` : ''}
                                                </span>
                                            </div>
                                            {/* Thicker progress bar with dynamic color indicators */}
                                            <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden border border-slate-200/70 shadow-inner relative">
                                                {w.percentage === 0 && (
                                                    <span className="absolute inset-0 bg-slate-200/50 w-[4px] rounded-full" />
                                                )}
                                                <div
                                                    className={`h-full rounded-full transition-all duration-700 ease-out ${w.quota
                                                            ? (w.percentage >= 90 ? 'bg-gradient-to-r from-rose-500 to-red-600'
                                                                : w.percentage >= 70 ? 'bg-gradient-to-r from-amber-500 to-orange-600'
                                                                    : 'bg-gradient-to-r from-emerald-400 to-emerald-600')
                                                            : 'bg-gradient-to-r from-indigo-500 to-violet-600'
                                                        }`}
                                                    style={{ width: `${w.percentage}%` }}
                                                />
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* 4. Top Asal Sekolah (Bar) - Beautiful standard vertical BarChart */}
                        <div className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm flex flex-col">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">
                                    Top 5 Asal Sekolah SD/MI <span className="text-[9px] text-amber-600 font-extrabold normal-case ml-1.5">(Dari Total {stats.uniqueSchoolsCount} Sekolah)</span>
                                </span>
                                <FontAwesomeIcon icon={faSchool} className="text-amber-500 text-xs" />
                            </div>
                            <div className="h-44 relative">
                                {stats.schoolData.length === 0 ? (
                                    <div className="h-full flex items-center justify-center text-[10px] text-[var(--color-text-muted)] italic">Belum ada data sekolah</div>
                                ) : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={stats.schoolData} margin={{ left: -20, right: 10, top: 5, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.2} vertical={false} />
                                            <XAxis dataKey="displayName" stroke="var(--color-text)" fontSize={8.5} fontWeight="extrabold" tickLine={false} />
                                            <YAxis stroke="var(--color-text-muted)" fontSize={9} tickLine={false} />
                                            {/* Custom Tooltip that correctly shows the full school name on hover */}
                                            <Tooltip
                                                formatter={(value, name, props) => [value, 'Calon Santri']}
                                                labelFormatter={(label, items) => {
                                                    const fullItem = stats.schoolData.find(s => s.displayName === label);
                                                    return fullItem ? fullItem.name : label;
                                                }}
                                                contentStyle={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', fontSize: 10 }}
                                            />
                                            <Bar dataKey="Jumlah" fill="#3b82f6" radius={[8, 8, 0, 0]} maxBarSize={32}>
                                                {stats.schoolData.map((entry, idx) => (
                                                    <Cell key={`cell-${idx}`} fill={idx === 0 ? '#4f46e5' : '#3b82f6'} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        </div>

                        {/* 5. Sebaran Wilayah Asal Santri (Horizontal Bar Chart) */}
                        <div className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm flex flex-col">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">
                                    Sebaran Wilayah (Top Kota/Kab) <span className="text-[9px] text-indigo-600 font-extrabold normal-case ml-1.5">(Dari Total {stats.uniqueCitiesCount || 0} Daerah)</span>
                                </span>
                                <FontAwesomeIcon icon={faMapMarkerAlt} className="text-rose-500 text-xs" />
                            </div>
                            <div className="h-44 relative">
                                {!stats.cityData || stats.cityData.length === 0 ? (
                                    <div className="h-full flex items-center justify-center text-[10px] text-[var(--color-text-muted)] italic">Belum ada data wilayah</div>
                                ) : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={stats.cityData} layout="vertical" margin={{ left: -10, right: 10, top: 5, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.2} horizontal={false} />
                                            <XAxis type="number" stroke="var(--color-text-muted)" fontSize={8.5} fontWeight="bold" tickLine={false} />
                                            <YAxis dataKey="name" type="category" stroke="var(--color-text)" fontSize={8.5} fontWeight="extrabold" tickLine={false} width={80} />
                                            <Tooltip contentStyle={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', fontSize: 10 }} />
                                            <Bar dataKey="value" fill="#4f46e5" radius={[0, 8, 8, 0]} maxBarSize={20}>
                                                {stats.cityData.map((entry, idx) => (
                                                    <Cell key={`cell-${idx}`} fill={entry.color} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* 5. Trend Pendaftaran Harian - Highly styled AreaChart with visible dot indicators */}
                    <div className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Trend Volume Pendaftaran Harian</span>
                            <FontAwesomeIcon icon={faCalendarDays} className="text-indigo-500 text-xs" />
                        </div>
                        <div className="h-48 relative">
                            {stats.dailyData.length === 0 ? (
                                <div className="h-full flex items-center justify-center text-[10px] text-[var(--color-text-muted)] italic">Belum ada data trend</div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={stats.dailyData} margin={{ left: -20, right: 10, top: 5, bottom: 5 }}>
                                        <defs>
                                            <linearGradient id="colorDaily" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.35} />
                                                <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.2} vertical={false} />
                                        <XAxis dataKey="name" stroke="var(--color-text-muted)" fontSize={9} fontWeight="bold" tickLine={false} />
                                        <YAxis stroke="var(--color-text-muted)" fontSize={9} tickLine={false} />
                                        <Tooltip contentStyle={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', fontSize: 10 }} />
                                        <Area
                                            type="monotone"
                                            dataKey="Pendaftar"
                                            stroke="#4f46e5"
                                            strokeWidth={3}
                                            fillOpacity={1}
                                            fill="url(#colorDaily)"
                                            dot={{ r: 5, strokeWidth: 2.5, fill: '#ffffff', stroke: '#4f46e5' }}
                                            activeDot={{ r: 7, strokeWidth: 3, fill: '#ffffff', stroke: '#4f46e5' }}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </Modal>
    )
}
