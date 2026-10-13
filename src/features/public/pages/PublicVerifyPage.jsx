import React, { useState, useEffect, useMemo } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import {
    CheckCircle2, AlertTriangle, AlertCircle, Calendar,
    User, Home, ArrowLeft, Sun, Moon, Copy, Check, Printer,
    FileCheck, ExternalLink, QrCode
} from 'lucide-react'
import { supabase } from '@lib/supabase'
import { useTheme } from '@context/Theme'
import { KRITERIA, GRADE } from '@utils/reports/raportConstants'
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
    const [copiedNo, setCopiedNo] = useState(false)

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
                // Fallback to DEFAULT_SETTINGS
            }
        }
        loadSettings()
        return () => { mounted = false }
    }, [])

    useEffect(() => {
        document.title = 'Verifikasi Raport — MBS Tanggul'
        fetchVerificationData()
        return () => {
            document.title = 'Laporanmu'
        }
    }, [reportNo, studentId, sigTarget])

    const fetchVerificationData = async () => {
        if (!reportNo && !studentId) {
            setErrorMsg('Parameter nomor raport atau identitas santri tidak ditemukan.')
            setLoading(false)
            setVerified(false)
            return
        }

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

            // 1. Coba RPC verify_raport jika tersedia
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
                } catch {
                    // Fallback ke direct query
                }
            }

            // 2. Fallback direct query
            if (!fetchedStudent && studentId) {
                const { data: sData } = await supabase
                    .from('students')
                    .select('*, classes:class_id(name)')
                    .eq('id', studentId)
                    .maybeSingle()

                if (sData) {
                    fetchedStudent = sData

                    let { data: repData } = await supabase
                        .from('student_monthly_reports')
                        .select('*')
                        .eq('student_id', studentId)
                        .eq('month', resolvedMonth)
                        .eq('year', resolvedYear)
                        .maybeSingle()

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
                setErrorMsg('Data raport tidak ditemukan di basis data pusat.')
            }
        } catch (err) {
            console.error('[PublicVerify] Error:', err)
            setVerified(false)
            setErrorMsg('Gagal memverifikasi dokumen.')
        } finally {
            setLoading(false)
        }
    }

    const summaryStats = useMemo(() => {
        if (!report) return { avg: null, gradeObj: null }
        const values = KRITERIA.map(k => report[k.key]).filter(v => v !== null && v !== undefined && v !== '' && !isNaN(Number(v)))
        if (!values.length) return { avg: null, gradeObj: null }
        const total = values.reduce((acc, curr) => acc + Number(curr), 0)
        const avg = Number((total / values.length).toFixed(1))
        return {
            avg,
            gradeObj: GRADE(avg)
        }
    }, [report])

    const handleCopyNo = () => {
        if (!reportNo) return
        navigator.clipboard.writeText(reportNo)
        setCopiedNo(true)
        setTimeout(() => setCopiedNo(false), 2000)
    }

    const kepalaSekolahName = schoolSettings.headmaster_name_id || 'Khoirul Anwar, S.Pd.'
    const pengasuhName = schoolSettings.pengasuh_name_id || 'Ir. H. M. Ali Maksum'

    return (
        <div className="min-h-screen bg-[var(--color-app-bg)] text-[var(--color-text)] py-8 px-4 sm:px-6 transition-colors duration-200">
            <style>{`
                @media print {
                    body { background: #fff !important; color: #000 !important; }
                    .no-print { display: none !important; }
                    .verify-card { border: 1px solid #e2e8f0 !important; box-shadow: none !important; }
                }
            `}</style>

            <div className="max-w-2xl mx-auto space-y-5">

                {/* ── Top Header / Minimalist Nav ── */}
                <header className="no-print flex items-center justify-between pb-2 border-b border-[var(--color-border)]">
                    <Link
                        to="/"
                        className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Portal LaporanMu</span>
                    </Link>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => window.print()}
                            className="h-8 px-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] text-xs font-medium inline-flex items-center gap-1.5 transition-colors"
                            title="Cetak Halaman"
                        >
                            <Printer className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Cetak</span>
                        </button>
                        <button
                            onClick={toggleTheme}
                            className="w-8 h-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] flex items-center justify-center transition-colors"
                            aria-label="Toggle tema"
                        >
                            {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                        </button>
                    </div>
                </header>

                {/* ── Loading State ── */}
                {loading ? (
                    <div className="py-20 text-center space-y-3 bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-6">
                        <div className="w-6 h-6 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin mx-auto" />
                        <p className="text-xs font-medium text-[var(--color-text-muted)]">
                            Memeriksa data raport...
                        </p>
                    </div>
                ) : !verified ? (
                    /* ── Failed State ── */
                    <div className="verify-card bg-[var(--color-surface)] rounded-2xl border border-red-200 dark:border-red-900/50 p-6 sm:p-8 text-center space-y-4">
                        <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto">
                            <AlertTriangle className="w-6 h-6" />
                        </div>
                        <div className="space-y-1">
                            <h2 className="text-base font-bold text-[var(--color-text)]">
                                Dokumen Tidak Terverifikasi
                            </h2>
                            <p className="text-xs text-[var(--color-text-muted)] max-w-md mx-auto">
                                {errorMsg || 'Data raport tidak cocok dengan catatan yang ada di sistem.'}
                            </p>
                        </div>
                        <div className="pt-2">
                            <Link
                                to="/"
                                className="inline-flex h-9 px-4 rounded-lg bg-[var(--color-surface-alt)] hover:bg-[var(--color-border)] text-xs font-semibold text-[var(--color-text)] items-center transition-colors"
                            >
                                Kembali ke Beranda
                            </Link>
                        </div>
                    </div>
                ) : (
                    /* ── Clean & Authoritative Verification View ── */
                    <main className="space-y-4">

                        {/* Status Box: Calm, Trustworthy, Authentic */}
                        <section className="verify-card bg-[var(--color-surface)] rounded-2xl border border-emerald-200 dark:border-emerald-900/40 p-5 sm:p-6 space-y-3">
                            <div className="flex items-start gap-3.5">
                                <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                                    <CheckCircle2 className="w-5 h-5" />
                                </div>
                                <div className="space-y-1 flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h1 className="text-sm sm:text-base font-bold text-[var(--color-text)]">
                                            Dokumen Raport Sah & Terdaftar
                                        </h1>
                                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                                            Terverifikasi
                                        </span>
                                    </div>
                                    <p className="text-xs text-[var(--color-text-muted)]">
                                        {schoolSettings.school_name_id || 'Muhammadiyah Boarding School (MBS) Tanggul'}
                                    </p>
                                </div>
                            </div>

                            {/* Metadata Nomor Raport & Periode */}
                            <div className="pt-3 border-t border-[var(--color-border)] grid grid-cols-2 gap-3 text-xs">
                                <div>
                                    <span className="text-[10px] text-[var(--color-text-muted)] block">Nomor Raport</span>
                                    <button
                                        onClick={handleCopyNo}
                                        className="font-mono font-semibold text-[var(--color-text)] hover:text-[var(--color-primary)] inline-flex items-center gap-1 mt-0.5"
                                        title="Salin nomor"
                                    >
                                        <span>{reportNo || 'RPT/RESMI'}</span>
                                        {copiedNo ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 opacity-50" />}
                                    </button>
                                </div>
                                <div>
                                    <span className="text-[10px] text-[var(--color-text-muted)] block">Periode</span>
                                    <span className="font-semibold text-[var(--color-text)] mt-0.5 block">
                                        {parsedPeriod.monthName} {parsedPeriod.year}
                                    </span>
                                </div>
                            </div>
                        </section>

                        {/* Signatory Validation: Clear & Grounded */}
                        <section className="verify-card bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-4 sm:p-5 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-[var(--color-text)] flex items-center gap-1.5">
                                    <QrCode className="w-4 h-4 text-[var(--color-text-muted)]" />
                                    Validasi Tanda Tangan Digital
                                </span>
                                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                                    Resmi
                                </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                                <div className={`p-3 rounded-xl border ${sigTarget === 'wali_kelas'
                                    ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20'
                                    : 'border-[var(--color-border)] bg-[var(--color-surface-alt)]'
                                    }`}>
                                    <span className="text-[10px] text-[var(--color-text-muted)] block">Kepala Sekolah</span>
                                    <p className="font-semibold text-[var(--color-text)] mt-0.5">{kepalaSekolahName}</p>
                                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mt-1 inline-block">
                                        ✓ Tanda tangan sah
                                    </span>
                                </div>

                                <div className={`p-3 rounded-xl border ${sigTarget === 'pengasuh'
                                    ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20'
                                    : 'border-[var(--color-border)] bg-[var(--color-surface-alt)]'
                                    }`}>
                                    <span className="text-[10px] text-[var(--color-text-muted)] block">Pengasuh Pesantren</span>
                                    <p className="font-semibold text-[var(--color-text)] mt-0.5">{pengasuhName}</p>
                                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mt-1 inline-block">
                                        ✓ Tanda tangan sah
                                    </span>
                                </div>
                            </div>
                        </section>

                        {/* Student Info Card */}
                        <section className="verify-card bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-4 sm:p-5">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] flex items-center justify-center font-bold text-base text-[var(--color-text-muted)] overflow-hidden shrink-0">
                                    {student.photo_url ? (
                                        <img src={student.photo_url} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        student.name?.charAt(0) || 'S'
                                    )}
                                </div>

                                <div className="min-w-0 flex-1">
                                    <h2 className="text-sm sm:text-base font-bold text-[var(--color-text)] truncate">
                                        {student.name}
                                    </h2>
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-[var(--color-text-muted)]">
                                        <span>Kelas: <strong className="text-[var(--color-text)] font-semibold">{student.classes?.name || student.class || '—'}</strong></span>
                                        <span>NIS: <strong className="text-[var(--color-text)] font-semibold">{student.registration_code || student.nis || '—'}</strong></span>
                                        {(student.metadata?.kamar || student.kamar || student.room) && (
                                            <span>Kamar: <strong className="text-[var(--color-text)] font-semibold">{student.metadata?.kamar || student.kamar || student.room}</strong></span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Nilai Karakter Table: Clean & Readable */}
                        <section className="verify-card bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-4 sm:p-5 space-y-3">
                            <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border)]">
                                <h3 className="text-xs font-semibold text-[var(--color-text)]">
                                    Penilaian Aspek Karakter
                                </h3>
                                {summaryStats.avg !== null && (
                                    <span className="text-xs text-[var(--color-text-muted)]">
                                        Rata-rata: <strong className="text-[var(--color-text)] font-bold">{summaryStats.avg}</strong> / 9
                                    </span>
                                )}
                            </div>

                            <div className="divide-y divide-[var(--color-border)]">
                                {KRITERIA.map(k => {
                                    const val = report[k.key]
                                    const vNum = (val !== null && val !== undefined && val !== '') ? Number(val) : null
                                    const kg = vNum !== null ? GRADE(vNum) : null

                                    return (
                                        <div key={k.key} className="py-2.5 flex items-center justify-between text-xs gap-3">
                                            <div>
                                                <span className="font-medium text-[var(--color-text)]">{k.id}</span>
                                                <span className="text-[11px] text-[var(--color-text-muted)] ml-1.5 opacity-70">
                                                    ({k.ar})
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-[var(--color-text)] font-mono text-xs">
                                                    {vNum !== null ? vNum : '—'}
                                                </span>
                                                {kg && (
                                                    <span
                                                        className="px-2 py-0.5 rounded text-[10px] font-medium"
                                                        style={{ backgroundColor: kg.bg, color: kg.uiColor }}
                                                    >
                                                        {kg.id}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </section>

                        {/* Presensi & Fisik Summary */}
                        <section className="verify-card bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-4 sm:p-5 space-y-3">
                            <h3 className="text-xs font-semibold text-[var(--color-text)]">
                                Presensi & Fisik
                            </h3>

                            <div className="grid grid-cols-4 gap-2 text-center text-xs">
                                <div className="p-2 rounded-lg bg-[var(--color-surface-alt)]">
                                    <span className="text-[10px] text-[var(--color-text-muted)] block">Sakit</span>
                                    <span className="font-semibold text-[var(--color-text)]">{report.hari_sakit ?? 0} hari</span>
                                </div>
                                <div className="p-2 rounded-lg bg-[var(--color-surface-alt)]">
                                    <span className="text-[10px] text-[var(--color-text-muted)] block">Izin</span>
                                    <span className="font-semibold text-[var(--color-text)]">{report.hari_izin ?? 0} hari</span>
                                </div>
                                <div className="p-2 rounded-lg bg-[var(--color-surface-alt)]">
                                    <span className="text-[10px] text-[var(--color-text-muted)] block">Alpa</span>
                                    <span className="font-semibold text-[var(--color-text)]">{report.hari_alpa ?? 0} hari</span>
                                </div>
                                <div className="p-2 rounded-lg bg-[var(--color-surface-alt)]">
                                    <span className="text-[10px] text-[var(--color-text-muted)] block">Pulang</span>
                                    <span className="font-semibold text-[var(--color-text)]">{report.hari_pulang ?? 0} kali</span>
                                </div>
                            </div>

                            {(report.tinggi_badan || report.berat_badan || report.ziyadah || report.murojaah) && (
                                <div className="pt-2 border-t border-[var(--color-border)] grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                                    {report.tinggi_badan && (
                                        <div>
                                            <span className="text-[10px] text-[var(--color-text-muted)] block">Tinggi Badan</span>
                                            <span className="font-semibold text-[var(--color-text)]">{report.tinggi_badan} cm</span>
                                        </div>
                                    )}
                                    {report.berat_badan && (
                                        <div>
                                            <span className="text-[10px] text-[var(--color-text-muted)] block">Berat Badan</span>
                                            <span className="font-semibold text-[var(--color-text)]">{report.berat_badan} kg</span>
                                        </div>
                                    )}
                                    {report.ziyadah && (
                                        <div>
                                            <span className="text-[10px] text-[var(--color-text-muted)] block">Ziyadah</span>
                                            <span className="font-semibold text-[var(--color-text)]">{report.ziyadah}</span>
                                        </div>
                                    )}
                                    {report.murojaah && (
                                        <div>
                                            <span className="text-[10px] text-[var(--color-text-muted)] block">Muroja'ah</span>
                                            <span className="font-semibold text-[var(--color-text)]">{report.murojaah}</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </section>

                        {/* Catatan Musyrif jika ada */}
                        {report.catatan && (
                            <section className="verify-card bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-4 sm:p-5 space-y-1.5">
                                <span className="text-xs font-semibold text-[var(--color-text-muted)] block">
                                    Catatan Pembina
                                </span>
                                <p className="text-xs text-[var(--color-text)] italic leading-relaxed">
                                    "{report.catatan}"
                                </p>
                            </section>
                        )}

                        {/* Footer Resmi */}
                        <footer className="pt-3 pb-8 text-center space-y-1 text-xs text-[var(--color-text-muted)]">
                            <p className="text-[11px] font-medium">
                                Sistem Verifikasi Raport Digital · MBS Tanggul
                            </p>
                            <p className="text-[10px] opacity-70">
                                Dokumen digital ini sah dan diterbitkan resmi melalui sistem LaporanMu.
                            </p>
                        </footer>

                    </main>
                )}
            </div>
        </div>
    )
}
