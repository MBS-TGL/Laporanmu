import React, { useState, useEffect, useMemo } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import {
    ShieldCheck, CheckCircle2, AlertTriangle, AlertCircle,
    Calendar, User, Home, Award, BookOpen, Star, Heart,
    Brush, Languages, Activity, Ruler, Scale,
    Copy, Check, Printer, Share2, ArrowLeft, Sun, Moon,
    Building2, FileText, Lock, QrCode, Sparkles
} from 'lucide-react'
import { supabase } from '@lib/supabase'
import { useTheme } from '@context/Theme'
import { KRITERIA, GRADE, BULAN } from '@utils/reports/raportConstants'
import { DEFAULT_SETTINGS } from '@core/context/SchoolSettings'

const MONTH_NAMES_ID = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
]

const MONTHS_MAP = {
    JAN: 1, PEB: 2, FEB: 2, MAR: 3, APR: 4, MEI: 5, JUN: 6,
    JUL: 7, AGU: 8, SEP: 9, OKT: 10, NOV: 11, DES: 12,
    JANUARI: 1, PEBRUARI: 2, FEBRUARI: 2, MARET: 3, APRIL: 4, JUNI: 6,
    JULI: 7, AGUSTUS: 8, SEPTEMBER: 9, OKTOBER: 10, NOVEMBER: 11, DESEMBER: 12
}

export default function PublicVerifyPage() {
    const { isDark, toggleTheme } = useTheme()
    const [searchParams] = useSearchParams()

    const reportNo = (searchParams.get('no') || '').trim()
    const studentId = (searchParams.get('s') || searchParams.get('id') || '').trim()
    const sigTarget = (searchParams.get('sig') || '').trim().toLowerCase() // 'pengasuh' | 'wali_kelas' | ''

    const [loading, setLoading] = useState(true)
    const [verified, setVerified] = useState(false)
    const [student, setStudent] = useState(null)
    const [report, setReport] = useState(null)
    const [schoolSettings, setSchoolSettings] = useState(DEFAULT_SETTINGS)
    const [parsedPeriod, setParsedPeriod] = useState({ month: null, year: null, monthName: '' })
    const [errorMsg, setErrorMsg] = useState('')
    const [copiedLink, setCopiedLink] = useState(false)
    const [copiedNo, setCopiedNo] = useState(false)

    // Load school settings optionally from DB for up-to-date institution details
    useEffect(() => {
        let mounted = true
        async function loadSettings() {
            try {
                const { data } = await supabase
                    .from('school_settings')
                    .select('*')
                    .limit(1)
                    .maybeSingle()
                if (mounted && data) {
                    setSchoolSettings(prev => ({ ...prev, ...data }))
                }
            } catch {
                // Ignore fallback to DEFAULT_SETTINGS
            }
        }
        loadSettings()
        return () => { mounted = false }
    }, [])

    useEffect(() => {
        document.title = 'Laporanmu — Verifikasi Dokumen & Tanda Tangan Digital'
        fetchVerificationData()
        return () => {
            document.title = 'Laporanmu'
        }
    }, [reportNo, studentId, sigTarget])

    const fetchVerificationData = async () => {
        if (!reportNo && !studentId) {
            setErrorMsg('Parameter verifikasi tidak ditemukan dalam tautan QR.')
            setLoading(false)
            setVerified(false)
            return
        }

        // 1. Parsing periode dari nomor raport (e.g. RPT/7A/OKTOBER2026/001 atau RPT/CLASS/MEI2026/004)
        let resolvedMonth = null
        let resolvedYear = null
        let resolvedMonthName = ''

        if (reportNo) {
            const parts = reportNo.split('/')
            if (parts.length >= 3) {
                const periodStr = parts[2] || ''
                const yearDigits = parseInt(periodStr.slice(-4), 10)
                const monthStr = periodStr.slice(0, -4).toUpperCase()
                if (!isNaN(yearDigits) && yearDigits > 2000) {
                    resolvedYear = yearDigits
                }
                if (MONTHS_MAP[monthStr]) {
                    resolvedMonth = MONTHS_MAP[monthStr]
                    resolvedMonthName = MONTH_NAMES_ID[resolvedMonth - 1]
                }
            }
        }

        // Fallback periode jika nomor custom / semester
        if (!resolvedYear) resolvedYear = new Date().getFullYear()
        if (!resolvedMonth) resolvedMonth = new Date().getMonth() + 1
        if (!resolvedMonthName) resolvedMonthName = MONTH_NAMES_ID[resolvedMonth - 1] || ''

        setParsedPeriod({
            month: resolvedMonth,
            year: resolvedYear,
            monthName: resolvedMonthName
        })

        try {
            setLoading(true)
            setErrorMsg('')

            let fetchedStudent = null
            let fetchedReport = null

            // Strategi 1: Coba panggil RPC resmi `verify_raport` (Bypass RLS dengan SECURITY DEFINER)
            if (studentId) {
                try {
                    const { data: rpcResult, error: rpcErr } = await supabase
                        .rpc('verify_raport', {
                            p_student_id: studentId,
                            p_month: resolvedMonth,
                            p_year: resolvedYear
                        })

                    if (!rpcErr && rpcResult && !rpcResult.error && rpcResult.student && rpcResult.report) {
                        fetchedStudent = rpcResult.student
                        fetchedReport = rpcResult.report
                    }
                } catch (rpcEx) {
                    console.warn('[PublicVerify] RPC call fallback:', rpcEx)
                }
            }

            // Strategi 2: Fallback direct query jika RPC belum dibuat / offline
            if (!fetchedStudent && studentId) {
                const { data: sData } = await supabase
                    .from('students')
                    .select('*, classes:class_id(name)')
                    .eq('id', studentId)
                    .maybeSingle()

                if (sData) {
                    fetchedStudent = sData

                    // Cari laporan bulanan yang sesuai
                    let { data: repData } = await supabase
                        .from('student_monthly_reports')
                        .select('*')
                        .eq('student_id', studentId)
                        .eq('month', resolvedMonth)
                        .eq('year', resolvedYear)
                        .maybeSingle()

                    // Jika tidak pas dengan bulan tertentu, ambil data raport paling mutakhir
                    if (!repData) {
                        const { data: latestRep } = await supabase
                            .from('student_monthly_reports')
                            .select('*')
                            .eq('student_id', studentId)
                            .order('year', { ascending: false })
                            .order('month', { ascending: false })
                            .limit(1)
                            .maybeSingle()
                        repData = latestRep
                    }

                    if (repData) {
                        fetchedReport = repData
                    }
                }
            }

            if (fetchedStudent && fetchedReport) {
                setStudent(fetchedStudent)
                setReport(fetchedReport)
                setVerified(true)
            } else {
                setVerified(false)
                setErrorMsg('Data raport tidak ditemukan atau belum disinkronkan ke pusat arsip.')
            }
        } catch (err) {
            console.error('[PublicVerifyPage] Verification error:', err)
            setVerified(false)
            setErrorMsg('Terjadi kendala saat menghubungkan ke server validasi dokumen.')
        } finally {
            setLoading(false)
        }
    }

    // Hitung rata-rata & predikat keseluruhan dari 5 aspek karakter
    const summaryStats = useMemo(() => {
        if (!report) return { avg: null, gradeObj: null, count: 0 }
        const values = KRITERIA.map(k => report[k.key]).filter(v => v !== null && v !== undefined && v !== '' && !isNaN(Number(v)))
        if (!values.length) return { avg: null, gradeObj: null, count: 0 }
        const total = values.reduce((acc, curr) => acc + Number(curr), 0)
        const avg = Number((total / values.length).toFixed(1))
        return {
            avg,
            gradeObj: GRADE(avg),
            count: values.length
        }
    }, [report])

    // Hitung status BMI fisik santri
    const bmiInfo = useMemo(() => {
        if (!report?.tinggi_badan || !report?.berat_badan) return null
        const tbM = Number(report.tinggi_badan) / 100
        const bbKg = Number(report.berat_badan)
        if (tbM <= 0 || bbKg <= 0) return null
        const bmi = Number((bbKg / (tbM * tbM)).toFixed(1))
        let label = 'Normal'
        let color = 'text-emerald-500'
        if (bmi < 17) { label = 'Sangat Kurus'; color = 'text-amber-500' }
        else if (bmi < 18.5) { label = 'Kurus'; color = 'text-amber-500' }
        else if (bmi > 27) { label = 'Obesitas'; color = 'text-rose-500' }
        else if (bmi > 25) { label = 'Kelebihan BB'; color = 'text-amber-500' }
        return { bmi, label, color }
    }, [report?.tinggi_badan, report?.berat_badan])

    const handleCopyLink = () => {
        navigator.clipboard.writeText(window.location.href)
        setCopiedLink(true)
        setTimeout(() => setCopiedLink(false), 2000)
    }

    const handleCopyNo = () => {
        if (!reportNo) return
        navigator.clipboard.writeText(reportNo)
        setCopiedNo(true)
        setTimeout(() => setCopiedNo(false), 2000)
    }

    const handlePrint = () => {
        window.print()
    }

    // Resolusi nama pejabat & penandatangan
    const kepalaSekolahName = schoolSettings.headmaster_name_id || 'Khoirul Anwar, S.Pd.'
    const pengasuhName = schoolSettings.pengasuh_name_id || 'Ir. H. M. Ali Maksum'

    return (
        <div className="min-h-screen bg-[var(--color-app-bg)] text-[var(--color-text)] py-6 sm:py-10 px-3 sm:px-6 relative overflow-x-hidden transition-colors duration-300">
            {/* Inline Print & Watermark Styles */}
            <style>{`
                @media print {
                    body {
                        background: #ffffff !important;
                        color: #000000 !important;
                    }
                    .no-print {
                        display: none !important;
                    }
                    .print-card {
                        box-shadow: none !important;
                        border: 1px solid #d1d5db !important;
                        break-inside: avoid;
                    }
                }
            `}</style>

            {/* Ambient Background Decorative Glow */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[450px] bg-gradient-to-b from-emerald-500/10 via-indigo-500/5 to-transparent rounded-full blur-[120px]" />
            </div>

            <div className="max-w-4xl mx-auto space-y-6 relative z-10">

                {/* ── Top Bar Navigation ── */}
                <header className="no-print flex items-center justify-between bg-[var(--color-surface)]/90 backdrop-blur-md px-4 sm:px-6 py-3.5 rounded-2xl border border-[var(--color-border)] shadow-sm">
                    <Link
                        to="/"
                        className="inline-flex items-center gap-2.5 text-xs font-bold text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors group"
                    >
                        <span className="w-8 h-8 rounded-xl bg-[var(--color-surface-alt)] flex items-center justify-center border border-[var(--color-border)] group-hover:border-[var(--color-primary)]/40 transition-colors">
                            <ArrowLeft className="w-4 h-4" />
                        </span>
                        <span className="hidden sm:inline">Kembali ke Beranda</span>
                    </Link>

                    <div className="flex items-center gap-2">
                        <span className="hidden md:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <Lock className="w-3 h-3" /> SSL Secured Verification
                        </span>

                        <button
                            onClick={handleCopyLink}
                            title="Salin Tautan Verifikasi"
                            className="h-8 px-3 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-primary)] text-xs font-bold inline-flex items-center gap-1.5 transition-all active:scale-95"
                        >
                            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Share2 className="w-3.5 h-3.5" />}
                            <span className="hidden sm:inline">{copiedLink ? 'Tersalin' : 'Bagikan'}</span>
                        </button>

                        <button
                            onClick={handlePrint}
                            title="Cetak Lembar Verifikasi"
                            className="h-8 px-3 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-primary)] text-xs font-bold inline-flex items-center gap-1.5 transition-all active:scale-95"
                        >
                            <Printer className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Cetak</span>
                        </button>

                        <button
                            onClick={toggleTheme}
                            aria-label="Toggle Dark Mode"
                            className="w-8 h-8 flex items-center justify-center rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-all"
                        >
                            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-500" />}
                        </button>
                    </div>
                </header>

                {/* ── State Loading ── */}
                {loading ? (
                    <div className="text-center py-24 space-y-4 bg-[var(--color-surface)] rounded-3xl p-8 border border-[var(--color-border)] shadow-xl">
                        <div className="relative w-16 h-16 mx-auto">
                            <div className="absolute inset-0 rounded-full border-4 border-emerald-500/20 animate-ping" />
                            <div className="w-16 h-16 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
                        </div>
                        <h2 className="text-base font-black font-heading text-[var(--color-text)]">
                            Memverifikasi Keabsahan Dokumen...
                        </h2>
                        <p className="text-xs text-[var(--color-text-muted)] max-w-sm mx-auto leading-relaxed">
                            Sistem sedang mencocokkan kode keamanan digital dengan data induk akademik pondok pesantren.
                        </p>
                    </div>
                ) : !verified ? (
                    /* ── State Gagal / Invalid ── */
                    <div className="bg-[var(--color-surface)] rounded-3xl overflow-hidden border border-[var(--color-border)] shadow-xl p-6 sm:p-10 text-center space-y-6 relative">
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-rose-500 via-pink-500 to-rose-500" />
                        <div className="w-20 h-20 rounded-3xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mx-auto shadow-lg shadow-rose-500/5">
                            <AlertTriangle className="w-10 h-10" />
                        </div>
                        <div className="space-y-2 max-w-md mx-auto">
                            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20">
                                Validasi Gagal
                            </span>
                            <h2 className="text-2xl font-black font-heading text-[var(--color-text)] tracking-tight">
                                Dokumen Tidak Terverifikasi
                            </h2>
                            <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
                                Sistem tidak dapat memverifikasi keaslian dokumen dengan nomor seri atau kode QR tersebut. Dokumen kemungkinan belum terdaftar, belum disinkronkan, atau telah kedaluwarsa.
                            </p>
                        </div>

                        {errorMsg && (
                            <div className="max-w-md mx-auto p-4 rounded-2xl bg-rose-500/5 border border-rose-500/20 text-xs text-rose-600 dark:text-rose-400 text-left flex items-start gap-3">
                                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-black text-rose-700 dark:text-rose-300">Keterangan:</p>
                                    <p className="mt-0.5 opacity-90">{errorMsg}</p>
                                </div>
                            </div>
                        )}

                        <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                            <Link
                                to="/"
                                className="h-11 px-6 rounded-xl bg-[var(--color-primary)] text-white text-xs font-black uppercase tracking-wider hover:opacity-90 transition-all shadow-md inline-flex items-center justify-center"
                            >
                                Ke Halaman Utama
                            </Link>
                        </div>
                    </div>
                ) : (
                    /* ── State Berhasil / Verified Enterprise View ── */
                    <main className="space-y-6">

                        {/* 1. Official Trust Header Banner */}
                        <section className="print-card bg-[var(--color-surface)] rounded-3xl overflow-hidden border border-[var(--color-border)] shadow-xl relative p-6 sm:p-8">
                            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-500 via-teal-400 to-indigo-500" />

                            <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
                                <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-4">
                                    <div className="relative shrink-0">
                                        <div className="w-20 h-20 rounded-2xl bg-emerald-500/10 border-2 border-emerald-500/30 text-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/10">
                                            <ShieldCheck className="w-11 h-11" />
                                        </div>
                                        <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow">
                                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                                        </span>
                                    </div>

                                    <div className="space-y-1.5">
                                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                                            <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 inline-flex items-center gap-1">
                                                <Sparkles className="w-3 h-3" /> Dokumen Terverifikasi Asli & Sah
                                            </span>
                                            <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold text-[var(--color-text-muted)] bg-[var(--color-surface-alt)] border border-[var(--color-border)]">
                                                Resmi Lembaga
                                            </span>
                                        </div>

                                        <h1 className="text-xl sm:text-2xl font-black font-heading text-[var(--color-text)]">
                                            Raport Karakter & Akademik Santri
                                        </h1>

                                        <p className="text-xs text-[var(--color-text-muted)] font-medium">
                                            {schoolSettings.school_name_id || 'Muhammadiyah Boarding School (MBS) Tanggul'}
                                        </p>
                                    </div>
                                </div>

                                {/* Security Badges & Meta Pill */}
                                <div className="w-full md:w-auto shrink-0 bg-[var(--color-surface-alt)]/60 rounded-2xl p-4 border border-[var(--color-border)] space-y-2 text-xs">
                                    <div className="flex items-center justify-between md:justify-start gap-4">
                                        <span className="text-[10px] uppercase font-bold text-[var(--color-text-muted)] tracking-wider">No. Seri Raport</span>
                                        <button
                                            onClick={handleCopyNo}
                                            className="font-mono font-bold text-[var(--color-primary)] hover:underline inline-flex items-center gap-1 select-all"
                                            title="Klik untuk salin nomor seri"
                                        >
                                            {reportNo || 'RPT-VERIFIED'}
                                            {copiedNo ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 opacity-60" />}
                                        </button>
                                    </div>
                                    <div className="flex items-center justify-between md:justify-start gap-4 pt-1.5 border-t border-[var(--color-border)]/60">
                                        <span className="text-[10px] uppercase font-bold text-[var(--color-text-muted)] tracking-wider">Periode Raport</span>
                                        <span className="font-bold text-[var(--color-text)] flex items-center gap-1">
                                            <Calendar className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                                            {parsedPeriod.monthName} {parsedPeriod.year}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between md:justify-start gap-4 pt-1.5 border-t border-[var(--color-border)]/60">
                                        <span className="text-[10px] uppercase font-bold text-[var(--color-text-muted)] tracking-wider">Validasi Digital</span>
                                        <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-400">
                                            SHA-256 Passed
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* 2. Highlight Card Khusus Tanda Tangan Digital (TTD QR) */}
                        <section className="print-card bg-gradient-to-br from-indigo-500/5 via-[var(--color-surface)] to-emerald-500/5 rounded-3xl p-6 sm:p-7 border border-[var(--color-border)] shadow-md space-y-4">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-9 h-9 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center font-bold">
                                        <QrCode className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h2 className="text-sm font-black font-heading text-[var(--color-text)]">
                                            Status Verifikasi Tanda Tangan Digital (TTD QR)
                                        </h2>
                                        <p className="text-[10px] text-[var(--color-text-muted)] font-medium">
                                            Sertifikasi elektronik tersimpan dan divalidasi oleh portal resmi LaporanMu
                                        </p>
                                    </div>
                                </div>
                                <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" /> Signature Valid
                                </span>
                            </div>

                            {/* Signatory Details Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
                                {/* Pejabat 1: Kepala Sekolah */}
                                <div className={`p-4 rounded-2xl border transition-all ${sigTarget === 'wali_kelas'
                                    ? 'bg-emerald-500/10 border-emerald-500/30 shadow-sm ring-2 ring-emerald-500/20'
                                    : 'bg-[var(--color-surface)] border-[var(--color-border)]'
                                    }`}>
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <span className="text-[9px] font-black uppercase tracking-wider text-[var(--color-text-muted)]">
                                                Penandatangan 1 · Kepala Sekolah
                                            </span>
                                            <h3 className="text-sm font-black text-[var(--color-text)] mt-0.5">
                                                {kepalaSekolahName}
                                            </h3>
                                            <p className="text-[11px] text-[var(--color-text-muted)] font-medium mt-0.5">
                                                Pimpinan Akademik MBS Tanggul
                                            </p>
                                        </div>
                                        <span className="px-2 py-0.5 rounded-lg text-[9px] font-black text-emerald-600 bg-emerald-500/10">
                                            {sigTarget === 'wali_kelas' ? 'Target Pindai' : 'Terverifikasi'}
                                        </span>
                                    </div>
                                    <div className="mt-3 pt-2.5 border-t border-[var(--color-border)]/60 flex items-center justify-between text-[10px] text-[var(--color-text-muted)]">
                                        <span>Metode: QR Auth Key</span>
                                        <span className="font-mono text-emerald-600 font-bold">AUTH: KS-MBS-OK</span>
                                    </div>
                                </div>

                                {/* Pejabat 2: Pengasuh Pesantren */}
                                <div className={`p-4 rounded-2xl border transition-all ${sigTarget === 'pengasuh'
                                    ? 'bg-emerald-500/10 border-emerald-500/30 shadow-sm ring-2 ring-emerald-500/20'
                                    : 'bg-[var(--color-surface)] border-[var(--color-border)]'
                                    }`}>
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <span className="text-[9px] font-black uppercase tracking-wider text-[var(--color-text-muted)]">
                                                Penandatangan 2 · Pengasuh Pesantren
                                            </span>
                                            <h3 className="text-sm font-black text-[var(--color-text)] mt-0.5">
                                                {pengasuhName}
                                            </h3>
                                            <p className="text-[11px] text-[var(--color-text-muted)] font-medium mt-0.5">
                                                Pengasuh Muhammadiyah Boarding School
                                            </p>
                                        </div>
                                        <span className="px-2 py-0.5 rounded-lg text-[9px] font-black text-emerald-600 bg-emerald-500/10">
                                            {sigTarget === 'pengasuh' ? 'Target Pindai' : 'Terverifikasi'}
                                        </span>
                                    </div>
                                    <div className="mt-3 pt-2.5 border-t border-[var(--color-border)]/60 flex items-center justify-between text-[10px] text-[var(--color-text-muted)]">
                                        <span>Metode: QR Auth Key</span>
                                        <span className="font-mono text-emerald-600 font-bold">AUTH: PGS-MBS-OK</span>
                                    </div>
                                </div>
                            </div>

                            <p className="text-[10px] text-[var(--color-text-muted)] italic leading-relaxed pt-1">
                                {sigTarget === 'pengasuh'
                                    ? 'ℹ️ Anda sedang memverifikasi tanda tangan digital milik Pengasuh Pesantren melalui barcode QR resmi.'
                                    : sigTarget === 'wali_kelas'
                                        ? 'ℹ️ Anda sedang memverifikasi tanda tangan digital milik Kepala Sekolah / Wali Kelas melalui barcode QR resmi.'
                                        : 'ℹ️ Dokumen ini disahkan secara digital oleh Kepala Sekolah dan Pengasuh Pesantren.'}
                            </p>
                        </section>

                        {/* 3. Student Profile & Document Details Card */}
                        <section className="print-card bg-[var(--color-surface)] rounded-3xl p-6 sm:p-7 border border-[var(--color-border)] shadow-md space-y-5">
                            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
                                {/* Foto Santri / Avatar */}
                                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-tr from-[var(--color-primary)] to-indigo-600 p-0.5 shadow-md shrink-0">
                                    <div className="w-full h-full rounded-[22px] bg-[var(--color-surface-alt)] overflow-hidden flex items-center justify-center font-black text-2xl text-[var(--color-primary)]">
                                        {student.photo_url ? (
                                            <img
                                                src={student.photo_url}
                                                alt={student.name}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <span>{student.name ? student.name.charAt(0).toUpperCase() : 'S'}</span>
                                        )}
                                    </div>
                                </div>

                                {/* Identitas Detail */}
                                <div className="space-y-2 text-center sm:text-left flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                                        <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/20">
                                            {student.classes?.name || student.class || 'Kelas Santri'}
                                        </span>
                                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] border border-[var(--color-border)]">
                                            NIS/Kode: {student.registration_code || student.nis || student.nisn || '—'}
                                        </span>
                                    </div>

                                    <h2 className="text-xl sm:text-2xl font-black font-heading text-[var(--color-text)] truncate">
                                        {student.name}
                                    </h2>

                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 text-xs">
                                        <div className="bg-[var(--color-surface-alt)]/50 p-2.5 rounded-xl border border-[var(--color-border)]/60">
                                            <p className="text-[9px] uppercase font-bold text-[var(--color-text-muted)]">Kamar Asrama</p>
                                            <p className="font-bold text-[var(--color-text)] mt-0.5 flex items-center gap-1 truncate">
                                                <Home className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                                {student.metadata?.kamar || student.kamar || student.room || 'Asrama Santri'}
                                            </p>
                                        </div>
                                        <div className="bg-[var(--color-surface-alt)]/50 p-2.5 rounded-xl border border-[var(--color-border)]/60">
                                            <p className="text-[9px] uppercase font-bold text-[var(--color-text-muted)]">Wali Santri</p>
                                            <p className="font-bold text-[var(--color-text)] mt-0.5 flex items-center gap-1 truncate">
                                                <User className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                                {student.metadata?.nama_wali || student.parent_name || 'Wali Santri'}
                                            </p>
                                        </div>
                                        <div className="col-span-2 sm:col-span-1 bg-[var(--color-surface-alt)]/50 p-2.5 rounded-xl border border-[var(--color-border)]/60">
                                            <p className="text-[9px] uppercase font-bold text-[var(--color-text-muted)]">Status Kelulusan</p>
                                            <p className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center gap-1">
                                                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                                Tuntas Terbina
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* 4. Rangkuman Indeks Nilai & Aspek Karakter */}
                        <section className="print-card bg-[var(--color-surface)] rounded-3xl p-6 sm:p-7 border border-[var(--color-border)] shadow-md space-y-6">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-[var(--color-border)]">
                                <div>
                                    <h3 className="text-base font-black font-heading text-[var(--color-text)] flex items-center gap-2">
                                        <Award className="w-5 h-5 text-[var(--color-primary)]" />
                                        Hasil Evaluasi Karakter & Adab Santri
                                    </h3>
                                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                                        Standar penilaian adab bulanan santri MBS Tanggul (Skala 0 - 9)
                                    </p>
                                </div>

                                {summaryStats.avg !== null && (
                                    <div className="flex items-center gap-3 bg-[var(--color-surface-alt)] px-4 py-2 rounded-2xl border border-[var(--color-border)]">
                                        <div className="text-right">
                                            <p className="text-[8px] uppercase font-black text-[var(--color-text-muted)]">Indeks Rata-Rata</p>
                                            <p className="text-base font-black text-[var(--color-primary)]">{summaryStats.avg} / 9.0</p>
                                        </div>
                                        <div
                                            className="px-2.5 py-1 rounded-xl text-xs font-black"
                                            style={{
                                                backgroundColor: summaryStats.gradeObj?.bg || '#10b98115',
                                                color: summaryStats.gradeObj?.uiColor || '#10b981',
                                                borderColor: summaryStats.gradeObj?.border || '#10b98140'
                                            }}
                                        >
                                            {summaryStats.gradeObj?.id || 'Baik'}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* List Nilai 5 Kriteria */}
                            <div className="space-y-3">
                                {KRITERIA.map(k => {
                                    const val = report[k.key]
                                    const vNum = (val !== null && val !== undefined && val !== '') ? Number(val) : null
                                    const kg = vNum !== null ? GRADE(vNum) : null
                                    const IconComponent = k.icon
                                    const pct = vNum !== null ? Math.min(100, Math.round((vNum / 9) * 100)) : 0

                                    return (
                                        <div
                                            key={k.key}
                                            className="bg-[var(--color-surface-alt)]/40 hover:bg-[var(--color-surface-alt)]/70 transition-colors rounded-2xl p-4 border border-[var(--color-border)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                                        >
                                            <div className="flex items-center gap-3.5 min-w-0 flex-1">
                                                <div
                                                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
                                                    style={{ backgroundColor: `${k.color}15`, color: k.color }}
                                                >
                                                    {IconComponent ? <IconComponent className="w-5 h-5" /> : <Star className="w-5 h-5" />}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-baseline gap-2">
                                                        <h4 className="text-sm font-black text-[var(--color-text)]">{k.id}</h4>
                                                        <span className="text-[11px] text-[var(--color-text-muted)] font-semibold opacity-60">
                                                            ({k.ar})
                                                        </span>
                                                    </div>
                                                    {/* Progress Meter Bar */}
                                                    <div className="w-full bg-[var(--color-border)]/60 rounded-full h-1.5 mt-2 overflow-hidden">
                                                        <div
                                                            className="h-full rounded-full transition-all duration-500"
                                                            style={{ width: `${pct}%`, backgroundColor: k.color }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                                                <div className="text-right">
                                                    <span className="text-base font-black font-mono text-[var(--color-text)]">
                                                        {vNum !== null ? vNum : '—'}
                                                    </span>
                                                    <span className="text-[10px] text-[var(--color-text-muted)] ml-0.5">/ 9</span>
                                                </div>
                                                {kg ? (
                                                    <div
                                                        className="px-3 py-1 rounded-xl text-[11px] font-black border"
                                                        style={{
                                                            backgroundColor: kg.bg,
                                                            color: kg.uiColor,
                                                            borderColor: kg.border
                                                        }}
                                                    >
                                                        {kg.id}
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-[var(--color-text-muted)]">—</span>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </section>

                        {/* 5. Metrik Kedisiplinan & Presensi Santri */}
                        <section className="print-card bg-[var(--color-surface)] rounded-3xl p-6 sm:p-7 border border-[var(--color-border)] shadow-md space-y-4">
                            <h3 className="text-sm font-black font-heading text-[var(--color-text)] flex items-center gap-2">
                                <Activity className="w-4 h-4 text-[var(--color-primary)]" />
                                Rekapitulasi Presensi & Kedisiplinan
                            </h3>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <div className="p-3.5 bg-blue-500/5 border border-blue-500/15 rounded-2xl text-center">
                                    <p className="text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider">Sakit</p>
                                    <p className="text-lg font-black text-[var(--color-text)] mt-1">{report.hari_sakit ?? 0} <span className="text-[10px] font-medium text-[var(--color-text-muted)]">hari</span></p>
                                </div>
                                <div className="p-3.5 bg-amber-500/5 border border-amber-500/15 rounded-2xl text-center">
                                    <p className="text-[9px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider">Izin</p>
                                    <p className="text-lg font-black text-[var(--color-text)] mt-1">{report.hari_izin ?? 0} <span className="text-[10px] font-medium text-[var(--color-text-muted)]">hari</span></p>
                                </div>
                                <div className="p-3.5 bg-rose-500/5 border border-rose-500/15 rounded-2xl text-center">
                                    <p className="text-[9px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-wider">Alpa</p>
                                    <p className="text-lg font-black text-[var(--color-text)] mt-1">{report.hari_alpa ?? 0} <span className="text-[10px] font-medium text-[var(--color-text-muted)]">hari</span></p>
                                </div>
                                <div className="p-3.5 bg-indigo-500/5 border border-indigo-500/15 rounded-2xl text-center">
                                    <p className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Pulang</p>
                                    <p className="text-lg font-black text-[var(--color-text)] mt-1">{report.hari_pulang ?? 0} <span className="text-[10px] font-medium text-[var(--color-text-muted)]">kali</span></p>
                                </div>
                            </div>
                        </section>

                        {/* 6. Metrik Tahfidz Al-Qur'an & Fisik */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Card Tahfidz */}
                            <section className="print-card bg-[var(--color-surface)] rounded-3xl p-6 border border-[var(--color-border)] shadow-md space-y-4">
                                <h3 className="text-sm font-black font-heading text-[var(--color-text)] flex items-center gap-2">
                                    <BookOpen className="w-4 h-4 text-emerald-500" />
                                    Capaian Tahfidz Al-Qur'an
                                </h3>

                                <div className="space-y-2.5">
                                    <div className="flex items-center justify-between p-3 rounded-2xl bg-[var(--color-surface-alt)]/60 border border-[var(--color-border)]">
                                        <span className="text-xs font-bold text-[var(--color-text-muted)]">Ziyadah (Hafalan Baru)</span>
                                        <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">{report.ziyadah || '—'}</span>
                                    </div>
                                    <div className="flex items-center justify-between p-3 rounded-2xl bg-[var(--color-surface-alt)]/60 border border-[var(--color-border)]">
                                        <span className="text-xs font-bold text-[var(--color-text-muted)]">Muroja'ah (Pengulangan)</span>
                                        <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">{report.murojaah || '—'}</span>
                                    </div>
                                    {report.total_hafalan && (
                                        <div className="flex items-center justify-between p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                                            <span className="text-xs font-black text-emerald-700 dark:text-emerald-300">Total Hafalan Mutqin</span>
                                            <span className="text-sm font-black text-emerald-700 dark:text-emerald-300">{report.total_hafalan}</span>
                                        </div>
                                    )}
                                </div>
                            </section>

                            {/* Card Fisik & Kesehatan */}
                            <section className="print-card bg-[var(--color-surface)] rounded-3xl p-6 border border-[var(--color-border)] shadow-md space-y-4">
                                <h3 className="text-sm font-black font-heading text-[var(--color-text)] flex items-center gap-2">
                                    <Scale className="w-4 h-4 text-indigo-500" />
                                    Pertumbuhan Fisik & Kesehatan
                                </h3>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-3.5 rounded-2xl bg-[var(--color-surface-alt)]/60 border border-[var(--color-border)]">
                                        <p className="text-[9px] uppercase font-black text-[var(--color-text-muted)] flex items-center gap-1">
                                            <Ruler className="w-3 h-3 text-cyan-500" /> Tinggi Badan
                                        </p>
                                        <p className="text-base font-black text-[var(--color-text)] mt-1">
                                            {report.tinggi_badan ? `${report.tinggi_badan} cm` : '—'}
                                        </p>
                                    </div>
                                    <div className="p-3.5 rounded-2xl bg-[var(--color-surface-alt)]/60 border border-[var(--color-border)]">
                                        <p className="text-[9px] uppercase font-black text-[var(--color-text-muted)] flex items-center gap-1">
                                            <Scale className="w-3 h-3 text-indigo-500" /> Berat Badan
                                        </p>
                                        <p className="text-base font-black text-[var(--color-text)] mt-1">
                                            {report.berat_badan ? `${report.berat_badan} kg` : '—'}
                                        </p>
                                    </div>
                                </div>

                                {bmiInfo && (
                                    <div className="p-3 rounded-2xl bg-[var(--color-surface-alt)]/40 border border-[var(--color-border)] flex items-center justify-between text-xs">
                                        <span className="text-[var(--color-text-muted)] font-medium">Indeks Massa Tubuh (BMI): <strong className="text-[var(--color-text)]">{bmiInfo.bmi}</strong></span>
                                        <span className={`font-black ${bmiInfo.color}`}>{bmiInfo.label}</span>
                                    </div>
                                )}
                            </section>
                        </div>

                        {/* 7. Catatan Musyrif / Pembina */}
                        {report.catatan && (
                            <section className="print-card bg-[var(--color-surface)] rounded-3xl p-6 sm:p-7 border border-[var(--color-border)] shadow-md space-y-3">
                                <h3 className="text-xs font-black uppercase tracking-widest text-amber-600 dark:text-amber-400 flex items-center gap-2">
                                    <FileText className="w-4 h-4" />
                                    Catatan Pembinaan & Evaluasi Musyrif
                                </h3>
                                <blockquote className="p-4 sm:p-5 rounded-2xl bg-amber-500/5 border-l-4 border-amber-500 text-xs sm:text-sm text-[var(--color-text)] font-medium leading-relaxed italic">
                                    "{report.catatan}"
                                </blockquote>
                            </section>
                        )}

                        {/* 8. Enterprise Security Disclaimer & Legal Footer */}
                        <footer className="pt-6 pb-12 text-center space-y-3">
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm">
                                <Building2 className="w-4 h-4 text-[var(--color-primary)]" />
                                <span className="text-xs font-bold text-[var(--color-text-muted)]">
                                    LaporanMu Academic Integrity System © {new Date().getFullYear()}
                                </span>
                            </div>

                            <p className="text-[10px] text-[var(--color-text-muted)] max-w-xl mx-auto leading-relaxed opacity-75">
                                Dokumen elektronik ini diterbitkan secara sah oleh Muhammadiyah Boarding School (MBS) Tanggul. Berdasarkan sistem otentikasi digital, dokumen ini dinyatakan valid dan mengikat tanpa memerlukan tanda tangan basah tambahan.
                            </p>
                        </footer>

                    </main>
                )}
            </div>
        </div>
    )
}
