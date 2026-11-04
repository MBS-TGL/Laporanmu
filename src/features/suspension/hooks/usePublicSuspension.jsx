import { useState, useEffect, useCallback, useRef } from 'react'
import {
  validatePublicToken, fetchPublicDay, savePublicLog, submitPublicTask,
} from '../services/publicSuspensionService'
import {
  readDraft, writeDraft, clearDraft,
} from '../utils/suspensionConstants'

function draftStorageKey(token) {
  return `skorsing:draft:${String(token || '').slice(0, 8)}`
}

function readPending(token) {
  try {
    const raw = localStorage.getItem(`skorsing:pending:${String(token || '').slice(0, 8)}`)
    const arr = raw ? JSON.parse(raw) : []
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

function writePending(token, list) {
  try {
    localStorage.setItem(`skorsing:pending:${String(token || '').slice(0, 8)}`, JSON.stringify(list))
  } catch {
    // abaikan — memori penuh, state in-memory tetap jalan
  }
}

// Halaman publik wali: validasi token, data 1 hari, autosave draft + antrean offline.
// Hanya memakai RPC (tidak ada query tabel langsung).
export default function usePublicSuspension(token) {
  const [info, setInfo] = useState(null)
  const [validating, setValidating] = useState(true)
  const [validateError, setValidateError] = useState('')
  const [date, setDate] = useState('')
  const [dayData, setDayData] = useState(null)
  const [entries, setEntries] = useState({})
  const [note, setNote] = useState('')
  const [loadingDay, setLoadingDay] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveState, setSaveState] = useState('idle') // idle|saving|saved|offline|error
  const [saveError, setSaveError] = useState('')
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine))
  const [submittingTask, setSubmittingTask] = useState('')
  const [pendingCount, setPendingCount] = useState(0)

  // Token selalu dibaca dari argumen eksplisit per panggilan (validasi,
  // loadDay, saveNow, submitTask) agar tidak ada stale closure.
  // tokenRef hanya untuk timer autosave yang dibuat di luar render flow.
  const activeRef = useRef(true)
  const abortRef = useRef(null)
  const saveTimer = useRef(null)
  const tokenRef = useRef(token)

  // ─── Efek: validasi token + cleanup unmount ───────────────
  useEffect(() => {
    activeRef.current = true
    tokenRef.current = token
    if (abortRef.current) abortRef.current.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    validatePublicToken(token, ctrl.signal)
      .then((res) => {
        if (!activeRef.current || ctrl.signal.aborted) return
        setInfo(res)
        const days = res?.days || []
        // Tanggal awal: hari ini bila dalam rentang, selain itu hari pertama
        const today = new Date()
        const t = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
        setDate(days.includes(t) ? t : (days[0] || ''))
      })
      .catch((err) => {
        if (!activeRef.current || ctrl.signal.aborted) return
        if (err?.name === 'AbortError' || err?.name === 'CanceledError') return
        setValidateError(err?.message || 'Tautan tidak valid atau sudah kedaluwarsa.')
      })
      .finally(() => {
        if (activeRef.current && !ctrl.signal.aborted) setValidating(false)
      })

    return () => { ctrl.abort() }
  }, [token])

  // Muat data 1 hari. Dipanggil eksplisit dari handler ganti tanggal
  // (changeDate) — bukan effect berantai — agar alur jelas.
  const loadDay = useCallback(async (tok, dateStr) => {
    const t = tok || tokenRef.current
    if (!t || !dateStr) return
    if (abortRef.current) abortRef.current.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    setLoadingDay(true)
    setSaveError('')
    try {
      const data = await fetchPublicDay(t, dateStr, ctrl.signal)
      if (!activeRef.current || ctrl.signal.aborted) return
      setDayData(data)
      // Gabung draft lokal: draft menang bila server belum ada isian
      const serverEntries = data?.log?.entries || {}
      const serverNote = data?.log?.note_optional || ''
      const draft = readDraft(t, dateStr)
      const hasServer = Object.keys(serverEntries).length > 0 || serverNote
      if (draft && !hasServer) {
        setEntries(draft.entries || {})
        setNote(draft.note || '')
        setSaveState('offline')
      } else {
        setEntries(serverEntries)
        setNote(serverNote)
        setSaveState('idle')
        if (hasServer) clearDraft(t, dateStr)
      }
    } catch (err) {
      if (!activeRef.current || ctrl.signal.aborted) return
      if (err?.name === 'AbortError' || err?.name === 'CanceledError') return
      // Offline / gagal jaringan: pakai draft lokal bila ada
      const draft = readDraft(t, dateStr)
      if (draft) {
        setEntries(draft.entries || {})
        setNote(draft.note || '')
        setSaveState('offline')
      }
      setSaveError(err?.message || 'Gagal memuat data.')
    } finally {
      if (activeRef.current && !ctrl.signal.aborted) setLoadingDay(false)
    }
  }, [])

  // Ganti tanggal: set state + fetch manual. Tidak ada effect [date].
  const changeDate = useCallback((dateStr) => {
    setDate(dateStr)
    tokenRef.current = token
    if (dateStr) loadDay(token, dateStr)
  }, [token, loadDay])

  // Siram antrean offline saat kembali online. Dipicu dari handler event
  // online (bukan setState sinkron di effect).
  const flushPending = useCallback(async () => {
    const pending = readPending(tokenRef.current)
    if (!pending.length) {
      if (activeRef.current) setPendingCount(0)
      return
    }
    if (activeRef.current) setPendingCount(pending.length)
    const rest = []
    // Sengaja sekuensial (bukan Promise.all): menjaga urutan tanggal dan
    // memastikan satu tanggal gagal tidak menggagalkan tanggal lain.
    for (const p of pending) {
      try {
        await savePublicLog(tokenRef.current, p.date, p.entries || {}, p.note || '')
        clearDraft(tokenRef.current, p.date)
      } catch {
        rest.push(p)
      }
    }
    writePending(tokenRef.current, rest)
    if (activeRef.current) {
      setPendingCount(rest.length)
      if (pending.length > rest.length) {
        setSaveState('saved')
        if (date) loadDay(token, date)
      }
    }
  }, [token, date, loadDay])

  useEffect(() => {
    const onOnline = () => {
      if (activeRef.current) setOnline(true)
      flushPending().catch(() => {})
    }
    const onOffline = () => { if (activeRef.current) setOnline(false) }
    setPendingCount(readPending(tokenRef.current).length)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [flushPending])

  useEffect(() => () => {
    activeRef.current = false
    if (abortRef.current) abortRef.current.abort()
    if (saveTimer.current) clearTimeout(saveTimer.current)
  }, [])

  // ─── Simpan manual + autosave (didefinisikan dulu, dipakai updateEntry/updateNote) ─
  const saveNow = useCallback(async () => {
    const t = tokenRef.current
    if (!t || !date) return { ok: false }
    if (saveTimer.current) clearTimeout(saveTimer.current)
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      // Offline: simpan ke antrean, bukan error
      const pending = readPending(t).filter((p) => p.date !== date)
      pending.push({ date, entries, note, updatedAt: Date.now() })
      writePending(t, pending)
      if (activeRef.current) {
        setSaveState('offline')
        setPendingCount(pending.length)
      }
      return { ok: false, offline: true }
    }
    if (activeRef.current) {
      setSaving(true)
      setSaveState('saving')
      setSaveError('')
    }
    try {
      await savePublicLog(t, date, entries, note)
      if (!activeRef.current) return { ok: true }
      setSaveState('saved')
      clearDraft(t, date)
      return { ok: true }
    } catch (err) {
      if (!activeRef.current) return { ok: false }
      setSaveState('error')
      setSaveError(err?.message || 'Gagal menyimpan.')
      return { ok: false, error: err }
    } finally {
      if (activeRef.current) setSaving(false)
    }
  }, [date, entries, note])

  // ─── Ubah isian (tulis draft tiap ketik, autosave 2 detik) ─
  const scheduleAutosave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      if (activeRef.current) saveNow().catch(() => {})
    }, 2000)
  }, [saveNow])

  const updateEntry = useCallback((itemKey, value) => {
    setEntries((prev) => {
      const next = { ...prev, [itemKey]: value }
      writeDraft(tokenRef.current, date, { entries: next, note, updatedAt: Date.now() })
      return next
    })
    setSaveState('saving')
    scheduleAutosave()
  }, [date, note, scheduleAutosave])

  const updateNote = useCallback((val) => {
    setNote(val)
    setEntries((prev) => {
      writeDraft(tokenRef.current, date, { entries: prev, note: val, updatedAt: Date.now() })
      return prev
    })
    setSaveState('saving')
    scheduleAutosave()
  }, [date, scheduleAutosave])

  // ─── Kirim bukti tugas (butuh online, foto sudah dikompres pemanggil) ──
  const submitTask = useCallback(async (taskId, photoDataUrls, taskNote) => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return { ok: false, offline: true, message: 'Perlu koneksi internet untuk mengunggah foto.' }
    }
    setSubmittingTask(taskId)
    try {
      const res = await submitPublicTask(token, taskId, photoDataUrls, taskNote)
      await loadDay(token, date)
      return { ok: true, data: res }
    } catch (err) {
      return { ok: false, message: err?.message || 'Gagal mengirim bukti tugas.' }
    } finally {
      if (activeRef.current) setSubmittingTask('')
    }
    // token + date dari closure render saat tombol diklik (event handler).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, loadDay])

  return {
    info, validating, validateError,
    date, setDate: changeDate, dayData, loadingDay,
    entries, updateEntry, note, updateNote,
    saving, saveState, saveError, saveNow,
    online, pendingCount, flushPending,
    submitTask, submittingTask,
    draftKey: date ? `${draftStorageKey(token)}:${date}` : '',
  }
}
