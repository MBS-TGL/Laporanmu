import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { supabase } from '@lib/supabase'
import { logAudit } from '@utils/auditLogger'
import { useToast } from '@context/Toast'
import { useAuth } from '@context/Auth'
import { useLanguage } from '@context/Language'

// ─── Pure utils (no React deps, safe to import anywhere) ─────────────────────

export function fmtDate(d, lang = 'id') {
  const x = new Date(d)
  const locales = { id: 'id-ID', en: 'en-US', ar: 'ar-EG' }
  const res = x.toLocaleDateString(locales[lang] || 'id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
  if (lang === 'ar') {
    const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩']
    return res.replace(/[0-9]/g, (d) => arabicDigits[+d])
  }
  return res
}
export function fmtTime(d, lang = 'id') {
  if (!d) return '-'
  const x = new Date(d)
  const locales = { id: 'id-ID', en: 'en-US', ar: 'ar-EG' }
  const res = x.toLocaleTimeString(locales[lang] || 'id-ID', { hour: '2-digit', minute: '2-digit', hour12: false })
  if (lang === 'ar') {
    const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩']
    return res.replace(/[0-9]/g, (d) => arabicDigits[+d])
  }
  return res
}
export function fmtDateTime(d, lang = 'id') { return `${fmtDate(d, lang)}, ${fmtTime(d, lang)}` }
export function iso(d) { return new Date(d).toISOString() }
export function startOfDay(d = new Date()) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }
export function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x }
export function nowTimeStr() { const n = new Date(); return `${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}` }
export function nowDateStr() { return new Date().toISOString().slice(0, 10) }

export function dateTimeToISO(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null
  return new Date(`${dateStr}T${timeStr}:00`).toISOString()
}

export function timeStrToISO(dateRef, timeStr) {
  if (!timeStr) return new Date(dateRef).toISOString()
  const [h, m] = timeStr.split(':').map(Number)
  const d = new Date(dateRef)
  d.setHours(h, m, 0, 0)
  return d.toISOString()
}

export function durasi(cin, cout, lang = 'id') {
  if (!cin || !cout) return null
  const diff = new Date(cout) - new Date(cin)
  if (diff <= 0) return null
  const h = Math.floor(diff / 3600000), m = Math.floor((diff % 3600000) / 60000)
  if (lang === 'ar') {
    const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩']
    const toAr = (n) => String(n).replace(/[0-9]/g, (d) => arabicDigits[+d])
    return h > 0 ? `${toAr(h)}س ${toAr(m)}د` : `${toAr(m)}د`
  }
  if (lang === 'en') {
    return h > 0 ? `${h}h ${m}m` : `${m}m`
  }
  return h > 0 ? `${h}j ${m}m` : `${m}m`
}

// ─── Webhook helpers ──────────────────────────────────────────────────────────

export const sendLogNotification = async (log, type = 'OUT') => {
  const WEBHOOK_URL = localStorage.getItem('GATE_WEBHOOK_URL') || import.meta.env.VITE_GATE_WEBHOOK_URL
  if (!WEBHOOK_URL) return { success: false, error: 'URL tidak ditemukan' }

  try {
    const isInternal = log.visitor_type !== 'tamu'
    const timeStr = `<b>${fmtTime(new Date()).replace('.', ':')}</b>`
    const nameStr = `<b>${log.visitor_name}</b>`
    const purposeStr = `<b>${log.purpose || '-'}</b>`
    const plateStr = log.vehicle_plate ? ` (${log.vehicle_plate})` : ''

    let message = ''
    if (type === 'OUT') {
      message = isInternal
        ? `${nameStr} izin keluar sekolah pada pukul ${timeStr} untuk ${purposeStr}${plateStr}.`
        : `Tamu ${nameStr} telah masuk pada pukul ${timeStr} untuk ${purposeStr}${plateStr}.`
      if (log.estimated_return) {
        const etaTime = `<b>${fmtTime(log.estimated_return).replace('.', ':')}</b>`
        const etaLabel = isInternal ? 'Estimasi kembali' : 'Estimasi selesai kunjungan'
        message += `\n${etaLabel} pukul ${etaTime}.`
      }
    } else {
      message = isInternal
        ? `${nameStr} sudah kembali ke sekolah pada pukul ${timeStr}${plateStr}.`
        : `Tamu ${nameStr} telah keluar/meninggalkan sekolah pada pukul ${timeStr}${plateStr}.`
    }

    if (WEBHOOK_URL.includes('discord.com')) {
      await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: message.replace(/<[^>]*>?/gm, '') })
      })
    } else if (WEBHOOK_URL.includes('api.telegram.org')) {
      const url = new URL(WEBHOOK_URL.replace('/getUpdates', '/sendMessage'))
      url.searchParams.set('text', message)
      url.searchParams.set('parse_mode', 'HTML')
      if (!window.location.hostname.includes('localhost')) {
        try {
          url.searchParams.set('reply_markup', JSON.stringify({
            inline_keyboard: [[{ text: '🌐 Dashboard', url: window.location.origin }]]
          }))
        } catch (e) { }
      }
      const resp = await fetch(url.toString())
      const result = await resp.json()
      if (resp.ok) return { success: true }
      return { success: false, error: `${resp.status} - ${result.description || 'Unknown error'}` }
    }
    return { success: false, error: 'URL tidak dikenali' }
  } catch (err) {
    console.error('Failed to send notification:', err)
    return { success: false, error: err.message }
  }
}

export const sendDailySummary = async (logs) => {
  const WEBHOOK_URL = localStorage.getItem('GATE_WEBHOOK_URL') || import.meta.env.VITE_GATE_WEBHOOK_URL
  if (!WEBHOOK_URL) return { success: false, error: 'URL tidak ditemukan' }
  if (!logs || logs.length === 0) return { success: false, error: 'Tidak ada data hari ini' }

  try {
    const dateStr = fmtDate(new Date())
    const stats = {
      total: logs.length,
      internal: logs.filter(l => l.visitor_type !== 'tamu').length,
      tamu: logs.filter(l => l.visitor_type === 'tamu').length,
      selesai: logs.filter(l => l.check_out).length,
      aktif: logs.filter(l => !l.check_out).length
    }
    const sep = '────────────────'
    const header = `<b>📊 RINGKASAN HARIAN</b>\n<b>${dateStr.toUpperCase()}</b>`
    let detailText = logs.slice(0, 15).map(l => {
      const time = fmtTime(l.check_in).replace('.', ':')
      const type = l.visitor_type === 'tamu' ? 'Tamu' : 'Intrn'
      const status = l.check_out ? '✓' : '...'
      return `• ${time} | ${type} | ${l.visitor_name.split(' ')[0]} ${status}`
    }).join('\n')
    if (logs.length > 15) detailText += `\n...dan ${logs.length - 15} lainnya.`
    const summaryHTML = `${header}\n${sep}\n` +
      `Total Aktivitas: <b>${stats.total}</b>\n- Internal: ${stats.internal}\n- Tamu: ${stats.tamu}\n` +
      `${sep}\nStatus: ${stats.selesai} Selesai, ${stats.aktif} Aktif\n${sep}\n` +
      `<b>Log Terakhir:</b>\n<code>${detailText}</code>\n${sep}`

    if (WEBHOOK_URL.includes('discord.com')) {
      await fetch(WEBHOOK_URL, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: summaryHTML.replace(/<[^>]*>?/gm, '') })
      })
    } else if (WEBHOOK_URL.includes('api.telegram.org')) {
      const url = new URL(WEBHOOK_URL.replace('/getUpdates', '/sendMessage'))
      url.searchParams.set('text', summaryHTML)
      url.searchParams.set('parse_mode', 'HTML')
      await fetch(url.toString())
    }
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

// ─── Main Hook ────────────────────────────────────────────────────────────────

export function useGateCore({ activeTab, rekapMode, rekapDate }) {
  const { addToast, addUndoToast } = useToast()
  const { profile } = useAuth()
  const { t, tNum } = useLanguage()
  const refreshActiveRef = useRef(false)

  // ── State ──────────────────────────────────────────────────────────────────

  const [teacherList, setTeacherList] = useState([])
  const [studentList, setStudentList] = useState([])
  const [todayLogs, setTodayLogs] = useState([])
  const [rekapData, setRekapData] = useState([])
  const [loadingLogs, setLoadingLogs] = useState(false)
  const [loadingRekap, setLoadingRekap] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [cooldown, setCooldown] = useState(false)
  const [lastRefresh, setLastRefresh] = useState(Date.now())
  const [confirmModal, setConfirmModal] = useState(null)
  const [editLog, setEditLog] = useState(null)
  const [editSaving, setEditSaving] = useState(false)
  const [selectedIds, setSelectedIds] = useState([])
  const [selectionMode, setSelectionMode] = useState(false)
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false)
  const [dismissedOvertime, setDismissedOvertime] = useState(false)

  const internalList = useMemo(() => [...teacherList, ...studentList], [teacherList, studentList])

  // ── Fetch teachers & students ───────────────────────────────────────────────

  useEffect(() => {
    supabase.from('teachers').select('id,name,nbm,status,type,nip,nik,nuptk').is('deleted_at', null).order('name')
      .then(({ data, error }) => {
        if (error) console.error('[useGateCore] Teachers fetch error:', error)
        setTeacherList(data || [])
      })
    supabase.from('students').select('id,name,nisn').is('deleted_at', null).order('name')
      .then(({ data, error }) => {
        if (error) console.error('[useGateCore] Students fetch error:', error)
        setStudentList((data || []).map(s => ({ ...s, nbm: s.nisn, type: 'santri' })))
      })
  }, [])

  // ── loadTodayLogs ──────────────────────────────────────────────────────────

  const loadTodayLogs = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoadingLogs(true)
    else setIsRefreshing(true)

    const t0 = startOfDay(new Date()), t1 = addDays(t0, 1)
    const { data, error } = await supabase
      .from('gate_logs').select('*')
      .gte('check_in', iso(t0))
      .lt('check_in', iso(t1))
      .order('check_in', { ascending: false })

    if (error) console.error('[useGateCore] loadTodayLogs error:', error)
    else setTodayLogs(data || [])

    setLoadingLogs(false)
    setIsRefreshing(false)
  }, [])

  useEffect(() => { loadTodayLogs() }, [loadTodayLogs])

  // Auto-refresh every 30s
  useEffect(() => {
    const interval = setInterval(() => {
      loadTodayLogs(true)
      setLastRefresh(Date.now())
    }, 30000)
    return () => clearInterval(interval)
  }, [loadTodayLogs])

  // Realtime subscription
  useEffect(() => {
    const channel = supabase.channel('gate_logs_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gate_logs' }, () => {
        loadTodayLogs(true)
        setLastRefresh(Date.now())
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [loadTodayLogs])

  // ── loadRekap ──────────────────────────────────────────────────────────────

  const loadRekap = useCallback(async () => {
    setLoadingRekap(true)
    let from, to
    if (rekapMode === 'harian') {
      from = startOfDay(rekapDate); to = addDays(from, 1)
    } else if (rekapMode === 'bulanan') {
      const d = new Date(rekapDate)
      from = new Date(d.getFullYear(), d.getMonth(), 1)
      to = new Date(d.getFullYear(), d.getMonth() + 1, 1)
    } else {
      const d = new Date(rekapDate), day = d.getDay()
      const mon = addDays(d, -(day === 0 ? 6 : day - 1))
      from = startOfDay(mon); to = addDays(from, 7)
    }
    const { data } = await supabase.from('gate_logs').select('*')
      .gte('check_in', iso(from)).lt('check_in', iso(to))
      .order('check_in', { ascending: false })
    setRekapData(data || [])
    setLoadingRekap(false)
  }, [rekapMode, rekapDate])

  useEffect(() => { if (activeTab === 'rekap') loadRekap() }, [activeTab, loadRekap])

  // ── Derived stats ──────────────────────────────────────────────────────────

  const stats = useMemo(() => ({
    total: todayLogs.length,
    keluar: todayLogs.filter(l => (l.visitor_type !== 'tamu') && !l.check_out).length,
    dalamTamu: todayLogs.filter(l => l.visitor_type === 'tamu' && !l.check_out).length,
    tamu: todayLogs.filter(l => l.visitor_type === 'tamu').length,
  }), [todayLogs])

  const dailySummary = useMemo(() => {
    const internalLogs = todayLogs.filter(l => l.visitor_type !== 'tamu')
    const finished = internalLogs.filter(l => l.check_out)
    const avgMs = finished.length
      ? finished.reduce((sum, l) => sum + (new Date(l.check_out) - new Date(l.check_in)), 0) / finished.length
      : 0
    const avgMin = Math.round(avgMs / 60000)
    const overTimeList = todayLogs.filter(l =>
      (l.visitor_type !== 'tamu') && !l.check_out
      && (Date.now() - new Date(l.check_in).getTime()) > 2 * 60 * 60 * 1000
    )
    return { avgMin, overTimeList, totalInternal: internalLogs.length, selesai: finished.length }
  }, [todayLogs])

  const prevOvertimeCount = useRef(0)
  useEffect(() => {
    const cur = dailySummary.overTimeList.length
    if (cur > prevOvertimeCount.current) setDismissedOvertime(false)
    prevOvertimeCount.current = cur
  }, [dailySummary.overTimeList.length])

  // ── handleRefresh ──────────────────────────────────────────────────────────

  const handleRefresh = useCallback(async () => {
    if (refreshActiveRef.current || cooldown) return
    refreshActiveRef.current = true
    setIsRefreshing(true)
    setCooldown(true)
    try {
      const promises = [loadTodayLogs(true)]
      if (activeTab === 'rekap') promises.push(loadRekap())
      await Promise.all(promises)
      setLastRefresh(Date.now())
      addToast(t('toastSuccessUpdate'), 'success')
      logAudit({ action: 'REFRESH', source: 'OPERATIONAL', tableName: 'gate_logs', newData: { tab: activeTab } })
    } catch (err) {
      console.error('[useGateCore] handleRefresh error:', err)
    } finally {
      setIsRefreshing(false)
      refreshActiveRef.current = false
      setTimeout(() => {
        setCooldown(false)
      }, 3000)
    }
  }, [loadTodayLogs, loadRekap, activeTab, addToast, t, cooldown])

  // ── handleSubmit ───────────────────────────────────────────────────────────

  const handleSubmit = useCallback(async (form) => {
    setSubmitting(true)
    try {
      let payload
      if (form.flow === 'internal') {
        payload = {
          visitor_type: form.visitorType,
          teacher_id: form.visitorType === 'santri' ? null : form.personId,
          student_id: form.visitorType === 'santri' ? form.personId : null,
          visitor_name: form.name,
          visitor_nip: form.nbm || null,
          purpose: form.purpose,
          check_in: dateTimeToISO(form.dateOut, form.timeOut),
          check_out: null,
          estimated_return: form.estimatedReturn || null,
        }
      } else {
        payload = {
          visitor_type: 'tamu',
          teacher_id: null,
          visitor_name: form.name,
          visitor_nip: form.institution || null,
          purpose: form.purpose,
          destination: form.destination || null,
          vehicle_plate: form.vehicle || null,
          check_in: dateTimeToISO(form.dateIn, form.timeIn),
          check_out: null,
          estimated_return: form.estimatedReturn || null,
        }
      }
      if (profile?.id) payload.recorded_by = profile.id

      const { data, error } = await supabase.from('gate_logs').insert(payload).select()

      if (error) {
        addToast(`${t('toastErrorSave')}: ${error.message}`, 'error')
      } else {
        const insertedRow = data?.[0]
        const who = form.flow === 'internal' ? form.name : `${t('toastGuest')} ${form.name}`
        const act = form.flow === 'internal' ? t('toastExit') : t('toastEntry')

        addUndoToast(`${who} (${act}) ${t('toastSuccessSave')}`, async () => {
          if (insertedRow?.id) {
            const { error: delErr } = await supabase.from('gate_logs').delete().eq('id', insertedRow.id)
            if (delErr) addToast(`${t('toastErrorUndo')}: ${delErr.message}`, 'error')
            else { addToast(t('toastSuccessUndo'), 'info'); loadTodayLogs(true) }
          }
        })

        await logAudit({
          action: 'INSERT', source: 'SYSTEM', tableName: 'gate_logs',
          recordId: insertedRow?.id || null, newData: insertedRow || payload,
        })
        await loadTodayLogs(true)
        sendLogNotification(insertedRow || payload, 'OUT')
      }
    } catch (err) {
      addToast(`${t('toastErrorUnexpected')}: ${err.message}`, 'error')
    }
    setSubmitting(false)
  }, [profile, loadTodayLogs, addToast, addUndoToast, t])

  // ── handleConfirmTime ──────────────────────────────────────────────────────

  const handleReturn = useCallback((log) => setConfirmModal({ log, action: 'return' }), [])
  const handleCheckout = useCallback((log) => setConfirmModal({ log, action: 'checkout' }), [])

  const handleConfirmTime = useCallback(async (timeStr) => {
    const { log, action } = confirmModal
    setConfirmModal(null)

    const checkInDate = new Date(log.check_in)
    let checkOutISO = timeStrToISO(checkInDate, timeStr)
    if (new Date(checkOutISO) < checkInDate) {
      const nextDay = new Date(checkInDate)
      nextDay.setDate(nextDay.getDate() + 1)
      checkOutISO = timeStrToISO(nextDay, timeStr)
    }

    const { error } = await supabase.from('gate_logs').update({ check_out: checkOutISO }).eq('id', log.id)
    if (error) {
      const errPrefix = action === 'return' ? t('toastErrorReturn') : t('toastErrorCheckout')
      addToast(`${errPrefix}: ${error.message}`, 'error')
    } else {
      addToast(action === 'return' ? t('toastSuccessReturn') : t('toastSuccessTamuOut'), 'success')
      await logAudit({
        action: 'UPDATE', source: 'SYSTEM', tableName: 'gate_logs',
        recordId: log.id, oldData: log, newData: { ...log, check_out: checkOutISO }
      })
      sendLogNotification({ ...log, check_out: checkOutISO }, action === 'return' ? 'IN' : 'OUT_TAMU')
      loadTodayLogs()
      if (activeTab === 'rekap') loadRekap()
    }
  }, [confirmModal, loadTodayLogs, loadRekap, activeTab, addToast, t])

  // ── handleSaveEdit / handleDeleteLog ───────────────────────────────────────

  const handleSaveEdit = useCallback(async (updates) => {
    setEditSaving(true)
    const { error } = await supabase.from('gate_logs').update(updates).eq('id', editLog.id)
    setEditSaving(false)
    if (error) addToast(t('toastErrorSave') + ': ' + error.message, 'error')
    else {
      addToast(t('toastSuccessLogEdit'), 'success')
      await logAudit({
        action: 'UPDATE', source: 'SYSTEM', tableName: 'gate_logs',
        recordId: editLog.id, oldData: editLog, newData: { ...editLog, ...updates },
      })
      setEditLog(null)
      loadTodayLogs()
      if (activeTab === 'rekap') loadRekap()
    }
  }, [editLog, loadTodayLogs, loadRekap, activeTab, addToast, t])

  const handleDeleteLog = useCallback(async () => {
    const { error } = await supabase.from('gate_logs').delete().eq('id', editLog.id)
    if (error) addToast(t('toastErrorDelete') + ': ' + error.message, 'error')
    else {
      addToast(t('toastSuccessLogDel'), 'success')
      await logAudit({
        action: 'DELETE', source: 'SYSTEM', tableName: 'gate_logs',
        recordId: editLog.id, oldData: editLog,
      })
      setEditLog(null)
      loadTodayLogs()
      if (activeTab === 'rekap') loadRekap()
    }
  }, [editLog, loadTodayLogs, loadRekap, activeTab, addToast, t])

  // ── Bulk actions ───────────────────────────────────────────────────────────

  const handleBulkCheckout = useCallback(async (reason = '') => {
    if (selectedIds.length === 0) return
    setSubmitting(true)
    const now = new Date().toISOString()
    try {
      const { data: logsToUpdate } = await supabase.from('gate_logs').select('*').in('id', selectedIds)
      const update = { check_out: now }
      if (reason) update.purpose_note = reason
      const { error } = await supabase.from('gate_logs').update(update).in('id', selectedIds)
      if (error) throw error
      addToast(`${tNum(selectedIds.length)} ${t('toastBulkSuccess')}`, 'success')
      if (logsToUpdate) {
        logsToUpdate.forEach(log => {
          const actionType = log.visitor_type === 'tamu' ? 'OUT_TAMU' : 'IN'
          sendLogNotification({ ...log, check_out: now }, actionType)
        })
      }
      await logAudit({
        action: 'UPDATE', source: 'OPERATIONAL', tableName: 'gate_logs',
        newData: { bulkCount: selectedIds.length, ids: selectedIds, action: 'Bulk Checkout/Return', reason }
      })
      await loadTodayLogs(true)
      setSelectedIds([])
      setSelectionMode(false)
    } catch (err) {
      addToast(`${t('toastErrorBulkUpdate')}: ${err.message}`, 'error')
    }
    setSubmitting(false)
  }, [selectedIds, loadTodayLogs, addToast, t, tNum])

  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.length === 0) return
    setSubmitting(true)
    try {
      const { error } = await supabase.from('gate_logs').delete().in('id', selectedIds)
      if (error) throw error
      addToast(`${tNum(selectedIds.length)} ${t('toastBulkDelSuccess')}`, 'success')
      await logAudit({
        action: 'DELETE', source: 'OPERATIONAL', tableName: 'gate_logs',
        newData: { bulkCount: selectedIds.length, ids: selectedIds }
      })
      await loadTodayLogs(true)
      setSelectedIds([])
      setSelectionMode(false)
    } catch (err) {
      addToast(`${t('toastErrorBulkDelete')}: ${err.message}`, 'error')
    }
    setSubmitting(false)
  }, [selectedIds, loadTodayLogs, addToast, t, tNum])

  const handleSelectAll = useCallback((list) => {
    const allIds = list.map(l => l.id)
    setSelectedIds(prev => prev.length === allIds.length ? [] : allIds)
  }, [])

  const toggleSelect = useCallback((id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedIds([])
    setSelectionMode(false)
    setBulkDeleteConfirm(false)
  }, [])

  // ── Return ─────────────────────────────────────────────────────────────────

  return {
    // Data
    teacherList, studentList, internalList,
    todayLogs, rekapData,
    // Loading flags
    loadingLogs, loadingRekap, submitting, isRefreshing, cooldown, editSaving,
    // Timestamps
    lastRefresh,
    // Modal state
    confirmModal, setConfirmModal,
    editLog, setEditLog,
    // Selection state
    selectedIds, setSelectedIds,
    selectionMode, setSelectionMode,
    bulkDeleteConfirm, setBulkDeleteConfirm,
    // Overtime / alert state
    dismissedOvertime, setDismissedOvertime,
    // Derived
    stats, dailySummary,
    // Loaders
    loadTodayLogs, loadRekap,
    // Handlers
    handleRefresh,
    handleSubmit,
    handleReturn, handleCheckout, handleConfirmTime,
    handleSaveEdit, handleDeleteLog,
    handleBulkCheckout, handleBulkDelete,
    handleSelectAll, toggleSelect, clearSelection,
  }
}
