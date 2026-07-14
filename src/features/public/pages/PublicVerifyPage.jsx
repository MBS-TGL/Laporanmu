import React, { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faSpinner, faArrowLeft, faMoon, faSun, faShieldHalved, faExclamationTriangle,
    faCalendarAlt, faWeightScale, faUser
} from '@fortawesome/free-solid-svg-icons'
import { supabase } from '@lib/supabase'
import { useTheme } from '@context/Theme'
import { KRITERIA, GRADE } from '@utils/reports/raportConstants'

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
    const reportNo = searchParams.get('no') || ''
    const studentId = searchParams.get('s') || ''

    const [loading, setLoading] = useState(true)
    const [verified, setVerified] = useState(false)
    const [student, setStudent] = useState(null)
    const [report, setReport] = useState(null)
    const [parsedPeriod, setParsedPeriod] = useState({ month: null, year: null, monthName: '' })
    const [errorMsg, setErrorMsg] = useState('')

    useEffect(() => {
        document.title = 'Laporanmu - Verifikasi Keaslian Raport'
        fetchVerificationData()
        return () => {
            document.title = 'Laporanmu'
        }
    }, [reportNo, studentId])

    const fetchVerificationData = async () => {
        if (!reportNo) {
            setErrorMsg('Nomor raport tidak dicantumkan!')
            setLoading(false)
            return
        }

        // Parse month & year from report number (e.g. RPT/12A/MEI2026/004)
        const parts = reportNo.split('/')
        if (parts.length < 3) {
            setErrorMsg('Format nomor raport tidak valid!')
            setLoading(false)
            return
        }

        const periodStr = parts[2] || ''
        const year = parseInt(periodStr.slice(-4))
        const monthStr = periodStr.slice(0, -4).toUpperCase()
        const month = MONTHS_MAP[monthStr]

        if (!year || !month) {
            setErrorMsg('Gagal membaca periode dari nomor raport!')
            setLoading(false)
            return
        }

        setParsedPeriod({
            month,
            year,
            monthName: MONTH_NAMES_ID[month - 1]
        })

        try {
            setLoading(true)
            setErrorMsg('')

            // 1. Fetch Student & Class Details
            let studentQuery = supabase.from('students').select('*, classes(*)').is('deleted_at', null)
            
            if (studentId) {
                studentQuery = studentQuery.eq('id', studentId)
            } else {
                setErrorMsg('Parameter verifikasi kurang lengkap!')
                setLoading(false)
                return
            }

            const { data: stuData, error: stuErr } = await studentQuery.single()
            if (stuErr || !stuData) {
                setErrorMsg('Data siswa tidak ditemukan di server!')
                setVerified(false)
                return
            }

            // 2. Fetch Monthly Report Details
            const { data: repData, error: repErr } = await supabase
                .from('student_monthly_reports')
                .select('*')
                .eq('student_id', stuData.id)
                .eq('month', month)
                .eq('year', year)
                .single()

            if (repErr || !repData) {
                setErrorMsg('Data laporan bulanan raport tidak ditemukan!')
                setVerified(false)
                return
            }

            setStudent(stuData)
            setReport(repData)
            setVerified(true)
        } catch (err) {
            console.error('[PublicVerifyPage] Verification error:', err)
            setErrorMsg('Terjadi kesalahan koneksi saat memproses verifikasi.')
            setVerified(false)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-[var(--color-surface)] py-8 px-4 relative overflow-x-hidden transition-colors duration-300">
            {/* Ambient Background Glows */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-2xl h-[400px] bg-[var(--color-primary)]/5 rounded-full blur-[100px]" />
            </div>

            <div className="max-w-[480px] mx-auto space-y-6 relative z-10">
                {/* Header nav bar */}
                <div className="flex items-center justify-between glass px-5 py-3 rounded-2xl shadow-sm">
                    <Link to="/" className="text-xs font-bold text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors flex items-center gap-2 uppercase tracking-wide">
                        <span className="w-7 h-7 rounded-full bg-[var(--color-surface-alt)] flex items-center justify-center border border-[var(--color-border)]">
                            <FontAwesomeIcon icon={faArrowLeft} className="text-[10px]" />
                        </span>
                        Beranda
                    </Link>
                    <div className="flex items-center gap-3">
                        <button onClick={toggleTheme} className="w-8 h-8 flex items-center justify-center rounded-lg bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-all">
                            <FontAwesomeIcon icon={isDark ? faSun : faMoon} className="text-xs" />
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-20 space-y-4 glass rounded-[2rem] p-8 border border-[var(--color-border)]">
                        <FontAwesomeIcon icon={faSpinner} className="animate-spin text-3xl text-[var(--color-primary)]" />
                        <p className="text-sm font-semibold text-[var(--color-text-muted)]">Memproses verifikasi keaslian dokumen...</p>
                    </div>
                ) : !verified ? (
                    /* Verification Failed View */
                    <div className="glass rounded-[2rem] overflow-hidden border border-[var(--color-border)] shadow-xl relative p-6 text-center space-y-6">
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-rose-500 via-pink-400 to-rose-500" />
                        <div className="w-16 h-16 rounded-[2.5rem] bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mx-auto shadow-lg shadow-rose-500/5">
                            <FontAwesomeIcon icon={faShieldHalved} className="text-2xl" />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-xl font-black font-heading text-[var(--color-text)] tracking-tight">Dokumen Tidak Terverifikasi</h2>
                            <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
                                Sistem tidak dapat menemukan atau mencocokkan data raport dengan nomor seri tersebut di database resmi kami.
                            </p>
                        </div>

                        {errorMsg && (
                            <div className="p-4 rounded-2xl bg-rose-500/5 border border-rose-500/10 text-xs font-bold text-rose-600 dark:text-rose-400 text-left flex items-start gap-2.5">
                                <FontAwesomeIcon icon={faExclamationTriangle} className="shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-black text-rose-700">Detail Eror:</p>
                                    <p className="mt-0.5 opacity-90 font-semibold">{errorMsg}</p>
                                </div>
                            </div>
                        )}

                        <div className="pt-2">
                            <Link to="/" className="inline-flex h-11 px-6 rounded-xl bg-gradient-to-tr from-[var(--color-primary)] to-indigo-600 text-white text-xs font-black uppercase tracking-wider hover:scale-105 active:scale-95 transition-all shadow-md items-center justify-center">
                                Kembali ke Beranda
                            </Link>
                        </div>
                    </div>
                ) : (
                    /* Verification Success View */
                    <div className="space-y-4">
                        {/* Status Card */}
                        <div className="glass rounded-[2rem] overflow-hidden border border-[var(--color-border)] shadow-xl relative p-6 text-center space-y-4">
                            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500" />
                            <div className="w-16 h-16 rounded-[2.5rem] bg-emerald-500/10 text-emerald-500 text-3xl flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/5">
                                <FontAwesomeIcon icon={faShieldHalved} />
                            </div>
                            <div>
                                <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
                                    Dokumen Terverifikasi Asli
                                </span>
                                <h2 className="text-xl font-black font-heading text-[var(--color-text)] mt-3">Raport Bulanan Sah</h2>
                                <p className="text-xs text-[var(--color-text-muted)] leading-relaxed mt-1">
                                    Catatan akademik di bawah ini terbukti valid dan sesuai dengan database pusat.
                                </p>
                            </div>
                        </div>

                        {/* Student Details Card */}
                        <div className="glass rounded-[2rem] overflow-hidden border border-[var(--color-border)] shadow-md p-6 space-y-4">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--color-primary)] to-indigo-600 flex items-center justify-center text-2xl font-bold text-white shrink-0 overflow-hidden shadow-md">
                                    {student.photo_url ? (
                                        <img src={student.photo_url} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        student.name.charAt(0)
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h3 className="text-base font-bold font-heading text-[var(--color-text)] leading-tight truncate">{student.name}</h3>
                                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/20">
                                            {student.classes?.name || student.class}
                                        </span>
                                        <span className="text-[10px] font-mono font-medium text-[var(--color-text-muted)]">{student.registration_code}</span>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Period & Serial Number details */}
                            <div className="grid grid-cols-2 gap-3 pt-3.5 border-t border-[var(--color-border)] text-xs">
                                <div>
                                    <p className="text-[8px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60">Nomor Seri Raport</p>
                                    <p className="font-bold text-[var(--color-text)] mt-0.5 select-all text-[11px] truncate">{reportNo}</p>
                                </div>
                                <div>
                                    <p className="text-[8px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60">Periode Evaluasi</p>
                                    <p className="font-bold text-[var(--color-text)] mt-0.5 flex items-center gap-1 text-[11px]">
                                        <FontAwesomeIcon icon={faCalendarAlt} className="text-[var(--color-primary)]" />
                                        {parsedPeriod.monthName} {parsedPeriod.year}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Scores Card */}
                        <div className="glass rounded-[2rem] overflow-hidden border border-[var(--color-border)] shadow-md p-6 space-y-4">
                            <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-widest flex items-center gap-2 pl-1">
                                <span className="flex h-2 w-2 relative">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-primary)] opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--color-primary)]"></span>
                                </span>
                                Hasil Penilaian Karakter
                            </p>
                            
                            <div className="space-y-2.5">
                                {KRITERIA.map(k => {
                                    const val = report[k.key]
                                    const vNum = (val !== null && val !== undefined && val !== '') ? Number(val) : null
                                    const kg = vNum !== null ? GRADE(vNum) : null
                                    return (
                                        <div key={k.key} className="glass bg-[var(--color-surface-alt)]/30 rounded-2xl px-4 py-3 flex justify-between items-center gap-4 border border-[var(--color-border)]">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 animate-pulse" style={{ background: k.color + '15' }}>
                                                    <FontAwesomeIcon icon={k.icon} className="text-xs" style={{ color: k.color }} />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-xs font-bold text-[var(--color-text)] leading-tight">{k.id}</p>
                                                    <p className="text-[10px] text-[var(--color-text-muted)] font-semibold opacity-60 mt-0.5">{k.ar}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black border font-mono"
                                                    style={{
                                                        background: kg ? kg.bg : 'var(--color-surface-alt)',
                                                        color: kg ? kg.uiColor : 'var(--color-text-muted)',
                                                        borderColor: kg ? kg.border : 'var(--color-border)'
                                                    }}>
                                                    {vNum !== null ? vNum : '—'}
                                                </div>
                                                {kg && (
                                                    <span className="text-[9px] font-black px-2 py-0.5 rounded-md hidden sm:inline" style={{ background: kg.bg, color: kg.uiColor }}>
                                                        {kg.id}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Physical Details Card */}
                        <div className="glass rounded-[2rem] overflow-hidden border border-[var(--color-border)] shadow-md p-6 space-y-4">
                            <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-widest flex items-center gap-1.5 pl-1">
                                <FontAwesomeIcon icon={faWeightScale} className="text-[var(--color-primary)]" />
                                Metrik Fisik & Kehadiran
                            </p>
                            
                            <div className="grid grid-cols-2 gap-2">
                                {report.ziyadah && (
                                    <div className="px-4 py-2.5 rounded-xl bg-[var(--color-surface-alt)]/50 border border-[var(--color-border)]">
                                        <p className="text-[8px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">Ziyadah</p>
                                        <p className="text-xs font-black text-emerald-500 mt-0.5">{report.ziyadah}</p>
                                    </div>
                                )}
                                {report.murojaah && (
                                    <div className="px-4 py-2.5 rounded-xl bg-[var(--color-surface-alt)]/50 border border-[var(--color-border)]">
                                        <p className="text-[8px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">Muroja'ah</p>
                                        <p className="text-xs font-black text-indigo-500 mt-0.5">{report.murojaah}</p>
                                    </div>
                                )}
                                {(report.tinggi_badan) && (
                                    <div className="px-4 py-2.5 rounded-xl bg-[var(--color-surface-alt)]/50 border border-[var(--color-border)]">
                                        <p className="text-[8px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">Tinggi Badan</p>
                                        <p className="text-xs font-black text-[var(--color-text)] mt-0.5">{report.tinggi_badan} cm</p>
                                    </div>
                                )}
                                {(report.berat_badan) && (
                                    <div className="px-4 py-2.5 rounded-xl bg-[var(--color-surface-alt)]/50 border border-[var(--color-border)]">
                                        <p className="text-[8px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">Berat Badan</p>
                                        <p className="text-xs font-black text-[var(--color-text)] mt-0.5">{report.berat_badan} kg</p>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-4 gap-2 pt-2 border-t border-[var(--color-border)]/40 text-center">
                                <div className="p-2 bg-red-500/5 border border-red-500/10 rounded-xl">
                                    <p className="text-[8px] font-bold text-red-500 uppercase tracking-tighter">Sakit</p>
                                    <p className="text-xs font-black text-[var(--color-text)] mt-0.5">{report.hari_sakit ?? 0} hari</p>
                                </div>
                                <div className="p-2 bg-amber-500/5 border border-amber-500/10 rounded-xl">
                                    <p className="text-[8px] font-bold text-amber-500 uppercase tracking-tighter">Izin</p>
                                    <p className="text-xs font-black text-[var(--color-text)] mt-0.5">{report.hari_izin ?? 0} hari</p>
                                </div>
                                <div className="p-2 bg-rose-500/5 border border-rose-500/10 rounded-xl">
                                    <p className="text-[8px] font-bold text-rose-500 uppercase tracking-tighter">Alpa</p>
                                    <p className="text-xs font-black text-[var(--color-text)] mt-0.5">{report.hari_alpa ?? 0} hari</p>
                                </div>
                                <div className="p-2 bg-emerald-500/5 border border-emerald-500/10 rounded-xl">
                                    <p className="text-[8px] font-bold text-emerald-500 uppercase tracking-tighter">Pulang</p>
                                    <p className="text-xs font-black text-[var(--color-text)] mt-0.5">{report.hari_pulang ?? 0} kali</p>
                                </div>
                            </div>
                        </div>

                        {/* Catatan Card */}
                        {report.catatan && (
                            <div className="glass rounded-[2rem] overflow-hidden border border-[var(--color-border)] shadow-md p-6 space-y-3">
                                <p className="text-[9px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest">Catatan Musyrif</p>
                                <blockquote className="p-4 rounded-2xl bg-amber-500/5 border-l-4 border-amber-500 text-xs text-[var(--color-text)] font-semibold leading-relaxed italic">
                                    "{report.catatan}"
                                </blockquote>
                            </div>
                        )}

                        {/* Verification Note */}
                        <div className="text-center space-y-2 pt-6">
                            <p className="text-[9px] text-[var(--color-text-muted)] font-semibold opacity-70">
                                Laporanmu Verification System © {new Date().getFullYear()}
                            </p>
                            <p className="text-[8px] text-[var(--color-text-muted)] opacity-50 px-6 leading-relaxed">
                                Dicetak secara otomatis oleh Portal LaporanMu MBS Tanggul. Dokumen yang sah tidak memerlukan tanda tangan basah jika kode QR terverifikasi.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
