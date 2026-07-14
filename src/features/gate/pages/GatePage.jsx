import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import {
  LogIn, LogOut, Users, ClipboardList, Calendar, CalendarDays,
  Printer, Search, Plus, Send, ChevronLeft, ChevronRight, Loader2,
  Clock, Building2, GraduationCap, Briefcase, Lock, RotateCcw,
  Edit2, Trash2, Check, CheckSquare, Square, MinusSquare, MousePointer, RefreshCw,
  Bell, X, Tag, Keyboard, Download, Filter, IdCard, Car,
  FileSpreadsheet, FileText, CheckCircle2, CircleDot, Undo2, Settings, Monitor
} from 'lucide-react'
import DashboardLayout from '@core/layouts/DashboardLayout'
import {
  StatsCarousel,
  Breadcrumb,
  PageHeader,
  StatCard,
  EmptyState,
  Modal,
  BulkActionsBar
} from '@shared/components'
import { useToast } from '@context/Toast'
import { useAuth } from '@context/Auth'
import { logAudit } from '@utils/auditLogger'
import { useLanguage } from '@context/Language'
import {
  useGateCore,
  fmtDate, fmtTime, fmtDateTime,
  durasi, startOfDay, addDays, nowTimeStr, nowDateStr,
  dateTimeToISO, timeStrToISO,
  sendLogNotification, sendDailySummary,
} from '@features/gate/hooks/useGateCore'
import { useGateImportExport } from '@features/gate/hooks/useGateImportExport'
import {
  buildPrintHTMLDetail, buildPrintHTMLRingkasan,
  buildCSVRingkasan, buildCSVDetail,
  downloadCSV, openPrintWindow,
} from '@features/gate/utils/gateUtils'

import {
  PAGE_T, presetTranslations, getVisitorTypes, getMeta, translatePurpose,
  PRESETS_GURU, PRESETS_KARYAWAN, PRESETS_SANTRI, PRESETS_TAMU, MONTHS_ID
} from '@features/gate/utils/gateConstants'

import ConfirmTimeModal from '@features/gate/ui/modals/ConfirmTimeModal'
import EditLogModal from '@features/gate/ui/modals/EditLogModal'
import ConfigModal from '@features/gate/ui/modals/ConfigModal'
import PrintOptionsModal from '@features/gate/ui/modals/PrintOptionsModal'
import BulkCheckoutModal from '@features/gate/ui/modals/BulkCheckoutModal'
import BulkDeleteModal from '@features/gate/ui/modals/BulkDeleteModal'

import FormInternal from '@features/gate/ui/forms/FormInternal'
import FormTamu from '@features/gate/ui/forms/FormTamu'
import QuickGuide from '@features/gate/ui/QuickGuide'
import LogCard from '@features/gate/ui/LogCard'
import GateFilterBar from '@features/gate/ui/GateFilterBar'
import GateTableRow from '@features/gate/ui/GateTableRow'
import LiveClock from '@features/gate/ui/LiveClock'


// ─── Skeletons ──────────────────────────────────────────────────────────────

function CardSkeleton() {
  return (
    <div className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] animate-pulse">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-[var(--color-surface-alt)] flex-shrink-0" />
        <div className="flex-1 space-y-2 mt-1">
          <div className="h-3 bg-[var(--color-border)] rounded-md w-1/3" />
          <div className="h-2 bg-[var(--color-border)] rounded-md w-1/2" />
          <div className="h-2 bg-[var(--color-border)] rounded-md w-1/4" />
        </div>
      </div>
    </div>
  )
}

function StatSkeleton() {
  return (
    <div className="p-4 rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] animate-pulse space-y-2">
      <div className="w-8 h-8 rounded-xl bg-[var(--color-surface-alt)]" />
      <div className="h-2 bg-[var(--color-border)] rounded-md w-1/2" />
      <div className="h-3 bg-[var(--color-border)] rounded-md w-3/4" />
    </div>
  )
}

function TableSkeleton({ cols = 5, rows = 6 }) {
  return (
    <div className="w-full overflow-hidden animate-pulse">
      <div className="flex border-b border-[var(--color-border)] bg-[var(--color-surface-alt)]/50">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="flex-1 px-4 py-3.5">
            <div className="h-2 bg-[var(--color-border)] rounded-full w-12" />
          </div>
        ))}
      </div>
      <div className="divide-y divide-[var(--color-border)]">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex">
            {Array.from({ length: cols }).map((_, j) => (
              <div key={j} className="flex-1 px-4 py-5">
                <div className={`h-2 bg-[var(--color-border)]/60 rounded-full ${j === 1 ? 'w-24' : j === 0 ? 'w-6' : 'w-16'}`} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

// DateTimeInput now imported from GateForms.jsx

// QuickGuide now imported from GateForms.jsx

// TimeInput now imported from GateModals.jsx

// TeacherSearch now imported from GateForms.jsx

// ─── PresetPills ──────────────────────────────────────────────────────────────

// PresetPills now imported from GateModals.jsx

// ─── FormInternal ──────────────────────────────────────────────────────────────

// FormInternal now imported from GateForms.jsx

// ─── FormTamu ─────────────────────────────────────────────────────────────────

// FormTamu now imported from GateForms.jsx

// ─── ConfirmTimeModal ─────────────────────────────────────────────────────────

// ConfirmTimeModal now imported from GateModals.jsx

// ─── EditLogModal ─────────────────────────────────────────────────────────────

// EditLogModal now imported from GateModals.jsx

// ─── LogCard ──────────────────────────────────────────────────────────────────

// LogCard now imported from LogCard.jsx

// ─── ConfigModal ──────────────────────────────────────────────────────────────

// ConfigModal now imported from GateModals.jsx

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function GatePage() {
  const { addToast } = useToast()
  const { profile } = useAuth()
  const navigate = useNavigate()
  const { language, tNum, dir, t } = useLanguage()
  const tp = (key) => PAGE_T[language]?.[key] || PAGE_T["id"]?.[key] || key

  const VISITOR_TYPES = useMemo(() => getVisitorTypes(language), [language])
  const TYPE_META = useMemo(() => Object.fromEntries(VISITOR_TYPES.map(t => [t.key, t])), [VISITOR_TYPES])

  const ALLOWED_ROLES = ['admin', 'satpam', 'developer']
  const isAllowed = profile ? ALLOWED_ROLES.includes(profile.role?.toLowerCase()) : null

  // ── UI-only state ───────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('input')
  const [inputMode, setInputMode] = useState('internal')
  const [rekapMode, setRekapMode] = useState('harian')
  const todayRef = useRef(startOfDay(new Date()))
  const [rekapDate, setRekapDate] = useState(todayRef.current)
  const [filterType, setFilterType] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [searchLog, setSearchLog] = useState('')
  const [filterRekap, setFilterRekap] = useState('all')
  const [searchRekap, setSearchRekap] = useState('')
  const [rekapView, setRekapView] = useState('log')
  const [showConfig, setShowConfig] = useState(false)
  const [showPrintModal, setShowPrintModal] = useState(false)
  const [showBulkCheckoutModal, setShowBulkCheckoutModal] = useState(false)
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false)
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 1024 : false)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // ── Core hook (data, CRUD, bulk actions) ────────────────────────────────────
  const {
    teacherList, studentList, internalList,
    todayLogs, rekapData,
    loadingLogs, loadingRekap, submitting, isRefreshing, cooldown, editSaving,
    lastRefresh,
    confirmModal, setConfirmModal,
    editLog, setEditLog,
    selectedIds, setSelectedIds,
    selectionMode, setSelectionMode,
    bulkDeleteConfirm, setBulkDeleteConfirm,
    dismissedOvertime, setDismissedOvertime,
    stats, dailySummary,
    loadTodayLogs, loadRekap,
    handleRefresh,
    handleSubmit,
    handleReturn, handleCheckout, handleConfirmTime,
    handleSaveEdit, handleDeleteLog,
    handleBulkCheckout, handleBulkDelete,
    handleSelectAll, toggleSelect, clearSelection,
  } = useGateCore({ activeTab, rekapMode, rekapDate })

  // ── Keyboard Shortcuts ──────────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
        if (e.key === 'Escape') document.activeElement.blur()
        return
      }
      const key = e.key.toLowerCase()
      if (key === 'n') {
        e.preventDefault()
        setActiveTab('input')
        setTimeout(() => {
          const searchBox = document.querySelector('[data-search-trigger]')
          if (searchBox) searchBox.click()
        }, 50)
      }
      else if (key === 'l') { e.preventDefault(); setActiveTab('log') }
      else if (key === 'r') { e.preventDefault(); setActiveTab('rekap') }
      else if (key === 'i') { e.preventDefault(); setActiveTab('input') }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // ── Audit log: search & filter ──────────────────────────────────────────────
  useEffect(() => {
    if (!searchLog.trim()) return
    const t = setTimeout(() => {
      logAudit({ action: 'SEARCH', source: 'OPERATIONAL', tableName: 'gate_logs', newData: { query: searchLog, tab: 'log' } })
    }, 2000)
    return () => clearTimeout(t)
  }, [searchLog])

  useEffect(() => {
    if (!searchRekap.trim()) return
    const t = setTimeout(() => {
      logAudit({ action: 'SEARCH', source: 'OPERATIONAL', tableName: 'gate_logs', newData: { query: searchRekap, tab: 'rekap' } })
    }, 2000)
    return () => clearTimeout(t)
  }, [searchRekap])

  useEffect(() => {
    if (filterType === 'all' && filterStatus === 'all') return
    logAudit({ action: 'FILTER', source: 'OPERATIONAL', tableName: 'gate_logs', newData: { type: filterType, status: filterStatus, tab: 'log' } })
  }, [filterType, filterStatus])

  useEffect(() => {
    if (filterRekap === 'all') return
    logAudit({ action: 'FILTER', source: 'OPERATIONAL', tableName: 'gate_logs', newData: { type: filterRekap, tab: 'rekap' } })
  }, [filterRekap])

  // ── Filters ────────────────────────────────────────────────────────────────

  const filteredLogs = useMemo(() => {
    let list = filterType === 'all' ? todayLogs : todayLogs.filter(l => l.visitor_type === filterType)
    if (filterStatus === 'aktif') list = list.filter(l => !l.check_out)
    if (filterStatus === 'selesai') list = list.filter(l => !!l.check_out)
    if (searchLog.trim()) {
      const q = searchLog.toLowerCase()
      list = list.filter(l => l.visitor_name.toLowerCase().includes(q) || (l.purpose || '').toLowerCase().includes(q))
    }
    return list
  }, [todayLogs, filterType, filterStatus, searchLog])

  const allSelected = useMemo(() => {
    return filteredLogs.length > 0 && filteredLogs.every(log => selectedIds.includes(log.id))
  }, [filteredLogs, selectedIds])

  const someSelected = useMemo(() => {
    return selectedIds.length > 0 && !allSelected
  }, [selectedIds, allSelected])

  const MultiSelectIcon = useMemo(() => {
    if (!selectionMode) return Square
    if (allSelected) return CheckSquare
    if (someSelected) return MinusSquare
    return Square
  }, [selectionMode, allSelected, someSelected])

  const handleCheckboxAllClick = useCallback(() => {
    if (filteredLogs.length === 0) return
    const allIds = filteredLogs.map(l => l.id)
    if (!selectionMode) {
      setSelectionMode(true)
      setSelectedIds(allIds)
    } else {
      if (allSelected) {
        setSelectionMode(false)
        setSelectedIds([])
      } else {
        setSelectedIds(allIds)
      }
    }
  }, [selectionMode, allSelected, filteredLogs, setSelectedIds, setSelectionMode])

  // ── Print HTML builders → now in src/utils/gate/gateUtils.js ────────────

  // ── Rekap nav & labels ────────────────────────────────────────────────────

  const navRekap = dir => {
    if (rekapMode === 'harian') setRekapDate(prev => addDays(prev, dir))
    else if (rekapMode === 'mingguan') setRekapDate(prev => addDays(prev, dir * 7))
    else {
      // bulanan: geser 1 bulan
      setRekapDate(prev => {
        const d = new Date(prev)
        d.setMonth(d.getMonth() + dir)
        return d
      })
    }
  }
  const rekapLabel = useMemo(() => {
    if (rekapMode === 'harian') return fmtDate(rekapDate, language)
    const d = new Date(rekapDate)
    const locale = language === 'en' ? 'en-US' : language === 'ar' ? 'ar-EG' : 'id-ID'
    if (rekapMode === 'bulanan') {
      return d.toLocaleDateString(locale, { month: 'long', year: 'numeric' })
    }
    // mingguan
    const day = d.getDay()
    const mon = addDays(d, -(day === 0 ? 6 : day - 1)), sun = addDays(mon, 6)
    const monthLabel = sun.toLocaleDateString(locale, { month: 'long' })
    if (language === 'ar') {
      return `من ${mon.getDate()} إلى ${sun.getDate()} ${monthLabel} ${sun.getFullYear()}`
    }
    if (language === 'en') {
      return `${monthLabel} ${mon.getDate()} – ${sun.getDate()}, ${sun.getFullYear()}`
    }
    return `${mon.getDate()} – ${sun.getDate()} ${monthLabel} ${sun.getFullYear()}`
  }, [rekapMode, rekapDate, language])
  const rekapSummary = useMemo(() => ({
    total: rekapData.length,
    guru: rekapData.filter(l => l.visitor_type === 'guru').length,
    karyawan: rekapData.filter(l => l.visitor_type === 'karyawan').length,
    // FIX Missing #1: tambahkan hitungan santri
    santri: rekapData.filter(l => l.visitor_type === 'santri').length,
    tamu: rekapData.filter(l => l.visitor_type === 'tamu').length,
  }), [rekapData])

  const filteredRekapData = useMemo(() => {
    let list = filterRekap === 'all' ? rekapData : rekapData.filter(l => l.visitor_type === filterRekap)
    if (searchRekap.trim()) {
      const q = searchRekap.toLowerCase()
      list = list.filter(l => l.visitor_name.toLowerCase().includes(q) || (l.purpose || '').toLowerCase().includes(q))
    }
    return list
  }, [rekapData, filterRekap, searchRekap])

  // Ringkasan per orang — extracted to pure function for reuse in export
  const rekapRingkasan = useMemo(() => {
    const map = new Map()
    const src = filterRekap === 'all' ? rekapData : rekapData.filter(l => l.visitor_type === filterRekap)
    const filtered = searchRekap.trim()
      ? src.filter(l => l.visitor_name.toLowerCase().includes(searchRekap.toLowerCase()))
      : src

    filtered.forEach(l => {
      const isInternal = l.visitor_type !== 'tamu'
      // FIX Bug #1: gunakan student_id untuk santri, teacher_id untuk guru/karyawan, fallback ke nama
      const key = l.student_id || l.teacher_id || l.visitor_name
      if (!map.has(key)) {
        map.set(key, { id: key, name: l.visitor_name, nip: l.visitor_nip || '-', type: l.visitor_type, count: 0, totalMs: 0, belumKembali: 0, purposes: [] })
      }
      const entry = map.get(key)
      entry.count++
      if (isInternal && l.check_out) {
        const ms = new Date(l.check_out) - new Date(l.check_in)
        if (ms > 0) entry.totalMs += ms
      }
      if (isInternal && !l.check_out) entry.belumKembali++
      if (l.purpose && !entry.purposes.includes(l.purpose)) entry.purposes.push(l.purpose)
    })

    return Array.from(map.values()).sort((a, b) => b.totalMs - a.totalMs)
  }, [rekapData, filterRekap, searchRekap])

  // ── Print & Export (handled by useGateImportExport) ────────────────────────
  const { handleExportCSV, executePrint } = useGateImportExport({
    language,
    activeTab,
    rekapMode,
    rekapDate,
    rekapLabel,
    rekapView,
    rekapRingkasan,
    filteredRekapData,
    todayLogs,
    filteredLogs,
    selectedIds,
    TYPE_META,
    addToast,
    t,
    tNum,
    tp
  })

  const handlePrint = useCallback(() => {
    setShowPrintModal(true)
  }, [])



  const TABS = [
    { key: 'input', label: tp('tabInput'), icon: Plus },
    { key: 'log', label: tp('tabLogHariIni'), icon: Calendar },
    { key: 'rekap', label: tp('tabRekap'), icon: CalendarDays },
  ]

  // ── Guards ─────────────────────────────────────────────────────────────────

  if (isAllowed === null) return (
    <DashboardLayout>
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin w-8 h-8 text-[var(--color-primary)]" />
      </div>
    </DashboardLayout>
  )
  if (!isAllowed) {
    const accessDeniedTitle = language === 'en' ? 'Access Denied' : language === 'ar' ? 'تم رفض الوصول' : 'Akses Ditolak'
    const accessDeniedDesc = language === 'en' ? 'This page can only be accessed by Admin and Security Staff.' : language === 'ar' ? 'يمكن فقط للمسؤولين ورجال الأمن الوصول إلى هذه الصفحة.' : 'Halaman ini hanya dapat diakses oleh Admin dan Satpam.'
    const accessDeniedBack = language === 'en' ? 'Go Back' : language === 'ar' ? 'العودة' : 'Kembali'
    return (
      <DashboardLayout>
        <div className="p-4 md:p-6 flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center">
            <Lock className="w-8 h-8 text-red-500" />
          </div>
          <div>
            <h2 className="text-xl font-black text-[var(--color-text)] mb-1">{accessDeniedTitle}</h2>
            <p className="text-[12px] text-[var(--color-text-muted)] max-w-xs">{accessDeniedDesc}</p>
          </div>
          <button onClick={() => navigate(-1)} className="h-9 px-5 rounded-xl bg-[var(--color-primary)] text-white text-[11px] font-black hover:opacity-90 transition-all">{accessDeniedBack}</button>
        </div>
      </DashboardLayout>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 max-w-[1800px] mx-auto">

        {/* PAGE HEADER */}
        <PageHeader
          badge="boarding"
          breadcrumbs={['Gate Monitor']}
          title={tp('title')}
          subtitle={tp('subtitle')}
          actions={
            <div className="flex items-center gap-3">
              <LiveClock />
              <div className="flex items-center gap-2">
                <button onClick={() => navigate('/boarding/gate/kiosk')}
                  className="h-9 px-3 rounded-lg border flex items-center justify-center text-xs font-black uppercase tracking-wider transition-all active:scale-95 bg-[var(--color-primary)] text-white hover:opacity-95 gap-1.5 shadow-sm"
                  title="Buka Mode Kios Mandiri (Self-Service)">
                  <Monitor className="w-3.5 h-3.5" />
                </button>
                <button onClick={handleRefresh} disabled={isRefreshing || cooldown}
                  className="h-9 w-10 rounded-lg border flex items-center justify-center text-sm transition-all bg-[var(--color-surface-alt)] border-[var(--color-border)] text-[var(--color-text-muted)] enabled:hover:text-[var(--color-text)] enabled:hover:bg-[var(--color-border)] enabled:active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                  title={tp('btnRefresh')}>
                  <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                </button>
                <button onClick={() => setShowConfig(true)}
                  className="h-9 w-9 rounded-lg border flex items-center justify-center text-sm transition-all active:scale-95 bg-[var(--color-surface-alt)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-border)]"
                  title={tp('btnConfig')}>
                  <Settings className="w-4 h-4" />
                </button>
              </div>
            </div>
          }
        />

        {/* STATS */}
        <StatsCarousel count={4} className="mb-4">
          {[
            { key: 'total',     label: tp('totalToday'),      value: stats.total,     icon: ClipboardList, color: 'indigo' },
            { key: 'keluar',    label: tp('siswaGuruKeluar'), value: stats.keluar,    icon: LogOut,        color: 'rose'   },
            { key: 'dalamTamu', label: tp('tamuDiDalam'),     value: stats.dalamTamu, icon: Building2,     color: 'emerald'},
            { key: 'tamu',      label: tp('kunjunganTamu'),   value: stats.tamu,      icon: Users,         color: 'amber'  },
          ].map((s, i) => (
            <StatCard
              key={i}
              icon={s.icon}
              label={s.label}
              value={s.value}
              color={s.color}
              loading={loadingLogs}
              className="min-w-[200px]"
            />
          ))}
        </StatsCarousel>

        {/* TABS — full width on mobile, auto on desktop */}
        <div className="flex gap-1 p-1 rounded-2xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] mb-6 w-full lg:w-fit overflow-x-auto scrollbar-hide">
          {TABS.map(t => {
            const IconComp = t.icon
            return (
              <button key={t.key} onClick={() => setActiveTab(t.key)}
                className={`flex-1 lg:flex-none h-8 px-3 sm:px-4 rounded-xl text-[11px] font-black flex items-center justify-center gap-2 transition-all whitespace-nowrap ${activeTab === t.key
                  ? 'bg-[var(--color-primary)] text-white shadow-md shadow-[var(--color-primary)]/20'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}>
                <IconComp className="w-3.5 h-3.5" />{t.label}
                {t.key === 'log' && todayLogs.length > 0 && (
                  <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full ${activeTab === t.key ? 'bg-white/20 text-white' : 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'}`}>
                    {tNum(todayLogs.length)}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* ── TAB: INPUT ── */}
        {activeTab === 'input' && (
          <div className="grid lg:grid-cols-2 gap-6 items-start animate-in fade-in duration-200">
            {/* Kolom kiri: Form */}
            <div className="glass rounded-[1.5rem] p-5 h-fit">
              {/* Mode switcher Internal / Tamu */}
              <div className="flex gap-2 mb-5">
                {[
                  { k: 'internal', l: tp('internalLabel'), icon: Building2, desc: tp('internalDesc'), active: 'border-[var(--color-primary)]/30 bg-[var(--color-primary)]/5', activeText: 'text-[var(--color-primary)]' },
                  { k: 'tamu', l: tp('tamuLabel'), icon: Users, desc: tp('tamuDesc'), active: 'border-emerald-500/30 bg-emerald-500/5', activeText: 'text-emerald-600' },
                ].map(m => {
                  const IconComp = m.icon
                  return (
                    <button key={m.k} onClick={() => setInputMode(m.k)}
                      className={`flex-1 py-2.5 px-3 rounded-xl border transition-all text-left ${inputMode === m.k ? m.active : 'border-[var(--color-border)] bg-[var(--color-surface-alt)] hover:bg-[var(--color-surface)]'}`}>
                      <div className={`flex items-center gap-1.5 font-black text-[11px] sm:text-[12px] ${inputMode === m.k ? m.activeText : 'text-[var(--color-text-muted)]'}`}>
                        <IconComp className="w-3.5 h-3.5 shrink-0" /><span className="truncate">{m.l}</span>
                      </div>
                      <p className="text-[8px] sm:text-[9px] text-[var(--color-text-muted)] mt-0.5 font-medium line-clamp-1">{m.desc}</p>
                    </button>
                  )
                })}
              </div>

              {/* Form content — flex-1 agar mendorong tombol submit ke bawah */}
              <div className="flex-1">
                {inputMode === 'internal'
                  ? <FormInternal internalList={internalList} onSubmit={handleSubmit} loading={submitting} />
                  : <FormTamu onSubmit={handleSubmit} loading={submitting} />
                }
              </div>

              {/* Cara Penggunaan / Guide moved back to Left Column below search/form */}
              <div className="mt-4 pt-4 border-t border-[var(--color-border)]/40">
                <QuickGuide mode={inputMode} />
              </div>
            </div>

            {/* Kolom kanan: Status — Mengikuti konten agar tidak terlalu ditarik ke bawah */}
            <div className="flex flex-col gap-4">

              {/* Sedang Keluar */}
              <div className="glass rounded-[1.5rem] p-5">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <p className="text-[13px] font-black text-[var(--color-text)]">{tp('sedangKeluarTitle')}</p>
                    <p className="text-[10px] text-[var(--color-text-muted)] opacity-70 mt-0.5">{tp('sedangKeluarSub')}</p>
                  </div>
                  <div className={`px-2 py-1 rounded-lg text-[9px] font-black tabular-nums transition-all ${stats.keluar > 0 ? 'bg-rose-500/10 text-rose-600 shadow-sm' : 'bg-[var(--color-surface-alt)] text-[var(--color-text-muted)]/50'}`}>
                    {tNum(stats.keluar)} {language === 'en' ? 'PEOPLE' : language === 'ar' ? 'أشخاص' : 'ORANG'}
                  </div>
                </div>

                {/* Bulk Selection Toolbar */}
                {stats.keluar > 0 && (
                  <div className="flex items-center justify-between mb-3 px-1">
                    <button onClick={() => { setSelectionMode(!selectionMode); setSelectedIds([]) }}
                      className={`text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-md transition-all ${selectionMode ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}>
                      {selectionMode ? tp('btnCancelSelect') : tp('btnMultiSelect')}
                    </button>
                  </div>
                )}

                {loadingLogs
                  ? <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-16 rounded-xl bg-[var(--color-surface-alt)] animate-pulse" />)}</div>
                  : todayLogs.filter(l => (l.visitor_type !== 'tamu') && !l.check_out).length === 0
                    ? <EmptyState
                      variant="plain"
                      color="emerald"
                      icon={Check}
                      title={tp('emptyHadirTitle')}
                      description={tp('emptyHadirDesc')}
                    />
                    : <div className="space-y-2">
                      {todayLogs.filter(l => (l.visitor_type !== 'tamu') && !l.check_out).map(log => (
                        <LogCard key={log.id} log={log} onReturn={handleReturn} onCheckout={handleCheckout} onEdit={setEditLog}
                          selectionMode={selectionMode} onToggleSelect={toggleSelect} isSelected={selectedIds.includes(log.id)} />
                      ))}
                    </div>
                }
              </div>

              {/* Tamu di Dalam */}
              <div className="glass rounded-[1.5rem] p-5">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <p className="text-[13px] font-black text-[var(--color-text)]">{tp('tamuDiDalamTitle')}</p>
                    <p className="text-[10px] text-[var(--color-text-muted)] opacity-70 mt-0.5">{tp('tamuDiDalamSub')}</p>
                  </div>
                  <div className={`px-2 py-1 rounded-lg text-[9px] font-black tabular-nums transition-all ${stats.dalamTamu > 0 ? 'bg-emerald-500/10 text-emerald-600 shadow-sm' : 'bg-[var(--color-surface-alt)] text-[var(--color-text-muted)]/50'}`}>
                    {tNum(stats.dalamTamu)} {language === 'en' ? 'PEOPLE' : language === 'ar' ? 'أشخاص' : 'ORANG'}
                  </div>
                </div>
                {loadingLogs
                  ? <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-16 rounded-xl bg-[var(--color-surface-alt)] animate-pulse" />)}</div>
                  : todayLogs.filter(l => l.visitor_type === 'tamu' && !l.check_out).length === 0
                    ? <EmptyState
                      variant="plain"
                      color="slate"
                      icon={Users}
                      title={tp('emptyTamuTitle')}
                      description={tp('emptyTamuDesc')}
                    />
                    : <div className="space-y-2">
                      {todayLogs.filter(l => l.visitor_type === 'tamu' && !l.check_out).map(log => (
                        // FIX UX #2: tambahkan selectionMode support ke panel Tamu di Dalam
                        <LogCard key={log.id} log={log} onReturn={handleReturn} onCheckout={handleCheckout} onEdit={setEditLog}
                          selectionMode={selectionMode} onToggleSelect={toggleSelect} isSelected={selectedIds.includes(log.id)} />
                      ))}
                    </div>
                }
              </div>
            </div>
          </div>
        )}

        {/* ── TAB: LOG HARI INI ── */}
        {activeTab === 'log' && (
          <div className="glass rounded-[1.5rem] overflow-hidden animate-in fade-in duration-200">
            <GateFilterBar
              searchLog={searchLog}
              setSearchLog={setSearchLog}
              filterType={filterType}
              setFilterType={setFilterType}
              filterStatus={filterStatus}
              setFilterStatus={setFilterStatus}
              selectionMode={selectionMode}
              handleCheckboxAllClick={handleCheckboxAllClick}
              handleExportCSV={handleExportCSV}
              handlePrint={handlePrint}
              filteredLogs={filteredLogs}
              todayLogs={todayLogs}
              language={language}
              tp={tp}
              tNum={tNum}
              VISITOR_TYPES={VISITOR_TYPES}
              TYPE_META={TYPE_META}
            />

            <div className="p-4">
              {loadingLogs ? (
                <div className="space-y-3">
                  <CardSkeleton />
                  <CardSkeleton />
                  <CardSkeleton />
                </div>
              ) : filteredLogs.length === 0 ? (
                <EmptyState
                  variant="plain"
                  color="slate"
                  icon={ClipboardList}
                  title={todayLogs.length === 0 ? (language === 'en' ? 'No Data Yet' : language === 'ar' ? 'لا توجد بيانات بعد' : 'Belum Ada Data') : (language === 'en' ? 'Empty Search' : language === 'ar' ? 'البحث فارغ' : 'Pencarian Kosong')}
                  description={todayLogs.length === 0 ? (language === 'en' ? 'No activities recorded for today.' : language === 'ar' ? 'لم يتم تسجيل أي أنشطة لهذا اليوم.' : 'Tidak ada aktivitas tercatat untuk hari ini.') : (language === 'en' ? 'No results matched your search or filters.' : language === 'ar' ? 'لم تتطابق أي نتائج مع الفلاتر أو البحث.' : 'Tidak ada hasil yang cocok dengan filter atau pencarian Anda.')}
                  action={(filterType !== 'all' || filterStatus !== 'all' || searchLog) && (
                    <button onClick={() => { setFilterType('all'); setFilterStatus('all'); setSearchLog('') }}
                      className="h-8 px-4 rounded-xl border border-[var(--color-border)] text-[10px] font-black text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-all">
                      {language === 'en' ? 'Reset Filters' : language === 'ar' ? 'إعادة ضبط الفلاتر' : 'Reset Filter'}
                    </button>
                  )}
                />
              ) : (
                <>
                  {/* ── Mobile: Compact rows ── */}
                  <div className="sm:hidden divide-y divide-[var(--color-border)]">
                    {filteredLogs.map(log => {
                      const meta = (() => {
                        const visitorTypes = getVisitorTypes(language)
                        return Object.fromEntries(visitorTypes.map(t => [t.key, t]))
                      })()[log.visitor_type] || { label: log.visitor_type, bg: 'bg-slate-100', color: 'text-slate-600', icon: Users }
                      const isActive = !log.check_out
                      const isInternal = log.visitor_type !== 'tamu'
                      const dur = durasi(log.check_in, log.check_out, language)
                      const etaPassed = isActive && log.estimated_return && new Date(log.estimated_return) < new Date()
                      const overTime = isInternal && isActive && (Date.now() - new Date(log.check_in).getTime()) > 2 * 60 * 60 * 1000
                      const IconComp = meta.icon
                      return (
                        <div key={log.id}
                          className={`flex items-center gap-2.5 px-3 py-2.5 transition-colors ${selectedIds.includes(log.id) ? 'bg-[var(--color-primary)]/5' : ''} ${etaPassed ? 'bg-red-500/5' : overTime ? 'bg-amber-500/5' : ''}`}
                          onClick={selectionMode ? () => toggleSelect(log.id) : undefined}>
                          {selectionMode && (
                            <input type="checkbox" checked={selectedIds.includes(log.id)}
                              onChange={() => toggleSelect(log.id)}
                              className="w-4 h-4 rounded border-2 border-[var(--color-border)] text-[var(--color-primary)] shrink-0 cursor-pointer" />
                          )}
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${meta.bg}`}>
                            <IconComp className={`w-3.5 h-3.5 ${meta.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="text-[12px] font-black text-[var(--color-text)] truncate">{log.visitor_name}</span>
                              <span className={`text-[8.5px] font-black px-1.5 py-0.5 rounded shrink-0 ${meta.bg} ${meta.color}`}>{meta.label}</span>
                              {isActive && <span className={`text-[8px] font-black px-1 py-0.5 rounded shrink-0 ${isInternal ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                                {isInternal ? '● Keluar' : '● Masuk'}
                              </span>}
                              {etaPassed && <span className="text-[8px] font-black px-1 py-0.5 rounded shrink-0 bg-red-600 text-white">Lewat ETA</span>}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] text-[var(--color-text-muted)] font-medium truncate">{translatePurpose(log.purpose, language)}</span>
                              <span className="text-[9px] text-[var(--color-text-muted)] shrink-0 opacity-70">{fmtTime(log.check_in, language)}{dur ? ` · ${dur}` : ''}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {isActive && (
                              <button onClick={e => { e.stopPropagation(); isInternal ? onReturn(log) : onCheckout(log) }}
                                className={`h-7 w-7 rounded-lg flex items-center justify-center transition-all active:scale-95 ${isInternal ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
                                {isInternal ? <LogIn className="w-3.5 h-3.5" /> : <LogOut className="w-3.5 h-3.5" />}
                              </button>
                            )}
                            <button onClick={e => { e.stopPropagation(); setEditLog(log) }}
                              className="h-7 w-7 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] flex items-center justify-center transition-all">
                              <Edit2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* ── Desktop: Table view ── */}
                  <div className="hidden sm:block -mx-4 -mt-4 -mb-4">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-alt)]/60">
                          {selectionMode && (
                            <th className="w-10 px-3 py-1.5 text-left">
                              <input
                                type="checkbox"
                                checked={allSelected}
                                onChange={handleCheckboxAllClick}
                                className="w-4 h-4 rounded border-2 border-[var(--color-border)] text-[var(--color-primary)] cursor-pointer"
                              />
                            </th>
                          )}
                          <th className="px-4 py-1.5 text-start text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)]">
                            {language === 'en' ? 'Name' : language === 'ar' ? 'الاسم' : 'Nama'}
                          </th>
                          <th className="px-4 py-1.5 text-start text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)]">
                            {language === 'en' ? 'Purpose' : language === 'ar' ? 'الغرض' : 'Keperluan'}
                          </th>
                          <th className="px-4 py-1.5 text-start text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)]">
                            {language === 'en' ? 'In / ETA' : language === 'ar' ? 'الدخول / المتوقع' : 'Masuk / ETA'}
                          </th>
                          <th className="px-4 py-1.5 text-start text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)]">
                            {language === 'en' ? 'Duration' : language === 'ar' ? 'المدة' : 'Durasi'}
                          </th>
                          <th className="px-4 py-1.5 text-start text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)]">
                            {language === 'en' ? 'Status' : language === 'ar' ? 'الحالة' : 'Status'}
                          </th>
                          <th className="px-4 py-1.5 text-center text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)] w-24">
                            {language === 'en' ? 'Action' : language === 'ar' ? 'إجراء' : 'Aksi'}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--color-border)]">
                        {filteredLogs.map(log => (
                          <GateTableRow
                            key={log.id}
                            log={log}
                            isSelected={selectedIds.includes(log.id)}
                            selectionMode={selectionMode}
                            toggleSelect={toggleSelect}
                            setEditLog={setEditLog}
                            handleReturn={handleReturn}
                            handleCheckout={handleCheckout}
                            language={language}
                            dir={dir}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ── TAB: REKAP ── */}
        {activeTab === 'rekap' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="glass rounded-[1.5rem] overflow-hidden">
              {/* === DESKTOP TOOLBAR (1 Baris Top, 1 Baris Bottom) === */}
              <div className="hidden sm:block border-b border-[var(--color-border)]">
                {/* Baris 1: Mode + View Toggle + Date Navigation + Actions */}
                <div className="flex items-center justify-between gap-4 px-4 py-3 border-b border-[var(--color-border)]/60 bg-[var(--color-surface-alt)]/20">
                  <div className="flex items-center gap-3">
                    {/* Mode: Harian / Mingguan / Bulanan */}
                    <div className="flex gap-1 p-0.5 rounded-lg bg-[var(--color-surface-alt)] border border-[var(--color-border)] shrink-0">
                      {[{ k: 'harian', l: tp('modeHarian') }, { k: 'mingguan', l: tp('modeMingguan') }, { k: 'bulanan', l: tp('modeBulanan') }].map(m => (
                        <button key={m.k} onClick={() => setRekapMode(m.k)}
                          className={`h-7 px-3 rounded-md text-[10px] font-black transition-all whitespace-nowrap ${rekapMode === m.k ? 'bg-[var(--color-primary)] text-white shadow-sm' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}>
                          {m.l}
                        </button>
                      ))}
                    </div>

                    <div className="w-px h-4 bg-[var(--color-border)] shrink-0" />

                    {/* View: Detail Log / Ringkasan */}
                    <div className="flex gap-1 p-0.5 rounded-lg bg-[var(--color-surface-alt)] border border-[var(--color-border)] shrink-0">
                      {[{ k: 'log', l: tp('viewDetailLog') || 'Detail Log' }, { k: 'ringkasan', l: tp('viewRingkasan') || 'Ringkasan' }].map(v => (
                        <button key={v.k} onClick={() => setRekapView(v.k)}
                          className={`h-7 px-3 rounded-md text-[10px] font-black transition-all ${rekapView === v.k ? 'bg-[var(--color-surface)] shadow-sm text-[var(--color-text)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}>
                          {v.l}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Navigasi tanggal di tengah */}
                  <div className="flex items-center gap-2">
                    <button onClick={() => navRekap(-1)} className="w-7.5 h-7.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-all active:scale-95">
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[12.5px] font-black text-[var(--color-text)] min-w-[120px] text-center tracking-tight">{rekapLabel}</span>
                    <button onClick={() => navRekap(1)} className="w-7.5 h-7.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-all active:scale-95">
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Actions di kanan */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => handleExportCSV('rekap')}
                      disabled={filteredRekapData.length === 0}
                      className="h-7.5 w-7.5 rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-emerald-600 hover:border-emerald-500/30 flex items-center justify-center transition-all bg-[var(--color-surface)] disabled:opacity-40 disabled:pointer-events-none" title="Export CSV">
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={handlePrint}
                      disabled={filteredRekapData.length === 0}
                      className="h-7.5 w-7.5 rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-red-500 hover:border-red-500/30 flex items-center justify-center transition-all bg-[var(--color-surface)] disabled:opacity-40 disabled:pointer-events-none" title="Export PDF / Cetak">
                      <FileText className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={async () => {
                      const res = await sendDailySummary(rekapData)
                      if (res.success) addToast(t('toastTelegramSuccess'), 'success')
                      else addToast(t('toastErrorUnexpected') + ': ' + res.error, 'error')
                    }}
                      disabled={rekapData.length === 0}
                      className="h-7.5 px-3 rounded-lg border border-indigo-500/30 bg-indigo-500/5 text-indigo-600 hover:bg-indigo-500 hover:text-white transition-all text-[9.5px] font-black flex items-center gap-1.5 whitespace-nowrap disabled:opacity-40 disabled:pointer-events-none">
                      <Send className="w-3 h-3" />
                      <span>{tp('sendTelegram') || 'Telegram'}</span>
                    </button>
                  </div>
                </div>

                {/* Baris 2: Search + Role Filter Pills */}
                <div className="flex items-center gap-3 px-3 py-2.5 bg-[var(--color-surface)]">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--color-text-muted)] pointer-events-none" />
                    <input value={searchRekap} onChange={e => setSearchRekap(e.target.value)}
                      placeholder={tp('placeholderSearch')}
                      className="w-full h-8 pl-8 pr-7 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[12px] font-bold focus:outline-none focus:border-[var(--color-primary)] transition-all" />
                    {searchRekap && (
                      <button onClick={() => setSearchRekap('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide min-w-0 shrink-0">
                    {[{ k: 'all', l: tp('presetFilterAll') }, ...VISITOR_TYPES.map(t => ({ k: t.key, l: TYPE_META[t.key]?.label || t.label }))].map(f => {
                      const count = f.k === 'all' ? rekapSummary.total : rekapSummary[f.k] || 0
                      return (
                        <button key={f.k} onClick={() => setFilterRekap(f.k)}
                          className={`h-7 px-2.5 rounded-lg text-[9.5px] font-black flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0 ${filterRekap === f.k
                            ? 'bg-[var(--color-primary)] text-white shadow-sm'
                            : 'border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}>
                          <span>{f.l}</span>
                          <span className={`text-[8px] font-black px-1.5 py-0.5 rounded transition-all leading-none ${filterRekap === f.k
                            ? 'bg-white/20 text-white'
                            : 'bg-[var(--color-border)] text-[var(--color-text-muted)]'}`}>
                            {tNum(count)}
                          </span>
                        </button>
                      )
                    })}
                  </div>

                  <span className="text-[10px] font-bold text-[var(--color-text-muted)] ml-auto shrink-0 select-none">
                    {rekapView === 'log'
                      ? `${tNum(filteredRekapData.length)} ${language === 'en' ? 'entries' : language === 'ar' ? 'سجلات' : 'entri'}`
                      : `${tNum(rekapRingkasan.length)} ${language === 'en' ? 'people' : language === 'ar' ? 'أشخاص' : 'orang'}`}
                  </span>
                </div>
              </div>

              {/* === MOBILE TOOLBAR (4 Baris Stacked) === */}
              <div className="sm:hidden border-b border-[var(--color-border)]">
                {/* Baris 1: Date Navigation + Telegram/Export Icons */}
                <div className="flex items-center justify-between gap-3 px-3 pt-2.5 pb-2 border-b border-[var(--color-border)]/40 bg-[var(--color-surface-alt)]/10">
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => navRekap(-1)} className="w-8 h-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[11.5px] font-black text-[var(--color-text)] min-w-[95px] text-center tracking-tight">{rekapLabel}</span>
                    <button onClick={() => navRekap(1)} className="w-8 h-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => handleExportCSV('rekap')}
                      disabled={filteredRekapData.length === 0}
                      className="h-8 w-8 rounded-xl border border-[var(--color-border)] text-[var(--color-text-muted)] bg-[var(--color-surface)] flex items-center justify-center transition-all disabled:opacity-40 disabled:pointer-events-none" title="Export CSV">
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={handlePrint}
                      disabled={filteredRekapData.length === 0}
                      className="h-8 w-8 rounded-xl border border-[var(--color-border)] text-[var(--color-text-muted)] bg-[var(--color-surface)] flex items-center justify-center transition-all disabled:opacity-40 disabled:pointer-events-none" title="Export PDF">
                      <FileText className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={async () => {
                      const res = await sendDailySummary(rekapData)
                      if (res.success) addToast(t('toastTelegramSuccess'), 'success')
                      else addToast(t('toastErrorUnexpected') + ': ' + res.error, 'error')
                    }}
                      disabled={rekapData.length === 0}
                      className="h-8 w-8 rounded-xl border border-indigo-500/20 bg-indigo-500/5 text-indigo-600 flex items-center justify-center transition-all disabled:opacity-40 disabled:pointer-events-none" title="Kirim ke Telegram">
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Baris 2: Mode Toggle & View Toggle (Split Half-Half) */}
                <div className="grid grid-cols-2 gap-2 px-3 py-2 border-b border-[var(--color-border)]/40 bg-[var(--color-surface-alt)]/5">
                  {/* Mode Selector */}
                  <div className="flex gap-0.5 p-0.5 rounded-lg bg-[var(--color-surface-alt)] border border-[var(--color-border)] w-full">
                    {[{ k: 'harian', l: tp('modeHarian') }, { k: 'mingguan', l: tp('modeMingguan') }, { k: 'bulanan', l: tp('modeBulanan') }].map(m => (
                      <button key={m.k} onClick={() => setRekapMode(m.k)}
                        className={`h-6.5 flex-1 rounded-md text-[8.5px] font-black transition-all whitespace-nowrap ${rekapMode === m.k ? 'bg-[var(--color-primary)] text-white shadow-xs' : 'text-[var(--color-text-muted)]'}`}>
                        {m.l}
                      </button>
                    ))}
                  </div>

                  {/* View Toggle */}
                  <div className="flex gap-0.5 p-0.5 rounded-lg bg-[var(--color-surface-alt)] border border-[var(--color-border)] w-full">
                    {[{ k: 'log', l: tp('viewDetailLog') || 'Log' }, { k: 'ringkasan', l: tp('viewRingkasan') || 'Ringkas' }].map(v => (
                      <button key={v.k} onClick={() => setRekapView(v.k)}
                        className={`h-6.5 flex-1 rounded-md text-[8.5px] font-black transition-all ${rekapView === v.k ? 'bg-[var(--color-surface)] shadow-xs text-[var(--color-text)]' : 'text-[var(--color-text-muted)]'}`}>
                        {v.l}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Baris 3: Search Bar */}
                <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--color-border)]/40">
                  <div className="relative flex-1 min-w-0">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--color-text-muted)] pointer-events-none" />
                    <input value={searchRekap} onChange={e => setSearchRekap(e.target.value)}
                      placeholder={tp('placeholderSearch')}
                      className="w-full h-8 pl-8 pr-7 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[11px] font-bold focus:outline-none focus:border-[var(--color-primary)] transition-all" />
                    {searchRekap && (
                      <button onClick={() => setSearchRekap('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]">
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <span className="text-[9.5px] font-black text-[var(--color-text-muted)] shrink-0 select-none bg-[var(--color-surface-alt)] border border-[var(--color-border)] px-2 py-1.5 rounded-lg">
                    {rekapView === 'log'
                      ? `${tNum(filteredRekapData.length)} entri`
                      : `${tNum(rekapRingkasan.length)} orang`}
                  </span>
                </div>

                {/* Baris 4: Role filter pills (grid 5 columns) */}
                <div className="grid grid-cols-5 gap-1 px-3 py-2 bg-[var(--color-surface)]">
                  {[{ k: 'all', l: tp('presetFilterAll') }, ...VISITOR_TYPES.map(t => ({ k: t.key, l: TYPE_META[t.key]?.label || t.label }))].map(f => {
                    const count = f.k === 'all' ? rekapSummary.total : rekapSummary[f.k] || 0
                    return (
                      <button key={f.k} onClick={() => setFilterRekap(f.k)}
                        className={`h-7.5 rounded-lg text-[8.5px] font-black flex flex-col items-center justify-center transition-all ${filterRekap === f.k
                          ? 'bg-[var(--color-primary)] text-white shadow-xs'
                          : 'border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-text-muted)]'}`}>
                        <span className="leading-none scale-90">{f.l}</span>
                        <span className={`text-[7px] font-black px-1.5 mt-0.5 rounded leading-none ${filterRekap === f.k
                          ? 'bg-white/20 text-white'
                          : 'bg-[var(--color-border)] text-[var(--color-text-muted)]'}`}>
                          {tNum(count)}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* ── VIEW: DETAIL LOG ── */}
              {rekapView === 'log' && (
                <div>
                  {loadingRekap
                    ? <TableSkeleton cols={10} rows={8} />
                    : filteredRekapData.length === 0
                      ? <EmptyState
                        variant="plain"
                        color="slate"
                        icon={ClipboardList}
                        title={rekapData.length === 0 ? (language === 'en' ? 'No Data Yet' : language === 'ar' ? 'لا توجد بيانات بعد' : 'Belum Ada Data') : (language === 'en' ? 'Empty Search' : language === 'ar' ? 'البحث فارغ' : 'Pencarian Kosong')}
                        description={rekapData.length === 0 ? (language === 'en' ? 'No activities recorded for this period.' : language === 'ar' ? 'لم يتم تسجيل أي أنشطة لهذه الفترة.' : 'Tidak ada aktivitas tercatat pada periode ini.') : (language === 'en' ? 'No results matched your search or filters.' : language === 'ar' ? 'لم تتطابق أي نتائج مع الفلاتر أو البحث.' : 'Tidak ada hasil yang cocok dengan filter atau pencarian Anda.')}
                        action={(filterRekap !== 'all' || searchRekap) && (
                          <button onClick={() => { setFilterRekap('all'); setSearchRekap('') }}
                            className="h-8 px-4 rounded-xl border border-[var(--color-border)] text-[10px] font-black text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-all">
                            {language === 'en' ? 'Reset Filters' : language === 'ar' ? 'إعادة ضبط الفلاتر' : 'Reset Filter'}
                          </button>
                        )}
                      />
                      : <>
                        {/* Desktop View Table */}
                        <div className="hidden sm:block overflow-x-auto w-full max-w-full">
                          <table className="w-full min-w-[750px]">
                            <thead>
                              <tr style={{ backgroundColor: 'var(--color-surface-alt)' }}>
                                {[
                                  '#',
                                  language === 'en' ? 'Name' : language === 'ar' ? 'الاسم' : 'Nama',
                                  language === 'en' ? 'Type' : language === 'ar' ? 'النوع' : 'Jenis',
                                  language === 'en' ? 'NIP / Institution' : language === 'ar' ? 'الرقم الوظيفي / المؤسسة' : 'NIP / Instansi',
                                  language === 'en' ? 'Purpose' : language === 'ar' ? 'الغرض' : 'Keperluan',
                                  language === 'en' ? 'Out Time' : language === 'ar' ? 'وقت الخروج' : 'Jam Keluar',
                                  language === 'en' ? 'Return / Entry' : language === 'ar' ? 'العودة / الدخول' : 'Jam Kembali / Masuk',
                                  language === 'en' ? 'Exit Time (Guest)' : language === 'ar' ? 'وقت الخروج (للضيوف)' : 'Jam Keluar (Tamu)',
                                  language === 'en' ? 'Duration' : language === 'ar' ? 'المدة' : 'Durasi',
                                  language === 'en' ? 'Vehicle' : language === 'ar' ? 'المركبة' : 'Kendaraan'
                                ].map(h => (
                                  <th key={h} className="px-3 py-2.5 text-left text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] border-b border-[var(--color-border)] whitespace-nowrap">{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {filteredRekapData.map((log, i) => {
                                const meta = TYPE_META[log.visitor_type] || TYPE_META.tamu
                                const isG = log.visitor_type !== 'tamu'
                                const dur = durasi(log.check_in, log.check_out, language)
                                return (
                                  <tr key={log.id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-surface-alt)]/40 transition-colors cursor-pointer"
                                    onClick={() => setEditLog(log)}>
                                    <td className="px-3 py-2.5 text-[11px] text-[var(--color-text-muted)]">{i + 1}</td>
                                    <td className="px-3 py-2.5 text-[12px] font-black text-[var(--color-text)]">{log.visitor_name}</td>
                                    <td className="px-3 py-2.5"><span className={`text-[9px] font-black px-2 py-0.5 rounded-md ${meta.bg} ${meta.color}`}>{meta.label}</span></td>
                                    <td className="px-3 py-2.5 text-[11px] text-[var(--color-text-muted)]">{log.visitor_nip || '-'}</td>
                                    <td className="px-3 py-2.5 text-[11px] text-[var(--color-text)]">{translatePurpose(log.purpose, language)}</td>
                                    <td className="px-3 py-2.5 text-[11px] font-bold text-red-500">{isG ? fmtTime(log.check_in) : '-'}</td>
                                    <td className="px-3 py-2.5 text-[11px] font-bold text-emerald-600">{isG ? fmtTime(log.check_out) : fmtTime(log.check_in)}</td>
                                    <td className="px-3 py-2.5 text-[11px] font-bold text-red-500">{!isG ? fmtTime(log.check_out) : '-'}</td>
                                    <td className="px-3 py-2.5 text-[11px] text-[var(--color-text-muted)] font-bold">{dur || '-'}</td>
                                    <td className="px-3 py-2.5 text-[11px] text-[var(--color-text-muted)]">{log.vehicle_plate || '-'}</td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>

                        {/* Mobile View Cards */}
                        <div className="block sm:hidden flex flex-col gap-2 p-2 bg-[var(--color-surface-alt)]/20">
                          {filteredRekapData.map((log, i) => {
                            const meta = TYPE_META[log.visitor_type] || TYPE_META.tamu
                            const isG = log.visitor_type !== 'tamu'
                            const dur = durasi(log.check_in, log.check_out, language)

                            // Display appropriate times depending on guest type
                            const showExit = isG ? fmtTime(log.check_in) : fmtTime(log.check_out)
                            const showEntry = isG ? fmtTime(log.check_out) : fmtTime(log.check_in)

                            const timeLabel = isG ? showEntry : showExit
                            const IconComp = meta.icon || LogIn

                            return (
                              <div key={log.id}
                                className="p-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl flex items-center gap-3 shadow-xs">

                                {/* Left: Icon circle */}
                                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${meta.bg}`}>
                                  <IconComp className={`w-4 h-4 ${meta.color}`} />
                                </div>

                                {/* Middle: Text and details */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <h4 className="text-[12.5px] font-bold text-[var(--color-text)] truncate leading-none">
                                      {log.visitor_name}
                                    </h4>
                                    <span className={`text-[8.5px] font-bold px-1.5 py-0.5 rounded ${meta.bg} ${meta.color} leading-none`}>
                                      {meta.label}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-[var(--color-text-muted)] mt-1.5 leading-tight truncate">
                                    <span className="font-semibold text-[var(--color-text)]">{translatePurpose(log.purpose, language)}</span>
                                    <span className="mx-1.5 opacity-60">·</span>
                                    <span className="font-medium tabular-nums">{timeLabel}</span>
                                    {dur && (
                                      <>
                                        <span className="mx-1.5 opacity-60">·</span>
                                        <span className="font-semibold text-[var(--color-text)] tabular-nums">{dur}</span>
                                      </>
                                    )}
                                  </p>
                                </div>

                                {/* Right: Circle Edit Button */}
                                <button onClick={() => setEditLog(log)}
                                  className="h-8 w-8 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)]/30 flex items-center justify-center transition-colors shrink-0">
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )
                          })}
                        </div>
                      </>
                  }
                </div>
              )}

              {/* ── VIEW: RINGKASAN PER ORANG ── */}
              {rekapView === 'ringkasan' && (
                <div>
                  {loadingRekap
                    ? <TableSkeleton cols={8} rows={8} />
                    : rekapRingkasan.length === 0
                      ? <EmptyState
                        variant="plain"
                        color="slate"
                        icon={Users}
                        title={language === 'en' ? 'Empty Data' : language === 'ar' ? 'بيانات فارغة' : 'Data Kosong'}
                        description={language === 'en' ? 'No summary recorded for this period.' : language === 'ar' ? 'لم يتم تسجيل أي ملخص لهذه الفترة.' : `Belum ada ringkasan orang yang tercatat untuk periode ${rekapLabel}.`}
                      />
                      : <>
                        {/* Desktop View Table */}
                        <div className="hidden sm:block overflow-x-auto w-full max-w-full">
                          <table className="w-full min-w-[600px]">
                            <thead>
                              <tr style={{ backgroundColor: 'var(--color-surface-alt)' }}>
                                {['#', 'Nama', 'Jenis', 'Jml Keluar', 'Total Durasi Keluar', 'Rata-rata', 'Belum Kembali', 'Keperluan'].map(h => (
                                  <th key={h} className="px-3 py-2.5 text-left text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] border-b border-[var(--color-border)] whitespace-nowrap">{h}</th>
                                ))}
                                <th className="px-3 py-2.5 border-b border-[var(--color-border)]">
                                  <span className="text-[8px] text-[var(--color-text-muted)]/50 font-bold normal-case tracking-normal">klik baris → detail log</span>
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {rekapRingkasan.map((r, i) => {
                                const meta = TYPE_META[r.type] || TYPE_META.tamu
                                const isInternal = r.type !== 'tamu'
                                const totalH = Math.floor(r.totalMs / 3600000)
                                const totalM = Math.floor((r.totalMs % 3600000) / 60000)
                                const totalStr = r.totalMs > 0 ? (totalH > 0 ? `${totalH}j ${totalM}m` : `${totalM}m`) : '-'
                                const completedCount = r.count - r.belumKembali
                                const avgMs = completedCount > 0 ? r.totalMs / completedCount : 0
                                const avgH = Math.floor(avgMs / 3600000)
                                const avgM = Math.floor((avgMs % 3600000) / 60000)
                                const avgStr = avgMs > 0 ? (avgH > 0 ? `${avgH}j ${avgM}m` : `${avgM}m`) : '-'
                                const maxMs = rekapRingkasan[0]?.totalMs || 1
                                const barPct = maxMs > 0 ? Math.round((r.totalMs / maxMs) * 100) : 0
                                return (
                                  <tr key={r.id}
                                    onClick={() => { setRekapView('log'); setSearchRekap(r.name) }}
                                    className="border-b border-[var(--color-border)] hover:bg-[var(--color-surface-alt)]/60 transition-colors cursor-pointer group"
                                    title={`Klik untuk lihat detail log ${r.name}`}>
                                    <td className="px-3 py-3 text-[11px] text-[var(--color-text-muted)]">{i + 1}</td>
                                    <td className="px-3 py-3">
                                      <p className="text-[12px] font-black text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition-colors">{r.name}</p>
                                      {r.nip !== '-' && <p className="text-[9px] text-[var(--color-text-muted)]">{r.nip}</p>}
                                    </td>
                                    <td className="px-3 py-3">
                                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-md ${meta.bg} ${meta.color}`}>{meta.label}</span>
                                    </td>
                                    <td className="px-3 py-3 text-[13px] font-black text-[var(--color-text)] tabular-nums">{r.count}×</td>
                                    <td className="px-3 py-3">
                                      {isInternal ? (
                                        <div className="flex items-center gap-2">
                                          <span className={`text-[12px] font-black tabular-nums ${r.totalMs > 0 ? 'text-red-500' : 'text-[var(--color-text-muted)]'}`}>{totalStr}</span>
                                          {barPct > 0 && (
                                            <div className="flex-1 max-w-[60px] h-1.5 rounded-full bg-[var(--color-surface-alt)]">
                                              <div className="h-1.5 rounded-full bg-red-400" style={{ width: `${barPct}%` }} />
                                            </div>
                                          )}
                                        </div>
                                      ) : <span className="text-[11px] text-[var(--color-text-muted)]">-</span>}
                                    </td>
                                    <td className="px-3 py-3 text-[11px] font-bold text-[var(--color-text-muted)] tabular-nums">{isInternal ? avgStr : '-'}</td>
                                    <td className="px-3 py-3">
                                      {r.belumKembali > 0
                                        ? <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-600">{r.belumKembali}×</span>
                                        : <span className="text-[10px] text-[var(--color-text-muted)] opacity-40">-</span>}
                                    </td>
                                    <td className="px-3 py-3 text-[10px] text-[var(--color-text-muted)] max-w-[180px]">
                                      <p className="truncate">{r.purposes.slice(0, 3).map(p => translatePurpose(p, language)).join(', ')}{r.purposes.length > 3 ? ` +${r.purposes.length - 3}` : ''}</p>
                                    </td>
                                    <td className="px-3 py-3">
                                      <span className="text-[9px] text-[var(--color-primary)]/50 font-black opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Detail →</span>
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>

                        {/* Mobile View Cards */}
                        <div className="block sm:hidden flex flex-col gap-2 p-2 bg-[var(--color-surface-alt)]/20">
                          {rekapRingkasan.map((r, i) => {
                            const meta = TYPE_META[r.type] || TYPE_META.tamu
                            const isInternal = r.type !== 'tamu'
                            const totalH = Math.floor(r.totalMs / 3600000)
                            const totalM = Math.floor((r.totalMs % 3600000) / 60000)
                            const totalStr = r.totalMs > 0 ? (totalH > 0 ? `${totalH}j ${totalM}m` : `${totalM}m`) : '-'
                            const completedCount = r.count - r.belumKembali
                            const avgMs = completedCount > 0 ? r.totalMs / completedCount : 0
                            const avgH = Math.floor(avgMs / 3600000)
                            const avgM = Math.floor((avgMs % 3600000) / 60000)
                            const avgStr = avgMs > 0 ? (avgH > 0 ? `${avgH}j ${avgM}m` : `${avgM}m`) : '-'
                            const IconComp = meta.icon || Users

                            return (
                              <div key={i}
                                className="p-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl flex items-center gap-3 shadow-xs">

                                {/* Left: Icon circle */}
                                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${meta.bg}`}>
                                  <IconComp className={`w-4 h-4 ${meta.color}`} />
                                </div>

                                {/* Middle: Text and details */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <h4 className="text-[12.5px] font-bold text-[var(--color-text)] truncate leading-none">
                                      {r.name}
                                    </h4>
                                    <span className={`text-[8.5px] font-bold px-1.5 py-0.5 rounded ${meta.bg} ${meta.color} leading-none`}>
                                      {meta.label}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-[var(--color-text-muted)] mt-1.5 leading-tight truncate font-medium">
                                    <span>Keluar: <span className="font-bold text-[var(--color-text)]">{r.count}×</span></span>
                                    {isInternal && (
                                      <>
                                        <span className="mx-1.5 opacity-60">·</span>
                                        <span>Avg: <span className="font-bold text-[var(--color-text)] tabular-nums">{avgStr}</span></span>
                                      </>
                                    )}
                                    {r.belumKembali > 0 && (
                                      <>
                                        <span className="mx-1.5 opacity-60">·</span>
                                        <span className="font-bold text-amber-600 bg-amber-500/10 px-1 py-0.2 rounded text-[9px] uppercase">
                                          {r.belumKembali}× Aktif
                                        </span>
                                      </>
                                    )}
                                  </p>
                                </div>

                                {/* Right: Circle Navigation Button */}
                                <button onClick={() => { setRekapView('log'); setSearchRekap(r.name) }}
                                  className="h-8 w-8 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)]/30 flex items-center justify-center transition-colors shrink-0">
                                  <ChevronRight className="w-4 h-4" />
                                </button>
                              </div>
                            )
                          })}
                        </div>
                      </>
                  }
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* Overtime alert banner */}
      {dailySummary.overTimeList.length > 0 && !dismissedOvertime && (
        <div className={`fixed bottom-24 sm:bottom-6 z-[100] w-auto max-w-[calc(100vw-2rem)] sm:w-72 bg-red-600/95 backdrop-blur-md rounded-2xl shadow-2xl p-4 border border-red-400/20 animate-in duration-500 ${dir === 'rtl'
          ? 'left-4 sm:left-6 right-auto slide-in-from-left-8'
          : 'right-4 sm:right-6 left-auto slide-in-from-right-8'
          }`}>
          <div className="flex items-center gap-2 mb-3">
            <Bell className="text-white animate-bounce w-4 h-4" />
            <p className="text-[12px] font-black text-white">{tp('alertTitle')}</p>
            <span className="ms-auto text-[10px] font-black bg-white/20 text-white px-2 py-0.5 rounded-full">{dailySummary.overTimeList.length}</span>
            <button
              onClick={() => setDismissedOvertime(true)}
              className="w-6 h-6 flex items-center justify-center rounded-lg bg-white/20 hover:bg-white/30 text-white transition-all shrink-0"
              title="Tutup notifikasi">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-2">
            {dailySummary.overTimeList.map(l => {
              const mnt = Math.round((Date.now() - new Date(l.check_in).getTime()) / 60000)
              const h = Math.floor(mnt / 60), m = mnt % 60
              const labelTime = h > 0
                ? (language === 'en' ? `${h}h ${m}m` : language === 'ar' ? `${h}س ${m}د` : `${h}j ${m}m`)
                : (language === 'en' ? `${m}m` : language === 'ar' ? `${m}د` : `${m}m`)
              return (
                <div key={l.id} className="flex items-center justify-between gap-2 bg-white/15 rounded-xl px-3 py-2">
                  <p className="text-[11px] font-black text-white truncate">{l.visitor_name}</p>
                  <span className="text-[10px] font-black text-white/80 shrink-0 tabular-nums">{labelTime}</span>
                </div>
              )
            })}
          </div>
          <p className="text-[9px] text-white/60 font-bold text-center mt-3">{tp('alertDismiss')}</p>
        </div>
      )}

      {/* Modals */}
      {confirmModal && (
        <ConfirmTimeModal
          log={confirmModal.log}
          action={confirmModal.action}
          onConfirm={handleConfirmTime}
          onCancel={() => setConfirmModal(null)}
        />
      )}
      {editLog && (
        <EditLogModal
          log={editLog}
          onSave={handleSaveEdit}
          onDelete={handleDeleteLog}
          onCancel={() => setEditLog(null)}
          saving={editSaving}
        />
      )}
      {showConfig && (
        <ConfigModal
          onSave={() => { setShowConfig(false); addToast(t('toastWebhookSaved'), 'success') }}
          onCancel={() => setShowConfig(false)}
          testNotification={async () => {
            const res = await sendLogNotification({ visitor_name: 'Developer', purpose: 'Uji Coba Sistem', visitor_type: 'developer' }, 'OUT')
            if (res?.success) addToast(t('toastTestMsgSent'), 'success')
            else addToast(t('toastErrorUnexpected') + ': ' + (res?.error || 'Unknown error'), 'error')
            return res?.success
          }}
        />
      )}
      {showPrintModal && (
        <PrintOptionsModal
          isOpen={showPrintModal}
          onClose={() => setShowPrintModal(false)}
          activeTab={activeTab}
          rekapView={rekapView}
          selectedCount={selectedIds.length}
          onConfirm={executePrint}
        />
      )}

      {showBulkCheckoutModal && (
        <BulkCheckoutModal
          logs={todayLogs.filter(l => selectedIds.includes(l.id))}
          onConfirm={(reason) => { setShowBulkCheckoutModal(false); handleBulkCheckout(reason) }}
          onCancel={() => setShowBulkCheckoutModal(false)}
        />
      )}
      {showBulkDeleteModal && (
        <BulkDeleteModal
          logs={todayLogs.filter(l => selectedIds.includes(l.id))}
          onConfirm={() => { setShowBulkDeleteModal(false); handleBulkDelete() }}
          onCancel={() => setShowBulkDeleteModal(false)}
        />
      )}

      <BulkActionsBar
        selectedCount={selectedIds.length}
        onClear={() => { setSelectedIds([]); setSelectionMode(false); setBulkDeleteConfirm(false) }}
        title={tp('bulkTitle') || 'Entri Terpilih'}
        subtitle={tp('bulkAction') || 'Aksi Massal'}
      >
        <button
          onClick={() => setShowBulkCheckoutModal(true)}
          disabled={submitting}
          className="h-10 sm:h-9 px-3 sm:px-4 rounded-xl bg-indigo-500 text-white hover:bg-indigo-600 transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest whitespace-nowrap shadow-lg shadow-indigo-500/20 disabled:opacity-50 justify-center"
        >
          {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
          <span className="hidden xs:inline">{tp('bulkCheckout') || 'Check-out Massal'}</span>
          <span className="xs:hidden">{language === 'ar' ? 'خروج جماعي' : 'Check-out'}</span>
        </button>

        <button
          onClick={() => setShowBulkDeleteModal(true)}
          disabled={submitting}
          className="h-10 sm:h-9 px-3 sm:px-4 rounded-xl transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest disabled:opacity-50 justify-center bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500 hover:text-white"
          title={tp('bulkDelete') || 'Hapus'}
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span className="inline">{tp('bulkDelete') || 'Hapus'}</span>
        </button>
      </BulkActionsBar>
    </DashboardLayout>
  )
}