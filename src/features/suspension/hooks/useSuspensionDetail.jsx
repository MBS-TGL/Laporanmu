import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useToast } from '@context/Toast'
import { useAuth } from '@context/Auth'
import {
  getSuspension, listSuspensionTasks, listSuspensionSubmissions,
  listSuspensionLogs, listSuspensionFollowups, addSuspensionFollowup,
  deleteSuspensionFollowup, listSuspensionTemplates,
} from '../services/suspensionService'
import { eachDay } from '../utils/suspensionConstants'

// Detail satu skorsing: progres per hari, tugas, log, followup.
// Dipakai DetailPage (admin).
export default function useSuspensionDetail(suspensionId) {
  const { addToast } = useToast()
  const { user } = useAuth()
  const [suspension, setSuspension] = useState(null)
  const [tasks, setTasks] = useState([])
  const [submissions, setSubmissions] = useState([])
  const [logs, setLogs] = useState([])
  const [followups, setFollowups] = useState([])
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const activeRef = useRef(true)

  // Mount + ganti id: fetch manual dengan id eksplisit per panggilan.
  // Tidak ada ref-mutasi, tidak ada effect berantai.
  const fetchAll = useCallback(async (sid) => {
    const id = sid ?? suspensionId
    if (!id) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    const ctrl = new AbortController()
    try {
      const [sus, t, sub, lg, fol, tpl] = await Promise.all([
        getSuspension(id),
        listSuspensionTasks(id),
        listSuspensionSubmissions(id),
        listSuspensionLogs(id),
        listSuspensionFollowups(id),
        listSuspensionTemplates(),
      ])
      if (!activeRef.current || ctrl.signal.aborted) return
      setSuspension(sus)
      setTasks(t)
      setSubmissions(sub)
      setLogs(lg)
      setFollowups(fol)
      setTemplates(tpl.filter((x) => x.is_active))
    } catch (err) {
      if (!activeRef.current || ctrl.signal.aborted) return
      setError(err?.message || 'Gagal memuat detail skorsing.')
    } finally {
      if (activeRef.current && !ctrl.signal.aborted) setLoading(false)
    }
    return () => ctrl.abort()
  }, [suspensionId])

  // Mount + ganti id: fetch sekali. setState dari hasil async,
  // bukan render cascade.
  useEffect(() => {
    activeRef.current = true
    // Fetch-on-mount: hasil async, bukan render cascade.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAll(suspensionId).catch(() => {})
    return () => { activeRef.current = false }
    // Fetch manual per id; fetchAll stabil kecuali id berubah.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suspensionId])

  // ─── Progres per hari (turunan, useMemo agar murah) ───────
  const days = useMemo(() => {
    if (!suspension) return []
    return eachDay(suspension.start_date, suspension.end_date)
  }, [suspension])

  const logByDate = useMemo(() => {
    const map = {}
    logs.forEach((l) => { map[l.log_date] = l })
    return map
  }, [logs])

  const subByTask = useMemo(() => {
    const map = {}
    submissions.forEach((s) => { map[s.task_id] = s })
    return map
  }, [submissions])

  const stats = useMemo(() => {
    const filled = days.filter((d) => logByDate[d]).length
    const totalTasks = tasks.length
    const done = tasks.filter((t) => subByTask[t.id]?.status === 'dikerjakan' || subByTask[t.id]?.status === 'dinilai').length
    const graded = tasks.filter((t) => subByTask[t.id]?.status === 'dinilai').length
    return {
      totalDays: days.length,
      filledDays: filled,
      emptyDays: days.length - filled,
      totalTasks, doneTasks: done, gradedTasks: graded,
    }
  }, [days, logByDate, tasks, subByTask])

  const addFollowup = useCallback(async ({ method, notes, contactedAt }) => {
    try {
      const data = await addSuspensionFollowup({
        suspensionId, method, notes, contactedAt, createdBy: user?.id || null,
      })
      addToast('Catatan verifikasi tersimpan.', 'success')
      if (activeRef.current) setFollowups((prev) => [data, ...prev])
      return { data, error: null }
    } catch (err) {
      addToast(err?.message || 'Gagal menyimpan verifikasi.', 'error')
      return { data: null, error: err }
    }
  }, [suspensionId, user, addToast])

  const removeFollowup = useCallback(async (row) => {
    try {
      await deleteSuspensionFollowup(row.id, row)
      addToast('Catatan verifikasi dihapus.', 'success')
      if (activeRef.current) setFollowups((prev) => prev.filter((f) => f.id !== row.id))
      return true
    } catch (err) {
      addToast(err?.message || 'Gagal menghapus.', 'error')
      return false
    }
  }, [addToast])

  return {
    suspension, tasks, submissions, subByTask,
    logs, logByDate, followups, templates,
    days, stats, loading, error,
    refresh: fetchAll, addFollowup, removeFollowup,
  }
}
