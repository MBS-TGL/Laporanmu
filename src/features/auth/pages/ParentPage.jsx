import { useState, useEffect, useCallback, useRef, memo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowDown, ArrowLeft, ArrowUp, Calendar, ChartColumn, Check, ChevronDown, ChevronUp, ClipboardList, FileText, IdCard, Key, LinkIcon, LoaderCircle, Moon, Phone, Search, ShieldHalf, Sun, Trophy, User } from 'lucide-react'
import { WhatsAppIcon } from '@shared/components'



import { useToast, useTheme } from '@context'
import { supabase } from '@lib/supabase'
import mbsLogo from '@assets/images/logos/logo-mbs.png'
import { BULAN, KRITERIA, GRADE, LABEL, toArabicNum, calcAvg, MAX_SCORE } from '@utils/reports/raportConstants'
import { translitToAr } from '@utils/reports/translitData'
import PrintCard from '@features/raport/components/PrintCard'

// ─── Constants & Utils ───────────────────────────────────────────────────────

const BULAN_STR = ['', ...BULAN.map(b => b.id_str)]
const KRITERIA_LIST = KRITERIA
const getGrade = GRADE

// FIX #15: Helper withTimeout agar generatePDFBlob tidak hang selamanya
const withTimeout = (promise, ms, label = 'Operasi') =>
    Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} timeout setelah ${ms / 1000}s`)), ms)),
    ])

// Ganti ke `true` jika fitur unduh PDF raport sudah siap diaktifkan kembali
const ENABLE_PDF_DOWNLOAD = false


export default function ParentPage() {
    const [code, setCode] = useState('')
    const [pin, setPin] = useState('')
    const [loading, setLoading] = useState(false)
    const [autoChecking, setAutoChecking] = useState(false)
    const [student, setStudent] = useState(null)
    const [errorMessage, setErrorMessage] = useState('')
    const [activeTab, setActiveTab] = useState('perilaku')
    const [raportHistory, setRaportHistory] = useState([])
    const [raportLoading, setRaportLoading] = useState(false)
    const [expandedRaport, setExpandedRaport] = useState(null)
    const [linkCopied, setLinkCopied] = useState(false)
    const [pdfLoading, setPdfLoading] = useState(null)
    const [settings, setSettings] = useState({})
    const [printQueue, setPrintQueue] = useState([])
    const [printRenderedCount, setPrintRenderedCount] = useState(0)
    const [printRaportData, setPrintRaportData] = useState(null)
    const [isShaking, setIsShaking] = useState(false)
    // Rate limiting — cooldown counter (detik tersisa)
    const [loginCooldown, setLoginCooldown] = useState(0)
    const printContainerRef = useRef(null)
    const cooldownTimerRef = useRef(null)
    const { addToast } = useToast()
    const { isDark, toggleTheme } = useTheme()

    useEffect(() => {
        document.title = 'Laporanmu - Portal Cek Poin Wali Murid'
        return () => {
            document.title = 'Laporanmu'
        }
    }, [])

    // Bersihkan interval cooldown saat unmount
    useEffect(() => () => { if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current) }, [])

    // ── Helpers rate limiting (sessionStorage agar reset saat tab ditutup)
    const RATE_KEY = 'laporanmu_login_attempts' // prefix unik agar tidak konflik jika multi-app di domain sama
    const RATE_MAX = 5       // max percobaan sebelum cooldown
    const RATE_COOLDOWN = 30 // detik cooldown

    const getRateData = () => {
        try { return JSON.parse(sessionStorage.getItem(RATE_KEY) || '{"count":0,"until":0}') }
        catch { return { count: 0, until: 0 } }
    }
    const setRateData = (data) => {
        try { sessionStorage.setItem(RATE_KEY, JSON.stringify(data)) } catch { }
    }
    const startCooldownTimer = (seconds) => {
        setLoginCooldown(seconds)
        if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current)
        cooldownTimerRef.current = setInterval(() => {
            setLoginCooldown(prev => {
                if (prev <= 1) { clearInterval(cooldownTimerRef.current); return 0 }
                return prev - 1
            })
        }, 1000)
    }

    const performCheck = useCallback(async (checkCode, checkPin) => {
        if (!checkCode || !checkPin) {
            setErrorMessage('Kode registrasi dan PIN harus diisi')
            return
        }

        // Cek rate limit sebelum request ke Supabase
        const rateData = getRateData()
        const now = Date.now()
        if (rateData.until > now) {
            const secsLeft = Math.ceil((rateData.until - now) / 1000)
            startCooldownTimer(secsLeft)
            setErrorMessage(`Terlalu banyak percobaan. Coba lagi dalam ${secsLeft} detik.`)
            return
        }

        const normalizedCode = checkCode.trim().toUpperCase()
        const normalizedPin = checkPin.trim()

        setLoading(true)
        setErrorMessage('')

        try {
            const { data: studentData, error: studentError } = await supabase
                .from('students')
                .select(`*, classes (id, name, homeroom_teacher_id, teachers:homeroom_teacher_id(name, phone))`)
                .eq('registration_code', normalizedCode)
                .eq('pin', normalizedPin)
                .single()

            if (studentError || !studentData) {
                // Tambah hitungan percobaan gagal
                const rd = getRateData()
                const newCount = rd.count + 1
                if (newCount >= RATE_MAX) {
                    const until = Date.now() + RATE_COOLDOWN * 1000
                    setRateData({ count: newCount, until })
                    startCooldownTimer(RATE_COOLDOWN)
                    throw new Error(`Terlalu banyak percobaan gagal. Silakan tunggu ${RATE_COOLDOWN} detik.`)
                }
                setRateData({ count: newCount, until: 0 })
                throw new Error(`Kode registrasi atau PIN tidak valid. Pastikan Anda memasukkan data yang benar. (${newCount}/${RATE_MAX})`)
            }

            // Login sukses — reset counter
            setRateData({ count: 0, until: 0 })

            // Batasi 200 riwayat terbaru — wali santri tidak perlu lebih dari itu,
            // dan mencegah silent truncation di Supabase (default limit 1000)
            const { data: historyData } = await supabase
                .from('behavior_reports')
                .select('id, created_at, type, points, teacher_name')
                .eq('student_id', studentData.id)
                .order('created_at', { ascending: false })
                .limit(200)

            const reports = (historyData || []).filter(h => h.points < 0).map(h => ({
                id: h.id,
                date: new Date(h.created_at).toLocaleDateString('id-ID'),
                type: h.type,
                points: h.points,
                teacher: h.teacher_name || 'Staff Sekolah'
            }))

            const achievements = (historyData || []).filter(h => h.points >= 0).map(h => ({
                id: h.id,
                date: new Date(h.created_at).toLocaleDateString('id-ID'),
                type: h.type,
                points: h.points,
                teacher: h.teacher_name || 'Staff Sekolah'
            }))

            setStudent({
                ...studentData,
                class: studentData.classes?.name || '-',
                points: studentData.total_points || 0,
                homeroomTeacher: {
                    name: studentData.classes?.teachers?.name || null,
                    phone: studentData.classes?.teachers?.phone || null,
                },
                reports,
                achievements
            })

            addToast('Data siswa berhasil ditemukan!', 'success')

            // Fetch raport bulanan — blok terpisah agar error di sini
            // tidak menimpa pesan error login, dan raportLoading SELALU
            // di-reset lewat finally meski query gagal / timeout.
            setRaportLoading(true)
            try {
                const { data: raportData, error: raportError } = await supabase
                    .from('student_monthly_reports')
                    .select('*')
                    .eq('student_id', studentData.id)
                    .order('year', { ascending: false })
                    .order('month', { ascending: false })
                if (raportError) throw raportError
                setRaportHistory(raportData || [])
            } catch (raportErr) {
                console.error('Gagal memuat raport history:', raportErr)
                addToast('Gagal memuat riwayat raport. Coba muat ulang halaman.', 'error')
                setRaportHistory([])
            } finally {
                // FIX MAJOR: raportLoading SELALU di-reset di sini.
                // Sebelumnya hanya di-reset di happy path sehingga
                // spinner bisa stuck selamanya jika query error.
                setRaportLoading(false)
            }
        } catch (err) {
            // FIX MINOR: Hanya setErrorMessage — tidak perlu addToast juga.
            // Sebelumnya error muncul dua kali (inline form + toast pojok layar).
            // Form login sudah punya inline error area sendiri; toast cocok untuk
            // aksi background yang tidak punya area error di UI.
            setErrorMessage(err.message)
            setIsShaking(true)
            setTimeout(() => setIsShaking(false), 500)
        } finally {
            setLoading(false)
            setAutoChecking(false)
        }
    }, [addToast])

    useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        const urlCode = params.get('code')
        const urlPin = params.get('pin')
        if (urlCode && urlPin) {
            setCode(urlCode)
            setPin(urlPin)
            setAutoChecking(true)
            setTimeout(() => performCheck(urlCode, urlPin), 300)
        }
    }, [performCheck])

    const formatCode = (value) => {
        const raw = value.replace(/-/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11)
        const part1 = raw.slice(0, 3)
        const part2 = raw.slice(3, 7)
        const part3 = raw.slice(7, 11)
        let formatted = part1
        if (part2) formatted += '-' + part2
        if (part3) formatted += '-' + part3
        return formatted
    }

    const handleCheck = async (e) => {
        e.preventDefault()
        performCheck(code, pin)
    }

    const handleReset = () => {
        setStudent(null)
        setCode('')
        setPin('')
        setErrorMessage('')
        window.history.replaceState({}, '', '/check')
    }

    const handleCopyLink = () => {
        const url = `${window.location.origin}/check?code=${student?.registration_code}&pin=${pin}`
        const fallback = () => {
            const el = document.createElement('textarea')
            el.value = url
            document.body.appendChild(el)
            el.select()
            document.execCommand('copy')
            document.body.removeChild(el)
            setLinkCopied(true)
            addToast('Link berhasil disalin!', 'success')
            setTimeout(() => setLinkCopied(false), 2500)
        }
        if (navigator.clipboard) {
            navigator.clipboard.writeText(url).then(() => {
                setLinkCopied(true)
                addToast('Link berhasil disalin!', 'success')
                setTimeout(() => setLinkCopied(false), 2500)
            }).catch(fallback)
        } else {
            fallback()
        }
    }

    // Fetch school settings — sama persis dengan SchoolSettingsContext
    useEffect(() => {
        const DEFAULT_SETTINGS = {
            school_name_id: 'Muhammadiyah Boarding School (MBS) Tanggul',
            school_name_ar: 'معهد محمدية الإسلامي تانجول',
            school_subtitle_ar: 'المجلس التعليمي للمرحلتين الابتدائية والمتوسطة التابع للرئاسة الفرعية للجمعية المحمدية',
            school_address: 'Jl. Pemandian no. 88 RT 002 RW 003 Patemon, Tanggul, Jember 68155',
            logo_url: '/src/assets/mbs.png',
            headmaster_title_id: 'Direktur MBS Tanggul',
            headmaster_name_id: 'KH. Muhammad Ali Maksum, Lc',
            headmaster_title_ar: 'مدير معهد محمدية الإسلامي تانجول',
            headmaster_name_ar: 'كياهي الحاج محمد علي معصوم، ليسانس',
            report_color_primary: '#1a5c35',
            report_color_secondary: '#c8a400',
            wa_footer: 'MBS Tanggul · Sistem Laporanmu',
        }
        supabase.from('school_settings').select('*').eq('id', 1).maybeSingle()
            .then(({ data }) => setSettings(data ? { ...DEFAULT_SETTINGS, ...data } : DEFAULT_SETTINGS))
            .catch(() => setSettings(DEFAULT_SETTINGS))
    }, [])

    // handlePrintRaport — IDENTIK dengan RaportPage generatePDFBlob
    //
    // 'Amiri' di-load secara eksplisit untuk memastikan font tersedia sebelum render.
    const handlePrintRaport = async (r) => {
        setPdfLoading(r.id)
        try {
            const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
                import('html2canvas'),
                import('jspdf')
            ])

// Preload Arabic fonts
             if (document.fonts) {
                 try {
                     await Promise.all([
                         document.fonts.load('400 16px Amiri'),
                         document.fonts.load('700 16px Amiri'),
                         document.fonts.load('400 32px Amiri'),
                         document.fonts.load('700 32px Amiri'),
                         document.fonts.load('400 16px Cairo'),
                         document.fonts.load('700 16px Cairo'),
                         document.fonts.load('400 16px Amiri'),
                         document.fonts.load('700 16px Amiri'),
                     ])
                 } catch (e) { console.warn('Font load warning:', e) }
             }
            await document.fonts.ready

            // Set data → trigger JSX render
            setPrintRaportData({ r, student })
            setPrintRenderedCount(0)
            setPrintQueue([r.id])
            // Poll sampai card ada di DOM
            let cardEl = null
            await new Promise(resolve => {
                let t = 0
                const timer = setInterval(() => {
                    const card = printContainerRef.current?.querySelector(`.raport-card[data-student-id="${student.id}"]`)
                    if (card) { cardEl = card; clearInterval(timer); resolve() }
                    if (++t > 50) { clearInterval(timer); resolve() }
                }, 100)
            })
            if (!cardEl) throw new Error('Gagal render raport card')
            
            // Preload images inside cardEl
            const cardImgs = cardEl.querySelectorAll('img')
            await Promise.allSettled(Array.from(cardImgs).map(img => new Promise(res => {
                if (img.complete && img.naturalWidth > 0) return res()
                img.onload = res; img.onerror = res
            })))
            await new Promise(res => setTimeout(res, 300))

            // Snapshot — identik RaportPage
            const rootStyles = getComputedStyle(document.documentElement)
            const cssVars = ['--color-border', '--color-surface', '--color-surface-alt', '--color-text', '--color-text-muted'].map(v => `${v}: ${rootStyles.getPropertyValue(v).trim() || '#ccc'};`).join(' ')
            const A4W = 794, A4H = 1123, wrapper = document.createElement('div')
            wrapper.style.cssText = `position:fixed;left:-9999px;top:0;width:${A4W}px;height:${A4H}px;background:white;overflow:hidden;display:flex;align-items:flex-start;justify-content:center;font-family:'Times New Roman',serif;`
            wrapper.innerHTML = `<style>:root{${cssVars}}*{box-sizing:border-box;-webkit-print-color-adjust:exact!important}img{mix-blend-mode:multiply}.raport-card{width:${A4W}px!important;min-width:${A4W}px!important;height:${A4H}px!important;overflow:hidden!important;background:white!important;margin:0!important}.school-name-ar, .school-subtitle-ar { direction: rtl !important; unicode-bidi: embed !important; letter-spacing: normal !important; white-space: nowrap !important; }</style>${cardEl.outerHTML}`
            document.body.appendChild(wrapper)
            await new Promise(res => setTimeout(res, 700))
            try {
                const canvas = await withTimeout(
                    html2canvas(wrapper, {
                        scale: 3,
                        useCORS: true,
                        allowTaint: true,
                        backgroundColor: '#ffffff',
                        width: A4W,
                        height: A4H,
                        scrollX: 0,
                        scrollY: 0,
                        logging: false,
                        onclone: (doc) => {
                            doc.querySelectorAll('.school-name-ar, .school-subtitle-ar, [dir="rtl"]').forEach(el => {
                                el.style.direction = 'rtl'
                                el.style.unicodeBidi = 'embed'
                                el.style.whiteSpace = 'nowrap'
                            })
                        }
                    }),
                    15000, 'Render PDF'
                )
                const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true })
                pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 210, 297)
                const bulanObj = BULAN.find(b => b.id === r.month)
                const bulanStr = bulanObj?.id_str || String(r.month)
                const safeName = student.name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '')
                const safeClass = (student.class || '').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '')
                pdf.save(`Raport_${safeName}_${safeClass}_${bulanStr}_${r.year}.pdf`)
                addToast('PDF berhasil diunduh!', 'success')
            } finally {
                if (document.body.contains(wrapper)) document.body.removeChild(wrapper)
                // Cleanup SETELAH snapshot — bukan sebelum (Bug #3 fix dari sesi sebelumnya)
                setPrintQueue([])
                setPrintRenderedCount(0)
                setPrintRaportData(null)
            }
        } catch (err) {
            console.error(err)
            addToast('Gagal membuat PDF. Coba lagi.', 'error')
            setPrintQueue([])
            setPrintRenderedCount(0)
            setPrintRaportData(null)
        } finally {
            setPdfLoading(null)
        }
    }

    // Auto-checking loading
    if (autoChecking) {
        return (
            <div className="min-h-screen bg-[var(--color-surface)] flex items-center justify-center p-4">
                <div className="text-center bg-surface border border-border p-8 rounded-3xl">
                    <div className="w-16 h-16 rounded-2xl bg-[var(--color-primary)] flex items-center justify-center mx-auto mb-4 shadow-lg">
                        <LoaderCircle className="w-6 h-6 animate-spin text-white" />
                    </div>
                    <p className="font-heading font-bold text-lg text-[var(--color-text)]">Memuat Data Anak...</p>
                    <p className="text-sm text-[var(--color-text-muted)] mt-1">Sistem sedang memverifikasi</p>
                </div>
            </div>
        )
    }

    // Student result view
    if (student) {
        const latestRaport = raportHistory[0] || null
        const now = new Date()
        const currentMonth = now.getMonth() + 1
        const currentYear = now.getFullYear()

        return (
            <div className="min-h-screen bg-[var(--color-surface)] py-8 px-4 relative overflow-x-hidden">
                {/* Ambient Background Glows */}
                <div className="fixed inset-0 pointer-events-none z-0">
                </div>

                <div className="max-w-[480px] mx-auto space-y-6 relative z-10">
                    {/* Nav */}
                    <div className="flex items-center justify-between bg-surface border border-border px-5 py-3 rounded-2xl">
                        <button onClick={handleReset} className="text-xs font-bold text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors flex items-center gap-2 uppercase tracking-wide">
                            <span className="w-7 h-7 rounded-full bg-[var(--color-surface-alt)] flex items-center justify-center border border-[var(--color-border)]"><ArrowLeft className="w-4 h-4" /></span>
                            Kembali
                        </button>
                        <div className="flex items-center gap-3">
                            <Link to="/" className="text-xs font-bold text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors uppercase tracking-wide">Beranda</Link>
                            <button onClick={toggleTheme} className="w-8 h-8 flex items-center justify-center rounded-lg bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-all">
                                { isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" /> }
                            </button>
                        </div>
                    </div>

                    {/* Profile Card */}
                    <div className="bg-surface rounded-[2rem] overflow-hidden border border-[var(--color-border)]">
                        <div className="p-6 pb-0 flex items-center gap-5">
                            <div className="w-20 h-20 rounded-2xl bg-[var(--color-primary)] flex items-center justify-center text-3xl font-bold text-white shrink-0 overflow-hidden shadow-lg shadow-inner">
                                {student.photo_url ? (
                                    <img src={student.photo_url} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                                ) : (
                                    student.name.charAt(0)
                                )}
                            </div>
                            <div className="min-w-0">
                                <h2 className="text-xl font-bold font-heading text-[var(--color-text)] leading-tight truncate">{student.name}</h2>
                                <div className="flex items-center gap-2 mt-2">
                                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/20">
                                        {student.class}
                                    </span>
                                    <span className="text-xs font-mono font-medium text-[var(--color-text-muted)]">{student.registration_code}</span>
                                </div>
                            </div>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-3 mt-6 bg-[var(--color-surface-alt)]/50 border-t border-[var(--color-border)] divide-x divide-[var(--color-border)]">
                            <div className="p-4 text-center">
                                <p className={`text-2xl font-bold font-heading mb-0.5 ${student.points >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                    {student.points > 0 ? '+' : ''}{student.points}
                                </p>
                                <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wide">Total Poin</p>
                            </div>
                            <div className="p-4 text-center">
                                <p className="text-2xl font-bold font-heading text-red-500 mb-0.5">{student.reports.length}</p>
                                <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wide">Pelanggaran</p>
                            </div>
                            <div className="p-4 text-center">
                                <p className="text-2xl font-bold font-heading text-emerald-500 mb-0.5">{raportHistory.length}</p>
                                <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wide">Raport</p>
                            </div>
                        </div>

                        {/* Share row */}
                        <div className="flex gap-2 px-4 py-3 border-t border-[var(--color-border)]">
                            <button
                                onClick={handleCopyLink}
                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-xs font-bold transition-all
                                    ${linkCopied
                                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600'
                                        : 'bg-[var(--color-surface-alt)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)]/30'
                                    }`}
                            >
                                { linkCopied ? <Check className="w-4 h-4" /> : <LinkIcon className="w-4 h-4" /> }
                                {linkCopied ? 'Link tersalin!' : 'Salin Link'}
                            </button>
                            {(() => {
                                const waPhone = student.phone
                                    ? student.phone.replace(/\D/g, '').replace(/^0/, '62')
                                    : null
                                const waText = encodeURIComponent(
                                    `Assalamu'alaikum, berikut link raport ${student.name} di Pondok:\n${window.location.origin}/check?code=${student.registration_code}&pin=${pin}`
                                )
                                // Jika nomor Whatsapp tersedia → langsung buka chat ke nomor wali santri
                                // Jika tidak → buka Whatsapp tanpa nomor (wali santri pilih sendiri)
                                const waHref = waPhone
                                    ? `https://wa.me/${waPhone}?text=${waText}`
                                    : `https://wa.me/?text=${waText}`
                                return (
                                    <a
                                        href={waHref}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-xs font-bold bg-emerald-500/10 border-emerald-500/25 text-emerald-600 hover:bg-emerald-500/20 transition-all"
                                        title={waPhone ? `Kirim ke ${student.phone}` : 'Nomor Whatsapp tidak tersedia, pilih kontak sendiri'}
                                    >
                                        <WhatsAppIcon className="w-4 h-4" />
                                        {waPhone ? 'Kirim ke Whatsapp Saya' : 'Bagikan Whatsapp'}
                                    </a>
                                )
                            })()}
                        </div>
                        {/* Catatan keamanan untuk wali santri */}
                        <p className="px-4 pb-3 text-xs text-amber-600 font-medium leading-relaxed flex items-start gap-1.5">
                            <ShieldHalf className="w-4 h-4 mt-0.5 shrink-0" />
                            Link ini mengandung PIN pribadi Anda. Jangan bagikan ke orang lain selain anggota keluarga yang Anda percaya.
                        </p>
                    </div>

                    {/* Tabs */}
                    <div className="bg-surface border border-border rounded-2xl p-1.5 flex gap-1">
                        <button onClick={() => setActiveTab('perilaku')}
                            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5
                            ${activeTab === 'perilaku' ? 'bg-[var(--color-primary)] text-white shadow-lg' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}>
                            <ChartColumn className="w-4 h-4" /> Perilaku
                        </button>
                        <button onClick={() => { setActiveTab('raport'); localStorage.setItem('raport_last_viewed_month', `${currentYear}-${currentMonth}`) }}
                            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 relative
                            ${activeTab === 'raport' ? 'bg-[var(--color-primary)] text-white shadow-lg' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}>
                            <ClipboardList className="w-4 h-4" /> Raport Bulanan
                            {raportHistory.length > 0 && (
                                <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full border ${activeTab === 'raport' ? 'bg-white/20 border-white/30 text-white' : 'bg-[var(--color-surface-alt)] border-[var(--color-border)] text-[var(--color-text-muted)]'}`}>
                                    {raportHistory.length}
                                </span>
                            )}
                            {latestRaport && latestRaport.month === currentMonth && latestRaport.year === currentYear &&
                                localStorage.getItem('raport_last_viewed_month') !== `${currentYear}-${currentMonth}` && (
                                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-[var(--color-surface)]" />
                                )}
                        </button>
                    </div>

                    {/* ── TAB: PERILAKU ── */}
                    {activeTab === 'perilaku' && (
                        <div className="space-y-4">
                            {/* Reports */}
                            <div className="space-y-3">
                                <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wide px-2 flex items-center gap-2">
                                    <span className="flex h-2.5 w-2.5 relative">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                                    </span>
                                    Riwayat Pelanggaran
                                </p>
                                {student.reports.length > 0 ? (
                                    <div className="space-y-2">
                                        {student.reports.map((report) => (
                                            <div key={report.id} className="bg-surface border border-border rounded-2xl px-5 py-4 flex justify-between items-center gap-4 hover:border-red-500/30 transition-all group">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                                                        <span className="text-xs font-bold text-red-500">{report.teacher[0]?.toUpperCase() || '?'}</span>
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-bold text-[var(--color-text)] leading-tight truncate mb-1">{report.type}</p>
                                                        <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)] font-bold uppercase tracking-wide opacity-60">
                                                            <span className="tabular-nums">{report.date}</span>
                                                            <span className="w-1 h-1 rounded-full bg-[var(--color-border)]"></span>
                                                            <span className="truncate">{report.teacher}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="shrink-0 flex items-center justify-center px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 font-bold font-mono text-sm shadow-sm">
                                                    {report.points}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="py-12 bg-[var(--color-surface-alt)]/50 rounded-2xl border border-[var(--color-border)] text-center flex flex-col items-center justify-center gap-4 animate-in fade-in zoom-in duration-500">
                                        <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                                            <ShieldHalf className="w-6 h-6 text-emerald-500 opacity-20" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-[var(--color-text)]">Nihil Pelanggaran</p>
                                            <p className="text-xs text-[var(--color-text-muted)] mt-1 opacity-60">Santri berlaku sangat baik sejauh ini.</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Achievements */}
                            <div className="space-y-3 pt-2">
                                <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wide px-2 flex items-center gap-2">
                                    <span className="flex h-2.5 w-2.5 relative">
                                        <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                                    </span>
                                    Riwayat Prestasi
                                </p>
                                {student.achievements.length > 0 ? (
                                    <div className="space-y-2">
                                        {student.achievements.map((item) => (
                                            <div key={item.id} className="bg-surface border border-border rounded-2xl px-5 py-4 flex justify-between items-center gap-4 hover:border-emerald-500/30 transition-all group">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                                                        <span className="text-xs font-bold text-emerald-500">{item.teacher[0]?.toUpperCase() || '?'}</span>
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-bold text-[var(--color-text)] leading-tight truncate mb-1">{item.type}</p>
                                                        <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)] font-bold uppercase tracking-wide opacity-60">
                                                            <span className="tabular-nums">{item.date}</span>
                                                            <span className="w-1 h-1 rounded-full bg-[var(--color-border)]"></span>
                                                            <span className="truncate">{item.teacher}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="shrink-0 flex items-center justify-center px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 font-bold font-mono text-sm shadow-sm">
                                                    +{item.points}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="py-12 bg-[var(--color-surface-alt)]/50 rounded-2xl border border-[var(--color-border)] text-center flex flex-col items-center justify-center gap-4 animate-in fade-in zoom-in duration-500">
                                        <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                                            <Trophy className="w-6 h-6 text-amber-500 opacity-20" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-[var(--color-text)]">Belum Ada Prestasi</p>
                                            <p className="text-xs text-[var(--color-text-muted)] mt-1 opacity-60 px-6">Setiap pencapaian positif santri akan muncul di sini.</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ── TAB: RAPORT BULANAN ── */}
                    {activeTab === 'raport' && (
                        <div className="space-y-3">
                            {raportLoading ? (
                                <div className="space-y-3">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="h-24 rounded-2xl bg-[var(--color-surface-alt)] animate-pulse border border-[var(--color-border)]" />
                                    ))}
                                </div>
                            ) : raportHistory.length === 0 ? (
                                <div className="py-14 bg-[var(--color-surface-alt)]/50 rounded-2xl border border-[var(--color-border)] text-center flex flex-col items-center justify-center gap-4 animate-in fade-in zoom-in duration-500">
                                    <div className="w-16 h-16 rounded-3xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 flex items-center justify-center">
                                        <Calendar className="w-6 h-6 text-[var(--color-primary)] opacity-20" />
                                    </div>
                                    <div className="px-6">
                                        <p className="text-sm font-bold text-[var(--color-text)]">Raport Belum Tersedia</p>
                                        <p className="text-xs text-[var(--color-text-muted)] mt-1.5 opacity-60 leading-relaxed">
                                            Raport bulan <span className="font-bold">{BULAN_STR[currentMonth]} {currentYear}</span> belum diisi oleh musyrif.
                                        </p>
                                    </div>
                                    {student.homeroomTeacher?.phone && (
                                        <a
                                            href={`https://wa.me/${student.homeroomTeacher.phone.replace(/\D/g, '').replace(/^0/, '62')}`}
                                            target="_blank" rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 text-xs font-bold hover:bg-emerald-500/20 transition-all"
                                        >
                                            <WhatsAppIcon className="w-4 h-4" />
                                            Hubungi {student.homeroomTeacher.name || 'Wali Kelas'}
                                        </a>
                                    )}
                                </div>
                            ) : (
                                <>
                                    {/* ── Mini Trend Chart rata-rata bulanan ── */}
                                    {raportHistory.length >= 2 && (() => {
                                        const chronological = [...raportHistory].reverse()
                                        const avgs = chronological.map(r => {
                                            const vals = KRITERIA_LIST.map(k => r[k.key]).filter(v => v !== null && v !== undefined && v !== '')
                                            return vals.length ? vals.reduce((a, b) => a + Number(b), 0) / vals.length : null
                                        }).filter(v => v !== null)
                                        if (avgs.length < 2) return null
                                        const W = 260, H = 52, pad = 6
                                        const minV = Math.min(...avgs), maxV = Math.max(...avgs)
                                        const range = maxV - minV || 0.5
                                        const pts = avgs.map((v, i) => {
                                            const x = pad + (i / (avgs.length - 1)) * (W - pad * 2)
                                            const y = H - pad - ((v - minV) / range) * (H - pad * 2)
                                            return `${x},${y}`
                                        }).join(' ')
                                        const last = avgs[avgs.length - 1], prev = avgs[avgs.length - 2]
                                        const trendColor = last > prev ? '#10b981' : last < prev ? '#ef4444' : '#6366f1'
                                        const trendLabel = last > prev ? '↑ Naik' : last < prev ? '↓ Turun' : '→ Stabil'
                                        return (
                                            <div className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]">
                                                <div className="flex items-center justify-between mb-2">
                                                    <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)]">Tren Rata-rata Nilai</p>
                                                    <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: trendColor + '20', color: trendColor }}>{trendLabel} · {last.toFixed(1)}</span>
                                                </div>
                                                <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} aria-hidden="true" style={{ overflow: 'visible' }}>
                                                    {[0.25, 0.5, 0.75].map((sc, i) => (
                                                        <line key={i} x1={pad} y1={pad + sc * (H - pad * 2)} x2={W - pad} y2={pad + sc * (H - pad * 2)} stroke="var(--color-border)" strokeWidth="0.8" strokeDasharray="3,3" />
                                                    ))}
                                                    <defs>
                                                        <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="0%" stopColor={trendColor} stopOpacity="0.18" />
                                                            <stop offset="100%" stopColor={trendColor} stopOpacity="0.02" />
                                                        </linearGradient>
                                                    </defs>
                                                    <polygon points={`${pad},${H - pad} ${pts} ${W - pad},${H - pad}`} fill="url(#trendFill)" />
                                                    <polyline points={pts} fill="none" stroke={trendColor} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
                                                    {avgs.map((v, i) => {
                                                        const x = pad + (i / (avgs.length - 1)) * (W - pad * 2)
                                                        const y = H - pad - ((v - minV) / range) * (H - pad * 2)
                                                        const label = BULAN_STR[chronological[i]?.month]?.slice(0, 3) || ''
                                                        return (
                                                            <g key={i}>
                                                                <circle cx={x} cy={y} r={i === avgs.length - 1 ? 4 : 2.5} fill={i === avgs.length - 1 ? trendColor : 'var(--color-surface)'} stroke={trendColor} strokeWidth="1.5" />
                                                                <text x={x} y={H} textAnchor="middle" fontSize="7" fontWeight="700" fill="var(--color-text-muted)">{label}</text>
                                                            </g>
                                                        )
                                                    })}
                                                </svg>
                                            </div>
                                        )
                                    })()}
                                    {raportHistory.map((r, idx) => {
                                        const avg = calcAvg(r)
                                        const g = avg ? getGrade(avg) : null
                                        const isLatest = r.month === currentMonth && r.year === currentYear
                                        const isExpanded = expandedRaport === r.id
                                        const allFilled = KRITERIA_LIST.every(k => r[k.key] !== null && r[k.key] !== undefined && r[k.key] !== '')
                                        const prevR = raportHistory[idx + 1] || null

                                        return (
                                            <div key={r.id}
                                                className="bg-surface rounded-2xl border overflow-hidden transition-all"
                                                style={{ borderColor: isLatest ? 'rgba(16,185,129,0.3)' : 'var(--color-border)', background: isLatest ? 'rgba(16,185,129,0.03)' : undefined }}>
                                                {/* Card Header — always visible */}
                                                <button className="w-full px-5 py-4 flex items-center gap-3 text-left"
                                                    onClick={() => setExpandedRaport(isExpanded ? null : r.id)}>
                                                    <div className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center border"
                                                        style={{ background: g ? g.bg : 'var(--color-surface-alt)', borderColor: g ? g.border : 'var(--color-border)' }}>
                                                        <ClipboardList className="w-4 h-4" style={{ color: g ? g.color : 'var(--color-text-muted)' }} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <p className="text-sm font-bold text-[var(--color-text)]">
                                                                {BULAN_STR[r.month]} {r.year}
                                                            </p>
                                                            {isLatest && (
                                                                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 border border-emerald-500/20">
                                                                    ✦ Terbaru
                                                                </span>
                                                            )}
                                                            {!allFilled && (
                                                                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 border border-amber-500/20">
                                                                    Belum lengkap
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            {r.musyrif && (
                                                                <span className="text-xs text-[var(--color-text-muted)] flex items-center gap-1">
                                                                    <User className="w-4 h-4" /> {r.musyrif}
                                                                </span>
                                                            )}
                                                            {avg && g && (
                                                                <span className="text-xs font-bold px-2 py-0.5 rounded-md" style={{ background: g.bg, color: g.color }}>
                                                                    Rata-rata {avg} — {g.label}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    { isExpanded ? <ChevronUp className="w-4 h-4 text-[var(--color-text-muted)] shrink-0" /> : <ChevronDown className="w-4 h-4 text-[var(--color-text-muted)] shrink-0" /> }
                                                </button>

                                                {/* Expanded detail */}
                                                {isExpanded && (
                                                    <div className="px-5 pb-5 pt-1 border-t border-[var(--color-border)] space-y-4">
                                                        {/* Nilai 5 kriteria + delta arrow */}
                                                        <div className="grid grid-cols-5 gap-2 pt-3">
                                                            {KRITERIA_LIST.map(k => {
                                                                const val = r[k.key]
                                                                const vNum = val !== null && val !== undefined && val !== '' ? Number(val) : null
                                                                const kg = vNum !== null ? getGrade(vNum) : null
                                                                const prevVal = prevR?.[k.key]
                                                                const prevNum = prevVal !== null && prevVal !== undefined && prevVal !== '' ? Number(prevVal) : null
                                                                const delta = (vNum !== null && prevNum !== null) ? vNum - prevNum : null
                                                                return (
                                                                    <div key={k.key} className="flex flex-col items-center gap-1">
                                                                        <k.icon className="text-xs" style={{ color: k.color }} />
                                                                        <span className="text-xs font-bold text-center leading-tight" style={{ color: k.color }}>
                                                                            {k.label}
                                                                        </span>
                                                                        <div className="w-full h-9 rounded-xl flex items-center justify-center text-[14px] font-bold border"
                                                                            style={{
                                                                                background: kg ? kg.bg : 'var(--color-surface-alt)',
                                                                                color: kg ? kg.color : 'var(--color-text-muted)',
                                                                                borderColor: kg ? kg.border : 'var(--color-border)'
                                                                            }}>
                                                                            {vNum !== null ? vNum : '—'}
                                                                        </div>
                                                                        {delta !== null && delta !== 0 && (
                                                                            <span className={`text-xs font-bold flex items-center gap-0.5 ${delta > 0 ? 'text-emerald-500' : 'text-red-400'}`}>
                                                                                { delta > 0 ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" /> }
                                                                                {Math.abs(delta)}
                                                                            </span>
                                                                        )}
                                                                        {delta === 0 && prevNum !== null && (
                                                                            <span className="text-xs text-[var(--color-text-muted)]">—</span>
                                                                        )}
                                                                    </div>
                                                                )
                                                            })}
                                                        </div>

                                                        {/* Data tambahan jika ada */}
                                                        {(r.ziyadah || r.murojaah || r.hari_sakit || r.hari_izin || r.hari_alpa || r.berat_badan || r.tinggi_badan) && (
                                                            <div className="grid grid-cols-2 gap-2">
                                                                {r.ziyadah && (
                                                                    <div className="px-3 py-2 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)]">
                                                                        <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wide">Ziyadah</p>
                                                                        <p className="text-sm font-bold text-emerald-500">{r.ziyadah}</p>
                                                                    </div>
                                                                )}
                                                                {r.murojaah && (
                                                                    <div className="px-3 py-2 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)]">
                                                                        <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wide">Muroja'ah</p>
                                                                        <p className="text-sm font-bold text-indigo-500">{r.murojaah}</p>
                                                                    </div>
                                                                )}
                                                                {(r.hari_sakit !== null && r.hari_sakit !== undefined) && (
                                                                    <div className="px-3 py-2 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)]">
                                                                        <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wide">Hari Sakit</p>
                                                                        <p className="text-sm font-bold text-red-400">{r.hari_sakit} hari</p>
                                                                    </div>
                                                                )}
                                                                {(r.hari_izin !== null && r.hari_izin !== undefined) && (
                                                                    <div className="px-3 py-2 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)]">
                                                                        <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wide">Hari Izin</p>
                                                                        <p className="text-sm font-bold text-amber-500">{r.hari_izin} hari</p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}

                                                        {/* Catatan musyrif */}
                                                        {r.catatan && (
                                                            <div className="px-4 py-3 rounded-xl bg-amber-500/8 border border-amber-500/20">
                                                                <p className="text-xs font-bold text-amber-600 uppercase tracking-wide mb-1">Catatan Musyrif</p>
                                                                <p className="text-xs text-[var(--color-text)] leading-relaxed">{r.catatan}</p>
                                                            </div>
                                                        )}

                                                        {/* Tombol Unduh PDF — dikontrol oleh ENABLE_PDF_DOWNLOAD di atas
                                                         Ubah konstanta tersebut menjadi `true` untuk mengaktifkan kembali */}
                                                        {ENABLE_PDF_DOWNLOAD && (
                                                            <button
                                                                onClick={() => handlePrintRaport(r)}
                                                                disabled={pdfLoading === r.id}
                                                                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border text-xs font-bold transition-all mt-1
                                                                ${pdfLoading === r.id
                                                                        ? 'bg-[var(--color-surface-alt)] border-[var(--color-border)] text-[var(--color-text-muted)] opacity-60 cursor-not-allowed'
                                                                        : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-500 hover:bg-indigo-500/20'
                                                                    }`}
                                                            >
                                                                { pdfLoading === r.id ? <LoaderCircle className={`w-4 h-4 ${pdfLoading === r.id ? 'animate-spin' : ''}`} /> : <FileText className={`w-4 h-4 ${pdfLoading === r.id ? 'animate-spin' : ''}`} /> }
                                                                {pdfLoading === r.id ? 'Membuat PDF...' : `Unduh PDF — ${BULAN_STR[r.month]} ${r.year}`}
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </>
                            )}
                        </div>
                    )}

                    {/* Hidden container untuk render PDF — dikontrol oleh ENABLE_PDF_DOWNLOAD */}
                    {ENABLE_PDF_DOWNLOAD && printQueue.length > 0 && printRaportData && (
                        <div ref={printContainerRef} style={{ position: 'fixed', left: '-9999px', top: 0, width: '1000px', visibility: 'hidden', pointerEvents: 'none' }}>
                            <PrintCard
                                student={printRaportData.student}
                                scores={{
                                    nilai_akhlak: printRaportData.r.nilai_akhlak,
                                    nilai_ibadah: printRaportData.r.nilai_ibadah,
                                    nilai_kebersihan: printRaportData.r.nilai_kebersihan,
                                    nilai_quran: printRaportData.r.nilai_quran,
                                    nilai_bahasa: printRaportData.r.nilai_bahasa,
                                }}
                                extra={{
                                    berat_badan: printRaportData.r.berat_badan,
                                    tinggi_badan: printRaportData.r.tinggi_badan,
                                    ziyadah: printRaportData.r.ziyadah,
                                    murojaah: printRaportData.r.murojaah,
                                    hari_sakit: printRaportData.r.hari_sakit,
                                    hari_izin: printRaportData.r.hari_izin,
                                    hari_alpa: printRaportData.r.hari_alpa,
                                    hari_pulang: printRaportData.r.hari_pulang,
                                    catatan: printRaportData.r.catatan,
                                }}
                                bulanObj={BULAN.find(b => b.id === printRaportData.r.month)}
                                tahun={printRaportData.r.year}
                                musyrif={printRaportData.r.musyrif}
                                className={printRaportData.student.class}
                                lang="id"
                                settings={settings}
                                onRendered={() => setPrintRenderedCount(c => c + 1)}
                                reportType="bulanan"
                            />
                        </div>
                    )}

                    {/* Support */}
                    {(() => {
                        const htPhone = student.homeroomTeacher?.phone
                            ? student.homeroomTeacher.phone.replace(/\D/g, '').replace(/^0/, '62')
                            : null
                        const htName = student.homeroomTeacher?.name
                        return (
                            <div className="bg-gray-900 rounded-2xl p-5 flex items-center justify-between gap-4 mt-2 shadow-xl">
                                <div className="min-w-0">
                                    <p className="font-bold text-white mb-1">Perlu Bantuan?</p>
                                    <p className="text-xs text-slate-300 truncate">
                                        {htName
                                            ? `Hubungi ${htName} — wali kelas ${student.class}`
                                            : 'Konsultasi langsung dengan wali kelas / BK'}
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    {htPhone ? (
                                        <>
                                            <a
                                                href={`https://wa.me/${htPhone}`}
                                                target="_blank" rel="noopener noreferrer"
                                                title={`Whatsapp ${htName || 'Wali Kelas'}`}
                                                className="w-11 h-11 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-lg hover:bg-emerald-500 hover:text-white transition-all"
                                            >
                                                <WhatsAppIcon className="w-4 h-4" />
                                            </a>
                                            <a
                                                href={`tel:+${htPhone}`}
                                                title={`Telepon ${htName || 'Wali Kelas'}`}
                                                className="w-11 h-11 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white text-sm hover:bg-white/20 transition-all"
                                            >
                                                <Phone className="w-4 h-4" />
                                            </a>
                                        </>
                                    ) : (
                                        // Nomor wali kelas belum diisi di database — tombol dinonaktifkan
                                        <>
                                            <span className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400/40 text-lg cursor-not-allowed" title="Nomor wali kelas belum tersedia">
                                                <WhatsAppIcon className="w-4 h-4" />
                                            </span>
                                            <span className="w-11 h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/30 text-sm cursor-not-allowed" title="Nomor wali kelas belum tersedia">
                                                <Phone className="w-4 h-4" />
                                            </span>
                                        </>
                                    )}
                                </div>
                            </div>
                        )
                    })()}

                    <p className="text-center text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wide pt-4 opacity-70">
                        Laporanmu © 2026
                    </p>
                </div>
            </div>
        )
    }

    // Form view
    return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--color-surface)] relative overflow-hidden px-4 py-8 transition-colors">
            {/* Ambient Background Glows */}
            <div className="absolute inset-0 pointer-events-none z-0">
            </div>

            <div className="w-full max-w-[420px] space-y-6 relative z-10">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2.5 group">
                        <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)] flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                            <span className="text-white font-bold font-heading text-lg">L</span>
                        </div>
                        <span className="font-heading font-bold text-xl text-[var(--color-text)]">Laporan<span className="text-[var(--color-primary)]">mu</span></span>
                    </Link>
                    <button
                        onClick={toggleTheme}
                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)]/30 transition-all"
                        aria-label="Toggle theme"
                    >
                        { isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" /> }
                    </button>
                </div>

                {/* Title */}
                <div className="text-center sm:text-left mt-8 mb-4">
                    <h1 className="text-2xl font-bold font-heading text-[var(--color-text)] mb-2">Cek Data Anak</h1>
                    <p className="text-sm text-[var(--color-text-muted)]">Gunakan kode registrasi & PIN dari sekolah</p>
                </div>

                {/* Form Card */}
                <div className={`bg-surface border border-border rounded-[2rem] p-6 sm:p-8 animate-in fade-in zoom-in duration-700 overflow-hidden relative shadow-xl ${isShaking ? 'animate-shake' : ''}`}>
                    {/* Visual Accent */}
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-[var(--color-primary)] opacity-30" />
                    <form onSubmit={handleCheck} className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider pl-1">Kode Registrasi</label>
                            <div className="relative">
                                <IdCard className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] opacity-70" />
                                <input
                                    type="text"
                                    value={code}
                                    onChange={(e) => setCode(formatCode(e.target.value))}
                                    placeholder="REG-XXXX-XXXX"
                                    className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/10 rounded-xl pl-11 pr-4 py-3.5 text-sm font-bold uppercase tracking-wide text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] placeholder:font-medium placeholder:tracking-normal placeholder:opacity-50 transition-all outline-none"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider pl-1">PIN Rahasia</label>
                            <div className="relative">
                                <Key className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] opacity-70" />
                                <input
                                    type="password"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    value={pin}
                                    onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                    placeholder="••••"
                                    maxLength={4}
                                    className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/10 rounded-xl pl-11 pr-4 py-3.5 text-lg font-bold tracking-wide text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] placeholder:text-sm placeholder:tracking-normal placeholder:font-medium placeholder:opacity-50 transition-all outline-none"
                                />
                            </div>
                        </div>

                        {errorMessage && (
                            <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center shrink-0">!</div>
                                <p className="text-xs font-medium text-red-500">
                                    {errorMessage}
                                </p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading || loginCooldown > 0}
                            className={`btn btn-primary w-full py-3.5 mt-2 shadow-lg ${(loading || loginCooldown > 0) ? 'opacity-70' : ''}`}
                        >
                            {loading ? (
                                <><LoaderCircle className="w-4 h-4 animate-spin" /> Memeriksa...</>
                            ) : loginCooldown > 0 ? (
                                <><LoaderCircle className="w-4 h-4 animate-spin" /> Tunggu {loginCooldown}d...</>
                            ) : (
                                <><Search className="w-4 h-4 mr-1" /> Cek Data</>
                            )}
                        </button>
                    </form>

                    <div className="mt-6 pt-5 border-t border-[var(--color-border)]">
                        <p className="text-xs font-medium tracking-wide text-[var(--color-text-muted)] text-center">Belum punya kode? Hubungi wali kelas.</p>
                    </div>
                </div>

                {/* Footer Links */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300">
                    <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
                        <Link to="/login" className="hover:text-[var(--color-primary)] transition-colors">Guru/Staff Login</Link>
                        <span className="w-1 h-1 rounded-full bg-[var(--color-border)]" />
                        <Link to="/privacy" className="hover:text-[var(--color-primary)] transition-colors">Privasi</Link>
                        <span className="w-1 h-1 rounded-full bg-[var(--color-border)]" />
                        <Link to="/contact" className="hover:text-[var(--color-primary)] transition-colors">Bantuan</Link>
                    </div>
                    <Link to="/" className="text-xs font-bold text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-all flex items-center gap-2">
                        <span>← Beranda</span>
                    </Link>
                </div>
            </div>
        </div>
    )
}