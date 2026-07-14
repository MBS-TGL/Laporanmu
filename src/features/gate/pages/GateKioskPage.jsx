import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@lib/supabase'
import { useToast } from '@context/Toast'
import { useLanguage } from '@context/Language'
import { useGateCore } from '@features/gate/hooks/useGateCore'
import { logAudit } from '@utils/auditLogger'
import Modal from '@shared/components/Modal'
import {
  ArrowLeft, Clock, QrCode, Sparkles, CheckCircle2, XCircle,
  Volume2, VolumeX, Keyboard, RefreshCw, LogOut, LogIn,
  Coffee, Briefcase, Home, HeartPulse, UserCheck, ShieldAlert,
  Nfc, Wifi, IdCard
} from 'lucide-react'

// Programmable sound feedback using Web Audio API (0% asset dependency)
function playSynthBeep(type = 'success') {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
    const oscillator = audioCtx.createOscillator()
    const gainNode = audioCtx.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioCtx.destination)

    if (type === 'success') {
      // Crisp, friendly double beep
      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(587.33, audioCtx.currentTime) // D5
      gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime)
      oscillator.start()
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08)
      
      const osc2 = audioCtx.createOscillator()
      const gain2 = audioCtx.createGain()
      osc2.connect(gain2)
      gain2.connect(audioCtx.destination)
      osc2.type = 'sine'
      osc2.frequency.setValueAtTime(880, audioCtx.currentTime + 0.08) // A5
      gain2.gain.setValueAtTime(0.08, audioCtx.currentTime + 0.08)
      osc2.start(audioCtx.currentTime + 0.08)
      gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.22)
      
      oscillator.stop(audioCtx.currentTime + 0.08)
      osc2.stop(audioCtx.currentTime + 0.22)
    } else {
      // Deep warning buzzer
      oscillator.type = 'sawtooth'
      oscillator.frequency.setValueAtTime(140, audioCtx.currentTime)
      gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime)
      oscillator.start()
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35)
      oscillator.stop(audioCtx.currentTime + 0.35)
    }
  } catch (e) {
    console.warn('[Kiosk Audio] Failed to play synth audio feedback:', e)
  }
}

const KIOSK_PURPOSES = [
  { key: 'Makan Siang', label: { id: 'Makan Siang', en: 'Lunch', ar: 'الغداء' }, icon: Coffee, bg: 'from-amber-500/10 to-orange-500/10 hover:from-amber-500/20 hover:to-orange-500/20 text-orange-500 border-orange-500/30' },
  { key: 'Keperluan Keluarga', label: { id: 'Izin Keluarga', en: 'Family Matters', ar: 'أمر عائلي' }, icon: Home, bg: 'from-sky-500/10 to-blue-500/10 hover:from-sky-500/20 hover:to-blue-500/20 text-blue-500 border-blue-500/30' },
  { key: 'Dinas / Tugas', label: { id: 'Tugas Dinas', en: 'Duty', ar: 'مهمة رسمية' }, icon: Briefcase, bg: 'from-emerald-500/10 to-teal-500/10 hover:from-emerald-500/20 hover:to-teal-500/20 text-teal-500 border-teal-500/30' },
  { key: 'Izin Medis', label: { id: 'Izin Medis', en: 'Medical', ar: 'عذر طبي' }, icon: HeartPulse, bg: 'from-rose-500/10 to-pink-500/10 hover:from-rose-500/20 hover:to-pink-500/20 text-rose-500 border-rose-500/30' },
]

export default function GateKioskPage() {
  const navigate = useNavigate()
  const { addToast } = useToast()
  const { language, tNum } = useLanguage()
  const dir = language === 'ar' ? 'rtl' : 'ltr'

  // Load core logic from useGateCore
  const {
    studentList,
    teacherList,
    todayLogs,
    handleSubmit,
    loadTodayLogs,
  } = useGateCore({ activeTab: 'input', rekapMode: 'harian', rekapDate: new Date() })

  // Kiosk Specific States
  const [selectedPurpose, setSelectedPurpose] = useState('Keluar Sementara')
  const [isMuted, setIsMuted] = useState(() => localStorage.getItem('kiosk_muted') === 'true')
  const [showManualModal, setShowManualModal] = useState(false)
  const [manualId, setManualId] = useState('')
  
  // Status Page states: 'standby', 'loading', 'success', 'error'
  const [kioskState, setKioskState] = useState('standby')
  const [statusMessage, setStatusMessage] = useState('')
  const [statusDetails, setStatusDetails] = useState(null) // { name, type, action, subtitle }
  const [countdown, setCountdown] = useState(4)

  const scanBufferRef = useRef('')
  const bufferTimeoutRef = useRef(null)
  const timerRef = useRef(null)
  const countdownIntervalRef = useRef(null)
  
  // Live Clock state
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  // Handle Mute setting
  const toggleMute = (e) => {
    e.stopPropagation()
    addToast(newMuted 
      ? (language === 'en' ? 'Sound muted' : language === 'ar' ? 'تم كتم الصوت' : 'Suara dinonaktifkan') 
      : (language === 'en' ? 'Sound enabled' : language === 'ar' ? 'تم تفعيل الصوت' : 'Suara diaktifkan'), 
      'info'
    )
  }

  // Audio helper
  const triggerAudio = useCallback((type) => {
    if (!isMuted) {
      playSynthBeep(type)
    }
  }, [isMuted])

  // Reset to standby state helper
  const resetToStandby = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current)
    scanBufferRef.current = ''
    setManualId('')
    setKioskState('standby')
    setStatusDetails(null)
    setStatusMessage('')
  }, [])

  // Process Card ID
  const processCardId = useCallback(async (cardId) => {
    if (!cardId || cardId.trim() === '') return
    
    setKioskState('loading')
    const searchId = cardId.trim().toUpperCase()

    // 1. Search in studentList and teacherList
    const student = studentList.find(s => s.nbm?.toUpperCase() === searchId || s.id === cardId)
    const teacher = teacherList.find(t => t.nbm?.toUpperCase() === searchId || t.nip?.toUpperCase() === searchId || t.id === cardId)
    
    const person = student 
      ? { id: student.id, name: student.name, type: 'santri', nbm: student.nbm }
      : teacher
        ? { id: teacher.id, name: teacher.name, type: teacher.type || 'guru', nbm: teacher.nbm || teacher.nip }
        : null

    if (!person) {
      triggerAudio('error')
      setKioskState('error')
      setStatusMessage(
        language === 'en' 
          ? 'Card not registered! Please contact security.' 
          : language === 'ar' 
            ? 'البطاقة غير مسجلة! يرجى الاتصال بالأمن.' 
            : 'Kartu tidak terdaftar! Silakan hubungi petugas Satpam.'
      )
      
      // Start 4s countdown back to standby
      setCountdown(4)
      countdownIntervalRef.current = setInterval(() => {
        setCountdown(prev => Math.max(prev - 1, 0))
      }, 1000)
      timerRef.current = setTimeout(resetToStandby, 4000)
      return
    }

    try {
      // 2. Check for active log (currently checked out / "Out")
      const activeLog = todayLogs.find(l => !l.check_out && (l.student_id === person.id || l.teacher_id === person.id))

      if (activeLog) {
        // Person is returning (CHECK-IN)
        const checkOutISO = new Date().toISOString()
        const { error } = await supabase
          .from('gate_logs')
          .update({ check_out: checkOutISO })
          .eq('id', activeLog.id)

        if (error) throw error

        // Calculate outside duration
        const diffMs = new Date(checkOutISO) - new Date(activeLog.check_in)
        const mnt = Math.round(diffMs / 60000)
        const hrs = Math.floor(mnt / 60)
        const mins = mnt % 60
        const durationText = hrs > 0
          ? (language === 'en' ? `${hrs}h ${mins}m` : language === 'ar' ? `${hrs}س ${mins}د` : `${hrs} Jam ${mins} Menit`)
          : (language === 'en' ? `${mins}m` : language === 'ar' ? `${mins}د` : `${mins} Menit`)

        triggerAudio('success')
        setKioskState('success')
        setStatusDetails({
          name: person.name,
          type: person.type,
          action: 'IN',
          subtitle: language === 'en' 
            ? `Duration outside: ${durationText}` 
            : language === 'ar' 
              ? `مدة الغياب: ${durationText}` 
              : `Total waktu di luar: ${durationText}`
        })
        
        // Log Audit
        await logAudit({
          action: 'UPDATE', source: 'KIOSK', tableName: 'gate_logs',
          recordId: activeLog.id, oldData: activeLog, newData: { ...activeLog, check_out: checkOutISO }
        })
        
        // Load fresh logs
        await loadTodayLogs(true)
      } else {
        // Person is checking out (CHECK-OUT)
        const formPayload = {
          flow: 'internal',
          visitorType: person.type,
          personId: person.id,
          name: person.name,
          nbm: person.nbm || '',
          purpose: selectedPurpose || 'Keluar Sementara',
          dateOut: new Date().toLocaleDateString('sv-SE'), // YYYY-MM-DD local
          timeOut: new Date().toTimeString().slice(0, 5), // HH:MM
          estimatedReturn: null
        }

        // Call the handleSubmit from useGateCore
        await handleSubmit(formPayload)

        triggerAudio('success')
        setKioskState('success')
        setStatusDetails({
          name: person.name,
          type: person.type,
          action: 'OUT',
          subtitle: language === 'en'
            ? `Purpose: ${formPayload.purpose}`
            : language === 'ar'
              ? `الغرض: ${formPayload.purpose}`
              : `Keperluan: ${formPayload.purpose}`
        })
      }
    } catch (err) {
      console.error(err)
      triggerAudio('error')
      setKioskState('error')
      setStatusMessage(language === 'en' ? 'Unexpected transaction error' : language === 'ar' ? 'حدث خطأ غير متوقع في المعاملة.' : 'Terjadi kesalahan sistem saat memproses transaksi.')
    }

    // Start 4s countdown back to standby
    setCountdown(4)
    countdownIntervalRef.current = setInterval(() => {
      setCountdown(prev => Math.max(prev - 1, 0))
    }, 1000)
    timerRef.current = setTimeout(resetToStandby, 4000)
  }, [studentList, teacherList, todayLogs, selectedPurpose, language, triggerAudio, handleSubmit, loadTodayLogs, resetToStandby])

  // Handle Global RFID card scanner keydowns
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      // Only capture when on standby and manual modal is closed
      if (kioskState !== 'standby' || showManualModal) {
        return
      }

      // Ignore standard modifier keys
      if (e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta') {
        return
      }

      // If we see Enter, submit the accumulated string
      if (e.key === 'Enter') {
        const cardId = scanBufferRef.current.trim()
        if (cardId) {
          processCardId(cardId)
        }
        scanBufferRef.current = ''
        if (bufferTimeoutRef.current) clearTimeout(bufferTimeoutRef.current)
      } else {
        // Accumulate single characters (alphanumeric card codes)
        if (e.key.length === 1) {
          scanBufferRef.current += e.key
        }

        // Auto-clear buffer if typing is too slow or idle for 1s
        if (bufferTimeoutRef.current) clearTimeout(bufferTimeoutRef.current)
        bufferTimeoutRef.current = setTimeout(() => {
          scanBufferRef.current = ''
        }, 1000)
      }
    }

    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown)
      if (bufferTimeoutRef.current) clearTimeout(bufferTimeoutRef.current)
    }
  }, [kioskState, showManualModal, processCardId])

  // Handle Manual Modal submission
  const handleManualSubmit = (e) => {
    e.preventDefault()
    if (!manualId || manualId.trim() === '') return
    setShowManualModal(false)
    processCardId(manualId)
  }

  // stats derived
  const activeOutCount = useMemo(() => todayLogs.filter(l => !l.check_out && l.visitor_type !== 'tamu').length, [todayLogs])
  const returnedCount = useMemo(() => todayLogs.filter(l => l.check_out && l.visitor_type !== 'tamu').length, [todayLogs])

  return (
    <div 
      className="min-h-screen bg-[var(--color-app-bg)] relative flex flex-col items-center justify-between p-6 select-none overflow-hidden"
      dir={dir}
    >
      {/* Decorative premium floating ambient glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[10%] left-[20%] w-[600px] h-[600px] rounded-full bg-[var(--color-primary)]/10 blur-[120px] animate-pulse" />
        <div className="absolute -bottom-[10%] right-[20%] w-[500px] h-[500px] rounded-full bg-emerald-500/5 blur-[100px] animate-pulse" />
      </div>

      {/* HEADER SECTION */}
      <div className="w-full max-w-6xl flex items-center justify-between z-10 gap-3">
        <button 
          onClick={(e) => { e.stopPropagation(); navigate('/boarding/gate') }}
          className="h-11 px-3 sm:px-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 backdrop-blur-md text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)] transition-all flex items-center gap-2 active:scale-95 shadow-sm shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest hidden xs:inline">
            {language === 'en' ? 'Exit Kiosk' : language === 'ar' ? 'الخروج' : 'Kembali ke Admin'}
          </span>
          <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest xs:hidden">
            {language === 'en' ? 'Exit' : language === 'ar' ? 'خروج' : 'Kembali'}
          </span>
        </button>

        {/* Live Premium Clock (Desktop only inside header) */}
        <div className="hidden md:flex flex-col items-center">
          <div className="flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-[var(--color-primary)] animate-pulse" />
            <span className="text-[20px] sm:text-[24px] font-black text-[var(--color-text)] tracking-wider font-mono tabular-nums leading-none">
              {time.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
            </span>
          </div>
          <span className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mt-1">
            {time.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
        </div>

        {/* UTILITIES */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Sound Toggle */}
          <button 
            onClick={toggleMute}
            className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all border active:scale-95 shadow-sm backdrop-blur-md ${isMuted 
              ? 'border-red-500/20 bg-red-500/10 text-red-500' 
              : 'border-[var(--color-border)] bg-[var(--color-surface)]/60 text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
            title={isMuted 
              ? (language === 'en' ? 'Unmute Sound' : language === 'ar' ? 'تفعيل الصوت' : 'Aktifkan Suara') 
              : (language === 'en' ? 'Mute Sound' : language === 'ar' ? 'كتم الصوت' : 'Matikan Suara')}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          
          {/* Manual Input Toggle */}
          <button 
            onClick={(e) => { e.stopPropagation(); setShowManualModal(true) }}
            className="w-11 h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 backdrop-blur-md text-[var(--color-text-muted)] hover:text-[var(--color-text)] flex items-center justify-center transition-all active:scale-95 shadow-sm"
            title={language === 'en' ? 'Type ID Manually' : language === 'ar' ? 'إدخال المعرف يدوياً' : 'Ketik ID Manual'}
          >
            <Keyboard className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* MOBILE HERO CLOCK (Visible only on small screens) */}
      <div className="md:hidden w-full max-w-sm flex flex-col items-center justify-center mt-4 mb-2 z-10 glass py-3 px-5 rounded-2xl border border-[var(--color-border)]/60 shadow-sm relative overflow-hidden shrink-0">
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-[var(--color-primary)] animate-pulse" />
          <span className="text-[18px] font-black text-[var(--color-text)] font-mono tracking-wider leading-none">
            {time.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
          </span>
        </div>
        <span className="text-[8px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mt-1">
          {time.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </span>
      </div>

      {/* MAIN SCREEN CARD */}
      <div className="w-full max-w-2xl my-auto z-10">
        
        {/* STANDBY STATE */}
        {kioskState === 'standby' && (
          <div className="glass rounded-[2rem] border border-[var(--color-border)]/80 p-8 sm:p-12 text-center flex flex-col items-center justify-center relative overflow-hidden shadow-2xl">
            {/* Pulsing Scanner Visual Ray */}
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-[var(--color-primary)] to-transparent animate-pulse shadow-[0_0_15px_var(--color-primary)]" />
            
            <div className="relative mb-8 flex flex-col items-center justify-center">
              {/* Stylized Contactless Tap wireless pulsing waves */}
              <div className="absolute w-36 h-36 rounded-full border-2 border-[var(--color-primary)]/20 animate-ping opacity-15" />
              <div className="absolute w-28 h-28 rounded-full border-2 border-[var(--color-primary)]/30 animate-pulse opacity-25" />
              
              <div className="w-24 h-24 rounded-[2rem] bg-gradient-to-br from-[var(--color-primary)]/10 to-[var(--color-primary)]/5 border-2 border-[var(--color-primary)]/30 flex items-center justify-center shadow-xl shadow-[var(--color-primary)]/5 relative z-10">
                <div className="relative flex items-center justify-center">
                  <IdCard className="w-10 h-10 text-[var(--color-primary)] opacity-90" />
                  <Nfc className="w-5 h-5 text-emerald-500 absolute -bottom-1 -right-1 bg-[var(--color-surface)] rounded-lg p-0.5 border border-emerald-500/20 animate-pulse" />
                </div>
              </div>
            </div>

            <h2 className="text-[20px] sm:text-[24px] font-black text-[var(--color-text)] tracking-tight leading-tight mb-2 font-heading">
              {language === 'en' ? 'TAP YOUR RFID CARD' : language === 'ar' ? 'ضع بطاقة RFID الخاصة بك' : 'TEMPELKAN KARTU RFID ANDA'}
            </h2>
            <p className="text-[11px] sm:text-[12px] text-[var(--color-text-muted)] tracking-wider uppercase font-bold max-w-sm mb-10 leading-relaxed opacity-70">
              {language === 'en' 
                ? 'System is ready to scan RFID card or tap key fob' 
                : language === 'ar' 
                  ? 'النظام جاهز لمسح بطاقة RFID أو المفتاح الذكي' 
                  : 'Dekatkan kartu pelajar atau kartu pegawai pada alat scanner gerbang'}
            </p>

            {/* QUICK ACTIONS/PURPOSES */}
            <div className="w-full space-y-3.5">
              <div className="flex items-center gap-2 w-full justify-center">
                <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                <span className="text-[9.5px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">
                  {language === 'en' ? 'Select Purpose (Tap before Scan)' : language === 'ar' ? 'اختر الغرض قبل المسح' : 'Pilih Keperluan (Sentuh sebelum Scan)'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                {KIOSK_PURPOSES.map(p => {
                  const Icon = p.icon
                  const labelStr = p.label[language] || p.label['id']
                  const isSelected = selectedPurpose === p.key
                  return (
                    <button
                      key={p.key}
                      onClick={(e) => { e.stopPropagation(); setSelectedPurpose(p.key) }}
                      className={`h-14 rounded-2xl border text-left p-3.5 flex items-center gap-3 transition-all active:scale-95 bg-gradient-to-r ${p.bg} ${isSelected 
                        ? 'border-[var(--color-primary)] shadow-lg shadow-[var(--color-primary)]/10 scale-[1.02] bg-[var(--color-primary)]/10' 
                        : 'opacity-70 hover:opacity-100'}`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-[var(--color-surface)] shadow-sm`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-[11px] font-black leading-tight truncate">{labelStr}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* LOADING PROCESSING STATE */}
        {kioskState === 'loading' && (
          <div className="glass rounded-[2rem] border border-[var(--color-border)] p-12 text-center flex flex-col items-center justify-center shadow-2xl">
            <RefreshCw className="animate-spin w-12 h-12 text-[var(--color-primary)] mb-6" />
            <h3 className="text-[18px] font-black text-[var(--color-text)] tracking-tight">
              {language === 'en' ? 'PROCESSING CARD...' : language === 'ar' ? 'جاري معالجة البطاقة...' : 'SEDANG MEMPROSES KARTU...'}
            </h3>
            <p className="text-[11px] text-[var(--color-text-muted)] mt-1.5 uppercase font-bold tracking-widest opacity-60">
              {language === 'en' ? 'Verifying identity with database' : 'Memvalidasi data ke database Supabase'}
            </p>
          </div>
        )}

        {/* SUCCESS STATE */}
        {kioskState === 'success' && statusDetails && (
          <div className="glass rounded-[2rem] border border-emerald-500/20 bg-emerald-500/5 p-10 sm:p-12 text-center flex flex-col items-center justify-center relative overflow-hidden shadow-2xl">
            
            {/* Green Ambient Light bar */}
            <div className="absolute inset-x-0 top-0 h-1.5 bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]" />

            <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-6 text-emerald-500 animate-bounce">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest mb-4 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
              {statusDetails.action === 'OUT' ? <LogOut className="w-3 h-3" /> : <LogIn className="w-3 h-3" />}
              {statusDetails.action === 'OUT' 
                ? (language === 'en' ? 'CHECK-OUT SUCCESS' : language === 'ar' ? 'تم تسجيل الخروج بنجاح' : 'BERHASIL KELUAR') 
                : (language === 'en' ? 'CHECK-IN SUCCESS' : language === 'ar' ? 'تم تسجيل الدخول بنجاح' : 'BERHASIL KEMBALI')}
            </div>

            <h3 className="text-[22px] sm:text-[26px] font-black text-[var(--color-text)] tracking-tight leading-tight mb-2 font-heading">
              {statusDetails.name}
            </h3>
            
            <p className="text-[10px] font-black px-2.5 py-0.5 rounded bg-[var(--color-surface-alt)] border border-[var(--color-border)] uppercase tracking-widest text-[var(--color-text-muted)] leading-none inline-block mb-4">
              {statusDetails.type === 'santri' ? (language === 'ar' ? 'طالب' : 'Santri') : (language === 'ar' ? 'موظف' : 'Pegawai / Guru')}
            </p>

            <p className="text-[12px] sm:text-[13px] font-black text-[var(--color-text-muted)] opacity-90 max-w-sm mb-10 leading-relaxed">
              {statusDetails.subtitle}
            </p>

            {/* Countdown reset bar */}
            <div className="w-full max-w-xs bg-[var(--color-border)] h-1 rounded-full overflow-hidden mb-2">
              <div 
                className="bg-emerald-500 h-full transition-all duration-1000"
                style={{ width: `${(countdown / 4) * 100}%` }}
              />
            </div>
            <p className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-wider opacity-60">
              {language === 'en' ? `Resets in ${countdown}s` : language === 'ar' ? `إعادة تعيين خلال ${tNum(countdown)} ثوانٍ` : `Kembali ke siaga dalam ${countdown} detik`}
            </p>
          </div>
        )}

        {/* ERROR STATE */}
        {kioskState === 'error' && (
          <div className="glass rounded-[2rem] border border-red-500/20 bg-red-500/5 p-10 sm:p-12 text-center flex flex-col items-center justify-center relative overflow-hidden shadow-2xl">
            
            {/* Red Ambient Light bar */}
            <div className="absolute inset-x-0 top-0 h-1.5 bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]" />

            <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-6 text-red-500 animate-shake">
              <ShieldAlert className="w-10 h-10" />
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest mb-4 bg-red-500/10 text-red-500 border border-red-500/20">
              <XCircle className="w-3 h-3" />
              {language === 'en' ? 'ERROR DETECTED' : language === 'ar' ? 'خطأ في النظام' : 'TRANSAKSI GAGAL'}
            </div>

            <h3 className="text-[16px] sm:text-[18px] font-black text-[var(--color-text)] tracking-tight leading-relaxed max-w-md mb-8">
              {statusMessage}
            </h3>

            {/* Countdown reset bar */}
            <div className="w-full max-w-xs bg-[var(--color-border)] h-1 rounded-full overflow-hidden mb-2">
              <div 
                className="bg-red-500 h-full transition-all duration-1000"
                style={{ width: `${(countdown / 4) * 100}%` }}
              />
            </div>
            <p className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-wider opacity-60">
              {language === 'en' ? `Resets in ${countdown}s` : language === 'ar' ? `إعادة تعيين خلال ${tNum(countdown)} ثوانٍ` : `Kembali ke siaga dalam ${countdown} detik`}
            </p>
          </div>
        )}

      </div>

      {/* FOOTER & COUNTER STATS SECTION */}
      <div className="w-full max-w-5xl flex flex-col md:flex-row items-center justify-between gap-4 border-t border-[var(--color-border)]/50 pt-6 z-10 shrink-0">
        <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-6 w-full md:w-auto">
          {/* Active Out Card */}
          <div className="flex items-center justify-between sm:justify-start gap-3 bg-[var(--color-surface)]/60 backdrop-blur-md border border-[var(--color-border)]/60 px-4 py-2 rounded-2xl shadow-sm w-full sm:w-auto">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-[var(--color-text-muted)]">
                {language === 'en' ? 'Active Outside' : language === 'ar' ? 'خارج المدرسة' : 'Di Luar Sekolah'}
              </span>
            </div>
            <span className="text-[13px] font-black text-[var(--color-text)] bg-[var(--color-surface-alt)] border border-[var(--color-border)] px-2.5 py-0.5 rounded-xl font-mono tabular-nums leading-none">
              {tNum(activeOutCount)}
            </span>
          </div>

          {/* Returned Today Card */}
          <div className="flex items-center justify-between sm:justify-start gap-3 bg-[var(--color-surface)]/60 backdrop-blur-md border border-[var(--color-border)]/60 px-4 py-2 rounded-2xl shadow-sm w-full sm:w-auto">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-[var(--color-text-muted)]">
                {language === 'en' ? 'Returned Today' : language === 'ar' ? 'عاد اليوم' : 'Kembali Hari Ini'}
              </span>
            </div>
            <span className="text-[13px] font-black text-[var(--color-text)] bg-[var(--color-surface-alt)] border border-[var(--color-border)] px-2.5 py-0.5 rounded-xl font-mono tabular-nums leading-none">
              {tNum(returnedCount)}
            </span>
          </div>
        </div>

        {/* Server Status Indicator */}
        <div className="flex items-center gap-2 bg-[var(--color-surface)]/40 px-3 py-1.5 rounded-full border border-[var(--color-border)]/40 mt-1 md:mt-0 shadow-sm shrink-0" dir="ltr">
          <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
          <span className="text-[8.5px] sm:text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-70">
            LaporanMu Gate Kiosk • {language === 'en' ? 'ONLINE' : language === 'ar' ? 'متصل' : 'TERHUBUNG'}
          </span>
        </div>
      </div>

      {/* MANUAL INPUT ID MODAL */}
      <Modal
        isOpen={showManualModal}
        onClose={() => setShowManualModal(false)}
        title={language === 'en' ? 'Enter Card ID Manually' : language === 'ar' ? 'أدخل معرف البطاقة يدوياً' : 'Ketik Kode ID Secara Manual'}
        description={language === 'en' 
          ? 'Type NISN (Students) or NBM/NIP (Teachers) below.' 
          : language === 'ar'
            ? 'أدخل رقم NISN (للطلاب) أو NBM/NIP (للمعلمين) إذا لم تتم قراءة بطاقة RFID.'
            : 'Gunakan nomor NISN (Santri) atau NBM/NIP (Guru/Karyawan) apabila kartu RFID tidak terbaca.'}
        size="sm"
        icon={Keyboard}
        noPadding={false}
      >
        <form onSubmit={handleManualSubmit} className="space-y-4">
          <input
            type="text"
            autoFocus
            placeholder={language === 'en' ? 'E.G. 0098765432' : language === 'ar' ? 'مثال: ٠٠٩٨٧٦٥٤٣٢' : 'CONTOH: 0098765432'}
            value={manualId}
            onChange={e => setManualId(e.target.value)}
            className="w-full h-11 px-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[12px] font-mono font-bold text-center focus:outline-none focus:border-[var(--color-primary)] transition-all uppercase tracking-wider"
          />

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowManualModal(false)}
              className="h-10 flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[11px] font-black uppercase tracking-widest text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-all active:scale-95"
            >
              {language === 'en' ? 'Cancel' : language === 'ar' ? 'إلغاء' : 'Batal'}
            </button>
            <button
              type="submit"
              disabled={!manualId || manualId.trim() === ''}
              className="h-10 flex-1 rounded-xl bg-[var(--color-primary)] text-white text-[11px] font-black uppercase tracking-widest hover:opacity-95 transition-all active:scale-95 disabled:opacity-50"
            >
              {language === 'en' ? 'Submit' : language === 'ar' ? 'إرسال' : 'Proses'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
